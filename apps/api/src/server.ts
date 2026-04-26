import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { constituencyRoutes } from './routes/constituencies';
import { healthRoutes } from './routes/health';

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

  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(constituencyRoutes, { prefix: '/api/v1' });

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
