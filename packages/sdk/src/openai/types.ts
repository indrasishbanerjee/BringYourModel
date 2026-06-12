import type { AskResponse, StreamFinish } from '../protocol.js';

export interface OpenAIClientOptions {
  apiKey?: string;
  dangerouslyAllowBrowser?: boolean;
  timeout?: number;
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
}

export interface ChatCompletionMessageParam {
  role: 'system' | 'user' | 'assistant' | 'developer';
  content: string;
}

export interface ChatCompletionCreateParams {
  model: string;
  messages: ChatCompletionMessageParam[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ByomCompatMetadata {
  provider?: string;
  costUSD?: number;
  latencyMs?: number;
}

export interface ChatCompletion {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: 'assistant'; content: string };
    finish_reason: 'stop' | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  byom?: ByomCompatMetadata;
}

export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: { content?: string };
    finish_reason: 'stop' | null;
  }>;
  byom?: ByomCompatMetadata;
}

export interface ResponseCreateParams {
  model: string;
  input: string | ChatCompletionMessageParam[];
  temperature?: number;
  max_output_tokens?: number;
  stream?: boolean;
}

export interface OpenAIResponse {
  id: string;
  object: 'response';
  created_at: number;
  model: string;
  status: 'completed';
  output_text: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  byom?: ByomCompatMetadata;
}

export interface EmbeddingCreateParams {
  model: string;
  input: string | string[];
  concurrency?: number;
}

export interface EmbeddingList {
  object: 'list';
  data: Array<{
    object: 'embedding';
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
  byom?: ByomCompatMetadata;
}

export function mapAskToChatCompletion(
  result: AskResponse,
  model: string,
  id: string,
  created: number
): ChatCompletion {
  return {
    id,
    object: 'chat.completion',
    created,
    model: result.model ?? model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: result.text },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: result.usage.inputTokens,
      completion_tokens: result.usage.outputTokens,
      total_tokens: result.usage.totalTokens,
    },
    byom: {
      provider: result.provider,
      costUSD: result.costUSD,
      latencyMs: result.latencyMs,
    },
  };
}

export function mapFinishToChunkMeta(finish: StreamFinish): ByomCompatMetadata {
  return {
    provider: finish.provider,
    costUSD: finish.costUSD,
    latencyMs: finish.latencyMs,
  };
}
