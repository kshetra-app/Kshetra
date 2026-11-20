import { getSnapshotVoteShares } from '../lib/snapshotVoteShares';

describe('constituency snapshot vote shares', () => {
  const sirpurVotes = [63702, 60614, 44646];
  const reportedShares = [34.09, 32.43, 23.89];

  it('uses the ECI total for Sirpur and accounts for the remaining votes', () => {
    const result = getSnapshotVoteShares(186880, sirpurVotes, reportedShares);
    expect(result.total).toBe(186880);
    expect(result.shares.map((share) => share?.toFixed(2))).toEqual(['34.09', '32.43', '23.89']);
    expect(result.others).toBeCloseTo(9.59, 2);
  });

  it('rejects the old total and keeps independently reported shares', () => {
    expect(getSnapshotVoteShares(136751, sirpurVotes, reportedShares)).toEqual({
      total: null,
      shares: reportedShares,
      others: null,
    });
  });

  it('rejects a denominator and share set that cannot describe one contest', () => {
    expect(getSnapshotVoteShares(136751, sirpurVotes, [46.6, 44.3, 32.6])).toEqual({
      total: null,
      shares: [null, null, null],
      others: null,
    });
  });

  it('handles the two-candidate Indira Nagar contest without a third share', () => {
    expect(getSnapshotVoteShares(24693, [20685, 4008, null], [83.77, 16.23, null])).toMatchObject({
      total: 24693,
      shares: [expect.any(Number), expect.any(Number), null],
      others: 0,
    });
  });
});
