/**
 * Political Shorts Routes
 * Fastify route handler for Shorts views and comments
 * Master Execution Framework — W021.5-H-04 (Class B Strangler Migration)
 */

import type { FastifyInstance } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendApiError } from '../lib/replyHelper';

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
        try {
          await supabase.rpc('increment_short_views', { p_short_id: shortId });
        } catch {
          // Fallback column increment
          const { data } = await supabase
            .from('political_shorts')
            .select('view_count')
            .eq('id', shortId)
            .single();
          if (data) {
            viewCount = (data.view_count || 0) + 1;
            await supabase
              .from('political_shorts')
              .update({ view_count: viewCount })
              .eq('id', shortId);
          }
        }
      } catch (err: any) {
        app.log.warn({ err: err?.message, shortId }, 'Failed to increment short view in DB');
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
    const userId = (request.headers['x-user-id'] as string) || request.body?.userId;
    if (!userId) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required', { code: 'UNAUTHORIZED' });
    }

    const { id: shortId } = request.params;
    const { content } = request.body;
    const commentId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('short_comments')
          .insert({
            id: commentId,
            short_id: shortId,
            user_id: userId,
            content,
            created_at: now,
          });
      } catch (err: any) {
        app.log.warn({ err: err?.message, shortId, userId }, 'Failed to insert short comment in DB');
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
