# Supabase database source map

## Single schema authority

[`migrations/`](migrations/) is the only canonical source for deployable schema
changes. Add new changes there as uniquely versioned, forward-only migrations.
Do not hand-copy a migration into an environment-specific package or combined
SQL file.

The live Staging and Production migration ledgers are not historically
reconciled with the older repository files. Follow the project-ref-specific
preflight in [`../RUNBOOK_BACKUP_RECOVERY.md`](../RUNBOOK_BACKUP_RECOVERY.md)
before any live change. A file being present in this repository does not mean
it has been applied to either environment.

## Other SQL files and directories

These are retained for history, verification, local test fixtures, or old
operator workflows. They are not alternate schema authorities and must not be
executed directly against a live environment. If a historical behavior is
still needed, review it and implement it as a new canonical migration:

- `legacy_artifacts/`: archived generated snapshots, preserved for audit only.
- `staging_packages/`, `production_packages/`, `staging_checkpoints/`, and
  root-level `staging_migration_package_*.sql` / `w021_5_staging_*` files:
  historical copies and reconciliation artifacts.
- `verification/`, root-level `verification_*.sql` / `verify_*.sql`, and
  `rollback_*.sql`: historical checks and rollback drafts. A rollback draft is
  not a safe automatic inverse of a live migration.
- `seed_w019_benchmarks.sql` and `staging_data_package_w020_g6.sql`: test or
  historical data fixtures, not live canonical data feeds.
- Root-level `diagnostic_*`, `inspect_*`, `fix_*`, and `remediation_*` SQL:
  one-off investigation artifacts requiring fresh review before any use.

The local Supabase seed hook is disabled in `config.toml`; there is no current
`supabase/seed.sql`. Historical demo/data inserts inside old migrations remain
part of those historical files and are not an approved production seeding
mechanism.
