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

// ─── Helpers ─────────────────────────────────────────────────────────

function guard(): boolean {
  return isSupabaseConfigured;
}

function uid(): string | null {
  // The authenticated user id is resolved asynchronously elsewhere; callers
  // always pass an explicit userId, so this synchronous helper returns null.
  return null;
}

// ─── Civic Issues ────────────────────────────────────────────────────

export async function upvoteIssue(issueId: string, userId: string): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('civic', 'upvote_issue', { issueId, userId });
    const { error } = await supabase
      .from('issue_upvotes')
      .upsert({ issue_id: issueId, user_id: userId }, { onConflict: 'issue_id,user_id' });
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'upvote_issue', issueId });
    return false;
  }
}

export async function removeUpvote(issueId: string, userId: string): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('civic', 'remove_upvote', { issueId });
    const { error } = await supabase
      .from('issue_upvotes')
      .delete()
      .match({ issue_id: issueId, user_id: userId });
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'remove_upvote', issueId });
    return false;
  }
}

export async function followIssue(issueId: string, userId: string, follow: boolean): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('civic', follow ? 'follow_issue' : 'unfollow_issue', { issueId });
    if (follow) {
      const { error } = await supabase
        .from('issue_follows')
        .upsert({ issue_id: issueId, user_id: userId }, { onConflict: 'issue_id,user_id' });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('issue_follows')
        .delete()
        .match({ issue_id: issueId, user_id: userId });
      if (error) throw error;
    }
    return true;
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
  if (!guard()) return { id: `local-${Date.now()}`, success: true };
  try {
    addBreadcrumb('civic', 'report_issue', { title: issue.title });
    const { data, error } = await supabase
      .from('civic_issues')
      .insert({
        title: issue.title,
        description: issue.description,
        category: issue.category,
        severity: issue.severity,
        constituency_id: issue.constituencyId,
        state_code: issue.stateCode,
        reporter_id: issue.reporterId,
        reporter_name: issue.reporterName,
        media_urls: issue.mediaUrls ?? [],
        status: 'open',
      })
      .select('id')
      .single();
    if (error) throw error;
    return { id: data?.id ?? null, success: true };
  } catch (err) {
    captureException(err as Error, { op: 'report_issue', title: issue.title });
    return { id: null, success: false };
  }
}

export async function addIssueComment(
  issueId: string,
  userId: string,
  userName: string,
  body: string,
  imageUrl?: string,
): Promise<{ id: string | null; success: boolean }> {
  if (!guard()) return { id: `local-cmt-${Date.now()}`, success: true };
  try {
    addBreadcrumb('civic', 'add_issue_comment', { issueId });
    const { data, error } = await supabase
      .from('issue_comments')
      .insert({
        issue_id: issueId,
        user_id: userId,
        user_name: userName,
        body,
        image_url: imageUrl ?? null,
      })
      .select('id')
      .single();
    if (error) throw error;
    return { id: data?.id ?? null, success: true };
  } catch (err) {
    captureException(err as Error, { op: 'add_issue_comment', issueId });
    return { id: null, success: false };
  }
}

export async function tagMLAOnIssue(issueId: string): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('civic', 'tag_mla', { issueId });
    const { error } = await supabase
      .from('civic_issues')
      .update({ mla_tagged: true })
      .eq('id', issueId);
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'tag_mla', issueId });
    return false;
  }
}

export async function disputeIssueResolution(
  issueId: string,
  userId: string,
  reason: string,
): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('civic', 'dispute_resolution', { issueId });
    const { error } = await supabase
      .from('issue_disputes')
      .upsert({
        issue_id: issueId,
        user_id: userId,
        reason,
      }, { onConflict: 'issue_id,user_id' });
    if (error) throw error;
    return true;
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
  if (!guard()) return true;
  try {
    addBreadcrumb('civic', 'update_issue_status', { issueId, newStatus });
    const update: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'resolved') {
      update.resolved_at = new Date().toISOString();
      update.resolution_note = note;
    }
    const { error } = await supabase
      .from('civic_issues')
      .update(update)
      .eq('id', issueId);
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'update_issue_status', issueId });
    return false;
  }
}

// ─── Feed / Posts ────────────────────────────────────────────────────

export async function reactToPost(postId: string, userId: string, reaction: string): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('feed', 'react_post', { postId, reaction });
    const { error } = await supabase
      .from('reactions')
      .upsert(
        { post_id: postId, user_id: userId, type: reaction },
        { onConflict: 'user_id,post_id' },
      );
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'react_post', postId });
    return false;
  }
}

export async function removeReaction(postId: string, userId: string): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('feed', 'remove_reaction', { postId });
    const { error } = await supabase
      .from('reactions')
      .delete()
      .match({ post_id: postId, user_id: userId });
    if (error) throw error;
    return true;
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
}): Promise<{ id: string | null; success: boolean }> {
  if (!guard()) return { id: `local-${Date.now()}`, success: true };
  try {
    addBreadcrumb('feed', 'compose_post', { type: post.type });
    const { data, error } = await supabase
      .from('posts')
      .insert({
        content: post.content,
        type: post.type,
        state_code: post.stateCode,
        author_id: post.authorId,
        constituency_id: post.constituencyId ?? null,
        parent_id: post.parentId ?? null,
        language: post.language ?? 'en',
      })
      .select('id')
      .single();
    if (error) throw error;

    // Insert hashtags if present
    if (post.hashtags && post.hashtags.length > 0 && data?.id) {
      await syncHashtags(data.id, post.hashtags);
    }

    return { id: data?.id ?? null, success: true };
  } catch (err) {
    captureException(err as Error, { op: 'compose_post' });
    return { id: null, success: false };
  }
}

export async function editPost(postId: string, content: string, userId: string): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('feed', 'edit_post', { postId });
    const { error } = await supabase
      .from('posts')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', postId)
      .eq('author_id', userId);
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'edit_post', postId });
    return false;
  }
}

export async function deletePost(postId: string, userId: string): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('feed', 'delete_post', { postId });
    const { error } = await supabase
      .from('posts')
      .update({ is_deleted: true, content: '[Deleted]' })
      .eq('id', postId)
      .eq('author_id', userId);
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'delete_post', postId });
    return false;
  }
}

export async function votePoll(
  pollId: string,
  optionId: string,
  userId: string,
): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('feed', 'vote_poll', { pollId, optionId });
    const { error } = await supabase
      .from('poll_votes')
      .insert({ poll_id: pollId, option_id: optionId, user_id: userId });
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'vote_poll', pollId });
    return false;
  }
}

export async function addPostComment(
  postId: string,
  userId: string,
  content: string,
  language?: string,
): Promise<{ id: string | null; success: boolean }> {
  if (!guard()) return { id: `local-cmt-${Date.now()}`, success: true };
  try {
    addBreadcrumb('feed', 'add_comment', { postId });
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, author_id: userId, content, language: language ?? 'en' })
      .select('id')
      .single();
    if (error) throw error;
    return { id: data?.id ?? null, success: true };
  } catch (err) {
    captureException(err as Error, { op: 'add_comment', postId });
    return { id: null, success: false };
  }
}

export async function reactToComment(
  commentId: string,
  userId: string,
  reaction: string,
): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('feed', 'react_comment', { commentId, reaction });
    const { error } = await supabase
      .from('reactions')
      .upsert(
        { comment_id: commentId, user_id: userId, type: reaction },
        { onConflict: 'user_id,comment_id' },
      );
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'react_comment', commentId });
    return false;
  }
}

export async function removeCommentReaction(
  commentId: string,
  userId: string,
): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('feed', 'remove_comment_reaction', { commentId });
    const { error } = await supabase
      .from('reactions')
      .delete()
      .match({ comment_id: commentId, user_id: userId });
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'remove_comment_reaction', commentId });
    return false;
  }
}

export async function deletePostComment(
  commentId: string,
  userId: string,
): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('feed', 'delete_comment', { commentId });
    const { error } = await supabase
      .from('comments')
      .update({ is_deleted: true, content: '[Deleted]' })
      .eq('id', commentId)
      .eq('author_id', userId);
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'delete_comment', commentId });
    return false;
  }
}

async function syncHashtags(postId: string, tags: string[]): Promise<void> {
  for (const tag of tags) {
    const normalized = tag.toLowerCase().replace(/^#/, '');
    // Upsert hashtag
    const { data } = await supabase
      .from('hashtags')
      .upsert({ tag: normalized }, { onConflict: 'tag' })
      .select('id')
      .single();
    if (data?.id) {
      await supabase
        .from('post_hashtags')
        .upsert({ post_id: postId, hashtag_id: data.id }, { onConflict: 'post_id,hashtag_id' });
    }
  }
}

// ─── Promises ────────────────────────────────────────────────────────

export async function followPromise(promiseId: string, userId: string, follow: boolean): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('promises', follow ? 'follow_promise' : 'unfollow_promise', { promiseId });
    if (follow) {
      const { error } = await supabase
        .from('promise_follows')
        .upsert({ promise_id: promiseId, user_id: userId }, { onConflict: 'promise_id,user_id' });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('promise_follows')
        .delete()
        .match({ promise_id: promiseId, user_id: userId });
      if (error) throw error;
    }
    return true;
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
  if (!guard()) return true;
  try {
    addBreadcrumb('promises', 'submit_evidence', { promiseId: evidence.promiseId });
    const { error } = await supabase
      .from('promise_evidence')
      .insert({
        promise_id: evidence.promiseId,
        user_id: evidence.userId,
        evidence_type: evidence.type,
        description: evidence.description,
        url: evidence.url,
      });
    if (error) throw error;
    return true;
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
  if (!guard()) return true;
  try {
    addBreadcrumb('favorites', isFavorite ? 'add' : 'remove', { constituencyId });
    if (isFavorite) {
      const { error } = await supabase
        .from('favorites')
        .upsert(
          { constituency_id: constituencyId, user_id: userId },
          { onConflict: 'constituency_id,user_id' },
        );
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .match({ constituency_id: constituencyId, user_id: userId });
      if (error) throw error;
    }
    return true;
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
  if (!guard()) return { id: `local-short-${Date.now()}`, success: true };
  try {
    addBreadcrumb('shorts', 'upload', { title: short.title });
    const { data, error } = await supabase
      .from('political_shorts')
      .insert({
        title: short.title,
        video_url: short.videoUrl,
        channel_name: short.channelName,
        uploaded_by: short.uploadedBy,
        state_code: short.stateCode,
        state_name: short.stateName ?? null,
        constituency_id: short.constituencyId ?? null,
        district_name: short.districtName ?? null,
        duration: short.duration,
        hashtags: short.hashtags ?? [],
        gradient_colors: short.gradientColors ?? [],
        state_accent: short.stateAccent ?? null,
        status: 'pending',
      })
      .select('id')
      .single();
    if (error) throw error;
    return { id: data?.id ?? null, success: true };
  } catch (err) {
    captureException(err as Error, { op: 'upload_short' });
    return { id: null, success: false };
  }
}

export async function approveShort(shortId: string, userId: string, constituencyId?: string): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('shorts', 'approve', { shortId });
    const { error } = await supabase
      .from('short_approvals')
      .insert({ short_id: shortId, user_id: userId, constituency_id: constituencyId ?? null });
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'approve_short', shortId });
    return false;
  }
}

export async function flagShort(shortId: string, userId: string, reason?: string): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('shorts', 'flag', { shortId });
    const { error } = await supabase
      .from('short_flags')
      .insert({ short_id: shortId, user_id: userId, reason: reason ?? null });
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'flag_short', shortId });
    return false;
  }
}

export async function addShortComment(
  shortId: string,
  userId: string,
  authorName: string,
  text: string,
): Promise<{ id: string | null; success: boolean }> {
  if (!guard()) return { id: `local-sc-${Date.now()}`, success: true };
  try {
    addBreadcrumb('shorts', 'comment', { shortId });
    const { data, error } = await supabase
      .from('short_comments')
      .insert({ short_id: shortId, user_id: userId, author_name: authorName, text })
      .select('id')
      .single();
    if (error) throw error;
    return { id: data?.id ?? null, success: true };
  } catch (err) {
    captureException(err as Error, { op: 'add_short_comment', shortId });
    return { id: null, success: false };
  }
}

export async function incrementShortView(shortId: string): Promise<boolean> {
  if (!guard()) return true;
  try {
    const { error } = await supabase.rpc('increment_short_views', { p_short_id: shortId });
    // Fallback to a read-modify-write update if the RPC doesn't exist yet.
    if (error) {
      const { data } = await supabase
        .from('political_shorts')
        .select('view_count')
        .eq('id', shortId)
        .single();
      const current = (data?.view_count as number | null) ?? 0;
      await supabase
        .from('political_shorts')
        .update({ view_count: current + 1 })
        .eq('id', shortId);
    }
    return true;
  } catch {
    return false;
  }
}

// ─── User Profile ────────────────────────────────────────────────────

export async function updateUserProfile(userId: string, updates: {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  role?: string;
  stateCode?: string;
  constituencyId?: string;
}): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('profile', 'update', { userId });
    const row: Record<string, unknown> = {};
    if (updates.displayName !== undefined) row.display_name = updates.displayName;
    if (updates.bio !== undefined) row.bio = updates.bio;
    if (updates.avatarUrl !== undefined) row.avatar_url = updates.avatarUrl;
    if (updates.role !== undefined) row.role = updates.role;
    if (updates.stateCode !== undefined) row.state_code = updates.stateCode;
    if (updates.constituencyId !== undefined) row.constituency_id = updates.constituencyId;

    const { error } = await supabase
      .from('user_profiles')
      .update(row)
      .eq('user_id', userId);
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'update_profile', userId });
    return false;
  }
}

// ─── Aspirant / Leadership Academy ───────────────────────────────────

export async function registerAspirant(userId: string, profile: {
  displayName: string;
  bio?: string;
  stateCode: string;
  targetConstituencyAcNo?: number;
  targetConstituencyName?: string;
  partyAffiliation?: string;
  isIndependent?: boolean;
}): Promise<{ id: string | null; success: boolean }> {
  if (!guard()) return { id: `local-asp-${Date.now()}`, success: true };
  try {
    addBreadcrumb('aspirant', 'register', { userId });
    const { data, error } = await supabase
      .from('aspirant_profiles')
      .upsert({
        user_id: userId,
        display_name: profile.displayName,
        bio: profile.bio ?? null,
        state_code: profile.stateCode,
        target_constituency_ac_no: profile.targetConstituencyAcNo ?? null,
        target_constituency_name: profile.targetConstituencyName ?? null,
        party_affiliation: profile.partyAffiliation ?? null,
        is_independent: profile.isIndependent ?? true,
      }, { onConflict: 'user_id' })
      .select('id')
      .single();
    if (error) throw error;
    return { id: data?.id ?? null, success: true };
  } catch (err) {
    captureException(err as Error, { op: 'register_aspirant' });
    return { id: null, success: false };
  }
}

export async function startModule(userId: string, moduleId: string): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('academy', 'start_module', { moduleId });
    const { error } = await supabase
      .from('module_progress')
      .upsert({
        user_id: userId,
        module_id: moduleId,
        started_at: new Date().toISOString(),
      }, { onConflict: 'user_id,module_id' });
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'start_module', moduleId });
    return false;
  }
}

export async function completeModule(userId: string, moduleId: string, quizScore?: number): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('academy', 'complete_module', { moduleId });
    const { error } = await supabase
      .from('module_progress')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        quiz_score: quizScore ?? null,
      })
      .eq('user_id', userId)
      .eq('module_id', moduleId);
    if (error) throw error;

    // Update aspirant profile modules_completed count (best-effort).
    try {
      await supabase.rpc('increment_aspirant_modules', { p_user_id: userId });
    } catch {
      /* non-fatal: count will reconcile on next sync */
    }

    return true;
  } catch (err) {
    captureException(err as Error, { op: 'complete_module', moduleId });
    return false;
  }
}

export async function joinChallenge(userId: string, challengeId: string): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('academy', 'join_challenge', { challengeId });
    const { error } = await supabase
      .from('challenge_participation')
      .insert({ user_id: userId, challenge_id: challengeId });
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'join_challenge', challengeId });
    return false;
  }
}

export async function endorseAspirant(endorserId: string, aspirantId: string, message?: string): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('aspirant', 'endorse', { aspirantId });
    const { error } = await supabase
      .from('community_endorsements')
      .insert({ endorser_id: endorserId, aspirant_id: aspirantId, message: message ?? null });
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'endorse_aspirant', aspirantId });
    return false;
  }
}

// ─── KYC / Contributor Verification ──────────────────────────────────

export async function submitKYC(userId: string, kyc: {
  fullLegalName: string;
  phoneNumber: string;
  selfieUrl?: string;
  selfieHash?: string;
  deviceBrand?: string;
  deviceModel?: string;
  deviceOs?: string;
  deviceOsVersion?: string;
  deviceUniqueId?: string;
  latitude?: number;
  longitude?: number;
  appVersion?: string;
}): Promise<{ id: string | null; success: boolean }> {
  if (!guard()) return { id: `local-kyc-${Date.now()}`, success: true };
  try {
    addBreadcrumb('kyc', 'submit', { userId });
    const { data, error } = await supabase
      .from('creator_kyc_records')
      .upsert({
        user_id: userId,
        full_legal_name: kyc.fullLegalName,
        phone_number: kyc.phoneNumber,
        selfie_url: kyc.selfieUrl ?? null,
        selfie_hash: kyc.selfieHash ?? null,
        device_brand: kyc.deviceBrand ?? null,
        device_model: kyc.deviceModel ?? null,
        device_os: kyc.deviceOs ?? null,
        device_os_version: kyc.deviceOsVersion ?? null,
        device_unique_id: kyc.deviceUniqueId ?? null,
        latitude: kyc.latitude ?? null,
        longitude: kyc.longitude ?? null,
        app_version: kyc.appVersion ?? null,
        status: 'pending_review',
      }, { onConflict: 'user_id' })
      .select('id')
      .single();
    if (error) throw error;
    return { id: data?.id ?? null, success: true };
  } catch (err) {
    captureException(err as Error, { op: 'submit_kyc' });
    return { id: null, success: false };
  }
}

// ─── Notifications ───────────────────────────────────────────────────

export async function markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
  if (!guard()) return true;
  try {
    const { error } = await supabase
      .from('notification_log')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId);
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'mark_notification_read' });
    return false;
  }
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  if (!guard()) return true;
  try {
    const { error } = await supabase
      .from('notification_log')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) throw error;
    return true;
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
  if (!guard()) return true;
  try {
    addBreadcrumb('notifications', 'register_push_token', { platform });
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        { user_id: userId, token, platform, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,token' },
      );
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'register_push_token' });
    return false;
  }
}

// ─── Data Fetching (read operations) ─────────────────────────────────

export async function fetchFeedRPC(
  stateCode: string,
  constituencyId?: string,
  type?: string,
  cursor?: string,
  limit = 30,
): Promise<any[] | null> {
  if (!guard()) return null;
  try {
    const { data, error } = await supabase.rpc('get_feed', {
      p_state_code: stateCode,
      p_constituency_id: constituencyId ?? null,
      p_type: type ?? null,
      p_cursor: cursor ?? new Date().toISOString(),
      p_limit: limit,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_feed_rpc', stateCode });
    // Fallback to simple query
    return fetchFeedForState(stateCode, limit);
  }
}

export async function fetchIssuesRPC(
  stateCode: string,
  constituencyId?: string,
  status?: string,
  category?: string,
  cursor?: string,
  limit = 30,
): Promise<any[] | null> {
  if (!guard()) return null;
  try {
    const { data, error } = await supabase.rpc('get_issues', {
      p_state_code: stateCode,
      p_constituency_id: constituencyId ?? null,
      p_status: status ?? null,
      p_category: category ?? null,
      p_cursor: cursor ?? new Date().toISOString(),
      p_limit: limit,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_issues_rpc', stateCode });
    return fetchIssuesForConstituency(constituencyId ?? '', stateCode);
  }
}

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

export async function fetchTrendingHashtags(stateCode?: string, limit = 10): Promise<any[] | null> {
  if (!guard()) return null;
  try {
    const { data, error } = await supabase.rpc('get_trending_hashtags', {
      p_state_code: stateCode ?? null,
      p_limit: limit,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_trending_hashtags' });
    return null;
  }
}

export async function fetchUserDashboard(userId: string): Promise<any | null> {
  if (!guard()) return null;
  try {
    const { data, error } = await supabase.rpc('get_user_dashboard', { p_user_id: userId });
    if (error) throw error;
    return data?.[0] ?? null;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_user_dashboard' });
    return null;
  }
}

export async function fetchConstituencyStats(constituencyId: string): Promise<any | null> {
  if (!guard()) return null;
  try {
    const { data, error } = await supabase.rpc('get_constituency_stats', {
      p_constituency_id: constituencyId,
    });
    if (error) throw error;
    return data?.[0] ?? null;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_constituency_stats' });
    return null;
  }
}

export async function fetchHeadlines(stateCode: string, limit = 20): Promise<any[] | null> {
  if (!guard()) return null;
  try {
    const { data, error } = await supabase
      .from('headlines')
      .select('*')
      .eq('state_code', stateCode)
      .order('published_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_headlines', stateCode });
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

export async function fetchShorts(stateCode: string, limit = 20): Promise<any[] | null> {
  if (!guard()) return null;
  try {
    const { data, error } = await supabase
      .from('political_shorts')
      .select('*')
      .eq('state_code', stateCode)
      .in('status', ['approved', 'pending'])
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_shorts', stateCode });
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
  if (!guard()) return null;
  try {
    const { data, error } = await supabase
      .from('leadership_modules')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_modules' });
    return null;
  }
}

export async function fetchChallenges(stateCode?: string): Promise<any[] | null> {
  if (!guard()) return null;
  try {
    let query = supabase
      .from('community_challenges')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (stateCode) {
      query = query.or(`state_code.eq.${stateCode},state_code.is.null`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_challenges' });
    return null;
  }
}

export async function fetchPublicAspirants(stateCode?: string): Promise<any[] | null> {
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
    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (err) {
    captureException(err as Error, { op: 'fetch_aspirants' });
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
  if (!guard()) return null;
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: session.userId ?? null,
        anonymous_id: session.anonymousId ?? null,
        state_code: session.stateCode ?? null,
        platform: session.platform ?? null,
        app_version: session.appVersion ?? null,
        device_model: session.deviceModel ?? null,
        os_version: session.osVersion ?? null,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data?.id ?? null;
  } catch {
    return null;
  }
}

export async function endSession(sessionId: string, screensViewed: string[], actionsCount: number): Promise<void> {
  if (!guard()) return;
  try {
    await supabase
      .from('user_sessions')
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: 0, // computed from started_at - ended_at server-side
        screens_viewed: screensViewed,
        actions_count: actionsCount,
      })
      .eq('id', sessionId);
  } catch {
    // Silent fail — non-critical
  }
}
