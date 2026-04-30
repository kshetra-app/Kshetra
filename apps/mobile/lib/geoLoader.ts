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
};

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
    const geo = loader();
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
