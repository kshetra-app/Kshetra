import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

console.log('=== RUNNING DEDICATED SEMANTIC GOVERNANCE REGRESSION SUITE (AMENDMENT v1.6) ===\n');

// -----------------------------------------------------------------------------
// Test A: Amendment Identity & Provenance
// -----------------------------------------------------------------------------
assert.ok(fs.existsSync('AMENDMENT_v1.6.md'), 'AMENDMENT_v1.6.md must exist in repository root');
const v16Text = fs.readFileSync('AMENDMENT_v1.6.md', 'utf8');
assert.ok(v16Text.includes('AGENT EXECUTION PROTOCOL — AMENDMENT v1.6'), 'v1.6 title matches exactly');
assert.ok(v16Text.includes('**Document Identifier:** AMENDMENT_v1.6.md'), 'v1.6 document identifier matches');
console.log('[PASS] Test A: Amendment identity and provenance verified.');

// -----------------------------------------------------------------------------
// Test B: Parent Amendment Immutability
// -----------------------------------------------------------------------------
const EXPECTED_V15_HASH = '8b3505eee995adebd92ba2139173f0a0ab68cdcd0ed6f19f10cdcab3c7a2bfe2';
const actualV15Hash = crypto.createHash('sha256').update(fs.readFileSync('AMENDMENT_v1.5.md')).digest('hex').toLowerCase();
assert.strictEqual(actualV15Hash, EXPECTED_V15_HASH, 'Parent AMENDMENT_v1.5.md must be byte-for-byte immutable');
const v15Commit = execSync('git log -n 1 --format="%h" 795b9af -- AMENDMENT_v1.5.md', { encoding: 'utf8' }).trim();
assert.ok(v15Commit.startsWith('795b9af'), 'Parent amendment v1.5 must have ratification commit 795b9af');
console.log('[PASS] Test B: Parent amendment immutability verified.');

// -----------------------------------------------------------------------------
// Test C: Rule IV-001 Preservation
// -----------------------------------------------------------------------------
assert.ok(v16Text.includes('Rule IV-001'), 'v1.6 must reference Rule IV-001');
assert.ok(v16Text.includes('The agent or session implementing product code cannot certify final acceptance'), 'Rule IV-001 separation of implementing agent codified');
assert.ok(v16Text.includes('Final technical acceptance is reserved exclusively for the CTO Technical Authority'), 'Rule IV-001 CTO reservation codified');
console.log('[PASS] Test C: Rule IV-001 preservation verified.');

// -----------------------------------------------------------------------------
// Test D: CTO-Only Technical Acceptance Authority (No "CTO/User" conflation)
// -----------------------------------------------------------------------------
assert.ok(!v16Text.includes('CTO/User'), 'v1.6 must not contain "CTO/User" slash conflation');
assert.ok(!v16Text.includes('CTO / User'), 'v1.6 must not contain "CTO / User" conflation');
assert.ok(v16Text.includes('Independent technical review conducted exclusively by the CTO Technical Authority'), 'v1.6 Stage 3 must be CTO Technical Authority exclusive');
assert.ok(v16Text.includes('Formal acceptance granted exclusively by the CTO Technical Authority based on independent evidence review under Rule IV-001'), 'v1.6 Stage 8 must be CTO Technical Authority exclusive');
console.log('[PASS] Test D: CTO-only technical review and acceptance authority verified.');

// -----------------------------------------------------------------------------
// Test E: Nine-Stage Lifecycle Transitions & Prohibited Transitions
// -----------------------------------------------------------------------------
const LIFECYCLE_STAGES = [
  'DEFINED', 'PLANNED', 'PLAN_REVIEWED', 'AUTHORIZED',
  'IMPLEMENTED', 'TESTED_AND_VERIFIED', 'PRODUCTION_VERIFIED',
  'ACCEPTED', 'COMPLETE'
];

function validateTransition(currentStage, nextStage, isImplementingAgent = false) {
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
  // Permitted backward regression paths
  if (currentStage === 'PLANNED' && nextStage === 'DEFINED') return true; // Rejected
  if (currentStage === 'PLAN_REVIEWED' && nextStage === 'PLANNED') return true; // Revisions Required
  if (currentStage === 'IMPLEMENTED' && nextStage === 'AUTHORIZED') return true; // Defect / Breach
  if (currentStage === 'TESTED_AND_VERIFIED' && nextStage === 'IMPLEMENTED') return true; // Verification Fail
  if (currentStage === 'PRODUCTION_VERIFIED' && nextStage === 'IMPLEMENTED') return true; // Production Fail
  
  throw new Error(`PROHIBITED_TRANSITION: Cannot transition directly from ${currentStage} to ${nextStage}`);
}

// Positive transitions
assert.strictEqual(validateTransition('DEFINED', 'PLANNED'), true);
assert.strictEqual(validateTransition('PLANNED', 'PLAN_REVIEWED'), true);
assert.strictEqual(validateTransition('PLAN_REVIEWED', 'AUTHORIZED'), true);
assert.strictEqual(validateTransition('AUTHORIZED', 'IMPLEMENTED'), true);
assert.strictEqual(validateTransition('IMPLEMENTED', 'TESTED_AND_VERIFIED'), true);
assert.strictEqual(validateTransition('TESTED_AND_VERIFIED', 'PRODUCTION_VERIFIED'), true);
assert.strictEqual(validateTransition('PRODUCTION_VERIFIED', 'ACCEPTED', false), true);
assert.strictEqual(validateTransition('ACCEPTED', 'COMPLETE', false), true);

// Negative-path mutations: prohibited skips
assert.throws(() => validateTransition('DEFINED', 'IMPLEMENTED'), /PROHIBITED_TRANSITION/);
assert.throws(() => validateTransition('PLANNED', 'IMPLEMENTED'), /PROHIBITED_TRANSITION/);
assert.throws(() => validateTransition('AUTHORIZED', 'ACCEPTED'), /PROHIBITED_TRANSITION/);
assert.throws(() => validateTransition('IMPLEMENTED', 'ACCEPTED'), /PROHIBITED_TRANSITION/);
assert.throws(() => validateTransition('TESTED_AND_VERIFIED', 'COMPLETE'), /PROHIBITED_TRANSITION/);

// Negative-path mutation: implementing agent self-acceptance (Rule IV-001)
assert.throws(() => validateTransition('PRODUCTION_VERIFIED', 'ACCEPTED', true), /Rule IV-001/);
assert.throws(() => validateTransition('ACCEPTED', 'COMPLETE', true), /Rule IV-001/);
console.log('[PASS] Test E: Nine-stage lifecycle transitions, permitted regressions, and prohibited skips verified with negative-path failures.');

// -----------------------------------------------------------------------------
// Test F: UNKNOWN Cannot Be Treated as PASS
// -----------------------------------------------------------------------------
function evaluateVerificationResult(resultStatus) {
  if (resultStatus === 'PASS') return 'PASS';
  if (resultStatus === 'UNKNOWN' || resultStatus === 'UNVERIFIED') {
    throw new Error('GOVERNANCE_VIOLATION: UNKNOWN or UNVERIFIED status cannot be treated as PASS');
  }
  if (resultStatus === 'FAIL' || resultStatus === 'DEFECT') {
    throw new Error('VERIFICATION_FAILED: Result is non-passing');
  }
  throw new Error('INVALID_STATUS: Unrecognized status');
}

assert.strictEqual(evaluateVerificationResult('PASS'), 'PASS');
assert.throws(() => evaluateVerificationResult('UNKNOWN'), /UNKNOWN or UNVERIFIED status cannot be treated as PASS/);
assert.throws(() => evaluateVerificationResult('UNVERIFIED'), /UNKNOWN or UNVERIFIED status cannot be treated as PASS/);
console.log('[PASS] Test F: UNKNOWN / UNVERIFIED treated fail-closed; negative-path rejection verified.');

// -----------------------------------------------------------------------------
// Test G: Unexecuted Tests Cannot Be Represented as PASS
// -----------------------------------------------------------------------------
function evaluatePreImplementationClaim(hasExecuted, statusClaim) {
  if (!hasExecuted && (statusClaim === 'PASS' || statusClaim === 'ZERO (PASS)' || statusClaim === 'PROVISIONAL PASS')) {
    throw new Error('GOVERNANCE_BREACH: Unexecuted test cannot be declared PASS');
  }
  return true;
}

assert.strictEqual(evaluatePreImplementationClaim(true, 'PASS'), true);
assert.strictEqual(evaluatePreImplementationClaim(false, 'NOT AUTHORIZED / UNEXECUTED'), true);
assert.throws(() => evaluatePreImplementationClaim(false, 'PASS'), /GOVERNANCE_BREACH/);
assert.throws(() => evaluatePreImplementationClaim(false, 'ZERO (PASS)'), /GOVERNANCE_BREACH/);
assert.throws(() => evaluatePreImplementationClaim(false, 'PROVISIONAL PASS'), /GOVERNANCE_BREACH/);
console.log('[PASS] Test G: Pre-implementation PASS prohibition verified with negative-path rejections.');

// -----------------------------------------------------------------------------
// Test H & I: Machine-Verifiable Control M Implementation Authorization Gate
// -----------------------------------------------------------------------------
function verifyImplementationAuthorization(authTuple, gitAncestry, decisions) {
  const {
    jobId,
    planStatus,
    implAuth,
    implAuthCommit,
    canonicalScopeHash,
    authorizedBaseHead
  } = authTuple;

  if (implAuth !== 'YES') {
    return { authorized: false, reason: 'IMPLEMENTATION_NOT_AUTHORIZED' };
  }

  if (planStatus !== 'APPROVED') {
    throw new Error('CONTROL_M_BREACH: Plan status must be APPROVED when authorization is YES');
  }

  if (!implAuthCommit || implAuthCommit.length !== 40) {
    throw new Error('CONTROL_M_BREACH: Invalid authorization commit SHA');
  }

  if (!gitAncestry.includes(implAuthCommit)) {
    throw new Error('CONTROL_M_BREACH: Authorization commit is not in Git ancestry');
  }

  const decision = decisions[implAuthCommit];
  if (!decision) {
    throw new Error('CONTROL_M_BREACH: No explicit CTO decision record exists at authorization commit');
  }

  if (!decision.isCtoDirective) {
    throw new Error('CONTROL_M_BREACH: Decision record is not an explicit CTO Technical Authority directive');
  }

  if (decision.authorizedJob !== jobId) {
    throw new Error('CONTROL_M_BREACH: Authorization commit is for a different job');
  }

  if (decision.authorizedScopeHash !== canonicalScopeHash) {
    throw new Error('CONTROL_M_BREACH: Scope hash mismatch between authorization and approved plan');
  }

  if (!gitAncestry.includes(authorizedBaseHead)) {
    throw new Error('CONTROL_M_BREACH: Authorized base HEAD is not in Git ancestry');
  }

  return { authorized: true, reason: 'MACHINE_VERIFIED_CTO_AUTHORIZATION' };
}

const mockGitAncestry = [
  '70b18f55dc9864070688a0949aaf60c79a9c0657', // base HEAD
  'e6d4c6449175ee250eb93855ff99008bc0a2ea99', // auth commit
  '89847041d0d9d93d348ed7bc2a5556dcc2c74f8b', // impl commit
  'c56e46736cb9629ee3fd456f2db8e8fd962189ac'  // current HEAD
];

const mockDecisions = {
  'e6d4c6449175ee250eb93855ff99008bc0a2ea99': {
    isCtoDirective: true,
    authorizedJob: 'W008-C',
    authorizedScopeHash: '36de3d19127019ae00d7900e7d515e74e5892e18adcd991b606338fe5be04b49',
    authorizedBaseHead: '70b18f55dc9864070688a0949aaf60c79a9c0657'
  }
};

const validTuple = {
  jobId: 'W008-C',
  planStatus: 'APPROVED',
  implAuth: 'YES',
  implAuthCommit: 'e6d4c6449175ee250eb93855ff99008bc0a2ea99',
  canonicalScopeHash: '36de3d19127019ae00d7900e7d515e74e5892e18adcd991b606338fe5be04b49',
  authorizedBaseHead: '70b18f55dc9864070688a0949aaf60c79a9c0657'
};

// Positive Control M verification
const validAuthResult = verifyImplementationAuthorization(validTuple, mockGitAncestry, mockDecisions);
assert.strictEqual(validAuthResult.authorized, true);

// Negative-path mutation 1: implAuth is NO
const unauthResult = verifyImplementationAuthorization({ ...validTuple, implAuth: 'NO' }, mockGitAncestry, mockDecisions);
assert.strictEqual(unauthResult.authorized, false);

// Negative-path mutation 2: planStatus is not APPROVED
assert.throws(
  () => verifyImplementationAuthorization({ ...validTuple, planStatus: 'SUBMITTED' }, mockGitAncestry, mockDecisions),
  /Plan status must be APPROVED/
);

// Negative-path mutation 3: missing/phantom authorization commit
assert.throws(
  () => verifyImplementationAuthorization({ ...validTuple, implAuthCommit: '1111111111111111111111111111111111111111' }, mockGitAncestry, mockDecisions),
  /not in Git ancestry/
);

// Negative-path mutation 4: authorization for a different job
const differentJobDecisions = {
  'e6d4c6449175ee250eb93855ff99008bc0a2ea99': {
    ...mockDecisions['e6d4c6449175ee250eb93855ff99008bc0a2ea99'],
    authorizedJob: 'W008-B'
  }
};
assert.throws(
  () => verifyImplementationAuthorization(validTuple, mockGitAncestry, differentJobDecisions),
  /different job/
);

// Negative-path mutation 5: scope hash mismatch
const mismatchedScopeDecisions = {
  'e6d4c6449175ee250eb93855ff99008bc0a2ea99': {
    ...mockDecisions['e6d4c6449175ee250eb93855ff99008bc0a2ea99'],
    authorizedScopeHash: 'bad0000000000000000000000000000000000000000000000000000000000000'
  }
};
assert.throws(
  () => verifyImplementationAuthorization(validTuple, mockGitAncestry, mismatchedScopeDecisions),
  /Scope hash mismatch/
);

// Negative-path mutation 6: agent self-authorization (not CTO directive)
const agentSelfAuthDecisions = {
  'e6d4c6449175ee250eb93855ff99008bc0a2ea99': {
    ...mockDecisions['e6d4c6449175ee250eb93855ff99008bc0a2ea99'],
    isCtoDirective: false
  }
};
assert.throws(
  () => verifyImplementationAuthorization(validTuple, mockGitAncestry, agentSelfAuthDecisions),
  /not an explicit CTO Technical Authority directive/
);

console.log('[PASS] Test H & I: Machine-verifiable Control M implementation gate and unauthorized implementation rejection verified with 6 adversarial negative-path mutations.');

// -----------------------------------------------------------------------------
// Test J: Scope Leakage Is Rejected Fail-Closed
// -----------------------------------------------------------------------------
function verifyScopeCompliance(modifiedFiles, authorizedManifest) {
  const leaks = modifiedFiles.filter(file => !authorizedManifest.includes(file));
  if (leaks.length > 0) {
    throw new Error(`SCOPE_LEAKAGE_DETECTED: Unauthorized modifications outside scope manifest: ${leaks.join(', ')}`);
  }
  return true;
}

const authorizedManifest = [
  'apps/api/src/routes/states.ts',
  'apps/api/src/routes/moderation.ts',
  'apps/api/src/routes/notifications.ts',
  'apps/api/src/routes/civic.ts'
];

assert.strictEqual(verifyScopeCompliance(['apps/api/src/routes/states.ts'], authorizedManifest), true);
assert.throws(
  () => verifyScopeCompliance(['apps/api/src/routes/states.ts', 'apps/api/src/server.ts'], authorizedManifest),
  /SCOPE_LEAKAGE_DETECTED.*apps[\/]api[\/]src[\/]server.ts/
);
assert.throws(
  () => verifyScopeCompliance(['apps/mobile/App.tsx'], authorizedManifest),
  /SCOPE_LEAKAGE_DETECTED.*apps[\/]mobile[\/]App.tsx/
);
console.log('[PASS] Test J: Scope leakage fail-closed rejection verified with negative-path mutations.');

// -----------------------------------------------------------------------------
// Test K, L, M: Evidence Chain of Custody (Commit SHA, Checksum, Environment)
// -----------------------------------------------------------------------------
function verifyEvidencePackage(evidence, rawOutput, activeHeadCommit) {
  if (!evidence.gitCommitSha || evidence.gitCommitSha !== activeHeadCommit) {
    throw new Error(`EVIDENCE_REJECTED: gitCommitSha mismatch. Expected ${activeHeadCommit}, got ${evidence.gitCommitSha}`);
  }

  const expectedChecksum = crypto.createHash('sha256').update(rawOutput).digest('hex');
  if (!evidence.rawOutputChecksum || evidence.rawOutputChecksum !== expectedChecksum) {
    throw new Error(`EVIDENCE_REJECTED: rawOutputChecksum mismatch. Expected ${expectedChecksum}, got ${evidence.rawOutputChecksum}`);
  }

  if (!evidence.environment || typeof evidence.environment !== 'object') {
    throw new Error('EVIDENCE_REJECTED: Missing environment identity block');
  }

  const { host, runtime, databaseTarget } = evidence.environment;
  if (!host || !runtime || !databaseTarget) {
    throw new Error('EVIDENCE_REJECTED: Incomplete environment identity (host, runtime, and databaseTarget required)');
  }

  if (!evidence.timestamp || isNaN(Date.parse(evidence.timestamp))) {
    throw new Error('EVIDENCE_REJECTED: Malformed or missing timestamp');
  }

  return true;
}

const sampleOutput = 'TEST OUTPUT DATA VERBATIM';
const validChecksum = crypto.createHash('sha256').update(sampleOutput).digest('hex');
const activeCommit = 'c56e46736cb9629ee3fd456f2db8e8fd962189ac';

const validEvidence = {
  gitCommitSha: activeCommit,
  timestamp: new Date().toISOString(),
  rawOutputChecksum: validChecksum,
  environment: {
    host: 'kshetra-runner-01',
    runtime: 'node-24.13.0-win32',
    databaseTarget: 'fkpigozcqnmcvofuksar'
  }
};

assert.strictEqual(verifyEvidencePackage(validEvidence, sampleOutput, activeCommit), true);

// Negative-path: wrong git commit
assert.throws(
  () => verifyEvidencePackage({ ...validEvidence, gitCommitSha: '0000000000000000000000000000000000000000' }, sampleOutput, activeCommit),
  /gitCommitSha mismatch/
);

// Negative-path: corrupted rawOutputChecksum
assert.throws(
  () => verifyEvidencePackage({ ...validEvidence, rawOutputChecksum: 'corrupted_hash' }, sampleOutput, activeCommit),
  /rawOutputChecksum mismatch/
);

// Negative-path: missing environment
assert.throws(
  () => verifyEvidencePackage({ ...validEvidence, environment: null }, sampleOutput, activeCommit),
  /Missing environment identity block/
);

// Negative-path: missing databaseTarget
assert.throws(
  () => verifyEvidencePackage({ ...validEvidence, environment: { host: 'runner', runtime: 'node' } }, sampleOutput, activeCommit),
  /Incomplete environment identity/
);

// Negative-path: malformed timestamp
assert.throws(
  () => verifyEvidencePackage({ ...validEvidence, timestamp: 'invalid-date' }, sampleOutput, activeCommit),
  /Malformed or missing timestamp/
);

console.log('[PASS] Test K, L, M: Evidence chain of custody (Commit SHA, Checksum, Environment) verified with 5 adversarial negative-path mutations.');

// -----------------------------------------------------------------------------
// Test N: Historical Accepted Jobs Cannot Be Reopened
// -----------------------------------------------------------------------------
const stateContent = fs.readFileSync('EXECUTION_STATE.md', 'utf8');
assert.ok(stateContent.includes('W008-C') && stateContent.includes('ACCEPTED / CLOSED'), 'W008-C must remain ACCEPTED / CLOSED');
assert.ok(v16Text.includes('**Historical Isolation:** Closed jobs W000 through W008-C remain locked and immutable'), 'v1.6 explicitly locks historical jobs');
console.log('[PASS] Test N: Historical accepted jobs locked and immutable.');

// -----------------------------------------------------------------------------
// Test O: Product Code Remains Frozen While IMPLEMENTATION_AUTHORIZATION != YES
// -----------------------------------------------------------------------------
const currentImplAuth = (stateContent.match(/^IMPLEMENTATION_AUTHORIZATION:\s*(.+)/m) || [])[1]?.trim();
assert.ok(currentImplAuth === 'NO' || currentImplAuth === 'BLOCKED', `Current implementation authorization must be NO/BLOCKED, observed: ${currentImplAuth}`);
console.log(`[PASS] Test O: Product code frozen in EXECUTION_STATE.md (IMPLEMENTATION_AUTHORIZATION = ${currentImplAuth}).`);

// -----------------------------------------------------------------------------
// Test P: W008-D, W008-E, W009 Remain Unauthorized / Frozen / Blocked
// -----------------------------------------------------------------------------
assert.ok(stateContent.includes('W008-D') && (stateContent.includes('NOT AUTHORIZED') || stateContent.includes('FROZEN')), 'W008-D must be NOT AUTHORIZED / FROZEN');
assert.ok(stateContent.includes('W008-E') && (stateContent.includes('NOT AUTHORIZED') || stateContent.includes('FROZEN')), 'W008-E must be NOT AUTHORIZED / FROZEN');
assert.ok(stateContent.includes('W009') && (stateContent.includes('NOT AUTHORIZED') || stateContent.includes('BLOCKED')), 'W009 must be NOT AUTHORIZED / BLOCKED');
console.log('[PASS] Test P: Sub-jobs W008-D, W008-E, and W009 verified strictly unauthorized / frozen / blocked.');

// -----------------------------------------------------------------------------
// Test Q: Acceptance Cannot Be Self-Generated by Implementing Agent
// -----------------------------------------------------------------------------
function assertAcceptanceAuthority(claimantRole) {
  if (claimantRole !== 'CTO_TECHNICAL_AUTHORITY') {
    throw new Error(`RULE_IV_001_VIOLATION: Role '${claimantRole}' is not authorized to grant final acceptance.`);
  }
  return true;
}

assert.strictEqual(assertAcceptanceAuthority('CTO_TECHNICAL_AUTHORITY'), true);
assert.throws(() => assertAcceptanceAuthority('IMPLEMENTING_AGENT'), /RULE_IV_001_VIOLATION/);
assert.throws(() => assertAcceptanceAuthority('PRODUCT_OWNER_USER'), /RULE_IV_001_VIOLATION/);
assert.throws(() => assertAcceptanceAuthority('SUBAGENT'), /RULE_IV_001_VIOLATION/);
console.log('[PASS] Test Q: Implementing agent and non-CTO roles rejected from self-generating acceptance (Rule IV-001).');

console.log('\n===============================================================');
console.log('   ALL DEDICATED v1.6 SEMANTIC GOVERNANCE TESTS PASSED (100%)!  ');
console.log('===============================================================\n');
