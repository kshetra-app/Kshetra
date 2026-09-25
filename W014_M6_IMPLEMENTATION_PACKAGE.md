# W014: M6 IMPLEMENTATION PACKAGE
## Partitioned Canonical Timeline Invariant, Partial GiST Exclusion Constraint, and Hardened Transition Verification

**Document ID:** `W014-M6-IMPLEMENTATION-PACKAGE`  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`)  
**Status:** **PREPARED / UNEXECUTED — STRICTLY ZERO DATABASE MUTATIONS EXECUTED**  
**Production Status:** **STRICTLY UNTOUCHED**  
**Author:** Software Engineering Agent (Pair-Programming with CTO)  
**Date:** 2026-09-25  

---

## 1. EXECUTIVE SUMMARY & CTO DESIGN ALIGNMENT

Following CTO authorization of the Rev 2 Architectural Design (Document `W014-ARCH-M6-ANALYSIS-REV-2` at commit `ab0bc19`), this package prepares all required implementation artifacts without executing any operations against the database.

The implementation strictly satisfies all CTO directives:
1. **Partitioned Temporal Model:** Closed historical intervals ($[T_1, T_2)$) are protected by a partial GiST exclusion constraint (`WHERE valid_to IS NOT NULL`). Open-ended candidate and current records ($[T_{\text{eff}}, +\infty)$) are excluded from the historical index, allowing candidate versions to be staged without collision.
2. **Deterministic Currentness:** The single-current unique index (`uq_mandal_versions_single_current`) and the currentness check constraint (`chk_mandal_versions_current_invariants`) are 100% preserved.
3. **Explicit Concurrency & Chronological Guard:** Mandals anchor row serialization is preserved via `SELECT ... FOR UPDATE`. An explicit chronological check (`p_effective_date > v_old_valid_from`) prevents retroactive/inverted transitions, deterministically raising `ERR-W014-007` (`SQLSTATE 22000`).
4. **Historical Boundary Non-Overlap Guard:** Both `fn_transition_mandal_current_version` and trigger function `fn_guard_mandal_current_version` enforce that the open-ended interval $[T_{\text{eff}}, +\infty)$ does not overlap any closed historical interval, raising `ERR-W014-006` (`SQLSTATE 23P01`).
5. **Preserved Governance & Security:** Pure W012 dataset immutability triggers remain active and unchanged. `BYPASSRLS` is prohibited. Role-scoped least privilege for `panin_boundary_definer` and `panin_boundary_admin` is preserved. `SECURITY DEFINER` and pinned `SET search_path = public, pg_temp` are preserved.
6. **Corrected Check 14:** The verifier inspects `pg_constraint`, `pg_class`, `pg_am`, and `pg_index` to prove that the underlying index predicate is decompiled via `pg_get_expr(i.indpred, i.indrelid)` and matches exactly `(valid_to IS NOT NULL)`.
7. **Bulletproof Test Harness:** Test M6 is hardened with `try ... finally` unconditional anchor pointer detachment, ensuring clean teardown and surfacing setup errors.

---

## 2. ARTIFACT MANIFEST & CRYPTOGRAPHIC CHECKSUMS

| Artifact Role | File Path | SHA-256 Checksum | Execution Status |
| :--- | :--- | :--- | :--- |
| **Migration DDL** | `supabase/remediation_w014_m6_gist_boundary_041.sql` | `BC9328D0ACD9B6EFA0A1940944D9AB7DAEDE3144391044FDD30E4EC841EFA2BB` | **PREPARED / UNEXECUTED** |
| **Rollback DDL** | `supabase/rollback_w014_m6_gist_boundary_041.sql` | `6F81F7E12DA2E2F1C7C348432D49E85358D42A857B0201F5AE668FFC159F9FA4` | **PREPARED / UNEXECUTED** |
| **23-Check Verifier** | `supabase/verification_w014_migration_041_23checks.sql` | `2BD62684F5F16AAD5843FC9A15A99802A592CBF183545E50466C02643CD0B0C3` | **PREPARED / UNEXECUTED** |
| **Test Suite** | `tests/test_mandal_version_integrity.mjs` | `3F2F1A22FE0232CA049F4E0EF22F6C778C9D6E93AC0318BE6B3698101AA823A3` | **PREPARED / UNEXECUTED** |

---

## 3. MIGRATION DDL SUMMARY (`remediation_w014_m6_gist_boundary_041.sql`)

### Step 1: Pre-Migration Fail-Closed Overlap Check
Runs an explicit assertion query counting overlapping closed historical intervals:
```sql
SELECT count(*) INTO v_overlap_count
FROM public.mandal_versions a
JOIN public.mandal_versions b
  ON a.mandal_id = b.mandal_id
 AND a.id <> b.id
 AND a.valid_to IS NOT NULL
 AND b.valid_to IS NOT NULL
 AND daterange(a.valid_from, a.valid_to, '[)') && daterange(b.valid_from, b.valid_to, '[)');

IF v_overlap_count > 0 THEN
  RAISE EXCEPTION 'PRE-MIGRATION INVARIANT VIOLATION: % overlapping closed historical mandal_version intervals detected in public.mandal_versions. Migration aborted.',
    v_overlap_count
    USING ERRCODE = '23P01';
END IF;
```

### Step 2: Replace Unconditional GiST with Partial Historical GiST
```sql
ALTER TABLE public.mandal_versions
  DROP CONSTRAINT IF EXISTS uq_mandal_versions_no_overlap;

ALTER TABLE public.mandal_versions
  DROP CONSTRAINT IF EXISTS uq_mandal_versions_historical_no_overlap;

ALTER TABLE public.mandal_versions
  ADD CONSTRAINT uq_mandal_versions_historical_no_overlap
  EXCLUDE USING gist (
    mandal_id WITH =,
    (daterange(valid_from, valid_to, '[)')) WITH &&
  )
  WHERE (valid_to IS NOT NULL);
```

### Step 3: Harden `fn_guard_mandal_current_version`
In addition to validating same-mandal anchor identity (`ERR-W014-001`) and `OFFICIAL` dataset authority (`ERR-W014-003`), the trigger asserts that the active version's open-ended interval `[valid_from, NULL)` does not overlap any closed historical interval:
```sql
IF EXISTS (
  SELECT 1
  FROM public.mandal_versions h
  WHERE h.mandal_id = NEW.id
    AND h.id <> NEW.current_version_id
    AND h.valid_to IS NOT NULL
    AND daterange(h.valid_from, h.valid_to, '[)') && daterange(v_valid_from, NULL, '[)')
) THEN
  RAISE EXCEPTION 'TEMPORAL OVERLAP VIOLATION [ERR-W014-006]: mandals.current_version_id (%) active interval [%, infinity) overlaps a closed historical interval in public.mandal_versions.',
    NEW.current_version_id, v_valid_from
    USING ERRCODE = '23P01'; -- exclusion_violation
END IF;
```

### Step 4: Harden `fn_transition_mandal_current_version`
1. Locks anchor row (`mandals`) via `FOR UPDATE`.
2. Locks and reads old active version's `valid_from`.
3. Validates target candidate version exists, belongs to same mandal, belongs to an `OFFICIAL` dataset, and is open-ended (`valid_to IS NULL`).
4. **Chronology Guard:** Enforces `p_effective_date > v_old_valid_from`, throwing `ERR-W014-007` (`SQLSTATE 22000`) on non-monotonic transition requests.
5. **Historical Boundary Guard:** Enforces `p_effective_date` does not fall within any closed historical interval, throwing `ERR-W014-006` (`SQLSTATE 23P01`).
6. Atomically updates old version (`is_current = false`, `valid_to = p_effective_date`), activates new version (`is_current = true`, `valid_from = p_effective_date`, `valid_to = NULL`), and updates `mandals.current_version_id`.
7. Emits structured JSONB audit receipt.

### Step 5: Exact Ownership & Least Privilege Preservation
Preserves `panin_boundary_definer` ownership, revokes all privileges from `PUBLIC`, `anon`, and `authenticated`, and grants `EXECUTE` strictly to `service_role` and `panin_boundary_admin`.

---

## 4. ROLLBACK DDL SUMMARY (`rollback_w014_m6_gist_boundary_041.sql`)

1. **Pre-Rollback Fail-Closed Check:** Asserts that no mandal has multiple open-ended versions before attempting to re-impose the unconditional GiST constraint:
   ```sql
   SELECT count(*) INTO v_multiple_open_ended
   FROM (
     SELECT mandal_id
     FROM public.mandal_versions
     WHERE valid_to IS NULL
     GROUP BY mandal_id
     HAVING count(*) > 1
   ) sub;
   ```
2. **Reverts Constraint:** Drops `uq_mandal_versions_historical_no_overlap` and adds back `uq_mandal_versions_no_overlap EXCLUDE USING gist (mandal_id WITH =, (daterange(valid_from, valid_to, '[)')) WITH &&);`.
3. **Reverts Functions:** Restores original Migration 041 definitions for `fn_guard_mandal_current_version` and `fn_transition_mandal_current_version`.
4. **Re-asserts Permissions:** Re-applies ownership and ACL boundaries.

---

## 5. VERIFIER CORRECTION (CHECK 14)

In accordance with the CTO directive, Check 14 in `supabase/verification_w014_migration_041_23checks.sql` was rewritten to inspect the PostgreSQL system catalogs directly:
* **Constraint Existence & Type:** `pg_constraint` joined on `conrelid = to_regclass('public.mandal_versions')`, `conname = 'uq_mandal_versions_historical_no_overlap'`, asserting `contype = 'x'`.
* **Access Method:** `pg_am` joined via `pg_class.relam`, asserting `amname = 'gist'`.
* **Supporting Index:** `pg_index` joined via `c.conindid = i.indexrelid`.
* **Decompiled Predicate:** Evaluates `pg_get_expr(i.indpred, i.indrelid)` and asserts exact equality to `'(valid_to IS NOT NULL)'`.
* **Fail-Closed Guarantee:** If the predicate is missing, different, or the constraint is not GiST, Check 14 evaluates to `FAIL`.

---

## 6. TEST HARNESS CORRECTION (M6)

In `tests/test_mandal_version_integrity.mjs`:
* **Surfacing Setup Failures:** Insertion of `v6a`, updating the mandal pointer, and insertion of `v6b` check returned error objects and immediately throw descriptive exceptions (`M6 Setup Error (...)`) rather than silently continuing.
* **Guaranteed Teardown (`try ... finally`):**
  - Unconditionally clears `mandals.current_version_id = NULL` before attempting version deletions, satisfying trigger `trg_guard_mandal_version_retirement`.
  - Deletes candidate version `v6b` and retired version `v6a` safely.
  - Guarantees zero orphaned active versions on staging even if assertions fail or exceptions are raised.

---

## 7. STATIC VALIDATION RESULTS (CHECKS A–J)

| Check ID | Validation Domain | Method / Command | Result |
| :--- | :--- | :--- | :--- |
| **Check A** | SQL Syntax & Static Structure | Syntax validation of SQL scripts | **PASS** (Zero syntax errors) |
| **Check B** | Migration Transaction Structure | Verified `BEGIN; ... COMMIT;` wrapping on all scripts | **PASS** (Strictly atomic DDL) |
| **Check C** | Security Definer & `search_path` | Static inspection of function definition | **PASS** (`SECURITY DEFINER`, `SET search_path = public, pg_temp`) |
| **Check D** | ACL & Ownership Preservation | Static inspection of role grants & ownership | **PASS** (Owner: `panin_boundary_definer`, No public execute) |
| **Check E** | Verifier Determinism | Catalog inspection CTE structure | **PASS** (Single top-level query, exactly 23 rows) |
| **Check F** | Test Script Syntax | `node --check tests/test_mandal_version_integrity.mjs` | **PASS** (Zero JavaScript errors) |
| **Check G** | Repository Cleanliness | Working tree audit | **PASS** (All artifacts tracked) |
| **Check H** | Commit Freshness | `node tests/commit-freshness.test.mjs` | **PASS** (Checks A–J verified) |
| **Check I** | Production Isolation | `grep` for production references | **PASS** (Zero production URLs or credentials) |
| **Check J** | Exact Diff Review | Full unified diff audit | **PASS** (No unauthorized modifications) |

---

## 8. STANDING GOVERNANCE DECLARATION

> [!IMPORTANT]
> ### STRICT ZERO DATABASE EXECUTION CONFIRMATION
> As of the completion of this package:
> * **ZERO SQL statements** have been executed against `panIN-staging` (`fkpigozcqnmcvofuksar`).
> * **ZERO SQL statements** have been executed against `panIN-production`.
> * **ZERO migrations or patches** have been applied to any live database.
> * **The M1–M15 test suite has NOT been run.**
> * **The 23-check verifier has NOT been run against the live database.**
>
> Execution is halted awaiting explicit CTO authorization.
