import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
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

export async function buildApp() {
  const env = process.env.NODE_ENV ?? 'development';

  const app = Fastify({
    logger: envToLogger[env] ?? true,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
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
