import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAI, BadRequestError } from '../src/openai.js';
import { getClient, destroyClient } from '../src/client.js';

describe('OpenAI compatibility adapter', () => {
  beforeEach(() => {
    destroyClient();
  });

  it('throws on baseURL', () => {
    expect(() => new OpenAI({ baseURL: 'https://api.openai.com' })).toThrow(BadRequestError);
  });

  it('maps chat completion to ask response', async () => {
    const client = getClient();
    vi.spyOn(client, 'ask').mockResolvedValue({
      text: 'Hello',
      model: 'gpt-4o-mini',
      provider: 'openai',
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      costUSD: 0.001,
      latencyMs: 100,
    });

    const openai = new OpenAI();
    const result = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hi' }],
    });

    if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
      throw new Error('expected non-streaming completion');
    }

    const completion = result;
    expect(completion.object).toBe('chat.completion');
    expect(completion.choices[0].message.content).toBe('Hello');
    expect(completion.byom?.provider).toBe('openai');
  });

  it('maps embeddings array input sequentially', async () => {
    const client = getClient();
    const embed = vi
      .spyOn(client, 'embed')
      .mockResolvedValueOnce({
        embedding: [0.1],
        model: 'text-embedding-3-small',
        provider: 'openai',
        usage: { tokens: 5 },
      })
      .mockResolvedValueOnce({
        embedding: [0.2],
        model: 'text-embedding-3-small',
        provider: 'openai',
        usage: { tokens: 6 },
      });

    const openai = new OpenAI();
    const list = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: ['a', 'b'],
    });

    expect(list.data).toHaveLength(2);
    expect(list.data[0].embedding).toEqual([0.1]);
    expect(list.data[1].index).toBe(1);
    expect(embed).toHaveBeenCalledTimes(2);
  });
});
