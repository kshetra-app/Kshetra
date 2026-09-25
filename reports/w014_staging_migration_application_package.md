# W014 Mandal Temporal Version Architecture: Staging Migration Application Package

**Target Database:** `panIN-staging` (`fkpigozcqnmcvofuksar.supabase.co`)  
**Authorized Scope:** W014 Mandal Temporal Version Architecture (Section 11 of Migration 041 & Check 22 Remediation)  
**Governance Authority:** CTO Directive — `W014 RUNTIME FAILURE — CHECK 22`  
**Environment Isolation:** Staging Only. Production remains 100% untouched.

---

## 1. Migration Package Registry & Cryptographic Fingerprints

| File Path | Description | SHA-256 Checksum |
|---|---|---|
| [`supabase/remediation_w014_function_acl_041.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/remediation_w014_function_acl_041.sql) | Standalone Check 22 Function ACL Remediation Package (for live staging) | `3949bdc2721737bdabf9df26b92b65ffa07c46e115d179ee36790e589b92d12e` |
| [`supabase/migrations/041_geography_versioning_and_temporal_validity.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/migrations/041_geography_versioning_and_temporal_validity.sql) | Canonical Migration 041 (Sections 1–11 with corrected bootstrap ordering) | `a2a74731eecf235ac35c4b6d351d77acf6083c3d326cdd17aa79128158350f03` |
| [`supabase/staging_migration_package_041.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/staging_migration_package_041.sql) | Synchronized Atomic Staging Migration Package (Sections 1–11) | `a2a74731eecf235ac35c4b6d351d77acf6083c3d326cdd17aa79128158350f03` |
| [`supabase/verify_staging_migration_package_041.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/verify_staging_migration_package_041.sql) | Comprehensive 23-Check SQL Verification Battery | `aef25c7b667c97af175f8a03766f33a58b95509b4df0f8fa8316ac7a428eee27` |
| [`supabase/rollback_staging_migration_package_041.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/rollback_staging_migration_package_041.sql) | Deterministic Rollback Package | `29ae29413c9655d8c8974534f3faecb7056d12968f53c2a0136451345b05caf2` |
| [`tests/test_mandal_version_integrity.mjs`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/tests/test_mandal_version_integrity.mjs) | Automated M1–M15 Acceptance Test Suite | `3a24c64ef7d2fd2f8d70ce466093cb789d9d1190369428af8a404fc605d32cfa` |
| [`scripts/verify_w014_temporal_validity.mjs`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/scripts/verify_w014_temporal_validity.mjs) | Static Preflight & Integrity Validator | `c82ff741b487d351c4e8a59f61eeb4769afe15a38e57ec3e2dace9eb801db56e` |
| [`tests/test_dataset_version_reconciliation.mjs`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/tests/test_dataset_version_reconciliation.mjs) | 10-field W014 dataset-definition reconciliation Semantic Test | `844c7fd72b675fb8461029d7d9a3c75563710e71e5108625b11b79e940ed7dab` |

*Note: The canonical migration file and the atomic staging migration package are verified bit-for-bit identical with matching SHA-256 hashes.*

---

## 2. Root Cause Analysis: Check 22 Failure (DEF-W014-041-ACL-ORDERING)

### 2.1 Failure Symptom
During post-migration verification on `panIN-staging`, Check 22 failed with:
```
ERROR: P0001: Check 22 Failed: PUBLIC (grantee=0) possesses EXECUTE privilege on transition function in catalog proacl
CONTEXT: PL/pgSQL function inline_code_block line 301 at RAISE
```

### 2.2 Kernel Root Cause
In Migration 041 Section 11, the original sequence was:
1. `GRANT panin_boundary_definer TO CURRENT_USER;`
2. `GRANT CREATE ON SCHEMA public TO panin_boundary_definer;`
3. `ALTER FUNCTION public.fn_transition_mandal_current_version(...) OWNER TO panin_boundary_definer;`
4. `REVOKE CREATE ON SCHEMA public FROM panin_boundary_definer;`
5. `REVOKE panin_boundary_definer FROM CURRENT_USER;`  <-- **PREMATURE ROLE MEMBERSHIP REVOCATION**
6. `REVOKE ALL ON FUNCTION public.fn_transition_mandal_current_version(...) FROM PUBLIC;`
7. `REVOKE ALL ... FROM anon;`
8. `REVOKE ALL ... FROM authenticated;`
9. `GRANT EXECUTE ... TO service_role;`
10. `GRANT EXECUTE ... TO panin_boundary_admin;`

Under PostgreSQL kernel security rules (`src/backend/commands/aclchk.c::check_grant_rights`):
- To execute `GRANT` or `REVOKE` on a function, the executing role (`CURRENT_USER`, i.e. `postgres`) must either be a superuser, the owner of the function, or a member of the role that owns the function.
- In managed PostgreSQL environments such as Supabase, `postgres` is **not** a superuser (`rolsuper = false`).
- Because step 5 revoked `panin_boundary_definer` from `CURRENT_USER` *before* the ACL statements in steps 6–10, `postgres` was no longer the owner nor a member of the owner role.
- PostgreSQL handles unprivileged grant/revoke attempts by emitting a non-fatal warning: `WARNING: no privileges were revoked for "..."` (or silently skipping in batch mode without raising an error).
- Consequently, the migration transaction completed successfully without errors, but the function's ACL was never modified in `pg_proc.proacl`. The default PostgreSQL ACL (which grants `EXECUTE` to `PUBLIC` / grantee OID 0) remained active.

---

## 3. Two-Path Deterministic Remediation Architecture

### Path A: Targeted Remediation for Live Mutated Staging Database (Recommended)
Since Migration 041 ran successfully on `panIN-staging` and all Section 1–11 tables, columns, indexes, and triggers are already in place, there is no need to roll back and rerun the full 1200+ line migration.
The standalone remediation script [`supabase/remediation_w014_function_acl_041.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/remediation_w014_function_acl_041.sql) cleanly and atomically reconciles the function ACL:
```sql
BEGIN;
GRANT panin_boundary_definer TO CURRENT_USER;
REVOKE ALL ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_transition_mandal_current_version(TEXT, UUID, DATE, TEXT, UUID) TO panin_boundary_admin;
REVOKE panin_boundary_definer FROM CURRENT_USER;
COMMIT;
```

### Path B: Fresh Execution for Clean Replay / New Environments
Both [`supabase/migrations/041_geography_versioning_and_temporal_validity.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/migrations/041_geography_versioning_and_temporal_validity.sql) and [`supabase/staging_migration_package_041.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/staging_migration_package_041.sql) have been updated so that `REVOKE panin_boundary_definer FROM CURRENT_USER;` is strictly the final operation after all ACL statements. Any fresh replay of Migration 041 will establish the correct ACL on the first run.

---

## 4. Step-by-Step Execution Instructions for User / CTO

### Step 1: Execute Standalone Remediation on Staging (Path A)
1. Open the Supabase Dashboard for `panIN-staging`:
   [https://supabase.com/dashboard/project/fkpigozcqnmcvofuksar](https://supabase.com/dashboard/project/fkpigozcqnmcvofuksar)
2. Navigate to **SQL Editor** -> **New Query**.
3. Copy and paste the entire contents of [`supabase/remediation_w014_function_acl_041.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/remediation_w014_function_acl_041.sql).
4. Click **Run**.
5. Confirm output: `Success. No rows returned.`

### Step 2: Re-run Verification Battery
1. Open a new query in the Supabase SQL Editor.
2. Copy and paste [`supabase/verify_staging_migration_package_041.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/verify_staging_migration_package_041.sql).
3. Click **Run**.
4. Confirm notice output includes:
   ```
   NOTICE:  Check 22 PASS: Complete function EXECUTE ACL verified (service_role=EXECUTE, panin_boundary_admin=EXECUTE, PUBLIC=NO EXECUTE via grantee 0 proacl, anon=NO EXECUTE, authenticated=NO EXECUTE)
   NOTICE:  Check 23 PASS: Table public.mandal_versions has RLS enabled
   NOTICE:  SUCCESS: ALL 23 STAGING VERIFICATION CHECKS PASSED FOR MIGRATION 041!
   ```

### Step 3: Run Automated M1–M15 Acceptance Test Battery
Execute in terminal:
```bash
node tests/test_mandal_version_integrity.mjs
```
Confirm all 15 acceptance criteria pass against the live database.
