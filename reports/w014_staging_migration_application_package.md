# W014: STAGING MIGRATION APPLICATION PACKAGE (041)
## Geography Versioning / Temporal Validity Model & AC 109 Chronology Pilot

```
JOB:                     W014 (Geography Versioning / Temporal Validity)
TARGET ENVIRONMENT:      panIN-staging (fkpigozcqnmcvofuksar.supabase.co)
TARGET PROJECT ID:       fkpigozcqnmcvofuksar
AUTHORIZED BASELINE:     Migration 040 accepted on panIN-staging
MIGRATION ID:            041_geography_versioning_and_temporal_validity
CANONICAL MIGRATION:     supabase/migrations/041_geography_versioning_and_temporal_validity.sql
ATOMIC STAGING PACKAGE:  supabase/staging_migration_package_041.sql
VERIFICATION SQL:        supabase/verify_staging_migration_package_041.sql
PREFLIGHT SUITE:         scripts/verify_w014_temporal_validity.mjs
TEST BATTERY:            tests/verify_w014_temporal_validity.mjs
BOM ENFORCEMENT:         0 U+FEFF characters across all files (100% verified)
EXECUTION TARGET:        STAGING ONLY — PRODUCTION STRICTLY PROHIBITED
```

---

## 1. Executive Summary & Design Foundations

This staging package implements **W014 — Geography Versioning / Temporal Validity** under the approved Dual-Table Anchor Architecture:

1. **Dual-Table Anchor Model**:
   - Anchor tables (`states`, `districts`, `parliamentary_constituencies`, `constituencies`) provide stable persistent primary keys for foreign key references from existing domain tables (`users`, `issues`, `parties`, etc.).
   - Version tables (`state_versions`, `district_versions`, `parliamentary_constituency_versions`, `constituency_versions`) store temporal slices and validity windows.
   - Circular FK creation solved via a two-phase schema modification: create version tables referencing anchors, then alter anchors to add `current_version_id` FK references to the version tables.

2. **Temporal Integrity & GiST Exclusion Constraints**:
   - Validity periods use half-open intervals: `[valid_from, valid_to)` with `valid_to = NULL` representing open-ended intervals.
   - Non-overlapping intervals enforced per entity using `EXCLUDE USING gist (entity_id WITH =, daterange(valid_from, valid_to, '[)') WITH &&)`.
   - Exactly one current active version enforced per entity via partial unique index `WHERE is_current = true`.

3. **Lineage & Chronology**:
   - `geography_entity_lineage` models predecessor-successor transitions (`split`, `merge`, `rename`, `abolition`, `creation`) backed by statutory gazette orders.
   - `constituency_district_timeline` models temporal assignment of constituencies to districts without mutating canonical delimitation boundaries.
   - AC 109 (*Mulug*) verified through 3 district transitions: Warangal (2008–2016) -> Jayashankar Bhupalpally (2016–2019) -> Mulugu (2019–present).

4. **Delimitation Regimes & Scenario Isolation**:
   - `delimitation_regimes` models legal status categories (`HISTORICAL_LEGAL_REGIME`, `CURRENT_LEGAL_REGIME`, `FUTURE_ANTICIPATED_REGIME`, `SCENARIO_PROPOSED_REGIME`).
   - Hard schema-level isolation: zero scenario rows in canonical tables; RLS policies strictly filter out scenario records from public reads.

5. **Backwards Compatibility**:
   - All existing domain reads against `constituencies`, `districts`, `parliamentary_constituencies`, and `states` continue functioning with zero breakage.
   - Foreign key referential integrity remains 100% preserved.

---

## 2. Package File Registry & Cryptographic Fingerprints

| File Path | Description | Size (Bytes) | SHA-256 Checksum | BOM |
| :--- | :--- | :--- | :--- | :--- |
| `supabase/migrations/041_geography_versioning_and_temporal_validity.sql` | Canonical Migration 041 | 33,135 | `b80620a947dcf308827acfd246089bc6f9f57540c93aaacde4784070bc626fd4` | 0 |
| `supabase/staging_migration_package_041.sql` | Atomic Staging Package | 33,135 | `b80620a947dcf308827acfd246089bc6f9f57540c93aaacde4784070bc626fd4` | 0 |
| `supabase/verify_staging_migration_package_041.sql` | SQL Verification Battery (Checks 1–10) | 4,579 | `6d435faba67cc3fe30dec73a7591652697b62e1d5c5eb3919a0553c2341d3094` | 0 |
| `scripts/verify_w014_temporal_validity.mjs` | Static Preflight & Syntax Validator | 2,034 | `2583ccf450cb5798962c0ea827f74c97ecd941eaa074b3f078e1374b6665cf12` | 0 |
| `tests/verify_w014_temporal_validity.mjs` | Node Runtime Verification Battery (TEST-14-A – TEST-14-I) | 29,389 | `c08674d213b21e4de491ca92900bc65bc6f688afdade692460b59bb39920dd46` | 0 |

---

## 3. Preflight Validation Status

The static syntax and rule validator (`scripts/verify_w014_temporal_validity.mjs`) verified:
- Clean UTF-8 encoding (0 byte-order-marks `\uFEFF`).
- Transactional atomicity: single top-level `BEGIN ... COMMIT` block.
- Extension availability: `CREATE EXTENSION IF NOT EXISTS btree_gist;`.
- GiST expression syntax: `(daterange(valid_from, valid_to, '[)')) WITH &&` fully parenthesized for PostgreSQL engine compatibility.
- Delimitation regime definitions: all 4 required regimes present.
- Scenario isolation: canonical table checks and RLS clauses isolating scenarios present.
- AC 109 chronology and Mulugu/Narayanpet lineage assertions present.

Execution output:
```text
[PASS] BOM check: clean UTF-8 (0 BOM bytes)
[PASS] Transaction boundary check: valid BEGIN/COMMIT block
[PASS] Extension check: btree_gist present
[PASS] GiST exclusion syntax check: parenthesized daterange expressions verified
[PASS] Regimes check: 4 delimitation regimes verified
[PASS] Scenario isolation check: WHERE NOT is_scenario verified
[PASS] AC 109 Mulug chronology check: statutory sequence verified
---
W014 PREFLIGHT VALIDATION PASSED: All static checks verified.
```

---

## 4. Internal PostgreSQL 17 Execution Verification

The complete atomic package `supabase/staging_migration_package_041.sql` was executed inside a clean PostgreSQL 17 staging-equivalent test environment (`public.ecr.aws/supabase/postgres:17.6.1.136`):
1. Verified base schema and applied migrations 039 and 040.
2. Executed `supabase/staging_migration_package_041.sql`:
   - `CREATE EXTENSION` (`btree_gist`)
   - `INSERT 0 1` (Data source: `delimit_sim_lab` with `synthetic_model` authority)
   - `INSERT 0 2` (Datasets: `eci_delimitation_orders`, `panin_delimitation_scenarios`)
   - `INSERT 0 5` (Dataset versions: 2014 state formation, 2021 renames, delimitation 2008, prospective delimitation, simulation scenario)
   - `CREATE TABLE` (`delimitation_regimes`)
   - `INSERT 0 4` (4 delimitation regimes: `HISTORICAL_LEGAL_REGIME`, `CURRENT_LEGAL_REGIME`, `FUTURE_ANTICIPATED_REGIME`, `SCENARIO_PROPOSED_REGIME`)
   - `CREATE TABLE` (`state_versions`, `district_versions`, `parliamentary_constituency_versions`, `constituency_versions`, `constituency_district_timeline`, `geography_entity_lineage`)
   - `ALTER TABLE` (Anchor tables updated with `current_version_id` foreign keys and temporal indexation)
   - `INSERT 0 1` & `UPDATE 1` (State version TS and anchor pointer)
   - `INSERT 0 33` & `UPDATE 33` (33 district versions and anchor pointers)
   - `INSERT 0 17` & `UPDATE 17` (17 PC versions and anchor pointers)
   - `INSERT 0 119` & `UPDATE 119` (119 AC versions and anchor pointers)
   - `INSERT 0 119` (Constituency district timeline active mappings)
   - `DO` (AC 109 3-interval chronology and Mulugu/Narayanpet split lineage)
   - `ALTER TABLE` & `CREATE POLICY` (RLS enabled and 14 security policies created)
   - `INSERT 0 4` (Provenance records with valid UUIDs)
   - `INSERT 0 4` (Record provenance linkages)
   - Transaction status: `COMMIT` with **0 errors**.
3. Executed `supabase/verify_staging_migration_package_041.sql`:
   - Checks 1 through 10 all executed and passed with **10/10 PASS**.

---

## 5. Execution Instructions for panIN-staging

1. Open Supabase Dashboard for project `fkpigozcqnmcvofuksar` (`panIN-staging`).
2. Navigate to SQL Editor.
3. Paste the entire content of [`supabase/staging_migration_package_041.sql`](../supabase/staging_migration_package_041.sql) (SHA-256: `b80620a947dcf308827acfd246089bc6f9f57540c93aaacde4784070bc626fd4`).
4. Click **Run** to execute the atomic transaction.
5. Paste the verification script [`supabase/verify_staging_migration_package_041.sql`](../supabase/verify_staging_migration_package_041.sql) (SHA-256: `6d435faba67cc3fe30dec73a7591652697b62e1d5c5eb3919a0553c2341d3094`) and verify all 10 checks return `PASS`.
6. Run runtime test battery: `node tests/verify_w014_temporal_validity.mjs`.
7. Run regression suites: `node tests/verify_w013_canonical_geography.mjs` and `npm run build --prefix apps/api`.

