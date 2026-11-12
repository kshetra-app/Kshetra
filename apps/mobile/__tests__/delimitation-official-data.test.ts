jest.mock('../lib/api', () => ({
  apiClient: {
    delimitation: {
      getTimeline: jest.fn(),
      getStatus: jest.fn(),
    },
  },
}));

describe('delimitation official data wiring', () => {
  const previousEnvironment = process.env.EXPO_PUBLIC_APP_ENV;

  afterEach(() => {
    if (previousEnvironment === undefined) delete process.env.EXPO_PUBLIC_APP_ENV;
    else process.env.EXPO_PUBLIC_APP_ENV = previousEnvironment;
    jest.resetModules();
    jest.clearAllMocks();
  });

  function loadProductionStore() {
    process.env.EXPO_PUBLIC_APP_ENV = 'production';
    let store!: typeof import('../stores/delimitation').useDelimitationStore;
    let timeline!: jest.Mock;
    let status!: jest.Mock;

    jest.isolateModules(() => {
      store = require('../stores/delimitation').useDelimitationStore;
      const { apiClient } = require('../lib/api');
      timeline = apiClient.delimitation.getTimeline;
      status = apiClient.delimitation.getStatus;
    });

    return { store, timeline, status };
  }

  const timelinePayload = {
    status: 'census_underway',
    totalEvents: 1,
    verifiedEvents: 1,
    latestEvent: {
      title: 'Census 2027 notified',
      date: '2025-06-16',
      type: 'census_notification',
      verified: true,
      source: 'Office of the Registrar General & Census Commissioner, India',
    },
    events: [
      {
        id: 'census-notification',
        date: '2025-06-16',
        title: 'Census of India 2027 notified',
        significance: 'critical' as const,
        verified: true,
        category: 'census_notification' as const,
        sourceUrl: 'https://censusindia.gov.in/census.website/en',
        instrument: 'Census notification',
        authority: 'Office of the Registrar General & Census Commissioner, India',
        description: 'Census 2027 was notified.',
      },
    ],
    provenance: {} as never,
  };

  const statusPayload = {
    nationalStatus: 'census_underway',
    statusLabel: 'Census 2027 operations',
    description: 'Operations are proceeding in phases.',
    constitutionalFramework: 'Constitution of India',
    nextMilestone: 'Official Census updates',
    censusTracking: {
      constitutionalTrigger: 'First census taken after 2026',
      currentExpectedCensusOperation: 'Census of India 2027',
      finalPopulationAvailable: false,
    },
    lastUpdated: '2026-11-12T00:00:00.000Z',
    provenance: {} as never,
  };

  it('does not start with embedded timeline claims in production', () => {
    const { store } = loadProductionStore();
    const state = store.getState();

    expect(state.events).toEqual([]);
    expect(state.timelineAvailable).toBe(false);
    expect(state.nationalStatus).toBeNull();
    expect(state.statusAvailable).toBe(false);
  });

  it('loads the canonical timeline and status from the API', async () => {
    const { store, timeline, status } = loadProductionStore();
    timeline.mockResolvedValue(timelinePayload);
    status.mockResolvedValue(statusPayload);

    await store.getState().refreshOfficialData();

    const state = store.getState();
    expect(state.timelineAvailable).toBe(true);
    expect(state.statusAvailable).toBe(true);
    expect(state.events).toEqual([
      expect.objectContaining({
        id: 'census-notification',
        eventType: 'census_notification',
        source: 'census_india',
        isVerified: true,
        sourceUrl: 'https://censusindia.gov.in/census.website/en',
      }),
    ]);
    expect(state.nationalStatus).toBe('census_underway');
    expect(state.statusLabel).toBe('Census 2027 operations');
  });

  it('leaves data unavailable when the API calls fail', async () => {
    const { store, timeline, status } = loadProductionStore();
    timeline.mockRejectedValue(new Error('API unavailable'));
    status.mockRejectedValue(new Error('API unavailable'));

    await store.getState().refreshOfficialData();

    const state = store.getState();
    expect(state.events).toEqual([]);
    expect(state.timelineAvailable).toBe(false);
    expect(state.nationalStatus).toBeNull();
    expect(state.statusAvailable).toBe(false);
    expect(state.isLoadingEvents).toBe(false);
  });
});
