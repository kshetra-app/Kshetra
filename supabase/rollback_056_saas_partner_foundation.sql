-- ==============================================================================
-- rollback_056_saas_partner_foundation.sql
--
-- Milestone: W021 — B2B Political SaaS & Public/Partner Developer API Foundation
-- Gate: W021-G2 — Migration 056 Rollback (Contingency Rehearsal Only)
-- Target: panIN-staging (fkpigozcqnmcvofuksar) / Local PostgreSQL
-- ==============================================================================

BEGIN;

DROP TABLE IF EXISTS public.saas_usage_ledger CASCADE;
DROP TABLE IF EXISTS public.saas_api_keys CASCADE;
DROP TABLE IF EXISTS public.saas_applications CASCADE;
DROP TABLE IF EXISTS public.saas_tenants CASCADE;

COMMIT;
