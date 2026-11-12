describe('Political shorts data freshness and production truth', () => {
  const originalPublicEnvironment = process.env.EXPO_PUBLIC_APP_ENV;
  const originalAppEnvironment = process.env.APP_ENV;

  let persistedValue: string | null;
  let fetchShorts: jest.Mock;
  let uploadShort: jest.Mock;
  let usePoliticalShortsStore: any;

  const setEnvironment = (environment: 'production' | 'test') => {
    if (environment === 'production') {
      process.env.EXPO_PUBLIC_APP_ENV = 'production';
      process.env.APP_ENV = 'test';
      return;
    }

    delete process.env.EXPO_PUBLIC_APP_ENV;
    process.env.APP_ENV = 'test';
  };

  const loadStore = () => {
    jest.resetModules();
    const storage = {
      getItem: jest.fn(async () => persistedValue),
      setItem: jest.fn(async () => undefined),
      removeItem: jest.fn(async () => undefined),
    };
    fetchShorts = jest.fn();
    uploadShort = jest.fn();

    jest.doMock('../lib/storage', () => ({ mmkvStorage: storage }));
    jest.doMock('../lib/supabaseDataService', () => ({
      fetchShorts,
      incrementShortView: jest.fn(),
      uploadShort,
      approveShort: jest.fn(),
      flagShort: jest.fn(),
    }));
    jest.doMock('../lib/offlineSync', () => ({ enqueue: jest.fn() }));

    ({ usePoliticalShortsStore } = require('../stores/politicalShorts'));
    return usePoliticalShortsStore;
  };

  afterAll(() => {
    if (originalPublicEnvironment === undefined) delete process.env.EXPO_PUBLIC_APP_ENV;
    else process.env.EXPO_PUBLIC_APP_ENV = originalPublicEnvironment;

    if (originalAppEnvironment === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = originalAppEnvironment;

  });

  beforeEach(() => {
    persistedValue = null;
    setEnvironment('production');
  });

  it('starts empty in production and filters bundled fixture content from persisted state', async () => {
    persistedValue = JSON.stringify({
      state: {
        shorts: [{ id: 'short-ts-001' }, { id: 'remote-short-1' }],
        userApprovals: {},
        flaggedShorts: {},
      },
      version: 3,
    });

    const store = loadStore();
    await store.persist.rehydrate();

    expect(store.getState().shorts).toEqual([{ id: 'remote-short-1' }]);
  });

  it('replaces stale cached items when the server successfully returns an empty list', async () => {
    const store = loadStore();
    store.setState({ shorts: [{ id: 'stale-short' }] });
    fetchShorts.mockResolvedValueOnce([]);

    await store.getState().hydrateShorts('TS');

    expect(store.getState().shorts).toEqual([]);
  });

  it('retains the last server-backed cache when the server request fails', async () => {
    const store = loadStore();
    store.setState({ shorts: [{ id: 'cached-server-short' }] });
    fetchShorts.mockResolvedValueOnce(null);

    await store.getState().hydrateShorts('TS');

    expect(store.getState().shorts).toEqual([{ id: 'cached-server-short' }]);
  });

  it('adds a server-confirmed short to the cache without submitting it a second time', async () => {
    const store = loadStore();
    const uploadedShort = {
      id: '5bfe8c93-4df2-4cf1-9ed4-1cf58f64c095',
      title: 'A real submitted short',
      description: 'Persisted before entering the local cache.',
      channelName: 'Verified creator',
      channelVerified: true,
      stateCode: 'TS',
      stateName: 'Telangana',
      constituencyId: 'TS-AC-67',
      districtName: 'Hyderabad',
      hashtags: ['CivicUpdate'],
      duration: 45,
      videoUrl: 'https://www.youtube.com/embed/abcdefghijk',
      uploadedBy: '7bd6b9b1-aed6-43e8-aac4-a7bf6d2662cb',
      gradientColors: ['#0F2027', '#203A43'] as [string, string],
      stateAccent: '#4F8EF7',
    };

    await store.getState().addShort(uploadedShort);

    expect(uploadShort).not.toHaveBeenCalled();
    expect(store.getState().shorts[0]).toMatchObject({
      id: uploadedShort.id,
      title: uploadedShort.title,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
    });
  });

  it('keeps bundled examples available only in the isolated test/development path', () => {
    setEnvironment('test');
    const store = loadStore();

    expect(store.getState().shorts.length).toBeGreaterThan(0);
  });
});
