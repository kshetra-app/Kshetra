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
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/moderation/check-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.data?.flagged) {
        const reason = data.data.reasons?.join(', ') || 'Violates community guidelines';
        return { flagged: true, reason };
      }
    }
  } catch (err) {
    console.warn('[Moderation] Moderation check error or network unreachable, proceeding:', err);
  }
  return { flagged: false };
}

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
    const { data: issueData, error } = await supabase
      .from('civic_issues')
      .update(update)
      .eq('id', issueId)
      .select('reporter_id, title')
      .maybeSingle();
    if (error) throw error;

    // Notify issue reporter of status update
    if (issueData?.reporter_id) {
      supabase.from('notification_log').insert({
        user_id: issueData.reporter_id,
        trigger_type: 'issue_status_change',
        title: 'Issue Status Updated',
        body: `Your issue "${issueData.title || 'Civic Issue'}" was marked as ${newStatus}.`,
        source_issue_id: issueId,
        read: false,
      }).then(({ error: notifErr }) => {
        if (notifErr) console.warn('[Notification] Failed to log issue status notification:', notifErr.message);
      });
    }

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

    // Log notification for post author (if not reacting to own post)
    supabase
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .maybeSingle()
      .then(({ data: postData }) => {
        if (postData?.author_id && postData.author_id !== userId) {
          supabase.from('notification_log').insert({
            user_id: postData.author_id,
            trigger_type: 'reaction',
            title: 'New Reaction',
            body: `Someone reacted with ${reaction} to your post.`,
            source_post_id: postId,
            read: false,
          }).then(({ error: notifErr }) => {
            if (notifErr) console.warn('[Notification] Failed to log reaction notification:', notifErr.message);
          });
        }
      });

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
  // Moderate content before insertion
  const modCheck = await checkContentModeration(post.content);
  if (modCheck.flagged) {
    throw new Error(`This content could not be posted — it violates community guidelines (${modCheck.reason || 'moderation policy'}).`);
  }

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
  // Moderate content before insertion
  const modCheck = await checkContentModeration(content);
  if (modCheck.flagged) {
    throw new Error(`This content could not be posted — it violates community guidelines (${modCheck.reason || 'moderation policy'}).`);
  }

  if (!guard()) return { id: `local-cmt-${Date.now()}`, success: true };
  try {
    addBreadcrumb('feed', 'add_comment', { postId });
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, author_id: userId, content, language: language ?? 'en' })
      .select('id')
      .single();
    if (error) throw error;

    // Log notification for post author (if not commenting on own post)
    supabase
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .maybeSingle()
      .then(({ data: postData }) => {
        if (postData?.author_id && postData.author_id !== userId) {
          supabase.from('notification_log').insert({
            user_id: postData.author_id,
            trigger_type: 'comment_reply',
            title: 'New Comment',
            body: content.slice(0, 100),
            source_post_id: postId,
            source_comment_id: data?.id ?? null,
            read: false,
          }).then(({ error: notifErr }) => {
            if (notifErr) console.warn('[Notification] Failed to log comment notification:', notifErr.message);
          });
        }
      });

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

export async function updateMyProfile(userId: string, updates: { displayName?: string; bio?: string }): Promise<void> {
  if (!guard()) return;
  const { error } = await supabase
    .from('user_profiles')
    .update({
      display_name: updates.displayName,
      bio: updates.bio,
    })
    .eq('user_id', userId);

  if (error) throw error;
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

    // Look up aspirant's user_id from aspirant_profiles to write notification
    supabase
      .from('aspirant_profiles')
      .select('user_id, display_name')
      .eq('id', aspirantId)
      .maybeSingle()
      .then(({ data: aspData }) => {
        if (aspData?.user_id && aspData.user_id !== endorserId) {
          supabase.from('notification_log').insert({
            user_id: aspData.user_id,
            trigger_type: 'system',
            title: 'New Endorsement Received',
            body: message ? `An endorsement was added: "${message.slice(0, 80)}"` : 'A citizen endorsed your leadership vision!',
            data: { aspirantId, endorserId },
            read: false,
          }).then(({ error: notifErr }) => {
            if (notifErr) console.warn('[Notification] Failed to log endorsement notification:', notifErr.message);
          });
        }
      });

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
  if (!guard()) return { id: `local-kyc-${Date.now()}`, success: true };
  try {
    addBreadcrumb('kyc', 'submit', { userId });
    const { data, error } = await supabase
      .from('creator_kyc_records')
      .upsert({
        user_id: userId,
        full_legal_name: kyc.fullLegalName,
        phone_number: kyc.phoneNumber,
        phone_verified: kyc.phoneVerified ?? false,
        selfie_url: kyc.selfieUrl ?? null,
        selfie_hash: kyc.selfieHash ?? null,
        device_brand: kyc.deviceBrand ?? null,
        device_model: kyc.deviceModel ?? null,
        device_os: kyc.deviceOs ?? null,
        device_os_version: kyc.deviceOsVersion ?? null,
        device_unique_id: kyc.deviceUniqueId ?? null,
        device_name: kyc.deviceName ?? null,
        ip_address: kyc.ipAddress ?? null,
        network_type: kyc.networkType ?? null,
        carrier_name: kyc.carrierName ?? null,
        latitude: kyc.latitude ?? null,
        longitude: kyc.longitude ?? null,
        location_accuracy: kyc.locationAccuracy ?? null,
        location_address: kyc.locationAddress ?? null,
        app_version: kyc.appVersion ?? null,
        app_build: kyc.appBuild ?? null,
        status: kyc.status ?? 'verified',
        verified_at: (kyc.status ?? 'verified') === 'verified' ? new Date().toISOString() : null,
        terms_accepted_at: kyc.termsAcceptedAt ?? new Date().toISOString(),
        terms_version: kyc.termsVersion ?? '1.0',
        updated_at: new Date().toISOString(),
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
  if (!guard()) return { id: `local-fp-${Date.now()}`, success: true };
  try {
    addBreadcrumb('cca', 'insert_action_fingerprint', { actionType: fp.actionType, userId: fp.userId });
    const { data, error } = await supabase
      .from('action_fingerprints')
      .insert({
        user_id: fp.userId,
        kyc_id: fp.kycId ?? null,
        action_type: fp.actionType,
        content_type: fp.contentType ?? null,
        content_id: fp.contentId ?? null,
        content_hash: fp.contentHash ?? null,
        device_brand: fp.deviceBrand ?? null,
        device_model: fp.deviceModel ?? null,
        device_os: fp.deviceOs ?? null,
        device_os_version: fp.deviceOsVersion ?? null,
        device_unique_id: fp.deviceUniqueId ?? null,
        device_name: fp.deviceName ?? null,
        ip_address: fp.ipAddress ?? null,
        local_ip: fp.localIp ?? null,
        network_type: fp.networkType ?? null,
        carrier_name: fp.carrierName ?? null,
        wifi_ssid: fp.wifiSsid ?? null,
        latitude: fp.latitude ?? null,
        longitude: fp.longitude ?? null,
        location_accuracy: fp.locationAccuracy ?? null,
        app_version: fp.appVersion ?? null,
        app_build: fp.appBuild ?? null,
        session_id: fp.sessionId ?? null,
        screen_name: fp.screenName ?? null,
        action_at: fp.actionAt ?? new Date().toISOString(),
      })
      .select('id')
      .single();
    if (error) throw error;
    return { id: data?.id ?? null, success: true };
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
  if (!guard()) return true;
  try {
    addBreadcrumb('cca', 'upsert_contributor_device', { userId: device.userId, deviceUniqueId: device.deviceUniqueId });
    const { error } = await supabase
      .from('contributor_devices')
      .upsert({
        user_id: device.userId,
        device_brand: device.deviceBrand ?? null,
        device_model: device.deviceModel ?? null,
        device_os: device.deviceOs ?? null,
        device_os_version: device.deviceOsVersion ?? null,
        device_unique_id: device.deviceUniqueId,
        device_name: device.deviceName ?? null,
        device_memory_mb: device.deviceMemoryMb ?? null,
        last_seen_at: new Date().toISOString(),
        is_trusted: device.isTrusted ?? true,
      }, { onConflict: 'user_id,device_unique_id' });
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'upsert_contributor_device' });
    return false;
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
  if (!guard()) return true;
  try {
    addBreadcrumb('social', 'follow_user', { followerId, followedId });
    const { error } = await supabase
      .from('user_follows')
      .upsert({ follower_id: followerId, followed_id: followedId }, { onConflict: 'follower_id,followed_id' });
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'follow_user', followedId });
    return false;
  }
}

export async function unfollowUser(followerId: string, followedId: string): Promise<boolean> {
  if (!guard()) return true;
  try {
    addBreadcrumb('social', 'unfollow_user', { followerId, followedId });
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .match({ follower_id: followerId, followed_id: followedId });
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'unfollow_user', followedId });
    return false;
  }
}

export async function fetchFollowedUserIds(followerId: string): Promise<string[]> {
  if (!guard()) return [];
  try {
    const { data, error } = await supabase
      .from('user_follows')
      .select('followed_id')
      .eq('follower_id', followerId);
    if (error) throw error;
    return (data ?? []).map((row: any) => row.followed_id);
  } catch (err) {
    captureException(err as Error, { op: 'fetch_followed_users', followerId });
    return [];
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
  if (!guard()) return true;
  try {
    addBreadcrumb('moderation', 'submit_report', { targetId: report.targetId });
    const payload: any = {
      reporter_id: report.reporterId,
      reason: report.reason,
      description: report.description ?? null,
      status: 'pending',
    };
    if (report.targetType === 'post') {
      payload.post_id = report.targetId;
    } else {
      payload.comment_id = report.targetId;
    }
    const { error } = await supabase.from('reports').insert(payload);
    if (error) throw error;
    return true;
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
): Promise<any[] | null> {
  if (!guard()) return null;
  try {
    let followedIds: string[] = [];
    if (viewerId) {
      followedIds = await fetchFollowedUserIds(viewerId);
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

// ─── Political Shorts ─────────────────────────────────────────────────────────

export async function fetchShorts(stateCode?: string): Promise<any[]> {
  if (!guard()) return [];
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
    return [];
  }
}

export async function incrementShortView(shortId: string): Promise<boolean> {
  if (!guard()) return true;
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shortId);
    if (!isUuid) return true;
    const { error } = await supabase.rpc('increment_short_views', { p_short_id: shortId });
    if (error) {
      // Fallback direct update
      await supabase
        .from('political_shorts')
        .update({ view_count: supabase.rpc('increment') as any })
        .eq('id', shortId);
    }
    return true;
  } catch {
    return false;
  }
}

export async function addShortComment(
  shortId: string,
  userId: string,
  userName: string,
  text: string,
): Promise<{ id: string | null; success: boolean }> {
  // Moderate content before insertion
  const modCheck = await checkContentModeration(text);
  if (modCheck.flagged) {
    throw new Error(`This content could not be posted — it violates community guidelines (${modCheck.reason || 'moderation policy'}).`);
  }

  if (!guard()) return { id: `local-cmt-${Date.now()}`, success: true };
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shortId);
    if (!isUuid) return { id: `local-cmt-${Date.now()}`, success: true };

    const { data, error } = await supabase
      .from('short_comments')
      .insert({
        short_id: shortId,
        user_id: userId,
        author_name: userName,
        text,
      })
      .select('id')
      .single();

    if (error) throw error;

    // Increment comment_count on short
    await supabase
      .from('political_shorts')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', shortId);

    return { id: data?.id ?? null, success: true };
  } catch (err) {
    captureException(err as Error, { op: 'add_short_comment', shortId });
    return { id: null, success: false };
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
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('live_events')
      .insert(event)
      .select()
      .single();
    if (error) { console.warn('[LMX] createLiveEvent error:', error.message); return null; }
    return data;
  } catch (e) { console.warn('[LMX] createLiveEvent exception:', e); return null; }
}

export async function updateLiveEvent(eventId: string, updates: Record<string, any>): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from('live_events')
      .update(updates)
      .eq('id', eventId);
    if (error) { console.warn('[LMX] updateLiveEvent error:', error.message); return false; }
    return true;
  } catch (e) { console.warn('[LMX] updateLiveEvent exception:', e); return false; }
}

export async function endLiveEvent(eventId: string, contentHash: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from('live_events')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        content_hash: contentHash,
        retention_expiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', eventId);
    if (error) { console.warn('[LMX] endLiveEvent error:', error.message); return false; }
    return true;
  } catch (e) { console.warn('[LMX] endLiveEvent exception:', e); return false; }
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
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('lmx_department_alerts')
      .insert(alert)
      .select()
      .single();
    if (error) { console.warn('[LMX] dispatchDepartmentAlert error:', error.message); return null; }
    return data;
  } catch (e) { console.warn('[LMX] dispatchDepartmentAlert exception:', e); return null; }
}

export async function acknowledgeDepartmentAlert(
  alertId: string,
  acknowledgment: string,
  acknowledgedBy: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from('lmx_department_alerts')
      .update({
        acknowledgment,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: acknowledgedBy,
        delivery_status: 'delivered',
      })
      .eq('id', alertId);
    if (error) { console.warn('[LMX] acknowledgeDepartmentAlert error:', error.message); return false; }
    return true;
  } catch (e) { console.warn('[LMX] acknowledgeDepartmentAlert exception:', e); return false; }
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
}): Promise<{ id: string | null; success: boolean }> {
  if (!guard()) return { id: `local-alert-${Date.now()}`, success: true };
  try {
    addBreadcrumb('content_alerts', 'create', { contentId: alert.contentId, category: alert.category });
    const isUuid = alert.contentVisibilityId && alert.contentVisibilityId.length === 36 && alert.contentVisibilityId.includes('-');
    const { data, error } = await supabase
      .from('content_alerts')
      .insert({
        content_visibility_id: isUuid ? alert.contentVisibilityId : null,
        content_type: alert.contentType,
        content_id: alert.contentId,
        user_id: alert.userId,
        severity: alert.severity,
        reason: alert.reason,
        category: alert.category,
        acknowledged: false,
      })
      .select('id')
      .single();
    if (error) throw error;
    return { id: data?.id ?? null, success: true };
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
  if (!guard()) return true;
  try {
    const isUuid = acknowledgedBy && acknowledgedBy.length === 36 && acknowledgedBy.includes('-');
    const { error } = await supabase
      .from('content_alerts')
      .update({
        acknowledged: true,
        acknowledged_by: isUuid ? acknowledgedBy : null,
        acknowledged_at: new Date().toISOString(),
        action_taken: actionTaken,
      })
      .eq('id', alertId);
    if (error) throw error;
    return true;
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
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from('lmx_credibility')
      .upsert({ reporter_id: reporterId, ...updates });
    if (error) { console.warn('[LMX] updateReporterCredibility error:', error.message); return false; }
    return true;
  } catch (e) { console.warn('[LMX] updateReporterCredibility exception:', e); return false; }
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

export async function addDistributionDestination(dest: Record<string, any>): Promise<any | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('lmx_distribution_destinations')
      .insert(dest)
      .select()
      .single();
    if (error) { console.warn('[LMX] addDistributionDestination error:', error.message); return null; }
    return data;
  } catch (e) { console.warn('[LMX] addDistributionDestination exception:', e); return null; }
}

export async function logModerationEvent(event: Record<string, any>): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from('lmx_moderation_events')
      .insert(event);
    if (error) { console.warn('[LMX] logModerationEvent error:', error.message); return false; }
    return true;
  } catch (e) { console.warn('[LMX] logModerationEvent exception:', e); return false; }
}

export async function incrementViewerCount(eventId: string, delta: number): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { data: current } = await supabase
      .from('live_events')
      .select('viewer_count, peak_viewers')
      .eq('id', eventId)
      .single();
    if (!current) return false;
    const newCount = Math.max(0, (current.viewer_count ?? 0) + delta);
    const newPeak = Math.max(current.peak_viewers ?? 0, newCount);
    const { error } = await supabase
      .from('live_events')
      .update({ viewer_count: newCount, peak_viewers: newPeak })
      .eq('id', eventId);
    if (error) { console.warn('[LMX] incrementViewerCount error:', error.message); return false; }
    return true;
  } catch (e) { console.warn('[LMX] incrementViewerCount exception:', e); return false; }
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

export async function fetchUserConversations(userId: string): Promise<DMConversationItem[]> {
  if (!guard()) return [];
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
          displayName: profile?.display_name || 'Kshetra Citizen',
          avatarUrl: profile?.avatar_url || null,
          role: profile?.role || 'citizen',
          isVerified: profile?.verification_status === 'verified',
        },
      };
    });
  } catch (err) {
    captureException(err as Error, { op: 'fetch_user_conversations', userId });
    return [];
  }
}

export async function fetchConversationMessages(conversationId: string): Promise<DMMessageItem[]> {
  if (!guard()) return [];
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
    return [];
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
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://kshetra-api-production-9f06.up.railway.app';
    const res = await fetch(`${apiUrl}/api/v1/dm/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': senderId,
      },
      body: JSON.stringify({ content, mediaUrl, mediaType }),
    });

    if (res.ok) {
      const result = await res.json();
      return result.message;
    }
    return null;
  } catch (err) {
    captureException(err as Error, { op: 'send_dm', conversationId });
    return null;
  }
}

export async function acceptDMRequest(conversationId: string, userId: string): Promise<boolean> {
  if (!guard()) return true;
  try {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://kshetra-api-production-9f06.up.railway.app';
    const res = await fetch(`${apiUrl}/api/v1/dm/conversations/${conversationId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
    });
    return res.ok;
  } catch (err) {
    captureException(err as Error, { op: 'accept_dm', conversationId });
    return false;
  }
}

export async function declineDMRequest(conversationId: string, userId: string): Promise<boolean> {
  if (!guard()) return true;
  try {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://kshetra-api-production-9f06.up.railway.app';
    const res = await fetch(`${apiUrl}/api/v1/dm/conversations/${conversationId}/decline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
    });
    return res.ok;
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
  if (!guard()) return true;
  try {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://kshetra-api-production-9f06.up.railway.app';
    const res = await fetch(`${apiUrl}/api/v1/dm/block-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ targetUserId, reason, description, conversationId }),
    });
    return res.ok;
  } catch (err) {
    captureException(err as Error, { op: 'block_report_dm', targetUserId });
    return false;
  }
}

export async function markConversationMessagesRead(conversationId: string, userId: string): Promise<boolean> {
  if (!guard()) return false;
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null);

    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'mark_messages_read', conversationId });
    return false;
  }
}

export async function fetchDMUnreadCount(userId: string, token?: string | null): Promise<number> {
  if (!guard()) return 0;
  try {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://kshetra-api-production-9f06.up.railway.app';
    const headers: Record<string, string> = { 'x-user-id': userId };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${apiUrl}/api/v1/dm/unread-count`, { headers });
    if (res.ok) {
      const data = await res.json();
      return typeof data.count === 'number' ? data.count : 0;
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


