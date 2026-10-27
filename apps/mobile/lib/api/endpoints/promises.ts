/**
 * Promises & User Favorites API Endpoint
 * Master Execution Framework — Jobs 011-012 / Launch Gate A Prerequisite
 *
 * Target Fastify Routes:
 * - POST   /api/v1/promises/:id/follow
 * - POST   /api/v1/promises/:id/evidence
 * - POST   /api/v1/user/favorites/toggle
 */

import type { ApiClient } from '../client';
import { ApiValidationError } from '../errors';

export interface SubmitEvidenceRequestDTO {
  title?: string;
  description?: string;
  mediaUrls?: string[];
  statusClaim?: string;
  type?: string;
  url?: string;
  userId?: string;
}

export class PromisesEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * 1. Follow / unfollow promise
   */
  async followPromise(promiseId: string, follow: boolean = true): Promise<{ success: boolean; promiseId: string; following: boolean }> {
    if (!promiseId) {
      throw new ApiValidationError('Invalid follow promise: promiseId is required');
    }
    const res = await this.client.post<{ success: boolean; promiseId: string; following: boolean }>(
      `/api/v1/promises/${encodeURIComponent(promiseId)}/follow`,
      { follow },
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 2. Submit promise evidence
   */
  async submitEvidence(promiseId: string, payload: SubmitEvidenceRequestDTO): Promise<{ success: boolean; id: string; promiseId: string }> {
    if (!promiseId) {
      throw new ApiValidationError('Invalid evidence: promiseId is required');
    }
    const title = payload?.title || payload?.description || 'Citizen Evidence';
    const res = await this.client.post<{ success: boolean; id: string; promiseId: string }>(
      `/api/v1/promises/${encodeURIComponent(promiseId)}/evidence`,
      { ...payload, title },
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 3. Toggle user favorite
   */
  async toggleFavorite(
    targetTypeOrConstituency: string,
    targetIdOrUserId: string,
    isFavorited: boolean,
  ): Promise<{ success: boolean; targetType: string; targetId: string; isFavorited: boolean }> {
    const targetType = 'constituency';
    const targetId = targetTypeOrConstituency;
    const res = await this.client.post<{ success: boolean; targetType: string; targetId: string; isFavorited: boolean }>(
      '/api/v1/user/favorites/toggle',
      { targetType, targetId, isFavorited },
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }
}
