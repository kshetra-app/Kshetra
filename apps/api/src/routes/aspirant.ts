/**
 * Aspirant Academy Routes
 * Fastify route handler for Candidate Academy mutations
 * Master Execution Framework — W021.5-H-04 (Class B Strangler Migration) / CTO Directive 138
 */

import type { FastifyInstance } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendApiError } from '../lib/replyHelper';
import { resolveAuthenticatedUser, assertActingUserMatch } from '../lib/userAuth';

export async function aspirantRoutes(app: FastifyInstance) {
  /**
   * 1. POST /api/v1/aspirant/modules/:id/complete
   * Complete academy module (Class B Method 29: completeModule)
   */
  app.post<{
    Params: { id: string };
    Body: { userId?: string; quizScore?: number };
  }>('/api/v1/aspirant/modules/:id/complete', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          quizScore: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    const auth = await resolveAuthenticatedUser(request, reply);
    if (!auth) return;

    if (!assertActingUserMatch(reply, request, auth.userId, request.body?.userId, 'userId')) {
      return;
    }

    const userId = auth.userId;
    const { id: moduleId } = request.params;
    const { quizScore } = request.body || {};
    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('module_progress')
          .update({
            completed: true,
            completed_at: now,
            quiz_score: quizScore ?? null,
          })
          .eq('user_id', userId)
          .eq('module_id', moduleId);

        if (error) {
          app.log.error({ err: error.message, moduleId, userId }, 'Failed to persist module completion');
          return sendApiError(reply, request, 500, 'Internal Server Error', 'Database error persisting module progress', {
            code: 'DATABASE_ERROR',
          });
        }

        try {
          await supabase.rpc('increment_aspirant_modules', { p_user_id: userId });
        } catch {
          // best-effort increment
        }
      } catch (err: any) {
        app.log.error({ err: err?.message, moduleId, userId }, 'Exception persisting module completion');
        return sendApiError(reply, request, 500, 'Internal Server Error', 'Database error persisting module progress', {
          code: 'DATABASE_ERROR',
        });
      }
    }

    return reply.send({
      success: true,
      moduleId,
      userId,
      completedAt: now,
      quizScore: quizScore ?? null,
    });
  });

  /**
   * 2. POST /api/v1/aspirant/challenges/:id/join
   * Join challenge (Class B Method 30: joinChallenge)
   */
  app.post<{
    Params: { id: string };
    Body: { userId?: string };
  }>('/api/v1/aspirant/challenges/:id/join', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: { userId: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    const auth = await resolveAuthenticatedUser(request, reply);
    if (!auth) return;

    if (!assertActingUserMatch(reply, request, auth.userId, request.body?.userId, 'userId')) {
      return;
    }

    const userId = auth.userId;
    const { id: challengeId } = request.params;
    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('challenge_participation')
          .insert({ user_id: userId, challenge_id: challengeId });

        if (error) {
          app.log.error({ err: error.message, challengeId, userId }, 'Failed to record challenge participation');
          return sendApiError(reply, request, 500, 'Internal Server Error', 'Database error recording challenge participation', {
            code: 'DATABASE_ERROR',
          });
        }
      } catch (err: any) {
        app.log.error({ err: err?.message, challengeId, userId }, 'Exception recording challenge participation');
        return sendApiError(reply, request, 500, 'Internal Server Error', 'Database error recording challenge participation', {
          code: 'DATABASE_ERROR',
        });
      }
    }

    return reply.send({
      success: true,
      challengeId,
      userId,
      joinedAt: now,
    });
  });

  /**
   * 3. POST /api/v1/aspirant/:id/endorse
   * Endorse aspirant (Class B Method 31: endorseAspirant)
   */
  app.post<{
    Params: { id: string };
    Body: { endorserId?: string; message?: string };
  }>('/api/v1/aspirant/:id/endorse', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          endorserId: { type: 'string' },
          message: { type: 'string', maxLength: 1000 },
        },
      },
    },
  }, async (request, reply) => {
    const auth = await resolveAuthenticatedUser(request, reply);
    if (!auth) return;

    if (!assertActingUserMatch(reply, request, auth.userId, request.body?.endorserId, 'endorserId')) {
      return;
    }

    const endorserId = auth.userId;
    const { id: aspirantId } = request.params;
    const { message } = request.body || {};
    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('community_endorsements')
          .insert({
            endorser_id: endorserId,
            aspirant_id: aspirantId,
            message: message ?? null,
            created_at: now,
          });

        if (error) {
          app.log.error({ err: error.message, aspirantId, endorserId }, 'Failed to record endorsement in DB');
          return sendApiError(reply, request, 500, 'Internal Server Error', 'Database error recording endorsement', {
            code: 'DATABASE_ERROR',
          });
        }
      } catch (err: any) {
        app.log.error({ err: err?.message, aspirantId, endorserId }, 'Exception recording endorsement in DB');
        return sendApiError(reply, request, 500, 'Internal Server Error', 'Database error recording endorsement', {
          code: 'DATABASE_ERROR',
        });
      }
    }

    return reply.status(201).send({
      success: true,
      aspirantId,
      endorserId,
      endorsedAt: now,
    });
  });
}
