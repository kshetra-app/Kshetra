import { STATES } from '@kshetra/shared';
import { PARTY_CONFIG } from '@kshetra/shared';

/** Telangana centroid — default map center (kept for backward compat) */
export const TELANGANA_CENTER: [number, number] = [79.0193, 17.8495];

/** Default zoom level showing full Telangana (kept for backward compat) */
export const TELANGANA_ZOOM = 6.8;

/** Zoom level for constituency detail */
export const CONSTITUENCY_ZOOM = 10;

/** Dark map style for the political map (MapLibre-compatible) */
export const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
export const MAP_STYLE_LIGHT = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

/** API base URL — use env var in production */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Get [lng, lat] center for any state code */
export function getStateCenter(stateCode: string): [number, number] {
  const s = STATES[stateCode];
  if (s) return [s.centroid.longitude, s.centroid.latitude];
  return TELANGANA_CENTER;
}

/** Get default zoom for any state code */
export function getStateZoom(stateCode: string): number {
  return STATES[stateCode]?.zoom ?? 6.8;
}

/** Party colors — derived from shared PARTY_CONFIG for all parties */
export const PARTY_COLORS: Record<string, string> = Object.fromEntries(
  Object.values(PARTY_CONFIG).map((p) => [p.code, p.color]),
);

/** Get party color with fallback */
export function getPartyColor(party: string): string {
  return PARTY_COLORS[party] ?? '#808080';
}
