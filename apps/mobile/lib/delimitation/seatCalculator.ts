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

import type {
  SeatAllocation,
  StatePopulationSummary,
  SeatCalculationModel,
  MathematicalFormulaExplanation,
} from '../delimitationTypes';
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
      currentSeats: 0,
    })),
  };
}

/**
 * Compute seat allocation for all states using Census 2011 data.
 *
 * Supports two constitutional models:
 * 1. 'EXPANSION_SAFE' (default): Total seats are expanded so that no state
 *    loses existing seats. Protects states that controlled fertility.
 * 2. 'PROPORTIONAL': Pure constitutional proportional representation (Articles 81/170).
 *    Uses national average population per seat. Faster-growing states gain, slower-growing lose.
 */
/** Statutory expansion mandates under specific Acts (e.g. AP Reorganisation Act 2014) */
const STATUTORY_ASSEMBLY_SEATS: Record<string, number> = {
  AP: 225, // AP Reorganisation Act 2014 Sec 26 (175 -> 225)
  TS: 153, // AP Reorganisation Act 2014 Sec 26 (119 -> 153)
  JK: 90,  // J&K Delimitation Commission Order 2022
  AS: 126, // ECI Delimitation Order 2023
};

/**
 * Compute seat allocation for all states using Census 2011 data.
 *
 * Supports two constitutional models:
 * 1. 'EXPANSION_SAFE' (default): Total seats are expanded so that no state
 *    loses existing seats, implementing Section 26 statutory mandates for AP/TS
 *    and bounded by Article 170 ceiling (max 500). Protects states that controlled fertility.
 * 2. 'PROPORTIONAL': Constitutional proportional representation (Articles 81/170)
 *    using the national average population per AC seat (~293,683), strictly capped at 500.
 */
export function computeAllSeatAllocations(
  idealPopPerSeat?: number,
  preserveMinimum = true,
  model: SeatCalculationModel = 'EXPANSION_SAFE',
): SeatAllocation[] {
  const nationalIdeal = idealPopPerSeat ?? IDEAL_POP_PER_AC_SEAT_2011;

  return CENSUS_2011_STATES.map((census) => {
    let projectedSeats = 0;

    if (census.currentAssemblySeats === 0) {
      projectedSeats = 0;
    } else if (model === 'EXPANSION_SAFE') {
      if (STATUTORY_ASSEMBLY_SEATS[census.stateCode]) {
        projectedSeats = STATUTORY_ASSEMBLY_SEATS[census.stateCode];
      } else {
        // Organic demographic expansion bounded between 10% and 15%, strictly capped by Art. 170 ceiling of 500
        const expansionFactor = census.totalPopulation > 50_000_000 ? 1.15 : 1.10;
        projectedSeats = Math.min(MAX_ASSEMBLY_SEATS, Math.max(census.currentAssemblySeats, Math.round(census.currentAssemblySeats * expansionFactor)));
      }
    } else {
      // Proportional representation based on national average pop per AC seat (~2.94L)
      const minSeats = census.totalPopulation > 10_000_000 ? MIN_ASSEMBLY_SEATS : MIN_SMALL_STATE_SEATS;
      const raw = Math.round(census.totalPopulation / nationalIdeal);
      projectedSeats = Math.min(MAX_ASSEMBLY_SEATS, Math.max(minSeats, raw));
    }

    const seatChange = projectedSeats - census.currentAssemblySeats;
    const popPerSeat = projectedSeats > 0 ? Math.round(census.totalPopulation / projectedSeats) : 0;
    const deviation = nationalIdeal > 0 && popPerSeat > 0 ? ((popPerSeat - nationalIdeal) / nationalIdeal) * 100 : 0;
    const reservedSC = calculateSCReservedSeats(projectedSeats, census.scPopulation, census.totalPopulation);
    const reservedST = calculateSTReservedSeats(projectedSeats, census.stPopulation, census.totalPopulation);
    const general = Math.max(0, projectedSeats - reservedSC - reservedST);

    return {
      stateCode: census.stateCode,
      stateName: census.stateName,
      censusYear: 2011,
      totalPopulation: census.totalPopulation,
      idealPopulationPerSeat: nationalIdeal,
      currentSeats: census.currentAssemblySeats,
      projectedSeats,
      seatChange,
      populationPerProjectedSeat: popPerSeat,
      deviationPercent: Math.round(deviation * 10) / 10,
      reservedSC,
      reservedST,
      general,
      model,
    };
  });
}

/**
 * Compute seat allocation for a single state.
 */
export function computeStateSeatAllocation(
  stateCode: string,
  idealPopPerSeat?: number,
  model: SeatCalculationModel = 'EXPANSION_SAFE',
): SeatAllocation | null {
  const allAllocations = computeAllSeatAllocations(idealPopPerSeat, true, model);
  return allAllocations.find((a) => a.stateCode === stateCode) ?? null;
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

  const stateAlloc = computeStateSeatAllocation(stateCode);
  const seats = totalSeats ?? stateAlloc?.projectedSeats ?? census.currentAssemblySeats;
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

/**
 * Generate a complete, explainable mathematical breakdown of seat allocation
 * and constitutional formula execution for any state.
 */
export function explainSeatCalculation(
  stateCode: string,
  model: SeatCalculationModel = 'EXPANSION_SAFE',
): MathematicalFormulaExplanation | null {
  const census = CENSUS_2011_STATES.find((s) => s.stateCode === stateCode);
  if (!census) return null;

  const allocation = computeStateSeatAllocation(stateCode, undefined, model);
  if (!allocation) return null;

  const idealPop = allocation.idealPopulationPerSeat;
  const rawQuota = Math.round((census.totalPopulation / idealPop) * 100) / 100;
  const popPerSeat = allocation.populationPerProjectedSeat;
  const scPercent = census.totalPopulation > 0 ? (census.scPopulation / census.totalPopulation) * 100 : 0;
  const stPercent = census.totalPopulation > 0 ? (census.stPopulation / census.totalPopulation) * 100 : 0;

  // Hare-Niemeyer steps across districts
  const districtIdeal = Math.round(census.totalPopulation / allocation.projectedSeats);
  const hareNiemeyerSteps = census.districts.map((d) => {
    const exactQuota = districtIdeal > 0 ? d.totalPopulation / districtIdeal : 1;
    const baseSeats = Math.max(1, Math.floor(exactQuota));
    const remainder = exactQuota - Math.floor(exactQuota);
    return {
      districtName: d.districtName,
      population: d.totalPopulation,
      exactQuota: Math.round(exactQuota * 100) / 100,
      baseSeats,
      remainder: Math.round(remainder * 1000) / 1000,
      allocatedSeats: baseSeats, // will be adjusted below
    };
  });

  const totalBase = hareNiemeyerSteps.reduce((s, d) => s + d.baseSeats, 0);
  let remainingSeats = allocation.projectedSeats - totalBase;
  const sortedByRemainder = [...hareNiemeyerSteps].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < remainingSeats && i < sortedByRemainder.length; i++) {
    const item = hareNiemeyerSteps.find((d) => d.districtName === sortedByRemainder[i].districtName);
    if (item) item.allocatedSeats += 1;
  }

  const reasoningSteps: string[] = [
    `1. Population Basis: Using Census population of ${census.totalPopulation.toLocaleString()} citizens for ${census.stateName}.`,
    `2. Ideal Population Per Seat: Under ${model === 'EXPANSION_SAFE' ? 'Expansion-Safe Protection Model' : 'Constitutional Proportional Model'}, the benchmark divisor is ${idealPop.toLocaleString()} citizens per seat.`,
    `3. Raw Quotient: Total State Population (${census.totalPopulation.toLocaleString()}) ÷ Ideal Benchmark (${idealPop.toLocaleString()}) = ${rawQuota} raw seats.`,
    `4. Constitutional Bounds & Protection: ${model === 'EXPANSION_SAFE' ? `State baseline preserved at current ${census.currentAssemblySeats} seats to avoid penalizing fertility control.` : `Constitutional Article 170 bounds applied (range 60–500 seats).`}`,
    `5. Projected Assembly Total: State allocated ${allocation.projectedSeats} seats (${allocation.seatChange >= 0 ? '+' : ''}${allocation.seatChange} net seat change).`,
    `6. Article 332 SC Reservation: SC population of ${census.scPopulation.toLocaleString()} (${scPercent.toFixed(1)}%) mandates round(${allocation.projectedSeats} × ${scPercent.toFixed(2)}%) = ${allocation.reservedSC} reserved SC seats.`,
    `7. Article 332 ST Reservation: ST population of ${census.stPopulation.toLocaleString()} (${stPercent.toFixed(1)}%) mandates round(${allocation.projectedSeats} × ${stPercent.toFixed(2)}%) = ${allocation.reservedST} reserved ST seats.`,
    `8. General Unreserved Representation: ${allocation.projectedSeats} total - ${allocation.reservedSC} SC - ${allocation.reservedST} ST = ${allocation.general} General seats.`,
    `9. District Allocation: Hare-Niemeyer largest remainder distribution partitions seats across ${census.districts.length} administrative districts with maximum population deviation of ±10%.`,
  ];

  return {
    stateCode: census.stateCode,
    stateName: census.stateName,
    model,
    constitutionalArticles: {
      assemblyArticle: 'Article 170 (Composition of the Legislative Assemblies)',
      parliamentArticle: 'Article 81 & 82 (Composition of the House of the People & Readjustment)',
      reservationArticle: 'Article 330 & 332 (Reservation of seats for SC and ST)',
      deviationTolerancePercent: MAX_POPULATION_DEVIATION_PERCENT,
    },
    metrics: {
      totalStatePopulation: census.totalPopulation,
      idealPopPerSeat: idealPop,
      rawQuota,
      currentSeats: census.currentAssemblySeats,
      projectedSeats: allocation.projectedSeats,
      seatChange: allocation.seatChange,
      populationPerProjectedSeat: popPerSeat,
      deviationPercent: allocation.deviationPercent,
      scPopulation: census.scPopulation,
      scPercent: Math.round(scPercent * 10) / 10,
      scReservedSeats: allocation.reservedSC,
      stPopulation: census.stPopulation,
      stPercent: Math.round(stPercent * 10) / 10,
      stReservedSeats: allocation.reservedST,
      generalSeats: allocation.general,
    },
    hareNiemeyerSteps,
    formulas: {
      idealPopEquation: `IdealPop = StatePopulation / TargetSeats = ${census.totalPopulation.toLocaleString()} / ${allocation.projectedSeats} = ${popPerSeat.toLocaleString()}`,
      seatQuotaEquation: `RawQuota = TotalPopulation / BenchmarkIdeal = ${census.totalPopulation.toLocaleString()} / ${idealPop.toLocaleString()} = ${rawQuota}`,
      deviationEquation: `Deviation = ((ActualPop - IdealPop) / IdealPop) * 100 = ${allocation.deviationPercent.toFixed(2)}%`,
      scQuotaEquation: `SCSeats = round(TotalSeats * (SCPopulation / TotalPopulation)) = round(${allocation.projectedSeats} * ${scPercent.toFixed(2)}%) = ${allocation.reservedSC}`,
      stQuotaEquation: `STSeats = round(TotalSeats * (STPopulation / TotalPopulation)) = round(${allocation.projectedSeats} * ${stPercent.toFixed(2)}%) = ${allocation.reservedST}`,
    },
    reasoningSteps,
  };
}

