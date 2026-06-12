import { getClient } from '../client.js';
import type { AskRequest } from '../protocol.js';
import {
  assertBrowser,
  createCompatId,
  normalizeMessages,
  toUnixSeconds,
  withAbortSignal,
} from '../compat/shared.js';
import { mapCompatError } from './errors.js';
import type { ChatCompletionMessageParam, OpenAIResponse, ResponseCreateParams } from './types.js';
import { mapFinishToChunkMeta } from './types.js';

function inputToAskRequest(params: ResponseCreateParams): AskRequest {
  if (typeof params.input === 'string') {
    return {
      input: params.input,
      model: params.model,
      temperature: params.temperature,
      maxTokens: params.max_output_tokens,
    };
  }
  return {
    messages: normalizeMessages(params.input as ChatCompletionMessageParam[]),
    model: params.model,
    temperature: params.temperature,
    maxTokens: params.max_output_tokens,
  };
}

export async function createResponse(
  params: ResponseCreateParams,
  options?: { signal?: AbortSignal }
): Promise<OpenAIResponse | AsyncIterable<{ type: string; delta?: string; byom?: unknown }>> {
  assertBrowser();
  const client = getClient();
  const request = inputToAskRequest(params);
  const signal = withAbortSignal(options);
  const id = createCompatId('resp');
  const createdAt = toUnixSeconds();

  if (params.stream) {
    return createResponseStream(client, request, params.model, id, createdAt, signal);
  }

  try {
    const result = await client.ask(request, signal);
    return {
      id,
      object: 'response',
      created_at: createdAt,
      model: result.model ?? params.model,
      status: 'completed',
      output_text: result.text,
      usage: {
        input_tokens: result.usage.inputTokens,
        output_tokens: result.usage.outputTokens,
        total_tokens: result.usage.totalTokens,
      },
      byom: {
        provider: result.provider,
        costUSD: result.costUSD,
        latencyMs: result.latencyMs,
      },
    };
  } catch (error) {
    throw mapCompatError(error);
  }
}

async function* createResponseStream(
  client: ReturnType<typeof getClient>,
  request: AskRequest,
  model: string,
  id: string,
  createdAt: number,
  signal?: AbortSignal
) {
  try {
    const gen = client.stream(request, signal);
    let step = await gen.next();
    while (!step.done) {
      yield { type: 'response.output_text.delta', delta: step.value.text };
      step = await gen.next();
    }
    const finish = step.value;
    yield {
      type: 'response.completed',
      byom: finish ? mapFinishToChunkMeta(finish) : undefined,
      id,
      model: finish?.model ?? model,
      created_at: createdAt,
    };
  } catch (error) {
    throw mapCompatError(error);
  }
}
