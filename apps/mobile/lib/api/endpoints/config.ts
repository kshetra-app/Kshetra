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
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ApiValidationError('Invalid feature flags response: expected object payload');
  }
  const payload = data as Record<string, unknown>;
  if (typeof payload.status !== 'string' || !payload.status.trim()) {
    throw new ApiValidationError('Invalid feature flags response: missing or invalid "status" field');
  }
  if (typeof payload.flags !== 'object' || payload.flags === null || Array.isArray(payload.flags)) {
    throw new ApiValidationError('Invalid feature flags response: missing or invalid "flags" object');
  }

  const rawFlags = payload.flags as Record<string, unknown>;
  const validatedFlags: Record<string, boolean> = {};

  for (const [key, val] of Object.entries(rawFlags)) {
    if (typeof val !== 'boolean') {
      throw new ApiValidationError(`Invalid feature flags response: flag "${key}" must be a boolean, received ${val === null ? 'null' : typeof val}`);
    }
    validatedFlags[key] = val;
  }

  if (payload.syncedAt !== undefined && typeof payload.syncedAt !== 'string') {
    throw new ApiValidationError('Invalid feature flags response: "syncedAt" must be a string if provided');
  }

  return {
    status: payload.status,
    flags: validatedFlags,
    syncedAt: payload.syncedAt as string | undefined,
  };
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
