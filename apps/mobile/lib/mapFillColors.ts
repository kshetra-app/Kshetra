import { PARTY_COLORS } from '@/lib/constants';

/**
 * MapLibre/Mapbox fill-color expressions for the constituency map.
 * Extracted verbatim from app/(tabs)/index.tsx — values unchanged.
 */

/** Color each polygon by WINNER_PARTY.
 *  Built dynamically from PARTY_COLORS so all 31-state parties get their colour. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const partyFillColor: any = [
  'match',
  ['get', 'WINNER_PARTY'],
  // Generate from PARTY_COLORS (includes BJP, INC, BRS, TDP, AAP, DMK, AITC, SP, BSP,
  // JDU, RJD, JMM, JKNC, NPP, ZPM, NDPP, SKM, SHSUBT, NCPSP, NCP, SHS, etc.)
  ...Object.entries(PARTY_COLORS).flatMap(([code, color]) => [code, color]),
  // Additional regional parties not in shared PARTY_CONFIG
  'AIADMK', '#006400',
  'IUML', '#009900',
  'KCM', '#FFD700',
  'VCK', '#8B0000',
  'PMK', '#FFCC00',
  'RLD', '#228B22',
  'AD(S)', '#FF69B4',
  'ISF', '#00CED1',
  'GFP', '#FF4500',
  'MG', '#800080',
  'IPFT', '#FF1493',
  'MNF', '#4169E1',
  'NPF', '#DAA520',
  'SDF', '#FF6347',
  'UDP', '#8B4513',
  'HSPDP', '#2F4F4F',
  'TMC(M)', '#20C646',
  // 2026 election parties
  'CPI(M)', '#CC0000',
  'AMMK', '#FF4500',
  'NMK', '#FFD700',
  'INL', '#006600',
  'KC', '#228B22',
  'KC(M)', '#2E8B57',
  'RSP', '#CC0000',
  'RMPI', '#8B0000',
  'JKC', '#FF6347',
  'RD', '#9932CC',
  'LJK(', '#FF69B4',
  'AJU', '#FF8C00',
  '#808080', // fallback — IND / others
];

/** Color by winning margin (heatmap) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const marginFillColor: any = [
  'interpolate',
  ['linear'],
  ['get', 'MARGIN'],
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
  ['get', 'POPULATION'],
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
  ['get', 'LITERACY'],
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
  ['get', 'TURNOUT'],
  60,  '#EF4444',   // red — low turnout
  68,  '#F59E0B',   // amber
  72,  '#FBBF24',   // yellow
  76,  '#10B981',   // green
  82,  '#059669',   // dark green — high turnout
];
