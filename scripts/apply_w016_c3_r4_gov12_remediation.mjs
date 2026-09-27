import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

console.log('================================================================');
console.log('W016-C3-R4-GOV-12: HAJIPUR HISTORICAL EVIDENCE REMEDIATION');
console.log(`Execution Timestamp: ${new Date().toISOString()}`);
console.log('Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY');
console.log('Production: STRICTLY PROHIBITED & AIR-GAPPED');
console.log('================================================================\n');

// 1. Verify Target Isolation
const envPath = path.resolve('.env.staging');
if (!fs.existsSync(envPath)) {
  console.error('FATAL: .env.staging not found');
  process.exit(1);
}

const env = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
const supabaseUrl = env.SUPABASE_URL || 'https://fkpigozcqnmcvofuksar.supabase.co';
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl.includes('fkpigozcqnmcvofuksar')) {
  console.error(`FATAL: Execution target is NOT panIN-staging! Detected: ${supabaseUrl}`);
  process.exit(1);
}

if (!serviceKey) {
  console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const TARGET_PROVENANCE_UUID = 'd63eee74-2927-5184-050b-3559f628f8ae';
const EXPECTED_PARENT_UUID = '8c350901-a5d8-fe3d-c5b2-6ffe37601908';
const EXPECTED_LINEAGE_UUID = '68e465c2-a00b-478d-8082-e0cf1f3bbe67';

const EXPECTED_EVIDENCE_UUID = 'e0160000-0000-0000-0000-000000002016';
const EXPECTED_VERIFIER = 'CTO / Statutory Gazette Reconciliation';
const EXPECTED_ARTIFACT_NAME = 'goms_2016_reorganisation_orders.pdf';
const EXPECTED_ARTIFACT_SHA256 = 'aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db';

const REPO_GAZETTE_ARTIFACT = 'data/evidence/w015_b2/telangana_gazette_2016_goms_222_mancherial.txt';

async function executeRemediation() {
  console.log('--- STEP 1: VERIFY EVIDENCE PRECONDITION ---');
  // Check evidence record on staging
  const { data: evData, error: evErr } = await supabase
    .from('evidence_records')
    .select('*')
    .eq('id', EXPECTED_EVIDENCE_UUID)
    .single();

  if (evErr || !evData) {
    console.error('FATAL: Evidence record missing on staging:', evErr);
    process.exit(1);
  }

  if (evData.artifact_name !== EXPECTED_ARTIFACT_NAME) {
    console.error(`FATAL: Evidence artifact_name mismatch: expected ${EXPECTED_ARTIFACT_NAME}, got ${evData.artifact_name}`);
    process.exit(1);
  }

  if (evData.artifact_sha256 !== EXPECTED_ARTIFACT_SHA256) {
    console.error(`FATAL: Evidence SHA-256 mismatch: expected ${EXPECTED_ARTIFACT_SHA256}, got ${evData.artifact_sha256}`);
    process.exit(1);
  }

  // Check preserved repository artifact
  if (!fs.existsSync(REPO_GAZETTE_ARTIFACT)) {
    console.error(`FATAL: Preserved repository artifact missing: ${REPO_GAZETTE_ARTIFACT}`);
    process.exit(1);
  }

  const gazetteContent = fs.readFileSync(REPO_GAZETTE_ARTIFACT, 'utf8');
  if (!gazetteContent.includes('G.O.Ms.No. 222') ||
      !gazetteContent.includes('Revenue (DA-CMRF) Dept') ||
      !gazetteContent.includes('11.10.2016') ||
      !gazetteContent.includes('Hajipur') ||
      !gazetteContent.includes('Mancherial')) {
    console.error('FATAL: Repository gazette artifact content verification failed!');
    process.exit(1);
  }

  console.log('[PASS] Evidence precondition verified:');
  console.log(`       ID:       ${evData.id}`);
  console.log(`       Artifact: ${evData.artifact_name}`);
  console.log(`       SHA-256:  ${evData.artifact_sha256}`);
  console.log(`       Authority:${evData.verification_authority}`);
  console.log(`       Notes:    ${evData.verification_notes}`);
  console.log(`       Repo:     ${REPO_GAZETTE_ARTIFACT} verified`);

  console.log('\n--- STEP 2: CAPTURE PRE-STATE & ASSERT TARGET ROW ---');
  const { data: preRows, error: preErr } = await supabase
    .from('provenance_records')
    .select('*')
    .eq('id', TARGET_PROVENANCE_UUID);

  if (preErr || !preRows || preRows.length !== 1) {
    console.error(`FATAL: Pre-state query failed: expected 1 row, got ${preRows ? preRows.length : 0}`, preErr);
    process.exit(1);
  }

  const preRow = preRows[0];
  console.log('Target row pre-state snapshot captured:');
  console.log(JSON.stringify(preRow, null, 2));

  // Assertions
  if (preRow.status !== 'OFFICIAL') {
    console.error(`FATAL: Pre-state status is ${preRow.status}, expected OFFICIAL`);
    process.exit(1);
  }

  if (preRow.transformation_type !== 'gazette_lineage_canonical_reconciliation') {
    console.error(`FATAL: Pre-state transformation_type is ${preRow.transformation_type}, expected gazette_lineage_canonical_reconciliation`);
    process.exit(1);
  }

  if (preRow.parent_provenance_id !== EXPECTED_PARENT_UUID) {
    console.error(`FATAL: Pre-state parent_provenance_id is ${preRow.parent_provenance_id}, expected ${EXPECTED_PARENT_UUID}`);
    process.exit(1);
  }

  const isUnremediated = preRow.verification_evidence_id === null && preRow.verified_by === null;
  const isRemediated = preRow.verification_evidence_id === EXPECTED_EVIDENCE_UUID && preRow.verified_by === EXPECTED_VERIFIER;

  if (!isUnremediated && !isRemediated) {
    console.error(`FATAL: Target row has unexpected evidence state: verification_evidence_id=${preRow.verification_evidence_id}, verified_by=${preRow.verified_by}`);
    process.exit(1);
  }

  console.log('[PASS] Pre-mutation assertions verified.');

  console.log('\n--- STEP 3: EXECUTE SCOPED ATOMIC UPDATE ---');
  const updatePayload = {
    verification_evidence_id: EXPECTED_EVIDENCE_UUID,
    verified_by: EXPECTED_VERIFIER
  };

  const patchRes = await fetch(`${supabaseUrl}/rest/v1/provenance_records?id=eq.${TARGET_PROVENANCE_UUID}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(updatePayload)
  });

  if (!patchRes.ok) {
    const errText = await patchRes.text();
    console.error(`FATAL: PATCH failed [${patchRes.status} ${patchRes.statusText}]: ${errText}`);
    process.exit(1);
  }

  const updatedRows = await patchRes.json();
  console.log(`[PASS] PATCH succeeded: ${updatedRows.length} row(s) updated.`);

  if (updatedRows.length !== 1) {
    console.error(`FATAL: Expected 1 updated row, got ${updatedRows.length}`);
    process.exit(1);
  }

  console.log('\n--- STEP 4: POST-UPDATE IMMEDIATE ASSERTIONS ---');
  const { data: postRows, error: postErr } = await supabase
    .from('provenance_records')
    .select('*')
    .eq('id', TARGET_PROVENANCE_UUID);

  if (postErr || !postRows || postRows.length !== 1) {
    console.error('FATAL: Post-state query failed:', postErr);
    process.exit(1);
  }

  const postRow = postRows[0];

  if (postRow.verification_evidence_id !== EXPECTED_EVIDENCE_UUID) {
    console.error(`FATAL: Post-state verification_evidence_id is ${postRow.verification_evidence_id}, expected ${EXPECTED_EVIDENCE_UUID}`);
    process.exit(1);
  }

  if (postRow.verified_by !== EXPECTED_VERIFIER) {
    console.error(`FATAL: Post-state verified_by is ${postRow.verified_by}, expected ${EXPECTED_VERIFIER}`);
    process.exit(1);
  }

  if (postRow.status !== 'OFFICIAL') {
    console.error(`FATAL: Post-state status is ${postRow.status}, expected OFFICIAL`);
    process.exit(1);
  }

  // Verify all Classification-A immutable fields exactly equal pre-state
  const classAFields = [
    'id', 'dataset_version_id', 'source_record_id', 'parent_provenance_id',
    'transformation_type', 'transform_version', 'operator', 'created_at'
  ];

  for (const f of classAFields) {
    if (postRow[f] !== preRow[f]) {
      console.error(`FATAL: Immutable field ${f} changed! Pre: ${preRow[f]}, Post: ${postRow[f]}`);
      process.exit(1);
    }
  }

  // Verify metadata dictionary unchanged
  if (JSON.stringify(postRow.metadata) !== JSON.stringify(preRow.metadata)) {
    console.error('FATAL: Metadata dictionary changed post-mutation!');
    process.exit(1);
  }

  console.log('[PASS] Post-update assertions verified:');
  console.log(`       verification_evidence_id = ${postRow.verification_evidence_id}`);
  console.log(`       verified_by = ${postRow.verified_by}`);
  console.log(`       status = ${postRow.status}`);
  console.log('       100% of Class A immutable fields and metadata bitwise identical.');

  console.log('\n--- STEP 5: READ-ONLY INTEGRITY BATTERY ---');
  const { count: mandalsCount } = await supabase.from('mandals').select('*', { count: 'exact', head: true });
  const { count: totalVersions } = await supabase.from('mandal_versions').select('*', { count: 'exact', head: true });
  const { count: curVersions } = await supabase.from('mandal_versions').select('*', { count: 'exact', head: true }).eq('is_current', true);
  const { count: histVersions } = await supabase.from('mandal_versions').select('*', { count: 'exact', head: true }).eq('is_current', false);
  const { count: geoCount } = await supabase.from('entity_geometries').select('*', { count: 'exact', head: true });
  const { count: nullCurrentPointers } = await supabase.from('mandals').select('*', { count: 'exact', head: true }).is('current_version_id', null);

  const LEGACY_PILOT_IDS = [
    'TS-MDL-7101', 'TS-MDL-7102', 'TS-MDL-7103', 'TS-MDL-7104', 'TS-MDL-7105',
    'TS-MDL-5320', 'TS-MDL-5321', 'TS-MDL-5322', 'TS-MDL-5323', 'TS-MDL-5324',
    'TS-MDL-5328', 'TS-MDL-5329'
  ];

  const SUPERSESSION_PROV_UUIDS = [
    '2e5a417a-df4a-988a-5326-010cd5192d33',
    '5e867050-d4f4-caa7-c838-965f55e8f623',
    '7a8b07ec-59ac-c65f-0fc4-94e73c36f6ac',
    'c5226d74-8492-b850-9306-b6f0172bad65',
    'fe9e32df-b654-5c88-6f9b-5ea023a34872',
    '7b3fb40f-4705-a5d1-6875-baedf09b608b',
    'f5dbaa0a-395a-2396-4c39-ffd73db413bf',
    '146cfa88-c2b4-38c2-6d05-5fe03dda5b5d',
    '06317aee-6165-6452-c9b5-0d7553fb7625',
    'fcfc5d9f-9527-4221-da29-ba5691271d00',
    '509db02e-c7bd-149c-9f10-48c47070e2e3',
    '1c709e2a-884a-ad3f-ead5-643cf46fc2ac'
  ];

  const { data: legacyLinkages } = await supabase
    .from('record_provenance_linkages')
    .select('id, is_canonical')
    .eq('domain_table', 'mandals')
    .in('domain_record_id', LEGACY_PILOT_IDS);

  const { data: canonicalLinkages } = await supabase
    .from('record_provenance_linkages')
    .select('id, is_canonical')
    .eq('domain_table', 'mandals')
    .in('provenance_id', SUPERSESSION_PROV_UUIDS);

  const legacyDemoted = (legacyLinkages || []).filter(l => !l.is_canonical).length;
  const canonicalTrue = (canonicalLinkages || []).filter(l => l.is_canonical).length;

  const { data: supersessionRows } = await supabase
    .from('provenance_records')
    .select('*')
    .in('id', SUPERSESSION_PROV_UUIDS);

  const all12SupersessionOfficial = (supersessionRows || []).every(r => r.status === 'OFFICIAL');
  const all12SupersessionEvidenced = (supersessionRows || []).every(r => r.verification_evidence_id === 'e0160000-0000-0000-0000-000000002026');
  const all12SupersessionVerifiedBy = (supersessionRows || []).every(r => r.verified_by === 'CTO / LGD Statewide Export Verification');

  // Check historical parent
  const { data: parentRow } = await supabase
    .from('provenance_records')
    .select('*')
    .eq('id', EXPECTED_PARENT_UUID)
    .single();

  // Check historical lineage
  const { data: lineageRow } = await supabase
    .from('geography_entity_lineage')
    .select('*')
    .eq('id', EXPECTED_LINEAGE_UUID)
    .single();

  // Check dataset_versions
  const { data: dvData } = await supabase
    .from('dataset_versions')
    .select('*')
    .in('id', ['ts_lgd_mandals_2023_v1', 'ts_lgd_mandals_2026_v1']);

  // Cryptographic checks on migrations
  const sql045 = fs.readFileSync('supabase/migrations/045_w016_c3_mandal_identity_temporal_load.sql');
  const sql046 = fs.readFileSync('supabase/migrations/046_w016_c3_r4_gov02_legacy_identity_supersession.sql');
  const sha045 = crypto.createHash('sha256').update(sql045).digest('hex');
  const sha046 = crypto.createHash('sha256').update(sql046).digest('hex');

  const EXPECTED_SHA045 = '514595697505df005e7745ac4e1ab9cce141cc064803c071c0fca5d66d051073';
  const EXPECTED_SHA046 = '559a6f428a7c704ccf87b011cae70f67543feb8e4e0533e321a7828425fde012';

  console.log(`  public.mandals = ${mandalsCount} (expected 621)`);
  console.log(`  public.mandal_versions = ${totalVersions} (expected 1210)`);
  console.log(`  current versions = ${curVersions} (expected 621)`);
  console.log(`  historical versions = ${histVersions} (expected 589)`);
  console.log(`  null current pointers = ${nullCurrentPointers || 0} (expected 0)`);
  console.log(`  public.entity_geometries = ${geoCount || 0} (expected 0)`);
  console.log(`  legacy linkages is_canonical=false = ${legacyDemoted} (expected 12)`);
  console.log(`  canonical replacement linkages is_canonical=true = ${canonicalTrue} (expected 12)`);
  console.log(`  supersession records count = ${(supersessionRows || []).length} (expected 12)`);
  console.log(`  all 12 supersession status=OFFICIAL = ${all12SupersessionOfficial}`);
  console.log(`  all 12 supersession evidence=2026 = ${all12SupersessionEvidenced}`);
  console.log(`  all 12 supersession verified_by=CTO = ${all12SupersessionVerifiedBy}`);
  console.log(`  historical parent intact = ${parentRow !== null && parentRow.id === EXPECTED_PARENT_UUID}`);
  console.log(`  historical lineage intact = ${lineageRow !== null && lineageRow.id === EXPECTED_LINEAGE_UUID}`);
  console.log(`  dataset_versions count = ${(dvData || []).length} (expected 2)`);
  console.log(`  Migration 045 SHA intact = ${sha045 === EXPECTED_SHA045}`);
  console.log(`  Migration 046 SHA intact = ${sha046 === EXPECTED_SHA046}`);

  const passAll = (
    mandalsCount === 621 &&
    totalVersions === 1210 &&
    curVersions === 621 &&
    histVersions === 589 &&
    (nullCurrentPointers || 0) === 0 &&
    (geoCount || 0) === 0 &&
    legacyDemoted === 12 &&
    canonicalTrue === 12 &&
    (supersessionRows || []).length === 12 &&
    all12SupersessionOfficial &&
    all12SupersessionEvidenced &&
    all12SupersessionVerifiedBy &&
    parentRow !== null &&
    lineageRow !== null &&
    (dvData || []).length === 2 &&
    sha045 === EXPECTED_SHA045 &&
    sha046 === EXPECTED_SHA046
  );

  if (!passAll) {
    console.error('FATAL: One or more integrity assertions failed!');
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('GOV-12 REMEDIATION EXECUTED & VERIFIED WITH 100% CONCORDANCE');
  console.log('================================================================');

  return {
    preRow,
    postRow,
    parentRow,
    lineageRow,
    evData,
    counts: {
      mandals: mandalsCount,
      mandal_versions: totalVersions,
      current_versions: curVersions,
      historical_versions: histVersions,
      entity_geometries: geoCount || 0,
      null_current_version_ids: nullCurrentPointers || 0,
      legacy_demoted_count: legacyDemoted,
      canonical_true_count: canonicalTrue,
      supersession_count: (supersessionRows || []).length
    }
  };
}

executeRemediation().catch(err => {
  console.error('Fatal remediation execution error:', err);
  process.exit(1);
});
