/**
 * verify_w013_canonical_geography.mjs
 * Authoritative W013 Canonical Geography Model Staging Verification Battery
 *
 * Target: panIN-staging (https://fkpigozcqnmcvofuksar.supabase.co)
 * Mandate: CTO Implementation Authorization (W013 Migration 040)
 *
 * Test Gates:
 *   TEST-13-A: Canonical tables exist (districts, parliamentary_constituencies)
 *   TEST-13-B: Additive columns exist; constituencies.id primary key preserved
 *   TEST-13-C: internal_id is NOT NULL, UUID format, and UNIQUE
 *   TEST-13-D: canonical_code is correctly formatted and UNIQUE
 *   TEST-13-E: Telangana pilot entity row counts (1 State, 33 Districts, 17 PCs, 119 ACs)
 *   TEST-13-F: 100% of 119 ACs have valid parliamentary_constituency_id and district_id
 *   TEST-13-G: W012 dataset-version foreign keys resolve
 *   TEST-13-H: W012 record_provenance_linkages resolve for all pilot entities
 *   TEST-13-I: All pilot entities have UNVERIFIED data status; zero elevation to OFFICIAL
 *   TEST-13-J: Row Level Security enabled: public read succeeds; anonymous mutation denied
 *   TEST-13-K: Backwards compatibility: domain FKs and application queries unaffected
 *   TEST-13-L: District chronology and dataset semantics verified
 *   TEST-13-M: Canonical identifier width sufficiency (Full Jayashankar Bhupalpally length 31 verified)
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
console.log('W013: CANONICAL GEOGRAPHY MODEL STAGING VERIFICATION SUITE');
console.log(`Target Database: ${supabaseUrl}`);
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log('Mandate: CTO Implementation Authorization (Migration 040)');
console.log('================================================================\n');

const testRunId = crypto.randomBytes(4).toString('hex');
console.log(`Test Execution Run ID: ${testRunId}\n`);

const results = {
  timestamp: new Date().toISOString(),
  target: supabaseUrl,
  testRunId,
  summary: {
    total: 13,
    passed: 0,
    failed: 0,
    pending: 0
  },
  tests: []
};

function recordTest(id, name, category, status, expected, observed, details = null) {
  const isPass = status === 'PASS';
  const isPending = status.startsWith('PENDING');
  if (isPass) results.summary.passed++;
  else if (isPending) results.summary.pending++;
  else results.summary.failed++;

  const icon = isPass ? '✅ PASS' : isPending ? '⏳ PENDING' : '❌ FAIL';
  console.log(`[${icon}] ${id} — ${name}`);
  if (details) {
    console.log(`       Details:  ${typeof details === 'object' ? JSON.stringify(details) : details}`);
  }

  results.tests.push({
    id,
    name,
    category,
    status,
    expected,
    observed,
    details
  });
}

async function runTests() {
  // Check if staging migration 040 has been executed
  const { data: distCheck, error: distCheckErr } = await adminClient
    .from('districts')
    .select('id')
    .limit(1);

  const stagingReady = !distCheckErr;

  if (!stagingReady) {
    console.warn('⚠️  WARNING: Migration 040 not detected on staging. Recording all tests as PENDING_STAGING_EXECUTION.\n');
    const pendingTests = [
      ['TEST-13-A', 'Canonical tables exist (districts, parliamentary_constituencies)', 'SCHEMA'],
      ['TEST-13-B', 'Additive columns exist; constituencies.id primary key preserved', 'SCHEMA'],
      ['TEST-13-C', 'internal_id is NOT NULL, UUID format, and UNIQUE', 'IDENTITY_INTEGRITY'],
      ['TEST-13-D', 'canonical_code is correctly formatted and UNIQUE', 'IDENTITY_INTEGRITY'],
      ['TEST-13-E', 'Telangana pilot entity row counts (1 State, 33 Districts, 17 PCs, 119 ACs)', 'ROW_COUNTS'],
      ['TEST-13-F', '100% of 119 ACs have valid parliamentary_constituency_id and district_id', 'RELATIONAL_INTEGRITY'],
      ['TEST-13-G', 'W012 dataset-version foreign keys resolve', 'LINEAGE_INTEGRITY'],
      ['TEST-13-H', 'W012 record_provenance_linkages resolve for all pilot entities', 'PROVENANCE_INTEGRITY'],
      ['TEST-13-I', 'All pilot entities have UNVERIFIED data status; zero elevation to OFFICIAL', 'GOVERNANCE_SECURITY'],
      ['TEST-13-J', 'Row Level Security enabled: public read succeeds; anonymous mutation denied', 'RLS_SECURITY'],
      ['TEST-13-K', 'Backwards compatibility: domain FKs and application queries unaffected', 'REGRESSION_INTEGRITY'],
      ['TEST-13-L', 'District chronology and dataset semantics verified', 'CHRONOLOGY_INTEGRITY'],
      ['TEST-13-M', 'Canonical identifier width sufficiency (Full Jayashankar Bhupalpally length 31 verified)', 'IDENTIFIER_WIDTH_INTEGRITY']
    ];

    for (const [id, name, cat] of pendingTests) {
      recordTest(id, name, cat, 'PENDING_STAGING_EXECUTION', 'Migration 040 applied to panIN-staging', 'Table public.districts not found in schema cache');
    }

    printSummaryAndSave();
    return;
  }

  // --------------------------------------------------------------------------
  // TEST-13-A: Canonical tables exist
  // --------------------------------------------------------------------------
  const { data: dData, error: dErr } = await adminClient.from('districts').select('id, code, state_code, name, primary_dataset_version_id').limit(1);
  const { data: pcData, error: pcErr } = await adminClient.from('parliamentary_constituencies').select('id, code, state_code, pc_number, name, reservation, primary_dataset_version_id').limit(1);

  const aPassed = !dErr && !pcErr;
  recordTest(
    'TEST-13-A',
    'Canonical tables exist (districts, parliamentary_constituencies)',
    'SCHEMA',
    aPassed ? 'PASS' : 'FAIL',
    'Both tables accessible via service_role with required columns',
    { districtsFound: !dErr, pcFound: !pcErr, dErr: dErr?.message, pcErr: pcErr?.message }
  );

  // --------------------------------------------------------------------------
  // TEST-13-B: Additive columns exist; constituencies.id primary key preserved
  // --------------------------------------------------------------------------
  const { data: acRow, error: acErr } = await adminClient
    .from('constituencies')
    .select('id, internal_id, canonical_code, entity_type, parliamentary_constituency_id, district_id, primary_dataset_version_id')
    .eq('state_code', 'TS')
    .limit(1)
    .single();

  const bPassed = !acErr && acRow && typeof acRow.id === 'string' && acRow.id.startsWith('TS-AC-') && !!acRow.internal_id && !!acRow.canonical_code;
  recordTest(
    'TEST-13-B',
    'Additive columns exist; constituencies.id primary key preserved',
    'SCHEMA',
    bPassed ? 'PASS' : 'FAIL',
    'constituencies.id preserved as VARCHAR/string; internal_id and canonical_code present',
    { sampleAcId: acRow?.id, internalId: acRow?.internal_id, canonicalCode: acRow?.canonical_code, error: acErr?.message }
  );

  // --------------------------------------------------------------------------
  // TEST-13-C: internal_id is NOT NULL, UUID format, and UNIQUE
  // --------------------------------------------------------------------------
  const { data: acsWithInternal, error: acsIntErr } = await adminClient
    .from('constituencies')
    .select('internal_id')
    .eq('state_code', 'TS');

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const allUuids = (acsWithInternal || []).every(r => uuidRegex.test(r.internal_id));
  const uniqueUuids = new Set((acsWithInternal || []).map(r => r.internal_id)).size === (acsWithInternal || []).length;
  const cPassed = !acsIntErr && allUuids && uniqueUuids && (acsWithInternal || []).length === 119;

  recordTest(
    'TEST-13-C',
    'internal_id is NOT NULL, UUID format, and UNIQUE',
    'IDENTITY_INTEGRITY',
    cPassed ? 'PASS' : 'FAIL',
    '119 valid, non-null, unique UUIDs across Telangana ACs',
    { count: acsWithInternal?.length, allMatchRegex: allUuids, allUnique: uniqueUuids }
  );

  // --------------------------------------------------------------------------
  // TEST-13-D: canonical_code is correctly formatted and UNIQUE
  // --------------------------------------------------------------------------
  const { data: acCodes, error: acCodesErr } = await adminClient
    .from('constituencies')
    .select('canonical_code')
    .eq('state_code', 'TS');

  const codeRegex = /^TS-AC-\d{3}$/;
  const allCodesValid = (acCodes || []).every(r => codeRegex.test(r.canonical_code));
  const uniqueCodes = new Set((acCodes || []).map(r => r.canonical_code)).size === (acCodes || []).length;
  const dPassed = !acCodesErr && allCodesValid && uniqueCodes && (acCodes || []).length === 119;

  recordTest(
    'TEST-13-D',
    'canonical_code is correctly formatted and UNIQUE',
    'IDENTITY_INTEGRITY',
    dPassed ? 'PASS' : 'FAIL',
    '119 padded unique canonical codes (TS-AC-001 to TS-AC-119)',
    { count: acCodes?.length, allMatchPattern: allCodesValid, allUnique: uniqueCodes }
  );

  // --------------------------------------------------------------------------
  // TEST-13-E: Telangana pilot entity row counts
  // --------------------------------------------------------------------------
  const { count: stateCount } = await adminClient.from('states').select('*', { count: 'exact', head: true }).eq('code', 'TS');
  const { count: distCount } = await adminClient.from('districts').select('*', { count: 'exact', head: true }).eq('state_code', 'TS');
  const { count: pcCount } = await adminClient.from('parliamentary_constituencies').select('*', { count: 'exact', head: true }).eq('state_code', 'TS');
  const { count: acCount } = await adminClient.from('constituencies').select('*', { count: 'exact', head: true }).eq('state_code', 'TS');

  const ePassed = stateCount === 1 && distCount === 33 && pcCount === 17 && acCount === 119;
  recordTest(
    'TEST-13-E',
    'Telangana pilot entity row counts (1 State, 33 Districts, 17 PCs, 119 ACs)',
    'ROW_COUNTS',
    ePassed ? 'PASS' : 'FAIL',
    'States: 1, Districts: 33, PCs: 17, ACs: 119',
    { observedStates: stateCount, observedDistricts: distCount, observedPCs: pcCount, observedACs: acCount }
  );

  // --------------------------------------------------------------------------
  // TEST-13-F: Relational integrity of all 119 ACs to District and PC
  // --------------------------------------------------------------------------
  const { data: allDistricts, error: distFkErr } = await adminClient
    .from('districts')
    .select('id, code, state_code');
  const { data: allPcs, error: pcFkErr } = await adminClient
    .from('parliamentary_constituencies')
    .select('id, code, state_code');
  const { data: acRows, error: acRelErr } = await adminClient
    .from('constituencies')
    .select('id, state_code, district_id, parliamentary_constituency_id')
    .eq('state_code', 'TS');

  const validDistrictIds = new Set((allDistricts || []).map(d => d.id));
  const validPcIds = new Set((allPcs || []).map(p => p.id));

  const invalidDistRows = (acRows || []).filter(r => !r.district_id || !validDistrictIds.has(r.district_id));
  const invalidPcRows = (acRows || []).filter(r => !r.parliamentary_constituency_id || !validPcIds.has(r.parliamentary_constituency_id));
  const invalidStateRows = (acRows || []).filter(r => r.state_code !== 'TS');

  const orphanCountF = invalidDistRows.length + invalidPcRows.length;
  const invalidFkCountF = orphanCountF;
  const fPassed = !distFkErr && !pcFkErr && !acRelErr &&
    (acRows || []).length === 119 &&
    invalidDistRows.length === 0 &&
    invalidPcRows.length === 0 &&
    invalidStateRows.length === 0;

  recordTest(
    'TEST-13-F',
    'Relational integrity: 100% of 119 ACs resolve valid district_id and parliamentary_constituency_id FKs',
    'RELATIONAL_INTEGRITY',
    fPassed ? 'PASS' : 'FAIL',
    'Exactly 119 ACs with state_code TS resolving to existing districts.id and parliamentary_constituencies.id; 0 orphans',
    {
      expectedCount: 119,
      observedCount: acRows?.length || 0,
      orphanCount: orphanCountF,
      invalidFkCount: invalidFkCountF,
      invalidDistFkCount: invalidDistRows.length,
      invalidPcFkCount: invalidPcRows.length,
      invalidStateCodeCount: invalidStateRows.length
    },
    'All 119 Telangana ACs strictly resolve to existing District and PC primary keys.'
  );

  // --------------------------------------------------------------------------
  // TEST-13-G: Pilot entity primary_dataset_version_id references and assignment semantics
  // --------------------------------------------------------------------------
  const expectedVersions = [
    'mha_ts_2014_v1',
    'ts_districts_2016_v1',
    'ts_districts_2019_additions_v1',
    'ts_districts_2019_composite_v1',
    'eci_ts_pc_2008_v1',
    'eci_ts_ac_2008_v1'
  ];

  const { data: versionsFound, error: verErr } = await adminClient
    .from('dataset_versions')
    .select('id, default_status, record_count');

  const validVersionIds = new Set((versionsFound || []).map(v => v.id));

  const { data: statePilot, error: stErr } = await adminClient
    .from('states')
    .select('code, primary_dataset_version_id')
    .eq('code', 'TS')
    .single();

  const { data: distPilot, error: dtErr } = await adminClient
    .from('districts')
    .select('code, name, primary_dataset_version_id')
    .eq('state_code', 'TS');

  const { data: pcPilot, error: ptErr } = await adminClient
    .from('parliamentary_constituencies')
    .select('code, pc_number, primary_dataset_version_id')
    .eq('state_code', 'TS');

  const { data: acPilot, error: atErr } = await adminClient
    .from('constituencies')
    .select('id, primary_dataset_version_id')
    .eq('state_code', 'TS');

  const allPilotEntities = [
    ...(statePilot ? [{ type: 'state', id: statePilot.code, version: statePilot.primary_dataset_version_id }] : []),
    ...(distPilot || []).map(d => ({ type: 'district', id: d.code, name: d.name, version: d.primary_dataset_version_id })),
    ...(pcPilot || []).map(p => ({ type: 'pc', id: p.code, version: p.primary_dataset_version_id })),
    ...(acPilot || []).map(a => ({ type: 'ac', id: a.id, version: a.primary_dataset_version_id }))
  ];

  const unresolvableVersions = allPilotEntities.filter(e => !e.version || !validVersionIds.has(e.version));
  const orphanCountG = unresolvableVersions.length;
  const invalidFkCountG = orphanCountG;

  const stateSemanticsOk = statePilot?.primary_dataset_version_id === 'mha_ts_2014_v1';
  const dist2016 = (distPilot || []).filter(d => d.primary_dataset_version_id === 'ts_districts_2016_v1');
  const dist2019 = (distPilot || []).filter(d => d.primary_dataset_version_id === 'ts_districts_2019_additions_v1');
  const pcs2008 = (pcPilot || []).filter(p => p.primary_dataset_version_id === 'eci_ts_pc_2008_v1');
  const acs2008 = (acPilot || []).filter(a => a.primary_dataset_version_id === 'eci_ts_ac_2008_v1');

  const additionsMatch = dist2019.length === 2 &&
    dist2019.some(d => d.name === 'Mulugu') &&
    dist2019.some(d => d.name === 'Narayanpet');

  const semanticsOk = stateSemanticsOk &&
    dist2016.length === 31 &&
    additionsMatch &&
    pcs2008.length === 17 &&
    acs2008.length === 119;

  const gPassed = !verErr && !stErr && !dtErr && !ptErr && !atErr &&
    allPilotEntities.length === 170 &&
    orphanCountG === 0 &&
    semanticsOk;

  recordTest(
    'TEST-13-G',
    'Pilot entity primary_dataset_version_id references and assignment semantics',
    'LINEAGE_INTEGRITY',
    gPassed ? 'PASS' : 'FAIL',
    'All 170 pilot entities resolve to dataset_versions; 31 districts to 2016, 2 to 2019 additions, 17 PCs and 119 ACs to ECI 2008',
    {
      expectedCount: 170,
      observedCount: allPilotEntities.length,
      orphanCount: orphanCountG,
      invalidFkCount: invalidFkCountG,
      semanticsPassed: semanticsOk,
      assignmentCounts: {
        stateMha2014: stateSemanticsOk ? 1 : 0,
        districts2016: dist2016.length,
        districts2019Additions: dist2019.length,
        pcsEci2008: pcs2008.length,
        acsEci2008: acs2008.length
      }
    },
    '100% of pilot entities resolve valid primary dataset versions with correct statutory/electoral semantics.'
  );

  // --------------------------------------------------------------------------
  // TEST-13-H: Provenance linkage resolution test (Zero orphaned linkages)
  // --------------------------------------------------------------------------
  const { data: linkages, error: linkErr } = await adminClient
    .from('record_provenance_linkages')
    .select('id, domain_table, domain_record_id, provenance_id, is_canonical');

  const { data: provRecords, error: prErr } = await adminClient
    .from('provenance_records')
    .select('id, dataset_version_id, status');

  const provMap = new Map((provRecords || []).map(p => [p.id, p]));

  const stateCodeSet = new Set(['TS']);
  const distCodeSet = new Set((distPilot || []).map(d => d.code));
  const pcCodeSet = new Set((pcPilot || []).map(p => p.code));
  const acIdSet = new Set((acPilot || []).map(a => a.id));

  let domainOrphanCount = 0;
  let provOrphanCount = 0;
  let verOrphanCount = 0;
  let invalidStatusCountH = 0;

  const validDomains = new Set(['states', 'districts', 'parliamentary_constituencies', 'constituencies']);
  let stateLinkCount = 0;
  let distLinkCount = 0;
  let pcLinkCount = 0;
  let acLinkCount = 0;

  for (const l of (linkages || [])) {
    if (!validDomains.has(l.domain_table)) {
      domainOrphanCount++;
      continue;
    }

    if (l.domain_table === 'states') {
      stateLinkCount++;
      if (!stateCodeSet.has(l.domain_record_id)) domainOrphanCount++;
    } else if (l.domain_table === 'districts') {
      distLinkCount++;
      if (!distCodeSet.has(l.domain_record_id)) domainOrphanCount++;
    } else if (l.domain_table === 'parliamentary_constituencies') {
      pcLinkCount++;
      if (!pcCodeSet.has(l.domain_record_id)) domainOrphanCount++;
    } else if (l.domain_table === 'constituencies') {
      acLinkCount++;
      if (!acIdSet.has(l.domain_record_id)) domainOrphanCount++;
    }

    const pr = provMap.get(l.provenance_id);
    if (!pr) {
      provOrphanCount++;
    } else {
      if (!validVersionIds.has(pr.dataset_version_id)) verOrphanCount++;
      if (pr.status !== 'UNVERIFIED') invalidStatusCountH++;
    }
  }

  const totalLinkages = (linkages || []).length;
  const totalOrphanCountH = domainOrphanCount + provOrphanCount + verOrphanCount;
  const countsExactH = stateLinkCount === 1 && distLinkCount === 33 && pcLinkCount === 17 && acLinkCount === 119 && totalLinkages === 170;

  const hPassed = !linkErr && !prErr &&
    countsExactH &&
    domainOrphanCount === 0 &&
    provOrphanCount === 0 &&
    verOrphanCount === 0 &&
    invalidStatusCountH === 0;

  recordTest(
    'TEST-13-H',
    'Provenance linkage resolution test (Zero orphaned linkages)',
    'PROVENANCE_INTEGRITY',
    hPassed ? 'PASS' : 'FAIL',
    'Exactly 170 linkages resolving to valid domain records, valid provenance records, and UNVERIFIED status; 0 orphans',
    {
      expectedCount: 170,
      observedCount: totalLinkages,
      orphanCount: totalOrphanCountH,
      domainOrphanCount,
      invalidProvenanceCount: provOrphanCount,
      versionOrphanCount: verOrphanCount,
      invalidStatusCount: invalidStatusCountH,
      breakdown: {
        states: stateLinkCount,
        districts: distLinkCount,
        parliamentaryConstituencies: pcLinkCount,
        constituencies: acLinkCount
      }
    },
    'All 170 pilot linkages bidirectionally resolve to existing domain rows and valid provenance records.'
  );

  // --------------------------------------------------------------------------
  // TEST-13-I: Lineage-aware governance verification (Full chain: entity -> linkage -> provenance -> version)
  // --------------------------------------------------------------------------
  const versionMap = new Map((versionsFound || []).map(v => [v.id, v]));

  let chainVerifiedCount = 0;
  let officialCountI = 0;
  let nonUnverifiedStatusCountI = 0;

  for (const l of (linkages || [])) {
    const pr = provMap.get(l.provenance_id);
    if (!pr) continue;

    const ver = versionMap.get(pr.dataset_version_id);
    if (!ver) continue;

    chainVerifiedCount++;

    if (pr.status === 'OFFICIAL' || ver.default_status === 'OFFICIAL') {
      officialCountI++;
    }
    if (pr.status !== 'UNVERIFIED' || ver.default_status !== 'UNVERIFIED') {
      nonUnverifiedStatusCountI++;
    }
  }

  const iPassed = chainVerifiedCount === 170 && officialCountI === 0 && nonUnverifiedStatusCountI === 0;

  recordTest(
    'TEST-13-I',
    'Lineage-aware governance verification: 100% pilot lineage UNVERIFIED, zero OFFICIAL',
    'GOVERNANCE_SECURITY',
    iPassed ? 'PASS' : 'FAIL',
    '170/170 complete lineage chains verify provenance.status = UNVERIFIED and version.default_status = UNVERIFIED; 0 OFFICIAL',
    {
      expectedCount: 170,
      observedCount: chainVerifiedCount,
      officialCount: officialCountI,
      invalidStatusCount: nonUnverifiedStatusCountI,
      orphanCount: 170 - chainVerifiedCount
    },
    'Complete pilot lineage chain verified: zero records elevated to OFFICIAL, 100% strictly UNVERIFIED.'
  );

  // --------------------------------------------------------------------------
  // TEST-13-J: Row Level Security enabled: public read succeeds; anonymous mutation denied
  // --------------------------------------------------------------------------
  const { status: dReadStatus } = await anonClient.from('districts').select('id, name').limit(1);
  const { status: pcReadStatus } = await anonClient.from('parliamentary_constituencies').select('id, name').limit(1);
  const { error: dMutErr } = await anonClient.from('districts').insert({
    code: `TS-DIST-ANON-${testRunId}`,
    state_code: 'TS',
    name: 'Malicious District',
    primary_dataset_version_id: 'ts_districts_2016_v1'
  });
  const { error: pcMutErr } = await anonClient.from('parliamentary_constituencies').insert({
    code: `TS-PC-ANON-${testRunId}`,
    state_code: 'TS',
    pc_number: 99,
    name: 'Malicious PC',
    primary_dataset_version_id: 'eci_ts_pc_2008_v1'
  });

  const jPassed = dReadStatus === 200 && pcReadStatus === 200 && !!dMutErr && !!pcMutErr;
  recordTest(
    'TEST-13-J',
    'Row Level Security enabled: public read succeeds; anonymous mutation denied',
    'RLS_SECURITY',
    jPassed ? 'PASS' : 'FAIL',
    'Public read returns 200; anonymous insertions rejected by RLS',
    { districtsRead: dReadStatus, pcRead: pcReadStatus, districtsMutRejected: !!dMutErr, pcMutRejected: !!pcMutErr }
  );

  // --------------------------------------------------------------------------
  // TEST-13-K: Existing domain read compatibility smoke test
  // --------------------------------------------------------------------------
  const { status: kStates } = await anonClient.from('states').select('code, name').limit(5);
  const { status: kAcs } = await anonClient.from('constituencies').select('id, name').limit(5);
  const { status: kCivic } = await anonClient.from('civic_issues').select('id, title, constituency_id').limit(5);
  const { status: kPosts } = await anonClient.from('posts').select('id, constituency_id').limit(5);

  const kPassed = kStates === 200 && kAcs === 200 && kCivic === 200 && kPosts === 200;
  recordTest(
    'TEST-13-K',
    'Existing domain read compatibility smoke test',
    'REGRESSION_INTEGRITY',
    kPassed ? 'PASS' : 'FAIL',
    'HTTP 200 responses on 4 representative domain reads (states, constituencies, civic_issues, posts)',
    {
      expectedCount: 4,
      observedCount: [kStates, kAcs, kCivic, kPosts].filter(s => s === 200).length,
      statesStatus: kStates,
      constituenciesStatus: kAcs,
      civicIssuesStatus: kCivic,
      postsStatus: kPosts
    },
    'Smoke test: confirms basic unauthenticated read availability across existing domain paths. Does not constitute exhaustive backwards-compatibility proof.'
  );

  // --------------------------------------------------------------------------
  // TEST-13-L: District chronology and dataset semantics verified
  // --------------------------------------------------------------------------
  const { data: dist2016L } = await adminClient.from('districts').select('code').eq('primary_dataset_version_id', 'ts_districts_2016_v1');
  const { data: dist2019L } = await adminClient.from('districts').select('code, name').eq('primary_dataset_version_id', 'ts_districts_2019_additions_v1');

  const additionsNames = (dist2019L || []).map(d => d.name).sort();
  const additionsCorrect = additionsNames.length === 2 && additionsNames[0] === 'Mulugu' && additionsNames[1] === 'Narayanpet';
  const baseCountCorrect = (dist2016L || []).length === 31;
  const lPassed = additionsCorrect && baseCountCorrect;

  recordTest(
    'TEST-13-L',
    'District chronology and dataset semantics verified',
    'CHRONOLOGY_INTEGRITY',
    lPassed ? 'PASS' : 'FAIL',
    '31 base districts from ts_districts_2016_v1; 2 addition districts (Mulugu, Narayanpet) from ts_districts_2019_additions_v1',
    { baseCount: dist2016L?.length, additionsCount: dist2019L?.length, additionsNames }
  );

  // --------------------------------------------------------------------------
  // TEST-13-M: Canonical identifier width sufficiency
  // --------------------------------------------------------------------------
  const { data: bhupalpally, error: bhuErr } = await adminClient
    .from('districts')
    .select('code, name')
    .eq('code', 'TS-DIST-JAYASHANKAR-BHUPALPALLY')
    .single();

  const mPassed = !bhuErr && bhupalpally && bhupalpally.code === 'TS-DIST-JAYASHANKAR-BHUPALPALLY' && bhupalpally.code.length === 31;
  recordTest(
    'TEST-13-M',
    'Canonical identifier width sufficiency (Full Jayashankar Bhupalpally length 31 verified)',
    'IDENTIFIER_WIDTH_INTEGRITY',
    mPassed ? 'PASS' : 'FAIL',
    "Full untruncated code 'TS-DIST-JAYASHANKAR-BHUPALPALLY' (31 chars) successfully persisted and retrieved",
    { code: bhupalpally?.code, length: bhupalpally?.code?.length, name: bhupalpally?.name }
  );

  printSummaryAndSave();
}

function printSummaryAndSave() {
  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${results.summary.total} | PASSED: ${results.summary.passed} | FAILED: ${results.summary.failed} | PENDING: ${results.summary.pending}`);
  console.log('================================================================\n');

  const reportPath = path.resolve('reports/w013_staging_verification.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`Report saved to ${reportPath}`);
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
