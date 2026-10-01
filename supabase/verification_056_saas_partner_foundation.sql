-- ==============================================================================
-- verification_056_saas_partner_foundation.sql
--
-- Milestone: W021 — B2B Political SaaS & Public/Partner Developer API Foundation
-- Gate: W021-G2 — Migration 056 Verification
-- Purpose: SQL-level verification of Migration 056 schema state
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

  -- 3. Check foreign key relationships
  -- saas_applications -> saas_tenants
  -- saas_api_keys -> saas_tenants
  -- saas_api_keys -> saas_applications
  -- saas_usage_ledger -> saas_tenants
  -- saas_usage_ledger -> saas_api_keys
  SELECT count(*) INTO v_fk_count
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
    AND constraint_type = 'FOREIGN KEY'
    AND table_name IN ('saas_applications', 'saas_api_keys', 'saas_usage_ledger');

  IF v_fk_count < 5 THEN
    RAISE EXCEPTION 'CHECK FAILED: Expected at least 5 FK constraints, found %', v_fk_count;
  END IF;
  RAISE NOTICE '[PASS] All 5 foreign keys verified';

  -- 4. Check ON DELETE SET NULL on saas_usage_ledger.api_key_id
  SELECT confdeltype::text INTO v_ledger_on_delete
  FROM pg_constraint
  WHERE conrelid = 'public.saas_usage_ledger'::regclass
    AND contype = 'f'
    AND conname LIKE '%api_key_id%';

  -- 'n' represents SET NULL in pg_constraint.confdeltype ('a' = NO ACTION, 'r' = RESTRICT, 'c' = CASCADE, 'n' = SET NULL, 'd' = SET DEFAULT)
  IF v_ledger_on_delete <> 'n' THEN
    RAISE EXCEPTION 'CHECK FAILED: saas_usage_ledger.api_key_id FK must be ON DELETE SET NULL (confdeltype = n), found %', v_ledger_on_delete;
  END IF;
  RAISE NOTICE '[PASS] saas_usage_ledger.api_key_id ON DELETE SET NULL verified';

  -- 5. Check indexes exist (including partial active lookup index)
  SELECT count(*) INTO v_idx_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('saas_tenants', 'saas_applications', 'saas_api_keys', 'saas_usage_ledger')
    AND indexname IN ('idx_saas_tenants_status', 'idx_saas_applications_tenant', 'idx_saas_api_keys_lookup', 'idx_saas_api_keys_tenant', 'idx_saas_usage_ledger_tenant');

  IF v_idx_count <> 5 THEN
    RAISE EXCEPTION 'CHECK FAILED: Expected 5 performance/lookup indexes, found %', v_idx_count;
  END IF;
  RAISE NOTICE '[PASS] All 5 performance and lookup indexes verified';

  -- 6. Check RLS enabled and forced on all 4 tables
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
