import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('=== RUNNING COMMIT FRESHNESS, PROVENANCE & LINEAGE VALIDATOR (Amendment v1.5-A) ===\n');

const executionStatePath = path.resolve('EXECUTION_STATE.md');
assert.ok(fs.existsSync(executionStatePath), 'EXECUTION_STATE.md must exist');

const content = fs.readFileSync(executionStatePath, 'utf8');

function extractField(fieldName) {
  const regex = new RegExp(`^${fieldName}:\\s*(.+)`, 'm');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

// Current Provenance Coordinates
const currentJob = extractField('CURRENT_JOB');
const currentRemoteHeadField = extractField('CURRENT_REMOTE_HEAD');
const verifiedRemoteHeadField = extractField('VERIFIED_REMOTE_HEAD');
const acceptedW007CommitField = extractField('ACCEPTED_W007_IMPLEMENTATION_COMMIT');
const governanceCommitField = extractField('GOVERNANCE_COMMIT');
const evidenceCommitField = extractField('EVIDENCE_COMMIT');

// Historical Coordinates (W006)
const histW006VerifiedRemote = extractField('HISTORICAL_W006_VERIFIED_REMOTE_HEAD');
const histW006AuditedCode = extractField('HISTORICAL_W006_AUDITED_CODE_COMMIT');
const histW006Evidence = extractField('HISTORICAL_W006_EVIDENCE_COMMIT');
const histW006Acceptance = extractField('HISTORICAL_W006_ACCEPTANCE_COMMIT');

console.log('Current Coordinates:');
console.log('  CURRENT_JOB:                         ', currentJob);
console.log('  CURRENT_REMOTE_HEAD:                 ', currentRemoteHeadField);
console.log('  VERIFIED_REMOTE_HEAD:                ', verifiedRemoteHeadField);
console.log('  ACCEPTED_W007_IMPLEMENTATION_COMMIT: ', acceptedW007CommitField);
console.log('  GOVERNANCE_COMMIT:                    ', governanceCommitField);
console.log('  EVIDENCE_COMMIT:                      ', evidenceCommitField);

console.log('\nHistorical Lineage Coordinates (W006):');
console.log('  HISTORICAL_W006_VERIFIED_REMOTE_HEAD: ', histW006VerifiedRemote);
console.log('  HISTORICAL_W006_AUDITED_CODE_COMMIT:  ', histW006AuditedCode);
console.log('  HISTORICAL_W006_EVIDENCE_COMMIT:      ', histW006Evidence);
console.log('  HISTORICAL_W006_ACCEPTANCE_COMMIT:    ', histW006Acceptance);

// Git Reality
const localHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
let originMasterHead = '';
try {
  originMasterHead = execSync('git rev-parse origin/master', { encoding: 'utf8' }).trim();
} catch (err) {
  assert.fail(`origin/master could not be resolved: ${err.message}`);
}

console.log('\nGit Reality:');
console.log('  Local HEAD:         ', localHead);
console.log('  origin/master HEAD: ', originMasterHead);

// --- CURRENT PROVENANCE VALIDITY ---

// Check A: CURRENT_REMOTE_HEAD exists and resolves
assert.ok(currentRemoteHeadField, 'Check A: CURRENT_REMOTE_HEAD must be defined in EXECUTION_STATE.md');
let resolvedCurrentRemote = '';
try {
  resolvedCurrentRemote = execSync(`git rev-parse "${currentRemoteHeadField}"`, { encoding: 'utf8' }).trim();
  assert.strictEqual(resolvedCurrentRemote.length, 40, 'Resolved CURRENT_REMOTE_HEAD must be 40-character SHA');
  console.log(`[PASS] Check A: CURRENT_REMOTE_HEAD (${currentRemoteHeadField}) resolves to ${resolvedCurrentRemote}`);
} catch (err) {
  assert.fail(`Check A FAILED: CURRENT_REMOTE_HEAD "${currentRemoteHeadField}" could not be resolved: ${err.message}`);
}

// Check B: VERIFIED_REMOTE_HEAD exists and resolves
assert.ok(verifiedRemoteHeadField, 'Check B: VERIFIED_REMOTE_HEAD must be defined in EXECUTION_STATE.md');
let resolvedVerifiedRemote = '';
try {
  resolvedVerifiedRemote = execSync(`git rev-parse "${verifiedRemoteHeadField}"`, { encoding: 'utf8' }).trim();
  assert.strictEqual(resolvedVerifiedRemote.length, 40, 'Resolved VERIFIED_REMOTE_HEAD must be 40-character SHA');
  console.log(`[PASS] Check B: VERIFIED_REMOTE_HEAD (${verifiedRemoteHeadField}) resolves to ${resolvedVerifiedRemote}`);
} catch (err) {
  assert.fail(`Check B FAILED: VERIFIED_REMOTE_HEAD "${verifiedRemoteHeadField}" could not be resolved: ${err.message}`);
}

// Check C: CURRENT_REMOTE_HEAD == VERIFIED_REMOTE_HEAD for synchronized governance state
assert.strictEqual(
  resolvedCurrentRemote,
  resolvedVerifiedRemote,
  `Check C FAILED: CURRENT_REMOTE_HEAD (${resolvedCurrentRemote}) must match VERIFIED_REMOTE_HEAD (${resolvedVerifiedRemote}) in a synchronized state`
);
console.log(`[PASS] Check C: CURRENT_REMOTE_HEAD matches VERIFIED_REMOTE_HEAD (${resolvedCurrentRemote})`);

// Check D: VERIFIED_REMOTE_HEAD == actual origin/master HEAD
assert.strictEqual(
  resolvedVerifiedRemote,
  originMasterHead,
  `Check D FAILED: VERIFIED_REMOTE_HEAD (${resolvedVerifiedRemote}) must match origin/master (${originMasterHead})`
);
console.log(`[PASS] Check D: VERIFIED_REMOTE_HEAD matches origin/master (${originMasterHead})`);

// Check E: ACCEPTED_W007_IMPLEMENTATION_COMMIT exists, resolves, and is ancestor of VERIFIED_REMOTE_HEAD
const EXPECTED_W007_IMPL = '1d253cd454effb441e7f01e846a568eeddc7f57e';
assert.ok(acceptedW007CommitField, 'Check E: ACCEPTED_W007_IMPLEMENTATION_COMMIT must be defined in EXECUTION_STATE.md');
let resolvedAcceptedW007 = '';
try {
  resolvedAcceptedW007 = execSync(`git rev-parse "${acceptedW007CommitField}"`, { encoding: 'utf8' }).trim();
  assert.strictEqual(resolvedAcceptedW007, EXPECTED_W007_IMPL, `Check E: ACCEPTED_W007_IMPLEMENTATION_COMMIT must resolve to ${EXPECTED_W007_IMPL}`);
  execSync(`git merge-base --is-ancestor "${resolvedAcceptedW007}" "${resolvedVerifiedRemote}"`, { stdio: 'pipe' });
  console.log(`[PASS] Check E: ACCEPTED_W007_IMPLEMENTATION_COMMIT (${resolvedAcceptedW007}) is a verified ancestor of VERIFIED_REMOTE_HEAD`);
} catch (err) {
  assert.fail(`Check E FAILED: ACCEPTED_W007_IMPLEMENTATION_COMMIT error: ${err.message}`);
}

// Check F: GOVERNANCE_COMMIT exists and is an ancestor of (or equal to) VERIFIED_REMOTE_HEAD
assert.ok(governanceCommitField, 'Check F: GOVERNANCE_COMMIT must be defined in EXECUTION_STATE.md');
try {
  const resolvedGovernance = execSync(`git rev-parse "${governanceCommitField}"`, { encoding: 'utf8' }).trim();
  execSync(`git merge-base --is-ancestor "${resolvedGovernance}" "${resolvedVerifiedRemote}"`, { stdio: 'pipe' });
  console.log(`[PASS] Check F: GOVERNANCE_COMMIT (${resolvedGovernance}) is an ancestor of (or equal to) VERIFIED_REMOTE_HEAD`);
} catch (err) {
  assert.fail(`Check F FAILED: GOVERNANCE_COMMIT "${governanceCommitField}" error: ${err.message}`);
}

// Check G: Current W007 acceptance in ACCEPTANCE_REGISTER.md references accepted W007 commit
assert.ok(fs.existsSync('ACCEPTANCE_REGISTER.md'), 'ACCEPTANCE_REGISTER.md must exist');
const acceptanceRegisterContent = fs.readFileSync('ACCEPTANCE_REGISTER.md', 'utf8');
assert.ok(
  acceptanceRegisterContent.includes(EXPECTED_W007_IMPL) || acceptanceRegisterContent.includes(EXPECTED_W007_IMPL.substring(0, 7)),
  `Check G FAILED: ACCEPTANCE_REGISTER.md must reference accepted W007 implementation commit ${EXPECTED_W007_IMPL}`
);
assert.ok(
  acceptanceRegisterContent.includes('ACCEPTED / CLOSED'),
  'Check G: ACCEPTANCE_REGISTER.md must record W007 as ACCEPTED / CLOSED'
);
console.log(`[PASS] Check G: ACCEPTANCE_REGISTER.md references accepted W007 implementation commit ${EXPECTED_W007_IMPL} and status ACCEPTED / CLOSED`);

// Check H: Current execution-state coordinates are NOT stale historical coordinates
assert.notStrictEqual(
  resolvedVerifiedRemote,
  'c1fe56a4225026a27e025da2e1eeea80bece8b8f',
  'Check H FAILED: VERIFIED_REMOTE_HEAD must not be stale historical W006 coordinate c1fe56a'
);
assert.ok(
  !resolvedVerifiedRemote.startsWith('c1fe56a'),
  'Check H FAILED: VERIFIED_REMOTE_HEAD starts with stale c1fe56a'
);
assert.strictEqual(
  extractField('AUDITED_CODE_COMMIT'),
  null,
  'Check H FAILED: Top-level AUDITED_CODE_COMMIT must not exist in W008 planning state; historical code must use HISTORICAL_W006_AUDITED_CODE_COMMIT'
);
assert.strictEqual(
  extractField('ACCEPTANCE_COMMIT'),
  null,
  'Check H FAILED: Top-level ACCEPTANCE_COMMIT must not exist in W008 planning state; historical acceptance must use HISTORICAL_W006_ACCEPTANCE_COMMIT'
);
console.log('[PASS] Check H: Current coordinates are not stale historical coordinates.');

// Check I: Historical coordinates exist, resolve, and maintain valid lineage (LINEAGE VALIDITY)
assert.strictEqual(histW006VerifiedRemote, 'c1fe56a', 'Check I: HISTORICAL_W006_VERIFIED_REMOTE_HEAD must be c1fe56a');
assert.strictEqual(histW006AuditedCode, '35ba912', 'Check I: HISTORICAL_W006_AUDITED_CODE_COMMIT must be 35ba912');
assert.strictEqual(histW006Evidence, 'db30619', 'Check I: HISTORICAL_W006_EVIDENCE_COMMIT must be db30619');
assert.strictEqual(histW006Acceptance, 'f5b8a09', 'Check I: HISTORICAL_W006_ACCEPTANCE_COMMIT must be f5b8a09');

const resolvedHistVerified = execSync(`git rev-parse "${histW006VerifiedRemote}"`, { encoding: 'utf8' }).trim();
const resolvedHistAudited = execSync(`git rev-parse "${histW006AuditedCode}"`, { encoding: 'utf8' }).trim();
const resolvedHistAcceptance = execSync(`git rev-parse "${histW006Acceptance}"`, { encoding: 'utf8' }).trim();

execSync(`git merge-base --is-ancestor "${resolvedHistAudited}" "${resolvedHistVerified}"`, { stdio: 'pipe' });
execSync(`git merge-base --is-ancestor "${resolvedHistVerified}" "${resolvedHistAcceptance}"`, { stdio: 'pipe' });
execSync(`git merge-base --is-ancestor "${resolvedHistAcceptance}" "${resolvedVerifiedRemote}"`, { stdio: 'pipe' });
console.log('[PASS] Check I: Historical W006 coordinates preserved, resolve, and maintain valid ancestry lineage.');

// Check J: W008 Implementation Guard
if (currentJob && currentJob.includes('W008') && currentJob.includes('PLANNING')) {
  // Confirm no W008 implementation commits exist
  const w008Commits = execSync('git log --grep="feat(w008)" --grep="fix(w008)" --grep="w008 implementation" -n 5 --oneline', { encoding: 'utf8' }).trim();
  assert.strictEqual(w008Commits, '', `Check J FAILED: Found unauthorized W008 implementation commits:\n${w008Commits}`);

  // Confirm no unauthorized implementation files are modified
  const changedFiles = execSync('git diff --name-only HEAD', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  const unauthorizedFiles = changedFiles.filter(f =>
    f.startsWith('apps/mobile/') ||
    f.startsWith('apps/api/') ||
    f.startsWith('supabase/migrations/')
  );
  assert.strictEqual(
    unauthorizedFiles.length,
    0,
    `Check J FAILED: Unauthorized product implementation changes detected in working tree: ${unauthorizedFiles.join(', ')}`
  );
  console.log('[PASS] Check J: W008 planning status confirmed with 0 implementation commits and 0 unauthorized implementation changes.');
}

console.log('\n========================================================================');
console.log('   ALL COMMIT FRESHNESS, PROVENANCE & LINEAGE CHECKS (A-J) PASSED!     ');
console.log('========================================================================\n');
