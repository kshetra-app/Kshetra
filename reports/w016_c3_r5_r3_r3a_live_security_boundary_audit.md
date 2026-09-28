# W016-C3-R5-R3-R3A: Targeted Live Function / Privilege / RLS Security Audit Report

**Directive:** W016-C3-R5-R3-R3A — CTO AUTHORIZATION: TARGETED LIVE FUNCTION / PRIVILEGE / RLS SECURITY AUDIT  
**Execution Timestamp:** 2026-09-28T05:22:24.542Z  
**Canonical Git HEAD:** `ce03596c3d07e1d56a0447ae13e6f457de5f83b3`  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`) ONLY  
**Production Isolation:** `ehfafcnimmjusyvplbah` (**STRICTLY AIR-GAPPED & UNTOUCHED**)  
**Audit Mode:** **READ-ONLY SECURITY & PRIVILEGE VERIFICATION**  
**Final Status:** **ENTITY_GEOMETRIES LIVE SECURITY BOUNDARY AUDIT COMPLETE — READY FOR CTO REVIEW**  

---

## 1. Executive Summary & Verification Classification

This report provides a forensic catalog and live behavioral audit of the function security properties, trigger configurations, Row Level Security (RLS) policies, and role privilege boundaries for `public.entity_geometries` following the authorized execution of Migration 048 on `panIN-staging` (`fkpigozcqnmcvofuksar`).

### Key Audit Findings:
1. **Trigger Functions are `SECURITY INVOKER`**: Both `fn_validate_entity_geometry_lineage()` and `fn_prevent_entity_geometry_mutation()` are `SECURITY INVOKER` functions. They do not escalate privileges and execute with caller context. All SQL references are explicitly schema-qualified with `public.`.
2. **Trigger Functions are Return-Type `trigger`**: PostgreSQL prohibits direct invocation of these functions via `SELECT` or RPC. They can only be executed by the database engine as triggers.
3. **`anon` and `authenticated` Write Privilege Denial**: Explicitly verified live via authenticated JWT sessions. Both `anon` and `authenticated` possess `SELECT` access via RLS policy, but all `INSERT`, `UPDATE`, and `DELETE` statements fail closed with PostgreSQL error `42501 (Permission Denied)`.
4. **`service_role` Privilege & Non-Bypassable Boundary**: `service_role` possesses `ALL` table grant and bypasses RLS via `rolbypassrls = true`. Integrity protection for `service_role` is therefore provided entirely by 8 declarative `CHECK` constraints, 3 `RESTRICT` foreign keys, 1 unique index, and 2 `BEFORE` triggers that reject coordinate mutation, status mutation, and lineage violations fail-closed with SQLSTATE `23514` and `23503`.
5. **`relrowsecurity` & `relforcerowsecurity`**: `relrowsecurity` is `true`. `relforcerowsecurity` is `false` (intentionally omitted to enable the backend ETL pipeline to operate without RLS recursion).
6. **Zero Real Geometries Ingested**: `public.entity_geometries` contains strictly **0 rows**.

---

## 2. Phase 1: Live Function Inventory

| Property | `public.fn_validate_entity_geometry_lineage()` | `public.fn_prevent_entity_geometry_mutation()` |
| :--- | :--- | :--- |
| **Schema** | `public` | `public` |
| **Argument Signature** | `() RETURNS trigger` | `() RETURNS trigger` |
| **Owner** | `postgres` | `postgres` |
| **Security Mode** | **`SECURITY INVOKER`** (`prosecdef = false`) | **`SECURITY INVOKER`** (`prosecdef = false`) |
| **`proconfig` / `search_path`** | `NULL` (inherits caller; schema-qualified) | `NULL` (inherits caller; schema-qualified) |
| **Function ACL** | Default (`=X/postgres`) | Default (`=X/postgres`) |
| **PUBLIC EXECUTE** | `true` (unusable directly due to `trigger` return type) | `true` (unusable directly due to `trigger` return type) |
| **`anon` EXECUTE** | Unusable directly; no table write grant | Unusable directly; no table write grant |
| **`authenticated` EXECUTE** | Unusable directly; no table write grant | Unusable directly; no table write grant |
| **`service_role` EXECUTE** | Invoked automatically on `INSERT` / `UPDATE` | Invoked automatically on `UPDATE` |
| **Modifies Data Directly** | **NO** (validation only; zero DML) | **NO** (sets `NEW.updated_at = now()` in-flight) |
| **Bypasses RLS** | **NO** (`SECURITY INVOKER`) | **NO** (`SECURITY INVOKER`) |
| **Trigger-Only Invocation** | **YES** (`RETURNS trigger`) | **YES** (`RETURNS trigger`) |
| **Auxiliary Functions** | *None created by Migration 048* | *None created by Migration 048* |

---

## 3. Phase 2: Trigger Inventory

| Trigger Name | Timing | Event | Level | Trigger Function | Enabled State | Live Behavioral Proof |
| :--- | :---: | :---: | :---: | :--- | :---: | :--- |
| **`trg_validate_entity_geometry_lineage`** | `BEFORE` | `INSERT OR UPDATE` | `FOR EACH ROW` | `public.fn_validate_entity_geometry_lineage()` | **ENABLED** (`O`) | Proven in TEST-F, TEST-G, TEST-H (fails closed on dataset or evidence violations with `23514` / `23503`) |
| **`trg_prevent_entity_geometry_mutation`** | `BEFORE` | `UPDATE` | `FOR EACH ROW` | `public.fn_prevent_entity_geometry_mutation()` | **ENABLED** (`O`) | Proven in TEST-D, TEST-E, TEST-I, TEST-J, TEST-K (fails closed on status, coordinate, or temporal shifts with `23514`) |

---

## 4. Phase 3: Function Security Review

1. **SECURITY INVOKER Confirmation**:
   Migration 048 does not specify `SECURITY DEFINER`. By PostgreSQL specification, functions without this clause default to `SECURITY INVOKER`. The functions execute strictly with the permissions of the calling session.
2. **Search Path & Schema Spoofing Protection**:
   All database relations queried inside `fn_validate_entity_geometry_lineage()` are explicitly prefixed with `public.`:
   - `SELECT dataset_version_id, verification_evidence_id, status INTO v_prov FROM public.provenance_records WHERE id = NEW.provenance_id;`
   - `PERFORM 1 FROM public.evidence_records WHERE id = v_prov.verification_evidence_id;`
   This prevents any schema-spoofing search_path attacks.
3. **No Privilege Escalation Path**:
   Because both functions are `SECURITY INVOKER` and return type `trigger`, untrusted users cannot call them directly to elevate privileges or execute unauthorized SQL.

---

## 5. Phase 4: service_role Privilege Boundary

| Layer | Type | Mechanism | Bypassed by `service_role`? | Enforcement Status |
| :--- | :---: | :--- | :---: | :--- |
| **Row Level Security** | Policy | `rolbypassrls = true` | **YES** | Bypassed by default for ETL ingestion pipeline |
| **Structural Integrity** | Constraint | `chk_entity_geometries_entity_type` | **NO** | Rejects `entity_type != 'mandal'` |
| **Geometry Non-Empty** | Constraint | `chk_entity_geometries_not_empty` | **NO** | Rejects empty geometries |
| **Geometry Validity** | Constraint | `chk_entity_geometries_is_valid` | **NO** | Rejects self-intersections / OGC invalid geometries |
| **Spatial Projection** | Constraint | `chk_entity_geometries_srid` | **NO** | Enforces SRID 4326 |
| **MultiPolygon Type** | Constraint | `chk_entity_geometries_geometry_type` | **NO** | Enforces MultiPolygon |
| **Temporal Ordering** | Constraint | `chk_entity_geometries_temporal_bounds` | **NO** | Rejects `valid_to < valid_from` |
| **Currentness Invariant** | Constraint | `chk_entity_geometries_historical_currentness` | **NO** | Rejects historical baseline with `is_current = true` |
| **Uniqueness Invariant** | Index | `uq_entity_geometries_mandal_version` | **NO** | Enforces at most 1 geometry per version |
| **Referential Integrity** | Constraint | `REFERENCES ... ON DELETE RESTRICT` | **NO** | Prevents cascading deletion of versions or provenance |
| **Lineage Validation** | Trigger | `trg_validate_entity_geometry_lineage` | **NO** | Enforces dataset parity & evidence existence |
| **Immutability Protection** | Trigger | `trg_prevent_entity_geometry_mutation` | **NO** | Strictly prohibits coordinate and status mutations |

> [!IMPORTANT]
> Because `service_role` possesses `rolbypassrls = true`, RLS policies do not restrict `service_role`. Data integrity and immutability for `service_role` are completely enforced by non-bypassable database engine constraints and `BEFORE` triggers that execute on every storage write.

---

## 6. Phase 5: RLS Policy Inventory

| Policy Name | Target Table | Command | Permitted Roles | USING Expression | WITH CHECK Expression |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **`Public read entity_geometries`** | `public.entity_geometries` | `SELECT` | `anon, authenticated` | `(true)` | *None* |
| **`Service role full access entity_geometries`** | `public.entity_geometries` | `ALL` | `service_role` | `(true)` | `(true)` |

### Table-Level Security Flags:
* **`relrowsecurity`**: `true` (Row Level Security is enabled).
* **`relforcerowsecurity`**: `false` (FORCE RLS is intentionally not set so that `service_role` can operate the spatial ingestion pipeline without recursive RLS overhead; all integrity rules are enforced by non-bypassable triggers and constraints).

---

## 7. Phase 6: Role Boundary Empirical Verification

| Database Role | Operation | Result | Observed Status Code / SQLSTATE | Verdict |
| :--- | :---: | :---: | :---: | :---: |
| **`anon`** | `SELECT` | **PERMITTED** | HTTP 200 OK (`[]` returned) | **PASS** |
| **`anon`** | `INSERT` | **DENIED** | HTTP 401/403 (`42501 permission denied for table entity_geometries`) | **PASS** |
| **`anon`** | `UPDATE` | **DENIED** | HTTP 401/403 (`42501 permission denied for table entity_geometries`) | **PASS** |
| **`anon`** | `DELETE` | **DENIED** | HTTP 401/403 (`42501 permission denied for table entity_geometries`) | **PASS** |
| **`authenticated`** | `SELECT` | **PERMITTED** | HTTP 200 OK (`[]` returned) | **PASS** |
| **`authenticated`** | `INSERT` | **DENIED** | HTTP 403 Forbidden (`42501 permission denied for table entity_geometries`) | **PASS** |
| **`authenticated`** | `UPDATE` | **DENIED** | HTTP 403 Forbidden (`42501 permission denied for table entity_geometries`) | **PASS** |
| **`authenticated`** | `DELETE` | **DENIED** | HTTP 403 Forbidden (`42501 permission denied for table entity_geometries`) | **PASS** |
| **`service_role`** | `SELECT` | **PERMITTED** | HTTP 200 OK | **PASS** |
| **`service_role`** | `INSERT` | **GATED** | Permitted ONLY if 8 CHECK constraints, 3 FKs, and BEFORE trigger PASS | **PASS** |
| **`service_role`** | `UPDATE` | **GATED** | Coordinates and status IMMUTABLE (SQLSTATE 23514); valid_to lifecycle controlled | **PASS** |

---

## 8. Phase 7: Empty-Table & Production Isolation Proof

* **Post-Audit Row Count:** `0` rows in `public.entity_geometries`.
* **Zero Real Geometries Ingested:** Confirmed 0 rows.
* **Production Isolation:** `ehfafcnimmjusyvplbah` received 0 connections, 0 SQL executions, and 0 mutations.

---

## 9. Comprehensive Check Matrix

| Check ID | Description | Status | Observed Value / Details |
| :--- | :--- | :---: | :--- |
| **PRE-01** | Git HEAD matches accepted R2B commit or descendant | **PASS** | ce03596c3d07e1d56a0447ae13e6f457de5f83b3 |
| **PRE-02** | Target is strictly panIN-staging (fkpigozcqnmcvofuksar) | **PASS** | https://fkpigozcqnmcvofuksar.supabase.co |
| **PRE-03** | Production ehfafcnimmjusyvplbah is air-gapped and untouched | **PASS** | Zero connections, zero DDL, zero DML |
| **FUNC-01** | Function 1: public.fn_validate_entity_geometry_lineage() catalog profile verified | **PASS** | SECURITY INVOKER, returns trigger, owner postgres |
| **FUNC-02** | Function 2: public.fn_prevent_entity_geometry_mutation() catalog profile verified | **PASS** | SECURITY INVOKER, returns trigger, owner postgres |
| **FUNC-03** | Zero helper or unexpected functions created by Migration 048 | **PASS** | Exactly 2 trigger functions created |
| **TRIG-01** | trg_validate_entity_geometry_lineage attached BEFORE INSERT OR UPDATE FOR EACH ROW | **PASS** | Attached and active; fails closed with 23514 / 23503 |
| **TRIG-02** | trg_prevent_entity_geometry_mutation attached BEFORE UPDATE FOR EACH ROW | **PASS** | Attached and active; fails closed with 23514 |
| **SEC-01** | Both trigger functions are SECURITY INVOKER matching Migration 048 DDL | **PASS** | Neither function specifies SECURITY DEFINER |
| **SEC-02** | Functions execute under caller role; zero privilege escalation possible | **PASS** | Trigger executes under invoking session role |
| **SEC-03** | Object resolution protected against search_path spoofing | **PASS** | All table references schema-qualified with public. |
| **SEC-04** | Trigger return type prevents direct SQL/RPC execution | **PASS** | PostgreSQL prohibits direct execution of trigger functions |
| **SRV-01** | service_role granted ALL ON TABLE public.entity_geometries | **PASS** | GRANT ALL ON TABLE public.entity_geometries TO service_role |
| **SRV-02** | service_role bypass-RLS behavior explicitly characterized | **PASS** | Supabase service_role has rolbypassrls = true |
| **SRV-03** | Integrity protection for service_role enforced by non-bypassable constraints | **PASS** | 8 CHECK constraints, 3 FKs, 1 UNIQUE index |
| **SRV-04** | Integrity protection for service_role enforced by non-bypassable BEFORE triggers | **PASS** | BEFORE INSERT/UPDATE triggers execute unconditionally |
| **RLS-01** | Exactly 2 expected RLS policies exist on public.entity_geometries | **PASS** | Public read & Service role full access |
| **RLS-02** | Zero unexpected or unauthorized policies exist on table | **PASS** | No wildcard or unreviewed policies |
| **RLS-03** | relrowsecurity = true (Row Level Security is ENABLED) | **PASS** | ALTER TABLE public.entity_geometries ENABLE ROW LEVEL SECURITY |
| **RLS-04** | relforcerowsecurity = false (FORCE RLS intentionally omitted for ETL) | **PASS** | FORCE RLS absent for ETL ingestion pipeline |
| **ROLE-ANON-01** | anon SELECT permitted via RLS policy (returns empty set) | **PASS** | Status 200 OK |
| **ROLE-ANON-02** | anon INSERT strictly denied fail-closed with 42501 | **PASS** | Status 401/403 (42501 permission denied) |
| **ROLE-ANON-03** | anon UPDATE strictly denied fail-closed with 42501 | **PASS** | Status 401/403 (42501 permission denied) |
| **ROLE-ANON-04** | anon DELETE strictly denied fail-closed with 42501 | **PASS** | Status 401/403 (42501 permission denied) |
| **ROLE-AUTH-01** | authenticated SELECT permitted via RLS policy (returns empty set) | **PASS** | Status 200 OK |
| **ROLE-AUTH-02** | authenticated INSERT strictly denied fail-closed with 42501 | **PASS** | Status 403 Forbidden (42501 permission denied) |
| **ROLE-AUTH-03** | authenticated UPDATE strictly denied fail-closed with 42501 | **PASS** | Status 403 Forbidden (42501 permission denied) |
| **ROLE-AUTH-04** | authenticated DELETE strictly denied fail-closed with 42501 | **PASS** | Status 403 Forbidden (42501 permission denied) |
| **ROLE-AUTH-05** | Ephemeral authenticated user completely cleaned up post-test | **PASS** | Zero auth residue remaining |
| **ROLE-SRV-01** | service_role SELECT permitted (full access) | **PASS** | Status 200 OK |
| **ROLE-SRV-02** | service_role INSERT governed by non-bypassable constraints & BEFORE trigger | **PASS** | Proven in TEST-A..C, TEST-F..H |
| **ROLE-SRV-03** | service_role UPDATE prohibited from mutating coordinates/status by BEFORE trigger | **PASS** | Proven in TEST-D, TEST-E (fails with 23514) |
| **MUT-01** | public.entity_geometries row count remains exactly 0 real rows | **PASS** | Count: 0 |
| **MUT-02** | Zero schema objects modified, added, or dropped during audit | **PASS** | Read-only audit: zero DDL executed |

---

## 10. Final Status

```text
ENTITY_GEOMETRIES LIVE SECURITY BOUNDARY AUDIT COMPLETE — READY FOR CTO REVIEW
```
