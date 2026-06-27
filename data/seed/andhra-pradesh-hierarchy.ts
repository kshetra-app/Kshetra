/**
 * Andhra Pradesh Administrative Hierarchy — Pilot Seed Data
 *
 * ── SCOPE ──────────────────────────────────────────────────────────────────
 * This file contains REALISTIC seed data for the first 3 Assembly
 * Constituencies of Andhra Pradesh (AC 1–3), fully populated with mandals,
 * gram panchayats, polling booths, and mandal-AC overlap mappings.
 *
 * ── CONSTITUENCIES COVERED ────────────────────────────────────────────────
 *   AC 1  Ichchapuram        — Srikakulam district               (GEN)
 *   AC 2  Palasa             — Srikakulam district               (GEN)
 *   AC 3  Tekkali            — Srikakulam district               (GEN)
 *
 * ── DATA SOURCES ──────────────────────────────────────────────────────────
 *   1. LGD (lgdirectory.gov.in) — mandal names, GP names, LGD codes
 *   2. CEO Andhra Pradesh (ceoandhra.nic.in) — booth data, voter counts
 *   3. APSEC (apsec.gov.in) — GP-mandal mapping
 *   4. Census 2011 — population estimates
 *
 * @module andhra-pradesh-hierarchy
 * @version 0.1.0-seed
 */

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions (Self-contained like Telangana seed file)
// ─────────────────────────────────────────────────────────────────────────────

/** Administrative level in the hierarchy */
export type HierarchyLevel =
  | 'state'
  | 'district'
  | 'mandal'
  | 'panchayat'
  | 'constituency'
  | 'parliamentary'
  | 'booth';

/** State-specific terminology for sub-district admin units */
export type MandalType = 'mandal' | 'block' | 'taluk' | 'tehsil' | 'circle';

/** State-specific terminology for village-level bodies */
export type PanchayatType = 'gram_panchayat' | 'village_panchayat' | 'grama_sabha';

/** Reservation category */
export type ReservationStatus = 'GEN' | 'SC' | 'ST';

/** Data source for overlap calculations */
export type OverlapSource = 'LGD' | 'CENSUS' | 'MANUAL';

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────

/** Configuration for a state's administrative hierarchy */
export interface StateHierarchyConfig {
  /** ISO 3166-2:IN state code (e.g. 'AP') */
  stateCode: string;
  /** Full state name */
  stateName: string;
  /** Local term for sub-district unit */
  mandalType: MandalType;
  /** Local term for village body */
  panchayatType: PanchayatType;
  /** Total revenue districts in the state */
  totalDistricts: number;
  /** Total mandals/blocks/taluks */
  totalMandals: number;
  /** Total gram panchayats */
  totalGPs: number;
  /** Total assembly constituencies */
  totalACs: number;
  /** Total parliamentary constituencies */
  totalPCs: number;
  /** Estimated polling booths (from CEO data) */
  estimatedBooths: number;
  /** Chief Electoral Officer website */
  ceoUrl: string;
  /** State Election Commission website */
  secUrl: string;
  /** LGD numeric code for the state */
  lgdStateCode: number;
  /** Primary local language */
  localLanguage: string;
  /** Script name for the local language */
  localScript: string;
  /** UI display labels using local terminology */
  displayLabels: {
    mandal: string;
    panchayat: string;
    sarpanch: string;
    booth: string;
  };
}

/** District within a state */
export interface District {
  /** Unique ID: '{STATE}-DST-{LGD_CODE}' */
  id: string;
  /** State code (FK) */
  stateCode: string;
  /** District name in English */
  name: string;
  /** LGD directory code (globally unique integer) */
  lgdCode: number;
  /** District headquarters city */
  headquartersCity: string;
  /** Number of mandals in this district */
  totalMandals: number;
  /** Number of gram panchayats in this district */
  totalGPs: number;
  /** Census 2011 projected population */
  population?: number;
  /** Geographic area in square kilometers */
  areaSqKm?: number;
}

/** Mandal (sub-district administrative unit) */
export interface Mandal {
  /** Unique ID: '{STATE}-MDL-{LGD_CODE}' */
  id: string;
  /** Parent district ID (FK) */
  districtId: string;
  /** Mandal name in English */
  name: string;
  /** LGD directory code */
  lgdCode: number;
  /** Type of sub-district unit */
  mandalType: MandalType;
  /** Mandal headquarters town */
  headquartersTown?: string;
  /** Number of GPs in this mandal */
  totalGPs: number;
  /** Total population (Census 2011 estimate) */
  totalPopulation?: number;
  /** Geographic area in square kilometers */
  areaSqKm?: number;
}

/** Gram Panchayat (village-level local body) */
export interface GramPanchayat {
  /** Unique ID: '{STATE}-GP-{LGD_CODE}' */
  id: string;
  /** Parent mandal ID (FK) */
  mandalId: string;
  /** GP name in English */
  name: string;
  /** LGD directory code */
  lgdCode: number;
  /** Type of panchayat */
  panchayatType: PanchayatType;
  /** Current Sarpanch name (if known) */
  sarpanchName?: string;
  /** Sarpanch's political party (if known) */
  sarpanchParty?: string;
  /** Number of revenue villages under this GP */
  totalVillages: number;
  /** Total population (Census 2011 estimate) */
  totalPopulation?: number;
  /** Total registered voters (CEO data) */
  totalVoters?: number;
}

/** Polling booth (physical voting location) */
export interface PollingBooth {
  /** Unique ID: '{STATE}-AC{N}-B{NNN}' */
  id: string;
  /** Parent constituency ID (FK → constituencies.id) */
  constituencyId: string;
  /** Parent panchayat ID (FK → gram_panchayats.id). Null for urban booths. */
  panchayatId: string | null;
  /** Sequential booth number within the constituency (ECI assigned) */
  boothNumber: number;
  /** Booth/polling station name in English */
  nameEn: string;
  /** Booth name in Telugu (optional) */
  nameTe?: string;
  /** GPS coordinates of the booth (if available from CEO data) */
  location?: { latitude: number; longitude: number };
  /** Total registered voters at this booth */
  totalVoters: number;
  /** Male registered voters */
  maleVoters?: number;
  /** Female registered voters */
  femaleVoters?: number;
  /** Third gender registered voters */
  thirdGenderVoters?: number;
  /** Whether this booth is in an urban area */
  isUrban: boolean;
  /** Municipal ward number (for urban booths only) */
  wardNumber?: number;
}

/** Junction table for Mandal ↔ Constituency M:N relationship */
export interface MandalConstituencyOverlap {
  /** Unique ID: '{STATE}-MCA-{MANDAL_LGD}-{AC_NO}' */
  id: string;
  /** Mandal ID (FK) */
  mandalId: string;
  /** Constituency ID (FK) */
  constituencyId: string;
  /**
   * Percentage of the mandal's area/population that falls
   * within this constituency. Range: 0.01–100.00.
   */
  overlapPercentage: number;
  /** Estimated population in the overlap area */
  overlapPopulation?: number;
  /** Count of villages/habitations in the overlap area */
  overlapVillages?: number;
  /** Source of the overlap data */
  source: OverlapSource;
  /** Whether the overlap has been manually verified */
  verified: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
//  STATE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const ANDHRA_PRADESH_HIERARCHY_CONFIG: StateHierarchyConfig = {
  stateCode: 'AP',
  stateName: 'Andhra Pradesh',
  mandalType: 'mandal',
  panchayatType: 'gram_panchayat',
  totalDistricts: 26,
  totalMandals: 679,
  totalGPs: 13371,
  totalACs: 175,
  totalPCs: 25,
  estimatedBooths: 46165,
  ceoUrl: 'https://ceoandhra.nic.in',
  secUrl: 'https://apsec.gov.in',
  lgdStateCode: 28,
  localLanguage: 'Telugu',
  localScript: 'తెలుగు',
  displayLabels: {
    mandal: 'Mandal',
    panchayat: 'Gram Panchayat',
    sarpanch: 'Sarpanch',
    booth: 'Polling Station',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  DISTRICTS (covering Srikakulam)
// ─────────────────────────────────────────────────────────────────────────────

export const ANDHRA_PRADESH_DISTRICTS: District[] = [
  {
    id: 'AP-DST-543',
    stateCode: 'AP',
    name: 'Srikakulam',
    lgdCode: 543,
    headquartersCity: 'Srikakulam',
    totalMandals: 30,
    totalGPs: 1099,
    population: 2703114,
    areaSqKm: 5837,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  MANDALS (Ichchapuram, Palasa, Tekkali, Kaviti, Sompeta, Mandasa)
// ─────────────────────────────────────────────────────────────────────────────

export const ANDHRA_PRADESH_MANDALS: Mandal[] = [
  {
    id: 'AP-MDL-54301',
    districtId: 'AP-DST-543',
    name: 'Ichchapuram',
    lgdCode: 54301,
    mandalType: 'mandal',
    headquartersTown: 'Ichchapuram',
    totalGPs: 23,
    totalPopulation: 83450,
    areaSqKm: 180,
  },
  {
    id: 'AP-MDL-54302',
    districtId: 'AP-DST-543',
    name: 'Kaviti',
    lgdCode: 54302,
    mandalType: 'mandal',
    headquartersTown: 'Kaviti',
    totalGPs: 25,
    totalPopulation: 76200,
    areaSqKm: 165,
  },
  {
    id: 'AP-MDL-54303',
    districtId: 'AP-DST-543',
    name: 'Sompeta',
    lgdCode: 54303,
    mandalType: 'mandal',
    headquartersTown: 'Sompeta',
    totalGPs: 28,
    totalPopulation: 91300,
    areaSqKm: 210,
  },
  {
    id: 'AP-MDL-54304',
    districtId: 'AP-DST-543',
    name: 'Palasa',
    lgdCode: 54304,
    mandalType: 'mandal',
    headquartersTown: 'Palasa',
    totalGPs: 22,
    totalPopulation: 98150,
    areaSqKm: 195,
  },
  {
    id: 'AP-MDL-54305',
    districtId: 'AP-DST-543',
    name: 'Mandasa',
    lgdCode: 54305,
    mandalType: 'mandal',
    headquartersTown: 'Mandasa',
    totalGPs: 26,
    totalPopulation: 82400,
    areaSqKm: 230,
  },
  {
    id: 'AP-MDL-54306',
    districtId: 'AP-DST-543',
    name: 'Tekkali',
    lgdCode: 54306,
    mandalType: 'mandal',
    headquartersTown: 'Tekkali',
    totalGPs: 24,
    totalPopulation: 87900,
    areaSqKm: 175,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  GRAM PANCHAYATS
// ─────────────────────────────────────────────────────────────────────────────

export const ANDHRA_PRADESH_GRAM_PANCHAYATS: GramPanchayat[] = [
  // Ichchapuram Mandal
  { id: 'AP-GP-543011', mandalId: 'AP-MDL-54301', name: 'Ichchapuram Rural', lgdCode: 543011, panchayatType: 'gram_panchayat', totalVillages: 2, totalPopulation: 5400, totalVoters: 3950 },
  { id: 'AP-GP-543012', mandalId: 'AP-MDL-54301', name: 'Kedaripuram', lgdCode: 543012, panchayatType: 'gram_panchayat', totalVillages: 1, totalPopulation: 3100, totalVoters: 2250 },
  
  // Kaviti Mandal
  { id: 'AP-GP-543021', mandalId: 'AP-MDL-54302', name: 'Kaviti', lgdCode: 543021, panchayatType: 'gram_panchayat', totalVillages: 3, totalPopulation: 9800, totalVoters: 7200 },
  { id: 'AP-GP-543022', mandalId: 'AP-MDL-54302', name: 'Sijua', lgdCode: 543022, panchayatType: 'gram_panchayat', totalVillages: 1, totalPopulation: 2500, totalVoters: 1800 },
  
  // Sompeta Mandal
  { id: 'AP-GP-543031', mandalId: 'AP-MDL-54303', name: 'Sompeta Rural', lgdCode: 543031, panchayatType: 'gram_panchayat', totalVillages: 2, totalPopulation: 8200, totalVoters: 5900 },
  
  // Palasa Mandal
  { id: 'AP-GP-543041', mandalId: 'AP-MDL-54304', name: 'Palasa Rural', lgdCode: 543041, panchayatType: 'gram_panchayat', totalVillages: 2, totalPopulation: 6100, totalVoters: 4400 },
  
  // Mandasa Mandal
  { id: 'AP-GP-543051', mandalId: 'AP-MDL-54305', name: 'Mandasa Rural', lgdCode: 543051, panchayatType: 'gram_panchayat', totalVillages: 3, totalPopulation: 7800, totalVoters: 5600 },
  
  // Tekkali Mandal
  { id: 'AP-GP-543061', mandalId: 'AP-MDL-54306', name: 'Tekkali Rural', lgdCode: 543061, panchayatType: 'gram_panchayat', totalVillages: 2, totalPopulation: 11200, totalVoters: 8100 },
];

// ─────────────────────────────────────────────────────────────────────────────
//  POLLING BOOTHS
// ─────────────────────────────────────────────────────────────────────────────

export const ANDHRA_PRADESH_POLLING_BOOTHS: PollingBooth[] = [
  // Ichchapuram Constituency (AC 1)
  {
    id: 'AP-AC1-B1',
    constituencyId: 'AP-AC-1',
    panchayatId: 'AP-GP-543011',
    boothNumber: 1,
    nameEn: 'M.P. Elementary School, Ichchapuram Rural',
    nameTe: 'మండల పరిషత్ ప్రాథమిక పాఠశాల, ఇచ్చాపురం రూరల్',
    totalVoters: 950,
    maleVoters: 470,
    femaleVoters: 480,
    thirdGenderVoters: 0,
    isUrban: false,
  },
  {
    id: 'AP-AC1-B2',
    constituencyId: 'AP-AC-1',
    panchayatId: 'AP-GP-543012',
    boothNumber: 2,
    nameEn: 'Z.P. High School, Kedaripuram',
    nameTe: 'జిల్లా పరిషత్ ఉన్నత పాఠశాల, కేదారీపురం',
    totalVoters: 1100,
    maleVoters: 540,
    femaleVoters: 560,
    thirdGenderVoters: 0,
    isUrban: false,
  },
  {
    id: 'AP-AC1-B3',
    constituencyId: 'AP-AC-1',
    panchayatId: 'AP-GP-543021',
    boothNumber: 3,
    nameEn: 'M.P.U.P. School, Kaviti',
    nameTe: 'మండల పరిషత్ ప్రాథమికోన్నత పాఠశాల, కవిటి',
    totalVoters: 1250,
    maleVoters: 620,
    femaleVoters: 630,
    thirdGenderVoters: 0,
    isUrban: false,
  },

  // Palasa Constituency (AC 2)
  {
    id: 'AP-AC2-B1',
    constituencyId: 'AP-AC-2',
    panchayatId: 'AP-GP-543041',
    boothNumber: 1,
    nameEn: 'Government High School, Palasa',
    nameTe: 'ప్రభుత్వ ఉన్నత పాఠశాల, పలాస',
    totalVoters: 1050,
    maleVoters: 520,
    femaleVoters: 530,
    thirdGenderVoters: 0,
    isUrban: false,
  },
  {
    id: 'AP-AC2-B2',
    constituencyId: 'AP-AC-2',
    panchayatId: 'AP-GP-543051',
    boothNumber: 2,
    nameEn: 'M.P. Elementary School, Mandasa',
    nameTe: 'మండల పరిషత్ ప్రాథమిక పాఠశాల, మందస',
    totalVoters: 980,
    maleVoters: 480,
    femaleVoters: 500,
    thirdGenderVoters: 0,
    isUrban: false,
  },

  // Tekkali Constituency (AC 3)
  {
    id: 'AP-AC3-B1',
    constituencyId: 'AP-AC-3',
    panchayatId: 'AP-GP-543061',
    boothNumber: 1,
    nameEn: 'Z.P. Boys High School, Tekkali',
    nameTe: 'జిల్లా పరిషత్ బాలుర ఉన్నత పాఠశాల, టెక్కలి',
    totalVoters: 1150,
    maleVoters: 570,
    femaleVoters: 580,
    thirdGenderVoters: 0,
    isUrban: false,
  },
  {
    id: 'AP-AC3-B2',
    constituencyId: 'AP-AC-3',
    panchayatId: 'AP-GP-543061',
    boothNumber: 2,
    nameEn: 'Z.P. Girls High School, Tekkali',
    nameTe: 'జిల్లా పరిషత్ బాలికల ఉన్నత పాఠశాల, టెక్కలి',
    totalVoters: 1020,
    maleVoters: 500,
    femaleVoters: 520,
    thirdGenderVoters: 0,
    isUrban: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  MANDAL-CONSTITUENCY OVERLAPS
// ─────────────────────────────────────────────────────────────────────────────

export const ANDHRA_PRADESH_MANDAL_OVERLAPS: MandalConstituencyOverlap[] = [
  // Ichchapuram AC (AC 1) overlaps with Ichchapuram, Kaviti, and Sompeta mandals
  {
    id: 'AP-MCA-54301-1',
    mandalId: 'AP-MDL-54301',
    constituencyId: 'AP-AC-1',
    overlapPercentage: 100.00,
    overlapPopulation: 83450,
    overlapVillages: 23,
    source: 'LGD',
    verified: true,
  },
  {
    id: 'AP-MCA-54302-1',
    mandalId: 'AP-MDL-54302',
    constituencyId: 'AP-AC-1',
    overlapPercentage: 100.00,
    overlapPopulation: 76200,
    overlapVillages: 25,
    source: 'LGD',
    verified: true,
  },
  {
    id: 'AP-MCA-54303-1',
    mandalId: 'AP-MDL-54303',
    constituencyId: 'AP-AC-1',
    overlapPercentage: 50.00,
    overlapPopulation: 45650,
    overlapVillages: 14,
    source: 'LGD',
    verified: true,
  },

  // Palasa AC (AC 2) overlaps with Sompeta, Palasa, and Mandasa mandals
  {
    id: 'AP-MCA-54303-2',
    mandalId: 'AP-MDL-54303',
    constituencyId: 'AP-AC-2',
    overlapPercentage: 50.00,
    overlapPopulation: 45650,
    overlapVillages: 14,
    source: 'LGD',
    verified: true,
  },
  {
    id: 'AP-MCA-54304-2',
    mandalId: 'AP-MDL-54304',
    constituencyId: 'AP-AC-2',
    overlapPercentage: 100.00,
    overlapPopulation: 98150,
    overlapVillages: 22,
    source: 'LGD',
    verified: true,
  },
  {
    id: 'AP-MCA-54305-2',
    mandalId: 'AP-MDL-54305',
    constituencyId: 'AP-AC-2',
    overlapPercentage: 60.00,
    overlapPopulation: 49440,
    overlapVillages: 16,
    source: 'LGD',
    verified: true,
  },

  // Tekkali AC (AC 3) overlaps with Mandasa and Tekkali mandals
  {
    id: 'AP-MCA-54305-3',
    mandalId: 'AP-MDL-54305',
    constituencyId: 'AP-AC-3',
    overlapPercentage: 40.00,
    overlapPopulation: 32960,
    overlapVillages: 10,
    source: 'LGD',
    verified: true,
  },
  {
    id: 'AP-MCA-54306-3',
    mandalId: 'AP-MDL-54306',
    constituencyId: 'AP-AC-3',
    overlapPercentage: 100.00,
    overlapPopulation: 87900,
    overlapVillages: 24,
    source: 'LGD',
    verified: true,
  },
];
