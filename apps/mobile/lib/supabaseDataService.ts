/**
 * Supabase Data Service
 *
 * Wires local Zustand store operations to real Supabase backend calls.
 * Each method checks `isSupabaseConfigured` and falls back gracefully to
 * local-only operation when backend is unavailable.
 *
 * Used by the offline sync queue's `executeOp()` to replay queued writes.
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { captureException, addBreadcrumb } from './errorReporting';

// ─── Civic Issues ────────────────────────────────────────────────────

export async function upvoteIssue(issueId: string, userId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
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

export async function followIssue(issueId: string, userId: string, follow: boolean): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
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
  if (!isSupabaseConfigured) return { id: `local-${Date.now()}`, success: true };
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

// ─── Feed / Posts ────────────────────────────────────────────────────

export async function reactToPost(postId: string, userId: string, reaction: string): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  try {
    addBreadcrumb('feed', 'react_post', { postId, reaction });
    const { error } = await supabase
      .from('reactions')
      .upsert(
        { post_id: postId, user_id: userId, reaction_type: reaction },
        { onConflict: 'post_id,user_id' },
      );
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'react_post', postId });
    return false;
  }
}

export async function composePost(post: {
  content: string;
  type: string;
  stateCode: string;
  authorId: string;
  authorName: string;
  hashtags?: string[];
  constituencyId?: string;
}): Promise<{ id: string | null; success: boolean }> {
  if (!isSupabaseConfigured) return { id: `local-${Date.now()}`, success: true };
  try {
    addBreadcrumb('feed', 'compose_post', { type: post.type });
    const { data, error } = await supabase
      .from('posts')
      .insert({
        content: post.content,
        post_type: post.type,
        state_code: post.stateCode,
        author_id: post.authorId,
        author_name: post.authorName,
        hashtags: post.hashtags ?? [],
        constituency_id: post.constituencyId,
      })
      .select('id')
      .single();
    if (error) throw error;
    return { id: data?.id ?? null, success: true };
  } catch (err) {
    captureException(err as Error, { op: 'compose_post' });
    return { id: null, success: false };
  }
}

// ─── Promises ────────────────────────────────────────────────────────

export async function followPromise(promiseId: string, userId: string, follow: boolean): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
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
  if (!isSupabaseConfigured) return true;
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
  if (!isSupabaseConfigured) return true;
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

// ─── Data Fetching (read operations) ─────────────────────────────────

export async function fetchIssuesForConstituency(
  constituencyId: string,
  stateCode: string,
): Promise<any[] | null> {
  if (!isSupabaseConfigured) return null;
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
  if (!isSupabaseConfigured) return null;
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
  if (!isSupabaseConfigured) return null;
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

/** Register push token with Supabase for this user */
export async function registerPushToken(
  userId: string,
  token: string,
  platform: 'ios' | 'android',
): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  try {
    addBreadcrumb('notifications', 'register_push_token', { platform });
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        { user_id: userId, token, platform, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,platform' },
      );
    if (error) throw error;
    return true;
  } catch (err) {
    captureException(err as Error, { op: 'register_push_token' });
    return false;
  }
}
