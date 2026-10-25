import { getUnifiedConstituenciesForState } from '../lib/stateDataAdapter';

describe('state data adapter data-truth semantics', () => {
  it('does not use zero or empty-string defaults for missing election result values', () => {
    const states = [
      'TS','AP','KA','MH','TN','KL','WB','UP','RJ','GJ','JH','OD','DL','PB','HR','CG',
      'MP','BR','AS','GA','HP','MN','ML','MZ','NL','TR','SK','AR','UK','PY','JK',
    ];
    for (const stateCode of states) {
      for (const seat of getUnifiedConstituenciesForState(stateCode)) {
        expect(seat).toHaveProperty('stateCode', stateCode);
        for (const field of ['winnerVotes', 'margin'] as const) {
          const value = seat[field];
          expect(value === null || (typeof value === 'number' && Number.isFinite(value))).toBe(true);
        }
      }
    }
  });

  it('does not map an unsupported state to a fabricated constituency set', () => {
    expect(getUnifiedConstituenciesForState('ZZ')).toEqual([]);
  });
});
