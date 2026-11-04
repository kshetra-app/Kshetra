/**
 * Poligram Theme System - National Ashoka Chakra Navy Blue & Pure White Edition
 *
 * Infuses the patriotic Ashoka Chakra Navy Blue (#002B7F) and Pure White (#FFFFFF),
 * representing truth, dignity, and civic transparency across India.
 */

export type ThemeMode = 'dark' | 'light' | 'system';

export interface ThemeColors {
  /** Primary canvas background (Pure White in light, Deep Navy in dark) */
  background: string;
  /** Elevated card/surface background (White in light, Navy Card in dark) */
  surface: string;
  /** More elevated surface / highlighted card */
  surfaceElevated: string;
  /** Primary text (High-contrast slate in light, Pure white in dark) */
  text: string;
  /** Secondary text */
  textSecondary: string;
  /** Muted/tertiary text */
  textMuted: string;
  /** Ashoka Chakra Navy Blue - Primary Royal Accent */
  primary: string;
  /** Primary accent with transparency / soft wash */
  primaryLight: string;
  /** Civic Gold / Saffron Trim */
  gold: string;
  /** Soft gold highlight background */
  goldLight: string;
  /** Zari border stroke */
  goldBorder: string;
  /** Civic Teal - Secondary Accent */
  teal: string;
  /** Soft teal highlight background */
  tealLight: string;
  /** Warm parchment surface fallback */
  parchment: string;
  /** Danger/error - Crimson */
  danger: string;
  /** Success - Tiranga Green */
  success: string;
  /** Warning - Saffron/Amber */
  warning: string;
  /** Slate divider border */
  border: string;
  /** Map style URL */
  mapStyle: string;
  /** Status bar style */
  statusBar: 'light-content' | 'dark-content';
  /** Ambient shadow color */
  shadowColor: string;
}

export const DARK_THEME: ThemeColors = {
  background: '#070D18',
  surface: '#0F1A2E',
  surfaceElevated: '#172540',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  primary: '#3B82F6',
  primaryLight: '#1E293B',
  gold: '#FBBF24',
  goldLight: '#2C2114',
  goldBorder: '#D97706',
  teal: '#14B8A6',
  tealLight: '#134E4A',
  parchment: '#0B1324',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  border: '#1E293B',
  mapStyle: 'mapbox://styles/mapbox/dark-v11',
  statusBar: 'light-content',
  shadowColor: '#000000',
};

export const LIGHT_THEME: ThemeColors = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#F8FAFC',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  primary: '#002B7F',
  primaryLight: '#EEF2FF',
  gold: '#D97706',
  goldLight: '#FEF3C7',
  goldBorder: '#F59E0B',
  teal: '#0D9488',
  tealLight: '#CCFBF1',
  parchment: '#F8FAFC',
  danger: '#DC2626',
  success: '#059669',
  warning: '#D97706',
  border: '#E2E8F0',
  mapStyle: 'mapbox://styles/mapbox/light-v11',
  statusBar: 'dark-content',
  shadowColor: '#0F172A',
};

export { useTheme } from './useTheme';
