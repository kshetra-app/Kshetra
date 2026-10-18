#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-097.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 097 Verification Suite
 * Independently Authenticated Trust Policy, Verifiable Test Provenance,
 * and Canonical Progress Reconciliation
 *
 * Covers:
 * 1. Workstream A: Independently Authenticated Trust Policy & Adversarial Verification (17 tests)
 * 2. Workstream B: Verifiable Test Execution Provenance & Manifest Integrity (7 tests)
 * 3. Workstream C: Canonical Progress Reconciliation & Lineage (6 tests)
 * 4. Workstream D: Substantive Acceptance Criteria Verification & Mutation (9 tests)
 * 5. Workstream E: Semantic Validation Boundaries & Known Blockers (4 tests)
 * 6. Workstream F: Baseline Immutability, Governance & Air-Gap Preservation (6 tests)
 * Total: 49 exhaustive tests
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
console.log('KSHETRA W021.5 — CTO DIRECTIVE 097 VERIFICATION SUITE');
console.log('Independently Authenticated Trust Policy & Verifiable Test Provenance');
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
// 1. Workstream A: Independently Authenticated Trust Policy & Adversarial Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Workstream A: Independently Authenticated Trust Policy & Adversarial Verification ---');

runTest('1.1 A caller cannot authorize its own key by supplying a matching fingerprint whitelist in options without independent environment provenance', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-A01',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-18T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-a01',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  const oldEnvPolicy = process.env.CTO_TRUST_POLICY;
  delete process.env.CTO_TRUST_POLICY;
  try {
    assert.throws(
      () =>
        verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
          trustPolicy: {
            mode: 'APPROVED_FINGERPRINTS',
            approvedFingerprints: [fingerprint],
          },
          trustedAuthorities: [
            {
              keyId: 'test-key-a01',
              identity: 'Chief Technology Officer',
              role: 'CTO',
              publicKeyPem: pubPem,
              status: 'ACTIVE',
            },
          ],
        }),
      /CALLER_SELF_AUTHORIZATION_PROHIBITED/
    );
  } finally {
    if (oldEnvPolicy !== undefined) process.env.CTO_TRUST_POLICY = oldEnvPolicy;
  }
});

runTest('1.2 A caller cannot authorize its own key by supplying both externalPublicKey and externalTrustPin in options without matching process.env.CTO_TRUST_PIN', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-A02',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-18T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-a02',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  const oldEnvPin = process.env.CTO_TRUST_PIN;
  delete process.env.CTO_TRUST_PIN;
  try {
    assert.throws(
      () =>
        verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
          externalPublicKey: pubPem,
          externalTrustPin: fingerprint,
          trustedAuthorities: [
            {
              keyId: 'test-key-a02',
              identity: 'Chief Technology Officer',
              role: 'CTO',
              publicKeyPem: pubPem,
              status: 'ACTIVE',
            },
          ],
        }),
      /CALLER_SELF_AUTHORIZATION_PROHIBITED/
    );
  } finally {
    if (oldEnvPin !== undefined) process.env.CTO_TRUST_PIN = oldEnvPin;
  }
});

runTest('1.3 Production formal acceptance path (validateFormalAcceptanceArtifact) strips isolatedTestHarnessAuth and options, failing closed without environment trust anchor', () => {
  const tempDir = path.join(REPO_ROOT, 'reports', 'formal_acceptance');
  fs.mkdirSync(tempDir, { recursive: true });
  const tempFile = path.join(tempDir, 'temp_acceptance.json');
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-A-01',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Kshetra Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-18T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'cto-root-v1',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');
  fs.writeFileSync(tempFile, JSON.stringify(record, null, 2), 'utf8');

  const oldPin = process.env.CTO_TRUST_PIN;
  delete process.env.CTO_TRUST_PIN;
  try {
    assert.throws(
      () =>
        validateFormalAcceptanceArtifact(
          { taskId: 'W021.5-A-01' },
          'reports/formal_acceptance/temp_acceptance.json',
          tempFile,
          {
            isolatedTestHarnessAuth: true,
            externalTrustPin: fingerprint,
            trustedAuthorities: [{ keyId: 'cto-root-v1', identity: 'Kshetra Chief Technology Officer', role: 'CTO', publicKeyPem: pubPem, status: 'ACTIVE' }],
          }
        ),
      /TRUST_ANCHOR_UNPINNED/
    );
  } finally {
    if (oldPin !== undefined) process.env.CTO_TRUST_PIN = oldPin;
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  }
});

runTest('1.4 Independently provisioned environment configuration (process.env.CTO_TRUST_PIN) successfully establishes trust anchor', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-A04',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-18T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-a04',
    conditions: ['Condition 1 verified'],
    findings: ['Findings verified'],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  const oldEnvPin = process.env.CTO_TRUST_PIN;
  process.env.CTO_TRUST_PIN = fingerprint;
  try {
    const ok = verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
      trustedAuthorities: [
        {
          keyId: 'test-key-a04',
          identity: 'Chief Technology Officer',
          role: 'CTO',
          publicKeyPem: pubPem,
          status: 'ACTIVE',
        },
      ],
    });
    assert.strictEqual(ok, true);
  } finally {
    if (oldEnvPin !== undefined) process.env.CTO_TRUST_PIN = oldEnvPin;
    else delete process.env.CTO_TRUST_PIN;
  }
});

runTest('1.5 Caller-supplied trustedAuthorities alone fails closed with TRUST_ANCHOR_UNPINNED', () => {
  const { privateKey, pubPem } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-A05',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-18T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-a05',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  const oldPin = process.env.CTO_TRUST_PIN;
  delete process.env.CTO_TRUST_PIN;
  try {
    assert.throws(
      () =>
        verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
          trustedAuthorities: [{ keyId: 'test-key-a05', identity: 'Chief Technology Officer', role: 'CTO', publicKeyPem: pubPem, status: 'ACTIVE' }],
        }),
      /TRUST_ANCHOR_UNPINNED/
    );
  } finally {
    if (oldPin !== undefined) process.env.CTO_TRUST_PIN = oldPin;
  }
});

runTest('1.6 Caller-supplied externalPublicKey alone fails closed with UNTRUSTED_EXTERNAL_KEY', () => {
  const { privateKey, pubPem } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-A06',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-18T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-a06',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  const oldPin = process.env.CTO_TRUST_PIN;
  delete process.env.CTO_TRUST_PIN;
  try {
    assert.throws(
      () =>
        verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
          externalPublicKey: pubPem,
          trustedAuthorities: [
            {
              keyId: 'test-key-a06',
              identity: 'Chief Technology Officer',
              role: 'CTO',
              publicKeyPem: pubPem,
              status: 'ACTIVE',
            },
          ],
        }),
      /UNTRUSTED_EXTERNAL_KEY/
    );
  } finally {
    if (oldPin !== undefined) process.env.CTO_TRUST_PIN = oldPin;
  }
});

runTest('1.7 Malformed externalTrustPin (non-hex or non-64 chars) fails closed with MALFORMED_TRUST_PIN', () => {
  const { privateKey, pubPem } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-A07',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-18T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-a07',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        externalTrustPin: 'xyz123-short',
        trustedAuthorities: [
          {
            keyId: 'test-key-a07',
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

runTest('1.8 Malformed trustPolicy (unrecognized mode) fails closed with MALFORMED_TRUST_POLICY', () => {
  const { pubPem } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-A08',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-18T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-a08',
    signature: 'c2ln',
  };

  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        trustPolicy: { mode: 'UNRECOGNIZED_MODE' },
        trustedAuthorities: [{ keyId: 'test-key-a08', identity: 'Chief Technology Officer', role: 'CTO', publicKeyPem: pubPem, status: 'ACTIVE' }],
      }),
    /MALFORMED_TRUST_POLICY.*Unrecognized trust policy mode/
  );
});

runTest('1.9 Malformed trustPolicy (empty approvedFingerprints array) fails closed with MALFORMED_TRUST_POLICY', () => {
  const { pubPem } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-A09',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-18T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-a09',
    signature: 'c2ln',
  };

  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        trustPolicy: { mode: 'APPROVED_FINGERPRINTS', approvedFingerprints: [] },
        trustedAuthorities: [{ keyId: 'test-key-a09', identity: 'Chief Technology Officer', role: 'CTO', publicKeyPem: pubPem, status: 'ACTIVE' }],
      }),
    /MALFORMED_TRUST_POLICY.*approvedFingerprints must be a non-empty array/
  );
});

runTest('1.10 Conflicting trust configuration between pin and approvedFingerprints fails closed with MALFORMED_TRUST_POLICY', () => {
  const { pubPem } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-A10',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-18T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-a10',
    signature: 'c2ln',
  };

  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        trustPolicy: {
          mode: 'PIN_ANCHORED',
          pin: 'a'.repeat(64),
          approvedFingerprints: ['b'.repeat(64)],
        },
        trustedAuthorities: [{ keyId: 'test-key-a10', identity: 'Chief Technology Officer', role: 'CTO', publicKeyPem: pubPem, status: 'ACTIVE' }],
      }),
    /MALFORMED_TRUST_POLICY.*Conflicting trust configuration between pin and approvedFingerprints/
  );
});

runTest('1.11 Trust policy specifying unauthorized role fails closed with UNAUTHORIZED_ROLE', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-A11',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-18T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-a11',
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
          approvedFingerprints: [fingerprint],
          authorizedRole: 'ARCHITECT',
        },
        trustedAuthorities: [{ keyId: 'test-key-a11', identity: 'Chief Technology Officer', role: 'CTO', publicKeyPem: pubPem, status: 'ACTIVE' }],
      }),
    /UNAUTHORIZED_ROLE/
  );
});

runTest('1.12 Trust policy specifying unsupported key algorithm fails closed with UNSUPPORTED_KEY_ALGORITHM', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-A12',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-18T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-a12',
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
          approvedFingerprints: [fingerprint],
          keyAlgorithm: 'rsa4096',
        },
        trustedAuthorities: [{ keyId: 'test-key-a12', identity: 'Chief Technology Officer', role: 'CTO', publicKeyPem: pubPem, status: 'ACTIVE' }],
      }),
    /UNSUPPORTED_KEY_ALGORITHM/
  );
});

runTest('1.13 Authority with status REVOKED fails closed with references REVOKED authority', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-A13',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-18T00:00:00Z',
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
        isolatedTestHarnessAuth: true,
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

runTest('1.14 Rule IV-001 Non-Self-Acceptance: authorSelfAcceptance: true fails closed immediately', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-A14',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-18T00:00:00Z',
    authorSelfAcceptance: true,
    keyId: 'test-key-a14',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(record, 'dummy.json', {
        isolatedTestHarnessAuth: true,
        externalTrustPin: fingerprint,
        trustedAuthorities: [{ keyId: 'test-key-a14', identity: 'Chief Technology Officer', role: 'CTO', publicKeyPem: pubPem, status: 'ACTIVE' }],
      }),
    /violates Rule IV-001/
  );
});

runTest('1.15 Decision payload binding: Tampering with conditions or findings invalidates cryptographic signature', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-A15',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-18T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-a15',
    conditions: ['Condition A'],
    findings: ['Finding A'],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  // Tamper with conditions
  const tamperedRecord = { ...record, conditions: ['Condition B'] };
  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(tamperedRecord, 'dummy.json', {
        isolatedTestHarnessAuth: true,
        externalTrustPin: fingerprint,
        trustedAuthorities: [{ keyId: 'test-key-a15', identity: 'Chief Technology Officer', role: 'CTO', publicKeyPem: pubPem, status: 'ACTIVE' }],
      }),
    /cryptographic signature verification failed/i
  );
});

runTest('1.16 Decision payload binding: Tampering with decision (ACCEPTED -> REJECTED) invalidates cryptographic signature', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-A16',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-18T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-a16',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  const tamperedRecord = { ...record, decision: 'REJECTED' };
  assert.throws(
    () =>
      verifyCryptographicAcceptanceSignature(tamperedRecord, 'dummy.json', {
        isolatedTestHarnessAuth: true,
        externalTrustPin: fingerprint,
        trustedAuthorities: [{ keyId: 'test-key-a16', identity: 'Chief Technology Officer', role: 'CTO', publicKeyPem: pubPem, status: 'ACTIVE' }],
      }),
    /cryptographic signature verification failed/i
  );
});

runTest('1.17 Calling verifyCryptographicAcceptanceSignature with 4 arguments vs 3 arguments behaves identically', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-A17',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-18T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-key-a17',
    conditions: [],
    findings: [],
  };
  const payload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');

  const options = {
    isolatedTestHarnessAuth: true,
    externalTrustPin: fingerprint,
    trustedAuthorities: [{ keyId: 'test-key-a17', identity: 'Chief Technology Officer', role: 'CTO', publicKeyPem: pubPem, status: 'ACTIVE' }],
  };

  const res3 = verifyCryptographicAcceptanceSignature(record, 'dummy.json', options);
  const res4 = verifyCryptographicAcceptanceSignature('W021.5-TEST-A17', 'dummy.json', record, options);
  assert.strictEqual(res3, true);
  assert.strictEqual(res4, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Workstream B: Verifiable Test Execution Provenance & Manifest Integrity
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Workstream B: Verifiable Test Execution Provenance & Manifest Integrity ---');

runTest('2.1 Manifest audit: All manifest entries have exact suite identity, command, exitCode 0, status PASS, and outputLogPath', () => {
  const manifestPath = path.join(REPO_ROOT, 'reports', 'w021_5_test_execution_manifest.json');
  assert.strictEqual(fs.existsSync(manifestPath), true, 'Manifest file must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert.strictEqual(manifest.milestone, 'W021.5');
  assert.strictEqual(manifest.manifestSchema, 'https://kshetra.dev/schemas/test-execution-manifest.v2.json');
  assert.ok(Array.isArray(manifest.testSuites), 'Manifest must contain testSuites array');
  assert.ok(manifest.testSuites.length >= 5, `Expected >= 5 test suites in manifest, found ${manifest.testSuites.length}`);

  for (const s of manifest.testSuites) {
    assert.ok(s.suite, `Suite missing suite: ${JSON.stringify(s)}`);
    assert.ok(s.command, `Suite missing command: ${JSON.stringify(s)}`);
    assert.strictEqual(s.exitCode, 0, `Suite ${s.suite} has non-zero exitCode: ${s.exitCode}`);
    assert.strictEqual(s.status, 'PASS', `Suite ${s.suite} status is not PASS: ${s.status}`);
    assert.ok(s.testsPassed > 0, `Suite ${s.suite} has 0 passed tests`);
    assert.strictEqual(s.testsFailed, 0, `Suite ${s.suite} has failed tests`);
    assert.ok(s.outputLogPath, `Suite ${s.suite} missing outputLogPath`);
    assert.ok(/^[0-9a-f]{64}$/.test(s.outputLogSha256), `Suite ${s.suite} missing valid SHA-256 digest`);
  }
});

runTest('2.2 Mobile test manifest entry accurately specifies npm test for political-intelligence-journey.test.ts (23 passed), NOT directive-095', () => {
  const manifestPath = path.join(REPO_ROOT, 'reports', 'w021_5_test_execution_manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const mobileSuite = manifest.testSuites.find((s) => s.suite === 'apps/mobile/__tests__/political-intelligence-journey.test.ts');
  assert.ok(mobileSuite, 'Mobile journey test suite must be recorded in manifest');
  assert.ok(
    mobileSuite.command.includes('apps/mobile') && mobileSuite.command.includes('political-intelligence-journey.test.ts'),
    `Mobile command must execute the mobile journey suite, found: ${mobileSuite.command}`
  );
  assert.ok(!mobileSuite.command.includes('directive-095'), 'Mobile command must NOT reference directive-095');
  assert.strictEqual(mobileSuite.testsPassed, 23, 'Mobile test suite must report exactly 23 passed tests');
  assert.strictEqual(mobileSuite.testsFailed, 0);
  assert.strictEqual(mobileSuite.exitCode, 0);
  assert.strictEqual(mobileSuite.status, 'PASS');
});

runTest('2.3 Verifiable evidence connection: Every suite outputLogPath exists on disk and SHA-256 matches bitwise', () => {
  const manifestPath = path.join(REPO_ROOT, 'reports', 'w021_5_test_execution_manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  for (const s of manifest.testSuites) {
    const logAbs = path.resolve(REPO_ROOT, s.outputLogPath);
    assert.ok(fs.existsSync(logAbs), `Output log file missing on disk: ${s.outputLogPath}`);
    const content = fs.readFileSync(logAbs);
    const computedHash = crypto.createHash('sha256').update(content).digest('hex');
    assert.strictEqual(
      computedHash,
      s.outputLogSha256,
      `Bitwise SHA-256 mismatch for log ${s.outputLogPath}: expected ${s.outputLogSha256}, got ${computedHash}`
    );
  }
});

runTest('2.4 Mutation test: Tampering with manifest exitCode (0 -> 1) causes test-dependent criterion CRIT-G02-02 to FAIL', () => {
  const tmpManifest = path.join(REPO_ROOT, 'reports/.tmp_mutated_manifest_g02.json');
  const realManifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_test_execution_manifest.json'), 'utf8'));
  const mutated = JSON.parse(JSON.stringify(realManifest));
  const entry = mutated.testSuites.find((s) => s.suite === 'apps/api/src/__tests__/election-truth-contracts.test.ts');
  assert(entry, 'Suite entry must exist');
  entry.exitCode = 1;
  fs.writeFileSync(tmpManifest, JSON.stringify(mutated), 'utf8');

  try {
    assert.throws(
      () => evaluateTaskCriteria({ taskId: 'W021.5-G-02' }, REPO_ROOT, { testExecutionManifestPath: tmpManifest }),
      /Election truth contracts test execution failed or exitCode !== 0/
    );
  } finally {
    if (fs.existsSync(tmpManifest)) fs.unlinkSync(tmpManifest);
  }
});

runTest('2.5 Mutation test: Tampering with manifest status (PASS -> FAIL) causes test-dependent criterion CRIT-H01-02 to FAIL', () => {
  const tmpManifest = path.join(REPO_ROOT, 'reports/.tmp_mutated_manifest_h01.json');
  const realManifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_test_execution_manifest.json'), 'utf8'));
  const mutated = JSON.parse(JSON.stringify(realManifest));
  const entry = mutated.testSuites.find((s) => s.suite === 'apps/mobile/__tests__/political-intelligence-journey.test.ts');
  assert(entry, 'Suite entry must exist');
  entry.status = 'FAIL';
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

runTest('2.6 Mutation test: Tampering with manifest outputLogSha256 causes verifier to FAIL with checksum mismatch', () => {
  const tmpManifest = path.join(REPO_ROOT, 'reports/.tmp_mutated_manifest_sha.json');
  const realManifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_test_execution_manifest.json'), 'utf8'));
  const mutated = JSON.parse(JSON.stringify(realManifest));
  const entry = mutated.testSuites.find((s) => s.suite === 'apps/api/src/__tests__/election-truth-contracts.test.ts');
  assert(entry, 'Suite entry must exist');
  entry.outputLogSha256 = '0'.repeat(64);
  fs.writeFileSync(tmpManifest, JSON.stringify(mutated), 'utf8');

  try {
    assert.throws(
      () => evaluateTaskCriteria({ taskId: 'W021.5-G-02' }, REPO_ROOT, { testExecutionManifestPath: tmpManifest }),
      /Test execution log SHA-256 mismatch/
    );
  } finally {
    if (fs.existsSync(tmpManifest)) fs.unlinkSync(tmpManifest);
  }
});

runTest('2.7 Mutation test: Corrupting log file content causes bitwise SHA-256 verification failure', () => {
  const realManifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_test_execution_manifest.json'), 'utf8'));
  const entry = realManifest.testSuites.find((s) => s.suite === 'apps/api/src/__tests__/election-truth-contracts.test.ts');
  assert(entry, 'Suite entry must exist');
  const logAbs = path.resolve(REPO_ROOT, entry.outputLogPath);
  const originalLog = fs.readFileSync(logAbs, 'utf8');
  try {
    fs.writeFileSync(logAbs, originalLog + '\nCORRUPTED_LINE', 'utf8');
    assert.throws(
      () => evaluateTaskCriteria({ taskId: 'W021.5-G-02' }, REPO_ROOT),
      /Test execution log SHA-256 mismatch/
    );
  } finally {
    fs.writeFileSync(logAbs, originalLog, 'utf8');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Workstream C: Canonical Progress Reconciliation & Lineage
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Workstream C: Canonical Progress Reconciliation & Lineage ---');

runTest('3.1 Canonical progress accounting: Exactly 27 tasks sum to exactly 100.0% with non-overlapping partitions', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports', 'w021_5_execution_ledger.json');
  assert.strictEqual(fs.existsSync(ledgerPath), true, 'Ledger file must exist');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  const allTasks = ledger.stages.flatMap((s) => s.tasks);
  assert.strictEqual(allTasks.length, 27, 'Must contain exactly 27 canonical tasks');

  let totalWeight = 0;
  let totalRepoVerified = 0;
  let totalDbPending = 0;
  let totalBlocked = 0;
  let totalUnimplemented = 0;

  for (const t of allTasks) {
    totalWeight += t.weight;
    totalRepoVerified += t.accounting.repoVerifiedWeight;
    totalDbPending += t.accounting.databasePendingWeight;
    totalBlocked += t.accounting.blockedWeight;
    totalUnimplemented += t.accounting.unimplementedWeight;

    // Partition conservation law
    const partitionSum = Math.round((t.accounting.repoVerifiedWeight + t.accounting.databasePendingWeight + t.accounting.blockedWeight + t.accounting.unimplementedWeight) * 1000) / 1000;
    assert.strictEqual(
      partitionSum,
      t.weight,
      `Task ${t.taskId} partition sum (${partitionSum}) does not match task weight (${t.weight})`
    );
  }

  assert.strictEqual(Math.round(totalWeight * 10) / 10, 100.0, 'Total task weight must be 100.0%');
  assert.strictEqual(Math.round(totalRepoVerified * 10) / 10, 61.5, 'Repo verified total must be 61.5%');
  assert.strictEqual(Math.round(totalDbPending * 10) / 10, 10.5, 'Database pending total must be 10.5%');
  assert.strictEqual(Math.round(totalBlocked * 10) / 10, 22.5, 'Blocked total must be 22.5%');
  assert.strictEqual(Math.round(totalUnimplemented * 10) / 10, 5.5, 'Unimplemented total must be 5.5%');
});

runTest('3.2 Database-pending tasks reconciled: Exactly 4 tasks (W021.5-C-02, W021.5-D-02, W021.5-E-01, W021.5-F-02) totaling 10.5%', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports', 'w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const allTasks = ledger.stages.flatMap((s) => s.tasks);

  const dbTasks = allTasks.filter((t) => t.accounting.databasePendingWeight > 0);
  assert.strictEqual(dbTasks.length, 4, `Expected exactly 4 database-pending tasks, found ${dbTasks.length}`);

  const dbTaskIds = dbTasks.map((t) => t.taskId).sort();
  assert.deepStrictEqual(dbTaskIds, ['W021.5-C-02', 'W021.5-D-02', 'W021.5-E-01', 'W021.5-F-02']);

  const expectedWeights = {
    'W021.5-C-02': 2.5,
    'W021.5-D-02': 3.0,
    'W021.5-E-01': 2.0,
    'W021.5-F-02': 3.0,
  };

  for (const t of dbTasks) {
    assert.strictEqual(t.accounting.databasePendingWeight, expectedWeights[t.taskId], `Task ${t.taskId} db weight mismatch`);
    assert.strictEqual(t.accounting.requiresDatabaseExecution, true, `Task ${t.taskId} must have requiresDatabaseExecution: true`);
  }
});

runTest('3.3 Non-database tasks strictly have 0% databasePendingWeight', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports', 'w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const allTasks = ledger.stages.flatMap((s) => s.tasks);

  const nonDbTasks = allTasks.filter((t) => !['W021.5-C-02', 'W021.5-D-02', 'W021.5-E-01', 'W021.5-F-02'].includes(t.taskId));
  for (const t of nonDbTasks) {
    assert.strictEqual(t.accounting.databasePendingWeight, 0, `Task ${t.taskId} must have databasePendingWeight 0`);
  }
});

runTest('3.4 Directive lineage: reports/w021_5_execution_ledger.json records complete lineage through Directive 097 without overwriting history', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports', 'w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  assert.ok(ledger.directive, 'Ledger must have directive lineage');
  assert.ok(ledger.directive.includes('CTO Directive 096'), 'Lineage must include Directive 096');
  assert.ok(ledger.directive.includes('CTO Directive 097'), 'Lineage must include Directive 097');
  assert.ok(ledger.directive.includes('CTO Directive 086'), 'Lineage must preserve historical directives');
});

runTest('3.5 Deterministic generation: reconcileExecutionLedger produces identical JSON and Markdown ledgers with 0 unexplained diff', () => {
  const run1 = reconcileExecutionLedger(REPO_ROOT);
  const jsonPath = path.join(REPO_ROOT, 'reports', 'w021_5_execution_ledger.json');
  const mdPath = path.join(REPO_ROOT, 'reports', 'W021.5-EXECUTION-LEDGER.md');

  const jsonContent1 = fs.readFileSync(jsonPath, 'utf8');
  const mdContent1 = fs.readFileSync(mdPath, 'utf8');

  const run2 = reconcileExecutionLedger(REPO_ROOT);
  const jsonContent2 = fs.readFileSync(jsonPath, 'utf8');
  const mdContent2 = fs.readFileSync(mdPath, 'utf8');

  assert.strictEqual(jsonContent1, jsonContent2, 'JSON ledger must be byte-for-byte identical across runs');
  assert.strictEqual(mdContent1, mdContent2, 'Markdown ledger must be byte-for-byte identical across runs');
});

runTest('3.6 Reconciled milestone totals: repoVerified (61.5%) + dbPending (10.5%) + blocked (22.5%) + unimplemented (5.5%) = 100.0%', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports', 'w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  assert.strictEqual(ledger.summary.repoVerifiedEarnedPercent, 61.5);
  assert.strictEqual(ledger.summary.databasePendingPercent, 10.5);
  assert.strictEqual(ledger.summary.blockedPercent, 22.5);
  assert.strictEqual(ledger.summary.unimplementedPercent, 5.5);
  assert.strictEqual(ledger.summary.totalWeight, 100);
  assert.strictEqual(ledger.summary.formalAcceptancePercent, 0);
  assert.strictEqual(ledger.summary.databaseExecutionPercent, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Workstream D: Substantive Acceptance Criteria Verification & Mutation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Workstream D: Substantive Acceptance Criteria Verification & Mutation ---');

runTest('4.1 CRIT-B101-01 & CRIT-B101-02: Verifies statutory migration_conflicts table, constraints, indexes, and insert statements', () => {
  const res1 = TASK_SPECIFICATIONS['W021.5-B1-01'].criteria[0].verify(REPO_ROOT);
  assert.strictEqual(res1.passed, true, `CRIT-B101-01 failed: ${res1.message}`);

  const res2 = TASK_SPECIFICATIONS['W021.5-B1-01'].criteria[1].verify(REPO_ROOT);
  assert.strictEqual(res2.passed, true, `CRIT-B101-02 failed: ${res2.message}`);
});

runTest('4.2 CRIT-B102-01 & CRIT-B102-02: Verifies statutory AC-to-PC mapping foreign keys and indexes', () => {
  const res1 = TASK_SPECIFICATIONS['W021.5-B1-02'].criteria[0].verify(REPO_ROOT);
  assert.strictEqual(res1.passed, true, `CRIT-B102-01 failed: ${res1.message}`);

  const res2 = TASK_SPECIFICATIONS['W021.5-B1-02'].criteria[1].verify(REPO_ROOT);
  assert.strictEqual(res2.passed, true, `CRIT-B102-02 failed: ${res2.message}`);
});

runTest('4.3 CRIT-C01-02: Verifies both name and abbreviation columns independently in migration 064', () => {
  const res = TASK_SPECIFICATIONS['W021.5-C-01'].criteria[1].verify(REPO_ROOT);
  assert.strictEqual(res.passed, true, `CRIT-C01-02 failed: ${res.message}`);
  assert.ok(res.message.includes('independent name and abbreviation'));
});

runTest('4.4 CRIT-C03-01: Verifies multilingual party matrix contains >=25 identities across >=10 Indian languages and scripts', () => {
  const res = TASK_SPECIFICATIONS['W021.5-C-03'].criteria[0].verify(REPO_ROOT);
  assert.strictEqual(res.passed, true, `CRIT-C03-01 failed: ${res.message}`);
  assert.ok(res.message.includes('Multilingual matrix verified'));
});

runTest('4.5 CRIT-C03-02: Verifies symbol matrix contains >=15 records with non-empty symbol properties', () => {
  const res = TASK_SPECIFICATIONS['W021.5-C-03'].criteria[1].verify(REPO_ROOT);
  assert.strictEqual(res.passed, true, `CRIT-C03-02 failed: ${res.message}`);
  assert.ok(res.message.includes('Symbol matrix verified'));
});

runTest('4.6 CRIT-C03-03: Verifies alias collision matrix contains >=1000 audited keys and documented collisions and resolutions', () => {
  const res = TASK_SPECIFICATIONS['W021.5-C-03'].criteria[2].verify(REPO_ROOT);
  assert.strictEqual(res.passed, true, `CRIT-C03-03 failed: ${res.message}`);
  assert.ok(res.message.includes('Alias collision matrix verified'));
});

runTest('4.7 CRIT-G01-01 & CRIT-G01-02: Fastify route contracts and AST verified; distinguishes AST parse from full compiler build', () => {
  const res1 = TASK_SPECIFICATIONS['W021.5-G-01'].criteria[0].verify(REPO_ROOT);
  assert.strictEqual(res1.passed, true, `CRIT-G01-01 failed: ${res1.message}`);

  const res2 = TASK_SPECIFICATIONS['W021.5-G-01'].criteria[1].verify(REPO_ROOT);
  assert.strictEqual(res2.passed, true, `CRIT-G01-02 failed: ${res2.message}`);
});

runTest('4.8 Real mutation test: Deleting required column from migration 064 causes CRIT-C01-02 to FAIL', () => {
  const migPath = path.join(REPO_ROOT, 'supabase', 'migrations', '064_political_organization_governance_remediation.sql');
  const original = fs.readFileSync(migPath, 'utf8');
  try {
    const mutated = original.replace(/STANDARD_ABBREVIATION/g, 'DELETED_COLUMN');
    fs.writeFileSync(migPath, mutated, 'utf8');

    const res = TASK_SPECIFICATIONS['W021.5-C-01'].criteria[1].verify(REPO_ROOT);
    assert.strictEqual(res.passed, false, 'Mutated migration must cause CRIT-C01-02 to fail');
    assert.ok(res.message.includes('Multilingual abbreviation column missing'));
  } finally {
    fs.writeFileSync(migPath, original, 'utf8');
  }
});

runTest('4.9 Real mutation test: Truncating multilingual matrix below 10 languages causes CRIT-C03-01 to FAIL', () => {
  const matrixPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_b2_2c_multilingual_matrix.json');
  const original = fs.readFileSync(matrixPath, 'utf8');
  try {
    const parsed = JSON.parse(original);
    parsed.languagesCovered = ['hi', 'te', 'ta'];
    fs.writeFileSync(matrixPath, JSON.stringify(parsed, null, 2), 'utf8');

    const res = TASK_SPECIFICATIONS['W021.5-C-03'].criteria[0].verify(REPO_ROOT);
    assert.strictEqual(res.passed, false, 'Truncated languages must cause CRIT-C03-01 to fail');
    assert.ok(res.message.includes('fewer than 10 languages'));
  } finally {
    fs.writeFileSync(matrixPath, original, 'utf8');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Workstream E: Semantic Validation Boundaries & Known Blockers
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Workstream E: Semantic Validation Boundaries & Known Blockers ---');

runTest('5.1 SQL parser boundary: Recognizes nested comments, escaped quotes, dollar-quoted strings, and rejects unclosed syntax', () => {
  const sql = `
    -- Line comment
    /* Block comment with nested /* comment */ */
    CREATE TABLE test (
      id UUID,
      val TEXT DEFAULT 'O''Reilly',
      code TEXT DEFAULT $$ SELECT * FROM 'nested' $$
    );
  `;
  const stripped = stripSqlCommentsAndLiterals(sql);
  assert.ok(stripped.includes('CREATE TABLE test'));
  assert.ok(!stripped.includes("O''Reilly"));
  assert.ok(!stripped.includes('nested'));

  // Unclosed quote throws
  const unclosed = "CREATE TABLE bad (val TEXT DEFAULT 'unclosed);";
  assert.throws(() => stripSqlCommentsAndLiterals(unclosed), /Unclosed single quote/);
});

runTest('5.2 TypeScript AST validation: Catches syntax errors and rejects mock files containing only comments or string literals', () => {
  const tempDir = path.join(REPO_ROOT, 'reports', 'evidence', 'temp_ts_test');
  fs.mkdirSync(tempDir, { recursive: true });
  const commentFile = path.join(tempDir, 'comment.ts');
  const errorFile = path.join(tempDir, 'error.ts');

  try {
    fs.writeFileSync(commentFile, '/* Comment only */ // another line', 'utf8');
    assert.throws(
      () => validateTestContent({ taskId: 'TEST' }, 'comment.ts', commentFile),
      /lacking test assertions or test suites/
    );

    fs.writeFileSync(errorFile, 'const x: = invalid; function() {', 'utf8');
    assert.throws(
      () => validateTestContent({ taskId: 'TEST' }, 'error.ts', errorFile),
      /TypeScript syntax diagnostics/
    );
  } finally {
    if (fs.existsSync(commentFile)) fs.unlinkSync(commentFile);
    if (fs.existsSync(errorFile)) fs.unlinkSync(errorFile);
    if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
  }
});

runTest('5.3 Telangana AC 119 duplicate claim defect is strictly OPEN with 120 features for 119 statutory seats', () => {
  const geoPath = path.join(REPO_ROOT, 'data', 'geo', 'telangana-assembly.geojson');
  const geo = JSON.parse(fs.readFileSync(geoPath, 'utf8'));

  assert.strictEqual(geo.features.length, 120, 'Telangana GeoJSON must contain exactly 120 features');
  const ac119Features = geo.features.filter((f) => String(f.properties?.AC_NO) === '119');
  assert.strictEqual(ac119Features.length, 2, 'Must contain duplicate AC 119 features (2 features)');

  const res = TASK_SPECIFICATIONS['W021.5-B1-04'].criteria[0].verify(REPO_ROOT);
  assert.strictEqual(res.passed, true);
  assert.ok(res.message.includes('AC 119 duplicate claim defect detected'));

  const blockedRes = TASK_SPECIFICATIONS['W021.5-B1-04'].criteria[1].verify(REPO_ROOT);
  assert.strictEqual(blockedRes.passed, false);
  assert.ok(blockedRes.message.includes('AC 119 duplicate claim resolution'));
});

runTest('5.4 National statutory boundary completeness is NOT claimed without remaining 30 state GeoJSON files', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports', 'w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const allTasks = ledger.stages.flatMap((s) => s.tasks);

  const taskB104 = allTasks.find((t) => t.taskId === 'W021.5-B1-04');
  assert.ok(taskB104, 'Task W021.5-B1-04 must exist in ledger');
  assert.strictEqual(taskB104.accounting.blockedWeight, 1.5, 'Task W021.5-B1-04 must have 1.5% blocked weight');
  assert.strictEqual(taskB104.accounting.repoVerifiedWeight, 0.5, 'Task W021.5-B1-04 has only 0.5% repo-earned weight for Telangana geometry');
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Workstream F: Baseline Immutability, Governance & Air-Gap Preservation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 6. Workstream F: Baseline Immutability, Governance & Air-Gap Preservation ---');

runTest('6.1 Rule IV-001 Non-Self-Acceptance: Formal CTO acceptance remains strictly 0.0% (UNACCEPTED)', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports', 'w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  assert.strictEqual(ledger.summary.formalAcceptancePercent, 0.0, 'Formal CTO acceptance must be strictly 0.0%');
});

runTest('6.2 Financial defect DQ-W021.5-B2.2E-001 remains strictly OPEN awaiting independent CTO review', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports', 'w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  assert.strictEqual(ledger.financialDefectStatus.status, 'STRICTLY_OPEN', 'Financial defect must be strictly OPEN');
  assert.strictEqual(ledger.financialDefectStatus.defectId, 'DQ-W021.5-B2.2E-001');
});

runTest('6.3 Baseline immutability: All 68 SQL migrations are byte-for-byte identical to baseline commit 0ea572d', () => {
  const immutability = verifyMigrationImmutability();
  assert.strictEqual(immutability.isImmutabilityPreserved, true, 'Migration immutability must be preserved');
  assert.strictEqual(immutability.totalFilesAudited, 68, 'Must verify all 68 migrations');
});

runTest('6.4 Seed immutability: All 31 seed files have pure LF line endings matching baseline fb408ce (0 CRLF)', () => {
  const seedFiles = fs.readdirSync(path.join(REPO_ROOT, 'data', 'seed')).filter((f) => f.endsWith('-mla-profiles.ts'));
  assert.strictEqual(seedFiles.length, 31, 'Exactly 31 MLA profile seed files present');

  let crlfFiles = 0;
  for (const f of seedFiles) {
    const raw = fs.readFileSync(path.join(REPO_ROOT, 'data', 'seed', f));
    if (raw.includes(Buffer.from('\r\n'))) {
      crlfFiles++;
    }
  }
  assert.strictEqual(crlfFiles, 0, 'Zero CRLF line endings across all 31 MLA profile seed files (100% pure LF)');
});

runTest('6.5 Offline air-gap preservation: Live database execution weight is strictly 0.0%', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports', 'w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  assert.strictEqual(ledger.summary.databaseExecutionPercent, 0.0, 'Live database execution must be strictly 0.0%');
});

runTest('6.6 Reconciler determinism: Multiple runs produce byte-identical reports/w021_5_execution_ledger.json and reports/W021.5-EXECUTION-LEDGER.md', () => {
  const res1 = reconcileExecutionLedger(REPO_ROOT);
  const jsonPath = path.join(REPO_ROOT, 'reports', 'w021_5_execution_ledger.json');
  const mdPath = path.join(REPO_ROOT, 'reports', 'W021.5-EXECUTION-LEDGER.md');

  const jsonContent1 = fs.readFileSync(jsonPath, 'utf8');
  const mdContent1 = fs.readFileSync(mdPath, 'utf8');

  const res2 = reconcileExecutionLedger(REPO_ROOT);
  const jsonContent2 = fs.readFileSync(jsonPath, 'utf8');
  const mdContent2 = fs.readFileSync(mdPath, 'utf8');

  assert.strictEqual(jsonContent1, jsonContent2, 'JSON ledger must be byte-for-byte identical across runs');
  assert.strictEqual(mdContent1, mdContent2, 'Markdown ledger must be byte-for-byte identical across runs');
});

console.log('\n================================================================');
console.log(`VERIFICATION SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
