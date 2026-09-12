/**
 * Pages API Endpoint
 * Master Execution Framework — JOB W007
 * 
 * Target Fastify Route:
 * - GET /api/v1/pages/:pageId/entitlement (PUBLIC)
 */

import type { ApiClient } from '../client';
import type { PageEntitlementResponseDTO } from '../types';

export class PagesEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * Retrieves entitlement details for a specific Page.
   * Explicitly declared as a PUBLIC endpoint.
   */
  async getEntitlement(pageId: string): Promise<PageEntitlementResponseDTO> {
    const encodedPageId = encodeURIComponent(pageId);
    const response = await this.client.get<PageEntitlementResponseDTO>(
      `/api/v1/pages/${encodedPageId}/entitlement`,
      {
        authPolicy: 'public',
      },
    );
    return response.data;
  }
}
