import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ByomClient, destroyClient } from '../src/client';
import { Bridge, destroyBridge } from '../src/bridge';
import {
  ErrorCode,
  EventNames,
  BudgetExceededError,
  PermissionDeniedError,
  ExtensionNotInstalledError,
  ByomError,
} from '../src/protocol';

function setupRelayElement(): HTMLScriptElement {
  const existing = document.querySelector('#byom-bridge');
  existing?.remove();

  const relay = document.createElement('script');
  relay.id = 'byom-bridge';
  document.body.appendChild(relay);
  return relay;
}

describe('ByomClient', () => {
  let relay: HTMLScriptElement;
  let client: ByomClient;

  beforeEach(() => {
    relay = setupRelayElement();
    destroyBridge();
    destroyClient();
    client = new ByomClient({ timeoutMs: 2000 });
    new Bridge({ timeoutMs: 2000 }).connect();
  });

  afterEach(() => {
    destroyBridge();
    destroyClient();
    relay.remove();
  });

  it('maps bridge BudgetExceededError to BudgetExceededError subclass', async () => {
    const dispatchSpy = vi.spyOn(relay, 'dispatchEvent');
    const askPromise = client.ask({ input: 'hello' });

    await vi.waitFor(() => expect(dispatchSpy).toHaveBeenCalled());

    const requestEvent = dispatchSpy.mock.calls.find(
      (call) => (call[0] as CustomEvent).type === EventNames.REQUEST
    )?.[0] as CustomEvent | undefined;
    const reqId = requestEvent?.detail?.reqId as string;

    window.dispatchEvent(
      new CustomEvent(EventNames.ERROR, {
        detail: {
          type: 'error',
          reqId,
          payload: {
            code: ErrorCode.BUDGET_EXCEEDED,
            message: 'Daily budget exceeded',
            details: { budgetType: 'daily', current: 1, limit: 1 },
          },
        },
      })
    );

    await expect(askPromise).rejects.toBeInstanceOf(BudgetExceededError);
    await expect(askPromise).rejects.toMatchObject({
      code: ErrorCode.BUDGET_EXCEEDED,
      details: { budgetType: 'daily' },
    });
  });

  it('maps permission errors to PermissionDeniedError', async () => {
    const dispatchSpy = vi.spyOn(relay, 'dispatchEvent');
    const askPromise = client.ask({ input: 'hello' });

    await vi.waitFor(() => expect(dispatchSpy).toHaveBeenCalled());

    const reqId = (
      dispatchSpy.mock.calls.find(
        (call) => (call[0] as CustomEvent).type === EventNames.REQUEST
      )?.[0] as CustomEvent
    ).detail.reqId as string;

    window.dispatchEvent(
      new CustomEvent(EventNames.ERROR, {
        detail: {
          type: 'error',
          reqId,
          payload: {
            code: ErrorCode.SITE_NOT_APPROVED,
            message: 'Site not approved',
          },
        },
      })
    );

    await expect(askPromise).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it('maps EXTENSION_DISABLED to ExtensionNotInstalledError', async () => {
    relay.remove();

    await expect(client.ask({ input: 'hello' })).rejects.toBeInstanceOf(
      ExtensionNotInstalledError
    );
  });

  it('validates ask requests before dispatching', async () => {
    await expect(client.ask({} as { input: string })).rejects.toBeInstanceOf(ByomError);
    await expect(client.ask({} as { input: string })).rejects.toMatchObject({
      code: ErrorCode.INVALID_REQUEST,
    });
  });

  it('validates embed input length', async () => {
    await expect(client.embed({ input: '' })).rejects.toMatchObject({
      code: ErrorCode.INVALID_REQUEST,
    });
  });

  it('validates classify categories', async () => {
    await expect(client.classify('text', [])).rejects.toMatchObject({
      code: ErrorCode.INVALID_REQUEST,
    });
  });
});
