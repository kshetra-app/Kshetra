# W020-G4: MIGRATION 055 STAGING PREFLIGHT & SCHEMA INTEGRITY REPORT

## 1. Executive Summary & Verification Coordinates

This document reports the completion and verification results of **W020-G4: Migration 055 Staging Preflight & Delimitation Schema Bridge**, executed pursuant to **CTO DIRECTIVE — W020 MASTER PLAN REV-1.3 RATIFICATION & BOUNDED G4 AUTHORIZATION**.

| Coordinate Field | Value |
|---|---|
| **Gate Identifier** | `W020-G4` |
| **Directive Title** | CTO AUTHORIZATION — W020-G4 MIGRATION 055 STAGING PREFLIGHT |
| **Execution Timestamp** | `2026-09-30T03:30:42.012Z` |
| **Baseline Git Commit SHA** | `9b7cad4aea34d7e2b4411e44d88549340c70df8a` (`9b7cad4`) |
| **Final Git Commit SHA** | `c0da5513fafb636af61f830bff2fa56cff8a5ec6` (`c0da551`) |
| **Target Staging Database** | `https://fkpigozcqnmcvofuksar.supabase.co` (`panIN-staging`) |
| **Production Air-Gap Status** | **100% AIR-GAPPED & UNTOUCHED** (`ehfafcnimmjusyvplbah`) |
| **589 PostGIS Geometry Count** | `589` rows (Strictly Frozen) |
| **589 PostGIS Geometry Digest** | `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` |
| **Preflight Test Battery** | **23 / 23 PASS (100%)** (`tests/delimitation-migration-055-preflight.test.mjs`) |
| **W018 Regression Suite** | **53 / 53 PASS (100%)** (`tests/political-entities-invariants.test.mjs`) |
| **W019 Regression Suite** | **93 / 93 PASS (100%)** (`tests/election-normalization-invariants.test.mjs`) |
| **API Contract Drift Check** | **9 / 9 MATCH (100%)** (`scripts/check-api-contract-drift.mjs`) |
| **API TypeScript Build** | **PASS (Exit 0)** (`tsc --noEmit` on `apps/api`) |
| **Overall Gate Verdict** | **PASS — FULLY VERIFIED & READY FOR OPERATOR STAGING EXECUTION** |

---

## 2. Production Air-Gap Verification

Under MEF Rule IV-001 and CTO explicit instructions, production database `ehfafcnimmjusyvplbah` must remain strictly untouched throughout W020-G4.

* **Production Access Check**: 0 network requests, 0 SQL statements, and 0 migrations were directed at `ehfafcnimmjusyvplbah`.
* **Host Verification**: Preflight harness and staging catalog probes connected exclusively to local PostgreSQL test harness (`supabase_db_Kshetra` / `w020_g4_pg_verify`) and staging Supabase (`fkpigozcqnmcvofuksar.supabase.co`).
* **Environment Isolation**: Production service credentials remain completely air-gapped and excluded from runtime execution.

---

## 3. Pre-Migration vs. Post-Migration Schema Comparison

Migration 055 establishes the canonical bridge connecting legacy prototype tables (`delimitation_proposals` and `constituency_mapping` introduced in prototype Migration 012) with the authoritative W016 delimitation foundation tables (`delimitation_regimes`, `constituency_versions`, and `provenance_records`).

### 3.1 `public.delimitation_proposals`

| Property / Column | Pre-Migration State (Migration 012) | Post-Migration State (Migration 055) | Semantic Rationale |
|---|---|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` | Unchanged | Canonical proposal ID |
| `proposal_name` | `TEXT NOT NULL` | Unchanged | Legacy display title |
| `state_code` | `VARCHAR(10) NOT NULL` | Unchanged | ISO/ECI State code |
| `status` | `VARCHAR(50) DEFAULT 'draft'` | Unchanged | Proposal workflow status |
| `summary` | `TEXT` | Unchanged | Summary text |
| `created_by` | `UUID` | Unchanged | Author linkage |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Unchanged | Timestamps |
| **`delimitation_regime_id`** | **ABSENT** | **`VARCHAR(50) REFERENCES delimitation_regimes(id) ON DELETE RESTRICT`** | **Links proposal to legal or scenario delimitation regime** |
| **`provenance_id`** | **ABSENT** | **`UUID REFERENCES provenance_records(id) ON DELETE RESTRICT`** | **Mandatory audit and evidentiary provenance link** |
| **`metadata`** | **ABSENT** | **`JSONB NOT NULL DEFAULT '{}'::jsonb`** | **Extensible JSON storage for scenario parameters, formula configs, and projections** |
| `is_scenario` | ABSENT | **EXCLUDED (Strictly Prohibited)** | Regime status derived exclusively from `delimitation_regimes.legal_status` |

### 3.2 `public.constituency_mapping`

| Property / Column | Pre-Migration State (Migration 012) | Post-Migration State (Migration 055) | Semantic Rationale |
|---|---|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` | Unchanged | Mapping record ID |
| `proposal_id` | `UUID REFERENCES delimitation_proposals(id)` | Unchanged | Parent proposal reference |
| `source_constituency_id` | `VARCHAR(50)` | Unchanged | Legacy string constituency identifier |
| `target_constituency_id` | `VARCHAR(50)` | Unchanged | Legacy string constituency identifier |
| `change_type` | `VARCHAR(50)` | Unchanged | Transformation type |
| `overlap_percentage` | `DECIMAL(5,2)` | Unchanged | Overlap metric |
| `description` | `TEXT` | Unchanged | Narrative change description |
| **`constituency_version_id`** | **ABSENT** | **`UUID REFERENCES constituency_versions(id) ON DELETE RESTRICT`** | **Canonical foreign key to resulting constituency version** |
| **`predecessor_version_id`** | **ABSENT** | **`UUID REFERENCES constituency_versions(id) ON DELETE RESTRICT`** | **Canonical foreign key to predecessor constituency version** |
| **`provenance_id`** | **ABSENT** | **`UUID REFERENCES provenance_records(id) ON DELETE RESTRICT`** | **Mandatory evidentiary provenance reference** |
| `is_scenario` | ABSENT | **EXCLUDED (Strictly Prohibited)** | No redundant boolean flags permitted |

---

## 4. Database Objects Created & Altered

### 4.1 Columns Created
1. `public.delimitation_proposals.delimitation_regime_id` (`VARCHAR(50)`)
2. `public.delimitation_proposals.provenance_id` (`UUID`)
3. `public.delimitation_proposals.metadata` (`JSONB NOT NULL DEFAULT '{}'::jsonb`)
4. `public.constituency_mapping.constituency_version_id` (`UUID`)
5. `public.constituency_mapping.predecessor_version_id` (`UUID`)
6. `public.constituency_mapping.provenance_id` (`UUID`)

### 4.2 Constraints & Foreign Keys Created
1. `fk_delim_proposals_regime`: `delimitation_proposals(delimitation_regime_id) -> delimitation_regimes(id) ON DELETE RESTRICT`
2. `fk_delim_proposals_provenance`: `delimitation_proposals(provenance_id) -> provenance_records(id) ON DELETE RESTRICT`
3. `fk_mapping_constituency_version`: `constituency_mapping(constituency_version_id) -> constituency_versions(id) ON DELETE RESTRICT`
4. `fk_mapping_predecessor_version`: `constituency_mapping(predecessor_version_id) -> constituency_versions(id) ON DELETE RESTRICT`
5. `fk_mapping_provenance`: `constituency_mapping(provenance_id) -> provenance_records(id) ON DELETE RESTRICT`

### 4.3 Indexes Created
1. `idx_delim_proposals_regime`: `ON delimitation_proposals (delimitation_regime_id)`
2. `idx_delim_proposals_provenance`: `ON delimitation_proposals (provenance_id)`
3. `idx_mapping_constituency_version`: `ON constituency_mapping (constituency_version_id)`
4. `idx_mapping_predecessor_version`: `ON constituency_mapping (predecessor_version_id)`
5. `idx_mapping_provenance`: `ON constituency_mapping (provenance_id)`

### 4.4 Row Level Security & Access Policies
1. `ALTER TABLE public.delimitation_proposals ENABLE ROW LEVEL SECURITY;`
2. `ALTER TABLE public.constituency_mapping ENABLE ROW LEVEL SECURITY;`
3. `CREATE POLICY delim_proposals_read_policy ON public.delimitation_proposals FOR SELECT USING (true);`
4. `CREATE POLICY constituency_mapping_read_policy ON public.constituency_mapping FOR SELECT USING (true);`
5. `GRANT SELECT ON public.delimitation_proposals TO anon, authenticated;`
6. `GRANT SELECT ON public.constituency_mapping TO anon, authenticated;`

---

## 5. Delimitation Preflight Verification Battery (23 / 23 PASS)

The preflight test suite was executed against an isolated PostgreSQL 17 test harness (`w020_g4_pg_verify`) populated with the exact staging database schema.

| Test ID | Category | Check Title | Result | Observed Evidence |
|---|---|---|---|---|
| `W020-G4-MIG-01` | Migration Atomicity | Migration 055 executes transactionally with exit code 0 | **PASS** | Transaction committed cleanly in isolated session |
| `W020-G4-MIG-02` | Idempotency | Migration 055 is idempotent on replay | **PASS** | Second execution passed with 0 errors (`IF NOT EXISTS` guards) |
| `W020-G4-MIG-03` | Rollback Rehearsal | Failure rehearsal rolls back cleanly | **PASS** | Simulated mid-migration syntax error aborted cleanly; 0 partial columns applied |
| `W020-G4-SCH-01` | Schema Invariants | All required bridge columns exist with exact types | **PASS** | Proposals: `regime_id` (varchar), `provenance_id` (uuid), `metadata` (jsonb). Mapping: `version_id` (uuid), `predecessor_id` (uuid), `provenance_id` (uuid). |
| `W020-G4-SCH-02` | Column Integrity | Zero unauthorized columns added | **PASS** | Exactly 3 approved columns added to each table; 0 extra columns |
| `W020-G4-SCH-03` | Anti-Pattern Guard | Zero persistent `is_scenario` columns exist | **PASS** | 0 columns named `is_scenario` across database catalog |
| `W020-G4-FK-01` | FK Integrity | All 5 approved foreign key relationships exist | **PASS** | All 5 foreign keys cataloged against `delimitation_regimes`, `provenance_records`, and `constituency_versions` |
| `W020-G4-FK-02` | Constraint Enforcement | Invalid foreign key references fail closed | **PASS** | Invalid regime, invalid provenance, and invalid version all rejected with SQL error `23503` |
| `W020-G4-FK-03` | Referential Integrity | `ON DELETE RESTRICT` actively blocks parent deletion | **PASS** | Attempted deletion of referenced regimes, versions, or provenance records is blocked with SQL error `23503` |
| `W020-G4-RLS-01` | RLS Activation | RLS enabled on both delimitation bridge tables | **PASS** | `rowsecurity = true` confirmed on `delimitation_proposals` and `constituency_mapping` |
| `W020-G4-RLS-02` | RLS Write Denial | Anonymous write is denied fail-closed | **PASS** | Unauthenticated `INSERT` rejected under active RLS policy |
| `W020-G4-RLS-03` | RLS Public Read | Authenticated role has public `SELECT` permission | **PASS** | Authenticated `SELECT` returns rows successfully |
| `W020-G4-RLS-04` | Service Role Access | Privileged service role maintains unconstrained access | **PASS** | Service role executes CRUD without RLS restrictions |
| `W020-G4-REG-01` | Regime Semantics | `legal_status` is authoritative classifier | **PASS** | Checked regimes: `CURRENT_LEGAL_REGIME`, `FUTURE_ANTICIPATED_REGIME`, `SCENARIO_PROPOSED_REGIME` |
| `W020-G4-REG-02` | Regime Semantics | Zero redundant scenario boolean flags on tables | **PASS** | `is_scenario` and `scenario_flag` completely absent from schema |
| `W020-G4-PRV-01` | Provenance Audit | Approved `provenance_id` FKs exist on both tables | **PASS** | Both tables link directly to `public.provenance_records(id)` |
| `W020-G4-PRV-02` | Provenance Audit | Invalid provenance references rejected fail-closed | **PASS** | Non-existent UUIDs rejected by database foreign key constraint |
| `W020-G4-PRV-03` | Provenance Audit | Referenced provenance record cannot be deleted | **PASS** | Blocked under `ON DELETE RESTRICT` |
| `W020-G4-PRD-01` | Air-Gap | Production database `ehfafcnimmjusyvplbah` untouched | **PASS** | Connection strings strictly verified against staging URL `fkpigozcqnmcvofuksar` |
| `W020-G4-GEO-01` | Geometry Count | `public.entity_geometries` row count = 589 | **PASS** | Observed: 589 rows |
| `W020-G4-GEO-02` | Geometry Digest | Canonical SHA-256 geometry digest matches frozen baseline | **PASS** | Observed digest matches `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` |
| `W020-G4-STG-01` | Staging Catalog | Live staging contains legacy `delimitation_proposals` | **PASS** | Present in staging OpenAPI schema; row count = 0 |
| `W020-G4-STG-02` | Staging Catalog | Live staging contains legacy `constituency_mapping` | **PASS** | Present in staging OpenAPI schema; row count = 0 |

---

## 6. Full Regression Battery Results

### 6.1 W018 Political Entity Master Invariant Suite (53 / 53 PASS)
- **Command**: `node tests/political-entities-invariants.test.mjs`
- **Result**: `53/53 PASSED (100%)`
- **Scope**: Verified person resolution, identity linkages, party affiliations, defect preservation, no fuzzy auto-merges, strict constraints.

### 6.2 W019 Election Data Normalization Invariant Suite (93 / 93 PASS)
- **Command**: `node tests/election-normalization-invariants.test.mjs`
- **Result**: `93/93 PASSED (100%)`
- **Scope**: Verified candidate representation, exact ordinal ranks (Rank 1 = Winner, Rank 2 = Runner-up, Rank 3 = Third-place, Rank 4+ exact), NOTA isolation, EVM/postal decomposition independence, rejected votes audit, zero arithmetic derivation of unknown fields, zero candidate pools.

### 6.3 589 PostGIS Geometry Baseline Preservation
- **Row Count**: `589` rows
- **Canonical SHA-256 Digest**: `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`
- **Ordering Formulation**: Sorted by `mandal_version_id` ascending, hashing coordinate tuples.
- **Status**: **STRICTLY FROZEN AND UNMUTATED**.

### 6.4 Fastify API Contract Drift & Build
- **Drift Check**: `node scripts/check-api-contract-drift.mjs` -> `9/9 MATCH (100%)`
- **API Build**: `npm run build --prefix apps/api` -> `tsc --noEmit` **EXIT 0 (PASS)**
- **Mobile Build**: `npx tsc --noEmit -p apps/mobile/tsconfig.json` -> **PASS**

---

## 7. Operator Staging Execution Instructions

To execute Migration 055 on the live staging database (`fkpigozcqnmcvofuksar`):

### Step 1: Open Supabase SQL Editor
1. Log into the Supabase Dashboard for project `fkpigozcqnmcvofuksar` (`panIN-staging`).
2. Navigate to the **SQL Editor**.

### Step 2: Execute Staging Package
1. Open the file `supabase/staging_migration_package_055.sql`.
2. Paste the entire script into the SQL Editor.
3. Click **Run**.
4. Confirm that the script completes with:
   ```
   NOTICE:  [MIGRATION 055] PRE-CHECK: delimitation_proposals row count = 0
   NOTICE:  [MIGRATION 055] PRE-CHECK: constituency_mapping row count = 0
   ...
   NOTICE:  [MIGRATION 055] SUCCESS: Migration 055 applied successfully within transaction.
   ```

### Step 3: Run SQL Verification Script
1. Open `supabase/verification_055_delimitation_canonical_bridge.sql`.
2. Paste into the SQL Editor and click **Run**.
3. Confirm that all verification queries return expected row counts and foreign keys.

### Step 4: Emergency Rollback Procedure (If Necessary)
If an unexpected error occurs during staging deployment:
1. Open `supabase/rollback_055_delimitation_canonical_bridge.sql`.
2. Paste into the SQL Editor and click **Run**.
3. Confirm that the added columns, indexes, and RLS policies are dropped cleanly, restoring the table definitions to their exact Migration 012 baseline.

---

## 8. Gate Status & Conclusion

* **W020-G4**: **COMPLETED & FULLY VERIFIED**.
* **W020-G5 Onward**: **REMAINS STRICTLY BLOCKED / NOT AUTHORIZED** pending explicit CTO authorization.
* **Production Status**: **UNTOUCHED / AIR-GAPPED**.
