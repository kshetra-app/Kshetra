import { ApiValidationError } from '../lib/api/errors';
import {
  ConstituenciesEndpoint,
  validateConstituencyHierarchy,
} from '../lib/api/endpoints/constituencies';

const payload = {
  constituency: {
    id: 'TS-AC-1',
    internalId: 'TS-AC-1',
    acNo: 1,
    name: 'Sirpur',
    stateCode: 'TS',
    district: 'Kumuram Bheem Asifabad',
    reservationStatus: 'ST',
  },
  urbanLocalBodies: [],
  gramPanchayats: [],
  pollingBooths: [
    {
      id: 'booth-1',
      internalId: 'booth-1',
      boothNumber: 1,
      boothName: 'Polling station 1',
      pollingStationName: null,
      totalVoters: 0,
      localBodyType: 'unassigned',
      panchayatId: null,
      ulbWardId: null,
      gpWardId: null,
    },
  ],
};

describe('constituency hierarchy API', () => {
  it('preserves persisted booth records while treating zero voter counts as unavailable', () => {
    const result = validateConstituencyHierarchy(payload);

    expect(result.constituency.name).toBe('Sirpur');
    expect(result.pollingBooths[0]).toEqual(expect.objectContaining({
      boothNumber: 1,
      totalVoters: null,
    }));
  });

  it('preserves positive persisted voter counts', () => {
    const result = validateConstituencyHierarchy({
      ...payload,
      pollingBooths: [{ ...payload.pollingBooths[0], totalVoters: 950 }],
    });
    expect(result.pollingBooths[0].totalVoters).toBe(950);
  });

  it('rejects malformed hierarchy payloads instead of filling missing records', () => {
    expect(() => validateConstituencyHierarchy({ ...payload, pollingBooths: 'missing' })).toThrow(ApiValidationError);
    expect(() => validateConstituencyHierarchy({
      ...payload,
      pollingBooths: [{ ...payload.pollingBooths[0], localBodyType: 'unknown' }],
    })).toThrow(ApiValidationError);
  });

  it('requests the public constituency-scoped hierarchy route', async () => {
    const client = { get: jest.fn().mockResolvedValue({ data: payload }) };
    const endpoint = new ConstituenciesEndpoint(client as any);

    await endpoint.getHierarchy('ts', 1);

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/constituencies/TS/1/hierarchy',
      { authPolicy: 'public' },
    );
  });
});
