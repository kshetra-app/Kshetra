/**
 * Aspirant Academy API Endpoint
 * Master Execution Framework — Jobs 011-012 / Launch Gate A Prerequisite
 *
 * Target Fastify Routes:
 * - POST /api/v1/aspirant/register
 * - POST /api/v1/aspirant/modules/:id/start
 * - POST /api/v1/aspirant/modules/:id/complete
 * - POST /api/v1/aspirant/challenges/:id/join
 * - POST /api/v1/aspirant/:id/endorse
 */

import type { ApiClient } from '../client';
import { ApiValidationError } from '../errors';

export interface RegisterAspirantRequestDTO {
  displayName?: string;
  bio?: string;
  stateCode?: string;
  targetConstituencyAcNo?: number;
  targetConstituencyName?: string;
  targetConstituencyId?: string;
  partyAffiliation?: string;
  isIndependent?: boolean;
  manifestoUrl?: string;
  visionSummary?: string;
  userId?: string;
}

export class AspirantEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * 1. Register candidate profile
   */
  async register(
    userIdOrPayload: string | RegisterAspirantRequestDTO,
    maybePayload?: RegisterAspirantRequestDTO,
  ): Promise<{ success: boolean; profile?: any }> {
    const payload = typeof userIdOrPayload === 'string'
      ? { ...maybePayload, userId: userIdOrPayload }
      : userIdOrPayload;

    const res = await this.client.post<{ success: boolean; profile?: any }>(
      '/api/v1/aspirant/register',
      payload,
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 2. Start module
   */
  async startModule(moduleId: string): Promise<{ success: boolean; moduleId: string; started: boolean }> {
    if (!moduleId) {
      throw new ApiValidationError('Invalid start module: moduleId is required');
    }
    const res = await this.client.post<{ success: boolean; moduleId: string; started: boolean }>(
      `/api/v1/aspirant/modules/${encodeURIComponent(moduleId)}/start`,
      {},
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 3. Complete module
   */
  async completeModule(moduleId: string, quizScore?: number): Promise<{ success: boolean; moduleId: string }> {
    if (!moduleId) {
      throw new ApiValidationError('Invalid complete module: moduleId is required');
    }
    const res = await this.client.post<{ success: boolean; moduleId: string }>(
      `/api/v1/aspirant/modules/${encodeURIComponent(moduleId)}/complete`,
      { quizScore },
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 4. Join challenge
   */
  async joinChallenge(challengeId: string): Promise<{ success: boolean; challengeId: string }> {
    if (!challengeId) {
      throw new ApiValidationError('Invalid join challenge: challengeId is required');
    }
    const res = await this.client.post<{ success: boolean; challengeId: string }>(
      `/api/v1/aspirant/challenges/${encodeURIComponent(challengeId)}/join`,
      {},
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 5. Endorse candidate
   */
  async endorseAspirant(aspirantId: string, message?: string): Promise<{ success: boolean; aspirantId: string }> {
    if (!aspirantId) {
      throw new ApiValidationError('Invalid endorse aspirant: aspirantId is required');
    }
    const res = await this.client.post<{ success: boolean; aspirantId: string }>(
      `/api/v1/aspirant/${encodeURIComponent(aspirantId)}/endorse`,
      { message },
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }
}
