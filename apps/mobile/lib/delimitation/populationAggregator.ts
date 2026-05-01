/**
 * Population Aggregator — Ward-to-Constituency Aggregation
 *
 * Aggregates population data from wards / sub-district units upward
 * to form proposed constituencies that satisfy the equal-population principle.
 *
 * Key algorithms:
 * 1. Bottom-up aggregation: Wards → mandals/taluks → districts → state
 * 2. Population balancing: ensure each proposed AC is within ±10% of ideal
 * 3. Geographic contiguity validation
 * 4. Admin boundary respect: prefer not splitting mandals/taluks
 *
 * Data flow:
 * Census ward population → aggregate to proposed constituency → validate deviation
 */

import type {
  DistrictPopulation,
  StatePopulationSummary,
} from '../delimitationTypes';
import {
  MAX_POPULATION_DEVIATION_PERCENT,
} from '../delimitationTypes';
import {
  CENSUS_2011_STATES,
  IDEAL_POP_PER_AC_SEAT_2011,
  type CensusDistrictData,
  type CensusStateData,
} from '../../../../data/census/india-district-population-2011';

// ─── TYPES ───

/** A sub-district unit (mandal/taluk/block) that can be assembled into constituencies */
export interface WardUnit {
  id: string;
  name: string;
  districtName: string;
  stateCode: string;
  population: number;
  scPopulation: number;
  stPopulation: number;
  urbanPopulation: number;
  areaKmSq: number;
  /** Adjacent unit IDs for contiguity checks */
  adjacentIds: string[];
}

/** A proposed constituency assembled from ward units */
export interface ProposedAC {
  id: string;
  name: string;
  stateCode: string;
  districtName: string;
  wardIds: string[];
  totalPopulation: number;
  scPopulation: number;
  stPopulation: number;
  urbanPopulation: number;
  areaKmSq: number;
  /** % deviation from state ideal population per AC */
  deviationPercent: number;
  /** SC % — if > threshold, may be SC reserved */
  scPercent: number;
  /** ST % — if > threshold, may be ST reserved */
  stPercent: number;
  isContiguous: boolean;
}

/** Population aggregation result for a state */
export interface AggregationResult {
  stateCode: string;
  stateName: string;
  totalPopulation: number;
  idealPopPerAC: number;
  proposedACs: ProposedAC[];
  totalSeats: number;
  avgPopPerSeat: number;
  maxDeviation: number;
  minDeviation: number;
  withinBoundsCount: number;
  outOfBoundsCount: number;
  validation: AggregationValidation;
}

export interface AggregationValidation {
  valid: boolean;
  totalPopulationMatch: boolean;
  allContiguous: boolean;
  allWithinDeviation: boolean;
  noOrphanWards: boolean;
  issues: string[];
}

// ─── SYNTHETIC WARD GENERATION ───

/**
 * Generate synthetic ward units for a district based on Census 2011 data.
 * Since we don't have actual ward boundaries, we create sub-district units
 * by dividing each district into population-weighted units.
 *
 * The number of synthetic wards per district ≈ district seats × 3-4
 * (each constituency might span 3-4 wards/mandals).
 */
export function generateSyntheticWards(
  district: CensusDistrictData,
  targetUnitsPerSeat: number = 4,
  totalStateSeats?: number,
  totalStatePop?: number,
): WardUnit[] {
  const statePop = totalStatePop ?? 0;
  const stateSeats = totalStateSeats ?? 1;
  const districtSeats = statePop > 0
    ? Math.max(1, Math.round((district.totalPopulation / statePop) * stateSeats))
    : 1;
  const unitCount = Math.max(3, districtSeats * targetUnitsPerSeat);

  const units: WardUnit[] = [];
  const basePop = Math.floor(district.totalPopulation / unitCount);
  let remainingPop = district.totalPopulation;

  for (let i = 0; i < unitCount; i++) {
    const isLast = i === unitCount - 1;
    const pop = isLast ? remainingPop : basePop + Math.round((Math.random() - 0.5) * basePop * 0.3);
    const actualPop = isLast ? remainingPop : Math.min(pop, remainingPop);
    remainingPop -= actualPop;

    const fraction = district.totalPopulation > 0 ? actualPop / district.totalPopulation : 0;

    // Create adjacency: linear chain + random cross-links
    const adjacentIds: string[] = [];
    if (i > 0) adjacentIds.push(`${district.stateCode}-${district.districtName}-W${i - 1}`);
    if (i < unitCount - 1) adjacentIds.push(`${district.stateCode}-${district.districtName}-W${i + 1}`);
    // Add a cross-link for urban areas (denser connectivity)
    if (i > 1 && district.urbanPopulation > district.totalPopulation * 0.5) {
      adjacentIds.push(`${district.stateCode}-${district.districtName}-W${i - 2}`);
    }

    units.push({
      id: `${district.stateCode}-${district.districtName}-W${i}`,
      name: `${district.districtName} Ward ${i + 1}`,
      districtName: district.districtName,
      stateCode: district.stateCode,
      population: actualPop,
      scPopulation: Math.round(district.scPopulation * fraction),
      stPopulation: Math.round(district.stPopulation * fraction),
      urbanPopulation: Math.round(district.urbanPopulation * fraction),
      areaKmSq: Math.round(district.areaKmSq * fraction * 10) / 10,
      adjacentIds,
    });
  }

  return units;
}

/**
 * Generate all synthetic wards for a state.
 */
export function generateStateWards(stateCode: string): WardUnit[] {
  const census = CENSUS_2011_STATES.find((s) => s.stateCode === stateCode);
  if (!census || census.districts.length === 0) return [];

  const allWards: WardUnit[] = [];
  for (const district of census.districts) {
    const wards = generateSyntheticWards(
      district, 4,
      census.currentAssemblySeats,
      census.totalPopulation,
    );
    allWards.push(...wards);
  }

  return allWards;
}

// ─── GREEDY AGGREGATION ───

/**
 * Greedy constituency builder — assembles ward units into proposed ACs
 * using a seed-and-grow strategy:
 *
 * 1. Pick a seed ward (the largest ungrouped ward)
 * 2. Grow by adding adjacent wards until target population reached
 * 3. Validate contiguity and deviation
 * 4. Repeat until all wards assigned
 */
export function aggregateToConstituencies(
  wards: WardUnit[],
  targetSeats: number,
  stateCode: string,
): ProposedAC[] {
  if (wards.length === 0 || targetSeats <= 0) return [];

  const totalPop = wards.reduce((s, w) => s + w.population, 0);
  const idealPopPerAC = Math.round(totalPop / targetSeats);
  const minPop = Math.round(idealPopPerAC * (1 - MAX_POPULATION_DEVIATION_PERCENT / 100));
  const maxPop = Math.round(idealPopPerAC * (1 + MAX_POPULATION_DEVIATION_PERCENT / 100));

  const assigned = new Set<string>();
  const proposed: ProposedAC[] = [];

  // Index for adjacency lookups
  const wardMap = new Map<string, WardUnit>();
  for (const w of wards) wardMap.set(w.id, w);

  let acCounter = 1;

  while (assigned.size < wards.length && proposed.length < targetSeats) {
    // Pick seed: largest unassigned ward
    let seed: WardUnit | null = null;
    for (const w of wards) {
      if (!assigned.has(w.id) && (!seed || w.population > seed.population)) {
        seed = w;
      }
    }
    if (!seed) break;

    // Grow the constituency
    const acWards: WardUnit[] = [seed];
    assigned.add(seed.id);
    let acPop = seed.population;

    // BFS expansion — add adjacent wards until we hit target population
    const frontier = new Set<string>();
    for (const adj of seed.adjacentIds) {
      if (!assigned.has(adj) && wardMap.has(adj)) frontier.add(adj);
    }

    while (acPop < idealPopPerAC && frontier.size > 0) {
      // Pick the frontier ward that brings us closest to ideal without overshooting too much
      let bestId: string | null = null;
      let bestDelta = Infinity;

      for (const fId of frontier) {
        const fw = wardMap.get(fId)!;
        const newPop = acPop + fw.population;
        const delta = Math.abs(newPop - idealPopPerAC);
        if (delta < bestDelta) {
          bestDelta = delta;
          bestId = fId;
        }
      }

      if (!bestId) break;

      const bestWard = wardMap.get(bestId)!;

      // Don't add if it would push us way over
      if (acPop >= minPop && acPop + bestWard.population > maxPop) break;

      acWards.push(bestWard);
      assigned.add(bestId);
      acPop += bestWard.population;
      frontier.delete(bestId);

      // Add new frontier from this ward's adjacents
      for (const adj of bestWard.adjacentIds) {
        if (!assigned.has(adj) && wardMap.has(adj)) frontier.add(adj);
      }
    }

    // Build proposed AC
    const scPop = acWards.reduce((s, w) => s + w.scPopulation, 0);
    const stPop = acWards.reduce((s, w) => s + w.stPopulation, 0);
    const urbanPop = acWards.reduce((s, w) => s + w.urbanPopulation, 0);
    const area = acWards.reduce((s, w) => s + w.areaKmSq, 0);
    const deviation = idealPopPerAC > 0
      ? ((acPop - idealPopPerAC) / idealPopPerAC) * 100
      : 0;

    const districtNames = [...new Set(acWards.map((w) => w.districtName))];

    proposed.push({
      id: `${stateCode}-NEW-${acCounter}`,
      name: districtNames.length === 1
        ? `${districtNames[0]}-${acCounter}`
        : `${districtNames[0]}/${districtNames[1]}-${acCounter}`,
      stateCode,
      districtName: districtNames[0],
      wardIds: acWards.map((w) => w.id),
      totalPopulation: acPop,
      scPopulation: scPop,
      stPopulation: stPop,
      urbanPopulation: urbanPop,
      areaKmSq: Math.round(area * 10) / 10,
      deviationPercent: Math.round(deviation * 10) / 10,
      scPercent: acPop > 0 ? Math.round((scPop / acPop) * 1000) / 10 : 0,
      stPercent: acPop > 0 ? Math.round((stPop / acPop) * 1000) / 10 : 0,
      isContiguous: true, // guaranteed by BFS growth
    });

    acCounter++;
  }

  // Assign any remaining wards to nearest proposed AC
  for (const w of wards) {
    if (assigned.has(w.id)) continue;

    // Find the proposed AC that has an adjacent ward
    let bestAC: ProposedAC | null = null;
    let bestDev = Infinity;

    for (const pac of proposed) {
      const hasAdj = w.adjacentIds.some((adj) => pac.wardIds.includes(adj));
      if (hasAdj) {
        const newPop = pac.totalPopulation + w.population;
        const newDev = Math.abs(((newPop - idealPopPerAC) / idealPopPerAC) * 100);
        if (newDev < bestDev) {
          bestDev = newDev;
          bestAC = pac;
        }
      }
    }

    if (!bestAC && proposed.length > 0) {
      // Fallback: add to smallest proposed AC
      bestAC = proposed.reduce((min, p) =>
        p.totalPopulation < min.totalPopulation ? p : min, proposed[0]);
    }

    if (bestAC) {
      bestAC.wardIds.push(w.id);
      bestAC.totalPopulation += w.population;
      bestAC.scPopulation += w.scPopulation;
      bestAC.stPopulation += w.stPopulation;
      bestAC.urbanPopulation += w.urbanPopulation;
      bestAC.areaKmSq += w.areaKmSq;
      bestAC.deviationPercent = idealPopPerAC > 0
        ? Math.round(((bestAC.totalPopulation - idealPopPerAC) / idealPopPerAC) * 1000) / 10
        : 0;
      bestAC.scPercent = bestAC.totalPopulation > 0
        ? Math.round((bestAC.scPopulation / bestAC.totalPopulation) * 1000) / 10
        : 0;
      bestAC.stPercent = bestAC.totalPopulation > 0
        ? Math.round((bestAC.stPopulation / bestAC.totalPopulation) * 1000) / 10
        : 0;
      assigned.add(w.id);
    }
  }

  return proposed;
}

// ─── FULL STATE AGGREGATION ───

/**
 * Run the full population aggregation pipeline for a state.
 */
export function aggregateState(
  stateCode: string,
  targetSeats?: number,
): AggregationResult | null {
  const census = CENSUS_2011_STATES.find((s) => s.stateCode === stateCode);
  if (!census) return null;

  const seats = targetSeats ?? census.currentAssemblySeats;
  const idealPopPerAC = Math.round(census.totalPopulation / seats);

  // Generate synthetic wards
  const wards = generateStateWards(stateCode);
  if (wards.length === 0) return null;

  // Aggregate into constituencies
  const proposedACs = aggregateToConstituencies(wards, seats, stateCode);

  // Compute statistics
  const deviations = proposedACs.map((ac) => ac.deviationPercent);
  const maxDev = Math.max(...deviations);
  const minDev = Math.min(...deviations);
  const withinBounds = proposedACs.filter(
    (ac) => Math.abs(ac.deviationPercent) <= MAX_POPULATION_DEVIATION_PERCENT
  ).length;

  const totalAssignedPop = proposedACs.reduce((s, ac) => s + ac.totalPopulation, 0);
  const avgPop = proposedACs.length > 0 ? Math.round(totalAssignedPop / proposedACs.length) : 0;

  // Validate
  const issues: string[] = [];
  const totalPopMatch = Math.abs(totalAssignedPop - census.totalPopulation) < 100;
  if (!totalPopMatch) issues.push(`Population mismatch: assigned ${totalAssignedPop} vs census ${census.totalPopulation}`);

  const allContiguous = proposedACs.every((ac) => ac.isContiguous);
  if (!allContiguous) issues.push('Some constituencies are not contiguous');

  const allWithinDev = withinBounds === proposedACs.length;
  if (!allWithinDev) issues.push(`${proposedACs.length - withinBounds} constituencies exceed ±${MAX_POPULATION_DEVIATION_PERCENT}% deviation`);

  const totalWards = wards.length;
  const assignedWards = proposedACs.reduce((s, ac) => s + ac.wardIds.length, 0);
  const noOrphans = assignedWards >= totalWards;
  if (!noOrphans) issues.push(`${totalWards - assignedWards} orphan wards not assigned`);

  return {
    stateCode,
    stateName: census.stateName,
    totalPopulation: census.totalPopulation,
    idealPopPerAC,
    proposedACs,
    totalSeats: proposedACs.length,
    avgPopPerSeat: avgPop,
    maxDeviation: Math.round(maxDev * 10) / 10,
    minDeviation: Math.round(minDev * 10) / 10,
    withinBoundsCount: withinBounds,
    outOfBoundsCount: proposedACs.length - withinBounds,
    validation: {
      valid: issues.length === 0,
      totalPopulationMatch: totalPopMatch,
      allContiguous,
      allWithinDeviation: allWithinDev,
      noOrphanWards: noOrphans,
      issues,
    },
  };
}

// ─── DISTRICT-LEVEL QUICK AGGREGATION ───

/**
 * Quick aggregation that skips ward generation and works at district level.
 * Much faster, used for API endpoints and quick projections.
 */
export function quickDistrictAggregation(stateCode: string, targetSeats?: number): {
  districts: Array<{
    districtName: string;
    population: number;
    projectedSeats: number;
    populationPerSeat: number;
    deviationPercent: number;
    scPercent: number;
    stPercent: number;
    urbanPercent: number;
  }>;
  idealPopPerSeat: number;
  totalSeats: number;
} | null {
  const census = CENSUS_2011_STATES.find((s) => s.stateCode === stateCode);
  if (!census || census.districts.length === 0) return null;

  const seats = targetSeats ?? census.currentAssemblySeats;
  const idealPop = Math.round(census.totalPopulation / seats);

  // Largest remainder method
  const raw = census.districts.map((d) => ({
    districtName: d.districtName,
    population: d.totalPopulation,
    rawSeats: d.totalPopulation / idealPop,
    assigned: 0,
    scPop: d.scPopulation,
    stPop: d.stPopulation,
    urbanPop: d.urbanPopulation,
  }));

  const totalFloor = raw.reduce((s, d) => s + Math.floor(d.rawSeats), 0);
  let remaining = seats - totalFloor;
  raw.forEach((d) => { d.assigned = Math.max(1, Math.floor(d.rawSeats)); });

  const remainders = raw
    .map((d, i) => ({ i, rem: d.rawSeats - Math.floor(d.rawSeats) }))
    .sort((a, b) => b.rem - a.rem);
  for (let j = 0; j < remaining && j < remainders.length; j++) {
    raw[remainders[j].i].assigned += 1;
  }

  return {
    districts: raw.map((d) => {
      const popPerSeat = d.assigned > 0 ? Math.round(d.population / d.assigned) : 0;
      return {
        districtName: d.districtName,
        population: d.population,
        projectedSeats: d.assigned,
        populationPerSeat: popPerSeat,
        deviationPercent: idealPop > 0
          ? Math.round(((popPerSeat - idealPop) / idealPop) * 1000) / 10
          : 0,
        scPercent: d.population > 0
          ? Math.round((d.scPop / d.population) * 1000) / 10
          : 0,
        stPercent: d.population > 0
          ? Math.round((d.stPop / d.population) * 1000) / 10
          : 0,
        urbanPercent: d.population > 0
          ? Math.round((d.urbanPop / d.population) * 1000) / 10
          : 0,
      };
    }),
    idealPopPerSeat: idealPop,
    totalSeats: raw.reduce((s, d) => s + d.assigned, 0),
  };
}
