#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-096.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 096 Verification Suite
 * Close Trust-Anchor Bypass, Enforce Substantive Criteria, and Certify Ledger Evidence
 *
 * Covers:
 * 1. Workstream A: Close Trust-Anchor Bypass & Cryptographic Adjudication (22 tests)
 * 2. Workstream B: Substantive Task Criteria & End-to-End Mutation Tests (12 tests)
 * 3. Workstream C: Strict Ledger Schema & Non-Overlapping Accounting (7 tests)
 * 4. Workstream D: Semantic Validation & Test Execution Proof (8 tests)
 * 5. Workstream E: National Completeness & Known Blockers (4 tests)
 * 6. Workstream F: Baseline Immutability, Governance & Air-Gap Preservation (6 tests)
 * Total: 59 exhaustive adversarial and regression tests
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

import {
  validateTaskAccounting,
  validateTaskEvidence,
  validateClaimSpecificContent,
  validateFormalAcceptanceArtifact,
  computeLedgerSummary,
  reconcileExecutionLedger,
  generateLedgerMarkdown,
  getCanonicalAcceptancePayload,
  getTrustedAuthorities,
  verifyCryptographicAcceptanceSignature,
  computeKeyFingerprint,
  evaluateTaskCriteria,
  validateGeoJsonContent,
  validateSqlContent,
  validateTestContent,
  validateMarkdownContent,
  validateJsonContent,
  applyTaskAccountingDefaults,
  stripSqlCommentsAndLiterals,
  TASK_DELIVERABLE_SIGNATURES,
  TASK_SPECIFICATIONS,
  STAGE_EVIDENCE_RELEVANCE,
} from '../scripts/reconcile_execution_ledger.mjs';

import { verifyMigrationImmutability } from '../scripts/verify-migration-immutability.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const BASELINE_COMMIT_089 = '0ea572d860aa064766042f6b418b157fd8e2098f';
const BASELINE_COMMIT_090 = 'fb408cec80a21bf4a6b7c82fe665203b64c39af1';

console.log('================================================================');
console.log('KSHETRA W021.5 — CTO DIRECTIVE 096 VERIFICATION SUITE');
console.log('Close Trust-Anchor Bypass, Enforce Substantive Criteria & Certify Ledger');
console.log('================================================================\n');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failedTests++;
  }
}

// Helper to create an ephemeral Ed25519 test keypair
function createTestKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' });
  const fingerprint = computeKeyFingerprint(pubPem);
  return { publicKey, privateKey, pubPem, fingerprint };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Workstream A: Close Trust-Anchor Bypass & Cryptographic Adjudication
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Workstream A: Close Trust-Anchor Bypass & Cryptographic Adjudication ---');

runTest('1.1 verifyCryptographicAcceptanceSignature: Supplying options.trustedAuthorities alone fails closed with TRUST_ANCHOR_UNPINNED', () => {
  const { privateKey, pubPem } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-01',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-01',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        trustedAuthorities: [
          {
            keyId: 'test-key-01',
            identity: 'Chief Technology Officer',
            role: 'CTO',
            publicKeyPem: pubPem,
            status: 'ACTIVE',
          },
        ],
      }),
    /TRUST_ANCHOR_UNPINNED/
  );
});

runTest('1.2 verifyCryptographicAcceptanceSignature: Supplying options.externalPublicKey alone fails closed with UNTRUSTED_EXTERNAL_KEY', () => {
  const { privateKey, pubPem } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-02',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-02',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        externalPublicKey: pubPem,
        trustedAuthorities: [
          {
            keyId: 'test-key-02',
            identity: 'Chief Technology Officer',
            role: 'CTO',
            publicKeyPem: pubPem,
            status: 'ACTIVE',
          },
        ],
      }),
    /UNTRUSTED_EXTERNAL_KEY/
  );
});

runTest('1.3 verifyCryptographicAcceptanceSignature: Providing matching externalTrustPin validates anchored authority successfully', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-03',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-03',
    conditions: ['Condition 1 satisfied'],
    findings: ['Findings validated'],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  const result = verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
    externalTrustPin: fingerprint,
    trustedAuthorities: [
      {
        keyId: 'test-key-03',
        identity: 'Chief Technology Officer',
        role: 'CTO',
        publicKeyPem: pubPem,
        status: 'ACTIVE',
      },
    ],
  });
  assert.strictEqual(result, true);
});

runTest('1.4 verifyCryptographicAcceptanceSignature: Mismatched externalTrustPin fails closed with TRUST_PIN_MISMATCH', () => {
  const { privateKey, pubPem } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-04',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-04',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  const falsePin = 'a'.repeat(64);
  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        externalTrustPin: falsePin,
        trustedAuthorities: [
          {
            keyId: 'test-key-04',
            identity: 'Chief Technology Officer',
            role: 'CTO',
            publicKeyPem: pubPem,
            status: 'ACTIVE',
          },
        ],
      }),
    /TRUST_PIN_MISMATCH/
  );
});

runTest('1.5 verifyCryptographicAcceptanceSignature: Malformed externalTrustPin (non-hex or wrong length) fails closed with MALFORMED_TRUST_PIN', () => {
  const { privateKey, pubPem } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-05',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-05',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        externalTrustPin: 'not-a-valid-sha256-hex-pin',
        trustedAuthorities: [
          {
            keyId: 'test-key-05',
            identity: 'Chief Technology Officer',
            role: 'CTO',
            publicKeyPem: pubPem,
            status: 'ACTIVE',
          },
        ],
      }),
    /MALFORMED_TRUST_PIN/
  );
});

runTest('1.6 verifyCryptographicAcceptanceSignature: Trust policy mode APPROVED_FINGERPRINTS accepts approved key', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-06',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-06',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  const result = verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
    isolatedTestHarnessAuth: true,
    trustPolicy: {
      mode: 'APPROVED_FINGERPRINTS',
      approvedFingerprints: [fingerprint, 'b'.repeat(64)],
    },
    trustedAuthorities: [
      {
        keyId: 'test-key-06',
        identity: 'Chief Technology Officer',
        role: 'CTO',
        publicKeyPem: pubPem,
        status: 'ACTIVE',
      },
    ],
  });
  assert.strictEqual(result, true);
});

runTest('1.7 verifyCryptographicAcceptanceSignature: Trust policy mode APPROVED_FINGERPRINTS rejects unapproved key with TRUST_POLICY_MISMATCH', () => {
  const { privateKey, pubPem } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-07',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-07',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        isolatedTestHarnessAuth: true,
        trustPolicy: {
          mode: 'APPROVED_FINGERPRINTS',
          approvedFingerprints: ['c'.repeat(64)],
        },
        trustedAuthorities: [
          {
            keyId: 'test-key-07',
            identity: 'Chief Technology Officer',
            role: 'CTO',
            publicKeyPem: pubPem,
            status: 'ACTIVE',
          },
        ],
      }),
    /TRUST_POLICY_MISMATCH/
  );
});

runTest('1.8 verifyCryptographicAcceptanceSignature: Trust policy mode PIN_ANCHORED accepts valid pin and rejects mismatched pin', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-08',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-08',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  // Matching pin in trustPolicy
  const ok = verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
    isolatedTestHarnessAuth: true,
    trustPolicy: {
      mode: 'PIN_ANCHORED',
      pin: fingerprint,
    },
    trustedAuthorities: [
      {
        keyId: 'test-key-08',
        identity: 'Chief Technology Officer',
        role: 'CTO',
        publicKeyPem: pubPem,
        status: 'ACTIVE',
      },
    ],
  });
  assert.strictEqual(ok, true);

  // Mismatched pin in trustPolicy
  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        isolatedTestHarnessAuth: true,
        trustPolicy: {
          mode: 'PIN_ANCHORED',
          pin: 'd'.repeat(64),
        },
        trustedAuthorities: [
          {
            keyId: 'test-key-08',
            identity: 'Chief Technology Officer',
            role: 'CTO',
            publicKeyPem: pubPem,
            status: 'ACTIVE',
          },
        ],
      }),
    /TRUST_POLICY_MISMATCH/
  );
});

runTest('1.9 verifyCryptographicAcceptanceSignature: Malformed trust policy object or unrecognized mode fails closed with MALFORMED_TRUST_POLICY', () => {
  const { pubPem } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-09',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-09',
    signature: 'c2ln',
  };

  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        trustPolicy: { mode: 'UNRECOGNIZED_MODE' },
        trustedAuthorities: [{ keyId: 'test-key-09', identity: 'Chief Technology Officer', role: 'CTO', publicKeyPem: pubPem, status: 'ACTIVE' }],
      }),
    /MALFORMED_TRUST_POLICY.*Unrecognized trust policy mode/
  );

  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        trustPolicy: { mode: 'APPROVED_FINGERPRINTS', approvedFingerprints: [] },
        trustedAuthorities: [{ keyId: 'test-key-09', identity: 'Chief Technology Officer', role: 'CTO', publicKeyPem: pubPem, status: 'ACTIVE' }],
      }),
    /MALFORMED_TRUST_POLICY.*approvedFingerprints must be a non-empty array/
  );
});

runTest('1.10 verifyCryptographicAcceptanceSignature: Authority with status REVOKED fails closed with references REVOKED authority', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-10',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-revoked-key',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        externalTrustPin: fingerprint,
        trustedAuthorities: [
          {
            keyId: 'test-revoked-key',
            identity: 'Chief Technology Officer',
            role: 'CTO',
            publicKeyPem: pubPem,
            status: 'REVOKED',
          },
        ],
      }),
    /references REVOKED authority/
  );
});

runTest('1.11 verifyCryptographicAcceptanceSignature: Authority with unauthorized role (e.g. LEAD_ENGINEER) fails closed with UNAUTHORIZED_ROLE', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-11',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'LEAD_ENGINEER',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-unauthorized-role',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        externalTrustPin: fingerprint,
        trustedAuthorities: [
          {
            keyId: 'test-unauthorized-role',
            identity: 'Chief Technology Officer',
            role: 'LEAD_ENGINEER',
            publicKeyPem: pubPem,
            status: 'ACTIVE',
          },
        ],
      }),
    /UNAUTHORIZED_ROLE/
  );
});

runTest('1.12 verifyCryptographicAcceptanceSignature: Adjudication date outside validFrom / validUntil fails closed with KEY_NOT_YET_VALID or EXPIRED_KEY', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const recordFuture = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-12',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-01-01T00:00:00Z', // Before validFrom
    authorSelfAcceptance: false,
    keyId: 'test-validity-window',
    conditions: [],
    findings: [],
  };
  const payloadFuture = getCanonicalAcceptancePayload(recordFuture);
  recordFuture.signature = crypto.sign(null, Buffer.from(payloadFuture, 'utf8'), privateKey).toString('base64');

  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(recordFuture, 'dummy.json', {
        externalTrustPin: fingerprint,
        trustedAuthorities: [
          {
            keyId: 'test-validity-window',
            identity: 'Chief Technology Officer',
            role: 'CTO',
            publicKeyPem: pubPem,
            status: 'ACTIVE',
            validFrom: '2026-06-01T00:00:00Z',
            validUntil: '2026-12-31T23:59:59Z',
          },
        ],
      }),
    /NOT_YET_VALID/
  );

  const recordExpired = {
    ...recordFuture,
    adjudicationDate: '2027-01-01T00:00:00Z', // After validUntil
  };
  const payloadExpired = getCanonicalAcceptancePayload(recordExpired);
  recordExpired.signature = crypto.sign(null, Buffer.from(payloadExpired, 'utf8'), privateKey).toString('base64');

  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(recordExpired, 'dummy.json', {
        externalTrustPin: fingerprint,
        trustedAuthorities: [
          {
            keyId: 'test-validity-window',
            identity: 'Chief Technology Officer',
            role: 'CTO',
            publicKeyPem: pubPem,
            status: 'ACTIVE',
            validFrom: '2026-06-01T00:00:00Z',
            validUntil: '2026-12-31T23:59:59Z',
          },
        ],
      }),
    /EXPIRED_KEY/
  );
});

runTest('1.13 verifyCryptographicAcceptanceSignature: Rule IV-001 binding: authorSelfAcceptance: true fails closed with self-acceptance is strictly prohibited', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-13',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: true, // Self-acceptance attempt!
    keyId: 'test-self-accept',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        externalTrustPin: fingerprint,
        trustedAuthorities: [
          {
            keyId: 'test-self-accept',
            identity: 'Chief Technology Officer',
            role: 'CTO',
            publicKeyPem: pubPem,
            status: 'ACTIVE',
          },
        ],
      }),
    /violates Rule IV-001.*author self-acceptance is strictly prohibited/
  );
});

runTest('1.14 Decision binding: Tampering with keyId invalidates cryptographic signature', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-14',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-original',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  // Tamper keyId
  record.keyId = 'test-key-tampered';
  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        externalTrustPin: fingerprint,
        trustedAuthorities: [
          {
            keyId: 'test-key-tampered',
            identity: 'Chief Technology Officer',
            role: 'CTO',
            publicKeyPem: pubPem,
            status: 'ACTIVE',
          },
        ],
      }),
    /cryptographic signature verification failed/
  );
});

runTest('1.15 Decision binding: Tampering with adjudicationDate invalidates cryptographic signature', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-15',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-15',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  record.adjudicationDate = '2026-10-17T00:00:01Z';
  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        externalTrustPin: fingerprint,
        trustedAuthorities: [
          {
            keyId: 'test-key-15',
            identity: 'Chief Technology Officer',
            role: 'CTO',
            publicKeyPem: pubPem,
            status: 'ACTIVE',
          },
        ],
      }),
    /cryptographic signature verification failed/
  );
});

runTest('1.16 Decision binding: Tampering with taskRef invalidates cryptographic signature', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-16A',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-16',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  record.taskRef = 'W021.5-TEST-16B';
  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        externalTrustPin: fingerprint,
        trustedAuthorities: [
          {
            keyId: 'test-key-16',
            identity: 'Chief Technology Officer',
            role: 'CTO',
            publicKeyPem: pubPem,
            status: 'ACTIVE',
          },
        ],
      }),
    /cryptographic signature verification failed/
  );
});

runTest('1.17 Decision binding: Tampering with decision (e.g. ACCEPTED to REJECTED) invalidates cryptographic signature', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-17',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-17',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  record.decision = 'REJECTED';
  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        externalTrustPin: fingerprint,
        trustedAuthorities: [
          {
            keyId: 'test-key-17',
            identity: 'Chief Technology Officer',
            role: 'CTO',
            publicKeyPem: pubPem,
            status: 'ACTIVE',
          },
        ],
      }),
    /cryptographic signature verification failed/
  );
});

runTest('1.18 Decision binding: Tampering with conditions array invalidates cryptographic signature', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-18',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-18',
    conditions: ['Condition A', 'Condition B'],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  record.conditions.push('Sneaked Condition C');
  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        externalTrustPin: fingerprint,
        trustedAuthorities: [
          {
            keyId: 'test-key-18',
            identity: 'Chief Technology Officer',
            role: 'CTO',
            publicKeyPem: pubPem,
            status: 'ACTIVE',
          },
        ],
      }),
    /cryptographic signature verification failed/
  );
});

runTest('1.19 Decision binding: Tampering with findings array invalidates cryptographic signature', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-19',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-19',
    conditions: [],
    findings: ['Finding 1: clean code'],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  record.findings[0] = 'Finding 1: altered code';
  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        externalTrustPin: fingerprint,
        trustedAuthorities: [
          {
            keyId: 'test-key-19',
            identity: 'Chief Technology Officer',
            role: 'CTO',
            publicKeyPem: pubPem,
            status: 'ACTIVE',
          },
        ],
      }),
    /cryptographic signature verification failed/
  );
});

runTest('1.20 Decision binding: Tampering with authorSelfAcceptance invalidates Rule IV-001 non-self-acceptance', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-20',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-20',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  record.authorSelfAcceptance = true;
  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        externalTrustPin: fingerprint,
        trustedAuthorities: [
          {
            keyId: 'test-key-20',
            identity: 'Chief Technology Officer',
            role: 'CTO',
            publicKeyPem: pubPem,
            status: 'ACTIVE',
          },
        ],
      }),
    /violates Rule IV-001.*author self-acceptance is strictly prohibited/
  );
});

runTest('1.21 Calling verifyCryptographicAcceptanceSignature with 4 arguments vs 3 arguments functions identically', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-21',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-21',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  const options = {
    externalTrustPin: fingerprint,
    trustedAuthorities: [
      {
        keyId: 'test-key-21',
        identity: 'Chief Technology Officer',
        role: 'CTO',
        publicKeyPem: pubPem,
        status: 'ACTIVE',
      },
    ],
  };

  // 3-arg call
  const res3 = verifyCryptographicAcceptanceSignature(record, 'dummy.json', options);
  assert.strictEqual(res3, true);

  // 4-arg call
  const res4 = verifyCryptographicAcceptanceSignature('W021.5-TEST-21', 'dummy.json', record, options);
  assert.strictEqual(res4, true);
});

runTest('1.22 Calling verifyCryptographicAcceptanceSignature with mismatched signer identity throws IDENTITY_MISMATCH', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-22',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Imposter Identity',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-22',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        externalTrustPin: fingerprint,
        trustedAuthorities: [
          {
            keyId: 'test-key-22',
            identity: 'Chief Technology Officer',
            role: 'CTO',
            publicKeyPem: pubPem,
            status: 'ACTIVE',
          },
        ],
      }),
    /IDENTITY_MISMATCH/
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Workstream B: Substantive Task Criteria & End-to-End Mutation Tests
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 2. Workstream B: Substantive Task Criteria & End-to-End Mutation Tests ---');

runTest('2.1 Criteria evaluation: Every one of the 27 tasks produces explicit criterion statuses', () => {
  const taskIds = Object.keys(TASK_SPECIFICATIONS);
  assert.strictEqual(taskIds.length, 27, 'Must have exactly 27 canonical tasks');

  for (const taskId of taskIds) {
    const res = evaluateTaskCriteria({ taskId }, REPO_ROOT);
    assert(res.evaluations.length > 0, `Task ${taskId} must have criteria evaluations`);
    for (const ev of res.evaluations) {
      assert(
        ['PASS', 'FAIL', 'UNVERIFIED', 'BLOCKED', 'NOT_IMPLEMENTED'].includes(ev.status),
        `Task ${taskId} criterion ${ev.criterionId} has invalid status ${ev.status}`
      );
      assert(typeof ev.message === 'string' && ev.message.length > 0, `Task ${taskId} criterion ${ev.criterionId} missing evidence message`);
    }
  }
});

runTest('2.2 Task W021.5-B1-04 substantive GeoJSON verifier detects Telangana geometry and duplicate AC 119 defect', () => {
  const res = evaluateTaskCriteria({ taskId: 'W021.5-B1-04' }, REPO_ROOT);
  assert.strictEqual(res.evaluations[0].status, 'PASS');
  assert(res.evaluations[0].message.includes('120 features for 119 statutory seats'));
  assert.strictEqual(res.evaluations[1].status, 'BLOCKED');
  assert.strictEqual(res.derivedRepoRatio, 0.25);
});

runTest('2.3 Real end-to-end mutation test: Mutating GeoJSON to inject unclosed ring causes W021.5-B1-04 verifier to FAIL', () => {
  const tmpDir = path.join(REPO_ROOT, 'reports/.tmp_mutation_b104');
  fs.mkdirSync(tmpDir, { recursive: true });

  const geoSource = path.join(REPO_ROOT, 'data/geo/telangana-assembly.geojson');
  const geoCopy = path.join(tmpDir, 'mutated_telangana.geojson');
  const original = JSON.parse(fs.readFileSync(geoSource, 'utf8'));

  // Mutate first feature coordinates to create an unclosed ring (keeping coordinates inside India bbox)
  const mutated = JSON.parse(JSON.stringify(original));
  const ring = mutated.features[0].geometry.type === 'Polygon'
    ? mutated.features[0].geometry.coordinates[0]
    : mutated.features[0].geometry.coordinates[0][0];
  const first = ring[0];
  ring[ring.length - 1] = [first[0] + 0.001, first[1] + 0.001];
  fs.writeFileSync(geoCopy, JSON.stringify(mutated), 'utf8');

  try {
    assert.throws(
      () => validateGeoJsonContent({ taskId: 'W021.5-B1-04' }, 'mutated_telangana.geojson', geoCopy),
      /unclosed linear ring/i
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

runTest('2.4 Real end-to-end mutation test: Mutating GeoJSON to eliminate duplicate AC 119 causes verifier to reject lack of defect', () => {
  const tmpDir = path.join(REPO_ROOT, 'reports/.tmp_mutation_dup_ac');
  const geoDir = path.join(tmpDir, 'data/geo');
  fs.mkdirSync(geoDir, { recursive: true });

  const geoSource = path.join(REPO_ROOT, 'data/geo/telangana-assembly.geojson');
  const geoCopy = path.join(geoDir, 'telangana-assembly.geojson');
  const original = JSON.parse(fs.readFileSync(geoSource, 'utf8'));

  // Remove duplicate AC 119 to pretend defect is fixed without statutory reconciliation
  const mutated = JSON.parse(JSON.stringify(original));
  const first119Idx = mutated.features.findIndex((f) => String(f.properties?.AC_NO || '') === '119');
  if (first119Idx !== -1) {
    mutated.features.splice(first119Idx, 1);
  }
  fs.writeFileSync(geoCopy, JSON.stringify(mutated), 'utf8');

  try {
    assert.throws(
      () => evaluateTaskCriteria({ taskId: 'W021.5-B1-04' }, tmpDir),
      /Expected AC 119 duplicate claim defect in Telangana GeoJSON/
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

runTest('2.5 Real end-to-end mutation test: Mutating test execution manifest exit code to 1 causes CRIT-G02-02 to FAIL', () => {
  const tmpManifest = path.join(REPO_ROOT, 'reports/.tmp_mutated_manifest.json');
  const realManifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_test_execution_manifest.json'), 'utf8'));

  const mutated = JSON.parse(JSON.stringify(realManifest));
  const entry = mutated.testSuites.find((s) => s.suite === 'apps/api/src/__tests__/election-truth-contracts.test.ts');
  assert(entry, 'Suite entry must exist');
  entry.exitCode = 1; // Simulated failure!
  fs.writeFileSync(tmpManifest, JSON.stringify(mutated), 'utf8');

  try {
    // Evaluating G-02 with mutated manifest
    assert.throws(
      () => evaluateTaskCriteria({ taskId: 'W021.5-G-02' }, REPO_ROOT, { testExecutionManifestPath: tmpManifest }),
      /Election truth contracts test execution failed or exitCode !== 0/
    );
  } finally {
    if (fs.existsSync(tmpManifest)) fs.unlinkSync(tmpManifest);
  }
});

runTest('2.6 Real end-to-end mutation test: Mutating test execution manifest status to FAIL causes CRIT-H01-02 to FAIL', () => {
  const tmpManifest = path.join(REPO_ROOT, 'reports/.tmp_mutated_manifest_h01.json');
  const realManifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_test_execution_manifest.json'), 'utf8'));

  const mutated = JSON.parse(JSON.stringify(realManifest));
  const entry = mutated.testSuites.find((s) => s.suite === 'apps/mobile/__tests__/political-intelligence-journey.test.ts');
  assert(entry, 'Suite entry must exist');
  entry.status = 'FAIL'; // Simulated failure!
  fs.writeFileSync(tmpManifest, JSON.stringify(mutated), 'utf8');

  try {
    assert.throws(
      () => evaluateTaskCriteria({ taskId: 'W021.5-H-01' }, REPO_ROOT, { testExecutionManifestPath: tmpManifest }),
      /Mobile journey test execution failed or exitCode !== 0/
    );
  } finally {
    if (fs.existsSync(tmpManifest)) fs.unlinkSync(tmpManifest);
  }
});

runTest('2.7 Real end-to-end mutation test: Mutating constituency canonicalization count from 4123 causes CRIT-B01-02 to FAIL', () => {
  const tmpDir = path.resolve(REPO_ROOT, 'reports/.tmp_mutation_cov');
  const repDir = path.join(tmpDir, 'reports');
  const supDir = path.join(tmpDir, 'supabase/migrations');
  fs.mkdirSync(repDir, { recursive: true });
  fs.mkdirSync(supDir, { recursive: true });

  // Copy migration 059
  fs.copyFileSync(
    path.join(REPO_ROOT, 'supabase/migrations/059_canonical_national_constituency_registry.sql'),
    path.join(supDir, '059_canonical_national_constituency_registry.sql')
  );

  const covFile = path.join(REPO_ROOT, 'reports/w021_5b1_national_constituency_canonicalization.json');
  const covCopy = path.join(repDir, 'w021_5b1_national_constituency_canonicalization.json');
  const original = JSON.parse(fs.readFileSync(covFile, 'utf8'));

  const mutated = JSON.parse(JSON.stringify(original));
  mutated.totalConstituencies = 4120; // Tampered statutory count!
  if (mutated.summary) mutated.summary.totalConstituencies = 4120;
  if (mutated.nationalUniverse) mutated.nationalUniverse.assemblyConstituencies = 4120;
  fs.writeFileSync(covCopy, JSON.stringify(mutated), 'utf8');

  try {
    assert.throws(
      () => evaluateTaskCriteria({ taskId: 'W021.5-B1-01' }, tmpDir),
      /Constituency count mismatch in canonicalization report/
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

runTest('2.8 Real end-to-end mutation test: Deleting required evidence file causes verifier to throw with failed acceptance criteria', () => {
  const tmpDir = path.join(REPO_ROOT, 'reports/.tmp_mutation_empty_root');
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    assert.throws(
      () => evaluateTaskCriteria({ taskId: 'W021.5-C-02' }, tmpDir),
      /failed acceptance criteria: Migration 065 missing/
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

runTest('2.9 Real end-to-end mutation test: Empty or whitespace-only evidence file causes verifier to throw', () => {
  const tmpDir = path.join(REPO_ROOT, 'reports/.tmp_mutation_empty_file');
  fs.mkdirSync(tmpDir, { recursive: true });
  const emptySql = path.join(tmpDir, 'empty.sql');
  fs.writeFileSync(emptySql, '   \n\n\t  ', 'utf8');

  try {
    assert.throws(
      () => validateSqlContent({ taskId: 'TEST-TASK' }, 'empty.sql', emptySql),
      /comment-only or empty SQL file/
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

runTest('2.10 Non-repository criteria scopes (DATABASE_STAGING, BLOCKED_EXTERNAL, UNIMPLEMENTED) never award repo weight', () => {
  for (const taskId of Object.keys(TASK_SPECIFICATIONS)) {
    const res = evaluateTaskCriteria({ taskId }, REPO_ROOT);
    const nonRepoPassed = res.evaluations.filter(
      (e) => e.scope !== 'REPOSITORY_VERIFIABLE' && e.status === 'PASS'
    );
    assert.strictEqual(
      nonRepoPassed.length,
      0,
      `Task ${taskId} has non-repository criteria marked PASS`
    );
  }
});

runTest('2.11 Derived repository ratio is derived strictly from passing criteria; tampering with repoCompletionRatio throws RATIO_MISMATCH', () => {
  const task = {
    taskId: 'W021.5-B1-04',
    taskTitle: 'Telangana AC Boundary Verification',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'data/geo/telangana-assembly.geojson',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Telangana AC GeoJSON boundaries',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0, // Fraudulent 100% when only 25% passes!
      ratioRationale: 'Substantive justification for Telangana boundary criteria evaluation and blocked external state dependencies',
      repoVerifiedWeight: 2.0,
      databasePendingWeight: 0.0,
      unexecutedDatabaseWeight: 0.0,
      blockedWeight: 0.0,
      unimplementedWeight: 0.0,
      totalWeight: 2.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };

  assert.throws(
    () => validateTaskAccounting(task, null, {}),
    /reported ratio.*differs from verified ratio/
  );
});

runTest('2.12 Criterion weight integrity: Sum of criterion weight ratios for every task in TASK_SPECIFICATIONS strictly equals 1.0', () => {
  for (const [taskId, spec] of Object.entries(TASK_SPECIFICATIONS)) {
    let sum = 0.0;
    for (const c of spec.criteria) {
      assert(c.weightRatio > 0, `Criterion ${c.criterionId} in task ${taskId} must have positive weightRatio`);
      sum += c.weightRatio;
    }
    assert(
      Math.abs(sum - 1.0) < 1e-6,
      `Task ${taskId} criteria weightRatio sum (${sum}) does not equal 1.0`
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Workstream C: Strict Ledger Schema & Non-Overlapping Accounting
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 3. Workstream C: Strict Ledger Schema & Non-Overlapping Accounting ---');

runTest('3.1 Strict canonical ledger validation: Missing numeric accounting partition fields strictly throws error without auto-defaulting', () => {
  const taskIncomplete = {
    taskId: 'W021.5-B1-04',
    taskTitle: 'Telangana Boundary Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'data/geo/telangana-assembly.geojson',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Telangana AC GeoJSON boundaries',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 0.25,
      ratioRationale: 'Substantive justification for Telangana boundary criteria evaluation and blocked external state dependencies',
      // Missing repoVerifiedWeight, databasePendingWeight, blockedWeight, unimplementedWeight, unexecutedDatabaseWeight!
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };

  assert.throws(
    () => validateTaskAccounting(taskIncomplete, null, {}),
    /missing or invalid required numeric accounting field/
  );
});

runTest('3.2 Non-overlapping partition conservation law: repoVerified + dbPending + blocked + unimplemented = task.weight', () => {
  const taskBadSum = {
    taskId: 'W021.5-B1-04',
    taskTitle: 'Telangana Boundary Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'data/geo/telangana-assembly.geojson',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Telangana AC GeoJSON boundaries',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 0.25,
      ratioRationale: 'Substantive justification for Telangana boundary criteria evaluation and blocked external state dependencies',
      repoVerifiedWeight: 0.5,
      databasePendingWeight: 0.0,
      unexecutedDatabaseWeight: 0.0,
      blockedWeight: 1.0, // Sum = 0.5 + 1.0 = 1.5 != 2.0
      unimplementedWeight: 0.0,
      totalWeight: 1.5,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };

  assert.throws(
    () => validateTaskAccounting(taskBadSum, null, {}),
    /do not partition task weight/
  );
});

runTest('3.3 Strict allocation justification: Task with 0 database criteria throws error if databasePendingWeight > 0', () => {
  const taskBadDb = {
    taskId: 'W021.5-B1-04', // W021.5-B1-04 has 0 database criteria
    taskTitle: 'Telangana Boundary Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'data/geo/telangana-assembly.geojson',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Telangana AC GeoJSON boundaries',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 0.25,
      ratioRationale: 'Substantive justification for Telangana boundary criteria evaluation and blocked external state dependencies',
      repoVerifiedWeight: 0.5,
      databasePendingWeight: 0.5, // Unjustified!
      unexecutedDatabaseWeight: 0.5,
      requiresDatabaseExecution: true,
      databaseExecutionEvidenced: false,
      blockedWeight: 1.0,
      unimplementedWeight: 0.0,
      totalWeight: 2.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };

  assert.throws(
    () => validateTaskAccounting(taskBadDb, null, {}),
    /databasePendingWeight.*is not justified by criteria scopes/
  );
});

runTest('3.4 Strict allocation justification: Task with mismatched blocked criteria weight throws error', () => {
  const taskBadBlocked = {
    taskId: 'W021.5-B1-04', // W021.5-B1-04 has 1.5 expected blocked weight (75% of 2.0)
    taskTitle: 'Telangana Boundary Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'data/geo/telangana-assembly.geojson',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Telangana AC GeoJSON boundaries',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 0.25,
      ratioRationale: 'Substantive justification for Telangana boundary criteria evaluation and blocked external state dependencies',
      repoVerifiedWeight: 0.5,
      databasePendingWeight: 0.0,
      unexecutedDatabaseWeight: 0.0,
      blockedWeight: 1.0, // Expected 1.5!
      unimplementedWeight: 0.5,
      totalWeight: 2.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };

  assert.throws(
    () => validateTaskAccounting(taskBadBlocked, null, {}),
    /blockedWeight.*is not justified by criteria scopes/
  );
});

runTest('3.5 Strict allocation justification: Database pending weight requires requiresDatabaseExecution: true', () => {
  const taskMissingFlag = {
    taskId: 'W021.5-B1-04',
    taskTitle: 'Telangana Boundary Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'data/geo/telangana-assembly.geojson',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Telangana AC GeoJSON boundaries',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 0.25,
      ratioRationale: 'Substantive justification for Telangana boundary criteria evaluation and blocked external state dependencies',
      repoVerifiedWeight: 0.5,
      databasePendingWeight: 0.5,
      unexecutedDatabaseWeight: 0.5,
      requiresDatabaseExecution: false, // Inconsistent with databasePendingWeight > 0!
      databaseExecutionEvidenced: false,
      blockedWeight: 1.0,
      unimplementedWeight: 0.0,
      totalWeight: 2.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };

  assert.throws(
    () => validateTaskAccounting(taskMissingFlag, null, {}),
    /databasePendingWeight > 0, but requiresDatabaseExecution is not true/
  );
});

runTest('3.6 Ledger reconciler enforces exactly 27 unique canonical tasks and total task weight of 100.0%', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  const taskIds = [];
  let totalWeight = 0.0;

  for (const stage of ledger.stages) {
    for (const task of stage.tasks) {
      assert(!taskIds.includes(task.taskId), `Duplicate task ID: ${task.taskId}`);
      taskIds.push(task.taskId);
      totalWeight += task.weight;
    }
  }

  assert.strictEqual(taskIds.length, 27, 'Must have exactly 27 unique tasks in ledger');
  assert(
    Math.abs(totalWeight - 100.0) < 1e-6,
    `Total task weight must equal 100.0%, got ${totalWeight}`
  );
});

runTest('3.7 applyTaskAccountingDefaults helper correctly initializes synthetic test fixtures without contaminating canonical ledger', () => {
  const syntheticTask = {
    taskId: 'SYNTHETIC-01',
    weight: 5.0,
    accounting: {
      repoCompletionRatio: 0.6,
      ratioRationale: 'Synthetic test',
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };

  const defaulted = applyTaskAccountingDefaults(syntheticTask);
  assert.strictEqual(defaulted.weight, 5.0);
  assert.strictEqual(defaulted.accounting.repoVerifiedWeight, 3.0);
  assert.strictEqual(defaulted.accounting.databasePendingWeight, 0.0);
  assert.strictEqual(defaulted.accounting.blockedWeight, 0.0);
  assert.strictEqual(defaulted.accounting.unimplementedWeight, 2.0);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Workstream D: Semantic Validation & Test Execution Proof
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 4. Workstream D: Semantic Validation & Test Execution Proof ---');

runTest('4.1 SQL validation: Comment-only file is rejected with comment-only or empty SQL file', () => {
  const tmpDir = path.join(REPO_ROOT, 'reports/.tmp_mutation_sql_comment');
  fs.mkdirSync(tmpDir, { recursive: true });
  const commentSql = path.join(tmpDir, 'comments.sql');
  fs.writeFileSync(
    commentSql,
    '-- This is a comment\n-- SELECT * FROM users;\n/* Another comment CREATE TABLE foo (); */\n',
    'utf8'
  );

  try {
    assert.throws(
      () => validateSqlContent({ taskId: 'TEST-TASK' }, 'comments.sql', commentSql),
      /comment-only or empty SQL file/
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

runTest('4.2 SQL validation: Keyword-only file without valid statements is rejected', () => {
  const tmpDir = path.join(REPO_ROOT, 'reports/.tmp_mutation_sql_keywords');
  fs.mkdirSync(tmpDir, { recursive: true });
  const keywordSql = path.join(tmpDir, 'keywords.sql');
  fs.writeFileSync(keywordSql, 'CREATE TABLE INSERT UPDATE DELETE', 'utf8');

  try {
    assert.throws(
      () => validateSqlContent({ taskId: 'TEST-TASK' }, 'keywords.sql', keywordSql),
      /containing keyword-only text without valid statement structure/
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

runTest('4.3 SQL validation: SQL statements with comments and dollar-quoted strings with keywords inside are parsed correctly', () => {
  const sql = `
    -- Function definition
    CREATE OR REPLACE FUNCTION test_func() RETURNS text AS $$
    BEGIN
      -- nested comment inside body
      RETURN 'CREATE TABLE inside string literal';
    END;
    $$ LANGUAGE plpgsql;
  `;
  const stripped = stripSqlCommentsAndLiterals(sql);
  assert(!stripped.includes('Function definition'), 'Comments outside dollar-quotes must be stripped');
  assert(!stripped.includes('nested comment inside body'), 'Comments inside dollar-quotes must be stripped');
  assert(stripped.includes('CREATE OR REPLACE FUNCTION test_func'), 'Function statement must be preserved');
});

runTest('4.4 SQL validation: SQL file with unclosed quote is rejected with malformed syntax', () => {
  const tmpDir = path.join(REPO_ROOT, 'reports/.tmp_mutation_sql_unclosed');
  fs.mkdirSync(tmpDir, { recursive: true });
  const unclosedSql = path.join(tmpDir, 'unclosed.sql');
  fs.writeFileSync(unclosedSql, "INSERT INTO foo (col) VALUES ('unclosed string literal);", 'utf8');

  try {
    assert.throws(
      () => validateSqlContent({ taskId: 'TEST-TASK' }, 'unclosed.sql', unclosedSql),
      /Unclosed single quote string literal/
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

runTest('4.5 Test validation: Test file containing TypeScript syntax errors is rejected with parse diagnostics', () => {
  const tmpDir = path.join(REPO_ROOT, 'reports/.tmp_mutation_ts_syntax');
  fs.mkdirSync(tmpDir, { recursive: true });
  const badTs = path.join(tmpDir, 'bad_syntax.test.ts');
  fs.writeFileSync(badTs, 'describe("suite", () => { it("test", () => { const x: = 123; }); });', 'utf8');

  try {
    assert.throws(
      () => validateTestContent({ taskId: 'TEST-TASK' }, 'bad_syntax.test.ts', badTs),
      /syntax diagnostics/
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

runTest('4.6 Test validation: Test file with keywords only in comments or string literals is rejected', () => {
  const tmpDir = path.join(REPO_ROOT, 'reports/.tmp_mutation_ts_comment');
  fs.mkdirSync(tmpDir, { recursive: true });
  const commentTs = path.join(tmpDir, 'comment_only.test.ts');
  fs.writeFileSync(commentTs, '// describe("fake suite", () => { it("fake test", () => { assert(true); }); });', 'utf8');

  try {
    assert.throws(
      () => validateTestContent({ taskId: 'TEST-TASK' }, 'comment_only.test.ts', commentTs),
      /comment-only or empty test file/
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

runTest('4.7 Test validation: Valid test file with executable AST describe/it/assert syntax passes validation', () => {
  const tmpDir = path.join(REPO_ROOT, 'reports/.tmp_mutation_ts_valid');
  fs.mkdirSync(tmpDir, { recursive: true });
  const validTs = path.join(tmpDir, 'valid.test.ts');
  fs.writeFileSync(
    validTs,
    'import assert from "assert";\ndescribe("Suite", () => {\n  it("does something", () => {\n    assert.strictEqual(1, 1);\n  });\n});\n',
    'utf8'
  );

  try {
    assert.doesNotThrow(() => validateTestContent({ taskId: 'TEST-TASK' }, 'valid.test.ts', validTs));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

runTest('4.8 Test execution proof: Test execution manifest requires exit code 0, non-zero passed tests, and verified file path', () => {
  const manifestPath = path.join(REPO_ROOT, 'reports/w021_5_test_execution_manifest.json');
  assert(fs.existsSync(manifestPath), 'Test execution manifest must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert(manifest.manifestSchema, 'Must have manifestSchema');
  assert(Array.isArray(manifest.testSuites), 'Must have testSuites array');
  assert(manifest.testSuites.length >= 4, 'Must have at least 4 test suites');

  for (const suite of manifest.testSuites) {
    assert.strictEqual(suite.exitCode, 0, `Suite ${suite.suite} exitCode must be 0`);
    assert(suite.testsPassed > 0, `Suite ${suite.suite} testsPassed must be > 0`);
    assert.strictEqual(suite.testsFailed, 0, `Suite ${suite.suite} testsFailed must be 0`);
    assert(fs.existsSync(path.join(REPO_ROOT, suite.suite)), `Test file ${suite.suite} must exist on disk`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Workstream E: National Completeness & Known Blockers
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 5. Workstream E: National Completeness & Known Blockers ---');

runTest('5.1 Telangana AC 119 duplicate claim defect is strictly recorded as OPEN / BLOCKED', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  const allTasks = ledger.stages.flatMap((s) => s.tasks);
  const taskB104 = allTasks.find((t) => t.taskId === 'W021.5-B1-04');
  assert(taskB104, 'Task B1-04 must exist');

  assert.strictEqual(taskB104.accounting.blockedWeight, 1.5, 'Task B1-04 must have 1.5 blocked weight');
  assert(taskB104.accounting.ratioRationale.includes('AC 119 duplicate claim defect'));
});

runTest('5.2 Telangana GeoJSON has 120 features for 119 statutory seats (2 features for AC 119)', () => {
  const geoPath = path.join(REPO_ROOT, 'data/geo/telangana-assembly.geojson');
  const geo = JSON.parse(fs.readFileSync(geoPath, 'utf8'));
  assert.strictEqual(geo.features.length, 120, 'Telangana master GeoJSON must have 120 features');

  const ac119Features = geo.features.filter((f) => String(f.properties?.AC_NO || '') === '119');
  assert.strictEqual(ac119Features.length, 2, 'Must have exactly 2 features for AC 119');
});

runTest('5.3 National coverage matrix correctly identifies 31 audited states and 4,123 statutory seats', () => {
  const covPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
  const cov = JSON.parse(fs.readFileSync(covPath, 'utf8'));

  assert.strictEqual(cov.totalStatesAudited, 31);
  assert.strictEqual(cov.summary.totalStatutorySeats, 4123);
  assert.strictEqual(cov.summary.totalSeededConstituencies, 4123);
});

runTest('5.4 National boundary completeness is NOT claimed merely because Telangana geometry parses', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  // Formal CTO acceptance must remain 0.0%
  assert.strictEqual(ledger.summary.formalAcceptancePercent, 0.0);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Workstream F: Baseline Immutability, Governance & Air-Gap Preservation
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 6. Workstream F: Baseline Immutability, Governance & Air-Gap Preservation ---');

runTest('6.1 Rule IV-001 Non-Self-Acceptance: Formal CTO acceptance remains strictly 0.0%', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  assert.strictEqual(ledger.summary.formalAcceptancePercent, 0.0);

  for (const stage of ledger.stages) {
    for (const task of stage.tasks) {
      assert.notStrictEqual(task.accounting.formalAcceptanceStatus, 'CONFIRMED_ACCEPTED');
      assert.strictEqual(task.accounting.formalAcceptanceArtifact, null);
    }
  }
});

runTest('6.2 Financial defect DQ-W021.5-B2.2E-001 remains strictly OPEN awaiting external CTO review', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  assert(ledger.financialDefectStatus, 'financialDefectStatus must exist');
  assert.strictEqual(ledger.financialDefectStatus.defectId, 'DQ-W021.5-B2.2E-001');
  assert.strictEqual(ledger.financialDefectStatus.status, 'STRICTLY_OPEN');
});

runTest('6.3 Baseline immutability: All 68 SQL migrations are byte-for-byte identical to commit 0ea572d', () => {
  const immutabilityResult = verifyMigrationImmutability(BASELINE_COMMIT_089);
  assert.strictEqual(immutabilityResult.isImmutabilityPreserved, true);
  assert.strictEqual(immutabilityResult.totalFilesAudited, 68);
  assert.strictEqual(immutabilityResult.identicalCount, 68);
  assert.strictEqual(immutabilityResult.missingPaths.length, 0);
  assert.strictEqual(immutabilityResult.addedPaths.length, 0);
  assert.strictEqual(immutabilityResult.contentModifiedFiles.length, 0);
});

runTest('6.4 Seed invariants: All 31 seed files have pure LF line endings matching baseline fb408ce (0 CRLF)', () => {
  const seedFiles = fs.readdirSync(path.join(REPO_ROOT, 'data/seed')).filter((f) => f.endsWith('-mla-profiles.ts'));
  assert.strictEqual(seedFiles.length, 31, 'Exactly 31 MLA profile seed files present');

  let crlfFiles = 0;
  for (const f of seedFiles) {
    const raw = fs.readFileSync(path.join(REPO_ROOT, 'data/seed', f));
    if (raw.includes(Buffer.from('\r\n'))) {
      crlfFiles++;
    }
  }
  assert.strictEqual(crlfFiles, 0, 'Zero CRLF line endings across all 31 MLA profile seed files (100% pure LF)');
});

runTest('6.5 Offline air-gap preservation: Live database execution weight is strictly 0.0%', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  assert.strictEqual(ledger.summary.databaseExecutionPercent, 0.0);
});

runTest('6.6 Reconciler idempotency: reconcileExecutionLedger produces byte-identical outputs across runs', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const mdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');

  // Run reconciler first time
  reconcileExecutionLedger();
  const json1 = fs.readFileSync(jsonPath, 'utf8');
  const md1 = fs.readFileSync(mdPath, 'utf8');

  // Run reconciler second time
  reconcileExecutionLedger();
  const json2 = fs.readFileSync(jsonPath, 'utf8');
  const md2 = fs.readFileSync(mdPath, 'utf8');

  assert.strictEqual(json1, json2, 'JSON ledger must be byte-identical across runs');
  assert.strictEqual(md1, md2, 'Markdown ledger must be byte-identical across runs');
});

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`VERIFICATION SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
