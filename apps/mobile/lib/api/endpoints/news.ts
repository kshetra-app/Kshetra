/**
 * News API Endpoint
 * Master Execution Framework — JOB W007
 * 
 * Target Fastify Route:
 * - GET /api/v1/news/feed (PUBLIC)
 */

import type { ApiClient } from '../client';
import type { NewsFeedFiltersDTO, NewsFeedResponseDTO, NewsItemDTO, NewsSourceDTO } from '../types';
import type { NewsFeed, NewsItem, NewsSource, NewsCategory, NewsLanguageCode, NewsScope } from '../../newsTypes';
import { ApiValidationError } from '../errors';

/**
 * Validates the runtime schema of NewsFeedResponseDTO.
 * Throws ApiValidationError if the structure is malformed.
 */
export function validateNewsFeedResponse(data: unknown): NewsFeedResponseDTO {
  if (typeof data !== 'object' || data === null) {
    throw new ApiValidationError('Invalid news feed response: expected object payload');
  }
  const payload = data as Record<string, unknown>;
  if (typeof payload.version !== 'number' && typeof payload.version !== 'string') {
    throw new ApiValidationError('Invalid news feed response: missing or invalid "version"');
  }
  if (typeof payload.generatedAt !== 'string') {
    throw new ApiValidationError('Invalid news feed response: missing or invalid "generatedAt"');
  }
  if (typeof payload.refreshIntervalMin !== 'number') {
    throw new ApiValidationError('Invalid news feed response: missing or invalid "refreshIntervalMin"');
  }
  if (!Array.isArray(payload.items)) {
    throw new ApiValidationError('Invalid news feed response: "items" must be an array');
  }
  if (!Array.isArray(payload.sources)) {
    throw new ApiValidationError('Invalid news feed response: "sources" must be an array');
  }

  for (let idx = 0; idx < payload.items.length; idx++) {
    const item = payload.items[idx];
    if (typeof item !== 'object' || item === null) {
      throw new ApiValidationError(`Invalid news item at index ${idx}: expected object`);
    }
    const it = item as Record<string, unknown>;
    if (typeof it.id !== 'string' || !it.id) {
      throw new ApiValidationError(`Invalid news item at index ${idx}: missing or empty "id"`);
    }
    if (typeof it.title !== 'string') {
      throw new ApiValidationError(`Invalid news item at index ${idx}: missing or invalid "title"`);
    }
    if (typeof it.sourceUrl !== 'string') {
      throw new ApiValidationError(`Invalid news item at index ${idx}: missing or invalid "sourceUrl"`);
    }
    if (typeof it.language !== 'string') {
      throw new ApiValidationError(`Invalid news item at index ${idx}: missing or invalid "language"`);
    }
    if (it.source === undefined || it.source === null) {
      throw new ApiValidationError(`Invalid news item at index ${idx}: missing "source"`);
    }
  }

  return data as NewsFeedResponseDTO;
}

/**
 * Maps NewsFeedResponseDTO to mobile NewsFeed schema without unsafe type casting.
 */
export function mapNewsFeedDTOToNewsFeed(dto: NewsFeedResponseDTO): NewsFeed {
  const sources: NewsSource[] = (dto.sources || []).map((s: NewsSourceDTO) => ({
    id: s.id || (s.name ? s.name.toLowerCase().replace(/\s+/g, '-') : 'unknown'),
    name: s.name || 'Unknown Source',
    domain: s.domain || '',
    language: (s.language || 'en') as NewsLanguageCode,
    accent: s.accent,
    verified: s.verified ?? true,
  }));

  const items: NewsItem[] = dto.items.map((it: NewsItemDTO) => {
    let sourceObj: NewsSource;
    if (typeof it.source === 'object' && it.source !== null) {
      sourceObj = {
        id: it.source.id || (it.source.name ? it.source.name.toLowerCase().replace(/\s+/g, '-') : 'unknown'),
        name: it.source.name || 'Unknown Source',
        domain: it.source.domain || '',
        language: (it.source.language || it.language || 'en') as NewsLanguageCode,
        accent: it.source.accent,
        verified: it.source.verified ?? true,
      };
    } else {
      sourceObj = {
        id: typeof it.source === 'string' ? it.source.toLowerCase().replace(/\s+/g, '-') : 'unknown',
        name: typeof it.source === 'string' ? it.source : 'Unknown Source',
        domain: '',
        language: (it.language || 'en') as NewsLanguageCode,
        verified: true,
      };
    }

    let videoObj: NewsItem['video'];
    if (it.video) {
      videoObj = {
        provider: it.video.provider === 'native' ? 'native' : 'youtube',
        embedId: it.video.embedId || it.video.youtubeId || '',
        durationSec: it.video.durationSec,
      };
    }

    return {
      id: it.id,
      title: it.title,
      summary: it.summary,
      imageUrl: it.imageUrl,
      sourceUrl: it.sourceUrl,
      source: sourceObj,
      language: it.language as NewsLanguageCode,
      category: (it.category || 'top') as NewsCategory,
      scope: (it.scope || 'national') as NewsScope,
      stateCode: it.stateCode,
      constituencyId: it.constituencyId,
      publishedAt: it.publishedAt,
      video: videoObj,
    };
  });

  return {
    version: typeof dto.version === 'number' ? dto.version : parseInt(String(dto.version), 10) || 1,
    generatedAt: dto.generatedAt,
    refreshIntervalMin: dto.refreshIntervalMin ?? 60,
    sources,
    items,
  };
}

export class NewsEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * Retrieves news feed with optional filters.
   * Explicitly declared as a PUBLIC endpoint.
   * Validates server response contract and returns typed NewsFeed.
   */
  async getFeed(filters?: NewsFeedFiltersDTO): Promise<NewsFeed> {
    const query: Record<string, string | number | undefined> = {};
    if (filters) {
      if (filters.lang) query.lang = filters.lang;
      if (filters.scope) query.scope = filters.scope;
      if (filters.state) query.state = filters.state;
      if (filters.category) query.category = filters.category;
      if (filters.limit !== undefined) query.limit = filters.limit;
    }

    const response = await this.client.get<unknown>('/api/v1/news/feed', {
      authPolicy: 'public',
      query,
    });
    const validatedDTO = validateNewsFeedResponse(response.data);
    return mapNewsFeedDTOToNewsFeed(validatedDTO);
  }
}
