import { getClient, type ByomClientConfig } from './client.js';
import { createChatCompletion } from './openai/chat-completions.js';
import { createEmbeddings } from './openai/embeddings.js';
import { createResponse } from './openai/responses.js';
import type { OpenAIClientOptions } from './openai/types.js';
import { BadRequestError } from './openai/errors.js';

export * from './openai/errors.js';
export type * from './openai/types.js';

function parseClientOptions(options: OpenAIClientOptions = {}): ByomClientConfig {
  if (options.baseURL !== undefined) {
    throw new BadRequestError(
      'BYOM does not support baseURL. Requests route through the Bring Your Model browser extension, not HTTP.'
    );
  }
  return {
    timeoutMs: options.timeout,
  };
}

export class OpenAI {
  readonly chat = {
    completions: {
      create: createChatCompletion,
    },
  };

  readonly responses = {
    create: createResponse,
  };

  readonly embeddings = {
    create: createEmbeddings,
  };

  constructor(options: OpenAIClientOptions = {}) {
    // apiKey and dangerouslyAllowBrowser accepted for migration ergonomics; unused.
    void options.apiKey;
    void options.dangerouslyAllowBrowser;
    void options.defaultHeaders;
    getClient(parseClientOptions(options));
  }
}

export default OpenAI;
