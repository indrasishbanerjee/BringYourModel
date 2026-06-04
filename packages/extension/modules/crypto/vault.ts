import { storage } from '../storage/extension-storage';

/**
 * Storage keys for vault
 */
const VAULT_KEY = 'session:vaultKey';
const SALT_KEY = 'local:vaultSalt';

/** Restore raw AES key bytes from chrome.storage JSON (number[], base64 string, or TypedArray). */
function vaultKeyBytesFromStored(raw: unknown): Uint8Array | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try {
      const bin = atob(raw);
      if (bin.length !== 32) return null;
      return Uint8Array.from(bin, (c) => c.charCodeAt(0));
    } catch {
      return null;
    }
  }
  if (raw instanceof ArrayBuffer) {
    const u = new Uint8Array(raw);
    return u.byteLength === 32 ? u : null;
  }
  if (ArrayBuffer.isView(raw)) {
    const u = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
    return u.byteLength === 32 ? u : null;
  }
  if (Array.isArray(raw)) {
    const u = new Uint8Array(raw as number[]);
    return u.byteLength === 32 ? u : null;
  }
  return null;
}

function formatCryptoFailure(error: unknown): string {
  if (error instanceof DOMException) {
    return `${error.name}: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Vault - Manages encryption/decryption of provider credentials
 * 
 * Uses WebCrypto API with AES-GCM for encryption.
 * The encryption key is derived from a user passphrase using PBKDF2.
 * The derived key is cached in session storage (chrome.storage.session)
 * and never persisted to disk.
 */
export class Vault {
  private key: CryptoKey | null = null;
  private salt: Uint8Array | null = null;

  /**
   * Check if the vault is unlocked
   */
  async isUnlocked(): Promise<boolean> {
    if (this.key) return true;
    
    const cachedRaw = await storage.getItem<unknown>(VAULT_KEY);
    const cachedBytes = vaultKeyBytesFromStored(cachedRaw);
    if (cachedBytes) {
      try {
        this.key = await crypto.subtle.importKey(
          'raw',
          cachedBytes as unknown as ArrayBuffer,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );
        return true;
      } catch {
        await storage.removeItem(VAULT_KEY);
        return false;
      }
    }
    if (cachedRaw != null) {
      await storage.removeItem(VAULT_KEY);
    }
    
    return false;
  }

  /**
   * Unlock the vault with a passphrase
   */
  async unlock(passphrase: string): Promise<void> {
    try {
      // Get or create salt
      let salt = await storage.getItem<string>(SALT_KEY);
      if (!salt) {
        // Generate new salt
        const saltArray = crypto.getRandomValues(new Uint8Array(16));
        salt = Array.from(saltArray, b => b.toString(16).padStart(2, '0')).join('');
        await storage.setItem(SALT_KEY, salt);
      }
      
      this.salt = new Uint8Array(salt.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));

      // Derive key from passphrase
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(passphrase),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      this.key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: this.salt as unknown as ArrayBuffer,
          iterations: 600000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        /* extractable must be true so we can exportKey('raw') for session caching */
        true,
        ['encrypt', 'decrypt']
      );

      const exportedKey = await crypto.subtle.exportKey('raw', this.key);
      const raw = new Uint8Array(exportedKey);
      const b64 = btoa(String.fromCharCode(...raw));
      await storage.setItem(VAULT_KEY, b64);
    } catch (error) {
      console.error('[Vault] Unlock failed:', error);
      throw new Error(formatCryptoFailure(error), { cause: error });
    }
  }

  /**
   * Lock the vault (clear cached key)
   */
  async lock(): Promise<void> {
    this.key = null;
    this.salt = null;
    await storage.removeItem(VAULT_KEY);
  }

  /**
   * Encrypt data
   */
  async encrypt(plaintext: string): Promise<{ encrypted: string; iv: string }> {
    if (!this.key) {
      throw new Error('Vault is locked');
    }

    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      this.key,
      new TextEncoder().encode(plaintext)
    );

    return {
      encrypted: Array.from(new Uint8Array(encrypted), b => b.toString(16).padStart(2, '0')).join(''),
      iv: Array.from(iv, b => b.toString(16).padStart(2, '0')).join(''),
    };
  }

  /**
   * Decrypt data
   */
  async decrypt(encrypted: string, iv: string): Promise<string> {
    if (!this.key) {
      throw new Error('Vault is locked');
    }

    // Convert hex strings to Uint8Arrays
    const encryptedArray = new Uint8Array(encrypted.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const ivArray = new Uint8Array(iv.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivArray,
      },
      this.key,
      encryptedArray
    );

    return new TextDecoder().decode(decrypted);
  }

  /**
   * Change the passphrase (re-encrypt with new key)
   */
  async changePassphrase(
    oldPassphrase: string,
    newPassphrase: string,
    encryptedItems: Array<{ encrypted: string; iv: string }>
  ): Promise<Array<{ encrypted: string; iv: string }> | null> {
    try {
      await this.unlock(oldPassphrase);
    } catch {
      return null;
    }

    // Decrypt all items
    const plaintexts: string[] = [];
    for (const item of encryptedItems) {
      try {
        const plaintext = await this.decrypt(item.encrypted, item.iv);
        plaintexts.push(plaintext);
      } catch (error) {
        console.error('[Vault] Failed to decrypt item during passphrase change');
        return null;
      }
    }

    await this.lock();
    try {
      await this.unlock(newPassphrase);
    } catch {
      return null;
    }

    // Re-encrypt all items
    const reencrypted: Array<{ encrypted: string; iv: string }> = [];
    for (const plaintext of plaintexts) {
      const result = await this.encrypt(plaintext);
      reencrypted.push(result);
    }

    return reencrypted;
  }
}