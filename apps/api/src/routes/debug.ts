import type { FastifyInstance } from 'fastify';

export async function debugRoutes(app: FastifyInstance) {
  /**
   * CONTROLLED ERROR GENERATOR (JOB W004 / Observability Evidence)
   * GET /api/debug/error?type=unhandled | db_failure | bad_request | unauthorized
   * 
   * Provides a deterministic test seam to generate controlled errors, proving:
   * 1. Proper error interception by global errorHandler.
   * 2. Sanitization of production error messages.
   * 3. Logging with correlation ID (x-request-id).
   * 4. Structured status code and JSON envelope propagation.
   */
  app.get('/debug/error', async (request, reply) => {
    const { type } = (request.query as { type?: string }) || {};

    request.log.warn({
      msg: 'Controlled test error requested',
      errorType: type || 'unhandled',
      requestId: request.id,
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
