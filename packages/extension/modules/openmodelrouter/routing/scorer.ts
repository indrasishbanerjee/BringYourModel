import type { ProviderConfig, ProviderId, TaskType } from '@byom/shared';
import { getDefaultModel, getProviderMeta } from '../providers/registry';
import { getModelPricing } from '../telemetry/pricing';
import type { ProviderHealthSnapshot } from './health';

export interface ScoreBreakdown {
  costScore: number;
  latencyScore: number;
  reliabilityScore: number;
  taskFitScore: number;
  recencyScore: number;
}

export interface ProviderScore {
  provider: ProviderId;
  config: ProviderConfig;
  score: number;
  breakdown: ScoreBreakdown;
}

export const SCORING_WEIGHTS = {
  taskFit: 0.3,
  cost: 0.25,
  reliability: 0.25,
  latency: 0.15,
  recency: 0.05,
} as const;

/** Providers that rank highly for each task type (first = best fit) */
const TASK_FIT_RANKING: Partial<Record<TaskType, ProviderId[]>> = {
  ask: ['openai', 'anthropic', 'google', 'groq', 'mistral', 'deepseek', 'openrouter', 'ollama'],
  stream: ['openai', 'anthropic', 'google', 'groq', 'mistral', 'deepseek', 'openrouter', 'ollama'],
  chat: ['openai', 'anthropic', 'google', 'mistral', 'deepseek', 'openrouter', 'ollama'],
  classify: ['openai', 'google', 'groq', 'anthropic', 'mistral', 'deepseek', 'openrouter'],
  extract: ['openai', 'anthropic', 'google', 'mistral', 'deepseek', 'openrouter'],
  embed: ['openai', 'google'],
};

function normalizeInverse(value: number, min: number, max: number): number {
  if (max <= min) return 1;
  const clamped = Math.min(Math.max(value, min), max);
  return 1 - (clamped - min) / (max - min);
}

function taskFitScore(provider: ProviderId, task: TaskType): number {
  const ranking = TASK_FIT_RANKING[task] ?? TASK_FIT_RANKING.ask ?? [];
  const index = ranking.indexOf(provider);
  if (index === -1) {
    return 0.35;
  }
  return 1 - index / Math.max(ranking.length, 1);
}

function costScoreForProvider(provider: ProviderId, modelId: string): number {
  const pricing = getModelPricing(modelId);
  const blendedCost = pricing.inputPer1K + pricing.outputPer1K;
  // Typical range ~0.0001–0.06 USD per 1K tokens
  return normalizeInverse(blendedCost, 0.00005, 0.06);
}

function latencyScore(health: ProviderHealthSnapshot): number {
  if (health.avgLatencyMs <= 0) {
    return 0.75;
  }
  return normalizeInverse(health.avgLatencyMs, 200, 8000);
}

function recencyScore(lastSuccessAt?: number): number {
  if (!lastSuccessAt) {
    return 0.5;
  }
  const ageMs = Date.now() - lastSuccessAt;
  if (ageMs < 60_000) return 1;
  if (ageMs < 300_000) return 0.8;
  if (ageMs < 900_000) return 0.6;
  return 0.4;
}

export function scoreProvider(
  config: ProviderConfig,
  task: TaskType,
  health: ProviderHealthSnapshot,
  lastSuccessAt?: number
): ProviderScore {
  const modelId = config.defaultModel || getDefaultModel(config.kind);
  const meta = getProviderMeta(config.kind);

  const breakdown: ScoreBreakdown = {
    taskFitScore: taskFitScore(config.kind, task),
    costScore: costScoreForProvider(config.kind, modelId),
    reliabilityScore: health.isCircuitOpen ? 0 : health.successRate,
    latencyScore: latencyScore(health),
    recencyScore: recencyScore(lastSuccessAt),
  };

  const score =
    breakdown.taskFitScore * SCORING_WEIGHTS.taskFit +
    breakdown.costScore * SCORING_WEIGHTS.cost +
    breakdown.reliabilityScore * SCORING_WEIGHTS.reliability +
    breakdown.latencyScore * SCORING_WEIGHTS.latency +
    breakdown.recencyScore * SCORING_WEIGHTS.recency;

  // Local providers get a small privacy bonus when configured
  if (meta.category === 'local') {
    return {
      provider: config.kind,
      config,
      score: score + 0.02,
      breakdown,
    };
  }

  return {
    provider: config.kind,
    config,
    score,
    breakdown,
  };
}

export function scoreAndRankProviders(
  candidates: ProviderConfig[],
  task: TaskType,
  getHealth: (provider: ProviderId) => ProviderHealthSnapshot,
  getLastSuccessAt?: (provider: ProviderId) => number | undefined
): ProviderScore[] {
  return candidates
    .map((config) =>
      scoreProvider(
        config,
        task,
        getHealth(config.kind),
        getLastSuccessAt?.(config.kind)
      )
    )
    .sort((a, b) => b.score - a.score);
}
