/**
 * Kshetra Theme System
 *
 * Defines dark and light color palettes.
 * Consumed via useTheme() hook connected to preferences store.
 */

export type ThemeMode = 'dark' | 'light' | 'system';

export interface ThemeColors {
  /** Primary background */
  background: string;
  /** Elevated card/surface background */
  surface: string;
  /** More elevated surface */
  surfaceElevated: string;
  /** Primary text */
  text: string;
  /** Secondary text */
  textSecondary: string;
  /** Muted/tertiary text */
  textMuted: string;
  /** Primary accent */
  primary: string;
  /** Primary accent with transparency */
  primaryLight: string;
  /** Danger/error */
  danger: string;
  /** Success */
  success: string;
  /** Warning */
  warning: string;
  /** Divider/border */
  border: string;
  /** Map style URL */
  mapStyle: string;
  /** Status bar style */
  statusBar: 'light' | 'dark';
}

export const DARK_THEME: ThemeColors = {
  background: '#0A0A1A',
  surface: '#111827',
  surfaceElevated: '#1F2937',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  primary: '#4F8EF7',
  primaryLight: '#4F8EF720',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  border: '#1F2937',
  mapStyle: 'mapbox://styles/mapbox/dark-v11',
  statusBar: 'light',
};

export const LIGHT_THEME: ThemeColors = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceElevated: '#F3F4F6',
  text: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  primary: '#2563EB',
  primaryLight: '#2563EB15',
  danger: '#DC2626',
  success: '#059669',
  warning: '#D97706',
  border: '#E5E7EB',
  mapStyle: 'mapbox://styles/mapbox/light-v11',
  statusBar: 'dark',
};
