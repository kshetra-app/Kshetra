import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const results = [];

function check(name, passed, details) {
  results.push({ name, passed, details });
  console.log(`${passed ? '[PASS]' : '[FAIL]'} ${name}`);
  if (details) console.log(`       ${details}`);
}

const migrationsDir = path.join(root, 'supabase', 'migrations');
const migrationFiles = fs.existsSync(migrationsDir)
  ? fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql')).sort()
  : [];
const versions = migrationFiles.map(file => file.match(/^(\d{3,4})_[a-z0-9_]+\.sql$/)?.[1] ?? null);
const duplicateVersions = versions.filter((version, index) => version && versions.indexOf(version) !== index);
const invalidFiles = migrationFiles.filter((file, index) => {
  const stat = fs.statSync(path.join(migrationsDir, file));
  return !versions[index] || stat.size === 0;
});
check(
  'Canonical migration catalog is non-empty, uniquely versioned, and has no empty/invalid SQL files',
  migrationFiles.length > 0 && duplicateVersions.length === 0 && invalidFiles.length === 0,
  `${migrationFiles.length} repository SQL files; ${duplicateVersions.length} duplicate version(s); ${invalidFiles.length} invalid/empty file(s).`
);

const runbookPath = path.join(root, 'RUNBOOK_BACKUP_RECOVERY.md');
const runbook = fs.existsSync(runbookPath) ? fs.readFileSync(runbookPath, 'utf8') : '';
const executableBlocks = [...runbook.matchAll(/```[\s\S]*?```/g)].map(match => match[0]).join('\n');
const dangerousInstructions = [
  /supabase\s+db\s+push\s+--include-all/i,
  /psql[^\r\n]*all_migrations_combined\.sql/i,
  /paste[^\r\n]*all_migrations_combined\.sql/i
];
const hasUnsafeLiveGuidance = dangerousInstructions.some(pattern => pattern.test(executableBlocks));
const hasSingleSourceStatement = runbook.includes('**Authoritative SQL source:** `supabase/migrations/`') &&
  runbook.includes('historical evidence only');
check(
  'Recovery guidance names one canonical SQL source and blocks stale live-deployment paths',
  hasSingleSourceStatement && !hasUnsafeLiveGuidance,
  hasSingleSourceStatement && !hasUnsafeLiveGuidance
    ? 'The runbook identifies supabase/migrations and treats old bundles/packages as historical evidence.'
    : 'The runbook is missing the canonical-source statement or contains an unsafe live-deployment instruction.'
);

const bundleScriptPath = path.join(root, 'scripts', 'bundle_migrations.mjs');
const bundleScript = fs.existsSync(bundleScriptPath) ? fs.readFileSync(bundleScriptPath, 'utf8') : '';
const bundleScriptDisabled = /deprecated|retired/i.test(bundleScript) &&
  /process\.exitCode\s*=\s*1|process\.exit\(1\)/.test(bundleScript);
check(
  'Legacy migration bundler is fail-closed',
  bundleScriptDisabled,
  bundleScriptDisabled
    ? 'The old generator cannot overwrite or advertise the stale combined SQL artifact.'
    : 'The old generator can still produce a second, incomplete SQL path.'
);

const supabaseConfigPath = path.join(root, 'supabase', 'config.toml');
const supabaseConfig = fs.existsSync(supabaseConfigPath) ? fs.readFileSync(supabaseConfigPath, 'utf8') : '';
const localSeedDisabled = /\[db\.seed\][\s\S]*?enabled\s*=\s*false[\s\S]*?sql_paths\s*=\s*\[\]/.test(supabaseConfig) &&
  !fs.existsSync(path.join(root, 'supabase', 'seed.sql'));
check(
  'No missing or implicit local database seed source is configured',
  localSeedDisabled,
  localSeedDisabled
    ? 'Local Supabase resets do not point to a nonexistent seed.sql or an unreviewed seed set.'
    : 'Review the local Supabase seed setting and actual seed files.'
);

const evidencePath = path.join(root, 'reports', 'supabase_migration_history_reconciliation_2026-11-14.md');
const evidence = fs.existsSync(evidencePath) ? fs.readFileSync(evidencePath, 'utf8') : '';
const evidenceIsBounded = evidence.includes('fkpigozcqnmcvofuksar') &&
  evidence.includes('ehfafcnimmjusyvplbah') &&
  evidence.includes('105') && evidence.includes('106') &&
  /Production remains unchanged/i.test(evidence);
check(
  'Environment evidence is explicit and does not claim full history reconciliation',
  evidenceIsBounded,
  evidenceIsBounded
    ? 'Staging and Production are identified by project reference; the KYC change is scoped to Staging.'
    : 'The reconciliation record is missing project-scoped evidence or the Production boundary.'
);

const allPassed = results.every(result => result.passed);
const report = {
  evidenceMetadata: {
    title: 'Static migration safety verification',
    scope: 'Repository files and operator guidance only; no remote database or backup was queried.',
    verifiedAt: new Date().toISOString(),
    status: allPassed ? 'STATIC_CHECKS_PASS' : 'STATIC_CHECKS_FAIL'
  },
  liveRecoveryStatus: 'NOT_PROVEN_BY_THIS_CHECK',
  migrationFileCount: migrationFiles.length,
  checks: results
};

console.log(`\nSTATIC MIGRATION SAFETY: ${allPassed ? 'PASS' : 'FAIL'} (${results.filter(result => result.passed).length}/${results.length} checks)`);
console.log('Scope: static repository safety only. No live deployment or recovery claim is made.');

if (process.argv.includes('--write-report')) {
  const reportPath = path.join(root, 'reports', 'w005_backup_recovery_report.json');
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote static-only report: ${path.relative(root, reportPath)}`);
}

if (!allPassed) process.exitCode = 1;
