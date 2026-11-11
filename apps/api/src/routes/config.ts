import { isProductionLikeRuntime } from '../lib/runtimeEnvironment';
import type { FastifyInstance } from 'fastify';
import { DEFAULT_FEATURE_FLAGS, type AppFeatureFlags } from '@kshetra/shared';
import { sendApiError } from '../lib/replyHelper';
import { resolveAuthenticatedUser } from '../lib/userAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const isProductionRuntime = isProductionLikeRuntime();

// Development and isolated tests use this process-local copy. Production reads and writes Supabase.
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

async function readDatabaseFlags() {
  const { data, error } = await supabase
    .from('platform_feature_flags')
    .select('flag_key, flag_value');
  if (error) throw error;

  const flags: AppFeatureFlags = { ...DEFAULT_FEATURE_FLAGS };
  for (const row of data ?? []) {
    if (
      Object.prototype.hasOwnProperty.call(flags, row.flag_key) &&
      typeof row.flag_value === 'boolean'
    ) {
      flags[row.flag_key as keyof AppFeatureFlags] = row.flag_value;
    }
  }
  return flags;
}

export async function configRoutes(app: FastifyInstance) {
  const getFlagsHandler = async (request: any, reply: any) => {
    if (isProductionRuntime) {
      if (!isSupabaseConfigured) {
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Feature flag storage is unavailable',
          { code: 'DATABASE_UNAVAILABLE' },
        );
      }
      try {
        return {
          status: 'ok',
          flags: await readDatabaseFlags(),
          syncedAt: new Date().toISOString(),
        };
      } catch (error: any) {
        app.log.error({ err: error?.message }, 'Failed to read persisted feature flags');
        return sendApiError(
          reply,
          request,
          503,
          'Service Unavailable',
          'Feature flags could not be loaded from storage',
          { code: 'DATABASE_ERROR' },
        );
      }
    }
    return { status: 'ok', flags: currentFlags, syncedAt: new Date().toISOString() };
  };

  app.get('/config/flags', { schema: getFlagsSchema }, getFlagsHandler);
  app.get('/api/v1/config/flags', { schema: getFlagsSchema }, getFlagsHandler);

  app.patch<{ Body: Partial<AppFeatureFlags> }>(
    '/api/v1/config/flags',
    {
      schema: {
        body: { type: 'object', additionalProperties: { type: 'boolean' } },
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
          return sendApiError(
            reply,
            request,
            400,
            'Bad Request',
            'Invalid feature flags payload: expected object',
            {
              code: 'FST_ERR_VALIDATION',
              details: [{ path: '', message: 'Expected a feature-flags object.' }],
            },
          );
        }
        const knownFlags = new Set(Object.keys(DEFAULT_FEATURE_FLAGS));
        for (const [key, value] of Object.entries(body)) {
          if (!knownFlags.has(key) || typeof value !== 'boolean') {
            return sendApiError(
              reply,
              request,
              400,
              'Bad Request',
              `Unknown feature flag or invalid value for "${key}"`,
              {
                code: 'FST_ERR_VALIDATION',
                details: [
                  {
                    path: `.${key}`,
                    message: 'Flag must be known and its value must be a boolean.',
                  },
                ],
              },
            );
          }
        }
      },
    },
    async (request, reply) => {
      const updates = request.body;

      if (isProductionRuntime) {
        const actor = await resolveAuthenticatedUser(request, reply);
        if (!actor) return;
        if (!['admin', 'super_admin'].includes(actor.role)) {
          return sendApiError(
            reply,
            request,
            403,
            'Forbidden',
            'An administrator role is required to update feature flags',
            { code: 'FORBIDDEN' },
          );
        }
        if (!isSupabaseConfigured) {
          return sendApiError(
            reply,
            request,
            503,
            'Service Unavailable',
            'Feature flag storage is unavailable',
            { code: 'DATABASE_UNAVAILABLE' },
          );
        }

        const before = await readDatabaseFlags().catch((error: any) => {
          app.log.error({ err: error?.message }, 'Failed to load feature flags before update');
          return null;
        });
        if (!before) {
          return sendApiError(
            reply,
            request,
            503,
            'Service Unavailable',
            'Feature flags could not be loaded before update',
            { code: 'DATABASE_ERROR' },
          );
        }

        const updatedAt = new Date().toISOString();
        const rows = Object.entries(updates).map(([key, value]) => ({
          flag_key: key,
          flag_value: value,
          description: `Runtime application flag: ${key}`,
          updated_by: actor.userId,
          updated_at: updatedAt,
        }));
        if (rows.length > 0) {
          const { error } = await supabase
            .from('platform_feature_flags')
            .upsert(rows, { onConflict: 'flag_key' });
          if (error) {
            app.log.error({ err: error.message }, 'Failed to persist feature flag updates');
            return sendApiError(
              reply,
              request,
              500,
              'Internal Server Error',
              'Feature flag changes were not saved',
              { code: 'PERSISTENCE_ERROR' },
            );
          }
        }

        let flags: AppFeatureFlags;
        try {
          flags = await readDatabaseFlags();
        } catch (error: any) {
          app.log.error({ err: error?.message }, 'Failed to reload persisted feature flags');
          return sendApiError(
            reply,
            request,
            500,
            'Internal Server Error',
            'Saved flags could not be confirmed',
            { code: 'PERSISTENCE_ERROR' },
          );
        }
        return reply.send({ status: 'updated', flags, updatedAt });
      }

      currentFlags = { ...currentFlags, ...updates };
      return reply.send({
        status: 'updated',
        flags: currentFlags,
        updatedAt: new Date().toISOString(),
      });
    },
  );
}
