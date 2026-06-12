import { defineContentScript } from 'wxt/sandbox';
import {
  EventNames,
  PROTOCOL_VERSION,
  ErrorCode,
  isProtocolCompatible,
  parseBridgeRequest,
  generateRequestId,
  type PortMessage,
} from '@byom/shared';

// LRU cache for nonce replay protection
class LRUSet<T> {
  private set = new Set<T>();
  private queue: T[] = [];
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  has(value: T): boolean {
    return this.set.has(value);
  }

  add(value: T): void {
    if (this.set.has(value)) return;
    
    this.set.add(value);
    this.queue.push(value);
    
    if (this.queue.length > this.maxSize) {
      const oldest = this.queue.shift()!;
      this.set.delete(oldest);
    }
  }
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  
  async main() {
    console.log('[BYOM] Content script starting...');

    // Inject main-world bridge. `wxt/client`'s injectScript returns Promise<void> (no element handle),
    // so we must create the tag ourselves so `#byom-bridge` exists before bridge-main runs — the SDK
    // uses document.querySelector('#byom-bridge').
    await new Promise<void>((resolve, reject) => {
      const url = chrome.runtime.getURL('/bridge-main.js');
      const scriptEl = document.createElement('script');
      scriptEl.id = 'byom-bridge';
      scriptEl.dataset.byomBridge = '1';
      scriptEl.src = url;
      scriptEl.onload = () => resolve();
      scriptEl.onerror = () =>
        reject(new Error('[BYOM] Failed to load bridge-main.js (check web_accessible_resources)'));
      (document.head ?? document.documentElement).append(scriptEl);
    });

    // Helper to get the relay element
    function getRelayEl(): HTMLScriptElement | null {
      return document.querySelector('#byom-bridge');
    }

    // Helper to dispatch events on the relay element (to page-world via bridge-main)
    function dispatchOnRelay(eventType: string, detail: unknown) {
      const relay = getRelayEl();
      if (relay) {
        relay.dispatchEvent(new CustomEvent(eventType, { detail, bubbles: true }));
      } else {
        // Fallback to window if relay not found
        window.dispatchEvent(new CustomEvent(eventType, { detail }));
      }
    }

    // Track the port connection to background
    let port: chrome.runtime.Port | null = null;
    let isConnected = false;
    
    // Nonce replay protection - keep last 1000 nonces
    const seenNonces = new LRUSet<string>(1000);

    // Connect to background service worker
    function connect(): chrome.runtime.Port {
      if (!port || !isConnected) {
        port = chrome.runtime.connect({
          name: `byom@${PROTOCOL_VERSION}`,
        });
        
        port.onDisconnect.addListener(() => {
          console.log('[BYOM] Port disconnected');
          isConnected = false;
          port = null;
        });
        
        isConnected = true;
        
        // Handle messages from background -> page
        port.onMessage.addListener((message: PortMessage) => {
          // Handle heartbeat
          if (message.type === 'heartbeat') {
            // ACK the heartbeat to keep SW alive
            port?.postMessage({ type: 'heartbeat-ack', timestamp: Date.now() });
            return;
          }

          // Push extension events to page
          if (message.type === 'event') {
            dispatchOnRelay(EventNames.EVENT, message.payload);
            return;
          }
          
          // Map port message type to event type
          let eventType = EventNames.RESPONSE;
          switch (message.type) {
            case 'delta':
              eventType = EventNames.DELTA;
              break;
            case 'finish':
              eventType = EventNames.FINISH;
              break;
            case 'error':
              eventType = EventNames.ERROR;
              break;
            case 'response':
            default:
              eventType = EventNames.RESPONSE;
          }
          
          // Forward to page-world via relay element
          dispatchOnRelay(eventType, message);
        });
      }
      return port;
    }

    // Listen for messages from the main-world script (page) via the relay element
    const relay = getRelayEl();
    const eventSource = relay || window;
    
    eventSource.addEventListener(EventNames.REQUEST, (event) => {
      const customEvent = event as CustomEvent;
      const rawRequest = customEvent.detail;

      if (!rawRequest) return;

      // Validate request using Zod schema
      const parseResult = parseBridgeRequest(rawRequest);
      if (!parseResult.success) {
        console.warn('[BYOM] Schema validation failed:', parseResult.error);
        dispatchOnRelay(EventNames.ERROR, {
          reqId: rawRequest?.reqId || 'unknown',
          type: 'error',
          payload: {
            code: ErrorCode.SCHEMA_VALIDATION_FAILED,
            message: `Request validation failed: ${parseResult.error}`,
          },
        });
        return;
      }

      const request = parseResult.data;

      // Replay protection - check nonce
      if (seenNonces.has(request.nonce)) {
        console.warn('[BYOM] Replay detected, nonce:', request.nonce);
        return; // Silently drop replayed messages
      }
      seenNonces.add(request.nonce);

      // Verify origin matches the actual origin
      if (request.origin !== window.location.origin) {
        console.warn('[BYOM] Origin mismatch:', request.origin, 'vs', window.location.origin);
        dispatchOnRelay(EventNames.ERROR, {
          reqId: request.reqId,
          type: 'error',
          payload: {
            code: ErrorCode.PERMISSION_DENIED,
            message: 'Origin mismatch',
          },
        });
        return;
      }

      // Validate protocol version (same major = compatible)
      if (!isProtocolCompatible(request.protocolVersion)) {
        dispatchOnRelay(EventNames.ERROR, {
          reqId: request.reqId,
          type: 'error',
          payload: {
            code: ErrorCode.PROTOCOL_VERSION_MISMATCH,
            message: `Protocol version mismatch. Expected major ${PROTOCOL_VERSION.split('.')[0]}, got: ${request.protocolVersion}`,
          },
        });
        return;
      }

      try {
        const connection = connect();
        
        // Forward to background
        connection.postMessage({
          type: 'request',
          reqId: request.reqId,
          origin: request.origin,
          payload: request,
        });
      } catch (error) {
        console.error('[BYOM] Failed to send to background:', error);
        dispatchOnRelay(EventNames.ERROR, {
          reqId: request.reqId,
          type: 'error',
          payload: {
            code: ErrorCode.EXTENSION_DISABLED,
            message: 'Failed to communicate with extension',
          },
        });
      }
    });

    // Listen for abort signals from page (via relay element)
    eventSource.addEventListener(EventNames.ABORT, (event) => {
      const customEvent = event as CustomEvent;
      const { reqId } = customEvent.detail || {};
      
      if (!reqId) return;

      try {
        const connection = connect();
        connection.postMessage({
          type: 'abort',
          reqId,
        });
      } catch (error) {
        console.error('[BYOM] Failed to send abort:', error);
      }
    });

    // Listen for ping requests from page (via relay element)
    eventSource.addEventListener(EventNames.PING, async (event) => {
      const customEvent = event as CustomEvent;
      const { includeCapabilities } = customEvent.detail || {};

      let capabilities: unknown;
      if (includeCapabilities) {
        try {
          const connection = connect();
          const reqId = generateRequestId();
          capabilities = await new Promise<unknown>((resolve) => {
            const timeout = setTimeout(() => resolve(undefined), 2000);
            const handler = (msg: PortMessage) => {
              if (msg.type === 'capabilities-response' && msg.reqId === reqId) {
                clearTimeout(timeout);
                connection.onMessage.removeListener(handler);
                resolve(msg.payload);
              }
            };
            connection.onMessage.addListener(handler);
            connection.postMessage({
              type: 'capabilities-query',
              reqId,
              origin: window.location.origin,
            });
          });
        } catch {
          capabilities = undefined;
        }
      }

      dispatchOnRelay(EventNames.PONG, {
        protocolVersion: PROTOCOL_VERSION,
        extensionVersion: chrome.runtime.getManifest().version,
        capabilities,
      });
    });

    console.log('[BYOM] Content script initialized');
  },
});