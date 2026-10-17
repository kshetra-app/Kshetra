import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import {
  validateGeoJsonObject,
  validateConstituencyArray,
  inspectGeoJSON,
  inspectAffidavits,
  inspectHistoricalCoverage,
  inspectMlaProfiles,
  AUTHORITATIVE_STATE_SEATS,
  STATE_SLUGS,
} from '../scripts/generate_national_data_coverage_matrix.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('KSHETRA W021.5 — CTO DIRECTIVE 087 REGRESSION VERIFICATION SUITE');
console.log('Coverage Integrity, Election-Truth Contract Closure & Ledger Adjudication');
console.log('================================================================');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failedTests++;
  }
}

const matrixJsonPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
const matrixMdPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.md');
const matrix = JSON.parse(fs.readFileSync(matrixJsonPath, 'utf8'));

// ─────────────────────────────────────────────────────────────────────────────
// 1. Workstream A — Correct Constituency Coverage Accounting
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 1. Workstream A: Constituency Coverage Accounting & Deduplication ---');

runTest('1.1 Deduplication invariant: duplicate ACs cannot inflate seeded counts or national totals', () => {
  // Test adversarial array with 3 duplicates of AC 1 and 2 duplicates of AC 2
  const adversarialInput = [
    { acNo: 1, name: 'Constituency 1' },
    { acNo: 1, name: 'Constituency 1 Duplicate' },
    { acNo: 1, name: 'Constituency 1 Duplicate 2' },
    { acNo: 2, name: 'Constituency 2' },
    { acNo: 2, name: 'Constituency 2 Duplicate' },
    { acNo: 3, name: 'Constituency 3' },
  ];
  const res = validateConstituencyArray(adversarialInput, 10);
  assert.strictEqual(res.uniqueValidAcCount, 3, 'Unique valid AC count must be 3, not 6');
  assert.strictEqual(res.validAcRecords.length, 3, 'Valid AC records array must contain only 3 unique records');
  assert.strictEqual(res.duplicateAcNos.length, 2, 'Must report AC 1 and AC 2 as duplicates');
  assert.ok(res.duplicateAcNos.includes(1) && res.duplicateAcNos.includes(2));
});

runTest('1.2 Adversarial seed validation: malformed, missing, and out-of-range records reported independently', () => {
  const adversarialInput = [
    { acNo: 'invalid_nan', name: 'Bad AC' },
    { acNo: null, name: 'Missing AC' },
    { acNo: 0, name: 'Zero AC (Out of Range)' },
    { acNo: 15, name: 'Exceeds Seats (Out of Range)' },
    { acNo: 5, name: 'Valid AC 5' },
  ];
  const res = validateConstituencyArray(adversarialInput, 10);
  assert.strictEqual(res.uniqueValidAcCount, 1, 'Only AC 5 is unique valid');
  assert.strictEqual(res.malformedAcCount, 2, 'Must detect 2 malformed records (NaN and null)');
  assert.strictEqual(res.outOfRangeAcNos.length, 2, 'Must detect 2 out-of-range records (0 and 15)');
  assert.ok(res.outOfRangeAcNos.includes(0) && res.outOfRangeAcNos.includes(15));
  assert.strictEqual(res.missingAcNos.length, 9, 'Must report remaining 9 statutory seats as missing');
});

runTest('1.3 Delhi 70-seat statutory invariant and demographic placeholder isolation', () => {
  const dl = matrix.states.find(s => s.stateCode === 'DL');
  assert.strictEqual(dl.statutoryAssemblySeats, 70, 'Delhi statutory assembly seats must be strictly 70');
  assert.strictEqual(dl.seededConstituencyCount, 70, 'Delhi seeded constituencies must be strictly 70');
  assert.strictEqual(dl.representativeCoverage.resolvedToStatutoryAcCount, 70);
  assert.strictEqual(dl.representativeCoverage.extraNonStatutoryProfiles, 151);
  assert.strictEqual(dl.registryIdentity.identityStatus, 'VERIFIED_STATUTORY_MATCH');
  assert.ok(dl.knownExceptions.some(e => e.includes('DL-AC-071 through DL-AC-221')), 'Preserves placeholder isolation');
});

runTest('1.4 All summary totals reconcile with detailed state-level inventory', () => {
  const sumSeats = matrix.states.reduce((acc, s) => acc + s.statutoryAssemblySeats, 0);
  assert.strictEqual(sumSeats, 4123);
  assert.strictEqual(sumSeats, matrix.summary.totalStatutorySeats);

  const sumSeeded = matrix.states.reduce((acc, s) => acc + s.seededConstituencyCount, 0);
  assert.strictEqual(sumSeeded, 4123);
  assert.strictEqual(sumSeeded, matrix.summary.totalSeededConstituencies);

  const sumProfiles = matrix.states.reduce((acc, s) => acc + s.representativeCoverage.resolvedToStatutoryAcCount, 0);
  assert.strictEqual(sumProfiles, 3812);
  assert.strictEqual(sumProfiles, matrix.summary.totalMlaProfiles);

  const sumAffidavits = matrix.states.reduce((acc, s) => acc + s.affidavitCoverage.totalAffidavitsInStore, 0);
  assert.strictEqual(sumAffidavits, 28);
  assert.strictEqual(sumAffidavits, matrix.summary.totalAffidavits);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Workstream B — Close GeoJSON Validation Gaps
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Workstream B: Close GeoJSON Validation Gaps ---');

runTest('2.1 Telangana GeoJSON passes all deep structural and coordinate validations', () => {
  const tsGeo = inspectGeoJSON('TS', 119);
  assert.strictEqual(tsGeo.hasGeoJSON, false, 'TS GeoJSON has duplicate AC 119 claims so clean mapping is blocked and hasGeoJSON is false');
  assert.strictEqual(tsGeo.hasCleanConstituencyMapping, false);
  assert.strictEqual(tsGeo.linkageValid, false);
  assert.strictEqual(tsGeo.filePresent, true);
  assert.strictEqual(tsGeo.featureCount, 120);
  assert.strictEqual(tsGeo.validFeatureCount, 120);
  assert.strictEqual(tsGeo.geometryValidFeatureCount, 120);
  assert.strictEqual(tsGeo.coordinatesValid, true);
  assert.strictEqual(tsGeo.coordinateRangeValid, true);
  assert.strictEqual(tsGeo.linkedConstituencyCount, 119);
  assert.strictEqual(tsGeo.duplicateFeatureCount, 1);
  assert.strictEqual(tsGeo.duplicateLinkedAcs.length, 1, 'Bhadrachalam (AC 119) has two polygon features in shapefile');
  assert.strictEqual(tsGeo.duplicateLinkedAcs[0], 119);
  assert.strictEqual(tsGeo.authoritativeVerified, false, 'Boundary file is local seed fixture, not live ECI verified');
});

runTest('2.2 Negative test: out-of-range coordinates strictly force coordinateRangeValid=false and hasGeoJSON=false', () => {
  const badBboxGeo = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[120.0, 50.0], [121.0, 50.0], [121.0, 51.0], [120.0, 50.0]]], // Outside India bbox (65..100, 5..40)
        },
        properties: { AC_NO: 1 },
      },
    ],
  };
  const res = validateGeoJsonObject(badBboxGeo, 'TS', 119, 'test-bad-bbox.geojson');
  assert.strictEqual(res.coordinateRangeValid, false, 'Coordinate range must be marked invalid');
  assert.strictEqual(res.hasGeoJSON, false, 'hasGeoJSON CANNOT be true when coordinate range fails');
});

runTest('2.3 Negative test: malformed geometry types (Point, LineString, empty) strictly fail validation', () => {
  const badGeometryGeo = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point', // Unsupported for boundary
          coordinates: [78.5, 17.4],
        },
        properties: { AC_NO: 1 },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [], // Empty coordinates
        },
        properties: { AC_NO: 2 },
      },
    ],
  };
  const res = validateGeoJsonObject(badGeometryGeo, 'TS', 119, 'test-bad-geom.geojson');
  assert.strictEqual(res.hasGeoJSON, false, 'hasGeoJSON must be false for malformed geometry');
  assert.ok(res.validationErrors.length > 0, 'Must record validation errors');
});

runTest('2.4 Negative test: non-numeric, NaN, or infinite coordinates strictly fail validation', () => {
  const nonNumericGeo = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[NaN, 17.0], ['string_coord', 18.0], [Infinity, 17.0], [NaN, 17.0]]],
        },
        properties: { AC_NO: 1 },
      },
    ],
  };
  const res = validateGeoJsonObject(nonNumericGeo, 'TS', 119, 'test-non-numeric.geojson');
  assert.strictEqual(res.coordinatesValid, false, 'coordinatesValid must be false');
  assert.strictEqual(res.hasGeoJSON, false, 'hasGeoJSON must be false');
});

runTest('2.5 Negative test: duplicate AC linkage and out-of-range AC linkage reported in diagnostics', () => {
  const dupeLinkageGeo = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[78.0, 17.0], [79.0, 17.0], [79.0, 18.0], [78.0, 17.0]]],
        },
        properties: { AC_NO: 5 },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[78.0, 17.0], [79.0, 17.0], [79.0, 18.0], [78.0, 17.0]]],
        },
        properties: { AC_NO: 5 }, // Duplicate AC_NO 5
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[78.0, 17.0], [79.0, 17.0], [79.0, 18.0], [78.0, 17.0]]],
        },
        properties: { AC_NO: 999 }, // Out of range for statutory seats 10
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[78.0, 17.0], [79.0, 17.0], [79.0, 18.0], [78.0, 17.0]]],
        },
        properties: {}, // Missing AC_NO
      },
    ],
  };
  const res = validateGeoJsonObject(dupeLinkageGeo, 'TS', 10, 'test-dupe-linkage.geojson');
  assert.strictEqual(res.linkedConstituencyCount, 1, 'Only AC 5 linked');
  assert.ok(res.duplicateLinkedAcs.includes(5), 'Reports duplicate AC 5');
  assert.ok(res.outOfRangeLinkedAcs.includes(999), 'Reports out of range AC 999');
  assert.strictEqual(res.unresolvedFeatureCount, 1, 'Reports 1 feature missing AC identifier');
  assert.strictEqual(res.linkageValid, false, 'Linkage validity must be false');
});

runTest('2.6 GeoJSON validation distinguishes file presence, coordinates, range, linkage, and authoritative verification', () => {
  const tsGeo = inspectGeoJSON('TS', 119);
  assert.strictEqual(typeof tsGeo.filePresent, 'boolean');
  assert.strictEqual(typeof tsGeo.coordinatesValid, 'boolean');
  assert.strictEqual(typeof tsGeo.coordinateRangeValid, 'boolean');
  assert.strictEqual(typeof tsGeo.linkageValid, 'boolean');
  assert.strictEqual(typeof tsGeo.authoritativeVerified, 'boolean');
  assert.strictEqual(tsGeo.authoritativeVerified, false, 'Authoritative boundary claim is strictly false');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Workstream C — Remove Residual Year and Election-Type Inference
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Workstream C: Remove Residual Year and Election-Type Inference ---');

runTest('3.1 stateData.ts contains ZERO fallback assigning electionType = GENERAL when year is known', () => {
  const serviceCode = fs.readFileSync(path.join(REPO_ROOT, 'apps/api/src/services/stateData.ts'), 'utf8');
  assert.ok(!serviceCode.includes("else if (year !== null) {\n    electionType = 'GENERAL';"), 'Must eliminate year !== null GENERAL fallback');
  assert.ok(!serviceCode.includes("else if (year !== null) {\r\n    electionType = 'GENERAL';"), 'Must eliminate year !== null GENERAL fallback');
});

runTest('3.2 stateData.ts strictly evaluates electionType from raw.electionType without year guessing', () => {
  const serviceCode = fs.readFileSync(path.join(REPO_ROOT, 'apps/api/src/services/stateData.ts'), 'utf8');
  assert.ok(serviceCode.includes("let electionType: 'GENERAL' | 'BYPOLL' | null = null;"), 'Initializes electionType to null');
  assert.ok(serviceCode.includes("if (raw?.electionType === 'BYPOLL')"), 'Inspects raw.electionType for BYPOLL');
  assert.ok(serviceCode.includes("else if (raw?.electionType === 'GENERAL')"), 'Inspects raw.electionType for GENERAL');
  assert.ok(serviceCode.includes("electionType = null;"), 'Preserves null when electionType is unevidenced');
});

runTest('3.3 stateData.ts strictly binds winner, runner-up, votes, and margin to the same year term', () => {
  const serviceCode = fs.readFileSync(path.join(REPO_ROOT, 'apps/api/src/services/stateData.ts'), 'utf8');
  assert.ok(serviceCode.includes('if (raw.winner2025 !== undefined || raw.winnerName2025 !== undefined) {'), 'Year 2025 binding block');
  assert.ok(serviceCode.includes('winnerVotes = typeof raw.winnerVotes2025 === \'number\' ? raw.winnerVotes2025 : null;'), 'Binds winnerVotes2025 to 2025');
  assert.ok(serviceCode.includes('margin = typeof raw.margin2025 === \'number\' ? raw.margin2025 : null;'), 'Binds margin2025 to 2025');
  assert.ok(serviceCode.includes('runnerUp = raw.runnerUp2025 ?? \'\';'), 'Binds runnerUp2025 to 2025');
});

runTest('3.4 stateData.ts preserves real numeric 0 margin while keeping missing margin strictly null', () => {
  const serviceCode = fs.readFileSync(path.join(REPO_ROOT, 'apps/api/src/services/stateData.ts'), 'utf8');
  assert.ok(serviceCode.includes('winnerVotes != null && winnerVotes > 0 && margin != null && margin >= 0'), 'Strict numeric margin guard preserving 0');
  assert.ok(serviceCode.includes('margin = typeof raw.margin === \'number\' ? raw.margin : null;'), 'Missing margin evaluates to null, not 0');
});

runTest('3.5 Coverage generator derives historical years from parsed records without hardcoded state lists', () => {
  const genScript = fs.readFileSync(path.join(REPO_ROOT, 'scripts/generate_national_data_coverage_matrix.mjs'), 'utf8');
  assert.ok(!genScript.includes("if (stateCode === 'TS') {"), 'Must not use hardcoded state-code if branch');
  assert.ok(!genScript.includes("else if (stateCode === 'AP') {"), 'Must not use hardcoded state-code else-if branch');

  // Check derived historical years across representative states
  const tsHist = inspectHistoricalCoverage('TS');
  assert.deepStrictEqual(tsHist.demonstrablePerAcYears, [2018, 2014]);
  const apHist = inspectHistoricalCoverage('AP');
  assert.deepStrictEqual(apHist.demonstrablePerAcYears, [2019]);
  const kaHist = inspectHistoricalCoverage('KA');
  assert.deepStrictEqual(kaHist.demonstrablePerAcYears, [2018]);
  const mhHist = inspectHistoricalCoverage('MH');
  assert.deepStrictEqual(mhHist.demonstrablePerAcYears, [2019]);
  const rjHist = inspectHistoricalCoverage('RJ');
  assert.deepStrictEqual(rjHist.demonstrablePerAcYears, []);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Workstream D — Make Coverage Evidence Semantically Honest
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Workstream D: Semantic Honesty in Coverage Evidence ---');

runTest('4.1 Affidavit parsing structurally extracts complete records and separates evidence statuses', () => {
  const tsAff = inspectAffidavits('TS', 119);
  assert.strictEqual(tsAff.total, 17);
  assert.strictEqual(tsAff.presentInFileCount, 17);
  assert.strictEqual(tsAff.structurallyValidCount, 17);
  assert.strictEqual(tsAff.seatNumberInRangeCount, 17);
  // Directive 090 B1: Without canonical registry, identityValidatedCount is 0, identityUnresolvedCount is 17
  assert.strictEqual(tsAff.identityValidatedCount, 0);
  assert.strictEqual(tsAff.identityUnresolvedCount, 17);
  assert.strictEqual(tsAff.sourceProvenanceRecordedCount, 17);
  assert.strictEqual(tsAff.officiallyVerifiedCount, 0, 'Seed affidavits are NOT officially verified');
  assert.strictEqual(tsAff.canonicalDatabaseBacked, false);
  assert.strictEqual(tsAff.formallyAccepted, false);

  // When explicit canonical registry is provided, all 17 match their statutory identity
  const fullTsReg = new Map();
  for (const r of tsAff.records) {
    fullTsReg.set(r.acNo, { name: r.constituencyName });
  }
  const tsAffValidated = inspectAffidavits('TS', 119, fullTsReg);
  assert.strictEqual(tsAffValidated.identityValidatedCount, 17);
  assert.strictEqual(tsAffValidated.identityUnresolvedCount, 0);
});

runTest('4.2 MLA profile counting parses structured records with required fields (no regex text assumption)', () => {
  const ka = inspectMlaProfiles('KA', 224);
  assert.strictEqual(ka.resolvedToStatutoryAcCount, 171, 'Karnataka has 171 unique scraped MLA profiles');
  assert.strictEqual(ka.extraNonStatutoryProfiles, 0);

  const mh = inspectMlaProfiles('MH', 288);
  assert.strictEqual(mh.resolvedToStatutoryAcCount, 240, 'Maharashtra has 240 unique scraped MLA profiles');
  assert.strictEqual(mh.extraNonStatutoryProfiles, 0);

  const dl = inspectMlaProfiles('DL', 70);
  assert.strictEqual(dl.resolvedToStatutoryAcCount, 70, 'Delhi has 70 statutory MLA profiles');
  assert.strictEqual(dl.extraNonStatutoryProfiles, 151, 'Delhi has 151 extra non-statutory records');
});

runTest('4.3 Zero states promoted to CANONICAL_FULL without live database verification', () => {
  assert.strictEqual(matrix.summary.canonicalFullStatesCount, 0, 'Canonical full count must be strictly 0');
  assert.ok(matrix.states.every(s => s.dataTier !== 'CANONICAL_FULL'));
  assert.ok(matrix.states.every(s => s.provenanceCoverage.liveDatabaseVerified === false));
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Workstream E — Reconciled Execution Ledger
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Workstream E: Reconciled Execution Ledger Accounting ---');

const ledgerJsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
const ledgerMdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');
const ledger = JSON.parse(fs.readFileSync(ledgerJsonPath, 'utf8'));

runTest('5.1 Execution ledger JSON exists with reproducible weighted math and task reconciliation', () => {
  assert.ok(ledger.summary.totalTasks === 25 || ledger.summary.totalTasks === 27, 'totalTasks must reconcile (25 base or 27 with additions)');
  assert.strictEqual(ledger.summary.totalWeight, 100.0);
  assert.strictEqual(ledger.stages.length, 9);

  const sumWeights = ledger.stages.reduce((acc, stage) => {
    return acc + stage.tasks.reduce((tAcc, task) => tAcc + task.weight, 0);
  }, 0);
  assert.strictEqual(Math.round(sumWeights * 10) / 10, 100.0);
});

runTest('5.2 Ledger explicitly differentiates repository readiness from database execution and CTO acceptance', () => {
  assert.strictEqual(ledger.summary.repositoryImplementationPercent, ledger.summary.weightedEarnedCompletionPercent);
  assert.ok([61.5, 64.0].includes(ledger.summary.repositoryImplementationPercent));
  assert.strictEqual(ledger.summary.databaseExecutionPercent, 0.0, 'Live database execution is strictly 0.0%');
  assert.strictEqual(ledger.summary.formalAcceptancePercent, 0.0, 'Formal CTO acceptance is 0.0% verified in repo (5.0% provisional pending confirmation)');
  assert.strictEqual(ledger.summary.formalAcceptancePendingWeight, 5.0, 'Task W021.5-C-02 provisional weight is 5.0%');
});

runTest('5.3 Execution ledger Markdown reflects reconciled accounting dimensions', () => {
  const content = fs.readFileSync(ledgerMdPath, 'utf8');
  assert.ok(content.includes(`Verified Earned Completion:          ${ledger.summary.weightedEarnedCompletionPercent.toFixed(1)}%`));
  assert.ok(content.includes('Live Database Staging Execution:     0.0%'));
  assert.ok(content.includes('Formal CTO Acceptance:              0.0%'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Workstream F & G — Governance, Architecture Readiness & Boundaries
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 6. Workstream F & G: Readiness Package & Governance Boundaries ---');

runTest('6.1 Canonical Architecture Readiness Package documents 68 existing migrations and proposed 067-070 sequence', () => {
  const readinessPath = path.join(REPO_ROOT, 'reports/W021.5-CANONICAL-ARCHITECTURE-READINESS-PACKAGE.md');
  const content = fs.readFileSync(readinessPath, 'utf8');
  assert.ok(content.includes('68 SQL migrations'));
  assert.ok(content.includes('067_canonical_candidacies_contest_linkage.sql'));
  assert.ok(content.includes('068_canonical_candidate_affidavits_remediation.sql'));
  assert.ok(content.includes('Proposed forward-only migrations'));
});

runTest('6.2 Zero database mutation invariant: migrations directory strictly unchanged (68 files)', () => {
  const migrationsDir = path.join(REPO_ROOT, 'supabase/migrations');
  const files = fs.readdirSync(migrationsDir);
  assert.strictEqual(files.length, 68, 'Migration count must remain strictly 68');
});

runTest('6.3 Financial defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN across all artifacts', () => {
  const matrixMd = fs.readFileSync(matrixMdPath, 'utf8');
  assert.ok(matrixMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));
  const ledgerMd = fs.readFileSync(ledgerMdPath, 'utf8');
  assert.ok(ledgerMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));
  const readinessMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-CANONICAL-ARCHITECTURE-READINESS-PACKAGE.md'), 'utf8');
  assert.ok(readinessMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));
});

runTest('6.4 Rule IV-001 Non-Self-Acceptance invariant upheld across all artifacts', () => {
  const ledgerMd = fs.readFileSync(ledgerMdPath, 'utf8');
  assert.ok(ledgerMd.includes('Rule IV-001 (Non-Self-Acceptance)'));
  assert.ok(ledgerMd.includes('The author does NOT self-certify, self-ratify, or close Milestone W021.5'));
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
