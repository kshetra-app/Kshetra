-- ==============================================================================
-- KSHETRA / PANIN: CONSOLIDATED STAGING DEPLOYMENT VERIFICATION GATE
-- Migrations: 068, 070, 071
-- Target: Staging Supabase (fkpigozcqnmcvofuksar / panIN-staging)
-- Environment: Staging only
-- Mode: Strictly READ-ONLY (ZERO mutations, ZERO DDL changes)
-- Structure: Exactly ONE consolidated result set returning explicit PASS/FAIL rows
-- Authority: Master Execution Framework Amendment v1.2 / Rule IV-001 / DEC-164 / DEC-165
-- ==============================================================================

WITH
-- ─── CHECK 1: candidate_affidavit_disclosures Table Schema & FK Constraints ──
check_1_data AS (
  SELECT
    (SELECT count(*) FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'candidate_affidavit_disclosures') AS table_exists,
    (SELECT count(*) FROM pg_constraint
     WHERE conrelid = 'public.candidate_affidavit_disclosures'::regclass
       AND conname = 'candidate_affidavit_disclosures_person_id_fkey') AS person_fk,
    (SELECT count(*) FROM pg_constraint
     WHERE conrelid = 'public.candidate_affidavit_disclosures'::regclass
       AND conname = 'candidate_affidavit_disclosures_candidate_id_fkey') AS candidate_fk
),
check_1_cte AS (
  SELECT
    'check_01' AS check_id,
    'candidate_affidavit_disclosures table schema and foreign key constraints' AS check_name,
    'table: ' || table_exists || ', person_fk: ' || person_fk || ', candidate_fk: ' || candidate_fk AS actual_value,
    'table: 1, person_fk: 1, candidate_fk: 1' AS expected_value,
    CASE WHEN table_exists = 1 AND person_fk = 1 AND candidate_fk = 1 THEN 'PASS' ELSE 'FAIL' END AS status,
    'candidate_affidavit_disclosures table exists with valid foreign keys to canonical_persons and candidacies' AS details
  FROM check_1_data
),

-- ─── CHECK 2: DEC-134 Financial Balance Check Constraints ────────────────────
check_2_data AS (
  SELECT
    (SELECT count(*) FROM pg_constraint
     WHERE conrelid = 'public.candidate_affidavit_disclosures'::regclass
       AND conname IN ('chk_movable_sum', 'chk_immovable_sum', 'chk_gross_assets', 'chk_liabilities_sum')) AS sum_check_constraints
),
check_2_cte AS (
  SELECT
    'check_02' AS check_id,
    'candidate_affidavit_disclosures DEC-134 financial balance check constraints' AS check_name,
    'checks: ' || sum_check_constraints || '/4' AS actual_value,
    'checks: 4/4' AS expected_value,
    CASE WHEN sum_check_constraints = 4 THEN 'PASS' ELSE 'FAIL' END AS status,
    'All 4 DEC-134 mathematical sum check constraints (movable, immovable, gross, liabilities) verified' AS details
  FROM check_2_data
),

-- ─── CHECK 3: candidate_affidavit_disclosures RLS & SELECT Policy ────────────
check_3_data AS (
  SELECT
    (SELECT count(*) FROM pg_tables
     WHERE schemaname = 'public' AND tablename = 'candidate_affidavit_disclosures' AND rowsecurity = true) AS rls_enabled,
    (SELECT count(*) FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'candidate_affidavit_disclosures' AND policyname = 'p_select_candidate_affidavit_disclosures') AS select_policy
),
check_3_cte AS (
  SELECT
    'check_03' AS check_id,
    'candidate_affidavit_disclosures RLS security and public SELECT policy' AS check_name,
    'rls: ' || rls_enabled || ', policy: ' || select_policy AS actual_value,
    'rls: 1, policy: 1' AS expected_value,
    CASE WHEN rls_enabled = 1 AND select_policy = 1 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Row Level Security enabled and public read access policy active on affidavit disclosures' AS details
  FROM check_3_data
),

-- ─── CHECK 4: SaaS Outbound Webhooks Subscriptions & Events Schema ───────────
check_4_data AS (
  SELECT
    (SELECT count(*) FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('webhook_subscriptions', 'webhook_events')) AS sub_events_tables,
    (SELECT count(*) FROM pg_constraint
     WHERE conrelid = 'public.webhook_subscriptions'::regclass
       AND conname = 'fk_webhook_sub_tenant_app') AS sub_fk,
    (SELECT count(*) FROM pg_constraint
     WHERE conrelid = 'public.webhook_events'::regclass
       AND conname = 'fk_webhook_events_tenant_app') AS events_fk
),
check_4_cte AS (
  SELECT
    'check_04' AS check_id,
    'saas webhook subscriptions and immutable events log schema' AS check_name,
    'tables: ' || sub_events_tables || '/2, fks: ' || (sub_fk + events_fk) || '/2' AS actual_value,
    'tables: 2/2, fks: 2/2' AS expected_value,
    CASE WHEN sub_events_tables = 2 AND sub_fk = 1 AND events_fk = 1 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Webhook subscriptions & events verified with composite tenant-application foreign keys' AS details
  FROM check_4_data
),

-- ─── CHECK 5: SaaS Outbound Webhooks Immutability Trigger & RLS ──────────────
check_5_data AS (
  SELECT
    (SELECT count(*) FROM pg_trigger
     WHERE tgrelid = 'public.webhook_events'::regclass
       AND tgname = 'trg_webhook_events_immutable') AS events_immutability_trigger,
    (SELECT count(*) FROM pg_tables
     WHERE schemaname = 'public' AND tablename IN ('webhook_subscriptions', 'webhook_events') AND rowsecurity = true) AS rls_enabled
),
check_5_cte AS (
  SELECT
    'check_05' AS check_id,
    'saas webhook events immutability trigger and table RLS' AS check_name,
    'trigger: ' || events_immutability_trigger || ', rls: ' || rls_enabled || '/2' AS actual_value,
    'trigger: 1, rls: 2/2' AS expected_value,
    CASE WHEN events_immutability_trigger = 1 AND rls_enabled = 2 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Immutability trigger trg_webhook_events_immutable and RLS verified on webhook events & subscriptions' AS details
  FROM check_5_data
),

-- ─── CHECK 6: SaaS Outbound Webhooks Deliveries Queue & Atomic Procedures ────
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
    'Webhook deliveries queue and fn_publish/fn_claim/fn_purge procedures verified with RLS' AS details
  FROM check_6_data
),

-- ─── CHECK 7: Delimitation Watch Engine Lifecycle Persistence Tables ─────────
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

-- ─── CHECK 8: Delimitation Watch Engine RLS & Public Policies ────────────────
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

-- ─── CHECK 9: Canonical Data Baseline Integrity & Non-Interference ──────────
check_9_data AS (
  SELECT
    (SELECT count(*) FROM public.political_organizations
     WHERE provenance_id = '0215b22c-0000-0000-0000-000000000001'::uuid) AS batch_orgs,
    (SELECT count(*) FROM public.candidate_affidavits
     WHERE provenance_id = '0215b22e-0000-0000-0000-000000000001'::uuid) AS batch_affidavits,
    (SELECT count(*) FROM public.constituency_demographics
     WHERE provenance_id = '0215b22e-0000-0000-0000-000000000001'::uuid) AS batch_demographics,
    (SELECT count(*) FROM public.political_organizations
     WHERE id ILIKE '%indep%' OR name ILIKE '%indep%' OR (ec_party_code IS NOT NULL AND ec_party_code ILIKE '%indep%')) AS synth_orgs
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

-- ─── CHECK 10: Aggregate Staging Deployment Gate Verdict ─────────────────────
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
    'consolidated staging deployment gate verdict (migrations 068, 070, 071)' AS check_name,
    'passed: ' || passed_checks || '/' || total_checks || ', failed: ' || failed_checks AS actual_value,
    'passed: ' || total_checks || '/' || total_checks || ', failed: 0' AS expected_value,
    CASE WHEN passed_checks = total_checks AND failed_checks = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    CASE WHEN passed_checks = total_checks AND failed_checks = 0
         THEN 'POST_STAGING_DEPLOY_PASS: All migrations 068, 070, 071 deployed and verified on staging'
         ELSE 'POST_STAGING_DEPLOY_FAIL: One or more checks failed'
    END AS details
  FROM summary_stats
)

SELECT * FROM all_individual_checks
UNION ALL
SELECT * FROM check_aggregate_cte
ORDER BY check_id;
