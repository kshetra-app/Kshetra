import { createHash } from 'node:crypto';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: null,
  cacheDirectory: null,
}));

jest.mock('../lib/api', () => ({
  apiClient: { get: jest.fn() },
}));

import { apiClient } from '../lib/api';
import {
  getCachedStateMapData,
  loadStateScopedMapData,
  MAX_CACHED_STATES,
} from '../lib/stateScopedMapData';

const get = apiClient.get as jest.Mock;

function payload(stateCode: string, acNo = 1) {
  const core = {
    schemaVersion: 1,
    stateCode,
    dataStatus: 'full',
    constituencies: [{
      acNo,
      id: `${stateCode}-AC-${acNo}`,
      stateCode,
      name: `Seat ${acNo}`,
      district: 'Example district',
      type: 'GEN',
      winnerParty: 'TEST',
      winnerName: 'Verified Winner',
      winnerVotes: 1000,
      runnerUp: 'OTHER',
      margin: 100,
      currentParty: 'TEST',
      currentMLA: 'Verified Winner',
      electionYear: 2023,
    }],
    availableYears: [2018, 2023],
    trivia: [],
    triviaByAcNo: {},
    historyByAcNo: {},
    demographicsByAcNo: {},
    mlaProfilesByAcNo: {},
    strongholdByAcNo: {},
    hasLocalBodyData: false,
  };
  return {
    ...core,
    revision: createHash('sha1').update(JSON.stringify(core)).digest('hex'),
  };
}

describe('state-scoped map data contract', () => {
  beforeEach(() => get.mockReset());

  it('loads one state, verifies its revision, and preserves the canonical constituency ID', async () => {
    get.mockResolvedValueOnce({ data: payload('TS', 65) });
    const result = await loadStateScopedMapData('TS');

    expect(result.status).toBe('loaded');
    expect(result.data?.revision).toMatch(/^[a-f0-9]{40}$/);
    expect(result.data?.constituencies[0].id).toBe('TS-AC-65');
    expect(result.data?.constituencies[0].acNo).toBe(65);
    expect(get).toHaveBeenCalledWith('/api/v1/states/TS/map-data', { authPolicy: 'public' });
  });

  it('rejects a non-canonical constituency ID rather than remapping by display name', async () => {
    const invalid = payload('AP', 3);
    invalid.constituencies[0].id = 'AP-AC-99';
    invalid.revision = createHash('sha1').update(JSON.stringify((({ revision, ...core }) => core)(invalid))).digest('hex');
    get.mockResolvedValueOnce({ data: invalid });

    const result = await loadStateScopedMapData('AP');
    expect(result.status).toBe('offline');
    expect(result.data).toBeNull();
    expect(result.error).toMatch(/canonical constituency ID mismatch/i);
  });

  it('marks a server 404 as unavailable, not as an empty fabricated dataset', async () => {
    get.mockRejectedValueOnce(Object.assign(new Error('not found'), { status: 404 }));
    const result = await loadStateScopedMapData('KA');

    expect(result.status).toBe('unavailable');
    expect(result.data).toBeNull();
    expect(result.error).toMatch(/not available/i);
  });

  it('reports offline when the service fails and there is no verified cached snapshot', async () => {
    get.mockRejectedValueOnce(new Error('network unavailable'));
    const result = await loadStateScopedMapData('MH');

    expect(result.status).toBe('offline');
    expect(result.data).toBeNull();
    expect(result.error).toMatch(/network unavailable/i);
  });

  it('bounds the hot cache to the configured state count', async () => {
    const codes = ['TN', 'RJ', 'GJ', 'DL'];
    for (const code of codes) {
      get.mockResolvedValueOnce({ data: payload(code) });
      const result = await loadStateScopedMapData(code);
      expect(result.status).toBe('loaded');
    }

    expect(MAX_CACHED_STATES).toBe(3);
    expect(getCachedStateMapData('TN')).toBeNull();
    expect(getCachedStateMapData('RJ')?.data?.stateCode).toBe('RJ');
    expect(getCachedStateMapData('DL')?.data?.stateCode).toBe('DL');
  });
});
