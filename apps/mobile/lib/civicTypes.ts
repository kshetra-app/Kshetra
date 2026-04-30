/**
 * Civic Dashboard types for Issues, Headlines, Sentiment.
 * Mirrors the Supabase schema from 004_civic_dashboard.sql.
 */

export type IssueCategory =
  | 'roads'
  | 'water'
  | 'electricity'
  | 'sanitation'
  | 'healthcare'
  | 'education'
  | 'public_safety'
  | 'transport'
  | 'housing'
  | 'environment'
  | 'corruption'
  | 'other';

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IssueStatus = 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed' | 'reopened';

/** Scope level for filtering civic dashboard content */
export type CivicScope = 'constituency' | 'state' | 'national';

export type HeadlineCategory =
  | 'politics'
  | 'governance'
  | 'development'
  | 'law_and_order'
  | 'economy'
  | 'education'
  | 'health'
  | 'environment'
  | 'corruption'
  | 'opinion';

export interface CivicIssue {
  id: string;
  reporterId: string;
  reporterName: string;
  constituencyId?: string;
  constituencyName?: string;
  stateCode: string;
  title: string;
  description?: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  upvoteCount: number;
  commentCount: number;
  followCount: number;
  evidenceCount: number;
  disputeCount: number;
  imageUrl?: string;
  /** Multiple media evidence URLs (photos/videos) */
  mediaUrls?: string[];
  latitude?: number;
  longitude?: number;
  resolvedAt?: string;
  resolutionNote?: string;
  resolvedBy?: string;
  mlaTagged: boolean;
  mlaResponded: boolean;
  mlaResponseNote?: string;
  isVerifiedReport: boolean;
  createdAt: string;
  updatedAt: string;
  // Client-side state
  userUpvoted?: boolean;
  userFollowing?: boolean;
  userDisputed?: boolean;
}

export interface IssueComment {
  id: string;
  issueId: string;
  userId: string;
  userName: string;
  body: string;
  imageUrl?: string;
  isOfficial: boolean;
  createdAt: string;
}

export interface IssueEvidence {
  id: string;
  issueId: string;
  userId: string;
  userName: string;
  imageUrl: string;
  caption?: string;
  createdAt: string;
}

export interface IssueStatusChange {
  id: string;
  issueId: string;
  fromStatus: IssueStatus;
  toStatus: IssueStatus;
  changedBy?: string;
  changedByName?: string;
  note?: string;
  createdAt: string;
}

export interface IssueDispute {
  id: string;
  issueId: string;
  userId: string;
  reason?: string;
  createdAt: string;
}

/** Upvote milestones that trigger notifications */
export const MILESTONE_THRESHOLDS = [10, 50, 100, 500] as const;

/** Auto-promote to headlines at this threshold */
export const HEADLINE_PROMOTION_THRESHOLD = 500;

export interface Headline {
  id: string;
  stateCode: string;
  constituencyId?: string;
  title: string;
  summary?: string;
  sourceName: string;
  sourceUrl: string;
  imageUrl?: string;
  category: HeadlineCategory;
  publishedAt: string;
}

export interface ConstituencySentiment {
  constituencyId: string;
  constituencyName: string;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  totalPosts: number;
  /** -1 (very negative) to +1 (very positive) */
  score: number;
  topIssues: IssueCategory[];
}

export const ISSUE_CATEGORY_CONFIG: Record<IssueCategory, { icon: string; color: string; label: string }> = {
  roads: { icon: 'car', color: '#F59E0B', label: 'Roads' },
  water: { icon: 'water', color: '#3B82F6', label: 'Water' },
  electricity: { icon: 'flash', color: '#EAB308', label: 'Electricity' },
  sanitation: { icon: 'trash', color: '#84CC16', label: 'Sanitation' },
  healthcare: { icon: 'medkit', color: '#EF4444', label: 'Healthcare' },
  education: { icon: 'school', color: '#8B5CF6', label: 'Education' },
  public_safety: { icon: 'shield-checkmark', color: '#06B6D4', label: 'Safety' },
  transport: { icon: 'bus', color: '#F97316', label: 'Transport' },
  housing: { icon: 'home', color: '#A855F7', label: 'Housing' },
  environment: { icon: 'leaf', color: '#10B981', label: 'Environment' },
  corruption: { icon: 'warning', color: '#DC2626', label: 'Corruption' },
  other: { icon: 'ellipsis-horizontal', color: '#6B7280', label: 'Other' },
};

export const SEVERITY_CONFIG: Record<IssueSeverity, { color: string; label: string }> = {
  low: { color: '#6B7280', label: 'Low' },
  medium: { color: '#F59E0B', label: 'Medium' },
  high: { color: '#F97316', label: 'High' },
  critical: { color: '#EF4444', label: 'Critical' },
};

export const STATUS_CONFIG: Record<IssueStatus, { color: string; label: string; icon: string }> = {
  open: { color: '#3B82F6', label: 'Open', icon: 'radio-button-on' },
  acknowledged: { color: '#8B5CF6', label: 'Acknowledged', icon: 'eye' },
  in_progress: { color: '#F59E0B', label: 'In Progress', icon: 'hammer' },
  resolved: { color: '#10B981', label: 'Resolved', icon: 'checkmark-circle' },
  closed: { color: '#6B7280', label: 'Closed', icon: 'close-circle' },
  reopened: { color: '#EF4444', label: 'Reopened', icon: 'refresh-circle' },
};

/** Valid status transitions with who can perform them */
export const STATUS_TRANSITIONS: Record<IssueStatus, { to: IssueStatus; actor: string }[]> = {
  open: [
    { to: 'acknowledged', actor: 'moderator' },
    { to: 'closed', actor: 'admin' },
  ],
  acknowledged: [
    { to: 'in_progress', actor: 'official' },
    { to: 'closed', actor: 'admin' },
  ],
  in_progress: [
    { to: 'resolved', actor: 'official' },
    { to: 'closed', actor: 'admin' },
  ],
  resolved: [
    { to: 'closed', actor: 'auto' },
    { to: 'reopened', actor: 'community' },
  ],
  closed: [],
  reopened: [
    { to: 'acknowledged', actor: 'moderator' },
    { to: 'in_progress', actor: 'official' },
  ],
};
