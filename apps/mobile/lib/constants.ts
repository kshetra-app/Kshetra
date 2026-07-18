import { STATES, PARTY_CONFIG } from '@kshetra/shared';
import { Dimensions } from 'react-native';

/** Telangana centroid — default map center (kept for backward compat) */
export const TELANGANA_CENTER: [number, number] = [79.0193, 17.8495];

/** Default zoom level showing full Telangana (kept for backward compat) */
export const TELANGANA_ZOOM = 6.8;

/** Zoom level for constituency detail */
export const CONSTITUENCY_ZOOM = 10;

/** Dark map style for the political map (free CARTO tiles via MapLibre) */
export const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
export const MAP_STYLE_LIGHT = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

/** API base URL — use env var in production */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * A *hosted* API base URL, or null when only the localhost dev default is set.
 *
 * Used to decide the news source of truth without the two paths clashing:
 * when a real remote server is configured the app prefers the backend feed;
 * otherwise it scrapes RSS on-device. On a shipped APK (no env var) this is
 * null, so the on-device engine runs. Set `EXPO_PUBLIC_API_URL` to a deployed
 * host later and the backend automatically takes over.
 */
export const REMOTE_API_URL: string | null = (() => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) return null;
  if (/localhost|127\.0\.0\.1|10\.0\.2\.2/i.test(url)) return null;
  return url;
})();

/** Get [lng, lat] center for any state code */
export function getStateCenter(stateCode: string): [number, number] {
  if (stateCode.toUpperCase() === 'IN') return [78.9629, 22.5937];
  const s = STATES[stateCode];
  if (s) return [s.centroid.longitude, s.centroid.latitude];
  return TELANGANA_CENTER;
}

/** Get default zoom for any state code */
export function getStateZoom(stateCode: string): number {
  if (stateCode.toUpperCase() === 'IN') {
    const { width } = Dimensions.get('window');
    if (width < 360) return 3.4;
    if (width < 400) return 3.7;
    return 4.0;
  }
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

/**
 * Get a candidate photo URL.
 * Priority: 1) explicit photoUrl  2) professional initials via ui-avatars
 * The CandidateAvatar component adds a third layer: real Wikipedia photos.
 */
export function getCandidatePhotoUrl(name: string, party: string, size = 128, photoUrl?: string): string {
  if (photoUrl) return photoUrl;
  const bg = getPartyColor(party).replace('#', '');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&size=${size}&background=${bg}&color=fff&bold=true&format=png`;
}
