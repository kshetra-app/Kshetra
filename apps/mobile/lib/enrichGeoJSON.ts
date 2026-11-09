import { TELANGANA_CONSTITUENCIES, type ConstituencySeed } from './data';
import { getUnifiedConstituenciesForState, type UnifiedConstituency } from './stateDataAdapter';
import { getDemographicsForState, getHistoryForState } from './stateDataDispatcher';
import { STATES } from '@kshetra/shared';

/** Lookup map from AC_NO to seed data for O(1) access */
const seedByAcNo = new Map<number, ConstituencySeed>(
  TELANGANA_CONSTITUENCIES.map((c) => [c.acNo, c]),
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
      const demo = acNo != null ? getDemographicsForState('TS', acNo) : undefined;

      const history = acNo != null ? getHistoryForState('TS', acNo) : [];
      const historyProps: Record<string, string> = {};
      for (const h of history) {
        historyProps[`WINNER_PARTY_${h.year}`] = h.party;
        historyProps[`WINNER_NAME_${h.year}`] = h.winner;
      }
      historyProps['WINNER_PARTY_2023'] = seed?.winner2023 ?? '';
      historyProps['WINNER_NAME_2023'] = seed?.winnerName2023 ?? '';

      // Determine Battleground status
      const margin = seed?.margin2023 ?? null;
      let battleground = 'unknown';
      if (margin != null) {
        battleground = margin < 2000 ? 'critical' : margin < 5000 ? 'competitive' : 'safe';
      }

      // Determine Swing status
      let isSwing = false;
      const hasHistory = history.length > 0;
      if (hasHistory) {
        const sortedHistory = [...history].sort((a, b) => b.year - a.year);
        const prevWinnerParty = sortedHistory[0]?.party;
        const currentWinnerParty = seed?.winner2023;
        const normParty = (p: string) => {
          const up = p.toUpperCase();
          if (up === 'TRS' || up === 'BRS') return 'BRS';
          return up;
        };
        if (prevWinnerParty && currentWinnerParty && normParty(prevWinnerParty) !== normParty(currentWinnerParty)) {
          isSwing = true;
        }
      }
      const swingStatus = isSwing ? 'swing' : (hasHistory ? 'retained' : 'unknown');

      return {
        ...feature,
        properties: {
          ...feature.properties,
          WINNER_PARTY: seed?.winner2023 ?? '',
          WINNER_NAME: seed?.winnerName2023 ?? '',
          WINNER_VOTES: seed?.winnerVotes2023 ?? feature.properties?.WINNER_VOTES ?? null,
          RUNNER_UP: seed?.runnerUp2023 ?? '',
          RUNNER_UP_NAME: seed?.runnerUpName2023 ?? feature.properties?.RUNNER_UP_NAME ?? '',
          RUNNER_UP_VOTES: (seed as any)?.runnerUpVotes2023 ?? feature.properties?.RUNNER_UP_VOTES ?? null,
          TOTAL_VOTES: (seed as any)?.totalValidVotes2023 ?? (seed as any)?.totalVotes2023 ?? feature.properties?.TOTAL_VOTES ?? null,
          MARGIN: seed?.margin2023 ?? null,
          RESERVATION: seed?.type ?? '',
          DISTRICT: seed?.district ?? '',
          POPULATION: demo?.population ?? null,
          LITERACY: demo?.literacy ?? null,
          TURNOUT: demo?.turnout2023 ?? null,
          URBAN_PCT: demo?.urbanPercent ?? null,
          TOTAL_VOTERS: demo?.totalVoters ?? null,
          BATTLEGROUND: battleground,
          IS_SWING: swingStatus,
          ...historyProps,
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

      // Merge only demographics eligible for the current environment. In
      // production, unprovenanced bundled estimates are withheld and remain
      // null so the map can render them as unknown.
      const demo =
        resolvedAcNo != null ? getDemographicsForState(stateCode, resolvedAcNo) : undefined;

      const history = resolvedAcNo != null ? getHistoryForState(stateCode, resolvedAcNo) : [];
      const historyProps: Record<string, string> = {};
      for (const h of history) {
        historyProps[`WINNER_PARTY_${h.year}`] = h.party;
        historyProps[`WINNER_NAME_${h.year}`] = h.winner;
      }
      if (c?.electionYear != null && c.winnerParty) {
        historyProps[`WINNER_PARTY_${c.electionYear}`] = c.winnerParty;
      }
      if (c?.electionYear != null && c.winnerName) {
        historyProps[`WINNER_NAME_${c.electionYear}`] = c.winnerName;
      }

      // Determine Battleground status
      const margin = c?.margin ?? null;
      let battleground = 'unknown';
      if (margin != null) {
        battleground = margin < 2000 ? 'critical' : margin < 5000 ? 'competitive' : 'safe';
      }

      // Determine Swing status
      let isSwing = false;
      const hasHistory = history.length > 0;
      if (hasHistory) {
        const sortedHistory = [...history].sort((a, b) => b.year - a.year);
        const prevWinnerParty = sortedHistory[0]?.party;
        const currentWinnerParty = c?.winnerParty;
        const normParty = (p: string) => {
          const up = p.toUpperCase();
          if (up === 'TRS' || up === 'BRS') return 'BRS';
          return up;
        };
        if (prevWinnerParty && currentWinnerParty && normParty(prevWinnerParty) !== normParty(currentWinnerParty)) {
          isSwing = true;
        }
      }
      const swingStatus = isSwing ? 'swing' : (hasHistory ? 'retained' : 'unknown');

      return {
        ...feature,
        properties: {
          ...feature.properties,
          AC_NO: resolvedAcNo,
          AC_NAME: c?.name ?? geoName,
          WINNER_PARTY: c?.winnerParty ?? '',
          WINNER_NAME: c?.winnerName ?? '',
          WINNER_VOTES: c?.winnerVotes ?? feature.properties?.WINNER_VOTES ?? null,
          RUNNER_UP: c?.runnerUp ?? '',
          RUNNER_UP_NAME: c?.runnerUpName ?? feature.properties?.RUNNER_UP_NAME ?? '',
          RUNNER_UP_VOTES: c?.runnerUpVotes ?? feature.properties?.RUNNER_UP_VOTES ?? null,
          TOTAL_VOTES: (c as any)?.totalValidVotes ?? (c as any)?.totalVotes ?? feature.properties?.TOTAL_VOTES ?? null,
          RESERVATION: c?.type ?? '',
          MARGIN: c?.margin ?? null,
          DISTRICT: c?.district ?? feature.properties?.DIST_NAME ?? '',
          POPULATION: demo?.population ?? null,
          LITERACY: demo?.literacy ?? null,
          TURNOUT: demo?.turnout2023 ?? null,
          URBAN_PCT: demo?.urbanPercent ?? null,
          TOTAL_VOTERS: demo?.totalVoters ?? null,
          BATTLEGROUND: battleground,
          IS_SWING: swingStatus,
          ...historyProps,
        },
      };
    }),
  };
}

/**
 * Enrich the national India states GeoJSON.
 * Maps state name (ST_NM) to its StateInfo registry and colors by ruling party.
 */
// ── Master name-to-code mapping for Indian states & UTs ──
const STATE_NAME_TO_CODE: Record<string, string> = {
  jammukashmir: 'JK',
  jammuandkashmir: 'JK',
  puducherry: 'PY',
  delhi: 'DL',
  nctofdelhi: 'DL',
  odisha: 'OD',
  orissa: 'OD',
  uttaranchal: 'UK',
  uttarakhand: 'UK',
  andamannicobar: 'AN',
  andamanandnicobar: 'AN',
  andamanandnicobarislands: 'AN',
  dadraandnagarhavelianddamananddiu: 'DN',
  dadraandnagarhavelianddamanddiu: 'DN',
  dadranagarhaveli: 'DN',
  damandiu: 'DN',
  lakshadweep: 'LD',
  ladakh: 'LA',
  chandigarh: 'CH',
};

for (const [code, info] of Object.entries(STATES)) {
  const key = info.name.toLowerCase().replace(/[^a-z]/g, '');
  STATE_NAME_TO_CODE[key] = code;
}

/** Resolves any state/UT name variant to its canonical 2-letter state code */
export function getStateCodeFromName(name: string): string | null {
  if (!name) return null;
  const normName = name.toLowerCase().replace(/[^a-z]/g, '');
  return STATE_NAME_TO_CODE[normName] ?? null;
}

/**
 * Enriches the national India overview GeoJSON with state metadata.
 * Adds STATE_CODE, STATE_NAME, WINNER_PARTY (ruling party), and SEATS
 * so that state-level choropleth rendering works uniformly.
 */
export function enrichIndiaGeoJSON(
  geojson: GeoJSON.FeatureCollection,
): GeoJSON.FeatureCollection {
  return {
    ...geojson,
    features: geojson.features.map((feature) => {
      const name = feature.properties?.ST_NM ?? '';
      const code = getStateCodeFromName(name) ?? '';
      const stateInfo = STATES[code];

      return {
        ...feature,
        properties: {
          ...feature.properties,
          STATE_CODE: code,
          STATE_NAME: stateInfo?.name ?? name,
          WINNER_PARTY: stateInfo?.rulingParty ?? 'IND', // Color by ruling party of state
          SEATS: stateInfo?.assemblySeats ?? 0,
        },
      };
    }),
  };
}
