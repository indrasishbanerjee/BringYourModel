import React, { useState, useEffect } from 'react';
import {
  type ProviderId,
  type ProviderConfig,
} from '@byom/shared';
import { providerRequiresApiKey, testProviderConnection } from '../../modules/openmodelrouter/providers/registry';
import { getDashboardClient } from '../../modules/dashboard/rpc-client';
import { BrandMark, HeroCard, StatMini, ProviderMonogram, StatusChip, SectionHeader } from '../ui/components';
import { ProviderFormFields } from '../ui/ProviderFormFields';
import {
  byomTheme,
  primaryBtnStyle,
  secondaryBtnStyle,
  ghostBtnStyle,
  dangerOutlineBtnStyle,
  inputStyle,
  elevatedCard,
  insetPanelStyle,
  loadingStyle,
} from '../ui/theme';

const dashboard = getDashboardClient();
const EXTENSION_VERSION = chrome.runtime.getManifest().version;
const PRIVACY_POLICY_URL = 'https://bringyourmodel.com/privacy';

interface ProviderFormData {
  kind: ProviderId;
  label: string;
  apiKey: string;
  baseURL?: string;
  defaultModel?: string;
}

const popupSurfaceStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  padding: 18,
  background: byomTheme.surface,
  borderRadius: 12,
  border: `1px solid ${byomTheme.border}`,
  boxShadow: '0 1px 2px rgba(5, 150, 105, 0.08)',
};

const sidepanelSurfaceStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  minHeight: '100%',
  padding: 0,
  background: 'transparent',
  border: 'none',
  borderRadius: 0,
  boxShadow: 'none',
};

export interface SidepanelSummary {
  providerCount: number;
  grantCount: number;
  stats: { totalRequests: number; totalCostUSD: number; totalOrigins: number } | null;
  isVaultLocked: boolean | null;
}

export interface PopupProps {
  /** Embedded in Chrome side panel — title lives in sidepanel shell. */
  variant?: 'popup' | 'sidepanel';
  summary?: SidepanelSummary;
}

export const Popup: React.FC<PopupProps> = ({ variant = 'popup', summary }) => {
  const isSidepanel = variant === 'sidepanel';
  const surfaceStyle = isSidepanel ? sidepanelSurfaceStyle : popupSurfaceStyle;
  const [isVaultLocked, setIsVaultLocked] = useState(true);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<ProviderFormData>({
    kind: 'openai',
    label: '',
    apiKey: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  useEffect(() => {
    void checkVaultStatus();
  }, []);

  const checkVaultStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const isUnlocked = await dashboard.getVaultStatus();
      setIsVaultLocked(!isUnlocked);
      setShowUnlockModal(!isUnlocked);
    } catch (err) {
      console.error('[BYOM Popup] Error checking vault status:', err);
      setError(err instanceof Error ? err.message : 'Failed to check vault status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError(null);
    setIsUnlocking(true);

    try {
      await dashboard.unlockVault(passphrase);
      setIsVaultLocked(false);
      setShowUnlockModal(false);
      setPassphrase('');
      await loadProviders();
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : 'Failed to unlock vault');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleLock = async () => {
    await dashboard.lockVault();
    setIsVaultLocked(true);
    setShowUnlockModal(true);
  };

  useEffect(() => {
    void loadProviders();
  }, []);

  // Sync with parent vault state (e.g., masthead Lock button while on Home tab)
  useEffect(() => {
    if (!isSidepanel) return;
    if (summary?.isVaultLocked === true) {
      setIsVaultLocked(true);
      setShowUnlockModal(true);
    } else if (summary?.isVaultLocked === false) {
      setIsVaultLocked(false);
      setShowUnlockModal(false);
    }
    // null = parent still loading, leave local state unchanged
  }, [isSidepanel, summary?.isVaultLocked]);

  const loadProviders = async () => {
    try {
      setIsLoading(true);

      const vaultUnlocked = await dashboard.getVaultStatus();
      setIsVaultLocked(!vaultUnlocked);

      if (vaultUnlocked) {
        setShowUnlockModal(false);
        const stored = await dashboard.getProviders();
        setProviders(stored.filter((p) => p.isEnabled));
      } else {
        setProviders([]);
        setShowUnlockModal(true);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
      setError('Failed to load providers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!(await dashboard.getVaultStatus())) {
        setError('Vault is locked. Please unlock the vault first.');
        setShowUnlockModal(true);
        return;
      }

      if (!formData.label.trim()) {
        setError('Label is required');
        return;
      }
      if (!formData.apiKey.trim() && providerRequiresApiKey(formData.kind)) {
        setError('API key is required');
        return;
      }

      const testResult = await testProviderConnection(
        formData.kind,
        formData.apiKey,
        formData.baseURL
      );
      if (!testResult.success) {
        setError(`Connection failed: ${testResult.error}`);
        return;
      }

      await dashboard.addProvider({
        providerKind: formData.kind,
        label: formData.label,
        apiKey: formData.apiKey,
        baseURL: formData.baseURL,
        defaultModel: formData.defaultModel,
        isEnabled: true,
      });

      setFormData({ kind: 'openai', label: '', apiKey: '' });
      setShowAddForm(false);
      await loadProviders();
    } catch (error) {
      console.error('Failed to add provider:', error);
      setError(error instanceof Error ? error.message : 'Failed to add provider');
    }
  };

  const handleRemoveProvider = async (id: string) => {
    try {
      await dashboard.removeProvider(id);
      await loadProviders();
    } catch (error) {
      console.error('Failed to remove provider:', error);
      setError('Failed to remove provider');
    }
  };

  const handleTestProvider = async (provider: ProviderConfig) => {
    setTestingProvider(provider.id);
    setTestResult(null);

    try {
      const result = await dashboard.testProvider(provider.id);
      setTestResult({
        id: provider.id,
        success: result.success,
        message: result.success
          ? result.models?.length
            ? `✓ Connected! Found ${result.models.length} models`
            : '✓ Connected'
          : `✗ ${result.error}`,
      });
    } catch (error) {
      setTestResult({
        id: provider.id,
        success: false,
        message: `✗ ${error instanceof Error ? error.message : 'Test failed'}`,
      });
    } finally {
      setTestingProvider(null);
    }
  };

  if (isLoading) {
    return (
      <div style={surfaceStyle}>
        <div style={isSidepanel ? { padding: 12 } : undefined}>
          <p style={loadingStyle()}>Loading…</p>
        </div>
      </div>
    );
  }

  // Unlock modal overlay
  if (showUnlockModal) {
    return (
      <div style={surfaceStyle}>
        <div style={isSidepanel ? { padding: 12 } : undefined}>
        {isSidepanel ? (
          <div style={{ ...elevatedCard(), marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: byomTheme.text, marginBottom: 6 }}>Unlock your vault</div>
            <p style={{ margin: 0, fontSize: 13, color: byomTheme.textMuted, lineHeight: 1.45 }}>
              Your API keys are encrypted. Enter your passphrase to manage providers and route AI on any site.
            </p>
          </div>
        ) : (
          <header style={{ marginBottom: 18, borderBottom: '1px solid #e5e7eb', paddingBottom: 16 }}>
            <BrandMark subtitle="Unlock your secure vault" />
          </header>
        )}

        <form onSubmit={handleUnlock}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
              Use your vault passphrase to unlock, or choose one the first time — it encrypts your saved API keys.
              {unlockError && (
                <div style={{ 
                  padding: 12, 
                  background: '#fee', 
                  border: '1px solid #fcc', 
                  borderRadius: 8,
                  marginTop: 12,
                  fontSize: 14,
                  color: '#c00'
                }}>
                  {unlockError}
                </div>
              )}
            </p>
            <label style={{ display: 'block', fontSize: 14, marginBottom: 4, fontWeight: 500 }}>
              Passphrase
            </label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter your vault passphrase"
              autoFocus
              style={{ ...inputStyle, padding: 10 }}
            />
          </div>
          <button
            type="submit"
            disabled={isUnlocking || !passphrase.trim()}
            style={{
              ...primaryBtnStyle(),
              width: '100%',
              padding: 12,
              cursor: isUnlocking || !passphrase.trim() ? 'not-allowed' : 'pointer',
              opacity: isUnlocking || !passphrase.trim() ? 0.6 : 1,
            }}
          >
            {isUnlocking ? 'Unlocking...' : 'Unlock Vault'}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 12, color: byomTheme.textSubtle, textAlign: 'center' }}>
          This passphrase encrypts your API keys. Never share it.
        </p>
        </div>
      </div>
    );
  }

  return (
    <div style={surfaceStyle}>
      <div style={isSidepanel ? { padding: 12 } : undefined}>
      {isSidepanel && summary ? (
        <>
          <HeroCard
            title={summary.isVaultLocked ? 'Vault locked' : 'Your AI wallet is ready'}
            subtitle="User-owned AI for the browser — your keys, your rules."
            badge={<StatusChip label={summary.isVaultLocked ? 'Locked' : 'Unlocked'} tone={summary.isVaultLocked ? 'danger' : 'success'} />}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
            <StatMini label="Providers" value={summary.providerCount} accent="primary" />
            <StatMini label="Sites" value={summary.grantCount} accent="muted" />
            <StatMini
              label="Spend"
              value={summary.stats ? `$${summary.stats.totalCostUSD.toFixed(2)}` : '$0'}
              accent="success"
            />
          </div>
        </>
      ) : !isSidepanel ? (
        <header style={{ marginBottom: 18, borderBottom: '1px solid #e5e7eb', paddingBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <BrandMark subtitle="User-owned AI for the browser" />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                background: isVaultLocked ? '#fee' : '#d4edda',
                borderRadius: 4,
                fontSize: 12,
                color: isVaultLocked ? '#c00' : '#155724',
              }}
            >
              {isVaultLocked ? '🔒 Locked' : '🔓 Unlocked'}
            </div>
          </div>
        </header>
      ) : null}

      {error && (
        <div style={{ 
          padding: 12, 
          background: '#fee', 
          border: '1px solid #fcc', 
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 14,
          color: '#c00'
        }}>
          {error}
        </div>
      )}

      <section style={{ marginBottom: isSidepanel ? 12 : 16 }}>
        {isSidepanel ? (
          <SectionHeader
            title="Quick access"
            subtitle="Providers ready for the current tab"
            action={
              <button type="button" onClick={() => setShowAddForm(!showAddForm)} style={showAddForm ? ghostBtnStyle() : primaryBtnStyle(true)}>
                {showAddForm ? 'Cancel' : '+ Add'}
              </button>
            }
          />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>AI Providers</h2>
            <button type="button" onClick={() => setShowAddForm(!showAddForm)} style={primaryBtnStyle(true)}>
              {showAddForm ? 'Cancel' : '+ Add'}
            </button>
          </div>
        )}

        {showAddForm && (
          <form onSubmit={handleAddProvider} style={isSidepanel ? insetPanelStyle() : { marginBottom: 16 }}>
            <div style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
              <ProviderFormFields
                kind={formData.kind}
                label={formData.label}
                apiKey={formData.apiKey}
                baseURL={formData.baseURL || ''}
                defaultModel={formData.defaultModel || ''}
                onKindChange={(kind) => setFormData({ ...formData, kind })}
                onLabelChange={(label) => setFormData({ ...formData, label })}
                onApiKeyChange={(apiKey) => setFormData({ ...formData, apiKey })}
                onBaseURLChange={(baseURL) => setFormData({ ...formData, baseURL })}
                onDefaultModelChange={(defaultModel) => setFormData({ ...formData, defaultModel })}
                inputStyle={inputStyle}
                modelInputId="popup-provider-model"
              />
            </div>

            <button
              type="submit"
              style={{ ...primaryBtnStyle(), width: '100%', padding: 10 }}
            >
              Save Provider
            </button>
          </form>
        )}

        {providers.length === 0 ? (
          <p style={{ fontSize: 13, color: byomTheme.textMuted, fontStyle: 'italic', margin: 0 }}>
            No providers configured. Add one to get started.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            {providers.map((provider) => (
              <li key={provider.id} style={isSidepanel ? elevatedCard() : { padding: 12, background: byomTheme.primaryLight, border: `1px solid ${byomTheme.border}`, borderRadius: 8 }}>
                <div style={{ display: 'flex', gap: isSidepanel ? 10 : 0, alignItems: 'center' }}>
                  {isSidepanel && <ProviderMonogram kind={provider.kind} label={provider.label} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: byomTheme.text }}>{provider.label}</div>
                    <div style={{ fontSize: 11, color: byomTheme.textMuted, textTransform: 'capitalize', marginTop: 2 }}>
                      {provider.kind}
                      {provider.defaultModel && ` · ${provider.defaultModel}`}
                    </div>
                    {testResult?.id === provider.id && (
                      <div style={{ fontSize: 11, marginTop: 6, color: testResult.success ? byomTheme.success : byomTheme.danger }}>
                        {testResult.message}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleTestProvider(provider)}
                      disabled={testingProvider === provider.id}
                      style={isSidepanel ? secondaryBtnStyle() : ghostBtnStyle()}
                    >
                      {testingProvider === provider.id ? '…' : 'Test'}
                    </button>
                    <button type="button" onClick={() => handleRemoveProvider(provider.id)} style={dangerOutlineBtnStyle()}>
                      ×
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!isSidepanel && (
        <footer style={{ borderTop: `1px solid ${byomTheme.border}`, paddingTop: 16 }}>
          <button type="button" onClick={handleLock} style={{ ...ghostBtnStyle(), width: '100%' }}>
            Lock vault
          </button>
          <p style={{ margin: '12px 0 0', fontSize: 11, color: byomTheme.textSubtle, textAlign: 'center' }}>
            <a
              href={PRIVACY_POLICY_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: byomTheme.textSubtle, textDecoration: 'underline' }}
            >
              Privacy
            </a>
            {' · '}
            <a
              href="https://bringyourmodel.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: byomTheme.textSubtle, textDecoration: 'none' }}
            >
              bringyourmodel.com
            </a>
            {' · v'}
            {EXTENSION_VERSION}
          </p>
        </footer>
      )}

      {isSidepanel && (
        <p style={{ margin: '8px 0 0', fontSize: 10, color: byomTheme.textSubtle, textAlign: 'center' }}>
          <a
            href={PRIVACY_POLICY_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: byomTheme.textSubtle, textDecoration: 'underline' }}
          >
            Privacy
          </a>
          {' · '}
          <a
            href="https://bringyourmodel.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: byomTheme.textSubtle, textDecoration: 'none' }}
          >
            bringyourmodel.com
          </a>
          {' · v'}
          {EXTENSION_VERSION}
        </p>
      )}
      </div>
    </div>
  );
};