/**
 * Verification Test Battery: Historical Election Results for 23 States
 * Verifies that per-constituency historical results are authored and verified for all 23 states
 * Criterion: CRIT-F02-02 (W021.5-F-02)
 */

import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

if (!process.env.TSX_BOOTSTRAPPED) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, TSX_BOOTSTRAPPED: '1' }
  });
  process.exit(result.status ?? 0);
}

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  AUTHORITATIVE_STATE_SEATS,
  STATE_SLUGS,
  inspectHistoricalCoverage,
} from '../scripts/generate_national_data_coverage_matrix.mjs';

console.log('--- TEST BATTERY: Historical Election Results for 23 States (CRIT-F02-02) ---');

const missing23States = [
  'RJ', 'GJ', 'JH', 'OD', 'DL', 'PB', 'HR', 'CG', 'MP', 'BR',
  'AS', 'GA', 'HP', 'MN', 'ML', 'MZ', 'NL', 'TR', 'SK', 'AR',
  'UK', 'PY', 'JK'
];

assert.strictEqual(missing23States.length, 23, 'Must target exactly 23 residual states');

let passedStates = 0;

for (const code of missing23States) {
  const meta = AUTHORITATIVE_STATE_SEATS[code];
  assert(meta, `Metadata must exist for state ${code}`);
  const slug = STATE_SLUGS[code];
  const filePath = path.join(process.cwd(), 'data', 'seed', `${slug}-historical-results.ts`);

  // Check 1: File must exist on disk
  assert(fs.existsSync(filePath), `Historical results file must exist: ${filePath}`);

  // Check 2: AST structural inspection
  const res = inspectHistoricalCoverage(code, meta.seats);
  assert.strictEqual(res.stateHistoricalFilePresent, true, `${code} historical file present`);
  assert(res.demonstrablePerAcYears.length > 0, `${code} must have demonstrable per-AC historical years`);
  assert.strictEqual(res.malformedRecordCount, 0, `${code} must have 0 malformed records`);

  const primaryYear = res.demonstrablePerAcYears[0];
  const yearRecords = res.eventsByYear[primaryYear] || [];
  // For JK in 2014, statutory assembly had exactly 87 seats (pre-2019 Constitution of J&K; 2022 Delimitation set 90 seats for 2024).
  const expectedSeats = (code === 'JK' && primaryYear === 2014) ? 87 : meta.seats;
  assert.strictEqual(
    yearRecords.length,
    expectedSeats,
    `${code} must have exactly ${expectedSeats} statutory seats for primary year ${primaryYear} (found ${yearRecords.length})`
  );

  passedStates++;
  console.log(`[PASS] ${code} (${meta.name}): ${yearRecords.length}/${expectedSeats} statutory seats verified for ${primaryYear} (0 malformed)`);
}

// Check 3: Check Fastify stateData service integration
const { getConstituencyElectionData } = await import('../apps/api/src/services/stateData.ts');

for (const code of missing23States) {
  const meta = AUTHORITATIVE_STATE_SEATS[code];
  const sampleData = getConstituencyElectionData(code, 1);
  assert(sampleData, `getConstituencyElectionData must return data for ${code} AC 1`);
  assert(sampleData.elections.length >= 2, `${code} AC 1 must contain at least recent + 1 historical election (found ${sampleData.elections.length})`);
  console.log(`[PASS] Fastify stateData service returns ${sampleData.elections.length} elections for ${code} AC 1`);
}

// Check 4: Election View Compatibility Contract & Stage 4 Invariants (CTO Directive 150 Section 5)
console.log('\n--- CHECK 4: Election View Compatibility Contract & Invariants ---');
const migration051Path = path.join(process.cwd(), 'supabase', 'migrations', '051_election_data_normalization.sql');
assert(fs.existsSync(migration051Path), 'Migration 051 must exist');
const migration051Sql = fs.readFileSync(migration051Path, 'utf8');

assert(
  migration051Sql.includes('CREATE OR REPLACE VIEW public.vw_legacy_election_results AS'),
  'Migration 051 must define public.vw_legacy_election_results'
);

const expectedViewColumns = [
  'contest_id', 'election_code', 'election_year', 'election_type',
  'constituency_id', 'constituency_name', 'winner_name', 'winner_party_symbol',
  'winner_party', 'winner_votes', 'runner_up_name', 'runner_up_party',
  'runner_up_votes', 'margin', 'votes_polled', 'turnout'
];

for (const col of expectedViewColumns) {
  assert(
    migration051Sql.includes(col),
    `vw_legacy_election_results definition must project column ${col}`
  );
}

// Invariant: View does NOT define integer election_id drop-in column for public.election_results
assert(
  !migration051Sql.includes('ee.id AS election_id'),
  'vw_legacy_election_results must not project UUID ee.id as legacy integer election_id'
);

// Verify canonical execution plan maintains Stage 4 as BLOCKED_NOT_DEPLOYABLE with 0 outbound rows
const { generateCanonicalExecutionPlan } = await import('../scripts/lib/stagingExecutionPlan.mjs');
const plan = generateCanonicalExecutionPlan({ repoRoot: process.cwd() });
const stage4 = plan.stages.stage4_historical_election_results;
assert(stage4, 'Stage 4 must be defined in canonical execution plan');
assert.strictEqual(stage4.deploymentStatus, 'BLOCKED_NOT_DEPLOYABLE', 'Stage 4 must remain BLOCKED_NOT_DEPLOYABLE');
assert.strictEqual(stage4.expectedRecordCounts.outboundRowsToStaging, 0, 'Stage 4 outboundRowsToStaging must be 0');

// Verify registry specification documents view contract and zero-coercion policy
const registryJsonPath = path.join(process.cwd(), 'reports', 'w021_5_canonical_election_registry.json');
assert(fs.existsSync(registryJsonPath), 'Canonical election registry must exist');
const registry = JSON.parse(fs.readFileSync(registryJsonPath, 'utf8'));
const viewContract = registry.architectureReconciliation.legacyCompatibilityModel.viewContract;
assert(viewContract, 'Registry must define viewContract');
assert.strictEqual(
  viewContract.isDirectDropInForLegacyTable,
  false,
  'view must not be claimed as direct drop-in replacement for legacy table'
);

// Directive 151 Section 7: Assert underlying column types (TEXT for constituency_id & election_type, not UUID/enum)
assert.strictEqual(viewContract.columns.length, 16, 'viewContract must specify all 16 columns');
const columnsByName = Object.fromEntries(viewContract.columns.map(c => [c.name, c]));
assert.strictEqual(columnsByName.constituency_id.type, 'TEXT', 'constituency_id must be TEXT per underlying DDL');
assert.strictEqual(columnsByName.election_type.type, 'TEXT', 'election_type must be TEXT per underlying DDL');
assert.strictEqual(columnsByName.winner_party.type, 'TEXT', 'winner_party must be TEXT per underlying DDL');
assert.strictEqual(columnsByName.runner_up_party.type, 'TEXT', 'runner_up_party must be TEXT per underlying DDL');
assert.strictEqual(columnsByName.contest_id.type, 'UUID', 'contest_id must be UUID');
assert.strictEqual(columnsByName.election_year.type, 'INTEGER', 'election_year must be INTEGER');
assert.strictEqual(columnsByName.margin.type, 'INTEGER', 'margin must be INTEGER');
console.log('[PASS] Election view compatibility contract and Stage 4 non-deployable invariants verified.');

console.log(`\nALL ${passedStates}/23 RESIDUAL STATES VERIFIED WITH 100% PASS RATE!`);
console.log('CRIT-F02-02 VERIFICATION SUCCESSFUL.');
