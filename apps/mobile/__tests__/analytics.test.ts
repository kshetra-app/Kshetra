jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '0.1.0' } },
}));

jest.mock('../lib/storage', () => ({
  mmkvStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

jest.mock('../lib/api/authManager', () => ({
  authManager: { getAccessToken: jest.fn() },
}));

import type { ApiClient } from '../lib/api/client';
import { startProductAnalyticsSession, trackProductEvent } from '../lib/analytics';
import { authManager } from '../lib/api/authManager';
import { mmkvStorage } from '../lib/storage';

describe('mobile product analytics', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const mutableEnv = process.env as unknown as Record<string, string | undefined>;
  let storedAnonymousId: string | null;

  beforeEach(() => {
    mutableEnv.NODE_ENV = 'development';
    storedAnonymousId = null;
    jest.clearAllMocks();
    (authManager.getAccessToken as jest.Mock).mockResolvedValue('verified-session-token');
    (mmkvStorage.getItem as jest.Mock).mockImplementation(async () => storedAnonymousId);
    (mmkvStorage.setItem as jest.Mock).mockImplementation(async (_key: string, value: string) => {
      storedAnonymousId = value;
    });
  });

  afterAll(() => {
    if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV;
    else mutableEnv.NODE_ENV = originalNodeEnv;
  });

  it('sends anonymous event IDs and a bearer token without blocking on telemetry errors', async () => {
    const request = jest.fn().mockResolvedValue({});
    const client = { request } as unknown as ApiClient;

    await trackProductEvent(client, 'issue_created', {
      screen: '/civic/issues/create',
      constituencyId: 'TS-AC-61',
      entityType: 'civic_issue',
      entityId: 'issue-1',
    });

    expect(request).toHaveBeenCalledTimes(1);
    const [path, options] = request.mock.calls[0];
    expect(path).toBe('/api/v1/analytics/events');
    expect(options.authPolicy).toBe('public');
    expect(options.headers.Authorization).toBe('Bearer verified-session-token');
    expect(options.body.events[0]).toMatchObject({
      eventName: 'issue_created',
      screen: '/civic/issues/create',
      appVersion: '0.1.0',
      geography: { acId: 'TS-AC-61' },
      entity: { entityType: 'civic_issue', entityId: 'issue-1' },
    });
    expect(options.body.events[0].userId).toBeUndefined();

    request.mockRejectedValueOnce(new Error('offline'));
    await expect(
      trackProductEvent(client, 'issue_upvoted', { screen: '/civic/issue' }),
    ).resolves.toBeUndefined();
  });

  it('uses a fresh session ID after the authenticated app session changes', async () => {
    const request = jest.fn().mockResolvedValue({});
    const client = { request } as unknown as ApiClient;

    startProductAnalyticsSession();
    await trackProductEvent(client, 'app_session_started', { screen: '/auth/sign-in' });
    const firstSessionId = request.mock.calls[0][1].body.events[0].sessionId;

    startProductAnalyticsSession();
    await trackProductEvent(client, 'app_session_started', { screen: '/auth/sign-in' });
    const secondSessionId = request.mock.calls[1][1].body.events[0].sessionId;

    expect(secondSessionId).not.toBe(firstSessionId);
  });
});
