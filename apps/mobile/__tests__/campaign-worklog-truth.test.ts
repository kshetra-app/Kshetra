import type { Campaign } from '../lib/campaignTypes';

jest.mock('../lib/api', () => ({
  apiClient: {
    request: jest.fn(),
  },
}));

describe('campaign work-log metric truthfulness', () => {
  const previousEnvironment = process.env.EXPO_PUBLIC_APP_ENV;

  afterEach(() => {
    if (previousEnvironment === undefined) delete process.env.EXPO_PUBLIC_APP_ENV;
    else process.env.EXPO_PUBLIC_APP_ENV = previousEnvironment;
    jest.resetModules();
    jest.clearAllMocks();
  });

  function loadProductionStore() {
    process.env.EXPO_PUBLIC_APP_ENV = 'production';
    let store!: typeof import('../stores/campaign').useCampaignStore;
    let request!: jest.Mock;
    jest.isolateModules(() => {
      store = require('../stores/campaign').useCampaignStore;
      request = require('../lib/api').apiClient.request;
    });
    return { store, request };
  }

  const volunteerRow = {
    id: 'volunteer-1',
    campaign_id: 'campaign-1',
    name: 'Campaign worker',
    phone: '9000000000',
    role: 'canvasser',
    status: 'active',
    tasks_completed: 42,
    hours_logged: 17,
    rating: 4.9,
  };

  it('withholds legacy counters unless the API confirms work-log metrics are available', async () => {
    const { store, request } = loadProductionStore();
    request.mockResolvedValue({ data: { volunteers: [volunteerRow] } });
    store.setState({ selectedCampaignId: 'campaign-1' });

    await store.getState().fetchVolunteers('campaign-1');

    const state = store.getState();
    expect(state.volunteersAvailable).toBe(true);
    expect(state.volunteerWorkLogsAvailable).toBe(false);
    expect(state.volunteers[0]).toEqual(expect.objectContaining({
      tasksCompleted: null,
      hoursLogged: null,
      rating: null,
    }));
  });

  it('accepts metrics when the API explicitly identifies their persisted source', async () => {
    const { store, request } = loadProductionStore();
    request.mockResolvedValue({
      data: {
        volunteers: [volunteerRow],
        workLogMetricsAvailable: true,
        volunteerRatingsAvailable: true,
      },
    });
    store.setState({ selectedCampaignId: 'campaign-1' });

    await store.getState().fetchVolunteers('campaign-1');

    const state = store.getState();
    expect(state.volunteerWorkLogsAvailable).toBe(true);
    expect(state.volunteers[0]).toEqual(expect.objectContaining({
      tasksCompleted: 42,
      hoursLogged: 17,
      rating: 4.9,
    }));
  });

  it('keeps invalid persisted durations unknown instead of reporting zero hours', async () => {
    const { store, request } = loadProductionStore();
    request.mockResolvedValue({
      data: {
        volunteers: [
          { ...volunteerRow, hours_logged: null },
          { ...volunteerRow, id: 'volunteer-2', hours_logged: 1.5 },
        ],
        workLogMetricsAvailable: true,
        volunteerRatingsAvailable: false,
      },
    });
    store.setState({
      selectedCampaignId: 'campaign-1',
      campaigns: [{ id: 'campaign-1' } as unknown as Campaign],
    });

    await store.getState().fetchVolunteers('campaign-1');

    const state = store.getState();
    expect(state.volunteers[0].hoursLogged).toBeNull();
    expect(state.volunteers[1].hoursLogged).toBe(1.5);
    expect(state.getCampaignAnalytics('campaign-1').volunteerMetrics?.totalHours).toBeNull();
  });

  it('keeps zero hours distinct from unavailable hours when the roster is empty', () => {
    const { store } = loadProductionStore();
    store.setState({
      campaigns: [{ id: 'campaign-1' } as unknown as Campaign],
      volunteers: [],
      volunteersAvailable: true,
      volunteerWorkLogsAvailable: false,
    });

    expect(store.getState().getCampaignAnalytics('campaign-1').volunteerMetrics?.totalHours).toBeNull();

    store.setState({ volunteerWorkLogsAvailable: true });
    expect(store.getState().getCampaignAnalytics('campaign-1').volunteerMetrics?.totalHours).toBe(0);
  });
});
