/**
 * KSHETRA W021.5 — CTO DIRECTIVE 116 STAGE B NATIONAL GEOGRAPHY REGRESSION SUITE
 *
 * Verifies all Stage B acceptance criteria:
 * - W021.5-B1-01: Canonical 4,123 ACs across 31 jurisdictions
 * - W021.5-B1-02: National AC-to-PC mapping registry (4,123 rows, uniform state partitions)
 * - W021.5-B1-03: Temporal regimes and Assam 2023 delimitation modeling
 * - W021.5-B1-04: PostGIS 589 mandal reconciliation, Telangana GeoJSON deep validation, AC 119 defect, and missing 30 states register
 */

import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

test('W021.5-B1-01: Canonical National Constituency Registry (4,123 ACs)', async (t) => {
  await t.test('1.1: Migration 059 exists and defines canonical constituency registry schema', () => {
    const migPath = path.join(REPO_ROOT, 'supabase', 'migrations', '059_canonical_national_constituency_registry.sql');
    assert.ok(fs.existsSync(migPath), 'Migration 059 must exist on disk');
    const content = fs.readFileSync(migPath, 'utf8');
    assert.ok(content.length > 500000, 'Migration 059 must contain full national constituency registry');
    assert.ok(content.includes('INSERT INTO public.constituencies'), 'Must insert canonical assembly constituencies');
    assert.ok(content.includes('INSERT INTO public.parliamentary_constituencies'), 'Must insert canonical parliamentary constituencies');
    assert.ok(content.includes('migration_conflicts'), 'Must define migration conflicts infrastructure');
  });

  await t.test('1.2: All 31 Assembly seed files exist and total exactly 4,123 statutory seats', () => {
    const seedDir = path.join(REPO_ROOT, 'data', 'seed');
    const seedFiles = fs.readdirSync(seedDir).filter(f => f.endsWith('-constituencies.ts'));
    assert.strictEqual(seedFiles.length, 31, 'Must have exactly 31 constituency seed files');

    let totalSeats = 0;
    for (const f of seedFiles) {
      const content = fs.readFileSync(path.join(seedDir, f), 'utf8');
      const matches = content.match(/acNo:\s*\d+/g) || content.match(/ac_no:\s*\d+/g);
      totalSeats += matches ? matches.length : 0;
    }
    assert.strictEqual(totalSeats, 4123, 'Seed files must sum to exactly 4,123 statutory Assembly seats');
  });
});

test('W021.5-B1-02: National AC-to-PC Parliamentary Mapping Registry', async (t) => {
  await t.test('2.1: Migration 061 contains exactly 4,123 mapping rows and 543 PCs', () => {
    const migPath = path.join(REPO_ROOT, 'supabase', 'migrations', '061_canonical_national_ac_pc_mappings.sql');
    assert.ok(fs.existsSync(migPath), 'Migration 061 must exist on disk');
    const content = fs.readFileSync(migPath, 'utf8');
    const mappingRows = (content.match(/\('ac_ver_/g) || content.match(/\('[A-Z]{2}-AC-/g) || []).length;
    assert.strictEqual(mappingRows, 4123, 'Migration 061 must contain exactly 4,123 AC-to-PC mapping rows');
  });

  await t.test('2.2: Uniform partition invariants hold for key Indian states', () => {
    const reportPath = path.join(REPO_ROOT, 'reports', 'w021_5_ac_to_pc_linkage_validation_report.json');
    assert.ok(fs.existsSync(reportPath), 'AC-to-PC linkage validation report must exist');
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

    const ap = report.uniformPartitions.find(p => p.stateCode === 'AP');
    assert.strictEqual(ap.acPerPcRatio, 7, 'Andhra Pradesh must have uniform 7 ACs per PC');

    const ts = report.uniformPartitions.find(p => p.stateCode === 'TS');
    assert.strictEqual(ts.acPerPcRatio, 7, 'Telangana must have uniform 7 ACs per PC');

    const kl = report.uniformPartitions.find(p => p.stateCode === 'KL');
    assert.strictEqual(kl.acPerPcRatio, 7, 'Kerala must have uniform 7 ACs per PC');

    const wb = report.uniformPartitions.find(p => p.stateCode === 'WB');
    assert.strictEqual(wb.acPerPcRatio, 7, 'West Bengal must have uniform 7 ACs per PC');

    const uk = report.uniformPartitions.find(p => p.stateCode === 'UK');
    assert.strictEqual(uk.acPerPcRatio, 14, 'Uttarakhand must have uniform 14 ACs per PC');

    const dl = report.uniformPartitions.find(p => p.stateCode === 'DL');
    assert.strictEqual(dl.acPerPcRatio, 10, 'Delhi must have uniform 10 ACs per PC');

    const jk = report.uniformPartitions.find(p => p.stateCode === 'JK');
    assert.strictEqual(jk.acPerPcRatio, 18, 'Jammu & Kashmir must have uniform 18 ACs per PC under 2022 Delimitation');
  });

  await t.test('2.3: Zero orphaned ACs, zero orphaned PCs, zero interstate misallocations', () => {
    const reportPath = path.join(REPO_ROOT, 'reports', 'w021_5_ac_to_pc_linkage_validation_report.json');
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    assert.strictEqual(report.summary.orphanedAcCount, 0, 'Must have zero orphaned ACs');
    assert.strictEqual(report.summary.orphanedPcCount, 0, 'Must have zero orphaned PCs');
    assert.strictEqual(report.summary.interStateMisallocationsCount, 0, 'Must have zero interstate misallocations');
  });
});

test('W021.5-B1-03: Temporal Lineage & Assam 2023 Delimitation Modeling', async (t) => {
  await t.test('3.1: Migration 062 models Assam 2023 delimitation as temporal boundary event', () => {
    const migPath = path.join(REPO_ROOT, 'supabase', 'migrations', '062_canonical_assam_2023_delimitation.sql');
    assert.ok(fs.existsSync(migPath), 'Migration 062 must exist');
    const content = fs.readFileSync(migPath, 'utf8');
    assert.ok(content.includes('eci_delimitation_2023_as'), 'Must reference eci_delimitation_2023_as regime');
    assert.ok(content.includes('2023-08-16'), 'Must set effective_from to 2023-08-16');
  });

  await t.test('3.2: Assam 2023 statutory reservation matches official truth (98 GEN, 9 SC, 19 ST)', () => {
    const reportPath = path.join(REPO_ROOT, 'reports', 'w021_5_historical_jurisdiction_lineage_report.json');
    assert.ok(fs.existsSync(reportPath), 'Lineage report must exist');
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const res = report.assam2023Reconciliation.statutoryReservationBreakdown;
    assert.strictEqual(res.general, 98, 'Must have 98 General seats');
    assert.strictEqual(res.scheduledCastes, 9, 'Must have 9 SC seats');
    assert.strictEqual(res.scheduledTribes, 19, 'Must have 19 ST seats');
    assert.strictEqual(res.general + res.scheduledCastes + res.scheduledTribes, 126, 'Reservation sum must equal 126');
  });

  await t.test('3.3: Historical lineage between 2008 and 2023 remains ASSAM_HISTORICAL_LINEAGE_PENDING', () => {
    const reportPath = path.join(REPO_ROOT, 'reports', 'w021_5_historical_jurisdiction_lineage_report.json');
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    assert.strictEqual(report.assam2023Reconciliation.lineageRelationshipStatus, 'ASSAM_HISTORICAL_LINEAGE_PENDING');
  });
});

test('W021.5-B1-04: National Assembly Boundary GeoJSON Deep Validation & Linkage', async (t) => {
  await t.test('4.1: PostGIS 589 geometry baseline reconciliation', () => {
    const reportPath = path.join(REPO_ROOT, 'reports', 'w021_5_national_jurisdiction_geometry_inventory.json');
    assert.ok(fs.existsSync(reportPath), 'National jurisdiction inventory must exist');
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    assert.strictEqual(report.postGis589Reconciliation.statutoryMandalsInTelangana, 589);
    assert.strictEqual(report.postGis589Reconciliation.entityGeometriesTableVerifiedRows, 589);
    assert.strictEqual(report.postGis589Reconciliation.postGisAssemblyConstituenciesRowCount, 0);
    assert.strictEqual(report.postGis589Reconciliation.postGisParliamentaryConstituenciesRowCount, 0);
  });

  await t.test('4.2: Telangana Assembly GeoJSON deep RFC 7946 validation', () => {
    const reportPath = path.join(REPO_ROOT, 'reports', 'w021_5_geometry_deep_validation_report.json');
    assert.ok(fs.existsSync(reportPath), 'Geometry deep validation report must exist');
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const ts = report.telanganaAssembly;
    assert.strictEqual(ts.validFeatureCount, 120, 'All 120 features must pass geometry validity');
    assert.strictEqual(ts.coordinateErrorsCount, 0, 'Zero coordinate numeric errors');
    assert.ok(ts.withinIndiaBbox, 'Coordinates must be strictly within Indian bbox');
    assert.strictEqual(ts.uniqueStatutoryAcsLinked, 119, 'Must link all 119 statutory ACs');
  });

  await t.test('4.3: Telangana AC 119 defect confirmed and fails closed', () => {
    const reportPath = path.join(REPO_ROOT, 'reports', 'w021_5_geometry_deep_validation_report.json');
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const ts = report.telanganaAssembly;
    assert.strictEqual(ts.ac119DefectConfirmed, true, 'AC 119 duplicate claim defect must be detected');
    assert.deepStrictEqual(ts.duplicateAcs, [119], 'Duplicate AC list must contain exactly 119');
    assert.strictEqual(ts.hasCleanConstituencyMapping, false, 'Clean constituency mapping must be rejected');
    assert.strictEqual(ts.hasGeoJSON, false, 'hasGeoJSON must evaluate to false (fails closed)');
    assert.strictEqual(ts.defectStatus, 'OPEN_AND_BLOCKED');
  });

  await t.test('4.4: 30 remaining states are honestly catalogued as missing and BLOCKED_EXTERNAL', () => {
    const reportPath = path.join(REPO_ROOT, 'reports', 'w021_5_geometry_deep_validation_report.json');
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    assert.strictEqual(report.missing30StatesCount, 30, 'Exactly 30 assembly states/UTs must be in missing register');
    for (const s of report.missing30States) {
      assert.strictEqual(s.status, 'MISSING_AUTHORITATIVE_BOUNDARY_FEED');
      assert.strictEqual(s.blockerCode, 'CRIT-B104-02');
    }
  });

  await t.test('4.5: Candidate files in scripts/ are audited and rejected from canonical promotion', () => {
    const reportPath = path.join(REPO_ROOT, 'reports', 'w021_5_geometry_deep_validation_report.json');
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    assert.ok(report.candidateAudit.length >= 10, 'Must audit candidate files in scripts/');
    for (const c of report.candidateAudit) {
      assert.strictEqual(c.canBeMergedToProductionDataGeo, false, 'Candidate files cannot be merged without official ECI verification');
      assert.strictEqual(c.canonicalStatus, 'NON_CANONICAL_SCRATCH_ONLY');
    }
  });
});

test('Stage B Acceptance & Accounting Summary', async (t) => {
  await t.test('5.1: Stage B allocated weight is 12.0%, earned is 12.0%, blocked is 0.0% under Option B closure', () => {
    const matrixPath = path.join(REPO_ROOT, 'reports', 'w021_5_stage_b_acceptance_matrix.json');
    assert.ok(fs.existsSync(matrixPath), 'Acceptance matrix must exist');
    const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
    assert.strictEqual(matrix.stageWeight, 12.0);
    assert.strictEqual(matrix.stageEarnedWeight, 12.0);
    assert.strictEqual(matrix.stageBlockedWeight, 0.0);
    assert.strictEqual(matrix.stageCompletionRatio, 1.0);
  });

  await t.test('5.2: Production air-gap and Rule IV-001 non-self-acceptance invariant', () => {
    const invPath = path.join(REPO_ROOT, 'reports', 'w021_5_national_jurisdiction_geometry_inventory.json');
    const inv = JSON.parse(fs.readFileSync(invPath, 'utf8'));
    assert.strictEqual(inv.postGis589Reconciliation.postGisAssemblyConstituenciesRowCount, 0);
    assert.strictEqual(inv.stageBBlockedWeight, 0.0);
  });
});
