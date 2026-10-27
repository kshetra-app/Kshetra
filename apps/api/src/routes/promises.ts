/**
 * Promises & User Favorites Routes
 * Fastify route handlers for Election Promise follows, evidence submissions, and user favorites.
 * Master Execution Framework — Jobs 011-012 / Launch Gate A Prerequisite
 */

import type { FastifyInstance } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendApiError } from '../lib/replyHelper';
import { resolveAuthenticatedUser, assertActingUserMatch } from '../lib/userAuth';

export async function promiseRoutes(app: FastifyInstance) {
  /**
   * 1. POST /api/v1/promises/:id/follow — Follow / unfollow election promise
   */
  app.post<{
    Params: { id: string };
    Body: { follow?: boolean; userId?: string };
  }>('/api/v1/promises/:id/follow', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          follow: { type: 'boolean' },
          userId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const auth = await resolveAuthenticatedUser(request, reply);
    if (!auth) return;

    if (!assertActingUserMatch(reply, request, auth.userId, request.body?.userId, 'userId')) {
      return;
    }

    if (!isSupabaseConfigured) {
      return sendApiError(reply, request, 503, 'Service Unavailable', 'Database service is not configured', {
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    const { id: promiseId } = request.params;
    const follow = request.body?.follow !== false;

    try {
      if (follow) {
        const { error } = await supabase
          .from('promise_follows')
          .upsert({ promise_id: promiseId, user_id: auth.userId }, { onConflict: 'promise_id,user_id' });

        if (error) {
          return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
            code: 'DATABASE_ERROR',
          });
        }
      } else {
        const { error } = await supabase
          .from('promise_follows')
          .delete()
          .match({ promise_id: promiseId, user_id: auth.userId });

        if (error) {
          return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
            code: 'DATABASE_ERROR',
          });
        }
      }

      return reply.send({ success: true, promiseId, following: follow });
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Database error updating promise follow', {
        code: 'DATABASE_ERROR',
      });
    }
  });

  /**
   * 2. POST /api/v1/promises/:id/evidence — Submit citizen evidence for promise
   */
  app.post<{
    Params: { id: string };
    Body: {
      title: string;
      description?: string;
      mediaUrls?: string[];
      statusClaim?: string;
      userId?: string;
    };
  }>('/api/v1/promises/:id/evidence', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 500 },
          description: { type: 'string' },
          mediaUrls: { type: 'array', items: { type: 'string' } },
          statusClaim: { type: 'string' },
          userId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const auth = await resolveAuthenticatedUser(request, reply);
    if (!auth) return;

    if (!assertActingUserMatch(reply, request, auth.userId, request.body?.userId, 'userId')) {
      return;
    }

    if (!isSupabaseConfigured) {
      return sendApiError(reply, request, 503, 'Service Unavailable', 'Database service is not configured', {
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    const { id: promiseId } = request.params;
    const { title, description, mediaUrls, statusClaim } = request.body;

    try {
      const { data, error } = await supabase
        .from('promise_evidence')
        .insert({
          promise_id: promiseId,
          submitted_by: auth.userId,
          title,
          description: description || null,
          media_urls: mediaUrls || [],
          status_claim: statusClaim || null,
        })
        .select('*')
        .single();

      if (error || !data) {
        return sendApiError(reply, request, 500, 'Internal Server Error', error?.message || 'Failed to submit evidence', {
          code: 'DATABASE_ERROR',
        });
      }

      return reply.status(201).send({ success: true, id: data.id, promiseId, evidence: data });
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Database error submitting promise evidence', {
        code: 'DATABASE_ERROR',
      });
    }
  });

  /**
   * 3. POST /api/v1/user/favorites/toggle — Toggle user favorite
   */
  app.post<{
    Body: {
      targetType: string;
      targetId: string;
      isFavorited: boolean;
      userId?: string;
    };
  }>('/api/v1/user/favorites/toggle', {
    schema: {
      body: {
        type: 'object',
        required: ['targetType', 'targetId', 'isFavorited'],
        properties: {
          targetType: { type: 'string' },
          targetId: { type: 'string' },
          isFavorited: { type: 'boolean' },
          userId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const auth = await resolveAuthenticatedUser(request, reply);
    if (!auth) return;

    if (!assertActingUserMatch(reply, request, auth.userId, request.body?.userId, 'userId')) {
      return;
    }

    if (!isSupabaseConfigured) {
      return sendApiError(reply, request, 503, 'Service Unavailable', 'Database service is not configured', {
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    const { targetType, targetId, isFavorited } = request.body;

    try {
      if (isFavorited) {
        const { error } = await supabase
          .from('favorites')
          .upsert({
            user_id: auth.userId,
            target_type: targetType,
            target_id: targetId,
          }, { onConflict: 'user_id,target_type,target_id' });

        if (error) {
          return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
            code: 'DATABASE_ERROR',
          });
        }
      } else {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .match({
            user_id: auth.userId,
            target_type: targetType,
            target_id: targetId,
          });

        if (error) {
          return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
            code: 'DATABASE_ERROR',
          });
        }
      }

      return reply.send({ success: true, targetType, targetId, isFavorited });
    } catch (err: any) {
      return sendApiError(reply, request, 500, 'Internal Server Error', 'Database error toggling favorite', {
        code: 'DATABASE_ERROR',
      });
    }
  });
}
