/**
 * Stage 1: Source Registry Management
 *
 * Tracks authoritative and secondary delimitation data sources:
 * - Gazettes (Extraordinary, Ordinary)
 * - Election Commission notifications
 * - Parliamentary records
 * - Census releases
 * - Controlled test fixtures
 */

import type {
  DelimitationWatchSource,
  DelimitationSourceType,
  DelimitationAuthorityClassification,
  RetrievalMethod,
} from '@kshetra/shared';
import type { IDelimitationWatchRepository } from './persistence';
import { validateSourceUrl } from './ssrfGuard';

export interface RegisterSourceInput {
  id: string;
  name: string;
  publisher: string;
  sourceType: DelimitationSourceType;
  canonicalUrl: string;
  geographicScope: string;
  subjectScope: string;
  authorityClassification?: DelimitationAuthorityClassification;
  retrievalMethod?: RetrievalMethod;
  pollingSchedule?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  allowLocalhost?: boolean;
}

export class SourceRegistry {
  private readonly repo: IDelimitationWatchRepository;

  constructor(repo: IDelimitationWatchRepository) {
    this.repo = repo;
  }

  async registerSource(input: RegisterSourceInput): Promise<DelimitationWatchSource> {
    if (!input.id || !input.name || !input.publisher || !input.canonicalUrl) {
      throw new Error('VALIDATION_ERROR: id, name, publisher, and canonicalUrl are required');
    }

    // SSRF validation for HTTP sources
    const retrievalMethod = input.retrievalMethod ?? 'http_get';
    if (retrievalMethod === 'http_get') {
      validateSourceUrl(input.canonicalUrl, input.allowLocalhost ?? false);
    }

    const now = new Date().toISOString();
    const source: DelimitationWatchSource = {
      id: input.id,
      name: input.name,
      publisher: input.publisher,
      sourceType: input.sourceType,
      canonicalUrl: input.canonicalUrl,
      geographicScope: input.geographicScope,
      subjectScope: input.subjectScope,
      authorityClassification: input.authorityClassification ?? 'statutory',
      retrievalMethod,
      pollingSchedule: input.pollingSchedule,
      isActive: input.isActive ?? true,
      consecutiveFailures: 0,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };

    await this.repo.saveSource(source);
    return source;
  }

  async getSource(sourceId: string): Promise<DelimitationWatchSource | null> {
    return this.repo.getSource(sourceId);
  }

  async listSources(): Promise<DelimitationWatchSource[]> {
    return this.repo.listSources();
  }

  async setSourceActive(sourceId: string, isActive: boolean): Promise<void> {
    const source = await this.repo.getSource(sourceId);
    if (!source) throw new Error(`NOT_FOUND: Source ${sourceId} not found`);
    source.isActive = isActive;
    source.updatedAt = new Date().toISOString();
    await this.repo.saveSource(source);
  }
}
