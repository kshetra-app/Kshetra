/**
 * Personalized Feed Hook
 *
 * Filters and ranks feed content based on:
 * 1. User interests (from profile)
 * 2. Home constituency
 * 3. Favorite constituencies
 * 4. Active state
 */

import { useMemo } from 'react';
import { useUserProfileStore } from '../stores/userProfile';
import { useMyConstituencyStore } from '../stores/myConstituency';
import { useFavoritesStore } from '../stores/favorites';
import { useActiveStateStore } from '../stores/activeState';
import { useFeedStore } from '../stores/feed';
import { useCivicStore } from '../stores/civic';
import type { Post } from '../lib/feedTypes';
import type { CivicIssue } from '../lib/civicTypes';

export interface PersonalizedContent {
  /** Posts sorted by relevance */
  posts: Post[];
  /** Civic issues from home/favorite constituencies first */
  issues: CivicIssue[];
  /** Whether personalization is active */
  isPersonalized: boolean;
  /** User's interest tags */
  interests: string[];
}

/** Interest → feed category mapping */
const INTEREST_CATEGORY_MAP: Record<string, string[]> = {
  elections: ['election', 'results', 'voting', 'candidate'],
  civic: ['infrastructure', 'water', 'roads', 'sanitation', 'education', 'health'],
  delimitation: ['delimitation', 'boundary', 'census'],
  promises: ['promise', 'guarantee', 'scheme'],
  transparency: ['rti', 'affidavit', 'criminal', 'assets'],
  analytics: ['data', 'statistics', 'analysis'],
  community: ['community', 'volunteer', 'rally'],
  news: ['breaking', 'headline', 'press'],
};

/**
 * Score a post based on user profile relevance.
 * Higher = more relevant.
 */
function scorePost(post: Post, interests: string[], homeAcNo: number | null, favoriteIds: number[]): number {
  let score = 0;

  // Recency boost (newer = higher)
  const age = Date.now() - new Date(post.createdAt).getTime();
  const hourAge = age / (1000 * 60 * 60);
  score += Math.max(0, 100 - hourAge * 2); // decays over 50 hours

  // Interest match
  const contentLower = (post.content + ' ' + (post.hashtags?.join(' ') ?? '')).toLowerCase();
  for (const interest of interests) {
    const keywords = INTEREST_CATEGORY_MAP[interest] ?? [];
    for (const kw of keywords) {
      if (contentLower.includes(kw)) {
        score += 15;
        break; // one match per interest
      }
    }
  }

  // Engagement boost
  score += Math.min(20, (post.reactionCount ?? 0) * 2);
  score += Math.min(10, (post.replyCount ?? 0) * 3);

  return score;
}

/**
 * Score an issue based on relevance to user.
 */
function scoreIssue(issue: CivicIssue, homeAcNo: number | null, favoriteIds: number[]): number {
  let score = 0;

  // Home constituency boost
  if (homeAcNo && issue.constituencyId === `TS-AC-${homeAcNo}`) {
    score += 50;
  }

  // Favorite constituency boost
  const acMatch = issue.constituencyId?.match(/AC-(\d+)/);
  if (acMatch && favoriteIds.includes(parseInt(acMatch[1], 10))) {
    score += 30;
  }

  // Severity boost
  const severityBoost: Record<string, number> = { critical: 40, high: 25, medium: 10, low: 5 };
  score += severityBoost[issue.severity] ?? 0;

  // Recency
  const age = Date.now() - new Date(issue.createdAt).getTime();
  score += Math.max(0, 50 - (age / (1000 * 60 * 60 * 24)) * 5); // decays over 10 days

  // Engagement
  score += Math.min(15, issue.upvoteCount * 2);

  return score;
}

export function usePersonalizedFeed(): PersonalizedContent {
  const profile = useUserProfileStore((s) => s.profile);
  const homeAcNo = useMyConstituencyStore((s) => s.home?.acNo ?? null);
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const posts = useFeedStore((s) => s.posts);
  const issues = useCivicStore((s) => s.issues);

  const interests = profile?.interests ?? [];
  const isPersonalized = interests.length > 0 || homeAcNo !== null || favoriteIds.length > 0;

  const sortedPosts = useMemo(() => {
    if (!isPersonalized) return posts;
    return [...posts]
      .map((p) => ({ post: p, score: scorePost(p, interests, homeAcNo, favoriteIds) }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.post);
  }, [posts, interests, homeAcNo, favoriteIds, isPersonalized]);

  const sortedIssues = useMemo(() => {
    if (!isPersonalized) return issues;
    return [...issues]
      .map((i) => ({ issue: i, score: scoreIssue(i, homeAcNo, favoriteIds) }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.issue);
  }, [issues, homeAcNo, favoriteIds, isPersonalized]);

  return {
    posts: sortedPosts,
    issues: sortedIssues,
    isPersonalized,
    interests,
  };
}
