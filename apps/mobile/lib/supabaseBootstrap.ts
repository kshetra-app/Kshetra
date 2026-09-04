/**
 * Supabase Bootstrap — Central orchestrator for backend connectivity.
 *
 * Responsibilities:
 * 1. Ensure user_profiles row exists after sign-in/sign-up
 * 2. Sync local favorites, profile settings to Supabase
 * 3. Start realtime subscriptions
 * 4. Flush offline queue when online
 * 5. Load server data into Zustand stores (stale-while-revalidate)
 *
 * Called once from _layout.tsx after auth initialization.
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../stores/auth';
import { useUserProfileStore } from '../stores/userProfile';
import { useMyConstituencyStore } from '../stores/myConstituency';
import { useActiveStateStore } from '../stores/activeState';
import { useFeedStore } from '../stores/feed';
import { useCivicStore } from '../stores/civic';
import { useFavoritesStore } from '../stores/favorites';
import { useNotificationsStore } from '../stores/notifications';
import { subscribeAll, unsubscribeAll } from './realtimeService';
import { flushQueue, getQueueSize } from './offlineSync';
import { isOnline } from './networkStatus';
import { captureException, addBreadcrumb } from './errorReporting';
import * as dataService from './supabaseDataService';

let bootstrapped = false;
let realtimeCleanup: (() => void) | null = null;

/**
 * Main bootstrap — call after auth.initialize() resolves.
 * Safe to call multiple times (idempotent).
 */
export async function bootstrapSupabase(): Promise<void> {
  if (!isSupabaseConfigured) {
    addBreadcrumb('bootstrap', 'skipped', { reason: 'not_configured' });
    return;
  }

  if (bootstrapped) return;
  bootstrapped = true;

  const user = useAuthStore.getState().user;
  addBreadcrumb('bootstrap', 'starting', { userId: user?.id ?? 'guest' });

  try {
    // 1. If user is authenticated, ensure profile and sync user-specific data
    if (user) {
      await ensureUserProfile(user.id, user.email ?? '');
      await syncLocalToServer(user.id);
    }

    // 2. Load fresh public data from server into stores (Feed, Civic Issues)
    await hydrateStoresFromServer();

    // 3. Hydrate Live Media Exchange store
    try {
      const { useLiveExchangeStore } = require('../stores/liveExchange');
      await useLiveExchangeStore.getState().hydrate();
    } catch (e) {
      console.warn('[Bootstrap] LMX hydrate error:', e);
    }

    // 4. Flush offline queue if authenticated and online
    if (user && isOnline()) {
      const queueSize = getQueueSize();
      if (queueSize > 0) {
        addBreadcrumb('bootstrap', 'flushing_queue', { size: queueSize });
        const result = await flushQueue();
        addBreadcrumb('bootstrap', 'queue_flushed', result);
      }
    }

    // 5. Start realtime subscriptions
    startRealtimeSubscriptions();

    addBreadcrumb('bootstrap', 'completed');
  } catch (err) {
    captureException(err as Error, { phase: 'bootstrap' });
  }
}

/**
 * Tear down — call on sign-out.
 */
export function teardownSupabase(): void {
  bootstrapped = false;
  if (realtimeCleanup) {
    realtimeCleanup();
    realtimeCleanup = null;
  }
  unsubscribeAll();
  addBreadcrumb('bootstrap', 'teardown');
}

// ─── Internal Helpers ─────────────────────────────────────────────────────

async function ensureUserProfile(userId: string, email: string): Promise<void> {
  try {
    // Check if profile exists
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, display_name, role, constituency_id, state_code')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // Profile doesn't exist (trigger may not have fired, or pre-existing user)
      const localProfile = useUserProfileStore.getState().profile;
      const displayName = localProfile?.displayName || email.split('@')[0] || 'User';
      const stateCode = useActiveStateStore.getState().stateCode;
      const home = useMyConstituencyStore.getState().home;

      const { error: insertErr } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          display_name: displayName,
          role: localProfile?.role || 'citizen',
          state_code: stateCode || null,
          constituency_id: home ? `${stateCode}-AC-${home.acNo}` : null,
        }, { onConflict: 'user_id' });

      if (insertErr) throw insertErr;
      addBreadcrumb('bootstrap', 'profile_created');
    } else {
      // Merge server profile into local store
      useUserProfileStore.getState().updateProfile({
        displayName: data.display_name,
        role: data.role,
      });
      addBreadcrumb('bootstrap', 'profile_synced');
    }
  } catch (err) {
    captureException(err as Error, { op: 'ensure_user_profile' });
  }
}

async function syncLocalToServer(userId: string): Promise<void> {
  try {
    // Sync favorites
    const favoriteIds = useFavoritesStore.getState().favoriteIds;
    if (favoriteIds.length > 0) {
      const stateCode = useActiveStateStore.getState().stateCode;
      for (const acNo of favoriteIds) {
        const constituencyId = `${stateCode}-AC-${acNo}`;
        await dataService.toggleFavorite(constituencyId, userId, true);
      }
      addBreadcrumb('bootstrap', 'favorites_synced', { count: favoriteIds.length });
    }
  } catch (err) {
    captureException(err as Error, { op: 'sync_local_to_server' });
  }
}

async function hydrateStoresFromServer(): Promise<void> {
  const stateCode = useActiveStateStore.getState().stateCode;
  const myHome = useMyConstituencyStore.getState().home;
  const constituencyId = myHome ? `${stateCode}-AC-${myHome.acNo}` : undefined;

  // Fetch in parallel
  const [feedData, issuesData, promisesData] = await Promise.allSettled([
    dataService.fetchFeedForState(stateCode, 50),
    constituencyId
      ? dataService.fetchIssuesForConstituency(constituencyId, stateCode)
      : Promise.resolve(null),
    dataService.fetchPromisesForState(stateCode),
  ]);

  // Hydrate feed store if server returned data
  if (feedData.status === 'fulfilled' && feedData.value && feedData.value.length > 0) {
    useFeedStore.getState().hydrateFromServer(feedData.value);
    addBreadcrumb('bootstrap', 'feed_hydrated', { count: feedData.value.length });
  }

  // Hydrate civic store
  if (issuesData.status === 'fulfilled' && issuesData.value && issuesData.value.length > 0) {
    useCivicStore.getState().hydrateFromServer(issuesData.value);
    addBreadcrumb('bootstrap', 'issues_hydrated', { count: issuesData.value.length });
  }

  addBreadcrumb('bootstrap', 'stores_hydrated');
}

function startRealtimeSubscriptions(): void {
  const stateCode = useActiveStateStore.getState().stateCode;
  const myHome = useMyConstituencyStore.getState().home;
  const constituencyId = myHome ? `${stateCode}-AC-${myHome.acNo}` : undefined;

  realtimeCleanup = subscribeAll(stateCode, constituencyId);
  addBreadcrumb('bootstrap', 'realtime_started');
}

/**
 * Re-bootstrap after state or constituency change.
 */
export async function onContextChange(): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (!useAuthStore.getState().user) return;

  // Tear down old subscriptions
  if (realtimeCleanup) {
    realtimeCleanup();
    realtimeCleanup = null;
  }

  // Re-hydrate and re-subscribe
  await hydrateStoresFromServer();
  startRealtimeSubscriptions();
  addBreadcrumb('bootstrap', 'context_changed');
}
