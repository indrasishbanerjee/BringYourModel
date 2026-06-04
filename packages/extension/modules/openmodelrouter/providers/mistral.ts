import { createMistral } from '@ai-sdk/mistral';
import { testModelsEndpoint, assertConnectionSuccess } from './test-utils';

export function createMistralProvider(options: { apiKey: string }) {
  return createMistral({ apiKey: options.apiKey });
}

export async function testMistralConnection(apiKey: string): Promise<void> {
  const result = await testModelsEndpoint({
    url: 'https://api.mistral.ai/v1/models',
    headers: { Authorization: `Bearer ${apiKey}` },
    parseModels: (data) =>
      Array.isArray((data as { data?: Array<{ id?: string }> }).data)
        ? (data as { data: Array<{ id?: string }> }).data.map((model) => model.id).filter(Boolean) as string[]
        : [],
  });
  assertConnectionSuccess(result);
}
