import { defineBackground } from 'wxt/sandbox';
import {
  ErrorCode,
  PROTOCOL_VERSION,
  isProtocolCompatible,
  PortMessageSchema,
  RequestPayloads,
  type BridgeRequest,
  type AskRequest,
  type Grant,
  type TaskType,
  type ProviderId,
  type Capabilities,
  type ByomEventType,
} from '@byom/shared';
import { OpenModelRouter } from '../modules/openmodelrouter';
import { GrantStore } from '../modules/storage/grant-store';
import { ProviderStore } from '../modules/storage/provider-store';
import { Vault } from '../modules/crypto/vault';
import { TelemetryStore } from '../modules/openmodelrouter/telemetry/store';
import { RoutingEngine } from '../modules/openmodelrouter/routing/engine';
import { getProviderHealthTracker } from '../modules/openmodelrouter/routing/health';
import { RoutingLog } from '../modules/openmodelrouter/routing/routing-log';
import { getRoutingPreferencesStore, RoutingPreferencesStore } from '../modules/storage/routing-preferences-store';
import { shouldShowBudgetWarning } from '../modules/openmodelrouter/telemetry/pricing';

// Track active streams for cancellation
const activeStreams = new Map<string, AbortController>();

// Track pending consent requests
interface ConsentResult {
  grant: Grant;
  selectedProvider?: ProviderId;
  requestModelOverride?: string;
}

interface PendingConsent {
  resolve: (result: ConsentResult) => void;
  reject: (error: Error) => void;
  request: BridgeRequest;
  origin: string;
  tabId: number;
  windowId?: number;
  existingGrant?: Grant;
}
const pendingConsents = new Map<string, PendingConsent>();

// Routing engine for previewing provider selection
const routingEngine = new RoutingEngine();

// Nonce replay protection in SW with 60s TTL
class NonceCache {
  private seen = new Map<string, number>(); // key -> timestamp
  private readonly ttlMs = 60000; // 60 seconds

  has(origin: string, nonce: string): boolean {
    const key = `${origin}:${nonce}`;
    const timestamp = this.seen.get(key);
    if (!timestamp) return false;
    
    // Check if expired
    if (Date.now() - timestamp > this.ttlMs) {
      this.seen.delete(key);
      return false;
    }
    return true;
  }

  add(origin: string, nonce: string): void {
    const key = `${origin}:${nonce}`;
    this.seen.set(key, Date.now());
    
    // Cleanup expired entries periodically (every 100 additions)
    if (this.seen.size % 100 === 0) {
      this.cleanup();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.seen.entries()) {
      if (now - timestamp > this.ttlMs) {
        this.seen.delete(key);
      }
    }
  }
}
const seenNonces = new NonceCache();

// Module-level store references (set by main(), used by dashboard RPC)
let vault: Vault;
let grantStore: GrantStore;
let providerStore: ProviderStore;
let telemetryStore: TelemetryStore;
let routingPrefsStore: RoutingPreferencesStore;
let router: OpenModelRouter;

/** Tasks supported by the extension engine */
const SUPPORTED_TASKS: TaskType[] = ['ask', 'stream', 'embed', 'classify', 'extract', 'chat'];

/** Active content-script ports grouped by page origin */
const portsByOrigin = new Map<string, Set<chrome.runtime.Port>>();

function registerPort(origin: string, port: chrome.runtime.Port): void {
  if (!origin || origin === 'unknown') return;
  let set = portsByOrigin.get(origin);
  if (!set) {
    set = new Set();
    portsByOrigin.set(origin, set);
  }
  set.add(port);
}

function unregisterPort(origin: string, port: chrome.runtime.Port): void {
  const set = portsByOrigin.get(origin);
  if (!set) return;
  set.delete(port);
  if (set.size === 0) {
    portsByOrigin.delete(origin);
  }
}

function emitEventToOrigin(
  origin: string,
  event: ByomEventType,
  data?: Record<string, unknown>
): void {
  const ports = portsByOrigin.get(origin);
  if (!ports || ports.size === 0) return;

  const message = {
    type: 'event' as const,
    event,
    payload: { event, origin, data, timestamp: Date.now() },
    timestamp: Date.now(),
  };

  for (const port of ports) {
    try {
      port.postMessage(message);
    } catch {
      // Port may have disconnected
    }
  }
}

async function buildCapabilities(origin: string): Promise<Capabilities> {
  const grant = await grantStore.getGrant(origin);
  const vaultUnlocked = await vault.isUnlocked();
  return {
    extensionVersion: chrome.runtime.getManifest().version,
    supportedTasks: SUPPORTED_TASKS,
    siteApproved: grant !== null && (!grant.expiresAt || grant.expiresAt > Date.now()),
    vaultUnlocked,
  };
}

export default defineBackground({
  main() {
    console.log('[BYOM] Background service worker started');

    // Open Chrome side panel when the user clicks the toolbar icon (persists vs popup blur-close).
    try {
      if (chrome.sidePanel?.setPanelBehavior) {
        void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
      }
    } catch (err) {
      console.warn('[BYOM] sidePanel.setPanelBehavior failed:', err);
    }

    // Initialize vault first (required for provider store)
    vault = new Vault();
    
    // Initialize stores with vault dependency
    grantStore = new GrantStore();
    providerStore = new ProviderStore(vault);
    telemetryStore = new TelemetryStore();
    routingPrefsStore = getRoutingPreferencesStore();
    
    // Initialize the OpenModelRouter engine
    router = new OpenModelRouter({
      grantStore,
      providerStore,
      vault,
      telemetryStore,
      routingPrefsStore,
    });

    // Listen for connections from content scripts
    chrome.runtime.onConnect.addListener((port) => {
      // Validate port name format: byom@<version>
      const portNameMatch = port.name.match(/^byom@(\d+\.\d+\.\d+)$/);
      if (!portNameMatch) {
        console.warn('[BYOM] Invalid port name:', port.name);
        port.disconnect();
        return;
      }

      const clientVersion = portNameMatch[1];
      
      if (!isProtocolCompatible(clientVersion)) {
        console.warn('[BYOM] Protocol version mismatch:', clientVersion, 'vs', PROTOCOL_VERSION);
        port.postMessage({
          type: 'error',
          reqId: 'handshake',
          payload: {
            code: ErrorCode.PROTOCOL_VERSION_MISMATCH,
            message: `Protocol version mismatch. Client: ${clientVersion}, Extension: ${PROTOCOL_VERSION}`,
          },
        });
        port.disconnect();
        return;
      }

      const portOrigin = port.sender?.origin || 'unknown';
      console.log('[BYOM] Client connected:', portOrigin, 'version:', clientVersion);
      registerPort(portOrigin, port);

      // Track active requests for this port
      const activeRequests = new Set<string>();
      
      // Start heartbeat to keep SW alive while requests are active
      let heartbeatInterval: number | null = null;
      
      function startHeartbeat() {
        if (heartbeatInterval) return;
        heartbeatInterval = self.setInterval(() => {
          if (activeRequests.size > 0) {
            try {
              port.postMessage({ type: 'heartbeat', timestamp: Date.now() });
            } catch {
              // Port may have disconnected
              stopHeartbeat();
            }
          }
        }, 25000); // 25 seconds (MV3 SW timeout is 30s)
      }
      
      function stopHeartbeat() {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      }

      // Handle messages from this port
      port.onMessage.addListener(async (rawMessage: unknown) => {
        const msg = rawMessage as any;
        
        // Handle heartbeat ACK
        if (msg?.type === 'heartbeat-ack') {
          return;
        }
        
        // Track active requests for heartbeat
        if (msg?.reqId && msg?.type === 'request') {
          activeRequests.add(msg.reqId);
          try { startHeartbeat(); } catch (e) {
            console.warn('[BYOM] Heartbeat start failed (non-fatal):', e);
          }
        }
        
        if (msg?.reqId && (msg?.type === 'response' || msg?.type === 'error' || msg?.type === 'finish')) {
          activeRequests.delete(msg.reqId);
          if (activeRequests.size === 0) {
            stopHeartbeat();
          }
        }
        try {
          await handlePortMessage(port, rawMessage, router, grantStore, providerStore, vault, telemetryStore);
        } catch (error) {
          console.error('[BYOM] Error handling message:', error);
          const msg = rawMessage as any;
          port.postMessage({
            type: 'error',
            reqId: msg?.reqId || 'unknown',
            payload: {
              code: ErrorCode.INTERNAL_ERROR,
              message: error instanceof Error ? error.message : 'Internal error',
            },
          });
        }
      });

      port.onDisconnect.addListener(() => {
        const disconnectedOrigin = port.sender?.origin || 'unknown';
        console.log('[BYOM] Client disconnected:', disconnectedOrigin);
        unregisterPort(disconnectedOrigin, port);
        // Stop heartbeat
        stopHeartbeat();
        // Clean up any active streams for this port
        for (const [reqId, controller] of activeStreams) {
          controller.abort();
          activeStreams.delete(reqId);
        }
        // Clean up any pending consents from this origin
        const origin = port.sender?.origin;
        if (origin) {
          for (const [reqId, pending] of pendingConsents) {
            if (pending.origin === origin) {
              pending.reject(new Error('Port disconnected'));
              pendingConsents.delete(reqId);
            }
          }
        }
      });
    });

    // Handle extension icon click — side panel opens via setPanelBehavior

    // Periodic cleanup of old telemetry data (keep last 90 days)
    chrome.alarms.create('cleanupTelemetry', { periodInMinutes: 60 * 24 }); // Daily
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === 'cleanupTelemetry') {
        try {
          await telemetryStore.deleteOlderThan(90);
        } catch (err) {
          console.error('[BYOM] Telemetry cleanup failed:', err);
        }
      }
    });

    // Handle messages from consent page, options page, and other extension pages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      handleRuntimeMessage(message, sender, sendResponse).catch((err) => {
        console.error('[BYOM] Error handling runtime message:', err);
        sendResponse({ error: err instanceof Error ? err.message : 'Internal error' });
      });
      return true; // Keep channel open for async response
    });

    console.log('[BYOM] Background service worker initialized');
  },
});

/**
 * Handle runtime messages from extension pages (consent, popup, options)
 * Includes dashboard RPC for Options page
 * Uses module-level stores initialized in main()
 */
async function handleRuntimeMessage(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): Promise<void> {
  // Dashboard RPC — extension pages only (block content scripts on web origins)
  if (typeof message?.kind === 'string' && message.kind.startsWith('dashboard:')) {
    const senderUrl = sender.url ?? '';
    if (sender.id !== chrome.runtime.id || !senderUrl.startsWith('chrome-extension://')) {
      sendResponse({ error: 'Unauthorized' });
      return;
    }
  }

  // Dashboard RPC handlers - for Options page
  switch (message.kind) {
    // Provider management
    case 'dashboard:getProviders': {
      const providers = await providerStore.getAllProviders();
      sendResponse({ providers });
      return;
    }

    case 'dashboard:addProvider': {
      try {
        const provider = await providerStore.addProvider(
          message.providerKind,
          message.label,
          message.apiKey || '',
          {
            baseURL: message.baseURL,
            defaultModel: message.defaultModel,
          }
        );
        router.invalidateProviderRegistry?.();
        broadcastStateUpdate('providers');
        sendResponse({ success: true, id: provider.id });
      } catch (error) {
        sendResponse({ error: error instanceof Error ? error.message : 'Failed to add provider' });
      }
      return;
    }

    case 'dashboard:removeProvider': {
      try {
        await providerStore.removeProvider(message.id);
        router.invalidateProviderRegistry?.();
        broadcastStateUpdate('providers');
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ error: error instanceof Error ? error.message : 'Failed to remove provider' });
      }
      return;
    }

    case 'dashboard:updateProvider': {
      try {
        await providerStore.updateProvider(message.id, message.updates);
        router.invalidateProviderRegistry?.();
        broadcastStateUpdate('providers');
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ error: error instanceof Error ? error.message : 'Failed to update provider' });
      }
      return;
    }

    case 'dashboard:testProvider': {
      try {
        const provider = await providerStore.getProvider(message.id);
        if (!provider) {
          sendResponse({ success: false, error: 'Provider not found' });
          return;
        }

        const result = await router.testProvider(provider.kind, provider.baseURL, provider.id);
        if (result.success) {
          sendResponse({ success: true, models: result.models });
        } else {
          sendResponse({ success: false, error: result.error || 'Connection test failed' });
        }
      } catch (error) {
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Connection test failed' });
      }
      return;
    }

    // Grant management
    case 'dashboard:getGrants': {
      const grants = await grantStore.getAllGrants();
      sendResponse({ grants });
      return;
    }

    case 'dashboard:revokeGrant': {
      try {
        await grantStore.revokeGrant(message.origin);
        broadcastStateUpdate('grants');
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ error: error instanceof Error ? error.message : 'Failed to revoke grant' });
      }
      return;
    }

    case 'dashboard:revokeAllGrants': {
      try {
        await grantStore.revokeAllGrants();
        broadcastStateUpdate('grants');
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ error: error instanceof Error ? error.message : 'Failed to revoke grants' });
      }
      return;
    }

    case 'dashboard:updateGrant': {
      try {
        const existing = await grantStore.getGrant(message.origin);
        if (!existing) {
          sendResponse({ error: 'Grant not found' });
          return;
        }
        await grantStore.setGrant({ ...existing, ...message.updates });
        broadcastStateUpdate('grants');
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ error: error instanceof Error ? error.message : 'Failed to update grant' });
      }
      return;
    }

    // Usage and stats
    case 'dashboard:getUsage': {
      const stats = await telemetryStore.getTotalStats();
      const recent = await telemetryStore.getRecentUsage({ limit: message.limit || 50 });
      sendResponse({ stats, usage: recent.records });
      return;
    }

    case 'dashboard:getOriginUsage': {
      const usage = await grantStore.getUsage(message.origin);
      sendResponse({ usage });
      return;
    }

    case 'dashboard:clearUsage': {
      try {
        await telemetryStore.clearAll();
        broadcastStateUpdate('usage');
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ error: error instanceof Error ? error.message : 'Failed to clear usage' });
      }
      return;
    }

    // Vault operations
    case 'dashboard:getVaultStatus': {
      const isUnlocked = await vault.isUnlocked();
      sendResponse({ isUnlocked });
      return;
    }

    case 'dashboard:unlockVault': {
      try {
        await vault.unlock(message.passphrase);
        // Rebuild provider registry with decrypted keys
        router.invalidateProviderRegistry?.();
        broadcastStateUpdate('vault');
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ error: error instanceof Error ? error.message : 'Failed to unlock vault' });
      }
      return;
    }

    case 'dashboard:lockVault': {
      await vault.lock();
      router.invalidateProviderRegistry?.();
      broadcastStateUpdate('vault');
      for (const origin of portsByOrigin.keys()) {
        emitEventToOrigin(origin, 'vault-locked', { reason: 'user_locked' });
      }
      sendResponse({ success: true });
      return;
    }

    // Global Routing Preferences RPC handlers
    case 'dashboard:getRoutingPreferences': {
      const routingStore = getRoutingPreferencesStore();
      const preferences = await routingStore.getPreferences();
      sendResponse({ preferences });
      return;
    }

    case 'dashboard:updateRoutingPreferences': {
      try {
        const routingStore = getRoutingPreferencesStore();
        const preferences = await routingStore.updatePreferences(message);
        broadcastStateUpdate('routing');
        sendResponse({ preferences });
      } catch (error) {
        sendResponse({ error: error instanceof Error ? error.message : 'Failed to update routing preferences' });
      }
      return;
    }

    case 'dashboard:setRoutingMode': {
      try {
        const routingStore = getRoutingPreferencesStore();
        const preferences = await routingStore.setMode(message.mode);
        broadcastStateUpdate('routing');
        sendResponse({ preferences });
      } catch (error) {
        sendResponse({ error: error instanceof Error ? error.message : 'Failed to set routing mode' });
      }
      return;
    }

    case 'dashboard:setPreferredProvider': {
      try {
        const routingStore = getRoutingPreferencesStore();
        const preferences = await routingStore.setPreferredProvider(message.provider);
        broadcastStateUpdate('routing');
        sendResponse({ preferences });
      } catch (error) {
        sendResponse({ error: error instanceof Error ? error.message : 'Failed to set preferred provider' });
      }
      return;
    }

    case 'dashboard:setTaskOverride': {
      try {
        const routingStore = getRoutingPreferencesStore();
        const preferences = await routingStore.setTaskOverride(message.task, message.routing);
        broadcastStateUpdate('routing');
        sendResponse({ preferences });
      } catch (error) {
        sendResponse({ error: error instanceof Error ? error.message : 'Failed to set task override' });
      }
      return;
    }

    case 'dashboard:removeTaskOverride': {
      try {
        const routingStore = getRoutingPreferencesStore();
        const preferences = await routingStore.removeTaskOverride(message.task);
        broadcastStateUpdate('routing');
        sendResponse({ preferences });
      } catch (error) {
        sendResponse({ error: error instanceof Error ? error.message : 'Failed to remove task override' });
      }
      return;
    }

    case 'dashboard:resetRoutingPreferences': {
      try {
        const routingStore = getRoutingPreferencesStore();
        const preferences = await routingStore.reset();
        broadcastStateUpdate('routing');
        sendResponse({ preferences });
      } catch (error) {
        sendResponse({ error: error instanceof Error ? error.message : 'Failed to reset routing preferences' });
      }
      return;
    }

    case 'dashboard:getProviderHealth': {
      const healthTracker = getProviderHealthTracker();
      await healthTracker.ensureLoaded();
      sendResponse({ health: healthTracker.getAllHealth() });
      return;
    }

    case 'dashboard:getRoutingLog': {
      const entries = await RoutingLog.getRecent(5);
      sendResponse({ entries });
      return;
    }
  }

  // Consent flow handlers
  switch (message.kind) {
    case 'consent:getRequestInfo': {
      const pending = pendingConsents.get(message.reqId);
      if (!pending) {
        sendResponse({ error: 'Request not found or already processed' });
        return;
      }

      // Get providers for display
      const providers = await providerStore.getEnabledProviders();

      // Get global routing preferences
      const routingPrefsStore = getRoutingPreferencesStore();
      const globalPrefs = await routingPrefsStore.getPreferences();

      // Use existing grant as base if available, otherwise create synthetic
      const baseGrant: Grant = pending.existingGrant || {
        origin: pending.origin,
        providers: providers.map((p) => p.kind),
        allowedTasks: [pending.request.task as TaskType],
        dailyBudgetUSD: 5,
        monthlyBudgetUSD: 50,
        perRequestTokenCap: 4000,
        privacyMode: 'cloud-allowed',
        autoApprove: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Use new routing with preferences
      const routingResult = await routingEngine.selectProviderWithPreferences(
        baseGrant,
        providers,
        globalPrefs,
        pending.request.task as TaskType
      );

      // Estimate tokens (rough approximation)
      const payload = pending.request.payload as AskRequest;
      const estimatedTokens = Math.ceil((payload?.input?.length || 0) / 4) + (payload?.maxTokens || 1000);

      sendResponse({
        requestInfo: {
          reqId: message.reqId,
          origin: pending.origin,
          tabId: pending.tabId,
          task: pending.request.task,
          providerKind: routingResult.selection?.kind || providers[0]?.kind || 'openai',
          modelId: routingResult.selection?.config?.defaultModel || 'gpt-4o-mini',
          hasPageText: !!(payload?.input && payload.input.length > 100),
          estimatedTokens,
          // For provider picker
          allowProviderSelection: routingResult.shouldAskUser,
          suggestedProvider: routingResult.suggestedProvider || routingResult.selection?.kind,
          routingReason: routingResult.reason,
          consentMode: pending.existingGrant ? 'pick-provider' : 'first-time',
        },
        providers,
      });
      return;
    }

    case 'consent:allow': {
      const pending = pendingConsents.get(message.reqId);
      if (!pending) {
        sendResponse({ error: 'Request not found or already processed' });
        return;
      }

      const grantToUse: Grant = message.grant ?? pending.existingGrant;
      if (!grantToUse) {
        sendResponse({ error: 'No grant available for this request' });
        return;
      }

      // Save the grant only for first-time approval flows
      if (message.grant) {
        await grantStore.setGrant(message.grant);
        broadcastStateUpdate('grants');
      }

      // Record manual provider choice for ask-every-time remember feature
      if (message.selectedProvider) {
        const routingPrefsStore = getRoutingPreferencesStore();
        await routingPrefsStore.recordManualProviderChoice(
          message.selectedProvider as ProviderId,
          pending.request.task as TaskType
        );
      }

      // Resolve the pending promise
      pending.resolve({
        grant: grantToUse,
        selectedProvider: message.selectedProvider as ProviderId | undefined,
        requestModelOverride: message.requestModelOverride as string | undefined,
      });
      pendingConsents.delete(message.reqId);

      // Close the consent window if it's still open
      if (pending.windowId) {
        try {
          await chrome.windows.remove(pending.windowId);
        } catch {
          // Window may already be closed
        }
      }

      sendResponse({ success: true });
      return;
    }

    case 'consent:deny': {
      const pending = pendingConsents.get(message.reqId);
      if (!pending) {
        sendResponse({ error: 'Request not found or already processed' });
        return;
      }

      // Reject the pending promise
      pending.reject(new Error('User denied permission'));
      pendingConsents.delete(message.reqId);

      // Close the consent window if it's still open
      if (pending.windowId) {
        try {
          await chrome.windows.remove(pending.windowId);
        } catch {
          // Window may already be closed
        }
      }

      sendResponse({ success: true });
      return;
    }

    default:
      sendResponse({ error: 'Unknown message kind' });
  }
}

/**
 * Open consent window for a request
 */
async function openConsentWindow(
  reqId: string,
  origin: string,
  tabId: number,
  request: BridgeRequest,
  existingGrant?: Grant
): Promise<ConsentResult> {
  return new Promise((resolve, reject) => {
    // Store pending consent with existing grant if available
    pendingConsents.set(reqId, {
      resolve,
      reject,
      request,
      origin,
      tabId,
      existingGrant,
    });

    // Open consent window
    const consentUrl = chrome.runtime.getURL('consent.html') + '#req=' + encodeURIComponent(reqId);

    chrome.windows.create(
      {
        url: consentUrl,
        type: 'popup',
        width: 480,
        height: 480,
        focused: true,
      },
      (window) => {
        if (!window || !window.id) {
          pendingConsents.delete(reqId);
          reject(new Error('Failed to open consent window'));
          return;
        }

        // Store window ID for cleanup
        const pending = pendingConsents.get(reqId);
        if (pending) {
          pending.windowId = window.id;
        }

        // Watch for window closing
        const checkClosed = setInterval(() => {
          if (!window.id) {
            clearInterval(checkClosed);
            return;
          }

          chrome.windows.get(window.id, {}, (w) => {
            if (chrome.runtime.lastError || !w) {
              clearInterval(checkClosed);
              const p = pendingConsents.get(reqId);
              if (p) {
                pendingConsents.delete(reqId);
                reject(new Error('Consent window closed without response'));
              }
            }
          });
        }, 1000);

        // Clean up interval after 5 minutes (timeout)
        setTimeout(() => {
          clearInterval(checkClosed);
          const p = pendingConsents.get(reqId);
          if (p) {
            pendingConsents.delete(reqId);
            try {
              chrome.windows.remove(window.id!);
            } catch {
              // Window may already be closed
            }
            reject(new Error('Consent request timed out'));
          }
        }, 5 * 60 * 1000);
      }
    );
  });
}

/**
 * Handle a message from a content script port
 */
async function handlePortMessage(
  port: chrome.runtime.Port,
  rawMessage: unknown,
  router: OpenModelRouter,
  grantStore: GrantStore,
  providerStore: ProviderStore,
  vault: Vault,
  telemetryStore: TelemetryStore
): Promise<void> {
  // Validate message using Zod schema
  const parseResult = PortMessageSchema.safeParse(rawMessage);
  if (!parseResult.success) {
    console.warn('[BYOM] Port message validation failed:', parseResult.error);
    const msg = rawMessage as any;
    port.postMessage({
      type: 'error',
      reqId: msg?.reqId || 'unknown',
      payload: {
        code: ErrorCode.SCHEMA_VALIDATION_FAILED,
        message: `Message validation failed: ${parseResult.error.message}`,
      },
    });
    return;
  }

  const message = parseResult.data;
  const origin = port.sender?.origin || 'unknown';

  switch (message.type) {
    case 'capabilities-query': {
      const capabilities = await buildCapabilities(origin);
      port.postMessage({
        type: 'capabilities-response',
        reqId: message.reqId,
        payload: capabilities,
      });
      break;
    }

    case 'request': {
      const rawPayload = message.payload;
      
      // First validate that it looks like a BridgeRequest
      if (!rawPayload || typeof rawPayload !== 'object' || !('task' in rawPayload)) {
        port.postMessage({
          type: 'error',
          reqId: message.reqId,
          payload: {
            code: ErrorCode.SCHEMA_VALIDATION_FAILED,
            message: 'Invalid request payload: missing task field',
          },
        });
        return;
      }

      let request = rawPayload as BridgeRequest;
      const task = request.task;

      // Validate task-specific payload using RequestPayloads
      const payloadSchema = RequestPayloads[task as keyof typeof RequestPayloads];
      if (payloadSchema) {
        const payloadResult = payloadSchema.safeParse(request.payload);
        if (!payloadResult.success) {
          port.postMessage({
            type: 'error',
            reqId: request.reqId,
            payload: {
              code: ErrorCode.SCHEMA_VALIDATION_FAILED,
              message: `Payload validation failed for task '${task}': ${payloadResult.error.message}`,
            },
          });
          return;
        }
      }

      // Check nonce replay protection in SW (with 60s TTL)
      if (seenNonces.has(origin, request.nonce)) {
        console.warn('[BYOM] SW: Replay detected, nonce:', request.nonce, 'origin:', origin);
        port.postMessage({
          type: 'error',
          reqId: request.reqId,
          payload: {
            code: ErrorCode.INVALID_REQUEST,
            message: 'Duplicate request detected (replay protection)',
          },
        });
        return;
      }
      seenNonces.add(origin, request.nonce);
      
      // Validate origin matches
      if (request.origin !== origin) {
        port.postMessage({
          type: 'error',
          reqId: request.reqId,
          payload: {
            code: ErrorCode.PERMISSION_DENIED,
            message: 'Origin mismatch',
            details: { expected: origin, received: request.origin },
          },
        });
        return;
      }

      // Check grant and process request
      try {
        let grant = await grantStore.getGrant(origin);
        const providers = await providerStore.getEnabledProviders();
        
        // Check global routing preferences - even if grant exists, we may need to ask
        const globalPrefs = await routingPrefsStore.getPreferences();
        const routingResult = await routingEngine.selectProviderWithPreferences(
          grant || {
            origin,
            providers: providers.map(p => p.kind),
            allowedTasks: [request.task as TaskType],
            dailyBudgetUSD: 5,
            monthlyBudgetUSD: 50,
            perRequestTokenCap: 4000,
            privacyMode: 'cloud-allowed',
            autoApprove: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          providers,
          globalPrefs,
          request.task as TaskType
        );

        // If routing says we should ask the user, or no grant exists, show consent dialog
        if (routingResult.shouldAskUser || !grant) {
          emitEventToOrigin(origin, 'permission-needed', {
            task: request.task,
            reqId: request.reqId,
          });
          try {
            const tabId = port.sender?.tab?.id || 0;
            const consentResult = await openConsentWindow(
              request.reqId,
              origin,
              tabId,
              request,
              grant ?? undefined
            );
            grant = consentResult.grant;

            if (consentResult.selectedProvider) {
              grant = {
                ...grant,
                providers: [consentResult.selectedProvider],
              };
            }

            if (consentResult.requestModelOverride && request.payload && typeof request.payload === 'object') {
              request = {
                ...request,
                payload: {
                  ...(request.payload as Record<string, unknown>),
                  model: consentResult.requestModelOverride,
                },
              };
            }
          } catch (consentError) {
            // User denied or window closed
            port.postMessage({
              type: 'error',
              reqId: request.reqId,
              payload: {
                code: ErrorCode.PERMISSION_DENIED,
                message: consentError instanceof Error ? consentError.message : 'Permission denied by user',
              },
            });
            return;
          }
        }

        // Budget warning at 80% of daily limit
        const { daily: dailySpend } = await grantStore.getUsage(origin);
        if (shouldShowBudgetWarning(dailySpend, grant.dailyBudgetUSD)) {
          emitEventToOrigin(origin, 'budget-warning', {
            dailySpend,
            dailyBudget: grant.dailyBudgetUSD,
            percentUsed: (dailySpend / grant.dailyBudgetUSD) * 100,
          });
        }

        // Check if task is allowed
        if (!grant.allowedTasks.includes(request.task as any)) {
          port.postMessage({
            type: 'error',
            reqId: request.reqId,
            payload: {
              code: ErrorCode.TASK_NOT_ALLOWED,
              message: `Task ${request.task} is not allowed for this site`,
            },
          });
          return;
        }

        // Handle streaming requests differently
        if (request.task === 'stream') {
          // Create abort controller for this stream
          const abortController = new AbortController();
          activeStreams.set(request.reqId, abortController);

          // Process streaming request
          try {
            // Create the stream generator
            const streamGenerator = router.processStream(request, grant, abortController.signal);
            
            // Iterate through all chunks (StreamChunk yields)
            let result = await streamGenerator.next();
            while (!result.done) {
              port.postMessage({
                type: 'delta',
                reqId: request.reqId,
                payload: result.value,
              });
              result = await streamGenerator.next();
            }

            // The final return value is the StreamFinish
            if (result.value) {
              port.postMessage({
                type: 'finish',
                reqId: request.reqId,
                payload: result.value,
              });
            }

            // Stream finished successfully
            activeStreams.delete(request.reqId);
            emitEventToOrigin(origin, 'request-complete', {
              task: request.task,
              reqId: request.reqId,
            });
          } catch (error) {
            activeStreams.delete(request.reqId);
            throw error;
          }
          
          return;
        }

        // Process the request through OpenModelRouter
        const result = await router.processRequest(request, grant);
        
        port.postMessage({
          type: 'response',
          reqId: request.reqId,
          payload: result,
        });

        emitEventToOrigin(origin, 'request-complete', {
          task: request.task,
          reqId: request.reqId,
        });
      } catch (error) {
        console.error('[BYOM] Request processing error:', error);
        
        // Convert known errors
        if (error instanceof Error && error.message.includes('vault')) {
          emitEventToOrigin(origin, 'vault-locked', { reqId: request.reqId });
          port.postMessage({
            type: 'error',
            reqId: request.reqId,
            payload: {
              code: ErrorCode.VAULT_LOCKED,
              message: 'Extension vault is locked. Please unlock it via the extension popup.',
            },
          });
          return;
        }

        if (error instanceof Error && error.message.includes('budget')) {
          port.postMessage({
            type: 'error',
            reqId: request.reqId,
            payload: {
              code: ErrorCode.BUDGET_EXCEEDED,
              message: error.message,
            },
          });
          return;
        }

        port.postMessage({
          type: 'error',
          reqId: request.reqId,
          payload: {
            code: ErrorCode.PROVIDER_ERROR,
            message: error instanceof Error ? error.message : 'Provider error',
          },
        });
      }
      break;
    }

    case 'abort': {
      // Handle abort signal
      const abortController = activeStreams.get(message.reqId);
      if (abortController) {
        console.log('[BYOM] Aborting stream:', message.reqId);
        abortController.abort();
        activeStreams.delete(message.reqId);
      }
      break;
    }

    default: {
      console.warn('[BYOM] Unknown message type:', message.type);
    }
  }
}

/**
 * Broadcast state change to all extension pages
 * Used for Zustand store synchronization
 */
function broadcastStateUpdate(topic: 'providers' | 'grants' | 'usage' | 'vault' | 'routing'): void {
  chrome.runtime.sendMessage({
    kind: 'state:invalidate',
    topic,
    timestamp: Date.now(),
  }).catch(() => {
    // Ignore errors - no listeners is OK
  });
}