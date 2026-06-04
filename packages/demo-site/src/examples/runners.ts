import {
  byom,
  ExtensionNotInstalledError,
  PermissionDeniedError,
  BudgetExceededError,
  ChatSession,
  type Capabilities,
  type Message,
} from '@byomsdk/sdk';
import type { Recipe, RecipeFormState, RecipeRunResult, ResponseMetadata } from './types';

export function formatError(e: unknown): string {
  if (e instanceof ExtensionNotInstalledError) {
    return 'Please install the Bring Your Model extension';
  }
  if (e instanceof PermissionDeniedError) {
    return 'Permission denied. Please approve this site in the extension.';
  }
  if (e instanceof BudgetExceededError) {
    return 'Budget exceeded. Please check your spending limits in the extension.';
  }
  if (e instanceof Error && e.message.toLowerCase().includes('abort')) {
    return 'Operation was cancelled';
  }
  return e instanceof Error ? e.message : 'An error occurred';
}

function metaFromAskLike(response: {
  model: string;
  provider: string;
  costUSD: number;
  latencyMs: number;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
}): ResponseMetadata {
  return {
    model: response.model,
    provider: response.provider,
    costUSD: response.costUSD,
    latencyMs: response.latencyMs,
    usage: response.usage,
  };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function checkExtension(): Promise<{
  available: boolean;
  capabilities: Capabilities | null;
}> {
  const available = await byom.isAvailable();
  const capabilities = available ? await byom.getCapabilities() : null;
  return { available, capabilities };
}

export function formatCapabilitiesReport(
  available: boolean,
  capabilities: Capabilities | null
): RecipeRunResult {
  if (!available) {
    return {
      text: 'Extension not detected.\n\nInstall the BYOM extension and reload this page.',
    };
  }
  if (!capabilities) {
    return {
      text: 'Extension detected but capabilities could not be loaded (timeout). Try again.',
    };
  }
  const lines = [
    `Extension version: ${capabilities.extensionVersion}`,
    `Site approved: ${capabilities.siteApproved ? 'yes' : 'no — run any recipe to trigger consent'}`,
    `Vault unlocked: ${capabilities.vaultUnlocked ? 'yes' : 'no — unlock in the extension popup'}`,
    `Supported tasks: ${capabilities.supportedTasks.join(', ')}`,
  ];
  return { text: lines.join('\n') };
}

export async function runRecipe(
  recipe: Recipe,
  form: RecipeFormState,
  chatSession: ChatSession | null,
  signal?: AbortSignal,
  onStreamChunk?: (text: string) => void
): Promise<{ result: RecipeRunResult; chatSession: ChatSession | null; chatMessages?: Message[] }> {
  switch (recipe.kind) {
    case 'extension-check': {
      const { available, capabilities } = await checkExtension();
      return { result: formatCapabilitiesReport(available, capabilities), chatSession };
    }

    case 'ask-summarize': {
      const response = await byom.ask({ task: 'summarize', input: form.input }, signal);
      return {
        result: { text: response.text, metadata: metaFromAskLike(response) },
        chatSession,
      };
    }

    case 'ask-draft': {
      const response = await byom.ask({ task: 'draft', input: form.input }, signal);
      return {
        result: { text: response.text, metadata: metaFromAskLike(response) },
        chatSession,
      };
    }

    case 'stream': {
      let fullText = '';
      const stream = byom.stream({ input: form.input }, signal);
      for await (const chunk of stream) {
        fullText += chunk.text;
        onStreamChunk?.(fullText);
      }
      return { result: { text: fullText }, chatSession };
    }

    case 'classify': {
      const cats = form.categories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      const response = await byom.classify(form.input, cats, { signal });
      return {
        result: {
          text: `Category: ${response.category}\nConfidence: ${(response.confidence * 100).toFixed(1)}%`,
          metadata: metaFromAskLike(response),
        },
        chatSession,
      };
    }

    case 'extract': {
      const properties = JSON.parse(form.extractSchema) as Record<string, unknown>;
      const response = await byom.extract({
        input: form.input,
        schema: { type: 'object', properties },
      }, signal);
      return {
        result: {
          text: JSON.stringify(response, null, 2),
          monospace: true,
        },
        chatSession,
      };
    }

    case 'embed-faq': {
      const [queryRes, faqRes] = await Promise.all([
        byom.embed({ input: form.input }, signal),
        byom.embed({ input: form.inputSecondary }, signal),
      ]);
      const score = cosineSimilarity(queryRes.embedding, faqRes.embedding);
      const text = [
        `Query: "${form.input.slice(0, 80)}${form.input.length > 80 ? '…' : ''}"`,
        `FAQ entry: "${form.inputSecondary.slice(0, 80)}${form.inputSecondary.length > 80 ? '…' : ''}"`,
        '',
        `Cosine similarity: ${(score * 100).toFixed(1)}%`,
        score >= 0.75 ? 'Match: likely relevant FAQ' : 'Match: weak — consider another FAQ or rephrase',
        '',
        `Embedding dimensions: ${queryRes.embedding.length}`,
      ].join('\n');
      return {
        result: {
          text,
          metadata: {
            model: queryRes.model,
            provider: queryRes.provider,
            usage: { tokens: queryRes.usage.tokens },
          },
          monospace: false,
        },
        chatSession,
      };
    }

    case 'chat-send': {
      let session = chatSession;
      if (!session) {
        session = byom.chat({
          systemMessage: form.systemMessage || undefined,
        });
      }
      const response = await session.send(form.input, signal);
      return {
        result: { text: response.text, metadata: metaFromAskLike(response) },
        chatSession: session,
        chatMessages: session.history(),
      };
    }

    case 'chat-stream': {
      let session = chatSession;
      if (!session) {
        session = byom.chat({
          systemMessage: form.systemMessage || undefined,
        });
      }
      let fullText = '';
      const stream = session.stream(form.input, signal);
      for await (const chunk of stream) {
        fullText += chunk.text;
        onStreamChunk?.(fullText);
      }
      return {
        result: { text: fullText },
        chatSession: session,
        chatMessages: session.history(),
      };
    }

    default:
      return { result: { text: '' }, chatSession };
  }
}

export function formFromDefaults(defaults: Recipe['defaults']): RecipeFormState {
  return {
    input: defaults.input ?? '',
    inputSecondary: defaults.inputSecondary ?? '',
    categories: defaults.categories ?? 'billing, technical, sales, other',
    extractSchema:
      defaults.extractSchema ??
      '{"name": {"type": "string"}, "email": {"type": "string"}, "company": {"type": "string"}}',
    systemMessage:
      defaults.systemMessage ??
      'You are a helpful customer support agent for Acme SaaS. Be concise and professional.',
  };
}
