/**
 * Config Flags API Endpoint
 * Master Execution Framework — JOB W007
 * 
 * Target Fastify Routes:
 * - GET /api/v1/config/flags (PUBLIC)
 * - PATCH /api/v1/config/flags (AUTHENTICATED)
 */

import type { ApiClient } from '../client';
import type { FeatureFlagsResponseDTO } from '../types';

export class ConfigEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * Retrieves active feature flags.
   * Explicitly declared as a PUBLIC endpoint.
   */
  async getFlags(): Promise<FeatureFlagsResponseDTO> {
    const response = await this.client.get<FeatureFlagsResponseDTO>('/api/v1/config/flags', {
      authPolicy: 'public',
    });
    return response.data;
  }

  /**
   * Updates feature flags dynamically (admin/privileged).
   * Explicitly declared as an AUTHENTICATED endpoint.
   */
  async updateFlags(
    updates: Record<string, boolean>,
  ): Promise<{ status: string; flags: Record<string, boolean>; updatedAt: string }> {
    const response = await this.client.patch<{
      status: string;
      flags: Record<string, boolean>;
      updatedAt: string;
    }>('/api/v1/config/flags', updates, {
      authPolicy: 'authenticated',
    });
    return response.data;
  }
}
