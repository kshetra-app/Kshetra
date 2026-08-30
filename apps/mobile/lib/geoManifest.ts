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

/** Whether the app knows about boundary data for this state at all. */
export function hasStateGeoJSON(code: string): boolean {
  return getManifestEntry(code) !== undefined;
}

/** All state codes the app can render boundaries for. */
export function getStatesWithGeoJSON(): string[] {
  return Object.keys(MANIFEST);
}
