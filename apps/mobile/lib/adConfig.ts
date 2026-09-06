/**
 * Configuration and exclusion logic for Lane 1 Commercial Ads.
 */

export const AD_INSERT_INTERVAL = 7;

/**
 * Screens where commercial ads must NEVER render under any circumstance:
 * 1. Civic-issue reporting screens
 * 2. Delimitation tracker
 * 3. Moderation queue
 */
export const AD_EXCLUDED_SCREENS = [
  'report-issue',
  'report_issue',
  'reportissuesheet',
  'issue',
  'delimitation',
  'moderation',
  'moderation-queue',
  '/report-issue',
  '/delimitation',
  '/moderation',
  '/live/moderation-queue',
] as const;

export function isAdExcludedScreen(screenName?: string): boolean {
  if (!screenName) return false;
  const normalized = screenName.toLowerCase().trim();
  return AD_EXCLUDED_SCREENS.some(
    (excluded) => normalized === excluded || normalized.includes(excluded),
  );
}

/**
 * Commercial Ad Network Configuration State.
 * As per Phase 4 instructions: network wiring is excluded in this round.
 * No SDK is integrated, no credentials mocked.
 */
export const IS_AD_NETWORK_CONFIGURED = false;
