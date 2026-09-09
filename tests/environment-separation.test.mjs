import assert from 'assert';
import { resolveEnvironment, getEnvironmentConfig, ENVIRONMENT_CONFIGS } from '../packages/shared/src/config/environments.ts';
import { buildApp } from '../apps/api/src/server.ts';

console.log('=== RUNNING W002-R1 RUNTIME ISOLATION & CONFIGURATION SUITE ===\n');

// 1. Environment Resolution Precedence & EAS Preview Mapping
assert.strictEqual(resolveEnvironment('production'), 'production');
assert.strictEqual(resolveEnvironment('staging'), 'staging');
assert.strictEqual(resolveEnvironment('preview'), 'staging', 'EAS preview profile must map strictly to staging');
assert.strictEqual(resolveEnvironment('development'), 'development');
assert.strictEqual(resolveEnvironment('test'), 'test');
console.log('[PASS] Step 7 & 8: Environment resolution and EAS preview -> staging mapping verified.');

// 2. Configuration & URL Isolation
const dev = getEnvironmentConfig('development');
const stg = getEnvironmentConfig('staging');
const prod = getEnvironmentConfig('production');

assert.notStrictEqual(dev.apiBaseUrl, prod.apiBaseUrl);
assert.notStrictEqual(stg.apiBaseUrl, prod.apiBaseUrl);
assert.notStrictEqual(dev.supabaseUrl, prod.supabaseUrl);
assert.notStrictEqual(stg.supabaseUrl, prod.supabaseUrl);
console.log('[PASS] Test A & B: Staging and Production URLs are strictly segregated.');

// 3. CORS Isolation & Localhost Elimination from Production
assert.ok(prod.allowedOrigins.includes('https://kshetra.in'));
assert.ok(prod.allowedOrigins.includes('https://panin.in'));
assert.ok(!prod.allowedOrigins.includes('http://localhost:8081'), 'Step 9: localhost:8081 must NOT be in production allowed origins');
assert.ok(!prod.allowedOrigins.includes('https://staging.kshetra.in'), 'Production must NOT allow staging origins');
assert.ok(stg.allowedOrigins.includes('https://staging.kshetra.in'));
console.log('[PASS] Step 9: Production CORS strictly rejects localhost:8081 and staging origins.');

// 4. Runtime Fastify CORS Injection Test with new clean origins
async function testCorsInjection() {
  process.env.NODE_ENV = 'production';
  delete process.env.CORS_ORIGINS;

  const app = await buildApp();
  await app.ready();

  // Prod origin: accepted
  const resProd = await app.inject({
    method: 'OPTIONS',
    url: '/api/health',
    headers: { origin: 'https://kshetra.in', 'access-control-request-method': 'GET' }
  });
  assert.strictEqual(resProd.statusCode, 204);
  assert.strictEqual(resProd.headers['access-control-allow-origin'], 'https://kshetra.in');

  // Staging origin: rejected
  const resStg = await app.inject({
    method: 'OPTIONS',
    url: '/api/health',
    headers: { origin: 'https://staging.kshetra.in', 'access-control-request-method': 'GET' }
  });
  assert.strictEqual(resStg.statusCode, 204);
  assert.strictEqual(resStg.headers['access-control-allow-origin'], undefined);

  // Localhost:8081: rejected in production
  const resLocal = await app.inject({
    method: 'OPTIONS',
    url: '/api/health',
    headers: { origin: 'http://localhost:8081', 'access-control-request-method': 'GET' }
  });
  assert.strictEqual(resLocal.statusCode, 204);
  assert.strictEqual(resLocal.headers['access-control-allow-origin'], undefined);

  // Unauthorized domain: rejected
  const resEvil = await app.inject({
    method: 'OPTIONS',
    url: '/api/health',
    headers: { origin: 'https://attacker.com', 'access-control-request-method': 'GET' }
  });
  assert.strictEqual(resEvil.statusCode, 204);
  assert.strictEqual(resEvil.headers['access-control-allow-origin'], undefined);

  await app.close();
  console.log('[PASS] Runtime Fastify CORS injection confirms production origin accepted, localhost/staging/evil rejected.');
}

testCorsInjection().then(() => {
  console.log('\n======================================================');
  console.log('ALL W002-R1 RUNTIME ISOLATION TESTS PASSED!');
  console.log('======================================================\n');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
