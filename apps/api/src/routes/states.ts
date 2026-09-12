import type { FastifyInstance } from 'fastify';
import {
  getAllStatesInfo,
  getStateInfo,
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
      code: { type: 'string', minLength: 2, maxLength: 5 },
    },
    required: ['code'],
  },
};

export async function stateRoutes(app: FastifyInstance) {
  /** GET /api/v1/states — list all states with data status */
  app.get('/api/v1/states', { schema: listStatesSchema }, async () => {
    return {
      states: getAllStatesInfo(),
    };
  });

  /** GET /api/v1/states/:code — single state info */
  app.get<{ Params: { code: string } }>('/api/v1/states/:code', { schema: getStateSchema }, async (request, reply) => {
    const { code } = request.params;
    const info = getStateInfo(code);

    if (!info) {
      return sendApiError(reply, request, 404, 'Not Found', `State ${code} not found`);
    }

    return info;
  });
}
