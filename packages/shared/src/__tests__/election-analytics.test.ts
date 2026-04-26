import {
  computeElectionAnalytics,
  type ConstituencyRecord,
} from '../analytics/election-analytics';

/**
 * Inline test fixtures — avoids importing from data/seed which is
 * outside @kshetra/shared rootDir and breaks tsc build.
 */
const MOCK_RECORDS: ConstituencyRecord[] = [
  { acNo: 1, name: 'Sirpur', district: 'Adilabad', type: 'GEN', winner: 'INC', winnerVotes: 82415, runnerUp: 'BRS', margin: 15234 },
  { acNo: 2, name: 'Chennur', district: 'Adilabad', type: 'SC', winner: 'INC', winnerVotes: 89764, runnerUp: 'BRS', margin: 21456 },
  { acNo: 3, name: 'Bellampalle', district: 'Adilabad', type: 'SC', winner: 'INC', winnerVotes: 78543, runnerUp: 'BRS', margin: 12345 },
  { acNo: 4, name: 'Mancherial', district: 'Adilabad', type: 'GEN', winner: 'BRS', winnerVotes: 92345, runnerUp: 'INC', margin: 8765 },
  { acNo: 5, name: 'Adilabad', district: 'Adilabad', type: 'ST', winner: 'INC', winnerVotes: 75432, runnerUp: 'BRS', margin: 18765 },
  { acNo: 6, name: 'Hyderabad Central', district: 'Hyderabad', type: 'GEN', winner: 'AIMIM', winnerVotes: 95000, runnerUp: 'INC', margin: 40000 },
  { acNo: 7, name: 'Hyderabad South', district: 'Hyderabad', type: 'GEN', winner: 'AIMIM', winnerVotes: 91000, runnerUp: 'INC', margin: 35000 },
  { acNo: 8, name: 'Warangal', district: 'Warangal', type: 'GEN', winner: 'BRS', winnerVotes: 88000, runnerUp: 'INC', margin: 5000 },
  { acNo: 9, name: 'Nalgonda', district: 'Nalgonda', type: 'GEN', winner: 'INC', winnerVotes: 79000, runnerUp: 'BRS', margin: 22000 },
  { acNo: 10, name: 'Goshamahal', district: 'Hyderabad', type: 'GEN', winner: 'BJP', winnerVotes: 98000, runnerUp: 'INC', margin: 18000 },
];

describe('computeElectionAnalytics', () => {
  const analytics = computeElectionAnalytics(MOCK_RECORDS);

  it('should report 10 total constituencies', () => {
    expect(analytics.totalConstituencies).toBe(10);
  });

  it('should have at least 1 district', () => {
    expect(analytics.totalDistricts).toBeGreaterThan(0);
  });

  it('should have INC as the dominant party with 5 seats', () => {
    const inc = analytics.partySummary.find((p) => p.party === 'INC');
    expect(inc).toBeDefined();
    expect(inc!.seats).toBe(5);
    expect(inc!.percentage).toBe(50);
  });

  it('should have AIMIM with exactly 2 seats', () => {
    const aimim = analytics.partySummary.find((p) => p.party === 'AIMIM');
    expect(aimim).toBeDefined();
    expect(aimim!.seats).toBe(2);
  });

  it('should sort partySummary by seats descending', () => {
    for (let i = 1; i < analytics.partySummary.length; i++) {
      expect(analytics.partySummary[i - 1].seats).toBeGreaterThanOrEqual(
        analytics.partySummary[i].seats,
      );
    }
  });

  it('should sum reservation counts to 10', () => {
    const { GEN, SC, ST } = analytics.reservationCounts;
    expect(GEN + SC + ST).toBe(10);
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
