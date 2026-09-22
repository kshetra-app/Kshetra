# W013 Staging Verification Report — Migration 040 Remediation

- **Job**: W013 — Canonical Geography Model
- **Target Project**: `panIN-staging` (`fkpigozcqnmcvofuksar`)
- **Supabase URL**: `https://fkpigozcqnmcvofuksar.supabase.co`
- **Execution Timestamp**: 2026-09-22T08:43:00Z
- **Remediation Parent Commit**: `29cbe0c9282bcf3cdbfc25360687c6839901dab4`
- **Remediated Migration Package (SHA-256)**: `56f28f6f615811a8755a3f234ec8ebc00bb2f5594eccd6501015e684dff98395`
- **Verification SQL (SHA-256)**: `86f8a2b8d019e7282eeee921d895bd284f9df6d072a4dfb91939b5ad7adb8cd7`
- **Preflight Width Audit Suite (SHA-256)**: `2aba3258877bd1a74ed000a0871f37cf306b1fa2272662f0103d284538b61a1c`
- **Node Test Battery (SHA-256)**: `853e1466998a73f2bfac7692324b400d24a5931efea84348015d7cbc3d8f05fa`
- **Status**: `W013_MIGRATION_040_DEFECT_REMEDIATED_SUBMITTED — AWAITING CTO REVIEW`

---

## 1. Incident Record & Defect Analysis (Preserved History)

During the authorized staging execution of package `b1f2ca6c6e585be7f153ba5619ac9667d7ab926fa4e16632e101c927126ce628` (commit `29cbe0c`), PostgreSQL reported:
```text
ERROR: 22001: value too long for type character varying(30)
```
- **Root Cause**: `districts.code` was defined as `VARCHAR(30) UNIQUE NOT NULL`, but the Telangana seed record for Jayashankar Bhupalpally had `code = 'TS-DIST-JAYASHANKAR-BHUPALPALLY'` (31 characters).
- **Atomic Rollback Confirmed**: The migration ran inside a single transactional block (`BEGIN ... COMMIT`), which rolled back cleanly upon the exception. Zero tables, rows, or broken foreign keys remained on `panIN-staging`.

---

## 2. Bounded Remediation Executed

1. **Schema Width Correction**:
   - `districts.code`: `VARCHAR(30)` $\rightarrow$ `VARCHAR(50)`
   - `districts.entity_type`: `VARCHAR(30)` $\rightarrow$ `VARCHAR(50)`
   - `parliamentary_constituencies.code`: `VARCHAR(30)` $\rightarrow$ `VARCHAR(50)`
   - `parliamentary_constituencies.entity_type`: `VARCHAR(30)` $\rightarrow$ `VARCHAR(50)`
   - `constituencies.canonical_code`: `VARCHAR(30)` $\rightarrow$ `VARCHAR(50)`
   - `constituencies.entity_type`: `VARCHAR(30)` $\rightarrow$ `VARCHAR(50)`
2. **Identifier Preservation**:
   - `TS-DIST-JAYASHANKAR-BHUPALPALLY` is preserved in full (31 characters) with 0 abbreviation.
3. **Preflight Static Assertion Suite**:
   - Created `scripts/verify_w013_identifier_widths.mjs`, deterministically inspecting all seed identifiers against their target schema column widths.
   - Result: **PASS** (100% of seed values fit with positive margins).
4. **Internal PostgreSQL Verification**:
   - Executed the remediated package against a clean PostgreSQL 17 staging-equivalent database.
   - Result: **0 errors**, all 33 districts, 17 PCs, 119 ACs, and 170 provenance linkages successfully inserted and committed.
5. **Verification Suite Enhancement**:
   - Added Check 11 to `supabase/verify_staging_migration_package_040.sql` (verifying `character_maximum_length = 50` and querying `TS-DIST-JAYASHANKAR-BHUPALPALLY`).
   - Added `TEST-13-M` to `tests/verify_w013_canonical_geography.mjs` (verifying persistence and retrieval of the 31-character district code).

---

## 3. Test Battery Matrix (Tests 13-A through 13-M)

| Test ID | Category | Title | Target Invariant | Pre-Execution Status |
| :--- | :--- | :--- | :--- | :--- |
| **TEST-13-A** | `SCHEMA` | Canonical tables exist | `districts` and `parliamentary_constituencies` tables created | `PENDING_STAGING_EXECUTION` |
| **TEST-13-B** | `SCHEMA` | Additive columns exist; `id` PK preserved | `constituencies.id` preserved as VARCHAR PK; `internal_id` and `canonical_code` present | `PENDING_STAGING_EXECUTION` |
| **TEST-13-C** | `IDENTITY_INTEGRITY` | `internal_id` is NOT NULL, UUID format, and UNIQUE | 119 valid, non-null, unique UUIDs across Telangana ACs | `PENDING_STAGING_EXECUTION` |
| **TEST-13-D** | `IDENTITY_INTEGRITY` | `canonical_code` is formatted and UNIQUE | 119 padded canonical codes (`TS-AC-001` to `TS-AC-119`) | `PENDING_STAGING_EXECUTION` |
| **TEST-13-E** | `ROW_COUNTS` | Pilot entity row counts | States: 1 (`TS`), Districts: 33, PCs: 17, ACs: 119 | `PENDING_STAGING_EXECUTION` |
| **TEST-13-F** | `RELATIONAL_INTEGRITY` | 100% of 119 ACs mapped to PC and District | 0 unlinked ACs; all 119 resolve to both a District and a PC | `PENDING_STAGING_EXECUTION` |
| **TEST-13-G** | `LINEAGE_INTEGRITY` | W012 dataset-version FKs resolve | All 6 W013 dataset versions exist in `dataset_versions` | `PENDING_STAGING_EXECUTION` |
| **TEST-13-H** | `PROVENANCE_INTEGRITY` | W012 `record_provenance_linkages` resolve | 1 State, 33 Districts, 17 PCs, 119 ACs linkages | `PENDING_STAGING_EXECUTION` |
| **TEST-13-I** | `GOVERNANCE_SECURITY` | All pilot entities have `UNVERIFIED` data status | Zero elevation to `OFFICIAL`; strictly `UNVERIFIED` | `PENDING_STAGING_EXECUTION` |
| **TEST-13-J** | `RLS_SECURITY` | RLS enabled; public read / anonymous mutation denied | Public read returns 200; anonymous insert rejected | `PENDING_STAGING_EXECUTION` |
| **TEST-13-K** | `REGRESSION_INTEGRITY` | Backwards compatibility: domain FKs unaffected | Existing queries on `states`, `constituencies`, `civic_issues`, `posts` return 200 | `PASS` (Baseline verified) |
| **TEST-13-L** | `CHRONOLOGY_INTEGRITY` | District chronology & dataset semantics verified | 31 districts `ts_districts_2016_v1`; 2 `ts_districts_2019_additions_v1`; composite registered | `PENDING_STAGING_EXECUTION` |
| **TEST-13-M** | `IDENTIFIER_WIDTH_INTEGRITY` | Canonical identifier width sufficiency | Full untruncated code `TS-DIST-JAYASHANKAR-BHUPALPALLY` (31 chars) verified | `PENDING_STAGING_EXECUTION` |

---

## 4. Current Staging & Production Status
- **Staging Database (`panIN-staging`)**: Pristine state; Migration 040 not applied.
- **Production Database**: STRICTLY UNTOUCHED.
- **Remediated Package**: Prepared, statically verified, and submitted for CTO review before staging re-execution.
