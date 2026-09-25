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
  check(`Zero ON CONFLICT DO UPDATE on dataset_versions in ${file}`, !content.includes('ON CONFLICT (id) DO UPDATE SET\n  dataset_id = EXCLUDED.dataset_id') && content.includes('ON CONFLICT (id) DO NOTHING;'));

  // W012 Complete Immutable-Field Reconciliation Coverage Checks
  const w014DsVersions = [
    'ts_districts_2014_v1',
    'ts_districts_2021_renames_v1',
    'eci_delimitation_1976_v1',
    'eci_delimitation_post2026_projected_v1',
    'scenario_delimitation_draft_prop_1_v1'
  ];
  const w012ImmutableFields = [
    'dataset_id',
    'version_tag',
    'effective_from',
    'effective_to',
    'record_count',
    'checksum_sha256',
    'storage_path',
    'default_status',
    'verification_evidence_id',
    'metadata'
  ];

  for (const dsId of w014DsVersions) {
    check(`Reconciliation block present for ${dsId} in ${file}`, content.includes(`SELECT * INTO v_rec FROM public.dataset_versions WHERE id = '${dsId}'`));
    for (const f of w012ImmutableFields) {
      check(`Reconciliation of ${dsId} checks ${f} via IS DISTINCT FROM in ${file}`, content.includes(`v_rec.${f} IS DISTINCT FROM`));
    }
  }
  check(`Reconciliation raises explicit field mismatch exception in ${file}`, content.includes('RECONCILIATION FAILURE: dataset_version % field "') && content.includes('mismatch: existing="%", expected="%"'));
  check(`Zero retrieved_at comparison against NOW() in reconciliation in ${file}`, !content.includes('retrieved_at = now()') && !content.includes('retrieved_at IS DISTINCT FROM now()'));


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
  check(`Zero INSERT grants to panin_boundary_definer on mandal_versions in ${file}`,
    !/GRANT\s+[^;]*\bINSERT\b[^;]*\bON\s+(TABLE\s+)?(public\.)?mandal_versions\b[^;]*\bTO\s+panin_boundary_definer\b/i.test(content) &&
    !/GRANT\s+[^;]*\bINSERT\b[^;]*\bTO\s+panin_boundary_definer\b/i.test(content)
  );
  check(`REVOKE ALL FROM PUBLIC on transition function present in ${file}`, content.includes('REVOKE ALL ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) FROM PUBLIC;'));
  check(`REVOKE ALL FROM anon on transition function present in ${file}`, content.includes('REVOKE ALL ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) FROM anon;'));
  check(`REVOKE ALL FROM authenticated on transition function present in ${file}`, content.includes('REVOKE ALL ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) FROM authenticated;'));
  check(`GRANT EXECUTE TO service_role present in ${file}`, content.includes('GRANT EXECUTE ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) TO service_role;'));
  check(`GRANT EXECUTE TO panin_boundary_admin present in ${file}`, content.includes('GRANT EXECUTE ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) TO panin_boundary_admin;'));
  check(`RLS enabled on mandal_versions in ${file}`, content.includes('ALTER TABLE public.mandal_versions ENABLE ROW LEVEL SECURITY;'));

  // Security Definer Role Bootstrap & Clean Ownership Hand-off Assertions
  check(`Temporary GRANT panin_boundary_definer TO CURRENT_USER present in ${file}`, content.includes('GRANT panin_boundary_definer TO CURRENT_USER;'));
  check(`Temporary GRANT CREATE ON SCHEMA public TO panin_boundary_definer present in ${file}`, content.includes('GRANT CREATE ON SCHEMA public TO panin_boundary_definer;'));
  check(`ALTER FUNCTION ... OWNER TO panin_boundary_definer present in ${file}`, content.includes('OWNER TO panin_boundary_definer;'));
  check(`REVOKE CREATE ON SCHEMA public FROM panin_boundary_definer cleanup present in ${file}`, content.includes('REVOKE CREATE ON SCHEMA public FROM panin_boundary_definer;'));
  check(`REVOKE panin_boundary_definer FROM CURRENT_USER cleanup present in ${file}`, content.includes('REVOKE panin_boundary_definer FROM CURRENT_USER;'));

  const grantRoleIdx = content.indexOf('GRANT panin_boundary_definer TO CURRENT_USER;');
  const grantSchemaIdx = content.indexOf('GRANT CREATE ON SCHEMA public TO panin_boundary_definer;');
  const ownerIdx = content.indexOf('OWNER TO panin_boundary_definer;');
  const revokeSchemaIdx = content.indexOf('REVOKE CREATE ON SCHEMA public FROM panin_boundary_definer;');
  const revokeRoleIdx = content.indexOf('REVOKE panin_boundary_definer FROM CURRENT_USER;');
  check(`Strict transactional bootstrap ordering (GRANTS < OWNER < REVOKES) in ${file}`,
    grantRoleIdx !== -1 && grantSchemaIdx !== -1 && ownerIdx !== -1 && revokeSchemaIdx !== -1 && revokeRoleIdx !== -1 &&
    grantRoleIdx < ownerIdx && grantSchemaIdx < ownerIdx && ownerIdx < revokeSchemaIdx && ownerIdx < revokeRoleIdx
  );
}

const verifyFile = 'supabase/verify_staging_migration_package_041.sql';
if (fs.existsSync(verifyFile)) {
  const content = fs.readFileSync(verifyFile, 'utf8');
  check(`No BOM in ${verifyFile}`, !content.startsWith('\uFEFF'));
  check(`Contains DO $$ block in ${verifyFile}`, content.includes('DO $$') && content.includes('END $$;'));
  check(`Contains Check 10 PASS in ${verifyFile}`, content.includes('Check 10 PASS'));
  check(`Contains Check 18 PASS in ${verifyFile}`, content.includes('Check 18 PASS: Transition function identity, SECURITY DEFINER, search_path, and owner verified'));
  check(`Contains Check 19 PASS in ${verifyFile}`, content.includes('Check 19 PASS: panin_boundary_definer role attributes, 0 memberships, USAGE-only schema access, and clean SET ROLE revocation verified'));
  check(`Check 19 contains empirical SET LOCAL ROLE test in ${verifyFile}`, content.includes('SET LOCAL ROLE panin_boundary_definer;') && content.includes('WHEN insufficient_privilege THEN'));
  check(`Check 19 verifies USAGE-only schema access in ${verifyFile}`, content.includes("has_schema_privilege('panin_boundary_definer', 'public', 'USAGE')") && content.includes("has_schema_privilege('panin_boundary_definer', 'public', 'CREATE')"));
  check(`Contains Check 20 PASS in ${verifyFile}`, content.includes('Check 20 PASS'));
  check(`Check 20 verifies mandal_versions INSERT = FALSE in ${verifyFile}`, content.includes("has_table_privilege('panin_boundary_definer', 'public.mandal_versions', 'INSERT')") && content.includes('mandal_versions INSERT = FALSE'));
  check(`Contains Check 21 PASS in ${verifyFile}`, content.includes('Check 21 PASS'));
  check(`Contains Check 22 PASS in ${verifyFile}`, content.includes('Check 22 PASS'));
  check(`Check 22 verifies complete 5-actor EXECUTE ACL in ${verifyFile}`,
    content.includes("has_function_privilege('service_role'") &&
    content.includes("has_function_privilege('panin_boundary_admin'") &&
    content.includes("has_function_privilege('public'") &&
    content.includes("has_function_privilege('anon'") &&
    content.includes("has_function_privilege('authenticated'")
  );
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
