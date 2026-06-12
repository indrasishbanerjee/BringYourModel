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
import {
  type ChatCompletion,
  type ChatCompletionChunk,
  type ChatCompletionCreateParams,
  mapAskToChatCompletion,
  mapFinishToChunkMeta,
} from './types.js';

function toAskRequest(params: ChatCompletionCreateParams): AskRequest {
  return {
    messages: normalizeMessages(params.messages),
    model: params.model,
    temperature: params.temperature,
    maxTokens: params.max_tokens,
  };
}

export async function createChatCompletion(
  params: ChatCompletionCreateParams,
  options?: { signal?: AbortSignal }
): Promise<ChatCompletion | AsyncIterable<ChatCompletionChunk>> {
  assertBrowser();
  const client = getClient();
  const request = toAskRequest(params);
  const signal = withAbortSignal(options);
  const id = createCompatId('chatcmpl');
  const created = toUnixSeconds();

  if (params.stream) {
    return createChatCompletionStream(client, request, params.model, id, created, signal);
  }

  try {
    const result = await client.ask(request, signal);
    return mapAskToChatCompletion(result, params.model, id, created);
  } catch (error) {
    throw mapCompatError(error);
  }
}

async function* createChatCompletionStream(
  client: ReturnType<typeof getClient>,
  request: AskRequest,
  model: string,
  id: string,
  created: number,
  signal?: AbortSignal
): AsyncGenerator<ChatCompletionChunk, void, unknown> {
  try {
    const gen = client.stream(request, signal);
    let resolvedModel = model;
    let byomMeta: ReturnType<typeof mapFinishToChunkMeta> | undefined;

    let step = await gen.next();
    while (!step.done) {
      const chunk = step.value;
      yield {
        id,
        object: 'chat.completion.chunk',
        created,
        model: resolvedModel,
        choices: [
          {
            index: 0,
            delta: { content: chunk.text },
            finish_reason: null,
          },
        ],
      };
      step = await gen.next();
    }

    if (step.value) {
      byomMeta = mapFinishToChunkMeta(step.value);
    }

    yield {
      id,
      object: 'chat.completion.chunk',
      created,
      model: resolvedModel,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: 'stop',
        },
      ],
      byom: byomMeta,
    };
  } catch (error) {
    throw mapCompatError(error);
  }
}
