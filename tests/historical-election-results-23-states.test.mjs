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

console.log(`\nALL ${passedStates}/23 RESIDUAL STATES VERIFIED WITH 100% PASS RATE!`);
console.log('CRIT-F02-02 VERIFICATION SUCCESSFUL.');
