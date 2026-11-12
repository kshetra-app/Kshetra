/**
 * Political Shorts Routes
 * Fastify route handler for Shorts views and comments
 * Master Execution Framework — W021.5-H-04 (Class B Strangler Migration) / CTO Directive 138
 */

import type { FastifyInstance } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendApiError } from '../lib/replyHelper';
import { resolveAuthenticatedUser, assertActingUserMatch } from '../lib/userAuth';
import { checkContentModeration, ModerationUnavailableError } from '../services/contentModeration';

const SHORT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
      } catch (err: unknown) {
        app.log.error(
          { err: err instanceof Error ? err.message : String(err), shortId },
          'Exception incrementing short view in DB',
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

      return reply.send({
        success: true,
        shortId,
        incremented: true,
      });
    },
  );

  /** List persisted comments for a public short. */
  app.get<{
    Params: { id: string };
    Querystring: { offset?: number; limit?: number };
  }>(
    '/api/v1/shorts/:id/comments',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        querystring: {
          type: 'object',
          properties: {
            offset: { type: 'integer', minimum: 0 },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { id: shortId } = request.params;
      const offset = request.query.offset ?? 0;
      const limit = request.query.limit ?? 100;
      if (!SHORT_ID_PATTERN.test(shortId)) {
        return sendApiError(reply, request, 400, 'Bad Request', 'Invalid short ID', {
          code: 'INVALID_SHORT_ID',
        });
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

      try {
        const { data: short, error: shortError } = await supabase
          .from('political_shorts')
          .select('id,status')
          .eq('id', shortId)
          .maybeSingle();

        if (shortError) {
          app.log.error(
            { err: shortError.message, shortId },
            'Failed to load short before listing comments',
          );
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            'Could not load comments',
            {
              code: 'DATABASE_ERROR',
            },
          );
        }
        if (!short || !['approved', 'pending'].includes(short.status)) {
          return sendApiError(reply, request, 404, 'Not Found', 'Short not found', {
            code: 'SHORT_NOT_FOUND',
          });
        }

        const { data, count, error } = await supabase
          .from('short_comments')
          .select('id,author_name,text,created_at', { count: 'exact' })
          .eq('short_id', shortId)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          app.log.error({ err: error.message, shortId }, 'Failed to list short comments');
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            'Could not load comments',
            {
              code: 'DATABASE_ERROR',
            },
          );
        }

        const comments = (data || []).map((row) => ({
          id: row.id,
          authorName: row.author_name || 'Anonymous',
          text: row.text,
          createdAt: row.created_at,
        }));

        return reply.send({ success: true, shortId, comments, total: count ?? comments.length });
      } catch (err: unknown) {
        app.log.error(
          { err: err instanceof Error ? err.message : String(err), shortId },
          'Exception listing short comments',
        );
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Could not load comments',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    },
  );

  /** Add a persisted comment to a political short (Class B Method 44). */
  app.post<{
    Params: { id: string };
    Body: { content: string };
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
            content: { type: 'string', minLength: 1, maxLength: 500 },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;
      const userId = auth.userId;
      const { id: shortId } = request.params;
      const content = request.body.content.trim();

      if (!SHORT_ID_PATTERN.test(shortId)) {
        return sendApiError(reply, request, 400, 'Bad Request', 'Invalid short ID', {
          code: 'INVALID_SHORT_ID',
        });
      }
      if (!content) {
        return sendApiError(reply, request, 400, 'Bad Request', 'Comment cannot be empty', {
          code: 'INVALID_COMMENT',
        });
      }

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
        const { data: short, error: shortError } = await supabase
          .from('political_shorts')
          .select('id,status')
          .eq('id', shortId)
          .maybeSingle();

        if (shortError) {
          app.log.error(
            { err: shortError.message, shortId },
            'Failed to load short before adding comment',
          );
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            'Could not add comment',
            {
              code: 'DATABASE_ERROR',
            },
          );
        }
        if (!short || !['approved', 'pending'].includes(short.status)) {
          return sendApiError(reply, request, 404, 'Not Found', 'Short not found', {
            code: 'SHORT_NOT_FOUND',
          });
        }

        let moderation;
        try {
          moderation = await checkContentModeration(content);
        } catch (error) {
          if (!(error instanceof ModerationUnavailableError)) throw error;
          app.log.warn(
            { err: error.message, shortId },
            'Content moderation is unavailable for short comment',
          );
          return sendApiError(
            reply,
            request,
            503,
            'Service Unavailable',
            'Comment moderation is temporarily unavailable. Please try again.',
            { code: 'MODERATION_UNAVAILABLE' },
          );
        }
        if (moderation.flagged) {
          return sendApiError(
            reply,
            request,
            422,
            'Unprocessable Entity',
            'Comment rejected due to policy violations',
            {
              code: 'CONTENT_MODERATION_FAILED',
              details: moderation.reasons.map((reason) => ({ path: 'content', message: reason })),
            },
          );
        }

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('user_id', userId)
          .maybeSingle();
        if (profileError) {
          app.log.warn(
            { err: profileError.message, userId },
            'Could not resolve short-comment author name',
          );
        }
        const authorName = profile?.display_name || 'Anonymous';

        const { data: comment, error } = await supabase
          .from('short_comments')
          .insert({
            short_id: shortId,
            user_id: userId,
            author_name: authorName,
            text: content,
          })
          .select('id,author_name,text,created_at')
          .single();

        if (error || !comment) {
          app.log.error(
            { err: error?.message, shortId, userId },
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
        return reply.status(201).send({
          success: true,
          id: comment.id,
          shortId,
          comment: {
            id: comment.id,
            authorName: comment.author_name || 'Anonymous',
            text: comment.text,
            createdAt: comment.created_at,
          },
        });
      } catch (err: unknown) {
        app.log.error(
          { err: err instanceof Error ? err.message : String(err), shortId, userId },
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
    },
  );
  /**
   * 3. POST /api/v1/shorts — Upload political short (Class B Method 41)
   */
  app.post<{
    Body: {
      id?: string;
      title: string;
      videoUrl: string;
      thumbnailUrl?: string;
      description?: string;
      stateCode: string;
      stateName?: string;
      constituencyId?: string;
      districtName?: string;
      durationSeconds?: number;
      hashtags?: string[];
      gradientColors?: string[];
      stateAccent?: string;
    };
  }>(
    '/api/v1/shorts',
    {
      schema: {
        body: {
          type: 'object',
          required: ['title', 'videoUrl', 'stateCode'],
          properties: {
            id: { type: 'string', pattern: SHORT_ID_PATTERN.source },
            title: { type: 'string', minLength: 1, maxLength: 200 },
            videoUrl: { type: 'string', minLength: 1 },
            thumbnailUrl: { type: 'string' },
            description: { type: 'string', maxLength: 5000 },
            stateCode: { type: 'string', minLength: 2, maxLength: 2 },
            stateName: { type: 'string', maxLength: 100 },
            constituencyId: { type: 'string' },
            districtName: { type: 'string', maxLength: 100 },
            durationSeconds: { type: 'integer', minimum: 0, maximum: 3600 },
            hashtags: {
              type: 'array',
              maxItems: 20,
              items: { type: 'string', minLength: 1, maxLength: 80 },
            },
            gradientColors: {
              type: 'array',
              maxItems: 2,
              items: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
            },
            stateAccent: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

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
        if (body.id) {
          const { data: existing, error: existingError } = await supabase
            .from('political_shorts')
            .select('*')
            .eq('id', body.id)
            .maybeSingle();

          if (existingError) {
            app.log.error(
              { err: existingError.message, shortId: body.id, userId: auth.userId },
              'Failed to check an idempotent short upload',
            );
            return sendApiError(
              reply,
              request,
              503,
              'Service Unavailable',
              'The short upload could not be confirmed. Please retry.',
              { code: 'UPLOAD_CONFIRMATION_UNAVAILABLE' },
            );
          }
          if (existing) {
            if (existing.uploaded_by !== auth.userId) {
              return sendApiError(reply, request, 404, 'Not Found', 'Short not found', {
                code: 'SHORT_NOT_FOUND',
              });
            }
            return reply.send({
              success: true,
              id: existing.id,
              short: existing,
              alreadyPersisted: true,
            });
          }
        }

        const title = body.title.trim();
        const videoUrl = body.videoUrl.trim();
        const stateCode = body.stateCode.trim().toUpperCase();
        if (!title || !videoUrl) {
          return sendApiError(
            reply,
            request,
            400,
            'Bad Request',
            'Title and video URL are required',
            {
              code: 'INVALID_SHORT_CONTENT',
            },
          );
        }

        const { data: verification, error: verificationError } = await supabase
          .from('creator_kyc_records')
          .select('status')
          .eq('user_id', auth.userId)
          .maybeSingle();

        if (verificationError) {
          app.log.error(
            { err: verificationError.message, userId: auth.userId },
            'Failed to verify short uploader eligibility',
          );
          return sendApiError(
            reply,
            request,
            503,
            'Service Unavailable',
            'Creator verification could not be checked. Please try again.',
            { code: 'VERIFICATION_UNAVAILABLE' },
          );
        }
        if (verification?.status !== 'verified') {
          return sendApiError(
            reply,
            request,
            403,
            'Forbidden',
            'Verified creator status is required to upload a short.',
            { code: 'CREATOR_VERIFICATION_REQUIRED' },
          );
        }

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('user_id', auth.userId)
          .maybeSingle();
        if (profileError) {
          app.log.warn(
            { err: profileError.message, userId: auth.userId },
            'Could not resolve short channel display name',
          );
        }

        const { data, error } = await supabase
          .from('political_shorts')
          .insert({
            ...(body.id ? { id: body.id } : {}),
            title,
            video_url: videoUrl,
            thumbnail_url: body.thumbnailUrl || null,
            description: body.description?.trim() || null,
            channel_name: profile?.display_name?.trim() || 'Verified contributor',
            channel_verified: true,
            state_code: stateCode,
            state_name: body.stateName?.trim() || null,
            constituency_id: body.constituencyId || null,
            district_name: body.districtName?.trim() || null,
            duration: body.durationSeconds ?? 0,
            hashtags: body.hashtags ?? [],
            gradient_colors: body.gradientColors ?? [],
            state_accent: body.stateAccent || null,
            uploaded_by: auth.userId,
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
      } catch {
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
      } catch {
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
      } catch {
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
