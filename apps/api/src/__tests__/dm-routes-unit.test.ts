import Fastify, { FastifyInstance } from 'fastify';
import { dmRoutes, checkConversationRateLimit } from '../routes/dm';
import { supabase, setSupabaseConfiguredForTesting, isSupabaseConfigured } from '../lib/supabase';

describe('DM Routes & Rate Limiting Unit Tests (Direct Route Injection)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(dmRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { role: 'citizen', verification_status: 'unverified', created_at: new Date().toISOString() },
                error: null,
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    }) as any);
  });

  describe('1. Rate Limiting Pure Function (checkConversationRateLimit)', () => {
    const userId = 'user-rl-test-1';

    it('allows creation within limits', () => {
      const res = checkConversationRateLimit(userId, new Date(), false, false);
      expect(res.allowed).toBe(true);
    });

    it('exempts mutual follows from daily stranger limits', () => {
      const res = checkConversationRateLimit('user-mutual-1', new Date(), false, true);
      expect(res.allowed).toBe(true);
    });

    it('enforces 10 daily stranger limit for new accounts (< 7 days old)', () => {
      const newUserId = 'user-new-acc-1';
      const createdNow = new Date();

      for (let i = 0; i < 10; i++) {
        const check = checkConversationRateLimit(newUserId, createdNow, false, false);
        expect(check.allowed).toBe(true);
      }

      const blocked = checkConversationRateLimit(newUserId, createdNow, false, false);
      expect(blocked.allowed).toBe(false);
      expect(blocked.error).toContain('Daily new conversation limit of 10 reached');
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('enforces 15 hourly ceiling for any account', () => {
      const activeUser = 'user-hourly-max-1';
      const oldAccount = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days old

      // Mutual follow skips stranger daily count, but still hits hourly count
      for (let i = 0; i < 15; i++) {
        const check = checkConversationRateLimit(activeUser, oldAccount, false, true);
        expect(check.allowed).toBe(true);
      }

      const blocked = checkConversationRateLimit(activeUser, oldAccount, false, true);
      expect(blocked.allowed).toBe(false);
      expect(blocked.error).toContain('Hourly conversation creation limit of 15 reached');
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  describe('2. Unread Count Endpoint (/api/v1/dm/unread-count)', () => {
    it('rejects unauthenticated request with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dm/unread-count',
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns unread count from accepted conversations', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'citizen' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'conversations') {
          return {
            select: () => ({
              eq: () => ({
                or: () => ({
                  then: (resolve: any) => resolve({ data: [{ id: 'conv-1' }, { id: 'conv-2' }], error: null }),
                }),
              }),
            }),
          } as any;
        }
        if (table === 'messages') {
          return {
            select: () => ({
              in: () => ({
                neq: () => ({
                  is: () => ({
                    then: (resolve: any) => resolve({ count: 5, error: null }),
                  }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dm/unread-count',
        headers: { 'x-user-id': 'usr-1' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.count).toBe(5);
    });

    it('returns count: 0 when user has zero accepted conversations', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'citizen' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'conversations') {
          return {
            select: () => ({
              eq: () => ({
                or: () => ({
                  then: (resolve: any) => resolve({ data: [], error: null }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dm/unread-count',
        headers: { 'x-user-id': 'usr-1' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.count).toBe(0);
    });

    it('returns 500 DATABASE_ERROR when conversation query fails', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'citizen' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'conversations') {
          return {
            select: () => ({
              eq: () => ({
                or: () => ({
                  then: (resolve: any) => resolve({ data: null, error: new Error('Postgres query failure') }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dm/unread-count',
        headers: { 'x-user-id': 'usr-1' },
      });

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    });
  });

  describe('3. Create Conversation Endpoint (/api/v1/dm/conversations)', () => {
    it('rejects unauthenticated request with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations',
        payload: { recipientId: 'usr-2' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('rejects self messaging with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations',
        headers: { 'x-user-id': 'usr-1' },
        payload: { recipientId: 'usr-1' },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('rejects messaging a blocked user with 403', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'citizen' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'blocked_users') {
          return {
            select: () => ({
              or: () => ({
                maybeSingle: async () => ({ data: { blocker_id: 'usr-2' }, error: null }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations',
        headers: { 'x-user-id': 'usr-1' },
        payload: { recipientId: 'usr-2' },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('USER_BLOCKED');
    });

    it('returns existing conversation with 200 when already present', async () => {
      const mockExisting = {
        id: 'conv-existing-1',
        participant_one: 'usr-1',
        participant_two: 'usr-2',
        status: 'accepted',
      };

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'citizen' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'blocked_users') {
          return {
            select: () => ({
              or: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'conversations') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: mockExisting, error: null }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations',
        headers: { 'x-user-id': 'usr-1' },
        payload: { recipientId: 'usr-2' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.conversation.id).toBe('conv-existing-1');
    });

    it('POST /api/v1/dm/conversations: rejects with 429 when rate limit exceeded', async () => {
      const limitedUserId = 'user-heavy-dm-1';
      const createdNow = new Date();

      // Drain rate limit for this user
      for (let i = 0; i < 15; i++) {
        checkConversationRateLimit(limitedUserId, createdNow, false, false);
      }

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { role: 'citizen', verification_status: 'unverified', created_at: createdNow.toISOString() },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'blocked_users') {
          return {
            select: () => ({
              or: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'conversations') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          } as any;
        }
        if (table === 'user_follows') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations',
        headers: { 'x-user-id': limitedUserId },
        payload: { recipientId: 'usr-target-new' },
      });

      expect(res.statusCode).toBe(429);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('creates new conversation with status accepted when mutual follow exists', async () => {
      const mockCreated = {
        id: 'conv-new-mutual',
        participant_one: 'usr-1',
        participant_two: 'usr-2',
        status: 'accepted',
        initiated_by: 'usr-1',
      };

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'citizen' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'blocked_users') {
          return {
            select: () => ({
              or: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'conversations') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: async () => ({ data: mockCreated, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'user_follows') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { id: 'f-1' }, error: null }),
                }),
              }),
            }),
          } as any;
        }
        if (table === 'messages') {
          return {
            insert: async () => ({ data: null, error: null }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations',
        headers: { 'x-user-id': 'usr-1' },
        payload: { recipientId: 'usr-2', initialMessage: 'Hello there' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.conversation.status).toBe('accepted');
    });
  });

  describe('4. Send Message Endpoint (/api/v1/dm/conversations/:id/messages)', () => {
    it('rejects unauthenticated request with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations/conv-1/messages',
        payload: { content: 'Hello' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('rejects empty content and media with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations/conv-1/messages',
        headers: { 'x-user-id': 'usr-1' },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when conversation does not exist', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'citizen' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'conversations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations/non-existent-conv/messages',
        headers: { 'x-user-id': 'usr-1' },
        payload: { content: 'Hello' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('rejects non-participant with 403', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'citizen' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'conversations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'conv-1', participant_one: 'user-a', participant_two: 'user-b' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations/conv-1/messages',
        headers: { 'x-user-id': 'eavesdropper-user' },
        payload: { content: 'Hello' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('sends message successfully and triggers notification in accepted conversation', async () => {
      const mockConv = {
        id: 'conv-1',
        participant_one: 'usr-1',
        participant_two: 'usr-2',
        status: 'accepted',
        media_accepted_by_one: true,
        media_accepted_by_two: true,
      };

      const mockMsg = {
        id: 'msg-1',
        conversation_id: 'conv-1',
        sender_id: 'usr-1',
        content: 'Meeting confirmed tomorrow',
        media_url: null,
        is_media_locked: false,
      };

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'citizen' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'conversations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: mockConv, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'blocked_users') {
          return {
            select: () => ({
              or: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'messages') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: mockMsg, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'notification_log') {
          return {
            insert: async () => ({ data: null, error: null }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations/conv-1/messages',
        headers: { 'x-user-id': 'usr-1' },
        payload: { content: 'Meeting confirmed tomorrow' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.notificationTriggered).toBe(true);
      expect(body.message.content).toBe('Meeting confirmed tomorrow');
    });
  });

  describe('5. Accept & Decline Conversation Endpoints', () => {
    it('POST /api/v1/dm/conversations/:id/accept: moves conversation to accepted', async () => {
      const mockConv = {
        id: 'conv-1',
        participant_one: 'usr-1',
        participant_two: 'usr-2',
        status: 'pending',
      };

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'citizen' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'conversations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: mockConv, error: null }),
              }),
            }),
            update: () => ({
              eq: async () => ({ data: null, error: null }),
            }),
          } as any;
        }
        if (table === 'messages') {
          return {
            update: () => ({
              eq: async () => ({ data: null, error: null }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations/conv-1/accept',
        headers: { 'x-user-id': 'usr-2' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.status).toBe('accepted');
    });

    it('POST /api/v1/dm/conversations/:id/decline: declines conversation', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'citizen' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'conversations') {
          return {
            update: () => ({
              eq: () => ({
                or: async () => ({ data: null, error: null }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations/conv-1/decline',
        headers: { 'x-user-id': 'usr-2' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.status).toBe('declined');
    });
  });

  describe('6. Block & Report Endpoint (/api/v1/dm/block-report)', () => {
    it('rejects self block with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/block-report',
        headers: { 'x-user-id': 'usr-1' },
        payload: { targetUserId: 'usr-1' },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('blocks and reports user with 200', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'citizen' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'blocked_users') {
          return {
            upsert: async () => ({ data: null, error: null }),
          } as any;
        }
        if (table === 'reports') {
          return {
            insert: async () => ({ data: null, error: null }),
          } as any;
        }
        if (table === 'conversations') {
          return {
            update: () => ({
              eq: async () => ({ data: null, error: null }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/block-report',
        headers: { 'x-user-id': 'usr-1' },
        payload: {
          targetUserId: 'usr-spammer',
          reason: 'spam',
          description: 'Spamming commercial links',
          conversationId: 'conv-spam-1',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.blocked).toBe(true);
      expect(body.reported).toBe(true);
      expect(body.targetUserId).toBe('usr-spammer');
    });

    it('rejects unauthenticated block-report with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/block-report',
        payload: { targetUserId: 'usr-target' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('8. Advanced Branch Hardening (Auth, Rate Limit Windows, Notifications, Errors)', () => {
    it('resets hourly and daily windows when time expires in rate limiter', () => {
      const uId = 'user-window-reset';
      const now = Date.now();
      const dateSpy = jest.spyOn(Date, 'now');

      // Consume 1 token
      dateSpy.mockReturnValue(now);
      expect(checkConversationRateLimit(uId, new Date(), false, false).allowed).toBe(true);

      // Fast forward 1 hour + 1 second: resets hourly window
      dateSpy.mockReturnValue(now + 3600 * 1000 + 1000);
      expect(checkConversationRateLimit(uId, new Date(), false, false).allowed).toBe(true);

      // Fast forward 24 hours + 1 second: resets daily window
      dateSpy.mockReturnValue(now + 86400 * 1000 + 2000);
      expect(checkConversationRateLimit(uId, new Date(), false, false).allowed).toBe(true);

      dateSpy.mockRestore();
    });

    it('resolves Bearer auth token and rejects when token invalid', async () => {
      const origConfig = isSupabaseConfigured;
      setSupabaseConfiguredForTesting(false);

      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'usr-bearer-dm-1' } as any },
        error: null,
      });

      const resValid = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations/c-valid-bearer/accept',
        headers: { authorization: 'Bearer token-good' },
      });
      expect(resValid.statusCode).toBe(200);

      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: null as any },
        error: { message: 'Invalid JWT' } as any,
      });

      const resInvalid = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations/c-bad-bearer/accept',
        headers: { authorization: 'Bearer token-bad' },
      });
      expect(resInvalid.statusCode).toBe(401);

      setSupabaseConfiguredForTesting(origConfig);
    });

    it('dispatches generic notification on first pending message request and marks first_notification_sent', async () => {
      let markedSent = false;
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'citizen' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'conversations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'conv-first-pending',
                    participant_one: 'usr-sender',
                    participant_two: 'usr-recipient',
                    status: 'pending',
                    first_notification_sent: false,
                  },
                  error: null,
                }),
              }),
            }),
            update: (payload: any) => ({
              eq: async () => {
                if (payload.first_notification_sent) markedSent = true;
                return { data: null, error: null };
              },
            }),
          } as any;
        }
        if (table === 'blocked_users') {
          return {
            select: () => ({
              or: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'messages') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({
                  data: { id: 'msg-first-1', conversation_id: 'conv-first-pending', content: 'Hello stranger' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'notification_log') {
          return {
            insert: async () => {
              throw new Error('Push service transient failure');
            },
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations/conv-first-pending/messages',
        headers: { 'x-user-id': 'usr-sender' },
        payload: { content: 'Hello stranger' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.notificationTriggered).toBe(true);
      expect(body.notificationDetails.title).toBe('New Message Request');
      expect(markedSent).toBe(true);
    });

    it('returns 500 when message insertion fails in database', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { role: 'citizen' }, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'conversations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'conv-err',
                    participant_one: 'usr-1',
                    participant_two: 'usr-2',
                    status: 'accepted',
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'blocked_users') {
          return {
            select: () => ({
              or: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'messages') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({
                  data: null,
                  error: { message: 'Disk quota exceeded on message store' },
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations/conv-err/messages',
        headers: { 'x-user-id': 'usr-1' },
        payload: { content: 'Will fail' },
      });

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    });

    it('returns 500 when conversation creation fails in production environment', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { role: 'citizen', verification_status: 'verified', created_at: new Date().toISOString() },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'blocked_users') {
          return {
            select: () => ({
              or: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'conversations') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: async () => ({
                  data: null,
                  error: { message: 'Unique index collision' },
                }),
              }),
            }),
          } as any;
        }
        if (table === 'user_follows') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'usr-prod-sender' } as any },
        error: null,
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations',
        headers: { authorization: 'Bearer prod-token' },
        payload: { recipientId: 'usr-prod-target' },
      });

      process.env.NODE_ENV = origEnv;

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    });

    it('exercises offline fallback and error handling for /accept and /decline', async () => {
      const origConfig = isSupabaseConfigured;
      setSupabaseConfiguredForTesting(false);

      const acceptOffline = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations/conv-off/accept',
        headers: { 'x-user-id': 'usr-1' },
      });
      expect(acceptOffline.statusCode).toBe(200);

      const declineOffline = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations/conv-off/decline',
        headers: { 'x-user-id': 'usr-1' },
      });
      expect(declineOffline.statusCode).toBe(200);

      setSupabaseConfiguredForTesting(origConfig);

      // Error branches for /accept:
      // Case 1: unauthenticated
      expect((await app.inject({ method: 'POST', url: '/api/v1/dm/conversations/c/accept' })).statusCode).toBe(401);
      // Case 2: unauthenticated decline
      expect((await app.inject({ method: 'POST', url: '/api/v1/dm/conversations/c/decline' })).statusCode).toBe(401);

      // Case 3: accept when conversation not found
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'citizen' } }) }) }) } as any;
        }
        if (table === 'conversations') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
            update: () => ({ eq: () => ({ or: async () => ({ error: { message: 'Decline DB fail' } }) }) }),
          } as any;
        }
        return {} as any;
      }) as any);

      const resNotFound = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations/c-missing/accept',
        headers: { 'x-user-id': 'usr-1' },
      });
      expect(resNotFound.statusCode).toBe(404);

      // Case 4: accept when update fails
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'citizen' } }) }) }) } as any;
        }
        if (table === 'conversations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'c-up-fail', participant_one: 'usr-1', participant_two: 'usr-2' },
                }),
              }),
            }),
            update: () => ({ eq: async () => ({ error: { message: 'Lock error' } }) }),
          } as any;
        }
        return {} as any;
      }) as any);

      const resUpFail = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations/c-up-fail/accept',
        headers: { 'x-user-id': 'usr-1' },
      });
      expect(resUpFail.statusCode).toBe(500);

      // Case 5: decline when update fails
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'citizen' } }) }) }) } as any;
        }
        if (table === 'conversations') {
          return {
            update: () => ({
              eq: () => ({
                or: async () => ({ error: { message: 'Decline deadlock' } }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const resDecFail = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations/c-dec-fail/decline',
        headers: { 'x-user-id': 'usr-1' },
      });
      expect(resDecFail.statusCode).toBe(500);
    });

    it('enforces 100 daily stranger limit for verified pages across hours', () => {
      const verifiedPageUser = 'user-verified-page-1';
      const createdNow = new Date();
      let time = 1700000000000;
      const dateSpy = jest.spyOn(Date, 'now');

      // 7 hours of 14 requests = 98 requests, plus 2 in 8th hour = 100 requests (under HOURLY_MAX=15 and under 24 hours)
      for (let hour = 0; hour < 7; hour++) {
        time += 3601 * 1000; // strictly > ONE_HOUR so bucket.hourTimestamp resets
        dateSpy.mockReturnValue(time);
        for (let i = 0; i < 14; i++) {
          const check = checkConversationRateLimit(verifiedPageUser, createdNow, true, false);
          expect(check.allowed).toBe(true);
        }
      }
      // 8th hour: 2 more requests = 100 total
      time += 3601 * 1000;
      dateSpy.mockReturnValue(time);
      expect(checkConversationRateLimit(verifiedPageUser, createdNow, true, false).allowed).toBe(true);
      expect(checkConversationRateLimit(verifiedPageUser, createdNow, true, false).allowed).toBe(true);

      // 101st request: blocked by daily limit of 100!
      const blocked = checkConversationRateLimit(verifiedPageUser, createdNow, true, false);
      expect(blocked.allowed).toBe(false);
      expect(blocked.error).toContain('Daily new conversation limit of 100 reached');

      dateSpy.mockRestore();
    });

    it('returns 503 on unread-count when Supabase is not configured', async () => {
      const origConfig = isSupabaseConfigured;
      setSupabaseConfiguredForTesting(false);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dm/unread-count',
        headers: { 'x-user-id': 'usr-off-unread' },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_UNAVAILABLE');

      setSupabaseConfiguredForTesting(origConfig);
    });

    it('handles countError in unread-count with 500', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'citizen' } }) }) }) } as any;
        }
        if (table === 'conversations') {
          return {
            select: () => ({
              eq: () => ({
                or: async () => ({ data: [{ id: 'c1' }], error: null }),
              }),
            }),
          } as any;
        }
        if (table === 'messages') {
          return {
            select: () => ({
              in: () => ({
                neq: () => ({
                  is: async () => ({ count: null, error: { message: 'Message count timeout' } }),
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dm/unread-count',
        headers: { 'x-user-id': 'usr-unread-err' },
      });

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('DATABASE_ERROR');
    });

    it('creates conversation in offline mode when Supabase is not configured', async () => {
      const origConfig = isSupabaseConfigured;
      setSupabaseConfiguredForTesting(false);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations',
        headers: { 'x-user-id': 'usr-off-sender' },
        payload: { recipientId: 'usr-off-recv' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.conversation.id).toBeDefined();

      setSupabaseConfiguredForTesting(origConfig);
    });

    it('sends message in offline mode when Supabase is not configured', async () => {
      const origConfig = isSupabaseConfigured;
      setSupabaseConfiguredForTesting(false);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations/c-off/messages',
        headers: { 'x-user-id': 'usr-off-sender' },
        payload: { content: 'Offline message content' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.message.id).toBeDefined();

      setSupabaseConfiguredForTesting(origConfig);
    });

    it('rejects sending message when user is blocked', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'citizen' } }) }) }) } as any;
        }
        if (table === 'conversations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'c-blk', participant_one: 'usr-1', participant_two: 'usr-blk' },
                }),
              }),
            }),
          } as any;
        }
        if (table === 'blocked_users') {
          return {
            select: () => ({
              or: () => ({
                maybeSingle: async () => ({ data: { blocker_id: 'usr-blk' } }),
              }),
            }),
          } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations/c-blk/messages',
        headers: { 'x-user-id': 'usr-1' },
        payload: { content: 'Blocked message' },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('USER_BLOCKED');
    });

    it('returns mock conversation on create error in test/dev environment', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'citizen' } }) }) }) } as any;
        }
        if (table === 'blocked_users') {
          return { select: () => ({ or: () => ({ maybeSingle: async () => ({ data: null }) }) }) } as any;
        }
        if (table === 'conversations') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null }),
                }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: async () => ({ data: null, error: { message: 'Local DB down' } }),
              }),
            }),
          } as any;
        }
        if (table === 'user_follows') {
          return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) } as any;
        }
        return {} as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/dm/conversations',
        headers: { 'x-user-id': 'usr-dev-sender' },
        payload: { recipientId: 'usr-dev-recv', initialMessage: 'Hello dev fallback' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.conversation.last_message_preview).toBe('Hello dev fallback');
    });
  });
});
