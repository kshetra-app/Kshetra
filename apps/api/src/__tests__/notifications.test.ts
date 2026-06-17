import { buildApp } from '../server';

/**
 * Push-notification route tests — auth guards, token registration,
 * preferences and the public trigger catalogue.
 */
describe('Notification Routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/notifications/register-token', () => {
    it('requires authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/register-token',
        payload: { token: 'ExponentPushToken[xxx]', platform: 'android' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('registers a token for an authenticated user', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/register-token',
        headers: { 'x-user-id': 'u1' },
        payload: { token: 'ExponentPushToken[abcdefghijklmnop]', platform: 'android', deviceName: 'Pixel' },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).data.platform).toBe('android');
    });

    it('rejects an invalid platform via schema', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/register-token',
        headers: { 'x-user-id': 'u1' },
        payload: { token: 't', platform: 'windows-phone' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/notifications/send', () => {
    const payload = { userId: 'u1', trigger: 'post_reply', title: 'Hi', body: 'New reply' };

    it('requires an API key', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/v1/notifications/send', payload });
      expect(res.statusCode).toBe(401);
    });

    it('dispatches with an API key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/send',
        headers: { 'x-api-key': 'secret' },
        payload,
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).data.dispatched).toBe(true);
    });
  });

  describe('preferences', () => {
    it('GET requires authentication, returns defaults when authed', async () => {
      expect((await app.inject({ method: 'GET', url: '/api/v1/notifications/preferences' })).statusCode).toBe(401);
      const ok = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications/preferences',
        headers: { 'x-user-id': 'u1' },
      });
      expect(ok.statusCode).toBe(200);
      expect(Array.isArray(JSON.parse(ok.payload).data)).toBe(true);
    });

    it('PUT updates a preference when authed', async () => {
      expect(
        (await app.inject({ method: 'PUT', url: '/api/v1/notifications/preferences', payload: { trigger: 'post_reply', pushEnabled: false, inAppEnabled: true } })).statusCode,
      ).toBe(401);
      const ok = await app.inject({
        method: 'PUT',
        url: '/api/v1/notifications/preferences',
        headers: { 'x-user-id': 'u1' },
        payload: { trigger: 'post_reply', pushEnabled: false, inAppEnabled: true },
      });
      expect(ok.statusCode).toBe(200);
    });
  });

  it('lists trigger types publicly', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/notifications/triggers' });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(JSON.parse(res.payload).data)).toBe(true);
  });
});
