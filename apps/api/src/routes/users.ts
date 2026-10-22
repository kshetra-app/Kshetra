/**
 * Users Follow/Relationship Routes
 * Fastify route handler for user follow / unfollow relationships
 * Master Execution Framework — W021.5-H-04 (Class B Strangler Migration)
 */

import type { FastifyInstance } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendApiError } from '../lib/replyHelper';

export async function userRoutes(app: FastifyInstance) {
  /**
   * 1. POST /api/v1/users/:id/follow
   * Follow user (Class B Method 38: followUser)
   */
  app.post<{
    Params: { id: string };
    Body: { followerId?: string };
  }>('/api/v1/users/:id/follow', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: { followerId: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    const followerId = (request.headers['x-user-id'] as string) || request.body?.followerId;
    if (!followerId) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required', { code: 'UNAUTHORIZED' });
    }

    const { id: targetUserId } = request.params;
    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('user_follows')
          .upsert({
            follower_id: followerId,
            following_id: targetUserId,
            created_at: now,
          }, { onConflict: 'follower_id,following_id' });
      } catch (err: any) {
        app.log.warn({ err: err?.message, followerId, targetUserId }, 'Failed to record user follow in DB');
      }
    }

    return reply.status(201).send({
      success: true,
      followerId,
      targetUserId,
      followed: true,
      followedAt: now,
    });
  });

  /**
   * 2. DELETE /api/v1/users/:id/follow
   * Unfollow user (Class B Method 39: unfollowUser)
   */
  app.delete<{
    Params: { id: string };
    Body: { followerId?: string };
  }>('/api/v1/users/:id/follow', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: { followerId: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    const followerId = (request.headers['x-user-id'] as string) || request.body?.followerId;
    if (!followerId) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required', { code: 'UNAUTHORIZED' });
    }

    const { id: targetUserId } = request.params;

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', followerId)
          .eq('following_id', targetUserId);
      } catch (err: any) {
        app.log.warn({ err: err?.message, followerId, targetUserId }, 'Failed to remove user follow in DB');
      }
    }

    return reply.send({
      success: true,
      followerId,
      targetUserId,
      unfollowed: true,
    });
  });
}
