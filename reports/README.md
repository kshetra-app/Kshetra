# Reports and evidence status

Reports in this folder are dated evidence snapshots, not live configuration or
deployment instructions. Their claims apply only to the code and environment
state recorded when they were generated.

## Current Supabase migration truth

Use [`supabase_migration_history_reconciliation_2026-11-14.md`](supabase_migration_history_reconciliation_2026-11-14.md)
for the current project-ref-specific migration ledger, schema/data comparison,
and Staging-only migration evidence. Use the current
[`../RUNBOOK_BACKUP_RECOVERY.md`](../RUNBOOK_BACKUP_RECOVERY.md) for operator
steps. The only canonical deployable SQL source is `supabase/migrations/`.

Older W005, W009, W016, W018, and W021 reports that call a combined SQL bundle
or staging master snapshot “canonical”, “active”, or a recovery guarantee are
historical claims and are superseded by the current reconciliation report.
Their text is retained for audit history; it must not be used to execute SQL,
repair migration history, or assert current recovery readiness.

## Evidence labels

- **Live verified:** queried from the specifically named environment at the
  time stated in the current report.
- **Repository verified:** inspected or tested against committed/local source;
  this does not prove a live environment has the same state.
- **Historical:** a past report or drill whose environment and date are given;
  not proof of current availability or recovery readiness.
- **Not proven:** required live evidence has not been collected.
