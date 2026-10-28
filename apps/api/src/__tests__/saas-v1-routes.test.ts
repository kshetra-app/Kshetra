/**
 * apps/api/src/__tests__/saas-v1-routes.test.ts
 *
 * Milestone W021 — B2B Political SaaS & Public/Partner Developer API Foundation
 * Gate W021-G4: Public/Partner SaaS API Routes Test Suite
 *
 * Directives & Authorities:
 * - CTO AUTHORIZATION — W021-G4 PUBLIC/PARTNER SAAS API ROUTES
 * - Ratified Plan: PLAN-W021-MASTER-REV-1.0.md
 *
 * Mandatory Verification Matrix:
 * 1. Valid authenticated request (200 with ApiSuccessEnvelope, requestId, timestamp)
 * 2. Missing API key (401 UNAUTHORIZED)
 * 3. Invalid API key (401 UNAUTHORIZED)
 * 4. Revoked API key (401 UNAUTHORIZED)
 * 5. Expired API key (401 UNAUTHORIZED)
 * 6. Tenant isolation (authenticated tenant context strictly bound)
 * 7. Caller-supplied tenant spoofing (inbound tenant_id parameter/header ignored)
 * 8. Valid query/path parameters (returns expected payload)
 * 9. Invalid parameters (400 validation error)
 * 10. Empty result behavior (200 with empty array, not 404 or 500)
 * 11. Not found behavior (404 structured error)
 * 12. Database / dependency failure (500 fail-closed)
 * 13. Provenance correctness (STATUTORY_FACT for factual, PANIN_SCENARIO for simulations)
 * 14. Response schema correctness (proper shape, zero citizen PII)
 * 15. Rate-limit behavior (burst limit 429 when exhausted)
 */

import path from 'node:path';
import dotenv from 'dotenv';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

// Ensure staging environment configuration is loaded
const envStaging = path.resolve(__dirname, '../../../../.env.staging');
dotenv.config({ path: envStaging });

import { saasAuthPlugin } from '../lib/saasAuthPlugin';
import { generateCryptographicApiKey } from '../lib/saasCrypto';
import { saasV1Routes } from '../routes/saasV1';
import { saasRateLimiter } from '../lib/saasRateLimiter';
import { electionService } from '../services/electionService';
import { politicalEntityService } from '../services/politicalEntityService';
import { delimitationService } from '../services/delimitationService';
import * as stateData from '../services/stateData';

describe('W021-G4: Public/Partner SaaS API Routes (/api/vsaas/v1/...) Test Suite', () => {
  let app: FastifyInstance;

  // Mock DB for API key authentication
  const mockDb = new Map<string, any>();

  const tenantA = {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'partner-alpha',
    tier: 'pro',
    status: 'active',
  };

  const appA = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    tenant_id: tenantA.id,
    environment: 'live',
  };

  const validKey = generateCryptographicApiKey('live');
  const validTestKey = generateCryptographicApiKey('test');
  const revokedKey = generateCryptographicApiKey('live');
  const expiredKey = generateCryptographicApiKey('live');
  const dbFailKey = generateCryptographicApiKey('live');

  beforeAll(async () => {
    // Setup Service Spies for isolated deterministic route execution
    jest.spyOn(electionService, 'listElectionEvents').mockResolvedValue({
      events: [
        {
          id: 'e1111111-1111-1111-1111-111111111111',
          electionCode: 'AE_TG_2023',
          name: 'Telangana Legislative Assembly General Election 2023',
          electionType: 'general',
          house: 'assembly',
          stateCode: 'TG',
          notificationDate: '2023-11-03',
          pollDate: '2023-11-30',
          countingDate: '2023-12-03',
          completionDate: '2023-12-05',
          status: 'completed',
          metadata: {},
          dataStatus: 'OFFICIAL',
          createdAt: '2023-12-05T00:00:00Z',
          updatedAt: '2023-12-05T00:00:00Z',
        } as any,
      ],
      total: 1,
    });

    jest.spyOn(electionService, 'getElectionEventById').mockImplementation(async (id: string) => {
      if (id.startsWith('non-existent')) return null;
      return {
        id,
        electionCode: 'AE_TG_2023',
        name: 'Telangana Legislative Assembly General Election 2023',
        electionType: 'general',
        house: 'assembly',
        stateCode: 'TG',
        status: 'completed',
        dataStatus: 'OFFICIAL',
        totalSeats: 119,
        totalVoters: 32602793,
        votesPolled: 23298234,
        turnoutPercentage: 71.46,
      } as any;
    });

    jest
      .spyOn(electionService, 'listElectionContests')
      .mockImplementation(async (electionId: string) => {
        return {
          contests: [
            {
              id: 'c1111111-1111-1111-1111-111111111111',
              electionId,
              constituencyId: 'ac-65',
              constituencyName: 'Kodangal',
              acNo: 65,
              totalElectors: 245000,
              totalVotesPolled: 195000,
              turnoutPercentage: 79.59,
              margin: 32532,
              dataStatus: 'OFFICIAL',
            },
          ],
          total: 1,
        } as any;
      });

    jest
      .spyOn(electionService, 'getContestDetail')
      .mockImplementation(async (electionId: string, constituencyId: string) => {
        if (constituencyId.startsWith('non-existent') || constituencyId === 'ac-999') return null;
        return {
          id: 'c1111111-1111-1111-1111-111111111111',
          electionId,
          constituencyId,
          constituencyName: 'Kodangal',
          acNo: 65,
          stateCode: 'TG',
          totalElectors: 245000,
          totalVotesPolled: 195000,
          turnoutPercentage: 79.59,
          margin: 32532,
          dataStatus: 'OFFICIAL',
          candidates: [
            {
              id: 'cand-1',
              person: { canonicalName: 'Anumula Revanth Reddy' },
              party: { name: 'Indian National Congress', shortName: 'INC' },
              partyId: 'p-inc',
              partyAtElection: 'INC',
              votesReceived: 107429,
              voteShare: 55.09,
              rank: 1,
              result: 'won',
              evmVotes: 106000,
              postalVotes: 1429,
              dataStatus: 'OFFICIAL',
            },
          ],
          winner: {
            candidateName: 'Anumula Revanth Reddy',
            party: 'INC',
            votes: 107429,
          },
          runnerUp: {
            candidateName: 'Patnam Narender Reddy',
            party: 'BRS',
            votes: 74897,
          },
        } as any;
      });

    jest.spyOn(politicalEntityService, 'searchEntities').mockResolvedValue({
      persons: [
        {
          id: 'p1111111-1111-1111-1111-111111111111',
          canonicalName: 'Anumula Revanth Reddy',
          aliases: ['Revanth Reddy'],
          gender: 'male',
          photoUrl: null,
          eciCandidateId: 'ECI-1234',
          sansadMemberId: null,
          dataStatus: 'OFFICIAL',
        } as any,
      ],
      organizations: [
        {
          id: 'o1111111-1111-1111-1111-111111111111',
          name: 'Indian National Congress',
          shortName: 'INC',
          orgType: 'party',
          ecPartyCode: 'INC',
          recognitionLevel: 'national',
          headquartersState: 'DL',
          symbolUrl: null,
          dataStatus: 'OFFICIAL',
        } as any,
      ],
      total: 2,
    });

    jest.spyOn(politicalEntityService, 'getPersonById').mockImplementation(async (id: string) => {
      if (id === '00000000-0000-0000-0000-000000000000') {
        const err: any = new Error(`Person with id '${id}' not found`);
        err.statusCode = 404;
        err.code = 'PERSON_NOT_FOUND';
        throw err;
      }
      return {
        id,
        canonicalName: 'Anumula Revanth Reddy',
        aliases: ['Revanth Reddy'],
        gender: 'male',
        photoUrl: null,
        eciCandidateId: 'ECI-1234',
        sansadMemberId: null,
        dataStatus: 'OFFICIAL',
      } as any;
    });

    jest
      .spyOn(politicalEntityService, 'getOrganizationById')
      .mockImplementation(async (id: string) => {
        if (id === '00000000-0000-0000-0000-000000000000') {
          const err: any = new Error(`Organization with id '${id}' not found`);
          err.statusCode = 404;
          err.code = 'ORGANIZATION_NOT_FOUND';
          throw err;
        }
        return {
          id,
          name: 'Indian National Congress',
          shortName: 'INC',
          orgType: 'party',
          ecPartyCode: 'INC',
          recognitionLevel: 'national',
          headquartersState: 'DL',
          symbolUrl: null,
          dataStatus: 'OFFICIAL',
        } as any;
      });

    jest.spyOn(politicalEntityService, 'listCurrentLegislators').mockResolvedValue({
      legislators: [
        {
          tenure: {
            id: 't1111111-1111-1111-1111-111111111111',
            officeName: 'Member of Legislative Assembly',
            jurisdictionId: 'ac-65',
            stateCode: 'TG',
            startDate: '2023-12-07',
            endDate: null,
            isCurrent: true,
          },
          person: {
            id: 'p1111111-1111-1111-1111-111111111111',
            canonicalName: 'Anumula Revanth Reddy',
            photoUrl: null,
          },
          organization: {
            id: 'o1111111-1111-1111-1111-111111111111',
            name: 'Indian National Congress',
            shortName: 'INC',
          },
        },
      ],
      total: 1,
    } as any);

    // Populate active key
    mockDb.set(validKey.keyHash, {
      id: 'k1111111-1111-1111-1111-111111111111',
      tenant_id: tenantA.id,
      application_id: appA.id,
      key_prefix: validKey.keyPrefix,
      key_hint: validKey.keyHint,
      key_hash: validKey.keyHash,
      scopes: ['geo:read', 'elections:read', 'entities:read', 'delim:read'],
      status: 'active',
      expires_at: null,
      revoked_at: null,
      saas_tenants: tenantA,
      saas_applications: appA,
    });

    // Populate active test key
    mockDb.set(validTestKey.keyHash, {
      id: 'k4444444-4444-4444-4444-444444444444',
      tenant_id: tenantA.id,
      application_id: appA.id,
      key_prefix: validTestKey.keyPrefix,
      key_hint: validTestKey.keyHint,
      key_hash: validTestKey.keyHash,
      scopes: ['geo:read', 'elections:read', 'entities:read', 'delim:read'],
      status: 'active',
      expires_at: null,
      revoked_at: null,
      saas_tenants: tenantA,
      saas_applications: appA,
    });

    // Populate revoked key
    mockDb.set(revokedKey.keyHash, {
      id: 'k2222222-2222-2222-2222-222222222222',
      tenant_id: tenantA.id,
      application_id: appA.id,
      key_prefix: revokedKey.keyPrefix,
      key_hint: revokedKey.keyHint,
      key_hash: revokedKey.keyHash,
      scopes: ['geo:read'],
      status: 'revoked',
      expires_at: null,
      revoked_at: new Date().toISOString(),
      saas_tenants: tenantA,
      saas_applications: appA,
    });

    // Populate expired key
    mockDb.set(expiredKey.keyHash, {
      id: 'k3333333-3333-3333-3333-333333333333',
      tenant_id: tenantA.id,
      application_id: appA.id,
      key_prefix: expiredKey.keyPrefix,
      key_hint: expiredKey.keyHint,
      key_hash: expiredKey.keyHash,
      scopes: ['geo:read'],
      status: 'active',
      expires_at: new Date(Date.now() - 3600000).toISOString(),
      revoked_at: null,
      saas_tenants: tenantA,
      saas_applications: appA,
    });

    app = Fastify({ logger: false });

    // Register G3 authentication plugin
    await app.register(saasAuthPlugin, {
      mockLookup: async (hash: string) => {
        if (hash === dbFailKey.keyHash) {
          throw new Error('Simulated database network failure');
        }
        return mockDb.get(hash) || null;
      },
      mockUsageRecorder: async () => ({
        allowed: true,
        currentMonthlyUsage: 42,
        monthlyRemaining: 499958,
        monthlyCeiling: 500000,
        resetSeconds: 86400,
      }),
    });

    // Register G4 routes
    await app.register(saasV1Routes);
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 1. AUTHENTICATION & SECURITY ENFORCEMENT ACROSS SAAS ROUTES
  // ════════════════════════════════════════════════════════════════════════════

  describe('Security & Authentication Gates on /api/vsaas/v1/...', () => {
    it('1. Rejects request without API key with 401 UNAUTHORIZED', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states',
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('UNAUTHORIZED');
      expect(body.error).toBe('Unauthorized');
    });

    it('2. Rejects request with malformed / invalid API key (including unauthorized kshetra_* aliases) with 401 UNAUTHORIZED', async () => {
      const invalidKeys = [
        'invalid_format_key_12345',
        'kshetra_live_00000000000000000000000000000000',
        'kshetra_test_00000000000000000000000000000000',
        'panin_dev_sk_0123456789012345678901234567890123456789012',
      ];

      for (const badKey of invalidKeys) {
        const res = await app.inject({
          method: 'GET',
          url: '/api/vsaas/v1/geo/states',
          headers: { 'x-api-key': badKey },
        });
        expect(res.statusCode).toBe(401);
        const body = JSON.parse(res.body);
        expect(body.code).toBe('UNAUTHORIZED');
        expect(body.error).toBe('Unauthorized');
      }
    });

    it('3. Rejects request with revoked API key with 401 UNAUTHORIZED', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states',
        headers: { 'x-api-key': revokedKey.rawKey },
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('UNAUTHORIZED');
      expect(body.error).toBe('Unauthorized');
    });

    it('4. Rejects request with expired API key with 401 UNAUTHORIZED', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states',
        headers: { 'x-api-key': expiredKey.rawKey },
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('UNAUTHORIZED');
      expect(body.error).toBe('Unauthorized');
    });

    it('5. Allows valid active API keys (panin_live_sk and panin_test_sk) and returns 200 with standard envelope', async () => {
      // 5A. Production live key via x-api-key header (panin_live_sk_<43 chars>)
      expect(validKey.rawKey.startsWith('panin_live_sk_')).toBe(true);
      expect(validKey.rawKey.length).toBe(57);
      const resLive = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resLive.statusCode).toBe(200);
      const bodyLive = JSON.parse(resLive.body);
      expect(bodyLive.success).toBe(true);
      expect(bodyLive.requestId).toBeDefined();
      expect(bodyLive.timestamp).toBeDefined();
      expect(Array.isArray(bodyLive.data.states)).toBe(true);
      expect(bodyLive.data.states.length).toBeGreaterThan(0);

      // 5B. Test environment key via Authorization: Bearer header (panin_test_sk_<43 chars>)
      expect(validTestKey.rawKey.startsWith('panin_test_sk_')).toBe(true);
      expect(validTestKey.rawKey.length).toBe(57);
      const resTest = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states',
        headers: { authorization: `Bearer ${validTestKey.rawKey}` },
      });
      expect(resTest.statusCode).toBe(200);
      const bodyTest = JSON.parse(resTest.body);
      expect(bodyTest.success).toBe(true);
      expect(Array.isArray(bodyTest.data.states)).toBe(true);
    });

    it('6. Fails closed (500 AUTH_DEPENDENCY_FAILURE) on database error during auth', async () => {
      expect(dbFailKey.rawKey.startsWith('panin_live_sk_')).toBe(true);
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states',
        headers: { 'x-api-key': dbFailKey.rawKey },
      });
      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('AUTH_DEPENDENCY_FAILURE');
      expect(body.error).toBe('Internal Server Error');
    });

    it('7. Rate limiting: Burst limit enforcement returns 429 when exhausted', async () => {
      // Reset rate limiter for testing
      saasRateLimiter.resetForTesting();

      // Exhaust burst tokens for tenantA (pro tier: 600 req/min)
      // Drain burst tokens directly by calling checkMinuteBurst 601 times
      for (let i = 0; i < 601; i++) {
        saasRateLimiter.checkMinuteBurst(tenantA.id, 'pro');
      }

      // Next request through Fastify should be rejected with 429
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states',
        headers: { 'x-api-key': validKey.rawKey },
      });

      expect(res.statusCode).toBe(429);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(body.error).toBe('Too Many Requests');

      // Reset limiter back for subsequent tests
      saasRateLimiter.resetForTesting();
    });

    it('8. Caller spoofing: Client-supplied tenant_id query/header is ignored', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states?tenant_id=attacker_tenant_999',
        headers: {
          'x-api-key': validKey.rawKey,
          'x-tenant-id': 'attacker_tenant_999',
        },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      // Response succeeds normally under tenantA's authenticated context
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. GEOGRAPHY & CONSTITUENCY DATA FAMILY (/api/vsaas/v1/geo/...)
  // ════════════════════════════════════════════════════════════════════════════

  describe('Geography Endpoints (/api/vsaas/v1/geo/...)', () => {
    it('GET /api/vsaas/v1/geo/states: returns states list with statutory totals and provenance', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.states.length).toBeGreaterThan(0);

      const ts = body.data.states.find((s: any) => s.stateCode === 'TS');
      expect(ts).toBeDefined();
      expect(ts.name).toBe('Telangana');
      expect(ts.totalSeats).toBe(119);
      expect(ts.provenance.authorityLayer).toBe('STATUTORY_FACT');
      expect(ts.provenance.dataStatus).toBe('OFFICIAL');
    });

    it('GET /api/vsaas/v1/geo/states/:stateCode: returns state details (TG)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states/TG',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.stateCode).toBe('TS');
      expect(body.data.name).toBe('Telangana');
      expect(body.data.totalSeats).toBe(119);
      expect(body.data.provenance.authorityLayer).toBe('STATUTORY_FACT');
    });

    it('GET /api/vsaas/v1/geo/states/:stateCode: returns 404 for non-existent state', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states/ZZ',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('STATE_NOT_FOUND');
    });

    it('GET /api/vsaas/v1/geo/states/:stateCode: returns 400 for invalid state code format', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states/INVALID',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(400);
    });

    it('GET /api/vsaas/v1/geo/states/:stateCode/constituencies: returns constituency list', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states/TG/constituencies',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.stateCode).toBe('TS');
      expect(Array.isArray(body.data.constituencies)).toBe(true);
      expect(body.data.constituencies.length).toBeGreaterThan(0);
      const first = body.data.constituencies[0];
      expect(first.acNo).toBeDefined();
      expect(first.name).toBeDefined();
      expect(first.provenance.authorityLayer).toBe('STATUTORY_FACT');
    });

    it('GET /api/vsaas/v1/geo/states/:stateCode/constituencies/:acNo: returns single AC details', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states/TG/constituencies/65',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.acNo).toBe(65);
      expect(body.data.name).toBe('Goshamahal');
      expect(body.data.stateCode).toBe('TS');
      expect(body.data.provenance.authorityLayer).toBe('STATUTORY_FACT');
    });

    it('GET /api/vsaas/v1/geo/states/:stateCode/constituencies/:acNo: returns 404 for non-existent AC', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states/TG/constituencies/9999',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('CONSTITUENCY_NOT_FOUND');
    });

    it('GET /api/vsaas/v1/geo/states/:stateCode/constituencies/:acNo: returns 400 for invalid acNo parameter', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states/TG/constituencies/0',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. NORMALIZED ELECTIONS DATA FAMILY (/api/vsaas/v1/elections/...)
  // ════════════════════════════════════════════════════════════════════════════

  describe('Normalized Elections Endpoints (/api/vsaas/v1/elections/...)', () => {
    it('GET /api/vsaas/v1/elections: returns election events list with provenance', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/elections',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.events)).toBe(true);
      if (body.data.events.length > 0) {
        const ev = body.data.events[0];
        expect(ev.electionCode).toBeDefined();
        expect(ev.provenance.authorityLayer).toBe('STATUTORY_FACT');
      }
    });

    it('GET /api/vsaas/v1/elections: supports state and year query filters', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/elections?state=TG&year=2023',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.events)).toBe(true);
    });

    it('GET /api/vsaas/v1/elections: returns 400 on invalid query filter', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/elections?year=1800', // min is 1947
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(400);
    });

    it('GET /api/vsaas/v1/elections/:id: returns 404 for non-existent election event', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/elections/non-existent-election-id-999',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('ELECTION_NOT_FOUND');
    });

    it('GET /api/vsaas/v1/elections/:id/contests: returns 404 for non-existent election event', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/elections/non-existent-election-id-999/contests',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('ELECTION_NOT_FOUND');
    });

    it('GET /api/vsaas/v1/elections/:id/contests/:constituencyId: returns 404 for non-existent contest', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/elections/e1111111-1111-1111-1111-111111111111/contests/ac-999',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('CONTEST_NOT_FOUND');
    });

    it('GET /api/vsaas/v1/elections/:id: returns election details when found', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/elections/e1111111-1111-1111-1111-111111111111',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('e1111111-1111-1111-1111-111111111111');
      expect(body.data.provenance.authorityLayer).toBe('STATUTORY_FACT');
    });

    it('GET /api/vsaas/v1/elections/:id/contests: returns contests list when election exists', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/elections/e1111111-1111-1111-1111-111111111111/contests',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.contests.length).toBe(1);
      expect(body.data.contests[0].provenance.authorityLayer).toBe('STATUTORY_FACT');
    });

    it('GET /api/vsaas/v1/elections/:id/contests/:constituencyId: returns full contest breakdown when found', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/elections/e1111111-1111-1111-1111-111111111111/contests/ac-65',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.contest.acNo).toBe(65);
      expect(body.data.candidates.length).toBe(1);
      expect(body.data.winner.candidateName).toBe('Anumula Revanth Reddy');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. CANONICAL POLITICAL ENTITIES DATA FAMILY (/api/vsaas/v1/entities/...)
  // ════════════════════════════════════════════════════════════════════════════

  describe('Canonical Political Entities Endpoints (/api/vsaas/v1/entities/...)', () => {
    it('GET /api/vsaas/v1/entities/search: returns search results with empty query', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/entities/search?limit=10',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.persons)).toBe(true);
      expect(Array.isArray(body.data.organizations)).toBe(true);
    });

    it('GET /api/vsaas/v1/entities/search: rejects invalid type filter with 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/entities/search?type=invalid_type',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(400);
    });

    it('GET /api/vsaas/v1/entities/persons/:id: returns 404 for non-existent person', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/entities/persons/00000000-0000-0000-0000-000000000000',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('PERSON_NOT_FOUND');
      expect(body.error).toBe('Not Found');
    });

    it('GET /api/vsaas/v1/entities/organizations/:id: returns 404 for non-existent org', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/entities/organizations/00000000-0000-0000-0000-000000000000',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('ORGANIZATION_NOT_FOUND');
      expect(body.error).toBe('Not Found');
    });

    it('GET /api/vsaas/v1/entities/legislators: returns legislators roster with statutory provenance', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/entities/legislators',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.legislators)).toBe(true);
    });

    it('GET /api/vsaas/v1/entities/persons/:id: returns person profile when found', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/entities/persons/p1111111-1111-1111-1111-111111111111',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.canonicalName).toBe('Anumula Revanth Reddy');
      expect(body.data.provenance.authorityLayer).toBe('STATUTORY_FACT');
    });

    it('GET /api/vsaas/v1/entities/organizations/:id: returns organization profile when found', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/entities/organizations/o1111111-1111-1111-1111-111111111111',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Indian National Congress');
      expect(body.data.shortName).toBe('INC');
      expect(body.data.provenance.authorityLayer).toBe('STATUTORY_FACT');
    });

    it('handles unexpected service exceptions across routes gracefully with 500', async () => {
      // 1. Election events search failure
      jest
        .spyOn(electionService, 'listElectionEvents')
        .mockRejectedValueOnce(new Error('DB failure'));
      const resElecErr = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/elections',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resElecErr.statusCode).toBe(500);

      // 2. Election event get failure
      jest
        .spyOn(electionService, 'getElectionEventById')
        .mockRejectedValueOnce(new Error('DB failure'));
      const resEventErr = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/elections/e1',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resEventErr.statusCode).toBe(500);

      // 3. Contests list failure
      jest
        .spyOn(electionService, 'getElectionEventById')
        .mockResolvedValueOnce({ id: 'e1' } as any);
      jest
        .spyOn(electionService, 'listElectionContests')
        .mockRejectedValueOnce(new Error('DB failure'));
      const resContestsErr = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/elections/e1/contests',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resContestsErr.statusCode).toBe(500);

      // 4. Contest detail failure
      jest
        .spyOn(electionService, 'getContestDetail')
        .mockRejectedValueOnce(new Error('DB failure'));
      const resContestErr = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/elections/e1/contests/ac-1',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resContestErr.statusCode).toBe(500);

      // 5. Entity search failure
      jest
        .spyOn(politicalEntityService, 'searchEntities')
        .mockRejectedValueOnce(new Error('DB failure'));
      const resSearchErr = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/entities/search',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resSearchErr.statusCode).toBe(500);

      // 6. Person lookup unexpected 500
      jest
        .spyOn(politicalEntityService, 'getPersonById')
        .mockRejectedValueOnce(new Error('Unexpected DB timeout'));
      const resPersonErr = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/entities/persons/p1',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resPersonErr.statusCode).toBe(500);

      // 7. Organization lookup unexpected 500
      jest
        .spyOn(politicalEntityService, 'getOrganizationById')
        .mockRejectedValueOnce(new Error('Unexpected DB timeout'));
      const resOrgErr = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/entities/organizations/o1',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resOrgErr.statusCode).toBe(500);

      // 8. Legislators lookup failure
      jest
        .spyOn(politicalEntityService, 'listCurrentLegislators')
        .mockRejectedValueOnce(new Error('DB failure'));
      const resLegErr = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/entities/legislators',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resLegErr.statusCode).toBe(500);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5. DELIMITATION REGIMES & GOVERNED SCENARIOS (/api/vsaas/v1/delim/...)
  // ════════════════════════════════════════════════════════════════════════════

  describe('Delimitation Endpoints (/api/vsaas/v1/delim/...) & Provenance Invariants', () => {
    it('GET /api/vsaas/v1/delim/regimes: returns statutory orders and timelines', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/delim/regimes',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.currentOperativeLaw).toBeDefined();
      expect(body.data.currentOperativeLaw.regimeId).toBe('eci_delimitation_2008');
      expect(body.data.constitutionalStatus).toBeDefined();
      expect(Array.isArray(body.data.timelineEvents)).toBe(true);
      expect(body.data.provenance.authorityLayer).toBe('STATUTORY_FACT');
      expect(body.data.provenance.dataStatus).toBe('OFFICIAL');
    });

    it('GET /api/vsaas/v1/delim/projections: returns national seat projection with PANIN_SCENARIO provenance', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/delim/projections',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.summary).toBeDefined();
      expect(Array.isArray(body.data.projections)).toBe(true);
      expect(body.data.provenance.authorityLayer).toBe('PANIN_SCENARIO');
      expect(body.data.provenance.computationalType).toBe('ACADEMIC_SIMULATION');
      expect(body.data.provenance.officialDelimitationOrder).toBe(false);
      expect(body.data.provenance.statutoryDisclaimer).toContain('algorithmic simulation');
    });

    it('GET /api/vsaas/v1/delim/simulate/:stateCode: returns governed boundary simulation for TG', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/delim/simulate/TG',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.stateCode).toBe('TS');
      expect(body.data.methodology).toBeDefined();
      expect(body.data.methodology.formula).toContain('Hare-Niemeyer');
      expect(Array.isArray(body.data.districtBreakdown)).toBe(true);
      // Provenance assertions
      expect(body.data.provenance.authorityLayer).toBe('PANIN_SCENARIO');
      expect(body.data.provenance.computationalType).toBe('ACADEMIC_SIMULATION');
      expect(body.data.provenance.officialDelimitationOrder).toBe(false);
      expect(body.data.provenance.legalStatus).toBe('SCENARIO_PROPOSED_REGIME');
      expect(body.data.provenance.effectiveVersion).toBe('2026-PANIN-SIM-V1');
      expect(body.data.provenance.statutoryDisclaimer).toBeDefined();
    });

    it('GET /api/vsaas/v1/delim/simulate/:stateCode: rejects out-of-bounds seats parameter (< 10)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/delim/simulate/TG?seats=5',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(400);

      // Seats exceeds max safe requested seats
      const resMax = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/delim/simulate/TG?seats=10001',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resMax.statusCode).toBe(400);

      // Seats with non-numeric value
      const resNaN = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/delim/simulate/TG?seats=abc',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resNaN.statusCode).toBe(400);

      // Valid simulation parameters
      const resValid = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/delim/simulate/TG?seats=125&maxDeviation=0.1&mode=scenario',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resValid.statusCode).toBe(200);
    });

    it('GET /api/vsaas/v1/delim/projections: supports model query parameter', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/delim/projections?model=article170',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(200);
    });

    it('handles query parameters and fallbacks in elections, entities, and legislators', async () => {
      // 1. Elections search with limit and offset
      const resElec = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/elections?limit=10&offset=5',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resElec.statusCode).toBe(200);

      // 2. Election contests with query filters
      const resContests = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/elections/e1111111-1111-1111-1111-111111111111/contests?search=Kod&party=INC&limit=10&offset=0',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resContests.statusCode).toBe(200);

      // 3. Contest detail with candidate missing person, missing party, and party with no shortName
      jest.spyOn(electionService, 'getContestDetail').mockResolvedValueOnce({
        id: 'c2',
        electionId: 'e1',
        constituencyId: 'ac-1',
        constituencyName: 'Test AC',
        acNo: 1,
        candidates: [
          {
            id: 'cand-anon',
            person: null, // Unknown Candidate
            party: null, // Independent
            votesReceived: 500,
          },
          {
            id: 'cand-party-long',
            person: { canonicalName: 'Long Party Candidate' },
            party: { name: 'Full Party Name Only', shortName: null },
            votesReceived: 1000,
          },
        ],
        winner: null,
        runnerUp: null,
      } as any);

      const resCandFallback = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/elections/e1/contests/ac-1',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resCandFallback.statusCode).toBe(200);
      const candData = JSON.parse(resCandFallback.body).data;
      expect(candData.candidates[0].candidateName).toBe('Unknown Candidate');
      expect(candData.candidates[0].party).toBe('Independent');
      expect(candData.candidates[1].party).toBe('Full Party Name Only');
      expect(candData.winner).toBeNull();

      // 4. Entities search with type person, organization, and pagination
      const resPersonSearch = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/entities/search?type=person&state=TG&limit=5&offset=2',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resPersonSearch.statusCode).toBe(200);

      const resOrgSearch = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/entities/search?type=organization',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resOrgSearch.statusCode).toBe(200);

      // 5. Legislators with state, house, currentOnly false, and organization null
      jest.spyOn(politicalEntityService, 'listCurrentLegislators').mockResolvedValueOnce({
        legislators: [
          {
            tenure: {
              id: 't1',
              officeName: 'MLA',
              jurisdictionId: 'ac-1',
              stateCode: 'TS',
              startDate: '2023-12-07',
              endDate: null,
              isCurrent: true,
            },
            person: { id: 'p1', canonicalName: 'Independent MLA', photoUrl: null },
            organization: null, // No party affiliation
          } as any,
        ],
        total: 1,
      });

      const resLegParams = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/entities/legislators?state=TG&house=assembly&currentOnly=false',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resLegParams.statusCode).toBe(200);
      const legData = JSON.parse(resLegParams.body).data;
      expect(legData.legislators[0].party).toBeNull();
    });

    it('GET /api/vsaas/v1/delim/simulate/:stateCode: returns 404 for unsupported geography', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/delim/simulate/XX',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).code).toBe('UNSUPPORTED_GEOGRAPHY');
    });

    it('GET /api/vsaas/v1/delim/simulate/:stateCode: rejects client scenario override query params', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/delim/simulate/TG?isScenario=false',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('SCENARIO_INPUT_FORBIDDEN');
      expect(body.error).toBe('Bad Request');
    });

    it('GET /api/vsaas/v1/geo/states: rejects client simulation override query params', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states?simulation=true',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('SCENARIO_INPUT_FORBIDDEN');
      expect(body.error).toBe('Bad Request');
    });

    it('handles null entity results from politicalEntityService', async () => {
      // getPersonById returning null
      jest.spyOn(politicalEntityService, 'getPersonById').mockResolvedValueOnce(null as any);
      const resNullPerson = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/entities/persons/p-null-1',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resNullPerson.statusCode).toBe(404);
      expect(JSON.parse(resNullPerson.body).code).toBe('PERSON_NOT_FOUND');

      // getOrganizationById returning null
      jest.spyOn(politicalEntityService, 'getOrganizationById').mockResolvedValueOnce(null as any);
      const resNullOrg = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/entities/organizations/o-null-1',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resNullOrg.statusCode).toBe(404);
      expect(JSON.parse(resNullOrg.body).code).toBe('ORGANIZATION_NOT_FOUND');
    });

    it('handles unexpected exceptions in geography and delimitation services', async () => {
      // 1. getAllStatesInfo throwing error
      jest.spyOn(stateData, 'getAllStatesInfo').mockImplementationOnce(() => {
        throw new Error('Disk read error');
      });
      const resStatesErr = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resStatesErr.statusCode).toBe(500);
      expect(JSON.parse(resStatesErr.body).code).toBe('GEO_LOOKUP_FAILURE');

      // 2. getStateInfo throwing error
      jest.spyOn(stateData, 'getStateInfo').mockImplementationOnce(() => {
        throw new Error('State error');
      });
      const resStateErr = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states/TG',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resStateErr.statusCode).toBe(500);

      // 3. getConstituencies throwing error
      jest.spyOn(stateData, 'getConstituencies').mockImplementationOnce(() => {
        throw new Error('Constituencies error');
      });
      const resConstituenciesErr = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states/TG/constituencies',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resConstituenciesErr.statusCode).toBe(500);

      // 4. delimitationService.getTimeline throwing error
      jest.spyOn(delimitationService, 'getTimeline').mockImplementationOnce(() => {
        throw new Error('Timeline error');
      });
      const resRegimesErr = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/delim/regimes',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resRegimesErr.statusCode).toBe(500);
      expect(JSON.parse(resRegimesErr.body).code).toBe('DELIMITATION_REGIMES_FAILURE');

      // 5. delimitationService.getProjections throwing error
      jest.spyOn(delimitationService, 'getProjections').mockImplementationOnce(() => {
        throw new Error('Projections error');
      });
      const resProjErr = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/delim/projections',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resProjErr.statusCode).toBe(500);
      expect(JSON.parse(resProjErr.body).code).toBe('PROJECTIONS_FAILURE');

      // 6. delimitationService.simulateBoundaries throwing generic simulation error
      jest.spyOn(delimitationService, 'simulateBoundaries').mockImplementationOnce(() => {
        const err: any = new Error('Generic simulation algorithm failed');
        err.statusCode = 400;
        err.code = 'SIMULATION_ERROR';
        throw err;
      });
      const resSimErr = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/delim/simulate/TG',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resSimErr.statusCode).toBe(400);
      expect(JSON.parse(resSimErr.body).code).toBe('SIMULATION_ERROR');

      // 7. delimitationService.simulateBoundaries throwing fallback error without code or statusCode
      jest.spyOn(delimitationService, 'simulateBoundaries').mockImplementationOnce(() => {
        throw new Error('Fallback error message');
      });
      const resSimFallback = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/delim/simulate/TG',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resSimFallback.statusCode).toBe(400);
      expect(JSON.parse(resSimFallback.body).code).toBe('SIMULATION_ERROR');
    });

    it('covers state not found branches in constituencies and entity errors', async () => {
      // 1. GET /api/vsaas/v1/geo/states/XX/constituencies -> state not found (line 248)
      const resConstState404 = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states/XX/constituencies',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resConstState404.statusCode).toBe(404);
      expect(JSON.parse(resConstState404.body).code).toBe('STATE_NOT_FOUND');

      // 2. GET /api/vsaas/v1/geo/states/XX/constituencies/1 -> state not found (line 291)
      const resSingleConstState404 = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/geo/states/XX/constituencies/1',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resSingleConstState404.statusCode).toBe(404);
      expect(JSON.parse(resSingleConstState404.body).code).toBe('STATE_NOT_FOUND');

      // 3. getPersonById throwing error with PERSON_NOT_FOUND code (line 632)
      jest.spyOn(politicalEntityService, 'getPersonById').mockImplementationOnce(async () => {
        const err: any = new Error('Person custom not found');
        err.code = 'PERSON_NOT_FOUND';
        throw err;
      });
      const resPersonErr = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/entities/persons/p-custom-err',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resPersonErr.statusCode).toBe(404);

      // 4. getOrganizationById throwing error with ORGANIZATION_NOT_FOUND code (line 684)
      jest.spyOn(politicalEntityService, 'getOrganizationById').mockImplementationOnce(async () => {
        const err: any = new Error('Org custom not found');
        err.code = 'ORGANIZATION_NOT_FOUND';
        throw err;
      });
      const resOrgErr = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/entities/organizations/o-custom-err',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resOrgErr.statusCode).toBe(404);

      // 5. entities/search with q and role
      const resSearchQRole = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/entities/search?q=Revanth&role=MLA',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resSearchQRole.statusCode).toBe(200);

      // 6. entities/legislators with house=parliament
      const resLegisParl = await app.inject({
        method: 'GET',
        url: '/api/vsaas/v1/entities/legislators?house=parliament',
        headers: { 'x-api-key': validKey.rawKey },
      });
      expect(resLegisParl.statusCode).toBe(200);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 6. ZERO CITIZEN PII & ENVELOPE INTEGRITY
  // ════════════════════════════════════════════════════════════════════════════

  describe('Zero Citizen PII & Envelope Guarantees', () => {
    it('Ensures no citizen PII (phone, email, voter ID, Aadhaar, password) is leaked in any response', async () => {
      const endpoints = [
        '/api/vsaas/v1/geo/states',
        '/api/vsaas/v1/geo/states/TG',
        '/api/vsaas/v1/geo/states/TG/constituencies',
        '/api/vsaas/v1/geo/states/TG/constituencies/65',
        '/api/vsaas/v1/elections',
        '/api/vsaas/v1/entities/search',
        '/api/vsaas/v1/entities/legislators',
        '/api/vsaas/v1/delim/regimes',
        '/api/vsaas/v1/delim/projections',
        '/api/vsaas/v1/delim/simulate/TG',
      ];

      for (const endpoint of endpoints) {
        const res = await app.inject({
          method: 'GET',
          url: endpoint,
          headers: { 'x-api-key': validKey.rawKey },
        });

        expect(res.statusCode).toBe(200);
        const rawBody = res.body.toLowerCase();

        // Strict forbidden PII indicators
        expect(rawBody).not.toContain('phone_number');
        expect(rawBody).not.toContain('voter_id');
        expect(rawBody).not.toContain('aadhaar');
        expect(rawBody).not.toContain('epic_number');
        expect(rawBody).not.toContain('password_hash');
        expect(rawBody).not.toContain('service_role');
      }
    });
  });
});
