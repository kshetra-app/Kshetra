import {
  ALL_MP_PROFILES,
  MP_PROFILES_SNAPSHOT,
  STATE_PARLIAMENTARY_SUMMARIES,
} from '../../../data/seed/mp-profiles';

describe('parliament roster snapshot truth', () => {
  it('reports the compiled snapshot date and actual profile coverage', () => {
    const lokSabhaProfiles = ALL_MP_PROFILES.filter((profile) => profile.house === 'lok_sabha');
    const rajyaSabhaProfiles = ALL_MP_PROFILES.filter((profile) => profile.house === 'rajya_sabha');

    expect(MP_PROFILES_SNAPSHOT.generatedAt).toBe('2026-06-21');
    expect(MP_PROFILES_SNAPSHOT.latestRowVerificationDate).toBe('2026-11-02');
    expect(lokSabhaProfiles).toHaveLength(543);
    expect(rajyaSabhaProfiles).toHaveLength(243);
    expect(rajyaSabhaProfiles.length).toBeLessThan(MP_PROFILES_SNAPSHOT.rajyaSabhaSeatCount);
    expect(STATE_PARLIAMENTARY_SUMMARIES.IN).toEqual({ ls: 543, rs: 243, total: 786 });
  });
});
