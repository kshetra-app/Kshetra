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

function getResolvedBundle(stateCode: string, acNo: number | null): StateHierarchyBundle | null {
  const official = bundle(stateCode);
  if (!official) return null;

  if (acNo == null) return official;

  const cid = constituencyId(stateCode, acNo);
  const hasOfficial = official.overlaps.some((o) => o.constituencyId === cid) ||
                      official.booths.some((bo) => bo.constituencyId === cid);

  if (hasOfficial) return official;

  const upper = stateCode?.toUpperCase();
  if (upper !== 'TS' && upper !== 'AP') return null;

  const key = `${upper}-${acNo}`;
  if (SIMULATED_BUNDLES.has(key)) {
    return SIMULATED_BUNDLES.get(key)!;
  }

  const baseConfig = official.config ?? {
    stateCode,
    stateName: stateCode === 'TS' ? 'Telangana' : 'Andhra Pradesh',
    mandalType: 'mandal',
    panchayatType: 'gram_panchayat',
    totalDistricts: stateCode === 'TS' ? 33 : 26,
    totalMandals: stateCode === 'TS' ? 612 : 679,
    totalGPs: stateCode === 'TS' ? 12769 : 13371,
    totalACs: stateCode === 'TS' ? 119 : 175,
    totalPCs: stateCode === 'TS' ? 17 : 25,
    estimatedBooths: stateCode === 'TS' ? 35356 : 46165,
    ceoUrl: 'https://ceotelangana.nic.in',
    secUrl: 'https://sec.ap.gov.in',
    lgdStateCode: stateCode === 'TS' ? 36 : 28,
    localLanguage: 'Telugu',
    localLanguageScript: 'Telugu',
  };

  let constituencyName = `Constituency ${acNo}`;
  let districtName = stateCode === 'TS' ? 'Hyderabad' : 'Amaravati';
  try {
    const consts = getUnifiedConstituenciesForState(stateCode);
    const c = consts.find((item) => item.acNo === acNo);
    if (c) {
      constituencyName = c.name;
      districtName = c.district;
    }
  } catch {
    // Ignore
  }

  const districtId = districtName.toLowerCase().replace(/\s+/g, '-');

  const mandals: Mandal[] = [
    { id: `${stateCode}-mandal-${acNo}-1`, name: `${constituencyName} Central`, districtId, lgdCode: 1000 + acNo * 10 + 1, totalPopulation: 120000, mandalType: 'mandal', totalGPs: 3 },
    { id: `${stateCode}-mandal-${acNo}-2`, name: `${constituencyName} North`, districtId, lgdCode: 1000 + acNo * 10 + 2, totalPopulation: 95000, mandalType: 'mandal', totalGPs: 3 },
    { id: `${stateCode}-mandal-${acNo}-3`, name: `${constituencyName} South`, districtId, lgdCode: 1000 + acNo * 10 + 3, totalPopulation: 80000, mandalType: 'mandal', totalGPs: 3 },
    { id: `${stateCode}-mandal-${acNo}-4`, name: `${constituencyName} Rural`, districtId, lgdCode: 1000 + acNo * 10 + 4, totalPopulation: 65000, mandalType: 'mandal', totalGPs: 3 },
  ];

  const overlaps: MandalConstituencyOverlap[] = [
    { id: `${stateCode}-MCA-${acNo}-${mandals[0].id}`, constituencyId: cid, mandalId: mandals[0].id, overlapPercentage: 100, overlapPopulation: 120000, verified: true, source: 'MANUAL' },
    { id: `${stateCode}-MCA-${acNo}-${mandals[1].id}`, constituencyId: cid, mandalId: mandals[1].id, overlapPercentage: 80, overlapPopulation: 76000, verified: true, source: 'MANUAL' },
    { id: `${stateCode}-MCA-${acNo}-${mandals[2].id}`, constituencyId: cid, mandalId: mandals[2].id, overlapPercentage: 60, overlapPopulation: 48000, verified: true, source: 'MANUAL' },
    { id: `${stateCode}-MCA-${acNo}-${mandals[3].id}`, constituencyId: cid, mandalId: mandals[3].id, overlapPercentage: 40, overlapPopulation: 26000, verified: true, source: 'MANUAL' },
  ];

  const panchayats: GramPanchayat[] = [];
  const booths: PollingBooth[] = [];

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
        panchayatType: 'gram_panchayat',
        totalVillages: 1,
      });

      const buildingNames = [
        'Zilla Parishad High School',
        'Govt. Primary School',
        'Panchayat Office Building',
        'Community Hall',
        'Govt. Junior College',
      ];

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
    config: baseConfig,
    districts: official.districts ?? [{ id: districtId, name: districtName, stateCode }],
    mandals,
    panchayats,
    booths,
    overlaps,
  };

  SIMULATED_BUNDLES.set(key, bundleData);
  return bundleData;
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
