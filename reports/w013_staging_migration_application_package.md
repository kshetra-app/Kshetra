# W013: STAGING MIGRATION APPLICATION PACKAGE (040) — REMEDIATED
## Canonical Geography Model Foundation & Telangana Bounded Pilot

```
JOB:                     W013 (Canonical Geography Model)
TARGET ENVIRONMENT:      panIN-staging (fkpigozcqnmcvofuksar.supabase.co)
REMEDIATION PARENT:      29cbe0c9282bcf3cdbfc25360687c6839901dab4
MIGRATION ID:            040_canonical_geography_model
CANONICAL MIGRATION:     supabase/migrations/040_canonical_geography_model.sql
ATOMIC STAGING PACKAGE:  supabase/staging_migration_package_040.sql
VERIFICATION SQL:        supabase/verify_staging_migration_package_040.sql
WIDTH AUDIT SUITE:       scripts/verify_w013_identifier_widths.mjs
TEST BATTERY:            tests/verify_w013_canonical_geography.mjs
BOM ENFORCEMENT:         0 U+FEFF characters across all files (100% verified)
EXECUTION STATUS:        REMEDIATED — AWAITING CTO REVIEW (DO NOT EXECUTE YET)
```

---

## 1. Incident Record & Defect History (Preserved Evidence)

### Initial Execution Failure (Commit `29cbe0c9282bcf3cdbfc25360687c6839901dab4`)
- **Execution Target**: `panIN-staging` (`fkpigozcqnmcvofuksar`)
- **Package SHA-256**: `b1f2ca6c6e585be7f153ba5619ac9667d7ab926fa4e16632e101c927126ce628`
- **Observed Error**:
  ```text
  ERROR: 22001: value too long for type character varying(30)
  ```
- **Root Cause**:
  Migration 040 defined `public.districts.code VARCHAR(30) UNIQUE NOT NULL`, but the approved canonical Telangana seed catalog includes `TS-DIST-JAYASHANKAR-BHUPALPALLY` which is **31 characters** long.
- **Rollback Verification**:
  Because Migration 040 is enclosed within a single atomic transactional block (`BEGIN ... COMMIT`), PostgreSQL cleanly rolled back the entire transaction upon encountering the error. Zero tables, constraints, or orphaned records were created on staging (`public.districts` returned 404 in schema cache; `constituencies` remained at 0 rows).
- **Remediation Directives**:
  1. No manual SQL patching or retry of the failed package.
  2. Perform comprehensive static identifier-width audit across all bounded entities.
  3. Widen column widths to `VARCHAR(50)` for `districts.code`, `districts.entity_type`, `parliamentary_constituencies.code`, `parliamentary_constituencies.entity_type`, `constituencies.canonical_code`, `constituencies.entity_type`.
  4. Do NOT shorten `TS-DIST-JAYASHANKAR-BHUPALPALLY`.
  5. Add deterministic static assertion suite (`scripts/verify_w013_identifier_widths.mjs`).
  6. Verify internal execution on clean staging-equivalent PostgreSQL instance.

---

## 2. Package File Registry & Cryptographic Fingerprints

| File Path | Description | Size (Bytes) | SHA-256 Checksum | BOM |
| :--- | :--- | :--- | :--- | :--- |
| `supabase/migrations/040_canonical_geography_model.sql` | Canonical Migration 040 (Remediated) | 69,431 | `56f28f6f615811a8755a3f234ec8ebc00bb2f5594eccd6501015e684dff98395` | 0 |
| `supabase/staging_migration_package_040.sql` | Atomic Staging Package (Remediated) | 69,431 | `56f28f6f615811a8755a3f234ec8ebc00bb2f5594eccd6501015e684dff98395` | 0 |
| `supabase/verify_staging_migration_package_040.sql` | Verification SQL Suite (Checks 1–11) | 12,293 | `86f8a2b8d019e7282eeee921d895bd284f9df6d072a4dfb91939b5ad7adb8cd7` | 0 |
| `scripts/verify_w013_identifier_widths.mjs` | Static Preflight Width Audit Suite | 7,259 | `2aba3258877bd1a74ed000a0871f37cf306b1fa2272662f0103d284538b61a1c` | 0 |
| `tests/verify_w013_canonical_geography.mjs` | Node Test Battery (Tests 13-A–13-M) | 20,852 | `853e1466998a73f2bfac7692324b400d24a5931efea84348015d7cbc3d8f05fa` | 0 |
| `reports/w013_staging_verification.json` | Test Execution Evidence Record | 4,850 | `78af62a8c171ef33864b5d739db05377a73544429b2c6dd4073b552e1397942c` | 0 |

---

## 3. Complete Identifier-Width Audit

The deterministic preflight suite (`scripts/verify_w013_identifier_widths.mjs`) inspected 100% of the seed tuples against the updated schema:

| Target Column | Schema Definition | Max Seed Length | Longest Observed Identifier | Margin | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `districts.code` | `VARCHAR(50)` | 31 | `TS-DIST-JAYASHANKAR-BHUPALPALLY` | +19 chars | **PASS** |
| `districts.entity_type` | `VARCHAR(50)` | 8 | `district` | +42 chars | **PASS** |
| `parliamentary_constituencies.code` | `VARCHAR(50)` | 8 | `TS-PC-01` | +42 chars | **PASS** |
| `parliamentary_constituencies.entity_type` | `VARCHAR(50)` | 26 | `parliamentary_constituency` | +24 chars | **PASS** |
| `constituencies.canonical_code` | `VARCHAR(50)` | 9 | `TS-AC-001` | +41 chars | **PASS** |
| `constituencies.entity_type` | `VARCHAR(50)` | 21 | `assembly_constituency` | +29 chars | **PASS** |

- **Preservation of Full Identifier**: `TS-DIST-JAYASHANKAR-BHUPALPALLY` is preserved with 0 abbreviation and 0 truncation.
- **Top 5 District Code Lengths**:
  1. `TS-DIST-JAYASHANKAR-BHUPALPALLY` (31 chars)
  2. `TS-DIST-KUMURAM-BHEEM-ASIFABAD` (30 chars)
  3. `TS-DIST-BHADRADRI-KOTHAGUDEM` (28 chars)
  4. `TS-DIST-YADADRI-BHUVANAGIRI` (27 chars)
  5. `TS-DIST-MEDCHAL-MALKAJGIRI` (26 chars)

---

## 4. Internal PostgreSQL Execution Verification (Requirement 13)

The remediated package `supabase/staging_migration_package_040.sql` was executed inside a clean PostgreSQL 17 test environment (`test_w013_staging` on `public.ecr.aws/supabase/postgres:17.6.1.136`):
1. Applied base schema and Migration 039.
2. Executed `supabase/staging_migration_package_040.sql`:
   - `INSERT 0 33` (Districts)
   - `INSERT 0 17` (Parliamentary Constituencies)
   - `INSERT 0 119` (Assembly Constituencies)
   - `INSERT 0 170` (Provenance Linkages)
   - Transaction status: `COMMIT` with **0 errors**.
3. Executed `supabase/verify_staging_migration_package_040.sql`:
   - Checks 1 through 11 all executed successfully.
   - Check 11 confirmed: `character_maximum_length = 50` across all 6 columns and verified `TS-DIST-JAYASHANKAR-BHUPALPALLY` retrieved with length 31.
4. Clean test environment dropped after verification.

---

## 5. Scope Isolation Proof (Zero W014–W017 Scope)

- **W014**: Zero temporal columns (`effective_from`, `effective_to` on canonical tables deferred to W014).
- **W015**: Zero spatial traversal functions, zero mandal-to-AC overlap matrices.
- **W016**: Zero PostGIS geometry modifications or vector tile scaffolding.
- **W017**: Zero automated sliver detection or quality reconciliation engines.
- **Ingestion**: Bounded strictly to Telangana pilot (1 State, 33 Districts, 17 PCs, 119 ACs).
- **Mobile/API**: Zero contract modifications, zero mobile SQLite modifications.
- **Production**: Zero queries, zero connections, strictly untouched.
