/**
 * Political Shorts API Endpoint
 * Master Execution Framework — Jobs 011-012 / Launch Gate A Prerequisite
 *
 * Target Fastify Routes:
 * - POST   /api/v1/shorts
 * - POST   /api/v1/shorts/:id/approve
 * - POST   /api/v1/shorts/:id/flag
 * - POST   /api/v1/shorts/:id/view
 * - POST   /api/v1/shorts/:id/comments
 */

import type { ApiClient } from '../client';
import { ApiValidationError } from '../errors';

export interface UploadShortRequestDTO {
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  description?: string;
  stateCode: string;
  constituencyId?: string;
  durationSeconds?: number;
  duration?: number;
  channelName?: string;
  uploadedBy?: string;
}

export interface ShortCommentDTO {
  id: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface ShortCommentsResponseDTO {
  success: boolean;
  shortId: string;
  comments: ShortCommentDTO[];
  total: number;
}

export class ShortsEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * 1. Upload short
   */
  async uploadShort(payload: UploadShortRequestDTO): Promise<{ success: boolean; id: string; short?: any }> {
    if (!payload?.title || !payload?.videoUrl || !payload?.stateCode) {
      throw new ApiValidationError('Invalid upload short: title, videoUrl, and stateCode are required');
    }
    const res = await this.client.post<{ success: boolean; id: string; short?: any }>(
      '/api/v1/shorts',
      payload,
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 2. Approve short
   */
  async approveShort(shortId: string, constituencyId?: string): Promise<{ success: boolean; shortId: string }> {
    if (!shortId) {
      throw new ApiValidationError('Invalid approve short: shortId is required');
    }
    const res = await this.client.post<{ success: boolean; shortId: string }>(
      `/api/v1/shorts/${encodeURIComponent(shortId)}/approve`,
      { constituencyId },
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 3. Flag short
   */
  async flagShort(shortId: string, reason?: string): Promise<{ success: boolean; shortId: string }> {
    if (!shortId) {
      throw new ApiValidationError('Invalid flag short: shortId is required');
    }
    const res = await this.client.post<{ success: boolean; shortId: string }>(
      `/api/v1/shorts/${encodeURIComponent(shortId)}/flag`,
      { reason },
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 4. Record view
   */
  async recordView(shortId: string): Promise<{ success: boolean; shortId: string }> {
    if (!shortId) {
      throw new ApiValidationError('Invalid view: shortId is required');
    }
    const res = await this.client.post<{ success: boolean; shortId: string }>(
      `/api/v1/shorts/${encodeURIComponent(shortId)}/view`,
      {},
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 5. Add short comment
   */
  async addComment(shortId: string, content: string): Promise<{
    success: boolean;
    id: string;
    shortId: string;
    comment: ShortCommentDTO;
  }> {
    if (!shortId || !content?.trim() || content.trim().length > 500) {
      throw new ApiValidationError('Invalid comment: shortId and content are required');
    }
    const res = await this.client.post<{
      success: boolean;
      id: string;
      shortId: string;
      comment: ShortCommentDTO;
    }>(
      `/api/v1/shorts/${encodeURIComponent(shortId)}/comments`,
      { content: content.trim() },
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /** Load persisted public comments for a short. */
  async listComments(
    shortId: string,
    options: { offset?: number; limit?: number } = {},
  ): Promise<ShortCommentsResponseDTO> {
    if (!shortId) {
      throw new ApiValidationError('Invalid list comments request: shortId is required');
    }
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 50;
    if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ApiValidationError('Invalid comments pagination: offset must be non-negative and limit must be 1–100');
    }
    const res = await this.client.get<ShortCommentsResponseDTO>(
      `/api/v1/shorts/${encodeURIComponent(shortId)}/comments?offset=${offset}&limit=${limit}`,
      { authPolicy: 'public' },
    );
    return res.data;
  }
}
