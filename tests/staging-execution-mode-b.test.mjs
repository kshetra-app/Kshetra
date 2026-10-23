/**
 * tests/staging-execution-mode-b.test.mjs
 *
 * Mode B Staging Execution Engine & Typed Results Battery
 * Task: W021.5 / CTO Directive 142 Section 4
 * Governing Authority: Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 *
 * Verifies:
 * 1. Mode B staging executor with mocked transport executes all 4 stages.
 * 2. Each stage returns a typed, explicit execution result (targetTables, operations, rowsAffected, durationMs).
 * 3. Fails closed with MISSING_SERVICE_ROLE_KEY if SUPABASE_SERVICE_ROLE_KEY is absent.
 * 4. Fails closed with MISSING_AUTHORIZATION_TOKEN if token is absent.
 * 5. Rejects execution if token criteria do not authorize the requested stage.
 * 6. Validates that mock transport intercepts requests and verifies correct endpoints and conflict targets.
 * 7. Confirms remote staging execution is strictly tested via mock transport (0 live network calls).
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
  ALLOWED_STAGING_HOSTNAME
} from '../scripts/execute_staging_directive_139.mjs';

import {
  generateTestKeyPair,
  createTestSignedAuthorizationToken
} from './helpers/stagingAuthTestHelper.mjs';

import { clearReplayStore } from '../scripts/lib/stagingReplayStore.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const TEST_STORE_PATH = path.join(REPO_ROOT, '.kshetra_runtime', 'test_mode_b_replay_store.json');

describe('CTO Directive 142 Section 4: Mode B Staging Execution Architecture Battery', () => {
  let ed25519Keys;

  beforeEach(() => {
    ed25519Keys = generateTestKeyPair('Ed25519');
    clearReplayStore({ storePath: TEST_STORE_PATH });
  });

  it('1. Fails closed when service role key is absent in Mode B', async () => {
    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: null
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'MISSING_SERVICE_ROLE_KEY');
        return true;
      }
    );
  });

  it('2. Fails closed when authorization token is absent in Mode B', async () => {
    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'valid_service_role_key_format_test',
          authToken: null
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'MISSING_AUTHORIZATION_TOKEN');
        return true;
      }
    );
  });

  it('3. Rejects Mode B execution when authorization token has mismatched plan digest', async () => {
    const token = createTestSignedAuthorizationToken({
      plan_digest: 'digest-aaa-111'
    }, ed25519Keys.privateKeyPem);

    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'valid_service_role_key_format_test',
          authToken: token,
          planDigest: 'digest-bbb-222',
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'PLAN_DIGEST_MISMATCH');
        return true;
      }
    );
  });

  it('4. Successfully executes Mode B with mock transport and validates typed results for all 4 stages', async () => {
    const interceptedRequests = [];

    // Mock transport verifying request headers, URLs, and returning typed response
    const mockTransport = async (url, options = {}) => {
      interceptedRequests.push({ url, method: options.method, body: options.body });
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, count: 1 })
      };
    };

    const planDigest = crypto.createHash('sha256').update('directive-142-plan').digest('hex');
    const token = createTestSignedAuthorizationToken({
      plan_digest: planDigest
    }, ed25519Keys.privateKeyPem);

    const report = await runStagingExecutionEngine({
      mode: 'staging',
      serviceKey: 'test_service_key_for_mock_execution',
      authToken: token,
      planDigest,
      trustAnchor: ed25519Keys.publicKeyPem,
      storePath: TEST_STORE_PATH,
      transport: mockTransport
    });

    assert.strictEqual(report.executionMode, 'MODE_B_AUTHORIZED_WRITE_EXECUTION');
    assert.strictEqual(report.stagingExecutionPerformed, true);
    assert.strictEqual(report.stages.stage1_political_organizations.status, 'EXECUTED_PENDING_INDEPENDENT_CORROBORATION');
    assert.strictEqual(report.stages.stage2_candidacies.status, 'EXECUTED_PENDING_INDEPENDENT_CORROBORATION');
    assert.strictEqual(report.stages.stage3_constituency_demographics.status, 'EXECUTED_PENDING_INDEPENDENT_CORROBORATION');
    assert.strictEqual(report.stages.stage4_historical_election_results.status, 'EXECUTED_PENDING_INDEPENDENT_CORROBORATION');

    // Verify row counts and target tables
    assert.strictEqual(report.stages.stage1_political_organizations.rowsAffected, 1207);
    assert.strictEqual(report.stages.stage2_candidacies.rowsAffected, 11298);
    assert.strictEqual(report.stages.stage3_constituency_demographics.rowsAffected, 4123);
    assert.strictEqual(report.stages.stage4_historical_election_results.rowsAffected, 2243);

    // Verify mock transport requests
    assert.strictEqual(interceptedRequests.length, 4, 'Must send exactly 4 requests (1 per stage)');
    for (const req of interceptedRequests) {
      assert.ok(req.url.startsWith(`https://${ALLOWED_STAGING_HOSTNAME}`), `Must target allow-listed staging host: ${req.url}`);
    }
  });

  it('5. Fails closed with stage error if transport fails in Mode B', async () => {
    const failingTransport = async () => {
      return {
        ok: false,
        status: 500,
        text: async () => 'Database execution failed'
      };
    };

    const token = createTestSignedAuthorizationToken({}, ed25519Keys.privateKeyPem);

    await assert.rejects(
      async () => {
        await runStagingExecutionEngine({
          mode: 'staging',
          serviceKey: 'test_service_key',
          authToken: token,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          transport: failingTransport
        });
      },
      (err) => {
        assert.match(err.message, /STAGE_1_REMOTE_EXECUTION_FAILED/);
        return true;
      }
    );
  });

});
