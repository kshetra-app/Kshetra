import type { SubConstituencyHierarchyDTO } from '@kshetra/shared';
import {
  getBoothsForHierarchyBody,
  getBoothsForHierarchyWard,
  getBoothsWithoutHierarchyBody,
  getBoothsWithoutHierarchyWard,
  getHierarchyBodies,
} from '../lib/liveHierarchy';

const hierarchy: SubConstituencyHierarchyDTO = {
  constituency: {
    id: 'TS-AC-1',
    internalId: 'TS-AC-1',
    acNo: 1,
    name: 'Sirpur',
    stateCode: 'TS',
    district: 'Kumuram Bheem Asifabad',
    reservationStatus: 'ST',
  },
  urbanLocalBodies: [
    {
      id: 'ulb-1',
      internalId: 'ulb-internal-1',
      name: 'Town Council',
      type: 'municipality',
      lgdCode: 101,
      totalWards: 1,
      wards: [{ id: 'ulb-ward-1', internalId: 'ulb-ward-key-1', wardNo: 1, name: 'Central', reservation: 'GEN' }],
    },
  ],
  gramPanchayats: [
    {
      id: 'gp-1',
      internalId: 'gp-internal-1',
      name: 'Village Council',
      mandalId: 'mandal-1',
      lgdCode: 201,
      wards: [{ id: 'gp-ward-1', internalId: 'gp-ward-key-1', wardNo: 2, name: 'East', reservation: 'GEN' }],
    },
  ],
  pollingBooths: [
    {
      id: 'booth-ulb', internalId: 'booth-ulb', boothNumber: 1, boothName: 'Urban Booth',
      pollingStationName: null, totalVoters: 80, localBodyType: 'ulb', ulbWardId: 'ulb-ward-key-1',
    },
    {
      id: 'booth-gp-ward', internalId: 'booth-gp-ward', boothNumber: 2, boothName: 'GP Ward Booth',
      pollingStationName: null, totalVoters: null, localBodyType: 'gram_panchayat', panchayatId: 'gp-1', gpWardId: 'gp-ward-key-1',
    },
    {
      id: 'booth-gp-direct', internalId: 'booth-gp-direct', boothNumber: 3, boothName: 'GP Booth without ward link',
      pollingStationName: null, totalVoters: null, localBodyType: 'gram_panchayat', panchayatId: 'gp-1',
    },
    {
      id: 'booth-orphan', internalId: 'booth-orphan', boothNumber: 4, boothName: 'Unassigned Booth',
      pollingStationName: null, totalVoters: null, localBodyType: 'unassigned',
    },
  ],
};

describe('live hierarchy relationships', () => {
  it('builds distinct urban and rural body navigation from API records', () => {
    const bodies = getHierarchyBodies(hierarchy);
    expect(bodies.map(({ key, name }) => ({ key, name }))).toEqual([
      { key: 'ulb:ulb-1', name: 'Town Council' },
      { key: 'gp:gp-1', name: 'Village Council' },
    ]);
  });

  it('links booth records to their persisted body and ward relationships', () => {
    const [urban, rural] = getHierarchyBodies(hierarchy);

    expect(getBoothsForHierarchyBody(hierarchy, urban).map((booth) => booth.id)).toEqual(['booth-ulb']);
    expect(getBoothsForHierarchyBody(hierarchy, rural).map((booth) => booth.id)).toEqual([
      'booth-gp-ward',
      'booth-gp-direct',
    ]);
    expect(getBoothsForHierarchyWard(hierarchy, rural, rural.wards[0]).map((booth) => booth.id)).toEqual([
      'booth-gp-ward',
    ]);
    expect(getBoothsWithoutHierarchyWard(hierarchy, rural).map((booth) => booth.id)).toEqual([
      'booth-gp-direct',
    ]);
  });

  it('keeps records with no resolvable body visible as unassigned', () => {
    expect(getBoothsWithoutHierarchyBody(hierarchy).map((booth) => booth.id)).toEqual(['booth-orphan']);
  });

  it('does not attach a booth to a body when its persisted parent links conflict', () => {
    const [_, rural] = getHierarchyBodies(hierarchy);
    const withConflictingLinks: SubConstituencyHierarchyDTO = {
      ...hierarchy,
      pollingBooths: [
        ...hierarchy.pollingBooths,
        {
          ...hierarchy.pollingBooths[1],
          id: 'booth-conflicting-parent-links',
          panchayatId: 'gp-1',
          gpWardId: 'ward-belonging-to-another-body',
        },
      ],
    };

    expect(getBoothsForHierarchyBody(withConflictingLinks, rural).map((booth) => booth.id)).not.toContain(
      'booth-conflicting-parent-links',
    );
    expect(getBoothsWithoutHierarchyBody(withConflictingLinks).map((booth) => booth.id)).toEqual([
      'booth-orphan',
      'booth-conflicting-parent-links',
    ]);
  });
});
