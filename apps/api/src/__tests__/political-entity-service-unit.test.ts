import Fastify, { FastifyInstance } from 'fastify';
import {
  PoliticalEntityService,
  politicalEntityService,
} from '../services/politicalEntityService';
import { politicalEntityRoutes } from '../routes/politicalEntities';
import { supabase } from '../lib/supabase';

describe('PoliticalEntityService & Routes Unit Tests (W018)', () => {
  let app: FastifyInstance;

  const mockPersonRow = {
    id: '01900000-0000-0000-0000-000000000011',
    canonical_name: 'Anumula Revanth Reddy',
    aliases: ['Revanth Reddy', 'ARR'],
    gender: 'MALE',
    dob: '1969-11-08',
    dob_estimated: false,
    photo_url: 'https://example.com/revanth.jpg',
    eci_candidate_id: 'ECI-12345',
    sansad_member_id: null,
    primary_user_id: null,
    data_status: 'VERIFIED',
    provenance_id: 'PROV-001',
    metadata: { verifiedBio: 'Chief Minister of Telangana' },
    created_at: '2023-12-07T00:00:00Z',
    updated_at: '2023-12-07T00:00:00Z',
  };

  const mockOrgRow = {
    id: 'ORG-PARTY-INC',
    org_type: 'political_party',
    name: 'Indian National Congress',
    short_name: 'INC',
    ec_party_code: 'INC',
    recognition_level: 'national',
    headquarters_state: 'DL',
    parent_org_id: null,
    symbol_url: 'https://example.com/inc.png',
    brand_colors: { primary: '#19AAED' },
    page_id: null,
    data_status: 'OFFICIAL',
    provenance_id: 'PROV-002',
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
  };

  const mockTenureRow = {
    id: 'TEN-001',
    person_id: '01900000-0000-0000-0000-000000000011',
    office_type: 'mla',
    jurisdiction_type: 'assembly_constituency',
    jurisdiction_id: 'TS-AC-065',
    constituency_version_id: 'CV-065',
    term_start: '2023-12-07',
    term_end: null,
    is_current: true,
    party_at_election: 'ORG-PARTY-INC',
    current_party: 'ORG-PARTY-INC',
    defection_date: null,
    candidacy_id: 'CAND-001',
    data_status: 'OFFICIAL',
    provenance_id: 'PROV-003',
    created_at: '2023-12-07T00:00:00Z',
    updated_at: '2023-12-07T00:00:00Z',
  };

  beforeAll(async () => {
    app = Fastify();
    await app.register(politicalEntityRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('searchEntities', () => {
    it('searches persons and organizations with default options', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'canonical_persons') {
          return {
            select: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: [mockPersonRow], error: null }),
          };
        }
        if (table === 'political_organizations') {
          return {
            select: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: [mockOrgRow], error: null }),
          };
        }
        return { select: jest.fn().mockReturnThis() };
      }) as any);

      const res = await politicalEntityService.searchEntities();
      expect(res.persons.length).toBe(1);
      expect(res.organizations.length).toBe(1);
      expect(res.total).toBe(2);
      expect(res.persons[0].canonicalName).toBe('Anumula Revanth Reddy');
      expect(res.organizations[0].shortName).toBe('INC');
    });

    it('filters strictly by type person or organization', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'canonical_persons') {
          return {
            select: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: [mockPersonRow], error: null }),
          };
        }
        return { select: jest.fn().mockReturnThis() };
      }) as any);

      const resPerson = await politicalEntityService.searchEntities({ type: 'person' });
      expect(resPerson.persons.length).toBe(1);
      expect(resPerson.organizations.length).toBe(0);

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'political_organizations') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: [mockOrgRow], error: null }),
          };
        }
        return { select: jest.fn().mockReturnThis() };
      }) as any);

      const resOrg = await politicalEntityService.searchEntities({ type: 'organization', state: 'DL' });
      expect(resOrg.persons.length).toBe(0);
      expect(resOrg.organizations.length).toBe(1);
    });

    it('applies query term q and role filters', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'person_roles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: (resolve: any) => resolve({
              data: [{ person_id: '01900000-0000-0000-0000-000000000011' }],
              error: null,
            }),
          };
        }
        if (table === 'canonical_persons') {
          return {
            select: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: [mockPersonRow], error: null }),
          };
        }
        if (table === 'political_organizations') {
          return {
            select: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return { select: jest.fn().mockReturnThis() };
      }) as any);

      const res = await politicalEntityService.searchEntities({ q: 'Revanth', role: 'MLA' });
      expect(res.persons.length).toBe(1);
    });

    it('handles role filter when no persons match role', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'person_roles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data: [], error: null }),
          };
        }
        if (table === 'canonical_persons') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        if (table === 'political_organizations') {
          return {
            select: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return { select: jest.fn().mockReturnThis() };
      }) as any);

      const res = await politicalEntityService.searchEntities({ role: 'GOVERNOR' });
      expect(res.persons.length).toBe(0);
    });

    it('throws error when database queries fail', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'canonical_persons') {
          return {
            select: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB connection dead' } }),
          };
        }
        return { select: jest.fn().mockReturnThis() };
      }) as any);

      await expect(politicalEntityService.searchEntities({ type: 'person' }))
        .rejects.toThrow('PERSON_SEARCH_ERROR: DB connection dead');

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'political_organizations') {
          return {
            select: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: null, error: { message: 'Org timeout' } }),
          };
        }
        return { select: jest.fn().mockReturnThis() };
      }) as any);

      await expect(politicalEntityService.searchEntities({ type: 'organization' }))
        .rejects.toThrow('ORGANIZATION_SEARCH_ERROR: Org timeout');
    });
  });

  describe('getPersonById', () => {
    it('returns canonical person when found', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockPersonRow, error: null }),
      })) as any);

      const res = await politicalEntityService.getPersonById(mockPersonRow.id);
      expect(res.canonicalName).toBe('Anumula Revanth Reddy');
      expect(res.aliases).toContain('ARR');
    });

    it('throws 404 when person does not exist', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })) as any);

      await expect(politicalEntityService.getPersonById('missing-uuid'))
        .rejects.toThrow('PERSON_NOT_FOUND');
    });

    it('throws 500 when database query encounters an error', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'Disk failure' } }),
      })) as any);

      await expect(politicalEntityService.getPersonById(mockPersonRow.id))
        .rejects.toThrow('DATABASE_ERROR: Disk failure');
    });
  });

  describe('getPersonCareerTimeline', () => {
    it('aggregates all 5 dimensions of career timeline', async () => {
      jest.spyOn(politicalEntityService, 'getPersonById').mockResolvedValue(mockPersonRow as any);

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        const rows = table === 'person_roles' ? [{ id: 'R1', person_id: mockPersonRow.id, role_type: 'MLA' }]
          : table === 'person_party_affiliations' ? [{ id: 'A1', person_id: mockPersonRow.id, party_id: 'INC' }]
          : table === 'elected_tenures' ? [mockTenureRow]
          : table === 'tenure_party_switches' ? [{ id: 'S1', person_id: mockPersonRow.id, from_party_id: 'TDP', to_party_id: 'INC' }]
          : table === 'candidacies' ? [{ id: 'C1', person_id: mockPersonRow.id, election_year: 2023, election_type: 'assembly' }]
          : [];
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: rows, error: null }),
        };
      }) as any);

      const timeline = await politicalEntityService.getPersonCareerTimeline(mockPersonRow.id);
      expect(timeline.person.id).toBe(mockPersonRow.id);
      expect(timeline.activeRoles.length).toBe(1);
      expect(timeline.affiliations.length).toBe(1);
      expect(timeline.tenures.length).toBe(1);
      expect(timeline.partySwitches.length).toBe(1);
      expect(timeline.candidacies.length).toBe(1);
    });

    it('propagates error when subquery fails', async () => {
      jest.spyOn(politicalEntityService, 'getPersonById').mockResolvedValue(mockPersonRow as any);

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'person_roles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: null, error: { message: 'roles failed' } }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }) as any);

      await expect(politicalEntityService.getPersonCareerTimeline(mockPersonRow.id))
        .rejects.toThrow('TIMELINE_ROLES_ERROR: roles failed');
    });
  });

  describe('getOrganizationById', () => {
    it('returns political organization when found', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockOrgRow, error: null }),
      })) as any);

      const res = await politicalEntityService.getOrganizationById('ORG-PARTY-INC');
      expect(res.name).toBe('Indian National Congress');
      expect(res.headquartersState).toBe('DL');
    });

    it('throws 404 when organization not found', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })) as any);

      await expect(politicalEntityService.getOrganizationById('ORG-NONEXISTENT'))
        .rejects.toThrow('ORGANIZATION_NOT_FOUND');
    });

    it('throws 500 when database error occurs', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'Network reset' } }),
      })) as any);

      await expect(politicalEntityService.getOrganizationById('ORG-PARTY-INC'))
        .rejects.toThrow('DATABASE_ERROR: Network reset');
    });
  });

  describe('listCurrentLegislators', () => {
    it('lists current legislators and joins persons and organizations', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'elected_tenures') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data: [mockTenureRow], error: null }),
          };
        }
        if (table === 'canonical_persons') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: [mockPersonRow], error: null }),
          };
        }
        if (table === 'political_organizations') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: [mockOrgRow], error: null }),
          };
        }
        return { select: jest.fn().mockReturnThis() };
      }) as any);

      const res = await politicalEntityService.listCurrentLegislators({
        house: 'assembly',
        state: 'TS',
      });

      expect(res.total).toBe(1);
      expect(res.legislators[0].person.canonicalName).toBe('Anumula Revanth Reddy');
      expect(res.legislators[0].organization?.shortName).toBe('INC');
    });

    it('returns empty list when no tenures exist', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'elected_tenures') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data: [], error: null }),
          };
        }
        return { select: jest.fn().mockReturnThis() };
      }) as any);

      const res = await politicalEntityService.listCurrentLegislators();
      expect(res.total).toBe(0);
      expect(res.legislators).toEqual([]);
    });

    it('throws error when tenure query fails', async () => {
      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'elected_tenures') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data: null, error: { message: 'tenures failed' } }),
          };
        }
        return { select: jest.fn().mockReturnThis() };
      }) as any);

      await expect(politicalEntityService.listCurrentLegislators())
        .rejects.toThrow('LEGISLATOR_QUERY_ERROR: tenures failed');
    });
  });

  describe('claimPersonIdentity', () => {
    it('throws 409 when person is already bound to another user', async () => {
      jest.spyOn(politicalEntityService, 'getPersonById').mockResolvedValue({
        ...mockPersonRow,
        primaryUserId: 'different-user-id',
      } as any);

      await expect(
        politicalEntityService.claimPersonIdentity(
          mockPersonRow.id,
          'my-user-id',
          { verificationType: 'official_id' },
          false
        )
      ).rejects.toThrow('IDENTITY_ALREADY_CLAIMED');
    });

    it('binds directly when called by service_role', async () => {
      jest.spyOn(politicalEntityService, 'getPersonById').mockResolvedValue(mockPersonRow as any);
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      })) as any);

      const res = await politicalEntityService.claimPersonIdentity(
        mockPersonRow.id,
        'my-user-id',
        { verificationType: 'official_id' },
        true
      );

      expect(res.status).toBe('approved');
      expect(res.userId).toBe('my-user-id');
    });

    it('queues pending_review when called by standard user', async () => {
      jest.spyOn(politicalEntityService, 'getPersonById').mockResolvedValue(mockPersonRow as any);
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      })) as any);

      const res = await politicalEntityService.claimPersonIdentity(
        mockPersonRow.id,
        'my-user-id',
        { verificationType: 'official_id', notes: 'Verification request' },
        false
      );

      expect(res.status).toBe('pending_review');
      expect(res.message).toContain('Trust & Safety review');
    });
  });

  describe('resolveCanonicalPerson & linkPersonIdentity', () => {
    it('resolves canonical person via RPC or fallback', async () => {
      jest.spyOn(supabase, 'rpc').mockResolvedValue({ data: 'canonical-uuid-123', error: null } as any);
      const res1 = await politicalEntityService.resolveCanonicalPerson('ECI', 'REC-001');
      expect(res1).toBe('canonical-uuid-123');

      jest.spyOn(supabase, 'rpc').mockResolvedValue({ data: null, error: { message: 'no rpc' } } as any);
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { person_id: 'fallback-uuid-456' }, error: null }),
      })) as any);
      const res2 = await politicalEntityService.resolveCanonicalPerson('ECI', 'REC-002');
      expect(res2).toBe('fallback-uuid-456');
    });

    it('links person identity via RPC or fallback upsert', async () => {
      jest.spyOn(supabase, 'rpc').mockResolvedValue({ data: 'linkage-id-1', error: null } as any);
      const link1 = await politicalEntityService.linkPersonIdentity({
        personId: mockPersonRow.id,
        sourceSystem: 'ECI',
        sourceRecordId: 'ECI-123',
        matchMethod: 'exact_eci_id',
      });
      expect(link1).toBe('linkage-id-1');

      jest.spyOn(supabase, 'rpc').mockResolvedValue({ data: null, error: { message: 'no rpc' } } as any);
      jest.spyOn(supabase, 'from').mockImplementation((() => ({
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'linkage-upsert-2' }, error: null }),
      })) as any);
      const link2 = await politicalEntityService.linkPersonIdentity({
        personId: mockPersonRow.id,
        sourceSystem: 'SANSAD',
        sourceRecordId: 'SAN-456',
        matchMethod: 'manual_curated',
      });
      expect(link2).toBe('linkage-upsert-2');
    });
  });

  describe('Political Entity Fastify HTTP Routes', () => {
    it('GET /api/v1/entities/search returns search results', async () => {
      jest.spyOn(politicalEntityService, 'searchEntities').mockResolvedValue({
        persons: [mockPersonRow as any],
        organizations: [mockOrgRow as any],
        total: 2,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/entities/search?q=Revanth&type=person',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.total).toBe(2);
    });

    it('GET /api/v1/entities/persons/:id returns person profile', async () => {
      jest.spyOn(politicalEntityService, 'getPersonById').mockResolvedValue(mockPersonRow as any);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/entities/persons/${mockPersonRow.id}`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.id).toBe(mockPersonRow.id);
    });

    it('GET /api/v1/entities/persons/:id/timeline returns timeline', async () => {
      jest.spyOn(politicalEntityService, 'getPersonCareerTimeline').mockResolvedValue({
        person: mockPersonRow as any,
        activeRoles: [],
        affiliations: [],
        tenures: [mockTenureRow as any],
        partySwitches: [],
        candidacies: [],
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/entities/persons/${mockPersonRow.id}/timeline`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.tenures.length).toBe(1);
    });

    it('GET /api/v1/entities/organizations/:id returns organization', async () => {
      jest.spyOn(politicalEntityService, 'getOrganizationById').mockResolvedValue(mockOrgRow as any);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/entities/organizations/${mockOrgRow.id}`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.name).toBe(mockOrgRow.name);
    });

    it('GET /api/v1/entities/legislators returns roster', async () => {
      jest.spyOn(politicalEntityService, 'listCurrentLegislators').mockResolvedValue({
        legislators: [{ tenure: mockTenureRow as any, person: mockPersonRow as any }],
        total: 1,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/entities/legislators?state=TS&house=assembly',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.total).toBe(1);
    });

    it('POST /api/v1/entities/persons/:id/claim fails closed for anonymous caller', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/entities/persons/${mockPersonRow.id}/claim`,
        payload: { verificationType: 'aadhaar' },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('POST /api/v1/entities/persons/:id/claim submits pending review for authenticated user', async () => {
      jest.spyOn(politicalEntityService, 'claimPersonIdentity').mockResolvedValue({
        status: 'pending_review',
        personId: mockPersonRow.id,
        userId: 'test-user-id',
        message: 'Identity claim submitted.',
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/entities/persons/${mockPersonRow.id}/claim`,
        headers: {
          'x-test-role': 'authenticated',
          'x-test-user-id': 'user-123',
        },
        payload: { verificationType: 'official_id', notes: 'Candidate claim' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.status).toBe('pending_review');
    });

    it('POST /api/v1/entities/persons/:id/claim approves directly for service_role', async () => {
      jest.spyOn(politicalEntityService, 'claimPersonIdentity').mockResolvedValue({
        status: 'approved',
        personId: mockPersonRow.id,
        userId: 'user-admin',
        message: 'Bound.',
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/entities/persons/${mockPersonRow.id}/claim`,
        headers: {
          'x-test-role': 'service_role',
          'x-test-user-id': 'user-admin',
        },
        payload: { verificationType: 'admin_override' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.status).toBe('approved');
    });

    it('GET /api/v1/entities/search handles service errors gracefully', async () => {
      jest.spyOn(politicalEntityService, 'searchEntities').mockRejectedValue(new Error('Search failed'));
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/entities/search?q=Revanth',
      });
      expect(res.statusCode).toBe(500);
    });

    it('GET /api/v1/entities/persons/:id returns 404 when person not found', async () => {
      jest.spyOn(politicalEntityService, 'getPersonById').mockRejectedValue({
        statusCode: 404,
        code: 'PERSON_NOT_FOUND',
        message: 'Person not found',
      });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/entities/persons/01900000-0000-0000-0000-000000000999',
      });
      expect(res.statusCode).toBe(404);
    });

    it('GET /api/v1/entities/organizations/:id returns 404 when org not found', async () => {
      jest.spyOn(politicalEntityService, 'getOrganizationById').mockRejectedValue({
        statusCode: 404,
        code: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization not found',
      });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/entities/organizations/01900000-0000-0000-0000-000000000999',
      });
      expect(res.statusCode).toBe(404);
    });

    it('GET /api/v1/entities/persons/:id/timeline returns 404 when person not found', async () => {
      jest.spyOn(politicalEntityService, 'getPersonCareerTimeline').mockRejectedValue({
        statusCode: 404,
        code: 'PERSON_NOT_FOUND',
        message: 'Person not found',
      });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/entities/persons/01900000-0000-0000-0000-000000000999/timeline',
      });
      expect(res.statusCode).toBe(404);
    });

    it('GET /api/v1/entities/legislators handles service error', async () => {
      jest.spyOn(politicalEntityService, 'listCurrentLegislators').mockRejectedValue(new Error('DB failure'));
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/entities/legislators?state=TS',
      });
      expect(res.statusCode).toBe(500);
    });
  });
});
