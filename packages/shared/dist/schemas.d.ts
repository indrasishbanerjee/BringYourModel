import { z } from 'zod';
import { ErrorCode } from './errors.js';
/**
 * Provider identifiers
 */
export declare const ProviderIdSchema: z.ZodEnum<["openai", "anthropic", "google", "mistral", "groq", "cohere", "deepseek", "together", "fireworks", "perplexity", "xai", "cerebras", "openrouter", "ollama", "lmstudio"]>;
export type ProviderId = z.infer<typeof ProviderIdSchema>;
/**
 * Task types supported by byom
 */
export declare const TaskTypeSchema: z.ZodEnum<["ask", "stream", "embed", "classify", "extract", "chat"]>;
export type TaskType = z.infer<typeof TaskTypeSchema>;
/**
 * Privacy modes
 */
export declare const PrivacyModeSchema: z.ZodEnum<["local-only", "preferred-local", "cloud-allowed", "per-task"]>;
export type PrivacyMode = z.infer<typeof PrivacyModeSchema>;
/**
 * Message envelope - base for all wire communications
 */
export declare const MessageEnvelopeSchema: z.ZodObject<{
    v: z.ZodLiteral<1>;
    kind: z.ZodString;
    reqId: z.ZodString;
    timestamp: z.ZodNumber;
    payload: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    v: 1;
    kind: string;
    reqId: string;
    timestamp: number;
    payload?: unknown;
}, {
    v: 1;
    kind: string;
    reqId: string;
    timestamp: number;
    payload?: unknown;
}>;
export type MessageEnvelope = z.infer<typeof MessageEnvelopeSchema>;
/**
 * Request envelope from page to extension
 */
export declare const RequestEnvelopeSchema: z.ZodObject<{
    v: z.ZodLiteral<1>;
    kind: z.ZodLiteral<"request">;
    reqId: z.ZodString;
    timestamp: z.ZodNumber;
    protocolVersion: z.ZodString;
    nonce: z.ZodString;
    payload: z.ZodObject<{
        task: z.ZodEnum<["ask", "stream", "embed", "classify", "extract", "chat"]>;
        request: z.ZodUnknown;
    }, "strip", z.ZodTypeAny, {
        task: "ask" | "stream" | "embed" | "classify" | "extract" | "chat";
        request?: unknown;
    }, {
        task: "ask" | "stream" | "embed" | "classify" | "extract" | "chat";
        request?: unknown;
    }>;
}, "strip", z.ZodTypeAny, {
    v: 1;
    kind: "request";
    reqId: string;
    timestamp: number;
    payload: {
        task: "ask" | "stream" | "embed" | "classify" | "extract" | "chat";
        request?: unknown;
    };
    protocolVersion: string;
    nonce: string;
}, {
    v: 1;
    kind: "request";
    reqId: string;
    timestamp: number;
    payload: {
        task: "ask" | "stream" | "embed" | "classify" | "extract" | "chat";
        request?: unknown;
    };
    protocolVersion: string;
    nonce: string;
}>;
export type RequestEnvelope = z.infer<typeof RequestEnvelopeSchema>;
/**
 * Response envelope from extension to page
 */
export declare const ResponseEnvelopeSchema: z.ZodObject<{
    v: z.ZodLiteral<1>;
    kind: z.ZodEnum<["response", "delta", "error", "finish"]>;
    reqId: z.ZodString;
    timestamp: z.ZodNumber;
    payload: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    v: 1;
    kind: "response" | "delta" | "error" | "finish";
    reqId: string;
    timestamp: number;
    payload?: unknown;
}, {
    v: 1;
    kind: "response" | "delta" | "error" | "finish";
    reqId: string;
    timestamp: number;
    payload?: unknown;
}>;
export type ResponseEnvelope = z.infer<typeof ResponseEnvelopeSchema>;
/**
 * Message schema for raw messages array
 */
export declare const MessageSchema: z.ZodObject<{
    role: z.ZodEnum<["system", "user", "assistant"]>;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    role: "system" | "user" | "assistant";
    content: string;
}, {
    role: "system" | "user" | "assistant";
    content: string;
}>;
export type Message = z.infer<typeof MessageSchema>;
/**
 * Ask request payload
 */
export declare const AskRequestSchema: z.ZodEffects<z.ZodObject<{
    task: z.ZodOptional<z.ZodEnum<["summarize", "draft", "chat"]>>;
    input: z.ZodOptional<z.ZodString>;
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    model: z.ZodOptional<z.ZodString>;
    temperature: z.ZodOptional<z.ZodNumber>;
    maxTokens: z.ZodOptional<z.ZodNumber>;
    messages: z.ZodOptional<z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["system", "user", "assistant"]>;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        role: "system" | "user" | "assistant";
        content: string;
    }, {
        role: "system" | "user" | "assistant";
        content: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    task?: "chat" | "summarize" | "draft" | undefined;
    input?: string | undefined;
    context?: Record<string, unknown> | undefined;
    model?: string | undefined;
    temperature?: number | undefined;
    maxTokens?: number | undefined;
    messages?: {
        role: "system" | "user" | "assistant";
        content: string;
    }[] | undefined;
}, {
    task?: "chat" | "summarize" | "draft" | undefined;
    input?: string | undefined;
    context?: Record<string, unknown> | undefined;
    model?: string | undefined;
    temperature?: number | undefined;
    maxTokens?: number | undefined;
    messages?: {
        role: "system" | "user" | "assistant";
        content: string;
    }[] | undefined;
}>, {
    task?: "chat" | "summarize" | "draft" | undefined;
    input?: string | undefined;
    context?: Record<string, unknown> | undefined;
    model?: string | undefined;
    temperature?: number | undefined;
    maxTokens?: number | undefined;
    messages?: {
        role: "system" | "user" | "assistant";
        content: string;
    }[] | undefined;
}, {
    task?: "chat" | "summarize" | "draft" | undefined;
    input?: string | undefined;
    context?: Record<string, unknown> | undefined;
    model?: string | undefined;
    temperature?: number | undefined;
    maxTokens?: number | undefined;
    messages?: {
        role: "system" | "user" | "assistant";
        content: string;
    }[] | undefined;
}>;
export type AskRequest = z.infer<typeof AskRequestSchema>;
/**
 * Ask response payload
 */
export declare const AskResponseSchema: z.ZodObject<{
    text: z.ZodString;
    model: z.ZodString;
    provider: z.ZodEnum<["openai", "anthropic", "google", "mistral", "groq", "cohere", "deepseek", "together", "fireworks", "perplexity", "xai", "cerebras", "openrouter", "ollama", "lmstudio"]>;
    usage: z.ZodObject<{
        inputTokens: z.ZodNumber;
        outputTokens: z.ZodNumber;
        totalTokens: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    }, {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    }>;
    costUSD: z.ZodNumber;
    latencyMs: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    model: string;
    text: string;
    provider: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio";
    usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    costUSD: number;
    latencyMs: number;
}, {
    model: string;
    text: string;
    provider: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio";
    usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    costUSD: number;
    latencyMs: number;
}>;
export type AskResponse = z.infer<typeof AskResponseSchema>;
/**
 * Stream chunk payload
 */
export declare const StreamChunkSchema: z.ZodObject<{
    text: z.ZodString;
    isComplete: z.ZodBoolean;
    usage: z.ZodOptional<z.ZodObject<{
        inputTokens: z.ZodOptional<z.ZodNumber>;
        outputTokens: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        inputTokens?: number | undefined;
        outputTokens?: number | undefined;
    }, {
        inputTokens?: number | undefined;
        outputTokens?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    text: string;
    isComplete: boolean;
    usage?: {
        inputTokens?: number | undefined;
        outputTokens?: number | undefined;
    } | undefined;
}, {
    text: string;
    isComplete: boolean;
    usage?: {
        inputTokens?: number | undefined;
        outputTokens?: number | undefined;
    } | undefined;
}>;
export type StreamChunk = z.infer<typeof StreamChunkSchema>;
/**
 * Stream finish payload
 */
export declare const StreamFinishSchema: z.ZodObject<{
    model: z.ZodString;
    provider: z.ZodEnum<["openai", "anthropic", "google", "mistral", "groq", "cohere", "deepseek", "together", "fireworks", "perplexity", "xai", "cerebras", "openrouter", "ollama", "lmstudio"]>;
    usage: z.ZodObject<{
        inputTokens: z.ZodNumber;
        outputTokens: z.ZodNumber;
        totalTokens: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    }, {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    }>;
    costUSD: z.ZodNumber;
    latencyMs: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    model: string;
    provider: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio";
    usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    costUSD: number;
    latencyMs: number;
}, {
    model: string;
    provider: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio";
    usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    costUSD: number;
    latencyMs: number;
}>;
export type StreamFinish = z.infer<typeof StreamFinishSchema>;
/**
 * Embed request payload
 */
export declare const EmbedRequestSchema: z.ZodObject<{
    input: z.ZodString;
    model: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    input: string;
    model?: string | undefined;
}, {
    input: string;
    model?: string | undefined;
}>;
export type EmbedRequest = z.infer<typeof EmbedRequestSchema>;
/**
 * Embed response payload
 */
export declare const EmbedResponseSchema: z.ZodObject<{
    embedding: z.ZodArray<z.ZodNumber, "many">;
    model: z.ZodString;
    provider: z.ZodEnum<["openai", "anthropic", "google", "mistral", "groq", "cohere", "deepseek", "together", "fireworks", "perplexity", "xai", "cerebras", "openrouter", "ollama", "lmstudio"]>;
    usage: z.ZodObject<{
        tokens: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        tokens: number;
    }, {
        tokens: number;
    }>;
}, "strip", z.ZodTypeAny, {
    model: string;
    provider: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio";
    usage: {
        tokens: number;
    };
    embedding: number[];
}, {
    model: string;
    provider: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio";
    usage: {
        tokens: number;
    };
    embedding: number[];
}>;
export type EmbedResponse = z.infer<typeof EmbedResponseSchema>;
/**
 * Classify response payload
 */
export declare const ClassifyResponseSchema: z.ZodObject<{
    category: z.ZodString;
    confidence: z.ZodNumber;
    model: z.ZodString;
    provider: z.ZodEnum<["openai", "anthropic", "google", "mistral", "groq", "cohere", "deepseek", "together", "fireworks", "perplexity", "xai", "cerebras", "openrouter", "ollama", "lmstudio"]>;
    usage: z.ZodObject<{
        inputTokens: z.ZodNumber;
        outputTokens: z.ZodNumber;
        totalTokens: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    }, {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    }>;
    costUSD: z.ZodNumber;
    latencyMs: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    model: string;
    provider: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio";
    usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    costUSD: number;
    latencyMs: number;
    category: string;
    confidence: number;
}, {
    model: string;
    provider: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio";
    usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    costUSD: number;
    latencyMs: number;
    category: string;
    confidence: number;
}>;
export type ClassifyResponse = z.infer<typeof ClassifyResponseSchema>;
/**
 * Extract response payload - the extracted object itself
 */
export declare const ExtractResponseSchema: z.ZodRecord<z.ZodString, z.ZodUnknown>;
export type ExtractResponse = z.infer<typeof ExtractResponseSchema>;
/**
 * Chat request schema (multi-turn conversation)
 */
export declare const ChatRequestSchema: z.ZodObject<{
    message: z.ZodString;
    sessionId: z.ZodOptional<z.ZodString>;
    messages: z.ZodOptional<z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["system", "user", "assistant"]>;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        role: "system" | "user" | "assistant";
        content: string;
    }, {
        role: "system" | "user" | "assistant";
        content: string;
    }>, "many">>;
    model: z.ZodOptional<z.ZodString>;
    temperature: z.ZodOptional<z.ZodNumber>;
    maxTokens: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    message: string;
    model?: string | undefined;
    temperature?: number | undefined;
    maxTokens?: number | undefined;
    messages?: {
        role: "system" | "user" | "assistant";
        content: string;
    }[] | undefined;
    sessionId?: string | undefined;
}, {
    message: string;
    model?: string | undefined;
    temperature?: number | undefined;
    maxTokens?: number | undefined;
    messages?: {
        role: "system" | "user" | "assistant";
        content: string;
    }[] | undefined;
    sessionId?: string | undefined;
}>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
/**
 * Chat response schema
 */
export declare const ChatResponseSchema: z.ZodObject<{
    sessionId: z.ZodString;
    message: z.ZodObject<{
        role: z.ZodEnum<["system", "user", "assistant"]>;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        role: "system" | "user" | "assistant";
        content: string;
    }, {
        role: "system" | "user" | "assistant";
        content: string;
    }>;
    text: z.ZodString;
    model: z.ZodString;
    provider: z.ZodEnum<["openai", "anthropic", "google", "mistral", "groq", "cohere", "deepseek", "together", "fireworks", "perplexity", "xai", "cerebras", "openrouter", "ollama", "lmstudio"]>;
    usage: z.ZodObject<{
        inputTokens: z.ZodNumber;
        outputTokens: z.ZodNumber;
        totalTokens: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    }, {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    }>;
    costUSD: z.ZodNumber;
    latencyMs: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    message: {
        role: "system" | "user" | "assistant";
        content: string;
    };
    model: string;
    text: string;
    provider: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio";
    usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    costUSD: number;
    latencyMs: number;
    sessionId: string;
}, {
    message: {
        role: "system" | "user" | "assistant";
        content: string;
    };
    model: string;
    text: string;
    provider: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio";
    usage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    costUSD: number;
    latencyMs: number;
    sessionId: string;
}>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
/**
 * Extension capabilities returned by ping/getCapabilities
 */
export declare const CapabilitiesSchema: z.ZodObject<{
    extensionVersion: z.ZodString;
    supportedTasks: z.ZodArray<z.ZodEnum<["ask", "stream", "embed", "classify", "extract", "chat"]>, "many">;
    siteApproved: z.ZodBoolean;
    vaultUnlocked: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    extensionVersion: string;
    supportedTasks: ("ask" | "stream" | "embed" | "classify" | "extract" | "chat")[];
    siteApproved: boolean;
    vaultUnlocked: boolean;
}, {
    extensionVersion: string;
    supportedTasks: ("ask" | "stream" | "embed" | "classify" | "extract" | "chat")[];
    siteApproved: boolean;
    vaultUnlocked: boolean;
}>;
export type Capabilities = z.infer<typeof CapabilitiesSchema>;
/**
 * BYOM event types pushed from extension to page
 */
export declare const ByomEventTypeSchema: z.ZodEnum<["vault-locked", "budget-warning", "permission-needed", "request-complete"]>;
export type ByomEventType = z.infer<typeof ByomEventTypeSchema>;
export declare const ByomEventPayloadSchema: z.ZodObject<{
    event: z.ZodEnum<["vault-locked", "budget-warning", "permission-needed", "request-complete"]>;
    origin: z.ZodOptional<z.ZodString>;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    timestamp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    event: "vault-locked" | "budget-warning" | "permission-needed" | "request-complete";
    origin?: string | undefined;
    data?: Record<string, unknown> | undefined;
}, {
    timestamp: number;
    event: "vault-locked" | "budget-warning" | "permission-needed" | "request-complete";
    origin?: string | undefined;
    data?: Record<string, unknown> | undefined;
}>;
export type ByomEventPayload = z.infer<typeof ByomEventPayloadSchema>;
/**
 * Extract request with Zod schema serialization
 */
export declare const ExtractRequestSchema: z.ZodObject<{
    input: z.ZodString;
    schema: z.ZodObject<{
        type: z.ZodLiteral<"object">;
        properties: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        required: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[] | undefined;
    }, {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[] | undefined;
    }>;
    model: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    input: string;
    schema: {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[] | undefined;
    };
    model?: string | undefined;
}, {
    input: string;
    schema: {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[] | undefined;
    };
    model?: string | undefined;
}>;
export type ExtractRequest = z.infer<typeof ExtractRequestSchema>;
/**
 * Grant document - stored per-origin permissions
 */
export declare const GrantSchema: z.ZodObject<{
    origin: z.ZodString;
    providers: z.ZodArray<z.ZodEnum<["openai", "anthropic", "google", "mistral", "groq", "cohere", "deepseek", "together", "fireworks", "perplexity", "xai", "cerebras", "openrouter", "ollama", "lmstudio"]>, "many">;
    allowedTasks: z.ZodArray<z.ZodEnum<["ask", "stream", "embed", "classify", "extract", "chat"]>, "many">;
    modelAllowlist: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    dailyBudgetUSD: z.ZodNumber;
    monthlyBudgetUSD: z.ZodNumber;
    perRequestTokenCap: z.ZodNumber;
    privacyMode: z.ZodEnum<["local-only", "preferred-local", "cloud-allowed", "per-task"]>;
    autoApprove: z.ZodBoolean;
    expiresAt: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    origin: string;
    providers: ("openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio")[];
    allowedTasks: ("ask" | "stream" | "embed" | "classify" | "extract" | "chat")[];
    dailyBudgetUSD: number;
    monthlyBudgetUSD: number;
    perRequestTokenCap: number;
    privacyMode: "local-only" | "preferred-local" | "cloud-allowed" | "per-task";
    autoApprove: boolean;
    createdAt: number;
    updatedAt: number;
    modelAllowlist?: string[] | undefined;
    expiresAt?: number | undefined;
}, {
    origin: string;
    providers: ("openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio")[];
    allowedTasks: ("ask" | "stream" | "embed" | "classify" | "extract" | "chat")[];
    dailyBudgetUSD: number;
    monthlyBudgetUSD: number;
    perRequestTokenCap: number;
    privacyMode: "local-only" | "preferred-local" | "cloud-allowed" | "per-task";
    autoApprove: boolean;
    createdAt: number;
    updatedAt: number;
    modelAllowlist?: string[] | undefined;
    expiresAt?: number | undefined;
}>;
export type Grant = z.infer<typeof GrantSchema>;
/**
 * Provider configuration (stored encrypted)
 */
export declare const ProviderConfigSchema: z.ZodObject<{
    id: z.ZodString;
    kind: z.ZodEnum<["openai", "anthropic", "google", "mistral", "groq", "cohere", "deepseek", "together", "fireworks", "perplexity", "xai", "cerebras", "openrouter", "ollama", "lmstudio"]>;
    label: z.ZodString;
    encryptedSecret: z.ZodString;
    iv: z.ZodString;
    salt: z.ZodString;
    baseURL: z.ZodOptional<z.ZodString>;
    defaultModel: z.ZodOptional<z.ZodString>;
    isEnabled: z.ZodBoolean;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    kind: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio";
    createdAt: number;
    updatedAt: number;
    id: string;
    label: string;
    encryptedSecret: string;
    iv: string;
    salt: string;
    isEnabled: boolean;
    baseURL?: string | undefined;
    defaultModel?: string | undefined;
}, {
    kind: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio";
    createdAt: number;
    updatedAt: number;
    id: string;
    label: string;
    encryptedSecret: string;
    iv: string;
    salt: string;
    isEnabled: boolean;
    baseURL?: string | undefined;
    defaultModel?: string | undefined;
}>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
/**
 * Serialized error payload
 */
export declare const ErrorPayloadSchema: z.ZodObject<{
    code: z.ZodNativeEnum<typeof ErrorCode>;
    message: z.ZodString;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown> | undefined;
}, {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown> | undefined;
}>;
export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>;
/**
 * Global routing preferences - user-defined defaults for provider selection
 */
export declare const TaskRoutingOverrideSchema: z.ZodEnum<["auto", "local", "cloud", "ask"]>;
export type TaskRoutingOverride = z.infer<typeof TaskRoutingOverrideSchema>;
/** Task override value: routing mode or `provider:<id>` for a fixed provider */
export declare const TaskOverrideValueSchema: z.ZodUnion<[z.ZodEnum<["auto", "local", "cloud", "ask"]>, z.ZodString]>;
export declare const GlobalRoutingPreferencesSchema: z.ZodObject<{
    mode: z.ZodEnum<["auto", "ask-every-time", "default-local", "default-cloud", "specific-provider"]>;
    preferredProvider: z.ZodOptional<z.ZodEnum<["openai", "anthropic", "google", "mistral", "groq", "cohere", "deepseek", "together", "fireworks", "perplexity", "xai", "cerebras", "openrouter", "ollama", "lmstudio"]>>;
    preferredModel: z.ZodOptional<z.ZodString>;
    rememberLastChoice: z.ZodDefault<z.ZodBoolean>;
    /** @deprecated Use lastUsedProviders — migrated on load */
    lastUsedProvider: z.ZodOptional<z.ZodEnum<["openai", "anthropic", "google", "mistral", "groq", "cohere", "deepseek", "together", "fireworks", "perplexity", "xai", "cerebras", "openrouter", "ollama", "lmstudio"]>>;
    lastUsedProviders: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodEnum<["openai", "anthropic", "google", "mistral", "groq", "cohere", "deepseek", "together", "fireworks", "perplexity", "xai", "cerebras", "openrouter", "ollama", "lmstudio"]>>>;
    lastManualChoice: z.ZodOptional<z.ZodObject<{
        provider: z.ZodEnum<["openai", "anthropic", "google", "mistral", "groq", "cohere", "deepseek", "together", "fireworks", "perplexity", "xai", "cerebras", "openrouter", "ollama", "lmstudio"]>;
        task: z.ZodString;
        timestamp: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        timestamp: number;
        task: string;
        provider: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio";
    }, {
        timestamp: number;
        task: string;
        provider: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio";
    }>>;
    taskOverrides: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodEnum<["auto", "local", "cloud", "ask"]>, z.ZodString]>>>;
    updatedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    updatedAt: number;
    mode: "auto" | "ask-every-time" | "default-local" | "default-cloud" | "specific-provider";
    rememberLastChoice: boolean;
    preferredProvider?: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio" | undefined;
    preferredModel?: string | undefined;
    lastUsedProvider?: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio" | undefined;
    lastUsedProviders?: Record<string, "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio"> | undefined;
    lastManualChoice?: {
        timestamp: number;
        task: string;
        provider: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio";
    } | undefined;
    taskOverrides?: Record<string, string> | undefined;
}, {
    updatedAt: number;
    mode: "auto" | "ask-every-time" | "default-local" | "default-cloud" | "specific-provider";
    preferredProvider?: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio" | undefined;
    preferredModel?: string | undefined;
    rememberLastChoice?: boolean | undefined;
    lastUsedProvider?: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio" | undefined;
    lastUsedProviders?: Record<string, "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio"> | undefined;
    lastManualChoice?: {
        timestamp: number;
        task: string;
        provider: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio";
    } | undefined;
    taskOverrides?: Record<string, string> | undefined;
}>;
export type GlobalRoutingPreferences = z.infer<typeof GlobalRoutingPreferencesSchema>;
/**
 * Usage record for telemetry
 */
export declare const UsageRecordSchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodNumber;
    origin: z.ZodString;
    provider: z.ZodEnum<["openai", "anthropic", "google", "mistral", "groq", "cohere", "deepseek", "together", "fireworks", "perplexity", "xai", "cerebras", "openrouter", "ollama", "lmstudio"]>;
    model: z.ZodString;
    task: z.ZodEnum<["ask", "stream", "embed", "classify", "extract", "chat"]>;
    tokens: z.ZodObject<{
        input: z.ZodNumber;
        output: z.ZodNumber;
        total: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        input: number;
        output: number;
        total: number;
    }, {
        input: number;
        output: number;
        total: number;
    }>;
    costUSD: z.ZodNumber;
    status: z.ZodEnum<["success", "error", "aborted"]>;
    latencyMs: z.ZodNumber;
    errorCode: z.ZodOptional<z.ZodNativeEnum<typeof ErrorCode>>;
}, "strip", z.ZodTypeAny, {
    status: "aborted" | "error" | "success";
    timestamp: number;
    task: "ask" | "stream" | "embed" | "classify" | "extract" | "chat";
    model: string;
    provider: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio";
    costUSD: number;
    latencyMs: number;
    tokens: {
        input: number;
        output: number;
        total: number;
    };
    origin: string;
    id: string;
    errorCode?: ErrorCode | undefined;
}, {
    status: "aborted" | "error" | "success";
    timestamp: number;
    task: "ask" | "stream" | "embed" | "classify" | "extract" | "chat";
    model: string;
    provider: "openai" | "anthropic" | "google" | "mistral" | "groq" | "cohere" | "deepseek" | "together" | "fireworks" | "perplexity" | "xai" | "cerebras" | "openrouter" | "ollama" | "lmstudio";
    costUSD: number;
    latencyMs: number;
    tokens: {
        input: number;
        output: number;
        total: number;
    };
    origin: string;
    id: string;
    errorCode?: ErrorCode | undefined;
}>;
export type UsageRecord = z.infer<typeof UsageRecordSchema>;
//# sourceMappingURL=schemas.d.ts.map