import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PolicyEngine } from '../modules/openmodelrouter/policy/engine';
import type { GrantStore } from '../modules/storage/grant-store';
import { ErrorCode, type Grant } from '@byom/shared';

function makeGrant(overrides: Partial<Grant> = {}): Grant {
  return {
    origin: 'https://example.com',
    providers: ['openai', 'ollama'],
    allowedTasks: ['ask', 'stream', 'embed', 'classify', 'extract', 'chat'],
    dailyBudgetUSD: 10,
    monthlyBudgetUSD: 100,
    perRequestTokenCap: 100_000,
    privacyMode: 'cloud-allowed',
    autoApprove: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function mockGrantStore(usage = { daily: 0, monthly: 0 }): GrantStore {
  return {
    getUsage: vi.fn().mockResolvedValue(usage),
  } as unknown as GrantStore;
}

describe('PolicyEngine', () => {
  const engine = new PolicyEngine();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects disallowed tasks', async () => {
    const grant = makeGrant({ allowedTasks: ['embed'] });
    const result = await engine.checkPolicy(
      grant,
      'ask',
      { input: 'hello' },
      mockGrantStore()
    );

    expect(result.allowed).toBe(false);
    expect(result.errorCode).toBe(ErrorCode.TASK_NOT_ALLOWED);
  });

  it('rejects expired grants', async () => {
    const grant = makeGrant({ expiresAt: Date.now() - 1000 });
    const result = await engine.checkPolicy(
      grant,
      'ask',
      { input: 'hello' },
      mockGrantStore()
    );

    expect(result.allowed).toBe(false);
    expect(result.errorCode).toBe(ErrorCode.PERMISSION_DENIED);
  });

  it('rejects when daily budget is exhausted', async () => {
    const grant = makeGrant({ dailyBudgetUSD: 1 });
    const result = await engine.checkPolicy(
      grant,
      'ask',
      { input: 'hello' },
      mockGrantStore({ daily: 1, monthly: 1 })
    );

    expect(result.allowed).toBe(false);
    expect(result.errorCode).toBe(ErrorCode.BUDGET_EXCEEDED);
  });

  it('rejects models outside the allowlist', async () => {
    const grant = makeGrant({ modelAllowlist: ['gpt-4o-mini'] });
    const result = await engine.checkPolicy(
      grant,
      'ask',
      { input: 'hello', model: 'gpt-4o' },
      mockGrantStore()
    );

    expect(result.allowed).toBe(false);
    expect(result.errorCode).toBe(ErrorCode.MODEL_NOT_ALLOWED);
  });

  it('allows wildcard model allowlist matches', async () => {
    const grant = makeGrant({ modelAllowlist: ['gpt-4o*'] });
    const result = await engine.checkPolicy(
      grant,
      'ask',
      { input: 'hello', model: 'gpt-4o-mini' },
      mockGrantStore()
    );

    expect(result.allowed).toBe(true);
  });

  it('allows valid requests and extracts input from messages', async () => {
    const grant = makeGrant();
    const result = await engine.checkPolicy(
      grant,
      'ask',
      {
        messages: [
          { role: 'user', content: 'first' },
          { role: 'assistant', content: 'second' },
        ],
      },
      mockGrantStore()
    );

    expect(result.allowed).toBe(true);
    expect(engine.extractInputText({ messages: [{ role: 'user', content: 'first' }] })).toBe('first');
  });

  it('resolves preflight model from request, prefs, or default', () => {
    expect(engine.resolvePreflightModel({ model: 'gpt-4o' })).toBe('gpt-4o');
    expect(
      engine.resolvePreflightModel({}, { mode: 'auto', preferredModel: 'claude-3-haiku', rememberLastChoice: true, updatedAt: Date.now() })
    ).toBe('claude-3-haiku');
    expect(engine.resolvePreflightModel({}, undefined, 'gemini-1.5-flash')).toBe('gemini-1.5-flash');
    expect(engine.resolvePreflightModel({})).toBe('gpt-4o-mini');
  });

  it('returns policy summary for display', () => {
    const grant = makeGrant({ dailyBudgetUSD: 5, monthlyBudgetUSD: 50, perRequestTokenCap: 8000 });
    const summary = engine.getPolicySummary(grant);

    expect(summary.dailyBudget).toBe(5);
    expect(summary.monthlyBudget).toBe(50);
    expect(summary.perRequestCap).toBe(8000);
    expect(summary.privacyMode).toBe('cloud-allowed');
  });

  it('flags high-cost requests for approval', () => {
    const grant = makeGrant({ dailyBudgetUSD: 10 });
    expect(engine.shouldRequireApproval(3, grant)).toBe(true);
    expect(engine.shouldRequireApproval(1, grant)).toBe(false);
  });
});
