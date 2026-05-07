/**
 * Delimitation Seat Calculator
 *
 * Core algorithm for projecting how many assembly seats each state
 * should have under equal-population delimitation.
 *
 * Constitutional basis:
 * - Article 81: Lok Sabha seats allocated proportional to population
 * - Article 170: State assembly seats between 60–500
 * - Equal-population principle: each constituency ~same population (±10%)
 *
 * Methodology:
 * 1. Compute national ideal population per seat
 * 2. For each state: projected_seats = round(state_pop / ideal_pop_per_seat)
 * 3. Apply constitutional min/max bounds
 * 4. Compute SC/ST reserved seats proportional to SC/ST population
 */

import type { SeatAllocation, StatePopulationSummary } from '../delimitationTypes';
import {
  computeSeatAllocation,
  calculateSCReservedSeats,
  calculateSTReservedSeats,
  MAX_POPULATION_DEVIATION_PERCENT,
} from '../delimitationTypes';
import {
  CENSUS_2011_STATES,
  INDIA_TOTAL_POPULATION_2011,
  IDEAL_POP_PER_AC_SEAT_2011,
  type CensusStateData,
} from '../../../../data/census/india-district-population-2011';

// ─── CONSTITUTIONAL BOUNDS ───

/** Minimum assembly seats for a state (Art. 170) */
const MIN_ASSEMBLY_SEATS = 60;
/** Maximum assembly seats for a state (Art. 170) — UT exceptions below this */
const MAX_ASSEMBLY_SEATS = 500;
/** Minimum for small states/UTs */
const MIN_SMALL_STATE_SEATS = 30;

// ─── CORE CALCULATOR ───

/**
 * Convert CensusStateData to StatePopulationSummary for the seat calculator
 */
function toPopulationSummary(census: CensusStateData): StatePopulationSummary {
  const popPerSeat = census.currentAssemblySeats > 0
    ? Math.round(census.totalPopulation / census.currentAssemblySeats)
    : 0;

  return {
    stateCode: census.stateCode,
    stateName: census.stateName,
    censusYear: 2011,
    totalPopulation: census.totalPopulation,
    scPopulation: census.scPopulation,
    stPopulation: census.stPopulation,
    scPercentage: census.totalPopulation > 0 ? (census.scPopulation / census.totalPopulation) * 100 : 0,
    stPercentage: census.totalPopulation > 0 ? (census.stPopulation / census.totalPopulation) * 100 : 0,
    literacyRate: census.totalPopulation > 0 ? (census.literatePopulation / census.totalPopulation) * 100 : 0,
    urbanPercentage: census.totalPopulation > 0 ? (census.urbanPopulation / census.totalPopulation) * 100 : 0,
    currentAssemblySeats: census.currentAssemblySeats,
    currentLokSabhaSeats: census.currentLokSabhaSeats,
    populationPerSeat: popPerSeat,
    deviationFromIdeal: 0,
    districts: census.districts.map((d) => ({
      stateCode: d.stateCode,
      districtName: d.districtName,
      censusYear: 2011,
      totalPopulation: d.totalPopulation,
      scPopulation: d.scPopulation,
      stPopulation: d.stPopulation,
      literatePopulation: d.literatePopulation,
      urbanPopulation: d.urbanPopulation,
      areaKmSq: d.areaKmSq,
      currentSeats: 0, // would need mapping data
    })),
  };
}

/**
 * Compute seat allocation for all states using Census 2011 data.
 *
 * Uses an expansion model: the national ideal pop-per-seat is derived
 * from the state with the LOWEST current pop-per-seat ratio, ensuring
 * no state loses seats. This is the politically realistic scenario —
 * India's total assembly seats will INCREASE during delimitation.
 *
 * @param idealPopPerSeat — override national average. If not provided,
 *   auto-computes an expansion-safe ideal.
 * @param preserveMinimum — if true, no state loses seats below constitutional minimum
 */
export function computeAllSeatAllocations(
  idealPopPerSeat?: number,
  preserveMinimum = true,
): SeatAllocation[] {
  // Compute expansion-safe ideal: use the lowest pop-per-seat ratio
  // across all states so that every state gains or stays the same.
  let ideal: number;
  if (idealPopPerSeat) {
    ideal = idealPopPerSeat;
  } else {
    const ratios = CENSUS_2011_STATES
      .filter((s) => s.currentAssemblySeats > 0)
      .map((s) => s.totalPopulation / s.currentAssemblySeats);
    // Use the minimum ratio (with a small reduction) so all states gain
    ideal = Math.floor(Math.min(...ratios) * 0.95);
  }

  return CENSUS_2011_STATES.map((census) => {
    const summary = toPopulationSummary(census);
    const allocation = computeSeatAllocation(summary, ideal);

    // Guarantee no state loses seats — floor at current seats
    if (allocation.projectedSeats < census.currentAssemblySeats) {
      allocation.projectedSeats = census.currentAssemblySeats;
      allocation.seatChange = 0;
      allocation.populationPerProjectedSeat = Math.round(
        census.totalPopulation / allocation.projectedSeats,
      );
      allocation.reservedSC = calculateSCReservedSeats(allocation.projectedSeats, census.scPopulation, census.totalPopulation);
      allocation.reservedST = calculateSTReservedSeats(allocation.projectedSeats, census.stPopulation, census.totalPopulation);
      allocation.general = allocation.projectedSeats - allocation.reservedSC - allocation.reservedST;
    }

    // Apply constitutional bounds
    if (preserveMinimum) {
      const minSeats = census.totalPopulation > 10_000_000 ? MIN_ASSEMBLY_SEATS : MIN_SMALL_STATE_SEATS;
      if (allocation.projectedSeats < minSeats) {
        allocation.projectedSeats = minSeats;
        allocation.seatChange = allocation.projectedSeats - allocation.currentSeats;
        allocation.reservedSC = calculateSCReservedSeats(allocation.projectedSeats, census.scPopulation, census.totalPopulation);
        allocation.reservedST = calculateSTReservedSeats(allocation.projectedSeats, census.stPopulation, census.totalPopulation);
        allocation.general = allocation.projectedSeats - allocation.reservedSC - allocation.reservedST;
      }
    }

    return allocation;
  });
}

/**
 * Compute seat allocation for a single state.
 */
export function computeStateSeatAllocation(
  stateCode: string,
  idealPopPerSeat?: number,
): SeatAllocation | null {
  const census = CENSUS_2011_STATES.find((s) => s.stateCode === stateCode);
  if (!census) return null;

  const ideal = idealPopPerSeat ?? IDEAL_POP_PER_AC_SEAT_2011;
  const summary = toPopulationSummary(census);
  return computeSeatAllocation(summary, ideal);
}

/**
 * Compute district-level seat distribution within a state.
 * Distributes total state seats among districts proportional to population.
 */
export function computeDistrictSeatDistribution(
  stateCode: string,
  totalSeats?: number,
): Array<{
  districtName: string;
  population: number;
  currentSeats: number;
  projectedSeats: number;
  seatChange: number;
  populationPerSeat: number;
  deviationPercent: number;
  scSeats: number;
  stSeats: number;
}> {
  const census = CENSUS_2011_STATES.find((s) => s.stateCode === stateCode);
  if (!census || census.districts.length === 0) return [];

  const seats = totalSeats ?? census.currentAssemblySeats;
  const idealPopPerSeat = Math.round(census.totalPopulation / seats);

  // First pass: assign seats proportionally
  let rawSeats = census.districts.map((d) => ({
    districtName: d.districtName,
    population: d.totalPopulation,
    rawSeats: d.totalPopulation / idealPopPerSeat,
    assignedSeats: 0,
    scPop: d.scPopulation,
    stPop: d.stPopulation,
  }));

  // Largest remainder method for fair rounding
  const totalFloor = rawSeats.reduce((s, d) => s + Math.floor(d.rawSeats), 0);
  let remaining = seats - totalFloor;

  // Assign floor first
  rawSeats.forEach((d) => { d.assignedSeats = Math.floor(d.rawSeats); });

  // Distribute remaining seats to districts with largest fractional remainder
  const remainders = rawSeats
    .map((d, i) => ({ index: i, remainder: d.rawSeats - Math.floor(d.rawSeats) }))
    .sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < remaining && i < remainders.length; i++) {
    rawSeats[remainders[i].index].assignedSeats += 1;
  }

  // Ensure every district has at least 1 seat
  rawSeats.forEach((d) => {
    if (d.assignedSeats < 1) d.assignedSeats = 1;
  });

  return rawSeats.map((d) => {
    const popPerSeat = d.assignedSeats > 0 ? Math.round(d.population / d.assignedSeats) : 0;
    const deviation = idealPopPerSeat > 0
      ? ((popPerSeat - idealPopPerSeat) / idealPopPerSeat) * 100
      : 0;
    const scSeats = calculateSCReservedSeats(d.assignedSeats, d.scPop, d.population);
    const stSeats = calculateSTReservedSeats(d.assignedSeats, d.stPop, d.population);

    return {
      districtName: d.districtName,
      population: d.population,
      currentSeats: 0, // would need constituency-to-district mapping
      projectedSeats: d.assignedSeats,
      seatChange: 0,
      populationPerSeat: popPerSeat,
      deviationPercent: Math.round(deviation * 10) / 10,
      scSeats,
      stSeats,
    };
  });
}

/**
 * Identify gainers and losers from delimitation.
 * Returns states sorted by seat change (gainers first).
 */
export function getGainersAndLosers(allocations?: SeatAllocation[]): {
  gainers: SeatAllocation[];
  losers: SeatAllocation[];
  unchanged: SeatAllocation[];
  summary: {
    totalGained: number;
    totalLost: number;
    biggestGainer: string;
    biggestLoser: string;
  };
} {
  const allocs = allocations ?? computeAllSeatAllocations();
  const gainers = allocs.filter((a) => a.seatChange > 0).sort((a, b) => b.seatChange - a.seatChange);
  const losers = allocs.filter((a) => a.seatChange < 0).sort((a, b) => a.seatChange - b.seatChange);
  const unchanged = allocs.filter((a) => a.seatChange === 0);

  return {
    gainers,
    losers,
    unchanged,
    summary: {
      totalGained: gainers.reduce((s, a) => s + a.seatChange, 0),
      totalLost: losers.reduce((s, a) => s + a.seatChange, 0),
      biggestGainer: gainers[0]?.stateCode ?? 'N/A',
      biggestLoser: losers[0]?.stateCode ?? 'N/A',
    },
  };
}

/**
 * Check if a proposed seat allocation is within constitutional deviation bounds.
 */
export function validateAllocation(allocation: SeatAllocation): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (allocation.projectedSeats < MIN_SMALL_STATE_SEATS) {
    issues.push(`Projected seats (${allocation.projectedSeats}) below constitutional minimum (${MIN_SMALL_STATE_SEATS})`);
  }
  if (allocation.projectedSeats > MAX_ASSEMBLY_SEATS) {
    issues.push(`Projected seats (${allocation.projectedSeats}) exceeds constitutional maximum (${MAX_ASSEMBLY_SEATS})`);
  }
  if (Math.abs(allocation.deviationPercent) > MAX_POPULATION_DEVIATION_PERCENT) {
    issues.push(`Population deviation (${allocation.deviationPercent.toFixed(1)}%) exceeds ±${MAX_POPULATION_DEVIATION_PERCENT}%`);
  }
  if (allocation.reservedSC + allocation.reservedST > allocation.projectedSeats) {
    issues.push('Reserved seats exceed total projected seats');
  }
  if (allocation.general < 0) {
    issues.push('Negative general seats — reservation exceeds total');
  }

  return { valid: issues.length === 0, issues };
}
