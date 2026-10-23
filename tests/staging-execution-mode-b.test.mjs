/**
 * tests/staging-execution-mode-b.test.mjs
 *
 * Mode B Staging Execution Engine & Adversarial Integrity Battery
 * Tasks: W021.5 / CTO Directive 143, 144, 145
 * Governing Authority: Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 *
 * Directive 145 Remediation Enforcements:
 * Workstream A:
 *  - INTERNAL_EXECUTION_TOKEN and assertInternalExecutionContext are strictly private.
 *  - __test_only_adapters__ and stage execution functions are NOT exported from the operational module.
 *  - Caller-controlled trust anchor injection (options.trustAnchor, options.adminTrustAnchor, options.adminKeyPath) is strictly prohibited.
 *  - Caller-controlled admin closure record injection (options.adminClosureRecord, options.adminRecordPath) is strictly prohibited.
 *  - Caller-controlled replay store injection (options.storePath) is strictly prohibited.
 *  - Caller-controlled transport injection (options.transport, options.customFetch, options.fetch) is strictly prohibited.
 *  - Fixed operational transport enforces HTTPS and authorized staging hostname (fkpigozcqnmcvofuksar.supabase.co) before outbound call.
 *
 * Workstream B:
 *  - Canonical plan digest covers execution boundary, transformation scripts, schema migrations, and source artifacts.
 *  - Digest sensitivity proven in isolated temporary repository copy across transformation, source data, migration, and boundary changes.
 *
 * Workstream C:
 *  - Offline schema-contract preflight validates columns, types, nullability, enums, FKs, and conflict targets before Stage 1 request.
 *  - Stage 3 & Stage 4 are BLOCKED_NOT_DEPLOYABLE with 0 outbound rows to staging.
 *
 * Workstream D:
 *  - Mode B runner classifies overall operation as REDUCED_SCOPE_EXECUTED_WITH_BLOCKED_STAGES_EXCLUDED when Stages 3 & 4 are blocked.
 *  - Mode A runner classifies workstreamStatus as PARTIALLY_READY_WITH_BLOCKED_STAGES with zero database execution.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import * as operationalModule from '../scripts/execute_staging_directive_139.mjs';
const {
  runStagingExecutionEngine,
  ALLOWED_STAGING_HOSTNAME,
  ALLOWED_STAGING_PROJECT_REF,
  PROHIBITED_PRODUCTION_REF
} = operationalModule;

import {
  generateTestKeyPair,
  generateTestAdminKeyPair,
  createTestSignedAuthorizationToken,
  createTestAdminClosureRecord,
  computeKeyFingerprint
} from './helpers/stagingAuthTestHelper.mjs';

import {
  executeStage1TestIsolated,
  executeStage2TestIsolated
} from './helpers/stagingStageTestAdapters.mjs';

import { computeExecutionPlanDigest } from '../scripts/lib/stagingExecutionPlan.mjs';
import { clearReplayStore } from '../scripts/lib/stagingReplayStore.mjs';
import { validatePlanSchemaContracts } from '../scripts/lib/stagingSchemaPreflight.mjs';
import { BLOCKED_STAGING_TABLES, BLOCKED_CRITERIA } from '../scripts/lib/stagingAuthorization.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const TEST_STORE_PATH = path.join(REPO_ROOT, '.kshetra_runtime', 'test_mode_b_replay_store.json');

describe('CTO Directive 146: Mode B Staging Execution & Non-Bypassable Boundary Battery', () => {
  let ed25519Keys;
  let adminKeys;
  let validAdminClosure;
  let canonicalPlanDigest;
  let originalFetch;

  beforeEach(() => {
    ed25519Keys = generateTestKeyPair('Ed25519');
    adminKeys = generateTestAdminKeyPair('Ed25519');
    validAdminClosure = createTestAdminClosureRecord({}, adminKeys.privateKeyPem);
    clearReplayStore({ storePath: TEST_STORE_PATH });

    process.env.NODE_ENV = 'test';
    process.env.KSHETRA_AUTH_PUBLIC_KEY = ed25519Keys.publicKeyPem;
    process.env.KSHETRA_APPROVED_TRUST_ANCHOR_FINGERPRINT = computeKeyFingerprint(ed25519Keys.publicKeyPem);
    process.env.KSHETRA_ADMIN_PUBLIC_KEY = adminKeys.publicKeyPem;
    process.env.KSHETRA_ADMIN_CLOSURE_RECORD = JSON.stringify(validAdminClosure);
    process.env.KSHETRA_TEST_REPLAY_STORE_PATH = TEST_STORE_PATH;

    canonicalPlanDigest = computeExecutionPlanDigest({
      repoRoot: REPO_ROOT,
      targetProjectRef: ALLOWED_STAGING_PROJECT_REF
    });

    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.KSHETRA_AUTH_PUBLIC_KEY;
    delete process.env.KSHETRA_APPROVED_TRUST_ANCHOR_FINGERPRINT;
    delete process.env.KSHETRA_ADMIN_PUBLIC_KEY;
    delete process.env.KSHETRA_ADMIN_CLOSURE_RECORD;
    delete process.env.KSHETRA_TEST_REPLAY_STORE_PATH;

    globalThis.fetch = originalFetch;
    clearReplayStore({ storePath: TEST_STORE_PATH });
  });

  // ─── 1. TRANSPORT SEMANTICS & PAYLOAD INTEGRITY ────────────────────────────

  it('1. Fails closed with ROW_COUNT_MISMATCH when mock transport returns fewer rows than expected', async () => {
    globalThis.fetch = async (url, options = {}) => {
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
          authToken: token
        });
      },
      (err) => {
        assert.match(err.message, /STAGE_2_ROW_COUNT_MISMATCH/);
        return true;
      }
    );
  });

  it('2. Fails closed with SEMANTIC_ERROR when mock transport returns HTTP 200 with database error object', async () => {
    globalThis.fetch = async (url, options = {}) => {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          error: 'permission denied for table candidacies',
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
          authToken: token
        });
      },
      (err) => {
        assert.match(err.message, /STAGE_2_SEMANTIC_ERROR/);
        return true;
      }
    );
  });

  it('3. Fails closed with MALFORMED_RESPONSE when transport returns non-JSON or broken payload', async () => {
    globalThis.fetch = async (url, options = {}) => {
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
          authToken: token
        });
      },
      (err) => {
        assert.match(err.message, /STAGE_2_MALFORMED_RESPONSE/);
        return true;
      }
    );
  });

  it('4. Successfully executes Stage 2 with mock transport; Stages 1, 3 & 4 blocked; status is REDUCED_SCOPE_EXECUTED_WITH_BLOCKED_STAGES_EXCLUDED', async () => {
    const interceptedRequests = [];

    globalThis.fetch = async (url, options = {}) => {
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
      authToken: token
    });

    assert.strictEqual(report.executionMode, 'MODE_B_AUTHORIZED_WRITE_EXECUTION');
    assert.strictEqual(report.stagingExecutionPerformed, true);
    assert.strictEqual(report.executionStatus, 'REDUCED_SCOPE_EXECUTED_WITH_BLOCKED_STAGES_EXCLUDED');

    // Stage 1: Blocked (Directive 146 Section 4: 0 rows to staging)
    assert.strictEqual(report.stages.stage1_political_organizations.rowsAffected, 0);
    assert.strictEqual(report.stages.stage1_political_organizations.outboundRowsToStaging, 0);
    assert.strictEqual(report.stages.stage1_political_organizations.status, 'BLOCKED_NOT_DEPLOYABLE');

    // Stage 2: 1 PostgREST request for candidacies (11,298 rows)
    assert.strictEqual(report.stages.stage2_candidacies.rowsAffected, 11298);
    assert.strictEqual(report.stages.stage2_candidacies.status, 'EXECUTED_PENDING_INDEPENDENT_CORROBORATION');
    assert.strictEqual(report.stages.stage2_candidacies.conflictTarget, 'person_id,election_year,election_type,constituency_id');

    // Stage 3: Blocked (Directive 145 Item 6 & 7: 0 rows to staging)
    assert.strictEqual(report.stages.stage3_constituency_demographics.rowsAffected, 0);
    assert.strictEqual(report.stages.stage3_constituency_demographics.status, 'BLOCKED_NOT_DEPLOYABLE');
    assert.strictEqual(report.stages.stage3_constituency_demographics.missingCanonicalMappingsCount, 4123);

    // Stage 4: Blocked (Directive 144/145 Item 9: 0 rows to staging)
    assert.strictEqual(report.stages.stage4_historical_election_results.rowsAffected, 0);
    assert.strictEqual(report.stages.stage4_historical_election_results.status, 'BLOCKED_NOT_DEPLOYABLE');

    // Intercepted requests count: exactly 1 request (for candidacies; Stages 1, 3, 4 send 0 rows)
    assert.strictEqual(interceptedRequests.length, 1, 'Must send exactly 1 PostgREST request for deployable Stage 2; Stages 1, 3, 4 blocked');

    const req = interceptedRequests[0];
    assert.ok(req.url.startsWith(`https://${ALLOWED_STAGING_HOSTNAME}/rest/v1/candidacies`), `Must target allow-listed staging host: ${req.url}`);
    assert.strictEqual(req.method, 'POST');
    assert.strictEqual(req.headers['apikey'], 'test_service_key_for_mock_execution');
    assert.strictEqual(req.headers['Authorization'], 'Bearer test_service_key_for_mock_execution');
    assert.strictEqual(req.headers['Prefer'], 'resolution=merge-duplicates,return=representation');
    assert.strictEqual(req.rowCount, 11298);
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
          authToken: token
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'PLAN_DIGEST_MISMATCH');
        return true;
      }
    );
  });

  it('6. Produces accurate partial-execution record (PARTIAL_EXECUTION_FAILURE) when Stage 2 fails', async () => {
    globalThis.fetch = async (url, options = {}) => {
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
          authToken: token
        });
      },
      (err) => {
        assert.match(err.message, /STAGE_2_REMOTE_EXECUTION_FAILED/);
        assert.ok(err.executionReport, 'Error must attach partial execution report');
        const report = err.executionReport;
        assert.strictEqual(report.executionStatus, 'PARTIAL_EXECUTION_FAILURE');
        assert.strictEqual(report.stages.stage1_political_organizations.status, 'BLOCKED_NOT_DEPLOYABLE');
        assert.strictEqual(report.stages.stage1_political_organizations.rowsAffected, 0);
        assert.strictEqual(report.stages.stage2_candidacies.status, 'FAILED');
        assert.strictEqual(report.stages.stage3_constituency_demographics.status, 'SKIPPED_DUE_TO_PREVIOUS_FAILURE');
        assert.strictEqual(report.stages.stage4_historical_election_results.status, 'SKIPPED_DUE_TO_PREVIOUS_FAILURE');
        return true;
      }
    );
  });

  it('7. Blocks execution with ADMIN_CONTAINMENT_UNCONFIRMED before any transport invocation when containment is unconfirmed', async () => {
    delete process.env.KSHETRA_ADMIN_CLOSURE_RECORD;
    let transportCalled = false;
    globalThis.fetch = async () => {
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
          authToken: token
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'ADMIN_CONTAINMENT_UNCONFIRMED');
        return true;
      }
    );

    assert.strictEqual(transportCalled, false, 'Fetch must NOT be called when containment is unconfirmed');
  });

  it('8. Denies execution on missing plan digest, prohibited destructive operation (DELETE), or unauthorized table grant', async () => {
    // 8a. Missing plan digest
    const noDigestToken = createTestSignedAuthorizationToken({
      plan_digest: ''
    }, ed25519Keys.privateKeyPem);

    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          authToken: noDigestToken
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
          authToken: deleteToken
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
          authToken: unauthorizedTableToken
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'UNAUTHORIZED_TABLE_GRANT');
        return true;
      }
    );
  });

  it('9. Rejects replay of a consumed authorization token across reloaded stores', async () => {
    globalThis.fetch = async (url, options = {}) => {
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
      authToken: token
    });
    assert.strictEqual(firstReport.executionStatus, 'REDUCED_SCOPE_EXECUTED_WITH_BLOCKED_STAGES_EXCLUDED');

    // Second execution with identical token must fail with NONCE_ALREADY_CONSUMED
    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          authToken: token
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'NONCE_ALREADY_CONSUMED');
        return true;
      }
    );
  });

  it('10. Runs local Mode A with zero credentials and network-denial harness enabled; status is PARTIALLY_READY_WITH_BLOCKED_STAGES', async () => {
    const report = await runStagingExecutionEngine({
      mode: 'local'
    });

    assert.strictEqual(report.executionMode, 'MODE_A_LOCAL_PREPARATION_AND_RECONCILIATION');
    assert.strictEqual(report.stagingExecutionPerformed, false);
    assert.strictEqual(report.networkRequestsAttempted, 0);
    // Directive 145 / Directive 146: Mode A must not label entire set PREPARED when required stage work remains blocked
    assert.strictEqual(report.summary.workstreamStatus, 'PARTIALLY_READY_WITH_BLOCKED_STAGES');
    assert.strictEqual(report.summary.allStagesPrepared, false);
    assert.deepStrictEqual(report.summary.blockedStages, [
      'stage1_political_organizations',
      'stage3_constituency_demographics',
      'stage4_historical_election_results'
    ]);
    assert.deepStrictEqual(report.summary.readyStages, ['stage2_candidacies']);

    assert.strictEqual(report.stages.stage1_political_organizations.status, 'BLOCKED_NOT_DEPLOYABLE');
    assert.strictEqual(report.stages.stage2_candidacies.status, 'PREPARED_AND_RECONCILED_IN_REPOSITORY');
    assert.strictEqual(report.stages.stage3_constituency_demographics.status, 'BLOCKED_NOT_DEPLOYABLE');
    assert.strictEqual(report.stages.stage4_historical_election_results.status, 'BLOCKED_NOT_DEPLOYABLE');
  });

  // ─── 2. WORKSTREAM A: AUTHORIZATION & BOUNDARY ADVERSARIAL TESTS ───────────

  it('11. Operational module strictly does NOT export internal execution token, assertContext, test adapters, operational transport, or stage writers', () => {
    assert.strictEqual(operationalModule.INTERNAL_EXECUTION_TOKEN, undefined, 'INTERNAL_EXECUTION_TOKEN must be private');
    assert.strictEqual(operationalModule.assertInternalExecutionContext, undefined, 'assertInternalExecutionContext must be private');
    assert.strictEqual(operationalModule.__test_only_adapters__, undefined, '__test_only_adapters__ must be eliminated');
    assert.strictEqual(operationalModule.createStagingHttpTransport, undefined, 'createStagingHttpTransport must not be exported (Directive 146 Section 2)');
    assert.strictEqual(operationalModule.executeStage1Staging, undefined, 'executeStage1Staging must not be exported');
    assert.strictEqual(operationalModule.executeStage2Staging, undefined, 'executeStage2Staging must not be exported');
    assert.strictEqual(operationalModule.executeStage3Staging, undefined, 'executeStage3Staging must not be exported');
    assert.strictEqual(operationalModule.executeStage4Staging, undefined, 'executeStage4Staging must not be exported');
    assert.strictEqual(operationalModule.setHttpTransport, undefined, 'setHttpTransport must not be exported');
    assert.strictEqual(operationalModule.getHttpTransport, undefined, 'getHttpTransport must not be exported');
  });

  it('12. Injected internal execution context is strictly rejected (CALLER_INJECTED_CONTEXT_PROHIBITED)', async () => {
    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          internalContext: { __token: 'forged_token' }
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'CALLER_INJECTED_CONTEXT_PROHIBITED');
        return true;
      }
    );
  });

  it('13. Caller-injected trust anchors and store paths are strictly rejected (CALLER_INJECTED_*_PROHIBITED)', async () => {
    // 13a. trustAnchor
    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          trustAnchor: ed25519Keys.publicKeyPem
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'CALLER_INJECTED_TRUST_ANCHOR_PROHIBITED');
        return true;
      }
    );

    // 13b. adminTrustAnchor
    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          adminTrustAnchor: adminKeys.publicKeyPem
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'CALLER_INJECTED_TRUST_ANCHOR_PROHIBITED');
        return true;
      }
    );

    // 13c. adminClosureRecord
    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          adminClosureRecord: validAdminClosure
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'CALLER_INJECTED_ADMIN_RECORD_PROHIBITED');
        return true;
      }
    );

    // 13d. storePath
    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          storePath: '/tmp/forged_store.json'
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'CALLER_INJECTED_REPLAY_STORE_PROHIBITED');
        return true;
      }
    );
  });

  it('14. Caller-injected transport functions are strictly rejected (CALLER_INJECTED_TRANSPORT_PROHIBITED)', async () => {
    const dummyTransport = async () => ({ ok: true, status: 200, text: async () => '[]' });

    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          transport: dummyTransport
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'CALLER_INJECTED_TRANSPORT_PROHIBITED');
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          customFetch: dummyTransport
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'CALLER_INJECTED_TRANSPORT_PROHIBITED');
        return true;
      }
    );
  });

  it('15. Operational transport cannot be invoked directly; execution engine rejects insecure protocols, alternate hosts, and production references', async () => {
    assert.strictEqual(
      operationalModule.createStagingHttpTransport,
      undefined,
      'createStagingHttpTransport must not be exported (Directive 146 Section 2)'
    );

    let rawFetchCalled = false;
    globalThis.fetch = async () => {
      rawFetchCalled = true;
      return { ok: true, status: 200, text: async () => '[]' };
    };

    const token = createTestSignedAuthorizationToken({
      plan_digest: canonicalPlanDigest
    }, ed25519Keys.privateKeyPem);

    // Insecure HTTP destination
    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          authToken: token,
          targetUrl: `http://${ALLOWED_STAGING_HOSTNAME}`
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'INSECURE_PROTOCOL');
        return true;
      }
    );

    // Alternate destination host
    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          authToken: token,
          targetUrl: 'https://attacker-controlled-host.com'
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'UNAUTHORIZED_STAGING_HOST');
        return true;
      }
    );

    // Production host
    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          authToken: token,
          targetUrl: `https://${PROHIBITED_PRODUCTION_REF}.supabase.co`
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'PRODUCTION_HOST_FORBIDDEN');
        return true;
      }
    );

    assert.strictEqual(rawFetchCalled, false, 'Raw fetch must NEVER be invoked for unauthorized destinations');
  });

  it('16. Separate test-only adapter module allows isolated stage execution with zero operational exposure', async () => {
    const intercepted = [];
    const mockTransport = async (url, options = {}) => {
      const rows = JSON.parse(options.body);
      intercepted.push({ url, count: rows.length });
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(rows)
      };
    };

    const res1 = await executeStage1TestIsolated({
      repoRoot: REPO_ROOT,
      transport: mockTransport,
      targetHost: `https://${ALLOWED_STAGING_HOSTNAME}`,
      serviceKey: 'test-key'
    });

    assert.strictEqual(res1.status, 'EXECUTED_PENDING_CORROBORATION');
    assert.strictEqual(res1.rowsAffected, 1209);
    assert.strictEqual(intercepted.length, 8);

    const res2 = await executeStage2TestIsolated({
      repoRoot: REPO_ROOT,
      transport: mockTransport,
      targetHost: `https://${ALLOWED_STAGING_HOSTNAME}`,
      serviceKey: 'test-key'
    });

    assert.strictEqual(res2.status, 'EXECUTED_PENDING_CORROBORATION');
    assert.strictEqual(res2.rowsAffected, 11298);
  });

  // ─── 3. WORKSTREAM C: OFFLINE SCHEMA PREFLIGHT ─────────────────────────────

  it('17. Offline schema-contract preflight validates plan before Stage 1 issues requests and rejects schema violations', () => {
    // 17a. Valid plan context passes preflight
    const validPlanContext = {
      stage1: {
        status: 'BLOCKED_NOT_DEPLOYABLE',
        outboundRowsToStaging: 0
      },
      stage2: {
        status: 'PREPARED_AND_RECONCILED_IN_REPOSITORY',
        conflictTarget: 'person_id,election_year,election_type,constituency_id',
        uniqueCandidateCount: 11298,
        candidateRows: Array.from({ length: 11298 }, (_, i) => ({
          id: `0215b22d-0001-0000-0000-${String(i + 1).padStart(12, '0')}`,
          person_id: `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
          election_year: 2023,
          election_type: 'assembly',
          constituency_type: 'assembly',
          constituency_id: `00000000-0000-0000-0001-${String(i + 1).padStart(12, '0')}`,
          party_id: null,
          is_independent: true,
          result: 'lost',
          votes_received: 100,
          vote_share: 1.5,
          rank: 2,
          data_status: 'OFFICIAL',
          provenance_id: '00000000-0000-0000-0002-000000000001'
        }))
      },
      stage3: {
        status: 'BLOCKED_NOT_DEPLOYABLE',
        outboundRowsToStaging: 0
      },
      stage4: {
        status: 'BLOCKED_NOT_DEPLOYABLE',
        outboundRowsToStaging: 0
      }
    };

    const preflightRes = validatePlanSchemaContracts(validPlanContext);
    assert.strictEqual(preflightRes.valid, true);

    // 17b. Premature deployable claim for Stage 1 fails preflight (Directive 146 Section 4)
    const invalidPlanContext = JSON.parse(JSON.stringify(validPlanContext));
    invalidPlanContext.stage1.status = 'READY_TO_DEPLOY';
    invalidPlanContext.stage1.outboundRowsToStaging = 1209;
    assert.throws(
      () => validatePlanSchemaContracts(invalidPlanContext),
      (err) => {
        assert.strictEqual(err.code, 'SCHEMA_PREFLIGHT_VIOLATION');
        assert.match(err.message, /Child tables in Migration 065 use database-generated gen_random_uuid/);
        return true;
      }
    );

    // 17c. Unmapped composite string for Stage 3 when unblocked fails preflight
    const invalidStage3Plan = JSON.parse(JSON.stringify(validPlanContext));
    invalidStage3Plan.stage3.status = 'READY';
    invalidStage3Plan.stage3.demographicRows = [{ constituency_id: 'TS-AC-1' }]; // Composite string instead of UUID
    assert.throws(
      () => validatePlanSchemaContracts(invalidStage3Plan),
      (err) => {
        assert.strictEqual(err.code, 'SCHEMA_PREFLIGHT_VIOLATION');
        assert.match(err.message, /requires authoritative UUID crosswalk/);
        return true;
      }
    );
  });

  // ─── 4. WORKSTREAM B: PLAN DIGEST SENSITIVITY IN ISOLATED TEMP REPO ────────

  it('18. Digest sensitivity proven across transformation, source data, schema migration, and boundary changes in isolated temp repo', () => {
    const tempRoot = path.join(REPO_ROOT, 'scratch', 'test_digest_sensitivity_repo');
    fs.rmSync(tempRoot, { recursive: true, force: true });
    fs.mkdirSync(tempRoot, { recursive: true });

    try {
      // Copy only required files into isolated temp repo
      fs.cpSync(path.join(REPO_ROOT, 'scripts'), path.join(tempRoot, 'scripts'), { recursive: true });
      fs.cpSync(path.join(REPO_ROOT, 'supabase'), path.join(tempRoot, 'supabase'), { recursive: true });
      fs.cpSync(path.join(REPO_ROOT, 'reports'), path.join(tempRoot, 'reports'), { recursive: true });
      fs.cpSync(path.join(REPO_ROOT, 'data'), path.join(tempRoot, 'data'), { recursive: true });

      const baselineDigest = computeExecutionPlanDigest({
        repoRoot: tempRoot,
        targetProjectRef: ALLOWED_STAGING_PROJECT_REF
      });
      assert.strictEqual(typeof baselineDigest, 'string');
      assert.strictEqual(baselineDigest.length, 64);

      // A. Altering transformation code changes digest
      fs.appendFileSync(
        path.join(tempRoot, 'scripts', 'reconcile_database_criteria_identities.mjs'),
        '// Sensitivity test transformation alteration\n'
      );
      const digestAfterTransformation = computeExecutionPlanDigest({
        repoRoot: tempRoot,
        targetProjectRef: ALLOWED_STAGING_PROJECT_REF
      });
      assert.notStrictEqual(digestAfterTransformation, baselineDigest, 'Altering transformation script must change digest');

      // B. Altering source data artifact changes digest
      fs.appendFileSync(
        path.join(tempRoot, 'data', 'seed', 'jammu-kashmir-historical-results.ts'),
        '// Sensitivity test source data alteration\n'
      );
      const digestAfterSource = computeExecutionPlanDigest({
        repoRoot: tempRoot,
        targetProjectRef: ALLOWED_STAGING_PROJECT_REF
      });
      assert.notStrictEqual(digestAfterSource, digestAfterTransformation, 'Altering source data file must change digest');

      // C. Altering schema migration changes digest
      fs.appendFileSync(
        path.join(tempRoot, 'supabase', 'migrations', '067_candidate_contest_fk.sql'),
        '-- Sensitivity test schema migration alteration\n'
      );
      const digestAfterMigration = computeExecutionPlanDigest({
        repoRoot: tempRoot,
        targetProjectRef: ALLOWED_STAGING_PROJECT_REF
      });
      assert.notStrictEqual(digestAfterMigration, digestAfterSource, 'Altering schema migration must change digest');

      // D. Altering operational execution boundary file changes digest
      fs.appendFileSync(
        path.join(tempRoot, 'scripts', 'execute_staging_directive_139.mjs'),
        '// Sensitivity test boundary alteration\n'
      );
      const digestAfterBoundary = computeExecutionPlanDigest({
        repoRoot: tempRoot,
        targetProjectRef: ALLOWED_STAGING_PROJECT_REF
      });
      assert.notStrictEqual(digestAfterBoundary, digestAfterMigration, 'Altering operational boundary must change digest');

    } finally {
      // Clean up isolated temporary repository
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  // ─── 5. DIRECTIVE 146 LEAST-PRIVILEGE & NETWORK-ISOLATION ADVERSARIAL TESTS ───

  it('19. Token attempting to grant blocked tables fails closed before network access (BLOCKED_TABLE_GRANT_FORBIDDEN)', async () => {
    let networkAttempted = false;
    globalThis.fetch = async () => {
      networkAttempted = true;
      return { ok: true, status: 200, text: async () => '[]' };
    };

    const token = createTestSignedAuthorizationToken({
      plan_digest: canonicalPlanDigest,
      tables: ['public.constituency_demographics']
    }, ed25519Keys.privateKeyPem);

    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          authToken: token
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'BLOCKED_TABLE_GRANT_FORBIDDEN');
        return true;
      }
    );

    assert.strictEqual(networkAttempted, false, 'No network requests may occur when token scope is invalid');
  });

  it('20. Token attempting to grant blocked criteria fails closed before network access (BLOCKED_CRITERION_GRANT_FORBIDDEN)', async () => {
    let networkAttempted = false;
    globalThis.fetch = async () => {
      networkAttempted = true;
      return { ok: true, status: 200, text: async () => '[]' };
    };

    const token = createTestSignedAuthorizationToken({
      plan_digest: canonicalPlanDigest,
      criteria: ['CRIT-C02-02']
    }, ed25519Keys.privateKeyPem);

    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          authToken: token
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'BLOCKED_CRITERION_GRANT_FORBIDDEN');
        return true;
      }
    );

    assert.strictEqual(networkAttempted, false, 'No network requests may occur when criterion is blocked');
  });

  it('21. Environment-provided trust anchor without approved fingerprint fails closed before network access (TRUST_ANCHOR_UNAPPROVED)', async () => {
    let networkAttempted = false;
    globalThis.fetch = async () => {
      networkAttempted = true;
      return { ok: true, status: 200, text: async () => '[]' };
    };

    delete process.env.KSHETRA_APPROVED_TRUST_ANCHOR_FINGERPRINT;

    const token = createTestSignedAuthorizationToken({
      plan_digest: canonicalPlanDigest
    }, ed25519Keys.privateKeyPem);

    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          authToken: token
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'TRUST_ANCHOR_UNAPPROVED');
        return true;
      }
    );

    assert.strictEqual(networkAttempted, false, 'No network requests may occur when trust anchor is unapproved');
  });

  it('22. Ambient flags (NODE_ENV=test, --write, --mode=staging) without valid cryptographic token fail before network access', async () => {
    let networkAttempted = false;
    globalThis.fetch = async () => {
      networkAttempted = true;
      return { ok: true, status: 200, text: async () => '[]' };
    };

    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          authToken: null
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'MISSING_AUTHORIZATION_TOKEN');
        return true;
      }
    );

    assert.strictEqual(networkAttempted, false, 'Ambient test flags must never authorize network access');
  });
});
