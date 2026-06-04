import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export interface CompatibleProviderOptions {
  name: string;
  apiKey?: string;
  baseURL: string;
  headers?: Record<string, string>;
}

/**
 * Create an OpenAI-compatible provider adapter
 */
export function createCompatibleProvider(options: CompatibleProviderOptions) {
  const headers: Record<string, string> = { ...options.headers };

  if (options.apiKey) {
    headers.Authorization = `Bearer ${options.apiKey}`;
  }

  return createOpenAICompatible({
    name: options.name,
    baseURL: options.baseURL,
    headers,
  });
}

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  models?: string[];
}

/**
 * Test an OpenAI-compatible provider by listing models
 */
export async function testCompatibleConnection(options: {
  apiKey?: string;
  baseURL: string;
  headers?: Record<string, string>;
  modelsPath?: string;
}): Promise<ConnectionTestResult> {
  const url = `${options.baseURL.replace(/\/$/, '')}${options.modelsPath ?? '/models'}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  };

  if (options.apiKey) {
    headers.Authorization = `Bearer ${options.apiKey}`;
  }

  try {
    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    const models = Array.isArray(data.data)
      ? data.data.map((model: { id?: string; name?: string }) => model.id || model.name).filter(Boolean)
      : Array.isArray(data.models)
        ? data.models.map((model: { id?: string; name?: string }) => model.id || model.name).filter(Boolean)
        : [];

    return { success: true, models };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection test failed',
    };
  }
}
