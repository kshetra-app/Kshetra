#!/usr/bin/env node
/**
 * Automated High-Throughput API Load Testing Runner
 * Domain 10: JOB 079
 * Authority: Master Product Blueprint, DEC-203, DEC-204 & Amendment v1.6 Control M
 */

import { LoadTestHarness } from '../../apps/api/src/services/loadTestHarness.js';

export async function runLoadTest(rps = 1000, duration = 10) {
  const report = await LoadTestHarness.runConcurrencySuite(rps, duration);
  return report;
}

if (process.argv[1] && process.argv[1].endsWith('run-load-test.mjs')) {
  runLoadTest().then(report => {
    console.log('=== POLIGRAM CONCURRENT API LOAD TEST REPORT ===');
    console.log(JSON.stringify(report, null, 2));
    if (!report.overallPass) {
      console.error('LOAD TEST FAILED: Concurrency SLAs breached!');
      process.exit(1);
    }
    console.log(`LOAD TEST PASSED: Peak ${report.peakConcurrentRps} RPS with 0% 5xx errors & all latency SLAs verified.`);
  });
}
