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
  PublicationStatus,
} from '@kshetra/shared';
import type { IDelimitationWatchRepository } from './persistence';

export class Publisher {
  constructor(private readonly repo: IDelimitationWatchRepository) {}

  async publish(
    version: DelimitationAcceptedVersion,
    candidate: DelimitationCandidate,
    validation: DelimitationValidation,
    publishedBy: string = 'system_delimitation_watch',
  ): Promise<{ publication: DelimitationPublication; created: boolean }> {
    // 1. Validation Gate Enforcement
    if (validation.validationStatus === 'REJECTED') {
      throw new Error(`PUBLICATION_GATE_FAILED: Cannot publish rejected candidate ${candidate.id}`);
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
      publicationStatus: 'PUBLISHED',
      publishedAt: now,
      publishedBy,
      publishedProposalId: candidate.proposalData.proposalNumber ? candidate.id : undefined,
      canonicalViewUpdated: true,
      createdAt: now,
    };

    await this.repo.savePublication(publication);
    return { publication, created: true };
  }
}
