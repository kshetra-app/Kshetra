jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../lib/supabaseDataService', () => ({
  composePost: jest.fn(),
  reactToPost: jest.fn(),
  removeReaction: jest.fn(),
  votePoll: jest.fn(),
  addPostComment: jest.fn(),
  deletePostComment: jest.fn(),
  fetchBlendedFeed: jest.fn(),
  fetchFollowedUserIds: jest.fn(),
}));

import { useFeedStore } from '../stores/feed';
import { useAuthStore } from '../stores/auth';
import * as dataService from '../lib/supabaseDataService';
import type { Post } from '../lib/feedTypes';

describe('Phase 1: Ticket 1.2 - Feed Write Hardening & Throttling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'test-user-1', email: 'test@example.com' } as any,
    });
    useFeedStore.setState({
      posts: [],
      comments: {},
      lastError: null,
      lastPostTime: 0,
      lastCommentTime: 0,
    });
  });

  it('rolls back optimistic post and sets error when composePost fails', async () => {
    (dataService.composePost as jest.Mock).mockResolvedValue({ id: null, success: false });

    const post: Post = {
      id: 'test-fail-post',
      author: { id: 'u1', displayName: 'Test User' },
      content: 'Hello world',
      type: 'discussion',
      stateCode: 'TS',
      constituencyId: 'TS-AC-01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replyCount: 0,
      reactionCount: 0,
      isPinned: false,
      isDeleted: false,
      language: 'en',
      hashtags: [],
    };

    await useFeedStore.getState().addPost(post);

    // Post should be rolled back
    const currentPosts = useFeedStore.getState().posts;
    expect(currentPosts.find((p) => p.id === 'test-fail-post')).toBeUndefined();
    expect(useFeedStore.getState().lastError).toContain('Could not submit post');
  });

  it('throttles rapid repeated post submissions', async () => {
    (dataService.composePost as jest.Mock).mockResolvedValue({ id: 'p1', success: true });

    const post1: Post = {
      id: 'post-1',
      author: { id: 'u1', displayName: 'Test User' },
      content: 'First post',
      type: 'discussion',
      stateCode: 'TS',
      constituencyId: 'TS-AC-01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replyCount: 0,
      reactionCount: 0,
      isPinned: false,
      isDeleted: false,
      language: 'en',
      hashtags: [],
    };

    await useFeedStore.getState().addPost(post1);
    expect(useFeedStore.getState().lastError).toBeNull();

    // Immediately attempt second post
    const post2: Post = { ...post1, id: 'post-2', content: 'Second rapid post' };
    await useFeedStore.getState().addPost(post2);

    expect(useFeedStore.getState().lastError).toContain('Please wait');
    expect(useFeedStore.getState().posts.find((p) => p.id === 'post-2')).toBeUndefined();
  });

  it('rolls back optimistic reaction when server rejects update', async () => {
    const post: Post = {
      id: 'post-react-test',
      author: { id: 'u2', displayName: 'Author' },
      content: 'React to me',
      type: 'discussion',
      stateCode: 'TS',
      constituencyId: 'TS-AC-01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replyCount: 0,
      reactionCount: 5,
      isPinned: false,
      isDeleted: false,
      language: 'en',
      hashtags: [],
    };

    useFeedStore.setState({ posts: [post] });
    (dataService.reactToPost as jest.Mock).mockResolvedValue(false);

    await useFeedStore.getState().toggleReaction('post-react-test', 'agree');

    const updated = useFeedStore.getState().posts.find((p) => p.id === 'post-react-test');
    expect(updated?.reactionCount).toBe(5);
    expect(updated?.userReaction).toBeUndefined();
    expect(useFeedStore.getState().lastError).toBe('Failed to update reaction.');
  });
});
