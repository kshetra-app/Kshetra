import type { OutreachProvider, SendBroadcastInput } from '../lib/outreachTypes';

jest.mock('../lib/storage', () => ({
  mmkvStorage: {
    getItem: () => null,
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

type OutreachStore = typeof import('../stores/outreach').useOutreachStore;

describe('outreach provider environment boundary', () => {
  const originalEnvironment = {
    EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
    APP_ENV: process.env.APP_ENV,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    jest.resetModules();
  });

  function loadProvider(environment: string): OutreachProvider {
    process.env.EXPO_PUBLIC_APP_ENV = environment;
    process.env.APP_ENV = 'test';

    let provider!: OutreachProvider;
    jest.isolateModules(() => {
      provider = require('../lib/outreachProvider').getOutreachProvider();
    });
    return provider;
  }

  function loadOutreachStore(environment: string): OutreachStore {
    process.env.EXPO_PUBLIC_APP_ENV = environment;
    process.env.APP_ENV = 'test';

    let store!: OutreachStore;
    jest.isolateModules(() => {
      store = require('../stores/outreach').useOutreachStore;
    });
    return store;
  }

  const sendInput: SendBroadcastInput = {
    name: 'Boundary test',
    channel: 'sms',
    segment: { id: 'segment-1', name: 'Test segment', description: '', type: 'all', size: 1 },
    body: 'Test only',
  };

  it.each(['staging', 'production'])(
    'does not expose simulated delivery in %s',
    async (environment) => {
      const provider = loadProvider(environment);

      expect(provider.id).toBe('unavailable');
      expect(provider.isConfigured()).toBe(false);
      expect(provider.channels).toEqual([]);
      await expect(provider.send(sendInput)).rejects.toThrow(
        'consent-based audience service are connected',
      );
    },
  );

  it.each(['staging', 'production'])(
    'keeps seeded segments and delivery history out of the %s store',
    async (environment) => {
      const store = loadOutreachStore(environment);

      expect(store.getState().segments).toEqual([]);
      expect(store.getState().broadcasts).toEqual([]);
      await expect(store.getState().createBroadcast(sendInput)).rejects.toThrow(
        'Broadcast delivery is unavailable',
      );
      expect(store.getState().broadcasts).toEqual([]);
    },
  );

  it('keeps the simulated provider available for local development demos', () => {
    const provider = loadProvider('development');

    expect(provider.id).toBe('mock');
    expect(provider.isConfigured()).toBe(true);
    expect(provider.label).toContain('no messages sent');
  });
});
