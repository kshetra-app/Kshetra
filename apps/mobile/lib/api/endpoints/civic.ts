/**
 * Civic API Endpoint
 * Master Execution Framework — JOB W009-B4
 *
 * Target Fastify Routes:
 * - POST   /api/v1/civic/issues/:id/upvote
 * - DELETE /api/v1/civic/issues/:id/upvote
 * - POST   /api/v1/civic/issues/:id/follow
 * - POST   /api/v1/civic/issues
 * - PATCH  /api/v1/civic/issues/:id/status
 * - POST   /api/v1/civic/issues/:id/comments
 * - POST   /api/v1/civic/bills/:id/opinion
 * - POST   /api/v1/civic/rti
 * - POST   /api/v1/civic/rti/:id/upvote
 */

import type { ApiClient } from '../client';
import { ApiValidationError } from '../errors';

export interface ReportIssueRequestDTO {
  title: string;
  description?: string;
  category: string;
  severity?: string;
  constituencyId?: string;
  stateCode: string;
  mediaUrls?: string[];
}

export class CivicEndpoint {
  constructor(private readonly client: ApiClient) {}

  /**
   * 1. Upvote a civic issue.
   */
  async upvoteIssue(issueId: string): Promise<{ success: boolean; issueId: string }> {
    if (!issueId || typeof issueId !== 'string') {
      throw new ApiValidationError('Invalid issueId: must be a non-empty string');
    }
    const response = await this.client.post<{ success: boolean; issueId: string; message?: string }>(
      `/api/v1/civic/issues/${encodeURIComponent(issueId)}/upvote`,
      {},
      { authPolicy: 'authenticated' },
    );
    return { success: response.data.success, issueId: response.data.issueId };
  }

  /**
   * 2. Remove an upvote from a civic issue.
   */
  async removeUpvote(issueId: string): Promise<{ success: boolean; issueId: string }> {
    if (!issueId || typeof issueId !== 'string') {
      throw new ApiValidationError('Invalid issueId: must be a non-empty string');
    }
    const response = await this.client.delete<{ success: boolean; issueId: string; message?: string }>(
      `/api/v1/civic/issues/${encodeURIComponent(issueId)}/upvote`,
      { authPolicy: 'authenticated' },
    );
    return { success: response.data.success, issueId: response.data.issueId };
  }

  /**
   * 3. Follow or unfollow a civic issue.
   */
  async followIssue(
    issueId: string,
    follow: boolean = true,
  ): Promise<{ success: boolean; issueId: string; following: boolean }> {
    if (!issueId || typeof issueId !== 'string') {
      throw new ApiValidationError('Invalid issueId: must be a non-empty string');
    }
    const response = await this.client.post<{
      success: boolean;
      issueId: string;
      following: boolean;
      message?: string;
    }>(
      `/api/v1/civic/issues/${encodeURIComponent(issueId)}/follow`,
      { follow },
      { authPolicy: 'authenticated' },
    );
    return {
      success: response.data.success,
      issueId: response.data.issueId,
      following: response.data.following,
    };
  }

  /**
   * 4. Report a civic issue.
   */
  async reportIssue(payload: ReportIssueRequestDTO): Promise<{ success: boolean; id: string }> {
    if (!payload || !payload.title || !payload.category || !payload.stateCode) {
      throw new ApiValidationError('Invalid issue report: title, category, and stateCode are required');
    }
    const response = await this.client.post<{ success: boolean; id: string; message?: string }>(
      '/api/v1/civic/issues',
      payload,
      { authPolicy: 'authenticated' },
    );
    return { success: response.data.success, id: response.data.id };
  }

  /**
   * 5. Update status of a civic issue.
   */
  async updateIssueStatus(
    issueId: string,
    status: string,
    note?: string,
  ): Promise<{ success: boolean; issueId: string; status: string }> {
    if (!issueId || typeof issueId !== 'string') {
      throw new ApiValidationError('Invalid issueId: must be a non-empty string');
    }
    if (!status || typeof status !== 'string') {
      throw new ApiValidationError('Invalid status: must be a non-empty string');
    }
    const response = await this.client.patch<{
      success: boolean;
      issueId: string;
      status: string;
      message?: string;
    }>(
      `/api/v1/civic/issues/${encodeURIComponent(issueId)}/status`,
      { status, note },
      { authPolicy: 'authenticated' },
    );
    return {
      success: response.data.success,
      issueId: response.data.issueId,
      status: response.data.status,
    };
  }

  /**
   * 6. Add a comment to a civic issue.
   */
  async addIssueComment(
    issueId: string,
    body: string,
    userName?: string,
    imageUrl?: string,
  ): Promise<{ success: boolean; id: string; issueId: string }> {
    if (!issueId || typeof issueId !== 'string') {
      throw new ApiValidationError('Invalid issueId: must be a non-empty string');
    }
    if (!body || typeof body !== 'string') {
      throw new ApiValidationError('Invalid comment body: must be a non-empty string');
    }
    const response = await this.client.post<{
      success: boolean;
      id: string;
      issueId: string;
      message?: string;
    }>(
      `/api/v1/civic/issues/${encodeURIComponent(issueId)}/comments`,
      { body, userName, imageUrl },
      { authPolicy: 'authenticated' },
    );
    return {
      success: response.data.success,
      id: response.data.id,
      issueId: response.data.issueId,
    };
  }

  /**
   * 11. Record citizen opinion on a bill.
   */
  async postCitizenOpinion(
    billId: string,
    support: boolean,
  ): Promise<{ success: boolean; billId: string; support: boolean }> {
    if (!billId || typeof billId !== 'string') {
      throw new ApiValidationError('Invalid billId: must be a non-empty string');
    }
    const response = await this.client.post<{
      success: boolean;
      billId: string;
      support: boolean;
      message?: string;
    }>(
      `/api/v1/civic/bills/${encodeURIComponent(billId)}/opinion`,
      { support },
      { authPolicy: 'authenticated' },
    );
    return {
      success: response.data.success,
      billId: response.data.billId,
      support: response.data.support,
    };
  }

  /**
   * 12a. File an RTI query.
   */
  async submitRtiQuery(
    payload: { subject: string; department?: string; description?: string; state?: string },
  ): Promise<{ success: boolean; id: string; message?: string }> {
    if (!payload || !payload.subject) {
      throw new ApiValidationError('Invalid RTI query: subject is required');
    }
    const response = await this.client.post<{
      success: boolean;
      id: string;
      message: string;
      data?: Record<string, unknown>;
    }>(
      '/api/v1/civic/rti',
      payload,
      { authPolicy: 'authenticated' },
    );
    return {
      success: response.data.success,
      id: response.data.id,
      message: response.data.message,
    };
  }

  /**
   * 12b. Upvote an RTI query.
   */
  async upvoteRtiQuery(rtiId: string): Promise<{ success: boolean; rtiId: string }> {
    if (!rtiId || typeof rtiId !== 'string') {
      throw new ApiValidationError('Invalid rtiId: must be a non-empty string');
    }
    const response = await this.client.post<{
      success: boolean;
      rtiId: string;
      message?: string;
    }>(
      `/api/v1/civic/rti/${encodeURIComponent(rtiId)}/upvote`,
      {},
      { authPolicy: 'authenticated' },
    );
    return {
      success: response.data.success,
      rtiId: response.data.rtiId,
    };
  }
}
