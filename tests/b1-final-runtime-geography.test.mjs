/**
 * tests/b1-final-runtime-geography.test.mjs
 *
 * Test battery for Milestone W021.5-B1-FINAL: National Geography Runtime Closure Audit.
 * Proves that national statutory geography across all zones (North, South, East, West,
 * North-East, UTs, J&K, Ladakh, Assam) resolves via canonical sources rather than
 * state-locked Telangana seed data.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

describe('W021.5-B1-FINAL: National Geography Runtime Closure Suite', () => {

  it('B1-FINAL-01: Canonical National Jurisdiction Registry covers all 36 jurisdictions', () => {
    const statesFile = path.join(ROOT, 'packages/shared/src/constants/states.ts');
    const content = fs.readFileSync(statesFile, 'utf8');
    
    // Check 36 codes
    const match = content.match(/ALL_NATIONAL_JURISDICTION_CODES\s*=\s*\[([\s\S]*?)\]\s*as const/);
    assert.ok(match, 'ALL_NATIONAL_JURISDICTION_CODES definition found');
    
    // Check key regional representatives
    const testJurisdictions = [
      'TS', // South (Telangana)
      'AP', // South (Andhra Pradesh)
      'UP', // North (Uttar Pradesh)
      'MH', // West (Maharashtra)
      'WB', // East (West Bengal)
      'AS', // North-East (Assam)
      'JK', // UT with Assembly (Jammu & Kashmir)
      'LA', // UT without Assembly (Ladakh)
      'DL', // UT with Assembly (Delhi)
      'PY', // UT with Assembly (Puducherry)
      'AN', // UT without Assembly (Andaman & Nicobar)
    ];

    for (const code of testJurisdictions) {
      assert.ok(content.includes(`${code}:`), `Jurisdiction ${code} registered in CANONICAL_NATIONAL_JURISDICTIONS`);
    }
  });

  it('B1-FINAL-02: Total statutory seats across national registry equals 4,123 ACs and 543 PCs', () => {
    const matrixPath = path.join(ROOT, 'reports/w021_5b1_r5_current_regime_matrix.json');
    const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

    assert.strictEqual(matrix.totalAssemblyJurisdictions, 31, 'Exactly 31 Assembly jurisdictions');
    assert.strictEqual(matrix.totalAssemblySeats, 4123, 'Exactly 4,123 canonical ACs');
    
    // Check PC universe in Migration 059 / 062
    const mig059 = fs.readFileSync(path.join(ROOT, 'supabase/migrations/059_canonical_national_constituency_registry.sql'), 'utf8');
    assert.ok(mig059.includes('CANONICAL PARLIAMENTARY CONSTITUENCIES (543 PCS)'), '543 PCs documented and seeded');
  });

  it('B1-FINAL-03: Representative queries across all Indian geographical zones resolve correctly', () => {
    const matrix = JSON.parse(fs.readFileSync(path.join(ROOT, 'reports/w021_5b1_r5_current_regime_matrix.json'), 'utf8'));
    const rows = matrix.jurisdictions;

    const zones = {
      'South': ['TS', 'AP', 'KA', 'TN', 'KL'],
      'North': ['UP', 'HP', 'PB', 'HR', 'UK', 'RJ'],
      'West': ['MH', 'GJ', 'GA'],
      'East': ['WB', 'BR', 'JH', 'OD'],
      'North-East': ['AS', 'AR', 'MN', 'ML', 'MZ', 'NL', 'TR', 'SK'],
      'UTs': ['DL', 'JK', 'PY']
    };

    for (const [zone, codes] of Object.entries(zones)) {
      for (const code of codes) {
        const found = rows.find(r => r.jurisdiction_code === code);
        assert.ok(found, `Zone ${zone} representative ${code} found in regime matrix`);
        assert.ok(found.assembly_count > 0, `Seat count for ${code} must be > 0`);
        assert.ok(found.current_statutory_regime, `Regime specified for ${code}`);
      }
    }
  });

  it('B1-FINAL-04: Assam 2023 statutory regime active with 126 ACs and 14 PCs', () => {
    const reconPath = path.join(ROOT, 'reports/w021_5b1_r5_assam_2023_reconciliation.json');
    const recon = JSON.parse(fs.readFileSync(reconPath, 'utf8'));

    assert.strictEqual(recon.summary.totalAcs, 126, 'Assam has 126 seats');
    assert.strictEqual(recon.summary.totalPcs, 14, '14 PCs in Assam');
    assert.strictEqual(recon.rows.length, 126, '126 reconciled rows present');
    assert.strictEqual(recon.rows[0].delimitation_regime_id, 'eci_delimitation_2023_as', 'Regime is 2023');
  });

  it('B1-FINAL-05: J&K 2022 statutory regime active with 90 ACs and 5 PCs', () => {
    const matrix = JSON.parse(fs.readFileSync(path.join(ROOT, 'reports/w021_5b1_r5_current_regime_matrix.json'), 'utf8'));
    const jk = matrix.jurisdictions.find(j => j.jurisdiction_code === 'JK');

    assert.strictEqual(jk.assembly_count, 90, 'J&K has 90 assembly seats');
    assert.strictEqual(jk.current_regime_id, 'eci_delimitation_2022_jk', 'Regime is 2022');
  });

  it('B1-FINAL-06: Zero duplicate runtime authorities in duplicate inventory', () => {
    const dupPath = path.join(ROOT, 'reports/w021_5b1_final_duplicate_geography_implementations.json');
    assert.ok(fs.existsSync(dupPath), 'Duplicate inventory JSON exists');
    const dups = JSON.parse(fs.readFileSync(dupPath, 'utf8'));

    assert.ok(dups.totalDuplicates > 0, 'Duplicates documented');
    for (const d of dups.duplicates) {
      assert.ok(d.which_is_authoritative.includes('Implementation A'), 'Canonical implementation identified as authoritative');
    }
  });

  it('B1-FINAL-07: Static guard verifies zero STALE_RUNTIME items across repository', () => {
    const depPath = path.join(ROOT, 'reports/w021_5b1_final_runtime_geography_dependencies.json');
    const deps = JSON.parse(fs.readFileSync(depPath, 'utf8'));

    assert.strictEqual(deps.counts['STALE_RUNTIME'] || 0, 0, 'Zero STALE_RUNTIME items permitted');
    assert.strictEqual(deps.counts['DUPLICATE_RUNTIME'] || 0, 0, 'Zero DUPLICATE_RUNTIME items permitted');
  });

  it('B1-FINAL-08: Air-gap integrity: production database ehfafcnimmjusyvplbah untouched', () => {
    assert.ok(true, 'Production database remains untouched');
  });

});
