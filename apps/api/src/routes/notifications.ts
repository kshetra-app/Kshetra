import type { FastifyInstance } from 'fastify';
import {
  sendExpoPush,
  buildNotificationMessage,
  TRIGGER_CONFIG,
  type NotificationTrigger,
  type NotificationPayload,
} from '../services/notifications';

/**
 * Notification API Routes
 *
 * POST /notifications/register-token   — Register/update a push token
 * POST /notifications/send             — Send a notification (service-to-service)
 * GET  /notifications/preferences      — Get user notification preferences
 * PUT  /notifications/preferences      — Update user notification preferences
 * GET  /notifications/triggers         — List available trigger types
 */
export async function notificationRoutes(app: FastifyInstance) {

  // Register push token
  app.post<{
    Body: { token: string; platform: 'ios' | 'android' | 'web'; deviceName?: string };
  }>('/api/v1/notifications/register-token', {
    schema: {
      body: {
        type: 'object',
        required: ['token', 'platform'],
        properties: {
          token: { type: 'string' },
          platform: { type: 'string', enum: ['ios', 'android', 'web'] },
          deviceName: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    // In production, extract user from auth header via Supabase JWT
    const userId = request.headers['x-user-id'] as string;
    if (!userId) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { token, platform, deviceName } = request.body;

    // Upsert token — in production, this would use Supabase client
    // For now, return success with the token info
    app.log.info({ userId, platform, deviceName }, 'Push token registered');

    return reply.send({
      success: true,
      data: {
        userId,
        token: token.slice(0, 20) + '...', // Don't echo full token
        platform,
        deviceName: deviceName ?? null,
      },
    });
  });

  // Send notification (internal / service-to-service)
  app.post<{
    Body: NotificationPayload;
  }>('/api/v1/notifications/send', {
    schema: {
      body: {
        type: 'object',
        required: ['userId', 'trigger', 'title', 'body'],
        properties: {
          userId: { type: 'string' },
          trigger: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          data: { type: 'object' },
          sourcePostId: { type: 'string' },
          sourceCommentId: { type: 'string' },
          sourceIssueId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    // In production, verify service role or admin auth
    const apiKey = request.headers['x-api-key'] as string;
    if (!apiKey) {
      return reply.status(401).send({ error: 'API key required' });
    }

    const payload = request.body;

    // In production:
    // 1. Look up user's push tokens from push_tokens table
    // 2. Check notification_preferences to see if trigger is enabled
    // 3. Insert into notification_log
    // 4. Send via Expo Push API

    app.log.info(
      { userId: payload.userId, trigger: payload.trigger },
      'Notification dispatched',
    );

    return reply.send({
      success: true,
      data: {
        userId: payload.userId,
        trigger: payload.trigger,
        dispatched: true,
      },
    });
  });

  // Get notification preferences
  app.get('/api/v1/notifications/preferences', async (request, reply) => {
    const userId = request.headers['x-user-id'] as string;
    if (!userId) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    // In production, fetch from notification_preferences table
    // Return defaults for now
    const defaults = Object.entries(TRIGGER_CONFIG).map(([trigger, config]) => ({
      trigger,
      label: config.label,
      description: config.description,
      pushEnabled: config.defaultPush,
      inAppEnabled: config.defaultInApp,
    }));

    return reply.send({ success: true, data: defaults });
  });

  // Update notification preferences
  app.put<{
    Body: { trigger: NotificationTrigger; pushEnabled: boolean; inAppEnabled: boolean };
  }>('/api/v1/notifications/preferences', {
    schema: {
      body: {
        type: 'object',
        required: ['trigger', 'pushEnabled', 'inAppEnabled'],
        properties: {
          trigger: { type: 'string' },
          pushEnabled: { type: 'boolean' },
          inAppEnabled: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.headers['x-user-id'] as string;
    if (!userId) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { trigger, pushEnabled, inAppEnabled } = request.body;
    app.log.info({ userId, trigger, pushEnabled, inAppEnabled }, 'Preference updated');

    return reply.send({
      success: true,
      data: { trigger, pushEnabled, inAppEnabled },
    });
  });

  // List trigger types (public)
  app.get('/api/v1/notifications/triggers', async (_request, reply) => {
    const triggers = Object.entries(TRIGGER_CONFIG).map(([key, config]) => ({
      trigger: key,
      ...config,
    }));
    return reply.send({ success: true, data: triggers });
  });
}
