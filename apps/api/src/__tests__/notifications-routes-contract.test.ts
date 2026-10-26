import Fastify, { type FastifyInstance } from 'fastify';
import { notificationRoutes } from '../routes/notifications';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';

describe('Notification route contract and persistence paths', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(true);
    app = Fastify();
    await app.register(notificationRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    setSupabaseConfiguredForTesting(true);
  });

  function query(result: any) {
    const chain: any = {
      update: jest.fn(() => chain),
      eq: jest.fn(() => chain),
      then: (resolve: (value: any) => any) => Promise.resolve(result).then(resolve),
    };
    return chain;
  }

  it('registers only a token prefix and never returns the full token', async () => {
    const token = '12345678901234567890-SENSITIVE-TAIL';
    const response = await app.inject({
      method: 'POST', url: '/api/v1/notifications/register-token',
      headers: { 'x-user-id': 'user-1' },
      payload: { token, platform: 'android' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.token).toBe('12345678901234567890...');
    expect(response.payload).not.toContain('SENSITIVE-TAIL');
  });

  it('rejects token registration without identity', async () => {
    const response = await app.inject({
      method: 'POST', url: '/api/v1/notifications/register-token',
      payload: { token: 'device-token', platform: 'web' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('requires an API key for internal notification dispatch', async () => {
    const response = await app.inject({
      method: 'POST', url: '/api/v1/notifications/send',
      payload: { userId: 'user-1', trigger: 'civic_update', title: 'Update', body: 'Details' },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('UNAUTHORIZED');
  });

  it('dispatches a validated internal notification with an API key', async () => {
    const response = await app.inject({
      method: 'POST', url: '/api/v1/notifications/send',
      headers: { 'x-api-key': 'internal-test-key' },
      payload: { userId: 'user-1', trigger: 'civic_update', title: 'Update', body: 'Details' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ success: true, data: { userId: 'user-1', trigger: 'civic_update', dispatched: true } });
  });

  it('returns configured default preferences and rejects missing identity', async () => {
    const denied = await app.inject({ method: 'GET', url: '/api/v1/notifications/preferences' });
    expect(denied.statusCode).toBe(401);
    const allowed = await app.inject({
      method: 'GET', url: '/api/v1/notifications/preferences',
      headers: { 'x-user-id': 'user-1' },
    });
    expect(allowed.statusCode).toBe(200);
    expect(Array.isArray(allowed.json().data)).toBe(true);
    expect(allowed.json().data.length).toBeGreaterThan(0);
  });

  it('updates preference flags for an identified user', async () => {
    const response = await app.inject({
      method: 'PUT', url: '/api/v1/notifications/preferences',
      headers: { 'x-user-id': 'user-1' },
      payload: { trigger: 'civic_update', pushEnabled: false, inAppEnabled: true },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({ trigger: 'civic_update', pushEnabled: false, inAppEnabled: true });
  });

  it('lists available triggers publicly', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/notifications/triggers' });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.length).toBeGreaterThan(0);
    expect(response.json().data[0]).toHaveProperty('trigger');
  });

  it('marks one notification as read with an authenticated fixture identity', async () => {
    const chain = query({ error: null });
    const from = jest.spyOn(supabase, 'from').mockReturnValue(chain as any);
    const response = await app.inject({
      method: 'PATCH', url: '/api/v1/notifications/read',
      headers: { 'x-user-id': 'user-1' },
      payload: { notificationId: 'notification-1' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({ userId: 'user-1', notificationId: 'notification-1', markedAll: false });
    expect(from).toHaveBeenCalledWith('notifications');
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(chain.eq).toHaveBeenCalledWith('id', 'notification-1');
  });

  it('fails closed when marking notifications read while the database is unconfigured', async () => {
    setSupabaseConfiguredForTesting(false);
    const response = await app.inject({
      method: 'PATCH', url: '/api/v1/notifications/read',
      headers: { 'x-user-id': 'user-1' },
      payload: { all: true },
    });
    expect(response.statusCode).toBe(503);
    expect(response.json().code).toBe('SERVICE_UNAVAILABLE');
  });

  it('returns a persistence error when marking notifications read fails', async () => {
    jest.spyOn(supabase, 'from').mockReturnValue(query({ error: { message: 'write failed' } }) as any);
    const response = await app.inject({
      method: 'PATCH', url: '/api/v1/notifications/read',
      headers: { 'x-user-id': 'user-1' },
      payload: { all: true },
    });
    expect(response.statusCode).toBe(500);
    expect(response.json().code).toBe('DATABASE_ERROR');
  });
});
