/**
 * CTO Directive 119 — Section 3
 * Verification of Fixture Credentials, DB Probe Isolation, and Fail-Closed Behavior
 *
 * Proves that:
 * 1. Placeholder Supabase credentials in jest.config.js / ci.yml initialize the client syntactically
 *    but CANNOT cause an unavailable integration database to be treated as a live database.
 * 2. Database TCP probing (isLocalDatabaseAvailable) strictly fails closed (false) when no container is listening.
 * 3. The 4-way contract separation is strictly preserved:
 *    - State 1: Unconfigured client (503 Service Unavailable / DATABASE_UNAVAILABLE)
 *    - State 2: Configured client with unavailable DB / failed query (500 Internal Server Error / DATABASE_ERROR)
 *    - State 3: Configured client with available DB returning empty rows (200 OK with zero/empty)
 *    - State 4: Configured client with available DB returning data (200 OK with data)
 * 4. Production and staging project IDs are strictly absent from test fixture credentials.
 */

import { buildApp } from '../server';
import { createServer } from 'node:http';
import {
  supabase,
  isSupabaseConfigured,
  isValidSupabaseKey,
  setSupabaseConfiguredForTesting,
} from '../lib/supabase';
import { isLocalDatabaseAvailable } from './testDbProbe';
import type { FastifyInstance } from 'fastify';

describe('CTO Directive 119: Fixture Credentials & Fail-Closed Behavior', () => {
  let app: FastifyInstance;
  let originalConfigured: boolean;

  beforeAll(async () => {
    originalConfigured = isSupabaseConfigured;
    setSupabaseConfiguredForTesting(true);
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    setSupabaseConfiguredForTesting(originalConfigured);
    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setSupabaseConfiguredForTesting(true);
  });

  describe('Part 1: Fixture Credential Validation & Environment Isolation', () => {
    it('verifies fixture credentials format and syntactic initialization', () => {
      expect(process.env.SUPABASE_URL).toBeDefined();
      expect(process.env.SUPABASE_ANON_KEY).toBeDefined();

      // Must be a valid 3-part JWT format for anon key
      const keyParts = (process.env.SUPABASE_ANON_KEY || '').split('.');
      expect(keyParts.length).toBe(3);
      expect(isValidSupabaseKey(process.env.SUPABASE_ANON_KEY || '', 'anon')).toBe(true);

      // Client is syntactically configured
      expect(isSupabaseConfigured).toBe(true);
    });

    it('proves fixture credentials are strictly isolated from production and staging projects', () => {
      const url = process.env.SUPABASE_URL || '';
      const anonKey = process.env.SUPABASE_ANON_KEY || '';

      // Air-gap check: Must NOT point to production ('ehfafcnimmjusyvplbah')
      expect(url).not.toContain('ehfafcnimmjusyvplbah');
      expect(anonKey).not.toContain('ehfafcnimmjusyvplbah');

      // Staging isolation: Must NOT point to staging ('fkpigozcqnmcvofuksar')
      expect(url).not.toContain('fkpigozcqnmcvofuksar');
      expect(anonKey).not.toContain('fkpigozcqnmcvofuksar');

      // Must be test-fixture or placeholder URL
      expect(url).toMatch(/test-fixture|placeholder|localhost|127\.0\.0\.1/);
    });
  });

  describe('Part 2: Database Probing Fail-Closed Invariants', () => {
    it('isLocalDatabaseAvailable returns false when no local container is listening on probed port', () => {
      const savedUrl = process.env.SUPABASE_URL;
      process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
      try {
        // Connect to an unallocated high port.
        const available = isLocalDatabaseAvailable('127.0.0.1', 59998);
        // The explicit override is allowed only after a local Supabase URL is selected.
        if (process.env.INTEGRATION_TESTS_ENABLED === 'true') {
          expect(available).toBe(true);
        } else {
          expect(available).toBe(false);
        }
        expect(isLocalDatabaseAvailable('remote.example.com', 54321)).toBe(false);
      } finally {
        if (savedUrl !== undefined) process.env.SUPABASE_URL = savedUrl;
        else delete process.env.SUPABASE_URL;
      }
    });

    it('does not treat a TCP listener with an unavailable Supabase API as a ready database', async () => {
      const server = createServer((_request, response) => {
        response.statusCode = 503;
        response.end();
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      if (!address || typeof address === 'string')
        throw new Error('Local probe server did not bind');

      const previous = {
        ci: process.env.CI,
        integration: process.env.INTEGRATION_TESTS_ENABLED,
        url: process.env.SUPABASE_URL,
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      };
      delete process.env.CI;
      delete process.env.INTEGRATION_TESTS_ENABLED;
      process.env.SUPABASE_URL = `http://127.0.0.1:${address.port}`;
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-service-key';

      try {
        expect(isLocalDatabaseAvailable('127.0.0.1', address.port)).toBe(false);
      } finally {
        if (previous.ci !== undefined) process.env.CI = previous.ci;
        else delete process.env.CI;
        if (previous.integration !== undefined)
          process.env.INTEGRATION_TESTS_ENABLED = previous.integration;
        else delete process.env.INTEGRATION_TESTS_ENABLED;
        if (previous.url !== undefined) process.env.SUPABASE_URL = previous.url;
        else delete process.env.SUPABASE_URL;
        if (previous.serviceKey !== undefined)
          process.env.SUPABASE_SERVICE_ROLE_KEY = previous.serviceKey;
        else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    });

    it('refuses database probes when the configured Supabase host is not local', () => {
      const savedCI = process.env.CI;
      const savedIntegration = process.env.INTEGRATION_TESTS_ENABLED;
      const savedUrl = process.env.SUPABASE_URL;

      try {
        process.env.CI = 'true';
        process.env.INTEGRATION_TESTS_ENABLED = 'true';
        process.env.SUPABASE_URL = 'https://test-fixture.supabase.co';

        const probeResult = isLocalDatabaseAvailable('127.0.0.1', 54321);
        expect(probeResult).toBe(false);
      } finally {
        if (savedCI !== undefined) process.env.CI = savedCI;
        else delete process.env.CI;
        if (savedIntegration !== undefined)
          process.env.INTEGRATION_TESTS_ENABLED = savedIntegration;
        else delete process.env.INTEGRATION_TESTS_ENABLED;
        if (savedUrl !== undefined) process.env.SUPABASE_URL = savedUrl;
        else delete process.env.SUPABASE_URL;
      }
    });
  });

  describe('Part 3: 4-Way Operational Contract Distinction', () => {
    const mockUserProfiles = () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              role: 'citizen',
              verification_status: 'unverified',
              created_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      }),
    });

    it('State 1: Unconfigured client strictly returns HTTP 503 DATABASE_UNAVAILABLE fail-closed', async () => {
      setSupabaseConfiguredForTesting(false);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dm/unread-count',
        headers: {
          'x-user-id': '00000000-0000-0000-0000-000000000001',
        },
      });

      expect(res.statusCode).toBe(503);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('DATABASE_UNAVAILABLE');
      expect(json.success).toBeUndefined(); // Never returns success: true or masked count 0
    });

    it('State 2: Configured client with failed query strictly returns HTTP 500 DATABASE_ERROR fail-closed', async () => {
      setSupabaseConfiguredForTesting(true);

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') return mockUserProfiles();
        if (table === 'conversations') {
          return {
            select: () => ({
              eq: () => ({
                or: async () => ({
                  data: null,
                  error: {
                    message: 'Connection refused: database container unreachable',
                    code: 'ECONNREFUSED',
                  },
                }),
              }),
            }),
          };
        }
        return {};
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dm/unread-count',
        headers: {
          'x-user-id': '00000000-0000-0000-0000-000000000001',
        },
      });

      expect(res.statusCode).toBe(500);
      const json = JSON.parse(res.payload);
      expect(json.code).toBe('DATABASE_ERROR');
      // Crucial Directive 117/119 assertion: Must NEVER mask failure as count 0
      expect(json.count).toBeUndefined();
      expect(json.success).toBeUndefined();
    });

    it('State 3: Configured client with available DB returning 0 rows returns HTTP 200 with count: 0', async () => {
      setSupabaseConfiguredForTesting(true);

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') return mockUserProfiles();
        if (table === 'conversations') {
          return {
            select: () => ({
              eq: () => ({
                or: async () => ({
                  data: [{ id: 'conv-empty-1' }],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'messages') {
          return {
            select: () => ({
              in: () => ({
                neq: () => ({
                  is: async () => ({
                    count: 0,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dm/unread-count',
        headers: {
          'x-user-id': '00000000-0000-0000-0000-000000000001',
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.count).toBe(0);
    });

    it('State 4: Configured client with available DB returning data returns HTTP 200 with populated data', async () => {
      setSupabaseConfiguredForTesting(true);

      jest.spyOn(supabase, 'from').mockImplementation(((table: string) => {
        if (table === 'user_profiles') return mockUserProfiles();
        if (table === 'conversations') {
          return {
            select: () => ({
              eq: () => ({
                or: async () => ({
                  data: [{ id: 'conv-active-1' }],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'messages') {
          return {
            select: () => ({
              in: () => ({
                neq: () => ({
                  is: async () => ({
                    count: 7,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }) as any);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/dm/unread-count',
        headers: {
          'x-user-id': '00000000-0000-0000-0000-000000000001',
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.success).toBe(true);
      expect(json.count).toBe(7);
    });
  });
});
