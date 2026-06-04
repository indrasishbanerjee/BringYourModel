/**
 * Normalize AI SDK LanguageModelUsage into standard token counts
 */
export interface NormalizedUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Normalize LanguageModelUsage from AI SDK responses
 * Handles partial/undefined usage by computing totals from available data
 */
export function normalizeLanguageModelUsage(usage?: {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}): NormalizedUsage {
  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;
  const totalTokens = usage?.totalTokens ?? inputTokens + outputTokens;
  return { inputTokens, outputTokens, totalTokens };
}

/**
 * Empty usage for error cases
 */
export const ZERO_USAGE: NormalizedUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
};

/** Token counts stored on UsageRecord (distinct from NormalizedUsage field names). */
export type UsageRecordTokens = { input: number; output: number; total: number };

export function toUsageRecordTokens(usage: NormalizedUsage): UsageRecordTokens {
  return {
    input: usage.inputTokens,
    output: usage.outputTokens,
    total: usage.totalTokens,
  };
}

/** Read token total from UsageRecord or legacy/malformed stored shapes. */
export function usageRecordTokenTotal(
  tokens: UsageRecordTokens | { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined
): number {
  if (!tokens) return 0;
  if ('total' in tokens && typeof tokens.total === 'number') return tokens.total;
  if ('totalTokens' in tokens && typeof tokens.totalTokens === 'number') return tokens.totalTokens;
  const input = ('input' in tokens ? tokens.input : tokens.inputTokens) ?? 0;
  const output = ('output' in tokens ? tokens.output : tokens.outputTokens) ?? 0;
  return input + output;
}
