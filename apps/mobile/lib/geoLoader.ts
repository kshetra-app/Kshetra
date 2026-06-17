/**
 * Lazy GeoJSON loader for all states.
 * Uses require() so Metro bundles the JSON but only parses on first access.
 * Each state's GeoJSON is cached after first load.
 */

const cache = new Map<string, GeoJSON.FeatureCollection>();

/** Mapping from state code → require function (Metro resolves at build time) */
const loaders: Record<string, () => GeoJSON.FeatureCollection> = {
  TS: () => require('@/data/telangana-assembly.json') as GeoJSON.FeatureCollection,
  AP: () => require('@/data/ap-assembly.json') as GeoJSON.FeatureCollection,
  KA: () => require('@/data/ka-assembly.json') as GeoJSON.FeatureCollection,
  MH: () => require('@/data/mh-assembly.json') as GeoJSON.FeatureCollection,
  TN: () => require('@/data/tn-assembly.json') as GeoJSON.FeatureCollection,
  KL: () => require('@/data/kl-assembly.json') as GeoJSON.FeatureCollection,
  WB: () => require('@/data/wb-assembly.json') as GeoJSON.FeatureCollection,
  UP: () => require('@/data/up-assembly.json') as GeoJSON.FeatureCollection,
  RJ: () => require('@/data/rj-assembly.json') as GeoJSON.FeatureCollection,
  GJ: () => require('@/data/gj-assembly.json') as GeoJSON.FeatureCollection,
  DL: () => require('@/data/dl-assembly.json') as GeoJSON.FeatureCollection,
  OD: () => require('@/data/od-assembly.json') as GeoJSON.FeatureCollection,
  JH: () => require('@/data/jh-assembly.json') as GeoJSON.FeatureCollection,
  BR: () => require('@/data/br-assembly.json') as GeoJSON.FeatureCollection,
  PB: () => require('@/data/pb-assembly.json') as GeoJSON.FeatureCollection,
  HR: () => require('@/data/hr-assembly.json') as GeoJSON.FeatureCollection,
  CG: () => require('@/data/cg-assembly.json') as GeoJSON.FeatureCollection,
  MP: () => require('@/data/mp-assembly.json') as GeoJSON.FeatureCollection,
  AS: () => require('@/data/as-assembly.json') as GeoJSON.FeatureCollection,
  GA: () => require('@/data/ga-assembly.json') as GeoJSON.FeatureCollection,
  HP: () => require('@/data/hp-assembly.json') as GeoJSON.FeatureCollection,
  JK: () => require('@/data/jk-assembly.json') as GeoJSON.FeatureCollection,
  PY: () => require('@/data/py-assembly.json') as GeoJSON.FeatureCollection,
  TR: () => require('@/data/tr-assembly.json') as GeoJSON.FeatureCollection,
  ML: () => require('@/data/ml-assembly.json') as GeoJSON.FeatureCollection,
  MN: () => require('@/data/mn-assembly.json') as GeoJSON.FeatureCollection,
  NL: () => require('@/data/nl-assembly.json') as GeoJSON.FeatureCollection,
  UK: () => require('@/data/uk-assembly.json') as GeoJSON.FeatureCollection,
  SK: () => require('@/data/sk-assembly.json') as GeoJSON.FeatureCollection,
  AR: () => require('@/data/ar-assembly.json') as GeoJSON.FeatureCollection,
  MZ: () => require('@/data/mz-assembly.json') as GeoJSON.FeatureCollection,
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
function sanitizeGeoJSON(fc: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
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
 * Get assembly constituency polygon GeoJSON for any state.
 * Returns null if no GeoJSON is available for the given state code.
 */
export function getStateGeoJSON(stateCode: string): GeoJSON.FeatureCollection | null {
  const code = stateCode.toUpperCase();

  // Check cache first
  const cached = cache.get(code);
  if (cached) return cached;

  // Load if available
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

/** Check if a state has polygon GeoJSON data */
export function hasStateGeoJSON(stateCode: string): boolean {
  return stateCode.toUpperCase() in loaders;
}

/** List all state codes that have polygon GeoJSON */
export function getStatesWithGeoJSON(): string[] {
  return Object.keys(loaders);
}
