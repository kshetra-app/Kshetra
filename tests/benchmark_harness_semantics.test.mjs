/**
 * tests/benchmark_harness_semantics.test.mjs
 * Verification of Benchmark Harness Semantics & Error Rejection (W012 Remediation)
 *
 * Verifies:
 * 1. validateHttpResponse permits status 200-299 and throws on 4xx/5xx.
 * 2. HTTP 400 Bad Request (such as the legacy state_id query) is actively rejected.
 * 3. Corrected HP-02 query (state_code) succeeds with HTTP 200.
 * 4. Envoy upstream execution header (x-envoy-upstream-service-time) is captured.
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { validateHttpResponse, calculatePercentiles } from '../scripts/benchmark_w012_hot_paths.mjs';

const env = dotenv.parse(fs.readFileSync('.env.staging', 'utf8'));
const supabaseUrl = env.SUPABASE_URL || 'https://fkpigozcqnmcvofuksar.supabase.co';
const anonKey = env.SUPABASE_ANON_KEY;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('W012 BENCHMARK HARNESS SEMANTICS & ERROR REJECTION TESTS');
  console.log('================================================================\n');

  // Test 1: validateHttpResponse allows 200-299
  try {
    const r200 = validateHttpResponse(200, '{"data":"ok"}');
    const r204 = validateHttpResponse(204, '');
    assert(r200 === true && r204 === true, 'validateHttpResponse permits HTTP 200 and 204');
  } catch (err) {
    assert(false, `validateHttpResponse unexpectedly threw on 2xx: ${err.message}`);
  }

  // Test 2: validateHttpResponse rejects 400, 401, 403, 404, 500
  const statusCodesToReject = [400, 401, 403, 404, 500, 502];
  let allRejected = true;
  for (const code of statusCodesToReject) {
    try {
      validateHttpResponse(code, 'error payload');
      allRejected = false;
    } catch (err) {
      // Expected to throw
    }
  }
  assert(allRejected, 'validateHttpResponse rejects all 4xx/5xx error status codes');

  // Test 3: Legacy defective HP-02 query (state_id) produces HTTP 400 and is rejected
  try {
    const res = await fetch(supabaseUrl + '/rest/v1/constituencies?select=id,name,state_id&limit=20', {
      headers: { 'apikey': anonKey, 'Authorization': 'Bearer ' + anonKey }
    });
    const body = await res.text();
    assert(res.status === 400, `Defective HP-02 endpoint returns HTTP 400 (observed: ${res.status})`);
    
    let rejectedByValidator = false;
    try {
      validateHttpResponse(res.status, body);
    } catch (err) {
      rejectedByValidator = true;
    }
    assert(rejectedByValidator, 'Defective HP-02 HTTP 400 response is actively rejected by validateHttpResponse');
  } catch (err) {
    assert(false, `Unexpected error while testing defective HP-02: ${err.message}`);
  }

  // Test 4: Corrected HP-02 query (state_code) produces HTTP 200 and passes validation
  try {
    const res = await fetch(supabaseUrl + '/rest/v1/constituencies?select=id,name,state_code&limit=20', {
      headers: { 'apikey': anonKey, 'Authorization': 'Bearer ' + anonKey }
    });
    const body = await res.text();
    assert(res.status === 200, `Corrected HP-02 endpoint returns HTTP 200 (observed: ${res.status})`);
    assert(validateHttpResponse(res.status, body) === true, 'Corrected HP-02 passes validateHttpResponse');
  } catch (err) {
    assert(false, `Unexpected error while testing corrected HP-02: ${err.message}`);
  }

  // Test 5: HP-01 query (states) produces HTTP 200 and passes validation
  try {
    const res = await fetch(supabaseUrl + '/rest/v1/states?select=code,name,total_seats&limit=20', {
      headers: { 'apikey': anonKey, 'Authorization': 'Bearer ' + anonKey }
    });
    const body = await res.text();
    assert(res.status === 200, `HP-01 states endpoint returns HTTP 200 (observed: ${res.status})`);
    assert(validateHttpResponse(res.status, body) === true, 'HP-01 states passes validateHttpResponse');

    const upstream = res.headers.get('x-envoy-upstream-service-time');
    assert(upstream !== null && !isNaN(parseFloat(upstream)), `HP-01 provides valid x-envoy-upstream-service-time header (${upstream} ms)`);
  } catch (err) {
    assert(false, `Unexpected error while testing HP-01: ${err.message}`);
  }

  // Test 6: calculatePercentiles handles empty array safely
  const emptyStats = calculatePercentiles([]);
  assert(emptyStats === null, 'calculatePercentiles safely returns null for empty sample set');

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
