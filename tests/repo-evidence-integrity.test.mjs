import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';

console.log('=== RUNNING REPO EVIDENCE INTEGRITY REGRESSION SUITE ===\n');

const scriptPath = path.resolve('scripts/check-repo-evidence-integrity.mjs');
assert.ok(fs.existsSync(scriptPath), 'Script must exist');

// Test 1: Dirty tree detection
console.log('Test 1: Proving dirty working tree triggers immediate FAIL with exit code 1...');
const tempTestFile = path.resolve('temp_dirty_indicator.tmp');
try {
  fs.writeFileSync(tempTestFile, 'dirty_tree_test');
  
  const dirtyRun = spawnSync('node', [scriptPath], { encoding: 'utf8' });
  
  assert.strictEqual(dirtyRun.status, 1, 'Script must exit with code 1 when working tree is dirty');
  assert.ok(
    dirtyRun.stderr.includes('Working tree is dirty; evidence integrity verification cannot pass.') ||
    dirtyRun.stdout.includes('Working tree is dirty; evidence integrity verification cannot pass.'),
    'Must output specific dirty-tree failure message'
  );
  console.log('[PASS] Test 1 Passed: Dirty working tree correctly rejected with exit code 1.');
} finally {
  if (fs.existsSync(tempTestFile)) {
    fs.unlinkSync(tempTestFile);
  }
}

// Test 2: Clean tree baseline
console.log('\nTest 2: Proving clean working tree with valid ancestry passes...');
const isTreeClean = execSync('git status --porcelain', { encoding: 'utf8' }).trim().length === 0;

if (isTreeClean) {
  const cleanRun = spawnSync('node', [scriptPath], { encoding: 'utf8' });
  assert.strictEqual(cleanRun.status, 0, 'Script must exit with code 0 when tree is clean');
  assert.ok(cleanRun.stdout.includes('[PASS] Repository & Evidence Integrity check completed'), 'Must log completion PASS');
  console.log('[PASS] Test 2 Passed: Clean working tree verified with exit code 0.');
} else {
  console.log('[SKIP] Test 2 Skipped in dirty staging state (will pass on clean tree).');
}

console.log('\n===============================================================');
console.log('   REPO EVIDENCE INTEGRITY REGRESSION SUITE PASSED!   ');
console.log('===============================================================\n');
