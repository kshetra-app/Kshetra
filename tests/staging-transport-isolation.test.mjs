/**
 * tests/staging-transport-isolation.test.mjs
 *
 * Process-Wide Network Denial & Transport Boundary Isolation Battery
 * Task: W021.5 / CTO Directive 142 Section 3.2 & 3.3
 * Governing Authority: Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 *
 * Verifies:
 * 1. Mode A executes by default with ZERO credentials in the environment (no SUPABASE_SERVICE_ROLE_KEY).
 * 2. Entire CLI process runs to completion under process-wide network denial harness (trapping sockets, TLS, HTTP, DNS, fetch).
 * 3. Negative harness verification: proves the network denial harness actively intercepts and throws PROCESS_NETWORK_DENIED.
 * 4. In-process injectable transport boundary traps and rejects any attempted remote call with NETWORK_ACCESS_FORBIDDEN.
 * 5. Report truthfully records PREPARED_AND_RECONCILED_IN_REPOSITORY and stagingExecutionPerformed: false.
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
const PRELOAD_HARNESS = path.join(REPO_ROOT, 'tests', 'fixtures', 'network-denial-preload.cjs');

describe('CTO Directive 142 Section 3: Process-Wide Network Denial & Local Preparation Battery', () => {

  it('1. Executes Mode A preparation by default with ZERO credentials in the environment', () => {
    // Run script with sanitized environment (explicitly removing any Supabase keys)
    const cleanEnv = { ...process.env };
    delete cleanEnv.SUPABASE_SERVICE_ROLE_KEY;
    delete cleanEnv.SUPABASE_URL;
    delete cleanEnv.STAGING_WRITE_AUTHORIZATION_TOKEN;
    delete cleanEnv.STAGING_WRITE_ENABLED;

    const res = spawnSync(process.execPath, [SCRIPT_139], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: cleanEnv
    });

    assert.strictEqual(res.status, 0, `Execution failed with output:\n${res.stderr}\n${res.stdout}`);
    assert.match(res.stdout, /Execution Mode: MODE_A_LOCAL_PREPARATION_AND_RECONCILIATION/i);
    assert.match(res.stdout, /Staging Executed: false/i);
    assert.match(res.stdout, /Network Calls Measured: 0/i);
    assert.match(res.stdout, /Workstream Status: PREPARED_AND_RECONCILED_IN_REPOSITORY/i);
  });

  it('2. Entire CLI process executes cleanly under process-wide network denial preload harness', () => {
    const cleanEnv = { ...process.env };
    delete cleanEnv.SUPABASE_SERVICE_ROLE_KEY;
    delete cleanEnv.SUPABASE_URL;

    // Execute with Node.js requiring the network denial preload script
    const res = spawnSync(process.execPath, ['-r', PRELOAD_HARNESS, SCRIPT_139], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: cleanEnv
    });

    assert.strictEqual(res.status, 0, `Process failed under network denial harness:\n${res.stderr}\n${res.stdout}`);
    assert.match(res.stdout, /Network Calls Measured: 0/i);
  });

  it('3. Negative Harness Proof: Preload denial harness actively traps and blocks network requests', () => {
    // Spawn a script that attempts fetch under the preload harness -> must throw PROCESS_NETWORK_DENIED
    const attemptScript = `
      try {
        await fetch('https://fkpigozcqnmcvofuksar.supabase.co');
        console.log('UNEXPECTED_SUCCESS');
      } catch (err) {
        console.error('TRAPPED_ERROR:', err.code || err.message);
        process.exit(42);
      }
    `;

    const res = spawnSync(process.execPath, [
      '-r', PRELOAD_HARNESS,
      '--input-type=module',
      '-e', attemptScript
    ], {
      cwd: REPO_ROOT,
      encoding: 'utf8'
    });

    assert.strictEqual(res.status, 42, 'Harness must trap network request and exit with code 42');
    assert.match(res.stderr, /PROCESS_NETWORK_DENIED/i);
  });

  it('4. In-process transport boundary traps and rejects any network call attempted during local preparation', async () => {
    const { getHttpTransport } = await import('../scripts/execute_staging_directive_139.mjs');

    const activeTransport = getHttpTransport();
    assert.strictEqual(typeof activeTransport, 'function', 'Transport must be a function');

    // Attempting a call via transport in local mode must throw NETWORK_ACCESS_FORBIDDEN
    await assert.rejects(
      async () => {
        await activeTransport('https://fkpigozcqnmcvofuksar.supabase.co/rest/v1/political_organizations', { method: 'GET' });
      },
      (err) => {
        assert.strictEqual(err.code, 'NETWORK_ACCESS_FORBIDDEN');
        assert.match(err.message, /Network call attempted in local mode/i);
        return true;
      }
    );
  });

  it('5. Staging report truthfully records PREPARED_AND_RECONCILED_IN_REPOSITORY and stagingExecutionPerformed: false', () => {
    const reportPath = path.join(REPO_ROOT, 'reports/w021_5_staging_execution_report.json');
    assert.ok(fs.existsSync(reportPath), 'Report file must exist');

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

    assert.strictEqual(report.stagingExecutionPerformed, false, 'Must not claim staging execution was performed');
    assert.strictEqual(report.networkRequestsAttempted, 0, 'Must record 0 network requests attempted');
    assert.strictEqual(report.executionMode, 'MODE_A_LOCAL_PREPARATION_AND_RECONCILIATION');
    assert.strictEqual(report.summary.workstreamStatus, 'PREPARED_AND_RECONCILED_IN_REPOSITORY');
    assert.strictEqual(report.securityIncidentContainment.status, 'CONTAINMENT_PENDING_ADMIN_CONFIRMATION');

    // Confirm all 4 criteria are pending live staging execution
    for (const [stageKey, stageData] of Object.entries(report.stages)) {
      assert.strictEqual(stageData.status, 'PREPARED_AND_RECONCILED_IN_REPOSITORY');
      assert.strictEqual(stageData.stagingExecuted, false);
      assert.strictEqual(stageData.remoteCorroborated, false);
      assert.strictEqual(stageData.remoteCorroborationPending, true);
    }
  });

});
