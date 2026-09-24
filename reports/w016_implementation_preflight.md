# W016 — Spatial Geography / Spatial Relationship Foundation
## Implementation Preflight & Design Authorization Package

**Document ID:** `REPORT-W016-PREFLIGHT-DESIGN-v1.0`
**Generated:** 2026-09-24
**Authority:** CTO Directive — W016 Implementation Preflight / Design Package
**Current Lifecycle State:**
- `W015` = ACCEPTED / COMPLETE (Commit `3748e46`, Governance Commit `4d99dd3`)
- `W016 PREFLIGHT` = SUBMITTED_FOR_CTO_REVIEW (Evidence Baseline `c4fb948`)
- `W016 IMPLEMENTATION` = **NOT AUTHORIZED**
- `PRODUCTION` = **STRICTLY UNTOUCHED**

---

> [!IMPORTANT]
> **W016 IMPLEMENTATION IS STRICTLY UNAUTHORIZED.**
> This package is a technical design, architectural reconciliation, source acquisition plan, and authorization-preparation instrument.
> It does **NOT** authorize, execute, or implement database migrations, application changes, spatial API additions, geometry ingestion, or production mutations.

---

## 1. Executive Summary

Master Job **W016 (Spatial Geography & Topology Foundation)** is the fourth phase of the territorial data architecture (following W013 Canonical Geography, W014 Temporal Delimitation Graph, and W015 Geography Relationship Engine). Where W015 established relational foreign keys and discrete containment semantics (`parent`, `child`, `contains`, `part-of`, `predecessor`, `successor`, `old-to-new`) for bounded entities, W016 addresses the physical geometric layer: how actual polygon, multipolygon, and point geometries are acquired, validated, versioned, indexed, and evaluated in PostgreSQL/PostGIS.

### Key Preflight Findings

1. **PostGIS Infrastructure is Present but Inactive in Core Application Logic:**
   - PostGIS extension creation is specified in migrations (`001_initial_schema.sql` L8, `040_canonical_geography_model.sql` L22).
   - Geometry columns exist on `constituencies` (`boundary MultiPolygon, 4326`) and `mandals` (`centroid Point, 4326`, `boundary MultiPolygon, 4326`), with corresponding GiST indexes.
   - However, **zero** PostGIS spatial functions (`ST_Contains`, `ST_Intersects`, `ST_Within`, `ST_Area`, `ST_DWithin`) are executed anywhere in application code, backend routes, or test suites (`STATIC_REPOSITORY`).
   - The current constituency locating endpoint (`/constituencies/locate` in `apps/api/src/routes/constituencies.ts`) bypasses the database entirely, reading a static GeoJSON file into Node.js process memory on startup and evaluating points via client-side ray-casting.

2. **Geometry Data is Unpopulated in Staging Database:**
   - Neither Migration 042 nor Migration 043 populated geometry values for the 12 pilot mandals (`INFERENCE`: columns remain `NULL`).
   - `districts` (Migration 040) and `parliamentary_constituencies` (Migration 040) have **no geometry columns** in schema.
   - Temporal version tables (`constituency_versions`, `district_versions`) from W014 have **no geometry columns**.

3. **Current Repository Geometry is Crowdsourced (`UNVERIFIED`):**
   - Boundary GeoJSON in `data/geo/` originates from `datta07/INDIAN-SHAPEFILES` (GitHub community project), formally registered in Migration 039 under `datta07_shapefiles` with status `UNVERIFIED`.
   - Quality auditing via `scripts/audit-all-geojson.mjs` proves that **12 out of 31 states** currently have severe structural errors in their GeoJSON assets (duplicate `acNo`, out-of-range IDs, missing seats). Only 19/31 states are clean (Telangana is clean with 119/119 seats).
   - Authoritative Survey of India (SOI) / Election Commission of India (ECI) official geometry has not been acquired or ingested.

4. **Strict Scope Quarantine:**
   - W016 must be bounded strictly to: (a) geometry storage schema alignment, (b) authoritative source acquisition & quality gates, (c) geometry ingestion for pilot geographies, (d) spatial index activation, and (e) validation of physical containment against W015 relational mappings.
   - Spatial APIs, boundary diff RPCs, vector tile generation, MapLibre frontend map integration belong to **W017**.
   - Quantitative overlap percentages, complex polygon mesh healing, PostGIS topology graphs, and H3 hexagonal indexing are **DEFERRED**.

---

## 2. W016 Master Requirements

The master requirements are derived directly from the authoritative repository sources:
- `reports/w010_geography_contamination_guard.md` (Section 4: Master Jobs W013–W017 Mapping)
- `DEFECT_REGISTER.md` (DEF-006: Versioned Geography Tables)
- `reports/w014_preflight_inspection_report.md` (Section 8: Architectural Boundaries)
- `reports/w015_preflight_inspection_report.md` (Section 11: Prohibition of Spatial Inference)
- `DECISION_LOG.md` (DEC-063: W015 Architectural Invariants)

| Requirement ID | Master Requirement Description | Authoritative Source |
|---|---|---|
| **REQ-W016-01** | **Canonical Geometry Storage Schema:** Attach PostGIS geometry (`GEOMETRY(Geometry, 4326)`) to canonical geography entities with strict coordinate reference system (EPSG:4326 / WGS84). | `reports/w010_geography_contamination_guard.md` |
| **REQ-W016-02** | **Geometry Data Governance & Provenance:** Every stored geometry must link to a W012 `provenance_records` row tracking source authority, source artifact, retrieval timestamp, transformation history, and verification status (`data_status_enum`). | `039_data_governance_foundation.sql`, W012 Directive |
| **REQ-W016-03** | **Temporal Geometry Alignment:** Geometry must reconcile with W014 temporal validity (`valid_from`, `valid_to`, `is_current`) and entity lineage without creating a duplicate temporal or lineage architecture. | `reports/w014_preflight_inspection_report.md` |
| **REQ-W016-04** | **Scenario & Delimitation Isolation:** Proposed or future delimitation boundaries (e.g. 2026 projections) must be strictly partitioned from current legal geography and never returned in default queries. | `reports/w010_geography_contamination_guard.md`, `011_delimitation.sql` |
| **REQ-W016-05** | **PostGIS Spatial Indexing:** Active geometry columns must be indexed with Generalized Search Trees (GiST) with 2D bounding-box support for performant spatial bounding queries. | `001_initial_schema.sql`, `022_administrative_hierarchy.sql` |
| **REQ-W016-06** | **Authoritative Source Acquisition & Quality Gates:** External spatial assets must pass formal OGC validity gates (ring closure, self-intersection, coordinate sanity, feature count) before database ingestion. | `scripts/audit-all-geojson.mjs`, CTO Directive |
| **REQ-W016-07** | **Physical Containment & Ground Truth Verification:** Evaluate PostGIS spatial operators (`ST_Contains`, `ST_Intersects`) against geometry to ground truth W015 relational mappings (`mandal_constituency_map`). | `reports/w015_preflight_inspection_report.md` |
| **REQ-W016-08** | **Mobile Bundle & App-Size Quarantine:** Raw spatial geometry payloads must not be bundled into the client application binary; dynamic spatial data must be served remotely or cached on demand. | Performance Phase 3, `apps/mobile/lib/remoteGeoLoader.ts` |

---

## 3. Current Source-of-Truth Inventory

| Layer / Domain | Canonical Artifact(s) | Current State | Authoritative Status |
|---|---|---|---|
| **Data Governance Foundation** | `supabase/migrations/039_data_governance_foundation.sql` | Data sources, datasets, dataset versions, provenance records, data status enum. | ACCEPTED (W012) |
| **Canonical Geography Schema** | `supabase/migrations/040_canonical_geography_model.sql` | `districts`, `parliamentary_constituencies`, ECI 2008 Delimitation source registration. | ACCEPTED (W013) |
| **Temporal Geography Schema** | `supabase/migrations/041_temporal_geography_model.sql` | `state_versions`, `district_versions`, `constituency_versions`, `geography_entity_lineage`. | ACCEPTED (W014) |
| **Geography Relationship Engine** | `supabase/migrations/042_geography_relationship_engine.sql`, `043_authoritative_source_reconciliation.sql` | `mandals` with `district_id`, `mandal_constituency_map` with `constituency_internal_id`, `polling_booths`, Mancherial-Hajipur split lineage. | ACCEPTED (W015) |
| **Shared Geo Utilities** | `packages/shared/src/geo/point-in-polygon.ts` | Ray-casting point-in-polygon (`pointInPolygon`, `pointInMultiPolygon`, `findConstituencyAtPoint`). | ACTIVE (Shared) |
| **Backend Geo Routes** | `apps/api/src/routes/geo.ts`, `apps/api/src/routes/constituencies.ts` | In-memory GeoJSON locating at `/constituencies/locate`, static file serving at `/geo/:file`. | ACTIVE (Fastify) |
| **Mobile Geo Streaming** | `apps/mobile/lib/geoLoader.ts`, `apps/mobile/lib/remoteGeoLoader.ts`, `apps/mobile/lib/geoManifest.ts` | On-demand remote streaming of per-state GeoJSON to device cache with ring sanitization. | ACTIVE (Mobile) |
| **Quality Audit Scripts** | `scripts/audit-all-geojson.mjs` | Feature count, `acNo` duplicate/missing checks, ring validity, coordinate finite checks, scatter detection. | AUDIT (Scripts) |
| **Spatial Raw Data** | `data/geo/*.geojson` | Telangana AC (119 seats, 120 features), District (33 features), State boundary. | `UNVERIFIED` (`datta07`) |

---

## 4. Current Geometry Inventory

Authoritative inventory of all geography entities in schema/repository:

| Entity Level | Table Name | Geometry Column(s) | Geometry Type | SRID | Spatial Index | Geometry Source | Current Population Status | Temporal Support | Scenario Support | Provenance Support | Quality Validation | Evidence Class |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **State** | `public.states` | `centroid_lat`, `centroid_lng` | Scalar float (not PostGIS) | N/A | None | Seed data (`data/seed/`) | Populated (1 state) | None | None | None | None | `STATIC_REPOSITORY` |
| **District** | `public.districts` | None | None | N/A | None | `telangana-districts.geojson` (unloaded) | Unpopulated (0 columns) | Via `district_versions` | None | None | None | `STATIC_REPOSITORY` |
| **Parliamentary Constituency** | `public.parliamentary_constituencies` | None | None | N/A | None | None in repo | Unpopulated (0 columns) | Via `pc_versions` | None | None | None | `STATIC_REPOSITORY` |
| **Assembly Constituency** | `public.constituencies` | `boundary` | `MultiPolygon` | 4326 | GiST (`idx_constituencies_boundary`) | `telangana-assembly.geojson` | `UNKNOWN` on staging; in-memory in API | Via `constituency_versions` | Separate table (`proposed_constituencies`) | Via `record_provenance` (Migration 039) | `audit-all-geojson.mjs` (TS clean) | `STATIC_REPOSITORY` |
| **Mandal** | `public.mandals` | `centroid`, `boundary` | `Point`, `MultiPolygon` | 4326 | GiST (`idx_mandals_centroid`, `idx_mandals_boundary`) | None in repo | Inferred `NULL` (Migration 042/043 lack geometry inserts) | None | None | Via `provenance_records` (26 records) | None | `INFERENCE` / `STATIC_REPOSITORY` |
| **Polling Booth** | `public.polling_booths` | `latitude`, `longitude` | Scalar float (not PostGIS) | N/A | BTree | Synthetic test fixtures | Populated (4 test rows) | None | None | `synthetic_test_fixture` (Migration 043) | Fixture check | `STATIC_REPOSITORY` |
| **Proposed Constituency** | `public.proposed_constituencies` | `boundary` | `JSONB` (GeoJSON) | N/A | None | Scenario simulation | Populated (simulations) | Via `scenario_id` | Isolated table | Via scenario metadata | None | `STATIC_REPOSITORY` |
| **Gram Panchayat** | None | None | None | N/A | None | None | Unimplemented | None | None | None | None | `STATIC_REPOSITORY` |
| **Village / Ward** | None | None | None | N/A | None | None | Unimplemented | None | None | None | None | `STATIC_REPOSITORY` |

---

## 5. Geometry Source-of-Truth Model

To comply with the Master Execution Framework and prevent synthetic or unverified spatial data from polluting the canonical database, every geometry loaded into Kshetra must adhere to the following evidence specification:

```
[Authoritative Source Authority]
              │
              ▼
   [Source Artifact File] ──► (Hash: SHA-256)
              │
              ▼
   [Dataset & Dataset Version Registration] (W012)
              │
              ▼
    [Ingestion Transformation Pipeline] (Logged)
              │
              ▼
   [PostGIS Geometry Column] + [Provenance Record Linkage] (UNVERIFIED)
```

### Required Source Model Attributes

For each geography level:
1. **Authoritative Source:** The legal publishing entity (e.g., `survey_of_india`, `election_commission_india`, `telangana_tgrac`, `datta07_shapefiles`).
2. **Source Artifact:** Specific downloadable archive, shapefile bundle, or GeoJSON document with filename and cryptographic hash (`sha256`).
3. **Source Identifier:** The unique identifier used in the source artifact (e.g., `AC_NO`, `LGD_CODE`, `CENSUS_2011_CODE`).
4. **Retrieval Date:** ISO 8601 timestamp of when the file was fetched.
5. **Effective Date:** Legal date on which the boundary took statutory effect (e.g., `2008-01-01` for ECI 2008 Delimitation; `2016-10-11` for Telangana district reorganization).
6. **Dataset Version:** W012 dataset version identifier (e.g., `geo_assembly_boundaries_v2008`).
7. **Transformation History:** Recorded pipeline steps (e.g., `shapefile_to_geojson`, `sliver_filter`, `srid_transform_4326`, `ogc_make_valid`).
8. **Initial Geometry Status:** Strictly `UNVERIFIED` per W012 rules until formal field or gazette cross-verification.

> [!CAUTION]
> **Anti-Promotion Invariant:** Sourcing a boundary file from an official government web portal does **NOT** automatically grant it `OFFICIAL` status. The data must be registered under its actual source provenance and remain `UNVERIFIED` until verified against statutory gazette orders and official cartographic benchmarks.

---

## 6. Geometry Status Model

W016 adopts the 8-state `data_status_enum` established in Migration 039 (`039_data_governance_foundation.sql` L33-42):

```sql
CREATE TYPE public.data_status_enum AS ENUM (
  'OFFICIAL',
  'VERIFIED',
  'DERIVED',
  'ESTIMATE',
  'SCENARIO',
  'INFERRED',
  'UNVERIFIED',
  'UNKNOWN'
);
```

### Application to Spatial Geometries

| Status Value | Strict Semantic in W016 Geometry | Current Repository Footprint |
|---|---|---|
| `OFFICIAL` | Digitized directly from official Survey of India (SOI) or Election Commission of India (ECI) certified vector releases with gazette alignment. | **0 records** (None currently exist) |
| `VERIFIED` | Third-party or state agency boundaries cross-verified against official gazette descriptions and boundary monument coordinates. | **0 records** |
| `DERIVED` | Geometry produced by deterministic topological operations (e.g. state boundary computed via `ST_Union` of constituent AC boundaries). | **0 records** |
| `ESTIMATE` | Simplified or generalized polygon geometries intended for low-bandwidth mobile display (e.g., Visvalingam-Whyatt simplified GeoJSON). | Mobile assets (`apps/mobile/data/`) |
| `SCENARIO` | Hypothetical, unratified, or projected boundaries (e.g., proposed 2026 delimitation maps in `proposed_constituencies`). | Simulation fixtures only |
| `INFERRED` | Approximated boundaries calculated from point data (e.g., Voronoi polygons around polling booths). | **0 records** |
| `UNVERIFIED` | Default status for external community GIS data (e.g., `datta07_shapefiles` GeoJSON in `data/geo/`). | All 119 Telangana AC boundaries |
| `UNKNOWN` | Entity exists in relational hierarchy, but no spatial boundary or coordinate is available (`NULL` geometry). | All 12 pilot mandals |

**Sufficiency Assessment:** The existing W012 `data_status_enum` is **100% SUFFICIENT**. No new enum values (such as `PURGED` or `GEOMETRIC`) are needed or permitted.

---

## 7. Temporal Geometry Architecture

W016 must reconcile with the temporal architecture implemented in W014 (Migration 041) without introducing a parallel temporal engine.

```
           W014 Temporal Entities
      ┌──────────────────────────────┐
      │     constituency_versions    │
      │  - entity_id (UUID)          │
      │  - valid_from (DATE)         │
      │  - valid_to (DATE)           │
      │  - is_current (BOOLEAN)      │
      └──────────────┬───────────────┘
                     │ 1:1 or 1:N
                     ▼
          W016 Spatial Attachment
      ┌──────────────────────────────┐
      │   Versioned Geometry Layer   │
      │  - geometry (MultiPolygon)   │
      │  - srid (4326)               │
      │  - status (UNVERIFIED)       │
      │  - provenance_id (UUID)      │
      └──────────────────────────────┘
```

### Temporal Rules for W016

1. **Geometry Binds to Version, Not Bare Entity:**
   When an Assembly Constituency boundary changes (e.g. across Delimitation 1976 vs Delimitation 2008), the physical geometry belongs to the specific temporal version (`constituency_versions`), not the unversioned entity anchor.
2. **Current Boundary Identification:**
   Queries for "current map" must evaluate:
   ```sql
   WHERE is_current = true AND valid_to IS NULL
   ```
   or join against the active delimitation regime (`delimitation_regimes.is_active = true`).
3. **Lineage Transition Relationship:**
   When W014 records a transition in `geography_entity_lineage` (e.g., `transition_type = 'split'` for Mancherial $\to$ Hajipur on `2016-10-11`):
   - The predecessor entity geometry covers the pre-split spatial extent (`valid_to = '2016-10-11'`).
   - The successor entities have geometries covering the post-split sub-extents (`valid_from = '2016-10-11'`).
   - **Critical Rule:** Spatial intersection must **NEVER** be used alone to infer historical or political succession. Historical succession is strictly statutory and governed by `geography_entity_lineage`.

---

## 8. Scenario & Future Geometry Isolation

Kshetra supports delimitation modeling (e.g., analyzing the impact of potential 2026 electoral redistricting). Scenario geometry represents unratified projections.

### Required Isolation Safeguards

1. **Table-Level Partitioning:**
   - Canonical legal geometry lives in `constituencies.boundary` / `constituency_versions.boundary`.
   - Scenario geometry is quarantined in `public.proposed_constituencies` (`boundary JSONB`).
2. **Status Flag Enforcement:**
   - Any scenario-derived spatial record must carry `data_status_enum = 'SCENARIO'`.
3. **Query Guardrail:**
   - All canonical spatial lookup queries, map views, and APIs must enforce:
     ```sql
     WHERE status != 'SCENARIO'
     ```
     or query strictly from canonical geography tables.
4. **Foreign Key Constraint:**
   - Scenario entities must reference `delimitation_scenarios(id)` with `ON DELETE CASCADE`.

---

## 9. Spatial Relationship Semantics

Not all spatial operations belong in W016. Below is the semantic classification of spatial relationships:

| Spatial Operator | PostGIS Function | Explicitly Required in W016? | Already in W015? | Requires Geometry? | Requires PostGIS? | Destination Job | Evidence Required | Acceptance Test |
|---|---|---|---|---|---|---|---|---|
| **Geometry Validity** | `ST_IsValid(geom)` | **YES** (Quality Gate) | No | Yes | Yes | **W016** | OGC compliance report | `TEST-W016-02` |
| **Point-in-Polygon (Locate)** | `ST_Contains(geom, pt)` | **YES** (Backend Grounding) | Partial (Client TS) | Yes | Yes | **W016** | Latitude/Longitude point + AC polygon | `TEST-W016-04` |
| **Discrete Containment** | `ST_Contains(ac, mandal)` | **YES** (Verify MCM) | Relational only (`full`) | Yes | Yes | **W016** | Mandal boundary + AC boundary | `TEST-W016-05` |
| **Spatial Overlap** | `ST_Intersects(ac, mandal)` | **YES** (Verify MCM) | Relational only (`partial`) | Yes | Yes | **W016** | Polygon intersection > 0 | `TEST-W016-05` |
| **Centroid Computation** | `ST_Centroid(geom)` | **YES** (Point placement) | Seed data (scalar) | Yes | Yes | **W016** | Bounding box center | `TEST-W016-01` |
| **Boundary Adjacency** | `ST_Touches(geom1, geom2)` | No | No | Yes | Yes | **W017** | Shared boundary line | Deferred to W017 |
| **Proximity / Distance** | `ST_DWithin(geom, pt, dist)` | No | No | Yes | Yes | **W017** | Metric projection (EPSG:3857) | Deferred to W017 |
| **Quantitative Overlap %** | `ST_Area(ST_Intersection)/ST_Area` | **NO** (Strictly Quarantined) | Explicitly excluded | Yes | Yes | **W017** | Projected metric area calculation | Deferred to W017 |
| **Boundary Diff / Evolution** | `ST_Difference(v1, v2)` | **NO** (Quarantined) | No | Yes | Yes | **W017** | Multi-cycle version polygons | Deferred to W017 |
| **Topological Mesh / Topology** | `postgis_topology` | **NO** (Quarantined) | No | Yes | Yes | **DEFERRED** | Node-edge graph | Deferred |
| **Hexagonal Indexing** | H3 (`h3-js`, `pg-h3`) | **NO** (Quarantined) | No | Yes | Extension | **DEFERRED** | Hex cell resolution mapping | Deferred |

---

## 10. W015 / W016 / W017 Architectural Boundary Matrix

To prevent overlapping scope or circular refactoring, capabilities are strictly partitioned:

| Capability | W015 (Relationship) | W016 (Spatial Foundation) | W017 (Spatial Gateway & Maps) | Deferred / Future |
|---|---|---|---|---|
| **Parent/Child & Part-Of Hierarchy** | **IMPLEMENTED** (Relational FKs) | Read-only verification | Read-only consumption | - |
| **Predecessor / Successor Lineage** | **IMPLEMENTED** (Migration 041/043) | Read-only verification | Read-only consumption | - |
| **Discrete Overlap State (`full`/`partial`)** | **IMPLEMENTED** (`overlap_type`) | Verify against geometry | Read-only consumption | - |
| **PostGIS Geometry Columns & GiST** | Excluded | **AUTHORIZATION SCOPE** | Schema consumers | - |
| **OGC Geometry Ingestion & Validity** | Excluded | **AUTHORIZATION SCOPE** | Consumer | - |
| **Spatial Point-in-Polygon Grounding** | Excluded | **AUTHORIZATION SCOPE** | API expose | - |
| **Spatial Containment of Mandals in AC** | Excluded | **AUTHORIZATION SCOPE** (Pilot) | Bulk national run | - |
| **Spatial Query RPCs & Boundary Diff** | Excluded | Excluded | **PRIMARY SCOPE** | - |
| **Quantitative Overlap Percentages** | Excluded | Excluded | **PRIMARY SCOPE** | - |
| **Frontend Map Rendering & Layering** | Excluded | Excluded | **PRIMARY SCOPE** | - |
| **Vector Tile Pipeline (MVT / Tippecanoe)** | Excluded | Excluded | **PRIMARY SCOPE** | - |
| **H3 Hexagonal Hierarchical Indexing** | Excluded | Excluded | Excluded | **DEFERRED** |
| **Automated Mesh & Sliver Healing** | Excluded | Excluded | Excluded | **DEFERRED** |

---

## 11. Existing PostGIS Infrastructure Assessment

Detailed audit of the repository's existing spatial code and database definitions:

| Component | Repository Location | Defined Purpose | Actually Used in Code? | Staging Runtime Verified? | W016 Relevance |
|---|---|---|---|---|---|
| **PostGIS Extension** | `001_initial_schema.sql` L8, `040_canonical_geography_model.sql` L22 | Spatial engine enablement | No (0 queries) | `UNKNOWN` (No live query) | Foundational dependency |
| **Constituencies Boundary** | `constituencies.boundary GEOMETRY(MultiPolygon, 4326)` | Storing AC boundaries | No (In-memory GeoJSON used) | `UNKNOWN` | Target column for AC geometry |
| **Constituencies Spatial Index** | `idx_constituencies_boundary USING GIST` | Spatial bounding box search | No | `UNKNOWN` | Target index for spatial lookups |
| **Mandals Centroid** | `mandals.centroid GEOMETRY(Point, 4326)` | Mandal headquarters point | No | Inferred `NULL` | Target column for mandal points |
| **Mandals Boundary** | `mandals.boundary GEOMETRY(MultiPolygon, 4326)` | Mandal administrative boundary | No | Inferred `NULL` | Target column for mandal geometry |
| **Mandals Spatial Indexes** | `idx_mandals_centroid`, `idx_mandals_boundary` | Spatial bounding box search | No | `UNKNOWN` | Target indexes for mandals |
| **Polling Booth Lat/Lng** | `polling_booths.latitude/longitude` | Booth GPS coordinates | Yes (Scalar reads) | Populated (4 test rows) | Candidate for `ST_MakePoint` |
| **Client Point-in-Polygon** | `packages/shared/src/geo/point-in-polygon.ts` | Ray-casting point search | Yes (Node.js API & Mobile) | Verified (Unit tests) | Current fallback implementation |
| **Static Geo Serving** | `apps/api/src/routes/geo.ts` | Serves GeoJSON files | Yes (Fastify `/geo/*`) | Verified (API tests) | Mobile boundary distribution |
| **Remote Geo Loader** | `apps/mobile/lib/remoteGeoLoader.ts` | Downloads & caches per-state GeoJSON | Yes (React Native) | Verified (Mobile client) | Client-side boundary cache |

---

## 12. Geometry Quality Engineering & Gates

Before any external geometry is written to the database, it must pass a deterministic series of Quality Gates:

```
[External Vector Asset]
         │
         ▼
[GATE-GEO-01: SRID 4326 & Coordinate Bounds] ────────► FAIL: REJECT
         │ PASS
         ▼
[GATE-GEO-02: Geometry Type Strictness] ──────────────► FAIL: REJECT
         │ PASS
         ▼
[GATE-GEO-03: Ring Closure & Minimum Points] ─────────► FAIL: REJECT
         │ PASS
         ▼
[GATE-GEO-04: OGC Simple Feature Validity] ───────────► FAIL: REJECT
         │ PASS
         ▼
[GATE-GEO-05: Non-Empty / Non-Null] ──────────────────► FAIL: REJECT
         │ PASS
         ▼
[GATE-GEO-06: Entity Count & Identifier Match] ───────► FAIL: REJECT
         │ PASS
         ▼
[GATE-GEO-07: Centroid-Scatter Drift Detection] ──────► WARN / QUARANTINE
         │ PASS
         ▼
[GATE-GEO-08: Micro-Sliver / Spike Detection] ────────► WARN / LOG
         │ PASS
         ▼
    [APPROVED FOR STAGING INGESTION]
```

### Detailed Gate Specifications

| Gate ID | Gate Name | Technical Check | Severity | Justification |
|---|---|---|---|---|
| **GATE-GEO-01** | **SRID & Coordinate Bounds** | Lon $\in [-180, 180]$, Lat $\in [-90, 90]$; India bounding box: Lon $[68.0, 98.0]$, Lat $[6.0, 38.0]$. | **REQUIRED** | Prevents inverted coordinates (lat/lng flip) and invalid projections. |
| **GATE-GEO-02** | **Geometry Type Strictness** | Boundary columns must accept only `MultiPolygon` (or `Polygon` coerced to `MultiPolygon`). Centroid must accept only `Point`. | **REQUIRED** | Prevents heterogeneous geometry collections from breaking GiST indexes. |
| **GATE-GEO-03** | **Ring Closure & Minimum Points** | Linear rings must have $\ge 4$ coordinate pairs; first coordinate must exactly match last coordinate. | **REQUIRED** | MapLibre native crashes on degenerate rings; OGC standard compliance. |
| **GATE-GEO-04** | **OGC Validity** | `ST_IsValid(geom) = true`. Must report `ST_IsValidReason(geom)` on failure (zero self-intersections, bowties, or unclosed rings). | **REQUIRED** | Invalid geometries cause PostGIS index scans and spatial joins to fail or crash. |
| **GATE-GEO-05** | **Non-Empty / Non-Null** | `ST_IsEmpty(geom) = false` and `geom IS NOT NULL`. | **REQUIRED** | Prevents zero-point features or empty collections from occupying active rows. |
| **GATE-GEO-06** | **Entity Count & ID Match** | Number of features in file matches expected seats/mandals; all statutory IDs match canonical catalog. | **REQUIRED** | Prevents misattributed boundaries (e.g. `audit-all-geojson.mjs` found Gujarat has 165/182 seats). |
| **GATE-GEO-07** | **Centroid-Scatter Drift** | Distance from feature centroid to state median centroid must not exceed 90th percentile threshold $\times 1.8$ (min 1.2°). | **SUPPORTING** | Detects AP-style label/geometry scrambles where AC polygons are transposed. |
| **GATE-GEO-08** | **Micro-Sliver / Spike Detection** | Polygons with area $< 1,000 \text{ m}^2$ or aspect ratio $> 100:1$ flagged. | **SUPPORTING** | Identifies digitizing artifacts and CAD boundary slivers. |
| **GATE-GEO-09** | **Automated Topology Healing** | `ST_MakeValid` or snap-to-grid healing. | **DEFERRED** | Modifies legal boundaries without statutory authority; quarantined. |

---

## 13. Authoritative Source Acquisition Plan

| Geography Level | Preferred Authority (Plan A) | Alternative Official (Plan B) | Fallback Repository Path (Plan C) | Acquisition Method | Transformation Required | Expected Difficulty |
|---|---|---|---|---|---|---|
| **States** | Survey of India (SOI) Open Data Portal (`onlinemaps.surveyofindia.gov.in`) | National Informatics Centre (NIC) GIS Portal | `data/geo/telangana-state.geojson` | Direct download / Public RTI | GeoJSON conversion, WGS84 reprojection | Low |
| **Districts** | Survey of India (SOI) / State Revenue Dept Gazette | State Spatial Data Infrastructure (TGRAC / TS-SDI) | `data/geo/telangana-districts.geojson` | State SDI download / Public portal | Merge 33 districts; reconcile post-2016 boundaries | Medium |
| **Assembly Constituencies** | Election Commission of India (ECI) / CEO State Portal | State Remote Sensing Applications Centre (TRAC) | `data/geo/telangana-assembly.geojson` (`datta07`) | CEO GIS Portal / Electoral Roll Maps | Quality gate audit, coerce to MultiPolygon | Medium |
| **Parliamentary Constituencies** | Election Commission of India (ECI) Delimitation Order 2008 | SOI Parliamentary boundaries | Topological union of constituent ACs (`DERIVED`) | ECI Atlas extraction or `ST_Union` of ACs | `ST_Union` with statutory boundary check | Medium |
| **Mandals / Tehsils** | Office of the Chief Commissioner of Land Administration (CCLA) / TRAC | Ministry of Panchayati Raj (MoPR) LGD GIS layer | `UNKNOWN` (No mandal boundaries in repo) | State Land Records portal request / TRAC spatial layer | LGD code matching, topological polygon validation | **HIGH (Blocker for Mandal Boundaries)** |
| **Polling Stations / Booths** | CEO Telangana Polling Station Maps (`ceotelangana.nic.in`) | ECI GIS Polling Station Portal | Synthetic test fixtures (4 pilot booths in Migration 043) | CEO electoral list geocoding / GPS capture | Point coordinate verification (`EPSG:4326`) | Medium |

---

## 14. Schema Gap Analysis

Inspection of current schema against W016 requirements:

| Entity Table | Current Geometry Column | Missing Column / Structural Gap | Minimum Required Schema Change (if Authorized) | Justification |
|---|---|---|---|---|
| `public.constituencies` | `boundary MultiPolygon, 4326` | None for spatial boundary. | **NO CHANGE REQUIRED** | Existing column and GiST index are structurally sufficient. |
| `public.mandals` | `centroid Point`, `boundary MultiPolygon` | None for spatial columns. | **NO CHANGE REQUIRED** | Existing columns and GiST indexes are structurally sufficient. |
| `public.districts` | None | Lacks `boundary GEOMETRY(MultiPolygon, 4326)` and GiST index. | Add `boundary GEOMETRY(MultiPolygon, 4326)` + GiST index **IF** district spatial queries authorized. | Cannot perform district-level bounding or map queries without column. |
| `public.parliamentary_constituencies` | None | Lacks `boundary GEOMETRY(MultiPolygon, 4326)` and GiST index. | Defer to W017 or derive from ACs. | PC boundaries are statutory unions of ACs under Delimitation Order 2008. |
| `public.polling_booths` | `latitude`, `longitude` (scalar) | Lacks PostGIS `location GEOMETRY(Point, 4326)`. | Generated column `location GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) STORED` **IF** authorized. | Enables PostGIS index scans without breaking existing scalar coordinates. |
| `public.mandal_constituency_map` | `overlap_type TEXT` | Lacks `overlap_geometry GEOMETRY(MultiPolygon, 4326)`. | **DO NOT ADD** (Quarantined to W017). | Discrete `overlap_type` is sufficient for W016. |

---

## 15. API Boundary Analysis

Does W016 require Fastify backend or API route changes?

| User / Client Need | Domain Operation | Authorization Required | Existing Path | Gap in Current Path | Minimum Required Change |
|---|---|---|---|---|---|
| **Locate Constituency by GPS** | Point-in-polygon lookup | Public (Anonymous) | `GET /constituencies/locate?lat=&lng=` | Loads static GeoJSON file into memory on startup; does not use PostGIS or database. | **Optional in W016** (Can remain on in-memory GeoJSON, or migrate to PostgREST RPC `locate_constituency`). |
| **Fetch State Boundaries for Map** | Static GeoJSON delivery | Public (Anonymous) | `GET /geo/:file` | Serves static files from `apps/api/public/geo/`. | **NO CHANGE REQUIRED** (Working as designed). |
| **Admin Spatial Verification** | Spatial integrity check | Admin / Service Role | None (Ad-hoc scripts) | No database verification RPC. | PostgREST internal verification function or automated test suite script. |

**Conclusion:** W016 **DOES NOT REQUIRE** customer-facing API modifications. Existing endpoints can continue serving client traffic without interruption.

---

## 16. Security & Row-Level Security (RLS) Analysis

Spatial geography data represents public democratic infrastructure and must adhere to Kshetra's security baseline (established in W010):

1. **Read Access:**
   - Public read access (`FOR SELECT USING (true)`) across all canonical geography tables (`states`, `districts`, `constituencies`, `mandals`, `polling_booths`).
2. **Write Access:**
   - Mutation strictly denied to anonymous and authenticated client roles (`FOR ALL USING (false)`). Modifications restricted exclusively to `service_role`.
3. **FORCE ROW LEVEL SECURITY:**
   - All spatial tables have `FORCE ROW LEVEL SECURITY` enabled to prevent table-owner bypass.
4. **Scenario Isolation:**
   - Proposed delimitation boundaries are quarantined in `proposed_constituencies` with explicit foreign keys to `delimitation_scenarios`.
5. **No Secret Ingestion:**
   - Geometry ingestion scripts must execute via `service_role` credentials without exposing tokens to frontend clients.

---

## 17. Performance Risk Analysis

| Performance Vector | Inherent Risk | Technical Driver | Mitigation / Guardrail in W016 |
|---|---|---|---|
| **Full Polygon Network Payloads** | **HIGH** | Telangana AC GeoJSON is 3.59 MB; UP GeoJSON is 6.66 MB; transferring uncompressed GeoJSON degrades mobile performance. | Boundaries served gzipped via remote CDN streaming (`remoteGeoLoader.ts`); never bundled in main JS. |
| **In-Memory GeoJSON Ingestion** | **MEDIUM** | Parsing 6 MB GeoJSON strings into Node.js memory creates GC pressure during server startup. | PostGIS spatial queries push point-in-polygon to PostgreSQL GiST index. |
| **PostGIS GiST Index Scans** | **LOW** | 2D bounding box intersection (`&&`) over 119 ACs takes $< 2 \text{ ms}$ on PostgreSQL. | Standard GiST indexing on SRID 4326. |
| **ST_Contains Exact Evaluation** | **LOW** | Exact point-in-polygon on complex multi-ring polygons takes $< 5 \text{ ms}$ after GiST bounding-box filter. | Two-stage evaluation: GiST box filter (`&&`) followed by `ST_Contains`. |
| **Coordinate Reprojection** | **MEDIUM** | Dynamic on-the-fly reprojection (e.g. `ST_Transform(geom, 3857)`) consumes significant CPU. | All coordinates stored and queried natively in EPSG:4326 (WGS84); no runtime reprojections. |

---

## 18. Mobile & App-Size Impact Analysis

1. **Bundle Size Invariant:**
   - Raw GeoJSON boundaries **MUST NOT** be added to `apps/mobile/data/` or bundled via `require()`.
   - Metro bundler inlines `require()` files directly into the JavaScript bundle (`index.android.bundle`).
   - The remote streaming architecture (`apps/mobile/lib/remoteGeoLoader.ts`) already handles dynamic per-state streaming and on-device caching.
2. **137 MB SQLite Seed Database:**
   - `apps/mobile/data/seed-data.db` (137.7 MB) contains candidate affidavits, election results, and offline lookup tables.
   - W016 **MUST NOT** inject multi-megabyte spatial geometry blobs into `seed-data.db`.
3. **Native Dependencies:**
   - Map rendering is handled by MapLibre React Native (`@maplibre/maplibre-react-native`). No new native libraries or native code changes are required.

---

## 19. Acceptance Test Design

The W016 test suite must contain deterministic, fail-closed semantic verification tests:

| Test ID | Test Category | Target Requirement | Test Operation & Assertion | Failure Condition | Evidence Class |
|---|---|---|---|---|---|
| **TEST-W016-01** | **Geometry Column & SRID** | `REQ-W016-01` | Query `geometry_columns` catalog for `constituencies.boundary`, `mandals.centroid`, `mandals.boundary`. Assert SRID = 4326 and correct geometry types. | Column missing, wrong type, or SRID $\ne 4326$. | `STAGING_RUNTIME` |
| **TEST-W016-02** | **OGC Simple Feature Validity** | `REQ-W016-06` | Execute `SELECT id, ST_IsValid(boundary), ST_IsValidReason(boundary) FROM constituencies WHERE boundary IS NOT NULL;`. Assert 100% valid. | Any self-intersecting, unclosed, or corrupt ring. | `STAGING_RUNTIME` |
| **TEST-W016-03** | **Data Governance & Provenance** | `REQ-W016-02` | Verify all ingested geometries have a corresponding `provenance_records` row with status `UNVERIFIED` and valid source metadata. | Provenance missing, circular, or elevated to `OFFICIAL`. | `STAGING_RUNTIME` |
| **TEST-W016-04** | **Spatial Point-in-Polygon Locate** | `REQ-W016-07` | Test known reference coordinates against `ST_Contains` (e.g. Sirpur T headquarters `79.605, 19.482` inside Sirpur AC 1). | Point fails to resolve or resolves to wrong AC. | `STAGING_RUNTIME` |
| **TEST-W016-05** | **Spatial vs Relational MCM Alignment** | `REQ-W016-07` | For all active `mandal_constituency_map` rows where geometry exists, execute `ST_Intersects(mandal.boundary, ac.boundary)`. Assert intersection = true. | Spatial intersection false for declared relational mapping. | `STAGING_RUNTIME` |
| **TEST-W016-06** | **Scenario Isolation Quarantine** | `REQ-W016-04` | Execute default spatial query. Assert 0 records returned from `proposed_constituencies` or with `status = 'SCENARIO'`. | Scenario data returned in canonical query. | `STAGING_RUNTIME` |
| **TEST-W016-07** | **W013 Canonical Regression** | Regression | Execute `tests/verify_w013_canonical_geography.mjs`. Assert 13/13 PASS. | Any regression on W013 entities. | `STATIC_REPOSITORY` |
| **TEST-W016-08** | **W014 Temporal Regression** | Regression | Execute `tests/verify_w014_temporal_validity.mjs`. Assert 9/9 PASS. | Any regression on W014 temporal intervals. | `STATIC_REPOSITORY` |
| **TEST-W016-09** | **W015 Relationship Regression** | Regression | Execute `tests/verify_w015_relationship_engine.mjs`. Assert 9/9 PASS. | Any regression on W015 relational mappings. | `STATIC_REPOSITORY` |
| **TEST-W016-10** | **TypeScript Clean Build** | Integrity | Execute `npm run build --prefix apps/api` and `tsc --noEmit`. Assert exit code 0. | Type errors or syntax failures. | `STATIC_REPOSITORY` |

---

## 20. Rollback & Failure Model

| Failure Scenario | Immediate Consequence | Rollback / Remediation Procedure | Residual Risk |
|---|---|---|---|
| **Migration SQL Syntax Error / Failure** | Migration aborted; transaction rolls back automatically. | Fix migration package; re-verify against staging SQL editor. | Zero (Transactional DDL). |
| **Corrupt / Invalid Geometry Ingestion** | `ST_IsValid` quality gate fails on staging verification. | Delete ingested rows using `service_role`; revert to `NULL` geometry; fix source GeoJSON. | Low (Confined to ingested rows). |
| **Spatial Index Failure / Bloat** | GiST index fails to build or causes high memory usage. | `DROP INDEX CONCURRENTLY`; tune PostgreSQL work memory; rebuild GiST index. | Low. |
| **Provenance Linkage Disconnection** | Geometry loaded without valid `provenance_id`. | Foreign key constraint rejects insert or verification script triggers failure; reload with valid provenance. | Zero (Enforced by FK). |
| **Temporal Contamination** | Geometry linked to wrong temporal version. | Clear version geometry linkage; verify against `constituency_versions.valid_from/to`. | Low. |
| **Client / Mobile Incompatibility** | Malformed geometry crashes mobile MapLibre. | Mobile `sanitizeGeoJSON` strips degenerate rings; remote loader falls back to cached version. | Low. |

---

## 21. Proposed Implementation Sequencing

Implementation must proceed in strict, sequential stages. **No stage beyond Stage 1 may execute without explicit CTO authorization.**

```
[STAGE 1: Preflight & Design Authorization] ──► (CURRENT STAGE — COMPLETE)
                     │
         [CTO IMPLEMENTATION AUTHORIZATION]
                     │
                     ▼
[STAGE 2: Authoritative Source Acquisition & Offline Quality Audit]
                     │
                     ▼
[STAGE 3: Staging Migration Package Design (DDL & Indexes)]
                     │
                     ▼
[STAGE 4: Manual Staging Migration Execution (CTO)]
                     │
                     ▼
[STAGE 5: Pilot Geometry Ingestion (Telangana Pilot ACs 1 & 2)]
                     │
                     ▼
[STAGE 6: Spatial Quality Validation Battery (OGC Validity Gates)]
                     │
                     ▼
[STAGE 7: Spatial Relationship Verification (ST_Contains vs W015 MCM)]
                     │
                     ▼
[STAGE 8: Comprehensive Regression Battery (W013, W014, W015)]
                     │
                     ▼
[STAGE 9: Performance Benchmarking (GiST Query Times)]
                     │
                     ▼
[STAGE 10: Evidence Packaging & Register Synchronization]
                     │
                     ▼
[STAGE 11: CTO Acceptance Review]
                     │
                     ▼
[STAGE 12: Production Invariant Confirmation (Untouched)]
```

---

## 22. Traceability Matrix

| Master Requirement | Current Source of Truth | Current State | Gap | Minimum Required Change | Source Evidence Required | Verification Test | Scope Boundary | Authorization Required? |
|---|---|---|---|---|---|---|---|---|
| **REQ-W016-01: Geometry Storage** | `001_initial_schema.sql`, `022_administrative_hierarchy.sql` | Columns exist on `constituencies`, `mandals`; unpopulated. | Data not loaded; districts lack column. | Load geometry into existing columns; add column to districts if authorized. | Source GeoJSON hash + SRID 4326 metadata | `TEST-W016-01` | W016 | **YES** |
| **REQ-W016-02: Provenance** | `039_data_governance_foundation.sql` | 27 records in W015; geometry not linked. | Geometry provenance records not registered. | Register dataset version and provenance records under W012. | Dataset version + source artifact hash | `TEST-W016-03` | W016 | **YES** |
| **REQ-W016-03: Temporal Alignment** | `041_temporal_geography_model.sql` | Versions exist; lack geometry columns. | Temporal entities cannot store versioned boundaries. | Bind geometry to versioned entities or regime. | Gazette orders + version timestamps | `TEST-W016-08` | W016 | **YES** |
| **REQ-W016-04: Scenario Isolation** | `011_delimitation.sql` | `proposed_constituencies` separated. | None. | Enforce `status != 'SCENARIO'` in queries. | Schema FKs + status enum | `TEST-W016-06` | W016 | **YES** |
| **REQ-W016-05: Spatial Indexing** | `001_initial_schema.sql` L39 | GiST indexes defined in migration SQL. | Not confirmed on staging runtime. | Confirm GiST indexes built on populated geometry. | `pg_indexes` catalog probe | `TEST-W016-01` | W016 | **YES** |
| **REQ-W016-06: Quality Gates** | `scripts/audit-all-geojson.mjs` | Audit script checks client files (19/31 pass). | No database-level OGC validity gate. | Execute OGC validity checks during staging ingestion. | `ST_IsValid` query output | `TEST-W016-02` | W016 | **YES** |
| **REQ-W016-07: Spatial Containment** | `042_geography_relationship_engine.sql` | Relational MCM links exist; no spatial verification. | PostGIS spatial queries not verified against W015 links. | Execute `ST_Contains` / `ST_Intersects` verification test. | PostGIS spatial join results | `TEST-W016-04`, `TEST-W016-05` | W016 | **YES** |
| **REQ-W016-08: Mobile Quarantine** | `apps/mobile/lib/remoteGeoLoader.ts` | Remote streaming architecture active. | None. | Maintain prohibition against bundling GeoJSON in JS. | Metro bundle size audit | `TEST-W016-10` | W016 | **YES** |

---

## 23. Open Questions, Blockers & UNKNOWNs

| Item ID | Category | Description | Current Status / Impact | Resolution Path |
|---|---|---|---|---|
| **UNK-16-01** | **BLOCKER** | **Mandal Boundary Spatial Data Source:** No mandal polygon boundaries exist in the repository (`data/geo/` contains only AC, District, and State boundaries). | Cannot ingest mandal geometry or compute spatial mandal-AC intersections without authoritative mandal boundary shapefiles. | In W016 pilot, either acquire Telangana TRAC mandal boundaries or limit spatial containment testing to AC boundaries and point centroids. |
| **UNK-16-02** | **UNKNOWN** | **Live Staging PostGIS & Index State:** Live catalog probe of `panIN-staging` has not verified whether PostGIS extension and GiST indexes are compiled and active. | Preflight inspection is based on `STATIC_REPOSITORY` migration inspection. | Verified during Stage 4/5 staging inspection upon authorization. |
| **UNK-16-03** | **QUESTION** | **District Geometry Storage:** Should `public.districts` receive a geometry column in W016, or should district boundaries remain deferred to W017? | Adding a column requires a schema migration; omitting it confines W016 strictly to existing tables. | Recommended: Defer district geometry column to W017; confine W016 strictly to `constituencies` and `mandals`. |
| **UNK-16-04** | **EXTERNAL DEPENDENCY** | **Survey of India / ECI Official Vector Access:** Official vector boundaries from SOI/ECI require portal registration and access terms. | Prevents promoting geometry from `UNVERIFIED` to `OFFICIAL`. | Data will remain strictly `UNVERIFIED` under `datta07_shapefiles` provenance. |
| **UNK-16-05** | **DEFERRED** | **Quantitative Overlap Percentages:** Exact percentage calculation of mandals overlapping ACs requires metric projection and area calculation. | Explicitly quarantined to W017. | W015 discrete `full` / `partial` classification remains authoritative. |

---

## 24. CTO Authorization Decision Inputs

To enable the independent CTO to make an informed implementation authorization decision, three concrete scope options are presented:

### Scope Option 1: Bounded Assembly Constituency Spatial Foundation (RECOMMENDED)
- **Scope:**
  - Restrict W016 to the **bounded pilot geography** (Sirpur AC 1 and Chennur AC 2).
  - Ingest validated OGC MultiPolygon geometries for AC 1 and AC 2 into existing `constituencies.boundary`.
  - Ingest validated Point centroids for the 12 pilot mandals into existing `mandals.centroid`.
  - Link all ingested records to W012 `provenance_records` (strictly `UNVERIFIED`).
  - Activate GiST index and execute `TEST-W016-01` through `TEST-W016-10`.
  - **Zero schema changes** (uses existing columns in `constituencies` and `mandals`).
- **Risk:** LOW.
- **Feasibility:** HIGH. All required source artifacts exist in the repository.

### Scope Option 2: Full State Assembly Constituencies (119 ACs)
- **Scope:** Ingest all 119 Telangana AC boundaries from `telangana-assembly.geojson` into `constituencies.boundary`.
- **Risk:** MEDIUM. Increases staging data volume and requires bulk provenance registration for 119 records.
- **Feasibility:** MEDIUM. GeoJSON is clean (119/119), but mandal boundaries remain unavailable.

### Scope Option 3: Multi-Level Geography (State + District + AC + Mandal)
- **Scope:** Add geometry columns to `districts`, acquire external mandal shapefiles, and ingest all 4 levels.
- **Risk:** HIGH (Blocked by missing mandal boundary data source `UNK-16-01`).
- **Feasibility:** LOW without external data acquisition.

---

## Explicit Preflight Statements

```
W015                = ACCEPTED / COMPLETE
W015-B1             = ACCEPTED / COMPLETE
W015-B2             = ACCEPTED / COMPLETE
W016 PREFLIGHT      = SUBMITTED_FOR_CTO_REVIEW
W016 IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION          = STRICTLY UNTOUCHED
```
