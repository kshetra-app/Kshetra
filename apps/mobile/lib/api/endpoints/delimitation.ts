import type {
  DelimitationStatusDTO,
  DelimitationTimelineDTO,
} from '@kshetra/shared';
import type { ApiClient } from '../client';
import { ApiValidationError } from '../errors';

interface DelimitationSuccessEnvelope<T> {
  success: boolean;
  data: T;
}

function validateEnvelope<T>(value: unknown, context: string): T {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ApiValidationError(`Invalid ${context} response: expected an object`);
  }

  const envelope = value as Partial<DelimitationSuccessEnvelope<T>>;
  if (envelope.success !== true || typeof envelope.data !== 'object' || envelope.data === null) {
    throw new ApiValidationError(`Invalid ${context} response: missing successful data envelope`);
  }

  return envelope.data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateTimelineEvent(value: unknown, index: number): void {
  if (!isRecord(value)) {
    throw new ApiValidationError(`Invalid delimitation timeline event at index ${index}`);
  }

  if (
    typeof value.id !== 'string' ||
    !value.id.trim() ||
    typeof value.title !== 'string' ||
    !value.title.trim() ||
    typeof value.date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.date) ||
    Number.isNaN(Date.parse(value.date)) ||
    typeof value.verified !== 'boolean' ||
    !['critical', 'high', 'medium', 'informational'].includes(String(value.significance))
  ) {
    throw new ApiValidationError(`Invalid required fields in delimitation timeline event at index ${index}`);
  }

  if (new Date(value.date as string).toISOString().slice(0, 10) !== value.date) {
    throw new ApiValidationError(`Invalid calendar date in delimitation timeline event at index ${index}`);
  }

  if (value.category !== undefined && !['census_notification', 'gazette_notification', 'parliamentary_debate'].includes(String(value.category))) {
    throw new ApiValidationError(`Invalid category in delimitation timeline event at index ${index}`);
  }

  if (value.sourceUrl !== undefined) {
    if (typeof value.sourceUrl !== 'string') {
      throw new ApiValidationError(`Invalid source URL in delimitation timeline event at index ${index}`);
    }
    try {
      if (new URL(value.sourceUrl).protocol !== 'https:') throw new Error('HTTPS required');
    } catch {
      throw new ApiValidationError(`Invalid official source URL in delimitation timeline event at index ${index}`);
    }
  }
}

export class DelimitationEndpoint {
  constructor(private readonly client: ApiClient) {}

  async getTimeline(): Promise<DelimitationTimelineDTO> {
    const response = await this.client.get<unknown>('/api/v1/delimitation/timeline', {
      authPolicy: 'public',
    });
    const data = validateEnvelope<DelimitationTimelineDTO>(response.data, 'delimitation timeline');

    if (
      !Array.isArray(data.events) ||
      typeof data.totalEvents !== 'number' ||
      typeof data.verifiedEvents !== 'number' ||
      data.totalEvents !== data.events.length
    ) {
      throw new ApiValidationError('Invalid delimitation timeline response: malformed events or counts');
    }

    data.events.forEach(validateTimelineEvent);
    const actualVerifiedCount = data.events.filter((event) => isRecord(event) && event.verified === true).length;
    if (actualVerifiedCount !== data.verifiedEvents) {
      throw new ApiValidationError('Invalid delimitation timeline response: verified-event count does not match events');
    }

    return data;
  }

  async getStatus(): Promise<DelimitationStatusDTO> {
    const response = await this.client.get<unknown>('/api/v1/delimitation/status', {
      authPolicy: 'public',
    });
    const data = validateEnvelope<DelimitationStatusDTO>(response.data, 'delimitation status');

    if (
      typeof data.nationalStatus !== 'string' ||
      typeof data.statusLabel !== 'string' ||
      typeof data.description !== 'string' ||
      typeof data.lastUpdated !== 'string' ||
      Number.isNaN(Date.parse(data.lastUpdated)) ||
      typeof data.censusTracking?.finalPopulationAvailable !== 'boolean'
    ) {
      throw new ApiValidationError('Invalid delimitation status response: required fields are missing');
    }

    return data;
  }
}
