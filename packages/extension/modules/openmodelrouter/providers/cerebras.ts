import { createCompatibleProvider, testCompatibleConnection } from './compatible';
import { assertConnectionSuccess } from './test-utils';

const DEFAULT_BASE_URL = 'https://api.cerebras.ai/v1';

export function createCerebrasProvider(options: { apiKey: string; baseURL?: string }) {
  return createCompatibleProvider({
    name: 'cerebras',
    apiKey: options.apiKey,
    baseURL: options.baseURL || DEFAULT_BASE_URL,
  });
}

export async function testCerebrasConnection(apiKey: string, baseURL?: string): Promise<void> {
  const result = await testCompatibleConnection({
    apiKey,
    baseURL: baseURL || DEFAULT_BASE_URL,
  });
  assertConnectionSuccess(result);
}
