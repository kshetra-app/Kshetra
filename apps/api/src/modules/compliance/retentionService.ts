/**
 * apps/api/src/modules/compliance/retentionService.ts
 *
 * Milestone W051.5 — Compliance, DPDP & Data Governance Readiness
 * Authoritative Retention & Deletion Policy Matrix and Account Erasure Engine.
 */

import type { RetentionPolicyRule, RetentionPeriodClass } from '@kshetra/shared';
import crypto from 'node:crypto';
import { supabase, isSupabaseConfigured, isUsingServiceRole } from '../../lib/supabase';

export class ErasureExecutionError extends Error {
  constructor(message = 'Account erasure did not complete durably') {
    super(message);
    this.name = 'ErasureExecutionError';
  }
}

export const COMPLIANCE_RETENTION_POLICY_MATRIX: RetentionPolicyRule[] = [
  {
    dataClass: 'User Authentication Sessions & Refresh Tokens',
    applicableTables: ['auth.sessions', 'auth.refresh_tokens'],
    retentionClass: 'session_30_days',
    retentionDurationDays: 30,
    statutoryReference: 'DPDP Act 2023 Sec 8(7) (Storage Limitation) & IT Rules 2021',
    deletionTrigger: 'User sign-out, session timeout, or 30 days of client inactivity',
    deletionMethod: 'hard_delete',
    auditRequirements: 'Session termination logged with anonymized client IP and timestamp',
  },
  {
    dataClass: 'Citizen User Profiles & Bookmarks',
    applicableTables: ['public.user_profiles', 'public.user_favourites'],
    retentionClass: 'session_30_days',
    retentionDurationDays: 30,
    statutoryReference: 'DPDP Act 2023 Sec 12(3) (Right to Erasure)',
    deletionTrigger: 'Data Principal submits account erasure request',
    deletionMethod: 'hard_delete',
    auditRequirements: 'Erasure certificate generated and cryptographic hash recorded in audit log',
  },
  {
    dataClass: 'Identity Verification & Accreditation Documents',
    applicableTables: ['public.user_verification', 'storage.kyc-documents'],
    retentionClass: 'verification_90_days',
    retentionDurationDays: 90,
    statutoryReference: 'DPDP Act 2023 Sec 8(7) & IT Rules 2021 Rule 3(1)(h)',
    deletionTrigger: '90 days post review decision (approved/rejected) or account deletion',
    deletionMethod: 'crypto_shred',
    auditRequirements: 'Binary file unlinked from S3; cryptographic erasure logged',
  },
  {
    dataClass: 'Telecom & Voice OBD Broadcast Recordings',
    applicableTables: ['public.voice_obd_broadcasts', 'storage.campaign-audio'],
    retentionClass: 'operational_180_days',
    retentionDurationDays: 180,
    statutoryReference: 'TRAI TCCCPR 2018 Regulation 18 & DOT Call Detail Record mandates',
    deletionTrigger: '180 days elapsed post broadcast completion',
    deletionMethod: 'hard_delete',
    auditRequirements: 'Automated retention job purges audio files and recipient phone logs',
  },
  {
    dataClass: 'B2B SaaS Quota & Usage Ledger',
    applicableTables: ['public.saas_usage_ledger'],
    retentionClass: 'usage_36_months',
    retentionDurationDays: 1095, // 3 years
    statutoryReference: 'Commercial contract dispute window & Limitation Act 1963',
    deletionTrigger: 'Rolling 36-month monthly bucket expiration',
    deletionMethod: 'immutable_archive',
    auditRequirements: 'Aggregated monthly billing summary retained; granular hourly rows archived',
  },
  {
    dataClass: 'Commercial Financial Ledgers & Top-up Transactions',
    applicableTables: ['public.campaign_wallets', 'public.wallet_transactions'],
    retentionClass: 'statutory_7_years',
    retentionDurationDays: 2555, // 7 years
    statutoryReference: 'Companies Act 2013 Sec 128 & Income Tax Act 1961 Sec 44AA',
    deletionTrigger: '7 years from end of relevant financial assessment year',
    deletionMethod: 'immutable_archive',
    auditRequirements: 'Zero ad-hoc deletion permitted; requires formal statutory board sign-off',
  },
  {
    dataClass: 'Statutory Electoral Geography & Candidate Affidavits',
    applicableTables: [
      'public.states',
      'public.constituencies',
      'public.canonical_persons',
      'public.candidacies',
      'public.candidate_affidavits',
      'public.candidate_affidavit_disclosures',
      'public.constituency_demographics',
      'public.constituency_lineage',
    ],
    retentionClass: 'permanent_statutory_public',
    retentionDurationDays: null, // Infinite
    statutoryReference:
      'Representation of the People Act 1950/1951, Delimitation Act 2002 & ECI Regulations',
    deletionTrigger: 'NEVER (Statutory public records exempt from citizen erasure)',
    deletionMethod: 'immutable_archive',
    auditRequirements: 'Cryptographic batch provenance anchors and version snapshots preserved',
  },
];

export class RetentionService {
  /**
   * Retrieves the full retention and deletion policy matrix.
   */
  getRetentionMatrix(): RetentionPolicyRule[] {
    return COMPLIANCE_RETENTION_POLICY_MATRIX;
  }

  /**
   * Evaluates whether a given entity and field can be erased upon citizen request.
   */
  canEraseEntity(entity: string): {
    canErase: boolean;
    reason: string;
    exemptionReference?: string;
  } {
    const statutoryPublicTables = [
      'states',
      'constituencies',
      'canonical_persons',
      'candidacies',
      'candidate_affidavits',
      'candidate_affidavit_disclosures',
      'constituency_demographics',
      'constituency_lineage',
    ];

    const cleanName = entity.replace(/^public\./, '');
    if (statutoryPublicTables.includes(cleanName)) {
      return {
        canErase: false,
        reason:
          'Statutory public electoral record published pursuant to Representation of the People Act 1951. Exempt from DPDP Act erasure.',
        exemptionReference:
          'DPDP Act 2023 Section 3(c)(ii) & Representation of the People Act 1951',
      };
    }

    if (cleanName === 'wallet_transactions' || cleanName === 'campaign_wallets') {
      return {
        canErase: false,
        reason:
          'Financial ledger records must be retained for 7 years pursuant to Companies Act 2013 and Tax accounting mandates.',
        exemptionReference: 'Companies Act 2013 Section 128',
      };
    }

    return {
      canErase: true,
      reason:
        'Citizen private personal data subject to unconditional right of erasure upon verified request.',
    };
  }

  /** Deletes the authenticated account only after a durable request ledger row exists. */
  async processAccountErasure(
    userId: string,
    reason?: string,
  ): Promise<{
    success: boolean;
    requestId: string;
    userId: string;
    erasedEntities: string[];
    retainedStatutoryEntities: string[];
    completedAt: string;
    erasureCertificateId: string;
  }> {
    if (!isSupabaseConfigured || !isUsingServiceRole)
      throw new ErasureExecutionError(
        'Service-role database and Auth administration are required for account erasure.',
      );
    if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(userId))
      throw new ErasureExecutionError('Authenticated user identifier is invalid.');

    const requestId = crypto.randomUUID();
    const subjectSha256 = crypto.createHash('sha256').update(userId).digest('hex');
    const { error: ledgerError } = await supabase.from('data_principal_erasure_ledger').insert({
      request_id: requestId,
      subject_sha256: subjectSha256,
      status: 'PENDING',
      reason: reason ?? null,
    });
    if (ledgerError)
      throw new ErasureExecutionError(
        `Could not durably record erasure request: ${ledgerError.message}`,
      );

    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      const { error: failureLedgerError } = await supabase
        .from('data_principal_erasure_ledger')
        .update({ status: 'FAILED', failure_code: 'AUTH_DELETE_FAILED' })
        .eq('request_id', requestId)
        .eq('status', 'PENDING');
      if (failureLedgerError)
        throw new ErasureExecutionError(
          'Account deletion failed and its failure status could not be persisted.',
        );
      throw new ErasureExecutionError(
        `Supabase Auth did not delete the account: ${deleteError.message}`,
      );
    }

    const { data: validation, error: validationError } = await supabase.rpc(
      'fn_validate_user_erasure',
      { p_user_id: userId },
    );
    const validationComplete =
      !validationError &&
      validation?.validated === true &&
      Number(validation.checkedDependencies) > 0 &&
      Array.isArray(validation.remainingTables) &&
      validation.remainingTables.length === 0;
    if (!validationComplete) {
      const validationSummary = validationError
        ? { validationAvailable: false }
        : {
            validationAvailable: true,
            checkedDependencies: Number(validation?.checkedDependencies ?? 0),
            remainingTables: Array.isArray(validation?.remainingTables)
              ? validation.remainingTables
              : [],
          };
      const { error: failedValidationLedgerError } = await supabase
        .from('data_principal_erasure_ledger')
        .update({
          status: 'FAILED',
          failure_code: validationError
            ? 'ERASURE_VALIDATION_UNAVAILABLE'
            : 'ERASURE_RESIDUAL_DATA',
          validation_summary: validationSummary,
        })
        .eq('request_id', requestId)
        .eq('status', 'PENDING');
      if (failedValidationLedgerError)
        throw new ErasureExecutionError(
          'Auth account was deleted, but residual-data validation failed and could not be durably recorded.',
        );
      throw new ErasureExecutionError(
        'Auth account was deleted, but configured cascade dependencies did not validate as fully erased. No certificate was issued.',
      );
    }

    const completedAt = new Date().toISOString();
    const certificateUuid = crypto.randomUUID();
    const { data: completedRow, error: completeError } = await supabase
      .from('data_principal_erasure_ledger')
      .update({
        status: 'COMPLETED',
        certificate_id: certificateUuid,
        completed_at: completedAt,
        validation_summary: validation,
      })
      .eq('request_id', requestId)
      .eq('status', 'PENDING')
      .select('request_id, status, certificate_id, completed_at, validation_summary')
      .maybeSingle();
    if (
      completeError ||
      !completedRow ||
      completedRow.status !== 'COMPLETED' ||
      completedRow.certificate_id !== certificateUuid
    ) {
      // The Auth deletion may have succeeded, but no certificate is returned until the completion ledger is durable.
      throw new ErasureExecutionError(
        'Auth account was deleted, but the completion record could not be confirmed. Reconcile the pending ledger entry before issuing a certificate.',
      );
    }

    return {
      success: true,
      requestId,
      userId,
      erasedEntities: [
        'Supabase Auth account and rows deleted by configured ON DELETE CASCADE constraints',
      ],
      retainedStatutoryEntities: [
        'Statutory electoral geography and public election records are outside the account deletion cascade',
      ],
      completedAt: completedRow.completed_at,
      erasureCertificateId: `cert_dpdp_del_${completedRow.certificate_id}`,
    };
  }
}

export const retentionService = new RetentionService();
