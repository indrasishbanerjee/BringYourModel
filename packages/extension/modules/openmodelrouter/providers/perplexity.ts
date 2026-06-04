import { createCompatibleProvider, testCompatibleConnection } from './compatible';
import { assertConnectionSuccess } from './test-utils';

const DEFAULT_BASE_URL = 'https://api.perplexity.ai';

export function createPerplexityProvider(options: { apiKey: string; baseURL?: string }) {
  return createCompatibleProvider({
    name: 'perplexity',
    apiKey: options.apiKey,
    baseURL: options.baseURL || DEFAULT_BASE_URL,
  });
}

export async function testPerplexityConnection(apiKey: string, baseURL?: string): Promise<void> {
  const result = await testCompatibleConnection({
    apiKey,
    baseURL: baseURL || DEFAULT_BASE_URL,
    modelsPath: '/models',
  });
  assertConnectionSuccess(result);
}
