/**
 * benchmark_w012_hot_paths.mjs
 * Staging Hot-Path Performance Benchmark Suite (W012)
 *
 * Executes 1,000 warm iterations per representative query against panIN-staging.
 * Measures: p50, p95, p99 latency in milliseconds.
 *
 * Dual Gate Requirements (Section 12):
 * - Primary Gate 1: relative p95 regression <= 5.0%
 * - Primary Gate 2: absolute p95 regression <= 2.0 ms
 * (Both MUST pass)
 *
 * Usage:
 *   node scripts/benchmark_w012_hot_paths.mjs --baseline
 *   node scripts/benchmark_w012_hot_paths.mjs --compare
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const envPath = path.resolve('.env.staging');
if (!fs.existsSync(envPath)) {
  console.error('FATAL: .env.staging not found');
  process.exit(1);
}
const env = dotenv.parse(fs.readFileSync(envPath, 'utf8'));

const supabaseUrl = env.SUPABASE_URL || 'https://fkpigozcqnmcvofuksar.supabase.co';
const anonKey = env.SUPABASE_ANON_KEY;

if (!anonKey) {
  console.error('FATAL: SUPABASE_ANON_KEY missing');
  process.exit(1);
}

const WARMUP_ROUNDS = 50;
const BENCHMARK_ITERATIONS = 1000;
const CONCURRENCY = 10;
const BASELINE_FILE = path.resolve('reports/w012_hot_path_baseline.json');
const REPORT_FILE = path.resolve('reports/w012_performance_benchmark.json');

const QUERIES = [
  {
    id: 'HP-01_STATES',
    description: 'Public query for states jurisdiction entities',
    endpoint: '/rest/v1/states?select=code,name,total_seats&limit=20'
  },
  {
    id: 'HP-02_CONSTITUENCIES',
    description: 'Public query for electoral constituency entities',
    endpoint: '/rest/v1/constituencies?select=id,name,state_id&limit=20'
  }
];

function calculatePercentiles(latencies) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = sum / sorted.length;
  return {
    p50: Number(p50.toFixed(2)),
    p95: Number(p95.toFixed(2)),
    p99: Number(p99.toFixed(2)),
    mean: Number(mean.toFixed(2)),
    min: Number(sorted[0].toFixed(2)),
    max: Number(sorted[sorted.length - 1].toFixed(2))
  };
}

async function runTimedIterations(query, totalIterations, concurrency) {
  const url = supabaseUrl + query.endpoint;
  const headers = {
    'apikey': anonKey,
    'Authorization': 'Bearer ' + anonKey
  };

  const latencies = [];
  let count = 0;

  async function worker() {
    while (count < totalIterations) {
      count++;
      const t0 = performance.now();
      try {
        const res = await fetch(url, { headers, keepalive: true });
        await res.text();
        latencies.push(performance.now() - t0);
      } catch (err) {
        latencies.push(performance.now() - t0);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return latencies;
}

async function runBenchmark(mode) {
  console.log('================================================================');
  console.log(`W012: HOT-PATH PERFORMANCE BENCHMARK (${mode.toUpperCase()})`);
  console.log('Target Database:', supabaseUrl);
  console.log('Iterations:', BENCHMARK_ITERATIONS, '| Warmup:', WARMUP_ROUNDS, '| Concurrency:', CONCURRENCY);
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================================================\n');

  const benchmarkData = {
    timestamp: new Date().toISOString(),
    environment: 'panIN-staging',
    target: supabaseUrl,
    mode,
    warmupIterations: WARMUP_ROUNDS,
    benchmarkIterations: BENCHMARK_ITERATIONS,
    concurrency: CONCURRENCY,
    queries: {}
  };

  for (const q of QUERIES) {
    console.log(`Benchmarking ${q.id} (${q.description})...`);

    // Warmup
    process.stdout.write(`  Warming up (${WARMUP_ROUNDS} iterations)... `);
    await runTimedIterations(q, WARMUP_ROUNDS, 5);
    console.log('Done.');

    // Timed iterations
    process.stdout.write(`  Running ${BENCHMARK_ITERATIONS} timed iterations... `);
    const startWall = performance.now();
    const latencies = await runTimedIterations(q, BENCHMARK_ITERATIONS, CONCURRENCY);
    const wallDuration = performance.now() - startWall;
    console.log(`Done in ${(wallDuration / 1000).toFixed(1)}s.`);

    const stats = calculatePercentiles(latencies);
    console.log(`  Stats: p50=${stats.p50}ms | p95=${stats.p95}ms | p99=${stats.p99}ms | mean=${stats.mean}ms\n`);

    benchmarkData.queries[q.id] = {
      description: q.description,
      endpoint: q.endpoint,
      stats
    };
  }

  if (mode === 'baseline') {
    fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(benchmarkData, null, 2), 'utf8');
    console.log(`Baseline saved to ${BASELINE_FILE}`);
  } else if (mode === 'compare') {
    if (!fs.existsSync(BASELINE_FILE)) {
      console.error(`FATAL: Baseline file not found at ${BASELINE_FILE}. Run with --baseline first.`);
      process.exit(1);
    }
    const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));

    const comparisonReport = {
      timestamp: new Date().toISOString(),
      environment: 'panIN-staging',
      target: supabaseUrl,
      baselineTimestamp: baseline.timestamp,
      iterations: BENCHMARK_ITERATIONS,
      gates: {
        relativeP95ThresholdPercent: 5.0,
        absoluteP95ThresholdMs: 2.0,
        overallVerdict: 'PASS'
      },
      results: []
    };

    console.log('================================================================');
    console.log('PERFORMANCE COMPARISON & ACCEPTANCE GATES (DUAL P95 GATE)');
    console.log('Gate 1: Relative p95 regression <= 5.0%');
    console.log('Gate 2: Absolute p95 regression <= 2.0 ms');
    console.log('================================================================\n');

    let allPassed = true;

    for (const q of QUERIES) {
      const baseStats = baseline.queries[q.id]?.stats;
      const postStats = benchmarkData.queries[q.id]?.stats;

      if (!baseStats || !postStats) {
        console.error(`Missing stats for ${q.id}`);
        allPassed = false;
        continue;
      }

      const p95DeltaMs = Number((postStats.p95 - baseStats.p95).toFixed(2));
      const p95RelativeDeltaPercent = Number((((postStats.p95 - baseStats.p95) / baseStats.p95) * 100).toFixed(2));
      const p50DeltaMs = Number((postStats.p50 - baseStats.p50).toFixed(2));
      const p99DeltaMs = Number((postStats.p99 - baseStats.p99).toFixed(2));

      // Dual Gate Check:
      // If postStats.p95 <= baseStats.p95, regression is <= 0%, which is a pass.
      const passedRelative = p95RelativeDeltaPercent <= 5.0;
      const passedAbsolute = p95DeltaMs <= 2.0;
      const gatePass = passedRelative && passedAbsolute;

      if (!gatePass) allPassed = false;

      const row = {
        queryId: q.id,
        description: q.description,
        baseline: baseStats,
        postMigration: postStats,
        deltas: {
          p50DeltaMs,
          p95DeltaMs,
          p99DeltaMs,
          p95RelativeDeltaPercent
        },
        passedRelative,
        passedAbsolute,
        gatePass: gatePass ? 'PASS' : 'FAIL'
      };

      comparisonReport.results.push(row);

      console.log(`Query: ${q.id}`);
      console.log(`  p50: baseline=${baseStats.p50}ms -> post=${postStats.p50}ms (delta: ${p50DeltaMs >= 0 ? '+' : ''}${p50DeltaMs}ms)`);
      console.log(`  p95: baseline=${baseStats.p95}ms -> post=${postStats.p95}ms (delta: ${p95DeltaMs >= 0 ? '+' : ''}${p95DeltaMs}ms | ${p95RelativeDeltaPercent >= 0 ? '+' : ''}${p95RelativeDeltaPercent}%)`);
      console.log(`  p99: baseline=${baseStats.p99}ms -> post=${postStats.p99}ms (delta: ${p99DeltaMs >= 0 ? '+' : ''}${p99DeltaMs}ms)`);
      console.log(`  Gate: [${gatePass ? 'PASS' : 'FAIL'}] (Relative <= 5%: ${passedRelative ? 'PASS' : 'FAIL'}, Absolute <= 2.0ms: ${passedAbsolute ? 'PASS' : 'FAIL'})\n`);
    }

    comparisonReport.gates.overallVerdict = allPassed ? 'PASS' : 'FAIL';
    fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
    fs.writeFileSync(REPORT_FILE, JSON.stringify(comparisonReport, null, 2), 'utf8');
    console.log(`\nFinal Verdict: ${comparisonReport.gates.overallVerdict}`);
    console.log(`Report written to ${REPORT_FILE}`);
  }
}

const arg = process.argv[2] || '--baseline';
const mode = arg.replace(/^--/, '');
if (mode !== 'baseline' && mode !== 'compare') {
  console.error('Usage: node benchmark_w012_hot_paths.mjs [--baseline | --compare]');
  process.exit(1);
}

runBenchmark(mode).catch(err => {
  console.error('Fatal benchmark error:', err);
  process.exit(1);
});
