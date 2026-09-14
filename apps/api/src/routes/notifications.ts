import type { FastifyInstance } from 'fastify';
import { sendApiError } from '../lib/replyHelper';
import {
  TRIGGER_CONFIG,
  type NotificationTrigger,
  type NotificationPayload,
} from '../services/notifications';

// Reusable schemas for notification operations
const registerTokenSchema = {
  body: {
    type: 'object',
    required: ['token', 'platform'],
    properties: {
      token: { type: 'string', minLength: 1 },
      platform: { type: 'string', enum: ['ios', 'android', 'web'] },
      deviceName: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            token: { type: 'string' },
            platform: { type: 'string' },
            deviceName: { type: ['string', 'null'] },
          },
          required: ['userId', 'token', 'platform'],
        },
      },
      required: ['success', 'data'],
    },
  },
};

const sendNotificationSchema = {
  body: {
    type: 'object',
    required: ['userId', 'trigger', 'title', 'body'],
    properties: {
      userId: { type: 'string', minLength: 1 },
      trigger: { type: 'string', minLength: 1 },
      title: { type: 'string', minLength: 1 },
      body: { type: 'string', minLength: 1 },
      data: { type: 'object' },
      sourcePostId: { type: 'string' },
      sourceCommentId: { type: 'string' },
      sourceIssueId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            trigger: { type: 'string' },
            dispatched: { type: 'boolean' },
          },
          required: ['userId', 'trigger', 'dispatched'],
        },
      },
      required: ['success', 'data'],
    },
  },
};

const getPreferencesSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              trigger: { type: 'string' },
              label: { type: 'string' },
              description: { type: 'string' },
              pushEnabled: { type: 'boolean' },
              inAppEnabled: { type: 'boolean' },
            },
            required: ['trigger', 'label', 'description', 'pushEnabled', 'inAppEnabled'],
          },
        },
      },
      required: ['success', 'data'],
    },
  },
};

const updatePreferencesSchema = {
  body: {
    type: 'object',
    required: ['trigger', 'pushEnabled', 'inAppEnabled'],
    properties: {
      trigger: { type: 'string', minLength: 1 },
      pushEnabled: { type: 'boolean' },
      inAppEnabled: { type: 'boolean' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            trigger: { type: 'string' },
            pushEnabled: { type: 'boolean' },
            inAppEnabled: { type: 'boolean' },
          },
          required: ['trigger', 'pushEnabled', 'inAppEnabled'],
        },
      },
      required: ['success', 'data'],
    },
  },
};

const getTriggersSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              trigger: { type: 'string' },
              label: { type: 'string' },
              description: { type: 'string' },
              defaultPush: { type: 'boolean' },
              defaultInApp: { type: 'boolean' },
            },
            required: ['trigger', 'label', 'description'],
          },
        },
      },
      required: ['success', 'data'],
    },
  },
};

/**
 * Notification API Routes
 *
 * POST /api/v1/notifications/register-token   — Register/update a push token (Non-DB logging stub)
 * POST /api/v1/notifications/send             — Send a notification (service-to-service)
 * GET  /api/v1/notifications/preferences      — Get user notification preferences
 * PUT  /api/v1/notifications/preferences      — Update user notification preferences
 * GET  /api/v1/notifications/triggers         — List available trigger types
 */
export async function notificationRoutes(app: FastifyInstance) {

  // 1. Register push token (Non-DB logging route)
  app.post<{
    Body: { token: string; platform: 'ios' | 'android' | 'web'; deviceName?: string };
  }>('/api/v1/notifications/register-token', {
    schema: registerTokenSchema,
  }, async (request, reply) => {
    const userId = request.headers['x-user-id'] as string;
    if (!userId) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required', { code: 'UNAUTHORIZED' });
    }

    const { token, platform, deviceName } = request.body;

    // Non-DB invariant: Do NOT insert into device_tokens table. Return success with token info.
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

  // 2. Send notification (internal / service-to-service)
  app.post<{
    Body: NotificationPayload;
  }>('/api/v1/notifications/send', {
    schema: sendNotificationSchema,
  }, async (request, reply) => {
    const apiKey = request.headers['x-api-key'] as string;
    if (!apiKey) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'API key required', { code: 'UNAUTHORIZED' });
    }

    const payload = request.body;

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

  // 3. Get notification preferences
  app.get('/api/v1/notifications/preferences', {
    schema: getPreferencesSchema,
  }, async (request, reply) => {
    const userId = request.headers['x-user-id'] as string;
    if (!userId) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required', { code: 'UNAUTHORIZED' });
    }

    const defaults = Object.entries(TRIGGER_CONFIG).map(([trigger, config]) => ({
      trigger,
      label: config.label,
      description: config.description,
      pushEnabled: config.defaultPush,
      inAppEnabled: config.defaultInApp,
    }));

    return reply.send({ success: true, data: defaults });
  });

  // 4. Update notification preferences
  app.put<{
    Body: { trigger: NotificationTrigger; pushEnabled: boolean; inAppEnabled: boolean };
  }>('/api/v1/notifications/preferences', {
    schema: updatePreferencesSchema,
  }, async (request, reply) => {
    const userId = request.headers['x-user-id'] as string;
    if (!userId) {
      return sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required', { code: 'UNAUTHORIZED' });
    }

    const { trigger, pushEnabled, inAppEnabled } = request.body;
    app.log.info({ userId, trigger, pushEnabled, inAppEnabled }, 'Preference updated');

    return reply.send({
      success: true,
      data: { trigger, pushEnabled, inAppEnabled },
    });
  });

  // 5. List trigger types (public)
  app.get('/api/v1/notifications/triggers', {
    schema: getTriggersSchema,
  }, async (_request, reply) => {
    const triggers = Object.entries(TRIGGER_CONFIG).map(([key, config]) => ({
      trigger: key,
      ...config,
    }));
    return reply.send({ success: true, data: triggers });
  });
}
