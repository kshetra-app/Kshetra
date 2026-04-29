import { TELANGANA_CONSTITUENCIES, type ConstituencySeed, TELANGANA_DEMOGRAPHICS, type ConstituencyDemographics } from '@/lib/data';

/** Lookup map from AC_NO to seed data for O(1) access */
const seedByAcNo = new Map<number, ConstituencySeed>(
  TELANGANA_CONSTITUENCIES.map((c) => [c.acNo, c]),
);

/** Lookup map from AC_NO to demographics for O(1) access */
const demoByAcNo = new Map<number, ConstituencyDemographics>(
  TELANGANA_DEMOGRAPHICS.map((d) => [d.acNo, d]),
);

/**
 * Enrich a GeoJSON FeatureCollection with constituency seed data.
 * Adds WINNER_PARTY, WINNER_NAME, MARGIN, TYPE properties to each feature.
 * Also merges demographics data for heatmap overlays.
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
      const demo = acNo != null ? demoByAcNo.get(acNo) : undefined;

      return {
        ...feature,
        properties: {
          ...feature.properties,
          WINNER_PARTY: seed?.winner2023 ?? 'IND',
          WINNER_NAME: seed?.winnerName2023 ?? '',
          RUNNER_UP: seed?.runnerUp2023 ?? '',
          MARGIN: seed?.margin2023 ?? 0,
          RESERVATION: seed?.type ?? 'GEN',
          POPULATION: demo?.population ?? 0,
          LITERACY: demo?.literacy ?? 0,
          TURNOUT: demo?.turnout2023 ?? 0,
          URBAN_PCT: demo?.urbanPercent ?? 0,
          TOTAL_VOTERS: demo?.totalVoters ?? 0,
        },
      };
    }),
  };
}
