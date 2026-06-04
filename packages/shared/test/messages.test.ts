import { describe, it, expect } from 'vitest';
import {
  EventNames,
  BridgeRequestSchema,
  BridgeResponseSchema,
  PortMessageSchema,
  PingPayloadSchema,
  PongPayloadSchema,
  RequestPayloads,
  ResponsePayloads,
  parseBridgeRequest,
  createBridgeRequest,
  generateNonce,
  generateRequestId,
} from '../src/messages.js';
import { PROTOCOL_VERSION } from '../src/version.js';

describe('EventNames', () => {
  it('defines bidirectional bridge event constants', () => {
    expect(EventNames.REQUEST).toBe('byom:request');
    expect(EventNames.RESPONSE).toBe('byom:response');
    expect(EventNames.PING).toBe('byom:ping');
    expect(EventNames.PONG).toBe('byom:pong');
  });
});

describe('BridgeRequestSchema', () => {
  it('accepts valid bridge requests', () => {
    const request = {
      reqId: 'req-1',
      origin: 'https://example.com',
      protocolVersion: PROTOCOL_VERSION,
      nonce: 'abc123',
      timestamp: Date.now(),
      task: 'ask',
      payload: { input: 'hello' },
    };

    expect(BridgeRequestSchema.safeParse(request).success).toBe(true);
  });

  it('rejects missing required fields', () => {
    expect(BridgeRequestSchema.safeParse({ task: 'ask' }).success).toBe(false);
  });
});

describe('BridgeResponseSchema', () => {
  it('accepts response, delta, finish, and error kinds', () => {
    for (const kind of ['response', 'delta', 'finish', 'error'] as const) {
      const result = BridgeResponseSchema.safeParse({
        reqId: 'req-1',
        kind,
        timestamp: Date.now(),
        payload: {},
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('PortMessageSchema', () => {
  it('accepts heartbeat and capability messages', () => {
    expect(
      PortMessageSchema.safeParse({ type: 'heartbeat', timestamp: Date.now() }).success
    ).toBe(true);
    expect(
      PortMessageSchema.safeParse({
        type: 'capabilities-response',
        reqId: 'cap-1',
        payload: { extensionVersion: '0.1.0' },
      }).success
    ).toBe(true);
  });
});

describe('Ping/Pong payloads', () => {
  it('validates ping and pong shapes', () => {
    expect(
      PingPayloadSchema.safeParse({ protocolVersion: PROTOCOL_VERSION }).success
    ).toBe(true);
    expect(
      PongPayloadSchema.safeParse({
        protocolVersion: PROTOCOL_VERSION,
        extensionVersion: '0.1.0',
      }).success
    ).toBe(true);
  });
});

describe('Task payload schemas', () => {
  it('validates ask request and response payloads', () => {
    expect(RequestPayloads.ask.safeParse({ input: 'hello' }).success).toBe(true);
    expect(
      ResponsePayloads.ask.safeParse({
        text: 'hi',
        model: 'gpt-4o-mini',
        provider: 'openai',
        usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
        costUSD: 0.001,
        latencyMs: 100,
      }).success
    ).toBe(true);
  });

  it('validates classify request payload', () => {
    expect(
      RequestPayloads.classify.safeParse({
        input: 'great product',
        categories: ['positive', 'negative'],
      }).success
    ).toBe(true);
  });
});

describe('helpers', () => {
  it('generates nonces and request ids', () => {
    expect(generateNonce()).toHaveLength(32);
    expect(generateRequestId()).toMatch(/^\d+-/);
  });

  it('creates and parses bridge requests', () => {
    const created = createBridgeRequest(
      'ask',
      { input: 'hello' },
      'https://example.com',
      PROTOCOL_VERSION
    );

    expect(created.task).toBe('ask');
    expect(created.origin).toBe('https://example.com');

    const parsed = parseBridgeRequest(created);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.reqId).toBe(created.reqId);
    }
  });

  it('returns parse errors for invalid bridge requests', () => {
    const parsed = parseBridgeRequest({ bad: true });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.length).toBeGreaterThan(0);
    }
  });
});
