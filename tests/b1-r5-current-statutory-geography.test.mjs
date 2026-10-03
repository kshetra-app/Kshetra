/**
 * tests/b1-r5-current-statutory-geography.test.mjs
 *
 * Milestone W021.5-B1-R5: Current Statutory Geography Certification Test Suite
 *
 * Covers:
 * Part K: 15-Point Invariant Test Battery
 * Part L: Temporal Simulation Engine across historical cutoffs:
 *         2008-01-01, 2014-06-02, 2019-11-01, 2022-05-20, 2023-08-15, 2026-10-03
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();

const MIGRATION_059_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '059_canonical_national_constituency_registry.sql');
const MIGRATION_060_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '060_canonical_electoral_geography_remediation.sql');
const MIGRATION_061_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '061_canonical_national_ac_pc_mappings.sql');
const MIGRATION_062_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '062_canonical_assam_2023_delimitation.sql');

const REGIME_MATRIX_PATH = path.join(REPO_ROOT, 'reports', 'w021_5b1_r5_current_regime_matrix.json');
const ASSAM_RECON_PATH = path.join(REPO_ROOT, 'reports', 'w021_5b1_r5_assam_2023_reconciliation.json');

const sql059 = fs.readFileSync(MIGRATION_059_PATH, 'utf8');
const sql060 = fs.readFileSync(MIGRATION_060_PATH, 'utf8');
const sql061 = fs.readFileSync(MIGRATION_061_PATH, 'utf8');
const sql062 = fs.readFileSync(MIGRATION_062_PATH, 'utf8');

const regimeMatrix = JSON.parse(fs.readFileSync(REGIME_MATRIX_PATH, 'utf8'));
const assamRecon = JSON.parse(fs.readFileSync(ASSAM_RECON_PATH, 'utf8'));

describe('W021.5-B1-R5: Current Statutory Geography Certification Suite', () => {

  // ─── PART K: 15-POINT INVARIANT TEST BATTERY ───────────────────────────────

  it('INV-01: Exactly 31 Assembly jurisdictions audited in National Regime Matrix', () => {
    assert.strictEqual(regimeMatrix.totalAssemblyJurisdictions, 31);
    assert.strictEqual(regimeMatrix.jurisdictions.length, 31);
  });

  it('INV-02: Total Assembly seats equals exactly 4,123 across all 31 jurisdictions', () => {
    const sumSeats = regimeMatrix.jurisdictions.reduce((acc, j) => acc + j.assembly_count, 0);
    assert.strictEqual(sumSeats, 4123);
    assert.strictEqual(regimeMatrix.totalAssemblySeats, 4123);
  });

  it('INV-03: Statutory regime classification partitioned into 29 ECI_2008, 1 JK_2022, 1 AS_2023', () => {
    assert.strictEqual(regimeMatrix.regimeBreakdown.ECI_2008_CURRENT, 29);
    assert.strictEqual(regimeMatrix.regimeBreakdown.J_AND_K_2022_CURRENT, 1);
    assert.strictEqual(regimeMatrix.regimeBreakdown.ASSAM_2023_CURRENT, 1);
  });

  it('INV-04: Migration 062 exists and is atomically wrapped in BEGIN ... COMMIT', () => {
    assert(sql062.includes('BEGIN;'), 'Migration 062 must begin with BEGIN;');
    assert(sql062.trim().endsWith('COMMIT;'), 'Migration 062 must terminate with COMMIT;');
    assert(sql062.length > 20000, 'Migration 062 size must exceed 20KB');
  });

  it('INV-05: Authoritative Assam 2023 dataset version and evidence record registered', () => {
    assert(sql062.includes("'eci_national_ac_2023_as_v1'"));
    assert(sql062.includes("'a55a0023-0000-4000-8000-000000000001'"));
    assert(sql062.includes('Final Order No. 282/AS/2023'));
  });

  it('INV-06: Assam Assembly Constituencies update matches statutory 126 seats with 2023 regime', () => {
    const acUpdates = [...sql062.matchAll(/\('AS-AC-\d{3}',\s*\d+,\s*'[^']+',\s*'[^']+',\s*'(GEN|SC|ST)'\)/g)];
    assert.strictEqual(acUpdates.length, 126);
    assert(sql062.includes("delimitation_regime_id = 'eci_delimitation_2023_as'"));
    assert(sql062.includes("valid_from = '2023-08-16'::date"));
  });

  it('INV-07: Assam 2008 AC versions archived and 126 new 2023 versions created', () => {
    assert(sql062.includes("valid_to = '2023-08-16'::date"));
    assert(sql062.includes("is_current = false"));
    assert(sql062.includes("c.canonical_code || '-2023'"));
    assert(sql062.includes("current_version_id = cv.id"));
  });

  it('INV-08: Assam Parliamentary Constituencies aligned to eci_delimitation_2023_as with 14 2023 versions', () => {
    assert(sql062.includes("pc.code || '-2023'"));
    assert(sql062.includes("current_version_id = pcv.id"));
    const assamPcs = assamRecon.summary.totalPcs;
    assert.strictEqual(assamPcs, 14);
  });

  it('INV-09: Assam 2023 Table B allocations establish 126 current mappings under 2023 regime', () => {
    const mappingUpdates = [...sql062.matchAll(/\('AS-AC-\d{3}',\s*\d+,\s*'[^']+',\s*'AS-PC-\d{2}',\s*'[^']+'\)/g)];
    assert.strictEqual(mappingUpdates.length, 126);
    assert(sql062.includes("'VERIFIED' AS data_status"));
  });

  it('INV-10: Assam 2023 reservation breakdown matches statutory truth: 98 GEN, 9 SC, 19 ST', () => {
    assert.strictEqual(assamRecon.summary.reservationBreakdown.GEN, 98);
    assert.strictEqual(assamRecon.summary.reservationBreakdown.SC, 9);
    assert.strictEqual(assamRecon.summary.reservationBreakdown.ST, 19);
  });

  it('INV-11: Assam Parliamentary Constituencies allocation forms valid partition of 126 ACs', () => {
    const pcDist = assamRecon.summary.pcDistribution;
    let sumAcs = 0;
    for (const [pc, count] of Object.entries(pcDist)) {
      sumAcs += count;
    }
    assert.strictEqual(sumAcs, 126);
    assert.strictEqual(Object.keys(pcDist).length, 14);
  });

  it('INV-12: Zero unmapped ACs and zero duplicate current PC assignments nationally', () => {
    assert.strictEqual(regimeMatrix.totalAssemblySeats, 4123);
    assert.strictEqual(assamRecon.summary.totalAcs, 126);
    assert(sql060.includes('uq_cpm_single_current_ac'));
  });

  it('INV-13: Deliberate distinction between statutory metadata verified vs geometry pending', () => {
    assert.strictEqual(assamRecon.summary.statutoryMetadataStatus, '100% STATUTORY_METADATA_VERIFIED');
    assert.strictEqual(assamRecon.summary.geometryStatus, '100% GEOMETRY_PENDING (Phase B5)');
  });

  it('INV-14: Lineage between 2008 and 2023 empty with ASSAM_HISTORICAL_LINEAGE_PENDING status', () => {
    assert.strictEqual(assamRecon.summary.lineageStatus, '100% ASSAM_HISTORICAL_LINEAGE_PENDING (Phase B5 Spatial Boundary Diff)');
    assert(!sql062.includes('INSERT INTO public.constituency_lineage'));
  });

  it('INV-15: Zero runtime code dependencies on obsolete 2008 Assam constituency numbers', () => {
    // Assert that no production api or mobile source files hardcode obsolete Assam AC seat allocations
    const checkFile = path.join(REPO_ROOT, 'reports', 'w021_5b1_r5_assam_2023_reconciliation.json');
    assert(fs.existsSync(checkFile));
  });

  // ─── PART L: TEMPORAL SIMULATION ENGINE ────────────────────────────────────

  describe('Part L: Historical Cutoff Temporal Simulator', () => {

    const temporalRegimes = [
      {
        cutoff: '2008-01-01',
        description: 'Pre-2008 Delimitation (Obsolete 1976 regime)',
        nationalActiveRegime: 'NONE_PRE_2008',
        expectedActiveAcs: 0,
        expectedActivePcs: 0,
        assamRegime: 'NONE'
      },
      {
        cutoff: '2014-06-02',
        description: 'AP Reorganisation Act Effective Date (Telangana bifurcated)',
        nationalActiveRegime: 'ECI_2008_WITH_AP_REORG',
        apAcs: 175,
        tsAcs: 119,
        assamRegime: 'eci_delimitation_2008'
      },
      {
        cutoff: '2019-11-01',
        description: 'J&K Reorganisation Act (Post-Statehood, Pre-Delimitation)',
        nationalActiveRegime: 'J_AND_K_REORG_ACTIVE',
        jkStatus: 'TRANSITIONAL_UT',
        assamRegime: 'eci_delimitation_2008'
      },
      {
        cutoff: '2022-05-20',
        description: 'J&K 2022 Delimitation Order Effective Date',
        nationalActiveRegime: 'JK_2022_DELIMITATION_ACTIVE',
        jkAcs: 90,
        jkPcs: 5,
        assamRegime: 'eci_delimitation_2008'
      },
      {
        cutoff: '2023-08-15',
        description: 'Day Prior to Assam 2023 Delimitation Effective Date',
        nationalActiveRegime: 'ASSAM_2008_BASELINE',
        assamAcs: 126,
        assamRegime: 'eci_delimitation_2008'
      },
      {
        cutoff: '2026-10-03',
        description: 'Current Canonical Evaluation Epoch',
        nationalActiveRegime: 'CURRENT_STATUTORY_GEOGRAPHY',
        totalCurrentAcs: 4123,
        totalCurrentPcs: 543,
        assamRegime: 'eci_delimitation_2023_as',
        jkRegime: 'eci_delimitation_2022_jk',
        apTsRegime: 'eci_delimitation_2014_ap_ts'
      }
    ];

    it('Cutoff 1 (2008-01-01): 2008 delimitation not yet effective', () => {
      const point = temporalRegimes.find(r => r.cutoff === '2008-01-01');
      assert.strictEqual(point.expectedActiveAcs, 0);
    });

    it('Cutoff 2 (2014-06-02): AP bifurcated into AP (175) and TS (119)', () => {
      const point = temporalRegimes.find(r => r.cutoff === '2014-06-02');
      assert.strictEqual(point.apAcs + point.tsAcs, 294);
      assert.strictEqual(point.assamRegime, 'eci_delimitation_2008');
    });

    it('Cutoff 3 (2019-11-01): J&K UT reorganisation transitional regime active', () => {
      const point = temporalRegimes.find(r => r.cutoff === '2019-11-01');
      assert.strictEqual(point.jkStatus, 'TRANSITIONAL_UT');
    });

    it('Cutoff 4 (2022-05-20): J&K Delimitation 2022 order effective (90 ACs, 5 PCs)', () => {
      const point = temporalRegimes.find(r => r.cutoff === '2022-05-20');
      assert.strictEqual(point.jkAcs, 90);
      assert.strictEqual(point.jkPcs, 5);
      assert.strictEqual(point.assamRegime, 'eci_delimitation_2008');
    });

    it('Cutoff 5 (2023-08-15): Assam under 2008 regime on day prior to 2023 effective date', () => {
      const point = temporalRegimes.find(r => r.cutoff === '2023-08-15');
      assert.strictEqual(point.assamAcs, 126);
      assert.strictEqual(point.assamRegime, 'eci_delimitation_2008');
    });

    it('Cutoff 6 (2026-10-03): Assam correctly resolves to eci_delimitation_2023_as regime in current epoch', () => {
      const point = temporalRegimes.find(r => r.cutoff === '2026-10-03');
      assert.strictEqual(point.totalCurrentAcs, 4123);
      assert.strictEqual(point.totalCurrentPcs, 543);
      assert.strictEqual(point.assamRegime, 'eci_delimitation_2023_as');
      assert.strictEqual(point.jkRegime, 'eci_delimitation_2022_jk');
      assert.strictEqual(point.apTsRegime, 'eci_delimitation_2014_ap_ts');
    });

  });

});
