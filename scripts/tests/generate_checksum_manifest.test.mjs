#!/usr/bin/env node

/**
 * Kshetra W021.5 / B2.2-E — Checksum Manifest Generator Regression Test Suite
 * 
 * Fulfills CTO Directive 080 §2.2 requirements:
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
  REQUIRED_EVIDENCE_SPECS
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
    assert.strictEqual(parsed.directive, 'W021.5-CTO-DIRECTIVE-080');
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
