import {
  type GlobalRoutingPreferences,
  type Grant,
  type ProviderConfig,
  type ProviderId,
  type TaskType,
} from '@byom/shared';
import { RoutingEngine, supportsTask } from './engine';
import type { ProviderScore } from './scorer';

export interface ResolvedRouting {
  provider: { kind: ProviderId; config: ProviderConfig };
  modelId: string;
  globalPrefs: GlobalRoutingPreferences;
  alternatives: ProviderScore[];
}

/**
 * Resolve provider and model using global preferences and grant policy
 */
export async function resolveProviderAndModel(
  routingEngine: RoutingEngine,
  options: {
    grant: Grant;
    task: TaskType;
    enabledProviders: ProviderConfig[];
    globalPrefs: GlobalRoutingPreferences;
    requestModel?: string;
    privacyAlias?: string;
    getDefaultModel: (kind: ProviderId) => string;
    getEmbeddingModel: (kind: ProviderId, requested?: string) => string;
    supportsEmbeddings: (kind: ProviderId) => boolean;
  }
): Promise<ResolvedRouting | null> {
  const {
    grant,
    task,
    enabledProviders,
    globalPrefs,
    requestModel,
    privacyAlias,
    getDefaultModel,
    getEmbeddingModel,
    supportsEmbeddings,
  } = options;

  let candidates = enabledProviders.filter(
    (p) => grant.providers.includes(p.kind) && p.isEnabled && supportsTask(p.kind, task)
  );

  if (task === 'embed') {
    candidates = candidates.filter((p) => supportsEmbeddings(p.kind));
  }

  if (candidates.length === 0) {
    return null;
  }

  const routingResult = await routingEngine.selectProviderWithPreferences(
    grant,
    candidates,
    globalPrefs,
    task,
    privacyAlias || requestModel
  );

  // Consent flow must run — do not auto-pick when user should be asked
  if (routingResult.shouldAskUser) {
    return null;
  }

  let selection = routingResult.selection;

  if (!selection) {
    return null;
  }

  const alternatives = routingResult.rankedScores ?? routingEngine.rankProviders(grant, candidates, task);

  const modelId = resolveModelId({
    requestModel,
    globalPrefs,
    provider: selection.config,
    task,
    getDefaultModel,
    getEmbeddingModel,
  });

  return {
    provider: selection,
    modelId,
    globalPrefs,
    alternatives,
  };
}

/**
 * Model resolution chain:
 * 1. SDK request.model
 * 2. Global preferredModel
 * 3. Provider defaultModel
 * 4. System default for provider/task
 */
export function resolveModelId(options: {
  requestModel?: string;
  globalPrefs: GlobalRoutingPreferences;
  provider: ProviderConfig;
  task: TaskType;
  getDefaultModel: (kind: ProviderId) => string;
  getEmbeddingModel: (kind: ProviderId, requested?: string) => string;
}): string {
  const { requestModel, globalPrefs, provider, task, getDefaultModel, getEmbeddingModel } = options;

  if (requestModel) {
    return requestModel;
  }

  if (globalPrefs.preferredModel) {
    return globalPrefs.preferredModel;
  }

  if (provider.defaultModel) {
    return provider.defaultModel;
  }

  if (task === 'embed') {
    return getEmbeddingModel(provider.kind);
  }

  return getDefaultModel(provider.kind);
}
