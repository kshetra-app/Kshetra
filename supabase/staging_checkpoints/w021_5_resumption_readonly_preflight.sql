-- =============================================================================
-- W021.5 RESUMPTION READ-ONLY PREFLIGHT
-- Run ONLY in the Kshetra STAGING Supabase SQL Editor.
-- Confirm the project reference in the Supabase dashboard before running.
-- READ ONLY: no DDL, DML, grants, or extension changes.
-- Return the complete result grids to the CTO for exact sequencing.
-- =============================================================================

-- P0. Confirm the SQL editor session context. Verify the project reference
-- visually in the Supabase dashboard; the database name alone is not sufficient.
SELECT
  'W0215_ENVIRONMENT' AS check_id,
  current_database() AS database_name,
  current_user AS database_role,
  current_setting('server_version') AS postgres_version,
  current_timestamp AS observed_at,
  'READ_ONLY_PREFLIGHT_NO_MUTATIONS' AS execution_mode;

-- P1. Schema inventory for W021.5 dependencies.
WITH expected(table_name, purpose) AS (
  VALUES
    ('states','canonical state/UT registry'),
    ('constituencies','canonical assembly/parliamentary constituency registry'),
    ('datasets','dataset source catalog'),
    ('dataset_versions','immutable source/version snapshots'),
    ('provenance_records','record-level provenance'),
    ('political_organizations','canonical political organization registry'),
    ('organization_relationships','organization relationships'),
    ('organization_multilingual_names','multilingual organization names'),
    ('organization_symbols','organization symbols'),
    ('organization_aliases','temporal organization aliases'),
    ('canonical_persons','canonical people'),
    ('election_contests','canonical election contests'),
    ('candidacies','candidate/contest records'),
    ('constituency_demographics','constituency demographic aggregates'),
    ('candidate_affidavit_disclosures','normalized candidate affidavits')
)
SELECT
  'W0215_TABLE_INVENTORY' AS check_id,
  e.table_name,
  e.purpose,
  to_regclass('public.' || e.table_name)::text AS resolved_relation,
  (to_regclass('public.' || e.table_name) IS NOT NULL) AS exists_in_public_schema
FROM expected e
ORDER BY e.table_name;

-- P2. Approximate row-count telemetry only (n_live_tup is an estimate, not a
-- source of acceptance evidence). Exact counts are checked in dedicated gates.
SELECT
  'W0215_APPROXIMATE_ROW_COUNTS' AS check_id,
  schemaname,
  relname AS table_name,
  n_live_tup AS estimated_live_rows,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname='public'
  AND relname IN (
    'constituencies','political_organizations','organization_relationships',
    'organization_multilingual_names','organization_symbols','organization_aliases',
    'canonical_persons','election_contests','candidacies',
    'constituency_demographics','candidate_affidavit_disclosures'
  )
ORDER BY relname;

-- P3. Migration tracking table presence. If absent, do not infer that migrations
-- are absent; provide this result so the deployment mechanism can be reconciled.
SELECT
  'W0215_MIGRATION_TRACKING' AS check_id,
  to_regclass('supabase_migrations.schema_migrations')::text AS supabase_migration_history_relation,
  (to_regclass('supabase_migrations.schema_migrations') IS NOT NULL) AS history_relation_exists;

-- P4. Affidavit schema inspection. This returns zero rows if migration 068's table
-- is absent; use P1 to distinguish absent table from missing columns.
SELECT
  'W0215_AFFIDAVIT_COLUMNS' AS check_id,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='candidate_affidavit_disclosures'
  AND column_name IN (
    'constituency_id','criminal_cases_count','serious_ipc_count',
    'convictions_count','charges_framed_count','data_status',
    'source_affidavit_url','source_eci_affidavit_id','source_hash','provenance_id'
  )
ORDER BY ordinal_position;

-- P5. Affidavit table constraints (zero rows if table is absent).
SELECT
  'W0215_AFFIDAVIT_CONSTRAINTS' AS check_id,
  c.conname,
  c.contype,
  pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
WHERE c.conrelid=to_regclass('public.candidate_affidavit_disclosures')
ORDER BY c.conname;

-- P6. RLS state and policy metadata (zero rows if the table is absent).
SELECT
  'W0215_AFFIDAVIT_RLS' AS check_id,
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public'
  AND c.relname='candidate_affidavit_disclosures';

SELECT
  'W0215_AFFIDAVIT_POLICIES' AS check_id,
  p.polname,
  p.polcmd,
  p.polpermissive,
  p.polroles,
  pg_get_expr(p.polqual,p.polrelid) AS using_expression,
  pg_get_expr(p.polwithcheck,p.polrelid) AS with_check_expression
FROM pg_policy p
WHERE p.polrelid=to_regclass('public.candidate_affidavit_disclosures')
ORDER BY p.polname;

-- STOP AFTER THIS PREFLIGHT. Do not execute data packages until the exact
-- staging schema and row inventory have been reviewed against the current
-- branch, source hashes and dependency gates.
