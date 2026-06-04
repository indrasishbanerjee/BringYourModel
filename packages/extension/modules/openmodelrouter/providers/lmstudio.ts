import { createCompatibleProvider, testCompatibleConnection } from './compatible';
import { assertConnectionSuccess } from './test-utils';

const DEFAULT_BASE_URL = 'http://localhost:1234/v1';

export function createLmStudioProvider(options: { baseURL?: string; apiKey?: string }) {
  return createCompatibleProvider({
    name: 'lmstudio',
    apiKey: options.apiKey,
    baseURL: options.baseURL || DEFAULT_BASE_URL,
  });
}

export async function testLmStudioConnection(baseURL?: string, apiKey?: string): Promise<void> {
  const result = await testCompatibleConnection({
    apiKey,
    baseURL: baseURL || DEFAULT_BASE_URL,
  });
  assertConnectionSuccess(result);
}
