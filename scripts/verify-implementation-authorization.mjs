#!/usr/bin/env node
/**
 * GOV-01: fail-closed implementation authorization gate.
 *
 * Reads the actual pushed or pull-request commit range from GitHub Actions,
 * uses full local Git history, and checks the real changed-file set.
 * This script is intentionally W022-scoped; it does not grant authority to
 * unrelated jobs or retroactively authorize historical implementation.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const run = (args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const stateText = fs.readFileSync('EXECUTION_STATE.md', 'utf8');
const planText = fs.readFileSync('PLAN-W022-REV-1.0.md', 'utf8');
const directiveText = fs.readFileSync('CTO_DIRECTIVE_W022_IMPLEMENTATION_AUTHORIZATION_2026-10-25.md', 'utf8');
const decisionText = fs.readFileSync('DECISION_LOG.md', 'utf8');

function stateField(name) {
  const match = stateText.match(new RegExp('^' + name + ':\\s*(.+)$', 'm'));
  return match?.[1]?.trim() ?? null;
}
function resolveCommit(sha) {
  if (!/^[0-9a-f]{40}$/.test(sha || '')) return null;
  try {
    const actual = run(['rev-parse', '--verify', sha + '^{commit}']);
    return actual === sha ? actual : null;
  } catch { return null; }
}
function isAncestor(ancestor, descendant) {
  try { run(['merge-base', '--is-ancestor', ancestor, descendant]); return true; }
  catch { return false; }
}
function changedFiles(base, head) {
  if (!resolveCommit(base) || !resolveCommit(head)) throw new Error('GOV-01: base/head commit does not resolve; refusing to guess.');
  const raw = run(['diff', '--name-only', '--diff-filter=ACDMRTUXB', base + '...' + head]);
  return raw ? raw.split(/\r?\n/).filter(Boolean) : [];
}

const planStatus = stateField('PLAN_STATUS') || '';
const authorization = stateField('IMPLEMENTATION_AUTHORIZATION');
const authSha = stateField('IMPLEMENTATION_AUTHORIZATION_COMMIT');
const currentJob = stateField('CURRENT_JOB') || '';
const scope = stateField('IMPLEMENTATION_AUTHORIZATION_SCOPE') || '';
const historicalImplField = stateField('W022_EXISTING_IMPLEMENTATION_COMMIT') || '';
const historicalImpl = historicalImplField.split(/\s/)[0];

function requireCurrentW022Authorization() {
  if (!currentJob.startsWith('W022')) throw new Error('GOV-01: current job is not W022; this scoped gate will not authorize unrelated work.');
  if (!/^APPROVED\b/.test(planStatus)) throw new Error('GOV-01: current plan is not APPROVED.');
  if (authorization !== 'YES') throw new Error('GOV-01: IMPLEMENTATION_AUTHORIZATION must be YES.');
  if (!scope.includes('W022 REVISION 4 ONLY') || !scope.includes('PROSPECTIVE')) throw new Error('GOV-01: authorization scope missing or contradictory.');
  if (!/REVISION 4 — CTO RATIFIED/.test(planText) || !/IMPLEMENTATION PERMITTED PROSPECTIVELY/.test(planText)) throw new Error('GOV-01: W022 plan is not ratified for prospective implementation.');
  if (!/Revision 4 \(ratified prospectively/.test(directiveText)) throw new Error('GOV-01: authorization directive and plan revision disagree.');
  if (!directiveText.includes('PRODUCTION: STRICTLY AIR-GAPPED') || !directiveText.includes('Staging database execution / deployment:** NOT AUTHORIZED')) {
    throw new Error('GOV-01: production/staging boundary declaration missing.');
  }
  if (!decisionText.includes('DEC-044: W022 Prospective Implementation Authorization') || !decisionText.includes(authSha || '<missing>')) {
    throw new Error('GOV-01: explicit authorization decision/commit coordinate missing from DECISION_LOG.md.');
  }
  if (!resolveCommit(authSha)) throw new Error('GOV-01: authorization SHA is malformed, abbreviated, or unresolved.');
  if (!resolveCommit(historicalImpl)) throw new Error('GOV-01: historical implementation coordinate missing/unresolvable.');
  if (isAncestor(authSha, historicalImpl)) throw new Error('GOV-01: do not retroactively apply prospective authorization to historical W022 implementation.');
}

const planAllowedFiles = new Set([
  'apps/api/src/modules/webhooks/index.ts',
  'apps/api/src/modules/webhooks/schemas.ts',
  'apps/api/src/modules/webhooks/routes.ts',
  'apps/api/src/modules/webhooks/webhookService.ts',
  'apps/api/src/modules/webhooks/webhookDispatcher.ts',
  'apps/api/src/modules/webhooks/antiSsrfGuard.ts',
  'apps/api/src/modules/webhooks/hmacSigner.ts',
  'apps/api/src/modules/webhooks/queueProvider.ts',
  'apps/api/src/modules/webhooks/pgQueueProvider.ts',
  'supabase/migrations/070_saas_webhook_engine.sql',
  'supabase/migrations/verification_070_webhook_engine.sql',
  'apps/api/src/routes/saasV1.ts',
  'apps/api/openapi-saas-v1.yaml',
  'tests/webhooks-ssrf-guard.test.mjs',
  'tests/webhooks-hmac-signatures.test.mjs',
  'tests/webhooks-delivery-lifecycle.test.mjs',
  'tests/webhooks-api-endpoints.test.mjs',
  'tests/webhooks-pii-scrubber.test.mjs',
  'tests/saas-api-contract-drift.test.mjs',
  'tests/governance-authorization-gate.test.mjs',
  'tests/w022-governance-concordance.test.mjs',
  'tests/governance-consistency.test.mjs',
  'tests/governance-v16.test.mjs',
  'scripts/verify-implementation-authorization.mjs',
  'AGENT_EXECUTION_PROTOCOL.md',
  'EXECUTION_STATE.md',
  'PLAN-W022-REV-1.0.md',
  'CTO_DIRECTIVE_W022_IMPLEMENTATION_AUTHORIZATION_2026-10-25.md',
  'DECISION_LOG.md',
  'ACCEPTANCE_REGISTER.md',
  'DEFECT_REGISTER.md',
  'RELEASE_REGISTER.md',
  '.github/workflows/ci.yml'
]);
const immutablePrefixes = ['apps/mobile/', 'packages/shared/', 'supabase/migrations/001_', 'supabase/migrations/002_', 'supabase/migrations/003_', 'supabase/migrations/004_', 'supabase/migrations/005_', 'supabase/migrations/006_', 'supabase/migrations/007_', 'supabase/migrations/008_', 'supabase/migrations/009_'];
const immutableHistoricalMigrations = /^supabase\/migrations\/(?!070_saas_webhook_engine\.sql$|verification_070_webhook_engine\.sql$).+\.sql$/;
function isGovernanceOnly(files) {
  return files.every(f => f.startsWith('reports/') || f.startsWith('docs/') || f.startsWith('governance/') ||
    ['AGENT_EXECUTION_PROTOCOL.md','EXECUTION_STATE.md','PLAN-W022-REV-1.0.md','CTO_DIRECTIVE_W022_IMPLEMENTATION_AUTHORIZATION_2026-10-25.md','DECISION_LOG.md','ACCEPTANCE_REGISTER.md','DEFECT_REGISTER.md','RELEASE_REGISTER.md','.github/workflows/ci.yml','tests/governance-consistency.test.mjs','tests/governance-v16.test.mjs','tests/governance-authorization-gate.test.mjs','tests/w022-governance-concordance.test.mjs','scripts/verify-implementation-authorization.mjs'].includes(f));
}
function classifyFiles(files) {
  const productChanges = files.filter(f =>
    f.startsWith('apps/api/src/') ||
    f.startsWith('apps/api/openapi-saas-v1.yaml') ||
    f.startsWith('supabase/migrations/') ||
    f.startsWith('tests/webhooks-') ||
    f === 'tests/saas-api-contract-drift.test.mjs'
  );
  const governanceOnly = isGovernanceOnly(files);
  const unknown = files.filter(f =>
    !planAllowedFiles.has(f) &&
    !f.startsWith('reports/') &&
    !f.startsWith('docs/') &&
    !f.startsWith('governance/')
  );
  return { productChanges, governanceOnly, unknown };
}

function gateRange(base, head) {
  const files = changedFiles(base, head);
  if (!files.length) {
    console.log(`[PASS] GOV-01: no changed files in ${base}...${head}; no implementation authority inferred.`);
    return;
  }
  const { productChanges, governanceOnly, unknown } = classifyFiles(files);
  if (unknown.length) throw new Error('GOV-01: changed paths outside W022 approved scope or recognized governance artifacts: ' + unknown.join(', '));
  const forbidden = files.filter(f => immutablePrefixes.some(p => f.startsWith(p) || (p === 'packages/shared/' && f.startsWith(p))) || immutableHistoricalMigrations.test(f));
  if (forbidden.length) throw new Error('GOV-01: immutable mobile/shared/historical migration paths changed: ' + forbidden.join(', '));
  // Product/runtime changes must never be smuggled through a governance-only classification.
  if (productChanges.length && governanceOnly) {
    throw new Error('GOV-01: mixed product and governance changes must be evaluated as implementation changes.');
  }

  if (productChanges.length) {
    requireCurrentW022Authorization();
    if (!isAncestor(authSha, head)) throw new Error('GOV-01: prospective authorization is not an ancestor of implementation HEAD.');
    if (!isAncestor(base, head)) throw new Error('GOV-01: invalid/non-fast-forward implementation commit range.');
    const productNotInPlan = productChanges.filter(f => !planAllowedFiles.has(f));
    if (productNotInPlan.length) throw new Error('GOV-01: product implementation is outside ratified W022 plan: ' + productNotInPlan.join(', '));
    console.log('[PASS] GOV-01: prospective W022 implementation is authorized, descendant of authorization, and plan-scoped.');
    console.log('[SCOPE] Authorized product paths:', productChanges.join(', '));
  } else if (governanceOnly) {
    // Governance changes must not silently alter auth values except for an explicit, resolvable authorization directive/decision.
    if (authorization === 'YES' && authSha && !resolveCommit(authSha)) throw new Error('GOV-01: governance-only change leaves an invalid authorization coordinate.');
    console.log('[PASS] GOV-01: governance-only changes do not self-authorize product implementation.');
  } else {
    throw new Error('GOV-01: changed files cannot be safely classified; refusing to infer authorization.');
  }
  console.log(`[GOV-01 RANGE] ${base}...${head}`);
  console.log('[GOV-01 CHANGED FILES]', files);
}

function resolveRangeFromGitHubActions() {
  const eventName = process.env.GITHUB_EVENT_NAME || '';
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const event = eventPath && fs.existsSync(eventPath) ? JSON.parse(fs.readFileSync(eventPath, 'utf8')) : {};
  if (eventName === 'pull_request' || eventName === 'pull_request_target') {
    const base = event.pull_request?.base?.sha;
    const head = event.pull_request?.head?.sha;
    if (!base || !head) throw new Error('GOV-01: missing pull_request base/head SHA; fail closed.');
    return { base, head };
  }
  if (eventName === 'push') {
    const base = event.before;
    const head = event.after || process.env.GITHUB_SHA;
    if (!base || !head || /^0+$/.test(base)) {
      throw new Error('GOV-01: new branch/no previous push base; run explicit verification with BASE_SHA and HEAD_SHA before implementation.');
    }
    return { base, head };
  }
  const base = process.env.BASE_SHA;
  const head = process.env.HEAD_SHA || process.env.GITHUB_SHA;
  if (base && head) return { base, head };
  throw new Error('GOV-01: unable to determine an actual push/PR commit range; fail closed.');
}

try {
  const { base, head } = resolveRangeFromGitHubActions();
  gateRange(base, head);
} catch (err) {
  console.error(err?.stack || err);
  process.exitCode = 1;
}
