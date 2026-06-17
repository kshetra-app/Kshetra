import { TELANGANA_CONSTITUENCIES, type ConstituencySeed, TELANGANA_DEMOGRAPHICS, type ConstituencyDemographics } from '@/lib/data';
import { getUnifiedConstituenciesForState, type UnifiedConstituency } from './stateDataAdapter';
import { getDemographicsForState } from './stateDataDispatcher';

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
          DISTRICT: seed?.district ?? '',
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
 * Normalize a constituency name for fuzzy matching.
 * Strips parenthesized suffixes like "(SC)", "(ST)", "(South)", lowercases,
 * removes punctuation/diacritics, and collapses whitespace.
 */
function normalizeName(raw: string): string {
  return raw
    .replace(/\s*\((?:SC|ST|GEN)\)?\s*/gi, '') // strip (SC)/(ST)/(GEN) — tolerates missing close paren
    .replace(/\(/g, ' ')                        // open parens → space (handles "Gandhinagar(South)")
    .replace(/\)/g, ' ')                        // close parens → space
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')               // remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strip ALL spaces from a normalized name for ultra-fuzzy matching
 *  e.g. "suran kote" → "surankote", "baran atru" → "baranatru" */
function stripSpaces(normalized: string): string {
  return normalized.replace(/\s/g, '');
}

/**
 * Known GeoJSON→seed name aliases that can't be resolved by normalization.
 * Key = normalized GeoJSON name, Value = normalized seed name.
 */
const NAME_ALIASES: Record<string, string> = {
  // J&K
  'kala kote': 'kalakote sunderbani',
  // Assam (GeoJSON splits combined constituency)
  'chabua': 'chabualahowal',
  'lahowal': 'chabualahowal',
  // Andhra Pradesh: GeoJSON uses older/variant spellings vs the official
  // ECI constituency names in the seed. (geojsonName → officialSeedName)
  'anakapalli': 'anakapalle',
  'yelamanchili': 'elamanchili',
  'payakaraopeta': 'payakaraopet',
  'nidadavolu': 'nidadavole',
  'palacole': 'palakollu',
  'narsapuram': 'narasapuram',
  'gurazala': 'gurajala',
  'sattenapalli': 'sattenapalle',
  'satyavedu': 'sathyavedu',
  'pulivendula': 'pulivendla',
  'rayachoty': 'rayachoti',
  'patikonda': 'pattikonda',
  'parchur pr': 'parchur',
  'jaggaiahpeta': 'jaggayyapeta',
  'ponnur': 'ponnuru',
  'emmiganur': 'yemmiganur',
  'tadpatri': 'tadipatri',
  'gannavaram': 'gannavaram krishna',
  'gannavaram eg': 'gannavaram konaseema',
  'prathipadu': 'prathipadu kakinada',
};

/**
 * Generic enrichment for any state.
 * Matches GeoJSON features to seed data using a multi-pass strategy:
 *   1. Normalized name match (handles case, punctuation, parens)
 *   2. Space-stripped name match (handles "Suran Kote" ↔ "Surankote")
 *   3. Known alias lookup (handles "Kala Kote" ↔ "Kalakote - Sunderbani")
 *   4. AC_NO fallback (works for pre-enriched states)
 * When matched, overrides AC_NO in output so tap handlers use seed acNo.
 */
export function enrichGeoJSONForState(
  geojson: GeoJSON.FeatureCollection,
  stateCode: string,
): GeoJSON.FeatureCollection {
  const constituencies = getUnifiedConstituenciesForState(stateCode);
  const byAcNo = new Map<number, UnifiedConstituency>(
    constituencies.map((c) => [c.acNo, c]),
  );
  const byName = new Map<string, UnifiedConstituency>(
    constituencies.map((c) => [normalizeName(c.name), c]),
  );
  // Space-stripped index for fuzzy matching
  const byNameStripped = new Map<string, UnifiedConstituency>(
    constituencies.map((c) => [stripSpaces(normalizeName(c.name)), c]),
  );

  return {
    ...geojson,
    features: geojson.features.map((feature) => {
      const geoAcNo = feature.properties?.AC_NO;
      const geoName = feature.properties?.AC_NAME ?? '';
      const geoNorm = normalizeName(geoName);

      // Strategy 1: exact normalized name match
      let c = byName.get(geoNorm);

      // Strategy 2: space-stripped match ("suran kote" → "surankote")
      if (!c) {
        c = byNameStripped.get(stripSpaces(geoNorm));
      }

      // Strategy 3: known alias lookup
      if (!c && NAME_ALIASES[geoNorm]) {
        c = byName.get(NAME_ALIASES[geoNorm]) ?? byNameStripped.get(stripSpaces(NAME_ALIASES[geoNorm]));
      }

      // Strategy 4: AC_NO fallback (only if above strategies failed)
      if (!c && geoAcNo != null) {
        c = byAcNo.get(geoAcNo);
      }

      // Use seed's acNo if matched (corrects the AC_NO for tap handlers)
      const resolvedAcNo = c ? c.acNo : geoAcNo;

      // Merge demographics so the map's Data overlays (population / literacy /
      // turnout) render for every state, not just Telangana. Missing data
      // falls back to 0 (renders at the low end of the heatmap scale).
      const demo =
        resolvedAcNo != null ? getDemographicsForState(stateCode, resolvedAcNo) : undefined;

      return {
        ...feature,
        properties: {
          ...feature.properties,
          AC_NO: resolvedAcNo,
          AC_NAME: c?.name ?? geoName,
          WINNER_PARTY: c?.winnerParty ?? 'IND',
          WINNER_NAME: c?.winnerName ?? '',
          RUNNER_UP: c?.runnerUp ?? '',
          RESERVATION: c?.type ?? 'GEN',
          MARGIN: c?.margin ?? 0,
          DISTRICT: c?.district ?? feature.properties?.DIST_NAME ?? '',
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
