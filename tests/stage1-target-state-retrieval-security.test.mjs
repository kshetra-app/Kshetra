/**
 * tests/stage1-target-state-retrieval-security.test.mjs
 *
 * Stage 1 Target State Retrieval Security, Pagination & Fail-Closed Battery
 * Authority: CTO Directive 150 Section 2, Section 3 & Section 6.2
 * Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 *
 * Verifies all 10 mandated failure modes and security invariants:
 *  1. Non-OK status (HTTP 500/502/404) throws TARGET_STATE_READ_FAILED
 *  2. Malformed JSON response throws TARGET_STATE_MALFORMED_JSON
 *  3. Incomplete pagination throws TARGET_STATE_INCOMPLETE_PAGINATION
 *  4. Multi-page retrieval across 1,043 organization_aliases completes accurately without truncation
 *  5. HTTP 403 Forbidden response fails closed with TARGET_STATE_READ_FAILED (status: 403)
 *  6. Partial network failure on later pagination page fails closed with TARGET_STATE_NETWORK_ERROR
 *  7. Mutation PATCH matching 0 rows throws STAGE_1_UPDATE_TARGET_NOT_FOUND
 *  8. Mutation POST row count mismatch throws STAGE_1_ROW_COUNT_MISMATCH
 *  9. Modifying stage1IdempotentReconciler.mjs alters computeExecutionPlanDigest()
 * 10. Stage 2-only authorization token (CRIT-D02-02) denies Stage 1 execution with 0 requests and 0 mutations
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  fetchTargetDatabaseStateIsolated,
  executeStage1WithReconcilerIsolated,
  STAGE1_TABLES
} from './helpers/stagingStageTestAdapters.mjs';

import {
  generateCanonicalExecutionPlan,
  computeExecutionPlanDigest
} from '../scripts/lib/stagingExecutionPlan.mjs';

import {
  runStagingExecutionEngine,
  ALLOWED_STAGING_PROJECT_REF,
  ALLOWED_STAGING_HOSTNAME
} from '../scripts/execute_staging_directive_139.mjs';

import {
  generateTestKeyPair,
  generateTestAdminKeyPair,
  createTestSignedAuthorizationToken,
  createTestAdminClosureRecord,
  computeKeyFingerprint
} from './helpers/stagingAuthTestHelper.mjs';

import { clearReplayStore } from '../scripts/lib/stagingReplayStore.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const TEST_STORE_PATH = path.join(REPO_ROOT, 'reports', '.test_stage1_security_replay_store.json');

describe('CTO Directive 150: Stage 1 Target State Retrieval Security & Reconciliation Battery', () => {
  let ed25519Keys;
  let adminKeys;
  let validAdminClosure;
  let originalFetch;

  beforeEach(() => {
    ed25519Keys = generateTestKeyPair('Ed25519');
    adminKeys = generateTestAdminKeyPair();

    validAdminClosure = createTestAdminClosureRecord({
      incidentId: 'INC-2026-W021.5-ROTATION-VERIFIED',
      keyRotations: {
        supabaseJwtSecretRotated: true,
        serviceRoleKeyRotated: true,
        anonKeyRotated: true
      },
      accessAuditCompleted: true
    }, adminKeys.privateKeyPem);

    process.env.NODE_ENV = 'test';
    process.env.KSHETRA_AUTH_PUBLIC_KEY = ed25519Keys.publicKeyPem;
    process.env.KSHETRA_APPROVED_TRUST_ANCHOR_FINGERPRINT = computeKeyFingerprint(ed25519Keys.publicKeyPem);
    process.env.KSHETRA_ADMIN_PUBLIC_KEY = adminKeys.publicKeyPem;
    process.env.KSHETRA_ADMIN_CLOSURE_RECORD = JSON.stringify(validAdminClosure);
    process.env.KSHETRA_TEST_REPLAY_STORE_PATH = TEST_STORE_PATH;
    process.env.KSHETRA_STAGING_EXECUTION_SCOPE = 'STAGE_2';

    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.KSHETRA_AUTH_PUBLIC_KEY;
    delete process.env.KSHETRA_APPROVED_TRUST_ANCHOR_FINGERPRINT;
    delete process.env.KSHETRA_ADMIN_PUBLIC_KEY;
    delete process.env.KSHETRA_ADMIN_CLOSURE_RECORD;
    delete process.env.KSHETRA_TEST_REPLAY_STORE_PATH;
    delete process.env.KSHETRA_STAGING_EXECUTION_SCOPE;

    globalThis.fetch = originalFetch;
    clearReplayStore({ storePath: TEST_STORE_PATH });
  });

  // ─── 1. NON-OK STATUS THROWS TARGET_STATE_READ_FAILED ─────────────────────
  it('1. Fails closed with TARGET_STATE_READ_FAILED when target state GET returns HTTP 500/502/404', async () => {
    const mockTransport = async (url) => {
      return {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Database connection terminated unexpectedly'
      };
    };

    await assert.rejects(
      async () => {
        await fetchTargetDatabaseStateIsolated({
          transport: mockTransport,
          targetHost: 'https://fkpigozcqnmcvofuksar.supabase.co',
          serviceKey: 'test-key'
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'TARGET_STATE_READ_FAILED');
        assert.strictEqual(err.status, 500);
        assert.match(err.message, /TARGET_STATE_READ_FAILED/);
        return true;
      }
    );
  });

  // ─── 2. MALFORMED JSON THROWS TARGET_STATE_MALFORMED_JSON ───────────────────
  it('2. Fails closed with TARGET_STATE_MALFORMED_JSON when target response is non-JSON or truncated', async () => {
    const mockTransport = async () => {
      return {
        ok: true,
        status: 200,
        headers: { 'content-range': '0-0/1' },
        text: async () => '{"unclosed_json: '
      };
    };

    await assert.rejects(
      async () => {
        await fetchTargetDatabaseStateIsolated({
          transport: mockTransport,
          targetHost: 'https://fkpigozcqnmcvofuksar.supabase.co',
          serviceKey: 'test-key'
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'TARGET_STATE_MALFORMED_JSON');
        assert.match(err.message, /TARGET_STATE_MALFORMED_JSON/);
        return true;
      }
    );
  });

  // ─── 3. INCOMPLETE PAGINATION THROWS TARGET_STATE_INCOMPLETE_PAGINATION ───
  it('3. Fails closed with TARGET_STATE_INCOMPLETE_PAGINATION when retrieved count does not match Content-Range total', async () => {
    const mockTransport = async () => {
      return {
        ok: true,
        status: 200,
        headers: { 'content-range': '0-99/1043' },
        text: async () => JSON.stringify([]) // Returns 0 rows while totalCount is 1043
      };
    };

    await assert.rejects(
      async () => {
        await fetchTargetDatabaseStateIsolated({
          transport: mockTransport,
          targetHost: 'https://fkpigozcqnmcvofuksar.supabase.co',
          serviceKey: 'test-key'
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'TARGET_STATE_INCOMPLETE_PAGINATION');
        assert.match(err.message, /expected 1043 rows/);
        return true;
      }
    );
  });

  // ─── 4. COMPLETE MULTI-PAGE RETRIEVAL OF 1,043 ALIASES ────────────────────
  it('4. Successfully paginates and retrieves all 1,043 organization_aliases across 3 pages without truncation', async () => {
    const requestedRanges = [];
    const mockTransport = async (url, options = {}) => {
      const range = options.headers?.Range || '';
      requestedRanges.push(range);

      if (url.includes('/organization_aliases')) {
        if (range === '0-499') {
          const rows = Array.from({ length: 500 }, (_, i) => ({ id: `alias-${i}`, raw_lookup_key: `key_${i}` }));
          return {
            ok: true,
            status: 200,
            headers: { 'content-range': '0-499/1043' },
            text: async () => JSON.stringify(rows)
          };
        } else if (range === '500-999') {
          const rows = Array.from({ length: 500 }, (_, i) => ({ id: `alias-${500 + i}`, raw_lookup_key: `key_${500 + i}` }));
          return {
            ok: true,
            status: 200,
            headers: { 'content-range': '500-999/1043' },
            text: async () => JSON.stringify(rows)
          };
        } else if (range === '1000-1499') {
          const rows = Array.from({ length: 43 }, (_, i) => ({ id: `alias-${1000 + i}`, raw_lookup_key: `key_${1000 + i}` }));
          return {
            ok: true,
            status: 200,
            headers: { 'content-range': '1000-1042/1043' },
            text: async () => JSON.stringify(rows)
          };
        }
      }

      // Default empty array for other tables
      return {
        ok: true,
        status: 200,
        headers: { 'content-range': '*/0' },
        text: async () => '[]'
      };
    };

    const targetState = await fetchTargetDatabaseStateIsolated({
      transport: mockTransport,
      targetHost: 'https://fkpigozcqnmcvofuksar.supabase.co',
      serviceKey: 'test-key'
    }, { pageSize: 500 });

    const aliases = targetState['public.organization_aliases'];
    assert(Array.isArray(aliases), 'organization_aliases must be an array');
    assert.strictEqual(aliases.length, 1043, 'Must retrieve all 1,043 rows without truncation');
    assert.strictEqual(aliases[0].id, 'alias-0');
    assert.strictEqual(aliases[1042].id, 'alias-1042');
  });

  // ─── 5. 403 FORBIDDEN FAILS CLOSED ────────────────────────────────────────
  it('5. Fails closed with TARGET_STATE_READ_FAILED when PostgREST returns HTTP 403 Forbidden', async () => {
    const mockTransport = async () => {
      return {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => '{"message":"insufficient_privilege","code":"42501"}'
      };
    };

    await assert.rejects(
      async () => {
        await fetchTargetDatabaseStateIsolated({
          transport: mockTransport,
          targetHost: 'https://fkpigozcqnmcvofuksar.supabase.co',
          serviceKey: 'test-key'
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'TARGET_STATE_READ_FAILED');
        assert.strictEqual(err.status, 403);
        return true;
      }
    );
  });

  // ─── 6. PARTIAL NETWORK FAILURE ON LATER PAGE FAILS CLOSED ────────────────
  it('6. Fails closed with TARGET_STATE_NETWORK_ERROR when page 2 encounters network disconnection', async () => {
    let callCount = 0;
    const mockTransport = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: true,
          status: 200,
          headers: { 'content-range': '0-499/1000' },
          text: async () => JSON.stringify(Array.from({ length: 500 }, (_, i) => ({ id: `r-${i}` })))
        };
      }
      throw new Error('ECONNRESET: socket hang up');
    };

    await assert.rejects(
      async () => {
        await fetchTargetDatabaseStateIsolated({
          transport: mockTransport,
          targetHost: 'https://fkpigozcqnmcvofuksar.supabase.co',
          serviceKey: 'test-key'
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'TARGET_STATE_NETWORK_ERROR');
        assert.match(err.message, /socket hang up/);
        return true;
      }
    );
  });

  // ─── 7. MUTATION PATCH MATCHING 0 ROWS THROWS STAGE_1_UPDATE_TARGET_NOT_FOUND
  it('7. Fails closed with STAGE_1_UPDATE_TARGET_NOT_FOUND when PATCH matches 0 rows in target database', async () => {
    const mockTargetState = {
      'public.datasets': [
        {
          id: 'eci_political_parties',
          name: 'ECI Registered Political Parties & Recognized State/National Formations',
          domain: 'political_profiles',
          description: 'Older description awaiting update',
          source_id: 'eci',
          license: 'Government Open Data'
        }
      ],
      'public.dataset_versions': [],
      'public.provenance_records': [],
      'public.political_organizations': [],
      'public.organization_relationships': [],
      'public.organization_multilingual_names': [],
      'public.organization_symbols': [],
      'public.organization_aliases': []
    };

    const mockTransport = async (url, options = {}) => {
      if (options.method === 'PATCH') {
        return {
          ok: true,
          status: 200,
          json: async () => [] // Returns 0 modified rows!
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => JSON.parse(options.body || '[]')
      };
    };

    const authGrant = {
      executionScope: 'STAGE_1',
      adminContainmentConfirmed: true,
      criteria: new Set(['CRIT-C02-02']),
      operations: new Set(['SELECT', 'INSERT', 'UPDATE']),
      tables: new Set(STAGE1_TABLES)
    };

    await assert.rejects(
      async () => {
        await executeStage1WithReconcilerIsolated({
          repoRoot: REPO_ROOT,
          transport: mockTransport,
          authGrant,
          targetDatabaseState: mockTargetState
        });
      },
      (err) => {
        assert.match(err.message, /STAGE_1_UPDATE_TARGET_NOT_FOUND/);
        return true;
      }
    );
  });

  // ─── 8. MUTATION POST ROW COUNT MISMATCH THROWS STAGE_1_ROW_COUNT_MISMATCH
  it('8. Fails closed with STAGE_1_ROW_COUNT_MISMATCH when POST returns fewer rows than inserted', async () => {
    const mockTargetState = {
      'public.datasets': [],
      'public.dataset_versions': [],
      'public.provenance_records': [],
      'public.political_organizations': [],
      'public.organization_relationships': [],
      'public.organization_multilingual_names': [],
      'public.organization_symbols': [],
      'public.organization_aliases': []
    };

    const mockTransport = async (url, options = {}) => {
      if (options.method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => [{ id: 'mock-single-row' }] // Mismatch: inserted > 1
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => []
      };
    };

    const authGrant = {
      executionScope: 'STAGE_1',
      adminContainmentConfirmed: true,
      criteria: new Set(['CRIT-C02-02']),
      operations: new Set(['SELECT', 'INSERT', 'UPDATE']),
      tables: new Set(STAGE1_TABLES)
    };

    await assert.rejects(
      async () => {
        await executeStage1WithReconcilerIsolated({
          repoRoot: REPO_ROOT,
          transport: mockTransport,
          authGrant,
          targetDatabaseState: mockTargetState
        });
      },
      (err) => {
        assert.match(err.message, /STAGE_1_ROW_COUNT_MISMATCH/);
        return true;
      }
    );
  });

  // ─── 9. EXECUTION PLAN DIGEST SENSITIVITY TO RECONCILER ENGINE ─────────────
  it('9. Modifying stage1IdempotentReconciler.mjs changes the canonical execution plan digest', () => {
    const baseDigest = computeExecutionPlanDigest({
      repoRoot: REPO_ROOT,
      targetProjectRef: ALLOWED_STAGING_PROJECT_REF
    });
    assert(baseDigest && baseDigest.length === 64, 'Base digest must be 64-char hex SHA-256');

    // Create an isolated temp directory replicating repo structure
    const tmpDir = path.join(REPO_ROOT, 'scratch', '.tmp_stage1_digest_test');
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      fs.cpSync(path.join(REPO_ROOT, 'scripts'), path.join(tmpDir, 'scripts'), { recursive: true });
      fs.cpSync(path.join(REPO_ROOT, 'supabase'), path.join(tmpDir, 'supabase'), { recursive: true });
      fs.cpSync(path.join(REPO_ROOT, 'reports'), path.join(tmpDir, 'reports'), { recursive: true });
      fs.cpSync(path.join(REPO_ROOT, 'data'), path.join(tmpDir, 'data'), { recursive: true });

      // Compute digest in temp directory
      const tmpDigestBefore = computeExecutionPlanDigest({
        repoRoot: tmpDir,
        targetProjectRef: ALLOWED_STAGING_PROJECT_REF
      });

      // Mutate stage1IdempotentReconciler.mjs
      const reconcilerPath = path.join(tmpDir, 'scripts', 'lib', 'stage1IdempotentReconciler.mjs');
      fs.appendFileSync(reconcilerPath, '\n// SENSITIVITY TEST MUTATION\n', 'utf8');

      const tmpDigestAfter = computeExecutionPlanDigest({
        repoRoot: tmpDir,
        targetProjectRef: ALLOWED_STAGING_PROJECT_REF
      });

      assert.notStrictEqual(
        tmpDigestBefore,
        tmpDigestAfter,
        'Modifying stage1IdempotentReconciler.mjs MUST alter the computed plan digest'
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ─── 10. STAGE 2-ONLY TOKEN DENIES STAGE 1 WITH 0 MUTATIONS ────────────────
  it('10. Stage 2-only authorization token (CRIT-D02-02) denies Stage 1 execution with 0 requests and 0 mutations', async () => {
    let rawFetchCalls = 0;
    globalThis.fetch = async (url, options = {}) => {
      rawFetchCalls++;
      // Return success for Stage 2 candidacies
      if (url.includes('/candidacies')) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify(Array.from({ length: 11298 }, (_, i) => ({ id: `c-${i}` })))
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () => '[]'
      };
    };

    const canonicalPlanDigest = computeExecutionPlanDigest({
      repoRoot: REPO_ROOT,
      targetProjectRef: ALLOWED_STAGING_PROJECT_REF
    });

    // Token authorizes ONLY Stage 2 (CRIT-D02-02, public.candidacies, with operations INSERT, UPDATE, UPSERT)
    const token = createTestSignedAuthorizationToken({
      criteria: ['CRIT-D02-02'],
      tables: ['public.candidacies'],
      operations: ['INSERT', 'UPDATE', 'UPSERT'],
      plan_digest: canonicalPlanDigest
    }, ed25519Keys.privateKeyPem);

    const report = await runStagingExecutionEngine({
      mode: 'staging',
      serviceKey: 'test_service_key',
      authToken: token
    });

    assert.strictEqual(report.stagingExecutionPerformed, true);
    assert.strictEqual(report.executionStatus, 'REDUCED_SCOPE_EXECUTED_WITH_BLOCKED_STAGES_EXCLUDED');

    const s1 = report.stages.stage1_political_organizations;
    assert.strictEqual(s1.status, 'BLOCKED_NOT_DEPLOYABLE');
    assert.strictEqual(s1.deploymentStatus, 'BLOCKED_NOT_DEPLOYABLE');
    assert.strictEqual(s1.stagingExecuted, false);
    assert.strictEqual(s1.outboundRowsToStaging, 0);
    assert.strictEqual(s1.rowsAffected, 0);
    assert.strictEqual(s1.networkRequestsAttempted, 0);

    const s2 = report.stages.stage2_candidacies;
    assert.strictEqual(s2.status, 'EXECUTED_PENDING_INDEPENDENT_CORROBORATION');
    assert.strictEqual(s2.stagingExecuted, true);
    assert.strictEqual(s2.rowsAffected, 11298);
  });

  // ─── 11. POSITIVE PATH: VALID STAGE 1 TOKEN EXECUTES STAGE 1 (Directive 152) ─
  it('11. Positive path: valid Stage 1 token with executionScope STAGE_1 executes Stage 1 and skips Stage 2', async () => {
    let rawFetchCalls = 0;
    globalThis.fetch = async (url, options = {}) => {
      rawFetchCalls++;
      // Return empty valid target state for GET requests on all 8 tables
      if (!options.method || options.method === 'GET') {
        return {
          ok: true,
          status: 200,
          headers: { 'content-range': '*/0' },
          text: async () => '[]'
        };
      }
      // Return inserted rows for POST requests
      if (options.method === 'POST') {
        const payload = JSON.parse(options.body || '[]');
        return {
          ok: true,
          status: 201,
          json: async () => payload,
          text: async () => JSON.stringify(payload)
        };
      }
      // Return modified rows for PATCH requests
      if (options.method === 'PATCH') {
        const payload = JSON.parse(options.body || '{}');
        return {
          ok: true,
          status: 200,
          json: async () => [payload],
          text: async () => JSON.stringify([payload])
        };
      }
      return { ok: true, status: 200, text: async () => '[]', json: async () => [] };
    };

    const canonicalPlanDigest = computeExecutionPlanDigest({
      repoRoot: REPO_ROOT,
      targetProjectRef: ALLOWED_STAGING_PROJECT_REF
    });

    const token = createTestSignedAuthorizationToken({
      execution_scope: 'STAGE_1',
      criteria: ['CRIT-C02-02'],
      tables: STAGE1_TABLES,
      operations: ['SELECT', 'INSERT', 'UPDATE'],
      plan_digest: canonicalPlanDigest
    }, ed25519Keys.privateKeyPem);

    const report = await runStagingExecutionEngine({
      mode: 'staging',
      executionScope: 'STAGE_1',
      serviceKey: 'test_service_key',
      authToken: token
    });

    assert.strictEqual(report.stagingExecutionPerformed, true);
    const s1 = report.stages.stage1_political_organizations;
    assert.strictEqual(s1.criterionId, 'CRIT-C02-02');
    assert.strictEqual(s1.status, 'EXECUTED_PENDING_INDEPENDENT_CORROBORATION');
    assert.strictEqual(s1.stagingExecuted, true);

    const s2 = report.stages.stage2_candidacies;
    assert.strictEqual(s2.status, 'NOT_REQUESTED_IN_SCOPE');
    assert.strictEqual(s2.stagingExecuted, false);
    assert.strictEqual(s2.rowsAffected, 0);
  });

  // ─── 12. CROSS-SCOPE DENIAL: STAGE 1 TOKEN DENIED UNDER STAGE 2 SCOPE ─────
  it('12. Cross-scope denial: Stage 1 token attempted under Stage 2 scope fails closed', async () => {
    const canonicalPlanDigest = computeExecutionPlanDigest({
      repoRoot: REPO_ROOT,
      targetProjectRef: ALLOWED_STAGING_PROJECT_REF
    });

    const token = createTestSignedAuthorizationToken({
      execution_scope: 'STAGE_1',
      criteria: ['CRIT-C02-02'],
      tables: STAGE1_TABLES,
      operations: ['SELECT', 'INSERT', 'UPDATE'],
      plan_digest: canonicalPlanDigest
    }, ed25519Keys.privateKeyPem);

    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          executionScope: 'STAGE_2',
          serviceKey: 'test_service_key',
          authToken: token
        });
      },
      (err) => {
        assert(
          err.code === 'CROSS_SCOPE_GRANT_FORBIDDEN' ||
          err.code === 'BLOCKED_CRITERION_GRANT_FORBIDDEN' ||
          err.code === 'BLOCKED_TABLE_GRANT_FORBIDDEN'
        );
        return true;
      }
    );
  });

  // ─── 13. CROSS-SCOPE DENIAL: STAGE 2 TOKEN DENIED UNDER STAGE 1 SCOPE ─────
  it('13. Cross-scope denial: Stage 2 token attempted under Stage 1 scope fails closed', async () => {
    const canonicalPlanDigest = computeExecutionPlanDigest({
      repoRoot: REPO_ROOT,
      targetProjectRef: ALLOWED_STAGING_PROJECT_REF
    });

    const token = createTestSignedAuthorizationToken({
      execution_scope: 'STAGE_2',
      criteria: ['CRIT-D02-02'],
      tables: ['public.candidacies'],
      operations: ['INSERT', 'UPDATE', 'UPSERT'],
      plan_digest: canonicalPlanDigest
    }, ed25519Keys.privateKeyPem);

    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          executionScope: 'STAGE_1',
          serviceKey: 'test_service_key',
          authToken: token
        });
      },
      (err) => {
        assert(
          err.code === 'CROSS_SCOPE_GRANT_FORBIDDEN' ||
          err.code === 'UNAUTHORIZED_CRITERION' ||
          err.code === 'UNAUTHORIZED_TABLE_GRANT'
        );
        return true;
      }
    );
  });

  // ─── 14. PAGINATION: MISSING CONTENT-RANGE HEADER ─────────────────────────
  it('14. Fails closed with TARGET_STATE_MISSING_CONTENT_RANGE when Content-Range header is missing', async () => {
    const mockTransport = async () => {
      return {
        ok: true,
        status: 200,
        headers: {},
        text: async () => '[]'
      };
    };

    await assert.rejects(
      async () => {
        await fetchTargetDatabaseStateIsolated({
          transport: mockTransport,
          targetHost: 'https://fkpigozcqnmcvofuksar.supabase.co',
          serviceKey: 'test-key'
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'TARGET_STATE_MISSING_CONTENT_RANGE');
        return true;
      }
    );
  });

  // ─── 15. PAGINATION: WILDCARD TOTAL FORBIDDEN ─────────────────────────────
  it('15. Fails closed with TARGET_STATE_WILDCARD_TOTAL_FORBIDDEN when Content-Range contains wildcard total', async () => {
    const mockTransport = async () => {
      return {
        ok: true,
        status: 200,
        headers: { 'content-range': '0-99/*' },
        text: async () => '[]'
      };
    };

    await assert.rejects(
      async () => {
        await fetchTargetDatabaseStateIsolated({
          transport: mockTransport,
          targetHost: 'https://fkpigozcqnmcvofuksar.supabase.co',
          serviceKey: 'test-key'
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'TARGET_STATE_WILDCARD_TOTAL_FORBIDDEN');
        return true;
      }
    );
  });

  // ─── 16. PAGINATION: MALFORMED CONTENT-RANGE ──────────────────────────────
  it('16. Fails closed with TARGET_STATE_MALFORMED_CONTENT_RANGE when Content-Range is syntactically invalid', async () => {
    const mockTransport = async () => {
      return {
        ok: true,
        status: 200,
        headers: { 'content-range': 'invalid-content-range-syntax' },
        text: async () => '[]'
      };
    };

    await assert.rejects(
      async () => {
        await fetchTargetDatabaseStateIsolated({
          transport: mockTransport,
          targetHost: 'https://fkpigozcqnmcvofuksar.supabase.co',
          serviceKey: 'test-key'
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'TARGET_STATE_MALFORMED_CONTENT_RANGE');
        return true;
      }
    );
  });

  // ─── 17. PAGINATION: RANGE START MISMATCH ─────────────────────────────────
  it('17. Fails closed with TARGET_STATE_PAGINATION_RANGE_INVALID when range start does not match offset', async () => {
    const mockTransport = async () => {
      return {
        ok: true,
        status: 200,
        headers: { 'content-range': '10-19/20' }, // starts at 10 instead of 0
        text: async () => JSON.stringify(Array.from({ length: 10 }, (_, i) => ({ id: `row-${i}` })))
      };
    };

    await assert.rejects(
      async () => {
        await fetchTargetDatabaseStateIsolated({
          transport: mockTransport,
          targetHost: 'https://fkpigozcqnmcvofuksar.supabase.co',
          serviceKey: 'test-key'
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'TARGET_STATE_PAGINATION_RANGE_INVALID');
        assert.match(err.message, /Range start 10 does not match expected offset 0/);
        return true;
      }
    );
  });

  // ─── 18. PAGINATION: RANGE END MISMATCH ───────────────────────────────────
  it('18. Fails closed with TARGET_STATE_PAGINATION_RANGE_INVALID when range end does not match offset + rows - 1', async () => {
    const mockTransport = async () => {
      return {
        ok: true,
        status: 200,
        headers: { 'content-range': '0-15/20' }, // reports 0-15 (16 rows) but body only has 10 rows
        text: async () => JSON.stringify(Array.from({ length: 10 }, (_, i) => ({ id: `row-${i}` })))
      };
    };

    await assert.rejects(
      async () => {
        await fetchTargetDatabaseStateIsolated({
          transport: mockTransport,
          targetHost: 'https://fkpigozcqnmcvofuksar.supabase.co',
          serviceKey: 'test-key'
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'TARGET_STATE_PAGINATION_RANGE_INVALID');
        assert.match(err.message, /Range end 15 does not match expected offset \+ rows - 1/);
        return true;
      }
    );
  });

  // ─── 19. PAGINATION: TOTAL COUNT CHANGED ACROSS PAGES ─────────────────────
  it('19. Fails closed with TARGET_STATE_PAGINATION_TOTAL_CHANGED when total count changes across pages', async () => {
    const mockTransport = async (url, options = {}) => {
      const range = options.headers?.Range || '';
      if (range === '0-9') {
        return {
          ok: true,
          status: 200,
          headers: { 'content-range': '0-9/25' }, // total is 25 on page 0
          text: async () => JSON.stringify(Array.from({ length: 10 }, (_, i) => ({ id: `row-${i}` })))
        };
      } else {
        return {
          ok: true,
          status: 200,
          headers: { 'content-range': '10-19/30' }, // total changed to 30 on page 1!
          text: async () => JSON.stringify(Array.from({ length: 10 }, (_, i) => ({ id: `row-${10 + i}` })))
        };
      }
    };

    await assert.rejects(
      async () => {
        await fetchTargetDatabaseStateIsolated({
          transport: mockTransport,
          targetHost: 'https://fkpigozcqnmcvofuksar.supabase.co',
          serviceKey: 'test-key'
        }, { pageSize: 10 });
      },
      (err) => {
        assert.strictEqual(err.code, 'TARGET_STATE_PAGINATION_TOTAL_CHANGED');
        assert.match(err.message, /Total count changed from 25 to 30/);
        return true;
      }
    );
  });

  // ─── 20. PAGINATION: OVERLAPPING / DUPLICATE ROWS DETECTED ────────────────
  it('20. Fails closed with TARGET_STATE_PAGINATION_OVERLAPPING_ROWS when duplicate row ID is returned', async () => {
    const mockTransport = async (url, options = {}) => {
      const range = options.headers?.Range || '';
      if (range === '0-9') {
        return {
          ok: true,
          status: 200,
          headers: { 'content-range': '0-9/20' },
          text: async () => JSON.stringify(Array.from({ length: 10 }, (_, i) => ({ id: `row-${i}` })))
        };
      } else {
        // Page 1 re-emits row-9 (overlap with page 0)
        const rows = [{ id: 'row-9' }, ...Array.from({ length: 9 }, (_, i) => ({ id: `row-${11 + i}` }))];
        return {
          ok: true,
          status: 200,
          headers: { 'content-range': '10-19/20' },
          text: async () => JSON.stringify(rows)
        };
      }
    };

    await assert.rejects(
      async () => {
        await fetchTargetDatabaseStateIsolated({
          transport: mockTransport,
          targetHost: 'https://fkpigozcqnmcvofuksar.supabase.co',
          serviceKey: 'test-key'
        }, { pageSize: 10 });
      },
      (err) => {
        assert.strictEqual(err.code, 'TARGET_STATE_PAGINATION_OVERLAPPING_ROWS');
        assert.match(err.message, /Duplicate or overlapping row ID "row-9"/);
        return true;
      }
    );
  });

  // ─── 21. PAGINATION: EMPTY TABLE WITH BODY ROWS FORBIDDEN ─────────────────
  it('21. Fails closed with TARGET_STATE_INVALID_EMPTY_RESPONSE when */0 contains body rows', async () => {
    const mockTransport = async () => {
      return {
        ok: true,
        status: 200,
        headers: { 'content-range': '*/0' },
        text: async () => JSON.stringify([{ id: 'unexpected-row' }])
      };
    };

    await assert.rejects(
      async () => {
        await fetchTargetDatabaseStateIsolated({
          transport: mockTransport,
          targetHost: 'https://fkpigozcqnmcvofuksar.supabase.co',
          serviceKey: 'test-key'
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'TARGET_STATE_INVALID_EMPTY_RESPONSE');
        return true;
      }
    );
  });
});
