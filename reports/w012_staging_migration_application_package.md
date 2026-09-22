# W012: STAGING MIGRATION APPLICATION PACKAGE (039)
## Data Governance Foundation & Provenance Architecture

```
JOB:                     W012 (Data Governance Foundation)
TARGET ENVIRONMENT:      panIN-staging (fkpigozcqnmcvofuksar.supabase.co)
AUTHORITATIVE BASELINE:  af2de02e8c6c4b98557f46a3b9274df2c9ff63bf
MIGRATION ID:            039_data_governance_foundation
ATOMIC PACKAGE:          supabase/staging_migration_package_039.sql
VERIFICATION SQL:        supabase/verify_staging_migration_package_039.sql
TEST SUITE:              tests/verify_w012_data_governance.mjs
BENCHMARK SUITE:         scripts/benchmark_w012_hot_paths.mjs
BOM ENFORCEMENT:         0 U+FEFF characters across all SQL files (100% verified)
AUTHORIZATION:           CTO Implementation Authorization (Staging Only)
```

---

## 1. Package File Registry & Cryptographic Fingerprints

| File Path | Description | Size (Bytes) | SHA-256 Checksum | BOM |
| :--- | :--- | :--- | :--- | :--- |
| `supabase/migrations/039_data_governance_foundation.sql` | Canonical Migration 039 | 21,576 | `59a6c4f23e7ce436be54224400492951f3f3fa9d30086a5a97dd50e20b48a236` | 0 |
| `supabase/staging_migration_package_039.sql` | Atomic Staging Application Package | 21,847 | `b4a40af0050f14bd15b52860629541f3337308816e42cb734c78c9b72c433f22` | 0 |
| `supabase/verify_staging_migration_package_039.sql` | Verification SQL Suite (Checks 1–10) | 9,115 | `4910298cc196ab9390e132fbf4d0264ed170e532c752492c22e9e194d61d758b` | 0 |
| `tests/verify_w012_data_governance.mjs` | Node Automated Test Suite (Tests A–L) | 21,290 | `651d84e7338b25bcb26ad79cd6b0645c5088468fcaf732eb004e766ccac4e484` | 0 |
| `scripts/benchmark_w012_hot_paths.mjs` | Hot-Path Performance Benchmark Suite | 8,726 | `7fd336fd6d242d0da69a373594fdd2922cf5e88d78372c775bb6ba78d23c146e` | 0 |
| `reports/w012_hot_path_baseline.json` | Pre-Migration Baseline Benchmark (1000 iter) | 941 | `8f44169136fa745081de87f390271bdf3f5a8610500b796780b8301b83fd0a0d` | 0 |

---

## 2. Structural Schema Specification

### A. Enums Created
1. `source_authority_enum`:
   - `'constitutional'`
   - `'statutory'`
   - `'academic'`
   - `'media_ngo'`
   - `'crowdsourced'`
   - `'synthetic_model'`
2. `data_status_enum`:
   - `'OFFICIAL'`
   - `'DERIVED'`
   - `'VERIFIED'`
   - `'ESTIMATE'`
   - `'SCENARIO'`
   - `'INFERRED'`
   - `'UNVERIFIED'`
   - `'UNKNOWN'`

### B. Tables Created
1. `data_sources`: Canonical registry of primary data publishers and institutional authority levels.
2. `datasets`: Governed dataset entities across civic, electoral, and geographic domains.
3. `dataset_versions`: Immutable snapshots with checksums, temporal validity, and `default_status DEFAULT 'UNKNOWN'`.
4. `evidence_records`: Cryptographically auditable evidence records required for status elevation to `OFFICIAL`.
5. `provenance_records`: Append-only provenance lineage nodes forming a DAG (`status DEFAULT 'UNKNOWN'`).
6. `record_provenance_linkages`: M:N association connecting domain records to provenance lineage nodes.

### C. Security Invariants & Triggers
1. `check_status_transition_invariant()`:
   - **SCENARIO -> OFFICIAL**: Permanently prohibited (`INVARIANT VIOLATION`).
   - **Transition to OFFICIAL**: Requires authorized administrative role (`service_role`, `postgres`, `supabase_admin`) **AND** an authoritative, existing record in `evidence_records`. Caller-supplied fake IDs fail closed.
2. `check_version_status_transition_invariant()`:
   - Blocks `SCENARIO -> OFFICIAL` on dataset versions.
   - Enforces administrative authorization for `OFFICIAL` elevation.
3. `prevent_provenance_mutation()`:
   - Enforces append-only immutability of historical lineage fields (`dataset_version_id`, `parent_provenance_id`, `transformation_type`, `created_at`). In-place edits raise `IMMUTABILITY VIOLATION`.
4. `FORCE ROW LEVEL SECURITY`:
   - Forced across all 6 tables.
   - Public read policy for transparent governance inquiry.
   - `service_role` full access policy.
   - Untrusted anonymous mutations denied.

### D. Controlled Source Seeds & Representative Datasets
1. Sources:
   - `eci` (constitutional)
   - `prs_india` (academic)
   - `myneta` (media_ngo)
   - `datta07_shapefiles` (crowdsourced)
   - `synthetic_projection_model` (synthetic_model)
2. Bounded Representative Datasets:
   - `geo_assembly_boundaries` (geography, source: `datta07_shapefiles`, authority: `crowdsourced`, status: `UNVERIFIED`)
   - `telangana_2023_mla_profiles` (political_profiles, source: `myneta`, authority: `media_ngo`, status: `UNVERIFIED`)
   - `civic_bills_schemes` (civic_governance, source: `prs_india`, authority: `academic`, status: `UNKNOWN`)
   - `tamil_nadu_2026_projection` (election_projection, source: `myneta`, authority: `media_ngo`, type: `synthetic_projection_simulation`, status: `SCENARIO`)

---

## 3. Staging Execution Protocol

The staging migration package is staged at:
[`supabase/staging_migration_package_039.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/staging_migration_package_039.sql)

### Operator Execution Steps:
1. Open Supabase Dashboard for project `fkpigozcqnmcvofuksar` (`panIN-staging`).
2. Navigate to the **SQL Editor**.
3. Paste and execute the exact contents of `supabase/staging_migration_package_039.sql`.
4. Paste and execute the verification query `supabase/verify_staging_migration_package_039.sql` to verify all 10 checks pass.
5. Re-run:
   ```bash
   node tests/verify_w012_data_governance.mjs
   node scripts/benchmark_w012_hot_paths.mjs --compare
   ```
6. Verify all 12 security tests pass and both dual p95 performance gates pass.
