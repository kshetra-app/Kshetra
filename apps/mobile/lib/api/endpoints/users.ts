/**
 * Users & Profiles API Endpoint
 * Master Execution Framework — Jobs 011-012 / Launch Gate A Prerequisite
 *
 * Target Fastify Routes:
 * - PATCH  /api/v1/user/profile
 * - POST   /api/v1/users/:id/follow
 * - DELETE /api/v1/users/:id/follow
 */

import type { ApiClient } from '../client';
import { ApiValidationError } from '../errors';

export interface UpdateProfileRequestDTO {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  constituencyId?: string;
  preferredLanguage?: string;
  stateCode?: string;
}

export class UsersEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * 1. Update user profile
   */
  async updateProfile(payload: UpdateProfileRequestDTO): Promise<{ success: boolean; profile?: any }> {
    const res = await this.client.patch<{ success: boolean; profile?: any }>(
      '/api/v1/user/profile',
      payload,
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 2. Follow user
   */
  async followUser(targetUserId: string): Promise<{ success: boolean; targetUserId: string; followed: boolean }> {
    if (!targetUserId) {
      throw new ApiValidationError('Invalid follow user: targetUserId is required');
    }
    const res = await this.client.post<{ success: boolean; targetUserId: string; followed: boolean }>(
      `/api/v1/users/${encodeURIComponent(targetUserId)}/follow`,
      {},
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 3. Unfollow user
   */
  async unfollowUser(targetUserId: string): Promise<{ success: boolean; targetUserId: string; unfollowed: boolean }> {
    if (!targetUserId) {
      throw new ApiValidationError('Invalid unfollow user: targetUserId is required');
    }
    const res = await this.client.delete<{ success: boolean; targetUserId: string; unfollowed: boolean }>(
      `/api/v1/users/${encodeURIComponent(targetUserId)}/follow`,
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }
}
