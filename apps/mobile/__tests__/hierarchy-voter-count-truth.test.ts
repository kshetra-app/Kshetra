import { hasCurrentBoothVoterCount } from '../lib/hierarchyData';
import type { PollingBooth } from '../lib/hierarchyData';

const booth = (overrides: Partial<PollingBooth> = {}): PollingBooth => ({
  id: 'TS-AC-1-B1',
  constituencyId: 'TS-AC-1',
  panchayatId: null,
  boothNumber: 1,
  nameEn: 'Polling location',
  location: { latitude: 17.4, longitude: 78.4 },
  totalVoters: 0,
  isUrban: false,
  ...overrides,
});

describe('hierarchy booth voter-count truth', () => {
  it('does not treat a historical location record as a current voter count', () => {
    expect(hasCurrentBoothVoterCount(booth({ totalVoters: 950, historical: true, sourceYear: 2017 }))).toBe(false);
  });

  it('does not treat zero or non-finite counts as available', () => {
    expect(hasCurrentBoothVoterCount(booth({ totalVoters: 0 }))).toBe(false);
    expect(hasCurrentBoothVoterCount(booth({ totalVoters: Number.NaN }))).toBe(false);
  });

  it('allows a positive count only on a non-historical booth record', () => {
    expect(hasCurrentBoothVoterCount(booth({ totalVoters: 950 }))).toBe(true);
  });
});
