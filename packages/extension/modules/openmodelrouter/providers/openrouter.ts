import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

/**
 * Create an OpenRouter provider instance
 */
export function createOpenRouterProvider(options: { apiKey: string; baseURL?: string }) {
  return createOpenAICompatible({
    name: 'openrouter',
    baseURL: options.baseURL || 'https://openrouter.ai/api/v1',
    headers: {
      'Authorization': `Bearer ${options.apiKey}`,
      'HTTP-Referer': 'https://bringyourmodel.com',
      'X-Title': 'Bring Your Model',
    },
  });
}

/**
 * Test OpenRouter connection and list available models
 */
export async function testOpenRouterConnection(apiKey: string): Promise<{
  success: boolean;
  error?: string;
  models?: { id: string; name: string; context_length: number; pricing: any }[];
}> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      models: data.data?.map((m: any) => ({
        id: m.id,
        name: m.name,
        context_length: m.context_length,
        pricing: m.pricing,
      })) || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to OpenRouter',
    };
  }
}

/**
 * Get model pricing from OpenRouter
 */
export async function getOpenRouterPricing(apiKey: string): Promise<{
  success: boolean;
  pricing?: Record<string, { prompt: number; completion: number }>;
  error?: string;
}> {
  const result = await testOpenRouterConnection(apiKey);
  
  if (!result.success || !result.models) {
    return { success: false, error: result.error };
  }

  const pricing: Record<string, { prompt: number; completion: number }> = {};
  
  for (const model of result.models) {
    pricing[model.id] = {
      prompt: model.pricing?.prompt || 0,
      completion: model.pricing?.completion || 0,
    };
  }

  return { success: true, pricing };
}