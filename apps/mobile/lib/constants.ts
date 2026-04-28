/** Telangana centroid — default map center */
export const TELANGANA_CENTER: [number, number] = [79.0193, 17.8495];

/** Default zoom level showing full Telangana */
export const TELANGANA_ZOOM = 6.8;

/** Zoom level for constituency detail */
export const CONSTITUENCY_ZOOM = 10;

/**
 * Map styles — using free tile servers compatible with MapLibre.
 * Can switch back to Mapbox URLs (mapbox://styles/mapbox/dark-v11) if
 * we upgrade to Mapbox backend later.
 */
export const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
export const MAP_STYLE_LIGHT = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

/** API base URL — use env var in production */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Party colors matching @kshetra/shared */
export const PARTY_COLORS: Record<string, string> = {
  INC: '#19AAED',
  BRS: '#E91E8C',
  BJP: '#FF6B00',
  AIMIM: '#008000',
  TDP: '#FFCD00',
  CPI: '#FF0000',
  CPM: '#CC0000',
  IND: '#808080',
  NOTA: '#333333',
};

/** Get party color with fallback */
export function getPartyColor(party: string): string {
  return PARTY_COLORS[party] ?? PARTY_COLORS.IND;
}
