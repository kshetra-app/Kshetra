import { PARTY_COLORS } from './constants';

/**
 * MapLibre/Mapbox fill-color expressions for the constituency map.
 * Extracted verbatim from app/(tabs)/index.tsx — values unchanged.
 */

/**
 * Extra regional party colours that may not be present in the shared
 * PARTY_CONFIG. These are MERGED with PARTY_COLORS below — PARTY_COLORS always
 * wins so a code is never coloured twice.
 */
const EXTRA_PARTY_COLORS: Record<string, string> = {
  AIADMK: '#006400',
  IUML: '#009900',
  KCM: '#FFD700',
  VCK: '#8B0000',
  PMK: '#FFCC00',
  RLD: '#228B22',
  'AD(S)': '#FF69B4',
  ISF: '#00CED1',
  GFP: '#FF4500',
  MG: '#800080',
  IPFT: '#FF1493',
  MNF: '#4169E1',
  NPF: '#DAA520',
  SDF: '#FF6347',
  UDP: '#8B4513',
  HSPDP: '#2F4F4F',
  'TMC(M)': '#20C646',
  'CPI(M)': '#CC0000',
  AMMK: '#FF4500',
  NMK: '#FFD700',
  INL: '#006600',
  KC: '#228B22',
  'KC(M)': '#2E8B57',
  RSP: '#CC0000',
  RMPI: '#8B0000',
  JKC: '#FF6347',
  RD: '#9932CC',
  AJU: '#FF8C00',
};

/**
 * Merged party → colour map. Object keys are inherently unique, so spreading
 * EXTRA first and PARTY_COLORS second guarantees:
 *   1. No duplicate party code (PARTY_COLORS overrides any shared EXTRA code).
 *   2. A single, valid set of labels for the MapLibre `match` expression.
 *
 * A duplicate label in a `match` expression is a fatal parse error that makes
 * the whole fillColor invalid — which previously caused EVERY state's polygons
 * to render with no party colour.
 */
const MERGED_PARTY_COLORS: Record<string, string> = {
  ...EXTRA_PARTY_COLORS,
  ...PARTY_COLORS,
};

/** Color each polygon by WINNER_PARTY.
 *  Built dynamically from the de-duplicated merged colour map. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const partyFillColor: any = [
  'match',
  ['get', 'WINNER_PARTY'],
  ...Object.entries(MERGED_PARTY_COLORS).flatMap(([code, color]) => [code, color]),
  '#808080', // fallback — IND / others
];

/** Color by winning margin (heatmap) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const marginFillColor: any = [
  'interpolate',
  ['linear'],
  ['coalesce', ['get', 'MARGIN'], 0],
  0,    '#EF4444',   // red  = razor thin
  5000, '#F59E0B',   // amber = competitive
  20000, '#10B981',  // green = comfortable
  50000, '#3B82F6',  // blue  = landslide
  100000, '#8B5CF6', // purple = massive
];

/** Color by reservation type */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const reservationFillColor: any = [
  'match',
  ['get', 'RESERVATION'],
  'GEN', '#6366F1',  // indigo
  'SC',  '#F59E0B',  // amber
  'ST',  '#10B981',  // emerald
  '#6B7280',         // fallback
];

/** Color by population density */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const populationFillColor: any = [
  'interpolate',
  ['linear'],
  ['coalesce', ['get', 'POPULATION'], 0],
  200000, '#DBEAFE',   // light blue — sparse
  250000, '#60A5FA',   // blue
  280000, '#3B82F6',   // medium
  310000, '#2563EB',   // dense
  350000, '#1D4ED8',   // very dense
];

/** Color by literacy rate */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const literacyFillColor: any = [
  'interpolate',
  ['linear'],
  ['coalesce', ['get', 'LITERACY'], 0],
  40,  '#EF4444',   // red — very low
  50,  '#F59E0B',   // amber — low
  60,  '#FBBF24',   // yellow — moderate
  70,  '#10B981',   // green — good
  80,  '#059669',   // dark green — high
];

/** Color by voter turnout */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const turnoutFillColor: any = [
  'interpolate',
  ['linear'],
  ['coalesce', ['get', 'TURNOUT'], 0],
  60,  '#EF4444',   // red — low turnout
  68,  '#F59E0B',   // amber
  72,  '#FBBF24',   // yellow
  76,  '#10B981',   // green
  82,  '#059669',   // dark green — high turnout
];

/** Color by battleground status */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const battlegroundFillColor: any = [
  'match',
  ['get', 'BATTLEGROUND'],
  'critical', '#DC2626',
  'competitive', '#F59E0B',
  'safe', '#10B981',
  '#9CA3AF',
];

/** Color by swing status */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const swingFillColor: any = [
  'match',
  ['get', 'IS_SWING'],
  'swing', '#8B5CF6',
  'retained', '#10B981',
  'unknown', '#9CA3AF',
  '#9CA3AF',
];

/** Get dynamic party fill color expression based on selected year */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPartyFillColorExpression(year?: number, isIndia?: boolean): any {
  const propertyName = (year && !isIndia) ? `WINNER_PARTY_${year}` : 'WINNER_PARTY';
  return [
    'match',
    ['get', propertyName],
    ...Object.entries(MERGED_PARTY_COLORS).flatMap(([code, color]) => [code, color]),
    '#808080', // fallback — IND / others
  ];
}

/** Get extrusion height expression based on selected color mode */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getExtrusionHeightExpression(mode: string, isIndia?: boolean): any {
  if (isIndia) {
    return ['+', 8000, ['*', ['coalesce', ['get', 'ASSEMBLY_SEATS'], 40], 250]];
  }
  if (mode === 'population') {
    return ['+', 6000, ['*', ['coalesce', ['get', 'POPULATION'], 100000], 0.08]];
  }
  if (mode === 'margin') {
    return ['+', 6000, ['*', ['coalesce', ['get', 'MARGIN'], 5000], 0.5]];
  }
  if (mode === 'turnout') {
    return ['*', ['coalesce', ['get', 'TURNOUT'], 50], 200];
  }
  if (mode === 'literacy') {
    return ['*', ['coalesce', ['get', 'LITERACY'], 50], 200];
  }
  // Default party / general mode: dynamic height by margin/votes
  return ['+', 8000, ['*', ['coalesce', ['get', 'MARGIN'], 8000], 0.35]];
}


