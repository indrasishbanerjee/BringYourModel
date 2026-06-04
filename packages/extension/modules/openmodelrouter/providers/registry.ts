import type { ProviderConfig, ProviderId, TaskType } from '@byom/shared';
import { createOpenAiProvider, createAnthropicProvider, createGoogleProvider, testOpenAiConnection, testAnthropicConnection, testGoogleConnection } from './native';
import { createMistralProvider, testMistralConnection } from './mistral';
import { createGroqProvider, testGroqConnection } from './groq';
import { createCohereProvider, testCohereConnection } from './cohere';
import { createDeepSeekProvider, testDeepSeekConnection } from './deepseek';
import { createTogetherProvider, testTogetherConnection } from './together';
import { createFireworksProvider, testFireworksConnection } from './fireworks';
import { createPerplexityProvider, testPerplexityConnection } from './perplexity';
import { createXaiProvider, testXaiConnection } from './xai';
import { createCerebrasProvider, testCerebrasConnection } from './cerebras';
import { createOpenRouterProvider, testOpenRouterConnection } from './openrouter';
import { createOllamaProvider, testOllamaConnection } from './ollama';
import { createLmStudioProvider, testLmStudioConnection } from './lmstudio';

export type ProviderCategory = 'cloud-native' | 'cloud-compatible' | 'local';
export type ProviderAliasTag = 'fast' | 'reasoning' | 'cheap' | 'private' | 'local';

export interface ProviderMeta {
  id: ProviderId;
  displayName: string;
  category: ProviderCategory;
  requiresApiKey: boolean;
  supportsBaseURL: boolean;
  defaultBaseURL?: string;
  defaultModel: string;
  knownModels: string[];
  capabilities: TaskType[];
  aliasTags: ProviderAliasTag[];
  docsURL: string;
  createAdapter: (apiKey: string, config: ProviderConfig) => unknown;
  testConnection?: (apiKey: string, baseURL?: string) => Promise<void>;
}

const ALL_CHAT_TASKS: TaskType[] = ['ask', 'stream', 'classify', 'extract', 'chat'];
const FULL_TASKS: TaskType[] = [...ALL_CHAT_TASKS, 'embed'];

function wrapOpenRouterTest(apiKey: string): Promise<void> {
  return testOpenRouterConnection(apiKey).then((result) => {
    if (!result.success) {
      throw new Error(result.error || 'Failed to connect to OpenRouter');
    }
  });
}

function wrapOllamaTest(_apiKey: string, baseURL?: string): Promise<void> {
  return testOllamaConnection(baseURL || 'http://localhost:11434').then((result) => {
    if (!result.success) {
      throw new Error(result.error || 'Failed to connect to Ollama');
    }
  });
}

export const PROVIDER_REGISTRY: Record<ProviderId, ProviderMeta> = {
  openai: {
    id: 'openai',
    displayName: 'OpenAI',
    category: 'cloud-native',
    requiresApiKey: true,
    supportsBaseURL: true,
    defaultModel: 'gpt-4o-mini',
    knownModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'text-embedding-3-small'],
    capabilities: FULL_TASKS,
    aliasTags: ['fast', 'reasoning', 'cheap'],
    docsURL: 'https://platform.openai.com/docs',
    createAdapter: (apiKey, config) => createOpenAiProvider({ apiKey, baseURL: config.baseURL }),
    testConnection: testOpenAiConnection,
  },
  anthropic: {
    id: 'anthropic',
    displayName: 'Anthropic',
    category: 'cloud-native',
    requiresApiKey: true,
    supportsBaseURL: false,
    defaultModel: 'claude-3-haiku-20240307',
    knownModels: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    capabilities: ALL_CHAT_TASKS,
    aliasTags: ['reasoning'],
    docsURL: 'https://docs.anthropic.com',
    createAdapter: (apiKey) => createAnthropicProvider({ apiKey }),
    testConnection: testAnthropicConnection,
  },
  google: {
    id: 'google',
    displayName: 'Google',
    category: 'cloud-native',
    requiresApiKey: true,
    supportsBaseURL: false,
    defaultModel: 'gemini-2.5-flash',
    knownModels: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-pro', 'text-embedding-004'],
    capabilities: FULL_TASKS,
    aliasTags: ['fast', 'reasoning'],
    docsURL: 'https://ai.google.dev/docs',
    createAdapter: (apiKey) => createGoogleProvider({ apiKey }),
    testConnection: testGoogleConnection,
  },
  mistral: {
    id: 'mistral',
    displayName: 'Mistral AI',
    category: 'cloud-native',
    requiresApiKey: true,
    supportsBaseURL: false,
    defaultModel: 'mistral-large-latest',
    knownModels: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest', 'open-mistral-nemo'],
    capabilities: ALL_CHAT_TASKS,
    aliasTags: ['reasoning'],
    docsURL: 'https://docs.mistral.ai',
    createAdapter: (apiKey) => createMistralProvider({ apiKey }),
    testConnection: testMistralConnection,
  },
  groq: {
    id: 'groq',
    displayName: 'Groq',
    category: 'cloud-native',
    requiresApiKey: true,
    supportsBaseURL: false,
    defaultModel: 'llama-3.3-70b-versatile',
    knownModels: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    capabilities: ALL_CHAT_TASKS,
    aliasTags: ['fast'],
    docsURL: 'https://console.groq.com/docs',
    createAdapter: (apiKey) => createGroqProvider({ apiKey }),
    testConnection: testGroqConnection,
  },
  cohere: {
    id: 'cohere',
    displayName: 'Cohere',
    category: 'cloud-native',
    requiresApiKey: true,
    supportsBaseURL: false,
    defaultModel: 'command-r-plus',
    knownModels: ['command-r-plus', 'command-r', 'command-light', 'embed-english-v3.0'],
    capabilities: FULL_TASKS,
    aliasTags: ['reasoning'],
    docsURL: 'https://docs.cohere.com',
    createAdapter: (apiKey) => createCohereProvider({ apiKey }),
    testConnection: testCohereConnection,
  },
  deepseek: {
    id: 'deepseek',
    displayName: 'DeepSeek',
    category: 'cloud-compatible',
    requiresApiKey: true,
    supportsBaseURL: true,
    defaultBaseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    knownModels: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder'],
    capabilities: ALL_CHAT_TASKS,
    aliasTags: ['cheap'],
    docsURL: 'https://platform.deepseek.com/docs',
    createAdapter: (apiKey, config) => createDeepSeekProvider({ apiKey, baseURL: config.baseURL }),
    testConnection: testDeepSeekConnection,
  },
  together: {
    id: 'together',
    displayName: 'Together AI',
    category: 'cloud-compatible',
    requiresApiKey: true,
    supportsBaseURL: true,
    defaultBaseURL: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
    knownModels: [
      'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
      'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
    ],
    capabilities: ALL_CHAT_TASKS,
    aliasTags: ['cheap'],
    docsURL: 'https://docs.together.ai',
    createAdapter: (apiKey, config) => createTogetherProvider({ apiKey, baseURL: config.baseURL }),
    testConnection: testTogetherConnection,
  },
  fireworks: {
    id: 'fireworks',
    displayName: 'Fireworks AI',
    category: 'cloud-compatible',
    requiresApiKey: true,
    supportsBaseURL: true,
    defaultBaseURL: 'https://api.fireworks.ai/inference/v1',
    defaultModel: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
    knownModels: [
      'accounts/fireworks/models/llama-v3p1-70b-instruct',
      'accounts/fireworks/models/mixtral-8x7b-instruct',
    ],
    capabilities: ALL_CHAT_TASKS,
    aliasTags: ['fast'],
    docsURL: 'https://docs.fireworks.ai',
    createAdapter: (apiKey, config) => createFireworksProvider({ apiKey, baseURL: config.baseURL }),
    testConnection: testFireworksConnection,
  },
  perplexity: {
    id: 'perplexity',
    displayName: 'Perplexity',
    category: 'cloud-compatible',
    requiresApiKey: true,
    supportsBaseURL: true,
    defaultBaseURL: 'https://api.perplexity.ai',
    defaultModel: 'sonar-pro',
    knownModels: ['sonar-pro', 'sonar', 'sonar-reasoning'],
    capabilities: ALL_CHAT_TASKS,
    aliasTags: ['reasoning'],
    docsURL: 'https://docs.perplexity.ai',
    createAdapter: (apiKey, config) => createPerplexityProvider({ apiKey, baseURL: config.baseURL }),
    testConnection: testPerplexityConnection,
  },
  xai: {
    id: 'xai',
    displayName: 'xAI (Grok)',
    category: 'cloud-compatible',
    requiresApiKey: true,
    supportsBaseURL: true,
    defaultBaseURL: 'https://api.x.ai/v1',
    defaultModel: 'grok-3',
    knownModels: ['grok-3', 'grok-3-fast', 'grok-2-1212'],
    capabilities: ALL_CHAT_TASKS,
    aliasTags: ['reasoning'],
    docsURL: 'https://docs.x.ai',
    createAdapter: (apiKey, config) => createXaiProvider({ apiKey, baseURL: config.baseURL }),
    testConnection: testXaiConnection,
  },
  cerebras: {
    id: 'cerebras',
    displayName: 'Cerebras',
    category: 'cloud-compatible',
    requiresApiKey: true,
    supportsBaseURL: true,
    defaultBaseURL: 'https://api.cerebras.ai/v1',
    defaultModel: 'llama3.1-70b',
    knownModels: ['llama3.1-70b', 'llama3.1-8b'],
    capabilities: ALL_CHAT_TASKS,
    aliasTags: ['fast'],
    docsURL: 'https://inference-docs.cerebras.ai',
    createAdapter: (apiKey, config) => createCerebrasProvider({ apiKey, baseURL: config.baseURL }),
    testConnection: testCerebrasConnection,
  },
  openrouter: {
    id: 'openrouter',
    displayName: 'OpenRouter',
    category: 'cloud-compatible',
    requiresApiKey: true,
    supportsBaseURL: true,
    defaultBaseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.2-3b-instruct',
    knownModels: [
      'meta-llama/llama-3.2-3b-instruct',
      'meta-llama/llama-3.1-70b-instruct',
      'anthropic/claude-3.5-sonnet',
    ],
    capabilities: ALL_CHAT_TASKS,
    aliasTags: ['cheap', 'fast'],
    docsURL: 'https://openrouter.ai/docs',
    createAdapter: (apiKey, config) => createOpenRouterProvider({ apiKey, baseURL: config.baseURL }),
    testConnection: wrapOpenRouterTest,
  },
  ollama: {
    id: 'ollama',
    displayName: 'Ollama',
    category: 'local',
    requiresApiKey: false,
    supportsBaseURL: true,
    defaultBaseURL: 'http://localhost:11434',
    defaultModel: 'llama3.2',
    knownModels: ['llama3.2', 'mistral', 'codellama', 'phi3'],
    capabilities: ALL_CHAT_TASKS,
    aliasTags: ['fast', 'cheap', 'private', 'local'],
    docsURL: 'https://github.com/ollama/ollama/blob/main/docs/api.md',
    createAdapter: (_apiKey, config) =>
      createOllamaProvider({ baseURL: config.baseURL || 'http://localhost:11434' }),
    testConnection: wrapOllamaTest,
  },
  lmstudio: {
    id: 'lmstudio',
    displayName: 'LM Studio',
    category: 'local',
    requiresApiKey: false,
    supportsBaseURL: true,
    defaultBaseURL: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    knownModels: ['local-model', 'llama-3.2-3b-instruct', 'mistral-7b-instruct'],
    capabilities: ALL_CHAT_TASKS,
    aliasTags: ['private', 'local'],
    docsURL: 'https://lmstudio.ai/docs',
    createAdapter: (apiKey, config) =>
      createLmStudioProvider({ apiKey: apiKey || undefined, baseURL: config.baseURL }),
    testConnection: (apiKey, baseURL) => testLmStudioConnection(baseURL, apiKey),
  },
};

export const LOCAL_PROVIDER_IDS: ProviderId[] = ['ollama', 'lmstudio'];

export const PROVIDER_CATEGORY_LABELS: Record<ProviderCategory, string> = {
  'cloud-native': 'Cloud Native',
  'cloud-compatible': 'OpenAI-Compatible',
  local: 'Local',
};

export function getProviderMeta(id: ProviderId): ProviderMeta {
  return PROVIDER_REGISTRY[id];
}

export function getDefaultModel(id: ProviderId): string {
  return PROVIDER_REGISTRY[id].defaultModel;
}

export function isLocalProvider(id: ProviderId): boolean {
  return LOCAL_PROVIDER_IDS.includes(id);
}

export function providerRequiresApiKey(id: ProviderId): boolean {
  return PROVIDER_REGISTRY[id].requiresApiKey;
}

export function providerSupportsBaseURL(id: ProviderId): boolean {
  return PROVIDER_REGISTRY[id].supportsBaseURL;
}

export function getProvidersByCategory(): Record<ProviderCategory, ProviderMeta[]> {
  const grouped: Record<ProviderCategory, ProviderMeta[]> = {
    'cloud-native': [],
    'cloud-compatible': [],
    local: [],
  };

  for (const meta of Object.values(PROVIDER_REGISTRY)) {
    grouped[meta.category].push(meta);
  }

  for (const category of Object.keys(grouped) as ProviderCategory[]) {
    grouped[category].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  return grouped;
}

export function buildTaskSupportMatrix(): Record<ProviderId, TaskType[]> {
  const matrix = {} as Record<ProviderId, TaskType[]>;
  for (const [id, meta] of Object.entries(PROVIDER_REGISTRY) as [ProviderId, ProviderMeta][]) {
    matrix[id] = meta.capabilities;
  }
  return matrix;
}

export async function testProviderConnection(
  kind: ProviderId,
  apiKey: string,
  baseURL?: string
): Promise<{ success: boolean; error?: string; models?: string[] }> {
  const meta = PROVIDER_REGISTRY[kind];
  if (!meta.testConnection) {
    return { success: true };
  }

  try {
    await meta.testConnection(apiKey, baseURL);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection test failed',
    };
  }
}

export function createProviderAdapter(kind: ProviderId, apiKey: string, config: ProviderConfig): unknown {
  return PROVIDER_REGISTRY[kind].createAdapter(apiKey, config);
}
