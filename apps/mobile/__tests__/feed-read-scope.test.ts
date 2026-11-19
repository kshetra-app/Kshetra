import { getFeedReadScope } from '../lib/feedReadScope';

describe('Feed read scope', () => {
  it('loads the state feed during startup even when a home constituency is available', () => {
    expect(getFeedReadScope('state', 'TS', 'TS-AC-31')).toEqual({
      stateCode: 'TS',
      constituencyId: null,
    });
  });

  it('uses the constituency only when the reader selects it', () => {
    expect(getFeedReadScope('constituency', 'TS', 'TS-AC-31')).toEqual({
      stateCode: 'TS',
      constituencyId: 'TS-AC-31',
    });
  });

  it('reads National without using the saved constituency', () => {
    expect(getFeedReadScope('national', 'TS', 'TS-AC-31')).toEqual({
      stateCode: 'IN',
      constituencyId: null,
    });
  });
});
