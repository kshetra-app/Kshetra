import { STATES } from '@kshetra/shared';
import type { StateMapData } from './stateScopedMapData';

/**
 * Backward-compatible name for Telangana enrichment. All state records are
 * injected from the selected state's versioned API snapshot; no seed modules
 * are imported into the mobile map graph.
 */
export function enrichGeoJSON(
  geojson: GeoJSON.FeatureCollection,
  data?: StateMapData | null,
): GeoJSON.FeatureCollection {
  return data ? enrichGeoJSONForState(geojson, 'TS', data) : geojson;
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
  data?: StateMapData | null,
): GeoJSON.FeatureCollection {
  const constituencies = data?.stateCode === stateCode.toUpperCase() ? data.constituencies : [];
  const byAcNo = new Map<number, StateMapData['constituencies'][number]>(
    constituencies.map((c) => [c.acNo, c]),
  );
  const byName = new Map<string, StateMapData['constituencies'][number]>(
    constituencies.map((c) => [normalizeName(c.name), c]),
  );
  // Space-stripped index for fuzzy matching
  const byNameStripped = new Map<string, StateMapData['constituencies'][number]>(
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
      const demo = resolvedAcNo != null ? data?.demographicsByAcNo[String(resolvedAcNo)] : undefined;
      const history = resolvedAcNo != null ? data?.historyByAcNo[String(resolvedAcNo)] ?? [] : [];
      const historyProps: Record<string, string> = {};
      for (const h of history) {
        historyProps[`WINNER_PARTY_${h.year}`] = h.party;
        historyProps[`WINNER_NAME_${h.year}`] = h.winner;
      }
      if (c?.electionYear && c.winnerParty) historyProps[`WINNER_PARTY_${c.electionYear}`] = c.winnerParty;
      if (c?.electionYear && c.winnerName) historyProps[`WINNER_NAME_${c.electionYear}`] = c.winnerName;

      const margin = c?.margin;
      let battleground: string | undefined;
      if (c && Number.isFinite(margin) && (c.winnerParty || c.winnerName)) {
        battleground = (margin! > 0 && margin! < 2000) ? 'critical'
          : (margin! >= 2000 && margin! < 5000) ? 'competitive' : 'safe';
      }
      let isSwing = false;
      const hasHistory = history.length > 0;
      if (hasHistory && c?.winnerParty) {
        const sortedHistory = [...history].sort((a, b) => b.year - a.year);
        const previousParty = sortedHistory[0]?.party;
        const normalizeParty = (party: string) => {
          const upper = party.toUpperCase();
          return upper === 'TRS' || upper === 'BRS' ? 'BRS' : upper;
        };
        if (previousParty && normalizeParty(previousParty) !== normalizeParty(c.winnerParty)) isSwing = true;
      }

      const properties: Record<string, unknown> = {
        ...feature.properties,
        ...(resolvedAcNo != null ? { AC_NO: resolvedAcNo } : {}),
        ...(c ? { CONSTITUENCY_ID: c.id, AC_NAME: c.name } : { AC_NAME: geoName }),
        ...(c?.winnerParty ? { WINNER_PARTY: c.winnerParty } : {}),
        ...(c?.winnerName ? { WINNER_NAME: c.winnerName } : {}),
        ...(c?.runnerUp ? { RUNNER_UP: c.runnerUp } : {}),
        ...(c ? { RESERVATION: c.type, DISTRICT: c.district || feature.properties?.DIST_NAME } : {}),
        ...(typeof margin === 'number' && (c?.winnerParty || c?.winnerName) ? { MARGIN: margin } : {}),
        ...(typeof demo?.population === 'number' ? { POPULATION: demo.population } : {}),
        ...(typeof demo?.literacy === 'number' ? { LITERACY: demo.literacy } : {}),
        ...(typeof demo?.turnout2023 === 'number' ? { TURNOUT: demo.turnout2023 } : {}),
        ...(typeof demo?.urbanPercent === 'number' ? { URBAN_PCT: demo.urbanPercent } : {}),
        ...(typeof demo?.totalVoters === 'number' ? { TOTAL_VOTERS: demo.totalVoters } : {}),
        ...(battleground ? { BATTLEGROUND: battleground } : {}),
        ...(c ? { IS_SWING: isSwing ? 'swing' : hasHistory ? 'retained' : 'unknown' } : {}),
        ...historyProps,
      };
      return { ...feature, properties };
    }),
  };
}

/**
 * Enrich the national India states GeoJSON.
 * Maps state name (ST_NM) to its StateInfo registry and colors by ruling party.
 */
export function enrichIndiaGeoJSON(
  geojson: GeoJSON.FeatureCollection,
): GeoJSON.FeatureCollection {
  // Normalize and map state names to state codes
  const nameToCode: Record<string, string> = {};
  for (const [code, info] of Object.entries(STATES)) {
    const key = info.name.toLowerCase().replace(/[^a-z]/g, '');
    nameToCode[key] = code;
  }
  // Custom manual mappings for variant spellings
  nameToCode['jammuandkashmir'] = 'JK';
  nameToCode['puducherry'] = 'PY';
  nameToCode['delhi'] = 'DL';
  nameToCode['nctofdelhi'] = 'DL';
  nameToCode['odisha'] = 'OD';
  nameToCode['orissa'] = 'OD';
  nameToCode['uttaranchal'] = 'UK';
  nameToCode['uttarakhand'] = 'UK';

  return {
    ...geojson,
    features: geojson.features.map((feature) => {
      const name = feature.properties?.ST_NM ?? '';
      const normName = name.toLowerCase().replace(/[^a-z]/g, '');
      const code = nameToCode[normName] ?? '';
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
