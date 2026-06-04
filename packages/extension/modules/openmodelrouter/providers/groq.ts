import { createGroq } from '@ai-sdk/groq';
import { testModelsEndpoint, assertConnectionSuccess } from './test-utils';

export function createGroqProvider(options: { apiKey: string }) {
  return createGroq({ apiKey: options.apiKey });
}

export async function testGroqConnection(apiKey: string): Promise<void> {
  const result = await testModelsEndpoint({
    url: 'https://api.groq.com/openai/v1/models',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  assertConnectionSuccess(result);
}
