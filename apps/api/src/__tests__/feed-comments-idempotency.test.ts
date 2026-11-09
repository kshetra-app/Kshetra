import Fastify, { type FastifyInstance } from 'fastify';
import { feedRoutes } from '../routes/feed';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';

describe('Feed comment idempotency', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(feedRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(true);
  });

  it('returns the original comment when the same author retries the same token', async () => {
    const existing = {
      id: 'persisted-comment',
      post_id: 'post-1',
      author_id: 'user-1',
      client_token: 'comment-token-1',
      content: 'A durable comment',
      language: 'en',
    };
    const insert = jest.fn();
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table !== 'comments') throw new Error(`Unexpected table: ${table}`);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: existing, error: null }) }),
          }),
        }),
        insert,
      } as any;
    }) as any);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/feed/posts/post-1/comments',
      headers: { 'x-user-id': 'user-1' },
      payload: { content: 'A durable comment', language: 'en', clientToken: 'comment-token-1' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ success: true, id: 'persisted-comment' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('rejects reuse of a token for different comment content', async () => {
    const existing = {
      id: 'persisted-comment',
      post_id: 'post-1',
      author_id: 'user-1',
      client_token: 'comment-token-1',
      content: 'Original content',
      language: 'en',
    };
    jest.spyOn(supabase, 'from').mockImplementation((() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: existing, error: null }) }),
        }),
      }),
    })) as any);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/feed/posts/post-1/comments',
      headers: { 'x-user-id': 'user-1' },
      payload: { content: 'Changed content', language: 'en', clientToken: 'comment-token-1' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSE' });
  });
});
