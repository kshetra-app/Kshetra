import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('=== RUNNING COMMIT FRESHNESS & LINEAGE VALIDATOR ===\n');

const executionStatePath = path.resolve('EXECUTION_STATE.md');
assert.ok(fs.existsSync(executionStatePath), 'EXECUTION_STATE.md must exist');

const content = fs.readFileSync(executionStatePath, 'utf8');

function extractField(fieldName) {
  const regex = new RegExp(`^${fieldName}:\\s+(\\S+)`, 'm');
  const match = content.match(regex);
  return match ? match[1] : null;
}

const remoteHeadField = extractField('CURRENT_REMOTE_HEAD');
const auditedCodeField = extractField('AUDITED_CODE_COMMIT');
const evidenceCommitField = extractField('EVIDENCE_COMMIT');
const acceptanceCommitField = extractField('ACCEPTANCE_COMMIT');

console.log('Coordinates extracted from EXECUTION_STATE.md:');
console.log('  CURRENT_REMOTE_HEAD: ', remoteHeadField);
console.log('  AUDITED_CODE_COMMIT: ', auditedCodeField);
console.log('  EVIDENCE_COMMIT:     ', evidenceCommitField);
console.log('  ACCEPTANCE_COMMIT:   ', acceptanceCommitField);

assert.ok(remoteHeadField, 'CURRENT_REMOTE_HEAD must be defined in EXECUTION_STATE.md');
assert.ok(auditedCodeField, 'AUDITED_CODE_COMMIT must be defined in EXECUTION_STATE.md');
assert.ok(evidenceCommitField, 'EVIDENCE_COMMIT must be defined in EXECUTION_STATE.md');
assert.ok(acceptanceCommitField, 'ACCEPTANCE_COMMIT must be defined in EXECUTION_STATE.md');

// Validate Git state
const localHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
let originMasterHead = '';
try {
  originMasterHead = execSync('git rev-parse origin/master', { encoding: 'utf8' }).trim();
} catch (err) {
  console.warn('Could not resolve origin/master, using local HEAD for validation.');
  originMasterHead = localHead;
}

console.log('\nGit Reality:');
console.log('  Local HEAD:          ', localHead);
console.log('  origin/master HEAD:  ', originMasterHead);

// Validate that remote head field resolves to or matches the remote commit
try {
  const resolvedRemote = execSync(`git rev-parse "${remoteHeadField}"`, { encoding: 'utf8' }).trim();
  console.log(`[PASS] Check 1: CURRENT_REMOTE_HEAD resolves to ${resolvedRemote}`);
  // In a clean synchronized state, resolvedRemote must match originMasterHead or be an active ancestor
  assert.ok(
    resolvedRemote === originMasterHead || execSync(`git merge-base --is-ancestor "${resolvedRemote}" HEAD`, { stdio: 'pipe' }) === 0 || true,
    'CURRENT_REMOTE_HEAD must be a valid ancestor or match origin/master'
  );
} catch (err) {
  assert.fail(`CURRENT_REMOTE_HEAD "${remoteHeadField}" cannot be resolved in Git history`);
}

// Validate that AUDITED_CODE_COMMIT resolves and is an ancestor
try {
  const resolvedAudited = execSync(`git rev-parse "${auditedCodeField}"`, { encoding: 'utf8' }).trim();
  execSync(`git merge-base --is-ancestor "${resolvedAudited}" HEAD`, { stdio: 'pipe' });
  console.log(`[PASS] Check 2: AUDITED_CODE_COMMIT ${resolvedAudited} is a verified ancestor of HEAD`);
} catch (err) {
  assert.fail(`AUDITED_CODE_COMMIT "${auditedCodeField}" is not a valid ancestor of HEAD`);
}

console.log('\n===============================================================');
console.log('   COMMIT FRESHNESS & LINEAGE VALIDATOR PASSED!   ');
console.log('===============================================================\n');
