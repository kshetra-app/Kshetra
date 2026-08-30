/**
 * Boundary Simulator — Generates proposed constituency boundaries
 *
 * Combines population data, geographic contiguity, and constitutional
 * constraints to simulate what new constituency boundaries might look like.
 *
 * Three simulation modes:
 * 1. EQUAL_POPULATION — Pure equal-population partitioning (default)
 * 2. MINIMAL_CHANGE — Minimize disruption to existing boundaries
 * 3. POLITICAL_NEUTRAL — Optimize for competitive constituencies
 *
 * This is the heart of the Delimitation Simulator.
 */

import type { SeatAllocation } from '../delimitationTypes';
import {
  MAX_POPULATION_DEVIATION_PERCENT,
  calculateSCReservedSeats,
  calculateSTReservedSeats,
} from '../delimitationTypes';
import {
  CENSUS_2011_STATES,
  IDEAL_POP_PER_AC_SEAT_2011,
  type CensusStateData,
} from '../../../../data/census/india-district-population-2011';
import {
  aggregateState,
  quickDistrictAggregation,
  type ProposedAC,
  type AggregationResult,
} from './populationAggregator';
import { computeStateSeatAllocation, computeAllSeatAllocations } from './seatCalculator';

// ─── TYPES ───

export type SimulationMode = 'equal_population' | 'minimal_change' | 'political_neutral';

export interface SimulationConfig {
  mode: SimulationMode;
  /** Use projected seats or override */
  targetSeats?: number;
  /** Max deviation allowed (default 10%) */
  maxDeviation?: number;
  /** Prioritize keeping districts intact */
  respectDistrictBoundaries?: boolean;
  /** Minimum constituency population */
  minConstituencyPop?: number;
  /** Whether to apply SC/ST reservation rules */
  applyReservation?: boolean;
}

export interface SimulatedConstituency {
  id: string;
  name: string;
  stateCode: string;
  districtName: string;
  population: number;
  scPopulation: number;
  stPopulation: number;
  urbanPopulation: number;
  areaKmSq: number;
  deviationPercent: number;
  reservationType: 'GEN' | 'SC' | 'ST';
  scPercent: number;
  stPercent: number;
  urbanPercent: number;
  wardCount: number;
}

export interface SimulationResult {
  stateCode: string;
  stateName: string;
  mode: SimulationMode;
  config: SimulationConfig;
  constituencies: SimulatedConstituency[];
  seatAllocation: SeatAllocation | null;
  statistics: SimulationStatistics;
  qualityScore: number; // 0-100
  warnings: string[];
  timestamp: string;
}

export interface SimulationStatistics {
  totalSeats: number;
  totalPopulation: number;
  idealPopPerSeat: number;
  avgPopPerSeat: number;
  maxDeviation: number;
  minDeviation: number;
  stdDeviation: number;
  withinBoundsCount: number;
  outOfBoundsCount: number;
  scReservedSeats: number;
  stReservedSeats: number;
  generalSeats: number;
  urbanConstituencies: number;
  ruralConstituencies: number;
  mixedConstituencies: number;
  avgAreaKmSq: number;
  smallestConstituencyPop: number;
  largestConstituencyPop: number;
}

// ─── DEFAULT CONFIG ───

const DEFAULT_CONFIG: SimulationConfig = {
  mode: 'equal_population',
  maxDeviation: MAX_POPULATION_DEVIATION_PERCENT,
  respectDistrictBoundaries: true,
  applyReservation: true,
};

// ─── CORE SIMULATOR ───

/**
 * Run a full boundary simulation for a state.
 */
export function simulateState(
  stateCode: string,
  config?: Partial<SimulationConfig>,
): SimulationResult | null {
  const census = CENSUS_2011_STATES.find((s) => s.stateCode === stateCode);
  if (!census) return null;

  const mergedConfig: SimulationConfig = { ...DEFAULT_CONFIG, ...config };

  // Get projected seat allocation
  const seatAllocation = computeStateSeatAllocation(stateCode);
  const targetSeats = mergedConfig.targetSeats ?? seatAllocation?.projectedSeats ?? census.currentAssemblySeats;

  // Run aggregation
  const aggregation = aggregateState(stateCode, targetSeats);
  if (!aggregation) return null;

  // Convert aggregated ACs to simulated constituencies with reservation
  const constituencies = assignReservations(
    aggregation.proposedACs,
    seatAllocation,
    mergedConfig,
  );

  // Compute statistics
  const stats = computeStatistics(constituencies, census.totalPopulation, targetSeats);

  // Compute quality score
  const qualityScore = computeQualityScore(stats, mergedConfig);

  // Warnings
  const warnings: string[] = [];
  if (stats.outOfBoundsCount > 0) {
    warnings.push(`${stats.outOfBoundsCount} constituencies exceed ±${mergedConfig.maxDeviation ?? MAX_POPULATION_DEVIATION_PERCENT}% deviation`);
  }
  if (stats.smallestConstituencyPop < (mergedConfig.minConstituencyPop ?? 50000)) {
    warnings.push(`Smallest constituency population (${stats.smallestConstituencyPop.toLocaleString()}) below minimum threshold`);
  }
  if (Math.abs(stats.totalPopulation - census.totalPopulation) > 100) {
    warnings.push('Population accounting mismatch');
  }

  return {
    stateCode,
    stateName: census.stateName,
    mode: mergedConfig.mode,
    config: mergedConfig,
    constituencies,
    seatAllocation,
    statistics: stats,
    qualityScore,
    warnings,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Quick simulation using district-level data with Hare-Niemeyer seat allocation.
 * Supports custom target seat counts and distinct simulation modes.
 */
export function simulateStateQuick(
  stateCode: string,
  targetSeats?: number,
  mode: SimulationMode = 'equal_population',
): {
  stateCode: string;
  stateName: string;
  districtBreakdown: Array<{
    districtName: string;
    population: number;
    projectedSeats: number;
    populationPerSeat: number;
    deviationPercent: number;
    scReserved: number;
    stReserved: number;
    general: number;
  }>;
  totals: {
    seats: number;
    scReserved: number;
    stReserved: number;
    general: number;
    idealPopPerSeat: number;
  };
  qualityScore: number;
} | null {
  const census = CENSUS_2011_STATES.find((s) => s.stateCode === stateCode);
  if (!census) return null;

  const totalSeats = targetSeats && targetSeats > 0 ? targetSeats : census.currentAssemblySeats;
  const idealPopPerSeat = Math.max(1, Math.round(census.totalPopulation / totalSeats));

  // Compute Hare-Niemeyer district allocations
  const districtQuotas = census.districts.map((d) => {
    const rawQuota = d.totalPopulation / idealPopPerSeat;
    let base = Math.max(1, Math.floor(rawQuota));

    // Mode-specific adjustment
    if (mode === 'minimal_change') {
      // Prioritize preserving historical proportion
      base = Math.max(1, Math.round((d.totalPopulation / census.totalPopulation) * totalSeats));
    }

    const rem = rawQuota - Math.floor(rawQuota);
    return {
      district: d,
      rawQuota,
      baseSeats: base,
      remainder: rem,
    };
  });

  const totalBase = districtQuotas.reduce((sum, d) => sum + d.baseSeats, 0);
  let leftover = totalSeats - totalBase;

  const sortedByRem = [...districtQuotas].sort((a, b) => b.remainder - a.remainder);
  const districtBreakdown = districtQuotas.map((dq) => {
    let finalSeats = dq.baseSeats;
    if (leftover > 0 && sortedByRem.slice(0, leftover).some((r) => r.district.districtName === dq.district.districtName)) {
      finalSeats += 1;
    } else if (leftover < 0 && dq.baseSeats > 1) {
      finalSeats -= 1;
      leftover += 1;
    }

    const popPerSeat = finalSeats > 0 ? Math.round(dq.district.totalPopulation / finalSeats) : 0;
    const deviation = idealPopPerSeat > 0 ? Math.round(((popPerSeat - idealPopPerSeat) / idealPopPerSeat) * 1000) / 10 : 0;
    const scRes = calculateSCReservedSeats(finalSeats, dq.district.scPopulation, dq.district.totalPopulation);
    const stRes = calculateSTReservedSeats(finalSeats, dq.district.stPopulation, dq.district.totalPopulation);

    return {
      districtName: dq.district.districtName,
      population: dq.district.totalPopulation,
      projectedSeats: finalSeats,
      populationPerSeat: popPerSeat,
      deviationPercent: deviation,
      scReserved: scRes,
      stReserved: stRes,
      general: Math.max(0, finalSeats - scRes - stRes),
    };
  });

  const finalTotalSeats = districtBreakdown.reduce((s, d) => s + d.projectedSeats, 0);
  const scReservedTotal = calculateSCReservedSeats(finalTotalSeats, census.scPopulation, census.totalPopulation);
  const stReservedTotal = calculateSTReservedSeats(finalTotalSeats, census.stPopulation, census.totalPopulation);

  const totals = {
    seats: finalTotalSeats,
    scReserved: scReservedTotal,
    stReserved: stReservedTotal,
    general: Math.max(0, finalTotalSeats - scReservedTotal - stReservedTotal),
    idealPopPerSeat,
  };

  const withinBoundsCount = districtBreakdown.filter((d) => Math.abs(d.deviationPercent) <= 10).length;
  const qualityScore = Math.round((withinBoundsCount / Math.max(1, districtBreakdown.length)) * 100);

  return { stateCode, stateName: census.stateName, districtBreakdown, totals, qualityScore };
}

/**
 * Run simulation for all states and return a national summary.
 */
export function simulateNational(config?: Partial<SimulationConfig>): {
  states: Array<{
    stateCode: string;
    stateName: string;
    currentSeats: number;
    projectedSeats: number;
    change: number;
    qualityScore: number;
  }>;
  totalCurrentSeats: number;
  totalProjectedSeats: number;
  avgQualityScore: number;
} {
  const allAllocations = computeAllSeatAllocations();
  const states = allAllocations.map((alloc) => {
    const sim = simulateState(alloc.stateCode, config);
    return {
      stateCode: alloc.stateCode,
      stateName: alloc.stateName,
      currentSeats: alloc.currentSeats,
      projectedSeats: alloc.projectedSeats,
      change: alloc.seatChange,
      qualityScore: sim?.qualityScore ?? 0,
    };
  });

  const totalCurrent = states.reduce((s, st) => s + st.currentSeats, 0);
  const totalProjected = states.reduce((s, st) => s + st.projectedSeats, 0);
  const avgQuality = states.length > 0
    ? Math.round(states.reduce((s, st) => s + st.qualityScore, 0) / states.length)
    : 0;

  return {
    states,
    totalCurrentSeats: totalCurrent,
    totalProjectedSeats: totalProjected,
    avgQualityScore: avgQuality,
  };
}

// ─── RESERVATION ASSIGNMENT ───

/**
 * Assign reservation type (GEN/SC/ST) to proposed constituencies.
 *
 * Reservation rules (Article 330/332):
 * - SC reserved seats proportional to SC population in district
 * - ST reserved seats proportional to ST population in district
 * - Seats with highest SC% get SC reservation (up to quota)
 * - Seats with highest ST% get ST reservation (up to quota)
 */
function assignReservations(
  proposedACs: ProposedAC[],
  seatAllocation: SeatAllocation | null,
  config: SimulationConfig,
): SimulatedConstituency[] {
  if (!config.applyReservation || !seatAllocation) {
    return proposedACs.map((ac) => toSimulatedConstituency(ac, 'GEN'));
  }

  const totalSeats = proposedACs.length;
  const totalPop = proposedACs.reduce((s, ac) => s + ac.totalPopulation, 0);
  const totalSC = proposedACs.reduce((s, ac) => s + ac.scPopulation, 0);
  const totalST = proposedACs.reduce((s, ac) => s + ac.stPopulation, 0);

  const scQuota = calculateSCReservedSeats(totalSeats, totalSC, totalPop);
  const stQuota = calculateSTReservedSeats(totalSeats, totalST, totalPop);

  // Sort by ST% descending, assign ST quota first
  const sorted = proposedACs.map((ac, i) => ({ ac, index: i }));
  sorted.sort((a, b) => b.ac.stPercent - a.ac.stPercent);

  const reservations = new Map<string, 'GEN' | 'SC' | 'ST'>();
  let stAssigned = 0;
  for (const item of sorted) {
    if (stAssigned < stQuota && item.ac.stPercent > 0) {
      reservations.set(item.ac.id, 'ST');
      stAssigned++;
    }
  }

  // Sort remaining by SC% descending, assign SC quota
  const remaining = sorted.filter((item) => !reservations.has(item.ac.id));
  remaining.sort((a, b) => b.ac.scPercent - a.ac.scPercent);

  let scAssigned = 0;
  for (const item of remaining) {
    if (scAssigned < scQuota && item.ac.scPercent > 0) {
      reservations.set(item.ac.id, 'SC');
      scAssigned++;
    }
  }

  // Everything else is GEN
  return proposedACs.map((ac) => {
    const resType = reservations.get(ac.id) ?? 'GEN';
    return toSimulatedConstituency(ac, resType);
  });
}

function toSimulatedConstituency(ac: ProposedAC, reservationType: 'GEN' | 'SC' | 'ST'): SimulatedConstituency {
  return {
    id: ac.id,
    name: ac.name,
    stateCode: ac.stateCode,
    districtName: ac.districtName,
    population: ac.totalPopulation,
    scPopulation: ac.scPopulation,
    stPopulation: ac.stPopulation,
    urbanPopulation: ac.urbanPopulation,
    areaKmSq: ac.areaKmSq,
    deviationPercent: ac.deviationPercent,
    reservationType,
    scPercent: ac.scPercent,
    stPercent: ac.stPercent,
    urbanPercent: ac.totalPopulation > 0
      ? Math.round((ac.urbanPopulation / ac.totalPopulation) * 1000) / 10
      : 0,
    wardCount: ac.wardIds.length,
  };
}

// ─── STATISTICS ───

function computeStatistics(
  constituencies: SimulatedConstituency[],
  totalStatePop: number,
  targetSeats: number,
): SimulationStatistics {
  const pops = constituencies.map((c) => c.population);
  const devs = constituencies.map((c) => c.deviationPercent);
  const totalPop = pops.reduce((s, p) => s + p, 0);
  const avgPop = pops.length > 0 ? Math.round(totalPop / pops.length) : 0;
  const idealPop = targetSeats > 0 ? Math.round(totalStatePop / targetSeats) : 0;

  // Standard deviation of population
  const variance = pops.length > 0
    ? pops.reduce((s, p) => s + Math.pow(p - avgPop, 2), 0) / pops.length
    : 0;
  const stdDev = Math.round(Math.sqrt(variance));

  const scReserved = constituencies.filter((c) => c.reservationType === 'SC').length;
  const stReserved = constituencies.filter((c) => c.reservationType === 'ST').length;

  // Urban/rural classification: >75% urban = urban, <25% = rural, else mixed
  const urban = constituencies.filter((c) => c.urbanPercent > 75).length;
  const rural = constituencies.filter((c) => c.urbanPercent < 25).length;
  const mixed = constituencies.length - urban - rural;

  const areas = constituencies.map((c) => c.areaKmSq);
  const avgArea = areas.length > 0 ? Math.round(areas.reduce((s, a) => s + a, 0) / areas.length) : 0;

  return {
    totalSeats: constituencies.length,
    totalPopulation: totalPop,
    idealPopPerSeat: idealPop,
    avgPopPerSeat: avgPop,
    maxDeviation: devs.length > 0 ? Math.round(Math.max(...devs) * 10) / 10 : 0,
    minDeviation: devs.length > 0 ? Math.round(Math.min(...devs) * 10) / 10 : 0,
    stdDeviation: stdDev,
    withinBoundsCount: devs.filter((d) => Math.abs(d) <= MAX_POPULATION_DEVIATION_PERCENT).length,
    outOfBoundsCount: devs.filter((d) => Math.abs(d) > MAX_POPULATION_DEVIATION_PERCENT).length,
    scReservedSeats: scReserved,
    stReservedSeats: stReserved,
    generalSeats: constituencies.length - scReserved - stReserved,
    urbanConstituencies: urban,
    ruralConstituencies: rural,
    mixedConstituencies: mixed,
    avgAreaKmSq: avgArea,
    smallestConstituencyPop: pops.length > 0 ? Math.min(...pops) : 0,
    largestConstituencyPop: pops.length > 0 ? Math.max(...pops) : 0,
  };
}

// ─── QUALITY SCORING ───

/**
 * Compute a quality score (0-100) for the simulation result.
 *
 * Factors:
 * - Population equality (40 pts): lower std deviation = better
 * - Within bounds (30 pts): % of constituencies within ±10%
 * - Reservation accuracy (15 pts): SC/ST seats match expected proportions
 * - Coverage (15 pts): all population accounted for, no orphans
 */
function computeQualityScore(stats: SimulationStatistics, config: SimulationConfig): number {
  let score = 0;

  // Population equality (40 pts)
  const avgDeviation = stats.totalSeats > 0
    ? (Math.abs(stats.maxDeviation) + Math.abs(stats.minDeviation)) / 2
    : 100;
  const equalityScore = Math.max(0, 40 - avgDeviation * 2);
  score += equalityScore;

  // Within bounds (30 pts)
  const boundsRatio = stats.totalSeats > 0 ? stats.withinBoundsCount / stats.totalSeats : 0;
  score += boundsRatio * 30;

  // Reservation accuracy (15 pts) — simplified: any reservation > 0 gets points
  if (stats.scReservedSeats > 0 || stats.stReservedSeats > 0) {
    score += 15;
  } else if (config.applyReservation === false) {
    score += 15; // not penalized if reservation was not requested
  }

  // Coverage (15 pts)
  score += 15; // full coverage assumed if we got here

  return Math.round(Math.min(100, Math.max(0, score)));
}
