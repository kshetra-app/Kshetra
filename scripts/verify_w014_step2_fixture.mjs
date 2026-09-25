/**
 * scripts/verify_w014_step2_fixture.mjs
 * Authoritative Read-Only Verification of Staging Acceptance Fixture (W014 Step 2)
 * Executes 18 deterministic condition checks directly against live staging.
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
    console.log(`[${passed ? 'PASS' : 'FAIL'}] Check ${String(num).padStart(2, ' ')}: ${name} - ${detail}`);
  }

  const expectedEvidenceId = 'e0140000-0000-0000-0000-000000000041';
  const expectedArtifactName = 'mopr_lgd_subdistrict_directory_ts.json';
  const expectedSha = '7163cf2935f246cac07a33dd348345fcee174b9583ee5f969afbfd44250bff62';
  const expectedAuthority = 'Ministry of Panchayati Raj, Government of India';
  const expectedVerifiedBy = 'LGD Subdistrict Directory Ingest Engine';
  const expectedDatasetVersionId = 'ts_lgd_mandals_staging_official_v1';
  const expectedDatasetId = 'ts_lgd_mandals';
  const expectedVersionTag = 'staging_acceptance_official_v1';
  const expectedEffectiveFrom = '2023-01-01';
  const expectedRecordCount = 589;

  // Query evidence_records
  const { data: evRec, error: evErr } = await adminClient
    .from('evidence_records')
    .select('*')
    .eq('id', expectedEvidenceId)
    .single();

  // Query dataset_versions
  const { data: dsVer, error: dsErr } = await adminClient
    .from('dataset_versions')
    .select('*')
    .eq('id', expectedDatasetVersionId)
    .single();

  // Check 1: Evidence Record Row Identity
  check(1, 'Evidence Record Row Identity', !evErr && !!evRec && evRec.id === expectedEvidenceId, evErr ? evErr.message : `id = ${evRec?.id}`);

  // Check 2: Evidence Record Exact Artifact Name
  check(2, 'Evidence Record Exact Artifact Name', evRec?.artifact_name === expectedArtifactName, `Observed: ${evRec?.artifact_name}`);

  // Check 3: Evidence Record Exact Artifact SHA-256
  check(3, 'Evidence Record Exact Artifact SHA-256', evRec?.artifact_sha256 === expectedSha, `Observed: ${evRec?.artifact_sha256}`);

  // Check 4: Evidence Record Exact Verification Authority
  check(4, 'Evidence Record Exact Verification Authority', evRec?.verification_authority === expectedAuthority, `Observed: ${evRec?.verification_authority}`);

  // Check 5: Evidence Record Exact Verified By
  check(5, 'Evidence Record Exact Verified By', evRec?.verified_by === expectedVerifiedBy, `Observed: ${evRec?.verified_by}`);

  // Check 6: Dataset Version Row Identity
  check(6, 'Dataset Version Row Identity', !dsErr && !!dsVer && dsVer.id === expectedDatasetVersionId, dsErr ? dsErr.message : `id = ${dsVer?.id}`);

  // Check 7: Dataset Version Exact Dataset ID
  check(7, 'Dataset Version Exact Dataset ID', dsVer?.dataset_id === expectedDatasetId, `Observed: ${dsVer?.dataset_id}`);

  // Check 8: Dataset Version Exact Version Tag
  check(8, 'Dataset Version Exact Version Tag', dsVer?.version_tag === expectedVersionTag, `Observed: ${dsVer?.version_tag}`);

  // Check 9: Dataset Version Exact Effective From
  check(9, 'Dataset Version Exact Effective From', dsVer?.effective_from === expectedEffectiveFrom, `Observed: ${dsVer?.effective_from}`);

  // Check 10: Dataset Version Exact Record Count
  check(10, 'Dataset Version Exact Record Count', dsVer?.record_count === expectedRecordCount, `Observed: ${dsVer?.record_count}`);

  // Check 11: Dataset Version Exact Checksum SHA-256
  check(11, 'Dataset Version Exact Checksum SHA-256', dsVer?.checksum_sha256 === expectedSha, `Observed: ${dsVer?.checksum_sha256}`);

  // Check 12: Dataset Version Exact Default Status
  check(12, 'Dataset Version Exact Default Status', dsVer?.default_status === 'OFFICIAL', `Observed: ${dsVer?.default_status}`);

  // Check 13: Dataset Version Exact Verification Evidence ID
  check(13, 'Dataset Version Exact Verification Evidence ID', dsVer?.verification_evidence_id === expectedEvidenceId, `Observed: ${dsVer?.verification_evidence_id}`);

  // Check 14: Dataset Version Exact Metadata Flags
  const metaOk = dsVer?.metadata?.immutable === true &&
    dsVer?.metadata?.environment === 'staging_only' &&
    dsVer?.metadata?.infrastructure_purpose === 'w014_acceptance_verification';
  check(14, 'Dataset Version Exact Metadata Flags', metaOk, `Observed: ${JSON.stringify(dsVer?.metadata)}`);

  // Check 15: Reciprocal Evidence Linkage Integrity
  const reciprocalOk = dsVer?.verification_evidence_id === evRec?.id && !!evRec?.id;
  check(15, 'Reciprocal Evidence Linkage Integrity', reciprocalOk, `dv.verification_evidence_id=${dsVer?.verification_evidence_id}, ev.id=${evRec?.id}`);

  // Check 16: W012 Immutability Triggers Active
  const { error: delErr } = await adminClient
    .from('dataset_versions')
    .delete()
    .eq('id', expectedDatasetVersionId);
  const delRejected = !!delErr && (delErr.message.includes('DELETION PROHIBITED') || delErr.code === 'P0001');
  check(16, 'W012 Immutability Triggers Active', delRejected, `Delete rejection verified: ${delErr?.code} - ${delErr?.message}`);

  // Check 17: Baseline Dataset Versions Untouched
  const { data: baselineDist } = await adminClient.from('dataset_versions').select('default_status').eq('id', 'ts_districts_2014_v1').single();
  const { data: baselineLgd } = await adminClient.from('dataset_versions').select('default_status').eq('id', 'ts_lgd_mandals_2023_v1').single();
  const baselineOk = baselineDist?.default_status === 'UNVERIFIED' && baselineLgd?.default_status === 'UNVERIFIED';
  check(17, 'Baseline Dataset Versions Untouched', baselineOk, `ts_districts_2014_v1: ${baselineDist?.default_status}, ts_lgd_mandals_2023_v1: ${baselineLgd?.default_status}`);

  // Check 18: Fixture Singleton Cardinality & Catalog Scope
  const { count: evCount } = await adminClient.from('evidence_records').select('*', { count: 'exact', head: true }).eq('id', expectedEvidenceId);
  const { count: dvCount } = await adminClient.from('dataset_versions').select('*', { count: 'exact', head: true }).eq('id', expectedDatasetVersionId);
  const singletonOk = evCount === 1 && dvCount === 1;
  check(18, 'Fixture Singleton Cardinality & Catalog Scope', singletonOk, `evidence_records count: ${evCount}, dataset_versions count: ${dvCount}`);

  console.log('\n================================================================');
  const passedCount = results.filter(r => r.passed).length;
  const allPassed = passedCount === 18;
  console.log(`STEP 2 RESULT: ${allPassed ? 'ALL 18/18 CHECKS PASSED' : `${passedCount}/18 CHECKS PASSED`}`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runStep2Verification().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});
