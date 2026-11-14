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
  __refreshFeed: jest.fn(async () => undefined),
  useFeedStore: {
    getState: () => ({
      refreshFeed: jest.requireMock('../stores/feed').__refreshFeed,
      posts: [],
      isLive: true,
    }),
  },
}));
jest.mock('../stores/civic', () => ({
  __loadIssuesForScope: jest.fn(async () => undefined),
  useCivicStore: {
    getState: () => ({
      scopeFilter: 'constituency',
      loadIssuesForScope: jest.requireMock('../stores/civic').__loadIssuesForScope,
    }),
  },
}));
jest.mock('../stores/promises', () => ({
  __loadForState: jest.fn(async () => undefined),
  usePromiseStore: {
    getState: () => ({
      loadForState: jest.requireMock('../stores/promises').__loadForState,
      promises: [],
      promiseLoadStatus: 'loaded',
    }),
  },
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
jest.mock('../stores/contributorVerification', () => ({
  useContributorVerificationStore: { getState: () => ({ setOwnerUserId: jest.fn() }) },
}));
jest.mock('../lib/contributorKycService', () => ({
  hydrateContributorKYC: jest.fn(async () => undefined),
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
  fetchPromisesForState: jest.fn(async () => [{ id: 'promise-1' }]),
  toggleFavorite: jest.fn(),
}));

import { bootstrapSupabase, refreshSupabaseDataOnForeground } from '../lib/supabaseBootstrap';

beforeEach(() => {
  jest.clearAllMocks();
  jest.requireMock('../stores/auth').useAuthStore.getState.mockReturnValue({ user: null });
});

describe('Supabase foreground refresh', () => {
  it('refreshes current-state feed, selected-scope civic issues, and promises once for concurrent requests', async () => {
    const dataService = jest.requireMock('../lib/supabaseDataService');
    const feedStore = jest.requireMock('../stores/feed');
    const civicStore = jest.requireMock('../stores/civic');
    const promiseStore = jest.requireMock('../stores/promises');

    await Promise.all([
      refreshSupabaseDataOnForeground(),
      refreshSupabaseDataOnForeground(),
    ]);

    expect(feedStore.__refreshFeed).toHaveBeenCalledWith('TS', 'TS-AC-61');
    expect(feedStore.__refreshFeed).toHaveBeenCalledTimes(1);
    expect(dataService.fetchFeedForState).not.toHaveBeenCalled();
    expect(civicStore.__loadIssuesForScope).toHaveBeenCalledWith('constituency', 'TS', 'TS-AC-61', true);
    expect(promiseStore.__loadForState).toHaveBeenCalledWith('TS', true, true);
    expect(promiseStore.__loadForState).toHaveBeenCalledTimes(1);
    expect(dataService.fetchPromisesForState).not.toHaveBeenCalled();
    expect(civicStore.__loadIssuesForScope).toHaveBeenCalledTimes(1);
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
    expect(jest.requireMock('../lib/contributorKycService').hydrateContributorKYC)
      .toHaveBeenCalledWith('user-1');
    expect(realtime.__subscribeAll).toHaveBeenCalledTimes(2);
  });
});
