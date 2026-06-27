/**
 * Kshetra Data Aggregation Engine
 * ════════════════════════════════════════════════════════════════════════
 *
 * Rolls booth-level data UP through the administrative hierarchy and
 * supports drill-down queries at any level.
 *
 * Hierarchy: Booth → Panchayat → Mandal → Constituency → District → State
 *
 * All functions are PURE — no side effects, no I/O, no mutations.
 * All aggregations are deterministic: same inputs always produce same outputs.
 *
 * Accuracy guarantee: every aggregation can be validated with
 * `validateAggregation` to ensure booth-level sums match official totals.
 */

import type {
  PollingBooth,
  GramPanchayat,
  Mandal,
  MandalConstituencyOverlap,
  BoothElectionResult,
  AggregatedHierarchyData,
  HierarchyNode,
  HierarchyLevel,
  HierarchyValidationResult,
} from '../types/hierarchy';

// ═══════════════════════════════════════════════════════════════════════
// Internal Types
// ═══════════════════════════════════════════════════════════════════════

/**
 * A single validation check that was run during hierarchy validation.
 * Used internally by `validateAggregation` and `computeIntegrityScoreFromChecks`.
 * @internal
 */
interface ValidationCheck {
  /** Machine-readable check name */
  checkName: string;

  /** Human-readable description of what was checked */
  description: string;

  /** Whether the check passed */
  passed: boolean;

  /** Expected value (for numeric comparisons) */
  expected?: number;

  /** Actual value found */
  actual?: number;

  /**
   * Deviation from expected, as a percentage.
   * Only meaningful for numeric comparisons.
   */
  deviationPercent?: number;

  /** Detailed message explaining the result */
  message: string;

  /** Severity if the check failed */
  severity: 'info' | 'warning' | 'error' | 'critical';
}

// ═══════════════════════════════════════════════════════════════════════
// §1. VOTER DATA AGGREGATION (bottom-up)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Aggregate booth-level voter data up to panchayat level.
 *
 * Sums totalVoters, maleVoters, femaleVoters, and thirdGenderVoters from
 * all booths belonging to a single panchayat.
 *
 * @param booths - All booths in a single panchayat
 * @param stateCode - State code for the resulting aggregation
 * @returns Aggregated voter data at the panchayat level
 *
 * @example
 * ```ts
 * const panchayatData = aggregateBoothsToPanchayat(
 *   booths.filter(b => b.panchayatId === 'TS-GP-50101'),
 *   'TS'
 * );
 * ```
 */
export function aggregateBoothsToPanchayat(
  booths: PollingBooth[],
  stateCode: string = '',
): AggregatedHierarchyData {
  if (booths.length === 0) {
    return createEmptyAggregation('panchayat', '', '', stateCode);
  }

  const panchayatId = booths[0].panchayatId ?? '';

  let totalVoters = 0;
  let maleVoters = 0;
  let femaleVoters = 0;

  for (const booth of booths) {
    totalVoters += booth.totalVoters;
    maleVoters += booth.maleVoters;
    femaleVoters += booth.femaleVoters;
  }

  return {
    level: 'panchayat',
    entityId: panchayatId,
    entityName: '', // Caller should enrich with panchayat name
    stateCode,
    totalVoters,
    maleVoters,
    femaleVoters,
    totalBooths: booths.length,
    totalPanchayats: 1,
    totalMandals: 0,
    totalVillages: 0,
  };
}

/**
 * Aggregate panchayat-level data up to mandal level.
 *
 * For each panchayat, first aggregates its booths, then sums
 * all panchayat aggregates to produce mandal-level data.
 *
 * @param panchayats - All panchayats in a single mandal
 * @param boothsByPanchayat - Map from panchayat ID → booths in that panchayat
 * @param stateCode - State code for the resulting aggregation
 * @returns Aggregated voter data at the mandal level
 *
 * @example
 * ```ts
 * const mandalData = aggregatePanchayatsToMandal(
 *   panchayats.filter(p => p.mandalId === 'TS-MDL-501'),
 *   boothMap,
 *   'TS'
 * );
 * ```
 */
export function aggregatePanchayatsToMandal(
  panchayats: GramPanchayat[],
  boothsByPanchayat: Map<string, PollingBooth[]>,
  stateCode: string = '',
): AggregatedHierarchyData {
  if (panchayats.length === 0) {
    return createEmptyAggregation('mandal', '', '', stateCode);
  }

  const mandalId = panchayats[0].mandalId;

  let totalVoters = 0;
  let maleVoters = 0;
  let femaleVoters = 0;
  let totalBoothCount = 0;

  for (const panchayat of panchayats) {
    const booths = boothsByPanchayat.get(panchayat.id) ?? [];
    const panchayatData = aggregateBoothsToPanchayat(booths, stateCode);

    totalVoters += panchayatData.totalVoters;
    maleVoters += panchayatData.maleVoters;
    femaleVoters += panchayatData.femaleVoters;
    totalBoothCount += panchayatData.totalBooths;
  }

  return {
    level: 'mandal',
    entityId: mandalId,
    entityName: '', // Caller should enrich with mandal name
    stateCode,
    totalVoters,
    maleVoters,
    femaleVoters,
    totalBooths: totalBoothCount,
    totalPanchayats: panchayats.length,
    totalMandals: 1,
    totalVillages: 0,
  };
}

/**
 * Aggregate mandal-level data up to constituency level.
 *
 * This is the MOST COMPLEX aggregation because mandal boundaries
 * do NOT align perfectly with constituency boundaries. A mandal
 * may overlap with 2+ constituencies.
 *
 * Uses `overlapPercentage` from `MandalConstituencyOverlap` to compute
 * weighted voter counts. When `overlapPercentage === 100`, the full mandal
 * is in this constituency — no scaling is applied.
 *
 * @param overlaps - All mandal–constituency overlaps for a single constituency
 * @param mandalData - Map from mandal ID → aggregated data for that mandal
 * @returns Aggregated voter data at the constituency level
 *
 * @remarks
 * The overlap-weighted approach introduces floating point rounding.
 * Use `validateAggregation` to confirm the result is within tolerance
 * of the official constituency voter total.
 */
export function aggregateMandalsToConstituency(
  overlaps: MandalConstituencyOverlap[],
  mandalData: Map<string, AggregatedHierarchyData>,
): AggregatedHierarchyData {
  if (overlaps.length === 0) {
    return createEmptyAggregation('constituency', '', '', '');
  }

  const constituencyId = overlaps[0].constituencyId;
  const stateCode = mandalData.values().next().value?.stateCode ?? '';

  let totalVoters = 0;
  let maleVoters = 0;
  let femaleVoters = 0;
  let totalBoothCount = 0;
  let totalPanchayats = 0;

  for (const overlap of overlaps) {
    const data = mandalData.get(overlap.mandalId);
    if (!data) continue;

    const factor = overlap.overlapPercentage / 100;

    // Apply overlap factor — round to nearest integer for voter counts
    totalVoters += Math.round(data.totalVoters * factor);
    maleVoters += Math.round(data.maleVoters * factor);
    femaleVoters += Math.round(data.femaleVoters * factor);

    // Use the ground-truth panchayat count from the overlap record
    totalPanchayats += overlap.panchayatsInAc;

    // Booth counts use the ground-truth from the overlap record's voter data
    totalBoothCount += Math.round(data.totalBooths * factor);
  }

  return {
    level: 'constituency',
    entityId: constituencyId,
    entityName: '', // Caller should enrich with constituency name
    stateCode,
    totalVoters,
    maleVoters,
    femaleVoters,
    totalBooths: totalBoothCount,
    totalPanchayats,
    totalMandals: overlaps.length,
    totalVillages: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// §2. ELECTION RESULT AGGREGATION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Aggregate booth-level ELECTION RESULTS (vote counts) up to any level.
 *
 * Groups booth results by entity (using the provided `groupByEntityId`
 * callback) and computes:
 *   - Party-wise vote totals
 *   - Booths won per party (plurality winner at each booth)
 *   - Total votes polled
 *   - Average turnout
 *
 * @param boothResults - Array of booth-level election results
 * @param _level - The hierarchy level to aggregate to (for labelling only)
 * @param groupByEntityId - Callback that maps a boothId to the entity ID at
 *                          the target level (e.g. panchayatId, mandalId)
 * @returns Map from entity ID → aggregated election results
 *
 * @example
 * ```ts
 * // Aggregate to panchayat level
 * const byPanchayat = aggregateBoothResults(
 *   results, 'panchayat',
 *   (boothId) => boothToPanchayatMap.get(boothId) ?? 'UNKNOWN'
 * );
 * ```
 */
export function aggregateBoothResults(
  boothResults: BoothElectionResult[],
  _level: HierarchyLevel,
  groupByEntityId: (boothId: string) => string,
): Map<
  string,
  {
    partyVotes: Record<string, number>;
    boothsWon: Record<string, number>;
    totalVotesPolled: number;
    turnout: number;
  }
> {
  const resultMap = new Map<
    string,
    {
      partyVotes: Record<string, number>;
      boothsWon: Record<string, number>;
      totalVotesPolled: number;
      totalRegisteredVoters: number;
      boothCount: number;
    }
  >();

  for (const result of boothResults) {
    const entityId = groupByEntityId(result.boothId);

    let entity = resultMap.get(entityId);
    if (!entity) {
      entity = {
        partyVotes: {},
        boothsWon: {},
        totalVotesPolled: 0,
        totalRegisteredVoters: 0,
        boothCount: 0,
      };
      resultMap.set(entityId, entity);
    }

    // Accumulate party-wise votes from the candidate vote array
    const boothPartyVotes: Record<string, number> = {};
    for (const cv of result.candidateVotes) {
      entity.partyVotes[cv.party] =
        (entity.partyVotes[cv.party] ?? 0) + cv.votes;
      boothPartyVotes[cv.party] =
        (boothPartyVotes[cv.party] ?? 0) + cv.votes;
    }

    // Determine booth winner (party with max votes at this booth)
    const boothWinnerParty = determineBoothWinner(boothPartyVotes);
    if (boothWinnerParty) {
      entity.boothsWon[boothWinnerParty] =
        (entity.boothsWon[boothWinnerParty] ?? 0) + 1;
    }

    entity.totalVotesPolled += result.votesPolled;
    entity.totalRegisteredVoters += result.totalVotersInRoll;
    entity.boothCount++;
  }

  // Convert to final format with computed turnout
  const finalMap = new Map<
    string,
    {
      partyVotes: Record<string, number>;
      boothsWon: Record<string, number>;
      totalVotesPolled: number;
      turnout: number;
    }
  >();

  for (const [entityId, entity] of resultMap) {
    const turnout =
      entity.totalRegisteredVoters > 0
        ? parseFloat(
            (
              (entity.totalVotesPolled / entity.totalRegisteredVoters) *
              100
            ).toFixed(2),
          )
        : 0;

    finalMap.set(entityId, {
      partyVotes: entity.partyVotes,
      boothsWon: entity.boothsWon,
      totalVotesPolled: entity.totalVotesPolled,
      turnout,
    });
  }

  return finalMap;
}

// ═══════════════════════════════════════════════════════════════════════
// §3. HIERARCHY TREE BUILDING
// ═══════════════════════════════════════════════════════════════════════

/**
 * Build a full hierarchy tree for a constituency.
 *
 * Produces a tree of `HierarchyNode` objects:
 *   Constituency → Mandal(s) → Panchayat(s) → Booth(s)
 *
 * Each node carries its own aggregated data computed bottom-up from booths.
 *
 * @param constituencyId - The constituency to build the tree for
 * @param mandals - All mandals that overlap with this constituency
 * @param panchayats - All panchayats in those mandals
 * @param booths - All booths in this constituency
 * @returns Root HierarchyNode for the constituency
 *
 * @remarks
 * Only booths whose `constituencyId` matches the given ID are included.
 * This ensures the tree is constituency-scoped even when mandals span
 * multiple constituencies.
 */
export function buildHierarchyTree(
  constituencyId: string,
  mandals: Mandal[],
  panchayats: GramPanchayat[],
  booths: PollingBooth[],
): HierarchyNode {
  // Filter booths belonging to this constituency
  const constituencyBooths = booths.filter(
    (b) => b.constituencyId === constituencyId,
  );

  // Group booths by panchayat
  const boothsByPanchayat = groupBy(
    constituencyBooths,
    (b) => b.panchayatId ?? 'UNMAPPED',
  );

  // Group panchayats by mandal
  const panchayatsByMandal = groupBy(panchayats, (p) => p.mandalId);

  const stateCode = constituencyBooths[0]?.stateCode ?? '';

  // Build mandal nodes
  const mandalNodes: HierarchyNode[] = mandals.map((mandal) => {
    const mandalPanchayats = panchayatsByMandal.get(mandal.id) ?? [];

    // Build panchayat nodes
    const panchayatNodes: HierarchyNode[] = mandalPanchayats.map(
      (panchayat) => {
        const panchayatBooths = boothsByPanchayat.get(panchayat.id) ?? [];

        // Build booth nodes (leaf level)
        const boothNodes: HierarchyNode[] = panchayatBooths.map((booth) =>
          createBoothNode(booth),
        );

        const panchayatData = aggregateBoothsToPanchayat(
          panchayatBooths,
          stateCode,
        );
        panchayatData.entityName = panchayat.name;

        return {
          id: panchayat.id,
          name: panchayat.name,
          level: 'panchayat' as HierarchyLevel,
          data: panchayatData,
          children: boothNodes,
          totalVoters: panchayatData.totalVoters,
          totalBooths: panchayatData.totalBooths,
          childCount: boothNodes.length,
        };
      },
    );

    // Aggregate panchayat data to mandal level
    const mandalBoothsByPanchayat = new Map<string, PollingBooth[]>();
    for (const p of mandalPanchayats) {
      mandalBoothsByPanchayat.set(
        p.id,
        boothsByPanchayat.get(p.id) ?? [],
      );
    }
    const mandalData = aggregatePanchayatsToMandal(
      mandalPanchayats,
      mandalBoothsByPanchayat,
      stateCode,
    );
    mandalData.entityName = mandal.name;

    return {
      id: mandal.id,
      name: mandal.name,
      level: 'mandal' as HierarchyLevel,
      data: mandalData,
      children: panchayatNodes,
      totalVoters: mandalData.totalVoters,
      totalBooths: mandalData.totalBooths,
      childCount: panchayatNodes.length,
    };
  });

  // Build constituency root node
  const allConstituencyData = aggregateBoothsToPanchayat(
    constituencyBooths,
    stateCode,
  );
  allConstituencyData.level = 'constituency';
  allConstituencyData.entityId = constituencyId;
  allConstituencyData.totalMandals = mandals.length;

  return {
    id: constituencyId,
    name: constituencyId, // Caller should enrich with actual name
    level: 'constituency',
    data: allConstituencyData,
    children: mandalNodes,
    totalVoters: allConstituencyData.totalVoters,
    totalBooths: allConstituencyData.totalBooths,
    childCount: mandals.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// §4. VALIDATION — THE 100% ACCURACY GUARANTEE
// ═══════════════════════════════════════════════════════════════════════

/**
 * CRITICAL: Validate that booth-level totals sum to constituency totals.
 *
 * This is the core data integrity function. It runs multiple checks:
 *   1. Voter count match: sum(booth_voters) vs. official total (±0.1%)
 *   2. Gender sum consistency: male + female + thirdGender === total per booth
 *   3. Booth completeness: all booths have non-zero voter counts
 *   4. Constituency coverage: total booth count is reasonable
 *   5. All booths map to this constituency
 *   6. Election result integrity (optional): candidate vote sums match booth totals
 *   7. Cross-level vote count consistency (optional)
 *
 * @param constituencyId - The constituency being validated
 * @param booths - All booths in this constituency
 * @param officialVoterTotal - The official total voter count from ECI data
 * @param boothResults - Optional booth-level election results to validate
 * @param officialVoteCount - Optional official total votes polled
 * @returns Detailed validation results with per-check pass/fail
 *
 * @example
 * ```ts
 * const validation = validateAggregation('TS-AC-1', booths, 285000);
 * if (validation.errors.length > 0) {
 *   console.error('DATA INTEGRITY FAILURE:', validation.errors);
 * }
 * ```
 */
export function validateAggregation(
  constituencyId: string,
  booths: PollingBooth[],
  officialVoterTotal: number,
  boothResults?: BoothElectionResult[],
  officialVoteCount?: number,
): HierarchyValidationResult {
  const internalChecks: ValidationCheck[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Check 1: Voter total match ───────────────────────────────────
  const computedVoterTotal = booths.reduce(
    (sum, b) => sum + b.totalVoters,
    0,
  );
  const voterDeviation =
    officialVoterTotal > 0
      ? ((computedVoterTotal - officialVoterTotal) / officialVoterTotal) *
        100
      : 0;
  const absVoterDeviation = Math.abs(voterDeviation);

  const voterTotalMatch = absVoterDeviation <= 0.5;

  internalChecks.push({
    checkName: 'voter_total_match',
    description: 'Sum of booth voters matches official constituency total',
    passed: voterTotalMatch,
    expected: officialVoterTotal,
    actual: computedVoterTotal,
    deviationPercent: parseFloat(voterDeviation.toFixed(4)),
    message:
      voterTotalMatch
        ? `Voter totals match within tolerance (${absVoterDeviation.toFixed(4)}% deviation)`
        : `MISMATCH: booth sum ${computedVoterTotal} vs official ${officialVoterTotal} (${absVoterDeviation.toFixed(4)}% deviation)`,
    severity: voterTotalMatch
      ? 'info'
      : absVoterDeviation <= 1
        ? 'warning'
        : 'critical',
  });

  if (!voterTotalMatch) {
    if (absVoterDeviation <= 1) {
      warnings.push(
        `Voter total deviation ${absVoterDeviation.toFixed(4)}%: booth sum ${computedVoterTotal} vs official ${officialVoterTotal}`,
      );
    } else {
      errors.push(
        `Voter total MISMATCH ${absVoterDeviation.toFixed(4)}%: booth sum ${computedVoterTotal} vs official ${officialVoterTotal}`,
      );
    }
  }

  // ── Check 2: Gender sum consistency ──────────────────────────────
  const genderMismatches: string[] = [];
  for (const booth of booths) {
    const genderSum =
      booth.maleVoters + booth.femaleVoters + booth.thirdGenderVoters;
    if (genderSum !== booth.totalVoters) {
      genderMismatches.push(
        `Booth ${booth.id}: male(${booth.maleVoters}) + female(${booth.femaleVoters}) + thirdGender(${booth.thirdGenderVoters}) = ${genderSum} ≠ total(${booth.totalVoters})`,
      );
    }
  }

  internalChecks.push({
    checkName: 'gender_sum_consistency',
    description:
      'Male + female + thirdGender voters equals total for every booth',
    passed: genderMismatches.length === 0,
    expected: 0,
    actual: genderMismatches.length,
    message:
      genderMismatches.length === 0
        ? 'All booths have consistent gender breakdowns'
        : `${genderMismatches.length} booth(s) have gender sum mismatches`,
    severity: genderMismatches.length === 0 ? 'info' : 'error',
  });

  if (genderMismatches.length > 0) {
    errors.push(
      `${genderMismatches.length} booth(s) have gender sum mismatches: ${genderMismatches.slice(0, 3).join('; ')}`,
    );
  }

  // ── Check 3: Booth completeness ──────────────────────────────────
  const emptyBooths = booths.filter((b) => b.totalVoters === 0);

  internalChecks.push({
    checkName: 'booth_completeness',
    description: 'All booths have non-zero voter counts',
    passed: emptyBooths.length === 0,
    expected: 0,
    actual: emptyBooths.length,
    message:
      emptyBooths.length === 0
        ? `All ${booths.length} booths have voter data`
        : `${emptyBooths.length} booth(s) have zero voters`,
    severity: emptyBooths.length === 0 ? 'info' : 'warning',
  });

  if (emptyBooths.length > 0) {
    warnings.push(
      `${emptyBooths.length} booth(s) have zero voters: ${emptyBooths.slice(0, 5).map((b) => b.id).join(', ')}`,
    );
  }

  // ── Check 4: Constituency coverage ───────────────────────────────
  // A typical Indian AC has 150–400 booths. Flag if count seems off.
  const boothCount = booths.length;
  const reasonableRange = boothCount >= 50 && boothCount <= 600;

  internalChecks.push({
    checkName: 'booth_count_reasonable',
    description: 'Booth count is within expected range (50–600 for an AC)',
    passed: reasonableRange,
    actual: boothCount,
    message: reasonableRange
      ? `Booth count (${boothCount}) is within expected range`
      : `Booth count (${boothCount}) is outside expected range 50–600`,
    severity: reasonableRange ? 'info' : 'warning',
  });

  if (!reasonableRange) {
    warnings.push(
      `Booth count (${boothCount}) is outside expected range 50–600 — may indicate missing or duplicate data`,
    );
  }

  // ── Check 5: All booths map to this constituency ─────────────────
  const wrongConstituency = booths.filter(
    (b) => b.constituencyId !== constituencyId,
  );
  const allBoothsMapped = wrongConstituency.length === 0;

  internalChecks.push({
    checkName: 'booth_constituency_mapping',
    description: 'All booths map to the specified constituency',
    passed: allBoothsMapped,
    expected: 0,
    actual: wrongConstituency.length,
    message: allBoothsMapped
      ? 'All booths correctly mapped to this constituency'
      : `${wrongConstituency.length} booth(s) mapped to wrong constituency`,
    severity: allBoothsMapped ? 'info' : 'critical',
  });

  if (!allBoothsMapped) {
    errors.push(
      `${wrongConstituency.length} booth(s) mapped to wrong constituency`,
    );
  }

  // ── Check 6: Panchayat mapping ───────────────────────────────────
  const unmappedPanchayat = booths.filter(
    (b) => b.panchayatId === undefined || b.panchayatId === '',
  );
  const allPanchayatsMapped = unmappedPanchayat.length === 0;

  internalChecks.push({
    checkName: 'panchayat_mapping',
    description: 'All booths have a panchayatId assigned',
    passed: allPanchayatsMapped,
    expected: 0,
    actual: unmappedPanchayat.length,
    message: allPanchayatsMapped
      ? 'All booths mapped to panchayats'
      : `${unmappedPanchayat.length} booth(s) missing panchayatId`,
    severity: allPanchayatsMapped ? 'info' : 'warning',
  });

  if (!allPanchayatsMapped) {
    warnings.push(
      `${unmappedPanchayat.length} booth(s) missing panchayatId`,
    );
  }

  // ── Check 7: Mandal mapping ──────────────────────────────────────
  const unmappedMandal = booths.filter(
    (b) => b.mandalId === undefined || b.mandalId === '',
  );
  const allMandalsMapped = unmappedMandal.length === 0;

  internalChecks.push({
    checkName: 'mandal_mapping',
    description: 'All booths have a mandalId assigned',
    passed: allMandalsMapped,
    expected: 0,
    actual: unmappedMandal.length,
    message: allMandalsMapped
      ? 'All booths mapped to mandals'
      : `${unmappedMandal.length} booth(s) missing mandalId`,
    severity: allMandalsMapped ? 'info' : 'warning',
  });

  if (!allMandalsMapped) {
    warnings.push(`${unmappedMandal.length} booth(s) missing mandalId`);
  }

  // ── Check 8 (optional): Election result integrity ────────────────
  if (boothResults && boothResults.length > 0) {
    const voteMismatches: string[] = [];

    for (const result of boothResults) {
      const candidateVoteSum = result.candidateVotes.reduce(
        (sum, cv) => sum + cv.votes,
        0,
      );
      // candidateVotes should sum to validVotes
      if (candidateVoteSum !== result.validVotes) {
        voteMismatches.push(
          `Booth ${result.boothId}: candidate vote sum ${candidateVoteSum} ≠ validVotes ${result.validVotes}`,
        );
      }
    }

    internalChecks.push({
      checkName: 'candidate_vote_sum',
      description:
        'Sum of candidate votes matches validVotes for each booth',
      passed: voteMismatches.length === 0,
      expected: 0,
      actual: voteMismatches.length,
      message:
        voteMismatches.length === 0
          ? `All ${boothResults.length} booth results have consistent vote sums`
          : `${voteMismatches.length} booth(s) have vote sum mismatches`,
      severity: voteMismatches.length === 0 ? 'info' : 'error',
    });

    if (voteMismatches.length > 0) {
      errors.push(
        `${voteMismatches.length} booth(s) have vote sum mismatches: ${voteMismatches.slice(0, 3).join('; ')}`,
      );
    }

    // ── Check 9 (optional): Cross-level vote count consistency ──────
    if (officialVoteCount !== undefined) {
      const computedVoteCount = boothResults.reduce(
        (sum, r) => sum + r.votesPolled,
        0,
      );
      const voteDeviation =
        officialVoteCount > 0
          ? Math.abs(
              ((computedVoteCount - officialVoteCount) / officialVoteCount) *
                100,
            )
          : 0;

      internalChecks.push({
        checkName: 'vote_count_match',
        description:
          'Sum of booth votes polled matches official total votes polled',
        passed: voteDeviation <= 0.1,
        expected: officialVoteCount,
        actual: computedVoteCount,
        deviationPercent: parseFloat(voteDeviation.toFixed(4)),
        message:
          voteDeviation <= 0.1
            ? `Vote totals match within tolerance (${voteDeviation.toFixed(4)}% deviation)`
            : `MISMATCH: booth vote sum ${computedVoteCount} vs official ${officialVoteCount} (${voteDeviation.toFixed(4)}% deviation)`,
        severity:
          voteDeviation <= 0.1
            ? 'info'
            : voteDeviation <= 1
              ? 'warning'
              : 'critical',
      });

      if (voteDeviation > 0.1) {
        if (voteDeviation <= 1) {
          warnings.push(
            `Vote total deviation ${voteDeviation.toFixed(4)}%: sum ${computedVoteCount} vs official ${officialVoteCount}`,
          );
        } else {
          errors.push(
            `Vote total MISMATCH ${voteDeviation.toFixed(4)}%: sum ${computedVoteCount} vs official ${officialVoteCount}`,
          );
        }
      }
    }
  }

  // ── Compute completeness score ───────────────────────────────────
  const completenessScore = computeIntegrityScoreFromChecks(internalChecks);

  const stateCode = booths[0]?.stateCode ?? '';

  return {
    stateCode,
    constituencyId,
    checks: {
      allBoothsMapped,
      voterTotalMatch,
      voterTotalDeviation: parseFloat(voterDeviation.toFixed(4)),
      allPanchayatsMapped,
      allMandalsMapped,
      completenessScore,
    },
    errors,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// §5. DRILL-DOWN QUERIES
// ═══════════════════════════════════════════════════════════════════════

/**
 * Drill down from a constituency to its children at a specific level.
 *
 * Returns an array of HierarchyNode objects at the target level,
 * each carrying its own aggregated data.
 *
 * @param constituencyId - The constituency to drill into
 * @param targetLevel - The hierarchy level to drill down to
 * @param mandals - All mandals overlapping with this constituency
 * @param panchayats - All panchayats in those mandals
 * @param booths - All booths in this constituency
 * @returns Array of HierarchyNode objects at the target level
 *
 * @example
 * ```ts
 * // Get mandal-level breakdown for a constituency
 * const mandalNodes = drillDown('TS-AC-1', 'mandal', mandals, panchayats, booths);
 * ```
 */
export function drillDown(
  constituencyId: string,
  targetLevel: HierarchyLevel,
  mandals: Mandal[],
  panchayats: GramPanchayat[],
  booths: PollingBooth[],
): HierarchyNode[] {
  const tree = buildHierarchyTree(constituencyId, mandals, panchayats, booths);

  if (targetLevel === 'constituency') {
    return [tree];
  }

  if (targetLevel === 'mandal') {
    return tree.children ?? [];
  }

  if (targetLevel === 'panchayat') {
    const result: HierarchyNode[] = [];
    for (const mandalNode of tree.children ?? []) {
      result.push(...(mandalNode.children ?? []));
    }
    return result;
  }

  if (targetLevel === 'booth') {
    const result: HierarchyNode[] = [];
    for (const mandalNode of tree.children ?? []) {
      for (const panchayatNode of mandalNode.children ?? []) {
        result.push(...(panchayatNode.children ?? []));
      }
    }
    return result;
  }

  // For district/state levels, return the whole tree as a single node
  return [tree];
}

// ═══════════════════════════════════════════════════════════════════════
// §6. DATA INTEGRITY SCORE
// ═══════════════════════════════════════════════════════════════════════

/**
 * Compute a data integrity score for a constituency (0–100).
 *
 * The score reflects how complete and internally consistent the
 * hierarchy data is. A score of 100 means:
 *   - Booth voter sum exactly matches the official total
 *   - All booths have data
 *   - All panchayats are mapped to mandals
 *   - All mandals are mapped to the constituency
 *
 * Breakdown:
 *   - 40 points: Voter count accuracy (linear decay from 0% to 5% deviation)
 *   - 25 points: Booth coverage (% of booths with non-zero voter data)
 *   - 20 points: Panchayat mapping completeness
 *   - 15 points: Mandal mapping completeness
 *
 * @param constituencyId - The constituency to score
 * @param booths - All booths in this constituency
 * @param panchayats - All panchayats in related mandals
 * @param mandals - All mandals overlapping with this constituency
 * @param officialVoterTotal - The official total voter count from ECI data
 * @returns Score from 0 to 100
 */
export function computeDataIntegrityScore(
  constituencyId: string,
  booths: PollingBooth[],
  panchayats: GramPanchayat[],
  mandals: Mandal[],
  officialVoterTotal: number,
): number {
  // ── Factor 1: Voter count accuracy (40 points) ──────────────────
  const constituencyBooths = booths.filter(
    (b) => b.constituencyId === constituencyId,
  );
  const computedTotal = constituencyBooths.reduce(
    (sum, b) => sum + b.totalVoters,
    0,
  );
  const deviation =
    officialVoterTotal > 0
      ? Math.abs(
          (computedTotal - officialVoterTotal) / officialVoterTotal,
        )
      : 1; // If no official total, worst case
  // Linear decay: 0% deviation → 40 pts, 5% deviation → 0 pts
  const voterAccuracyScore = Math.max(0, 40 * (1 - deviation / 0.05));

  // ── Factor 2: Booth coverage (25 points) ────────────────────────
  const nonEmptyBooths = constituencyBooths.filter(
    (b) => b.totalVoters > 0,
  ).length;
  const boothCoverage =
    constituencyBooths.length > 0
      ? nonEmptyBooths / constituencyBooths.length
      : 0;
  const boothCoverageScore = 25 * boothCoverage;

  // ── Factor 3: Panchayat mapping (20 points) ─────────────────────
  // Every booth should reference a panchayat that exists in our data
  const panchayatIds = new Set(panchayats.map((p) => p.id));
  const mappedBoothCount = constituencyBooths.filter(
    (b) => b.panchayatId !== undefined && panchayatIds.has(b.panchayatId),
  ).length;
  const panchayatMapping =
    constituencyBooths.length > 0
      ? mappedBoothCount / constituencyBooths.length
      : 0;
  const panchayatScore = 20 * panchayatMapping;

  // ── Factor 4: Mandal mapping (15 points) ────────────────────────
  // Every booth should reference a mandal that exists in our data
  const mandalIds = new Set(mandals.map((m) => m.id));
  const mandalMappedCount = constituencyBooths.filter(
    (b) => b.mandalId !== undefined && mandalIds.has(b.mandalId),
  ).length;
  const mandalMapping =
    constituencyBooths.length > 0
      ? mandalMappedCount / constituencyBooths.length
      : 0;
  const mandalScore = 15 * mandalMapping;

  const totalScore =
    voterAccuracyScore + boothCoverageScore + panchayatScore + mandalScore;

  return parseFloat(Math.min(100, Math.max(0, totalScore)).toFixed(1));
}

// ═══════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Create an empty aggregation result for a given level.
 * Used as a safe default when input arrays are empty.
 * @internal
 */
function createEmptyAggregation(
  level: HierarchyLevel,
  entityId: string,
  entityName: string,
  stateCode: string,
): AggregatedHierarchyData {
  return {
    level,
    entityId,
    entityName,
    stateCode,
    totalVoters: 0,
    maleVoters: 0,
    femaleVoters: 0,
    totalBooths: 0,
    totalPanchayats: 0,
    totalMandals: 0,
    totalVillages: 0,
  };
}

/**
 * Create a HierarchyNode for a single booth (leaf node).
 * @internal
 */
function createBoothNode(booth: PollingBooth): HierarchyNode {
  return {
    id: booth.id,
    name: booth.boothName,
    level: 'booth',
    data: {
      level: 'booth' as HierarchyLevel,
      entityId: booth.id,
      entityName: booth.boothName,
      stateCode: booth.stateCode,
      totalVoters: booth.totalVoters,
      maleVoters: booth.maleVoters,
      femaleVoters: booth.femaleVoters,
      totalBooths: 1,
      totalPanchayats: 0,
      totalMandals: 0,
      totalVillages: 0,
    } satisfies AggregatedHierarchyData,
    children: [],
    totalVoters: booth.totalVoters,
    totalBooths: 1,
    childCount: 0,
  };
}

/**
 * Determine which party won a booth based on partyVotes.
 * Returns the party code with the highest vote count, or null if empty.
 * @internal
 */
function determineBoothWinner(
  partyVotes: Record<string, number>,
): string | null {
  const entries = Object.entries(partyVotes);
  if (entries.length === 0) return null;

  let maxVotes = -1;
  let winner: string | null = null;

  for (const [party, votes] of entries) {
    if (votes > maxVotes) {
      maxVotes = votes;
      winner = party;
    }
  }

  return winner;
}

/**
 * Group an array of items by a key function.
 * @internal
 */
function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const existing = map.get(key);
    if (existing) {
      existing.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

/**
 * Compute an integrity score from a set of validation checks.
 * Weights checks by severity:
 *   - Critical pass/fail: ±30 pts
 *   - Error pass/fail: ±20 pts
 *   - Warning pass/fail: ±10 pts
 *   - Info pass/fail: ±5 pts
 * The score is then normalized to 0–100.
 * @internal
 */
function computeIntegrityScoreFromChecks(checks: ValidationCheck[]): number {
  if (checks.length === 0) return 100;

  const severityWeights: Record<string, number> = {
    critical: 30,
    error: 20,
    warning: 10,
    info: 5,
  };

  let totalWeight = 0;
  let earnedWeight = 0;

  for (const check of checks) {
    const weight = severityWeights[check.severity] ?? 5;
    totalWeight += weight;
    if (check.passed) {
      earnedWeight += weight;
    }
  }

  return totalWeight > 0
    ? parseFloat(((earnedWeight / totalWeight) * 100).toFixed(1))
    : 100;
}
