import type { FastifyInstance } from 'fastify';
import { metricsCollector } from '../lib/metrics';

export async function metricsRoutes(app: FastifyInstance) {
  /**
   * GET /api/metrics
   * Exposes operational telemetry, latency distributions, status code breakdowns,
   * process resource consumption, and database connectivity metrics.
   * 
   * PRODUCTION PROTECTION MANDATE (W004-R1A / DEC-021):
   * Operational telemetry exposes internal memory, process IDs, and health statistics.
   * In PRODUCTION, access requires a dedicated monitoring token (Bearer token or x-metrics-token header)
   * matching METRICS_AUTH_TOKEN exclusively. SUPABASE_SERVICE_ROLE_KEY is NOT accepted as a fallback.
   * If METRICS_AUTH_TOKEN is not configured, production metrics access fails closed (401).
   * In TEST and DEVELOPMENT, open access is retained for local verification.
   */
  app.get('/metrics', async (request, reply) => {
    const env = process.env.NODE_ENV || 'development';

    if (env === 'production') {
      const authHeader = request.headers['authorization'] || '';
      const tokenHeader = request.headers['x-metrics-token'] as string | undefined;
      const expectedToken = process.env.METRICS_AUTH_TOKEN;

      const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
      const providedToken = bearerToken || tokenHeader;

      const isAuthorized = expectedToken && providedToken && providedToken === expectedToken;

      if (!isAuthorized) {
        request.log.warn({
          msg: 'Unauthorized production attempt to access /api/metrics rejected',
          requestId: request.id,
          ip: request.ip,
        });
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Access to operational metrics requires authorized monitoring credentials',
          statusCode: 401,
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const snapshot = metricsCollector.getSnapshot();
    return reply
      .header('Cache-Control', 'no-store, no-cache, must-revalidate')
      .status(200)
      .send(snapshot);
  });
}
