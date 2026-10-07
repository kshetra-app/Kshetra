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

  // Base schema mirroring Migration 039 Data Governance Foundation
  const setupSql = `
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE TYPE public.data_status_enum AS ENUM ('OFFICIAL', 'PROVISIONAL', 'UNVERIFIED', 'DEPRECATED', 'UNKNOWN');
    CREATE TYPE public.source_authority_enum AS ENUM ('constitutional', 'statutory', 'academic', 'media_ngo', 'crowdsourced', 'synthetic_model');

    CREATE TABLE public.states (code TEXT PRIMARY KEY, name TEXT);
    INSERT INTO public.states (code, name) VALUES ('DL', 'Delhi'), ('TS', 'Telangana'), ('AP', 'Andhra Pradesh'), ('MH', 'Maharashtra'), ('BR', 'Bihar'), ('ML', 'Meghalaya'), ('UP', 'Uttar Pradesh');

    CREATE TABLE public.data_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      publisher TEXT NOT NULL,
      authority_level public.source_authority_enum NOT NULL,
      canonical_url TEXT,
      license TEXT,
      retrieval_method TEXT,
      refresh_frequency TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    INSERT INTO public.data_sources (id, name, publisher, authority_level, canonical_url, license, retrieval_method, refresh_frequency, is_active)
    VALUES ('eci', 'Election Commission of India', 'Election Commission of India', 'constitutional', 'https://results.eci.gov.in', 'Government Open Data', 'automated_polling', 'event_driven', true)
    ON CONFLICT (id) DO NOTHING;

    CREATE TABLE public.datasets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT NOT NULL CHECK (domain IN (
        'geography', 'election', 'political_profiles', 'civic_governance', 'news', 'demographics', 'election_projection', 'other'
      )),
      description TEXT,
      source_id TEXT NOT NULL REFERENCES public.data_sources(id) ON DELETE RESTRICT,
      license TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE public.evidence_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dataset_version_id TEXT,
      artifact_name TEXT NOT NULL,
      artifact_sha256 TEXT NOT NULL,
      verification_authority TEXT NOT NULL,
      verified_by TEXT NOT NULL,
      verification_notes TEXT,
      verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE public.dataset_versions (
      id TEXT PRIMARY KEY,
      dataset_id TEXT NOT NULL REFERENCES public.datasets(id) ON DELETE RESTRICT,
      version_tag TEXT NOT NULL,
      effective_from DATE,
      effective_to DATE,
      retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      record_count INTEGER NOT NULL DEFAULT 0,
      checksum_sha256 TEXT,
      storage_path TEXT,
      default_status public.data_status_enum NOT NULL DEFAULT 'UNKNOWN',
      verification_evidence_id UUID REFERENCES public.evidence_records(id) ON DELETE RESTRICT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(dataset_id, version_tag)
    );

    CREATE TABLE public.provenance_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
      source_record_id TEXT,
      parent_provenance_id UUID REFERENCES public.provenance_records(id) ON DELETE RESTRICT,
      status public.data_status_enum NOT NULL DEFAULT 'UNKNOWN',
      transformation_type TEXT NOT NULL DEFAULT 'raw_ingest',
      transform_version TEXT,
      operator TEXT NOT NULL DEFAULT 'system',
      verified_by TEXT,
      verification_evidence_id UUID REFERENCES public.evidence_records(id) ON DELETE RESTRICT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

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

  // -------------------------------------------------------------
  // Test F: Post-065 Consolidated Gate Execution
  // -------------------------------------------------------------
  console.log('\n--- TEST F: Post-065 Consolidated Gate Execution ---');
  const gateSql = fs.readFileSync(path.join(REPO_ROOT, 'supabase', 'staging_checkpoints', 'w021_5_post_065_consolidated_gate.sql'), 'utf8');
  const gateRawOutput = runPsql('test_065_hardening', gateSql);
  console.log('Post-065 Consolidated Gate Output:');
  console.log(gateRawOutput);

  // Assert all 10 checks pass
  const gateLines = gateRawOutput.split('\n');
  const checkRows = gateLines.filter(l => /^\s*check_\d+/.test(l.trim()));
  if (checkRows.length !== 10) {
    throw new Error(`Test F FAIL: Expected exactly 10 gate check rows, got ${checkRows.length}`);
  }
  const failedRows = checkRows.filter(l => !l.includes('PASS'));
  if (failedRows.length > 0) {
    throw new Error(`Test F FAIL: Gate checks failed: ${failedRows.join('; ')}`);
  }
  if (!gateRawOutput.includes('POST_065_PASS')) {
    throw new Error('Test F FAIL: Gate aggregate did not return POST_065_PASS');
  }
  console.log('Test F PASS: Post-065 consolidated gate returned exactly 10 rows, all PASS, aggregate POST_065_PASS.');

  // -------------------------------------------------------------
  // Test G: Dataset Identity Conflict (Fail-Closed)
  // -------------------------------------------------------------
  console.log('\n--- TEST G: Dataset Identity Conflict (Fail-Closed) ---');
  // Mutate dataset attribute in test database
  runPsql('test_065_hardening', "UPDATE public.datasets SET name = 'Conflicting ECI Dataset Name' WHERE id = 'eci_political_parties';", true);

  let testGPassed = false;
  try {
    runPsql('test_065_hardening', migrationSql);
  } catch (err) {
    const output = (err.stderr ? err.stderr.toString() : '') + (err.stdout ? err.stdout.toString() : '') + err.message;
    if (output.includes('CANONICAL_DATASET_IDENTITY_CONFLICT')) {
      testGPassed = true;
      const matchLine = output.split('\n').find(l => l.includes('CANONICAL_DATASET_IDENTITY_CONFLICT'));
      console.log('Test G PASS: Explicitly aborted transaction with exception:');
      console.log('  ' + (matchLine ? matchLine.trim() : 'CANONICAL_DATASET_IDENTITY_CONFLICT detected'));
    } else {
      console.error('Test G Failed with unexpected error:', output);
    }
  }

  if (!testGPassed) {
    throw new Error('Test G FAIL: Migration did not fail closed on conflicting dataset identity!');
  }

  // Verify rollback and attribute preserved
  const dsNameG = runPsql('test_065_hardening', "SELECT name FROM public.datasets WHERE id = 'eci_political_parties';", true).trim().split('\n')[2].trim();
  if (dsNameG !== 'Conflicting ECI Dataset Name') {
    throw new Error(`Test G FAIL: Transaction did not roll back! Dataset name is ${dsNameG}`);
  }
  console.log('Test G Verification: Dataset name was preserved, transaction cleanly rolled back.');

  // Restore canonical dataset name
  runPsql('test_065_hardening', "UPDATE public.datasets SET name = 'ECI Registered Political Parties & Recognized State/National Formations' WHERE id = 'eci_political_parties';", true);

  // -------------------------------------------------------------
  // Test H: Dataset Version Identity Conflict (Fail-Closed)
  // -------------------------------------------------------------
  console.log('\n--- TEST H: Dataset Version Identity Conflict (Fail-Closed) ---');
  // Mutate dataset_version attribute in test database
  runPsql('test_065_hardening', "UPDATE public.dataset_versions SET version_tag = '2024_conflicting_version_tag' WHERE id = 'eci_political_parties_2024_v1';", true);

  let testHPassed = false;
  try {
    runPsql('test_065_hardening', migrationSql);
  } catch (err) {
    const output = (err.stderr ? err.stderr.toString() : '') + (err.stdout ? err.stdout.toString() : '') + err.message;
    if (output.includes('CANONICAL_DATASET_VERSION_CONFLICT')) {
      testHPassed = true;
      const matchLine = output.split('\n').find(l => l.includes('CANONICAL_DATASET_VERSION_CONFLICT'));
      console.log('Test H PASS: Explicitly aborted transaction with exception:');
      console.log('  ' + (matchLine ? matchLine.trim() : 'CANONICAL_DATASET_VERSION_CONFLICT detected'));
    } else {
      console.error('Test H Failed with unexpected error:', output);
    }
  }

  if (!testHPassed) {
    throw new Error('Test H FAIL: Migration did not fail closed on conflicting dataset version!');
  }

  // Verify rollback and attribute preserved
  const verTagH = runPsql('test_065_hardening', "SELECT version_tag FROM public.dataset_versions WHERE id = 'eci_political_parties_2024_v1';", true).trim().split('\n')[2].trim();
  if (verTagH !== '2024_conflicting_version_tag') {
    throw new Error(`Test H FAIL: Transaction did not roll back! Version tag is ${verTagH}`);
  }
  console.log('Test H Verification: Dataset version tag was preserved, transaction cleanly rolled back.');

  // Restore canonical dataset version tag
  runPsql('test_065_hardening', "UPDATE public.dataset_versions SET version_tag = '2024_national_parties_107' WHERE id = 'eci_political_parties_2024_v1';", true);

  // -------------------------------------------------------------
  // Test I: Exact Dataset/Version Idempotency (Zero Duplicates / Zero Mutations)
  // -------------------------------------------------------------
  console.log('\n--- TEST I: Exact Dataset/Version Idempotency ---');
  const dsCountBefore = runPsql('test_065_hardening', "SELECT count(*) FROM public.datasets WHERE id = 'eci_political_parties';", true).trim().split('\n')[2].trim();
  const verCountBefore = runPsql('test_065_hardening', "SELECT count(*) FROM public.dataset_versions WHERE id = 'eci_political_parties_2024_v1';", true).trim().split('\n')[2].trim();

  runPsql('test_065_hardening', migrationSql);

  const dsCountAfter = runPsql('test_065_hardening', "SELECT count(*) FROM public.datasets WHERE id = 'eci_political_parties';", true).trim().split('\n')[2].trim();
  const verCountAfter = runPsql('test_065_hardening', "SELECT count(*) FROM public.dataset_versions WHERE id = 'eci_political_parties_2024_v1';", true).trim().split('\n')[2].trim();

  if (dsCountBefore === '1' && dsCountAfter === '1' && verCountBefore === '1' && verCountAfter === '1') {
    console.log('Test I PASS: Dataset and version count remain exactly 1. Zero duplicate rows or mutations.');
  } else {
    throw new Error(`Test I FAIL: Counts changed: ds=${dsCountAfter}, ver=${verCountAfter}`);
  }

  // -------------------------------------------------------------
  // Test J: Provenance FK Enforcement
  // -------------------------------------------------------------
  console.log('\n--- TEST J: Provenance FK Enforcement ---');
  // Attempt to insert a provenance record referencing a non-existent dataset version
  let testJPassed = false;
  try {
    runPsql('test_065_hardening', `
      INSERT INTO public.provenance_records (
        id, dataset_version_id, status, transformation_type, operator, created_at
      ) VALUES (
        gen_random_uuid(), 'non_existent_dataset_version_xyz', 'OFFICIAL', 'canonical_ingest', 'test', now()
      );
    `);
  } catch (err) {
    const output = (err.stderr ? err.stderr.toString() : '') + (err.stdout ? err.stdout.toString() : '') + err.message;
    if (output.includes('violates foreign key constraint') || output.includes('23503')) {
      testJPassed = true;
      console.log('Test J PASS: Inserting provenance record with non-existent dataset_version_id fails closed (FK violation 23503).');
    }
  }

  if (!testJPassed) {
    throw new Error('Test J FAIL: Provenance FK constraint did not reject missing dataset version!');
  }

  // -------------------------------------------------------------
  // Test K: C0 Full Transaction Rollback
  // -------------------------------------------------------------
  console.log('\n--- TEST K: C0 Full Transaction Rollback Safety ---');
  // Create a brand new clean database test_065_rollback
  execSync('docker exec -i supabase_db_Kshetra psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS test_065_rollback;"');
  execSync('docker exec -i supabase_db_Kshetra psql -U postgres -d postgres -c "CREATE DATABASE test_065_rollback;"');
  runPsql('test_065_rollback', setupSql);
  runPsql('test_065_rollback', mig064);

  // In test_065_rollback, inject an intentional error immediately after C0.3
  const failAfterC0Sql = migrationSql.replace(
    `'0215b22c-0000-0000-0000-000000000001'::uuid,\n  'eci_political_parties_2024_v1',`,
    `'0215b22c-0000-0000-0000-000000000001'::uuid,\n  'eci_political_parties_2024_v1',`
  ).replace(
    `ON CONFLICT (id) DO NOTHING;\n\n-- ─── PRE-EXECUTION IDENTITY CONFLICT ASSERTION`,
    `ON CONFLICT (id) DO NOTHING;\n\nRAISE EXCEPTION 'CONTROLLED_POST_C0_FAILURE';\n\n-- ─── PRE-EXECUTION IDENTITY CONFLICT ASSERTION`
  );

  let testKPassed = false;
  try {
    runPsql('test_065_rollback', failAfterC0Sql);
  } catch (err) {
    const output = (err.stderr ? err.stderr.toString() : '') + (err.stdout ? err.stdout.toString() : '') + err.message;
    if (output.includes('CONTROLLED_POST_C0_FAILURE')) {
      testKPassed = true;
      console.log('Test K: Controlled exception triggered: CONTROLLED_POST_C0_FAILURE');
    }
  }

  if (!testKPassed) {
    throw new Error('Test K FAIL: Controlled exception did not trigger!');
  }

  // Verify all C0 objects rolled back completely
  const dsK = runPsql('test_065_rollback', "SELECT count(*) FROM public.datasets WHERE id = 'eci_political_parties';", true).trim().split('\n')[2].trim();
  const verK = runPsql('test_065_rollback', "SELECT count(*) FROM public.dataset_versions WHERE id = 'eci_political_parties_2024_v1';", true).trim().split('\n')[2].trim();
  const provK = runPsql('test_065_rollback', "SELECT count(*) FROM public.provenance_records WHERE id = '0215b22c-0000-0000-0000-000000000001'::uuid;", true).trim().split('\n')[2].trim();
  const orgK = runPsql('test_065_rollback', "SELECT count(*) FROM public.political_organizations;", true).trim().split('\n')[2].trim();

  if (dsK === '0' && verK === '0' && provK === '0' && orgK === '0') {
    console.log('Test K PASS: Full transaction rollback verified. Zero orphaned C0 rows in datasets, dataset_versions, provenance_records, or political_organizations.');
  } else {
    throw new Error(`Test K FAIL: Orphaned rows remained after rollback: ds=${dsK}, ver=${verK}, prov=${provK}, org=${orgK}`);
  }

  console.log('\n=============================================================');
  console.log('ALL TESTS A THROUGH K PASSED WITH ZERO CANONICAL MUTATIONS');
  console.log('=============================================================\n');

} catch (err) {
  console.error('\nFATAL ERROR in Test Battery:', err.message);
  process.exit(1);
}
