/**
 * Moderation & Trust Safety Service
 *
 * Handles content moderation actions, user verification,
 * reputation scoring, and audit logging.
 */

export type UserRole = 'citizen' | 'journalist' | 'activist' | 'politician' | 'official' | 'moderator' | 'admin';

export type ModerationAction =
  | 'warn'
  | 'mute'
  | 'suspend'
  | 'ban'
  | 'unsuspend'
  | 'delete_content'
  | 'hide_content'
  | 'restore_content'
  | 'verify_user'
  | 'revoke_verification'
  | 'escalate'
  | 'dismiss';

export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'revoked';

export type VerificationType = 'identity' | 'journalist' | 'politician' | 'government_official' | 'organization';

export interface ModerationActionPayload {
  moderatorId: string;
  targetUserId?: string;
  targetPostId?: string;
  targetCommentId?: string;
  reportId?: string;
  actionType: ModerationAction;
  reason: string;
  durationHours?: number;
}

export interface AuditLogEntry {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

/**
 * Reputation scoring rules:
 * - Post: +2
 * - Reply: +1
 * - Upvoted issue: +3
 * - Verified account: +50
 * - Warning: -10
 * - Suspension: -25
 * - Report upheld against user: -15
 * - Report dismissed (reporter): -5 (for spam reporting)
 */
export const REPUTATION_RULES: Record<string, number> = {
  post_created: 2,
  reply_created: 1,
  issue_upvoted: 3,
  account_verified: 50,
  received_warning: -10,
  received_suspension: -25,
  report_upheld: -15,
  spam_report_dismissed: -5,
  helpful_report: 5,
  poll_created: 3,
};

/**
 * Check if a user has moderation privileges.
 */
export function canModerate(role: UserRole): boolean {
  return role === 'moderator' || role === 'admin';
}

/**
 * Check if a user can perform a specific moderation action.
 */
export function canPerformAction(role: UserRole, action: ModerationAction): boolean {
  if (role === 'admin') return true;
  if (role !== 'moderator') return false;

  // Moderators can't ban, verify, or revoke verification
  const adminOnly: ModerationAction[] = ['ban', 'verify_user', 'revoke_verification'];
  return !adminOnly.includes(action);
}

/**
 * Content filtering: basic keyword-based check.
 * In production, this would use ML-based classification.
 */
const FLAGGED_PATTERNS = [
  /\b(kill|murder|assault|bomb|attack)\b/i,
  /\b(hate|slur)\b/i,
];

export function flagContent(text: string): { flagged: boolean; reasons: string[] } {
  const reasons: string[] = [];

  for (const pattern of FLAGGED_PATTERNS) {
    if (pattern.test(text)) {
      reasons.push(`Matched pattern: ${pattern.source}`);
    }
  }

  // Check for excessive caps (potential shouting/spam)
  const capsRatio = (text.match(/[A-Z]/g)?.length ?? 0) / Math.max(text.length, 1);
  if (capsRatio > 0.7 && text.length > 20) {
    reasons.push('Excessive capitalization');
  }

  // Check for repeated characters (spam indicator)
  if (/(.)\1{9,}/.test(text)) {
    reasons.push('Repeated characters (potential spam)');
  }

  return { flagged: reasons.length > 0, reasons };
}

/**
 * Moderation action config for the admin UI.
 */
export const ACTION_CONFIG: Record<ModerationAction, {
  label: string;
  description: string;
  icon: string;
  color: string;
  requiresReason: boolean;
  requiresDuration: boolean;
}> = {
  warn: {
    label: 'Warn',
    description: 'Send a warning to the user',
    icon: 'warning',
    color: '#F59E0B',
    requiresReason: true,
    requiresDuration: false,
  },
  mute: {
    label: 'Mute',
    description: 'Temporarily prevent the user from posting',
    icon: 'volume-mute',
    color: '#F97316',
    requiresReason: true,
    requiresDuration: true,
  },
  suspend: {
    label: 'Suspend',
    description: 'Suspend the user account',
    icon: 'pause-circle',
    color: '#EF4444',
    requiresReason: true,
    requiresDuration: true,
  },
  ban: {
    label: 'Ban',
    description: 'Permanently ban the user (admin only)',
    icon: 'ban',
    color: '#DC2626',
    requiresReason: true,
    requiresDuration: false,
  },
  unsuspend: {
    label: 'Unsuspend',
    description: 'Restore a suspended account',
    icon: 'play-circle',
    color: '#10B981',
    requiresReason: true,
    requiresDuration: false,
  },
  delete_content: {
    label: 'Delete',
    description: 'Permanently delete the content',
    icon: 'trash',
    color: '#EF4444',
    requiresReason: true,
    requiresDuration: false,
  },
  hide_content: {
    label: 'Hide',
    description: 'Hide content from public view',
    icon: 'eye-off',
    color: '#F59E0B',
    requiresReason: true,
    requiresDuration: false,
  },
  restore_content: {
    label: 'Restore',
    description: 'Restore hidden or deleted content',
    icon: 'refresh',
    color: '#10B981',
    requiresReason: true,
    requiresDuration: false,
  },
  verify_user: {
    label: 'Verify',
    description: 'Mark user as verified (admin only)',
    icon: 'checkmark-circle',
    color: '#4F8EF7',
    requiresReason: true,
    requiresDuration: false,
  },
  revoke_verification: {
    label: 'Revoke Verification',
    description: 'Remove verified status (admin only)',
    icon: 'close-circle',
    color: '#EF4444',
    requiresReason: true,
    requiresDuration: false,
  },
  escalate: {
    label: 'Escalate',
    description: 'Escalate to admin for review',
    icon: 'arrow-up-circle',
    color: '#8B5CF6',
    requiresReason: true,
    requiresDuration: false,
  },
  dismiss: {
    label: 'Dismiss',
    description: 'Dismiss the report with no action',
    icon: 'close',
    color: '#6B7280',
    requiresReason: true,
    requiresDuration: false,
  },
};
