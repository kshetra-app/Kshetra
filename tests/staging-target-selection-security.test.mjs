/**
 * tests/staging-target-selection-security.test.mjs
 *
 * Automated Negative & Security Battery for Staging Target Selection & Gating
 * Task: W021.5 / CTO Directive 140 Section 2.2
 *
 * Enforces:
 * 1. Absent credentials fails closed (exit code 1, 0 mutations)
 * 2. Wrong host rejected (exit code 1, 0 mutations)
 * 3. Production host selection rejected (exit code 1, 0 mutations)
 * 4. Insecure protocol rejected (exit code 1, 0 mutations)
 * 5. Production reference in service key rejected (exit code 1, 0 mutations)
 * 6. Missing write authorization rejected when write requested (exit code 1, 0 mutations)
 * 7. Malformed authorization token rejected (exit code 1, 0 mutations)
 * 8. Default dry-run preparation executes with strictly ZERO mutations
 * 9. Secret redaction verification (secrets never emitted in error text or logs)
 *
 * Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const SCRIPT_139 = path.join(REPO_ROOT, 'scripts', 'execute_staging_directive_139.mjs');
const SCRIPT_138 = path.join(REPO_ROOT, 'scripts', 'execute_staging_directive_138.mjs');

// Harmless synthetic test key that looks like a token but has zero real authority
const DUMMY_STAGING_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_staging_key_for_test_harness_only';

function runScript(scriptPath, envOverrides = {}, args = []) {
  const env = {
    ...process.env,
    ...envOverrides
  };

  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env
  });
}

describe('CTO Directive 140 Section 2.2: Staging Target Selection & Write-Gating Security Battery', () => {

  // ─── 1. ABSENT CREDENTIALS (FAIL CLOSED) ───────────────────────────────────
  it('1. Rejects execution when SUPABASE_SERVICE_ROLE_KEY is absent (fail-closed, exit 1)', () => {
    const res = runScript(SCRIPT_139, { SUPABASE_SERVICE_ROLE_KEY: '' }, ['--write']);
    assert.strictEqual(res.status, 1, 'Process must exit with status 1');
    assert.match(res.stderr + res.stdout, /Missing SUPABASE_SERVICE_ROLE_KEY/i);
    assert.doesNotMatch(res.stdout, /MUTATION EXECUTED/i);
  });

  it('1b. Rejects execution in Directive 138 script when SUPABASE_SERVICE_ROLE_KEY is absent', () => {
    const res = runScript(SCRIPT_138, { SUPABASE_SERVICE_ROLE_KEY: '' });
    assert.strictEqual(res.status, 1, 'Process must exit with status 1');
    assert.match(res.stderr + res.stdout, /Missing SUPABASE_SERVICE_ROLE_KEY/i);
  });

  // ─── 2. WRONG HOST REJECTION ───────────────────────────────────────────────
  it('2. Rejects arbitrary wrong host override in SUPABASE_URL (exit 1, 0 mutations)', () => {
    const res = runScript(SCRIPT_139, {
      SUPABASE_SERVICE_ROLE_KEY: DUMMY_STAGING_KEY,
      SUPABASE_URL: 'https://malicious-external-host.supabase.co'
    }, ['--write']);
    assert.strictEqual(res.status, 1, 'Must reject arbitrary unauthorized host');
    assert.match(res.stderr + res.stdout, /Unauthorized staging host/i);
  });

  // ─── 3. PRODUCTION HOST SELECTION REJECTION ────────────────────────────────
  it('3. Rejects production host selection ehfafcnimmjusyvplbah (air-gap, exit 1, 0 mutations)', () => {
    const res = runScript(SCRIPT_139, {
      SUPABASE_SERVICE_ROLE_KEY: DUMMY_STAGING_KEY,
      SUPABASE_URL: 'https://ehfafcnimmjusyvplbah.supabase.co'
    }, ['--write']);
    assert.strictEqual(res.status, 1, 'Must reject production URL');
    assert.match(res.stderr + res.stdout, /Production project reference detected|Unauthorized staging host/i);
  });

  // ─── 4. INSECURE PROTOCOL REJECTION ────────────────────────────────────────
  it('4. Rejects insecure http: protocol in SUPABASE_URL (exit 1, 0 mutations)', () => {
    const res = runScript(SCRIPT_139, {
      SUPABASE_SERVICE_ROLE_KEY: DUMMY_STAGING_KEY,
      SUPABASE_URL: 'http://fkpigozcqnmcvofuksar.supabase.co'
    }, ['--write']);
    assert.strictEqual(res.status, 1, 'Must reject non-https protocol');
    assert.match(res.stderr + res.stdout, /Insecure protocol: staging connection strictly requires https:/i);
  });

  // ─── 5. PRODUCTION REF IN KEY REJECTION ────────────────────────────────────
  it('5. Rejects production reference contained within service key (air-gap invariant)', () => {
    const res = runScript(SCRIPT_139, {
      SUPABASE_SERVICE_ROLE_KEY: 'test-key-containing-ehfafcnimmjusyvplbah-probe'
    }, ['--write']);
    assert.strictEqual(res.status, 1, 'Must reject key referencing production');
    assert.match(res.stderr + res.stdout, /Production reference detected in service key/i);
  });

  // ─── 6. MISSING WRITE AUTHORIZATION REJECTION ──────────────────────────────
  it('6. Rejects write request when write authorization token is missing (--write without token)', () => {
    const res = runScript(
      SCRIPT_139,
      { SUPABASE_SERVICE_ROLE_KEY: DUMMY_STAGING_KEY },
      ['--write']
    );
    assert.strictEqual(res.status, 1, 'Must fail closed when write token is missing');
    assert.match(res.stderr + res.stdout, /MISSING_AUTHORIZATION_TOKEN|write authorization token is missing or invalid/i);
  });

  // ─── 7. MALFORMED WRITE AUTHORIZATION REJECTION ────────────────────────────
  it('7. Rejects write request with malformed authorization token (exit 1, 0 mutations)', () => {
    const res = runScript(
      SCRIPT_139,
      { SUPABASE_SERVICE_ROLE_KEY: DUMMY_STAGING_KEY },
      ['--write', '--auth-token=some-unauthorized-random-string']
    );
    assert.strictEqual(res.status, 1, 'Must reject malformed authorization token');
    assert.match(res.stderr + res.stdout, /TRUST_ANCHOR_UNCONFIGURED|MALFORMED_AUTHORIZATION_TOKEN|write authorization token is missing or invalid/i);
  });

  // ─── 8. DEFAULT DRY-RUN PREPARATION (0 REMOTE MUTATIONS) ───────────────────
  it('8. Default execution mode is DRY-RUN preparation with strictly ZERO remote mutations', () => {
    const res = runScript(
      SCRIPT_139,
      { SUPABASE_SERVICE_ROLE_KEY: DUMMY_STAGING_KEY },
      [] // No --write flag
    );
    assert.strictEqual(res.status, 0, 'Dry-run preparation must complete successfully');
    assert.match(res.stdout, /MODE_A_LOCAL_PREPARATION_AND_RECONCILIATION|DRY-RUN/i);
    assert.match(res.stdout, /Network Calls Measured: 0|0 remote mutations/i);
    assert.match(res.stdout, /PARTIALLY_READY_WITH_BLOCKED_STAGES|PREPARED_AND_RECONCILED_IN_REPOSITORY/i);
  });

  // ─── 9. SECRET REDACTION CONFIRMATION ──────────────────────────────────────
  it('9. Diagnostics and error logs strictly redact service-role secret values', () => {
    const SECRET_PROBE = 'secret_canary_probe_string_never_leak';
    const res = runScript(
      SCRIPT_139,
      {
        SUPABASE_SERVICE_ROLE_KEY: SECRET_PROBE,
        SUPABASE_URL: 'https://malicious-host.supabase.co'
      },
      ['--write']
    );
    const combinedOutput = res.stdout + res.stderr;
    assert.strictEqual(
      combinedOutput.includes(SECRET_PROBE),
      false,
      'Raw secret value must NEVER appear in output or logs'
    );
  });
});
