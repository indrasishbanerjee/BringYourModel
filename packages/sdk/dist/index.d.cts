/** Keep in sync with packages/shared/src/schemas.ts ProviderIdSchema */
type ProviderId = 'openai' | 'anthropic' | 'google' | 'mistral' | 'groq' | 'cohere' | 'deepseek' | 'together' | 'fireworks' | 'perplexity' | 'xai' | 'cerebras' | 'openrouter' | 'ollama' | 'lmstudio';
/** Supported AI task types sent to the extension */
type TaskType = 'ask' | 'stream' | 'embed' | 'classify' | 'extract' | 'chat';
/** A single chat message in a conversation */
interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
/** Request payload for single-shot text generation (`ask` / `stream`) */
interface AskRequest {
    /** Optional task hint for the extension router */
    task?: 'summarize' | 'draft' | 'chat';
    /** Plain-text input (required unless `messages` is provided) */
    input?: string;
    /** Optional structured context passed to the model */
    context?: Record<string, unknown>;
    /** Preferred model id */
    model?: string;
    /** Sampling temperature (0–2) */
    temperature?: number;
    /** Maximum output tokens */
    maxTokens?: number;
    /** Raw message history (alternative to `input`) */
    messages?: Message[];
}
/** Response from a completed `ask` request */
interface AskResponse {
    text: string;
    model: string;
    provider: ProviderId;
    usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    costUSD: number;
    latencyMs: number;
}
/** Incremental chunk emitted during streaming */
interface StreamChunk {
    text: string;
    isComplete: boolean;
    usage?: {
        inputTokens?: number;
        outputTokens?: number;
    };
}
/** Final metadata emitted when a stream completes */
interface StreamFinish {
    model: string;
    provider: ProviderId;
    usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    costUSD: number;
    latencyMs: number;
}
/** Request payload for embedding generation */
interface EmbedRequest {
    input: string;
    model?: string;
}
/** Response from an `embed` request */
interface EmbedResponse {
    embedding: number[];
    model: string;
    provider: ProviderId;
    usage: {
        tokens: number;
    };
}
/** Response from a `classify` request */
interface ClassifyResponse {
    category: string;
    confidence: number;
    model: string;
    provider: ProviderId;
    usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    costUSD: number;
    latencyMs: number;
}
/** Extracted object returned by `extract` (shape depends on the JSON Schema) */
type ExtractResponse = Record<string, unknown>;
/** Request payload for structured extraction via JSON Schema */
interface ExtractRequest {
    input: string;
    schema: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
    model?: string;
}
/** Request payload for a single chat turn */
interface ChatRequest {
    message: string;
    sessionId?: string;
    messages?: Message[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
}
/** Response from a `chat` request */
interface ChatResponse {
    sessionId: string;
    message: Message;
    text: string;
    model: string;
    provider: ProviderId;
    usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    costUSD: number;
    latencyMs: number;
}
/** Extension capabilities returned by ping / getCapabilities */
interface Capabilities {
    extensionVersion: string;
    supportedTasks: TaskType[];
    siteApproved: boolean;
    vaultUnlocked: boolean;
}
/** Extension-pushed event types */
type ByomEventType = 'vault-locked' | 'budget-warning' | 'permission-needed' | 'request-complete';
/** Payload for extension-pushed events */
interface ByomEventPayload {
    event: ByomEventType;
    origin?: string;
    data?: Record<string, unknown>;
    timestamp: number;
}
/** Keep in sync with packages/shared/src/errors.ts ErrorCode */
declare enum ErrorCode {
    EXTENSION_NOT_INSTALLED = "EXTENSION_NOT_INSTALLED",
    EXTENSION_DISABLED = "EXTENSION_DISABLED",
    PROTOCOL_VERSION_MISMATCH = "PROTOCOL_VERSION_MISMATCH",
    PERMISSION_DENIED = "PERMISSION_DENIED",
    SITE_NOT_APPROVED = "SITE_NOT_APPROVED",
    BUDGET_EXCEEDED = "BUDGET_EXCEEDED",
    RATE_LIMITED = "RATE_LIMITED",
    TASK_NOT_ALLOWED = "TASK_NOT_ALLOWED",
    MODEL_NOT_ALLOWED = "MODEL_NOT_ALLOWED",
    PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE",
    PROVIDER_ERROR = "PROVIDER_ERROR",
    INVALID_API_KEY = "INVALID_API_KEY",
    QUOTA_EXHAUSTED = "QUOTA_EXHAUSTED",
    INVALID_REQUEST = "INVALID_REQUEST",
    SCHEMA_VALIDATION_FAILED = "SCHEMA_VALIDATION_FAILED",
    TIMEOUT = "TIMEOUT",
    ABORTED = "ABORTED",
    INTERNAL_ERROR = "INTERNAL_ERROR",
    VAULT_LOCKED = "VAULT_LOCKED"
}
/** Serializable error structure for wire transfer */
interface SerializedError {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
}
/** Base error class for BYOM SDK failures */
declare class ByomError extends Error {
    readonly code: ErrorCode;
    readonly details?: Record<string, unknown>;
    constructor(code: ErrorCode, message: string, details?: Record<string, unknown>);
    toJSON(): SerializedError;
    static fromJSON(data: SerializedError): ByomError;
}
/** Thrown when the Bring Your Model extension is not installed */
declare class ExtensionNotInstalledError extends ByomError {
    constructor(message?: string);
}
/** Thrown when the site lacks permission or user consent */
declare class PermissionDeniedError extends ByomError {
    constructor(message?: string, details?: {
        origin?: string;
        reason?: string;
    });
}
/** Thrown when a grant budget limit is exceeded */
declare class BudgetExceededError extends ByomError {
    constructor(message?: string, details?: {
        budgetType?: string;
        current?: number;
        limit?: number;
    });
}
/** Thrown when no provider is available for the requested task */
declare class ProviderUnavailableError extends ByomError {
    constructor(message?: string, details?: {
        provider?: string;
        reason?: string;
    });
}
/**
 * Map a wire error payload or generic ByomError to a typed SDK error subclass.
 */
declare function deserializeByomError(payload: unknown): Error;

/** Configuration for {@link ByomClient} and {@link getClient} */
interface ByomClientConfig {
    /** Request timeout in milliseconds (default: 30000). Applied on first `getClient()` call only. */
    timeoutMs?: number;
}
/**
 * Main BYOM client for websites integrating with the Bring Your Model extension.
 */
declare class ByomClient {
    private readonly bridge;
    constructor(config?: ByomClientConfig);
    /**
     * Check whether the extension bridge responds to a ping.
     * @param timeoutMs - Ping timeout in milliseconds (default: 1000)
     */
    isAvailable(timeoutMs?: number): Promise<boolean>;
    /**
     * Single-shot text generation.
     * @throws {ExtensionNotInstalledError} Extension not installed or bridge unavailable
     * @throws {PermissionDeniedError} Site not approved or consent denied
     * @throws {BudgetExceededError} Grant budget exceeded
     * @throws {ProviderUnavailableError} No provider configured for the task
     * @throws {ByomError} Other protocol or provider errors
     */
    ask(request: AskRequest, signal?: AbortSignal): Promise<AskResponse>;
    /**
     * Streaming text generation. Yields {@link StreamChunk} values and returns {@link StreamFinish}.
     * @throws {ExtensionNotInstalledError} Extension not installed or bridge unavailable
     * @throws {PermissionDeniedError} Site not approved or consent denied
     * @throws {BudgetExceededError} Grant budget exceeded
     * @throws {ProviderUnavailableError} No provider configured for the task
     * @throws {ByomError} Other protocol or provider errors
     */
    stream(request: AskRequest, signal?: AbortSignal): AsyncGenerator<StreamChunk, StreamFinish>;
    /**
     * Generate an embedding vector for the given text.
     * @throws {ByomError} On validation, permission, or provider errors
     */
    embed(request: EmbedRequest, signal?: AbortSignal): Promise<EmbedResponse>;
    /**
     * Classify text into one of the provided categories.
     * @throws {ByomError} On validation, permission, or provider errors
     */
    classify(input: string, categories: string[], options?: {
        model?: string;
        signal?: AbortSignal;
    }): Promise<ClassifyResponse>;
    /**
     * Extract structured data using a JSON Schema object.
     * @throws {ByomError} On validation, permission, or provider errors
     */
    extract<T = ExtractResponse>(request: ExtractRequest, signal?: AbortSignal): Promise<T>;
    /**
     * Send a single chat turn. Prefer {@link chat} for multi-turn sessions.
     * @internal Used by {@link ChatSession}
     */
    sendChat(request: ChatRequest, signal?: AbortSignal): Promise<ChatResponse>;
    /**
     * Start a multi-turn chat session with local message history.
     */
    chat(options?: {
        sessionId?: string;
        model?: string;
        temperature?: number;
        maxTokens?: number;
        systemMessage?: string;
    }): ChatSession;
    /** Query extension version, supported tasks, and grant/vault status */
    getCapabilities(timeoutMs?: number): Promise<Capabilities | null>;
    /** Subscribe to extension events. Returns an unsubscribe function. */
    on(event: ByomEventType, callback: (payload: ByomEventPayload) => void): () => void;
    private invokeRequest;
    private rethrowBridgeError;
}
/**
 * Get or create the global {@link ByomClient} instance.
 * Configuration is applied only on the first call; subsequent calls ignore new config.
 */
declare function getClient(config?: ByomClientConfig): ByomClient;
/**
 * Stateful multi-turn chat session that tracks message history locally.
 */
declare class ChatSession {
    private readonly client;
    private readonly sessionId;
    private readonly model?;
    private readonly temperature?;
    private readonly maxTokens?;
    private messages;
    private closed;
    constructor(client: ByomClient, options?: {
        sessionId?: string;
        model?: string;
        temperature?: number;
        maxTokens?: number;
        systemMessage?: string;
    });
    /** Unique session identifier */
    get id(): string;
    /**
     * Send a user message and receive the assistant reply.
     * @throws {ByomError} If the session is closed or the request fails
     */
    send(message: string, signal?: AbortSignal): Promise<ChatResponse>;
    /**
     * Stream a user message and yield incremental chunks.
     * Appends the full assistant reply to history when the stream completes.
     */
    stream(message: string, signal?: AbortSignal): AsyncGenerator<StreamChunk, StreamFinish>;
    /** Return a copy of the conversation history */
    history(): Message[];
    /** Close the session and clear local history */
    close(): void;
    private assertOpen;
}

/**
 * Check whether the Bring Your Model extension bridge responds.
 */
declare function isAvailable(opts?: {
    timeoutMs?: number;
}): Promise<boolean>;
/**
 * Single-shot text generation.
 * @throws {ExtensionNotInstalledError} Extension not installed
 * @throws {PermissionDeniedError} Site not approved
 * @throws {BudgetExceededError} Budget exceeded
 * @throws {ProviderUnavailableError} No provider available
 * @throws {ByomError} Other errors
 */
declare function ask(request: AskRequest, signal?: AbortSignal): Promise<AskResponse>;
/**
 * Streaming text generation.
 * @throws {ExtensionNotInstalledError} Extension not installed
 * @throws {PermissionDeniedError} Site not approved
 * @throws {BudgetExceededError} Budget exceeded
 * @throws {ProviderUnavailableError} No provider available
 * @throws {ByomError} Other errors
 */
declare function stream(request: AskRequest, signal?: AbortSignal): AsyncGenerator<StreamChunk, StreamFinish>;
/**
 * Generate an embedding vector for text.
 * @throws {ByomError} On validation or provider errors
 */
declare function embed(request: EmbedRequest, signal?: AbortSignal): Promise<EmbedResponse>;
/**
 * Classify text into one of the provided categories.
 * @throws {ByomError} On validation or provider errors
 */
declare function classify(input: string, categories: string[], options?: {
    model?: string;
    signal?: AbortSignal;
}): Promise<ClassifyResponse>;
/**
 * Extract structured data using a JSON Schema object.
 * @throws {ByomError} On validation or provider errors
 */
declare function extract<T>(request: ExtractRequest, signal?: AbortSignal): Promise<T>;
/**
 * Start a multi-turn chat session with local history.
 */
declare function chat(options?: {
    sessionId?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemMessage?: string;
}): ChatSession;
/**
 * Subscribe to extension events (vault-locked, budget-warning, etc.).
 * @returns Unsubscribe function
 */
declare function on(event: ByomEventType, callback: (payload: ByomEventPayload) => void): () => void;
/** Query extension version, supported tasks, and grant/vault status */
declare function getCapabilities(timeoutMs?: number): Promise<Capabilities | null>;
/**
 * Tear down global bridge and client instances.
 * Intended for tests and SPA teardown — not required for normal page usage.
 */
declare function destroy(): void;
/** Main BYOM SDK API */
declare const byom: {
    isAvailable: typeof isAvailable;
    ask: typeof ask;
    stream: typeof stream;
    embed: typeof embed;
    classify: typeof classify;
    extract: typeof extract;
    chat: typeof chat;
    on: typeof on;
    getCapabilities: typeof getCapabilities;
    destroy: typeof destroy;
};

export { type AskRequest, type AskResponse, BudgetExceededError, ByomClient, type ByomClientConfig, ByomError, type ByomEventPayload, type ByomEventType, type Capabilities, type ChatRequest, type ChatResponse, ChatSession, type ClassifyResponse, type EmbedRequest, type EmbedResponse, ErrorCode, ExtensionNotInstalledError, type ExtractRequest, type ExtractResponse, type Message, PermissionDeniedError, type ProviderId, ProviderUnavailableError, type StreamChunk, type StreamFinish, type TaskType, byom, byom as default, deserializeByomError, getClient };
