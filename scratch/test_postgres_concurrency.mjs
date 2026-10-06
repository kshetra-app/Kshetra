import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const DB_NAME = 'test_concurrency_064_r8';

function execSql(sql, db = DB_NAME) {
  try {
    return execSync(`docker exec -i supabase_db_Kshetra psql -v ON_ERROR_STOP=1 -U postgres -d ${db}`, { input: sql, encoding: 'utf8' });
  } catch (err) {
    const msg = (err.message || '') + '\n' + (err.stderr ? err.stderr.toString() : '') + '\n' + (err.stdout ? err.stdout.toString() : '');
    const e = new Error(msg);
    e.code = err.status || err.code;
    throw e;
  }
}

function runSession(script, db = DB_NAME) {
  return new Promise((resolve) => {
    const p = spawn('docker', ['exec', '-i', 'supabase_db_Kshetra', 'psql', '-U', 'postgres', '-d', db]);
    let out = '', err = '';
    p.stdout.on('data', d => out += d.toString());
    p.stderr.on('data', d => err += d.toString());
    p.on('close', code => resolve({ code, out, err }));
    p.stdin.write(script);
    p.stdin.end();
  });
}

// Helper to format session outcome string
function formatSessionResult(r) {
  if (r.code === 0 && !r.err.includes('ERROR:')) return 'COMMIT (exit 0)';
  if (r.err.includes('TEMPORAL_INVARIANT_VIOLATION')) return 'REJECTED (TEMPORAL_INVARIANT_VIOLATION)';
  return `ERROR (code ${r.code}: ${r.err.trim()})`;
}

// Specific assertion helper for Collision Scenarios: exactly 1 commit, 1 temporal rejection, 0 unexpected
function assertCollisionScenario({ r1, r2, scenarioName, expectedErrorSubstr = 'TEMPORAL_INVARIANT_VIOLATION' }) {
  const results = [
    { session: 'A', ...r1 },
    { session: 'B', ...r2 }
  ];

  const commits = results.filter(r => r.code === 0 && !r.err.includes('ERROR:'));
  const rejections = results.filter(r => r.err.includes('ERROR:') && r.err.includes(expectedErrorSubstr));
  const unexpected = results.filter(r => r.code !== 0 && !r.err.includes(expectedErrorSubstr));

  console.log(`  Scenario: ${scenarioName}`);
  console.log(`  Expected outcome: exactly 1 commit, exactly 1 ${expectedErrorSubstr}, 0 unexpected errors`);
  console.log(`  Session A outcome: ${formatSessionResult(r1)}`);
  console.log(`  Session B outcome: ${formatSessionResult(r2)}`);
  console.log(`  Unexpected error count: ${unexpected.length}`);

  assert.strictEqual(
    unexpected.length,
    0,
    `${scenarioName}: Unexpected session errors occurred: ${JSON.stringify(unexpected)}`
  );
  assert.strictEqual(
    commits.length,
    1,
    `${scenarioName}: Exactly ONE session must successfully commit. Actual commits: ${commits.length}`
  );
  assert.strictEqual(
    rejections.length,
    1,
    `${scenarioName}: Exactly ONE session must be rejected with ${expectedErrorSubstr}. Actual rejections: ${rejections.length}`
  );
}

// Specific assertion helper for Isolation Scenarios: exactly 2 commits, 0 rejections, 0 unexpected
function assertIsolationScenario({ r1, r2, scenarioName }) {
  const results = [
    { session: 'A', ...r1 },
    { session: 'B', ...r2 }
  ];

  const commits = results.filter(r => r.code === 0 && !r.err.includes('ERROR:'));
  const rejections = results.filter(r => r.err.includes('ERROR:'));
  const unexpected = results.filter(r => r.code !== 0);

  console.log(`  Scenario: ${scenarioName}`);
  console.log(`  Expected outcome: exactly 2 commits, 0 rejections, 0 unexpected errors`);
  console.log(`  Session A outcome: ${formatSessionResult(r1)}`);
  console.log(`  Session B outcome: ${formatSessionResult(r2)}`);
  console.log(`  Unexpected error count: ${unexpected.length}`);

  assert.strictEqual(unexpected.length, 0, `${scenarioName}: Unexpected session errors: ${JSON.stringify(unexpected)}`);
  assert.strictEqual(commits.length, 2, `${scenarioName}: Both sessions must commit. Actual commits: ${commits.length}`);
  assert.strictEqual(rejections.length, 0, `${scenarioName}: Zero rejections expected. Actual rejections: ${rejections.length}`);
}

async function main() {
  console.log('=== REAL POSTGRESQL TWO-SESSION CONCURRENCY INTEGRATION TEST SUITE (MIGRATION 064-R8 ACTUAL OBJECTS) ===\n');

  console.log('1. Setting up isolated disposable test database: ' + DB_NAME);
  execSync(`docker exec -i supabase_db_Kshetra psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"`);
  execSync(`docker exec -i supabase_db_Kshetra psql -U postgres -d postgres -c "CREATE DATABASE ${DB_NAME};"`);

  try {
    console.log('2. Applying schema prerequisites into ' + DB_NAME);
    const prereqSql = `
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
      CREATE TYPE public.data_status_enum AS ENUM ('OFFICIAL', 'PROVISIONAL', 'DEPRECATED');
      CREATE TABLE public.states (code TEXT PRIMARY KEY, name TEXT);
      CREATE TABLE public.provenance_records (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now());
      CREATE TABLE public.political_organizations (
        id TEXT PRIMARY KEY,
        name TEXT,
        short_name TEXT,
        ec_party_code TEXT,
        recognition_level TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE public.organization_relationships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        relationship_type TEXT
      );
    `;
    execSql(prereqSql);

    console.log('3. Executing Migration 064-R8 SQL into ' + DB_NAME);
    const migSql = fs.readFileSync('supabase/migrations/064_political_organization_governance_remediation.sql', 'utf8');
    execSql(migSql);

    console.log('4. Seeding prerequisite referential records');
    const seedSql = `
      INSERT INTO public.provenance_records (id) VALUES
        ('00000000-0000-0000-0000-000000000001'),
        ('00000000-0000-0000-0000-000000000002');
      INSERT INTO public.states (code, name) VALUES
        ('TG', 'Telangana'),
        ('AP', 'Andhra Pradesh'),
        ('MH', 'Maharashtra'),
        ('UP', 'Uttar Pradesh'),
        ('MP', 'Madhya Pradesh');
      INSERT INTO public.political_organizations (id, name, short_name, ec_party_code, recognition_level) VALUES
        ('ORG-PARTY-INC', 'Indian National Congress', 'INC', 'INC', 'national'),
        ('ORG-PARTY-BJP', 'Bharatiya Janata Party', 'BJP', 'BJP', 'national'),
        ('ORG-PARTY-CPIM', 'Communist Party of India (Marxist)', 'CPI(M)', 'CPM', 'national'),
        ('ORG-PARTY-TRS', 'Telangana Rashtra Samithi', 'TRS', 'TRS', 'state'),
        ('ORG-PARTY-BRS', 'Bharat Rashtra Samithi', 'BRS', 'BRS', 'state'),
        ('ORG-PARTY-SHS', 'Shiv Sena', 'SHS', 'SHS', 'state'),
        ('ORG-PARTY-SHSUBT', 'Shiv Sena (Uddhav Balasaheb Thackeray)', 'SHSUBT', 'SSUBT', 'registered_unrecognized'),
        ('ORG-PARTY-BSP', 'Bahujan Samaj Party', 'BSP', 'BSP', 'national'),
        ('ORG-PARTY-TDP', 'Telugu Desam Party', 'TDP', 'TDP', 'state');
    `;
    execSql(seedSql);

    console.log('\n--- VERIFYING SYNTHETIC INDEPENDENT PROHIBITIONS (BLOCKER A) ---');
    const forbiddenInserts = [
      { id: 'ORG-INDEPENDENT', ec: 'IND', reason: 'Exact ID ORG-INDEPENDENT' },
      { id: 'ORG-PARTY-IND', ec: 'IND', reason: 'Exact ID ORG-PARTY-IND' },
      { id: 'ORG-PARTY-INDEPENDENT', ec: 'IND', reason: 'Exact ID ORG-PARTY-INDEPENDENT' },
      { id: 'ORG-PARTY-INDEPENDENTS-FRONT', ec: 'XYZ', reason: 'Pattern id ILIKE %indep%' },
      { id: 'ORG-PARTY-VALID', ec: 'IND', reason: 'Exact ec_party_code IND' },
      { id: 'ORG-PARTY-VALID2', ec: 'IND-IND', reason: 'Exact ec_party_code IND-IND' },
      { id: 'ORG-PARTY-VALID3', ec: 'INDEPENDENT', reason: 'Pattern ec_party_code ILIKE %indep%' }
    ];

    for (const item of forbiddenInserts) {
      let rejected = false;
      try {
        execSql(`INSERT INTO public.political_organizations (id, name, ec_party_code, recognition_level) VALUES ('${item.id}', 'Test Org', '${item.ec}', 'registered_unrecognized');`);
      } catch (err) {
        const fullErr = (err.message || '') + (err.stderr ? err.stderr.toString() : '') + (err.stdout ? err.stdout.toString() : '');
        if (fullErr.includes('chk_prohibit_synthetic_independent') || fullErr.includes('violates check constraint') || fullErr.includes('ERROR:')) {
          rejected = true;
        }
      }
      assert.strictEqual(rejected, true, `Expected rejection for synthetic independent: ${item.reason} (${item.id}, ${item.ec})`);
      console.log(`  Prohibition verified: ${item.reason} -> REJECTED ✅`);
    }

    console.log('\n--- EXECUTING CONCURRENCY SCENARIOS ---');

    // -------------------------------------------------------------------------
    // TEST 1: Concurrent alias INSERT collision (national scope)
    // -------------------------------------------------------------------------
    console.log('\n[1/8 Collision] Scenario 1: Concurrent alias INSERT collision (national scope)...');
    execSql('TRUNCATE public.organization_aliases CASCADE;');
    const a1_s1 = `
      BEGIN;
      INSERT INTO public.organization_aliases (raw_lookup_key, raw_original_string, organization_id, alias_type, jurisdiction_scope, valid_from, valid_to, provenance_id)
      VALUES ('cpi(m)', 'CPI(M)', 'ORG-PARTY-CPIM', 'STANDARD_ABBREVIATION', NULL, '1964-11-07', '2020-01-01', '00000000-0000-0000-0000-000000000001');
      SELECT pg_sleep(0.4);
      COMMIT;
    `;
    const a1_s2 = `
      BEGIN;
      INSERT INTO public.organization_aliases (raw_lookup_key, raw_original_string, organization_id, alias_type, jurisdiction_scope, valid_from, valid_to, provenance_id)
      VALUES ('cpi(m)', 'CPI(M)', 'ORG-PARTY-CPIM', 'STANDARD_ABBREVIATION', NULL, '2010-01-01', '2025-01-01', '00000000-0000-0000-0000-000000000001');
      COMMIT;
    `;
    const [a1_r1, a1_r2] = await Promise.all([runSession(a1_s1), runSession(a1_s2)]);
    assertCollisionScenario({ r1: a1_r1, r2: a1_r2, scenarioName: 'Concurrent alias INSERT collision (national scope)' });
    const a1_cnt = parseInt(execSql('SELECT count(*) FROM public.organization_aliases;').trim().split('\n')[2], 10);
    assert.strictEqual(a1_cnt, 1, 'Final invariant: Exactly 1 row must exist in table, proving no overlapping records committed');
    console.log(`  Final invariant result: PRESERVED (table row count = ${a1_cnt})`);
    console.log('  Result: PASS ✅');

    // -------------------------------------------------------------------------
    // TEST 2: Alias UPDATE within same namespace collision
    // -------------------------------------------------------------------------
    console.log('\n[2/8 Collision] Scenario 2: Alias UPDATE within same namespace collision...');
    execSql('TRUNCATE public.organization_aliases CASCADE;');
    execSql(`
      INSERT INTO public.organization_aliases (id, raw_lookup_key, raw_original_string, organization_id, alias_type, jurisdiction_scope, valid_from, valid_to, provenance_id)
      VALUES 
        ('11111111-1111-1111-1111-111111111111', 'inc', 'INC', 'ORG-PARTY-INC', 'STANDARD_ABBREVIATION', NULL, '1950-01-01', '1980-01-01', '00000000-0000-0000-0000-000000000001'),
        ('22222222-2222-2222-2222-222222222222', 'inc', 'INC', 'ORG-PARTY-INC', 'STANDARD_ABBREVIATION', NULL, '1990-01-01', '2020-01-01', '00000000-0000-0000-0000-000000000001');
    `);
    const a2_s1 = `
      BEGIN;
      UPDATE public.organization_aliases
      SET valid_to = '1985-01-01'
      WHERE id = '11111111-1111-1111-1111-111111111111';
      SELECT pg_sleep(0.4);
      COMMIT;
    `;
    const a2_s2 = `
      BEGIN;
      UPDATE public.organization_aliases
      SET valid_from = '1982-01-01'
      WHERE id = '22222222-2222-2222-2222-222222222222';
      COMMIT;
    `;
    const [a2_r1, a2_r2] = await Promise.all([runSession(a2_s1), runSession(a2_s2)]);
    assertCollisionScenario({ r1: a2_r1, r2: a2_r2, scenarioName: 'Alias UPDATE within same namespace collision' });
    const a2_overlap_cnt = parseInt(execSql(`
      SELECT count(*) FROM public.organization_aliases a
      JOIN public.organization_aliases b ON a.id <> b.id AND a.raw_lookup_key = b.raw_lookup_key
      WHERE a.valid_from <= COALESCE(b.valid_to, '9999-12-31'::date)
        AND COALESCE(a.valid_to, '9999-12-31'::date) >= b.valid_from;
    `).trim().split('\n')[2], 10);
    assert.strictEqual(a2_overlap_cnt, 0, 'Final invariant: zero overlapping records in table');
    console.log(`  Final invariant result: PRESERVED (overlapping records = ${a2_overlap_cnt})`);
    console.log('  Result: PASS ✅');

    // -------------------------------------------------------------------------
    // TEST 3: Alias OLD -> NEW namespace move with deterministic lock ordering
    // -------------------------------------------------------------------------
    console.log('\n[3/8 Collision] Scenario 3: Alias OLD -> NEW namespace collision (deterministic lock ordering)...');
    execSql('TRUNCATE public.organization_aliases CASCADE;');
    execSql(`
      INSERT INTO public.organization_aliases (id, raw_lookup_key, raw_original_string, organization_id, alias_type, jurisdiction_scope, valid_from, valid_to, provenance_id)
      VALUES 
        ('33333333-3333-3333-3333-333333333333', 'trs', 'TRS', 'ORG-PARTY-TRS', 'STANDARD_ABBREVIATION', 'TG', '2001-04-27', '2022-10-05', '00000000-0000-0000-0000-000000000001'),
        ('44444444-4444-4444-4444-444444444444', 'brs', 'BRS', 'ORG-PARTY-BRS', 'STANDARD_ABBREVIATION', 'TG', '2022-10-05', '2026-01-01', '00000000-0000-0000-0000-000000000001');
    `);
    const a3_s1 = `
      BEGIN;
      UPDATE public.organization_aliases
      SET raw_lookup_key = 'brs'
      WHERE id = '33333333-3333-3333-3333-333333333333';
      SELECT pg_sleep(0.4);
      COMMIT;
    `;
    const a3_s2 = `
      BEGIN;
      INSERT INTO public.organization_aliases (raw_lookup_key, raw_original_string, organization_id, alias_type, jurisdiction_scope, valid_from, valid_to, provenance_id)
      VALUES ('brs', 'BRS', 'ORG-PARTY-BRS', 'STANDARD_ABBREVIATION', 'TG', '2020-01-01', '2022-01-01', '00000000-0000-0000-0000-000000000001');
      COMMIT;
    `;
    const [a3_r1, a3_r2] = await Promise.all([runSession(a3_s1), runSession(a3_s2)]);
    assertCollisionScenario({ r1: a3_r1, r2: a3_r2, scenarioName: 'Alias OLD -> NEW namespace collision' });
    const a3_overlap_cnt = parseInt(execSql(`
      SELECT count(*) FROM public.organization_aliases a
      JOIN public.organization_aliases b ON a.id <> b.id AND a.raw_lookup_key = b.raw_lookup_key
      WHERE a.valid_from <= COALESCE(b.valid_to, '9999-12-31'::date)
        AND COALESCE(a.valid_to, '9999-12-31'::date) >= b.valid_from;
    `).trim().split('\n')[2], 10);
    assert.strictEqual(a3_overlap_cnt, 0, 'Final invariant: zero overlapping records in table');
    console.log(`  Final invariant result: PRESERVED (overlapping records = ${a3_overlap_cnt})`);
    console.log('  Result: PASS ✅');

    // -------------------------------------------------------------------------
    // TEST 4: Concurrent symbol INSERT collision (national scope)
    // -------------------------------------------------------------------------
    console.log('\n[4/8 Collision] Scenario 4: Concurrent symbol INSERT collision (national scope)...');
    execSql('TRUNCATE public.organization_symbols CASCADE;');
    const s4_s1 = `
      BEGIN;
      INSERT INTO public.organization_symbols (organization_id, symbol_name, jurisdiction_scope, valid_from, valid_to, is_current, provenance_id)
      VALUES ('ORG-PARTY-BJP', 'Lotus', NULL, '1980-04-06', '2024-01-01', false, '00000000-0000-0000-0000-000000000001');
      SELECT pg_sleep(0.4);
      COMMIT;
    `;
    const s4_s2 = `
      BEGIN;
      INSERT INTO public.organization_symbols (organization_id, symbol_name, jurisdiction_scope, valid_from, valid_to, is_current, provenance_id)
      VALUES ('ORG-PARTY-BJP', 'Lotus', NULL, '2000-01-01', '2026-01-01', false, '00000000-0000-0000-0000-000000000001');
      COMMIT;
    `;
    const [s4_r1, s4_r2] = await Promise.all([runSession(s4_s1), runSession(s4_s2)]);
    assertCollisionScenario({ r1: s4_r1, r2: s4_r2, scenarioName: 'Concurrent symbol INSERT collision (national scope)' });
    const s4_cnt = parseInt(execSql("SELECT count(*) FROM public.organization_symbols WHERE organization_id = 'ORG-PARTY-BJP';").trim().split('\n')[2], 10);
    assert.strictEqual(s4_cnt, 1, 'Final invariant: Exactly 1 symbol row committed');
    console.log(`  Final invariant result: PRESERVED (table row count = ${s4_cnt})`);
    console.log('  Result: PASS ✅');

    // -------------------------------------------------------------------------
    // TEST 5: Symbol current-exclusivity race (national scope)
    // -------------------------------------------------------------------------
    console.log('\n[5/8 Collision] Scenario 5: Symbol current-exclusivity race (national scope)...');
    execSql('TRUNCATE public.organization_symbols CASCADE;');
    const s5_s1 = `
      BEGIN;
      INSERT INTO public.organization_symbols (organization_id, symbol_name, jurisdiction_scope, valid_from, valid_to, is_current, provenance_id)
      VALUES ('ORG-PARTY-INC', 'Hand', NULL, '1978-01-01', NULL, true, '00000000-0000-0000-0000-000000000001');
      SELECT pg_sleep(0.4);
      COMMIT;
    `;
    const s5_s2 = `
      BEGIN;
      INSERT INTO public.organization_symbols (organization_id, symbol_name, jurisdiction_scope, valid_from, valid_to, is_current, provenance_id)
      VALUES ('ORG-PARTY-INC', 'Two Bullocks with Yoke', NULL, '1952-01-01', NULL, true, '00000000-0000-0000-0000-000000000001');
      COMMIT;
    `;
    const [s5_r1, s5_r2] = await Promise.all([runSession(s5_s1), runSession(s5_s2)]);
    assertCollisionScenario({ r1: s5_r1, r2: s5_r2, scenarioName: 'Symbol current-exclusivity race (national scope)' });
    const s5_cnt = parseInt(execSql("SELECT count(*) FROM public.organization_symbols WHERE organization_id = 'ORG-PARTY-INC' AND is_current = true;").trim().split('\n')[2], 10);
    assert.strictEqual(s5_cnt, 1, 'Final invariant: Exactly one current symbol row committed');
    console.log(`  Final invariant result: PRESERVED (active current symbols = ${s5_cnt})`);
    console.log('  Result: PASS ✅');

    // -------------------------------------------------------------------------
    // TEST 6: Symbol concurrent UPDATE and organization move collision
    // -------------------------------------------------------------------------
    console.log('\n[6/8 Collision] Scenario 6: Symbol concurrent UPDATE + organization move collision...');
    execSql('TRUNCATE public.organization_symbols CASCADE;');
    execSql(`
      INSERT INTO public.organization_symbols (id, organization_id, symbol_name, jurisdiction_scope, valid_from, valid_to, is_current, provenance_id)
      VALUES 
        ('55555555-5555-5555-5555-555555555555', 'ORG-PARTY-SHS', 'Bow and Arrow', 'MH', '1989-01-01', NULL, true, '00000000-0000-0000-0000-000000000001'),
        ('66666666-6666-6666-6666-666666666666', 'ORG-PARTY-SHSUBT', 'Flaming Torch', 'MH', '2022-10-10', NULL, false, '00000000-0000-0000-0000-000000000001');
    `);
    const s6_s1 = `
      BEGIN;
      UPDATE public.organization_symbols
      SET organization_id = 'ORG-PARTY-SHSUBT', is_current = true
      WHERE id = '55555555-5555-5555-5555-555555555555';
      SELECT pg_sleep(0.4);
      COMMIT;
    `;
    const s6_s2 = `
      BEGIN;
      UPDATE public.organization_symbols
      SET is_current = true
      WHERE id = '66666666-6666-6666-6666-666666666666';
      COMMIT;
    `;
    const [s6_r1, s6_r2] = await Promise.all([runSession(s6_s1), runSession(s6_s2)]);
    assertCollisionScenario({ r1: s6_r1, r2: s6_r2, scenarioName: 'Symbol concurrent UPDATE + organization move collision' });
    const s6_shsubt_current = parseInt(execSql("SELECT count(*) FROM public.organization_symbols WHERE organization_id = 'ORG-PARTY-SHSUBT' AND is_current = true;").trim().split('\n')[2], 10);
    assert.strictEqual(s6_shsubt_current, 1, 'Final invariant: Exactly 1 current symbol under ORG-PARTY-SHSUBT');
    console.log(`  Final invariant result: PRESERVED (active current symbols under target org = ${s6_shsubt_current})`);
    console.log('  Result: PASS ✅');

    // -------------------------------------------------------------------------
    // TEST 7: Jurisdictional scope isolation (distinct states do not block each other)
    // -------------------------------------------------------------------------
    console.log('\n[7/8 Isolation] Scenario 7: Jurisdictional scope isolation (distinct states: UP & MP)...');
    execSql('TRUNCATE public.organization_aliases CASCADE;');
    const s7_s1 = `
      BEGIN;
      INSERT INTO public.organization_aliases (raw_lookup_key, raw_original_string, organization_id, alias_type, jurisdiction_scope, valid_from, valid_to, provenance_id)
      VALUES ('bsp', 'BSP', 'ORG-PARTY-BSP', 'STANDARD_ABBREVIATION', 'UP', '1984-04-14', NULL, '00000000-0000-0000-0000-000000000001');
      SELECT pg_sleep(0.3);
      COMMIT;
    `;
    const s7_s2 = `
      BEGIN;
      INSERT INTO public.organization_aliases (raw_lookup_key, raw_original_string, organization_id, alias_type, jurisdiction_scope, valid_from, valid_to, provenance_id)
      VALUES ('bsp', 'BSP', 'ORG-PARTY-BSP', 'STANDARD_ABBREVIATION', 'MP', '1984-04-14', NULL, '00000000-0000-0000-0000-000000000001');
      COMMIT;
    `;
    const [s7_r1, s7_r2] = await Promise.all([runSession(s7_s1), runSession(s7_s2)]);
    assertIsolationScenario({ r1: s7_r1, r2: s7_r2, scenarioName: 'Jurisdictional scope isolation (distinct states)' });
    const s7_cnt = parseInt(execSql("SELECT count(*) FROM public.organization_aliases WHERE raw_lookup_key = 'bsp';").trim().split('\n')[2], 10);
    assert.strictEqual(s7_cnt, 2, 'Final invariant: Both distinct jurisdictional aliases must commit');
    console.log(`  Final invariant result: PRESERVED (distinct jurisdictional rows = ${s7_cnt})`);
    console.log('  Result: PASS ✅');

    // -------------------------------------------------------------------------
    // TEST 8: Jurisdictional scope collision on identical state (AP)
    // -------------------------------------------------------------------------
    console.log('\n[8/8 Collision] Scenario 8: Jurisdictional collision on identical state (AP)...');
    const s8_s1 = `
      BEGIN;
      INSERT INTO public.organization_aliases (raw_lookup_key, raw_original_string, organization_id, alias_type, jurisdiction_scope, valid_from, valid_to, provenance_id)
      VALUES ('tdp', 'TDP', 'ORG-PARTY-TDP', 'STANDARD_ABBREVIATION', 'AP', '1982-03-29', '2024-01-01', '00000000-0000-0000-0000-000000000001');
      SELECT pg_sleep(0.3);
      COMMIT;
    `;
    const s8_s2 = `
      BEGIN;
      INSERT INTO public.organization_aliases (raw_lookup_key, raw_original_string, organization_id, alias_type, jurisdiction_scope, valid_from, valid_to, provenance_id)
      VALUES ('tdp', 'TDP', 'ORG-PARTY-TDP', 'STANDARD_ABBREVIATION', 'AP', '2010-01-01', '2025-01-01', '00000000-0000-0000-0000-000000000001');
      COMMIT;
    `;
    const [s8_r1, s8_r2] = await Promise.all([runSession(s8_s1), runSession(s8_s2)]);
    assertCollisionScenario({ r1: s8_r1, r2: s8_r2, scenarioName: 'Jurisdictional collision on identical state (AP)' });
    const s8_cnt = parseInt(execSql("SELECT count(*) FROM public.organization_aliases WHERE raw_lookup_key = 'tdp' AND jurisdiction_scope = 'AP';").trim().split('\n')[2], 10);
    assert.strictEqual(s8_cnt, 1, 'Final invariant: Exactly 1 row commits on identical jurisdiction scope collision');
    console.log(`  Final invariant result: PRESERVED (table row count for state AP = ${s8_cnt})`);
    console.log('  Result: PASS ✅');

    // -------------------------------------------------------------------------
    // HISTORICAL REUSE TEST: Sequential historical alias reuse across non-overlapping windows
    // -------------------------------------------------------------------------
    console.log('\n[Historical Reuse] Dedicated Historical Alias Reuse Test (Non-overlapping sequential windows)...');
    execSql('TRUNCATE public.organization_aliases CASCADE;');
    console.log('  Step 1: Inserting first historical window (1950-01-01 to 1970-01-01)...');
    const hist_s1 = `
      INSERT INTO public.organization_aliases (raw_lookup_key, raw_original_string, organization_id, alias_type, jurisdiction_scope, valid_from, valid_to, provenance_id)
      VALUES ('inc', 'INC', 'ORG-PARTY-INC', 'STANDARD_ABBREVIATION', NULL, '1950-01-01', '1970-01-01', '00000000-0000-0000-0000-000000000001');
    `;
    execSql(hist_s1);
    console.log('  Window 1 result: COMMIT ✅');

    console.log('  Step 2: Inserting second non-overlapping historical window (1980-01-01 to 2000-01-01)...');
    const hist_s2 = `
      INSERT INTO public.organization_aliases (raw_lookup_key, raw_original_string, organization_id, alias_type, jurisdiction_scope, valid_from, valid_to, provenance_id)
      VALUES ('inc', 'INC', 'ORG-PARTY-INC', 'STANDARD_ABBREVIATION', NULL, '1980-01-01', '2000-01-01', '00000000-0000-0000-0000-000000000001');
    `;
    execSql(hist_s2);
    console.log('  Window 2 result: COMMIT ✅');

    const hist_cnt = parseInt(execSql("SELECT count(*) FROM public.organization_aliases WHERE raw_lookup_key = 'inc';").trim().split('\n')[2], 10);
    assert.strictEqual(hist_cnt, 2, 'Final invariant: Exactly 2 non-overlapping historical windows exist');

    const hist_overlap_cnt = parseInt(execSql(`
      SELECT count(*) FROM public.organization_aliases a
      JOIN public.organization_aliases b ON a.id <> b.id AND a.raw_lookup_key = b.raw_lookup_key
      WHERE a.valid_from <= COALESCE(b.valid_to, '9999-12-31'::date)
        AND COALESCE(a.valid_to, '9999-12-31'::date) >= b.valid_from;
    `).trim().split('\n')[2], 10);
    assert.strictEqual(hist_overlap_cnt, 0, 'Final invariant: zero overlapping records in table');

    console.log(`  Final invariant result: PRESERVED (historical windows count = ${hist_cnt}, overlapping records = ${hist_overlap_cnt})`);
    console.log('  Result: PASS ✅');

    console.log('\n================================================================================');
    console.log('CONCURRENCY TEST SUITE SUMMARY:');
    console.log('  7 collision scenarios: 1 commit + 1 expected rejection (PASS)');
    console.log('  1 isolation scenario: 2 commits + 0 rejection (PASS)');
    console.log('  2 sequential non-overlapping windows: 2 commits + 0 rejection (PASS)');
    console.log('================================================================================\n');

  } finally {
    console.log('5. Dropping disposable test DB: ' + DB_NAME);
    execSync(`docker exec -i supabase_db_Kshetra psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"`);
  }
}

main().catch(err => {
  console.error('Fatal concurrency test error:', err);
  process.exit(1);
});
