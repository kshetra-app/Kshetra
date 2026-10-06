-- ==============================================================================
-- W021.5: Post-063 Consolidated Gate Verification Suite (Revision R4)
-- Target: Staging Supabase (fkpigozcqnmcvofuksar / panIN-staging)
-- Environment: Staging only
-- Mode: Strictly READ-ONLY (ZERO mutations, ZERO DDL changes)
-- Structure: Exactly ONE consolidated result set returning explicit PASS/FAIL rows
-- Authority: Master Execution Framework Amendment v1.2 / Rule IV-001
-- ==============================================================================

WITH
-- ─── CHECK 1: Table person_multilingual_identities & columns completeness ──────
check_1_cols AS (
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'person_multilingual_identities'
    AND column_name IN (
      'id', 'person_id', 'language_code', 'script_code',
      'representation_type', 'representation_value', 'is_preferred',
      'is_official', 'valid_from', 'valid_to', 'source',
      'data_status', 'provenance_id', 'created_at', 'updated_at'
    )
),
check_1_cte AS (
  SELECT
    'check_01' AS check_id,
    'person_multilingual_identities table and column schema completeness' AS check_name,
    'columns: ' || count(*) || '/15' AS actual_value,
    'columns: 15/15' AS expected_value,
    CASE WHEN count(*) = 15 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Table public.person_multilingual_identities registered with all 15 expected columns and types' AS details
  FROM check_1_cols
),

-- ─── CHECK 2: person_multilingual_identities unique constraints & partial indexes ─
check_2_indices AS (
  SELECT i.relname AS index_name, pg_get_indexdef(ix.indexrelid) AS def
  FROM pg_index ix
  JOIN pg_class t ON t.oid = ix.indrelid
  JOIN pg_class i ON i.oid = ix.indexrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public' 
    AND t.relname = 'person_multilingual_identities'
    AND i.relname IN ('uq_person_multi_ident', 'uq_person_multi_ident_single_preferred', 'uq_person_multi_ident_single_official')
),
check_2_cte AS (
  SELECT
    'check_02' AS check_id,
    'person_multilingual_identities unique constraint and partial unique indexes' AS check_name,
    'uq_indices: ' || count(*) || '/3' AS actual_value,
    'uq_indices: 3/3' AS expected_value,
    CASE WHEN count(*) = 3 THEN 'PASS' ELSE 'FAIL' END AS status,
    'uq_person_multi_ident, single_preferred partial index, and single_official partial index active' AS details
  FROM check_2_indices
),

-- ─── CHECK 3: Table tenure_vacancies & columns completeness ───────────────────
check_3_cols AS (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'tenure_vacancies'
    AND column_name IN (
      'id', 'tenure_id', 'person_id', 'vacancy_reason',
      'effective_date', 'notifying_authority', 'gazette_notification_ref',
      'notes', 'data_status', 'provenance_id', 'created_at', 'updated_at'
    )
),
check_3_cte AS (
  SELECT
    'check_03' AS check_id,
    'tenure_vacancies table and column schema completeness' AS check_name,
    'columns: ' || count(*) || '/12' AS actual_value,
    'columns: 12/12' AS expected_value,
    CASE WHEN count(*) = 12 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Table public.tenure_vacancies registered with all 12 expected columns' AS details
  FROM check_3_cols
),

-- ─── CHECK 4: tenure_vacancies terminal uniqueness, composite FK & ON DELETE RESTRICT ─
check_4_fks AS (
  SELECT 
    c.conname,
    c.confdeltype,
    pg_get_constraintdef(c.oid) AS def
  FROM pg_constraint c
  JOIN pg_namespace n ON n.oid = c.connamespace
  WHERE n.nspname = 'public' 
    AND c.conrelid = 'public.tenure_vacancies'::regclass
    AND c.conname = 'fk_tenure_vacancies_tenure_person'
),
check_4_uq AS (
  SELECT c.conname
  FROM pg_constraint c
  JOIN pg_namespace n ON n.oid = c.connamespace
  WHERE n.nspname = 'public' 
    AND c.conrelid = 'public.tenure_vacancies'::regclass
    AND c.conname = 'uq_tenure_vacancies_single_terminal'
),
check_4_cte AS (
  SELECT
    'check_04' AS check_id,
    'tenure_vacancies terminal uniqueness and composite FK with RESTRICT' AS check_name,
    'composite_fk: ' || count(f.conname) || ', confdeltype: ' || coalesce(max(f.confdeltype), 'none') || ', terminal_uq: ' || count(u.conname) AS actual_value,
    'composite_fk: 1, confdeltype: r, terminal_uq: 1' AS expected_value,
    CASE 
      WHEN count(f.conname) = 1 AND max(f.confdeltype) = 'r' AND count(u.conname) = 1 
      THEN 'PASS' 
      ELSE 'FAIL' 
    END AS status,
    'Composite foreign key with ON DELETE RESTRICT (r) and single terminal vacancy uniqueness active' AS details
  FROM check_4_fks f
  FULL OUTER JOIN check_4_uq u ON true
),

-- ─── CHECK 5: Row Level Security & policies on new tables ─────────────────────
check_5_rls AS (
  SELECT c.relname, c.relrowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('person_multilingual_identities', 'tenure_vacancies')
),
check_5_policies AS (
  SELECT tablename, policyname
  FROM pg_policies
  WHERE schemaname = 'public' 
    AND tablename IN ('person_multilingual_identities', 'tenure_vacancies')
    AND policyname IN (
      'person_multilingual_identities_select_policy', 'person_multilingual_identities_service_role_all',
      'tenure_vacancies_select_policy', 'tenure_vacancies_service_role_all'
    )
),
check_5_cte AS (
  SELECT
    'check_05' AS check_id,
    'RLS enabled and SELECT/service_role policies deployed' AS check_name,
    'rls_enabled: ' || count(DISTINCT r.relname) FILTER (WHERE r.relrowsecurity = true) || '/2' ||
    ', policies: ' || count(DISTINCT p.policyname) || '/4' AS actual_value,
    'rls_enabled: 2/2, policies: 4/4' AS expected_value,
    CASE 
      WHEN count(DISTINCT r.relname) FILTER (WHERE r.relrowsecurity = true) = 2 AND count(DISTINCT p.policyname) = 4 
      THEN 'PASS' 
      ELSE 'FAIL' 
    END AS status,
    'RLS actively enabled and public SELECT / service_role ALL policies deployed on both tables' AS details
  FROM check_5_rls r
  CROSS JOIN check_5_policies p
),

-- ─── CHECK 6: elected_tenures composite key, tenure_status (NO DEFAULT), and jurisdiction expansion ─
check_6_uq AS (
  SELECT c.conname
  FROM pg_constraint c
  JOIN pg_namespace n ON n.oid = c.connamespace
  WHERE n.nspname = 'public' 
    AND c.conrelid = 'public.elected_tenures'::regclass
    AND c.conname = 'uq_elected_tenures_id_person'
),
check_6_status_col AS (
  SELECT column_name, column_default, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'elected_tenures' 
    AND column_name = 'tenure_status'
),
check_6_jt_cc AS (
  SELECT pg_get_constraintdef(c.oid) AS def
  FROM pg_constraint c
  JOIN pg_namespace n ON n.oid = c.connamespace
  WHERE n.nspname = 'public' 
    AND c.conrelid = 'public.elected_tenures'::regclass
    AND c.conname = 'elected_tenures_jurisdiction_type_check'
),
check_6_cte AS (
  SELECT
    'check_06' AS check_id,
    'elected_tenures composite key, tenure_status (NO DEFAULT), and jurisdiction expansion' AS check_name,
    'composite_uq: ' || count(DISTINCT u.conname) ||
    ', status_col: ' || count(DISTINCT s.column_name) ||
    ', default_is_null: ' || count(DISTINCT s.column_name) FILTER (WHERE s.column_default IS NULL) ||
    ', not_null: ' || count(DISTINCT s.column_name) FILTER (WHERE s.is_nullable = 'NO') ||
    ', has_state: ' || count(DISTINCT j.def) FILTER (WHERE j.def LIKE '%''state''%') ||
    ', has_nominated: ' || count(DISTINCT j.def) FILTER (WHERE j.def LIKE '%''nominated''%') AS actual_value,
    'composite_uq: 1, status_col: 1, default_is_null: 1, not_null: 1, has_state: 1, has_nominated: 1' AS expected_value,
    CASE 
      WHEN count(DISTINCT u.conname) = 1
       AND count(DISTINCT s.column_name) = 1
       AND count(DISTINCT s.column_name) FILTER (WHERE s.column_default IS NULL) = 1
       AND count(DISTINCT s.column_name) FILTER (WHERE s.is_nullable = 'NO') = 1
       AND count(DISTINCT j.def) FILTER (WHERE j.def LIKE '%''state''%') = 1
       AND count(DISTINCT j.def) FILTER (WHERE j.def LIKE '%''nominated''%') = 1
      THEN 'PASS' 
      ELSE 'FAIL' 
    END AS status,
    'uq_elected_tenures_id_person present, tenure_status column NOT NULL with NO DEFAULT, jurisdiction_type includes state & nominated' AS details
  FROM check_6_uq u
  CROSS JOIN check_6_status_col s
  CROSS JOIN check_6_jt_cc j
),

-- ─── CHECK 7: Bidirectional temporal integrity triggers & attachment verified ──
check_7_triggers AS (
  SELECT 
    t.tgname,
    c.relname AS table_name,
    p.proname AS func_name,
    t.tgtype
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_proc p ON p.oid = t.tgfoid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND t.tgname IN ('trg_validate_tenure_vacancy_invariants', 'trg_elected_tenures_immutable_fields')
    AND NOT t.tgisinternal
),
check_7_cte AS (
  SELECT
    'check_07' AS check_id,
    'bidirectional temporal integrity triggers attached to correct tables' AS check_name,
    'vacancy_trg_attached: ' || count(*) FILTER (WHERE tgname = 'trg_validate_tenure_vacancy_invariants' AND table_name = 'tenure_vacancies' AND func_name = 'fn_validate_tenure_vacancy_invariants') ||
    ', tenure_trg_attached: ' || count(*) FILTER (WHERE tgname = 'trg_elected_tenures_immutable_fields' AND table_name = 'elected_tenures' AND func_name = 'fn_prevent_tenure_history_mutation') AS actual_value,
    'vacancy_trg_attached: 1, tenure_trg_attached: 1' AS expected_value,
    CASE 
      WHEN count(*) FILTER (WHERE tgname = 'trg_validate_tenure_vacancy_invariants' AND table_name = 'tenure_vacancies' AND func_name = 'fn_validate_tenure_vacancy_invariants') = 1
       AND count(*) FILTER (WHERE tgname = 'trg_elected_tenures_immutable_fields' AND table_name = 'elected_tenures' AND func_name = 'fn_prevent_tenure_history_mutation') = 1
      THEN 'PASS' 
      ELSE 'FAIL' 
    END AS status,
    'trg_validate_tenure_vacancy_invariants correctly bound to tenure_vacancies; trg_elected_tenures_immutable_fields correctly bound to elected_tenures' AS details
  FROM check_7_triggers
),

-- ─── CHECK 8: elected_tenures population & post-backfill status distribution ──
check_8_pop AS (
  SELECT
    count(*) AS total_tenures,
    count(*) FILTER (WHERE tenure_status IS NULL) AS null_status,
    count(*) FILTER (WHERE tenure_status = 'ACTIVE') AS active_count,
    count(*) FILTER (WHERE tenure_status = 'COMPLETED') AS completed_count,
    count(*) FILTER (WHERE tenure_status = 'PROVISIONAL') AS provisional_count,
    count(*) FILTER (WHERE tenure_status IN ('VACATED_DEATH', 'VACATED_RESIGNATION', 'VACATED_DISQUALIFICATION', 'ANNULLED')) AS vacancy_count
  FROM public.elected_tenures
),
check_8_cte AS (
  SELECT
    'check_08' AS check_id,
    'elected_tenures tenure_status post-backfill distribution' AS check_name,
    'total: ' || total_tenures || ', null_status: ' || null_status || ', active: ' || active_count || ', completed: ' || completed_count || ', vacancy: ' || vacancy_count AS actual_value,
    'total: 0, null_status: 0, active: 0, completed: 0, vacancy: 0' AS expected_value,
    CASE 
      WHEN total_tenures = 0 AND null_status = 0 AND vacancy_count = 0 
      THEN 'PASS' 
      ELSE 'FAIL' 
    END AS status,
    'Staging elected_tenures row count is 0; zero null status rows; zero vacancy rows prior to data load' AS details
  FROM check_8_pop
),

-- ─── CHECK 9: National AC <-> PC mapping integrity & 0-violation baseline ─────
check_9_mapping_violations AS (
  SELECT cv.id
  FROM public.constituency_versions cv
  LEFT JOIN public.constituency_parliamentary_mappings cpm 
    ON cv.id = cpm.assembly_constituency_version_id AND cpm.is_current = true
  WHERE cv.is_current = true
  GROUP BY cv.id
  HAVING count(cpm.id) <> 1
),
check_9_counts AS (
  SELECT 
    count(*) FILTER (WHERE is_current = true) AS current_mappings,
    count(*) AS total_mappings
  FROM public.constituency_parliamentary_mappings
),
check_9_cte AS (
  SELECT
    'check_09' AS check_id,
    'national AC-PC mapping single-current-PC invariant and totals' AS check_name,
    'mapping_violations: ' || (SELECT count(*) FROM check_9_mapping_violations) ||
    ', current_mappings: ' || m.current_mappings ||
    ', total_mappings: ' || m.total_mappings AS actual_value,
    'mapping_violations: 0, current_mappings: 4123, total_mappings: 4249' AS expected_value,
    CASE 
      WHEN (SELECT count(*) FROM check_9_mapping_violations) = 0
       AND m.current_mappings = 4123
       AND m.total_mappings = 4249
      THEN 'PASS' 
      ELSE 'FAIL' 
    END AS status,
    'Zero current AC->PC mapping violations; exactly 4,123 current mappings and 4,249 total mappings preserved' AS details
  FROM check_9_counts m
),

-- ─── CHECK 10: Preserved national geography baselines (059-062 intact) ─────────
check_10_counts AS (
  SELECT 'states' AS entity, count(*) AS actual, 36 AS expected FROM public.states
  UNION ALL
  SELECT 'state_versions', count(*), 36 FROM public.state_versions
  UNION ALL
  SELECT 'parliamentary_constituencies', count(*), 543 FROM public.parliamentary_constituencies
  UNION ALL
  SELECT 'parliamentary_constituency_versions', count(*), 557 FROM public.parliamentary_constituency_versions
  UNION ALL
  SELECT 'constituencies', count(*), 4123 FROM public.constituencies
  UNION ALL
  SELECT 'constituency_versions', count(*), 4249 FROM public.constituency_versions
),
check_10_cte AS (
  SELECT
    'check_10' AS check_id,
    'preserved national geography baselines from migrations 059-062' AS check_name,
    'states: ' || max(CASE WHEN entity = 'states' THEN actual END) ||
    ', state_versions: ' || max(CASE WHEN entity = 'state_versions' THEN actual END) ||
    ', pcs: ' || max(CASE WHEN entity = 'parliamentary_constituencies' THEN actual END) ||
    ', pc_versions: ' || max(CASE WHEN entity = 'parliamentary_constituency_versions' THEN actual END) ||
    ', acs: ' || max(CASE WHEN entity = 'constituencies' THEN actual END) ||
    ', ac_versions: ' || max(CASE WHEN entity = 'constituency_versions' THEN actual END) AS actual_value,
    'states: 36, state_versions: 36, pcs: 543, pc_versions: 557, acs: 4123, ac_versions: 4249' AS expected_value,
    CASE 
      WHEN max(CASE WHEN entity = 'states' THEN actual END) = 36
       AND max(CASE WHEN entity = 'state_versions' THEN actual END) = 36
       AND max(CASE WHEN entity = 'parliamentary_constituencies' THEN actual END) = 543
       AND max(CASE WHEN entity = 'parliamentary_constituency_versions' THEN actual END) = 557
       AND max(CASE WHEN entity = 'constituencies' THEN actual END) = 4123
       AND max(CASE WHEN entity = 'constituency_versions' THEN actual END) = 4249
      THEN 'PASS' 
      ELSE 'FAIL' 
    END AS status,
    'All statutory electoral geography counts (36 states, 543 PCs/557 versions, 4,123 ACs/4,249 versions) remain intact' AS details
  FROM check_10_counts
)

-- ─── CONSOLIDATED UNIFIED RESULT SET ──────────────────────────────────────────
SELECT * FROM check_1_cte
UNION ALL
SELECT * FROM check_2_cte
UNION ALL
SELECT * FROM check_3_cte
UNION ALL
SELECT * FROM check_4_cte
UNION ALL
SELECT * FROM check_5_cte
UNION ALL
SELECT * FROM check_6_cte
UNION ALL
SELECT * FROM check_7_cte
UNION ALL
SELECT * FROM check_8_cte
UNION ALL
SELECT * FROM check_9_cte
UNION ALL
SELECT * FROM check_10_cte
ORDER BY check_id;
