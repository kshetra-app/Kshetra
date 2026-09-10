import type { FastifyInstance } from 'fastify';

export async function debugRoutes(app: FastifyInstance) {
  /**
   * CONTROLLED ERROR GENERATOR (JOB W004-R1 / Observability Evidence)
   * GET /api/debug/error?type=unhandled | db_failure | bad_request | unauthorized
   * 
   * PRODUCTION PROTECTION MANDATE (W004-R1 Task 1):
   * In PRODUCTION, this route is disabled and returns 404 Not Found (or 403 Forbidden).
   * In TEST, DEVELOPMENT, or STAGING, it remains active as a diagnostic test seam.
   * Privileged bypass in staging/prod requires header: x-debug-bypass-secret === process.env.DEBUG_BYPASS_SECRET.
   */
  app.get('/debug/error', async (request, reply) => {
    const env = process.env.NODE_ENV || 'development';
    const bypassSecret = process.env.DEBUG_BYPASS_SECRET;
    const incomingSecret = request.headers['x-debug-bypass-secret'];

    // In production, strictly reject unless authorized via explicit debug bypass secret
    if (env === 'production') {
      const isAuthorized = bypassSecret && incomingSecret && bypassSecret.length >= 16 && incomingSecret === bypassSecret;
      if (!isAuthorized) {
        request.log.warn({
          msg: 'Unauthorized production attempt to access /api/debug/error rejected',
          requestId: request.id,
          ip: request.ip,
        });
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Route GET /api/debug/error not found',
          statusCode: 404,
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const { type } = (request.query as { type?: string }) || {};

    request.log.warn({
      msg: 'Controlled test error requested',
      errorType: type || 'unhandled',
      requestId: request.id,
      environment: env,
    });

    switch (type) {
      case 'bad_request': {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Controlled client validation failure for observability testing',
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }
      case 'unauthorized': {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Controlled authentication failure for observability testing',
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }
      case 'db_failure': {
        const dbErr = new Error('Controlled synthetic database timeout [PGRST_MOCK_TIMEOUT]');
        (dbErr as any).statusCode = 503;
        throw dbErr;
      }
      case 'unhandled':
      default: {
        throw new Error('Controlled synthetic internal server error for W004 observability evidence');
      }
    }
  });
}
