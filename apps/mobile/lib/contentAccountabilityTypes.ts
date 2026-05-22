/**
 * Content Creator Accountability (CCA) Types
 *
 * Two-tier system to hold content creators accountable:
 *   Tier 1: KYC — One-time identity + device capture before first content action
 *   Tier 2: Action Fingerprint — Per-action device/network/location stamp
 *
 * Passive consumers (read-only users) are unaffected.
 * Any write action (post, comment, vote, report, etc.) requires KYC completion.
 *
 * Mirrors: supabase/migrations/013_content_accountability.sql
 */

// ─── KYC Status ─────────────────────────────────────────────────────────────

export type KYCStatus = 'pending' | 'verified' | 'rejected' | 'suspended' | 'revoked';

export const KYC_STATUS_CONFIG: Record<KYCStatus, { label: string; color: string; icon: string; canPost: boolean }> = {
  pending: { label: 'Verification Pending', color: '#F59E0B', icon: 'time', canPost: false },
  verified: { label: 'Verified Contributor', color: '#10B981', icon: 'shield-checkmark', canPost: true },
  rejected: { label: 'Verification Rejected', color: '#EF4444', icon: 'close-circle', canPost: false },
  suspended: { label: 'Contributor Suspended', color: '#EF4444', icon: 'ban', canPost: false },
  revoked: { label: 'Verification Revoked', color: '#6B7280', icon: 'remove-circle', canPost: false },
};

// ─── Content Action Types ───────────────────────────────────────────────────

export type ContentActionType =
  | 'create_post'
  | 'edit_post'
  | 'delete_post'
  | 'create_comment'
  | 'edit_comment'
  | 'vote_poll'
  | 'report_issue'
  | 'update_issue'
  | 'add_evidence'
  | 'tag_mla'
  | 'dispute_resolution'
  | 'submit_promise_evidence'
  | 'follow_issue'
  | 'upvote_issue'
  | 'react_post'
  | 'share_content'
  | 'submit_report'
  | 'create_challenge'
  | 'endorse_aspirant'
  | 'other';

export const GATED_ACTIONS: ContentActionType[] = [
  'create_post',
  'edit_post',
  'create_comment',
  'edit_comment',
  'vote_poll',
  'report_issue',
  'update_issue',
  'add_evidence',
  'tag_mla',
  'dispute_resolution',
  'submit_promise_evidence',
  'follow_issue',
  'upvote_issue',
  'react_post',
  'submit_report',
  'create_challenge',
  'endorse_aspirant',
];

export const ACTION_TYPE_CONFIG: Record<ContentActionType, { label: string; severity: 'low' | 'medium' | 'high' }> = {
  create_post: { label: 'Create Post', severity: 'high' },
  edit_post: { label: 'Edit Post', severity: 'medium' },
  delete_post: { label: 'Delete Post', severity: 'medium' },
  create_comment: { label: 'Comment', severity: 'high' },
  edit_comment: { label: 'Edit Comment', severity: 'medium' },
  vote_poll: { label: 'Vote on Poll', severity: 'low' },
  report_issue: { label: 'Report Issue', severity: 'high' },
  update_issue: { label: 'Update Issue', severity: 'medium' },
  add_evidence: { label: 'Add Evidence', severity: 'high' },
  tag_mla: { label: 'Tag MLA', severity: 'high' },
  dispute_resolution: { label: 'Dispute Resolution', severity: 'high' },
  submit_promise_evidence: { label: 'Submit Promise Evidence', severity: 'high' },
  follow_issue: { label: 'Follow Issue', severity: 'low' },
  upvote_issue: { label: 'Upvote Issue', severity: 'low' },
  react_post: { label: 'React to Post', severity: 'low' },
  share_content: { label: 'Share Content', severity: 'low' },
  submit_report: { label: 'Report Content', severity: 'medium' },
  create_challenge: { label: 'Create Challenge', severity: 'high' },
  endorse_aspirant: { label: 'Endorse Aspirant', severity: 'medium' },
  other: { label: 'Other Action', severity: 'low' },
};

// ─── Device Fingerprint ─────────────────────────────────────────────────────

export interface DeviceFingerprint {
  brand: string | null;            // "Samsung", "Xiaomi", "Apple"
  model: string | null;            // "Galaxy S24", "iPhone 15 Pro"
  os: string;                      // "Android" | "iOS"
  osVersion: string;               // "14", "17.4"
  deviceUniqueId: string | null;   // androidId or identifierForVendor
  deviceName: string | null;       // User-set device name
  totalMemoryMb: number | null;    // Total RAM in MB
}

export interface NetworkFingerprint {
  publicIp: string | null;         // Public IP via API call
  localIp: string | null;          // Local network IP
  networkType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  carrierName: string | null;      // "Jio", "Airtel", "Vi"
  wifiSsid: string | null;        // WiFi network name (requires permission)
  isConnected: boolean;
}

export interface LocationFingerprint {
  latitude: number;
  longitude: number;
  accuracy: number;                // metres
  altitude: number | null;
  address: string | null;          // Reverse-geocoded (optional)
  capturedAt: string;              // ISO timestamp
}

export interface AppFingerprint {
  version: string;                 // App version e.g. "0.1.0"
  build: string | null;            // Build number
  bundleId: string | null;         // Application ID
  sessionId: string;               // Random UUID per app session
}

// ─── Combined Forensic Snapshot ─────────────────────────────────────────────

export interface ForensicSnapshot {
  device: DeviceFingerprint;
  network: NetworkFingerprint;
  location: LocationFingerprint | null;   // null if location permission denied
  app: AppFingerprint;
  capturedAt: string;              // ISO timestamp
}

// ─── KYC Record ─────────────────────────────────────────────────────────────

export interface CreatorKYCRecord {
  id: string;
  userId: string;

  // Personal identity
  fullLegalName: string;
  phoneNumber: string;
  phoneVerified: boolean;
  selfieUrl: string | null;
  selfieHash: string | null;

  // Device at KYC time
  device: DeviceFingerprint;

  // Network at KYC time
  ipAddress: string | null;
  networkType: string | null;
  carrierName: string | null;

  // Location at KYC time
  latitude: number | null;
  longitude: number | null;
  locationAccuracy: number | null;
  locationAddress: string | null;

  // App info
  appVersion: string | null;
  appBuild: string | null;

  // Status
  status: KYCStatus;
  verifiedAt: string | null;
  rejectionReason: string | null;
  termsAcceptedAt: string;
  termsVersion: string;

  createdAt: string;
  updatedAt: string;
}

// ─── Contributor Device ─────────────────────────────────────────────────────

export interface ContributorDevice {
  id: string;
  userId: string;
  deviceBrand: string | null;
  deviceModel: string | null;
  deviceOs: string | null;
  deviceOsVersion: string | null;
  deviceUniqueId: string;
  deviceName: string | null;
  deviceMemoryMb: number | null;
  firstSeenAt: string;
  lastSeenAt: string;
  actionCount: number;
  isTrusted: boolean;
}

// ─── Action Fingerprint ─────────────────────────────────────────────────────

export interface ActionFingerprint {
  id: string;
  userId: string;
  kycId: string | null;

  actionType: ContentActionType;
  contentType: string | null;
  contentId: string | null;
  contentHash: string | null;

  // Device
  device: DeviceFingerprint;

  // Network
  ipAddress: string | null;
  localIp: string | null;
  networkType: string | null;
  carrierName: string | null;
  wifiSsid: string | null;

  // Location
  latitude: number | null;
  longitude: number | null;
  locationAccuracy: number | null;

  // Session
  appVersion: string | null;
  appBuild: string | null;
  sessionId: string | null;
  screenName: string | null;

  actionAt: string;
}

// ─── KYC Submission (what the user fills in) ────────────────────────────────

export interface KYCSubmission {
  fullLegalName: string;
  phoneNumber: string;
  selfieUri: string | null;        // Local file URI from camera
  termsAccepted: boolean;
}

// ─── Validation Utilities ───────────────────────────────────────────────────

export function isValidIndianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\+]/g, '');
  return /^(91)?[6-9]\d{9}$/.test(cleaned);
}

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\+]/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned;
  }
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    return '91' + cleaned;
  }
  return cleaned;
}

export function isKYCComplete(kyc: CreatorKYCRecord | null): boolean {
  if (!kyc) return false;
  return kyc.status === 'verified';
}

export function canPerformAction(kyc: CreatorKYCRecord | null, action: ContentActionType): boolean {
  if (!GATED_ACTIONS.includes(action)) return true;
  if (!kyc) return false;
  return kyc.status === 'verified';
}

export function getKYCCompleteness(kyc: KYCSubmission): {
  percent: number;
  missing: string[];
} {
  const missing: string[] = [];
  if (!kyc.fullLegalName.trim()) missing.push('Full legal name');
  if (!isValidIndianPhone(kyc.phoneNumber)) missing.push('Valid phone number');
  if (!kyc.selfieUri) missing.push('Selfie photo');
  if (!kyc.termsAccepted) missing.push('Terms acceptance');

  const total = 4;
  const filled = total - missing.length;
  return { percent: Math.round((filled / total) * 100), missing };
}

/**
 * Generate a simple hash of content for tamper detection.
 * Uses a basic string hash since crypto.subtle is not available in RN.
 * In production, use a proper SHA-256 via expo-crypto.
 */
export function simpleContentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Check if an action is "high severity" — these get extra scrutiny in logs.
 */
export function isHighSeverityAction(action: ContentActionType): boolean {
  return ACTION_TYPE_CONFIG[action]?.severity === 'high';
}
