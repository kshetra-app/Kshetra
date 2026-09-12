import type { FastifyInstance } from 'fastify';
import { DEFAULT_FEATURE_FLAGS, type AppFeatureFlags } from '@kshetra/shared';
import { sendApiError } from '../lib/replyHelper';

// In-memory active flags (can be overridden via admin or persisted in Supabase)
let currentFlags: AppFeatureFlags = { ...DEFAULT_FEATURE_FLAGS };

const getFlagsSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        flags: { type: 'object', additionalProperties: { type: 'boolean' } },
        syncedAt: { type: 'string' },
      },
      required: ['status', 'flags'],
    },
  },
};

export async function configRoutes(app: FastifyInstance) {
  const getFlagsHandler = async () => ({
    status: 'ok',
    flags: currentFlags,
    syncedAt: new Date().toISOString(),
  });

  /**
   * GET /config/flags and /api/v1/config/flags
   * Returns current active feature flags for mobile app and web clients.
   */
  app.get('/config/flags', { schema: getFlagsSchema }, getFlagsHandler);
  app.get('/api/v1/config/flags', { schema: getFlagsSchema }, getFlagsHandler);

  /**
   * PATCH /api/v1/config/flags
   * Update feature flags dynamically (secured in production via API key / JWT).
   */
  app.patch<{
    Body: Partial<AppFeatureFlags>;
  }>('/api/v1/config/flags', {
    schema: {
      body: {
        type: 'object',
        additionalProperties: { type: 'boolean' },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            flags: { type: 'object', additionalProperties: { type: 'boolean' } },
            updatedAt: { type: 'string' },
          },
          required: ['status', 'flags'],
        },
      },
    },
    preValidation: async (request, reply) => {
      const body = request.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return sendApiError(reply, request, 400, 'Bad Request', 'Invalid feature flags payload: expected object', {
          code: 'FST_ERR_VALIDATION',
        });
      }
      for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
        if (typeof value !== 'boolean') {
          return sendApiError(
            reply,
            request,
            400,
            'Bad Request',
            `Flag "${key}" must be a boolean`,
            {
              code: 'FST_ERR_VALIDATION',
              details: [{ path: `.${key}`, message: `must be boolean, received ${value === null ? 'null' : typeof value}` }],
            },
          );
        }
      }
    },
  }, async (request, reply) => {
    const updates = request.body;
    if (!updates || typeof updates !== 'object') {
      return sendApiError(reply, request, 400, 'Bad Request', 'Invalid feature flags payload');
    }

    currentFlags = {
      ...currentFlags,
      ...updates,
    };

    return {
      status: 'updated',
      flags: currentFlags,
      updatedAt: new Date().toISOString(),
    };
  });
}
