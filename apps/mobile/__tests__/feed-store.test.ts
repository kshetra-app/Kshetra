jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { useFeedStore } from '../stores/feed';
import type { Post, Comment } from '../lib/feedTypes';

describe('Mobile Feed Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useFeedStore.setState({
      feedFilter: 'all',
      scopeFilter: 'state',
      selectedConstituency: null,
      selectedHashtag: null,
      searchQuery: '',
      sortBy: 'latest',
      verifiedOnly: false,
    });
  });

  it('initializes with seed posts across states and national scope', () => {
    const posts = useFeedStore.getState().posts;
    expect(posts.length).toBeGreaterThan(0);

    const tsPosts = posts.filter((p) => p.stateCode === 'TS');
    const apPosts = posts.filter((p) => p.stateCode === 'AP');
    const nationalPosts = posts.filter((p) => p.stateCode === 'NATIONAL');

    expect(tsPosts.length).toBeGreaterThan(0);
    expect(apPosts.length).toBeGreaterThan(0);
    expect(nationalPosts.length).toBeGreaterThan(0);
  });

  it('initializes with comments for posts across multiple states', () => {
    const comments = useFeedStore.getState().comments;
    const postIds = Object.keys(comments);
    expect(postIds.length).toBeGreaterThanOrEqual(5);

    // Verify seed-ts-1 has comments
    const tsComments = comments['seed-ts-1'];
    expect(tsComments).toBeDefined();
    expect(tsComments.length).toBeGreaterThan(0);
  });

  it('adds a new post optimistically and increments state', () => {
    const initialCount = useFeedStore.getState().posts.length;
    const newPost: Post = {
      id: 'test-post-1',
      author: { id: 'user-1', displayName: 'Civic Citizen', isVerified: true },
      stateCode: 'TS',
      constituencyId: 'TS-AC-60',
      constituencyName: 'Khairatabad',
      content: 'Testing new municipal grievance tracking #civic #hyderabad',
      type: 'discussion',
      replyCount: 0,
      reactionCount: 0,
      isPinned: false,
      isDeleted: false,
      language: 'en',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hashtags: ['civic', 'hyderabad'],
    };

    useFeedStore.getState().addPost(newPost);

    const updatedPosts = useFeedStore.getState().posts;
    expect(updatedPosts.length).toBe(initialCount + 1);
    expect(updatedPosts[0].id).toBe('test-post-1');
  });

  it('edits an existing post', () => {
    useFeedStore.getState().editPost('seed-ts-1', 'Updated content for Metro Phase 2 review');
    const post = useFeedStore.getState().posts.find((p) => p.id === 'seed-ts-1');
    expect(post?.content).toBe('Updated content for Metro Phase 2 review');
  });

  it('deletes a post by soft deletion', () => {
    useFeedStore.getState().deletePost('seed-ts-1');
    const post = useFeedStore.getState().posts.find((p) => p.id === 'seed-ts-1');
    expect(post?.isDeleted).toBe(true);
  });

  it('toggles post reactions and updates reactionCount', () => {
    const postBefore = useFeedStore.getState().posts.find((p) => p.id === 'seed-ts-2')!;
    const initialReactions = postBefore.reactionCount;

    // React with 'like'
    useFeedStore.getState().toggleReaction('seed-ts-2', 'like');
    let post = useFeedStore.getState().posts.find((p) => p.id === 'seed-ts-2')!;
    expect(post.userReaction).toBe('like');
    expect(post.reactionCount).toBe(initialReactions + 1);

    // Switch to 'insightful'
    useFeedStore.getState().toggleReaction('seed-ts-2', 'insightful');
    post = useFeedStore.getState().posts.find((p) => p.id === 'seed-ts-2')!;
    expect(post.userReaction).toBe('insightful');
    expect(post.reactionCount).toBe(initialReactions + 1);

    // Toggle off
    useFeedStore.getState().toggleReaction('seed-ts-2', 'insightful');
    post = useFeedStore.getState().posts.find((p) => p.id === 'seed-ts-2')!;
    expect(post.userReaction).toBeUndefined();
    expect(post.reactionCount).toBe(initialReactions);
  });

  it('adds, likes, and deletes comments on a post', () => {
    const newComment: Comment = {
      id: 'test-c-1',
      postId: 'seed-ap-1',
      author: { id: 'u-99', displayName: 'Ramesh K' },
      content: 'Excellent progress on Amaravati works.',
      reactionCount: 0,
      isDeleted: false,
      language: 'te',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add comment
    useFeedStore.getState().addComment('seed-ap-1', newComment);
    let postComments = useFeedStore.getState().comments['seed-ap-1'] || [];
    expect(postComments.some((c) => c.id === 'test-c-1')).toBe(true);

    // Reply count on post increased
    const post = useFeedStore.getState().posts.find((p) => p.id === 'seed-ap-1');
    expect(post?.replyCount).toBeGreaterThan(0);

    // Toggle reaction on comment
    useFeedStore.getState().toggleCommentReaction('seed-ap-1', 'test-c-1', 'like');
    postComments = useFeedStore.getState().comments['seed-ap-1'];
    const comment = postComments.find((c) => c.id === 'test-c-1');
    expect(comment?.userReaction).toBe('like');
    expect(comment?.reactionCount).toBe(1);

    // Delete comment
    useFeedStore.getState().deleteComment('seed-ap-1', 'test-c-1');
    postComments = useFeedStore.getState().comments['seed-ap-1'];
    expect(postComments.find((c) => c.id === 'test-c-1')?.isDeleted).toBe(true);
  });

  it('handles search, hashtag, sort, and verified filters', () => {
    const store = useFeedStore.getState();

    store.setSearchQuery('metro');
    expect(useFeedStore.getState().searchQuery).toBe('metro');

    store.setHashtagFilter('development');
    expect(useFeedStore.getState().selectedHashtag).toBe('development');

    store.setSortBy('top');
    expect(useFeedStore.getState().sortBy).toBe('top');

    store.setVerifiedOnly(true);
    expect(useFeedStore.getState().verifiedOnly).toBe(true);

    store.clearAllFilters();
    const cleared = useFeedStore.getState();
    expect(cleared.searchQuery).toBe('');
    expect(cleared.selectedHashtag).toBeNull();
    expect(cleared.feedFilter).toBe('all');
    expect(cleared.verifiedOnly).toBe(false);
  });

  it('processes incoming realtime post event correctly', () => {
    const realtimeRow = {
      id: 'rt-post-1',
      author_id: 'auth-user-99',
      author_name: 'Priya Sharma',
      author_verified: true,
      state_code: 'TS',
      constituency_id: 'TS-AC-61',
      constituency_name: 'Jubilee Hills',
      content: 'Realtime breaking news on road expansion #infrastructure',
      post_type: 'news',
      reply_count: 0,
      reaction_count: 5,
      is_pinned: false,
      is_deleted: false,
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    useFeedStore.getState().receiveRealtimePost(realtimeRow);

    const post = useFeedStore.getState().posts.find((p) => p.id === 'rt-post-1');
    expect(post).toBeDefined();
    expect(post?.author.displayName).toBe('Priya Sharma');
    expect(post?.type).toBe('news');
    expect(post?.hashtags).toContain('infrastructure');
  });

  it('processes incoming realtime comment event correctly', () => {
    const realtimeComment = {
      id: 'rt-comm-1',
      post_id: 'seed-ts-2',
      author_id: 'u-realtime',
      author_name: 'Anil Kumar',
      author_verified: false,
      content: 'Very insightful analysis here.',
      reaction_count: 2,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    useFeedStore.getState().receiveRealtimeComment(realtimeComment);

    const comments = useFeedStore.getState().comments['seed-ts-2'];
    const addedComment = comments.find((c) => c.id === 'rt-comm-1');
    expect(addedComment).toBeDefined();
    expect(addedComment?.author.displayName).toBe('Anil Kumar');
  });
});
