import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Bridge, destroyBridge } from '../src/bridge';
import { EventNames, ErrorCode, PROTOCOL_VERSION } from '../src/protocol';

function setupRelayElement(): HTMLScriptElement {
  const existing = document.querySelector('#byom-bridge');
  existing?.remove();

  const relay = document.createElement('script');
  relay.id = 'byom-bridge';
  document.body.appendChild(relay);
  return relay;
}

describe('Bridge', () => {
  let bridge: Bridge;
  let relay: HTMLScriptElement;

  beforeEach(() => {
    relay = setupRelayElement();
    bridge = new Bridge({ timeoutMs: 2000 });
    destroyBridge();
  });

  afterEach(() => {
    bridge.disconnect();
    relay.remove();
    destroyBridge();
    vi.useRealTimers();
  });

  it('connects and disconnects without throwing', () => {
    bridge.connect();
    expect(() => bridge.disconnect()).not.toThrow();
  });

  it('resolves ping when extension responds with pong', async () => {
    bridge.connect();

    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent(EventNames.PONG, {
          detail: {
            protocolVersion: PROTOCOL_VERSION,
            extensionVersion: '0.1.0',
          },
        })
      );
    }, 10);

    const result = await bridge.ping(500);
    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.extensionVersion).toBe('0.1.0');
    }
  });

  it('returns unavailable when pong times out', async () => {
    vi.useFakeTimers();
    bridge.connect();

    const pingPromise = bridge.ping(100);
    await vi.advanceTimersByTimeAsync(150);

    const result = await pingPromise;
    expect(result.available).toBe(false);
  });

  it('dispatches request on relay element and resolves response', async () => {
    bridge.connect();

    const dispatchSpy = vi.spyOn(relay, 'dispatchEvent');

    const responsePromise = bridge.sendRequest('ask', { input: 'hello' });

    await vi.waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalled();
    });

    const requestEvent = dispatchSpy.mock.calls.find(
      (call) => (call[0] as CustomEvent).type === EventNames.REQUEST
    )?.[0] as CustomEvent | undefined;

    expect(requestEvent?.detail?.task).toBe('ask');
    const reqId = requestEvent?.detail?.reqId as string;

    window.dispatchEvent(
      new CustomEvent(EventNames.RESPONSE, {
        detail: {
          type: 'response',
          reqId,
          payload: { text: 'mock reply' },
        },
      })
    );

    const response = await responsePromise;
    expect(response.kind).toBe('response');
    expect(response.payload).toEqual({ text: 'mock reply' });
  });

  it('rejects with EXTENSION_DISABLED when relay element is missing', async () => {
    relay.remove();
    const offlineBridge = new Bridge({ timeoutMs: 1000 });

    await expect(offlineBridge.sendRequest('ask', { input: 'hello' })).rejects.toMatchObject({
      code: ErrorCode.EXTENSION_DISABLED,
    });

    offlineBridge.disconnect();
  });

  it('notifies event subscribers', () => {
    bridge.connect();
    const handler = vi.fn();
    bridge.on('budget-warning', handler);

    window.dispatchEvent(
      new CustomEvent(EventNames.EVENT, {
        detail: {
          event: 'budget-warning',
          origin: 'https://example.com',
          timestamp: Date.now(),
        },
      })
    );

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('streams delta chunks and finish marker', async () => {
    bridge.connect();

    const dispatchSpy = vi.spyOn(relay, 'dispatchEvent');
    const stream = await bridge.sendStreamRequest('stream', { input: 'hello' });

    await vi.waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalled();
    });

    const requestEvent = dispatchSpy.mock.calls.find(
      (call) => (call[0] as CustomEvent).type === EventNames.REQUEST
    )?.[0] as CustomEvent | undefined;
    const reqId = requestEvent?.detail?.reqId as string;

    const reader = stream.getReader();
    const readFirst = reader.read();

    window.dispatchEvent(
      new CustomEvent(EventNames.DELTA, {
        detail: {
          type: 'delta',
          reqId,
          payload: { text: 'Hi', isComplete: false },
        },
      })
    );

    const first = await readFirst;
    expect(first.value).toEqual({ text: 'Hi', isComplete: false });

    const readFinish = reader.read();
    window.dispatchEvent(
      new CustomEvent(EventNames.FINISH, {
        detail: {
          type: 'finish',
          reqId,
          payload: {
            model: 'gpt-4o-mini',
            provider: 'openai',
            usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
            costUSD: 0,
            latencyMs: 10,
          },
        },
      })
    );

    const finishChunk = await readFinish;
    expect(finishChunk.value).toEqual({
      __type: 'finish',
      payload: expect.objectContaining({ model: 'gpt-4o-mini' }),
    });

    await reader.read();
    reader.releaseLock();
  });

  it('rejects when abort signal fires', async () => {
    bridge.connect();
    const controller = new AbortController();

    const requestPromise = bridge.sendRequest('ask', { input: 'hello' }, controller.signal);
    controller.abort();

    await expect(requestPromise).rejects.toMatchObject({
      code: ErrorCode.ABORTED,
    });
  });
});
