/**
 * verify_w012_data_governance.mjs
 * Authoritative W012 Data Governance Foundation Security & Invariants Test Suite
 *
 * Target: panIN-staging (https://fkpigozcqnmcvofuksar.supabase.co)
 * Mandate: CTO Implementation Authorization (Section 11, Tests A-L)
 *
 * Tests:
 *   TEST-12-A: New governance record defaults to UNKNOWN
 *   TEST-12-B: Ordinary client cannot set UNKNOWN -> OFFICIAL
 *   TEST-12-C: Ordinary client cannot set SCENARIO -> OFFICIAL (Permanent block)
 *   TEST-12-D: Ordinary client cannot set ESTIMATE -> OFFICIAL
 *   TEST-12-E: Ordinary client cannot set INFERRED -> OFFICIAL
 *   TEST-12-F: Ordinary client cannot set UNVERIFIED -> OFFICIAL
 *   TEST-12-G: Caller-supplied verification_id alone cannot elevate without valid evidence record in DB
 *   TEST-12-H: Authorized/evidenced transition succeeds where explicitly permitted
 *   TEST-12-I: Provenance records cannot be overwritten (Immutability invariant)
 *   TEST-12-J: Historical dataset versions remain intact (Multi-version integrity)
 *   TEST-12-K: RLS enforcement (Anonymous cannot insert/mutate governance tables)
 *   TEST-12-L: Existing domain application data remains readable through existing paths
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
console.log('W012: DATA GOVERNANCE FOUNDATION VERIFICATION SUITE');
console.log('Target Database:', supabaseUrl);
console.log('Timestamp:', new Date().toISOString());
console.log('================================================================\n');

const results = {
  timestamp: new Date().toISOString(),
  target: supabaseUrl,
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    unknown: 0
  }
};

function recordTest(id, title, category, passed, expected, observed, details = null) {
  results.summary.total++;
  if (passed === true) results.summary.passed++;
  else if (passed === false) results.summary.failed++;
  else results.summary.unknown++;

  const statusStr = passed === true ? '✅ PASS' : passed === false ? '❌ FAIL' : '⚠️ UNKNOWN';
  console.log(`[${statusStr}] ${id} — ${title}`);
  if (passed !== true) {
    console.log(`       Expected: ${JSON.stringify(expected)}`);
    console.log(`       Observed: ${JSON.stringify(observed)}`);
  }
  if (details) {
    console.log(`       Details:  ${details}`);
  }

  results.tests.push({ id, title, category, passed, expected, observed, details });
}

async function runTests() {
  const testRunId = crypto.randomUUID().slice(0, 8);
  console.log(`Test Execution Run ID: ${testRunId}\n`);

  const testDatasetId = `test_ds_${testRunId}`;
  const testVersionId = `test_ver_${testRunId}`;
  const testVersion2Id = `test_ver2_${testRunId}`;

  let provData = null;
  let scenProv = null;
  let estProv = null;
  let infProv = null;
  let unverProv = null;

  // --------------------------------------------------------------------------
  // TEST-12-A: New governance record defaults to UNKNOWN
  // --------------------------------------------------------------------------
  try {
    await adminClient.from('datasets').insert({
      id: testDatasetId,
      name: `Test Dataset ${testRunId}`,
      domain: 'other',
      source_id: 'eci'
    });

    const { data: verData, error: verErr } = await adminClient.from('dataset_versions').insert({
      id: testVersionId,
      dataset_id: testDatasetId,
      version_tag: 'v1.0'
    }).select().single();

    const { data: pData, error: provErr } = await adminClient.from('provenance_records').insert({
      dataset_version_id: testVersionId,
      source_record_id: 'raw_001'
    }).select().single();

    provData = pData;

    const versionDefaultIsUnknown = verData?.default_status === 'UNKNOWN';
    const provenanceDefaultIsUnknown = provData?.status === 'UNKNOWN';
    const aPassed = versionDefaultIsUnknown && provenanceDefaultIsUnknown;

    recordTest(
      'TEST-12-A',
      'New governance record defaults to UNKNOWN',
      'STATUS_DEFAULT',
      aPassed,
      { versionDefault: 'UNKNOWN', provenanceDefault: 'UNKNOWN' },
      { versionDefault: verData?.default_status, provenanceDefault: provData?.status },
      verErr || provErr ? `Errors: ${verErr?.message || ''} ${provErr?.message || ''}` : 'Verified column default behavior.'
    );
  } catch (err) {
    recordTest(
      'TEST-12-A',
      'New governance record defaults to UNKNOWN',
      'STATUS_DEFAULT',
      false,
      { versionDefault: 'UNKNOWN', provenanceDefault: 'UNKNOWN' },
      err.message,
      'Exception thrown'
    );
  }

  // --------------------------------------------------------------------------
  // TEST-12-B: Ordinary client cannot set UNKNOWN -> OFFICIAL
  // --------------------------------------------------------------------------
  try {
    if (!provData?.id) throw new Error('Requires provData from TEST-12-A');
    const { error: bErr } = await anonClient.from('provenance_records')
      .update({ status: 'OFFICIAL' })
      .eq('id', provData.id);

    const bPassed = !!bErr;
    recordTest(
      'TEST-12-B',
      'Ordinary client cannot set UNKNOWN -> OFFICIAL',
      'TRANSITION_GUARD',
      bPassed,
      'Request rejected (401/403/42501 or trigger denial)',
      bErr ? bErr.message : 'Update unexpectedly succeeded',
      `Anon update failed closed: ${bErr?.message}`
    );
  } catch (err) {
    recordTest(
      'TEST-12-B',
      'Ordinary client cannot set UNKNOWN -> OFFICIAL',
      'TRANSITION_GUARD',
      false,
      'Request rejected',
      err.message,
      'Prerequisite unavailable'
    );
  }

  // --------------------------------------------------------------------------
  // TEST-12-C: Ordinary client cannot set SCENARIO -> OFFICIAL (Permanent block)
  // --------------------------------------------------------------------------
  try {
    const { data: sP } = await adminClient.from('provenance_records').insert({
      dataset_version_id: testVersionId,
      source_record_id: 'scen_001',
      status: 'SCENARIO'
    }).select().single();
    scenProv = sP;

    const { error: cErr } = await adminClient.from('provenance_records')
      .update({ status: 'OFFICIAL' })
      .eq('id', scenProv.id);

    const cPassed = !!cErr && cErr.message.includes('INVARIANT VIOLATION');
    recordTest(
      'TEST-12-C',
      'Permanent block on SCENARIO -> OFFICIAL transition',
      'PERMANENT_INVARIANT',
      cPassed,
      'Trigger error containing INVARIANT VIOLATION',
      cErr ? cErr.message : 'Update unexpectedly succeeded',
      'SCENARIO records permanently barred from OFFICIAL elevation.'
    );
  } catch (err) {
    recordTest(
      'TEST-12-C',
      'Permanent block on SCENARIO -> OFFICIAL transition',
      'PERMANENT_INVARIANT',
      false,
      'Trigger error containing INVARIANT VIOLATION',
      err.message,
      'Exception during test'
    );
  }

  // --------------------------------------------------------------------------
  // TEST-12-D: Ordinary client cannot set ESTIMATE -> OFFICIAL
  // --------------------------------------------------------------------------
  try {
    const { data: eP } = await adminClient.from('provenance_records').insert({
      dataset_version_id: testVersionId,
      source_record_id: 'est_001',
      status: 'ESTIMATE'
    }).select().single();
    estProv = eP;

    const { error: dErr } = await anonClient.from('provenance_records')
      .update({ status: 'OFFICIAL' })
      .eq('id', estProv.id);

    const dPassed = !!dErr;
    recordTest(
      'TEST-12-D',
      'Ordinary client cannot set ESTIMATE -> OFFICIAL',
      'TRANSITION_GUARD',
      dPassed,
      'Request rejected',
      dErr ? dErr.message : 'Update unexpectedly succeeded',
      `Anon update rejected: ${dErr?.message}`
    );
  } catch (err) {
    recordTest(
      'TEST-12-D',
      'Ordinary client cannot set ESTIMATE -> OFFICIAL',
      'TRANSITION_GUARD',
      false,
      'Request rejected',
      err.message,
      'Exception during test'
    );
  }

  // --------------------------------------------------------------------------
  // TEST-12-E: Ordinary client cannot set INFERRED -> OFFICIAL
  // --------------------------------------------------------------------------
  try {
    const { data: iP } = await adminClient.from('provenance_records').insert({
      dataset_version_id: testVersionId,
      source_record_id: 'inf_001',
      status: 'INFERRED'
    }).select().single();
    infProv = iP;

    const { error: eErr } = await anonClient.from('provenance_records')
      .update({ status: 'OFFICIAL' })
      .eq('id', infProv.id);

    const ePassed = !!eErr;
    recordTest(
      'TEST-12-E',
      'Ordinary client cannot set INFERRED -> OFFICIAL',
      'TRANSITION_GUARD',
      ePassed,
      'Request rejected',
      eErr ? eErr.message : 'Update unexpectedly succeeded',
      `Anon update rejected: ${eErr?.message}`
    );
  } catch (err) {
    recordTest(
      'TEST-12-E',
      'Ordinary client cannot set INFERRED -> OFFICIAL',
      'TRANSITION_GUARD',
      false,
      'Request rejected',
      err.message,
      'Exception during test'
    );
  }

  // --------------------------------------------------------------------------
  // TEST-12-F: Ordinary client cannot set UNVERIFIED -> OFFICIAL
  // --------------------------------------------------------------------------
  try {
    const { data: uP } = await adminClient.from('provenance_records').insert({
      dataset_version_id: testVersionId,
      source_record_id: 'unver_001',
      status: 'UNVERIFIED'
    }).select().single();
    unverProv = uP;

    const { error: fErr } = await anonClient.from('provenance_records')
      .update({ status: 'OFFICIAL' })
      .eq('id', unverProv.id);

    const fPassed = !!fErr;
    recordTest(
      'TEST-12-F',
      'Ordinary client cannot set UNVERIFIED -> OFFICIAL',
      'TRANSITION_GUARD',
      fPassed,
      'Request rejected',
      fErr ? fErr.message : 'Update unexpectedly succeeded',
      `Anon update rejected: ${fErr?.message}`
    );
  } catch (err) {
    recordTest(
      'TEST-12-F',
      'Ordinary client cannot set UNVERIFIED -> OFFICIAL',
      'TRANSITION_GUARD',
      false,
      'Request rejected',
      err.message,
      'Exception during test'
    );
  }

  // --------------------------------------------------------------------------
  // TEST-12-G: Caller-supplied verification_id alone cannot elevate without valid evidence record in DB
  // --------------------------------------------------------------------------
  try {
    if (!unverProv?.id) throw new Error('Requires unverProv from TEST-12-F');
    const fakeEvidenceId = crypto.randomUUID();
    const { error: gErr } = await adminClient.from('provenance_records')
      .update({
        status: 'OFFICIAL',
        verification_evidence_id: fakeEvidenceId
      })
      .eq('id', unverProv.id);

    const gPassed = !!gErr && (gErr.message.includes('EVIDENCE NOT FOUND') || gErr.message.includes('violates foreign key constraint'));
    recordTest(
      'TEST-12-G',
      'Caller-supplied verification_id alone cannot elevate without DB evidence',
      'EVIDENCE_INTEGRITY',
      gPassed,
      'Trigger/FK error denying elevation with nonexistent evidence ID',
      gErr ? gErr.message : 'Update unexpectedly succeeded with fake verification_id',
      'Fabricated verification_id rejected.'
    );
  } catch (err) {
    recordTest(
      'TEST-12-G',
      'Caller-supplied verification_id alone cannot elevate without DB evidence',
      'EVIDENCE_INTEGRITY',
      false,
      'Trigger/FK error denying elevation',
      err.message,
      'Exception during test'
    );
  }

  // --------------------------------------------------------------------------
  // TEST-12-H: Authorized/evidenced transition succeeds where explicitly permitted
  // --------------------------------------------------------------------------
  try {
    if (!unverProv?.id) throw new Error('Requires unverProv from TEST-12-F');
    const { data: evData, error: evErr } = await adminClient.from('evidence_records').insert({
      dataset_version_id: testVersionId,
      artifact_name: 'official_eci_gazette_2024.pdf',
      artifact_sha256: crypto.createHash('sha256').update('gazette_content').digest('hex'),
      verification_authority: 'Election Commission of India',
      verified_by: 'CTO Independent Verifier',
      verification_notes: 'Verified against authoritative state gazette publication'
    }).select().single();

    let hPassed = false;
    let hMsg = '';
    if (evData) {
      const { error: hErr } = await adminClient.from('provenance_records')
        .update({
          status: 'OFFICIAL',
          verification_evidence_id: evData.id
        })
        .eq('id', unverProv.id);

      hPassed = !hErr;
      hMsg = hErr ? hErr.message : 'Transition to OFFICIAL completed cleanly with authoritative evidence.';
    } else {
      hMsg = `Evidence insertion failed: ${evErr?.message}`;
    }

    recordTest(
      'TEST-12-H',
      'Authorized/evidenced transition succeeds where explicitly permitted',
      'AUTHORIZED_TRANSITION',
      hPassed,
      'Update succeeds with status OFFICIAL and valid verification_evidence_id link',
      hPassed ? 'Transition succeeded with valid evidence' : hMsg,
      hMsg
    );
  } catch (err) {
    recordTest(
      'TEST-12-H',
      'Authorized/evidenced transition succeeds where explicitly permitted',
      'AUTHORIZED_TRANSITION',
      false,
      'Update succeeds with status OFFICIAL',
      err.message,
      'Exception during test'
    );
  }

  // --------------------------------------------------------------------------
  // TEST-12-I: Provenance records cannot be overwritten (Immutability invariant)
  // --------------------------------------------------------------------------
  try {
    if (!unverProv?.id) throw new Error('Requires unverProv from TEST-12-F');
    const { error: iErr } = await adminClient.from('provenance_records')
      .update({
        transformation_type: 'rewritten_malicious_transform'
      })
      .eq('id', unverProv.id);

    const iPassed = !!iErr && iErr.message.includes('IMMUTABILITY VIOLATION');
    recordTest(
      'TEST-12-I',
      'Provenance records cannot be overwritten (Immutability invariant)',
      'PROVENANCE_IMMUTABILITY',
      iPassed,
      'Trigger error containing IMMUTABILITY VIOLATION',
      iErr ? iErr.message : 'In-place provenance mutation unexpectedly succeeded',
      'Historical lineage fields are strictly append-only.'
    );
  } catch (err) {
    recordTest(
      'TEST-12-I',
      'Provenance records cannot be overwritten (Immutability invariant)',
      'PROVENANCE_IMMUTABILITY',
      false,
      'Trigger error containing IMMUTABILITY VIOLATION',
      err.message,
      'Exception during test'
    );
  }

  // --------------------------------------------------------------------------
  // TEST-12-J: Historical dataset versions remain intact (Multi-version integrity)
  // --------------------------------------------------------------------------
  try {
    const { error: v2Err } = await adminClient.from('dataset_versions').insert({
      id: testVersion2Id,
      dataset_id: testDatasetId,
      version_tag: 'v2.0',
      record_count: 50
    });

    const { data: v1Check } = await adminClient.from('dataset_versions').select('*').eq('id', testVersionId).single();
    const { data: v2Check } = await adminClient.from('dataset_versions').select('*').eq('id', testVersion2Id).single();

    const jPassed = !v2Err && v1Check?.version_tag === 'v1.0' && v2Check?.version_tag === 'v2.0';
    recordTest(
      'TEST-12-J',
      'Historical dataset versions remain intact (Multi-version integrity)',
      'VERSION_INTEGRITY',
      jPassed,
      'Both v1.0 and v2.0 coexist independently without overwrite',
      { v1Exists: !!v1Check, v2Exists: !!v2Check },
      'Adding newer dataset version preserved previous version.'
    );
  } catch (err) {
    recordTest(
      'TEST-12-J',
      'Historical dataset versions remain intact (Multi-version integrity)',
      'VERSION_INTEGRITY',
      false,
      'Both versions coexist',
      err.message,
      'Exception during test'
    );
  }

  // Cleanup test artifacts if created
  try {
    await adminClient.from('provenance_records').delete().eq('dataset_version_id', testVersionId);
    await adminClient.from('evidence_records').delete().eq('dataset_version_id', testVersionId);
    await adminClient.from('dataset_versions').delete().in('id', [testVersionId, testVersion2Id]);
    await adminClient.from('datasets').delete().eq('id', testDatasetId);
  } catch (e) {}

  // --------------------------------------------------------------------------
  // TEST-12-K: RLS enforcement (Anonymous cannot insert/mutate governance tables)
  // --------------------------------------------------------------------------
  try {
    const { error: kErr1 } = await anonClient.from('data_sources').insert({ id: `anon_src_${testRunId}`, name: 'malicious', publisher: 'anon', authority_level: 'crowdsourced' });
    const { error: kErr2 } = await anonClient.from('datasets').insert({ id: `anon_ds_${testRunId}`, name: 'malicious', domain: 'other', source_id: 'eci' });
    const { error: kErr3 } = await anonClient.from('evidence_records').insert({ artifact_name: 'fake.pdf', artifact_sha256: 'abc', verification_authority: 'none', verified_by: 'anon' });

    const kPassed = !!kErr1 && !!kErr2 && !!kErr3;
    recordTest(
      'TEST-12-K',
      'RLS enforcement: Anonymous callers denied mutation on governance tables',
      'RLS_SECURITY',
      kPassed,
      'All anonymous mutations rejected by RLS policy',
      { srcRejected: !!kErr1, dsRejected: !!kErr2, evRejected: !!kErr3 },
      'Anonymous callers cannot insert or mutate governance catalogs.'
    );
  } catch (err) {
    recordTest(
      'TEST-12-K',
      'RLS enforcement: Anonymous callers denied mutation on governance tables',
      'RLS_SECURITY',
      false,
      'All anonymous mutations rejected by RLS policy',
      err.message,
      'Exception during test'
    );
  }

  // --------------------------------------------------------------------------
  // TEST-12-L: Existing domain application data remains readable through existing paths
  // --------------------------------------------------------------------------
  try {
    const { status: l1Status } = await anonClient.from('states').select('code, name').limit(5);
    const { status: l2Status } = await anonClient.from('constituencies').select('id, name').limit(5);
    const { status: l3Status } = await anonClient.from('civic_issues').select('id, title').limit(5);
    const { status: l4Status } = await anonClient.from('posts').select('id, content').limit(5);
    const { status: l5Status } = await anonClient.from('user_profiles').select('user_id, display_name').limit(5);

    const lPassed = l1Status === 200 && l2Status === 200 && l3Status === 200 && l4Status === 200 && l5Status === 200;
    recordTest(
      'TEST-12-L',
      'Existing application data remains readable through existing paths',
      'REGRESSION_INTEGRITY',
      lPassed,
      'All existing domain queries return HTTP 200',
      { states: l1Status, constituencies: l2Status, civic_issues: l3Status, posts: l4Status, user_profiles: l5Status },
      'Zero regression on pre-existing application tables.'
    );
  } catch (err) {
    recordTest(
      'TEST-12-L',
      'Existing application data remains readable through existing paths',
      'REGRESSION_INTEGRITY',
      false,
      'All existing domain queries return HTTP 200',
      err.message,
      'Exception during test'
    );
  }

  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${results.summary.total} | PASSED: ${results.summary.passed} | FAILED: ${results.summary.failed}`);
  console.log('================================================================\n');

  const reportPath = path.resolve('reports/w012_staging_verification.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`Report saved to ${reportPath}`);
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
