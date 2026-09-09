import assert from 'assert';
import { resolveEnvironment, getEnvironmentConfig, ENVIRONMENT_CONFIGS } from '../packages/shared/src/config/environments.ts';

console.log('=== RUNNING ENVIRONMENT SEPARATION SUITE (JOB W002) ===\n');

// 1. Environment Resolution
assert.strictEqual(resolveEnvironment('production'), 'production');
assert.strictEqual(resolveEnvironment('prod'), 'production');
assert.strictEqual(resolveEnvironment('staging'), 'staging');
assert.strictEqual(resolveEnvironment('stage'), 'staging');
assert.strictEqual(resolveEnvironment('development'), 'development');
assert.strictEqual(resolveEnvironment('test'), 'test');
assert.strictEqual(resolveEnvironment(''), 'development');
console.log('[PASS] Environment resolution logic verified.');

// 2. Configuration Isolation
const dev = getEnvironmentConfig('development');
const stg = getEnvironmentConfig('staging');
const prod = getEnvironmentConfig('production');

// Assert separate URLs
assert.notStrictEqual(dev.apiBaseUrl, prod.apiBaseUrl, 'Dev API URL must differ from Production');
assert.notStrictEqual(stg.apiBaseUrl, prod.apiBaseUrl, 'Staging API URL must differ from Production');
assert.notStrictEqual(dev.supabaseUrl, prod.supabaseUrl, 'Dev DB URL must differ from Production');
assert.notStrictEqual(stg.supabaseUrl, prod.supabaseUrl, 'Staging DB URL must differ from Production');
console.log('[PASS] Dev, Staging, and Production URLs are strictly isolated.');

// Assert boolean flags
assert.strictEqual(prod.isProduction, true);
assert.strictEqual(prod.isStaging, false);
assert.strictEqual(stg.isProduction, false);
assert.strictEqual(stg.isStaging, true);
assert.strictEqual(dev.isDevelopment, true);
console.log('[PASS] Environment flags are correctly segregated.');

// 3. CORS Isolation
assert.ok(prod.allowedOrigins.includes('https://kshetra.in'));
assert.ok(prod.allowedOrigins.includes('https://panin.in'));
assert.ok(!prod.allowedOrigins.includes('https://staging.kshetra.in'));
assert.ok(stg.allowedOrigins.includes('https://staging.kshetra.in'));
console.log('[PASS] Staging and Production CORS origins are properly partitioned.');

console.log('\n======================================================');
console.log('ALL ENVIRONMENT SEPARATION TESTS PASSED (JOB W002)!');
console.log('======================================================\n');
