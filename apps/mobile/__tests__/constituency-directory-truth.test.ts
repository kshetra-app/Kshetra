import type { ConstituencyBrief } from '@kshetra/shared';
import type { UnifiedConstituency } from '../lib/stateDataAdapter';
import {
  mergeCanonicalConstituencies,
  validateConstituencyDirectoryResponse,
} from '../lib/useConstituencyDirectory';

const seededGeography: UnifiedConstituency = {
  acNo: 1,
  name: 'Old Constituency Name',
  district: 'Old District',
  type: 'GEN',
  stateCode: 'KA',
  winnerParty: 'OLD_PARTY',
  winnerName: 'Old Winner',
  winnerVotes: 50000,
  runnerUp: 'OTHER_PARTY',
  runnerUpName: 'Old Runner Up',
  runnerUpVotes: 45000,
  margin: 5000,
  currentParty: 'OLD_PARTY',
  currentMLA: 'Old Winner',
  electionYear: 2023,
  byElection: { year: 2024, month: 'November', winnerName: 'New Winner', winnerParty: 'NEW_PARTY' },
  officeholderStatus: 'BY_ELECTION_SEATED',
  dataStatus: 'BY_ELECTION_UPDATED',
  isStale: false,
  termStatus: 'ACTIVE',
};

const databaseRecord: ConstituencyBrief = {
  id: 'KA-AC-1',
  name: 'Current Constituency Name',
  acNo: 1,
  stateCode: 'KA',
  district: 'Current District',
  reservationStatus: 'SC',
  currentParty: 'INC',
  currentMLA: 'Current Representative',
};

describe('constituency directory production truth', () => {
  it('uses canonical officeholder fields while removing bundled election assertions', () => {
    const [record] = mergeCanonicalConstituencies([seededGeography], [databaseRecord]);

    expect(record).toMatchObject({
      name: 'Current Constituency Name',
      district: 'Current District',
      type: 'SC',
      currentParty: 'INC',
      currentMLA: 'Current Representative',
      dataStatus: 'DATABASE_RECORDED',
      officeholderStatus: 'UNRESOLVED',
    });
    expect(record).toMatchObject({
      winnerParty: '',
      winnerName: '',
      winnerVotes: null,
      runnerUp: '',
      margin: null,
      electionYear: null,
    });
    expect(record.byElection).toBeUndefined();
    expect(record.projection).toBeUndefined();
  });

  it('strips bundled election values even when a database row is missing', () => {
    const [record] = mergeCanonicalConstituencies([seededGeography], []);

    expect(record.winnerParty).toBe('');
    expect(record.winnerName).toBe('');
    expect(record.winnerVotes).toBeNull();
    expect(record.margin).toBeNull();
    expect(record.electionYear).toBeNull();
    expect(record.currentParty).toBe('');
    expect(record.currentMLA).toBeUndefined();
  });

  it('includes canonical records missing from the bundled geography without inventing election fields', () => {
    const extraRecord = { ...databaseRecord, id: 'KA-AC-2', acNo: 2, name: 'Additional Seat' };
    const [record] = mergeCanonicalConstituencies([], [extraRecord]);

    expect(record).toMatchObject({
      acNo: 2,
      name: 'Additional Seat',
      winnerParty: '',
      winnerName: '',
      winnerVotes: null,
      runnerUp: '',
      margin: null,
      currentParty: 'INC',
      currentMLA: 'Current Representative',
      electionYear: null,
      dataStatus: 'DATABASE_RECORDED',
    });
    expect(record.runnerUpName).toBeUndefined();
    expect(record.byElection).toBeUndefined();
  });

  it('rejects responses for a different state or with an inconsistent count', () => {
    expect(() => validateConstituencyDirectoryResponse('KA', {
      state: 'TS',
      count: 0,
      data: [],
    })).toThrow('state mismatch');

    expect(() => validateConstituencyDirectoryResponse('KA', {
      state: 'KA',
      count: 2,
      data: [databaseRecord],
    })).toThrow('count mismatch');
  });

  it('rejects duplicate assembly numbers instead of silently merging the wrong seat', () => {
    expect(() => validateConstituencyDirectoryResponse('KA', {
      state: 'KA',
      count: 2,
      data: [databaseRecord, { ...databaseRecord, id: 'duplicate', name: 'Different seat' }],
    })).toThrow('Duplicate constituency number 1');
  });
});
