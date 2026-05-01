/**
 * Reservation Analyzer — SC/ST Reservation Analysis for Delimitation
 *
 * Analyzes how delimitation will affect SC/ST reservation of constituencies.
 * This is politically one of the most sensitive aspects of delimitation.
 *
 * Constitutional basis:
 * - Article 330: Reservation of SC/ST seats in Lok Sabha
 * - Article 332: Reservation of SC/ST seats in State Assemblies
 * - Seats reserved proportional to SC/ST population in the state
 * - Reserved constituencies are the ones with highest SC/ST concentration
 *
 * Key analyses:
 * 1. Current vs projected reserved seat count
 * 2. SC/ST concentration mapping per district
 * 3. Threshold analysis — which constituencies cross SC/ST reservation thresholds
 * 4. Reservation change impact — which parties gain/lose from reservation changes
 */

import {
  calculateSCReservedSeats,
  calculateSTReservedSeats,
} from '../delimitationTypes';
import {
  CENSUS_2011_STATES,
  type CensusStateData,
  type CensusDistrictData,
} from '../../../../data/census/india-district-population-2011';
import { computeAllSeatAllocations, computeStateSeatAllocation } from './seatCalculator';

// ─── TYPES ───

export interface ReservationProfile {
  stateCode: string;
  stateName: string;
  totalPopulation: number;
  scPopulation: number;
  stPopulation: number;
  scPercent: number;
  stPercent: number;
  currentSeats: number;
  projectedSeats: number;
  current: ReservationBreakdown;
  projected: ReservationBreakdown;
  change: ReservationChange;
  districts: DistrictReservationProfile[];
  hotspots: ReservationHotspot[];
}

export interface ReservationBreakdown {
  total: number;
  scReserved: number;
  stReserved: number;
  general: number;
  scPercent: number;
  stPercent: number;
  generalPercent: number;
}

export interface ReservationChange {
  scChange: number;
  stChange: number;
  generalChange: number;
  scTrend: 'increase' | 'decrease' | 'stable';
  stTrend: 'increase' | 'decrease' | 'stable';
  severity: 'high' | 'medium' | 'low' | 'none';
  summary: string;
}

export interface DistrictReservationProfile {
  districtName: string;
  population: number;
  scPopulation: number;
  stPopulation: number;
  scPercent: number;
  stPercent: number;
  projectedSeats: number;
  scReservedSeats: number;
  stReservedSeats: number;
  generalSeats: number;
  /** Whether this district crosses the SC reservation threshold (>15%) */
  scHotspot: boolean;
  /** Whether this district crosses the ST reservation threshold (>5%) */
  stHotspot: boolean;
}

export interface ReservationHotspot {
  districtName: string;
  type: 'SC' | 'ST';
  percentage: number;
  seats: number;
  significance: 'critical' | 'high' | 'moderate';
  description: string;
}

export interface NationalReservationSummary {
  states: ReservationProfile[];
  totals: {
    currentSC: number;
    projectedSC: number;
    scChange: number;
    currentST: number;
    projectedST: number;
    stChange: number;
    currentGeneral: number;
    projectedGeneral: number;
  };
  topSCStates: Array<{ stateCode: string; stateName: string; scPercent: number; scSeats: number }>;
  topSTStates: Array<{ stateCode: string; stateName: string; stPercent: number; stSeats: number }>;
  mostImpacted: Array<{ stateCode: string; stateName: string; totalReservationChange: number }>;
}

// ─── SC/ST THRESHOLD CONSTANTS ───

/** If a constituency's SC% exceeds this, it's a candidate for SC reservation */
const SC_RESERVATION_THRESHOLD = 15.0;
/** If a constituency's ST% exceeds this, it's a candidate for ST reservation */
const ST_RESERVATION_THRESHOLD = 5.0;
/** High-concentration threshold for hotspot detection */
const SC_HOTSPOT_THRESHOLD = 25.0;
const ST_HOTSPOT_THRESHOLD = 15.0;

// ─── CORE ANALYZER ───

/**
 * Analyze reservation profile for a single state.
 */
export function analyzeStateReservation(stateCode: string): ReservationProfile | null {
  const census = CENSUS_2011_STATES.find((s) => s.stateCode === stateCode);
  if (!census) return null;

  const allocation = computeStateSeatAllocation(stateCode);

  const scPercent = census.totalPopulation > 0
    ? (census.scPopulation / census.totalPopulation) * 100
    : 0;
  const stPercent = census.totalPopulation > 0
    ? (census.stPopulation / census.totalPopulation) * 100
    : 0;

  // Current reservation (based on current seats)
  const currentSC = calculateSCReservedSeats(census.currentAssemblySeats, census.scPopulation, census.totalPopulation);
  const currentST = calculateSTReservedSeats(census.currentAssemblySeats, census.stPopulation, census.totalPopulation);
  const currentGeneral = census.currentAssemblySeats - currentSC - currentST;

  const current: ReservationBreakdown = {
    total: census.currentAssemblySeats,
    scReserved: currentSC,
    stReserved: currentST,
    general: currentGeneral,
    scPercent: census.currentAssemblySeats > 0 ? Math.round((currentSC / census.currentAssemblySeats) * 1000) / 10 : 0,
    stPercent: census.currentAssemblySeats > 0 ? Math.round((currentST / census.currentAssemblySeats) * 1000) / 10 : 0,
    generalPercent: census.currentAssemblySeats > 0 ? Math.round((currentGeneral / census.currentAssemblySeats) * 1000) / 10 : 0,
  };

  // Projected reservation (based on projected seats)
  const projectedSeats = allocation?.projectedSeats ?? census.currentAssemblySeats;
  const projSC = calculateSCReservedSeats(projectedSeats, census.scPopulation, census.totalPopulation);
  const projST = calculateSTReservedSeats(projectedSeats, census.stPopulation, census.totalPopulation);
  const projGeneral = projectedSeats - projSC - projST;

  const projected: ReservationBreakdown = {
    total: projectedSeats,
    scReserved: projSC,
    stReserved: projST,
    general: projGeneral,
    scPercent: projectedSeats > 0 ? Math.round((projSC / projectedSeats) * 1000) / 10 : 0,
    stPercent: projectedSeats > 0 ? Math.round((projST / projectedSeats) * 1000) / 10 : 0,
    generalPercent: projectedSeats > 0 ? Math.round((projGeneral / projectedSeats) * 1000) / 10 : 0,
  };

  // Change analysis
  const scChange = projSC - currentSC;
  const stChange = projST - currentST;
  const generalChange = projGeneral - currentGeneral;
  const totalChange = Math.abs(scChange) + Math.abs(stChange);
  const severity: ReservationChange['severity'] = totalChange > 10 ? 'high' : totalChange > 3 ? 'medium' : totalChange > 0 ? 'low' : 'none';

  const change: ReservationChange = {
    scChange,
    stChange,
    generalChange,
    scTrend: scChange > 0 ? 'increase' : scChange < 0 ? 'decrease' : 'stable',
    stTrend: stChange > 0 ? 'increase' : stChange < 0 ? 'decrease' : 'stable',
    severity,
    summary: buildChangeSummary(stateCode, scChange, stChange, generalChange),
  };

  // District-level analysis
  const districts = analyzeDistrictReservations(census);
  const hotspots = identifyHotspots(districts, stateCode);

  return {
    stateCode,
    stateName: census.stateName,
    totalPopulation: census.totalPopulation,
    scPopulation: census.scPopulation,
    stPopulation: census.stPopulation,
    scPercent: Math.round(scPercent * 10) / 10,
    stPercent: Math.round(stPercent * 10) / 10,
    currentSeats: census.currentAssemblySeats,
    projectedSeats,
    current,
    projected,
    change,
    districts,
    hotspots,
  };
}

/**
 * Analyze reservation across all states.
 */
export function analyzeNationalReservation(): NationalReservationSummary {
  const profiles: ReservationProfile[] = [];

  for (const census of CENSUS_2011_STATES) {
    const profile = analyzeStateReservation(census.stateCode);
    if (profile) profiles.push(profile);
  }

  const totals = {
    currentSC: profiles.reduce((s, p) => s + p.current.scReserved, 0),
    projectedSC: profiles.reduce((s, p) => s + p.projected.scReserved, 0),
    scChange: 0,
    currentST: profiles.reduce((s, p) => s + p.current.stReserved, 0),
    projectedST: profiles.reduce((s, p) => s + p.projected.stReserved, 0),
    stChange: 0,
    currentGeneral: profiles.reduce((s, p) => s + p.current.general, 0),
    projectedGeneral: profiles.reduce((s, p) => s + p.projected.general, 0),
  };
  totals.scChange = totals.projectedSC - totals.currentSC;
  totals.stChange = totals.projectedST - totals.currentST;

  const topSCStates = [...profiles]
    .sort((a, b) => b.scPercent - a.scPercent)
    .slice(0, 5)
    .map((p) => ({ stateCode: p.stateCode, stateName: p.stateName, scPercent: p.scPercent, scSeats: p.projected.scReserved }));

  const topSTStates = [...profiles]
    .sort((a, b) => b.stPercent - a.stPercent)
    .slice(0, 5)
    .map((p) => ({ stateCode: p.stateCode, stateName: p.stateName, stPercent: p.stPercent, stSeats: p.projected.stReserved }));

  const mostImpacted = [...profiles]
    .sort((a, b) => (Math.abs(b.change.scChange) + Math.abs(b.change.stChange)) - (Math.abs(a.change.scChange) + Math.abs(a.change.stChange)))
    .slice(0, 5)
    .map((p) => ({
      stateCode: p.stateCode,
      stateName: p.stateName,
      totalReservationChange: Math.abs(p.change.scChange) + Math.abs(p.change.stChange),
    }));

  return { states: profiles, totals, topSCStates, topSTStates, mostImpacted };
}

// ─── DISTRICT-LEVEL ANALYSIS ───

function analyzeDistrictReservations(census: CensusStateData): DistrictReservationProfile[] {
  if (census.districts.length === 0) return [];

  const idealPopPerSeat = census.currentAssemblySeats > 0
    ? Math.round(census.totalPopulation / census.currentAssemblySeats)
    : 1;

  return census.districts.map((d) => {
    const projSeats = Math.max(1, Math.round(d.totalPopulation / idealPopPerSeat));
    const scPercent = d.totalPopulation > 0 ? (d.scPopulation / d.totalPopulation) * 100 : 0;
    const stPercent = d.totalPopulation > 0 ? (d.stPopulation / d.totalPopulation) * 100 : 0;
    const scRes = calculateSCReservedSeats(projSeats, d.scPopulation, d.totalPopulation);
    const stRes = calculateSTReservedSeats(projSeats, d.stPopulation, d.totalPopulation);

    return {
      districtName: d.districtName,
      population: d.totalPopulation,
      scPopulation: d.scPopulation,
      stPopulation: d.stPopulation,
      scPercent: Math.round(scPercent * 10) / 10,
      stPercent: Math.round(stPercent * 10) / 10,
      projectedSeats: projSeats,
      scReservedSeats: scRes,
      stReservedSeats: stRes,
      generalSeats: projSeats - scRes - stRes,
      scHotspot: scPercent >= SC_RESERVATION_THRESHOLD,
      stHotspot: stPercent >= ST_RESERVATION_THRESHOLD,
    };
  });
}

function identifyHotspots(districts: DistrictReservationProfile[], stateCode: string): ReservationHotspot[] {
  const hotspots: ReservationHotspot[] = [];

  for (const d of districts) {
    if (d.scPercent >= SC_HOTSPOT_THRESHOLD) {
      hotspots.push({
        districtName: d.districtName,
        type: 'SC',
        percentage: d.scPercent,
        seats: d.scReservedSeats,
        significance: d.scPercent >= 30 ? 'critical' : d.scPercent >= 25 ? 'high' : 'moderate',
        description: `${d.districtName} has ${d.scPercent}% SC population — ${d.scReservedSeats} of ${d.projectedSeats} seats SC-reserved`,
      });
    }
    if (d.stPercent >= ST_HOTSPOT_THRESHOLD) {
      hotspots.push({
        districtName: d.districtName,
        type: 'ST',
        percentage: d.stPercent,
        seats: d.stReservedSeats,
        significance: d.stPercent >= 25 ? 'critical' : d.stPercent >= 15 ? 'high' : 'moderate',
        description: `${d.districtName} has ${d.stPercent}% ST population — ${d.stReservedSeats} of ${d.projectedSeats} seats ST-reserved`,
      });
    }
  }

  return hotspots.sort((a, b) => b.percentage - a.percentage);
}

// ─── UTILITIES ───

function buildChangeSummary(stateCode: string, scChange: number, stChange: number, generalChange: number): string {
  const parts: string[] = [];
  if (scChange > 0) parts.push(`+${scChange} SC seats`);
  else if (scChange < 0) parts.push(`${scChange} SC seats`);
  if (stChange > 0) parts.push(`+${stChange} ST seats`);
  else if (stChange < 0) parts.push(`${stChange} ST seats`);
  if (generalChange > 0) parts.push(`+${generalChange} general seats`);
  else if (generalChange < 0) parts.push(`${generalChange} general seats`);

  if (parts.length === 0) return 'No change in reservation distribution';
  return parts.join(', ');
}

// ─── POLITICAL IMPACT OF RESERVATION CHANGES ───

/**
 * Analyze which parties are affected by reservation changes.
 * SC/ST reserved seats tend to favor certain parties.
 */
export function analyzeReservationPoliticalImpact(stateCode: string): {
  scSeatImpact: string;
  stSeatImpact: string;
  generalSeatImpact: string;
  narrativeSummary: string;
} {
  const profile = analyzeStateReservation(stateCode);
  if (!profile) {
    return {
      scSeatImpact: 'No data',
      stSeatImpact: 'No data',
      generalSeatImpact: 'No data',
      narrativeSummary: 'Insufficient data for analysis',
    };
  }

  const { change } = profile;

  const scImpact = change.scChange > 0
    ? `${change.scChange} new SC seats — benefits parties with strong SC voter base`
    : change.scChange < 0
      ? `${Math.abs(change.scChange)} fewer SC seats — affects SC-focused parties`
      : 'SC seats unchanged';

  const stImpact = change.stChange > 0
    ? `${change.stChange} new ST seats — benefits parties with tribal support`
    : change.stChange < 0
      ? `${Math.abs(change.stChange)} fewer ST seats — affects tribal parties`
      : 'ST seats unchanged';

  const genImpact = change.generalChange > 0
    ? `${change.generalChange} new general seats — major parties benefit`
    : change.generalChange < 0
      ? `${Math.abs(change.generalChange)} fewer general seats — increased competition`
      : 'General seats unchanged';

  const narrative = `In ${profile.stateName}, delimitation would shift reservation: ${change.summary}. ` +
    `The state's SC population is ${profile.scPercent}% and ST is ${profile.stPercent}%. ` +
    `Projected seat count changes from ${profile.currentSeats} to ${profile.projectedSeats} ` +
    `(${profile.projectedSeats > profile.currentSeats ? '+' : ''}${profile.projectedSeats - profile.currentSeats}).`;

  return {
    scSeatImpact: scImpact,
    stSeatImpact: stImpact,
    generalSeatImpact: genImpact,
    narrativeSummary: narrative,
  };
}
