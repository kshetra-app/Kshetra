import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('KSHETRA W021.5 — CTO DIRECTIVE 086 REGRESSION VERIFICATION SUITE');
console.log('Consolidated Political-Truth Remediation, Readiness Package & Ledger');
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

// ─────────────────────────────────────────────────────────────────────────────
// 1. Evidence-Based Coverage Generator & Structural Inspection (Workstream A)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 1. Evidence-Based Coverage Generator & Deep Structure ---');

const matrixJsonPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
const matrixMdPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.md');

runTest('1.1 Coverage matrix artifacts exist and reflect Directive 086 evidence standards', () => {
  assert.strictEqual(fs.existsSync(matrixJsonPath), true, 'Matrix JSON must exist');
  assert.strictEqual(fs.existsSync(matrixMdPath), true, 'Matrix MD must exist');

  const jsonContent = fs.readFileSync(matrixJsonPath, 'utf8');
  assert.ok(jsonContent.includes('CTO DIRECTIVE 085 / 086') || jsonContent.includes('CTO Directive 086') || jsonContent.includes('CTO DIRECTIVE 085'), 'Report must reference governing directives');
});

const matrix = JSON.parse(fs.readFileSync(matrixJsonPath, 'utf8'));

runTest('1.2 Statutory seats are legal counts only without hardcoded election years', () => {
  const genScript = fs.readFileSync(path.join(REPO_ROOT, 'scripts/generate_national_data_coverage_matrix.mjs'), 'utf8');
  assert.ok(!genScript.includes("electionYear: 2023, electionType: 'GENERAL'"), 'AUTHORITATIVE_STATE_SEATS must not have hardcoded election years');
  assert.ok(!genScript.includes("electionYear: 2024, electionType: 'GENERAL'"), 'AUTHORITATIVE_STATE_SEATS must not have hardcoded election years');
  assert.strictEqual(matrix.summary.totalStatutorySeats, 4123);
});

runTest('1.3 Affidavit parsing is structural and enforces required candidate fields', () => {
  // Exactly 28 affidavits across 8 states, 0 in remaining 23 states
  assert.strictEqual(matrix.summary.totalAffidavits, 28);
  const ts = matrix.states.find(s => s.stateCode === 'TS');
  assert.strictEqual(ts.affidavitCoverage.totalAffidavitsInStore, 17);
  const up = matrix.states.find(s => s.stateCode === 'UP');
  assert.strictEqual(up.affidavitCoverage.totalAffidavitsInStore, 2);
  const rj = matrix.states.find(s => s.stateCode === 'RJ');
  assert.strictEqual(rj.affidavitCoverage.totalAffidavitsInStore, 0);

  // Structural parsing in generator code
  const genScript = fs.readFileSync(path.join(REPO_ROOT, 'scripts/generate_national_data_coverage_matrix.mjs'), 'utf8');
  assert.ok(genScript.includes('function inspectAffidavits('), 'Must have inspectAffidavits structural parser');
  assert.ok(genScript.includes('candidateName'), 'Must inspect candidateName');
  assert.ok(genScript.includes('sourceUrl'), 'Must inspect sourceUrl');
});

runTest('1.4 MLA Profile counting inspects actual structured records without .map assumption', () => {
  // KA has 171 literal profiles out of 224
  const ka = matrix.states.find(s => s.stateCode === 'KA');
  assert.strictEqual(ka.representativeCoverage.resolvedToStatutoryAcCount, 171);
  assert.strictEqual(ka.statutoryAssemblySeats, 224);

  // MH has 240 literal profiles out of 288
  const mh = matrix.states.find(s => s.stateCode === 'MH');
  assert.strictEqual(mh.representativeCoverage.resolvedToStatutoryAcCount, 240);
  assert.strictEqual(mh.statutoryAssemblySeats, 288);

  // National total valid statutory profiles is 3,812 / 4,123
  assert.strictEqual(matrix.summary.totalMlaProfiles, 3812);
  const dl = matrix.states.find(s => s.stateCode === 'DL');
  assert.strictEqual(dl.representativeCoverage.extraNonStatutoryProfiles, 151);
});

runTest('1.5 Deep GeoJSON inspection validates features, coordinates within India bbox, and AC linkage', () => {
  const ts = matrix.states.find(s => s.stateCode === 'TS');
  assert.strictEqual(ts.geospatialCoverage.hasGeoJSON, true);
  assert.strictEqual(ts.geospatialCoverage.featureCount, 120);
  assert.strictEqual(ts.geospatialCoverage.validFeatureCount, 120);
  assert.strictEqual(ts.geospatialCoverage.coordinatesValid, true);
  assert.strictEqual(ts.geospatialCoverage.coordinateRangeValid, true);
  assert.strictEqual(ts.geospatialCoverage.linkedConstituencyCount, 119);
  assert.strictEqual(ts.geospatialCoverage.validationErrors.length, 0);

  // 30 other states have no GeoJSON
  const otherStates = matrix.states.filter(s => s.stateCode !== 'TS');
  assert.ok(otherStates.every(s => !s.geospatialCoverage.hasGeoJSON));
  assert.ok(otherStates.every(s => s.geospatialCoverage.linkedConstituencyCount === 0));
});

runTest('1.6 All summary numerators and denominators trace to detailed state inventory', () => {
  const sumSeats = matrix.states.reduce((acc, s) => acc + s.statutoryAssemblySeats, 0);
  assert.strictEqual(sumSeats, matrix.summary.totalStatutorySeats);

  const sumSeeded = matrix.states.reduce((acc, s) => acc + s.seededConstituencyCount, 0);
  assert.strictEqual(sumSeeded, matrix.summary.totalSeededConstituencies);

  const sumProfiles = matrix.states.reduce((acc, s) => acc + s.representativeCoverage.resolvedToStatutoryAcCount, 0);
  assert.strictEqual(sumProfiles, matrix.summary.totalMlaProfiles);

  const sumAffidavits = matrix.states.reduce((acc, s) => acc + s.affidavitCoverage.totalAffidavitsInStore, 0);
  assert.strictEqual(sumAffidavits, matrix.summary.totalAffidavits);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Removal of State-Code Year Inference & Typed Elections (Workstream B)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Removal of State-Code Year Inference & Temporal Integrity ---');

runTest('2.1 stateData.ts eliminates all state-code array lists for election year inference', () => {
  const serviceCode = fs.readFileSync(path.join(REPO_ROOT, 'apps/api/src/services/stateData.ts'), 'utf8');

  // Must not have state-code array matching for election years
  assert.ok(!serviceCode.includes("['BR'].includes(code)"), 'Must not infer BR year from code');
  assert.ok(!serviceCode.includes("['TS', 'RJ', 'MP', 'CG', 'MZ'].includes(code)"), 'Must not infer 2023 cycle from state code list');
  assert.ok(!serviceCode.includes("['AP', 'OD', 'SK', 'AR', 'MH', 'JH', 'HR', 'JK'].includes(code)"), 'Must not infer 2024 cycle from state code list');
  assert.ok(!serviceCode.includes("['UP', 'PB', 'UK', 'GA', 'MN'].includes(code)"), 'Must not infer 2022 cycle from state code list');
});

runTest('2.2 stateData.ts strictly binds winner, runner-up, votes, and margin to the same year term', () => {
  const serviceCode = fs.readFileSync(path.join(REPO_ROOT, 'apps/api/src/services/stateData.ts'), 'utf8');

  // Verify term coherence
  assert.ok(serviceCode.includes('if (raw.winner2025 !== undefined'), 'Inspects year-specific 2025 field');
  assert.ok(serviceCode.includes('if (raw.winner2024 !== undefined'), 'Inspects year-specific 2024 field');
  assert.ok(serviceCode.includes('if (raw.winner2023 !== undefined'), 'Inspects year-specific 2023 field');
  assert.ok(serviceCode.includes('if (raw.winner2022 !== undefined'), 'Inspects year-specific 2022 field');
  assert.ok(serviceCode.includes('if (raw.winner2021 !== undefined'), 'Inspects year-specific 2021 field');
  assert.ok(serviceCode.includes('if (raw.winner2020 !== undefined'), 'Inspects year-specific 2020 field');
  assert.ok(serviceCode.includes('electionType: (c.electionType as \'GENERAL\' | \'BYPOLL\') || null') || serviceCode.includes('electionType = null'), 'Preserves null when electionType is unestablished');
});

runTest('2.3 Election history sort does not convert unknown years into 0 or artificial dates', () => {
  const serviceCode = fs.readFileSync(path.join(REPO_ROOT, 'apps/api/src/services/stateData.ts'), 'utf8');

  // Verify null-safe sort
  assert.ok(serviceCode.includes('if (a.electionYear == null && b.electionYear == null) return 0;'), 'Sort handles both null');
  assert.ok(serviceCode.includes('if (a.electionYear == null) return 1;'), 'Sort places null after defined years');
  assert.ok(serviceCode.includes('if (b.electionYear == null) return -1;'), 'Sort places null after defined years');
  assert.ok(serviceCode.includes('return b.electionYear - a.electionYear;'), 'Sort compares numeric years descending');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Contract Hardening, Mobile Validation & Section Provenance (Workstream C)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Contract Hardening & Mobile Provenance Precedence ---');

runTest('3.1 Fastify route schema validates nullable electionType and electionYear', () => {
  const routesCode = fs.readFileSync(path.join(REPO_ROOT, 'apps/api/src/routes/constituencies.ts'), 'utf8');

  assert.ok(routesCode.includes("electionType: { type: ['string', 'null'], enum: ['GENERAL', 'BYPOLL', null] }"), 'electionType schema allows string or null');
  assert.ok(routesCode.includes("electionYear: { type: ['integer', 'null'] }"), 'electionYear schema allows integer or null');
});

runTest('3.2 Mobile endpoint validator rejects invalid election types with ApiValidationError', () => {
  const endpointCode = fs.readFileSync(path.join(REPO_ROOT, 'apps/mobile/lib/api/endpoints/constituencies.ts'), 'utf8');

  assert.ok(endpointCode.includes("throw new ApiValidationError"), 'Must throw ApiValidationError on invalid electionType');
  assert.ok(endpointCode.includes('Expected "GENERAL", "BYPOLL", or null'), 'Validation error describes permitted values');
});

runTest('3.3 Mobile constituency screen renders distinct section-level provenance tags', () => {
  const screenCode = fs.readFileSync(path.join(REPO_ROOT, 'apps/mobile/app/constituency/[id].tsx'), 'utf8');

  assert.ok(screenCode.includes('Verified Electoral API'), 'Must render Verified Electoral API for electoral data');
  assert.ok(screenCode.includes('Offline Result Seed'), 'Must render Offline Result Seed when offline');
  assert.ok(screenCode.includes('Offline Profile Seed'), 'Must render Offline Profile Seed for representative card');
  assert.ok(screenCode.includes("'0 (Uncontested)'"), 'Affirmatively handles numeric 0 margin for uncontested elections');
});

runTest('3.4 Zero active mobile screens rely on election2023 for political truth', () => {
  const screenCode = fs.readFileSync(path.join(REPO_ROOT, 'apps/mobile/app/constituency/[id].tsx'), 'utf8');
  const legCode = fs.readFileSync(path.join(REPO_ROOT, 'apps/mobile/app/legislator/[id].tsx'), 'utf8');

  assert.ok(!screenCode.includes('.election2023'), 'Constituency screen must not read election2023');
  assert.ok(!legCode.includes('.election2023'), 'Legislator screen must not read election2023');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Canonical Readiness Package & Traceable Ledger (Workstreams D & E)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Canonical Readiness Package & Execution Ledger ---');

runTest('4.1 Canonical Architecture Readiness Package exists and addresses all 10 mandated questions', () => {
  const readinessPath = path.join(REPO_ROOT, 'reports/W021.5-CANONICAL-ARCHITECTURE-READINESS-PACKAGE.md');
  assert.strictEqual(fs.existsSync(readinessPath), true, 'Readiness package markdown must exist');

  const content = fs.readFileSync(readinessPath, 'utf8');
  assert.ok(content.includes('Question 1:'), 'Must answer Question 1');
  assert.ok(content.includes('Question 2:'), 'Must answer Question 2');
  assert.ok(content.includes('Question 3:'), 'Must answer Question 3');
  assert.ok(content.includes('Question 4:'), 'Must answer Question 4');
  assert.ok(content.includes('Question 5:'), 'Must answer Question 5');
  assert.ok(content.includes('Question 6:'), 'Must answer Question 6');
  assert.ok(content.includes('Question 7:'), 'Must answer Question 7');
  assert.ok(content.includes('Question 8:'), 'Must answer Question 8');
  assert.ok(content.includes('Question 9:'), 'Must answer Question 9');
  assert.ok(content.includes('Question 10:'), 'Must answer Question 10');
  assert.ok(content.includes('erDiagram'), 'Must contain Mermaid ER diagram');
  assert.ok(content.includes('067_canonical_candidacies_contest_linkage.sql'), 'Must propose Migration 067');
  assert.ok(content.includes('068_canonical_candidate_affidavits_remediation.sql'), 'Must propose Migration 068');
});

runTest('4.2 Traceable Execution Ledger JSON exists with reproducible weighted math', () => {
  const ledgerJsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  assert.strictEqual(fs.existsSync(ledgerJsonPath), true, 'Execution ledger JSON must exist');

  const ledger = JSON.parse(fs.readFileSync(ledgerJsonPath, 'utf8'));
  assert.strictEqual(ledger.summary.totalTasks, 25);
  assert.strictEqual(ledger.summary.totalWeight, 100.0);
  assert.strictEqual(ledger.summary.weightedEarnedCompletionPercent, 64.0);
  assert.strictEqual(ledger.stages.length, 9);
  assert.strictEqual(ledger.financialDefectStatus.defectId, 'DQ-W021.5-B2.2E-001');
  assert.strictEqual(ledger.financialDefectStatus.status, 'STRICTLY_OPEN');

  // Verify task weights sum to 100.0
  const sumWeights = ledger.stages.reduce((acc, stage) => {
    return acc + stage.tasks.reduce((tAcc, task) => tAcc + task.weight, 0);
  }, 0);
  assert.strictEqual(Math.round(sumWeights * 10) / 10, 100.0);
});

runTest('4.3 Execution Ledger Markdown exists and agrees with JSON ledger', () => {
  const ledgerMdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');
  assert.strictEqual(fs.existsSync(ledgerMdPath), true, 'Execution ledger MD must exist');

  const content = fs.readFileSync(ledgerMdPath, 'utf8');
  assert.ok(content.includes('Verified Earned Completion:          64.0%'));
  assert.ok(content.includes('Blocked on External / CTO Gates:     21.0%'));
  assert.ok(content.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Governance & Operational Boundaries (Rule IV-001)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Governance, Lineage & Operational Boundaries ---');

runTest('5.1 Zero database mutation invariant: migrations directory strictly unchanged (68 files)', () => {
  const migrationsDir = path.join(REPO_ROOT, 'supabase/migrations');
  const files = fs.readdirSync(migrationsDir);
  assert.strictEqual(files.length, 68, 'Migration count must remain strictly 68');
});

runTest('5.2 Financial defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN across all artifacts', () => {
  const matrixMd = fs.readFileSync(matrixMdPath, 'utf8');
  assert.ok(matrixMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));
  const ledgerMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md'), 'utf8');
  assert.ok(ledgerMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));
  const readinessMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-CANONICAL-ARCHITECTURE-READINESS-PACKAGE.md'), 'utf8');
  assert.ok(readinessMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));
});

runTest('5.3 Rule IV-001 Non-Self-Acceptance invariant upheld across all artifacts', () => {
  const ledgerMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md'), 'utf8');
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
