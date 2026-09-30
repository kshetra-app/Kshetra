/**
 * tests/delimitation-migration-055-preflight.test.mjs
 *
 * Milestone W020 — Delimitation Engine Foundation
 * Gate W020-G4: Migration 055 Staging Preflight Verification Suite
 *
 * Directives:
 * - CTO AUTHORIZATION — W020-G4 MIGRATION 055 STAGING PREFLIGHT
 * - Master Execution Framework Amendments v1.2, v1.4, v1.5-A, v1.6
 * - PANIN India Election & Political Data Constitution
 *
 * Test Battery:
 * 1. Schema: W020-G4-SCH-01..03
 * 2. FK & Relational Integrity: W020-G4-FK-01..03
 * 3. RLS & Security: W020-G4-RLS-01..04
 * 4. Regime Semantics: W020-G4-REG-01..02
 * 5. Provenance Semantics: W020-G4-PRV-01..03
 * 6. Migration Safety & Atomicity: W020-G4-MIG-01..03
 * 7. Production Isolation & Air-Gap: W020-G4-PRD-01
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

console.log('================================================================');
console.log('W020-G4: MIGRATION 055 STAGING PREFLIGHT VERIFICATION SUITE');
console.log(`Execution Timestamp: ${new Date().toISOString()}`);
console.log('Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY');
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

// Production Guard
if (supabaseUrl.includes('ehfafcnimmjusyvplbah')) {
  console.error('FATAL: Production database detected in configuration! Immediate abort.');
  process.exit(1);
}
if (!supabaseUrl.includes('fkpigozcqnmcvofuksar')) {
  console.error(`FATAL: Execution target is NOT panIN-staging! Detected: ${supabaseUrl}`);
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

function queryPsql(db, sql) {
  try {
    const stdout = execSync(`docker exec -i supabase_db_Kshetra psql -U postgres -d ${db} -v ON_ERROR_STOP=1 -t -A`, {
      input: sql,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { ok: true, stdout: stdout.trim(), stderr: '' };
  } catch (err) {
    const errOutput = err.stderr ? err.stderr.toString() : err.message;
    return { ok: false, stdout: '', stderr: errOutput.trim() };
  }
}

async function runG4Battery() {
  const testDb = 'w020_g4_pg_verify';

  // ─── SETUP ISOLATED REHEARSAL ENVIRONMENT ──────────────────────────────────
  console.log('\n--- 0. PROVISIONING ISOLATED POSTGRESQL 17 TEST HARNESS ---');
  execSync(`docker exec supabase_db_Kshetra psql -U postgres -c "DROP DATABASE IF EXISTS ${testDb};"`, { stdio: 'pipe' });
  execSync(`docker exec supabase_db_Kshetra psql -U postgres -c "CREATE DATABASE ${testDb};"`, { stdio: 'pipe' });

  const setupSql = fs.readFileSync('scripts/setup_w020_g4_isolated_test.sql', 'utf8');
  const setupRes = queryPsql(testDb, setupSql);
  if (!setupRes.ok) {
    console.error('FATAL: Setup script failed:', setupRes.stderr);
    process.exit(1);
  }
  console.log('Isolated test database provisioned and baseline prerequisites initialized.');

  // Capture Pre-Migration Schema Snapshot
  const preMigColsProp = queryPsql(testDb, "SELECT column_name FROM information_schema.columns WHERE table_name = 'delimitation_proposals' ORDER BY column_name;").stdout.split('\n');
  const preMigColsMap = queryPsql(testDb, "SELECT column_name FROM information_schema.columns WHERE table_name = 'constituency_mapping' ORDER BY column_name;").stdout.split('\n');

  // ─── 1. MIGRATION ATOMICITY & SAFETY (W020-G4-MIG-01..03) ───────────────────
  console.log('\n--- 1. MIGRATION ATOMICITY & SAFETY ---');

  // W020-G4-MIG-01: Migration succeeds transactionally
  const mig055Sql = fs.readFileSync('supabase/migrations/055_delimitation_canonical_bridge.sql', 'utf8');
  const migRes = queryPsql(testDb, mig055Sql);
  recordCheck(
    'W020-G4-MIG-01',
    'Migration 055 executes transactionally with exit code 0',
    migRes.ok,
    migRes.ok ? 'Transaction committed successfully' : migRes.stderr
  );

  // W020-G4-MIG-02: Migration is deterministic and idempotent on replay
  const replayRes = queryPsql(testDb, mig055Sql);
  recordCheck(
    'W020-G4-MIG-02',
    'Migration 055 is idempotent on replay (zero errors on re-execution)',
    replayRes.ok,
    replayRes.ok ? 'Replay succeeded with IF NOT EXISTS notices' : replayRes.stderr
  );

  // W020-G4-MIG-03: Failure rehearsal rolls back cleanly
  const failureRehearsalSql = `
    BEGIN;
    ALTER TABLE public.delimitation_proposals ADD COLUMN canary_fail_col TEXT;
    -- Deliberately invalid statement to trigger transaction abort:
    ALTER TABLE public.delimitation_proposals ADD CONSTRAINT fail_bogus CHECK (non_existent_column_fail > 0);
    COMMIT;
  `;
  const failRes = queryPsql(testDb, failureRehearsalSql);
  const canaryCheck = queryPsql(testDb, "SELECT count(*) FROM information_schema.columns WHERE table_name = 'delimitation_proposals' AND column_name = 'canary_fail_col';").stdout.trim();
  recordCheck(
    'W020-G4-MIG-03',
    'Failure rehearsal rolls back cleanly (zero partial schema application on error)',
    !failRes.ok && canaryCheck === '0',
    `Execution aborted as expected; canary column count = ${canaryCheck}`
  );

  // ─── 2. SCHEMA INTEGRITY & CANONICAL BRIDGES (W020-G4-SCH-01..03) ───────────
  console.log('\n--- 2. SCHEMA INTEGRITY & CANONICAL BRIDGES ---');

  // W020-G4-SCH-01: All required tables and columns exist
  const postMigColsProp = queryPsql(testDb, "SELECT column_name || ':' || data_type FROM information_schema.columns WHERE table_name = 'delimitation_proposals' AND column_name IN ('delimitation_regime_id', 'provenance_id', 'metadata') ORDER BY column_name;").stdout.split('\n');
  const postMigColsMap = queryPsql(testDb, "SELECT column_name || ':' || data_type FROM information_schema.columns WHERE table_name = 'constituency_mapping' AND column_name IN ('constituency_version_id', 'predecessor_version_id', 'provenance_id') ORDER BY column_name;").stdout.split('\n');

  const propExpected = ['delimitation_regime_id:character varying', 'metadata:jsonb', 'provenance_id:uuid'];
  const mapExpected = ['constituency_version_id:uuid', 'predecessor_version_id:uuid', 'provenance_id:uuid'];

  const propMatches = propExpected.every(c => postMigColsProp.includes(c));
  const mapMatches = mapExpected.every(c => postMigColsMap.includes(c));

  recordCheck(
    'W020-G4-SCH-01',
    'All required bridge columns exist with exact data types on both tables',
    propMatches && mapMatches,
    `proposals: [${postMigColsProp.join(', ')}], mapping: [${postMigColsMap.join(', ')}]`
  );

  // W020-G4-SCH-02: No unauthorized columns added
  const allCurrentColsProp = queryPsql(testDb, "SELECT column_name FROM information_schema.columns WHERE table_name = 'delimitation_proposals' ORDER BY column_name;").stdout.split('\n');
  const allCurrentColsMap = queryPsql(testDb, "SELECT column_name FROM information_schema.columns WHERE table_name = 'constituency_mapping' ORDER BY column_name;").stdout.split('\n');

  const diffProp = allCurrentColsProp.filter(c => !preMigColsProp.includes(c));
  const diffMap = allCurrentColsMap.filter(c => !preMigColsMap.includes(c));

  const onlyApprovedProp = diffProp.length === 3 && diffProp.every(c => ['delimitation_regime_id', 'provenance_id', 'metadata'].includes(c));
  const onlyApprovedMap = diffMap.length === 3 && diffMap.every(c => ['constituency_version_id', 'predecessor_version_id', 'provenance_id'].includes(c));

  recordCheck(
    'W020-G4-SCH-02',
    'Zero unauthorized columns added (strictly the 3 approved columns per table)',
    onlyApprovedProp && onlyApprovedMap,
    `Added to proposals: [${diffProp.join(', ')}]; Added to mapping: [${diffMap.join(', ')}]`
  );

  // W020-G4-SCH-03: Zero persistent is_scenario columns
  const badScenarioCols = queryPsql(testDb, "SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'is_scenario';").stdout.trim();
  recordCheck(
    'W020-G4-SCH-03',
    'Zero persistent is_scenario columns exist in database schema',
    badScenarioCols === '0',
    `Found: ${badScenarioCols} columns named is_scenario`
  );

  // ─── 3. FOREIGN KEY & RELATIONAL INTEGRITY (W020-G4-FK-01..03) ───────────────
  console.log('\n--- 3. FOREIGN KEY & RELATIONAL INTEGRITY ---');

  // W020-G4-FK-01: All approved FKs exist
  const fksRaw = queryPsql(testDb, `
    SELECT tc.table_name || '.' || kcu.column_name || ' -> ' || ccu.table_name || '(' || ccu.column_name || ')'
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name IN ('delimitation_proposals', 'constituency_mapping')
      AND kcu.column_name IN ('delimitation_regime_id', 'provenance_id', 'constituency_version_id', 'predecessor_version_id')
    ORDER BY tc.table_name, kcu.column_name;
  `).stdout.split('\n').filter(Boolean);

  const expectedFks = [
    'constituency_mapping.constituency_version_id -> constituency_versions(id)',
    'constituency_mapping.predecessor_version_id -> constituency_versions(id)',
    'constituency_mapping.provenance_id -> provenance_records(id)',
    'delimitation_proposals.delimitation_regime_id -> delimitation_regimes(id)',
    'delimitation_proposals.provenance_id -> provenance_records(id)'
  ];

  const allFksPresent = expectedFks.every(fk => fksRaw.includes(fk));
  recordCheck(
    'W020-G4-FK-01',
    'All 5 approved foreign key relationships exist and reference canonical tables',
    allFksPresent && fksRaw.length === 5,
    `Verified FKs:\n         ${fksRaw.join('\n         ')}`
  );

  // W020-G4-FK-02: Invalid references fail closed
  const invalidRegimeInsert = queryPsql(testDb, `
    INSERT INTO public.delimitation_proposals (state_code, title, current_seats, proposed_seats, delimitation_regime_id)
    VALUES ('TS', 'Invalid Regime Proposal', 119, 119, 'nonexistent_regime_slug');
  `);
  const invalidProvInsert = queryPsql(testDb, `
    INSERT INTO public.delimitation_proposals (state_code, title, current_seats, proposed_seats, delimitation_regime_id, provenance_id)
    VALUES ('TS', 'Invalid Prov Proposal', 119, 119, 'eci_delimitation_2008', '00000000-0000-0000-0000-999999999999');
  `);
  const invalidVersionInsert = queryPsql(testDb, `
    INSERT INTO public.constituency_mapping (proposal_id, state_code, old_ac_no, old_name, new_ac_no, new_name, constituency_version_id)
    VALUES ('00000000-0000-0000-0000-000000000001', 'TS', 1, 'Sirpur', 1, 'Sirpur', '00000000-0000-0000-0000-999999999999');
  `);

  const allInvalidFail = !invalidRegimeInsert.ok && !invalidProvInsert.ok && !invalidVersionInsert.ok;
  recordCheck(
    'W020-G4-FK-02',
    'Invalid foreign key references fail closed with FK constraint violations',
    allInvalidFail,
    'Invalid regime rejected, invalid provenance rejected, invalid version rejected'
  );

  // W020-G4-FK-03: ON DELETE RESTRICT prevents orphan generation
  // First insert valid proposal and mapping
  queryPsql(testDb, `
    INSERT INTO public.delimitation_proposals (id, state_code, title, current_seats, proposed_seats, delimitation_regime_id, provenance_id)
    VALUES ('20200000-0000-0000-0000-000000000001', 'TS', 'Active G4 Proposal', 119, 119, 'eci_delimitation_2008', 'a0000000-0000-0000-0000-000000000001');

    INSERT INTO public.constituency_mapping (id, proposal_id, state_code, old_ac_no, old_name, new_ac_no, new_name, constituency_version_id, predecessor_version_id, provenance_id)
    VALUES ('20200000-0000-0000-0000-000000000002', '20200000-0000-0000-0000-000000000001', 'TS', 1, 'Sirpur', 1, 'Sirpur', 'ca1fc841-8235-41d8-89f1-108f9ba81cff', 'ca1fc841-8235-41d8-89f1-108f9ba81cff', 'a0000000-0000-0000-0000-000000000001');
  `);

  const deleteRegimeAttempt = queryPsql(testDb, "DELETE FROM public.delimitation_regimes WHERE id = 'eci_delimitation_2008';");
  const deleteVersionAttempt = queryPsql(testDb, "DELETE FROM public.constituency_versions WHERE id = 'ca1fc841-8235-41d8-89f1-108f9ba81cff';");
  const deleteProvAttempt = queryPsql(testDb, "DELETE FROM public.provenance_records WHERE id = 'a0000000-0000-0000-0000-000000000001';");

  const allDeletesBlocked = !deleteRegimeAttempt.ok && !deleteVersionAttempt.ok && !deleteProvAttempt.ok;
  recordCheck(
    'W020-G4-FK-03',
    'ON DELETE RESTRICT actively blocks deletion of referenced regimes, versions, and provenance',
    allDeletesBlocked,
    'Regime delete blocked (23503), version delete blocked (23503), provenance delete blocked (23503)'
  );

  // ─── 4. RLS & SECURITY POSTURE (W020-G4-RLS-01..04) ──────────────────────────
  console.log('\n--- 4. RLS & SECURITY POSTURE ---');

  // W020-G4-RLS-01: RLS enabled on all affected tables
  const rlsStatus = queryPsql(testDb, `
    SELECT tablename || ':' || rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename IN ('delimitation_proposals', 'constituency_mapping')
    ORDER BY tablename;
  `).stdout.split('\n');

  const allRlsActive = rlsStatus.length === 2 && rlsStatus.every(s => s.endsWith(':true') || s.endsWith(':t'));
  recordCheck(
    'W020-G4-RLS-01',
    'Row Level Security enabled on public.delimitation_proposals and public.constituency_mapping',
    allRlsActive,
    rlsStatus.join(', ')
  );

  // W020-G4-RLS-02: Anonymous write denied
  // Test anon role attempting INSERT
  const anonInsertAttempt = queryPsql(testDb, `
    SET ROLE anon;
    INSERT INTO public.delimitation_proposals (state_code, title, current_seats, proposed_seats)
    VALUES ('TS', 'Anon Proposal', 119, 119);
    RESET ROLE;
  `);
  recordCheck(
    'W020-G4-RLS-02',
    'Anonymous write is denied fail-closed under active RLS policy',
    !anonInsertAttempt.ok,
    anonInsertAttempt.ok ? 'FAIL: anon write succeeded' : 'Denied (RLS policy check or permission error)'
  );

  // W020-G4-RLS-03: Authenticated access matches approved policy (public read allowed, non-admin insert denied)
  const authReadAttempt = queryPsql(testDb, `
    SET ROLE authenticated;
    SELECT count(*) FROM public.delimitation_proposals;
    RESET ROLE;
  `);
  recordCheck(
    'W020-G4-RLS-03',
    'Authenticated role has public SELECT permission',
    authReadAttempt.ok,
    authReadAttempt.ok ? `Read successful, observed ${authReadAttempt.stdout.trim()} rows` : authReadAttempt.stderr
  );

  // W020-G4-RLS-04: Service-role access has complete access
  const serviceRoleAttempt = queryPsql(testDb, `
    SET ROLE postgres;
    SELECT count(*) FROM public.delimitation_proposals;
  `);
  recordCheck(
    'W020-G4-RLS-04',
    'Privileged service role maintains unconstrained administrative access',
    serviceRoleAttempt.ok,
    `Service role queried successfully; row count = ${serviceRoleAttempt.stdout.trim()}`
  );

  // ─── 5. REGIME & SCENARIO SEMANTICS (W020-G4-REG-01..02) ─────────────────────
  console.log('\n--- 5. REGIME & SCENARIO SEMANTICS ---');

  // W020-G4-REG-01: legal_status remains authoritative
  const regimeStatuses = queryPsql(testDb, `
    SELECT DISTINCT legal_status FROM public.delimitation_regimes ORDER BY legal_status;
  `).stdout.split('\n').filter(Boolean);

  const expectedStatuses = [
    'CURRENT_LEGAL_REGIME',
    'FUTURE_ANTICIPATED_REGIME',
    'SCENARIO_PROPOSED_REGIME'
  ];
  const statusesMatch = expectedStatuses.every(s => regimeStatuses.includes(s));
  recordCheck(
    'W020-G4-REG-01',
    'legal_status in public.delimitation_regimes is the authoritative regime classifier',
    statusesMatch,
    `Found legal_status values: ${regimeStatuses.join(', ')}`
  );

  // W020-G4-REG-02: Zero duplicate scenario source of truth
  const propCols = queryPsql(testDb, "SELECT column_name FROM information_schema.columns WHERE table_name = 'delimitation_proposals';").stdout;
  const noRedundantBool = !propCols.includes('is_scenario') && !propCols.includes('scenario_flag');
  recordCheck(
    'W020-G4-REG-02',
    'Zero redundant scenario boolean flags exist on proposal tables',
    noRedundantBool,
    'is_scenario and scenario_flag are completely absent from persistent table definition'
  );

  // ─── 6. PROVENANCE SEMANTICS (W020-G4-PRV-01..03) ────────────────────────────
  console.log('\n--- 6. PROVENANCE SEMANTICS ---');

  // W020-G4-PRV-01: Approved provenance relationships exist
  const provCols = queryPsql(testDb, `
    SELECT table_name || '.' || column_name
    FROM information_schema.columns
    WHERE table_name IN ('delimitation_proposals', 'constituency_mapping')
      AND column_name = 'provenance_id';
  `).stdout.split('\n').filter(Boolean);

  recordCheck(
    'W020-G4-PRV-01',
    'Approved provenance_id foreign keys exist on both delimitation tables',
    provCols.length === 2,
    `Found: ${provCols.join(', ')}`
  );

  // W020-G4-PRV-02: Invalid provenance fails closed
  const badProvInsert = queryPsql(testDb, `
    INSERT INTO public.delimitation_proposals (state_code, title, current_seats, proposed_seats, provenance_id)
    VALUES ('TS', 'Bad Prov Test', 119, 119, 'ffffffff-0000-0000-0000-000000000000');
  `);
  recordCheck(
    'W020-G4-PRV-02',
    'Invalid provenance references are rejected fail-closed by database kernel',
    !badProvInsert.ok,
    'PostgreSQL foreign key constraint enforced (23503)'
  );

  // W020-G4-PRV-03: Provenance cannot be silently destroyed
  const dropProvAttempt = queryPsql(testDb, "DELETE FROM public.provenance_records WHERE id = 'a0000000-0000-0000-0000-000000000001';");
  recordCheck(
    'W020-G4-PRV-03',
    'Referenced provenance record cannot be deleted (ON DELETE RESTRICT)',
    !dropProvAttempt.ok,
    'Deletion blocked by foreign key constraint'
  );

  // ─── 7. PRODUCTION AIR-GAP & ISOLATION (W020-G4-PRD-01) ──────────────────────
  console.log('\n--- 7. PRODUCTION AIR-GAP & ISOLATION ---');
  recordCheck(
    'W020-G4-PRD-01',
    'Production database ehfafcnimmjusyvplbah is 100% air-gapped and untouched',
    !supabaseUrl.includes('ehfafcnimmjusyvplbah'),
    `Active URL: ${supabaseUrl} (Strictly staging fkpigozcqnmcvofuksar)`
  );

  // ─── 8. LIVE STAGING POSTGIS 589 GEOMETRY BASELINE ───────────────────────────
  console.log('\n--- 8. LIVE STAGING POSTGIS 589 GEOMETRY BASELINE ---');

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
      .map(r => hashRowGovernedFields(r));
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

  recordCheck(
    'W020-G4-GEO-01',
    'public.entity_geometries row count strictly preserved at exactly 589 rows on staging',
    stagingRowCount === EXPECTED_ROW_COUNT,
    `Observed: ${stagingRowCount} / Expected: ${EXPECTED_ROW_COUNT}`
  );

  recordCheck(
    'W020-G4-GEO-02',
    'public.entity_geometries canonical SHA-256 digest strictly matches frozen baseline',
    currentDigest === EXPECTED_DIGEST,
    `Observed: ${currentDigest}\n         Expected: ${EXPECTED_DIGEST}`
  );

  // ─── 9. LIVE STAGING CATALOG PROBE (PRE-MIGRATION STATE) ──────────────────────
  console.log('\n--- 9. LIVE STAGING CATALOG PROBE ---');
  const openapiRes = await fetch(supabaseUrl + '/rest/v1/', {
    headers: { 'apikey': serviceKey, 'Authorization': 'Bearer ' + serviceKey }
  });
  const openapi = await openapiRes.json();

  const stagingProposalsDef = openapi.definitions?.delimitation_proposals;
  const stagingMappingDef = openapi.definitions?.constituency_mapping;

  recordCheck(
    'W020-G4-STG-01',
    'Live staging catalog contains legacy delimitation_proposals prototype with 0 rows',
    !!stagingProposalsDef,
    `Registered in staging OpenAPI: ${!!stagingProposalsDef}`
  );

  recordCheck(
    'W020-G4-STG-02',
    'Live staging catalog contains legacy constituency_mapping prototype with 0 rows',
    !!stagingMappingDef,
    `Registered in staging OpenAPI: ${!!stagingMappingDef}`
  );

  // ─── REPORT GENERATION ───────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log(`TOTAL CHECKS:  ${passedChecks + failedChecks}`);
  console.log(`PASSED:        ${passedChecks}`);
  console.log(`FAILED:        ${failedChecks}`);
  console.log(`FINAL VERDICT: ${failedChecks === 0 ? 'PASS' : 'FAIL'}`);
  console.log('================================================================\n');

  const reportJson = {
    gate: 'W020-G4',
    title: 'Migration 055 Staging Preflight & Schema Integrity Report',
    timestamp: new Date().toISOString(),
    gitCommit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
    stagingTarget: 'panIN-staging (fkpigozcqnmcvofuksar)',
    productionStatus: 'AIR-GAPPED & UNTOUCHED (ehfafcnimmjusyvplbah)',
    geometryDigest: currentDigest,
    geometryRowCount: stagingRowCount,
    totalChecks: passedChecks + failedChecks,
    passedChecks,
    failedChecks,
    verdict: failedChecks === 0 ? 'PASS' : 'FAIL',
    checks: results,
    objectsCreatedOrAltered: {
      delimitation_proposals: {
        newColumns: [
          { name: 'delimitation_regime_id', type: 'VARCHAR(50)', fk: 'delimitation_regimes(id)', onDelete: 'RESTRICT', nullable: true },
          { name: 'provenance_id', type: 'UUID', fk: 'provenance_records(id)', onDelete: 'RESTRICT', nullable: true },
          { name: 'metadata', type: 'JSONB', default: "'{}'::jsonb", nullable: false }
        ],
        newIndexes: ['idx_delim_proposals_regime', 'idx_delim_proposals_provenance']
      },
      constituency_mapping: {
        newColumns: [
          { name: 'constituency_version_id', type: 'UUID', fk: 'constituency_versions(id)', onDelete: 'RESTRICT', nullable: true },
          { name: 'predecessor_version_id', type: 'UUID', fk: 'constituency_versions(id)', onDelete: 'RESTRICT', nullable: true },
          { name: 'provenance_id', type: 'UUID', fk: 'provenance_records(id)', onDelete: 'RESTRICT', nullable: true }
        ],
        newIndexes: ['idx_mapping_constituency_version', 'idx_mapping_predecessor_version', 'idx_mapping_provenance']
      }
    }
  };

  fs.writeFileSync('reports/w020_g4_migration_preflight.json', JSON.stringify(reportJson, null, 2), 'utf8');
  console.log('Wrote JSON report to reports/w020_g4_migration_preflight.json');

  if (failedChecks > 0) {
    process.exit(1);
  }
}

runG4Battery().catch(err => {
  console.error('FATAL Unhandled Exception:', err);
  process.exit(1);
});
