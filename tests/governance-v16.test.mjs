import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

console.log('=== RUNNING DEDICATED INDEPENDENT GOVERNANCE REGRESSION SUITE (AMENDMENT v1.6 - REV-5) ===\n');

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
// AUTHORITATIVE SCOPE MANIFEST & DETERMINISTIC HASH DERIVATION (CTO REV-5 REQ 3)
// =============================================================================
export const AUTHORITATIVE_V16_SCOPE_MANIFEST = Object.freeze([
  'AMENDMENT_v1.6.md',
  'tests/governance-consistency.test.mjs',
  'tests/governance-v16.test.mjs'
]);

export function deriveCanonicalScopeHash(manifest) {
  // 1. Normalize paths
  const normalized = manifest.map(f => f.replace(/\\/g, '/')).sort();
  // 2. Deterministic serialization: <file>:<sha256>\n
  const lines = normalized.map(filePath => {
    const fileBytes = fs.readFileSync(filePath);
    const fileSha256 = crypto.createHash('sha256').update(fileBytes).digest('hex').toLowerCase();
    return `${filePath}:${fileSha256}`;
  });
  const serialized = lines.join('\n');
  // 3. SHA-256 of serialized representation
  const scopeHash = crypto.createHash('sha256').update(serialized).digest('hex').toLowerCase();
  return {
    normalizedManifest: normalized,
    serialized,
    scopeHash
  };
}

// Derive live canonical scope hash directly from live repository files
const liveDerivation = deriveCanonicalScopeHash(AUTHORITATIVE_V16_SCOPE_MANIFEST);
const ACTUAL_CANONICAL_SCOPE_HASH = liveDerivation.scopeHash;

console.log('[AUTHORITATIVE V1.6 SCOPE MANIFEST]:', liveDerivation.normalizedManifest);
console.log('[LIVE CANONICAL SCOPE HASH]:', ACTUAL_CANONICAL_SCOPE_HASH);
console.log('[CANONICAL SERIALIZATION]:\n' + liveDerivation.serialized + '\n');

// Assert format: 64-char lowercase hex
assert.strictEqual(ACTUAL_CANONICAL_SCOPE_HASH.length, 64, 'Canonical scope hash must be 64 characters');
assert.match(ACTUAL_CANONICAL_SCOPE_HASH, /^[0-9a-f]{64}$/, 'Canonical scope hash must be lowercase hexadecimal');

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
// 3. REPOSITORY INTEGRATION GOVERNANCE TESTS (LIVE GIT INTERROGATION)
// =============================================================================

// [REPOSITORY INTEGRATION] Test R1: Scope Chain of Custody & Live Git Derivation
const AUTHORIZED_GOVERNANCE_BASE_HEAD = '21ab56ad634a345d3d73e3f79a864d924447b209'; // W008-C Acceptance Closure

// Derive actual changed files from live Git
const gitDiffOutput = execSync(`git diff --name-only ${AUTHORIZED_GOVERNANCE_BASE_HEAD}..HEAD`, { encoding: 'utf8' }).trim();
const actualChangedFiles = gitDiffOutput ? gitDiffOutput.split(/\r?\n/).map(f => f.trim()).filter(Boolean) : [];

console.log('[ACTUAL GIT CHANGED FILES FROM BASE]:', actualChangedFiles);

// Step 1: Compare actual changed files against authoritative manifest (allowing reports/ evidence artifacts)
for (const file of actualChangedFiles) {
  if (file.startsWith('reports/')) continue; // Governance evidence/report artifacts
  assert.ok(
    AUTHORITATIVE_V16_SCOPE_MANIFEST.includes(file),
    `SCOPE LEAKAGE: File '${file}' was modified but is not in the authoritative v1.6 manifest!`
  );
}

// Step 2: Assert no product files were modified
const productPrefixes = ['apps/api/src/routes/', 'apps/mobile/', 'packages/', 'supabase/migrations/'];
for (const file of actualChangedFiles) {
  for (const prefix of productPrefixes) {
    assert.ok(!file.startsWith(prefix), `CRITICAL SCOPE BREACH: Product file '${file}' modified in governance job!`);
  }
}

// Step 3 & 4: Derive canonical hash from the authorized manifest and verify mathematical equality
const verifiedDerivation = deriveCanonicalScopeHash(AUTHORITATIVE_V16_SCOPE_MANIFEST);
assert.strictEqual(
  verifiedDerivation.scopeHash,
  ACTUAL_CANONICAL_SCOPE_HASH,
  'Derived hash from authorized manifest must strictly match ACTUAL_CANONICAL_SCOPE_HASH'
);

console.log('[PASS] [REPOSITORY INTEGRATION] Test R1: Scope chain of custody verified (Git changed files -> authorized manifest -> derived canonical scope hash).');

// [REPOSITORY INTEGRATION] Test R2: Real-State Control M Active Freeze Verification
const stateRaw = fs.readFileSync('EXECUTION_STATE.md', 'utf8');

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

// Assert that currently, implementation authorization is strictly NO / FROZEN in real repo
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
// 4. NEGATIVE / ADVERSARIAL MUTATION TESTS (STRUCTURAL & WORKFLOW)
// =============================================================================

// [NEGATIVE / ADVERSARIAL] Test N1: Prohibited Lifecycle Transitions
assert.throws(() => modelValidateTransition('DEFINED', 'IMPLEMENTED'), /PROHIBITED_TRANSITION/);
assert.throws(() => modelValidateTransition('PLANNED', 'IMPLEMENTED'), /PROHIBITED_TRANSITION/);
assert.throws(() => modelValidateTransition('AUTHORIZED', 'ACCEPTED'), /PROHIBITED_TRANSITION/);
assert.throws(() => modelValidateTransition('IMPLEMENTED', 'ACCEPTED'), /PROHIBITED_TRANSITION/);
assert.throws(() => modelValidateTransition('TESTED_AND_VERIFIED', 'COMPLETE'), /PROHIBITED_TRANSITION/);
assert.throws(() => modelValidateTransition('PLANNED', 'DEFINED'), /PROHIBITED_TRANSITION/);
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
  () => testScopeCompliance(['AMENDMENT_v1.6.md', 'apps/api/src/server.ts'], AUTHORITATIVE_V16_SCOPE_MANIFEST),
  /SCOPE_LEAKAGE_DETECTED.*apps\/api\/src\/server\.ts/
);
assert.throws(
  () => testScopeCompliance(['AMENDMENT_v1.6.md', 'apps/mobile/App.tsx'], AUTHORITATIVE_V16_SCOPE_MANIFEST),
  /SCOPE_LEAKAGE_DETECTED.*apps\/mobile\/App\.tsx/
);
assert.throws(
  () => testScopeCompliance(['AMENDMENT_v1.6.md', 'apps/api/src/routes/civic.ts'], AUTHORITATIVE_V16_SCOPE_MANIFEST),
  /SCOPE_LEAKAGE_DETECTED.*apps\/api\/src\/routes\/civic\.ts/
);
assert.throws(
  () => testScopeCompliance(['AMENDMENT_v1.6.md', 'supabase/migrations/999_test.sql'], AUTHORITATIVE_V16_SCOPE_MANIFEST),
  /SCOPE_LEAKAGE_DETECTED.*supabase\/migrations\/999_test\.sql/
);
console.log('[PASS] [NEGATIVE / ADVERSARIAL] Test N4: Scope leakage mutations across server, mobile, routes, and migrations strictly rejected.');

// =============================================================================
// 5. EVIDENCE VERIFICATION ENGINE (CTO REV-5 REQ 1 & 2 - 11-STEP CHAIN OF CUSTODY)
// =============================================================================

export function independentlyVerifyEvidencePackage(evidence, rawStdout, rawStderr, expectedGitHead, expectedOriginHead, expectedCanonicalScopeHash) {
  // Step 1: Read persisted stdout and stderr (must be provided and non-empty/valid)
  if (typeof rawStdout !== 'string' || rawStdout.trim().length === 0) {
    throw new Error('EVIDENCE_REJECTED: Persisted raw stdout is missing or empty');
  }
  if (typeof rawStderr !== 'string') {
    throw new Error('EVIDENCE_REJECTED: Persisted raw stderr is missing');
  }

  // Step 2: Synthetic stdout rejection (anti-fabrication assertion - CTO REV-5 REQ 1 & Negative Test A)
  if (rawStdout.includes('RUNNING SUITE... 10/10 CHECKS PASSED. VERIFIED.') || rawStdout.length < 300) {
    throw new Error('EVIDENCE_REJECTED: Synthetic or placeholder stdout detected. Actual execution evidence required.');
  }

  // Step 3: Recompute SHA-256 and compare with recorded checksums (CTO REV-5 REQ 2 Steps 3 & 4)
  const recomputedStdoutSha256 = crypto.createHash('sha256').update(rawStdout).digest('hex').toLowerCase();
  if (!evidence.rawStdoutSha256 || evidence.rawStdoutSha256.toLowerCase() !== recomputedStdoutSha256) {
    throw new Error(`EVIDENCE_REJECTED: rawStdoutSha256 mismatch! Expected ${recomputedStdoutSha256}, recorded ${evidence.rawStdoutSha256}`);
  }

  const recomputedStderrSha256 = crypto.createHash('sha256').update(rawStderr).digest('hex').toLowerCase();
  if (!evidence.rawStderrSha256 || evidence.rawStderrSha256.toLowerCase() !== recomputedStderrSha256) {
    throw new Error(`EVIDENCE_REJECTED: rawStderrSha256 mismatch! Expected ${recomputedStderrSha256}, recorded ${evidence.rawStderrSha256}`);
  }

  // Step 4: Verify recorded Git HEAD against expected Git HEAD (CTO REV-5 REQ 2 Step 5)
  if (!evidence.repositoryHead || evidence.repositoryHead !== expectedGitHead) {
    throw new Error(`EVIDENCE_REJECTED: repositoryHead mismatch! Expected ${expectedGitHead}, got ${evidence.repositoryHead}`);
  }
  if (evidence.gitCommitSha && evidence.gitCommitSha !== expectedGitHead) {
    throw new Error(`EVIDENCE_REJECTED: gitCommitSha mismatch! Expected ${expectedGitHead}, got ${evidence.gitCommitSha}`);
  }

  // Verify commit object exists in Git repository
  try {
    execSync(`git cat-file -e "${evidence.repositoryHead}^{commit}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    throw new Error(`EVIDENCE_REJECTED: repositoryHead '${evidence.repositoryHead}' does not exist in Git repository`);
  }

  // Step 5: Verify recorded origin/master against actual origin/master (CTO REV-5 REQ 2 Step 6)
  if (!evidence.originMasterHead || evidence.originMasterHead !== expectedOriginHead) {
    throw new Error(`EVIDENCE_REJECTED: originMasterHead mismatch! Expected ${expectedOriginHead}, got ${evidence.originMasterHead}`);
  }
  if (expectedGitHead !== expectedOriginHead) {
    throw new Error(`EVIDENCE_REJECTED: Local HEAD (${expectedGitHead}) does not match origin/master (${expectedOriginHead})`);
  }

  // Step 6: Verify repository cleanliness (CTO REV-5 REQ 2 Step 7)
  if (evidence.workingTreeClean !== true) {
    throw new Error('EVIDENCE_REJECTED: Working tree was dirty during execution');
  }

  // Step 7: Verify canonical scope hash against live canonical scope derivation (CTO REV-5 REQ 2 Step 8)
  if (!evidence.canonicalScopeHash) {
    throw new Error('EVIDENCE_REJECTED: Missing canonicalScopeHash in evidence package');
  }
  if (evidence.canonicalScopeHash !== expectedCanonicalScopeHash) {
    throw new Error(`EVIDENCE_REJECTED: Canonical scope hash mismatch! Expected '${expectedCanonicalScopeHash}', got '${evidence.canonicalScopeHash}'`);
  }

  // Step 8: Verify canonical scope manifest
  if (!Array.isArray(evidence.canonicalScopeManifest)) {
    throw new Error('EVIDENCE_REJECTED: Missing canonicalScopeManifest array');
  }
  const manifestMatch = evidence.canonicalScopeManifest.length === AUTHORITATIVE_V16_SCOPE_MANIFEST.length &&
    evidence.canonicalScopeManifest.every((f, i) => f === AUTHORITATIVE_V16_SCOPE_MANIFEST[i]);
  if (!manifestMatch) {
    throw new Error('EVIDENCE_REJECTED: Canonical scope manifest does not match authoritative manifest');
  }

  // Step 9: Verify job identity (CTO REV-5 REQ 2 Step 9)
  if (!evidence.jobId || evidence.jobId !== 'W008-GOV-v1.6') {
    throw new Error(`EVIDENCE_REJECTED: Job ID mismatch! Expected W008-GOV-v1.6, got ${evidence.jobId}`);
  }

  // Step 10: Verify environment identity (CTO REV-5 REQ 2 Step 10)
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

  // Step 11: Valid timestamp and exact command executed
  if (!evidence.executionTimestamp || isNaN(Date.parse(evidence.executionTimestamp))) {
    throw new Error('EVIDENCE_REJECTED: Malformed or missing executionTimestamp');
  }
  if (!evidence.exactCommand || evidence.exactCommand !== 'node tests/governance-v16.test.mjs') {
    throw new Error(`EVIDENCE_REJECTED: exactCommand mismatch! Expected 'node tests/governance-v16.test.mjs', got '${evidence.exactCommand}'`);
  }

  return true;
}

export function independentlyVerifyEvidenceArtifact(artifactPath = path.resolve('reports/w008_gov_v16_evidence.json')) {
  assert.ok(fs.existsSync(artifactPath), `Evidence artifact '${artifactPath}' does not exist.`);
  const evidence = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const currentHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const currentOrigin = execSync('git rev-parse origin/master', { encoding: 'utf8' }).trim();
  const derivation = deriveCanonicalScopeHash(AUTHORITATIVE_V16_SCOPE_MANIFEST);
  
  return independentlyVerifyEvidencePackage(
    evidence,
    evidence.rawStdout,
    evidence.rawStderr,
    currentHead,
    currentOrigin,
    derivation.scopeHash
  );
}

// CLI Standalone Evidence Verifier Entrypoint (CTO REV-5 REQ 8)
if (process.argv.includes('--verify-evidence')) {
  console.log('=== RUNNING STANDALONE EVIDENCE ARTIFACT VERIFIER (AMENDMENT v1.6 - REV-5) ===\n');
  const artifactPath = path.resolve('reports/w008_gov_v16_evidence.json');
  independentlyVerifyEvidenceArtifact(artifactPath);
  console.log('[PASS] Standalone evidence artifact verification completed successfully (11/11 checks verified).\n');
  process.exit(0);
}

// Positive evidence package test with actual execution evidence artifact
const evidenceArtifactPath = path.resolve('reports/w008_gov_v16_evidence.json');
assert.ok(
  fs.existsSync(evidenceArtifactPath),
  `CRITICAL EVIDENCE DEFECT: reports/w008_gov_v16_evidence.json must exist. Actual execution evidence required.`
);

const liveEvidencePackage = JSON.parse(fs.readFileSync(evidenceArtifactPath, 'utf8'));
const persistedRawStdout = liveEvidencePackage.rawStdout;
const persistedRawStderr = liveEvidencePackage.rawStderr;

assert.strictEqual(
  independentlyVerifyEvidencePackage(
    liveEvidencePackage,
    persistedRawStdout,
    persistedRawStderr,
    actualHead,
    actualOriginMaster,
    ACTUAL_CANONICAL_SCOPE_HASH
  ),
  true
);

console.log('[PASS] [EVIDENCE / PROVENANCE] Actual execution evidence artifact (reports/w008_gov_v16_evidence.json) verified with complete 11-step chain of custody.');

// =============================================================================
// 6. FOURTEEN EXPLICIT NEGATIVE TESTS (A THROUGH N - CTO REV-5 REQ 6)
// =============================================================================

// Negative Test A: Fake synthetic stdout with a valid checksum
const fakeSyntheticStdout = 'RUNNING SUITE... 10/10 CHECKS PASSED. VERIFIED.';
const fakeSyntheticChecksum = crypto.createHash('sha256').update(fakeSyntheticStdout).digest('hex');
assert.throws(
  () => independentlyVerifyEvidencePackage(
    { ...liveEvidencePackage, rawStdoutSha256: fakeSyntheticChecksum },
    fakeSyntheticStdout,
    persistedRawStderr,
    actualHead,
    actualOriginMaster,
    ACTUAL_CANONICAL_SCOPE_HASH
  ),
  /Synthetic or placeholder stdout detected/
);
console.log('[PASS] [NEGATIVE TEST A] Fake synthetic stdout with valid checksum strictly rejected.');

// Negative Test B: Altered persisted stdout
assert.throws(
  () => independentlyVerifyEvidencePackage(
    liveEvidencePackage,
    persistedRawStdout + '\n# TAMPERED_OUTPUT_BYTE',
    persistedRawStderr,
    actualHead,
    actualOriginMaster,
    ACTUAL_CANONICAL_SCOPE_HASH
  ),
  /rawStdoutSha256 mismatch/
);
console.log('[PASS] [NEGATIVE TEST B] Altered persisted stdout strictly rejected.');

// Negative Test C: Altered persisted stderr
assert.throws(
  () => independentlyVerifyEvidencePackage(
    liveEvidencePackage,
    persistedRawStdout,
    'INJECTED_STDERR_ERROR_LINE\n',
    actualHead,
    actualOriginMaster,
    ACTUAL_CANONICAL_SCOPE_HASH
  ),
  /rawStderrSha256 mismatch/
);
console.log('[PASS] [NEGATIVE TEST C] Altered persisted stderr strictly rejected.');

// Negative Test D: Stale execution HEAD
assert.throws(
  () => independentlyVerifyEvidencePackage(
    { ...liveEvidencePackage, repositoryHead: '21ab56ad634a345d3d73e3f79a864d924447b209', gitCommitSha: '21ab56ad634a345d3d73e3f79a864d924447b209' },
    persistedRawStdout,
    persistedRawStderr,
    actualHead,
    actualOriginMaster,
    ACTUAL_CANONICAL_SCOPE_HASH
  ),
  /repositoryHead mismatch/
);
console.log('[PASS] [NEGATIVE TEST D] Stale execution HEAD strictly rejected.');

// Negative Test E: Stale origin/master
assert.throws(
  () => independentlyVerifyEvidencePackage(
    { ...liveEvidencePackage, originMasterHead: '1111111111111111111111111111111111111111' },
    persistedRawStdout,
    persistedRawStderr,
    actualHead,
    actualOriginMaster,
    ACTUAL_CANONICAL_SCOPE_HASH
  ),
  /originMasterHead mismatch/
);
console.log('[PASS] [NEGATIVE TEST E] Stale origin/master strictly rejected.');

// Negative Test F: Stale canonical scope hash
assert.throws(
  () => independentlyVerifyEvidencePackage(
    { ...liveEvidencePackage, canonicalScopeHash: 'b9d3d4d622d6e1f3a6ec1538dc02452c8daebb78ef41293545fc85049a30163f' },
    persistedRawStdout,
    persistedRawStderr,
    actualHead,
    actualOriginMaster,
    ACTUAL_CANONICAL_SCOPE_HASH
  ),
  /Canonical scope hash mismatch/
);
console.log('[PASS] [NEGATIVE TEST F] Stale canonical scope hash strictly rejected.');

// Negative Test G: Modified canonical manifest (CTO REV-5 REQ 4 - CANONICAL MUTATION E FIX)
// G1: Add unauthorized file to manifest -> call canonical derivation -> prove hash changes -> verifier rejects
const manifestWithAddedFile = [...AUTHORITATIVE_V16_SCOPE_MANIFEST, 'apps/api/src/server.ts'];
const mutatedAddedDerivation = deriveCanonicalScopeHash(manifestWithAddedFile);
assert.notStrictEqual(
  mutatedAddedDerivation.scopeHash,
  ACTUAL_CANONICAL_SCOPE_HASH,
  'Canonical scope hash of manifest with added file must differ from authoritative scope hash'
);
assert.throws(
  () => independentlyVerifyEvidencePackage(
    liveEvidencePackage,
    persistedRawStdout,
    persistedRawStderr,
    actualHead,
    actualOriginMaster,
    mutatedAddedDerivation.scopeHash
  ),
  /Canonical scope hash mismatch/
);

// G2: Change existing manifest entry -> call canonical derivation -> prove hash changes -> verifier rejects
const manifestWithChangedFile = AUTHORITATIVE_V16_SCOPE_MANIFEST.map(f => f === 'AMENDMENT_v1.6.md' ? 'AMENDMENT_v1.5.md' : f);
const mutatedChangedDerivation = deriveCanonicalScopeHash(manifestWithChangedFile);
assert.notStrictEqual(
  mutatedChangedDerivation.scopeHash,
  ACTUAL_CANONICAL_SCOPE_HASH,
  'Canonical scope hash of manifest with changed file must differ from authoritative scope hash'
);
assert.throws(
  () => independentlyVerifyEvidencePackage(
    liveEvidencePackage,
    persistedRawStdout,
    persistedRawStderr,
    actualHead,
    actualOriginMaster,
    mutatedChangedDerivation.scopeHash
  ),
  /Canonical scope hash mismatch/
);
console.log('[PASS] [NEGATIVE TEST G] Canonical Mutation E: Manifest modification (both added file and changed file) via canonical derivation strictly rejected.');

// Negative Test N: Repository dirty state
assert.throws(
  () => independentlyVerifyEvidencePackage(
    { ...liveEvidencePackage, workingTreeClean: false },
    persistedRawStdout,
    persistedRawStderr,
    actualHead,
    actualOriginMaster,
    ACTUAL_CANONICAL_SCOPE_HASH
  ),
  /Working tree was dirty during execution/
);
console.log('[PASS] [NEGATIVE TEST N] Repository dirty state strictly rejected fail-closed.');

// =============================================================================
// 7. ISOLATED CONTROL-M AUTHORIZATION FIXTURE (CTO REV-5 REQ 5 & NEGATIVE TESTS H-M)
// =============================================================================
console.log('\n--- EXECUTING ISOLATED CONTROL-M AUTHORIZATION FIXTURE (REQ 5) ---');
console.log('NOTE: Real repository state remains strictly frozen (IMPLEMENTATION_AUTHORIZATION = NO).');
console.log('      This fixture proves the 7-coordinate Control M YES-path with committed git object provenance.\n');

function runIsolatedControlMFixture() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'control-m-fixture-'));
  try {
    // 1. Initialize isolated git repo
    execSync('git init -b master', { cwd: tmpDir, stdio: 'pipe' });
    execSync('git config user.name "CTO-Fixture"', { cwd: tmpDir, stdio: 'pipe' });
    execSync('git config user.email "cto@fixture.kshetra.in"', { cwd: tmpDir, stdio: 'pipe' });

    // 2. Create base state commit (AUTHORIZED_BASE_HEAD)
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Base Repo\n');
    execSync('git add README.md && git commit -m "chore: base initial state"', { cwd: tmpDir, stdio: 'pipe' });
    const fixtureBaseHead = execSync('git rev-parse HEAD', { cwd: tmpDir, encoding: 'utf8' }).trim();

    // 3. Authorized scope manifest and its canonical hash
    fs.writeFileSync(path.join(tmpDir, 'feature.js'), 'console.log("feature");\n');
    const featureHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(tmpDir, 'feature.js'))).digest('hex');
    const fixtureScopeHash = crypto.createHash('sha256').update(`feature.js:${featureHash}`).digest('hex');

    // 4. Create dedicated committed CTO authorization record (Coordinate 4 Provenance)
    const authRecordContent = `# CTO FORMAL IMPLEMENTATION AUTHORIZATION
AUTHORIZATION_TYPE: IMPLEMENTATION
AUTHORIZED_JOB: FIXTURE-001
APPROVED_PLAN_VERSION: REV-1.0
AUTHORIZED_SCOPE_HASH: ${fixtureScopeHash}
AUTHORIZED_BASE_HEAD: ${fixtureBaseHead}
AUTHORITY: CTO Decision / Formal Implementation Authorization Mandate (Rule IV-001)
`;
    fs.writeFileSync(path.join(tmpDir, 'DECISION_LOG.md'), authRecordContent);
    execSync('git add DECISION_LOG.md && git commit -m "docs(governance): record formal CTO implementation authorization for FIXTURE-001"', { cwd: tmpDir, stdio: 'pipe' });
    const fixtureAuthCommit = execSync('git rev-parse HEAD', { cwd: tmpDir, encoding: 'utf8' }).trim();

    // Helper to construct EXECUTION_STATE.md content
    const makeExecutionState = (overrides = {}) => {
      const state = {
        CURRENT_JOB: 'FIXTURE-001',
        PLAN_STATUS: 'APPROVED',
        IMPLEMENTATION_AUTHORIZATION: 'YES',
        AUTHORIZED_JOB: 'FIXTURE-001',
        AUTHORIZED_SCOPE_HASH: fixtureScopeHash,
        AUTHORIZED_BASE_HEAD: fixtureBaseHead,
        IMPLEMENTATION_AUTHORIZATION_COMMIT: fixtureAuthCommit,
        ...overrides
      };
      return Object.entries(state).map(([k, v]) => `${k}: ${v}`).join('\n') + '\n';
    };

    // Evaluator for the 7 Control M coordinates inside the fixture
    function evaluateFixtureControlM(stateContent, repoDir, expectedScopeHash) {
      const extract = (k) => {
        const m = stateContent.match(new RegExp(`^${k}:\\s*(.+)`, 'm'));
        return m ? m[1].trim() : null;
      };

      const planStatus = extract('PLAN_STATUS');
      const implAuth = extract('IMPLEMENTATION_AUTHORIZATION');
      const authCommitSha = extract('IMPLEMENTATION_AUTHORIZATION_COMMIT');
      const authJob = extract('AUTHORIZED_JOB');
      const currentJob = extract('CURRENT_JOB');
      const authScopeHash = extract('AUTHORIZED_SCOPE_HASH');
      const authBaseHead = extract('AUTHORIZED_BASE_HEAD');

      // Coordinate 1: PLAN_STATUS == 'APPROVED'
      if (planStatus !== 'APPROVED') {
        throw new Error(`CONTROL_M_REJECTED: PLAN_STATUS must be APPROVED, got '${planStatus}'`);
      }

      // Coordinate 2: IMPLEMENTATION_AUTHORIZATION == 'YES'
      if (implAuth !== 'YES') {
        throw new Error(`CONTROL_M_REJECTED: IMPLEMENTATION_AUTHORIZATION must be YES, got '${implAuth}'`);
      }

      // Coordinate 3: Valid 40-char commit SHA in Git ancestry (Negative Test J)
      if (!authCommitSha || authCommitSha.length !== 40) {
        throw new Error(`CONTROL_M_REJECTED: IMPLEMENTATION_AUTHORIZATION_COMMIT must be a 40-char SHA, got '${authCommitSha}'`);
      }
      try {
        execSync(`git cat-file -e "${authCommitSha}^{commit}"`, { cwd: repoDir, stdio: 'pipe' });
        execSync(`git merge-base --is-ancestor "${authCommitSha}" HEAD`, { cwd: repoDir, stdio: 'pipe' });
      } catch (err) {
        throw new Error(`CONTROL_M_REJECTED: IMPLEMENTATION_AUTHORIZATION_COMMIT '${authCommitSha}' not found or not in git ancestry`);
      }

      // Coordinate 4: Commit contains explicit CTO authorization extracted directly from committed git object (CTO REV-5 REQ 5)
      let committedRecord;
      try {
        committedRecord = execSync(`git show "${authCommitSha}:DECISION_LOG.md"`, { cwd: repoDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      } catch (err) {
        throw new Error(`CONTROL_M_REJECTED: Authorization commit '${authCommitSha}' does not contain DECISION_LOG.md`);
      }

      const hasJob = committedRecord.includes(`AUTHORIZED_JOB: ${authJob}`);
      const hasScopeHash = committedRecord.includes(`AUTHORIZED_SCOPE_HASH: ${authScopeHash}`);
      const hasBaseHead = committedRecord.includes(`AUTHORIZED_BASE_HEAD: ${authBaseHead}`);
      const hasCtoAuthority = committedRecord.includes('AUTHORITY: CTO Decision / Formal Implementation Authorization Mandate (Rule IV-001)');

      if (!hasJob) {
        throw new Error(`CONTROL_M_REJECTED: Committed record does not match authorized job '${authJob}'`);
      }
      if (!hasScopeHash) {
        throw new Error(`CONTROL_M_REJECTED: Committed record does not match authorized scope hash '${authScopeHash}'`);
      }
      if (!hasBaseHead) {
        throw new Error(`CONTROL_M_REJECTED: Committed record does not match authorized base HEAD '${authBaseHead}'`);
      }
      if (!hasCtoAuthority) {
        throw new Error('CONTROL_M_REJECTED: Committed record does not contain explicit CTO authorization authority declaration');
      }

      // Coordinate 5: AUTHORIZED_JOB == CURRENT_JOB (Negative Test K)
      if (!authJob || authJob !== currentJob) {
        throw new Error(`CONTROL_M_REJECTED: AUTHORIZED_JOB '${authJob}' does not match CURRENT_JOB '${currentJob}'`);
      }

      // Coordinate 6: AUTHORIZED_SCOPE_HASH == CANONICAL_SCOPE_HASH (Negative Test L)
      if (!authScopeHash || authScopeHash !== expectedScopeHash) {
        throw new Error(`CONTROL_M_REJECTED: AUTHORIZED_SCOPE_HASH mismatch. Expected '${expectedScopeHash}', got '${authScopeHash}'`);
      }

      // Coordinate 7: AUTHORIZED_BASE_HEAD is ancestor of current fixture HEAD (Negative Test M)
      if (!authBaseHead || authBaseHead.length !== 40) {
        throw new Error(`CONTROL_M_REJECTED: AUTHORIZED_BASE_HEAD invalid SHA '${authBaseHead}'`);
      }
      try {
        execSync(`git merge-base --is-ancestor "${authBaseHead}" HEAD`, { cwd: repoDir, stdio: 'pipe' });
      } catch (err) {
        throw new Error(`CONTROL_M_REJECTED: AUTHORIZED_BASE_HEAD '${authBaseHead}' is not an ancestor of current HEAD`);
      }

      return true;
    }

    // Positive baseline: all 7 coordinates pass with committed record
    const validState = makeExecutionState();
    assert.strictEqual(evaluateFixtureControlM(validState, tmpDir, fixtureScopeHash), true);
    console.log('[PASS] [CONTROL M FIXTURE] Positive 7-coordinate YES-path with committed git object provenance verified.');

    // Negative Test H: Modified committed authorization record
    // Create commit where DECISION_LOG.md has corrupted scope hash
    const corruptedRecord = authRecordContent.replace(`AUTHORIZED_SCOPE_HASH: ${fixtureScopeHash}`, 'AUTHORIZED_SCOPE_HASH: ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    fs.writeFileSync(path.join(tmpDir, 'DECISION_LOG.md'), corruptedRecord);
    execSync('git add DECISION_LOG.md && git commit -m "docs(governance): corrupted auth record commit"', { cwd: tmpDir, stdio: 'pipe' });
    const corruptedAuthCommit = execSync('git rev-parse HEAD', { cwd: tmpDir, encoding: 'utf8' }).trim();
    assert.throws(
      () => evaluateFixtureControlM(makeExecutionState({ IMPLEMENTATION_AUTHORIZATION_COMMIT: corruptedAuthCommit }), tmpDir, fixtureScopeHash),
      /CONTROL_M_REJECTED: Committed record does not match authorized scope hash/
    );
    console.log('[PASS] [NEGATIVE TEST H] Modified committed authorization record strictly rejected.');

    // Negative Test I: External uncommitted CTO-looking decision record on disk while commit is unauthorized
    // Remove DECISION_LOG.md and commit on master so unauthCommit is in ancestry but lacks DECISION_LOG.md
    execSync('git rm DECISION_LOG.md', { cwd: tmpDir, stdio: 'pipe' });
    fs.writeFileSync(path.join(tmpDir, 'UNAUTH.txt'), 'unauth');
    execSync('git add UNAUTH.txt && git commit -m "feat: unauthorized commit without decision log"', { cwd: tmpDir, stdio: 'pipe' });
    const unauthCommit = execSync('git rev-parse HEAD', { cwd: tmpDir, encoding: 'utf8' }).trim();
    // Now write a fake uncommitted DECISION_LOG.md on disk with full CTO language
    fs.writeFileSync(path.join(tmpDir, 'DECISION_LOG.md'), authRecordContent);
    assert.throws(
      () => evaluateFixtureControlM(makeExecutionState({ IMPLEMENTATION_AUTHORIZATION_COMMIT: unauthCommit }), tmpDir, fixtureScopeHash),
      /CONTROL_M_REJECTED: Authorization commit .* does not contain DECISION_LOG.md/
    );
    console.log('[PASS] [NEGATIVE TEST I] External uncommitted CTO-looking decision record strictly rejected (provenance bound to commit).');

    // Negative Test J: Authorization commit not in ancestry
    // Create an orphan commit on an unrelated branch
    execSync('git checkout --orphan orphan-branch', { cwd: tmpDir, stdio: 'pipe' });
    fs.writeFileSync(path.join(tmpDir, 'ORPHAN.md'), 'orphan');
    execSync('git add ORPHAN.md && git commit -m "chore: orphan commit"', { cwd: tmpDir, stdio: 'pipe' });
    const orphanCommit = execSync('git rev-parse HEAD', { cwd: tmpDir, encoding: 'utf8' }).trim();
    execSync('git checkout master', { cwd: tmpDir, stdio: 'pipe' });
    assert.throws(
      () => evaluateFixtureControlM(makeExecutionState({ IMPLEMENTATION_AUTHORIZATION_COMMIT: orphanCommit }), tmpDir, fixtureScopeHash),
      /CONTROL_M_REJECTED: IMPLEMENTATION_AUTHORIZATION_COMMIT .* not found or not in git ancestry/
    );
    console.log('[PASS] [NEGATIVE TEST J] Authorization commit not in ancestry strictly rejected.');

    // Negative Test K: Authorization commit with wrong job
    assert.throws(
      () => evaluateFixtureControlM(makeExecutionState({ AUTHORIZED_JOB: 'WRONG-JOB-ID' }), tmpDir, fixtureScopeHash),
      /CONTROL_M_REJECTED: (Committed record does not match authorized job 'WRONG-JOB-ID'|AUTHORIZED_JOB 'WRONG-JOB-ID' does not match CURRENT_JOB)/
    );
    console.log('[PASS] [NEGATIVE TEST K] Authorization commit with wrong job strictly rejected.');

    // Negative Test L: Authorization commit with wrong scope hash
    assert.throws(
      () => evaluateFixtureControlM(makeExecutionState({ AUTHORIZED_SCOPE_HASH: '0000000000000000000000000000000000000000000000000000000000000000' }), tmpDir, fixtureScopeHash),
      /CONTROL_M_REJECTED: (Committed record does not match authorized scope hash|AUTHORIZED_SCOPE_HASH mismatch)/
    );
    console.log('[PASS] [NEGATIVE TEST L] Authorization commit with wrong scope hash strictly rejected.');

    // Negative Test M: Authorization base HEAD not ancestor
    assert.throws(
      () => evaluateFixtureControlM(makeExecutionState({ AUTHORIZED_BASE_HEAD: '2222222222222222222222222222222222222222' }), tmpDir, fixtureScopeHash),
      /CONTROL_M_REJECTED: (Committed record does not match authorized base HEAD|AUTHORIZED_BASE_HEAD .* is not an ancestor)/
    );
    console.log('[PASS] [NEGATIVE TEST M] Authorization base HEAD not ancestor strictly rejected.');

    console.log('[PASS] [CONTROL M FIXTURE] All negative tests H through M strictly rejected fail-closed.');

  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log('[PASS] [CONTROL M FIXTURE] Isolated temporary fixture cleaned up successfully.');
  }
}

runIsolatedControlMFixture();

console.log('\n========================================================================================');
console.log('   ALL DEDICATED v1.6 INDEPENDENT GOVERNANCE TESTS PASSED (100% EMPIRICALLY VERIFIED)!  ');
console.log('========================================================================================\n');
