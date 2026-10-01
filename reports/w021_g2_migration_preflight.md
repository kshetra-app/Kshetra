# W021-G2: MIGRATION 056 PREFLIGHT & SCHEMA INTEGRITY REPORT

## 1. Executive Summary & Verification Coordinates

Pursuant to **CTO DIRECTIVE — W021-G2: MIGRATION 056 PREFLIGHT & STAGING EXECUTION**, this report documents the preflight verification, relational integrity, security boundary probes, and staging catalog readiness for **Migration 056: SaaS Partner Foundation**.

| Coordinate Field | Value |
|---|---|
| **Milestone / Gate** | `W021-G2` |
| **Authority** | CTO DIRECTIVE — W021-G2 MIGRATION 056 PREFLIGHT & STAGING EXECUTION |
| **Ratified Plan Reference** | `PLAN-W021-MASTER-REV-1.0.md` (Commit `dcc9f229c5b8652a9a974e6d3d26edb723e6740d`) |
| **Execution Timestamp** | `2026-10-01T17:00:16.127Z` |
| **Target Staging Environment** | `panIN-staging` (`fkpigozcqnmcvofuksar` / `https://fkpigozcqnmcvofuksar.supabase.co`) |
| **Production Air-Gap Status** | **100% AIR-GAPPED & UNTOUCHED** (`ehfafcnimmjusyvplbah`) |
| **Isolated Rehearsal DB** | PostgreSQL 17.6 (`supabase_db_Kshetra` / `w021_g2_pg_verify`) |
| **Migration File** | `supabase/migrations/056_saas_partner_foundation.sql` |
| **Staging Package** | `supabase/staging_migration_package_056.sql` |
| **Verification Script** | `supabase/verification_056_saas_partner_foundation.sql` |
| **Rollback Script (Contingency)**| `supabase/rollback_056_saas_partner_foundation.sql` |
| **Preflight Test Battery** | **23 / 23 PASS (100.0%)** (`tests/saas-migration-056-preflight.test.mjs`) |
| **PostGIS 589 Geometry Baseline** | Exactly `589` rows, Digest: `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` |
| **W021-G3 Onward Status** | **STRICTLY NOT AUTHORIZED / GATED** |

---

## 2. Production Air-Gap Verification

Under strict CTO instructions and Master Execution Framework Rule IV-001:
* **Target Scoping**: Network requests and connection parameters were verified exclusively against staging (`fkpigozcqnmcvofuksar.supabase.co`).
* **Production Protection**: The production database `ehfafcnimmjusyvplbah` was **NEVER** contacted. Zero connections, zero SQL executions, and zero migrations occurred against production.
* **Environment Integrity**: Production service-role credentials remain excluded from the execution context.

---

## 3. Pre-Migration vs. Post-Migration Schema Specification

Migration 056 deploys the ratified four-table multi-tenant B2B persistence architecture:

### 3.1 `public.saas_tenants`
* `id` (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`)
* `name` (`TEXT NOT NULL`)
* `slug` (`TEXT NOT NULL UNIQUE`)
* `tier` (`TEXT NOT NULL DEFAULT 'free'` CHECK `tier IN ('free', 'pro', 'enterprise')`)
* `status` (`TEXT NOT NULL DEFAULT 'active'` CHECK `status IN ('active', 'suspended', 'revoked')`)
* `contact_email` (`TEXT NOT NULL`)
* `metadata` (`JSONB NOT NULL DEFAULT '{}'::jsonb`)
* `created_at` / `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`)
* Index: `idx_saas_tenants_status` on `status`.

### 3.2 `public.saas_applications`
* `id` (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`)
* `tenant_id` (`UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE`)
* `name` (`TEXT NOT NULL`)
* `environment` (`TEXT NOT NULL DEFAULT 'test'` CHECK `environment IN ('live', 'test')`)
* `created_at` (`TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`)
* Index: `idx_saas_applications_tenant` on `tenant_id`.

### 3.3 `public.saas_api_keys`
* `id` (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`)
* `tenant_id` (`UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE`)
* `application_id` (`UUID NOT NULL REFERENCES public.saas_applications(id) ON DELETE CASCADE`)
* `name` (`TEXT NOT NULL`)
* `key_prefix` (`TEXT NOT NULL`)
* `key_hint` (`TEXT NOT NULL`)
* `key_hash` (`TEXT NOT NULL UNIQUE`)
* `scopes` (`TEXT[] NOT NULL DEFAULT ARRAY['geo:read', 'elections:read']::TEXT[]`)
* `status` (`TEXT NOT NULL DEFAULT 'active'` CHECK `status IN ('active', 'revoked', 'compromised')`)
* `expires_at` (`TIMESTAMPTZ`)
* `last_used_at` (`TIMESTAMPTZ`)
* `created_at` (`TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`)
* Indexes:
  - `idx_saas_api_keys_lookup` on `key_hash` WHERE `status = 'active'` (Partial Index).
  - `idx_saas_api_keys_tenant` on `tenant_id`.

### 3.4 `public.saas_usage_ledger`
* `id` (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`)
* `tenant_id` (`UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE`)
* `api_key_id` (`UUID REFERENCES public.saas_api_keys(id) ON DELETE SET NULL`) **[AUDITED RETENTION REQUIREMENT]**
* `hour_bucket` (`TIMESTAMPTZ NOT NULL`)
* `request_count` (`INT NOT NULL DEFAULT 0`)
* `error_count` (`INT NOT NULL DEFAULT 0`)
* `created_at` (`TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`)
* Constraint: `uq_saas_usage_bucket UNIQUE (tenant_id, api_key_id, hour_bucket)`.
* Index: `idx_saas_usage_ledger_tenant` on `tenant_id, hour_bucket DESC`.

---

## 4. Preflight Test Battery Execution (23 / 23 PASS)

Executed via `node tests/saas-migration-056-preflight.test.mjs` against isolated PostgreSQL 17.6 harness (`w021_g2_pg_verify`):

| Test ID | Category | Check Description | Result | Observed Evidence |
|---|---|---|:---:|---|
| `W021-G2-MIG-01` | Migration Atomicity | Migration 056 executes transactionally with exit code 0 | **PASS** | Transaction committed successfully |
| `W021-G2-MIG-02` | Idempotency | Migration 056 is idempotent on replay (zero errors on re-execution) | **PASS** | Replay succeeded cleanly with IF NOT EXISTS guards |
| `W021-G2-MIG-03` | Rollback Proof | Failure rehearsal rolls back cleanly (zero partial schema application) | **PASS** | Execution aborted on error; canary table count = 0 |
| `W021-G2-SCH-01` | Catalog | All 4 ratified SaaS tables exist in public schema | **PASS** | Tables found: `[saas_api_keys, saas_applications, saas_tenants, saas_usage_ledger]` |
| `W021-G2-SCH-02` | Relational | All 5 foreign key relationships exist and reference valid parent entities | **PASS** | 5 FKs verified (`saas_applications -> saas_tenants`, `saas_api_keys -> saas_applications`, `saas_api_keys -> saas_tenants`, `saas_usage_ledger -> saas_api_keys`, `saas_usage_ledger -> saas_tenants`) |
| `W021-G2-SCH-03` | Indexes | Partial active key lookup index and performance indexes exist | **PASS** | `idx_saas_api_keys_lookup` includes `WHERE (status = 'active')` |
| `W021-G2-SCH-04` | Security | ROW LEVEL SECURITY is ENABLED and FORCED on all 4 tables | **PASS** | `saas_api_keys: rls=true, force=true`, `saas_applications: rls=true, force=true`, `saas_tenants: rls=true, force=true`, `saas_usage_ledger: rls=true, force=true` |
| `W021-G2-PROBE-01` | Probe 1 | Anon direct access denied (permission denied for table saas_tenants) | **PASS** | `ERROR: permission denied for table saas_tenants` |
| `W021-G2-PROBE-02` | Probe 2 | Authenticated direct access denied (permission denied for table saas_api_keys) | **PASS** | `ERROR: permission denied for table saas_api_keys` |
| `W021-G2-PROBE-03` | Probe 3 | Arbitrary tenant access denied (public/anon cannot query tenant row) | **PASS** | `ERROR: permission denied for table saas_tenants` |
| `W021-G2-PROBE-04` | Probe 4 | Cross-tenant key association with non-existent tenant rejected by FK | **PASS** | `ERROR: insert or update on table "saas_api_keys" violates foreign key constraint` |
| `W021-G2-PROBE-05` | Probe 5 | Revoked key remains persisted in table but excluded from active lookup | **PASS** | Key status = `revoked`; Active index match count = `0` |
| `W021-G2-PROBE-06` | Probe 6 | Historical usage remains fully accessible and linked after key revocation | **PASS** | Usage records matching revoked key = `1` |
| `W021-G2-PROBE-07` | Probe 7 | Physical key deletion sets api_key_id = NULL without deleting usage record (ON DELETE SET NULL) | **PASS** | Usage row preserved: `77777777-7777-7777-7777-777777777777\|NULL\|50` |
| `W021-G2-PROBE-08` | Probe 8 | Duplicate key_hash rejected (unique constraint uq_saas_api_keys_hash) | **PASS** | `ERROR: duplicate key value violates unique constraint "uq_saas_api_keys_hash"` |
| `W021-G2-PROBE-09` | Probe 9 | Duplicate tenant slug rejected (unique constraint uq_saas_tenants_slug) | **PASS** | `ERROR: duplicate key value violates unique constraint "uq_saas_tenants_slug"` |
| `W021-G2-PROBE-10` | Probe 10 | Duplicate usage bucket rejected (unique constraint uq_saas_usage_bucket) | **PASS** | `ERROR: duplicate key value violates unique constraint "uq_saas_usage_bucket"` |
| `W021-G2-PROBE-11` | Probe 11 | Expired-key representation accurately evaluates (expires_at < now() is true) | **PASS** | Evaluated expiration state = `true` |
| `W021-G2-PROBE-12` | Probe 12 | Invalid key status rejected (check constraint chk_saas_api_keys_status) | **PASS** | `ERROR: new row for relation "saas_api_keys" violates check constraint "chk_saas_api_keys_status"` |
| `W021-G2-PROBE-13` | Probe 13 | Invalid application environment rejected (check constraint chk_saas_applications_env) | **PASS** | `ERROR: new row for relation "saas_applications" violates check constraint "chk_saas_applications_env"` |
| `W021-G2-PROBE-14` | Probe 14 | Invalid tenant tier rejected (check constraint chk_saas_tenants_tier) | **PASS** | `ERROR: new row for relation "saas_tenants" violates check constraint "chk_saas_tenants_tier"` |
| `W021-G2-GEO-01` | Geometry | PostGIS 589 constituency geometry baseline count and canonical digest remain frozen | **PASS** | Count = `589`, Digest = `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` |
| `W021-G2-PRD-01` | Air-Gap | Production environment ehfafcnimmjusyvplbah is 100% air-gapped and untouched | **PASS** | Staging confirmed at `https://fkpigozcqnmcvofuksar.supabase.co` |

---

## 5. Security Boundary & RLS Adjudication

In accordance with Section 5 of `PLAN-W021-MASTER-REV-1.0.md`:
1. **Gateway vs RLS Boundary**: Fastify API gateway connects via PostgreSQL `service_role` credentials possessing `BYPASSRLS`. Tenant isolation during gateway API handling is enforced by **strict programmatic parameter binding** (`WHERE tenant_id = resolved_tenant_id`) derived from the authenticated API key, NOT by RLS.
2. **PostgreSQL RLS Role**: RLS enabled and forced on `saas_tenants`, `saas_applications`, `saas_api_keys`, and `saas_usage_ledger` serves as defense-in-depth against direct client/JWT connections, with `REVOKE ALL` enforced for `anon, authenticated, public`.
3. **Usage Ledger Audit Continuity**: Verified via Probe 7 (`confdeltype = 'n'` in `pg_constraint`), guaranteeing that physical key deletion sets `api_key_id = NULL` without deleting usage rows.
