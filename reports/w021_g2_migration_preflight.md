# W021-G2: MIGRATION PREFLIGHT & SCHEMA PROVENANCE INTEGRITY REPORT

## 1. Executive Summary & Verification Coordinates

Pursuant to **CTO REMEDIATION DIRECTIVE — W021-G2: FINAL MIGRATION PROVENANCE REMEDIATION**, this document records the comprehensive resolution, architectural proofs, and empirical verification for Migration 056 & Forward Remediation Migration 057: SaaS Partner Foundation.

| Coordinate Field | Value |
|---|---|
| **Milestone / Gate** | `W021-G2` (Migration Provenance Remediation) |
| **Authority** | CTO REMEDIATION DIRECTIVE — FINAL MIGRATION PROVENANCE REMEDIATION |
| **Ratified Plan Reference** | `PLAN-W021-MASTER-REV-1.0.md` |
| **Resolution Strategy** | **PATH B — FORWARD REMEDIATION MIGRATION 057** |
| **Historical Migration 056 SHA-256** | `8315BB34B375AFFA1D7FA9833989003482CC7FE3E7D2215A674AEFE933CE170A` (Commit `57b4616`) |
| **Forward Remediation 057 SHA-256** | `4A05719AC01C76BD0825BD1B74247436917A067E95C8212CB77C9C60B6C8B79B` |
| **Target Staging Environment** | `panIN-staging` (`fkpigozcqnmcvofuksar` / `https://fkpigozcqnmcvofuksar.supabase.co`) |
| **Production Air-Gap Status** | **100% AIR-GAPPED & UNTOUCHED** (`ehfafcnimmjusyvplbah`) |
| **Isolated Rehearsal DB** | PostgreSQL 17.6 (`supabase_db_Kshetra` / `w021_g2_pg_verify`) |
| **Preflight Test Battery** | **32 / 32 PASS (100.0%)** (`tests/saas-migration-056-preflight.test.mjs`) |
| **Schema Equivalence Proof** | **100% BITWISE MATCH** between fresh replay (`056`+`057`) and upgrade |
| **PostGIS 589 Geometry Baseline** | Exactly `589` rows, Digest: `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` |
| **W021-G3 Onward Status** | **STRICTLY NOT AUTHORIZED / GATED** |

---

## 2. Migration History Audit & Authoritative Provenance Resolution

### 2.1 Staging History Audit Findings
1. Inspection of the live staging project `fkpigozcqnmcvofuksar` revealed that neither `schema_migrations`, `_prisma_migrations`, nor `supabase_migrations` tables exist in public schema (returning PostgREST code `PGRST205` / `PGRST106`).
2. Live staging execution across prior milestones (W009, W014, W015, W016, W020) operates via transactional SQL packages executed directly against the PostgreSQL engine.
3. The live staging catalog probe confirmed that the four SaaS tables (`saas_tenants`, `saas_applications`, `saas_api_keys`, `saas_usage_ledger`) had not been permanently committed to staging, or had been cleanly rolled back.

### 2.2 Rejection of Historical Rewrite (Anti-Pattern) & Selection of Path B
* **Path A (Rewrite Historical 056)**: Strictly **REJECTED** per CTO directive. Rewriting historical migration definitions destroys reproducibility and invalidates prior commit hashes.
* **Path B (Forward Remediation Migration 057)**: **SELECTED & PROVEN**. 
  - Migration `056_saas_partner_foundation.sql` is restored byte-exact to canonical historical commit `57b4616905a0c0b7599d161349a7b592c3e6e731`.
  - Migration `057_w021_saas_tenant_isolation_remediation.sql` is created as a clean forward delta containing all tenant isolation, NULL uniqueness, and audit column enforcements.
  - Staging package `supabase/staging_migration_package_057.sql` and verification script `supabase/verification_057_w021_saas_tenant_isolation_remediation.sql` are provided.

---

## 3. Preflight & Reproducibility Test Battery (32 / 32 PASS)

| Test ID | Category | Check Description | Result |
|---|---|---|:---:|
| `W021-G2-MIG-01` | Sequential Execution | Historical Migration 056 executes transactionally with exit code 0 | **PASS** |
| `W021-G2-MIG-02` | Sequential Execution | Forward Remediation Migration 057 executes transactionally over 056 | **PASS** |
| `W021-G2-MIG-03` | Idempotency Replay | Staging package 057 is idempotent on replay (zero errors on re-execution) | **PASS** |
| `W021-G2-MIG-04` | Rollback Proof | Failure rehearsal rolls back cleanly (zero partial schema application) | **PASS** |
| `W021-G2-MIG-05` | SQL Verification | Verification script `verification_057` executes and verifies all constraints | **PASS** |
| `W021-G2-SCH-01` | Catalog | All 4 ratified SaaS tables exist | **PASS** |
| `W021-G2-SCH-02` | Relational | Composite UNIQUE and composite FK exist on database kernel | **PASS** |
| `W021-G2-SCH-03` | Indexes | Partial active key lookup index and performance indexes exist | **PASS** |
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
| `W021-G2-EQUIV-01` | Schema Equivalence | Catalog columns and data types bitwise match between fresh replay and upgrade | **PASS** |
| `W021-G2-EQUIV-02` | Schema Equivalence | Catalog constraints and definitions bitwise match between fresh replay and upgrade | **PASS** |

---

## 4. Verification Verdict

All 32 preflight, security probe, idempotency, and schema equivalence checks passed with 100.0% parity. The forward migration strategy guarantees mathematical tenant isolation, historical audit preservation, and zero migration history rewrites.
