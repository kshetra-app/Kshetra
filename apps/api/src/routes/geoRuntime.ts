/**
 * Canonical Spatial Runtime Routes (W016-C3-R9)
 *
 * Fastify endpoints implementing the canonical PostGIS read operations:
 * - GET /geo/tiles/:layer/:z/:x/:y
 * - GET /geo/locate
 * - GET /geo/features/:layer/:id
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { spatialRuntimeService } from '../services/spatialRuntimeService';
import { sendApiError } from '../lib/replyHelper';

const tileParamsSchema = {
  type: 'object',
  properties: {
    layer: { type: 'string', pattern: '^[a-z_]+$' },
    z: { type: 'integer', minimum: 0, maximum: 22 },
    x: { type: 'integer', minimum: 0 },
    y: { type: 'integer', minimum: 0 },
  },
  required: ['layer', 'z', 'x', 'y'],
};

const tileQuerySchema = {
  type: 'object',
  properties: {
    regime: { type: 'string', enum: ['current', 'historical', 'version'] },
    as_of: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    version_id: { type: 'string', format: 'uuid' },
    bypass_adapter: { type: 'boolean' },
  },
};

const locateQuerySchema = {
  type: 'object',
  properties: {
    lat: { type: 'number', minimum: -90, maximum: 90 },
    lng: { type: 'number', minimum: -180, maximum: 180 },
    layer: { type: 'string', pattern: '^[a-z_]+$' },
    regime: { type: 'string', enum: ['current', 'historical', 'version'] },
    as_of: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    version_id: { type: 'string', format: 'uuid' },
    bypass_adapter: { type: 'boolean' },
  },
  required: ['lat', 'lng'],
};

const featureParamsSchema = {
  type: 'object',
  properties: {
    layer: { type: 'string', pattern: '^[a-z_]+$' },
    id: { type: 'string' },
  },
  required: ['layer', 'id'],
};

export async function geoRuntimeRoutes(app: FastifyInstance) {
  /**
   * Operation A: TILE Delivery
   * GET /geo/tiles/:layer/:z/:x/:y
   */
  app.get<{
    Params: { layer: string; z: number; x: number; y: number };
    Querystring: { regime?: 'current' | 'historical' | 'version'; as_of?: string; version_id?: string; bypass_adapter?: boolean };
  }>(
    '/geo/tiles/:layer/:z/:x/:y',
    {
      schema: {
        params: tileParamsSchema,
        querystring: tileQuerySchema,
      },
    },
    async (request, reply) => {
      const { layer, z, x, y } = request.params;
      const { regime = 'historical', as_of, version_id, bypass_adapter } = request.query;

      // Coordinate boundary check for zoom level
      const maxCoord = Math.pow(2, z);
      if (x < 0 || x >= maxCoord || y < 0 || y >= maxCoord) {
        return sendApiError(reply, request, 400, 'Bad Request', 'Tile x/y out of bounds for zoom', {
          code: 'INVALID_TILE_COORDINATES',
        });
      }

      // Layer validation
      if (layer !== 'mandals' && layer !== 'mandal') {
        return sendApiError(reply, request, 404, 'Not Found', `Unknown spatial layer: ${layer}`, {
          code: 'LAYER_NOT_FOUND',
        });
      }

      try {
        const tile = await spatialRuntimeService.getTile({
          layer,
          z,
          x,
          y,
          regime,
          asOf: as_of,
          versionId: version_id,
          bypassAdapter: Boolean(bypass_adapter),
        });

        if (!tile || tile.featureCount === 0) {
          return reply.status(204).send();
        }

        reply.header('Content-Type', 'application/vnd.mapbox-vector-tile');
        reply.header('x-geography-layer', layer);
        reply.header('x-geography-regime', regime);
        reply.header('Cache-Control', 'public, max-age=31536000, immutable');

        const acceptsGzip = (request.headers['accept-encoding'] ?? '').includes('gzip');
        if (acceptsGzip) {
          reply.header('Content-Encoding', 'gzip');
          return reply.send(tile.gzipBuffer);
        }
        return reply.send(tile.rawBuffer);
      } catch (err: any) {
        return sendApiError(reply, request, 500, 'Internal Server Error', err.message, {
          code: 'SPATIAL_TILE_ERROR',
        });
      }
    },
  );

  /**
   * Operation B: LOCATE Point-in-Polygon
   * GET /geo/locate
   */
  app.get<{
    Querystring: {
      lat: number;
      lng: number;
      layer?: string;
      regime?: 'current' | 'historical' | 'version';
      as_of?: string;
      version_id?: string;
      bypass_adapter?: boolean;
    };
  }>(
    '/geo/locate',
    {
      schema: {
        querystring: locateQuerySchema,
      },
    },
    async (request, reply) => {
      const { lat, lng, layer = 'mandals', regime = 'historical', as_of, version_id, bypass_adapter } = request.query;

      if (layer !== 'mandals' && layer !== 'mandal') {
        return sendApiError(reply, request, 404, 'Not Found', `Unknown spatial layer: ${layer}`, {
          code: 'LAYER_NOT_FOUND',
        });
      }

      try {
        const matched = await spatialRuntimeService.locatePoint({
          lat,
          lng,
          layer,
          regime,
          asOf: as_of,
          versionId: version_id,
          bypassAdapter: Boolean(bypass_adapter),
        });

        if (!matched) {
          return reply.status(404).send({
            status: 'not_found',
            matched: false,
            message: 'No matching geometry found for coordinates under requested regime',
            code: 'SPATIAL_LOCATION_NOT_FOUND',
            coordinates: { lat, lng },
            regime,
          });
        }

        return reply.status(200).send({
          status: 'ok',
          matched: true,
          data: matched,
        });
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'Bad Request', err.message, {
          code: 'SPATIAL_LOCATE_ERROR',
        });
      }
    },
  );

  /**
   * Operation C: IDENTIFY / DETAIL Feature
   * GET /geo/features/:layer/:id
   */
  app.get<{
    Params: { layer: string; id: string };
    Querystring: { regime?: 'current' | 'historical' | 'version'; as_of?: string; bypass_adapter?: boolean };
  }>(
    '/geo/features/:layer/:id',
    {
      schema: {
        params: featureParamsSchema,
      },
    },
    async (request, reply) => {
      const { layer, id } = request.params;
      const { regime = 'historical', as_of, bypass_adapter } = request.query;

      if (layer !== 'mandals' && layer !== 'mandal') {
        return sendApiError(reply, request, 404, 'Not Found', `Unknown spatial layer: ${layer}`, {
          code: 'LAYER_NOT_FOUND',
        });
      }

      try {
        const feature = await spatialRuntimeService.getFeatureDetail({
          layer,
          id,
          regime,
          asOf: as_of,
          bypassAdapter: Boolean(bypass_adapter),
        });

        if (!feature) {
          return reply.status(404).send({
            status: 'not_found',
            matched: false,
            message: `Feature ${id} not found in layer ${layer} under requested regime`,
            code: 'FEATURE_NOT_FOUND',
          });
        }

        return reply.status(200).send({
          status: 'ok',
          matched: true,
          data: feature,
        });
      } catch (err: any) {
        return sendApiError(reply, request, 400, 'Bad Request', err.message, {
          code: 'FEATURE_DETAIL_ERROR',
        });
      }
    },
  );
}
