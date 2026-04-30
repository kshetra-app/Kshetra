import type { FastifyInstance } from 'fastify';
import {
  getAllStatesInfo,
  getStateInfo,
} from '../services/stateData';

export async function stateRoutes(app: FastifyInstance) {
  /** GET /api/v1/states — list all states with data status */
  app.get('/api/v1/states', async () => {
    return {
      states: getAllStatesInfo(),
    };
  });

  /** GET /api/v1/states/:code — single state info */
  app.get('/api/v1/states/:code', async (request, reply) => {
    const { code } = request.params as { code: string };
    const info = getStateInfo(code);

    if (!info) {
      return reply.code(404).send({ error: `State ${code} not found` });
    }

    return info;
  });
}
