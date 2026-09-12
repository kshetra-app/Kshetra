/**
 * Pages API Endpoint
 * Master Execution Framework — JOB W007
 * 
 * Target Fastify Route:
 * - GET /api/v1/pages/:pageId/entitlement (PUBLIC)
 */

import type { ApiClient } from '../client';
import type { PageEntitlementResponseDTO } from '../types';
import { ApiValidationError } from '../errors';

/**
 * Validates the runtime schema of PageEntitlementResponseDTO.
 * Throws ApiValidationError if the structure is malformed.
 */
export function validatePageEntitlementResponse(data: unknown): PageEntitlementResponseDTO {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ApiValidationError('Invalid page entitlement response: expected object payload');
  }
  const payload = data as Record<string, unknown>;
  if (typeof payload.success !== 'boolean') {
    throw new ApiValidationError(`Invalid page entitlement response: missing or invalid "success" field (expected boolean, received ${typeof payload.success})`);
  }
  if (typeof payload.pageId !== 'string' || !payload.pageId.trim()) {
    throw new ApiValidationError('Invalid page entitlement response: missing or invalid "pageId" field (must be non-empty string)');
  }
  if (typeof payload.isPro !== 'boolean') {
    throw new ApiValidationError(`Invalid page entitlement response: missing or invalid "isPro" field (expected boolean, received ${typeof payload.isPro})`);
  }
  if (payload.plan !== 'free' && payload.plan !== 'pro') {
    throw new ApiValidationError(`Invalid page entitlement response: "plan" must be "free" or "pro", received "${payload.plan}"`);
  }
  if (payload.expiresAt !== null && typeof payload.expiresAt !== 'string') {
    throw new ApiValidationError(`Invalid page entitlement response: "expiresAt" must be a string or null, received ${typeof payload.expiresAt}`);
  }
  if (typeof payload.expiresAt === 'string' && Number.isNaN(Date.parse(payload.expiresAt))) {
    throw new ApiValidationError('Invalid page entitlement response: "expiresAt" string is not a valid date');
  }
  return {
    success: payload.success,
    pageId: payload.pageId,
    isPro: payload.isPro,
    plan: payload.plan,
    expiresAt: (payload.expiresAt ?? null) as string | null,
  };
}

export class PagesEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * Retrieves entitlement details for a specific Page.
   * Explicitly declared as a PUBLIC endpoint.
   */
  async getEntitlement(pageId: string): Promise<PageEntitlementResponseDTO> {
    const encodedPageId = encodeURIComponent(pageId);
    const response = await this.client.get<unknown>(
      `/api/v1/pages/${encodedPageId}/entitlement`,
      {
        authPolicy: 'public',
      },
    );
    return validatePageEntitlementResponse(response.data);
  }
}
