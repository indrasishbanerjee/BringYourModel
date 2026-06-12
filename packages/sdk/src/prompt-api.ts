import { getClient } from './client.js';
import type { AskRequest } from './protocol.js';
import { assertBrowser } from './compat/shared.js';
import { mapCompatError } from './openai/errors.js';

export type LanguageModelAvailability =
  | 'unavailable'
  | 'downloadable'
  | 'downloading'
  | 'available'
  | 'readily';

export interface LanguageModelCreateOptions {
  systemPrompt?: string;
  initialPrompts?: Array<{ role: 'user' | 'assistant'; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface PromptOptions {
  signal?: AbortSignal;
}

export interface LanguageModelSession {
  prompt(input: string, options?: PromptOptions): Promise<string>;
  promptStreaming(input: string, options?: PromptOptions): AsyncIterable<string>;
  destroy(): void;
  clone(): LanguageModelSession;
}

export interface PromptApiSurface {
  languageModel: {
    availability(options?: LanguageModelCreateOptions): Promise<LanguageModelAvailability>;
    create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
  };
}

export type InstallPromptApiMode = 'if-missing' | 'prefer-byom' | 'force';

export interface InstallPromptApiResult {
  installed: boolean;
  reason?: 'native-present' | 'installed' | 'forced';
}

class ByomLanguageModelSession implements LanguageModelSession {
  private destroyed = false;
  private readonly history: Array<{ role: 'user' | 'assistant'; content: string }>;
  private readonly options: LanguageModelCreateOptions;

  constructor(options: LanguageModelCreateOptions = {}) {
    this.options = options;
    this.history = [...(options.initialPrompts ?? [])];
  }

  private assertActive(): void {
    if (this.destroyed) {
      throw new Error('LanguageModel session has been destroyed.');
    }
  }

  private buildRequest(input: string): AskRequest {
    const messages = [];
    if (this.options.systemPrompt) {
      messages.push({ role: 'system' as const, content: this.options.systemPrompt });
    }
    for (const entry of this.history) {
      messages.push({ role: entry.role, content: entry.content });
    }
    messages.push({ role: 'user' as const, content: input });
    return {
      messages,
      model: this.options.model,
      temperature: this.options.temperature,
      maxTokens: this.options.maxTokens,
    };
  }

  async prompt(input: string, options?: PromptOptions): Promise<string> {
    this.assertActive();
    const client = getClient();
    try {
      const result = await client.ask(this.buildRequest(input), options?.signal);
      this.history.push({ role: 'user', content: input });
      this.history.push({ role: 'assistant', content: result.text });
      return result.text;
    } catch (error) {
      throw mapCompatError(error);
    }
  }

  async *promptStreaming(input: string, options?: PromptOptions): AsyncIterable<string> {
    this.assertActive();
    const client = getClient();
    let fullText = '';
    try {
      const gen = client.stream(this.buildRequest(input), options?.signal);
      let step = await gen.next();
      while (!step.done) {
        fullText += step.value.text;
        yield step.value.text;
        step = await gen.next();
      }
      this.history.push({ role: 'user', content: input });
      this.history.push({ role: 'assistant', content: fullText });
    } catch (error) {
      throw mapCompatError(error);
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.history.length = 0;
  }

  clone(): LanguageModelSession {
    return new ByomLanguageModelSession({
      ...this.options,
      initialPrompts: [...this.history],
    });
  }
}

async function mapAvailability(): Promise<LanguageModelAvailability> {
  const client = getClient();
  const available = await client.isAvailable(1500);
  if (!available) {
    return 'unavailable';
  }
  const caps = await client.getCapabilities(1500);
  if (!caps) {
    return 'unavailable';
  }
  if (!caps.vaultUnlocked) {
    return 'downloadable';
  }
  return 'available';
}

export function createPromptApi(): PromptApiSurface {
  assertBrowser();
  return {
    languageModel: {
      availability: mapAvailability,
      create: async (options) => new ByomLanguageModelSession(options),
    },
  };
}

export function installPromptApiShim(config?: {
  target?: Window;
  mode?: InstallPromptApiMode;
}): InstallPromptApiResult {
  assertBrowser();
  const target = config?.target ?? window;
  const mode = config?.mode ?? 'if-missing';
  const globalTarget = target as Window & {
    LanguageModel?: PromptApiSurface['languageModel'];
  };

  if (globalTarget.LanguageModel && mode === 'if-missing') {
    return { installed: false, reason: 'native-present' };
  }

  const api = createPromptApi();
  globalTarget.LanguageModel = api.languageModel;

  return {
    installed: true,
    reason: mode === 'force' ? 'forced' : 'installed',
  };
}
