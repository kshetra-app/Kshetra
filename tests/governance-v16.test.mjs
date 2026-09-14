import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

console.log('=== RUNNING DEDICATED INDEPENDENT GOVERNANCE REGRESSION SUITE (AMENDMENT v1.6 - REV-3) ===\n');

// =============================================================================
// INDEPENDENT RUNTIME & GIT REPOSITORY STATE DERIVATION
// =============================================================================
const actualHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
const actualOriginMaster = execSync('git rev-parse origin/master', { encoding: 'utf8' }).trim();
const actualBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
const porcelainStatus = execSync('git status --porcelain', { encoding: 'utf8' }).trim();

assert.strictEqual(actualHead.length, 40, 'Actual local HEAD SHA must be 40 characters');
assert.strictEqual(actualOriginMaster.length, 40, 'Actual origin/master SHA must be 40 characters');
assert.strictEqual(actualBranch, 'master', 'Active branch must be master');

console.log(`[REPOSITORY STATE] Branch: ${actualBranch}`);
console.log(`[REPOSITORY STATE] Local HEAD: ${actualHead}`);
console.log(`[REPOSITORY STATE] origin/master: ${actualOriginMaster}\n`);

// =============================================================================
// 1. STRUCTURAL TESTS
// =============================================================================

// [STRUCTURAL] Test S1: Amendment Identity & Provenance
assert.ok(fs.existsSync('AMENDMENT_v1.6.md'), 'AMENDMENT_v1.6.md must exist in repository root');
const v16Text = fs.readFileSync('AMENDMENT_v1.6.md', 'utf8');
assert.ok(v16Text.includes('AGENT EXECUTION PROTOCOL — AMENDMENT v1.6'), 'v1.6 title matches exactly');
assert.ok(v16Text.includes('**Document Identifier:** AMENDMENT_v1.6.md'), 'v1.6 document identifier matches');
assert.ok(v16Text.includes('Status:** IMPLEMENTED / TESTED / VERIFIED / RESUBMITTED FOR CTO RATIFICATION'), 'v1.6 status matches');
console.log('[PASS] [STRUCTURAL] Test S1: Amendment identity, title, and resubmission status verified.');

// [STRUCTURAL] Test S2: Parent Amendment Immutability
const EXPECTED_V15_HASH = '8b3505eee995adebd92ba2139173f0a0ab68cdcd0ed6f19f10cdcab3c7a2bfe2';
const actualV15Hash = crypto.createHash('sha256').update(fs.readFileSync('AMENDMENT_v1.5.md')).digest('hex').toLowerCase();
assert.strictEqual(actualV15Hash, EXPECTED_V15_HASH, 'Parent AMENDMENT_v1.5.md must be byte-for-byte immutable');
const v15Commit = execSync('git log -n 1 --format="%h" 795b9af -- AMENDMENT_v1.5.md', { encoding: 'utf8' }).trim();
assert.ok(v15Commit.startsWith('795b9af'), 'Parent amendment v1.5 must have ratification commit 795b9af');
console.log('[PASS] [STRUCTURAL] Test S2: Parent amendment v1.5 immutability verified (SHA-256: 8b3505eee..., Commit: 795b9af).');

// [STRUCTURAL] Test S3: Rule IV-001 Preservation & CTO-Only Authority
assert.ok(v16Text.includes('Rule IV-001'), 'v1.6 must reference Rule IV-001');
assert.ok(v16Text.includes('The agent or session implementing product code cannot certify final acceptance'), 'Rule IV-001 separation of implementing agent codified');
assert.ok(v16Text.includes('Final technical acceptance is reserved exclusively for the CTO Technical Authority'), 'Rule IV-001 CTO reservation codified');
assert.ok(!v16Text.includes('CTO/User'), 'v1.6 must not contain "CTO/User" slash conflation');
assert.ok(!v16Text.includes('CTO / User'), 'v1.6 must not contain "CTO / User" conflation');
assert.ok(v16Text.includes('Independent technical review conducted exclusively by the CTO Technical Authority'), 'v1.6 Stage 3 must be CTO Technical Authority exclusive');
assert.ok(v16Text.includes('Formal acceptance granted exclusively by the CTO Technical Authority based on independent evidence review under Rule IV-001'), 'v1.6 Stage 8 must be CTO Technical Authority exclusive');
console.log('[PASS] [STRUCTURAL] Test S3: Rule IV-001 preservation and CTO-only technical authority verified.');

// [STRUCTURAL] Test S4: Authoritative Line Count & Byte Metrics Verification (VC-07)
const v16Buffer = fs.readFileSync('AMENDMENT_v1.6.md');
const v16ByteLength = Buffer.byteLength(v16Buffer, 'utf8');
const v16LfCount = (v16Text.match(/\n/g) || []).length;
const v16LinesArray = v16Text.split('\n');
const v16NonEmptyLines = v16LinesArray.filter(l => l.trim().length > 0).length;

assert.strictEqual(v16ByteLength, 33949, 'Authoritative byte count must be exactly 33949 bytes');
assert.strictEqual(v16LfCount, 375, 'Physical newline count must be exactly 375');
assert.strictEqual(v16LinesArray.length, 376, 'Logical line count (split newline) must be exactly 376');
assert.strictEqual(v16NonEmptyLines, 303, 'Non-empty line count must be exactly 303');
console.log(`[PASS] [STRUCTURAL] Test S4: Authoritative file metrics reconciled (376 logical lines, 375 physical newlines, 303 non-empty lines, 33949 bytes).`);

// =============================================================================
// 2. UNIT / MODEL TESTS
// =============================================================================

const LIFECYCLE_STAGES = [
  'DEFINED', 'PLANNED', 'PLAN_REVIEWED', 'AUTHORIZED',
  'IMPLEMENTED', 'TESTED_AND_VERIFIED', 'PRODUCTION_VERIFIED',
  'ACCEPTED', 'COMPLETE'
];

function modelValidateTransition(currentStage, nextStage, isImplementingAgent = false) {
  const currentIdx = LIFECYCLE_STAGES.indexOf(currentStage);
  const nextIdx = LIFECYCLE_STAGES.indexOf(nextStage);
  if (currentIdx === -1 || nextIdx === -1) {
    throw new Error('INVALID_STAGE');
  }
  // Rule IV-001: Implementing agent cannot transition to ACCEPTED or COMPLETE
  if (isImplementingAgent && (nextStage === 'ACCEPTED' || nextStage === 'COMPLETE')) {
    throw new Error('PROHIBITED_TRANSITION: Implementing agent cannot certify ACCEPTED or COMPLETE (Rule IV-001 violation)');
  }
  // Strict sequential forward progression
  if (nextIdx === currentIdx + 1) {
    return true;
  }
  // Permitted backward regression paths (Section 4.4 of Amendment v1.6):
  // 1. PLAN_REVIEWED -> PLANNED (Revisions Required)
  if (currentStage === 'PLAN_REVIEWED' && nextStage === 'PLANNED') return true;
  // 2. AUTHORIZED -> PLANNED (Revocation / Rescope)
  if (currentStage === 'AUTHORIZED' && nextStage === 'PLANNED') return true;
  // 3. IMPLEMENTED -> AUTHORIZED (Defect / Scope Breach)
  if (currentStage === 'IMPLEMENTED' && nextStage === 'AUTHORIZED') return true;
  // 4. TESTED_AND_VERIFIED -> IMPLEMENTED (Verification Failure)
  if (currentStage === 'TESTED_AND_VERIFIED' && nextStage === 'IMPLEMENTED') return true;
  // 5. PRODUCTION_VERIFIED -> IMPLEMENTED (Production Failure)
  if (currentStage === 'PRODUCTION_VERIFIED' && nextStage === 'IMPLEMENTED') return true;
  
  throw new Error(`PROHIBITED_TRANSITION: Cannot transition directly from ${currentStage} to ${nextStage}`);
}

// [UNIT / MODEL] Test M1: Nine-Stage Forward Transitions & Permitted Regressions
assert.strictEqual(modelValidateTransition('DEFINED', 'PLANNED'), true);
assert.strictEqual(modelValidateTransition('PLANNED', 'PLAN_REVIEWED'), true);
assert.strictEqual(modelValidateTransition('PLAN_REVIEWED', 'AUTHORIZED'), true);
assert.strictEqual(modelValidateTransition('AUTHORIZED', 'IMPLEMENTED'), true);
assert.strictEqual(modelValidateTransition('IMPLEMENTED', 'TESTED_AND_VERIFIED'), true);
assert.strictEqual(modelValidateTransition('TESTED_AND_VERIFIED', 'PRODUCTION_VERIFIED'), true);
assert.strictEqual(modelValidateTransition('PRODUCTION_VERIFIED', 'ACCEPTED', false), true);
assert.strictEqual(modelValidateTransition('ACCEPTED', 'COMPLETE', false), true);

assert.strictEqual(modelValidateTransition('PLAN_REVIEWED', 'PLANNED'), true); // Revisions Required
assert.strictEqual(modelValidateTransition('AUTHORIZED', 'PLANNED'), true);    // Revocation / Rescope
assert.strictEqual(modelValidateTransition('IMPLEMENTED', 'AUTHORIZED'), true); // Defect / Breach
assert.strictEqual(modelValidateTransition('TESTED_AND_VERIFIED', 'IMPLEMENTED'), true); // Verification Failure
assert.strictEqual(modelValidateTransition('PRODUCTION_VERIFIED', 'IMPLEMENTED'), true); // Production Failure
console.log('[PASS] [UNIT / MODEL] Test M1: Lifecycle model forward progression and all 5 permitted regressions verified.');

// [UNIT / MODEL] Test M2: Fail-Closed Evaluation of Verification Results
function modelEvaluateVerificationResult(resultStatus) {
  if (resultStatus === 'PASS') return 'PASS';
  if (resultStatus === 'UNKNOWN' || resultStatus === 'UNVERIFIED') {
    throw new Error('GOVERNANCE_VIOLATION: UNKNOWN or UNVERIFIED status cannot be treated as PASS');
  }
  if (resultStatus === 'FAIL' || resultStatus === 'DEFECT') {
    throw new Error('VERIFICATION_FAILED: Result is non-passing');
  }
  throw new Error('INVALID_STATUS: Unrecognized status');
}
assert.strictEqual(modelEvaluateVerificationResult('PASS'), 'PASS');
console.log('[PASS] [UNIT / MODEL] Test M2: Verification result evaluator baseline verified.');

// [UNIT / MODEL] Test M3: Pre-Implementation Status Evaluation
function modelEvaluatePreImplementationClaim(hasExecuted, statusClaim) {
  if (!hasExecuted && (statusClaim === 'PASS' || statusClaim === 'ZERO (PASS)' || statusClaim === 'PROVISIONAL PASS')) {
    throw new Error('GOVERNANCE_BREACH: Unexecuted test cannot be declared PASS');
  }
  return true;
}
assert.strictEqual(modelEvaluatePreImplementationClaim(true, 'PASS'), true);
assert.strictEqual(modelEvaluatePreImplementationClaim(false, 'NOT AUTHORIZED / UNEXECUTED'), true);
console.log('[PASS] [UNIT / MODEL] Test M3: Pre-implementation claim evaluator baseline verified.');

// =============================================================================
// 3. REPOSITORY INTEGRATION GOVERNANCE TESTS
// =============================================================================

// [REPOSITORY INTEGRATION] Test R1: Actual Repository Scope Integrity against Authorized Base HEAD
const AUTHORIZED_GOVERNANCE_BASE_HEAD = '21ab56ad634a345d3d73e3f79a864d924447b209'; // W008-C Acceptance Closure
const EXPECTED_V16_SCOPE_MANIFEST = [
  'AMENDMENT_v1.6.md',
  'tests/governance-consistency.test.mjs',
  'tests/governance-v16.test.mjs'
];

// Derive actual changed files from Git
const gitDiffOutput = execSync(`git diff --name-only ${AUTHORIZED_GOVERNANCE_BASE_HEAD}..HEAD`, { encoding: 'utf8' }).trim();
const actualChangedFiles = gitDiffOutput ? gitDiffOutput.split(/\r?\n/).map(f => f.trim()).filter(Boolean) : [];

console.log('[ACTUAL GIT CHANGED FILES FROM BASE]:', actualChangedFiles);

// Assert all changed files are in the authorized v1.6 governance manifest
for (const file of actualChangedFiles) {
  assert.ok(
    EXPECTED_V16_SCOPE_MANIFEST.includes(file),
    `SCOPE LEAKAGE: File '${file}' was modified but is not in the authorized v1.6 manifest!`
  );
}

// Assert no product files were modified
const productPrefixes = ['apps/api/src/routes/', 'apps/mobile/', 'packages/', 'supabase/migrations/'];
for (const file of actualChangedFiles) {
  for (const prefix of productPrefixes) {
    assert.ok(!file.startsWith(prefix), `CRITICAL SCOPE BREACH: Product file '${file}' modified in governance job!`);
  }
}
console.log('[PASS] [REPOSITORY INTEGRATION] Test R1: Actual Git changed-file manifest derived and verified strictly within authorized v1.6 governance scope.');

// [REPOSITORY INTEGRATION] Test R2: Real-State Control M Authorization & Freeze Verification
const stateRaw = fs.readFileSync('EXECUTION_STATE.md', 'utf8');

// Structured parsing of EXECUTION_STATE.md fields
function parseExecutionStateField(fieldKey) {
  const match = stateRaw.match(new RegExp(`^${fieldKey}:\\s*(.+)`, 'm'));
  return match ? match[1].trim() : null;
}

const realCurrentJob = parseExecutionStateField('CURRENT_JOB');
const realPlanStatus = parseExecutionStateField('PLAN_STATUS');
const realImplAuth = parseExecutionStateField('IMPLEMENTATION_AUTHORIZATION');
const realAuthJob = parseExecutionStateField('AUTHORIZED_JOB');
const realAuthScopeHash = parseExecutionStateField('AUTHORIZED_SCOPE_HASH');
const realAuthCommit = parseExecutionStateField('IMPLEMENTATION_AUTHORIZATION_COMMIT');

console.log(`[REAL-STATE CONTROL M] Current Job: ${realCurrentJob}`);
console.log(`[REAL-STATE CONTROL M] Plan Status: ${realPlanStatus}`);
console.log(`[REAL-STATE CONTROL M] Impl Auth: ${realImplAuth}`);
console.log(`[REAL-STATE CONTROL M] Auth Commit: ${realAuthCommit}`);

// Assert that currently, implementation authorization is strictly NO / FROZEN
assert.strictEqual(realImplAuth, 'NO', 'Real-state IMPLEMENTATION_AUTHORIZATION must be NO in active frozen state');
assert.strictEqual(realAuthJob, 'NONE', 'Real-state AUTHORIZED_JOB must be NONE in active frozen state');
assert.strictEqual(realAuthScopeHash, 'NONE', 'Real-state AUTHORIZED_SCOPE_HASH must be NONE in active frozen state');
assert.strictEqual(realAuthCommit, 'NONE', 'Real-state IMPLEMENTATION_AUTHORIZATION_COMMIT must be NONE in active frozen state');

// Historical W008-C authorization verification directly from Git history and DECISION_LOG.md
const w008cAuthCommit = parseExecutionStateField('W008_C_IMPLEMENTATION_AUTHORIZATION_COMMIT');
assert.strictEqual(w008cAuthCommit.startsWith('e6d4c64'), true, 'W008-C auth commit must start with e6d4c64');

// Verify that W008-C auth commit resolves in actual Git history
const resolvedW008cAuthCommit = execSync('git rev-parse e6d4c64', { encoding: 'utf8' }).trim();
assert.strictEqual(resolvedW008cAuthCommit, 'e6d4c64ff1210e34d417449802b39b03122115a1', 'W008-C auth commit must resolve to full commit object');

// Verify ancestry: W008-C auth commit must be an ancestor of current HEAD
const isAuthAncestor = execSync(`git merge-base --is-ancestor ${resolvedW008cAuthCommit} HEAD && echo YES`, { encoding: 'utf8' }).trim();
assert.strictEqual(isAuthAncestor, 'YES', 'W008-C auth commit must be an ancestor of current HEAD');

// Inspect actual DECISION_LOG.md at the actual repository state
const decisionLogContent = fs.readFileSync('DECISION_LOG.md', 'utf8');
assert.ok(decisionLogContent.includes('### DEC-048: W008-C FORMAL CTO IMPLEMENTATION AUTHORIZATION'), 'DECISION_LOG.md must record DEC-048');
assert.ok(decisionLogContent.includes('- **Authority:** CTO Decision / Formal Implementation Authorization Mandate (Rule IV-001)'), 'DEC-048 must cite CTO Decision Authority');
assert.ok(decisionLogContent.includes('36de3d19127019ae00d7900e7d515e74e5892e18adcd991b606338fe5be04b49'), 'DEC-048 must record exact canonical scope hash');
assert.ok(decisionLogContent.includes('70b18f55dc9864070688a0949aaf60c79a9c0657'), 'DEC-048 must record exact authorized base HEAD');

console.log('[PASS] [REPOSITORY INTEGRATION] Test R2: Real-state Control M freeze verified, and historical W008-C CTO authorization commit and DEC-048 verified from actual repository state.');

// [REPOSITORY INTEGRATION] Test R3: Structured Register State Parsing & Sub-Job Freeze Verification
const acceptanceRegisterRaw = fs.readFileSync('ACCEPTANCE_REGISTER.md', 'utf8');

function parseAcceptanceRegisterRow(jobId) {
  const line = acceptanceRegisterRaw.split('\n').find(l => l.includes('| **' + jobId + '**') || l.includes('| **' + jobId + ' '));
  if (!line) return null;
  const cols = line.split('|').map(c => c.trim()).filter(Boolean);
  return {
    jobId: cols[0].replace(/\*\*/g, ''),
    title: cols[1],
    owner: cols[2],
    status: cols[3],
    commitSha: cols[4]
  };
}

const w008Row = parseAcceptanceRegisterRow('W008');
const w009Row = parseAcceptanceRegisterRow('W009');
const w010Row = parseAcceptanceRegisterRow('W010');

assert.ok(w008Row, 'W008 row must exist in ACCEPTANCE_REGISTER.md');
assert.ok(w008Row.status.includes('IN PROGRESS (W008-C ACCEPTED / COMPLETE)'), 'W008 status must reflect W008-C accepted and closed');
assert.ok(w009Row, 'W009 row must exist in ACCEPTANCE_REGISTER.md');
assert.strictEqual(w009Row.status, 'NOT AUTHORIZED', 'W009 must be NOT AUTHORIZED in ACCEPTANCE_REGISTER.md');
assert.ok(w010Row, 'W010 row must exist in ACCEPTANCE_REGISTER.md');
assert.strictEqual(w010Row.status, 'NOT_STARTED', 'W010 must be NOT_STARTED in ACCEPTANCE_REGISTER.md');

// Structured parsing of NEXT_PERMITTED_JOB in EXECUTION_STATE.md
const nextPermittedJob = parseExecutionStateField('NEXT_PERMITTED_JOB');
assert.ok(nextPermittedJob.includes('NONE'), 'NEXT_PERMITTED_JOB must be NONE');
assert.ok(nextPermittedJob.includes('W008-D, W008-E, and W009 strictly NOT AUTHORIZED / FROZEN'), 'W008-D, W008-E, W009 strictly frozen');

console.log('[PASS] [REPOSITORY INTEGRATION] Test R3: Structured register state parsing proves W008-C ACCEPTED, W008-D/E/W009 strictly NOT AUTHORIZED / FROZEN.');

// =============================================================================
// 4. NEGATIVE / ADVERSARIAL MUTATION TESTS
// =============================================================================

// [NEGATIVE / ADVERSARIAL] Test N1: Prohibited Lifecycle Transitions
// Assert that invalid skips are rejected
assert.throws(() => modelValidateTransition('DEFINED', 'IMPLEMENTED'), /PROHIBITED_TRANSITION/);
assert.throws(() => modelValidateTransition('PLANNED', 'IMPLEMENTED'), /PROHIBITED_TRANSITION/);
assert.throws(() => modelValidateTransition('AUTHORIZED', 'ACCEPTED'), /PROHIBITED_TRANSITION/);
assert.throws(() => modelValidateTransition('IMPLEMENTED', 'ACCEPTED'), /PROHIBITED_TRANSITION/);
assert.throws(() => modelValidateTransition('TESTED_AND_VERIFIED', 'COMPLETE'), /PROHIBITED_TRANSITION/);

// Assert that PLANNED -> DEFINED is rejected as prohibited uncontrolled rollback
assert.throws(() => modelValidateTransition('PLANNED', 'DEFINED'), /PROHIBITED_TRANSITION/);

// Assert that implementing agent attempting self-acceptance is rejected
assert.throws(() => modelValidateTransition('PRODUCTION_VERIFIED', 'ACCEPTED', true), /Rule IV-001/);
assert.throws(() => modelValidateTransition('ACCEPTED', 'COMPLETE', true), /Rule IV-001/);
console.log('[PASS] [NEGATIVE / ADVERSARIAL] Test N1: Prohibited lifecycle transitions (skips, PLANNED->DEFINED, and implementing self-acceptance) rejected fail-closed.');

// [NEGATIVE / ADVERSARIAL] Test N2: UNKNOWN and UNVERIFIED Rejected from Passing
assert.throws(() => modelEvaluateVerificationResult('UNKNOWN'), /UNKNOWN or UNVERIFIED status cannot be treated as PASS/);
assert.throws(() => modelEvaluateVerificationResult('UNVERIFIED'), /UNKNOWN or UNVERIFIED status cannot be treated as PASS/);
assert.throws(() => modelEvaluateVerificationResult('FAIL'), /VERIFICATION_FAILED/);
console.log('[PASS] [NEGATIVE / ADVERSARIAL] Test N2: UNKNOWN, UNVERIFIED, and FAIL statuses strictly rejected.');

// [NEGATIVE / ADVERSARIAL] Test N3: Pre-Implementation PASS Claims Rejected
assert.throws(() => modelEvaluatePreImplementationClaim(false, 'PASS'), /GOVERNANCE_BREACH/);
assert.throws(() => modelEvaluatePreImplementationClaim(false, 'ZERO (PASS)'), /GOVERNANCE_BREACH/);
assert.throws(() => modelEvaluatePreImplementationClaim(false, 'PROVISIONAL PASS'), /GOVERNANCE_BREACH/);
console.log('[PASS] [NEGATIVE / ADVERSARIAL] Test N3: Pre-implementation PASS, ZERO (PASS), and PROVISIONAL PASS claims strictly rejected.');

// [NEGATIVE / ADVERSARIAL] Test N4: Scope Leakage Adversarial Rejection
function testScopeCompliance(modifiedFiles, authorizedManifest) {
  const leaks = modifiedFiles.filter(file => !authorizedManifest.includes(file));
  if (leaks.length > 0) {
    throw new Error(`SCOPE_LEAKAGE_DETECTED: Unauthorized modifications outside scope manifest: ${leaks.join(', ')}`);
  }
  return true;
}

assert.throws(
  () => testScopeCompliance(['AMENDMENT_v1.6.md', 'apps/api/src/server.ts'], EXPECTED_V16_SCOPE_MANIFEST),
  /SCOPE_LEAKAGE_DETECTED.*apps\/api\/src\/server\.ts/
);
assert.throws(
  () => testScopeCompliance(['AMENDMENT_v1.6.md', 'apps/mobile/App.tsx'], EXPECTED_V16_SCOPE_MANIFEST),
  /SCOPE_LEAKAGE_DETECTED.*apps\/mobile\/App\.tsx/
);
assert.throws(
  () => testScopeCompliance(['AMENDMENT_v1.6.md', 'apps/api/src/routes/civic.ts'], EXPECTED_V16_SCOPE_MANIFEST),
  /SCOPE_LEAKAGE_DETECTED.*apps\/api\/src\/routes\/civic\.ts/
);
assert.throws(
  () => testScopeCompliance(['AMENDMENT_v1.6.md', 'supabase/migrations/999_test.sql'], EXPECTED_V16_SCOPE_MANIFEST),
  /SCOPE_LEAKAGE_DETECTED.*supabase\/migrations\/999_test\.sql/
);
console.log('[PASS] [NEGATIVE / ADVERSARIAL] Test N4: Scope leakage mutations across server, mobile, routes, and migrations strictly rejected.');

// =============================================================================
// 5. EVIDENCE / PROVENANCE & REAL TAMPERING TESTS
// =============================================================================

function independentlyVerifyEvidencePackage(evidence, rawOutput, expectedGitHead, expectedOriginHead) {
  // 1. Remote synchronization verification
  if (expectedGitHead !== expectedOriginHead) {
    throw new Error(`EVIDENCE_REJECTED: Local HEAD (${expectedGitHead}) does not match origin/master (${expectedOriginHead})`);
  }

  // 2. Commit existence and match
  if (!evidence.gitCommitSha || evidence.gitCommitSha !== expectedGitHead) {
    throw new Error(`EVIDENCE_REJECTED: gitCommitSha mismatch. Expected ${expectedGitHead}, got ${evidence.gitCommitSha}`);
  }

  // Verify commit exists in git
  try {
    const resolved = execSync(`git cat-file -e "${evidence.gitCommitSha}^{commit}"`, { encoding: 'utf8' });
  } catch (err) {
    throw new Error(`EVIDENCE_REJECTED: gitCommitSha '${evidence.gitCommitSha}' does not exist in Git repository`);
  }

  // 3. Raw output checksum match
  const expectedChecksum = crypto.createHash('sha256').update(rawOutput).digest('hex');
  if (!evidence.rawOutputChecksum || evidence.rawOutputChecksum !== expectedChecksum) {
    throw new Error(`EVIDENCE_REJECTED: rawOutputChecksum mismatch. Expected ${expectedChecksum}, got ${evidence.rawOutputChecksum}`);
  }

  // 4. Environment block integrity
  if (!evidence.environment || typeof evidence.environment !== 'object') {
    throw new Error('EVIDENCE_REJECTED: Missing environment identity block');
  }

  const { host, runtime, databaseTarget } = evidence.environment;
  if (!host || host.trim().length === 0) {
    throw new Error('EVIDENCE_REJECTED: Incomplete environment identity (host required)');
  }
  if (!runtime || runtime.trim().length === 0) {
    throw new Error('EVIDENCE_REJECTED: Incomplete environment identity (runtime required)');
  }
  if (!databaseTarget || databaseTarget.trim().length === 0) {
    throw new Error('EVIDENCE_REJECTED: Incomplete environment identity (databaseTarget required)');
  }

  // 5. Valid timestamp
  if (!evidence.timestamp || isNaN(Date.parse(evidence.timestamp))) {
    throw new Error('EVIDENCE_REJECTED: Malformed or missing timestamp');
  }

  // 6. Job identifier binding
  if (!evidence.jobId || evidence.jobId !== 'W008-GOV-v1.6') {
    throw new Error(`EVIDENCE_REJECTED: Job ID mismatch. Expected W008-GOV-v1.6, got ${evidence.jobId}`);
  }

  // 7. Canonical scope hash binding
  if (!evidence.scopeHash || evidence.scopeHash.length !== 64) {
    throw new Error('EVIDENCE_REJECTED: Invalid or missing canonical scopeHash in evidence package');
  }

  return true;
}

const sampleRawStdout = 'RUNNING SUITE... 10/10 CHECKS PASSED. VERIFIED.';
const validRawChecksum = crypto.createHash('sha256').update(sampleRawStdout).digest('hex');

const validEvidencePackage = {
  jobId: 'W008-GOV-v1.6',
  gitCommitSha: actualHead,
  scopeHash: 'b9d3d4d622d6e1f3a6ec1538dc02452c8daebb78ef41293545fc85049a30163f',
  timestamp: new Date().toISOString(),
  rawOutputChecksum: validRawChecksum,
  environment: {
    host: 'Laven-PC',
    runtime: 'node-24.13.0-win32',
    databaseTarget: 'fkpigozcqnmcvofuksar'
  }
};

// [EVIDENCE / PROVENANCE] Positive test against independently derived HEAD
assert.strictEqual(
  independentlyVerifyEvidencePackage(validEvidencePackage, sampleRawStdout, actualHead, actualOriginMaster),
  true
);
console.log('[PASS] [EVIDENCE / PROVENANCE] Positive evidence package verification against live Git HEAD passed.');

// [EVIDENCE / PROVENANCE] Real Tampering Negative Tests (A through J):

// Tampering A: Current HEAD changed after evidence generation / out-of-sync remote
assert.throws(
  () => independentlyVerifyEvidencePackage(validEvidencePackage, sampleRawStdout, actualHead, '1111111111111111111111111111111111111111'),
  /Local HEAD.*does not match origin\/master/
);

// Tampering B: Evidence claims an older unrelated commit
assert.throws(
  () => independentlyVerifyEvidencePackage({ ...validEvidencePackage, gitCommitSha: '21ab56ad634a345d3d73e3f79a864d924447b209' }, sampleRawStdout, actualHead, actualOriginMaster),
  /gitCommitSha mismatch/
);

// Tampering C: Evidence claims a nonexistent commit
assert.throws(
  () => independentlyVerifyEvidencePackage({ ...validEvidencePackage, gitCommitSha: '0000000000000000000000000000000000000000' }, sampleRawStdout, '0000000000000000000000000000000000000000', '0000000000000000000000000000000000000000'),
  /does not exist in Git repository/
);

// Tampering D: Raw output changed after checksum generation
assert.throws(
  () => independentlyVerifyEvidencePackage(validEvidencePackage, sampleRawStdout + ' [TAMPERED]', actualHead, actualOriginMaster),
  /rawOutputChecksum mismatch/
);

// Tampering E: Checksum corrupted
assert.throws(
  () => independentlyVerifyEvidencePackage({ ...validEvidencePackage, rawOutputChecksum: 'corrupted_checksum' }, sampleRawStdout, actualHead, actualOriginMaster),
  /rawOutputChecksum mismatch/
);

// Tampering F: Missing environment block
assert.throws(
  () => independentlyVerifyEvidencePackage({ ...validEvidencePackage, environment: null }, sampleRawStdout, actualHead, actualOriginMaster),
  /Missing environment identity block/
);

// Tampering G: Missing host identity
assert.throws(
  () => independentlyVerifyEvidencePackage({ ...validEvidencePackage, environment: { ...validEvidencePackage.environment, host: '' } }, sampleRawStdout, actualHead, actualOriginMaster),
  /Incomplete environment identity \(host required\)/
);

// Tampering H: Missing database target
assert.throws(
  () => independentlyVerifyEvidencePackage({ ...validEvidencePackage, environment: { ...validEvidencePackage.environment, databaseTarget: '' } }, sampleRawStdout, actualHead, actualOriginMaster),
  /Incomplete environment identity \(databaseTarget required\)/
);

// Tampering I: Malformed timestamp
assert.throws(
  () => independentlyVerifyEvidencePackage({ ...validEvidencePackage, timestamp: 'invalid-date' }, sampleRawStdout, actualHead, actualOriginMaster),
  /Malformed or missing timestamp/
);

// Tampering J: Evidence references a different job
assert.throws(
  () => independentlyVerifyEvidencePackage({ ...validEvidencePackage, jobId: 'W008-C' }, sampleRawStdout, actualHead, actualOriginMaster),
  /Job ID mismatch/
);

// Tampering K: Evidence references invalid scope hash
assert.throws(
  () => independentlyVerifyEvidencePackage({ ...validEvidencePackage, scopeHash: 'invalid' }, sampleRawStdout, actualHead, actualOriginMaster),
  /Invalid or missing canonical scopeHash/
);

console.log('[PASS] [EVIDENCE / PROVENANCE] All 11 real evidence tampering negative mutations (A through K) strictly rejected fail-closed.');

console.log('\n========================================================================================');
console.log('   ALL DEDICATED v1.6 INDEPENDENT GOVERNANCE TESTS PASSED (100% EMPIRICALLY VERIFIED)!  ');
console.log('========================================================================================\n');
