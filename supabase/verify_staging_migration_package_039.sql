-- ==============================================================================
-- W012: POST-MIGRATION 039 VERIFICATION SQL SUITE (HARDENED)
-- Target Supabase Project: panIN-staging (fkpigozcqnmcvofuksar)
-- Authoritative Architecture: docs/W012_DATA_GOVERNANCE_INVENTORY.md
-- Checks:
--   1. Enum definitions and members (source_authority_enum, data_status_enum)
--   2. Governance catalog tables existence (6 tables)
--   3. Column defaults and non-null constraints (safe UNKNOWN default)
--   4. Foreign key integrity and RESTRICT delete rules (Zero destructive cascades)
--   5. Index catalog verification
--   6. Security functions and invariant triggers (Immutability + Transition)
--   7. FORCE ROW LEVEL SECURITY verification across all 6 tables
--   8. Column privilege classification & RLS policies verification
--   9. Controlled source seeds verification (5 canonical sources)
--  10. Representative bounded datasets verification (4 domains)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- CHECK 1: Enum Definitions and Label Sets
-- ------------------------------------------------------------------------------
SELECT t.typname AS enum_name, e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
  AND t.typname IN ('source_authority_enum', 'data_status_enum')
ORDER BY t.typname, e.enumsortorder;
-- EXPECTED:
-- data_status_enum: OFFICIAL, DERIVED, VERIFIED, ESTIMATE, SCENARIO, INFERRED, UNVERIFIED, UNKNOWN (8 values)
-- source_authority_enum: constitutional, statutory, academic, media_ngo, crowdsourced, synthetic_model (6 values)

-- ------------------------------------------------------------------------------
-- CHECK 2: Governance Catalog Tables Existence
-- ------------------------------------------------------------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'data_sources',
    'datasets',
    'dataset_versions',
    'evidence_records',
    'provenance_records',
    'record_provenance_linkages'
  )
ORDER BY table_name;
-- EXPECTED: Exactly 6 rows.

-- ------------------------------------------------------------------------------
-- CHECK 3: Safe Default Status Verification (UNKNOWN Invariant)
-- ------------------------------------------------------------------------------
SELECT table_name, column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'dataset_versions' AND column_name = 'default_status') OR
    (table_name = 'provenance_records' AND column_name = 'status')
  )
ORDER BY table_name, column_name;
-- EXPECTED:
-- dataset_versions.default_status: default ''UNKNOWN''::data_status_enum, is_nullable NO
-- provenance_records.status: default ''UNKNOWN''::data_status_enum, is_nullable NO

-- ------------------------------------------------------------------------------
-- CHECK 4: Foreign Key Constraints & Restrictive Deletion (Zero Cascades)
-- ------------------------------------------------------------------------------
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'datasets',
    'dataset_versions',
    'evidence_records',
    'provenance_records',
    'record_provenance_linkages'
  )
ORDER BY tc.table_name, kcu.column_name;
-- EXPECTED:
-- datasets.source_id -> data_sources.id (RESTRICT)
-- dataset_versions.dataset_id -> datasets.id (RESTRICT)
-- dataset_versions.verification_evidence_id -> evidence_records.id (RESTRICT)
-- evidence_records.dataset_version_id -> dataset_versions.id (RESTRICT)
-- provenance_records.dataset_version_id -> dataset_versions.id (RESTRICT)
-- provenance_records.parent_provenance_id -> provenance_records.id (RESTRICT)
-- provenance_records.verification_evidence_id -> evidence_records.id (RESTRICT)
-- record_provenance_linkages.provenance_id -> provenance_records.id (RESTRICT)
-- ALL delete_rules MUST be 'RESTRICT' (Zero destructive cascades).

-- ------------------------------------------------------------------------------
-- CHECK 5: Governance Indexes Verification
-- ------------------------------------------------------------------------------
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'data_sources',
    'datasets',
    'dataset_versions',
    'evidence_records',
    'provenance_records',
    'record_provenance_linkages'
  )
ORDER BY tablename, indexname;
-- EXPECTED: All required performance and lookup indexes present.

-- ------------------------------------------------------------------------------
-- CHECK 6: Security Functions and Invariant Triggers
-- ------------------------------------------------------------------------------
SELECT p.proname, p.prosecdef, pg_get_functiondef(p.oid) LIKE '%search_path%' AS has_search_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'prevent_evidence_mutation',
    'prevent_dataset_version_mutation',
    'check_version_status_transition_invariant',
    'prevent_provenance_mutation',
    'check_status_transition_invariant'
  )
ORDER BY p.proname;
-- EXPECTED: Exactly 5 functions with prosecdef = true, has_search_path = true.

SELECT event_object_table, trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('evidence_records', 'dataset_versions', 'provenance_records')
ORDER BY event_object_table, trigger_name;
-- EXPECTED:
-- evidence_records: trg_prevent_evidence_mutation (BEFORE UPDATE, BEFORE DELETE)
-- dataset_versions: trg_prevent_dataset_version_mutation (BEFORE UPDATE, BEFORE DELETE)
-- dataset_versions: trg_check_version_status_transition (BEFORE UPDATE)
-- provenance_records: trg_prevent_provenance_mutation (BEFORE UPDATE, BEFORE DELETE)
-- provenance_records: trg_check_provenance_status_transition (BEFORE UPDATE)

-- ------------------------------------------------------------------------------
-- CHECK 7: FORCE ROW LEVEL SECURITY Verification
-- ------------------------------------------------------------------------------
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'data_sources',
    'datasets',
    'dataset_versions',
    'evidence_records',
    'provenance_records',
    'record_provenance_linkages'
  )
ORDER BY c.relname;
-- EXPECTED: Exactly 6 rows, all with rls_enabled = true and rls_forced = true.

-- ------------------------------------------------------------------------------
-- CHECK 8: Column-Level Privilege Classification & Row Level Security Policies
-- ------------------------------------------------------------------------------
-- Ensure internal administrative columns are NOT granted to untrusted roles
SELECT table_name, column_name, grantee, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name IN ('evidence_records', 'provenance_records', 'dataset_versions')
  AND column_name IN ('verified_by', 'verification_notes', 'operator', 'storage_path')
  AND grantee IN ('PUBLIC', 'anon', 'authenticated');
-- EXPECTED: Exactly 0 rows.

SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'data_sources',
    'datasets',
    'dataset_versions',
    'evidence_records',
    'provenance_records',
    'record_provenance_linkages'
  )
ORDER BY tablename, policyname;
-- EXPECTED: 12 policies (Public read + Service role full access across all 6 tables).

-- ------------------------------------------------------------------------------
-- CHECK 9: Controlled Source Seeds Verification
-- ------------------------------------------------------------------------------
SELECT id, name, authority_level, publisher, is_active
FROM data_sources
ORDER BY id;
-- EXPECTED: Exactly 5 rows:
-- datta07_shapefiles (crowdsourced)
-- eci (constitutional)
-- myneta (media_ngo)
-- prs_india (academic)
-- synthetic_projection_model (synthetic_model)

-- ------------------------------------------------------------------------------
-- CHECK 10: Representative Bounded Datasets Verification
-- ------------------------------------------------------------------------------
SELECT
  d.id AS dataset_id,
  d.domain,
  s.id AS source_id,
  s.authority_level,
  v.id AS version_id,
  v.default_status,
  p.id AS provenance_id,
  p.status AS provenance_status,
  p.transformation_type
FROM datasets d
JOIN data_sources s ON d.source_id = s.id
JOIN dataset_versions v ON v.dataset_id = d.id
JOIN provenance_records p ON p.dataset_version_id = v.id
ORDER BY d.id;
-- EXPECTED: Exactly 4 rows:
-- 1. civic_bills_schemes | civic_governance | prs_india | academic | civic_schemes_v1 | UNKNOWN | UNKNOWN | mock_seed_insert
-- 2. geo_assembly_boundaries | geography | datta07_shapefiles | crowdsourced | geo_assembly_boundaries_v2008 | UNVERIFIED | UNVERIFIED | raw_shapefile_import
-- 3. tamil_nadu_2026_projection | election_projection | myneta | media_ngo | tn_2026_proj_v1 | SCENARIO | SCENARIO | synthetic_projection_simulation
-- 4. telangana_2023_mla_profiles | political_profiles | myneta | media_ngo | telangana_2023_mla_v1 | UNVERIFIED | UNVERIFIED | web_scrape_profile_build
