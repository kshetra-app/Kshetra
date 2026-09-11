import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

console.log('=== RUNNING BACKUP & RECOVERY REGRESSION TEST SUITE (JOB W005) ===\n');

// 1. Script Execution Test
console.log('Test 1: Executing verify-backup-recovery.mjs script...');
const scriptPath = path.resolve('scripts/verify-backup-recovery.mjs');
assert.ok(fs.existsSync(scriptPath), 'verify-backup-recovery.mjs script must exist');

const scriptRun = spawnSync('node', [scriptPath], { encoding: 'utf8' });
assert.strictEqual(scriptRun.status, 0, `Script must exit with 0. Output: ${scriptRun.stderr || scriptRun.stdout}`);
assert.ok(scriptRun.stdout.includes('BACKUP & RECOVERY VERIFICATION: PASS'), 'Script must report PASS');
console.log('[PASS] Test 1: verify-backup-recovery.mjs executed successfully with exit code 0.');

// 2. Migration Catalog Integrity
console.log('\nTest 2: Verifying 36 SQL migrations and combined bundle...');
const migrationsDir = path.resolve('supabase/migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
assert.strictEqual(files.length, 36, 'Must have exactly 36 SQL migration files');

const bundlePath = path.resolve('supabase/all_migrations_combined.sql');
assert.ok(fs.existsSync(bundlePath), 'Combined migration file must exist');
const bundleContent = fs.readFileSync(bundlePath, 'utf8');

for (const f of files) {
  assert.ok(bundleContent.includes(`START MIGRATION: ${f}`), `Bundle must contain marker for ${f}`);
}
console.log('[PASS] Test 2: All 36 migration files are accounted for in the combined bundle.');

// 3. Disaster Recovery Report Validation
console.log('\nTest 3: Validating reports/w005_backup_recovery_report.json...');
const reportPath = path.resolve('reports/w005_backup_recovery_report.json');
assert.ok(fs.existsSync(reportPath), 'Report file must exist');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

assert.strictEqual(report.evidenceMetadata.status, 'PASS', 'Report status must be PASS');
assert.strictEqual(report.checks.length, 6, 'Report must contain 6 verification checks');
assert.ok(report.checks.every(c => c.passed), 'All checks in report must be passed');
assert.ok(report.rtoRpoObjectives.pointInTimeRecoveryRPO, 'Must define PITR RPO');
assert.ok(report.rtoRpoObjectives.coldStartReconstructionRTO, 'Must define Cold Start RTO');
console.log('[PASS] Test 3: Structured report validated with 100% check compliance.');

// 4. Staging Master Schema Verification
console.log('\nTest 4: Validating staging master schema bootstrap file...');
const stagingMasterPath = path.resolve('supabase/staging_master_schema_and_seed.sql');
assert.ok(fs.existsSync(stagingMasterPath), 'staging_master_schema_and_seed.sql must exist');
const masterStat = fs.statSync(stagingMasterPath);
assert.ok(masterStat.size > 300000, 'Master schema file must exceed 300 KB');
console.log(`[PASS] Test 4: Master staging schema verified (${(masterStat.size / 1024).toFixed(1)} KB).`);

console.log('\n===============================================================');
console.log('   BACKUP & RECOVERY REGRESSION TEST SUITE PASSED 100%!   ');
console.log('===============================================================\n');
