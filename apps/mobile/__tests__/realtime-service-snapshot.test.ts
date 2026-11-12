jest.mock('../lib/supabase', () => {
  const handlers: Array<{ event: string; filter: any; callback: (payload: any) => void }> = [];
  const channel: any = {
    on: jest.fn((event: string, filter: any, callback: (payload: any) => void) => {
      handlers.push({ event, filter, callback });
      return channel;
    }),
    subscribe: jest.fn(() => channel),
  };
  return {
    __handlers: handlers,
    supabase: {
      channel: jest.fn(() => channel),
      removeChannel: jest.fn(),
    },
    isSupabaseConfigured: true,
  };
});
jest.mock('../stores/civic', () => {
  const loadIssuesForScope = jest.fn(async () => undefined);
  return {
    __loadIssuesForScope: loadIssuesForScope,
    useCivicStore: { getState: () => ({ scopeFilter: 'constituency', loadIssuesForScope }) },
  };
});
jest.mock('../stores/feed', () => ({
  useFeedStore: { getState: () => ({}) },
}));
jest.mock('../stores/promises', () => {
  const hydrateFromServer = jest.fn();
  return {
    __hydrateFromServer: hydrateFromServer,
    usePromiseStore: { getState: () => ({ hydrateFromServer }) },
  };
});
jest.mock('../stores/activeState', () => ({
  useActiveStateStore: { getState: () => ({ stateCode: 'TS' }) },
}));
jest.mock('../stores/myConstituency', () => ({
  useMyConstituencyStore: { getState: () => ({ home: { acNo: 61 } }) },
}));
jest.mock('../lib/supabaseDataService', () => ({
  fetchPromisesForState: jest.fn(async () => [{ id: 'promise-1' }]),
}));
jest.mock('../lib/notificationTriggers', () => ({
  notifyCivicIssueNearYou: jest.fn(),
  notifyCivicIssueStatusChange: jest.fn(),
  notifyPromiseStatusChange: jest.fn(),
  notifyDelimitationUpdate: jest.fn(),
  notifyCommunityReply: jest.fn(),
}));

import {
  subscribeToCivicIssues,
  subscribeToPromises,
  setCivicIssueRealtimeScope,
  unsubscribeAll,
} from '../lib/realtimeService';

describe('Realtime snapshot refresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    const supabaseMock = jest.requireMock('../lib/supabase');
    supabaseMock.__handlers.length = 0;
    jest.clearAllMocks();
  });

  afterEach(() => {
    unsubscribeAll();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('refreshes scoped civic issues in the store after a database update', async () => {
    const supabaseMock = jest.requireMock('../lib/supabase');
    const civicStore = jest.requireMock('../stores/civic');
    const notifications = jest.requireMock('../lib/notificationTriggers');
    const unsubscribe = subscribeToCivicIssues('TS-AC-61');
    const update = supabaseMock.__handlers.find(
      (handler: any) => handler.filter.table === 'civic_issues' && handler.filter.event === 'UPDATE',
    );

    expect(update.filter.filter).toBe('constituency_id=eq.TS-AC-61');
    update.callback({ new: { title: 'Road repair', status: 'resolved' }, old: { status: 'open' } });
    await jest.advanceTimersByTimeAsync(150);

    expect(notifications.notifyCivicIssueStatusChange).toHaveBeenCalledWith(
      'Road repair',
      'resolved',
    );
    expect(civicStore.__loadIssuesForScope).toHaveBeenCalledWith('constituency', 'TS', 'TS-AC-61', true);
    unsubscribe();
  });

  it('switches civic realtime filters with constituency, state, and national dashboard scopes', () => {
    const supabaseMock = jest.requireMock('../lib/supabase');

    setCivicIssueRealtimeScope('state', 'TS');
    const stateInsert = supabaseMock.__handlers.find(
      (handler: any) => handler.filter.table === 'civic_issues' && handler.filter.event === 'INSERT',
    );
    expect(stateInsert.filter.filter).toBe('state_code=eq.TS');

    setCivicIssueRealtimeScope('constituency', 'TS', 'TS-AC-61');
    const constituencyInserts = supabaseMock.__handlers.filter(
      (handler: any) => handler.filter.table === 'civic_issues' && handler.filter.event === 'INSERT',
    );
    const constituencyInsert = constituencyInserts[constituencyInserts.length - 1];
    expect(constituencyInsert.filter.filter).toBe('constituency_id=eq.TS-AC-61');

    setCivicIssueRealtimeScope('national', 'TS');
    const nationalInserts = supabaseMock.__handlers.filter(
      (handler: any) => handler.filter.table === 'civic_issues' && handler.filter.event === 'INSERT',
    );
    const nationalInsert = nationalInserts[nationalInserts.length - 1];
    expect(nationalInsert.filter.filter).toBeUndefined();
  });

  it('refreshes promise records when promises or their updates change', async () => {
    const supabaseMock = jest.requireMock('../lib/supabase');
    const dataService = jest.requireMock('../lib/supabaseDataService');
    const notifications = jest.requireMock('../lib/notificationTriggers');
    const unsubscribe = subscribeToPromises();
    const changedPromise = supabaseMock.__handlers.find(
      (handler: any) => handler.filter.table === 'election_promises',
    );
    const changedUpdate = supabaseMock.__handlers.find(
      (handler: any) => handler.filter.table === 'promise_updates',
    );

    changedPromise.callback({
      eventType: 'UPDATE',
      new: { title: 'School repair', status: 'completed', party: 'Party' },
      old: { status: 'in_progress' },
    });
    changedUpdate.callback({ eventType: 'INSERT', new: { promise_id: 'promise-1' } });
    await jest.advanceTimersByTimeAsync(150);

    expect(notifications.notifyPromiseStatusChange).toHaveBeenCalledWith(
      'School repair',
      'completed',
      'Party',
    );
    expect(dataService.fetchPromisesForState).toHaveBeenCalledWith('TS');
    expect(dataService.fetchPromisesForState).toHaveBeenCalledTimes(1);
    expect(jest.requireMock('../stores/promises').__hydrateFromServer).toHaveBeenCalledWith([
      { id: 'promise-1' },
    ]);
    unsubscribe();
  });
});
