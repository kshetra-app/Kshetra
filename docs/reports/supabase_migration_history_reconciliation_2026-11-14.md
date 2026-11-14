# Supabase Migration History Reconciliation

**Checked:** 2026-11-15
**Canonical schema source:** `supabase/migrations/`
**Scope:** Environment-specific migration reconciliation, Staging-only KYC and default-privilege corrections. Production was not changed.

## Environment identity

Poligram is one application with separate Staging and Production database environments. The Supabase references identify the actual database targets; the CLI's environment labels are metadata and were not used as the selector for a change.

| Environment | Supabase project reference | Observed Supabase CLI label | Railway evidence |
|---|---|---|---|
| Staging | `fkpigozcqnmcvofuksar` | `production` | Railway project `cooperative-education`, environment `Staging`, service `kshetra-api`; the configured `SUPABASE_URL` host is `fkpigozcqnmcvofuksar.supabase.co`; public service URL `https://kshetra-api-staging.up.railway.app` |
| Production | `ehfafcnimmjusyvplbah` | `unverified` | Not revalidated through the Railway CLI in this pass. No Production Railway or Supabase mutation was attempted. |

The Staging mapping was checked by comparing the Railway variable's Supabase host with the explicitly supplied Staging project reference. The Production Supabase reference is the one previously confirmed by the founder. The CLI's `production` label on the Staging project does not make it the Production database.

## Migration ledgers

The repository currently contains 111 migration files: versions `001`–`109`, plus two historically named files `0035` and `0231`. An isolated local Supabase replay applied all 110 repository files through `108`; it did not contact either hosted database. The new `109` file is applied only to Staging. Direct project-reference reads after that rollout show:

| Environment | Recorded remote versions | Evidence |
|---|---|---|
| Staging | `099`–`109` | Read-only query of `supabase_migrations.schema_migrations` on `fkpigozcqnmcvofuksar` after the reviewed SQL completed |
| Production | `099`–`104` | Read-only query of `supabase_migrations.schema_migrations` on `ehfafcnimmjusyvplbah` on 2026-11-15 |

Repository versions `001`–`098` do not appear in either remote ledger. Both databases contain existing objects and data, so the missing rows do not prove that the migrations never ran. They also do not prove which files ran or whether the deployed schema matches those files. No old migration versions were replayed or marked applied. The full-repository `db push` and `--include-all` paths remain unsafe for these databases.

The history is therefore reconciled only from version `099` onward where the ledger provides evidence. The older history remains unknown pending project-specific deployment receipts plus object-by-object catalog comparison. The isolated replay through `108` succeeded, but it does not prove that those files ran against the hosted environments. Directional schema diffs were generated for review only: replay-to-Staging is **130,150 bytes / 3,288 lines** and includes 57 `DROP TABLE` statements; Staging-to-replay is **380,694 bytes / 7,479 lines** and includes both additive and destructive operations. Neither flattened diff is a safe migration script. They are not applied. The older remote ledgers remain unproven; no `001`–`098` version was replayed or marked applied.

The replay and diff evidence demonstrates why a blanket reconciliation is unsafe: the two schemas differ materially in both directions, and a generated diff would remove objects in one direction or overwrite live structure in the other. These outputs are review evidence, not a second schema source of truth.

## KYC schema and access evidence

### Staging before the new access corrections

The live `creator_kyc_records` table had RLS enabled and these policies:

- `Users read own KYC` (`SELECT`)
- `Admins read all KYC` (`SELECT`)
- `Users submit KYC` (`INSERT`)
- `Users update own KYC` (`UPDATE`, scoped only to the row owner)

The update policy checked the owner but did not protect the `status` column. The table ACL also gave `anon` and `authenticated` broad table privileges. A signed-in owner could therefore attempt to change their own verification status directly, bypassing the reviewer workflow. The KYC table owner is `postgres`.

### Staging corrections, versions 107 and 108

Both changes were tested against the local Supabase Postgres instance inside a transaction that was rolled back, then applied as exact single-file SQL operations to the explicit Staging reference. Only after postflight verification were versions `107` and `108` recorded in the Staging migration ledger.

- **107 — `restrict_creator_kyc_client_writes`:** drops the owner `UPDATE` policy; revokes all table privileges from `PUBLIC`, `anon`, and `authenticated`; grants `SELECT` to `authenticated`; preserves `ALL` for `service_role`.
- **108 — `remove_legacy_creator_kyc_insert_policy`:** removes the now-inactive `Users submit KYC` policy. KYC create/resubmit actions go through the authenticated API, which uses the service role; reviewer decisions use the existing service-role-only RPCs from migration 106.

Postflight catalog results on Staging:

| Role | SELECT | INSERT | UPDATE | DELETE |
|---|---:|---:|---:|---:|
| `anon` | No | No | No | No |
| `authenticated` | Yes, subject to owner/admin RLS policies | No | No | No |
| `service_role` | Yes | Yes | Yes | Yes |

Only the two intended `SELECT` policies remain on `creator_kyc_records`. The KYC record and event tables each had **0 rows before** the change and **0 rows after** it. The migrations did not insert, update, or delete application records.

### Production is different and unchanged

Production has `creator_kyc_records`, but no `creator_kyc_events` table. It still has both the owner `UPDATE` policy and the client `INSERT` policy. The KYC record table has 0 rows, but the authenticated role still has table write privileges. This remains a Production security defect; migrations `105`–`108` were not applied there. Production requires a separate reviewed release after Staging application behavior passes.

## Other live security finding: PostGIS reference table

On both Staging and Production, `public.spatial_ref_sys` is owned by the `postgis` extension and `supabase_admin`, has RLS disabled, and grants client roles `INSERT`, `UPDATE`, `DELETE`, and `TRUNCATE` privileges in addition to read access. The repository's `023_data_api_grants.sql` contains broad grants across all public tables; that file explains a plausible source for this pattern, but the missing old ledger rows mean it is not proof of execution history.

The connected SQL context is `postgres`, which is not a superuser and is not a member of `supabase_admin`. A rollback-only local attempt showed that this role cannot revoke privileges granted by the extension owner. No change was made to `spatial_ref_sys` in either environment. A migration using the ordinary `postgres` execution role would not be an honest fix. This needs a supported owner/provider route that can change the extension object's grants, followed by read/write privilege verification on both environments. Keep read access for spatial lookups; no application code in the current app tree writes this table.

The local Supabase security advisor also warned about `pages` and `provenance_records`. The equivalent remote query for public tables with RLS disabled and client privileges returned only `spatial_ref_sys`; those local warnings are not evidence that the same condition exists remotely.

## Staging default-privilege hardening, version 109

The isolated replay identified 17 application-owned operational and ledger tables whose repository definitions lacked RLS while the broad defaults from migration `023_data_api_grants.sql` granted Data API roles direct privileges. On live Staging, 16 of those tables do not exist. `migration_conflicts` exists; it already had RLS enabled and no policies, but the `anon` and `authenticated` roles still held direct table privileges. The table contained **3 rows** before and after this change. `spatial_ref_sys` was also present with client privileges, but it is extension-owned and was explicitly excluded from migration `109`.

Migration `109_restrict_future_public_client_privileges.sql` was applied to the explicit Staging project reference `fkpigozcqnmcvofuksar` as five reviewed SQL operations. No tables, columns, or application records were deleted or rewritten; the intended table access and default-privilege metadata changes were applied. After verifying the database state, version `109` was recorded in the Staging migration ledger. The checks confirmed:

- `migration_conflicts` still has **3 rows**, RLS remains enabled, and there are no client `SELECT`, `INSERT`, `UPDATE`, or `DELETE` table grants for `anon` or `authenticated`.
- `service_role` retains table access, including `SELECT` and `INSERT` (its pre-change privilege check also confirmed `UPDATE` and `DELETE`).
- New `public` tables and sequences created by `postgres` no longer default to client-role grants; `service_role` retains its explicit defaults.
- New functions created by `postgres` no longer default to client-role or `PUBLIC` execution. Public RPCs must receive an explicit reviewed grant.
- `spatial_ref_sys` remains unchanged, with its existing extension-owned client grants and disabled RLS. It is a known outstanding exception, not included in the migration's success claim.

These restrictions apply to the project-specific Staging database only. Production version `109` is absent and no Production SQL or Railway setting was changed.

## Application and deployment status after Staging rollout

The reviewed application changes are committed on `codex/staging-schema-forward-20261114` and deployed only to Railway Staging. The API runtime fix is in commit `21ecfaa85924949eb05c130c3466c869679720f5`; later changes include migration `109`. Railway Staging deployment `d23b3e0e-3b17-470f-b3e8-b20dc445ed1e` is **SUCCESS** on commit `0d44a352cfd49c8428be3006a1819a2475538df3`, the current branch tip at verification. It uses the Dockerfile and `npm run start --prefix apps/api`. Its public `/api/health` endpoint returned **HTTP 200**; `/api/v1/contributor/kyc/status` without authentication returned **HTTP 401**.

The rollout includes the authenticated KYC submit/status API route, private selfie upload flow, append-only admin review, and related truthful-metrics, offline-sync, and subscription corrections. It also fixes a Railway start-command mismatch: the service's existing `npm run start --prefix apps/api` command was being run from `/app/apps/api`, duplicating the path and causing `ENOENT`. The Docker image now uses `/app` as its runtime working directory, and the Docker default and `railway.json` use the same start command.

Post-deployment requests to the public Staging API returned:

- `/api/health`: **HTTP 200**.
- `/api/v1/contributor/kyc/status` without authentication: **HTTP 401**, confirming that the route is present and enforcing authentication.

The same start command was exercised in a local Docker image; its health endpoint returned 200 and its unauthenticated KYC status request returned 401. This verifies container startup and the unauthenticated route boundary. It does **not** verify KYC submission, selfie upload, reviewer decisions, or event creation with real Staging user credentials. Both KYC tables remain at 0 rows, so no remote test records were created.

Post-deployment, read-only queries against the explicit Staging reference reconfirmed migration versions `099`–`109`; KYC record and event counts of 0; only the two intended SELECT policies on `creator_kyc_records`; no `anon` table privileges; authenticated SELECT with no client write privileges; service-role full table privileges; and a private `kyc-selfies` bucket limited to 5 MB JPEG/PNG files with its owner and restrictive storage policies. The Production project was only read; its ledger remains `099`–`104`, `creator_kyc_events` is absent, and the old client KYC write grants/policies remain. No Production schema, data, or Railway setting was changed.

The Staging Railway service still needs its exposed service-role credential rotated as a separate operational follow-up. This report does not include any credential value. Rotate only the Staging service credential and update its Railway variable; do not rotate the project's JWT signing secret as part of this follow-up.

## Verification results for the reviewed application changes

All checks below ran against the current local worktree:

- API coverage: **84 passed suites, 4 skipped; 1,445 passed tests, 52 skipped**.
- API TypeScript build: passed.
- Mobile TypeScript check: passed.
- Web admin production build: passed.
- Full mobile suite: **75 suites and 623 tests passed**.
- Shared package: **8 suites and 87 tests passed**; seed data: **19 suites and 295 tests passed**; census data: **2 suites and 60 tests passed**.
- Environment-separation check and both PostGIS integration checks passed against a disposable local PostGIS container.
- The Railway API Docker image built locally; running it with the repository start command returned health **200** and the unauthenticated KYC status route returned **401**. The corresponding Railway Staging Docker build and health check succeeded.
- Locale parity and semantic/token checks passed across all 13 locales with **10 explicit English fallback keys**; those missing translations remain visible in the central fallback policy pending native-language review.
- Full Prettier check, full ESLint check, `git diff --check`, API build, mobile typecheck, web-admin production build, seed/census typechecks, and shared package build: passed.
- The previously reported delimitation heap failure is addressed by the current test isolation commit (`f1e4a464` is an ancestor of the current review branch); the full API coverage run now passes that suite.

The local checks do not substitute for a deployed Staging request with an authenticated user and reviewer account.

## Forward-only next steps

1. Use an authorized Staging contributor account and reviewer account to complete the KYC workflow end to end: submit, read status, review, confirm the append-only event, and verify direct client insert/update/delete attempts are rejected. Confirm the expected record/event counts after this controlled test and clean up only through the approved retention process.
2. Rotate the exposed Staging service-role credential and update the matching Railway Staging variable, then repeat health and authenticated API checks. Keep Production credentials and settings separate.
3. Keep `001`–`098` unmarked until execution evidence is found or a per-object adoption map proves the live object state. Build the map from exact migration definitions and live catalogs; distinguish exact-match, missing, divergent, and data-bearing objects. Avoid blanket replay and generated duplicate schema packages.
4. After the authenticated Staging workflow passes, review Production's own catalog, data counts, and Railway mapping. Produce an explicit Production allowlist for missing KYC changes and schedule a separate reviewed release; do not promote by copying Staging's full migration history.
5. Get a supported owner/provider path for correcting client privileges on extension-owned `spatial_ref_sys`, verify the proposed SQL against both environments, and make no change until the execution role can safely alter the extension-owned grants.

