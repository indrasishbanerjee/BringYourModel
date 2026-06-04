import React, { useState, useEffect } from 'react';
import type { ProviderId, TaskType, PrivacyMode, ProviderConfig } from '@byom/shared';
import {
  theme,
  pageStyle,
  cardStyle,
  compactHeaderStyle,
  bodyStyle,
  sectionTitleStyle,
  panelStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  chipStyle,
  routingChipStyle,
  budgetInputStyle,
} from './theme';

interface RequestInfo {
  reqId: string;
  origin: string;
  tabId: number;
  task: TaskType;
  providerKind: ProviderId;
  modelId: string;
  hasPageText: boolean;
  estimatedTokens: number;
  allowProviderSelection?: boolean;
  suggestedProvider?: ProviderId;
  routingReason?: string;
  consentMode?: 'pick-provider' | 'first-time';
}

interface ConsentState {
  dailyBudgetUSD: number;
  monthlyBudgetUSD: number;
  perRequestTokenCap: number;
  privacyMode: PrivacyMode;
  expiry: 'session' | '30days' | 'forever';
  autoApprove: boolean;
  allowedTasks: TaskType[];
}

const ALL_TASKS: TaskType[] = ['ask', 'stream', 'embed', 'classify', 'extract', 'chat'];

const DEFAULT_CONSENT: ConsentState = {
  dailyBudgetUSD: 5.0,
  monthlyBudgetUSD: 50.0,
  perRequestTokenCap: 4000,
  privacyMode: 'cloud-allowed',
  expiry: '30days',
  autoApprove: false,
  allowedTasks: ['ask', 'stream', 'embed', 'classify', 'extract', 'chat'],
};

const EXPIRY_OPTIONS = [
  { value: 'session', label: 'Session' },
  { value: '30days', label: '30 days' },
  { value: 'forever', label: 'Forever' },
] as const;

const ROUTING_OPTIONS: { value: PrivacyMode; label: string; description: string }[] = [
  { value: 'local-only', label: 'Local only', description: 'Ollama only' },
  { value: 'preferred-local', label: 'Prefer local', description: 'Local when possible' },
  { value: 'cloud-allowed', label: 'Cloud allowed', description: 'Any provider' },
  { value: 'per-task', label: 'Per task', description: 'By task type' },
];

function getCostBand(tokens: number): { label: string; color: string } {
  if (tokens < 1000) return { label: 'Low', color: theme.primary };
  if (tokens < 4000) return { label: 'Medium', color: '#ca8a04' };
  return { label: 'Higher', color: '#ea580c' };
}

function getExpiryMs(expiry: 'session' | '30days' | 'forever'): number | undefined {
  switch (expiry) {
    case 'session':
      return undefined;
    case '30days':
      return Date.now() + 30 * 24 * 60 * 60 * 1000;
    case 'forever':
      return undefined;
  }
}

const ConsentHeader: React.FC<{
  title: string;
  subtitle: string;
  faviconUrl: string | null;
  onFaviconError: () => void;
  compact?: boolean;
}> = ({ title, subtitle, faviconUrl, onFaviconError, compact }) => (
  <header style={compact ? compactHeaderStyle : { ...compactHeaderStyle, padding: '14px 16px' }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {faviconUrl && (
          <img
            src={faviconUrl}
            alt=""
            style={{ width: compact ? 18 : 22, height: compact ? 18 : 22, borderRadius: 4, background: '#fff', flexShrink: 0 }}
            onError={onFaviconError}
          />
        )}
        <h1 style={{ fontSize: compact ? 14 : 17, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </h1>
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.85, flexShrink: 0 }}>BYOM</span>
    </div>
    <p style={{ margin: '4px 0 0', fontSize: compact ? 11 : 12, opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {subtitle}
    </p>
  </header>
);

const ProviderPicker: React.FC<{
  providers: ProviderConfig[];
  selectedProvider: ProviderId | null;
  onSelect: (kind: ProviderId, defaultModel?: string) => void;
  routingReason?: string;
}> = ({ providers, selectedProvider, onSelect, routingReason }) => (
  <section style={{ marginBottom: 12 }}>
    <h2 style={sectionTitleStyle}>Choose Provider</h2>
    {routingReason && (
      <div
        style={{
          fontSize: 10,
          color: theme.textMuted,
          marginBottom: 8,
          padding: '6px 8px',
          background: theme.primaryLight,
          borderRadius: 4,
        }}
      >
        {routingReason}
      </div>
    )}
    <div style={{ display: 'grid', gap: 6 }}>
      {providers
        .filter((p) => p.isEnabled)
        .map((provider) => (
          <label
            key={provider.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderRadius: 6,
              background: selectedProvider === provider.kind ? theme.primaryLight : theme.surface,
              border: `1px solid ${selectedProvider === provider.kind ? theme.primary : theme.border}`,
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="providerSelection"
              checked={selectedProvider === provider.kind}
              onChange={() => onSelect(provider.kind, provider.defaultModel)}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{provider.label}</div>
              <div style={{ fontSize: 10, color: theme.textMuted }}>
                {provider.kind}
                {provider.defaultModel ? ` · ${provider.defaultModel}` : ''}
                {provider.kind === 'ollama' ? ' · local' : ''}
              </div>
            </div>
          </label>
        ))}
    </div>
  </section>
);

export const Consent: React.FC = () => {
  const [requestInfo, setRequestInfo] = useState<RequestInfo | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [consent, setConsent] = useState<ConsentState>(DEFAULT_CONSENT);
  const [selectedProvider, setSelectedProvider] = useState<ProviderId | null>(null);
  const [modelOverride, setModelOverride] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    void loadRequestInfo();
  }, []);

  const loadRequestInfo = async () => {
    try {
      setIsLoading(true);
      const hash = window.location.hash.slice(1);
      const params = new URLSearchParams(hash);
      const reqId = params.get('req');

      if (!reqId) {
        setError('Invalid request: missing request ID');
        setIsLoading(false);
        return;
      }

      const response = await chrome.runtime.sendMessage({
        kind: 'consent:getRequestInfo',
        reqId,
      });

      if (!response || response.error) {
        setError(response?.error || 'Failed to load request info');
        setIsLoading(false);
        return;
      }

      setRequestInfo(response.requestInfo);
      setProviders(response.providers || []);

      if (response.requestInfo.allowProviderSelection) {
        const suggested = response.requestInfo.suggestedProvider || response.requestInfo.providerKind;
        setSelectedProvider(suggested);
        const suggestedConfig = (response.providers || []).find(
          (p: ProviderConfig) => p.kind === suggested
        );
        setModelOverride(suggestedConfig?.defaultModel || '');
      }

      const requestedTask = response.requestInfo.task;
      const defaultTasks = Array.from(
        new Set([requestedTask, 'ask', 'stream', 'embed', 'classify', 'extract', 'chat'])
      );
      setConsent((prev) => ({ ...prev, allowedTasks: defaultTasks as TaskType[] }));

      if (response.requestInfo.tabId) {
        try {
          const tab = await chrome.tabs.get(response.requestInfo.tabId);
          if (tab.favIconUrl) setFaviconUrl(tab.favIconUrl);
        } catch {
          // Tab may have been closed
        }
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load request info:', err);
      setError('Failed to load request information');
      setIsLoading(false);
    }
  };

  const handleRouteRequest = async () => {
    if (!requestInfo || !selectedProvider) return;
    setIsProcessing(true);
    try {
      await chrome.runtime.sendMessage({
        kind: 'consent:allow',
        reqId: requestInfo.reqId,
        selectedProvider,
        requestModelOverride: modelOverride.trim() || undefined,
      });
      window.close();
    } catch (err) {
      console.error('Failed to route request:', err);
      setError('Failed to route request');
      setIsProcessing(false);
    }
  };

  const handleAllow = async (alwaysAllow: boolean) => {
    if (!requestInfo) return;
    setIsProcessing(true);
    try {
      const enabledProviderKinds = providers.filter((p) => p.isEnabled).map((p) => p.kind);
      const effectiveProvider =
        requestInfo.allowProviderSelection && selectedProvider
          ? selectedProvider
          : requestInfo.providerKind;

      const grant = {
        origin: requestInfo.origin,
        providers: enabledProviderKinds.length > 0 ? enabledProviderKinds : [effectiveProvider],
        allowedTasks: consent.allowedTasks,
        dailyBudgetUSD: consent.dailyBudgetUSD,
        monthlyBudgetUSD: consent.monthlyBudgetUSD,
        perRequestTokenCap: consent.perRequestTokenCap,
        privacyMode: consent.privacyMode,
        autoApprove: alwaysAllow,
        expiresAt: getExpiryMs(consent.expiry),
      };

      await chrome.runtime.sendMessage({
        kind: 'consent:allow',
        reqId: requestInfo.reqId,
        grant,
        selectedProvider: effectiveProvider,
        requestModelOverride: modelOverride.trim() || undefined,
      });
      window.close();
    } catch (err) {
      console.error('Failed to allow request:', err);
      setError('Failed to process approval');
      setIsProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!requestInfo) return;
    setIsProcessing(true);
    try {
      await chrome.runtime.sendMessage({ kind: 'consent:deny', reqId: requestInfo.reqId });
      window.close();
    } catch (err) {
      console.error('Failed to deny request:', err);
      setError('Failed to process denial');
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ ...pageStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 14, color: theme.textMuted }}>Loading...</div>
      </div>
    );
  }

  if (error || !requestInfo) {
    return (
      <div style={{ ...pageStyle, padding: 16 }}>
        <div style={cardStyle}>
          <div style={{ ...bodyStyle, color: theme.danger }}>{error || 'Request not found'}</div>
          <div style={{ padding: '0 16px 16px' }}>
            <button type="button" onClick={() => window.close()} style={primaryButtonStyle()}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const costBand = getCostBand(requestInfo.estimatedTokens);
  const isPickProviderMode = requestInfo.consentMode === 'pick-provider';
  const allCapabilitiesSelected = ALL_TASKS.every((t) => consent.allowedTasks.includes(t));

  if (isPickProviderMode) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <ConsentHeader
            title="Route Request"
            subtitle={`${requestInfo.origin} · ${requestInfo.task}`}
            faviconUrl={faviconUrl}
            onFaviconError={() => setFaviconUrl(null)}
          />
          <div style={bodyStyle}>
            <ProviderPicker
              providers={providers}
              selectedProvider={selectedProvider}
              onSelect={(kind, defaultModel) => {
                setSelectedProvider(kind);
                setModelOverride(defaultModel || '');
              }}
              routingReason={requestInfo.routingReason}
            />
            <section style={{ marginBottom: 12 }}>
              <label style={{ ...sectionTitleStyle, display: 'block' }}>Model override (optional)</label>
              <input
                type="text"
                value={modelOverride}
                onChange={(e) => setModelOverride(e.target.value)}
                placeholder="Provider default if blank"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: 12,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 6,
                  boxSizing: 'border-box',
                }}
              />
            </section>
            <div style={{ display: 'grid', gap: 8 }}>
              <button
                type="button"
                onClick={handleRouteRequest}
                disabled={isProcessing || !selectedProvider}
                style={primaryButtonStyle(isProcessing || !selectedProvider)}
              >
                {isProcessing ? 'Routing...' : 'Route this request'}
              </button>
              <button
                type="button"
                onClick={handleDeny}
                disabled={isProcessing}
                style={{
                  ...secondaryButtonStyle(isProcessing),
                  color: theme.danger,
                  borderColor: theme.danger,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <ConsentHeader
          title="Site Approval"
          subtitle={requestInfo.origin}
          faviconUrl={faviconUrl}
          onFaviconError={() => setFaviconUrl(null)}
          compact
        />

        <div style={bodyStyle}>
          {/* Request meta strip */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 6,
              fontSize: 10,
              color: theme.textMuted,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                padding: '2px 6px',
                background: theme.primaryLight,
                borderRadius: 4,
                color: theme.primaryDark,
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {requestInfo.task}
            </span>
            <span>{requestInfo.providerKind}</span>
            <span>·</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{requestInfo.modelId}</span>
            <span>·</span>
            <span style={{ color: costBand.color, fontWeight: 600 }}>{costBand.label}</span>
            {requestInfo.hasPageText && (
              <span style={{ padding: '2px 6px', background: theme.warningBg, borderRadius: 4, color: theme.warning, fontSize: 9 }}>
                page content
              </span>
            )}
          </div>

          {requestInfo.allowProviderSelection && (
            <div style={{ flexShrink: 0 }}>
              <label style={{ ...sectionTitleStyle, display: 'block' }}>Provider</label>
              <select
                value={selectedProvider ?? ''}
                onChange={(e) => {
                  const kind = e.target.value as ProviderId;
                  setSelectedProvider(kind);
                  const cfg = providers.find((p) => p.kind === kind);
                  setModelOverride(cfg?.defaultModel || '');
                }}
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  fontSize: 11,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 6,
                  background: theme.surface,
                }}
              >
                {providers
                  .filter((p) => p.isEnabled)
                  .map((p) => (
                    <option key={p.id} value={p.kind}>
                      {p.label} ({p.kind})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* 2-column compare panels */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* Left: Budget */}
            <div style={panelStyle}>
              <h2 style={sectionTitleStyle}>Budget</h2>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 10, color: theme.textMuted }}>
                  Daily $
                  <input
                    type="number"
                    min={0.5}
                    max={50}
                    step={0.5}
                    value={consent.dailyBudgetUSD}
                    onChange={(e) =>
                      setConsent({ ...consent, dailyBudgetUSD: parseFloat(e.target.value) || 0.5 })
                    }
                    style={budgetInputStyle}
                  />
                </label>
                <label style={{ fontSize: 10, color: theme.textMuted }}>
                  Monthly $
                  <input
                    type="number"
                    min={5}
                    max={500}
                    step={5}
                    value={consent.monthlyBudgetUSD}
                    onChange={(e) =>
                      setConsent({ ...consent, monthlyBudgetUSD: parseFloat(e.target.value) || 5 })
                    }
                    style={budgetInputStyle}
                  />
                </label>
                <label style={{ fontSize: 10, color: theme.textMuted }}>
                  Token cap
                  <input
                    type="number"
                    min={1000}
                    max={32000}
                    step={1000}
                    value={consent.perRequestTokenCap}
                    onChange={(e) =>
                      setConsent({
                        ...consent,
                        perRequestTokenCap: parseInt(e.target.value, 10) || 1000,
                      })
                    }
                    style={budgetInputStyle}
                  />
                </label>
              </div>
            </div>

            {/* Right: Routing preference */}
            <div style={panelStyle}>
              <h2 style={sectionTitleStyle}>Routing</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {ROUTING_OPTIONS.map((option) => (
                  <label key={option.value} style={routingChipStyle(consent.privacyMode === option.value)}>
                    <input
                      type="radio"
                      name="routingPreference"
                      value={option.value}
                      checked={consent.privacyMode === option.value}
                      onChange={() => setConsent({ ...consent, privacyMode: option.value })}
                      style={{ display: 'none' }}
                    />
                    <div style={{ fontWeight: 600, fontSize: 10, color: theme.text, lineHeight: 1.2 }}>{option.label}</div>
                    <div style={{ fontSize: 9, color: theme.textMuted, lineHeight: 1.2 }}>{option.description}</div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Duration row */}
          <div style={{ flexShrink: 0 }}>
            <h2 style={sectionTitleStyle}>Duration</h2>
            <div style={{ display: 'flex', gap: 4 }}>
              {EXPIRY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setConsent({ ...consent, expiry: option.value })}
                  style={chipStyle(consent.expiry === option.value, true)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Capabilities badge — all included by default */}
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '5px 8px',
              background: theme.primaryLight,
              border: `1px solid ${theme.border}`,
              borderRadius: 6,
              fontSize: 10,
              color: theme.primaryDark,
            }}
          >
            <span style={{ fontWeight: 600 }}>Capabilities</span>
            <span>
              {allCapabilitiesSelected
                ? `All ${ALL_TASKS.length} included`
                : `${consent.allowedTasks.length} of ${ALL_TASKS.length} selected`}
            </span>
          </div>

          {/* Action row — single line */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => handleAllow(true)}
              disabled={isProcessing}
              style={primaryButtonStyle(isProcessing, true)}
            >
              {isProcessing ? '…' : 'Always allow'}
            </button>
            <button
              type="button"
              onClick={() => handleAllow(false)}
              disabled={isProcessing}
              style={secondaryButtonStyle(isProcessing, true)}
            >
              Once
            </button>
            <button
              type="button"
              onClick={handleDeny}
              disabled={isProcessing}
              style={{
                flex: 1,
                padding: '8px 6px',
                fontSize: 12,
                fontWeight: 500,
                background: 'transparent',
                color: theme.danger,
                border: `1px solid ${theme.danger}`,
                borderRadius: 8,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.6 : 1,
              }}
            >
              Deny
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
