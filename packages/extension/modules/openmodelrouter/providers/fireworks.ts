import { createCompatibleProvider, testCompatibleConnection } from './compatible';
import { assertConnectionSuccess } from './test-utils';

const DEFAULT_BASE_URL = 'https://api.fireworks.ai/inference/v1';

export function createFireworksProvider(options: { apiKey: string; baseURL?: string }) {
  return createCompatibleProvider({
    name: 'fireworks',
    apiKey: options.apiKey,
    baseURL: options.baseURL || DEFAULT_BASE_URL,
  });
}

export async function testFireworksConnection(apiKey: string, baseURL?: string): Promise<void> {
  const result = await testCompatibleConnection({
    apiKey,
    baseURL: baseURL || DEFAULT_BASE_URL,
  });
  assertConnectionSuccess(result);
}
