jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(async () => ({
            data: { user_id: 'user-1', display_name: 'User', role: 'citizen' },
            error: null,
          })),
        })),
      })),
    })),
  },
  isSupabaseConfigured: true,
}));
jest.mock('../stores/auth', () => ({
  useAuthStore: { getState: jest.fn(() => ({ user: null })) },
}));
jest.mock('../stores/userProfile', () => ({
  useUserProfileStore: { getState: () => ({ profile: null, updateProfile: jest.fn() }) },
}));
jest.mock('../stores/myConstituency', () => ({
  useMyConstituencyStore: { getState: () => ({ home: { acNo: 61 } }) },
}));
jest.mock('../stores/activeState', () => ({
  useActiveStateStore: { getState: () => ({ stateCode: 'TS' }) },
}));
jest.mock('../stores/feed', () => ({
  useFeedStore: { getState: () => ({ hydrateFromServer: jest.fn() }) },
}));
jest.mock('../stores/civic', () => ({
  useCivicStore: { getState: () => ({ hydrateFromServer: jest.fn() }) },
}));
jest.mock('../stores/promises', () => ({
  usePromiseStore: { getState: () => ({ hydrateFromServer: jest.fn() }) },
}));
jest.mock('../stores/favorites', () => ({
  useFavoritesStore: { getState: () => ({ favoriteIds: [] }) },
}));
jest.mock('../stores/notifications', () => ({
  __fetchNotifications: jest.fn(),
  __subscribeToUserNotifications: jest.fn(() => jest.fn()),
  useNotificationsStore: {
    getState: () => ({
      fetchNotifications: jest.requireMock('../stores/notifications').__fetchNotifications,
      subscribeToUserNotifications: jest.requireMock('../stores/notifications')
        .__subscribeToUserNotifications,
    }),
  },
}));
jest.mock('../stores/politicalShorts', () => ({
  __hydrateShorts: jest.fn(),
  usePoliticalShortsStore: {
    getState: () => ({
      hydrateShorts: jest.requireMock('../stores/politicalShorts').__hydrateShorts,
    }),
  },
}));
jest.mock('../stores/liveExchange', () => ({
  useLiveExchangeStore: { getState: () => ({ hydrate: jest.fn() }) },
}));
jest.mock('../lib/realtimeService', () => {
  const subscribeAll = jest.fn(() => jest.fn());
  return {
    __subscribeAll: subscribeAll,
    subscribeAll,
    unsubscribeAll: jest.fn(),
  };
});
jest.mock('../lib/offlineSync', () => ({
  flushQueue: jest.fn(),
  getQueueSize: jest.fn(() => 0),
}));
jest.mock('../lib/networkStatus', () => ({ isOnline: jest.fn(() => true) }));
jest.mock('../lib/errorReporting', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));
jest.mock('../lib/supabaseDataService', () => ({
  fetchFeedForState: jest.fn(async () => [{ id: 'post-1' }]),
  fetchIssuesForConstituency: jest.fn(async () => [{ id: 'issue-1' }]),
  fetchPromisesForState: jest.fn(async () => [{ id: 'promise-1' }]),
  toggleFavorite: jest.fn(),
}));

import { bootstrapSupabase, refreshSupabaseDataOnForeground } from '../lib/supabaseBootstrap';

beforeEach(() => {
  jest.clearAllMocks();
  jest.requireMock('../stores/auth').useAuthStore.getState.mockReturnValue({ user: null });
});

describe('Supabase foreground refresh', () => {
  it('refreshes current-state feed, constituency issues, and promises once for concurrent requests', async () => {
    const dataService = jest.requireMock('../lib/supabaseDataService');

    await Promise.all([
      refreshSupabaseDataOnForeground(),
      refreshSupabaseDataOnForeground(),
    ]);

    expect(dataService.fetchFeedForState).toHaveBeenCalledWith('TS', 50);
    expect(dataService.fetchIssuesForConstituency).toHaveBeenCalledWith('TS-AC-61', 'TS');
    expect(dataService.fetchPromisesForState).toHaveBeenCalledWith('TS');
    expect(dataService.fetchFeedForState).toHaveBeenCalledTimes(1);
    expect(dataService.fetchIssuesForConstituency).toHaveBeenCalledTimes(1);
    expect(dataService.fetchPromisesForState).toHaveBeenCalledTimes(1);
    expect(jest.requireMock('../stores/politicalShorts').__hydrateShorts).toHaveBeenCalledWith('TS');
    expect(jest.requireMock('../stores/politicalShorts').__hydrateShorts).toHaveBeenCalledTimes(1);
  });

  it('runs user-specific bootstrap after a guest bootstrap when a user signs in', async () => {
    const authStore = jest.requireMock('../stores/auth').useAuthStore;
    const notifications = jest.requireMock('../stores/notifications');
    const realtime = jest.requireMock('../lib/realtimeService');

    await bootstrapSupabase();
    expect(notifications.__fetchNotifications).not.toHaveBeenCalled();

    authStore.getState.mockReturnValue({
      user: { id: 'user-1', email: 'user@example.com' },
    });
    await bootstrapSupabase();

    expect(notifications.__fetchNotifications).toHaveBeenCalledWith('user-1');
    expect(notifications.__subscribeToUserNotifications).toHaveBeenCalledWith('user-1');
    expect(realtime.__subscribeAll).toHaveBeenCalledTimes(2);
  });
});
