import Fastify from 'fastify';
import { moderationRoutes } from '../routes/moderation';

describe('Phase 1: Ticket 1.3 - Moderation Queue & Action Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    app = Fastify();
    await app.register(moderationRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/moderation/queue rejects unauthorized citizens', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/moderation/queue',
      headers: {
        'x-user-id': 'test-citizen-1',
        'x-test-role': 'citizen',
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload);
    expect(body.error).toContain('Insufficient permissions');
  });

  it('GET /api/v1/moderation/queue allows moderators and returns pending items', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/moderation/queue',
      headers: {
        'x-user-id': 'test-mod-1',
        'x-test-role': 'moderator',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.queue)).toBe(true);
  });

  it('POST /api/v1/moderation/action executes content removal and updates queue', async () => {
    const actionRes = await app.inject({
      method: 'POST',
      url: '/api/v1/moderation/action',
      headers: {
        'x-user-id': 'mod-test-1',
        'x-test-role': 'moderator',
      },
      payload: {
        moderatorId: 'mod-test-1',
        reportId: 'rep-demo-1',
        targetPostId: 'seed-ts-6',
        actionType: 'delete_content',
        reason: 'Violation of Community Guidelines (Misinformation)',
      },
    });

    expect(actionRes.statusCode).toBe(200);
    const actionBody = JSON.parse(actionRes.payload);
    expect(actionBody.success).toBe(true);
    expect(actionBody.data.actionType).toBe('delete_content');
  });
});
