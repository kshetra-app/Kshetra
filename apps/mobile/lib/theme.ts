/**
 * Kshetra Theme System - Raja Ravi Varma Heritage Edition
 *
 * Infuses the visual depth, warm chiaroscuro, natural pigments (sindoori vermilion,
 * kasavu gold, peacock teal, aged rosewood, ivory parchment) of Raja Ravi Varma's
 * classical masterworks into a human-crafted digital civic experience.
 */

export type ThemeMode = 'dark' | 'light' | 'system';

export interface ThemeColors {
  /** Primary canvas background (Parchment in light, Rosewood in dark) */
  background: string;
  /** Elevated card/surface background (Ivory in light, Teakwood in dark) */
  surface: string;
  /** More elevated surface / highlighted card */
  surfaceElevated: string;
  /** Primary text (Walnut Ink in light, Antique Silk in dark) */
  text: string;
  /** Secondary text */
  textSecondary: string;
  /** Muted/tertiary text */
  textMuted: string;
  /** Sindoori Vermilion - Primary Royal Accent */
  primary: string;
  /** Primary accent with transparency / soft wash */
  primaryLight: string;
  /** Kasavu / Zari Gold - Trims, Accents, Emblems */
  gold: string;
  /** Soft gold highlight background */
  goldLight: string;
  /** Zari border stroke */
  goldBorder: string;
  /** Mayil Peacock Teal - Secondary Regal Accent */
  teal: string;
  /** Soft teal highlight background */
  tealLight: string;
  /** Warm parchment surface */
  parchment: string;
  /** Danger/error - Crimson Lacquer */
  danger: string;
  /** Success - Temple Emerald */
  success: string;
  /** Warning - Marigold Saffron */
  warning: string;
  /** Linen / Teak divider border */
  border: string;
  /** Map style URL */
  mapStyle: string;
  /** Status bar style */
  statusBar: 'light-content' | 'dark-content';
  /** Warm ambient shadow color */
  shadowColor: string;
}

export const DARK_THEME: ThemeColors = {
  background: '#16100E',
  surface: '#221916',
  surfaceElevated: '#2D221E',
  text: '#F5EBE1',
  textSecondary: '#C4B1A2',
  textMuted: '#8E7B6F',
  primary: '#D3453E',
  primaryLight: '#3D1B19',
  gold: '#D8BC7E',
  goldLight: '#2C2114',
  goldBorder: '#8A6D3B',
  teal: '#268596',
  tealLight: '#122E34',
  parchment: '#1E1613',
  danger: '#E74C3C',
  success: '#388E3C',
  warning: '#F59E0B',
  border: '#382A24',
  mapStyle: 'mapbox://styles/mapbox/dark-v11',
  statusBar: 'light-content',
  shadowColor: '#0A0605',
};

export const LIGHT_THEME: ThemeColors = {
  background: '#FAF6EE',
  surface: '#FFFFFF',
  surfaceElevated: '#F5EFE4',
  text: '#241814',
  textSecondary: '#6D5549',
  textMuted: '#988275',
  primary: '#A8201A',
  primaryLight: '#FBE8E7',
  gold: '#C5A059',
  goldLight: '#F9F4E8',
  goldBorder: '#D8BC7E',
  teal: '#145C68',
  tealLight: '#E6F4F6',
  parchment: '#F4EFE6',
  danger: '#C0392B',
  success: '#2E7D32',
  warning: '#D97706',
  border: '#E8DED1',
  mapStyle: 'mapbox://styles/mapbox/light-v11',
  statusBar: 'dark-content',
  shadowColor: '#2A1810',
};

export { useTheme } from './useTheme';
