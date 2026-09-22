# W013 Staging Verification Report — Canonical Geography Model

- **Job**: W013 — Canonical Geography Model
- **Target Project**: `panIN-staging` (`fkpigozcqnmcvofuksar`)
- **Supabase URL**: `https://fkpigozcqnmcvofuksar.supabase.co`
- **Runtime Verification Timestamp**: 2026-09-22T09:02:06.471Z
- **Test Execution Run ID**: `8dddbcd6`
- **Remediated Package (SHA-256)**: `56f28f6f615811a8755a3f234ec8ebc00bb2f5594eccd6501015e684dff98395`
- **Verification SQL (SHA-256)**: `86f8a2b8d019e7282eeee921d895bd284f9df6d072a4dfb91939b5ad7adb8cd7`
- **Preflight Width Audit Suite (SHA-256)**: `2aba3258877bd1a74ed000a0871f37cf306b1fa2272662f0103d284538b61a1c`
- **Node Test Battery (SHA-256)**: `853e1466998a73f2bfac7692324b400d24a5931efea84348015d7cbc3d8f05fa`
- **Status**: `W013_IMPLEMENTED_TESTED_VERIFIED_SUBMITTED — AWAITING CTO ACCEPTANCE`

---

## 1. Executive Summary

Following the authorized staging execution of remediated Migration 040 against `panIN-staging` (`fkpigozcqnmcvofuksar`), the independent runtime test battery [`tests/verify_w013_canonical_geography.mjs`](../tests/verify_w013_canonical_geography.mjs) was executed.

All **13 of 13 test gates passed** cleanly with **0 failures** and **0 pending tests**.

### Results Matrix

- **Total Tests**: 13
- **Passed**: 13
- **Failed**: 0
- **Pending / Untested**: 0
- **Discrepancies**: 0
- **Unresolved UNKNOWNs**: 0

---

## 2. Actual Runtime Verification Evidence Matrix

| Test ID | Category | Title | Actual Staging Observed Value | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TEST-13-A** | `SCHEMA` | Canonical tables exist | `districtsFound: true, pcFound: true` | **STAGING_RUNTIME_VERIFIED** |
| **TEST-13-B** | `SCHEMA` | Additive columns exist; `id` PK preserved | Sample: `id: 'TS-AC-1'`, `internal_id: 'f4506198-ad3f-4c50-add7-16a9e6eb76d1'`, `canonical_code: 'TS-AC-001'` | **STAGING_RUNTIME_VERIFIED** |
| **TEST-13-C** | `IDENTITY_INTEGRITY` | `internal_id` is NOT NULL, UUID format, and UNIQUE | 119/119 valid UUIDs, 100% match regex, 100% unique | **STAGING_RUNTIME_VERIFIED** |
| **TEST-13-D** | `IDENTITY_INTEGRITY` | `canonical_code` is formatted and UNIQUE | 119/119 match `^TS-AC-\d{3}$`, 100% unique (`TS-AC-001`–`TS-AC-119`) | **STAGING_RUNTIME_VERIFIED** |
| **TEST-13-E** | `ROW_COUNTS` | Pilot entity row counts | States: 1 (`TS`), Districts: 33, PCs: 17, ACs: 119 | **STAGING_RUNTIME_VERIFIED** |
| **TEST-13-F** | `RELATIONAL_INTEGRITY` | 100% of 119 ACs mapped to PC and District | Total: 119, `unlinkedDistrictCount: 0`, `unlinkedPcCount: 0` | **STAGING_RUNTIME_VERIFIED** |
| **TEST-13-G** | `LINEAGE_INTEGRITY` | W012 dataset-version FKs resolve | All 6 dataset versions resolved (`mha_ts_2014_v1`, `ts_districts_2016_v1`, `ts_districts_2019_additions_v1`, `ts_districts_2019_composite_v1`, `eci_ts_pc_2008_v1`, `eci_ts_ac_2008_v1`) | **STAGING_RUNTIME_VERIFIED** |
| **TEST-13-H** | `PROVENANCE_INTEGRITY` | W012 `record_provenance_linkages` resolve | States: 1, Districts: 33, PCs: 17, ACs: 119 (170 total linkages) | **STAGING_RUNTIME_VERIFIED** |
| **TEST-13-I** | `GOVERNANCE_SECURITY` | All pilot entities have `UNVERIFIED` status | `nonUnverifiedProvCount: 0`, `nonUnverifiedVersionCount: 0` (0 elevated to OFFICIAL) | **STAGING_RUNTIME_VERIFIED** |
| **TEST-13-J** | `RLS_SECURITY` | RLS enabled; public read succeeds; anonymous mutation denied | `districtsRead: 200`, `pcRead: 200`, `districtsMutRejected: true`, `pcMutRejected: true` | **STAGING_RUNTIME_VERIFIED** |
| **TEST-13-K** | `REGRESSION_INTEGRITY` | Backwards compatibility: domain FKs unaffected | `states: 200`, `constituencies: 200`, `civic_issues: 200`, `posts: 200` | **STAGING_RUNTIME_VERIFIED** |
| **TEST-13-L** | `CHRONOLOGY_INTEGRITY` | District chronology & dataset semantics verified | 31 base districts (`ts_districts_2016_v1`), 2 addition districts (`ts_districts_2019_additions_v1`: *Mulugu*, *Narayanpet*), 33 composite registered | **STAGING_RUNTIME_VERIFIED** |
| **TEST-13-M** | `IDENTIFIER_WIDTH_INTEGRITY` | Canonical identifier width sufficiency | Retrieved untruncated code: `'TS-DIST-JAYASHANKAR-BHUPALPALLY'`, length: 31, name: `'Jayashankar Bhupalpally'` | **STAGING_RUNTIME_VERIFIED** |

---

## 3. Regression Test Battery Results

- **API Build**: `npm run build --prefix apps/api` completed with **0 errors** (`tsc --noEmit` cleanly passed).
- **W010 Security & RLS Suite**: `node tests/verify_w010_rls_hardening.mjs` completed with **36/36 PASS** (0 failures).
- **W012 Data Governance Suite**: `node tests/verify_w012_data_governance.mjs` completed with **16/16 PASS** (0 failures).
- **Static Width Audit**: `node scripts/verify_w013_identifier_widths.mjs` completed with **PASS** (100% of seed values fit within schema widths).
- **Evidence Integrity**: `node scripts/check-repo-evidence-integrity.mjs` completed with **PASS** (32/32 commits verified in ancestry).

---

## 4. Production Environment Status

- **Database**: STRICTLY UNTOUCHED.
- **Traffic**: 0 bytes routed to production.
- **Credentials**: Zero production keys configured or accessed.
