-- ==============================================================================
-- W021.5: Post-064 Consolidated Gate Verification Suite (064-R9 Hardened)
-- Target: Staging Supabase (fkpigozcqnmcvofuksar / panIN-staging)
-- Environment: Staging only
-- Mode: Strictly READ-ONLY (ZERO mutations, ZERO DDL changes)
-- Structure: Exactly ONE consolidated result set returning explicit PASS/FAIL rows
-- Authority: Master Execution Framework Amendment v1.2 / Rule IV-001
-- ==============================================================================

WITH
-- ─── CHECK 1: Table organization_multilingual_names & columns completeness ────
check_1_cols AS (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'organization_multilingual_names'
    AND column_name IN (
      'id', 'organization_id', 'language_code', 'script_code',
      'representation_type', 'name_value', 'short_name_value',
      'is_preferred', 'is_official', 'valid_from', 'valid_to',
      'source', 'data_status', 'provenance_id', 'created_at', 'updated_at'
    )
),
check_1_cte AS (
  SELECT
    'check_01' AS check_id,
    'organization_multilingual_names table and column schema completeness' AS check_name,
    'columns: ' || count(*) || '/16' AS actual_value,
    'columns: 16/16' AS expected_value,
    CASE WHEN count(*) = 16 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Table public.organization_multilingual_names registered with all 16 expected columns' AS details
  FROM check_1_cols
),

-- ─── CHECK 2: Table organization_aliases & columns completeness ───────────────
check_2_cols AS (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'organization_aliases'
    AND column_name IN (
      'id', 'raw_lookup_key', 'raw_original_string', 'organization_id',
      'alias_type', 'jurisdiction_scope', 'valid_from', 'valid_to',
      'confidence', 'provenance_id', 'created_at', 'updated_at'
    )
),
check_2_cte AS (
  SELECT
    'check_02' AS check_id,
    'organization_aliases table and column schema completeness' AS check_name,
    'columns: ' || count(*) || '/12' AS actual_value,
    'columns: 12/12' AS expected_value,
    CASE WHEN count(*) = 12 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Table public.organization_aliases registered with all 12 expected columns' AS details
  FROM check_2_cols
),

-- ─── CHECK 3: Table organization_symbols & columns completeness ───────────────
check_3_cols AS (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'organization_symbols'
    AND column_name IN (
      'id', 'organization_id', 'symbol_name', 'symbol_url',
      'jurisdiction_scope', 'valid_from', 'valid_to', 'is_current',
      'statutory_order_ref', 'data_status', 'provenance_id', 'created_at', 'updated_at'
    )
),
check_3_cte AS (
  SELECT
    'check_03' AS check_id,
    'organization_symbols table and column schema completeness' AS check_name,
    'columns: ' || count(*) || '/13' AS actual_value,
    'columns: 13/13' AS expected_value,
    CASE WHEN count(*) = 13 THEN 'PASS' ELSE 'FAIL' END AS status,
    'Table public.organization_symbols registered with all 13 expected columns' AS details
  FROM check_3_cols
),

-- ─── CHECK 4: Organization aliases & symbols temporal invariants & triggers ───
check_4_invariants AS (
  -- Confirm absence of contradictory static unique indexes on organization_aliases
  SELECT
    (SELECT count(*) FROM pg_index ix
     JOIN pg_class t ON t.oid = ix.indrelid
     JOIN pg_class i ON i.oid = ix.indexrelid
     JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'public' AND t.relname = 'organization_aliases'
       AND i.relname IN ('uq_org_alias_national', 'uq_org_alias_jurisdictional')) AS contradictory_alias_indexes,
    -- Query non-unique performance indexes
    (SELECT count(*) FROM pg_index ix
     JOIN pg_class t ON t.oid = ix.indrelid
     JOIN pg_class i ON i.oid = ix.indexrelid
     JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'public' AND t.relname = 'organization_aliases'
       AND i.relname IN ('idx_org_aliases_key', 'idx_org_aliases_dates')) AS alias_lookup_indexes,
    -- Trigger attachment and function definitions
    (SELECT count(*) FROM pg_trigger trg
     JOIN pg_class t ON t.oid = trg.tgrelid
     JOIN pg_namespace n ON n.oid = t.relnamespace
     JOIN pg_proc p ON p.oid = trg.tgfoid
     WHERE n.nspname = 'public' AND t.relname = 'organization_aliases'
       AND trg.tgname = 'trg_validate_org_alias_temporal'
       AND p.proname = 'fn_validate_org_alias_temporal_invariants') AS alias_trigger,
    (SELECT count(*) FROM pg_trigger trg
     JOIN pg_class t ON t.oid = trg.tgrelid
     JOIN pg_namespace n ON n.oid = t.relnamespace
     JOIN pg_proc p ON p.oid = trg.tgfoid
     WHERE n.nspname = 'public' AND t.relname = 'organization_symbols'
       AND trg.tgname = 'trg_validate_org_symbol_temporal'
       AND p.proname = 'fn_validate_org_symbol_temporal_invariants') AS symbol_trigger,
    -- Actual CHECK expressions (format-resilient: valid_to IS NULL and valid_to >= valid_from)
    (SELECT count(*) FROM pg_constraint c
     JOIN pg_namespace n ON n.oid = c.connamespace
     WHERE n.nspname = 'public'
       AND c.conname = 'chk_org_alias_valid_dates'
       AND pg_get_constraintdef(c.oid) ~* 'valid_to\s+IS\s+NULL'
       AND pg_get_constraintdef(c.oid) ~* 'valid_to\s*>=\s*valid_from') AS alias_date_check,
    (SELECT count(*) FROM pg_constraint c
     JOIN pg_namespace n ON n.oid = c.connamespace
     WHERE n.nspname = 'public'
       AND c.conname = 'chk_org_symbol_valid_dates'
       AND pg_get_constraintdef(c.oid) ~* 'valid_to\s+IS\s+NULL'
       AND pg_get_constraintdef(c.oid) ~* 'valid_to\s*>=\s*valid_from') AS symbol_date_check,
    (SELECT count(*) FROM pg_constraint c
     JOIN pg_namespace n ON n.oid = c.connamespace
     WHERE n.nspname = 'public'
       AND c.conname = 'chk_org_multi_name_valid_dates'
       AND pg_get_constraintdef(c.oid) ~* 'valid_to\s+IS\s+NULL'
       AND pg_get_constraintdef(c.oid) ~* 'valid_to\s*>=\s*valid_from') AS multi_name_date_check,
    -- Function body inspection: Alias temporal function contains advisory lock, ordering, overlap check, open-ended valid_to, and exception
    (SELECT count(*) FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'fn_validate_org_alias_temporal_invariants'
       AND p.prosrc ~* 'pg_advisory_xact_lock'
       AND p.prosrc ~* '6401'
       AND p.prosrc ~* 'v_lock_key_old\s*<\s*v_lock_key_new'
       AND p.prosrc ~* 'TEMPORAL_INVARIANT_VIOLATION'
       AND p.prosrc ~* '9999-12-31') AS alias_fn_body_ok,
    -- Function body inspection: Symbol temporal function contains advisory lock, ordering, current exclusivity, open-ended valid_to, and exception
    (SELECT count(*) FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'fn_validate_org_symbol_temporal_invariants'
       AND p.prosrc ~* 'pg_advisory_xact_lock'
       AND p.prosrc ~* '6402'
       AND p.prosrc ~* 'is_current\s*=\s*true'
       AND p.prosrc ~* 'TEMPORAL_INVARIANT_VIOLATION'
       AND p.prosrc ~* '9999-12-31') AS symbol_fn_body_ok
),
check_4_cte AS (
  SELECT
    'check_04' AS check_id,
    'organization aliases and symbols temporal integrity constraints, functions and triggers' AS check_name,
    'contradictory_alias_indexes: ' || contradictory_alias_indexes || '/0, alias_lookup_indexes: ' || alias_lookup_indexes || '/2, alias_trigger: ' || alias_trigger || '/1, symbol_trigger: ' || symbol_trigger || '/1, date_checks: ' || (alias_date_check + symbol_date_check + multi_name_date_check) || '/3, fn_bodies: ' || (alias_fn_body_ok + symbol_fn_body_ok) || '/2' AS actual_value,
    'contradictory_alias_indexes: 0/0, alias_lookup_indexes: 2/2, alias_trigger: 1/1, symbol_trigger: 1/1, date_checks: 3/3, fn_bodies: 2/2' AS expected_value,
    CASE 
      WHEN contradictory_alias_indexes = 0
       AND alias_lookup_indexes = 2
       AND alias_trigger = 1 
       AND symbol_trigger = 1 
       AND alias_date_check = 1 
       AND symbol_date_check = 1 
       AND multi_name_date_check = 1 
       AND alias_fn_body_ok = 1
       AND symbol_fn_body_ok = 1
      THEN 'PASS' 
      ELSE 'FAIL' 
    END AS status,
    'Temporal non-overlap triggers bound to valid functions with verified advisory locks and error invariants, lookup indexes present, and contradictory static unique indexes eliminated' AS details
  FROM check_4_invariants
),

-- ─── CHECK 5: organization_relationships check constraint expanded ────────────
check_5_cc AS (
  SELECT pg_get_constraintdef(c.oid) AS def
  FROM pg_constraint c
  JOIN pg_namespace n ON n.oid = c.connamespace
  WHERE n.nspname = 'public' 
    AND c.conrelid = 'public.organization_relationships'::regclass
    AND c.conname = 'organization_relationships_relationship_type_check'
),
check_5_cte AS (
  SELECT
    'check_05' AS check_id,
    'organization_relationships relationship_type includes split_from, renamed_to, merged_into' AS check_name,
    'has_split: ' || count(*) FILTER (WHERE def LIKE '%''split_from''%') ||
    ', has_renamed: ' || count(*) FILTER (WHERE def LIKE '%''renamed_to''%') ||
    ', has_merged: ' || count(*) FILTER (WHERE def LIKE '%''merged_into''%') AS actual_value,
    'has_split: 1, has_renamed: 1, has_merged: 1' AS expected_value,
    CASE 
      WHEN count(*) FILTER (WHERE def LIKE '%''split_from''%') = 1
       AND count(*) FILTER (WHERE def LIKE '%''renamed_to''%') = 1
       AND count(*) FILTER (WHERE def LIKE '%''merged_into''%') = 1
      THEN 'PASS' 
      ELSE 'FAIL' 
    END AS status,
    'organization_relationships_relationship_type_check expanded to include splits, renamings, and mergers' AS details
  FROM check_5_cc
),

-- ─── CHECK 6: political_organizations recognition_level & synthetic independent prohibition ─
check_6_metrics AS (
  SELECT
    (SELECT count(*) FROM pg_constraint c
     JOIN pg_namespace n ON n.oid = c.connamespace
     WHERE n.nspname = 'public'
       AND c.conrelid = 'public.political_organizations'::regclass
       AND c.conname = 'political_organizations_recognition_level_check'
       AND pg_get_constraintdef(c.oid) NOT LIKE '%''independent''%') AS recog_clean,
    (SELECT count(*) FROM pg_constraint c
     JOIN pg_namespace n ON n.oid = c.connamespace
     WHERE n.nspname = 'public'
       AND c.conrelid = 'public.political_organizations'::regclass
       AND c.conname = 'chk_prohibit_synthetic_independent'
       -- Semantic Check 1: exact prohibited IDs
       AND pg_get_constraintdef(c.oid) ~* 'ORG-INDEPENDENT'
       AND pg_get_constraintdef(c.oid) ~* 'ORG-PARTY-IND'
       AND pg_get_constraintdef(c.oid) ~* 'ORG-PARTY-INDP'
       AND pg_get_constraintdef(c.oid) ~* 'ORG-PARTY-INDEPENDENT'
       -- Semantic Check 2: pattern id ILIKE %indep% (handles PostgreSQL text rendering: NOT ILIKE or !~~*)
       AND pg_get_constraintdef(c.oid) ~* '(id\s+!\~\~\*\s+''%indep%''|id\s+NOT\s+ILIKE\s+''%indep%'')'
       -- Semantic Check 3: exact prohibited EC party codes
       AND pg_get_constraintdef(c.oid) ~* 'ec_party_code'
       AND pg_get_constraintdef(c.oid) ~* '''IND'''
       AND pg_get_constraintdef(c.oid) ~* '''IND-IND'''
       -- Semantic Check 4: pattern ec_party_code ILIKE %indep% (handles NOT ILIKE or !~~*)
       AND pg_get_constraintdef(c.oid) ~* '(ec_party_code\s+!\~\~\*\s+''%indep%''|ec_party_code\s+NOT\s+ILIKE\s+''%indep%'')') AS synth_clean
),
check_6_cte AS (
  SELECT
    'check_06' AS check_id,
    'prohibition of independent recognition level and synthetic independent party IDs' AS check_name,
    'no_independent_in_enum: ' || recog_clean || ', synth_prohibited: ' || synth_clean AS actual_value,
    'no_independent_in_enum: 1, synth_prohibited: 1' AS expected_value,
    CASE 
      WHEN recog_clean = 1 AND synth_clean = 1 THEN 'PASS' 
      ELSE 'FAIL' 
    END AS status,
    'Independent excluded from recognition_level enum and complete synthetic independent namespace prohibited by constraint' AS details
  FROM check_6_metrics
),

-- ─── CHECK 7: Row Level Security enabled and public SELECT policies deployed ──
check_7_metrics AS (
  SELECT
    (SELECT count(*) FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname IN ('organization_multilingual_names', 'organization_aliases', 'organization_symbols')
       AND c.relrowsecurity = true) AS rls_enabled_count,
    (SELECT count(*) FROM pg_policies
     WHERE schemaname = 'public'
       AND (
         (tablename = 'organization_multilingual_names' AND policyname = 'p_select_org_multilingual_names') OR
         (tablename = 'organization_aliases' AND policyname = 'p_select_org_aliases') OR
         (tablename = 'organization_symbols' AND policyname = 'p_select_org_symbols')
       )) AS policy_count
),
check_7_cte AS (
  SELECT
    'check_07' AS check_id,
    'Row Level Security enabled and public read policies deployed on all 3 new tables' AS check_name,
    'rls_enabled: ' || rls_enabled_count || '/3, policies: ' || policy_count || '/3' AS actual_value,
    'rls_enabled: 3/3, policies: 3/3' AS expected_value,
    CASE 
      WHEN rls_enabled_count = 3 AND policy_count = 3 THEN 'PASS' 
      ELSE 'FAIL' 
    END AS status,
    'RLS enabled and public read policies deployed on organization_multilingual_names, organization_aliases, and organization_symbols' AS details
  FROM check_7_metrics
),

-- ─── CHECK 8: Exact 8 Foreign Key Mappings, Catalog Metadata & Delete Actions ─
check_8_fks AS (
  SELECT
    c.conname,
    n_src.nspname || '.' || t_src.relname AS source_table,
    (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = c.conrelid AND a.attnum = c.conkey[1]) AS source_col,
    n_tgt.nspname || '.' || t_tgt.relname AS target_table,
    (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = c.confrelid AND a.attnum = c.confkey[1]) AS target_col,
    c.confdeltype::text AS delete_action -- 'c' = CASCADE, 'r' = RESTRICT, 'a' = NO ACTION
  FROM pg_constraint c
  JOIN pg_class t_src ON t_src.oid = c.conrelid
  JOIN pg_namespace n_src ON n_src.oid = t_src.relnamespace
  JOIN pg_class t_tgt ON t_tgt.oid = c.confrelid
  JOIN pg_namespace n_tgt ON n_tgt.oid = t_tgt.relnamespace
  WHERE n_src.nspname = 'public'
    AND c.contype = 'f'
    AND t_src.relname IN (
      'organization_multilingual_names',
      'organization_aliases',
      'organization_symbols'
    )
),
check_8_metrics AS (
  SELECT
    count(*) AS total_fks,
    -- 1. organization_multilingual_names.organization_id -> political_organizations.id (CASCADE)
    count(*) FILTER (WHERE source_table = 'public.organization_multilingual_names' AND source_col = 'organization_id' AND target_table = 'public.political_organizations' AND target_col = 'id' AND delete_action = 'c') AS fk_multi_org,
    -- 2. organization_multilingual_names.provenance_id -> provenance_records.id (RESTRICT)
    count(*) FILTER (WHERE source_table = 'public.organization_multilingual_names' AND source_col = 'provenance_id' AND target_table = 'public.provenance_records' AND target_col = 'id' AND delete_action = 'r') AS fk_multi_prov,
    -- 3. organization_aliases.organization_id -> political_organizations.id (CASCADE)
    count(*) FILTER (WHERE source_table = 'public.organization_aliases' AND source_col = 'organization_id' AND target_table = 'public.political_organizations' AND target_col = 'id' AND delete_action = 'c') AS fk_alias_org,
    -- 4. organization_aliases.jurisdiction_scope -> states.code (RESTRICT)
    count(*) FILTER (WHERE source_table = 'public.organization_aliases' AND source_col = 'jurisdiction_scope' AND target_table = 'public.states' AND target_col = 'code' AND delete_action = 'r') AS fk_alias_state,
    -- 5. organization_aliases.provenance_id -> provenance_records.id (RESTRICT)
    count(*) FILTER (WHERE source_table = 'public.organization_aliases' AND source_col = 'provenance_id' AND target_table = 'public.provenance_records' AND target_col = 'id' AND delete_action = 'r') AS fk_alias_prov,
    -- 6. organization_symbols.organization_id -> political_organizations.id (CASCADE)
    count(*) FILTER (WHERE source_table = 'public.organization_symbols' AND source_col = 'organization_id' AND target_table = 'public.political_organizations' AND target_col = 'id' AND delete_action = 'c') AS fk_symbol_org,
    -- 7. organization_symbols.jurisdiction_scope -> states.code (RESTRICT)
    count(*) FILTER (WHERE source_table = 'public.organization_symbols' AND source_col = 'jurisdiction_scope' AND target_table = 'public.states' AND target_col = 'code' AND delete_action = 'r') AS fk_symbol_state,
    -- 8. organization_symbols.provenance_id -> provenance_records.id (RESTRICT)
    count(*) FILTER (WHERE source_table = 'public.organization_symbols' AND source_col = 'provenance_id' AND target_table = 'public.provenance_records' AND target_col = 'id' AND delete_action = 'r') AS fk_symbol_prov
  FROM check_8_fks
),
check_8_cte AS (
  SELECT
    'check_08' AS check_id,
    'exact 8 foreign key mappings and referential delete actions verified via catalog metadata' AS check_name,
    'fks: ' || total_fks || '/8' ||
    ', cascade_org_fks: ' || (fk_multi_org + fk_alias_org + fk_symbol_org) || '/3' ||
    ', restrict_state_fks: ' || (fk_alias_state + fk_symbol_state) || '/2' ||
    ', restrict_prov_fks: ' || (fk_multi_prov + fk_alias_prov + fk_symbol_prov) || '/3' AS actual_value,
    'fks: 8/8, cascade_org_fks: 3/3, restrict_state_fks: 2/2, restrict_prov_fks: 3/3' AS expected_value,
    CASE 
      WHEN total_fks = 8
       AND fk_multi_org = 1 AND fk_multi_prov = 1
       AND fk_alias_org = 1 AND fk_alias_state = 1 AND fk_alias_prov = 1
       AND fk_symbol_org = 1 AND fk_symbol_state = 1 AND fk_symbol_prov = 1
      THEN 'PASS' 
      ELSE 'FAIL' 
    END AS status,
    'Exact 8 source-column to target-column foreign key mappings and delete actions (CASCADE for orgs, RESTRICT for states/provenance) verified in pg_catalog' AS details
  FROM check_8_metrics
),

-- ─── CHECK 9: Provenance Column NOT NULL & Referential Integrity (No Orphans) ─
check_9_provenance AS (
  SELECT
    -- NOT NULL constraint enforcement in information_schema
    (SELECT count(*) FROM information_schema.columns 
     WHERE table_schema = 'public' 
       AND table_name = 'organization_multilingual_names' 
       AND column_name = 'provenance_id' 
       AND is_nullable = 'NO') AS multi_not_null,
    (SELECT count(*) FROM information_schema.columns 
     WHERE table_schema = 'public' 
       AND table_name = 'organization_aliases' 
       AND column_name = 'provenance_id' 
       AND is_nullable = 'NO') AS alias_not_null,
    (SELECT count(*) FROM information_schema.columns 
     WHERE table_schema = 'public' 
       AND table_name = 'organization_symbols' 
       AND column_name = 'provenance_id' 
       AND is_nullable = 'NO') AS symbol_not_null,
    -- Data-level null counts
    (SELECT count(*) FROM public.organization_multilingual_names WHERE provenance_id IS NULL) AS multi_null_rows,
    (SELECT count(*) FROM public.organization_aliases WHERE provenance_id IS NULL) AS alias_null_rows,
    (SELECT count(*) FROM public.organization_symbols WHERE provenance_id IS NULL) AS symbol_null_rows,
    -- Referential orphan detection
    (SELECT count(*) FROM public.organization_multilingual_names m
     WHERE m.provenance_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.provenance_records p WHERE p.id = m.provenance_id)) AS multi_orphaned,
    (SELECT count(*) FROM public.organization_aliases a
     WHERE a.provenance_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.provenance_records p WHERE p.id = a.provenance_id)) AS alias_orphaned,
    (SELECT count(*) FROM public.organization_symbols s
     WHERE s.provenance_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.provenance_records p WHERE p.id = s.provenance_id)) AS symbol_orphaned
),
check_9_cte AS (
  SELECT
    'check_09' AS check_id,
    'provenance NOT NULL enforcement and referential integrity (zero nulls, zero orphans)' AS check_name,
    'not_null_cols: ' || (multi_not_null + alias_not_null + symbol_not_null) || '/3' ||
    ', null_rows: ' || (multi_null_rows + alias_null_rows + symbol_null_rows) ||
    ', orphaned_rows: ' || (multi_orphaned + alias_orphaned + symbol_orphaned) AS actual_value,
    'not_null_cols: 3/3, null_rows: 0, orphaned_rows: 0' AS expected_value,
    CASE 
      WHEN multi_not_null = 1 AND alias_not_null = 1 AND symbol_not_null = 1
       AND (multi_null_rows + alias_null_rows + symbol_null_rows + multi_orphaned + alias_orphaned + symbol_orphaned) = 0 
      THEN 'PASS' 
      ELSE 'FAIL' 
    END AS status,
    'provenance_id is strictly NOT NULL across all 3 tables with zero null rows and zero unresolvable orphan records' AS details
  FROM check_9_provenance
),

-- ─── CHECK 10: Strict Synthetic Independent Exclusion Counts ─────────────────
check_10_independents AS (
  SELECT
    (SELECT count(*) FROM public.political_organizations WHERE recognition_level = 'independent') AS synth_recog_count,
    (SELECT count(*) FROM public.political_organizations 
     WHERE id IN ('ORG-INDEPENDENT', 'ORG-PARTY-IND', 'ORG-PARTY-INDP', 'ORG-PARTY-INDEPENDENT')
        OR id ILIKE '%indep%') AS synth_slug_count,
    (SELECT count(*) FROM public.political_organizations 
     WHERE ec_party_code IN ('IND', 'IND-IND')
        OR ec_party_code ILIKE '%indep%') AS synth_code_count
),
check_10_cte AS (
  SELECT
    'check_10' AS check_id,
    'strict synthetic independent exclusion counts (zero synthetic slugs, codes, or recognition levels)' AS check_name,
    'synth_recog_count: ' || synth_recog_count || ', synth_slug_count: ' || synth_slug_count || ', synth_code_count: ' || synth_code_count AS actual_value,
    'synth_recog_count: 0, synth_slug_count: 0, synth_code_count: 0' AS expected_value,
    CASE 
      WHEN (synth_recog_count + synth_slug_count + synth_code_count) = 0 
      THEN 'PASS' 
      ELSE 'FAIL' 
    END AS status,
    'Zero synthetic independent organizations present in public.political_organizations across slugs, EC codes, and recognition levels' AS details
  FROM check_10_independents
),

-- ─── CHECK 11: Consolidated Post-064 Gate Aggregate Verification Determination ─
check_1_to_10_union AS (
  SELECT status FROM check_1_cte
  UNION ALL
  SELECT status FROM check_2_cte
  UNION ALL
  SELECT status FROM check_3_cte
  UNION ALL
  SELECT status FROM check_4_cte
  UNION ALL
  SELECT status FROM check_5_cte
  UNION ALL
  SELECT status FROM check_6_cte
  UNION ALL
  SELECT status FROM check_7_cte
  UNION ALL
  SELECT status FROM check_8_cte
  UNION ALL
  SELECT status FROM check_9_cte
  UNION ALL
  SELECT status FROM check_10_cte
),
check_11_aggregate AS (
  SELECT
    count(*) AS total_checks,
    count(*) FILTER (WHERE status = 'PASS') AS passed_checks,
    count(*) FILTER (WHERE status <> 'PASS') AS failed_checks
  FROM check_1_to_10_union
),
check_11_cte AS (
  SELECT
    'check_11' AS check_id,
    'post-064 consolidated gate aggregate verdict (checks 01-10 all pass)' AS check_name,
    'passed: ' || passed_checks || '/' || total_checks || ' (failed: ' || failed_checks || ')' AS actual_value,
    'passed: 10/10 (failed: 0)' AS expected_value,
    CASE 
      WHEN passed_checks = 10 AND failed_checks = 0 
      THEN 'PASS' 
      ELSE 'FAIL' 
    END AS status,
    CASE 
      WHEN passed_checks = 10 AND failed_checks = 0 
      THEN 'POST_064_PASS: All 10 prerequisite governance, schema, temporal, 8-FK, provenance NOT NULL, and exclusion gates PASSED' 
      ELSE 'POST_064_FAIL: One or more checks failed verification' 
    END AS details
  FROM check_11_aggregate
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
UNION ALL
SELECT * FROM check_11_cte
ORDER BY check_id;
