import assert from 'node:assert/strict';
import fs from 'node:fs';

const state = fs.readFileSync('EXECUTION_STATE.md', 'utf8');
const plan = fs.readFileSync('PLAN-W022-REV-1.0.md', 'utf8');
const directive = fs.readFileSync('CTO_DIRECTIVE_W022_IMPLEMENTATION_AUTHORIZATION_2026-10-25.md', 'utf8');
const decisions = fs.readFileSync('DECISION_LOG.md', 'utf8');
const acceptance = fs.readFileSync('ACCEPTANCE_REGISTER.md', 'utf8');
const defects = fs.readFileSync('DEFECT_REGISTER.md', 'utf8');
const release = fs.readFileSync('RELEASE_REGISTER.md', 'utf8');

function field(name) {
  const match = state.match(new RegExp('^' + name + ':\\s*(.+)$', 'm'));
  return match ? match[1].trim() : null;
}
assert.ok(state.includes('W021.5_B2_2C_STATUS') && state.includes('W021_5_066_STATUS'), 'W021.5 historical coordinates must be retained');
assert.ok(state.includes('CURRENT_JOB:           W022'), 'W022 must be the current job');
assert.match(field('PLAN_STATUS') || '', /^APPROVED/);
assert.equal(field('IMPLEMENTATION_AUTHORIZATION'), 'YES');
assert.match(field('IMPLEMENTATION_AUTHORIZATION_COMMIT') || '', /^[0-9a-f]{40}$/);
assert.ok(field('IMPLEMENTATION_AUTHORIZATION_SCOPE')?.includes('PROSPECTIVE'));
assert.ok(field('W022_EXISTING_IMPLEMENTATION_COMMIT')?.startsWith('3ac3f1c0c14d51d60bab9f9d3e88a08716466124'));
assert.ok(state.includes('NOT RETROACTIVELY AUTHORIZED'));
assert.ok(state.includes('GOVERNANCE BREACH PRESERVED'));
assert.match(plan, /REVISION 4 — CTO RATIFIED/);
assert.match(plan, /IMPLEMENTATION PERMITTED PROSPECTIVELY/);
assert.match(directive, /Revision 4 \(ratified prospectively/);
assert.match(directive, /PRODUCTION: STRICTLY AIR-GAPPED/);
assert.match(directive, /Staging database execution \/ deployment:\*\* NOT AUTHORIZED/);
assert.ok(decisions.includes('DEC-044: W022 Prospective Implementation Authorization'));
assert.ok(decisions.includes(field('IMPLEMENTATION_AUTHORIZATION_COMMIT')));
assert.match(acceptance, /\*\*W022\*\*.*NOT ACCEPTED/);
assert.match(defects, /GOV-01[\s\S]*Status:\*\* OPEN/);
assert.match(release, /v0\.1\.0-w022-pending[\s\S]*NOT RELEASED/);
assert.match(release, /STAGING EXECUTION NOT AUTHORIZED/);
console.log('[PASS] W022 current state, plan, authorization, historical finding, registers, acceptance, release and environment boundaries are concordant.');
