import { getClient, type ByomClient } from './client.js';
import {
  type AskRequest,
  type AskResponse,
  type EmbedRequest,
  type EmbedResponse,
  ErrorCode,
  ByomError,
  ExtensionNotInstalledError,
} from './protocol.js';

export type ByomMode = 'byom' | 'fallback' | 'unavailable';

export type ByomFallbackHandler<TRequest, TResult> = (
  request: TRequest,
  signal?: AbortSignal
) => Promise<TResult>;

const FALLBACK_ERROR_CODES = new Set<ErrorCode>([
  ErrorCode.EXTENSION_NOT_INSTALLED,
  ErrorCode.EXTENSION_DISABLED,
  ErrorCode.PROTOCOL_VERSION_MISMATCH,
]);

function shouldFallback(error: unknown, allowProtocolMismatch: boolean): boolean {
  if (!(error instanceof ByomError)) {
    return false;
  }
  if (error.code === ErrorCode.PROTOCOL_VERSION_MISMATCH) {
    return allowProtocolMismatch;
  }
  return FALLBACK_ERROR_CODES.has(error.code);
}

/**
 * Detect whether BYOM extension bridge is reachable.
 */
export async function detectByomMode(timeoutMs = 1000): Promise<ByomMode> {
  const client = getClient();
  const available = await client.isAvailable(timeoutMs);
  return available ? 'byom' : 'unavailable';
}

export interface RunWithByomFallbackOptions {
  preferByom?: boolean;
  fallbackOnProtocolMismatch?: boolean;
  signal?: AbortSignal;
  onModeSelected?: (mode: 'byom' | 'fallback') => void;
}

/**
 * Run an ask task via BYOM, falling back to the provided handler when the extension is unavailable.
 */
export async function runWithByomFallback(
  request: AskRequest,
  fallback: ByomFallbackHandler<AskRequest, AskResponse>,
  options: RunWithByomFallbackOptions = {}
): Promise<AskResponse> {
  const client = getClient();
  const preferByom = options.preferByom !== false;

  if (!preferByom) {
    options.onModeSelected?.('fallback');
    return fallback(request, options.signal);
  }

  try {
    const result = await client.ask(request, options.signal);
    options.onModeSelected?.('byom');
    return result;
  } catch (error) {
    if (shouldFallback(error, options.fallbackOnProtocolMismatch ?? true)) {
      options.onModeSelected?.('fallback');
      return fallback(request, options.signal);
    }
    throw error;
  }
}

export interface CreateByomWithFallbackOptions {
  client?: ByomClient;
  preferByom?: boolean;
  fallbackOnProtocolMismatch?: boolean;
  onModeSelected?: (mode: 'byom' | 'fallback') => void;
  askFallback?: ByomFallbackHandler<AskRequest, AskResponse>;
  embedFallback?: ByomFallbackHandler<EmbedRequest, EmbedResponse>;
}

export interface ByomWithFallback {
  isAvailable: (timeoutMs?: number) => Promise<boolean>;
  ask: (request: AskRequest, signal?: AbortSignal) => Promise<AskResponse>;
  embed: (request: EmbedRequest, signal?: AbortSignal) => Promise<EmbedResponse>;
}

/**
 * Create a small facade that prefers BYOM and delegates to site-provided fallbacks.
 */
export function createByomWithFallback(
  options: CreateByomWithFallbackOptions
): ByomWithFallback {
  const client = options.client ?? getClient();

  async function withFallback<TReq, TRes>(
    runByom: () => Promise<TRes>,
    fallback?: ByomFallbackHandler<TReq, TRes>,
    req?: TReq,
    signal?: AbortSignal
  ): Promise<TRes> {
    if (!fallback) {
      return runByom();
    }

    const preferByom = options.preferByom !== false;
    if (!preferByom) {
      options.onModeSelected?.('fallback');
      return fallback(req as TReq, signal);
    }

    try {
      const result = await runByom();
      options.onModeSelected?.('byom');
      return result;
    } catch (error) {
      if (shouldFallback(error, options.fallbackOnProtocolMismatch ?? true)) {
        options.onModeSelected?.('fallback');
        return fallback(req as TReq, signal);
      }
      throw error;
    }
  }

  return {
    isAvailable: (timeoutMs) => client.isAvailable(timeoutMs),
    ask: (request, signal) =>
      withFallback(
        () => client.ask(request, signal),
        options.askFallback,
        request,
        signal
      ),
    embed: (request, signal) =>
      withFallback(
        () => client.embed(request, signal),
        options.embedFallback,
        request,
        signal
      ),
  };
}

export { ExtensionNotInstalledError };
