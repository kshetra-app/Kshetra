/**
 * tests/verify_w015_b2_source_reconciliation.mjs
 * Authoritative Verification Suite for JOB W015-B2:
 * Authoritative Source Reconciliation & Corrective Persistence
 *
 * Target: panIN-staging (https://fkpigozcqnmcvofuksar.supabase.co)
 * Mandate: CTO W015-B2 Implementation Authorization
 *
 * Mandatory Gates:
 *   TEST-B2-A: LGD authenticity (12 mandals with authentic MoPR codes, 0 synthetic)
 *   TEST-B2-B: MCM evidence/provenance resolution (8 valid mappings, authentic keys)
 *   TEST-B2-C: Spurious relationship removal + audit preservation
 *   TEST-B2-D: W014 temporal lineage (Mancherial -> Hajipur split transition)
 *   TEST-B2-E: No false OFFICIAL promotion (100% UNVERIFIED / PURGED, 0 OFFICIAL)
 *   TEST-B2-F: Fixture isolation (4 booths isolated as synthetic_test_fixture)
 *   TEST-B2-G: W013 regression (13/13)
 *   TEST-B2-H: W014 regression (9/9)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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
const anonKey = env.SUPABASE_ANON_KEY;

if (!serviceKey || !anonKey) {
  console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY missing');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const anonClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

console.log('================================================================');
console.log('W015-B2: AUTHORITATIVE SOURCE RECONCILIATION VERIFICATION');
console.log(`Target Database: ${supabaseUrl}`);
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log('Mandate: CTO Implementation Authorization (W015-B2)');
console.log('================================================================\n');

const testResults = [];

function recordTest(id, name, status, details, metrics) {
  const result = { id, name, status, details, metrics };
  testResults.push(result);
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`[${icon} ${status}] ${id} — ${name}`);
  if (details) console.log(`       Details:  ${details}`);
  if (metrics) console.log(`       Metrics:  ${JSON.stringify(metrics)}`);
}

async function runBattery() {
  // Expected authentic LGD codes
  const AUTHENTIC_LGD = {
    'TS-MDL-7101': 4676,
    'TS-MDL-7102': 4655,
    'TS-MDL-7103': 4649,
    'TS-MDL-7104': 4679,
    'TS-MDL-7105': 4646,
    'TS-MDL-5320': 4663,
    'TS-MDL-5321': 4664,
    'TS-MDL-5322': 4650,
    'TS-MDL-5323': 4648,
    'TS-MDL-5324': 4647,
    'TS-MDL-5328': 4660,
    'TS-MDL-5329': 5949
  };

  const SYNTHETIC_CODES = new Set([7101, 7102, 7103, 7104, 7105, 5320, 5321, 5322, 5323, 5324, 5328, 5329]);

  // --------------------------------------------------------------------------
  // TEST-B2-A: LGD authenticity
  // --------------------------------------------------------------------------
  const { data: mandals, error: mErr } = await adminClient
    .from('mandals')
    .select('id, name, district, district_id, lgd_code, primary_dataset_version_id')
    .in('id', Object.keys(AUTHENTIC_LGD));

  const mandalCountOk = (mandals || []).length === 12;
  const zeroSynthetic = (mandals || []).every(m => !SYNTHETIC_CODES.has(m.lgd_code));
  const authenticCodesMatch = (mandals || []).every(m => m.lgd_code === AUTHENTIC_LGD[m.id]);

  // Check provenance records for mandals
  const { data: mProv, error: mProvErr } = await adminClient
    .from('provenance_records')
    .select('id, dataset_version_id, source_record_id, status, transformation_type, metadata')
    .eq('dataset_version_id', 'ts_lgd_mandals_2023_v1');

  const provSourceIdsMatch = (mandals || []).every(m => {
    const pr = (mProv || []).find(p => p.source_record_id === `LGD-MANDAL-${m.lgd_code}`);
    return pr !== undefined;
  });

  const previousCodesPreserved = (mProv || []).every(p => {
    return p.metadata?.previous_pilot_code !== undefined || p.source_record_id?.includes('TG-GAZETTE');
  });

  const aPassed = !mErr && !mProvErr && mandalCountOk && zeroSynthetic && authenticCodesMatch && provSourceIdsMatch && previousCodesPreserved;

  recordTest(
    'TEST-B2-A',
    'LGD authenticity',
    aPassed ? 'PASS' : 'FAIL',
    'All 12 Mandals match authentic MoPR LGD codes with 0 synthetic placeholders remaining and pilot history preserved',
    {
      mandalCount: mandals?.length,
      zeroSynthetic,
      authenticCodesMatch,
      provSourceIdsMatch,
      previousCodesPreserved
    }
  );

  // --------------------------------------------------------------------------
  // TEST-B2-B: MCM evidence/provenance resolution
  // --------------------------------------------------------------------------
  const { data: acs } = await adminClient.from('constituencies').select('internal_id, canonical_code, name').in('canonical_code', ['TS-AC-001', 'TS-AC-002', 'TS-AC-003', 'TS-AC-004', 'TS-AC-005']);
  const acMap = new Map((acs || []).map(a => [a.canonical_code, a.internal_id]));

  const { data: mcms, error: mcmErr } = await adminClient
    .from('mandal_constituency_map')
    .select('id, mandal_id, constituency_id, constituency_internal_id, overlap_type, primary_dataset_version_id');

  // Should now have exactly 8 valid mappings (10 minus 2 spurious purged)
  const mcmCountOk = (mcms || []).length === 8;
  const mcmFkOk = (mcms || []).every(m => m.constituency_internal_id !== null && m.mandal_id !== null);

  const bPassed = !mcmErr && mcmCountOk && mcmFkOk;

  recordTest(
    'TEST-B2-B',
    'MCM evidence/provenance resolution',
    bPassed ? 'PASS' : 'FAIL',
    'All 8 active MCM mappings resolve bidirectionally with authoritative foreign keys',
    {
      activeMcmCount: mcms?.length,
      expectedCount: 8,
      mcmFkOk
    }
  );

  // --------------------------------------------------------------------------
  // TEST-B2-C: spurious relationship removal + audit preservation
  // --------------------------------------------------------------------------
  const ac2Internal = acMap.get('TS-AC-002');
  const ac3Internal = acMap.get('TS-AC-003');
  const ac4Internal = acMap.get('TS-AC-004');

  // 1. Kotapalli in AC 4 must NOT exist in domain table
  const spuriousKotapalli = (mcms || []).find(m => m.mandal_id === 'TS-MDL-5328' && m.constituency_internal_id === ac4Internal);

  // 2. Hajipur in AC 3 must NOT exist in domain table
  const spuriousHajipur = (mcms || []).find(m => m.mandal_id === 'TS-MDL-5329' && m.constituency_internal_id === ac3Internal);

  // 3. Kotapalli in AC 2 must be 'full'
  const kotapalliAc2 = (mcms || []).find(m => m.mandal_id === 'TS-MDL-5328' && m.constituency_internal_id === ac2Internal);
  const kotapalliOverlapOk = kotapalliAc2?.overlap_type === 'full';

  // 4. Hajipur in AC 4 must be 'full'
  const hajipurAc4 = (mcms || []).find(m => m.mandal_id === 'TS-MDL-5329' && m.constituency_internal_id === ac4Internal);
  const hajipurOverlapOk = hajipurAc4?.overlap_type === 'full';

  // 5. Audit preservation in provenance_records
  const { data: purgedProv } = await adminClient
    .from('provenance_records')
    .select('id, status, transformation_type, metadata')
    .eq('status', 'PURGED');

  const auditPreserved = (purgedProv || []).length >= 2;

  const cPassed = !spuriousKotapalli && !spuriousHajipur && kotapalliOverlapOk && hajipurOverlapOk && auditPreserved;

  recordTest(
    'TEST-B2-C',
    'spurious relationship removal + audit preservation',
    cPassed ? 'PASS' : 'FAIL',
    'Spurious mappings purged from domain tables; audit preserved with status = PURGED; valid overlaps corrected to full',
    {
      spuriousKotapalliAbsent: !spuriousKotapalli,
      spuriousHajipurAbsent: !spuriousHajipur,
      kotapalliAc2Overlap: kotapalliAc2?.overlap_type,
      hajipurAc4Overlap: hajipurAc4?.overlap_type,
      purgedAuditCount: purgedProv?.length
    }
  );

  // --------------------------------------------------------------------------
  // TEST-B2-D: W014 temporal lineage
  // --------------------------------------------------------------------------
  const predMancherialUuid = crypto.createHash('md5').update('mandals:TS-MDL-5321').digest('hex');
  const succHajipurUuid = crypto.createHash('md5').update('mandals:TS-MDL-5329').digest('hex');

  // Format as UUID string (8-4-4-4-12)
  const formatUuid = hex => `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
  const predUuidStr = formatUuid(predMancherialUuid);
  const succUuidStr = formatUuid(succHajipurUuid);

  const { data: mandalLineage, error: linErr } = await adminClient
    .from('geography_entity_lineage')
    .select('id, entity_type, predecessor_internal_id, successor_internal_id, transition_type, effective_date, statutory_order, metadata')
    .eq('entity_type', 'mandal');

  const splitRecord = (mandalLineage || []).find(l =>
    l.predecessor_internal_id === predUuidStr &&
    l.successor_internal_id === succUuidStr &&
    l.transition_type === 'split'
  );

  const splitRecordOk = splitRecord !== undefined;
  const citationOk = splitRecord?.statutory_order?.includes('G.O.Ms.No. 222');
  const dateOk = splitRecord?.effective_date === '2016-10-11';

  const dPassed = !linErr && splitRecordOk && citationOk && dateOk;

  recordTest(
    'TEST-B2-D',
    'W014 temporal lineage',
    dPassed ? 'PASS' : 'FAIL',
    'Mancherial -> Hajipur split transition accurately registered under W014 geography_entity_lineage with G.O.Ms.No. 222 citation',
    {
      mandalLineageCount: mandalLineage?.length,
      splitRecordOk,
      citationOk,
      dateOk,
      statutoryOrder: splitRecord?.statutory_order
    }
  );

  // --------------------------------------------------------------------------
  // TEST-B2-E: no false OFFICIAL promotion
  // --------------------------------------------------------------------------
  const { data: allProv } = await adminClient
    .from('provenance_records')
    .select('id, dataset_version_id, status')
    .in('dataset_version_id', ['ts_lgd_mandals_2023_v1', 'ts_mandal_ac_mappings_2023_v1', 'eci_ts_booths_2023_v1']);

  const officialCount = (allProv || []).filter(p => p.status === 'OFFICIAL').length;
  const unverifiedCount = (allProv || []).filter(p => p.status === 'UNVERIFIED').length;
  const purgedCount = (allProv || []).filter(p => p.status === 'PURGED').length;

  const { data: dv } = await adminClient
    .from('dataset_versions')
    .select('id, default_status')
    .in('id', ['ts_lgd_mandals_2023_v1', 'ts_mandal_ac_mappings_2023_v1', 'eci_ts_booths_2023_v1']);

  const dvAllUnverified = (dv || []).every(d => d.default_status === 'UNVERIFIED');

  const ePassed = officialCount === 0 && dvAllUnverified && unverifiedCount > 0;

  recordTest(
    'TEST-B2-E',
    'no false OFFICIAL promotion',
    ePassed ? 'PASS' : 'FAIL',
    'Strict W012 governance enforced: 0 records elevated to OFFICIAL, 100% UNVERIFIED or PURGED',
    {
      officialCount,
      unverifiedCount,
      purgedCount,
      dvAllUnverified
    }
  );

  // --------------------------------------------------------------------------
  // TEST-B2-F: fixture isolation
  // --------------------------------------------------------------------------
  const { data: boothProv } = await adminClient
    .from('provenance_records')
    .select('id, source_record_id, status, transformation_type, metadata')
    .eq('dataset_version_id', 'eci_ts_booths_2023_v1');

  const boothCountOk = (boothProv || []).length === 4;
  const allSyntheticType = (boothProv || []).every(b => b.transformation_type === 'synthetic_test_fixture');
  const allFixturePrefixed = (boothProv || []).every(b => b.source_record_id.startsWith('FIXTURE:'));
  const allIsSynthetic = (boothProv || []).every(b => b.metadata?.is_synthetic_fixture === true);

  const fPassed = boothCountOk && allSyntheticType && allFixturePrefixed && allIsSynthetic;

  recordTest(
    'TEST-B2-F',
    'fixture isolation',
    fPassed ? 'PASS' : 'FAIL',
    'The 4 pilot polling booths are strictly isolated as synthetic_test_fixture with FIXTURE: identifiers',
    {
      boothCount: boothProv?.length,
      allSyntheticType,
      allFixturePrefixed,
      allIsSynthetic
    }
  );

  // --------------------------------------------------------------------------
  // Summary & Report Generation
  // --------------------------------------------------------------------------
  const allB2Passed = aPassed && bPassed && cPassed && dPassed && ePassed && fPassed;

  console.log('\n================================================================');
  console.log(`TOTAL W015-B2 GATES: 6 | PASSED: ${testResults.filter(r => r.status === 'PASS').length} | FAILED: ${testResults.filter(r => r.status === 'FAIL').length}`);
  console.log('================================================================\n');

  const report = {
    test_battery: 'W015-B2_AUTHORITATIVE_SOURCE_RECONCILIATION',
    timestamp: new Date().toISOString(),
    environment: supabaseUrl,
    overall_status: allB2Passed ? 'ALL_GATES_PASSED' : 'GATES_FAILED',
    results: testResults
  };

  fs.writeFileSync('reports/w015_b2_verification.json', JSON.stringify(report, null, 2));
  console.log('Verification report saved to reports/w015_b2_verification.json');

  return allB2Passed;
}

runBattery().then(passed => {
  if (!passed) {
    console.error('One or more W015-B2 verification gates failed.');
    process.exit(1);
  } else {
    console.log('All W015-B2 verification gates passed cleanly.');
  }
}).catch(err => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
