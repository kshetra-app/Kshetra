-- ==============================================================================
-- rollback_staging_migration_package_041.sql
-- Deterministic Rollback Package for W014 Mandal Temporal Version Model Additions
-- Target: Staging Supabase (fkpigozcqnmcvofuksar)
-- ==============================================================================

BEGIN;

-- 1. Drop Triggers and Functions
DROP TRIGGER IF EXISTS trg_guard_mandal_current_version ON public.mandals;
DROP FUNCTION IF EXISTS public.fn_guard_mandal_current_version();

DROP TRIGGER IF EXISTS trg_guard_mandal_version_retirement ON public.mandal_versions;
DROP FUNCTION IF EXISTS public.fn_guard_mandal_version_retirement();

DROP FUNCTION IF EXISTS public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID);

-- 2. Drop Anchor Constraints and Column
ALTER TABLE public.mandals DROP CONSTRAINT IF EXISTS fk_mandals_current_version_same_anchor;
DROP INDEX IF EXISTS public.idx_mandals_current_version_id;
ALTER TABLE public.mandals DROP COLUMN IF EXISTS current_version_id;

-- 3. Drop Mandal Versions Table and Indexes
DROP TABLE IF EXISTS public.mandal_versions CASCADE;

-- 4. Revoke and Drop Dedicated Boundary Roles
REVOKE ALL ON SCHEMA public FROM panin_boundary_definer;
DROP ROLE IF EXISTS panin_boundary_definer;
DROP ROLE IF EXISTS panin_boundary_admin;

COMMIT;
