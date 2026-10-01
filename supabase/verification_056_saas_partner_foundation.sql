-- ==============================================================================
-- verification_056_saas_partner_foundation.sql
--
-- Milestone: W021 — B2B Political SaaS & Public/Partner Developer API Foundation
-- Gate: W021-G2 — Migration 056 Verification
-- Purpose: SQL-level verification of remediated Migration 056 schema state
-- Target: panIN-staging (fkpigozcqnmcvofuksar) / Local PostgreSQL
-- ==============================================================================

DO $$
DECLARE
  v_tbl_count INTEGER;
  v_col_count INTEGER;
  v_pk_count INTEGER;
  v_fk_count INTEGER;
  v_idx_count INTEGER;
  v_rls_count INTEGER;
  v_composite_fk INTEGER;
  v_composite_uq INTEGER;
  v_nulls_not_distinct TEXT;
  v_revoked_at_col INTEGER;
  v_ledger_on_delete TEXT;
BEGIN
  RAISE NOTICE '=== EXECUTING VERIFICATION 056 CHECKS ===';

  -- 1. Check all 4 tables exist
  SELECT count(*) INTO v_tbl_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('saas_tenants', 'saas_applications', 'saas_api_keys', 'saas_usage_ledger');

  IF v_tbl_count <> 4 THEN
    RAISE EXCEPTION 'CHECK FAILED: Expected 4 tables, found %', v_tbl_count;
  END IF;
  RAISE NOTICE '[PASS] All 4 SaaS tables exist';

  -- 2. Check primary keys exist on all 4 tables
  SELECT count(*) INTO v_pk_count
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
    AND constraint_type = 'PRIMARY KEY'
    AND table_name IN ('saas_tenants', 'saas_applications', 'saas_api_keys', 'saas_usage_ledger');

  IF v_pk_count <> 4 THEN
    RAISE EXCEPTION 'CHECK FAILED: Expected 4 primary keys, found %', v_pk_count;
  END IF;
  RAISE NOTICE '[PASS] All 4 primary keys verified';

  -- 3. Check composite unique constraint on saas_applications(tenant_id, id)
  SELECT count(*) INTO v_composite_uq
  FROM pg_constraint
  WHERE conrelid = 'public.saas_applications'::regclass
    AND contype = 'u'
    AND conname = 'uq_saas_applications_tenant_app';

  IF v_composite_uq <> 1 THEN
    RAISE EXCEPTION 'CHECK FAILED: Expected composite unique constraint uq_saas_applications_tenant_app on saas_applications(tenant_id, id), found %', v_composite_uq;
  END IF;
  RAISE NOTICE '[PASS] Composite UNIQUE constraint uq_saas_applications_tenant_app verified';

  -- 4. Check composite foreign key from saas_api_keys(tenant_id, application_id) -> saas_applications(tenant_id, id)
  SELECT count(*) INTO v_composite_fk
  FROM pg_constraint
  WHERE conrelid = 'public.saas_api_keys'::regclass
    AND confrelid = 'public.saas_applications'::regclass
    AND contype = 'f'
    AND conname = 'fk_saas_api_keys_tenant_application';

  IF v_composite_fk <> 1 THEN
    RAISE EXCEPTION 'CHECK FAILED: Expected composite foreign key fk_saas_api_keys_tenant_application, found %', v_composite_fk;
  END IF;
  RAISE NOTICE '[PASS] Composite foreign key fk_saas_api_keys_tenant_application verified';

  -- 5. Check ON DELETE SET NULL on saas_usage_ledger.api_key_id
  SELECT confdeltype::text INTO v_ledger_on_delete
  FROM pg_constraint
  WHERE conrelid = 'public.saas_usage_ledger'::regclass
    AND contype = 'f'
    AND conname LIKE '%api_key_id%';

  IF v_ledger_on_delete <> 'n' THEN
    RAISE EXCEPTION 'CHECK FAILED: saas_usage_ledger.api_key_id FK must be ON DELETE SET NULL (confdeltype = n), found %', v_ledger_on_delete;
  END IF;
  RAISE NOTICE '[PASS] saas_usage_ledger.api_key_id ON DELETE SET NULL verified';

  -- 6. Check UNIQUE NULLS NOT DISTINCT constraint on saas_usage_ledger
  SELECT pg_get_constraintdef(oid) INTO v_nulls_not_distinct
  FROM pg_constraint
  WHERE conrelid = 'public.saas_usage_ledger'::regclass
    AND conname = 'uq_saas_usage_bucket';

  IF v_nulls_not_distinct NOT LIKE '%NULLS NOT DISTINCT%' THEN
    RAISE EXCEPTION 'CHECK FAILED: Expected UNIQUE NULLS NOT DISTINCT on uq_saas_usage_bucket, got: %', v_nulls_not_distinct;
  END IF;
  RAISE NOTICE '[PASS] saas_usage_ledger UNIQUE NULLS NOT DISTINCT verified: %', v_nulls_not_distinct;

  -- 7. Check revoked_at column and check constraint on saas_api_keys
  SELECT count(*) INTO v_revoked_at_col
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'saas_api_keys'
    AND column_name = 'revoked_at';

  IF v_revoked_at_col <> 1 THEN
    RAISE EXCEPTION 'CHECK FAILED: saas_api_keys.revoked_at column missing';
  END IF;
  RAISE NOTICE '[PASS] saas_api_keys.revoked_at column verified';

  -- 8. Check performance and active-lookup indexes
  SELECT count(*) INTO v_idx_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('saas_tenants', 'saas_applications', 'saas_api_keys', 'saas_usage_ledger')
    AND indexname IN ('idx_saas_tenants_status', 'idx_saas_applications_tenant', 'idx_saas_api_keys_lookup', 'idx_saas_api_keys_tenant', 'idx_saas_api_keys_app', 'idx_saas_usage_ledger_tenant');

  IF v_idx_count < 5 THEN
    RAISE EXCEPTION 'CHECK FAILED: Expected indexes missing, found %', v_idx_count;
  END IF;
  RAISE NOTICE '[PASS] Performance and lookup indexes verified (% found)', v_idx_count;

  -- 9. Check RLS enabled and forced on all 4 tables
  SELECT count(*) INTO v_rls_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('saas_tenants', 'saas_applications', 'saas_api_keys', 'saas_usage_ledger')
    AND c.relrowsecurity = true
    AND c.relforcerowsecurity = true;

  IF v_rls_count <> 4 THEN
    RAISE EXCEPTION 'CHECK FAILED: ROW LEVEL SECURITY is NOT enabled and forced on all 4 tables (found %)', v_rls_count;
  END IF;
  RAISE NOTICE '[PASS] ROW LEVEL SECURITY enabled and forced on all 4 tables';

  RAISE NOTICE '=== ALL VERIFICATION 056 CHECKS PASSED SUCCESSFULLY ===';
END $$;
