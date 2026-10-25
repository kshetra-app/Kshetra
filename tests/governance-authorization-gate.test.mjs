import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const state = fs.readFileSync('EXECUTION_STATE.md', 'utf8');
const plan = fs.readFileSync('PLAN-W022-REV-1.0.md', 'utf8');
const directive = fs.readFileSync('CTO_DIRECTIVE_W022_IMPLEMENTATION_AUTHORIZATION_2026-10-25.md', 'utf8');
const decisions = fs.readFileSync('DECISION_LOG.md', 'utf8');

function field(name) {
  const match = state.match(new RegExp('^' + name + ':\\s*(.+)$', 'm'));
  return match ? match[1].trim() : null;
}
function resolveCommit(sha) {
  if (!/^[0-9a-f]{40}$/.test(sha || '')) return null;
  try { return execFileSync('git', ['rev-parse', '--verify', sha + '^{commit}'], { encoding: 'utf8' }).trim(); }
  catch { return null; }
}
function ancestor(a, b) {
  try { execFileSync('git', ['merge-base', '--is-ancestor', a, b], { stdio: 'ignore' }); return true; }
  catch { return false; }
}
function validate(candidate, context) {
  if (candidate.planStatus !== 'APPROVED') throw new Error('PLAN_NOT_APPROVED');
  if (candidate.authorization !== 'YES') throw new Error('IMPLEMENTATION_NOT_AUTHORIZED');
  if (!resolveCommit(candidate.authorizationCommit) || resolveCommit(candidate.authorizationCommit) !== candidate.authorizationCommit) throw new Error('AUTHORIZATION_SHA_INVALID');
  if (!context.planRatified) throw new Error('PLAN_NOT_RATIFIED');
  if (!context.decisionEvidence) throw new Error('AUTHORIZATION_DECISION_MISSING');
  if (!Array.isArray(candidate.changedFiles) || !candidate.changedFiles.length) throw new Error('CHANGED_FILES_MISSING');
  if (candidate.changedFiles.some(file => !context.approvedFiles.includes(file))) throw new Error('OUT_OF_SCOPE_CHANGE');
  if (!resolveCommit(candidate.implementationCommit)) throw new Error('IMPLEMENTATION_COMMIT_INVALID');
  if (!ancestor(candidate.authorizationCommit, candidate.implementationCommit)) throw new Error('AUTHORIZATION_NOT_ANCESTOR');
  return true;
}

const auth = field('IMPLEMENTATION_AUTHORIZATION_COMMIT');
const historic = (field('W022_EXISTING_IMPLEMENTATION_COMMIT') || '').split(/\\s/)[0];
const currentPlan = field('PLAN_STATUS') || '';
assert.equal(field('IMPLEMENTATION_AUTHORIZATION'), 'YES');
assert.match(currentPlan, /^APPROVED/);
assert.match(plan, /REVISION 4 — CTO RATIFIED/);
assert.match(plan, /IMPLEMENTATION PERMITTED PROSPECTIVELY/);
assert.match(directive, /Revision 4 \(ratified prospectively/);
assert.ok(decisions.includes('DEC-044: W022 Prospective Implementation Authorization'));
assert.ok(decisions.includes(auth), 'authorization coordinate must appear in decision register');
assert.ok(resolveCommit(auth), 'authorization commit must resolve to a Git commit');
assert.ok(ancestor(auth, 'HEAD'), 'authorization must precede current remediation commits');
assert.ok(resolveCommit(historic), 'historical implementation commit must remain resolvable');
assert.equal(ancestor(auth, historic), false, 'prospective directive must not retroactively authorize historical implementation');

const approvedFiles = [
  'apps/api/src/routes/saasV1.ts',
  'apps/api/src/modules/webhooks/webhookDispatcher.ts',
  'supabase/migrations/070_saas_webhook_engine.sql',
  'tests/governance-authorization-gate.test.mjs',
  'tests/w022-governance-concordance.test.mjs'
];
const base = {
  planStatus: 'APPROVED',
  authorization: 'YES',
  authorizationCommit: auth,
  implementationCommit: 'HEAD',
  changedFiles: [approvedFiles[0]]
};
const ctx = { planRatified: true, decisionEvidence: true, approvedFiles };
assert.equal(validate(base, ctx), true, 'authorized in-scope descendant must pass');
for (const [label, candidate, context, expected] of [
  ['authorization absent', {...base, authorization: 'NO'}, ctx, /IMPLEMENTATION_NOT_AUTHORIZED/],
  ['plan planning-only', {...base, planStatus: 'PLANNING ONLY'}, ctx, /PLAN_NOT_APPROVED/],
  ['malformed SHA', {...base, authorizationCommit: 'bad-sha'}, ctx, /AUTHORIZATION_SHA_INVALID/],
  ['unresolvable SHA', {...base, authorizationCommit: 'f'.repeat(40)}, ctx, /AUTHORIZATION_SHA_INVALID/],
  ['missing explicit decision', base, {...ctx, decisionEvidence: false}, /AUTHORIZATION_DECISION_MISSING/],
  ['plan not ratified', base, {...ctx, planRatified: false}, /PLAN_NOT_RATIFIED/],
  ['out-of-scope product change', {...base, changedFiles: ['apps/mobile/app/index.tsx']}, ctx, /OUT_OF_SCOPE_CHANGE/],
  ['empty changed-file list', {...base, changedFiles: []}, ctx, /CHANGED_FILES_MISSING/],
  ['non-ancestor authorization', {...base, authorizationCommit: historic, implementationCommit: historic}, ctx, /AUTHORIZATION_NOT_ANCESTOR/]
]) {
  assert.throws(() => validate(candidate, context), expected, label);
  console.log('[PASS] negative authorization case:', label);
}
console.log('[PASS] GOV-01 authorization gate positive/negative tests complete.');
