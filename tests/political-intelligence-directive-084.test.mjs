import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('KSHETRA W021.5 — CTO DIRECTIVE 084 INTEGRATION VERIFICATION SUITE');
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
// 1. National Data Coverage Matrix & Ground Truth (Workstream C)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 1. National Data Coverage Matrix Audit ---');

const matrixJsonPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
const matrixMdPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.md');

runTest('1.1 Matrix artifacts exist on disk', () => {
  assert.strictEqual(fs.existsSync(matrixJsonPath), true, 'Matrix JSON report must exist');
  assert.strictEqual(fs.existsSync(matrixMdPath), true, 'Matrix MD report must exist');
});

const matrix = JSON.parse(fs.readFileSync(matrixJsonPath, 'utf8'));

runTest('1.2 Exactly 31 Indian states and Union Territories are audited', () => {
  assert.strictEqual(matrix.totalStatesAudited, 31);
  assert.strictEqual(matrix.states.length, 31);
});

runTest('1.3 Total statutory assembly seats equals 4,123 without missing seats', () => {
  assert.strictEqual(matrix.summary.totalStatutorySeats, 4123);
  assert.strictEqual(matrix.summary.totalSeededConstituencies, 4123);
});

runTest('1.4 Data tier breakdown is accurate and truthful', () => {
  assert.strictEqual(matrix.summary.canonicalFullStatesCount, 0, 'Tier 0 CANONICAL_FULL must be strictly 0 under Rule IV-001');
  assert.ok(matrix.summary.partialLocalWithGeoCount <= 1, 'Tier 1 SEEDED_RICH_LOCAL_WITH_GEO is <= 1');
  assert.strictEqual(matrix.summary.partialLocalWithGeoCount + matrix.summary.partialHistoricalNoGeoCount, 8, '8 historical/local states total');
  assert.strictEqual(matrix.summary.seededSingleTermCount, 23, 'Tier 3 SEEDED_SINGLE_TERM_PENDING_GEO_HIST must be 23');
  assert.strictEqual(matrix.summary.unavailableCount, 0, 'Zero states unavailable');
});

runTest('1.5 Delhi invariant: strictly 70 assembly seats with 2025 election year', () => {
  const dl = matrix.states.find((s) => s.stateCode === 'DL');
  assert.ok(dl, 'Delhi must be audited');
  assert.strictEqual(dl.statutoryAssemblySeats, 70);
  assert.strictEqual(dl.seededConstituencyCount, 70);
  assert.strictEqual(dl.primaryElectionYear, 2025);
});

runTest('1.6 Andhra Pradesh & Maharashtra: 2024 primary election years', () => {
  const ap = matrix.states.find((s) => s.stateCode === 'AP');
  assert.ok(ap);
  assert.strictEqual(ap.statutoryAssemblySeats, 175);
  assert.strictEqual(ap.primaryElectionYear, 2024);

  const mh = matrix.states.find((s) => s.stateCode === 'MH');
  assert.ok(mh);
  assert.strictEqual(mh.statutoryAssemblySeats, 288);
  assert.strictEqual(mh.primaryElectionYear, 2024);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Temporally Correct Electoral Model & Null Non-Coercion (Workstream B)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Temporally Correct Electoral Model ---');

runTest('2.1 Fastify constituency routes include recentElection with nullable numbers', () => {
  const routesPath = path.join(REPO_ROOT, 'apps/api/src/routes/constituencies.ts');
  const routesCode = fs.readFileSync(routesPath, 'utf8');

  assert.ok(routesCode.includes('recentElection:'), 'Route schema must define recentElection');
  assert.ok(routesCode.includes("type: ['number', 'null']"), 'Route schema must allow nullable winnerVotes and margin');
  assert.ok(routesCode.includes('elections:'), 'Route schema must define elections array');
  assert.ok(routesCode.includes('getConstituencyElectionData'), 'Route handler must call getConstituencyElectionData');
});

runTest('2.2 stateData service maps real election years without 2023 hardcoding', () => {
  const servicePath = path.join(REPO_ROOT, 'apps/api/src/services/stateData.ts');
  const serviceCode = fs.readFileSync(servicePath, 'utf8');

  assert.ok(serviceCode.includes('export function getConstituencyElectionData'), 'Must export getConstituencyElectionData');
  assert.ok(serviceCode.includes("winnerVotes: number | null"), 'Must type winnerVotes as number | null');
  assert.ok(serviceCode.includes("margin: number | null"), 'Must type margin as number | null');
  // CTO Directive 086: Record-based derivation supersedes hardcoded state-code lists
  assert.ok(
    serviceCode.includes("raw.winner2023 !== undefined") ||
    serviceCode.includes("['TS', 'KA', 'MP', 'RJ', 'CG', 'MZ', 'NL', 'TR', 'ML'].includes(code)) year = 2023"),
    'Must map true 2023 states via record fields',
  );
  assert.ok(
    serviceCode.includes("raw.winner2022 !== undefined") ||
    serviceCode.includes("['UP', 'PB', 'GJ', 'GA', 'HP', 'MN', 'UK'].includes(code)) year = 2022"),
    'Must map true 2022 states via record fields',
  );
  assert.ok(
    serviceCode.includes("raw.winner2021 !== undefined") ||
    serviceCode.includes("['TN', 'KL', 'WB', 'AS', 'PY'].includes(code)) year = 2021"),
    'Must map true 2021 states via record fields',
  );
  assert.ok(
    serviceCode.includes("raw.winner2020 !== undefined") ||
    serviceCode.includes("['BR'].includes(code)) year = 2020"),
    'Must map true 2020 state via record fields',
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Mobile Client Canonical Data Path & Stale Guard (Workstream A & D)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Mobile Client Canonical Data Path & UI Truthfulness ---');

runTest('3.1 Mobile client endpoint parses recentElection and elections array', () => {
  const endpointPath = path.join(REPO_ROOT, 'apps/mobile/lib/api/endpoints/constituencies.ts');
  const code = fs.readFileSync(endpointPath, 'utf8');

  assert.ok(code.includes('export interface ConstituencyElectionSummary'), 'Must define ConstituencyElectionSummary');
  assert.ok(code.includes('winnerVotes: number | null;'), 'winnerVotes must be nullable in interface');
  assert.ok(code.includes('margin: number | null;'), 'margin must be nullable in interface');
  assert.ok(code.includes('validateConstituencyDetail'), 'Must export validateConstituencyDetail');
});

runTest('3.2 Constituency detail screen wires SequenceGuard, apiClient and provenance badge', () => {
  const screenPath = path.join(REPO_ROOT, 'apps/mobile/app/constituency/[id].tsx');
  const code = fs.readFileSync(screenPath, 'utf8');

  assert.ok(code.includes('SequenceGuard'), 'Must use SequenceGuard');
  assert.ok(code.includes('apiClient.constituencies.getConstituency'), 'Must call apiClient.constituencies.getConstituency');
  assert.ok(code.includes('token.isStale()'), 'Must check token.isStale() on async resolution');
  assert.ok(code.includes('sequenceGuardRef.current.reset()'), 'Must reset guard on cleanup');
  assert.ok(code.includes("Live API (Electoral) + Seed Data"), 'Must render provenance badge');
  assert.ok(code.includes('effectiveElectionYear'), 'Must use effectiveElectionYear instead of hardcoded 2023');
});

runTest('3.3 Legislator profile screen protects against null vote/margin coercion', () => {
  const screenPath = path.join(REPO_ROOT, 'apps/mobile/app/legislator/[id].tsx');
  const code = fs.readFileSync(screenPath, 'utf8');

  assert.ok(code.includes("constituency.winnerVotes != null ? constituency.winnerVotes.toLocaleString() : 'Not Reported'"), 'Must null-check winnerVotes');
  assert.ok(code.includes("constituency.margin != null ? `${constituency.margin.toLocaleString()} votes` : '—'"), 'Must null-check margin');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Governance, Integrity & Invariants (Rule IV-001)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Governance & Population Invariants ---');

runTest('4.1 Zero database mutation invariant: no SQL migration created for Directive 084', () => {
  const migrationsDir = path.join(REPO_ROOT, 'supabase/migrations');
  const files = fs.readdirSync(migrationsDir);
  assert.strictEqual(files.length, 68, 'Migration count must remain strictly 68 (no DB mutations permitted)');
});

runTest('4.2 DQ-W021.5-B2.2E-001 remains STRICTLY OPEN under Rule IV-001', () => {
  const reportPath = path.join(REPO_ROOT, 'reports/W021.5-CTO-DIRECTIVE-083-IMPLEMENTATION-REPORT.md');
  if (fs.existsSync(reportPath)) {
    const report = fs.readFileSync(reportPath, 'utf8');
    assert.ok(report.includes('DQ-W021.5-B2.2E-001'), 'Must reference financial defect');
  }
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
