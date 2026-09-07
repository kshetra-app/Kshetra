/**
 * Role & Gating Rules for Page Creation and Live Access (Ticket 0.2)
 *
 * Rules:
 * - Role is what you claim to be; verification_status is whether that's been checked.
 * - Page Creation: Allowed for role IN ('aspirant', 'politician', 'party', 'journalist').
 *   Citizen accounts cannot create a Page.
 *   Unverified aspirant accounts CAN create a Page.
 * - Live Access: Allowed for role IN ('aspirant', 'politician', 'party', 'journalist', 'admin')
 *   AND verification_status === 'verified'.
 *   Unverified aspirant accounts CANNOT access Live.
 *   Gating is NOT tied to payment status (per the frozen monetization decision).
 */

import type { UserRole, UserVerificationStatus } from './moderationTypes';

export const PAGE_ELIGIBLE_ROLES: UserRole[] = [
  'aspirant',
  'politician',
  'party',
  'journalist',
];

export const LIVE_ELIGIBLE_ROLES: UserRole[] = [
  'aspirant',
  'politician',
  'party',
  'journalist',
  'admin',
];

/**
 * Check whether a user is allowed to create a Page.
 * Citizens cannot create a Page; aspirants, politicians, parties, journalists can.
 * Requires verified email if emailVerified check is provided.
 */
export function canCreatePage(role?: UserRole | null, emailVerified?: boolean): boolean {
  if (!role) return false;
  if (emailVerified === false) return false;
  return PAGE_ELIGIBLE_ROLES.includes(role);
}

/**
 * Check whether a user is allowed to broadcast Live.
 * Requires an eligible role, verified status, and verified email.
 */
export function canAccessLive(
  role?: UserRole | null,
  verificationStatus?: UserVerificationStatus | null,
  emailVerified?: boolean,
): { allowed: boolean; reason?: 'ineligible_role' | 'unverified' | 'unverified_email' } {
  if (!role || !LIVE_ELIGIBLE_ROLES.includes(role)) {
    return { allowed: false, reason: 'ineligible_role' };
  }
  if (emailVerified === false) {
    return { allowed: false, reason: 'unverified_email' };
  }
  if (verificationStatus !== 'verified') {
    return { allowed: false, reason: 'unverified' };
  }
  return { allowed: true };
}
