# W021-G2: STAGING EXECUTION & MIGRATION PROVENANCE REPORT

## 1. Executive Summary & Verification Coordinates

Pursuant to **CTO REMEDIATION DIRECTIVE — W021-G2: FINAL MIGRATION PROVENANCE REMEDIATION**, this report records the execution packages and forward remediation artifacts for **Gate W021-G2**.

| Coordinate Field | Value |
|---|---|
| **Milestone / Gate** | `W021-G2` (Migration Provenance Remediation) |
| **Authority** | CTO REMEDIATION DIRECTIVE — FINAL MIGRATION PROVENANCE REMEDIATION |
| **Resolution Strategy** | **PATH B — FORWARD REMEDIATION MIGRATION 057** |
| **Execution Timestamp** | `2026-10-02T01:15:00.000Z` |
| **Target Staging Environment** | `panIN-staging` (`fkpigozcqnmcvofuksar` / `https://fkpigozcqnmcvofuksar.supabase.co`) |
| **Production Air-Gap Status** | **100% AIR-GAPPED & UNTOUCHED** (`ehfafcnimmjusyvplbah`) |
| **589 PostGIS Geometry Count** | `589` rows (Strictly Frozen) |
| **589 PostGIS Geometry Digest** | `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` |
| **Historical Staging Package 056** | `supabase/staging_migration_package_056.sql` (Restored to `57b4616`) |
| **Forward Remediation Package 057**| `supabase/staging_migration_package_057.sql` |
| **Verification Script 057** | `supabase/verification_057_w021_saas_tenant_isolation_remediation.sql` |
| **W021-G3 Onward Status** | **STRICTLY NOT AUTHORIZED / FROZEN** |

---

## 2. Production Air-Gap Verification
* **Target Scoping**: Exclusively verified against staging (`fkpigozcqnmcvofuksar.supabase.co`).
* **Production Protection**: The production database `ehfafcnimmjusyvplbah` was **NEVER** contacted. Zero connections, zero SQL executions, and zero migrations occurred against production.

---

## 3. Provenance & Staging Package Artifacts

### 3.1 Historical Baseline Preservation (056)
- File: `supabase/staging_migration_package_056.sql`
- Checksum: `1825DA061A02D80821DACFDEDAC6FFAA0A715FF21B4278565F6858B1E6EFAF4F`
- Matches byte-exact historical commit `57b4616`.

### 3.2 Forward Staging Package (057)
- File: `supabase/staging_migration_package_057.sql`
- Checksum: `8ACCFD58C4B40B32E3ECFD5ACBD9D54D5926B1E9AE04E5F52C2D0F0A3CF0220F`
- Structure: Enclosed within `BEGIN; ... COMMIT;`
- Execution:
  1. Pre-check assertion: verifies that all 4 prerequisite tables exist.
  2. Applies `uq_saas_applications_tenant_app UNIQUE (tenant_id, id)`.
  3. Replaces FK on `saas_api_keys` with composite `fk_saas_api_keys_tenant_application`.
  4. Applies `uq_saas_usage_bucket UNIQUE NULLS NOT DISTINCT (tenant_id, api_key_id, hour_bucket)`.
  5. Adds `revoked_at TIMESTAMPTZ` and `chk_saas_api_keys_revoked_at`.
- Replay: Fully idempotent via guarded drops and additions.

### 3.3 Raw Verification Script Output (Captured Verbatim)
```text
NOTICE:  === EXECUTING VERIFICATION 057 CHECKS ===
NOTICE:  [PASS] Composite UNIQUE constraint uq_saas_applications_tenant_app verified
NOTICE:  [PASS] Composite foreign key fk_saas_api_keys_tenant_application verified
NOTICE:  [PASS] saas_usage_ledger UNIQUE NULLS NOT DISTINCT verified: UNIQUE NULLS NOT DISTINCT (tenant_id, api_key_id, hour_bucket)
NOTICE:  [PASS] saas_api_keys.revoked_at column verified
NOTICE:  [PASS] chk_saas_api_keys_revoked_at check constraint verified
NOTICE:  === ALL VERIFICATION 057 CHECKS PASSED SUCCESSFULLY ===
DO
```

---

## 4. Itemized Contract Verification Matrix

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

## 5. Prohibited Actions Compliance Audit

Pursuant to CTO Directive:
* `apps/api`: **UNTOUCHED** (0 route / auth middleware modifications).
* `apps/mobile`: **UNTOUCHED** (0 file modifications).
* API routes under `/api/vsaas/v1/...`: **NOT CREATED**.
* Rate limiters / Fastify plugins: **NOT CREATED**.
* Production `ehfafcnimmjusyvplbah`: **AIR-GAPPED & UNTOUCHED**.
* Next Stage: **W021-G2 SUBMITTED FOR CTO RE-ACCEPTANCE. G3 REMAINS BLOCKED.**
