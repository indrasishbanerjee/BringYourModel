import type { ProviderId, TaskType } from '@byom/shared';
import { storage } from '../../storage/extension-storage';
import type { ScoreBreakdown } from './scorer';

const ROUTING_LOG_KEY = 'session:routingLog';
const MAX_ENTRIES = 20;

export interface RoutingDecisionEntry {
  timestamp: number;
  task: TaskType;
  provider: ProviderId;
  reason: string;
  mode: string;
  scoreBreakdown?: ScoreBreakdown;
  score?: number;
}

interface RoutingLogState {
  entries: RoutingDecisionEntry[];
}

const memoryLog: RoutingDecisionEntry[] = [];
let memoryOnly = false;

export class RoutingLog {
  private static async read(): Promise<RoutingLogState> {
    if (memoryOnly) {
      return { entries: [...memoryLog] };
    }
    try {
      const stored = await storage.getItem<RoutingLogState>(ROUTING_LOG_KEY);
      return stored ?? { entries: [] };
    } catch {
      memoryOnly = true;
      return { entries: [...memoryLog] };
    }
  }

  static async add(entry: RoutingDecisionEntry): Promise<void> {
    try {
      const state = await this.read();
      state.entries.unshift(entry);
      if (state.entries.length > MAX_ENTRIES) {
        state.entries.length = MAX_ENTRIES;
      }
      if (memoryOnly) {
        memoryLog.length = 0;
        memoryLog.push(...state.entries);
        return;
      }
      await storage.setItem(ROUTING_LOG_KEY, state);
    } catch {
      memoryOnly = true;
      memoryLog.unshift(entry);
      if (memoryLog.length > MAX_ENTRIES) {
        memoryLog.length = MAX_ENTRIES;
      }
    }
  }

  static async getRecent(limit = 5): Promise<RoutingDecisionEntry[]> {
    const state = await this.read();
    return state.entries.slice(0, limit);
  }

  static async clear(): Promise<void> {
    memoryLog.length = 0;
    if (memoryOnly) {
      return;
    }
    try {
      await storage.setItem(ROUTING_LOG_KEY, { entries: [] });
    } catch {
      memoryOnly = true;
    }
  }
}
