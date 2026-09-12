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
import { ApiValidationError } from '../errors';

/**
 * Validates the runtime schema of FeatureFlagsResponseDTO.
 * Throws ApiValidationError if the structure is malformed.
 */
export function validateFeatureFlagsResponse(data: unknown): FeatureFlagsResponseDTO {
  if (typeof data !== 'object' || data === null) {
    throw new ApiValidationError('Invalid feature flags response: expected object payload');
  }
  const payload = data as Record<string, unknown>;
  if (typeof payload.status !== 'string') {
    throw new ApiValidationError('Invalid feature flags response: missing or invalid "status" field');
  }
  if (typeof payload.flags !== 'object' || payload.flags === null || Array.isArray(payload.flags)) {
    throw new ApiValidationError('Invalid feature flags response: missing or invalid "flags" object');
  }
  return data as FeatureFlagsResponseDTO;
}

export class ConfigEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * Retrieves active feature flags.
   * Explicitly declared as a PUBLIC endpoint.
   */
  async getFlags(): Promise<FeatureFlagsResponseDTO> {
    const response = await this.client.get<unknown>('/api/v1/config/flags', {
      authPolicy: 'public',
    });
    return validateFeatureFlagsResponse(response.data);
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
