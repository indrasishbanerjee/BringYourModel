import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPromptApi, installPromptApiShim } from '../src/prompt-api.js';
import { getClient, destroyClient } from '../src/client.js';

describe('Prompt API shim', () => {
  beforeEach(() => {
    destroyClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).LanguageModel;
  });

  it('createPromptApi returns availability unavailable without extension', async () => {
    const api = createPromptApi();
    await expect(api.languageModel.availability()).resolves.toBe('unavailable');
  });

  it('installPromptApiShim installs when native missing', () => {
    const result = installPromptApiShim({ mode: 'if-missing' });
    expect(result.installed).toBe(true);
    expect((globalThis as { LanguageModel?: unknown }).LanguageModel).toBeDefined();
  });

  it('installPromptApiShim skips when native present', () => {
    const native = { availability: async () => 'available' as const, create: async () => ({}) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).LanguageModel = native;

    const result = installPromptApiShim({ mode: 'if-missing' });
    expect(result.installed).toBe(false);
    expect(result.reason).toBe('native-present');
    expect((globalThis as { LanguageModel?: unknown }).LanguageModel).toBe(native);
  });

  it('session prompt calls ask and maintains history', async () => {
    const client = getClient();
    vi.spyOn(client, 'isAvailable').mockResolvedValue(true);
    vi.spyOn(client, 'getCapabilities').mockResolvedValue({
      extensionVersion: '1.0.0',
      supportedTasks: ['ask'],
      siteApproved: true,
      vaultUnlocked: true,
    });
    vi.spyOn(client, 'ask').mockResolvedValue({
      text: 'Answer',
      model: 'gpt-4o-mini',
      provider: 'openai',
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      costUSD: 0,
      latencyMs: 1,
    });

    const api = createPromptApi();
    const session = await api.languageModel.create({ systemPrompt: 'Be brief.' });
    const text = await session.prompt('Hello');
    expect(text).toBe('Answer');

    await session.prompt('Follow up');
    expect(client.ask).toHaveBeenCalledTimes(2);
  });
});
