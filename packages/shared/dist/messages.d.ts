import { z } from 'zod';
/**
 * CustomEvent names for page <-> content script communication
 */
export declare const EventNames: {
    readonly REQUEST: "byom:request";
    readonly ABORT: "byom:abort";
    readonly PING: "byom:ping";
    readonly RESPONSE: "byom:response";
    readonly DELTA: "byom:delta";
    readonly FINISH: "byom:finish";
    readonly ERROR: "byom:error";
    readonly PONG: "byom:pong";
    readonly EVENT: "byom:event";
};
/**
 * Ping payload for availability check
 */
export declare const PingPayloadSchema: z.ZodObject<{
    protocolVersion: z.ZodString;
    /** When true, pong includes extension capabilities */
    includeCapabilities: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    protocolVersion: string;
    includeCapabilities?: boolean | undefined;
}, {
    protocolVersion: string;
    includeCapabilities?: boolean | undefined;
}>;
export type PingPayload = z.infer<typeof PingPayloadSchema>;
/**
 * Pong payload for availability response
 */
export declare const PongPayloadSchema: z.ZodObject<{
    protocolVersion: z.ZodString;
    extensionVersion: z.ZodString;
    capabilities: z.ZodOptional<z.ZodObject<{
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
    }>>;
}, "strip", z.ZodTypeAny, {
    protocolVersion: string;
    extensionVersion: string;
    capabilities?: {
        extensionVersion: string;
        supportedTasks: ("ask" | "stream" | "embed" | "classify" | "extract" | "chat")[];
        siteApproved: boolean;
        vaultUnlocked: boolean;
    } | undefined;
}, {
    protocolVersion: string;
    extensionVersion: string;
    capabilities?: {
        extensionVersion: string;
        supportedTasks: ("ask" | "stream" | "embed" | "classify" | "extract" | "chat")[];
        siteApproved: boolean;
        vaultUnlocked: boolean;
    } | undefined;
}>;
export type PongPayload = z.infer<typeof PongPayloadSchema>;
/**
 * Request payload wrappers by task type
 */
export declare const RequestPayloads: {
    readonly ask: z.ZodEffects<z.ZodObject<{
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
    readonly stream: z.ZodEffects<z.ZodObject<{
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
    readonly embed: z.ZodObject<{
        input: z.ZodString;
        model: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        input: string;
        model?: string | undefined;
    }, {
        input: string;
        model?: string | undefined;
    }>;
    readonly classify: z.ZodObject<{
        input: z.ZodString;
        categories: z.ZodArray<z.ZodString, "many">;
        model: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        input: string;
        categories: string[];
        model?: string | undefined;
    }, {
        input: string;
        categories: string[];
        model?: string | undefined;
    }>;
    readonly extract: z.ZodObject<{
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
    readonly chat: z.ZodObject<{
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
};
/**
 * Response payload wrappers by task type
 */
export declare const ResponsePayloads: {
    readonly ask: z.ZodObject<{
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
    readonly stream: z.ZodUnion<[z.ZodObject<{
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
    }>, z.ZodObject<{
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
    }>]>;
    readonly embed: z.ZodObject<{
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
    readonly classify: z.ZodObject<{
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
    readonly extract: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    readonly chat: z.ZodObject<{
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
};
/**
 * Full request message structure
 */
export declare const BridgeRequestSchema: z.ZodObject<{
    reqId: z.ZodString;
    origin: z.ZodString;
    protocolVersion: z.ZodString;
    nonce: z.ZodString;
    timestamp: z.ZodNumber;
    task: z.ZodEnum<["ask", "stream", "embed", "classify", "extract", "chat"]>;
    payload: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    reqId: string;
    timestamp: number;
    protocolVersion: string;
    nonce: string;
    task: "ask" | "stream" | "embed" | "classify" | "extract" | "chat";
    origin: string;
    payload?: unknown;
}, {
    reqId: string;
    timestamp: number;
    protocolVersion: string;
    nonce: string;
    task: "ask" | "stream" | "embed" | "classify" | "extract" | "chat";
    origin: string;
    payload?: unknown;
}>;
export type BridgeRequest = z.infer<typeof BridgeRequestSchema>;
/**
 * Full response message structure
 */
export declare const BridgeResponseSchema: z.ZodObject<{
    reqId: z.ZodString;
    kind: z.ZodEnum<["response", "delta", "error", "finish"]>;
    timestamp: z.ZodNumber;
    payload: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    kind: "response" | "delta" | "error" | "finish";
    reqId: string;
    timestamp: number;
    payload?: unknown;
}, {
    kind: "response" | "delta" | "error" | "finish";
    reqId: string;
    timestamp: number;
    payload?: unknown;
}>;
export type BridgeResponse = z.infer<typeof BridgeResponseSchema>;
/**
 * Port message format for chrome.runtime messaging
 */
export declare const PortMessageSchema: z.ZodObject<{
    type: z.ZodEnum<["request", "response", "delta", "error", "finish", "abort", "heartbeat", "heartbeat-ack", "event", "capabilities-query", "capabilities-response"]>;
    reqId: z.ZodOptional<z.ZodString>;
    origin: z.ZodOptional<z.ZodString>;
    /** Event name when type is 'event' */
    event: z.ZodOptional<z.ZodString>;
    payload: z.ZodOptional<z.ZodUnknown>;
    timestamp: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "request" | "response" | "delta" | "error" | "finish" | "event" | "abort" | "heartbeat" | "heartbeat-ack" | "capabilities-query" | "capabilities-response";
    reqId?: string | undefined;
    timestamp?: number | undefined;
    payload?: unknown;
    event?: string | undefined;
    origin?: string | undefined;
}, {
    type: "request" | "response" | "delta" | "error" | "finish" | "event" | "abort" | "heartbeat" | "heartbeat-ack" | "capabilities-query" | "capabilities-response";
    reqId?: string | undefined;
    timestamp?: number | undefined;
    payload?: unknown;
    event?: string | undefined;
    origin?: string | undefined;
}>;
export type PortMessage = z.infer<typeof PortMessageSchema>;
export { ByomEventPayloadSchema, type ByomEventPayload } from './schemas.js';
/**
 * Generate a cryptographically secure nonce
 */
export declare function generateNonce(): string;
/**
 * Generate a request ID
 */
export declare function generateRequestId(): string;
/**
 * Generate a chat session ID
 */
export declare function generateSessionId(): string;
/**
 * Validate and parse a bridge request
 */
export declare function parseBridgeRequest(data: unknown): {
    success: true;
    data: BridgeRequest;
} | {
    success: false;
    error: string;
};
/**
 * Create a bridge request
 */
export declare function createBridgeRequest(task: string, payload: unknown, origin: string, protocolVersion: string): BridgeRequest;
//# sourceMappingURL=messages.d.ts.map