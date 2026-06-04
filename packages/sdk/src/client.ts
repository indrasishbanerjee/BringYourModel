import {
  type AskRequest,
  type AskResponse,
  type EmbedRequest,
  type EmbedResponse,
  type ExtractRequest,
  type ClassifyResponse,
  type ExtractResponse,
  type ChatRequest,
  type ChatResponse,
  type Message,
  type StreamChunk,
  type StreamFinish,
  type Capabilities,
  type ByomEventType,
  type ByomEventPayload,
  type TaskType,
  generateSessionId,
  ErrorCode,
  ByomError,
  deserializeByomError,
  RequestPayloads,
} from './protocol.js';
import { getBridge } from './bridge.js';

/** Configuration for {@link ByomClient} and {@link getClient} */
export interface ByomClientConfig {
  /** Request timeout in milliseconds (default: 30000). Applied on first `getClient()` call only. */
  timeoutMs?: number;
}

/**
 * Main BYOM client for websites integrating with the Bring Your Model extension.
 */
export class ByomClient {
  private readonly bridge: ReturnType<typeof getBridge>;

  constructor(config: ByomClientConfig = {}) {
    const timeoutMs = config.timeoutMs ?? 30000;
    this.bridge = getBridge({ timeoutMs });
  }

  /**
   * Check whether the extension bridge responds to a ping.
   * @param timeoutMs - Ping timeout in milliseconds (default: 1000)
   */
  async isAvailable(timeoutMs = 1000): Promise<boolean> {
    const result = await this.bridge.ping(timeoutMs);
    return result.available;
  }

  /**
   * Single-shot text generation.
   * @throws {ExtensionNotInstalledError} Extension not installed or bridge unavailable
   * @throws {PermissionDeniedError} Site not approved or consent denied
   * @throws {BudgetExceededError} Grant budget exceeded
   * @throws {ProviderUnavailableError} No provider configured for the task
   * @throws {ByomError} Other protocol or provider errors
   */
  async ask(request: AskRequest, signal?: AbortSignal): Promise<AskResponse> {
    const validated = RequestPayloads.ask.parse(request);
    return this.invokeRequest('ask', validated, signal);
  }

  /**
   * Streaming text generation. Yields {@link StreamChunk} values and returns {@link StreamFinish}.
   * @throws {ExtensionNotInstalledError} Extension not installed or bridge unavailable
   * @throws {PermissionDeniedError} Site not approved or consent denied
   * @throws {BudgetExceededError} Grant budget exceeded
   * @throws {ProviderUnavailableError} No provider configured for the task
   * @throws {ByomError} Other protocol or provider errors
   */
  async *stream(
    request: AskRequest,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk, StreamFinish> {
    const validated = RequestPayloads.stream.parse(request);

    let stream: ReadableStream<unknown>;
    try {
      stream = await this.bridge.sendStreamRequest('stream', validated, signal);
    } catch (error) {
      this.rethrowBridgeError(error);
    }

    const reader = stream!.getReader();
    let finishResult: StreamFinish | undefined;

    try {
      while (true) {
        let readResult: ReadableStreamReadResult<unknown>;
        try {
          readResult = await reader.read();
        } catch (error) {
          this.rethrowBridgeError(error);
        }

        const { done, value } = readResult!;

        if (done) {
          break;
        }

        const finishMarker = value as { __type?: unknown; payload?: unknown };
        if (value && typeof value === 'object' && finishMarker.__type === 'finish') {
          finishResult = finishMarker.payload as StreamFinish;
          break;
        }

        yield value as StreamChunk;
      }

      if (!finishResult) {
        throw new ByomError(ErrorCode.INTERNAL_ERROR, 'Stream ended without finish result');
      }

      return finishResult;
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Generate an embedding vector for the given text.
   * @throws {ByomError} On validation, permission, or provider errors
   */
  async embed(request: EmbedRequest, signal?: AbortSignal): Promise<EmbedResponse> {
    const validated = RequestPayloads.embed.parse(request);
    return this.invokeRequest('embed', validated, signal, (payload) => {
      const result = payload as EmbedResponse;
      if (!Array.isArray(result.embedding)) {
        throw new ByomError(ErrorCode.INTERNAL_ERROR, 'Invalid embed response: missing embedding array');
      }
      return result;
    });
  }

  /**
   * Classify text into one of the provided categories.
   * @throws {ByomError} On validation, permission, or provider errors
   */
  async classify(
    input: string,
    categories: string[],
    options?: { model?: string; signal?: AbortSignal }
  ): Promise<ClassifyResponse> {
    const { model, signal } = options ?? {};
    const payload = RequestPayloads.classify.parse({ input, categories, model });
    return this.invokeRequest('classify', payload, signal, (result) => {
      const response = result as ClassifyResponse;
      if (typeof response.category !== 'string' || typeof response.confidence !== 'number') {
        throw new ByomError(
          ErrorCode.INTERNAL_ERROR,
          'Invalid classify response: missing category or confidence'
        );
      }
      return response;
    });
  }

  /**
   * Extract structured data using a JSON Schema object.
   * @throws {ByomError} On validation, permission, or provider errors
   */
  async extract<T = ExtractResponse>(request: ExtractRequest, signal?: AbortSignal): Promise<T> {
    const validated = RequestPayloads.extract.parse(request);
    return this.invokeRequest('extract', validated, signal) as Promise<T>;
  }

  /**
   * Send a single chat turn. Prefer {@link chat} for multi-turn sessions.
   * @internal Used by {@link ChatSession}
   */
  async sendChat(request: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
    const validated = RequestPayloads.chat.parse(request);
    return this.invokeRequest('chat', validated, signal, (payload) => {
      const response = payload as ChatResponse;
      if (typeof response.text !== 'string' || !response.message) {
        throw new ByomError(ErrorCode.INTERNAL_ERROR, 'Invalid chat response');
      }
      return response;
    });
  }

  /**
   * Start a multi-turn chat session with local message history.
   */
  chat(options?: {
    sessionId?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemMessage?: string;
  }): ChatSession {
    return new ChatSession(this, options);
  }

  /** Query extension version, supported tasks, and grant/vault status */
  async getCapabilities(timeoutMs = 2000): Promise<Capabilities | null> {
    return this.bridge.getCapabilities(timeoutMs);
  }

  /** Subscribe to extension events. Returns an unsubscribe function. */
  on(event: ByomEventType, callback: (payload: ByomEventPayload) => void): () => void {
    return this.bridge.on(event, callback);
  }

  private async invokeRequest<T>(
    task: TaskType,
    payload: unknown,
    signal?: AbortSignal,
    validate?: (result: unknown) => T
  ): Promise<T> {
    try {
      const response = await this.bridge.sendRequest(task, payload, signal);

      if (response.kind !== 'response') {
        throw new ByomError(ErrorCode.INTERNAL_ERROR, `Unexpected response kind: ${response.kind}`);
      }

      return validate ? validate(response.payload) : (response.payload as T);
    } catch (error) {
      this.rethrowBridgeError(error);
    }
  }

  private rethrowBridgeError(error: unknown): never {
    if (error instanceof ByomError) {
      throw deserializeByomError({
        code: error.code,
        message: error.message,
        details: error.details,
      });
    }
    throw error;
  }
}

let globalClient: ByomClient | null = null;

/**
 * Get or create the global {@link ByomClient} instance.
 * Configuration is applied only on the first call; subsequent calls ignore new config.
 */
export function getClient(config?: ByomClientConfig): ByomClient {
  if (!globalClient) {
    globalClient = new ByomClient(config);
  }
  return globalClient;
}

/** Reset the global client (for tests and teardown) */
export function destroyClient(): void {
  globalClient = null;
}

/**
 * Stateful multi-turn chat session that tracks message history locally.
 */
export class ChatSession {
  private readonly client: ByomClient;
  private readonly sessionId: string;
  private readonly model?: string;
  private readonly temperature?: number;
  private readonly maxTokens?: number;
  private messages: Message[] = [];
  private closed = false;

  constructor(
    client: ByomClient,
    options?: {
      sessionId?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemMessage?: string;
    }
  ) {
    this.client = client;
    this.sessionId = options?.sessionId ?? generateSessionId();
    this.model = options?.model;
    this.temperature = options?.temperature;
    this.maxTokens = options?.maxTokens;
    if (options?.systemMessage) {
      this.messages.push({ role: 'system', content: options.systemMessage });
    }
  }

  /** Unique session identifier */
  get id(): string {
    return this.sessionId;
  }

  /**
   * Send a user message and receive the assistant reply.
   * @throws {ByomError} If the session is closed or the request fails
   */
  async send(message: string, signal?: AbortSignal): Promise<ChatResponse> {
    this.assertOpen();
    const response = await this.client.sendChat(
      {
        message,
        sessionId: this.sessionId,
        messages: this.messages,
        model: this.model,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
      },
      signal
    );
    this.messages.push({ role: 'user', content: message });
    this.messages.push(response.message);
    return response;
  }

  /**
   * Stream a user message and yield incremental chunks.
   * Appends the full assistant reply to history when the stream completes.
   */
  async *stream(message: string, signal?: AbortSignal): AsyncGenerator<StreamChunk, StreamFinish> {
    this.assertOpen();
    this.messages.push({ role: 'user', content: message });

    const streamPayload: AskRequest = {
      messages: this.messages,
      model: this.model,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      task: 'chat',
    };

    let fullText = '';
    const streamIterator = this.client.stream(streamPayload, signal);
    let result = await streamIterator.next();
    while (!result.done) {
      const chunk = result.value;
      fullText += chunk.text;
      yield chunk;
      result = await streamIterator.next();
    }

    const finish = result.value;
    this.messages.push({ role: 'assistant', content: fullText });
    return finish;
  }

  /** Return a copy of the conversation history */
  history(): Message[] {
    return [...this.messages];
  }

  /** Close the session and clear local history */
  close(): void {
    this.closed = true;
    this.messages = [];
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new ByomError(ErrorCode.INVALID_REQUEST, 'Chat session is closed');
    }
  }
}
