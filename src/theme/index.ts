import { Platform, StyleSheet } from 'react-native';

export const theme = {
  colors: {
    background: '#080808',
    backgroundAlt: '#101010',
    surface: '#161616',
    surfaceElevated: '#1E1E1E',
    surfaceMuted: '#121212',
    border: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(255, 255, 255, 0.16)',
    text: '#F5F5F5',
    textMuted: '#888888',
    textSubtle: '#484848',
    primary: '#B8B8B8',
    primarySoft: 'rgba(184, 184, 184, 0.10)',
    primaryInk: '#0A0A0A',
    secondary: '#888888',
    secondarySoft: 'rgba(136, 136, 136, 0.14)',
    danger: '#E87070',
    dangerSoft: 'rgba(232, 112, 112, 0.12)',
    warning: '#D4943A',
    warningSoft: 'rgba(212, 148, 58, 0.14)',
    success: '#7EC496',
    successSoft: 'rgba(126, 196, 150, 0.12)',
    white: '#FFFFFF',
    black: '#000000',
  },
  gradients: {
    app: ['#080808', '#0C0C0C', '#101010'] as [string, string, string],
    hero: ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)', 'rgba(0, 0, 0, 0)'] as [
      string,
      string,
      string,
    ],
    panel: ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)'] as [string, string],
  },
  radii: {
    sm: 12,
    md: 18,
    lg: 24,
    pill: 999,
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  fonts: {
    mono: Platform.select({
      ios: 'Menlo',
      default: 'monospace',
    }),
  },
};

export const sharedStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  surface: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  surfaceElevated: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  headline: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  subheadline: {
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
});

export const shadows = StyleSheet.create({
  floatingCard: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 10,
  },
});
