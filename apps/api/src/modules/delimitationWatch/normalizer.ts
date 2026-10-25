/**
 * Stage 2: Normalizer
 *
 * Converts captured raw snapshot payloads into canonical DelimitationCandidate records:
 * - Deterministic parsing using parser version 'v1.0.0'
 * - Preserves provenance and source document references
 * - Distinguishes proposed changes from enacted/official changes
 * - Does not invent missing values
 * - Enforces W012 data status semantics
 */

import { randomUUID } from 'crypto';
import type {
  DelimitationSnapshot,
  DelimitationWatchSource,
  DelimitationCandidate,
  DelimitationProposalCandidate,
  ConstituencyMappingCandidate,
  W012DataStatus,
} from '@kshetra/shared';
import type { IDelimitationWatchRepository } from './persistence';

export const CURRENT_PARSER_VERSION = 'v1.0.0';

export class Normalizer {
  constructor(private readonly repo: IDelimitationWatchRepository) {}

  async normalize(snapshot: DelimitationSnapshot, source: DelimitationWatchSource): Promise<DelimitationCandidate> {
    if (!snapshot.rawContent || snapshot.rawContent.trim() === '') {
      throw new Error('NORMALIZATION_ERROR: Snapshot raw content is empty');
    }

    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(snapshot.rawContent);
    } catch (err: any) {
      throw new Error(`NORMALIZATION_ERROR: Failed to parse snapshot JSON: ${err.message}`);
    }

    // 1. Extract and validate required proposal fields
    const rawProposal = parsedPayload.proposal || parsedPayload;

    const stateCode = (rawProposal.stateCode || rawProposal.state_code || source.geographicScope.replace('IN-', '')).toUpperCase();
    const title = rawProposal.title || `${source.name} - ${stateCode} Delimitation`;
    const description = rawProposal.description || rawProposal.summary;
    const proposalStatus = rawProposal.status === 'final' ? 'final' : 'draft';

    const currentSeats = Number(rawProposal.currentSeats ?? rawProposal.current_seats ?? 0);
    const proposedSeats = Number(rawProposal.proposedSeats ?? rawProposal.proposed_seats ?? 0);
    const currentScSeats = Number(rawProposal.currentScSeats ?? rawProposal.current_sc_seats ?? 0);
    const currentStSeats = Number(rawProposal.currentStSeats ?? rawProposal.current_st_seats ?? 0);
    const proposedScSeats = Number(rawProposal.proposedScSeats ?? rawProposal.proposed_sc_seats ?? 0);
    const proposedStSeats = Number(rawProposal.proposedStSeats ?? rawProposal.proposed_st_seats ?? 0);

    const proposalData: DelimitationProposalCandidate = {
      stateCode,
      proposalNumber: rawProposal.proposalNumber || rawProposal.proposal_number,
      title,
      description,
      status: proposalStatus,
      commissionId: rawProposal.commissionId || rawProposal.commission_id,
      currentSeats,
      proposedSeats,
      currentScSeats,
      currentStSeats,
      proposedScSeats,
      proposedStSeats,
      gazetteUrl: rawProposal.gazetteUrl || rawProposal.gazette_url || source.canonicalUrl,
      sourceUrl: rawProposal.sourceUrl || rawProposal.source_url || source.canonicalUrl,
      publishedAt: rawProposal.publishedAt || rawProposal.published_at || snapshot.declaredPublicationDate,
      objectionsDeadline: rawProposal.objectionsDeadline || rawProposal.objections_deadline,
      delimitationRegimeId: rawProposal.delimitationRegimeId || rawProposal.delimitation_regime_id,
      provenanceId: rawProposal.provenanceId || rawProposal.provenance_id,
      metadata: rawProposal.metadata || {},
    };

    // 2. Extract and normalize constituency mappings
    const rawMappings: any[] = Array.isArray(parsedPayload.constituencyMappings)
      ? parsedPayload.constituencyMappings
      : Array.isArray(parsedPayload.mappings)
      ? parsedPayload.mappings
      : [];

    const constituencyMappings: ConstituencyMappingCandidate[] = rawMappings.map((m: any, idx: number) => {
      const oldAcNo = Number(m.oldAcNo ?? m.old_ac_no ?? m.predecessor_ac_no ?? 0);
      const newAcNo = Number(m.newAcNo ?? m.new_ac_no ?? 0);
      const oldName = String(m.oldName ?? m.old_name ?? `AC-${oldAcNo}`);
      const newName = String(m.newName ?? m.new_name ?? `AC-${newAcNo}`);
      const overlapPct = Number(m.overlapPercentage ?? m.overlap_percentage ?? 100);

      return {
        stateCode,
        oldAcNo,
        oldName,
        newAcNo,
        newName,
        overlapPercentage: overlapPct,
        populationTransferred: m.populationTransferred ?? m.population_transferred,
        votersTransferred: m.votersTransferred ?? m.voters_transferred,
        notes: m.notes,
      };
    });

    // 3. Determine data status and isProposed flag
    // Invariant: Proposals remain SCENARIO or UNVERIFIED unless backed by statutory/constitutional authority AND marked final
    const isEnactedFinal = proposalStatus === 'final' && source.authorityClassification === 'statutory';
    const isProposed = !isEnactedFinal;

    let normalizedDataStatus: W012DataStatus;
    if (isEnactedFinal) {
      normalizedDataStatus = 'OFFICIAL';
    } else if (rawProposal.dataStatus) {
      normalizedDataStatus = rawProposal.dataStatus as W012DataStatus;
    } else if (source.authorityClassification === 'synthetic_model') {
      normalizedDataStatus = 'SCENARIO';
    } else {
      normalizedDataStatus = 'UNVERIFIED';
    }

    const candidate: DelimitationCandidate = {
      id: randomUUID(),
      snapshotId: snapshot.id,
      sourceId: source.id,
      parserVersion: CURRENT_PARSER_VERSION,
      proposalData,
      constituencyMappings,
      normalizedDataStatus,
      isProposed,
      provenanceId: proposalData.provenanceId,
      metadata: {
        sourceType: source.sourceType,
        sourcePublisher: source.publisher,
        rawKeysCount: Object.keys(parsedPayload).length,
      },
      normalizedAt: new Date().toISOString(),
    };

    await this.repo.saveCandidate(candidate);
    return candidate;
  }
}
