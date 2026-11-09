/** Durable data principal rights workflows backed by Supabase Auth and Postgres. */

import crypto from 'node:crypto';
import type {
  DataPrincipalRightRequest,
  RightsWorkflowStatus,
  DataPrincipalExportArchive,
  GrievanceRedressalTicket,
} from '@kshetra/shared';
import { supabase, isSupabaseConfigured, isUsingServiceRole } from '../../lib/supabase';
import { retentionService } from './retentionService';
import type {
  DataAccessRequestInput,
  DataCorrectionRequestInput,
  DataErasureRequestInput,
  GrievanceSubmissionInput,
} from './schemas';

export class RightsPersistenceError extends Error {
  constructor(message = 'Data principal rights storage is unavailable') {
    super(message);
    this.name = 'RightsPersistenceError';
  }
}

const subjectHash = (userId: string) => crypto.createHash('sha256').update(userId).digest('hex');

export class RightsService {
  private requireServiceRole(): void {
    if (!isSupabaseConfigured || !isUsingServiceRole) throw new RightsPersistenceError();
  }

  private async recordRight(
    requestId: string,
    userId: string,
    rightType: 'access' | 'correction',
    status: 'PROCESSING' | 'RECEIVED',
    details: Record<string, unknown>,
  ): Promise<void> {
    this.requireServiceRole();
    const { error } = await supabase.from('data_principal_rights_requests').insert({
      request_id: requestId,
      subject_sha256: subjectHash(userId),
      right_type: rightType,
      status,
      details,
    });
    if (error) throw new RightsPersistenceError(error.message);
  }

  private async updateRight(
    requestId: string,
    status: 'COMPLETED' | 'FAILED',
    details?: Record<string, unknown>,
  ): Promise<void> {
    const { data, error } = await supabase
      .from('data_principal_rights_requests')
      .update({
        status,
        completed_at: status === 'COMPLETED' ? new Date().toISOString() : null,
        ...(details ? { details } : {}),
      })
      .eq('request_id', requestId)
      .select('request_id')
      .maybeSingle();
    if (error || !data)
      throw new RightsPersistenceError(error?.message || 'Rights request status was not persisted');
  }

  private async readRows(table: string, userId: string): Promise<Record<string, unknown>[]> {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', userId);
    if (error) throw new RightsPersistenceError(`Could not export ${table}: ${error.message}`);
    return (data ?? []) as Record<string, unknown>[];
  }

  /** Compiles a real export from known user-linked records and labels its coverage. */
  async processAccessRequest(
    userId: string,
    params: DataAccessRequestInput,
  ): Promise<DataPrincipalExportArchive> {
    this.requireServiceRole();
    const requestUuid = crypto.randomUUID();
    await this.recordRight(requestUuid, userId, 'access', 'PROCESSING', {
      format: params.format,
      includeActivityHistory: params.includeActivityHistory,
    });
    try {
      const { data: authResult, error: authError } = await supabase.auth.admin.getUserById(userId);
      if (authError || !authResult.user)
        throw new RightsPersistenceError(
          authError?.message || 'Authenticated account was not found',
        );

      const [{ data: profileRow, error: profileError }, favourites, badges, verification] =
        await Promise.all([
          supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
          params.includeActivityHistory
            ? this.readRows('user_favourites', userId)
            : Promise.resolve([]),
          params.includeActivityHistory
            ? this.readRows('civic_badges', userId)
            : Promise.resolve([]),
          params.includeActivityHistory
            ? this.readRows('user_verification', userId)
            : Promise.resolve([]),
        ]);
      if (profileError)
        throw new RightsPersistenceError(`Could not export user profile: ${profileError.message}`);

      let walletHistory: Record<string, unknown>[] = [];
      if (params.includeActivityHistory) {
        const { data: politicianProfile, error: politicianError } = await supabase
          .from('politician_portal_profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        if (politicianError)
          throw new RightsPersistenceError(
            `Could not check linked wallet data: ${politicianError.message}`,
          );
        if (politicianProfile?.id) {
          const { data: wallets, error: walletError } = await supabase
            .from('campaign_wallets')
            .select('id')
            .eq('politician_id', politicianProfile.id);
          if (walletError)
            throw new RightsPersistenceError(
              `Could not export linked wallets: ${walletError.message}`,
            );
          const walletIds = (wallets ?? []).map((wallet: { id: string }) => wallet.id);
          if (walletIds.length) {
            const { data: transactions, error: transactionError } = await supabase
              .from('wallet_transactions')
              .select('*')
              .in('wallet_id', walletIds);
            if (transactionError)
              throw new RightsPersistenceError(
                `Could not export linked wallet history: ${transactionError.message}`,
              );
            walletHistory = (transactions ?? []) as Record<string, unknown>[];
          }
        }
      }

      const payload = {
        account: {
          userId: authResult.user.id,
          email: authResult.user.email ?? null,
          phone: authResult.user.phone ?? null,
          createdAt: authResult.user.created_at ?? null,
          lastSignInAt: authResult.user.last_sign_in_at ?? null,
        },
        profile: (profileRow ?? {}) as Record<string, unknown>,
        civicBadges: badges,
        userFavourites: favourites,
        verificationHistory: verification,
        walletHistory,
      };
      const payloadString = JSON.stringify(payload);
      const now = new Date();
      const archive: DataPrincipalExportArchive = {
        exportId: `dpr_access_${requestUuid}`,
        userId,
        generatedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        archiveChecksumSha256: crypto.createHash('sha256').update(payloadString).digest('hex'),
        summary: {
          profileRecordsCount: profileRow ? 1 : 0,
          activityRecordsCount: badges.length + favourites.length + verification.length,
          walletTransactionsCount: walletHistory.length,
          sessionsCount: null,
          publicStatutoryRecordsNotice:
            'Export covers auth account, user_profiles, user_favourites, civic_badges, user_verification, and linked campaign wallet transactions. Authentication session history and other user-generated content tables are not included in this export yet.',
        },
        dataPayload: payload,
      };
      await this.updateRight(requestUuid, 'COMPLETED', {
        format: params.format,
        includeActivityHistory: params.includeActivityHistory,
        archiveChecksumSha256: archive.archiveChecksumSha256,
        profileRecordsCount: archive.summary.profileRecordsCount,
        activityRecordsCount: archive.summary.activityRecordsCount,
        walletTransactionsCount: archive.summary.walletTransactionsCount,
        expiresAt: archive.expiresAt,
      });
      return archive;
    } catch (error) {
      await this.updateRight(requestUuid, 'FAILED');
      throw error;
    }
  }

  /** Records a correction request for review; it does not claim that data was changed. */
  async processCorrectionRequest(
    userId: string,
    params: DataCorrectionRequestInput,
  ): Promise<{
    success: boolean;
    requestId: string;
    field: string;
    previousValueStatus: string;
    updatedValueStatus: string;
    status: RightsWorkflowStatus;
    requestedAt: string;
  }> {
    const requestUuid = crypto.randomUUID();
    const requestedAt = new Date().toISOString();
    await this.recordRight(requestUuid, userId, 'correction', 'RECEIVED', {
      field: params.field,
      correctedValue: params.correctedValue,
      reason: params.reason,
      evidenceUrl: params.supportingEvidenceUrl,
    });
    return {
      success: true,
      requestId: requestUuid,
      field: params.field,
      previousValueStatus: 'not_changed',
      updatedValueStatus: 'pending_review',
      status: 'received',
      requestedAt,
    };
  }

  /** Issues an erasure certificate only after Supabase Auth deletion and ledger completion persist. */
  async processErasureRequest(
    userId: string,
    params: DataErasureRequestInput,
  ): Promise<{
    success: boolean;
    requestId: string;
    erasureCertificateId: string;
    status: RightsWorkflowStatus;
    erasedEntities: string[];
    retainedStatutoryEntities: string[];
    completedAt: string;
  }> {
    const erasureResult = await retentionService.processAccountErasure(userId, params.reason);
    return {
      success: true,
      requestId: erasureResult.requestId,
      erasureCertificateId: erasureResult.erasureCertificateId,
      status: 'completed',
      erasedEntities: erasureResult.erasedEntities,
      retainedStatutoryEntities: erasureResult.retainedStatutoryEntities,
      completedAt: erasureResult.completedAt,
    };
  }

  async submitGrievance(
    userId: string,
    params: GrievanceSubmissionInput,
  ): Promise<GrievanceRedressalTicket> {
    this.requireServiceRole();
    const ticketId = `grv_${crypto.randomUUID()}`;
    const now = new Date();
    const resolutionDue = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const ticket: GrievanceRedressalTicket = {
      ticketId,
      userId,
      dpoName: process.env.DPO_NAME || 'Data Protection Officer',
      dpoEmail: process.env.DPO_EMAIL || 'dpo@kshetra.io',
      grievanceSubject: params.subject,
      grievanceDescription: params.description,
      status: 'open',
      slaDays: 30,
      createdAt: now.toISOString(),
      resolutionDueBy: resolutionDue.toISOString(),
    };
    const { error } = await supabase.from('data_principal_grievance_tickets').insert({
      ticket_id: ticket.ticketId,
      subject_sha256: subjectHash(userId),
      dpo_name: ticket.dpoName,
      dpo_email: ticket.dpoEmail,
      grievance_subject: ticket.grievanceSubject,
      grievance_description: ticket.grievanceDescription,
      contact_email: params.contactEmail,
      category: params.category,
      status: ticket.status,
      sla_days: ticket.slaDays,
      created_at: ticket.createdAt,
      resolution_due_by: ticket.resolutionDueBy,
    });
    if (error) throw new RightsPersistenceError(error.message);
    return ticket;
  }

  async getGrievance(ticketId: string, userId: string): Promise<GrievanceRedressalTicket | null> {
    this.requireServiceRole();
    const { data, error } = await supabase
      .from('data_principal_grievance_tickets')
      .select('*')
      .eq('ticket_id', ticketId)
      .eq('subject_sha256', subjectHash(userId))
      .maybeSingle();
    if (error) throw new RightsPersistenceError(error.message);
    if (!data) return null;
    return {
      ticketId: data.ticket_id,
      userId,
      dpoName: data.dpo_name,
      dpoEmail: data.dpo_email,
      grievanceSubject: data.grievance_subject,
      grievanceDescription: data.grievance_description,
      status: data.status,
      slaDays: data.sla_days,
      createdAt: data.created_at,
      resolutionDueBy: data.resolution_due_by,
      resolvedAt: data.resolved_at ?? undefined,
      resolutionSummary: data.resolution_summary ?? undefined,
    };
  }

  async getUserRequests(userId: string): Promise<DataPrincipalRightRequest[]> {
    this.requireServiceRole();
    const { data, error } = await supabase
      .from('data_principal_rights_requests')
      .select('*')
      .eq('subject_sha256', subjectHash(userId))
      .order('requested_at', { ascending: false });
    if (error) throw new RightsPersistenceError(error.message);
    return (data ?? []).map((row: any) => ({
      id: row.request_id,
      userId,
      rightType: row.right_type,
      status:
        row.status === 'COMPLETED'
          ? 'completed'
          : row.status === 'FAILED'
            ? 'rejected'
            : row.status === 'RECEIVED'
              ? 'received'
              : 'processing',
      requestedAt: row.requested_at,
      processedAt: row.completed_at ?? undefined,
      details: row.details,
      verificationMethod: 'jwt_session',
    }));
  }
}

export const rightsService = new RightsService();
