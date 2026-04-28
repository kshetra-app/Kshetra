/** Telangana centroid — default map center */
export const TELANGANA_CENTER: [number, number] = [79.0193, 17.8495];

/** Default zoom level showing full Telangana */
export const TELANGANA_ZOOM = 6.8;

/** Zoom level for constituency detail */
export const CONSTITUENCY_ZOOM = 10;

/** Dark map style for the political map */
export const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11';
export const MAP_STYLE_LIGHT = 'mapbox://styles/mapbox/light-v11';

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
