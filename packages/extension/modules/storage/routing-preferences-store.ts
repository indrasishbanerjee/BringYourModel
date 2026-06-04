import { storage } from './extension-storage';
import {
  GlobalRoutingPreferencesSchema,
  type GlobalRoutingPreferences,
  type ProviderId,
  type TaskType,
} from '@byom/shared';

/**
 * Storage key for global routing preferences
 */
const ROUTING_PREFERENCES_KEY = 'local:routingPreferences';

const ALL_TASKS: TaskType[] = ['ask', 'stream', 'embed', 'classify', 'extract', 'chat'];

/**
 * Default routing preferences
 */
const DEFAULT_PREFERENCES: GlobalRoutingPreferences = {
  mode: 'auto',
  rememberLastChoice: true,
  taskOverrides: {},
  updatedAt: Date.now(),
};

function migratePreferences(prefs: GlobalRoutingPreferences): GlobalRoutingPreferences {
  let migrated = { ...prefs };

  if (prefs.lastUsedProvider && !prefs.lastUsedProviders) {
    const lastUsedProviders: Record<string, ProviderId> = {};
    for (const task of ALL_TASKS) {
      lastUsedProviders[task] = prefs.lastUsedProvider;
    }
    migrated = {
      ...migrated,
      lastUsedProviders,
    };
  }

  return migrated;
}

/**
 * RoutingPreferencesStore - Manages global routing preferences
 * These are user-defined defaults that apply across all sites
 */
export class RoutingPreferencesStore {
  /**
   * Get global routing preferences (with legacy migration)
   */
  async getPreferences(): Promise<GlobalRoutingPreferences> {
    const prefs = await storage.getItem<GlobalRoutingPreferences>(ROUTING_PREFERENCES_KEY);
    const base = prefs || { ...DEFAULT_PREFERENCES };
    const migrated = migratePreferences(base);

    if (migrated !== base && prefs?.lastUsedProvider && !prefs.lastUsedProviders) {
      await storage.setItem(ROUTING_PREFERENCES_KEY, migrated);
    }

    return migrated;
  }

  /**
   * Resolve per-task last manually chosen provider
   */
  getLastUsedProviderForTask(prefs: GlobalRoutingPreferences, task: TaskType): ProviderId | undefined {
    if (!prefs.rememberLastChoice) {
      return undefined;
    }
    return prefs.lastUsedProviders?.[task] ?? prefs.lastUsedProvider;
  }

  /**
   * Update routing preferences
   */
  async updatePreferences(updates: Partial<GlobalRoutingPreferences>): Promise<GlobalRoutingPreferences> {
    const current = await this.getPreferences();
    const updated: GlobalRoutingPreferences = {
      ...current,
      ...updates,
      updatedAt: Date.now(),
    };

    GlobalRoutingPreferencesSchema.parse(updated);

    await storage.setItem(ROUTING_PREFERENCES_KEY, updated);
    return updated;
  }

  /**
   * Set routing mode
   */
  async setMode(mode: GlobalRoutingPreferences['mode']): Promise<GlobalRoutingPreferences> {
    return this.updatePreferences({ mode });
  }

  /**
   * Set preferred provider for 'specific-provider' mode
   */
  async setPreferredProvider(provider: ProviderId): Promise<GlobalRoutingPreferences> {
    return this.updatePreferences({ preferredProvider: provider });
  }

  /**
   * Set preferred model
   */
  async setPreferredModel(model: string): Promise<GlobalRoutingPreferences> {
    return this.updatePreferences({ preferredModel: model });
  }

  /**
   * Record a manual provider choice from the consent picker (ask-every-time).
   * Does NOT record auto-routed selections.
   */
  async recordManualProviderChoice(provider: ProviderId, task: TaskType): Promise<void> {
    const prefs = await this.getPreferences();
    if (!prefs.rememberLastChoice) {
      return;
    }

    const lastUsedProviders = {
      ...(prefs.lastUsedProviders ?? {}),
      [task]: provider,
    };

    await this.updatePreferences({
      lastUsedProviders,
      lastManualChoice: {
        provider,
        task,
        timestamp: Date.now(),
      },
    });
  }

  /** @deprecated Use recordManualProviderChoice */
  async recordLastUsedProvider(provider: ProviderId, task?: TaskType): Promise<void> {
    if (task) {
      await this.recordManualProviderChoice(provider, task);
    }
  }

  /**
   * Set task-specific override
   */
  async setTaskOverride(task: string, routing: string): Promise<GlobalRoutingPreferences> {
    const current = await this.getPreferences();
    const taskOverrides = { ...current.taskOverrides, [task]: routing };
    return this.updatePreferences({ taskOverrides });
  }

  /**
   * Remove task-specific override
   */
  async removeTaskOverride(task: string): Promise<GlobalRoutingPreferences> {
    const current = await this.getPreferences();
    const taskOverrides = { ...current.taskOverrides };
    delete taskOverrides[task];
    return this.updatePreferences({ taskOverrides });
  }

  /**
   * Clear all task overrides
   */
  async clearTaskOverrides(): Promise<GlobalRoutingPreferences> {
    return this.updatePreferences({ taskOverrides: {} });
  }

  /**
   * Reset to defaults
   */
  async reset(): Promise<GlobalRoutingPreferences> {
    const reset = { ...DEFAULT_PREFERENCES, updatedAt: Date.now() };
    await storage.setItem(ROUTING_PREFERENCES_KEY, reset);
    return reset;
  }
}

// Singleton instance
let store: RoutingPreferencesStore | null = null;

export function getRoutingPreferencesStore(): RoutingPreferencesStore {
  if (!store) {
    store = new RoutingPreferencesStore();
  }
  return store;
}
