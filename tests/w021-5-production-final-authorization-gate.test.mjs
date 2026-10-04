import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const REPO_ROOT = process.cwd();
const REPORTS_DIR = path.join(REPO_ROOT, 'reports');

test('W021.5 Final Production Authorization Gate Suite', async (t) => {
  // Gate 1: Git Repository SHA Parity & Canonical Manifest Coordinate
  await t.test('Gate 1: Repository Baseline & Canonical Manifest Coordinate', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5_production_sync_manifest_v1.json'), 'utf8'));
    const authoritativeCommit = manifest.gitCoordinates?.productionSyncExecutionCommit || manifest.gitCoordinates?.closureCommitSha;
    const headSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const originSha = execSync('git rev-parse origin/master', { encoding: 'utf8' }).trim();
    assert.strictEqual(headSha, originSha, 'Local HEAD must equal origin/master');
    assert.strictEqual(headSha, authoritativeCommit, 'Local HEAD must equal PRODUCTION_SYNC_EXECUTION_COMMIT');
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

  // Gate 6: Seed File Immutability (Cryptographic SHA-256 Verification)
  await t.test('Gate 6: Seed Files Intact & Bitwise Identical (Cryptographic SHA-256 Verification)', () => {
    const baseline = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5_seed_immutability_baseline.json'), 'utf8'));
    
    function getFiles(dir) {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
          results = results.concat(getFiles(file));
        } else {
          results.push(file);
        }
      });
      return results.sort();
    }

    const files = getFiles(path.join(REPO_ROOT, 'data', 'seed'));
    assert.strictEqual(files.length, baseline.totalFiles, `Expected ${baseline.totalFiles} seed files`);

    for (const f of files) {
      const rel = path.relative(REPO_ROOT, f).replace(/\\/g, '/');
      const content = fs.readFileSync(f);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      assert.strictEqual(hash, baseline.hashes[rel], `Seed hash mismatch in ${rel}`);
    }
  });

  // Gate 7: Production Runbook & Artifact Existence
  await t.test('Gate 7: Production Runbook and Readiness Artifacts Present', () => {
    assert.ok(fs.existsSync(path.join(REPO_ROOT, 'docs', 'W021.5-PRODUCTION-SYNCHRONIZATION-RUNBOOK.md')));
    assert.ok(fs.existsSync(path.join(REPORTS_DIR, 'w021_5_production_sync_manifest_v1.json')));
    assert.ok(fs.existsSync(path.join(REPO_ROOT, 'docs', 'W021.5-B2.2-F-PRODUCTION-SYNC-READINESS.md')));
  });
});
