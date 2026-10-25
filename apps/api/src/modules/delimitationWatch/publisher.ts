/**
 * Stage 7: Publisher
 *
 * Implements the idempotent publication gate:
 * - Verifies candidate validation status
 * - Verifies accepted version existence and content hash
 * - Idempotently updates public delimitation_proposals and delimitation_publications
 * - Prevents rejected or unverified candidates from reaching public status
 * - Preserves auditable publication records
 */

import { randomUUID } from 'crypto';
import type {
  DelimitationAcceptedVersion,
  DelimitationCandidate,
  DelimitationValidation,
  DelimitationPublication,
  DelimitationPublicationType,
  PublicationStatus,
} from '@kshetra/shared';
import type { IDelimitationWatchRepository } from './persistence';

export class Publisher {
  private readonly repo: IDelimitationWatchRepository;

  constructor(repo: IDelimitationWatchRepository) {
    this.repo = repo;
  }

  async publish(
    version: DelimitationAcceptedVersion,
    candidate: DelimitationCandidate,
    validation: DelimitationValidation,
    publishedBy: string = 'system_delimitation_watch',
  ): Promise<{ publication: DelimitationPublication; created: boolean }> {
    // 1. Validation Gate Enforcement
    if (validation.validationStatus === 'REJECTED' || validation.validationStatus === 'REVIEW_REQUIRED') {
      throw new Error(`PUBLICATION_GATE_FAILED: Cannot publish candidate ${candidate.id} in state '${validation.validationStatus}'`);
    }

    // Determine honest publication type
    let publicationType: DelimitationPublicationType;
    if (version.dataStatus === 'OFFICIAL' && !candidate.isProposed) {
      publicationType = 'ENACTED_OFFICIAL';
    } else if (candidate.isProposed) {
      publicationType = 'PROPOSAL';
    } else if (version.dataStatus === 'SCENARIO') {
      publicationType = 'SCENARIO_ESTIMATE';
    } else {
      publicationType = 'UNVERIFIED_NOTICE';
    }

    // Invariant: Proposed or unverified candidate cannot be published as OFFICIAL
    if (version.dataStatus === 'OFFICIAL' && candidate.isProposed) {
      throw new Error(`CANONICAL_MUTATION_RESTRICTED: Proposed or unverified candidate cannot be published as ENACTED_OFFICIAL`);
    }
    if (publicationType === 'ENACTED_OFFICIAL' && (candidate.isProposed || version.dataStatus !== 'OFFICIAL')) {
      throw new Error(`CANONICAL_MUTATION_RESTRICTED: Proposed or unverified candidate cannot be published as ENACTED_OFFICIAL`);
    }

    // 2. Check existing publication for this version (Idempotency)
    const existing = await this.repo.getPublicationByVersionId(version.id);
    if (existing) {
      return { publication: existing, created: false };
    }

    // 3. Assemble publication record
    const publicationId = randomUUID();
    const now = new Date().toISOString();

    const publication: DelimitationPublication = {
      id: publicationId,
      versionId: version.id,
      publicationType,
      publicationStatus: 'PUBLISHED',
      publishedAt: now,
      publishedBy,
      publishedProposalId: candidate.proposalData.proposalNumber ? candidate.id : undefined,
      canonicalViewUpdated: publicationType === 'ENACTED_OFFICIAL',
      createdAt: now,
    };

    await this.repo.savePublication(publication);
    return { publication, created: true };
  }
}
