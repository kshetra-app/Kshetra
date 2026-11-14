# Historical SQL artifacts

Files in this folder are retained solely as historical evidence. They are not
deployment inputs, schema authorities, or data restoration sources. Do not run
them against local, Staging, or Production databases.

The sole canonical source for new deployable schema changes is
[`../migrations/`](../migrations/), subject to the environment-specific
preflight and forward-only procedure in [`../../RUNBOOK_BACKUP_RECOVERY.md`](../../RUNBOOK_BACKUP_RECOVERY.md).

The root-level legacy filenames remain as fail-closed SQL stubs so old links
and operator habits stop before applying a stale snapshot.

The exact pre-change working-tree files were moved into this archive on
2026-11-14. They did not byte-match the files at the current Git `HEAD`, so
both on-disk versions were retained rather than silently discarding either
history. Neither archive is authoritative for current schema behavior.

| Archived file | Bytes | SHA-256 |
|---|---:|---|
| `all_migrations_combined_legacy.sql` | 2,654,950 | `adb01e6642c00e56f3e7c556cab08aeb66749435c7728322cd31bed7f04279f8` |
| `staging_master_schema_and_seed_legacy.sql` | 391,288 | `4fbfa586928463e4e02161476edb236ef5f71fc5a35d8ab2943c3c4ca224e38a` |
