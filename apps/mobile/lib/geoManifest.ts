/**
 * Boundary manifest facade. Only the small national overview geometry is
 * bundled. The full geography manifest is fetched from the API at runtime.
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
let manifestPromise: Promise<Record<string, GeoManifestEntry> | null> | null = null;
const BUILT_IN_OVERVIEW: GeoManifestEntry = {
  file: 'india-states.json',
  count: 36,
  hasPolygons: true,
  version: '28c41cd89b90',
  bundled: true,
};

function validateEntry(value: unknown): value is GeoManifestEntry {
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

/** Fetch the canonical API manifest; null means offline/unavailable. */
export async function loadRemoteGeoManifest(
  refresh = false,
): Promise<Record<string, GeoManifestEntry> | null> {
  if (manifestPromise && !refresh) return manifestPromise;
  const pending = (async () => {
    try {
      const response = await fetch(`${getGeoBaseUrl()}/geo/manifest.json`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      const raw: unknown = await response.json();
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
      const result: Record<string, GeoManifestEntry> = {};
      for (const [code, value] of Object.entries(raw)) {
        if (!/^[A-Z]{2}$/.test(code) || !validateEntry(value)) continue;
        result[code] = value;
        manifestCache.set(code, value);
      }
      return result;
    } catch {
      return null;
    }
  })();
  manifestPromise = pending;
  try {
    return await pending;
  } finally {
    if (manifestPromise === pending) manifestPromise = null;
  }
}

/** Synchronous lookup only for the cached manifest and the tiny bundled shell. */
export function getManifestEntry(code: string): GeoManifestEntry | undefined {
  const key = code.toUpperCase();
  return manifestCache.get(key) ?? (key === 'IN' ? BUILT_IN_OVERVIEW : undefined);
}

/** Has a remote manifest entry been received, not merely a local state name? */
export function hasStateGeoJSON(code: string): boolean {
  const key = code.toUpperCase();
  return manifestCache.has(key) || key === 'IN';
}

/** Only the national overview is synchronously bundled. */
export function isBundledState(code: string): boolean {
  return code.toUpperCase() === 'IN';
}

export function getStatesWithGeoJSON(): string[] {
  return [...new Set(['IN', ...manifestCache.keys()])];
}
