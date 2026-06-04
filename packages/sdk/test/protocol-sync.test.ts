import { describe, it, expect } from 'vitest';
import { ErrorCode as SharedErrorCode, ProviderIdSchema } from '@byom/shared';
import { ErrorCode as SdkErrorCode } from '../src/protocol';

const SHARED_PROVIDER_IDS = [
  'openai',
  'anthropic',
  'google',
  'mistral',
  'groq',
  'cohere',
  'deepseek',
  'together',
  'fireworks',
  'perplexity',
  'xai',
  'cerebras',
  'openrouter',
  'ollama',
  'lmstudio',
] as const;

describe('protocol sync with @byom/shared', () => {
  it('ErrorCode enum values match @byom/shared', () => {
    const sharedValues = Object.values(SharedErrorCode).sort();
    const sdkValues = Object.values(SdkErrorCode).sort();
    expect(sdkValues).toEqual(sharedValues);
  });

  it('ProviderIdSchema options match SDK ProviderId union', () => {
    const schemaOptions = ProviderIdSchema.options.slice().sort();
    const sdkIds = [...SHARED_PROVIDER_IDS].sort();
    expect(schemaOptions).toEqual(sdkIds);
  });
});
