# MASTER IMPLEMENTATION PLAN: W017 — SPATIAL GATEWAY, BOUNDARY DIFF & SPATIAL QUERY ENGINE
## REVISION 1.0 (PRE-IMPLEMENTATION PLANNING SPECIFICATION)

---

### OPERATIONAL STATUS & AUTHORIZATION DECLARATION

```text
================================================================================
JOB W017 MASTER IMPLEMENTATION PLAN — REVISION 1.0
AUTHORIZATION STATUS: SUBMITTED FOR CTO RATIFICATION (DRAFT)
================================================================================

PLAN STATUS:                         DRAFT / SUBMITTED FOR CTO RATIFICATION
IMPLEMENTATION AUTHORIZATION:        STRICTLY NOT AUTHORIZED (NO)
CURRENT ACTIVE PHASE:                PHASE 3 (PLANNING SPECIFICATION GATE ONLY)
TARGET ENVIRONMENT:                  STAGING SUPABASE (fkpigozcqnmcvofuksar) ONLY
PRODUCTION ENVIRONMENT:              STRICTLY AIR-GAPPED & UNTOUCHED (ehfafcnimmjusyvplbah)
W016-C3-R10 STATUS:                  CONDITIONALLY ACCEPTED (GAP B DEFERRED TO W023)
W016-C3-R11 STATUS:                  STRICTLY BLOCKED
589 GEOMETRY BASELINE:               READ-ONLY & FROZEN (DIGEST: f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b)
CODE MUTATIONS AUTHORIZED:           ZERO (0)
DATABASE MIGRATIONS AUTHORIZED:      ZERO (0)
STOP STATE:                          YES — AWAITING FORMAL CTO RATIFICATION

================================================================================
```

---

## 1. Document Title & Metadata

- **Document Identifier**: `PLAN-W017-REV-1.0`
- **Milestone Code**: `W017`
- **Milestone Title**: Spatial Gateway, Boundary Diff & Spatial Query Engine
- **Revision**: 1.0 (Initial Architectural & Operational Specification)
- **Date**: 2026-09-29
- **Author**: Antigravity Technical Architecture & Governance Agent
- **Operating Authority**: 
  - AI Agent Master Execution Job Book & AGENT_EXECUTION_PROTOCOL.md
  - Master Execution Framework Amendments v1.2, v1.3, v1.4, v1.5, v1.5-A, and v1.6
  - CTO Formal Acceptance of W011 (`DEC-068`)
  - CTO Formal Acceptance of W015 (`DEC-062`)
  - CTO Governance Directives for W016-C3-R10 (Gap B Deferred to W023)
- **Target Repository**: `kshetra-app/Kshetra`
- **Canonical Branch**: `master`
- **Audited Baseline Commit**: `1540ba3a7717d2f6b81777a947ca1fc21f7e0ff1`
- **Preflight Reconciliation Reference**: `reports/w017_preflight_reconciliation.json`
- **Target Staging Database**: `panIN-staging` (`fkpigozcqnmcvofuksar.supabase.co`)
- **Production Database**: `panIN-production` (`ehfafcnimmjusyvplbah.supabase.co`) — **STRICTLY AIR-GAPPED**

---

## 2. Problem Statement & Executive Summary

### 2.1 The Core Architectural Challenge
In Milestone W016, the platform established a cartographic spatial baseline by ingesting 589 statutory mandal geometries into PostGIS (`public.entity_geometries`), verified under cryptographic digest `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`, and exposed high-throughput vector tiles (`/geo/tiles`) and point-in-polygon resolution (`/geo/locate`).

However, cartographic visualization is insufficient for Panin's core mission: modeling constitutional delimitation, administrative redistricting, and temporal boundary shifts. Milestone W017 addresses the higher-order spatial computation layer:
1. **Multi-Regime Temporal Semantics**: The 589 geometries represent a historical statutory baseline (2016–2022). They must not be conflated with current 2026 geography or future delimitation proposals. Queries must support explicit temporal and regime discrimination.
2. **Quantitative Boundary Diffing & Overlap Computation**: Accurately measuring how administrative units overlap or deviate across versions without relying on naive client-side calculations or distorted cartographic projections.
3. **Read-Only Topological Anomaly Diagnostics**: Detecting slivers, gaps, spikes, and self-intersections in imported cartography without attempting destructive, legally invalid "automated healing".
4. **Governed Enterprise API**: Exposing these capabilities through Fastify with strict schema validation, query ceilings, and canonical error envelopes conforming to `ECC-001`.

### 2.2 Core Objective
To author a mathematically sound, enterprise-grade, append-only spatial gateway that provides boundary diffing, intersection calculations, and topological quality assurance over PostGIS while maintaining zero mutation of underlying geometry tables and preserving the strict air-gap to production.

---

## 3. Current State Analysis & Lineage Prerequisites

### 3.1 Preceding Milestones Lineage Ledger
All prerequisite milestones in the geographic and governance chain are closed and verified:

| Prerequisite | Status | Evidence Reference | Notes / Invariants |
| :--- | :---: | :--- | :--- |
| **W011** | **ACCEPTED / COMPLETE** | `DEC-068`, `ca062d1`, `1540ba3` | Mutation integrity, synthetic ID elimination, Gate 6 8/8 PASS |
| **W012** | **ACCEPTED / COMPLETE** | Migration 039, `DEC-058` | Data provenance, dataset versioning, evidence chains |
| **W013** | **ACCEPTED / COMPLETE** | Migration 040, `DEC-059` | Hierarchical administrative parentage & integrity |
| **W014** | **ACCEPTED / COMPLETE** | Migration 041/044, `DEC-065`, `DEC-066` | Temporal validity intervals, bi-temporal versioning, GiST exclusion |
| **W015** | **ACCEPTED / COMPLETE** | Migration 042/043, `DEC-062` | Cross-hierarchy relationship engine, M:N entity intersections |
| **W016-C3-R4** | **ACCEPTED / COMPLETE** | Migration 045/046 | Mandal identity & temporal loading |
| **W016-C3-R5..R8A** | **ACCEPTED / COMPLETE** | Migration 047/048 | 589 geometries ingested into `entity_geometries`, SHA-256 verified |
| **W016-C3-R9** | **ACCEPTED / COMPLETE** | `geoRuntime.ts`, `spatialRuntimeService.ts` | Fastify tile server, point locate, protobuf MVT pipeline |
| **W016-C3-R10** | **CONDITIONALLY ACCEPTED** | CTO Directives 2026-09-29 | Wire & API closed; Gap B native renderer deferred to W023 |
| **W016-C3-R11** | **STRICTLY BLOCKED** | CTO Directive | Static spatial asset retirement blocked until post-W023 |

### 3.2 PostGIS Geometry Baseline Truth
Inspection of `public.entity_geometries` on staging (`fkpigozcqnmcvofuksar`) confirms:
- **Table**: `public.entity_geometries`
- **Total Rows**: Exactly 589 rows.
- **Payload Digest (SHA-256)**: `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`.
- **SRID**: EPSG:4326 (WGS 84 coordinate reference system).
- **Geometry Type**: `MultiPolygon` (enforced by CHECK constraints).
- **Temporal Status**: All 589 rows have `temporal_classification = 'historical_statutory_baseline'`, `is_current = false`.
- **Immutability Enforcement**: Protected by trigger `trg_prevent_entity_geometry_mutation` against modifications to ID, spatial coordinates, entity type, mandal version, or dataset version.

---

## 4. Fact / Inference / Assumption / Unknown Register

| Category | ID | Statement | Architectural Consequence |
| :--- | :---: | :--- | :--- |
| **Fact** | `FACT-17-01` | `entity_geometries` contains 589 rows representing historical 2016–2022 Telangana mandals. | W017 cannot assume current 2026 mandals have 1:1 geometry rows yet; queries must accommodate sparse or historical geometry coverage. |
| **Fact** | `FACT-17-02` | `entity_geometries.geometry` is stored in EPSG:4326 (angular degrees). | Computing area via raw `ST_Area(geom)` computes square degrees, varying with latitude and invalid for physical metric analysis. |
| **Fact** | `FACT-17-03` | R10 native MapLibre renderer verification is deferred to W023. | W017 is strictly backend and database-centric; zero mobile UI or client-side MapLibre changes are in scope. |
| **Inference** | `INF-17-01` | Spatial analysis across regimes requires projecting geometries to metric geography (`geography(MultiPolygon, 4326)`) or planar projection UTM Zone 44N (EPSG:32644). | W017 stored procedures must standardize on `ST_Area(geom::geography)` or `ST_Transform(geom, 32644)` for all quantitative calculations. |
| **Inference** | `INF-17-02` | Automated healing of boundary overlaps causes arbitrary border relocation. | Topological anomaly engine must be strictly read-only diagnostic detection; no auto-healing is permitted. |
| **Assumption**| `ASM-17-01` | Analytical queries will be invoked by Fastify via the authenticated `service_role` or restricted application tokens. | Database functions should be `SECURITY INVOKER` by default, or explicitly audited `SECURITY DEFINER` with fixed `search_path`. |
| **Unknown**   | `UNK-17-01` | Future Delimitation Commission draft geometries format (Shapefile vs GeoJSON vs TopoJSON). | The Boundary Diff engine must operate on internal canonical geometry types rather than external file formats. |

---

## 5. Target Architecture & Technical Specifications

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                           FASTIFY SPATIAL GATEWAY                            │
│                                                                              │
│  POST /api/v1/spatial/analytics/overlap                                      │
│  POST /api/v1/spatial/analytics/boundary-diff                                │
│  GET  /api/v1/spatial/quality/anomalies                                      │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ (Parameterized RPC / Typed Client)
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    DATABASE SPATIAL ENGINE (MIGRATION 049)                   │
│                                                                              │
│  • fn_spatial_calculate_overlap(entity_a, entity_b, regime_id)               │
│  • fn_spatial_boundary_diff(version_a, version_b, tolerance_m)               │
│  • fn_spatial_detect_anomalies(layer, bounding_box, min_area_m2)             │
│                                                                              │
│  Security: SECURITY INVOKER / Audited SECURITY DEFINER (search_path fixed)   │
│  Compute:  Spheroidal (ST_Area(::geography)) + UTM 44N (EPSG:32644)          │
│  Limits:   5000ms statement_timeout, max 100 features, GiST && pre-filter    │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ (Read-Only Scan via GiST)
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│               CANONICAL POSTGIS STORAGE (public.entity_geometries)           │
│                                                                              │
│  589 Historical Baseline Geometries (SHA-256: f839fa02...)                   │
│  Status: READ-ONLY / FROZEN / ZERO MUTATIONS                                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Database Spatial Functions & Security Architecture
All spatial analytical procedures introduced in Migration 049 must strictly adhere to the enterprise database security baseline:

1. **Execution Security Mode**:
   - Default: `SECURITY INVOKER` for standard analytics, ensuring query execution operates under the permissions of the calling database role.
   - For procedures requiring access across partitioned metadata schemas: `SECURITY DEFINER` is permitted ONLY with an explicit, fixed search path:
     ```sql
     SET search_path = public, pg_temp;
     ```
2. **Ownership**:
   - Stored procedures must be owned exclusively by `postgres` or `service_role`.
3. **Access Control List (ACL)**:
   - Mandatory explicit privilege revocation and granting:
     ```sql
     REVOKE ALL ON FUNCTION public.fn_spatial_calculate_overlap FROM PUBLIC;
     GRANT EXECUTE ON FUNCTION public.fn_spatial_calculate_overlap TO authenticated, service_role, anon;
     ```
4. **Statement Timeout & DoS Protection**:
   - Each spatial function must enforce a local statement timeout to prevent runaway geometric computations:
     ```sql
     SET LOCAL statement_timeout = '5000ms';
     ```

### 5.2 Temporal Validity & Regime Isolation Semantics
The platform models multiple distinct spatial regimes that must never be blended:
1. **Regime Taxonomy**:
   - `historical_2016_2022`: The canonical 589 baseline geometries representing the statutory post-reorganization reorganization.
   - `current_2026`: The operational, active administrative mandal boundaries.
   - `projected_post2026`: Forward-looking delimitation commission scenarios.
   - `scenario`: Hypothetical user or policy-created redistricting options.
2. **Explicit Parameterization**:
   - All spatial queries must require an explicit `regime_id` or `as_of` date parameter.
   - Defaulting to "all" or implicitly assuming historical rows represent current geography is strictly prohibited.
3. **Cross-Regime Comparison Guard**:
   - When diffing across regimes (e.g. `historical_2016_2022` vs `projected_post2026`), the response envelope must explicitly flag the comparison as `CROSS_REGIME_COMPARISON` with clear metadata regarding baseline dates.

### 5.3 Identity Model Disambiguation
To prevent foreign key and semantic confusion, four distinct layers of identity are enforced:

| Identity Concept | Format / Type | Table / Origin | Purpose |
| :--- | :--- | :--- | :--- |
| **`entity_id`** | Text string (e.g., `TS-MDL-4676`, `TS-AC-023`) | `public.mandals`, `public.constituencies` | Immutable statutory/business identifier that persists across decades of boundary revisions. |
| **`version_id`** | UUID v4 | `public.mandal_versions.id` | Bi-temporal version instance representing an entity's attributes during a specific validity window (`valid_from` to `valid_to`). |
| **`geometry_id`** | UUID v4 | `public.entity_geometries.id` | Specific physical polygon row in PostGIS with spatial coordinates, digest, and snapshot metadata. |
| **`source_feature_id`** | Text string (e.g., `LGD:4676`, `FID_286`) | External source dataset (e.g. Survey of India, LGD, GeoJSON) | Original feature ID in raw incoming shapefiles/geodatabases for provenance tracking. |

### 5.4 Area & Overlap Calculation Methodology

#### 5.4.1 The Area Standard
- **Forbidden**: Raw `ST_Area(geometry)` on EPSG:4326 geometries. At latitude $17^\circ\text{N}$ (Hyderabad), 1 degree of longitude is $\approx 106.4\text{ km}$, whereas 1 degree of latitude is $\approx 110.6\text{ km}$. Calculating area in degrees produces meaningless square degrees.
- **Spheroidal Geography Standard**:
  All area calculations default to PostGIS geography casting on the WGS 84 ellipsoid:
  $$\text{Area}_{\text{geog}} = \text{ST\_Area}(\text{geom}::\text{geography})$$
  This returns area directly in **square meters ($m^2$)**.
- **Planar Cartographic Standard (UTM Zone 44N)**:
  For fast planar computational geometry and boundary diffing without ellipsoid convergence loops, geometries within Telangana and Andhra Pradesh are projected to EPSG:32644 (WGS 84 / UTM Zone 44N):
  $$\text{Area}_{\text{planar}} = \text{ST\_Area}(\text{ST\_Transform}(\text{geom}, 32644))$$
- **Precision & Rounding**:
  - Raw area values in database responses are stored in **double precision** square meters ($m^2$).
  - Overlap percentages are computed as floating-point ratios and formatted to **4 decimal places** (e.g., $98.4521\%$).

#### 5.4.2 Quantitative Overlap Rules
Given Geometry $A$ and Geometry $B$:
1. **Bounding Box Pre-check**:
   Before invoking complex intersection algorithms, the GiST index must test bounding box intersection:
   $$\text{geom\_a} \ \&\& \ \text{geom\_b}$$
   If false, $\text{Overlap}(A, B) = 0.0000\%$, $\text{Area}(A \cap B) = 0.0\text{ }m^2$.
2. **Dimensionality Guard**:
   If $A$ and $B$ intersect only at a point or line (e.g., contiguous boundary shared by adjacent mandals), the intersection dimension is $< 2$.
   PostGIS `ST_Dimension(ST_Intersection(A, B)) < 2` must return:
   $$\text{Area}(A \cap B) = 0.0\text{ }m^2, \quad \text{Overlap} = 0.0000\%$$
3. **Overlap Percentage Formulation**:
   - Overlap with respect to $A$ (what fraction of $A$ is covered by $B$):
     $$\text{Overlap}_{A \to B} = \left( \frac{\text{ST\_Area}(\text{ST\_Intersection}(A, B)::\text{geography})}{\text{ST\_Area}(A::\text{geography})} \right) \times 100.0$$
   - Overlap with respect to $B$ (what fraction of $B$ is covered by $A$):
     $$\text{Overlap}_{B \to A} = \left( \frac{\text{ST\_Area}(\text{ST\_Intersection}(A, B)::\text{geography})}{\text{ST\_Area}(B::\text{geography})} \right) \times 100.0$$

### 5.5 Read-Only Topological Anomaly Detection Engine
Cartographic datasets frequently contain digitizing errors. W017 implements a non-destructive anomaly detection engine.

#### 5.5.1 Anomaly Classifications
1. **Sliver Polygons**:
   Extremely narrow, small artifacts resulting from imperfect alignment of adjacent boundaries.
   - Criterion: $\text{Area} < 1000\text{ }m^2$ AND Thinness Ratio:
     $$T = \frac{4 \pi \times \text{Area}}{\text{Perimeter}^2} < 0.05$$
2. **Boundary Overlaps (Unintended Encroachments)**:
   Adjacent administrative units within the same regime whose interiors intersect with area $> 100\text{ }m^2$:
   $$\text{ST\_Overlaps}(A, B) \land \text{ST\_Area}(\text{ST\_Intersection}(A, B)::\text{geography}) > 100.0$$
3. **Topological Gaps**:
   Unassigned void pockets between contiguous mandals that should form a continuous tessellation.
4. **Invalid Geometries**:
   Self-intersecting rings, duplicate vertices, or inverted orientation identified via `ST_IsValidDetail(geom)`.

#### 5.5.2 Absolute Prohibition on Automated Healing
> [!CAUTION]
> **Zero Automated Healing Policy:** Automated geometric healing (e.g., `ST_MakeValid`, `ST_Snap`, automatic vertex snapping) is strictly prohibited on canonical boundaries. Snapping vertices automatically shifts legal boundaries, creates artificial property shifts, and invalidates statutory cartography. All detected anomalies are logged as read-only diagnostic metadata for human cartographic review.

### 5.6 API Surface & ECC-001 Contract Specifications
The W017 spatial gateway endpoints will be registered under `apps/api/src/routes/spatialAnalytics.ts`.

#### 5.6.1 POST `/api/v1/spatial/analytics/overlap`
Computes the spatial intersection and overlap metrics between two entity versions.
- **Request Body**:
  ```json
  {
    "baseEntity": {
      "type": "mandal",
      "entityId": "TS-MDL-4676",
      "versionId": "b18b4567-e89b-12d3-a456-426614174000"
    },
    "comparisonEntity": {
      "type": "constituency",
      "entityId": "TS-AC-023",
      "versionId": "c29c5678-e89b-12d3-a456-426614174001"
    },
    "options": {
      "projection": "EPSG:32644",
      "includeIntersectionGeoJson": false
    }
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "baseEntityAreaM2": 145203940.52,
      "comparisonEntityAreaM2": 450129381.10,
      "intersectionAreaM2": 142099120.15,
      "baseOverlapPercentage": 97.8617,
      "comparisonOverlapPercentage": 31.5685,
      "intersectionType": "MULTIPOLYGON",
      "isDisjoint": false,
      "regimeContext": {
        "baseRegime": "historical_statutory_baseline",
        "comparisonRegime": "historical_statutory_baseline",
        "isCrossRegime": false
      }
    }
  }
  ```
- **Error Response (400 Bad Request / 404 Not Found)** conforming to `ECC-001`:
  ```json
  {
    "error": "SPATIAL_ENTITY_NOT_FOUND",
    "message": "Referenced entity geometry for TS-MDL-4676 not found in requested regime.",
    "statusCode": 404,
    "requestId": "req-spatial-918237",
    "timestamp": "2026-09-29T10:15:00.000Z",
    "code": "ENTITY_GEOMETRY_MISSING"
  }
  ```

#### 5.6.2 POST `/api/v1/spatial/analytics/boundary-diff`
Calculates the spatial difference between two versions of an entity or regime.
- **Request Body**:
  ```json
  {
    "entityId": "TS-MDL-4676",
    "sourceVersionId": "b18b4567-e89b-12d3-a456-426614174000",
    "targetVersionId": "d39d6789-e89b-12d3-a456-426614174002",
    "toleranceMeters": 5.0
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "entityId": "TS-MDL-4676",
      "sourceAreaM2": 145203940.52,
      "targetAreaM2": 150100200.10,
      "netAreaChangeM2": 4896259.58,
      "addedAreaM2": 5200100.20,
      "removedAreaM2": 303840.62,
      "unmodifiedAreaM2": 144900099.90,
      "similarityIndex": 0.9634,
      "diffGeoJson": {
        "type": "FeatureCollection",
        "features": []
      }
    }
  }
  ```

#### 5.6.3 GET `/api/v1/spatial/quality/anomalies`
Scans a geographic envelope or district for topological discrepancies.
- **Query Parameters**:
  - `layer` (string, required): e.g. `mandal`
  - `bbox` (string, required): `minLng,minLat,maxLng,maxLat`
  - `regime` (string, optional): defaults to `historical_2016_2022`
  - `minAreaM2` (number, optional): defaults to `100.0`
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "layer": "mandal",
      "regime": "historical_2016_2022",
      "scannedFeatureCount": 12,
      "anomalyCount": 1,
      "anomalies": [
        {
          "type": "SLIVER_OVERLAP",
          "entityA": "TS-MDL-4676",
          "entityB": "TS-MDL-4677",
          "intersectionAreaM2": 124.50,
          "severity": "LOW",
          "centroid": [79.912, 17.521],
          "actionRequired": "HUMAN_CARTOGRAPHIC_REVIEW"
        }
      ]
    }
  }
  ```

### 5.7 Performance Ceilings, Resource Budgets & Indexing Strategy
To prevent geometric denial-of-service and high CPU loads:
1. **Query Complexity Ceiling**:
   - Maximum bounding box dimension: $2.0^\circ \times 2.0^\circ$ ($\approx 220\text{ km} \times 220\text{ km}$).
   - Maximum features evaluated per analytical call: **100 features**.
   - Requests exceeding 100 features fail closed with HTTP `413 Payload Too Large` / `SPATIAL_QUERY_LIMIT_EXCEEDED`.
2. **PostGIS Indexing Requirements**:
   - Mandatory spatial index `idx_entity_geometries_spatial` using GiST on `geometry`.
   - Bounding box operator `&&` must precede all `ST_Intersects`, `ST_Difference`, and `ST_Intersection` calls.
3. **Statement Timeouts**:
   - API Fastify request timeout: 8000ms.
   - Database connection statement timeout: `SET LOCAL statement_timeout = '5000ms'`.

### 5.8 Observability, Privacy & Audit Telemetry
1. **Structured Telemetry Events**:
   - `SPATIAL_ANALYTICS_QUERY`: Latency, feature count, intersection area, regime.
   - `SPATIAL_ANOMALY_DETECTED`: Coordinate bounding box, anomaly type, severity.
   - `SPATIAL_QUERY_TIMEOUT`: Aborted queries exceeding 5000ms.
2. **Correlation ID & Tracing**:
   - Fastify `x-request-id` passed to SQL queries via SQL comments (`/* request_id: ... */`) for PostgreSQL query log correlation.
3. **Zero PII Invariant**:
   - Spatial boundaries and analytical queries contain purely public administrative geometry. Zero citizen identifiers, phone numbers, or user IDs are handled by or logged within the spatial query engine.

---

## 6. Governing Rules & Constraints

1. **Production Air-Gap (Rule IV-001)**:
   - Production (`ehfafcnimmjusyvplbah`) is strictly air-gapped and untouched.
   - All migrations, procedures, and tests execute exclusively on Staging (`fkpigozcqnmcvofuksar`) or local test runners.
2. **Zero Modification to Entity Geometries (W016 Baseline Preservation)**:
   - Migration 049 must NOT alter, truncate, or re-ingest `public.entity_geometries`.
   - The 589 geometry rows and digest `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` must remain intact.
3. **Strict Plan Gate**:
   - Implementation is strictly forbidden until the CTO explicitly issues `PLAN APPROVED — PROCEED WITH IMPLEMENTATION`.
4. **W016-C3-R10/R11 Isolation**:
   - Do NOT build an APK or perform ad-hoc mobile device rendering. Gap B is deferred to W023.
   - Do NOT retire legacy static assets (R11 remains strictly blocked).

---

## 7. Full Scope of Work (When Authorized)

When authorization is granted, W017 will execute the following bounded scope:

```text
================================================================================
AUTHORIZED IMPLEMENTATION SCOPE MANIFEST (PREFLIGHT PROJECTION)
================================================================================

1. Database Migrations (supabase/migrations/):
   - 049_spatial_gateway_and_boundary_diff.sql (NEW)
   - verification_049_spatial_gateway.sql (NEW)
   - rollback_049_spatial_gateway.sql (NEW)

2. Backend API Runtime (apps/api/src/):
   - routes/spatialAnalytics.ts (NEW)
   - services/spatialAnalyticsService.ts (NEW)
   - __tests__/spatial-analytics.test.ts (NEW)
   - server.ts (ROUTE REGISTRATION ONLY)

3. Shared Types & Contracts (packages/shared/src/):
   - types/spatialAnalytics.ts (NEW)

4. Governance & Verification Tests:
   - tests/spatial-invariants.test.mjs (NEW)
   - reports/w017_spatial_engine_verification.json (NEW)
   - reports/w017_implementation_report.md (NEW)

================================================================================
TOTAL FILES TO CREATE/MODIFY: 11 files
TOUCHING PRODUCTION: STRICTLY ZERO (0)
TOUCHING ENTITY_GEOMETRIES ROWS: STRICTLY ZERO (0)
================================================================================
```

---

## 8. Explicit Out-of-Scope Boundaries (Non-Goals)

To prevent scope creep and maintain strict containment, the following items are declared **EXPLICITLY OUT OF SCOPE**:
1. **Zero Cartographic Data Ingestion**: No new GeoJSON, Shapefiles, or external geometries will be loaded in W017.
2. **Zero Auto-Healing**: No algorithms that automatically shift, snap, or simplify geometry vertices to force compliance.
3. **Zero Mobile App Rendering Changes**: No modifications to `apps/mobile/lib/api/endpoints/spatial.ts` or MapLibre components.
4. **Zero Legacy Asset Deletion**: Static spatial assets (`assets/spatial/`) remain untouched (R11 boundary preserved).
5. **Zero Synthetic Delimitation Truth**: W017 will not fabricate imaginary parliamentary or assembly delimitation proposals. Queries will benchmark strictly against repository truth (`mandal_constituency_map`, 12 seed mandals, 589 historical geometries).

---

## 9. Step-by-Step Implementation Plan (Future Phase 4)

Upon CTO ratification, execution will proceed through five structured gates:

### Gate 1: Append-Only Migration Packaging (Migration 049)
- Author `049_spatial_gateway_and_boundary_diff.sql`.
- Implement `fn_spatial_calculate_overlap`, `fn_spatial_boundary_diff`, `fn_spatial_detect_anomalies`.
- Apply strict `SECURITY INVOKER` / `SET search_path = public, pg_temp;`.
- Author matching `rollback_049_spatial_gateway.sql` and `verification_049_spatial_gateway.sql`.

### Gate 2: Staging Database Deployment & Verification
- Execute Migration 049 against Staging Supabase (`fkpigozcqnmcvofuksar`).
- Execute verification script proving function existence, permissions, and timeout controls.
- Verify 589 geometry row count and digest remain untouched.

### Gate 3: Fastify Spatial Analytics Service & Routes
- Implement `spatialAnalyticsService.ts` with PostGIS RPC bindings and bounding box pre-filtering.
- Register `/api/v1/spatial/analytics/overlap`, `/boundary-diff`, and `/quality/anomalies` in `spatialAnalytics.ts`.
- Enforce schema validation and canonical `sendApiError` envelopes.

### Gate 4: Mathematical Invariant & Regression Battery
- Execute 100% automated test battery verifying:
  - Spheroidal area calculations.
  - Overlap symmetry and identity invariants.
  - Read-only anomaly detection.
  - 5000ms statement timeout enforcement.
- Run complete repo regression battery (API build, mobile typecheck, contract drift, commit freshness).

### Gate 5: Evidence Closure & Independent Verification
- Generate `reports/w017_spatial_engine_verification.json` and implementation reports.
- Dispatch Independent Verifier agent for multi-gate audit.
- Update `EXECUTION_STATE.md` and `ACCEPTANCE_REGISTER.md`.

---

## 10. Verification & Testing Strategy

### 10.1 Mathematical Invariant Tests
The automated verification suite (`tests/spatial-invariants.test.mjs`) will enforce four foundational mathematical properties of the spatial engine:

1. **Symmetry Invariant**:
   For any two valid geometries $A$ and $B$:
   $$\text{Area}(A \cap B) \equiv \text{Area}(B \cap A) \quad (\pm 0.001\text{ }m^2)$$
2. **Identity Invariant**:
   For any valid geometry $A$:
   $$\text{Overlap}(A, A) \equiv 100.0000\% \quad (\pm 0.0001\%)$$
3. **Disjoint Invariant**:
   For any two geometries $A$ and $B$ where $A \cap B = \emptyset$ (e.g. Adilabad Urban and Sattupalli mandals):
   $$\text{Area}(A \cap B) = 0.0\text{ }m^2, \quad \text{Overlap}(A, B) = 0.0000\%$$
4. **Partition Invariant**:
   If geometry $A$ is partitioned into disjoint sub-polygons $\{P_1, P_2, \dots, P_k\}$ such that $\bigcup P_i = A$:
   $$\sum_{i=1}^k \text{Area}(P_i) \equiv \text{Area}(A) \quad (\pm 0.01\text{ }m^2)$$

### 10.2 Ground Truth Benchmarks
- Benchmark calculations against the **12 verified seed mandals** established in W013/W014.
- Validate mandal-to-assembly constituency overlaps against the ground-truth mappings in `mandal_constituency_map`.

---

## 11. Negative-Path Testing Specification

To guarantee fail-closed resilience, the test suite must explicitly assert non-zero failure handling on the following edge cases:

| Test Case ID | Input Condition | Expected System Behavior | Asserted Output |
| :--- | :--- | :--- | :--- |
| **NEG-17-01** | Malformed / Self-intersecting GeoJSON input | Rejection at schema validation layer | HTTP 400 `INVALID_GEOMETRY_FORMAT` |
| **NEG-17-02** | Invalid or unsupported SRID (e.g. EPSG:3857) | Fastify validator rejects unexpected coordinate system | HTTP 422 `UNSUPPORTED_SRID` |
| **NEG-17-03** | Query spanning $> 100$ features | Complexity ceiling triggered | HTTP 413 `SPATIAL_QUERY_LIMIT_EXCEEDED` |
| **NEG-17-04** | Artificially delayed geometric query (> 5000ms) | PostgreSQL statement timeout aborts query | HTTP 504 `SPATIAL_QUERY_TIMEOUT` |
| **NEG-17-05** | Entity ID not found in database | Service returns canonical 404 envelope | HTTP 404 `ENTITY_GEOMETRY_MISSING` |
| **NEG-17-06** | Cross-regime comparison without explicit flag | Gateway refuses implicit temporal conflation | HTTP 400 `REGIME_MISMATCH_DISALLOWED` |

---

## 12. Evidence Generation Plan

Upon execution, the following machine-readable and human-readable evidence artifacts will be produced:
1. `reports/w017_preflight_reconciliation.json`: Preflight status and prerequisites verification (already generated).
2. `reports/w017_spatial_engine_verification.json`: Execution log containing:
   - Verbatim SQL function creation logs.
   - Exact execution times for overlap and boundary diff queries.
   - Bounding box query plans proving GiST index scans (`idx_entity_geometries_spatial`).
   - Spheroidal vs planar benchmark deviation table.
3. `reports/w017_mathematical_invariants.json`: Results of the 4 mathematical invariant test suites.
4. `reports/w017_implementation_report.md`: Comprehensive engineering closure documentation.

---

## 13. Reconciliation Plan

The W017 spatial calculations will be reconciled against:
1. **Constituency Membership**: Cross-verify that mandals known to lie wholly within a single constituency (e.g. Kuravi in Dornakal AC) show $\approx 100.0\%$ spatial containment in `fn_spatial_calculate_overlap`.
2. **Historical vs Current Integrity**: Confirm that queries targeting `historical_2016_2022` return results derived strictly from the 589 baseline rows, with zero contamination from unverified external datasets.
3. **Database Ledger Consistency**: Reconcile Migration 049 registration in `schema_migrations` / migration bundler script.

---

## 14. Independent Verification Specification

Under Master Execution Framework Amendment v1.4 / Rule IV-001, implementation cannot be accepted without independent verification. The Independent Verifier will execute a segregated audit protocol:
1. **Clean Working Tree**: Verify working directory is clean and HEAD matches remote origin.
2. **Database Catalog Audit**: Inspect `pg_proc` on staging to verify function ownership (`postgres`/`service_role`), `prosecdef` status, and fixed `search_path`.
3. **589 Baseline Immutability Audit**: Independently re-hash `public.entity_geometries` and verify SHA-256 matches `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`.
4. **Automated Suite Re-Execution**: Run all mathematical and regression test suites independently.
5. **Contract Drift Verification**: Ensure the 3 new endpoints are properly audited and do not introduce unhandled contract drift.

---

## 15. Risks, Failure Modes & Mitigations

| Risk ID | Risk Description | Severity | Mitigation Strategy |
| :--- | :--- | :---: | :--- |
| **RSK-17-01** | Complex geometric intersection triggers high CPU usage and thread blocking in Fastify. | High | Spatial computation is delegated entirely to PostGIS worker processes; Fastify handles only streaming serialization. Statement timeout capped at 5000ms. |
| **RSK-17-02** | Latitude-dependent distortion in spheroidal area calculations. | Medium | Standardize on spheroidal geography casting (`::geography`) or UTM Zone 44N (`EPSG:32644`). Prohibit raw 4326 degree math. |
| **RSK-17-03** | Temporal conflation: Users assume historical 2016 mandal boundaries reflect present-day 2026 ground reality. | High | API responses explicitly return `regimeContext` with warnings when historical baselines are queried. |
| **RSK-17-04** | Accidental mutation or deletion of the 589 baseline geometries. | Critical | Existing immutability trigger `trg_prevent_entity_geometry_mutation` rejects all updates/deletes; Migration 049 contains ZERO DML on `entity_geometries`. |

---

## 16. Rollback & Recovery Strategy

If an anomaly is detected during staging deployment or verification:
1. **Immediate Execution Rollback**:
   Execute `supabase/rollback_049_spatial_gateway.sql`:
   ```sql
   BEGIN;
   DROP FUNCTION IF EXISTS public.fn_spatial_calculate_overlap;
   DROP FUNCTION IF EXISTS public.fn_spatial_boundary_diff;
   DROP FUNCTION IF EXISTS public.fn_spatial_detect_anomalies;
   COMMIT;
   ```
2. **Fastify Route Isolation**:
   Revert route registration in `apps/api/src/server.ts` or disable via environment flag `ENABLE_SPATIAL_ANALYTICS=false`.
3. **Database Integrity Preservation**:
   Because Migration 049 is strictly additive (creating stored procedures only), rolling back leaves `public.entity_geometries` and the 589 geometries completely unaffected.

---

## 17. Impact Assessment

- **Database Storage**: Zero additional table rows; minimal catalog metadata for 3 functions.
- **Database CPU / Memory**: Bounded by 5000ms statement timeout and 100-feature ceiling.
- **API Runtime**: Lightweight Fastify route wrappers with schema validation. Zero blocking synchronous CPU in Node.js event loop.
- **Mobile Client**: Zero impact. No mobile bundle changes; existing MapLibre tile paths (`/geo/tiles`) remain untouched.

---

## 18. Acceptance Criteria

Milestone W017 will be deemed complete if and only if all 12 criteria are satisfied:
1. [ ] Migration 049 is strictly additive, creating 3 spatial analytical stored procedures with verified `SECURITY INVOKER` or audited `SECURITY DEFINER` (`SET search_path = public, pg_temp;`).
2. [ ] `public.entity_geometries` row count remains exactly 589, and SHA-256 digest matches `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`.
3. [ ] Area calculations utilize spheroidal geography (`::geography`) or UTM Zone 44N projection (`EPSG:32644`), with zero raw degree area calculations.
4. [ ] Quantitative overlap rules enforce bounding box pre-checks (`&&`) and return 0.0% for disjoint or dimension < 2 intersections.
5. [ ] Topological anomaly engine is strictly read-only diagnostics; zero automated geometry healing or vertex mutation occurs.
6. [ ] API endpoints `/api/v1/spatial/analytics/overlap`, `/boundary-diff`, and `/quality/anomalies` conform to `ECC-001` error envelopes.
7. [ ] Maximum query feature ceiling (100 features) and 5000ms statement timeout are enforced and proven via negative tests.
8. [ ] Mathematical invariants (Symmetry, Identity, Disjoint, Partition) pass 100% in automated testing.
9. [ ] Ground-truth benchmarks against the 12 seed mandals and `mandal_constituency_map` match expected spatial containment.
10. [ ] Production environment (`ehfafcnimmjusyvplbah`) remains completely untouched and air-gapped.
11. [ ] W016-C3-R10 Gap B remains deferred to W023; R11 remains strictly blocked; zero APK or device testing is attempted.
12. [ ] Full independent verification audit passes with zero blocking exceptions.

---

## 19. Artifact & Commit Lineage Map

| Phase / Item | Planned Artifact Path | Purpose |
| :--- | :--- | :--- |
| **Preflight** | `reports/w017_preflight_reconciliation.json` | Prerequisite & baseline reconciliation |
| **Master Plan** | `PLAN-W017-REV-1.0.md` | Formal architecture & execution specification |
| **Migration Package** | `supabase/migrations/049_spatial_gateway_and_boundary_diff.sql` | Spatial procedures & security grants |
| **Migration Verifier** | `supabase/verification_049_spatial_gateway.sql` | Post-migration catalog & permission assertions |
| **Migration Rollback** | `supabase/rollback_049_spatial_gateway.sql` | Clean down-migration script |
| **API Route** | `apps/api/src/routes/spatialAnalytics.ts` | Fastify analytics endpoints |
| **API Service** | `apps/api/src/services/spatialAnalyticsService.ts` | PostGIS query mediation & validation |
| **Verification Suite** | `tests/spatial-invariants.test.mjs` | Automated mathematical invariant tests |
| **Evidence Report** | `reports/w017_spatial_engine_verification.json` | Machine-readable execution logs & timings |
| **Implementation Report** | `reports/w017_implementation_report.md` | Comprehensive human-readable closure report |

---

## 20. Amendment Compliance Matrix

| Amendment Domain | Compliance Clause | Plan Adherence & Enforcement Mechanism |
| :--- | :--- | :--- |
| **Rule IV-001** | Production Air-Gap | Production database (`ehfafcnimmjusyvplbah`) is completely excluded from scripts and credentials. |
| **Amendment v1.4** | Independent Verification | Separate independent verification step required prior to milestone closure. |
| **Amendment v1.5-A** | 22-Section Planning Specification | This plan follows all 22 required sections verbatim. |
| **Amendment v1.6 (ECC-001)** | Canonical Error Envelopes | All error responses strictly implement `sendApiError` with `{ error, message, statusCode, requestId, timestamp }`. |
| **Amendment v1.6 (USI-001)** | Unambiguous Scope Boundary | Manifest of 11 files strictly defined; zero modification to `entity_geometries`. |
| **Amendment v1.6 (SDB-001)** | State & Data Resilience | Clean rollback scripts authored and tested; read-only guarantees on canonical geometry rows. |

---

## 21. Operational Declarations

### 21.1 Pre-Implementation Declaration (Amendment v1.5-A Section 27)
> **DECLARATION:**  
> I hereby declare that this implementation plan (`PLAN-W017-REV-1.0.md`) represents a complete, rigorous, and truthful pre-implementation specification for Milestone W017.  
> No application code, database migrations, or infrastructure changes have been executed for W017 prior to this submission.  
> The 589 geometry baseline in `public.entity_geometries` remains intact, verified, and untouched.  
> Production remains strictly air-gapped.  
> Execution is halted at Phase 3 pending explicit CTO ratification.

---

## 22. Plan Sign-Off & Review Request

### 22.1 Review Request
This document is formally submitted to the **Chief Technology Officer (CTO)** for architectural review and ratification.

### 22.2 Ratification Action Required
Implementation of Milestone W017 will **NOT** begin until the CTO provides the canonical approval statement:
> `PLAN APPROVED — PROCEED WITH IMPLEMENTATION ACCORDING TO THE APPROVED PLAN.`

---
*End of Master Implementation Plan W017 Revision 1.0*
