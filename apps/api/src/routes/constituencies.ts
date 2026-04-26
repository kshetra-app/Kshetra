import type { FastifyInstance } from 'fastify';
import type { ConstituencyBrief } from '@kshetra/shared';
import { findConstituencyAtPoint } from '@kshetra/shared';
import {
  TELANGANA_CONSTITUENCIES,
  type ConstituencySeed,
} from '../../../../data/seed/telangana-constituencies';
import * as fs from 'fs';
import * as path from 'path';

/** Map seed data to ConstituencyBrief for API responses */
function seedToBrief(c: ConstituencySeed): ConstituencyBrief {
  return {
    id: `TS-AC-${c.acNo}`,
    name: c.name,
    acNo: c.acNo,
    stateCode: 'TS',
    district: c.district,
    reservationStatus: c.type,
    currentParty: c.winner2023,
    currentMLA: c.winnerName2023,
  };
}

/** Load the GeoJSON once at startup for locate queries */
let _geojson: GeoJSON.FeatureCollection | null = null;
function getGeoJSON(): GeoJSON.FeatureCollection {
  if (!_geojson) {
    const filePath = path.resolve(
      __dirname,
      '../../../../data/geo/telangana-assembly.geojson',
    );
    _geojson = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return _geojson!;
}

export async function constituencyRoutes(app: FastifyInstance) {
  app.get('/states/:stateCode/constituencies', async (request, reply) => {
    const { stateCode } = request.params as { stateCode: string };

    if (stateCode.toUpperCase() !== 'TS') {
      return {
        state: stateCode.toUpperCase(),
        count: 0,
        data: [],
        message: 'Only Telangana (TS) is supported in Phase 1',
      };
    }

    const data = TELANGANA_CONSTITUENCIES.map(seedToBrief);

    return {
      state: 'TS',
      count: data.length,
      data,
    };
  });

  app.get(
    '/states/:stateCode/constituencies/:constituencyId',
    async (request, reply) => {
      const { stateCode, constituencyId } = request.params as {
        stateCode: string;
        constituencyId: string;
      };

      if (stateCode.toUpperCase() !== 'TS') {
        return reply.code(404).send({
          error: 'Not Found',
          message: `State ${stateCode} not supported yet`,
        });
      }

      const acNo = parseInt(constituencyId, 10);
      const seed = TELANGANA_CONSTITUENCIES.find((c) =>
        isNaN(acNo) ? c.name.toLowerCase() === constituencyId.toLowerCase() : c.acNo === acNo,
      );

      if (!seed) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Constituency ${constituencyId} in ${stateCode} not found`,
        });
      }

      return {
        ...seedToBrief(seed),
        election2023: {
          winner: seed.winner2023,
          winnerName: seed.winnerName2023,
          winnerVotes: seed.winnerVotes2023,
          runnerUp: seed.runnerUp2023,
          margin: seed.margin2023,
          marginPercent: parseFloat(
            ((seed.margin2023 / seed.winnerVotes2023) * 100).toFixed(1),
          ),
        },
      };
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

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'lat and lng must be valid numbers',
      });
    }

    const geojson = getGeoJSON();
    const found = findConstituencyAtPoint(longitude, latitude, geojson);

    if (!found) {
      return {
        latitude,
        longitude,
        constituency: null,
        message: 'No constituency found at this location',
      };
    }

    const acNo = found.properties.AC_NO;
    const seed = TELANGANA_CONSTITUENCIES.find((c) => c.acNo === acNo);

    return {
      latitude,
      longitude,
      constituency: seed ? seedToBrief(seed) : null,
    };
  });
}
