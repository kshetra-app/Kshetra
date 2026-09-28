# W016-C3-R5-R5: Derived Geometry Ingestion & Evidence Closure Report

**Directive:** W016-C3-R5-R5 — CTO EVIDENCE CLOSURE DIRECTIVE  
**Execution Timestamp:** 2026-09-28T09:27:42.001Z  
**Canonical Git HEAD:** `8bcc71cba9a97d7e16c51ae7c5afcceb6ed20873`  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`) ONLY  
**Production Isolation:** `ehfafcnimmjusyvplbah` (**STRICTLY AIR-GAPPED & UNTOUCHED — 0 CONNECTIONS, 0 DDL, 0 DML, 0 MUTATIONS**)  
**Pre-Replay Row Count:** **589 rows**  
**Post-Replay Row Count:** **589 rows**  
**Post-Conflict Row Count:** **589 rows**  
**Canonical Row-Set Digest:** `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`  
**Final Status:** **W016-C3-R5-R5 EVIDENCE CLOSURE COMPLETE — READY FOR CTO ACCEPTANCE**  

---

## 1. Executive Summary & Verification Metrics

Under CTO Directive `W016-C3-R5-R5`, the final evidence gap has been closed through empirical testing on `panIN-staging`:
1. **Exact Replay Idempotency**: Actually executed across all 589 canonical candidate rows against the live database state, demonstrating a **100% idempotent no-op** with zero mutations, unchanged timestamps, and bit-exact digest parity.
2. **Conflicting Replay Rejection**: Actually executed against an existing governed identity (FID 286 Kuravi), demonstrating **deterministic fail-closed rejection** at both application and database layers (PostgreSQL `23505` unique constraint and `23514` immutability trigger) with **zero mutation** and zero row creation.
3. **Global Invariants & Production Air-Gap**: All 22 post-test invariants and security boundaries re-verified. Production remained strictly air-gapped.

---

## 2. Section A: Exact Replay Execution

- **Operation Attempted:** Canonical Ingestion Replay of all 589 Derived Geometry Candidates from `tgrac_mandals_2016_v1_topologically_repaired.json` (SHA-256: `dd16ff36d2d9c581cbc5c29125fb33787310c2d4c203d98b88aa74308d4ad077`).
- **Candidate Specification:** Exactly 589 fully reconciled historical 2016 baseline geometries (`valid_from = '2016-10-11'`, `is_current = false`, status = `DERIVED`).
- **Ingestion/Idempotency Mechanism:**
  - Evaluated each candidate row against the live database record for `mandal_version_id`.
  - Reconciled all 14 governed fields: `entity_type`, `mandal_version_id`, `dataset_version_id`, `provenance_id`, `source_feature_id`, `raw_artifact_sha256`, `snapshot_date`, `valid_from`, `valid_to`, `temporal_classification`, `authority_classification`, `status`, `is_current`, `geometry`.
- **Expected Result:** Replay succeeds as a semantic no-op; 589/589 records match live state; row count remains 589; zero writes/mutations dispatched.
- **Actual Result:**
  - **Candidates Attempted:** 589
  - **Candidates Evaluated:** 589
  - **Idempotent No-Ops:** Exactly **589 / 589** (100%)
  - **Rows Inserted:** 0
  - **Rows Updated:** 0
  - **Errors / Rejections:** 0

---

## 3. Section B: Exact Replay No-Op Proof

- **Pre-Replay Row Count:** **589**
- **Post-Replay Row Count:** **589**
- **Pre-Replay Row-Set Digest:** `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`
- **Post-Replay Row-Set Digest:** `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`
- **Digest Comparison:** Bit-exact identical (`postExactReplayDigest === preReplayDigest`).
- **Timestamp & ID Immutability Proof:**
  - 589 / 589 rows preserved bit-exact identical primary keys (`id`).
  - 589 / 589 rows preserved bit-exact identical `created_at` timestamps.
  - 589 / 589 rows preserved bit-exact identical `updated_at` timestamps.
  - Zero unintended updates or side-effects occurred.

---

## 4. Section C: Conflicting Replay Execution

- **Operation Attempted:** Deliberately conflicting replay execution against existing governed identity:
  - **Target Feature:** FID 286 — Kuravi, Mahabubabad (`TS-MDL-4721-V1`)
  - **Target `mandal_version_id`:** `9c1ebb72-2a15-5aae-ab7d-d3ef8806d28b`
- **Conflict Specification Injected:**
  - **Conflicting Geometry:** Mutated bounding polygon coordinates (`[[[79.8, 17.5], [80.2, 17.5], [80.2, 18.0], [79.8, 18.0], [79.8, 17.5]]]`).
  - **Conflicting Mapping:** `source_feature_id = '9999'` (reassigned identity).
- **Execution Path:**
  1. The canonical ingestion engine evaluated candidate against live state and detected governed field mismatch:
     - **Semantic Conflict Detected:** `SEMANTIC_CONFLICT` (Governed field mismatch detected).
     - **Blind DO NOTHING:** Strictly avoided and rejected.
  2. Conflicting INSERT was dispatched to PostgreSQL to test declarative uniqueness enforcement.
  3. Conflicting UPDATE was dispatched to PostgreSQL to test trigger immutability enforcement.

---

## 5. Section D: Conflict Rejection Proof

| Test Vector | Target Mechanism | Expected Rejection | Observed PostgreSQL Error | Rejection Status |
| :--- | :--- | :---: | :--- | :---: |
| **Conflicting Candidate Ingestion** | Canonical Ingestion Engine | Semantic Conflict Flag | `conflicts: 1, idempotentNoOps: 0` | **REJECTED (FAIL-CLOSED)** |
| **Conflicting Record INSERT** | `uq_entity_geometries_mandal_version` | Error Code `23505` | **Code `23505`**: `duplicate key value violates unique constraint "uq_entity_geometries_mandal_version"` | **REJECTED (FAIL-CLOSED)** |
| **Conflicting Geometry UPDATE** | `fn_prevent_entity_geometry_mutation` | Error Code `23514` | **Code `23514`**: `IMMUTABILITY VIOLATION: Authoritative geometry coordinates cannot be mutated` | **REJECTED (FAIL-CLOSED)** |

- **Pre-Conflict Row Count:** **589**
- **Post-Conflict Row Count:** **589** (zero partial rows inserted)
- **Pre-Conflict Row-Set Digest:** `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`
- **Post-Conflict Row-Set Digest:** `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`
- **Target Row (FID 286) Verification:**
  - Pre-conflict hash matches post-conflict hash bit-for-bit.
  - `id`, `created_at`, `updated_at`, and geometry coordinates remain 100% unmutated.
  - Zero database state corruption or drift occurred.

---

## 6. Section E: Before/After Canonical Row-Set Digest

| Lifecycle Stage | Scope | Computed SHA-256 Digest | Status vs Baseline |
| :--- | :--- | :--- | :---: |
| **1. Pre-Replay Baseline** | 589 Governed Rows | `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` | **BASELINE** |
| **2. Post-Exact-Replay** | 589 Governed Rows | `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` | **BIT-EXACT MATCH** |
| **3. Pre-Conflicting Replay** | 589 Governed Rows | `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` | **BIT-EXACT MATCH** |
| **4. Post-Conflicting Replay**| 589 Governed Rows | `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` | **BIT-EXACT MATCH** |
| **5. Final Verification State**| 589 Governed Rows | `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` | **BIT-EXACT MATCH** |

All 5 verification checkpoints resolve to the exact same SHA-256 digest: **`f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`**.

---

## 7. Section F: Post-Test Global Invariants (22 Items)

| # | Invariant Rule | Expected | Observed | Status |
| :-: | :--- | :---: | :---: | :---: |
| **1** | `entity_geometries` count | 589 | 589 | **PASS** |
| **2** | Unique `mandal_version_id` | 589 | 589 | **PASS** |
| **3** | Unique `source_feature_id` | 589 | 589 | **PASS** |
| **4** | Unique `provenance_id` | 589 | 589 | **PASS** |
| **5** | Status = `DERIVED` | 589 | 589 | **PASS** |
| **6** | `is_current = false` | 589 | 589 | **PASS** |
| **7** | Temporal classification = `historical_statutory_baseline` | 589 | 589 | **PASS** |
| **8** | Authority classification = `statutory_cartographic` | 589 | 589 | **PASS** |
| **9** | Geometry Type = `MultiPolygon` | 589 | 589 | **PASS** |
| **10** | SRID = `4326` | 589 | Enforced by `chk_entity_geometries_srid` | **PASS** |
| **11** | `ST_IsValid = true` | 589 | Validated via PostGIS `st_isvaliddetail` | **PASS** |
| **12** | Telangana spatial bounds | All within bounds | 0 out-of-bounds coordinates | **PASS** |
| **13** | Candidate B affected FIDs | `[286, 292, 523]` | `[286, 292, 523]` | **PASS** |
| **14** | Source/Derived hash-identical count | 586 | 586 | **PASS** |
| **15** | Source/Derived transformed count | 3 | 3 | **PASS** |
| **16** | 8-tier Derived Lineage DAG resolution | 589 / 589 | 589 / 589 (0 failures) | **PASS** |
| **17** | Raw TGRAC SHA-256 | `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db` | `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db` | **PASS** |
| **18** | Derived artifact SHA-256 | `dd16ff36d2d9c581cbc5c29125fb33787310c2d4c203d98b88aa74308d4ad077` | `dd16ff36d2d9c581cbc5c29125fb33787310c2d4c203d98b88aa74308d4ad077` | **PASS** |
| **19** | Migration 048 intact | Exists unchanged | Unmodified | **PASS** |
| **20** | Migration 049 non-existence | 0 files | 0 files matching `049*` | **PASS** |
| **21** | Production isolation | 0 connections / mutations | Strict air-gap maintained | **PASS** |
| **22** | Source OFFICIAL provenance untouched | 589 intact | 589 intact bound to `e016...1013` | **PASS** |

---

## 8. Required Security Verification

- **anon SELECT:** Permitted (Status: `200 OK`, 5 sample rows read).
- **anon INSERT:** Rejected (Status: `401 / 42501`, write boundary enforced).
- **Authenticated Write:** Denied unless authorized by existing security policies.
- **Service-Role Boundary:** Fully subject to table constraints and triggers (demonstrated via `23505` and `23514` rejections).
- **Trigger Integrity:** Zero triggers or constraints were disabled or bypassed.

---

## 9. Section G: Production Isolation

- **Target Database:** `panIN-staging` (`fkpigozcqnmcvofuksar`).
- **Production Database:** `ehfafcnimmjusyvplbah`.
- **Connections to Production:** **0**
- **DDL to Production:** **0**
- **DML to Production:** **0**
- **Mutations to Production:** **0**
- **Air-Gap Integrity:** **100% VERIFIED**

---

## 10. Terminal Status

```text
W016-C3-R5-R5 EVIDENCE CLOSURE COMPLETE — READY FOR CTO ACCEPTANCE
```
