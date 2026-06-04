import type React from 'react';

/** BYOM brand palette — bringyourmodel.com light wallet */
export const byomTheme = {
  primary: '#059669',
  primaryDark: '#047857',
  primaryDarker: '#065f46',
  primaryLight: '#ecfdf5',
  primaryGlow: 'rgba(5, 150, 105, 0.18)',
  surface: '#ffffff',
  background: '#f0fdf4',
  backgroundMuted: '#e8f8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  textSubtle: '#94a3b8',
  border: '#d1fae5',
  borderStrong: '#a7f3d0',
  danger: '#dc2626',
  dangerLight: '#fef2f2',
  dangerBorder: '#fecaca',
  success: '#16a34a',
  successLight: '#dcfce7',
  warning: '#92400e',
  warningBg: '#fef3c7',
  shadow: '0 1px 3px rgba(5, 150, 105, 0.08), 0 4px 12px rgba(5, 150, 105, 0.06)',
  shadowLg: '0 4px 20px rgba(5, 150, 105, 0.12)',
  radius: 14,
  radiusSm: 10,
  font: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
} as const;

export const appShellStyle: React.CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  background: byomTheme.background,
  fontFamily: byomTheme.font,
};

export const mastheadStyle: React.CSSProperties = {
  flexShrink: 0,
  padding: '14px 16px 16px',
  background: `linear-gradient(145deg, ${byomTheme.primary} 0%, ${byomTheme.primaryDark} 55%, ${byomTheme.primaryDarker} 100%)`,
  color: '#fff',
  position: 'relative',
  overflow: 'hidden',
};

export const mastheadOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'radial-gradient(ellipse 80% 60% at 100% 0%, rgba(255,255,255,0.15) 0%, transparent 55%)',
  pointerEvents: 'none',
};

export function statusCapsule(unlocked: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    background: unlocked ? 'rgba(255,255,255,0.2)' : 'rgba(254,226,226,0.25)',
    border: `1px solid ${unlocked ? 'rgba(255,255,255,0.35)' : 'rgba(254,202,202,0.5)'}`,
    color: '#fff',
  };
}

export function ghostBtnOnGreenStyle(): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 600,
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.4)',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    cursor: 'pointer',
  };
}

export const navRailStyle: React.CSSProperties = {
  flexShrink: 0,
  display: 'flex',
  gap: 4,
  padding: '10px 12px 12px',
  background: byomTheme.surface,
  borderBottom: `1px solid ${byomTheme.border}`,
  overflowX: 'auto',
};

export function navPillStyle(active: boolean): React.CSSProperties {
  return {
    flex: '1 0 auto',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    padding: '8px 6px',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    border: 'none',
    borderRadius: byomTheme.radiusSm,
    background: active ? byomTheme.primaryLight : 'transparent',
    color: active ? byomTheme.primaryDark : byomTheme.textMuted,
    boxShadow: active ? `inset 0 0 0 1px ${byomTheme.borderStrong}` : 'none',
    cursor: 'pointer',
  };
}

export const contentAreaStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: 12,
  position: 'relative',
};

export function elevatedCard(selected?: boolean): React.CSSProperties {
  return {
    background: byomTheme.surface,
    borderRadius: byomTheme.radius,
    border: `1px solid ${selected ? byomTheme.primary : byomTheme.border}`,
    boxShadow: selected ? `0 0 0 1px ${byomTheme.primaryGlow}, ${byomTheme.shadow}` : byomTheme.shadow,
    padding: 14,
  };
}

export function insetPanelStyle(): React.CSSProperties {
  return {
    background: byomTheme.primaryLight,
    borderRadius: byomTheme.radiusSm,
    border: `1px solid ${byomTheme.border}`,
    padding: 14,
    marginBottom: 12,
  };
}

export function primaryBtnStyle(compact?: boolean): React.CSSProperties {
  return {
    padding: compact ? '7px 14px' : '10px 16px',
    fontSize: compact ? 11 : 13,
    fontWeight: 600,
    background: `linear-gradient(180deg, ${byomTheme.primary} 0%, ${byomTheme.primaryDark} 100%)`,
    color: '#fff',
    border: 'none',
    borderRadius: byomTheme.radiusSm,
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(5, 150, 105, 0.25)',
  };
}

export function secondaryBtnStyle(): React.CSSProperties {
  return {
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 600,
    background: byomTheme.surface,
    color: byomTheme.primaryDark,
    border: `1px solid ${byomTheme.borderStrong}`,
    borderRadius: 8,
    cursor: 'pointer',
  };
}

export function ghostBtnStyle(): React.CSSProperties {
  return {
    padding: '6px 10px',
    fontSize: 11,
    fontWeight: 600,
    background: 'transparent',
    color: byomTheme.textMuted,
    border: `1px solid ${byomTheme.border}`,
    borderRadius: 8,
    cursor: 'pointer',
  };
}

export function dangerOutlineBtnStyle(): React.CSSProperties {
  return {
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 600,
    background: byomTheme.dangerLight,
    color: byomTheme.danger,
    border: `1px solid ${byomTheme.dangerBorder}`,
    borderRadius: 8,
    cursor: 'pointer',
  };
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 11px',
  fontSize: 13,
  border: `1px solid ${byomTheme.border}`,
  borderRadius: byomTheme.radiusSm,
  boxSizing: 'border-box',
  background: byomTheme.surface,
  color: byomTheme.text,
};

export const selectStyle: React.CSSProperties = {
  ...inputStyle,
  padding: '8px 10px',
  fontSize: 12,
  cursor: 'pointer',
};

export function sectionTitleStyle(): React.CSSProperties {
  return {
    margin: '0 0 4px',
    fontSize: 15,
    fontWeight: 700,
    color: byomTheme.text,
    letterSpacing: '-0.02em',
  };
}

export function sectionSubtitleStyle(): React.CSSProperties {
  return {
    margin: 0,
    fontSize: 11,
    color: byomTheme.textMuted,
    lineHeight: 1.4,
  };
}

export function statCardStyle(): React.CSSProperties {
  return {
    ...elevatedCard(),
    padding: '12px 10px',
    textAlign: 'center',
  };
}

export function chipStyle(tone: 'default' | 'success' | 'danger' | 'muted' = 'default'): React.CSSProperties {
  const tones = {
    default: { bg: byomTheme.primaryLight, color: byomTheme.primaryDark, border: byomTheme.border },
    success: { bg: byomTheme.successLight, color: '#166534', border: '#bbf7d0' },
    danger: { bg: byomTheme.dangerLight, color: byomTheme.danger, border: byomTheme.dangerBorder },
    muted: { bg: '#f1f5f9', color: byomTheme.textMuted, border: '#e2e8f0' },
  };
  const t = tones[tone];
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 8px',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 600,
    background: t.bg,
    color: t.color,
    border: `1px solid ${t.border}`,
  };
}

export function providerMonogramStyle(kind: string): React.CSSProperties {
  const colors: Record<string, { bg: string; color: string }> = {
    openai: { bg: '#e0f2fe', color: '#0369a1' },
    anthropic: { bg: '#fef3c7', color: '#b45309' },
    google: { bg: '#fce7f3', color: '#be185d' },
    ollama: { bg: byomTheme.primaryLight, color: byomTheme.primaryDark },
    openrouter: { bg: '#ede9fe', color: '#6d28d9' },
  };
  const c = colors[kind] ?? { bg: byomTheme.primaryLight, color: byomTheme.primaryDark };
  return {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 800,
    background: c.bg,
    color: c.color,
    flexShrink: 0,
    textTransform: 'uppercase',
  };
}

export function strategyCardStyle(selected: boolean, disabled?: boolean): React.CSSProperties {
  return {
    display: 'block',
    padding: 12,
    borderRadius: byomTheme.radiusSm,
    background: selected ? byomTheme.primaryLight : byomTheme.surface,
    border: `1px solid ${selected ? byomTheme.primary : byomTheme.border}`,
    boxShadow: selected ? `0 0 0 1px ${byomTheme.primaryGlow}` : 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    textAlign: 'left',
    width: '100%',
  };
}

export function emptyStateStyle(): React.CSSProperties {
  return {
    padding: 24,
    textAlign: 'center',
    color: byomTheme.textSubtle,
    fontSize: 13,
    lineHeight: 1.5,
  };
}

export function loadingStyle(): React.CSSProperties {
  return {
    padding: 32,
    textAlign: 'center',
    color: byomTheme.textMuted,
    fontSize: 13,
  };
}

/** @deprecated use mastheadStyle */
export const sidepanelHeaderStyle = mastheadStyle;

/** @deprecated use navPillStyle */
export function sidepanelTabStyle(active: boolean): React.CSSProperties {
  return navPillStyle(active);
}
