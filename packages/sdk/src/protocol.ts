/**
 * BYOM wire protocol types and validators for the browser SDK.
 *
 * Keep in sync with `packages/shared/src/schemas.ts` and `packages/shared/src/errors.ts`.
 */

export const PROTOCOL_VERSION = '1.0.0' as const;

/** Keep in sync with packages/shared/src/schemas.ts ProviderIdSchema */
export type ProviderId =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'mistral'
  | 'groq'
  | 'cohere'
  | 'deepseek'
  | 'together'
  | 'fireworks'
  | 'perplexity'
  | 'xai'
  | 'cerebras'
  | 'openrouter'
  | 'ollama'
  | 'lmstudio';

/** Supported AI task types sent to the extension */
export type TaskType = 'ask' | 'stream' | 'embed' | 'classify' | 'extract' | 'chat';

/** A single chat message in a conversation */
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Request payload for single-shot text generation (`ask` / `stream`) */
export interface AskRequest {
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
export interface AskResponse {
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
export interface StreamChunk {
  text: string;
  isComplete: boolean;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

/** Final metadata emitted when a stream completes */
export interface StreamFinish {
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
export interface EmbedRequest {
  input: string;
  model?: string;
}

/** Response from an `embed` request */
export interface EmbedResponse {
  embedding: number[];
  model: string;
  provider: ProviderId;
  usage: {
    tokens: number;
  };
}

/** Response from a `classify` request */
export interface ClassifyResponse {
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
export type ExtractResponse = Record<string, unknown>;

/** Request payload for structured extraction via JSON Schema */
export interface ExtractRequest {
  input: string;
  schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  model?: string;
}

/** Request payload for a single chat turn */
export interface ChatRequest {
  message: string;
  sessionId?: string;
  messages?: Message[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/** Response from a `chat` request */
export interface ChatResponse {
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
export interface Capabilities {
  extensionVersion: string;
  supportedTasks: TaskType[];
  siteApproved: boolean;
  vaultUnlocked: boolean;
}

/** Extension-pushed event types */
export type ByomEventType =
  | 'vault-locked'
  | 'budget-warning'
  | 'permission-needed'
  | 'request-complete';

/** Payload for extension-pushed events */
export interface ByomEventPayload {
  event: ByomEventType;
  origin?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

/** Internal wire request envelope (page → extension) */
export interface BridgeRequest {
  reqId: string;
  origin: string;
  protocolVersion: string;
  nonce: string;
  timestamp: number;
  task: TaskType;
  payload: unknown;
}

/** Internal wire response envelope (extension → page) */
export interface BridgeResponse {
  reqId: string;
  kind: 'response' | 'delta' | 'error' | 'finish';
  timestamp: number;
  payload: unknown;
}

/** Internal port message shape from the extension bridge */
export interface PortMessage {
  type:
    | 'request'
    | 'response'
    | 'delta'
    | 'error'
    | 'finish'
    | 'abort'
    | 'heartbeat'
    | 'heartbeat-ack'
    | 'event'
    | 'capabilities-query'
    | 'capabilities-response';
  reqId?: string;
  origin?: string;
  event?: string;
  payload?: unknown;
  timestamp?: number;
}

/** Keep in sync with packages/shared/src/errors.ts ErrorCode */
export enum ErrorCode {
  EXTENSION_NOT_INSTALLED = 'EXTENSION_NOT_INSTALLED',
  EXTENSION_DISABLED = 'EXTENSION_DISABLED',
  PROTOCOL_VERSION_MISMATCH = 'PROTOCOL_VERSION_MISMATCH',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SITE_NOT_APPROVED = 'SITE_NOT_APPROVED',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',
  RATE_LIMITED = 'RATE_LIMITED',
  TASK_NOT_ALLOWED = 'TASK_NOT_ALLOWED',
  MODEL_NOT_ALLOWED = 'MODEL_NOT_ALLOWED',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  INVALID_API_KEY = 'INVALID_API_KEY',
  QUOTA_EXHAUSTED = 'QUOTA_EXHAUSTED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  SCHEMA_VALIDATION_FAILED = 'SCHEMA_VALIDATION_FAILED',
  TIMEOUT = 'TIMEOUT',
  ABORTED = 'ABORTED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VAULT_LOCKED = 'VAULT_LOCKED',
}

/** Serializable error structure for wire transfer */
export interface SerializedError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/** Base error class for BYOM SDK failures */
export class ByomError extends Error {
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ByomError';
    this.code = code;
    this.details = details;
  }

  toJSON(): SerializedError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }

  static fromJSON(data: SerializedError): ByomError {
    return new ByomError(data.code, data.message, data.details);
  }
}

/** Thrown when the Bring Your Model extension is not installed */
export class ExtensionNotInstalledError extends ByomError {
  constructor(message = 'Bring Your Model extension is not installed') {
    super(ErrorCode.EXTENSION_NOT_INSTALLED, message);
    this.name = 'ExtensionNotInstalledError';
  }
}

/** Thrown when the site lacks permission or user consent */
export class PermissionDeniedError extends ByomError {
  constructor(message = 'Permission denied', details?: { origin?: string; reason?: string }) {
    super(ErrorCode.PERMISSION_DENIED, message, details);
    this.name = 'PermissionDeniedError';
  }
}

/** Thrown when a grant budget limit is exceeded */
export class BudgetExceededError extends ByomError {
  constructor(
    message = 'Budget exceeded',
    details?: { budgetType?: string; current?: number; limit?: number }
  ) {
    super(ErrorCode.BUDGET_EXCEEDED, message, details);
    this.name = 'BudgetExceededError';
  }
}

/** Thrown when no provider is available for the requested task */
export class ProviderUnavailableError extends ByomError {
  constructor(message = 'Provider unavailable', details?: { provider?: string; reason?: string }) {
    super(ErrorCode.PROVIDER_UNAVAILABLE, message, details);
    this.name = 'ProviderUnavailableError';
  }
}

/** CustomEvent names for page ↔ extension communication */
export const EventNames = {
  REQUEST: 'byom:request',
  ABORT: 'byom:abort',
  PING: 'byom:ping',
  RESPONSE: 'byom:response',
  DELTA: 'byom:delta',
  FINISH: 'byom:finish',
  ERROR: 'byom:error',
  PONG: 'byom:pong',
  EVENT: 'byom:event',
} as const;

const MAX_ASK_INPUT_LENGTH = 100_000;
const MAX_EMBED_INPUT_LENGTH = 10_000;

function assertMessage(message: unknown): Message {
  if (!message || typeof message !== 'object') {
    throw new ByomError(ErrorCode.INVALID_REQUEST, 'Message must be an object');
  }
  const record = message as Record<string, unknown>;
  if (
    record.role !== 'system' &&
    record.role !== 'user' &&
    record.role !== 'assistant'
  ) {
    throw new ByomError(ErrorCode.INVALID_REQUEST, 'Message role must be system, user, or assistant');
  }
  if (typeof record.content !== 'string') {
    throw new ByomError(ErrorCode.INVALID_REQUEST, 'Message content must be a string');
  }
  return { role: record.role, content: record.content };
}

function assertOptionalNumber(
  value: unknown,
  field: string,
  min: number,
  max?: number
): void {
  if (value === undefined) return;
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ByomError(ErrorCode.INVALID_REQUEST, `${field} must be a number`);
  }
  if (value < min || (max !== undefined && value > max)) {
    throw new ByomError(ErrorCode.INVALID_REQUEST, `${field} is out of range`);
  }
}

function assertAskRequest(request: AskRequest): AskRequest {
  if (!request || typeof request !== 'object') {
    throw new ByomError(ErrorCode.INVALID_REQUEST, 'Ask request must be an object');
  }
  if (request.input === undefined && request.messages === undefined) {
    throw new ByomError(ErrorCode.INVALID_REQUEST, 'Either input or messages must be provided');
  }
  if (request.input !== undefined) {
    if (typeof request.input !== 'string') {
      throw new ByomError(ErrorCode.INVALID_REQUEST, 'input must be a string');
    }
    if (request.input.length > MAX_ASK_INPUT_LENGTH) {
      throw new ByomError(ErrorCode.INVALID_REQUEST, `input exceeds ${MAX_ASK_INPUT_LENGTH} characters`);
    }
  }
  if (request.messages !== undefined) {
    if (!Array.isArray(request.messages) || request.messages.length === 0) {
      throw new ByomError(ErrorCode.INVALID_REQUEST, 'messages must be a non-empty array');
    }
    request.messages.forEach(assertMessage);
  }
  if (
    request.task !== undefined &&
    request.task !== 'summarize' &&
    request.task !== 'draft' &&
    request.task !== 'chat'
  ) {
    throw new ByomError(ErrorCode.INVALID_REQUEST, 'task must be summarize, draft, or chat');
  }
  assertOptionalNumber(request.temperature, 'temperature', 0, 2);
  if (request.maxTokens !== undefined) {
    if (typeof request.maxTokens !== 'number' || request.maxTokens <= 0) {
      throw new ByomError(ErrorCode.INVALID_REQUEST, 'maxTokens must be a positive number');
    }
  }
  return request;
}

function assertEmbedRequest(request: EmbedRequest): EmbedRequest {
  if (!request || typeof request !== 'object') {
    throw new ByomError(ErrorCode.INVALID_REQUEST, 'Embed request must be an object');
  }
  if (typeof request.input !== 'string' || request.input.length === 0) {
    throw new ByomError(ErrorCode.INVALID_REQUEST, 'input must be a non-empty string');
  }
  if (request.input.length > MAX_EMBED_INPUT_LENGTH) {
    throw new ByomError(ErrorCode.INVALID_REQUEST, `input exceeds ${MAX_EMBED_INPUT_LENGTH} characters`);
  }
  return request;
}

function assertClassifyPayload(payload: {
  input: string;
  categories: string[];
  model?: string;
}): typeof payload {
  if (!payload || typeof payload !== 'object') {
    throw new ByomError(ErrorCode.INVALID_REQUEST, 'Classify request must be an object');
  }
  if (typeof payload.input !== 'string' || payload.input.length === 0) {
    throw new ByomError(ErrorCode.INVALID_REQUEST, 'input must be a non-empty string');
  }
  if (!Array.isArray(payload.categories) || payload.categories.length === 0) {
    throw new ByomError(ErrorCode.INVALID_REQUEST, 'categories must be a non-empty array');
  }
  for (const category of payload.categories) {
    if (typeof category !== 'string' || category.length === 0) {
      throw new ByomError(ErrorCode.INVALID_REQUEST, 'each category must be a non-empty string');
    }
  }
  return payload;
}

function assertExtractRequest(request: ExtractRequest): ExtractRequest {
  if (!request || typeof request !== 'object') {
    throw new ByomError(ErrorCode.INVALID_REQUEST, 'Extract request must be an object');
  }
  if (typeof request.input !== 'string' || request.input.length === 0) {
    throw new ByomError(ErrorCode.INVALID_REQUEST, 'input must be a non-empty string');
  }
  if (!request.schema || typeof request.schema !== 'object') {
    throw new ByomError(ErrorCode.INVALID_REQUEST, 'schema must be an object');
  }
  if (request.schema.type !== 'object') {
    throw new ByomError(ErrorCode.INVALID_REQUEST, 'schema.type must be "object"');
  }
  if (
    !request.schema.properties ||
    typeof request.schema.properties !== 'object' ||
    Array.isArray(request.schema.properties)
  ) {
    throw new ByomError(ErrorCode.INVALID_REQUEST, 'schema.properties must be an object');
  }
  return request;
}

function assertChatRequest(request: ChatRequest): ChatRequest {
  if (!request || typeof request !== 'object') {
    throw new ByomError(ErrorCode.INVALID_REQUEST, 'Chat request must be an object');
  }
  if (typeof request.message !== 'string' || request.message.length === 0) {
    throw new ByomError(ErrorCode.INVALID_REQUEST, 'message must be a non-empty string');
  }
  if (request.messages !== undefined) {
    if (!Array.isArray(request.messages)) {
      throw new ByomError(ErrorCode.INVALID_REQUEST, 'messages must be an array');
    }
    request.messages.forEach(assertMessage);
  }
  assertOptionalNumber(request.temperature, 'temperature', 0, 2);
  if (request.maxTokens !== undefined) {
    if (typeof request.maxTokens !== 'number' || request.maxTokens <= 0) {
      throw new ByomError(ErrorCode.INVALID_REQUEST, 'maxTokens must be a positive number');
    }
  }
  return request;
}

/** Lightweight request validators (mirrors @byom/shared Zod schemas without a runtime dependency) */
export const RequestPayloads = {
  ask: { parse: assertAskRequest },
  stream: { parse: assertAskRequest },
  embed: { parse: assertEmbedRequest },
  classify: { parse: assertClassifyPayload },
  extract: { parse: assertExtractRequest },
  chat: { parse: assertChatRequest },
} as const;

/**
 * Map a wire error payload or generic ByomError to a typed SDK error subclass.
 */
export function deserializeByomError(payload: unknown): Error {
  const errorPayload = payload as {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };

  switch (errorPayload.code) {
    case ErrorCode.EXTENSION_NOT_INSTALLED:
    case ErrorCode.EXTENSION_DISABLED:
      return new ExtensionNotInstalledError(errorPayload.message);
    case ErrorCode.PERMISSION_DENIED:
    case ErrorCode.SITE_NOT_APPROVED:
      return new PermissionDeniedError(errorPayload.message, errorPayload.details);
    case ErrorCode.BUDGET_EXCEEDED:
      return new BudgetExceededError(errorPayload.message, errorPayload.details);
    case ErrorCode.PROVIDER_UNAVAILABLE:
      return new ProviderUnavailableError(errorPayload.message, errorPayload.details);
    default:
      return new ByomError(errorPayload.code, errorPayload.message, errorPayload.details);
  }
}

/** Generate a 16-byte hex nonce for replay protection */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Generate a unique request id */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Generate a unique chat session id */
export function generateSessionId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Build a bridge request envelope for the extension */
export function createBridgeRequest(
  task: string,
  payload: unknown,
  origin: string,
  protocolVersion: string
): BridgeRequest {
  return {
    reqId: generateRequestId(),
    origin,
    protocolVersion,
    nonce: generateNonce(),
    timestamp: Date.now(),
    task: task as TaskType,
    payload,
  };
}
