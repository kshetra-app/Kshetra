/**
 * Political Shorts Routes
 * Fastify route handler for Shorts views and comments
 * Master Execution Framework — W021.5-H-04 (Class B Strangler Migration) / CTO Directive 138
 */

import type { FastifyInstance } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendApiError } from '../lib/replyHelper';
import { resolveAuthenticatedUser, assertActingUserMatch } from '../lib/userAuth';

export async function shortsRoutes(app: FastifyInstance) {
  /**
   * 1. POST /api/v1/shorts/:id/view
   * Increment view counter for a political short (Class B Method 43: incrementShortView)
   */
  app.post<{
    Params: { id: string };
    Body: { userId?: string };
  }>('/api/v1/shorts/:id/view', {
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
    const { id: shortId } = request.params;
    let viewCount = 1;

    if (isSupabaseConfigured) {
      try {
        let rpcSucceeded = false;
        try {
          const { error: rpcError } = await supabase.rpc('increment_short_views', { p_short_id: shortId });
          if (!rpcError) rpcSucceeded = true;
        } catch {
          rpcSucceeded = false;
        }

        if (!rpcSucceeded) {
          // Fallback column increment
          const { data, error: fetchError } = await supabase
            .from('political_shorts')
            .select('view_count')
            .eq('id', shortId)
            .maybeSingle();

          if (fetchError) {
            app.log.error({ err: fetchError.message, shortId }, 'Failed to fetch short for view count update');
            return sendApiError(reply, request, 500, 'Internal Server Error', 'Database error updating short view count', {
              code: 'DATABASE_ERROR',
            });
          }

          if (data) {
            viewCount = (data.view_count || 0) + 1;
            const { error: updateError } = await supabase
              .from('political_shorts')
              .update({ view_count: viewCount })
              .eq('id', shortId);

            if (updateError) {
              app.log.error({ err: updateError.message, shortId }, 'Failed to increment short view in DB');
              return sendApiError(reply, request, 500, 'Internal Server Error', 'Database error updating short view count', {
                code: 'DATABASE_ERROR',
              });
            }
          }
        }
      } catch (err: any) {
        app.log.error({ err: err?.message, shortId }, 'Exception incrementing short view in DB');
        return sendApiError(reply, request, 500, 'Internal Server Error', 'Database error updating short view count', {
          code: 'DATABASE_ERROR',
        });
      }
    }

    return reply.send({
      success: true,
      shortId,
      incremented: true,
    });
  });

  /**
   * 2. POST /api/v1/shorts/:id/comments
   * Add comment to political short (Class B Method 44: addShortComment)
   */
  app.post<{
    Params: { id: string };
    Body: { userId?: string; content: string };
  }>('/api/v1/shorts/:id/comments', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          userId: { type: 'string' },
          content: { type: 'string', minLength: 1, maxLength: 2000 },
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
    const { id: shortId } = request.params;
    const { content } = request.body;
    const commentId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('short_comments')
          .insert({
            id: commentId,
            short_id: shortId,
            user_id: userId,
            content,
            created_at: now,
          });

        if (error) {
          app.log.error({ err: error.message, shortId, userId }, 'Failed to insert short comment in DB');
          return sendApiError(reply, request, 500, 'Internal Server Error', 'Database error recording short comment', {
            code: 'DATABASE_ERROR',
          });
        }
      } catch (err: any) {
        app.log.error({ err: err?.message, shortId, userId }, 'Exception inserting short comment in DB');
        return sendApiError(reply, request, 500, 'Internal Server Error', 'Database error recording short comment', {
          code: 'DATABASE_ERROR',
        });
      }
    }

    return reply.status(201).send({
      success: true,
      commentId,
      shortId,
      userId,
      content,
      createdAt: now,
    });
  });
}
