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
  }>(
    '/api/v1/shorts/:id/view',
    {
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
    },
    async (request, reply) => {
      const { id: shortId } = request.params;
      let viewCount = 1;

      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is not configured',
          {
            code: 'SERVICE_UNAVAILABLE',
          },
        );
      }

      try {
        let rpcSucceeded = false;
        try {
          const { error: rpcError } = await supabase.rpc('increment_short_views', {
            p_short_id: shortId,
          });
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
            app.log.error(
              { err: fetchError.message, shortId },
              'Failed to fetch short for view count update',
            );
            return sendApiError(
              reply,
              request,
              500,
              'Internal Server Error',
              'Database error updating short view count',
              {
                code: 'DATABASE_ERROR',
              },
            );
          }

          if (data) {
            viewCount = (data.view_count || 0) + 1;
            const { error: updateError } = await supabase
              .from('political_shorts')
              .update({ view_count: viewCount })
              .eq('id', shortId);

            if (updateError) {
              app.log.error(
                { err: updateError.message, shortId },
                'Failed to increment short view in DB',
              );
              return sendApiError(
                reply,
                request,
                500,
                'Internal Server Error',
                'Database error updating short view count',
                {
                  code: 'DATABASE_ERROR',
                },
              );
            }
          }
        }
      } catch (err: any) {
        app.log.error({ err: err?.message, shortId }, 'Exception incrementing short view in DB');
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error updating short view count',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }

      return reply.send({
        success: true,
        shortId,
        incremented: true,
      });
    },
  );

  /**
   * 2. POST /api/v1/shorts/:id/comments
   * Add comment to political short (Class B Method 44: addShortComment)
   */
  app.post<{
    Params: { id: string };
    Body: { userId?: string; content: string };
  }>(
    '/api/v1/shorts/:id/comments',
    {
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
    },
    async (request, reply) => {
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

      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is not configured',
          {
            code: 'SERVICE_UNAVAILABLE',
          },
        );
      }

      try {
        const { error } = await supabase.from('short_comments').insert({
          id: commentId,
          short_id: shortId,
          user_id: userId,
          content,
          created_at: now,
        });

        if (error) {
          app.log.error(
            { err: error.message, shortId, userId },
            'Failed to insert short comment in DB',
          );
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            'Database error recording short comment',
            {
              code: 'DATABASE_ERROR',
            },
          );
        }
      } catch (err: any) {
        app.log.error(
          { err: err?.message, shortId, userId },
          'Exception inserting short comment in DB',
        );
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error recording short comment',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }

      return reply.status(201).send({
        success: true,
        commentId,
        shortId,
        userId,
        content,
        createdAt: now,
      });
    },
  );
  /**
   * 3. POST /api/v1/shorts — Upload political short (Class B Method 41)
   */
  app.post<{
    Body: {
      title: string;
      videoUrl: string;
      thumbnailUrl?: string;
      description?: string;
      stateCode: string;
      constituencyId?: string;
      authorId?: string;
      durationSeconds?: number;
    };
  }>(
    '/api/v1/shorts',
    {
      schema: {
        body: {
          type: 'object',
          required: ['title', 'videoUrl', 'stateCode'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 300 },
            videoUrl: { type: 'string', minLength: 1 },
            thumbnailUrl: { type: 'string' },
            description: { type: 'string' },
            stateCode: { type: 'string', minLength: 2, maxLength: 2 },
            constituencyId: { type: 'string' },
            authorId: { type: 'string' },
            durationSeconds: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!assertActingUserMatch(reply, request, auth.userId, request.body?.authorId, 'authorId')) {
        return;
      }

      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is not configured',
          {
            code: 'DATABASE_UNAVAILABLE',
          },
        );
      }

      const body = request.body;
      try {
        const { data, error } = await supabase
          .from('political_shorts')
          .insert({
            title: body.title,
            video_url: body.videoUrl,
            thumbnail_url: body.thumbnailUrl || null,
            description: body.description || null,
            state_code: body.stateCode,
            constituency_id: body.constituencyId || null,
            author_id: auth.userId,
            duration_seconds: body.durationSeconds || 0,
          })
          .select('*')
          .single();

        if (error || !data) {
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            error?.message || 'Failed to upload short',
            {
              code: 'DATABASE_ERROR',
            },
          );
        }

        return reply.status(201).send({ success: true, id: data.id, short: data });
      } catch (err: any) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error uploading short',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    },
  );

  /**
   * 4. POST /api/v1/shorts/:id/approve — Community approve short (Class B Method 42)
   */
  app.post<{
    Params: { id: string };
    Body: { constituencyId?: string; userId?: string };
  }>(
    '/api/v1/shorts/:id/approve',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          properties: {
            constituencyId: { type: 'string' },
            userId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!assertActingUserMatch(reply, request, auth.userId, request.body?.userId, 'userId')) {
        return;
      }

      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is not configured',
          {
            code: 'DATABASE_UNAVAILABLE',
          },
        );
      }

      const { id: shortId } = request.params;
      const { constituencyId } = request.body || {};

      try {
        const { error } = await supabase.from('short_approvals').insert({
          short_id: shortId,
          user_id: auth.userId,
          constituency_id: constituencyId ?? null,
        });

        if (error) {
          return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
            code: 'DATABASE_ERROR',
          });
        }

        return reply.send({ success: true, shortId, approved: true });
      } catch (err: any) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error approving short',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    },
  );

  /**
   * 5. POST /api/v1/shorts/:id/flag — Flag short (Class B Method 43)
   */
  app.post<{
    Params: { id: string };
    Body: { reason?: string; userId?: string };
  }>(
    '/api/v1/shorts/:id/flag',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string', maxLength: 500 },
            userId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!assertActingUserMatch(reply, request, auth.userId, request.body?.userId, 'userId')) {
        return;
      }

      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Database service is not configured',
          {
            code: 'DATABASE_UNAVAILABLE',
          },
        );
      }

      const { id: shortId } = request.params;
      const { reason } = request.body || {};

      try {
        const { error } = await supabase.from('short_flags').insert({
          short_id: shortId,
          user_id: auth.userId,
          reason: reason || null,
        });

        if (error) {
          return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
            code: 'DATABASE_ERROR',
          });
        }

        return reply.send({ success: true, shortId, flagged: true });
      } catch (err: any) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error flagging short',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    },
  );
}
