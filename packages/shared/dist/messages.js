import { z } from 'zod';
import { AskRequestSchema, AskResponseSchema, EmbedRequestSchema, EmbedResponseSchema, ClassifyResponseSchema, ExtractRequestSchema, ChatRequestSchema, ChatResponseSchema, StreamChunkSchema, StreamFinishSchema, TaskTypeSchema, CapabilitiesSchema, } from './schemas.js';
/**
 * CustomEvent names for page <-> content script communication
 */
export const EventNames = {
    // Page -> Content Script
    REQUEST: 'byom:request',
    ABORT: 'byom:abort',
    PING: 'byom:ping',
    // Content Script -> Page
    RESPONSE: 'byom:response',
    DELTA: 'byom:delta',
    FINISH: 'byom:finish',
    ERROR: 'byom:error',
    PONG: 'byom:pong',
    EVENT: 'byom:event',
};
/**
 * Ping payload for availability check
 */
export const PingPayloadSchema = z.object({
    protocolVersion: z.string(),
    /** When true, pong includes extension capabilities */
    includeCapabilities: z.boolean().optional(),
});
/**
 * Pong payload for availability response
 */
export const PongPayloadSchema = z.object({
    protocolVersion: z.string(),
    extensionVersion: z.string(),
    capabilities: CapabilitiesSchema.optional(),
});
/**
 * Request payload wrappers by task type
 */
export const RequestPayloads = {
    ask: AskRequestSchema,
    stream: AskRequestSchema, // Same as ask but streamed
    embed: EmbedRequestSchema,
    classify: z.object({
        input: z.string(),
        categories: z.array(z.string()),
        model: z.string().optional(),
    }),
    extract: ExtractRequestSchema,
    chat: ChatRequestSchema,
};
/**
 * Response payload wrappers by task type
 */
export const ResponsePayloads = {
    ask: AskResponseSchema,
    stream: z.union([StreamChunkSchema, StreamFinishSchema]),
    embed: EmbedResponseSchema,
    classify: ClassifyResponseSchema,
    extract: z.record(z.unknown()), // Dynamic based on schema
    chat: ChatResponseSchema,
};
/**
 * Full request message structure
 */
export const BridgeRequestSchema = z.object({
    reqId: z.string(),
    origin: z.string(),
    protocolVersion: z.string(),
    nonce: z.string(),
    timestamp: z.number(),
    task: TaskTypeSchema,
    payload: z.unknown(),
});
/**
 * Full response message structure
 */
export const BridgeResponseSchema = z.object({
    reqId: z.string(),
    kind: z.enum(['response', 'delta', 'error', 'finish']),
    timestamp: z.number(),
    payload: z.unknown(),
});
/**
 * Port message format for chrome.runtime messaging
 */
export const PortMessageSchema = z.object({
    type: z.enum([
        'request',
        'response',
        'delta',
        'error',
        'finish',
        'abort',
        'heartbeat',
        'heartbeat-ack',
        'event',
        'capabilities-query',
        'capabilities-response',
    ]),
    reqId: z.string().optional(),
    origin: z.string().optional(),
    /** Event name when type is 'event' */
    event: z.string().optional(),
    payload: z.unknown().optional(),
    timestamp: z.number().optional(),
});
export { ByomEventPayloadSchema } from './schemas.js';
/**
 * Generate a cryptographically secure nonce
 */
export function generateNonce() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
/**
 * Generate a request ID
 */
export function generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
/**
 * Generate a chat session ID
 */
export function generateSessionId() {
    return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
/**
 * Validate and parse a bridge request
 */
export function parseBridgeRequest(data) {
    const result = BridgeRequestSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error.message };
}
/**
 * Create a bridge request
 */
export function createBridgeRequest(task, payload, origin, protocolVersion) {
    return {
        reqId: generateRequestId(),
        origin,
        protocolVersion,
        nonce: generateNonce(),
        timestamp: Date.now(),
        task: task,
        payload,
    };
}
//# sourceMappingURL=messages.js.map