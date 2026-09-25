# W014: M6 FINAL STATIC WRITE-PATH INTEGRITY AUDIT
## Exhaustive Forensic Audit of `public.mandal_versions` Write Paths, Boundary Non-Overlap Invariants, and Rollback Reversibility

**Document ID:** `W014-M6-FINAL-WRITE-PATH-AUDIT`  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`)  
**Status:** **AUDIT COMPLETE — REQUIRES REMEDIATION PRIOR TO STAGING EXECUTION**  
**Production Status:** **STRICTLY UNTOUCHED**  
**Database Mutations Executed:** **STRICTLY ZERO**  
**Author:** Software Engineering Agent (Pair-Programming with CTO)  
**Date:** 2026-09-25  

---

## 1. EXECUTIVE SUMMARY & AUDIT VERDICT

This audit rigorously evaluates the static write-path integrity of `public.mandal_versions` under the partitioned canonical timeline model authorized in Rev 2 (`W014-ARCH-M6-ANALYSIS-REV-2`).

Specifically, the audit resolves the CTO's critical question:
> *After replacing the unconditional GiST exclusion constraint with a partial GiST constraint (`WHERE valid_to IS NOT NULL`), can ANY permitted write path insert or update a closed historical row $[2015\text{-}01\text{-}01, 2025\text{-}01\text{-}01)$ that overlaps an active current row $[2020\text{-}01\text{-}01, +\infty)$?*

### Audit Findings:
1. **Bypass Discovered (Proposition B Proven):** Under the implementation package committed at `27db37f`, a direct write to `public.mandal_versions` (e.g., via `service_role` ingestion or direct SQL) **CAN** insert or update a closed historical interval that overlaps the active current version.
   * **Root Cause:** The partial GiST index excludes the current version (`valid_to IS NULL`), and the proposed boundary validation trigger (`trg_guard_mandal_current_version`) resides on `public.mandals`, firing **only** when `mandals.current_version_id` is updated or inserted. Direct writes to `mandal_versions` bypass all triggers on `mandals`.
2. **Minimum Correction Designed:** A reciprocal, `DEFERRABLE INITIALLY DEFERRED` constraint trigger on `public.mandal_versions` (`trg_guard_mandal_version_temporal_bounds`) that validates bidirectional historical-vs-current non-overlap on any `INSERT` or `UPDATE` of temporal bounds.
3. **Rollback Fidelity Verified:** The proposed rollback script correctly restores Migration 041 baseline semantics, access controls, search paths, and triggers, but must also drop the new constraint trigger upon revert.
4. **Standing Gate:** **`REQUIRES_REMEDIATION`** (prior to staging execution, the implementation package must incorporate the minimum constraint trigger). Zero database mutations have occurred.

---

## 2. EXHAUSTIVE WRITE-PATH MATRIX FOR `public.mandal_versions`

The schema and security configuration was audited across all 10 write paths:

| # | Write Path / Actor | Role | RLS Policy | Permitted Operations | Validating Constraints / Triggers | Can It Create Historical/Current Overlap? |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Direct SQL / Superuser** | `postgres` | `BYPASS` | `INSERT`, `UPDATE`, `DELETE` | `chk_mandal_versions_current_invariants`, partial GiST index | **YES (BYPASS)** |
| **2** | **Service Role API / Ingestion** | `service_role` | `Service role write mandal_versions` (`FOR ALL`) | `INSERT`, `UPDATE`, `DELETE` | `chk_mandal_versions_current_invariants`, partial GiST index | **YES (BYPASS)** |
| **3** | **Authenticated Users (Mobile/Web)** | `authenticated` | `Public read mandal_versions` (`FOR SELECT`) | NONE (Writes Denied) | RLS fail-closed | **NO (BLOCKED BY RLS)** |
| **4** | **Boundary Admin Role** | `panin_boundary_admin` | No table policy | No table grants; `EXECUTE` only | ACL fail-closed | **NO (BLOCKED BY ACL)** |
| **5** | **Boundary Definer Role (Direct)** | `panin_boundary_definer` | `panin_boundary_definer_update_mandal_versions` | `UPDATE` (columns: `is_current`, `valid_from`, `valid_to`, `updated_at`); Zero `INSERT`/`DELETE` | Column ACL, Role `NOLOGIN` | **NO (BLOCKED BY ACL)** |
| **6** | **Atomic Transition Function** | `panin_boundary_definer` (via `SECURITY DEFINER`) | `panin_boundary_definer_update_mandal_versions` | `UPDATE` strictly via `fn_transition_mandal_current_version` | Chronology Guard (Step 9), Boundary Guard (Step 10) | **NO (FULLY GUARDED)** |
| **7** | **Triggers on `mandals`** | Context dependent | N/A | Updates `mandals` only | `fn_guard_mandal_current_version` | **N/A (Does not write `mandal_versions`)** |
| **8** | **RPCs (`apps/api`)** | `service_role` / `panin_boundary_admin` | Controlled | `fn_transition_mandal_current_version` | Steps 1–14 in transition function | **NO (FULLY GUARDED)** |
| **9** | **Fastify Application API Routes** | `service_role` | Controlled | Zero direct routes touch `mandal_versions` | N/A (No application write routes exist) | **NO (NO WRITE ROUTES)** |
| **10**| **Test Harness Paths** | `service_role` | `Service role write mandal_versions` | Direct `insert`/`update` via `adminClient` | Same as Path 2 | **YES (BYPASS)** |

---

## 3. HISTORICAL / CURRENT OVERLAP PROOF & BYPASS ANALYSIS

### 3.1 The Invariant
For any mandal $M$, the temporal invariant requires:
$$\forall h \in \mathcal{H}_M, \quad [h.\text{valid\_from}, h.\text{valid\_to}) \cap [c.\text{valid\_from}, +\infty) = \emptyset$$
where $c$ is the active current version ($c.\text{is\_current} = \text{true}, c.\text{valid\_to IS NULL}$).

### 3.2 The Defect in Partial GiST Alone
Let mandal $M$ have active version $c$:
* `c.is_current = true`
* `c.valid_from = '2020-01-01'`
* `c.valid_to = NULL`

Suppose Path 1, 2, or 10 executes:
```sql
INSERT INTO public.mandal_versions (
  mandal_id, district_id, version_code, name, 
  valid_from, valid_to, is_current, primary_dataset_version_id
) VALUES (
  'M-001', 'D-001', 'V-HIST-OVERLAP', 'Historical Overlap',
  '2015-01-01', '2025-01-01', false, 'ts_lgd_mandals_staging_official_v1'
);
```

We evaluate every database constraint and trigger:
1. **`chk_mandal_versions_current_invariants`:** Evaluates `(is_current = false) OR (is_current = true AND valid_to IS NULL)`. Since `is_current = false`, the expression evaluates to **TRUE**.
2. **`uq_mandal_versions_single_current`:** Evaluates `WHERE is_current = true`. Since `is_current = false`, this row is **not indexed**.
3. **`uq_mandal_versions_historical_no_overlap`:** Evaluates:
   ```sql
   EXCLUDE USING gist (
     mandal_id WITH =,
     (daterange(valid_from, valid_to, '[)')) WITH &&
   ) WHERE (valid_to IS NOT NULL)
   ```
   This index contains all rows where `valid_to IS NOT NULL`. Because the current active version $c$ has `valid_to IS NULL`, **$c$ is not in the index**. If no other closed historical rows exist in $[2015\text{-}01\text{-}01, 2025\text{-}01\text{-}01)$, the GiST check evaluates to **PASS**.
4. **Triggers on `public.mandals` (`trg_guard_mandal_current_version`):** This trigger is registered as:
   ```sql
   AFTER INSERT OR UPDATE OF current_version_id ON public.mandals
   ```
   An `INSERT` on `public.mandal_versions` does not mutate `public.mandals`. **This trigger does not fire.**
5. **Triggers on `public.mandal_versions` (`trg_guard_mandal_version_retirement`):** This trigger is registered as:
   ```sql
   AFTER UPDATE OF is_current OR DELETE ON public.mandal_versions
   ```
   On `INSERT`, **this trigger does not fire**. Even on `UPDATE`, it only checks if an actively pointed version is being deactivated.

**Conclusion:** **The write succeeds.** An invalid historical row $[2015, 2025)$ coexists with current row $[2020, +\infty)$, violating the core non-overlap invariant.

---

## 4. MINIMUM CORRECTION DESIGN

To seal this bypass without weakening RLS, without expanding privileges, and without restoring the broken unconditional GiST constraint, we design a dedicated reciprocal constraint trigger directly on `public.mandal_versions`.

### 4.1 Trigger Function Specification: `fn_guard_mandal_version_temporal_bounds()`
```sql
CREATE OR REPLACE FUNCTION public.fn_guard_mandal_version_temporal_bounds()
RETURNS TRIGGER AS $$
DECLARE
  v_curr_valid_from DATE;
  v_overlapping_hist_id UUID;
  v_overlapping_hist_range DATERANGE;
BEGIN
  -- Direction A: Closed historical interval inserted or modified (valid_to IS NOT NULL)
  -- Must NOT overlap the open-ended current version [current.valid_from, infinity)
  IF NEW.valid_to IS NOT NULL THEN
    SELECT mv.valid_from INTO v_curr_valid_from
    FROM public.mandal_versions mv
    WHERE mv.mandal_id = NEW.mandal_id
      AND mv.is_current = true
      AND mv.id <> NEW.id;

    IF FOUND AND v_curr_valid_from IS NOT NULL THEN
      IF daterange(NEW.valid_from, NEW.valid_to, '[)') && daterange(v_curr_valid_from, NULL, '[)') THEN
        RAISE EXCEPTION 'TEMPORAL OVERLAP VIOLATION [ERR-W014-006]: Closed historical interval [%, %) on mandal % overlaps active current version starting at %',
          NEW.valid_from, NEW.valid_to, NEW.mandal_id, v_curr_valid_from
          USING ERRCODE = '23P01'; -- exclusion_violation
      END IF;
    END IF;
  END IF;

  -- Direction B: Current active version inserted or modified (is_current = true)
  -- Its open-ended interval [valid_from, infinity) must NOT overlap any closed historical interval
  IF NEW.is_current = true THEN
    SELECT h.id, daterange(h.valid_from, h.valid_to, '[)')
    INTO v_overlapping_hist_id, v_overlapping_hist_range
    FROM public.mandal_versions h
    WHERE h.mandal_id = NEW.mandal_id
      AND h.id <> NEW.id
      AND h.valid_to IS NOT NULL
      AND daterange(h.valid_from, h.valid_to, '[)') && daterange(NEW.valid_from, NULL, '[)')
    LIMIT 1;

    IF FOUND THEN
      RAISE EXCEPTION 'TEMPORAL OVERLAP VIOLATION [ERR-W014-006]: Active current version starting at % on mandal % overlaps closed historical interval % (version %)',
        NEW.valid_from, NEW.mandal_id, v_overlapping_hist_range, v_overlapping_hist_id
        USING ERRCODE = '23P01'; -- exclusion_violation
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 4.2 Constraint Trigger Registration
```sql
DROP TRIGGER IF EXISTS trg_guard_mandal_version_temporal_bounds ON public.mandal_versions;
CREATE CONSTRAINT TRIGGER trg_guard_mandal_version_temporal_bounds
  AFTER INSERT OR UPDATE OF mandal_id, valid_from, valid_to, is_current ON public.mandal_versions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_mandal_version_temporal_bounds();
```

### 4.3 Why This Correction is Minimal, Complete, and Safe
1. **Deferred Lifecycle:** Because it is `DEFERRABLE INITIALLY DEFERRED`, multi-statement transactions (such as `fn_transition_mandal_current_version`, where the old version is retired and the new version is activated in sequence) evaluate the invariant at transaction `COMMIT`.
2. **Universal Coverage:** As a table trigger on `public.mandal_versions`, it fires for **all** roles (including `service_role`, `postgres`, and API callers). No role can bypass it.
3. **Candidate Permissibility:** Candidate versions (`is_current = false, valid_to IS NULL`) evaluate `NEW.valid_to IS NOT NULL` as `FALSE` and `NEW.is_current = true` as `FALSE`. They bypass the check completely and can be staged freely.
4. **Boundary Equality Honored:** Abutting intervals ($T_{\text{end}} = T_{\text{curr}}$) evaluate `[T_start, T_end) && [T_curr, NULL)` to `FALSE`, honoring statutory boundary continuity.

---

## 5. ROLLBACK FIDELITY AUDIT

We audited `supabase/rollback_w014_m6_gist_boundary_041.sql` against `supabase/staging_migration_package_041.sql`:

| Invariant / Component | Migration 041 Baseline | Proposed Rollback Script | Fidelity Verdict |
| :--- | :--- | :--- | :--- |
| **Exclusion Constraint** | `uq_mandal_versions_no_overlap EXCLUDE USING gist (mandal_id WITH =, (daterange(valid_from, valid_to, '[)')) WITH &&)` | Drops historical partial constraint, re-adds unconditional constraint with exact syntax | **100% IDENTICAL** |
| **Trigger Function: `fn_guard_mandal_current_version`** | Checks ERR-W014-001 (active), ERR-W014-003 (OFFICIAL) | Reverts body to exact Migration 041 lines 1035–1062 | **100% IDENTICAL** |
| **Transition Function: `fn_transition_mandal_current_version`** | Original 11-step transition without chronology/boundary guard | Reverts body to exact Migration 041 lines 1098–1218 | **100% IDENTICAL** |
| **Function Owner** | `panin_boundary_definer` | `ALTER FUNCTION ... OWNER TO panin_boundary_definer` (with temporary membership) | **100% IDENTICAL** |
| **Security Definer & Search Path** | `SECURITY DEFINER SET search_path = public, pg_temp` | `SECURITY DEFINER SET search_path = public, pg_temp` | **100% IDENTICAL** |
| **EXECUTE ACL Boundary** | Revoke PUBLIC/anon/auth; Grant service_role, panin_boundary_admin | Exact REVOKE and GRANT statements executed | **100% IDENTICAL** |
| **Table Triggers & Indexes** | Single current index & version retirement trigger preserved | Untouched and preserved | **100% IDENTICAL** |
| **Additional Cleanup Required** | N/A (Baseline did not have version bounds trigger) | Rollback must include `DROP TRIGGER IF EXISTS trg_guard_mandal_version_temporal_bounds` and `DROP FUNCTION IF EXISTS fn_guard_mandal_version_temporal_bounds` | **REQUIRES MINOR ADDITION** |

---

## 6. EXACT IMPLEMENTATION-PACKAGE UPDATES REQUIRED

Prior to staging execution authorization, the implementation package should be updated as follows:

1. **In `supabase/remediation_w014_m6_gist_boundary_041.sql`:**
   * Add the definition of `fn_guard_mandal_version_temporal_bounds()` and register constraint trigger `trg_guard_mandal_version_temporal_bounds` on `public.mandal_versions`.
2. **In `supabase/rollback_w014_m6_gist_boundary_041.sql`:**
   * Add `DROP TRIGGER IF EXISTS trg_guard_mandal_version_temporal_bounds ON public.mandal_versions;`
   * Add `DROP FUNCTION IF EXISTS public.fn_guard_mandal_version_temporal_bounds();`
3. **In `supabase/verification_w014_migration_041_23checks.sql`:**
   * Check 17 currently verifies both triggers exist:
     `trg_guard_mandal_current_version` on `mandals` and `trg_guard_mandal_version_retirement` on `mandal_versions`.
   * Update Check 17 to also verify `trg_guard_mandal_version_temporal_bounds` exists on `mandal_versions`.
4. **In `tests/test_mandal_version_integrity.mjs`:**
   * Add an explicit test (or sub-assertion in M5) proving that direct insertion of a closed historical version overlapping the current active version fails closed with `ERR-W014-006` (`23P01`).

---

## 7. FINAL AUDIT CONCLUSION

* **Audit Determination:** **`REQUIRES_REMEDIATION`**
* **Rationale:** The partial GiST index alone leaves a write bypass for direct `mandal_versions` mutations (`service_role` and direct SQL). Adding the reciprocal constraint trigger `trg_guard_mandal_version_temporal_bounds` closes this bypass mathematically and guarantees complete invariant enforcement across all 10 write paths.
* **Execution Status:** **STRICTLY ZERO DATABASE MUTATIONS EXECUTED**. Awaiting CTO decision.
