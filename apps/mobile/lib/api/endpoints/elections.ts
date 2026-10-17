/**
 * Elections API Endpoint
 * Master Execution Framework — W021.5 / Directive 083
 *
 * Target Fastify Routes:
 * - GET /api/v1/elections
 * - GET /api/v1/elections/:id
 * - GET /api/v1/elections/:id/contests
 * - GET /api/v1/elections/:id/contests/:constituencyId
 * - GET /api/v1/elections/persons/:personId
 */

import type { ApiClient } from '../client';
import { ApiValidationError } from '../errors';
import type {
  ElectionEvent,
  ElectionContest,
  ContestDetail,
  Candidacy,
} from '@kshetra/shared';

export interface ListElectionsOptions {
  state?: string;
  year?: number;
  type?: string;
  limit?: number;
  offset?: number;
}

export interface ListContestsOptions {
  search?: string;
  party?: string;
  limit?: number;
  offset?: number;
}

export interface StandardListEnvelope<T> {
  success: boolean;
  data: T[];
  metadata?: {
    total: number;
    limit: number;
    offset: number;
  };
  error: null | { code: string; message: string };
}

export interface StandardItemEnvelope<T> {
  success: boolean;
  data: T;
  error: null | { code: string; message: string };
}

export class ElectionsEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * List macro election events.
   */
  async listElections(options: ListElectionsOptions = {}): Promise<StandardListEnvelope<ElectionEvent>> {
    const query: Record<string, string | number> = {};
    if (options.state) query.state = options.state;
    if (options.year) query.year = options.year;
    if (options.type) query.type = options.type;
    if (options.limit) query.limit = options.limit;
    if (options.offset) query.offset = options.offset;

    const res = await this.client.get<StandardListEnvelope<ElectionEvent>>('/api/v1/elections', {
      authPolicy: 'public',
      query,
    });
    return res.data;
  }

  /**
   * Get single election event by ID or code.
   */
  async getElection(id: string): Promise<ElectionEvent> {
    if (!id || typeof id !== 'string') {
      throw new ApiValidationError('Invalid election id: must be a non-empty string');
    }
    const res = await this.client.get<StandardItemEnvelope<ElectionEvent>>(
      `/api/v1/elections/${encodeURIComponent(id)}`,
      { authPolicy: 'public' },
    );
    return res.data.data;
  }

  /**
   * List contests within an election.
   */
  async listContests(
    electionId: string,
    options: ListContestsOptions = {},
  ): Promise<StandardListEnvelope<ElectionContest>> {
    if (!electionId || typeof electionId !== 'string') {
      throw new ApiValidationError('Invalid electionId: must be a non-empty string');
    }
    const query: Record<string, string | number> = {};
    if (options.search) query.search = options.search;
    if (options.party) query.party = options.party;
    if (options.limit) query.limit = options.limit;
    if (options.offset) query.offset = options.offset;

    const res = await this.client.get<StandardListEnvelope<ElectionContest>>(
      `/api/v1/elections/${encodeURIComponent(electionId)}/contests`,
      {
        authPolicy: 'public',
        query,
      },
    );
    return res.data;
  }

  /**
   * Get full contest detail (candidates, NOTA, winner, runner-up).
   */
  async getContestDetail(electionId: string, constituencyId: string): Promise<ContestDetail> {
    if (!electionId || typeof electionId !== 'string') {
      throw new ApiValidationError('Invalid electionId: must be a non-empty string');
    }
    if (!constituencyId || typeof constituencyId !== 'string') {
      throw new ApiValidationError('Invalid constituencyId: must be a non-empty string');
    }
    const res = await this.client.get<StandardItemEnvelope<ContestDetail>>(
      `/api/v1/elections/${encodeURIComponent(electionId)}/contests/${encodeURIComponent(constituencyId)}`,
      { authPolicy: 'public' },
    );
    return res.data.data;
  }

  /**
   * Complete electoral history for a canonical person.
   */
  async getPersonElections(personId: string): Promise<Candidacy[]> {
    if (!personId || typeof personId !== 'string') {
      throw new ApiValidationError('Invalid personId: must be a non-empty string');
    }
    const res = await this.client.get<StandardListEnvelope<Candidacy>>(
      `/api/v1/elections/persons/${encodeURIComponent(personId)}`,
      { authPolicy: 'public' },
    );
    return res.data.data;
  }
}
