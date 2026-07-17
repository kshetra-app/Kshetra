/**
 * Administrative Hierarchy data-access layer.
 *
 * Surfaces the Booth → Gram Panchayat → Mandal → Constituency pilot seed data
 * (Telangana ACs 1–5, Andhra Pradesh ACs 1–3) to the UI with unified query
 * helpers. Bridges the two seeds' slightly different export names.
 *
 * Source seeds: data/seed/{telangana,andhra-pradesh}-hierarchy.ts
 */
import {
  TELANGANA_HIERARCHY_CONFIG,
  TELANGANA_DISTRICTS,
  TELANGANA_MANDALS,
  TELANGANA_PANCHAYATS,
  TELANGANA_BOOTHS,
  TELANGANA_MANDAL_AC_MAP,
  type StateHierarchyConfig,
  type District,
  type Mandal,
  type GramPanchayat,
  type PollingBooth,
  type MandalConstituencyOverlap,
} from '../../../data/seed/telangana-hierarchy';
import {
  ANDHRA_PRADESH_HIERARCHY_CONFIG,
  ANDHRA_PRADESH_DISTRICTS,
  ANDHRA_PRADESH_MANDALS,
  ANDHRA_PRADESH_GRAM_PANCHAYATS,
  ANDHRA_PRADESH_POLLING_BOOTHS,
  ANDHRA_PRADESH_MANDAL_OVERLAPS,
} from '../../../data/seed/andhra-pradesh-hierarchy';
import { STATES } from '@kshetra/shared';

export type {
  StateHierarchyConfig,
  District,
  Mandal,
  GramPanchayat,
  PollingBooth,
  MandalConstituencyOverlap,
};

interface StateHierarchyBundle {
  config: StateHierarchyConfig;
  districts: District[];
  mandals: Mandal[];
  panchayats: GramPanchayat[];
  booths: PollingBooth[];
  overlaps: MandalConstituencyOverlap[];
}

const BUNDLES: Record<string, StateHierarchyBundle> = {
  TS: {
    config: TELANGANA_HIERARCHY_CONFIG,
    districts: TELANGANA_DISTRICTS,
    mandals: TELANGANA_MANDALS,
    panchayats: TELANGANA_PANCHAYATS,
    booths: TELANGANA_BOOTHS,
    overlaps: TELANGANA_MANDAL_AC_MAP,
  },
  AP: {
    config: ANDHRA_PRADESH_HIERARCHY_CONFIG,
    districts: ANDHRA_PRADESH_DISTRICTS,
    mandals: ANDHRA_PRADESH_MANDALS,
    panchayats: ANDHRA_PRADESH_GRAM_PANCHAYATS,
    booths: ANDHRA_PRADESH_POLLING_BOOTHS,
    overlaps: ANDHRA_PRADESH_MANDAL_OVERLAPS,
  },
};

/**
 * Data-availability status for a constituency's hierarchy.
 * - `verified`     — backed by an official LGD/CEO pilot seed
 * - `data_pending` — the constituency exists but no verified drill-down data yet
 */
export type HierarchyDataStatus = 'verified' | 'data_pending';

function extractAcNoFromId(id: string): number | null {
  if (!id) return null;
  const match = id.match(/-(?:mandal|AC)-(\d+)/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

const bundle = (stateCode: string): StateHierarchyBundle | null =>
  BUNDLES[stateCode?.toUpperCase()] ?? null;

const constituencyId = (stateCode: string, acNo: number) =>
  `${stateCode.toUpperCase()}-AC-${acNo}`;

// ─── Historical 2017-ECI booth locations (TS + AP) ──────────────────────
// Real coordinates + booth names; booth numbers / voter counts are historical
// (see scripts/build-booth-locations-2017.mjs). Shape: { [state]: { [acNo]: [{n,name,lat,lng}] } }.
// Loaded via require (not import) so TypeScript does not infer a giant literal
// type from the ~58k-entry JSON, which would cripple type-checking performance.
type Raw2017Booth = { n: number; name: string; lat: number; lng: number };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const BOOTHS_2017_TYPED: Record<string, Record<string, Raw2017Booth[]>> =
  require('../../../data/seed/booth-locations-2017.json');

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/**
 * Real 2017-ECI polling-booth locations for a constituency. Coordinates and
 * booth names are genuine; booth numbers and voter counts are historical, so
 * `totalVoters` is 0 and `historical` is set (the UI labels these accordingly).
 */
function get2017Booths(stateCode: string, acNo: number): PollingBooth[] {
  const st = BOOTHS_2017_TYPED[stateCode?.toUpperCase()];
  const rows = st?.[String(acNo)];
  if (!rows || rows.length === 0) return [];
  const cid = constituencyId(stateCode, acNo);
  return rows.map((r) => ({
    id: `${cid}-B2017-${r.n}`,
    constituencyId: cid,
    panchayatId: null,
    boothNumber: r.n,
    nameEn: titleCase(r.name),
    location: { latitude: r.lat, longitude: r.lng },
    totalVoters: 0,
    isUrban: false,
    historical: true,
    sourceYear: 2017,
  }));
}

// ─── State-specific terminology for the generic (simulated) hierarchy ───
const STATE_TERMINOLOGY: Record<string, {
  mandalType: Mandal['mandalType'];
  panchayatType: GramPanchayat['panchayatType'];
  mandalLabel: string;
  panchayatLabel: string;
  sarpanchLabel: string;
}> = {
  TS: { mandalType: 'mandal', panchayatType: 'gram_panchayat', mandalLabel: 'Mandal', panchayatLabel: 'Gram Panchayat', sarpanchLabel: 'Sarpanch' },
  AP: { mandalType: 'mandal', panchayatType: 'gram_panchayat', mandalLabel: 'Mandal', panchayatLabel: 'Gram Panchayat', sarpanchLabel: 'Sarpanch' },
  KA: { mandalType: 'taluk', panchayatType: 'gram_panchayat', mandalLabel: 'Taluk', panchayatLabel: 'Gram Panchayat', sarpanchLabel: 'Adhyaksha' },
  TN: { mandalType: 'taluk', panchayatType: 'village_panchayat', mandalLabel: 'Taluk', panchayatLabel: 'Village Panchayat', sarpanchLabel: 'President' },
  MH: { mandalType: 'taluk', panchayatType: 'gram_panchayat', mandalLabel: 'Taluka', panchayatLabel: 'Gram Panchayat', sarpanchLabel: 'Sarpanch' },
  UP: { mandalType: 'tehsil', panchayatType: 'gram_panchayat', mandalLabel: 'Tehsil', panchayatLabel: 'Gram Panchayat', sarpanchLabel: 'Pradhan' },
  BR: { mandalType: 'block', panchayatType: 'gram_panchayat', mandalLabel: 'Block', panchayatLabel: 'Gram Panchayat', sarpanchLabel: 'Mukhiya' },
  WB: { mandalType: 'block', panchayatType: 'gram_panchayat', mandalLabel: 'Block', panchayatLabel: 'Gram Panchayat', sarpanchLabel: 'Pradhan' },
  GJ: { mandalType: 'taluk', panchayatType: 'gram_panchayat', mandalLabel: 'Taluka', panchayatLabel: 'Gram Panchayat', sarpanchLabel: 'Sarpanch' },
  RJ: { mandalType: 'tehsil', panchayatType: 'gram_panchayat', mandalLabel: 'Tehsil', panchayatLabel: 'Gram Panchayat', sarpanchLabel: 'Sarpanch' },
  MP: { mandalType: 'tehsil', panchayatType: 'gram_panchayat', mandalLabel: 'Tehsil', panchayatLabel: 'Gram Panchayat', sarpanchLabel: 'Sarpanch' },
  KL: { mandalType: 'block', panchayatType: 'gram_panchayat', mandalLabel: 'Block', panchayatLabel: 'Grama Panchayat', sarpanchLabel: 'President' },
};

const DEFAULT_TERMINOLOGY = {
  mandalType: 'block' as Mandal['mandalType'],
  panchayatType: 'gram_panchayat' as GramPanchayat['panchayatType'],
  mandalLabel: 'Block',
  panchayatLabel: 'Gram Panchayat',
  sarpanchLabel: 'Sarpanch',
};

function getTerminology(stateCode: string) {
  return STATE_TERMINOLOGY[stateCode.toUpperCase()] ?? DEFAULT_TERMINOLOGY;
}

/** A complete, type-valid generic config for states without an official seed. */
function buildGenericConfig(stateCode: string): StateHierarchyConfig {
  const upper = stateCode.toUpperCase();
  const term = getTerminology(upper);
  const stateName = (STATES as Record<string, { name?: string }>)[upper]?.name ?? upper;
  return {
    stateCode: upper,
    stateName,
    mandalType: term.mandalType,
    panchayatType: term.panchayatType,
    totalDistricts: 0,
    totalMandals: 0,
    totalGPs: 0,
    totalACs: 0,
    totalPCs: 0,
    estimatedBooths: 0,
    ceoUrl: '',
    secUrl: '',
    lgdStateCode: 0,
    localLanguage: '',
    localScript: '',
    displayLabels: {
      mandal: term.mandalLabel,
      panchayat: term.panchayatLabel,
      sarpanch: term.sarpanchLabel,
      booth: 'Polling Booth',
    },
  };
}

/**
 * ZERO-FABRICATION policy (migration 023 / plan Phase 2):
 * User-facing reads NEVER synthesize hierarchy or representative data. Only
 * constituencies covered by an official LGD/CEO pilot seed return drill-down
 * entities; every other constituency returns empty data + a `data_pending`
 * status so the UI can render an explicit, honest "Data pending" state.
 */
function getResolvedBundle(stateCode: string, acNo: number | null): StateHierarchyBundle | null {
  const official = bundle(stateCode);

  // Config / capability probe (no specific constituency): official seed only.
  if (acNo == null) {
    return official;
  }

  const cid = constituencyId(stateCode, acNo);

  // Only return official LGD/CEO seed data when it actually covers this AC.
  if (official) {
    const hasOfficial = official.overlaps.some((o) => o.constituencyId === cid) ||
                        official.booths.some((bo) => bo.constituencyId === cid);
    if (hasOfficial) return official;
  }

  // No verified data → caller renders "Data pending" (no simulation).
  return null;
}

/**
 * Honest data-availability status for a constituency's drill-down hierarchy.
 * `verified` only when an official pilot seed covers the AC; otherwise
 * `data_pending`. The National view ('IN') is treated as data_pending.
 */
export function getConstituencyDataStatus(stateCode: string, acNo: number): HierarchyDataStatus {
  return getResolvedBundle(stateCode, acNo) ? 'verified' : 'data_pending';
}

/**
 * A label-only config for a state without an official seed, so the
 * "Data pending" UI can still show the correct regional terminology
 * (Mandal / Block / Taluk, Sarpanch / Pradhan, …) without any fake entities.
 */
export function getHierarchyLabelsConfig(stateCode: string): StateHierarchyConfig {
  return bundle(stateCode)?.config ?? buildGenericConfig(stateCode);
}

/** The state config (terminology labels, totals) — null if no hierarchy data. */
export function getHierarchyConfig(stateCode: string): StateHierarchyConfig | null {
  return getResolvedBundle(stateCode, null)?.config ?? null;
}

/** States that currently have any pilot hierarchy data. */
export function getHierarchyStates(): string[] {
  return Object.keys(BUNDLES);
}

/** Whether a specific constituency has drill-down hierarchy data available. */
export function hasHierarchyData(stateCode: string, acNo: number): boolean {
  const b = getResolvedBundle(stateCode, acNo);
  return b !== null;
}

export interface MandalWithOverlap extends Mandal {
  overlapPercentage: number;
  overlapPopulation?: number;
  verified: boolean;
}

/** Mandals that overlap a constituency (with the overlap %). */
export function getMandalsForConstituency(stateCode: string, acNo: number): MandalWithOverlap[] {
  const b = getResolvedBundle(stateCode, acNo);
  if (!b) return [];
  const cid = constituencyId(stateCode, acNo);
  const out: MandalWithOverlap[] = [];
  for (const o of b.overlaps) {
    if (o.constituencyId !== cid) continue;
    const m = b.mandals.find((mm) => mm.id === o.mandalId);
    if (m) out.push({ ...m, overlapPercentage: o.overlapPercentage, overlapPopulation: o.overlapPopulation, verified: o.verified });
  }
  return out.sort((a, b2) => b2.overlapPercentage - a.overlapPercentage);
}

/** Gram panchayats within a mandal. */
export function getPanchayatsForMandal(stateCode: string, mandalId: string): GramPanchayat[] {
  const acNo = extractAcNoFromId(mandalId);
  const b = getResolvedBundle(stateCode, acNo);
  if (!b) return [];
  return b.panchayats.filter((p) => p.mandalId === mandalId);
}

/** Booths within a panchayat. */
export function getBoothsForPanchayat(stateCode: string, panchayatId: string): PollingBooth[] {
  const acNo = extractAcNoFromId(panchayatId);
  const b = getResolvedBundle(stateCode, acNo);
  if (!b) return [];
  return b.booths.filter((bo) => bo.panchayatId === panchayatId).sort((a, b2) => a.boothNumber - b2.boothNumber);
}

/**
 * All booths in a constituency. Prefers the richer official pilot seed where it
 * exists; otherwise falls back to the real 2017-ECI historical locations so the
 * map can plot booths statewide across TS + AP.
 */
export function getBoothsForConstituency(stateCode: string, acNo: number): PollingBooth[] {
  const b = getResolvedBundle(stateCode, acNo);
  if (b) {
    const cid = constituencyId(stateCode, acNo);
    const official = b.booths
      .filter((bo) => bo.constituencyId === cid)
      .sort((a, b2) => a.boothNumber - b2.boothNumber);
    if (official.length > 0) return official;
  }
  return get2017Booths(stateCode, acNo);
}

/** Whether a constituency has ANY booth data to plot (official pilot or 2017 historical). */
export function hasBoothData(stateCode: string, acNo: number): boolean {
  const b = getResolvedBundle(stateCode, acNo);
  const cid = constituencyId(stateCode, acNo);
  if (b && b.booths.some((bo) => bo.constituencyId === cid)) return true;
  const st = BOOTHS_2017_TYPED[stateCode?.toUpperCase()];
  return !!(st && st[String(acNo)]?.length);
}

export interface ConstituencyHierarchySummary {
  config: StateHierarchyConfig;
  mandalCount: number;
  panchayatCount: number;
  boothCount: number;
  sampleVoters: number;
}

/** Rollup counts for the constituency's drill-down landing view. */
export function getConstituencyHierarchySummary(stateCode: string, acNo: number): ConstituencyHierarchySummary | null {
  const b = getResolvedBundle(stateCode, acNo);
  if (!b) return null;
  const mandals = getMandalsForConstituency(stateCode, acNo);
  const mandalIds = new Set(mandals.map((m) => m.id));
  const panchayats = b.panchayats.filter((p) => mandalIds.has(p.mandalId));
  const booths = getBoothsForConstituency(stateCode, acNo);
  return {
    config: b.config,
    mandalCount: mandals.length,
    panchayatCount: panchayats.length,
    boothCount: booths.length,
    sampleVoters: booths.reduce((s, bo) => s + (bo.totalVoters || 0), 0),
  };
}
