import type { FastifyInstance } from 'fastify';
import {
  getAllCanonicalStatesInfo,
  getCanonicalStateInfo,
} from '../services/stateData';
import { sendApiError } from '../lib/replyHelper';

const listStatesSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        states: { type: 'array' },
      },
      required: ['states'],
    },
  },
};

const getStateSchema = {
  params: {
    type: 'object',
    properties: {
      code: { type: 'string', pattern: '^[A-Z]{2}$' },
    },
    required: ['code'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        name: { type: 'string' },
        totalSeats: { type: 'number' },
        dataStatus: { type: 'string' },
        hasGeoJSON: { type: 'boolean' },
        geographicCapability: {
          type: 'object',
          properties: {
            hasBoundaryAsset: { type: 'boolean' },
            boundaryStatus: { type: 'string' },
            isStructurallyValid: { type: 'boolean' },
            hasCleanConstituencyMapping: { type: 'boolean' },
            isAuthoritativeAccepted: { type: 'boolean' },
            activeDefects: { type: 'array', items: { type: 'string' } },
            notes: { type: 'string' },
          },
        },
        hasAnalytics: { type: 'boolean' },
        hasDelimitationSimulation: { type: 'boolean' },
        hasCandidates: { type: 'boolean' },
      },
      required: ['code', 'name', 'totalSeats', 'dataStatus'],
    },
  },
};

export async function stateRoutes(app: FastifyInstance) {
  /** GET /api/v1/states — list all states with data status */
  app.get('/api/v1/states', { schema: listStatesSchema }, async () => {
    return {
      states: await getAllCanonicalStatesInfo(),
    };
  });

  /** GET /api/v1/states/:code — single state info */
  app.get<{ Params: { code: string } }>('/api/v1/states/:code', { schema: getStateSchema }, async (request, reply) => {
    const { code } = request.params;
    const info = await getCanonicalStateInfo(code);

    if (!info) {
      return sendApiError(reply, request, 404, 'Not Found', `State ${code} not found`);
    }

    return info;
  });
}
