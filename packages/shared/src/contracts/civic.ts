/**
 * Canonical Civic Contracts & DTOs
 * Master Product Blueprint — Domain 3
 */

export type CanonicalCivicStatus =
  | 'REPORTED'
  | 'REVIEW'
  | 'VERIFIED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CONFIRMED'
  | 'DISPUTED'
  | 'CLOSED';

export type LegacyCivicStatus =
  | 'open'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'reopened';

export type CivicIssueStatus = CanonicalCivicStatus | LegacyCivicStatus;

export type CivicIssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export type CivicIssueCategory =
  | 'roads'
  | 'water'
  | 'electricity'
  | 'sanitation'
  | 'healthcare'
  | 'education'
  | 'environment'
  | 'public_safety'
  | 'corruption'
  | 'transport'
  | 'housing'
  | 'general';

export interface CivicIssueDTO {
  id: string;
  reporterId: string;
  reporterName?: string;
  constituencyId: string;
  constituencyName?: string;
  stateCode: string;
  title: string;
  description: string;
  category: CivicIssueCategory;
  severity: CivicIssueSeverity;
  status: CivicIssueStatus;
  upvoteCount: number;
  commentCount: number;
  followCount: number;
  evidenceCount: number;
  disputeCount: number;
  mediaUrls: string[];
  mlaTagged: boolean;
  mlaResponded: boolean;
  mlaResponseNote?: string;
  resolutionNote?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  isVerifiedReport: boolean;
  latitude?: number;
  longitude?: number;
  canonicalStatus?: CanonicalCivicStatus;
  assignedDepartment?: string;
  assignedOfficerName?: string;
  estimatedCompletionDate?: string;
  resolutionEvidenceUrl?: string;
  confirmedAt?: string;
  disputedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCivicIssueInput {
  title: string;
  description: string;
  category: CivicIssueCategory;
  severity?: CivicIssueSeverity;
  constituencyId: string;
  stateCode: string;
  mediaUrls?: string[];
  latitude?: number;
  longitude?: number;
}

export interface UpdateCivicIssueStatusInput {
  status: CivicIssueStatus;
  note?: string;
  evidenceUrl?: string;
  assignedDepartment?: string;
  assignedOfficerName?: string;
  estimatedCompletionDate?: string;
}

export interface IssueStatusHistoryRecordDTO {
  id: string;
  issueId: string;
  fromStatus: CivicIssueStatus;
  toStatus: CivicIssueStatus;
  changedBy: string;
  changedByName?: string;
  actorRole: string;
  note?: string;
  evidenceUrl?: string;
  assignedDepartment?: string;
  createdAt: string;
}

export interface DisputeIssueInput {
  reason: string;
}

export interface AddCivicCommentInput {
  body: string;
  imageUrl?: string;
}

export interface AddCivicEvidenceInput {
  mediaUrl: string;
  caption?: string;
}

export interface CommunityGroupDTO {
  id: string;
  name: string;
  slug: string;
  constituencyId: string;
  mandal?: string;
  ward?: string;
  description?: string;
  category: string;
  createdBy: string;
  memberCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GovernmentSchemeDTO {
  id: string;
  title: string;
  slug: string;
  category: string;
  level: 'CENTRAL' | 'STATE' | 'LOCAL';
  stateCode?: string;
  description: string;
  eligibility?: string;
  benefits?: string;
  applicationUrl?: string;
}

export interface DevelopmentProjectDTO {
  id: string;
  title: string;
  constituencyId: string;
  stateCode: string;
  category: string;
  budgetInr: number;
  spentInr: number;
  phase: 'PROPOSED' | 'SANCTIONED' | 'IN_PROGRESS' | 'COMPLETED' | 'HALTED';
  contractorName?: string;
  startDate?: string;
  completionTargetDate?: string;
}

export interface ConstituencySentimentDTO {
  constituencyId: string;
  constituencyName: string;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  totalPosts: number;
  score: number;
  topIssues: string[];
}
