# W013 Staging Verification Report — Canonical Geography Model (Remediated)

- **Job**: W013 — Canonical Geography Model
- **Target Project**: `panIN-staging` (`fkpigozcqnmcvofuksar`)
- **Supabase URL**: `https://fkpigozcqnmcvofuksar.supabase.co`
- **Runtime Verification Timestamp**: 2026-09-22T09:43:44.934Z
- **Test Execution Run ID**: `550f558b`
- **Remediated Staging Package (SHA-256)**: `56f28f6f615811a8755a3f234ec8ebc00bb2f5594eccd6501015e684dff98395`
- **Verification SQL (SHA-256)**: `86f8a2b8d019e7282eeee921d895bd284f9df6d072a4dfb91939b5ad7adb8cd7`
- **Preflight Width Audit Suite (SHA-256)**: `2aba3258877bd1a74ed000a0871f37cf306b1fa2272662f0103d284538b61a1c`
- **Hardened Runtime Test Battery (SHA-256)**: `f810614626904d6ea3a55e02ba480741deff9577e60da6017a8a7cf2628461c6`
- **Status**: `W013_RUNTIME_TEST_SEMANTIC_CORRECTION_COMPLETE — AWAITING CTO REVIEW`

---

## 1. Executive Summary

Following CTO review of the initial W013 runtime battery, four runtime tests (`TEST-13-F`, `TEST-13-G`, `TEST-13-H`, `TEST-13-I`) were hardened to perform strict relational foreign key resolution, statutory/electoral dataset assignment verification, bidirectional provenance linkage resolution, and end-to-end lineage governance verification. Furthermore, `TEST-13-K` was explicitly reclassified as an unauthenticated read compatibility smoke test.

The hardened test battery [`tests/verify_w013_canonical_geography.mjs`](../tests/verify_w013_canonical_geography.mjs) was executed live against `panIN-staging` (`fkpigozcqnmcvofuksar`).

All **13 of 13 test gates passed** cleanly with **0 failures**, **0 orphans**, **0 invalid foreign keys**, **0 invalid provenance links**, and **0 unauthorized status elevations**.

### Results Summary
- **Total Tests**: 13
- **Passed**: 13
- **Failed**: 0
- **Pending**: 0
- **Orphan Entities / Linkages**: 0
- **Invalid Foreign Keys**: 0
- **Invalid Provenance Records**: 0
- **Invalid / Elevated Statuses**: 0

---

## 2. Hardened Semantic Integrity & Relational Verification Matrix

| Test ID | Category | Title & Rigorous Verification Scope | Expected Count | Observed Count | Orphan Count | Invalid FK Count | Invalid Prov Count | Invalid Status Count | Status |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **TEST-13-A** | `SCHEMA` | Canonical tables exist (`districts`, `parliamentary_constituencies`) | 2 | 2 | 0 | 0 | 0 | 0 | **PASS** |
| **TEST-13-B** | `SCHEMA` | Additive columns exist; `constituencies.id` PK preserved | 1 | 1 | 0 | 0 | 0 | 0 | **PASS** |
| **TEST-13-C** | `IDENTITY_INTEGRITY` | `internal_id` is NOT NULL, UUID format, and UNIQUE | 119 | 119 | 0 | 0 | 0 | 0 | **PASS** |
| **TEST-13-D** | `IDENTITY_INTEGRITY` | `canonical_code` is formatted and UNIQUE (`TS-AC-001` to `TS-AC-119`) | 119 | 119 | 0 | 0 | 0 | 0 | **PASS** |
| **TEST-13-E** | `ROW_COUNTS` | Telangana pilot entity row counts (1 State, 33 Districts, 17 PCs, 119 ACs) | 170 | 170 | 0 | 0 | 0 | 0 | **PASS** |
| **TEST-13-F** | `RELATIONAL_INTEGRITY` | **Relational FK resolution: 100% of 119 ACs resolve valid `district_id` and `parliamentary_constituency_id`**<br>• `district_id` is NOT NULL & resolves to existing `districts.id`<br>• `parliamentary_constituency_id` is NOT NULL & resolves to existing `parliamentary_constituencies.id`<br>• `state_code` strictly `'TS'` | 119 | 119 | 0 | 0 | 0 | 0 | **PASS** |
| **TEST-13-G** | `LINEAGE_INTEGRITY` | **Pilot entity version resolution & assignment semantics**<br>• 100% of 170 pilot entities resolve valid `primary_dataset_version_id`<br>• 1 State → `mha_ts_2014_v1`<br>• 31 base districts → `ts_districts_2016_v1`<br>• 2 addition districts (*Mulugu*, *Narayanpet*) → `ts_districts_2019_additions_v1`<br>• 17 PCs → `eci_ts_pc_2008_v1`<br>• 119 ACs → `eci_ts_ac_2008_v1` | 170 | 170 | 0 | 0 | 0 | 0 | **PASS** |
| **TEST-13-H** | `PROVENANCE_INTEGRITY` | **Bidirectional provenance linkage resolution**<br>• Every `(domain_table, domain_record_id)` resolves to live entity row<br>• Every `provenance_id` resolves to `provenance_records.id`<br>• Every `provenance_records.dataset_version_id` resolves to `dataset_versions.id`<br>• All provenance records have `status = 'UNVERIFIED'`<br>• Exact 170 linkages (1 State, 33 Districts, 17 PCs, 119 ACs); 0 orphans | 170 | 170 | 0 | 0 | 0 | 0 | **PASS** |
| **TEST-13-I** | `GOVERNANCE_SECURITY` | **Full-chain lineage governance verification**<br>• Chain: `entity -> linkage -> provenance_record -> dataset_version`<br>• 100% of pilot lineage strictly `UNVERIFIED`<br>• Exactly 0 records elevated to `OFFICIAL` | 170 | 170 | 0 | 0 | 0 | 0 | **PASS** |
| **TEST-13-J** | `RLS_SECURITY` | Row Level Security enabled (public read succeeds; anonymous mutation denied) | 2 | 2 | 0 | 0 | 0 | 0 | **PASS** |
| **TEST-13-K** | `REGRESSION_INTEGRITY` | **Existing domain read compatibility smoke test**<br>• Confirms basic read availability across existing domain paths (`states`, `constituencies`, `civic_issues`, `posts`)<br>• Note: Explicitly designated as smoke test; not an exhaustive backwards-compatibility proof | 4 | 4 | 0 | 0 | 0 | 0 | **PASS** |
| **TEST-13-L** | `CHRONOLOGY_INTEGRITY` | District chronology and dataset semantics verified (31 in 2016, 2 additions in 2019) | 33 | 33 | 0 | 0 | 0 | 0 | **PASS** |
| **TEST-13-M** | `IDENTIFIER_WIDTH_INTEGRITY` | Canonical identifier width sufficiency (full length 31 `TS-DIST-JAYASHANKAR-BHUPALPALLY` verified) | 1 | 1 | 0 | 0 | 0 | 0 | **PASS** |

---

## 3. Detailed Breakdown of Corrected Test Gates

### TEST-13-F: Relational FK Integrity
- **Scope**: All 119 rows in `public.constituencies` where `state_code = 'TS'`
- **Validation**:
  - `district_id` NOT NULL: 119/119
  - `district_id` exists in `public.districts.id`: 119/119 (0 unresolvable)
  - `parliamentary_constituency_id` NOT NULL: 119/119
  - `parliamentary_constituency_id` exists in `public.parliamentary_constituencies.id`: 119/119 (0 unresolvable)
  - `state_code` equals `'TS'`: 119/119
- **Metrics**: `expectedCount`: 119, `observedCount`: 119, `orphanCount`: 0, `invalidFkCount`: 0

### TEST-13-G: Pilot Entity Dataset Version Reference & Assignment Semantics
- **Scope**: All 170 pilot entities across 4 tables
- **Validation**:
  - State `TS`: `mha_ts_2014_v1` (1 row)
  - 31 Base Districts: `ts_districts_2016_v1` (31 rows)
  - 2 Addition Districts: `ts_districts_2019_additions_v1` (*Mulugu*, *Narayanpet*) (2 rows)
  - 17 Parliamentary Constituencies: `eci_ts_pc_2008_v1` (17 rows)
  - 119 Assembly Constituencies: `eci_ts_ac_2008_v1` (119 rows)
  - Foreign key resolution to `public.dataset_versions.id`: 170/170 valid
- **Metrics**: `expectedCount`: 170, `observedCount`: 170, `orphanCount`: 0, `invalidFkCount`: 0

### TEST-13-H: Bidirectional Provenance Linkage Resolution
- **Scope**: `public.record_provenance_linkages` joined to domain tables and provenance records
- **Validation**:
  - Linkages by domain table: 1 `states`, 33 `districts`, 17 `parliamentary_constituencies`, 119 `constituencies` (Total: 170)
  - Domain record existence: 170/170 match existing primary keys in domain tables (0 domain orphans)
  - Provenance record existence: 170/170 match valid `provenance_records.id` (0 provenance orphans)
  - Dataset version existence: 170/170 match valid `dataset_versions.id` (0 version orphans)
  - Status check: 170/170 have `status = 'UNVERIFIED'` (0 invalid statuses)
- **Metrics**: `expectedCount`: 170, `observedCount`: 170, `orphanCount`: 0, `invalidProvenanceCount`: 0, `invalidStatusCount`: 0

### TEST-13-I: End-to-End Lineage Governance Verification
- **Scope**: Full 4-tier lineage chain: `entity -> record_provenance_linkages -> provenance_records -> dataset_versions`
- **Validation**:
  - Full chains resolved: 170/170
  - Records with `provenance_records.status = 'OFFICIAL'`: 0
  - Records with `dataset_versions.default_status = 'OFFICIAL'`: 0
  - Records not matching `UNVERIFIED`: 0
- **Metrics**: `expectedCount`: 170, `observedCount`: 170, `officialCount`: 0, `invalidStatusCount`: 0, `orphanCount`: 0

### TEST-13-K: Existing Domain Read Compatibility Smoke Test
- **Scope**: Basic HTTP 200 checks on unauthenticated read queries across 4 representative existing domain paths
- **Observed**:
  - `states`: HTTP 200
  - `constituencies`: HTTP 200
  - `civic_issues`: HTTP 200
  - `posts`: HTTP 200
- **Classification**: Smoke test confirming basic read operational availability. Does not represent comprehensive backwards-compatibility proof.

---

## 4. Regression & Evidence Integrity Verification

- **API Typecheck & Build**: Cleanly compiled with 0 errors (`npm run build --prefix apps/api`).
- **W010 Security & RLS Test Battery**: 36/36 PASS (`node tests/verify_w010_rls_hardening.mjs`).
- **W012 Governance Model Battery**: 16/16 PASS (`node tests/verify_w012_data_governance.mjs`).
- **Repo Evidence Integrity**: 32/32 commits verified in ancestry (`node scripts/check-repo-evidence-integrity.mjs`).

---

## 5. Production Environment Invariant Attestation

- **Production Project**: `panin-production` (`zcqbswsuyqchqocjhyec`)
- **Modifications**: Strictly PROHIBITED and STRICTLY ZERO.
- **Traffic / API Calls**: 0 requests routed to production.
- **Database Status**: Completely untouched.

---

## 6. Current Gate Status

`W013_RUNTIME_TEST_SEMANTIC_CORRECTION_COMPLETE — AWAITING CTO REVIEW`
