import crypto from 'node:crypto';
import type { DelimitationImpactReport, DelimitationRevisionSubmission } from '@kshetra/shared';
import { supabase, isSupabaseConfigured, isUsingServiceRole } from '../lib/supabase';

export class DelimitationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DelimitationValidationError';
  }
}

export class DelimitationPersistenceError extends Error {
  constructor(message = 'Canonical PostGIS boundary storage is unavailable') {
    super(message);
    this.name = 'DelimitationPersistenceError';
  }
}

export class DelimitationSourcePipeline {
  /**
   * Delegates all geometric work to a single PostGIS transaction. The transaction
   * resolves current canonical ACs, validates a full state partition, then persists
   * both the revision manifest and every proposed boundary before returning a report.
   */
  async processDelimitationRevision(
    submission: DelimitationRevisionSubmission,
  ): Promise<DelimitationImpactReport> {
    if (!isSupabaseConfigured || !isUsingServiceRole) throw new DelimitationPersistenceError();
    const revisionId = crypto.randomUUID();
    const { data, error } = await supabase.rpc('fn_commit_delimitation_revision', {
      p_revision: {
        revisionId,
        orderNumber: submission.orderNumber,
        gazetteDate: submission.gazetteDate,
        stateCode: submission.stateCode,
      },
      p_boundaries: submission.boundaries,
    });
    if (error) {
      if (
        error.code === 'P0001' &&
        [
          'CANONICAL_BOUNDARIES_NOT_FOUND',
          'CANONICAL_BOUNDARY_COVERAGE_INCOMPLETE',
          'CANONICAL_STATE_BOUNDARY_NOT_FOUND_OR_INVALID',
        ].some((code) => error.message.includes(code))
      ) {
        throw new DelimitationPersistenceError(error.message);
      }
      if (error.code === 'P0001' || error.code === '22023' || error.code === '22P02') {
        throw new DelimitationValidationError(error.message);
      }
      throw new DelimitationPersistenceError(error.message);
    }
    if (
      !data ||
      data.revisionId !== revisionId ||
      data.topologyValid !== true ||
      !Array.isArray(data.canonicalVersionCodes) ||
      data.canonicalVersionCodes.length === 0
    ) {
      throw new DelimitationPersistenceError(
        'PostGIS did not return a persisted, valid revision report',
      );
    }
    return data as DelimitationImpactReport;
  }
}

export const delimitationSourcePipeline = new DelimitationSourcePipeline();
