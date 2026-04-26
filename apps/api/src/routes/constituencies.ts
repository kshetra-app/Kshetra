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

  app.get('/states/:stateCode/constituencies/search', async (request, reply) => {
    const { stateCode } = request.params as { stateCode: string };
    const { q, party, district, type } = request.query as {
      q?: string;
      party?: string;
      district?: string;
      type?: string;
    };

    if (stateCode.toUpperCase() !== 'TS') {
      return { state: stateCode.toUpperCase(), count: 0, data: [] };
    }

    let results = TELANGANA_CONSTITUENCIES;

    if (q) {
      const lower = q.toLowerCase();
      results = results.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.district.toLowerCase().includes(lower) ||
          c.winnerName2023.toLowerCase().includes(lower) ||
          String(c.acNo).includes(lower),
      );
    }
    if (party) {
      const p = party.toUpperCase();
      results = results.filter((c) => c.winner2023 === p);
    }
    if (district) {
      const d = district.toLowerCase();
      results = results.filter((c) => c.district.toLowerCase() === d);
    }
    if (type) {
      const t = type.toUpperCase();
      results = results.filter((c) => c.type === t);
    }

    return {
      state: 'TS',
      count: results.length,
      data: results.map(seedToBrief),
    };
  });

  app.get('/states/:stateCode/analytics', async (request, reply) => {
    const { stateCode } = request.params as { stateCode: string };

    if (stateCode.toUpperCase() !== 'TS') {
      return reply.code(404).send({
        error: 'Not Found',
        message: `State ${stateCode} not supported yet`,
      });
    }

    const partySeats: Record<string, number> = {};
    const districtMap: Record<string, Record<string, number>> = {};
    let closestMargin = Infinity;
    let closestAC = '';
    let biggestMargin = 0;
    let biggestAC = '';

    for (const c of TELANGANA_CONSTITUENCIES) {
      partySeats[c.winner2023] = (partySeats[c.winner2023] || 0) + 1;

      if (!districtMap[c.district]) districtMap[c.district] = {};
      districtMap[c.district][c.winner2023] =
        (districtMap[c.district][c.winner2023] || 0) + 1;

      if (c.margin2023 < closestMargin) {
        closestMargin = c.margin2023;
        closestAC = c.name;
      }
      if (c.margin2023 > biggestMargin) {
        biggestMargin = c.margin2023;
        biggestAC = c.name;
      }
    }

    const partySummary = Object.entries(partySeats)
      .sort(([, a], [, b]) => b - a)
      .map(([party, seats]) => ({
        party,
        seats,
        percentage: parseFloat(((seats / 119) * 100).toFixed(1)),
      }));

    const districts = Object.entries(districtMap)
      .map(([name, parties]) => {
        const total = Object.values(parties).reduce((a, b) => a + b, 0);
        const dominant = Object.entries(parties).sort(([, a], [, b]) => b - a)[0];
        return {
          name,
          totalSeats: total,
          dominantParty: dominant[0],
          parties,
        };
      })
      .sort((a, b) => b.totalSeats - a.totalSeats);

    return {
      state: 'TS',
      totalConstituencies: 119,
      totalDistricts: districts.length,
      partySummary,
      districts,
      margins: {
        closest: { constituency: closestAC, margin: closestMargin },
        biggest: { constituency: biggestAC, margin: biggestMargin },
      },
    };
  });

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
