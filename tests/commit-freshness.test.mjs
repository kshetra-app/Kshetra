import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('=== RUNNING COMMIT FRESHNESS & LINEAGE VALIDATOR (Amendment v1.4 / DEC-023) ===\n');

const executionStatePath = path.resolve('EXECUTION_STATE.md');
assert.ok(fs.existsSync(executionStatePath), 'EXECUTION_STATE.md must exist');

const content = fs.readFileSync(executionStatePath, 'utf8');

function extractField(fieldName) {
  const regex = new RegExp(`^${fieldName}:\\s+(\\S+)`, 'm');
  const match = content.match(regex);
  return match ? match[1] : null;
}

const verifiedRemoteHeadField = extractField('VERIFIED_REMOTE_HEAD') || extractField('CURRENT_REMOTE_HEAD');
const auditedCodeField = extractField('AUDITED_CODE_COMMIT');
const evidenceCommitField = extractField('EVIDENCE_COMMIT');
const acceptanceCommitField = extractField('ACCEPTANCE_COMMIT');

console.log('Coordinates extracted from EXECUTION_STATE.md:');
console.log('  VERIFIED_REMOTE_HEAD: ', verifiedRemoteHeadField);
console.log('  AUDITED_CODE_COMMIT:  ', auditedCodeField);
console.log('  EVIDENCE_COMMIT:      ', evidenceCommitField);
console.log('  ACCEPTANCE_COMMIT:    ', acceptanceCommitField);

assert.ok(verifiedRemoteHeadField, 'VERIFIED_REMOTE_HEAD (or CURRENT_REMOTE_HEAD) must be defined in EXECUTION_STATE.md');
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

// CHECK 1: VERIFIED_REMOTE_HEAD must resolve in Git history and be a valid ancestor of (or equal to) HEAD
let resolvedVerifiedRemote = '';
try {
  resolvedVerifiedRemote = execSync(`git rev-parse "${verifiedRemoteHeadField}"`, { encoding: 'utf8' }).trim();
  execSync(`git cat-file -e "${resolvedVerifiedRemote}^{commit}"`, { stdio: 'pipe' });
  execSync(`git merge-base --is-ancestor "${resolvedVerifiedRemote}" HEAD`, { stdio: 'pipe' });
  console.log(`[PASS] Check 1: VERIFIED_REMOTE_HEAD (${verifiedRemoteHeadField}) resolves to ${resolvedVerifiedRemote} and is a verified ancestor of HEAD`);
} catch (err) {
  assert.fail(`VERIFIED_REMOTE_HEAD "${verifiedRemoteHeadField}" cannot be resolved or is not an ancestor of HEAD: ${err.message}`);
}

// CHECK 2: AUDITED_CODE_COMMIT must resolve and be an ancestor of VERIFIED_REMOTE_HEAD
if (auditedCodeField !== 'pending') {
  try {
    const resolvedAudited = execSync(`git rev-parse "${auditedCodeField}"`, { encoding: 'utf8' }).trim();
    execSync(`git cat-file -e "${resolvedAudited}^{commit}"`, { stdio: 'pipe' });
    execSync(`git merge-base --is-ancestor "${resolvedAudited}" "${resolvedVerifiedRemote}"`, { stdio: 'pipe' });
    console.log(`[PASS] Check 2: AUDITED_CODE_COMMIT ${resolvedAudited} is a verified ancestor of VERIFIED_REMOTE_HEAD`);
  } catch (err) {
    assert.fail(`AUDITED_CODE_COMMIT "${auditedCodeField}" is not a valid ancestor of VERIFIED_REMOTE_HEAD: ${err.message}`);
  }
} else {
  console.log(`[INFO] Check 2: AUDITED_CODE_COMMIT is "pending" (in progress)`);
}

// CHECK 3: EVIDENCE_COMMIT must resolve in git history and be an ancestor of HEAD
if (evidenceCommitField !== 'pending') {
  try {
    const resolvedEvidence = execSync(`git rev-parse "${evidenceCommitField}"`, { encoding: 'utf8' }).trim();
    execSync(`git cat-file -e "${resolvedEvidence}^{commit}"`, { stdio: 'pipe' });
    execSync(`git merge-base --is-ancestor "${resolvedEvidence}" HEAD`, { stdio: 'pipe' });
    console.log(`[PASS] Check 3: EVIDENCE_COMMIT ${resolvedEvidence} exists in git history and is an ancestor of HEAD`);
  } catch (err) {
    assert.fail(`EVIDENCE_COMMIT "${evidenceCommitField}" cannot be resolved in Git history: ${err.message}`);
  }
} else {
  console.log(`[INFO] Check 3: EVIDENCE_COMMIT is "pending" (in progress)`);
}

// CHECK 4: ACCEPTANCE_COMMIT — if not "pending", must resolve in git history
if (acceptanceCommitField !== 'pending') {
  try {
    const resolvedAcceptance = execSync(`git rev-parse "${acceptanceCommitField}"`, { encoding: 'utf8' }).trim();
    execSync(`git cat-file -e "${resolvedAcceptance}^{commit}"`, { stdio: 'pipe' });
    console.log(`[PASS] Check 4: ACCEPTANCE_COMMIT (${acceptanceCommitField}) resolves to ${resolvedAcceptance} in git history`);
  } catch (err) {
    assert.fail(`ACCEPTANCE_COMMIT "${acceptanceCommitField}" cannot be resolved in Git history: ${err.message}`);
  }
} else {
  console.log(`[INFO] Check 4: ACCEPTANCE_COMMIT is "pending" (acceptable before final acceptance)`);
}

console.log('\n===============================================================');
console.log('   COMMIT FRESHNESS & LINEAGE VALIDATOR PASSED!   ');
console.log('===============================================================\n');
