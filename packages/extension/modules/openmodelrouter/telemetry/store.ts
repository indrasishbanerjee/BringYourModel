import Dexie, { type Table } from 'dexie';
import { type UsageRecord, type ProviderId, type TaskType } from '@byom/shared';

/**
 * IndexedDB database for telemetry and usage history
 */
export class TelemetryDB extends Dexie {
  usage!: Table<UsageRecord>;
  dailyTotals!: Table<{ id: string; date: string; origin: string; costUSD: number; requestCount: number }>;
  providerTotals!: Table<{ id: string; date: string; provider: ProviderId; costUSD: number; requestCount: number }>;

  constructor() {
    super('BringYourModelTelemetry');
    
    this.version(1).stores({
      usage: 'id, timestamp, origin, provider, task',
      dailyTotals: 'id, [date+origin]',
      providerTotals: 'id, [date+provider]',
    });
  }
}

/**
 * TelemetryStore - Manages usage history and analytics
 */
export class TelemetryStore {
  private db: TelemetryDB;

  constructor() {
    this.db = new TelemetryDB();
  }

  /**
   * Record a usage event
   */
  async recordUsage(usage: UsageRecord): Promise<void> {
    await this.db.usage.add(usage);
    
    // Update daily totals
    const date = new Date(usage.timestamp).toISOString().split('T')[0];
    const dailyId = `${date}-${usage.origin}`;
    
    const existingDaily = await this.db.dailyTotals.get(dailyId);
    if (existingDaily) {
      await this.db.dailyTotals.update(dailyId, {
        costUSD: existingDaily.costUSD + usage.costUSD,
        requestCount: existingDaily.requestCount + 1,
      });
    } else {
      await this.db.dailyTotals.add({
        id: dailyId,
        date,
        origin: usage.origin,
        costUSD: usage.costUSD,
        requestCount: 1,
      });
    }

    // Update provider totals
    const providerId = `${date}-${usage.provider}`;
    
    const existingProvider = await this.db.providerTotals.get(providerId);
    if (existingProvider) {
      await this.db.providerTotals.update(providerId, {
        costUSD: existingProvider.costUSD + usage.costUSD,
        requestCount: existingProvider.requestCount + 1,
      });
    } else {
      await this.db.providerTotals.add({
        id: providerId,
        date,
        provider: usage.provider,
        costUSD: usage.costUSD,
        requestCount: 1,
      });
    }
  }

  /**
   * Get usage history for an origin
   */
  async getUsageForOrigin(origin: string, limit: number = 100): Promise<UsageRecord[]> {
    return this.db.usage
      .where('origin')
      .equals(origin)
      .reverse()
      .limit(limit)
      .toArray();
  }

  /**
   * Get daily totals for an origin
   */
  async getDailyTotalsForOrigin(origin: string, days: number = 30): Promise<{ date: string; costUSD: number; requestCount: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    return this.db.dailyTotals
      .where('origin')
      .equals(origin)
      .filter(record => record.date >= startDateStr)
      .toArray();
  }

  /**
   * Get daily spend for an origin
   */
  async getDailySpend(origin: string, date?: string): Promise<number> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const id = `${targetDate}-${origin}`;
    
    const record = await this.db.dailyTotals.get(id);
    return record?.costUSD || 0;
  }

  /**
   * Get monthly spend for an origin
   */
  async getMonthlySpend(origin: string, yearMonth?: string): Promise<number> {
    const targetMonth = yearMonth || new Date().toISOString().slice(0, 7);
    
    const records = await this.db.dailyTotals
      .where('origin')
      .equals(origin)
      .filter(record => record.date.startsWith(targetMonth))
      .toArray();
    
    return records.reduce((sum, r) => sum + r.costUSD, 0);
  }

  /**
   * Get total usage statistics
   */
  async getTotalStats(): Promise<{
    totalRequests: number;
    totalCostUSD: number;
    totalOrigins: number;
  }> {
    const allUsage = await this.db.usage.toArray();
    const uniqueOrigins = new Set(allUsage.map(u => u.origin));
    
    return {
      totalRequests: allUsage.length,
      totalCostUSD: allUsage.reduce((sum, u) => sum + u.costUSD, 0),
      totalOrigins: uniqueOrigins.size,
    };
  }

  /**
   * Get usage by provider
   */
  async getUsageByProvider(days: number = 30): Promise<{ provider: ProviderId; costUSD: number; requestCount: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const records = await this.db.providerTotals
      .filter(record => record.date >= startDateStr)
      .toArray();

    // Aggregate by provider
    const byProvider = new Map<ProviderId, { costUSD: number; requestCount: number }>();
    
    for (const record of records) {
      const existing = byProvider.get(record.provider);
      if (existing) {
        existing.costUSD += record.costUSD;
        existing.requestCount += record.requestCount;
      } else {
        byProvider.set(record.provider, {
          costUSD: record.costUSD,
          requestCount: record.requestCount,
        });
      }
    }

    return Array.from(byProvider.entries()).map(([provider, stats]) => ({
      provider,
      ...stats,
    }));
  }

  /**
   * Get recent usage with pagination
   */
  async getRecentUsage(
    options: {
      origin?: string;
      provider?: ProviderId;
      task?: TaskType;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ records: UsageRecord[]; total: number }> {
    let collection = this.db.usage.toCollection();

    if (options.origin) {
      collection = this.db.usage.where('origin').equals(options.origin);
    }

    if (options.provider) {
      collection = collection.filter(r => r.provider === options.provider);
    }

    if (options.task) {
      collection = collection.filter(r => r.task === options.task);
    }

    const total = await collection.count();
    
    const records = await collection
      .reverse()
      .offset(options.offset || 0)
      .limit(options.limit || 50)
      .toArray();

    return { records, total };
  }

  /**
   * Clear all telemetry data
   */
  async clearAll(): Promise<void> {
    await this.db.usage.clear();
    await this.db.dailyTotals.clear();
    await this.db.providerTotals.clear();
  }

  /**
   * Export all data for backup
   */
  async exportAll(): Promise<{
    usage: UsageRecord[];
    dailyTotals: any[];
    providerTotals: any[];
  }> {
    return {
      usage: await this.db.usage.toArray(),
      dailyTotals: await this.db.dailyTotals.toArray(),
      providerTotals: await this.db.providerTotals.toArray(),
    };
  }
}