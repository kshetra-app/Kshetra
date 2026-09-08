import { buildApp } from '../apps/api/src/server.js';
import https from 'https';

const testOrigins = [
  'https://kshetra.in',
  'https://www.kshetra.in',
  'https://panin.in',
  'https://www.panin.in',
  'https://evil-unauthorized-domain.com'
];

async function testLiveRailway() {
  console.log('=== LIVE RAILWAY PRODUCTION CORS TEST ===');
  const results = [];
  for (const origin of testOrigins) {
    const res = await new Promise((resolve) => {
      const req = https.request('https://kshetra-api-production-9f06.up.railway.app/api/health', {
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'GET'
        }
      }, (resp) => {
        resolve({
          origin,
          status: resp.statusCode,
          allowOrigin: resp.headers['access-control-allow-origin'] || null,
          allowCredentials: resp.headers['access-control-allow-credentials'] || null
        });
      });
      req.on('error', (err) => resolve({ origin, error: err.message }));
      req.end();
    });
    console.log(`[LIVE RAILWAY] Origin: ${origin.padEnd(36)} -> Status: ${res.status} | Allow-Origin: ${res.allowOrigin}`);
    results.push(res);
  }
  return results;
}

async function testLocalFastifyCommittedCode() {
  console.log('\n=== COMMITTED FASTIFY CODE (NODE_ENV=production) CORS INJECT TEST ===');
  process.env.NODE_ENV = 'production';
  delete process.env.CORS_ORIGINS; // ensure testing default fallback behavior

  const app = await buildApp();
  await app.ready();

  const results = [];
  for (const origin of testOrigins) {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/api/health',
      headers: {
        origin,
        'access-control-request-method': 'GET'
      }
    });

    const allowOrigin = res.headers['access-control-allow-origin'];
    const allowCreds = res.headers['access-control-allow-credentials'];
    const isAllowed = allowOrigin === origin;
    const isExpected = origin.includes('kshetra.in') || origin.includes('panin.in') ? isAllowed : !allowOrigin;

    console.log(`[COMMITTED CODE] Origin: ${origin.padEnd(36)} -> Status: ${res.statusCode} | Allow-Origin: ${allowOrigin || 'BLOCKED (None)'} | Expected: ${isExpected ? 'PASS' : 'FAIL'}`);
    results.push({
      origin,
      status: res.statusCode,
      allowOrigin: allowOrigin || null,
      allowCredentials: allowCreds || null,
      isAllowed,
      isExpected
    });
  }
  await app.close();
  return results;
}

async function main() {
  const liveResults = await testLiveRailway();
  const localResults = await testLocalFastifyCommittedCode();

  const allCommittedPass = localResults.every(r => r.isExpected);
  console.log(`\nOverall Committed Code CORS Verdict: ${allCommittedPass ? 'PASSED' : 'FAILED'}`);
}

main().catch(console.error);
