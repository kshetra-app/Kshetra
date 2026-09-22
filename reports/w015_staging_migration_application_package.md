# W015: STAGING MIGRATION APPLICATION PACKAGE (042)
## Geography Relationship Engine & Referential Hierarchy Reconciliation

```
JOB:                     W015 (Geography Relationship Engine)
TARGET ENVIRONMENT:      panIN-staging (fkpigozcqnmcvofuksar.supabase.co)
TARGET PROJECT ID:       fkpigozcqnmcvofuksar
AUTHORIZED BASELINE:     bb7c6ec (W014 CTO Accepted Baseline)
MIGRATION ID:            042_geography_relationship_engine
CANONICAL MIGRATION:     supabase/migrations/042_geography_relationship_engine.sql
ATOMIC STAGING PACKAGE:  supabase/staging_migration_package_042.sql
VERIFICATION SQL:        supabase/verify_staging_migration_package_042.sql
ROLLBACK SQL:            supabase/rollback_staging_migration_package_042.sql
PREFLIGHT SUITE:         scripts/verify_w015_relationship_engine.mjs
TEST BATTERY:            tests/verify_w015_relationship_engine.mjs
BOM ENFORCEMENT:         0 U+FEFF characters across all files (100% verified)
EXECUTION TARGET:        STAGING ONLY — PRODUCTION STRICTLY PROHIBITED
```

---

## 1. Executive Summary & Architecture Overview

Pursuant to CTO Implementation Authorization for **W015 — Geography Relationship Engine**, this package implements the bounded relationship architecture required to satisfy Master Job 015 across the seven mandated semantics:
1. `parent`
2. `child`
3. `contains`
4. `part-of`
5. `predecessor`
6. `successor`
7. `old-to-new mapping`

### 1.1 Structural Foundations & Bounded Fixes

1. **District -> Mandal Parentage (`DEF-15-01` Fix)**:
   - Enhances `public.mandals` with a canonical foreign key:
     `district_id UUID REFERENCES public.districts(id) ON DELETE RESTRICT`.
   - Links sub-district mandal entities directly to the stable district anchor created in W013.

2. **Mandal ↔ AC Containment (`DEF-15-02` Fix)**:
   - Enhances `public.mandal_constituency_map` with:
     `constituency_internal_id UUID REFERENCES public.constituencies(internal_id) ON DELETE RESTRICT`.
   - Preserves discrete `overlap_type` (`full` vs `partial`).
   - Strictly excludes quantitative `overlap_percentage` calculations, polygon intersections, and GIS operations (quarantined to W016).

3. **ECI Polling Booth Containment Invariant**:
   - Enhances `public.polling_booths` with `constituency_internal_id UUID REFERENCES public.constituencies(internal_id)`.
   - Models the fundamental constitutional invariant: every polling booth belongs to exactly one Assembly Constituency.

4. **W012 Governance Catalog Registration**:
   - Registers data source: `mopr_lgd` (Ministry of Panchayati Raj / Local Government Directory).
   - Registers datasets: `ts_lgd_mandals`, `ts_mandal_ac_mappings`, `eci_polling_stations`.
   - Registers dataset versions: `ts_lgd_mandals_2023_v1`, `ts_mandal_ac_mappings_2023_v1`, `eci_ts_booths_2023_v1`.
   - All dataset versions enter with `default_status = 'UNVERIFIED'`; 0 records elevated to `OFFICIAL`.

5. **Bounded Authoritative Seed Records**:
   - 12 authoritative mandals across Kumuram Bheem Asifabad and Mancherial districts with statutory LGD codes.
   - 10 authoritative mandal-AC containment links (discrete `full` and `partial`).
   - 4 authoritative sample polling booths for Sirpur (AC 1) and Chennur (AC 2).
   - 26 W012 provenance records and 26 record provenance linkages registered.

6. **Row Level Security (RLS)**:
   - Enabled and forced on `mandals`, `mandal_constituency_map`, and `polling_booths`.
   - Public read access for anonymous and authenticated clients.
   - Client mutations denied (`WITH CHECK (false)`); modifications restricted to `service_role`.

---

## 2. Package File Registry & Cryptographic Fingerprints

| File Path | Description | Size (Bytes) | SHA-256 Checksum | BOM |
| :--- | :--- | :--- | :--- | :--- |
| `supabase/migrations/042_geography_relationship_engine.sql` | Canonical Migration 042 | 20,443 | `01ff5e8a47e6326a9195141c02cbd1d1c5d3f2c2985d6f00c8f7eec4dcf49af8` | 0 |
| `supabase/staging_migration_package_042.sql` | Atomic Staging Package | 20,443 | `01ff5e8a47e6326a9195141c02cbd1d1c5d3f2c2985d6f00c8f7eec4dcf49af8` | 0 |
| `supabase/verify_staging_migration_package_042.sql` | SQL Verification Battery (Checks 1–6) | 5,064 | `645f36b60be7778c2cdaf68a8170ba49ace0e525ea9120610666e1c0566bb8a0` | 0 |
| `supabase/rollback_staging_migration_package_042.sql` | Deterministic Rollback Package | 2,231 | `b024f721dc9968fbc8a034c6aae25594e335e41367df147f4fab70e769ed965b` | 0 |
| `scripts/verify_w015_relationship_engine.mjs` | Static Preflight & Syntax Validator | 3,268 | `1ba45ac414f490a7a8fd6b588ff6c9a7a1e25bc69a011d9acadf3ed56e017637` | 0 |
| `tests/verify_w015_relationship_engine.mjs` | Node Runtime Verification Battery (TEST-A – TEST-E) | 28,534 | `a7d11e6664e41f59b1c40da89564613822f48316bc3b2192a6c708ca1807e113` | 0 |

---

## 3. Preflight & Execution Verification

### 3.1 Static Preflight (`scripts/verify_w015_relationship_engine.mjs`)
- Validated clean UTF-8 encoding (0 BOM bytes).
- Validated transactional atomicity (`BEGIN; ... COMMIT;`).
- Validated schema fixes `DEF-15-01` (`district_id`) and `DEF-15-02` (`constituency_internal_id`).
- Validated RLS policies, W012 governance `UNVERIFIED` invariants, and absence of quantitative `overlap_percentage`.
- **Result**: 100% PASS across all static assertions.

### 3.2 Internal PostgreSQL 17 Execution Verification
Executed inside a clean PostgreSQL 17 staging-equivalent Docker database (`supabase_db_Kshetra`):
1. Applied Migration 042 package: `COMMIT` with 0 errors.
2. Executed `verify_staging_migration_package_042.sql`:
   - `Check 1 PASS`: 12 mandals verified with valid `district_id` FK.
   - `Check 2 PASS`: 10 mandal-AC mappings verified with valid mandal and constituency FKs.
   - `Check 3 PASS`: 4 polling booths verified with valid constituency FKs.
   - `Check 4 PASS`: W012 governance registrations verified (100% UNVERIFIED).
   - `Check 5 PASS`: 26 provenance records and 26 linkages verified.
   - `Check 6 PASS`: RLS enabled on all W015 relationship tables.
   - `=== ALL MIGRATION 042 SQL VERIFICATION CHECKS PASSED ===`.
3. Tested `rollback_staging_migration_package_042.sql`: clean reversal restoring baseline state with 0 errors.
4. Tested re-application: idempotent re-execution with `COMMIT` and 0 errors.

---

## 4. Staging Application Instructions

The package `supabase/staging_migration_package_042.sql` is staged in the repository and has been loaded into the system clipboard via:
```powershell
Get-Content .\supabase\staging_migration_package_042.sql -Raw | Set-Clipboard
```

To complete staging mutation on `panIN-staging` (`fkpigozcqnmcvofuksar.supabase.co`):
1. Open the Supabase SQL Editor for project `fkpigozcqnmcvofuksar`.
2. Paste and execute the package contents.
3. Run the verification battery:
   ```bash
   node tests/verify_w015_relationship_engine.mjs
   ```
