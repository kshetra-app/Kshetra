/**
 * States API Endpoint
 * Master Execution Framework — JOB W008
 */

import type { ApiClient } from '../client';
import { ApiValidationError } from '../errors';

export interface StateInfoDTO {
  code: string;
  name: string;
  party?: string;
  rulingParty?: string;
  capital?: string;
  population?: number;
  totalACs?: number;
  totalPCs?: number;
}

export interface StatesListResponseDTO {
  states: StateInfoDTO[];
}

export function validateStateInfo(data: unknown, context: string): StateInfoDTO {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ApiValidationError(`Invalid state data at ${context}: expected object`);
  }
  const s = data as Record<string, unknown>;
  if (typeof s.code !== 'string' || !s.code.trim()) {
    throw new ApiValidationError(`Invalid state data at ${context}: missing code`);
  }
  if (typeof s.name !== 'string' || !s.name.trim()) {
    throw new ApiValidationError(`Invalid state data at ${context}: missing name`);
  }
  return {
    code: s.code,
    name: s.name,
    party: typeof s.party === 'string' ? s.party : undefined,
    rulingParty: typeof s.rulingParty === 'string' ? s.rulingParty : undefined,
    capital: typeof s.capital === 'string' ? s.capital : undefined,
    population: typeof s.population === 'number' ? s.population : undefined,
    totalACs: typeof s.totalACs === 'number' ? s.totalACs : undefined,
    totalPCs: typeof s.totalPCs === 'number' ? s.totalPCs : undefined,
  };
}

export function validateStatesListResponse(data: unknown): StatesListResponseDTO {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ApiValidationError('Invalid states list response: expected object payload');
  }
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.states)) {
    throw new ApiValidationError('Invalid states list response: "states" must be an array');
  }
  return {
    states: obj.states.map((s, idx) => validateStateInfo(s, `states[${idx}]`)),
  };
}

export class StatesEndpoint {
  constructor(private readonly client: ApiClient) {}

  async listStates(): Promise<StatesListResponseDTO> {
    const res = await this.client.get<unknown>('/api/v1/states', {
      authPolicy: 'public',
    });
    return validateStatesListResponse(res.data);
  }

  async getState(code: string): Promise<StateInfoDTO> {
    const res = await this.client.get<unknown>(`/api/v1/states/${encodeURIComponent(code)}`, {
      authPolicy: 'public',
    });
    return validateStateInfo(res.data, `states/${code}`);
  }
}
