/**
 * apps/api/src/routes/politicalEntities.ts
 *
 * Fastify routes implementing Milestone W018 Canonical Political Entity API:
 * - GET  /api/v1/entities/search
 * - GET  /api/v1/entities/persons/:id
 * - GET  /api/v1/entities/persons/:id/timeline
 * - GET  /api/v1/entities/organizations/:id
 * - GET  /api/v1/entities/legislators
 * - POST /api/v1/entities/persons/:id/claim
 *
 * Security Model:
 * - Read routes (search, profile, timeline, org, legislators): Public SELECT.
 * - Claim route: Requires authenticated user or service_role. Anon fails closed (401).
 *   Standard users submit a pending review claim (W018-SEC-02).
 *   Only service_role can approve/bind directly.
 * - Standardized error envelopes via sendApiError.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { politicalEntityService } from '../services/politicalEntityService';
import { sendApiError } from '../lib/replyHelper';
import { supabase } from '../lib/supabase';

const searchQuerySchema = {
  type: 'object',
  properties: {
    q: { type: 'string' },
    type: { type: 'string', enum: ['person', 'organization'] },
    state: { type: 'string' },
    role: { type: 'string' },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 },
  },
};

const personParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
};

const orgParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
};

const legislatorsQuerySchema = {
  type: 'object',
  properties: {
    state: { type: 'string' },
    house: { type: 'string', enum: ['assembly', 'parliament'] },
    currentOnly: { type: 'boolean', default: true },
  },
};

const claimBodySchema = {
  type: 'object',
  required: ['verificationType'],
  properties: {
    verificationType: { type: 'string', minLength: 2 },
    evidenceUrl: { type: 'string' },
    notes: { type: 'string' },
  },
};

export async function politicalEntityRoutes(app: FastifyInstance): Promise<void> {
  /**
   * Helper: Resolve caller role (anon, authenticated, service_role).
   */
  async function resolveCaller(request: FastifyRequest): Promise<{
    role: 'anon' | 'authenticated' | 'service_role';
    userId?: string;
  }> {
    const authHeader = request.headers.authorization;
    const testRole = request.headers['x-test-role'] as string | undefined;
    const testUserId = request.headers['x-test-user-id'] as string | undefined;

    if (process.env.NODE_ENV === 'test' && testRole) {
      if (testRole === 'service_role' || testRole === 'authenticated') {
        return { role: testRole as 'service_role' | 'authenticated', userId: testUserId || 'test-user-id' };
      }
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { role: 'anon' };
    }

    const token = authHeader.slice(7).trim();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey && token === serviceRoleKey) {
      return { role: 'service_role', userId: 'service_role' };
    }

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);
      if (error || !user) {
        return { role: 'anon' };
      }
      return { role: 'authenticated', userId: user.id };
    } catch {
      return { role: 'anon' };
    }
  }

  /**
   * 1. Search Political Entities (Persons & Organizations)
   * GET /api/v1/entities/search
   */
  app.get<{
    Querystring: {
      q?: string;
      type?: 'person' | 'organization';
      state?: string;
      role?: string;
      limit?: number;
      offset?: number;
    };
  }>(
    '/api/v1/entities/search',
    { schema: { querystring: searchQuerySchema } },
    async (request, reply) => {
      try {
        const results = await politicalEntityService.searchEntities(request.query);
        return reply.status(200).send({ data: results });
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return sendApiError(reply, request, statusCode, 'Search Error', err.message, {
          code: err.code || 'ENTITY_SEARCH_ERROR',
        });
      }
    }
  );

  /**
   * 2. Get Canonical Person Profile
   * GET /api/v1/entities/persons/:id
   */
  app.get<{
    Params: { id: string };
  }>(
    '/api/v1/entities/persons/:id',
    { schema: { params: personParamsSchema } },
    async (request, reply) => {
      try {
        const person = await politicalEntityService.getPersonById(request.params.id);
        return reply.status(200).send({ data: person });
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return sendApiError(
          reply,
          request,
          statusCode,
          statusCode === 404 ? 'Not Found' : 'Internal Server Error',
          err.message,
          { code: err.code || 'PERSON_FETCH_ERROR' }
        );
      }
    }
  );

  /**
   * 3. Get Political Career Timeline
   * GET /api/v1/entities/persons/:id/timeline
   */
  app.get<{
    Params: { id: string };
  }>(
    '/api/v1/entities/persons/:id/timeline',
    { schema: { params: personParamsSchema } },
    async (request, reply) => {
      try {
        const timeline = await politicalEntityService.getPersonCareerTimeline(request.params.id);
        return reply.status(200).send({ data: timeline });
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return sendApiError(
          reply,
          request,
          statusCode,
          statusCode === 404 ? 'Not Found' : 'Internal Server Error',
          err.message,
          { code: err.code || 'TIMELINE_FETCH_ERROR' }
        );
      }
    }
  );

  /**
   * 4. Get Political Organization
   * GET /api/v1/entities/organizations/:id
   */
  app.get<{
    Params: { id: string };
  }>(
    '/api/v1/entities/organizations/:id',
    { schema: { params: orgParamsSchema } },
    async (request, reply) => {
      try {
        const organization = await politicalEntityService.getOrganizationById(request.params.id);
        return reply.status(200).send({ data: organization });
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return sendApiError(
          reply,
          request,
          statusCode,
          statusCode === 404 ? 'Not Found' : 'Internal Server Error',
          err.message,
          { code: err.code || 'ORGANIZATION_FETCH_ERROR' }
        );
      }
    }
  );

  /**
   * 5. List Current Legislators
   * GET /api/v1/entities/legislators
   */
  app.get<{
    Querystring: {
      state?: string;
      house?: 'assembly' | 'parliament';
      currentOnly?: boolean;
    };
  }>(
    '/api/v1/entities/legislators',
    { schema: { querystring: legislatorsQuerySchema } },
    async (request, reply) => {
      try {
        const result = await politicalEntityService.listCurrentLegislators(request.query);
        return reply.status(200).send({ data: result });
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return sendApiError(reply, request, statusCode, 'Legislators Query Error', err.message, {
          code: err.code || 'LEGISLATORS_QUERY_ERROR',
        });
      }
    }
  );

  /**
   * 6. Claim Person Identity
   * POST /api/v1/entities/persons/:id/claim
   * Requires authenticated user or service_role. Anon -> 401.
   */
  app.post<{
    Params: { id: string };
    Body: {
      verificationType: string;
      evidenceUrl?: string;
      notes?: string;
    };
  }>(
    '/api/v1/entities/persons/:id/claim',
    { schema: { params: personParamsSchema, body: claimBodySchema } },
    async (request, reply) => {
      const caller = await resolveCaller(request);
      if (caller.role === 'anon') {
        return sendApiError(
          reply,
          request,
          401,
          'Unauthorized',
          'Authentication required to claim a political person identity.',
          { code: 'AUTHENTICATION_REQUIRED' }
        );
      }

      try {
        const isServiceRole = caller.role === 'service_role';
        const result = await politicalEntityService.claimPersonIdentity(
          request.params.id,
          caller.userId || 'unknown-user',
          request.body,
          isServiceRole
        );
        return reply.status(200).send({ data: result });
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        return sendApiError(
          reply,
          request,
          statusCode,
          statusCode === 404 ? 'Not Found' : statusCode === 409 ? 'Conflict' : 'Internal Server Error',
          err.message,
          { code: err.code || 'CLAIM_ERROR' }
        );
      }
    }
  );
}
