/**
 * Trust & Safety types for the mobile app.
 * Mirrors the Supabase schema from 006_trust_safety.sql.
 */

export type UserRole = 'citizen' | 'journalist' | 'activist' | 'politician' | 'official' | 'aspirant' | 'moderator' | 'admin';

export type VerificationType = 'identity' | 'journalist' | 'politician' | 'government_official' | 'organization';

export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'revoked';

export type ModerationActionType =
  | 'warn' | 'mute' | 'suspend' | 'ban' | 'unsuspend'
  | 'delete_content' | 'hide_content' | 'restore_content'
  | 'verify_user' | 'revoke_verification'
  | 'escalate' | 'dismiss';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'misinformation'
  | 'hate_speech'
  | 'violence'
  | 'impersonation'
  | 'other';

export interface UserProfile {
  userId: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  constituencyId?: string;
  stateCode?: string;
  role: UserRole;
  reputationScore: number;
  postCount: number;
  isSuspended: boolean;
  suspendedUntil?: string;
  createdAt: string;
}

export interface ReportSubmission {
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  reason: ReportReason;
  description?: string;
}

export const REPORT_REASONS: { key: ReportReason; label: string; icon: string }[] = [
  { key: 'spam', label: 'Spam', icon: 'megaphone' },
  { key: 'harassment', label: 'Harassment', icon: 'hand-left' },
  { key: 'misinformation', label: 'Misinformation', icon: 'alert-circle' },
  { key: 'hate_speech', label: 'Hate Speech', icon: 'flame' },
  { key: 'violence', label: 'Violence / Threats', icon: 'skull' },
  { key: 'impersonation', label: 'Impersonation', icon: 'person-circle' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

export const ROLE_CONFIG: Record<UserRole, { label: string; color: string; icon: string; badge: boolean }> = {
  citizen: { label: 'Citizen', color: '#6B7280', icon: 'person', badge: false },
  journalist: { label: 'Journalist', color: '#3B82F6', icon: 'newspaper', badge: true },
  activist: { label: 'Activist', color: '#10B981', icon: 'megaphone', badge: true },
  politician: { label: 'Politician', color: '#F59E0B', icon: 'flag', badge: true },
  official: { label: 'Official', color: '#8B5CF6', icon: 'shield-checkmark', badge: true },
  aspirant: { label: 'Aspirant', color: '#06B6D4', icon: 'rocket', badge: true },
  moderator: { label: 'Moderator', color: '#EC4899', icon: 'hammer', badge: true },
  admin: { label: 'Admin', color: '#EF4444', icon: 'key', badge: true },
};

export const VERIFICATION_TYPE_CONFIG: Record<VerificationType, { label: string; description: string }> = {
  identity: { label: 'Identity', description: 'Verify your real identity with government ID' },
  journalist: { label: 'Journalist', description: 'Verify press credentials or media affiliation' },
  politician: { label: 'Politician', description: 'Verify elected/party representative status' },
  government_official: { label: 'Government Official', description: 'Verify government role with department ID' },
  organization: { label: 'Organization', description: 'Verify NGO, party, or media organization' },
};
