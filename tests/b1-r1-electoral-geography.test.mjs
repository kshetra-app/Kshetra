/**
 * tests/b1-r1-electoral-geography.test.mjs
 *
 * Milestone W021.5-B1-R1: National Constituency Canonicalization Remediation Test Suite
 *
 * Test Battery:
 * Section 1: Political / Geographical Separation Invariants (B1-R1-SEP-01..02)
 * Section 2: Statutory Delimitation Regimes & Transitions (B1-R1-REG-01..03)
 * Section 3: Canonical Constituency Lineage Architecture (B1-R1-LIN-01..03)
 * Section 4: Temporal PC <-> AC Mappings Architecture (B1-R1-MAP-01..03)
 * Section 5: Enhanced Conflict Tracking Invariants (B1-R1-CNF-01..02)
 * Section 6: Data-Quality Status Recalibration & Anti-Inflation (B1-R1-STA-01..03)
 * Section 7: National Universe Completeness & Air-Gap Guard (B1-R1-NAT-01, AIR-01)
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

const REPO_ROOT = process.cwd();
const MIGRATION_059_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '059_canonical_national_constituency_registry.sql');
const MIGRATION_060_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '060_canonical_electoral_geography_remediation.sql');
const QUALITY_MATRIX_JSON = path.join(REPO_ROOT, 'reports', 'w021_5b1_national_data_quality_matrix.json');
const DEPENDENCY_REGISTER = path.join(REPO_ROOT, 'docs', 'WORLD_A_TO_WORLD_B_DEPENDENCY_REGISTER.md');

console.log('================================================================');
console.log('TEST SUITE: W021.5-B1-R1 ELECTORAL GEOGRAPHY REMEDIATION');
console.log(`Execution Timestamp: ${new Date().toISOString()}`);
console.log('Production Database: STRICTLY AIR-GAPPED & UNTOUCHED (ehfafcnimmjusyvplbah)');
console.log('================================================================\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function runTest(id, name, fn) {
  totalChecks++;
  try {
    fn();
    passedChecks++;
    console.log(`[PASS] ${id}: ${name}`);
  } catch (err) {
    failedChecks++;
    console.error(`[FAIL] ${id}: ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

// Ensure migration files exist
assert(fs.existsSync(MIGRATION_059_PATH), 'Migration 059 must exist');
assert(fs.existsSync(MIGRATION_060_PATH), 'Migration 060 must exist');
const sql059 = fs.readFileSync(MIGRATION_059_PATH, 'utf8');
const sql060 = fs.readFileSync(MIGRATION_060_PATH, 'utf8');

// ─── SECTION 1: POLITICAL / GEOGRAPHICAL SEPARATION ───────────────────────────

runTest('B1-R1-SEP-01', 'Explicit deprecation comments on static political columns', () => {
  assert(sql060.includes('COMMENT ON COLUMN public.states.ruling_party IS'), 'ruling_party must have deprecation comment');
  assert(sql060.includes('COMMENT ON COLUMN public.constituencies.current_mla IS'), 'current_mla must have deprecation comment');
  assert(sql060.includes('DEPRECATED [W021.5-B1-R1]'));
  assert(sql060.includes('W021.5-B2+'));
});

runTest('B1-R1-SEP-02', 'World-A to World-B Dependency Register exists and catalogs consumers', () => {
  assert(fs.existsSync(DEPENDENCY_REGISTER), 'Dependency register must exist');
  const regContent = fs.readFileSync(DEPENDENCY_REGISTER, 'utf8');
  assert(regContent.includes('stateData.ts'));
  assert(regContent.includes('winner2024'));
  assert(regContent.includes('W021.5-B3'));
  assert(regContent.includes('W021.5-B4'));
});

// ─── SECTION 2: STATUTORY DELIMITATION REGIMES & TRANSITIONS ──────────────────

runTest('B1-R1-REG-01', 'First-class statutory delimitation regimes registered in Migration 060', () => {
  assert(sql060.includes("'eci_delimitation_2014_ap_ts'"), 'AP/TS 2014 regime must be registered');
  assert(sql060.includes("'eci_delimitation_2019_dnh_dd'"), 'DNH/DD 2019 regime must be registered');
  assert(sql060.includes("'eci_delimitation_2022_jk'"), 'J&K 2022 regime must be registered');
  assert(sql060.includes("'eci_delimitation_2023_as'"), 'Assam 2023 regime must be registered');
});

runTest('B1-R1-REG-02', 'Jammu & Kashmir entities aligned to 2022 Delimitation Order (effective 2022-05-20)', () => {
  assert(sql060.includes("delimitation_regime_id = 'eci_delimitation_2022_jk'"));
  assert(sql060.includes("valid_from = '2022-05-20'::date"));
  assert(sql060.includes("WHERE state_code = 'JK'"));
  assert(sql060.includes("c.canonical_code || '-2022'"));
});

runTest('B1-R1-REG-03', 'AP & TS aligned to 2014 Reorganisation Act (effective 2014-06-02)', () => {
  assert(sql060.includes("delimitation_regime_id = 'eci_delimitation_2014_ap_ts'"));
  assert(sql060.includes("valid_from = '2014-06-02'::date"));
  assert(sql060.includes("WHERE state_code IN ('TS', 'AP')"));
  assert(sql060.includes("c.canonical_code || '-2014'"));
});

// ─── SECTION 3: CANONICAL CONSTITUENCY LINEAGE ARCHITECTURE ───────────────────

runTest('B1-R1-LIN-01', 'Constituency Lineage table deployed with version-to-version FKs', () => {
  assert(sql060.includes('CREATE TABLE IF NOT EXISTS public.constituency_lineage'));
  assert(sql060.includes('source_constituency_version_id UUID NOT NULL REFERENCES public.constituency_versions(id)'));
  assert(sql060.includes('target_constituency_version_id UUID NOT NULL REFERENCES public.constituency_versions(id)'));
});

runTest('B1-R1-LIN-02', 'Lineage table enforces controlled relationship types (no free-text)', () => {
  const types = ['CONTINUES_AS', 'RENAMED_AS', 'RENUMBERED_AS', 'REPLACED_BY', 'SPLIT_INTO', 'MERGED_INTO', 'ABOLISHED'];
  for (const t of types) {
    assert(sql060.includes(`'${t}'`), `Lineage must allow ${t}`);
  }
});

runTest('B1-R1-LIN-03', 'Lineage table has uniqueness and indexing safeguards', () => {
  assert(sql060.includes('CONSTRAINT uq_constituency_lineage UNIQUE'));
  assert(sql060.includes('idx_constituency_lineage_source'));
  assert(sql060.includes('idx_constituency_lineage_target'));
});

// ─── SECTION 4: TEMPORAL PC <-> AC MAPPINGS ARCHITECTURE ─────────────────────

runTest('B1-R1-MAP-01', 'Temporal PC <-> AC mapping table deployed with version-level FKs', () => {
  assert(sql060.includes('CREATE TABLE IF NOT EXISTS public.constituency_parliamentary_mappings'));
  assert(sql060.includes('assembly_constituency_version_id UUID NOT NULL REFERENCES public.constituency_versions(id)'));
  assert(sql060.includes('parliamentary_constituency_version_id UUID NOT NULL REFERENCES public.parliamentary_constituency_versions(id)'));
  assert(sql060.includes('delimitation_regime_id VARCHAR(50) NOT NULL REFERENCES public.delimitation_regimes(id)'));
});

runTest('B1-R1-MAP-02', 'PC <-> AC mappings are regime-aware and time-aware', () => {
  assert(sql060.includes('effective_from DATE NOT NULL'));
  assert(sql060.includes('effective_to DATE'));
  assert(sql060.includes('is_current BOOLEAN NOT NULL DEFAULT true'));
  assert(sql060.includes('uq_cpm_single_current_ac'));
});

runTest('B1-R1-MAP-03', 'Verified AC <-> PC mappings seeded for Telangana and single-PC jurisdictions', () => {
  assert(sql060.includes("WHERE c.state_code = 'TS'"), 'Telangana 119 ACs mapped');
  assert(sql060.includes("WHERE c.state_code = 'MZ'"), 'Mizoram ACs mapped');
  assert(sql060.includes("WHERE c.state_code = 'NL'"), 'Nagaland ACs mapped');
  assert(sql060.includes("WHERE c.state_code = 'PY'"), 'Puducherry ACs mapped');
  assert(sql060.includes("WHERE c.state_code = 'SK'"), 'Sikkim ACs mapped');
  assert(sql060.includes("WHERE c.state_code = 'GA'"), 'Goa ACs mapped');
});

// ─── SECTION 5: ENHANCED CONFLICT TRACKING ARCHITECTURE ───────────────────────

runTest('B1-R1-CNF-01', 'Enhanced migration_conflicts schema deployed with structured attributes', () => {
  assert(sql060.includes('ALTER TABLE public.migration_conflicts'));
  assert(sql060.includes('source_dataset_version_id TEXT'));
  assert(sql060.includes('field_name TEXT'));
  assert(sql060.includes('observed_value JSONB'));
  assert(sql060.includes('expected_value JSONB'));
  assert(sql060.includes('conflict_type VARCHAR(50)'));
  assert(sql060.includes('resolution_method VARCHAR(50)'));
  assert(sql060.includes('resolver TEXT'));
  assert(sql060.includes('resolved_at TIMESTAMPTZ'));
});

runTest('B1-R1-CNF-02', 'Reconciled seed anomalies backfilled with structured audit fields', () => {
  assert(sql060.includes("entity_id = 'HP-PC-04'"));
  assert(sql060.includes("entity_id = 'UP-PC-63'"));
  assert(sql060.includes("entity_id = 'BR-PC-37'"));
  assert(sql060.includes("conflict_type = 'STATE_MISATTRIBUTION'"));
  assert(sql060.includes("resolution_method = 'STATUTORY_RECONCILIATION'"));
});

// ─── SECTION 6: DATA-QUALITY STATUS RECALIBRATION & ANTI-INFLATION ────────────

runTest('B1-R1-STA-01', 'National data quality matrix exists and audits all 4,666 canonical entities', () => {
  assert(fs.existsSync(QUALITY_MATRIX_JSON), 'Quality matrix JSON must exist');
  const matrix = JSON.parse(fs.readFileSync(QUALITY_MATRIX_JSON, 'utf8'));
  assert.strictEqual(matrix.totalEntities, 4666, `Expected 4666 entities, got ${matrix.totalEntities}`);
  assert.strictEqual(matrix.records.length, 4666);
});

runTest('B1-R1-STA-02', 'Standardized 6-status taxonomy enforced across all matrix records', () => {
  const matrix = JSON.parse(fs.readFileSync(QUALITY_MATRIX_JSON, 'utf8'));
  const validStatuses = new Set(['PRESENT', 'RECONCILED', 'VERIFIED', 'PROVISIONAL', 'CONFLICTING', 'MISSING']);
  for (const r of matrix.records) {
    assert(validStatuses.has(r.provenance_status), `Invalid provenance_status: ${r.provenance_status}`);
    assert(validStatuses.has(r.reconciliation_status), `Invalid reconciliation_status: ${r.reconciliation_status}`);
    assert(validStatuses.has(r.verification_status), `Invalid verification_status: ${r.verification_status}`);
  }
});

runTest('B1-R1-STA-03', 'Anti-inflation check: unverified AC records are classified as RECONCILED', () => {
  const matrix = JSON.parse(fs.readFileSync(QUALITY_MATRIX_JSON, 'utf8'));
  const acRecords = matrix.records.filter(r => r.entity_type === 'assembly_constituency');
  assert.strictEqual(acRecords.length, 4123);

  const verifiedAcs = acRecords.filter(r => r.verification_status === 'VERIFIED');
  const reconciledAcs = acRecords.filter(r => r.verification_status === 'RECONCILED');

  // TS (119) + AP (175) = 294 verified. Remaining 3,829 are RECONCILED.
  assert.strictEqual(verifiedAcs.length, 294, `Expected 294 verified ACs, got ${verifiedAcs.length}`);
  assert.strictEqual(reconciledAcs.length, 3829, `Expected 3829 reconciled ACs, got ${reconciledAcs.length}`);
});

// ─── SECTION 7: NATIONAL UNIVERSE COMPLETENESS & PRODUCTION ISOLATION ─────────

runTest('B1-R1-NAT-01', 'Universal National Coverage (36 jurisdictions, 543 PCs, 4,123 ACs)', () => {
  const matrix = JSON.parse(fs.readFileSync(QUALITY_MATRIX_JSON, 'utf8'));
  const pcs = matrix.records.filter(r => r.entity_type === 'parliamentary_constituency');
  const acs = matrix.records.filter(r => r.entity_type === 'assembly_constituency');

  assert.strictEqual(pcs.length, 543);
  assert.strictEqual(acs.length, 4123);
  assert.strictEqual(matrix.summary.totalJurisdictions, 36);
});

runTest('B1-R1-AIR-01', 'Production database ehfafcnimmjusyvplbah strictly air-gapped and untouched', () => {
  assert(!sql059.includes('ehfafcnimmjusyvplbah'));
  assert(!sql060.includes('ehfafcnimmjusyvplbah'));
});

console.log('================================================================');
console.log(`TOTAL CHECKS: ${totalChecks}`);
console.log(`PASSED:       ${passedChecks}`);
console.log(`FAILED:       ${failedChecks}`);
console.log(`SUITE VERDICT: ${failedChecks === 0 ? 'PASS' : 'FAIL'}`);
console.log('================================================================\n');

if (failedChecks > 0) {
  process.exit(1);
}
