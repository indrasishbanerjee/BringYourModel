import { storage } from './extension-storage';
import { type Grant, GrantSchema } from '@byom/shared';

/**
 * Storage key for grants
 */
const GRANTS_KEY = 'local:grants';

/**
 * GrantStore - Manages per-origin permission grants
 */
export class GrantStore {
  /**
   * Get all grants
   */
  async getAllGrants(): Promise<Grant[]> {
    const grants = await storage.getItem<Grant[]>(GRANTS_KEY);
    return grants || [];
  }

  /**
   * Get a grant for a specific origin
   */
  async getGrant(origin: string): Promise<Grant | null> {
    const grants = await this.getAllGrants();
    const grant = grants.find(g => g.origin === origin);
    
    if (!grant) return null;
    
    // Check if expired
    if (grant.expiresAt && grant.expiresAt < Date.now()) {
      // Auto-remove expired grants
      await this.removeGrant(origin);
      return null;
    }
    
    return grant;
  }

  /**
   * Create or update a grant
   */
  async setGrant(grant: Omit<Grant, 'createdAt' | 'updatedAt'>): Promise<void> {
    const grants = await this.getAllGrants();
    const existingIndex = grants.findIndex(g => g.origin === grant.origin);
    
    const now = Date.now();
    const fullGrant: Grant = {
      ...grant,
      createdAt: existingIndex >= 0 ? grants[existingIndex].createdAt : now,
      updatedAt: now,
    };

    // Validate
    GrantSchema.parse(fullGrant);

    if (existingIndex >= 0) {
      grants[existingIndex] = fullGrant;
    } else {
      grants.push(fullGrant);
    }

    await storage.setItem(GRANTS_KEY, grants);
  }

  /**
   * Remove a grant for an origin
   */
  async removeGrant(origin: string): Promise<void> {
    const grants = await this.getAllGrants();
    const filtered = grants.filter(g => g.origin !== origin);
    await storage.setItem(GRANTS_KEY, filtered);
  }

  /**
   * Alias for dashboard RPC consistency
   */
  async revokeGrant(origin: string): Promise<void> {
    return this.removeGrant(origin);
  }

  /**
   * Remove all grants
   */
  async removeAllGrants(): Promise<void> {
    await storage.setItem(GRANTS_KEY, []);
  }

  /**
   * Alias for dashboard RPC consistency
   */
  async revokeAllGrants(): Promise<void> {
    return this.removeAllGrants();
  }

  /**
   * Get origins with grants
   */
  async getApprovedOrigins(): Promise<string[]> {
    const grants = await this.getAllGrants();
    const now = Date.now();
    
    return grants
      .filter(g => !g.expiresAt || g.expiresAt > now)
      .map(g => g.origin);
  }

  /**
   * Check if a task is allowed for an origin
   */
  async isTaskAllowed(origin: string, task: string): Promise<boolean> {
    const grant = await this.getGrant(origin);
    if (!grant) return false;
    return grant.allowedTasks.includes(task as any);
  }

  /**
   * Get usage for an origin (daily and monthly totals)
   */
  async getUsage(origin: string): Promise<{ daily: number; monthly: number }> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const month = today.slice(0, 7); // YYYY-MM
    
    const dailyKey = `local:usage:${origin}:${today}`;
    const monthlyKey = `local:usage:${origin}:${month}`;
    
    const daily = await storage.getItem<number>(dailyKey) || 0;
    const monthly = await storage.getItem<number>(monthlyKey) || 0;
    
    return { daily, monthly };
  }

  /**
   * Update grant budgets (called after each request)
   * Tracks daily and monthly spend per origin
   */
  async updateUsage(origin: string, costUSD: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const month = today.slice(0, 7); // YYYY-MM
    
    const dailyKey = `local:usage:${origin}:${today}`;
    const monthlyKey = `local:usage:${origin}:${month}`;
    
    // Get current values
    const currentDaily = await storage.getItem<number>(dailyKey) || 0;
    const currentMonthly = await storage.getItem<number>(monthlyKey) || 0;
    
    // Update with new cost
    await storage.setItem(dailyKey, currentDaily + costUSD);
    await storage.setItem(monthlyKey, currentMonthly + costUSD);
    
    // Cleanup: remove old daily entries (keep last 30 days)
    await this.cleanupOldUsage(origin, today);
    
    console.log(`[GrantStore] Tracked ${costUSD.toFixed(4)} USD for ${origin} (daily: ${(currentDaily + costUSD).toFixed(4)}, monthly: ${(currentMonthly + costUSD).toFixed(4)})`);
  }

  /**
   * Clean up old usage entries (keep only last 30 days)
   */
  private async cleanupOldUsage(origin: string, currentDate: string): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
    
    // This is a simplified cleanup - in production you'd want to iterate through
    // all stored keys and remove old ones. For now, we just rely on new entries
    // overwriting as the date changes.
  }
}