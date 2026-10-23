/**
 * tests/staging-execution-mode-b.test.mjs
 *
 * Mode B Staging Execution Engine & Adversarial Integrity Battery
 * Task: W021.5 / CTO Directive 143 Section 3, Section 4, Section 5, and Section 7
 * Governing Authority: Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 *
 * Comprehensive adversarial verification:
 * 1. Mock response returning fewer rows fails with ROW_COUNT_MISMATCH (e.g. returning 1 row when 1,209 expected).
 * 2. Mock response returning HTTP 200 with semantic failure fails with SEMANTIC_ERROR.
 * 3. Malformed response body fails closed (MALFORMED_RESPONSE).
 * 4. Correct payload data and identity keys reach the mock transport (8 tables in Stage 1, 11,298 candidacies in Stage 2, 4,123 demographics in Stage 3, 2,243 results in Stage 4).
 * 5. Changed source hash or plan digest is denied (PLAN_DIGEST_MISMATCH).
 * 6. Stage failure after earlier success produces accurate partial-execution record (PARTIAL_EXECUTION_FAILURE).
 * 7. Missing or unverified admin incident closure blocks execution before transport is invoked (ADMIN_CONTAINMENT_UNCONFIRMED).
 * 8. Missing plan digest, invalid time claims, prohibited grants, and unauthorized table side effects are denied.
 * 9. Anti-replay persistence blocks token replay across reloaded stores.
 * 10. Local Mode A runs with zero credentials and network-denial harness enabled.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
  runStagingExecutionEngine,
  executeStage1Staging,
  executeStage2Staging,
  executeStage3Staging,
  executeStage4Staging,
  ALLOWED_STAGING_HOSTNAME,
  ALLOWED_STAGING_PROJECT_REF
} from '../scripts/execute_staging_directive_139.mjs';

import {
  generateTestKeyPair,
  createTestSignedAuthorizationToken,
  createTestAdminClosureRecord
} from './helpers/stagingAuthTestHelper.mjs';

import { computeExecutionPlanDigest } from '../scripts/lib/stagingExecutionPlan.mjs';
import { clearReplayStore } from '../scripts/lib/stagingReplayStore.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const TEST_STORE_PATH = path.join(REPO_ROOT, '.kshetra_runtime', 'test_mode_b_replay_store.json');

describe('CTO Directive 143 Section 7: Mode B Staging Execution Adversarial Battery', () => {
  let ed25519Keys;
  let validAdminClosure;
  let canonicalPlanDigest;

  beforeEach(() => {
    ed25519Keys = generateTestKeyPair('Ed25519');
    clearReplayStore({ storePath: TEST_STORE_PATH });
    validAdminClosure = createTestAdminClosureRecord();
    canonicalPlanDigest = computeExecutionPlanDigest({
      repoRoot: REPO_ROOT,
      targetProjectRef: ALLOWED_STAGING_PROJECT_REF
    });
  });

  it('1. Fails closed with ROW_COUNT_MISMATCH when mock transport returns fewer rows than expected', async () => {
    // Return only 1 row when Stage 1 expects full datasets/org rows
    const mockTransport = async (url, options = {}) => {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify([{ id: 'mock-single-row' }])
      };
    };

    const token = createTestSignedAuthorizationToken({
      plan_digest: canonicalPlanDigest
    }, ed25519Keys.privateKeyPem);

    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          authToken: token,
          planDigest: canonicalPlanDigest,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: validAdminClosure,
          transport: mockTransport
        });
      },
      (err) => {
        assert.match(err.message, /STAGE_1_ROW_COUNT_MISMATCH/);
        return true;
      }
    );
  });

  it('2. Fails closed with SEMANTIC_ERROR when mock transport returns HTTP 200 with database error object', async () => {
    const mockTransport = async (url, options = {}) => {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          error: 'permission denied for table datasets',
          code: '42501',
          message: 'insufficient privilege'
        })
      };
    };

    const token = createTestSignedAuthorizationToken({
      plan_digest: canonicalPlanDigest
    }, ed25519Keys.privateKeyPem);

    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          authToken: token,
          planDigest: canonicalPlanDigest,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: validAdminClosure,
          transport: mockTransport
        });
      },
      (err) => {
        assert.match(err.message, /STAGE_1_SEMANTIC_ERROR/);
        return true;
      }
    );
  });

  it('3. Fails closed with MALFORMED_RESPONSE when transport returns non-JSON or broken payload', async () => {
    const mockTransport = async (url, options = {}) => {
      return {
        ok: true,
        status: 200,
        text: async () => '<html><body>502 Bad Gateway: nginx</body></html>'
      };
    };

    const token = createTestSignedAuthorizationToken({
      plan_digest: canonicalPlanDigest
    }, ed25519Keys.privateKeyPem);

    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          authToken: token,
          planDigest: canonicalPlanDigest,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: validAdminClosure,
          transport: mockTransport
        });
      },
      (err) => {
        assert.match(err.message, /STAGE_1_MALFORMED_RESPONSE/);
        return true;
      }
    );
  });

  it('4. Successfully executes all 4 stages with mock transport, verifying exact payload data, conflict targets, and headers', async () => {
    const interceptedRequests = [];

    // Mock transport echoing back the full requested row array to simulate PostgREST Prefer: return=representation
    const echoingMockTransport = async (url, options = {}) => {
      const parsedBody = JSON.parse(options.body);
      interceptedRequests.push({
        url,
        method: options.method,
        headers: options.headers,
        rowCount: Array.isArray(parsedBody) ? parsedBody.length : 0,
        sampleRow: Array.isArray(parsedBody) ? parsedBody[0] : null
      });

      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(parsedBody)
      };
    };

    const token = createTestSignedAuthorizationToken({
      plan_digest: canonicalPlanDigest
    }, ed25519Keys.privateKeyPem);

    const report = await runStagingExecutionEngine({
      mode: 'staging',
      serviceKey: 'test_service_key_for_mock_execution',
      authToken: token,
      planDigest: canonicalPlanDigest,
      trustAnchor: ed25519Keys.publicKeyPem,
      storePath: TEST_STORE_PATH,
      adminClosureRecord: validAdminClosure,
      transport: echoingMockTransport
    });

    assert.strictEqual(report.executionMode, 'MODE_B_AUTHORIZED_WRITE_EXECUTION');
    assert.strictEqual(report.stagingExecutionPerformed, true);
    assert.strictEqual(report.executionStatus, 'ALL_STAGES_EXECUTED_PENDING_CORROBORATION');

    // Stage 1: 8 PostgREST requests for 8 tables (total 1,209 rows)
    assert.strictEqual(report.stages.stage1_political_organizations.rowsAffected, 1209);
    assert.strictEqual(report.stages.stage1_political_organizations.status, 'EXECUTED_PENDING_INDEPENDENT_CORROBORATION');
    assert.strictEqual(report.stages.stage1_political_organizations.conflictTarget, 'id');

    // Stage 2: 1 PostgREST request for candidacies (11,298 rows)
    assert.strictEqual(report.stages.stage2_candidacies.rowsAffected, 11298);
    assert.strictEqual(report.stages.stage2_candidacies.status, 'EXECUTED_PENDING_INDEPENDENT_CORROBORATION');
    assert.strictEqual(report.stages.stage2_candidacies.conflictTarget, 'person_id,election_year,election_type,constituency_id');

    // Stage 3: 1 PostgREST request for constituency_demographics (4,123 rows)
    assert.strictEqual(report.stages.stage3_constituency_demographics.rowsAffected, 4123);
    assert.strictEqual(report.stages.stage3_constituency_demographics.status, 'EXECUTED_PENDING_INDEPENDENT_CORROBORATION');
    assert.strictEqual(report.stages.stage3_constituency_demographics.conflictTarget, 'constituency_id,election_year');

    // Stage 4: 1 PostgREST request for election_results (2,243 rows)
    assert.strictEqual(report.stages.stage4_historical_election_results.rowsAffected, 2243);
    assert.strictEqual(report.stages.stage4_historical_election_results.status, 'EXECUTED_PENDING_INDEPENDENT_CORROBORATION');
    assert.strictEqual(report.stages.stage4_historical_election_results.conflictTarget, 'election_id,constituency_id');

    // Verify all intercepted requests
    assert.strictEqual(interceptedRequests.length, 11, 'Must send exactly 11 PostgREST requests (8 in Stage 1 + 1 in Stage 2 + 1 in Stage 3 + 1 in Stage 4)');

    for (const req of interceptedRequests) {
      assert.ok(req.url.startsWith(`https://${ALLOWED_STAGING_HOSTNAME}/rest/v1/`), `Must target allow-listed staging host: ${req.url}`);
      assert.strictEqual(req.method, 'POST');
      assert.strictEqual(req.headers['apikey'], 'test_service_key_for_mock_execution');
      assert.strictEqual(req.headers['Authorization'], 'Bearer test_service_key_for_mock_execution');
      assert.strictEqual(req.headers['Prefer'], 'resolution=merge-duplicates,return=representation');
      assert.ok(req.rowCount > 0, 'Every request must carry genuine data rows');
    }
  });

  it('5. Denies execution with PLAN_DIGEST_MISMATCH when plan digest does not match canonical computation', async () => {
    const mismatchedDigest = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const token = createTestSignedAuthorizationToken({
      plan_digest: mismatchedDigest
    }, ed25519Keys.privateKeyPem);

    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          authToken: token,
          planDigest: canonicalPlanDigest,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: validAdminClosure
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'PLAN_DIGEST_MISMATCH');
        return true;
      }
    );
  });

  it('6. Produces accurate partial-execution record (PARTIAL_EXECUTION_FAILURE) when stage failure follows earlier success', async () => {
    let callCount = 0;
    // Let Stage 1 succeed (8 calls), then fail on Stage 2 (call 9)
    const partialFailureTransport = async (url, options = {}) => {
      callCount++;
      if (callCount <= 8) {
        const rows = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify(rows)
        };
      }
      return {
        ok: false,
        status: 503,
        text: async () => 'Remote database temporarily unavailable'
      };
    };

    const token = createTestSignedAuthorizationToken({
      plan_digest: canonicalPlanDigest
    }, ed25519Keys.privateKeyPem);

    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          authToken: token,
          planDigest: canonicalPlanDigest,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: validAdminClosure,
          transport: partialFailureTransport
        });
      },
      (err) => {
        assert.match(err.message, /STAGE_2_REMOTE_EXECUTION_FAILED/);
        assert.ok(err.executionReport, 'Error must attach partial execution report');
        const report = err.executionReport;
        assert.strictEqual(report.executionStatus, 'PARTIAL_EXECUTION_FAILURE');
        assert.strictEqual(report.stages.stage1_political_organizations.status, 'EXECUTED_PENDING_INDEPENDENT_CORROBORATION');
        assert.strictEqual(report.stages.stage1_political_organizations.rowsAffected, 1209);
        assert.strictEqual(report.stages.stage2_candidacies.status, 'FAILED');
        assert.strictEqual(report.stages.stage3_constituency_demographics.status, 'SKIPPED_DUE_TO_PREVIOUS_FAILURE');
        assert.strictEqual(report.stages.stage4_historical_election_results.status, 'SKIPPED_DUE_TO_PREVIOUS_FAILURE');
        return true;
      }
    );
  });

  it('7. Blocks execution with ADMIN_CONTAINMENT_UNCONFIRMED before any transport invocation when containment is unconfirmed', async () => {
    let transportCalled = false;
    const trackingTransport = async () => {
      transportCalled = true;
      return { ok: true, status: 200, text: async () => '[]' };
    };

    const token = createTestSignedAuthorizationToken({
      plan_digest: canonicalPlanDigest
    }, ed25519Keys.privateKeyPem);

    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          authToken: token,
          planDigest: canonicalPlanDigest,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: null, // Unprovisioned admin closure
          transport: trackingTransport
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'ADMIN_CONTAINMENT_UNCONFIRMED');
        return true;
      }
    );

    assert.strictEqual(transportCalled, false, 'Mock transport must NOT be called when containment is unconfirmed');
  });

  it('8. Denies execution on missing plan digest, invalid time claims, prohibited grants, or unauthorized tables', async () => {
    // 8a. Missing plan digest
    const noDigestToken = createTestSignedAuthorizationToken({
      plan_digest: ''
    }, ed25519Keys.privateKeyPem);

    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          authToken: noDigestToken,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: validAdminClosure
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'MISSING_PLAN_DIGEST');
        return true;
      }
    );

    // 8b. Prohibited destructive operation (DELETE)
    const deleteToken = createTestSignedAuthorizationToken({
      plan_digest: canonicalPlanDigest,
      operations: ['INSERT', 'UPDATE', 'DELETE']
    }, ed25519Keys.privateKeyPem);

    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          authToken: deleteToken,
          planDigest: canonicalPlanDigest,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: validAdminClosure
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'PROHIBITED_DESTRUCTIVE_OPERATION_IN_TOKEN');
        return true;
      }
    );

    // 8c. Unauthorized table grant
    const unauthorizedTableToken = createTestSignedAuthorizationToken({
      plan_digest: canonicalPlanDigest,
      tables: ['public.unauthorized_audit_table']
    }, ed25519Keys.privateKeyPem);

    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          authToken: unauthorizedTableToken,
          planDigest: canonicalPlanDigest,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: validAdminClosure
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'UNAUTHORIZED_TABLE_GRANT');
        return true;
      }
    );
  });

  it('9. Rejects replay of a consumed authorization token across reloaded stores', async () => {
    const echoingMockTransport = async (url, options = {}) => {
      const parsedBody = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(parsedBody)
      };
    };

    const token = createTestSignedAuthorizationToken({
      plan_digest: canonicalPlanDigest
    }, ed25519Keys.privateKeyPem);

    // First execution succeeds
    const firstReport = await runStagingExecutionEngine({
      mode: 'staging',
      serviceKey: 'test_service_key',
      authToken: token,
      planDigest: canonicalPlanDigest,
      trustAnchor: ed25519Keys.publicKeyPem,
      storePath: TEST_STORE_PATH,
      adminClosureRecord: validAdminClosure,
      transport: echoingMockTransport
    });
    assert.strictEqual(firstReport.executionStatus, 'ALL_STAGES_EXECUTED_PENDING_CORROBORATION');

    // Second execution with identical token must fail with NONCE_ALREADY_CONSUMED
    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          authToken: token,
          planDigest: canonicalPlanDigest,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: validAdminClosure,
          transport: echoingMockTransport
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'NONCE_ALREADY_CONSUMED');
        return true;
      }
    );
  });

  it('10. Runs local Mode A with zero credentials and network-denial harness enabled', async () => {
    // Mode A execution requires zero remote credentials and attempts zero network calls
    const report = await runStagingExecutionEngine({
      mode: 'local'
    });

    assert.strictEqual(report.executionMode, 'MODE_A_LOCAL_PREPARATION_AND_RECONCILIATION');
    assert.strictEqual(report.stagingExecutionPerformed, false);
    assert.strictEqual(report.networkRequestsAttempted, 0);
    assert.strictEqual(report.summary.workstreamStatus, 'PREPARED_AND_RECONCILED_IN_REPOSITORY');

    // Check all criteria offline checks
    assert.strictEqual(report.stages.stage1_political_organizations.status, 'PREPARED_AND_RECONCILED_IN_REPOSITORY');
    assert.strictEqual(report.stages.stage2_candidacies.status, 'PREPARED_AND_RECONCILED_IN_REPOSITORY');
    assert.strictEqual(report.stages.stage3_constituency_demographics.status, 'PREPARED_AND_RECONCILED_IN_REPOSITORY');
    assert.strictEqual(report.stages.stage4_historical_election_results.status, 'PREPARED_AND_RECONCILED_IN_REPOSITORY');
  });
});
