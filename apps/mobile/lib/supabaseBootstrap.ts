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
 * Called after auth initialization and whenever the signed-in user changes.
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../stores/auth';
import { useUserProfileStore } from '../stores/userProfile';
import { useMyConstituencyStore } from '../stores/myConstituency';
import { useActiveStateStore } from '../stores/activeState';
import { useFeedStore } from '../stores/feed';
import { useCivicStore } from '../stores/civic';
import { usePromiseStore } from '../stores/promises';
import { useFavoritesStore } from '../stores/favorites';
import { useNotificationsStore } from '../stores/notifications';
import { usePoliticalShortsStore } from '../stores/politicalShorts';
import { subscribeAll, unsubscribeAll } from './realtimeService';
import { flushQueue, getQueueSize } from './offlineSync';
import { isOnline } from './networkStatus';
import { captureException, addBreadcrumb } from './errorReporting';
import * as dataService from './supabaseDataService';

let bootstrappedUserId: string | null | undefined;
let bootstrapInFlight: Promise<void> | null = null;
let bootstrapGeneration = 0;
let realtimeCleanup: (() => void) | null = null;
let foregroundRefreshInFlight: Promise<void> | null = null;
let lastForegroundRefreshAt = 0;
const FOREGROUND_REFRESH_THROTTLE_MS = 15_000;

/**
 * Main bootstrap — call after auth.initialize() resolves.
 * Safe to call multiple times (idempotent).
 */
export async function bootstrapSupabase(): Promise<void> {
  if (!isSupabaseConfigured) {
    addBreadcrumb('bootstrap', 'skipped', { reason: 'not_configured' });
    return;
  }

  const requestedUserId = useAuthStore.getState().user?.id ?? null;
  if (bootstrappedUserId === requestedUserId) return;
  if (bootstrapInFlight) {
    await bootstrapInFlight;
    return bootstrapSupabase();
  }

  const user = useAuthStore.getState().user;
  const userId = user?.id ?? null;
  const generation = bootstrapGeneration;
  addBreadcrumb('bootstrap', 'starting', { userId: user?.id ?? 'guest' });

  const bootstrap = (async () => {
    // 1. If user is authenticated, ensure profile and sync user-specific data
    if (user) {
      await ensureUserProfile(user.id, user.email ?? '');
      await syncLocalToServer(user.id);
      await useNotificationsStore.getState().fetchNotifications(user.id);
    }

    // 2. Load fresh public data from server into stores (Feed, Civic Issues)
    await refreshServerSnapshot(true);

    // 3. Flush offline queue if authenticated and online
    if (user && isOnline()) {
      const queueSize = getQueueSize();
      if (queueSize > 0) {
        addBreadcrumb('bootstrap', 'flushing_queue', { size: queueSize });
        const result = await flushQueue();
        addBreadcrumb('bootstrap', 'queue_flushed', result);
      }
    }

    // 4. Start realtime subscriptions
    startRealtimeSubscriptions();

    addBreadcrumb('bootstrap', 'completed');
  })();
  bootstrapInFlight = bootstrap;

  try {
    await bootstrap;
    if (generation === bootstrapGeneration && (useAuthStore.getState().user?.id ?? null) === userId) {
      bootstrappedUserId = userId;
    }
  } catch (err) {
    captureException(err as Error, { phase: 'bootstrap' });
    if (generation === bootstrapGeneration) bootstrappedUserId = undefined;
  } finally {
    if (bootstrapInFlight === bootstrap) bootstrapInFlight = null;
  }

  if (generation !== bootstrapGeneration || (useAuthStore.getState().user?.id ?? null) !== userId) {
    await bootstrapSupabase();
  }
}

/**
 * Refresh server-backed stores after the app returns to the foreground.
 * This catches up changes made while the app was backgrounded, even for tables
 * that do not have a mobile realtime subscription.
 */
export async function refreshSupabaseDataOnForeground(): Promise<void> {
  await refreshServerSnapshot(false);
}

async function refreshServerSnapshot(force: boolean): Promise<void> {
  if (!isSupabaseConfigured || !isOnline()) return;

  if (foregroundRefreshInFlight) {
    await foregroundRefreshInFlight;
    return;
  }

  const now = Date.now();
  if (!force && now - lastForegroundRefreshAt < FOREGROUND_REFRESH_THROTTLE_MS) return;

  const refresh = (async () => {
    await hydrateStoresFromServer();
    try {
      const { useLiveExchangeStore } = require('../stores/liveExchange');
      await useLiveExchangeStore.getState().hydrate();
    } catch (err) {
      captureException(err as Error, { phase: 'live_exchange_refresh' });
    }
  })();

  foregroundRefreshInFlight = refresh;
  try {
    await refresh;
    lastForegroundRefreshAt = Date.now();
    addBreadcrumb('bootstrap', 'foreground_data_refreshed');
  } catch (err) {
    lastForegroundRefreshAt = 0;
    captureException(err as Error, { phase: 'foreground_data_refresh' });
  } finally {
    if (foregroundRefreshInFlight === refresh) foregroundRefreshInFlight = null;
  }
}

/**
 * Tear down — call on sign-out.
 */
export function teardownSupabase(): void {
  bootstrapGeneration += 1;
  bootstrappedUserId = undefined;
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
  const civicStore = useCivicStore.getState();

  // Fetch in parallel
  const [feedRefresh, issuesData, promisesData] = await Promise.allSettled([
    useFeedStore.getState().refreshFeed(stateCode, constituencyId),
    civicStore.scopeFilter === 'constituency' && !constituencyId
      ? Promise.resolve()
      : civicStore.loadIssuesForScope(civicStore.scopeFilter, stateCode, constituencyId, true),
    dataService.fetchPromisesForState(stateCode),
  ]);

  // Refresh the feed through its canonical filtering, ranking, and stale-data path.
  if (feedRefresh.status === 'fulfilled') {
    addBreadcrumb('bootstrap', 'feed_refreshed', {
      count: useFeedStore.getState().posts.length,
      isLive: useFeedStore.getState().isLive,
    });
  } else {
    captureException(feedRefresh.reason as Error, { op: 'hydrate_feed' });
  }

  // Civic issues are loaded through the canonical API for the selected scope.
  if (issuesData.status === 'fulfilled') {
    addBreadcrumb('bootstrap', 'issues_hydrated', {
      scope: civicStore.scopeFilter,
    });
  } else {
    captureException(issuesData.reason as Error, { op: 'hydrate_civic_issues' });
  }

  if (promisesData.status === 'fulfilled' && promisesData.value !== null) {
    usePromiseStore.getState().hydrateFromServer(promisesData.value);
    addBreadcrumb('bootstrap', 'promises_hydrated', { count: promisesData.value.length });
  }

  // Hydrate shorts store
  await usePoliticalShortsStore.getState().hydrateShorts(stateCode);

  addBreadcrumb('bootstrap', 'stores_hydrated');
}

function startRealtimeSubscriptions(): void {
  if (realtimeCleanup) {
    realtimeCleanup();
    realtimeCleanup = null;
  }

  const stateCode = useActiveStateStore.getState().stateCode;
  const myHome = useMyConstituencyStore.getState().home;
  const constituencyId = myHome ? `${stateCode}-AC-${myHome.acNo}` : undefined;
  const civicScope = useCivicStore.getState().scopeFilter;
  const user = useAuthStore.getState().user;

  // Realtime follows the active civic scope, while data refreshes use the API.
  const appCleanup = subscribeAll(stateCode, civicScope, constituencyId);
  const notifCleanup = user ? useNotificationsStore.getState().subscribeToUserNotifications(user.id) : () => {};

  realtimeCleanup = () => {
    appCleanup();
    notifCleanup();
  };
  addBreadcrumb('bootstrap', 'realtime_started');
}

/**
 * Re-bootstrap after state or constituency change.
 */
export async function onContextChange(): Promise<void> {
  if (!isSupabaseConfigured) return;

  // Tear down old subscriptions
  if (realtimeCleanup) {
    realtimeCleanup();
    realtimeCleanup = null;
  }

  // Re-hydrate and re-subscribe. Public records also need refreshing for guests.
  await refreshServerSnapshot(true);
  startRealtimeSubscriptions();
  addBreadcrumb('bootstrap', 'context_changed');
}
