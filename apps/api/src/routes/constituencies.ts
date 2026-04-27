import type { FastifyInstance } from 'fastify';
import type { ConstituencyBrief } from '@kshetra/shared';
import { findConstituencyAtPoint, computeElectionAnalytics } from '@kshetra/shared';
import type { ConstituencyRecord } from '@kshetra/shared';
import {
  TELANGANA_CONSTITUENCIES,
  type ConstituencySeed,
} from '../../../../data/seed/telangana-constituencies';
import {
  TELANGANA_ELECTION_HISTORY,
} from '../../../../data/seed/telangana-election-history';
import {
  TELANGANA_MLA_PROFILES,
  getMLAProfile,
} from '../../../../data/seed/telangana-mla-profiles';
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

/** Map seed data to generic ConstituencyRecord for analytics */
function seedToRecord(c: ConstituencySeed): ConstituencyRecord {
  return {
    acNo: c.acNo,
    name: c.name,
    district: c.district,
    type: c.type,
    winner: c.winner2023,
    winnerVotes: c.winnerVotes2023,
    runnerUp: c.runnerUp2023,
    margin: c.margin2023,
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
    const { q, party, district, type, minMargin, maxMargin, sort } = request.query as {
      q?: string;
      party?: string;
      district?: string;
      type?: string;
      minMargin?: string;
      maxMargin?: string;
      sort?: string;
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
    if (minMargin) {
      const min = parseInt(minMargin, 10);
      if (!isNaN(min)) results = results.filter((c) => c.margin2023 >= min);
    }
    if (maxMargin) {
      const max = parseInt(maxMargin, 10);
      if (!isNaN(max)) results = results.filter((c) => c.margin2023 <= max);
    }

    // Sort
    const sorted = [...results];
    switch (sort) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'margin_asc':
        sorted.sort((a, b) => a.margin2023 - b.margin2023);
        break;
      case 'margin_desc':
        sorted.sort((a, b) => b.margin2023 - a.margin2023);
        break;
      default:
        sorted.sort((a, b) => a.acNo - b.acNo);
    }

    return {
      state: 'TS',
      count: sorted.length,
      data: sorted.map(seedToBrief),
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

    const records = TELANGANA_CONSTITUENCIES.map(seedToRecord);
    const analytics = computeElectionAnalytics(records);

    return {
      state: 'TS',
      ...analytics,
    };
  });

  // ─── MLA PROFILES ───

  app.get('/states/:stateCode/mla/:acNo', async (request, reply) => {
    const { stateCode, acNo } = request.params as { stateCode: string; acNo: string };

    if (stateCode.toUpperCase() !== 'TS') {
      return reply.code(404).send({
        error: 'Not Found',
        message: `State ${stateCode} not supported yet`,
      });
    }

    const num = parseInt(acNo, 10);
    if (isNaN(num) || num < 1 || num > 119) {
      return reply.code(400).send({ error: 'Invalid AC number' });
    }

    const profile = getMLAProfile(num);
    if (!profile) {
      return reply.code(404).send({
        error: 'Not Found',
        message: `MLA profile for AC #${num} not available yet`,
      });
    }

    return { state: 'TS', acNo: num, profile };
  });

  app.get('/states/:stateCode/mla', async (request, reply) => {
    const { stateCode } = request.params as { stateCode: string };

    if (stateCode.toUpperCase() !== 'TS') {
      return reply.code(404).send({
        error: 'Not Found',
        message: `State ${stateCode} not supported yet`,
      });
    }

    return {
      state: 'TS',
      count: TELANGANA_MLA_PROFILES.length,
      profiles: TELANGANA_MLA_PROFILES,
    };
  });

  app.get('/states/:stateCode/elections', async (request, reply) => {
    const { stateCode } = request.params as { stateCode: string };

    if (stateCode.toUpperCase() !== 'TS') {
      return reply.code(404).send({
        error: 'Not Found',
        message: `State ${stateCode} not supported yet`,
      });
    }

    return {
      state: 'TS',
      count: TELANGANA_ELECTION_HISTORY.length,
      elections: TELANGANA_ELECTION_HISTORY,
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
