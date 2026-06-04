import { describe, it, expect } from 'vitest';
import {
  ErrorCode,
  ByomError,
  generateNonce,
  generateRequestId,
  generateSessionId,
  RequestPayloads,
} from '../src/protocol';

describe('protocol validators', () => {
  it('assertAskRequest requires input or messages', () => {
    expect(() => RequestPayloads.ask.parse({} as never)).toThrow(ByomError);
    expect(() => RequestPayloads.ask.parse({ input: 'hello' })).not.toThrow();
    expect(() =>
      RequestPayloads.ask.parse({ messages: [{ role: 'user', content: 'hi' }] })
    ).not.toThrow();
  });

  it('assertAskRequest rejects invalid temperature', () => {
    expect(() => RequestPayloads.ask.parse({ input: 'x', temperature: 3 })).toThrow(
      ByomError
    );
  });

  it('assertEmbedRequest requires non-empty input', () => {
    expect(() => RequestPayloads.embed.parse({ input: '' })).toThrow(ByomError);
    expect(() => RequestPayloads.embed.parse({ input: 'embed me' })).not.toThrow();
  });

  it('assertExtractRequest requires JSON Schema object', () => {
    expect(() =>
      RequestPayloads.extract.parse({
        input: 'text',
        schema: { type: 'string', properties: {} } as never,
      })
    ).toThrow(ByomError);

    expect(() =>
      RequestPayloads.extract.parse({
        input: 'text',
        schema: { type: 'object', properties: { name: { type: 'string' } } },
      })
    ).not.toThrow();
  });

  it('assertChatRequest requires non-empty message', () => {
    expect(() => RequestPayloads.chat.parse({ message: '' })).toThrow(ByomError);
    expect(() => RequestPayloads.chat.parse({ message: 'hello' })).not.toThrow();
  });
});

describe('protocol generators', () => {
  it('generateNonce returns 32 hex characters', () => {
    const nonce = generateNonce();
    expect(nonce).toMatch(/^[0-9a-f]{32}$/);
    expect(generateNonce()).not.toBe(nonce);
  });

  it('generateRequestId and generateSessionId are unique strings', () => {
    expect(generateRequestId()).not.toBe(generateRequestId());
    expect(generateSessionId()).toMatch(/^chat-/);
    expect(generateSessionId()).not.toBe(generateSessionId());
  });
});

describe('ErrorCode', () => {
  it('includes standard protocol codes', () => {
    expect(ErrorCode.BUDGET_EXCEEDED).toBe('BUDGET_EXCEEDED');
    expect(ErrorCode.VAULT_LOCKED).toBe('VAULT_LOCKED');
  });
});
