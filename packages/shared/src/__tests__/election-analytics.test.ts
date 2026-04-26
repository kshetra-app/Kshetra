import {
  computeElectionAnalytics,
  type ConstituencyRecord,
} from '../analytics/election-analytics';
import {
  TELANGANA_CONSTITUENCIES,
} from '../../../../data/seed/telangana-constituencies';

/** Map seed data to the generic ConstituencyRecord interface */
function seedToRecord(c: typeof TELANGANA_CONSTITUENCIES[0]): ConstituencyRecord {
  return {
    acNo: c.acNo,
    name: c.name,
    district: c.district,
    type: c.type,
    winner: c.winner2023,
    winnerVotes: c.winnerVotes2023,
    runnerUp: c.runnerUp2023,
    margin: c.margin2023,
  };
}

describe('computeElectionAnalytics', () => {
  const records = TELANGANA_CONSTITUENCIES.map(seedToRecord);
  const analytics = computeElectionAnalytics(records);

  it('should report 119 total constituencies', () => {
    expect(analytics.totalConstituencies).toBe(119);
  });

  it('should have at least 1 district', () => {
    expect(analytics.totalDistricts).toBeGreaterThan(0);
  });

  it('should have INC as the dominant party with >50 seats', () => {
    const inc = analytics.partySummary.find((p) => p.party === 'INC');
    expect(inc).toBeDefined();
    expect(inc!.seats).toBeGreaterThan(50);
    expect(inc!.percentage).toBeGreaterThan(40);
  });

  it('should have AIMIM with exactly 7 seats', () => {
    const aimim = analytics.partySummary.find((p) => p.party === 'AIMIM');
    expect(aimim).toBeDefined();
    expect(aimim!.seats).toBe(7);
  });

  it('should sort partySummary by seats descending', () => {
    for (let i = 1; i < analytics.partySummary.length; i++) {
      expect(analytics.partySummary[i - 1].seats).toBeGreaterThanOrEqual(
        analytics.partySummary[i].seats,
      );
    }
  });

  it('should sum reservation counts to 119', () => {
    const { GEN, SC, ST } = analytics.reservationCounts;
    expect(GEN + SC + ST).toBe(119);
  });

  it('should have valid reservation counts (no negatives)', () => {
    expect(analytics.reservationCounts.GEN).toBeGreaterThan(0);
    expect(analytics.reservationCounts.SC).toBeGreaterThan(0);
    expect(analytics.reservationCounts.ST).toBeGreaterThan(0);
  });

  it('should have biggest margin > closest margin', () => {
    expect(analytics.margins.biggest.margin).toBeGreaterThan(
      analytics.margins.closest.margin,
    );
  });

  it('should have non-empty constituency names in margins', () => {
    expect(analytics.margins.closest.constituency.length).toBeGreaterThan(0);
    expect(analytics.margins.biggest.constituency.length).toBeGreaterThan(0);
  });

  it('districts should be sorted by totalSeats descending', () => {
    for (let i = 1; i < analytics.districts.length; i++) {
      expect(analytics.districts[i - 1].totalSeats).toBeGreaterThanOrEqual(
        analytics.districts[i].totalSeats,
      );
    }
  });

  it('each district should have a dominantParty and non-empty parties', () => {
    for (const d of analytics.districts) {
      expect(d.name.length).toBeGreaterThan(0);
      expect(d.dominantParty.length).toBeGreaterThan(0);
      expect(Object.keys(d.parties).length).toBeGreaterThan(0);
    }
  });

  it('percentages should sum close to 100', () => {
    const total = analytics.partySummary.reduce((s, p) => s + p.percentage, 0);
    expect(total).toBeCloseTo(100, 0);
  });

  it('should handle empty input gracefully', () => {
    const empty = computeElectionAnalytics([]);
    expect(empty.totalConstituencies).toBe(0);
    expect(empty.totalDistricts).toBe(0);
    expect(empty.partySummary).toHaveLength(0);
    expect(empty.districts).toHaveLength(0);
    expect(empty.reservationCounts).toEqual({ GEN: 0, SC: 0, ST: 0 });
  });
});
