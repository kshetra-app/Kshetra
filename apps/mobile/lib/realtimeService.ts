/**
 * Supabase Realtime Service
 *
 * Manages real-time subscriptions for live data updates.
 * Channels:
 * - civic_issues: new/updated issues
 * - posts: new posts in followed constituencies
 * - promises: status changes
 * - delimitation_events: new delimitation events
 *
 * Graceful no-op when Supabase isn't configured.
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { useCivicStore } from '../stores/civic';
import { useFeedStore } from '../stores/feed';
import { usePromiseStore } from '../stores/promises';
import { useActiveStateStore } from '../stores/activeState';
import { useMyConstituencyStore } from '../stores/myConstituency';
import {
  notifyCivicIssueNearYou,
  notifyCivicIssueStatusChange,
  notifyPromiseStatusChange,
  notifyDelimitationUpdate,
  notifyCommunityReply,
} from './notificationTriggers';

type RealtimeChannel = ReturnType<typeof supabase.channel>;

const channels: Map<string, RealtimeChannel> = new Map();
const refreshTimers = new Map<string, ReturnType<typeof setTimeout>>();
const REALTIME_REFRESH_DEBOUNCE_MS = 150;
let activeCivicSubscriptionCleanup: (() => void) | null = null;
let activeCivicSubscriptionKey: string | null = null;

/**
 * Subscribe to civic issue changes for a constituency.
 */
export function subscribeToCivicIssues(constituencyId?: string, stateCode?: string): () => void {
  if (!isSupabaseConfigured) return () => {};

  const channelName = `civic-issues-${constituencyId ?? stateCode ?? 'all'}`;
  if (channels.has(channelName)) return () => unsubscribe(channelName);

  const changeFilter = (event: 'INSERT' | 'UPDATE' | 'DELETE') => ({
    event,
    schema: 'public',
    table: 'civic_issues',
    ...(event !== 'DELETE' && constituencyId
      ? { filter: `constituency_id=eq.${constituencyId}` }
      : event !== 'DELETE' && stateCode
        ? { filter: `state_code=eq.${stateCode}` }
        : {}),
  });

  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', changeFilter('INSERT'), (payload) => {
      const issue = payload.new as any;
      notifyCivicIssueNearYou(issue.title ?? 'New issue', issue.constituency_name ?? 'your area');
      scheduleRefresh(`civic-${constituencyId ?? 'all'}`, refreshCivicIssues);
    })
    .on('postgres_changes', changeFilter('UPDATE'), (payload) => {
      const issue = payload.new as any;
      if (payload.old && (payload.old as any).status !== issue.status) {
        notifyCivicIssueStatusChange(issue.title ?? 'Issue', issue.status ?? 'updated');
      }
      scheduleRefresh(`civic-${constituencyId ?? 'all'}`, refreshCivicIssues);
    })
    .on('postgres_changes', changeFilter('DELETE'), () => {
      scheduleRefresh(`civic-${constituencyId ?? 'all'}`, refreshCivicIssues);
    })
    .subscribe();

  channels.set(channelName, channel);
  return () => unsubscribe(channelName);
}

/** Keep one civic realtime channel aligned with the dashboard's active scope. */
export function setCivicIssueRealtimeScope(
  scope: 'constituency' | 'state' | 'national',
  stateCode: string,
  constituencyId?: string,
): void {
  const scopeKey = scope === 'national'
    ? 'national'
    : scope === 'state'
      ? `state:${stateCode}`
      : constituencyId
        ? `constituency:${constituencyId}`
        : 'constituency:unselected';
  if (activeCivicSubscriptionKey === scopeKey) return;

  activeCivicSubscriptionCleanup?.();
  activeCivicSubscriptionCleanup = null;
  activeCivicSubscriptionKey = scopeKey;

  if (scope === 'constituency' && !constituencyId) return;
  activeCivicSubscriptionCleanup = scope === 'constituency'
    ? subscribeToCivicIssues(constituencyId)
    : scope === 'state'
      ? subscribeToCivicIssues(undefined, stateCode)
      : subscribeToCivicIssues();
}

function clearCivicIssueRealtimeScope(): void {
  activeCivicSubscriptionCleanup?.();
  activeCivicSubscriptionCleanup = null;
  activeCivicSubscriptionKey = null;
}

/**
 * Subscribe to new posts, comments, reactions, and poll votes in the feed.
 */
export function subscribeToFeed(stateCode?: string): () => void {
  if (!isSupabaseConfigured) return () => {};

  const channelName = `feed-${stateCode ?? 'all'}`;
  if (channels.has(channelName)) return () => unsubscribe(channelName);

  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
      useFeedStore.getState().receiveRealtimePost(payload.new);
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
      useFeedStore.getState().receiveRealtimePost(payload.new);
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, (payload) => {
      const comment = payload.new as any;
      useFeedStore.getState().receiveRealtimeComment(comment);
      notifyCommunityReply(comment.author_display_name ?? 'Someone', comment.content ?? '');
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reactions' }, (payload) => {
      useFeedStore.getState().receiveRealtimeReaction(payload.new);
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'poll_votes' }, (payload) => {
      useFeedStore.getState().receiveRealtimeVote(payload.new);
    })
    .subscribe();

  channels.set(channelName, channel);
  return () => unsubscribe(channelName);
}

/**
 * Subscribe to promise status changes.
 */
export function subscribeToPromises(): () => void {
  if (!isSupabaseConfigured) return () => {};

  const channelName = 'promises';
  if (channels.has(channelName)) return () => unsubscribe(channelName);

  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'election_promises' }, (payload) => {
      const promise = payload.new as any;
      if (payload.eventType === 'UPDATE' && payload.old && (payload.old as any).status !== promise.status) {
        notifyPromiseStatusChange(
          promise.title ?? 'Promise',
          promise.status ?? 'updated',
          promise.party ?? '',
        );
      }
      schedulePromiseRefresh();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'promise_updates' }, () => {
      schedulePromiseRefresh();
    })
    .subscribe();

  channels.set(channelName, channel);
  return () => unsubscribe(channelName);
}

function schedulePromiseRefresh(): void {
  scheduleRefresh('promises', async () => {
    const stateCode = useActiveStateStore.getState().stateCode;
    await usePromiseStore.getState().loadForState(stateCode, true, true);
  });
}

async function refreshCivicIssues(): Promise<void> {
  const stateCode = useActiveStateStore.getState().stateCode;
  const civicStore = useCivicStore.getState();
  const home = useMyConstituencyStore.getState().home;
  const constituencyId = home ? `${stateCode}-AC-${home.acNo}` : undefined;
  if (civicStore.scopeFilter === 'constituency' && !constituencyId) return;
  await civicStore.loadIssuesForScope(civicStore.scopeFilter, stateCode, constituencyId, true);
}

function scheduleRefresh(key: string, refresh: () => Promise<void>): void {
  const existing = refreshTimers.get(key);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    refreshTimers.delete(key);
    void refresh().catch((err) => {
      console.warn('[Realtime] Failed to refresh changed records:', err);
    });
  }, REALTIME_REFRESH_DEBOUNCE_MS);
  refreshTimers.set(key, timer);
}

/**
 * Subscribe to delimitation events.
 */
export function subscribeToDelimitation(): () => void {
  if (!isSupabaseConfigured) return () => {};

  const channelName = 'delimitation';
  if (channels.has(channelName)) return () => unsubscribe(channelName);

  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'delimitation_events' }, (payload) => {
      const event = payload.new as any;
      notifyDelimitationUpdate(event.title ?? 'New delimitation update', event.state_code);
    })
    .subscribe();

  channels.set(channelName, channel);
  return () => unsubscribe(channelName);
}

/**
 * Subscribe to LMX live events.
 */
export function subscribeToLmx(): () => void {
  if (!isSupabaseConfigured) return () => {};

  const channelName = 'lmx-live-events';
  if (channels.has(channelName)) return () => unsubscribe(channelName);

  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'live_events' }, (payload) => {
      const { useLiveExchangeStore } = require('../stores/liveExchange');
      const store = useLiveExchangeStore.getState();
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        store.hydrate();
      }
    })
    .subscribe();

  channels.set(channelName, channel);
  return () => unsubscribe(channelName);
}

/**
 * Subscribe to all relevant channels.
 */
export function subscribeAll(
  stateCode?: string,
  civicScope: 'constituency' | 'state' | 'national' = 'national',
  constituencyId?: string,
): () => void {
  const unsubs = [
    subscribeToFeed(stateCode),
    subscribeToPromises(),
    subscribeToDelimitation(),
    subscribeToLmx(),
  ];
  setCivicIssueRealtimeScope(civicScope, stateCode ?? '', constituencyId);
  return () => {
    unsubs.forEach((fn) => fn());
    clearCivicIssueRealtimeScope();
  };
}

/**
 * Unsubscribe from a specific channel.
 */
function unsubscribe(channelName: string): void {
  const channel = channels.get(channelName);
  if (channel) {
    supabase.removeChannel(channel);
    channels.delete(channelName);
  }
}

/**
 * Unsubscribe from all channels.
 */
export function unsubscribeAll(): void {
  clearCivicIssueRealtimeScope();
  for (const [name] of channels) {
    unsubscribe(name);
  }
}

/**
 * Get active subscription count (for debugging).
 */
export function getActiveSubscriptionCount(): number {
  return channels.size;
}
