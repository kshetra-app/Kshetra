-- ==============================================================================
-- verification_057_w021_saas_tenant_isolation_remediation.sql
--
-- Milestone: W021 — B2B Political SaaS & Public/Partner Developer API Foundation
-- Gate: W021-G2 — Migration 057 Verification
-- Purpose: SQL-level verification of Migration 057 schema state
-- Target: panIN-staging (fkpigozcqnmcvofuksar) / Local PostgreSQL
-- ==============================================================================

DO $$
DECLARE
  v_composite_uq INTEGER;
  v_composite_fk INTEGER;
  v_nulls_not_distinct TEXT;
  v_revoked_at_col INTEGER;
  v_chk_revoked_at INTEGER;
BEGIN
  RAISE NOTICE '=== EXECUTING VERIFICATION 057 CHECKS ===';

  -- 1. Check composite unique constraint on saas_applications(tenant_id, id)
  SELECT count(*) INTO v_composite_uq
  FROM pg_constraint
  WHERE conrelid = 'public.saas_applications'::regclass
    AND contype = 'u'
    AND conname = 'uq_saas_applications_tenant_app';

  IF v_composite_uq <> 1 THEN
    RAISE EXCEPTION 'CHECK FAILED: Expected composite unique constraint uq_saas_applications_tenant_app on saas_applications(tenant_id, id), found %', v_composite_uq;
  END IF;
  RAISE NOTICE '[PASS] Composite UNIQUE constraint uq_saas_applications_tenant_app verified';

  -- 2. Check composite foreign key from saas_api_keys(tenant_id, application_id) -> saas_applications(tenant_id, id)
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

  -- 3. Check UNIQUE NULLS NOT DISTINCT constraint on saas_usage_ledger
  SELECT pg_get_constraintdef(oid) INTO v_nulls_not_distinct
  FROM pg_constraint
  WHERE conrelid = 'public.saas_usage_ledger'::regclass
    AND conname = 'uq_saas_usage_bucket';

  IF v_nulls_not_distinct NOT LIKE '%NULLS NOT DISTINCT%' THEN
    RAISE EXCEPTION 'CHECK FAILED: Expected UNIQUE NULLS NOT DISTINCT on uq_saas_usage_bucket, got: %', v_nulls_not_distinct;
  END IF;
  RAISE NOTICE '[PASS] saas_usage_ledger UNIQUE NULLS NOT DISTINCT verified: %', v_nulls_not_distinct;

  -- 4. Check revoked_at column exists on saas_api_keys
  SELECT count(*) INTO v_revoked_at_col
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'saas_api_keys'
    AND column_name = 'revoked_at';

  IF v_revoked_at_col <> 1 THEN
    RAISE EXCEPTION 'CHECK FAILED: saas_api_keys.revoked_at column missing';
  END IF;
  RAISE NOTICE '[PASS] saas_api_keys.revoked_at column verified';

  -- 5. Check check constraint chk_saas_api_keys_revoked_at exists
  SELECT count(*) INTO v_chk_revoked_at
  FROM pg_constraint
  WHERE conrelid = 'public.saas_api_keys'::regclass
    AND contype = 'c'
    AND conname = 'chk_saas_api_keys_revoked_at';

  IF v_chk_revoked_at <> 1 THEN
    RAISE EXCEPTION 'CHECK FAILED: chk_saas_api_keys_revoked_at check constraint missing';
  END IF;
  RAISE NOTICE '[PASS] chk_saas_api_keys_revoked_at check constraint verified';

  RAISE NOTICE '=== ALL VERIFICATION 057 CHECKS PASSED SUCCESSFULLY ===';
END $$;
