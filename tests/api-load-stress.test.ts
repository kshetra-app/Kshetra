import assert from 'node:assert/strict';
import { LoadTestHarness } from '../apps/api/src/services/loadTestHarness';

async function run() {
  console.log('=== RUNNING DOMAIN 10: JOB 079 CONCURRENT API LOAD & LATENCY SUITE ===');

  // Check 1: Concurrent Load Suite Execution (1,000 RPS Peak)
  console.log('\n[CHECK 1] Executing concurrent stress test suite at 1,000 RPS peak...');
  const report = await LoadTestHarness.runConcurrencySuite(1000, 5);
  assert.strictEqual(report.peakConcurrentRps, 1000);
  assert.strictEqual(report.endpoints.length, 4, 'Must benchmark 4 core production endpoints');
  assert.strictEqual(report.overallPass, true, 'Overall concurrent benchmark must pass');
  console.log(`  [PASS] Benchmarked 4 endpoints at ${report.peakConcurrentRps} concurrent RPS.`);

  // Check 2: Latency Quantiles Verification (P50 < 50ms, P95 < 150ms, P99 < 300ms)
  console.log('\n[CHECK 2] Verifying latency SLA quantiles under concurrent load...');
  for (const ep of report.endpoints) {
    assert.ok(ep.latency.p50Ms <= 50.0, `Endpoint [${ep.endpoint}] P50 (${ep.latency.p50Ms}ms) must be <= 50ms`);
    assert.ok(ep.latency.p95Ms <= 150.0, `Endpoint [${ep.endpoint}] P95 (${ep.latency.p95Ms}ms) must be <= 150ms`);
    assert.ok(ep.latency.p99Ms <= 300.0, `Endpoint [${ep.endpoint}] P99 (${ep.latency.p99Ms}ms) must be <= 300ms`);
    console.log(`  - [${ep.endpoint}]: P50=${ep.latency.p50Ms}ms, P95=${ep.latency.p95Ms}ms, P99=${ep.latency.p99Ms}ms [PASS]`);
  }
  console.log('  [PASS] All endpoint latency distributions strictly within SLA ceilings.');

  // Check 3: 0.00% HTTP 5xx Error Rate
  console.log('\n[CHECK 3] Verifying 0.00% 5xx server error rate under heavy concurrency...');
  for (const ep of report.endpoints) {
    assert.strictEqual(ep.error5xxRequests, 0, `Endpoint [${ep.endpoint}] must have 0 5xx errors`);
    assert.strictEqual(ep.errorRatePercent, 0.0, `Endpoint [${ep.endpoint}] error rate must be 0.00%`);
  }
  console.log('  [PASS] 0.00% HTTP 5xx errors observed across all requests.');

  // Check 4: RFC 6585 HTTP 429 Adaptive Rate Limiting
  console.log('\n[CHECK 4] Verifying RFC 6585 HTTP 429 rate limiting with Retry-After headers...');
  for (const ep of report.endpoints) {
    assert.strictEqual(ep.rateLimitHeadersVerified, true, `Endpoint [${ep.endpoint}] must emit RFC 6585 headers`);
  }
  console.log('  [PASS] RFC 6585 rate limiting and Retry-After backoff headers verified.');

  // Check 5: Option B Provision - Sequential Latency Smoke Benchmark
  console.log('\n[CHECK 5] Verifying Option B provision: Lightweight sequential latency smoke check...');
  const smoke = await LoadTestHarness.runSequentialLatencySmokeTest('/api/v1/health', 15);
  assert.strictEqual(smoke.iterations, 15);
  assert.ok(smoke.averageMs < 30.0, `Average smoke latency (${smoke.averageMs}ms) must be < 30ms`);
  assert.strictEqual(smoke.pass, true);
  console.log(`  [PASS] Option B sequential smoke benchmark passed (Avg: ${smoke.averageMs}ms over ${smoke.iterations} iterations).`);

  console.log('\n===============================================================');
  console.log('  JOB 079 CONCURRENT API LOAD & LATENCY: ALL CHECKS PASSED (100%)!');
  console.log('===============================================================');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
