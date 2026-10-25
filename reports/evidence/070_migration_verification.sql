-- ==============================================================================
-- reports/evidence/070_migration_verification.sql
-- Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
-- Authority: CTO DIRECTIVE W022-CTO-REMEDIATION-006 (Section B & C)
-- Target: Real Disposable Local PostgreSQL 16 (w022-verify-postgres / w022_remediation_db)
-- ==============================================================================

\set ON_ERROR_STOP on
\echo '=== 1. VERIFY TABLE PRESENCE & RLS STATUS ==='
SELECT
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('webhook_subscriptions', 'webhook_events', 'webhook_deliveries')
ORDER BY tablename;

\echo '=== 2. VERIFY COMPOSITE FOREIGN KEYS & APPLICATION ISOLATION ==='
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
WHERE connamespace = 'public'::regnamespace
  AND conname IN (
    'fk_webhook_sub_tenant_app',
    'fk_webhook_events_tenant_app',
    'fk_webhook_deliv_tenant_sub',
    'fk_webhook_deliv_tenant_event',
    'uq_webhook_deliv_sub_event',
    'uq_webhook_events_tenant_id'
  )
ORDER BY conname;

\echo '=== 3. VERIFY SCOPED IDEMPOTENCY UNIQUE INDEX ==='
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN ('uq_webhook_events_tenant_app_idempotency', 'idx_webhook_events_tenant_created')
ORDER BY indexname;

\echo '=== 4. VERIFY FUNCTION SECURITY DEFINER & FIXED SEARCH_PATH ==='
SELECT
    proname AS function_name,
    prosecdef AS security_definer,
    proconfig AS search_path_config,
    pg_get_function_identity_arguments(oid) AS identity_arguments
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'fn_webhook_events_prevent_mutation',
    'fn_purge_expired_webhook_data',
    'fn_claim_webhook_batch',
    'fn_publish_webhook_event'
  )
ORDER BY proname;

\echo '=== 5. VERIFY TABLE-LEVEL DAC PRIVILEGES (SERVICE_ROLE, ANON, AUTHENTICATED) ==='
SELECT
    r.rolname,
    t.tablename,
    has_table_privilege(r.rolname, 'public.' || t.tablename, 'SELECT') AS can_select,
    has_table_privilege(r.rolname, 'public.' || t.tablename, 'INSERT') AS can_insert,
    has_table_privilege(r.rolname, 'public.' || t.tablename, 'UPDATE') AS can_update,
    has_table_privilege(r.rolname, 'public.' || t.tablename, 'DELETE') AS can_delete
FROM (VALUES ('service_role'), ('anon'), ('authenticated'), ('webhook_worker')) r(rolname)
CROSS JOIN (VALUES ('webhook_subscriptions'), ('webhook_events'), ('webhook_deliveries')) t(tablename)
WHERE EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r.rolname)
ORDER BY t.tablename, r.rolname;

\echo '=== 6. VERIFY FUNCTION EXECUTION PRIVILEGES ==='
SELECT
    r.rolname,
    p.proname,
    has_function_privilege(r.rolname, p.oid, 'EXECUTE') AS can_execute
FROM (VALUES ('service_role'), ('anon'), ('authenticated'), ('webhook_worker')) r(rolname)
CROSS JOIN (
    SELECT oid, proname
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname IN ('fn_purge_expired_webhook_data', 'fn_claim_webhook_batch', 'fn_publish_webhook_event')
) p
WHERE EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r.rolname)
ORDER BY p.proname, r.rolname;

\echo '=== 7. VERIFY IMMUTABILITY TRIGGER REGISTRATION ==='
SELECT
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    tgenabled AS trigger_enabled,
    pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgname = 'trg_webhook_events_immutable';
