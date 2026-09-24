# W016-B2: Bounded Technical Spatial Rehearsal — Staging Only

**Job Identifier:** W016-B2  
**Authority:** Independent CTO / Co-founder Directive  
**Date:** 2026-09-24  
**Authoritative Baseline Commit:** `e240fc35d244abfb6d40de7a882d795a82c35402` (`e240fc3`)  
**Staging Project Ref:** `fkpigozcqnmcvofuksar` (`https://fkpigozcqnmcvofuksar.supabase.co`)  
**Classification:** TECHNICAL SOFTWARE CAPABILITY REHEARSAL ONLY  
**Current Authoritative State:**
- W015: ACCEPTED / COMPLETE
- W015-B1: ACCEPTED / COMPLETE
- W015-B2: ACCEPTED / COMPLETE
- W016-A1 PREFLIGHT: ACCEPTED
- W016-B1 PREFLIGHT: ACCEPTED
- W016-B2 REHEARSAL: SUBMITTED FOR CTO REVIEW
- W016 AUTHORITATIVE IMPLEMENTATION: **STRICTLY NOT AUTHORIZED**
- PRODUCTION: **STRICTLY UNTOUCHED**

---

## 1. Executive Summary & Rehearsal Objective

Job **W016-B2** executes an isolated, bounded technical capability rehearsal on **STAGING ONLY** to determine whether the existing PANIN PostgreSQL/PostGIS foundation can execute minimum spatial operations (`ST_Contains`, `ST_Intersects`, `ST_Within`, `ST_GeometryType`, `ST_SRID`, `ST_IsValidDetail`).

### Rehearsal Scope & Invariants
1. **Technical Software Capability Only:** This job proves solely that PostGIS 3.3.7 is functional, responsive, and geometrically deterministic when performing spatial operations on complex polygon geometries.
2. **Quarantined Fixtures:** Rehearsal operations utilize Assembly Constituency 1 (Sirpur) and Assembly Constituency 2 (Chennur) extracted from `data/geo/telangana-assembly.geojson` (derived from `datta07/INDIAN-SHAPEFILES`).
3. **No Geographic Authority:** These geometries remain classified strictly as `UNVERIFIED_FIXTURE_GEOMETRY`. They do **NOT** establish legal or authoritative truth.
4. **No Promotion:** Zero geometries are promoted to `OFFICIAL` or `CURRENT_LEGAL_GEOMETRY`.
5. **UNK-16-01 Remains Blocked:** Mandal polygon geometry remains absent from authoritative sources and repository datasets; `UNK-16-01` remains `OPEN / BLOCKED`.
6. **No Production Action:** Production database, APIs, mobile applications, and DNS were completely untouched.

---

## 2. Authorization & Boundary Constraints

In strict accordance with the CTO Directive for W016-B2, the following boundary constraints were adhered to without exception:

| Constraint Category | Bound | Verified Status |
|---|---|---|
| Target Environment | Staging Only (`fkpigozcqnmcvofuksar`) | **PASS** — Direct staging PostgREST RPC |
| Production Environment | Strictly Untouched | **PASS** — Zero calls, zero mutations |
| Migrations | No Migration 044; No DDL applied | **PASS** — Existing schema unchanged |
| Schema Alterations | No table or column additions | **PASS** — Zero DDL operations executed |
| RLS Policies | No security rule or policy mutations | **PASS** — Zero policy edits |
| Data Mutation | Existing W012–W015 data untouched | **PASS** — Read/execute only; DB columns remain NULL |
| H3 Integration | No discrete global grids | **PASS** — Excluded |
| Synthetic Polygons | No buffer/hull approximations | **PASS** — Zero synthetic generation |
| Register Mutation | No premature edits to registers | **PASS** — Execution state preserved |

---

## 3. Four-Layer Evidence Model

The rehearsal follows a four-layer verification structure to segregate raw fixtures, engine infrastructure, spatial compute, and environmental containment:

```
+-----------------------------------------------------------------------+
| LAYER D: PRODUCTION BOUNDARY SAFETY (Zero Touch / Total Isolation)   |
+-----------------------------------------------------------------------+
| LAYER C: TECHNICAL SPATIAL REHEARSAL (ST_Contains, Intersects, Valid) |
+-----------------------------------------------------------------------+
| LAYER B: STAGING POSTGIS ENVIRONMENT (PG 17 / PostGIS 3.3.7 / EPSG 4326)|
+-----------------------------------------------------------------------+
| LAYER A: REPOSITORY FIXTURE BASELINE (UNVERIFIED_FIXTURE_GEOMETRY)    |
+-----------------------------------------------------------------------+
```

- **Layer A (Repository Geometry Baseline):** Inspects and verifies the raw GeoJSON test fixture stored in the repository.
- **Layer B (Staging PostGIS Engine Baseline):** Validates the live database engine, extension status, catalogs, and column layout on staging.
- **Layer C (Technical Operations Battery):** Executes determinism, intersection, containment, and validity test suites against live PostGIS functions.
- **Layer D (Production Boundary Safety):** Verifies that the production environment was completely segregated and untouched.

---

## 4. Layer A — Repository Geometry Baseline Inspection

The test fixture is located in the repository under `data/geo/telangana-assembly.geojson`.

### 4.1 Fixture Coordinates & Integrity

- **File Path:** [`data/geo/telangana-assembly.geojson`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/data/geo/telangana-assembly.geojson)
- **File Size:** `3,663,116 bytes` (3.49 MB)
- **SHA-256 Digest:** `fc440af93a9d970e16fcc312adf8e6f53610446ce71230fffb34dfea238c17b6`
- **Total Feature Count:** 120 features
- **Coordinate Reference System (CRS):** `EPSG:4326` (WGS 84 standard geodetic coordinates)

### 4.2 Fixture Feature Details

```
Feature AC 1: Sirpur (Index 3)
├── Properties:
│   ├── FID: 297, OBJECTID: 298
│   ├── ST_CODE: "36", ST_NAME: "TELANGANA"
│   ├── DT_CODE: "01", DIST_NAME: "ADILABAD"
│   ├── AC_NO: 1, AC_NAME: "Sirpur"
│   ├── PC_NO: 1, PC_NAME: "ADILABAD(ST)", PC_ID: 2801
│   ├── Shape_Leng: 2.17769969212, Shape_Area: 0.181502592112
│   └── dtcode11: "532", dtname11: "Adilabad"
├── Geometry Type: Polygon
├── Vertex Count: 1,090 coordinates
└── Bounding Box [minX, minY, maxX, maxY]:
    [79.36383540000008, 19.14559476300007, 79.97972268000005, 19.608905998000054]

Feature AC 2: Chennur (Index 11)
├── Properties:
│   ├── FID: 307, OBJECTID: 308
│   ├── ST_CODE: "36", ST_NAME: "TELANGANA"
│   ├── DT_CODE: "01", DIST_NAME: "ADILABAD"
│   ├── AC_NO: 2, AC_NAME: "Chennur (SC)"
│   ├── PC_NO: 2, PC_NAME: "PEDDAPALLE (SC)", PC_ID: 2802
│   ├── Shape_Leng: 2.17209244946, Shape_Area: 0.121736162081
│   └── dtcode11: "532", dtname11: "Adilabad"
├── Geometry Type: Polygon
├── Vertex Count: 1,169 coordinates
└── Bounding Box [minX, minY, maxX, maxY]:
    [79.38235014600008, 18.670694496000053, 79.96316856500005, 19.058047372000026]
```

### 4.3 Mandatory Fixture Quarantine Statement

> **MANDATORY EVIDENCE QUARANTINE NOTICE:**  
> "Fixture geometry is unverified third-party data from datta07/INDIAN-SHAPEFILES. It is NOT official ECI, CPH, SOI, or Census geometry. It is used here solely as a technical test fixture for software capability rehearsal."

---

## 5. Layer B — Staging PostGIS Environment Baseline

Live queries against the staging project (`fkpigozcqnmcvofuksar`) confirm that PostGIS is installed and functioning in PostgreSQL 17.

### 5.1 PostGIS Version & Capabilities

- **PostGIS Full Version (Live Engine String):**
  ```text
  POSTGIS="3.3.7 a0c7967" [EXTENSION] PGSQL="170" GEOS="3.14.1-CAPI-1.20.5" PROJ="9.7.1" LIBXML="2.15.1" LIBJSON="0.18" LIBPROTOBUF="1.5.2" WAGYU="0.5.0 (Internal)"
  ```
- **Spatial Reference System Catalog (`spatial_ref_sys`):**
  - SRID `4326`: Verified present (`auth_name: 'EPSG'`, `auth_srid: 4326`).
- **Core Spatial Types Exposed:** `GEOMETRY`, `POINT`, `MULTIPOLYGON`, `POLYGON`.
- **Core Spatial Functions Exposed via RPC:** `ST_Contains`, `ST_Intersects`, `ST_Within`, `ST_IsValidDetail`, `ST_SRID`, `ST_Distance`, `ST_Buffer`, `ST_GeomFromGeoJSON`, `ST_GeomFromText`.

### 5.2 Existing Database Geometry Columns & Population State

Inspection of `public.geometry_columns` on staging demonstrates that the existing schema (created in earlier migrations such as 022) defines geometry columns, but **they are completely unpopulated**:

| Table Name | Column Name | Geometry Type | Coord Dimension | SRID | Staging Data Population |
|---|---|---|---|---|---|
| `public.constituencies` | `boundary` | `MULTIPOLYGON` | 2 | 4326 | **NULL** (AC 1, AC 2 are NULL) |
| `public.mandals` | `centroid` | `POINT` | 2 | 4326 | **NULL** (TS-MDL-7101, 7102 are NULL) |
| `public.mandals` | `boundary` | `MULTIPOLYGON` | 2 | 4326 | **NULL** (TS-MDL-7101, 7102 are NULL) |
| `public.polling_booths` | `location` | `POINT` | 2 | 4326 | Unpopulated |
| `public.polling_booths` | `catchment_boundary`| `MULTIPOLYGON` | 2 | 4326 | Unpopulated |
| `public.mptc_divisions` | `boundary` | `MULTIPOLYGON` | 2 | 4326 | Unpopulated |
| `public.gp_wards` | `centroid` | `POINT` | 2 | 4326 | Unpopulated |
| `public.gp_wards` | `boundary` | `MULTIPOLYGON` | 2 | 4326 | Unpopulated |
| `public.gram_panchayats`| `centroid` | `POINT` | 2 | 4326 | Unpopulated |
| `public.urban_local_bodies`| `centroid` | `POINT` | 2 | 4326 | Unpopulated |

*Finding:* No geometry data was mutated or populated in the staging database tables during this rehearsal.

---

## 6. Layer C — Technical Spatial Operations Rehearsal

A comprehensive test battery (`TEST-B2-A` through `TEST-B2-F`) was executed against the staging PostGIS engine using the AC 1 and AC 2 polygon geometries and test coordinates.

### 6.1 Spatial Battery Test Cases & Results

```
Test Coordinates Used:
├── AC 1 Polygon: 1,090 vertices, SRID 4326
├── AC 2 Polygon: 1,169 vertices, SRID 4326
├── Point P1 (Interior to AC 1): SRID=4326;POINT(79.671779 19.37725)
└── Point P2 (Interior to AC 2): SRID=4326;POINT(79.672759 18.86437)
```

| Test ID | Operation | Input Description | Expected Result | Actual Result | Latency / Runs | Status |
|---|---|---|---|---|---|---|
| **TEST-B2-A** | `ST_Intersects` | AC 1 Polygon ∩ Point P1 | `true` | `true` | Runs: 741ms, 616ms, 349ms (Avg: 569ms) | **PASS** |
| **TEST-B2-B** | `ST_Contains` | AC 1 Polygon ⊃ Point P1 (Inside)<br>AC 1 Polygon ⊃ Point P2 (Outside) | `true`<br>`false` | `true`<br>`false` | Inside: 417ms<br>Outside: 353ms | **PASS** |
| **TEST-B2-C** | `ST_Within` | Point P1 ⊆ AC 1 Polygon (Inside)<br>Point P2 ⊆ AC 1 Polygon (Outside) | `true`<br>`false` | `true`<br>`false` | Inside: 377ms<br>Outside: 331ms | **PASS** |
| **TEST-B2-D** | `ST_SRID` & `ST_IsValidDetail` | SRID & Topology Validity for AC 1 and AC 2 | SRID 4326<br>Valid = true | SRID 4326<br>`{"valid":true,"reason":null}` | AC 1 Valid: 359ms<br>AC 2 Valid: 346ms | **PASS** |
| **TEST-B2-E** | Determinism | 3 consecutive evaluations of `ST_Contains(AC 1, P1)` | `[true, true, true]` | `[true, true, true]` | 100% Deterministic | **PASS** |
| **TEST-B2-F** | `ST_Intersects` Disjoint Pair | AC 1 Polygon ∩ AC 2 Polygon | `false` | `false` | Duration: 565ms | **PASS** |

### 6.2 Technical Performance Analysis

1. **Point-in-Polygon (`ST_Contains`, `ST_Within`, `ST_Intersects`):**
   - Executing point containment against complex polygons (~1,100 vertices) executes reliably via PostgREST RPC in **330ms to 420ms**.
   - Network payload: ~41 KB WKT string transmitted per request over HTTPS.
2. **Polygon-with-Polygon (`ST_Intersects(AC 1, AC 2)`):**
   - Evaluated 1,090 vertices against 1,169 vertices in **565ms**.
   - Returned `false` deterministically, accurately reflecting the disjoint bounding boxes (AC 1 latitude: 19.14°–19.61° N; AC 2 latitude: 18.67°–19.06° N).
3. **Topological Validity (`ST_IsValidDetail`):**
   - Both AC 1 and AC 2 polygons passed OGC topological validity without self-intersections or duplicate vertex errors in **~350ms**.

---

## 7. Spatial Verification against W015 Relational Baseline

The staging database contains the canonical relational baseline established and reconciled under W014 and W015.

### 7.1 Authoritative Relational Mapping in Staging (`mandal_constituency_map`)

Queries against `public.mandal_constituency_map` on staging return:

- **Assembly Constituency 1 (Sirpur):**
  - Mandal 1: `TS-MDL-7101` (`Sirpur (T)`, Kumuram Bheem Asifabad, LGD: 4676)
  - Mandal 2: `TS-MDL-7102` (`Kagaznagar`, Kumuram Bheem Asifabad, LGD: 4655)
- **Assembly Constituency 2 (Chennur):**
  - Mandal 1: `TS-MDL-5323` (`Chennur`, Mancherial, LGD: 4648)
  - Mandal 2: `TS-MDL-5328` (`Kotapalli`, Mancherial, LGD: 4660)

### 7.2 Spatial Confirmation Classification

- **Classification:** **`SPATIAL_NOT_AVAILABLE`** (Inconclusive)
- **Technical Evidentiary Rationale:**
  - Neither `mandals.boundary` nor `mandals.centroid` are populated in the database (values are `NULL`).
  - Authoritative mandal vector geometry does not exist in the repository (confirming `UNK-16-01`).
  - Without authoritative mandal polygon geometry, software cannot compute polygon containment (`ST_Contains(AC_polygon, Mandal_polygon)`) or centroid containment.
- **Relational Primacy Invariant:**
  > **RELATIONAL PRIMACY RULE:**  
  > "Relational evidence established and verified under W014 and W015 remains authoritative. Spatial rehearsal does NOT override, modify, or validate relational records."

---

## 8. W014 Temporal Boundary Safety

The rehearsal explicitly evaluated whether raw spatial geometry captures statutory temporal reorganizations.

### 8.1 The 2016 District Reorganization Divergence

In October 2016, the Government of Telangana reorganized the former 10 districts into 31 (later 33) districts. Specifically, the erstwhile Adilabad district was bifurcated into Adilabad, Kumuram Bheem Asifabad, Mancherial, and Nirmal:

- **Statutory Truth (Post-2016 / W014 / W015):**
  - `TS-AC-1` (Sirpur) is situated in **Kumuram Bheem Asifabad** district (`district_id: 208bc4a0-97e2-4cd9-9907-4ec586d52d69`).
  - `TS-AC-2` (Chennur) is situated in **Mancherial** district (`district_id: fad43018-7df9-4fac-bb3e-fd9e6ed45bb8`).
- **Fixture GeoJSON Attributes (`data/geo/telangana-assembly.geojson`):**
  - Feature AC 1 attributes: `DIST_NAME: "ADILABAD"`, `DT_CODE: "01"`, `dtcode11: "532"`.
  - Feature AC 2 attributes: `DIST_NAME: "ADILABAD"`, `DT_CODE: "01"`, `dtcode11: "532"`.

### 8.2 Architectural Lesson: Spatial Result != Statutory Lineage

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CRITICAL ARCHITECTURAL RULE                    │
│                                                                        │
│               SPATIAL RESULT  !=  STATUTORY LINEAGE                   │
│                                                                        │
│ Spatial coordinates and polygon boundaries represent physical surface  │
│ extents, NOT administrative or statutory jurisdiction over time.       │
│ Unverified shapefiles embed obsolete (pre-2016) administrative         │
│ metadata. Blind spatial attribution without temporal regime tagging    │
│ corrupts statutory governance data.                                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Authoritative Status Safety

Job W016-B2 strictly enforces boundary hygiene regarding data promotion:

- **Geometries Promoted to `OFFICIAL`:** `0`
- **Geometries Promoted to `CURRENT_LEGAL_GEOMETRY`:** `0`
- **Repository Authoritative Geometry Count:** `0`
- **Fixture Classification Maintained:** `UNVERIFIED_FIXTURE_GEOMETRY`

No fixture geometry was inserted into production or promoted in any catalog, registry, or table.

---

## 10. Unknown Register Status

### UNK-16-01: Mandal Polygon Geometry Availability

- **Register Item:** `UNK-16-01`
- **Description:** Source, license, format, and availability of official mandal polygon vector geometry for Telangana.
- **Current Status:** **`OPEN / BLOCKED`**
- **Rehearsal Finding:** W016-B2 demonstrated that the PostGIS software engine can execute spatial operations, but it did **NOT** locate, acquire, or verify authoritative mandal polygon geometry.
- **Conclusion:** `UNK-16-01` cannot be closed by a software capability rehearsal. It remains open until authoritative Survey of India (SOI) or Survey Settlement and Land Records (SSLR) geometry is officially released and licensed.

---

## 11. Production Boundary Safety (Layer D)

The production environment was isolated and protected throughout Job W016-B2:

1. **Zero Requests to Production:** No network calls were initiated to production Supabase or production API endpoints (`panin.in`).
2. **Zero Schema Alterations:** Production DDL remains completely untouched.
3. **Zero Data Mutations:** Production database records remain identical to pre-W016 baseline.
4. **Environment Verification:** Staging keys from `.env.staging` were exclusively targeted.

---

## 12. Technical Limitations Observed

1. **Transport Overhead:** Submitting 40+ KB WKT payloads dynamically over HTTPS PostgREST incurs ~300ms network transport latency per invocation.
2. **Dynamic vs Indexed Execution:** In-flight function calls (`ST_Contains(wkt1, wkt2)`) execute without table-level spatial bounding-box indexing (`GIST`), relying entirely on in-memory GEOS evaluation.
3. **Coordinate Precision:** High vertex counts (~1,100 vertices per constituency) yield high precision but necessitate server-side storage and GiST indexing for production-scale spatial queries.

---

## 13. Next Steps & Prerequisite Gates

Before any production implementation of W016 can be authorized:

1. **Formal Authoritative Source Sourcing:** Authoritative ECI/SOI constituency boundaries and mandal boundaries must be acquired under verifiable license.
2. **Schema Migration Design Review:** A formal migration (e.g. Migration 044) must be reviewed, defining geometry columns with proper constraints, SRID enforcement (4326), GiST indexing, and RLS policies.
3. **Resolution of UNK-16-01:** Strategy for mandal boundaries (authoritative acquisition vs relational hierarchy primacy without spatial containment) must be formally approved by CTO.

---

## 14. Four Mandatory Acceptance Statements

As required by Section 14 of the CTO Directive, the following statements are explicitly affirmed:

1. > **"W016-B2 proves technical spatial capability only."**
2. > **"W016-B2 does NOT establish authoritative geographic truth."**
3. > **"W016-B2 does NOT close UNK-16-01."**
4. > **"W016-B2 does NOT authorize production deployment."**

---

## 15. Exact Coordinates & Sign-Off

- **Git Baseline Commit:** `e240fc35d244abfb6d40de7a882d795a82c35402`
- **Output Artifacts:**
  - `docs/w016_b2_technical_spatial_rehearsal.md`
  - `docs/w016_b2_technical_spatial_rehearsal.json`
- **PostGIS Engine Evidence:**
  `POSTGIS="3.3.7 a0c7967" [EXTENSION] PGSQL="170" GEOS="3.14.1-CAPI-1.20.5" PROJ="9.7.1" LIBXML="2.15.1" LIBJSON="0.18" LIBPROTOBUF="1.5.2" WAGYU="0.5.0 (Internal)"`
- **Status:** **SUBMITTED FOR CTO REVIEW**
