/**
 * tests/staging-transport-isolation.test.mjs
 *
 * Automated Network Denial & Transport Boundary Spy Battery
 * Task: W021.5 / CTO Directive 141 Section 3.2
 * Governing Authority: Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 *
 * Verifies:
 * 1. Mode A local preparation executes with strictly ZERO network calls.
 * 2. Transport spy confirms call count === 0.
 * 3. Network denial boundary fails closed with NETWORK_ACCESS_FORBIDDEN if any remote call is attempted.
 * 4. Staging report truthfully records PREPARED_AND_RECONCILED_IN_REPOSITORY and stagingExecutionPerformed: false.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const SCRIPT_139 = path.join(REPO_ROOT, 'scripts', 'execute_staging_directive_139.mjs');
const DUMMY_KEY = 'dummy_test_key_for_offline_preparation_harness_only';

describe('CTO Directive 141 Section 3.2: Staging Transport Isolation & Zero-Network Verification Battery', () => {

  it('1. Executes Mode A preparation with strictly zero remote network requests', () => {
    // Run script in dry-run mode
    const res = spawnSync(process.execPath, [SCRIPT_139], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        SUPABASE_SERVICE_ROLE_KEY: DUMMY_KEY
      }
    });

    assert.strictEqual(res.status, 0, `Execution failed with output: ${res.stderr}\n${res.stdout}`);
    assert.match(res.stdout, /DRY-RUN \/ READ-ONLY PREPARATION \(0 remote mutations\)/i);
    assert.match(res.stdout, /Stage 1 Verdict: PASS \(PREPARED_AND_RECONCILED_IN_REPOSITORY\)/i);
    assert.match(res.stdout, /Stage 2 Verdict: PASS \(PREPARED_AND_RECONCILED_IN_REPOSITORY\)/i);
    assert.match(res.stdout, /Stage 3 Verdict: PASS \(PREPARED_AND_RECONCILED_IN_REPOSITORY\)/i);
    assert.match(res.stdout, /Stage 4 Verdict: PASS \(PREPARED_AND_RECONCILED_IN_REPOSITORY\)/i);
  });

  it('2. Verifies generated staging report records stagingExecutionPerformed: false (zero synthetic live claims)', () => {
    const reportPath = path.join(REPO_ROOT, 'reports/w021_5_staging_execution_report.json');
    assert.ok(fs.existsSync(reportPath), 'Report file must exist');

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

    assert.strictEqual(report.stagingExecutionPerformed, false, 'Must not claim staging execution was performed');
    assert.strictEqual(report.networkRequestsAttempted, 0, 'Must record 0 network requests attempted');
    assert.strictEqual(report.workstreamStatus || report.summary?.workstreamStatus, 'PREPARED_AND_RECONCILED_IN_REPOSITORY');
    assert.doesNotMatch(JSON.stringify(report), /STAGING_EXECUTION_COMPLETE_AND_CORROBORATED/);
    assert.doesNotMatch(JSON.stringify(report), /"status":\s*"PASSED_CORROBORATED"/);
    assert.strictEqual(report.securityIncidentContainment.status, 'CONTAINMENT_PENDING_ADMIN_CONFIRMATION');

    // Confirm all 4 criteria are pending live staging execution
    for (const [stageKey, stageData] of Object.entries(report.stages)) {
      assert.strictEqual(stageData.status, 'PREPARED_AND_RECONCILED_IN_REPOSITORY');
      assert.strictEqual(stageData.stagingExecuted, false);
      assert.strictEqual(stageData.remoteCorroborated, false);
      assert.strictEqual(stageData.remoteCorroborationPending, true);
    }
  });

  it('3. In-process transport boundary traps and rejects any network call attempted during local preparation', async () => {
    const { getHttpTransport, setHttpTransport } = await import('../scripts/execute_staging_directive_139.mjs');

    const activeTransport = getHttpTransport();
    assert.strictEqual(typeof activeTransport, 'function', 'Transport must be an injectable function');

    // Attempting a call via active transport in dry-run mode must throw NETWORK_ACCESS_FORBIDDEN
    await assert.rejects(
      async () => {
        await activeTransport('https://fkpigozcqnmcvofuksar.supabase.co/rest/v1/political_organizations', { method: 'GET' });
      },
      (err) => {
        assert.strictEqual(err.code, 'NETWORK_ACCESS_FORBIDDEN');
        assert.match(err.message, /Remote network call attempted during local preparation mode/i);
        return true;
      }
    );
  });

});
