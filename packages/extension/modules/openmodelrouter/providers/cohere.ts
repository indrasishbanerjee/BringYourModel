import { createCohere } from '@ai-sdk/cohere';
import { testModelsEndpoint, assertConnectionSuccess } from './test-utils';

export function createCohereProvider(options: { apiKey: string }) {
  return createCohere({ apiKey: options.apiKey });
}

export async function testCohereConnection(apiKey: string): Promise<void> {
  const result = await testModelsEndpoint({
    url: 'https://api.cohere.com/v1/models',
    headers: { Authorization: `Bearer ${apiKey}` },
    parseModels: (data) =>
      Array.isArray((data as { models?: Array<{ name?: string }> }).models)
        ? (data as { models: Array<{ name?: string }> }).models.map((model) => model.name).filter(Boolean) as string[]
        : [],
  });
  assertConnectionSuccess(result);
}
