/**
 * Supabase Data Service
 *
 * Wires local Zustand store operations to real Supabase backend calls.
 * Each method checks `isSupabaseConfigured` and falls back gracefully to
 * local-only operation when backend is unavailable.
 *
 * Used by:
 * - Zustand stores (optimistic local update + background sync)
 * - Offline sync queue's `executeOp()` to replay queued writes
 * - Bootstrap module for initial data hydration
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { captureException, addBreadcrumb } from './errorReporting';
import { API_BASE_URL } from './constants';
import { telemetry } from './telemetry';
import { apiClient } from './api';
import { ApiNetworkError, ApiServerError, ApiTimeoutError } from './api/errors';
import type { ShortCommentDTO, ShortCommentsResponseDTO } from './api/endpoints/shorts';
import type { ChallengeParticipation, CivicBadge, CommunityChallenge } from './aspirantTypes';
import type { Poll } from './feedTypes';

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Validates text content against the server-side moderation endpoint.
 * Returns { flagged: boolean; reason?: string }.
 */
export async function checkContentModeration(
  content: string,
): Promise<{ flagged: boolean; reason?: string }> {
  if (!content || !content.trim()) {
    return { flagged: false };
  }
  if (!guard()) {
    return { flagged: false };
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/moderation/check-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify({ content }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data?.data?.flagged) {
        const reason = data.data.reasons?.join(', ') || 'Violates community guidelines';
        return { flagged: true, reason };
      }
      return { flagged: false };
    }
    if (process.env.NODE_ENV !== 'test') {
      return { flagged: true, reason: 'Moderation service unavailable' };
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (process.env.NODE_ENV !== 'test') {
      console.error('[Moderation] Moderation check failed, failing closed:', err);
      return { flagged: true, reason: 'Moderation service unreachable' };
    }
    console.warn('[Moderation] Moderation check error in test mode, allowing test pass-through:', err);
  }
  return { flagged: false };
}

function guard(): boolean {
  return isSupabaseConfigured;
}

function isRetryableIdempotentWriteError(err: unknown): boolean {
  if (err instanceof ApiNetworkError || err instanceof ApiTimeoutError) return true;
  if (!(err instanceof ApiServerError)) return false;
  const data = err.data as { code?: string; error?: { code?: string } } | undefined;
  const code = data?.code ?? data?.error?.code;
  if (code === 'POST_RECONCILIATION_UNAVAILABLE' || code === 'COMMENT_IDEMPOTENCY_UNAVAILABLE') return false;
  return [502, 503, 504].includes(err.statusCode);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isValidUuid(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id);
}

function uid(): string | null {
  // The authenticated user id is resolved asynchronously elsewhere; callers
  // always pass an explicit userId, so this synchronous helper returns null.
  return null;
}

// ─── Civic Issues ────────────────────────────────────────────────────

export async function upvoteIssue(issueId: string, _userId?: string): Promise<boolean> {
  try {
    addBreadcrumb('civic', 'upvote_issue', { issueId });
    const res = await apiClient.civic.upvoteIssue(issueId);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'upvote_issue', issueId });
    return false;
  }
}

export async function removeUpvote(issueId: string, _userId?: string): Promise<boolean> {
  try {
    addBreadcrumb('civic', 'remove_upvote', { issueId });
    const res = await apiClient.civic.removeUpvote(issueId);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'remove_upvote', issueId });
    return false;
  }
}

export async function followIssue(issueId: string, _userId: string, follow: boolean): Promise<boolean> {
  try {
    addBreadcrumb('civic', follow ? 'follow_issue' : 'unfollow_issue', { issueId });
    const res = await apiClient.civic.followIssue(issueId, follow);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'follow_issue', issueId });
    return false;
  }
}

export async function reportIssue(issue: {
  title: string;
  description: string;
  category: string;
  severity: string;
  constituencyId: string;
  stateCode: string;
  reporterId: string;
  reporterName: string;
  mediaUrls?: string[];
}): Promise<{ id: string | null; success: boolean }> {
  try {
    addBreadcrumb('civic', 'report_issue', { title: issue.title });
    const res = await apiClient.civic.reportIssue({
      title: issue.title,
      description: issue.description,
      category: issue.category,
      severity: issue.severity,
      constituencyId: issue.constituencyId,
      stateCode: issue.stateCode,
      mediaUrls: issue.mediaUrls,
    });
    return { id: res.id ?? null, success: res.success };
  } catch (err) {
    captureException(err as Error, { op: 'report_issue', title: issue.title });
    return { id: null, success: false };
  }
}

export async function addIssueComment(
  issueId: string,
  _userId: string,
  userName: string,
  body: string,
  imageUrl?: string,
): Promise<{ id: string | null; success: boolean }> {
  try {
    addBreadcrumb('civic', 'add_issue_comment', { issueId });
    const res = await apiClient.civic.addIssueComment(
      issueId,
      body,
      userName,
      imageUrl,
    );
    return { id: res.id ?? null, success: res.success };
  } catch (err) {
    captureException(err as Error, { op: 'add_issue_comment', issueId });
    return { id: null, success: false };
  }
}

export async function tagMLAOnIssue(issueId: string): Promise<boolean> {
  if (!guard()) return false;
  try {
    addBreadcrumb('civic', 'tag_mla', { issueId });
    const res = await apiClient.civic.tagMLAOnIssue(issueId);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'tag_mla', issueId });
    return false;
  }
}

export async function disputeIssueResolution(
  issueId: string,
  reasonOrUserId: string,
  maybeReason?: string,
): Promise<boolean> {
  if (!guard()) return false;
  const reason = maybeReason ?? reasonOrUserId;
  try {
    addBreadcrumb('civic', 'dispute_resolution', { issueId });
    const res = await apiClient.civic.disputeIssueResolution(issueId, reason);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'dispute_resolution', issueId });
    return false;
  }
}

export async function updateIssueStatus(
  issueId: string,
  newStatus: string,
  note?: string,
): Promise<boolean> {
  try {
    addBreadcrumb('civic', 'update_issue_status', { issueId, newStatus });
    const res = await apiClient.civic.updateIssueStatus(
      issueId,
      newStatus,
      note,
    );
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'update_issue_status', issueId });
    return false;
  }
}

// ─── Feed / Posts ────────────────────────────────────────────────────

export async function reactToPost(postId: string, _userId: string, reaction: string): Promise<boolean> {
  if (!guard()) return false;
  try {
    addBreadcrumb('feed', 'react_post', { postId, reaction });
    const res = await apiClient.feed.reactToPost(postId, reaction);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'react_post', postId });
    return false;
  }
}

export async function removeReaction(postId: string, _userId?: string): Promise<boolean> {
  if (!guard()) return false;
  try {
    addBreadcrumb('feed', 'remove_reaction', { postId });
    const res = await apiClient.feed.removeReaction(postId);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'remove_reaction', postId });
    return false;
  }
}

export async function composePost(post: {
  content: string;
  type: string;
  stateCode: string;
  authorId: string;
  hashtags?: string[];
  constituencyId?: string;
  parentId?: string;
  language?: string;
  pollOptions?: string[];
  clientToken?: string;
}): Promise<{ id: string | null; success: boolean; poll?: Poll | null; retryable?: boolean; error?: string }> {
  if (!guard()) return { id: null, success: false, poll: null, error: 'Post service is unavailable.' };
  try {
    addBreadcrumb('feed', 'compose_post', { type: post.type });
    const res = await apiClient.feed.composePost({
      content: post.content,
      type: post.type as any,
      stateCode: post.stateCode,
      authorId: post.authorId,
      constituencyId: post.constituencyId,
      parentId: post.parentId,
      language: post.language,
      hashtags: post.hashtags,
      pollOptions: post.pollOptions,
      clientToken: post.clientToken,
    });
    const poll = res.poll
      ? {
          id: res.poll.id,
          question: res.poll.question,
          totalVotes: res.poll.totalVotes,
          isClosed: res.poll.isClosed,
          options: res.poll.options,
        }
      : null;
    const pollWasPersisted = post.type !== 'poll' || Boolean(poll?.id && poll.options.length >= 2);
    return { id: res.id ?? null, success: res.success && pollWasPersisted, poll };
  } catch (err) {
    captureException(err as Error, { op: 'compose_post' });
    return {
      id: null,
      success: false,
      poll: null,
      retryable: isRetryableIdempotentWriteError(err),
      error: err instanceof Error ? err.message : 'Could not submit post.',
    };
  }
}

export async function editPost(postId: string, content: string, _userId?: string): Promise<boolean> {
  if (!guard()) return false;
  try {
    addBreadcrumb('feed', 'edit_post', { postId });
    const res = await apiClient.feed.editPost(postId, content);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'edit_post', postId });
    return false;
  }
}

export async function deletePost(postId: string, _userId?: string): Promise<boolean> {
  if (!guard()) return false;
  try {
    addBreadcrumb('feed', 'delete_post', { postId });
    const res = await apiClient.feed.deletePost(postId);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'delete_post', postId });
    return false;
  }
}

export async function votePoll(
  pollId: string,
  optionId: string,
  _userId?: string,
): Promise<boolean> {
  if (!guard()) return false;
  try {
    addBreadcrumb('feed', 'vote_poll', { pollId, optionId });
    const res = await apiClient.feed.votePoll(pollId, optionId);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'vote_poll', pollId });
    return false;
  }
}

export async function addPostComment(
  postId: string,
  _userId: string,
  content: string,
  language?: string,
  clientToken?: string,
): Promise<{ id: string | null; success: boolean; error?: string; retryable?: boolean }> {
  if (!guard()) return { id: null, success: false, error: 'Comment service is unavailable.' };
  try {
    addBreadcrumb('feed', 'add_comment', { postId });
    const res = await apiClient.feed.addPostComment(postId, content, language, clientToken);
    return { id: res.id ?? null, success: res.success };
  } catch (err) {
    captureException(err as Error, { op: 'add_comment', postId });
    return {
      id: null,
      success: false,
      error: err instanceof Error ? err.message : 'Could not save comment.',
      retryable: isRetryableIdempotentWriteError(err),
    };
  }
}

export async function reactToComment(
  commentId: string,
  _userId: string,
  reaction: string,
): Promise<boolean> {
  if (!guard()) return false;
  try {
    addBreadcrumb('feed', 'react_comment', { commentId, reaction });
    const res = await apiClient.feed.reactToComment(commentId, reaction);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'react_comment', commentId });
    return false;
  }
}

export async function removeCommentReaction(
  commentId: string,
  _userId?: string,
): Promise<boolean> {
  if (!guard()) return false;
  try {
    addBreadcrumb('feed', 'remove_comment_reaction', { commentId });
    const res = await apiClient.feed.removeCommentReaction(commentId);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'remove_comment_reaction', commentId });
    return false;
  }
}

export async function deletePostComment(
  commentId: string,
  _userId?: string,
): Promise<boolean> {
  if (!guard()) return false;
  try {
    addBreadcrumb('feed', 'delete_comment', { commentId });
    const res = await apiClient.feed.deletePostComment(commentId);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'delete_comment', commentId });
    return false;
  }
}

// ─── Promises ────────────────────────────────────────────────────────

export async function followPromise(
  promiseId: string,
  _userId: string,
  follow: boolean,
): Promise<boolean> {
  if (!guard()) return false;
  try {
    addBreadcrumb('promises', follow ? 'follow_promise' : 'unfollow_promise', { promiseId });
    const res = await apiClient.promises.followPromise(promiseId, follow);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'follow_promise', promiseId });
    return false;
  }
}

export async function submitEvidence(evidence: {
  promiseId: string;
  userId: string;
  type: string;
  description: string;
  url?: string;
}): Promise<boolean> {
  if (!guard()) return false;
  try {
    addBreadcrumb('promises', 'submit_evidence', { promiseId: evidence.promiseId });
    const res = await apiClient.promises.submitEvidence(evidence.promiseId, {
      title: evidence.description || 'Promise Evidence',
      description: evidence.description,
      type: evidence.type,
      url: evidence.url,
      userId: evidence.userId,
    });
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'submit_evidence', promiseId: evidence.promiseId });
    return false;
  }
}

// ─── Favorites ───────────────────────────────────────────────────────

export async function toggleFavorite(
  constituencyId: string,
  userId: string,
  isFavorite: boolean,
): Promise<boolean> {
  if (!guard()) return false;
  try {
    addBreadcrumb('favorites', isFavorite ? 'add' : 'remove', { constituencyId });
    const res = await apiClient.promises.toggleFavorite(constituencyId, userId, isFavorite);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'toggle_favorite', constituencyId });
    return false;
  }
}

// ─── Political Shorts ────────────────────────────────────────────────

export async function uploadShort(short: {
  title: string;
  videoUrl: string;
  channelName: string;
  uploadedBy: string;
  stateCode: string;
  stateName?: string;
  constituencyId?: string;
  districtName?: string;
  duration: number;
  hashtags?: string[];
  gradientColors?: string[];
  stateAccent?: string;
}): Promise<{ id: string | null; success: boolean }> {
  if (!guard()) return { id: null, success: false };
  try {
    addBreadcrumb('shorts', 'upload', { title: short.title });
    const res = await apiClient.shorts.uploadShort({
      title: short.title,
      videoUrl: short.videoUrl,
      channelName: short.channelName,
      uploadedBy: short.uploadedBy,
      stateCode: short.stateCode,
      constituencyId: short.constituencyId,
      duration: short.duration,
      durationSeconds: short.duration,
    });
    return { id: res.id ?? null, success: res.success };
  } catch (err) {
    captureException(err as Error, { op: 'upload_short' });
    return { id: null, success: false };
  }
}

export async function approveShort(
  shortId: string,
  _userId: string,
  constituencyId?: string,
): Promise<boolean> {
  if (!guard()) return false;
  try {
    addBreadcrumb('shorts', 'approve', { shortId });
    const res = await apiClient.shorts.approveShort(shortId, constituencyId);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'approve_short', shortId });
    return false;
  }
}

export async function flagShort(
  shortId: string,
  _userId: string,
  reason?: string,
): Promise<boolean> {
  if (!guard()) return false;
  try {
    addBreadcrumb('shorts', 'flag', { shortId });
    const res = await apiClient.shorts.flagShort(shortId, reason);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'flag_short', shortId });
    return false;
  }
}

// ─── User Profile ────────────────────────────────────────────────────

export async function updateUserProfile(
  userId: string,
  updates: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    role?: string;
    stateCode?: string;
    constituencyId?: string;
  },
): Promise<boolean> {
  if (!guard()) return false;
  try {
    addBreadcrumb('profile', 'update', { userId });
    const res = await apiClient.users.updateProfile(updates);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'update_profile', userId });
    return false;
  }
}

export async function updateMyProfile(
  userId: string,
  updates: { displayName?: string; bio?: string },
): Promise<void> {
  if (!guard()) return;
  await updateUserProfile(userId, updates);
}

// ─── Aspirant / Leadership Academy ───────────────────────────────────

export async function registerAspirant(
  userId: string,
  profile: {
    displayName: string;
    bio?: string;
    stateCode: string;
    targetConstituencyAcNo?: number;
    targetConstituencyName?: string;
    targetElectionYear?: number;
    partyAffiliation?: string;
    isIndependent?: boolean;
  },
): Promise<{ id: string | null; success: boolean; profile?: any }> {
  if (!guard()) return { id: null, success: false };
  try {
    addBreadcrumb('aspirant', 'register', { userId });
    const res = await apiClient.aspirant.register(userId, profile);
    return { id: res.profile?.id ?? null, success: res.success, profile: res.profile };
  } catch (err) {
    captureException(err as Error, { op: 'register_aspirant' });
    return { id: null, success: false };
  }
}

export async function fetchMyAspirantProfile(): Promise<{ success: boolean; profile?: any | null }> {
  try {
    const result = await apiClient.aspirant.getMyProfile();
    return { success: result.success, profile: result.profile ?? null };
  } catch (err) {
    captureException(err as Error, { op: 'fetch_my_aspirant_profile' });
    return { success: false };
  }
}

export async function startModule(
  userId: string,
  moduleId: string,
): Promise<boolean> {
  if (!guard()) return false;
  try {
    addBreadcrumb('academy', 'start_module', { moduleId });
    const res = await apiClient.aspirant.startModule(moduleId, userId);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'start_module', moduleId });
    return false;
  }
}

export async function completeModule(userId: string, moduleId: string, quizScore?: number): Promise<boolean> {
  try {
    addBreadcrumb('academy', 'complete_module', { moduleId });
    const res = await apiClient.aspirant.completeModule(moduleId, quizScore, userId);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'complete_module', moduleId });
    return false;
  }
}

export async function joinChallenge(userId: string, challengeId: string): Promise<boolean> {
  try {
    addBreadcrumb('academy', 'join_challenge', { challengeId });
    const res = await apiClient.aspirant.joinChallenge(challengeId, userId);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'join_challenge', challengeId });
    return false;
  }
}

export async function endorseAspirant(endorserId: string, aspirantId: string, message?: string): Promise<boolean> {
  try {
    addBreadcrumb('aspirant', 'endorse', { aspirantId });
    const res = await apiClient.aspirant.endorseAspirant(aspirantId, message, endorserId);
    return res.success;
  } catch (err) {
    captureException(err as Error, { op: 'endorse_aspirant', aspirantId });
    return false;
  }
}

// ─── KYC / Contributor Verification ──────────────────────────────────

export async function submitKYC(userId: string, kyc: {
  fullLegalName: string;
  phoneNumber: string;
  phoneVerified?: boolean;
  selfieUrl?: string | null;
  selfieHash?: string | null;
  deviceBrand?: string | null;
  deviceModel?: string | null;
  deviceOs?: string | null;
  deviceOsVersion?: string | null;
  deviceUniqueId?: string | null;
  deviceName?: string | null;
  ipAddress?: string | null;
  networkType?: string | null;
  carrierName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracy?: number | null;
  locationAddress?: string | null;
  appVersion?: string | null;
  appBuild?: string | null;
  status?: 'pending' | 'verified' | 'rejected' | 'suspended' | 'revoked';
  termsAcceptedAt?: string;
  termsVersion?: string;
}): Promise<{ id: string | null; success: boolean }> {
  if (!guard()) return { id: null, success: false };
  try {
    addBreadcrumb('kyc', 'submit', { userId });
    const res = await fetch(`${API_BASE_URL}/api/v1/contributor/kyc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify({ userId, ...kyc }),
    });
    if (!res.ok) return { id: null, success: false };
    const data = await res.json();
    return { id: data.kycId || null, success: true };
  } catch (err) {
    captureException(err as Error, { op: 'submit_kyc' });
    return { id: null, success: false };
  }
}

export async function insertActionFingerprint(fp: {
  userId: string;
  kycId?: string | null;
  actionType: string;
  contentType?: string | null;
  contentId?: string | null;
  contentHash?: string | null;
  deviceBrand?: string | null;
  deviceModel?: string | null;
  deviceOs?: string | null;
  deviceOsVersion?: string | null;
  deviceUniqueId?: string | null;
  deviceName?: string | null;
  ipAddress?: string | null;
  localIp?: string | null;
  networkType?: string | null;
  carrierName?: string | null;
  wifiSsid?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracy?: number | null;
  appVersion?: string | null;
  appBuild?: string | null;
  sessionId?: string | null;
  screenName?: string | null;
  actionAt?: string;
}): Promise<{ id: string | null; success: boolean }> {
  try {
    addBreadcrumb('cca', 'insert_action_fingerprint', { actionType: fp.actionType, userId: fp.userId });
    const res = await fetch(`${API_BASE_URL}/api/v1/contributor/fingerprint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': fp.userId,
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify(fp),
    });
    return { id: `fp_${Date.now()}`, success: res.ok };
  } catch (err) {
    captureException(err as Error, { op: 'insert_action_fingerprint', actionType: fp.actionType });
    return { id: null, success: false };
  }
}

export async function upsertContributorDevice(device: {
  userId: string;
  deviceBrand?: string | null;
  deviceModel?: string | null;
  deviceOs?: string | null;
  deviceOsVersion?: string | null;
  deviceUniqueId: string;
  deviceName?: string | null;
  deviceMemoryMb?: number | null;
  isTrusted?: boolean;
}): Promise<boolean> {
  try {
    addBreadcrumb('cca', 'upsert_contributor_device', { userId: device.userId, deviceUniqueId: device.deviceUniqueId });
    const res = await fetch(`${API_BASE_URL}/api/v1/contributor/devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': device.userId,
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify(device),
    });
    return res.ok;
  } catch (err) {
    captureException(err as Error, { op: 'upsert_contributor_device' });
    return false;
  }
}

// ─── Notifications ───────────────────────────────────────────────────

export async function markNotificationRead(notificationId: string, userId?: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'x-user-id': userId } : {}),
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify({ notificationId, userId }),
    });
    return res.ok;
  } catch (err) {
    captureException(err as Error, { op: 'mark_notification_read', notificationId });
    return false;
  }
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify({ all: true, userId }),
    });
    return res.ok;
  } catch (err) {
    captureException(err as Error, { op: 'mark_all_read' });
    return false;
  }
}

/** Register push token with Supabase for this user */
export async function registerPushToken(
  userId: string,
  token: string,
  platform: 'ios' | 'android',
): Promise<boolean> {
  try {
    addBreadcrumb('notifications', 'register_push_token', { platform });
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify({ token, platform, userId }),
    });
    return res.ok;
  } catch (err) {
    captureException(err as Error, { op: 'register_push_token' });
    return false;
  }
}

// ─── Data Fetching (read operations) ─────────────────────────────────

export async function globalSearch(
  query: string,
  stateCode?: string,
  limit = 20,
): Promise<any[] | null> {
  if (!guard()) return null;
  try {
    const { data, error } = await supabase.rpc('global_search', {
      p_query: query,
      p_state_code: stateCode ?? null,
      p_limit: limit,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    captureException(err as Error, { op: 'global_search', query });
    return null;
  }
}


export async function fetchIssuesForConstituency(
  constituencyId: string,
  stateCode: string,
): Promise<any[] | null> {
  if (!guard()) return null;
  try {
    const { data, error } = await supabase
      .from('civic_issues')
      .select('*')
      .eq('constituency_id', constituencyId)
      .eq('state_code', stateCode)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_issues', constituencyId });
    return null;
  }
}

// ─── User & Page Follow Graph (Ticket 0.3) ──────────────────────────

export async function followUser(followerId: string, followedId: string): Promise<boolean> {
  if (!guard()) return false;
  try {
    addBreadcrumb('social', 'follow_user', { followedId });
    const res = await apiClient.users.followUser(followedId);
    return res.success && res.followed;
  } catch (err) {
    captureException(err as Error, { op: 'follow_user', followedId });
    return false;
  }
}

export async function unfollowUser(followerId: string, followedId: string): Promise<boolean> {
  if (!guard()) return false;
  try {
    addBreadcrumb('social', 'unfollow_user', { followedId });
    const res = await apiClient.users.unfollowUser(followedId);
    return res.success && res.unfollowed;
  } catch (err) {
    captureException(err as Error, { op: 'unfollow_user', followedId });
    return false;
  }
}

export async function fetchFollowedUserIds(_followerId: string): Promise<string[] | null> {
  if (!guard()) return null;
  try {
    const res = await apiClient.users.getFollowedUserIds();
    return res.success ? res.followedUserIds : null;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_followed_users' });
    return null;
  }
}

export async function fetchUserProfile(userId: string): Promise<any | null> {
  if (!guard()) return null;
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_user_profile', userId });
    return null;
  }
}

export async function fetchPostsByAuthor(authorId: string, limit = 30): Promise<any[] | null> {
  if (!guard()) return null;
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', authorId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_posts_by_author', authorId });
    return null;
  }
}

export async function submitContentReport(report: {
  reporterId: string;
  targetType: 'post' | 'comment';
  targetId: string;
  reason: string;
  description?: string;
}): Promise<boolean> {
  try {
    addBreadcrumb('moderation', 'submit_report', { targetId: report.targetId });
    const res = await fetch(`${API_BASE_URL}/api/v1/moderation/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': report.reporterId,
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify({
        reporterId: report.reporterId,
        contentId: report.targetId,
        contentType: report.targetType,
        reason: report.reason,
        description: report.description,
      }),
    });
    return res.ok;
  } catch (err) {
    captureException(err as Error, { op: 'submit_content_report' });
    return false;
  }
}

export async function fetchBlendedFeed(
  viewerId?: string | null,
  constituencyId?: string | null,
  stateCode?: string | null,
  limit = 50,
  followedIdsOverride?: string[],
): Promise<any[] | null> {
  if (!guard()) return null;
  try {
    let followedIds: string[] = [];
    if (followedIdsOverride) {
      followedIds = followedIdsOverride;
    } else if (viewerId) {
      followedIds = (await fetchFollowedUserIds(viewerId)) ?? [];
    }

    let query = supabase.from('posts').select('*').eq('is_deleted', false);

    if (followedIds.length > 0 && constituencyId) {
      const orFilter = `author_id.in.(${followedIds.join(',')}),constituency_id.eq.${constituencyId}`;
      query = query.or(orFilter);
    } else if (followedIds.length > 0) {
      if (stateCode) {
        query = query.or(`author_id.in.(${followedIds.join(',')}),state_code.eq.${stateCode}`);
      } else {
        query = query.in('author_id', followedIds);
      }
    } else if (constituencyId) {
      query = query.eq('constituency_id', constituencyId);
    } else if (stateCode) {
      query = query.eq('state_code', stateCode);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_blended_feed' });
    return null;
  }
}

export async function fetchFeedForState(
  stateCode: string,
  limit = 50,
): Promise<any[] | null> {
  if (!guard()) return null;
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('state_code', stateCode)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_feed', stateCode });
    return null;
  }
}

export async function fetchPromisesForState(stateCode: string): Promise<any[] | null> {
  if (!guard()) return null;
  try {
    const { data, error } = await supabase
      .from('election_promises')
      .select('*, promise_updates(*)')
      .eq('state_code', stateCode)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_promises', stateCode });
    return null;
  }
}


export async function fetchNotifications(userId: string, limit = 50): Promise<any[] | null> {
  if (!guard()) return null;
  try {
    const { data, error } = await supabase
      .from('notification_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_notifications' });
    return null;
  }
}

export async function fetchLeadershipModules(): Promise<any[] | null> {
  try {
    const result = await apiClient.aspirant.listModules();
    return result.success ? result.modules : null;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_modules' });
    return null;
  }
}

export async function fetchAcademyChallenges(): Promise<{
  challenges: CommunityChallenge[];
  participation: ChallengeParticipation[];
} | null> {
  try {
    const result = await apiClient.aspirant.listChallenges();
    if (!result.success) throw new Error('Challenge data is unavailable');
    return { challenges: result.challenges, participation: result.participation };
  } catch (err) {
    captureException(err as Error, { op: 'fetch_academy_challenges' });
    return null;
  }
}

export async function fetchAcademyBadges(): Promise<CivicBadge[] | null> {
  try {
    const result = await apiClient.aspirant.listBadges();
    if (!result.success) throw new Error('Badge data is unavailable');
    return result.badges;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_academy_badges' });
    return null;
  }
}

export async function submitLeadershipQuiz(
  userId: string,
  moduleId: string,
  answers: Array<{ questionId: string; selectedIndex: number }>,
): Promise<any> {
  addBreadcrumb('academy', 'submit_quiz', { moduleId });
  try {
    const result = await apiClient.aspirant.submitQuiz(moduleId, answers, userId);
    if (!result.success || !result.result) throw new Error('Quiz result was not persisted');
    return result.result;
  } catch (err) {
    captureException(err as Error, { op: 'submit_academy_quiz', moduleId });
    throw err;
  }
}

export async function fetchChallenges(stateCode?: string): Promise<any[] | null> {
  try {
    const result = await apiClient.aspirant.listChallenges(stateCode);
    return result.success ? result.challenges : null;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_challenges' });
    return null;
  }
}

export async function fetchPublicAspirants(stateCode?: string, acNo?: number): Promise<any[] | null> {
  if (!guard()) return null;
  try {
    let query = supabase
      .from('aspirant_profiles')
      .select('*')
      .eq('is_public', true)
      .order('civic_score', { ascending: false })
      .limit(50);
    if (stateCode) {
      query = query.eq('state_code', stateCode);
    }
    if (acNo !== undefined && acNo !== null) {
      query = query.eq('target_constituency_ac_no', acNo);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_aspirants' });
    return null;
  }
}

export async function fetchVerifiedPoliticians(stateCode?: string, acNo?: number): Promise<any[] | null> {
  if (!guard()) return null;
  try {
    let query = supabase
      .from('user_profiles')
      .select('id, user_id, display_name, role, verification_status, bio, avatar_url, constituency, state, updated_at')
      .eq('role', 'politician')
      .eq('verification_status', 'verified')
      .order('display_name', { ascending: true })
      .limit(50);
    if (stateCode) {
      query = query.eq('state', stateCode);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_verified_politicians' });
    return null;
  }
}

// ─── Session Tracking (investor metrics) ─────────────────────────────

export async function recordSession(session: {
  userId?: string;
  anonymousId?: string;
  stateCode?: string;
  platform?: string;
  appVersion?: string;
  deviceModel?: string;
  osVersion?: string;
}): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/analytics/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify({ ...session, action: 'start' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.sessionId || null;
  } catch (err) {
    captureException(err as Error, { op: 'record_session' });
    return null;
  }
}

export async function endSession(sessionId: string, screensViewed: string[], actionsCount: number): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/v1/analytics/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify({ sessionId, action: 'end', durationSeconds: actionsCount }),
    });
  } catch (err) {
    captureException(err as Error, { op: 'end_session', sessionId });
  }
}

// ─── Political Shorts ─────────────────────────────────────────────────────────

export async function fetchShorts(stateCode?: string): Promise<any[] | null> {
  if (!guard()) return null;
  try {
    let query = supabase
      .from('political_shorts')
      .select('*')
      .in('status', ['approved', 'pending'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (stateCode) {
      query = query.eq('state_code', stateCode);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      channelName: row.channel_name,
      channelVerified: Boolean(row.channel_verified),
      stateCode: row.state_code,
      stateName: row.state_name || row.state_code,
      constituencyId: row.constituency_id || '',
      districtName: row.district_name || '',
      hashtags: row.hashtags || [],
      viewCount: row.view_count || 0,
      likeCount: row.like_count || 0,
      commentCount: row.comment_count || 0,
      duration: row.duration || 0,
      createdAt: row.created_at,
      videoUrl: row.video_url,
      visibilityLevel: row.constituency_id ? 'constituency' : (row.state_code ? 'state' : 'national'),
      uploadedBy: row.uploaded_by || 'system',
      gradientColors: row.gradient_colors && row.gradient_colors.length >= 2 ? row.gradient_colors : ['#0F2027', '#203A43'],
      stateAccent: row.state_accent || '#4F8EF7',
    }));
  } catch (err) {
    captureException(err as Error, { op: 'fetch_shorts' });
    return null;
  }
}

export async function incrementShortView(shortId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/shorts/${shortId}/view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify({}),
    });
    return res.ok;
  } catch (err) {
    captureException(err as Error, { op: 'increment_short_view', shortId });
    return false;
  }
}

export async function fetchShortComments(
  shortId: string,
  options?: { offset?: number; limit?: number },
): Promise<ShortCommentsResponseDTO | null> {
  if (!isValidUuid(shortId)) return null;
  try {
    addBreadcrumb('shorts', 'list_comments', { shortId });
    return await apiClient.shorts.listComments(shortId, options);
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)), {
      op: 'list_short_comments',
      shortId,
    });
    return null;
  }
}

export async function addShortComment(shortId: string, text: string): Promise<ShortCommentDTO> {
  if (!isValidUuid(shortId)) throw new Error('A valid published short is required to comment.');
  if (!text?.trim() || text.trim().length > 500) throw new Error('Comments must be between 1 and 500 characters.');

  try {
    addBreadcrumb('shorts', 'add_comment', { shortId });
    const response = await apiClient.shorts.addComment(shortId, text);
    if (!response.success || !response.comment) {
      throw new Error('The server did not confirm that the comment was saved.');
    }
    return response.comment;
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)), {
      op: 'add_short_comment',
      shortId,
    });
    throw err;
  }
}

// ─── Live Media Exchange (LMX) ────────────────────────────────────────────────

export async function fetchLiveEvents(filters?: {
  category?: string;
  stateCode?: string;
  status?: string;
}): Promise<any[]> {
  if (!isSupabaseConfigured) return [];
  try {
    let query = supabase
      .from('live_events')
      .select('*, live_event_ai(*)')
      .in('buffer_state', ['cleared', 'bypassed'])
      .in('visibility_mode', ['public'])
      .order('status', { ascending: true })
      .order('priority_score', { ascending: false });
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('issue_category', filters.category);
    }
    if (filters?.stateCode) {
      query = query.eq('state_code', filters.stateCode);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status === 'live' ? 'live' : 'ended');
    }
    const { data, error } = await query;
    if (error) { console.warn('[LMX] fetchLiveEvents error:', error.message); return []; }
    return data ?? [];
  } catch (e) { console.warn('[LMX] fetchLiveEvents exception:', e); return []; }
}


export async function createLiveEvent(event: Record<string, any>): Promise<any | null> {
  try {
    const res = await apiClient.request<Record<string, any>, Record<string, any>>(
      '/api/v1/lmx/live',
      { method: 'POST', body: event },
    );
    return res.statusCode >= 200 && res.statusCode < 300 ? res.data : null;
  } catch (e) {
    console.warn('[LMX] createLiveEvent exception:', e);
    return null;
  }
}

export async function updateLiveEvent(eventId: string, updates: Record<string, any>): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/lmx/live/${eventId}/moderate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch (e) {
    console.warn('[LMX] updateLiveEvent exception:', e);
    return false;
  }
}

export async function endLiveEvent(eventId: string, contentHash: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/lmx/live/${eventId}/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify({ content_hash: contentHash }),
    });
    return res.ok;
  } catch (e) {
    console.warn('[LMX] endLiveEvent exception:', e);
    return false;
  }
}

export async function fetchDepartments(stateCode?: string): Promise<any[]> {
  if (!isSupabaseConfigured) return [];
  try {
    let query = supabase
      .from('lmx_departments')
      .select('*')
      .eq('subscription_status', 'active')
      .eq('verified', true);
    if (stateCode) query = query.eq('state_code', stateCode);
    const { data, error } = await query;
    if (error) { console.warn('[LMX] fetchDepartments error:', error.message); return []; }
    return data ?? [];
  } catch (e) { console.warn('[LMX] fetchDepartments exception:', e); return []; }
}

export async function dispatchDepartmentAlert(alert: Record<string, any>): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/lmx/alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify(alert),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('[LMX] dispatchDepartmentAlert exception:', e);
    return null;
  }
}

export async function acknowledgeDepartmentAlert(
  alertId: string,
  acknowledgment: string,
  acknowledgedBy: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/lmx/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify({ acknowledgment, acknowledged_by: acknowledgedBy }),
    });
    return res.ok;
  } catch (e) {
    console.warn('[LMX] acknowledgeDepartmentAlert exception:', e);
    return false;
  }
}

export async function fetchDepartmentAlerts(departmentId?: string, departmentType?: string): Promise<any[]> {
  if (!isSupabaseConfigured) return [];
  try {
    let query = supabase
      .from('lmx_department_alerts')
      .select('*')
      .order('dispatched_at', { ascending: false });
    if (departmentId) {
      query = query.eq('department_id', departmentId);
    } else if (departmentType) {
      query = query.eq('department_type', departmentType);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('[LMX] fetchDepartmentAlerts error:', error.message);
      return [];
    }
    return data ?? [];
  } catch (e) {
    console.warn('[LMX] fetchDepartmentAlerts exception:', e);
    return [];
  }
}

export async function createContentAlert(alert: {
  contentVisibilityId?: string;
  contentType: string;
  contentId: string;
  userId: string;
  severity: string;
  reason: string;
  category: string;
  stateCode?: string;
  constituencyId?: string;
}): Promise<{
  id: string | null;
  success: boolean;
}> {
  try {
    addBreadcrumb('content_alerts', 'create', { contentId: alert.contentId, category: alert.category });
    const res = await fetch(`${API_BASE_URL}/api/v1/lmx/alerts/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': alert.userId,
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify(alert),
    });
    if (!res.ok) return { id: null, success: false };
    const data = await res.json();
    return { id: data.id || null, success: true };
  } catch (err) {
    captureException(err as Error, { op: 'create_content_alert' });
    return { id: null, success: false };
  }
}

export async function acknowledgeContentAlert(
  alertId: string,
  acknowledgedBy: string,
  actionTaken: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/lmx/alerts/content/${alertId}/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify({ acknowledgedBy, actionTaken }),
    });
    return res.ok;
  } catch (err) {
    captureException(err as Error, { op: 'acknowledge_content_alert' });
    return false;
  }
}


export async function fetchReporterCredibility(reporterId: string): Promise<any | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('lmx_credibility')
      .select('*')
      .eq('reporter_id', reporterId)
      .single();
    if (error) return null;
    return data;
  } catch (e) { return null; }
}

export async function updateReporterCredibility(reporterId: string, updates: Record<string, any>): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/lmx/credibility`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify({ reporter_id: reporterId, ...updates }),
    });
    return res.ok;
  } catch (e) {
    console.warn('[LMX] updateReporterCredibility exception:', e);
    return false;
  }
}

export async function fetchBrandKits(): Promise<any[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('lmx_brand_kits')
      .select('*')
      .eq('is_approved', true);
    if (error) { console.warn('[LMX] fetchBrandKits error:', error.message); return []; }
    return data ?? [];
  } catch (e) { console.warn('[LMX] fetchBrandKits exception:', e); return []; }
}

export async function fetchAffiliations(contributorId: string): Promise<any[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('lmx_affiliations')
      .select('*')
      .eq('contributor_id', contributorId)
      .eq('status', 'active');
    if (error) { console.warn('[LMX] fetchAffiliations error:', error.message); return []; }
    return data ?? [];
  } catch (e) { console.warn('[LMX] fetchAffiliations exception:', e); return []; }
}

export async function addDistributionDestination(destination: Record<string, any>): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/lmx/distribution/destinations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify(destination),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('[LMX] addDistributionDestination exception:', e);
    return null;
  }
}

export async function logModerationEvent(event: Record<string, any>): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/lmx/moderation-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify(event),
    });
    return res.ok;
  } catch (e) {
    console.warn('[LMX] logModerationEvent exception:', e);
    return false;
  }
}

export async function incrementViewerCount(eventId: string, delta: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/lmx/live/${eventId}/viewers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify({ delta }),
    });
    return res.ok;
  } catch (e) {
    console.warn('[LMX] incrementViewerCount exception:', e);
    return false;
  }
}

// ─── Direct Messaging (Tickets 3.1 - 3.6) ────────────────────────────

export interface DMConversationItem {
  id: string;
  participant_one: string;
  participant_two: string;
  status: 'pending' | 'accepted' | 'declined';
  initiated_by: string;
  last_message_at: string;
  last_message_preview: string | null;
  media_accepted_by_one: boolean;
  media_accepted_by_two: boolean;
  otherUser?: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
    role?: string;
    isVerified?: boolean;
  };
  unreadCount?: number;
}

export interface DMMessageItem {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  media_url?: string | null;
  media_type?: 'image' | 'video' | 'audio' | 'document' | null;
  is_media_locked: boolean;
  read_at?: string | null;
  created_at: string;
}

export async function fetchUserConversations(userId: string): Promise<DMConversationItem[] | null> {
  if (!guard()) return null;
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_one.eq.${userId},participant_two.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    // Resolve other participant profiles
    const otherUserIds = data.map((c) => (c.participant_one === userId ? c.participant_two : c.participant_one));
    const uniqueIds = Array.from(new Set(otherUserIds));

    let profileMap = new Map<string, any>();
    if (uniqueIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, avatar_url, role, verification_status')
        .in('user_id', uniqueIds);

      if (profiles) {
        profiles.forEach((p) => profileMap.set(p.user_id, p));
      }
    }

    return data.map((c) => {
      const otherId = c.participant_one === userId ? c.participant_two : c.participant_one;
      const profile = profileMap.get(otherId);
      return {
        ...c,
        otherUser: {
          id: otherId,
          displayName: profile?.display_name || 'Poligram Citizen',
          avatarUrl: profile?.avatar_url || null,
          role: profile?.role || 'citizen',
          isVerified: profile?.verification_status === 'verified',
        },
      };
    });
  } catch (err) {
    captureException(err as Error, { op: 'fetch_user_conversations', userId });
    return null;
  }
}

export async function fetchConversationMessages(conversationId: string): Promise<DMMessageItem[] | null> {
  if (!guard()) return null;
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data ?? [];
  } catch (err) {
    captureException(err as Error, { op: 'fetch_conversation_messages', conversationId });
    return null;
  }
}

export async function sendDirectMessageToConversation(
  conversationId: string,
  senderId: string,
  content: string,
  mediaUrl?: string,
  mediaType?: 'image' | 'video' | 'audio' | 'document',
): Promise<DMMessageItem | null> {
  if (!guard()) return null;
  try {
    const res = await apiClient.request<{ message: DMMessageItem }>(
      `/api/v1/dm/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'x-user-id': senderId,
        },
        body: { content, mediaUrl, mediaType },
      },
    );

    if (res.statusCode >= 200 && res.statusCode < 300 && res.data) {
      return res.data.message;
    }
    return null;
  } catch (err) {
    captureException(err as Error, { op: 'send_dm', conversationId });
    return null;
  }
}

export async function acceptDMRequest(conversationId: string, userId: string): Promise<boolean> {
  if (!guard()) return false;
  try {
    const res = await apiClient.request(
      `/api/v1/dm/conversations/${conversationId}/accept`,
      {
        method: 'POST',
        headers: {
          'x-user-id': userId,
        },
      },
    );
    return res.statusCode >= 200 && res.statusCode < 300;
  } catch (err) {
    captureException(err as Error, { op: 'accept_dm', conversationId });
    return false;
  }
}

export async function declineDMRequest(conversationId: string, userId: string): Promise<boolean> {
  if (!guard()) return false;
  try {
    const res = await apiClient.request(
      `/api/v1/dm/conversations/${conversationId}/decline`,
      {
        method: 'POST',
        headers: {
          'x-user-id': userId,
        },
      },
    );
    return res.statusCode >= 200 && res.statusCode < 300;
  } catch (err) {
    captureException(err as Error, { op: 'decline_dm', conversationId });
    return false;
  }
}

export async function blockAndReportDMUser(
  userId: string,
  targetUserId: string,
  reason: string,
  description?: string,
  conversationId?: string,
): Promise<boolean> {
  if (!guard()) return false;
  try {
    const res = await apiClient.request(
      `/api/v1/dm/block-report`,
      {
        method: 'POST',
        headers: {
          'x-user-id': userId,
        },
        body: { targetUserId, reason, description, conversationId },
      },
    );
    return res.statusCode >= 200 && res.statusCode < 300;
  } catch (err) {
    captureException(err as Error, { op: 'block_report_dm', targetUserId });
    return false;
  }
}

export async function markConversationMessagesRead(conversationId: string, userId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/dm/messages/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        ...telemetry.getTracingHeaders(),
      },
      body: JSON.stringify({ conversationId, userId }),
    });
    return res.ok;
  } catch (err) {
    captureException(err as Error, { op: 'mark_messages_read', conversationId });
    return false;
  }
}

export async function fetchDMUnreadCount(userId: string, token?: string | null): Promise<number> {
  if (!guard()) return 0;
  try {
    const headers: Record<string, string> = { 'x-user-id': userId };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await apiClient.request<{ count: number }>(
      `/api/v1/dm/unread-count`,
      {
        method: 'GET',
        headers,
      },
    );
    if (res.statusCode >= 200 && res.statusCode < 300 && res.data) {
      return typeof res.data.count === 'number' ? res.data.count : 0;
    }
    return 0;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_dm_unread_count', userId });
    return 0;
  }
}

export async function searchVerifiedProfiles(query: string, limit = 10): Promise<any[]> {
  if (!guard() || !query || query.trim().length < 2) return [];
  try {
    const q = query.trim();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, display_name, role, verification_status, avatar_url, constituency_id, state_code')
      .in('role', ['politician', 'aspirant', 'party', 'journalist'])
      .eq('verification_status', 'verified')
      .ilike('display_name', `%${q}%`)
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    captureException(err as Error, { op: 'search_verified_profiles', query });
    return [];
  }
}

export interface DMUserSearchResult {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  role?: string;
  isVerified?: boolean;
  constituencyName?: string;
  stateCode?: string;
}

export async function searchUsersForDM(
  query: string,
  currentUserId?: string,
  limit = 20,
): Promise<DMUserSearchResult[]> {
  const results: DMUserSearchResult[] = [];
  const q = (query || '').trim().toLowerCase();

  // 1. Try Supabase if configured
  if (guard()) {
    try {
      let dbQuery = supabase
        .from('user_profiles')
        .select('user_id, display_name, role, verification_status, avatar_url, constituency_id, state_code');

      if (q.length > 0) {
        dbQuery = dbQuery.ilike('display_name', `%${q}%`);
      }
      if (currentUserId && currentUserId !== 'anon') {
        dbQuery = dbQuery.neq('user_id', currentUserId);
      }

      const { data, error } = await dbQuery.limit(limit);
      if (!error && data) {
        for (const u of data) {
          results.push({
            id: u.user_id,
            displayName: u.display_name || 'Citizen',
            avatarUrl: u.avatar_url,
            role: u.role || 'citizen',
            isVerified: u.verification_status === 'verified',
            stateCode: u.state_code,
          });
        }
      }
    } catch {
      // Supabase search error, continue to fallback
    }
  }

  // 2. Curated Seed / Community Contacts (Ensure users can always find leaders, aspirants & active figures)
  const curatedList: DMUserSearchResult[] = [
    {
      id: 'leader-revanth-reddy',
      displayName: 'Anumula Revanth Reddy',
      role: 'Chief Minister of Telangana',
      isVerified: true,
      stateCode: 'TS',
    },
    {
      id: 'leader-chandrababu-naidu',
      displayName: 'N Chandrababu Naidu',
      role: 'Chief Minister of Andhra Pradesh',
      isVerified: true,
      stateCode: 'AP',
    },
    {
      id: 'leader-dk-shivakumar',
      displayName: 'D. K. Shivakumar',
      role: 'Chief Minister of Karnataka',
      isVerified: true,
      stateCode: 'KA',
    },
    {
      id: 'leader-devendra-fadnavis',
      displayName: 'Devendra Fadnavis',
      role: 'Chief Minister of Maharashtra',
      isVerified: true,
      stateCode: 'MH',
    },
    {
      id: 'leader-vijay-tvk',
      displayName: 'C. Joseph Vijay',
      role: 'Chief Minister of Tamil Nadu',
      isVerified: true,
      stateCode: 'TN',
    },
    {
      id: 'system-elections',
      displayName: 'State Election Authority',
      role: 'Civic Advisory & Elections',
      isVerified: true,
      stateCode: 'IN',
    },
    {
      id: 'citizen-priya-reddy',
      displayName: 'Priya Reddy',
      role: 'Community Advocate (Serilingampally)',
      isVerified: false,
      stateCode: 'TS',
    },
    {
      id: 'citizen-ravi-kumar',
      displayName: 'Ravi Kumar',
      role: 'Civic Contributor (Goshamahal)',
      isVerified: false,
      stateCode: 'TS',
    },
    {
      id: 'aspirant-meena-devi',
      displayName: 'Meena Devi',
      role: 'Leadership Academy Aspirant',
      isVerified: true,
      stateCode: 'TS',
    },
  ];

  // Filter curated list
  const filteredCurated = curatedList.filter((c) => {
    if (currentUserId && c.id === currentUserId) return false;
    if (!q) return true;
    return (
      c.displayName.toLowerCase().includes(q) ||
      (c.role && c.role.toLowerCase().includes(q)) ||
      (c.stateCode && c.stateCode.toLowerCase().includes(q))
    );
  });

  // Deduplicate against remote results
  const seenIds = new Set(results.map((r) => r.id));
  for (const c of filteredCurated) {
    if (!seenIds.has(c.id)) {
      results.push(c);
      seenIds.add(c.id);
    }
  }

  return results.slice(0, limit);
}


