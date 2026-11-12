jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../lib/supabaseDataService', () => ({
  composePost: jest.fn(),
  editPost: jest.fn(),
  deletePost: jest.fn(),
  reactToPost: jest.fn(),
  removeReaction: jest.fn(),
  votePoll: jest.fn(),
  reactToComment: jest.fn(),
  removeCommentReaction: jest.fn(),
  addPostComment: jest.fn(),
  deletePostComment: jest.fn(),
  fetchBlendedFeed: jest.fn(),
  fetchFollowedUserIds: jest.fn(),
  followUser: jest.fn(),
  unfollowUser: jest.fn(),
}));

import { useFeedStore } from '../stores/feed';
import { useAuthStore } from '../stores/auth';
import * as dataService from '../lib/supabaseDataService';
import { useNetworkStore } from '../lib/networkStatus';
import { clearQueue, getPendingOps } from '../lib/offlineSync';
import type { Comment, Post } from '../lib/feedTypes';

function makePost(id: string, overrides: Partial<Post> = {}): Post {
  return {
    id,
    author: { id: 'test-user-1', displayName: 'Test User' },
    content: 'Original post text',
    type: 'discussion',
    stateCode: 'TS',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replyCount: 0,
    reactionCount: 0,
    isPinned: false,
    isDeleted: false,
    language: 'en',
    hashtags: [],
    ...overrides,
  };
}

function makeComment(id: string, overrides: Partial<Comment> = {}): Comment {
  return {
    id,
    postId: 'post-1',
    author: { id: 'author-1', displayName: 'Author' },
    content: 'A comment',
    reactionCount: 2,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

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
    useNetworkStore.setState({ isConnected: true });
    clearQueue();
  });

  afterEach(() => {
    clearQueue();
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

  it('rolls back post and surfaces community guidelines violation message when moderation flags content', async () => {
    (dataService.composePost as jest.Mock).mockRejectedValue(
      new Error('This content could not be posted — it violates community guidelines (Matched pattern: hate).')
    );

    const post: Post = {
      id: 'test-mod-flagged-post',
      author: { id: 'u1', displayName: 'Test User' },
      content: 'I hate everyone and violence',
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

    const currentPosts = useFeedStore.getState().posts;
    expect(currentPosts.find((p) => p.id === 'test-mod-flagged-post')).toBeUndefined();
    expect(useFeedStore.getState().lastError).toContain('violates community guidelines');
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

    await expect(useFeedStore.getState().addPost(post1)).resolves.toBe('synced');
    expect(useFeedStore.getState().lastError).toBeNull();

    // Immediately attempt second post
    const post2: Post = { ...post1, id: 'post-2', content: 'Second rapid post' };
    await useFeedStore.getState().addPost(post2);

    expect(useFeedStore.getState().lastError).toContain('Please wait');
    expect(useFeedStore.getState().posts.find((p) => p.id === 'post-2')).toBeUndefined();
  });

  it('queues a post with poll options while offline without claiming publication', async () => {
    const post = makePost('offline-poll-post', {
      type: 'poll',
      poll: {
        id: 'client-poll', question: 'Question?', totalVotes: 0, isClosed: false,
        options: [
          { id: 'client-option-1', label: 'Yes', voteCount: 0, sortOrder: 0 },
          { id: 'client-option-2', label: 'No', voteCount: 0, sortOrder: 1 },
        ],
      },
    });
    useNetworkStore.setState({ isConnected: false });

    await expect(useFeedStore.getState().addPost(post)).resolves.toBe('queued');
    expect(getPendingOps()[0].payload.pollOptions).toEqual(['Yes', 'No']);
    expect(useFeedStore.getState().posts[0].syncStatus).toBe('QUEUED');
    expect(dataService.composePost).not.toHaveBeenCalled();
  });

  it('queues an ambiguous post response with its original idempotency token', async () => {
    (dataService.composePost as jest.Mock)
      .mockResolvedValueOnce({ id: null, success: false, retryable: true, error: 'Request timed out.' })
      .mockResolvedValueOnce({ id: null, success: false, error: 'Request timed out.' });
    const post = makePost('ambiguous-post', { clientToken: 'post-token' });

    await expect(useFeedStore.getState().addPost(post)).resolves.toBe('queued');
    expect(getPendingOps()[0]).toMatchObject({
      type: 'compose_post',
      clientToken: 'post-token',
      payload: { clientToken: 'post-token', content: 'Original post text' },
    });
    expect(useFeedStore.getState().posts[0].syncStatus).toBe('QUEUED');
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

    await useFeedStore.getState().toggleReaction('post-react-test', 'like');

    const updated = useFeedStore.getState().posts.find((p) => p.id === 'post-react-test');
    expect(updated?.reactionCount).toBe(5);
    expect(updated?.userReaction).toBeUndefined();
    expect(useFeedStore.getState().lastError).toBe('Failed to update reaction.');
  });

  it('keeps the original post text when edit persistence fails', async () => {
    useFeedStore.setState({ posts: [makePost('post-edit', { content: 'Original text' })] });
    (dataService.editPost as jest.Mock).mockResolvedValue(false);

    await expect(useFeedStore.getState().editPost('post-edit', 'Changed text')).resolves.toBe(false);
    expect(useFeedStore.getState().posts[0].content).toBe('Original text');
  });

  it('updates post text after edit persistence succeeds', async () => {
    useFeedStore.setState({ posts: [makePost('post-edit')] });
    (dataService.editPost as jest.Mock).mockResolvedValue(true);

    await expect(useFeedStore.getState().editPost('post-edit', 'Saved text')).resolves.toBe(true);
    expect(useFeedStore.getState().posts[0].content).toBe('Saved text');
  });

  it('restores the post when deletion is not confirmed', async () => {
    const post = makePost('post-delete');
    useFeedStore.setState({ posts: [post] });
    (dataService.deletePost as jest.Mock).mockResolvedValue(false);

    await expect(useFeedStore.getState().deletePost(post.id)).resolves.toBe(false);
    expect(useFeedStore.getState().posts[0]).toEqual(post);
  });

  it('keeps the post deleted only after the service confirms deletion', async () => {
    useFeedStore.setState({ posts: [makePost('post-delete')] });
    (dataService.deletePost as jest.Mock).mockResolvedValue(true);

    await expect(useFeedStore.getState().deletePost('post-delete')).resolves.toBe(true);
    expect(useFeedStore.getState().posts[0].isDeleted).toBe(true);
  });

  it('restores poll totals when vote persistence fails', async () => {
    const post = makePost('post-poll', {
      type: 'poll',
      poll: {
        id: 'poll-1', question: 'Question?', totalVotes: 2, isClosed: false,
        options: [
          { id: 'option-1', label: 'Yes', voteCount: 1, sortOrder: 0 },
          { id: 'option-2', label: 'No', voteCount: 1, sortOrder: 1 },
        ],
      },
    });
    useFeedStore.setState({ posts: [post] });
    (dataService.votePoll as jest.Mock).mockResolvedValue(false);

    await expect(useFeedStore.getState().votePoll(post.id, 'option-1')).resolves.toBe(false);
    expect(useFeedStore.getState().posts[0].poll).toEqual(post.poll);
  });

  it('updates poll totals after vote persistence succeeds', async () => {
    const post = makePost('post-poll', {
      type: 'poll',
      poll: {
        id: 'poll-1', question: 'Question?', totalVotes: 2, isClosed: false,
        options: [
          { id: 'option-1', label: 'Yes', voteCount: 1, sortOrder: 0 },
          { id: 'option-2', label: 'No', voteCount: 1, sortOrder: 1 },
        ],
      },
    });
    useFeedStore.setState({ posts: [post] });
    (dataService.votePoll as jest.Mock).mockResolvedValue(true);

    await expect(useFeedStore.getState().votePoll(post.id, 'option-2')).resolves.toBe(true);
    expect(useFeedStore.getState().posts[0].poll?.userVotedOptionId).toBe('option-2');
    expect(useFeedStore.getState().posts[0].poll?.totalVotes).toBe(3);
  });

  it('sends poll options and replaces temporary poll IDs with persisted IDs', async () => {
    const post = makePost('client-post-poll', {
      type: 'poll',
      poll: {
        id: 'client-poll', question: 'Question?', totalVotes: 0, isClosed: false,
        options: [
          { id: 'client-option-1', label: 'Yes', voteCount: 0, sortOrder: 0 },
          { id: 'client-option-2', label: 'No', voteCount: 0, sortOrder: 1 },
        ],
      },
    });
    (dataService.composePost as jest.Mock).mockResolvedValue({
      id: 'persisted-post',
      success: true,
      poll: {
        id: 'persisted-poll', question: 'Question?', totalVotes: 0, isClosed: false,
        options: [
          { id: 'persisted-option-1', label: 'Yes', voteCount: 0, sortOrder: 0 },
          { id: 'persisted-option-2', label: 'No', voteCount: 0, sortOrder: 1 },
        ],
      },
    });

    await useFeedStore.getState().addPost(post);

    expect(dataService.composePost).toHaveBeenCalledWith(expect.objectContaining({ pollOptions: ['Yes', 'No'] }));
    expect(useFeedStore.getState().posts[0].id).toBe('persisted-post');
    expect(useFeedStore.getState().posts[0].poll?.id).toBe('persisted-poll');
    expect(useFeedStore.getState().posts[0].poll?.options[0].id).toBe('persisted-option-1');
  });

  it('does not keep a poll post when the service does not confirm its persisted poll', async () => {
    const post = makePost('client-post-poll', {
      type: 'poll',
      poll: {
        id: 'client-poll', question: 'Question?', totalVotes: 0, isClosed: false,
        options: [
          { id: 'client-option-1', label: 'Yes', voteCount: 0, sortOrder: 0 },
          { id: 'client-option-2', label: 'No', voteCount: 0, sortOrder: 1 },
        ],
      },
    });
    (dataService.composePost as jest.Mock).mockResolvedValue({ id: 'persisted-post', success: true, poll: null });

    await useFeedStore.getState().addPost(post);

    expect(useFeedStore.getState().posts).toHaveLength(0);
    expect(useFeedStore.getState().lastError).toContain('Could not submit post');
  });

  it('restores a comment reaction when the API rejects it', async () => {
    const comment = makeComment('comment-1');
    useFeedStore.setState({ posts: [makePost('post-1')], comments: { 'post-1': [comment] } });
    (dataService.reactToComment as jest.Mock).mockResolvedValue(false);

    await expect(useFeedStore.getState().toggleCommentReaction('post-1', comment.id)).resolves.toBe(false);
    expect(useFeedStore.getState().comments['post-1'][0]).toEqual(comment);
  });

  it('keeps a comment reaction after the API confirms it', async () => {
    const comment = makeComment('comment-1');
    useFeedStore.setState({ posts: [makePost('post-1')], comments: { 'post-1': [comment] } });
    (dataService.reactToComment as jest.Mock).mockResolvedValue(true);

    await expect(useFeedStore.getState().toggleCommentReaction('post-1', comment.id)).resolves.toBe(true);
    expect(useFeedStore.getState().comments['post-1'][0].userReaction).toBe('like');
    expect(useFeedStore.getState().comments['post-1'][0].reactionCount).toBe(3);
  });

  it('reconciles a confirmed comment to its server ID', async () => {
    useFeedStore.setState({ posts: [makePost('post-1')], comments: { 'post-1': [] } });
    (dataService.addPostComment as jest.Mock).mockResolvedValue({ id: 'persisted-comment', success: true });
    const comment = makeComment('client-comment', { clientToken: 'comment-token' });

    await expect(useFeedStore.getState().addComment('post-1', comment)).resolves.toBe('synced');
    expect(dataService.addPostComment).toHaveBeenCalledWith('post-1', 'test-user-1', 'A comment', undefined, 'comment-token');
    expect(useFeedStore.getState().comments['post-1'][0]).toMatchObject({
      id: 'persisted-comment', clientToken: 'comment-token', syncStatus: 'SYNCED',
    });
    expect(useFeedStore.getState().posts[0].replyCount).toBe(1);
  });

  it('rolls back a comment when persistence fails', async () => {
    useFeedStore.setState({ posts: [makePost('post-1')], comments: { 'post-1': [] } });
    (dataService.addPostComment as jest.Mock).mockResolvedValue({ id: null, success: false, error: 'Could not save comment.' });

    await expect(useFeedStore.getState().addComment('post-1', makeComment('client-comment'))).resolves.toBe('failed');
    expect(useFeedStore.getState().comments['post-1']).toEqual([]);
    expect(useFeedStore.getState().posts[0].replyCount).toBe(0);
    expect(useFeedStore.getState().lastError).toBe('Could not save comment.');
  });

  it('queues offline comments with a stable replay token', async () => {
    useFeedStore.setState({ posts: [makePost('post-1')], comments: { 'post-1': [] } });
    useNetworkStore.setState({ isConnected: false });
    const comment = makeComment('client-comment', { clientToken: 'comment-token' });

    await expect(useFeedStore.getState().addComment('post-1', comment)).resolves.toBe('queued');
    expect(getPendingOps()[0]).toMatchObject({
      type: 'add_comment',
      clientToken: 'comment-token',
      payload: { postId: 'post-1', clientToken: 'comment-token', content: 'A comment' },
    });
    expect(useFeedStore.getState().comments['post-1'][0].syncStatus).toBe('QUEUED');
    expect(dataService.addPostComment).not.toHaveBeenCalled();
  });

  it('queues an ambiguous comment response with its original idempotency token', async () => {
    (dataService.addPostComment as jest.Mock)
      .mockResolvedValueOnce({ id: null, success: false, retryable: true, error: 'Request timed out.' })
      .mockResolvedValueOnce({ id: null, success: false, error: 'Request timed out.' });
    useFeedStore.setState({ posts: [makePost('post-1')], comments: { 'post-1': [] } });
    const comment = makeComment('local-comment', { clientToken: 'comment-token' });

    await expect(useFeedStore.getState().addComment('post-1', comment)).resolves.toBe('queued');
    expect(getPendingOps()[0]).toMatchObject({
      type: 'add_comment',
      clientToken: 'comment-token',
      payload: { clientToken: 'comment-token', postId: 'post-1', content: 'A comment' },
    });
    expect(useFeedStore.getState().comments['post-1'][0].syncStatus).toBe('QUEUED');
  });

  it('restores a comment when server deletion fails', async () => {
    const comment = makeComment('comment-delete');
    useFeedStore.setState({ posts: [makePost('post-1', { replyCount: 1 })], comments: { 'post-1': [comment] } });
    (dataService.deletePostComment as jest.Mock).mockResolvedValue(false);

    await expect(useFeedStore.getState().deleteComment('post-1', comment.id)).resolves.toBe(false);
    expect(useFeedStore.getState().comments['post-1'][0]).toEqual(comment);
    expect(useFeedStore.getState().posts[0].replyCount).toBe(1);
  });

  it('keeps a comment deleted after server confirmation', async () => {
    useFeedStore.setState({ posts: [makePost('post-1', { replyCount: 1 })], comments: { 'post-1': [makeComment('comment-delete')] } });
    (dataService.deletePostComment as jest.Mock).mockResolvedValue(true);

    await expect(useFeedStore.getState().deleteComment('post-1', 'comment-delete')).resolves.toBe(true);
    expect(useFeedStore.getState().comments['post-1'][0].isDeleted).toBe(true);
    expect(useFeedStore.getState().posts[0].replyCount).toBe(0);
  });

  it('does not mark an account followed until the API confirms it', async () => {
    (dataService.followUser as jest.Mock).mockResolvedValue(false);

    await expect(useFeedStore.getState().followUser('target-user')).resolves.toBe(false);
    expect(useFeedStore.getState().followedUserIds).not.toContain('target-user');
    expect(useFeedStore.getState().lastError).toContain('Could not follow');
  });

  it('adds a follow after API confirmation and removes it after confirmed unfollow', async () => {
    (dataService.followUser as jest.Mock).mockResolvedValue(true);
    (dataService.unfollowUser as jest.Mock).mockResolvedValue(true);
    (dataService.fetchFollowedUserIds as jest.Mock).mockResolvedValue(['target-user']);
    (dataService.fetchBlendedFeed as jest.Mock).mockResolvedValue([]);

    await expect(useFeedStore.getState().followUser('target-user')).resolves.toBe(true);
    expect(useFeedStore.getState().followedUserIds).toContain('target-user');
    expect(dataService.followUser).toHaveBeenCalledWith('test-user-1', 'target-user');

    (dataService.fetchFollowedUserIds as jest.Mock).mockResolvedValue([]);
    await expect(useFeedStore.getState().unfollowUser('target-user')).resolves.toBe(true);
    expect(useFeedStore.getState().followedUserIds).not.toContain('target-user');
  });

  it('keeps the newest feed when overlapping refreshes finish out of order', async () => {
    const deferred = <T,>() => {
      let resolve!: (value: T) => void;
      const promise = new Promise<T>((done) => {
        resolve = done;
      });
      return { promise, resolve };
    };
    const olderResponse = deferred<unknown[] | null>();
    const newerResponse = deferred<unknown[] | null>();
    (dataService.fetchFollowedUserIds as jest.Mock).mockResolvedValue([]);
    (dataService.fetchBlendedFeed as jest.Mock)
      .mockImplementationOnce(() => olderResponse.promise)
      .mockImplementationOnce(() => newerResponse.promise);

    const olderRefresh = useFeedStore.getState().refreshFeed('TS', 'TS-OLD');
    await Promise.resolve();
    expect(dataService.fetchBlendedFeed).toHaveBeenCalledTimes(1);
    const newerRefresh = useFeedStore.getState().refreshFeed('MH', 'MH-NEW');
    await Promise.resolve();
    expect(dataService.fetchBlendedFeed).toHaveBeenCalledTimes(2);

    const makeServerPost = (id: string, stateCode: string) => ({
      id,
      author_id: `${id}-author`,
      author_display_name: 'Citizen',
      state_code: stateCode,
      content: id,
      created_at: '2026-11-12T10:00:00.000Z',
      updated_at: '2026-11-12T10:00:00.000Z',
    });
    newerResponse.resolve([makeServerPost('new-post', 'MH')]);
    await newerRefresh;
    expect(useFeedStore.getState().posts.map((post) => post.id)).toEqual(['new-post']);

    olderResponse.resolve([makeServerPost('old-post', 'TS')]);
    await olderRefresh;

    expect(useFeedStore.getState().posts.map((post) => post.id)).toEqual(['new-post']);
    expect(useFeedStore.getState().loading).toBe(false);
  });

  it('keeps a follow when the API rejects unfollow', async () => {
    useFeedStore.setState({ followedUserIds: ['target-user'] });
    (dataService.unfollowUser as jest.Mock).mockResolvedValue(false);

    await expect(useFeedStore.getState().unfollowUser('target-user')).resolves.toBe(false);
    expect(useFeedStore.getState().followedUserIds).toContain('target-user');
  });

  it('retries a failed comment with its original token', async () => {
    const comment = makeComment('local-comment', {
      clientToken: 'comment-token',
      author: { id: 'test-user-1', displayName: 'Test User' },
      syncStatus: 'FAILED',
    });
    useFeedStore.setState({ posts: [makePost('post-1')], comments: { 'post-1': [comment] } });
    (dataService.addPostComment as jest.Mock).mockResolvedValue({ id: 'persisted-comment', success: true });

    await expect(useFeedStore.getState().retryComment('post-1', 'comment-token')).resolves.toBe(true);
    expect(dataService.addPostComment).toHaveBeenCalledWith('post-1', 'test-user-1', 'A comment', undefined, 'comment-token');
    expect(useFeedStore.getState().comments['post-1'][0]).toMatchObject({ id: 'persisted-comment', syncStatus: 'SYNCED' });
  });

  it('retries a failed post from the stored payload with its original token', async () => {
    const post = makePost('local-post', { clientToken: 'post-token', syncStatus: 'FAILED' });
    useFeedStore.setState({ posts: [post] });
    (dataService.composePost as jest.Mock).mockResolvedValue({ id: 'persisted-post', success: true });

    await expect(useFeedStore.getState().retryPost('post-token')).resolves.toBe(true);
    expect(dataService.composePost).toHaveBeenCalledWith(expect.objectContaining({
      clientToken: 'post-token',
      content: 'Original post text',
      authorId: 'test-user-1',
    }));
    expect(useFeedStore.getState().posts[0]).toMatchObject({ id: 'persisted-post', syncStatus: 'SYNCED' });
  });
});
