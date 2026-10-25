/**
 * tests/webhooks-config-safety.test.ts
 *
 * Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
 * Directive: W022-CTO-REMEDIATION-006 (Section C.4)
 *
 * Scope:
 * 1. Startup guards fail closed if DATABASE_URL is missing or empty outside test environments.
 * 2. WEBHOOK_SECRETS_ENCRYPTION_KEY must be strictly a 64-character hexadecimal string (32 bytes).
 * 3. Rejects invalid lengths (e.g. 62 hex chars, 66 hex chars), non-hex characters, and missing keys.
 * 4. Unset NODE_ENV must NOT default to test mode or use fallback keys.
 */

import assert from 'node:assert';
import { getMasterEncryptionKey } from '../apps/api/src/modules/webhooks/crypto';
import { WebhookService } from '../apps/api/src/modules/webhooks/webhookService';
import { WebhookWorker } from '../apps/api/src/workers/webhookWorker';

console.log('================================================================');
console.log('W022: CONFIGURATION SAFETY & STARTUP GUARD VERIFICATION SUITE');
console.log('Timestamp:', new Date().toISOString());
console.log('Authority: CTO DIRECTIVE W022-CTO-REMEDIATION-006 (Section C.4)');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function runCheck(id: string, description: string, fn: () => void) {
  try {
    fn();
    passCount++;
    console.log(`[PASS] ${id}: ${description}`);
  } catch (err: any) {
    failCount++;
    console.error(`[FAIL] ${id}: ${description}`);
    console.error(`       Error: ${err.message}`);
  }
}

// Preserve original environment
const originalEnv = { ...process.env };

function resetEnv() {
  process.env = { ...originalEnv };
}

try {
  // ─── 1. KEY VALIDATION CHECKS ───
  runCheck('CFG-01', 'Accepts valid 64-hex key (32 bytes) and returns correct Buffer', () => {
    resetEnv();
    process.env.NODE_ENV = 'production';
    process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const key = getMasterEncryptionKey();
    assert.strictEqual(key.length, 32);
    assert.strictEqual(key.toString('hex'), '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
  });

  runCheck('CFG-02', 'Rejects missing encryption key when NODE_ENV=production', () => {
    resetEnv();
    process.env.NODE_ENV = 'production';
    delete process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY;
    assert.throws(
      () => getMasterEncryptionKey(),
      /CONFIG_ERROR: WEBHOOK_SECRETS_ENCRYPTION_KEY missing or invalid in deployed environment/
    );
  });

  runCheck('CFG-03', 'Rejects missing encryption key when NODE_ENV is unset (does not default to test fallback)', () => {
    resetEnv();
    delete process.env.NODE_ENV;
    delete process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY;
    assert.throws(
      () => getMasterEncryptionKey(),
      /CONFIG_ERROR: WEBHOOK_SECRETS_ENCRYPTION_KEY missing or invalid in deployed environment/
    );
  });

  runCheck('CFG-04', 'Rejects key that is 62 hex characters (31 bytes)', () => {
    resetEnv();
    process.env.NODE_ENV = 'production';
    process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd'; // 62 chars
    assert.throws(
      () => getMasterEncryptionKey(),
      /CONFIG_ERROR: WEBHOOK_SECRETS_ENCRYPTION_KEY must be exactly 64 hexadecimal characters/
    );
  });

  runCheck('CFG-05', 'Rejects key that is 66 hex characters (33 bytes)', () => {
    resetEnv();
    process.env.NODE_ENV = 'production';
    process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0011'; // 66 chars
    assert.throws(
      () => getMasterEncryptionKey(),
      /CONFIG_ERROR: WEBHOOK_SECRETS_ENCRYPTION_KEY must be exactly 64 hexadecimal characters/
    );
  });

  runCheck('CFG-06', 'Rejects key containing non-hex characters (e.g. g, z, special symbols)', () => {
    resetEnv();
    process.env.NODE_ENV = 'production';
    process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdeg'; // ends in 'g'
    assert.throws(
      () => getMasterEncryptionKey(),
      /CONFIG_ERROR: WEBHOOK_SECRETS_ENCRYPTION_KEY must be exactly 64 hexadecimal characters/
    );
  });

  // ─── 2. DATABASE_URL STARTUP CHECKS ───
  runCheck('CFG-07', 'WebhookService constructor throws CONFIG_ERROR when DATABASE_URL is missing in production', () => {
    resetEnv();
    process.env.NODE_ENV = 'production';
    process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    delete process.env.DATABASE_URL;
    assert.throws(
      () => new WebhookService(),
      /CONFIG_ERROR: DATABASE_URL must be configured for WebhookService/
    );
  });

  runCheck('CFG-08', 'WebhookService constructor throws CONFIG_ERROR when DATABASE_URL is empty string in production', () => {
    resetEnv();
    process.env.NODE_ENV = 'production';
    process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env.DATABASE_URL = '   ';
    assert.throws(
      () => new WebhookService(),
      /CONFIG_ERROR: DATABASE_URL must be configured for WebhookService/
    );
  });

  runCheck('CFG-09', 'WebhookWorker constructor throws CONFIG_ERROR when DATABASE_URL is missing in production', () => {
    resetEnv();
    process.env.NODE_ENV = 'production';
    process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    delete process.env.DATABASE_URL;
    assert.throws(
      () => new WebhookWorker(),
      /CONFIG_ERROR: DATABASE_URL must be configured for WebhookWorker in non-test mode/
    );
  });

  runCheck('CFG-10', 'Fallback to test default master key is strictly restricted to NODE_ENV===test', () => {
    resetEnv();
    process.env.NODE_ENV = 'test';
    delete process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY;
    const testKey = getMasterEncryptionKey();
    assert.strictEqual(testKey.length, 32);
  });
} finally {
  resetEnv();
}

console.log('\n----------------------------------------------------------------');
console.log(`Results: ${passCount} passed, ${failCount} failed.`);
console.log('----------------------------------------------------------------\n');

if (failCount > 0) {
  process.exit(1);
}
