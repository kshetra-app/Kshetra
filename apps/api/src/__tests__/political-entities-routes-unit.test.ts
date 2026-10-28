import Fastify, { FastifyInstance } from 'fastify';
import { politicalEntityRoutes } from '../routes/politicalEntities';
import { politicalEntityService } from '../services/politicalEntityService';
import { supabase } from '../lib/supabase';

describe('Political Entities Routes Unit Tests (Direct Route Injection)', () => {
  let app: FastifyInstance;

  const mockPerson = {
    id: 'p-1',
    canonicalName: 'Anumula Revanth Reddy',
    aliases: ['Revanth Reddy'],
    gender: 'MALE',
    photoUrl: 'https://example.com/revanth.jpg',
  };

  const mockOrg = {
    id: 'o-inc',
    name: 'Indian National Congress',
    shortName: 'INC',
    ecPartyCode: 'INC',
    orgType: 'POLITICAL_PARTY',
    recognitionLevel: 'NATIONAL',
  };

  const mockLegislator = {
    tenureId: 't-1',
    officeName: 'Chief Minister & MLA',
    jurisdictionId: 'ac-65',
    stateCode: 'TG',
    person: mockPerson,
    party: mockOrg,
    startDate: '2023-12-07',
    endDate: null,
    isCurrent: true,
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

  // 1. Search Entities
  it('GET /api/v1/entities/search returns 200 with search results', async () => {
    jest.spyOn(politicalEntityService, 'searchEntities').mockResolvedValue({
      persons: [mockPerson as any],
      organizations: [mockOrg as any],
      total: 2,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/entities/search?q=Revanth&type=person&state=TG&limit=10&offset=0',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.total).toBe(2);
    expect(body.data.persons.length).toBe(1);
    expect(body.data.organizations.length).toBe(1);
  });

  it('GET /api/v1/entities/search returns error envelope when service throws', async () => {
    jest.spyOn(politicalEntityService, 'searchEntities').mockImplementation(async () => {
      const err: any = new Error('Database search index offline');
      err.statusCode = 500;
      err.code = 'SEARCH_UNAVAILABLE';
      throw err;
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/entities/search?q=test',
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('SEARCH_UNAVAILABLE');
    expect(body.message).toContain('offline');
  });

  // 2. Get Person Profile
  it('GET /api/v1/entities/persons/:id returns 200 with person profile', async () => {
    jest.spyOn(politicalEntityService, 'getPersonById').mockResolvedValue(mockPerson as any);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/entities/persons/p-1',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.id).toBe('p-1');
    expect(body.data.canonicalName).toBe('Anumula Revanth Reddy');
  });

  it('GET /api/v1/entities/persons/:id returns 404 when person not found', async () => {
    jest.spyOn(politicalEntityService, 'getPersonById').mockImplementation(async () => {
      const err: any = new Error('Person not found');
      err.statusCode = 404;
      err.code = 'PERSON_NOT_FOUND';
      throw err;
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/entities/persons/p-nonexistent',
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('PERSON_NOT_FOUND');
  });

  it('GET /api/v1/entities/persons/:id returns 500 when service throws generic error', async () => {
    jest.spyOn(politicalEntityService, 'getPersonById').mockImplementation(async () => {
      throw new Error('Unexpected DB fault');
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/entities/persons/p-1',
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('PERSON_FETCH_ERROR');
  });

  // 3. Get Political Career Timeline
  it('GET /api/v1/entities/persons/:id/timeline returns 200 with timeline entries', async () => {
    jest.spyOn(politicalEntityService, 'getPersonCareerTimeline').mockResolvedValue({
      person: mockPerson as any,
      activeRoles: [],
      affiliations: [],
      tenures: [],
      partySwitches: [],
      candidacies: [],
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/entities/persons/p-1/timeline',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.person.id).toBe('p-1');
  });

  it('GET /api/v1/entities/persons/:id/timeline returns 404 when timeline not found', async () => {
    jest.spyOn(politicalEntityService, 'getPersonCareerTimeline').mockImplementation(async () => {
      const err: any = new Error('Timeline not found');
      err.statusCode = 404;
      throw err;
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/entities/persons/p-unknown/timeline',
    });

    expect(res.statusCode).toBe(404);
  });

  it('GET /api/v1/entities/persons/:id/timeline returns 500 on generic error', async () => {
    jest.spyOn(politicalEntityService, 'getPersonCareerTimeline').mockImplementation(async () => {
      throw new Error('Timeline DB error');
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/entities/persons/p-1/timeline',
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('TIMELINE_FETCH_ERROR');
  });

  // 4. Get Political Organization
  it('GET /api/v1/entities/organizations/:id returns 200 with organization details', async () => {
    jest.spyOn(politicalEntityService, 'getOrganizationById').mockResolvedValue(mockOrg as any);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/entities/organizations/o-inc',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.id).toBe('o-inc');
  });

  it('GET /api/v1/entities/organizations/:id returns 404 when org not found', async () => {
    jest.spyOn(politicalEntityService, 'getOrganizationById').mockImplementation(async () => {
      const err: any = new Error('Organization not found');
      err.statusCode = 404;
      err.code = 'ORGANIZATION_NOT_FOUND';
      throw err;
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/entities/organizations/o-missing',
    });

    expect(res.statusCode).toBe(404);
  });

  it('GET /api/v1/entities/organizations/:id returns 500 on generic error', async () => {
    jest.spyOn(politicalEntityService, 'getOrganizationById').mockImplementation(async () => {
      throw new Error('Org DB error');
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/entities/organizations/o-inc',
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('ORGANIZATION_FETCH_ERROR');
  });

  // 5. List Current Legislators
  it('GET /api/v1/entities/legislators returns 200 with legislators roster', async () => {
    jest.spyOn(politicalEntityService, 'listCurrentLegislators').mockResolvedValue({
      legislators: [mockLegislator as any],
      total: 1,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/entities/legislators?state=TG&house=assembly&currentOnly=true',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.total).toBe(1);
    expect(body.data.legislators.length).toBe(1);
  });

  it('GET /api/v1/entities/legislators returns 500 when service throws', async () => {
    jest
      .spyOn(politicalEntityService, 'listCurrentLegislators')
      .mockRejectedValue(new Error('Roster error'));

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/entities/legislators',
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('LEGISLATORS_QUERY_ERROR');
  });

  // 6. Claim Person Identity
  it('POST /api/v1/entities/persons/:id/claim rejects unauthenticated caller with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/entities/persons/p-1/claim',
      payload: { verificationType: 'OFFICIAL_EMAIL' },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('POST /api/v1/entities/persons/:id/claim allows authenticated user claim submission', async () => {
    jest.spyOn(politicalEntityService, 'claimPersonIdentity').mockResolvedValue({
      id: 'claim-1',
      personId: 'p-1',
      status: 'PENDING_REVIEW',
    } as any);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/entities/persons/p-1/claim',
      headers: {
        'x-test-role': 'authenticated',
        'x-test-user-id': 'user-123',
      },
      payload: {
        verificationType: 'OFFICIAL_EMAIL',
        evidenceUrl: 'https://example.com/id.pdf',
        notes: 'Submitted verification document',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.status).toBe('PENDING_REVIEW');
  });

  it('POST /api/v1/entities/persons/:id/claim allows service_role caller to auto-approve claim', async () => {
    const claimSpy = jest.spyOn(politicalEntityService, 'claimPersonIdentity').mockResolvedValue({
      id: 'claim-2',
      personId: 'p-1',
      status: 'APPROVED',
    } as any);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/entities/persons/p-1/claim',
      headers: {
        'x-test-role': 'service_role',
        'x-test-user-id': 'admin-service',
      },
      payload: { verificationType: 'DIRECT_AUTHORITY' },
    });

    expect(res.statusCode).toBe(200);
    expect(claimSpy).toHaveBeenCalledWith(
      'p-1',
      'admin-service',
      { verificationType: 'DIRECT_AUTHORITY' },
      true,
    );
  });

  it('POST /api/v1/entities/persons/:id/claim handles 404, 409, and 500 error codes', async () => {
    // 409 Conflict (e.g. already claimed)
    jest.spyOn(politicalEntityService, 'claimPersonIdentity').mockImplementationOnce(async () => {
      const err: any = new Error('Person profile is already claimed by another user');
      err.statusCode = 409;
      err.code = 'ALREADY_CLAIMED';
      throw err;
    });

    const res409 = await app.inject({
      method: 'POST',
      url: '/api/v1/entities/persons/p-1/claim',
      headers: { 'x-test-role': 'authenticated' },
      payload: { verificationType: 'OFFICIAL_EMAIL' },
    });
    expect(res409.statusCode).toBe(409);
    expect(JSON.parse(res409.payload).code).toBe('ALREADY_CLAIMED');

    // 404 Not Found
    jest.spyOn(politicalEntityService, 'claimPersonIdentity').mockImplementationOnce(async () => {
      const err: any = new Error('Person not found');
      err.statusCode = 404;
      err.code = 'PERSON_NOT_FOUND';
      throw err;
    });

    const res404 = await app.inject({
      method: 'POST',
      url: '/api/v1/entities/persons/p-missing/claim',
      headers: { 'x-test-role': 'authenticated' },
      payload: { verificationType: 'OFFICIAL_EMAIL' },
    });
    expect(res404.statusCode).toBe(404);

    // 500 Default
    jest.spyOn(politicalEntityService, 'claimPersonIdentity').mockImplementationOnce(async () => {
      throw new Error('Database deadlocked');
    });

    const res500 = await app.inject({
      method: 'POST',
      url: '/api/v1/entities/persons/p-1/claim',
      headers: { 'x-test-role': 'authenticated' },
      payload: { verificationType: 'OFFICIAL_EMAIL' },
    });
    expect(res500.statusCode).toBe(500);
    expect(JSON.parse(res500.payload).code).toBe('CLAIM_ERROR');
  });

  // 7. resolveCaller Bearer permutations
  it('covers resolveCaller Bearer token permutations', async () => {
    const origServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'poly-test-service-key-999';

    try {
      // 1. Bearer token matching SUPABASE_SERVICE_ROLE_KEY
      jest
        .spyOn(politicalEntityService, 'claimPersonIdentity')
        .mockResolvedValueOnce({ id: 'c1' } as any);
      const resServiceBearer = await app.inject({
        method: 'POST',
        url: '/api/v1/entities/persons/p-1/claim',
        headers: { authorization: 'Bearer poly-test-service-key-999' },
        payload: { verificationType: 'DIRECT_AUTHORITY' },
      });
      expect(resServiceBearer.statusCode).toBe(200);

      // 2. Bearer token resolved via supabase.auth.getUser
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: { id: 'supabase-jwt-user' } } as any,
        error: null,
      });
      jest
        .spyOn(politicalEntityService, 'claimPersonIdentity')
        .mockResolvedValueOnce({ id: 'c2' } as any);
      const resJwtBearer = await app.inject({
        method: 'POST',
        url: '/api/v1/entities/persons/p-1/claim',
        headers: { authorization: 'Bearer valid-jwt-token-xyz' },
        payload: { verificationType: 'OFFICIAL_EMAIL' },
      });
      expect(resJwtBearer.statusCode).toBe(200);

      // 3. Bearer token where supabase.auth.getUser returns error
      jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid JWT' } as any,
      });
      const resInvalidJwt = await app.inject({
        method: 'POST',
        url: '/api/v1/entities/persons/p-1/claim',
        headers: { authorization: 'Bearer bad-jwt' },
        payload: { verificationType: 'OFFICIAL_EMAIL' },
      });
      expect(resInvalidJwt.statusCode).toBe(401);

      // 4. Bearer token where supabase.auth.getUser throws
      jest.spyOn(supabase.auth, 'getUser').mockRejectedValueOnce(new Error('Network drop'));
      const resCatchBearer = await app.inject({
        method: 'POST',
        url: '/api/v1/entities/persons/p-1/claim',
        headers: { authorization: 'Bearer network-error-token' },
        payload: { verificationType: 'OFFICIAL_EMAIL' },
      });
      expect(resCatchBearer.statusCode).toBe(401);
    } finally {
      process.env.SUPABASE_SERVICE_ROLE_KEY = origServiceKey;
    }
  });
});
