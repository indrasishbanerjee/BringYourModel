import { storage } from './extension-storage';
import { type ProviderConfig, ProviderConfigSchema, type ProviderId } from '@byom/shared';
import { Vault } from '../crypto/vault';

/**
 * Storage key for providers
 */
const PROVIDERS_KEY = 'local:providers';

/**
 * ProviderStore - Manages AI provider configurations
 */
export class ProviderStore {
  private vault: Vault;

  constructor(vault: Vault) {
    this.vault = vault;
  }
  /**
   * Get all providers
   */
  async getAllProviders(): Promise<ProviderConfig[]> {
    const providers = await storage.getItem<ProviderConfig[]>(PROVIDERS_KEY);
    return providers || [];
  }

  /**
   * Get enabled providers only
   */
  async getEnabledProviders(): Promise<ProviderConfig[]> {
    const providers = await this.getAllProviders();
    return providers.filter(p => p.isEnabled);
  }

  /**
   * Get a provider by ID
   */
  async getProvider(id: string): Promise<ProviderConfig | null> {
    const providers = await this.getAllProviders();
    return providers.find(p => p.id === id) || null;
  }

  /**
   * Get a provider by kind (returns first enabled one)
   */
  async getProviderByKind(kind: ProviderId): Promise<ProviderConfig | null> {
    const providers = await this.getEnabledProviders();
    return providers.find(p => p.kind === kind) || null;
  }

  /**
   * Check if vault is unlocked and ready for encryption
   */
  async isVaultReady(): Promise<boolean> {
    return this.vault.isUnlocked();
  }

  /**
   * Add a new provider
   * The apiKey will be encrypted using the vault before storage
   */
  async addProvider(
    kind: ProviderId,
    label: string,
    apiKey: string,
    options: {
      baseURL?: string;
      defaultModel?: string;
    } = {}
  ): Promise<ProviderConfig> {
    // Ensure vault is unlocked
    if (!await this.vault.isUnlocked()) {
      throw new Error('Vault is locked. Please unlock the vault first.');
    }

    const providers = await this.getAllProviders();
    
    // Encrypt the API key
    const { encrypted, iv } = await this.vault.encrypt(apiKey);
    
    // Get the salt from vault (it's stored during unlock)
    const salt = await storage.getItem<string>('local:vaultSalt') || '';
    
    const newProvider: ProviderConfig = {
      id: crypto.randomUUID(),
      kind,
      label,
      encryptedSecret: encrypted,
      iv,
      salt,
      baseURL: options.baseURL,
      defaultModel: options.defaultModel,
      isEnabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Validate
    ProviderConfigSchema.parse(newProvider);

    providers.push(newProvider);
    await storage.setItem(PROVIDERS_KEY, providers);

    return newProvider;
  }

  /**
   * Update a provider
   */
  async updateProvider(
    id: string,
    updates: Partial<Omit<ProviderConfig, 'id' | 'createdAt'>>
  ): Promise<ProviderConfig | null> {
    const providers = await this.getAllProviders();
    const index = providers.findIndex(p => p.id === id);
    
    if (index === -1) return null;

    providers[index] = {
      ...providers[index],
      ...updates,
      updatedAt: Date.now(),
    };

    // Validate
    ProviderConfigSchema.parse(providers[index]);

    await storage.setItem(PROVIDERS_KEY, providers);
    return providers[index];
  }

  /**
   * Remove a provider
   */
  async removeProvider(id: string): Promise<boolean> {
    const providers = await this.getAllProviders();
    const filtered = providers.filter(p => p.id !== id);
    
    if (filtered.length === providers.length) {
      return false; // Not found
    }

    await storage.setItem(PROVIDERS_KEY, filtered);
    return true;
  }

  /**
   * Enable/disable a provider
   */
  async setProviderEnabled(id: string, enabled: boolean): Promise<boolean> {
    const result = await this.updateProvider(id, { isEnabled: enabled });
    return result !== null;
  }

  /**
   * Rotate a provider's API key
   * The newApiKey will be encrypted using the vault before storage
   */
  async rotateApiKey(
    id: string,
    newApiKey: string
  ): Promise<boolean> {
    // Ensure vault is unlocked
    if (!await this.vault.isUnlocked()) {
      throw new Error('Vault is locked. Please unlock the vault first.');
    }

    // Encrypt the new API key
    const { encrypted, iv } = await this.vault.encrypt(newApiKey);
    const salt = await storage.getItem<string>('local:vaultSalt') || '';

    const result = await this.updateProvider(id, {
      encryptedSecret: encrypted,
      iv,
      salt,
    });
    return result !== null;
  }

  /**
   * Test if a provider is reachable
   */
  async testProvider(id: string): Promise<{ success: boolean; error?: string }> {
    const provider = await this.getProvider(id);
    if (!provider) {
      return { success: false, error: 'Provider not found' };
    }

    // In Phase 2, implement actual provider testing
    // For now, just check if it exists and is enabled
    if (!provider.isEnabled) {
      return { success: false, error: 'Provider is disabled' };
    }

    return { success: true };
  }
}