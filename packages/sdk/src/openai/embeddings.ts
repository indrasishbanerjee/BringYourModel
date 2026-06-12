import { getClient } from '../client.js';
import {
  assertBrowser,
  withAbortSignal,
} from '../compat/shared.js';
import { mapCompatError } from './errors.js';
import type { EmbeddingCreateParams, EmbeddingList } from './types.js';

const DEFAULT_CONCURRENCY = 1;
const MAX_CONCURRENCY = 3;

export async function createEmbeddings(
  params: EmbeddingCreateParams,
  options?: { signal?: AbortSignal }
): Promise<EmbeddingList> {
  assertBrowser();
  const client = getClient();
  const signal = withAbortSignal(options);
  const inputs = Array.isArray(params.input) ? params.input : [params.input];
  const concurrency = Math.min(
    Math.max(params.concurrency ?? DEFAULT_CONCURRENCY, 1),
    MAX_CONCURRENCY
  );

  const data: EmbeddingList['data'] = new Array(inputs.length);
  let totalTokens = 0;
  let resolvedModel = params.model;
  let provider: string | undefined;

  try {
    for (let i = 0; i < inputs.length; i += concurrency) {
      const batch = inputs.slice(i, i + concurrency);
      const results = await Promise.all(
        batch.map((text, batchIndex) =>
          client.embed({ input: text, model: params.model }, signal).then((result) => ({
            index: i + batchIndex,
            result,
          }))
        )
      );

      for (const { index, result } of results) {
        data[index] = {
          object: 'embedding',
          index,
          embedding: result.embedding,
        };
        totalTokens += result.usage.tokens;
        resolvedModel = result.model ?? resolvedModel;
        provider = result.provider ?? provider;
      }
    }

    return {
      object: 'list',
      data,
      model: resolvedModel,
      usage: {
        prompt_tokens: totalTokens,
        total_tokens: totalTokens,
      },
      byom: provider ? { provider } : undefined,
    };
  } catch (error) {
    throw mapCompatError(error);
  }
}
