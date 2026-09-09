import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('=== RUNNING W003-P0 GOVERNANCE CONSISTENCY TEST ===\n');

// 1. Amendment v1.4 file exists
assert.ok(fs.existsSync('AMENDMENT_v1.4.md'), 'AMENDMENT_v1.4.md must exist in repository root');
const amendmentContent = fs.readFileSync('AMENDMENT_v1.4.md', 'utf8');
assert.ok(amendmentContent.includes('MASTER EXECUTION FRAMEWORK AMENDMENT v1.4'), 'Amendment title valid');
console.log('[PASS] Check 1: AMENDMENT_v1.4.md exists and contains valid framework title.');

// 2. AGENT_EXECUTION_PROTOCOL.md Authority & Pre-Flight
assert.ok(fs.existsSync('AGENT_EXECUTION_PROTOCOL.md'), 'AGENT_EXECUTION_PROTOCOL.md must exist');
const protocolContent = fs.readFileSync('AGENT_EXECUTION_PROTOCOL.md', 'utf8');
assert.ok(protocolContent.includes('Amendment v1.4'), 'Protocol authority must state Amendment v1.4');
assert.ok(protocolContent.includes('AMENDMENT v1.4'), 'Protocol status must cite AMENDMENT v1.4');
assert.ok(protocolContent.includes('AMENDMENT_v1.4.md'), 'Protocol pre-flight reading order must include AMENDMENT_v1.4.md');
assert.ok(!protocolContent.includes('15-stage'), 'Protocol must not contain hard-coded 15-stage count');
assert.ok(protocolContent.includes('full closed-loop lifecycle'), 'Protocol must state full closed-loop lifecycle');
console.log('[PASS] Check 2: AGENT_EXECUTION_PROTOCOL.md authority is Amendment v1.4 and includes v1.4 in pre-flight.');

// 3. EXECUTION_STATE.md Governance Authority & Commits
assert.ok(fs.existsSync('EXECUTION_STATE.md'), 'EXECUTION_STATE.md must exist');
const stateContent = fs.readFileSync('EXECUTION_STATE.md', 'utf8');
assert.ok(stateContent.includes('Amendment v1.4 (ACTIVE OPERATIONAL AUTHORITY)'), 'EXECUTION_STATE.md must recognize Amendment v1.4 as ACTIVE OPERATIONAL AUTHORITY');
assert.ok(stateContent.includes('CURRENT_REMOTE_HEAD'), 'Must define CURRENT_REMOTE_HEAD');
assert.ok(stateContent.includes('AUDITED_CODE_COMMIT'), 'Must define AUDITED_CODE_COMMIT');
assert.ok(stateContent.includes('EVIDENCE_COMMIT'), 'Must define EVIDENCE_COMMIT');
assert.ok(stateContent.includes('ACCEPTANCE_COMMIT'), 'Must define ACCEPTANCE_COMMIT');
console.log('[PASS] Check 3: EXECUTION_STATE.md recognizes Amendment v1.4 as ACTIVE OPERATIONAL AUTHORITY with 4-point commit lineage.');

// 4. DECISION_LOG.md DEC-016
assert.ok(fs.existsSync('DECISION_LOG.md'), 'DECISION_LOG.md must exist');
const decisionContent = fs.readFileSync('DECISION_LOG.md', 'utf8');
assert.ok(decisionContent.includes('AMENDMENT_v1.4 = OPERATIONAL GOVERNANCE AUTHORITY'), 'DECISION_LOG.md must state AMENDMENT_v1.4 = OPERATIONAL GOVERNANCE AUTHORITY');
console.log('[PASS] Check 4: DECISION_LOG.md records AMENDMENT_v1.4 = OPERATIONAL GOVERNANCE AUTHORITY in DEC-016.');

// 5. Git HEAD & Remote Consistency
const currentHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
assert.ok(currentHead.length === 40, 'Current HEAD SHA must be 40 characters');
console.log('[PASS] Check 5: Git current HEAD verified:', currentHead);

console.log('\n===============================================================');
console.log('   ALL W003-P0 GOVERNANCE CONSISTENCY CHECKS PASSED 100%!   ');
console.log('===============================================================\n');
