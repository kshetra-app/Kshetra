/**
 * Feed types for Posts, Polls, Comments, Reactions.
 * Mirrors the Supabase schema from 0035_posts_polls_social.sql.
 *
 * While Supabase is optional (offline-first), these types are
 * used by UI components regardless of the data source.
 */

export type PostType = 'discussion' | 'news' | 'opinion' | 'question' | 'alert' | 'poll';

export type ReactionType = 'like' | 'insightful' | 'disagree' | 'celebrate';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'misinformation'
  | 'hate_speech'
  | 'violence'
  | 'impersonation'
  | 'other';

export interface PostAuthor {
  id: string;
  displayName: string;
  avatarUrl?: string;
  isVerified?: boolean;
}

export interface PostMedia {
  id: string;
  mediaType: 'image' | 'link' | 'video';
  url: string;
  thumbnailUrl?: string;
  altText?: string;
}

export interface PollOption {
  id: string;
  label: string;
  voteCount: number;
  sortOrder: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  expiresAt?: string;
  isClosed: boolean;
  userVotedOptionId?: string; // set client-side
}

export interface Post {
  id: string;
  author: PostAuthor;
  constituencyId?: string;
  constituencyName?: string;
  stateCode: string;
  content: string;
  type: PostType;
  parentId?: string;
  replyCount: number;
  reactionCount: number;
  isPinned: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  media?: PostMedia[];
  poll?: Poll;
  userReaction?: ReactionType; // set client-side
  hashtags?: string[];
}

export interface Comment {
  id: string;
  postId: string;
  author: PostAuthor;
  content: string;
  reactionCount: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  userReaction?: ReactionType;
}

export interface TrendingHashtag {
  tag: string;
  postCount: number;
}

export type FeedScope = 'constituency' | 'state' | 'national';
