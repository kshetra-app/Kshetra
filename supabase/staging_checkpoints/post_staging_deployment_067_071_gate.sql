-- ==============================================================================
-- KSHETRA / PANIN: CONSOLIDATED STAGING DEPLOYMENT VERIFICATION GATE
-- Migrations: 067, 068, 069, 070, 071
-- Target: Staging Supabase (fkpigozcqnmcvofuksar / panIN-staging)
-- Environment: Staging only
-- Mode: Strictly READ-ONLY (ZERO mutations, ZERO DDL changes)
-- Structure: Exactly ONE consolidated result set returning explicit PASS/FAIL rows
-- Authority: Master Execution Framework Amendment v1.2 / Rule IV-001 / DEC-164
-- ==============================================================================

WITH
-- ─── CHECK 1: Candidacies Contest Foreign Key Referential Hardening ───────────
check_1_data AS (
  SELECT
    (SELECT count(*) FROM pg_constraint
     WHERE conrelid = 'public.candidacies'::regclass
       AND conname = 'fk_candidacies_contest'
       AND confdeltype = 'r'
       AND convalidated = true) AS fk_contest_valid,
    (SELECT count(*) FROM pg_constraint
     WHERE conrelid = 'public.candidacies'::regclass
       AND conname = 'candidacies_contest_id_fkey') AS legacy_cascade_fk
),
check_1_cte AS (
  SELECT
    'check_01' AS check_id,
    'candidacies contest foreign key referential hardening (ON DELETE RESTRICT)' AS check_name,
    'fk_contest_valid: ' || fk_contest_valid || ', legacy_cascade: ' || legacy_cascade_fk AS actual_value,
    'fk_contest_valid: 1, legacy_cascade: 0' AS expected_value,
    CASE WHEN fk_contest_valid = 1 AND legacy_cascade_fk = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    'fk_candidacies_contest enforced with ON DELETE RESTRICT; legacy CASCADE eliminated' AS details
  FROM check_1_data
),

-- ─── CHECK 2: Candidacies Person & Party Foreign Keys Hardening ───────────────
check_2_data AS (
  SELECT
    (SELECT count(*) FROM pg_constraint
     WHERE conrelid = 'public.candidacies'::regclass
       AND conname = 'fk_candidacies_person'
       AND confdeltype = 'r'
       AND convalidated = true) AS fk_person_valid,
    (SELECT count(*) FROM pg_constraint
     WHERE conrelid = 'public.candidacies'::regclass
       AND conname = 'fk_candidacies_party'
       AND confdeltype = 'r'
       AND convalidated = true) AS fk_party_valid,
    (SELECT count(*) FROM pg_constraint
     WHERE conrelid = 'public.candidacies'::regclass
       AND conname IN ('candidacies_person_id_fkey', 'candidacies_party_id_fkey')) AS legacy_unnamed_fks
),
check_2_cte AS (
  SELECT
    'check_02' AS check_id,
    'candidacies person and party named foreign keys (ON DELETE RESTRICT)' AS check_name,
    'fk_person: ' || fk_person_valid || ', fk_party: ' || fk_party_valid || ', legacy: ' || legacy_unnamed_fks AS actual_value,
    'fk_person: 1, fk_party: 1, legacy: 0' AS expected_value,
    CASE WHEN fk_person_valid = 1 AND fk_party_valid = 1 AND legacy_unnamed_fks = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    'fk_candidacies_person and fk_candidacies_party enforced with ON DELETE RESTRICT; legacy unnamed FKs eliminated' AS details
  FROM check_2_data
),

-- ─── CHECK 3: Candidacies Index Integrity & Redundant Index Cleanup ───────────
check_3_data AS (
  SELECT
    (SELECT count(*) FROM pg_indexes
     WHERE schemaname = 'public'
       AND tablename = 'candidacies'
       AND indexname IN ('idx_candidacies_contest_id', 'idx_candidacies_person', 'idx_candidacies_party')) AS base_indexes,
    (SELECT count(*) FROM pg_indexes
     WHERE schemaname = 'public'
       AND tablename = 'candidacies'
       AND indexname IN ('idx_candidacies_contest_fk', 'idx_candidacies_person_fk', 'idx_candidacies_party_fk')) AS redundant_indexes
),
check_3_cte AS (
  SELECT
    'check_03' AS check_id,
    'candidacies index integrity and duplicate index cleanup' AS check_name,
    'base_indexes: ' || base_indexes || '/3, redundant_indexes: ' || redundant_indexes AS actual_value,
    'base_indexes: 3/3, redundant_indexes: 0' AS expected_value,
    CASE WHEN base_indexes = 3 AND redundant_indexes = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    'All 3 base indexes exist; redundant _fk duplicate indexes cleaned up' AS details
  FROM check_3_data
),

-- ─── CHECK 4: Normalized Candidate Affidavit Disclosures Table Schema ─────────
check_4_data AS (
  SELECT
    (SELECT count(*) FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'candidate_affidavit_disclosures') AS table_exists,
    (SELECT count(*) FROM pg_constraint
     WHERE conrelid = 'public.candidate_affidavit_disclosures'::regclass
       AND conname IN ('chk_movable_sum', 'chk_immovable_sum', 'chk_gross_assets', 'chk_liabilities_sum')) AS sum_check_constraints,
    (SELECT count(*) FROM pg_tables
     WHERE schemaname = 'public' AND tablename = 'candidate_affidavit_disclosures' AND rowsecurity = true) AS rls_enabled,
    (SELECT count(*) FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'candidate_affidavit_disclosures' AND policyname = 'p_select_candidate_affidavit_disclosures') AS select_policy
),
check_4_cte AS (
  SELECT
    'check_04' AS check_id,
    'candidate_affidavit_disclosures table, DEC-134 sum constraints and RLS policy' AS check_name,
    'table: ' || table_exists || ', checks: ' || sum_check_constraints || '/4, rls: ' || rls_enabled || ', policy: ' || select_policy AS actual_value,
    'table: 1, checks: 4/4, rls: 1, policy: 1' AS expected_value,
    CASE WHEN table_exists = 1 AND sum_check_constraints = 4 AND rls_enabled = 1 AND select_policy = 1 THEN 'PASS' ELSE 'FAIL' END AS status,
    'DEC-134 candidate_affidavit_disclosures table verified with component sum constraints and public SELECT RLS' AS details
  FROM check_4_data
),

-- ─── CHECK 5: SaaS Outbound Webhooks Subscriptions & Events Schema ────────────
check_5_data AS (
  SELECT
    (SELECT count(*) FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('webhook_subscriptions', 'webhook_events')) AS sub_events_tables,
    (SELECT count(*) FROM pg_constraint
     WHERE conrelid = 'public.webhook_subscriptions'::regclass
       AND conname = 'fk_webhook_sub_tenant_app') AS sub_fk,
    (SELECT count(*) FROM pg_constraint
     WHERE conrelid = 'public.webhook_events'::regclass
       AND conname = 'fk_webhook_events_tenant_app') AS events_fk,
    (SELECT count(*) FROM pg_trigger
     WHERE tgrelid = 'public.webhook_events'::regclass
       AND tgname = 'trg_webhook_events_immutable') AS events_immutability_trigger,
    (SELECT count(*) FROM pg_tables
     WHERE schemaname = 'public' AND tablename IN ('webhook_subscriptions', 'webhook_events') AND rowsecurity = true) AS rls_enabled
),
check_5_cte AS (
  SELECT
    'check_05' AS check_id,
    'saas webhook subscriptions and immutable events log schema' AS check_name,
    'tables: ' || sub_events_tables || '/2, fks: ' || (sub_fk + events_fk) || '/2, trigger: ' || events_immutability_trigger || ', rls: ' || rls_enabled || '/2' AS actual_value,
    'tables: 2/2, fks: 2/2, trigger: 1, rls: 2/2' AS expected_value,
    CASE WHEN sub_events_tables = 2 AND sub_fk = 1 AND events_fk = 1 AND events_immutability_trigger = 1 AND rls_enabled = 2 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Webhook subscriptions & events verified with composite application FKs, immutability trigger, and RLS' AS details
  FROM check_5_data
),

-- ─── CHECK 6: SaaS Outbound Webhooks Deliveries Queue & Functions ─────────────
check_6_data AS (
  SELECT
    (SELECT count(*) FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'webhook_deliveries') AS deliv_table,
    (SELECT count(*) FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('fn_publish_webhook_event', 'fn_claim_webhook_batch', 'fn_purge_expired_webhook_data')) AS functions_count,
    (SELECT count(*) FROM pg_tables
     WHERE schemaname = 'public' AND tablename = 'webhook_deliveries' AND rowsecurity = true) AS rls_enabled
),
check_6_cte AS (
  SELECT
    'check_06' AS check_id,
    'saas webhook deliveries queue state machine and atomic procedures' AS check_name,
    'deliveries_table: ' || deliv_table || ', functions: ' || functions_count || '/3, rls: ' || rls_enabled AS actual_value,
    'deliveries_table: 1, functions: 3/3, rls: 1' AS expected_value,
    CASE WHEN deliv_table = 1 AND functions_count = 3 AND rls_enabled = 1 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Webhook deliveries queue and fn_publish/fn_claim/fn_purge functions operational with RLS' AS details
  FROM check_6_data
),

-- ─── CHECK 7: Delimitation Watch Engine Lifecycle Persistence Tables ──────────
check_7_data AS (
  SELECT
    (SELECT count(*) FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN (
       'delimitation_watch_sources',
       'delimitation_snapshots',
       'delimitation_candidates',
       'delimitation_validations',
       'delimitation_comparisons',
       'delimitation_accepted_versions',
       'delimitation_notification_events',
       'delimitation_publications',
       'delimitation_watch_runs'
     )) AS watch_tables_count,
    (SELECT count(*) FROM pg_type
     WHERE typname = 'source_authority_enum') AS auth_enum_count
),
check_7_cte AS (
  SELECT
    'check_07' AS check_id,
    'delimitation watch engine 8-stage lifecycle persistence tables (9 tables)' AS check_name,
    'tables: ' || watch_tables_count || '/9, enum: ' || auth_enum_count AS actual_value,
    'tables: 9/9, enum: 1' AS expected_value,
    CASE WHEN watch_tables_count = 9 AND auth_enum_count = 1 THEN 'PASS' ELSE 'FAIL' END AS status,
    'All 9 delimitation watch lifecycle tables and source_authority_enum verified in catalog' AS details
  FROM check_7_data
),

-- ─── CHECK 8: Delimitation Watch Engine RLS & Policies ────────────────────────
check_8_data AS (
  SELECT
    (SELECT count(*) FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename IN (
         'delimitation_watch_sources', 'delimitation_snapshots', 'delimitation_candidates',
         'delimitation_validations', 'delimitation_comparisons', 'delimitation_accepted_versions',
         'delimitation_notification_events', 'delimitation_publications', 'delimitation_watch_runs'
       )
       AND rowsecurity = true) AS rls_enabled_tables,
    (SELECT count(*) FROM pg_policies
     WHERE schemaname = 'public'
       AND policyname IN ('Public read active sources', 'Public read accepted versions', 'Public read publications')) AS policies_count
),
check_8_cte AS (
  SELECT
    'check_08' AS check_id,
    'delimitation watch engine RLS enforcement and public read policies' AS check_name,
    'rls_tables: ' || rls_enabled_tables || '/9, policies: ' || policies_count || '/3' AS actual_value,
    'rls_tables: 9/9, policies: 3/3' AS expected_value,
    CASE WHEN rls_enabled_tables = 9 AND policies_count = 3 THEN 'PASS' ELSE 'FAIL' END AS status,
    'RLS enabled on all 9 delimitation watch tables; public read policies established' AS details
  FROM check_8_data
),

-- ─── CHECK 9: Canonical Data Baseline Integrity & Non-Interference ───────────
check_9_data AS (
  SELECT
    (SELECT count(*) FROM public.political_organizations
     WHERE provenance_id = '0215b22c-0000-0000-0000-000000000001'::uuid) AS batch_orgs,
    (SELECT count(*) FROM public.candidate_affidavits
     WHERE provenance_id = '0215b22e-0000-0000-0000-000000000001'::uuid) AS batch_affidavits,
    (SELECT count(*) FROM public.constituency_demographics
     WHERE provenance_id = '0215b22e-0000-0000-0000-000000000001'::uuid) AS batch_demographics,
    (SELECT count(*) FROM public.political_organizations
     WHERE is_independent = true OR name ILIKE '%independent%') AS synth_orgs
),
check_9_cte AS (
  SELECT
    'check_09' AS check_id,
    'canonical data baseline integrity and non-interference' AS check_name,
    'orgs: ' || batch_orgs || ', affidavits: ' || batch_affidavits || ', demographics: ' || batch_demographics || ', synth: ' || synth_orgs AS actual_value,
    'orgs: 107, affidavits: 4523, demographics: 4123, synth: 0' AS expected_value,
    CASE WHEN batch_orgs = 107 AND batch_affidavits = 4523 AND batch_demographics = 4123 AND synth_orgs = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Prior Stage C & E canonical data preserved without perturbation; 0 synthetic entities' AS details
  FROM check_9_data
),

-- ─── CHECK 10: Aggregate Staging Deployment Gate Verdict ──────────────────────
all_individual_checks AS (
  SELECT * FROM check_1_cte
  UNION ALL SELECT * FROM check_2_cte
  UNION ALL SELECT * FROM check_3_cte
  UNION ALL SELECT * FROM check_4_cte
  UNION ALL SELECT * FROM check_5_cte
  UNION ALL SELECT * FROM check_6_cte
  UNION ALL SELECT * FROM check_7_cte
  UNION ALL SELECT * FROM check_8_cte
  UNION ALL SELECT * FROM check_9_cte
),
summary_stats AS (
  SELECT
    count(*) AS total_checks,
    count(*) FILTER (WHERE status = 'PASS') AS passed_checks,
    count(*) FILTER (WHERE status = 'FAIL') AS failed_checks
  FROM all_individual_checks
),
check_aggregate_cte AS (
  SELECT
    'check_10' AS check_id,
    'consolidated staging deployment gate verdict (migrations 067-071)' AS check_name,
    'passed: ' || passed_checks || '/' || total_checks || ', failed: ' || failed_checks AS actual_value,
    'passed: ' || total_checks || '/' || total_checks || ', failed: 0' AS expected_value,
    CASE WHEN passed_checks = total_checks AND failed_checks = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    CASE WHEN passed_checks = total_checks AND failed_checks = 0
         THEN 'POST_STAGING_DEPLOY_PASS: All migrations 067-071 deployed and verified on staging'
         ELSE 'POST_STAGING_DEPLOY_FAIL: One or more checks failed'
    END AS details
  FROM summary_stats
)

SELECT * FROM all_individual_checks
UNION ALL
SELECT * FROM check_aggregate_cte
ORDER BY check_id;
