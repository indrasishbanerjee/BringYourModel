import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ByomClient, destroyClient } from '../src/client';
import { destroyBridge } from '../src/bridge';
import { ErrorCode, EventNames } from '../src/protocol';

function setupRelayElement(): HTMLScriptElement {
  const existing = document.querySelector('#byom-bridge');
  existing?.remove();

  const relay = document.createElement('script');
  relay.id = 'byom-bridge';
  document.body.appendChild(relay);
  return relay;
}

describe('ChatSession', () => {
  let relay: HTMLScriptElement;
  let client: ByomClient;

  beforeEach(() => {
    relay = setupRelayElement();
    destroyBridge();
    destroyClient();
    client = new ByomClient({ timeoutMs: 2000 });
  });

  afterEach(() => {
    destroyBridge();
    destroyClient();
    relay.remove();
  });

  it('accumulates history after send', async () => {
    const session = client.chat({ systemMessage: 'You are helpful.' });
    expect(session.id).toMatch(/^chat-/);

    const dispatchSpy = vi.spyOn(relay, 'dispatchEvent');
    const sendPromise = session.send('Hello');

    await vi.waitFor(() => expect(dispatchSpy).toHaveBeenCalled());

    const reqId = (
      dispatchSpy.mock.calls.find(
        (call) => (call[0] as CustomEvent).type === EventNames.REQUEST
      )?.[0] as CustomEvent
    ).detail.reqId as string;

    window.dispatchEvent(
      new CustomEvent(EventNames.RESPONSE, {
        detail: {
          type: 'response',
          reqId,
          payload: {
            sessionId: session.id,
            message: { role: 'assistant', content: 'Hi there' },
            text: 'Hi there',
            model: 'gpt-4o-mini',
            provider: 'openai',
            usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
            costUSD: 0,
            latencyMs: 5,
          },
        },
      })
    );

    const response = await sendPromise;
    expect(response.text).toBe('Hi there');

    const history = session.history();
    expect(history).toHaveLength(3);
    expect(history[0]).toEqual({ role: 'system', content: 'You are helpful.' });
    expect(history[1]).toEqual({ role: 'user', content: 'Hello' });
    expect(history[2]).toEqual({ role: 'assistant', content: 'Hi there' });
  });

  it('throws when sending on a closed session', async () => {
    const session = client.chat();
    session.close();

    await expect(session.send('Hello')).rejects.toMatchObject({
      code: ErrorCode.INVALID_REQUEST,
    });
  });

  it('appends assistant message after stream completes', async () => {
    const session = client.chat();
    const dispatchSpy = vi.spyOn(relay, 'dispatchEvent');
    const streamGen = session.stream('Tell me a joke');
    const firstNext = streamGen.next();

    await vi.waitFor(() => expect(dispatchSpy).toHaveBeenCalled());

    const reqId = (
      dispatchSpy.mock.calls.find(
        (call) => (call[0] as CustomEvent).type === EventNames.REQUEST
      )?.[0] as CustomEvent
    ).detail.reqId as string;

    window.dispatchEvent(
      new CustomEvent(EventNames.DELTA, {
        detail: {
          type: 'delta',
          reqId,
          payload: { text: 'Why did the', isComplete: false },
        },
      })
    );

    const first = await firstNext;
    expect(first.value).toEqual({ text: 'Why did the', isComplete: false });

    window.dispatchEvent(
      new CustomEvent(EventNames.DELTA, {
        detail: {
          type: 'delta',
          reqId,
          payload: { text: ' chicken cross?', isComplete: false },
        },
      })
    );

    const second = await streamGen.next();
    expect(second.value).toEqual({ text: ' chicken cross?', isComplete: false });

    const readFinish = streamGen.next();
    window.dispatchEvent(
      new CustomEvent(EventNames.FINISH, {
        detail: {
          type: 'finish',
          reqId,
          payload: {
            model: 'gpt-4o-mini',
            provider: 'openai',
            usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
            costUSD: 0,
            latencyMs: 10,
          },
        },
      })
    );

    const finish = await readFinish;
    expect(finish.done).toBe(true);

    const history = session.history();
    expect(history.at(-1)).toEqual({
      role: 'assistant',
      content: 'Why did the chicken cross?',
    });
  });
});
