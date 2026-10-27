/**
 * Feed Ranking Algorithm V1 Test Suite
 * Master Execution Framework — Jobs 024-030 / Launch Gate A
 *
 * Verifies:
 * 1. Base engagement calculation (reactions * 2 + replies * 3)
 * 2. Geographic affinity boost (+15 constituency, +5 state)
 * 3. Author verification bonus (+10)
 * 4. Discussion / Question / Poll content format bonus (+5)
 * 5. Hacker News gravity decay curve over time
 * 6. Pinned posts float unconditionally to top of feed
 * 7. Correct end-to-end rank ordering under rankPostsV1
 */

import { calculatePostScore, rankPostsV1 } from '../lib/feedRanking';
import type { Post } from '../lib/feedTypes';

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'post-1',
    author: { id: 'usr-1', displayName: 'Citizen', isVerified: false },
    content: 'Sample post',
    type: 'opinion',
    stateCode: 'TS',
    constituencyId: 'TS-AC-1',
    constituencyName: 'Sirpur',
    replyCount: 0,
    reactionCount: 0,
    isPinned: false,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Track 2: Feed Ranking Algorithm V1', () => {
  const baseNow = 1770000000000; // Fixed timestamp

  describe('1. Engagement Velocity Scoring', () => {
    it('weights replies (3x) higher than reactions (2x)', () => {
      const reactionPost = makePost({
        reactionCount: 10, // 10 * 2 = 20
        replyCount: 0,
        createdAt: new Date(baseNow).toISOString(),
      });
      const replyPost = makePost({
        reactionCount: 0,
        replyCount: 10, // 10 * 3 = 30
        createdAt: new Date(baseNow).toISOString(),
      });

      const scoreReaction = calculatePostScore(reactionPost, {}, baseNow);
      const scoreReply = calculatePostScore(replyPost, {}, baseNow);

      expect(scoreReply).toBeGreaterThan(scoreReaction);
    });
  });

  describe('2. Geographic Affinity Weighting', () => {
    it('awards home constituency bonus (+15) and home state bonus (+5)', () => {
      const outsidePost = makePost({
        stateCode: 'KA',
        constituencyId: 'KA-AC-10',
        createdAt: new Date(baseNow).toISOString(),
      });
      const sameStatePost = makePost({
        stateCode: 'TS',
        constituencyId: 'TS-AC-99',
        createdAt: new Date(baseNow).toISOString(),
      });
      const sameConstituencyPost = makePost({
        stateCode: 'TS',
        constituencyId: 'TS-AC-1',
        createdAt: new Date(baseNow).toISOString(),
      });

      const context = { stateCode: 'TS', constituencyId: 'TS-AC-1' };

      const scoreOutside = calculatePostScore(outsidePost, context, baseNow);
      const scoreState = calculatePostScore(sameStatePost, context, baseNow);
      const scoreConstituency = calculatePostScore(sameConstituencyPost, context, baseNow);

      expect(scoreState).toBeGreaterThan(scoreOutside);
      expect(scoreConstituency).toBeGreaterThan(scoreState);
    });
  });

  describe('3. Verified Author & Engaging Format Bonuses', () => {
    it('awards verified author bonus (+10)', () => {
      const normalPost = makePost({ createdAt: new Date(baseNow).toISOString() });
      const verifiedPost = makePost({
        author: { id: 'pol-1', displayName: 'MLA', isVerified: true },
        createdAt: new Date(baseNow).toISOString(),
      });

      const normalScore = calculatePostScore(normalPost, {}, baseNow);
      const verifiedScore = calculatePostScore(verifiedPost, {}, baseNow);

      expect(verifiedScore).toBeGreaterThan(normalScore);
    });

    it('awards bonus (+5) to discussions, polls, and questions over basic opinions', () => {
      const opinionPost = makePost({ type: 'opinion', createdAt: new Date(baseNow).toISOString() });
      const discussionPost = makePost({ type: 'discussion', createdAt: new Date(baseNow).toISOString() });
      const pollPost = makePost({ type: 'poll', createdAt: new Date(baseNow).toISOString() });

      const opinionScore = calculatePostScore(opinionPost, {}, baseNow);
      const discussionScore = calculatePostScore(discussionPost, {}, baseNow);
      const pollScore = calculatePostScore(pollPost, {}, baseNow);

      expect(discussionScore).toBeGreaterThan(opinionScore);
      expect(pollScore).toBeGreaterThan(opinionScore);
    });
  });

  describe('4. Time Gravity Decay', () => {
    it('decays post score over hours following gravity curve', () => {
      const oneHourAgo = new Date(baseNow - 1 * 3600 * 1000).toISOString();
      const twelveHoursAgo = new Date(baseNow - 12 * 3600 * 1000).toISOString();
      const twoDaysAgo = new Date(baseNow - 48 * 3600 * 1000).toISOString();

      const freshPost = makePost({ reactionCount: 10, createdAt: oneHourAgo });
      const olderPost = makePost({ reactionCount: 10, createdAt: twelveHoursAgo });
      const stalePost = makePost({ reactionCount: 10, createdAt: twoDaysAgo });

      const scoreFresh = calculatePostScore(freshPost, {}, baseNow);
      const scoreOlder = calculatePostScore(olderPost, {}, baseNow);
      const scoreStale = calculatePostScore(stalePost, {}, baseNow);

      expect(scoreFresh).toBeGreaterThan(scoreOlder);
      expect(scoreOlder).toBeGreaterThan(scoreStale);
    });
  });

  describe('5. rankPostsV1 Ordering & Pinned Floating', () => {
    it('pins pinned post unconditionally to index 0 regardless of scores', () => {
      const highEngagementOld = makePost({
        id: 'p-high-old',
        reactionCount: 500,
        replyCount: 200,
        createdAt: new Date(baseNow - 72 * 3600 * 1000).toISOString(),
      });
      const lowEngagementFresh = makePost({
        id: 'p-low-fresh',
        reactionCount: 2,
        replyCount: 1,
        createdAt: new Date(baseNow).toISOString(),
      });
      const pinnedPost = makePost({
        id: 'p-pinned',
        isPinned: true,
        reactionCount: 0,
        replyCount: 0,
        createdAt: new Date(baseNow - 100 * 3600 * 1000).toISOString(),
      });

      const ranked = rankPostsV1(
        [highEngagementOld, lowEngagementFresh, pinnedPost],
        { stateCode: 'TS', constituencyId: 'TS-AC-1' },
        baseNow,
      );

      expect(ranked[0].id).toBe('p-pinned');
    });

    it('correctly ranks posts using composite formula', () => {
      const p1 = makePost({
        id: 'local-active',
        stateCode: 'TS',
        constituencyId: 'TS-AC-1',
        reactionCount: 20,
        replyCount: 10,
        type: 'discussion',
        createdAt: new Date(baseNow - 1 * 3600 * 1000).toISOString(),
      });
      const p2 = makePost({
        id: 'distant-inactive',
        stateCode: 'MH',
        constituencyId: 'MH-AC-40',
        reactionCount: 0,
        replyCount: 0,
        type: 'opinion',
        createdAt: new Date(baseNow - 24 * 3600 * 1000).toISOString(),
      });

      const ranked = rankPostsV1([p2, p1], { stateCode: 'TS', constituencyId: 'TS-AC-1' }, baseNow);
      expect(ranked[0].id).toBe('local-active');
      expect(ranked[1].id).toBe('distant-inactive');
    });
  });
});
