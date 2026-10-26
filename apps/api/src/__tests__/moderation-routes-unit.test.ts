import Fastify, { FastifyInstance } from 'fastify';
import { moderationRoutes } from '../routes/moderation';
import { supabase, setSupabaseConfiguredForTesting } from '../lib/supabase';
import * as contentMod from '../services/contentModeration';

describe('Moderation Routes Unit Tests (Direct Route Injection)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(moderationRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(true);
  });

  beforeEach(() => {
    // Default safe Supabase mock returning moderator role
    jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      const builder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'moderator' }, error: null }),
        single: jest.fn().mockResolvedValue({
          data: { id: 'vr-1', verification_type: 'id_card', status: 'pending', created_at: new Date().toISOString() },
          error: null,
        }),
        update: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
      };
      return builder;
    }) as any);
  });

  describe('resolveModeratorRole Edge Cases', () => {
    it('resolves authenticated user via Bearer token', async () => {
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'user-auth-1' } as any },
        error: null,
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/action',
        headers: {
          authorization: 'Bearer valid-jwt-token',
        },
        payload: {
          moderatorId: 'user-auth-1',
          actionType: 'warn',
          reason: 'Warning for minor violation',
        },
      });

      expect(res.statusCode).toBe(200);
    });

    it('returns 401 when completely unauthenticated', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/moderation/action',
          payload: {
            moderatorId: 'mod-1',
            actionType: 'warn',
            reason: 'test',
          },
        });
        expect(res.statusCode).toBe(401);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('returns role when Supabase is unconfigured', async () => {
      setSupabaseConfiguredForTesting(false);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/action',
        headers: {
          'x-user-id': 'mod-test-user',
        },
        payload: {
          moderatorId: 'mod-test-user',
          actionType: 'warn',
          reason: 'Unconfigured DB fallback',
        },
      });
      expect(res.statusCode).toBe(200);
    });

    it('handles database error in resolveModeratorRole in production', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
          data: { user: { id: 'user-db-err' } as any },
          error: null,
        });

        jest.spyOn(supabase, 'from').mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'DB connection error' } }),
        } as any);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/moderation/action',
          headers: {
            authorization: 'Bearer token-123',
          },
          payload: {
            moderatorId: 'user-db-err',
            actionType: 'warn',
            reason: 'test',
          },
        });
        expect(res.statusCode).toBe(500);
        expect(JSON.parse(res.payload).code).toBe('DATABASE_ERROR');
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('handles exception querying user_profiles in production', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
          data: { user: { id: 'user-db-throw' } as any },
          error: null,
        });

        jest.spyOn(supabase, 'from').mockImplementationOnce(() => {
          throw new Error('Fatal socket exception');
        });

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/moderation/action',
          headers: {
            authorization: 'Bearer token-123',
          },
          payload: {
            moderatorId: 'user-db-throw',
            actionType: 'warn',
            reason: 'test',
          },
        });
        expect(res.statusCode).toBe(500);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });
  });

  describe('Endpoint 1: POST /api/v1/moderation/action', () => {
    it('rejects moderatorId spoofing when moderatorId does not match authenticated identity', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/action',
        headers: {
          'x-user-id': 'real-mod-id',
          'x-test-role': 'moderator',
        },
        payload: {
          moderatorId: 'spoofed-mod-id',
          actionType: 'warn',
          reason: 'Spoofing test',
        },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.payload).code).toBe('VALIDATION_ERROR');
    });

    it('handles delete_content on targetPostId with Supabase update', async () => {
      let updatedPost = false;
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'posts') {
          return {
            update: () => ({
              eq: async () => {
                updatedPost = true;
                return { error: null };
              },
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/action',
        headers: {
          'x-user-id': 'admin-user',
          'x-test-role': 'admin',
        },
        payload: {
          moderatorId: 'admin-user',
          actionType: 'delete_content',
          targetPostId: 'post-123',
          reason: 'Severe violation',
        },
      });
      expect(res.statusCode).toBe(200);
      expect(updatedPost).toBe(true);
    });

    it('handles delete_content on targetCommentId with Supabase update', async () => {
      let updatedComment = false;
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'comments') {
          return {
            update: () => ({
              eq: async () => {
                updatedComment = true;
                return { error: null };
              },
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/action',
        headers: {
          'x-user-id': 'admin-user',
          'x-test-role': 'admin',
        },
        payload: {
          moderatorId: 'admin-user',
          actionType: 'delete_content',
          targetCommentId: 'comment-123',
          reason: 'Harassment in comment',
        },
      });
      expect(res.statusCode).toBe(200);
      expect(updatedComment).toBe(true);
    });

    it('handles report status update and dismissal', async () => {
      let updatedReportStatus = '';
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'reports') {
          return {
            update: (payload: any) => ({
              eq: async () => {
                updatedReportStatus = payload.status;
                return { error: null };
              },
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'moderator' }, error: null }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/action',
        headers: {
          'x-user-id': 'mod-user',
          'x-test-role': 'moderator',
        },
        payload: {
          moderatorId: 'mod-user',
          actionType: 'dismiss',
          reportId: 'rep-demo-1',
          reason: 'No violation found',
        },
      });
      expect(res.statusCode).toBe(200);
      expect(updatedReportStatus).toBe('dismissed');
    });

    it('handles post soft-delete error in production mode', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
          data: { user: { id: 'admin-user' } as any },
          error: null,
        });

        jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
          if (table === 'posts') {
            return {
              update: () => ({
                eq: async () => ({ error: { message: 'Posts update failed' } }),
              }),
            } as any;
          }
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
          } as any;
        }) as any);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/moderation/action',
          headers: {
            authorization: 'Bearer token-admin',
          },
          payload: {
            moderatorId: 'admin-user',
            actionType: 'delete_content',
            targetPostId: 'post-failed',
            reason: 'Production error test',
          },
        });
        expect(res.statusCode).toBe(500);
        expect(JSON.parse(res.payload).code).toBe('PERSISTENCE_ERROR');
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('handles comment soft-delete error in production mode', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
          data: { user: { id: 'admin-user' } as any },
          error: null,
        });

        jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
          if (table === 'comments') {
            return {
              update: () => ({
                eq: async () => ({ error: { message: 'Comment update failed' } }),
              }),
            } as any;
          }
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
          } as any;
        }) as any);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/moderation/action',
          headers: {
            authorization: 'Bearer token-admin',
          },
          payload: {
            moderatorId: 'admin-user',
            actionType: 'delete_content',
            targetCommentId: 'comment-failed',
            reason: 'Production error test',
          },
        });
        expect(res.statusCode).toBe(500);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('handles post soft-delete error in non-production mode with fallback', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'posts') {
          return {
            update: () => ({
              eq: async () => ({ error: { message: 'Non-prod soft delete warning' } }),
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/action',
        headers: {
          'x-user-id': 'admin-user',
          'x-test-role': 'admin',
        },
        payload: {
          moderatorId: 'admin-user',
          actionType: 'delete_content',
          targetPostId: 'post-warn',
          reason: 'Non-prod fallback test',
        },
      });
      expect(res.statusCode).toBe(200);
    });

    it('handles comment soft-delete error in non-production mode with fallback', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'comments') {
          return {
            update: () => ({
              eq: async () => ({ error: { message: 'Non-prod comment warning' } }),
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/action',
        headers: {
          'x-user-id': 'admin-user',
          'x-test-role': 'admin',
        },
        payload: {
          moderatorId: 'admin-user',
          actionType: 'delete_content',
          targetCommentId: 'comment-warn',
          reason: 'Non-prod fallback test',
        },
      });
      expect(res.statusCode).toBe(200);
    });

    it('handles report update error in non-production mode with fallback', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'reports') {
          return {
            update: () => ({
              eq: async () => ({ error: { message: 'Non-prod report warning' } }),
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'moderator' }, error: null }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/action',
        headers: {
          'x-user-id': 'mod-user',
          'x-test-role': 'moderator',
        },
        payload: {
          moderatorId: 'mod-user',
          actionType: 'warn',
          reportId: 'rep-warn',
          reason: 'Non-prod fallback test',
        },
      });
      expect(res.statusCode).toBe(200);
    });

    it('handles exception in action execution in non-production mode with fallback', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'posts') {
          throw new Error('Non-prod post exception');
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/action',
        headers: {
          'x-user-id': 'admin-user',
          'x-test-role': 'admin',
        },
        payload: {
          moderatorId: 'admin-user',
          actionType: 'delete_content',
          targetPostId: 'post-throw',
          reason: 'Exception fallback test',
        },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('Endpoint 2: POST /api/v1/moderation/check-content', () => {
    it('handles unexpected non-unavailable error with 503 MODERATION_UNAVAILABLE', async () => {
      jest.spyOn(contentMod, 'moderateContent').mockRejectedValueOnce(new Error('Unexpected crash'));
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/check-content',
        payload: {
          content: 'Random content',
        },
      });
      expect(res.statusCode).toBe(503);
      expect(JSON.parse(res.payload).code).toBe('MODERATION_UNAVAILABLE');
    });
  });

  describe('Endpoint 3: GET /api/v1/moderation/queue', () => {
    it('returns reports from database when records exist', async () => {
      const mockReports = [
        {
          id: 'rep-db-1',
          status: 'pending',
          reason: 'spam',
          created_at: new Date().toISOString(),
          post: { id: 'p1', content: 'Buy crypto', author_name: 'spammer' },
        },
      ];

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'reports') {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: async () => ({ data: mockReports, error: null }),
                }),
              }),
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'moderator' }, error: null }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/moderation/queue',
        headers: {
          'x-user-id': 'mod-user',
          'x-test-role': 'moderator',
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.data.totalPending).toBe(1);
      expect(json.data.queue[0].id).toBe('rep-db-1');
    });

    it('returns empty queue when database legitimately has 0 reports', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'reports') {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: async () => ({ data: [], error: null }),
                }),
              }),
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'moderator' }, error: null }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/moderation/queue',
        headers: {
          'x-user-id': 'mod-user',
          'x-test-role': 'moderator',
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.data.totalPending).toBe(0);
      expect(json.data.queue).toEqual([]);
    });

    it('handles query error in production mode', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
          data: { user: { id: 'mod-user' } as any },
          error: null,
        });

        jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
          if (table === 'reports') {
            return {
              select: () => ({
                eq: () => ({
                  order: () => ({
                    limit: async () => ({ data: null, error: { message: 'Database failure' } }),
                  }),
                }),
              }),
            } as any;
          }
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'moderator' }, error: null }),
          } as any;
        }) as any);

        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/moderation/queue',
          headers: {
            authorization: 'Bearer token-mod',
          },
        });
        expect(res.statusCode).toBe(500);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('handles query error in non-production mode with mock queue fallback', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'reports') {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: async () => ({ data: null, error: { message: 'Non-prod reports warning' } }),
                }),
              }),
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'moderator' }, error: null }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/moderation/queue',
        headers: {
          'x-user-id': 'mod-user',
          'x-test-role': 'moderator',
        },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).data.message).toContain('served from test fixtures');
    });

    it('handles exception in queue query with fallback in non-production mode', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'reports') {
          throw new Error('Queue exception');
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'moderator' }, error: null }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/moderation/queue',
        headers: {
          'x-user-id': 'mod-user',
          'x-test-role': 'moderator',
        },
      });
      expect(res.statusCode).toBe(200);
    });

    it('handles unconfigured database outside test mode with 503', async () => {
      setSupabaseConfiguredForTesting(false);
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      try {
        jest.spyOn(supabase.auth, 'getUser').mockResolvedValue({
          data: { user: { id: 'mod-user', app_metadata: { role: 'moderator' } } },
          error: null,
        } as any);
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/moderation/queue',
          headers: {
            authorization: 'Bearer valid-test-token',
          },
        });
        expect(res.statusCode).toBe(503);
        expect(JSON.parse(res.payload).code).toBe('DATABASE_UNAVAILABLE');
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });
  });

  describe('Endpoint 5: GET /api/v1/moderation/audit-log', () => {
    it('rejects unauthenticated caller with 401', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/moderation/audit-log',
        });
        expect(res.statusCode).toBe(401);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });
  });

  describe('Endpoint 6: POST /api/v1/moderation/verify-request', () => {
    it('persists verification request to database in normal mode', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/verify-request',
        headers: {
          'x-user-id': 'citizen-user-1',
          'x-test-role': 'citizen',
        },
        payload: {
          verificationType: 'identity',
          documentUrl: 'https://storage.example.com/doc.pdf',
          notes: 'MLA office verification',
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.data.userId).toBe('citizen-user-1');
    });

    it('handles database upsert error in production mode', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
          data: { user: { id: 'citizen-user-1' } as any },
          error: null,
        });

        jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
          if (table === 'user_verification') {
            return {
              upsert: () => ({
                select: () => ({
                  single: async () => ({ data: null, error: { message: 'Database insert failed' } }),
                }),
              }),
            } as any;
          }
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'citizen' }, error: null }),
          } as any;
        }) as any);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/moderation/verify-request',
          headers: {
            authorization: 'Bearer token-citizen',
          },
          payload: {
            verificationType: 'identity',
          },
        });
        expect(res.statusCode).toBe(500);
        expect(JSON.parse(res.payload).code).toBe('DATABASE_ERROR');
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('handles database upsert error in non-production mode with mock fallback', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_verification') {
          return {
            upsert: () => ({
              select: () => ({
                single: async () => ({ data: null, error: { message: 'Database insert failed' } }),
              }),
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'citizen' }, error: null }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/verify-request',
        headers: {
          'x-user-id': 'citizen-user-1',
          'x-test-role': 'citizen',
        },
        payload: {
          verificationType: 'identity',
        },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).data.id).toBe('vr-mock-1');
    });

    it('handles exception in verify-request in non-production mode with mock fallback', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_verification') {
          throw new Error('Verify exception');
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'citizen' }, error: null }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/verify-request',
        headers: {
          'x-user-id': 'citizen-user-1',
          'x-test-role': 'citizen',
        },
        payload: {
          verificationType: 'identity',
        },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).data.id).toBe('vr-mock-1');
    });

    it('returns 503 when Supabase is not configured', async () => {
      setSupabaseConfiguredForTesting(false);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/verify-request',
        headers: {
          'x-user-id': 'citizen-user-1',
        },
        payload: {
          verificationType: 'identity',
        },
      });
      expect(res.statusCode).toBe(503);
      expect(JSON.parse(res.payload).code).toBe('DATABASE_UNAVAILABLE');
    });
  });

  describe('Endpoint 7: POST /api/v1/moderation/block', () => {
    it('returns 503 when Supabase is not configured', async () => {
      setSupabaseConfiguredForTesting(false);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/block',
        headers: {
          'x-user-id': 'user-1',
        },
        payload: {
          blockedUserId: 'user-2',
        },
      });
      expect(res.statusCode).toBe(503);
      expect(JSON.parse(res.payload).code).toBe('DATABASE_UNAVAILABLE');
    });

    it('handles database error in production mode', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
          data: { user: { id: 'user-1' } as any },
          error: null,
        });

        jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
          if (table === 'blocked_users') {
            return {
              upsert: async () => ({ error: { message: 'DB deadlock' } }),
            } as any;
          }
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'citizen' }, error: null }),
          } as any;
        }) as any);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/moderation/block',
          headers: {
            authorization: 'Bearer token-1',
          },
          payload: {
            blockedUserId: 'user-2',
          },
        });
        expect(res.statusCode).toBe(500);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('handles database error in non-production mode with fallback', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'blocked_users') {
          return {
            upsert: async () => ({ error: { message: 'DB deadlock non-prod' } }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'citizen' }, error: null }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/block',
        headers: {
          'x-user-id': 'user-1',
          'x-test-role': 'citizen',
        },
        payload: {
          blockedUserId: 'user-2',
        },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).data.blockedId).toBe('user-2');
    });

    it('handles exception in block in non-production mode with fallback', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'blocked_users') {
          throw new Error('Block exception');
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'citizen' }, error: null }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/moderation/block',
        headers: {
          'x-user-id': 'user-1',
          'x-test-role': 'citizen',
        },
        payload: {
          blockedUserId: 'user-2',
        },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('Endpoint 8: DELETE /api/v1/moderation/block/:userId', () => {
    it('returns 503 when Supabase is not configured', async () => {
      setSupabaseConfiguredForTesting(false);
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/moderation/block/user-2',
        headers: {
          'x-user-id': 'user-1',
        },
      });
      expect(res.statusCode).toBe(503);
      expect(JSON.parse(res.payload).code).toBe('DATABASE_UNAVAILABLE');
    });

    it('handles database error in production mode', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
          data: { user: { id: 'user-1' } as any },
          error: null,
        });

        jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
          if (table === 'blocked_users') {
            return {
              delete: () => ({
                eq: () => ({
                  eq: async () => ({ error: { message: 'Delete error' } }),
                }),
              }),
            } as any;
          }
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'citizen' }, error: null }),
          } as any;
        }) as any);

        const res = await app.inject({
          method: 'DELETE',
          url: '/api/v1/moderation/block/user-2',
          headers: {
            authorization: 'Bearer token-1',
          },
        });
        expect(res.statusCode).toBe(500);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('handles delete error in non-production mode with fallback', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'blocked_users') {
          return {
            delete: () => ({
              eq: () => ({
                eq: async () => ({ error: { message: 'Delete error non-prod' } }),
              }),
            }),
          } as any;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'citizen' }, error: null }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/moderation/block/user-2',
        headers: {
          'x-user-id': 'user-1',
          'x-test-role': 'citizen',
        },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).data.unblocked).toBe('user-2');
    });

    it('handles exception in delete in non-production mode with fallback', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'blocked_users') {
          throw new Error('Delete exception');
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'citizen' }, error: null }),
        } as any;
      }) as any);

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/v1/moderation/block/user-2',
        headers: {
          'x-user-id': 'user-1',
          'x-test-role': 'citizen',
        },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).data.unblocked).toBe('user-2');
    });
  });
});
