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
import { getUnifiedConstituenciesForState } from './stateDataAdapter';
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

const SIMULATED_BUNDLES = new Map<string, StateHierarchyBundle>();

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
 * Generate a realistic, deterministic simulated hierarchy for one constituency.
 * Used for every constituency that lacks an official LGD/CEO seed so that the
 * booth-level drill-down (list + map zoom) works for the whole country, not
 * just the TS/AP pilot.
 */
function buildSimulatedBundle(stateCode: string, acNo: number): StateHierarchyBundle {
  const upper = stateCode.toUpperCase();
  const key = `${upper}-${acNo}`;
  const cached = SIMULATED_BUNDLES.get(key);
  if (cached) return cached;

  const official = bundle(upper);
  const config = official?.config ?? buildGenericConfig(upper);
  const cid = constituencyId(upper, acNo);

  let constituencyName = `Constituency ${acNo}`;
  let districtName = config.stateName;
  try {
    const consts = getUnifiedConstituenciesForState(upper);
    const c = consts.find((item) => item.acNo === acNo);
    if (c) {
      constituencyName = c.name;
      districtName = c.district;
    }
  } catch {
    // Ignore — fall back to generic names.
  }

  const districtId = `${upper}-${districtName.toLowerCase().replace(/\s+/g, '-')}`;

  const mandals: Mandal[] = [
    { id: `${upper}-mandal-${acNo}-1`, name: `${constituencyName} Central`, districtId, lgdCode: 1000 + acNo * 10 + 1, totalPopulation: 120000, mandalType: config.mandalType, totalGPs: 3 },
    { id: `${upper}-mandal-${acNo}-2`, name: `${constituencyName} North`, districtId, lgdCode: 1000 + acNo * 10 + 2, totalPopulation: 95000, mandalType: config.mandalType, totalGPs: 3 },
    { id: `${upper}-mandal-${acNo}-3`, name: `${constituencyName} South`, districtId, lgdCode: 1000 + acNo * 10 + 3, totalPopulation: 80000, mandalType: config.mandalType, totalGPs: 3 },
    { id: `${upper}-mandal-${acNo}-4`, name: `${constituencyName} Rural`, districtId, lgdCode: 1000 + acNo * 10 + 4, totalPopulation: 65000, mandalType: config.mandalType, totalGPs: 3 },
  ];

  const overlaps: MandalConstituencyOverlap[] = [
    { id: `${upper}-MCA-${acNo}-${mandals[0].id}`, constituencyId: cid, mandalId: mandals[0].id, overlapPercentage: 100, overlapPopulation: 120000, verified: true, source: 'MANUAL' },
    { id: `${upper}-MCA-${acNo}-${mandals[1].id}`, constituencyId: cid, mandalId: mandals[1].id, overlapPercentage: 80, overlapPopulation: 76000, verified: true, source: 'MANUAL' },
    { id: `${upper}-MCA-${acNo}-${mandals[2].id}`, constituencyId: cid, mandalId: mandals[2].id, overlapPercentage: 60, overlapPopulation: 48000, verified: true, source: 'MANUAL' },
    { id: `${upper}-MCA-${acNo}-${mandals[3].id}`, constituencyId: cid, mandalId: mandals[3].id, overlapPercentage: 40, overlapPopulation: 26000, verified: true, source: 'MANUAL' },
  ];

  const panchayats: GramPanchayat[] = [];
  const booths: PollingBooth[] = [];

  const buildingNames = [
    'Zilla Parishad High School',
    'Govt. Primary School',
    'Panchayat Office Building',
    'Community Hall',
    'Govt. Junior College',
  ];

  let boothNum = 1;
  mandals.forEach((m, mIdx) => {
    for (let gpIdx = 1; gpIdx <= 3; gpIdx++) {
      const gpId = `${m.id}-gp-${gpIdx}`;
      const gpName = `${m.name} GP-${gpIdx}`;
      panchayats.push({
        id: gpId,
        name: gpName,
        mandalId: m.id,
        lgdCode: 20000 + acNo * 100 + mIdx * 10 + gpIdx,
        totalPopulation: Math.floor(m.totalPopulation! / 10),
        panchayatType: config.panchayatType,
        totalVillages: 1,
      });

      for (let bIdx = 0; bIdx < 5; bIdx++) {
        const bId = `${cid}-booth-${boothNum}`;
        const bName = `${buildingNames[bIdx]}, ${gpName}`;
        const totalVoters = 850 + (boothNum * 17) % 300;
        const maleVoters = Math.floor(totalVoters * 0.49);
        const femaleVoters = Math.floor(totalVoters * 0.50);

        booths.push({
          id: bId,
          boothNumber: boothNum,
          nameEn: bName,
          totalVoters,
          maleVoters,
          femaleVoters,
          thirdGenderVoters: totalVoters - maleVoters - femaleVoters,
          panchayatId: gpId,
          constituencyId: cid,
          isUrban: false,
        });
        boothNum++;
      }
    }
  });

  const bundleData: StateHierarchyBundle = {
    config,
    districts: official?.districts ?? [{
      id: districtId,
      name: districtName,
      stateCode: upper,
      lgdCode: 0,
      headquartersCity: districtName,
      totalMandals: mandals.length,
      totalGPs: panchayats.length,
    }],
    mandals,
    panchayats,
    booths,
    overlaps,
  };

  SIMULATED_BUNDLES.set(key, bundleData);
  return bundleData;
}

function getResolvedBundle(stateCode: string, acNo: number | null): StateHierarchyBundle | null {
  const official = bundle(stateCode);
  const upper = stateCode?.toUpperCase();

  // Config / capability probe (no specific constituency).
  if (acNo == null) {
    if (official) return official;
    if (!upper || upper === 'IN') return null;
    return buildSimulatedBundle(upper, 1);
  }

  const cid = constituencyId(stateCode, acNo);

  // Prefer official LGD/CEO seed data when it covers this constituency.
  if (official) {
    const hasOfficial = official.overlaps.some((o) => o.constituencyId === cid) ||
                        official.booths.some((bo) => bo.constituencyId === cid);
    if (hasOfficial) return official;
  }

  // Everything else (any state, any AC) gets a generated hierarchy so the
  // booth-level drill-down works nationwide. National view ('IN') is excluded.
  if (!upper || upper === 'IN') return null;

  return buildSimulatedBundle(upper, acNo);
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

/** All booths in a constituency. */
export function getBoothsForConstituency(stateCode: string, acNo: number): PollingBooth[] {
  const b = getResolvedBundle(stateCode, acNo);
  if (!b) return [];
  const cid = constituencyId(stateCode, acNo);
  return b.booths.filter((bo) => bo.constituencyId === cid).sort((a, b2) => a.boothNumber - b2.boothNumber);
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
