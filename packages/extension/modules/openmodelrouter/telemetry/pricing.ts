/**
 * Model pricing data (USD per 1K tokens)
 * Sources: OpenAI, Anthropic, Google pricing pages
 * Last updated: 2024
 */

export interface ModelPricing {
  inputPrice: number;   // USD per 1K input tokens
  outputPrice: number;  // USD per 1K output tokens
  currency: 'USD';
}

/**
 * Pricing table for known models
 * Prices are per 1K tokens in USD
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  'gpt-4o': { inputPrice: 0.005, outputPrice: 0.015, currency: 'USD' },
  'gpt-4o-mini': { inputPrice: 0.00015, outputPrice: 0.0006, currency: 'USD' },
  'gpt-4-turbo': { inputPrice: 0.01, outputPrice: 0.03, currency: 'USD' },
  'gpt-4': { inputPrice: 0.03, outputPrice: 0.06, currency: 'USD' },
  'gpt-3.5-turbo': { inputPrice: 0.0005, outputPrice: 0.0015, currency: 'USD' },
  'text-embedding-3-small': { inputPrice: 0.00002, outputPrice: 0, currency: 'USD' },
  'text-embedding-3-large': { inputPrice: 0.00013, outputPrice: 0, currency: 'USD' },
  'text-embedding-ada-002': { inputPrice: 0.0001, outputPrice: 0, currency: 'USD' },

  // Anthropic
  'claude-3-opus-20240229': { inputPrice: 0.015, outputPrice: 0.075, currency: 'USD' },
  'claude-3-sonnet-20240229': { inputPrice: 0.003, outputPrice: 0.015, currency: 'USD' },
  'claude-3-haiku-20240307': { inputPrice: 0.00025, outputPrice: 0.00125, currency: 'USD' },

  // Google
  'gemini-2.5-pro': { inputPrice: 0.0035, outputPrice: 0.0105, currency: 'USD' },
  'gemini-2.5-flash': { inputPrice: 0.00035, outputPrice: 0.00105, currency: 'USD' },
  'gemini-1.5-pro': { inputPrice: 0.0035, outputPrice: 0.0105, currency: 'USD' },
  'gemini-1.5-flash': { inputPrice: 0.00035, outputPrice: 0.00105, currency: 'USD' },
  'gemini-pro': { inputPrice: 0.0005, outputPrice: 0.0015, currency: 'USD' },
  'text-embedding-004': { inputPrice: 0.00002, outputPrice: 0, currency: 'USD' },

  // Mistral
  'mistral-large-latest': { inputPrice: 0.002, outputPrice: 0.006, currency: 'USD' },
  'mistral-small-latest': { inputPrice: 0.0002, outputPrice: 0.0006, currency: 'USD' },
  'codestral-latest': { inputPrice: 0.0003, outputPrice: 0.0009, currency: 'USD' },

  // Groq
  'llama-3.3-70b-versatile': { inputPrice: 0.00059, outputPrice: 0.00079, currency: 'USD' },
  'mixtral-8x7b-32768': { inputPrice: 0.00024, outputPrice: 0.00024, currency: 'USD' },
  'gemma2-9b-it': { inputPrice: 0.0002, outputPrice: 0.0002, currency: 'USD' },

  // Cohere
  'command-r-plus': { inputPrice: 0.003, outputPrice: 0.015, currency: 'USD' },
  'command-r': { inputPrice: 0.0005, outputPrice: 0.0015, currency: 'USD' },
  'command-light': { inputPrice: 0.0003, outputPrice: 0.0006, currency: 'USD' },
  'embed-english-v3.0': { inputPrice: 0.0001, outputPrice: 0, currency: 'USD' },

  // DeepSeek
  'deepseek-chat': { inputPrice: 0.00014, outputPrice: 0.00028, currency: 'USD' },
  'deepseek-reasoner': { inputPrice: 0.00055, outputPrice: 0.00219, currency: 'USD' },

  // Together AI
  'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo': { inputPrice: 0.00018, outputPrice: 0.00018, currency: 'USD' },
  'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo': { inputPrice: 0.00088, outputPrice: 0.00088, currency: 'USD' },

  // Fireworks
  'accounts/fireworks/models/llama-v3p1-70b-instruct': { inputPrice: 0.0009, outputPrice: 0.0009, currency: 'USD' },

  // Perplexity
  'sonar-pro': { inputPrice: 0.003, outputPrice: 0.015, currency: 'USD' },
  'sonar': { inputPrice: 0.001, outputPrice: 0.001, currency: 'USD' },
  'sonar-reasoning': { inputPrice: 0.001, outputPrice: 0.005, currency: 'USD' },

  // xAI
  'grok-3': { inputPrice: 0.003, outputPrice: 0.015, currency: 'USD' },
  'grok-3-fast': { inputPrice: 0.0005, outputPrice: 0.0025, currency: 'USD' },
  'grok-2-1212': { inputPrice: 0.002, outputPrice: 0.01, currency: 'USD' },

  // Cerebras
  'llama3.1-70b': { inputPrice: 0.0006, outputPrice: 0.0006, currency: 'USD' },
  'llama3.1-8b': { inputPrice: 0.0001, outputPrice: 0.0001, currency: 'USD' },

  // Default fallback (cheap estimate)
  'default': { inputPrice: 0.001, outputPrice: 0.003, currency: 'USD' },
};

/**
 * Get pricing for a model
 */
export function getModelPricing(modelId: string): ModelPricing {
  // Try exact match
  if (MODEL_PRICING[modelId]) {
    return MODEL_PRICING[modelId];
  }

  // Try matching by prefix (e.g., "gpt-4o-2024-08-06" matches "gpt-4o")
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (modelId.startsWith(key)) {
      return pricing;
    }
  }

  // Fallback to default
  return MODEL_PRICING['default'];
}

/**
 * Calculate cost for a request
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  modelId: string
): number {
  const pricing = getModelPricing(modelId);
  const inputCost = (inputTokens / 1000) * pricing.inputPrice;
  const outputCost = (outputTokens / 1000) * pricing.outputPrice;
  return inputCost + outputCost;
}

/**
 * Calculate embedding cost
 */
export function calculateEmbeddingCost(tokens: number, modelId: string): number {
  const pricing = getModelPricing(modelId);
  return (tokens / 1000) * pricing.inputPrice;
}

/**
 * Estimate tokens from text
 * Uses simple character-based heuristic (4 chars ≈ 1 token for English)
 * For production, use tiktoken library
 */
export function estimateTokens(text: string): number {
  // Simple heuristic: 4 characters ≈ 1 token for English text
  return Math.ceil(text.length / 4);
}

/**
 * Preflight cost estimate for a request
 */
export function estimateRequestCost(
  input: string,
  maxOutputTokens: number,
  modelId: string
): { estimatedCost: number; estimatedInputTokens: number; estimatedOutputTokens: number } {
  const inputTokens = estimateTokens(input);
  const pricing = getModelPricing(modelId);
  
  const inputCost = (inputTokens / 1000) * pricing.inputPrice;
  const outputCost = (maxOutputTokens / 1000) * pricing.outputPrice;
  
  return {
    estimatedCost: inputCost + outputCost,
    estimatedInputTokens: inputTokens,
    estimatedOutputTokens: maxOutputTokens,
  };
}

/**
 * Get cost band for UI display
 */
export function getCostBand(estimatedCost: number): { label: string; color: string } {
  if (estimatedCost < 0.001) {
    return { label: 'Very low (<$0.001)', color: '#28a745' };
  }
  if (estimatedCost < 0.01) {
    return { label: 'Low (~$0.01)', color: '#28a745' };
  }
  if (estimatedCost < 0.05) {
    return { label: 'Medium (~$0.05)', color: '#ffc107' };
  }
  if (estimatedCost < 0.1) {
    return { label: 'High (~$0.10)', color: '#fd7e14' };
  }
  return { label: 'Very high (>$0.10)', color: '#dc3545' };
}

/**
 * Check if cost exceeds threshold for budget warning (80%)
 */
export function shouldShowBudgetWarning(spent: number, budget: number): boolean {
  return spent >= budget * 0.8;
}