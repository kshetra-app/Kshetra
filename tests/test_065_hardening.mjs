// tests/test_065_hardening.mjs
// Battery testing Migration 065 hardening: Tests A through E

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== REAL POSTGRESQL 065-001 VALIDATION BATTERY ===\n');

const REPO_ROOT = process.cwd();
const MIGRATION_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '065_canonical_political_organization_registry.sql');
const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');

function runPsql(db, sqlOrCommand, isCommand = false) {
  if (isCommand) {
    return execSync(`docker exec -i supabase_db_Kshetra psql -U postgres -d ${db} -v ON_ERROR_STOP=1 -c "${sqlOrCommand}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } else {
    return execSync(`docker exec -i supabase_db_Kshetra psql -U postgres -d ${db} -v ON_ERROR_STOP=1`, { input: sqlOrCommand, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  }
}

try {
  // Step 0: Setup isolated test database
  console.log('--- Step 0: Provisioning isolated database test_065_hardening ---');
  execSync('docker exec -i supabase_db_Kshetra psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS test_065_hardening;"');
  execSync('docker exec -i supabase_db_Kshetra psql -U postgres -d postgres -c "CREATE DATABASE test_065_hardening;"');

  // Base schema
  const setupSql = `
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE TYPE public.data_status_enum AS ENUM ('OFFICIAL', 'PROVISIONAL', 'DEPRECATED');
    CREATE TABLE public.states (code TEXT PRIMARY KEY, name TEXT);
    INSERT INTO public.states (code, name) VALUES ('DL', 'Delhi'), ('TS', 'Telangana'), ('AP', 'Andhra Pradesh'), ('MH', 'Maharashtra'), ('BR', 'Bihar'), ('ML', 'Meghalaya'), ('UP', 'Uttar Pradesh');
    CREATE TABLE public.provenance_records (id UUID PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE public.political_organizations (
      id TEXT PRIMARY KEY,
      org_type TEXT NOT NULL,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      ec_party_code TEXT,
      recognition_level TEXT NOT NULL,
      headquarters_state TEXT,
      data_status public.data_status_enum NOT NULL DEFAULT 'OFFICIAL',
      provenance_id UUID REFERENCES public.provenance_records(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE public.organization_relationships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_org_id TEXT NOT NULL REFERENCES public.political_organizations(id) ON DELETE RESTRICT,
      target_org_id TEXT NOT NULL REFERENCES public.political_organizations(id) ON DELETE RESTRICT,
      relationship_type TEXT NOT NULL,
      valid_from DATE NOT NULL,
      valid_to DATE,
      is_current BOOLEAN NOT NULL DEFAULT true,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      data_status public.data_status_enum NOT NULL DEFAULT 'OFFICIAL',
      provenance_id UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT chk_org_rel_distinct CHECK (source_org_id <> target_org_id),
      CONSTRAINT uq_org_rel_timeline UNIQUE (source_org_id, target_org_id, relationship_type, valid_from)
    );
  `;
  runPsql('test_065_hardening', setupSql);

  // Apply actual 064 migration
  const mig064 = fs.readFileSync(path.join(REPO_ROOT, 'supabase', 'migrations', '064_political_organization_governance_remediation.sql'), 'utf8');
  runPsql('test_065_hardening', mig064);
  console.log('Prerequisite Schema (Base + Migration 064 applied): PASS');

  // -------------------------------------------------------------
  // Test A: Clean Insertion
  // -------------------------------------------------------------
  console.log('\n--- TEST A: Clean Insertion on Empty DB ---');
  runPsql('test_065_hardening', migrationSql);
  const countA = runPsql('test_065_hardening', 'SELECT count(*) FROM public.political_organizations;', true).trim().split('\n')[2].trim();
  const relA = runPsql('test_065_hardening', 'SELECT count(*) FROM public.organization_relationships;', true).trim().split('\n')[2].trim();
  const multiA = runPsql('test_065_hardening', 'SELECT count(*) FROM public.organization_multilingual_names;', true).trim().split('\n')[2].trim();
  const symA = runPsql('test_065_hardening', 'SELECT count(*) FROM public.organization_symbols;', true).trim().split('\n')[2].trim();
  const aliasA = runPsql('test_065_hardening', 'SELECT count(*) FROM public.organization_aliases;', true).trim().split('\n')[2].trim();
  
  console.log(`Counts inserted: orgs=${countA}, rels=${relA}, multi=${multiA}, syms=${symA}, aliases=${aliasA}`);
  if (countA !== '107' || relA !== '10' || multiA !== '27' || symA !== '19' || aliasA !== '1043') {
    throw new Error(`Test A FAIL: Unexpected row counts!`);
  }
  console.log('Test A PASS: Exactly 107 orgs, 10 rels, 27 multi, 19 syms, 1043 aliases inserted cleanly.');

  // -------------------------------------------------------------
  // Test B: Exact Duplicate / Idempotency
  // -------------------------------------------------------------
  console.log('\n--- TEST B: Exact Duplicate Idempotency (Second Execution) ---');
  runPsql('test_065_hardening', migrationSql);
  const countB = runPsql('test_065_hardening', 'SELECT count(*) FROM public.political_organizations;', true).trim().split('\n')[2].trim();
  const relB = runPsql('test_065_hardening', 'SELECT count(*) FROM public.organization_relationships;', true).trim().split('\n')[2].trim();
  const multiB = runPsql('test_065_hardening', 'SELECT count(*) FROM public.organization_multilingual_names;', true).trim().split('\n')[2].trim();
  const symB = runPsql('test_065_hardening', 'SELECT count(*) FROM public.organization_symbols;', true).trim().split('\n')[2].trim();
  const aliasB = runPsql('test_065_hardening', 'SELECT count(*) FROM public.organization_aliases;', true).trim().split('\n')[2].trim();

  if (countA === countB && relA === relB && multiA === multiB && symA === symB && aliasA === aliasB) {
    console.log(`Test B PASS: Counts identical after repeat run (${countB} orgs, ${aliasB} aliases). Zero duplicate insertions.`);
  } else {
    throw new Error(`Test B FAIL: Counts changed on repeat run!`);
  }

  // -------------------------------------------------------------
  // Test C: Conflicting Identity Attribute Rejection
  // -------------------------------------------------------------
  console.log('\n--- TEST C: Conflicting Identity Attribute Rejection ---');
  runPsql('test_065_hardening', "UPDATE public.political_organizations SET name = 'Bharatiya Jan Sangh Historic' WHERE id = 'ORG-PARTY-BJP';", true);

  let testCPassed = false;
  try {
    runPsql('test_065_hardening', migrationSql);
  } catch (err) {
    const output = (err.stderr ? err.stderr.toString() : '') + (err.stdout ? err.stdout.toString() : '') + err.message;
    if (output.includes('CANONICAL_IDENTITY_CONFLICT')) {
      testCPassed = true;
      const matchLine = output.split('\n').find(l => l.includes('CANONICAL_IDENTITY_CONFLICT'));
      console.log('Test C PASS: Explicitly aborted transaction with exception:');
      console.log('  ' + (matchLine ? matchLine.trim() : 'CANONICAL_IDENTITY_CONFLICT detected'));
    } else {
      console.error('Test C Failed with unexpected error:', output);
    }
  }

  if (!testCPassed) {
    throw new Error('Test C FAIL: Migration did not fail closed on conflicting canonical identity!');
  }

  // Verify that rollback occurred and BJP's database record remained at 'Bharatiya Jan Sangh Historic'
  const bjpName = runPsql('test_065_hardening', "SELECT name FROM public.political_organizations WHERE id = 'ORG-PARTY-BJP';", true).trim().split('\n')[2].trim();
  if (bjpName !== 'Bharatiya Jan Sangh Historic') {
    throw new Error(`Test C FAIL: Transaction did not roll back! Name is ${bjpName}`);
  }
  console.log('Test C Verification: Transaction rolled back cleanly without altering database state.');

  // Restore BJP's name
  runPsql('test_065_hardening', "UPDATE public.political_organizations SET name = 'Bharatiya Janata Party' WHERE id = 'ORG-PARTY-BJP';", true);

  // -------------------------------------------------------------
  // Test D: Dual Execution Idempotency
  // -------------------------------------------------------------
  console.log('\n--- TEST D: Dual Execution Idempotency ---');
  runPsql('test_065_hardening', migrationSql);
  runPsql('test_065_hardening', migrationSql);
  const countD = runPsql('test_065_hardening', 'SELECT count(*) FROM public.political_organizations;', true).trim().split('\n')[2].trim();
  const aliasD = runPsql('test_065_hardening', 'SELECT count(*) FROM public.organization_aliases;', true).trim().split('\n')[2].trim();
  if (countD === '107' && aliasD === '1043') {
    console.log(`Test D PASS: Counts perfectly preserved across dual subsequent executions (${countD} orgs, ${aliasD} aliases).`);
  } else {
    throw new Error(`Test D FAIL: Counts altered after dual execution!`);
  }

  // -------------------------------------------------------------
  // Test E: Unrelated Existing Organization Preservation
  // -------------------------------------------------------------
  console.log('\n--- TEST E: Unrelated Existing Organization Preservation ---');
  runPsql('test_065_hardening', "INSERT INTO public.political_organizations (id, org_type, name, short_name, recognition_level, headquarters_state, data_status) VALUES ('ORG-PARTY-CUSTOM-TEST', 'political_party', 'Custom Unrelated Party', 'CUP', 'state', 'DL', 'OFFICIAL');", true);

  // Re-run migration
  runPsql('test_065_hardening', migrationSql);

  const customParty = runPsql('test_065_hardening', "SELECT name FROM public.political_organizations WHERE id = 'ORG-PARTY-CUSTOM-TEST';", true).trim().split('\n')[2].trim();
  const totalOrgsE = runPsql('test_065_hardening', 'SELECT count(*) FROM public.political_organizations;', true).trim().split('\n')[2].trim();

  if (customParty === 'Custom Unrelated Party' && totalOrgsE === '108') {
    console.log('Test E PASS: Unrelated organization preserved completely (108 total orgs). Zero deletions or mutations.');
  } else {
    throw new Error('Test E FAIL: Unrelated organization altered or missing!');
  }

  console.log('\n=============================================================');
  console.log('ALL TESTS A THROUGH E PASSED WITH ZERO CANONICAL MUTATIONS');
  console.log('=============================================================\n');

} catch (err) {
  console.error('\nFATAL ERROR in Test Battery:', err.message);
  process.exit(1);
}
