import { generateText, streamText, embed, generateObject, createProviderRegistry, customProvider } from 'ai';
import { z } from 'zod';
import {
  ErrorCode,
  ByomError,
  type BridgeRequest,
  type AskRequest,
  type AskResponse,
  type StreamChunk,
  type StreamFinish,
  type EmbedRequest,
  type EmbedResponse,
  type ExtractRequest,
  type ChatRequest,
  type ChatResponse,
  type ClassifyResponse,
  type ExtractResponse,
  type Grant,
  type ProviderId,
  type ProviderConfig,
  type TaskType,
  type UsageRecord,
  type Message,
} from '@byom/shared';
import { calculateCost, calculateEmbeddingCost } from './telemetry/pricing';
import { normalizeLanguageModelUsage, ZERO_USAGE, toUsageRecordTokens } from './telemetry/usage';
import { GrantStore } from '../storage/grant-store';
import { ProviderStore } from '../storage/provider-store';
import { RoutingPreferencesStore } from '../storage/routing-preferences-store';
import { Vault } from '../crypto/vault';
import { TelemetryStore } from './telemetry/store';
import { PolicyEngine, type PolicyRequestPayload } from './policy/engine';
import { RoutingEngine } from './routing/engine';
import { resolveProviderAndModel, type ResolvedRouting } from './routing/resolver';
import { getProviderHealthTracker } from './routing/health';
import {
  createProviderAdapter,
  getDefaultModel as getRegistryDefaultModel,
  getProviderMeta,
  testProviderConnection,
} from './providers/registry';
import { PromptShield } from './policy/prompt-shield';

/**
 * OpenModelRouter configuration
 */
interface OpenModelRouterConfig {
  grantStore: GrantStore;
  providerStore: ProviderStore;
  vault: Vault;
  telemetryStore: TelemetryStore;
  routingPrefsStore: RoutingPreferencesStore;
}

/**
 * OpenModelRouter - The core engine for routing AI requests
 * 
 * This is the internal codename for the routing and policy engine.
 * It handles:
 * - Provider selection and fallback
 * - Request processing via AI SDK
 * - Policy enforcement
 * - Telemetry collection
 */
export class OpenModelRouter {
  private grantStore: GrantStore;
  private providerStore: ProviderStore;
  private vault: Vault;
  private telemetryStore: TelemetryStore;
  private routingPrefsStore: RoutingPreferencesStore;
  private policyEngine: PolicyEngine;
  private routingEngine: RoutingEngine;
  private providerInstances = new Map<ProviderId, any>();
  private promptShield: PromptShield;
  private healthTracker = getProviderHealthTracker();
  
  // AI SDK v5 Provider Registry
  private providerRegistry: ReturnType<typeof createProviderRegistry> | null = null;
  private registryVersion = 0; // Incremented when providers change to force rebuild

  constructor(config: OpenModelRouterConfig) {
    this.grantStore = config.grantStore;
    this.providerStore = config.providerStore;
    this.vault = config.vault;
    this.telemetryStore = config.telemetryStore;
    this.routingPrefsStore = config.routingPrefsStore;
    this.policyEngine = new PolicyEngine();
    this.routingEngine = new RoutingEngine();
    this.promptShield = new PromptShield();
  }

  /**
   * Build or rebuild the AI SDK provider registry
   * Called on first use and when credentials change
   */
  private async buildProviderRegistry(): Promise<ReturnType<typeof createProviderRegistry>> {
    const providers: Record<string, any> = {};
    const aliases: Record<string, string[]> = {
      fast: [],
      reasoning: [],
      cheap: [],
      private: [],
      local: [],
    };

    // Get all enabled providers
    const enabledProviders = await this.providerStore.getEnabledProviders();

    for (const providerConfig of enabledProviders) {
      // Decrypt the API key
      let apiKey: string;
      try {
        apiKey = await this.vault.decrypt(providerConfig.encryptedSecret, providerConfig.iv);
      } catch (error) {
        console.warn(`[OpenModelRouter] Failed to decrypt credentials for ${providerConfig.kind}:`, error);
        continue; // Skip this provider
      }

      // Create the provider instance
      const meta = getProviderMeta(providerConfig.kind);
      const providerInstance = createProviderAdapter(providerConfig.kind, apiKey, providerConfig);
      if (!providerInstance) {
        continue;
      }

      // Add to providers map with provider ID prefix
      providers[providerConfig.kind] = providerInstance;

      // Add models to aliases
      const defaultModel = providerConfig.defaultModel || meta.defaultModel;
      const modelId = `${providerConfig.kind}:${defaultModel}`;

      for (const tag of meta.aliasTags) {
        if (aliases[tag]) {
          aliases[tag].push(modelId);
        }
      }
    }

    // Create custom alias provider
    const aliasProvider = customProvider({
      languageModels: {},
      fallbackProvider: async (modelId: string) => {
        // Handle alias lookups
        if (aliases[modelId]) {
          // Return the first available model for this alias
          for (const fullModelId of aliases[modelId]) {
            const [provider] = fullModelId.split(':');
            if (providers[provider]) {
              return providers[provider].languageModel(fullModelId.split(':')[1]);
            }
          }
        }
        throw new Error(`Model ${modelId} not found`);
      },
    });

    providers.aliases = aliasProvider;

    // Create the registry
    return createProviderRegistry({ providers });
  }

  /**
   * Get or build the provider registry
   */
  private async getProviderRegistry(): Promise<ReturnType<typeof createProviderRegistry>> {
    if (!this.providerRegistry) {
      this.providerRegistry = await this.buildProviderRegistry();
      this.registryVersion++;
    }
    return this.providerRegistry;
  }

  /**
   * Invalidate the provider registry (call when credentials change)
   */
  invalidateProviderRegistry(): void {
    this.providerRegistry = null;
    this.providerInstances.clear();
  }

  /**
   * Process a request from a website (non-streaming)
   * Returns distinct response types based on the task
   */
  async processRequest(
    request: BridgeRequest, 
    grant: Grant
  ): Promise<AskResponse | EmbedResponse | ClassifyResponse | ExtractResponse | ChatResponse> {
    const { task, payload } = request;
    const globalPrefs = await this.routingPrefsStore.getPreferences();

    const policyCheck = await this.policyEngine.checkPolicy(
      grant,
      task as TaskType,
      payload as PolicyRequestPayload,
      this.grantStore,
      globalPrefs
    );

    if (!policyCheck.allowed) {
      throw new ByomError(
        policyCheck.errorCode || ErrorCode.PERMISSION_DENIED,
        policyCheck.errorMessage || 'Policy check failed'
      );
    }

    switch (task) {
      case 'ask':
        return this.processAsk(payload as AskRequest, grant, policyCheck.modelPreference);
      
      case 'embed':
        return this.processEmbed(payload as EmbedRequest, grant);
      
      case 'classify': {
        const { input, categories, model } = payload as { input: string; categories: string[]; model?: string };
        return this.processClassify(input, categories, grant, model, policyCheck.modelPreference);
      }
      
      case 'extract':
        return this.processExtract(payload as ExtractRequest, grant, policyCheck.modelPreference);

      case 'chat':
        return this.processChat(payload as ChatRequest, grant, policyCheck.modelPreference);
      
      default:
        throw new ByomError(ErrorCode.TASK_NOT_ALLOWED, `Task ${task} not yet implemented`);
    }
  }

  /**
   * Process a streaming request
   */
  async *processStream(
    request: BridgeRequest,
    grant: Grant,
    abortSignal?: AbortSignal
  ): AsyncGenerator<StreamChunk, StreamFinish> {
    const { task, payload } = request;

    if (task !== 'stream') {
      throw new ByomError(ErrorCode.TASK_NOT_ALLOWED, `Streaming not supported for task: ${task}`);
    }

    // Check policy
    const askPayload = payload as AskRequest;
    const globalPrefs = await this.routingPrefsStore.getPreferences();

    const policyCheck = await this.policyEngine.checkPolicy(
      grant,
      task as TaskType,
      askPayload,
      this.grantStore,
      globalPrefs
    );

    if (!policyCheck.allowed) {
      throw new ByomError(
        policyCheck.errorCode || ErrorCode.PERMISSION_DENIED,
        policyCheck.errorMessage || 'Policy check failed'
      );
    }

    const routing = await this.resolveRouting(grant, 'stream', askPayload.model, policyCheck.modelPreference);
    if (!routing) {
      throw new ByomError(ErrorCode.PROVIDER_UNAVAILABLE, 'No available providers');
    }

    const { provider, modelId } = routing;
    const model = await this.getLanguageModel(provider.kind, modelId, provider.config);

    const startTime = Date.now();
    let totalTokens = 0;
    let inputTokens = 0;
    let outputTokens = 0;

    const useMessages = askPayload.messages !== undefined && askPayload.messages.length > 0;

    try {
      let result;

      if (useMessages) {
        const shieldedMessages = (askPayload.messages as Message[]).map((msg) => ({
          role: msg.role,
          content: this.promptShield.shield(msg.content),
        }));

        result = await streamText({
          model,
          messages: shieldedMessages,
          temperature: askPayload.temperature ?? 0.7,
          maxTokens: askPayload.maxTokens ?? 1000,
          abortSignal,
        });
      } else {
        const shieldedInput = this.promptShield.shield(askPayload.input ?? '');
        const prompt = this.buildPrompt({ ...askPayload, input: shieldedInput });

        result = await streamText({
          model,
          prompt,
          temperature: askPayload.temperature ?? 0.7,
          maxTokens: askPayload.maxTokens ?? 1000,
          abortSignal,
        });
      }

      // Process the stream
      for await (const chunk of result.textStream) {
        outputTokens += chunk.length / 4; // Rough estimation
        
        yield {
          text: chunk,
          isComplete: false,
          usage: {
            inputTokens,
            outputTokens: Math.floor(outputTokens),
          },
        };
      }

      // Get final usage from result
      const finalUsage = await result.usage;
      inputTokens = finalUsage?.inputTokens || inputTokens;
      outputTokens = finalUsage?.outputTokens || Math.floor(outputTokens);
      totalTokens = finalUsage?.totalTokens || (inputTokens + outputTokens);

      const latencyMs = Date.now() - startTime;
      const costUSD = this.estimateCost(totalTokens, provider.kind, modelId);

      // Record usage
      await this.recordUsage(grant.origin, provider.kind, modelId, 'stream', {
        input: inputTokens,
        output: outputTokens,
        total: totalTokens,
      }, costUSD, latencyMs, 'success');

      await this.healthTracker.recordSuccess(provider.kind, latencyMs);

      return {
        model: modelId,
        provider: provider.kind,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
        },
        costUSD,
        latencyMs,
      };
    } catch (error) {
      console.error('[OpenModelRouter] Streaming error:', error);
      
      // Record failed usage
      await this.recordUsage(grant.origin, provider.kind, modelId, 'stream', {
        input: 0,
        output: 0,
        total: 0,
      }, 0, Date.now() - startTime, 'error', error instanceof Error ? error.message : 'Streaming failed');

      await this.healthTracker.recordFailure(
        provider.kind,
        error instanceof Error ? error.message : 'Streaming failed'
      );

      throw new ByomError(
        ErrorCode.PROVIDER_ERROR,
        error instanceof Error ? error.message : 'Streaming request failed'
      );
    }
  }

  /**
   * Process ask request
   */
  private async processAsk(
    askPayload: AskRequest,
    grant: Grant,
    privacyAlias?: string
  ): Promise<AskResponse> {
    return this.executeWithRoutingRetry(grant, 'ask', askPayload.model, privacyAlias, async (provider, modelId) => {
      const model = await this.getLanguageModel(provider.kind, modelId, provider.config);
      const startTime = Date.now();
      const useMessages = askPayload.messages !== undefined && askPayload.messages.length > 0;

      let result;

      if (useMessages) {
        const shieldedMessages = (askPayload.messages as Message[]).map((msg) => ({
          role: msg.role,
          content: this.promptShield.shield(msg.content),
        }));

        result = await generateText({
          model,
          messages: shieldedMessages,
          temperature: askPayload.temperature ?? 0.7,
          maxTokens: askPayload.maxTokens ?? 1000,
        });
      } else {
        const shieldedInput = this.promptShield.shield(askPayload.input ?? '');
        const prompt = this.buildPrompt({ ...askPayload, input: shieldedInput });

        result = await generateText({
          model,
          prompt,
          temperature: askPayload.temperature ?? 0.7,
          maxTokens: askPayload.maxTokens ?? 1000,
        });
      }

      const latencyMs = Date.now() - startTime;
      const usage = normalizeLanguageModelUsage(result.usage);
      const costUSD = calculateCost(usage.inputTokens, usage.outputTokens, modelId);

      await this.recordUsage(grant.origin, provider.kind, modelId, 'ask', {
        input: usage.inputTokens,
        output: usage.outputTokens,
        total: usage.totalTokens,
      }, costUSD, latencyMs, 'success');

      await this.healthTracker.recordSuccess(provider.kind, latencyMs);

      return {
        text: result.text,
        model: modelId,
        provider: provider.kind,
        usage,
        costUSD,
        latencyMs,
      };
    });
  }

  /**
   * Convert raw provider errors into human-readable messages.
   */
  private humanizeProviderError(error: unknown, providerKind: string): string {
    const msg = error instanceof Error ? error.message : String(error);

    // 403 from Ollama = OLLAMA_ORIGINS not configured
    if ((msg.includes('403') || msg.toLowerCase().includes('forbidden')) && providerKind === 'ollama') {
      return (
        'Ollama refused the request (403 Forbidden). ' +
        'The extension origin is blocked by Ollama\'s CORS policy. ' +
        'Fix: restart Ollama with OLLAMA_ORIGINS="*" ' +
        '(PowerShell: $env:OLLAMA_ORIGINS="*"; ollama serve)'
      );
    }

    // Connection refused = provider not running
    if (msg.includes('ECONNREFUSED') || msg.includes('Failed to fetch') || msg.includes('fetch failed')) {
      return (
        `Cannot connect to ${providerKind} — is it running? ` +
        `(${msg})`
      );
    }

    // 401 = bad API key
    if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
      return `Invalid API key for ${providerKind}. Please update your credentials in the extension settings.`;
    }

    return msg;
  }

  /**
   * Process embed request with multi-provider support
   * Supports: OpenAI (text-embedding-3-small/3-large), Google (text-embedding-004)
   */
  private async processEmbed(request: EmbedRequest, grant: Grant): Promise<EmbedResponse> {
    const routing = await this.resolveRouting(grant, 'embed', request.model);
    if (!routing) {
      throw new ByomError(ErrorCode.PROVIDER_UNAVAILABLE, 
        'No available providers with embedding support. Please add OpenAI or Google provider.');
    }

    const { provider, modelId } = routing;
    const providerInstance = await this.getProviderInstance(provider.kind, provider.config);
    if (!providerInstance) {
      throw new ByomError(ErrorCode.VAULT_LOCKED, 'Provider credentials not available');
    }

    const startTime = Date.now();

    try {
      const result = await embed({
        model: providerInstance.embedding(modelId),
        value: request.input,
      });

      const latencyMs = Date.now() - startTime;
      const costUSD = this.estimateEmbeddingCost(result.usage?.tokens || 0, modelId);

      await this.recordUsage(grant.origin, provider.kind, modelId, 'embed', {
        input: result.usage?.tokens || 0,
        output: 0,
        total: result.usage?.tokens || 0,
      }, costUSD, latencyMs, 'success');

      await this.healthTracker.recordSuccess(provider.kind, latencyMs);

      return {
        embedding: result.embedding,
        model: modelId,
        provider: provider.kind,
        usage: {
          tokens: result.usage?.tokens || 0,
        },
      };
    } catch (error) {
      await this.healthTracker.recordFailure(
        provider.kind,
        error instanceof Error ? error.message : 'Embedding request failed'
      );
      throw new ByomError(
        ErrorCode.PROVIDER_ERROR,
        error instanceof Error ? error.message : 'Embedding request failed'
      );
    }
  }

  /**
   * Get the appropriate embedding model for a provider
   */
  private getEmbeddingModel(kind: ProviderId, requestedModel?: string): string {
    // If specific model requested, use it
    if (requestedModel) return requestedModel;

    // Provider-specific defaults
    switch (kind) {
      case 'openai':
        return 'text-embedding-3-small';
      case 'google':
        return 'text-embedding-004';
      default:
        throw new ByomError(
          ErrorCode.PROVIDER_UNAVAILABLE,
          `Provider ${kind} does not support embeddings. Please use OpenAI or Google.`
        );
    }
  }

  /**
   * Check if a provider supports embeddings
   */
  private supportsEmbeddings(kind: ProviderId): boolean {
    return ['openai', 'google'].includes(kind);
  }

  /**
   * Select provider for a specific task (legacy helper, used by testProvider)
   */
  private async selectProviderForTask(grant: Grant, task: TaskType): Promise<{ kind: ProviderId; config: ProviderConfig } | null> {
    return this.resolveRouting(grant, task).then((r) => r?.provider ?? null);
  }

  /**
   * Process multi-turn chat request
   */
  private async processChat(
    request: ChatRequest,
    grant: Grant,
    privacyAlias?: string
  ): Promise<ChatResponse> {
    const history: Message[] = [...(request.messages ?? [])];
    history.push({ role: 'user', content: request.message });

    const askPayload: AskRequest = {
      messages: history,
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      task: 'chat',
    };

    const result = await this.processAsk(askPayload, grant, privacyAlias);
    const assistantMessage: Message = {
      role: 'assistant',
      content: result.text,
    };

    return {
      sessionId: request.sessionId ?? `chat-${Date.now()}`,
      message: assistantMessage,
      text: result.text,
      model: result.model,
      provider: result.provider,
      usage: result.usage,
      costUSD: result.costUSD,
      latencyMs: result.latencyMs,
    };
  }

  /**
   * Process classify request
   */
  private async processClassify(
    input: string,
    categories: string[],
    grant: Grant,
    requestModel?: string,
    privacyAlias?: string
  ): Promise<ClassifyResponse> {
    const routing = await this.resolveRouting(grant, 'classify', requestModel, privacyAlias);
    if (!routing) {
      throw new ByomError(ErrorCode.PROVIDER_UNAVAILABLE, 'No available providers');
    }

    const { provider, modelId } = routing;
    const model = await this.getLanguageModel(provider.kind, modelId, provider.config);
    const startTime = Date.now();

    try {
      const result = await generateObject({
        model,
        schema: z.object({
          category: z.enum(categories as [string, ...string[]]),
          // Some models (e.g. OpenRouter Kimi) return only category without confidence.
          confidence: z.number().min(0).max(1).optional(),
        }),
        messages: [
          {
            role: 'system',
            content:
              'You are a text classifier. Respond with JSON only: "category" must be one of the allowed labels; "confidence" is optional (0–1).',
          },
          {
            role: 'user',
            content: `Categories: ${categories.join(', ')}\n\nText:\n${input}`,
          },
        ],
      });

      const latencyMs = Date.now() - startTime;
      const usage = normalizeLanguageModelUsage(result.usage);
      const costUSD = calculateCost(usage.inputTokens, usage.outputTokens, modelId);

      await this.recordUsage(grant.origin, provider.kind, modelId, 'classify', {
        input: usage.inputTokens,
        output: usage.outputTokens,
        total: usage.totalTokens,
      }, costUSD, latencyMs, 'success');

      await this.healthTracker.recordSuccess(provider.kind, latencyMs);

      return {
        category: result.object.category,
        confidence: result.object.confidence ?? 1,
        model: modelId,
        provider: provider.kind,
        usage,
        costUSD,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      await this.recordUsage(grant.origin, provider.kind, modelId, 'classify', toUsageRecordTokens(ZERO_USAGE), 0, latencyMs, 'error', error instanceof Error ? error.message : 'Classification failed');
      await this.healthTracker.recordFailure(
        provider.kind,
        error instanceof Error ? error.message : 'Classification failed'
      );
      throw new ByomError(
        ErrorCode.PROVIDER_ERROR,
        error instanceof Error ? error.message : 'Classification failed'
      );
    }
  }

  /**
   * Process extract request
   * Returns the extracted object directly (ExtractResponse is the extracted data)
   */
  private async processExtract(
    request: ExtractRequest,
    grant: Grant,
    privacyAlias?: string
  ): Promise<ExtractResponse> {
    const routing = await this.resolveRouting(grant, 'extract', request.model, privacyAlias);
    if (!routing) {
      throw new ByomError(ErrorCode.PROVIDER_UNAVAILABLE, 'No available providers');
    }

    const { provider, modelId } = routing;
    const model = await this.getLanguageModel(provider.kind, modelId, provider.config);
    const schema = this.jsonSchemaToZod(request.schema);
    const startTime = Date.now();

    try {
      const result = await generateObject({
        model,
        schema,
        messages: [
          { role: 'system', content: 'You are a data extraction assistant. Extract structured data and return it as JSON.' },
          { role: 'user', content: `Extract the requested information from this text:\n\n${request.input}` },
        ],
      });

      const latencyMs = Date.now() - startTime;
      const usage = normalizeLanguageModelUsage(result.usage);
      const costUSD = calculateCost(usage.inputTokens, usage.outputTokens, modelId);

      await this.recordUsage(grant.origin, provider.kind, modelId, 'extract', {
        input: usage.inputTokens,
        output: usage.outputTokens,
        total: usage.totalTokens,
      }, costUSD, latencyMs, 'success');

      await this.healthTracker.recordSuccess(provider.kind, latencyMs);

      return result.object as ExtractResponse;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      await this.recordUsage(grant.origin, provider.kind, modelId, 'extract', toUsageRecordTokens(ZERO_USAGE), 0, latencyMs, 'error', error instanceof Error ? error.message : 'Extraction failed');
      await this.healthTracker.recordFailure(
        provider.kind,
        error instanceof Error ? error.message : 'Extraction failed'
      );
      throw new ByomError(
        ErrorCode.PROVIDER_ERROR,
        error instanceof Error ? error.message : 'Extraction failed'
      );
    }
  }

  /**
   * Resolve provider and model using global routing preferences
   */
  private async resolveRoutingFull(
    grant: Grant,
    task: TaskType,
    requestModel?: string,
    privacyAlias?: string
  ): Promise<ResolvedRouting | null> {
    const enabledProviders = await this.providerStore.getEnabledProviders();
    const globalPrefs = await this.routingPrefsStore.getPreferences();

    return resolveProviderAndModel(this.routingEngine, {
      grant,
      task,
      enabledProviders,
      globalPrefs,
      requestModel,
      privacyAlias,
      getDefaultModel: (kind) => this.getDefaultModel(kind),
      getEmbeddingModel: (kind, requested) => this.getEmbeddingModel(kind, requested),
      supportsEmbeddings: (kind) => this.supportsEmbeddings(kind),
    });
  }

  private async resolveRouting(
    grant: Grant,
    task: TaskType,
    requestModel?: string,
    privacyAlias?: string
  ): Promise<{ provider: { kind: ProviderId; config: ProviderConfig }; modelId: string } | null> {
    const resolved = await this.resolveRoutingFull(grant, task, requestModel, privacyAlias);

    if (!resolved) {
      return null;
    }

    return {
      provider: resolved.provider,
      modelId: resolved.modelId,
    };
  }

  /**
   * Execute a routed request with up to 2 fallback providers on retryable failure
   */
  private async executeWithRoutingRetry<T>(
    grant: Grant,
    task: TaskType,
    requestModel: string | undefined,
    privacyAlias: string | undefined,
    run: (
      provider: { kind: ProviderId; config: ProviderConfig },
      modelId: string
    ) => Promise<T>
  ): Promise<T> {
    const resolved = await this.resolveRoutingFull(grant, task, requestModel, privacyAlias);
    if (!resolved) {
      throw new ByomError(ErrorCode.PROVIDER_UNAVAILABLE, 'No available providers');
    }

    const candidates: Array<{ kind: ProviderId; config: ProviderConfig; modelId: string }> = [
      {
        kind: resolved.provider.kind,
        config: resolved.provider.config,
        modelId: resolved.modelId,
      },
    ];

    for (const alt of resolved.alternatives.slice(0, 2)) {
      if (candidates.some((c) => c.kind === alt.provider)) {
        continue;
      }
      candidates.push({
        kind: alt.provider,
        config: alt.config,
        modelId: alt.config.defaultModel || this.getDefaultModel(alt.provider),
      });
    }

    let lastError: unknown;

    for (const candidate of candidates) {
      try {
        return await run(
          { kind: candidate.kind, config: candidate.config },
          candidate.modelId
        );
      } catch (error) {
        console.error(`[OpenModelRouter] Provider error (${candidate.kind}):`, error);
        lastError = error;

        await this.recordUsage(
          grant.origin,
          candidate.kind,
          candidate.modelId,
          task,
          { input: 0, output: 0, total: 0 },
          0,
          0,
          'error',
          error instanceof Error ? error.message : 'Request failed'
        );

        await this.healthTracker.recordFailure(
          candidate.kind,
          error instanceof Error ? error.message : 'Request failed'
        );

        if (error instanceof ByomError && error.code === ErrorCode.VAULT_LOCKED) {
          throw error;
        }
      }
    }

    throw new ByomError(
      ErrorCode.PROVIDER_ERROR,
      this.humanizeProviderError(
        lastError,
        candidates[candidates.length - 1]?.kind ?? 'unknown'
      )
    );
  }

  /**
   * Get a language model via registry, falling back to direct provider instance
   */
  private async getLanguageModel(
    kind: ProviderId,
    modelId: string,
    config: ProviderConfig
  ): Promise<any> {
    try {
      return await this.getModelFromRegistry(`${kind}:${modelId}`);
    } catch {
      const providerInstance = await this.getProviderInstance(kind, config);
      if (!providerInstance) {
        throw new ByomError(ErrorCode.VAULT_LOCKED, 'Provider credentials not available');
      }
      return providerInstance(modelId);
    }
  }

  /**
   * Get or create a provider instance with API key
   * Legacy method - prefer getModelFromRegistry for new code
   */
  private async getProviderInstance(kind: ProviderId, config: any): Promise<any | null> {
    // Check cache
    if (this.providerInstances.has(kind)) {
      return this.providerInstances.get(kind)!;
    }

    if (!config) {
      return null;
    }

    // Check if vault is unlocked for decryption
    if (!await this.vault.isUnlocked()) {
      throw new ByomError(
        ErrorCode.VAULT_LOCKED,
        'Extension vault is locked. Please unlock it via the extension popup.'
      );
    }

    // Decrypt API key
    let apiKey: string;
    try {
      apiKey = await this.vault.decrypt(config.encryptedSecret, config.iv);
    } catch (error) {
      console.error('[OpenModelRouter] Failed to decrypt API key:', error);
      throw new ByomError(
        ErrorCode.VAULT_LOCKED,
        'Failed to decrypt provider credentials. The vault may be locked or the passphrase changed.'
      );
    }
    
    const baseURL = config.baseURL;

    // Create provider instance
    const instance = createProviderAdapter(kind, apiKey, config);
    if (!instance) {
      return null;
    }

    // Cache instance
    this.providerInstances.set(kind, instance);
    return instance;
  }

  /**
   * Get a language model from the provider registry
   * Supports aliases like 'aliases:fast' and direct model IDs like 'openai:gpt-4o-mini'
   */
  private async getModelFromRegistry(modelId: string): Promise<any> {
    const registry = await this.getProviderRegistry();
    
    // Handle alias format: aliases:fast, aliases:reasoning, etc.
    if (modelId.startsWith('aliases:')) {
      const alias = modelId.split(':')[1];
      return registry.languageModel(alias);
    }
    
    // Handle direct format: openai:gpt-4o-mini
    const [provider, ...modelParts] = modelId.split(':');
    if (modelParts.length > 0) {
      const modelName = modelParts.join(':'); // Handle models with colons in name
      const fullId = `${provider}:${modelName}`;
      return registry.languageModel(fullId);
    }
    
    // Fallback: try as-is
    return registry.languageModel(modelId);
  }

  /**
   * Build a prompt from the request
   */
  private buildPrompt(payload: AskRequest): string {
    const { task, input, context } = payload;
    
    let prompt = '';
    
    if (task === 'summarize') {
      prompt = `Summarize the following text concisely:\n\n${input}`;
    } else if (task === 'draft') {
      prompt = `Draft a professional response to the following:\n\n${input}`;
    } else {
      prompt = input;
    }

    if (context && Object.keys(context).length > 0) {
      prompt += `\n\nContext: ${JSON.stringify(context)}`;
    }

    return prompt;
  }

  /**
   * Get default model for a provider
   */
  private getDefaultModel(kind: ProviderId): string {
    return getRegistryDefaultModel(kind);
  }

  /**
   * Estimate cost in USD using centralized pricing
   */
  private estimateCost(tokens: number, kind: ProviderId, model: string): number {
    // Use centralized pricing module
    // Assume 50/50 split between input and output tokens for estimation
    const inputTokens = Math.floor(tokens / 2);
    const outputTokens = tokens - inputTokens;
    return calculateCost(inputTokens, outputTokens, model);
  }

  /**
   * Estimate embedding cost using centralized pricing
   */
  private estimateEmbeddingCost(tokens: number, model: string = 'text-embedding-3-small'): number {
    return calculateEmbeddingCost(tokens, model);
  }

  /**
   * Record usage for telemetry
   */
  private async recordUsage(
    origin: string,
    provider: ProviderId,
    model: string,
    task: string,
    tokens: { input: number; output: number; total: number },
    costUSD: number,
    latencyMs: number,
    status: 'success' | 'error' | 'aborted',
    errorMessage?: string
  ): Promise<void> {
    const usage: UsageRecord = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      origin,
      provider,
      model,
      task: task as TaskType,
      tokens,
      costUSD,
      status,
      latencyMs,
      errorCode: errorMessage ? ErrorCode.PROVIDER_ERROR : undefined,
    };

    await this.telemetryStore.recordUsage(usage);
    await this.grantStore.updateUsage(origin, costUSD);
  }

  // Schema cache to avoid re-parsing
  private schemaCache = new Map<string, z.ZodType<any>>();

  /**
   * Convert JSON schema to Zod schema with caching
   * Uses SHA-256 hash of schema JSON as cache key
   */
  private jsonSchemaToZod(schema: any): z.ZodType<any> {
    // Generate cache key from schema JSON
    const schemaJson = JSON.stringify(schema);
    const cacheKey = this.hashString(schemaJson);
    
    // Check cache
    const cached = this.schemaCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Convert and cache
    const zodSchema = this.convertJsonSchemaToZod(schema);
    this.schemaCache.set(cacheKey, zodSchema);
    return zodSchema;
  }

  /**
   * Simple string hash function (FNV-1a variant)
   */
  private hashString(str: string): string {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16);
  }

  /**
   * Recursively convert JSON Schema to Zod schema
   */
  private convertJsonSchemaToZod(schema: any): z.ZodType<any> {
    // Handle null/undefined
    if (!schema) {
      return z.any();
    }

    // Handle string schema shorthand
    if (typeof schema === 'string') {
      switch (schema) {
        case 'string': return z.string();
        case 'number': return z.number();
        case 'integer': return z.number().int();
        case 'boolean': return z.boolean();
        case 'array': return z.array(z.any());
        case 'object': return z.record(z.any());
        default: return z.any();
      }
    }

    // Handle JSON Schema object
    if (typeof schema === 'object') {
      // Handle enum
      if (schema.enum && Array.isArray(schema.enum)) {
        return z.enum(schema.enum as [string, ...string[]]);
      }

      // Handle const
      if (schema.const !== undefined) {
        return z.literal(schema.const);
      }

      // Handle type-based schemas
      switch (schema.type) {
        case 'string': {
          let validator = z.string();
          if (schema.minLength !== undefined) {
            validator = validator.min(schema.minLength);
          }
          if (schema.maxLength !== undefined) {
            validator = validator.max(schema.maxLength);
          }
          if (schema.pattern) {
            validator = validator.regex(new RegExp(schema.pattern));
          }
          if (schema.format === 'email') {
            validator = validator.email();
          }
          if (schema.format === 'url' || schema.format === 'uri') {
            validator = validator.url();
          }
          return validator;
        }

        case 'number': {
          let validator = z.number();
          if (schema.minimum !== undefined) {
            validator = validator.min(schema.minimum);
          }
          if (schema.maximum !== undefined) {
            validator = validator.max(schema.maximum);
          }
          return validator;
        }

        case 'integer': {
          let validator = z.number().int();
          if (schema.minimum !== undefined) {
            validator = validator.min(schema.minimum);
          }
          if (schema.maximum !== undefined) {
            validator = validator.max(schema.maximum);
          }
          return validator;
        }

        case 'boolean':
          return z.boolean();

        case 'array': {
          const itemSchema = schema.items 
            ? this.convertJsonSchemaToZod(schema.items)
            : z.any();
          let validator = z.array(itemSchema);
          if (schema.minItems !== undefined) {
            validator = validator.min(schema.minItems);
          }
          if (schema.maxItems !== undefined) {
            validator = validator.max(schema.maxItems);
          }
          return validator;
        }

        case 'object': {
          // Handle object with properties
          if (schema.properties && typeof schema.properties === 'object') {
            const shape: Record<string, z.ZodType<any>> = {};
            const requiredKeys = new Set<string>(
              Array.isArray(schema.required) ? schema.required : []
            );

            for (const [key, propSchema] of Object.entries(schema.properties)) {
              let fieldSchema = this.convertJsonSchemaToZod(propSchema);
              if (!requiredKeys.has(key)) {
                fieldSchema = fieldSchema.optional();
              }
              shape[key] = fieldSchema;
            }

            let objectSchema = z.object(shape);

            // Handle additionalProperties
            if (schema.additionalProperties === true) {
              objectSchema = objectSchema.passthrough();
            } else if (schema.additionalProperties === false) {
              objectSchema = objectSchema.strict();
            }

            return objectSchema;
          }

          // Handle patternProperties (simplified - just return record)
          if (schema.patternProperties) {
            return z.record(z.any());
          }

          // Default object
          return z.record(z.any());
        }

        case 'null':
          return z.null();

        default:
          // Handle anyOf, oneOf, allOf
          if (schema.anyOf && Array.isArray(schema.anyOf)) {
            return z.union(
              schema.anyOf.map((s: any) => this.convertJsonSchemaToZod(s)) as [z.ZodType<any>, z.ZodType<any>, ...z.ZodType<any>[]]
            );
          }

          if (schema.oneOf && Array.isArray(schema.oneOf)) {
            // For oneOf, we use union but this is approximate
            return z.union(
              schema.oneOf.map((s: any) => this.convertJsonSchemaToZod(s)) as [z.ZodType<any>, z.ZodType<any>, ...z.ZodType<any>[]]
            );
          }

          if (schema.allOf && Array.isArray(schema.allOf)) {
            // For allOf, we intersect the schemas
            // Simplified: just use the first schema
            return this.convertJsonSchemaToZod(schema.allOf[0]);
          }

          return z.any();
      }
    }

    return z.any();
  }

  /**
   * Clear cached provider instances
   */
  clearCache(): void {
    this.providerInstances.clear();
  }

  /**
   * Test a provider connection
   */
  async testProvider(
    kind: ProviderId,
    baseURL?: string,
    providerId?: string
  ): Promise<{ success: boolean; error?: string; models?: string[] }> {
    try {
      const provider = providerId
        ? await this.providerStore.getProvider(providerId)
        : await this.providerStore.getProviderByKind(kind);
      if (!provider) {
        return { success: false, error: 'Provider not found' };
      }

      if (!await this.vault.isUnlocked()) {
        return { success: false, error: 'Vault is locked' };
      }

      let apiKey = '';
      if (provider.encryptedSecret) {
        try {
          apiKey = await this.vault.decrypt(provider.encryptedSecret, provider.iv);
        } catch {
          return { success: false, error: 'Failed to decrypt provider credentials' };
        }
      }

      return testProviderConnection(kind, apiKey, baseURL || provider.baseURL);
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Connection test failed' };
    }
  }
}