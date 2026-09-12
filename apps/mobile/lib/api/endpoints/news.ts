/**
 * News API Endpoint
 * Master Execution Framework — JOB W007
 * 
 * Target Fastify Route:
 * - GET /api/v1/news/feed (PUBLIC)
 */

import type { ApiClient } from '../client';
import type { NewsFeedFiltersDTO, NewsFeedResponseDTO } from '../types';

export class NewsEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * Retrieves news feed with optional filters.
   * Explicitly declared as a PUBLIC endpoint.
   */
  async getFeed(filters?: NewsFeedFiltersDTO): Promise<NewsFeedResponseDTO> {
    const query: Record<string, string | number | undefined> = {};
    if (filters) {
      if (filters.lang) query.lang = filters.lang;
      if (filters.scope) query.scope = filters.scope;
      if (filters.state) query.state = filters.state;
      if (filters.category) query.category = filters.category;
      if (filters.limit !== undefined) query.limit = filters.limit;
    }

    const response = await this.client.get<NewsFeedResponseDTO>('/api/v1/news/feed', {
      authPolicy: 'public',
      query,
    });
    return response.data;
  }
}
