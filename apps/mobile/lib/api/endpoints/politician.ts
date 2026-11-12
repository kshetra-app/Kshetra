/**
 * Politician API Endpoint
 * Master Execution Framework — JOB W009-B4
 *
 * Target Fastify Routes:
 * - POST /api/v1/politician/events/:id/rsvp
 * - POST /api/v1/politician/manifestos/:manifestoId/items/:itemId/vote
 * - POST /api/v1/politician/surveys/:id/respond
 * - POST /api/v1/politician/grievances
 */

import type { ApiClient } from '../client';
import { ApiValidationError } from '../errors';
import type {
  EManifesto,
  PoliticianPortalProfile,
  PoliticianSurvey,
  PoliticalEvent,
} from '../../politicianPortalTypes';

export interface PoliticianPortalListResponse<T> {
  items: T[];
  total: number;
}

function validateListResponse<T>(data: unknown, key: string): PoliticianPortalListResponse<T> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new ApiValidationError(`Invalid politician ${key} response: expected an object`);
  }
  const value = data as Record<string, unknown>;
  if (!Array.isArray(value[key])) {
    throw new ApiValidationError(`Invalid politician ${key} response: expected an array`);
  }
  if (typeof value.total !== 'number' || !Number.isInteger(value.total) || value.total < 0) {
    throw new ApiValidationError(`Invalid politician ${key} response: total must be a non-negative integer`);
  }
  return { items: value[key] as T[], total: value.total };
}

export interface SubmitGrievanceRequestDTO {
  politicianId: string;
  subject: string;
  description: string;
  category: string;
}

export class PoliticianEndpoint {
  constructor(private readonly client: ApiClient) {}

  async listProfiles(filters: { state?: string; tier?: string; party?: string } = {}) {
    const response = await this.client.get<unknown>('/api/v1/politician/profiles', {
      query: filters,
      authPolicy: 'public',
    });
    return validateListResponse<PoliticianPortalProfile>(response.data, 'politicians');
  }

  async listEvents(filters: { state?: string; type?: string; upcoming?: boolean } = {}) {
    const response = await this.client.get<unknown>('/api/v1/politician/events', {
      query: {
        state: filters.state,
        type: filters.type,
        upcoming: filters.upcoming,
      },
      authPolicy: 'public',
    });
    return validateListResponse<PoliticalEvent>(response.data, 'events');
  }

  async listManifestos(filters: { politicianId?: string; state?: string } = {}) {
    const response = await this.client.get<unknown>('/api/v1/politician/manifestos', {
      query: filters,
      authPolicy: 'public',
    });
    return validateListResponse<EManifesto>(response.data, 'manifestos');
  }

  async listSurveys(filters: { state?: string; status?: 'active' } = {}) {
    const response = await this.client.get<unknown>('/api/v1/politician/surveys', {
      query: filters,
      authPolicy: 'public',
    });
    return validateListResponse<PoliticianSurvey>(response.data, 'surveys');
  }

  /**
   * 7. RSVP to a politician event.
   */
  async rsvpEvent(eventId: string): Promise<{ success: boolean; eventId: string; message: string }> {
    if (!eventId || typeof eventId !== 'string') {
      throw new ApiValidationError('Invalid eventId: must be a non-empty string');
    }
    const response = await this.client.post<{
      success: boolean;
      eventId: string;
      message: string;
    }>(
      `/api/v1/politician/events/${encodeURIComponent(eventId)}/rsvp`,
      {},
      { authPolicy: 'authenticated' },
    );
    return response.data;
  }

  /**
   * 8. Vote on a manifesto item.
   */
  async voteManifestoItem(
    manifestoId: string,
    itemId: string,
    support: boolean,
  ): Promise<{ success: boolean; manifestoId: string; itemId: string; support: boolean; message: string }> {
    if (!manifestoId || typeof manifestoId !== 'string') {
      throw new ApiValidationError('Invalid manifestoId: must be a non-empty string');
    }
    if (!itemId || typeof itemId !== 'string') {
      throw new ApiValidationError('Invalid itemId: must be a non-empty string');
    }
    const response = await this.client.post<{
      success: boolean;
      manifestoId: string;
      itemId: string;
      support: boolean;
      message: string;
    }>(
      `/api/v1/politician/manifestos/${encodeURIComponent(manifestoId)}/items/${encodeURIComponent(itemId)}/vote`,
      { support },
      { authPolicy: 'authenticated' },
    );
    return response.data;
  }

  /**
   * 9. Submit a survey response.
   */
  async respondSurvey(
    surveyId: string,
    answers: Record<string, string>,
  ): Promise<{ success: boolean; surveyId: string; message: string }> {
    if (!surveyId || typeof surveyId !== 'string') {
      throw new ApiValidationError('Invalid surveyId: must be a non-empty string');
    }
    if (!answers || typeof answers !== 'object') {
      throw new ApiValidationError('Invalid answers: must be an object');
    }
    const response = await this.client.post<{
      success: boolean;
      surveyId: string;
      message: string;
    }>(
      `/api/v1/politician/surveys/${encodeURIComponent(surveyId)}/respond`,
      { answers },
      { authPolicy: 'authenticated' },
    );
    return response.data;
  }

  /**
   * 10. File a grievance with a politician.
   */
  async submitGrievance(
    payload: SubmitGrievanceRequestDTO,
  ): Promise<{ success: boolean; politicianId: string; subject: string; category: string; message: string }> {
    if (!payload || !payload.politicianId || !payload.subject || !payload.description || !payload.category) {
      throw new ApiValidationError('Invalid grievance payload: politicianId, subject, description, and category are required');
    }
    const response = await this.client.post<{
      success: boolean;
      politicianId: string;
      subject: string;
      category: string;
      message: string;
    }>(
      '/api/v1/politician/grievances',
      payload,
      { authPolicy: 'authenticated' },
    );
    return response.data;
  }
}
