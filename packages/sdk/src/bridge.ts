import {
  EventNames,
  BridgeResponse,
  PortMessage,
  ErrorCode,
  createBridgeRequest,
  PROTOCOL_VERSION,
  ByomError,
  type Capabilities,
  type ByomEventType,
  type ByomEventPayload,
  type TaskType,
} from './protocol.js';

/** Maximum time to wait for the bridge relay element before failing */
const RELAY_WAIT_MS = 2000;

/** Bridge configuration */
export interface BridgeConfig {
  timeoutMs: number;
}

const DEFAULT_CONFIG: BridgeConfig = {
  timeoutMs: 30000,
};

/** Tracks an in-flight bridge request */
interface PendingRequest {
  resolve: (value: BridgeResponse) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  isStreaming?: boolean;
  streamController?: ReadableStreamDefaultController<unknown>;
}

function findBridgeRelayElement(): HTMLScriptElement | null {
  return document.querySelector('#byom-bridge');
}

async function waitForRelayElement(maxWaitMs = RELAY_WAIT_MS): Promise<HTMLScriptElement | null> {
  let relayElement = findBridgeRelayElement();
  if (relayElement) return relayElement;

  const startTime = Date.now();
  while (!relayElement && Date.now() - startTime < maxWaitMs) {
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    relayElement = findBridgeRelayElement();
  }
  return relayElement;
}

type EventCallback = (payload: ByomEventPayload) => void;

/**
 * Internal bridge for communicating with the extension via CustomEvents.
 * @internal Not part of the public SDK surface — use `byom` or `ByomClient`.
 */
export class Bridge {
  private pending = new Map<string, PendingRequest>();
  private eventListeners = new Map<ByomEventType, Set<EventCallback>>();
  private config: BridgeConfig;
  private isConnected = false;
  private messageHandler: (event: Event) => void;
  private eventHandler: (event: Event) => void;

  constructor(config: Partial<BridgeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.messageHandler = this.handleMessage.bind(this);
    this.eventHandler = this.handleExtensionEvent.bind(this);
  }

  /** Initialize the bridge and start listening for messages */
  connect(): void {
    if (this.isConnected) return;

    window.addEventListener(EventNames.RESPONSE, this.messageHandler);
    window.addEventListener(EventNames.DELTA, this.messageHandler);
    window.addEventListener(EventNames.FINISH, this.messageHandler);
    window.addEventListener(EventNames.ERROR, this.messageHandler);
    window.addEventListener(EventNames.EVENT, this.eventHandler);

    this.isConnected = true;
  }

  /** Disconnect from the bridge and reject all pending requests */
  disconnect(): void {
    window.removeEventListener(EventNames.RESPONSE, this.messageHandler);
    window.removeEventListener(EventNames.DELTA, this.messageHandler);
    window.removeEventListener(EventNames.FINISH, this.messageHandler);
    window.removeEventListener(EventNames.ERROR, this.messageHandler);
    window.removeEventListener(EventNames.EVENT, this.eventHandler);

    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.reject(new ByomError(ErrorCode.ABORTED, 'Bridge disconnected'));
    }
    this.pending.clear();

    this.isConnected = false;
  }

  /**
   * Send a ping to check if the extension is available.
   */
  async ping(
    timeoutMs = 1000,
    options?: { includeCapabilities?: boolean }
  ): Promise<
    | { available: true; extensionVersion: string; capabilities?: Capabilities }
    | { available: false }
  > {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ available: false });
      }, timeoutMs);

      const handler = (event: Event) => {
        const customEvent = event as CustomEvent;
        const payload = customEvent.detail;

        if (payload?.protocolVersion) {
          clearTimeout(timeout);
          window.removeEventListener(EventNames.PONG, handler);
          resolve({
            available: true,
            extensionVersion: payload.extensionVersion || 'unknown',
            capabilities: payload.capabilities as Capabilities | undefined,
          });
        }
      };

      window.addEventListener(EventNames.PONG, handler, { once: true });

      void waitForRelayElement(RELAY_WAIT_MS).then((relay) => {
        if (relay) {
          relay.dispatchEvent(
            new CustomEvent(EventNames.PING, {
              detail: {
                protocolVersion: PROTOCOL_VERSION,
                includeCapabilities: options?.includeCapabilities,
              },
              bubbles: true,
            })
          );
        } else {
          clearTimeout(timeout);
          resolve({ available: false });
        }
      });
    });
  }

  /** Fetch extension capabilities (requires extension ping with capabilities) */
  async getCapabilities(timeoutMs = 2000): Promise<Capabilities | null> {
    const result = await this.ping(timeoutMs, { includeCapabilities: true });
    if (!result.available || !result.capabilities) {
      return null;
    }
    return result.capabilities;
  }

  /** Subscribe to extension-pushed events. Returns an unsubscribe function. */
  on(event: ByomEventType, callback: EventCallback): () => void {
    if (!this.isConnected) {
      this.connect();
    }

    let listeners = this.eventListeners.get(event);
    if (!listeners) {
      listeners = new Set();
      this.eventListeners.set(event, listeners);
    }
    listeners.add(callback);

    return () => {
      listeners?.delete(callback);
      if (listeners && listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    };
  }

  private handleExtensionEvent(event: Event): void {
    const customEvent = event as CustomEvent;
    const payload = customEvent.detail as ByomEventPayload | undefined;
    if (!payload?.event) return;

    const listeners = this.eventListeners.get(payload.event);
    if (!listeners) return;

    for (const listener of listeners) {
      try {
        listener(payload);
      } catch (err) {
        console.error('[BYOM] Event listener error:', err);
      }
    }
  }

  /** Send a request to the extension */
  async sendRequest(
    task: TaskType,
    payload: unknown,
    signal?: AbortSignal
  ): Promise<BridgeResponse> {
    if (!this.isConnected) {
      this.connect();
    }

    const relay = await waitForRelayElement(RELAY_WAIT_MS);
    if (!relay) {
      throw new ByomError(
        ErrorCode.EXTENSION_DISABLED,
        'Bridge relay element not found. Extension may not be installed.'
      );
    }

    const origin = window.location.origin;
    const request = createBridgeRequest(task, payload, origin, PROTOCOL_VERSION);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(request.reqId);
        reject(
          new ByomError(
            ErrorCode.TIMEOUT,
            `Request ${request.reqId} timed out after ${this.config.timeoutMs}ms`
          )
        );
      }, this.config.timeoutMs);

      const onAbort = () => {
        clearTimeout(timer);
        this.pending.delete(request.reqId);
        void this.sendAbort(request.reqId);
        reject(new ByomError(ErrorCode.ABORTED, 'Request was aborted'));
      };

      if (signal) {
        if (signal.aborted) {
          onAbort();
          return;
        }
        signal.addEventListener('abort', onAbort, { once: true });
      }

      this.pending.set(request.reqId, {
        resolve,
        reject,
        timer,
        isStreaming: task === 'stream',
      });

      relay.dispatchEvent(
        new CustomEvent(EventNames.REQUEST, {
          detail: request,
          bubbles: true,
        })
      );
    });
  }

  /** Send a streaming request and return a readable stream */
  async sendStreamRequest(
    task: TaskType,
    payload: unknown,
    signal?: AbortSignal
  ): Promise<ReadableStream<unknown>> {
    if (!this.isConnected) {
      this.connect();
    }

    const relay = await waitForRelayElement(RELAY_WAIT_MS);
    if (!relay) {
      throw new ByomError(
        ErrorCode.EXTENSION_DISABLED,
        'Bridge relay element not found. Extension may not be installed.'
      );
    }

    const origin = window.location.origin;
    const request = createBridgeRequest(task, payload, origin, PROTOCOL_VERSION);

    return new ReadableStream({
      start: (controller) => {
        this.pending.set(request.reqId, {
          resolve: () => {},
          reject: (err) => controller.error(err),
          timer: setTimeout(() => {
            this.pending.delete(request.reqId);
            controller.error(new ByomError(ErrorCode.TIMEOUT, 'Stream timed out'));
          }, this.config.timeoutMs),
          isStreaming: true,
          streamController: controller,
        });

        const onAbort = () => {
          const pending = this.pending.get(request.reqId);
          if (pending) {
            clearTimeout(pending.timer);
            this.pending.delete(request.reqId);
            void this.sendAbort(request.reqId);
            controller.error(new ByomError(ErrorCode.ABORTED, 'Stream was aborted'));
          }
        };

        if (signal) {
          if (signal.aborted) {
            onAbort();
            return;
          }
          signal.addEventListener('abort', onAbort, { once: true });
        }

        relay.dispatchEvent(
          new CustomEvent(EventNames.REQUEST, {
            detail: request,
            bubbles: true,
          })
        );
      },
      cancel: () => {
        void this.sendAbort(request.reqId);
        const pending = this.pending.get(request.reqId);
        if (pending) {
          clearTimeout(pending.timer);
          this.pending.delete(request.reqId);
        }
      },
    });
  }

  private async sendAbort(reqId: string): Promise<void> {
    const relay = await waitForRelayElement(RELAY_WAIT_MS);
    if (relay) {
      relay.dispatchEvent(
        new CustomEvent(EventNames.ABORT, {
          detail: { reqId },
          bubbles: true,
        })
      );
    }
  }

  private handleMessage(event: Event): void {
    const customEvent = event as CustomEvent;
    const message = customEvent.detail as PortMessage;

    if (!message?.reqId) return;

    const pending = this.pending.get(message.reqId);
    if (!pending) return;

    switch (message.type) {
      case 'response':
        clearTimeout(pending.timer);
        this.pending.delete(message.reqId);
        pending.resolve({
          reqId: message.reqId,
          kind: 'response',
          timestamp: Date.now(),
          payload: message.payload,
        });
        break;

      case 'delta':
        if (pending.isStreaming && pending.streamController) {
          pending.streamController.enqueue(message.payload);
        } else {
          pending.resolve({
            reqId: message.reqId,
            kind: 'delta',
            timestamp: Date.now(),
            payload: message.payload,
          });
        }
        break;

      case 'finish':
        if (pending.isStreaming && pending.streamController) {
          pending.streamController.enqueue({ __type: 'finish', payload: message.payload });
          pending.streamController.close();
        }
        clearTimeout(pending.timer);
        this.pending.delete(message.reqId);
        pending.resolve({
          reqId: message.reqId,
          kind: 'finish',
          timestamp: Date.now(),
          payload: message.payload,
        });
        break;

      case 'error': {
        const errorPayload = message.payload as {
          code: ErrorCode;
          message: string;
          details?: Record<string, unknown>;
        };
        if (pending.isStreaming && pending.streamController) {
          pending.streamController.error(
            new ByomError(errorPayload.code, errorPayload.message, errorPayload.details)
          );
        }
        clearTimeout(pending.timer);
        this.pending.delete(message.reqId);
        pending.reject(
          new ByomError(errorPayload.code, errorPayload.message, errorPayload.details)
        );
        break;
      }
    }
  }

  /** Abort a specific request by id */
  abort(reqId: string): void {
    const pending = this.pending.get(reqId);
    if (pending) {
      clearTimeout(pending.timer);
      this.pending.delete(reqId);
      void this.sendAbort(reqId);
    }
  }
}

let globalBridge: Bridge | null = null;

/** Get or create the global bridge instance. Config applies only on first call. */
export function getBridge(config?: Partial<BridgeConfig>): Bridge {
  if (!globalBridge) {
    globalBridge = new Bridge(config);
  }
  return globalBridge;
}

/** Destroy the global bridge instance (for tests and teardown) */
export function destroyBridge(): void {
  if (globalBridge) {
    globalBridge.disconnect();
    globalBridge = null;
  }
}
