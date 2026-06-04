import { createCompatibleProvider, testCompatibleConnection } from './compatible';
import { assertConnectionSuccess } from './test-utils';

const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1';

export function createDeepSeekProvider(options: { apiKey: string; baseURL?: string }) {
  return createCompatibleProvider({
    name: 'deepseek',
    apiKey: options.apiKey,
    baseURL: options.baseURL || DEFAULT_BASE_URL,
  });
}

export async function testDeepSeekConnection(apiKey: string, baseURL?: string): Promise<void> {
  const result = await testCompatibleConnection({
    apiKey,
    baseURL: baseURL || DEFAULT_BASE_URL,
  });
  assertConnectionSuccess(result);
}
