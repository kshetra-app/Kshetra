import { buildApp } from '../apps/api/src/server.js';
import { metricsCollector } from '../apps/api/src/lib/metrics.js';
import fs from 'fs';
import path from 'path';

console.log('=== RUNNING JOB W004 OBSERVABILITY & ERROR TRACKING SUITE ===\n');

async function runVerification() {
  metricsCollector.resetForTests();
  const app = await buildApp();

  const results = {
    jobId: 'W004',
    timestamp: new Date().toISOString(),
    tests: [],
    status: 'PASS',
  };

  try {
    // 1. Check default request ID and latency headers
    console.log('Step 1: Testing automatic Request ID generation and response latency headers...');
    const res1 = await app.inject({ method: 'GET', url: '/health' });
    const hasReqId = Boolean(res1.headers['x-request-id']);
    const hasLatency = Boolean(res1.headers['x-response-time']);
    const hasServerTiming = Boolean(res1.headers['server-timing']);
    
    if (res1.statusCode === 200 && hasReqId && hasLatency && hasServerTiming) {
      console.log(`[PASS] Auto-generated x-request-id: ${res1.headers['x-request-id']}, latency: ${res1.headers['x-response-time']}`);
      results.tests.push({ name: 'automatic_request_id_and_latency', status: 'PASS', headers: { reqId: res1.headers['x-request-id'], latency: res1.headers['x-response-time'] } });
    } else {
      throw new Error(`Auto Request ID check failed: status=${res1.statusCode}`);
    }

    // 2. Check caller-supplied correlation ID propagation
    console.log('\nStep 2: Testing caller correlation ID propagation (x-request-id)...');
    const customCorrelationId = 'client-correlation-trace-uuid-9999';
    const res2 = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-request-id': customCorrelationId },
    });
    
    if (res2.headers['x-request-id'] === customCorrelationId) {
      console.log(`[PASS] Propagated incoming x-request-id verbatim: ${customCorrelationId}`);
      results.tests.push({ name: 'correlation_id_propagation', status: 'PASS', correlationId: customCorrelationId });
    } else {
      throw new Error(`Correlation ID mismatch: expected ${customCorrelationId}, got ${res2.headers['x-request-id']}`);
    }

    // 3. Controlled Error Generation: Unhandled 500
    console.log('\nStep 3: Testing controlled unhandled 500 error generation & sanitized error envelope...');
    const errorReqId = 'controlled-error-500-req';
    const res3 = await app.inject({
      method: 'GET',
      url: '/api/debug/error?type=unhandled',
      headers: { 'x-request-id': errorReqId },
    });
    
    const body3 = JSON.parse(res3.payload);
    if (res3.statusCode === 500 && body3.error === 'Internal Server Error' && body3.requestId === errorReqId) {
      console.log(`[PASS] Intercepted 500 error: sanitized message, attached requestId=${body3.requestId}`);
      results.tests.push({ name: 'controlled_500_interception', status: 'PASS', response: body3 });
    } else {
      throw new Error(`Controlled 500 check failed: statusCode=${res3.statusCode}, payload=${res3.payload}`);
    }

    // 4. Controlled Error Generation: Simulated Database Failure (503)
    console.log('\nStep 4: Testing controlled database failure simulation (503)...');
    const dbErrReqId = 'controlled-db-error-503-req';
    const res4 = await app.inject({
      method: 'GET',
      url: '/api/debug/error?type=db_failure',
      headers: { 'x-request-id': dbErrReqId },
    });

    const body4 = JSON.parse(res4.payload);
    if (res4.statusCode === 503 && body4.requestId === dbErrReqId) {
      console.log(`[PASS] Intercepted simulated DB failure: statusCode=503, requestId=${body4.requestId}`);
      results.tests.push({ name: 'controlled_db_failure_503', status: 'PASS', response: body4 });
    } else {
      throw new Error(`Controlled DB failure check failed: statusCode=${res4.statusCode}`);
    }

    // 5. Metrics Telemetry Endpoint
    console.log('\nStep 5: Testing telemetry & metrics aggregation endpoint (/api/metrics)...');
    const res5 = await app.inject({ method: 'GET', url: '/api/metrics' });
    const body5 = JSON.parse(res5.payload);
    
    if (res5.statusCode === 200 && body5.requests.total >= 4 && body5.memory.heapUsedMb > 0) {
      console.log(`[PASS] Telemetry summary active: totalRequests=${body5.requests.total}, status2xx=${body5.requests.byStatusClass['2xx']}, status5xx=${body5.requests.byStatusClass['5xx']}, p50Latency=${body5.latency.p50Ms}ms`);
      results.tests.push({ name: 'metrics_telemetry_snapshot', status: 'PASS', metrics: body5 });
    } else {
      throw new Error(`Metrics endpoint verification failed: status=${res5.statusCode}, payload=${res5.payload}`);
    }

    // 6. Write report artifact if flag provided
    if (process.argv.includes('--write-report')) {
      const reportPath = path.resolve('reports/w004_observability_report.json');
      fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
      console.log(`\nObservability report written to: reports/w004_observability_report.json`);
    }

    console.log('\n===============================================================');
    console.log('   ALL W004 OBSERVABILITY & TELEMETRY CHECKS PASSED 100%!   ');
    console.log('===============================================================\n');
    process.exit(0);
  } finally {
    await app.close();
  }
}

runVerification().catch((err) => {
  console.error('\n[FAIL] Observability verification failed:', err);
  process.exit(1);
});
