import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { testModelsEndpoint, assertConnectionSuccess } from './test-utils';

export function createOpenAiProvider(options: { apiKey: string; baseURL?: string }) {
  return createOpenAI({ apiKey: options.apiKey, baseURL: options.baseURL });
}

export function createAnthropicProvider(options: { apiKey: string }) {
  return createAnthropic({ apiKey: options.apiKey });
}

export function createGoogleProvider(options: { apiKey: string }) {
  return createGoogleGenerativeAI({ apiKey: options.apiKey });
}

export async function testOpenAiConnection(apiKey: string, baseURL?: string): Promise<void> {
  const url = `${(baseURL || 'https://api.openai.com/v1').replace(/\/$/, '')}/models`;
  const result = await testModelsEndpoint({
    url,
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  assertConnectionSuccess(result);
}

export async function testAnthropicConnection(apiKey: string): Promise<void> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    }),
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error(`HTTP ${response.status}: Invalid Anthropic API key`);
  }

  if (!response.ok && response.status !== 400 && response.status !== 429) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
}

export async function testGoogleConnection(apiKey: string): Promise<void> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
}
