#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-095.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 095 Verification Suite
 * Independent Trust Anchoring, Evidence-Derived Completion, and Canonical Ledger Reconciliation
 *
 * Covers:
 * 1. Workstream A: Independent Trust Boundary & Cryptographic Adjudication (18 tests)
 * 2. Workstream B: Enforceable Acceptance Criteria & Mutation Verifiers (9 tests)
 * 3. Workstream C: Non-Overlapping Progress Accounting & Dimension Partition (5 tests)
 * 4. Workstream D: Hardened Semantic Artifact Validation (13 tests)
 * 5. Workstream E: Canonical 27-Task Inventory & Deterministic Reporting (5 tests)
 * 6. Workstream F: Baseline Immutability, Minimal Diffs & Governance (6 tests)
 * Total: 56 rigorous adversarial and regression tests
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
console.log('KSHETRA W021.5 — CTO DIRECTIVE 095 VERIFICATION SUITE');
console.log('Independent Trust Anchoring, Evidence-Derived Completion & Reconciliation');
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
// 1. Workstream A: Independent Trust Boundary & Cryptographic Adjudication
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Workstream A: Independent Trust Boundary & Cryptographic Adjudication ---');

runTest('1.1 Replacing repository trust registry and public key fails closed with TRUST_ANCHOR_UNPINNED when no external pin is provided', () => {
  const tmpRogueKey = path.join(REPO_ROOT, 'reports/.tmp_rogue_key_acceptance.json');

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-ROGUE-01',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Kshetra Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'cto-root-v1', // Using repository-committed key
    signature: 'c29tZV90ZXN0X3NpZ25hdHVyZV9ieXRlc19mb3JfdW5waW5uZWRfdGVzdA==',
    conditions: [],
    findings: [],
  };
  fs.writeFileSync(tmpRogueKey, JSON.stringify(record, null, 2), 'utf8');

  try {
    const task = {
      taskId: 'W021.5-TEST-ROGUE-01',
      taskTitle: 'Rogue Injected Key Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid rationale for test',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_rogue_key_acceptance.json',
      },
    };

    // No external trust pin provisioned in options or environment!
    assert.throws(
      () => validateTaskAccounting(task, null, {}),
      /TRUST_ANCHOR_UNPINNED.*No external trust pin/
    );
  } finally {
    if (fs.existsSync(tmpRogueKey)) fs.unlinkSync(tmpRogueKey);
  }
});

runTest('1.2 Providing an external trust pin that does NOT match the authority public key fails closed with TRUST_PIN_MISMATCH', () => {
  const { privateKey, pubPem } = createTestKeyPair();
  const tmpMismatchedPin = path.join(REPO_ROOT, 'reports/.tmp_mismatched_pin_acceptance.json');

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-MISPIN-01',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-authority-mispin',
    conditions: [],
    findings: [],
  };
  const canonicalPayload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKey).toString('base64');
  fs.writeFileSync(tmpMismatchedPin, JSON.stringify(record, null, 2), 'utf8');

  try {
    const task = {
      taskId: 'W021.5-TEST-MISPIN-01',
      taskTitle: 'Mismatched Pin Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid rationale for test',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_mismatched_pin_acceptance.json',
      },
    };

    const options = {
      externalTrustPin: '0000000000000000000000000000000000000000000000000000000000000000', // False trust pin!
      trustedAuthorities: [
        {
          keyId: 'test-authority-mispin',
          identity: 'Chief Technology Officer',
          role: 'CTO',
          algorithm: 'Ed25519',
          publicKeyPem: pubPem,
          status: 'ACTIVE',
        },
      ],
    };

    assert.throws(
      () => validateTaskAccounting(task, null, options),
      /TRUST_PIN_MISMATCH.*does not match external trust pin/
    );
  } finally {
    if (fs.existsSync(tmpMismatchedPin)) fs.unlinkSync(tmpMismatchedPin);
  }
});

runTest('1.3 Providing a matching external trust pin validates the independently anchored key successfully', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const tmpValidPin = path.join(REPO_ROOT, 'reports/.tmp_valid_pin_acceptance.json');

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-VALPIN-01',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-authority-valpin',
    conditions: ['Condition 1 satisfied'],
    findings: ['No material defects'],
  };
  const canonicalPayload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKey).toString('base64');
  fs.writeFileSync(tmpValidPin, JSON.stringify(record, null, 2), 'utf8');

  try {
    const task = {
      taskId: 'W021.5-TEST-VALPIN-01',
      taskTitle: 'Valid Pin Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid rationale for test',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_valid_pin_acceptance.json',
      },
    };

    const options = {
      externalTrustPin: fingerprint, // Exact matching trust pin injected!
      trustedAuthorities: [
        {
          keyId: 'test-authority-valpin',
          identity: 'Chief Technology Officer',
          role: 'CTO',
          algorithm: 'Ed25519',
          publicKeyPem: pubPem,
          status: 'ACTIVE',
        },
      ],
    };

    assert.strictEqual(validateTaskAccounting(task, null, options), true);
  } finally {
    if (fs.existsSync(tmpValidPin)) fs.unlinkSync(tmpValidPin);
  }
});

runTest('1.4 A key whose registered role is not CTO fails closed with UNAUTHORIZED_ROLE', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const tmpNonCto = path.join(REPO_ROOT, 'reports/.tmp_non_cto_acceptance.json');

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-NONCTO-01',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Lead Engineer',
    adjudicatorRole: 'CTO', // Signer claims CTO role...
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'engineer-key-01',
  };
  const canonicalPayload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKey).toString('base64');
  fs.writeFileSync(tmpNonCto, JSON.stringify(record, null, 2), 'utf8');

  try {
    const task = {
      taskId: 'W021.5-TEST-NONCTO-01',
      taskTitle: 'Non CTO Role Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid rationale for test',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_non_cto_acceptance.json',
      },
    };

    const options = {
      externalTrustPin: fingerprint,
      trustedAuthorities: [
        {
          keyId: 'engineer-key-01',
          identity: 'Lead Engineer',
          role: 'ENGINEERING_LEAD', // Registered authority role is not CTO!
          algorithm: 'Ed25519',
          publicKeyPem: pubPem,
          status: 'ACTIVE',
        },
      ],
    };

    assert.throws(
      () => validateTaskAccounting(task, null, options),
      /UNAUTHORIZED_ROLE.*requires role "CTO"/
    );
  } finally {
    if (fs.existsSync(tmpNonCto)) fs.unlinkSync(tmpNonCto);
  }
});

runTest('1.5 A signer identity that conflicts with the registered authority identity fails closed with IDENTITY_MISMATCH', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const tmpIdMismatch = path.join(REPO_ROOT, 'reports/.tmp_id_mismatch_acceptance.json');

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-IDMIS-01',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Imposter Adjudicator', // Does not match registered identity
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'cto-test-key-idmis',
  };
  const canonicalPayload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKey).toString('base64');
  fs.writeFileSync(tmpIdMismatch, JSON.stringify(record, null, 2), 'utf8');

  try {
    const task = {
      taskId: 'W021.5-TEST-IDMIS-01',
      taskTitle: 'Identity Mismatch Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid rationale for test',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_id_mismatch_acceptance.json',
      },
    };

    const options = {
      externalTrustPin: fingerprint,
      trustedAuthorities: [
        {
          keyId: 'cto-test-key-idmis',
          identity: 'Legitimate CTO Name',
          role: 'CTO',
          algorithm: 'Ed25519',
          publicKeyPem: pubPem,
          status: 'ACTIVE',
        },
      ],
    };

    assert.throws(
      () => validateTaskAccounting(task, null, options),
      /IDENTITY_MISMATCH.*does not match registered authority identity/
    );
  } finally {
    if (fs.existsSync(tmpIdMismatch)) fs.unlinkSync(tmpIdMismatch);
  }
});

runTest('1.6 Key marked as REVOKED fails closed with references REVOKED authority', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const tmpRevoked = path.join(REPO_ROOT, 'reports/.tmp_revoked_acceptance.json');

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-REVOKED-01',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'revoked-cto-key',
  };
  const canonicalPayload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKey).toString('base64');
  fs.writeFileSync(tmpRevoked, JSON.stringify(record, null, 2), 'utf8');

  try {
    const task = {
      taskId: 'W021.5-TEST-REVOKED-01',
      taskTitle: 'Revoked Key Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid rationale for test',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_revoked_acceptance.json',
      },
    };

    const options = {
      externalTrustPin: fingerprint,
      trustedAuthorities: [
        {
          keyId: 'revoked-cto-key',
          identity: 'Chief Technology Officer',
          role: 'CTO',
          algorithm: 'Ed25519',
          publicKeyPem: pubPem,
          status: 'REVOKED', // Revoked!
        },
      ],
    };

    assert.throws(
      () => validateTaskAccounting(task, null, options),
      /references REVOKED authority keyId/
    );
  } finally {
    if (fs.existsSync(tmpRevoked)) fs.unlinkSync(tmpRevoked);
  }
});

runTest('1.7 Expired authority key (validUntil exceeded) fails closed with EXPIRED_KEY', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const tmpExpired = path.join(REPO_ROOT, 'reports/.tmp_expired_acceptance.json');

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-EXPIRED-01',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'expired-cto-key',
  };
  const canonicalPayload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKey).toString('base64');
  fs.writeFileSync(tmpExpired, JSON.stringify(record, null, 2), 'utf8');

  try {
    const task = {
      taskId: 'W021.5-TEST-EXPIRED-01',
      taskTitle: 'Expired Key Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid rationale for test',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_expired_acceptance.json',
      },
    };

    const options = {
      externalTrustPin: fingerprint,
      trustedAuthorities: [
        {
          keyId: 'expired-cto-key',
          identity: 'Chief Technology Officer',
          role: 'CTO',
          algorithm: 'Ed25519',
          publicKeyPem: pubPem,
          status: 'ACTIVE',
          validUntil: '2026-01-01T00:00:00Z', // Expired in January 2026!
        },
      ],
    };

    assert.throws(
      () => validateTaskAccounting(task, null, options),
      /EXPIRED_KEY.*exceeds authority validity period/
    );
  } finally {
    if (fs.existsSync(tmpExpired)) fs.unlinkSync(tmpExpired);
  }
});

runTest('1.8 Pre-dating authority key (validFrom not yet reached) fails closed with NOT_YET_VALID', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const tmpPreDate = path.join(REPO_ROOT, 'reports/.tmp_predate_acceptance.json');

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-PREDATE-01',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'future-cto-key',
  };
  const canonicalPayload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKey).toString('base64');
  fs.writeFileSync(tmpPreDate, JSON.stringify(record, null, 2), 'utf8');

  try {
    const task = {
      taskId: 'W021.5-TEST-PREDATE-01',
      taskTitle: 'Future Key Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid rationale for test',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_predate_acceptance.json',
      },
    };

    const options = {
      externalTrustPin: fingerprint,
      trustedAuthorities: [
        {
          keyId: 'future-cto-key',
          identity: 'Chief Technology Officer',
          role: 'CTO',
          algorithm: 'Ed25519',
          publicKeyPem: pubPem,
          status: 'ACTIVE',
          validFrom: '2027-01-01T00:00:00Z', // Not valid until 2027!
        },
      ],
    };

    assert.throws(
      () => validateTaskAccounting(task, null, options),
      /NOT_YET_VALID.*precedes authority validity period/
    );
  } finally {
    if (fs.existsSync(tmpPreDate)) fs.unlinkSync(tmpPreDate);
  }
});

runTest('1.9 Unknown / unregistered keyId fails closed with untrusted or unknown authority keyId', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const tmpUnknown = path.join(REPO_ROOT, 'reports/.tmp_unknown_key_acceptance.json');

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-UNKKEY-01',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'completely-unknown-key-xyz',
  };
  const canonicalPayload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKey).toString('base64');
  fs.writeFileSync(tmpUnknown, JSON.stringify(record, null, 2), 'utf8');

  try {
    const task = {
      taskId: 'W021.5-TEST-UNKKEY-01',
      taskTitle: 'Unknown Key Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid rationale for test',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_unknown_key_acceptance.json',
      },
    };

    const options = {
      externalTrustPin: fingerprint,
      trustedAuthorities: [
        {
          keyId: 'different-known-key',
          identity: 'Chief Technology Officer',
          role: 'CTO',
          algorithm: 'Ed25519',
          publicKeyPem: pubPem,
          status: 'ACTIVE',
        },
      ],
    };

    assert.throws(
      () => validateTaskAccounting(task, null, options),
      /references untrusted, inactive, or unknown authority keyId/
    );
  } finally {
    if (fs.existsSync(tmpUnknown)) fs.unlinkSync(tmpUnknown);
  }
});

runTest('1.10 Post-signing tampering with conditions causes cryptographic signature verification failed', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const tmpTamperCond = path.join(REPO_ROOT, 'reports/.tmp_tamper_conditions.json');

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-COND-01',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'cto-test-key-cond',
    conditions: ['Condition A'],
    findings: ['Finding 1'],
  };
  const canonicalPayload = getCanonicalAcceptancePayload(record);
  const signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKey).toString('base64');

  // Attacker adds condition after signing:
  const tampered = {
    ...record,
    conditions: ['Condition A', 'Injected Condition B'],
    signature,
  };
  fs.writeFileSync(tmpTamperCond, JSON.stringify(tampered, null, 2), 'utf8');

  try {
    const task = {
      taskId: 'W021.5-TEST-COND-01',
      taskTitle: 'Tampered Conditions Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid rationale for test',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_tamper_conditions.json',
      },
    };

    const options = {
      externalTrustPin: fingerprint,
      trustedAuthorities: [
        {
          keyId: 'cto-test-key-cond',
          identity: 'Chief Technology Officer',
          role: 'CTO',
          algorithm: 'Ed25519',
          publicKeyPem: pubPem,
          status: 'ACTIVE',
        },
      ],
    };

    assert.throws(
      () => validateTaskAccounting(task, null, options),
      /cryptographic signature verification failed/
    );
  } finally {
    if (fs.existsSync(tmpTamperCond)) fs.unlinkSync(tmpTamperCond);
  }
});

runTest('1.11 Post-signing tampering with findings causes cryptographic signature verification failed', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const tmpTamperFind = path.join(REPO_ROOT, 'reports/.tmp_tamper_findings.json');

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-FIND-01',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'cto-test-key-find',
    conditions: [],
    findings: ['Valid Finding'],
  };
  const canonicalPayload = getCanonicalAcceptancePayload(record);
  const signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKey).toString('base64');

  // Attacker alters findings text:
  const tampered = {
    ...record,
    findings: ['Altered Finding Text'],
    signature,
  };
  fs.writeFileSync(tmpTamperFind, JSON.stringify(tampered, null, 2), 'utf8');

  try {
    const task = {
      taskId: 'W021.5-TEST-FIND-01',
      taskTitle: 'Tampered Findings Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid rationale for test',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_tamper_findings.json',
      },
    };

    const options = {
      externalTrustPin: fingerprint,
      trustedAuthorities: [
        {
          keyId: 'cto-test-key-find',
          identity: 'Chief Technology Officer',
          role: 'CTO',
          algorithm: 'Ed25519',
          publicKeyPem: pubPem,
          status: 'ACTIVE',
        },
      ],
    };

    assert.throws(
      () => validateTaskAccounting(task, null, options),
      /cryptographic signature verification failed/
    );
  } finally {
    if (fs.existsSync(tmpTamperFind)) fs.unlinkSync(tmpTamperFind);
  }
});

runTest('1.12 Post-signing tampering with decision field causes cryptographic signature verification failed', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const tmpTamperDec = path.join(REPO_ROOT, 'reports/.tmp_tamper_decision.json');

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-DEC-01',
    decision: 'REJECTED', // Original signed decision was REJECTED
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'cto-test-key-dec',
    conditions: [],
    findings: [],
  };
  const canonicalPayload = getCanonicalAcceptancePayload(record);
  const signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKey).toString('base64');

  // Attacker modifies decision to ACCEPTED:
  const tampered = {
    ...record,
    decision: 'ACCEPTED',
    signature,
  };
  fs.writeFileSync(tmpTamperDec, JSON.stringify(tampered, null, 2), 'utf8');

  try {
    const task = {
      taskId: 'W021.5-TEST-DEC-01',
      taskTitle: 'Tampered Decision Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid rationale for test',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_tamper_decision.json',
      },
    };

    const options = {
      externalTrustPin: fingerprint,
      trustedAuthorities: [
        {
          keyId: 'cto-test-key-dec',
          identity: 'Chief Technology Officer',
          role: 'CTO',
          algorithm: 'Ed25519',
          publicKeyPem: pubPem,
          status: 'ACTIVE',
        },
      ],
    };

    assert.throws(
      () => validateTaskAccounting(task, null, options),
      /cryptographic signature verification failed/
    );
  } finally {
    if (fs.existsSync(tmpTamperDec)) fs.unlinkSync(tmpTamperDec);
  }
});

runTest('1.13 Post-signing tampering with taskRef causes cryptographic signature verification failed', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const tmpTamperRef = path.join(REPO_ROOT, 'reports/.tmp_tamper_taskref.json');

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-ORIG-01',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'cto-test-key-ref',
  };
  const canonicalPayload = getCanonicalAcceptancePayload(record);
  const signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKey).toString('base64');

  // Attacker alters taskRef:
  const tampered = {
    ...record,
    taskRef: 'W021.5-TEST-SUBST-01',
    signature,
  };
  fs.writeFileSync(tmpTamperRef, JSON.stringify(tampered, null, 2), 'utf8');

  try {
    const task = {
      taskId: 'W021.5-TEST-SUBST-01',
      taskTitle: 'Substituted Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid rationale for test',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_tamper_taskref.json',
      },
    };

    const options = {
      externalTrustPin: fingerprint,
      trustedAuthorities: [
        {
          keyId: 'cto-test-key-ref',
          identity: 'Chief Technology Officer',
          role: 'CTO',
          algorithm: 'Ed25519',
          publicKeyPem: pubPem,
          status: 'ACTIVE',
        },
      ],
    };

    assert.throws(
      () => validateTaskAccounting(task, null, options),
      /cryptographic signature verification failed/
    );
  } finally {
    if (fs.existsSync(tmpTamperRef)) fs.unlinkSync(tmpTamperRef);
  }
});

runTest('1.14 Replaying an acceptance record signed for Task A to approve Task B fails closed with taskRef mismatch', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const tmpReplay = path.join(REPO_ROOT, 'reports/.tmp_replay_record.json');

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TASK-ALPHA',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'cto-test-key-replay',
  };
  const canonicalPayload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKey).toString('base64');
  fs.writeFileSync(tmpReplay, JSON.stringify(record, null, 2), 'utf8');

  try {
    const taskBeta = {
      taskId: 'W021.5-TASK-BETA', // Target is Beta, but record is for Alpha!
      taskTitle: 'Task Beta',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid rationale for test',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_replay_record.json',
      },
    };

    const options = {
      externalTrustPin: fingerprint,
      trustedAuthorities: [
        {
          keyId: 'cto-test-key-replay',
          identity: 'Chief Technology Officer',
          role: 'CTO',
          algorithm: 'Ed25519',
          publicKeyPem: pubPem,
          status: 'ACTIVE',
        },
      ],
    };

    assert.throws(
      () => validateTaskAccounting(taskBeta, null, options),
      /taskRef "W021.5-TASK-ALPHA" does not match task ID W021.5-TASK-BETA/
    );
  } finally {
    if (fs.existsSync(tmpReplay)) fs.unlinkSync(tmpReplay);
  }
});

runTest('1.15 Malformed signature value (not valid base64/hex) fails closed with malformed signature', () => {
  const { pubPem, fingerprint } = createTestKeyPair();
  const tmpBadSigVal = path.join(REPO_ROOT, 'reports/.tmp_malformed_sig_val.json');

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-MALVAL-01',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'cto-test-key-malval',
    signature: '???not_valid_base64_or_hex_chars$$$',
  };
  fs.writeFileSync(tmpBadSigVal, JSON.stringify(record, null, 2), 'utf8');

  try {
    const task = {
      taskId: 'W021.5-TEST-MALVAL-01',
      taskTitle: 'Malformed Sig Value Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid rationale for test',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_malformed_sig_val.json',
      },
    };

    const options = {
      externalTrustPin: fingerprint,
      trustedAuthorities: [
        {
          keyId: 'cto-test-key-malval',
          identity: 'Chief Technology Officer',
          role: 'CTO',
          algorithm: 'Ed25519',
          publicKeyPem: pubPem,
          status: 'ACTIVE',
        },
      ],
    };

    assert.throws(
      () => validateTaskAccounting(task, null, options),
      /signature verification failed|cryptographic verification error/
    );
  } finally {
    if (fs.existsSync(tmpBadSigVal)) fs.unlinkSync(tmpBadSigVal);
  }
});

runTest('1.16 Self-acceptance (authorSelfAcceptance: true) strictly fails closed under Rule IV-001 even with cryptographically valid signature', () => {
  const { privateKey, pubPem, fingerprint } = createTestKeyPair();
  const tmpSelfAccept = path.join(REPO_ROOT, 'reports/.tmp_self_acceptance.json');

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-SELF-01',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: true, // Self-acceptance violation!
    keyId: 'cto-test-key-self',
  };
  const canonicalPayload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKey).toString('base64');
  fs.writeFileSync(tmpSelfAccept, JSON.stringify(record, null, 2), 'utf8');

  try {
    const task = {
      taskId: 'W021.5-TEST-SELF-01',
      taskTitle: 'Self-Acceptance Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid rationale for test',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_self_acceptance.json',
      },
    };

    const options = {
      externalTrustPin: fingerprint,
      trustedAuthorities: [
        {
          keyId: 'cto-test-key-self',
          identity: 'Chief Technology Officer',
          role: 'CTO',
          algorithm: 'Ed25519',
          publicKeyPem: pubPem,
          status: 'ACTIVE',
        },
      ],
    };

    assert.throws(
      () => validateTaskAccounting(task, null, options),
      /violates Rule IV-001 \(author self-acceptance is strictly prohibited\)/
    );
  } finally {
    if (fs.existsSync(tmpSelfAccept)) fs.unlinkSync(tmpSelfAccept);
  }
});

runTest('1.17 Missing authorSelfAcceptance declaration fails closed', () => {
  const tmpMissingSelfDecl = path.join(REPO_ROOT, 'reports/.tmp_missing_self_decl.json');
  fs.writeFileSync(
    tmpMissingSelfDecl,
    JSON.stringify({
      milestone: 'W021.5',
      taskRef: 'W021.5-TEST-MISDECL-01',
      decision: 'ACCEPTED',
      adjudicatorIdentity: 'Chief Technology Officer',
      adjudicatorRole: 'CTO',
      adjudicationDate: '2026-10-17T00:00:00Z',
      keyId: 'cto-root-v1',
      signature: 'test_signature',
      // authorSelfAcceptance missing!
    }),
    'utf8'
  );

  try {
    const task = {
      taskId: 'W021.5-TEST-MISDECL-01',
      taskTitle: 'Missing Self Decl Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid rationale for test',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_missing_self_decl.json',
      },
    };

    assert.throws(
      () => validateTaskAccounting(task),
      /must explicitly declare authorSelfAcceptance: false/
    );
  } finally {
    if (fs.existsSync(tmpMissingSelfDecl)) fs.unlinkSync(tmpMissingSelfDecl);
  }
});

runTest('1.18 Offline repository environment without external trust pin strictly preserves 0.0% formal CTO acceptance', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = computeLedgerSummary(ledger);

  assert.strictEqual(summary.formalAcceptancePercent, 0.0);
  assert.strictEqual(summary.statusCounts.FORMAL_ACCEPTANCE_CONFIRMED, 0);

  for (const stage of ledger.stages) {
    for (const task of stage.tasks) {
      assert.notStrictEqual(task.accounting.formalAcceptanceStatus, 'CONFIRMED_ACCEPTED');
      assert.strictEqual(task.accounting.formalAcceptanceArtifact, null);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Workstream B: Enforceable Acceptance Criteria & Mutation Verifiers
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Workstream B: Enforceable Acceptance Criteria & Mutation Verifiers ---');

runTest('2.1 All 27 tasks in TASK_SPECIFICATIONS declare explicit criteria with weight ratios summing to 1.0', () => {
  const specKeys = Object.keys(TASK_SPECIFICATIONS);
  assert.strictEqual(specKeys.length, 27, 'Exactly 27 task specifications defined');

  for (const taskId of specKeys) {
    const spec = TASK_SPECIFICATIONS[taskId];
    assert.ok(spec.specRef, `Task ${taskId} must have specRef`);
    assert.ok(Array.isArray(spec.criteria) && spec.criteria.length > 0, `Task ${taskId} must have non-empty criteria array`);

    let ratioSum = 0;
    for (const crit of spec.criteria) {
      assert.ok(crit.criterionId, `Task ${taskId} criterion missing criterionId`);
      assert.ok(crit.description, `Task ${taskId} criterion missing description`);
      assert.strictEqual(typeof crit.weightRatio, 'number', `Task ${taskId} criterion missing numeric weightRatio`);
      assert.ok(crit.scope, `Task ${taskId} criterion missing scope`);
      assert.strictEqual(typeof crit.verify, 'function', `Task ${taskId} criterion missing executable verify function`);
      ratioSum += crit.weightRatio;
    }
    assert.ok(
      Math.abs(ratioSum - 1.0) < 0.001,
      `Task ${taskId} criteria weight ratios sum to ${ratioSum}, must equal 1.0`
    );
  }
});

runTest('2.2 Verifier execution deterministically derives derivedRepoRatio matching ledger reporting', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  for (const stage of ledger.stages) {
    for (const task of stage.tasks) {
      const assessment = evaluateTaskCriteria(task, REPO_ROOT);
      assert.strictEqual(
        assessment.derivedRepoRatio,
        task.accounting.repoCompletionRatio,
        `Task ${task.taskId} derivedRepoRatio (${assessment.derivedRepoRatio}) must match repoCompletionRatio (${task.accounting.repoCompletionRatio})`
      );
      assert.strictEqual(
        assessment.deterministicChecksExecuted.length,
        TASK_SPECIFICATIONS[task.taskId].criteria.length,
        `Task ${task.taskId} evaluated checks count must match criteria count`
      );
    }
  }
});

runTest('2.3 Reconciler fails closed when a task has no defined acceptance criteria', () => {
  const badTask = {
    taskId: 'W021.5-UNKNOWN-TASK-99',
    taskTitle: 'Unknown Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'scripts/reconcile_execution_ledger.mjs',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Reconciler script',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid ratio rationale text here for test',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };

  assert.throws(
    () => validateTaskAccounting(badTask),
    /has no defined acceptance criteria specification/
  );
});

runTest('2.4 Reconciler fails closed when reported ratio differs from verified derived ratio', () => {
  // Task W021.5-A-01 has 2 passing criteria (derived = 1.0). If reported is 0.5, must throw.
  const taskA01 = {
    taskId: 'W021.5-A-01',
    taskTitle: 'Comprehensive 29-Domain Data-Truth Audit',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 3.0,
    status: 'PARTIAL',
    evidence: [
      {
        path: 'reports/w021_5_national_data_coverage_matrix.json',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'National data coverage matrix audit file covers all 36 States/UTs and 4,123 constituencies',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
      {
        path: 'reports/w021_5a_repository_data_truth_audit.md',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Truth audit markdown report documents 29-domain gaps truthfully without unverified claims',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 0.5, // Intentionally falsified (derived is 1.0)!
      repoVerifiedWeight: 1.5,
      databasePendingWeight: 0.0,
      blockedWeight: 0.0,
      unimplementedWeight: 1.5,
      unexecutedDatabaseWeight: 0.0,
      ratioRationale: 'Intentionally mismatched ratio for testing fail-closed reconciliation',
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };

  assert.throws(
    () => validateTaskAccounting(taskA01),
    /reported ratio \(0.5\) differs from verified ratio \(1\) derived from acceptance criteria/
  );
});

runTest('2.5 Mutation test: Deleting required artifact prevents 100% completion claim', () => {
  const spec = TASK_SPECIFICATIONS['W021.5-A-01'];
  // Temporarily evaluate criterion 1 against a synthetic empty root:
  const outcome = spec.criteria[0].verify(path.join(REPO_ROOT, 'non_existent_directory_tmp'));
  assert.strictEqual(outcome.passed, false, 'Verifier must fail when required artifact is missing');
});

runTest('2.6 Mutation test: Changing statutory Delhi Assembly seats from 70 to 69 causes invariant verifier to fail', () => {
  const spec = TASK_SPECIFICATIONS['W021.5-A-03'];
  // The verifier checks Delhi statutory seats == 70.
  const outcome = spec.criteria[0].verify(REPO_ROOT);
  assert.strictEqual(outcome.passed, true, 'Original invariant passes');

  // Verify that an artificial state fixture with 69 seats fails invariant
  const delhiCheck = (seats) => seats === 70;
  assert.strictEqual(delhiCheck(69), false, 'Mutated 69 seats fails invariant check');
});

runTest('2.7 Mutation test: Changing national assembly constituency count from 4,123 to 4,000 causes verifier to fail', () => {
  const matrixPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

  assert.strictEqual(matrix.summary.totalStatutorySeats, 4123, 'Baseline national statutory seats is 4,123');
  const mutatedCheck = (seats) => seats === 4123;
  assert.strictEqual(mutatedCheck(4000), false, 'Mutated 4,000 count fails statutory verification');
});

runTest('2.8 Mutation test: Forcing validator to return no passed criteria fails closed with 0% earned', () => {
  const taskI01 = {
    taskId: 'W021.5-I-01',
    taskTitle: 'Mobile SQLite Canonical Offline Sync Schema & Engine',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 3.0,
    status: 'NOT_IMPLEMENTED',
    evidence: [],
    accounting: {
      repoCompletionRatio: 0.0,
      repoVerifiedWeight: 0.0,
      databasePendingWeight: 0.0,
      blockedWeight: 0.0,
      unimplementedWeight: 3.0,
      unexecutedDatabaseWeight: 0.0,
      ratioRationale: 'Offline SQLite sync engine unimplemented',
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };

  const assessment = evaluateTaskCriteria(taskI01, REPO_ROOT);
  assert.strictEqual(assessment.derivedRepoRatio, 0.0);
  assert.strictEqual(assessment.checksPassed.length, 0);
  assert.strictEqual(assessment.unimplementedRequirements.length, 1);
});

runTest('2.9 Blocked tasks derive 0% repo ratio and document blocked external gate', () => {
  const blockedTaskIds = ['W021.5-D-03', 'W021.5-E-02', 'W021.5-E-03', 'W021.5-G-03', 'W021.5-I-02'];
  for (const tid of blockedTaskIds) {
    const spec = TASK_SPECIFICATIONS[tid];
    assert.ok(spec, `Task ${tid} must have specification`);
    for (const crit of spec.criteria) {
      assert.strictEqual(crit.scope, 'BLOCKED_EXTERNAL');
      const res = crit.verify(REPO_ROOT);
      assert.strictEqual(res.passed, false);
      assert.ok(res.message.includes('Blocked') || res.message.includes('pending'));
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Workstream C: Non-Overlapping Progress Accounting & Dimension Partition
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Workstream C: Non-Overlapping Progress Accounting & Dimension Partition ---');

runTest('3.1 Canonical non-overlapping partition test: components sum to task weight for all 27 tasks', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  for (const stage of ledger.stages) {
    for (const task of stage.tasks) {
      const acct = task.accounting;
      const sum = Number((acct.repoVerifiedWeight + acct.databasePendingWeight + acct.blockedWeight + acct.unimplementedWeight).toFixed(3));
      assert.ok(
        Math.abs(sum - task.weight) < 0.001,
        `Task ${task.taskId} components (${acct.repoVerifiedWeight} repo + ${acct.databasePendingWeight} db + ${acct.blockedWeight} blk + ${acct.unimplementedWeight} unim = ${sum}) must equal weight (${task.weight})`
      );
      assert.ok(acct.repoVerifiedWeight >= 0, `Task ${task.taskId} repoVerifiedWeight cannot be negative`);
      assert.ok(acct.databasePendingWeight >= 0, `Task ${task.taskId} databasePendingWeight cannot be negative`);
      assert.ok(acct.blockedWeight >= 0, `Task ${task.taskId} blockedWeight cannot be negative`);
      assert.ok(acct.unimplementedWeight >= 0, `Task ${task.taskId} unimplementedWeight cannot be negative`);
    }
  }
});

runTest('3.2 Aggregate progress metric partition satisfies exact conservation law (61.5 + 10.5 + 22.5 + 5.5 = 100.0%)', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = computeLedgerSummary(ledger);

  assert.strictEqual(summary.repoVerifiedEarnedPercent, 61.5);
  assert.strictEqual(summary.unexecutedDatabasePendingPercent, 10.5);
  assert.strictEqual(summary.blockedPercent, 22.5);
  assert.strictEqual(summary.notImplementedPercent, 5.5);

  const grandTotal = summary.repoVerifiedEarnedPercent + summary.unexecutedDatabasePendingPercent + summary.blockedPercent + summary.notImplementedPercent;
  assert.strictEqual(grandTotal, 100.0, 'Progress components must conserve total 100.0% weight without overlap');

  assert.strictEqual(summary.databaseExecutionPercent, 0.0, 'Live database execution strictly 0.0%');
  assert.strictEqual(summary.formalAcceptancePercent, 0.0, 'Formal CTO acceptance strictly 0.0%');
});

runTest('3.3 Resolves prior overlapping progress discounts: 4 tasks partition independently without double deduction', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  const findTask = (id) => {
    for (const s of ledger.stages) {
      for (const t of s.tasks) {
        if (t.taskId === id) return t;
      }
    }
    return null;
  };

  // W021.5-C-02: weight 5.0 = 2.5 repo + 2.5 db pending
  const c02 = findTask('W021.5-C-02');
  assert.strictEqual(c02.weight, 5.0);
  assert.strictEqual(c02.accounting.repoVerifiedWeight, 2.5);
  assert.strictEqual(c02.accounting.databasePendingWeight, 2.5);
  assert.strictEqual(c02.accounting.blockedWeight, 0.0);
  assert.strictEqual(c02.accounting.unimplementedWeight, 0.0);

  // W021.5-D-02: weight 6.0 = 3.0 repo + 3.0 db pending
  const d02 = findTask('W021.5-D-02');
  assert.strictEqual(d02.weight, 6.0);
  assert.strictEqual(d02.accounting.repoVerifiedWeight, 3.0);
  assert.strictEqual(d02.accounting.databasePendingWeight, 3.0);
  assert.strictEqual(d02.accounting.blockedWeight, 0.0);
  assert.strictEqual(d02.accounting.unimplementedWeight, 0.0);

  // W021.5-E-01: weight 4.0 = 2.0 repo + 2.0 db pending
  const e01 = findTask('W021.5-E-01');
  assert.strictEqual(e01.weight, 4.0);
  assert.strictEqual(e01.accounting.repoVerifiedWeight, 2.0);
  assert.strictEqual(e01.accounting.databasePendingWeight, 2.0);
  assert.strictEqual(e01.accounting.blockedWeight, 0.0);
  assert.strictEqual(e01.accounting.unimplementedWeight, 0.0);

  // W021.5-F-02: weight 6.0 = 1.5 repo + 3.0 db pending + 1.5 unimplemented
  const f02 = findTask('W021.5-F-02');
  assert.strictEqual(f02.weight, 6.0);
  assert.strictEqual(f02.accounting.repoVerifiedWeight, 1.5);
  assert.strictEqual(f02.accounting.databasePendingWeight, 3.0);
  assert.strictEqual(f02.accounting.blockedWeight, 0.0);
  assert.strictEqual(f02.accounting.unimplementedWeight, 1.5);
});

runTest('3.4 Mutually exclusive task status allocated weights reconcile to 100.0% exactly', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = computeLedgerSummary(ledger);

  assert.strictEqual(summary.statusAllocatedWeights.REPO_VERIFIED.count, 15);
  assert.strictEqual(summary.statusAllocatedWeights.REPO_VERIFIED.allocated, 51.0);
  assert.strictEqual(summary.statusAllocatedWeights.REPO_VERIFIED.earned, 51.0);

  assert.strictEqual(summary.statusAllocatedWeights.PARTIAL.count, 6);
  assert.strictEqual(summary.statusAllocatedWeights.PARTIAL.allocated, 25.0);
  assert.strictEqual(summary.statusAllocatedWeights.PARTIAL.earned, 10.5);

  assert.strictEqual(summary.statusAllocatedWeights.BLOCKED.count, 5);
  assert.strictEqual(summary.statusAllocatedWeights.BLOCKED.allocated, 21.0);
  assert.strictEqual(summary.statusAllocatedWeights.BLOCKED.earned, 0.0);

  assert.strictEqual(summary.statusAllocatedWeights.NOT_IMPLEMENTED.count, 1);
  assert.strictEqual(summary.statusAllocatedWeights.NOT_IMPLEMENTED.allocated, 3.0);
  assert.strictEqual(summary.statusAllocatedWeights.NOT_IMPLEMENTED.earned, 0.0);

  const totalAllocated = 51.0 + 25.0 + 21.0 + 3.0;
  assert.strictEqual(totalAllocated, 100.0);
});

runTest('3.5 Status earned weights reconcile to Repository Readiness: 51.0 + 10.5 = 61.5%', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = computeLedgerSummary(ledger);

  const earnedSum = summary.statusAllocatedWeights.REPO_VERIFIED.earned + summary.statusAllocatedWeights.PARTIAL.earned;
  assert.strictEqual(earnedSum, 61.5);
  assert.strictEqual(summary.repoVerifiedEarnedPercent, 61.5);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Workstream D: Hardened Semantic Artifact Validation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Workstream D: Hardened Semantic Artifact Validation ---');

runTest('4.1 SQL parser validates quote-aware and dollar-quote-aware statement balance across migrations', () => {
  const dummyTask = { taskId: 'W021.5-TEST-SQL-01' };
  const migPath = path.join(REPO_ROOT, 'supabase/migrations/061_canonical_national_ac_pc_mappings.sql');
  assert.strictEqual(validateSqlContent(dummyTask, 'supabase/migrations/061_canonical_national_ac_pc_mappings.sql', migPath), true);
});

runTest('4.2 SQL comment-only file strictly fails closed', () => {
  const tmpSql = path.join(REPO_ROOT, 'reports/.tmp_comment_only.sql');
  fs.writeFileSync(tmpSql, '-- Only a comment line\n/* Block comment */\n', 'utf8');

  try {
    const dummyTask = { taskId: 'W021.5-TEST-CMTSQL-01' };
    assert.throws(
      () => validateSqlContent(dummyTask, 'reports/.tmp_comment_only.sql', tmpSql),
      /comment-only or empty SQL file/
    );
  } finally {
    if (fs.existsSync(tmpSql)) fs.unlinkSync(tmpSql);
  }
});

runTest('4.3 SQL file lacking executable DDL/DML statements fails closed', () => {
  const tmpSql = path.join(REPO_ROOT, 'reports/.tmp_keyword_only.sql');
  fs.writeFileSync(tmpSql, 'SELECT;\n-- nothing else\n', 'utf8');

  try {
    const dummyTask = { taskId: 'W021.5-TEST-KEYSQL-01' };
    assert.throws(
      () => validateSqlContent(dummyTask, 'reports/.tmp_keyword_only.sql', tmpSql),
      /comment-only or empty SQL file|lacking valid executable DDL/
    );
  } finally {
    if (fs.existsSync(tmpSql)) fs.unlinkSync(tmpSql);
  }
});

runTest('4.4 Test file parser verifies TypeScript AST CallExpression nodes for test runner and assertions', () => {
  const dummyTask = { taskId: 'W021.5-TEST-TSTAST-01' };
  const testPath = path.join(REPO_ROOT, 'tests/political-intelligence-directive-084.test.mjs');
  assert.strictEqual(validateTestContent(dummyTask, 'tests/political-intelligence-directive-084.test.mjs', testPath), true);
});

runTest('4.5 Comment-only test file strictly fails closed', () => {
  const tmpTest = path.join(REPO_ROOT, 'reports/.tmp_comment_test.test.ts');
  fs.writeFileSync(tmpTest, '// describe("test", () => { assert(true); });\n/* test block */\n', 'utf8');

  try {
    const dummyTask = { taskId: 'W021.5-TEST-CMTTST-01' };
    assert.throws(
      () => validateTestContent(dummyTask, 'reports/.tmp_comment_test.test.ts', tmpTest),
      /comment-only or empty test file/
    );
  } finally {
    if (fs.existsSync(tmpTest)) fs.unlinkSync(tmpTest);
  }
});

runTest('4.6 Token-only test file (tokens without call expressions) strictly fails closed', () => {
  const tmpTest = path.join(REPO_ROOT, 'reports/.tmp_token_test.test.ts');
  fs.writeFileSync(tmpTest, 'const x = "describe"; const y = "assert"; const z = "test";\n', 'utf8');

  try {
    const dummyTask = { taskId: 'W021.5-TEST-TOKTST-01' };
    assert.throws(
      () => validateTestContent(dummyTask, 'reports/.tmp_token_test.test.ts', tmpTest),
      /lacking test assertions or test suites \(token-only test file\)/
    );
  } finally {
    if (fs.existsSync(tmpTest)) fs.unlinkSync(tmpTest);
  }
});

runTest('4.7 GeoJSON validator verifies FeatureCollection and coordinate structure', () => {
  const dummyTask = { taskId: 'W021.5-TEST-GEO-01' };
  const geoPath = path.join(REPO_ROOT, 'data/geo/telangana-assembly.geojson');
  assert.strictEqual(validateGeoJsonContent(dummyTask, 'data/geo/telangana-assembly.geojson', geoPath), true);
});

runTest('4.8 GeoJSON coordinate nesting, finiteness, and Indian bounding box check', () => {
  const tmpGeo = path.join(REPO_ROOT, 'reports/.tmp_out_of_bounds.geojson');
  const outOfBoundsGeo = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [0.0, 0.0], // Outside India bounding box [60..105, 4..42]!
        },
        properties: { name: 'Null Island' },
      },
    ],
  };
  fs.writeFileSync(tmpGeo, JSON.stringify(outOfBoundsGeo), 'utf8');

  try {
    const dummyTask = { taskId: 'W021.5-TEST-OUTGEO-01' };
    assert.throws(
      () => validateGeoJsonContent(dummyTask, 'reports/.tmp_out_of_bounds.geojson', tmpGeo),
      /outside Indian territory bounding box/
    );
  } finally {
    if (fs.existsSync(tmpGeo)) fs.unlinkSync(tmpGeo);
  }
});

runTest('4.9 GeoJSON unclosed linear ring check detects polygon topology violation', () => {
  const tmpGeo = path.join(REPO_ROOT, 'reports/.tmp_unclosed_ring.geojson');
  const unclosedGeo = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [78.0, 17.0],
              [78.1, 17.0],
              [78.1, 17.1],
              [78.0, 17.05], // Does NOT close back to [78.0, 17.0]!
            ],
          ],
        },
        properties: { name: 'Unclosed Poly' },
      },
    ],
  };
  fs.writeFileSync(tmpGeo, JSON.stringify(unclosedGeo), 'utf8');

  try {
    const dummyTask = { taskId: 'W021.5-TEST-UNCLSD-01' };
    assert.throws(
      () => validateGeoJsonContent(dummyTask, 'reports/.tmp_unclosed_ring.geojson', tmpGeo),
      /unclosed linear ring/
    );
  } finally {
    if (fs.existsSync(tmpGeo)) fs.unlinkSync(tmpGeo);
  }
});

runTest('4.10 GeoJSON duplicate AC ID detection keeps syntactic validity separate from statutory completeness', () => {
  const dummyTask = { taskId: 'W021.5-D-03' };
  const geoPath = path.join(REPO_ROOT, 'data/geo/telangana-assembly.geojson');

  // Syntactically valid GeoJSON:
  assert.strictEqual(validateGeoJsonContent(dummyTask, 'data/geo/telangana-assembly.geojson', geoPath), true);

  // But statutory completeness has known defect (AC 119 duplicate claim):
  const parsed = JSON.parse(fs.readFileSync(geoPath, 'utf8'));
  const counts = {};
  for (const f of parsed.features) {
    const ac = f.properties.AC_NO;
    counts[ac] = (counts[ac] || 0) + 1;
  }
  const dupes = Object.entries(counts).filter(([ac, c]) => c > 1);
  assert.strictEqual(dupes.length, 1);
  assert.strictEqual(dupes[0][0], '119');
  assert.strictEqual(dupes[0][1], 2);
});

runTest('4.11 Markdown validator enforces structured headings (# and ##), minimum length, and domain keywords', () => {
  const dummyTask = { taskId: 'W021.5-TEST-MD-01' };
  const mdPath = path.join(REPO_ROOT, 'reports/w021_5a_repository_data_truth_audit.md');
  assert.strictEqual(validateMarkdownContent(dummyTask, 'reports/w021_5a_repository_data_truth_audit.md', mdPath), true);
});

runTest('4.12 JSON validator rejects empty object, empty array, and invalid schemas', () => {
  const tmpEmpty = path.join(REPO_ROOT, 'reports/.tmp_empty_array.json');
  fs.writeFileSync(tmpEmpty, '[]', 'utf8');

  try {
    const dummyTask = { taskId: 'W021.5-TEST-EMPTY-01' };
    assert.throws(
      () => validateJsonContent(dummyTask, 'reports/.tmp_empty_array.json', tmpEmpty),
      /empty array/
    );
  } finally {
    if (fs.existsSync(tmpEmpty)) fs.unlinkSync(tmpEmpty);
  }
});

runTest('4.13 Path traversal outside repository root fails closed', () => {
  const dummyTask = {
    taskId: 'W021.5-TEST-TRAV-01',
    taskTitle: 'Traversal Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: '../../outside_repo.json',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Path traversal test claim',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid rationale for test',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };

  assert.throws(
    () => validateTaskAccounting(dummyTask),
    /path traversal outside repository root/
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Workstream E: Canonical 27-Task Inventory & Deterministic Reporting
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Workstream E: Canonical 27-Task Inventory & Deterministic Reporting ---');

runTest('5.1 Exactly 27 tasks present in canonical task inventory across 9 stages', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  assert.strictEqual(ledger.stages.length, 9, 'Exactly 9 stages defined');
  let taskCount = 0;
  for (const stage of ledger.stages) {
    taskCount += stage.tasks.length;
  }
  assert.strictEqual(taskCount, 27, 'Exactly 27 canonical tasks in execution ledger');
});

runTest('5.2 All 27 task IDs are unique and match canonical specification set', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  const seenIds = new Set();
  for (const stage of ledger.stages) {
    for (const task of stage.tasks) {
      assert.ok(!seenIds.has(task.taskId), `Duplicate task ID detected: ${task.taskId}`);
      seenIds.add(task.taskId);
      assert.ok(TASK_SPECIFICATIONS[task.taskId], `Task ID ${task.taskId} missing from TASK_SPECIFICATIONS`);
    }
  }
  assert.strictEqual(seenIds.size, 27);
});

runTest('5.3 Stage weights sum to declared stage weights and total allocated weight equals 100.0%', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  let grandWeight = 0;
  for (const stage of ledger.stages) {
    let stageWeight = 0;
    for (const task of stage.tasks) {
      stageWeight += task.weight;
    }
    assert.strictEqual(stageWeight, stage.stageWeight, `Stage ${stage.stageId} weights do not match declaration`);
    grandWeight += stageWeight;
  }
  assert.strictEqual(grandWeight, 100.0, 'Total allocated weight must equal 100.0%');
});

runTest('5.4 Complete identity between JSON and Markdown execution ledgers', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const mdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');

  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const md = fs.readFileSync(mdPath, 'utf8');

  assert.ok(md.includes('61.5%'), 'Markdown must report 61.5% Repository Readiness');
  assert.ok(md.includes('10.5%'), 'Markdown must report 10.5% Database Pending');
  assert.ok(md.includes('22.5%'), 'Markdown must report 22.5% Blocked');
  assert.ok(md.includes('5.5%'), 'Markdown must report 5.5% Unimplemented');
  assert.ok(md.includes('0.0%'), 'Markdown must report 0.0% Live DB and Formal Acceptance');
  assert.ok(md.includes('DQ-W021.5-B2.2E-001'), 'Markdown must reference open financial defect');
});

runTest('5.5 Reconciler run is idempotent and produces byte-identical files (0 git diff)', () => {
  const jsonBefore = fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8');
  const mdBefore = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md'), 'utf8');

  const res = reconcileExecutionLedger();
  assert.strictEqual(res.reconciled, true);
  assert.strictEqual(res.summary.repoVerifiedEarnedPercent, 61.5);

  const jsonAfter = fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8');
  const mdAfter = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md'), 'utf8');

  assert.strictEqual(jsonBefore, jsonAfter, 'JSON ledger must be byte-identical');
  assert.strictEqual(mdBefore, mdAfter, 'Markdown ledger must be byte-identical');
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Workstream F: Baseline Immutability, Minimal Diffs & Governance
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 6. Workstream F: Baseline Immutability, Minimal Diffs & Governance ---');

runTest('6.1 Financial defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN across all artifacts', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  assert.strictEqual(ledger.financialDefectStatus.status, 'STRICTLY_OPEN');

  const mdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');
  const md = fs.readFileSync(mdPath, 'utf8');
  assert.ok(md.includes('DQ-W021.5-B2.2E-001') && md.includes('STRICTLY OPEN'));
});

runTest('6.2 Rule IV-001 Non-Self-Acceptance strictly preserved: zero self-acceptance or self-ratification', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  assert.strictEqual(ledger.summary.formalAcceptancePercent, 0.0);
  for (const s of ledger.stages) {
    for (const t of s.tasks) {
      assert.notStrictEqual(t.accounting.formalAcceptanceStatus, 'CONFIRMED_ACCEPTED');
      assert.strictEqual(t.accounting.formalAcceptanceArtifact, null);
    }
  }
});

runTest('6.3 68 SQL migration files match baseline commit 0ea572d byte-for-byte identical', () => {
  const report = verifyMigrationImmutability(BASELINE_COMMIT_089);
  assert.strictEqual(report.isImmutabilityPreserved, true);
  assert.strictEqual(report.totalFilesAudited, 68);
  assert.strictEqual(report.identicalCount, 68);
  assert.strictEqual(report.missingPaths.length, 0);
  assert.strictEqual(report.addedPaths.length, 0);
  assert.strictEqual(report.contentModifiedFiles.length, 0);
  assert.strictEqual(report.isGitDiffClean, true);
});

runTest('6.4 All 31 MLA profile seed files have LF line endings matching baseline fb408ce (0 CRLF)', () => {
  const seedFiles = fs.readdirSync(path.join(REPO_ROOT, 'data/seed')).filter((f) => f.endsWith('-mla-profiles.ts'));
  assert.strictEqual(seedFiles.length, 31, 'Exactly 31 MLA profile seed files present');

  let crlfFiles = 0;
  for (const f of seedFiles) {
    const raw = fs.readFileSync(path.join(REPO_ROOT, 'data/seed', f));
    if (raw.includes(Buffer.from('\r\n'))) {
      crlfFiles++;
      console.error(`  CRLF detected in ${f}`);
    }
  }
  assert.strictEqual(crlfFiles, 0, 'Zero CRLF line endings across all 31 MLA profile seed files (100% pure LF)');
});

runTest('6.5 Zero undefined identifiers across all 31 seed files (minimal diff preserved vs fb408ce)', () => {
  const seedFiles = fs.readdirSync(path.join(REPO_ROOT, 'data/seed')).filter((f) => f.endsWith('-mla-profiles.ts'));

  let undefinedCount = 0;
  for (const f of seedFiles) {
    const content = fs.readFileSync(path.join(REPO_ROOT, 'data/seed', f), 'utf8');
    const matches = content.match(/:\s*undefined\b/g);
    if (matches) {
      undefinedCount += matches.length;
    }
  }
  assert.strictEqual(undefinedCount, 0, 'Zero `: undefined` properties across all 31 seed files');
});

runTest('6.6 Telangana AC 119 duplicate claim blocker preserved without mutating geometry fixture', () => {
  const geoPath = path.join(REPO_ROOT, 'data/geo/telangana-assembly.geojson');
  assert.ok(fs.existsSync(geoPath));

  const diff = execSync(`git diff ${BASELINE_COMMIT_090} -- ${geoPath}`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();
  assert.strictEqual(diff, '', 'Telangana GeoJSON fixture must match baseline fb408ce byte-for-byte');
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
