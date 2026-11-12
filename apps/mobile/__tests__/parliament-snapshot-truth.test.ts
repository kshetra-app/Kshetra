import {
  ALL_MP_PROFILES,
  MP_PROFILES_SNAPSHOT,
  STATE_PARLIAMENTARY_SUMMARIES,
} from '../../../data/seed/mp-profiles';

describe('parliament roster snapshot truth', () => {
  it('reports actual bundled profile coverage without duplicate profile IDs', () => {
    const lokSabhaProfiles = ALL_MP_PROFILES.filter((profile) => profile.house === 'lok_sabha');
    const rajyaSabhaProfiles = ALL_MP_PROFILES.filter((profile) => profile.house === 'rajya_sabha');
    const profileIds = ALL_MP_PROFILES.map((profile) => profile.id);

    expect(new Set(profileIds).size).toBe(profileIds.length);
    expect(lokSabhaProfiles).toHaveLength(543);
    expect(rajyaSabhaProfiles).toHaveLength(243);
    expect(rajyaSabhaProfiles.length).toBeLessThan(MP_PROFILES_SNAPSHOT.rajyaSabhaSeatCount);
    expect(STATE_PARLIAMENTARY_SUMMARIES.IN).toEqual({ ls: 543, rs: 243, total: 786 });
  });
});
