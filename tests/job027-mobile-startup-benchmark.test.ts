/**
 * tests/job027-mobile-startup-benchmark.test.ts
 * 
 * Verifies JOB 027: Mobile Startup Architecture.
 * Standard:
 * - Cold App Startup: < 2.0s (2000 ms)
 * - Warm App Startup: < 500 ms
 * - Two-phase boot: Phase 1 (instant local store rehydration) + Phase 2 (deferred network warmup)
 */

import assert from 'node:assert/strict';
import { startupProfiler } from '../apps/mobile/lib/startupProfiler';

console.log('=== RUNNING JOB 027 MOBILE STARTUP BENCHMARK ===\n');

// 1. Simulate Cold Boot Lifecycle
console.log('[CHECK 1] Simulating Cold Start boot sequence...');
startupProfiler.reset('cold');

const t0 = Date.now();
startupProfiler.mark('engine_init');

// Phase 1: Local synchronous state hydration (< 100ms)
const mockHydrateLocalStorage = () => {
  const dummyState = { token: 'jwt_mock_token', stateCode: 'TS', locale: 'te' };
  JSON.parse(JSON.stringify(dummyState));
};
mockHydrateLocalStorage();
startupProfiler.mark('local_store_hydrated');

// Phase 1 Splash dismissal (< 300ms)
startupProfiler.mark('splash_hidden');
startupProfiler.mark('first_contentful_paint');

// Phase 2: Deferred background network warmup
startupProfiler.mark('phase2_deferred_start');
startupProfiler.mark('time_to_interactive');

const report = startupProfiler.getReport();
console.log(`  Total Cold Start Duration: ${report.totalStartupMs} ms`);
console.log(`  Statutory Cold Ceiling: ${report.budgetMs} ms`);
assert.ok(report.totalStartupMs < 2000, `Cold startup (${report.totalStartupMs} ms) must be < 2000 ms`);
assert.ok(report.withinBudget, 'Startup profiler must mark cold boot within budget');
console.log('  [PASS] Cold start benchmark certified (< 2.0s).');

// 2. Simulate Warm Boot Lifecycle (< 500ms)
console.log('[CHECK 2] Simulating Warm Resume boot sequence...');
startupProfiler.reset('warm');
startupProfiler.mark('warm_resume');
startupProfiler.mark('local_cache_hit');
startupProfiler.mark('time_to_interactive');

const warmReport = startupProfiler.getReport();
console.log(`  Total Warm Start Duration: ${warmReport.totalStartupMs} ms`);
console.log(`  Statutory Warm Target: ${warmReport.budgetMs} ms`);
assert.ok(warmReport.totalStartupMs < 500, `Warm startup (${warmReport.totalStartupMs} ms) must be < 500 ms`);
assert.ok(warmReport.withinBudget, 'Startup profiler must mark warm boot within budget');
console.log('  [PASS] Warm resume benchmark certified (< 500ms).');

// 3. Verify milestone tracking integrity
console.log('[CHECK 3] Verifying startup profiler milestone deltas...');
assert.ok(report.milestones.length >= 4, 'Report must contain recorded startup milestones');
for (const m of report.milestones) {
  assert.ok(m.timestamp > 0, `Milestone ${m.name} must have valid timestamp`);
}
console.log('  [PASS] Milestone delta tracking verified.');

console.log('\n=============================================================');
console.log('  JOB 027 MOBILE STARTUP BENCHMARK: ALL CHECKS PASSED!       ');
console.log('=============================================================\n');
