import { describe, it, expect } from 'vitest';
import {
  normalizeLanguageModelUsage,
  ZERO_USAGE,
} from '../modules/openmodelrouter/telemetry/usage';
import { calculateCost, calculateEmbeddingCost } from '../modules/openmodelrouter/telemetry/pricing';

describe('normalizeLanguageModelUsage', () => {
  it('returns all zeros for undefined input', () => {
    const result = normalizeLanguageModelUsage(undefined);
    expect(result).toEqual({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
  });

  it('returns all zeros for empty object', () => {
    const result = normalizeLanguageModelUsage({});
    expect(result).toEqual({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
  });

  it('uses provided values when all present', () => {
    const result = normalizeLanguageModelUsage({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
    });
    expect(result).toEqual({ inputTokens: 100, outputTokens: 50, totalTokens: 150 });
  });

  it('calculates total from input+output when total is missing', () => {
    const result = normalizeLanguageModelUsage({
      inputTokens: 100,
      outputTokens: 50,
    });
    expect(result).toEqual({ inputTokens: 100, outputTokens: 50, totalTokens: 150 });
  });

  it('uses zero defaults for partial input', () => {
    const result = normalizeLanguageModelUsage({
      inputTokens: 100,
    });
    expect(result).toEqual({ inputTokens: 100, outputTokens: 0, totalTokens: 100 });
  });

  it('uses zero defaults for partial output', () => {
    const result = normalizeLanguageModelUsage({
      outputTokens: 50,
    });
    expect(result).toEqual({ inputTokens: 0, outputTokens: 50, totalTokens: 50 });
  });
});

describe('ZERO_USAGE constant', () => {
  it('contains all zeros', () => {
    expect(ZERO_USAGE).toEqual({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
  });
});

describe('usageRecordTokenTotal', () => {
  it('reads UsageRecord token shape', async () => {
    const { usageRecordTokenTotal } = await import('../modules/openmodelrouter/telemetry/usage');
    expect(usageRecordTokenTotal({ input: 100, output: 50, total: 150 })).toBe(150);
  });

  it('reads legacy NormalizedUsage field names', async () => {
    const { usageRecordTokenTotal } = await import('../modules/openmodelrouter/telemetry/usage');
    expect(usageRecordTokenTotal({ inputTokens: 10, outputTokens: 5, totalTokens: 15 })).toBe(15);
  });

  it('returns 0 when tokens missing', async () => {
    const { usageRecordTokenTotal } = await import('../modules/openmodelrouter/telemetry/usage');
    expect(usageRecordTokenTotal(undefined)).toBe(0);
  });
});

describe('calculateCost', () => {
  it('calculates cost for gpt-4o-mini correctly', () => {
    // gpt-4o-mini: input $0.00015/1K, output $0.0006/1K
    const cost = calculateCost(1000, 500, 'gpt-4o-mini');
    // input: (1000/1000) * 0.00015 = 0.00015
    // output: (500/1000) * 0.0006 = 0.0003
    // total: 0.00045
    expect(cost).toBeCloseTo(0.00045, 6);
  });

  it('calculates cost for gpt-4o correctly', () => {
    // gpt-4o: input $0.005/1K, output $0.015/1K
    const cost = calculateCost(2000, 1000, 'gpt-4o');
    // input: (2000/1000) * 0.005 = 0.01
    // output: (1000/1000) * 0.015 = 0.015
    // total: 0.025
    expect(cost).toBeCloseTo(0.025, 6);
  });

  it('handles zero tokens', () => {
    const cost = calculateCost(0, 0, 'gpt-4o-mini');
    expect(cost).toBe(0);
  });

  it('uses default pricing for unknown models', () => {
    // default: input $0.001/1K, output $0.003/1K
    const cost = calculateCost(1000, 1000, 'unknown-model-v123');
    // input: 0.001, output: 0.003
    expect(cost).toBeCloseTo(0.004, 6);
  });

  it('matches pricing by prefix for dated models', () => {
    // gpt-4o-2024-08-06 should match gpt-4o pricing
    const costDated = calculateCost(1000, 500, 'gpt-4o-2024-08-06');
    const costBase = calculateCost(1000, 500, 'gpt-4o');
    expect(costDated).toBe(costBase);
  });
});

describe('calculateEmbeddingCost', () => {
  it('calculates cost for text-embedding-3-small correctly', () => {
    // text-embedding-3-small: $0.00002/1K tokens
    const cost = calculateEmbeddingCost(10000, 'text-embedding-3-small');
    expect(cost).toBeCloseTo(0.0002, 6);
  });

  it('calculates cost for text-embedding-3-large correctly', () => {
    // text-embedding-3-large: $0.00013/1K tokens
    const cost = calculateEmbeddingCost(10000, 'text-embedding-3-large');
    expect(cost).toBeCloseTo(0.0013, 6);
  });

  it('uses default pricing for unknown embedding models', () => {
    // default: input $0.001/1K
    const cost = calculateEmbeddingCost(1000, 'custom-embed-model');
    expect(cost).toBeCloseTo(0.001, 6);
  });
});
