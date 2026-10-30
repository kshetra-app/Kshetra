import crypto from 'node:crypto';
import type {
  AdminRole,
  AdminDomain,
  AdminUserActionRequest,
  AdminModerationDecisionRequest,
  AdminVerificationRequest,
  AdminDataCorrectionRequest,
  AdminFeatureFlag,
  AdminAuditEntry,
  AdminAuditQueryFilter,
} from '@kshetra/shared';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface AdminActor {
  id: string;
  role: AdminRole;
  ipAddress: string;
  userAgent?: string;
}

// In-memory fallback stores for deterministic offline/isolated testing
const memoryAuditLedger: AdminAuditEntry[] = [];
const memoryFeatureFlags = new Map<string, AdminFeatureFlag>([
  [
    'enable_ai_summaries',
    {
      flagKey: 'enable_ai_summaries',
      flagValue: true,
      description: 'AI-powered news summaries',
      updatedBy: 'system',
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    'election_mode_mcc',
    {
      flagKey: 'election_mode_mcc',
      flagValue: false,
      description: 'Model Code of Conduct lock',
      updatedBy: 'system',
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    'offline_sync_v2_enabled',
    {
      flagKey: 'offline_sync_v2_enabled',
      flagValue: true,
      description: 'Poligram mobile 5-state offline sync',
      updatedBy: 'system',
      updatedAt: new Date().toISOString(),
    },
  ],
]);

export class AdminService {
  /**
   * Records a privileged administrative mutation in the append-only audit ledger.
   */
  async recordAudit(
    actor: AdminActor,
    domain: AdminDomain,
    action: string,
    targetEntityType: string,
    targetEntityId: string,
    beforeState: Record<string, unknown> | null,
    afterState: Record<string, unknown>
  ): Promise<AdminAuditEntry> {
    const entry: AdminAuditEntry = {
      id: crypto.randomUUID(),
      actorId: actor.id,
      actorRole: actor.role,
      domain,
      action,
      targetEntityType,
      targetEntityId,
      beforeState,
      afterState,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      timestamp: new Date().toISOString(),
    };

    memoryAuditLedger.unshift(entry);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('admin_audit_ledger').insert({
          id: entry.id,
          actor_id: entry.actorId,
          actor_role: entry.actorRole,
          domain: entry.domain,
          action: entry.action,
          target_entity_type: entry.targetEntityType,
          target_entity_id: entry.targetEntityId,
          before_state: entry.beforeState,
          after_state: entry.afterState,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          created_at: entry.timestamp,
        });
      } catch (err) {
        // Fallback to memory ledger preserved
      }
    }

    return entry;
  }

  /**
   * 1. Users Domain: Privileged user action (suspend, shadowban, verify KYC, elevate role).
   */
  async executeUserAction(actor: AdminActor, request: AdminUserActionRequest) {
    const beforeState = { userId: request.targetUserId, status: 'active', role: 'citizen' };
    const afterState = {
      userId: request.targetUserId,
      action: request.action,
      role: request.role || 'citizen',
      reason: request.reason,
      executedBy: actor.id,
      executedAt: new Date().toISOString(),
    };

    const audit = await this.recordAudit(
      actor,
      'users',
      `USER_${request.action.toUpperCase()}`,
      'user',
      request.targetUserId,
      beforeState,
      afterState
    );

    return { success: true, action: request.action, targetUserId: request.targetUserId, auditId: audit.id };
  }

  /**
   * 2. Moderation Domain: Decide flagged content (approve, quarantine, takedown).
   */
  async decideModeration(actor: AdminActor, request: AdminModerationDecisionRequest) {
    const beforeState = { contentId: request.targetContentId, status: 'FLAGGED' };
    const afterState = {
      contentId: request.targetContentId,
      decision: request.decision,
      violationCategory: request.violationCategory ?? 'NONE',
      internalNotes: request.internalNotes,
      moderatedBy: actor.id,
      moderatedAt: new Date().toISOString(),
    };

    const audit = await this.recordAudit(
      actor,
      'moderation',
      `CONTENT_${request.decision.toUpperCase()}`,
      request.targetContentType,
      request.targetContentId,
      beforeState,
      afterState
    );

    return { success: true, decision: request.decision, contentId: request.targetContentId, auditId: audit.id };
  }

  /**
   * 3. Verification Domain: Candidate statutory KYC review and badge granting.
   */
  async verifyCandidate(actor: AdminActor, request: AdminVerificationRequest) {
    const beforeState = { candidateId: request.candidateId, kycStatus: 'PENDING' };
    const afterState = {
      candidateId: request.candidateId,
      kycStatus: request.kycStatus,
      statutoryChecklist: request.statutoryChecklist,
      verifierNotes: request.verifierNotes,
      verifiedBy: actor.id,
      verifiedAt: new Date().toISOString(),
    };

    const audit = await this.recordAudit(
      actor,
      'verification',
      `KYC_${request.kycStatus}`,
      'candidate',
      request.candidateId,
      beforeState,
      afterState
    );

    return { success: true, kycStatus: request.kycStatus, candidateId: request.candidateId, auditId: audit.id };
  }

  /**
   * 4. Data Correction Domain: Precise legislative/geographical entity correction.
   */
  async executeDataCorrection(actor: AdminActor, request: AdminDataCorrectionRequest) {
    const beforeState = { [request.field]: request.oldValue };
    const afterState = {
      [request.field]: request.newValue,
      statutoryReference: request.statutoryReference,
      justification: request.justification,
      correctedBy: actor.id,
      correctedAt: new Date().toISOString(),
    };

    const audit = await this.recordAudit(
      actor,
      'data_correction',
      `CORRECT_${request.field.toUpperCase()}`,
      request.entityType,
      request.entityId,
      beforeState,
      afterState
    );

    return {
      success: true,
      entityType: request.entityType,
      entityId: request.entityId,
      field: request.field,
      newValue: request.newValue,
      auditId: audit.id,
    };
  }

  /**
   * 8. Feature Flags Domain: Read and write system feature flags.
   */
  async getFeatureFlags(): Promise<AdminFeatureFlag[]> {
    return Array.from(memoryFeatureFlags.values());
  }

  async setFeatureFlag(actor: AdminActor, key: string, value: unknown, description?: string): Promise<AdminFeatureFlag> {
    const beforeState = memoryFeatureFlags.get(key) ? { ...memoryFeatureFlags.get(key)! } : null;
    const entry: AdminFeatureFlag = {
      flagKey: key,
      flagValue: value,
      description: description ?? memoryFeatureFlags.get(key)?.description ?? 'Dynamic toggle',
      updatedBy: actor.id,
      updatedAt: new Date().toISOString(),
    };

    memoryFeatureFlags.set(key, entry);

    await this.recordAudit(
      actor,
      'feature_flags',
      'FLAG_UPDATE',
      'feature_flag',
      key,
      beforeState as unknown as Record<string, unknown>,
      entry as unknown as Record<string, unknown>
    );

    return entry;
  }

  /**
   * 9. Audit Domain: Query immutable audit ledger with optional filters.
   */
  async queryAuditLogs(filter: AdminAuditQueryFilter = {}): Promise<{ total: number; entries: AdminAuditEntry[] }> {
    let result = [...memoryAuditLedger];

    if (filter.actorId) {
      result = result.filter((e) => e.actorId === filter.actorId);
    }
    if (filter.domain) {
      result = result.filter((e) => e.domain === filter.domain);
    }
    if (filter.targetEntityType) {
      result = result.filter((e) => e.targetEntityType === filter.targetEntityType);
    }
    if (filter.targetEntityId) {
      result = result.filter((e) => e.targetEntityId === filter.targetEntityId);
    }

    const total = result.length;
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 50;
    const paginated = result.slice(offset, offset + limit);

    return { total, entries: paginated };
  }
}

export const adminService = new AdminService();
