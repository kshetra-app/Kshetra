console.error(
  'Retired live recovery drill: the former script contained destructive Staging operations and relied on stale SQL snapshots. It has been removed. Use RUNBOOK_BACKUP_RECOVERY.md and the recorded evidence instead.'
);
process.exitCode = 1;
