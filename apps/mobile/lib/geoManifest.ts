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
  /** Accepted primary source URL (not a proxy/error page). */
  sourceUrl?: string;
  /** UTC retrieval time for exact source bytes. */
  retrievedAt?: string;
  /** Legal/data effective date. */
  effectiveDate?: string;
  /** Source-published version, when present. */
  sourceVersion?: string;
  /** SHA-256 of the accepted artifact. */
  sha256?: string;
  /** Reproducible transformation pipeline identifier. */
  transformationVersion?: string;
  /** Reconciled canonical feature count. */
  canonicalCount?: number;
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
 * A remote assembly boundary is accepted only when its full provenance chain
 * and count reconciliation are recorded. Asset presence or a short cache key
 * alone cannot promote a boundary to canonical geography.
 */
export function isVerifiedRemoteStateGeoJSON(code: string): boolean {
  const entry = getManifestEntry(code);
  if (!entry || entry.bundled === true || entry.hasPolygons !== true) return false;
  if (entry.status !== 'official_verified') return false;
  if (!entry.sourceUrl) return false;
  try {
    const source = new URL(entry.sourceUrl);
    if (source.protocol !== 'https:' || !source.hostname || /(?:^|\\.)invalid$/i.test(source.hostname)) return false;
  } catch {
    return false;
  }
  if (!entry.retrievedAt || Number.isNaN(Date.parse(entry.retrievedAt))) return false;
  if (!entry.effectiveDate || Number.isNaN(Date.parse(entry.effectiveDate))) return false;
  if (!entry.version || !entry.transformationVersion) return false;
  if (!entry.sha256 || !/^[a-f0-9]{64}$/i.test(entry.sha256)) return false;
  return typeof entry.count === 'number' && entry.count > 0 && entry.canonicalCount === entry.count;
}

export type StateGeoAvailability = 'BUNDLED' | 'REMOTE_VERIFIED' | 'UNAVAILABLE';

export function getStateGeoAvailability(code: string): StateGeoAvailability {
  const entry = getManifestEntry(code);
  if (!entry || entry.hasPolygons !== true) return 'UNAVAILABLE';
  if (entry.bundled === true) return 'BUNDLED';
  return isVerifiedRemoteStateGeoJSON(code) ? 'REMOTE_VERIFIED' : 'UNAVAILABLE';
}

/** True only for bundled overview geometry or fully accepted remote AC boundaries. */
export function hasStateGeoJSON(code: string): boolean {
  return getStateGeoAvailability(code) !== 'UNAVAILABLE';
}

/** Jurisdictions whose current manifest qualifies for map geometry use. */
export function getStatesWithGeoJSON(): string[] {
  return Object.keys(MANIFEST).filter((code) => hasStateGeoJSON(code));
}
