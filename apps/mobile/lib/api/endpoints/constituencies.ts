/**
 * Constituencies API Endpoint
 * Master Execution Framework — W021.5 / Directive 083
 *
 * Target Fastify Routes:
 * - GET /api/v1/states/:stateCode/constituencies
 * - GET /api/v1/states/:stateCode/constituencies/:constituencyId
 * - GET /api/v1/states/:stateCode/constituencies/search
 */

import type { ApiClient } from '../client';
import { ApiValidationError } from '../errors';
import type { ConstituencyBrief } from '@kshetra/shared';

export interface ConstituencyDetailDTO extends ConstituencyBrief {
  election2023?: {
    winner: string;
    winnerName: string;
    winnerVotes: number;
    runnerUp: string;
    margin: number;
    marginPercent: number;
  };
}

export interface ConstituenciesListResponseDTO {
  state: string;
  count: number;
  data: ConstituencyBrief[];
}

export interface SearchConstituenciesOptions {
  q?: string;
  party?: string;
  district?: string;
  type?: 'GEN' | 'SC' | 'ST';
  sort?: 'name' | 'margin_asc' | 'margin_desc' | 'acNo';
}

export function validateConstituencyBrief(data: unknown, context: string): ConstituencyBrief {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ApiValidationError(`Invalid constituency data at ${context}: expected object`);
  }
  const c = data as Record<string, unknown>;
  if (typeof c.id !== 'string' || !c.id.trim()) {
    throw new ApiValidationError(`Invalid constituency data at ${context}: missing or empty "id"`);
  }
  if (typeof c.name !== 'string' || !c.name.trim()) {
    throw new ApiValidationError(`Invalid constituency data at ${context}: missing or empty "name"`);
  }
  if (typeof c.acNo !== 'number' || isNaN(c.acNo)) {
    throw new ApiValidationError(`Invalid constituency data at ${context}: "acNo" must be a valid number`);
  }
  if (typeof c.stateCode !== 'string' || !c.stateCode.trim()) {
    throw new ApiValidationError(`Invalid constituency data at ${context}: missing or empty "stateCode"`);
  }
  if (typeof c.district !== 'string') {
    throw new ApiValidationError(`Invalid constituency data at ${context}: "district" must be a string`);
  }
  if (typeof c.reservationStatus !== 'string' || !['GEN', 'SC', 'ST'].includes(c.reservationStatus)) {
    throw new ApiValidationError(`Invalid constituency data at ${context}: "reservationStatus" must be GEN, SC, or ST`);
  }
  if (typeof c.currentParty !== 'string') {
    throw new ApiValidationError(`Invalid constituency data at ${context}: "currentParty" must be a string`);
  }
  if (typeof c.currentMLA !== 'string') {
    throw new ApiValidationError(`Invalid constituency data at ${context}: "currentMLA" must be a string`);
  }

  return {
    id: c.id,
    name: c.name,
    acNo: c.acNo,
    stateCode: c.stateCode,
    district: c.district,
    reservationStatus: c.reservationStatus as 'GEN' | 'SC' | 'ST',
    currentParty: c.currentParty,
    currentMLA: c.currentMLA,
  };
}

export function validateConstituencyDetail(data: unknown, context: string): ConstituencyDetailDTO {
  const brief = validateConstituencyBrief(data, context);
  const obj = data as Record<string, unknown>;
  let election2023: ConstituencyDetailDTO['election2023'];

  if (obj.election2023 && typeof obj.election2023 === 'object' && !Array.isArray(obj.election2023)) {
    const el = obj.election2023 as Record<string, unknown>;
    election2023 = {
      winner: typeof el.winner === 'string' ? el.winner : '',
      winnerName: typeof el.winnerName === 'string' ? el.winnerName : '',
      winnerVotes: typeof el.winnerVotes === 'number' ? el.winnerVotes : 0,
      runnerUp: typeof el.runnerUp === 'string' ? el.runnerUp : '',
      margin: typeof el.margin === 'number' ? el.margin : 0,
      marginPercent: typeof el.marginPercent === 'number' ? el.marginPercent : 0,
    };
  }

  return {
    ...brief,
    election2023,
  };
}

export function validateConstituenciesListResponse(data: unknown): ConstituenciesListResponseDTO {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ApiValidationError('Invalid constituencies list response: expected object payload');
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.state !== 'string') {
    throw new ApiValidationError('Invalid constituencies list response: missing "state"');
  }
  if (!Array.isArray(obj.data)) {
    throw new ApiValidationError('Invalid constituencies list response: "data" must be an array');
  }

  return {
    state: obj.state,
    count: typeof obj.count === 'number' ? obj.count : obj.data.length,
    data: obj.data.map((c, idx) => validateConstituencyBrief(c, `data[${idx}]`)),
  };
}

export class ConstituenciesEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * List all constituencies for a state.
   */
  async listConstituencies(stateCode: string): Promise<ConstituenciesListResponseDTO> {
    if (!stateCode || typeof stateCode !== 'string') {
      throw new ApiValidationError('Invalid stateCode: must be a non-empty string');
    }
    const res = await this.client.get<unknown>(
      `/api/v1/states/${encodeURIComponent(stateCode.toUpperCase())}/constituencies`,
      { authPolicy: 'public' },
    );
    return validateConstituenciesListResponse(res.data);
  }

  /**
   * Get single constituency detail (accepts AC number or canonical ID like 'TS-AC-65').
   */
  async getConstituency(stateCode: string, constituencyId: string | number): Promise<ConstituencyDetailDTO> {
    if (!stateCode || typeof stateCode !== 'string') {
      throw new ApiValidationError('Invalid stateCode: must be a non-empty string');
    }
    if (!constituencyId || (typeof constituencyId !== 'string' && typeof constituencyId !== 'number')) {
      throw new ApiValidationError('Invalid constituencyId: must be a non-empty string or number');
    }
    const res = await this.client.get<unknown>(
      `/api/v1/states/${encodeURIComponent(stateCode.toUpperCase())}/constituencies/${encodeURIComponent(String(constituencyId))}`,
      { authPolicy: 'public' },
    );
    return validateConstituencyDetail(res.data, `states/${stateCode}/constituencies/${constituencyId}`);
  }

  /**
   * Search constituencies within a state.
   */
  async searchConstituencies(
    stateCode: string,
    options: SearchConstituenciesOptions = {},
  ): Promise<ConstituenciesListResponseDTO> {
    if (!stateCode || typeof stateCode !== 'string') {
      throw new ApiValidationError('Invalid stateCode: must be a non-empty string');
    }
    const query: Record<string, string | number> = {};
    if (options.q) query.q = options.q;
    if (options.party) query.party = options.party;
    if (options.district) query.district = options.district;
    if (options.type) query.type = options.type;
    if (options.sort) query.sort = options.sort;

    const res = await this.client.get<unknown>(
      `/api/v1/states/${encodeURIComponent(stateCode.toUpperCase())}/constituencies/search`,
      {
        authPolicy: 'public',
        query,
      },
    );
    return validateConstituenciesListResponse(res.data);
  }
}
