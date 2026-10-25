/**
 * Stage 5: Versioner
 *
 * Enforces immutable versioning DAG for validated candidates:
 * - Creates immutable DelimitationAcceptedVersion records
 * - Enforces database and application-level idempotency on (sourceId, contentSha256)
 * - Chains previous_version_id to maintain unbroken lineage DAG
 * - Never overwrites previous versions
 * - Gate-blocks rejected or unvalidated candidates
 */

import { randomUUID } from 'crypto';
import type {
  DelimitationCandidate,
  DelimitationSnapshot,
  DelimitationValidation,
  DelimitationComparison,
  DelimitationAcceptedVersion,
} from '@kshetra/shared';
import type { IDelimitationWatchRepository } from './persistence';

export class Versioner {
  constructor(private readonly repo: IDelimitationWatchRepository) {}

  async acceptVersion(
    candidate: DelimitationCandidate,
    snapshot: DelimitationSnapshot,
    validation: DelimitationValidation,
    comparison: DelimitationComparison,
    baselineVersion?: DelimitationAcceptedVersion | null,
    acceptedBy: string = 'system_delimitation_watch',
  ): Promise<{ version: DelimitationAcceptedVersion; created: boolean }> {
    // 1. Validation Gate
    if (validation.validationStatus === 'REJECTED') {
      throw new Error(`VERSION_ACCEPTANCE_BLOCKED: Candidate ${candidate.id} was REJECTED during validation: ${validation.errors.join(', ')}`);
    }

    // 2. Idempotency Check: (sourceId, contentSha256)
    const existing = await this.repo.getAcceptedVersionByHash(candidate.sourceId, snapshot.contentSha256);
    if (existing) {
      // Idempotent hit: return existing version without creating duplicate
      return { version: existing, created: false };
    }

    // 3. Compute next version tag
    const stateCode = candidate.proposalData.stateCode || 'IN';
    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let versionSeq = 1;

    if (baselineVersion) {
      const match = baselineVersion.versionTag.match(/v(\d+)\./);
      if (match) {
        versionSeq = parseInt(match[1], 10) + 1;
      }
    }

    const versionTag = `v${versionSeq}.0.0-${stateCode}-${dateStamp}-${snapshot.contentSha256.slice(0, 8)}`;

    const acceptedVersion: DelimitationAcceptedVersion = {
      id: randomUUID(),
      sourceId: candidate.sourceId,
      versionTag,
      snapshotId: snapshot.id,
      candidateId: candidate.id,
      validationId: validation.id,
      comparisonId: comparison.id,
      previousVersionId: baselineVersion?.id,
      contentSha256: snapshot.contentSha256,
      parserVersion: candidate.parserVersion,
      dataStatus: candidate.normalizedDataStatus,
      effectiveDate: snapshot.declaredEffectiveDate,
      proposalId: undefined, // Linked during publication
      acceptedAt: new Date().toISOString(),
      acceptedBy,
      metadata: {
        isMaterialChange: comparison.isMaterialChange,
        comparisonSummary: comparison.comparisonSummary,
        sourceType: candidate.metadata?.sourceType,
      },
    };

    await this.repo.saveAcceptedVersion(acceptedVersion);
    return { version: acceptedVersion, created: true };
  }
}
