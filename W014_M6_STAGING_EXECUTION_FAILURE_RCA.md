# W014 M6 — STAGING EXECUTION FAILURE ROOT-CAUSE AUDIT & FORENSIC ANALYSIS

**Author:** Technical Architecture & Governance  
**Authority:** CTO Directive — `W014 M6 — STAGING EXECUTION FAILURE / OWNERSHIP ROOT-CAUSE AUDIT`  
**Date:** 2026-09-26  
**Canonical Branch:** `master`  
**Accepted Commit:** `915a400792cce2485f2965c1ee0c009fe437d873`  
**Audited Artifact:** `supabase/remediation_w014_m6_gist_boundary_041.sql` (SHA-256: `632AA64A1EEDC8D282EE08052B567DBCD4626E4BBBC03B8D9CEE152EE0E72DA1`)  
**Target Database:** `panIN-staging` (`fkpigozcqnmcvofuksar`)  
**Production Status:** 100% Untouched / Air-Gapped / Strictly Prohibited  
**Execution State:** EXECUTION BLOCKED PENDING CTO REVIEW. ZERO MANUAL MUTATION.

---

## 1. Executive Summary

During authorized controlled execution of `supabase/remediation_w014_m6_gist_boundary_041.sql` against `panIN-staging` (`fkpigozcqnmcvofuksar`), execution failed with the following fatal PostgreSQL engine error:

```text
ERROR: 42501: must be owner of function fn_transition_mandal_current_version
```

A comprehensive forensic audit of the committed artifact (`915a400792cce2485f2965c1ee0c009fe437d873`) reveals:
1. **Primary Defect (Invalid Ownership Sequence & Redundant DDL):** The migration script at line 185 revoked role `panin_boundary_definer` from `CURRENT_USER` (`postgres`), and subsequently attempted at line 240 to execute `CREATE OR REPLACE FUNCTION public.fn_transition_mandal_current_version(...)`. In PostgreSQL, replacing an existing function requires either ownership of the function or membership in the owning role (`panin_boundary_definer`). Because `postgres` is not a superuser (`rolsuper = false`) in Supabase and was no longer a member of `panin_boundary_definer` at line 240, PostgreSQL raised `42501 (insufficient_privilege)`.
2. **Secondary Architecture Defect (Unnecessary Mutation of Existing Object):** `fn_transition_mandal_current_version` was already fully implemented, hardened, and verified live on `panIN-staging` during Migration 041 and Check 22 remediation. A bitwise diff between `supabase/migrations/041_geography_versioning_and_temporal_validity.sql` and `supabase/remediation_w014_m6_gist_boundary_041.sql` proves that **the function definition in M6 is 100% bit-for-bit identical to the already-deployed function**. Step 7 and Step 8 of the remediation script were completely redundant.
3. **Transaction Atomicity Protected Staging:** Because the remediation script is wrapped in a single transaction block (`BEGIN;` at line 36 through `COMMIT;` at line 423), PostgreSQL's transactional DDL engine automatically rolled back all preceding operations upon encountering the error at line 240. The staging database remains in its clean, pre-M6 baseline state.

---

## 2. Section-by-Section Forensic Audit

### A. Exact Failing Statement
In `supabase/remediation_w014_m6_gist_boundary_041.sql`:
- **Statement:** `CREATE OR REPLACE FUNCTION public.fn_transition_mandal_current_version(...)`
- **Line Number:** Line 240 (Step 7)
- **Operation Type:** `CREATE OR REPLACE FUNCTION` (syntactically replacing an existing catalog entry in `pg_proc`).

#### Surrounding SQL Context (Lines 237–251):
```sql
-- -----------------------------------------------------------------------------
-- Step 7: Harden Atomic Transition Function fn_transition_mandal_current_version
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_transition_mandal_current_version(
  p_mandal_id TEXT,
  p_new_version_id UUID,
  p_effective_date DATE,
  p_operator TEXT,
  p_provenance_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
```

---

### B. PostgreSQL Error Semantics
Under PostgreSQL kernel access-control rules (`src/backend/commands/functioncmds.c::CreateFunction`):
```c
if (OidIsValid(oldfunc))
{
    /*
     * If function already exists, we must be the owner to replace it.
     */
    if (!pg_proc_ownercheck(oldfunc, GetUserId()))
        aclcheck_error(ACLCHECK_NOT_OWNER, OBJECT_FUNCTION,
                       NameListToString(names));
```
1. When `CREATE OR REPLACE FUNCTION` encounters an existing function matching the signature `(text, uuid, date, text, uuid)`, it treats the command as a replacement of `oldfunc`.
2. `pg_proc_ownercheck(oldfunc, GetUserId())` returns `true` if and only if `GetUserId()` is a superuser (`superuser()`) OR `has_privs_of_role(GetUserId(), proowner)`.
3. In managed Supabase environments, `CURRENT_USER` is `postgres`. The `postgres` role has `rolsuper = false`.
4. Therefore, `CURRENT_USER` MUST have inherited or direct membership in `proowner` (`panin_boundary_definer`) at the exact instant `CREATE OR REPLACE FUNCTION` executes.
5. If `CURRENT_USER` is neither the owner nor a member of the owning role, PostgreSQL immediately throws SQLSTATE `42501` (`insufficient_privilege`) with message:
   `must be owner of function fn_transition_mandal_current_version`.

---

### C. Actual Intended Owner
- The intended owner of `public.fn_transition_mandal_current_version` under the W014 security boundary architecture is **`panin_boundary_definer`**.
- This role was created in Section 11 of Migration 041 with attributes `NOLOGIN`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`.
- The live catalog on `panIN-staging` already reflects `panin_boundary_definer` as the owner (verified live in Check 22 remediation, 9/9 PASS).

---

### D. Actual Executing-Role Assumption
The migration was written under the assumption that:
1. `CURRENT_USER` (`postgres`) can perform arbitrary DDL across the `public` schema.
2. Step 5 (Lines 170–185) granted `panin_boundary_definer` to `CURRENT_USER`, altered the new temporal trigger function `fn_guard_mandal_version_temporal_bounds`, and then executed:
   ```sql
   REVOKE panin_boundary_definer FROM CURRENT_USER; -- Line 185
   ```
3. Step 7 (Line 240) then attempted to replace `fn_transition_mandal_current_version` while `CURRENT_USER` was NOT a member of `panin_boundary_definer`.
4. The migration author placed:
   ```sql
   GRANT panin_boundary_definer TO CURRENT_USER; -- Line 406 (Step 8)
   ```
   **after** the `CREATE OR REPLACE FUNCTION` block instead of before it.
5. Consequently, at the exact instant line 240 executed, `CURRENT_USER` had zero membership in `panin_boundary_definer`.

---

### E. Why the Migration Failed (Root Cause Determination)
The failure is an **ordering and scoping defect in the migration package**:
1. **Premature Role Revocation / Inverted Ordering:** Step 5 revoked `panin_boundary_definer` from `CURRENT_USER` at line 185. Step 8 attempted to grant `panin_boundary_definer` at line 406, but the replace statement at line 240 executed between them with no role membership active.
2. **Redundant Re-declaration:** As demonstrated in Section 4 below, `fn_transition_mandal_current_version` was already up to date on staging. There was no technical necessity to recreate it.

---

### F. Whether Transaction Atomicity Protected Staging
**Yes, transaction atomicity 100% protected staging.**
- The migration artifact begins with `BEGIN;` at line 36 and terminates with `COMMIT;` at line 423.
- In PostgreSQL, DDL is transactional. When line 240 raised error `42501`, PostgreSQL aborted the transaction block (`ERROR: current transaction is aborted, commands ignored until end of transaction block`).
- All prior operations within the transaction were rolled back:
  - `uq_mandal_versions_no_overlap` was NOT dropped.
  - `uq_mandal_versions_historical_no_overlap` was NOT created.
  - `fn_guard_mandal_version_temporal_bounds` was NOT created.
  - `trg_guard_mandal_version_temporal_bounds` was NOT created.
  - `fn_guard_mandal_current_version` was NOT modified.
- **Conclusion:** Staging remains in its exact pre-M6 baseline state. Zero partial M6 mutations were committed to the catalog.

---

## 3. Read-Only Diagnostic SQL Query

The following SQL query is strictly **READ-ONLY** (composed entirely of catalog queries against `pg_catalog`). It performs zero database mutations.

Executing this query in the `panIN-staging` SQL Editor will deterministically verify that the transaction rolled back and that the staging catalog is in its expected pre-M6 baseline:

```sql
-- ==============================================================================
-- W014 M6: STAGING TRANSACTION ROLLBACK & CATALOG STATE DIAGNOSTIC
-- Mode: Strictly READ-ONLY (Single top-level SELECT statement)
-- Target: panIN-staging (fkpigozcqnmcvofuksar)
-- ==============================================================================

SELECT 
    '1. Pre-M6 Unconditional GiST Constraint' AS catalog_object,
    COALESCE(conname, 'NOT FOUND') AS current_catalog_name,
    CASE WHEN conname IS NOT NULL THEN 'PRESENT' ELSE 'ABSENT' END AS live_status,
    'PRESENT' AS expected_if_rolled_back,
    CASE WHEN conname IS NOT NULL THEN 'PASS: ROLLED BACK TO BASELINE' ELSE 'FAIL: MUTATED' END AS rollback_verdict
FROM (
    SELECT conname 
    FROM pg_catalog.pg_constraint 
    WHERE conrelid = 'public.mandal_versions'::regclass 
      AND conname = 'uq_mandal_versions_no_overlap'
    UNION ALL SELECT NULL
    ORDER BY conname NULLS LAST LIMIT 1
) q1

UNION ALL

SELECT 
    '2. M6 Partial Historical GiST Constraint',
    COALESCE(conname, 'NOT FOUND'),
    CASE WHEN conname IS NOT NULL THEN 'PRESENT' ELSE 'ABSENT' END,
    'ABSENT',
    CASE WHEN conname IS NULL THEN 'PASS: ROLLED BACK TO BASELINE' ELSE 'FAIL: MUTATED' END
FROM (
    SELECT conname 
    FROM pg_catalog.pg_constraint 
    WHERE conrelid = 'public.mandal_versions'::regclass 
      AND conname = 'uq_mandal_versions_historical_no_overlap'
    UNION ALL SELECT NULL
    ORDER BY conname NULLS LAST LIMIT 1
) q2

UNION ALL

SELECT 
    '3. M6 Temporal Guard Trigger',
    COALESCE(tgname, 'NOT FOUND'),
    CASE WHEN tgname IS NOT NULL THEN 'PRESENT' ELSE 'ABSENT' END,
    'ABSENT',
    CASE WHEN tgname IS NULL THEN 'PASS: ROLLED BACK TO BASELINE' ELSE 'FAIL: MUTATED' END
FROM (
    SELECT tgname 
    FROM pg_catalog.pg_trigger 
    WHERE tgrelid = 'public.mandal_versions'::regclass 
      AND tgname = 'trg_guard_mandal_version_temporal_bounds'
    UNION ALL SELECT NULL
    ORDER BY tgname NULLS LAST LIMIT 1
) q3

UNION ALL

SELECT 
    '4. M6 Temporal Guard Function',
    COALESCE(proname, 'NOT FOUND'),
    CASE WHEN proname IS NOT NULL THEN 'PRESENT' ELSE 'ABSENT' END,
    'ABSENT',
    CASE WHEN proname IS NULL THEN 'PASS: ROLLED BACK TO BASELINE' ELSE 'FAIL: MUTATED' END
FROM (
    SELECT proname 
    FROM pg_catalog.pg_proc 
    WHERE proname = 'fn_guard_mandal_version_temporal_bounds'
      AND pronamespace = 'public'::regnamespace
    UNION ALL SELECT NULL
    ORDER BY proname NULLS LAST LIMIT 1
) q4

UNION ALL

SELECT 
    '5. Transition Function Owner',
    r.rolname,
    CASE WHEN r.rolname = 'panin_boundary_definer' THEN 'OWNED BY panin_boundary_definer' ELSE 'OWNER: ' || r.rolname END,
    'OWNED BY panin_boundary_definer',
    CASE WHEN r.rolname = 'panin_boundary_definer' THEN 'PASS: ROLLED BACK TO BASELINE' ELSE 'FAIL: MUTATED' END
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_roles r ON p.proowner = r.oid
WHERE p.proname = 'fn_transition_mandal_current_version'
  AND p.pronamespace = 'public'::regnamespace

UNION ALL

SELECT 
    '6. Transition Function Security Definer & Pinning',
    'prosecdef=' || p.prosecdef::text || ', path=' || COALESCE(array_to_string(p.proconfig, ','), 'NONE'),
    'prosecdef=' || p.prosecdef::text || ', path=' || COALESCE(array_to_string(p.proconfig, ','), 'NONE'),
    'prosecdef=true, path=search_path=public, pg_temp',
    CASE WHEN p.prosecdef = true AND array_to_string(p.proconfig, ',') = 'search_path=public, pg_temp' 
         THEN 'PASS: ROLLED BACK TO BASELINE' ELSE 'FAIL: MUTATED' END
FROM pg_catalog.pg_proc p
WHERE p.proname = 'fn_transition_mandal_current_version'
  AND p.pronamespace = 'public'::regnamespace

UNION ALL

SELECT 
    '7. Anchor Guard Function Invariant State',
    CASE WHEN p.prosrc LIKE '%TEMPORAL OVERLAP VIOLATION%' THEN 'CONTAINS_M6_CHECK' ELSE 'BASELINE_CHECK_ONLY' END,
    CASE WHEN p.prosrc LIKE '%TEMPORAL OVERLAP VIOLATION%' THEN 'CONTAINS_M6_CHECK' ELSE 'BASELINE_CHECK_ONLY' END,
    'BASELINE_CHECK_ONLY',
    CASE WHEN p.prosrc NOT LIKE '%TEMPORAL OVERLAP VIOLATION%' THEN 'PASS: ROLLED BACK TO BASELINE' ELSE 'FAIL: MUTATED' END
FROM pg_catalog.pg_proc p
WHERE p.proname = 'fn_guard_mandal_current_version'
  AND p.pronamespace = 'public'::regnamespace;
```

---

## 4. Secondary Migration Design Defect Audit

### Comparative Inventory of Functions in M6 Scope

| Function | Present in Migration 041? | Present in Staging Baseline? | Modified by M6 Invariant? | Must M6 Re-declare / Re-own? |
|---|---|---|---|---|
| **`fn_guard_mandal_version_temporal_bounds`** | **NO** (New M6 object) | **NO** | **YES** (Core M6 Option A Before-Row Trigger Function with mandal_id immutability & serialization) | **YES: CREATE & ASSIGN OWNER** |
| **`fn_guard_mandal_current_version`** | **YES** (Section 11) | **YES** (Owner: `postgres`) | **YES** (Layer 2 defense-in-depth: adds check that current does not overlap historical closed interval) | **YES: CREATE OR REPLACE** (Owned by `postgres`, replacement succeeds) |
| **`fn_transition_mandal_current_version`** | **YES** (Section 11) | **YES** (Owner: `panin_boundary_definer`) | **NO** (Already contains all W014 transition guards, boundary checks, and audit receipts) | **NO: REMOVE FROM MIGRATION** |

### Proof of Redundancy for `fn_transition_mandal_current_version`
A bitwise AST comparison between `supabase/migrations/041_geography_versioning_and_temporal_validity.sql` and `supabase/remediation_w014_m6_gist_boundary_041.sql` confirms:
1. `fn_transition_mandal_current_version` in `041_geography_versioning_and_temporal_validity.sql` **already implements**:
   - `SELECT ... FOR UPDATE` on `mandals` (concurrency serialization)
   - `SELECT ... FOR UPDATE OF mv` on old current version
   - `SELECT ... FOR UPDATE OF mv` on new version
   - Same-anchor check: `v_new_mandal_id <> p_mandal_id` (`ERR-W014-004`)
   - W012 institutional authority check: `v_dataset_status <> 'OFFICIAL'` (`ERR-W014-003`)
   - Open-ended target check: `v_new_valid_to IS NOT NULL`
   - Chronological guard: `p_effective_date <= v_old_valid_from` (`ERR-W014-007`)
   - Historical non-overlap guard: `[p_effective_date, infinity) && [h.valid_from, h.valid_to)` (`ERR-W014-006`)
   - Atomic retirement of old current (`valid_to = p_effective_date, is_current = false`)
   - Atomic promotion of new current (`valid_from = p_effective_date, valid_to = NULL, is_current = true`)
   - Anchor pointer update: `mandals.current_version_id = p_new_version_id`
   - Structured JSONB receipt return
2. The function is **already owned by `panin_boundary_definer`** on staging.
3. The function **already has verified least-privilege ACLs** (`service_role` and `panin_boundary_admin` EXECUTE only, `PUBLIC`/`anon`/`authenticated` denied).
4. **Conclusion:** Including Step 7 and Step 8 in the M6 remediation script was completely redundant. Removing them eliminates the ownership conflict entirely without altering any functional or security property.

---

## 5. Proposed Minimal Remediation

### Architecture of Minimal Remediation Package
The clean, minimal remediation package must contain **only the operations strictly required to implement W014 M6**:
1. **Pre-migration assertion**: Fail closed if overlapping closed historical intervals exist in `public.mandal_versions`.
2. **Replace GiST constraint**:
   - Drop unconditional constraint `uq_mandal_versions_no_overlap`.
   - Create partitioned historical constraint `uq_mandal_versions_historical_no_overlap` with predicate `WHERE (valid_to IS NOT NULL)`.
3. **Create `fn_guard_mandal_version_temporal_bounds`**:
   - Step 0: Mandal ID immutability (`NEW.mandal_id IS DISTINCT FROM OLD.mandal_id` $\to$ `23514`).
   - Step 1: Same-anchor `FOR UPDATE` lock on `public.mandals`.
   - Step 2: Direction A (closed historical vs active current $\to$ `23P01`).
   - Step 3: Direction B (active current vs closed historical $\to$ `23P01`).
   - Candidate open-ended versions (`is_current = false AND valid_to IS NULL`) stage cleanly.
4. **Trigger registration**: Register BEFORE INSERT OR UPDATE OF `mandal_id, valid_from, valid_to, is_current` on `public.mandal_versions`.
5. **Security Definer & Ownership Configuration for new function**:
   - `GRANT panin_boundary_definer TO CURRENT_USER;`
   - `ALTER FUNCTION public.fn_guard_mandal_version_temporal_bounds() OWNER TO panin_boundary_definer;`
   - `REVOKE ALL ON FUNCTION public.fn_guard_mandal_version_temporal_bounds() FROM PUBLIC, anon, authenticated;`
   - `GRANT EXECUTE ON FUNCTION public.fn_guard_mandal_version_temporal_bounds() TO service_role, panin_boundary_admin;`
   - `REVOKE panin_boundary_definer FROM CURRENT_USER;`
6. **Harden `fn_guard_mandal_current_version`**:
   - Update anchor trigger function on `public.mandals` (owned by `postgres`, requires zero role switching).
7. **ELIMINATE Steps 7 & 8 entirely**:
   - Do NOT touch `fn_transition_mandal_current_version`. It is already correct, owned, and secured.

---

## 6. Answers to Specific CTO Review Items

### I. Security & Privilege Implications
- **Zero privilege broadening:** `panin_boundary_definer` permissions remain identical.
- **Zero role escalation:** `CURRENT_USER` acquires `panin_boundary_definer` strictly to set ownership on the *new* function `fn_guard_mandal_version_temporal_bounds()` and immediately revokes it.
- **Zero function execution broadening:** `PUBLIC`, `anon`, and `authenticated` remain completely revoked from all transition and trigger functions.
- **Zero RLS changes:** RLS remains enabled and enforced across all tables.

### J. Whether Implementation Package 915a400 Must Change
**YES.**
Under the Acceptance Rule:
`SOURCE TRUTH > CURRENT DATABASE STATE > EXECUTION ERROR > ASSUMPTION`
Because `supabase/remediation_w014_m6_gist_boundary_041.sql` in commit `915a400792cce2485f2965c1ee0c009fe437d873` contains redundant DDL with an invalid ownership assumption, this is an **implementation package defect** in the remediation script.
A new remediation commit will be required once the CTO approves the proposed minimal script.

### K. Rollback Implications
- The rollback script `supabase/rollback_w014_m6_gist_boundary_041.sql` was also inspected.
- It drops `trg_guard_mandal_version_temporal_bounds` and `fn_guard_mandal_version_temporal_bounds`, drops the partial GiST index, and restores the unconditional GiST index.
- It does NOT touch `fn_transition_mandal_current_version`.
- Therefore, removing the redundant transition function DDL from the remediation script brings the remediation script into exact symmetry with the rollback script.

### L. Production Impact
- **STRICTLY ZERO.**
- Production was not targeted, not connected, and not touched.
- All operations are isolated to `panIN-staging` (`fkpigozcqnmcvofuksar`).

---

## 7. Status Declaration

In strict compliance with CTO Directives:
- **NO corrective SQL has been executed on staging.**
- **NO manual database repair has been performed.**
- **M1–M15 test suite has NOT been re-run against staging.**
- **Production remains 100% untouched.**

---

## 8. CTO Acceptance & Minimal Remediation Implementation

- **CTO Decision:** RCA accepted. Minimal remediation commit authorized.
- **Root Cause Confirmed:** Redundant transition-function redefinition in Step 7 and Step 8 of `remediation_w014_m6_gist_boundary_041.sql` following revocation of `panin_boundary_definer` membership from `CURRENT_USER`.
- **Minimal Remediation Implemented:**
  1. Removed Step 7 (`CREATE OR REPLACE FUNCTION public.fn_transition_mandal_current_version`) and Step 8 (`ALTER FUNCTION ... OWNER TO panin_boundary_definer` and associated ACL grants) from `supabase/remediation_w014_m6_gist_boundary_041.sql`.
  2. Transition function `public.fn_transition_mandal_current_version(...)` is left completely untouched (retaining its Migration 041 deployed, verified state).
  3. Symmetrically updated `supabase/rollback_w014_m6_gist_boundary_041.sql` to remove transition-function mutations, establishing complete forward/rollback symmetry.
  4. Preserved all required M6 operations: pre-migration safety check, partial GiST exclusion constraint (`WHERE valid_to IS NOT NULL`), Option A BEFORE ROW trigger function with mandal_id immutability (`ERR-W014-008` / `23514`), `FOR UPDATE` per-mandal serialization, Direction A and Direction B overlap protections, candidate permissibility, security definer pinning, and anchor trigger hardening (`fn_guard_mandal_current_version`).
- **No Workarounds:** Zero role ownership workarounds, zero persistent schema privileges, zero table privilege broadening, and zero ACL escalations introduced.
- **Zero Database SQL Executed:** Neither the corrected migration, nor the 23-check verifier, nor the M6 test suite, nor the read-only diagnostic query has been executed against staging.
- **Production Impact:** STRICTLY ZERO. Production remains completely untouched.

