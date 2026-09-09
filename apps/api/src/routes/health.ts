import type { FastifyInstance } from 'fastify';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export async function healthRoutes(app: FastifyInstance) {
  /**
   * LIVENESS PROBE
   * Semantics: LIVENESS
   * Verifies that the API HTTP process is healthy, responsive, and accepting traffic.
   * Does NOT assert downstream database connectivity (Rule SI-001 / Amendment v1.4 Part 18).
   */
  app.get('/health', async () => {
    return {
      status: 'ok',
      semanticType: 'LIVENESS',
      service: 'kshetra-api',
      version: '0.1.0',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  });

  /**
   * DATABASE READINESS PROBE
   * Semantics: DATABASE CONNECTIVITY & READINESS
   * Verifies live database connectivity via an actual query to PostgreSQL (PostgREST / Supabase).
   * Satisfies Amendment v1.4 Part 18 & Part 5 mandates.
   */
  app.get('/health/db', async (request, reply) => {
    if (!isSupabaseConfigured) {
      return reply.status(503).send({
        status: 'degraded',
        semanticType: 'DATABASE CONNECTIVITY',
        service: 'kshetra-api',
        connected: false,
        error: 'SUPABASE_URL or API keys are not configured',
        timestamp: new Date().toISOString(),
      });
    }

    const startTime = Date.now();
    try {
      // Query minimal single row from core states table to prove DB roundtrip
      const { data, error } = await supabase.from('states').select('code').limit(1);

      const latencyMs = Date.now() - startTime;
      if (error) {
        return reply.status(503).send({
          status: 'error',
          semanticType: 'DATABASE CONNECTIVITY',
          service: 'kshetra-api',
          connected: false,
          error: error.message,
          latencyMs,
          timestamp: new Date().toISOString(),
        });
      }

      return reply.status(200).send({
        status: 'ok',
        semanticType: 'DATABASE CONNECTIVITY',
        service: 'kshetra-api',
        connected: true,
        latencyMs,
        rowsReturned: data ? data.length : 0,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      return reply.status(503).send({
        status: 'error',
        semanticType: 'DATABASE CONNECTIVITY',
        service: 'kshetra-api',
        connected: false,
        error: err.message || 'Database connection failure',
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * ALIAS FOR READINESS
   */
  app.get('/health/ready', async (request, reply) => {
    return app.inject({ method: 'GET', url: '/api/health/db' }).then(res => {
      reply.status(res.statusCode).send(JSON.parse(res.payload));
    });
  });
}

