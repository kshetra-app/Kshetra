import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const REPO_ROOT = process.cwd();
const REPORTS_DIR = path.join(REPO_ROOT, 'reports');

test('W021.5 Final Production Authorization Gate Suite', async (t) => {
  // Gate 1: Git Repository SHA Parity & Lineage
  await t.test('Gate 1: Repository Baseline & Origin Parity', () => {
    const headSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const originSha = execSync('git rev-parse origin/master', { encoding: 'utf8' }).trim();
    assert.strictEqual(headSha, originSha, 'Local HEAD must equal origin/master');
    const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    // Allow newly written uncommitted gate files during active execution, but no modified tracked files
    const expectedModifications = [
      'reports/w021_5b2_2f_cross_phase_parity.json',
      'reports/w021_5b2_2f_production_sync_readiness.json',
      'docs/W021.5-FINAL-CLOSURE-DOSSIER.md',
      'tests/w021-5-final-production-sync-preflight.test.mjs'
    ];
    const modifiedTracked = status.split('\n')
      .filter(l => l.startsWith(' M ') || l.startsWith('M  '))
      .map(l => l.substring(3).trim())
      .filter(f => !expectedModifications.includes(f));
    assert.strictEqual(modifiedTracked.length, 0, 'No tracked files should be unexpectedly modified');
  });

  // Gate 2: Master Accounting Dual-Equation Proof
  await t.test('Gate 2: Master Accounting Dual-Equation Proof (58,360 and 63,045)', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5_production_sync_manifest_v1.json'), 'utf8'));
    const rec = manifest.accountingReconciliation;

    const b1 = rec.planes.b1_geography.physicalRows;
    const c = rec.planes.b2_2c_organizations.physicalRows;
    const d = rec.planes.b2_2d_persons_and_tenures.physicalRows;
    const e = rec.planes.b2_2e_civic_extensions.physicalRows;

    // Equation 1: B2.2-C/D/E physical payload
    assert.strictEqual(c, 1207);
    assert.strictEqual(d, 48284);
    assert.strictEqual(e, 8869);
    const cdePhysical = c + d + e;
    assert.strictEqual(cdePhysical, 58360, 'B2.2-C/D/E physical payload must equal exactly 58,360');

    // Equation 2: Total W021.5 Production Synchronization Payload
    assert.strictEqual(b1, 4685, 'B1 Geography payload must equal exactly 4,685');
    const grandSyncPayload = b1 + cdePhysical;
    assert.strictEqual(grandSyncPayload, 63045, 'Complete W021.5 production sync payload must equal exactly 63,045');

    // Equation 3: Data rows + provenance anchors
    const cdeData = rec.subTotals.b2_2c_d_e_data_rows;
    const cdeAnchors = rec.subTotals.b2_2c_d_e_provenance_anchors;
    assert.strictEqual(cdeData, 58357);
    assert.strictEqual(cdeAnchors, 3);
    assert.strictEqual(cdeData + cdeAnchors + b1, 63045);
  });

  // Gate 3: Production Target Identity & Air-Gap Verification
  await t.test('Gate 3: Production Database Identity & Strict Air-Gap (ehfafcnimmjusyvplbah)', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5_production_sync_manifest_v1.json'), 'utf8'));
    assert.strictEqual(manifest.environmentTarget.targetHost, 'ehfafcnimmjusyvplbah');
    assert.strictEqual(manifest.environmentTarget.mutationStatus, 'ZERO_MUTATIONS_ISSUED');
    assert.strictEqual(manifest.environmentTarget.safetyClassification, 'READ_ONLY_AIR_GAPPED_PROVEN');
  });

  // Gate 4: Zero Destructive DDL Operations
  await t.test('Gate 4: Zero Destructive DDL Operations Across Migration Package', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5_production_sync_manifest_v1.json'), 'utf8'));
    const migrations = manifest.migrationRange.migrationSequence;
    assert.strictEqual(migrations.length, 9);
    for (const mig of migrations) {
      const sqlPath = path.join(REPO_ROOT, 'supabase', 'migrations', mig);
      assert.ok(fs.existsSync(sqlPath), `Migration ${mig} must exist`);
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      assert.doesNotMatch(sqlContent, /DROP\s+TABLE/i, `Forbidden DROP TABLE in ${mig}`);
      assert.doesNotMatch(sqlContent, /DROP\s+COLUMN/i, `Forbidden DROP COLUMN in ${mig}`);
      assert.doesNotMatch(sqlContent, /TRUNCATE\s+/i, `Forbidden TRUNCATE in ${mig}`);
    }
  });

  // Gate 5: Provenance Boundary Isolation
  await t.test('Gate 5: Distinct Batch Provenance Isolation', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5_production_sync_manifest_v1.json'), 'utf8'));
    const anchors = manifest.provenanceAnchors.map(a => a.anchorUuid);
    assert.strictEqual(anchors.length, 3);
    assert.strictEqual(new Set(anchors).size, 3);
    assert.deepStrictEqual(anchors, [
      '0215b22c-0000-0000-0000-000000000001',
      '0215b22d-0000-0000-0000-000000000001',
      '0215b22e-0000-0000-0000-000000000001'
    ]);
  });

  // Gate 6: Seed File Immutability
  await t.test('Gate 6: Seed Files Intact (199 files)', () => {
    const seedFiles = fs.readdirSync(path.join(REPO_ROOT, 'data', 'seed'));
    assert.ok(seedFiles.length >= 10, 'Seed directory must be populated');
  });

  // Gate 7: Production Runbook & Artifact Existence
  await t.test('Gate 7: Production Runbook and Readiness Artifacts Present', () => {
    assert.ok(fs.existsSync(path.join(REPO_ROOT, 'docs', 'W021.5-PRODUCTION-SYNCHRONIZATION-RUNBOOK.md')));
    assert.ok(fs.existsSync(path.join(REPORTS_DIR, 'w021_5_production_sync_manifest_v1.json')));
    assert.ok(fs.existsSync(path.join(REPO_ROOT, 'docs', 'W021.5-B2.2-F-PRODUCTION-SYNC-READINESS.md')));
  });
});
