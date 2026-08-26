import type { FastifyInstance } from 'fastify';
import { DEFAULT_FEATURE_FLAGS, type AppFeatureFlags } from '@kshetra/shared';

// In-memory active flags (can be overridden via admin or persisted in Supabase)
let currentFlags: AppFeatureFlags = { ...DEFAULT_FEATURE_FLAGS };

export async function configRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/config/flags
   * Returns current active feature flags for mobile app and web clients.
   */
  app.get('/api/v1/config/flags', async () => {
    return {
      status: 'ok',
      flags: currentFlags,
      syncedAt: new Date().toISOString(),
    };
  });

  /**
   * PATCH /api/v1/config/flags
   * Update feature flags dynamically (secured in production via API key / JWT).
   */
  app.patch('/api/v1/config/flags', async (request, reply) => {
    const updates = request.body as Partial<AppFeatureFlags>;
    if (!updates || typeof updates !== 'object') {
      return reply.code(400).send({ error: 'Invalid feature flags payload' });
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
