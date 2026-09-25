# W014 Mandal Temporal Version Architecture: Staging Migration Application Package

**Target Database:** `panIN-staging` (`fkpigozcqnmcvofuksar.supabase.co`)  
**Authorized Scope:** W014 Mandal Temporal Version Architecture (Section 11 of Migration 041)  
**Authorized Baseline Commit:** `f29c58b92164566243b68c95fa9ef7ef081b1262`  
**Governance Authority:** CTO Directive — `W014 CTO FINAL PREFLIGHT GATE — IMPLEMENTATION AUTHORIZED`  
**Environment Isolation:** Staging Only. Production remains 100% untouched.

---

## 1. Migration Package Registry & Cryptographic Fingerprints

| File Path | Description | SHA-256 Checksum |
|---|---|---|
| [`supabase/migrations/041_geography_versioning_and_temporal_validity.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/migrations/041_geography_versioning_and_temporal_validity.sql) | Canonical Migration 041 (Sections 1–11) | `7f20b798b167942c440a5cf3c48001bdd7980e8bdbade4795f3a8457379043e7` |
| [`supabase/staging_migration_package_041.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/staging_migration_package_041.sql) | Synchronized Atomic Staging Migration Package | `7f20b798b167942c440a5cf3c48001bdd7980e8bdbade4795f3a8457379043e7` |
| [`supabase/verify_staging_migration_package_041.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/verify_staging_migration_package_041.sql) | Comprehensive 23-Check SQL Verification Battery | `ee7514bac8a6010e03606d5c7bc3d3e7ff8e25d7bb44cc3356284cd897a6dd6e` |
| [`supabase/rollback_staging_migration_package_041.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/rollback_staging_migration_package_041.sql) | Deterministic Rollback Package | `29ae29413c9655d8c8974534f3faecb7056d12968f53c2a0136451345b05caf2` |
| [`tests/test_mandal_version_integrity.mjs`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/tests/test_mandal_version_integrity.mjs) | Automated M1–M15 Acceptance Test Suite | `9e4d4e3ebb0a9009c7d70289792f90eff7a0ddcf07824412098587acca7a34ba` |
| [`scripts/verify_w014_temporal_validity.mjs`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/scripts/verify_w014_temporal_validity.mjs) | Static Preflight & Integrity Validator | `0751499929b51eab98c25332fbe79f063917de1c1e3c377131fece526ec34b55` |
| [`tests/test_dataset_version_reconciliation.mjs`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/tests/test_dataset_version_reconciliation.mjs) | 10-field W014 dataset-definition reconciliation Semantic Test | `844c7fd72b675fb8461029d7d9a3c75563710e71e5108625b11b79e940ed7dab` |

*Note: The canonical migration file and the atomic staging migration package are verified bit-for-bit identical with matching SHA-256 hashes.*

---

## 2. Summary of Authorized Changes in Migration 041 (Section 11)

Section 11 implements the complete, authorized W014 Mandal Temporal Version Architecture:

1. **Security Definer & Admin Roles:**
   - `panin_boundary_definer`: `NOLOGIN`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, zero role memberships, not owner of target tables.
   - `panin_boundary_admin`: Dedicated application mutation role.
2. **Schema Usage:**
   - `GRANT USAGE ON SCHEMA public TO panin_boundary_definer;`
3. **Table `public.mandal_versions`:**
   - Columns: `id UUID`, `mandal_id TEXT`, `district_id TEXT`, `version_code TEXT`, `name TEXT`, `name_te TEXT`, `headquarters TEXT`, `lgd_code TEXT`, `census_code_2011 TEXT`, `valid_from DATE`, `valid_to DATE`, `is_current BOOLEAN`, `primary_dataset_version_id TEXT`, `metadata JSONB`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.
   - Constraints:
     - `uq_mandal_versions_code`: `UNIQUE (version_code)`
     - `uq_mandal_versions_id_mandal`: `UNIQUE (id, mandal_id)` (Target for composite same-anchor FK)
     - `uq_mandal_versions_no_overlap`: `EXCLUDE USING gist (mandal_id WITH =, (daterange(valid_from, valid_to, '[)')) WITH &&)`
     - `chk_mandal_versions_current_invariants`: `CHECK ((is_current = false) OR (is_current = true AND valid_to IS NULL))`
     - Partial Unique Index: `uq_mandal_versions_single_current` on `(mandal_id) WHERE is_current = true`
4. **Stable Anchor `public.mandals`:**
   - Additive column: `current_version_id UUID`
   - Composite Foreign Key: `fk_mandals_current_version_same_anchor` `FOREIGN KEY (current_version_id, id) REFERENCES public.mandal_versions(id, mandal_id) ON DELETE RESTRICT DEFERRABLE INITIALLY IMMEDIATE`
5. **Exact Least-Privilege Definer Grants:**
   - `GRANT SELECT ON TABLE public.dataset_versions TO panin_boundary_definer;`
   - `GRANT SELECT ON TABLE public.provenance_records TO panin_boundary_definer;`
   - `GRANT SELECT ON TABLE public.mandals TO panin_boundary_definer;`
   - `GRANT UPDATE (current_version_id, updated_at) ON TABLE public.mandals TO panin_boundary_definer;`
   - `GRANT SELECT ON TABLE public.mandal_versions TO panin_boundary_definer;`
   - `GRANT UPDATE (is_current, valid_from, valid_to, updated_at) ON TABLE public.mandal_versions TO panin_boundary_definer;`
   - Table-level `INSERT`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` are strictly omitted.
6. **Constraint Triggers (Pointer & Currentness Protection):**
   - `trg_guard_mandal_current_version` (Layer 2 on `mandals`): Enforces that `current_version_id` references a version with `is_current = true` AND that the version's `primary_dataset_version_id` resolves to a W012 dataset with `default_status = 'OFFICIAL'`.
   - `trg_guard_mandal_version_retirement` (Layer 3 on `mandal_versions`): Prevents retiring (`is_current` set to `false`) or deleting any version actively referenced by `mandals.current_version_id`.
7. **Atomic Transition Function:**
   - Exact 5-parameter signature: `public.fn_transition_mandal_current_version(p_mandal_id TEXT, p_new_version_id UUID, p_effective_date DATE, p_operator TEXT, p_provenance_id UUID DEFAULT NULL)`
   - Defined with `SECURITY DEFINER` and `SET search_path = public, pg_temp`.
   - Owned by `panin_boundary_definer`.
   - Acquires row-level locks on `mandals` and candidate `mandal_versions`.
   - Enforces W012 OFFICIAL dataset status.
   - Enforces candidate version is open-ended (`valid_to IS NULL`).
   - If provenance UUID provided, validates existence against `provenance_records`.
   - Performs atomic retirement of previous active version (`is_current = false, valid_to = p_effective_date`), activation of new version (`is_current = true, valid_from = p_effective_date, valid_to = NULL`), and assignment of stable anchor pointer (`current_version_id = p_new_version_id`).
   - Emits structured JSONB receipt with `status = 'TRANSITION_COMPLETE'`, execution identity `SESSION_USER`, and audit metadata `operator = p_operator`.
8. **Privilege Boundary & ACL Enforcement:**
   - `REVOKE ALL ON FUNCTION public.fn_transition_mandal_current_version(text,uuid,date,text,uuid) FROM PUBLIC, anon, authenticated;`
   - `GRANT EXECUTE ON FUNCTION public.fn_transition_mandal_current_version(text,uuid,date,text,uuid) TO service_role, panin_boundary_admin;`
9. **Row-Level Security:**
   - Enabled on `public.mandal_versions`: unauthenticated read permitted (`FOR SELECT USING (true)`), direct mutations restricted to `service_role`.

---

## 3. Step-by-Step Staging Execution Instructions for User / CTO

Because Supabase staging does not expose direct DDL endpoints over PostgREST and requires privileged dashboard execution:

1. **Open Supabase SQL Editor:**
   - Log into the Supabase Dashboard: [https://supabase.com/dashboard/project/fkpigozcqnmcvofuksar](https://supabase.com/dashboard/project/fkpigozcqnmcvofuksar)
   - Navigate to **SQL Editor** -> **New Query**.
2. **Execute Staging Migration Package:**
   - Copy the entire contents of [`supabase/staging_migration_package_041.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/staging_migration_package_041.sql).
   - Paste into the SQL Editor and click **Run**.
   - Verify result: `Success. No rows returned.`
3. **Execute SQL Verification Battery:**
   - Open a new query in the SQL Editor.
   - Copy the entire contents of [`supabase/verify_staging_migration_package_041.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/verify_staging_migration_package_041.sql).
   - Click **Run**.
   - Verify notices:
     ```
     NOTICE:  Check 1 PASS: Table public.mandal_versions exists
     ...
     NOTICE:  Check 23 PASS: PUBLIC has zero EXECUTE privilege on fn_transition_mandal_current_version
     NOTICE:  SUCCESS: ALL 23 STAGING VERIFICATION CHECKS PASSED FOR MIGRATION 041!
     ```
4. **Run Live Acceptance Test Suite:**
   - In terminal, execute:
     ```bash
     node tests/test_mandal_version_integrity.mjs
     ```
   - Verify that all M1–M15 test assertions execute cleanly against the live staging schema.
5. **Rollback Instructions (If Required):**
   - If rollback is necessary, copy and run [`supabase/rollback_staging_migration_package_041.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/rollback_staging_migration_package_041.sql) in the Supabase SQL Editor.
