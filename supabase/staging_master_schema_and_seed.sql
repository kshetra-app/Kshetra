-- Retired deployment path. The prior snapshot has been preserved under
-- supabase/legacy_artifacts/ for historical review. It is not an authoritative
-- schema or data source and must not be executed against any environment.
DO $$
BEGIN
  RAISE EXCEPTION 'LEGACY_STAGING_SNAPSHOT_RETIRED: use the reviewed forward-only migration process';
END
$$;
