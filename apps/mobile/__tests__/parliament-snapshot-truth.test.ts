import {
  ALL_MP_PROFILES,
  MP_PROFILES_SNAPSHOT,
  STATE_PARLIAMENTARY_SUMMARIES,
  getMPsByState,
} from '../../../data/seed/mp-profiles';

describe('parliament roster snapshot truth', () => {
  it('reports actual bundled profile coverage without duplicate profile IDs', () => {
    const lokSabhaProfiles = ALL_MP_PROFILES.filter((profile) => profile.house === 'lok_sabha');
    const rajyaSabhaProfiles = ALL_MP_PROFILES.filter((profile) => profile.house === 'rajya_sabha');
    const profileIds = ALL_MP_PROFILES.map((profile) => profile.id);

    expect(new Set(profileIds).size).toBe(profileIds.length);
    expect(lokSabhaProfiles).toHaveLength(540);
    expect(rajyaSabhaProfiles).toHaveLength(243);
    expect(rajyaSabhaProfiles.length).toBeLessThan(MP_PROFILES_SNAPSHOT.rajyaSabhaSeatCount);
    expect(STATE_PARLIAMENTARY_SUMMARIES.IN).toEqual({ ls: 540, rs: 243, total: 783 });
    expect(getMPsByState('IN')).toHaveLength(783);
    expect(ALL_MP_PROFILES.every((profile) => profile.photoUrl?.startsWith('https://sansad.in/getFile/'))).toBe(true);
    expect(lokSabhaProfiles.every((profile) => profile.affidavitUrl?.includes('candidate_id='))).toBe(true);
    expect(ALL_MP_PROFILES.filter((profile) => !profile.affidavitUrl).every((profile) =>
      profile.criminalCases === undefined && profile.totalAssets === undefined && profile.totalLiabilities === undefined,
    )).toBe(true);
  });

  it('links AP and Telangana members to their own filings', () => {
    for (const state of ['AP', 'TS']) {
      const members = getMPsByState(state);
      expect(members.length).toBeGreaterThan(0);
      expect(members.every((member) => member.affidavitUrl)).toBe(true);
      expect(new Set(members.map((member) => member.affidavitUrl)).size).toBe(members.length);
    }
  });
});
