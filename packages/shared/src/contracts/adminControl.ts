/**
 * Admin Control Plane & Governance Contracts (JOB 074)
 *
 * Hardened RBAC, enterprise administrative functions, and append-only audit ledger:
 * 9 Core Functions:
 * 1. users: suspension, KYC override, shadowbanning, role elevation.
 * 2. moderation: review queue, triage, content removal, strike issuance.
 * 3. verification: candidate KYC review, masked statutory ID check, badge granting.
 * 4. data_correction: constituency boundaries, representative tenures, official metadata.
 * 5. campaigns: workspace oversight, MCC compliance freezing, dispute resolution.
 * 6. ads: political ad pre-certification, emergency halting, sponsor verification.
 * 7. billing: B2B SaaS tenant invoices, wallet manual credits, refund approvals.
 * 8. feature_flags: dynamic system toggles with immediate runtime propagation.
 * 9. audit: queryable immutable ledger tracking all privileged administrator mutations.
 */

export type AdminRole = 'admin' | 'super_admin' | 'compliance_officer' | 'moderator';

export type AdminDomain =
  | 'users'
  | 'moderation'
  | 'verification'
  | 'data_correction'
  | 'campaigns'
  | 'ads'
  | 'billing'
  | 'feature_flags'
  | 'audit';

export interface AdminUserActionRequest {
  targetUserId: string;
  action: 'suspend' | 'unsuspend' | 'shadowban' | 'verify_kyc' | 'set_role';
  role?: string;
  reason: string;
}

export interface AdminModerationDecisionRequest {
  targetContentType: 'post' | 'short' | 'comment' | 'issue' | 'campaign_creative';
  targetContentId: string;
  decision: 'approve' | 'quarantine' | 'reject' | 'takedown';
  violationCategory?: string;
  internalNotes: string;
}

export interface AdminVerificationRequest {
  candidateId: string;
  kycStatus: 'VERIFIED' | 'REJECTED' | 'NEEDS_SUPPLEMENTAL';
  statutoryChecklist: {
    epicVerified: boolean;
    affidavitVerified: boolean;
    residencyVerified: boolean;
    criminalAntecedentsCleared: boolean;
  };
  verifierNotes: string;
}

export interface AdminDataCorrectionRequest {
  entityType: 'constituency' | 'polling_station' | 'official' | 'boundary';
  entityId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  statutoryReference?: string;
  justification: string;
}

export interface AdminFeatureFlag {
  flagKey: string;
  flagValue: unknown;
  description?: string;
  updatedBy: string;
  updatedAt: string;
}

export interface AdminAuditEntry {
  id: string;
  actorId: string;
  actorRole: AdminRole;
  domain: AdminDomain;
  action: string;
  targetEntityType: string;
  targetEntityId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;
  timestamp: string;
}

export interface AdminAuditQueryFilter {
  actorId?: string;
  domain?: AdminDomain;
  targetEntityType?: string;
  targetEntityId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}
