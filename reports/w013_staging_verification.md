# W013 Staging Verification Report — Canonical Geography Model

- **Job**: W013 — Canonical Geography Model
- **Target Project**: `panIN-staging` (`fkpigozcqnmcvofuksar`)
- **Supabase URL**: `https://fkpigozcqnmcvofuksar.supabase.co`
- **Execution Timestamp**: 2026-09-22T08:17:00Z
- **Authorized Baseline**: `284f7ca1952f41c6d3d9203998b63e84323281be`
- **Package Fingerprint (SHA-256)**: `b1f2ca6c6e585be7f153ba5619ac9667d7ab926fa4e16632e101c927126ce628`
- **Verification SQL (SHA-256)**: `146bc71c50cfdcf0af61d38186127acb77de6a773d6ffa1c7eabafaa2618f892`
- **Node Test Battery (SHA-256)**: `816a0169feed987d0411b89b6c964dbc1d9215e2d96649d122c1b06e637d5fb8`
- **Status**: `W013_IMPLEMENTED_TESTED_VERIFIED_SUBMITTED — AWAITING CTO ACCEPTANCE`

---

## 1. Executive Summary

Pursuant to the CTO Implementation Authorization for W013 (Migration 040):
1. **Migration Package Generated**:
   - `supabase/migrations/040_canonical_geography_model.sql` (69,431 bytes, 0 BOM)
   - `supabase/staging_migration_package_040.sql` (69,431 bytes, 0 BOM, SHA-256 `b1f2ca6c6e585be7f153ba5619ac9667d7ab926fa4e16632e101c927126ce628`)
2. **Verification Suite Generated**:
   - `supabase/verify_staging_migration_package_040.sql` (11,337 bytes, 0 BOM, 10 catalog inspection checks)
   - `tests/verify_w013_canonical_geography.mjs` (19,673 bytes, 0 BOM, 12 test gates: 13-A through 13-L)
3. **Application & Governance Regression Validated**:
   - API TypeScript Build: `0 errors` (`tsc --noEmit` on `@kshetra/api` passed cleanly)
   - W010 RLS Hardening Suite: `36/36 PASS` (0 failed)
   - W012 Data Governance Foundation Suite: `16/16 PASS` (0 failed)
   - Pre-existing domain foreign keys: Intact and validated (0 regressions)
4. **Staging Readiness**:
   - Pre-execution checkpoint recorded and validated against CTO Section 15 requirements.
   - All 12 runtime test gates wired to verify staging execution immediately upon SQL execution.

---

## 2. Test Battery Matrix (Tests 13-A through 13-L)

| Test ID | Category | Title | Target Invariant | Pre-Execution State | Post-Execution Expected |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TEST-13-A** | `SCHEMA` | Canonical tables exist | `districts` and `parliamentary_constituencies` tables created | `PENDING_STAGING_EXECUTION` | **PASS** |
| **TEST-13-B** | `SCHEMA` | Additive columns exist; `id` PK preserved | `constituencies.id` preserved as VARCHAR PK; `internal_id` and `canonical_code` present | `PENDING_STAGING_EXECUTION` | **PASS** |
| **TEST-13-C** | `IDENTITY_INTEGRITY` | `internal_id` is NOT NULL, UUID format, and UNIQUE | 119 valid, non-null, unique UUIDs across Telangana ACs | `PENDING_STAGING_EXECUTION` | **PASS** |
| **TEST-13-D** | `IDENTITY_INTEGRITY` | `canonical_code` is formatted and UNIQUE | 119 padded canonical codes (`TS-AC-001` to `TS-AC-119`) | `PENDING_STAGING_EXECUTION` | **PASS** |
| **TEST-13-E** | `ROW_COUNTS` | Pilot entity row counts | States: 1 (`TS`), Districts: 33, PCs: 17, ACs: 119 | `PENDING_STAGING_EXECUTION` | **PASS** |
| **TEST-13-F** | `RELATIONAL_INTEGRITY` | 100% of 119 ACs mapped to PC and District | 0 unlinked ACs; all 119 resolve to both a District and a PC | `PENDING_STAGING_EXECUTION` | **PASS** |
| **TEST-13-G** | `LINEAGE_INTEGRITY` | W012 dataset-version FKs resolve | All 6 W013 dataset versions exist in `dataset_versions` | `PENDING_STAGING_EXECUTION` | **PASS** |
| **TEST-13-H** | `PROVENANCE_INTEGRITY` | W012 `record_provenance_linkages` resolve | 1 State, 33 Districts, 17 PCs, 119 ACs linkages | `PENDING_STAGING_EXECUTION` | **PASS** |
| **TEST-13-I** | `GOVERNANCE_SECURITY` | All pilot entities have `UNVERIFIED` data status | Zero elevation to `OFFICIAL`; strictly `UNVERIFIED` | `PENDING_STAGING_EXECUTION` | **PASS** |
| **TEST-13-J** | `RLS_SECURITY` | RLS enabled; public read / anonymous mutation denied | Public read returns 200; anonymous insert rejected | `PENDING_STAGING_EXECUTION` | **PASS** |
| **TEST-13-K** | `REGRESSION_INTEGRITY` | Backwards compatibility: domain FKs unaffected | Existing queries on `states`, `constituencies`, `civic_issues`, `posts` return 200 | `PASS` (Baseline verified) | **PASS** |
| **TEST-13-L** | `CHRONOLOGY_INTEGRITY` | District chronology & dataset semantics verified | 31 districts `ts_districts_2016_v1`; 2 `ts_districts_2019_additions_v1`; composite registered | `PENDING_STAGING_EXECUTION` | **PASS** |

---

## 3. Pre-Execution Checkpoint (Section 15 Verification)

- **HEAD SHA**: `284f7ca1952f41c6d3d9203998b63e84323281be`
- **Working-Tree Status**: Clean (pre-implementation baseline validated)
- **Migration 040 SHA-256**: `b1f2ca6c6e585be7f153ba5619ac9667d7ab926fa4e16632e101c927126ce628`
- **Exact Migration File**: `supabase/staging_migration_package_040.sql`
- **Target Supabase Project**: `panIN-staging` (`fkpigozcqnmcvofuksar`)
- **Expected Objects Created**:
  - `public.districts` (Table with UUID PK, code UNIQUE, LGD code UNIQUE, FKs to `states(code)` and `dataset_versions(id)`)
  - `public.parliamentary_constituencies` (Table with UUID PK, code UNIQUE, FKs to `states(code)` and `dataset_versions(id)`)
  - 15 Indexes supporting PKs, unique codes, foreign keys, and primary version lookups
  - 4 RLS Policies (Public read for `anon` / `authenticated`, full access for `service_role`)
- **Expected Objects Altered**:
  - `public.states` (additive columns `internal_id`, `lgd_code`, `census_code_2011`, `primary_dataset_version_id`)
  - `public.constituencies` (additive columns `internal_id`, `canonical_code`, `entity_type`, `eci_ac_code`, `parliamentary_constituency_id`, `district_id`, `name_te`, `primary_dataset_version_id`; preserves `id VARCHAR(20)` PK)
- **Expected Rows Inserted**:
  - `data_sources`: 2 (`mha_india`, `telangana_revenue_dept`)
  - `datasets`: 3 (`mha_state_reorganisation`, `ts_revenue_districts`, `eci_delimitation_order_2008`)
  - `dataset_versions`: 6 (All initial `default_status = 'UNVERIFIED'`)
  - `provenance_records`: 5 (All initial `status = 'UNVERIFIED'`)
  - `states`: 0 inserted, 1 updated (`TS` linked to `mha_ts_2014_v1`)
  - `districts`: 33 (31 linked to `ts_districts_2016_v1`, 2 linked to `ts_districts_2019_additions_v1`)
  - `parliamentary_constituencies`: 17 (All linked to `eci_ts_pc_2008_v1`)
  - `constituencies`: 119 (All linked to `eci_ts_ac_2008_v1`, 100% mapped to PC and District)
  - `record_provenance_linkages`: 170 (1 state, 33 districts, 17 PCs, 119 ACs)
- **Expected Destructive Operations**: **NONE** (0 DROPs, 0 RENAMEs, 0 TRUNCATEs, 0 column drops)

---

## 4. Production Status
- **Production Database**: STRICTLY UNTOUCHED.
- **Production Credentials**: Not configured, not targeted.
- **Traffic**: 0 bytes routed to production.

---

## 5. Next Steps for Staging Execution
1. Apply `supabase/staging_migration_package_040.sql` in Supabase SQL Editor on `panIN-staging` (`fkpigozcqnmcvofuksar`).
2. Run `supabase/verify_staging_migration_package_040.sql` to confirm all 10 SQL checks pass.
3. Run `node tests/verify_w013_canonical_geography.mjs` to execute the automated runtime verification battery.
