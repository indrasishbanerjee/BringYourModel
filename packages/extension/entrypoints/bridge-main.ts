/**
 * Main-world bridge script
 * 
 * This script runs in the main world (not isolated) and acts as a relay
 * between the page's byom SDK and the isolated content script.
 * 
 * It uses its own <script> element (document.currentScript) as the
 * shared event target for bidirectional communication (literal plan pattern).
 */

import { defineUnlistedScript } from 'wxt/sandbox';
import {
  EventNames,
  PROTOCOL_VERSION,
} from '@byom/shared';

export default defineUnlistedScript(() => {
  // Get our own script element as the shared event target.
  const relayEl =
    (document.currentScript as HTMLScriptElement | null) ??
    (document.getElementById('byom-bridge') as HTMLScriptElement | null);

  if (!relayEl) {
    console.error('[BYOM] Main-world script: no relay element (expected #byom-bridge)');
    return;
  }

  /**
   * Relay page-world events TO the isolated content script.
   *
   * The SDK dispatches REQUEST/ABORT/PING on the relay element. We forward them
   * to `window` so the isolated content script's window listener sees them.
   *
   * NOTE: We do NOT relay the reverse direction (window → relayEl) for
   * RESPONSE/DELTA/FINISH/ERROR/PONG. The content script already dispatches
   * those on the relay element with { bubbles: true }, which causes them to
   * bubble up the DOM to `window` naturally. The SDK (page world) listens on
   * `window` and receives them via that bubbling path.
   *
   * Adding a window→relayEl relay for those events creates an infinite loop:
   *   relayEl (bubbles) → window → bridge-main re-dispatches on relayEl → ...
   */
  relayEl.addEventListener(EventNames.REQUEST, (event) => {
    window.dispatchEvent(new CustomEvent(EventNames.REQUEST, {
      detail: (event as CustomEvent).detail,
    }));
  });

  relayEl.addEventListener(EventNames.ABORT, (event) => {
    window.dispatchEvent(new CustomEvent(EventNames.ABORT, {
      detail: (event as CustomEvent).detail,
    }));
  });

  relayEl.addEventListener(EventNames.PING, (event) => {
    window.dispatchEvent(new CustomEvent(EventNames.PING, {
      detail: (event as CustomEvent).detail,
    }));
  });

  console.log('[BYOM] Main-world bridge initialized on element:', relayEl.id);
});