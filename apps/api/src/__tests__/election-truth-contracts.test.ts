import { getConstituencyElectionData, getRawConstituency, getConstituency } from '../services/stateData';

describe('Election Truth Service & Contract Behavior (CTO Directive 087)', () => {
  describe('getConstituencyElectionData behavior invariants on real seed data', () => {
    it('preserves electionType = null when raw record omits electionType (no GENERAL guessing)', () => {
      // Sirpur (TS AC 1) has 2023 winner/margin but no electionType in seed
      const data = getConstituencyElectionData('TS', 1);

      expect(data).not.toBeNull();
      expect(data!.recentElection.electionYear).toBe(2023);
      expect(data!.recentElection.electionType).toBeNull();
      expect(data!.recentElection.winner).toBe('BJP');
      expect(typeof data!.recentElection.winnerVotes).toBe('number');
      expect(typeof data!.recentElection.margin).toBe('number');
    });

    it('strictly binds winner, runner-up, votes, and margin to the same election term', () => {
      // Gajwel (TS AC 42)
      const data = getConstituencyElectionData('TS', 42);

      expect(data).not.toBeNull();
      expect(data!.recentElection.electionYear).toBe(2023);
      expect(data!.recentElection.winner).toBe('BRS');
      expect(data!.recentElection.winnerName).toBe('K. Chandrashekar Rao');
      expect(data!.recentElection.runnerUp).toBe('BJP');
      expect(data!.recentElection.winnerVotes).toBe(118962);
      expect(data!.recentElection.margin).toBe(46834);
    });

    it('sorts elections array chronologically descending with null years placed at end', () => {
      // Telangana has historical results for 2018 and 2014
      const data = getConstituencyElectionData('TS', 1);

      expect(data).not.toBeNull();
      expect(data!.elections.length).toBeGreaterThanOrEqual(3);
      expect(data!.elections[0].electionYear).toBe(2023);
      expect(data!.elections[1].electionYear).toBe(2018);
      expect(data!.elections[2].electionYear).toBe(2014);

      // Descending order verified
      for (let i = 0; i < data!.elections.length - 1; i++) {
        const curr = data!.elections[i].electionYear;
        const next = data!.elections[i + 1].electionYear;
        if (curr != null && next != null) {
          expect(curr).toBeGreaterThan(next);
        }
      }
    });

    it('returns null for nonexistent state or AC', () => {
      expect(getConstituencyElectionData('ZZ', 1)).toBeNull();
      expect(getConstituencyElectionData('TS', 9999)).toBeNull();
    });
  });
});
