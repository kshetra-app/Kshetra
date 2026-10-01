# W021-G2: STAGING EXECUTION & LIVE VERIFICATION REPORT (REMEDIATED)

## 1. Executive Summary & Verification Coordinates

Pursuant to **CTO REMEDIATION DIRECTIVE — W021-G2: CRITICAL TENANT-ISOLATION DEFECT RESOLUTION**, this report presents the execution and verification findings for **Gate W021-G2**.

| Coordinate Field | Value |
|---|---|
| **Milestone / Gate** | `W021-G2` (Remediation) |
| **Authority** | CTO REMEDIATION DIRECTIVE — CRITICAL TENANT-ISOLATION DEFECT |
| **Execution Timestamp** | `2026-10-01T17:40:00.000Z` |
| **Target Staging Environment** | `panIN-staging` (`fkpigozcqnmcvofuksar` / `https://fkpigozcqnmcvofuksar.supabase.co`) |
| **Production Air-Gap Status** | **100% AIR-GAPPED & UNTOUCHED** (`ehfafcnimmjusyvplbah`) |
| **589 PostGIS Geometry Count** | `589` rows (Strictly Frozen) |
| **589 PostGIS Geometry Digest** | `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` |
| **Staging Package** | `supabase/staging_migration_package_056.sql` |
| **Verification Script** | `supabase/verification_056_saas_partner_foundation.sql` |
| **Rollback Script Status** | Contingency-only (`supabase/rollback_056_saas_partner_foundation.sql` NOT executed) |
| **W021-G3 Onward Status** | **STRICTLY NOT AUTHORIZED / FROZEN** |

---

## 2. Production Air-Gap Verification

Under strict CTO instructions and Master Execution Framework Rule IV-001:
* **Target Scoping**: Network requests and connection parameters were verified exclusively against staging (`fkpigozcqnmcvofuksar.supabase.co`).
* **Production Protection**: The production database `ehfafcnimmjusyvplbah` was **NEVER** contacted. Zero connections, zero SQL executions, and zero migrations occurred against production.
* **Environment Integrity**: Production service-role credentials remain excluded from the execution context.

---

## 3. EVIDENCE CATEGORY 1: PREFLIGHT & REMEDIATION EVIDENCE

The preflight phase verified the structural correctness, relational integrity, RLS policies, and idempotency of Migration 056 across 28 automated invariant checks in an isolated PostgreSQL 17.6 rehearsal environment (`w021_g2_pg_verify`).

* **Preflight Battery**: **28 / 28 PASS (100.0%)** (`tests/saas-migration-056-preflight.test.mjs`).
* **Preflight Report**: Full documentation recorded in `reports/w021_g2_migration_preflight.md` and `reports/w021_g2_migration_preflight.json`.
* **Idempotency Proof**: Clean replay verified with zero errors under `IF NOT EXISTS` guards.
* **Rehearsal Rollback Proof**: Induced mid-transaction failure verified zero partial schema application.
* **Composite Tenant/Application Isolation**:
  - `Probe 4A`: Tenant A + Application B rejected with foreign key constraint violation `fk_saas_api_keys_tenant_application`.
  - `Probe 4B`: Tenant A + Application A succeeded cleanly.
  - `Probe 4C`: Tenant B + Application B succeeded cleanly.
* **Usage Ledger NULL Uniqueness**:
  - `Probe 10B`: Duplicate insertion of `(tenant_id, NULL, hour_bucket)` rejected by `uq_saas_usage_bucket` (`UNIQUE NULLS NOT DISTINCT`).
* **Revoked Key Audit Lifecycle**:
  - `Probe 5`: Soft-revoked key persisted with `revoked_at` populated and excluded from partial index `idx_saas_api_keys_lookup`.
  - `Probe 12B`: Status `active` with non-null `revoked_at` rejected by check constraint `chk_saas_api_keys_revoked_at`.

---

## 4. EVIDENCE CATEGORY 2: STAGING TRANSACTIONAL PACKAGE EXECUTION

### 4.1 Execution Package Specification
* **File**: `supabase/staging_migration_package_056.sql`
* **Transactional Enclosure**: `BEGIN; ... COMMIT;`

### 4.2 Raw SQL Verification Output (Captured Verbatim)
```text
NOTICE:  === EXECUTING VERIFICATION 056 CHECKS ===
NOTICE:  [PASS] All 4 SaaS tables exist
NOTICE:  [PASS] All 4 primary keys verified
NOTICE:  [PASS] Composite UNIQUE constraint uq_saas_applications_tenant_app verified
NOTICE:  [PASS] Composite foreign key fk_saas_api_keys_tenant_application verified
NOTICE:  [PASS] saas_usage_ledger.api_key_id ON DELETE SET NULL verified
NOTICE:  [PASS] saas_usage_ledger UNIQUE NULLS NOT DISTINCT verified: UNIQUE NULLS NOT DISTINCT (tenant_id, api_key_id, hour_bucket)
NOTICE:  [PASS] saas_api_keys.revoked_at column verified
NOTICE:  [PASS] Performance and lookup indexes verified (6 found)
NOTICE:  [PASS] ROW LEVEL SECURITY enabled and forced on all 4 tables
NOTICE:  === ALL VERIFICATION 056 CHECKS PASSED SUCCESSFULLY ===
DO
```

---

## 5. Itemized Contract Verification Matrix

| Requirement | Audit Target | Verified State | Status |
|---|---|---|:---:|
| **Composite Tenant/App FK** | `saas_api_keys` | `FOREIGN KEY (tenant_id, application_id) REFERENCES saas_applications(tenant_id, id)` | **PASS** |
| **Composite Unique on App** | `saas_applications` | `UNIQUE (tenant_id, id)` constraint `uq_saas_applications_tenant_app` | **PASS** |
| **Hardened Retention** | `saas_usage_ledger` | `api_key_id` FK is `ON DELETE SET NULL` (`confdeltype = 'n'`) | **PASS** |
| **NULL Uniqueness** | `saas_usage_ledger` | `UNIQUE NULLS NOT DISTINCT (tenant_id, api_key_id, hour_bucket)` | **PASS** |
| **Audit Timestamp** | `saas_api_keys` | `revoked_at TIMESTAMPTZ` + check constraint | **PASS** |
| **Partial Active Index** | `saas_api_keys` | `idx_saas_api_keys_lookup` on `key_hash` WHERE `status = 'active'` | **PASS** |
| **RLS Enabled & Forced** | All 4 tables | `relrowsecurity = true` AND `relforcerowsecurity = true` on all 4 tables | **PASS** |
| **Direct Access Revoked** | All 4 tables | Direct access revoked from `anon`, `authenticated`, `public` | **PASS** |
| **Service Role Granted** | All 4 tables | Unconstrained administrative policies granted to `service_role` | **PASS** |
| **PostGIS Geometry Count** | `entity_geometries` | Exactly `589` rows | **PASS** |
| **PostGIS Geometry Digest** | `entity_geometries` | Exact SHA-256: `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` | **PASS** |

---

## 6. Prohibited Actions Compliance Audit

Pursuant to CTO Directive:
* `apps/api`: **UNTOUCHED** (0 route / auth middleware modifications).
* `apps/mobile`: **UNTOUCHED** (0 file modifications).
* API routes under `/api/vsaas/v1/...`: **NOT CREATED**.
* Rate limiters / Fastify plugins: **NOT CREATED**.
* OpenAPI SaaS spec: **NOT CREATED**.
* Production (`ehfafcnimmjusyvplbah`): **UNTOUCHED / 100% AIR-GAPPED**.
* Gates W021-G3 through G6: **STRICTLY NOT STARTED / GATED**.
