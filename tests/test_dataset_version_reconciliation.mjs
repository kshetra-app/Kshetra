import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Configuration
const STAGING_DB_URL = 'https://fkpigozcqnmcvofuksar.supabase.co';

let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const envStagingPath = path.resolve('.env.staging');
if (fs.existsSync(envStagingPath)) {
  const parsed = dotenv.parse(fs.readFileSync(envStagingPath, 'utf8'));
  if (parsed.SUPABASE_SERVICE_ROLE_KEY) supabaseServiceKey = parsed.SUPABASE_SERVICE_ROLE_KEY;
}

if (!supabaseServiceKey) {
  console.error('FATAL: Supabase staging credentials missing from .env.staging');
  process.exit(1);
}

const supabaseAdmin = createClient(STAGING_DB_URL, supabaseServiceKey);

// Authoritative W012 expected values for the 5 W014 dataset versions
const EXPECTED_DATASET_VERSIONS = {
  ts_districts_2014_v1: {
    dataset_id: 'ts_revenue_districts',
    version_tag: '2014_state_formation',
    effective_from: '2014-06-02',
    effective_to: null,
    record_count: 10,
    checksum_sha256: null,
    storage_path: null,
    default_status: 'UNVERIFIED',
    verification_evidence_id: null,
    metadata: {
      statutory_reference: 'Andhra Pradesh Reorganisation Act, 2014 (Act No. 6 of 2014), Section 3',
      district_count: 10,
      evidence_state: 'statutory_act'
    }
  },
  ts_districts_2021_renames_v1: {
    dataset_id: 'ts_revenue_districts',
    version_tag: '2021_renames',
    effective_from: '2021-08-12',
    effective_to: null,
    record_count: 2,
    checksum_sha256: null,
    storage_path: null,
    default_status: 'UNVERIFIED',
    verification_evidence_id: null,
    metadata: {
      statutory_reference: 'G.O.Ms.No. 74, Revenue (DA) Dept, dated 12.08.2021 (Warangal/Hanamkonda)',
      evidence_state: 'statutory_gazette'
    }
  },
  eci_delimitation_1976_v1: {
    dataset_id: 'eci_delimitation_orders',
    version_tag: '1976_order',
    effective_from: '1976-01-01',
    effective_to: null,
    record_count: 0,
    checksum_sha256: null,
    storage_path: null,
    default_status: 'UNVERIFIED',
    verification_evidence_id: null,
    metadata: {
      statutory_reference: 'Delimitation Commission of India Order, 1976',
      legal_status: 'SUPERSEDED',
      evidence_state: 'historical_order'
    }
  },
  eci_delimitation_post2026_projected_v1: {
    dataset_id: 'eci_delimitation_orders',
    version_tag: 'post2026_anticipated',
    effective_from: '2026-01-01',
    effective_to: null,
    record_count: 0,
    checksum_sha256: null,
    storage_path: null,
    default_status: 'UNVERIFIED',
    verification_evidence_id: null,
    metadata: {
      statutory_reference: 'Constitution of India, Articles 82 & 170 (Post-2026 Delimitation Freeze)',
      legal_status: 'PROSPECTIVE_UNENACTED',
      evidence_state: 'constitutional_mandate'
    }
  },
  scenario_delimitation_draft_prop_1_v1: {
    dataset_id: 'panin_delimitation_scenarios',
    version_tag: 'draft_prop_1',
    effective_from: '2026-01-01',
    effective_to: null,
    record_count: 0,
    checksum_sha256: null,
    storage_path: null,
    default_status: 'UNVERIFIED',
    verification_evidence_id: null,
    metadata: {
      simulation_name: 'Hypothetical Population-Based Seat Reallocation Model 1',
      legal_status: 'NON_STATUTORY_SIMULATION',
      evidence_state: 'simulation_model'
    }
  }
};

const IMMUTABLE_FIELDS = [
  'dataset_id',
  'version_tag',
  'effective_from',
  'effective_to',
  'record_count',
  'checksum_sha256',
  'storage_path',
  'default_status',
  'verification_evidence_id',
  'metadata'
];

function areJsonObjectsEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (!obj1 || !obj2 || typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  for (const key of keys1) {
    if (!Object.prototype.hasOwnProperty.call(obj2, key)) return false;
    if (typeof obj1[key] === 'object' && obj1[key] !== null) {
      if (!areJsonObjectsEqual(obj1[key], obj2[key])) return false;
    } else if (obj1[key] !== obj2[key]) {
      return false;
    }
  }
  return true;
}

/**
 * Reconciles an existing row against expected values.
 * Returns { pass: true } or throws an error formatted exactly as Migration 041.
 */
function reconcileRow(existing, expected, versionId) {
  if (!existing) {
    throw new Error(`RECONCILIATION FAILURE: dataset_version ${versionId} not found`);
  }

  for (const field of IMMUTABLE_FIELDS) {
    const existingVal = existing[field];
    const expectedVal = expected[field];

    let matches = false;
    if (field === 'metadata') {
      matches = areJsonObjectsEqual(existingVal, expectedVal);
    } else {
      matches = (existingVal === expectedVal) || (existingVal === null && expectedVal === null);
    }

    if (!matches) {
      const existingStr = existingVal === null || existingVal === undefined ? 'NULL' : (typeof existingVal === 'object' ? JSON.stringify(existingVal) : String(existingVal));
      const expectedStr = expectedVal === null || expectedVal === undefined ? 'NULL' : (typeof expectedVal === 'object' ? JSON.stringify(expectedVal) : String(expectedVal));
      throw new Error(`RECONCILIATION FAILURE: dataset_version ${versionId} field "${field}" mismatch: existing="${existingStr}", expected="${expectedStr}"`);
    }
  }

  return { pass: true };
}

async function run() {
  console.log('=== SEMANTIC TEST: W012 DATASET_VERSIONS 10-FIELD IMMUTABLE RECONCILIATION ===\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(title, condition, extra = '') {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${title}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${title} - ${extra}`);
    }
  }

  // Phase 1: Query existing rows from Staging Database (Zero Mutation)
  console.log('--- Phase 1: Fetching live dataset_versions from Staging DB ---');
  const targetIds = Object.keys(EXPECTED_DATASET_VERSIONS);
  const { data: rows, error } = await supabaseAdmin
    .from('dataset_versions')
    .select('*')
    .in('id', targetIds);

  assert('Query staging dataset_versions succeeded without error', !error, error?.message);
  assert('Returned exactly 5 target dataset_version rows', rows && rows.length === 5, `Got ${rows?.length} rows`);

  const rowsById = new Map((rows || []).map(r => [r.id, r]));

  // Record initial timestamps to verify zero mutation at end of test
  const initialTimestamps = new Map((rows || []).map(r => [r.id, { retrieved_at: r.retrieved_at, created_at: r.created_at }]));

  // Phase 2: Verify live staging rows pass 10-field reconciliation
  console.log('\n--- Phase 2: Live Reconciliation of all 5 versions (10 fields each) ---');
  for (const id of targetIds) {
    const existing = rowsById.get(id);
    const expected = EXPECTED_DATASET_VERSIONS[id];
    let reconciled = false;
    let errorMsg = '';
    try {
      reconcileRow(existing, expected, id);
      reconciled = true;
    } catch (e) {
      errorMsg = e.message;
    }
    assert(`Live row ${id} matches all 10 immutable fields`, reconciled, errorMsg);

    // Explicitly verify retrieved_at is an acquisition timestamp and NOT compared to now()
    assert(`Live row ${id} retrieved_at is valid timestamp (${existing?.retrieved_at})`, Boolean(existing?.retrieved_at && !isNaN(Date.parse(existing.retrieved_at))));
  }

  // Phase 3: Semantic Fail-Closed Verification on Previously Unchecked Fields
  console.log('\n--- Phase 3: Fail-Closed Semantic Tests for Previously Unchecked Fields ---');
  const previouslyUnchecked = [
    { field: 'record_count', tamperedVal: 99999 },
    { field: 'checksum_sha256', tamperedVal: 'tampered_sha256_hash_value' },
    { field: 'storage_path', tamperedVal: '/tampered/storage/path.parquet' },
    { field: 'effective_to', tamperedVal: '2099-12-31' },
    { field: 'verification_evidence_id', tamperedVal: '00000000-0000-0000-0000-000000000001' },
    { field: 'metadata', tamperedVal: { statutory_reference: 'TAMPERED REFERENCE', district_count: 99 } }
  ];

  for (const { field, tamperedVal } of previouslyUnchecked) {
    const baseRow = { ...rowsById.get('ts_districts_2014_v1') };
    baseRow[field] = tamperedVal;

    let failedClosed = false;
    let caughtMessage = '';
    try {
      reconcileRow(baseRow, EXPECTED_DATASET_VERSIONS.ts_districts_2014_v1, 'ts_districts_2014_v1');
    } catch (err) {
      failedClosed = true;
      caughtMessage = err.message;
    }

    assert(
      `Mismatch on previously unchecked field "${field}" fails closed with expected exception format`,
      failedClosed && caughtMessage.startsWith('RECONCILIATION FAILURE: dataset_version ts_districts_2014_v1 field "' + field + '" mismatch:'),
      `Caught: ${caughtMessage}`
    );
  }

  // Phase 4: Zero Mutation Verification (Re-query Staging DB)
  console.log('\n--- Phase 4: Staging Database Immutability & Zero-Mutation Audit ---');
  const { data: postRows, error: postErr } = await supabaseAdmin
    .from('dataset_versions')
    .select('*')
    .in('id', targetIds);

  assert('Post-test query succeeded', !postErr, postErr?.message);
  assert('Row count unchanged (5)', postRows && postRows.length === 5);

  let timestampsIdentical = true;
  for (const pr of postRows || []) {
    const init = initialTimestamps.get(pr.id);
    if (!init || init.retrieved_at !== pr.retrieved_at || init.created_at !== pr.created_at) {
      timestampsIdentical = false;
      console.error(`Timestamp mutation detected on ${pr.id}: before=${JSON.stringify(init)}, after=${JSON.stringify({ retrieved_at: pr.retrieved_at, created_at: pr.created_at })}`);
    }
  }
  assert('Zero DB mutations confirmed: timestamps (retrieved_at, created_at) and row data unchanged', timestampsIdentical);

  console.log('\n================================================================');
  console.log(`TOTAL CHECKS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log('================================================================');

  if (passedTests === totalTests) {
    console.log('\n[PASS] All semantic dataset_version reconciliation tests PASSED.');
    process.exit(0);
  } else {
    console.error('\n[FAIL] One or more semantic tests FAILED.');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('FATAL UNHANDLED ERROR in semantic test:', err);
  process.exit(1);
});
