import { TELANGANA_CONSTITUENCIES, type ConstituencySeed } from '@/lib/data';

/** Lookup map from AC_NO to seed data for O(1) access */
const seedByAcNo = new Map<number, ConstituencySeed>(
  TELANGANA_CONSTITUENCIES.map((c) => [c.acNo, c]),
);

/**
 * Enrich a GeoJSON FeatureCollection with constituency seed data.
 * Adds WINNER_PARTY, WINNER_NAME, MARGIN, TYPE properties to each feature.
 * This is done once at import time (offline, no API call).
 */
export function enrichGeoJSON(
  geojson: GeoJSON.FeatureCollection,
): GeoJSON.FeatureCollection {
  return {
    ...geojson,
    features: geojson.features.map((feature) => {
      const acNo = feature.properties?.AC_NO;
      const seed = acNo != null ? seedByAcNo.get(acNo) : undefined;

      return {
        ...feature,
        properties: {
          ...feature.properties,
          WINNER_PARTY: seed?.winner2023 ?? 'IND',
          WINNER_NAME: seed?.winnerName2023 ?? '',
          RUNNER_UP: seed?.runnerUp2023 ?? '',
          MARGIN: seed?.margin2023 ?? 0,
          RESERVATION: seed?.type ?? 'GEN',
        },
      };
    }),
  };
}
