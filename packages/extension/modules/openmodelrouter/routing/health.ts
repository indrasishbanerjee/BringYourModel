import type { ProviderId } from '@byom/shared';
import { storage } from '../../storage/extension-storage';

const HEALTH_KEY = 'session:providerHealth';
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_OPEN_MS = 60_000;
const HISTORY_SIZE = 20;

interface ProviderHealthEntry {
  successes: number;
  failures: number;
  consecutiveFailures: number;
  latencies: number[];
  lastSuccessAt?: number;
  circuitOpenedAt?: number;
}

interface HealthState {
  providers: Partial<Record<ProviderId, ProviderHealthEntry>>;
}

export interface ProviderHealthSnapshot {
  successRate: number;
  avgLatencyMs: number;
  isHealthy: boolean;
  isCircuitOpen: boolean;
}

/**
 * Tracks per-provider success/failure and latency for routing + circuit breaking.
 * Session-scoped — resets when the service worker restarts.
 */
export class ProviderHealthTracker {
  private state: HealthState = { providers: {} };
  private loaded = false;
  private memoryOnly = false;

  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const stored = await storage.getItem<HealthState>(HEALTH_KEY);
      if (stored) {
        this.state = stored;
      }
    } catch {
      this.memoryOnly = true;
    }
    this.loaded = true;
  }

  private getOrCreate(provider: ProviderId): ProviderHealthEntry {
    if (!this.state.providers[provider]) {
      this.state.providers[provider] = {
        successes: 0,
        failures: 0,
        consecutiveFailures: 0,
        latencies: [],
      };
    }
    return this.state.providers[provider]!;
  }

  private async persist(): Promise<void> {
    if (this.memoryOnly) {
      return;
    }
    try {
      await storage.setItem(HEALTH_KEY, this.state);
    } catch {
      this.memoryOnly = true;
    }
  }

  async recordSuccess(provider: ProviderId, latencyMs: number): Promise<void> {
    await this.ensureLoaded();
    const entry = this.getOrCreate(provider);
    entry.successes += 1;
    entry.consecutiveFailures = 0;
    entry.circuitOpenedAt = undefined;
    entry.latencies.push(latencyMs);
    if (entry.latencies.length > HISTORY_SIZE) {
      entry.latencies.shift();
    }
    entry.lastSuccessAt = Date.now();
    await this.persist();
  }

  async recordFailure(provider: ProviderId, _error: string): Promise<void> {
    await this.ensureLoaded();
    const entry = this.getOrCreate(provider);
    entry.failures += 1;
    entry.consecutiveFailures += 1;
    if (entry.consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
      entry.circuitOpenedAt = Date.now();
    }
    await this.persist();
  }

  isCircuitOpen(provider: ProviderId): boolean {
    const entry = this.state.providers[provider];
    if (!entry?.circuitOpenedAt) {
      return false;
    }
    if (Date.now() - entry.circuitOpenedAt > CIRCUIT_OPEN_MS) {
      entry.circuitOpenedAt = undefined;
      entry.consecutiveFailures = 0;
      return false;
    }
    return true;
  }

  getHealth(provider: ProviderId): ProviderHealthSnapshot {
    const entry = this.state.providers[provider];
    if (!entry) {
      return { successRate: 1, avgLatencyMs: 0, isHealthy: true, isCircuitOpen: false };
    }

    const total = entry.successes + entry.failures;
    const successRate = total === 0 ? 1 : entry.successes / total;
    const avgLatencyMs =
      entry.latencies.length > 0
        ? entry.latencies.reduce((sum, value) => sum + value, 0) / entry.latencies.length
        : 0;
    const circuitOpen = this.isCircuitOpen(provider);
    const isHealthy = !circuitOpen && successRate >= 0.7;

    return { successRate, avgLatencyMs, isHealthy, isCircuitOpen: circuitOpen };
  }

  getAllHealth(): Partial<Record<ProviderId, ProviderHealthSnapshot>> {
    const result: Partial<Record<ProviderId, ProviderHealthSnapshot>> = {};
    for (const provider of Object.keys(this.state.providers) as ProviderId[]) {
      result[provider] = this.getHealth(provider);
    }
    return result;
  }
}

let tracker: ProviderHealthTracker | null = null;

export function getProviderHealthTracker(): ProviderHealthTracker {
  if (!tracker) {
    tracker = new ProviderHealthTracker();
  }
  return tracker;
}
