/**
 * Boundary GeoJSON manifest (Performance Phase 3).
 *
 * The manifest is tiny (a few KB) and IS bundled with the app. It maps each
 * state code to the remote file name, content version (cache-busting hash) and
 * size metadata produced by `scripts/build-geo-assets.mjs`. The large polygon
 * files themselves are streamed on demand from the API (see remoteGeoLoader),
 * except states flagged `bundled` (the national "IN" overview) which ship in
 * the JS bundle for an instant, offline first paint.
 */
import manifest from '../data/geo-manifest.json';

export interface GeoManifestEntry {
  /** Remote file name, e.g. "up-assembly.json". */
  file: string;
  /** Number of constituencies (informational). */
  count: number;
  /** Whether this state has real polygon geometry. */
  hasPolygons: boolean;
  /** "placeholder" for states without verified boundaries. */
  status?: string;
  /** Uncompressed byte size of the optimised file. */
  bytes?: number;
  /** Gzipped (over-the-wire) byte size. */
  gzipBytes?: number;
  /** Content hash — used for cache-busting (URL ?v= + on-disk file name). */
  version?: string;
  /** True if shipped inside the JS bundle instead of streamed. */
  bundled?: boolean;
}

const MANIFEST = manifest as Record<string, GeoManifestEntry>;

export function getManifestEntry(code: string): GeoManifestEntry | undefined {
  return MANIFEST[code.toUpperCase()];
}

/** A bundled state's GeoJSON is required directly (no network). */
export function isBundledState(code: string): boolean {
  return getManifestEntry(code)?.bundled === true;
}

/**
 * True only when the manifest certifies real polygon boundaries as available.
 * A jurisdiction appearing in the manifest is not proof that polygon data is
 * verified; placeholder entries are deliberately reported as unavailable.
 */
export function hasStateGeoJSON(code: string): boolean {
  const entry = getManifestEntry(code);
  return Boolean(entry && entry.hasPolygons && entry.status !== 'placeholder');
}

/** All jurisdictions whose manifest explicitly marks verified polygons available. */
export function getStatesWithGeoJSON(): string[] {
  return Object.entries(MANIFEST)
    .filter(([, entry]) => entry.hasPolygons && entry.status !== 'placeholder')
    .map(([code]) => code);
}
