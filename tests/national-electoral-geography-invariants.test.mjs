/**
 * tests/national-electoral-geography-invariants.test.mjs
 *
 * KSHETRA W021.5 — CTO DIRECTIVE 121
 * DETERMINISTIC TEST BATTERY: NATIONAL ELECTORAL GEOGRAPHY & INVARIANTS
 *
 * Verifies:
 * 1. 36 Constitutional Jurisdictions (28 States, 3 Assembly UTs, 5 Non-Assembly UTs)
 * 2. 4,123 Assembly Constituencies Seed Integrity & Sequential Indexing
 * 3. Migration 061 4,123 AC-to-PC Mappings & 543 Parliamentary Constituencies
 * 4. Assam Delimitation Order 2023 Temporal Model & Cutoffs (DEF-W021-02)
 * 5. Reusable 7-Tier Geographic Validation Pipeline (Telangana AC 119 & 30 Missing States)
 * 6. Precision Geographic Capability Model & Zero Premature Authoritative Claims in stateData.ts
 * 7. Candidate Files Rejection Proofs (scripts/ GeoJSONs)
 * 8. Delimitation Postal Zone Routing & Elimination of Silent TS Defaulting in delimitationService.ts
 * 9. Production Air-Gap & Rule IV-001 Non-Self-Acceptance
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  JURISDICTIONS,
  VALIDATION_TIERS,
  runNationalElectoralGeographyReproduction,
} from '../scripts/reproduce_national_electoral_geography.mjs';

const REPO_ROOT = process.cwd();

// Execute reproduction engine in-memory for live assertions
const repr = runNationalElectoralGeographyReproduction();

test('1. Constitutional Jurisdictions Invariants (36 Total)', () => {
  assert.strictEqual(JURISDICTIONS.length, 36, 'Must contain exactly 36 constitutional jurisdictions');
  const states = JURISDICTIONS.filter(j => j.type === 'STATE');
  const assemblyUts = JURISDICTIONS.filter(j => j.type === 'UT_WITH_ASSEMBLY');
  const nonAssemblyUts = JURISDICTIONS.filter(j => j.type === 'UT_NON_ASSEMBLY');

  assert.strictEqual(states.length, 28, 'Must contain exactly 28 States');
  assert.strictEqual(assemblyUts.length, 3, 'Must contain exactly 3 UTs with Legislative Assembly (DL, JK, PY)');
  assert.strictEqual(nonAssemblyUts.length, 5, 'Must contain exactly 5 Non-Assembly UTs (AN, CH, DH, LA, LD)');

  const totalStatutoryAcs = JURISDICTIONS.reduce((s, j) => s + j.statutoryAcSeats, 0);
  const totalStatutoryPcs = JURISDICTIONS.reduce((s, j) => s + j.statutoryPcSeats, 0);

  assert.strictEqual(totalStatutoryAcs, 4123, 'Statutory Assembly Seats target must be exactly 4,123');
  assert.strictEqual(totalStatutoryPcs, 543, 'Statutory Parliamentary Seats target must be exactly 543');
});

test('2. National 4,123 Assembly Constituencies Seed Validation', () => {
  assert.strictEqual(repr.statutorySummary.verifiedSeededAcs, 4123, 'Seed files must contain exactly 4,123 ACs');
  assert.strictEqual(repr.statutorySummary.seedDiscrepanciesCount, 0, 'Zero seed discrepancies permitted');

  assert.strictEqual(repr.seedValidation.length, 31, 'Exactly 31 assembly jurisdictions must be seeded');
  for (const s of repr.seedValidation) {
    assert.strictEqual(s.seedFilePresent, true, `${s.jurisdictionCode}: Seed file must exist`);
    assert.strictEqual(s.matchesStatutory, true, `${s.jurisdictionCode}: Seed count must equal statutory seats`);
    assert.strictEqual(s.sequentialAcNosValid, true, `${s.jurisdictionCode}: AC numbers must be 1..N sequential`);
    assert.strictEqual(s.evidenceTier, 'STATIC_FILE_PARSING');
  }
});

test('3. Migration 061 AC-to-PC Mapping & 543 PC Invariants', () => {
  assert.strictEqual(repr.mappingValidation.totalMappingsCount, 4123, 'Migration 061 must contain exactly 4,123 tuples');
  assert.strictEqual(repr.mappingValidation.uniqueMappedAcsCount, 4123, 'Must map 4,123 unique ACs');
  assert.strictEqual(repr.mappingValidation.uniqueMappedPcsCount, 537, 'Assembly states must map to 537 distinct PCs');
  assert.strictEqual(repr.mappingValidation.nonAssemblyPcsCount, 6, 'Non-assembly UTs must provide 6 distinct PCs');
  assert.strictEqual(repr.mappingValidation.totalReconciledPcs, 543, 'Reconciled PCs must equal statutory 543');
  assert.strictEqual(repr.mappingValidation.interstateMisallocations.length, 0, 'Zero interstate AC-to-PC mismatches');

  // Key state partitions
  assert.strictEqual(repr.mappingValidation.stateMappingCounts.UP, 403, 'UP must have 403 mappings');
  assert.strictEqual(repr.mappingValidation.stateMappingCounts.MH, 288, 'MH must have 288 mappings');
  assert.strictEqual(repr.mappingValidation.stateMappingCounts.WB, 294, 'WB must have 294 mappings');
  assert.strictEqual(repr.mappingValidation.stateMappingCounts.TS, 119, 'TS must have 119 mappings');
});

test('4. Assam 2023 Delimitation Temporal Lineage & DEF-W021-02', () => {
  const as = repr.assamTemporalModel;
  assert.strictEqual(as.effectiveDate, '2023-08-16');
  assert.strictEqual(as.new2023AcVersionsCount, 126, 'Must contain 126 new 2023 AC versions');
  assert.strictEqual(as.new2023PcVersionsCount, 14, 'Must contain 14 new 2023 PC versions');
  assert.strictEqual(as.activeDefect, 'DEF-W021-02');
  assert.strictEqual(as.defectStatus, 'ASSAM_HISTORICAL_LINEAGE_PENDING');
});

test('5. 7-Tier National Geography Pipeline & Defect Falsification', () => {
  const ts = repr.geographyEvaluation.find(g => g.jurisdictionCode === 'TS');
  assert.ok(ts, 'Telangana must be evaluated');
  assert.strictEqual(ts.hasBoundaryAsset, true, 'Telangana possesses local boundary file in data/geo/');
  assert.strictEqual(ts.tierReached, 3, 'Telangana reaches Tier 3 (Structurally Valid)');
  assert.strictEqual(ts.blockedAtTier, 4, 'Telangana blocked at Tier 4 (Conflicting Features)');
  assert.strictEqual(ts.boundaryStatus, 'CONFLICT_PENDING');
  assert.strictEqual(ts.hasCleanConstituencyMapping, false, 'Clean 1:1 mapping fails due to AC 119');
  assert.strictEqual(ts.isAuthoritativeAccepted, false, 'Authoritative acceptance is strictly false');
  assert.deepStrictEqual(ts.activeDefects, ['DEF-W021-01']);

  const otherStates = repr.geographyEvaluation.filter(g => g.type === 'STATE' && g.jurisdictionCode !== 'TS');
  assert.strictEqual(otherStates.length, 27, '27 other states must be evaluated');
  for (const st of otherStates) {
    assert.strictEqual(st.hasBoundaryAsset, false, `${st.jurisdictionCode}: must have no boundary asset`);
    assert.strictEqual(st.tierReached, 1, `${st.jurisdictionCode}: must be Tier 1 (FILE_ABSENT)`);
    assert.strictEqual(st.boundaryStatus, 'UNAVAILABLE');
    assert.strictEqual(st.isAuthoritativeAccepted, false);
    assert.ok(st.activeDefects.includes('DEF-W021-03'), `${st.jurisdictionCode}: must track DEF-W021-03`);
  }
});

test('6. State Data Service Precision Geographic Capability Model & Zero Premature Authoritative Claims', () => {
  const stateDataSrc = fs.readFileSync(path.join(REPO_ROOT, 'apps/api/src/services/stateData.ts'), 'utf8');

  // Verify type exports
  assert.ok(stateDataSrc.includes('export type GeographicBoundaryStatus'), 'Must export GeographicBoundaryStatus type');
  assert.ok(stateDataSrc.includes('export interface GeographicCapability'), 'Must export GeographicCapability interface');
  assert.ok(stateDataSrc.includes('export function getGeographicCapability'), 'Must export getGeographicCapability function');

  // Verify VALIDATED_GEOJSON_STATES is strictly empty (Set([]))
  assert.ok(
    stateDataSrc.includes('VALIDATED_GEOJSON_STATES = new Set<string>([]);') ||
    stateDataSrc.includes('VALIDATED_GEOJSON_STATES = new Set<string>()'),
    'VALIDATED_GEOJSON_STATES must be strictly empty (zero states claim accepted authoritative geometry)'
  );

  // Verify STATES_WITH_BOUNDARY_ASSETS is declared
  assert.ok(stateDataSrc.includes('STATES_WITH_BOUNDARY_ASSETS = new Set<string>(['), 'Must export STATES_WITH_BOUNDARY_ASSETS');

  // Verify Telangana capability definition in service source
  assert.ok(stateDataSrc.includes("boundaryStatus: 'CONFLICT_PENDING'"), 'Must mark TS as CONFLICT_PENDING');
  assert.ok(stateDataSrc.includes("hasCleanConstituencyMapping: false"), 'Must mark TS clean mapping as false');
  assert.ok(stateDataSrc.includes("isAuthoritativeAccepted: false"), 'Must mark TS authoritative acceptance as false');
  assert.ok(stateDataSrc.includes("'DEF-W021-01'"), 'Must track DEF-W021-01 for TS');

  // Verify 30-state default capability definition
  assert.ok(stateDataSrc.includes("boundaryStatus: 'UNAVAILABLE'"), 'Must mark other states as UNAVAILABLE');
  assert.ok(stateDataSrc.includes("'DEF-W021-03'"), 'Must track DEF-W021-03 for other states');
});

test('7. Candidate Boundary Assets in scripts/ Rejected from Canonical Promotion', () => {
  assert.strictEqual(repr.candidateAudit.length, 11, 'Must audit all 11 candidate boundary files');
  for (const c of repr.candidateAudit) {
    assert.strictEqual(c.canonicalStatus, 'NON_CANONICAL_SCRATCH_ONLY');
    assert.strictEqual(c.canBeMergedToProductionDataGeo, false);
    assert.ok(c.rejectionReason.includes('Rule IV-001'));
  }
});

test('8. Delimitation Service Postal Zone Routing & Elimination of Silent Fallback', () => {
  const delimSrc = fs.readFileSync(path.join(REPO_ROOT, 'apps/api/src/services/delimitationService.ts'), 'utf8');

  // Verify national postal zones 1 to 8 are present in PIN_PREFIX_MAPPING
  assert.ok(delimSrc.includes("'110': { stateCode: 'DL'"), 'Zone 1: Delhi prefix 110 must be mapped');
  assert.ok(delimSrc.includes("'121': { stateCode: 'HR'"), 'Zone 1: Haryana prefix 121 must be mapped');
  assert.ok(delimSrc.includes("'141': { stateCode: 'PB'"), 'Zone 1: Punjab prefix 141 must be mapped');
  assert.ok(delimSrc.includes("'180': { stateCode: 'JK'"), 'Zone 1: J&K prefix 180 must be mapped');
  assert.ok(delimSrc.includes("'201': { stateCode: 'UP'"), 'Zone 2: Uttar Pradesh prefix 201 must be mapped');
  assert.ok(delimSrc.includes("'248': { stateCode: 'UK'"), 'Zone 2: Uttarakhand prefix 248 must be mapped');
  assert.ok(delimSrc.includes("'302': { stateCode: 'RJ'"), 'Zone 3: Rajasthan prefix 302 must be mapped');
  assert.ok(delimSrc.includes("'380': { stateCode: 'GJ'"), 'Zone 3: Gujarat prefix 380 must be mapped');
  assert.ok(delimSrc.includes("'400': { stateCode: 'MH'"), 'Zone 4: Maharashtra prefix 400 must be mapped');
  assert.ok(delimSrc.includes("'403': { stateCode: 'GA'"), 'Zone 4: Goa prefix 403 must be mapped');
  assert.ok(delimSrc.includes("'452': { stateCode: 'MP'"), 'Zone 4: Madhya Pradesh prefix 452 must be mapped');
  assert.ok(delimSrc.includes("'492': { stateCode: 'CG'"), 'Zone 4: Chhattisgarh prefix 492 must be mapped');
  assert.ok(delimSrc.includes("'500': { stateCode: 'TS'"), 'Zone 5: Telangana prefix 500 must be mapped');
  assert.ok(delimSrc.includes("'515': { stateCode: 'AP'"), 'Zone 5: Andhra Pradesh prefix 515 must be mapped');
  assert.ok(delimSrc.includes("'560': { stateCode: 'KA'"), 'Zone 5: Karnataka prefix 560 must be mapped');
  assert.ok(delimSrc.includes("'600': { stateCode: 'TN'"), 'Zone 6: Tamil Nadu prefix 600 must be mapped');
  assert.ok(delimSrc.includes("'605': { stateCode: 'PY'"), 'Zone 6: Puducherry prefix 605 must be mapped');
  assert.ok(delimSrc.includes("'682': { stateCode: 'KL'"), 'Zone 6: Kerala prefix 682 must be mapped');
  assert.ok(delimSrc.includes("'700': { stateCode: 'WB'"), 'Zone 7: West Bengal prefix 700 must be mapped');
  assert.ok(delimSrc.includes("'751': { stateCode: 'OD'"), 'Zone 7: Odisha prefix 751 must be mapped');
  assert.ok(delimSrc.includes("'781': { stateCode: 'AS'"), 'Zone 7: Assam prefix 781 must be mapped');
  assert.ok(delimSrc.includes("'800': { stateCode: 'BR'"), 'Zone 8: Bihar prefix 800 must be mapped');
  assert.ok(delimSrc.includes("'834': { stateCode: 'JH'"), 'Zone 8: Jharkhand prefix 834 must be mapped');

  // Verify silent fallback to TS is strictly eliminated
  assert.strictEqual(
    delimSrc.includes("PIN_PREFIX_MAPPING[prefix3] ?? {\n      stateCode: 'TS'"),
    false,
    'Silent default fallback to TS on unmapped PIN is strictly forbidden'
  );

  // Verify fail-closed 404 PIN_NOT_FOUND error is thrown
  assert.ok(delimSrc.includes("code = 'PIN_NOT_FOUND'"), 'Must throw PIN_NOT_FOUND error on unmapped PIN code');
  assert.ok(delimSrc.includes("statusCode = 404"), 'Must set statusCode = 404 on PIN_NOT_FOUND error');
});

test('9. Production Air-Gap and Rule IV-001 Non-Self-Acceptance', () => {
  assert.strictEqual(repr.metadata.productionStatus, 'AIR_GAPPED_UNEXECUTED');
  assert.strictEqual(repr.metadata.formalCtoAcceptance, '0.0% — PENDING INDEPENDENT ADJUDICATION');
  assert.strictEqual(repr.metadata.governance, 'Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance');
});
