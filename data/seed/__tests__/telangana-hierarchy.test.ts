import {
  TELANGANA_HIERARCHY_CONFIG,
  TELANGANA_DISTRICTS,
  TELANGANA_MANDALS,
  TELANGANA_SEED_SUMMARY,
} from '../telangana-hierarchy';

describe('Telangana Hierarchy Seed Data', () => {
  it('should have valid state configuration', () => {
    expect(TELANGANA_HIERARCHY_CONFIG.stateCode).toBe('TS');
    expect(TELANGANA_HIERARCHY_CONFIG.totalACs).toBe(119);
    expect(TELANGANA_HIERARCHY_CONFIG.lgdStateCode).toBe(36);
  });

  it('should list Kumuram Bheem Asifabad and Mancherial districts', () => {
    expect(TELANGANA_DISTRICTS).toHaveLength(2);
    expect(TELANGANA_DISTRICTS.map(d => d.name)).toEqual(
      expect.arrayContaining(['Kumuram Bheem Asifabad', 'Mancherial'])
    );
  });

  it('should contain mandals mapped to these districts', () => {
    expect(TELANGANA_MANDALS.length).toBeGreaterThanOrEqual(10);
    const validDistrictIds = new Set(TELANGANA_DISTRICTS.map(d => d.id));
    for (const m of TELANGANA_MANDALS) {
      expect(validDistrictIds.has(m.districtId)).toBe(true);
      expect(m.lgdCode).toBeGreaterThan(0);
    }
  });

  it('should match summary count targets', () => {
    expect(TELANGANA_SEED_SUMMARY.version).toBe('0.1.0-seed');
    expect(TELANGANA_SEED_SUMMARY.scope.acsIncluded).toEqual(
      expect.arrayContaining([1, 2, 3, 4, 5])
    );
  });
});
