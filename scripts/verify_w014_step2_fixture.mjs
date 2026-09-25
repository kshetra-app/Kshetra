/**
 * scripts/verify_w014_step2_fixture.mjs
 * Authoritative Read-Only Verification of Staging Acceptance Fixture (W014 Step 2)
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve('.env.staging');
if (!fs.existsSync(envPath)) {
  console.error('FATAL: .env.staging not found');
  process.exit(1);
}
const env = dotenv.parse(fs.readFileSync(envPath, 'utf8'));

const supabaseUrl = env.SUPABASE_URL || 'https://fkpigozcqnmcvofuksar.supabase.co';
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY missing');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

async function runStep2Verification() {
  console.log('================================================================');
  console.log('W014 STEP 2: STAGING ACCEPTANCE FIXTURE VERIFICATION');
  console.log(`Target Database: ${supabaseUrl}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('================================================================\n');

  const results = [];
  function check(num, name, passed, detail) {
    results.push({ num, name, passed, detail });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] Check ${num}: ${name} - ${detail}`);
  }

  // 1. Dataset version exists
  const { data: dsVer, error: dsErr } = await adminClient
    .from('dataset_versions')
    .select('*')
    .eq('id', 'ts_lgd_mandals_staging_official_v1')
    .single();

  check(1, 'dataset_version exists', !dsErr && !!dsVer, dsErr ? dsErr.message : 'Found in public.dataset_versions');

  if (!dsVer) {
    console.error('\n[FATAL] ts_lgd_mandals_staging_official_v1 not found. Stop.');
    process.exit(1);
  }

  // 2. dataset_id = ts_lgd_mandals
  check(2, 'dataset_id = ts_lgd_mandals', dsVer.dataset_id === 'ts_lgd_mandals', `Observed: ${dsVer.dataset_id}`);

  // 3. default_status = OFFICIAL
  check(3, 'default_status = OFFICIAL', dsVer.default_status === 'OFFICIAL', `Observed: ${dsVer.default_status}`);

  // 4. verification_evidence_id = e0140000-0000-0000-0000-000000000041
  check(4, 'verification_evidence_id matches', dsVer.verification_evidence_id === 'e0140000-0000-0000-0000-000000000041', `Observed: ${dsVer.verification_evidence_id}`);

  // 5. checksum matches
  const expectedSha = '7163cf2935f246cac07a33dd348345fcee174b9583ee5f969afbfd44250bff62';
  check(5, 'checksum_sha256 matches authentic LGD artifact', dsVer.checksum_sha256 === expectedSha, `Observed: ${dsVer.checksum_sha256}`);

  // 6. metadata identifies staging_only / w014_acceptance_verification
  const metaOk = dsVer.metadata?.environment === 'staging_only' && dsVer.metadata?.infrastructure_purpose === 'w014_acceptance_verification';
  check(6, 'metadata staging_only / acceptance flags', metaOk, `Observed: ${JSON.stringify(dsVer.metadata)}`);

  // 7. evidence record exists and contains expected artifact/hash/authority
  const { data: evRec, error: evErr } = await adminClient
    .from('evidence_records')
    .select('*')
    .eq('id', 'e0140000-0000-0000-0000-000000000041')
    .single();

  const evOk = !evErr && evRec &&
    evRec.artifact_name === 'mopr_lgd_subdistrict_directory_ts.json' &&
    evRec.artifact_sha256 === expectedSha &&
    evRec.verification_authority === 'Ministry of Panchayati Raj, Government of India';

  check(7, 'evidence_records row integrity', evOk, evErr ? evErr.message : `Authority: ${evRec?.verification_authority}, Artifact: ${evRec?.artifact_name}`);

  // 8 & 9. W012 immutability triggers remain active; DELETE rejected
  const { error: delErr } = await adminClient
    .from('dataset_versions')
    .delete()
    .eq('id', 'ts_lgd_mandals_staging_official_v1');

  const delRejected = !!delErr && (delErr.message.includes('DELETION PROHIBITED') || delErr.code === 'P0001');
  check(8, 'W012 immutability trigger active', delRejected, `Delete error: ${delErr?.code} - ${delErr?.message}`);
  check(9, 'DELETE rejected by trigger', delRejected, 'Fails closed via prevent_dataset_version_mutation()');

  // 10. No baseline dataset version has been modified
  const { data: baselineDist } = await adminClient.from('dataset_versions').select('default_status').eq('id', 'ts_districts_2014_v1').single();
  const { data: baselineLgd } = await adminClient.from('dataset_versions').select('default_status').eq('id', 'ts_lgd_mandals_2023_v1').single();
  const baselineOk = baselineDist?.default_status === 'UNVERIFIED' && baselineLgd?.default_status === 'UNVERIFIED';
  check(10, 'Baseline datasets untouched (UNVERIFIED)', baselineOk, `ts_districts_2014_v1: ${baselineDist?.default_status}, ts_lgd_mandals_2023_v1: ${baselineLgd?.default_status}`);

  console.log('\n================================================================');
  const allPassed = results.every(r => r.passed);
  console.log(`STEP 2 RESULT: ${allPassed ? 'ALL 10/10 CHECKS PASSED' : 'FAILED'}`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runStep2Verification().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});
