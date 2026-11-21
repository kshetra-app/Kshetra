/**
 * Feed API Endpoint
 * Master Execution Framework — Jobs 011-012 / Launch Gate A Prerequisite
 *
 * Target Fastify Routes:
 * - POST   /api/v1/feed/posts
 * - PATCH  /api/v1/feed/posts/:id
 * - DELETE /api/v1/feed/posts/:id
 * - POST   /api/v1/feed/posts/:id/react
 * - DELETE /api/v1/feed/posts/:id/react
 * - POST   /api/v1/feed/polls/:id/vote
 * - POST   /api/v1/feed/posts/:id/comments
 * - DELETE /api/v1/feed/comments/:id
 * - POST   /api/v1/feed/comments/:id/react
 * - DELETE /api/v1/feed/comments/:id/react
 */

import type { Comment, PostReviewStatus } from '../../feedTypes';
import type { ApiClient } from '../client';
import { ApiValidationError } from '../errors';

export interface ComposePostRequestDTO {
  media?: import('../../feedAttachments').SubmittedAttachment[];
  content: string;
  type?: 'discussion' | 'news' | 'opinion' | 'question' | 'alert' | 'poll';
  stateCode: string;
  constituencyId?: string;
  authorId?: string;
  parentId?: string;
  language?: string;
  hashtags?: string[];
  pollOptions?: string[];
  clientToken?: string;
}

export interface FeedCommentCursor {
  beforeId: string;
  beforeAt: string;
}

export interface PostSubmission {
  id: string;
  content: string;
  reviewStatus: 'pending' | 'rejected';
  updatedAt: string;
}

interface PollChoiceResponse {
  success: boolean;
  pollId: string;
  optionId: string | null;
  totalVotes: number;
  options: { id: string; voteCount: number }[];
}

export class FeedEndpoint {
  constructor(private readonly client: ApiClient) {}

  async listMySubmissions(offset = 0): Promise<{ submissions: PostSubmission[]; nextOffset: number | null }> {
    const response = await this.client.get<{ submissions: PostSubmission[]; nextOffset: number | null }>(
      '/api/v1/feed/my-submissions',
      { authPolicy: 'authenticated', query: { offset: String(offset) } },
    );
    return response.data;
  }

  /**
   * 1. Compose post
   */
  async composePost(payload: ComposePostRequestDTO): Promise<{
    success: boolean;
    id: string;
    post?: { review_status?: PostReviewStatus };
    poll?: {
      id: string;
      question: string;
      totalVotes: number;
      isClosed: boolean;
      options: { id: string; label: string; voteCount: number; sortOrder: number }[];
    };
  }> {
    if (!payload?.content || !payload?.stateCode) {
      throw new ApiValidationError('Invalid compose post payload: content and stateCode are required');
    }
    const res = await this.client.post<{
      success: boolean;
      id: string;
      post?: { review_status?: PostReviewStatus };
      poll?: {
        id: string;
        question: string;
        totalVotes: number;
        isClosed: boolean;
        options: { id: string; label: string; voteCount: number; sortOrder: number }[];
      };
    }>(
      '/api/v1/feed/posts',
      payload,
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 2. Edit post
   */
  async editPost(postId: string, content: string): Promise<{ success: boolean; id: string; reviewStatus?: PostReviewStatus }> {
    if (!postId || !content) {
      throw new ApiValidationError('Invalid edit post: postId and content are required');
    }
    const res = await this.client.patch<{ success: boolean; id: string; reviewStatus?: PostReviewStatus }>(
      `/api/v1/feed/posts/${encodeURIComponent(postId)}`,
      { content },
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 3. Delete post
   */
  async deletePost(postId: string): Promise<{ success: boolean; id: string }> {
    if (!postId) {
      throw new ApiValidationError('Invalid delete post: postId is required');
    }
    const res = await this.client.delete<{ success: boolean; id: string }>(
      `/api/v1/feed/posts/${encodeURIComponent(postId)}`,
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 4. React to post
   */
  async reactToPost(postId: string, reaction: string): Promise<{ success: boolean; postId: string }> {
    if (!postId || !reaction) {
      throw new ApiValidationError('Invalid reaction: postId and reaction are required');
    }
    const res = await this.client.post<{ success: boolean; postId: string }>(
      `/api/v1/feed/posts/${encodeURIComponent(postId)}/react`,
      { type: reaction },
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 5. Remove post reaction
   */
  async removeReaction(postId: string): Promise<{ success: boolean; postId: string }> {
    if (!postId) {
      throw new ApiValidationError('Invalid remove reaction: postId is required');
    }
    const res = await this.client.delete<{ success: boolean; postId: string }>(
      `/api/v1/feed/posts/${encodeURIComponent(postId)}/react`,
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 6. Vote in poll
   */
  async votePoll(pollId: string, optionId: string | null): Promise<PollChoiceResponse> {
    if (!pollId || optionId === '') throw new ApiValidationError('Select a valid poll and choice');
    const path = `/api/v1/feed/polls/${encodeURIComponent(pollId)}/vote`;
    const res = optionId === null
      ? await this.client.delete<PollChoiceResponse>(path, { authPolicy: 'authenticated' })
      : await this.client.post<PollChoiceResponse>(path, { optionId }, { authPolicy: 'authenticated' });
    return res.data;
  }

  async listComments(postId: string, cursor: FeedCommentCursor | null, authenticated: boolean) {
    const res = await this.client.get<{ comments: Comment[]; next: FeedCommentCursor | null }>(
      `/api/v1/feed/posts/${encodeURIComponent(postId)}/comments`,
      { authPolicy: authenticated ? 'authenticated' : 'public', query: { limit: 25, ...cursor } },
    );
    return res.data;
  }

  async editComment(commentId: string, content: string) {
    const res = await this.client.patch<{ success: boolean; id: string; content: string; updatedAt: string }>(
      `/api/v1/feed/comments/${encodeURIComponent(commentId)}`,
      { content },
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 7. Add comment to post
   */
  async addPostComment(
    postId: string,
    content: string,
    language: string = 'en',
    clientToken?: string,
  ): Promise<{ success: boolean; id: string; comment?: any }> {
    if (!postId || !content) {
      throw new ApiValidationError('Invalid comment: postId and content are required');
    }
    const res = await this.client.post<{ success: boolean; id: string; comment?: any }>(
      `/api/v1/feed/posts/${encodeURIComponent(postId)}/comments`,
      { content, language, ...(clientToken ? { clientToken } : {}) },
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 8. Delete post comment
   */
  async deletePostComment(commentId: string): Promise<{ success: boolean; id: string }> {
    if (!commentId) {
      throw new ApiValidationError('Invalid delete comment: commentId is required');
    }
    const res = await this.client.delete<{ success: boolean; id: string }>(
      `/api/v1/feed/comments/${encodeURIComponent(commentId)}`,
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 9. React to comment
   */
  async reactToComment(commentId: string, reaction: string): Promise<{ success: boolean; commentId: string }> {
    if (!commentId || !reaction) {
      throw new ApiValidationError('Invalid reaction: commentId and reaction are required');
    }
    const res = await this.client.post<{ success: boolean; commentId: string }>(
      `/api/v1/feed/comments/${encodeURIComponent(commentId)}/react`,
      { type: reaction },
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }

  /**
   * 10. Remove comment reaction
   */
  async removeCommentReaction(commentId: string): Promise<{ success: boolean; commentId: string }> {
    if (!commentId) {
      throw new ApiValidationError('Invalid remove reaction: commentId is required');
    }
    const res = await this.client.delete<{ success: boolean; commentId: string }>(
      `/api/v1/feed/comments/${encodeURIComponent(commentId)}/react`,
      { authPolicy: 'authenticated' },
    );
    return res.data;
  }
}
