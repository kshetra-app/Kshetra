import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const scriptPath = path.join(root, 'scripts', 'verify-backup-recovery.mjs');
assert.ok(fs.existsSync(scriptPath), 'Static migration safety verifier must exist');

const verify = spawnSync(process.execPath, [scriptPath], { cwd: root, encoding: 'utf8' });
assert.equal(verify.status, 0, `Static verifier failed:\n${verify.stdout}\n${verify.stderr}`);
assert.match(verify.stdout, /STATIC MIGRATION SAFETY: PASS/);
assert.match(verify.stdout, /No live deployment or recovery claim is made/);

const migrationsDir = path.join(root, 'supabase', 'migrations');
const migrations = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql'));
assert.ok(migrations.length > 0, 'Canonical migrations folder must not be empty');
assert.ok(migrations.every(file => /^\d{3,4}_[a-z0-9_]+\.sql$/.test(file)), 'Every canonical migration needs a parseable version and filename');
assert.ok(migrations.every(file => fs.statSync(path.join(migrationsDir, file)).size > 0), 'Canonical migrations must not be empty');

const runbook = fs.readFileSync(path.join(root, 'RUNBOOK_BACKUP_RECOVERY.md'), 'utf8');
const config = fs.readFileSync(path.join(root, 'supabase', 'config.toml'), 'utf8');
assert.ok(runbook.includes('**Authoritative SQL source:** `supabase/migrations/`'));
assert.ok(runbook.includes('Staging') && runbook.includes('Production'));
assert.ok(runbook.includes('do **not**:') && runbook.includes('supabase db push --include-all'));
assert.ok(!/psql[^\r\n]*all_migrations_combined\.sql/i.test(runbook), 'Runbook must not tell operators to execute the stale bundle');
assert.ok(!/paste[^\r\n]*all_migrations_combined\.sql/i.test(runbook), 'Runbook must not tell operators to paste the stale bundle');
assert.match(config, /\[db\.seed\][\s\S]*?enabled\s*=\s*false[\s\S]*?sql_paths\s*=\s*\[\]/);
assert.ok(!fs.existsSync(path.join(root, 'supabase', 'seed.sql')));

const bundler = spawnSync(process.execPath, [path.join(root, 'scripts', 'bundle_migrations.mjs')], { cwd: root, encoding: 'utf8' });
assert.equal(bundler.status, 1, 'Retired migration bundler must fail closed');
assert.match(bundler.stderr, /Deprecated migration bundler/);

for (const stubName of ['all_migrations_combined.sql', 'staging_master_schema_and_seed.sql']) {
  const stub = fs.readFileSync(path.join(root, 'supabase', stubName), 'utf8');
  assert.match(stub, /RAISE EXCEPTION/);
  assert.doesNotMatch(stub, /\b(?:CREATE|INSERT|UPDATE|DELETE|ALTER)\s+(?:TABLE|POLICY|INDEX|INTO|PUBLICATION|ROLE)\b/i);
}

const legacyDir = path.join(root, 'supabase', 'legacy_artifacts');
assert.ok(fs.existsSync(path.join(legacyDir, 'all_migrations_combined_legacy.sql')));
assert.ok(fs.existsSync(path.join(legacyDir, 'staging_master_schema_and_seed_legacy.sql')));

const reportPath = path.join(root, 'reports', 'w005_backup_recovery_report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
assert.equal(report.evidenceMetadata.status, 'STATIC_CHECKS_PASS');
assert.equal(report.liveRecoveryStatus, 'NOT_PROVEN_BY_THIS_CHECK');
assert.equal(report.migrationFileCount, migrations.length);
assert.ok(report.checks.every(check => check.passed));

console.log(`PASS: ${migrations.length} canonical migration files, static guard, retired bundler, and honest evidence report.`);
