# W016 — Spatial Geometry & Topology Preflight Inspection

**Generated:** 2026-09-23
**Authority:** CTO Directive — W015 Final Governance Closure (Section 13-14)
**Scope:** PREFLIGHT ONLY — Implementation NOT AUTHORIZED
**Source of Truth:** Current repository at HEAD `4d99dd3` (master)

> [!IMPORTANT]
> **W016 IMPLEMENTATION IS NOT AUTHORIZED.**
> This document is a factual inspection of the current state. It does NOT constitute an implementation plan, design proposal, or authorization request.

---

## Question 1: What geometry columns currently exist in the database schema?

| Table | Column | Type | SRID | Source Migration |
|---|---|---|---|---|
| `public.constituencies` | `boundary` | `GEOMETRY(MultiPolygon, 4326)` | 4326 | `001_initial_schema.sql` L31 |
| `public.mandals` | `centroid` | `GEOMETRY(Point, 4326)` | 4326 | `022_administrative_hierarchy.sql` L60 |
| `public.mandals` | `boundary` | `GEOMETRY(MultiPolygon, 4326)` | 4326 | `022_administrative_hierarchy.sql` L61 |
| `public.states` | `centroid_lat` | `DOUBLE PRECISION` | N/A | `001_initial_schema.sql` L17 |
| `public.states` | `centroid_lng` | `DOUBLE PRECISION` | N/A | `001_initial_schema.sql` L18 |

**Note:** `states.centroid_lat/lng` are scalar coordinates, NOT PostGIS geometry columns. `districts` (Migration 040) has NO geometry columns.

---

## Question 2: Is PostGIS enabled?

**YES.** `CREATE EXTENSION IF NOT EXISTS postgis;` appears in:
- `001_initial_schema.sql` L8
- `040_canonical_geography_model.sql` L22

PostGIS is available on Supabase (pre-enabled). The extension is idempotently created.

---

## Question 3: What spatial indexes currently exist?

| Table | Column | Index Type | Source |
|---|---|---|---|
| `constituencies` | `boundary` | GiST | `001_initial_schema.sql` L39 |
| `mandals` | `centroid` | GiST | `022_administrative_hierarchy.sql` L76 |
| `mandals` | `boundary` | GiST | `022_administrative_hierarchy.sql` L77 |

---

## Question 4: Are any PostGIS spatial functions (ST_*) used in the codebase?

**NO.** Zero occurrences of `ST_Contains`, `ST_Intersects`, `ST_Within`, `ST_Area`, `ST_Transform`, `ST_MakePoint`, `ST_SetSRID`, or any other PostGIS `ST_*` function in any SQL migration, TypeScript, or test file.

The only spatial computation is client-side point-in-polygon in `packages/shared/src/geo/point-in-polygon.ts` (pure TypeScript, no PostGIS).

---

## Question 5: Do geometry columns contain actual data?

**Partially.** Assessment per table:

- **`constituencies.boundary`:** GeoJSON data exists in `data/geo/telangana-assembly.geojson` (14 features for Telangana). Whether this data has been loaded into the `constituencies.boundary` column on staging is **UNKNOWN** — no migration explicitly populates constituency boundaries. The seed data in `data/seed/telangana-hierarchy.ts` and constituency TS files contain lat/lng centroids and election data but NOT geometry objects.

- **`mandals.centroid` / `mandals.boundary`:** The Migration 042 that creates 12 pilot mandals does NOT populate centroid or boundary geometry. These columns are **NULL** for all pilot mandals on staging.

- **`states.centroid_lat/lng`:** Populated in seed data (e.g., Telangana: 17.385, 78.4867).

**Conclusion:** Geometry columns exist in schema but are mostly **empty** on staging. Boundary data exists as raw GeoJSON files but has not been ingested into PostGIS columns.

---

## Question 6: What GeoJSON files are available in the repository?

| File | Content |
|---|---|
| `data/geo/telangana-assembly.geojson` | Telangana AC boundary polygons |
| `data/geo/telangana-districts.geojson` | Telangana district boundary polygons |
| `data/geo/telangana-state.geojson` | Telangana state boundary polygon |
| `scripts/*.geojson` (9 files) | Assembly boundaries for Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Puducherry, Sikkim, Tripura, Uttarakhand |

**Quality assessment:** The `scripts/audit-all-geojson.mjs` audit script exists for verifying feature count, acNo integrity, geometry validity, and centroid-scatter detection.

---

## Question 7: What is the current `mandal_constituency_map.overlap_type` state?

Current values in staging (post-Migration 043):
- **8 active MCM rows:** ALL have `overlap_type = 'full'` (after B2 reconciliation corrected previously incorrect `partial` values for rows lacking spatial evidence)
- **Values allowed by schema:** `TEXT` column, no CHECK constraint. Currently only `full` used.
- **Original values included:** `full` and `partial` (from Migration 042), but B2 corrected all to `full` since spatial analysis has not been performed to validate partial overlap claims.

---

## Question 8: Does the `districts` table have geometry columns?

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

**NO.** Zero references to H3, h3_index, or hexagonal indexing in any source file (only false positives from HTML `<h3>` tags and package-lock hashes).

---

## Question 11: What is the current point-in-polygon / spatial containment approach?

Client-side only: `packages/shared/src/geo/point-in-polygon.ts` provides pure TypeScript `pointInPolygon()` and `pointInMultiPolygon()` using the ray-casting algorithm on GeoJSON coordinates. No server-side PostGIS spatial queries exist.

---

## Question 12: What W016/W017 scope boundaries were established?

Per DEC-063 (W015 architectural decisions) and prior CTO directives:
- **Zero** PostGIS `ST_Contains` / `ST_Intersects` operations
- **Zero** quantitative overlap percentage calculations
- **Zero** H3 hexagonal references
- **Zero** automated anomaly engines
- **Zero** customer-facing hierarchy traversal APIs

These items were **excluded** from W015 scope and remain in the W016/W017 boundary.

---

## Question 13: What is the current `overlap_percentage` state?

The `mandal_constituency_map` table does NOT have an `overlap_percentage` column. Only `overlap_type TEXT` exists. The W015 preflight explicitly classified quantitative overlap percentage calculation as "Category D / Deferred" (see `reports/w015_preflight_inspection.json` L35).

---

## Question 14: What polling booth geometry data exists?

The `polling_booths` table (Migration 022) has columns for `latitude DOUBLE PRECISION` and `longitude DOUBLE PRECISION` but NO PostGIS geometry column. The 4 pilot booths on staging are synthetic test fixtures — their coordinates, if any, are test values, not authoritative CEO data.

---

## Question 15: What types/interfaces reference spatial data in application code?

From `packages/shared/src/types/hierarchy.ts`:
- `GeoPoint { latitude: number; longitude: number }` (L170-173)
- `hasBoundary?: boolean` on State, District, PC, AC, Mandal, Booth types
- `centroid?: GeoPoint` on State, District, PC, AC, Mandal types
- `boundary?: GeoJSON.Feature` comment at L170 ("Optional polygon geometry as GeoJSON")

These types define the **application contract** for spatial data but are currently unpopulated or partially populated.

---

## Question 16: What GeoJSON audit/quality tooling exists?

`scripts/audit-all-geojson.mjs` — Audits GeoJSON files for:
- Feature count vs official count
- `acNo` integrity
- Geometry validity (ring closure, coordinate bounds)
- Centroid-scatter detection (AP-style label/geometry scramble detection)

---

## Question 17: What is the spatial data coverage across all states?

| State | AC GeoJSON Available | District GeoJSON | State GeoJSON |
|---|---|---|---|
| Telangana (TS) | ✅ `data/geo/telangana-assembly.geojson` | ✅ `data/geo/telangana-districts.geojson` | ✅ `data/geo/telangana-state.geojson` |
| Andhra Pradesh (AP) | ❌ Not in `data/geo/` | ❌ | ❌ |
| Other states | Partial (9 states in `scripts/*.geojson`) | ❌ | ❌ |

**Coverage assessment:** Only Telangana has complete GeoJSON at all 3 levels (state, district, AC). 9 other states have AC-level GeoJSON in `scripts/` (likely imported/sourced but not organized into `data/geo/`). Mandal-level boundary data exists nowhere in the repository.

---

## Summary: W016 Entry Conditions

| Condition | Status |
|---|---|
| PostGIS extension | ✅ Available |
| Geometry columns in schema | ✅ constituencies, mandals (but empty on staging) |
| GiST spatial indexes | ✅ Defined (on constituencies, mandals) |
| Actual geometry data loaded | ⚠️ Partial (states centroid only; constituency/mandal boundaries empty) |
| PostGIS spatial functions used | ❌ None |
| Overlap quantification | ❌ Not implemented (overlap_type only) |
| H3 hexagonal indexing | ❌ Not present |
| Mandal boundary data source | ❌ Not available in repository |
| District geometry column | ❌ Not in schema |
| Polling booth geometry column | ❌ Not in schema (scalar lat/lng only) |

---

```
W016 STATUS:            PREFLIGHT ONLY
W016 IMPLEMENTATION:    NOT AUTHORIZED
CTO REVIEW REQUIRED:    YES — before any implementation authorization
```
