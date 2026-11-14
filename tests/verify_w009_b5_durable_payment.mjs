console.error(
  'Retired integration test: it depended on a stale combined migration bundle and removed named Docker containers before setup. It is disabled to prevent accidental deletion or use of a non-canonical schema. Rebuild this test on an isolated Supabase replay before re-enabling it.'
);
process.exitCode = 1;
