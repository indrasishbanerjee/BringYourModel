import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  BridgeRequestSchema,
  BridgeResponseSchema,
  PortMessageSchema,
  RequestPayloads,
  ResponsePayloads,
} from '../../src/messages.js';
import { ErrorPayloadSchema } from '../../src/schemas.js';

const fixturesPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures.json'
);

interface FixtureFile {
  bridgeRequests: Array<{ name: string; value: unknown }>;
  bridgeResponses: Array<{ name: string; value: unknown }>;
  portMessages: Array<{ name: string; value: unknown }>;
}

const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf8')) as FixtureFile;

describe('contract fixtures', () => {
  describe('bridgeRequests', () => {
    it.each(fixtures.bridgeRequests)('$name matches BridgeRequestSchema', ({ value, name }) => {
      const result = BridgeRequestSchema.safeParse(value);
      expect(result.success, `${name} failed: ${result.success ? '' : result.error.message}`).toBe(true);
    });

    it.each(fixtures.bridgeRequests)('$name task payload matches RequestPayloads', ({ value, name }) => {
      const parsed = BridgeRequestSchema.parse(value);
      const schema = RequestPayloads[parsed.task as keyof typeof RequestPayloads];
      expect(schema, `${name} missing task schema`).toBeDefined();
      const payloadResult = schema.safeParse(parsed.payload);
      expect(payloadResult.success, `${name} payload: ${payloadResult.success ? '' : payloadResult.error.message}`).toBe(true);
    });
  });

  describe('bridgeResponses', () => {
    it.each(fixtures.bridgeResponses)('$name matches BridgeResponseSchema', ({ value, name }) => {
      const result = BridgeResponseSchema.safeParse(value);
      expect(result.success, `${name} failed: ${result.success ? '' : result.error.message}`).toBe(true);
    });

    it('ask-response payload matches AskResponseSchema', () => {
      const fixture = fixtures.bridgeResponses.find((f) => f.name === 'ask-response')!;
      const parsed = BridgeResponseSchema.parse(fixture.value);
      expect(ResponsePayloads.ask.safeParse(parsed.payload).success).toBe(true);
    });

    it('stream payloads match stream union schema', () => {
      for (const name of ['stream-delta', 'stream-finish']) {
        const fixture = fixtures.bridgeResponses.find((f) => f.name === name)!;
        const parsed = BridgeResponseSchema.parse(fixture.value);
        expect(ResponsePayloads.stream.safeParse(parsed.payload).success).toBe(true);
      }
    });

    it('error-response payload matches ErrorPayloadSchema', () => {
      const fixture = fixtures.bridgeResponses.find((f) => f.name === 'error-response')!;
      const parsed = BridgeResponseSchema.parse(fixture.value);
      expect(ErrorPayloadSchema.safeParse(parsed.payload).success).toBe(true);
    });
  });

  describe('portMessages', () => {
    it.each(fixtures.portMessages)('$name matches PortMessageSchema', ({ value, name }) => {
      const result = PortMessageSchema.safeParse(value);
      expect(result.success, `${name} failed: ${result.success ? '' : result.error.message}`).toBe(true);
    });
  });
});
