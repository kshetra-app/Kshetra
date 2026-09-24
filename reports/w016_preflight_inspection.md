# W016 — Spatial Geometry & Topology Preflight Inspection

**Generated:** 2026-09-23
**Authority:** CTO Directive — W015 Final Governance Closure (Section 13-14)
**Scope:** PREFLIGHT ONLY — Implementation NOT AUTHORIZED

### Commit Coordinates

| Role | SHA | Description |
|---|---|---|
| Repository state inspected | `4d99dd3` | W015 governance closure commit (HEAD at time of inspection) |
| W016 preflight evidence commit | `8736f6b` | This document's own commit |
| W015 accepted evidence commit | `3748e46` | CTO-accepted W015-B2 evidence |

**Branch:** `master`

### Evidence Methodology

All findings in this document are derived from **static repository inspection** of migration SQL files, TypeScript source, GeoJSON files, and seed data present at commit `4d99dd3`. Unless explicitly stated otherwise, NO finding is derived from live queries against panIN-staging. Claims about staging runtime state (e.g., whether geometry columns contain actual data) are classified with their evidence basis per-question below.

> [!IMPORTANT]
> **W016 IMPLEMENTATION IS NOT AUTHORIZED.**
> This document is a factual inspection of the current state. It does NOT constitute an implementation plan, design proposal, or authorization request.

---

## Question 1: What geometry columns currently exist in the database schema?

**Evidence Class: `STATIC_REPOSITORY`** — Established by inspecting migration SQL files in `supabase/migrations/`.

| Table | Column | Type | SRID | Source Migration |
|---|---|---|---|---|
| `public.constituencies` | `boundary` | `GEOMETRY(MultiPolygon, 4326)` | 4326 | `001_initial_schema.sql` L31 |
| `public.mandals` | `centroid` | `GEOMETRY(Point, 4326)` | 4326 | `022_administrative_hierarchy.sql` L60 |
| `public.mandals` | `boundary` | `GEOMETRY(MultiPolygon, 4326)` | 4326 | `022_administrative_hierarchy.sql` L61 |
| `public.states` | `centroid_lat` | `DOUBLE PRECISION` | N/A | `001_initial_schema.sql` L17 |
| `public.states` | `centroid_lng` | `DOUBLE PRECISION` | N/A | `001_initial_schema.sql` L18 |

**Note:** `states.centroid_lat/lng` are scalar coordinates, NOT PostGIS geometry columns. `districts` (Migration 040) has NO geometry columns. Whether these columns actually exist on panIN-staging has not been verified by live query (`UNKNOWN` at runtime level).

---

## Question 2: Is PostGIS enabled?

**Evidence Class: `STATIC_REPOSITORY`** — Established by inspecting migration SQL. Whether PostGIS is actually enabled on panIN-staging is `UNKNOWN` (no live query performed).

`CREATE EXTENSION IF NOT EXISTS postgis;` appears in:
- `001_initial_schema.sql` L8
- `040_canonical_geography_model.sql` L22

PostGIS is generally available on Supabase (pre-enabled). The extension is idempotently created in migrations.

---

## Question 3: What spatial indexes currently exist?

**Evidence Class: `STATIC_REPOSITORY`** — Established by inspecting `CREATE INDEX` statements in migration SQL. Whether these indexes actually exist on panIN-staging is `UNKNOWN` (no live catalog query performed).

| Table | Column | Index Type | Source |
|---|---|---|---|
| `constituencies` | `boundary` | GiST | `001_initial_schema.sql` L39 |
| `mandals` | `centroid` | GiST | `022_administrative_hierarchy.sql` L76 |
| `mandals` | `boundary` | GiST | `022_administrative_hierarchy.sql` L77 |

---

## Question 4: Are any PostGIS spatial functions (ST_*) used in the codebase?

**Evidence Class: `STATIC_REPOSITORY`** — Established by `ripgrep` search across all `.sql`, `.ts`, and `.mjs` files in the repository.

**NO.** Zero occurrences of `ST_Contains`, `ST_Intersects`, `ST_Within`, `ST_Area`, `ST_Transform`, `ST_MakePoint`, `ST_SetSRID`, or any other PostGIS `ST_*` function in any SQL migration, TypeScript, or test file.

The only spatial computation is client-side point-in-polygon in `packages/shared/src/geo/point-in-polygon.ts` (pure TypeScript, no PostGIS). Whether any ST_* functions are registered or used at runtime on panIN-staging outside this repository is `UNKNOWN`.

---

## Question 5: Do geometry columns contain actual data?

**Evidence Class: Mixed — see per-item classification below.**

- **`constituencies.boundary`:** GeoJSON data exists in `data/geo/telangana-assembly.geojson` (14 features for Telangana) [`STATIC_REPOSITORY`]. Whether this data has been loaded into the `constituencies.boundary` column on staging is **`UNKNOWN`** — no migration explicitly populates constituency boundaries, and no live query was performed.

- **`mandals.centroid` / `mandals.boundary`:** Migration 042 creates 12 pilot mandals but does NOT include `INSERT` values for centroid or boundary geometry [`INFERENCE` from `STATIC_REPOSITORY` inspection of migration SQL]. Whether these columns are actually NULL on staging has not been verified by live query — the NULL claim is inferred from absence in the migration INSERT, not from a `SELECT` result.

- **`states.centroid_lat/lng`:** Seed data contains values (e.g., Telangana: 17.385, 78.4867) [`STATIC_REPOSITORY`]. Whether these values are actually present on staging is `UNKNOWN` (no live query).

**Conclusion:** Schema-level geometry columns exist [`STATIC_REPOSITORY`]. Whether they contain actual data on staging is `UNKNOWN` for `constituencies.boundary` and `INFERENCE` (inferred empty) for `mandals.centroid` / `mandals.boundary`. No claim in this section is `STAGING_RUNTIME` evidence.

---

## Question 6: What GeoJSON files are available in the repository?

**Evidence Class: `STATIC_REPOSITORY`** — Established by `fd` file search for `*.geojson` in the repository.

| File | Content |
|---|---|
| `data/geo/telangana-assembly.geojson` | Telangana AC boundary polygons |
| `data/geo/telangana-districts.geojson` | Telangana district boundary polygons |
| `data/geo/telangana-state.geojson` | Telangana state boundary polygon |
| `scripts/*.geojson` (9 files) | Assembly boundaries for Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Puducherry, Sikkim, Tripura, Uttarakhand |

**Quality assessment:** The `scripts/audit-all-geojson.mjs` audit script exists for verifying feature count, acNo integrity, geometry validity, and centroid-scatter detection.

---

## Question 7: What is the current `mandal_constituency_map.overlap_type` state?

**Evidence Class: `INFERENCE`** — Schema structure established from `STATIC_REPOSITORY` (migration SQL). Row-level values (8 rows, all `full`) are inferred from migration 043 SQL INSERT/UPDATE statements. No live `SELECT` query was performed against panIN-staging to confirm actual values.

Inferred values based on migration SQL (post-Migration 043):
- **8 active MCM rows:** All have `overlap_type = 'full'` (after B2 reconciliation corrected previously incorrect `partial` values for rows lacking spatial evidence)
- **Values allowed by schema:** `TEXT` column, no CHECK constraint. Currently only `full` used in migration SQL.
- **Original values included:** `full` and `partial` (from Migration 042), but B2 corrected all to `full` since spatial analysis has not been performed to validate partial overlap claims.

---

## Question 8: Does the `districts` table have geometry columns?

**Evidence Class: `STATIC_REPOSITORY`** — Established by inspecting `040_canonical_geography_model.sql`.

**NO.** The canonical `districts` table (Migration 040, `040_canonical_geography_model.sql` L60-84) has:
- `id UUID PRIMARY KEY`
- `code TEXT`, `name TEXT`, `local_name TEXT`
- `state_code TEXT REFERENCES states(code)`
- `formation_date DATE`, `gazette_reference TEXT`
- `is_current BOOLEAN`, `predecessor_district_id UUID`
- Timestamps

No `boundary`, `centroid`, `area_sq_km`, or any geometry column. District geometry exists in `data/geo/telangana-districts.geojson` but has no target column to be loaded into.

---

## Question 9: What hierarchy levels exist in the schema?

**Evidence Class: `STATIC_REPOSITORY`** — Established by inspecting `CREATE TABLE` statements across all migration files.

| Level | Table | Migration | Current |
|---|---|---|---|
| State | `states` | 001 | ✅ Exists |
| District | `districts` | 040 | ✅ Exists (no geometry) |
| Parliamentary Constituency | `parliamentary_constituencies` | 040 | ✅ Exists |
| Assembly Constituency | `constituencies` | 001 | ✅ Exists (has geometry) |
| Mandal/Block | `mandals` | 022 | ✅ Exists (has geometry, empty) |
| Mandal-Constituency Map | `mandal_constituency_map` | 022 | ✅ Exists (overlap_type only) |
| Polling Booth | `polling_booths` | 022 | ✅ Exists |
| Village/Panchayat | — | — | ❌ Not implemented |
| Ward | — | — | ❌ Not implemented |

---

## Question 10: Are there any H3 hexagonal hierarchy references?

**Evidence Class: `STATIC_REPOSITORY`** — Established by `ripgrep` search across the entire repository.

**NO.** Zero references to H3, h3_index, or hexagonal indexing in any source file (only false positives from HTML `<h3>` tags and package-lock hashes). Whether H3 extensions exist on panIN-staging outside this repository is `UNKNOWN`.

---

## Question 11: What is the current point-in-polygon / spatial containment approach?

**Evidence Class: `STATIC_REPOSITORY`** — Established by inspecting TypeScript source and `ripgrep` search for `ST_*` functions.

Client-side only: `packages/shared/src/geo/point-in-polygon.ts` provides pure TypeScript `pointInPolygon()` and `pointInMultiPolygon()` using the ray-casting algorithm on GeoJSON coordinates. No server-side PostGIS spatial queries exist in the repository.

---

## Question 12: What W016/W017 scope boundaries were established?

**Evidence Class: `STATIC_REPOSITORY`** — Established by inspecting `DECISION_LOG.md` (DEC-063) and prior CTO directives in the repository.

Per DEC-063 (W015 architectural decisions) and prior CTO directives:
- **Zero** PostGIS `ST_Contains` / `ST_Intersects` operations
- **Zero** quantitative overlap percentage calculations
- **Zero** H3 hexagonal references
- **Zero** automated anomaly engines
- **Zero** customer-facing hierarchy traversal APIs

These items were **excluded** from W015 scope and remain in the W016/W017 boundary.

---

## Question 13: What is the current `overlap_percentage` state?

**Evidence Class: `STATIC_REPOSITORY`** — Established by inspecting migration SQL for column definitions. Whether the column exists on panIN-staging is `UNKNOWN` (no live catalog query).

The `mandal_constituency_map` table does NOT have an `overlap_percentage` column in any migration SQL. Only `overlap_type TEXT` exists. The W015 preflight explicitly classified quantitative overlap percentage calculation as "Category D / Deferred" (see `reports/w015_preflight_inspection.json` L35).

---

## Question 14: What polling booth geometry data exists?

**Evidence Class: `STATIC_REPOSITORY` (schema) + `INFERENCE` (data state)** — Schema from migration SQL. The claim that 4 booths are synthetic is inferred from migration 043 SQL; not confirmed by live query.

The `polling_booths` table (Migration 022) has columns for `latitude DOUBLE PRECISION` and `longitude DOUBLE PRECISION` but NO PostGIS geometry column [`STATIC_REPOSITORY`]. The 4 pilot booths on staging are synthetic test fixtures — their coordinates, if any, are test values, not authoritative CEO data [`INFERENCE` from migration SQL].

---

## Question 15: What types/interfaces reference spatial data in application code?

**Evidence Class: `STATIC_REPOSITORY`** — Established by `ripgrep` search and file inspection of `packages/shared/src/types/hierarchy.ts`.

From `packages/shared/src/types/hierarchy.ts`:
- `GeoPoint { latitude: number; longitude: number }` (L170-173)
- `hasBoundary?: boolean` on State, District, PC, AC, Mandal, Booth types
- `centroid?: GeoPoint` on State, District, PC, AC, Mandal types
- `boundary?: GeoJSON.Feature` comment at L170 ("Optional polygon geometry as GeoJSON")

These types define the **application contract** for spatial data. Whether they are populated at runtime is `UNKNOWN` (no live API query performed).

---

## Question 16: What GeoJSON audit/quality tooling exists?

**Evidence Class: `STATIC_REPOSITORY`** — Established by file inspection of `scripts/audit-all-geojson.mjs`.

`scripts/audit-all-geojson.mjs` — Audits GeoJSON files for:
- Feature count vs official count
- `acNo` integrity
- Geometry validity (ring closure, coordinate bounds)
- Centroid-scatter detection (AP-style label/geometry scramble detection)

---

## Question 17: What is the spatial data coverage across all states?

**Evidence Class: `STATIC_REPOSITORY`** — Established by `fd` file search for `*.geojson` files. Whether these files have been loaded into any staging tables is `UNKNOWN`.

| State | AC GeoJSON Available | District GeoJSON | State GeoJSON |
|---|---|---|---|
| Telangana (TS) | ✅ `data/geo/telangana-assembly.geojson` | ✅ `data/geo/telangana-districts.geojson` | ✅ `data/geo/telangana-state.geojson` |
| Andhra Pradesh (AP) | ❌ Not in `data/geo/` | ❌ | ❌ |
| Other states | Partial (9 states in `scripts/*.geojson`) | ❌ | ❌ |

**Coverage assessment:** Only Telangana has complete GeoJSON at all 3 levels (state, district, AC) in the repository. 9 other states have AC-level GeoJSON in `scripts/` (likely imported/sourced but not organized into `data/geo/`). Mandal-level boundary data exists nowhere in the repository. Whether any geometry data exists on panIN-staging beyond what is tracked in this repository is `UNKNOWN`.

---

## Summary: W016 Entry Conditions

| Condition | Status | Evidence Class |
|---|---|---|
| PostGIS extension (in migration SQL) | ✅ Defined | `STATIC_REPOSITORY` |
| PostGIS extension (on staging) | `UNKNOWN` | Not verified |
| Geometry columns (in migration SQL) | ✅ constituencies, mandals | `STATIC_REPOSITORY` |
| Geometry columns (on staging) | `UNKNOWN` | Not verified |
| GiST spatial indexes (in migration SQL) | ✅ Defined | `STATIC_REPOSITORY` |
| GiST spatial indexes (on staging) | `UNKNOWN` | Not verified |
| Actual geometry data loaded on staging | `UNKNOWN` | Not verified — no live query |
| PostGIS spatial functions in repository | ❌ None | `STATIC_REPOSITORY` |
| Overlap quantification column | ❌ Not in migration SQL | `STATIC_REPOSITORY` |
| H3 hexagonal indexing in repository | ❌ Not present | `STATIC_REPOSITORY` |
| Mandal boundary data source | ❌ Not in repository | `STATIC_REPOSITORY` |
| District geometry column | ❌ Not in migration SQL | `STATIC_REPOSITORY` |
| Polling booth PostGIS column | ❌ Not in migration SQL | `STATIC_REPOSITORY` |
| GeoJSON files in repository | ✅ 14 files | `STATIC_REPOSITORY` |

---

```
W016 STATUS:            PREFLIGHT ONLY
W016 IMPLEMENTATION:    NOT AUTHORIZED
CTO REVIEW REQUIRED:    YES — before any implementation authorization
```
