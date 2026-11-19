import Fastify, { FastifyInstance } from 'fastify';
import { adminRoutes } from '../routes/admin';
import { isSupabaseConfigured, setSupabaseConfiguredForTesting, supabase } from '../lib/supabase';

describe('Content publication review', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const headers = {
    'x-user-id': '22222222-2222-4222-8222-222222222222',
    'x-user-role': 'moderator',
  };
  const expectedUpdatedAt = '2026-11-19T00:00:00.123456Z';
  let app: FastifyInstance;
  const configured = isSupabaseConfigured;
  beforeAll(async () => {
    app = Fastify();
    await app.register(adminRoutes);
    await app.ready();
    setSupabaseConfiguredForTesting(true);
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app.close();
    setSupabaseConfiguredForTesting(configured);
  });

  it('requires a reviewer session', async () => {
    const from = jest.spyOn(supabase, 'from');
    const res = await app.inject({ url: '/api/v1/admin/content-submissions/post' });
    expect(res.statusCode).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it('lists the pending queue and signs only owned photo evidence', async () => {
    const file = (url: string) => ({ id, media_type: 'image', url, sort_order: 0, alt_text: null });
    const row = {
      id,
      author_id: id,
      post_media: [file(id + '/qa/image.jpg'), file('other/qa/image.jpg'), file(id + '/../x.jpg')],
    };
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [row, row], error: null }),
    };
    const from = jest.spyOn(supabase, 'from').mockReturnValue(query as never);
    const sign = jest
      .fn()
      .mockResolvedValue({ data: { signedUrl: 'https://storage.example/temporary' } });
    jest.spyOn(supabase.storage, 'from').mockReturnValue({ createSignedUrl: sign } as never);
    const res = await app.inject({
      url: '/api/v1/admin/content-submissions/post?limit=1',
      headers,
    });
    expect(res.statusCode).toBe(200);
    expect(from).toHaveBeenCalledWith('posts');
    expect(query.eq).toHaveBeenCalledWith('review_status', 'pending');
    expect(sign).toHaveBeenCalledTimes(1);
    expect(sign).toHaveBeenCalledWith(id + '/qa/image.jpg', 600);
    const page = res.json().data;
    expect(page.records).toHaveLength(1);
    expect(page.hasMore).toBe(true);
    expect(
      page.records[0].post_media.map((item: { reviewUrl: string | null }) => item.reviewUrl),
    ).toEqual(['https://storage.example/temporary', null, null]);
  });

  it.each([
    ['post', 'approved', 'approved'],
    ['short', 'rejected', 'removed'],
  ])('records a version-bound %s decision', async (kind, decision, status) => {
    const rpc = jest
      .spyOn(supabase, 'rpc')
      .mockResolvedValue({ data: [{ id, status }], error: null } as never);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/content-submissions/${kind}/${id}/review`,
      headers,
      payload: { decision, expectedUpdatedAt },
    });
    expect(res.statusCode).toBe(200);
    expect(rpc).toHaveBeenCalledWith(`review_creator_${kind}`, {
      p_record_id: id,
      p_reviewer_user_id: headers['x-user-id'],
      p_decision: decision,
      p_expected_updated_at: expectedUpdatedAt,
    });
  });
  it.each([
    ['42501', 403],
    ['P0002', 409],
  ])('surfaces database guard %s', async (code, status) => {
    jest.spyOn(supabase, 'rpc').mockResolvedValue({ error: { code } } as never);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/content-submissions/post/${id}/review`,
      headers,
      payload: { decision: 'approved', expectedUpdatedAt },
    });
    expect(res.statusCode).toBe(status);
  });
});
