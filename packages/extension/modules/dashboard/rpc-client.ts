/**
 * Dashboard RPC Client
 * 
 * Typed client for communicating with the background script via chrome.runtime.sendMessage
 * Used by Options page, Popup, and other extension UI pages
 */

import type { ProviderConfig, Grant, UsageRecord, ProviderId, GlobalRoutingPreferences } from '@byom/shared';

// RPC Method types
export interface DashboardRPC {
  // Providers
  'dashboard:getProviders': {
    params: void;
    result: { providers: ProviderConfig[] };
  };
  'dashboard:addProvider': {
    params: { providerKind: ProviderId; label: string; apiKey?: string; baseURL?: string; defaultModel?: string; isEnabled?: boolean };
    result: { success: true; id: string } | { error: string };
  };
  'dashboard:removeProvider': {
    params: { id: string };
    result: { success: true } | { error: string };
  };
  'dashboard:updateProvider': {
    params: { id: string; updates: Partial<ProviderConfig> };
    result: { success: true } | { error: string };
  };
  'dashboard:testProvider': {
    params: { id: string };
    result: { success: true; models?: string[] } | { success: false; error: string };
  };

  // Grants
  'dashboard:getGrants': {
    params: void;
    result: { grants: Grant[] };
  };
  'dashboard:revokeGrant': {
    params: { origin: string };
    result: { success: true } | { error: string };
  };
  'dashboard:revokeAllGrants': {
    params: void;
    result: { success: true } | { error: string };
  };
  'dashboard:updateGrant': {
    params: { origin: string; updates: Partial<Grant> };
    result: { success: true } | { error: string };
  };

  // Usage
  'dashboard:getUsage': {
    params: { limit?: number };
    result: {
      stats: { totalRequests: number; totalCostUSD: number; totalOrigins: number };
      usage: UsageRecord[];
    };
  };
  'dashboard:getOriginUsage': {
    params: { origin: string };
    result: { usage: { daily: number; monthly: number } };
  };
  'dashboard:clearUsage': {
    params: void;
    result: { success: true } | { error: string };
  };

  // Vault
  'dashboard:getVaultStatus': {
    params: void;
    result: { isUnlocked: boolean };
  };
  'dashboard:unlockVault': {
    params: { passphrase: string };
    result: { success: true } | { error: string };
  };
  'dashboard:lockVault': {
    params: void;
    result: { success: true };
  };

  // Global Routing Preferences
  'dashboard:getRoutingPreferences': {
    params: void;
    result: { preferences: GlobalRoutingPreferences };
  };
  'dashboard:updateRoutingPreferences': {
    params: Partial<GlobalRoutingPreferences>;
    result: { preferences: GlobalRoutingPreferences } | { error: string };
  };
  'dashboard:setRoutingMode': {
    params: { mode: GlobalRoutingPreferences['mode'] };
    result: { preferences: GlobalRoutingPreferences } | { error: string };
  };
  'dashboard:setPreferredProvider': {
    params: { provider: ProviderId };
    result: { preferences: GlobalRoutingPreferences } | { error: string };
  };
  'dashboard:setTaskOverride': {
    params: { task: string; routing: string };
    result: { preferences: GlobalRoutingPreferences } | { error: string };
  };
  'dashboard:removeTaskOverride': {
    params: { task: string };
    result: { preferences: GlobalRoutingPreferences } | { error: string };
  };
  'dashboard:resetRoutingPreferences': {
    params: void;
    result: { preferences: GlobalRoutingPreferences } | { error: string };
  };
  'dashboard:getProviderHealth': {
    params: void;
    result: {
      health: Partial<
        Record<
          ProviderId,
          { successRate: number; avgLatencyMs: number; isHealthy: boolean; isCircuitOpen: boolean }
        >
      >;
    };
  };
  'dashboard:getRoutingLog': {
    params: void;
    result: {
      entries: Array<{
        timestamp: number;
        task: string;
        provider: ProviderId;
        reason: string;
        mode: string;
        score?: number;
      }>;
    };
  };
}

// RPC Client class
export class DashboardClient {
  /**
   * Send RPC request to background script
   */
  private async send<K extends keyof DashboardRPC>(
    kind: K,
    params: DashboardRPC[K]['params']
  ): Promise<DashboardRPC[K]['result']> {
    return new Promise((resolve, reject) => {
      // Spread params first, then RPC `kind` so method name wins over any overlapping keys.
      chrome.runtime.sendMessage(
        params === undefined ? { kind } : { ...(params as object), kind },
        (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  // Provider methods
  async getProviders(): Promise<ProviderConfig[]> {
    const result = await this.send('dashboard:getProviders', undefined);
    return result.providers;
  }

  async addProvider(params: {
    providerKind: ProviderId;
    label: string;
    apiKey?: string;
    baseURL?: string;
    defaultModel?: string;
    isEnabled?: boolean;
  }): Promise<string> {
    const result = await this.send('dashboard:addProvider', params);
    if ('error' in result) {
      throw new Error(result.error);
    }
    return result.id;
  }

  async removeProvider(id: string): Promise<void> {
    const result = await this.send('dashboard:removeProvider', { id });
    if ('error' in result) {
      throw new Error(result.error);
    }
  }

  async updateProvider(
    id: string,
    updates: Partial<ProviderConfig>
  ): Promise<void> {
    const result = await this.send('dashboard:updateProvider', { id, updates });
    if ('error' in result) {
      throw new Error(result.error);
    }
  }

  async testProvider(id: string): Promise<{ success: boolean; error?: string; models?: string[] }> {
    const result = await this.send('dashboard:testProvider', { id });
    if ('error' in result) {
      return { success: false, error: result.error };
    }
    return { success: true, models: result.models };
  }

  // Grant methods
  async getGrants(): Promise<Grant[]> {
    const result = await this.send('dashboard:getGrants', undefined);
    return result.grants;
  }

  async revokeGrant(origin: string): Promise<void> {
    const result = await this.send('dashboard:revokeGrant', { origin });
    if ('error' in result) {
      throw new Error(result.error);
    }
  }

  async revokeAllGrants(): Promise<void> {
    const result = await this.send('dashboard:revokeAllGrants', undefined);
    if ('error' in result) {
      throw new Error(result.error);
    }
  }

  async updateGrant(origin: string, updates: Partial<Grant>): Promise<void> {
    const result = await this.send('dashboard:updateGrant', { origin, updates });
    if ('error' in result) {
      throw new Error(result.error);
    }
  }

  // Usage methods
  async getUsage(limit?: number): Promise<{
    stats: { totalRequests: number; totalCostUSD: number; totalOrigins: number };
    usage: UsageRecord[];
  }> {
    const result = await this.send('dashboard:getUsage', { limit });
    return { stats: result.stats, usage: result.usage };
  }

  async getOriginUsage(origin: string): Promise<{ daily: number; monthly: number }> {
    const result = await this.send('dashboard:getOriginUsage', { origin });
    return result.usage;
  }

  async clearUsage(): Promise<void> {
    const result = await this.send('dashboard:clearUsage', undefined);
    if ('error' in result) {
      throw new Error(result.error);
    }
  }

  // Vault methods
  async getVaultStatus(): Promise<boolean> {
    const result = await this.send('dashboard:getVaultStatus', undefined);
    return result.isUnlocked;
  }

  async unlockVault(passphrase: string): Promise<void> {
    const result = await this.send('dashboard:unlockVault', { passphrase });
    if ('error' in result) {
      throw new Error(result.error);
    }
  }

  async lockVault(): Promise<void> {
    await this.send('dashboard:lockVault', undefined);
  }

  // Global Routing Preferences methods
  async getRoutingPreferences(): Promise<GlobalRoutingPreferences> {
    const result = await this.send('dashboard:getRoutingPreferences', undefined);
    return result.preferences;
  }

  async updateRoutingPreferences(updates: Partial<GlobalRoutingPreferences>): Promise<GlobalRoutingPreferences> {
    const result = await this.send('dashboard:updateRoutingPreferences', updates);
    if ('error' in result) {
      throw new Error(result.error);
    }
    return result.preferences;
  }

  async setRoutingMode(mode: GlobalRoutingPreferences['mode']): Promise<GlobalRoutingPreferences> {
    const result = await this.send('dashboard:setRoutingMode', { mode });
    if ('error' in result) {
      throw new Error(result.error);
    }
    return result.preferences;
  }

  async setPreferredProvider(provider: ProviderId): Promise<GlobalRoutingPreferences> {
    const result = await this.send('dashboard:setPreferredProvider', { provider });
    if ('error' in result) {
      throw new Error(result.error);
    }
    return result.preferences;
  }

  async setTaskOverride(task: string, routing: string): Promise<GlobalRoutingPreferences> {
    const result = await this.send('dashboard:setTaskOverride', { task, routing });
    if ('error' in result) {
      throw new Error(result.error);
    }
    return result.preferences;
  }

  async removeTaskOverride(task: string): Promise<GlobalRoutingPreferences> {
    const result = await this.send('dashboard:removeTaskOverride', { task });
    if ('error' in result) {
      throw new Error(result.error);
    }
    return result.preferences;
  }

  async resetRoutingPreferences(): Promise<GlobalRoutingPreferences> {
    const result = await this.send('dashboard:resetRoutingPreferences', undefined);
    if ('error' in result) {
      throw new Error(result.error);
    }
    return result.preferences;
  }

  async getProviderHealth(): Promise<
    Partial<
      Record<
        ProviderId,
        { successRate: number; avgLatencyMs: number; isHealthy: boolean; isCircuitOpen: boolean }
      >
    >
  > {
    const result = await this.send('dashboard:getProviderHealth', undefined);
    return result.health;
  }

  async getRoutingLog(): Promise<
    Array<{
      timestamp: number;
      task: string;
      provider: ProviderId;
      reason: string;
      mode: string;
      score?: number;
    }>
  > {
    const result = await this.send('dashboard:getRoutingLog', undefined);
    return result.entries;
  }

  /**
   * Subscribe to state invalidation events
   * Returns a function to unsubscribe
   */
  onStateInvalidate(
    callback: (topic: 'providers' | 'grants' | 'usage' | 'vault' | 'routing') => void
  ): () => void {
    const listener = (message: any) => {
      if (message?.kind === 'state:invalidate') {
        callback(message.topic);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }
}

// Singleton instance
let client: DashboardClient | null = null;

export function getDashboardClient(): DashboardClient {
  if (!client) {
    client = new DashboardClient();
  }
  return client;
}