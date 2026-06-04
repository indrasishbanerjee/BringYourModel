import { createCompatibleProvider, testCompatibleConnection } from './compatible';
import { assertConnectionSuccess } from './test-utils';

const DEFAULT_BASE_URL = 'https://api.x.ai/v1';

export function createXaiProvider(options: { apiKey: string; baseURL?: string }) {
  return createCompatibleProvider({
    name: 'xai',
    apiKey: options.apiKey,
    baseURL: options.baseURL || DEFAULT_BASE_URL,
  });
}

export async function testXaiConnection(apiKey: string, baseURL?: string): Promise<void> {
  const result = await testCompatibleConnection({
    apiKey,
    baseURL: baseURL || DEFAULT_BASE_URL,
  });
  assertConnectionSuccess(result);
}
