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

export type IssueStatus = 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';

export type HeadlineCategory =
  | 'politics'
  | 'governance'
  | 'development'
  | 'law_and_order'
  | 'economy'
  | 'education'
  | 'health'
  | 'environment'
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
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  userUpvoted?: boolean;
}

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
};
