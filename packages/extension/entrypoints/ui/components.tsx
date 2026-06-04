import React from 'react';
import {
  byomTheme,
  elevatedCard,
  sectionTitleStyle,
  sectionSubtitleStyle,
  statCardStyle,
  chipStyle,
  providerMonogramStyle,
  emptyStateStyle,
} from './theme';
import logoUrl from '../../assets/icon.png';

export const BrandMark: React.FC<{
  variant?: 'masthead' | 'surface';
  subtitle?: string;
}> = ({ variant = 'surface', subtitle }) => {
  const isMasthead = variant === 'masthead';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isMasthead ? 11 : 10, minWidth: 0 }}>
      <img
        src={logoUrl}
        alt=""
        aria-hidden
        style={{
          width: isMasthead ? 40 : 34,
          height: isMasthead ? 40 : 34,
          borderRadius: isMasthead ? 11 : 9,
          objectFit: 'cover',
          flexShrink: 0,
          boxShadow: isMasthead
            ? '0 2px 12px rgba(0,0,0,0.22), 0 0 0 1.5px rgba(255,255,255,0.35)'
            : `0 1px 4px rgba(5, 150, 105, 0.18), 0 0 0 1px ${byomTheme.borderStrong}`,
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: isMasthead ? 17 : 20,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            color: isMasthead ? '#fff' : byomTheme.text,
          }}
        >
          BYOM Wallet
        </div>
        {subtitle && (
          <p
            style={{
              margin: '3px 0 0',
              fontSize: isMasthead ? 11 : 14,
              lineHeight: 1.35,
              color: isMasthead ? 'rgba(255,255,255,0.82)' : byomTheme.textMuted,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ title, subtitle, action }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 8 }}>
    <div>
      <h2 style={sectionTitleStyle()}>{title}</h2>
      {subtitle && <p style={sectionSubtitleStyle()}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const StatMini: React.FC<{
  label: string;
  value: string | number;
  accent?: 'primary' | 'success' | 'muted';
}> = ({ label, value, accent = 'primary' }) => {
  const valueColor =
    accent === 'primary' ? byomTheme.primary : accent === 'success' ? byomTheme.success : byomTheme.textMuted;
  return (
    <div style={statCardStyle()}>
      <div style={{ fontSize: 18, fontWeight: 800, color: valueColor, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: byomTheme.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
    </div>
  );
};

export const StatusChip: React.FC<{
  label: string;
  tone?: 'default' | 'success' | 'danger' | 'muted';
}> = ({ label, tone = 'default' }) => <span style={chipStyle(tone)}>{label}</span>;

export const ProviderMonogram: React.FC<{ kind: string; label?: string }> = ({ kind, label }) => (
  <div style={providerMonogramStyle(kind)} title={label}>
    {kind.slice(0, 2)}
  </div>
);

export const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={emptyStateStyle()}>{children}</div>
);

export const HeroCard: React.FC<{
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
}> = ({ title, subtitle, badge }) => (
  <div
    style={{
      ...elevatedCard(),
      marginBottom: 12,
      background: `linear-gradient(135deg, ${byomTheme.surface} 0%, ${byomTheme.primaryLight} 100%)`,
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: byomTheme.primary, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          Control Center
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: byomTheme.text, marginBottom: 4 }}>{title}</div>
        <p style={{ margin: 0, fontSize: 12, color: byomTheme.textMuted, lineHeight: 1.45 }}>{subtitle}</p>
      </div>
      {badge}
    </div>
  </div>
);

export const SiteFavicon: React.FC<{ origin: string }> = ({ origin }) => {
  let letter = '?';
  try {
    letter = new URL(origin).hostname.charAt(0).toUpperCase();
  } catch {
    letter = origin.charAt(0).toUpperCase();
  }
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: byomTheme.primaryLight,
        border: `1px solid ${byomTheme.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        fontWeight: 700,
        color: byomTheme.primaryDark,
        flexShrink: 0,
      }}
    >
      {letter}
    </div>
  );
};
