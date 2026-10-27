/**
 * Feed Ranking Algorithm V1
 * Master Execution Framework — Jobs 024-030 / Launch Gate A
 *
 * Implements engagement velocity and geographic affinity ranking for the "For You" feed.
 * Score formula:
 * S = (Base Engagement + Geo Affinity + Verified Bonus + Type Bonus) / (Age in Hours + 2)^1.5
 */

import type { Post } from './feedTypes';

export interface UserRankingContext {
  constituencyId?: string | null;
  stateCode?: string | null;
}

export function calculatePostScore(
  post: Post,
  context: UserRankingContext = {},
  nowMs: number = Date.now(),
): number {
  // 1. Base Engagement
  const reactionWeight = (post.reactionCount || 0) * 2;
  const replyWeight = (post.replyCount || 0) * 3;
  const pinWeight = post.isPinned ? 50 : 0;
  const baseEngagement = reactionWeight + replyWeight + pinWeight;

  // 2. Geographic Affinity
  let geoAffinity = 0;
  if (context.constituencyId && post.constituencyId === context.constituencyId) {
    geoAffinity += 15;
  }
  if (context.stateCode && post.stateCode === context.stateCode) {
    geoAffinity += 5;
  }

  // 3. Author Verification Bonus
  const authorBonus = post.author?.isVerified ? 10 : 0;

  // 4. Type Bonus (Discussions, Polls, Questions stimulate community engagement)
  let typeBonus = 0;
  if (post.type === 'poll' || post.type === 'discussion' || post.type === 'question') {
    typeBonus = 5;
  }

  // Total raw score (minimum 1 to ensure decay curves behave predictably)
  const rawScore = Math.max(1, baseEngagement + geoAffinity + authorBonus + typeBonus);

  // 5. Time Gravity Decay (Hacker News standard curve)
  const postCreatedAt = new Date(post.createdAt).getTime();
  const ageInMs = Math.max(0, nowMs - postCreatedAt);
  const ageInHours = ageInMs / (1000 * 60 * 60);
  const gravityDecay = Math.pow(ageInHours + 2, 1.5);

  return rawScore / gravityDecay;
}

export function rankPostsV1(
  posts: Post[],
  context: UserRankingContext = {},
  nowMs: number = Date.now(),
): Post[] {
  return [...posts].sort((a, b) => {
    // Pinned posts always float to the top
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    const scoreA = calculatePostScore(a, context, nowMs);
    const scoreB = calculatePostScore(b, context, nowMs);
    if (Math.abs(scoreB - scoreA) > 0.0001) {
      return scoreB - scoreA;
    }
    // Tie-breaker: latest timestamp
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
