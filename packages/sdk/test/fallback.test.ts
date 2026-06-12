import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ErrorCode,
  ByomError,
  ExtensionNotInstalledError,
  PermissionDeniedError,
} from '../src/protocol.js';
import { detectByomMode, runWithByomFallback } from '../src/fallback.js';
import { getClient, destroyClient } from '../src/client.js';

describe('fallback helpers', () => {
  beforeEach(() => {
    destroyClient();
  });

  it('detectByomMode returns unavailable when bridge is missing', async () => {
    const mode = await detectByomMode(100);
    expect(mode).toBe('unavailable');
  });

  it('runWithByomFallback uses fallback on extension unavailable', async () => {
    const client = getClient();
    vi.spyOn(client, 'ask').mockRejectedValue(
      new ExtensionNotInstalledError('not installed')
    );

    const fallback = vi.fn().mockResolvedValue({
      text: 'fallback',
      model: 'gpt-4o-mini',
      provider: 'openai',
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      costUSD: 0,
      latencyMs: 1,
    });

    const result = await runWithByomFallback({ input: 'hi' }, fallback);
    expect(result.text).toBe('fallback');
    expect(fallback).toHaveBeenCalledOnce();
  });

  it('runWithByomFallback does not fallback on permission denied', async () => {
    const client = getClient();
    vi.spyOn(client, 'ask').mockRejectedValue(new PermissionDeniedError('denied'));

    const fallback = vi.fn();
    await expect(
      runWithByomFallback({ input: 'hi' }, fallback)
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(fallback).not.toHaveBeenCalled();
  });

  it('runWithByomFallback can fallback on protocol mismatch when enabled', async () => {
    const client = getClient();
    vi.spyOn(client, 'ask').mockRejectedValue(
      new ByomError(ErrorCode.PROTOCOL_VERSION_MISMATCH, 'mismatch')
    );

    const fallback = vi.fn().mockResolvedValue({
      text: 'ok',
      model: 'm',
      provider: 'openai',
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      costUSD: 0,
      latencyMs: 0,
    });

    const result = await runWithByomFallback(
      { input: 'hi' },
      fallback,
      { fallbackOnProtocolMismatch: true }
    );
    expect(result.text).toBe('ok');
  });
});
