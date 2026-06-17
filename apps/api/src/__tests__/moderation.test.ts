import { buildApp } from '../server';

/**
 * Trust & Safety route tests — exercises role-based authorization,
 * content flagging and the public config endpoints.
 */
describe('Moderation Routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/moderation/action', () => {
    const body = { moderatorId: 'm1', actionType: 'warn', reason: 'spam' };

    it('rejects non-moderators (403)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/action',
        headers: { 'x-user-role': 'citizen' },
        payload: body,
      });
      expect(res.statusCode).toBe(403);
    });

    it('allows an admin to warn (200)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/action',
        headers: { 'x-user-role': 'admin' },
        payload: body,
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).success).toBe(true);
    });

    it('forbids a moderator from banning (403)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/action',
        headers: { 'x-user-role': 'moderator' },
        payload: { moderatorId: 'm1', actionType: 'ban', reason: 'x' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('POST /api/v1/moderation/check-content', () => {
    it('flags violent content', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/check-content',
        payload: { content: 'I will attack you' },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).data.flagged).toBe(true);
    });

    it('passes clean content', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/check-content',
        payload: { content: 'The election results were announced today.' },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).data.flagged).toBe(false);
    });
  });

  describe('authorization guards', () => {
    it('queue requires moderator', async () => {
      expect((await app.inject({ method: 'GET', url: '/api/v1/moderation/queue' })).statusCode).toBe(403);
      const ok = await app.inject({
        method: 'GET',
        url: '/api/v1/moderation/queue',
        headers: { 'x-user-role': 'moderator' },
      });
      expect(ok.statusCode).toBe(200);
    });

    it('audit-log requires admin', async () => {
      expect(
        (await app.inject({ method: 'GET', url: '/api/v1/moderation/audit-log', headers: { 'x-user-role': 'moderator' } })).statusCode,
      ).toBe(403);
      expect(
        (await app.inject({ method: 'GET', url: '/api/v1/moderation/audit-log', headers: { 'x-user-role': 'admin' } })).statusCode,
      ).toBe(200);
    });

    it('verify-request and block require authentication', async () => {
      expect((await app.inject({ method: 'POST', url: '/api/v1/moderation/verify-request', payload: { verificationType: 'identity' } })).statusCode).toBe(401);
      expect((await app.inject({ method: 'POST', url: '/api/v1/moderation/block', payload: { blockedUserId: 'u2' } })).statusCode).toBe(401);
    });

    it('blocks another user but not oneself', async () => {
      const self = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/block',
        headers: { 'x-user-id': 'u1' },
        payload: { blockedUserId: 'u1' },
      });
      expect(self.statusCode).toBe(400);

      const other = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/block',
        headers: { 'x-user-id': 'u1' },
        payload: { blockedUserId: 'u2' },
      });
      expect(other.statusCode).toBe(200);
    });

    it('unblock requires authentication', async () => {
      expect((await app.inject({ method: 'DELETE', url: '/api/v1/moderation/block/u2' })).statusCode).toBe(401);
      const ok = await app.inject({
        method: 'DELETE',
        url: '/api/v1/moderation/block/u2',
        headers: { 'x-user-id': 'u1' },
      });
      expect(ok.statusCode).toBe(200);
    });

    it('verify-request succeeds when authenticated', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/verify-request',
        headers: { 'x-user-id': 'u1' },
        payload: { verificationType: 'journalist' },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('public config endpoints', () => {
    it('lists actions and reputation rules', async () => {
      expect((await app.inject({ method: 'GET', url: '/api/v1/moderation/actions' })).statusCode).toBe(200);
      expect((await app.inject({ method: 'GET', url: '/api/v1/moderation/reputation-rules' })).statusCode).toBe(200);
    });
  });
});
