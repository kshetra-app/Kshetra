/**
 * Boundary manifest facade.
 *
 * Keep only the small national overview in the app bundle. The manifest
 * itself is downloaded from the API and is deliberately not populated from
 * source assets at runtime, so per-state metadata cannot pull source geometry
 * into the Metro graph.
 */
import { getGeoBaseUrl } from './remoteGeoLoader';

export interface GeoManifestEntry {
  file: string;
  count: number;
  hasPolygons: boolean;
  status?: string;
  bytes?: number;
  gzipBytes?: number;
  version?: string;
  bundled?: boolean;
}

const manifestCache = new Map<string, GeoManifestEntry>();
let manifestPromise: Promise<Record<string, GeoManifestEntry> | null> | null = null;\nlet bundledManifest: Record<string, GeoManifestEntry> = {};

function validateEntry(value: unknown, code: string): value is GeoManifestEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<GeoManifestEntry>;
  return typeof entry.file === 'string'
    && /^[a-z0-9-]+\.json$/.test(entry.file)
    && typeof entry.count === 'number'
    && Number.isFinite(entry.count)
    && typeof entry.hasPolygons === 'boolean'
    && typeof entry.version === 'string'
    && /^[a-f0-9]{12,40}$/i.test(entry.version)
    && (!entry.status || typeof entry.status === 'string');
}

/** Fetch the canonical API manifest once; null means offline/unavailable. */
export async function loadRemoteGeoManifest(
  refresh = false,
): Promise<Record<string, GeoManifestEntry> | null> {
  if (manifestPromise && !refresh) return manifestPromise;
  manifestPromise = (async () => {
    try {
      const response = await fetch(`${getGeoBaseUrl()}/geo/manifest.json`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      const raw: unknown = await response.json();
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
      const result: Record<string, GeoManifestEntry> = {};
      for (const [code, value] of Object.entries(raw)) {
        if (!/^[A-Z]{2}$/.test(code) || !validateEntry(value, code)) continue;
        result[code] = value;
        manifestCache.set(code, value);\n        bundledManifest[code] = value;
      }
      return result;
    } catch {
      return null;
    } finally {
      if (refresh) manifestPromise = null;
    }
  })();
  return manifestPromise;
}

/** Synchronous lookup only for entries already downloaded from the API. */
export function getManifestEntry(code: string): GeoManifestEntry | undefined {
  return manifestCache.get(code.toUpperCase());
}

/** Manifest availability is explicit; unknown/offline is not treated as geometry. */
export function hasStateGeoJSON(code: string): boolean {
  return manifestCache.has(code.toUpperCase());
}

export function isBundledState(code: string): boolean {
  return code.toUpperCase() === 'IN';
}

export function getStatesWithGeoJSON(): string[] {
  return [...manifestCache.keys()];
}
