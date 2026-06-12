import type { Message } from '../protocol.js';

let idCounter = 0;

export function createCompatId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_byom_${Date.now()}_${idCounter}`;
}

export function toUnixSeconds(date = new Date()): number {
  return Math.floor(date.getTime() / 1000);
}

export function normalizeMessages(
  messages: Array<{ role: string; content: string | null | unknown }>
): Message[] {
  return messages.map((m) => ({
    role: m.role as Message['role'],
    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content ?? ''),
  }));
}

export function withAbortSignal<T extends { signal?: AbortSignal }>(
  options?: T
): AbortSignal | undefined {
  return options?.signal;
}

export function assertBrowser(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('BYOM SDK compatibility adapters are browser-only.');
  }
}
