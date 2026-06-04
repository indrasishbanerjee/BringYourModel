import { getClient, destroyClient, ChatSession, ByomClient, type ByomClientConfig } from './client.js';
import { destroyBridge } from './bridge.js';
import {
  type AskRequest,
  type AskResponse,
  type EmbedRequest,
  type EmbedResponse,
  type ExtractRequest,
  type ChatRequest,
  type ChatResponse,
  type Message,
  type StreamChunk,
  type StreamFinish,
  type ClassifyResponse,
  type ExtractResponse,
  type Capabilities,
  type ProviderId,
  type TaskType,
  type ByomEventType,
  type ByomEventPayload,
  ErrorCode,
  ByomError,
  ExtensionNotInstalledError,
  PermissionDeniedError,
  BudgetExceededError,
  ProviderUnavailableError,
  deserializeByomError,
} from './protocol.js';

export type {
  AskRequest,
  AskResponse,
  EmbedRequest,
  EmbedResponse,
  ExtractRequest,
  ChatRequest,
  ChatResponse,
  Message,
  StreamChunk,
  StreamFinish,
  ClassifyResponse,
  ExtractResponse,
  Capabilities,
  ProviderId,
  TaskType,
  ByomEventType,
  ByomEventPayload,
  ByomClientConfig,
};

export {
  ErrorCode,
  ByomError,
  ExtensionNotInstalledError,
  PermissionDeniedError,
  BudgetExceededError,
  ProviderUnavailableError,
  deserializeByomError,
  ChatSession,
  ByomClient,
  getClient,
};

/**
 * Check whether the Bring Your Model extension bridge responds.
 */
async function isAvailable(opts?: { timeoutMs?: number }): Promise<boolean> {
  const client = getClient();
  return client.isAvailable(opts?.timeoutMs ?? 1000);
}

/**
 * Single-shot text generation.
 * @throws {ExtensionNotInstalledError} Extension not installed
 * @throws {PermissionDeniedError} Site not approved
 * @throws {BudgetExceededError} Budget exceeded
 * @throws {ProviderUnavailableError} No provider available
 * @throws {ByomError} Other errors
 */
async function ask(request: AskRequest, signal?: AbortSignal): Promise<AskResponse> {
  const client = getClient();
  return client.ask(request, signal);
}

/**
 * Streaming text generation.
 * @throws {ExtensionNotInstalledError} Extension not installed
 * @throws {PermissionDeniedError} Site not approved
 * @throws {BudgetExceededError} Budget exceeded
 * @throws {ProviderUnavailableError} No provider available
 * @throws {ByomError} Other errors
 */
async function* stream(
  request: AskRequest,
  signal?: AbortSignal
): AsyncGenerator<StreamChunk, StreamFinish> {
  const client = getClient();
  const finish = yield* client.stream(request, signal);
  return finish;
}

/**
 * Generate an embedding vector for text.
 * @throws {ByomError} On validation or provider errors
 */
async function embed(request: EmbedRequest, signal?: AbortSignal): Promise<EmbedResponse> {
  const client = getClient();
  return client.embed(request, signal);
}

/**
 * Classify text into one of the provided categories.
 * @throws {ByomError} On validation or provider errors
 */
async function classify(
  input: string,
  categories: string[],
  options?: { model?: string; signal?: AbortSignal }
): Promise<ClassifyResponse> {
  const client = getClient();
  return client.classify(input, categories, options);
}

/**
 * Extract structured data using a JSON Schema object.
 * @throws {ByomError} On validation or provider errors
 */
async function extract<T>(request: ExtractRequest, signal?: AbortSignal): Promise<T> {
  const client = getClient();
  return client.extract<T>(request, signal);
}

/**
 * Start a multi-turn chat session with local history.
 */
function chat(options?: {
  sessionId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemMessage?: string;
}): ChatSession {
  const client = getClient();
  return client.chat(options);
}

/**
 * Subscribe to extension events (vault-locked, budget-warning, etc.).
 * @returns Unsubscribe function
 */
function on(
  event: ByomEventType,
  callback: (payload: ByomEventPayload) => void
): () => void {
  const client = getClient();
  return client.on(event, callback);
}

/** Query extension version, supported tasks, and grant/vault status */
async function getCapabilities(timeoutMs = 2000): Promise<Capabilities | null> {
  const client = getClient();
  return client.getCapabilities(timeoutMs);
}

/**
 * Tear down global bridge and client instances.
 * Intended for tests and SPA teardown — not required for normal page usage.
 */
function destroy(): void {
  destroyBridge();
  destroyClient();
}

/** Main BYOM SDK API */
export const byom = {
  isAvailable,
  ask,
  stream,
  embed,
  classify,
  extract,
  chat,
  on,
  getCapabilities,
  destroy,
};

export default byom;

if (typeof window !== 'undefined') {
  (window as unknown as { byom: typeof byom }).byom = byom;
}
