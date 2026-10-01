# W021-G2: MIGRATION 056 PREFLIGHT & SCHEMA INTEGRITY REPORT (REMEDIATED)

## 1. Executive Summary & Verification Coordinates

Pursuant to **CTO REMEDIATION DIRECTIVE — W021-G2: CRITICAL TENANT-ISOLATION DEFECT RESOLUTION**, this document records the comprehensive resolution, architectural proofs, and empirical verification for Migration 056: SaaS Partner Foundation.

| Coordinate Field | Value |
|---|---|
| **Milestone / Gate** | `W021-G2` (Remediation) |
| **Authority** | CTO REMEDIATION DIRECTIVE — CRITICAL TENANT-ISOLATION DEFECT |
| **Ratified Plan Reference** | `PLAN-W021-MASTER-REV-1.0.md` |
| **Execution Timestamp** | `2026-10-01T17:39:36.584Z` |
| **Target Staging Environment** | `panIN-staging` (`fkpigozcqnmcvofuksar` / `https://fkpigozcqnmcvofuksar.supabase.co`) |
| **Production Air-Gap Status** | **100% AIR-GAPPED & UNTOUCHED** (`ehfafcnimmjusyvplbah`) |
| **Isolated Rehearsal DB** | PostgreSQL 17.6 (`supabase_db_Kshetra` / `w021_g2_pg_verify`) |
| **Migration File** | `supabase/migrations/056_saas_partner_foundation.sql` |
| **Staging Package** | `supabase/staging_migration_package_056.sql` |
| **Verification Script** | `supabase/verification_056_saas_partner_foundation.sql` |
| **Rollback Script (Contingency)**| `supabase/rollback_056_saas_partner_foundation.sql` |
| **Preflight Test Battery** | **28 / 28 PASS (100.0%)** (`tests/saas-migration-056-preflight.test.mjs`) |
| **PostGIS 589 Geometry Baseline** | Exactly `589` rows, Digest: `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` |
| **W021-G3 Onward Status** | **STRICTLY NOT AUTHORIZED / GATED** |

---

## 2. Root Cause Analysis of Defect & Remediations Applied

### 2.1 Critical Tenant-Isolation Defect
* **Root Cause**: The initial draft of Migration 056 defined `saas_api_keys.tenant_id REFERENCES saas_tenants(id)` and `saas_api_keys.application_id REFERENCES saas_applications(id)` independently. Because `saas_applications` was only referenced by its surrogate primary key `id`, PostgreSQL allowed a row in `saas_api_keys` to pair `tenant_id = Tenant A` with `application_id = Application B` (where Application B belonged to Tenant B).
* **Remediation**:
  1. Added composite unique constraint `uq_saas_applications_tenant_app UNIQUE (tenant_id, id)` on `public.saas_applications`.
  2. Replaced the single-column foreign key with composite foreign key:
     ```sql
     CONSTRAINT fk_saas_api_keys_tenant_application
       FOREIGN KEY (tenant_id, application_id)
       REFERENCES public.saas_applications(tenant_id, id)
       ON DELETE CASCADE
     ```
  3. The database kernel physically rejects any inconsistent `(tenant_id, application_id)` tuple.

### 2.2 Secondary Issue: Usage Ledger NULL Uniqueness
* **Root Cause**: When an API key is deleted, `api_key_id` is set to `NULL` via `ON DELETE SET NULL`. Under standard PostgreSQL `UNIQUE (tenant_id, api_key_id, hour_bucket)`, SQL NULL semantics treat each NULL as distinct, allowing duplicate orphaned usage rows for the same tenant and hour bucket.
* **Remediation**:
  Enforced PostgreSQL 15+ standard constraint:
  ```sql
  CONSTRAINT uq_saas_usage_bucket UNIQUE NULLS NOT DISTINCT (tenant_id, api_key_id, hour_bucket)
  ```
  Now, even when `api_key_id` is `NULL`, PostgreSQL rejects duplicate rows with identical `(tenant_id, NULL, hour_bucket)`.

### 2.3 Secondary Issue: `revoked_at` Column & Audit Lifecycle
* **Root Cause**: Architecture specifications described soft-revocation with `revoked_at`, but the column was omitted from the DDL.
* **Remediation**:
  Added `revoked_at TIMESTAMPTZ` and check constraint:
  ```sql
  CONSTRAINT chk_saas_api_keys_revoked_at CHECK (
    (status = 'active' AND revoked_at IS NULL) OR
    (status IN ('revoked', 'compromised') AND revoked_at IS NOT NULL)
  )
  ```
  Guarantees active keys have `revoked_at IS NULL`, and revoked/compromised keys must have an explicit timestamp. Revocation is permanent.

---

## 3. Preflight Test Battery (28 / 28 PASS)

| Test ID | Category | Check Description | Result |
|---|---|---|:---:|
| `W021-G2-MIG-01` | Migration Atomicity | Migration 056 executes transactionally with exit code 0 | **PASS** |
| `W021-G2-MIG-02` | Idempotency | Migration 056 is idempotent on replay | **PASS** |
| `W021-G2-MIG-03` | Rollback Proof | Failure rehearsal rolls back cleanly | **PASS** |
| `W021-G2-SCH-01` | Catalog | All 4 ratified SaaS tables exist | **PASS** |
| `W021-G2-SCH-02` | Relational | Composite UNIQUE and composite FK exist | **PASS** |
| `W021-G2-SCH-03` | Indexes | Partial active key lookup index exists | **PASS** |
| `W021-G2-SCH-04` | Security | RLS ENABLED and FORCED on all 4 tables | **PASS** |
| `W021-G2-SCH-05` | Audit Schema | `revoked_at` column exists and is nullable | **PASS** |
| `W021-G2-PROBE-01` | Probe 1 | Anon direct access denied | **PASS** |
| `W021-G2-PROBE-02` | Probe 2 | Authenticated direct access denied | **PASS** |
| `W021-G2-PROBE-03` | Probe 3 | Arbitrary tenant access denied | **PASS** |
| `W021-G2-PROBE-04A` | Probe 4A | Cross-tenant rejection: Tenant A + Application B fails with composite FK violation | **PASS** |
| `W021-G2-PROBE-04B` | Probe 4B | Same-tenant association: Tenant A + Application A succeeds | **PASS** |
| `W021-G2-PROBE-04C` | Probe 4C | Same-tenant association: Tenant B + Application B succeeds | **PASS** |
| `W021-G2-PROBE-05` | Probe 5 | Revoked key persisted with `revoked_at` and excluded from partial index | **PASS** |
| `W021-G2-PROBE-06` | Probe 6 | Historical usage remains after key revocation | **PASS** |
| `W021-G2-PROBE-07` | Probe 7 | Physical key deletion sets `api_key_id = NULL` (ON DELETE SET NULL) | **PASS** |
| `W021-G2-PROBE-08` | Probe 8 | Duplicate `key_hash` rejected | **PASS** |
| `W021-G2-PROBE-09` | Probe 9 | Duplicate tenant slug rejected | **PASS** |
| `W021-G2-PROBE-10A` | Probe 10A | Duplicate usage bucket with non-null key rejected | **PASS** |
| `W021-G2-PROBE-10B` | Probe 10B | Duplicate usage bucket with NULL key rejected (UNIQUE NULLS NOT DISTINCT) | **PASS** |
| `W021-G2-PROBE-11` | Probe 11 | Expired-key representation verified | **PASS** |
| `W021-G2-PROBE-12A` | Probe 12A | Invalid key status rejected | **PASS** |
| `W021-G2-PROBE-12B` | Probe 12B | `revoked_at` check constraint consistency enforced | **PASS** |
| `W021-G2-PROBE-13` | Probe 13 | Invalid application environment rejected | **PASS** |
| `W021-G2-PROBE-14` | Probe 14 | Invalid tenant tier rejected | **PASS** |
| `W021-G2-GEO-01` | Geometry | PostGIS 589 geometry count and digest frozen | **PASS** |
| `W021-G2-PRD-01` | Air-Gap | Production environment is 100% air-gapped | **PASS** |
