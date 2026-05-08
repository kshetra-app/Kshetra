import { TELANGANA_CONSTITUENCIES, type ConstituencySeed, TELANGANA_DEMOGRAPHICS, type ConstituencyDemographics } from '@/lib/data';
import { getUnifiedConstituenciesForState, type UnifiedConstituency } from './stateDataAdapter';

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
 * NOTE: This function is Telangana-specific (uses demographics). For other
 * states, use enrichGeoJSONForState() below.
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

/**
 * Generic enrichment for any state.
 * Uses ConstituencyBrief from stateDataAdapter to add party/MLA/reservation
 * properties to GeoJSON features by matching on AC_NO.
 */
export function enrichGeoJSONForState(
  geojson: GeoJSON.FeatureCollection,
  stateCode: string,
): GeoJSON.FeatureCollection {
  const constituencies = getUnifiedConstituenciesForState(stateCode);
  const byAcNo = new Map<number, UnifiedConstituency>(
    constituencies.map((c) => [c.acNo, c]),
  );

  return {
    ...geojson,
    features: geojson.features.map((feature) => {
      const acNo = feature.properties?.AC_NO;
      const c = acNo != null ? byAcNo.get(acNo) : undefined;

      return {
        ...feature,
        properties: {
          ...feature.properties,
          WINNER_PARTY: c?.winnerParty ?? 'IND',
          WINNER_NAME: c?.winnerName ?? '',
          RUNNER_UP: c?.runnerUp ?? '',
          RESERVATION: c?.type ?? 'GEN',
          MARGIN: c?.margin ?? 0,
          DISTRICT: c?.district ?? '',
          POPULATION: 0,
          LITERACY: 0,
          TURNOUT: 0,
          URBAN_PCT: 0,
          TOTAL_VOTERS: 0,
        },
      };
    }),
  };
}
