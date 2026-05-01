/**
 * Constituency Mapper — Old-to-New Boundary Mapping
 *
 * Maps existing constituencies to proposed new constituencies
 * based on geographic overlap, population transfer, and voter migration.
 *
 * This is the bridge between the old political world and the new one.
 * Every sitting MLA, party, civic issue, and promise needs to be
 * re-mapped when boundaries change.
 */

import type {
  ConstituencyMapping,
  BoundaryChangeType,
  ReservationChange,
  MLAImpact,
  ImpactSeverity,
} from '../delimitationTypes';
import { determineImpactSeverity } from '../delimitationTypes';

// ─── TYPES ───

export interface OldConstituency {
  acNo: number;
  name: string;
  stateCode: string;
  districtName: string;
  reservationType: 'GEN' | 'SC' | 'ST';
  population: number;
  voterCount: number;
  mlaName?: string;
  party?: string;
  winMargin?: number;
  winMarginPercent?: number;
}

export interface NewConstituency {
  acNo: number;
  name: string;
  stateCode: string;
  districtName: string;
  reservationType: 'GEN' | 'SC' | 'ST';
  proposedPopulation: number;
}

export interface OverlapRecord {
  oldAcNo: number;
  newAcNo: number;
  overlapPercentage: number; // what % of old AC territory goes into new AC
  populationTransferred: number;
  votersTransferred: number;
}

export interface MappingResult {
  mappings: ConstituencyMapping[];
  mlaImpacts: MLAImpact[];
  changeTypeSummary: Record<BoundaryChangeType, number>;
  reservationChangeSummary: Record<ReservationChange, number>;
}

// ─── CORE MAPPER ───

/**
 * Generate constituency mappings from overlap data.
 *
 * @param oldConstituencies — current constituencies
 * @param newConstituencies — proposed new constituencies
 * @param overlaps — geographic overlap records (from GIS analysis or simulation)
 * @param proposalId — ID of the delimitation proposal
 */
export function generateMappings(
  oldConstituencies: OldConstituency[],
  newConstituencies: NewConstituency[],
  overlaps: OverlapRecord[],
  proposalId: string,
): MappingResult {
  const mappings: ConstituencyMapping[] = [];
  const changeTypeSummary: Record<BoundaryChangeType, number> = {
    unchanged: 0, minor_adjust: 0, major_redraw: 0,
    split: 0, merged: 0, new: 0, abolished: 0,
  };
  const reservationChangeSummary: Record<ReservationChange, number> = {
    gen_to_sc: 0, gen_to_st: 0, sc_to_gen: 0,
    sc_to_st: 0, st_to_gen: 0, st_to_sc: 0, unchanged: 0,
  };

  // Build overlap lookup: old → new[]
  const oldToNew = new Map<number, OverlapRecord[]>();
  const newToOld = new Map<number, OverlapRecord[]>();

  for (const o of overlaps) {
    if (!oldToNew.has(o.oldAcNo)) oldToNew.set(o.oldAcNo, []);
    oldToNew.get(o.oldAcNo)!.push(o);

    if (!newToOld.has(o.newAcNo)) newToOld.set(o.newAcNo, []);
    newToOld.get(o.newAcNo)!.push(o);
  }

  // Generate mapping records
  for (const overlap of overlaps) {
    const oldAC = oldConstituencies.find((c) => c.acNo === overlap.oldAcNo);
    const newAC = newConstituencies.find((c) => c.acNo === overlap.newAcNo);
    if (!oldAC || !newAC) continue;

    mappings.push({
      id: `map-${overlap.oldAcNo}-${overlap.newAcNo}`,
      proposalId,
      stateCode: oldAC.stateCode,
      oldAcNo: overlap.oldAcNo,
      oldName: oldAC.name,
      newAcNo: overlap.newAcNo,
      newName: newAC.name,
      overlapPercentage: overlap.overlapPercentage,
      populationTransferred: overlap.populationTransferred,
      votersTransferred: overlap.votersTransferred,
    });
  }

  // Classify change types for each new constituency
  for (const newAC of newConstituencies) {
    const predecessors = newToOld.get(newAC.acNo) ?? [];
    const changeType = classifyChangeType(predecessors);
    changeTypeSummary[changeType]++;
  }

  // Classify reservation changes
  for (const newAC of newConstituencies) {
    const predecessors = newToOld.get(newAC.acNo) ?? [];
    if (predecessors.length === 0) continue;

    // Find primary predecessor (highest overlap)
    const primary = predecessors.sort((a, b) => b.overlapPercentage - a.overlapPercentage)[0];
    const oldAC = oldConstituencies.find((c) => c.acNo === primary.oldAcNo);
    if (!oldAC) continue;

    const resChange = classifyReservationChange(oldAC.reservationType, newAC.reservationType);
    reservationChangeSummary[resChange]++;
  }

  // Generate MLA impacts
  const mlaImpacts = generateMLAImpacts(oldConstituencies, newConstituencies, oldToNew);

  return { mappings, mlaImpacts, changeTypeSummary, reservationChangeSummary };
}

/**
 * Classify the type of boundary change for a new constituency
 * based on its predecessor overlaps.
 */
export function classifyChangeType(predecessors: OverlapRecord[]): BoundaryChangeType {
  if (predecessors.length === 0) return 'new';

  // Single predecessor with >90% overlap = unchanged or minor
  if (predecessors.length === 1 && predecessors[0].overlapPercentage > 90) {
    return predecessors[0].overlapPercentage > 98 ? 'unchanged' : 'minor_adjust';
  }

  // Single predecessor with 50-90% overlap = major redraw
  if (predecessors.length === 1 && predecessors[0].overlapPercentage > 50) {
    return 'major_redraw';
  }

  // Multiple predecessors = merged
  if (predecessors.length >= 2) {
    const totalOverlap = predecessors.reduce((s, p) => s + p.overlapPercentage, 0);
    if (totalOverlap > 80) return 'merged';
    return 'major_redraw';
  }

  return 'major_redraw';
}

/**
 * Classify reservation change between old and new constituency.
 */
export function classifyReservationChange(
  oldType: 'GEN' | 'SC' | 'ST',
  newType: 'GEN' | 'SC' | 'ST',
): ReservationChange {
  if (oldType === newType) return 'unchanged';
  return `${oldType.toLowerCase()}_to_${newType.toLowerCase()}` as ReservationChange;
}

/**
 * Generate MLA impact assessments based on boundary changes.
 */
function generateMLAImpacts(
  oldConstituencies: OldConstituency[],
  newConstituencies: NewConstituency[],
  oldToNew: Map<number, OverlapRecord[]>,
): MLAImpact[] {
  const impacts: MLAImpact[] = [];

  for (const oldAC of oldConstituencies) {
    if (!oldAC.mlaName) continue;

    const successors = oldToNew.get(oldAC.acNo) ?? [];
    const changeType = classifySuccessorChangeType(successors);

    // Find primary successor (where most of old AC territory goes)
    const primarySuccessor = successors.length > 0
      ? successors.sort((a, b) => b.overlapPercentage - a.overlapPercentage)[0]
      : undefined;

    const newAC = primarySuccessor
      ? newConstituencies.find((c) => c.acNo === primarySuccessor.newAcNo)
      : undefined;

    const reservationChange = newAC
      ? classifyReservationChange(oldAC.reservationType, newAC.reservationType)
      : 'unchanged';

    const severity = determineImpactSeverity(changeType, reservationChange);

    const riskFactors: string[] = [];
    const opportunities: string[] = [];

    // Analyze risks
    if (changeType === 'abolished') {
      riskFactors.push('Constituency abolished — must find a new seat');
    }
    if (changeType === 'split') {
      riskFactors.push('Constituency split — must choose which fragment to contest');
      const fragments = successors.filter((s) => s.overlapPercentage > 20);
      if (fragments.length > 1) {
        riskFactors.push(`Voter base split across ${fragments.length} new constituencies`);
      }
    }
    if (reservationChange !== 'unchanged') {
      riskFactors.push(`Reservation changes: ${oldAC.reservationType} → ${newAC?.reservationType ?? 'TBD'}`);
    }
    if (primarySuccessor && primarySuccessor.overlapPercentage < 60) {
      riskFactors.push(`Only ${primarySuccessor.overlapPercentage.toFixed(0)}% of voters remain in primary successor constituency`);
    }

    // Analyze opportunities
    if (changeType === 'unchanged' || changeType === 'minor_adjust') {
      opportunities.push('Minimal disruption — existing ground network intact');
    }
    if (primarySuccessor && primarySuccessor.overlapPercentage > 80) {
      opportunities.push('Strong base retained in new constituency');
    }
    if (oldAC.winMarginPercent && oldAC.winMarginPercent > 15) {
      opportunities.push('Large margin provides buffer against boundary changes');
    }

    impacts.push({
      mlaName: oldAC.mlaName,
      party: oldAC.party ?? 'IND',
      currentAcNo: oldAC.acNo,
      currentAcName: oldAC.name,
      stateCode: oldAC.stateCode,
      seatChangeType: changeType,
      reservationChange,
      primaryNewAcNo: primarySuccessor?.newAcNo,
      primaryNewAcName: newAC?.name,
      currentMargin: oldAC.winMargin ?? 0,
      currentMarginPercent: oldAC.winMarginPercent ?? 0,
      impactSeverity: severity,
      riskFactors,
      opportunities,
    });
  }

  return impacts;
}

/**
 * Classify change type from the perspective of the OLD constituency
 * (i.e., what happens to this old constituency?)
 */
function classifySuccessorChangeType(successors: OverlapRecord[]): BoundaryChangeType {
  if (successors.length === 0) return 'abolished';

  // All territory goes to one successor
  if (successors.length === 1 && successors[0].overlapPercentage > 90) {
    return successors[0].overlapPercentage > 98 ? 'unchanged' : 'minor_adjust';
  }

  // Territory split across multiple successors
  if (successors.length >= 2) {
    const significantSuccessors = successors.filter((s) => s.overlapPercentage > 20);
    if (significantSuccessors.length >= 2) return 'split';
  }

  return 'major_redraw';
}

/**
 * Find which new constituency an old constituency primarily maps to.
 */
export function findPrimarySuccessor(
  oldAcNo: number,
  mappings: ConstituencyMapping[],
): ConstituencyMapping | undefined {
  const relevant = mappings
    .filter((m) => m.oldAcNo === oldAcNo)
    .sort((a, b) => b.overlapPercentage - a.overlapPercentage);
  return relevant[0];
}

/**
 * Find which old constituencies primarily contribute to a new constituency.
 */
export function findPrimaryPredecessors(
  newAcNo: number,
  mappings: ConstituencyMapping[],
): ConstituencyMapping[] {
  return mappings
    .filter((m) => m.newAcNo === newAcNo)
    .sort((a, b) => b.overlapPercentage - a.overlapPercentage);
}

/**
 * Re-map civic issues from old to new constituencies.
 * Returns a mapping of issueId → newAcNo based on geographic overlap.
 */
export function remapCivicIssues(
  issues: Array<{ id: string; acNo: number }>,
  mappings: ConstituencyMapping[],
): Array<{ issueId: string; oldAcNo: number; newAcNo: number; newName: string }> {
  return issues.map((issue) => {
    const successor = findPrimarySuccessor(issue.acNo, mappings);
    return {
      issueId: issue.id,
      oldAcNo: issue.acNo,
      newAcNo: successor?.newAcNo ?? issue.acNo,
      newName: successor?.newName ?? 'Unknown',
    };
  });
}
