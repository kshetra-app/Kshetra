jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { useFeedStore } from '../stores/feed';
import type { Post } from '../lib/feedTypes';

describe('Ticket 0.3: Follow Graph & Feed Blending', () => {
  beforeEach(() => {
    // Reset store state
    useFeedStore.setState({
      followedUserIds: [],
      posts: [
        {
          id: 'post-constituency-1',
          author: { id: 'author-c1', displayName: 'Local Citizen' },
          content: 'Constituency issue',
          type: 'discussion',
          stateCode: 'TS',
          constituencyId: 'TS-AC-01',
          createdAt: '2026-05-01T10:00:00Z',
          replyCount: 0,
          reactionCount: 0,
          isPinned: false,
          isDeleted: false,
          language: 'en',
          hashtags: [],
        },
        {
          id: 'post-page-1',
          author: { id: 'page-leader-1', displayName: 'Aspirant Page' },
          content: 'Important leadership announcement from outside district',
          type: 'discussion',
          stateCode: 'KA', // Different state/constituency
          constituencyId: 'KA-AC-99',
          createdAt: '2026-05-02T12:00:00Z', // More recent
          replyCount: 0,
          reactionCount: 0,
          isPinned: false,
          isDeleted: false,
          language: 'en',
          hashtags: [],
        },
      ],
    });
  });

  it('initially only includes constituency posts when not following', async () => {
    const store = useFeedStore.getState();
    await store.refreshFeed('TS', 'TS-AC-01');

    const posts = useFeedStore.getState().posts;
    const ids = posts.map((p) => p.id);
    expect(ids).toContain('post-constituency-1');
    expect(ids).not.toContain('post-page-1');
  });

  it('includes followed page posts in feed after followUser within one refresh', async () => {
    const store = useFeedStore.getState();
    await store.followUser('page-leader-1');

    expect(useFeedStore.getState().isFollowing('page-leader-1')).toBe(true);
    await store.refreshFeed('TS', 'TS-AC-01');

    const posts = useFeedStore.getState().posts;
    const ids = posts.map((p) => p.id);
    expect(ids).toContain('post-page-1');
    expect(ids).toContain('post-constituency-1');

    // Ranked strictly by recency (post-page-1 from May 2 is before post-constituency-1 from May 1)
    expect(posts[0].id).toBe('post-page-1');
    expect(posts[1].id).toBe('post-constituency-1');
  });

  it('removes unfollowed page posts from feed upon refresh', async () => {
    const store = useFeedStore.getState();
    await store.followUser('page-leader-1');
    await store.refreshFeed('TS', 'TS-AC-01');
    expect(useFeedStore.getState().posts.some((p) => p.id === 'post-page-1')).toBe(true);

    // Now unfollow
    await store.unfollowUser('page-leader-1');
    expect(useFeedStore.getState().isFollowing('page-leader-1')).toBe(false);

    await store.refreshFeed('TS', 'TS-AC-01');
    const posts = useFeedStore.getState().posts;
    expect(posts.some((p) => p.id === 'post-page-1')).toBe(false);
  });
});
