import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();

test('B2.2-F Final Closure & Scorecard Suite', async (t) => {
  await t.test('Metric 1: All 8 Master Regression Suites 100% Passing', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5b2_2f_master_regression.json')));
    assert.strictEqual(reg.testMatrixSummary.totalSuitesExecuted, 8);
    assert.strictEqual(reg.testMatrixSummary.totalTestsPassed, 120);
    assert.strictEqual(reg.testMatrixSummary.totalTestsFailed, 0);
    assert.strictEqual(reg.testMatrixSummary.passRate, '100.0%');
  });

  await t.test('Metric 2: Complete National Coverage Across 36 States/UTs and 31 Assemblies', () => {
    const jur = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5b2_2f_jurisdiction_integrity.json')));
    assert.strictEqual(jur.nationalCoverage.totalStatesAndUTs, 36);
    assert.strictEqual(jur.nationalCoverage.stateAssembliesRepresented, 31);
    assert.strictEqual(jur.nationalCoverage.assembliesCoveragePercent, 100.0);
    assert.strictEqual(jur.nationalCoverage.assemblyConstituenciesCount, 4142);
    assert.strictEqual(jur.nationalCoverage.parliamentaryConstituenciesCount, 543);
  });

  await t.test('Metric 3: Master Accounting Scorecard Verification (Dual Equation)', () => {
    const parity = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5b2_2f_cross_phase_parity.json')));
    const cdePhysical = parity.subtotals?.b2_2c_d_e_physical_inserts || parity.grandTotals?.totalPhysicalInserts;
    assert.strictEqual(cdePhysical, 58360);
    assert.strictEqual(parity.grandTotals.totalProductionSyncPayload, 63045);
    assert.strictEqual(parity.subtotals.b2_2c_d_e_data_records, 58357);
    assert.strictEqual(parity.subtotals.b2_2c_d_e_provenance_anchors, 3);
  });

  await t.test('Metric 4: Rule IV-001 Non-Self-Acceptance Gate Asserted', () => {
    const parity = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5b2_2f_cross_phase_parity.json')));
    assert.strictEqual(parity.governance, 'Master Execution Framework / Rule IV-001 Non-Self-Acceptance');
  });
});
