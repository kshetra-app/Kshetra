# W012: STAGING MIGRATION APPLICATION PACKAGE (039) — HARDENED
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
EXECUTION STATUS:        DO NOT EXECUTE YET (Awaiting CTO Pre-Staging Authorization)
```

---

## 1. Package File Registry & Cryptographic Fingerprints

| File Path | Description | Size (Bytes) | SHA-256 Checksum | BOM |
| :--- | :--- | :--- | :--- | :--- |
| `supabase/migrations/039_data_governance_foundation.sql` | Canonical Migration 039 | 28,333 | `74eb7540609228245559f4e58f7bde3083e36389f99d4790a9f1f3295279d0e4` | 0 |
| `supabase/staging_migration_package_039.sql` | Atomic Staging Application Package | 27,938 | `9ca7fb30477cea6ea0850adc4e5572129104334e5c372a1638ea0758b7e54be8` | 0 |
| `supabase/verify_staging_migration_package_039.sql` | Verification SQL Suite (Checks 1–10) | 10,169 | `54acfafc6f89fcdaa17f08b170c6141737501c6cc78482c59f63eb1bf612e12b` | 0 |
| `tests/verify_w012_data_governance.mjs` | Node Test Suite (Tests A–L) | 18,068 | `494414d6e4a4e021078779432b53700394f104f2cb02f4be843926321ce423f4` | 0 |
| `scripts/benchmark_w012_hot_paths.mjs` | Hot-Path Performance Benchmark Suite | 8,726 | `7fd336fd6d242d0da69a373594fdd2922cf5e88d78372c775bb6ba78d23c146e` | 0 |
| `reports/w012_hot_path_baseline.json` | Pre-Migration Baseline Benchmark (1000 iter) | 941 | `8f44169136fa745081de87f390271bdf3f5a8610500b796780b8301b83fd0a0d` | 0 |

---

## 2. Hardened Architecture & Security Invariants

### A. Restrictive Deletion & Anti-Cascade Architecture (Zero Cascading Deletes)
1. `datasets.source_id -> data_sources(id)`: `ON DELETE RESTRICT`
2. `dataset_versions.dataset_id -> datasets(id)`: `ON DELETE RESTRICT`
3. `dataset_versions.verification_evidence_id -> evidence_records(id)`: `ON DELETE RESTRICT`
4. `evidence_records.dataset_version_id -> dataset_versions(id)`: `ON DELETE RESTRICT`
5. `provenance_records.dataset_version_id -> dataset_versions(id)`: `ON DELETE RESTRICT`
6. `provenance_records.parent_provenance_id -> provenance_records(id)`: `ON DELETE RESTRICT`
7. `provenance_records.verification_evidence_id -> evidence_records(id)`: `ON DELETE RESTRICT`
8. `record_provenance_linkages.provenance_id -> provenance_records(id)`: `ON DELETE RESTRICT`
- **Permanent Anti-Deletion Triggers**: Physical deletion on `evidence_records`, `dataset_versions`, and `provenance_records` is permanently prohibited by database triggers.

### B. Dataset Version Snapshot Immutability
- Snapshot historical fields (`dataset_id`, `version_tag`, `effective_from`, `effective_to`, `retrieved_at`, `record_count`, `checksum_sha256`, `storage_path`, `metadata`, `created_at`) are permanently frozen against in-place modification. Trigger `prevent_dataset_version_mutation()` raises `IMMUTABILITY VIOLATION`.

### C. Provenance Lineage Append-Only Invariant
- Explicitly bifurcated:
  - **A. Immutable Historical Fields:** `dataset_version_id`, `source_record_id`, `parent_provenance_id`, `transformation_type`, `transform_version`, `operator`, `created_at`.
  - **B. Controlled Lifecycle Fields:** `status`, `verification_evidence_id`, `verified_by`.
- Trigger `prevent_provenance_mutation()` prohibits modifying historical fields even by `service_role`.

### D. Evidence Record Immutability
- All verification evidence records in `evidence_records` are permanently immutable. Neither in-place modification nor deletion is permitted (`prevent_evidence_mutation()`).

### E. Mandatory Evidence for All OFFICIAL Transitions
- Transition to `OFFICIAL` on **both** `dataset_versions` and `provenance_records` strictly requires:
  1. Administrative authorization (`service_role`, `postgres`, `supabase_admin`).
  2. Non-null `verification_evidence_id`.
  3. Existence of matching, authentic record in `evidence_records`.
- `SCENARIO -> OFFICIAL` remains permanently prohibited across both tables.

### F. Public Governance Visibility Classification
- **Public Transparency Fields:**
  - `data_sources`: `id`, `name`, `publisher`, `authority_level`, `canonical_url`, `license`, `retrieval_method`, `refresh_frequency`, `is_active`, `created_at`, `updated_at`.
  - `datasets`: `id`, `name`, `domain`, `description`, `source_id`, `license`, `created_at`, `updated_at`.
  - `dataset_versions`: `id`, `dataset_id`, `version_tag`, `effective_from`, `effective_to`, `retrieved_at`, `record_count`, `checksum_sha256`, `default_status`, `verification_evidence_id`, `created_at`.
  - `evidence_records`: `id`, `dataset_version_id`, `artifact_name`, `artifact_sha256`, `verification_authority`, `verified_at`, `created_at`.
  - `provenance_records`: `id`, `dataset_version_id`, `source_record_id`, `parent_provenance_id`, `status`, `transformation_type`, `transform_version`, `verification_evidence_id`, `created_at`.
  - `record_provenance_linkages`: `id`, `domain_table`, `domain_record_id`, `provenance_id`, `is_canonical`, `created_at`.
- **Internal / Administrative Fields (Revoked from `PUBLIC`, `anon`, `authenticated`):**
  - `operator`, `verified_by`, `verification_notes`, `storage_path`, internal `metadata`.

### G. Hardened SECURITY DEFINER Boundaries
- All 5 security functions explicitly declare `SET search_path = public, pg_temp` and contain no dynamic SQL or caller-controlled execution branches.

---

## 3. Governance Semantics Verification

```
IMPLEMENTED:          YES
STATICALLY VALIDATED: YES
STAGING EXECUTED:     NO
RUNTIME VERIFIED:     NO
CTO ACCEPTANCE:       NO
```
- Staging database has **NOT** been modified.
- Production database remains **UNTOUCHED**.
- Migration 039 will **NOT** be executed until explicit CTO pre-staging acceptance is granted.
