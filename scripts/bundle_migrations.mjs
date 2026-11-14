// Retired: this generator maintained a hand-written subset of migrations and
// produced supabase/all_migrations_combined.sql, which is stale and must not be
// treated as a deployment source. Canonical migrations live in supabase/migrations.
console.error(
  'Deprecated migration bundler: no combined SQL file was generated. Use the reviewed files in supabase/migrations/ and the forward-only deployment runbook.'
);
process.exitCode = 1;
