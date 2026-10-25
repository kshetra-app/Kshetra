/**
 * Job 023 — Finding 4: PostgreSQL Integration Safety Guard Test Suite
 *
 * Verifies that the safety guard prevents execution of destructive tests unless
 * all criteria are strictly met (opt-in env, loopback host, dedicated db name,
 * and live server identity).
 *
 * Uses injected connection metadata and mock clients only — NEVER connects to or uses
 * real staging or production credentials.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePostgresTestUrl,
  verifyLiveServerIdentity,
  assertPostgresIntegrationSafe,
  PostgresSafetyError,
} from './helpers/postgresTestSafety.mjs';

describe('Job 023 — Finding 4: PostgreSQL Test Safety Guard Suite', () => {
  // 1. Missing opt-in flag
  test('SAFE-01: Throws when ENABLE_JOB023_POSTGRES_INTEGRATION is missing or false', () => {
    assert.throws(
      () => {
        validatePostgresTestUrl('postgresql://postgres:postgres@127.0.0.1:54334/job023_delimitation_test', {});
      },
      (err) => {
        assert.ok(err instanceof PostgresSafetyError);
        assert.ok(err.message.includes('disabled by default'));
        return true;
      }
    );

    assert.throws(
      () => {
        validatePostgresTestUrl(
          'postgresql://postgres:postgres@127.0.0.1:54334/job023_delimitation_test',
          { ENABLE_JOB023_POSTGRES_INTEGRATION: 'false' }
        );
      },
      PostgresSafetyError
    );
  });

  // 2. Refusal of Supabase endpoints
  test('SAFE-02: Strictly refuses Supabase and managed cloud endpoints', () => {
    const env = { ENABLE_JOB023_POSTGRES_INTEGRATION: 'true' };
    const cloudUrls = [
      'postgresql://postgres:secret@db.testproject.supabase.co:5432/job023_delimitation_test',
      'postgresql://postgres:secret@pooler.supabase.com:6543/job023_delimitation_test',
      'postgresql://postgres:secret@rds.us-east-1.amazonaws.com:5432/job023_delimitation_test',
      'postgresql://postgres:secret@ep-cool-project.neon.tech:5432/job023_delimitation_test',
      'postgresql://postgres:secret@containers-us-west-1.railway.app:5432/job023_delimitation_test',
    ];

    for (const url of cloudUrls) {
      assert.throws(
        () => validatePostgresTestUrl(url, env),
        (err) => {
          assert.ok(err instanceof PostgresSafetyError);
          assert.ok(err.message.includes('strictly forbidden'));
          return true;
        },
        `Must reject cloud endpoint: ${url}`
      );
    }
  });

  // 3. Refusal of non-loopback hosts
  test('SAFE-03: Refuses non-loopback remote hosts and public IPs', () => {
    const env = { ENABLE_JOB023_POSTGRES_INTEGRATION: 'true' };
    const remoteUrls = [
      'postgresql://postgres:postgres@198.51.100.1:5432/job023_delimitation_test',
      'postgresql://postgres:postgres@10.0.1.50:5432/job023_delimitation_test',
      'postgresql://postgres:postgres@postgres.production.internal:5432/job023_delimitation_test',
    ];

    for (const url of remoteUrls) {
      assert.throws(
        () => validatePostgresTestUrl(url, env),
        (err) => {
          assert.ok(err instanceof PostgresSafetyError);
          assert.ok(err.message.includes('not a local loopback address'));
          return true;
        }
      );
    }
  });

  // 4. Refusal of production / default database names
  test('SAFE-04: Refuses production and standard database names even on localhost', () => {
    const env = { ENABLE_JOB023_POSTGRES_INTEGRATION: 'true' };
    const prohibitedDbs = ['postgres', 'kshetra', 'staging', 'production', 'prod', 'template1', 'main'];

    for (const db of prohibitedDbs) {
      assert.throws(
        () => validatePostgresTestUrl(`postgresql://postgres:postgres@127.0.0.1:54334/${db}`, env),
        (err) => {
          assert.ok(err instanceof PostgresSafetyError);
          return true;
        },
        `Must reject prohibited database: ${db}`
      );
    }
  });

  // 5. Database name must match dedicated test pattern
  test('SAFE-05: Requires database name matching dedicated test pattern', () => {
    const env = { ENABLE_JOB023_POSTGRES_INTEGRATION: 'true' };
    assert.throws(
      () => validatePostgresTestUrl('postgresql://postgres:postgres@127.0.0.1:54334/arbitrary_name', env),
      (err) => {
        assert.ok(err instanceof PostgresSafetyError);
        assert.ok(err.message.includes('does not match required dedicated test pattern'));
        return true;
      }
    );
  });

  // 6. Live server identity check catches database mismatch
  test('SAFE-06: verifyLiveServerIdentity throws when live server reports unexpected database', async () => {
    const mockClient = {
      query: async () => ({
        rows: [
          {
            db_name: 'kshetra_prod',
            db_user: 'postgres',
            server_addr: '127.0.0.1',
            server_port: 54334,
            server_version: 'PostgreSQL 16.2',
          },
        ],
      }),
    };

    await assert.rejects(
      async () => {
        await verifyLiveServerIdentity(mockClient, 'job023_delimitation_test');
      },
      (err) => {
        assert.ok(err instanceof PostgresSafetyError);
        assert.ok(err.message.includes('Live database name mismatch'));
        return true;
      }
    );
  });

  // 7. Live server identity check catches remote server IP
  test('SAFE-07: verifyLiveServerIdentity throws when live server reports remote IP', async () => {
    const mockClient = {
      query: async () => ({
        rows: [
          {
            db_name: 'job023_delimitation_test',
            db_user: 'postgres',
            server_addr: '203.0.113.199', // Remote public IP
            server_port: 5432,
            server_version: 'PostgreSQL 16.2',
          },
        ],
      }),
    };

    await assert.rejects(
      async () => {
        await verifyLiveServerIdentity(mockClient, 'job023_delimitation_test');
      },
      (err) => {
        assert.ok(err instanceof PostgresSafetyError);
        assert.ok(err.message.includes('not a local loopback'));
        return true;
      }
    );
  });

  // 8. Positive path: valid configuration passes static and live checks
  test('SAFE-08: Valid loopback config and live identity pass assertion', async () => {
    const env = { ENABLE_JOB023_POSTGRES_INTEGRATION: 'true' };
    const url = 'postgresql://postgres:postgres@127.0.0.1:54334/job023_delimitation_test';

    const parsed = validatePostgresTestUrl(url, env);
    assert.equal(parsed.hostname, '127.0.0.1');
    assert.equal(parsed.database, 'job023_delimitation_test');

    const mockClient = {
      query: async () => ({
        rows: [
          {
            db_name: 'job023_delimitation_test',
            db_user: 'postgres',
            server_addr: '127.0.0.1',
            server_port: 54334,
            server_version: 'PostgreSQL 16.2',
          },
        ],
      }),
    };

    const safetyCheck = await assertPostgresIntegrationSafe(mockClient, url, env);
    assert.equal(safetyCheck.safe, true);
    assert.equal(safetyCheck.parsed.database, 'job023_delimitation_test');
    assert.equal(safetyCheck.live.db_name, 'job023_delimitation_test');
  });
});
