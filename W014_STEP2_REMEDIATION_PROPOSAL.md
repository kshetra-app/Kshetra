# W014 — STEP 2 M1–M15 REMEDIATION PROPOSAL

**Author:** Technical Architecture & Security Governance  
**Authority:** Master Product Blueprint, AI Agent Master Execution Job Book, Amendment v1.4, Amendment v1.5-A  
**Date:** 2026-09-25  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`)  
**Scope:** Remediation Analysis & Forensic Engineering ONLY (Zero Mutations Executed)  

---

## 1. Exact Root Cause for the RLS Defect

In Migration 041 (`041_geography_versioning_and_temporal_validity.sql`), the boundary architecture established:
1. Dedicated boundary role `panin_boundary_definer` as `NOLOGIN`, `NOSUPERUSER`, `rolbypassrls = false`.
2. Dedicated transition function `public.fn_transition_mandal_current_version` defined as `SECURITY DEFINER` with `OWNER TO panin_boundary_definer`.
3. Row Level Security on `public.mandal_versions` enabled via:
   ```sql
   ALTER TABLE public.mandal_versions ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Public read mandal_versions" ON public.mandal_versions
     FOR SELECT TO anon, authenticated USING (true);
   ```

### The Breakdown Mechanism:
* When `fn_transition_mandal_current_version` executes, PostgreSQL executes the body with the privileges and identity of its owner: `panin_boundary_definer`.
* Because `panin_boundary_definer` has `rolbypassrls = false`, PostgreSQL evaluates RLS policies on all accessed tables.
* The only SELECT policy on `mandal_versions` is explicitly restricted `TO anon, authenticated`.
* Because `panin_boundary_definer` is neither `anon` nor `authenticated`, PostgreSQL's default fail-closed RLS rule triggers: **zero rows are returned to `panin_boundary_definer`**.
* At Step 3 of the function:
  ```sql
  SELECT mv.mandal_id, mv.valid_to, dv.default_status
  INTO v_new_mandal_id, v_new_valid_to, v_dataset_status
  FROM public.mandal_versions mv
  JOIN public.dataset_versions dv ON mv.primary_dataset_version_id = dv.id
  WHERE mv.id = p_new_version_id
  FOR UPDATE OF mv;
  ```
  The row `mv` is hidden by RLS, causing `NOT FOUND` to be true and raising:
  `23503: VERSION_NOT_FOUND: mandal_version <id> does not exist`.
* Furthermore, `dataset_versions` and `provenance_records` (created in Migration 039) also have RLS policies restricted `TO anon, authenticated`, starving `panin_boundary_definer` of row visibility across the entire boundary domain.

---

## 2. Exact Current Policy & Privilege State

| Domain Table | Granted Privileges to `panin_boundary_definer` | RLS Enabled? | Current Active RLS Policies | Visibility for `panin_boundary_definer` |
| :--- | :--- | :---: | :--- | :---: |
| `public.mandal_versions` | `SELECT, UPDATE (is_current, valid_from, valid_to, updated_at)` | **YES** | `"Public read mandal_versions"` FOR SELECT TO `anon, authenticated` | **0 ROWS (BLOCKED BY RLS)** |
| `public.dataset_versions` | `SELECT` | **YES** | `"Public read dataset_versions"` FOR SELECT TO `anon, authenticated`<br/>`"Service role full access"` FOR ALL TO `service_role` | **0 ROWS (BLOCKED BY RLS)** |
| `public.provenance_records` | `SELECT` | **YES** | `"Public read provenance_records"` FOR SELECT TO `anon, authenticated`<br/>`"Service role full access"` FOR ALL TO `service_role` | **0 ROWS (BLOCKED BY RLS)** |
| `public.mandals` | `SELECT, UPDATE (current_version_id, updated_at)` | **YES** | `"Public read mandals"` FOR SELECT USING (true) [applies to PUBLIC]<br/>`"Service role full access on mandals"` FOR ALL TO `service_role` | **SELECT: VISIBLE**<br/>**UPDATE: BLOCKED BY RLS** |

---

## 3. Minimal Proposed SQL / Schema Change

The minimal, least-privilege correction consists of defining **role-specific RLS policies** specifically for `panin_boundary_definer`, exactly matching the permissions already granted to it in Check 20 and Check 21:

```sql
-- 1. mandal_versions: allow boundary definer to SELECT and UPDATE rows
CREATE POLICY "panin_boundary_definer_select_mandal_versions"
  ON public.mandal_versions
  FOR SELECT
  TO panin_boundary_definer
  USING (true);

CREATE POLICY "panin_boundary_definer_update_mandal_versions"
  ON public.mandal_versions
  FOR UPDATE
  TO panin_boundary_definer
  USING (true)
  WITH CHECK (true);

-- 2. dataset_versions: allow boundary definer to SELECT dataset metadata
CREATE POLICY "panin_boundary_definer_select_dataset_versions"
  ON public.dataset_versions
  FOR SELECT
  TO panin_boundary_definer
  USING (true);

-- 3. provenance_records: allow boundary definer to verify provenance record existence
CREATE POLICY "panin_boundary_definer_select_provenance_records"
  ON public.provenance_records
  FOR SELECT
  TO panin_boundary_definer
  USING (true);

-- 4. mandals: allow boundary definer to UPDATE current_version_id
CREATE POLICY "panin_boundary_definer_update_mandals"
  ON public.mandals
  FOR UPDATE
  TO panin_boundary_definer
  USING (true)
  WITH CHECK (true);
```

---

## 4. Security Impact Analysis

* **Zero Scope Expansion:** These policies grant visibility **strictly** to `panin_boundary_definer`.
* **Zero Client Exposure:** `anon`, `authenticated`, and `PUBLIC` receive **zero** new privileges or row visibility.
* **Column-Level Constraint Unchanged:** While the RLS policy allows `panin_boundary_definer` to execute `UPDATE`, PostgreSQL table/column privileges (Check 20 & 21) strictly enforce that `panin_boundary_definer` can **only** mutate the four whitelisted columns on `mandal_versions` (`is_current`, `valid_from`, `valid_to`, `updated_at`) and two on `mandals` (`current_version_id`, `updated_at`).
* **Check 19 / 20 / 21 / 22 / 23 Invariants Preserved:**
  - Check 19: `rolbypassrls = false` is preserved.
  - Check 20: Table-level non-UPDATE privilege model is preserved.
  - Check 21: Column-level UPDATE privilege pinning is preserved.
  - Check 22: Function execution whitelist (`service_role`, `panin_boundary_admin`, `panin_boundary_definer`) is preserved.
  - Check 23: RLS remains enabled on `mandal_versions`.

---

## 5. Why `BYPASSRLS` is Explicitly Rejected

1. **Destroys Least-Privilege Boundary:** `BYPASSRLS` is a database-wide administrative bypass that circumvents RLS policies across **all** tables in the cluster (including multi-tenant application tables, auth records, payment tables, etc.).
2. **Breaks Architectural Guarantee:** W014 Check 19 explicitly verifies `rolbypassrls = false`. Granting `BYPASSRLS` would cause Check 19 to fail.
3. **Anti-Pattern in PostgreSQL:** In secure PostgreSQL database design, `SECURITY DEFINER` roles should never be granted `BYPASSRLS` when granular role-targeted RLS policies (`CREATE POLICY ... TO <role>`) achieve exact operational requirements.

---

## 6. Exact Test-Fixture Strategy for Legitimate OFFICIAL Dataset

### The Problem:
* Currently, all 24 dataset versions in staging have `default_status = 'UNVERIFIED'`, `'UNKNOWN'`, or `'SCENARIO'`.
* In `tests/test_mandal_version_integrity.mjs`, the author assumed `ts_districts_2014_v1` was `OFFICIAL`. In reality, Migration 041 lines 155–157 explicitly enforce that `ts_districts_2014_v1` is `UNVERIFIED`.
* In W012 (`039_data_governance_foundation.sql`), elevating or creating an `OFFICIAL` dataset version requires:
  1. An associated dataset in `datasets`.
  2. A cryptographically auditable `evidence_records` row.
  3. A `verification_evidence_id` foreign key link on `dataset_versions`.

### The Strategy:
The test runner `tests/test_mandal_version_integrity.mjs` will dynamically establish (and tear down in `finally`):
1. **Dedicated Test Evidence Record:**
   ```javascript
   const testEvidenceId = crypto.randomUUID();
   await adminClient.from('evidence_records').insert({
     id: testEvidenceId,
     artifact_name: 'W014 Mandal Version Verification Test Evidence',
     artifact_sha256: '0000000000000000000000000000000000000000000000000000000000000000',
     verification_authority: 'W014 Acceptance Test Harness',
     verified_by: 'CTO Test Runner',
     verification_notes: 'Automated test fixture for W014 M1-M15 verification'
   });
   ```
2. **Dedicated OFFICIAL Test Dataset Version:**
   ```javascript
   const testOfficialDsId = `test_w014_official_${Date.now()}`;
   await adminClient.from('dataset_versions').insert({
     id: testOfficialDsId,
     dataset_id: 'geo_assembly_boundaries',
     version_tag: 'test_official_v1',
     effective_from: '2020-01-01',
     default_status: 'OFFICIAL',
     verification_evidence_id: testEvidenceId,
     record_count: 1
   });
   ```
3. **Full Compliance:** This satisfies W012 institutional authority without altering any existing baseline datasets (`ts_districts_2014_v1` remains permanently `UNVERIFIED`).

---

## 7. Exact M3 / M4 / M5 / M10 Test Changes Required

### M3 & M10 Setup Hardening
* **Current Defect:** `await adminClient.from('mandals').update(...)` ignores the returned error.
* **Correction:** Explicitly check and assert zero setup errors:
  ```javascript
  const { error: setupErr } = await adminClient.from('mandals').update({ current_version_id: vActive.id }).eq('id', mandalA.id);
  if (setupErr) {
    throw new Error(`Setup failed for ${testId}: ${setupErr.code} - ${setupErr.message}`);
  }
  ```

### M4 Invariant Assertion Correction
* **Current Defect:** Expects only `23505 (unique_violation)` from `uq_mandal_versions_single_current`.
* **Database Reality:** The GiST exclusion constraint `uq_mandal_versions_no_overlap` (`23P01`) fires upon index tuple insertion.
* **Correction:** Accept both `23505` and `23P01`:
  ```javascript
  if (err4b && (err4b.code === '23505' || err4b.code === '23P01' || err4b.message.includes('uq_mandal_versions_single_current') || err4b.message.includes('uq_mandal_versions_no_overlap') || err4b.message.includes('unique') || err4b.message.includes('exclusion'))) {
    m4Passed = true;
  }
  ```

### M5 Invariant Assertion Correction
* **Current Defect:** Expects only `23514 (check_violation)` for inverted date ranges.
* **Database Reality:** Range constructor in GiST index rejects lower bound > upper bound with SQLSTATE `22000 (data_exception)`.
* **Correction:** Accept both `23514` and `22000`:
  ```javascript
  if (m5FkErr && (m5FkErr.code === '23503' || m5FkErr.message.includes('foreign key')) &&
      m5RangeErr && (m5RangeErr.code === '23514' || m5RangeErr.code === '22000' || m5RangeErr.message.includes('check constraint') || m5RangeErr.message.includes('range lower bound must be less than or equal to range upper bound'))) {
    m5Passed = true;
  }
  ```

---

## 8. Expected M1–M15 Behavior After Remediation

| Test ID | Invariant Verified | Post-Remediation Behavior | Expected Result |
| :---: | :--- | :--- | :---: |
| **M1** | Cross-mandal composite FK | Foreign key mismatch rejected with `23503` | **PASS** |
| **M2** | Inactive version reference | `trg_guard_mandal_current_version` throws `ERR-W014-001 (23514)` | **PASS** |
| **M3** | Referenced version retirement guard | Setup succeeds against OFFICIAL fixture; direct retirement blocked by `trg_guard_mandal_version_retirement (ERR-W014-002 / 23514)` | **PASS** |
| **M4** | Single current version | Second current version rejected by `uq_mandal_versions_no_overlap (23P01)` or `uq_mandal_versions_single_current (23505)` | **PASS** |
| **M5** | Direct invalid mutations fail-closed | Invalid FK rejected with `23503`; inverted temporal range rejected with `22000` | **PASS** |
| **M6** | Atomic valid transition | `fn_transition_mandal_current_version` reads version, retires predecessor, activates successor, returns `TRANSITION_COMPLETE` | **PASS** |
| **M7** | Candidate version isolation | Non-current candidate versions excluded from canonical pointers | **PASS** |
| **M8** | Non-OFFICIAL dataset rejection | `trg_guard_mandal_current_version` throws `ERR-W014-003 (23514)` when referencing UNVERIFIED dataset | **PASS** |
| **M9** | Non-null `valid_to` on active rejected | `chk_mandal_versions_current_invariants` throws `23514` | **PASS** |
| **M10** | Direct closure of active version rejected | Direct `valid_to` mutation blocked by check constraint and retirement trigger | **PASS** |
| **M11** | Open-ended OFFICIAL transition | `fn_transition_mandal_current_version` successfully transitions with valid receipt | **PASS** |
| **M12** | UNVERIFIED candidate rejected | Step 5 of `fn_transition_mandal_current_version` catches UNVERIFIED dataset and throws `ERR-W014-003 (23514)` | **PASS** |
| **M13** | Privilege boundary & ACL | Anonymous RPC & DML rejected with `42501` | **PASS** |
| **M14** | `p_operator` zero privilege | Tampering with `p_operator` rejected with `42501` | **PASS** |
| **M15** | Provenance existence validation | Non-existent provenance ID rejected with `ERR-W014-005 (23503)` | **PASS** |

**Projected Summary: 15/15 PASS (100%)**

---

## 9. Exact Files That Would Change

1. `supabase/remediation_w014_rls_boundary_041.sql` (New standalone remediation SQL file containing the 5 RLS policies).
2. `tests/test_mandal_version_integrity.mjs` (Updated test harness: official fixture generation, setup assertions, SQLSTATE tolerances for M4/M5).
3. `reports/w014_mandal_temporal_verification.json` (Updated with 15/15 PASS live execution evidence).
4. `W014_FINAL_RECONCILIATION_REPORT.md` (Updated upon CTO authorization of acceptance).

---

## 10. Proposed Migration / Remediation SQL (UNEXECUTED)

```sql
-- ==============================================================================
-- W014 REMEDIATION: DEDICATED RLS POLICIES FOR PANIN_BOUNDARY_DEFINER
-- Repository Path: supabase/remediation_w014_rls_boundary_041.sql
-- Target: panIN-staging (fkpigozcqnmcvofuksar)
-- Status: PROPOSED / UNEXECUTED (Awaiting CTO Authorization)
-- ==============================================================================

BEGIN;

-- 1. public.mandal_versions: SELECT and UPDATE for boundary definer
DROP POLICY IF EXISTS "panin_boundary_definer_select_mandal_versions" ON public.mandal_versions;
CREATE POLICY "panin_boundary_definer_select_mandal_versions"
  ON public.mandal_versions
  FOR SELECT
  TO panin_boundary_definer
  USING (true);

DROP POLICY IF EXISTS "panin_boundary_definer_update_mandal_versions" ON public.mandal_versions;
CREATE POLICY "panin_boundary_definer_update_mandal_versions"
  ON public.mandal_versions
  FOR UPDATE
  TO panin_boundary_definer
  USING (true)
  WITH CHECK (true);

-- 2. public.dataset_versions: SELECT for boundary definer
DROP POLICY IF EXISTS "panin_boundary_definer_select_dataset_versions" ON public.dataset_versions;
CREATE POLICY "panin_boundary_definer_select_dataset_versions"
  ON public.dataset_versions
  FOR SELECT
  TO panin_boundary_definer
  USING (true);

-- 3. public.provenance_records: SELECT for boundary definer
DROP POLICY IF EXISTS "panin_boundary_definer_select_provenance_records" ON public.provenance_records;
CREATE POLICY "panin_boundary_definer_select_provenance_records"
  ON public.provenance_records
  FOR SELECT
  TO panin_boundary_definer
  USING (true);

-- 4. public.mandals: UPDATE for boundary definer (SELECT already permitted via Public policy)
DROP POLICY IF EXISTS "panin_boundary_definer_update_mandals" ON public.mandals;
CREATE POLICY "panin_boundary_definer_update_mandals"
  ON public.mandals
  FOR UPDATE
  TO panin_boundary_definer
  USING (true)
  WITH CHECK (true);

COMMIT;
```

---

## 11. Proposed Test Patch for `tests/test_mandal_version_integrity.mjs` (UNEXECUTED)

```diff
--- a/tests/test_mandal_version_integrity.mjs
+++ b/tests/test_mandal_version_integrity.mjs
@@ -126,9 +126,30 @@ async function runTestSuite() {
-  const testOfficialDsId = 'ts_districts_2014_v1';
+  // Dynamically establish compliant W012 OFFICIAL test fixture
+  const testEvidenceId = crypto.randomUUID();
+  const testOfficialDsId = `test_w014_official_${Date.now()}`;
+  await adminClient.from('evidence_records').insert({
+    id: testEvidenceId,
+    artifact_name: 'W014 Mandal Version Verification Test Evidence',
+    artifact_sha256: '0000000000000000000000000000000000000000000000000000000000000000',
+    verification_authority: 'W014 Acceptance Test Harness',
+    verified_by: 'CTO Test Runner',
+    verification_notes: 'Automated test fixture for W014 M1-M15 verification'
+  });
+  await adminClient.from('dataset_versions').insert({
+    id: testOfficialDsId,
+    dataset_id: 'geo_assembly_boundaries',
+    version_tag: 'test_official_v1',
+    effective_from: '2020-01-01',
+    default_status: 'OFFICIAL',
+    verification_evidence_id: testEvidenceId,
+    record_count: 1
+  });
   const unverifiedDsId = 'ts_districts_2016_v1';
```

---

## 12. Impact on Existing Acceptance Evidence

* **23-Check Verification Package (`supabase/verification_w014_migration_041_23checks.sql`):**  
  Adding role-specific RLS policies for `panin_boundary_definer` does NOT mutate any table schema, column definitions, role attributes, or existing grants.
  - Checks 1–9 (catalog, counts, timeline, splits, scenario): Unaffected.
  - Check 10 & 23 (RLS enabled): Unaffected (`rowsecurity = true` maintained).
  - Checks 11–17 (DDL, constraints, triggers): Unaffected.
  - Check 18 (transition function identity & prosecdef): Unaffected.
  - Check 19 (role attributes, `rolbypassrls = false`): Unaffected.
  - Checks 20–21 (least-privilege table & column grants): Unaffected.
  - Check 22 (function ACL boundary): Unaffected.
* **Evidence Re-Run Requirement:**  
  As standard governance protocol, once the remediation SQL is authorized and executed:
  1. The 23-check verifier will be re-run against staging to re-confirm **23/23 PASS**.
  2. The updated M1–M15 suite will be executed to produce **15/15 PASS**.
  3. Both sets of live evidence will be committed to finalize the W014 evidence register.

---

## 13. Hard Rule & Governance Compliance

* **Database Mutations:** ZERO executed.
* **Production Status:** 100% UNTOUCHED and AIR-GAPPED.
* **W014 Acceptance:** NOT self-accepted.
* **Next Steps:** STOPPED awaiting CTO review and authorization of the remediation package.
