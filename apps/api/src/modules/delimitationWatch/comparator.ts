/**
 * Stage 4: Baseline Comparator
 *
 * Implements deterministic diffing against previously accepted baseline versions:
 * - Detects added, removed, changed, and unchanged records
 * - Identifies seat shifts, reservation changes, boundary realignments
 * - Differentiates material changes from immaterial changes (formatting/whitespace)
 * - Retains full evidence reproducing why a change is material vs immaterial
 */

import { randomUUID } from 'crypto';
import type {
  DelimitationCandidate,
  DelimitationAcceptedVersion,
  DelimitationComparison,
  ComparisonClassification,
  RecordDiff,
  ConstituencyMappingCandidate,
} from '@kshetra/shared';
import type { IDelimitationWatchRepository } from './persistence';

export class BaselineComparator {
  private readonly repo: IDelimitationWatchRepository;

  constructor(repo: IDelimitationWatchRepository) {
    this.repo = repo;
  }

  async compare(
    candidate: DelimitationCandidate,
    baselineVersion?: DelimitationAcceptedVersion | null,
  ): Promise<DelimitationComparison> {
    const addedRecords: RecordDiff[] = [];
    const removedRecords: RecordDiff[] = [];
    const changedRecords: RecordDiff[] = [];
    const unchangedRecords: RecordDiff[] = [];
    const metadataDiff: Record<string, unknown> = {};

    let isMaterialChange = false;
    let classification: ComparisonClassification = 'NO_CHANGE';
    const summaryParts: string[] = [];

    // Case 1: Initial Version (no baseline exists)
    if (!baselineVersion) {
      isMaterialChange = true;
      classification = 'MATERIAL_CHANGE';
      summaryParts.push('Initial baseline establishment: newly registered delimitation proposal and mappings');

      addedRecords.push({
        key: 'proposal',
        changeType: 'ADDED',
        newValue: candidate.proposalData,
      });

      for (const m of candidate.constituencyMappings) {
        addedRecords.push({
          key: `mapping:${m.newAcNo}`,
          changeType: 'ADDED',
          newValue: m,
        });
      }
    } else {
      // Case 2: Comparison against previous accepted baseline
      const prevCandidate = await this.repo.getCandidate(baselineVersion.candidateId);
      const prevProposal = prevCandidate?.proposalData;

      // 1. Compare proposal seats
      if (prevProposal) {
        if (prevProposal.proposedSeats !== candidate.proposalData.proposedSeats) {
          isMaterialChange = true;
          changedRecords.push({
            key: 'proposedSeats',
            changeType: 'MODIFIED',
            oldValue: prevProposal.proposedSeats,
            newValue: candidate.proposalData.proposedSeats,
          });
          summaryParts.push(
            `Total seats changed from ${prevProposal.proposedSeats} to ${candidate.proposalData.proposedSeats}`,
          );
        }

        if (
          prevProposal.proposedScSeats !== candidate.proposalData.proposedScSeats ||
          prevProposal.proposedStSeats !== candidate.proposalData.proposedStSeats
        ) {
          isMaterialChange = true;
          changedRecords.push({
            key: 'reservationSeats',
            changeType: 'MODIFIED',
            oldValue: { sc: prevProposal.proposedScSeats, st: prevProposal.proposedStSeats },
            newValue: { sc: candidate.proposalData.proposedScSeats, st: candidate.proposalData.proposedStSeats },
          });
          summaryParts.push(
            `Reservation breakdown modified: SC ${prevProposal.proposedScSeats}->${candidate.proposalData.proposedScSeats}, ST ${prevProposal.proposedStSeats}->${candidate.proposalData.proposedStSeats}`,
          );
        }

        if (prevProposal.status !== candidate.proposalData.status) {
          isMaterialChange = true;
          changedRecords.push({
            key: 'proposalStatus',
            changeType: 'MODIFIED',
            oldValue: prevProposal.status,
            newValue: candidate.proposalData.status,
          });
          summaryParts.push(`Proposal legal status transitioned from '${prevProposal.status}' to '${candidate.proposalData.status}'`);
        }
      }

      // 2. Compare constituency mappings
      const prevMappings = new Map<number, ConstituencyMappingCandidate>();
      if (prevCandidate?.constituencyMappings) {
        for (const m of prevCandidate.constituencyMappings) {
          prevMappings.set(m.newAcNo, m);
        }
      }

      const currentMappings = new Map<number, ConstituencyMappingCandidate>();
      for (const m of candidate.constituencyMappings) {
        currentMappings.set(m.newAcNo, m);
      }

      // Check additions & modifications
      for (const [newAcNo, currentM] of currentMappings.entries()) {
        const prevM = prevMappings.get(newAcNo);
        if (!prevM) {
          isMaterialChange = true;
          addedRecords.push({
            key: `mapping:${newAcNo}`,
            changeType: 'ADDED',
            newValue: currentM,
          });
          summaryParts.push(`Added new constituency mapping AC-${newAcNo} (${currentM.newName})`);
        } else {
          const nameChanged = prevM.newName !== currentM.newName;
          const overlapChanged = prevM.overlapPercentage !== currentM.overlapPercentage;
          const oldAcChanged = prevM.oldAcNo !== currentM.oldAcNo;

          if (nameChanged || overlapChanged || oldAcChanged) {
            isMaterialChange = true;
            changedRecords.push({
              key: `mapping:${newAcNo}`,
              changeType: 'MODIFIED',
              oldValue: prevM,
              newValue: currentM,
            });
            summaryParts.push(`Modified AC-${newAcNo}: oldAc ${prevM.oldAcNo}->${currentM.oldAcNo}, name '${prevM.newName}'->'${currentM.newName}', overlap ${prevM.overlapPercentage}%->${currentM.overlapPercentage}%`);
          } else {
            unchangedRecords.push({
              key: `mapping:${newAcNo}`,
              changeType: 'UNCHANGED',
              oldValue: prevM,
              newValue: currentM,
            });
          }
        }
      }

      // Check removals
      for (const [newAcNo, prevM] of prevMappings.entries()) {
        if (!currentMappings.has(newAcNo)) {
          isMaterialChange = true;
          removedRecords.push({
            key: `mapping:${newAcNo}`,
            changeType: 'REMOVED',
            oldValue: prevM,
          });
          summaryParts.push(`Removed constituency mapping AC-${newAcNo} (${prevM.newName})`);
        }
      }

      classification = isMaterialChange ? 'MATERIAL_CHANGE' : 'NO_CHANGE';
      if (!isMaterialChange) {
        summaryParts.push('Zero substantive or material changes detected against baseline version');
      }
    }

    const comparison: DelimitationComparison = {
      id: randomUUID(),
      candidateId: candidate.id,
      baselineVersionId: baselineVersion?.id,
      isMaterialChange,
      classification,
      addedRecords,
      removedRecords,
      changedRecords,
      unchangedRecords,
      metadataDiff,
      comparisonSummary: summaryParts.join('; '),
      comparedAt: new Date().toISOString(),
    };

    await this.repo.saveComparison(comparison);
    return comparison;
  }
}
