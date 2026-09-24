/**
 * scripts/verify_w014_temporal_validity.mjs
 * Static Preflight & Schema Integrity Validation for W014 (including Mandal Temporal Model)
 */

import fs from 'node:fs';

let exitCode = 0;

function check(title, condition, details = '') {
  if (condition) {
    console.log(`[PASS] ${title}`);
  } else {
    console.error(`[FAIL] ${title} - ${details}`);
    exitCode = 1;
  }
}

console.log('=== W014 STATIC PREFLIGHT & INTEGRITY VALIDATOR ===\n');

const migrationFiles = [
  'supabase/migrations/041_geography_versioning_and_temporal_validity.sql',
  'supabase/staging_migration_package_041.sql'
];

for (const file of migrationFiles) {
  if (!fs.existsSync(file)) {
    console.error(`[WARN] File ${file} not yet created`);
    continue;
  }

  const content = fs.readFileSync(file, 'utf8');
  check(`No BOM in ${file}`, !content.startsWith('\uFEFF'));
  check(`Transactional BEGIN/COMMIT in ${file}`, content.includes('BEGIN;') && content.includes('COMMIT;'));
  check(`btree_gist extension enabled in ${file}`, content.includes('CREATE EXTENSION IF NOT EXISTS btree_gist;'));
  check(`Parenthesized daterange expression in exclusion constraints in ${file}`, content.includes('(daterange('));
  check(`Scenario regime is not OFFICIAL in ${file}`, !content.includes("'scenario_delimitation_draft_prop_1', 'OFFICIAL'"));
  check(`AC 109 chronology present in ${file}`, content.includes('Mulug') && content.includes('Warangal'));

  // Mandal Temporal Version Model Checks
  check(`mandal_versions table definition present in ${file}`, content.includes('CREATE TABLE IF NOT EXISTS public.mandal_versions'));
  check(`uq_mandal_versions_id_mandal composite unique key present in ${file}`, content.includes('CONSTRAINT uq_mandal_versions_id_mandal UNIQUE (id, mandal_id)'));
  check(`uq_mandal_versions_no_overlap GiST exclusion present in ${file}`, content.includes('CONSTRAINT uq_mandal_versions_no_overlap EXCLUDE USING gist'));
  check(`chk_mandal_versions_current_invariants present in ${file}`, content.includes('CONSTRAINT chk_mandal_versions_current_invariants CHECK'));
  check(`uq_mandal_versions_single_current unique index present in ${file}`, content.includes('uq_mandal_versions_single_current'));
  check(`mandals.current_version_id column alteration present in ${file}`, content.includes('ADD COLUMN IF NOT EXISTS current_version_id UUID'));
  check(`fk_mandals_current_version_same_anchor composite FK present in ${file}`, content.includes('FOREIGN KEY (current_version_id, id)'));
  check(`trg_guard_mandal_current_version trigger present in ${file}`, content.includes('trg_guard_mandal_current_version'));
  check(`trg_guard_mandal_version_retirement trigger present in ${file}`, content.includes('trg_guard_mandal_version_retirement'));
  check(`panin_boundary_definer role creation present in ${file}`, content.includes('CREATE ROLE panin_boundary_definer WITH NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE'));
  check(`Exact 5-param signature fn_transition_mandal_current_version present in ${file}`, content.includes('fn_transition_mandal_current_version(') && content.includes('p_effective_date DATE'));
  check(`Definer column-level UPDATE grants on mandals present in ${file}`, content.includes('GRANT SELECT, UPDATE (current_version_id, updated_at) ON TABLE public.mandals TO panin_boundary_definer;'));
  check(`Definer column-level UPDATE grants on mandal_versions present in ${file}`, content.includes('GRANT SELECT, UPDATE (is_current, valid_from, valid_to, updated_at) ON TABLE public.mandal_versions TO panin_boundary_definer;'));
  check(`REVOKE ALL FROM PUBLIC on transition function present in ${file}`, content.includes('REVOKE ALL ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) FROM PUBLIC;'));
  check(`GRANT EXECUTE TO service_role present in ${file}`, content.includes('GRANT EXECUTE ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) TO service_role;'));
  check(`RLS enabled on mandal_versions in ${file}`, content.includes('ALTER TABLE public.mandal_versions ENABLE ROW LEVEL SECURITY;'));
}

const verifyFile = 'supabase/verify_staging_migration_package_041.sql';
if (fs.existsSync(verifyFile)) {
  const content = fs.readFileSync(verifyFile, 'utf8');
  check(`No BOM in ${verifyFile}`, !content.startsWith('\uFEFF'));
  check(`Contains DO $$ block in ${verifyFile}`, content.includes('DO $$') && content.includes('END $$;'));
  check(`Contains Check 10 PASS in ${verifyFile}`, content.includes('Check 10 PASS'));
  check(`Contains Check 23 PASS in ${verifyFile}`, content.includes('Check 23 PASS'));
}

const rollbackFile = 'supabase/rollback_staging_migration_package_041.sql';
if (fs.existsSync(rollbackFile)) {
  const content = fs.readFileSync(rollbackFile, 'utf8');
  check(`No BOM in ${rollbackFile}`, !content.startsWith('\uFEFF'));
  check(`Rollback contains DROP TABLE public.mandal_versions`, content.includes('DROP TABLE IF EXISTS public.mandal_versions CASCADE;'));
  check(`Rollback contains DROP ROLE panin_boundary_definer`, content.includes('DROP ROLE IF EXISTS panin_boundary_definer;'));
}

if (exitCode === 0) {
  console.log('\n[PASS] All W014 static validation checks passed successfully.');
} else {
  console.error('\n[FAIL] Static validation failed.');
}

process.exit(exitCode);
