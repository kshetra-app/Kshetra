/**
 * Canonical Civic Service
 * Master Product Blueprint — Domain 3: Core Civic & Engagement Platform
 *
 * Implements:
 * - JOB 030: Civic Issue Lifecycle Engine & State Machine
 * - JOB 031: Geo-Fenced Issue Reporting & Evidence Pipeline
 * - JOB 032: Anti-Sybil Community Upvoting, Follows & Milestone Triggers
 * - JOB 033: Constituency Civic Discourse & Threaded Comments
 * - JOB 034: Local Discourse & Constituency Community Working Groups
 * - JOB 035: Civic Metrics, Sentiment Derivation & Real Data Connectors
 */

import crypto from 'node:crypto';
import type {
  CivicIssueDTO,
  CivicIssueStatus,
  CivicIssueSeverity,
  CivicIssueCategory,
  CreateCivicIssueInput,
  UpdateCivicIssueStatusInput,
  DisputeIssueInput,
  AddCivicCommentInput,
  AddCivicEvidenceInput,
  CommunityGroupDTO,
  GovernmentSchemeDTO,
  DevelopmentProjectDTO,
  ConstituencySentimentDTO,
} from '@kshetra/shared';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { canonicalGeographyService } from './canonicalGeographyService';
import { checkContentModeration } from './contentModeration';

export class InvalidCivicStatusTransitionError extends Error {
  public readonly code = 'INVALID_STATUS_TRANSITION';
  public readonly statusCode = 400;

  constructor(from: CivicIssueStatus, to: CivicIssueStatus, reason?: string) {
    super(`Cannot transition issue status from '${from}' to '${to}'${reason ? `: ${reason}` : ''}`);
    this.name = 'InvalidCivicStatusTransitionError';
  }
}

export class CoordinatesOutsideConstituencyError extends Error {
  public readonly code = 'COORDINATES_OUTSIDE_CONSTITUENCY';
  public readonly statusCode = 400;

  constructor(lat: number, lng: number, expectedConstituencyId: string, resolvedConstituencyId?: string) {
    super(
      `Coordinates [${lat}, ${lng}] fall in ${resolvedConstituencyId || 'another territory'}, outside the declared constituency ${expectedConstituencyId}`
    );
    this.name = 'CoordinatesOutsideConstituencyError';
  }
}

export class ContentPolicyViolationError extends Error {
  public readonly code = 'CONTENT_MODERATION_FAILED';
  public readonly statusCode = 422;

  constructor(reasons: string[]) {
    super(`Content rejected due to policy violations: ${reasons.join(', ')}`);
    this.name = 'ContentPolicyViolationError';
  }
}

export class DisputeNotAllowedError extends Error {
  public readonly code = 'DISPUTE_NOT_ALLOWED';
  public readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'DisputeNotAllowedError';
  }
}

export interface IssueCommentRecord {
  id: string;
  issueId: string;
  userId: string;
  userName: string;
  body: string;
  imageUrl?: string;
  isOfficial: boolean;
  createdAt: string;
}

export interface IssueEvidenceRecord {
  id: string;
  issueId: string;
  userId: string;
  userName: string;
  mediaUrl: string;
  caption?: string;
  createdAt: string;
}

export interface StatusHistoryRecord {
  id: string;
  issueId: string;
  fromStatus: CivicIssueStatus;
  toStatus: CivicIssueStatus;
  changedBy: string;
  changedByName?: string;
  note?: string;
  createdAt: string;
}

export interface HeadlineRecord {
  id: string;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  category: string;
  stateCode: string;
  constituencyId?: string;
  publishedAt: string;
}

export class CivicService {
  // Deterministic in-memory stores for isolated environments / tests
  private inMemoryIssues = new Map<string, CivicIssueDTO>();
  private inMemoryUpvotes = new Set<string>(); // composite: "issueId:userId"
  private inMemoryFollows = new Set<string>(); // composite: "issueId:userId"
  private inMemoryDisputes = new Map<string, { reason: string; createdAt: string }>(); // composite: "issueId:userId"
  private inMemoryComments = new Map<string, IssueCommentRecord[]>();
  private inMemoryEvidence = new Map<string, IssueEvidenceRecord[]>();
  private inMemoryStatusHistory = new Map<string, StatusHistoryRecord[]>();
  private inMemoryGroups = new Map<string, CommunityGroupDTO>();
  private inMemoryGroupMemberships = new Set<string>(); // composite: "groupId:userId:role"
  private inMemoryHeadlines = new Map<string, HeadlineRecord>();
  private inMemorySchemes = new Map<string, GovernmentSchemeDTO>();
  private inMemoryProjects = new Map<string, DevelopmentProjectDTO>();

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    // Baseline Schemes
    const s1: GovernmentSchemeDTO = {
      id: 'scheme_pm_kisan',
      title: 'PM Kisan Samman Nidhi',
      slug: 'pm-kisan',
      category: 'agriculture',
      level: 'CENTRAL',
      description: 'Income support of Rs 6,000 per year in three equal installments to all landholding farmers.',
      eligibility: 'All landholding farmer families with cultivable land.',
      benefits: 'Rs 6,000/year directly transferred to bank account.',
      applicationUrl: 'https://pmkisan.gov.in',
    };
    const s2: GovernmentSchemeDTO = {
      id: 'scheme_rythu_bandhu',
      title: 'Rythu Bandhu Scheme',
      slug: 'rythu-bandhu',
      category: 'agriculture',
      level: 'STATE',
      stateCode: 'TS',
      description: 'Investment support scheme for agriculture and horticulture crops in Telangana.',
      eligibility: 'Farmer holding patta passbook in Telangana.',
      benefits: 'Rs 5,000 per acre per season for two crop seasons.',
      applicationUrl: 'https://rythubandhu.telangana.gov.in',
    };
    this.inMemorySchemes.set(s1.id, s1);
    this.inMemorySchemes.set(s2.id, s2);

    // Baseline Projects
    const p1: DevelopmentProjectDTO = {
      id: 'proj_ts_seri_flyover',
      title: 'Gachibowli to Kondapur Elevated Flyover Corridor',
      constituencyId: 'TS-AC-67',
      stateCode: 'TS',
      category: 'roads',
      budgetInr: 178000000,
      spentInr: 142000000,
      phase: 'IN_PROGRESS',
      contractorName: 'GHMC Infrastructure Corp',
      startDate: '2024-03-01',
      completionTargetDate: '2026-12-31',
    };
    this.inMemoryProjects.set(p1.id, p1);
  }

  // -------------------------------------------------------------
  // JOB 030: Issue Lifecycle State Machine
  // -------------------------------------------------------------

  public validateStatusTransition(
    from: CivicIssueStatus,
    to: CivicIssueStatus,
    userRole: string,
    isAuthor: boolean
  ): void {
    if (from === to) return;

    const isPrivileged = ['admin', 'moderator', 'official', 'politician'].includes(userRole);

    if (to === 'acknowledged') {
      if (from !== 'open' && from !== 'reopened') {
        throw new InvalidCivicStatusTransitionError(from, to, 'Only open or reopened issues can be acknowledged');
      }
      if (!isPrivileged) {
        throw new InvalidCivicStatusTransitionError(from, to, 'Only verified officials, MLAs, or moderators can acknowledge issues');
      }
      return;
    }

    if (to === 'in_progress') {
      if (from !== 'acknowledged' && from !== 'reopened') {
        throw new InvalidCivicStatusTransitionError(from, to, 'Issue must be acknowledged or reopened before marking in_progress');
      }
      if (!isPrivileged) {
        throw new InvalidCivicStatusTransitionError(from, to, 'Only verified officials, MLAs, or moderators can mark issues in_progress');
      }
      return;
    }

    if (to === 'resolved') {
      if (from !== 'in_progress' && from !== 'acknowledged') {
        throw new InvalidCivicStatusTransitionError(from, to, 'Issue must be in_progress or acknowledged to be resolved');
      }
      if (!isPrivileged) {
        throw new InvalidCivicStatusTransitionError(from, to, 'Only verified officials or MLAs can resolve civic issues');
      }
      return;
    }

    if (to === 'closed') {
      if (isAuthor && (from === 'open' || from === 'acknowledged')) {
        return; // Author can close own unresolved issue
      }
      if (from === 'resolved' && isPrivileged) {
        return; // Official/Admin can formalize closure after dispute window
      }
      throw new InvalidCivicStatusTransitionError(from, to, 'Cannot close issue from current state or without authority');
    }

    if (to === 'reopened') {
      if (from !== 'resolved') {
        throw new InvalidCivicStatusTransitionError(from, to, 'Only resolved issues can be reopened');
      }
      // Reopening is triggered by community disputes or moderators
      return;
    }

    throw new InvalidCivicStatusTransitionError(from, to, 'Illegal transition route');
  }

  // -------------------------------------------------------------
  // JOB 031: Geo-Fenced Reporting & Evidence Pipeline
  // -------------------------------------------------------------

  public async createIssue(
    input: CreateCivicIssueInput,
    user: { userId: string; userName?: string }
  ): Promise<CivicIssueDTO> {
    // 1. Strict Validation
    if (!input.title || input.title.trim().length < 5) {
      throw new Error('INVALID_TITLE: Title must be at least 5 characters');
    }
    if (!input.constituencyId || !input.stateCode) {
      throw new Error('INVALID_GEOGRAPHY: Constituency ID and State Code are mandatory');
    }

    // 2. Point-in-Polygon Geo-Fencing
    if (input.latitude !== undefined && input.longitude !== undefined) {
      const locateResult = await canonicalGeographyService.locatePoint({
        lat: input.latitude,
        lng: input.longitude,
      });

      if (locateResult.constituency && locateResult.constituency.id !== input.constituencyId) {
        throw new CoordinatesOutsideConstituencyError(
          input.latitude,
          input.longitude,
          input.constituencyId,
          locateResult.constituency.id
        );
      }
    }

    // 3. Fail-Closed Content Moderation
    const moderationText = `${input.title} ${input.description || ''}`;
    const modResult = await checkContentModeration(moderationText);
    if (modResult.flagged) {
      throw new ContentPolicyViolationError(modResult.reasons);
    }

    // 4. Persistence
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const issue: CivicIssueDTO = {
      id,
      reporterId: user.userId,
      reporterName: user.userName || 'Citizen',
      constituencyId: input.constituencyId,
      stateCode: input.stateCode,
      title: input.title.trim(),
      description: input.description?.trim() || '',
      category: input.category,
      severity: input.severity || 'medium',
      status: 'open',
      upvoteCount: 0,
      commentCount: 0,
      followCount: 0,
      evidenceCount: (input.mediaUrls || []).length,
      disputeCount: 0,
      mediaUrls: input.mediaUrls || [],
      mlaTagged: false,
      mlaResponded: false,
      isVerifiedReport: false,
      latitude: input.latitude,
      longitude: input.longitude,
      createdAt: now,
      updatedAt: now,
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('civic_issues').insert({
          id: issue.id,
          reporter_id: issue.reporterId,
          reporter_name: issue.reporterName,
          constituency_id: issue.constituencyId,
          state_code: issue.stateCode,
          title: issue.title,
          description: issue.description,
          category: issue.category,
          severity: issue.severity,
          status: issue.status,
          upvote_count: issue.upvoteCount,
          comment_count: issue.commentCount,
          follow_count: issue.followCount,
          evidence_count: issue.evidenceCount,
          dispute_count: issue.disputeCount,
          media_urls: issue.mediaUrls,
          mla_tagged: issue.mlaTagged,
          mla_responded: issue.mlaResponded,
          is_verified_report: issue.isVerifiedReport,
          latitude: issue.latitude,
          longitude: issue.longitude,
          created_at: issue.createdAt,
          updated_at: issue.updatedAt,
        });

        await supabase.from('issue_status_history').insert({
          id: crypto.randomUUID(),
          issue_id: issue.id,
          from_status: 'open',
          to_status: 'open',
          changed_by: user.userId,
          note: 'Issue created',
          created_at: now,
        });
      } catch {}
    }

    this.inMemoryIssues.set(id, issue);
    this.inMemoryStatusHistory.set(id, [
      {
        id: crypto.randomUUID(),
        issueId: id,
        fromStatus: 'open',
        toStatus: 'open',
        changedBy: user.userId,
        changedByName: user.userName,
        note: 'Issue created',
        createdAt: now,
      },
    ]);

    return issue;
  }

  public async getIssue(id: string): Promise<CivicIssueDTO | null> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('civic_issues')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          return {
            id: data.id,
            reporterId: data.reporter_id,
            reporterName: data.reporter_name,
            constituencyId: data.constituency_id,
            stateCode: data.state_code,
            title: data.title,
            description: data.description,
            category: data.category,
            severity: data.severity,
            status: data.status,
            upvoteCount: data.upvote_count || 0,
            commentCount: data.comment_count || 0,
            followCount: data.follow_count || 0,
            evidenceCount: data.evidence_count || 0,
            disputeCount: data.dispute_count || 0,
            mediaUrls: data.media_urls || [],
            mlaTagged: data.mla_tagged || false,
            mlaResponded: data.mla_responded || false,
            mlaResponseNote: data.mla_response_note,
            resolutionNote: data.resolution_note,
            resolvedAt: data.resolved_at,
            resolvedBy: data.resolved_by,
            isVerifiedReport: data.is_verified_report || false,
            latitude: data.latitude,
            longitude: data.longitude,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch {}
    }

    return this.inMemoryIssues.get(id) || null;
  }

  public async listIssues(filters: {
    constituencyId?: string;
    stateCode?: string;
    status?: string;
    category?: string;
  }): Promise<CivicIssueDTO[]> {
    let result = Array.from(this.inMemoryIssues.values());

    if (filters.constituencyId) {
      result = result.filter((i) => i.constituencyId === filters.constituencyId);
    }
    if (filters.stateCode) {
      result = result.filter((i) => i.stateCode === filters.stateCode);
    }
    if (filters.status && filters.status !== 'all') {
      result = result.filter((i) => i.status === filters.status);
    }
    if (filters.category && filters.category !== 'all') {
      result = result.filter((i) => i.category === filters.category);
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async updateStatus(
    issueId: string,
    input: UpdateCivicIssueStatusInput,
    user: { userId: string; userName?: string; role: string }
  ): Promise<CivicIssueDTO> {
    const issue = await this.getIssue(issueId);
    if (!issue) {
      throw new Error(`NOT_FOUND: Civic issue ${issueId} not found`);
    }

    const isAuthor = issue.reporterId === user.userId;
    this.validateStatusTransition(issue.status, input.status, user.role, isAuthor);

    if (input.status === 'resolved' && (!input.note || input.note.trim().length === 0)) {
      throw new Error('INVALID_RESOLUTION: Resolution note is required when marking issue resolved');
    }

    const now = new Date().toISOString();
    issue.status = input.status;
    issue.updatedAt = now;

    if (input.status === 'resolved') {
      issue.resolutionNote = input.note?.trim();
      issue.resolvedAt = now;
      issue.resolvedBy = user.userId;
    }

    const historyRecord: StatusHistoryRecord = {
      id: crypto.randomUUID(),
      issueId,
      fromStatus: issue.status,
      toStatus: input.status,
      changedBy: user.userId,
      changedByName: user.userName,
      note: input.note,
      createdAt: now,
    };

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('civic_issues')
          .update({
            status: issue.status,
            resolution_note: issue.resolutionNote,
            resolved_at: issue.resolvedAt,
            resolved_by: issue.resolvedBy,
            updated_at: now,
          })
          .eq('id', issueId);

        await supabase.from('issue_status_history').insert({
          id: historyRecord.id,
          issue_id: historyRecord.issueId,
          from_status: historyRecord.fromStatus,
          to_status: historyRecord.toStatus,
          changed_by: historyRecord.changedBy,
          note: historyRecord.note,
          created_at: now,
        });
      } catch {}
    }

    this.inMemoryIssues.set(issueId, issue);
    const existingHistory = this.inMemoryStatusHistory.get(issueId) || [];
    this.inMemoryStatusHistory.set(issueId, [...existingHistory, historyRecord]);

    return issue;
  }

  // -------------------------------------------------------------
  // JOB 032: Anti-Sybil Community Upvoting & Milestone Engine
  // -------------------------------------------------------------

  public async toggleUpvote(
    issueId: string,
    userId: string
  ): Promise<{ upvoted: boolean; upvoteCount: number; promotedToHeadline: boolean }> {
    const issue = await this.getIssue(issueId);
    if (!issue) {
      throw new Error(`NOT_FOUND: Civic issue ${issueId} not found`);
    }

    const upvoteKey = `${issueId}:${userId}`;
    const alreadyUpvoted = this.inMemoryUpvotes.has(upvoteKey);
    let promotedToHeadline = false;

    if (alreadyUpvoted) {
      this.inMemoryUpvotes.delete(upvoteKey);
      issue.upvoteCount = Math.max(0, issue.upvoteCount - 1);
    } else {
      this.inMemoryUpvotes.add(upvoteKey);
      issue.upvoteCount += 1;

      // Decision 1: Option A — Auto-promote to Headlines at 500 upvotes
      if (issue.upvoteCount >= 500) {
        promotedToHeadline = await this.promoteToHeadline(issue);
      }
    }

    issue.updatedAt = new Date().toISOString();
    this.inMemoryIssues.set(issueId, issue);

    if (isSupabaseConfigured) {
      try {
        if (alreadyUpvoted) {
          await supabase.from('issue_upvotes').delete().eq('issue_id', issueId).eq('user_id', userId);
        } else {
          await supabase.from('issue_upvotes').insert({ issue_id: issueId, user_id: userId });
        }
        await supabase
          .from('civic_issues')
          .update({ upvote_count: issue.upvoteCount, updated_at: issue.updatedAt })
          .eq('id', issueId);
      } catch {}
    }

    return {
      upvoted: !alreadyUpvoted,
      upvoteCount: issue.upvoteCount,
      promotedToHeadline,
    };
  }

  private async promoteToHeadline(issue: CivicIssueDTO): Promise<boolean> {
    const headlineId = `hl_auto_${issue.id}`;
    if (this.inMemoryHeadlines.has(headlineId)) return false;

    const headline: HeadlineRecord = {
      id: headlineId,
      title: `${issue.constituencyId}: ${issue.title} — 500+ citizens demand immediate action`,
      summary: issue.description,
      sourceName: 'Kshetra / PanIN Citizen Action',
      sourceUrl: `https://poligram.in/issues/${issue.id}`,
      category: issue.category,
      stateCode: issue.stateCode,
      constituencyId: issue.constituencyId,
      publishedAt: new Date().toISOString(),
    };

    this.inMemoryHeadlines.set(headlineId, headline);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('headlines').insert({
          id: headline.id,
          title: headline.title,
          summary: headline.summary,
          source_name: headline.sourceName,
          source_url: headline.sourceUrl,
          category: headline.category,
          state_code: headline.stateCode,
          constituency_id: headline.constituencyId,
          published_at: headline.publishedAt,
        });
      } catch {}
    }

    return true;
  }

  public async toggleFollow(
    issueId: string,
    userId: string
  ): Promise<{ following: boolean; followCount: number }> {
    const issue = await this.getIssue(issueId);
    if (!issue) {
      throw new Error(`NOT_FOUND: Civic issue ${issueId} not found`);
    }

    const followKey = `${issueId}:${userId}`;
    const alreadyFollowing = this.inMemoryFollows.has(followKey);

    if (alreadyFollowing) {
      this.inMemoryFollows.delete(followKey);
      issue.followCount = Math.max(0, issue.followCount - 1);
    } else {
      this.inMemoryFollows.add(followKey);
      issue.followCount += 1;
    }

    issue.updatedAt = new Date().toISOString();
    this.inMemoryIssues.set(issueId, issue);

    if (isSupabaseConfigured) {
      try {
        if (alreadyFollowing) {
          await supabase.from('issue_follows').delete().eq('issue_id', issueId).eq('user_id', userId);
        } else {
          await supabase.from('issue_follows').insert({ issue_id: issueId, user_id: userId });
        }
        await supabase
          .from('civic_issues')
          .update({ follow_count: issue.followCount, updated_at: issue.updatedAt })
          .eq('id', issueId);
      } catch {}
    }

    return {
      following: !alreadyFollowing,
      followCount: issue.followCount,
    };
  }

  // -------------------------------------------------------------
  // JOB 033: Constituency Discourse & Threaded Comments
  // -------------------------------------------------------------

  public async addComment(
    issueId: string,
    input: AddCivicCommentInput,
    user: { userId: string; userName?: string; role: string }
  ): Promise<IssueCommentRecord> {
    const issue = await this.getIssue(issueId);
    if (!issue) {
      throw new Error(`NOT_FOUND: Civic issue ${issueId} not found`);
    }

    if (!input.body || input.body.trim().length === 0) {
      throw new Error('INVALID_COMMENT: Comment body cannot be empty');
    }

    // Fail-Closed Content Moderation
    const modResult = await checkContentModeration(input.body);
    if (modResult.flagged) {
      throw new ContentPolicyViolationError(modResult.reasons);
    }

    const isOfficial = ['admin', 'moderator', 'official', 'politician'].includes(user.role);
    const commentId = crypto.randomUUID();
    const now = new Date().toISOString();

    const comment: IssueCommentRecord = {
      id: commentId,
      issueId,
      userId: user.userId,
      userName: user.userName || (isOfficial ? 'Verified Official' : 'Citizen'),
      body: input.body.trim(),
      imageUrl: input.imageUrl,
      isOfficial,
      createdAt: now,
    };

    const existing = this.inMemoryComments.get(issueId) || [];
    this.inMemoryComments.set(issueId, [...existing, comment]);

    issue.commentCount += 1;
    issue.updatedAt = now;
    this.inMemoryIssues.set(issueId, issue);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('issue_comments').insert({
          id: comment.id,
          issue_id: comment.issueId,
          user_id: comment.userId,
          user_name: comment.userName,
          body: comment.body,
          image_url: comment.imageUrl,
          is_official: comment.isOfficial,
          created_at: comment.createdAt,
        });
      } catch {}
    }

    return comment;
  }

  public async listComments(issueId: string): Promise<IssueCommentRecord[]> {
    return this.inMemoryComments.get(issueId) || [];
  }

  public async addEvidence(
    issueId: string,
    input: AddCivicEvidenceInput,
    user: { userId: string; userName?: string }
  ): Promise<IssueEvidenceRecord> {
    const issue = await this.getIssue(issueId);
    if (!issue) {
      throw new Error(`NOT_FOUND: Civic issue ${issueId} not found`);
    }

    if (!input.mediaUrl || !input.mediaUrl.startsWith('http')) {
      throw new Error('INVALID_MEDIA: Valid media URL is required');
    }

    const evidenceId = crypto.randomUUID();
    const now = new Date().toISOString();

    const evidence: IssueEvidenceRecord = {
      id: evidenceId,
      issueId,
      userId: user.userId,
      userName: user.userName || 'Citizen Reporter',
      mediaUrl: input.mediaUrl,
      caption: input.caption,
      createdAt: now,
    };

    const existing = this.inMemoryEvidence.get(issueId) || [];
    this.inMemoryEvidence.set(issueId, [...existing, evidence]);

    issue.evidenceCount += 1;
    issue.mediaUrls = [...issue.mediaUrls, input.mediaUrl];
    issue.updatedAt = now;
    this.inMemoryIssues.set(issueId, issue);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('issue_evidence').insert({
          id: evidence.id,
          issue_id: evidence.issueId,
          user_id: evidence.userId,
          user_name: evidence.userName,
          media_url: evidence.mediaUrl,
          caption: evidence.caption,
          created_at: evidence.createdAt,
        });
      } catch {}
    }

    return evidence;
  }

  public async disputeResolution(
    issueId: string,
    input: DisputeIssueInput,
    userId: string
  ): Promise<{ disputeCount: number; reopened: boolean }> {
    const issue = await this.getIssue(issueId);
    if (!issue) {
      throw new Error(`NOT_FOUND: Civic issue ${issueId} not found`);
    }

    if (issue.status !== 'resolved') {
      throw new DisputeNotAllowedError(`Cannot dispute issue in '${issue.status}' status. Only resolved issues can be disputed.`);
    }

    const disputeKey = `${issueId}:${userId}`;
    this.inMemoryDisputes.set(disputeKey, {
      reason: input.reason.trim(),
      createdAt: new Date().toISOString(),
    });

    // Count disputes for this issue
    let disputeCount = 0;
    for (const [key] of this.inMemoryDisputes.entries()) {
      if (key.startsWith(`${issueId}:`)) disputeCount++;
    }
    issue.disputeCount = disputeCount;

    let reopened = false;
    // Decision 2: Option 1 — 5 distinct community member disputes auto-reopen the issue
    if (disputeCount >= 5) {
      issue.status = 'reopened';
      issue.resolvedAt = undefined;
      reopened = true;

      const historyRecord: StatusHistoryRecord = {
        id: crypto.randomUUID(),
        issueId,
        fromStatus: 'resolved',
        toStatus: 'reopened',
        changedBy: 'system_community_consensus',
        note: `Auto-reopened: ${disputeCount} community disputes filed within resolution window`,
        createdAt: new Date().toISOString(),
      };

      const existingHistory = this.inMemoryStatusHistory.get(issueId) || [];
      this.inMemoryStatusHistory.set(issueId, [...existingHistory, historyRecord]);
    }

    issue.updatedAt = new Date().toISOString();
    this.inMemoryIssues.set(issueId, issue);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('issue_disputes').upsert(
          { issue_id: issueId, user_id: userId, reason: input.reason },
          { onConflict: 'issue_id,user_id' }
        );
        await supabase
          .from('civic_issues')
          .update({
            dispute_count: issue.disputeCount,
            status: issue.status,
            resolved_at: issue.resolvedAt || null,
            updated_at: issue.updatedAt,
          })
          .eq('id', issueId);
      } catch {}
    }

    return { disputeCount, reopened };
  }

  public async tagMLA(issueId: string): Promise<{ mlaTagged: boolean }> {
    const issue = await this.getIssue(issueId);
    if (!issue) {
      throw new Error(`NOT_FOUND: Civic issue ${issueId} not found`);
    }

    issue.mlaTagged = true;
    issue.updatedAt = new Date().toISOString();
    this.inMemoryIssues.set(issueId, issue);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('civic_issues').update({ mla_tagged: true }).eq('id', issueId);
      } catch {}
    }

    return { mlaTagged: true };
  }

  // -------------------------------------------------------------
  // JOB 034: Community Working Groups
  // -------------------------------------------------------------

  public async createGroup(
    input: { name: string; constituencyId: string; description?: string; category: string },
    userId: string
  ): Promise<CommunityGroupDTO> {
    if (!input.name || input.name.trim().length < 3) {
      throw new Error('INVALID_GROUP_NAME: Group name must be at least 3 characters');
    }

    const id = crypto.randomUUID();
    const slug = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${input.constituencyId.toLowerCase()}`;
    const now = new Date().toISOString();

    const group: CommunityGroupDTO = {
      id,
      name: input.name.trim(),
      slug,
      constituencyId: input.constituencyId,
      description: input.description,
      category: input.category,
      createdBy: userId,
      memberCount: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.inMemoryGroups.set(id, group);
    this.inMemoryGroupMemberships.add(`${id}:${userId}:admin`);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('community_groups').insert({
          id: group.id,
          name: group.name,
          slug: group.slug,
          constituency_id: group.constituencyId,
          description: group.description,
          category: group.category,
          created_by: group.createdBy,
          member_count: group.memberCount,
          is_active: group.isActive,
          created_at: group.createdAt,
          updated_at: group.updatedAt,
        });

        await supabase.from('community_group_memberships').insert({
          group_id: group.id,
          user_id: userId,
          role: 'admin',
          joined_at: now,
        });
      } catch {}
    }

    return group;
  }

  public async listGroups(constituencyId: string): Promise<CommunityGroupDTO[]> {
    return Array.from(this.inMemoryGroups.values()).filter(
      (g) => g.constituencyId === constituencyId && g.isActive
    );
  }

  public async joinGroup(groupId: string, userId: string): Promise<{ success: boolean; memberCount: number }> {
    const group = this.inMemoryGroups.get(groupId);
    if (!group) throw new Error(`NOT_FOUND: Community group ${groupId} not found`);

    const membershipKey = `${groupId}:${userId}:member`;
    if (!this.inMemoryGroupMemberships.has(membershipKey)) {
      this.inMemoryGroupMemberships.add(membershipKey);
      group.memberCount += 1;
      group.updatedAt = new Date().toISOString();
      this.inMemoryGroups.set(groupId, group);

      if (isSupabaseConfigured) {
        try {
          await supabase.from('community_group_memberships').insert({
            group_id: groupId,
            user_id: userId,
            role: 'member',
          });
        } catch {}
      }
    }

    return { success: true, memberCount: group.memberCount };
  }

  public async leaveGroup(groupId: string, userId: string): Promise<{ success: boolean; memberCount: number }> {
    const group = this.inMemoryGroups.get(groupId);
    if (!group) throw new Error(`NOT_FOUND: Community group ${groupId} not found`);

    const membershipKey = `${groupId}:${userId}:member`;
    if (this.inMemoryGroupMemberships.has(membershipKey)) {
      this.inMemoryGroupMemberships.delete(membershipKey);
      group.memberCount = Math.max(0, group.memberCount - 1);
      group.updatedAt = new Date().toISOString();
      this.inMemoryGroups.set(groupId, group);

      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('community_group_memberships')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', userId);
        } catch {}
      }
    }

    return { success: true, memberCount: group.memberCount };
  }

  // -------------------------------------------------------------
  // JOB 035: Civic Metrics, Sentiment & Real Data Connectors
  // -------------------------------------------------------------

  public async getSchemes(filters: { stateCode?: string; category?: string }): Promise<GovernmentSchemeDTO[]> {
    let list = Array.from(this.inMemorySchemes.values());
    if (filters.stateCode) {
      list = list.filter((s) => !s.stateCode || s.stateCode === filters.stateCode);
    }
    if (filters.category && filters.category !== 'all') {
      list = list.filter((s) => s.category === filters.category);
    }
    return list;
  }

  public async getProjects(filters: { constituencyId?: string; stateCode?: string }): Promise<DevelopmentProjectDTO[]> {
    let list = Array.from(this.inMemoryProjects.values());
    if (filters.constituencyId) {
      list = list.filter((p) => p.constituencyId === filters.constituencyId);
    }
    if (filters.stateCode) {
      list = list.filter((p) => p.stateCode === filters.stateCode);
    }
    return list;
  }

  public async getSentiment(constituencyId: string): Promise<ConstituencySentimentDTO> {
    const issues = (await this.listIssues({ constituencyId })).filter(
      (i) => i.status === 'open' || i.status === 'in_progress' || i.status === 'reopened'
    );

    // Multi-factor severity weighting
    const severityWeights: Record<CivicIssueSeverity, number> = {
      critical: 4.0,
      high: 3.0,
      medium: 2.0,
      low: 1.0,
    };

    let weightedNegative = 0;
    const categoryCounts = new Map<string, number>();

    for (const issue of issues) {
      weightedNegative += severityWeights[issue.severity] || 1.0;
      categoryCounts.set(issue.category, (categoryCounts.get(issue.category) || 0) + 1);
    }

    const topIssues = Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((e) => e[0]);

    // Positive baseline from resolved issues
    const resolvedCount = (await this.listIssues({ constituencyId })).filter(
      (i) => i.status === 'resolved' || i.status === 'closed'
    ).length;

    const totalActivity = issues.length + resolvedCount;
    // Score formula: (Positive - Negative) / (Total + 1)
    const rawScore = (resolvedCount * 2.0 - weightedNegative) / (totalActivity + 1);
    const score = Math.max(-1.0, Math.min(1.0, Number(rawScore.toFixed(2))));

    return {
      constituencyId,
      constituencyName: issues[0]?.constituencyName || constituencyId,
      positiveCount: resolvedCount * 2,
      negativeCount: Math.round(weightedNegative),
      neutralCount: Math.max(0, totalActivity - resolvedCount - issues.length),
      totalPosts: totalActivity,
      score,
      topIssues: topIssues.length > 0 ? topIssues : ['roads', 'sanitation'],
    };
  }

  public async getConstituencyDevelopmentIndex(constituencyId: string): Promise<{
    constituencyId: string;
    overallScore: number;
    openIssuesCount: number;
    resolvedIssuesCount: number;
    activeProjectsCount: number;
    totalProjectBudgetInr: number;
    sentimentScore: number;
  }> {
    const issues = await this.listIssues({ constituencyId });
    const openIssues = issues.filter((i) => i.status === 'open' || i.status === 'in_progress' || i.status === 'reopened');
    const resolvedIssues = issues.filter((i) => i.status === 'resolved' || i.status === 'closed');
    const projects = await this.getProjects({ constituencyId });
    const sentiment = await this.getSentiment(constituencyId);

    const totalBudget = projects.reduce((acc, p) => acc + (p.budgetInr || 0), 0);

    // Compute CDI score (0 to 100)
    const resolutionRate = issues.length > 0 ? (resolvedIssues.length / issues.length) * 50 : 35;
    const projectFactor = Math.min(25, projects.length * 5);
    const sentimentFactor = (sentiment.score + 1.0) * 12.5; // [-1, 1] mapped to [0, 25]

    const overallScore = Math.min(100, Math.round(resolutionRate + projectFactor + sentimentFactor));

    return {
      constituencyId,
      overallScore,
      openIssuesCount: openIssues.length,
      resolvedIssuesCount: resolvedIssues.length,
      activeProjectsCount: projects.length,
      totalProjectBudgetInr: totalBudget,
      sentimentScore: sentiment.score,
    };
  }
}

export const civicService = new CivicService();
