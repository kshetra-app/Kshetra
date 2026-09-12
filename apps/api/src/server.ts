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
import { broadcastRoutes } from './routes/broadcast';
import { geoRoutes } from './routes/geo';
import { newsRoutes } from './routes/news';
import { lmxRoutes } from './routes/lmx';
import { configRoutes } from './routes/config';
import { manageRoutes } from './routes/manage';
import { pagesRoutes } from './routes/pages';
import { policyRoutes } from './routes/policy';
import { randomUUID } from 'crypto';
import { dmRoutes } from './routes/dm';
import { politicalAdsRoutes } from './routes/politicalAds';
import { metricsRoutes } from './routes/metrics';
import { debugRoutes } from './routes/debug';
import { metricsCollector } from './lib/metrics';
import { errorTracker } from './lib/errorTracker';
import { startNewsScheduler } from './services/news/newsService';

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
 * Default production and trusted application origins.
 * Ensures official product domains are always authorized even if CORS_ORIGINS
 * is omitted from container environment variables.
 */
const DEFAULT_ALLOWED_ORIGINS = [
  'https://kshetra.in',
  'https://www.kshetra.in',
  'https://panin.in',
  'https://www.panin.in',
  'https://kshetra.app',
  'https://www.kshetra.app',
];

/**
 * Resolve allowed CORS origins. In production, combines explicit CORS_ORIGINS
 * with DEFAULT_ALLOWED_ORIGINS. In dev/test, permits local callers while preserving credentials.
 */
function resolveCorsOrigin(env: string): boolean | string[] {
  const configured = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const combined = Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]));
  if (configured.length > 0 || env === 'production') {
    return combined;
  }
  return true;
}

export async function buildApp() {
  const env = process.env.NODE_ENV ?? 'development';

  const app = Fastify({
    logger: envToLogger[env] ?? true,
    genReqId: (req: any) => {
      const headers = req?.headers;
      const incomingId = (headers?.['x-request-id'] as string) || (headers?.['x-correlation-id'] as string);
      if (typeof incomingId === 'string') {
        const trimmed = incomingId.trim();
        // Enforce max length 128 chars and safe identifier character set [a-zA-Z0-9_-]
        if (trimmed.length > 0 && trimmed.length <= 128 && /^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
          return trimmed;
        }
      }
      return randomUUID();
    },
    // Set requestIdHeader to false so Fastify delegates ID resolution strictly to genReqId (enforcing length and regex rules)
    requestIdHeader: false,
    requestIdLogLabel: 'reqId',
  });

  // Track request start time for high-resolution latency tracking and metrics collection
  app.addHook('onRequest', async (request: FastifyRequest) => {
    (request as any).startTime = process.hrtime.bigint();
    metricsCollector.onRequestStart();
  });

  // Measure response duration, inject telemetry headers, and record metrics
  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = (request as any).startTime as bigint | undefined;
    let durationMs = 0;
    if (startTime) {
      const elapsedNs = process.hrtime.bigint() - startTime;
      durationMs = Number(elapsedNs) / 1_000_000;
    }
    
    metricsCollector.onRequestEnd(reply.statusCode, durationMs);
  });

  // Inject x-request-id and x-response-time headers on all outgoing responses
  app.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload) => {
    reply.header('x-request-id', request.id);
    
    const startTime = (request as any).startTime as bigint | undefined;
    if (startTime) {
      const elapsedNs = process.hrtime.bigint() - startTime;
      const durationMs = (Number(elapsedNs) / 1_000_000).toFixed(2);
      reply.header('x-response-time', `${durationMs}ms`);
      reply.header('Server-Timing', `total;dur=${durationMs}`);
    }

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

    // Capture error via canonical errorTracker (dispatches structured APPLICATION_ERROR_EVENT and external sink)
    errorTracker.captureError({
      error,
      statusCode,
      requestId: request.id,
      url: request.url,
      method: request.method,
      logger: request.log,
    });

    const exposeDetail = env !== 'production';
    const validationErrors = (error as any).validation as Array<{ instancePath?: string; message?: string; params?: any }> | undefined;
    const details = validationErrors?.map((v) => ({
      path: v.instancePath || (v.params?.missingProperty ? `.${v.params.missingProperty}` : '') || '',
      message: v.message || 'Validation error',
    }));

    reply.status(statusCode).send({
      error:
        statusCode >= 500
          ? 'Internal Server Error'
          : statusCode === 400
          ? 'Bad Request'
          : error.name && error.name !== 'Error'
          ? error.name
          : 'Bad Request',
      message:
        statusCode >= 500 && !exposeDetail
          ? 'An unexpected error occurred. Please try again later.'
          : error.message,
      statusCode,
      requestId: request.id,
      timestamp: new Date().toISOString(),
      ...(details && details.length > 0 ? { details } : {}),
      ...(error.code ? { code: error.code } : {}),
    });
  });

  // Consistent 404 for unknown routes.
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
      statusCode: 404,
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  // Root health endpoints for Cloud Container platforms (Railway, Render, Fly.io)
  app.get('/', async () => ({ status: 'ok', service: 'kshetra-api', version: '0.1.0' }));
  app.get('/health', async () => ({ status: 'ok', service: 'kshetra-api', version: '0.1.0' }));

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
  await app.register(broadcastRoutes);
  await app.register(geoRoutes);
  await app.register(newsRoutes);
  await app.register(lmxRoutes);
  await app.register(configRoutes);
  await app.register(manageRoutes);
  await app.register(pagesRoutes);
  await app.register(policyRoutes);
  await app.register(dmRoutes);
  await app.register(politicalAdsRoutes);
  await app.register(metricsRoutes, { prefix: '/api' });
  await app.register(debugRoutes, { prefix: '/api' });

  return app;
}

export async function start() {
  const app = await buildApp();
  const port = parseInt(process.env.PORT ?? '3001', 10);
  const host = process.env.HOST ?? '0.0.0.0';

  try {
    await app.listen({ port, host });
    app.log.info(`KSHETRA API running on http://${host}:${port}`);
    // Prime the news cache and refresh it hourly.
    startNewsScheduler(app.log);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  return app;
}

// Only start automatically when directly executed as the main entry point
const isDirectExecution = typeof require !== 'undefined' && require.main === module;
if (process.env.NODE_ENV !== 'test' && (process.env.START_SERVER === 'true' || isDirectExecution)) {
  start().catch((err) => {
    console.error('Fatal startup error in KSHETRA API server:', err);
    process.exit(1);
  });
}

