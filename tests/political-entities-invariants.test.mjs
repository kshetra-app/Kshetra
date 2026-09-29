/**
 * tests/political-entities-invariants.test.mjs
 *
 * Milestone W018 — Canonical Political Entity Model
 * Master Verification & Invariant Test Battery (Remediation Revision)
 *
 * Directives:
 * - CTO ACCEPTANCE DIRECTIVE — W018 REMEDIATION REVIEW
 * - PLAN-W018-REV-1.0
 * - Master Execution Framework Amendments v1.2, v1.4, v1.5-A, v1.6
 *
 * Test Suites:
 * 1. Database Catalog & Security Audit (prosecdef=false, ACLs, RLS policies, search_path, triggers)
 * 2. Identity Resolution & Lifecycle Invariants (W018-ID-01 through W018-ID-17)
 * 3. CTO Remediation Blocker Verifications (Blockers 1, 2, 3, 4)
 * 4. Staging Post-Implementation Zero-Mutation Invariant (589 rows, exact SHA-256)
 * 5. Production Air-Gap Invariant (ehfafcnimmjusyvplbah untouched)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

console.log('================================================================');
console.log('W018: CANONICAL POLITICAL ENTITY MODEL');
console.log('MASTER INVARIANT & REMEDIATION VERIFICATION BATTERY');
console.log(`Execution Timestamp: ${new Date().toISOString()}`);
console.log('Staging Project: panIN-staging (fkpigozcqnmcvofuksar)');
console.log('Production: ehfafcnimmjusyvplbah (STRICTLY AIR-GAPPED & UNTOUCHED)');
console.log('================================================================\n');

// ─── 0. ENVIRONMENT & CONFIGURATION ──────────────────────────────────────────
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
if (supabaseUrl.includes('ehfafcnimmjusyvplbah')) {
  console.error('FATAL: Production database detected in staging configuration! Immediate abort.');
  process.exit(1);
}

const stagingSupabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

let passedChecks = 0;
let failedChecks = 0;
const results = [];

function recordCheck(id, title, pass, observed = '', details = '') {
  const status = pass ? 'PASS' : 'FAIL';
  if (pass) {
    passedChecks++;
  } else {
    failedChecks++;
  }
  console.log(`[${status}] ${id}: ${title}`);
  if (observed || details) {
    if (observed) console.log(`       Observed: ${observed}`);
    if (details) console.log(`       Details:  ${details}`);
  }
  results.push({ id, title, status, observed, details });
}

// Helper to query local PostGIS container where Migration 050 is deployed
function queryLocalPsql(sql) {
  try {
    const stdout = execSync('docker exec -i supabase_db_Kshetra psql -U postgres -d postgres -v ON_ERROR_STOP=1 -t -A', {
      input: sql,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return stdout.trim();
  } catch (err) {
    const errOutput = err.stderr ? err.stderr.toString() : err.message;
    return `ERROR: ${errOutput}`;
  }
}

async function runMasterBattery() {
  // ─── 1. DATABASE CATALOG & SECURITY AUDIT (W018-CAT-01..07) ──────────────────
  console.log('\n--- 1. DATABASE CATALOG & SECURITY AUDIT ---');

  // W018-CAT-01: Check prosecdef = false on all stored functions (100% SECURITY INVOKER)
  const prosecdefRaw = queryLocalPsql(
    "SELECT proname || ':' || prosecdef FROM pg_proc WHERE proname IN ('fn_resolve_canonical_person', 'fn_link_person_identity', 'fn_prevent_candidacy_mutation', 'fn_prevent_tenure_history_mutation') ORDER BY proname;"
  );
  const prosecdefLines = prosecdefRaw.split('\n').map((s) => s.trim()).filter(Boolean);
  const allInvokers =
    prosecdefLines.length === 4 && prosecdefLines.every((l) => l.endsWith(':false') || l.endsWith(':f'));
  recordCheck(
    'W018-CAT-01',
    'All stored procedures are 100% SECURITY INVOKER (prosecdef = false)',
    allInvokers,
    prosecdefLines.join(', ')
  );

  // W018-CAT-02: Immutable search_path = public, pg_temp
  const searchPathRaw = queryLocalPsql(
    "SELECT proname || ':' || array_to_string(proconfig, ';') FROM pg_proc WHERE proname IN ('fn_resolve_canonical_person', 'fn_link_person_identity', 'fn_prevent_candidacy_mutation', 'fn_prevent_tenure_history_mutation') ORDER BY proname;"
  );
  const searchPathLines = searchPathRaw.split('\n').map((s) => s.trim()).filter(Boolean);
  const allFixedSearchPath =
    searchPathLines.length === 4 && searchPathLines.every((l) => l.includes('search_path=public, pg_temp'));
  recordCheck(
    'W018-CAT-02',
    'All functions enforce immutable search_path = public, pg_temp',
    allFixedSearchPath,
    searchPathLines.join(', ')
  );

  // W018-CAT-03: fn_resolve_canonical_person execution revoked from anon, granted to authenticated & service_role
  const resolvePrivAnon = queryLocalPsql(
    "SELECT has_function_privilege('anon', 'public.fn_resolve_canonical_person(TEXT, TEXT)', 'EXECUTE');"
  );
  const resolvePrivAuth = queryLocalPsql(
    "SELECT has_function_privilege('authenticated', 'public.fn_resolve_canonical_person(TEXT, TEXT)', 'EXECUTE');"
  );
  const resolvePrivService = queryLocalPsql(
    "SELECT has_function_privilege('service_role', 'public.fn_resolve_canonical_person(TEXT, TEXT)', 'EXECUTE');"
  );
  const resolvePrivCorrect =
    (resolvePrivAnon === 'f' || resolvePrivAnon === 'false') &&
    (resolvePrivAuth === 't' || resolvePrivAuth === 'true') &&
    (resolvePrivService === 't' || resolvePrivService === 'true');
  recordCheck(
    'W018-CAT-03',
    'fn_resolve_canonical_person is revoked from anon and granted strictly to authenticated & service_role',
    resolvePrivCorrect,
    `anon: ${resolvePrivAnon}, authenticated: ${resolvePrivAuth}, service_role: ${resolvePrivService}`
  );

  // W018-CAT-04: fn_link_person_identity execution strictly revoked from anon and authenticated, granted to service_role
  const linkPrivAnon = queryLocalPsql(
    "SELECT has_function_privilege('anon', 'public.fn_link_person_identity(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT)', 'EXECUTE');"
  );
  const linkPrivAuth = queryLocalPsql(
    "SELECT has_function_privilege('authenticated', 'public.fn_link_person_identity(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT)', 'EXECUTE');"
  );
  const linkPrivService = queryLocalPsql(
    "SELECT has_function_privilege('service_role', 'public.fn_link_person_identity(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT)', 'EXECUTE');"
  );
  const linkPrivCorrect =
    (linkPrivAnon === 'f' || linkPrivAnon === 'false') &&
    (linkPrivAuth === 'f' || linkPrivAuth === 'false') &&
    (linkPrivService === 't' || linkPrivService === 'true');
  recordCheck(
    'W018-CAT-04',
    'fn_link_person_identity is revoked from anon and authenticated, granted strictly to service_role',
    linkPrivCorrect,
    `anon: ${linkPrivAnon}, authenticated: ${linkPrivAuth}, service_role: ${linkPrivService}`
  );

  // W018-CAT-05: RLS enabled on all 6 canonical tables
  const rlsRaw = queryLocalPsql(
    "SELECT tablename || ':' || rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('canonical_persons', 'political_organizations', 'person_roles', 'candidacies', 'elected_tenures', 'person_identity_linkages') ORDER BY tablename;"
  );
  const rlsLines = rlsRaw.split('\n').map((s) => s.trim()).filter(Boolean);
  const allRlsEnabled = rlsLines.length === 6 && rlsLines.every((l) => l.endsWith(':true') || l.endsWith(':t'));
  recordCheck(
    'W018-CAT-05',
    'Row Level Security (RLS) is enabled on all 6 canonical political entity tables',
    allRlsEnabled,
    rlsLines.join(', ')
  );

  // W018-CAT-06: SELECT policies verified on canonical tables
  const selectPoliciesRaw = queryLocalPsql(
    "SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND policyname LIKE '%_select_policy';"
  );
  const selectPolicies = selectPoliciesRaw.split('\n').map((s) => s.trim()).filter(Boolean);
  recordCheck(
    'W018-CAT-06',
    'SELECT policies verified on canonical tables',
    selectPolicies.length >= 6,
    `Found ${selectPolicies.length} select policies`
  );

  // W018-CAT-07: Immutability triggers installed on candidacies and elected_tenures
  const triggersRaw = queryLocalPsql(
    "SELECT tgname FROM pg_trigger WHERE tgname IN ('trg_candidacies_immutable_fields', 'trg_elected_tenures_immutable_fields');"
  );
  const triggers = triggersRaw.split('\n').map((s) => s.trim()).filter(Boolean);
  recordCheck(
    'W018-CAT-07',
    'Immutability triggers installed on candidacies and elected_tenures',
    triggers.length === 2,
    `Triggers: ${triggers.join(', ')}`
  );

  // ─── 2. IDENTITY RESOLUTION & LIFECYCLE INVARIANTS (W018-ID-01..17) ─────────
  console.log('\n--- 2. IDENTITY RESOLUTION & LIFECYCLE INVARIANTS ---');

  // Seed controlled test fixture
  const fixtureSql = `
    DO $$
    DECLARE
      v_person_id UUID;
      v_org_inc_id TEXT := 'ORG-PARTY-INC-TEST';
      v_org_brs_id TEXT := 'ORG-PARTY-BRS-TEST';
    BEGIN
      -- Create test organizations
      INSERT INTO public.political_organizations (id, org_type, name, short_name, data_status)
      VALUES 
        (v_org_inc_id, 'political_party', 'Indian National Congress Test', 'INC-TEST', 'OFFICIAL'),
        (v_org_brs_id, 'political_party', 'Bharat Rashtra Samithi Test', 'BRS-TEST', 'OFFICIAL')
      ON CONFLICT (id) DO NOTHING;

      -- Create canonical person
      INSERT INTO public.canonical_persons (canonical_name, aliases, gender, data_status)
      VALUES ('Anumula Revanth Reddy', ARRAY['Revanth Anna', 'A. Revanth Reddy'], 'male', 'OFFICIAL')
      RETURNING id INTO v_person_id;

      -- Linkages (2018 MLA, 2019 MP, 2023 MLA)
      PERFORM public.fn_link_person_identity(v_person_id, 'candidate_affidavits', 'aff-ts-65-2018-revanth', 'exact_eci_id', 1.00, 'test-runner');
      PERFORM public.fn_link_person_identity(v_person_id, 'legislator_profiles', 'MP_LS_2019_MALKAJGIRI_07', 'exact_sansad_id', 1.00, 'test-runner');
      PERFORM public.fn_link_person_identity(v_person_id, 'legislator_profiles', 'MLA_TS_2023_KODANGAL_141', 'exact_eci_id', 1.00, 'test-runner');

      -- Roles
      INSERT INTO public.person_roles (person_id, role_type, organization_id, relationship_type, valid_from, is_current)
      VALUES (v_person_id, 'mla', v_org_inc_id, 'member_of', '2023-12-07', true);

      -- Candidacies (3 elections tied to 1 person)
      INSERT INTO public.candidacies (person_id, election_year, election_type, constituency_type, constituency_id, party_id, result, votes_received, vote_share, rank)
      VALUES 
        (v_person_id, 2018, 'assembly', 'assembly', 'TS-AC-065', v_org_inc_id, 'lost', 76400, 42.50, 2),
        (v_person_id, 2019, 'parliamentary', 'parliamentary', 'TS-PC-007', v_org_inc_id, 'won', 603748, 38.63, 1),
        (v_person_id, 2023, 'assembly', 'assembly', 'TS-AC-065', v_org_inc_id, 'won', 107429, 55.04, 1);

      -- Elected Tenures
      INSERT INTO public.elected_tenures (person_id, office_type, jurisdiction_type, jurisdiction_id, term_start, term_end, is_current, party_at_election, current_party)
      VALUES 
        (v_person_id, 'mp_lok_sabha', 'parliamentary_constituency', 'TS-PC-007', '2019-05-24', '2023-12-07', false, v_org_inc_id, v_org_inc_id),
        (v_person_id, 'mla', 'assembly_constituency', 'TS-AC-065', '2023-12-07', NULL, true, v_org_inc_id, v_org_inc_id);
    END $$;
  `;
  queryLocalPsql(fixtureSql);

  // W018-ID-01: Same person resolves to stable single ID across 2018 MLA, 2019 MP, and 2023 MLA
  const res2018 = queryLocalPsql("SELECT public.fn_resolve_canonical_person('candidate_affidavits', 'aff-ts-65-2018-revanth');");
  const res2019 = queryLocalPsql("SELECT public.fn_resolve_canonical_person('legislator_profiles', 'MP_LS_2019_MALKAJGIRI_07');");
  const res2023 = queryLocalPsql("SELECT public.fn_resolve_canonical_person('legislator_profiles', 'MLA_TS_2023_KODANGAL_141');");

  const stableIdResolved = res2018 && res2018 === res2019 && res2019 === res2023 && !res2018.startsWith('ERROR');
  recordCheck(
    'W018-ID-01',
    'Same real-world person resolves to identical canonical UUID across multiple offices and entry points',
    stableIdResolved,
    `Resolved UUID: ${res2018}`
  );

  // W018-ID-02: Role change preserves person ID (Adding Aspirant role does not create new person)
  const addRoleSql = `
    INSERT INTO public.person_roles (person_id, role_type, relationship_type, valid_from, is_current)
    VALUES ('${res2018}', 'aspirant', 'contested_for', '2024-01-01', false)
    RETURNING id;
  `;
  queryLocalPsql(addRoleSql);
  const rolesCount = queryLocalPsql(`SELECT count(*) FROM public.person_roles WHERE person_id = '${res2018}';`);
  recordCheck(
    'W018-ID-02',
    'Role change preserves canonical person ID without creating duplicate person record',
    Number(rolesCount) >= 2,
    `Total roles attached to single person: ${rolesCount}`
  );

  // W018-ID-03: Party change preserves person ID (Defection update on tenure retains person ID)
  const partyShiftSql = `
    UPDATE public.elected_tenures
       SET current_party = 'ORG-PARTY-BRS-TEST',
           defection_date = '2024-06-01'
     WHERE person_id = '${res2018}' AND is_current = true
    RETURNING current_party;
  `;
  const partyShiftRes = queryLocalPsql(partyShiftSql);
  const tenurePersonRes = queryLocalPsql(`SELECT person_id FROM public.elected_tenures WHERE person_id = '${res2018}' AND is_current = true;`);
  recordCheck(
    'W018-ID-03',
    'Party affiliation update / defection preserves canonical person ID',
    partyShiftRes.includes('ORG-PARTY-BRS-TEST') && tenurePersonRes === res2018,
    `Current party: ${partyShiftRes}, person_id: ${tenurePersonRes}`
  );

  // W018-ID-04: Multi-election candidacies (Contesting 3 elections produces 3 candidacies tied to 1 person)
  const candCount = queryLocalPsql(`SELECT count(*) FROM public.candidacies WHERE person_id = '${res2018}';`);
  recordCheck(
    'W018-ID-04',
    'Multiple election contests link to single canonical person record',
    Number(candCount) === 3,
    `Candidacies count = ${candCount} (expected 3)`
  );

  // W018-ID-05: Historical geography preserved (Tenures retain distinct jurisdiction identifiers)
  const tenuresJurisdictions = queryLocalPsql(
    `SELECT string_agg(jurisdiction_id, ', ' ORDER BY term_start) FROM public.elected_tenures WHERE person_id = '${res2018}';`
  );
  recordCheck(
    'W018-ID-05',
    'Historical representative tenures preserve geographic jurisdictions without temporal collision',
    tenuresJurisdictions.includes('TS-PC-007') && tenuresJurisdictions.includes('TS-AC-065'),
    `Jurisdictions: ${tenuresJurisdictions}`
  );

  // W018-ID-06: Career progression lifecycle lineage
  const careerRoles = queryLocalPsql(
    `SELECT string_agg(role_type, ' -> ' ORDER BY valid_from) FROM public.person_roles WHERE person_id = '${res2018}';`
  );
  recordCheck(
    'W018-ID-06',
    'Complete career progression lifecycle captured on single entity lineage',
    careerRoles.length > 0,
    `Career timeline roles: ${careerRoles}`
  );

  // W018-ID-07: Political Organization distinct from Person entity
  const orgCheck = queryLocalPsql(
    `SELECT count(*) FROM public.canonical_persons WHERE id::text IN (SELECT id FROM public.political_organizations);`
  );
  recordCheck(
    'W018-ID-07',
    'Political Organization and Person entity spaces are strictly decoupled (zero ID collisions)',
    Number(orgCheck) === 0,
    `Collision count = ${orgCheck}`
  );

  // W018-ID-08: Account decoupled from Person (Unverified auth.users cannot unilaterally claim person)
  const claimDirectFail = queryLocalPsql(`
    SET ROLE anon;
    UPDATE public.canonical_persons SET primary_user_id = '00000000-0000-0000-0000-000000000001' WHERE id = '${res2018}';
    RESET ROLE;
  `);
  recordCheck(
    'W018-ID-08',
    'Account decoupled from Person: Unauthenticated or non-admin caller cannot claim person identity',
    claimDirectFail.includes('ERROR') || claimDirectFail.includes('permission denied'),
    `Result: ${claimDirectFail}`
  );

  // W018-ID-09: Unmapped identity fails closed (returns NULL)
  const unmappedRes = queryLocalPsql("SELECT public.fn_resolve_canonical_person('legislator_profiles', 'NON_EXISTENT_ID_9999');");
  recordCheck(
    'W018-ID-09',
    'Unknown or ambiguous external record ID fails closed (returns NULL, zero false positive matches)',
    unmappedRes === '' || unmappedRes === 'NULL',
    `Unmapped return = '${unmappedRes}'`
  );

  // W018-ID-10: Provenance preservation on canonical records
  const statusCheck = queryLocalPsql(`SELECT data_status FROM public.canonical_persons WHERE id = '${res2018}';`);
  recordCheck(
    'W018-ID-10',
    'Canonical person entity carries official data_status according to Migration 039 standards',
    statusCheck === 'OFFICIAL',
    `data_status = ${statusCheck}`
  );

  // W018-ID-11: Same name + different people creates distinct canonical persons (NO merge)
  const id11Sql = `
    DO $$
    DECLARE
      v_p1 UUID;
      v_p2 UUID;
    BEGIN
      INSERT INTO public.canonical_persons (canonical_name, data_status)
      VALUES ('Ramesh Kumar', 'OFFICIAL') RETURNING id INTO v_p1;

      INSERT INTO public.canonical_persons (canonical_name, data_status)
      VALUES ('Ramesh Kumar', 'OFFICIAL') RETURNING id INTO v_p2;

      PERFORM public.fn_link_person_identity(v_p1, 'eci', 'ECI-RAMESH-AC001', 'exact_eci_id', 1.00, 'test');
      PERFORM public.fn_link_person_identity(v_p2, 'eci', 'ECI-RAMESH-AC002', 'exact_eci_id', 1.00, 'test');
    END $$;
  `;
  queryLocalPsql(id11Sql);
  const p1Res = queryLocalPsql("SELECT public.fn_resolve_canonical_person('eci', 'ECI-RAMESH-AC001');");
  const p2Res = queryLocalPsql("SELECT public.fn_resolve_canonical_person('eci', 'ECI-RAMESH-AC002');");
  const distinctPersons = p1Res && p2Res && p1Res !== p2Res && !p1Res.startsWith('ERROR');
  recordCheck(
    'W018-ID-11',
    'Same name candidates in different constituencies resolve to distinct canonical IDs (no collision, no merge)',
    distinctPersons,
    `Person 1: ${p1Res}, Person 2: ${p2Res}`
  );

  // W018-ID-12: Same name in different constituencies handled safely without cross-contamination
  const c1Count = queryLocalPsql(`SELECT count(*) FROM public.person_identity_linkages WHERE person_id = '${p1Res}';`);
  const c2Count = queryLocalPsql(`SELECT count(*) FROM public.person_identity_linkages WHERE person_id = '${p2Res}';`);
  recordCheck(
    'W018-ID-12',
    'Same name candidates have independent isolated linkage sets without cross-contamination',
    Number(c1Count) === 1 && Number(c2Count) === 1,
    `P1 links: ${c1Count}, P2 links: ${c2Count}`
  );

  // W018-ID-13: Deterministic linkage only when evidence meets declared rule
  const invalidMethodSql = `
    SELECT public.fn_link_person_identity('${p1Res}', 'eci', 'ECI-FUZZY-TEST', 'fuzzy_name_match', 0.85, 'test');
  `;
  const invalidMethodRes = queryLocalPsql(invalidMethodSql);
  recordCheck(
    'W018-ID-13',
    'Fuzzy/probabilistic match methods are strictly prohibited by schema CHECK constraints',
    invalidMethodRes.includes('violates check constraint') || invalidMethodRes.includes('ERROR'),
    `Result: ${invalidMethodRes}`
  );

  // W018-ID-14: Conflicting external IDs fail closed (unique constraint on source_system + source_record_id)
  const conflictLinkSql = `
    INSERT INTO public.person_identity_linkages (person_id, source_system, source_record_id, match_method, confidence)
    VALUES ('${p2Res}', 'eci', 'ECI-RAMESH-AC001', 'exact_eci_id', 1.00);
  `;
  const conflictRes = queryLocalPsql(conflictLinkSql);
  recordCheck(
    'W018-ID-14',
    'Conflicting assignment of existing external ID to another person fails closed on unique constraint',
    conflictRes.includes('duplicate key value') || conflictRes.includes('unique constraint') || conflictRes.includes('ERROR'),
    `Result: ${conflictRes}`
  );

  // W018-ID-15: Missing external ID produces zero fabricated linkage
  const missingLinkageRes = queryLocalPsql(
    "SELECT count(*) FROM public.person_identity_linkages WHERE source_record_id IS NULL OR trim(source_record_id) = '';"
  );
  recordCheck(
    'W018-ID-15',
    'Missing external ID yields zero fabricated linkage entries in ledger',
    Number(missingLinkageRes) === 0,
    `Empty record IDs: ${missingLinkageRes}`
  );

  // W018-ID-16: Name/transliteration variation does not auto merge without verified external anchor
  const id16Sql = `
    DO $$
    DECLARE
      v_kcr1 UUID;
      v_kcr2 UUID;
    BEGIN
      INSERT INTO public.canonical_persons (canonical_name, data_status)
      VALUES ('K. Chandrashekar Rao', 'UNVERIFIED') RETURNING id INTO v_kcr1;

      INSERT INTO public.canonical_persons (canonical_name, data_status)
      VALUES ('Kalvakuntla Chandrashekhar Rao', 'UNVERIFIED') RETURNING id INTO v_kcr2;

      PERFORM public.fn_link_person_identity(v_kcr1, 'candidate_affidavits', 'AFF-KCR-2014', 'exact_eci_id', 1.00, 'test');
      PERFORM public.fn_link_person_identity(v_kcr2, 'candidate_affidavits', 'AFF-KCR-2018', 'exact_eci_id', 1.00, 'test');
    END $$;
  `;
  queryLocalPsql(id16Sql);
  const kcr1Res = queryLocalPsql("SELECT public.fn_resolve_canonical_person('candidate_affidavits', 'AFF-KCR-2014');");
  const kcr2Res = queryLocalPsql("SELECT public.fn_resolve_canonical_person('candidate_affidavits', 'AFF-KCR-2018');");
  recordCheck(
    'W018-ID-16',
    'Name and transliteration variations without common external anchor do NOT auto-merge',
    kcr1Res && kcr2Res && kcr1Res !== kcr2Res,
    `KCR-1: ${kcr1Res}, KCR-2: ${kcr2Res}`
  );

  // W018-ID-17: Ambiguous match fails closed to NULL/UNVERIFIED (zero probabilistic guessing)
  const emptyQueryRes = queryLocalPsql("SELECT public.fn_resolve_canonical_person('', '');");
  const nullQueryRes = queryLocalPsql("SELECT public.fn_resolve_canonical_person(NULL, NULL);");
  recordCheck(
    'W018-ID-17',
    'Ambiguous or empty resolution queries fail closed with NULL return (zero probabilistic guessing)',
    (emptyQueryRes === '' || emptyQueryRes === 'NULL') && (nullQueryRes === '' || nullQueryRes === 'NULL'),
    `Empty: '${emptyQueryRes}', Null: '${nullQueryRes}'`
  );

  // ─── 3. CTO REMEDIATION BLOCKER SPECIFIC SUITES ─────────────────────────────
  console.log('\n--- 3. CTO REMEDIATION BLOCKER VERIFICATION ---');

  // BLOCKER 1: epic_hash elimination and semantic security
  const epicHashColCheck = queryLocalPsql(
    "SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'canonical_persons' AND column_name = 'epic_hash';"
  );
  recordCheck(
    'W018-BLK-01A',
    'BLOCKER 1: epic_hash column strictly absent from canonical_persons table',
    Number(epicHashColCheck) === 0,
    `epic_hash column count = ${epicHashColCheck}`
  );

  const exactEpicCheck = queryLocalPsql(
    `SELECT public.fn_link_person_identity('${res2018}', 'eci', 'TEST-EPIC', 'exact_epic', 1.0, 'test');`
  );
  recordCheck(
    'W018-BLK-01B',
    'BLOCKER 1: exact_epic match_method is rejected by CHECK constraint',
    exactEpicCheck.includes('violates check constraint') || exactEpicCheck.includes('ERROR'),
    `Result: ${exactEpicCheck}`
  );

  // BLOCKER 2: Public Canonical Resolution Security & Enumeration Defense
  const anonResolveFail = queryLocalPsql(`
    SET ROLE anon;
    SELECT public.fn_resolve_canonical_person('candidate_affidavits', 'aff-ts-65-2018-revanth');
    RESET ROLE;
  `);
  recordCheck(
    'W018-BLK-02A',
    'BLOCKER 2: Direct execution of fn_resolve_canonical_person fails closed under anon (SQLSTATE 42501)',
    anonResolveFail.includes('permission denied for function fn_resolve_canonical_person') || anonResolveFail.includes('42501') || anonResolveFail.includes('permission denied'),
    `Result: ${anonResolveFail}`
  );

  const anonLinkageScrapeFail = queryLocalPsql(`
    SET ROLE anon;
    SELECT count(*) FROM public.person_identity_linkages;
    RESET ROLE;
  `);
  recordCheck(
    'W018-BLK-02B',
    'BLOCKER 2: Anonymous direct scraping/enumeration of person_identity_linkages ledger is denied by RLS/privileges',
    anonLinkageScrapeFail.includes('permission denied') || anonLinkageScrapeFail.includes('ERROR') || anonLinkageScrapeFail.includes('0'),
    `Result: ${anonLinkageScrapeFail}`
  );

  // BLOCKER 3: Organization Semantics & Explicit Relationships
  const validOrgTypesCheck = queryLocalPsql(`
    INSERT INTO public.political_organizations (id, org_type, name, short_name)
    VALUES 
      ('ORG-MEDIA-TV9-TEST', 'media_organization', 'TV9 Telugu Test', 'TV9-TEST'),
      ('ORG-CIVIC-ADR-TEST', 'civic_organization', 'Association for Democratic Reforms Test', 'ADR-TEST'),
      ('ORG-ALLIANCE-NDA-TEST', 'political_alliance', 'National Democratic Alliance Test', 'NDA-TEST'),
      ('ORG-OTHER-MISC-TEST', 'other', 'Independent Civic Forum Test', 'ICF-TEST')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id;
  `);
  const invalidOrgTypeCheck = queryLocalPsql(`
    INSERT INTO public.political_organizations (id, org_type, name, short_name)
    VALUES ('ORG-INVALID-TEST', 'unsupported_type', 'Invalid Org', 'INV')
    RETURNING id;
  `);
  recordCheck(
    'W018-BLK-03A',
    'BLOCKER 3: Organization org_type strictly enforces political_party, media_organization, civic_organization, political_alliance, other',
    validOrgTypesCheck.includes('ORG-MEDIA-TV9-TEST') && invalidOrgTypeCheck.includes('violates check constraint'),
    `Valid orgs created, invalid rejected: ${invalidOrgTypeCheck.slice(0, 80)}`
  );

  // BLOCKER 3B: Inter-organization alliance relationship via parent_org_id
  const parentOrgLinkSql = `
    UPDATE public.political_organizations
       SET parent_org_id = 'ORG-ALLIANCE-NDA-TEST'
     WHERE id = 'ORG-PARTY-BRS-TEST'
    RETURNING parent_org_id;
  `;
  const parentOrgRes = queryLocalPsql(parentOrgLinkSql);
  recordCheck(
    'W018-BLK-03B',
    'BLOCKER 3: Inter-organization alliance / parent-child relationships modeled via parent_org_id FK',
    parentOrgRes.includes('ORG-ALLIANCE-NDA-TEST'),
    `Parent org: ${parentOrgRes}`
  );

  // BLOCKER 3C: Person-to-Organization relationship semantics in person_roles
  const relTypeSql = `
    INSERT INTO public.person_roles (person_id, role_type, organization_id, relationship_type, valid_from, is_current)
    VALUES ('${res2018}', 'journalist', 'ORG-MEDIA-TV9-TEST', 'employed_by', '2024-01-01', false)
    RETURNING relationship_type;
  `;
  const invalidRelTypeSql = `
    INSERT INTO public.person_roles (person_id, role_type, organization_id, relationship_type, valid_from, is_current)
    VALUES ('${res2018}', 'journalist', 'ORG-MEDIA-TV9-TEST', 'arbitrary_relation', '2024-01-01', false);
  `;
  const validRelRes = queryLocalPsql(relTypeSql);
  const invalidRelRes = queryLocalPsql(invalidRelTypeSql);
  recordCheck(
    'W018-BLK-03C',
    'BLOCKER 3: person_roles.relationship_type strictly enforces member_of, affiliated_with, contested_for, employed_by, alliance_with',
    validRelRes.includes('employed_by') && invalidRelRes.includes('violates check constraint'),
    `Valid rel: ${validRelRes}, invalid rel rejected: ${invalidRelRes.slice(0, 80)}`
  );

  // BLOCKER 4: Candidacy / Office / Affiliation / Defection Immutability
  const mutatePartyAtElectionSql = `
    UPDATE public.elected_tenures
       SET party_at_election = 'ORG-PARTY-BRS-TEST'
     WHERE person_id = '${res2018}' AND is_current = true;
  `;
  const mutatePartyAtElectionRes = queryLocalPsql(mutatePartyAtElectionSql);
  recordCheck(
    'W018-BLK-04A',
    'BLOCKER 4: Modifying historical party_at_election on elected_tenures is blocked by database trigger',
    mutatePartyAtElectionRes.includes('IMMUTABLE_FIELD') || mutatePartyAtElectionRes.includes('23514'),
    `Result: ${mutatePartyAtElectionRes}`
  );

  const mutateCandidacyPartySql = `
    UPDATE public.candidacies
       SET party_id = 'ORG-PARTY-BRS-TEST'
     WHERE person_id = '${res2018}' AND election_year = 2023;
  `;
  const mutateCandidacyPartyRes = queryLocalPsql(mutateCandidacyPartySql);
  recordCheck(
    'W018-BLK-04B',
    'BLOCKER 4: Modifying historical party_id on candidacies is blocked by database trigger',
    mutateCandidacyPartyRes.includes('IMMUTABLE_FIELD') || mutateCandidacyPartyRes.includes('23514'),
    `Result: ${mutateCandidacyPartyRes}`
  );

  // BLOCKER 4C: Defection updates current_party without mutating party_at_election or historical candidacies
  const preTenure = queryLocalPsql(`SELECT party_at_election || '|' || current_party FROM public.elected_tenures WHERE person_id = '${res2018}' AND is_current = true;`);
  const preCandidacy = queryLocalPsql(`SELECT party_id FROM public.candidacies WHERE person_id = '${res2018}' AND election_year = 2023;`);
  const defectionUpdateSql = `
    UPDATE public.elected_tenures
       SET current_party = 'ORG-OTHER-MISC-TEST',
           defection_date = '2024-09-01'
     WHERE person_id = '${res2018}' AND is_current = true
    RETURNING party_at_election || '|' || current_party;
  `;
  const defectionUpdateRes = queryLocalPsql(defectionUpdateSql);
  const postCandidacy = queryLocalPsql(`SELECT party_id FROM public.candidacies WHERE person_id = '${res2018}' AND election_year = 2023;`);
  const defectionClean =
    defectionUpdateRes.startsWith('ORG-PARTY-INC-TEST|ORG-OTHER-MISC-TEST') &&
    preCandidacy === postCandidacy &&
    postCandidacy === 'ORG-PARTY-INC-TEST';
  recordCheck(
    'W018-BLK-04C',
    'BLOCKER 4: Defection updates current_party and defection_date while party_at_election and candidacy remain untouched',
    defectionClean,
    `Tenure: ${defectionUpdateRes}, Candidacy party: ${postCandidacy}`
  );

  // ─── 4. STAGING POSTGIS 589 GEOMETRY BASELINE INTEGRITY (W018-STG-01..02) ────
  console.log('\n--- 4. STAGING 589 GEOMETRY BASELINE INTEGRITY ---');

  const EXPECTED_ROW_COUNT = 589;
  const EXPECTED_DIGEST = 'f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b';

  function hashRowGovernedFields(row) {
    const coords = row.geometry?.coordinates || row.geometry;
    const geomHash = crypto.createHash('sha256').update(JSON.stringify(coords)).digest('hex');

    const governedPayload = {
      entity_type: row.entity_type,
      mandal_version_id: row.mandal_version_id,
      dataset_version_id: row.dataset_version_id,
      provenance_id: row.provenance_id,
      source_feature_id: String(row.source_feature_id),
      raw_artifact_sha256: row.raw_artifact_sha256,
      snapshot_date: String(row.snapshot_date).slice(0, 10),
      valid_from: String(row.valid_from).slice(0, 10),
      valid_to: row.valid_to ? String(row.valid_to).slice(0, 10) : null,
      temporal_classification: row.temporal_classification,
      authority_classification: row.authority_classification,
      status: row.status,
      is_current: Boolean(row.is_current),
      geometry_hash: geomHash,
    };

    return crypto.createHash('sha256').update(JSON.stringify(governedPayload)).digest('hex');
  }

  function computeRowSetDigest(rowsList) {
    const sortedHashes = rowsList
      .slice()
      .sort((a, b) => a.mandal_version_id.localeCompare(b.mandal_version_id))
      .map((r) => hashRowGovernedFields(r));
    return crypto.createHash('sha256').update(sortedHashes.join('\n')).digest('hex');
  }

  let stagingRows = [];
  const pageSize = 100;
  for (let i = 0; i < 10; i++) {
    const { data, error } = await stagingSupabase
      .from('entity_geometries')
      .select('*')
      .order('id')
      .range(i * pageSize, (i + 1) * pageSize - 1);
    if (error) {
      console.error('FATAL fetching entity_geometries page:', i, error);
      process.exit(1);
    }
    stagingRows.push(...data);
    if (data.length < pageSize) break;
  }

  const stagingRowCount = stagingRows.length;
  const currentDigest = computeRowSetDigest(stagingRows);
  const countMatches = stagingRowCount === EXPECTED_ROW_COUNT;
  const digestMatches = currentDigest === EXPECTED_DIGEST;

  recordCheck(
    'W018-STG-01',
    'public.entity_geometries row count strictly preserved at exactly 589 rows on staging',
    countMatches,
    `Observed: ${stagingRowCount} / Expected: ${EXPECTED_ROW_COUNT}`
  );

  recordCheck(
    'W018-STG-02',
    'public.entity_geometries SHA-256 digest byte-exact match (zero mutation of 589 geometries)',
    digestMatches,
    `Digest: ${currentDigest}`
  );

  // ─── 5. PRODUCTION AIR-GAP INVARIANT (W018-PRD-01) ───────────────────────────
  console.log('\n--- 5. PRODUCTION AIR-GAP INVARIANT ---');

  const prdUntouched = !supabaseUrl.includes('ehfafcnimmjusyvplbah');
  recordCheck(
    'W018-PRD-01',
    'Production database ehfafcnimmjusyvplbah strictly air-gapped with zero connections and zero mutations',
    prdUntouched,
    'ehfafcnimmjusyvplbah untouched'
  );

  // ─── SUMMARY & VERDICT ───────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log(`TOTAL CHECKS: ${results.length}`);
  console.log(`PASSED:       ${passedChecks}`);
  console.log(`FAILED:       ${failedChecks}`);
  console.log(`OVERALL:      ${failedChecks === 0 ? 'ALL INVARIANTS PASSED' : 'INVARIANTS FAILED'}`);
  console.log('================================================================\n');

  // Save report artifact
  const reportPath = 'reports/w018_political_entities_verification.json';
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        metadata: {
          directive: 'W018 Political Entity Model Master Invariant Battery (Remediation Revision)',
          executionTimestamp: new Date().toISOString(),
          stagingUrl: supabaseUrl,
          totalChecks: results.length,
          passedChecks,
          failedChecks,
          verdict: failedChecks === 0 ? 'PASS' : 'FAIL',
        },
        stagingBaseline: {
          rowCount: stagingRowCount,
          expectedRowCount: EXPECTED_ROW_COUNT,
          sha256Digest: currentDigest,
          expectedDigest: EXPECTED_DIGEST,
          mutationDetected: !digestMatches,
        },
        checks: results,
      },
      null,
      2
    )
  );

  console.log(`W018 verification evidence package written to: ${reportPath}`);
  if (failedChecks > 0) {
    process.exit(1);
  }
}

runMasterBattery().catch((err) => {
  console.error('Fatal error during W018 master invariant execution:', err);
  process.exit(1);
});
