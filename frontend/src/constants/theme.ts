/**
 * Arovia Theme System
 * Supports seamless Dark Mode and Light Mode switching with AsyncStorage persistence.
 * Design inspired by Arovia Reference UI.
 */

import '@/global.css';
import { Platform } from 'react-native';

export const Palette = {
  // Brand Blues & Teals (from reference screenshots)
  primaryBlue: '#2563EB',
  deepBlue: '#1D4ED8',
  lightBlue: '#DBEAFE',
  tealGradient: '#10B981',
  cyanAccent: '#06B6D4',

  // Dark Mode Surfaces (Navy deep theme)
  darkBg: '#0B132B',
  darkCard: '#1C2541',
  darkCardBorder: '#2A3B5C',
  darkTextPrimary: '#FFFFFF',
  darkTextSecondary: '#94A3B8',

  // Light Mode Surfaces (Clean white & sky glow)
  lightBg: '#F8FAFC',
  lightCard: '#FFFFFF',
  lightCardBorder: '#E2E8F0',
  lightTextPrimary: '#0F172A',
  lightTextSecondary: '#64748B',

  // Utility colors
  emergencyRed: '#EF4444',
  successGreen: '#10B981',
  warningAmber: '#F59E0B',
  white: '#FFFFFF',
  black: '#000000',

  // Compatibility aliases
  cardBackground: '#1C2541',
  lightEmerald: '#CCFBF1',
  deepEmerald: '#0F766E',
  primaryEmerald: '#2563EB',
};

export const Colors = {
  dark: {
    background: Palette.darkBg,
    card: Palette.darkCard,
    cardBorder: Palette.darkCardBorder,
    text: Palette.darkTextPrimary,
    textSecondary: Palette.darkTextSecondary,
    primary: Palette.primaryBlue,
    heroGradientStart: '#0B132B',
    heroGradientEnd: '#064E3B',
    searchBarBg: '#1C2541',
    searchBarBorder: '#2A3B5C',
    statCardBg: '#1C2541',
    navBg: '#0B132B',
    pillBg: '#1E293B',
    pillText: '#94A3B8',
    backgroundElement: '#1C2541',
    backgroundSelected: '#2A3B5C',
  },
  light: {
    background: Palette.lightBg,
    card: Palette.lightCard,
    cardBorder: Palette.lightCardBorder,
    text: Palette.lightTextPrimary,
    textSecondary: Palette.lightTextSecondary,
    primary: Palette.primaryBlue,
    heroGradientStart: '#1E40AF',
    heroGradientEnd: '#047857',
    searchBarBg: '#FFFFFF',
    searchBarBorder: '#CBD5E1',
    statCardBg: '#FFFFFF',
    navBg: '#FFFFFF',
    pillBg: '#F1F5F9',
    pillText: '#475569',
    backgroundElement: '#F1F5F9',
    backgroundSelected: '#DBEAFE',
  },
} as const;

export type ThemeType = 'light' | 'dark';
export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 4,
  one: 8,
  two: 12,
  three: 16,
  four: 20,
  five: 24,
  six: 32,
  seven: 40,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export const Shadows = {
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  blueGlow: {
    shadowColor: Palette.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
};
