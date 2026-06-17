import Fastify from 'fastify';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { constituencyRoutes } from './routes/constituencies';
import { healthRoutes } from './routes/health';
import { aiRoutes } from './routes/ai';
import { notificationRoutes } from './routes/notifications';
import { moderationRoutes } from './routes/moderation';
import { stateRoutes } from './routes/states';
import { delimitationRoutes } from './routes/delimitation';
import { journalistRoutes } from './routes/journalist';
import { politicianRoutes } from './routes/politician';
import { campaignRoutes } from './routes/campaign';
import { civicRoutes } from './routes/civic';

const envToLogger: Record<string, object | boolean> = {
  development: {
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
    },
  },
  production: true,
  test: false,
};

/**
 * Resolve allowed CORS origins. In production an explicit allow-list is
 * required via CORS_ORIGINS (comma-separated); dev/test reflect the origin
 * for local convenience (Gold Standard Ch. 6 — no implicit trust in prod).
 */
function resolveCorsOrigin(env: string): boolean | string[] {
  const configured = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (configured.length > 0) return configured;
  if (env === 'production') return false;
  return true;
}

export async function buildApp() {
  const env = process.env.NODE_ENV ?? 'development';

  const app = Fastify({
    logger: envToLogger[env] ?? true,
  });

  await app.register(cors, {
    origin: resolveCorsOrigin(env),
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  // Rate limiting — protects against abuse / brute force (Ch. 6, 9).
  // Generous ceiling in tests to avoid flakiness; tunable via env in prod.
  await app.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX ?? (env === 'test' ? '100000' : '300'), 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW ?? '1 minute',
  });

  // Global error handler — never leak internal exception detail in production.
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      request.log.error(error);
    }
    const exposeDetail = env !== 'production';
    reply.status(statusCode).send({
      error: statusCode >= 500 ? 'Internal Server Error' : (error.name || 'Bad Request'),
      message:
        statusCode >= 500 && !exposeDetail
          ? 'An unexpected error occurred. Please try again later.'
          : error.message,
    });
  });

  // Consistent 404 for unknown routes.
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
    });
  });

  // Cache static seed-data responses (5 min)
  app.addHook('onSend', async (request, reply, payload) => {
    const url = request.url;
    if (
      url.startsWith('/api/v1/states/') &&
      !url.includes('/ai/') &&
      request.method === 'GET' &&
      reply.statusCode === 200
    ) {
      reply.header('Cache-Control', 'public, max-age=300, s-maxage=300');
    }
    return payload;
  });

  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(constituencyRoutes, { prefix: '/api/v1' });
  await app.register(aiRoutes);
  await app.register(notificationRoutes);
  await app.register(moderationRoutes);
  await app.register(stateRoutes);
  await app.register(delimitationRoutes);
  await app.register(journalistRoutes);
  await app.register(politicianRoutes);
  await app.register(campaignRoutes);
  await app.register(civicRoutes);

  return app;
}

export async function start() {
  const app = await buildApp();
  const port = parseInt(process.env.PORT ?? '3001', 10);
  const host = process.env.HOST ?? '0.0.0.0';

  try {
    await app.listen({ port, host });
    app.log.info(`KSHETRA API running on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  return app;
}

const isMainModule =
  typeof require !== 'undefined' && require.main === module;

if (isMainModule) {
  start();
}
