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
import type { ConstituencyBrief, SubConstituencyHierarchyDTO } from '@kshetra/shared';

export interface ConstituencyElectionSummary {
  electionYear: number | null;
  electionType: 'GENERAL' | 'BYPOLL' | null;
  winner: string;
  winnerName: string;
  winnerVotes: number | null;
  runnerUp: string;
  margin: number | null;
  marginPercent: number | null;
}

export interface ConstituencyElectionHistoryItem {
  electionYear: number | null;
  electionType: 'GENERAL' | 'BYPOLL' | null;
  winner: string;
  winnerName: string;
  winnerVotes: number | null;
  runnerUp: string;
  margin: number | null;
  marginPercent: number | null;
}

export interface ConstituencyDetailDTO extends ConstituencyBrief {
  recentElection?: ConstituencyElectionSummary;
  elections?: ConstituencyElectionHistoryItem[];
  election2023?: {
    winner: string;
    winnerName: string;
    winnerVotes: number | null;
    runnerUp: string;
    margin: number | null;
    marginPercent: number | null;
  };
}

export interface ConstituenciesListResponseDTO {
  state: string;
  count: number;
  data: ConstituencyBrief[];
}

function hierarchyRecord(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ApiValidationError(`Invalid hierarchy data at ${context}: expected object`);
  }
  return value as Record<string, unknown>;
}

function hierarchyString(value: unknown, context: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiValidationError(`Invalid hierarchy data at ${context}: expected non-empty string`);
  }
  return value;
}

function hierarchyArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new ApiValidationError(`Invalid hierarchy data at ${context}: expected array`);
  }
  return value;
}

function hierarchyNullableNumber(value: unknown, context: string): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ApiValidationError(`Invalid hierarchy data at ${context}: expected finite number or null`);
  }
  return value;
}

function hierarchyNullableString(value: unknown, context: string): string | null {
  if (value === null) return null;
  return hierarchyString(value, context);
}

function hierarchyOptionalString(value: unknown, context: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return hierarchyString(value, context);
}

function validateHierarchyWards(value: unknown, context: string): Array<{
  id: string;
  internalId: string;
  wardNo: number;
  name: string | null;
  reservation: string;
}> {
  return hierarchyArray(value, context).map((wardValue, index) => {
    const wardContext = `${context}[${index}]`;
    const ward = hierarchyRecord(wardValue, wardContext);
    const wardNo = hierarchyNullableNumber(ward.wardNo, `${wardContext}.wardNo`);
    if (wardNo === null || !Number.isInteger(wardNo) || wardNo <= 0) {
      throw new ApiValidationError(`Invalid hierarchy data at ${wardContext}.wardNo`);
    }
    return {
      id: hierarchyString(ward.id, `${wardContext}.id`),
      internalId: hierarchyString(ward.internalId, `${wardContext}.internalId`),
      wardNo,
      name: hierarchyNullableString(ward.name, `${wardContext}.name`),
      reservation: hierarchyString(ward.reservation, `${wardContext}.reservation`),
    };
  });
}

export function validateConstituencyHierarchy(data: unknown): SubConstituencyHierarchyDTO {
  const root = hierarchyRecord(data, 'root');
  const rawConstituency = hierarchyRecord(root.constituency, 'constituency');
  const reservationStatus = rawConstituency.reservationStatus;
  if (reservationStatus !== 'GEN' && reservationStatus !== 'SC' && reservationStatus !== 'ST') {
    throw new ApiValidationError('Invalid hierarchy data at constituency.reservationStatus');
  }

  const acNo = hierarchyNullableNumber(rawConstituency.acNo, 'constituency.acNo');
  if (acNo === null || !Number.isInteger(acNo) || acNo <= 0) {
    throw new ApiValidationError('Invalid hierarchy data at constituency.acNo');
  }
  if (typeof rawConstituency.district !== 'string') {
    throw new ApiValidationError('Invalid hierarchy data at constituency.district');
  }

  const constituency: SubConstituencyHierarchyDTO['constituency'] = {
    id: hierarchyString(rawConstituency.id, 'constituency.id'),
    internalId: hierarchyString(rawConstituency.internalId, 'constituency.internalId'),
    acNo,
    name: hierarchyString(rawConstituency.name, 'constituency.name'),
    stateCode: hierarchyString(rawConstituency.stateCode, 'constituency.stateCode'),
    district: rawConstituency.district,
    reservationStatus,
  };
  const urbanLocalBodies: SubConstituencyHierarchyDTO['urbanLocalBodies'] = hierarchyArray(root.urbanLocalBodies, 'urbanLocalBodies').map((value, index) => {
    const context = `urbanLocalBodies[${index}]`;
    const row = hierarchyRecord(value, context);
    return {
      id: hierarchyString(row.id, `${context}.id`),
      internalId: hierarchyString(row.internalId, `${context}.internalId`),
      name: hierarchyString(row.name, `${context}.name`),
      localName: hierarchyOptionalString(row.localName, `${context}.localName`),
      type: hierarchyString(row.type, `${context}.type`),
      lgdCode: hierarchyNullableNumber(row.lgdCode, `${context}.lgdCode`),
      totalWards: hierarchyNullableNumber(row.totalWards, `${context}.totalWards`),
      wards: validateHierarchyWards(row.wards, `${context}.wards`),
    };
  });
  const gramPanchayats: SubConstituencyHierarchyDTO['gramPanchayats'] = hierarchyArray(root.gramPanchayats, 'gramPanchayats').map((value, index) => {
    const context = `gramPanchayats[${index}]`;
    const row = hierarchyRecord(value, context);
    return {
      id: hierarchyString(row.id, `${context}.id`),
      internalId: hierarchyString(row.internalId, `${context}.internalId`),
      name: hierarchyString(row.name, `${context}.name`),
      localName: hierarchyOptionalString(row.localName, `${context}.localName`),
      mandalId: hierarchyString(row.mandalId, `${context}.mandalId`),
      lgdCode: hierarchyNullableNumber(row.lgdCode, `${context}.lgdCode`),
      wards: validateHierarchyWards(row.wards, `${context}.wards`),
    };
  });
  const pollingBooths = hierarchyArray(root.pollingBooths, 'pollingBooths').map((value, index) => {
    const context = `pollingBooths[${index}]`;
    const row = hierarchyRecord(value, context);
    const localBodyType = row.localBodyType;
    if (localBodyType !== 'ulb' && localBodyType !== 'gram_panchayat' && localBodyType !== 'unassigned') {
      throw new ApiValidationError(`Invalid hierarchy data at ${context}.localBodyType`);
    }
    const validatedLocalBodyType: SubConstituencyHierarchyDTO['pollingBooths'][number]['localBodyType'] = localBodyType;
    const boothNumber = hierarchyNullableNumber(row.boothNumber, `${context}.boothNumber`);
    if (boothNumber === null || !Number.isInteger(boothNumber) || boothNumber < 0) {
      throw new ApiValidationError(`Invalid hierarchy data at ${context}.boothNumber`);
    }
    const totalVoters = hierarchyNullableNumber(row.totalVoters, `${context}.totalVoters`);
    if (totalVoters !== null && totalVoters < 0) {
      throw new ApiValidationError(`Invalid hierarchy data at ${context}.totalVoters`);
    }
    const panchayatId = row.panchayatId;
    const ulbWardId = row.ulbWardId;
    const gpWardId = row.gpWardId;

    return {
      id: hierarchyString(row.id, `${context}.id`),
      internalId: hierarchyString(row.internalId, `${context}.internalId`),
      boothNumber,
      boothName: hierarchyString(row.boothName, `${context}.boothName`),
      pollingStationName: hierarchyNullableString(row.pollingStationName, `${context}.pollingStationName`),
      totalVoters: totalVoters !== null && totalVoters > 0 ? totalVoters : null,
      localBodyType: validatedLocalBodyType,
      panchayatId: panchayatId === undefined || panchayatId === null ? panchayatId : hierarchyString(panchayatId, `${context}.panchayatId`),
      ulbWardId: ulbWardId === undefined || ulbWardId === null ? ulbWardId : hierarchyString(ulbWardId, `${context}.ulbWardId`),
      gpWardId: gpWardId === undefined || gpWardId === null ? gpWardId : hierarchyString(gpWardId, `${context}.gpWardId`),
    };
  });

  return { constituency, urbanLocalBodies, gramPanchayats, pollingBooths };
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

  let recentElection: ConstituencyElectionSummary | undefined;
  if (obj.recentElection && typeof obj.recentElection === 'object' && !Array.isArray(obj.recentElection)) {
    const el = obj.recentElection as Record<string, unknown>;
    let electionType: 'GENERAL' | 'BYPOLL' | null = null;
    if (el.electionType === 'GENERAL' || el.electionType === 'BYPOLL') {
      electionType = el.electionType;
    } else if (el.electionType === null || el.electionType === undefined) {
      electionType = null;
    } else {
      throw new ApiValidationError(`Invalid recentElection.electionType: "${el.electionType}". Expected "GENERAL", "BYPOLL", or null.`);
    }

    recentElection = {
      electionYear: typeof el.electionYear === 'number' ? el.electionYear : null,
      electionType,
      winner: typeof el.winner === 'string' ? el.winner : '',
      winnerName: typeof el.winnerName === 'string' ? el.winnerName : '',
      winnerVotes: typeof el.winnerVotes === 'number' ? el.winnerVotes : null,
      runnerUp: typeof el.runnerUp === 'string' ? el.runnerUp : '',
      margin: typeof el.margin === 'number' ? el.margin : null,
      marginPercent: typeof el.marginPercent === 'number' ? el.marginPercent : null,
    };
  }

  let elections: ConstituencyElectionHistoryItem[] | undefined;
  if (Array.isArray(obj.elections)) {
    elections = obj.elections.map((item, idx) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        throw new ApiValidationError(`Invalid elections[${idx}]: expected object payload`);
      }
      const el = item as Record<string, unknown>;
      let electionType: 'GENERAL' | 'BYPOLL' | null = null;
      if (el.electionType === 'GENERAL' || el.electionType === 'BYPOLL') {
        electionType = el.electionType;
      } else if (el.electionType === null || el.electionType === undefined) {
        electionType = null;
      } else {
        throw new ApiValidationError(`Invalid elections[${idx}].electionType: "${el.electionType}". Expected "GENERAL", "BYPOLL", or null.`);
      }

      return {
        electionYear: typeof el.electionYear === 'number' ? el.electionYear : (typeof el.year === 'number' ? el.year : null),
        electionType,
        winner: typeof el.winner === 'string' ? el.winner : '',
        winnerName: typeof el.winnerName === 'string' ? el.winnerName : '',
        winnerVotes: typeof el.winnerVotes === 'number' ? el.winnerVotes : null,
        runnerUp: typeof el.runnerUp === 'string' ? el.runnerUp : '',
        margin: typeof el.margin === 'number' ? el.margin : null,
        marginPercent: typeof el.marginPercent === 'number' ? el.marginPercent : null,
      };
    });
  }

  let election2023: ConstituencyDetailDTO['election2023'];
  if (obj.election2023 && typeof obj.election2023 === 'object' && !Array.isArray(obj.election2023)) {
    const el = obj.election2023 as Record<string, unknown>;
    election2023 = {
      winner: typeof el.winner === 'string' ? el.winner : '',
      winnerName: typeof el.winnerName === 'string' ? el.winnerName : '',
      winnerVotes: typeof el.winnerVotes === 'number' ? el.winnerVotes : null,
      runnerUp: typeof el.runnerUp === 'string' ? el.runnerUp : '',
      margin: typeof el.margin === 'number' ? el.margin : null,
      marginPercent: typeof el.marginPercent === 'number' ? el.marginPercent : null,
    };
  }

  return {
    ...brief,
    recentElection,
    elections,
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

  /** Fetch only persisted hierarchy records for one assembly constituency. */
  async getHierarchy(stateCode: string, acNo: number): Promise<SubConstituencyHierarchyDTO> {
    if (!stateCode || typeof stateCode !== 'string') {
      throw new ApiValidationError('Invalid stateCode: must be a non-empty string');
    }
    if (!Number.isInteger(acNo) || acNo <= 0) {
      throw new ApiValidationError('Invalid acNo: must be a positive integer');
    }

    const res = await this.client.get<unknown>(
      `/api/v1/constituencies/${encodeURIComponent(stateCode.toUpperCase())}/${acNo}/hierarchy`,
      { authPolicy: 'public' },
    );
    return validateConstituencyHierarchy(res.data);
  }
}
