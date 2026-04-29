import type { FastifyInstance } from 'fastify';
import {
  getAllStatesInfo,
  getStateInfo,
  getConstituencies,
  getConstituency,
  searchConstituencies,
  isStateSupported,
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

  /** GET /api/v1/states/:code/constituencies — list constituencies */
  app.get('/api/v1/states/:code/constituencies', async (request, reply) => {
    const { code } = request.params as { code: string };

    if (!isStateSupported(code)) {
      return {
        state: code.toUpperCase(),
        count: 0,
        data: [],
        message: `State ${code} data not yet available`,
      };
    }

    const data = getConstituencies(code);
    const info = getStateInfo(code);

    return {
      state: code.toUpperCase(),
      count: data.length,
      totalSeats: info?.totalSeats ?? 0,
      dataStatus: info?.dataStatus ?? 'planned',
      data,
    };
  });

  /** GET /api/v1/states/:code/constituencies/search?q= */
  app.get('/api/v1/states/:code/constituencies/search', async (request, reply) => {
    const { code } = request.params as { code: string };
    const { q } = request.query as { q?: string };

    if (!isStateSupported(code)) {
      return { state: code.toUpperCase(), count: 0, data: [] };
    }

    if (!q) {
      return { state: code.toUpperCase(), count: 0, data: [], message: 'Query parameter q is required' };
    }

    const data = searchConstituencies(code, q);
    return {
      state: code.toUpperCase(),
      count: data.length,
      data,
    };
  });

  /** GET /api/v1/states/:code/constituencies/:acNo */
  app.get('/api/v1/states/:code/constituencies/:acNo', async (request, reply) => {
    const { code, acNo } = request.params as { code: string; acNo: string };
    const num = parseInt(acNo, 10);

    if (isNaN(num)) {
      return reply.code(400).send({ error: 'Invalid AC number' });
    }

    const constituency = getConstituency(code, num);
    if (!constituency) {
      return reply.code(404).send({
        error: `Constituency #${num} in ${code.toUpperCase()} not found`,
      });
    }

    return constituency;
  });
}
