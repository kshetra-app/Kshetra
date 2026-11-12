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

  it('writes a verified creator short once using the canonical database columns and authenticated owner', async () => {
    jest.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    } as never);

    const verificationQuery = {
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { status: 'verified' }, error: null }),
    };
    const profileQuery = {
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { display_name: 'Public Creator' },
        error: null,
      }),
    };
    const savedShort = {
      id: SHORT_ID,
      title: 'A real civic update',
      video_url: 'https://www.youtube.com/embed/abcdefghijk',
      channel_name: 'Public Creator',
      channel_verified: true,
      state_code: 'TS',
      uploaded_by: USER_ID,
    };
    const single = jest.fn().mockResolvedValue({ data: savedShort, error: null });
    const selectSaved = jest.fn().mockReturnValue({ single });
    let insertedValues: Record<string, unknown> | undefined;
    const insert = jest.fn((values: Record<string, unknown>) => {
      insertedValues = values;
      return { select: selectSaved };
    });

    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'creator_kyc_records') return { select: () => verificationQuery } as never;
      if (table === 'user_profiles') return { select: () => profileQuery } as never;
      if (table === 'political_shorts') return { insert } as never;
      return {} as never;
    }) as never);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/shorts',
      headers: { authorization: 'Bearer verified-test-token' },
      payload: {
        title: '  A real civic update  ',
        videoUrl: 'https://www.youtube.com/embed/abcdefghijk',
        description: 'Persisted description',
        stateCode: 'ts',
        stateName: 'Telangana',
        constituencyId: 'TS-AC-67',
        districtName: 'Hyderabad',
        durationSeconds: 45,
        hashtags: ['CivicUpdate'],
        gradientColors: ['#0F2027', '#203A43'],
        stateAccent: '#4F8EF7',
        authorId: '00000000-0000-4000-8000-000000000001',
        uploadedBy: '00000000-0000-4000-8000-000000000001',
        channelName: 'Private legal name supplied by client',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insertedValues).toEqual({
      title: 'A real civic update',
      video_url: 'https://www.youtube.com/embed/abcdefghijk',
      thumbnail_url: null,
      description: 'Persisted description',
      channel_name: 'Public Creator',
      channel_verified: true,
      state_code: 'TS',
      state_name: 'Telangana',
      constituency_id: 'TS-AC-67',
      district_name: 'Hyderabad',
      duration: 45,
      hashtags: ['CivicUpdate'],
      gradient_colors: ['#0F2027', '#203A43'],
      state_accent: '#4F8EF7',
      uploaded_by: USER_ID,
    });
    expect(insertedValues).not.toHaveProperty('author_id');
    expect(insertedValues).not.toHaveProperty('duration_seconds');
    expect(JSON.parse(response.payload)).toMatchObject({
      success: true,
      id: SHORT_ID,
      short: { channel_name: 'Public Creator', uploaded_by: USER_ID },
    });
  });

  it('rejects short uploads until creator verification is confirmed server-side', async () => {
    jest.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    } as never);
    const verificationQuery = {
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { status: 'pending' }, error: null }),
    };
    const insert = jest.fn();
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'creator_kyc_records') return { select: () => verificationQuery } as never;
      if (table === 'political_shorts') return { insert } as never;
      return {} as never;
    }) as never);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/shorts',
      headers: { authorization: 'Bearer verified-test-token' },
      payload: {
        title: 'Unverified submission',
        videoUrl: 'https://www.youtube.com/embed/abcdefghijk',
        stateCode: 'TS',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.payload).code).toBe('CREATOR_VERIFICATION_REQUIRED');
    expect(insert).not.toHaveBeenCalled();
  });

  it('returns an owned persisted short when a legacy queued upload is replayed', async () => {
    jest.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    } as never);
    const existingQuery = {
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: SHORT_ID, uploaded_by: USER_ID, title: 'Already persisted' },
        error: null,
      }),
    };
    const insert = jest.fn();
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'political_shorts') {
        return { select: () => existingQuery, insert } as never;
      }
      return {} as never;
    }) as never);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/shorts',
      headers: { authorization: 'Bearer verified-test-token' },
      payload: {
        id: SHORT_ID,
        title: 'Already persisted',
        videoUrl: 'https://www.youtube.com/embed/abcdefghijk',
        stateCode: 'TS',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toMatchObject({
      success: true,
      id: SHORT_ID,
      alreadyPersisted: true,
    });
    expect(insert).not.toHaveBeenCalled();
  });
});
