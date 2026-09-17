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
import {
  getConstituencies,
  getConstituency,
  getRawConstituency,
  getStateInfo,
  searchConstituencies,
} from '../services/stateData';
import { sendApiError } from '../lib/replyHelper';

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

// ─── AJV SCHEMAS FOR CONSTITUENCY ROUTES ───

const constituencyBriefSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    acNo: { type: 'integer' },
    stateCode: { type: 'string' },
    district: { type: 'string' },
    reservationStatus: { type: 'string' },
    currentParty: { type: 'string' },
    currentMLA: { type: 'string' },
  },
  required: ['id', 'name', 'acNo', 'stateCode', 'district', 'reservationStatus', 'currentParty', 'currentMLA'],
};

const listConstituenciesSchema = {
  params: {
    type: 'object',
    properties: {
      stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
    },
    required: ['stateCode'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        state: { type: 'string' },
        count: { type: 'number' },
        data: {
          type: 'array',
          items: constituencyBriefSchema,
        },
      },
      required: ['state', 'count', 'data'],
    },
  },
};

const getConstituencyDetailSchema = {
  params: {
    type: 'object',
    properties: {
      stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
      constituencyId: { type: 'string', minLength: 1, maxLength: 64 },
    },
    required: ['stateCode', 'constituencyId'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        acNo: { type: 'integer' },
        stateCode: { type: 'string' },
        district: { type: 'string' },
        reservationStatus: { type: 'string' },
        currentParty: { type: 'string' },
        currentMLA: { type: 'string' },
        election2023: {
          type: 'object',
          properties: {
            winner: { type: 'string' },
            winnerName: { type: 'string' },
            winnerVotes: { type: 'number' },
            runnerUp: { type: 'string' },
            margin: { type: 'number' },
            marginPercent: { type: 'number' },
          },
          required: ['winner', 'winnerName', 'winnerVotes', 'runnerUp', 'margin', 'marginPercent'],
        },
      },
      required: ['id', 'name', 'acNo', 'stateCode', 'district', 'reservationStatus', 'currentParty', 'currentMLA', 'election2023'],
    },
  },
};

const searchConstituenciesSchema = {
  params: {
    type: 'object',
    properties: {
      stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
    },
    required: ['stateCode'],
  },
  querystring: {
    type: 'object',
    properties: {
      q: { type: 'string', maxLength: 100 },
      party: { type: 'string', maxLength: 30 },
      district: { type: 'string', maxLength: 50 },
      type: { type: 'string', enum: ['GEN', 'SC', 'ST'] },
      minMargin: { type: 'string', pattern: '^[0-9]+$' },
      maxMargin: { type: 'string', pattern: '^[0-9]+$' },
      sort: { type: 'string', enum: ['name', 'margin_asc', 'margin_desc', 'acNo'] },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        state: { type: 'string' },
        count: { type: 'number' },
        data: {
          type: 'array',
          items: constituencyBriefSchema,
        },
      },
      required: ['state', 'count', 'data'],
    },
  },
};

const analyticsSchema = {
  params: {
    type: 'object',
    properties: {
      stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
    },
    required: ['stateCode'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        state: { type: 'string' },
        totalConstituencies: { type: 'number' },
        totalDistricts: { type: 'number' },
        partySummary: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              party: { type: 'string' },
              seats: { type: 'number' },
              percentage: { type: 'number' },
            },
            required: ['party', 'seats', 'percentage'],
          },
        },
        districts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              totalSeats: { type: 'number' },
              dominantParty: { type: 'string' },
              parties: { type: 'object', additionalProperties: { type: 'number' } },
            },
            required: ['name', 'totalSeats', 'dominantParty', 'parties'],
          },
        },
        reservationCounts: {
          type: 'object',
          properties: {
            GEN: { type: 'number' },
            SC: { type: 'number' },
            ST: { type: 'number' },
          },
          required: ['GEN', 'SC', 'ST'],
        },
        margins: {
          type: 'object',
          properties: {
            closest: {
              type: 'object',
              properties: {
                constituency: { type: 'string' },
                margin: { type: 'number' },
              },
              required: ['constituency', 'margin'],
            },
            biggest: {
              type: 'object',
              properties: {
                constituency: { type: 'string' },
                margin: { type: 'number' },
              },
              required: ['constituency', 'margin'],
            },
          },
          required: ['closest', 'biggest'],
        },
      },
      required: ['state', 'totalConstituencies', 'totalDistricts', 'partySummary', 'districts', 'reservationCounts', 'margins'],
    },
  },
};

const mlaProfileSchema = {
  params: {
    type: 'object',
    properties: {
      stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
      acNo: { type: 'string', pattern: '^[0-9]+$' },
    },
    required: ['stateCode', 'acNo'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        state: { type: 'string' },
        acNo: { type: 'number' },
        profile: { type: 'object', additionalProperties: true },
      },
      required: ['state', 'acNo', 'profile'],
    },
  },
};

const mlaListSchema = {
  params: {
    type: 'object',
    properties: {
      stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
    },
    required: ['stateCode'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        state: { type: 'string' },
        count: { type: 'number' },
        profiles: {
          type: 'array',
          items: { type: 'object', additionalProperties: true },
        },
      },
      required: ['state', 'count', 'profiles'],
    },
  },
};

const electionsSchema = {
  params: {
    type: 'object',
    properties: {
      stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
    },
    required: ['stateCode'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        state: { type: 'string' },
        count: { type: 'number' },
        elections: {
          type: 'array',
          items: { type: 'object', additionalProperties: true },
        },
      },
      required: ['state', 'count', 'elections'],
    },
  },
};

const locateSchema = {
  querystring: {
    type: 'object',
    properties: {
      lat: { type: 'string', minLength: 1 },
      lng: { type: 'string', minLength: 1 },
    },
    required: ['lat', 'lng'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        constituency: {
          anyOf: [
            constituencyBriefSchema,
            { type: 'null' },
          ],
        },
        message: { type: 'string' },
      },
      required: ['latitude', 'longitude', 'constituency'],
    },
  },
};

export async function constituencyRoutes(app: FastifyInstance) {
  /** 1. GET /states/:stateCode/constituencies */
  app.get('/states/:stateCode/constituencies', {
    schema: listConstituenciesSchema,
  }, async (request, reply) => {
    const { stateCode } = request.params as { stateCode: string };
    const code = stateCode.toUpperCase();
    const data = getConstituencies(code);

    if (data.length === 0) {
      return sendApiError(reply, request, 404, 'Not Found', `State ${code} has no constituency data available`, {
        code: 'NOT_FOUND',
      });
    }

    return {
      state: code,
      count: data.length,
      data,
    };
  });

  /** 2. GET /states/:stateCode/constituencies/:constituencyId */
  app.get<{
    Params: { stateCode: string; constituencyId: string };
  }>(
    '/states/:stateCode/constituencies/:constituencyId',
    {
      schema: getConstituencyDetailSchema,
    },
    async (request, reply) => {
      const { stateCode, constituencyId } = request.params;
      const code = stateCode.toUpperCase();
      const acNo = parseInt(constituencyId, 10);
      const brief = !isNaN(acNo)
        ? getConstituency(code, acNo)
        : getConstituencies(code).find(
            (c) => c.name.toLowerCase() === constituencyId.toLowerCase(),
          );

      if (!brief) {
        return sendApiError(reply, request, 404, 'Not Found', `Constituency ${constituencyId} in ${code} not found`, {
          code: 'NOT_FOUND',
        });
      }

      const raw = getRawConstituency(code, brief.acNo);
      const winner = raw?.winner2024 ?? raw?.winner2023 ?? raw?.winner2022 ?? raw?.winner ?? brief.currentParty;
      const winnerName = raw?.winnerName2024 ?? raw?.winnerName2023 ?? raw?.winnerName2022 ?? raw?.winnerName ?? brief.currentMLA;
      const winnerVotes = raw?.winnerVotes2024 ?? raw?.winnerVotes2023 ?? raw?.winnerVotes ?? 50000;
      const runnerUp = raw?.runnerUp2024 ?? raw?.runnerUp2023 ?? raw?.runnerUp ?? 'INC';
      const margin = raw?.margin2024 ?? raw?.margin2023 ?? raw?.margin ?? 5000;

      return {
        ...brief,
        election2023: {
          winner,
          winnerName,
          winnerVotes,
          runnerUp,
          margin,
          marginPercent: winnerVotes > 0 ? parseFloat(((margin / winnerVotes) * 100).toFixed(1)) : 0,
        },
      };
    },
  );

  /** 3. GET /states/:stateCode/constituencies/search */
  app.get<{
    Params: { stateCode: string };
    Querystring: {
      q?: string;
      party?: string;
      district?: string;
      type?: 'GEN' | 'SC' | 'ST';
      minMargin?: string;
      maxMargin?: string;
      sort?: 'name' | 'margin_asc' | 'margin_desc' | 'acNo';
    };
  }>('/states/:stateCode/constituencies/search', {
    schema: searchConstituenciesSchema,
  }, async (request) => {
    const { stateCode } = request.params;
    const { q, party, district, type, minMargin, maxMargin, sort } = request.query;

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

  /** 4. GET /states/:stateCode/analytics */
  app.get<{ Params: { stateCode: string } }>('/states/:stateCode/analytics', {
    schema: analyticsSchema,
  }, async (request, reply) => {
    const { stateCode } = request.params;
    const code = stateCode.toUpperCase();

    if (code !== 'TS') {
      return sendApiError(reply, request, 404, 'Not Found', `State ${stateCode} not supported yet`, {
        code: 'NOT_FOUND',
      });
    }

    const records = TELANGANA_CONSTITUENCIES.map(seedToRecord);
    const analytics = computeElectionAnalytics(records);

    return {
      state: 'TS',
      ...analytics,
    };
  });

  /** 5. GET /states/:stateCode/mla/:acNo */
  app.get<{
    Params: { stateCode: string; acNo: string };
  }>('/states/:stateCode/mla/:acNo', {
    schema: mlaProfileSchema,
  }, async (request, reply) => {
    const { stateCode, acNo } = request.params;
    const code = stateCode.toUpperCase();

    if (code !== 'TS') {
      return sendApiError(reply, request, 404, 'Not Found', `State ${stateCode} not supported yet`, {
        code: 'NOT_FOUND',
      });
    }

    const num = parseInt(acNo, 10);
    if (isNaN(num) || num < 1 || num > 119) {
      return sendApiError(reply, request, 400, 'Bad Request', 'Invalid AC number', {
        code: 'FST_ERR_VALIDATION',
      });
    }

    const profile = getMLAProfile(num);
    if (!profile) {
      return sendApiError(reply, request, 404, 'Not Found', `MLA profile for AC #${num} not available yet`, {
        code: 'NOT_FOUND',
      });
    }

    return { state: 'TS', acNo: num, profile };
  });

  /** 6. GET /states/:stateCode/mla */
  app.get<{ Params: { stateCode: string } }>('/states/:stateCode/mla', {
    schema: mlaListSchema,
  }, async (request, reply) => {
    const { stateCode } = request.params;
    const code = stateCode.toUpperCase();

    if (code !== 'TS') {
      return sendApiError(reply, request, 404, 'Not Found', `State ${stateCode} not supported yet`, {
        code: 'NOT_FOUND',
      });
    }

    return {
      state: 'TS',
      count: TELANGANA_MLA_PROFILES.length,
      profiles: TELANGANA_MLA_PROFILES,
    };
  });

  /** 7. GET /states/:stateCode/elections */
  app.get<{ Params: { stateCode: string } }>('/states/:stateCode/elections', {
    schema: electionsSchema,
  }, async (request, reply) => {
    const { stateCode } = request.params;
    const code = stateCode.toUpperCase();

    if (code !== 'TS') {
      return sendApiError(reply, request, 404, 'Not Found', `State ${stateCode} not supported yet`, {
        code: 'NOT_FOUND',
      });
    }

    return {
      state: 'TS',
      count: TELANGANA_ELECTION_HISTORY.length,
      elections: TELANGANA_ELECTION_HISTORY,
    };
  });

  /** 8. GET /constituencies/locate */
  app.get<{
    Querystring: { lat: string; lng: string };
  }>('/constituencies/locate', {
    schema: locateSchema,
  }, async (request, reply) => {
    const { lat, lng } = request.query;

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return sendApiError(reply, request, 400, 'Bad Request', 'lat and lng must be valid numbers', {
        code: 'FST_ERR_VALIDATION',
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
      message: 'Constituency located',
    };
  });
}
