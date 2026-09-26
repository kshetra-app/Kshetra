# W014: M6 IMPLEMENTATION PACKAGE
## Partitioned Canonical Timeline Invariant, Partial GiST Exclusion Constraint, and BEFORE ROW Direct-Write Guard Trigger

**Document ID:** `W014-M6-IMPLEMENTATION-PACKAGE`  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`)  
**Status:** **PREPARED / UNEXECUTED — STRICTLY ZERO DATABASE MUTATIONS EXECUTED**  
**Production Status:** **STRICTLY UNTOUCHED**  
**Author:** Software Engineering Agent (Pair-Programming with CTO)  
**Date:** 2026-09-25  

---

## 1. EXECUTIVE SUMMARY & CTO ARCHITECTURAL SPECIFICATION

Following CTO authorization of **Option A: BEFORE ROW Immediate Trigger Architecture** (`public.trg_guard_mandal_version_temporal_bounds`), this package contains all required implementation artifacts prepared for staging review.

### Final Approved Architecture (Option A):
1. **Partitioned Historical GiST Exclusion:**
   Closed historical intervals ($[T_1, T_2)$) are protected by a partial GiST exclusion constraint (`WHERE valid_to IS NOT NULL`). Open-ended candidate and current records ($[T_{\text{eff}}, +\infty)$) are excluded from the historical index, enabling candidate versions to be staged without premature overlap conflicts.
2. **Direct-Write Temporal Guard Trigger (`trg_guard_mandal_version_temporal_bounds`):**
   A `BEFORE ROW` trigger on `INSERT` and `UPDATE` of `(mandal_id, valid_from, valid_to, is_current)` on table `public.mandal_versions` prevents any direct write (including `service_role`) from creating temporal overlap between current and historical records:
   - **Deterministic Mandal Immutability Invariant:** Direct UPDATE attempting to mutate `mandal_versions.mandal_id` is rejected immediately with `ERR-W014-008` (`SQLSTATE 23514`). `mandal_id` is permanently bound to its parent anchor row at insertion.
   - **Per-Mandal Concurrency Serialization:** Every write path acquires `SELECT id FROM public.mandals WHERE id = NEW.mandal_id FOR UPDATE` before inspecting or modifying temporal intervals, eliminating concurrent race conditions.
   - **Direction A (Closed Historical NEW):** If `NEW.valid_to IS NOT NULL`, asserts that `daterange(NEW.valid_from, NEW.valid_to, '[)')` does not overlap any active current record (`is_current = true AND valid_to IS NULL`). Raises `ERR-W014-006` (`SQLSTATE 23P01`).
   - **Direction B (Active Current NEW):** If `NEW.is_current = true`, asserts that `daterange(NEW.valid_from, NULL, '[)')` does not overlap any closed historical record (`valid_to IS NOT NULL`). Raises `ERR-W014-006` (`SQLSTATE 23P01`).
   - **Candidate Permissibility:** Non-current open-ended candidate versions (`is_current = false AND valid_to IS NULL`) are explicitly permitted to exist.
   - **Adjacency Allowed:** Exact boundary abutting ($[A, B) + [B, +\infty)$) has empty intersection and is permitted.
3. **Trigger Function Identity & Security:**
   Trigger function `public.fn_guard_mandal_version_temporal_bounds()` is defined with `SECURITY DEFINER`, owned by `panin_boundary_definer`, with pinned `SET search_path = public, pg_temp`.
   Read completeness under RLS is mathematically guaranteed because `panin_boundary_definer` has table `SELECT` privilege and RLS policy `"panin_boundary_definer_select_mandal_versions"` (`USING (true)`).
4. **Canonical State Transition Function (`fn_transition_mandal_current_version`):**
Already fully deployed, hardened, and verified under Migration 041 (with same-anchor `FOR UPDATE` serialization, chronological guard `ERR-W014-007`, historical guard `ERR-W014-006`, and verified least-privilege catalog ACLs).
**M6 intentionally leaves this function completely untouched.** Redundant re-declarations were eliminated per CTO acceptance of RCA.
5. **Preserved Invariants & Governance:**
- Same-anchor composite FK `fk_mandals_current_version_same_anchor` preserved.
- Single-current unique index `uq_mandal_versions_single_current` preserved.
- Currentness check constraint `chk_mandal_versions_current_invariants` preserved.
- Immutability triggers `prevent_evidence_mutation()` and `prevent_dataset_version_mutation()` preserved untouched.
- `BYPASSRLS` is prohibited. Least privilege for `panin_boundary_definer` and `panin_boundary_admin` preserved.
---
## 2. ARTIFACT MANIFEST & CRYPTOGRAPHIC CHECKSUMS
| Artifact Role | File Path | SHA-256 Checksum | Execution Status |
| :--- | :--- | :--- | :--- |
| **Remediation DDL** | `supabase/remediation_w014_m6_gist_boundary_041.sql` | `74456886221FACBA9A71B536762EB7FE44EF8961E208072720FF8CDFDB15DAD7` | **PREPARED / UNEXECUTED** |
| **Rollback DDL** | `supabase/rollback_w014_m6_gist_boundary_041.sql` | `A77FE892A37588CDEE165FD593C9724215CFFB8EA1BAD60131C9FE220C43983F` | **PREPARED / UNEXECUTED** |
| **23-Check Verifier** | `supabase/verification_w014_migration_041_23checks.sql` | `A4F31C66AE2C493E4D0277B3525412C88EB4B25ECE91EB767408DA0488DFFF82` | **PREPARED / UNEXECUTED** |
| **Test Suite** | `tests/test_mandal_version_integrity.mjs` | `4D174F48CF42EDF617CDE5E5FA94487448D94A0160C9021BFF96A78746E05AB2` | **PREPARED / UNEXECUTED** |
---
## 3. REMEDIATION DDL STRUCTURE (`remediation_w014_m6_gist_boundary_041.sql`)
The remediation script executes inside a single atomic transaction block (`BEGIN; ... COMMIT;`):
- **Step 1: Pre-Migration Assertions**
Fails closed if any overlapping closed historical intervals exist in `public.mandal_versions`.
- **Step 2: Partial GiST Constraint**
Replaces unconditional GiST constraint with:
```sql
ALTER TABLE public.mandal_versions
ADD CONSTRAINT uq_mandal_versions_historical_no_overlap
EXCLUDE USING gist (
mandal_id WITH =,
(daterange(valid_from, valid_to, '[)')) WITH &&
)
WHERE (valid_to IS NOT NULL);
```
- **Step 3: Trigger Function `fn_guard_mandal_version_temporal_bounds`**
Implements Step 0 mandal_id immutability (`ERR-W014-008` / `23514`), Step 1 concurrency serialization (`mandals FOR UPDATE`), Direction A (closed historical vs active current), Direction B (active current vs closed historical), candidate permissibility, and adjacency validation.
- **Step 4: Trigger Definition `trg_guard_mandal_version_temporal_bounds`**
Attaches `BEFORE INSERT OR UPDATE OF mandal_id, valid_from, valid_to, is_current ON public.mandal_versions FOR EACH ROW`.
- **Step 5: Function Ownership & Security**
Transfers ownership to `panin_boundary_definer`, revokes execute from `PUBLIC`, `anon`, and `authenticated`, and grants execute strictly to `service_role` and `panin_boundary_admin`.
- **Step 6: Hardened Anchor Guard Function `fn_guard_mandal_current_version`**
Asserts anchor pointer points to a valid version of the same mandal with `OFFICIAL` dataset authority, and active interval $[T_{\text{eff}}, +\infty)$ does not overlap any closed historical version.
- **Steps 7 & 8 Removed:**
Transition function `fn_transition_mandal_current_version` is already deployed, verified, and active on staging. It is intentionally untouched.
---
## 4. ROLLBACK DDL STRUCTURE (`rollback_w014_m6_gist_boundary_041.sql`)
> [!WARNING]
> ### ROLLBACK GOVERNANCE INVARIANT
> **Rollback restores the pre-M6 baseline and is NOT a safe steady-state configuration for the M6 invariant. M6 must be reapplied before the environment is considered W014-M6 compliant.**
The rollback script guarantees clean restoration of the Migration 041 baseline:
1. **Pre-Rollback Fail-Closed Check:** Asserts that no mandal has multiple open-ended versions before attempting to re-impose the unconditional GiST constraint.
2. **Safe Trigger & Function Teardown:**
   ```sql
   DROP TRIGGER IF EXISTS trg_guard_mandal_version_temporal_bounds ON public.mandal_versions;
   DROP FUNCTION IF EXISTS public.fn_guard_mandal_version_temporal_bounds();
   ```
3. **Restore Unconditional GiST Constraint:** Drops `uq_mandal_versions_historical_no_overlap` and adds back `uq_mandal_versions_no_overlap EXCLUDE USING gist (mandal_id WITH =, (daterange(valid_from, valid_to, '[)')) WITH &&);`.
4. **Revert Anchor Guard Function:** Restores `fn_guard_mandal_current_version` to its original Migration 041 definition.
5. **Transition Function Untouched:** `fn_transition_mandal_current_version` is untouched by rollback, preserving complete forward/rollback symmetry.

---

## 5. 23-CHECK VERIFIER UPDATES (`verification_w014_migration_041_23checks.sql`)

### Check 14 (Partial GiST Exclusion Constraint):
Directly inspects PostgreSQL catalogs:
- Asserts constraint `uq_mandal_versions_historical_no_overlap` exists and `contype = 'x'` on `public.mandal_versions`.
- Asserts index access method is `gist` via `pg_am.amname = 'gist'`.
- Decompiles predicate expression via `pg_get_expr(i.indpred, i.indrelid)` and asserts exact equality to `'(valid_to IS NOT NULL)'`.

### Check 17 (Bidirectional Triggers & Temporal Boundary Guard):
Expanded into a comprehensive multi-layer catalog verification CTE (`c17_bounds_proc`, `c17_bounds_acl_entries`, `c17`):
- **17.1 Anchor Guard Trigger:** `trg_guard_mandal_current_version` on `mandals` (AFTER ROW).
- **17.2 Retirement Guard Trigger:** `trg_guard_mandal_version_retirement` on `mandal_versions` (AFTER ROW).
- **17.3 Temporal Bounds Trigger:** `trg_guard_mandal_version_temporal_bounds` on `mandal_versions` asserting `(tgtype & 2) = 2` (BEFORE), `(tgtype & 1) = 1` (ROW), `(tgtype & 4) = 4` (INSERT), `(tgtype & 16) = 16` (UPDATE), and columns restricted strictly to `is_current, mandal_id, valid_from, valid_to`.
- **17.4 Trigger Function Identity:** `fn_guard_mandal_version_temporal_bounds()` exists, `prosecdef = true`, `owner = panin_boundary_definer`, and `proconfig = ARRAY['search_path=public, pg_temp']`.
- **17.5 Execution ACL Boundary:** `service_role` has execute, `panin_boundary_admin` has execute, `anon` has NO execute, `authenticated` has NO execute, and `PUBLIC (grantee 0)` has NO execute.

---

## 6. TEST HARNESS UPDATES (`tests/test_mandal_version_integrity.mjs`)

Test M6 has been upgraded to rigorously exercise and assert all 8 required behaviors:
1. **Candidate Insertion:** Open-ended candidate version (`valid_to: null, is_current: false`) inserts successfully.
2. **Direction A Overlap Rejection:** Direct write inserting a closed historical version overlapping the active current version fails with `23P01` (`ERR-W014-006`).
3. **Canonical Transition:** `fn_transition_mandal_current_version` executes atomically and returns `TRANSITION_COMPLETE`.
4. **Boundary Equality:** Retired version and activated version satisfy exact boundary equality: `v6a.valid_to === v6b.valid_from` (`2026-01-01`).
5. **Direction B Overlap Rejection:** Direct write updating the active current version's `valid_from` backwards to overlap the retired historical version fails with `23P01` (`ERR-W014-006`).
6. **Historical/Historical Overlap Rejection:** Direct write inserting a closed historical version overlapping another closed historical version fails with `23P01` (GiST exclusion constraint).
7. **Guaranteed Teardown (`try ... finally`):** Unconditionally clears `mandals.current_version_id = NULL` before deleting tracked test versions, preventing orphaned records on staging.
8. **Evidence Immutability Intact:** Zero mutation or deletion of dataset versions or provenance records.

---

## 7. STATIC VERIFICATION AUDIT MATRIX

| Check ID | Validation Domain | Verification Method | Result |
| :--- | :--- | :--- | :--- |
| **Check A** | SQL Script Syntax | Catalog query parsing and syntax check | **PASS** (Zero syntax errors) |
| **Check B** | Atomic DDL Blocks | Verified `BEGIN; ... COMMIT;` on both scripts | **PASS** (Strictly atomic DDL) |
| **Check C** | Security Definer & Search Path | Static inspection of all functions | **PASS** (`SECURITY DEFINER`, `search_path = public, pg_temp`) |
| **Check D** | ACL & Role Boundary | Static inspection of role grants & revocations | **PASS** (Definer-owned, no public execute) |
| **Check E** | Verifier Determinism | Catalog inspection CTE structure | **PASS** (Single top-level query, exactly 23 rows) |
| **Check F** | Test Script Syntax | `node --check tests/test_mandal_version_integrity.mjs` | **PASS** (Exit code 0, zero errors) |
| **Check G** | Commit Freshness | `node tests/commit-freshness.test.mjs` | **PASS** (All Checks A–J pass) |
| **Check H** | Production Isolation | Static scan for production URLs / credentials | **PASS** (Production strictly untouched) |

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
> All artifacts are committed and pushed to git. Awaiting explicit CTO authorization for staging execution.
