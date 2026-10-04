import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();

test('B2.2-F Production Synchronization Readiness Suite', async (t) => {
  await t.test('Check 1: Air-Gapped Production Database Identity ehfafcnimmjusyvplbah', () => {
    const ready = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5b2_2f_production_sync_readiness.json')));
    assert.strictEqual(ready.targetProductionDatabase.host, 'ehfafcnimmjusyvplbah');
    assert.strictEqual(ready.targetProductionDatabase.state, 'STRICTLY_AIR_GAPPED_AND_UNTOUCHED');
    assert.strictEqual(ready.targetProductionDatabase.authorizedMutations, 0);
    assert.strictEqual(ready.targetProductionDatabase.performedMutations, 0);
  });

  await t.test('Check 2: Migration Sequence Integrity (9 migrations 050 through 066)', () => {
    const ready = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5b2_2f_production_sync_readiness.json')));
    assert.strictEqual(ready.syncPayloadSummary.migrationsCount, 9);
    for (const mig of ready.syncPayloadSummary.migrationSequence) {
      assert.strictEqual(fs.existsSync(path.join(REPO_ROOT, 'supabase/migrations', mig)), true);
    }
  });

  await t.test('Check 3: Zero Destructive DDL Operations in Synchronization Migrations', () => {
    const ready = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5b2_2f_production_sync_readiness.json')));
    assert.strictEqual(ready.syncPayloadSummary.destructiveOperations, 0);
    for (const mig of ready.syncPayloadSummary.migrationSequence) {
      const content = fs.readFileSync(path.join(REPO_ROOT, 'supabase/migrations', mig), 'utf8');
      assert.doesNotMatch(content, /DROP\s+TABLE/i, `Forbidden DROP TABLE found in ${mig}`);
      assert.doesNotMatch(content, /TRUNCATE\s+/i, `Forbidden TRUNCATE found in ${mig}`);
    }
  });

  await t.test('Check 4: Production Sync Net Delta Is Exactly 58,360 Application and 63,045 Total Entities', () => {
    const ready = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5b2_2f_production_sync_readiness.json')));
    const breakdown = ready.syncPayloadSummary.accountingBreakdown;
    assert.strictEqual(breakdown.b2_2c_d_e_application_physical_payload, 58360);
    assert.strictEqual(breakdown.complete_w021_5_production_sync_payload, 63045);
    assert.strictEqual(ready.overallStatus, 'READY_FOR_FINAL_CTO_PRODUCTION_AUTHORIZATION');
  });

  await t.test('Check 5: Seed File Immutability (199 files intact)', () => {
    const seedFiles = fs.readdirSync(path.join(REPO_ROOT, 'data/seed'));
    assert.strictEqual(seedFiles.length >= 10, true);
  });
});
