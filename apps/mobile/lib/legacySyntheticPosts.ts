import { LEGACY_SYNTHETIC_POST_IDS } from '@kshetra/shared';

export { LEGACY_SYNTHETIC_POST_IDS };

/** PostgREST list syntax used by the Supabase `.not('id', 'in', ...)` filter. */
export const LEGACY_SYNTHETIC_POSTS_FILTER = `(${LEGACY_SYNTHETIC_POST_IDS.join(',')})`;

const legacySyntheticPostIds = new Set<string>(LEGACY_SYNTHETIC_POST_IDS);

export function isLegacySyntheticPostId(id: string): boolean {
  return legacySyntheticPostIds.has(id);
}
