import { z } from 'zod';
import { ErrorCode } from './errors.js';
/**
 * Provider identifiers
 */
export const ProviderIdSchema = z.enum([
    'openai',
    'anthropic',
    'google',
    'mistral',
    'groq',
    'cohere',
    'deepseek',
    'together',
    'fireworks',
    'perplexity',
    'xai',
    'cerebras',
    'openrouter',
    'ollama',
    'lmstudio',
]);
/**
 * Task types supported by byom
 */
export const TaskTypeSchema = z.enum([
    'ask',
    'stream',
    'embed',
    'classify',
    'extract',
    'chat',
]);
/**
 * Privacy modes
 */
export const PrivacyModeSchema = z.enum([
    'local-only',
    'preferred-local',
    'cloud-allowed',
    'per-task',
]);
/**
 * Message envelope - base for all wire communications
 */
export const MessageEnvelopeSchema = z.object({
    v: z.literal(1),
    kind: z.string(),
    reqId: z.string(),
    timestamp: z.number(),
    payload: z.unknown(),
});
/**
 * Request envelope from page to extension
 */
export const RequestEnvelopeSchema = z.object({
    v: z.literal(1),
    kind: z.literal('request'),
    reqId: z.string(),
    timestamp: z.number(),
    protocolVersion: z.string(),
    nonce: z.string(), // 16-byte nonce for replay protection
    payload: z.object({
        task: TaskTypeSchema,
        request: z.unknown(),
    }),
});
/**
 * Response envelope from extension to page
 */
export const ResponseEnvelopeSchema = z.object({
    v: z.literal(1),
    kind: z.enum(['response', 'delta', 'error', 'finish']),
    reqId: z.string(),
    timestamp: z.number(),
    payload: z.unknown(),
});
/**
 * Message schema for raw messages array
 */
export const MessageSchema = z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
});
/**
 * Ask request payload
 */
export const AskRequestSchema = z.object({
    task: z.enum(['summarize', 'draft', 'chat']).optional(),
    input: z.string().max(100000).optional(), // Optional when messages provided
    context: z.record(z.unknown()).optional(),
    model: z.string().optional(), // Specific model preference
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().positive().optional(),
    messages: z.array(MessageSchema).min(1).optional(), // Raw messages array
}).refine((data) => data.input !== undefined || data.messages !== undefined, { message: 'Either input or messages must be provided' });
/**
 * Ask response payload
 */
export const AskResponseSchema = z.object({
    text: z.string(),
    model: z.string(),
    provider: ProviderIdSchema,
    usage: z.object({
        inputTokens: z.number(),
        outputTokens: z.number(),
        totalTokens: z.number(),
    }),
    costUSD: z.number(),
    latencyMs: z.number(),
});
/**
 * Stream chunk payload
 */
export const StreamChunkSchema = z.object({
    text: z.string(),
    isComplete: z.boolean(),
    usage: z.object({
        inputTokens: z.number().optional(),
        outputTokens: z.number().optional(),
    }).optional(),
});
/**
 * Stream finish payload
 */
export const StreamFinishSchema = z.object({
    model: z.string(),
    provider: ProviderIdSchema,
    usage: z.object({
        inputTokens: z.number(),
        outputTokens: z.number(),
        totalTokens: z.number(),
    }),
    costUSD: z.number(),
    latencyMs: z.number(),
});
/**
 * Embed request payload
 */
export const EmbedRequestSchema = z.object({
    input: z.string().max(10000),
    model: z.string().optional(),
});
/**
 * Embed response payload
 */
export const EmbedResponseSchema = z.object({
    embedding: z.array(z.number()),
    model: z.string(),
    provider: ProviderIdSchema,
    usage: z.object({
        tokens: z.number(),
    }),
});
/**
 * Classify response payload
 */
export const ClassifyResponseSchema = z.object({
    category: z.string(),
    confidence: z.number(),
    model: z.string(),
    provider: ProviderIdSchema,
    usage: z.object({
        inputTokens: z.number(),
        outputTokens: z.number(),
        totalTokens: z.number(),
    }),
    costUSD: z.number(),
    latencyMs: z.number(),
});
/**
 * Extract response payload - the extracted object itself
 */
export const ExtractResponseSchema = z.record(z.unknown());
/**
 * Chat request schema (multi-turn conversation)
 */
export const ChatRequestSchema = z.object({
    message: z.string().min(1),
    sessionId: z.string().optional(),
    messages: z.array(MessageSchema).optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().positive().optional(),
});
/**
 * Chat response schema
 */
export const ChatResponseSchema = z.object({
    sessionId: z.string(),
    message: MessageSchema,
    text: z.string(),
    model: z.string(),
    provider: ProviderIdSchema,
    usage: z.object({
        inputTokens: z.number(),
        outputTokens: z.number(),
        totalTokens: z.number(),
    }),
    costUSD: z.number(),
    latencyMs: z.number(),
});
/**
 * Extension capabilities returned by ping/getCapabilities
 */
export const CapabilitiesSchema = z.object({
    extensionVersion: z.string(),
    supportedTasks: z.array(TaskTypeSchema),
    siteApproved: z.boolean(),
    vaultUnlocked: z.boolean(),
});
/**
 * BYOM event types pushed from extension to page
 */
export const ByomEventTypeSchema = z.enum([
    'vault-locked',
    'budget-warning',
    'permission-needed',
    'request-complete',
]);
export const ByomEventPayloadSchema = z.object({
    event: ByomEventTypeSchema,
    origin: z.string().optional(),
    data: z.record(z.unknown()).optional(),
    timestamp: z.number(),
});
/**
 * Extract request with Zod schema serialization
 */
export const ExtractRequestSchema = z.object({
    input: z.string(),
    schema: z.object({
        // JSON Schema representation
        type: z.literal('object'),
        properties: z.record(z.unknown()),
        required: z.array(z.string()).optional(),
    }),
    model: z.string().optional(),
});
/**
 * Grant document - stored per-origin permissions
 */
export const GrantSchema = z.object({
    origin: z.string(),
    providers: z.array(ProviderIdSchema),
    allowedTasks: z.array(TaskTypeSchema),
    modelAllowlist: z.array(z.string()).optional(),
    dailyBudgetUSD: z.number().min(0),
    monthlyBudgetUSD: z.number().min(0),
    perRequestTokenCap: z.number().positive(),
    privacyMode: PrivacyModeSchema,
    autoApprove: z.boolean(),
    expiresAt: z.number().optional(), // timestamp
    createdAt: z.number(),
    updatedAt: z.number(),
});
/**
 * Provider configuration (stored encrypted)
 */
export const ProviderConfigSchema = z.object({
    id: z.string(),
    kind: ProviderIdSchema,
    label: z.string(),
    encryptedSecret: z.string(), // AES-GCM encrypted
    iv: z.string(), // initialization vector
    salt: z.string(), // PBKDF2 salt
    baseURL: z.string().url().optional(),
    defaultModel: z.string().optional(),
    isEnabled: z.boolean(),
    createdAt: z.number(),
    updatedAt: z.number(),
});
/**
 * Serialized error payload
 */
export const ErrorPayloadSchema = z.object({
    code: z.nativeEnum(ErrorCode),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
});
/**
 * Global routing preferences - user-defined defaults for provider selection
 */
export const TaskRoutingOverrideSchema = z.enum(['auto', 'local', 'cloud', 'ask']);
/** Task override value: routing mode or `provider:<id>` for a fixed provider */
export const TaskOverrideValueSchema = z.union([
    TaskRoutingOverrideSchema,
    z.string().regex(/^provider:[a-z0-9-]+$/),
]);
export const GlobalRoutingPreferencesSchema = z.object({
    // Global routing mode
    mode: z.enum(['auto', 'ask-every-time', 'default-local', 'default-cloud', 'specific-provider']),
    // When mode is 'specific-provider', which provider to use
    preferredProvider: ProviderIdSchema.optional(),
    // Preferred model alias or specific model
    preferredModel: z.string().optional(),
    // For ask-every-time: remember last manual choice as default
    rememberLastChoice: z.boolean().default(true),
    /** @deprecated Use lastUsedProviders — migrated on load */
    lastUsedProvider: ProviderIdSchema.optional(),
    // Per-task last manually chosen provider (ask-every-time)
    lastUsedProviders: z.record(z.string(), ProviderIdSchema).optional(),
    // Most recent manual consent pick
    lastManualChoice: z
        .object({
        provider: ProviderIdSchema,
        task: z.string(),
        timestamp: z.number(),
    })
        .optional(),
    // Task-specific overrides (e.g., 'embed' → local, 'ask' → provider:openai)
    taskOverrides: z.record(z.string(), TaskOverrideValueSchema).optional(),
    updatedAt: z.number(),
});
/**
 * Usage record for telemetry
 */
export const UsageRecordSchema = z.object({
    id: z.string(),
    timestamp: z.number(),
    origin: z.string(),
    provider: ProviderIdSchema,
    model: z.string(),
    task: TaskTypeSchema,
    tokens: z.object({
        input: z.number(),
        output: z.number(),
        total: z.number(),
    }),
    costUSD: z.number(),
    status: z.enum(['success', 'error', 'aborted']),
    latencyMs: z.number(),
    errorCode: z.nativeEnum(ErrorCode).optional(),
});
//# sourceMappingURL=schemas.js.map