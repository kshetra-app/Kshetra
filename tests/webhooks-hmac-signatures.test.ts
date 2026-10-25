/**
 * tests/webhooks-hmac-signatures.test.ts
 *
 * Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
 * Gate W022-G3 / Gate C: Cryptographic Integrity & HMAC Signature Verification Suite
 *
 * Mandatory Verification Invariants:
 * 1. RFC 8785 JSON Canonicalization Scheme (JCS) deterministic serialization.
 * 2. AES-256-GCM secret encryption with AAD (tenantId:subscriptionId) binding.
 * 3. Secret decryption failure on AAD tampering or ciphertext corruption.
 * 4. Dual-secret rotation signing and dual v1=<sig> header generation.
 * 5. Constant-time timingSafeEqual HMAC verification with replay clock-skew tolerance (300s past / 60s future).
 * 6. Secret redaction helper for zero plaintext leak in logs.
 */

import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  getMasterEncryptionKey,
  encodeBytea,
  decodeBytea,
  canonicalizeJson,
  generateWebhookSecret,
  encryptSecret,
  decryptSecret,
  generateWebhookSignature,
  formatSignatureHeader,
  verifyWebhookSignature,
  redactSecretsForLogging,
} from '../apps/api/src/modules/webhooks/crypto.ts';

console.log('================================================================');
console.log('W022: HMAC SIGNATURES & CRYPTOGRAPHIC ENGINE TEST SUITE');
console.log('Timestamp:', new Date().toISOString());
console.log('Authority: CTO DIRECTIVE W022-CTO-EXEC-001 (Gate C)');
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

// Ensure mock master key for testing
process.env.NODE_ENV = 'test';
process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY =
  process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// ─── 1. RFC 8785 JSON Canonicalization Tests ───
runCheck('CRYPTO-01', 'RFC 8785: Sort top-level keys lexicographically by UTF-16 code units', () => {
  const input = { z: 1, a: 2, m: 3 };
  const canonical = canonicalizeJson(input);
  assert.strictEqual(canonical, '{"a":2,"m":3,"z":1}');
});

runCheck('CRYPTO-02', 'RFC 8785: Recursively sort nested object keys', () => {
  const input = {
    payload: {
      constituency_id: 'TEL_072',
      registered_voters: 245000,
      candidates: [
        { name: 'Candidate B', votes: 1200 },
        { name: 'Candidate A', votes: 1500 },
      ],
    },
    event_type: 'election.results.published',
  };
  const canonical = canonicalizeJson(input);
  const parsed = JSON.parse(canonical);
  assert.strictEqual(parsed.event_type, 'election.results.published');
  // Top level keys order: event_type, payload
  assert.strictEqual(canonical.indexOf('"event_type"'), 1);
  assert.ok(canonical.indexOf('"payload"') > canonical.indexOf('"event_type"'));
  // Inside payload: candidates, constituency_id, registered_voters
  const payloadSub = canonical.substring(canonical.indexOf('"payload":{'));
  assert.ok(payloadSub.indexOf('"candidates"') < payloadSub.indexOf('"constituency_id"'));
  assert.ok(payloadSub.indexOf('"constituency_id"') < payloadSub.indexOf('"registered_voters"'));
});

runCheck('CRYPTO-03', 'RFC 8785: Preserve array element order strictly without reordering', () => {
  const input = { list: [3, 1, 2] };
  const canonical = canonicalizeJson(input);
  assert.strictEqual(canonical, '{"list":[3,1,2]}');
});

runCheck('CRYPTO-04', 'RFC 8785: Stable byte equality regardless of original property insertion order', () => {
  const obj1 = { foo: 'bar', baz: 123, active: true };
  const obj2 = { active: true, foo: 'bar', baz: 123 };
  assert.strictEqual(canonicalizeJson(obj1), canonicalizeJson(obj2));
});

// ─── 2. Secret Generation & AES-256-GCM Tests ───
runCheck('CRYPTO-05', 'Generate CSPRNG webhook secret with whsec_ prefix and 64 hex chars', () => {
  const secret = generateWebhookSecret();
  assert.ok(secret.startsWith('whsec_'));
  assert.strictEqual(secret.length, 70); // 6 prefix + 64 hex characters (32 bytes)
  const hexPart = secret.replace('whsec_', '');
  assert.match(hexPart, /^[a-f0-9]{64}$/);
});

runCheck('CRYPTO-06', 'AES-256-GCM: Encrypt and decrypt secret with matching AAD binding', () => {
  const tenantId = '11111111-1111-1111-1111-111111111111';
  const subscriptionId = '22222222-2222-2222-2222-222222222222';
  const plaintext = generateWebhookSecret();

  const encrypted = encryptSecret(plaintext, tenantId, subscriptionId);
  assert.ok(encrypted.ciphertext instanceof Buffer);
  assert.ok(encrypted.iv instanceof Buffer);
  assert.ok(encrypted.tag instanceof Buffer);
  assert.strictEqual(encrypted.iv.length, 12); // Standard 96-bit GCM IV
  assert.strictEqual(encrypted.tag.length, 16); // Standard 128-bit GCM Auth Tag

  const decrypted = decryptSecret(encrypted.ciphertext, encrypted.iv, encrypted.tag, tenantId, subscriptionId);
  assert.strictEqual(decrypted, plaintext);
});

runCheck('CRYPTO-07', 'AES-256-GCM: Decryption fails if tenantId AAD does not match', () => {
  const tenantId = '11111111-1111-1111-1111-111111111111';
  const attackerTenantId = '33333333-3333-3333-3333-333333333333';
  const subscriptionId = '22222222-2222-2222-2222-222222222222';
  const plaintext = generateWebhookSecret();

  const encrypted = encryptSecret(plaintext, tenantId, subscriptionId);

  assert.throws(
    () => {
      decryptSecret(encrypted.ciphertext, encrypted.iv, encrypted.tag, attackerTenantId, subscriptionId);
    },
    /Unsupported state or unable to authenticate data|bad decrypt/i
  );
});

runCheck('CRYPTO-08', 'AES-256-GCM: Decryption fails if subscriptionId AAD does not match', () => {
  const tenantId = '11111111-1111-1111-1111-111111111111';
  const subscriptionId = '22222222-2222-2222-2222-222222222222';
  const tamperedSubId = '44444444-4444-4444-4444-444444444444';
  const plaintext = generateWebhookSecret();

  const encrypted = encryptSecret(plaintext, tenantId, subscriptionId);

  assert.throws(
    () => {
      decryptSecret(encrypted.ciphertext, encrypted.iv, encrypted.tag, tenantId, tamperedSubId);
    },
    /Unsupported state or unable to authenticate data|bad decrypt/i
  );
});

runCheck('CRYPTO-09', 'AES-256-GCM: Decryption fails if ciphertext bytes are corrupted', () => {
  const tenantId = '11111111-1111-1111-1111-111111111111';
  const subscriptionId = '22222222-2222-2222-2222-222222222222';
  const plaintext = generateWebhookSecret();

  const encrypted = encryptSecret(plaintext, tenantId, subscriptionId);
  const corrupted = Buffer.from(encrypted.ciphertext);
  corrupted[0] ^= 0xff; // Flip bits

  assert.throws(
    () => {
      decryptSecret(corrupted, encrypted.iv, encrypted.tag, tenantId, subscriptionId);
    },
    /Unsupported state or unable to authenticate data|bad decrypt/i
  );
});

// ─── 3. HMAC-SHA256 Signatures & Dual-Secret Rotation Tests ───
runCheck('CRYPTO-10', 'Generate valid single HMAC-SHA256 signature header', () => {
  const secret = 'whsec_test_secret_0123456789abcdef0123456789abcdef0123456789abcdef';
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadRaw = '{"event":"ping"}';

  const sig = generateWebhookSignature(secret, timestamp, payloadRaw);
  const header = formatSignatureHeader(timestamp, sig);

  assert.ok(header.startsWith(`t=${timestamp},v1=`));
  assert.strictEqual(header, `t=${timestamp},v1=${sig}`);
});

runCheck('CRYPTO-11', 'Generate dual signature header during secret rotation', () => {
  const secretActive = 'whsec_active_secret_0123456789abcdef0123456789abcdef0123456789abcdef';
  const secretPrevious = 'whsec_previous_secret_0123456789abcdef0123456789abcdef0123456789abcdef';
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadRaw = '{"event":"ping"}';

  const sigActive = generateWebhookSignature(secretActive, timestamp, payloadRaw);
  const sigPrev = generateWebhookSignature(secretPrevious, timestamp, payloadRaw);

  const header = formatSignatureHeader(timestamp, sigActive, sigPrev);
  assert.strictEqual(header, `t=${timestamp},v1=${sigActive},v1=${sigPrev}`);
});

runCheck('CRYPTO-12', 'Verify signature successfully with active secret', () => {
  const secret = 'whsec_test_secret_0123456789abcdef0123456789abcdef0123456789abcdef';
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadRaw = '{"event":"election.results.published"}';

  const sig = generateWebhookSignature(secret, timestamp, payloadRaw);
  const header = formatSignatureHeader(timestamp, sig);

  const result = verifyWebhookSignature(payloadRaw, header, secret);
  assert.strictEqual(result.valid, true);
});

runCheck('CRYPTO-13', 'Verify signature successfully against previous secret during rotation', () => {
  const secretActive = 'whsec_active_0123456789abcdef0123456789abcdef0123456789abcdef';
  const secretPrevious = 'whsec_prev_0123456789abcdef0123456789abcdef0123456789abcdef';
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadRaw = '{"event":"test"}';

  const sigActive = generateWebhookSignature(secretActive, timestamp, payloadRaw);
  const sigPrev = generateWebhookSignature(secretPrevious, timestamp, payloadRaw);
  const header = formatSignatureHeader(timestamp, sigActive, sigPrev);

  // Receiver holding only old secret should still verify successfully
  const result = verifyWebhookSignature(payloadRaw, header, secretPrevious);
  assert.strictEqual(result.valid, true);
});

runCheck('CRYPTO-14', 'Reject signature if payload is modified even by 1 byte', () => {
  const secret = 'whsec_test_secret_0123456789abcdef0123456789abcdef0123456789abcdef';
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadRaw = '{"event":"ping","valid":true}';

  const sig = generateWebhookSignature(secret, timestamp, payloadRaw);
  const header = formatSignatureHeader(timestamp, sig);

  const tamperedPayload = '{"event":"ping","valid":false}';
  const result = verifyWebhookSignature(tamperedPayload, header, secret);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'SIGNATURE_MISMATCH');
});

runCheck('CRYPTO-15', 'Reject signature if timestamp is older than 300 seconds (replay attack protection)', () => {
  const secret = 'whsec_test_secret_0123456789abcdef0123456789abcdef0123456789abcdef';
  const pastTimestamp = Math.floor(Date.now() / 1000) - 305; // 305s ago
  const payloadRaw = '{"event":"ping"}';

  const sig = generateWebhookSignature(secret, pastTimestamp, payloadRaw);
  const header = formatSignatureHeader(pastTimestamp, sig);

  const result = verifyWebhookSignature(payloadRaw, header, secret);
  assert.strictEqual(result.valid, false);
  assert.ok(result.reason?.includes('EXPIRED'));
});

runCheck('CRYPTO-16', 'Reject signature if timestamp is more than 60 seconds in future (clock skew protection)', () => {
  const secret = 'whsec_test_secret_0123456789abcdef0123456789abcdef0123456789abcdef';
  const futureTimestamp = Math.floor(Date.now() / 1000) + 75; // 75s in future
  const payloadRaw = '{"event":"ping"}';

  const sig = generateWebhookSignature(secret, futureTimestamp, payloadRaw);
  const header = formatSignatureHeader(futureTimestamp, sig);

  const result = verifyWebhookSignature(payloadRaw, header, secret);
  assert.strictEqual(result.valid, false);
  assert.ok(result.reason?.includes('FUTURE'));
});

runCheck('CRYPTO-17', 'Redact plaintext secrets in logging helper to prevent credential leakage', () => {
  const secret = 'whsec_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const redacted = redactSecretsForLogging({ secret, tenant: 'test-tenant' });
  assert.strictEqual(redacted.secret, 'whsec_***');
  assert.strictEqual(redacted.tenant, 'test-tenant');
});


runCheck('CRYPTO-18', 'Encryption key accepts exactly 32 bytes encoded as 64 hex characters', () => {
  const previous = process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY;
  try {
    process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = 'ab'.repeat(32);
    assert.strictEqual(getMasterEncryptionKey().length, 32);
    process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = 'z'.repeat(64);
    assert.throws(() => getMasterEncryptionKey(), /exactly 64 hexadecimal characters/);
    process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = 'a'.repeat(65);
    assert.throws(() => getMasterEncryptionKey(), /exactly 64 hexadecimal characters/);
  } finally {
    if (previous === undefined) delete process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY;
    else process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = previous;
  }
});

runCheck('CRYPTO-20', 'PostgreSQL BYTEA encodes and decodes exactly without a text coercion loss', () => {
  const input = Buffer.from([0, 1, 2, 127, 128, 254, 255]);
  const encoded = encodeBytea(input);
  assert.strictEqual(encoded, '\\x0001027f80feff');
  assert.deepStrictEqual(decodeBytea(encoded), input);
  assert.deepStrictEqual(decodeBytea(Buffer.from(input)), input);
  assert.throws(() => decodeBytea('\\x01z2'), /INVALID_BYTEA_VALUE/);
});

runCheck('CRYPTO-19', 'Encryption key has no silent non-test or unset-environment fallback', () => {
  const previousEnv = process.env.NODE_ENV;
  const previousKey = process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY;
    assert.throws(() => getMasterEncryptionKey(), /missing or invalid/);
    delete process.env.NODE_ENV;
    assert.throws(() => getMasterEncryptionKey(), /missing or invalid/);
  } finally {
    if (previousEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnv;
    if (previousKey === undefined) delete process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY;
    else process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = previousKey;
  }
});

// ─── Summary ───
console.log('\n----------------------------------------------------------------');
console.log(`Results: ${passCount} passed, ${failCount} failed.`);
console.log('----------------------------------------------------------------\n');
if (failCount > 0) {
  process.exit(1);
}
