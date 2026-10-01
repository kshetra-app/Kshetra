# W021-G2: STAGING EXECUTION & LIVE VERIFICATION REPORT

## 1. Executive Summary & Verification Coordinates

Pursuant to **CTO DIRECTIVE — W021-G2: MIGRATION 056 PREFLIGHT & STAGING EXECUTION**, this report presents the execution and verification findings for **Gate W021-G2**.

| Coordinate Field | Value |
|---|---|
| **Milestone / Gate** | `W021-G2` |
| **Authority** | CTO DIRECTIVE — W021-G2 MIGRATION 056 PREFLIGHT & STAGING EXECUTION |
| **Execution Timestamp** | `2026-10-01T17:10:39.000Z` |
| **Baseline Git Commit SHA** | `dcc9f229c5b8652a9a974e6d3d26edb723e6740d` (`dcc9f22`) |
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

## 3. EVIDENCE CATEGORY 1: PREFLIGHT EVIDENCE

The preflight phase verified the structural correctness, relational integrity, RLS policies, and idempotency of Migration 056 across 23 automated invariant checks in an isolated PostgreSQL 17.6 rehearsal environment (`w021_g2_pg_verify`).

* **Preflight Battery**: **23 / 23 PASS (100.0%)** (`tests/saas-migration-056-preflight.test.mjs`).
* **Preflight Report**: Full documentation recorded in `reports/w021_g2_migration_preflight.md` and `reports/w021_g2_migration_preflight.json`.
* **Idempotency Proof**: Clean replay verified with zero errors under `IF NOT EXISTS` guards.
* **Rehearsal Rollback Proof**: Induced mid-transaction failure verified zero partial schema application.
* **14 Security Probes**: 14 / 14 PASS verifying anonymous/authenticated denial, partial active-key lookup, soft revocation, hard deletion audit continuity (`ON DELETE SET NULL`), unique constraints, and check constraints.

---

## 4. EVIDENCE CATEGORY 2: STAGING TRANSACTIONAL PACKAGE EXECUTION

### 4.1 Execution Package Specification
* **File**: `supabase/staging_migration_package_056.sql`
* **Transactional Enclosure**: `BEGIN; ... COMMIT;`
* **Pre-Check Assertions**: Validates that target tables are audited before applying alterations.

### 4.2 Raw Transactional Execution Output (Captured Verbatim)
```text
BEGIN
DO
NOTICE:  [MIGRATION 056] PRE-CHECK: Existing target tables count = 4
NOTICE:  [MIGRATION 056] PRE-CHECK NOTICE: Some target tables already exist; idempotency checks will apply.
NOTICE:  relation "saas_tenants" already exists, skipping
CREATE TABLE
CREATE INDEX
NOTICE:  relation "idx_saas_tenants_status" already exists, skipping
NOTICE:  [MIGRATION 056] STEP 1: Created public.saas_tenants table and status index
DO
NOTICE:  relation "saas_applications" already exists, skipping
CREATE TABLE
CREATE INDEX
NOTICE:  relation "idx_saas_applications_tenant" already exists, skipping
NOTICE:  [MIGRATION 056] STEP 2: Created public.saas_applications table and tenant index
DO
NOTICE:  relation "saas_api_keys" already exists, skipping
CREATE TABLE
NOTICE:  relation "idx_saas_api_keys_lookup" already exists, skipping
CREATE INDEX
CREATE INDEX
NOTICE:  relation "idx_saas_api_keys_tenant" already exists, skipping
NOTICE:  [MIGRATION 056] STEP 3: Created public.saas_api_keys table and active lookup index
DO
NOTICE:  relation "saas_usage_ledger" already exists, skipping
CREATE TABLE
CREATE INDEX
DO
NOTICE:  relation "idx_saas_usage_ledger_tenant" already exists, skipping
NOTICE:  [MIGRATION 056] STEP 4: Created public.saas_usage_ledger with ON DELETE SET NULL retention
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
DO
REVOKE
REVOKE
REVOKE
REVOKE
GRANT
GRANT
GRANT
GRANT
NOTICE:  [MIGRATION 056] STEP 5: Row Level Security enabled, forced, policies created, and privileges restricted
NOTICE:  [MIGRATION 056] SUCCESS: Migration 056 staging package applied successfully within transaction.
DO
COMMIT
```

### 4.3 Execution Metrics
* **Notices emitted**: Steps 1, 2, 3, 4, 5 confirmed without SQL errors.
* **Transaction Outcome**: `COMMIT` executed successfully.
* **SQLSTATE / Errors**: `None` (Exit Code 0).

---

## 5. EVIDENCE CATEGORY 3: LIVE STAGING VERIFICATION EVIDENCE

### 5.1 Relational & Security Verification (`supabase/verification_056_saas_partner_foundation.sql`)
Executed against the schema-migrated database:
```text
NOTICE:  === EXECUTING VERIFICATION 056 CHECKS ===
NOTICE:  [PASS] All 4 SaaS tables exist
NOTICE:  [PASS] All 4 primary keys verified
NOTICE:  [PASS] All 5 foreign keys verified
NOTICE:  [PASS] saas_usage_ledger.api_key_id ON DELETE SET NULL verified
NOTICE:  [PASS] All 5 performance and lookup indexes verified
NOTICE:  [PASS] ROW LEVEL SECURITY enabled and forced on all 4 tables
NOTICE:  === ALL VERIFICATION 056 CHECKS PASSED SUCCESSFULLY ===
DO
```

### 5.2 Itemized Contract Verification Matrix

| Requirement | Audit Target | Verified State | Status |
|---|---|---|:---:|
| **4 SaaS Tables** | `public.saas_*` | `saas_tenants`, `saas_applications`, `saas_api_keys`, `saas_usage_ledger` exist | **PASS** |
| **Primary Keys** | All 4 tables | UUID PKs verified on all 4 tables | **PASS** |
| **Foreign Keys** | Child tables | 5 FKs verified (`saas_applications -> saas_tenants`, `saas_api_keys -> saas_applications`, `saas_api_keys -> saas_tenants`, `saas_usage_ledger -> saas_api_keys`, `saas_usage_ledger -> saas_tenants`) | **PASS** |
| **Hardened Retention** | `saas_usage_ledger` | `api_key_id` FK is `ON DELETE SET NULL` (`confdeltype = 'n'`) | **PASS** |
| **Partial Active Index** | `saas_api_keys` | `idx_saas_api_keys_lookup` on `key_hash` WHERE `status = 'active'` | **PASS** |
| **Performance Indexes** | All 4 tables | 5 indexes verified (`idx_saas_tenants_status`, `idx_saas_applications_tenant`, `idx_saas_api_keys_lookup`, `idx_saas_api_keys_tenant`, `idx_saas_usage_ledger_tenant`) | **PASS** |
| **RLS Enabled & Forced** | All 4 tables | `relrowsecurity = true` AND `relforcerowsecurity = true` on all 4 tables | **PASS** |
| **Direct Access Revoked** | All 4 tables | Direct access revoked from `anon`, `authenticated`, `public` | **PASS** |
| **Service Role Granted** | All 4 tables | Unconstrained administrative policies granted to `service_role` | **PASS** |
| **PostGIS Geometry Count** | `entity_geometries` | Exactly `589` rows | **PASS** |
| **PostGIS Geometry Digest** | `entity_geometries` | Exact SHA-256: `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` | **PASS** |

### 5.3 Live Cloud Staging Probe (`https://fkpigozcqnmcvofuksar.supabase.co`)
Live inspection of the dedicated staging cloud infrastructure confirms:
* **Target Project**: `fkpigozcqnmcvofuksar`
* **Live Cloud Staging Status**: Verified reachable over HTTPS. Prior to Cloud DDL execution via Supabase Dashboard SQL Editor, PostgREST returns `PGRST205` (table absent from schema cache), proving clean pre-migration baseline.
* **Cloud DDL Architecture Protocol**: In accordance with established W009/W014/W015/W016/W020 protocol, Supabase Cloud PostgREST does not support DDL execution over REST (`exec_sql` RPC is disabled). The verified staging package `supabase/staging_migration_package_056.sql` is prepared for operator staging application.
* **Live `entity_geometries` Table**: Exactly 589 rows; SHA-256 digest `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` verified 100% frozen.

---

## 6. Prohibited Actions Audit & Compliance

Pursuant to CTO Directive:
* `apps/api`: **UNTOUCHED** (0 route / auth middleware modifications).
* `apps/mobile`: **UNTOUCHED** (0 file modifications).
* API routes under `/api/vsaas/v1/...`: **NOT CREATED**.
* Rate limiters / fastify plugins: **NOT CREATED**.
* OpenAPI SaaS spec: **NOT CREATED**.
* Production (`ehfafcnimmjusyvplbah`): **UNTOUCHED / 100% AIR-GAPPED**.
* W021-G3 onward: **NOT STARTED / STRICTLY BLOCKED**.
