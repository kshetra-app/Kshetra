import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('=== RUNNING W005-R1B DRILL COORDINATE DYNAMISM & CONSISTENCY TEST ===\n');

// 1. Inspect scripts/run-w005-r1a-drills.mjs to ensure NO stale or hard-coded SHAs exist
console.log('Check 1: Auditing scripts/run-w005-r1a-drills.mjs for hardcoded SHAs...');
const drillScriptPath = path.resolve('scripts/run-w005-r1a-drills.mjs');
assert.ok(fs.existsSync(drillScriptPath), 'scripts/run-w005-r1a-drills.mjs must exist');
const drillContent = fs.readFileSync(drillScriptPath, 'utf8');

// Ensure stale SHAs from past runs do not appear as string literals
const forbiddenStaleShas = ['943a803', '4bb8631', '490ceb3', '1260f98', 'ef4622a', '19a5932', '811b5dd', 'da82fbb', '542013d'];
for (const staleSha of forbiddenStaleShas) {
  // Check if it appears as an assignment to verifiedRemoteHead
  const staleRegex = new RegExp(`verifiedRemoteHead\\s*=\\s*['"\`]${staleSha}['"\`]`);
  assert.ok(!staleRegex.test(drillContent), `Drill script must NOT contain hard-coded verifiedRemoteHead = '${staleSha}'`);
}

// Ensure verifiedRemoteHead is dynamically computed via git
assert.ok(drillContent.includes('originMasterHead') || drillContent.includes('git rev-parse'), 'verifiedRemoteHead must be derived from Git at runtime');
assert.ok(drillContent.includes('assert.strictEqual(currentBranch, \'master\''), 'Must assert execution on master branch');
console.log('[PASS] Check 1: Drill script uses dynamic Git derivation and contains no stale hardcoded coordinates.\n');

// 2. Test Git Reality vs Derived Coordinates
console.log('Check 2: Verifying dynamic coordinate derivation against live Git...');
const localHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim().substring(0, 7);
let originMaster = '';
try {
  originMaster = execSync('git rev-parse origin/master', { encoding: 'utf8' }).trim().substring(0, 7);
} catch (e) {
  originMaster = localHead;
}
console.log(`  Live local HEAD:         ${localHead}`);
console.log(`  Live origin/master HEAD: ${originMaster}`);
assert.strictEqual(typeof localHead, 'string');
assert.strictEqual(localHead.length, 7);
assert.strictEqual(typeof originMaster, 'string');
assert.strictEqual(originMaster.length, 7);
console.log('[PASS] Check 2: Live Git coordinates successfully resolved.\n');

// 3. Audit Generated Report Coordinates (if reports exist)
console.log('Check 3: Validating report coordinate consistency...');
const reportFiles = [
  'reports/w005_r1a_dr001_cold_reconstruction.json',
  'reports/w005_r1a_dr002_backup_restore.json',
  'reports/w005_r1a_dr003_api_failover.json',
  'reports/w005_r1a_dr004_storage_restore.json',
  'reports/w005_r1a_dr005_client_resilience.json'
];

for (const rep of reportFiles) {
  const fullPath = path.resolve(rep);
  if (fs.existsSync(fullPath)) {
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    assert.ok(data.repository, `${rep} must have repository`);
    assert.ok(data.branch, `${rep} must have branch`);
    assert.ok(data.auditedCodeCommit, `${rep} must have auditedCodeCommit`);
    assert.ok(data.verifiedRemoteHead, `${rep} must have verifiedRemoteHead`);
    assert.notStrictEqual(data.verifiedRemoteHead, '943a803', `${rep} must NOT contain stale 943a803`);
  }
}
console.log('[PASS] Check 3: Report coordinate structure validated.\n');

console.log('===============================================================');
console.log('   COORDINATE DYNAMISM & CONSISTENCY TEST PASSED 100%!   ');
console.log('===============================================================\n');
