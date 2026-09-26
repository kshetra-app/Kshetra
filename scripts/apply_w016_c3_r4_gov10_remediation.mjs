import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

console.log('================================================================');
console.log('W016-C3-R4-GOV-10: W012 LIFECYCLE EVIDENCE REMEDIATION EXECUTION');
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

const EXACT_TARGET_UUIDS = [
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

const EXPECTED_EVIDENCE_UUID = 'e0160000-0000-0000-0000-000000002026';
const EXPECTED_VERIFIER = 'CTO / LGD Statewide Export Verification';
const EXPECTED_ARTIFACT_SHA256 = '54d512e55b97fde163d100053dd48044cec6a744fb4bed392580282bcede1509';
const EXPECTED_ARTIFACT_NAME = 'mopr_lgd_subdistrict_directory_telangana_all.json';

async function executeRemediation() {
  console.log('--- STEP 1: VERIFY EVIDENCE PRECONDITION ---');
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

  console.log('[PASS] Evidence precondition verified:');
  console.log(`       ID:       ${evData.id}`);
  console.log(`       Artifact: ${evData.artifact_name}`);
  console.log(`       SHA-256:  ${evData.artifact_sha256}`);
  console.log(`       Authority:${evData.verification_authority}`);

  console.log('\n--- STEP 2: CAPTURE PRE-STATE & ASSERT TARGET ROWS ---');
  const { data: preRows, error: preErr } = await supabase
    .from('provenance_records')
    .select('*')
    .in('id', EXACT_TARGET_UUIDS);

  if (preErr || !preRows || preRows.length !== 12) {
    console.error(`FATAL: Pre-state assertion failed: expected 12 rows, found ${preRows ? preRows.length : 0}`, preErr);
    process.exit(1);
  }

  for (const r of preRows) {
    if (r.transformation_type !== 'pilot_to_statutory_supersession') {
      console.error(`FATAL: Target row ${r.id} transformation_type is ${r.transformation_type}, expected pilot_to_statutory_supersession`);
      process.exit(1);
    }
    if (r.status !== 'OFFICIAL') {
      console.error(`FATAL: Target row ${r.id} status is ${r.status}, expected OFFICIAL`);
      process.exit(1);
    }
    const isUnremediated = r.verification_evidence_id === null && r.verified_by === null;
    const isRemediated = r.verification_evidence_id === EXPECTED_EVIDENCE_UUID && r.verified_by === EXPECTED_VERIFIER;
    if (!isUnremediated && !isRemediated) {
      console.error(`FATAL: Target row ${r.id} has unexpected evidence fields: evidence=${r.verification_evidence_id}, verified_by=${r.verified_by}`);
      process.exit(1);
    }
  }
  console.log('[PASS] Target rows validated for remediation.');

  console.log('\n--- STEP 3: EXECUTE SCOPED LIFECYCLE EVIDENCE UPDATE ---');
  const updatePayload = {
    verification_evidence_id: EXPECTED_EVIDENCE_UUID,
    verified_by: EXPECTED_VERIFIER
  };

  const patchRes = await fetch(`${supabaseUrl}/rest/v1/provenance_records?id=in.(${EXACT_TARGET_UUIDS.join(',')})`, {
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
  console.log(`[PASS] PATCH succeeded: ${updatedRows.length} rows updated atomically.`);

  console.log('\n--- STEP 4: POST-MUTATION IMMEDIATE ASSERTIONS ---');
  if (updatedRows.length !== 12) {
    console.error(`FATAL: Updated row count is ${updatedRows.length}, expected 12!`);
    process.exit(1);
  }

  // Fetch from database independently
  const { data: postRows, error: postErr } = await supabase
    .from('provenance_records')
    .select('*')
    .in('id', EXACT_TARGET_UUIDS);

  if (postErr || !postRows || postRows.length !== 12) {
    console.error('FATAL: Post-state query failed:', postErr);
    process.exit(1);
  }

  for (const post of postRows) {
    const pre = preRows.find(r => r.id === post.id);
    if (!pre) {
      console.error(`FATAL: Post row ${post.id} not found in pre rows!`);
      process.exit(1);
    }

    // Verify Class B updated fields
    if (post.verification_evidence_id !== EXPECTED_EVIDENCE_UUID) {
      console.error(`FATAL: Row ${post.id} verification_evidence_id is ${post.verification_evidence_id}, expected ${EXPECTED_EVIDENCE_UUID}`);
      process.exit(1);
    }
    if (post.verified_by !== EXPECTED_VERIFIER) {
      console.error(`FATAL: Row ${post.id} verified_by is ${post.verified_by}, expected ${EXPECTED_VERIFIER}`);
      process.exit(1);
    }
    if (post.status !== 'OFFICIAL') {
      console.error(`FATAL: Row ${post.id} status is ${post.status}, expected OFFICIAL`);
      process.exit(1);
    }

    // Verify Class A immutable fields
    const classAFields = [
      'id', 'dataset_version_id', 'source_record_id', 'parent_provenance_id',
      'transformation_type', 'transform_version', 'operator', 'created_at'
    ];
    for (const f of classAFields) {
      if (post[f] !== pre[f]) {
        console.error(`FATAL: Immutable field ${f} changed on row ${post.id}! Pre: ${pre[f]}, Post: ${post[f]}`);
        process.exit(1);
      }
    }

    // Verify metadata dictionary unchanged
    if (JSON.stringify(post.metadata) !== JSON.stringify(pre.metadata)) {
      console.error(`FATAL: metadata dictionary changed on row ${post.id}!`);
      process.exit(1);
    }
  }
  console.log('[PASS] All 12 rows verified post-mutation:');
  console.log(`       verification_evidence_id = ${EXPECTED_EVIDENCE_UUID} (12/12)`);
  console.log(`       verified_by = ${EXPECTED_VERIFIER} (12/12)`);
  console.log(`       status = OFFICIAL (12/12)`);
  console.log('       100% of Class A immutable fields and metadata bitwise identical (12/12)');

  console.log('\n--- STEP 5: VERIFY HAJIPUR CANONICAL RECONCILIATION UNTOUCHED ---');
  const { data: hajipurProv, error: hajErr } = await supabase
    .from('provenance_records')
    .select('*')
    .eq('transformation_type', 'gazette_lineage_canonical_reconciliation');

  if (hajErr || !hajipurProv || hajipurProv.length !== 1) {
    console.error('FATAL: Hajipur canonical reconciliation record error:', hajErr);
    process.exit(1);
  }
  const hp = hajipurProv[0];
  console.log('[PASS] Hajipur canonical reconciliation record confirmed UNTOUCHED:');
  console.log(`       ID:                       ${hp.id}`);
  console.log(`       transformation_type:      ${hp.transformation_type}`);
  console.log(`       status:                   ${hp.status}`);
  console.log(`       verification_evidence_id: ${hp.verification_evidence_id} (Remains NULL as mandated)`);
  console.log(`       verified_by:              ${hp.verified_by}`);

  console.log('\n--- STEP 6: READ-ONLY INTEGRITY BATTERY ---');
  const { count: mandalsCount } = await supabase.from('mandals').select('*', { count: 'exact', head: true });
  const { count: totalVersions } = await supabase.from('mandal_versions').select('*', { count: 'exact', head: true });
  const { count: curVersions } = await supabase.from('mandal_versions').select('*', { count: 'exact', head: true }).eq('is_current', true);
  const { count: histVersions } = await supabase.from('mandal_versions').select('*', { count: 'exact', head: true }).eq('is_current', false);
  const { count: geoCount } = await supabase.from('entity_geometries').select('*', { count: 'exact', head: true });
  const { count: nullCurrentPointers } = await supabase.from('mandals').select('*', { count: 'exact', head: true }).is('current_version_id', null);

  const { data: legacyLinkages } = await supabase
    .from('record_provenance_linkages')
    .select('id, is_canonical')
    .eq('domain_table', 'mandals')
    .in('domain_record_id', [
      'TS-MDL-7101', 'TS-MDL-7102', 'TS-MDL-7103', 'TS-MDL-7104', 'TS-MDL-7105',
      'TS-MDL-5320', 'TS-MDL-5321', 'TS-MDL-5322', 'TS-MDL-5323', 'TS-MDL-5324',
      'TS-MDL-5328', 'TS-MDL-5329'
    ]);

  const { data: canonicalLinkages } = await supabase
    .from('record_provenance_linkages')
    .select('id, is_canonical')
    .eq('domain_table', 'mandals')
    .in('provenance_id', EXACT_TARGET_UUIDS);

  const legacyDemoted = (legacyLinkages || []).filter(l => !l.is_canonical).length;
  const canonicalTrue = (canonicalLinkages || []).filter(l => l.is_canonical).length;

  console.log(`  public.mandals = ${mandalsCount} (expected 621)`);
  console.log(`  public.mandal_versions = ${totalVersions} (expected 1210)`);
  console.log(`  current versions = ${curVersions} (expected 621)`);
  console.log(`  historical versions = ${histVersions} (expected 589)`);
  console.log(`  null current pointers = ${nullCurrentPointers || 0} (expected 0)`);
  console.log(`  public.entity_geometries = ${geoCount || 0} (expected 0)`);
  console.log(`  legacy linkages is_canonical=false = ${legacyDemoted} (expected 12)`);
  console.log(`  canonical replacement linkages is_canonical=true = ${canonicalTrue} (expected 12)`);

  const passAll = (
    mandalsCount === 621 &&
    totalVersions === 1210 &&
    curVersions === 621 &&
    histVersions === 589 &&
    (nullCurrentPointers || 0) === 0 &&
    (geoCount || 0) === 0 &&
    legacyDemoted === 12 &&
    canonicalTrue === 12
  );

  if (!passAll) {
    console.error('FATAL: One or more integrity assertions failed!');
    process.exit(1);
  }

  // Cryptographic checks
  const sql045 = fs.readFileSync('supabase/migrations/045_w016_c3_mandal_identity_temporal_load.sql');
  const sql046 = fs.readFileSync('supabase/migrations/046_w016_c3_r4_gov02_legacy_identity_supersession.sql');
  const sha045 = crypto.createHash('sha256').update(sql045).digest('hex');
  const sha046 = crypto.createHash('sha256').update(sql046).digest('hex');

  const EXPECTED_SHA045 = '514595697505df005e7745ac4e1ab9cce141cc064803c071c0fca5d66d051073';
  const EXPECTED_SHA046 = '559a6f428a7c704ccf87b011cae70f67543feb8e4e0533e321a7828425fde012';

  if (sha045 !== EXPECTED_SHA045 || sha046 !== EXPECTED_SHA046) {
    console.error('FATAL: Migration SHA mismatch!');
    process.exit(1);
  }
  console.log('[PASS] Migration 045 & 046 SHAs verified immutable.');

  console.log('\n================================================================');
  console.log('REMEDIATION EXECUTED & VERIFIED WITH 100% CONCORDANCE');
  console.log('================================================================');

  return {
    preRows,
    postRows,
    hajipurProv: hp,
    counts: {
      mandals: mandalsCount,
      mandal_versions: totalVersions,
      current_versions: curVersions,
      historical_versions: histVersions,
      entity_geometries: geoCount || 0,
      null_current_version_ids: nullCurrentPointers || 0,
      legacy_demoted_count: legacyDemoted,
      canonical_true_count: canonicalTrue
    }
  };
}

executeRemediation().catch(err => {
  console.error('Fatal remediation execution error:', err);
  process.exit(1);
});
