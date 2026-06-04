import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Plug, Route, Globe, BarChart3, type LucideIcon } from 'lucide-react';
import { Popup } from '../popup/Popup';
import { getDashboardClient } from '../../modules/dashboard/rpc-client';
import type { ProviderId, ProviderConfig, Grant, UsageRecord, GlobalRoutingPreferences, TaskType, PrivacyMode } from '@byom/shared';
import { isLocalProvider, providerRequiresApiKey, providerSupportsBaseURL, testProviderConnection, PROVIDER_REGISTRY } from '../../modules/openmodelrouter/providers/registry';
import { usageRecordTokenTotal } from '../../modules/openmodelrouter/telemetry/usage';
import { BrandMark, SectionHeader, StatMini, StatusChip, ProviderMonogram, EmptyState, SiteFavicon } from '../ui/components';
import { ProviderFormFields } from '../ui/ProviderFormFields';
import {
  byomTheme,
  appShellStyle,
  mastheadStyle,
  mastheadOverlayStyle,
  statusCapsule,
  ghostBtnOnGreenStyle,
  navRailStyle,
  navPillStyle,
  contentAreaStyle,
  primaryBtnStyle,
  secondaryBtnStyle,
  ghostBtnStyle,
  dangerOutlineBtnStyle,
  inputStyle,
  selectStyle,
  elevatedCard,
  insetPanelStyle,
  strategyCardStyle,
  chipStyle,
  loadingStyle,
} from '../ui/theme';

const dashboard = getDashboardClient();

type Tab = 'dashboard' | 'providers' | 'routing' | 'sites' | 'usage';

const TAB_CONFIG: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Home', Icon: LayoutDashboard },
  { id: 'providers', label: 'Keys', Icon: Plug },
  { id: 'routing', label: 'Route', Icon: Route },
  { id: 'sites', label: 'Sites', Icon: Globe },
  { id: 'usage', label: 'Usage', Icon: BarChart3 },
];

export const SidepanelApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [stats, setStats] = useState<{ totalRequests: number; totalCostUSD: number; totalOrigins: number } | null>(null);
  const [routingPrefs, setRoutingPrefs] = useState<GlobalRoutingPreferences | null>(null);
  const [isVaultLocked, setIsVaultLocked] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [budgetWarnings, setBudgetWarnings] = useState<string[]>([]);
  const [onboardingStep, setOnboardingStep] = useState(0);

  useEffect(() => {
    loadData();
    const unsubscribe = dashboard.onStateInvalidate((topic) => {
      if (topic === 'providers' || topic === 'grants' || topic === 'usage' || topic === 'routing' || topic === 'vault') {
        loadData();
      }
    });
    return unsubscribe;
  }, []);

  const refreshRoutingPreferences = async (next?: GlobalRoutingPreferences) => {
    if (next) {
      setRoutingPrefs(next);
      return;
    }
    const r = await dashboard.getRoutingPreferences();
    setRoutingPrefs(r);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [p, g, u, r, vaultStatus] = await Promise.all([
        dashboard.getProviders(),
        dashboard.getGrants(),
        dashboard.getUsage(50),
        dashboard.getRoutingPreferences(),
        dashboard.getVaultStatus(),
      ]);
      setProviders(p);
      setGrants(g);
      setStats(u.stats);
      setUsage(u.usage);
      setRoutingPrefs(r);
      setIsVaultLocked(!vaultStatus);

      const warnings: string[] = [];
      for (const grant of g) {
        const originUsage = await dashboard.getOriginUsage(grant.origin);
        if (grant.dailyBudgetUSD > 0 && originUsage.daily / grant.dailyBudgetUSD >= 0.8) {
          warnings.push(`${grant.origin}: ${((originUsage.daily / grant.dailyBudgetUSD) * 100).toFixed(0)}% of daily budget used`);
        }
        if (grant.monthlyBudgetUSD > 0 && originUsage.monthly / grant.monthlyBudgetUSD >= 0.8) {
          warnings.push(`${grant.origin}: ${((originUsage.monthly / grant.monthlyBudgetUSD) * 100).toFixed(0)}% of monthly budget used`);
        }
      }
      setBudgetWarnings(warnings);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={appShellStyle}>
      <header style={mastheadStyle}>
        <div style={mastheadOverlayStyle} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <BrandMark variant="masthead" />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={statusCapsule(isVaultLocked === false)}>
              {isVaultLocked === null ? '···' : isVaultLocked ? 'Vault locked' : 'Vault unlocked'}
            </span>
            {isVaultLocked === false && (
              <button type="button" onClick={() => dashboard.lockVault().then(loadData)} style={ghostBtnOnGreenStyle()}>
                Lock
              </button>
            )}
          </div>
        </div>
      </header>

      {budgetWarnings.length > 0 && (
        <div
          style={{
            flexShrink: 0,
            padding: '8px 14px',
            background: byomTheme.warningBg,
            borderBottom: `1px solid ${byomTheme.border}`,
            fontSize: 11,
            color: byomTheme.warning,
          }}
        >
          <strong>Budget warning:</strong> {budgetWarnings.join(' • ')}
        </div>
      )}

      <nav style={navRailStyle} aria-label="Extension sections">
        {TAB_CONFIG.map(({ id, label, Icon }) => {
          const isLocked = (isVaultLocked !== false) && id !== 'dashboard';
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              style={{
                ...navPillStyle(active),
                opacity: isLocked ? 0.45 : 1,
                cursor: isLocked ? 'not-allowed' : 'pointer',
              }}
              onClick={() => !isLocked && setActiveTab(id)}
              disabled={isLocked}
              title={isLocked ? 'Unlock vault to access' : label}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              {label}
            </button>
          );
        })}
      </nav>

      <div style={contentAreaStyle}>
        {activeTab === 'dashboard' && (
          isVaultLocked === null ? (
            <div style={loadingStyle()}>Loading…</div>
          ) : !isVaultLocked && providers.length === 0 ? (
            <OnboardingWizard
              step={onboardingStep}
              onStepChange={setOnboardingStep}
              onGoToProviders={() => setActiveTab('providers')}
            />
          ) : (
            <Popup
              variant="sidepanel"
              summary={{
                providerCount: providers.length,
                grantCount: grants.length,
                stats,
                isVaultLocked,
              }}
            />
          )
        )}
        {activeTab === 'providers' && (
          <ProvidersTab providers={providers} isLoading={isLoading} onRefresh={loadData} />
        )}
        {activeTab === 'routing' && (
          <RoutingTab
            preferences={routingPrefs}
            providers={providers}
            isLoading={isLoading && routingPrefs === null}
            onRoutingRefresh={refreshRoutingPreferences}
          />
        )}
        {activeTab === 'sites' && <SitesTab grants={grants} isLoading={isLoading} onRefresh={loadData} />}
        {activeTab === 'usage' && (
          <UsageTab usage={usage} stats={stats} isLoading={isLoading} onRefresh={loadData} />
        )}

        {/* Vault Locked Overlay - covers all tabs except dashboard which handles unlock */}
        {isVaultLocked === true && activeTab !== 'dashboard' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(240, 253, 244, 0.92)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              zIndex: 100,
            }}
          >
            <div style={{ ...elevatedCard(), maxWidth: 280, textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: byomTheme.text, marginBottom: 8 }}>Vault is locked</div>
              <p style={{ margin: '0 0 18px', fontSize: 13, color: byomTheme.textMuted, lineHeight: 1.5 }}>
                Unlock on Home to manage providers, routing, and site permissions.
              </p>
              <button type="button" onClick={() => setActiveTab('dashboard')} style={{ ...primaryBtnStyle(), width: '100%' }}>
                Go to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Onboarding Wizard
const OnboardingWizard: React.FC<{
  step: number;
  onStepChange: (step: number) => void;
  onGoToProviders: () => void;
}> = ({ step, onStepChange, onGoToProviders }) => {
  const steps = [
    { title: 'Welcome', body: 'Bring Your Model lets you use your own AI keys on any website — securely, with your consent.' },
    { title: 'Connect a Provider', body: 'Add OpenAI, Anthropic, Google, Ollama, or OpenRouter. Your keys stay encrypted in the vault.' },
    { title: 'Approve Sites', body: 'When a site requests AI access, you approve it once with budget limits. You stay in control.' },
  ];

  return (
    <div style={{ ...elevatedCard(), margin: 4, textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🚀</div>
      <h2 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: byomTheme.text }}>{steps[step].title}</h2>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: byomTheme.textMuted, lineHeight: 1.55 }}>{steps[step].body}</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 18 }}>
        {steps.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === step ? 20 : 8,
              height: 8,
              borderRadius: 999,
              background: i === step ? byomTheme.primary : '#cbd5e1',
              transition: 'width 0.2s',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {step > 0 && (
          <button type="button" onClick={() => onStepChange(step - 1)} style={ghostBtnStyle()}>
            Back
          </button>
        )}
        {step < steps.length - 1 ? (
          <button type="button" onClick={() => onStepChange(step + 1)} style={primaryBtnStyle(true)}>
            Next
          </button>
        ) : (
          <button type="button" onClick={onGoToProviders} style={primaryBtnStyle(true)}>
            Add provider
          </button>
        )}
      </div>
    </div>
  );
};

function connectionTone(status: 'connected' | 'error' | 'locked' | 'unknown'): 'success' | 'danger' | 'muted' {
  if (status === 'connected') return 'success';
  if (status === 'error') return 'danger';
  return 'muted';
}

// Providers Tab
const ProvidersTab: React.FC<{
  providers: ProviderConfig[];
  isLoading: boolean;
  onRefresh: () => void;
}> = ({ providers, isLoading, onRefresh }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    kind: 'openai' as ProviderId,
    label: '',
    apiKey: '',
    baseURL: '',
    defaultModel: '',
  });
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, 'connected' | 'error' | 'locked' | 'unknown'>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ label: '', defaultModel: '', baseURL: '', isEnabled: true });
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    providers.forEach((provider) => {
      void dashboard.testProvider(provider.id).then((result) => {
        setStatusMap((prev) => ({
          ...prev,
          [provider.id]: result.success ? 'connected' : 'error',
        }));
      });
    });
  }, [providers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!form.label.trim()) {
      setAddError('Display label is required');
      return;
    }
    if (!form.apiKey.trim() && providerRequiresApiKey(form.kind)) {
      setAddError('API key is required');
      return;
    }

    const testResult = await testProviderConnection(form.kind, form.apiKey, form.baseURL || undefined);
    if (!testResult.success) {
      setAddError(`Connection failed: ${testResult.error || 'Unknown error'}`);
      return;
    }

    try {
      await dashboard.addProvider({
        providerKind: form.kind,
        label: form.label,
        apiKey: form.apiKey,
        baseURL: form.baseURL || undefined,
        defaultModel: form.defaultModel || undefined,
        isEnabled: true,
      });
      setForm({ kind: 'openai', label: '', apiKey: '', baseURL: '', defaultModel: '' });
      setShowAdd(false);
      onRefresh();
    } catch (error) {
      setAddError(error instanceof Error ? error.message : 'Failed to add provider');
    }
  };

  const handleTest = async (provider: ProviderConfig) => {
    setTestingId(provider.id);
    setTestResult(null);
    const result = await dashboard.testProvider(provider.id);
    setStatusMap((prev) => ({ ...prev, [provider.id]: result.success ? 'connected' : 'error' }));
    setTestResult({
      id: provider.id,
      success: result.success,
      message: result.success
        ? result.models?.length
          ? `Connected! ${result.models.length} models`
          : 'Connected'
        : result.error || 'Failed',
    });
    setTestingId(null);
  };

  const startEdit = (p: ProviderConfig) => {
    setEditingId(p.id);
    setEditForm({
      label: p.label,
      defaultModel: p.defaultModel || '',
      baseURL: p.baseURL || '',
      isEnabled: p.isEnabled,
    });
  };

  const saveEdit = async (id: string) => {
    await dashboard.updateProvider(id, {
      label: editForm.label,
      defaultModel: editForm.defaultModel || undefined,
      baseURL: editForm.baseURL || undefined,
      isEnabled: editForm.isEnabled,
    });
    setEditingId(null);
    onRefresh();
  };

  if (isLoading) return <div style={loadingStyle()}>Loading providers…</div>;

  return (
    <div>
      <SectionHeader
        title="AI Providers"
        subtitle={`${providers.length} connected key${providers.length === 1 ? '' : 's'}`}
        action={
          <button type="button" onClick={() => setShowAdd(!showAdd)} style={showAdd ? ghostBtnStyle() : primaryBtnStyle(true)}>
            {showAdd ? 'Cancel' : '+ Add'}
          </button>
        }
      />

      {showAdd && (
        <form onSubmit={handleAdd} style={insetPanelStyle()}>
          <div style={{ fontSize: 12, fontWeight: 700, color: byomTheme.primaryDark, marginBottom: 10 }}>New provider</div>
          {addError && (
            <div style={{ fontSize: 12, color: byomTheme.danger, marginBottom: 8 }}>{addError}</div>
          )}
          <div style={{ display: 'grid', gap: 10 }}>
            <ProviderFormFields
              kind={form.kind}
              label={form.label}
              apiKey={form.apiKey}
              baseURL={form.baseURL}
              defaultModel={form.defaultModel}
              onKindChange={(kind) => setForm({ ...form, kind })}
              onLabelChange={(label) => setForm({ ...form, label })}
              onApiKeyChange={(apiKey) => setForm({ ...form, apiKey })}
              onBaseURLChange={(baseURL) => setForm({ ...form, baseURL })}
              onDefaultModelChange={(defaultModel) => setForm({ ...form, defaultModel })}
              selectStyle={selectStyle}
              inputStyle={inputStyle}
              modelInputId="sidepanel-provider-model"
            />
            <button type="submit" style={{ ...primaryBtnStyle(), width: '100%' }}>
              Save provider
            </button>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {providers.map((p) => (
          <div key={p.id} style={elevatedCard()}>
            {editingId === p.id ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <input value={editForm.label} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} placeholder="Label" style={inputStyle} />
                <input value={editForm.defaultModel} onChange={(e) => setEditForm({ ...editForm, defaultModel: e.target.value })} placeholder="Default model" style={inputStyle} />
                {(providerSupportsBaseURL(p.kind)) && (
                  <input value={editForm.baseURL} onChange={(e) => setEditForm({ ...editForm, baseURL: e.target.value })} placeholder="Base URL" style={inputStyle} />
                )}
                <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, color: byomTheme.textMuted }}>
                  <input type="checkbox" checked={editForm.isEnabled} onChange={(e) => setEditForm({ ...editForm, isEnabled: e.target.checked })} />
                  Enabled
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => saveEdit(p.id)} style={primaryBtnStyle(true)}>
                    Save
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} style={ghostBtnStyle()}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <ProviderMonogram kind={p.kind} label={p.label} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: byomTheme.text }}>{p.label}</span>
                    <StatusChip label={statusMap[p.id] || 'unknown'} tone={connectionTone(statusMap[p.id] || 'unknown')} />
                    {!p.isEnabled && <StatusChip label="disabled" tone="muted" />}
                  </div>
                  <div style={{ fontSize: 11, color: byomTheme.textMuted, textTransform: 'capitalize' }}>
                    {p.kind}
                    {p.defaultModel ? ` · ${p.defaultModel}` : ''}
                  </div>
                  {testResult?.id === p.id && (
                    <div style={{ marginTop: 8, fontSize: 11, color: testResult.success ? byomTheme.success : byomTheme.danger }}>
                      {testResult.message}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button type="button" onClick={() => startEdit(p)} style={ghostBtnStyle()}>
                    Edit
                  </button>
                  <button type="button" onClick={() => handleTest(p)} disabled={testingId === p.id} style={secondaryBtnStyle()}>
                    {testingId === p.id ? '…' : 'Test'}
                  </button>
                  <button type="button" onClick={() => dashboard.removeProvider(p.id).then(onRefresh)} style={dangerOutlineBtnStyle()}>
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {providers.length === 0 && <EmptyState>No providers yet. Add your first API key to get started.</EmptyState>}
      </div>
    </div>
  );
};

// Sites Tab
const SitesTab: React.FC<{ grants: Grant[]; isLoading: boolean; onRefresh: () => void }> = ({ grants, isLoading, onRefresh }) => {
  const handleRevoke = async (origin: string) => {
    if (confirm(`Revoke access for ${origin}?`)) {
      await dashboard.revokeGrant(origin);
      onRefresh();
    }
  };

  const handlePrivacyChange = async (origin: string, privacyMode: PrivacyMode) => {
    await dashboard.updateGrant(origin, { privacyMode });
    onRefresh();
  };

  if (isLoading) return <div style={loadingStyle()}>Loading sites…</div>;

  return (
    <div>
      <SectionHeader
        title="Approved sites"
        subtitle="Sites you have allowed to use your AI keys"
        action={
          grants.length > 0 ? (
            <button type="button" onClick={() => dashboard.revokeAllGrants().then(onRefresh)} style={dangerOutlineBtnStyle()}>
              Revoke all
            </button>
          ) : undefined
        }
      />

      <div style={{ display: 'grid', gap: 10 }}>
        {grants.map((g) => (
          <div key={g.origin} style={elevatedCard()}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <SiteFavicon origin={g.origin} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: byomTheme.text, marginBottom: 6, wordBreak: 'break-all' }}>
                  {g.origin}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                  <span style={chipStyle('muted')}>${g.dailyBudgetUSD}/day</span>
                  {g.allowedTasks.slice(0, 3).map((t) => (
                    <span key={t} style={chipStyle('default')}>
                      {t}
                    </span>
                  ))}
                  {g.allowedTasks.length > 3 && <span style={chipStyle('muted')}>+{g.allowedTasks.length - 3}</span>}
                </div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: byomTheme.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Routing preference
                </label>
                <select
                  value={g.privacyMode}
                  onChange={(e) => handlePrivacyChange(g.origin, e.target.value as PrivacyMode)}
                  style={selectStyle}
                >
                  <option value="local-only">Local only</option>
                  <option value="preferred-local">Prefer local</option>
                  <option value="cloud-allowed">Cloud allowed</option>
                  <option value="per-task">Per task</option>
                </select>
              </div>
              <button type="button" onClick={() => handleRevoke(g.origin)} style={dangerOutlineBtnStyle()}>
                Revoke
              </button>
            </div>
          </div>
        ))}
        {grants.length === 0 && (
          <EmptyState>Sites appear here after you approve them on a webpage.</EmptyState>
        )}
      </div>
    </div>
  );
};

// Usage Tab
const UsageTab: React.FC<{
  usage: UsageRecord[];
  stats: { totalRequests: number; totalCostUSD: number; totalOrigins: number } | null;
  isLoading: boolean;
  onRefresh: () => void;
}> = ({ usage, stats, isLoading, onRefresh }) => {
  if (isLoading) return <div style={loadingStyle()}>Loading usage…</div>;

  return (
    <div>
      <SectionHeader
        title="Usage"
        subtitle="Recent AI activity across approved sites"
        action={
          <button
            type="button"
            onClick={() => dashboard.clearUsage().then(() => { alert('Cleared'); onRefresh(); })}
            style={ghostBtnStyle()}
          >
            Clear
          </button>
        }
      />

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          <StatMini label="Requests" value={stats.totalRequests} accent="primary" />
          <StatMini label="Spend" value={`$${(stats.totalCostUSD ?? 0).toFixed(2)}`} accent="success" />
          <StatMini label="Sites" value={stats.totalOrigins} accent="muted" />
        </div>
      )}

      <div style={{ ...elevatedCard(), padding: 0, overflow: 'hidden' }}>
        {usage.slice(0, 12).map((r, i, arr) => (
          <div
            key={r.id}
            style={{
              padding: '12px 14px',
              borderBottom: i < Math.min(arr.length, 12) - 1 ? `1px solid ${byomTheme.border}` : 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: byomTheme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.origin}
              </span>
              <StatusChip label={r.status} tone={r.status === 'success' ? 'success' : 'danger'} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
              <span style={chipStyle('default')}>{r.task}</span>
              <span style={chipStyle('muted')}>{r.provider}</span>
            </div>
            <div style={{ fontSize: 11, color: byomTheme.textMuted }}>
              {usageRecordTokenTotal(r.tokens).toLocaleString()} tokens · ${(r.costUSD ?? 0).toFixed(4)}
            </div>
          </div>
        ))}
        {usage.length === 0 && <EmptyState>No usage recorded yet.</EmptyState>}
      </div>
    </div>
  );
};

// Routing Tab - Global routing preferences
type ProviderHealthSnapshot = {
  successRate: number;
  avgLatencyMs: number;
  isHealthy: boolean;
  isCircuitOpen: boolean;
};

type RoutingLogEntry = {
  timestamp: number;
  task: string;
  provider: ProviderId;
  reason: string;
  mode: string;
  score?: number;
};

function healthDotColor(health?: ProviderHealthSnapshot): string {
  if (!health) return byomTheme.textSubtle;
  if (health.isCircuitOpen) return '#ef4444';
  if (health.successRate >= 0.9) return '#22c55e';
  if (health.successRate >= 0.7) return '#eab308';
  return '#ef4444';
}

const ProviderHealthDot: React.FC<{ health?: ProviderHealthSnapshot }> = ({ health }) => (
  <span
    title={
      health
        ? `${Math.round(health.successRate * 100)}% success${health.isCircuitOpen ? ' · circuit open' : ''}`
        : 'No recent data'
    }
    style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: healthDotColor(health),
      flexShrink: 0,
    }}
  />
);

const RoutingTab: React.FC<{
  preferences: GlobalRoutingPreferences | null;
  providers: ProviderConfig[];
  isLoading: boolean;
  onRoutingRefresh: (prefs?: GlobalRoutingPreferences) => void | Promise<void>;
}> = ({ preferences, providers, isLoading, onRoutingRefresh }) => {
  const [saving, setSaving] = useState(false);
  const [showTaskOverrides, setShowTaskOverrides] = useState(false);
  const [draftPrefs, setDraftPrefs] = useState<GlobalRoutingPreferences | null>(preferences);
  const [providerHealth, setProviderHealth] = useState<Partial<Record<ProviderId, ProviderHealthSnapshot>>>({});
  const [routingLog, setRoutingLog] = useState<RoutingLogEntry[]>([]);

  useEffect(() => {
    if (preferences) {
      setDraftPrefs(preferences);
    }
  }, [preferences]);

  useEffect(() => {
    void (async () => {
      try {
        const [health, log] = await Promise.all([
          dashboard.getProviderHealth(),
          dashboard.getRoutingLog(),
        ]);
        setProviderHealth(health);
        setRoutingLog(log);
      } catch (error) {
        console.error('Failed to load routing diagnostics:', error);
      }
    })();
  }, [preferences]);

  const persistPrefs = async (updates: Partial<GlobalRoutingPreferences>) => {
    setSaving(true);
    try {
      const updated = await dashboard.updateRoutingPreferences(updates);
      setDraftPrefs(updated);
      await onRoutingRefresh(updated);
      return updated;
    } catch (error) {
      console.error('Failed to update routing preferences:', error);
      if (preferences) setDraftPrefs(preferences);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleModeChange = async (mode: GlobalRoutingPreferences['mode']) => {
    const enabledProviders = providers.filter((p) => p.isEnabled);
    const anyLastUsed =
      draftPrefs?.lastUsedProviders &&
      Object.values(draftPrefs.lastUsedProviders).find((p) =>
        enabledProviders.some((ep) => ep.kind === p)
      );
    if (mode === 'specific-provider') {
      const preferred =
        draftPrefs?.preferredProvider && enabledProviders.some((p) => p.kind === draftPrefs.preferredProvider)
          ? draftPrefs.preferredProvider
          : anyLastUsed ??
            (draftPrefs?.lastUsedProvider && enabledProviders.some((p) => p.kind === draftPrefs.lastUsedProvider)
              ? draftPrefs.lastUsedProvider
              : enabledProviders[0]?.kind);
      const optimistic: GlobalRoutingPreferences = {
        ...(draftPrefs ?? preferences!),
        mode,
        preferredProvider: preferred,
      };
      setDraftPrefs(optimistic);
      await persistPrefs({ mode: 'specific-provider', preferredProvider: preferred });
      return;
    }
    const optimistic: GlobalRoutingPreferences = {
      ...(draftPrefs ?? preferences!),
      mode,
    };
    setDraftPrefs(optimistic);
    await persistPrefs({ mode });
  };

  const handlePreferredProviderChange = async (provider: ProviderId) => {
    const optimistic: GlobalRoutingPreferences = {
      ...(draftPrefs ?? preferences!),
      mode: 'specific-provider',
      preferredProvider: provider,
    };
    setDraftPrefs(optimistic);
    await persistPrefs({ mode: 'specific-provider', preferredProvider: provider });
  };

  const handleTaskOverride = async (task: TaskType, routing: string) => {
    setSaving(true);
    try {
      const updated = await dashboard.setTaskOverride(task, routing);
      setDraftPrefs(updated);
      await onRoutingRefresh(updated);
    } catch (error) {
      console.error('Failed to set task override:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Reset all routing preferences to defaults?')) {
      setSaving(true);
      try {
        const updated = await dashboard.resetRoutingPreferences();
        setDraftPrefs(updated);
        await onRoutingRefresh(updated);
      } catch (error) {
        console.error('Failed to reset routing preferences:', error);
      } finally {
        setSaving(false);
      }
    }
  };

  if (isLoading || !draftPrefs) {
    return <div style={loadingStyle()}>Loading routing…</div>;
  }

  const prefs = draftPrefs;

  const allTasks: TaskType[] = ['ask', 'stream', 'embed', 'classify', 'extract', 'chat'];
  const enabledProviders = providers.filter((p) => p.isEnabled);
  const hasLocal = enabledProviders.some((p) => isLocalProvider(p.kind));
  const hasCloud = enabledProviders.some((p) => !isLocalProvider(p.kind));

  const modelSuggestions = Array.from(
    new Set(
      enabledProviders.flatMap((p) => PROVIDER_REGISTRY[p.kind]?.knownModels ?? [])
    )
  );
  const preferredModelKnown = !prefs.preferredModel || modelSuggestions.includes(prefs.preferredModel);

  const routingModes: { value: GlobalRoutingPreferences['mode']; label: string; description: string; disabled?: boolean }[] = [
    { value: 'auto', label: 'Auto', description: 'Score providers by cost, latency, reliability, and task fit' },
    { value: 'ask-every-time', label: 'Ask every time', description: 'Show provider picker before each call' },
    { value: 'default-local', label: 'Prefer local', description: `Route to local providers when available${!hasLocal ? ' — none configured' : ''}`, disabled: !hasLocal },
    { value: 'default-cloud', label: 'Prefer cloud', description: `Use cloud APIs${!hasCloud ? ' — none configured' : ''}`, disabled: !hasCloud },
    { value: 'specific-provider', label: 'Fixed provider', description: 'Always use one selected provider' },
  ];

  const lastUsedEntries = prefs.lastUsedProviders
    ? Object.entries(prefs.lastUsedProviders)
    : prefs.lastUsedProvider
      ? allTasks.map((task) => [task, prefs.lastUsedProvider!] as const)
      : [];

  return (
    <div>
      <SectionHeader
        title="Global routing"
        subtitle="How BYOM chooses models across all sites"
        action={
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {saving && <span style={{ fontSize: 10, color: byomTheme.textMuted }}>Saving…</span>}
            <button type="button" onClick={handleReset} style={ghostBtnStyle()}>
              Reset
            </button>
          </div>
        }
      />

      <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
        {routingModes.map((mode) => {
          const selected = prefs.mode === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              disabled={mode.disabled}
              onClick={() => !mode.disabled && void handleModeChange(mode.value)}
              style={strategyCardStyle(selected, mode.disabled)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: byomTheme.text }}>{mode.label}</div>
                  <div style={{ fontSize: 11, color: byomTheme.textMuted, marginTop: 4, lineHeight: 1.4 }}>{mode.description}</div>
                </div>
                {selected && <StatusChip label="Active" tone="success" />}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ ...elevatedCard(), marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: byomTheme.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Default model
        </label>
        <input
          type="text"
          list="routing-model-suggestions"
          placeholder="gpt-4o-mini, claude-3-haiku, gemma…"
          value={prefs.preferredModel || ''}
          onChange={async (e) => {
            const value = e.target.value || undefined;
            setDraftPrefs({ ...prefs, preferredModel: value });
            await persistPrefs({ preferredModel: value });
          }}
          style={inputStyle}
        />
        <datalist id="routing-model-suggestions">
          {modelSuggestions.map((model) => (
            <option key={model} value={model} />
          ))}
        </datalist>
        <p style={{ margin: '8px 0 0', fontSize: 10, color: byomTheme.textSubtle, lineHeight: 1.4 }}>
          Fallback when a site does not specify a model.
          {!preferredModelKnown && prefs.preferredModel && (
            <span style={{ color: '#b45309' }}> Model may not match any configured provider.</span>
          )}
        </p>
      </div>

      {prefs.mode === 'specific-provider' && (
        <div style={{ ...elevatedCard(), marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: byomTheme.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Fixed provider
          </label>
          <select
            value={prefs.preferredProvider || ''}
            onChange={(e) => {
              if (e.target.value) {
                void handlePreferredProviderChange(e.target.value as ProviderId);
              }
            }}
            style={selectStyle}
          >
            <option value="">Select provider…</option>
            {enabledProviders.map((p) => (
              <option key={p.id} value={p.kind}>
                {p.label} ({p.kind})
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {enabledProviders.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: byomTheme.textMuted }}>
                <ProviderHealthDot health={providerHealth[p.kind]} />
                <span>{p.kind}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {prefs.mode === 'ask-every-time' && (
        <div style={{ ...elevatedCard(), marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={prefs.rememberLastChoice}
              onChange={async (e) => {
                setDraftPrefs({ ...prefs, rememberLastChoice: e.target.checked });
                await persistPrefs({ rememberLastChoice: e.target.checked });
              }}
              style={{ accentColor: byomTheme.primary }}
            />
            <span style={{ fontSize: 12, color: byomTheme.text, lineHeight: 1.4 }}>
              Remember last manual provider choice per task
            </span>
          </label>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowTaskOverrides(!showTaskOverrides)}
        style={{
          ...ghostBtnStyle(),
          width: '100%',
          marginBottom: showTaskOverrides ? 8 : 12,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Task-specific overrides</span>
        <span>{showTaskOverrides ? '−' : '+'}</span>
      </button>

      {showTaskOverrides && (
        <div style={{ ...elevatedCard(), marginBottom: 12, padding: 12 }}>
          {allTasks.map((task) => {
            const override = prefs.taskOverrides?.[task as keyof typeof prefs.taskOverrides];
            return (
              <div key={task} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize', color: byomTheme.text }}>{task}</span>
                <select
                  value={override || 'auto'}
                  onChange={(e) => handleTaskOverride(task, e.target.value)}
                  style={{ ...selectStyle, width: 'auto', minWidth: 150 }}
                >
                  <option value="auto">Global</option>
                  <option value="local" disabled={!hasLocal}>
                    Local
                  </option>
                  <option value="cloud" disabled={!hasCloud}>
                    Cloud
                  </option>
                  <option value="ask">Ask</option>
                  {enabledProviders.map((p) => (
                    <option key={p.id} value={`provider:${p.kind}`}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}

      {routingLog.length > 0 && (
        <div style={{ ...elevatedCard(), marginBottom: 12, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: byomTheme.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Recent routing decisions
          </div>
          {routingLog.map((entry, index) => (
            <div
              key={`${entry.timestamp}-${index}`}
              style={{
                fontSize: 11,
                color: byomTheme.textMuted,
                lineHeight: 1.45,
                padding: '6px 0',
                borderBottom: index < routingLog.length - 1 ? `1px solid ${byomTheme.border}` : undefined,
              }}
            >
              <strong style={{ color: byomTheme.text }}>{entry.provider}</strong>
              {' · '}
              {entry.task}
              {entry.score !== undefined && ` · score ${entry.score.toFixed(2)}`}
              <div style={{ marginTop: 2 }}>{entry.reason}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...insetPanelStyle(), marginBottom: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: byomTheme.primaryDark, marginBottom: 6 }}>Live status</div>
        <div style={{ fontSize: 12, color: byomTheme.textMuted, lineHeight: 1.5 }}>
          Mode: <strong style={{ color: byomTheme.text }}>{prefs.mode}</strong>
          {prefs.preferredProvider && (
            <span>
              {' '}
              · Provider: <strong style={{ color: byomTheme.text }}>{prefs.preferredProvider}</strong>
            </span>
          )}
          {routingLog[0] && (
            <span>
              {' '}
              · Last route: <strong style={{ color: byomTheme.text }}>{routingLog[0].provider}</strong>
              {' '}
              ({routingLog[0].reason})
            </span>
          )}
        </div>
        {prefs.mode === 'ask-every-time' && prefs.rememberLastChoice && lastUsedEntries.length > 0 && (
          <div style={{ fontSize: 11, color: byomTheme.textSubtle, marginTop: 6, lineHeight: 1.5 }}>
            Remembered:{' '}
            {lastUsedEntries.map(([task, provider]) => (
              <span key={task}>
                {task}=<strong style={{ color: byomTheme.text }}>{provider}</strong>{' '}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
