import { describe, it, expect, beforeEach } from 'vitest';
import { RoutingEngine } from '../modules/openmodelrouter/routing/engine';
import { ProviderHealthTracker } from '../modules/openmodelrouter/routing/health';
import { scoreAndRankProviders } from '../modules/openmodelrouter/routing/scorer';
import type { Grant, ProviderConfig, GlobalRoutingPreferences, ProviderId } from '@byom/shared';

function makeProvider(kind: ProviderConfig['kind'], overrides: Partial<ProviderConfig> = {}): ProviderConfig {
  return {
    id: `${kind}-1`,
    kind,
    label: kind,
    encryptedSecret: 'enc',
    iv: 'iv',
    salt: 'salt',
    isEnabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeGrant(overrides: Partial<Grant> = {}): Grant {
  return {
    origin: 'https://example.com',
    providers: ['openai', 'ollama', 'groq'],
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

const basePrefs: GlobalRoutingPreferences = {
  mode: 'auto',
  rememberLastChoice: true,
  taskOverrides: {},
  updatedAt: Date.now(),
};

describe('RoutingEngine.selectProviderWithPreferences', () => {
  const routingEngine = new RoutingEngine();

  it('ask-every-time suggests per-task last manual provider', async () => {
    const result = await routingEngine.selectProviderWithPreferences(
      makeGrant(),
      [makeProvider('openai'), makeProvider('ollama'), makeProvider('groq')],
      {
        ...basePrefs,
        mode: 'ask-every-time',
        lastUsedProviders: { ask: 'groq', embed: 'ollama' },
      },
      'ask'
    );

    expect(result.shouldAskUser).toBe(true);
    expect(result.selection).toBeNull();
    expect(result.suggestedProvider).toBe('groq');
  });

  it('ask-every-time does not suggest provider outside grant', async () => {
    const result = await routingEngine.selectProviderWithPreferences(
      makeGrant({ providers: ['openai'] }),
      [makeProvider('openai'), makeProvider('groq')],
      {
        ...basePrefs,
        mode: 'ask-every-time',
        lastUsedProviders: { ask: 'groq' },
      },
      'ask'
    );

    expect(result.suggestedProvider).toBeUndefined();
  });

  it('default-local picks local provider from grant-allowed set', async () => {
    const result = await routingEngine.selectProviderWithPreferences(
      makeGrant(),
      [makeProvider('openai'), makeProvider('ollama')],
      { ...basePrefs, mode: 'default-local' },
      'ask'
    );

    expect(result.selection?.kind).toBe('ollama');
    expect(result.shouldAskUser).toBe(false);
  });

  it('default-cloud picks cloud provider from grant-allowed set', async () => {
    const result = await routingEngine.selectProviderWithPreferences(
      makeGrant(),
      [makeProvider('openai'), makeProvider('ollama')],
      { ...basePrefs, mode: 'default-cloud' },
      'ask'
    );

    expect(result.selection?.kind).toBe('openai');
  });

  it('specific-provider uses preferred provider when in grant', async () => {
    const result = await routingEngine.selectProviderWithPreferences(
      makeGrant(),
      [makeProvider('openai'), makeProvider('groq')],
      { ...basePrefs, mode: 'specific-provider', preferredProvider: 'groq' },
      'ask'
    );

    expect(result.selection?.kind).toBe('groq');
  });

  it('task override local respects grant ACL', async () => {
    const result = await routingEngine.selectProviderWithPreferences(
      makeGrant({ providers: ['openai'] }),
      [makeProvider('openai'), makeProvider('ollama')],
      { ...basePrefs, taskOverrides: { ask: 'local' } },
      'ask'
    );

    expect(result.shouldAskUser).toBe(true);
    expect(result.selection).toBeNull();
  });

  it('task override provider:id picks grant-allowed provider', async () => {
    const result = await routingEngine.selectProviderWithPreferences(
      makeGrant({ providers: ['groq', 'openai'] }),
      [makeProvider('openai'), makeProvider('groq')],
      { ...basePrefs, taskOverrides: { classify: 'provider:groq' } },
      'classify'
    );

    expect(result.selection?.kind).toBe('groq');
    expect(result.reason).toContain('fixed provider');
  });

  it('auto mode returns scored selection', async () => {
    const result = await routingEngine.selectProviderWithPreferences(
      makeGrant(),
      [makeProvider('openai'), makeProvider('groq')],
      basePrefs,
      'ask'
    );

    expect(result.selection).not.toBeNull();
    expect(result.rankedScores?.length).toBeGreaterThan(0);
    expect(result.reason).toContain('Auto routing');
  });
});

describe('ProviderHealthTracker', () => {
  let tracker: ProviderHealthTracker;

  beforeEach(() => {
    tracker = new ProviderHealthTracker();
  });

  it('opens circuit after 3 consecutive failures', async () => {
    await tracker.recordFailure('openai', 'error 1');
    await tracker.recordFailure('openai', 'error 2');
    await tracker.recordFailure('openai', 'error 3');

    expect(tracker.isCircuitOpen('openai')).toBe(true);
    expect(tracker.getHealth('openai').isHealthy).toBe(false);
  });

  it('recovers circuit on success', async () => {
    await tracker.recordFailure('openai', 'error');
    await tracker.recordFailure('openai', 'error');
    await tracker.recordFailure('openai', 'error');
    await tracker.recordSuccess('openai', 500);

    expect(tracker.isCircuitOpen('openai')).toBe(false);
  });
});

describe('scoreAndRankProviders', () => {
  it('ranks lower-latency provider higher when task fit is equal', () => {
    const ranked = scoreAndRankProviders(
      [makeProvider('cohere'), makeProvider('cerebras')],
      'ask',
      (provider) =>
        provider === 'cerebras'
          ? { successRate: 0.95, avgLatencyMs: 350, isHealthy: true, isCircuitOpen: false }
          : { successRate: 0.95, avgLatencyMs: 2000, isHealthy: true, isCircuitOpen: false }
    );

    const cerebras = ranked.find((entry) => entry.provider === 'cerebras');
    const cohere = ranked.find((entry) => entry.provider === 'cohere');
    expect(cerebras).toBeDefined();
    expect(cohere).toBeDefined();
    expect(cerebras!.breakdown.latencyScore).toBeGreaterThan(cohere!.breakdown.latencyScore);
  });
});

describe('RoutingEngine alias routing', () => {
  const routingEngine = new RoutingEngine();

  it('resolves fast alias to first available grant provider', async () => {
    const selection = await routingEngine.selectProvider(
      makeGrant({ providers: ['groq', 'openai'] }),
      [makeProvider('openai'), makeProvider('groq')],
      'fast',
      'ask'
    );

    expect(selection?.kind).toBe('openai');
  });

  it('local-only grant privacy returns local provider', async () => {
    const selection = await routingEngine.selectProvider(
      makeGrant({ privacyMode: 'local-only', providers: ['ollama'] }),
      [makeProvider('ollama'), makeProvider('openai')],
      undefined,
      'ask'
    );

    expect(selection?.kind).toBe('ollama');
  });
});
