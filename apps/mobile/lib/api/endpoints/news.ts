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

const VALID_LANGUAGES = new Set<string>(['en', 'hi', 'te', 'ta', 'kn', 'ml', 'mr', 'bn', 'gu']);
const VALID_CATEGORIES = new Set<string>(['top', 'politics', 'elections', 'economy', 'governance', 'regional', 'video']);
const VALID_SCOPES = new Set<string>(['national', 'state', 'constituency']);
const VALID_VIDEO_PROVIDERS = new Set<string>(['youtube', 'native']);

/**
 * Validates a single NewsSourceDTO strictly.
 * Throws ApiValidationError if any field fails schema requirements.
 */
export function validateNewsSource(data: unknown, context: string): NewsSourceDTO {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ApiValidationError(`Invalid news source at ${context}: expected object, received ${typeof data}`);
  }
  const s = data as Record<string, unknown>;

  if (typeof s.id !== 'string' || !s.id.trim()) {
    throw new ApiValidationError(`Invalid news source at ${context}: missing or empty "id"`);
  }
  if (typeof s.name !== 'string' || !s.name.trim()) {
    throw new ApiValidationError(`Invalid news source at ${context}: missing or empty "name"`);
  }
  if (typeof s.domain !== 'string' || !s.domain.trim()) {
    throw new ApiValidationError(`Invalid news source at ${context}: missing or empty "domain"`);
  }
  if (typeof s.language !== 'string' || !VALID_LANGUAGES.has(s.language)) {
    throw new ApiValidationError(`Invalid news source at ${context}: invalid or unsupported "language" (${s.language})`);
  }
  if (s.accent !== undefined && typeof s.accent !== 'string') {
    throw new ApiValidationError(`Invalid news source at ${context}: "accent" must be a string if provided`);
  }
  if (s.verified !== undefined && typeof s.verified !== 'boolean') {
    throw new ApiValidationError(`Invalid news source at ${context}: "verified" must be a boolean if provided`);
  }

  return {
    id: s.id,
    name: s.name,
    domain: s.domain,
    language: s.language as NewsSourceDTO['language'],
    accent: s.accent as string | undefined,
    verified: s.verified as boolean | undefined,
  };
}

/**
 * Validates the runtime schema of NewsFeedResponseDTO.
 * Throws ApiValidationError if the structure is malformed.
 */
export function validateNewsFeedResponse(data: unknown): NewsFeedResponseDTO {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ApiValidationError('Invalid news feed response: expected object payload');
  }
  const payload = data as Record<string, unknown>;

  // version must be strictly a number
  if (typeof payload.version !== 'number' || Number.isNaN(payload.version)) {
    throw new ApiValidationError('Invalid news feed response: missing or invalid "version" (must be a number)');
  }
  // generatedAt must be a valid ISO date string
  if (typeof payload.generatedAt !== 'string' || Number.isNaN(Date.parse(payload.generatedAt))) {
    throw new ApiValidationError('Invalid news feed response: missing or invalid "generatedAt" (must be a valid date string)');
  }
  if (typeof payload.refreshIntervalMin !== 'number' || Number.isNaN(payload.refreshIntervalMin)) {
    throw new ApiValidationError('Invalid news feed response: missing or invalid "refreshIntervalMin" (must be a number)');
  }
  if (!Array.isArray(payload.sources)) {
    throw new ApiValidationError('Invalid news feed response: "sources" must be an array');
  }
  if (!Array.isArray(payload.items)) {
    throw new ApiValidationError('Invalid news feed response: "items" must be an array');
  }

  const validatedSources: NewsSourceDTO[] = [];
  for (let idx = 0; idx < payload.sources.length; idx++) {
    validatedSources.push(validateNewsSource(payload.sources[idx], `sources[${idx}]`));
  }

  const validatedItems: NewsItemDTO[] = [];
  for (let idx = 0; idx < payload.items.length; idx++) {
    const item = payload.items[idx];
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new ApiValidationError(`Invalid news item at items[${idx}]: expected object`);
    }
    const it = item as Record<string, unknown>;

    // Required string fields
    if (typeof it.id !== 'string' || !it.id.trim()) {
      throw new ApiValidationError(`Invalid news item at items[${idx}]: missing or empty "id"`);
    }
    if (typeof it.title !== 'string' || !it.title.trim()) {
      throw new ApiValidationError(`Invalid news item at items[${idx}]: missing or empty "title"`);
    }
    if (typeof it.sourceUrl !== 'string' || !it.sourceUrl.trim()) {
      throw new ApiValidationError(`Invalid news item at items[${idx}]: missing or empty "sourceUrl"`);
    }
    if (typeof it.publishedAt !== 'string' || Number.isNaN(Date.parse(it.publishedAt))) {
      throw new ApiValidationError(`Invalid news item at items[${idx}]: missing or invalid "publishedAt" (must be a valid date string)`);
    }

    // Source field: strictly structured NewsSourceDTO, NEVER string
    if (typeof it.source === 'string') {
      throw new ApiValidationError(`Invalid news item at items[${idx}]: "source" must be a structured object, not a string`);
    }
    const validatedItemSource = validateNewsSource(it.source, `items[${idx}].source`);

    // Language enum
    if (typeof it.language !== 'string' || !VALID_LANGUAGES.has(it.language)) {
      throw new ApiValidationError(`Invalid news item at items[${idx}]: invalid or unsupported "language" (${it.language})`);
    }

    // Category enum
    if (typeof it.category !== 'string' || !VALID_CATEGORIES.has(it.category)) {
      throw new ApiValidationError(`Invalid news item at items[${idx}]: invalid or unsupported "category" (${it.category})`);
    }

    // Scope enum
    if (typeof it.scope !== 'string' || !VALID_SCOPES.has(it.scope)) {
      throw new ApiValidationError(`Invalid news item at items[${idx}]: invalid or unsupported "scope" (${it.scope})`);
    }

    // Optional string fields
    if (it.summary !== undefined && typeof it.summary !== 'string') {
      throw new ApiValidationError(`Invalid news item at items[${idx}]: "summary" must be a string if provided`);
    }
    if (it.imageUrl !== undefined && typeof it.imageUrl !== 'string') {
      throw new ApiValidationError(`Invalid news item at items[${idx}]: "imageUrl" must be a string if provided`);
    }
    if (it.stateCode !== undefined && typeof it.stateCode !== 'string') {
      throw new ApiValidationError(`Invalid news item at items[${idx}]: "stateCode" must be a string if provided`);
    }
    if (it.constituencyId !== undefined && typeof it.constituencyId !== 'string') {
      throw new ApiValidationError(`Invalid news item at items[${idx}]: "constituencyId" must be a string if provided`);
    }

    // Optional video object validation
    let validatedVideo: NewsItemDTO['video'] = undefined;
    if (it.video !== undefined && it.video !== null) {
      if (typeof it.video !== 'object' || Array.isArray(it.video)) {
        throw new ApiValidationError(`Invalid news item at items[${idx}]: "video" must be an object if provided`);
      }
      const v = it.video as Record<string, unknown>;
      if (typeof v.provider !== 'string' || !VALID_VIDEO_PROVIDERS.has(v.provider)) {
        throw new ApiValidationError(`Invalid news item at items[${idx}]: "video.provider" must be "youtube" or "native"`);
      }
      if (typeof v.embedId !== 'string' || !v.embedId.trim()) {
        throw new ApiValidationError(`Invalid news item at items[${idx}]: "video.embedId" must be a non-empty string`);
      }
      if (v.durationSec !== undefined && (typeof v.durationSec !== 'number' || Number.isNaN(v.durationSec))) {
        throw new ApiValidationError(`Invalid news item at items[${idx}]: "video.durationSec" must be a number if provided`);
      }
      validatedVideo = {
        provider: v.provider as 'youtube' | 'native',
        embedId: v.embedId,
        durationSec: v.durationSec as number | undefined,
      };
    }

    validatedItems.push({
      id: it.id,
      title: it.title,
      summary: it.summary as string | undefined,
      imageUrl: it.imageUrl as string | undefined,
      sourceUrl: it.sourceUrl,
      source: validatedItemSource,
      language: it.language as NewsItemDTO['language'],
      category: it.category as NewsItemDTO['category'],
      scope: it.scope as NewsItemDTO['scope'],
      stateCode: it.stateCode as string | undefined,
      constituencyId: it.constituencyId as string | undefined,
      publishedAt: it.publishedAt,
      video: validatedVideo,
    });
  }

  return {
    version: payload.version as number,
    generatedAt: payload.generatedAt as string,
    refreshIntervalMin: payload.refreshIntervalMin as number,
    sources: validatedSources,
    items: validatedItems,
  };
}

/**
 * Maps an already validated NewsFeedResponseDTO to mobile NewsFeed schema without unsafe type casting.
 */
export function mapNewsFeedDTOToNewsFeed(dto: NewsFeedResponseDTO): NewsFeed {
  const sources: NewsSource[] = dto.sources.map((s: NewsSourceDTO) => ({
    id: s.id,
    name: s.name,
    domain: s.domain,
    language: s.language as NewsLanguageCode,
    accent: s.accent,
    verified: s.verified,
  }));

  const items: NewsItem[] = dto.items.map((it: NewsItemDTO) => ({
    id: it.id,
    title: it.title,
    summary: it.summary,
    imageUrl: it.imageUrl,
    sourceUrl: it.sourceUrl,
    source: {
      id: it.source.id,
      name: it.source.name,
      domain: it.source.domain,
      language: it.source.language as NewsLanguageCode,
      accent: it.source.accent,
      verified: it.source.verified,
    },
    language: it.language as NewsLanguageCode,
    category: it.category as NewsCategory,
    scope: it.scope as NewsScope,
    stateCode: it.stateCode,
    constituencyId: it.constituencyId,
    publishedAt: it.publishedAt,
    video: it.video
      ? {
          provider: it.video.provider,
          embedId: it.video.embedId,
          durationSec: it.video.durationSec,
        }
      : undefined,
  }));

  return {
    version: dto.version,
    generatedAt: dto.generatedAt,
    refreshIntervalMin: dto.refreshIntervalMin,
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
