import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(read(relativePath));
const exec = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

const reportPath = 'reports/gov_02_continuity_reconciliation.json';
const report = readJson(reportPath);
const db = readJson('reports/w021_5_database_execution_register.json');
const blockers = readJson('reports/w021_5_master_blocker_register.json');
const external = readJson('reports/w021_5_external_gate_register.json');
const d153 = readJson('reports/w021_5_directive_153_defect_ledger.json');
const state = read('EXECUTION_STATE.md');
const acceptance = read('ACCEPTANCE_REGISTER.md');
const defects = read('DEFECT_REGISTER.md');
const decisions = read('DECISION_LOG.md');
const releases = read('RELEASE_REGISTER.md');
const packageJson = readJson('package.json');

const TAXONOMY = [
  'authored',
  'locally validated',
  'prepared',
  'authorized',
  'executed',
  'independently corroborated',
  'formally accepted'
];

function pass(label) {
  console.log('[PASS] ' + label);
}

function migrationFiles() {
  return fs.readdirSync(path.join(ROOT, 'supabase/migrations'))
    .filter((name) => name.endsWith('.sql'))
    .sort();
}

function parseDate(value, label) {
  const timestamp = Date.parse(value);
  assert.ok(Number.isFinite(timestamp), label + ' must be a valid ISO date/timestamp; got ' + value);
  return timestamp;
}

function assertFreshDate(date, label, maxAgeDays = 7) {
  const value = parseDate(date, label);
  const now = Date.now();
  assert.ok(value <= now + 24 * 60 * 60 * 1000, label + ' cannot be in the future');
  assert.ok(now - value <= maxAgeDays * 24 * 60 * 60 * 1000,
    label + ' is stale (' + date + '). Refresh the active register or explicitly classify its evidence as historical.');
}

// 1. The report must use the exact canonical taxonomy and a real, reachable source snapshot.
assert.deepEqual(report.canonicalLifecycleTaxonomy, TAXONOMY, 'GOV-02 must preserve the seven canonical lifecycle states in order');
assert.equal(report.defectId, 'GOV-02');
assert.equal(report.severity, 'P0');
assert.ok(TAXONOMY.includes(report.status), 'Report status must use the canonical lifecycle taxonomy');
assert.match(report.sourceSnapshot.commit, /^[0-9a-f]{40}$/i, 'Source snapshot must be a full commit SHA');
exec(['cat-file', '-e', report.sourceSnapshot.commit + '^{commit}']);
assert.equal(exec(['merge-base', '--is-ancestor', report.sourceSnapshot.commit, 'HEAD']) || '', '', 'Source snapshot commit must be an ancestor of the checked-out commit');
pass('Canonical lifecycle taxonomy and immutable source-snapshot lineage');

// 2. Active continuity documents must be current; genuinely old evidence must be explicitly historical.
for (const file of ['EXECUTION_STATE.md', 'ACCEPTANCE_REGISTER.md', 'DEFECT_REGISTER.md', 'RELEASE_REGISTER.md']) {
  const content = read(file);
  const match = content.match(/^\*\*Last Updated:\*\*\s*(\d{4}-\d{2}-\d{2})\s*$/m);
  assert.ok(match, file + ' must declare Last Updated');
  assertFreshDate(match[1], file + ' Last Updated');
}
for (const [name, snapshot] of Object.entries(report.historicalSnapshots)) {
  assert.ok(snapshot.recordScope.startsWith('historical '), name + ' must be explicitly scoped as historical');
  assert.ok(snapshot.currentStatusSource, name + ' must point to the canonical current-status source');
  assert.ok(snapshot.stalenessTreatment, name + ' must explain how its old timestamp is treated');
}
assert.ok(blockers.continuityReconciliation?.snapshotDatePreserved, 'Old blocker snapshot must not be silently backdated');
assert.equal(blockers.continuityReconciliation?.currentStatusSource, 'reports/w021_5_database_execution_register.json');
assert.equal(external.continuityReconciliation?.recordScope, 'historical W021.5 external-gate snapshot');
assert.equal(d153.continuityReconciliation?.recordScope, 'historical W021.5 Directive 153 defect ledger');
pass('Active-register freshness and explicit historical-snapshot treatment');

// 3. Every checked-in SQL migration must be registered exactly once; additions/removals fail closed.
const onDiskMigrations = migrationFiles();
const registeredMigrations = [...report.registeredMigrations].sort();
assert.equal(new Set(registeredMigrations).size, registeredMigrations.length, 'Migration inventory contains duplicate registrations');
assert.deepEqual(registeredMigrations, onDiskMigrations,
  'Migration inventory drift: every supabase/migrations/*.sql file must be registered exactly once');
const latestMigration = onDiskMigrations.at(-1);
assert.equal(report.currentRepositoryState.currentFeatureMigration, 'supabase/migrations/' + latestMigration);
assert.equal(report.migrationFeatureMap[latestMigration], 'W022',
  'Latest W022 migration must be mapped to a registered current feature');
pass('SQL migration inventory completeness (' + onDiskMigrations.length + ' migrations)');

// 4. Current features/defects must have acceptance rows; the row cannot be missing while a defect is registered.
const acceptanceIds = new Set([...acceptance.matchAll(/^\|\s*\*\*([A-Z][A-Z0-9.-]*)\*\*/gm)].map((match) => match[1]));
for (const feature of report.registeredFeatures) {
  assert.ok(acceptanceIds.has(feature.acceptanceRegisterRow),
    'Missing acceptance row for registered feature/defect ' + feature.id + ' (' + feature.acceptanceRegisterRow + ')');
  assert.ok(TAXONOMY.includes(feature.lifecycleState), feature.id + ' has an invalid lifecycleState');
}
for (const requiredId of ['W021.5', 'W022', 'GOV-01', 'GOV-02']) {
  assert.ok(acceptanceIds.has(requiredId), 'Acceptance register is missing required current milestone/defect row ' + requiredId);
}
for (const defectId of ['GOV-01', 'GOV-02']) {
  assert.match(defects, new RegExp('^\\| \\*\\*' + defectId + '\\\\*\\* \\| \\*\\*P0\\*\\*', 'm'),
    'Defect register is missing the P0 row for ' + defectId);
}
assert.match(defects, /^## GOV-02 — Continuity Registers Stale \/ Conflicting Blocker Evidence$/m);
assert.match(defects, /^\| \*\*GOV-02\*\* \| \*\*P0\*\*/m);
assert.match(state, /Continuity \/ Evidence Integrity Summary \(GOV-02/);
assert.match(decisions, /^### DEC-045: GOV-02/m);
pass('Registered feature/defect acceptance-row coverage');

// 5. Canonical lifecycle fields must use only the seven permitted labels; legacy detail states may remain descriptive.
assert.deepEqual(db.lifecycleTaxonomy.map((item) => item.state), TAXONOMY);
for (const artifact of db.artifacts) {
  assert.ok(TAXONOMY.includes(artifact.lifecycleState),
    artifact.artifactId + ' lifecycleState is not canonical');
  assert.equal(artifact.executed, false,
    artifact.artifactId + ' must not claim execution when all execution counters are zero');
  assert.equal(artifact.independentlyCorroborated, false,
    artifact.artifactId + ' cannot claim independent corroboration without recorded independent evidence');
  assert.equal(artifact.formallyAccepted, false,
    artifact.artifactId + ' cannot claim parent-milestone formal acceptance');
}
assert.ok(report.registeredFeatures.every((f) => TAXONOMY.includes(f.lifecycleState)));
pass('Canonical lifecycle values and non-conflation of implementation/execution/acceptance');

// 6. Blocker percentages, formal acceptance and environment counters must agree across all source-of-truth reports.
const s = db.databaseDependentTasksSummary;
const w = report.w0215Evidence;
const e = external.accountingSummary;
const l = d153.accountingSummary;
const totalWeight = s.repoVerifiedEarnedPercent + s.databasePendingPercent + s.blockedPercent + s.unimplementedPercent;
assert.equal(s.totalMilestoneWeight, 100);
assert.equal(totalWeight, 100, 'W021.5 weight accounting must conserve 100%');
assert.equal(s.repoVerifiedEarnedPercent, w.repoVerifiedEarnedPercent);
assert.equal(s.databasePendingPercent, w.databasePendingPercent);
assert.equal(s.blockedPercent, w.blockedOnExternalGatesPercent);
assert.equal(s.unimplementedPercent, w.unimplementedPercent);
assert.equal(s.formalAcceptancePercent, 0, 'Formal W021.5 parent milestone acceptance must remain 0 until explicitly evidenced');
assert.equal(w.formalAcceptancePercent, 0);
assert.equal(e.repositoryVerifiedEarned, w.repoVerifiedEarnedPercent);
assert.equal(e.unexecutedDatabasePending, w.databasePendingPercent);
assert.equal(e.blockedOnExternalGates, w.blockedOnExternalGatesPercent);
assert.equal(e.totalMilestoneAllocation, 100);
assert.equal(e.formalAcceptance, 0);
assert.equal(l.repoVerifiedEarnedPercent, w.repoVerifiedEarnedPercent);
assert.equal(l.unexecutedDatabasePendingPercent, w.databasePendingPercent);
assert.equal(l.blockedOnExternalGatesPercent, w.blockedOnExternalGatesPercent);
assert.equal(l.formalCtcAcceptancePercent, 0);
assert.equal(blockers.continuityReconciliation.currentStatusSource, 'reports/w021_5_database_execution_register.json');
pass('Cross-report blocker totals and the 100% weight-conservation invariant');

// 7. Directive 153 zero-access facts must be consistent; neither W021.5 nor W022 may gain environment permission by implication.
assert.equal(w.stagingExecutionAuthorized, false);
assert.equal(w.productionExecutionAuthorized, false);
assert.equal(s.stagingExecutionAuthorized, false);
assert.equal(s.productionExecutionAuthorized, false);
assert.equal(w.stagingQueries, 0);
assert.equal(w.stagingMutations, 0);
assert.equal(w.productionQueries, 0);
assert.equal(w.productionMutations, 0);
for (const key of ['totalStagingQueries', 'totalStagingMutations', 'totalProductionQueries', 'totalProductionMutations']) {
  assert.equal(db.airGapBoundary[key], 0, 'Expected zero environment access counter: ' + key);
}
assert.equal(ledger?.airGapStatus?.stagingQueries, 0);
assert.equal(ledger?.airGapStatus?.stagingMutations, 0);
assert.equal(ledger?.airGapStatus?.productionQueries, 0);
assert.equal(ledger?.airGapStatus?.productionMutations, 0);
assert.match(state, /W022_STAGING_EXECUTION:\s+NOT AUTHORIZED/i);
assert.match(state, /W022_PRODUCTION:\s+STRICTLY AIR-GAPPED/i);
pass('Staging/production authorization and zero-access boundary');

// 8. Current W022 source, plan, authorization, migration, acceptance and release are separate lifecycle facts.
const w022 = report.currentRepositoryState;
assert.equal(w022.currentJob, 'W022');
assert.equal(w022.plan, 'PLAN-W022-REV-1.0.md Revision 4');
assert.equal(w022.featureLifecycleState, 'authored');
assert.equal(w022.featureAcceptanceState, 'not formally accepted');
assert.equal(w022.featureReleaseState, 'not released');
assert.equal(w022.stagingDatabaseExecution, 'not authorized');
assert.equal(w022.productionAccess, 'strictly air-gapped');
assert.equal(w022.externalWebhookActivation, 'not authorized');
assert.match(read('PLAN-W022-REV-1.0.md'), /Revision 4/i);
assert.match(read('CTO_DIRECTIVE_W022_IMPLEMENTATION_AUTHORIZATION_2026-10-25.md'), /STAGING database execution \/ deployment:\s*NOT AUTHORIZED/i);
assert.match(read('supabase/migrations/070_saas_webhook_engine.sql'), /Milestone:\s*W022/i);
assert.ok(acceptance.includes('**W022**') && /NOT ACCEPTED/.test(acceptance));
const w022Release = releases.split(/\r?\n/).find((line) => line.includes('v0.1.0-w022-pending'));
assert.ok(w022Release, 'Release register must contain the W022 pending row');
assert.match(w022Release, /NOT RELEASED/i);
assert.match(w022Release, /STAGING DB EXECUTION NOT AUTHORIZED/i);
assert.match(w022Release, /PRODUCTION air-gapped/i);
assert.match(w022Release, /Migration 070 is source only/i);
assert.ok(!/Open P0 \(Production Blockers\):\*\*\s*0/.test(state));
assert.ok(!/Open P1 \(Major Architectural Flaws\):\*\*\s*0/.test(state));
assert.ok(read('.github/workflows/ci.yml').includes('node tests/continuity-register-reconciliation.test.mjs'));
assert.equal(packageJson.name, 'kshetra', 'Unexpected root package identity; test is intended for the Kshetra monorepo');
pass('W022 implementation/authentication/execution/acceptance/release separation');

// 9. Recent commits since the source snapshot must be accounted for in governance records.
const recentCommits = exec(['log', '--format=%H%x09%s', report.sourceSnapshot.commit + '..HEAD'])
  .split(/\r?\n/).filter(Boolean).map((line) => {
    const tab = line.indexOf('\t');
    return { sha: line.slice(0, tab), subject: line.slice(tab + 1) };
  });
const decisionUpper = decisions.toUpperCase();
const unrecorded = recentCommits.filter(({ subject }) => {
  const normalized = subject.toUpperCase();
  return !decisionUpper.includes(normalized) &&
    !/(GOV-02|CONTINUITY REGISTER|REGISTER RECONCILIATION|CONTINUITY RECONCILIATION)/.test(normalized);
});
assert.deepEqual(unrecorded, [],
  'Commits after the recorded source snapshot must be explicitly reflected in DECISION_LOG.md or be clearly identified as the GOV-02 reconciliation: ' +
  unrecorded.map((c) => c.sha.slice(0, 12) + ' ' + c.subject).join('; '));
pass('Post-snapshot commit accountability (' + recentCommits.length + ' commits checked)');

console.log('\nGOV-02 continuity register reconciliation: PASS');
