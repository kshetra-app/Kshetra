# Supabase Migration History Reconciliation — 2026-11-14

## Outcome

This report records the initial read-only forensic reconciliation and a later, deliberately limited staging deployment. The initial catalog and data checks returned only aggregate counts, not individual application rows or source-of-truth values. No historical migration was replayed against a live database, and no migration history was fabricated or repaired.

The initial safety decision remains in force for the historical chain: **do not run the repository's full `supabase db push`, `migration repair`, or `--include-all` against either live database.** The local history is incomplete, and staging and production have material schema/security differences. A separate deployment bundle was later used to apply only migrations 105 and 106 to staging after environment-specific preflight and a clean dry run; production was not changed.

## Project identity

| Environment | Verified Supabase reference | Dashboard name | PostgreSQL |
|---|---|---|---|
| Staging | `fkpigozcqnmcvofuksar` | `panIN-staging` | 17.11 |
| Production | `ehfafcnimmjusyvplbah` | `kshetra-app's Project` | 17.6 |

These are two environments for the same Poligram application. The CLI's environment labels (`production` for staging and `unverified` for production) do not match the agreed environment mapping; the explicit project references above are the reliable identifiers. `supabase/config.toml` contains the local label `Kshetra`, not either remote project reference.

## Migration ledger truth

At the initial audit snapshot, read-only SQL found six entries in each ledger: versions `099` through `104`, one copy per version. After the reviewed staging deployment, staging has eight entries (`099`–`106`) and production remains at six (`099`–`104`). Neither environment has ledger entries for `001`–`098`; no duplicate versions were found in the recorded ranges.

The current Supabase CLI migration-list output is not a reliable reconciliation view for this repository: it lists every local migration as local-only and lists remote versions `099`–`104` separately as remote-only, even though the exact three-character values match and direct SQL confirms one row for each remote version. This is an observed CLI result; its cause has not been established. It means the ordinary pending-migration view cannot be used to decide what is safe to execute.

The repository contains 108 SQL migration files. The numbered series reaches `106`; the additional nonstandard prefixes are `0035` and `0231`. `0035` coexists with `035`, so numeric-prefix normalization is ambiguous. Migrations `105` and `106` were untracked at the initial audit snapshot. They are now recorded in staging's ledger and were committed unchanged as `7aa931b3` on `codex/staging-schema-forward-20261114`, then pushed to `origin`; do not edit those applied migration files in place.

Historical reports document direct SQL packages and staging/production deployment steps, but those reports disagree across dates and some explicitly describe production as air-gapped. They are useful leads, not sufficient proof that every migration ran successfully in both current databases. Current live catalog evidence takes precedence over old narrative status claims.

## Live schema comparison

Schema-only snapshots and read-only PostgreSQL catalog queries confirm both databases contain substantial live schemas; neither is empty or reset.

| Catalog area | Staging | Production | Difference |
|---|---:|---:|---:|
| Public base tables | 208 | 199 | 9 staging-only tables |
| Public views | 22 | 22 | Same count |
| Public materialized views | 3 | 3 | Same count |
| Public columns | 3,221 | 3,091 | 139 staging-only; 9 production-only; 30 shared columns differ in type, nullability, or default |
| Public constraints | 1,049 | 956 | 97 staging-only; 4 production-only; 9 shared definitions differ |
| Public RLS policies | 364 | 311 | 54 staging-only; 1 production-only; 12 shared policy definitions differ |
| Public RLS-enabled tables | 208 | 199 | On 22 same-named tables, staging forces RLS while production only enables it |
| Public functions | 102 | 81 | 21 functions present only in staging |
| Public indexes | 565 | 470 | 95 present only in staging |

Examples of staging-only public tables include `campaign_recharge_orders`, `page_pro_orders`, `political_ads`, `entity_geometries`, `mandal_versions`, `conversations`, and `messages`. These findings describe schema presence only; they do not assert which environment is correct or whether any table contains records.

Some differences touch canonical geography and provenance structures: staging requires `constituency_versions.canonical_code` while production allows null; `dataset_versions.record_count` is non-null with a default in staging but nullable without a default in production; and `evidence_records.dataset_version_id` has opposite nullability between the environments. Several exclusion constraints for temporal geography also have different definitions. These must be resolved against application contracts and verified records before changing either side.

Security differences need a deliberate review. Staging forces RLS on 22 existing tables where production does not. On several shared `Public read ...` policies, staging scopes the policy to `anon` and `authenticated`, while production records the policy for PostgreSQL `PUBLIC`. No policy or RLS setting was changed as part of this audit.

## Why history cannot be repaired by marking everything applied

Adding ledger rows is not a harmless way to make the list look complete: it asserts that the corresponding migrations' effects are present. The live schema differences prove that the same migration history cannot currently be asserted for both environments. The repository also contains migrations that create tables and modify trusted records, plus migration files not yet committed. Marking `001`–`098` applied without environment-specific proof would create false history; replaying them could duplicate, conflict with, or alter live data and access controls.

The six existing ledger entries are accurate as ledger facts, but their SQL effects still need catalog-level verification before they can serve as a complete schema attestation. The ledger records version strings; it does not provide a checksum proving which exact SQL body was run.

## Safe resolution sequence

1. Preserve current backups/PITR recovery points for both project references and verify that restoration is available before any DDL or row transformation.
2. Reconstruct environment-specific execution evidence from Supabase SQL/editor history, deployment logs, checked-in migration packages, and backups. Record only evidence that can be tied to a project reference and successful transaction.
3. Replay the repository migrations in order on an isolated PostgreSQL 17 + PostGIS database. Resolve duplicate/nonstandard version naming and migration failures there; do not rewrite historical SQL silently.
4. Choose a single canonical schema contract and compare it with both live catalogs. Draft forward-only migrations that preserve existing rows and source-of-truth data; explicitly test constraints, indexes, RLS behavior, grants, and application access.
5. Reconcile staging first, verify catalog and application behavior, then repeat the reviewed forward-only changes in production. Record each actually executed migration with a unique canonical version. Use ledger repair only for individual legacy migrations whose effects are independently proven on that exact environment.
6. Keep the old migration history immutable and make deployment automation refuse to apply the unresolved historical chain until the adoption/reconciliation gate passes.

## Audit boundary

All remote activity for this audit was read-only: project listing, migration listing, `--read-only` catalog queries, aggregate row counts, and schema-only dumps of `public` and `storage`. No individual application row values, payment details, user details, or geographic source values were returned. No database writes, migrations, commits, pushes, or deployments were performed.

## Second-phase evidence and isolated replay

### Environment-specific execution evidence

Two later repository reports carry environment-specific deployment claims:

| Report claim | Current corroboration | Evidence limit |
|---|---|---|
| Staging report dated 2026-10-29 identifies `fkpigozcqnmcvofuksar`, claims migrations 056, 057, 068, 070, and 071, and records a 10/10 gate. | The corresponding schema objects are present. Current read-only counts match its cited 107 organizations, 4,523 affidavits, and 4,123 demographics. | The checked-in report is a summary; an immutable SQL-editor execution receipt or transaction log was not located in the repository. The current catalog and counts corroborate outcomes, not the exact execution time or SQL body. |
| Production report dated 2026-10-29 identifies `ehfafcnimmjusyvplbah` and claims a production master synchronization. | Current counts corroborate the headline population values for states, PCs, ACs, persons, candidacies, affidavits, demographics, organizations, aliases, symbols, and constituency lineage. | Current production still has no district or mandal rows and has materially fewer provenance records than staging. The report therefore does not establish complete schema/data parity with staging. |

The reports dated October 4 and October 24 that described production as air-gapped or database execution as pending predate the October 29 deployment claims. They are not necessarily contradictory. The October 29 claims have been checked against the live state as of November 14, but the exact historic SQL execution receipts remain unavailable from repository artifacts.

### Current aggregate row counts

These counts were queried read-only from each named project. They expose no row contents.

| Table or measure | Staging | Production |
|---|---:|---:|
| `states` / `state_versions` | 36 / 36 | 36 / 36 |
| `districts` / `district_versions` | 33 / 33 | 0 / 0 |
| `constituencies` / `constituency_versions` | 4,123 / 4,249 | 4,123 / 4,249 |
| `parliamentary_constituencies` / versions | 543 / 557 | 543 / 557 |
| `constituency_parliamentary_mappings` | 4,249 | 4,249 |
| `constituency_lineage` | 126 | 126 |
| `geography_entity_lineage` / `constituency_district_timeline` | 4 / 121 | 0 / 0 |
| `mandals` / `mandal_constituency_map` | 621 / 8 | 0 / 0 |
| `datasets` / `dataset_versions` / `data_sources` | 24 / 42 / 10 | 9 / 9 / 6 |
| `evidence_records` / `provenance_records` / linkages | 22 / 2,456 / 7,337 | 1 / 7 / 4,842 |
| `canonical_persons` / `candidacies` | 9,083 / 11,298 | 9,083 / 11,298 |
| `candidate_affidavits` / disclosures | 4,523 / 0 | 4,523 / 0 |
| `constituency_demographics` | 4,123 | 4,123 |
| `political_organizations` / aliases | 107 / 1,043 | 107 / 1,043 |
| multilingual names / symbols / relationships | 27 / 19 / 10 | 27 / 19 / 10 |
| SaaS tenant and webhook event/subscription rows | 0 | 0 |

This supports a focused conclusion: key electoral and candidate populations match across environments, while geographic hierarchy and provenance coverage do not. Production's empty district/mandal tables and its smaller dataset/evidence/provenance counts must be addressed from verified source packages, never by copying staging wholesale.

### Isolated migration replay

The repository's 108 migration files were copied to a temporary Supabase project with a separate Docker project ID and non-overlapping ports. PostgreSQL 17.11 and PostGIS 3.3.7 were used; Supabase Storage was enabled because migration 105 depends on `storage.buckets`. The configured `seed.sql` was disabled. **All 108 migrations, through local untracked files 105 and 106, completed successfully** and produced 108 local ledger rows. No production or staging database was used for this replay.

The replay is a schema and migration-execution baseline, not a production-data baseline. The migrations themselves contain inserts and upserts (including `021_seed_demo_data.sql` and canonical registry/geography data). With the standalone `seed.sql` disabled, the clean replay has 57 canonical persons, 57 candidacies, and 126 political organizations; live staging and production have 9,083 persons, 11,298 candidacies, and 107 organizations. The large canonical datasets are populated through additional packages outside the migration chain. Replaying migrations alone therefore does not reproduce the live data state.

The clean replay has 292 public relations (266 tables, 23 views, 3 materialized views). Staging has 233 and production 224. Every live public relation name is present in the clean replay; the replay has 59 additional relation names relative to staging and 68 relative to production. Shared relation definitions still differ: six shared column definitions in staging and 36 in production, plus security-policy and constraint differences. This provides a finite reconciliation surface, but it does not make every historical migration safe to execute.

Preflight null counts also confirm that any future constraint change must be selective. For example, staging currently contains 10 `dataset_versions` rows with a null `effective_from` and 15 `evidence_records` rows with a null `dataset_version_id`; production contains zero for these checks. These are existing canonical records. They must remain intact unless verified source evidence supplies the missing values.

### Exact deployment dry-run result

The full repository `supabase db push --dry-run --skip-vault` was run against both explicit project references. It made no writes and failed closed with `DbPushMissingRemoteError`, because local files precede the latest remote migration version. A second dry run with `--include-all` reported **102 migrations to push to each environment**: the old local files through 098, the nonstandard `0035` and `0231` files, and 105/106. It would skip only versions recorded remotely at that initial snapshot.

Several of those 102 files contain `INSERT`, `UPDATE`, or `DELETE` statements against application data; some contain conflict-update behavior. Therefore, `--include-all` is not an acceptable recovery command. No push was run.

## Initial forward-only reconciliation plan (before the staging follow-up)

1. Keep live databases and migration ledgers unchanged while the adoption plan is prepared. Do not use `db push --include-all` or mark 001–098 as applied based only on table names.
2. Freeze a canonical schema snapshot from the successful isolated replay and map every current live difference to its source migration/package. Keep a separately reviewed manifest for the environment-specific SQL packages and their current aggregate checks.
3. Build a new, versioned schema-only forward migration set for additive missing objects. Keep historical DML and source-data population out of this schema change. Resolve shared column/type/default and constraint differences individually; retain the observed nullable/unknown canonical values rather than inventing replacements.
4. Review RLS policies, grants, and `FORCE ROW LEVEL SECURITY` one table at a time, with role-level API checks. Do not apply a blanket policy or privilege diff.
5. Apply the reviewed schema-only change to staging first inside a transaction where supported. Verify public relation/column/constraint/RLS signatures and repeat the aggregate row-count checks. Run the affected staging application flows before production.
6. Reconcile production only after staging passes and after using verified, versioned source packages for its missing district/mandal and provenance coverage. Do not copy staging's records wholesale.
7. Reconcile migration tracking only after the adopted schema and exact package provenance are recorded. Preserve historical SQL byte-for-byte in an archive if a new canonical baseline is introduced; do not represent unverified execution as historical fact. Commit 105/106 and their tests before including them in any deployment manifest.

**Status at the initial audit:** Environment identity, ledger contents, data-count comparison, and a clean full migration replay were verified. No live migration had been applied at that point.

## Follow-up: reviewed staging-only forward deployment

### Scope selection

The older missing versions `001`–`098` were excluded. Their deployment evidence does not justify replay or marking them applied, and the full-chain dry run would execute data-changing SQL. The only forward change selected was the pair of existing repository migrations `105` and `106`, which form one KYC capability and are newer than staging's recorded `104`.

Read-only staging preflight confirmed:

- The target was `fkpigozcqnmcvofuksar` (`panIN-staging`), PostgreSQL 17.11. The local staging credentials and Railway Staging service both resolved to that same project reference.
- The base `creator_kyc_records` table exists with the columns required by the new functions and had **0 rows**.
- The `kyc-selfies` bucket did not exist, no KYC storage policies existed, and `creator_kyc_events` did not exist.
- Existing remote migration versions were exactly `099`–`104`.

These facts support an additive KYC schema change without rewriting any canonical geography, election, candidate, or provenance data. Migration 105 creates a private storage bucket and owner-bound storage policies. Migration 106 adds an empty reviewer-event table and service-role-only review/resubmission functions. Migration 105 also sets that new bucket's size limit and allowed image MIME types; it does not touch uploaded objects because the bucket was absent.

### Isolated deployment bundle and application

The full repository migration directory could not safely be used because it contains the unverified historical files. A temporary deployment work directory contained exact copies of the already-recorded files `099`–`104` plus the new `105` and `106`; SHA-256 hashes for 105/106 matched the repository files. Supabase CLI `2.122.1` dry-run against the explicit staging ref reported only:

```text
105_private_kyc_selfie_storage.sql
106_audited_creator_kyc_review.sql
```

The same explicit-ref push then completed successfully. No `migration repair` was run. No migration was sent to Production.

### Staging post-deployment verification

Read-only SQL confirmed the staging ledger is now `099`–`106`, with no duplicate entries. The `kyc-selfies` bucket is private, limited to 5 MiB, and accepts only JPEG/PNG. The expected owner read/upload policies and four restrictive path/delete/update policies exist. `creator_kyc_events` exists, has RLS enabled, contains **0 rows**, and has no direct SELECT/INSERT grant to `anon` or `authenticated`; the two security-definer RPCs are executable by `service_role` only and pin `search_path` to `public, pg_temp`.

The following source-of-truth aggregate counts were the same in the preflight and postflight checks:

| Table | Before | After |
|---|---:|---:|
| `states` | 36 | 36 |
| `districts` | 33 | 33 |
| `constituencies` | 4,123 | 4,123 |
| `constituency_versions` | 4,249 | 4,249 |
| `mandals` | 621 | 621 |
| `canonical_persons` | 9,083 | 9,083 |
| `candidacies` | 11,298 | 11,298 |
| `candidate_affidavits` | 4,523 | 4,523 |
| `constituency_demographics` | 4,123 | 4,123 |
| `political_organizations` | 107 | 107 |
| `organization_aliases` | 1,043 | 1,043 |
| `datasets` / `dataset_versions` | 24 / 42 | 24 / 42 |
| `evidence_records` / `provenance_records` | 22 / 2,456 | 22 / 2,456 |
| `creator_kyc_records` / `creator_kyc_events` | 0 / absent | 0 / 0 |

The reviewer RPC was exercised with a nonexistent record and failed closed with `P0002`; an `anon` caller was denied with `42501`. These calls changed no records.

### Application behavior and remaining boundary

Targeted local API tests passed **10/10**, targeted mobile KYC tests passed **9/9**, and the API TypeScript build passed. The full isolated migration replay had also passed all 108 files before this staging deployment.

The live Railway Staging service was separately confirmed as project `cooperative-education`, environment `Staging`, service `kshetra-api`, with its configured Supabase ref set to `fkpigozcqnmcvofuksar`. Runtime probes returned HTTP 200 for `/api/health` and `/api/v1/states`. The new `/api/v1/contributor/kyc/status` route returned **404** on the deployed service. Railway's latest successful deployment metadata identifies commit `bf4a4498` on branch `codex/prod-ad-safety-hotfix`; the current local KYC route changes are not in that deployed build. Therefore, the database schema is staged and verified, but the KYC application flow is **not yet live or runtime-verified end-to-end**. Deploying the changed backend contract without coordinating the matching mobile release could break older clients, so no Railway code deployment was triggered here.

Production remains unchanged: its ledger is still `099`–`104`, and its database was not written. The older schema/data differences between staging and Production also remain open; this KYC change is not a claim of complete migration-history reconciliation or environment parity.

## Direct migration-ledger recheck and legacy artifact retirement

A final read-only `supabase migration list --remote=<explicit-project-ref>` check on 2026-11-14 confirmed Staging still records `099`–`106` and Production still records `099`–`104`. Supabase CLI metadata continues to label the Staging project `production` and the Production reference `unverified`; the explicit project references and Railway environment mapping are the identifiers used for this audit. The recheck made no database changes.

The repository's current worktree also contained older combined-schema and staging-master SQL files outside `supabase/migrations/`. Their byte contents did not match the committed files at the current Git `HEAD`. The worktree versions were preserved under `supabase/legacy_artifacts/` with SHA-256 hashes, and the old root-level paths were replaced with fail-closed SQL stubs. This prevents either version from acting as a competing live schema source while retaining the local pre-change copies for historical review. The one deployable schema source remains `supabase/migrations/`.
