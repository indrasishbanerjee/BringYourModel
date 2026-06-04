import { describe, it, expect, vi } from 'vitest';
import { resolveModelId, resolveProviderAndModel } from '../modules/openmodelrouter/routing/resolver';
import { RoutingEngine } from '../modules/openmodelrouter/routing/engine';
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

const globalPrefs: GlobalRoutingPreferences = {
  mode: 'auto',
  rememberLastChoice: true,
  updatedAt: Date.now(),
};

describe('resolveModelId', () => {
  const getDefaultModel = (kind: ProviderConfig['kind']) => `${kind}-default`;
  const getEmbeddingModel = (kind: ProviderConfig['kind']) => `${kind}-embed`;

  it('prefers request model over global and provider defaults', () => {
    const model = resolveModelId({
      requestModel: 'gpt-4o',
      globalPrefs: { ...globalPrefs, preferredModel: 'claude-3-haiku' },
      provider: makeProvider('openai', { defaultModel: 'gpt-4o-mini' }),
      task: 'ask',
      getDefaultModel,
      getEmbeddingModel,
    });

    expect(model).toBe('gpt-4o');
  });

  it('falls back to global preferred model', () => {
    const model = resolveModelId({
      globalPrefs: { ...globalPrefs, preferredModel: 'gemini-1.5-flash' },
      provider: makeProvider('google'),
      task: 'ask',
      getDefaultModel,
      getEmbeddingModel,
    });

    expect(model).toBe('gemini-1.5-flash');
  });

  it('uses embedding model for embed tasks', () => {
    const model = resolveModelId({
      provider: makeProvider('openai'),
      globalPrefs,
      task: 'embed',
      getDefaultModel,
      getEmbeddingModel,
    });

    expect(model).toBe('openai-embed');
  });
});

describe('resolveProviderAndModel', () => {
  const routingEngine = new RoutingEngine();
  const getDefaultModel = (kind: ProviderConfig['kind']) => `${kind}-default`;
  const getEmbeddingModel = (kind: ProviderConfig['kind']) => `${kind}-embed`;
  const supportsEmbeddings = (kind: ProviderConfig['kind']) => kind !== 'ollama';

  it('returns null when no providers support the task', async () => {
    const result = await resolveProviderAndModel(routingEngine, {
      grant: makeGrant({ providers: ['ollama'] }),
      task: 'embed',
      enabledProviders: [makeProvider('ollama')],
      globalPrefs,
      getDefaultModel,
      getEmbeddingModel,
      supportsEmbeddings,
    });

    expect(result).toBeNull();
  });

  it('selects provider and resolves model for ask tasks', async () => {
    const openai = makeProvider('openai', { defaultModel: 'gpt-4o-mini' });
    const result = await resolveProviderAndModel(routingEngine, {
      grant: makeGrant(),
      task: 'ask',
      enabledProviders: [openai, makeProvider('ollama')],
      globalPrefs,
      requestModel: 'gpt-4o',
      getDefaultModel,
      getEmbeddingModel,
      supportsEmbeddings,
    });

    expect(result).not.toBeNull();
    expect(result!.provider.kind).toBe('openai');
    expect(result!.modelId).toBe('gpt-4o');
  });

  it('honors privacy alias routing', async () => {
    const ollama = makeProvider('ollama');
    const result = await resolveProviderAndModel(routingEngine, {
      grant: makeGrant({ privacyMode: 'local-only', providers: ['ollama'] }),
      task: 'ask',
      enabledProviders: [ollama, makeProvider('openai')],
      globalPrefs,
      privacyAlias: 'local',
      getDefaultModel,
      getEmbeddingModel,
      supportsEmbeddings,
    });

    expect(result?.provider.kind).toBe('ollama');
  });

  it('filters embed task to embedding-capable providers', async () => {
    const selectSpy = vi.spyOn(routingEngine, 'selectProviderWithPreferences');
    selectSpy.mockResolvedValue({
      selection: { kind: 'openai', config: makeProvider('openai') },
      shouldAskUser: false,
      reason: 'test',
    });

    await resolveProviderAndModel(routingEngine, {
      grant: makeGrant(),
      task: 'embed',
      enabledProviders: [makeProvider('openai'), makeProvider('ollama')],
      globalPrefs,
      getDefaultModel,
      getEmbeddingModel,
      supportsEmbeddings,
    });

    const passedCandidates = selectSpy.mock.calls[0]?.[1] ?? [];
    expect(passedCandidates.every((p) => p.kind !== 'ollama')).toBe(true);

    selectSpy.mockRestore();
  });

  it('returns null when shouldAskUser is true (no unsafe fallback)', async () => {
    const selectSpy = vi.spyOn(routingEngine, 'selectProviderWithPreferences');
    selectSpy.mockResolvedValue({
      selection: null,
      shouldAskUser: true,
      reason: 'Ask every time mode',
    });
    const fallbackSpy = vi.spyOn(routingEngine, 'selectProvider');

    const result = await resolveProviderAndModel(routingEngine, {
      grant: makeGrant(),
      task: 'ask',
      enabledProviders: [makeProvider('openai'), makeProvider('ollama')],
      globalPrefs,
      getDefaultModel,
      getEmbeddingModel,
      supportsEmbeddings,
    });

    expect(result).toBeNull();
    expect(fallbackSpy).not.toHaveBeenCalled();

    selectSpy.mockRestore();
    fallbackSpy.mockRestore();
  });

  it('includes ranked alternatives in resolved routing', async () => {
    const selectSpy = vi.spyOn(routingEngine, 'selectProviderWithPreferences');
    selectSpy.mockResolvedValue({
      selection: { kind: 'openai', config: makeProvider('openai') },
      shouldAskUser: false,
      reason: 'Auto routing',
      rankedScores: [
        {
          provider: 'openai' as ProviderId,
          config: makeProvider('openai'),
          score: 0.9,
          breakdown: {
            costScore: 0.8,
            latencyScore: 0.7,
            reliabilityScore: 1,
            taskFitScore: 0.9,
            recencyScore: 0.5,
          },
        },
      ],
    });

    const result = await resolveProviderAndModel(routingEngine, {
      grant: makeGrant(),
      task: 'ask',
      enabledProviders: [makeProvider('openai'), makeProvider('groq')],
      globalPrefs,
      getDefaultModel,
      getEmbeddingModel,
      supportsEmbeddings,
    });

    expect(result?.alternatives.length).toBeGreaterThan(0);

    selectSpy.mockRestore();
  });
});
