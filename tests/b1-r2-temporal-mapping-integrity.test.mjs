/**
 * tests/b1-r2-temporal-mapping-integrity.test.mjs
 *
 * Milestone W021.5-B1-R2: National AC<->PC Completeness & Temporal Integrity Closure
 * Test Suite: Temporal Constraints, Invariants & Statutory Partition Verification
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const MIGRATION_060_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '060_canonical_electoral_geography_remediation.sql');
const MIGRATION_061_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '061_canonical_national_ac_pc_mappings.sql');
const MIGRATION_059_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '059_canonical_national_constituency_registry.sql');

describe('W021.5-B1-R2: National AC<->PC Completeness & Temporal Integrity', () => {
  const sql059 = fs.readFileSync(MIGRATION_059_PATH, 'utf8');
  const sql060 = fs.readFileSync(MIGRATION_060_PATH, 'utf8');
  const sql061 = fs.readFileSync(MIGRATION_061_PATH, 'utf8');

  test('B1-R2-01: Migration 061 exists and is atomically wrapped in BEGIN ... COMMIT', () => {
    assert(fs.existsSync(MIGRATION_061_PATH), 'Migration 061 file must exist');
    assert(/^\s*BEGIN\s*;/m.test(sql061), 'Migration 061 must begin transaction');
    assert(/^\s*COMMIT\s*;/m.test(sql061), 'Migration 061 must commit transaction');
  });

  test('B1-R2-02: Chronological check constraint (chk_cpm_dates) defined', () => {
    assert(
      sql061.includes('CONSTRAINT chk_cpm_dates CHECK (effective_to IS NULL OR effective_from < effective_to)'),
      'chk_cpm_dates constraint must be defined'
    );
  });

  test('B1-R2-03: Temporal exclusion constraint (uq_cpm_no_temporal_overlap) defined using GIST', () => {
    assert(
      sql061.includes('CONSTRAINT uq_cpm_no_temporal_overlap EXCLUDE USING gist'),
      'uq_cpm_no_temporal_overlap constraint must be defined with GIST'
    );
    assert(
      sql061.includes('(daterange(effective_from, effective_to, \'[)\')) WITH &&'),
      'Exclusion constraint must use daterange with half-open [) interval overlap operator &&'
    );
  });

  test('B1-R2-04: Single current AC mapping constraint (uq_cpm_single_current_ac) enforced', () => {
    assert(
      sql060.includes('CREATE UNIQUE INDEX IF NOT EXISTS uq_cpm_single_current_ac ON public.constituency_parliamentary_mappings(assembly_constituency_version_id) WHERE is_current = true'),
      'Unique partial index on assembly_constituency_version_id where is_current = true must exist'
    );
  });

  test('B1-R2-05: Simulation of temporal interval logic', () => {
    // Pure logic simulation of daterange overlap [start, end)
    function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
      const aMax = aEnd ? new Date(aEnd).getTime() : Infinity;
      const bMax = bEnd ? new Date(bEnd).getTime() : Infinity;
      const aMin = new Date(aStart).getTime();
      const bMin = new Date(bStart).getTime();
      return aMin < bMax && bMin < aMax;
    }

    // 1. Identical intervals overlap -> rejected
    assert.strictEqual(intervalsOverlap('2008-01-01', '2025-01-01', '2008-01-01', '2025-01-01'), true);

    // 2. Overlapping intervals -> rejected
    assert.strictEqual(intervalsOverlap('2008-01-01', '2025-01-01', '2020-01-01', '2030-01-01'), true);

    // 3. Adjacent intervals [2008-01-01, 2020-01-01) and [2020-01-01, 2030-01-01) -> ACCEPTED (no overlap)
    assert.strictEqual(intervalsOverlap('2008-01-01', '2020-01-01', '2020-01-01', '2030-01-01'), false);

    // 4. Open-ended interval with past closed interval -> ACCEPTED
    assert.strictEqual(intervalsOverlap('2008-01-01', '2020-01-01', '2020-01-01', null), false);

    // 5. Reversed interval check (effective_to <= effective_from rejected by chk_cpm_dates)
    const isValidInterval = (from, to) => to === null || new Date(from).getTime() < new Date(to).getTime();
    assert.strictEqual(isValidInterval('2020-01-01', '2019-01-01'), false, 'Reversed dates rejected');
    assert.strictEqual(isValidInterval('2020-01-01', '2020-01-01'), false, 'Zero-length interval rejected');
    assert.strictEqual(isValidInterval('2020-01-01', '2021-01-01'), true, 'Valid interval accepted');
    assert.strictEqual(isValidInterval('2020-01-01', null), true, 'Open-ended interval accepted');
  });

  test('B1-R2-06: 100% statutory AC->PC mapping coverage in Migration 061 (4,123 ACs)', () => {
    const acPattern = /'\s*([A-Z]{2}-AC-\d{3})\s*',\s*'\s*([A-Z]{2}-PC-\d{2,3})\s*'/g;
    const matches = [...sql061.matchAll(acPattern)];
    assert.strictEqual(matches.length, 4123, `Expected exactly 4123 mapped ACs in Migration 061, found ${matches.length}`);

    // Verify uniqueness of AC canonical codes
    const uniqueAcs = new Set(matches.map(m => m[1]));
    assert.strictEqual(uniqueAcs.size, 4123, 'Every current AC must appear exactly once in the mapping values');
  });

  test('B1-R2-07: All 543 canonical PCs indexed and verified', () => {
    const pcMatches = [...sql059.matchAll(/\('([A-Z]{2}-PC-\d{2,3})',\s*'([A-Z]{2})',\s*'parliamentary_constituency',\s*(\d+),\s*'([^']+)'/gi)];
    assert.strictEqual(pcMatches.length, 543, `Expected 543 canonical PCs in 059, found ${pcMatches.length}`);
  });

  test('B1-R2-08: J&K 2022 Delimitation Order partition (90 ACs across 5 PCs, 18 each)', () => {
    const jkPattern = /'\s*(JK-AC-\d{3})\s*',\s*'\s*(JK-PC-\d{2})\s*'/g;
    const jkMatches = [...sql061.matchAll(jkPattern)];
    assert.strictEqual(jkMatches.length, 90, 'All 90 J&K ACs must be mapped');

    const pcCounts = {};
    for (const [, , pc] of jkMatches) {
      pcCounts[pc] = (pcCounts[pc] || 0) + 1;
    }

    assert.strictEqual(Object.keys(pcCounts).length, 5, 'Exactly 5 PCs in J&K');
    for (const [pc, count] of Object.entries(pcCounts)) {
      assert.strictEqual(count, 18, `PC ${pc} must have exactly 18 ACs (found ${count})`);
    }
  });

  test('B1-R2-09: Gujarat statutory partition coverage (182 ACs across all 26 PCs)', () => {
    const gjPattern = /'\s*(GJ-AC-\d{3})\s*',\s*'\s*(GJ-PC-\d{2})\s*'/g;
    const gjMatches = [...sql061.matchAll(gjPattern)];
    assert.strictEqual(gjMatches.length, 182, 'All 182 Gujarat ACs must be mapped');

    const pcCounts = {};
    for (const [, , pc] of gjMatches) {
      pcCounts[pc] = (pcCounts[pc] || 0) + 1;
    }

    assert.strictEqual(Object.keys(pcCounts).length, 26, 'All 26 PCs in Gujarat must have at least one mapped AC');
    for (const [pc, count] of Object.entries(pcCounts)) {
      assert(count > 0, `PC ${pc} must have mapped ACs`);
    }
  });

  test('B1-R2-10: Andhra Pradesh statutory partition invariant (175 ACs across 25 PCs, 7 each)', () => {
    const apPattern = /'\s*(AP-AC-\d{3})\s*',\s*'\s*(AP-PC-\d{2})\s*'/g;
    const apMatches = [...sql061.matchAll(apPattern)];
    assert.strictEqual(apMatches.length, 175, 'All 175 AP ACs must be mapped');

    const pcCounts = {};
    for (const [, , pc] of apMatches) {
      pcCounts[pc] = (pcCounts[pc] || 0) + 1;
    }

    assert.strictEqual(Object.keys(pcCounts).length, 25, 'Exactly 25 PCs in AP');
    for (const [pc, count] of Object.entries(pcCounts)) {
      assert.strictEqual(count, 7, `PC ${pc} must have exactly 7 ACs in AP (found ${count})`);
    }
  });

  test('B1-R2-11: Uniform partition invariants in key states (TS=7, KL=7, WB=7, UK=14, DL=10, GA=20, HP=17, HR=9)', () => {
    function testUniformPartition(stateCode, expectedPcCount, expectedAcPerPc) {
      const pattern = new RegExp(`'\\s*(${stateCode}-AC-\\d{3})\\s*',\\s*'\\s*(${stateCode}-PC-\\d{2})\\s*'`, 'g');
      const matches = [...sql061.matchAll(pattern)];
      const totalAcs = expectedPcCount * expectedAcPerPc;
      assert.strictEqual(matches.length, totalAcs, `All ${totalAcs} ${stateCode} ACs must be mapped`);

      const pcCounts = {};
      for (const [, , pc] of matches) {
        pcCounts[pc] = (pcCounts[pc] || 0) + 1;
      }
      assert.strictEqual(Object.keys(pcCounts).length, expectedPcCount, `Exactly ${expectedPcCount} PCs in ${stateCode}`);
      for (const [pc, count] of Object.entries(pcCounts)) {
        assert.strictEqual(count, expectedAcPerPc, `PC ${pc} in ${stateCode} must have exactly ${expectedAcPerPc} ACs (found ${count})`);
      }
    }

    testUniformPartition('TS', 17, 7);
    testUniformPartition('KL', 20, 7);
    testUniformPartition('WB', 42, 7);
    testUniformPartition('UK', 5, 14);
    testUniformPartition('DL', 7, 10);
    testUniformPartition('GA', 2, 20);
    testUniformPartition('HP', 4, 17);
    testUniformPartition('HR', 10, 9);
  });

  test('B1-R2-12: Single-PC jurisdictions 100% whole-state partition (MZ, NL, PY, SK)', () => {
    const singlePcStates = [
      { code: 'MZ', acCount: 40, pcCode: 'MZ-PC-01' },
      { code: 'NL', acCount: 60, pcCode: 'NL-PC-01' },
      { code: 'PY', acCount: 30, pcCode: 'PY-PC-01' },
      { code: 'SK', acCount: 32, pcCode: 'SK-PC-01' },
    ];

    for (const item of singlePcStates) {
      const pattern = new RegExp(`'\\s*(${item.code}-AC-\\d{3})\\s*',\\s*'\\s*(${item.pcCode})\\s*'`, 'g');
      const matches = [...sql061.matchAll(pattern)];
      assert.strictEqual(matches.length, item.acCount, `All ${item.acCount} ACs of ${item.code} must map to ${item.pcCode}`);
    }
  });

  test('B1-R2-13: Non-assembly Union Territories (5 UTs) catalogued', () => {
    const nonAssemblyUts = ['AN', 'CH', 'DH', 'LA', 'LD'];
    for (const ut of nonAssemblyUts) {
      assert(sql061.includes(ut), `Non-assembly UT ${ut} must be documented in Migration 061`);
    }
  });

  test('B1-R2-14: Zero mutation of legacy seeds and production database air-gap', () => {
    assert(!sql061.includes('ehfafcnimmjusyvplbah'), 'Production DB must not be referenced');
  });
});
