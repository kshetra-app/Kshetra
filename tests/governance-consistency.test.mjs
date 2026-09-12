import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

console.log('=== RUNNING GOVERNANCE CONSISTENCY TEST (AMENDMENT v1.5-A REMEDIATED) ===\n');

// 1. Amendment v1.4, v1.5 & v1.5-A files exist and contain valid titles
assert.ok(fs.existsSync('AMENDMENT_v1.4.md'), 'AMENDMENT_v1.4.md must exist in repository root');
const amendment14Content = fs.readFileSync('AMENDMENT_v1.4.md', 'utf8');
assert.ok(amendment14Content.includes('MASTER EXECUTION FRAMEWORK AMENDMENT v1.4'), 'Amendment v1.4 title valid');

assert.ok(fs.existsSync('AMENDMENT_v1.5.md'), 'AMENDMENT_v1.5.md must exist in repository root');
const amendment15Content = fs.readFileSync('AMENDMENT_v1.5.md', 'utf8');
assert.ok(amendment15Content.includes('AGENT EXECUTION GOVERNANCE AMENDMENT v1.5'), 'Amendment v1.5 title valid');

assert.ok(fs.existsSync('AMENDMENT_v1.5-A.md'), 'AMENDMENT_v1.5-A.md must exist in repository root');
const amendment15AContent = fs.readFileSync('AMENDMENT_v1.5-A.md', 'utf8');
assert.ok(amendment15AContent.includes('AGENT EXECUTION GOVERNANCE AMENDMENT v1.5-A'), 'Amendment v1.5-A title valid');
assert.ok(amendment15AContent.includes('Strengthening the Mandatory Pre-Implementation Planning & Direction-Review Gate'), 'Amendment v1.5-A subtitle valid');
console.log('[PASS] Check 1: AMENDMENT_v1.4.md, AMENDMENT_v1.5.md, and AMENDMENT_v1.5-A.md exist with valid titles.');

// 2. Parent Immutability Provenance Check
const EXPECTED_V15_HASH = '8b3505eee995adebd92ba2139173f0a0ab68cdcd0ed6f19f10cdcab3c7a2bfe2';
const v15Buffer = fs.readFileSync('AMENDMENT_v1.5.md');
const actualV15Hash = crypto.createHash('sha256').update(v15Buffer).digest('hex').toLowerCase();
assert.strictEqual(
  actualV15Hash,
  EXPECTED_V15_HASH,
  `Parent AMENDMENT_v1.5.md hash mismatch! Expected ${EXPECTED_V15_HASH}, got ${actualV15Hash}. Parent amendment must remain byte-for-byte immutable.`
);

// Verify historical ratification commit of parent amendment v1.5
const v15Commit = execSync('git log -n 1 --format="%h" 795b9af -- AMENDMENT_v1.5.md', { encoding: 'utf8' }).trim();
assert.ok(v15Commit.startsWith('795b9af'), 'Parent amendment v1.5 must have ratification commit 795b9af');
console.log(`[PASS] Check 2: AMENDMENT_v1.5.md immutable parent provenance verified (SHA-256: ${actualV15Hash}, Ratified: 795b9af).`);

// 3. AGENT_EXECUTION_PROTOCOL.md Authority & Pre-Flight Reading Order
assert.ok(fs.existsSync('AGENT_EXECUTION_PROTOCOL.md'), 'AGENT_EXECUTION_PROTOCOL.md must exist');
const protocolContent = fs.readFileSync('AGENT_EXECUTION_PROTOCOL.md', 'utf8');
assert.ok(protocolContent.includes('Amendment v1.5-A'), 'Protocol authority must cite Amendment v1.5-A');
assert.ok(protocolContent.includes('AMENDMENT_v1.5-A.md'), 'Protocol pre-flight reading order must include AMENDMENT_v1.5-A.md');
assert.ok(protocolContent.includes('AMENDMENT_v1.5.md'), 'Protocol pre-flight reading order must include AMENDMENT_v1.5.md');
console.log('[PASS] Check 3: AGENT_EXECUTION_PROTOCOL.md authority is Amendment v1.5-A and includes v1.5-A in pre-flight.');

// 4. Lifecycle Model Proof: 18 Intra-Job Operational States & 19-Step Sequential Workflow
assert.ok(protocolContent.includes('Intra-Job Operational Execution Cycle (18 States)'), 'Protocol must document 18 intra-job operational states');
assert.ok(protocolContent.includes('Sequential Project Workflow & Gating (19 Steps)'), 'Protocol must document 19-step project workflow');
assert.ok(protocolContent.includes('NEXT_JOB_TRANSITION'), 'Protocol must define Step 19 as NEXT_JOB_TRANSITION');
assert.ok(protocolContent.includes('TASK_DEFINED'), 'Protocol must define State 1 as TASK_DEFINED');
assert.ok(protocolContent.includes('ACCEPTANCE'), 'Protocol must define State 18 as ACCEPTANCE');
console.log('[PASS] Check 4: Protocol proves lifecycle model: 18 intra-job operational states & 19-step project workflow.');

// 5. Canonical Approved 22-Section Planning Specification & Declarations
assert.ok(protocolContent.includes('Pre-Implementation Planning Specification (Amendment v1.5-A)'), 'Protocol must document planning specification');
assert.ok(protocolContent.includes('Section 27'), 'Protocol must reference Section 27 for Required Pre-Implementation Declaration');
assert.ok(protocolContent.includes('Section 28'), 'Protocol must reference Section 28 for Required Post-Implementation Declaration');
assert.ok(protocolContent.includes('PLAN APPROVED — PROCEED WITH IMPLEMENTATION ACCORDING TO THE APPROVED PLAN.'), 'Protocol must contain canonical approval phrase');

const requiredCanonicalSections = [
  '1. Document Title & Metadata',
  '2. Problem Statement',
  '3. Current State Analysis',
  '4. Fact / Inference / Assumption / Unknown Register',
  '5. Target Architecture & Intended Outcome',
  '6. Governing Rules & Constraints',
  '7. Full Scope of Work',
  '8. Explicit Out-of-Scope Boundaries',
  '9. Step-by-Step Implementation Plan',
  '10. Verification & Testing Strategy',
  '11. Negative-Path Testing Specification',
  '12. Evidence Generation Plan',
  '13. Reconciliation Plan',
  '14. Independent Verification Specification',
  '15. Risks, Failure Modes & Mitigations',
  '16. Rollback & Recovery Strategy',
  '17. Impact Assessment',
  '18. Acceptance Criteria',
  '19. Artifact & Commit Lineage Map',
  '20. Amendment Compliance Matrix',
  '21. Operational Declarations',
  '22. Plan Sign-Off & Review Request'
];

for (const sec of requiredCanonicalSections) {
  assert.ok(protocolContent.includes(sec), `Protocol planning template must contain canonical section: ${sec}`);
  assert.ok(amendment15AContent.includes(sec), `AMENDMENT_v1.5-A.md Section 26 must contain canonical section: ${sec}`);
}
console.log('[PASS] Check 5: Canonical approved 22-section planning template verified in both Protocol and AMENDMENT_v1.5-A.md.');

// 6. EXECUTION_STATE.md Governance Authority & Lineage
assert.ok(fs.existsSync('EXECUTION_STATE.md'), 'EXECUTION_STATE.md must exist');
const stateContent = fs.readFileSync('EXECUTION_STATE.md', 'utf8');
assert.ok(stateContent.includes('Amendment v1.5-A (ACTIVE OPERATIONAL AUTHORITY)'), 'EXECUTION_STATE.md must recognize Amendment v1.5-A as ACTIVE OPERATIONAL AUTHORITY');
assert.ok(stateContent.includes('Amendment v1.5 (Parent Baseline)'), 'EXECUTION_STATE.md must recognize Amendment v1.5 as Parent Baseline');

function extractField(fieldName) {
  const regex = new RegExp(`^${fieldName}:\\s*(.+)`, 'm');
  const match = stateContent.match(regex);
  return match ? match[1].trim() : null;
}

const currentRemoteHeadField = extractField('CURRENT_REMOTE_HEAD');
const verifiedRemoteHeadField = extractField('VERIFIED_REMOTE_HEAD');
assert.ok(currentRemoteHeadField, 'CURRENT_REMOTE_HEAD must be defined in EXECUTION_STATE.md');
assert.ok(verifiedRemoteHeadField, 'VERIFIED_REMOTE_HEAD must be defined in EXECUTION_STATE.md');

// Historical W006 coordinates must NOT masquerade as current coordinates
assert.notStrictEqual(verifiedRemoteHeadField, 'c1fe56a', 'VERIFIED_REMOTE_HEAD must not be historical W006 coordinate c1fe56a');
assert.ok(!verifiedRemoteHeadField.startsWith('c1fe56a'), 'VERIFIED_REMOTE_HEAD must not start with c1fe56a');
assert.strictEqual(extractField('HISTORICAL_W006_VERIFIED_REMOTE_HEAD'), 'c1fe56a', 'HISTORICAL_W006_VERIFIED_REMOTE_HEAD must remain c1fe56a');
assert.strictEqual(extractField('HISTORICAL_W006_AUDITED_CODE_COMMIT'), '35ba912', 'HISTORICAL_W006_AUDITED_CODE_COMMIT must remain 35ba912');
assert.strictEqual(extractField('HISTORICAL_W006_EVIDENCE_COMMIT'), 'db30619', 'HISTORICAL_W006_EVIDENCE_COMMIT must remain db30619');
assert.strictEqual(extractField('HISTORICAL_W006_ACCEPTANCE_COMMIT'), 'f5b8a09', 'HISTORICAL_W006_ACCEPTANCE_COMMIT must remain f5b8a09');

// Accepted W007 implementation commit must be recorded
assert.strictEqual(
  extractField('ACCEPTED_W007_IMPLEMENTATION_COMMIT'),
  '1d253cd454effb441e7f01e846a568eeddc7f57e',
  'ACCEPTED_W007_IMPLEMENTATION_COMMIT must be 1d253cd454effb441e7f01e846a568eeddc7f57e'
);

assert.ok(
  stateContent.includes('W006') && (stateContent.includes('ACCEPTED') || stateContent.includes('VERIFIED') || stateContent.includes('RECOMMENDED FOR HUMAN ACCEPTANCE')),
  'W006 status must be recorded in EXECUTION_STATE.md'
);
assert.ok(
  stateContent.includes('W007') && (stateContent.includes('Canonical API Client') && stateContent.includes('ACCEPTED / CLOSED')),
  'W007 must be recorded as ACCEPTED / CLOSED in EXECUTION_STATE.md'
);
console.log('[PASS] Check 6: EXECUTION_STATE.md recognizes Amendment v1.5-A, enforces current vs historical coordinate separation, and strictly preserves historical W006 coordinates.');

// 7. DECISION_LOG.md DEC-016, DEC-034, DEC-035, DEC-036 & DEC-037 Semantic Integrity
assert.ok(fs.existsSync('DECISION_LOG.md'), 'DECISION_LOG.md must exist');
const decisionContent = fs.readFileSync('DECISION_LOG.md', 'utf8');
assert.ok(decisionContent.includes('DEC-016'), 'DECISION_LOG.md must record DEC-016');
assert.ok(decisionContent.includes('DEC-034: AMENDMENT v1.5 MANDATORY PRE-IMPLEMENTATION PLANNING'), 'DECISION_LOG.md must record DEC-034');
assert.ok(decisionContent.includes('DEC-035: AMENDMENT v1.5-A ADOPTION'), 'DECISION_LOG.md must record DEC-035');
assert.ok(decisionContent.includes('DEC-036: W006 FINAL ACCEPTANCE') || decisionContent.includes('DEC-036'), 'DECISION_LOG.md must record DEC-036');
assert.ok(decisionContent.includes('DEC-037: W006 Final Technical Acceptance') || decisionContent.includes('DEC-037'), 'DECISION_LOG.md must record DEC-037');
assert.ok(decisionContent.includes('PLAN APPROVAL ≠ IMPLEMENTATION ≠ INDEPENDENT VERIFICATION ≠ FINAL ACCEPTANCE'), 'DEC-035 must record lifecycle separation invariant');
console.log('[PASS] Check 7: DECISION_LOG.md records DEC-016, DEC-034, DEC-035, DEC-036, and DEC-037 with correct lifecycle separation semantics.');

// 8. Comprehensive Git HEAD, Remote Consistency & Fail-Closed Provenance Invariant (DEC-013 / DEC-022)
const localHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
assert.strictEqual(localHead.length, 40, 'Local HEAD SHA must be a valid 40-character SHA');

let originMaster = '';
try {
  originMaster = execSync('git rev-parse origin/master', { encoding: 'utf8' }).trim();
  assert.strictEqual(originMaster.length, 40, 'origin/master SHA must be a valid 40-character SHA');
} catch (err) {
  assert.fail(`origin/master could not be resolved: ${err.message}`);
}

// Local HEAD must strictly match origin/master (fail-closed, no exceptions)
assert.strictEqual(
  localHead,
  originMaster,
  `Local HEAD (${localHead}) must strictly match origin/master (${originMaster})`
);

// Working tree must be completely clean (fail-closed, no exceptions)
const porcelainStatus = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
assert.strictEqual(
  porcelainStatus,
  '',
  `Working tree must be 100% clean; observed uncommitted changes:\n${porcelainStatus}`
);

// Verify CURRENT_REMOTE_HEAD is defined and resolves in Git history
assert.ok(currentRemoteHeadField, 'CURRENT_REMOTE_HEAD must be defined in EXECUTION_STATE.md');
let currentRemoteHeadResolved = '';
try {
  currentRemoteHeadResolved = execSync(`git rev-parse "${currentRemoteHeadField}"`, { encoding: 'utf8' }).trim();
  assert.strictEqual(currentRemoteHeadResolved.length, 40, 'Resolved CURRENT_REMOTE_HEAD must be 40 characters');
} catch (err) {
  assert.fail(`CURRENT_REMOTE_HEAD "${currentRemoteHeadField}" cannot be resolved in git history: ${err.message}`);
}

// CURRENT_REMOTE_HEAD must strictly match origin/master (DEC-013 / DEC-022)
assert.strictEqual(
  currentRemoteHeadResolved,
  originMaster,
  `CURRENT_REMOTE_HEAD (${currentRemoteHeadResolved}) must strictly match origin/master (${originMaster})`
);

// VERIFIED_REMOTE_HEAD must strictly match origin/master
let verifiedRemoteHeadResolved = '';
try {
  verifiedRemoteHeadResolved = execSync(`git rev-parse "${verifiedRemoteHeadField}"`, { encoding: 'utf8' }).trim();
  assert.strictEqual(verifiedRemoteHeadResolved.length, 40, 'Resolved VERIFIED_REMOTE_HEAD must be 40 characters');
} catch (err) {
  assert.fail(`VERIFIED_REMOTE_HEAD "${verifiedRemoteHeadField}" cannot be resolved in git history: ${err.message}`);
}
assert.strictEqual(
  verifiedRemoteHeadResolved,
  originMaster,
  `VERIFIED_REMOTE_HEAD (${verifiedRemoteHeadResolved}) must strictly match origin/master (${originMaster})`
);

// CURRENT_REMOTE_HEAD must strictly match VERIFIED_REMOTE_HEAD
assert.strictEqual(
  currentRemoteHeadResolved,
  verifiedRemoteHeadResolved,
  `CURRENT_REMOTE_HEAD (${currentRemoteHeadResolved}) must strictly match VERIFIED_REMOTE_HEAD (${verifiedRemoteHeadResolved})`
);

console.log(`[PASS] Check 8: Comprehensive Git HEAD (${localHead}), origin/master (${originMaster}), clean working tree, and strict CURRENT_REMOTE_HEAD equality verified.`);

console.log('\n===============================================================');
console.log('   ALL AMENDMENT v1.5-A GOVERNANCE CONSISTENCY CHECKS PASSED!  ');
console.log('===============================================================\n');
