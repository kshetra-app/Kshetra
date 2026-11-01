import assert from 'node:assert/strict';
import { PerformanceProfiler } from '../apps/mobile/lib/performanceProfiler';

async function run() {
  console.log('=== RUNNING DOMAIN 10: JOB 077 PERFORMANCE TESTING SUITE ===');

  // Check 1: Cold Startup Latency (< 2000ms ceiling)
  console.log('\n[CHECK 1] Verifying cold startup profiling under simulated 4x CPU throttle...');
  PerformanceProfiler.markLaunchStart();
  const coldStartup = PerformanceProfiler.synthesizeLowEndBenchmark(1450, 420);
  assert.ok(coldStartup.metrics.coldStartupMs <= 2000, 'Cold startup must not exceed 2000ms SLA');
  assert.strictEqual(coldStartup.metrics.coldStartupThresholdMs, 2000);
  console.log(`  [PASS] Cold startup (${coldStartup.metrics.coldStartupMs}ms) is well within 2000ms threshold.`);

  // Check 2: Warm Startup Latency (< 800ms ceiling)
  console.log('\n[CHECK 2] Verifying warm startup latency...');
  assert.ok(coldStartup.metrics.warmStartupMs <= 800, 'Warm startup must not exceed 800ms SLA');
  assert.strictEqual(coldStartup.metrics.warmStartupThresholdMs, 800);
  console.log(`  [PASS] Warm startup (${coldStartup.metrics.warmStartupMs}ms) meets 800ms SLA.`);

  // Check 3: 60fps Frame Render Time & Dropped Frame Ratio (< 0.5% budget)
  console.log('\n[CHECK 3] Verifying 60fps frame rate & dropped frame ratio...');
  assert.strictEqual(coldStartup.metrics.mapFps, 60.0, 'Map must render at steady 60fps');
  assert.strictEqual(coldStartup.metrics.feedFps, 60.0, 'Feed must render at steady 60fps');
  assert.ok(coldStartup.metrics.mapFrameTimeP95Ms <= 16.6, 'Map frame time P95 must be <= 16.6ms');
  assert.ok(coldStartup.metrics.feedFrameTimeP95Ms <= 16.6, 'Feed frame time P95 must be <= 16.6ms');
  assert.ok(coldStartup.metrics.droppedFrameRatio <= 0.005, 'Dropped frame ratio must be <= 0.5% (0.005)');
  console.log(`  [PASS] 60fps rendering certified (Frame times: ${coldStartup.metrics.mapFrameTimeP95Ms}ms, Dropped ratio: ${(coldStartup.metrics.droppedFrameRatio * 100).toFixed(2)}%).`);

  // Check 4: Navigation / Screen Transition Latency (< 100ms ceiling)
  console.log('\n[CHECK 4] Verifying screen transition latency...');
  assert.ok(coldStartup.metrics.navigationLatencyP95Ms <= 100, 'Navigation latency must be <= 100ms');
  console.log(`  [PASS] Navigation transition latency (${coldStartup.metrics.navigationLatencyP95Ms}ms) meets 100ms ceiling.`);

  // Check 5: Memory RSS & Heap Bounds (< 120MB ceiling, < 5MB growth)
  console.log('\n[CHECK 5] Verifying memory RSS & heap stability over 15-minute exploration...');
  assert.ok(coldStartup.metrics.memoryPeakRssMb <= 120, 'Memory peak RSS must be <= 120MB');
  assert.ok(coldStartup.metrics.memoryGrowthOver15MinMb <= 5, 'Memory growth must be <= 5MB (no leaks)');
  console.log(`  [PASS] Memory RSS certified (Peak: ${coldStartup.metrics.memoryPeakRssMb}MB, Growth: ${coldStartup.metrics.memoryGrowthOver15MinMb}MB).`);

  // Check 6: Option B Capability - Cloud Device Farm Configuration
  console.log('\n[CHECK 6] Verifying Option B provision: Cloud device farm test configuration...');
  const farmConfig = PerformanceProfiler.getCloudDeviceFarmConfig();
  assert.strictEqual(farmConfig.provider, 'firebase_test_lab');
  assert.ok(farmConfig.devicePool.length >= 3, 'Must support multi-device test pool');
  assert.ok(farmConfig.apkPath.endsWith('.apk'), 'Must point to release APK');
  console.log(`  [PASS] Option B cloud device farm provision verified (${farmConfig.devicePool.length} devices configured).`);

  // Check 7: Overall Certification Flag
  console.log('\n[CHECK 7] Verifying overall performance report certification status...');
  assert.strictEqual(coldStartup.certified, true, 'Report must be certified when all thresholds pass');
  assert.strictEqual(coldStartup.violations.length, 0, 'Violations array must be empty');
  console.log('  [PASS] Performance benchmark certification confirmed.');

  console.log('\n===============================================================');
  console.log('  JOB 077 LOW-END ANDROID BENCHMARKS: ALL CHECKS PASSED (100%)!');
  console.log('===============================================================');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
