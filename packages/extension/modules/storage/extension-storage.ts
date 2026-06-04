/**
 * Chrome-first `area:key` storage (local/session).
 * Workaround: `wxt/storage` prefers `globalThis.browser` when `browser.runtime.id`
 * exists; some Chrome setups expose `browser` without `storage`, which breaks vault unlock.
 */

declare const browser: typeof chrome | undefined;

type StorageAreaName = 'local' | 'session';

function getExtensionApis(): typeof chrome {
  const chrom = globalThis.chrome as typeof chrome | undefined;
  if (chrom?.storage?.local && chrom?.storage?.session) {
    return chrom;
  }
  const brows = globalThis.browser as typeof chrome | undefined;
  if (brows?.storage?.local && brows?.storage?.session) {
    return brows;
  }
  throw new Error(
    'Extension storage API unavailable. Add "storage" to manifest permissions and reload the extension.'
  );
}

function parseKey(fullKey: string): { area: StorageAreaName; key: string } {
  const i = fullKey.indexOf(':');
  if (i <= 0) {
    throw new Error(`Invalid storage key "${fullKey}": expected "area:key"`);
  }
  const area = fullKey.slice(0, i) as StorageAreaName;
  const key = fullKey.slice(i + 1);
  if (area !== 'local' && area !== 'session') {
    throw new Error(`Invalid storage area in "${fullKey}"`);
  }
  return { area, key };
}

function storageArea(area: StorageAreaName): chrome.storage.StorageArea {
  const ext = getExtensionApis();
  return area === 'session' ? ext.storage.session : ext.storage.local;
}

export const storage = {
  async getItem<T>(fullKey: string): Promise<T | null> {
    const ext = getExtensionApis();
    const { area, key } = parseKey(fullKey);
    const api = storageArea(area);
    return new Promise((resolve, reject) => {
      api.get(key, (items) => {
        const err = ext.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        const raw = (items as Record<string, unknown>)[key];
        resolve(raw !== undefined ? (raw as T) : null);
      });
    });
  },

  async setItem(fullKey: string, value: unknown): Promise<void> {
    const ext = getExtensionApis();
    const { area, key } = parseKey(fullKey);
    const api = storageArea(area);
    return new Promise((resolve, reject) => {
      api.set({ [key]: value }, () => {
        const err = ext.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve();
      });
    });
  },

  async removeItem(fullKey: string): Promise<void> {
    const ext = getExtensionApis();
    const { area, key } = parseKey(fullKey);
    const api = storageArea(area);
    return new Promise((resolve, reject) => {
      api.remove(key, () => {
        const err = ext.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve();
      });
    });
  },
};
