/**
 * Users Follow/Relationship Routes
 * Fastify route handler for user follow / unfollow relationships
 * Master Execution Framework — W021.5-H-04 (Class B Strangler Migration) / CTO Directive 138
 */

import type { FastifyInstance } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendApiError } from '../lib/replyHelper';
import { resolveAuthenticatedUser, assertActingUserMatch } from '../lib/userAuth';

export async function userRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/users/me/following
   * Return the signed-in user's own follow graph. This list can expose sensitive
   * political interests, so it is never addressable by a caller-supplied user ID.
   */
  app.get(
    '/api/v1/users/me/following',
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (!isSupabaseConfigured) {
        return sendApiError(reply, request, 503, 'Service Unavailable', 'Database service is not configured', {
          code: 'SERVICE_UNAVAILABLE',
        });
      }

      try {
        const { data, error } = await supabase
          .from('user_follows')
          .select('followed_id')
          .eq('follower_id', auth.userId);
        if (error) {
          return sendApiError(reply, request, 500, 'Internal Server Error', 'Database error loading follows', {
            code: 'DATABASE_ERROR',
          });
        }
        return reply.send({ success: true, followedUserIds: (data ?? []).map((row) => row.followed_id) });
      } catch {
        return sendApiError(reply, request, 500, 'Internal Server Error', 'Database error loading follows', {
          code: 'DATABASE_ERROR',
        });
      }
    },
  );

  /**
   * 1. POST /api/v1/users/:id/follow
   * Follow user (Class B Method 38: followUser)
   */
  app.post<{
    Params: { id: string };
    Body: { followerId?: string };
  }>(
    '/api/v1/users/:id/follow',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: ['object', 'null'],
          properties: { followerId: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (
        !assertActingUserMatch(reply, request, auth.userId, request.body?.followerId, 'followerId')
      ) {
        return;
      }

      const followerId = auth.userId;
      const { id: targetUserId } = request.params;
      if (targetUserId === followerId) {
        return sendApiError(reply, request, 400, 'Bad Request', 'You cannot follow your own account', {
          code: 'SELF_FOLLOW_NOT_ALLOWED',
        });
      }
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
        const { error } = await supabase.from('user_follows').upsert(
          {
            follower_id: followerId,
            followed_id: targetUserId,
            created_at: now,
          },
          { onConflict: 'follower_id,followed_id' },
        );

        if (error) {
          app.log.error(
            { err: error.message, followerId, targetUserId },
            'Failed to record user follow in DB',
          );
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            'Database error recording follow',
            {
              code: 'DATABASE_ERROR',
            },
          );
        }
      } catch (err: any) {
        app.log.error(
          { err: err?.message, followerId, targetUserId },
          'Exception recording user follow in DB',
        );
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error recording follow',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }

      return reply.status(201).send({
        success: true,
        followerId,
        targetUserId,
        followed: true,
        followedAt: now,
      });
    },
  );

  /**
   * 2. DELETE /api/v1/users/:id/follow
   * Unfollow user (Class B Method 39: unfollowUser)
   */
  app.delete<{
    Params: { id: string };
    Body: { followerId?: string };
  }>(
    '/api/v1/users/:id/follow',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: ['object', 'null'],
          properties: { followerId: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const auth = await resolveAuthenticatedUser(request, reply);
      if (!auth) return;

      if (
        !assertActingUserMatch(reply, request, auth.userId, request.body?.followerId, 'followerId')
      ) {
        return;
      }

      const followerId = auth.userId;
      const { id: targetUserId } = request.params;

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
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', followerId)
          .eq('followed_id', targetUserId);

        if (error) {
          app.log.error(
            { err: error.message, followerId, targetUserId },
            'Failed to remove user follow in DB',
          );
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            'Database error removing follow',
            {
              code: 'DATABASE_ERROR',
            },
          );
        }
      } catch (err: any) {
        app.log.error(
          { err: err?.message, followerId, targetUserId },
          'Exception removing user follow in DB',
        );
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error removing follow',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }

      return reply.send({
        success: true,
        followerId,
        targetUserId,
        unfollowed: true,
      });
    },
  );
  /**
   * 3. PATCH /api/v1/user/profile — Update user profile (Class B Methods 46/47)
   */
  app.patch<{
    Body: {
      displayName?: string;
      avatarUrl?: string;
      bio?: string;
      constituencyId?: string;
      preferredLanguage?: string;
      stateCode?: string;
      userId?: string;
    };
  }>(
    '/api/v1/user/profile',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            displayName: { type: 'string', minLength: 1, maxLength: 100 },
            avatarUrl: { type: 'string' },
            bio: { type: 'string', maxLength: 500 },
            constituencyId: { type: 'string' },
            preferredLanguage: { type: 'string' },
            stateCode: { type: 'string' },
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

      const { displayName, avatarUrl, bio, constituencyId, preferredLanguage, stateCode } =
        request.body;
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (displayName !== undefined) updates.display_name = displayName;
      if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
      if (bio !== undefined) updates.bio = bio;
      if (constituencyId !== undefined) updates.constituency_id = constituencyId;
      if (preferredLanguage !== undefined) updates.preferred_language = preferredLanguage;
      if (stateCode !== undefined) updates.state_code = stateCode;

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .update(updates)
          .eq('user_id', auth.userId)
          .select('*')
          .maybeSingle();

        if (error) {
          return sendApiError(reply, request, 500, 'Internal Server Error', error.message, {
            code: 'DATABASE_ERROR',
          });
        }

        return reply.send({ success: true, profile: data });
      } catch (err: any) {
        return sendApiError(
          reply,
          request,
          500,
          'Internal Server Error',
          'Database error updating profile',
          {
            code: 'DATABASE_ERROR',
          },
        );
      }
    },
  );
}
