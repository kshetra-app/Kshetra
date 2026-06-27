#!/usr/bin/env node
/**
 * Smoke test for the KSHETRA Fastify API.
 *
 * Hits one representative endpoint for each of the 12 route groups registered
 * in apps/api/src/server.ts and reports pass/fail. Exits non-zero if any group
 * fails, so it can gate CI / deploys.
 *
 * Usage:
 *   node scripts/smoke-api.mjs [baseUrl]
 *   BASE_URL=https://api.example.com node scripts/smoke-api.mjs
 *
 * Default baseUrl: http://localhost:3001
 */

const BASE = process.argv[2] || process.env.BASE_URL || 'http://localhost:3001';

// One representative GET per route group. A group passes if the endpoint
// responds with any non-5xx status (2xx/3xx/4xx all prove the route is wired;
// 4xx = route exists but needs different params, still "alive").
const CHECKS = [
  { group: 'health',         method: 'GET', path: '/api/health' },
  { group: 'states',         method: 'GET', path: '/api/v1/states' },
  { group: 'constituencies', method: 'GET', path: '/api/v1/states/TS/constituencies' },
  { group: 'ai',             method: 'GET', path: '/api/v1/ai/status' },
  { group: 'notifications',  method: 'GET', path: '/api/v1/notifications/preferences' },
  { group: 'moderation',     method: 'GET', path: '/api/v1/moderation/queue' },
  { group: 'delimitation',   method: 'GET', path: '/api/v1/delimitation/status' },
  { group: 'journalist',     method: 'GET', path: '/api/v1/journalist/articles' },
  { group: 'politician',     method: 'GET', path: '/api/v1/politician/profiles' },
  { group: 'campaign',       method: 'GET', path: '/api/v1/campaign/campaigns' },
  { group: 'civic',          method: 'GET', path: '/api/v1/civic/bills' },
  { group: 'broadcast',      method: 'GET', path: '/api/v1/broadcast/summary' },
];

const ok = (s) => s >= 200 && s < 500; // route is wired (not a 5xx / connection error)

async function run() {
  console.log(`\nKSHETRA API smoke test → ${BASE}\n${'-'.repeat(56)}`);
  const results = [];
  for (const c of CHECKS) {
    const url = `${BASE}${c.path}`;
    const started = Date.now();
    try {
      const res = await fetch(url, { method: c.method });
      const ms = Date.now() - started;
      const pass = ok(res.status);
      results.push({ ...c, status: res.status, ms, pass });
      console.log(
        `${pass ? 'PASS' : 'FAIL'}  ${c.group.padEnd(15)} ${String(res.status).padEnd(4)} ${ms}ms  ${c.method} ${c.path}`,
      );
    } catch (err) {
      results.push({ ...c, status: 0, pass: false, error: String(err) });
      console.log(`FAIL  ${c.group.padEnd(15)} ERR  ${c.method} ${c.path}  (${err.cause?.code || err.message})`);
    }
  }
  const passed = results.filter((r) => r.pass).length;
  console.log('-'.repeat(56));
  console.log(`${passed}/${results.length} route groups responding\n`);
  if (passed !== results.length) process.exit(1);
}

run();
