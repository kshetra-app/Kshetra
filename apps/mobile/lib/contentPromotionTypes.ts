/**
 * Content Promotion Pipeline (CPP) Types
 *
 * Controls how content graduates from constituency-level to state/national feeds.
 * Content starts local, gets community review (vouch/flag/alert), and only
 * appears in wider feeds after passing safety checks.
 *
 * Mirrors: supabase/migrations/014_content_promotion_pipeline.sql
 */

// ─── Content Types that go through the pipeline ─────────────────────────────

export type PromotableContentType =
  | 'post'
  | 'news'
  | 'opinion'
  | 'short'
  | 'civic_issue'
  | 'promise_evidence'
  | 'headline';

// ─── Risk Tiers ─────────────────────────────────────────────────────────────

export type RiskTier = 'high' | 'medium' | 'low';

export const RISK_TIER_CONFIG: Record<RiskTier, {
  label: string;
  description: string;
  color: string;
  defaultReviewHours: number;
  defaultVouchThreshold: number;
  defaultFlagThreshold: number;
}> = {
  high: {
    label: 'High Risk',
    description: 'News reports, claims about individuals. Full review required.',
    color: '#EF4444',
    defaultReviewHours: 12,
    defaultVouchThreshold: 10,
    defaultFlagThreshold: 3,
  },
  medium: {
    label: 'Medium Risk',
    description: 'Opinions, civic issues, shorts. Community vouch to promote.',
    color: '#F59E0B',
    defaultReviewHours: 6,
    defaultVouchThreshold: 5,
    defaultFlagThreshold: 3,
  },
  low: {
    label: 'Low Risk',
    description: 'Polls, questions, discussions. No gating, flag/report only.',
    color: '#10B981',
    defaultReviewHours: 2,
    defaultVouchThreshold: 3,
    defaultFlagThreshold: 5,
  },
};

/**
 * Map post types to risk tiers.
 * News and claims = high risk. Opinions/issues = medium. Discussions/polls = low.
 */
export function getRiskTier(contentType: PromotableContentType, postType?: string): RiskTier {
  if (contentType === 'news' || contentType === 'headline') return 'high';
  if (postType === 'news') return 'high';
  if (contentType === 'opinion' || contentType === 'short' || contentType === 'civic_issue' || contentType === 'promise_evidence') return 'medium';
  if (postType === 'opinion') return 'medium';
  // Discussions, questions, polls
  return 'low';
}

// ─── Visibility Levels ──────────────────────────────────────────────────────

export type VisibilityLevel = 'constituency' | 'district' | 'state' | 'national' | 'restricted';

export const VISIBILITY_LEVEL_CONFIG: Record<VisibilityLevel, {
  label: string;
  icon: string;
  color: string;
  description: string;
}> = {
  constituency: {
    label: 'Local',
    icon: 'location',
    color: '#6B7280',
    description: 'Visible to your constituency',
  },
  district: {
    label: 'District',
    icon: 'business',
    color: '#8B5CF6',
    description: 'Visible across your district',
  },
  state: {
    label: 'State',
    icon: 'map',
    color: '#4F8EF7',
    description: 'Visible to all state users',
  },
  national: {
    label: 'National',
    icon: 'globe',
    color: '#10B981',
    description: 'Visible to all platform users',
  },
  restricted: {
    label: 'Restricted',
    icon: 'eye-off',
    color: '#EF4444',
    description: 'Hidden from feeds pending review',
  },
};

// ─── Review Status ──────────────────────────────────────────────────────────

export type ReviewStatus =
  | 'open'
  | 'cleared'
  | 'promoted'
  | 'held'
  | 'restricted'
  | 'appealed'
  | 'expired';

export const REVIEW_STATUS_CONFIG: Record<ReviewStatus, {
  label: string;
  color: string;
  icon: string;
}> = {
  open: { label: 'Under Review', color: '#F59E0B', icon: 'time' },
  cleared: { label: 'Cleared', color: '#10B981', icon: 'checkmark-circle' },
  promoted: { label: 'Promoted', color: '#4F8EF7', icon: 'trending-up' },
  held: { label: 'Held for Review', color: '#EF4444', icon: 'pause-circle' },
  restricted: { label: 'Restricted', color: '#EF4444', icon: 'eye-off' },
  appealed: { label: 'Under Appeal', color: '#8B5CF6', icon: 'chatbubble-ellipses' },
  expired: { label: 'Local Only', color: '#6B7280', icon: 'remove-circle' },
};

// ─── Flag Reasons ───────────────────────────────────────────────────────────

export type FlagReason =
  | 'fake_news'
  | 'defamatory'
  | 'communally_sensitive'
  | 'legally_problematic'
  | 'hate_speech'
  | 'spam'
  | 'impersonation'
  | 'copyright'
  | 'explicit_content'
  | 'incitement';

export const FLAG_REASON_CONFIG: Record<FlagReason, {
  label: string;
  description: string;
  icon: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}> = {
  fake_news: {
    label: 'Fake / Misleading',
    description: 'Fabricated or deliberately misleading information',
    icon: 'warning',
    severity: 'high',
  },
  defamatory: {
    label: 'Defamatory',
    description: 'Targets or harms an individual\'s reputation without proof',
    icon: 'person-remove',
    severity: 'high',
  },
  communally_sensitive: {
    label: 'Communally Sensitive',
    description: 'Could incite communal tension or religious hatred',
    icon: 'flame',
    severity: 'critical',
  },
  legally_problematic: {
    label: 'Legally Problematic',
    description: 'Potential violation of IT Act, IPC, or other laws',
    icon: 'shield',
    severity: 'high',
  },
  hate_speech: {
    label: 'Hate Speech',
    description: 'Promotes hatred against a group based on identity',
    icon: 'megaphone',
    severity: 'critical',
  },
  spam: {
    label: 'Spam / Promotional',
    description: 'Irrelevant, promotional, or repetitive content',
    icon: 'mail-unread',
    severity: 'low',
  },
  impersonation: {
    label: 'Impersonation',
    description: 'Pretending to be someone else or a fake identity',
    icon: 'person-circle',
    severity: 'medium',
  },
  copyright: {
    label: 'Copyright Violation',
    description: 'Uses others\' content without permission or attribution',
    icon: 'copy',
    severity: 'medium',
  },
  explicit_content: {
    label: 'Explicit Content',
    description: 'Inappropriate, adult, or graphic content',
    icon: 'eye-off',
    severity: 'medium',
  },
  incitement: {
    label: 'Incitement to Violence',
    description: 'Calls for violence, illegal action, or public disorder',
    icon: 'alert-circle',
    severity: 'critical',
  },
};

// ─── Alert Categories ───────────────────────────────────────────────────────

export type AlertCategory =
  | 'imminent_violence'
  | 'doxxing'
  | 'child_safety'
  | 'election_interference'
  | 'impersonation_official'
  | 'other';

export const ALERT_CATEGORY_CONFIG: Record<AlertCategory, {
  label: string;
  color: string;
}> = {
  imminent_violence: { label: 'Threat of Violence', color: '#EF4444' },
  doxxing: { label: 'Personal Info Exposed', color: '#F59E0B' },
  child_safety: { label: 'Child Safety', color: '#EF4444' },
  election_interference: { label: 'Election Interference', color: '#8B5CF6' },
  impersonation_official: { label: 'Official Impersonation', color: '#F59E0B' },
  other: { label: 'Other Urgent', color: '#6B7280' },
};

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface ContentVisibility {
  id: string;
  contentType: PromotableContentType;
  contentId: string;
  authorId: string;
  constituencyId: string | null;
  stateCode: string | null;
  riskTier: RiskTier;
  visibilityLevel: VisibilityLevel;
  reviewStatus: ReviewStatus;
  vouchCount: number;
  flagCount: number;
  alertCount: number;
  promotionScore: number;
  vouchThreshold: number;
  flagThreshold: number;
  reviewHours: number;
  reviewStartedAt: string;
  reviewExpiresAt: string;
  promotedAt: string | null;
  restrictedAt: string | null;
  clearedAt: string | null;
  createdAt: string;
}

export interface ContentVouch {
  id: string;
  contentVisibilityId: string;
  userId: string;
  weight: number;
  userReputation: number;
  userRole: string | null;
  createdAt: string;
}

export interface ContentFlag {
  id: string;
  contentVisibilityId: string;
  userId: string;
  reason: FlagReason;
  description: string | null;
  evidenceUrl: string | null;
  weight: number;
  userReputation: number;
  resolved: boolean;
  resolvedBy: string | null;
  resolution: 'upheld' | 'dismissed' | 'partial' | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface ContentAlert {
  id: string;
  contentVisibilityId: string;
  userId: string;
  severity: 'medium' | 'high' | 'critical';
  reason: string;
  category: AlertCategory;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  actionTaken: string | null;
  createdAt: string;
}

export interface PromotionDecision {
  id: string;
  contentVisibilityId: string;
  decision: string;
  decidedBy: 'system' | 'constituency_moderator' | 'platform_admin';
  moderatorId: string | null;
  fromLevel: VisibilityLevel | null;
  toLevel: VisibilityLevel | null;
  reason: string | null;
  vouchCountAtDecision: number | null;
  flagCountAtDecision: number | null;
  scoreAtDecision: number | null;
  createdAt: string;
}

export interface ConstituencyModerator {
  id: string;
  userId: string;
  constituencyId: string;
  stateCode: string;
  canResolveFlags: boolean;
  canRestrictContent: boolean;
  canPromoteContent: boolean;
  canIssueWarnings: boolean;
  canBanUsers: boolean;
  flagsResolved: number;
  contentPromoted: number;
  contentRestricted: number;
  warningsIssued: number;
  isActive: boolean;
  appointedAt: string;
}

// ─── Vouch Weight Calculation ───────────────────────────────────────────────

/**
 * Calculate vouch weight based on user role and reputation.
 * Verified journalists and high-rep users carry more weight.
 */
export function calculateVouchWeight(role: string, reputation: number): number {
  let weight = 1.0;

  // Role multiplier
  switch (role) {
    case 'journalist': weight = 2.5; break;
    case 'official': weight = 2.0; break;
    case 'moderator': weight = 3.0; break;
    case 'admin': weight = 5.0; break;
    case 'politician': weight = 1.5; break;
    case 'activist': weight = 1.3; break;
    default: weight = 1.0;
  }

  // Reputation bonus (0.1 per 50 reputation, max 2x bonus)
  const repBonus = Math.min(reputation / 50 * 0.1, 2.0);
  weight += repBonus;

  return Math.round(weight * 10) / 10;
}

/**
 * Calculate flag weight based on flagger's reputation.
 * Higher-rep users' flags carry more weight.
 */
export function calculateFlagWeight(reputation: number): number {
  const base = 1.0;
  const repBonus = Math.min(reputation / 100 * 0.5, 1.5);
  return Math.round((base + repBonus) * 10) / 10;
}

// ─── Author Trust Level → Review Parameters ────────────────────────────────

export interface ReviewParameters {
  reviewHours: number;
  vouchThreshold: number;
  flagThreshold: number;
}

/**
 * Determine review parameters based on author's trust level.
 * Higher trust = shorter review window + lower vouch threshold.
 */
export function getReviewParameters(
  role: string,
  reputation: number,
  isVerified: boolean,
  riskTier: RiskTier,
): ReviewParameters {
  const tierConfig = RISK_TIER_CONFIG[riskTier];
  let reviewHours = tierConfig.defaultReviewHours;
  let vouchThreshold = tierConfig.defaultVouchThreshold;
  const flagThreshold = tierConfig.defaultFlagThreshold;

  // Trust-based adjustments
  if (role === 'admin' || role === 'moderator') {
    return { reviewHours: 0, vouchThreshold: 0, flagThreshold: 10 }; // Instant
  }

  if (role === 'journalist' && isVerified) {
    reviewHours = Math.max(1, Math.floor(reviewHours * 0.25)); // 75% reduction
    vouchThreshold = Math.max(2, Math.floor(vouchThreshold * 0.3));
  } else if (role === 'politician' && isVerified) {
    reviewHours = Math.max(1, Math.floor(reviewHours * 0.3));
    vouchThreshold = Math.max(2, Math.floor(vouchThreshold * 0.4));
  } else if (isVerified) {
    reviewHours = Math.max(2, Math.floor(reviewHours * 0.5));
    vouchThreshold = Math.max(3, Math.floor(vouchThreshold * 0.6));
  } else if (reputation >= 100) {
    reviewHours = Math.max(3, Math.floor(reviewHours * 0.6));
    vouchThreshold = Math.max(4, Math.floor(vouchThreshold * 0.7));
  } else if (reputation >= 50) {
    reviewHours = Math.max(4, Math.floor(reviewHours * 0.8));
    vouchThreshold = Math.max(4, Math.floor(vouchThreshold * 0.8));
  }
  // New users (rep < 50): full default thresholds

  return { reviewHours, vouchThreshold, flagThreshold };
}

// ─── Promotion Logic ────────────────────────────────────────────────────────

export interface PromotionEligibility {
  eligible: boolean;
  reason: string;
  targetLevel: VisibilityLevel | null;
}

/**
 * Check if content is eligible for auto-promotion.
 */
export function checkPromotionEligibility(cv: ContentVisibility): PromotionEligibility {
  // Already promoted or restricted
  if (cv.reviewStatus === 'promoted' || cv.reviewStatus === 'restricted') {
    return { eligible: false, reason: 'Already ' + cv.reviewStatus, targetLevel: null };
  }

  // Held for moderation
  if (cv.reviewStatus === 'held') {
    return { eligible: false, reason: 'Held for moderator review', targetLevel: null };
  }

  // Check if review window has elapsed
  const now = new Date().getTime();
  const expires = new Date(cv.reviewExpiresAt).getTime();
  if (now < expires) {
    return { eligible: false, reason: 'Review window still open', targetLevel: null };
  }

  // Check vouch threshold
  if (cv.vouchCount < cv.vouchThreshold) {
    return { eligible: false, reason: `Need ${cv.vouchThreshold - cv.vouchCount} more vouches`, targetLevel: null };
  }

  // Check flag count
  if (cv.flagCount >= 2) {
    return { eligible: false, reason: 'Too many flags', targetLevel: null };
  }

  // Determine target level based on score
  let targetLevel: VisibilityLevel = 'district';
  if (cv.promotionScore >= 20) targetLevel = 'national';
  else if (cv.promotionScore >= 10) targetLevel = 'state';
  else if (cv.promotionScore >= 5) targetLevel = 'district';

  return {
    eligible: true,
    reason: 'Meets all promotion criteria',
    targetLevel,
  };
}

/**
 * Check if content should be auto-restricted.
 */
export function shouldAutoRestrict(cv: ContentVisibility): boolean {
  return cv.flagCount >= 5 || cv.alertCount > 0;
}
