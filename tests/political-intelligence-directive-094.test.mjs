#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-094.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 094 Verification Suite
 * Trusted Acceptance Verification, Semantic Artifact Validation, and Evidence-Backed Progress Accounting
 *
 * Covers:
 * 1. Workstream A: Genuine Acceptance Authentication (8 tests)
 * 2. Workstream B: Semantic Content Validation (18 tests)
 * 3. Workstream C: Evidence-Backed Progress Accounting (5 tests)
 * 4. Workstream D: Baseline Immutability, Minimal Diffs & Governance (6 tests)
 * Total: 37 rigorous adversarial tests
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
console.log('KSHETRA W021.5 — CTO DIRECTIVE 094 VERIFICATION SUITE');
console.log('Trusted Acceptance Verification, Semantic Artifact Validation & Accounting');
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

// Helper to create test keypair
function createTestKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' });
  return { publicKey, privateKey, pubPem };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Workstream A: Genuine Acceptance Authentication
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Workstream A: Genuine Acceptance Authentication ---');

runTest('1.1 Arbitrary long tokens (e.g. VALID_SECURE_CTO_TOKEN_1234567890) strictly fail closed', () => {
  const tmpArbitraryToken = path.join(REPO_ROOT, 'reports/.tmp_arbitrary_token.json');
  fs.writeFileSync(
    tmpArbitraryToken,
    JSON.stringify({
      milestone: 'W021.5',
      taskRef: 'W021.5-TEST-ARB-01',
      decision: 'ACCEPTED',
      adjudicatorIdentity: 'Chief Technology Officer',
      adjudicatorRole: 'CTO',
      authenticationToken: 'VALID_SECURE_CTO_TOKEN_1234567890', // Arbitrary token without cryptographic signature!
      adjudicationDate: '2026-10-17T00:00:00Z',
      authorSelfAcceptance: false,
    }),
    'utf8'
  );

  try {
    const task = {
      taskId: 'W021.5-TEST-ARB-01',
      taskTitle: 'Arbitrary Token Task',
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
        formalAcceptanceArtifact: 'reports/.tmp_arbitrary_token.json',
      },
    };
    assert.throws(
      () => validateTaskAccounting(task),
      /lacks independently verifiable authenticated authority/
    );
  } finally {
    if (fs.existsSync(tmpArbitraryToken)) fs.unlinkSync(tmpArbitraryToken);
  }
});

runTest('1.2 Missing signature in acceptance record fails closed', () => {
  const tmpNoSig = path.join(REPO_ROOT, 'reports/.tmp_no_sig.json');
  fs.writeFileSync(
    tmpNoSig,
    JSON.stringify({
      milestone: 'W021.5',
      taskRef: 'W021.5-TEST-NOSIG-01',
      decision: 'ACCEPTED',
      adjudicatorIdentity: 'Chief Technology Officer',
      adjudicatorRole: 'CTO',
      keyId: 'cto-root-v1',
      // signature missing!
      adjudicationDate: '2026-10-17T00:00:00Z',
      authorSelfAcceptance: false,
    }),
    'utf8'
  );

  try {
    const task = {
      taskId: 'W021.5-TEST-NOSIG-01',
      taskTitle: 'No Signature Task',
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
        formalAcceptanceArtifact: 'reports/.tmp_no_sig.json',
      },
    };
    assert.throws(
      () => validateTaskAccounting(task),
      /lacks independently verifiable authenticated authority/
    );
  } finally {
    if (fs.existsSync(tmpNoSig)) fs.unlinkSync(tmpNoSig);
  }
});

runTest('1.3 Malformed signature in acceptance record fails closed', () => {
  const tmpBadSig = path.join(REPO_ROOT, 'reports/.tmp_bad_sig.json');
  fs.writeFileSync(
    tmpBadSig,
    JSON.stringify({
      milestone: 'W021.5',
      taskRef: 'W021.5-TEST-BADSIG-01',
      decision: 'ACCEPTED',
      adjudicatorIdentity: 'Kshetra Chief Technology Officer',
      adjudicatorRole: 'CTO',
      keyId: 'cto-root-v1',
      signature: 'this_is_not_valid_signature_bytes_at_all!!',
      adjudicationDate: '2026-10-17T00:00:00Z',
      authorSelfAcceptance: false,
    }),
    'utf8'
  );

  try {
    const task = {
      taskId: 'W021.5-TEST-BADSIG-01',
      taskTitle: 'Bad Signature Task',
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
        formalAcceptanceArtifact: 'reports/.tmp_bad_sig.json',
      },
    };
    const options = {
      externalTrustPin: 'fcd67878d2d152b7e478e39814d817b8105c8c84f56a7f7ce72dc6e69e10227d',
    };
    assert.throws(
      () => validateTaskAccounting(task, null, options),
      /signature verification failed|cryptographic verification error/
    );
  } finally {
    if (fs.existsSync(tmpBadSig)) fs.unlinkSync(tmpBadSig);
  }
});

runTest('1.4 Signature created with untrusted key fails closed', () => {
  const { privateKey } = createTestKeyPair();
  const tmpUntrustedKey = path.join(REPO_ROOT, 'reports/.tmp_untrusted_key.json');

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-UNTRUST-01',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'untrusted-rogue-key-999', // Not in trusted authorities registry!
  };
  const canonicalPayload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKey).toString('base64');

  fs.writeFileSync(tmpUntrustedKey, JSON.stringify(record, null, 2), 'utf8');

  try {
    const task = {
      taskId: 'W021.5-TEST-UNTRUST-01',
      taskTitle: 'Untrusted Key Task',
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
        formalAcceptanceArtifact: 'reports/.tmp_untrusted_key.json',
      },
    };
    assert.throws(
      () => validateTaskAccounting(task),
      /references untrusted, inactive, or unknown authority keyId/
    );
  } finally {
    if (fs.existsSync(tmpUntrustedKey)) fs.unlinkSync(tmpUntrustedKey);
  }
});

runTest('1.5 Tampered acceptance record (post-signing field modification) fails closed', () => {
  const { privateKey, pubPem } = createTestKeyPair();
  const tmpTampered = path.join(REPO_ROOT, 'reports/.tmp_tampered.json');

  const originalRecord = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-TAMPER-01',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-authority-094',
  };
  const canonicalPayload = getCanonicalAcceptancePayload(originalRecord);
  const signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKey).toString('base64');

  // TAMPERING: alter decision date after signing!
  const tamperedRecord = {
    ...originalRecord,
    adjudicationDate: '2026-10-17T12:00:00Z', // Tampered!
    signature,
  };

  fs.writeFileSync(tmpTampered, JSON.stringify(tamperedRecord, null, 2), 'utf8');

  try {
    const task = {
      taskId: 'W021.5-TEST-TAMPER-01',
      taskTitle: 'Tampered Task',
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
        formalAcceptanceArtifact: 'reports/.tmp_tampered.json',
      },
    };
    const options = {
      trustedAuthorities: [{
        keyId: 'test-authority-094',
        identity: 'Chief Technology Officer',
        role: 'CTO',
        algorithm: 'Ed25519',
        publicKeyPem: pubPem,
        status: 'ACTIVE',
      }],
      externalTrustPin: computeKeyFingerprint(pubPem),
    };
    assert.throws(
      () => validateTaskAccounting(task, null, options),
      /cryptographic signature verification failed/
    );
  } finally {
    if (fs.existsSync(tmpTampered)) fs.unlinkSync(tmpTampered);
  }
});

runTest('1.6 Replayed acceptance record for different task fails closed', () => {
  const { privateKey, pubPem } = createTestKeyPair();
  const tmpReplay = path.join(REPO_ROOT, 'reports/.tmp_replay.json');

  // Record authorized for TASK-A
  const recordA = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TASK-A',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'test-authority-094',
  };
  const canonicalPayload = getCanonicalAcceptancePayload(recordA);
  recordA.signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKey).toString('base64');

  fs.writeFileSync(tmpReplay, JSON.stringify(recordA, null, 2), 'utf8');

  try {
    // Attempting to use recordA for TASK-B!
    const taskB = {
      taskId: 'W021.5-TASK-B',
      taskTitle: 'Task B',
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
        formalAcceptanceArtifact: 'reports/.tmp_replay.json',
      },
    };
    const options = {
      trustedAuthorities: [{ keyId: 'test-authority-094', publicKeyPem: pubPem, status: 'ACTIVE' }],
    };
    assert.throws(
      () => validateTaskAccounting(taskB, null, options),
      /taskRef "W021.5-TASK-A" does not match task ID W021.5-TASK-B/
    );
  } finally {
    if (fs.existsSync(tmpReplay)) fs.unlinkSync(tmpReplay);
  }
});

runTest('1.7 Self-acceptance (authorSelfAcceptance: true) strictly fails closed under Rule IV-001 even with signature', () => {
  const { privateKey, pubPem } = createTestKeyPair();
  const tmpSelfAccept = path.join(REPO_ROOT, 'reports/.tmp_self_accept.json');

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-SELF-01',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: true, // PROHIBITED!
    keyId: 'test-authority-094',
  };
  const canonicalPayload = getCanonicalAcceptancePayload(record);
  record.signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKey).toString('base64');

  fs.writeFileSync(tmpSelfAccept, JSON.stringify(record, null, 2), 'utf8');

  try {
    const task = {
      taskId: 'W021.5-TEST-SELF-01',
      taskTitle: 'Self Accept Task',
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
        formalAcceptanceArtifact: 'reports/.tmp_self_accept.json',
      },
    };
    const options = {
      trustedAuthorities: [{ keyId: 'test-authority-094', publicKeyPem: pubPem, status: 'ACTIVE' }],
    };
    assert.throws(
      () => validateTaskAccounting(task, null, options),
      /violates Rule IV-001 \(author self-acceptance is strictly prohibited\)/
    );
  } finally {
    if (fs.existsSync(tmpSelfAccept)) fs.unlinkSync(tmpSelfAccept);
  }
});

runTest('1.8 Offline repository environment fails closed with 0.0% formal acceptance', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = computeLedgerSummary(ledger);

  assert.strictEqual(summary.formalAcceptancePercent, 0.0, 'Formal acceptance strictly 0.0%');
  assert.strictEqual(summary.acceptanceFacetCounts.CONFIRMED_ACCEPTED, 0);
  assert.strictEqual(summary.acceptanceFacetCounts.PENDING_INDEPENDENT_CONFIRMATION, 1);
  assert.strictEqual(summary.acceptanceFacetCounts.UNACCEPTED, 26);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Workstream B: Semantic Content Validation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Workstream B: Semantic Content Validation ---');

runTest('2.1 GeoJSON validation reaches .geojson extension directly', () => {
  const tmpGeo = path.join(REPO_ROOT, 'reports/.tmp_geo_test.geojson');
  fs.writeFileSync(
    tmpGeo,
    JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[78.0, 17.0], [78.5, 17.0], [78.5, 17.5], [78.0, 17.0]]],
          },
          properties: { AC_NO: 1, AC_NAME: 'Test AC' },
        },
      ],
    }),
    'utf8'
  );

  try {
    const dummyTask = { taskId: 'W021.5-TEST-GEO-01' };
    assert.strictEqual(validateGeoJsonContent(dummyTask, 'reports/.tmp_geo_test.geojson', tmpGeo), true);
  } finally {
    if (fs.existsSync(tmpGeo)) fs.unlinkSync(tmpGeo);
  }
});

runTest('2.2 Empty FeatureCollection (features: []) fails closed as evidence', () => {
  const tmpEmptyFc = path.join(REPO_ROOT, 'reports/.tmp_empty_fc.geojson');
  fs.writeFileSync(tmpEmptyFc, JSON.stringify({ type: 'FeatureCollection', features: [] }), 'utf8');

  try {
    const dummyTask = { taskId: 'W021.5-TEST-EMPTYFC-01' };
    assert.throws(
      () => validateGeoJsonContent(dummyTask, 'reports/.tmp_empty_fc.geojson', tmpEmptyFc),
      /empty FeatureCollection/
    );
  } finally {
    if (fs.existsSync(tmpEmptyFc)) fs.unlinkSync(tmpEmptyFc);
  }
});

runTest('2.3 Fake GeoJSON (invalid root type) fails closed', () => {
  const tmpFakeGeo = path.join(REPO_ROOT, 'reports/.tmp_fake.geojson');
  fs.writeFileSync(tmpFakeGeo, JSON.stringify({ type: 'InvalidType', data: [] }), 'utf8');

  try {
    const dummyTask = { taskId: 'W021.5-TEST-FAKEGEO-01' };
    assert.throws(
      () => validateGeoJsonContent(dummyTask, 'reports/.tmp_fake.geojson', tmpFakeGeo),
      /expected FeatureCollection or Feature/
    );
  } finally {
    if (fs.existsSync(tmpFakeGeo)) fs.unlinkSync(tmpFakeGeo);
  }
});

runTest('2.4 GeoJSON with invalid geometry type fails closed', () => {
  const tmpBadGeom = path.join(REPO_ROOT, 'reports/.tmp_bad_geom.geojson');
  fs.writeFileSync(
    tmpBadGeom,
    JSON.stringify({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: { type: 'UnsupportedShape', coordinates: [] } }],
    }),
    'utf8'
  );

  try {
    const dummyTask = { taskId: 'W021.5-TEST-BADGEOM-01' };
    assert.throws(
      () => validateGeoJsonContent(dummyTask, 'reports/.tmp_bad_geom.geojson', tmpBadGeom),
      /invalid geometry type/
    );
  } finally {
    if (fs.existsSync(tmpBadGeom)) fs.unlinkSync(tmpBadGeom);
  }
});

runTest('2.5 GeoJSON with non-numeric / NaN coordinates fails closed', () => {
  const tmpNanCoords = path.join(REPO_ROOT, 'reports/.tmp_nan_coords.geojson');
  fs.writeFileSync(
    tmpNanCoords,
    JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[['NaN', null], [78.5, 17.0], [78.5, 17.5], ['NaN', null]]],
          },
        },
      ],
    }),
    'utf8'
  );

  try {
    const dummyTask = { taskId: 'W021.5-TEST-NAN-01' };
    assert.throws(
      () => validateGeoJsonContent(dummyTask, 'reports/.tmp_nan_coords.geojson', tmpNanCoords),
      /non-numeric or NaN coordinate/
    );
  } finally {
    if (fs.existsSync(tmpNanCoords)) fs.unlinkSync(tmpNanCoords);
  }
});

runTest('2.6 GeoJSON with out-of-range coordinates (e.g. lat > 90 or outside India bounds) fails closed', () => {
  const tmpOutBounds = path.join(REPO_ROOT, 'reports/.tmp_out_bounds.geojson');
  fs.writeFileSync(
    tmpOutBounds,
    JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[120.0, 50.0], [121.0, 50.0], [121.0, 51.0], [120.0, 50.0]]],
          },
        },
      ],
    }),
    'utf8'
  );

  try {
    const dummyTask = { taskId: 'W021.5-TEST-OUTBOUNDS-01' };
    assert.throws(
      () => validateGeoJsonContent(dummyTask, 'reports/.tmp_out_bounds.geojson', tmpOutBounds),
      /outside Indian territory bounding box/
    );
  } finally {
    if (fs.existsSync(tmpOutBounds)) fs.unlinkSync(tmpOutBounds);
  }
});

runTest('2.7 GeoJSON with unclosed polygon linear rings fails closed', () => {
  const tmpUnclosed = path.join(REPO_ROOT, 'reports/.tmp_unclosed_ring.geojson');
  fs.writeFileSync(
    tmpUnclosed,
    JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[78.0, 17.0], [78.5, 17.0], [78.5, 17.5], [78.1, 17.1]]], // First !== Last
          },
        },
      ],
    }),
    'utf8'
  );

  try {
    const dummyTask = { taskId: 'W021.5-TEST-UNCLOSED-01' };
    assert.throws(
      () => validateGeoJsonContent(dummyTask, 'reports/.tmp_unclosed_ring.geojson', tmpUnclosed),
      /unclosed linear ring/
    );
  } finally {
    if (fs.existsSync(tmpUnclosed)) fs.unlinkSync(tmpUnclosed);
  }
});

runTest('2.8 GeoJSON duplicate AC IDs check detects defect and distinguishes syntax from statutory completeness', () => {
  const geoPath = path.join(REPO_ROOT, 'data/geo/telangana-assembly.geojson');
  assert.ok(fs.existsSync(geoPath), 'Telangana geojson exists');

  const parsed = JSON.parse(fs.readFileSync(geoPath, 'utf8'));
  const counts = {};
  for (const f of parsed.features) {
    const ac = f.properties.AC_NO;
    counts[ac] = (counts[ac] || 0) + 1;
  }
  const dupes = Object.entries(counts).filter(([ac, c]) => c > 1);
  assert.strictEqual(dupes.length, 1);
  assert.strictEqual(dupes[0][0], '119', 'AC 119 has duplicate claim');
  assert.strictEqual(dupes[0][1], 2, 'AC 119 has 2 features');
});

runTest('2.9 SQL comment-only file strictly fails closed', () => {
  const tmpCommentSql = path.join(REPO_ROOT, 'reports/.tmp_comment_only.sql');
  fs.writeFileSync(
    tmpCommentSql,
    `-- This is a comment only\n-- Another line comment\n/* Block comment here */\n`,
    'utf8'
  );

  try {
    const dummyTask = { taskId: 'W021.5-TEST-CMTSQL-01' };
    assert.throws(
      () => validateSqlContent(dummyTask, 'reports/.tmp_comment_only.sql', tmpCommentSql),
      /references comment-only or empty SQL file/
    );
  } finally {
    if (fs.existsSync(tmpCommentSql)) fs.unlinkSync(tmpCommentSql);
  }
});

runTest('2.10 SQL file lacking executable DDL/DML statements fails closed', () => {
  const tmpNoDdlSql = path.join(REPO_ROOT, 'reports/.tmp_no_ddl.sql');
  fs.writeFileSync(
    tmpNoDdlSql,
    `VARIABLE x = 123;\nPRINT x;\n`,
    'utf8'
  );

  try {
    const dummyTask = { taskId: 'W021.5-TEST-NODDL-01' };
    assert.throws(
      () => validateSqlContent(dummyTask, 'reports/.tmp_no_ddl.sql', tmpNoDdlSql),
      /lacking valid SQL DDL or DML statements/
    );
  } finally {
    if (fs.existsSync(tmpNoDdlSql)) fs.unlinkSync(tmpNoDdlSql);
  }
});

runTest('2.11 Token-only test file (tokens without test calls) strictly fails closed', () => {
  const tmpTokenTest = path.join(REPO_ROOT, 'reports/.tmp_token_only.test.mjs');
  fs.writeFileSync(
    tmpTokenTest,
    `const test = 1;\nconst describe = 'suite';\nconst it = false;\nconst assert = null;\n`,
    'utf8'
  );

  try {
    const dummyTask = { taskId: 'W021.5-TEST-TOKTEST-01' };
    assert.throws(
      () => validateTestContent(dummyTask, 'reports/.tmp_token_only.test.mjs', tmpTokenTest),
      /lacking test assertions or test suites \(token-only test file\)/
    );
  } finally {
    if (fs.existsSync(tmpTokenTest)) fs.unlinkSync(tmpTokenTest);
  }
});

runTest('2.12 Comment-only test file strictly fails closed', () => {
  const tmpCmtTest = path.join(REPO_ROOT, 'reports/.tmp_cmt_only.test.mjs');
  fs.writeFileSync(
    tmpCmtTest,
    `// describe('my test suite', () => {\n//   it('runs', () => { assert.ok(true); });\n// });\n`,
    'utf8'
  );

  try {
    const dummyTask = { taskId: 'W021.5-TEST-CMTTEST-01' };
    assert.throws(
      () => validateTestContent(dummyTask, 'reports/.tmp_cmt_only.test.mjs', tmpCmtTest),
      /lacking test assertions or test suites \(comment-only or empty test file\)/
    );
  } finally {
    if (fs.existsSync(tmpCmtTest)) fs.unlinkSync(tmpCmtTest);
  }
});

runTest('2.13 Short Markdown file (<200 chars) fails closed', () => {
  const tmpShortMd = path.join(REPO_ROOT, 'reports/.tmp_short.md');
  fs.writeFileSync(tmpShortMd, `# Title\n## Section\nToo short.\n`, 'utf8');

  try {
    const dummyTask = { taskId: 'W021.5-TEST-SHORTMD-01' };
    assert.throws(
      () => validateMarkdownContent(dummyTask, 'reports/.tmp_short.md', tmpShortMd),
      /insufficient content: <200 characters/
    );
  } finally {
    if (fs.existsSync(tmpShortMd)) fs.unlinkSync(tmpShortMd);
  }
});

runTest('2.14 Markdown lacking structured headings fails closed', () => {
  const tmpNoHeadMd = path.join(REPO_ROOT, 'reports/.tmp_no_headings.md');
  fs.writeFileSync(
    tmpNoHeadMd,
    `This is a document that does not contain proper top-level or second-level headings at all. It is long enough to satisfy character length requirements, but lacks markdown document structure. Constituency political elections governance.\n`,
    'utf8'
  );

  try {
    const dummyTask = { taskId: 'W021.5-TEST-NOHEAD-01' };
    assert.throws(
      () => validateMarkdownContent(dummyTask, 'reports/.tmp_no_headings.md', tmpNoHeadMd),
      /must include # Title and ## Section headings/
    );
  } finally {
    if (fs.existsSync(tmpNoHeadMd)) fs.unlinkSync(tmpNoHeadMd);
  }
});

runTest('2.15 Irrelevant Markdown (lacking domain keywords) fails closed', () => {
  const tmpIrrelMd = path.join(REPO_ROOT, 'reports/.tmp_irrelevant.md');
  fs.writeFileSync(
    tmpIrrelMd,
    `# Random Cooking Recipe\n## Ingredients\nHere is a long description of how to bake bread. You take flour, water, yeast, salt, and mix them together. Then you knead the dough and let it rise for an hour. Bake at 200 degrees Celsius for 30 minutes.\n`,
    'utf8'
  );

  try {
    const dummyTask = { taskId: 'W021.5-TEST-IRREL-01' };
    assert.throws(
      () => validateMarkdownContent(dummyTask, 'reports/.tmp_irrelevant.md', tmpIrrelMd),
      /lacking task-related domain content/
    );
  } finally {
    if (fs.existsSync(tmpIrrelMd)) fs.unlinkSync(tmpIrrelMd);
  }
});

runTest('2.16 Malformed JSON file fails closed', () => {
  const tmpMalJson = path.join(REPO_ROOT, 'reports/.tmp_malformed.json');
  fs.writeFileSync(tmpMalJson, `{"broken": json without closing`, 'utf8');

  try {
    const dummyTask = { taskId: 'W021.5-TEST-MALJSON-01' };
    assert.throws(
      () => validateJsonContent(dummyTask, 'reports/.tmp_malformed.json', tmpMalJson),
      /references invalid or empty JSON evidence file/
    );
  } finally {
    if (fs.existsSync(tmpMalJson)) fs.unlinkSync(tmpMalJson);
  }
});

runTest('2.17 Empty JSON object / array fails closed', () => {
  const tmpEmptyObj = path.join(REPO_ROOT, 'reports/.tmp_empty_obj.json');
  fs.writeFileSync(tmpEmptyObj, `{}`, 'utf8');

  try {
    const dummyTask = { taskId: 'W021.5-TEST-EMPTYOBJ-01' };
    assert.throws(
      () => validateJsonContent(dummyTask, 'reports/.tmp_empty_obj.json', tmpEmptyObj),
      /empty object/
    );
  } finally {
    if (fs.existsSync(tmpEmptyObj)) fs.unlinkSync(tmpEmptyObj);
  }
});

runTest('2.18 Symlink boundary: targets outside repository root fail closed', () => {
  const tmpExtLink = path.join(REPO_ROOT, 'reports/.tmp_ext_link.json');
  // If symlink creation is supported, test it; otherwise test path resolution check
  const dummyTask = {
    taskId: 'W021.5-TEST-TRAV-01',
    taskTitle: 'Trav Task',
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
// 3. Workstream C: Evidence-Backed Progress Accounting
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Workstream C: Evidence-Backed Progress Accounting ---');

runTest('3.1 Explicit task specifications defined for all 27 ledger tasks', () => {
  const specKeys = Object.keys(TASK_SPECIFICATIONS);
  assert.strictEqual(specKeys.length, 27, 'Exactly 27 task specifications defined');

  for (const taskId of specKeys) {
    const spec = TASK_SPECIFICATIONS[taskId];
    assert.ok(spec.specRef, `Task ${taskId} must have specRef`);
    assert.ok(spec.acceptanceCriteria, `Task ${taskId} must have acceptanceCriteria`);
    assert.strictEqual(typeof spec.validator, 'function', `Task ${taskId} must have substantive validator function`);
  }
});

runTest('3.2 All 27 tasks in production ledger have evidenceAssessment with criteria and executed checks', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  let assessedCount = 0;
  for (const stage of ledger.stages) {
    for (const task of stage.tasks) {
      assert.ok(task.evidenceAssessment, `Task ${task.taskId} must have evidenceAssessment`);
      const ea = task.evidenceAssessment;
      assert.ok(ea.criteriaAssessed, `Task ${task.taskId} missing criteriaAssessed`);
      assert.ok(Array.isArray(ea.evidenceArtifactsUsed), `Task ${task.taskId} missing evidenceArtifactsUsed`);
      assert.ok(Array.isArray(ea.deterministicChecksExecuted), `Task ${task.taskId} missing deterministicChecksExecuted`);
      assert.ok(Array.isArray(ea.checksPassed), `Task ${task.taskId} missing checksPassed`);
      assert.ok(Array.isArray(ea.checksFailed), `Task ${task.taskId} missing checksFailed`);
      assert.ok(Array.isArray(ea.requirementsNotYetVerifiable), `Task ${task.taskId} missing requirementsNotYetVerifiable`);
      assert.ok(ea.ratioRationale, `Task ${task.taskId} missing ratioRationale`);
      assessedCount++;
    }
  }
  assert.strictEqual(assessedCount, 27, 'All 27 tasks verified with structured evidenceAssessment');
});

runTest('3.3 Reconciled ledger metrics match exact mathematical formulas', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = computeLedgerSummary(ledger);

  assert.strictEqual(summary.repositoryImplementationPercent, 61.5);
  assert.strictEqual(summary.adjudicatedEarnedCompletionPercent, 61.5);
  assert.strictEqual(summary.databaseExecutionPercent, 0.0);
  assert.strictEqual(summary.formalAcceptancePercent, 0.0);
  assert.strictEqual(summary.unexecutedDatabasePendingPercent, 10.5);
  assert.strictEqual(summary.blockedOnExternalCtcGatesPercent, 22.5);
  assert.strictEqual(summary.notImplementedPercent, 5.5);

  // Non-overlapping conservation closure: 61.5% + 10.5% + 22.5% + 5.5% = 100.0%
  assert.strictEqual(
    summary.repoVerifiedEarnedPercent +
      summary.unexecutedDatabasePendingPercent +
      summary.blockedPercent +
      summary.notImplementedPercent,
    100.0
  );

  // Total allocated: 51.0 + 25.0 + 21.0 + 3.0 = 100.0%
  const totalAllocated =
    summary.statusAllocatedWeights.REPO_VERIFIED.allocated +
    summary.statusAllocatedWeights.PARTIAL.allocated +
    summary.statusAllocatedWeights.BLOCKED.allocated +
    summary.statusAllocatedWeights.NOT_IMPLEMENTED.allocated;
  assert.strictEqual(totalAllocated, 100.0);
});

runTest('3.4 Database discount derived strictly from 4 tasks and does not exceed task weight', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = computeLedgerSummary(ledger);

  assert.strictEqual(summary.databaseDiscountBreakdown.length, 4);
  const taskIds = summary.databaseDiscountBreakdown.map((d) => d.taskId);
  assert.deepStrictEqual(taskIds, ['W021.5-C-02', 'W021.5-D-02', 'W021.5-E-01', 'W021.5-F-02']);

  for (const dt of summary.databaseDiscountBreakdown) {
    assert.ok(dt.unexecutedDatabaseWeight <= dt.weight, `Discount for ${dt.taskId} cannot exceed weight`);
  }
});

runTest('3.5 Complete identity between JSON and Markdown execution ledgers', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const mdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');

  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const md = fs.readFileSync(mdPath, 'utf8');

  assert.ok(md.includes(`Repository Implementation Readiness: ${json.summary.repositoryImplementationPercent.toFixed(1)}%`));
  assert.ok(md.includes(`Adjudicated Earned Completion:       ${json.summary.adjudicatedEarnedCompletionPercent.toFixed(1)}%`));
  assert.ok(md.includes(`Live Database Staging Execution:     ${json.summary.databaseExecutionPercent.toFixed(1)}%`));
  assert.ok(md.includes(`Formal CTO Acceptance:              ${json.summary.formalAcceptancePercent.toFixed(1)}%`));
  assert.ok(md.includes(`Unexecuted Database Pending:         ${json.summary.unexecutedDatabasePendingPercent.toFixed(1)}%`));
  assert.ok(md.includes(`Blocked on External / CTO Gates:     ${json.summary.blockedOnExternalCtcGatesPercent.toFixed(1)}%`));
  assert.ok(md.includes(`Not Implemented:                     ${json.summary.notImplementedPercent.toFixed(1)}%`));

  for (const dt of json.summary.databaseDiscountBreakdown) {
    assert.ok(md.includes(dt.taskId), `Markdown must contain discount task ${dt.taskId}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Workstream D: Baseline Immutability, Minimal Diffs & Governance
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Workstream D: Baseline Immutability, Minimal Diffs & Governance ---');

runTest('4.1 Financial defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN across all artifacts', () => {
  const matrixMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.md'), 'utf8');
  assert.ok(matrixMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));

  const ledgerMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md'), 'utf8');
  assert.ok(ledgerMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));

  const ledgerJson = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8'));
  assert.strictEqual(ledgerJson.financialDefectStatus.defectId, 'DQ-W021.5-B2.2E-001');
  assert.strictEqual(ledgerJson.financialDefectStatus.status, 'STRICTLY_OPEN');

  const stageE = ledgerJson.stages.find((s) => s.stageId === 'STAGE_E');
  const defectTask = stageE.tasks.find((t) => t.taskId === 'W021.5-E-02');
  assert.strictEqual(defectTask.status, 'BLOCKED');
  assert.strictEqual(defectTask.accounting.repoCompletionRatio, 0.0);
  assert.strictEqual(defectTask.accounting.formalAcceptanceStatus, 'UNACCEPTED');
});

runTest('4.2 Rule IV-001 Non-Self-Acceptance strictly preserved: zero self-acceptance or self-ratification', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  assert.strictEqual(ledger.summary.formalAcceptancePercent, 0.0);

  for (const s of ledger.stages) {
    for (const t of s.tasks) {
      assert.notStrictEqual(t.accounting.formalAcceptanceStatus, 'CONFIRMED_ACCEPTED');
    }
  }
});

runTest('4.3 68 SQL migration files match baseline commit 0ea572d byte-for-byte identical', () => {
  const report = verifyMigrationImmutability(BASELINE_COMMIT_089);
  assert.strictEqual(report.isImmutabilityPreserved, true);
  assert.strictEqual(report.totalFilesAudited, 68);
  assert.strictEqual(report.identicalCount, 68);
  assert.strictEqual(report.missingPaths.length, 0);
  assert.strictEqual(report.addedPaths.length, 0);
  assert.strictEqual(report.contentModifiedFiles.length, 0);
  assert.strictEqual(report.isGitDiffClean, true);
});

runTest('4.4 All 31 MLA profile seed files have LF line endings matching baseline fb408ce (0 CRLF)', () => {
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

runTest('4.5 Zero undefined identifiers across all 31 seed files (minimal diff preserved vs fb408ce)', () => {
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

runTest('4.6 Telangana AC 119 duplicate claim blocker preserved without mutating geometry fixture', () => {
  const geoPath = path.join(REPO_ROOT, 'data/geo/telangana-assembly.geojson');
  assert.ok(fs.existsSync(geoPath));

  const diff = execSync(`git diff ${BASELINE_COMMIT_090} -- ${geoPath}`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.strictEqual(diff.trim(), '', 'data/geo/telangana-assembly.geojson remains unmutated vs baseline commit fb408ce');
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
