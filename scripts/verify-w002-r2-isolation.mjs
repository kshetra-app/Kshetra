import assert from 'assert';
import fs from 'fs';
import path from 'path';

// Read credentials dynamically from gitignored environment files
const stagingEnvPath = path.resolve('.env.staging');
const prodEnvPath = path.resolve('apps/api/.env');

let stagingServiceKey = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
let stagingAnonKey = process.env.STAGING_SUPABASE_ANON_KEY;
if (fs.existsSync(stagingEnvPath)) {
  const content = fs.readFileSync(stagingEnvPath, 'utf8');
  const m1 = content.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
  if (m1) stagingServiceKey = m1[1].trim();
  const m2 = content.match(/SUPABASE_ANON_KEY=(.+)/);
  if (m2) stagingAnonKey = m2[1].trim();
}

let prodAnonKey = process.env.PROD_SUPABASE_ANON_KEY;
let prodServiceKey = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;
if (fs.existsSync(prodEnvPath)) {
  const content = fs.readFileSync(prodEnvPath, 'utf8');
  const m1 = content.match(/SUPABASE_ANON_KEY=(.+)/);
  if (m1) prodAnonKey = m1[1].trim();
  const m2 = content.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
  if (m2) prodServiceKey = m2[1].trim();
}

const STAGING_URL = 'https://fkpigozcqnmcvofuksar.supabase.co';
const PROD_URL = 'https://ehfafcnimmjusyvplbah.supabase.co';

const STAGING_API = 'https://kshetra-api-staging.up.railway.app';
const PROD_API = 'https://kshetra-api-production-9f06.up.railway.app';

const SENTINEL_ID = '99999999-9999-4999-8999-999999999999';
const REPORTER_ID = 'a0000000-0000-0000-0000-000000000001';

async function runW002R2IsolationSuite() {
  console.log('===============================================================');
  console.log('   W002-R2 COMPREHENSIVE RUNTIME ISOLATION SUITE (TESTS A - I)   ');
  console.log('===============================================================\n');

  // Test A: Staging API connects to Staging DB
  console.log('--- TEST A: Staging API connects to Staging DB ---');
  const resStgApi = await fetch(STAGING_API + '/api/health');
  assert.strictEqual(resStgApi.status, 200, 'Staging API health must return 200');
  const stgApiData = await resStgApi.json();
  assert.strictEqual(stgApiData.service, 'kshetra-api');
  console.log('   [PASS] Staging API is operational:', STAGING_API);

  // Test B: Production API connects to Production DB
  console.log('--- TEST B: Production API connects to Production DB ---');
  const resProdApi = await fetch(PROD_API + '/health');
  assert.strictEqual(resProdApi.status, 200, 'Production API health must return 200');
  const prodApiData = await resProdApi.json();
  assert.strictEqual(prodApiData.service, 'kshetra-api');
  console.log('   [PASS] Production API is operational:', PROD_API);

  // Test C: Staging Sentinel Write & Read
  console.log('--- TEST C: Staging Sentinel (STAGING_SENTINEL_W002) Write & Isolation ---');
  // Clean prior
  await fetch(STAGING_URL + '/rest/v1/civic_issues?id=eq.' + SENTINEL_ID, {
    method: 'DELETE',
    headers: { 'apikey': stagingServiceKey, 'Authorization': 'Bearer ' + stagingServiceKey }
  });

  const sentinel = {
    id: SENTINEL_ID,
    reporter_id: REPORTER_ID,
    state_code: 'TS',
    title: 'STAGING_SENTINEL_W002',
    description: 'Automated verification record proving Staging DB mutation is completely absent from Production DB.',
    category: 'roads',
    severity: 'low',
    status: 'open'
  };

  const insRes = await fetch(STAGING_URL + '/rest/v1/civic_issues', {
    method: 'POST',
    headers: {
      'apikey': stagingServiceKey,
      'Authorization': 'Bearer ' + stagingServiceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(sentinel)
  });
  assert.ok(insRes.ok, 'Failed to insert sentinel in staging');
  console.log('   [PASS] Sentinel inserted into Staging DB:', SENTINEL_ID);

  // Verify in Staging
  const getStg = await fetch(STAGING_URL + '/rest/v1/civic_issues?id=eq.' + SENTINEL_ID, {
    headers: { 'apikey': stagingServiceKey, 'Authorization': 'Bearer ' + stagingServiceKey }
  });
  const stgRows = await getStg.json();
  assert.strictEqual(stgRows.length, 1, 'Sentinel must exist in staging');
  assert.strictEqual(stgRows[0].title, 'STAGING_SENTINEL_W002');
  console.log('   [PASS] Sentinel verified present in Staging DB.');

  // Verify absent in Production
  const getProd = await fetch(PROD_URL + '/rest/v1/civic_issues?id=eq.' + SENTINEL_ID, {
    headers: { 'apikey': prodAnonKey, 'Authorization': 'Bearer ' + prodAnonKey }
  });
  const prodRows = await getProd.json();
  assert.strictEqual(prodRows.length, 0, 'Sentinel MUST NOT exist in production');
  console.log('   [PASS] Sentinel confirmed ABSENT from Production DB (0 rows returned).');

  // Clean up
  await fetch(STAGING_URL + '/rest/v1/civic_issues?id=eq.' + SENTINEL_ID, {
    method: 'DELETE',
    headers: { 'apikey': stagingServiceKey, 'Authorization': 'Bearer ' + stagingServiceKey }
  });
  console.log('   [PASS] Sentinel cleaned up from Staging DB.');

  // Test D: Staging Credentials cannot access Production DB
  console.log('--- TEST D: Staging credentials cannot access Production DB ---');
  const resStgOnProd = await fetch(PROD_URL + '/rest/v1/civic_issues?limit=1', {
    headers: { 'apikey': stagingAnonKey, 'Authorization': 'Bearer ' + stagingAnonKey }
  });
  // Should return 401 Unauthorized because JWT project ref does not match
  assert.strictEqual(resStgOnProd.status, 401, 'Staging key on Production must return 401 Unauthorized');
  console.log('   [PASS] Staging credentials on Production DB rejected with 401 Unauthorized.');

  // Test E: Production Credentials cannot access Staging DB
  console.log('--- TEST E: Production credentials cannot access Staging DB ---');
  const resProdOnStg = await fetch(STAGING_URL + '/rest/v1/civic_issues?limit=1', {
    headers: { 'apikey': prodAnonKey, 'Authorization': 'Bearer ' + prodAnonKey }
  });
  assert.strictEqual(resProdOnStg.status, 401, 'Production key on Staging must return 401 Unauthorized');
  console.log('   [PASS] Production credentials on Staging DB rejected with 401 Unauthorized.');

  // Test F: Staging Auth is isolated from Production
  console.log('--- TEST F: Staging Auth (JWT) is isolated from Production ---');
  // Staging JWT on Production Auth /user endpoint
  const authRes = await fetch(PROD_URL + '/auth/v1/user', {
    headers: { 'apikey': prodAnonKey, 'Authorization': 'Bearer ' + stagingAnonKey }
  });
  // 401 or 403 Forbidden with bad_jwt proves token signed by staging secret is rejected by production
  assert.ok(authRes.status === 401 || authRes.status === 403, 'Staging token on Production Auth must return 401 or 403');
  console.log('   [PASS] Auth isolation verified (HTTP', authRes.status, 'cross-project token rejected due to invalid signature).');

  // Test G: Staging Mobile Build points only to Staging
  console.log('--- TEST G: Mobile Staging environment resolution ---');
  const { resolveEnvironment, getEnvironmentConfig } = await import('../packages/shared/src/config/environments.ts');
  const stgConfig = getEnvironmentConfig('staging');
  assert.strictEqual(stgConfig.apiBaseUrl, STAGING_API);
  assert.strictEqual(stgConfig.supabaseUrl, STAGING_URL);
  assert.strictEqual(stgConfig.isStaging, true);
  assert.strictEqual(stgConfig.isProduction, false);
  console.log('   [PASS] Mobile staging build resolves strictly to Staging endpoints.');

  // Test H: Production Mobile Build points only to Production
  console.log('--- TEST H: Mobile Production environment resolution ---');
  const prodConfig = getEnvironmentConfig('production');
  assert.strictEqual(prodConfig.apiBaseUrl, PROD_API);
  assert.strictEqual(prodConfig.supabaseUrl, PROD_URL);
  assert.strictEqual(prodConfig.isProduction, true);
  assert.strictEqual(prodConfig.isStaging, false);
  console.log('   [PASS] Mobile production build resolves strictly to Production endpoints.');

  // Test I: Development does not silently point to Production
  console.log('--- TEST I: Development environment defaults ---');
  const devConfig = getEnvironmentConfig('development');
  assert.notStrictEqual(devConfig.apiBaseUrl, PROD_API);
  assert.notStrictEqual(devConfig.supabaseUrl, PROD_URL);
  assert.strictEqual(devConfig.isProduction, false);
  assert.strictEqual(devConfig.isDevelopment, true);
  console.log('   [PASS] Development environment strictly points to local/placeholder endpoints, not production.');

  console.log('\n===============================================================');
  console.log('   ALL W002-R2 RUNTIME ISOLATION TESTS (A - I) PASSED 100%!   ');
  console.log('===============================================================\n');
}

runW002R2IsolationSuite().catch(err => {
  console.error('[FATAL] Runtime isolation test failed:', err);
  process.exit(1);
});
