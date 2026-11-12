import Fastify, { FastifyInstance } from 'fastify';
import { shortsRoutes } from '../routes/shorts';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';
import * as contentModeration from '../services/contentModeration';

const SHORT_ID = '5bfe8c93-4df2-4cf1-9ed4-1cf58f64c095';
const USER_ID = '7bd6b9b1-aed6-43e8-aac4-a7bf6d2662cb';
const COMMENT_ID = 'a729dc90-5b88-4f09-8c53-0cf18db1eeb8';

describe('Political short comments production contract', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(shortsRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    setSupabaseConfiguredForTesting(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(true);
  });

  it('lists persisted comments and returns the exact database count', async () => {
    const parentQuery = {
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: SHORT_ID, status: 'approved' },
        error: null,
      }),
    };
    const commentsQuery = {
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: [
          {
            id: COMMENT_ID,
            author_name: 'Verified Citizen',
            text: 'The road work is now underway.',
            created_at: '2026-11-12T10:00:00.000Z',
          },
        ],
        count: 7,
        error: null,
      }),
    };

    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'political_shorts') return { select: () => parentQuery } as never;
      if (table === 'short_comments') return { select: () => commentsQuery } as never;
      return {} as never;
    }) as never);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/shorts/${SHORT_ID}/comments`,
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({
      success: true,
      shortId: SHORT_ID,
      comments: [
        {
          id: COMMENT_ID,
          authorName: 'Verified Citizen',
          text: 'The road work is now underway.',
          createdAt: '2026-11-12T10:00:00.000Z',
        },
      ],
      total: 7,
    });
    expect(commentsQuery.range).toHaveBeenCalledWith(0, 99);
  });

  it('validates pagination and requests the selected comment page', async () => {
    const parentQuery = {
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: SHORT_ID, status: 'approved' },
        error: null,
      }),
    };
    const commentsQuery = {
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], count: 126, error: null }),
    };
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'political_shorts') return { select: () => parentQuery } as never;
      if (table === 'short_comments') return { select: () => commentsQuery } as never;
      return {} as never;
    }) as never);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/shorts/${SHORT_ID}/comments?offset=50&limit=25`,
    });
    expect(response.statusCode).toBe(200);
    expect(commentsQuery.range).toHaveBeenCalledWith(50, 74);
    expect(JSON.parse(response.payload).total).toBe(126);

    const invalid = await app.inject({
      method: 'GET',
      url: `/api/v1/shorts/${SHORT_ID}/comments?offset=-1&limit=101`,
    });
    expect(invalid.statusCode).toBe(400);
  });

  it('persists authenticated comments using the existing table columns and database-generated UUID', async () => {
    jest.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    } as never);
    jest.spyOn(contentModeration, 'checkContentModeration').mockResolvedValue({
      flagged: false,
      reasons: [],
      provider: 'rule_engine',
    });

    const parentQuery = {
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: SHORT_ID, status: 'approved' },
        error: null,
      }),
    };
    const profileQuery = {
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { display_name: 'Verified Citizen' },
        error: null,
      }),
    };
    const savedComment = {
      id: COMMENT_ID,
      author_name: 'Verified Citizen',
      text: 'A clear comment',
      created_at: '2026-11-12T10:00:00.000Z',
    };
    const single = jest.fn().mockResolvedValue({ data: savedComment, error: null });
    const selectSaved = jest.fn().mockReturnValue({ single });
    let insertedValues: Record<string, unknown> | undefined;
    const insert = jest.fn((values: Record<string, unknown>) => {
      insertedValues = values;
      return { select: selectSaved };
    });

    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'political_shorts') return { select: () => parentQuery } as never;
      if (table === 'user_profiles') return { select: () => profileQuery } as never;
      if (table === 'short_comments') return { insert } as never;
      return {} as never;
    }) as never);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/shorts/${SHORT_ID}/comments`,
      headers: { authorization: 'Bearer verified-test-token' },
      payload: { content: '  A clear comment  ' },
    });

    expect(response.statusCode).toBe(201);
    expect(insertedValues).toEqual({
      short_id: SHORT_ID,
      user_id: USER_ID,
      author_name: 'Verified Citizen',
      text: 'A clear comment',
    });
    expect(insertedValues).not.toHaveProperty('id');
    expect(insertedValues).not.toHaveProperty('content');
    expect(JSON.parse(response.payload)).toEqual({
      success: true,
      id: COMMENT_ID,
      shortId: SHORT_ID,
      comment: {
        id: COMMENT_ID,
        authorName: 'Verified Citizen',
        text: 'A clear comment',
        createdAt: '2026-11-12T10:00:00.000Z',
      },
    });
    expect(contentModeration.checkContentModeration).toHaveBeenCalledWith('A clear comment');
  });
});
