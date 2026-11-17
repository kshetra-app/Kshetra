/**
 * Exact IDs from retired staging seed scripts. These rows remain in existing
 * databases for auditability but must not be exposed as genuine user content.
 */
export const LEGACY_SYNTHETIC_POST_IDS = [
  'b0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000003',
  'b0000000-0000-0000-0000-000000000004',
] as const;

export const LEGACY_SYNTHETIC_CIVIC_ISSUE_IDS = [
  'e0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000002',
] as const;
