/**
 * apps/api/src/routes/elections.ts
 *
 * Fastify routes implementing Milestone W019 Election Data Normalization API:
 * - GET /api/v1/elections
 * - GET /api/v1/elections/:id
 * - GET /api/v1/elections/:id/contests
 * - GET /api/v1/elections/:id/contests/:constituencyId
 * - GET /api/v1/elections/persons/:personId
 *
 * Security & Governance Model:
 * - All routes are public read (anon, authenticated, service_role).
 * - Standardized envelope formatting via ECC-001.
 * - Input validation using JSON schema.
 * - Fail-closed error handling with sendApiError.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { electionService } from '../services/electionService';
import { sendApiError } from '../lib/replyHelper';

interface ListElectionsQuery {
  state?: string;
  year?: number;
  type?: string;
  limit?: number;
  offset?: number;
}

interface ListContestsQuery {
  search?: string;
  party?: string;
  limit?: number;
  offset?: number;
}

const listElectionsQuerySchema = {
  type: 'object',
  properties: {
    state: { type: 'string' },
    year: { type: 'integer' },
    type: { type: 'string', enum: ['assembly', 'parliamentary', 'local_body', 'by_election'] },
    limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 },
  },
};

const electionParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
};

const listContestsQuerySchema = {
  type: 'object',
  properties: {
    search: { type: 'string' },
    party: { type: 'string' },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 },
  },
};

const contestParamsSchema = {
  type: 'object',
  required: ['id', 'constituencyId'],
  properties: {
    id: { type: 'string', minLength: 1 },
    constituencyId: { type: 'string', minLength: 1 },
  },
};

const personParamsSchema = {
  type: 'object',
  required: ['personId'],
  properties: {
    personId: { type: 'string', minLength: 1 },
  },
};

export async function electionRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/elections
   * List macro election events
   */
  app.get(
    '/api/v1/elections',
    { schema: { querystring: listElectionsQuerySchema } },
    async (request: FastifyRequest<{ Querystring: ListElectionsQuery }>, reply: FastifyReply) => {
      try {
        const { state, year, type, limit, offset } = request.query;
        const result = await electionService.listElectionEvents({
          state,
          year: year ? Number(year) : undefined,
          type,
          limit: limit ? Number(limit) : undefined,
          offset: offset ? Number(offset) : undefined,
        });

        return reply.send({
          success: true,
          data: result.events,
          metadata: {
            total: result.total,
            limit: limit ? Number(limit) : 20,
            offset: offset ? Number(offset) : 0,
          },
          error: null,
        });
      } catch (err: any) {
        request.log.error(err, 'Failed to list elections');
        return sendApiError(reply, request, 500, 'INTERNAL_ERROR', err.message || 'Failed to list elections');
      }
    }
  );

  /**
   * GET /api/v1/elections/:id
   * Get election event details
   */
  app.get(
    '/api/v1/elections/:id',
    { schema: { params: electionParamsSchema } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const event = await electionService.getElectionEventById(id);

        if (!event) {
          return sendApiError(reply, request, 404, 'NOT_FOUND', `Election event '${id}' not found`);
        }

        return reply.send({
          success: true,
          data: event,
          error: null,
        });
      } catch (err: any) {
        request.log.error(err, 'Failed to get election event');
        return sendApiError(reply, request, 500, 'INTERNAL_ERROR', err.message || 'Failed to get election event');
      }
    }
  );

  /**
   * GET /api/v1/elections/:id/contests
   * List constituency contests within an election
   */
  app.get(
    '/api/v1/elections/:id/contests',
    { schema: { params: electionParamsSchema, querystring: listContestsQuerySchema } },
    async (
      request: FastifyRequest<{ Params: { id: string }; Querystring: ListContestsQuery }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const { search, party, limit, offset } = request.query;

        const result = await electionService.listElectionContests(id, {
          search,
          party,
          limit: limit ? Number(limit) : undefined,
          offset: offset ? Number(offset) : undefined,
        });

        return reply.send({
          success: true,
          data: result.contests,
          metadata: {
            total: result.total,
            limit: limit ? Number(limit) : 20,
            offset: offset ? Number(offset) : 0,
          },
          error: null,
        });
      } catch (err: any) {
        request.log.error(err, 'Failed to list contests');
        return sendApiError(reply, request, 500, 'INTERNAL_ERROR', err.message || 'Failed to list contests');
      }
    }
  );

  /**
   * GET /api/v1/elections/:id/contests/:constituencyId
   * Full contest return (candidates, NOTA, winner, runner-up)
   */
  app.get(
    '/api/v1/elections/:id/contests/:constituencyId',
    { schema: { params: contestParamsSchema } },
    async (
      request: FastifyRequest<{ Params: { id: string; constituencyId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id, constituencyId } = request.params;
        const detail = await electionService.getContestDetail(id, constituencyId);

        if (!detail) {
          return sendApiError(
            reply,
            request,
            404,
            'NOT_FOUND',
            `Contest not found for election '${id}' and constituency '${constituencyId}'`
          );
        }

        return reply.send({
          success: true,
          data: detail,
          error: null,
        });
      } catch (err: any) {
        request.log.error(err, 'Failed to get contest detail');
        return sendApiError(reply, request, 500, 'INTERNAL_ERROR', err.message || 'Failed to get contest detail');
      }
    }
  );

  /**
   * GET /api/v1/elections/persons/:personId
   * Complete electoral history for a canonical person
   */
  app.get(
    '/api/v1/elections/persons/:personId',
    { schema: { params: personParamsSchema } },
    async (request: FastifyRequest<{ Params: { personId: string } }>, reply: FastifyReply) => {
      try {
        const { personId } = request.params;
        const candidacies = await electionService.getPersonElections(personId);

        return reply.send({
          success: true,
          data: candidacies,
          metadata: {
            total: candidacies.length,
          },
          error: null,
        });
      } catch (err: any) {
        request.log.error(err, 'Failed to get person elections');
        return sendApiError(reply, request, 500, 'INTERNAL_ERROR', err.message || 'Failed to get person elections');
      }
    }
  );
}
