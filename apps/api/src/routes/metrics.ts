import type { FastifyInstance } from 'fastify';
import { metricsCollector } from '../lib/metrics';

export async function metricsRoutes(app: FastifyInstance) {
  /**
   * GET /api/metrics
   * Exposes operational telemetry, latency distributions, status code breakdowns,
   * process resource consumption, and database connectivity metrics.
   */
  app.get('/metrics', async (request, reply) => {
    const snapshot = metricsCollector.getSnapshot();
    return reply
      .header('Cache-Control', 'no-store, no-cache, must-revalidate')
      .status(200)
      .send(snapshot);
  });
}
