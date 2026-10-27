/**
 * Mobile API Strangler Feed & Profile Integration Tests
 * Verifies that all feed, promises, shorts, profile, and aspirant mutations dispatch through apiClient.
 * Master Execution Framework — Jobs 011-012 / Launch Gate A Prerequisite
 */

jest.mock('../lib/supabase', () => ({
  ...jest.requireActual('../lib/supabase'),
  isSupabaseConfigured: true,
}));

import { apiClient } from '../lib/api';
import * as dataService from '../lib/supabaseDataService';

describe('Track 3: Mobile API Strangler - Feed & Social Mutations', () => {
  let mockPost: jest.SpyInstance;
  let mockPatch: jest.SpyInstance;
  let mockDelete: jest.SpyInstance;

  beforeEach(() => {
    mockPost = jest.spyOn(apiClient, 'post').mockImplementation((path: string, payload?: any) => {
      return Promise.resolve({
        data: {
          success: true,
          id: 'test-id',
          postId: 'post-1',
          commentId: 'comment-1',
          shortId: 'short-1',
          promiseId: 'promise-1',
          following: true,
          isFavorited: true,
          optionId: 'opt-1',
          profile: { id: 'test-id' },
          ...payload,
        },
        status: 200,
        headers: {},
        requestId: 'req-test-123',
      } as any);
    });

    mockPatch = jest.spyOn(apiClient, 'patch').mockImplementation((path: string, payload?: any) => {
      return Promise.resolve({
        data: { success: true, id: 'test-id', ...payload },
        status: 200,
        headers: {},
        requestId: 'req-test-123',
      } as any);
    });

    mockDelete = jest.spyOn(apiClient, 'delete').mockImplementation((path: string) => {
      return Promise.resolve({
        data: { success: true, id: 'test-id', postId: 'post-1', commentId: 'comment-1' },
        status: 200,
        headers: {},
        requestId: 'req-test-123',
      } as any);
    });
  });

  afterEach(() => {
    mockPost.mockRestore();
    mockPatch.mockRestore();
    mockDelete.mockRestore();
  });

  describe('Feed & Social Mutations', () => {
    it('composePost dispatches to POST /api/v1/feed/posts', async () => {
      const res = await dataService.composePost({
        content: 'Civic update',
        type: 'discussion',
        stateCode: 'TS',
        authorId: 'usr-1',
      });
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/feed/posts',
        expect.objectContaining({ content: 'Civic update', stateCode: 'TS' }),
        expect.objectContaining({ authPolicy: 'authenticated' }),
      );
      expect(res.success).toBe(true);
      expect(res.id).toBe('test-id');
    });

    it('editPost dispatches to PATCH /api/v1/feed/posts/:id', async () => {
      const res = await dataService.editPost('post-1', 'Updated body');
      expect(mockPatch).toHaveBeenCalledWith(
        '/api/v1/feed/posts/post-1',
        { content: 'Updated body' },
        expect.objectContaining({ authPolicy: 'authenticated' }),
      );
      expect(res).toBe(true);
    });

    it('deletePost dispatches to DELETE /api/v1/feed/posts/:id', async () => {
      const res = await dataService.deletePost('post-1');
      expect(mockDelete).toHaveBeenCalledWith(
        '/api/v1/feed/posts/post-1',
        expect.objectContaining({ authPolicy: 'authenticated' }),
      );
      expect(res).toBe(true);
    });

    it('reactToPost dispatches to POST /api/v1/feed/posts/:id/react', async () => {
      const res = await dataService.reactToPost('post-1', 'usr-1', 'upvote');
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/feed/posts/post-1/react',
        { type: 'upvote' },
        expect.objectContaining({ authPolicy: 'authenticated' }),
      );
      expect(res).toBe(true);
    });

    it('removeReaction dispatches to DELETE /api/v1/feed/posts/:id/react', async () => {
      const res = await dataService.removeReaction('post-1');
      expect(mockDelete).toHaveBeenCalledWith(
        '/api/v1/feed/posts/post-1/react',
        expect.objectContaining({ authPolicy: 'authenticated' }),
      );
      expect(res).toBe(true);
    });

    it('votePoll dispatches to POST /api/v1/feed/polls/:id/vote', async () => {
      const res = await dataService.votePoll('poll-1', 'opt-1');
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/feed/polls/poll-1/vote',
        { optionId: 'opt-1' },
        expect.objectContaining({ authPolicy: 'authenticated' }),
      );
      expect(res).toBe(true);
    });

    it('addPostComment dispatches to POST /api/v1/feed/posts/:id/comments', async () => {
      const res = await dataService.addPostComment('post-1', 'usr-1', 'Great work');
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/feed/posts/post-1/comments',
        { content: 'Great work', language: 'en' },
        expect.objectContaining({ authPolicy: 'authenticated' }),
      );
      expect(res.success).toBe(true);
      expect(res.id).toBe('test-id');
    });

    it('deletePostComment dispatches to DELETE /api/v1/feed/comments/:id', async () => {
      const res = await dataService.deletePostComment('cmt-1');
      expect(mockDelete).toHaveBeenCalledWith(
        '/api/v1/feed/comments/cmt-1',
        expect.objectContaining({ authPolicy: 'authenticated' }),
      );
      expect(res).toBe(true);
    });
  });

  describe('Civic & Promises Mutations', () => {
    it('tagMLAOnIssue dispatches to POST /api/v1/civic/issues/:id/tag-mla', async () => {
      const res = await dataService.tagMLAOnIssue('iss-1');
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/civic/issues/iss-1/tag-mla',
        {},
        expect.objectContaining({ authPolicy: 'authenticated' }),
      );
      expect(res).toBe(true);
    });

    it('disputeIssueResolution dispatches to POST /api/v1/civic/issues/:id/dispute', async () => {
      const res = await dataService.disputeIssueResolution('iss-1', 'usr-1', 'Not fixed yet');
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/civic/issues/iss-1/dispute',
        { reason: 'Not fixed yet' },
        expect.objectContaining({ authPolicy: 'authenticated' }),
      );
      expect(res).toBe(true);
    });

    it('followPromise dispatches to POST /api/v1/promises/:id/follow', async () => {
      const res = await dataService.followPromise('prom-1', 'usr-1', true);
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/promises/prom-1/follow',
        { follow: true },
        expect.objectContaining({ authPolicy: 'authenticated' }),
      );
      expect(res).toBe(true);
    });

    it('toggleFavorite dispatches to POST /api/v1/user/favorites/toggle', async () => {
      const res = await dataService.toggleFavorite('TS_1', 'usr-1', true);
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/user/favorites/toggle',
        { targetType: 'constituency', targetId: 'TS_1', isFavorited: true },
        expect.objectContaining({ authPolicy: 'authenticated' }),
      );
      expect(res).toBe(true);
    });
  });

  describe('Shorts, Profiles & Aspirant Mutations', () => {
    it('uploadShort dispatches to POST /api/v1/shorts', async () => {
      const res = await dataService.uploadShort({
        title: 'Rally video',
        videoUrl: 'https://cdn.example.com/video.mp4',
        channelName: 'Channel 1',
        uploadedBy: 'usr-1',
        stateCode: 'TS',
        duration: 30,
      });
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/shorts',
        expect.objectContaining({ title: 'Rally video', stateCode: 'TS' }),
        expect.objectContaining({ authPolicy: 'authenticated' }),
      );
      expect(res.success).toBe(true);
    });

    it('updateUserProfile dispatches to PATCH /api/v1/user/profile', async () => {
      const res = await dataService.updateUserProfile('usr-1', { displayName: 'Citizen John' });
      expect(mockPatch).toHaveBeenCalledWith(
        '/api/v1/user/profile',
        { displayName: 'Citizen John' },
        expect.objectContaining({ authPolicy: 'authenticated' }),
      );
      expect(res).toBe(true);
    });

    it('registerAspirant dispatches to POST /api/v1/aspirant/register', async () => {
      const res = await dataService.registerAspirant('usr-1', {
        displayName: 'Aspirant John',
        stateCode: 'TS',
        targetConstituencyName: 'TS_1',
      });
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/aspirant/register',
        expect.objectContaining({ displayName: 'Aspirant John' }),
        expect.objectContaining({ authPolicy: 'authenticated' }),
      );
      expect(res.success).toBe(true);
    });

    it('startModule dispatches to POST /api/v1/aspirant/modules/:id/start', async () => {
      const res = await dataService.startModule('usr-1', 'mod-1');
      expect(mockPost).toHaveBeenCalledWith(
        '/api/v1/aspirant/modules/mod-1/start',
        {},
        expect.objectContaining({ authPolicy: 'authenticated' }),
      );
      expect(res).toBe(true);
    });
  });
});
