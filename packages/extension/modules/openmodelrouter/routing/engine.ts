import {
  type ProviderConfig,
  type Grant,
  type ProviderId,
  type TaskType,
  type GlobalRoutingPreferences,
} from '@byom/shared';
import { buildTaskSupportMatrix, isLocalProvider } from '../providers/registry';
import { getProviderHealthTracker, type ProviderHealthTracker } from './health';
import { scoreAndRankProviders, type ProviderScore } from './scorer';
import { RoutingLog } from './routing-log';
import { getRoutingPreferencesStore } from '../../storage/routing-preferences-store';

/**
 * Task support matrix by provider — derived from the provider registry
 */
export const TASK_SUPPORT_MATRIX: Record<ProviderId, TaskType[]> = buildTaskSupportMatrix();

export function supportsTask(provider: ProviderId, task: TaskType): boolean {
  return TASK_SUPPORT_MATRIX[provider]?.includes(task) ?? false;
}

/**
 * Model aliases for explicit alias routing (fast, reasoning, etc.)
 */
const MODEL_ALIASES: Record<string, { provider: ProviderId; model: string }[]> = {
  fast: [
    { provider: 'openai', model: 'gpt-4o-mini' },
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    { provider: 'google', model: 'gemini-2.5-flash' },
    { provider: 'cerebras', model: 'llama3.1-70b' },
    { provider: 'fireworks', model: 'accounts/fireworks/models/llama-v3p1-70b-instruct' },
    { provider: 'deepseek', model: 'deepseek-chat' },
    { provider: 'ollama', model: 'llama3.2' },
    { provider: 'openrouter', model: 'meta-llama/llama-3.2-3b-instruct' },
  ],
  reasoning: [
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
    { provider: 'mistral', model: 'mistral-large-latest' },
    { provider: 'google', model: 'gemini-2.5-pro' },
    { provider: 'perplexity', model: 'sonar-reasoning' },
    { provider: 'xai', model: 'grok-3' },
    { provider: 'deepseek', model: 'deepseek-reasoner' },
    { provider: 'openrouter', model: 'meta-llama/llama-3.1-70b-instruct' },
  ],
  cheap: [
    { provider: 'deepseek', model: 'deepseek-chat' },
    { provider: 'together', model: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo' },
    { provider: 'openrouter', model: 'meta-llama/llama-3.2-3b-instruct' },
    { provider: 'ollama', model: 'llama3.2' },
    { provider: 'openai', model: 'gpt-4o-mini' },
  ],
  private: [
    { provider: 'ollama', model: 'llama3.2' },
    { provider: 'ollama', model: 'mistral' },
    { provider: 'lmstudio', model: 'local-model' },
  ],
  local: [
    { provider: 'ollama', model: 'llama3.2' },
    { provider: 'lmstudio', model: 'local-model' },
  ],
};

function findLocalProvider(providers: ProviderConfig[]): ProviderConfig | undefined {
  return providers.find((provider) => isLocalProvider(provider.kind));
}

export interface RoutingSelectionResult {
  selection: { kind: ProviderId; config: ProviderConfig } | null;
  shouldAskUser: boolean;
  suggestedProvider?: ProviderId;
  reason: string;
  rankedScores?: ProviderScore[];
}

/**
 * RoutingEngine - Selects the best provider based on policies, preferences, and health
 */
export class RoutingEngine {
  private healthTracker: ProviderHealthTracker;

  constructor(healthTracker?: ProviderHealthTracker) {
    this.healthTracker = healthTracker ?? getProviderHealthTracker();
  }

  /**
   * Select the best provider for a request using scored auto-routing
   */
  async selectProvider(
    grant: Grant,
    enabledProviders: ProviderConfig[],
    modelPreference?: string,
    task: TaskType = 'ask'
  ): Promise<{ kind: ProviderId; config: ProviderConfig; score?: ProviderScore } | null> {
    const allowedProviders = enabledProviders.filter(
      (p) => grant.providers.includes(p.kind) && p.isEnabled
    );

    if (allowedProviders.length === 0) {
      return null;
    }

    // Explicit alias routing (fast, reasoning, etc.)
    if (modelPreference && MODEL_ALIASES[modelPreference]) {
      const candidates = MODEL_ALIASES[modelPreference];
      for (const candidate of candidates) {
        const matchingProvider = allowedProviders.find((p) => p.kind === candidate.provider);
        if (matchingProvider && !this.healthTracker.isCircuitOpen(candidate.provider)) {
          return {
            kind: candidate.provider,
            config: {
              ...matchingProvider,
              defaultModel: candidate.model,
            },
          };
        }
      }
    }

    // Explicit provider:model prefix
    if (modelPreference && !MODEL_ALIASES[modelPreference]) {
      const [prefix, modelName] = modelPreference.split(':');
      if (modelName) {
        const provider = allowedProviders.find((p) => p.kind === (prefix as ProviderId));
        if (provider && !this.healthTracker.isCircuitOpen(provider.kind)) {
          return {
            kind: prefix as ProviderId,
            config: {
              ...provider,
              defaultModel: modelName,
            },
          };
        }
      }
    }

    // Grant privacy mode
    if (grant.privacyMode === 'local-only') {
      const localProvider = findLocalProvider(allowedProviders);
      if (localProvider && !this.healthTracker.isCircuitOpen(localProvider.kind)) {
        return { kind: localProvider.kind, config: localProvider };
      }
      return null;
    }

    if (grant.privacyMode === 'preferred-local') {
      const localProvider = findLocalProvider(allowedProviders);
      if (localProvider && !this.healthTracker.isCircuitOpen(localProvider.kind)) {
        return { kind: localProvider.kind, config: localProvider };
      }
    }

    // Scored auto-routing
    const healthyCandidates = allowedProviders.filter(
      (p) => !this.healthTracker.isCircuitOpen(p.kind)
    );
    const candidates = healthyCandidates.length > 0 ? healthyCandidates : allowedProviders;

    const ranked = scoreAndRankProviders(
      candidates,
      task,
      (provider) => this.healthTracker.getHealth(provider)
    );

    if (ranked.length === 0) {
      return {
        kind: allowedProviders[0].kind,
        config: allowedProviders[0],
      };
    }

    const top = ranked[0];
    return {
      kind: top.provider,
      config: top.config,
      score: top,
    };
  }

  /**
   * Rank all grant-allowed providers for a task (used for retry fallback)
   */
  rankProviders(
    grant: Grant,
    enabledProviders: ProviderConfig[],
    task: TaskType
  ): ProviderScore[] {
    const allowed = enabledProviders.filter(
      (p) => grant.providers.includes(p.kind) && p.isEnabled && supportsTask(p.kind, task)
    );
    const healthy = allowed.filter((p) => !this.healthTracker.isCircuitOpen(p.kind));
    return scoreAndRankProviders(
      healthy.length > 0 ? healthy : allowed,
      task,
      (provider) => this.healthTracker.getHealth(provider)
    );
  }

  getAvailableAliases(): string[] {
    return Object.keys(MODEL_ALIASES);
  }

  getAliasModels(alias: string): { provider: ProviderId; model: string }[] {
    return MODEL_ALIASES[alias] || [];
  }

  isModelSupported(model: string, enabledProviders: ProviderConfig[]): boolean {
    if (MODEL_ALIASES[model]) {
      return MODEL_ALIASES[model].some((candidate) =>
        enabledProviders.some((p) => p.kind === candidate.provider && p.isEnabled)
      );
    }

    const [prefix] = model.split(':');
    if (prefix) {
      return enabledProviders.some((p) => p.kind === (prefix as ProviderId) && p.isEnabled);
    }

    return false;
  }

  getSuggestionForTask(task: string): string {
    const suggestions: Record<string, string> = {
      summarize: 'fast',
      classify: 'fast',
      draft: 'reasoning',
      extract: 'reasoning',
      chat: 'reasoning',
      embed: 'fast',
    };
    return suggestions[task] || 'fast';
  }

  getProvidersForTask(task: TaskType, enabledProviders: ProviderConfig[]): ProviderConfig[] {
    return enabledProviders.filter((p) => p.isEnabled && supportsTask(p.kind, task));
  }

  isTaskSupported(task: TaskType, enabledProviders: ProviderConfig[]): boolean {
    return enabledProviders.some((p) => p.isEnabled && supportsTask(p.kind, task));
  }

  getSupportedTasks(provider: ProviderId): TaskType[] {
    return [...TASK_SUPPORT_MATRIX[provider]];
  }

  /**
   * Select provider with global preferences applied
   */
  async selectProviderWithPreferences(
    grant: Grant,
    enabledProviders: ProviderConfig[],
    globalPrefs: GlobalRoutingPreferences,
    task: TaskType,
    modelPreference?: string
  ): Promise<RoutingSelectionResult> {
    const prefsStore = getRoutingPreferencesStore();
    const taskCapableProviders = enabledProviders.filter(
      (p) => p.isEnabled && supportsTask(p.kind, task)
    );

    const grantAllowedProviders = taskCapableProviders.filter((p) =>
      grant.providers.includes(p.kind)
    );

    if (grantAllowedProviders.length === 0 && taskCapableProviders.length === 0) {
      return { selection: null, shouldAskUser: false, reason: 'No providers available' };
    }

    const availableProviders =
      grantAllowedProviders.length > 0 ? grantAllowedProviders : taskCapableProviders;
    const availableKinds = availableProviders.map((p) => p.kind);

    /** Pick from grant-allowed providers only (security: respects grant ACL) */
    const pickFromGrantAllowed = (
      predicate: (p: ProviderConfig) => boolean
    ): ProviderConfig | undefined => availableProviders.find(predicate);

    const applyTaskOverride = (override: string): RoutingSelectionResult | null => {
      if (override.startsWith('provider:')) {
        const providerId = override.slice('provider:'.length) as ProviderId;
        const specific = pickFromGrantAllowed((p) => p.kind === providerId);
        if (specific) {
          return {
            selection: { kind: specific.kind, config: specific },
            shouldAskUser: false,
            reason: `Task override: fixed provider (${providerId})`,
          };
        }
        return {
          selection: null,
          shouldAskUser: true,
          reason: `Task override provider "${providerId}" not in grant — ask user`,
        };
      }

      switch (override) {
        case 'ask':
          return {
            selection: null,
            shouldAskUser: true,
            reason: `Task "${task}" set to always ask`,
          };
        case 'local': {
          const localProvider = pickFromGrantAllowed((p) => isLocalProvider(p.kind));
          if (localProvider) {
            return {
              selection: { kind: localProvider.kind, config: localProvider },
              shouldAskUser: false,
              reason: 'Task override: local',
            };
          }
          return {
            selection: null,
            shouldAskUser: true,
            reason: 'Task override: local provider not in grant — ask user',
          };
        }
        case 'cloud': {
          const cloudProvider = pickFromGrantAllowed((p) => !isLocalProvider(p.kind));
          if (cloudProvider) {
            return {
              selection: { kind: cloudProvider.kind, config: cloudProvider },
              shouldAskUser: false,
              reason: 'Task override: cloud',
            };
          }
          return {
            selection: null,
            shouldAskUser: true,
            reason: 'Task override: cloud provider not in grant — ask user',
          };
        }
        default:
          return null;
      }
    };

    const taskOverride = globalPrefs.taskOverrides?.[task];
    if (taskOverride && taskOverride !== 'auto') {
      const overrideResult = applyTaskOverride(taskOverride);
      if (overrideResult) {
        return overrideResult;
      }
    }

    switch (globalPrefs.mode) {
      case 'ask-every-time': {
        let suggestedProvider: ProviderId | undefined;
        const lastForTask = prefsStore.getLastUsedProviderForTask(globalPrefs, task);
        if (lastForTask && availableKinds.includes(lastForTask)) {
          suggestedProvider = lastForTask;
        }
        return {
          selection: null,
          shouldAskUser: true,
          suggestedProvider,
          reason: suggestedProvider
            ? `Ask mode — suggesting last manual choice for ${task} (${suggestedProvider})`
            : 'Ask every time mode',
        };
      }

      case 'default-local': {
        const localProvider = pickFromGrantAllowed((p) => isLocalProvider(p.kind));
        if (localProvider) {
          return {
            selection: { kind: localProvider.kind, config: localProvider },
            shouldAskUser: false,
            reason: 'Global: default to local',
          };
        }
        break;
      }

      case 'default-cloud': {
        const cloudProvider = pickFromGrantAllowed((p) => !isLocalProvider(p.kind));
        if (cloudProvider) {
          return {
            selection: { kind: cloudProvider.kind, config: cloudProvider },
            shouldAskUser: false,
            reason: 'Global: default to cloud',
          };
        }
        break;
      }

      case 'specific-provider': {
        if (globalPrefs.preferredProvider) {
          const specificProvider = pickFromGrantAllowed(
            (p) => p.kind === globalPrefs.preferredProvider
          );
          if (specificProvider) {
            return {
              selection: { kind: specificProvider.kind, config: specificProvider },
              shouldAskUser: false,
              reason: `Global: specific provider (${globalPrefs.preferredProvider})`,
            };
          }
        }
        break;
      }

      case 'auto':
      default:
        break;
    }

    const selectionResult = await this.selectProvider(
      grant,
      availableProviders,
      modelPreference,
      task
    );

    if (selectionResult) {
      const ranked = this.rankProviders(grant, availableProviders, task);
      const reason = selectionResult.score
        ? `Auto routing (score ${selectionResult.score.score.toFixed(2)})`
        : 'Auto routing';

      await RoutingLog.add({
        timestamp: Date.now(),
        task,
        provider: selectionResult.kind,
        reason,
        mode: globalPrefs.mode,
        scoreBreakdown: selectionResult.score?.breakdown,
        score: selectionResult.score?.score,
      });

      return {
        selection: { kind: selectionResult.kind, config: selectionResult.config },
        shouldAskUser: false,
        reason,
        rankedScores: ranked,
      };
    }

    return {
      selection: null,
      shouldAskUser: false,
      reason: 'No provider selected',
    };
  }
}
