import {
  isLegacySyntheticPostId,
  LEGACY_SYNTHETIC_POST_IDS,
  LEGACY_SYNTHETIC_POSTS_FILTER,
} from '../lib/legacySyntheticPosts';

describe('legacy synthetic feed post suppression', () => {
  it('identifies only the four posts inserted by the retired staging seed script', () => {
    expect(LEGACY_SYNTHETIC_POST_IDS).toHaveLength(4);
    for (const id of LEGACY_SYNTHETIC_POST_IDS) {
      expect(isLegacySyntheticPostId(id)).toBe(true);
    }
    expect(isLegacySyntheticPostId('a0000000-0000-0000-0000-000000000001')).toBe(false);
  });

  it('builds the PostgREST exclusion list from the same canonical ID list', () => {
    expect(LEGACY_SYNTHETIC_POSTS_FILTER).toBe(`(${LEGACY_SYNTHETIC_POST_IDS.join(',')})`);
  });
});
