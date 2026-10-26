import Fastify, { type FastifyInstance } from 'fastify';
import { moderationRoutes } from '../routes/moderation';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';

describe('Moderation route persistence and authorization decision branches', () => {
  let app: FastifyInstance;
  const originalHarness = process.env.TEST_HARNESS_ACTIVE;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_HARNESS_ACTIVE = 'true';
    setSupabaseConfiguredForTesting(true);
    app = Fastify();
    await app.register(moderationRoutes);
    await app.ready();
  });

  afterAll(async () => {
    if (originalHarness === undefined) delete process.env.TEST_HARNESS_ACTIVE;
    else process.env.TEST_HARNESS_ACTIVE = originalHarness;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    setSupabaseConfiguredForTesting(true);
    await app.close();
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.TEST_HARNESS_ACTIVE = 'true';
    setSupabaseConfiguredForTesting(true);
  });

  const query = (result: any) => {
    const q: any = {
      select: jest.fn(() => q),
      eq: jest.fn(() => q),
      order: jest.fn(() => q),
      limit: jest.fn().mockResolvedValue(result),
      update: jest.fn(() => q),
      delete: jest.fn(() => q),
      upsert: jest.fn().mockResolvedValue(result),
      insert: jest.fn().mockResolvedValue(result),
      maybeSingle: jest.fn().mockResolvedValue(result),
      single: jest.fn().mockResolvedValue(result),
      then: (resolve: (value: any) => any, reject?: (reason: any) => any) => Promise.resolve(result).then(resolve, reject),
    };
    return q;
  };

  const actor = { 'x-user-id': 'actor-1', 'x-test-role': 'moderator' };

  it('covers block self-protection, unavailable provider, and fixture-only persistence fallback', async () => {
    const self = await app.inject({ method: 'POST', url: '/api/v1/moderation/block', headers: actor, payload: { blockedUserId: 'actor-1' } });
    expect(self.statusCode).toBe(400);
    expect(self.json().code).toBe('VALIDATION_ERROR');

    setSupabaseConfiguredForTesting(false);
    const unavailable = await app.inject({ method: 'POST', url: '/api/v1/moderation/block', headers: actor, payload: { blockedUserId: 'user-2' } });
    expect(unavailable.statusCode).toBe(503);

    setSupabaseConfiguredForTesting(true);
    const reportedError = query({ error: { message: 'write rejected' } });
    jest.spyOn(supabase, 'from').mockReturnValue(reportedError as any);
    const fallback = await app.inject({ method: 'POST', url: '/api/v1/moderation/block', headers: actor, payload: { blockedUserId: 'user-2' } });
    expect(fallback.statusCode).toBe(200);
    expect(fallback.json().data).toEqual({ blockerId: 'actor-1', blockedId: 'user-2' });

    jest.spyOn(supabase, 'from').mockImplementationOnce(() => { throw new Error('provider threw'); });
    const thrown = await app.inject({ method: 'POST', url: '/api/v1/moderation/block', headers: actor, payload: { blockedUserId: 'user-3' } });
    expect(thrown.statusCode).toBe(200);
    expect(thrown.json().data.blockedId).toBe('user-3');
  });

  it('covers unblock success, persistence error, exception and unavailable provider', async () => {
    const successQuery = query({ error: null });
    jest.spyOn(supabase, 'from').mockReturnValue(successQuery as any);
    const success = await app.inject({ method: 'DELETE', url: '/api/v1/moderation/block/user-2', headers: actor });
    expect(success.statusCode).toBe(200);
    expect(success.json().data.unblocked).toBe('user-2');

    const errorQuery = query({ error: { message: 'delete rejected' } });
    jest.spyOn(supabase, 'from').mockReturnValue(errorQuery as any);
    const fallback = await app.inject({ method: 'DELETE', url: '/api/v1/moderation/block/user-3', headers: actor });
    expect(fallback.statusCode).toBe(200);
    expect(fallback.json().data.unblocked).toBe('user-3');

    jest.spyOn(supabase, 'from').mockImplementationOnce(() => { throw new Error('delete transport failed'); });
    const thrown = await app.inject({ method: 'DELETE', url: '/api/v1/moderation/block/user-4', headers: actor });
    expect(thrown.statusCode).toBe(200);
    expect(thrown.json().data.unblocked).toBe('user-4');

    setSupabaseConfiguredForTesting(false);
    const unavailable = await app.inject({ method: 'DELETE', url: '/api/v1/moderation/block/user-5', headers: actor });
    expect(unavailable.statusCode).toBe(503);
  });

  it('covers report anonymous/authenticated identity, both content types, and persistence failures', async () => {
    const successQuery = query({ error: null });
    jest.spyOn(supabase, 'from').mockReturnValue(successQuery as any);
    const anonymous = await app.inject({
      method: 'POST', url: '/api/v1/moderation/report',
      payload: { contentId: 'post-1', contentType: 'post', reason: 'misinformation' },
    });
    expect(anonymous.statusCode).toBe(201);
    expect(successQuery.insert).toHaveBeenCalledWith(expect.objectContaining({ reporter_id: 'anonymous', post_id: 'post-1', comment_id: null }));

    const commentQuery = query({ error: null });
    jest.spyOn(supabase, 'from').mockReturnValue(commentQuery as any);
    const authenticated = await app.inject({
      method: 'POST', url: '/api/v1/moderation/report', headers: { 'x-user-id': 'actor-1' },
      payload: { reporterId: 'actor-1', contentId: 'comment-1', contentType: 'comment', reason: 'abuse', description: '' },
    });
    expect(authenticated.statusCode).toBe(201);
    expect(commentQuery.insert).toHaveBeenCalledWith(expect.objectContaining({ reporter_id: 'actor-1', post_id: null, comment_id: 'comment-1', description: null }));

    const spoofed = await app.inject({
      method: 'POST', url: '/api/v1/moderation/report', headers: { 'x-user-id': 'actor-1' },
      payload: { reporterId: 'actor-2', contentId: 'post-1', contentType: 'post', reason: 'spam' },
    });
    expect(spoofed.statusCode).toBe(403);

    const errorQuery = query({ error: { message: 'insert rejected' } });
    jest.spyOn(supabase, 'from').mockReturnValue(errorQuery as any);
    const error = await app.inject({
      method: 'POST', url: '/api/v1/moderation/report',
      payload: { contentId: 'post-2', contentType: 'post', reason: 'spam' },
    });
    expect(error.statusCode).toBe(500);
    expect(error.json().code).toBe('DATABASE_ERROR');

    jest.spyOn(supabase, 'from').mockImplementationOnce(() => { throw new Error('insert transport failed'); });
    const thrown = await app.inject({
      method: 'POST', url: '/api/v1/moderation/report',
      payload: { contentId: 'post-3', contentType: 'post', reason: 'spam' },
    });
    expect(thrown.statusCode).toBe(500);

    setSupabaseConfiguredForTesting(false);
    const unavailable = await app.inject({
      method: 'POST', url: '/api/v1/moderation/report',
      payload: { contentId: 'post-4', contentType: 'post', reason: 'spam' },
    });
    expect(unavailable.statusCode).toBe(503);
  });

  it('covers moderation queue database empty, populated, error and exception outcomes', async () => {
    const emptyQuery = query({ data: [], error: null });
    jest.spyOn(supabase, 'from').mockReturnValue(emptyQuery as any);
    const empty = await app.inject({ method: 'GET', url: '/api/v1/moderation/queue', headers: actor });
    expect(empty.statusCode).toBe(200);
    expect(empty.json().data).toMatchObject({ queue: [], totalPending: 0 });
    expect(empty.json().data.message).toBeUndefined();

    const rows = [{ id: 'r-1' }, { id: 'r-2' }];
    const populatedQuery = query({ data: rows, error: null });
    jest.spyOn(supabase, 'from').mockReturnValue(populatedQuery as any);
    const populated = await app.inject({ method: 'GET', url: '/api/v1/moderation/queue', headers: actor });
    expect(populated.statusCode).toBe(200);
    expect(populated.json().data).toMatchObject({ queue: rows, totalPending: 2 });

    const failedQuery = query({ data: null, error: { message: 'read rejected' } });
    jest.spyOn(supabase, 'from').mockReturnValue(failedQuery as any);
    const fallback = await app.inject({ method: 'GET', url: '/api/v1/moderation/queue', headers: actor });
    expect(fallback.statusCode).toBe(200);
    expect(fallback.json().data.message).toContain('test fixtures');

    jest.spyOn(supabase, 'from').mockImplementationOnce(() => { throw new Error('read transport failed'); });
    const thrown = await app.inject({ method: 'GET', url: '/api/v1/moderation/queue', headers: actor });
    expect(thrown.statusCode).toBe(200);
    expect(thrown.json().data.message).toContain('test fixtures');

    setSupabaseConfiguredForTesting(false);
    const fixtureOnly = await app.inject({ method: 'GET', url: '/api/v1/moderation/queue', headers: actor });
    expect(fixtureOnly.statusCode).toBe(200);
    expect(fixtureOnly.json().data.message).toContain('test fixtures');
  });

  it('covers verification request success, fixture fallbacks, and provider unavailable', async () => {
    const successQuery = query({
      data: { id: 'verification-1', verification_type: 'journalist', status: 'pending', created_at: '2026-01-01T00:00:00.000Z' },
      error: null,
    });
    jest.spyOn(supabase, 'from').mockReturnValue(successQuery as any);
    const success = await app.inject({
      method: 'POST', url: '/api/v1/moderation/verify-request', headers: actor,
      payload: { verificationType: 'journalist', documentUrl: '', notes: '' },
    });
    expect(success.statusCode).toBe(200);
    expect(success.json().data).toMatchObject({ id: 'verification-1', verificationType: 'journalist', status: 'pending' });
    expect(successQuery.upsert).toHaveBeenCalledWith(expect.objectContaining({ document_url: null, notes: null }), { onConflict: 'user_id,verification_type' });

    const errorQuery = query({ data: null, error: { message: 'write rejected' } });
    jest.spyOn(supabase, 'from').mockReturnValue(errorQuery as any);
    const fallback = await app.inject({
      method: 'POST', url: '/api/v1/moderation/verify-request', headers: actor,
      payload: { verificationType: 'identity' },
    });
    expect(fallback.statusCode).toBe(200);
    expect(fallback.json().data.id).toBe('vr-mock-1');

    jest.spyOn(supabase, 'from').mockImplementationOnce(() => { throw new Error('provider threw'); });
    const thrown = await app.inject({
      method: 'POST', url: '/api/v1/moderation/verify-request', headers: actor,
      payload: { verificationType: 'organization' },
    });
    expect(thrown.statusCode).toBe(200);
    expect(thrown.json().data.id).toBe('vr-mock-1');

    setSupabaseConfiguredForTesting(false);
    const unavailable = await app.inject({
      method: 'POST', url: '/api/v1/moderation/verify-request', headers: actor,
      payload: { verificationType: 'identity' },
    });
    expect(unavailable.statusCode).toBe(503);
  });

  it('covers public action catalog, reputation signs, and admin-only audit access', async () => {
    const actions = await app.inject({ method: 'GET', url: '/api/v1/moderation/actions' });
    expect(actions.statusCode).toBe(200);
    expect(actions.json().data.some((x: any) => x.action === 'ban' && x.requiresReason)).toBe(true);

    const rules = await app.inject({ method: 'GET', url: '/api/v1/moderation/reputation-rules' });
    expect(rules.statusCode).toBe(200);
    expect(rules.json().data.some((x: any) => x.action === 'account_verified' && x.effect === 'positive')).toBe(true);
    expect(rules.json().data.some((x: any) => x.action === 'received_warning' && x.effect === 'negative')).toBe(true);

    const denied = await app.inject({ method: 'GET', url: '/api/v1/moderation/audit-log', headers: actor });
    expect(denied.statusCode).toBe(403);
    const allowed = await app.inject({
      method: 'GET', url: '/api/v1/moderation/audit-log?limit=10&offset=5&entityType=post',
      headers: { 'x-user-id': 'admin-1', 'x-test-role': 'admin' },
    });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json().data).toMatchObject({ entries: [], total: 0 });
  });
});
