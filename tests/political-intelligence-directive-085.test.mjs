import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('KSHETRA W021.5 — CTO DIRECTIVE 085 REGRESSION VERIFICATION SUITE');
console.log('Canonical Political Truth, Evidence-Based Coverage & Contract Integrity');
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
// 1. Evidence-Based Coverage Matrix Audit (Workstream A)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 1. National Data Coverage Matrix & Observable Evidence ---');

const matrixJsonPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
const matrixMdPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.md');

runTest('1.1 Matrix artifacts exist on disk and reference CTO Directive 085', () => {
  assert.strictEqual(fs.existsSync(matrixJsonPath), true, 'Matrix JSON report must exist');
  assert.strictEqual(fs.existsSync(matrixMdPath), true, 'Matrix MD report must exist');

  const jsonContent = fs.readFileSync(matrixJsonPath, 'utf8');
  assert.ok(jsonContent.includes('CTO DIRECTIVE 085'), 'JSON must reference CTO Directive 085');
  const mdContent = fs.readFileSync(matrixMdPath, 'utf8');
  assert.ok(mdContent.includes('CTO Directive 085'), 'MD must reference CTO Directive 085');
});

const matrix = JSON.parse(fs.readFileSync(matrixJsonPath, 'utf8'));

runTest('1.2 Exactly 31 Indian states and Union Territories are audited across all dimensions', () => {
  assert.strictEqual(matrix.totalStatesAudited, 31);
  assert.strictEqual(matrix.states.length, 31);
  assert.strictEqual(matrix.summary.totalStatutorySeats, 4123);
  assert.strictEqual(matrix.summary.totalSeededConstituencies, 4123);
});

runTest('1.3 Rule IV-001 Invariant: Zero states promoted to CANONICAL_FULL without evidence', () => {
  assert.strictEqual(matrix.summary.canonicalFullStatesCount, 0, 'No state can be CANONICAL_FULL without live DB & complete affidavits');
  const canonicalStates = matrix.states.filter((s) => s.dataTier === 'CANONICAL_FULL' || s.dataCompletenessStatus === 'VERIFIED_PRODUCTION');
  assert.strictEqual(canonicalStates.length, 0, 'Zero states may hold CANONICAL_FULL or VERIFIED_PRODUCTION status');
});

runTest('1.4 Evidence-derived tier breakdown distinguishes GeoJSON and Historical depth', () => {
  assert.strictEqual(matrix.summary.partialLocalWithGeoCount, 1, 'Only TS has GeoJSON in data/geo');
  assert.strictEqual(matrix.summary.partialHistoricalNoGeoCount, 7, '7 states have historical election records but no GeoJSON');
  assert.strictEqual(matrix.summary.seededSingleTermCount, 23, '23 states have single-term seeds pending Geo and historical');
  assert.strictEqual(matrix.summary.unavailableCount, 0, 'Zero states unavailable');
});

runTest('1.5 Delhi 70-seat statutory boundary invariant and placeholder accounting', () => {
  const dl = matrix.states.find((s) => s.stateCode === 'DL');
  assert.ok(dl, 'Delhi must be present in matrix');
  assert.strictEqual(dl.statutoryAssemblySeats, 70);
  assert.strictEqual(dl.seededConstituencyCount, 70);
  assert.strictEqual(dl.registryIdentity.statutorySeats, 70);
  assert.strictEqual(dl.registryIdentity.uniqueValidAcCount, 70);
  assert.strictEqual(dl.registryIdentity.missingAcNos.length, 0);
  assert.strictEqual(dl.registryIdentity.outOfRangeAcNos.length, 0);
  assert.strictEqual(dl.representativeCoverage.resolvedToStatutoryAcCount, 70);
  assert.strictEqual(dl.representativeCoverage.extraNonStatutoryProfiles, 151);
  assert.ok(dl.knownExceptions.some((e) => e.includes('DL-AC-071 through DL-AC-221')), 'Must disclose non-statutory records');
});

runTest('1.6 Historical election years are tied to per-constituency data records, not inferred', () => {
  const ts = matrix.states.find((s) => s.stateCode === 'TS');
  assert.deepStrictEqual(ts.historicalCoverage.demonstrablePerAcYears, [2018, 2014]);

  const ap = matrix.states.find((s) => s.stateCode === 'AP');
  assert.deepStrictEqual(ap.historicalCoverage.demonstrablePerAcYears, [2019]);

  const ka = matrix.states.find((s) => s.stateCode === 'KA');
  assert.deepStrictEqual(ka.historicalCoverage.demonstrablePerAcYears, [2018]);

  const mh = matrix.states.find((s) => s.stateCode === 'MH');
  assert.deepStrictEqual(mh.historicalCoverage.demonstrablePerAcYears, [2019]);

  // States without historical files must report empty demonstrable years
  const rj = matrix.states.find((s) => s.stateCode === 'RJ');
  assert.deepStrictEqual(rj.historicalCoverage.demonstrablePerAcYears, []);
  assert.strictEqual(rj.historicalCoverage.stateHistoricalFilePresent, false);
});

runTest('1.7 JSON and Markdown reports agree on key summary statistics', () => {
  const mdContent = fs.readFileSync(matrixMdPath, 'utf8');
  assert.ok(mdContent.includes('Total Statutory Assembly Seats:** 4123'));
  assert.ok(mdContent.includes('Total Unique Seeded Constituencies:** 4123'));
  assert.ok(mdContent.includes('Tier 0 (Canonical Full Production):** 0 states'));
  assert.ok(mdContent.includes('Tier 1 (Seeded Rich Local + GeoJSON + Historical + Sample Affidavits):** 1 state (TS)'));
  assert.ok(mdContent.includes('Tier 2 (Seeded Historical + Profiles, GeoJSON & Complete Affidavits Pending):** 7 states'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Truthful Electoral API Contracts & Null Preservation (Workstream B)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Truthful Electoral Contracts & Null Preservation ---');

runTest('2.1 Fastify schema allows nullable electionYear and strictly enums electionType', () => {
  const routesPath = path.join(REPO_ROOT, 'apps/api/src/routes/constituencies.ts');
  const code = fs.readFileSync(routesPath, 'utf8');

  assert.ok(code.includes("electionYear: { type: ['integer', 'null'] }"), 'recentElection electionYear must be nullable');
  assert.ok(
    code.includes("electionType: { type: 'string', enum: ['GENERAL', 'BYPOLL'] }") ||
    code.includes("electionType: { type: ['string', 'null'], enum: ['GENERAL', 'BYPOLL', null] }"),
    'electionType must be validated enum',
  );
  assert.ok(code.includes('@deprecated LEGACY COMPATIBILITY ALIAS (CTO Directive 085)'), 'Must mark election2023 as deprecated');
});

runTest('2.2 stateData service preserves null for unknown electionYear without 2024 defaulting', async () => {
  const servicePath = path.join(REPO_ROOT, 'apps/api/src/services/stateData.ts');
  const code = fs.readFileSync(servicePath, 'utf8');

  assert.ok(code.includes('let year: number | null = null;'), 'Must initialize year as null');
  assert.ok(code.includes('else year = null;'), 'Must preserve null when year is unknown');
  assert.ok(code.includes('electionYear: number | null;'), 'Interface must type electionYear as number | null');
});

runTest('2.3 Margin percent is strictly null when margin or winnerVotes is missing or invalid', () => {
  const servicePath = path.join(REPO_ROOT, 'apps/api/src/services/stateData.ts');
  const code = fs.readFileSync(servicePath, 'utf8');

  assert.ok(code.includes('winnerVotes != null && winnerVotes > 0 && margin != null && margin >= 0'), 'Strict guard on marginPercent');
});

runTest('2.4 Mobile API client endpoint validates nullable electionYear without 2024 fallback', () => {
  const endpointPath = path.join(REPO_ROOT, 'apps/mobile/lib/api/endpoints/constituencies.ts');
  const code = fs.readFileSync(endpointPath, 'utf8');

  assert.ok(code.includes('electionYear: number | null;'), 'Must allow null in ConstituencyElectionSummary');
  assert.ok(code.includes("typeof el.electionYear === 'number' ? el.electionYear : null"), 'Must not default to 2024 in recentElection');
  assert.ok(
    code.includes("el.electionType === 'BYPOLL' ? 'BYPOLL' : 'GENERAL'") ||
    code.includes("throw new ApiValidationError(`Invalid recentElection.electionType:"),
    'Must strictly validate electionType',
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Mobile Source Precedence & Truthful Provenance (Workstream C)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Mobile UI Precedence & Provenance Truthfulness ---');

runTest('3.1 Constituency screen renders truthful mixed-source provenance badge', () => {
  const screenPath = path.join(REPO_ROOT, 'apps/mobile/app/constituency/[id].tsx');
  const code = fs.readFileSync(screenPath, 'utf8');

  assert.ok(
    code.includes("dataSource === 'LIVE_API' ? 'Live API (Electoral) + Seed Data'"),
    'Must truthfully label mixed-source Live API + Seed Data',
  );
  assert.ok(!code.includes("'Verified Live API'"), 'Must not make unverified blanket live API claims');
});

runTest('3.2 Constituency screen effective election year preserves null without 2024 fallback', () => {
  const screenPath = path.join(REPO_ROOT, 'apps/mobile/app/constituency/[id].tsx');
  const code = fs.readFileSync(screenPath, 'utf8');

  assert.ok(
    code.includes('const effectiveElectionYear = apiDetail?.recentElection?.electionYear !== undefined'),
    'Must check undefined rather than defaulting to 2024',
  );
  assert.ok(code.includes(': (constituency?.electionYear ?? null);'), 'Must fallback to null if neither has year');
});

runTest('3.3 SequenceGuard cancellation and stale response protection active', () => {
  const screenPath = path.join(REPO_ROOT, 'apps/mobile/app/constituency/[id].tsx');
  const code = fs.readFileSync(screenPath, 'utf8');

  assert.ok(code.includes('sequenceGuardRef.current.startRequest'), 'Must start request with SequenceGuard token');
  assert.ok(code.includes('if (token.isStale()) return;'), 'Must reject stale async responses');
  assert.ok(code.includes('sequenceGuardRef.current.reset()'), 'Must reset guard on cleanup');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Governance & Operational Boundaries (Rule IV-001)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Governance, Lineage & Operational Boundaries ---');

runTest('4.1 Zero database mutation invariant: migrations directory strictly unchanged (68 files)', () => {
  const migrationsDir = path.join(REPO_ROOT, 'supabase/migrations');
  const files = fs.readdirSync(migrationsDir);
  assert.strictEqual(files.length, 68, 'Migration count must remain strictly 68');
});

runTest('4.2 Financial defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN under Rule IV-001', () => {
  const matrixMd = fs.readFileSync(matrixMdPath, 'utf8');
  assert.ok(matrixMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'), 'Defect must be marked strictly open in reports');
});

runTest('4.3 Non-self-acceptance invariant: report discloses that passing tests != CTO acceptance', () => {
  const matrixMd = fs.readFileSync(matrixMdPath, 'utf8');
  assert.ok(matrixMd.includes('Rule IV-001 (Non-Self-Acceptance)'), 'Must cite Rule IV-001');
  assert.ok(matrixMd.includes('A passing verification script does not constitute CTO acceptance'), 'Must explicitly warn against self-acceptance');
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
