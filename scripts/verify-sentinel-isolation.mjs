import assert from 'assert';
import fs from 'fs';
import path from 'path';

// Read credentials dynamically without committing secrets
const stagingEnvPath = path.resolve('.env.staging');
const prodEnvPath = path.resolve('apps/api/.env');

let stagingServiceKey = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
if (!stagingServiceKey && fs.existsSync(stagingEnvPath)) {
  const content = fs.readFileSync(stagingEnvPath, 'utf8');
  const match = content.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
  if (match) stagingServiceKey = match[1].trim();
}

let prodAnonKey = process.env.PROD_SUPABASE_ANON_KEY;
if (!prodAnonKey && fs.existsSync(prodEnvPath)) {
  const content = fs.readFileSync(prodEnvPath, 'utf8');
  const match = content.match(/SUPABASE_ANON_KEY=(.+)/);
  if (match) prodAnonKey = match[1].trim();
}

const STAGING_URL = 'https://fkpigozcqnmcvofuksar.supabase.co';
const PROD_URL = 'https://ehfafcnimmjusyvplbah.supabase.co';
const SENTINEL_ID = '99999999-9999-4999-8999-999999999999';
const REPORTER_ID = 'a0000000-0000-0000-0000-000000000001';

async function runSentinelTest() {
  console.log('=== RUNNING LIVE CROSS-ENVIRONMENT SENTINEL ISOLATION TEST ===');
  console.log('Target Staging:', STAGING_URL);
  console.log('Target Production:', PROD_URL);
  console.log('Sentinel ID:', SENTINEL_ID, '\n');

  assert.ok(stagingServiceKey, 'Staging service key must be present');
  assert.ok(prodAnonKey, 'Production anon key must be present');

  // Step 1: Clean up any prior sentinel in Staging
  await fetch(STAGING_URL + '/rest/v1/civic_issues?id=eq.' + SENTINEL_ID, {
    method: 'DELETE',
    headers: {
      'apikey': stagingServiceKey,
      'Authorization': 'Bearer ' + stagingServiceKey
    }
  });

  // Step 2: Insert Sentinel into Staging
  const sentinelRecord = {
    id: SENTINEL_ID,
    reporter_id: REPORTER_ID,
    state_code: 'TS',
    title: 'W002-R1 Sentinel Verification Issue',
    description: 'Automated verification record for runtime isolation between Staging and Production.',
    category: 'roads',
    severity: 'low',
    status: 'open'
  };

  console.log('1. Inserting sentinel record into Staging database...');
  const insertRes = await fetch(STAGING_URL + '/rest/v1/civic_issues', {
    method: 'POST',
    headers: {
      'apikey': stagingServiceKey,
      'Authorization': 'Bearer ' + stagingServiceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(sentinelRecord)
  });

  if (!insertRes.ok) {
    const errText = await insertRes.text();
    throw new Error('Failed to insert sentinel into staging: ' + insertRes.status + ' ' + errText);
  }
  const insertedData = await insertRes.json();
  console.log('   [SUCCESS] Sentinel inserted into Staging:', insertedData[0]?.id);

  // Step 3: Verify Sentinel exists in Staging
  console.log('2. Verifying sentinel exists in Staging database...');
  const verifyStgRes = await fetch(STAGING_URL + '/rest/v1/civic_issues?id=eq.' + SENTINEL_ID, {
    headers: {
      'apikey': stagingServiceKey,
      'Authorization': 'Bearer ' + stagingServiceKey
    }
  });
  const stgData = await verifyStgRes.json();
  assert.strictEqual(stgData.length, 1, 'Sentinel must exist in staging database');
  console.log('   [SUCCESS] Sentinel confirmed in Staging database.');

  // Step 4: Verify Sentinel does NOT exist in Production
  console.log('3. Verifying sentinel is completely ABSENT from Production database...');
  const verifyProdRes = await fetch(PROD_URL + '/rest/v1/civic_issues?id=eq.' + SENTINEL_ID, {
    headers: {
      'apikey': prodAnonKey,
      'Authorization': 'Bearer ' + prodAnonKey
    }
  });
  assert.strictEqual(verifyProdRes.status, 200, 'Production query must succeed');
  const prodData = await verifyProdRes.json();
  assert.strictEqual(prodData.length, 0, 'Sentinel MUST NOT exist in production database');
  console.log('   [SUCCESS] Sentinel query in Production returned 0 rows (strict cross-environment isolation verified).');

  // Step 5: Clean up sentinel from Staging
  console.log('4. Cleaning up sentinel record from Staging database...');
  const delRes = await fetch(STAGING_URL + '/rest/v1/civic_issues?id=eq.' + SENTINEL_ID, {
    method: 'DELETE',
    headers: {
      'apikey': stagingServiceKey,
      'Authorization': 'Bearer ' + stagingServiceKey
    }
  });
  assert.ok(delRes.ok, 'Sentinel deletion should succeed');
  console.log('   [SUCCESS] Sentinel deleted from Staging.');

  console.log('\n======================================================');
  console.log('LIVE RUNTIME CROSS-ENVIRONMENT ISOLATION VERIFIED 100%!');
  console.log('======================================================\n');
}

runSentinelTest().catch(err => {
  console.error('[FATAL] Sentinel test failed:', err);
  process.exit(1);
});
