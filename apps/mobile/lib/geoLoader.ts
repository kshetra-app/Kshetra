/**
 * GeoJSON loader for BUNDLED states only (Performance Phase 3).
 *
 * Historically every state's polygon GeoJSON was require()'d here, inlining
 * ~63 MB into the JS bundle. Those per-state files are now streamed on demand
 * from the API and cached on-device (see remoteGeoLoader.ts).
 *
 * Only the small national overview ("IN", ~0.5 MB) stays bundled so the default
 * landing map paints instantly and works offline. The require() below is the
 * sole boundary asset Metro inlines.
 */
import { getStatesWithGeoJSON as manifestStates, hasStateGeoJSON as manifestHas } from './geoManifest';

const cache = new Map<string, GeoJSON.FeatureCollection>();

/** Bundled state code → require function (Metro resolves at build time). */
const loaders: Record<string, () => GeoJSON.FeatureCollection> = {
  IN: () => require('../data/india-states.json') as GeoJSON.FeatureCollection,
  TS: () => require('../data/telangana-assembly.json') as GeoJSON.FeatureCollection,
};

/** A linear ring is only valid with >= 4 positions (a closed triangle). */
function isValidRing(ring: unknown): ring is number[][] {
  return Array.isArray(ring) && ring.length >= 4;
}

/**
 * Remove degenerate rings (<4 positions) and empty polygons.
 * MapLibre's native renderer silently rejects an ENTIRE source when it
 * encounters malformed geometry, leaving the whole map blank. Some state
 * GeoJSON files (e.g. tn-assembly.json) contain 1- and 3-point sliver rings,
 * so we sanitize every state's data once, at load time, before caching.
 */
export function sanitizeGeoJSON(fc: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  const features = fc.features
    .map((f) => {
      const gm = f.geometry as any;
      if (!gm) return null;

      if (gm.type === 'Polygon') {
        const rings = (gm.coordinates as any[]).filter(isValidRing);
        if (!isValidRing(rings[0])) return null; // no valid outer ring
        return { ...f, geometry: { ...gm, coordinates: rings } };
      }

      if (gm.type === 'MultiPolygon') {
        const polys = (gm.coordinates as any[])
          .map((poly: any[]) => poly.filter(isValidRing))
          .filter((poly: any[]) => isValidRing(poly[0]));
        if (polys.length === 0) return null;
        return { ...f, geometry: { ...gm, coordinates: polys } };
      }

      return f; // other geometry types pass through unchanged
    })
    .filter((f): f is GeoJSON.Feature => f != null);

  return { ...fc, features };
}

/**
 * Get assembly constituency polygon GeoJSON for a BUNDLED state (currently
 * only "IN"). Returns null for streamed states — use remoteGeoLoader for those.
 */
export function getStateGeoJSON(stateCode: string): GeoJSON.FeatureCollection | null {
  const code = stateCode.toUpperCase();

  // Check cache first
  const cached = cache.get(code);
  if (cached) return cached;

  // Only bundled states are loadable synchronously here.
  const loader = loaders[code];
  if (!loader) return null;

  try {
    const geo = sanitizeGeoJSON(loader());
    cache.set(code, geo);
    return geo;
  } catch {
    return null;
  }
}

/** A bundled state is served synchronously from the JS bundle. */
export function isBundledGeoJSON(stateCode: string): boolean {
  return stateCode.toUpperCase() in loaders;
}

/** Check if a state has polygon GeoJSON data (bundled or streamed). */
export function hasStateGeoJSON(stateCode: string): boolean {
  return manifestHas(stateCode);
}

/** List all state codes that have polygon GeoJSON (bundled or streamed). */
export function getStatesWithGeoJSON(): string[] {
  return manifestStates();
}
