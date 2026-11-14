-- Retired deployment path. The previous generated bundle has been preserved
-- under supabase/legacy_artifacts/ for historical review. It is incomplete and
-- must not be executed. The only canonical deployable SQL files are in
-- supabase/migrations/ and live changes must follow RUNBOOK_BACKUP_RECOVERY.md.
DO $$
BEGIN
  RAISE EXCEPTION 'LEGACY_SCHEMA_BUNDLE_RETIRED: use the reviewed forward-only migration process';
END
$$;
