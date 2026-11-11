jest.mock('../lib/supabase', () => ({
  supabase: {},
  isSupabaseConfigured: true,
}));
jest.mock('../stores/auth', () => ({
  useAuthStore: { getState: () => ({ user: null }) },
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
  useNotificationsStore: { getState: () => ({ fetchNotifications: jest.fn() }) },
}));
jest.mock('../stores/politicalShorts', () => ({
  usePoliticalShortsStore: { getState: () => ({ hydrateShorts: jest.fn() }) },
}));
jest.mock('../stores/liveExchange', () => ({
  useLiveExchangeStore: { getState: () => ({ hydrate: jest.fn() }) },
}));
jest.mock('../lib/realtimeService', () => ({
  subscribeAll: jest.fn(() => jest.fn()),
  unsubscribeAll: jest.fn(),
}));
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

import { refreshSupabaseDataOnForeground } from '../lib/supabaseBootstrap';

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
  });
});
