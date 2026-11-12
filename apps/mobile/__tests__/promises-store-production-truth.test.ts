describe('production promise dashboard data', () => {
  let usePromiseStore: any;
  let fetchPromisesForState: jest.Mock;

  const promiseRow = (stateCode: string, id = 'promise-1') => ({
    id,
    state_code: stateCode,
    constituency_ac_no: null,
    constituency_name: null,
    party: 'Example Party',
    mla_name: null,
    title: 'Persisted commitment',
    description: 'A record returned by the configured data source.',
    category: 'welfare',
    source: 'manifesto',
    source_url: 'https://example.org/manifesto',
    promised_date: '2024-01-01',
    deadline: null,
    status: 'promised',
    delivery_percentage: 0,
    election_year: 2024,
    follow_count: 3,
    verification_count: 1,
    dispute_count: 0,
    promise_updates: [{
      id: 'update-1',
      promise_id: id,
      from_status: 'promised',
      to_status: 'in_progress',
      note: 'Recorded update',
      updated_by: 'user-1',
      updated_by_name: 'Reviewer',
      source_url: 'https://example.org/update',
      created_at: '2024-02-01T00:00:00.000Z',
    }],
  });

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../lib/environment', () => ({ IS_LIVE_ENVIRONMENT: true }));
    jest.doMock('../lib/supabaseDataService', () => ({
      fetchPromisesForState: jest.fn(),
    }));
    jest.doMock('../stores/auth', () => ({
      useAuthStore: { getState: () => ({ user: null }) },
    }));
    jest.doMock('../lib/offlineSync', () => ({ enqueue: jest.fn() }));

    usePromiseStore = require('../stores/promises').usePromiseStore;
    fetchPromisesForState = require('../lib/supabaseDataService').fetchPromisesForState;
  });

  afterEach(() => {
    jest.dontMock('../lib/environment');
    jest.dontMock('../lib/supabaseDataService');
    jest.dontMock('../stores/auth');
    jest.dontMock('../lib/offlineSync');
    jest.resetModules();
  });

  it('starts without fixtures and loads persisted promises and status history', async () => {
    fetchPromisesForState.mockResolvedValue([promiseRow('TS')]);

    expect(usePromiseStore.getState().promises).toEqual([]);
    await usePromiseStore.getState().loadForState('ts');

    expect(fetchPromisesForState).toHaveBeenCalledWith('TS');
    expect(usePromiseStore.getState()).toMatchObject({
      promiseLoadStatus: 'loaded',
      promiseLoadStateCode: 'TS',
      promises: [{
        id: 'promise-1',
        stateCode: 'TS',
        party: 'Example Party',
        status: 'promised',
        deliveryPercentage: 0,
        followCount: 3,
      }],
      updates: [{
        id: 'update-1',
        promiseId: 'promise-1',
        toStatus: 'in_progress',
        sourceUrl: 'https://example.org/update',
      }],
    });
  });

  it('treats an empty database result as a loaded empty state', async () => {
    fetchPromisesForState.mockResolvedValue([]);

    await usePromiseStore.getState().loadForState('TS');

    expect(usePromiseStore.getState()).toMatchObject({
      promises: [],
      updates: [],
      promiseLoadStatus: 'loaded',
      promiseLoadStateCode: 'TS',
    });
  });

  it('clears stale rows and reports failure when the source is unavailable', async () => {
    usePromiseStore.setState({
      promises: [{ id: 'stale', stateCode: 'TS' }],
      updates: [],
    });
    fetchPromisesForState.mockResolvedValue(null);

    await usePromiseStore.getState().loadForState('TS', true);

    expect(usePromiseStore.getState()).toMatchObject({
      promises: [],
      updates: [],
      promiseLoadStatus: 'error',
      promiseLoadStateCode: 'TS',
    });
  });

  it('does not let a slower previous state response overwrite the latest selection', async () => {
    let resolveOld!: (rows: any[]) => void;
    let resolveLatest!: (rows: any[]) => void;
    fetchPromisesForState
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveLatest = resolve; }));

    const oldRequest = usePromiseStore.getState().loadForState('TS');
    const latestRequest = usePromiseStore.getState().loadForState('KA');
    resolveLatest([promiseRow('KA', 'latest')]);
    await latestRequest;
    resolveOld([promiseRow('TS', 'old')]);
    await oldRequest;

    expect(usePromiseStore.getState()).toMatchObject({
      promiseLoadStateCode: 'KA',
      promises: [{ id: 'latest', stateCode: 'KA' }],
    });
  });

  it('preserves loaded data while a same-state background refresh is pending', async () => {
    type PromiseRow = ReturnType<typeof promiseRow>;
    fetchPromisesForState.mockResolvedValueOnce([promiseRow('TS', 'existing')]);
    await usePromiseStore.getState().loadForState('TS');

    let resolveRefresh!: (rows: PromiseRow[] | null) => void;
    fetchPromisesForState.mockImplementationOnce(
      () => new Promise((resolve) => { resolveRefresh = resolve; }),
    );
    const refresh = usePromiseStore.getState().loadForState('TS', true, true);

    expect(usePromiseStore.getState()).toMatchObject({
      promiseLoadStatus: 'loaded',
      promises: [{ id: 'existing' }],
    });
    resolveRefresh([promiseRow('TS', 'latest')]);
    await refresh;
    expect(usePromiseStore.getState().promises.map((promise: { id: string }) => promise.id)).toEqual(['latest']);
  });

  it('keeps the latest same-state refresh when realtime overlaps startup loading', async () => {
    type PromiseRow = ReturnType<typeof promiseRow>;
    let resolveStartup!: (rows: PromiseRow[] | null) => void;
    let resolveRealtime!: (rows: PromiseRow[] | null) => void;
    fetchPromisesForState
      .mockImplementationOnce(() => new Promise((resolve) => { resolveStartup = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRealtime = resolve; }));

    const startupRefresh = usePromiseStore.getState().loadForState('TS', true);
    const realtimeRefresh = usePromiseStore.getState().loadForState('TS', true);
    resolveRealtime([promiseRow('TS', 'latest')]);
    await realtimeRefresh;
    resolveStartup([promiseRow('TS', 'old')]);
    await startupRefresh;

    expect(usePromiseStore.getState()).toMatchObject({
      promiseLoadStatus: 'loaded',
      promiseLoadStateCode: 'TS',
      promises: [{ id: 'latest', stateCode: 'TS' }],
    });
  });
});
