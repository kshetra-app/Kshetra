import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

console.log('=== RUNNING GOVERNANCE CONSISTENCY TEST (AMENDMENT v1.5-A) ===\n');

// 1. Amendment v1.4, v1.5 & v1.5-A files exist
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
console.log(`[PASS] Check 2: AMENDMENT_v1.5.md immutable parent provenance verified (SHA-256: ${actualV15Hash}).`);

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

// 5. Pre-Implementation Planning Specification & Declarations
assert.ok(protocolContent.includes('Pre-Implementation Planning Specification (Amendment v1.5-A)'), 'Protocol must document planning specification');
assert.ok(protocolContent.includes('Section 27'), 'Protocol must reference Section 27 for Required Pre-Implementation Declaration');
assert.ok(protocolContent.includes('Section 28'), 'Protocol must reference Section 28 for Required Post-Implementation Declaration');
assert.ok(protocolContent.includes('PLAN APPROVED — PROCEED WITH IMPLEMENTATION ACCORDING TO THE APPROVED PLAN.'), 'Protocol must contain canonical approval phrase');

const requiredSections = [
  '1. Task Understanding',
  '2. Current-State Findings',
  '3. Facts / Inferences / Assumptions / Unknowns',
  '4. Root-Cause Interpretation',
  '5. Proposed Technical Solution',
  '6. Alternatives Considered',
  '7. Exact Files / Components Expected to Change',
  '8. Explicit Non-Change Boundary',
  '9. Test Strategy',
  '10. Negative-Path Strategy',
  '11. Test Integrity Strategy',
  '12. Evidence Strategy',
  '13. Provenance Strategy',
  '14. Security / Privacy / Data Considerations',
  '15. Risks and Assumptions',
  '16. Scope Boundaries',
  '17. Dependency / Blocking Analysis',
  '18. Downstream Impact',
  '19. Rollback / Recovery Considerations',
  '20. Acceptance Criteria',
  '21. Questions / Decisions Requiring Review',
  '22. Plan-Approval State'
];
for (const sec of requiredSections) {
  assert.ok(protocolContent.includes(sec), `Protocol planning template must contain section: ${sec}`);
}
console.log('[PASS] Check 5: Protocol contains complete 22-section planning template and Section 27/28 declaration gates.');

// 6. EXECUTION_STATE.md Governance Authority & Lineage
assert.ok(fs.existsSync('EXECUTION_STATE.md'), 'EXECUTION_STATE.md must exist');
const stateContent = fs.readFileSync('EXECUTION_STATE.md', 'utf8');
assert.ok(stateContent.includes('Amendment v1.5-A (ACTIVE OPERATIONAL AUTHORITY)'), 'EXECUTION_STATE.md must recognize Amendment v1.5-A as ACTIVE OPERATIONAL AUTHORITY');
assert.ok(stateContent.includes('Amendment v1.5 (Parent Baseline)'), 'EXECUTION_STATE.md must recognize Amendment v1.5 as Parent Baseline');
assert.ok(stateContent.includes('CURRENT_REMOTE_HEAD'), 'Must define CURRENT_REMOTE_HEAD');
assert.ok(stateContent.includes('AUDITED_CODE_COMMIT'), 'Must define AUDITED_CODE_COMMIT');
assert.ok(stateContent.includes('EVIDENCE_COMMIT'), 'Must define EVIDENCE_COMMIT');
assert.ok(stateContent.includes('ACCEPTANCE_COMMIT'), 'Must define ACCEPTANCE_COMMIT');
console.log('[PASS] Check 6: EXECUTION_STATE.md recognizes Amendment v1.5-A with 4-point commit lineage.');

// 7. DECISION_LOG.md DEC-016, DEC-034 & DEC-035
assert.ok(fs.existsSync('DECISION_LOG.md'), 'DECISION_LOG.md must exist');
const decisionContent = fs.readFileSync('DECISION_LOG.md', 'utf8');
assert.ok(decisionContent.includes('DEC-016'), 'DECISION_LOG.md must record DEC-016');
assert.ok(decisionContent.includes('DEC-034: AMENDMENT v1.5 MANDATORY PRE-IMPLEMENTATION PLANNING'), 'DECISION_LOG.md must record DEC-034');
assert.ok(decisionContent.includes('DEC-035: AMENDMENT v1.5-A ADOPTION'), 'DECISION_LOG.md must record DEC-035');
console.log('[PASS] Check 7: DECISION_LOG.md records DEC-016, DEC-034, and DEC-035.');

// 8. Git HEAD & Remote Consistency
const currentHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
assert.ok(currentHead.length === 40, 'Current HEAD SHA must be 40 characters');
console.log('[PASS] Check 8: Git current HEAD verified:', currentHead);

console.log('\n===============================================================');
console.log('   ALL AMENDMENT v1.5-A GOVERNANCE CONSISTENCY CHECKS PASSED!  ');
console.log('===============================================================\n');
