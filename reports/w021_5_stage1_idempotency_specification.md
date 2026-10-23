# W021.5 — Stage 1 Idempotency & Repeat-Write Specification
## Safe Child-Table Repeat-Write Strategy and Pre-Seeded Database Analysis (CRIT-C02-02)

**Document Reference:** `reports/w021_5_stage1_idempotency_specification.md`  
**Directive:** CTO Directive 147 Section 5 & Workstream B  
**Governing Authority:** Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance  
**Target Criterion:** `CRIT-C02-02` (Political Organizations Catalog & Child Tables)  
**Database Tables:** 8 Tables (`public.datasets`, `public.dataset_versions`, `public.provenance_records`, `public.political_organizations`, `public.organization_relationships`, `public.organization_multilingual_names`, `public.organization_symbols`, `public.organization_aliases`)  
**Status:** `BLOCKED_NOT_DEPLOYABLE` (0 Outbound Rows to Staging)  

---

## 1. Executive Summary

Under CTO Directive 146 Section 4 and Directive 147 Section 5, Stage 1 (`CRIT-C02-02`) is classified as `BLOCKED_NOT_DEPLOYABLE` with strictly 0 rows dispatched to Staging Supabase project `fkpigozcqnmcvofuksar`.

This specification formalizes the technical, structural, and cryptographic reasons why simple PostgREST upserting with client-generated deterministic UUIDv5 primary keys cannot safely execute against a pre-seeded target database, details the exact PostgreSQL constraint failure modes, and establishes the safe repeat-write strategy required when database execution authorization is granted.

---

## 2. Root Cause Analysis: Pre-Seeded Primary Keys vs. Client UUIDv5

### 2.1 The Seed DDL Invariant
Migration `065_canonical_political_organization_registry.sql` seeds:
- 107 canonical political organizations in `public.political_organizations` (using textual canonical codes as IDs, e.g., `'INC'`, `'BJP'`, `'AAP'`).
- 10 organization relationships in `public.organization_relationships`.
- 27 multilingual names in `public.organization_multilingual_names`.
- 19 temporal symbols in `public.organization_symbols`.
- 1,043 aliases in `public.organization_aliases`.

In the DDL definitions for child tables (Migrations 063 & 064), the primary key column `id` defaults to `gen_random_uuid()`:
```sql
CREATE TABLE IF NOT EXISTS public.organization_aliases (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_lookup_key        TEXT NOT NULL,
  ...
);
```

When Migration 065 was applied to initialize or seed the staging database, the seed rows were inserted either without specifying explicit primary keys (relying on `gen_random_uuid()`), or with ephemeral IDs generated at migration run time.

### 2.2 The Conflict Target Collision Dilemma
In repository preparation (`scripts/reconcile_database_criteria_identities.mjs`), child rows derive deterministic UUIDv5 primary keys anchored to the Kshetra namespace UUID:
```js
row.id = rfc4122UuidV5(KSHETRA_NAMESPACE_UUID, naturalKeyString);
```

If an external runner dispatches these rows to PostgREST using `on_conflict=id`:
1. **Primary Key Miss:** The client-generated deterministic UUIDv5 does not match the random UUID already stored in the pre-seeded target database.
2. **Forced INSERT:** Because the row does not match on `id`, PostgreSQL attempts an `INSERT`.
3. **Natural Key Collision:** The `INSERT` encounters identical natural business keys already present in the target database:
   - In `public.organization_multilingual_names`: violates `uq_org_multi_name (organization_id, language_code, script_code, representation_type, name_value)` -> **PostgreSQL Error 23505 (unique_violation)**.
   - In `public.organization_symbols`: violates `uq_org_symbols_timeline (organization_id, symbol_name, valid_from)` -> **PostgreSQL Error 23505 (unique_violation)**.
   - In `public.organization_symbols`: trips advisory lock temporal trigger `fn_validate_org_symbol_temporal_invariants` -> **PostgreSQL Error 23514 / check_violation**.
   - In `public.organization_aliases`: trips advisory lock temporal trigger `fn_validate_org_alias_temporal_invariants` -> **PostgreSQL Error 23514 / check_violation**.

Therefore, blind upsert on `id` is mathematically guaranteed to fail against any database where Migration 065 seeds already exist.

---

## 3. Safe Repeat-Write Strategies

To achieve genuine repeat-write idempotency without data corruption, truncation, or constraint violations, the operational engine must employ one of the following architectural strategies:

### 3.1 Strategy A: Authoritative Natural-Key Conflict Targets (Preferred for PostgREST)
PostgREST supports upserts on non-primary-key unique constraints via the `on_conflict` query parameter, provided a matching unique index or constraint exists:
- `public.political_organizations`: `on_conflict=id` (since `id` is canonical text code, e.g. `'INC'`).
- `public.organization_relationships`: `on_conflict=source_organization_id,target_organization_id,relationship_type,valid_from` (governed by `uq_org_rel`).
- `public.organization_multilingual_names`: `on_conflict=organization_id,language_code,script_code,representation_type,name_value` (governed by `uq_org_multi_name`).
- `public.organization_symbols`: `on_conflict=organization_id,symbol_name,valid_from` (governed by `uq_org_symbols_timeline`).
- `public.organization_aliases`: Requires a dedicated composite unique constraint covering `(raw_lookup_key, organization_id, COALESCE(jurisdiction_scope, ''))` or explicit preflight reconciliation.

### 3.2 Strategy B: Target-State Read Reconciliation (Read-Before-Write)
Before executing writes:
1. Issue an authenticated read query to Staging Supabase for each child table to fetch existing rows and their current `id` values alongside their natural keys.
2. Map local repository entities to existing remote primary key UUIDs.
3. For matched rows, execute `UPDATE` preserving the existing primary key UUID.
4. For new rows, execute `INSERT` with newly generated UUIDs.
5. This strategy completely eliminates 23505 collisions, but requires authorized network read access to the staging database.

### 3.3 Strategy C: Canonical Migration Reconciliation
Apply an idempotent SQL migration or PL/pgSQL function (e.g., `fn_reconcile_political_catalog_seeds()`) that executes internal SQL `INSERT ... ON CONFLICT DO UPDATE` inside the database transaction boundary, bypassing external REST transport latency and multi-table network roundtrips.

---

## 4. Governance & Fail-Closed Invariant

Because:
1. Operational staging execution is currently blocked pending genuine administrator incident containment closure and independent cryptographic authorization token;
2. Air-gap rules prohibit network probing without authorization;
3. Offline schema contracts cannot verify the exact state of live pre-seeded tables in project `fkpigozcqnmcvofuksar`;

**Stage 1 is correctly and truthfully held in state `BLOCKED_NOT_DEPLOYABLE` with 0 rows outbound.**

This disposition prevents destructive database errors, guarantees zero phantom writes, and preserves data truth until the authorized execution prerequisites are genuinely satisfied.
