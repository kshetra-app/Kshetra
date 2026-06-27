import {
  ANDHRA_PRADESH_HIERARCHY_CONFIG,
  ANDHRA_PRADESH_DISTRICTS,
  ANDHRA_PRADESH_MANDALS,
  ANDHRA_PRADESH_GRAM_PANCHAYATS,
  ANDHRA_PRADESH_POLLING_BOOTHS,
  ANDHRA_PRADESH_MANDAL_OVERLAPS,
} from '../andhra-pradesh-hierarchy';

describe('Andhra Pradesh Hierarchy Seed Data', () => {
  it('should have valid state configuration', () => {
    expect(ANDHRA_PRADESH_HIERARCHY_CONFIG.stateCode).toBe('AP');
    expect(ANDHRA_PRADESH_HIERARCHY_CONFIG.totalACs).toBe(175);
    expect(ANDHRA_PRADESH_HIERARCHY_CONFIG.lgdStateCode).toBe(28);
  });

  it('should list Srikakulam district', () => {
    expect(ANDHRA_PRADESH_DISTRICTS).toHaveLength(1);
    expect(ANDHRA_PRADESH_DISTRICTS[0].name).toBe('Srikakulam');
    expect(ANDHRA_PRADESH_DISTRICTS[0].lgdCode).toBe(543);
  });

  it('should contain mandals mapped to Srikakulam district', () => {
    expect(ANDHRA_PRADESH_MANDALS.length).toBeGreaterThanOrEqual(5);
    for (const m of ANDHRA_PRADESH_MANDALS) {
      expect(m.districtId).toBe('AP-DST-543');
      expect(m.lgdCode).toBeGreaterThan(54300);
    }
  });

  it('should contain gram panchayats mapped to mandals', () => {
    expect(ANDHRA_PRADESH_GRAM_PANCHAYATS.length).toBeGreaterThanOrEqual(5);
    const mandalIds = new Set(ANDHRA_PRADESH_MANDALS.map(m => m.id));
    for (const gp of ANDHRA_PRADESH_GRAM_PANCHAYATS) {
      expect(mandalIds.has(gp.mandalId)).toBe(true);
      expect(gp.totalVoters).toBeGreaterThan(0);
    }
  });

  it('should contain polling booths mapped to constituencies', () => {
    expect(ANDHRA_PRADESH_POLLING_BOOTHS.length).toBeGreaterThanOrEqual(5);
    const validACs = new Set(['AP-AC-1', 'AP-AC-2', 'AP-AC-3']);
    for (const b of ANDHRA_PRADESH_POLLING_BOOTHS) {
      expect(validACs.has(b.constituencyId)).toBe(true);
      expect(b.totalVoters).toBeGreaterThan(0);
      expect(b.boothNumber).toBeGreaterThan(0);
    }
  });

  it('should contain mandal constituency overlaps summing to 100% when fully contained', () => {
    // Ichchapuram mandal (AP-MDL-54301) should overlap 100% with Ichchapuram AC (AP-AC-1)
    const ichchapuramOverlap = ANDHRA_PRADESH_MANDAL_OVERLAPS.find(
      o => o.mandalId === 'AP-MDL-54301' && o.constituencyId === 'AP-AC-1'
    );
    expect(ichchapuramOverlap).toBeDefined();
    expect(ichchapuramOverlap!.overlapPercentage).toBe(100.00);

    // Mandasa mandal (AP-MDL-54305) overlaps with Palasa AC (60%) and Tekkali AC (40%)
    const mandasaOverlaps = ANDHRA_PRADESH_MANDAL_OVERLAPS.filter(
      o => o.mandalId === 'AP-MDL-54305'
    );
    expect(mandasaOverlaps).toHaveLength(2);
    const totalPercentage = mandasaOverlaps.reduce((sum, o) => sum + o.overlapPercentage, 0);
    expect(totalPercentage).toBe(100.00);
  });
});
