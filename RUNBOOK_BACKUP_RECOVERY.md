# Database Change and Recovery Runbook

**Last reviewed:** 2026-11-16
**Scope:** Supabase migration history, forward schema changes, and recovery evidence.
**Authoritative SQL source:** `supabase/migrations/`

## Current verified state

The repository contains 111 SQL migration files: versions `001`–`109` plus the historical prefixes `0035` and `0231`. Read-only checks were run against both explicit project references on 2026-11-16:

| Environment | Supabase project reference | Ledger entries | CLI environment label |
| ----------- | -------------------------- | -------------- | --------------------- |
| Staging     | `fkpigozcqnmcvofuksar`     | `099`–`109`    | `production`          |
| Production  | `ehfafcnimmjusyvplbah`     | `099`–`104`    | `unverified`          |

The project references identify the environments: `fkpigozcqnmcvofuksar` is the Staging project named `panIN-staging`, and `ehfafcnimmjusyvplbah` is the Production project named `kshetra-app's Project`. The Supabase CLI labels are retained above as observed metadata; they are not used to decide which database to change.

Supabase CLI 3.1.0's read-only `migration list` output shows versions `099`–`109` (Staging) and `099`–`104` (Production) as remote-only while also showing the same displayed versions as local-only. A separate read-only query of the ledger's raw `(version, name)` pairs confirms they match the corresponding repository filenames for every recorded version. The cause of the CLI duplication is unresolved. Do not use that output as a pending-migration allowlist or run a full-repository push.

The repository's migrations `001`–`098` are not recorded in either remote ledger. Existing database objects and data show that the databases are not empty, but they do not prove which exact historical SQL ran. The staging and production catalogs also differ. Therefore, missing ledger rows are **unreconciled historical evidence**, not permission to replay or mark the old versions applied.

Migrations `105` and `106` were applied to Staging only after a project-ref check, preflight, and dry run limited to those exact files. Migrations `107` and `108` were then applied only to Staging after live catalog review and isolated rollback tests. They remove client write permissions and obsolete client write policies on contributor KYC records while keeping authenticated reads and trusted API access. Migration `109` was subsequently applied to Staging to revoke broad client grants on a reviewed list of operational tables and tighten default privileges for future objects. The KYC record and event counts remain zero in Staging; Production has zero KYC records and does not have the KYC events table.

The 2026-11-16 read-only postflight confirmed the existing `migration_conflicts` table still contains 3 rows in each environment. In Staging it has RLS enabled and no direct `anon` or `authenticated` table grants; the checked default privileges for future public tables, sequences, and functions also omit those client roles. Production has the same 3 rows, but still grants those roles table privileges on `migration_conflicts` and includes them in default privileges. These are observed differences, not an assertion that every RLS policy permits row access. No data, schema, or migration ledger was changed during this read-only check. Production changes remain gated on a separate reviewed release after the Staging application checks pass.

The same day's Supabase backup-list checks returned `pitr_enabled: false` and no listed physical backups for either project. WALG was reported enabled, but that alone does not prove a recoverable restore point. Do not apply additional Production DDL until a recoverable backup or restore point is confirmed through the provider.

See [`reports/supabase_migration_history_reconciliation_2026-11-14.md`](reports/supabase_migration_history_reconciliation_2026-11-14.md) for the evidence, schema comparison, data-count comparison, and limitations.

The same report records a separate access-control exception on the extension-owned `public.spatial_ref_sys` table. Client write grants exist in both environments. The connected SQL role is not the table owner or a superuser, and the rollback-only local test showed it cannot revoke owner-issued grants. Do not treat this as resolved or add an ineffective migration; it needs an authorized owner/provider path.

## One source of truth

1. New deployable schema changes belong in `supabase/migrations/`, each in one uniquely versioned SQL file.
2. Migration files are append-only after application. Correct later behavior with a new forward migration; do not silently edit a migration already applied to any environment.
3. Do not create or deploy a second combined schema script, environment-specific copy of a migration, or seed file that purports to be an alternate schema definition.
4. Existing combined SQL, staging/production packages, and old generated recovery files are historical evidence only. They are not canonical deployment inputs and must not be pasted into SQL Editor or run with `psql` against a live database.
5. Seed/data restoration is a separate activity from schema migration. Use only verified, versioned data sources and explicit data reconciliation; do not copy Staging wholesale into Production.

[`supabase/README.md`](supabase/README.md) classifies the retained staging/production packages, verification files, rollback drafts, fixtures, and archived snapshots. The local Supabase seed hook is disabled because no reviewed standalone seed set currently exists.

## Safe procedure for a future migration

### Before preparing a live change

1. Work from a clean, reviewed commit and identify the exact target by Supabase project reference. Confirm that reference against the intended Railway environment's `SUPABASE_URL`; do not rely on the CLI's environment label. The Staging Railway service currently resolves to `fkpigozcqnmcvofuksar`.
2. Read the target ledger with `npx supabase migration list --remote=<project-ref>`. Save the output with the deployment record.
3. Review the migration SQL and classify every DDL and DML operation. Record affected tables, source-of-truth data, access policies, expected row-count changes, and rollback/repair strategy.
4. Reproduce the change on the isolated PostgreSQL 17/PostGIS replay environment. Verify the resulting catalog and relevant application paths.
5. Take/confirm a recoverable backup for the target and agree on the exact expected migration versions before deployment.

### Staging first

1. Prepare an isolated, temporary deployment work directory containing byte-for-byte copies of only the approved migration versions plus the target's already-recorded version files needed for CLI planning. Do not add a second committed SQL copy.
2. Compare SHA-256 hashes of the approved files against `supabase/migrations/`.
3. Run a dry run against the explicit Staging reference and confirm the output contains only the approved versions. Stop if it lists any historical version or unexpected SQL.
4. Apply only after the dry run matches the reviewed allowlist.
5. Re-query the ledger, relevant catalog definitions, security behavior, and source-of-truth aggregate counts. Run the API/mobile flows that depend on the migration. Record evidence and the resulting commit.

### Production

Production remains at ledger `099`–`104`; no KYC migrations `105`–`108` have been applied there. Do not send the full local migration catalog or use `--include-all`. First complete the Staging application release and behavior verification, review Production-specific schema/data differences, and produce a separate reviewed allowlist with explicit preflight and postflight checks. Reconcile older history only when project-specific execution evidence and catalog verification support each assertion.

## Commands that are unsafe for the current live databases

Until historical adoption is formally resolved, do **not**:

- run `supabase db push` or `supabase db push --include-all` from the full repository against either live reference;
- run `supabase migration repair` for versions `001`–`098` based on object names or another environment's history;
- execute `supabase/all_migrations_combined.sql`, `supabase/staging_master_schema_and_seed.sql`, or a copied staging/production package against a live database;
- make Staging and Production appear equal by copying one environment's data or policies into the other without reviewed source evidence.
- claim that client mutation access to extension-owned `public.spatial_ref_sys` is fixed until an owner-authorized change is applied and verified in each environment.

The dry run with `--include-all` previously reported 102 migrations pending for each environment. Some contain data-changing SQL. That output is evidence of why the command is unsafe, not an instruction to apply it.

## Recovery claims and limits

- A clean isolated replay completed against the then-current 108-file migration snapshot, before Staging-only migrations 107 and 108 were added. The two new files were separately tested in rollback-only local transactions. Neither check proves historical live adoption, restores live canonical datasets, establishes live schema parity, or proves a complete production recovery.
- The committed migration catalog is the schema change history going forward. Historical deployment receipts for `001`–`098` have not been established for either project.
- Supabase backup/PITR availability, actual recovery point, and restore duration must be verified in the provider for each environment. The earlier RPO/RTO targets and drill summary are historical claims and are **not current proof** of a live recovery capability.
- Staging KYC schema and API/mobile local tests have evidence in the reconciliation report. At the latest pre-deploy check on 2026-11-14, Railway Staging health returned HTTP 200 but the new KYC status route returned HTTP 404. The app code still needs a Staging API deployment and post-deployment behavior check before the end-to-end feature is verified live.

## Verification

Run the static guard and its regression test:

```powershell
node scripts/verify-backup-recovery.mjs
node tests/backup-recovery.test.mjs
```

These checks validate repository consistency and safe guidance only. They do not connect to Supabase, prove a backup can be restored, or authorize a deployment. For a live ledger read, use the explicit project reference in the command above and record its output with the change review.
