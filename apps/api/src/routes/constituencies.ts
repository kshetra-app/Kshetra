import type { FastifyInstance } from 'fastify';
import type { ConstituencyBrief } from '@kshetra/shared';

export async function constituencyRoutes(app: FastifyInstance) {
  app.get('/states/:stateCode/constituencies', async (request, reply) => {
    const { stateCode } = request.params as { stateCode: string };

    // TODO: Replace with database query once PostGIS is connected
    // For now, return empty array — data layer comes in next milestone
    const constituencies: ConstituencyBrief[] = [];

    return {
      state: stateCode.toUpperCase(),
      count: constituencies.length,
      data: constituencies,
    };
  });

  app.get(
    '/states/:stateCode/constituencies/:constituencyId',
    async (request, reply) => {
      const { stateCode, constituencyId } = request.params as {
        stateCode: string;
        constituencyId: string;
      };

      // TODO: Replace with database query
      return reply.code(404).send({
        error: 'Not Found',
        message: `Constituency ${constituencyId} in ${stateCode} not found`,
      });
    },
  );

  app.get('/constituencies/locate', async (request, reply) => {
    const { lat, lng } = request.query as { lat: string; lng: string };

    if (!lat || !lng) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'lat and lng query parameters are required',
      });
    }

    // TODO: PostGIS ST_Contains query to find constituency for a point
    return {
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      constituency: null,
      message: 'Geolocation lookup not yet implemented',
    };
  });
}
