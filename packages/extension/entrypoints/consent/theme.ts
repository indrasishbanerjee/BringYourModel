import type React from 'react';

export const theme = {
  primary: '#059669',
  primaryDark: '#047857',
  primaryLight: '#ecfdf5',
  surface: '#ffffff',
  background: '#f0fdf4',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#d1fae5',
  danger: '#dc3545',
  warning: '#856404',
  warningBg: '#fef3c7',
} as const;

/** Fixed square popup — no page scroll */
export const squarePageStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  maxHeight: '100vh',
  overflow: 'hidden',
  background: theme.background,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  display: 'flex',
  flexDirection: 'column',
};

export const squareCardStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  overflow: 'hidden',
};

export const pageStyle: React.CSSProperties = squarePageStyle;

export const cardStyle: React.CSSProperties = {
  ...squareCardStyle,
  maxWidth: 480,
  margin: '0 auto',
  borderRadius: 0,
  boxShadow: 'none',
};

export const compactHeaderStyle: React.CSSProperties = {
  background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%)`,
  color: '#fff',
  padding: '10px 14px',
  flexShrink: 0,
};

export const headerBarStyle: React.CSSProperties = compactHeaderStyle;

export const bodyStyle: React.CSSProperties = {
  padding: 12,
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  overflow: 'hidden',
};

export const sectionTitleStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: theme.textMuted,
  margin: '0 0 6px',
};

export const panelStyle: React.CSSProperties = {
  background: theme.primaryLight,
  border: `1px solid ${theme.border}`,
  borderRadius: 8,
  padding: '8px 10px',
  minHeight: 0,
};

export function primaryButtonStyle(disabled?: boolean, compact?: boolean): React.CSSProperties {
  return {
    flex: compact ? 1 : undefined,
    width: compact ? undefined : '100%',
    padding: compact ? '9px 8px' : '11px 14px',
    fontSize: compact ? 12 : 13,
    fontWeight: 600,
    background: theme.primary,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };
}

export function secondaryButtonStyle(disabled?: boolean, compact?: boolean): React.CSSProperties {
  return {
    flex: compact ? 1 : undefined,
    width: compact ? undefined : '100%',
    padding: compact ? '8px 8px' : '10px 14px',
    fontSize: compact ? 12 : 13,
    fontWeight: 500,
    background: theme.surface,
    color: theme.primary,
    border: `1px solid ${theme.primary}`,
    borderRadius: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };
}

export function chipStyle(selected: boolean, mini?: boolean): React.CSSProperties {
  return {
    flex: 1,
    minWidth: 0,
    padding: mini ? '5px 4px' : '8px 6px',
    fontSize: mini ? 10 : 11,
    fontWeight: selected ? 600 : 500,
    textAlign: 'center',
    borderRadius: 6,
    border: `1px solid ${selected ? theme.primary : theme.border}`,
    background: selected ? theme.primaryLight : theme.surface,
    color: selected ? theme.primaryDark : theme.text,
    cursor: 'pointer',
  };
}

export function routingChipStyle(selected: boolean): React.CSSProperties {
  return {
    padding: '6px 8px',
    borderRadius: 6,
    border: `1px solid ${selected ? theme.primary : theme.border}`,
    background: selected ? theme.surface : theme.primaryLight,
    boxShadow: selected ? `inset 0 0 0 1px ${theme.primary}` : 'none',
    cursor: 'pointer',
    textAlign: 'center',
  };
}

export const budgetInputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 3,
  padding: '4px 6px',
  fontSize: 11,
  border: `1px solid ${theme.border}`,
  borderRadius: 4,
  boxSizing: 'border-box',
};
