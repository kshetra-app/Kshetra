import { createHash } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import { feedRoutes } from '../routes/feed';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';

describe('Feed post idempotency', () => {
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

  const requestHash = createHash('sha256')
    .update(
      JSON.stringify({
        content: 'A durable post',
        type: 'discussion',
        stateCode: 'TS',
        constituencyId: null,
        parentId: null,
        language: 'en',
        hashtags: [],
        pollOptions: null,
      }),
    )
    .digest('hex');

  it('returns the original post after a retry with the same token and payload', async () => {
    const existing = {
      id: 'persisted-post',
      author_id: 'user-1',
      client_token: 'post-token-1',
      request_hash: requestHash,
      content: 'A durable post',
      type: 'discussion',
    };
    const insert = jest.fn();
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table !== 'posts') throw new Error(`Unexpected table: ${table}`);
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
      url: '/api/v1/feed/posts',
      headers: { 'x-user-id': 'user-1' },
      payload: { content: 'A durable post', stateCode: 'TS', clientToken: 'post-token-1' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ success: true, id: 'persisted-post' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('rejects reuse of a token for a different payload', async () => {
    const existing = {
      id: 'persisted-post',
      author_id: 'user-1',
      client_token: 'post-token-1',
      request_hash: requestHash,
      content: 'A durable post',
      type: 'discussion',
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
      url: '/api/v1/feed/posts',
      headers: { 'x-user-id': 'user-1' },
      payload: { content: 'Changed content', stateCode: 'TS', clientToken: 'post-token-1' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSE' });
  });
});
