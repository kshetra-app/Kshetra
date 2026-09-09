import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';

console.log('=== RUNNING REPO EVIDENCE INTEGRITY REGRESSION SUITE ===\n');

const scriptPath = path.resolve('scripts/check-repo-evidence-integrity.mjs');
assert.ok(fs.existsSync(scriptPath), 'Script must exist');

// Test 1: Dirty working tree detection
console.log('Test 1: Proving dirty working tree triggers immediate FAIL with exit code 1...');
const trackedFile = path.resolve('README.md');
const originalContent = fs.readFileSync(trackedFile, 'utf8');

try {
  // Dirty the tracked file
  fs.appendFileSync(trackedFile, '\n<!-- regression_dirty_test -->\n');
  
  const dirtyRun = spawnSync('node', [scriptPath], { encoding: 'utf8' });
  
  assert.strictEqual(dirtyRun.status, 1, 'Script must exit with code 1 when working tree is dirty');
  const combinedOutput = (dirtyRun.stdout || '') + (dirtyRun.stderr || '');
  assert.ok(
    combinedOutput.includes('Working tree is dirty; evidence integrity verification cannot pass.'),
    'Must output specific dirty-tree failure message'
  );
  console.log('[PASS] Test 1 Passed: Dirty working tree correctly rejected with exit code 1.');
} finally {
  execSync('git checkout -- README.md', { stdio: 'pipe' });
}

// Test 2: Clean working tree baseline
console.log('\nTest 2: Proving clean working tree with valid ancestry passes...');
const isTreeClean = execSync('git status --porcelain', { encoding: 'utf8' }).trim().length === 0;
assert.ok(isTreeClean, 'Working tree must be clean after test cleanup');

const cleanRun = spawnSync('node', [scriptPath], { encoding: 'utf8' });
assert.strictEqual(cleanRun.status, 0, 'Script must exit with code 0 when tree is clean');
assert.ok(cleanRun.stdout.includes('[PASS] Repository & Evidence Integrity check completed'), 'Must log completion PASS');
console.log('[PASS] Test 2 Passed: Clean working tree verified with exit code 0.');

console.log('\n===============================================================');
console.log('   REPO EVIDENCE INTEGRITY REGRESSION SUITE PASSED 100%!   ');
console.log('===============================================================\n');
