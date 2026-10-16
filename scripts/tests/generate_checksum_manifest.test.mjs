#!/usr/bin/env node

/**
 * Kshetra W021.5 / B2.2-E — Checksum Manifest Generator Regression Test Suite
 * 
 * Fulfills CTO Directive 080 & Directive 081 §2.2 requirements:
 * - Verifies manifest with stale prior timestamp receives refreshed timestamp.
 * - Verifies repeat invocation refreshes timestamp again (strictly monotonic).
 * - Verifies generated timestamp is strictly later than all required evidence timestamps.
 * - Verifies missing evidence, missing timestamp fields, and malformed timestamp values fail closed.
 * - Verifies deliverable hashes, byte lengths, and Git blob SHAs are refreshed accurately.
 * - Verifies master checksum manifest is strictly excluded from its own deliverables (non-recursive).
 * - Verifies failed validation does not overwrite or corrupt the existing manifest.
 * - Verifies atomic manifest replacement using safe temporary-file-and-rename strategy.
 * - Verifies temporary files are created in the same directory as target manifest.
 * - Verifies temporary-file write failure leaves original manifest unchanged and cleans up temp files.
 * - Verifies temporary-file fsync failure leaves original manifest unchanged and cleans up temp files.
 * - Verifies replacement rename failure leaves original manifest unchanged and cleans up temp files.
 * - Verifies failed replacement does not return success result or log success messages.
 * - Verifies successful replacement with supported directory synchronization.
 * - Verifies recognized unsupported-directory-sync error following successful rename is non-fatal.
 * - Verifies genuine directory-sync I/O error following successful rename throws PostRenameDurabilityError.
 * - Verifies accurate reporting that new manifest may already be installed after a post-rename error.
 * - Verifies no false claim that old manifest remains intact after rename has succeeded.
 * - Verifies correct completion-banner and return/error behavior for each outcome.
 * - Verifies preservation of pre-rename guarantees leaving old manifest bitwise identical.
 * - Verifies temporary-file cleanup without deleting or corrupting the successfully renamed target.
 * - Operates entirely offline using isolated temporary fixtures.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import assert from 'assert';
import { execSync } from 'child_process';
import {
  generateChecksumManifest,
  validateIso8601Utc,
  atomicWriteFileSync,
  REQUIRED_EVIDENCE_SPECS,
  POSIX_UNSUPPORTED_DIR_SYNC_CODES,
  UNSUPPORTED_DIR_SYNC_CODES,
  classifyDirectorySyncError,
  PostRenameDurabilityError
} from '../generate_checksum_manifest.mjs';

const REPO_ROOT = process.cwd();
const TEMP_BASE = path.join(REPO_ROOT, 'scratch/test_manifest_generator_fixture_' + Date.now());

let passed = 0;
let total = 0;
const testResults = [];

function runTest(name, fn) {
  total++;
  try {
    fn();
    passed++;
    testResults.push({ id: `Test ${String(total).padStart(2, '0')}`, name, status: 'PASS', error: null });
    console.log(`[✓ PASS] Test ${String(total).padStart(2, '0')}: ${name}`);
  } catch (err) {
    testResults.push({ id: `Test ${String(total).padStart(2, '0')}`, name, status: 'FAIL', error: err.message });
    console.error(`[✗ FAIL] Test ${String(total).padStart(2, '0')}: ${name}`);
    console.error(`         ${err.stack || err.message}`);
  }
}

console.log('================================================================');
console.log('KSHETRA W021.5 — CHECKSUM MANIFEST GENERATOR TEST SUITE');
console.log('================================================================');

// Set up isolated temporary test environment
function setupFixtureEnv() {
  if (fs.existsSync(TEMP_BASE)) {
    fs.rmSync(TEMP_BASE, { recursive: true, force: true });
  }
  fs.mkdirSync(TEMP_BASE, { recursive: true });

  const reportsDir = path.join(TEMP_BASE, 'reports');
  const evidenceDir = path.join(TEMP_BASE, 'reports/evidence');
  const scriptsDir = path.join(TEMP_BASE, 'scripts');
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.mkdirSync(scriptsDir, { recursive: true });

  // 1. Copy base affidavit manifest from real repo
  const realBase = path.join(REPO_ROOT, 'reports/w021_5b2_b2_2e_affidavit_manifest.json');
  fs.copyFileSync(realBase, path.join(reportsDir, 'w021_5b2_b2_2e_affidavit_manifest.json'));

  // 2. Create mock evidence files
  fs.writeFileSync(path.join(evidenceDir, 'financial_remediation_test_results.json'), JSON.stringify({
    testSuite: 'Directive 068 Test Battery',
    executionDate: '2026-10-16T03:00:00.000Z'
  }, null, 2), 'utf8');

  fs.writeFileSync(path.join(evidenceDir, 'adjudication_manifest_test_results.json'), JSON.stringify({
    suite: 'adjudication_manifest_test_suite',
    executedAt: '2026-10-16T03:05:00.000Z'
  }, null, 2), 'utf8');

  fs.writeFileSync(path.join(reportsDir, 'w021_5_financial_remediation_adjudication_manifest.json'), JSON.stringify({
    milestone: 'W021.5',
    generatedAt: '2026-10-16T02:00:00.000Z'
  }, null, 2), 'utf8');

  fs.writeFileSync(path.join(reportsDir, 'w021_5_financial_remediation_adjudication_summary.json'), JSON.stringify({
    milestone: 'W021.5',
    generatedAt: '2026-10-16T02:30:00.000Z'
  }, null, 2), 'utf8');

  // 3. Create dummy deliverable files
  fs.writeFileSync(path.join(scriptsDir, 'dummy_deliverable_a.js'), 'console.log("A");\n', 'utf8');
  fs.writeFileSync(path.join(scriptsDir, 'dummy_deliverable_b.js'), 'console.log("B");\n', 'utf8');

  // 4. Create initial test manifest with stale generatedAt
  const initialManifest = {
    milestone: 'W021.5 / B2.2-E',
    defect: 'DQ-W021.5-B2.2E-001',
    defectStatus: 'STRICTLY OPEN',
    directive: 'W021.5-CTO-DIRECTIVE-078',
    generatedAt: '2026-10-15T10:00:00.000Z',
    gitBaseline: {},
    authoritativeAffidavitManifest: {
      path: 'reports/w021_5b2_b2_2e_affidavit_manifest.json'
    },
    deliverables: [
      {
        path: 'scripts/dummy_deliverable_a.js',
        byteLength: 0,
        sha256: 'stale-hash',
        gitBlobSha: 'stale-blob',
        description: 'Dummy deliverable A'
      },
      {
        path: 'scripts/dummy_deliverable_b.js',
        byteLength: 0,
        sha256: 'stale-hash',
        gitBlobSha: 'stale-blob',
        description: 'Dummy deliverable B'
      }
    ]
  };

  const manifestPath = path.join(evidenceDir, 'financial_remediation_manifest_sha256.json');
  fs.writeFileSync(manifestPath, JSON.stringify(initialManifest, null, 2), 'utf8');

  return { tempRoot: TEMP_BASE, manifestPath, evidenceDir, reportsDir, scriptsDir };
}

function cleanupFixtureEnv() {
  if (fs.existsSync(TEMP_BASE)) {
    try {
      fs.rmSync(TEMP_BASE, { recursive: true, force: true });
    } catch (_) {}
  }
}

try {
  // Test 01: Timestamp Format Validator rejects non-ISO, malformed, and invalid calendar dates
  runTest('validateIso8601Utc() accepts valid ISO strings and rejects invalid formats or calendar dates', () => {
    assert.strictEqual(validateIso8601Utc('2026-10-16T03:51:12.636Z'), true);
    assert.strictEqual(validateIso8601Utc('2026-10-16T03:51:12Z'), true);
    assert.strictEqual(validateIso8601Utc('2026-10-16T03:51:12.1Z'), true);
    assert.strictEqual(validateIso8601Utc('2026-10-16T03:51:12.12Z'), true);
    // Invalid calendar dates
    assert.strictEqual(validateIso8601Utc('2026-02-30T10:00:00.000Z'), false, 'Feb 30 must be rejected');
    assert.strictEqual(validateIso8601Utc('2026-13-01T10:00:00.000Z'), false, 'Month 13 must be rejected');
    assert.strictEqual(validateIso8601Utc('2026-04-31T10:00:00.000Z'), false, 'April 31 must be rejected');
    // Malformed formats
    assert.strictEqual(validateIso8601Utc('2026-10-16 03:51:12'), false);
    assert.strictEqual(validateIso8601Utc('not-a-date'), false);
    assert.strictEqual(validateIso8601Utc(''), false);
    assert.strictEqual(validateIso8601Utc(null), false);
    assert.strictEqual(validateIso8601Utc(undefined), false);
    assert.strictEqual(validateIso8601Utc(123456789), false);
  });

  // Test 02: Stale prior generatedAt receives a refreshed timestamp strictly newer than evidence
  runTest('Manifest with stale prior generatedAt receives a refreshed timestamp strictly later than evidence', () => {
    const env = setupFixtureEnv();
    const result = generateChecksumManifest({ repoRoot: env.tempRoot, manifestPath: env.manifestPath, silent: true, autoInjectRequiredDeliverables: false });

    assert.ok(result.generatedAt, 'Refreshed generatedAt must be defined');
    assert.notStrictEqual(result.generatedAt, '2026-10-15T10:00:00.000Z', 'Stale timestamp must not be retained');

    const manifestOnDisk = JSON.parse(fs.readFileSync(env.manifestPath, 'utf8'));
    assert.strictEqual(manifestOnDisk.generatedAt, result.generatedAt);

    // Latest evidence in fixture is 2026-10-16T03:05:00.000Z
    const latestEvidenceMs = Date.parse('2026-10-16T03:05:00.000Z');
    const manifestMs = Date.parse(manifestOnDisk.generatedAt);
    assert.ok(manifestMs > latestEvidenceMs, `manifest.generatedAt (${manifestOnDisk.generatedAt}) must be strictly later than evidence (${new Date(latestEvidenceMs).toISOString()})`);
  });

  // Test 03: A second invocation refreshes the timestamp again rather than preserving the earlier one
  runTest('A second invocation refreshes the timestamp again rather than preserving the earlier one', () => {
    const env = setupFixtureEnv();
    // First run
    const result1 = generateChecksumManifest({ repoRoot: env.tempRoot, manifestPath: env.manifestPath, silent: true, autoInjectRequiredDeliverables: false });
    const ts1 = result1.generatedAt;
    const ms1 = Date.parse(ts1);

    // Second run
    const result2 = generateChecksumManifest({ repoRoot: env.tempRoot, manifestPath: env.manifestPath, silent: true, autoInjectRequiredDeliverables: false });
    const ts2 = result2.generatedAt;
    const ms2 = Date.parse(ts2);

    assert.notStrictEqual(ts1, ts2, 'Second invocation must not preserve earlier timestamp');
    assert.ok(ms2 > ms1, `Second invocation timestamp (${ts2}) must be strictly later than first (${ts1})`);
  });

  // Test 04: Manifest timestamp ordering under execution clock earlier than evidence (clock skew simulation)
  runTest('When execution clock is <= latest evidence timestamp, manifest timestamp is assigned at least +1000ms later', () => {
    const env = setupFixtureEnv();
    // Inject future evidence timestamp
    const futureEvidenceTime = '2030-01-01T00:00:00.000Z';
    fs.writeFileSync(path.join(env.evidenceDir, 'financial_remediation_test_results.json'), JSON.stringify({
      testSuite: 'Directive 068 Test Battery',
      executionDate: futureEvidenceTime
    }, null, 2), 'utf8');

    const result = generateChecksumManifest({ repoRoot: env.tempRoot, manifestPath: env.manifestPath, silent: true, autoInjectRequiredDeliverables: false });
    const resultMs = Date.parse(result.generatedAt);
    const futureMs = Date.parse(futureEvidenceTime);

    assert.ok(resultMs >= futureMs + 1000, `Result timestamp (${result.generatedAt}) must be >= future evidence (${futureEvidenceTime}) + 1000ms`);
  });

  // Test 05: Missing evidence file fails closed and does not overwrite existing manifest
  runTest('Missing evidence file fails closed with error and leaves existing manifest untouched', () => {
    const env = setupFixtureEnv();
    // Delete one evidence file
    fs.unlinkSync(path.join(env.evidenceDir, 'financial_remediation_test_results.json'));

    const beforeRaw = fs.readFileSync(env.manifestPath, 'utf8');
    assert.throws(() => {
      generateChecksumManifest({ repoRoot: env.tempRoot, manifestPath: env.manifestPath, silent: true });
    }, /EVIDENCE_FILE_MISSING/);

    const afterRaw = fs.readFileSync(env.manifestPath, 'utf8');
    assert.strictEqual(beforeRaw, afterRaw, 'Manifest on disk must remain bitwise identical after failure');
  });

  // Test 06: Malformed JSON evidence file fails closed and does not overwrite existing manifest
  runTest('Malformed JSON evidence file fails closed with error and leaves existing manifest untouched', () => {
    const env = setupFixtureEnv();
    // Corrupt one evidence file
    fs.writeFileSync(path.join(env.evidenceDir, 'adjudication_manifest_test_results.json'), '{ "suite": "corrupt json ...', 'utf8');

    const beforeRaw = fs.readFileSync(env.manifestPath, 'utf8');
    assert.throws(() => {
      generateChecksumManifest({ repoRoot: env.tempRoot, manifestPath: env.manifestPath, silent: true });
    }, /EVIDENCE_FILE_MALFORMED/);

    const afterRaw = fs.readFileSync(env.manifestPath, 'utf8');
    assert.strictEqual(beforeRaw, afterRaw, 'Manifest on disk must remain bitwise identical after failure');
  });

  // Test 07: Missing evidence timestamp field fails closed and does not overwrite existing manifest
  runTest('Missing date field in evidence file fails closed and leaves existing manifest untouched', () => {
    const env = setupFixtureEnv();
    // Omit date field
    fs.writeFileSync(path.join(env.evidenceDir, 'financial_remediation_test_results.json'), JSON.stringify({
      testSuite: 'Directive 068 Test Battery'
      // executionDate omitted
    }, null, 2), 'utf8');

    const beforeRaw = fs.readFileSync(env.manifestPath, 'utf8');
    assert.throws(() => {
      generateChecksumManifest({ repoRoot: env.tempRoot, manifestPath: env.manifestPath, silent: true });
    }, /EVIDENCE_TIMESTAMP_MISSING/);

    const afterRaw = fs.readFileSync(env.manifestPath, 'utf8');
    assert.strictEqual(beforeRaw, afterRaw, 'Manifest on disk must remain bitwise identical after failure');
  });

  // Test 08: Malformed timestamp value in evidence file fails closed and leaves existing manifest untouched
  runTest('Malformed date value in evidence file fails closed and leaves existing manifest untouched', () => {
    const env = setupFixtureEnv();
    // Set invalid date value
    fs.writeFileSync(path.join(env.evidenceDir, 'adjudication_manifest_test_results.json'), JSON.stringify({
      suite: 'adjudication_manifest_test_suite',
      executedAt: 'invalid-date-string'
    }, null, 2), 'utf8');

    const beforeRaw = fs.readFileSync(env.manifestPath, 'utf8');
    assert.throws(() => {
      generateChecksumManifest({ repoRoot: env.tempRoot, manifestPath: env.manifestPath, silent: true });
    }, /EVIDENCE_TIMESTAMP_INVALID/);

    const afterRaw = fs.readFileSync(env.manifestPath, 'utf8');
    assert.strictEqual(beforeRaw, afterRaw, 'Manifest on disk must remain bitwise identical after failure');
  });

  // Test 09: Deliverable hashes, byte lengths, and Git blob SHAs are accurately refreshed
  runTest('Deliverable byte lengths, SHA-256 hashes, and Git blob SHAs are computed accurately', () => {
    const env = setupFixtureEnv();
    const result = generateChecksumManifest({ repoRoot: env.tempRoot, manifestPath: env.manifestPath, silent: true, autoInjectRequiredDeliverables: false });

    const manifestData = JSON.parse(fs.readFileSync(env.manifestPath, 'utf8'));
    const itemA = manifestData.deliverables.find(d => d.path === 'scripts/dummy_deliverable_a.js');
    assert.ok(itemA, 'dummy_deliverable_a must be in deliverables');

    const fileABuf = fs.readFileSync(path.join(env.tempRoot, 'scripts/dummy_deliverable_a.js'));
    const expectedSha = crypto.createHash('sha256').update(fileABuf).digest('hex');
    const expectedSize = fileABuf.length;
    const expectedBlob = execSync(`git hash-object ${path.join(env.tempRoot, 'scripts/dummy_deliverable_a.js')}`, { encoding: 'utf8' }).trim();

    assert.strictEqual(itemA.sha256, expectedSha);
    assert.strictEqual(itemA.byteLength, expectedSize);
    assert.strictEqual(itemA.gitBlobSha, expectedBlob);
  });

  // Test 10: Circular checksum violation fails closed when manifest attempts to hash itself
  runTest('Master checksum manifest is strictly excluded from its own deliverable hashes (non-recursive)', () => {
    const env = setupFixtureEnv();
    const manifestData = JSON.parse(fs.readFileSync(env.manifestPath, 'utf8'));

    // Inject self-referential deliverable
    manifestData.deliverables.push({
      path: 'reports/evidence/financial_remediation_manifest_sha256.json',
      byteLength: 100,
      sha256: 'fake-hash',
      gitBlobSha: 'fake-blob',
      description: 'Circular deliverable attempt'
    });
    fs.writeFileSync(env.manifestPath, JSON.stringify(manifestData, null, 2), 'utf8');

    assert.throws(() => {
      generateChecksumManifest({ repoRoot: env.tempRoot, manifestPath: env.manifestPath, silent: true, autoInjectRequiredDeliverables: false });
    }, /CIRCULAR_CHECKSUM_VIOLATION/);
  });

  // Test 11: Missing deliverable file fails closed and does not write partial manifest
  runTest('Missing deliverable file fails closed with error and does not write partial results', () => {
    const env = setupFixtureEnv();
    const manifestData = JSON.parse(fs.readFileSync(env.manifestPath, 'utf8'));

    // Inject deliverable that does not exist on disk
    manifestData.deliverables.push({
      path: 'scripts/non_existent_file.js',
      byteLength: 0,
      sha256: '',
      gitBlobSha: '',
      description: 'Non existent file'
    });
    fs.writeFileSync(env.manifestPath, JSON.stringify(manifestData, null, 2), 'utf8');

    const beforeRaw = fs.readFileSync(env.manifestPath, 'utf8');
    assert.throws(() => {
      generateChecksumManifest({ repoRoot: env.tempRoot, manifestPath: env.manifestPath, silent: true, autoInjectRequiredDeliverables: false });
    }, /DELIVERABLE_FILE_MISSING/);

    const afterRaw = fs.readFileSync(env.manifestPath, 'utf8');
    assert.strictEqual(beforeRaw, afterRaw, 'Manifest on disk must remain unchanged upon deliverable error');
  });

  // Test 12: Successful generation replaces manifest with valid, complete JSON via atomic replacement and leaves no leftover temporary files
  runTest('Successful generation replaces manifest with complete JSON and leaves zero temporary files', () => {
    const env = setupFixtureEnv();
    const result = generateChecksumManifest({ repoRoot: env.tempRoot, manifestPath: env.manifestPath, silent: true, autoInjectRequiredDeliverables: false });

    assert.ok(result.generatedAt, 'Generated timestamp must be defined');
    const onDiskRaw = fs.readFileSync(env.manifestPath, 'utf8');
    const parsed = JSON.parse(onDiskRaw);
    assert.strictEqual(parsed.directive, 'W021.5-CTO-DIRECTIVE-082');
    assert.strictEqual(parsed.generatedAt, result.generatedAt);
    assert.ok(Array.isArray(parsed.deliverables), 'Deliverables must be array');

    // Assert zero temporary files remaining in the manifest directory
    const tempFiles = fs.readdirSync(env.evidenceDir).filter(f => f.includes('.tmp.'));
    assert.strictEqual(tempFiles.length, 0, 'No leftover temporary files should exist in directory');
  });

  // Test 13: Temporary file is created in the same directory as target manifest ensuring same-filesystem volume affinity
  runTest('Atomic persistence strategy writes temporary file in the same directory as target manifest', () => {
    const env = setupFixtureEnv();
    let tempPathObserved = null;
    const origOpenSync = fs.openSync;

    // Spy on fs.openSync to observe temp file directory
    fs.openSync = function(targetFile, flags, mode) {
      if (typeof targetFile === 'string' && targetFile.includes('.tmp.')) {
        tempPathObserved = targetFile;
      }
      return origOpenSync.call(fs, targetFile, flags, mode);
    };

    try {
      generateChecksumManifest({ repoRoot: env.tempRoot, manifestPath: env.manifestPath, silent: true, autoInjectRequiredDeliverables: false });
      assert.ok(tempPathObserved, 'Temporary file creation must have been observed');
      assert.strictEqual(path.dirname(path.resolve(tempPathObserved)), path.dirname(path.resolve(env.manifestPath)), 'Temp file must be in same directory as target');
    } finally {
      fs.openSync = origOpenSync;
    }
  });

  // Test 14: Simulated temporary-file write failure leaves original manifest unchanged and cleans up temporary file
  runTest('Temporary-file write failure leaves original manifest unchanged byte-for-byte and cleans up temp file', () => {
    const env = setupFixtureEnv();
    const beforeRaw = fs.readFileSync(env.manifestPath, 'utf8');

    assert.throws(() => {
      generateChecksumManifest({
        repoRoot: env.tempRoot,
        manifestPath: env.manifestPath,
        silent: true,
        autoInjectRequiredDeliverables: false,
        faultHooks: { failAtWrite: true }
      });
    }, /FAULT_INJECTION: Simulated file write failure/);

    const afterRaw = fs.readFileSync(env.manifestPath, 'utf8');
    assert.strictEqual(beforeRaw, afterRaw, 'Target manifest must remain bitwise identical after write failure');

    const tempFiles = fs.readdirSync(env.evidenceDir).filter(f => f.includes('.tmp.'));
    assert.strictEqual(tempFiles.length, 0, 'Temporary file must be cleaned up after write failure');
  });

  // Test 15: Simulated temporary-file fsync failure leaves original manifest unchanged and cleans up temporary file
  runTest('Temporary-file fsync failure leaves original manifest unchanged byte-for-byte and cleans up temp file', () => {
    const env = setupFixtureEnv();
    const beforeRaw = fs.readFileSync(env.manifestPath, 'utf8');

    assert.throws(() => {
      generateChecksumManifest({
        repoRoot: env.tempRoot,
        manifestPath: env.manifestPath,
        silent: true,
        autoInjectRequiredDeliverables: false,
        faultHooks: { failAtFsync: true }
      });
    }, /FAULT_INJECTION: Simulated fsync failure/);

    const afterRaw = fs.readFileSync(env.manifestPath, 'utf8');
    assert.strictEqual(beforeRaw, afterRaw, 'Target manifest must remain bitwise identical after fsync failure');

    const tempFiles = fs.readdirSync(env.evidenceDir).filter(f => f.includes('.tmp.'));
    assert.strictEqual(tempFiles.length, 0, 'Temporary file must be cleaned up after fsync failure');
  });

  // Test 16: Simulated replacement/rename failure leaves original manifest unchanged and cleans up temporary file
  runTest('Replacement rename failure leaves original manifest unchanged byte-for-byte and cleans up temp file', () => {
    const env = setupFixtureEnv();
    const beforeRaw = fs.readFileSync(env.manifestPath, 'utf8');

    assert.throws(() => {
      generateChecksumManifest({
        repoRoot: env.tempRoot,
        manifestPath: env.manifestPath,
        silent: true,
        autoInjectRequiredDeliverables: false,
        faultHooks: { failAtRename: true }
      });
    }, /FAULT_INJECTION: Simulated rename replacement failure/);

    const afterRaw = fs.readFileSync(env.manifestPath, 'utf8');
    assert.strictEqual(beforeRaw, afterRaw, 'Target manifest must remain bitwise identical after rename failure');

    const tempFiles = fs.readdirSync(env.evidenceDir).filter(f => f.includes('.tmp.'));
    assert.strictEqual(tempFiles.length, 0, 'Temporary file must be cleaned up after rename failure');
  });

  // Test 17: Failed replacement does not return a successful result or print a success message
  runTest('Failed replacement does not return successful result or emit completion banner', () => {
    const env = setupFixtureEnv();
    const stdoutCaptured = [];
    const origLog = console.log;
    console.log = (...args) => stdoutCaptured.push(args.join(' '));

    let threw = false;
    try {
      generateChecksumManifest({
        repoRoot: env.tempRoot,
        manifestPath: env.manifestPath,
        silent: false,
        autoInjectRequiredDeliverables: false,
        faultHooks: { failAtRename: true }
      });
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes('FAULT_INJECTION'), 'Expected fault injection error');
    } finally {
      console.log = origLog;
    }

    assert.strictEqual(threw, true, 'Function must throw on replacement failure');
    assert.ok(!stdoutCaptured.some(line => line.includes('MANIFEST GENERATION: 100% COMPLETE')), 'Must not emit completion banner on failure');
    assert.ok(!stdoutCaptured.some(line => line.includes('atomic replacement verified')), 'Must not emit success verification message on failure');
  });

  // Test 18: Standalone atomicWriteFileSync guarantees byte-for-byte integrity and cleans up on open failure
  runTest('Standalone atomicWriteFileSync writes complete data and cleans up on early failure', () => {
    const env = setupFixtureEnv();
    const testTarget = path.join(env.tempRoot, 'test_atomic_file.json');
    const testData = JSON.stringify({ key: 'atomic-persistence-test', value: 12345 }, null, 2);

    // Successful write
    const writeResult = atomicWriteFileSync(testTarget, testData);
    assert.strictEqual(writeResult.success, true);
    assert.strictEqual(fs.readFileSync(testTarget, 'utf8'), testData);

    // Open failure
    assert.throws(() => {
      atomicWriteFileSync(testTarget, 'modified', { faultHooks: { failAtOpen: true } });
    }, /FAULT_INJECTION: Simulated file open failure/);
    assert.strictEqual(fs.readFileSync(testTarget, 'utf8'), testData, 'Original content preserved after open failure');
  });

  // Test 19: Successful replacement with supported directory synchronization
  runTest('Successful replacement with supported directory synchronization', () => {
    const env = setupFixtureEnv();
    const result = generateChecksumManifest({
      repoRoot: env.tempRoot,
      manifestPath: env.manifestPath,
      silent: true,
      autoInjectRequiredDeliverables: false,
      faultHooks: { simulateDirSyncSuccess: true }
    });

    assert.ok(result.durability, 'Durability object must be returned');
    assert.strictEqual(result.durability.fileSynced, true, 'File sync must be confirmed');
    assert.strictEqual(result.durability.directorySynced, true, 'Directory sync must be confirmed');
    assert.strictEqual(result.durability.directorySyncStatus, 'CONFIRMED_SYNCHRONIZATION');

    const manifestData = JSON.parse(fs.readFileSync(env.manifestPath, 'utf8'));
    assert.strictEqual(manifestData.generatedAt, result.generatedAt);
    const tempFiles = fs.readdirSync(env.evidenceDir).filter(f => f.includes('.tmp.'));
    assert.strictEqual(tempFiles.length, 0, 'No temporary files remaining');
  });

  // Test 20: Recognized unsupported-directory-sync error following successful rename is non-fatal
  runTest('Recognized unsupported-directory-sync error following successful rename is non-fatal', () => {
    const env = setupFixtureEnv();
    for (const code of ['ENOTSUP', 'EINVAL', 'EOPNOTSUPP', 'EISDIR']) {
      const result = generateChecksumManifest({
        repoRoot: env.tempRoot,
        manifestPath: env.manifestPath,
        silent: true,
        autoInjectRequiredDeliverables: false,
        faultHooks: { failAtDirSyncUnsupported: code }
      });

      assert.ok(result.durability, 'Durability object must be returned');
      assert.strictEqual(result.durability.fileSynced, true, 'File sync must be true');
      assert.strictEqual(result.durability.directorySynced, false, 'Directory sync is false for unsupported operations');
      assert.strictEqual(result.durability.directorySyncStatus, `EXPLICITLY_UNSUPPORTED_${code}`);

      const manifestData = JSON.parse(fs.readFileSync(env.manifestPath, 'utf8'));
      assert.strictEqual(manifestData.generatedAt, result.generatedAt);
      const tempFiles = fs.readdirSync(env.evidenceDir).filter(f => f.includes('.tmp.'));
      assert.strictEqual(tempFiles.length, 0, 'No temporary files remaining');
    }
  });

  // Test 21: Genuine directory-sync I/O error following successful rename throws PostRenameDurabilityError
  runTest('Genuine directory-sync I/O error following successful rename throws PostRenameDurabilityError', () => {
    const env = setupFixtureEnv();
    let threw = false;
    try {
      generateChecksumManifest({
        repoRoot: env.tempRoot,
        manifestPath: env.manifestPath,
        silent: true,
        autoInjectRequiredDeliverables: false,
        faultHooks: { failAtDirSync: 'EIO' }
      });
    } catch (err) {
      threw = true;
      assert.ok(err instanceof PostRenameDurabilityError, 'Must be instance of PostRenameDurabilityError');
      assert.strictEqual(err.code, 'POST_RENAME_DURABILITY_ERROR');
      assert.strictEqual(err.isPostRename, true);
      assert.strictEqual(err.renameSucceeded, true);
      assert.strictEqual(err.targetPath, env.manifestPath);
      assert.strictEqual(err.cause.code, 'EIO');
    }
    assert.strictEqual(threw, true, 'Must throw PostRenameDurabilityError on genuine I/O error');
  });

  // Test 22: Accurate reporting that new manifest may already be installed after a post-rename error
  runTest('Accurate reporting that new manifest may already be installed after a post-rename error', () => {
    const env = setupFixtureEnv();
    const oldRaw = fs.readFileSync(env.manifestPath, 'utf8');

    let capturedError = null;
    try {
      generateChecksumManifest({
        repoRoot: env.tempRoot,
        manifestPath: env.manifestPath,
        silent: true,
        autoInjectRequiredDeliverables: false,
        faultHooks: { failAtDirSync: 'EIO' }
      });
    } catch (err) {
      capturedError = err;
    }

    assert.ok(capturedError, 'Expected PostRenameDurabilityError');
    assert.ok(
      capturedError.message.includes('The new manifest may already be installed at'),
      'Error message must state new manifest may already be installed'
    );
    assert.ok(
      capturedError.message.includes('persistence durability could not be confirmed'),
      'Error message must state durability could not be confirmed'
    );

    // Verify on disk that the new manifest IS installed (rename had succeeded before dir sync)
    const currentDiskRaw = fs.readFileSync(env.manifestPath, 'utf8');
    assert.notStrictEqual(currentDiskRaw, oldRaw, 'Manifest on disk was already replaced by the new version');
    const parsedCurrent = JSON.parse(currentDiskRaw);
    assert.strictEqual(parsedCurrent.directive, 'W021.5-CTO-DIRECTIVE-082');
  });

  // Test 23: No false claim that old manifest remains intact after rename has succeeded
  runTest('No false claim that old manifest remains intact after rename has succeeded', () => {
    const env = setupFixtureEnv();
    let capturedError = null;
    try {
      generateChecksumManifest({
        repoRoot: env.tempRoot,
        manifestPath: env.manifestPath,
        silent: true,
        autoInjectRequiredDeliverables: false,
        faultHooks: { failAtDirSync: 'ENOSPC' }
      });
    } catch (err) {
      capturedError = err;
    }

    assert.ok(capturedError, 'Expected error to be thrown');
    assert.ok(
      !capturedError.message.toLowerCase().includes('remains unchanged'),
      'Must NOT claim original file remains unchanged when rename succeeded'
    );
    assert.ok(
      !capturedError.message.toLowerCase().includes('remains intact'),
      'Must NOT claim previous manifest remains intact when rename succeeded'
    );
    assert.ok(
      capturedError.message.includes('The previous manifest was replaced and is no longer intact'),
      'Must explicitly state previous manifest was replaced and is no longer intact'
    );
  });

  // Test 24: Correct completion-banner and return/error behavior for post-rename durability error
  runTest('Correct completion-banner and return/error behavior for post-rename durability error', () => {
    const env = setupFixtureEnv();
    const stdoutCaptured = [];
    const origLog = console.log;
    console.log = (...args) => stdoutCaptured.push(args.join(' '));

    let threw = false;
    try {
      generateChecksumManifest({
        repoRoot: env.tempRoot,
        manifestPath: env.manifestPath,
        silent: false,
        autoInjectRequiredDeliverables: false,
        faultHooks: { failAtDirSync: 'EIO' }
      });
    } catch (err) {
      threw = true;
      assert.ok(err instanceof PostRenameDurabilityError);
    } finally {
      console.log = origLog;
    }

    assert.strictEqual(threw, true, 'Must throw exception');
    // Must NOT emit unqualified full-success banners
    assert.ok(
      !stdoutCaptured.some(line => line.includes('MANIFEST GENERATION: 100% COMPLETE')),
      'Must not emit MANIFEST GENERATION: 100% COMPLETE on post-rename durability error'
    );
    assert.ok(
      !stdoutCaptured.some(line => line.includes('atomic replacement verified')),
      'Must not emit atomic replacement verified on post-rename durability error'
    );
    assert.ok(
      stdoutCaptured.some(line => line.includes('DURABILITY WARNING / ERROR')),
      'Must emit durability warning/error notice'
    );
  });

  // Test 25: Preservation of pre-rename guarantees leaving old manifest bitwise identical
  runTest('Preservation of pre-rename guarantees leaving old manifest bitwise identical', () => {
    const env = setupFixtureEnv();
    const preRenameHooks = [
      { hook: { failAtOpen: true }, pattern: /Simulated file open failure/ },
      { hook: { failAtWrite: true }, pattern: /Simulated file write failure/ },
      { hook: { failAtFsync: true }, pattern: /Simulated fsync failure/ },
      { hook: { failAtRename: true }, pattern: /Simulated rename replacement failure/ }
    ];

    for (const { hook, pattern } of preRenameHooks) {
      const beforeRaw = fs.readFileSync(env.manifestPath, 'utf8');
      assert.throws(() => {
        generateChecksumManifest({
          repoRoot: env.tempRoot,
          manifestPath: env.manifestPath,
          silent: true,
          autoInjectRequiredDeliverables: false,
          faultHooks: hook
        });
      }, pattern);

      const afterRaw = fs.readFileSync(env.manifestPath, 'utf8');
      assert.strictEqual(beforeRaw, afterRaw, 'Target manifest must remain bitwise identical on pre-rename failure');

      const tempFiles = fs.readdirSync(env.evidenceDir).filter(f => f.includes('.tmp.'));
      assert.strictEqual(tempFiles.length, 0, 'Temporary files must be cleaned up on pre-rename failure');
    }
  });

  // Test 26: Temporary-file cleanup without deleting or corrupting the successfully renamed target upon post-rename error
  runTest('Temporary-file cleanup without deleting or corrupting the successfully renamed target upon post-rename error', () => {
    const env = setupFixtureEnv();
    try {
      generateChecksumManifest({
        repoRoot: env.tempRoot,
        manifestPath: env.manifestPath,
        silent: true,
        autoInjectRequiredDeliverables: false,
        faultHooks: { failAtDirSync: 'EIO' }
      });
    } catch (err) {
      assert.ok(err instanceof PostRenameDurabilityError);
    }

    // Temporary files must be gone
    const tempFiles = fs.readdirSync(env.evidenceDir).filter(f => f.includes('.tmp.'));
    assert.strictEqual(tempFiles.length, 0, 'No temporary files should remain after post-rename error');

    // The target manifest MUST exist and must be valid JSON (not deleted or truncated)
    assert.strictEqual(fs.existsSync(env.manifestPath), true, 'Target manifest must still exist');
    const diskContent = fs.readFileSync(env.manifestPath, 'utf8');
    assert.ok(diskContent.length > 0, 'Target manifest must not be empty');
    const parsed = JSON.parse(diskContent);
    assert.strictEqual(parsed.directive, 'W021.5-CTO-DIRECTIVE-082');
    assert.ok(Array.isArray(parsed.deliverables), 'Deliverables array must be intact');
  });

  // Test 27: Standalone unit verification of classifyDirectorySyncError taxonomy
  runTest('Standalone unit verification of classifyDirectorySyncError taxonomy', () => {
    // POSIX standard capability refusal codes
    for (const code of ['EINVAL', 'ENOTSUP', 'EOPNOTSUPP', 'EISDIR']) {
      const resLinux = classifyDirectorySyncError({ code }, 'linux');
      assert.strictEqual(resLinux.isFatal, false, `Code ${code} on Linux must be non-fatal`);
      assert.strictEqual(resLinux.status, `EXPLICITLY_UNSUPPORTED_${code}`);

      const resWin = classifyDirectorySyncError({ code }, 'win32');
      assert.strictEqual(resWin.isFatal, false, `Code ${code} on Win32 must be non-fatal`);
      assert.strictEqual(resWin.status, `EXPLICITLY_UNSUPPORTED_${code}`);
    }

    // EBADF is fatal on all platforms
    const ebadfLinux = classifyDirectorySyncError({ code: 'EBADF' }, 'linux');
    assert.strictEqual(ebadfLinux.isFatal, true, 'EBADF on Linux must be fatal');
    assert.strictEqual(ebadfLinux.status, 'UNCONFIRMED_DURABILITY_ERROR');

    const ebadfWin = classifyDirectorySyncError({ code: 'EBADF' }, 'win32');
    assert.strictEqual(ebadfWin.isFatal, true, 'EBADF on Win32 must be fatal');
    assert.strictEqual(ebadfWin.status, 'UNCONFIRMED_DURABILITY_ERROR');

    // EPERM is fatal on POSIX, non-fatal on Windows
    const epermLinux = classifyDirectorySyncError({ code: 'EPERM' }, 'linux');
    assert.strictEqual(epermLinux.isFatal, true, 'EPERM on Linux must be fatal');
    assert.strictEqual(epermLinux.status, 'UNCONFIRMED_DURABILITY_ERROR');

    const epermDarwin = classifyDirectorySyncError({ code: 'EPERM' }, 'darwin');
    assert.strictEqual(epermDarwin.isFatal, true, 'EPERM on macOS must be fatal');
    assert.strictEqual(epermDarwin.status, 'UNCONFIRMED_DURABILITY_ERROR');

    const epermWin = classifyDirectorySyncError({ code: 'EPERM' }, 'win32');
    assert.strictEqual(epermWin.isFatal, false, 'EPERM on Win32 must be non-fatal (FlushFileBuffers limitation)');
    assert.strictEqual(epermWin.status, 'SKIPPED_PLATFORM_WIN32_EPERM');

    // Genuine I/O errors are fatal
    for (const code of ['EIO', 'ENOSPC', 'EROFS', 'EACCES']) {
      const res = classifyDirectorySyncError({ code }, 'linux');
      assert.strictEqual(res.isFatal, true, `Code ${code} must be fatal`);
      assert.strictEqual(res.status, 'UNCONFIRMED_DURABILITY_ERROR');
    }

    // Unknown or missing error code is fatal
    const resUnknown = classifyDirectorySyncError(new Error('Unknown failure'), 'linux');
    assert.strictEqual(resUnknown.isFatal, true, 'Unknown error must be fatal');
    assert.strictEqual(resUnknown.status, 'UNCONFIRMED_DURABILITY_ERROR');
  });

  // Test 28: EBADF fails closed with PostRenameDurabilityError on both POSIX and Windows
  runTest('EBADF fails closed with PostRenameDurabilityError on both POSIX and Windows', () => {
    const env = setupFixtureEnv();
    for (const plat of ['linux', 'win32']) {
      let threw = false;
      try {
        generateChecksumManifest({
          repoRoot: env.tempRoot,
          manifestPath: env.manifestPath,
          silent: true,
          autoInjectRequiredDeliverables: false,
          platform: plat,
          faultHooks: { failAtDirSync: 'EBADF' }
        });
      } catch (err) {
        threw = true;
        assert.ok(err instanceof PostRenameDurabilityError, `Must throw PostRenameDurabilityError for EBADF on ${plat}`);
        assert.strictEqual(err.cause.code, 'EBADF');
        assert.strictEqual(err.renameSucceeded, true);
      }
      assert.strictEqual(threw, true, `EBADF must throw PostRenameDurabilityError on ${plat}`);
    }
  });

  // Test 29: EPERM fails closed on POSIX but is classified as non-fatal on Windows
  runTest('EPERM fails closed on POSIX but is recognized as non-fatal on Windows', () => {
    const env = setupFixtureEnv();

    // 1. POSIX (Linux): EPERM is fatal
    let linuxThrew = false;
    try {
      generateChecksumManifest({
        repoRoot: env.tempRoot,
        manifestPath: env.manifestPath,
        silent: true,
        autoInjectRequiredDeliverables: false,
        platform: 'linux',
        faultHooks: { failAtDirSync: 'EPERM' }
      });
    } catch (err) {
      linuxThrew = true;
      assert.ok(err instanceof PostRenameDurabilityError, 'EPERM on Linux must throw PostRenameDurabilityError');
      assert.strictEqual(err.cause.code, 'EPERM');
      assert.strictEqual(err.renameSucceeded, true);
    }
    assert.strictEqual(linuxThrew, true, 'EPERM on Linux must fail closed');

    // 2. Windows (win32): EPERM is recognized non-fatal platform limitation
    const winResult = generateChecksumManifest({
      repoRoot: env.tempRoot,
      manifestPath: env.manifestPath,
      silent: true,
      autoInjectRequiredDeliverables: false,
      platform: 'win32',
      forceDirSync: true,
      faultHooks: { failAtDirSync: 'EPERM' }
    });

    assert.ok(winResult.durability, 'Durability object must be returned');
    assert.strictEqual(winResult.durability.fileSynced, true);
    assert.strictEqual(winResult.durability.directorySynced, false, 'Directory sync is false on Windows EPERM');
    assert.strictEqual(winResult.durability.directorySyncStatus, 'SKIPPED_PLATFORM_WIN32_EPERM');
  });

  // Test 30: Genuine I/O, storage, and permission errors all fail closed with PostRenameDurabilityError
  runTest('Genuine I/O, storage, and permission errors all fail closed with PostRenameDurabilityError', () => {
    const env = setupFixtureEnv();
    for (const code of ['EIO', 'ENOSPC', 'EROFS', 'EACCES']) {
      let threw = false;
      try {
        generateChecksumManifest({
          repoRoot: env.tempRoot,
          manifestPath: env.manifestPath,
          silent: true,
          autoInjectRequiredDeliverables: false,
          platform: 'linux',
          faultHooks: { failAtDirSync: code }
        });
      } catch (err) {
        threw = true;
        assert.ok(err instanceof PostRenameDurabilityError, `Must throw PostRenameDurabilityError for ${code}`);
        assert.strictEqual(err.cause.code, code);
        assert.strictEqual(err.renameSucceeded, true);
      }
      assert.strictEqual(threw, true, `Must fail closed for ${code}`);
    }
  });

  // Test 31: Windows skipped directory sync returns explicit status and is not reported as confirmed
  runTest('Windows skipped directory sync returns explicit status and is not reported as confirmed', () => {
    const env = setupFixtureEnv();
    const result = generateChecksumManifest({
      repoRoot: env.tempRoot,
      manifestPath: env.manifestPath,
      silent: true,
      autoInjectRequiredDeliverables: false,
      platform: 'win32'
    });

    assert.ok(result.durability, 'Durability object must be returned');
    assert.strictEqual(result.durability.fileSynced, true, 'File sync must be true');
    assert.strictEqual(result.durability.directorySynced, false, 'Directory sync must be false when skipped on Windows');
    assert.strictEqual(result.durability.directorySyncStatus, 'SKIPPED_PLATFORM_WIN32');
    assert.notStrictEqual(result.durability.directorySyncStatus, 'CONFIRMED_SYNCHRONIZATION');
  });

  // Test 32: Successful rename followed by post-rename durability error preserves replaced manifest without full-success banner
  runTest('Successful rename followed by post-rename durability error preserves replaced manifest without full-success banner', () => {
    const env = setupFixtureEnv();
    const stdoutCaptured = [];
    const origLog = console.log;
    console.log = (...args) => stdoutCaptured.push(args.join(' '));

    let threw = false;
    try {
      generateChecksumManifest({
        repoRoot: env.tempRoot,
        manifestPath: env.manifestPath,
        silent: false,
        autoInjectRequiredDeliverables: false,
        platform: 'linux',
        faultHooks: { failAtDirSync: 'EROFS' }
      });
    } catch (err) {
      threw = true;
      assert.ok(err instanceof PostRenameDurabilityError);
    } finally {
      console.log = origLog;
    }

    assert.strictEqual(threw, true, 'Must throw PostRenameDurabilityError');
    assert.ok(
      !stdoutCaptured.some(line => line.includes('MANIFEST GENERATION: 100% COMPLETE')),
      'Must not emit MANIFEST GENERATION: 100% COMPLETE'
    );

    // Target manifest on disk must be preserved and valid JSON
    assert.strictEqual(fs.existsSync(env.manifestPath), true, 'Manifest on disk must exist');
    const diskContent = fs.readFileSync(env.manifestPath, 'utf8');
    const parsed = JSON.parse(diskContent);
    assert.strictEqual(parsed.directive, 'W021.5-CTO-DIRECTIVE-082');
    assert.ok(Array.isArray(parsed.deliverables));
  });

} finally {
  cleanupFixtureEnv();
}

console.log('================================================================');
console.log(`TEST SUITE SUMMARY: ${passed}/${total} PASSED, ${total - passed}/${total} FAILED`);
console.log('================================================================');

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
