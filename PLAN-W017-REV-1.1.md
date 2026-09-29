# MASTER IMPLEMENTATION PLAN: W017 — SPATIAL GATEWAY, BOUNDARY DIFF & SPATIAL QUERY ENGINE
## REVISION 1.1 (REVISED PRE-IMPLEMENTATION PLANNING SPECIFICATION)

---

### OPERATIONAL STATUS & AUTHORIZATION DECLARATION

```text
================================================================================
JOB W017 MASTER IMPLEMENTATION PLAN — REVISION 1.1
AUTHORIZATION STATUS: SUBMITTED FOR FINAL CTO IMPLEMENTATION AUTHORIZATION
================================================================================

PLAN STATUS:                         DRAFT / SUBMITTED FOR FINAL CTO IMPLEMENTATION AUTHORIZATION
IMPLEMENTATION AUTHORIZATION:        STRICTLY NOT AUTHORIZED (NO)
CURRENT ACTIVE PHASE:                PHASE 3 (PLANNING SPECIFICATION GATE ONLY)
TARGET ENVIRONMENT:                  STAGING SUPABASE (fkpigozcqnmcvofuksar) ONLY
PRODUCTION ENVIRONMENT:              STRICTLY AIR-GAPPED & UNTOUCHED (ehfafcnimmjusyvplbah)
W016-C3-R10 STATUS:                  CONDITIONALLY ACCEPTED (GAP B DEFERRED TO W023)
W016-C3-R11 STATUS:                  STRICTLY BLOCKED
589 GEOMETRY BASELINE:               READ-ONLY & FROZEN (DIGEST: f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b)
SECURITY ARCHITECTURE:               100% SECURITY INVOKER ACROSS ALL SPATIAL FUNCTIONS
CODE MUTATIONS AUTHORIZED:           ZERO (0)
DATABASE MIGRATIONS AUTHORIZED:      ZERO (0)
STOP STATE:                          YES — AWAITING FORMAL CTO RATIFICATION

================================================================================
```

---

## 1. Document Title & Metadata

- **Document Identifier**: `PLAN-W017-REV-1.1`
- **Milestone Code**: `W017`
- **Milestone Title**: Spatial Gateway, Boundary Diff & Spatial Query Engine
- **Revision**: 1.1 (Reconciled against CTO Security Correction Directive of 2026-09-29)
- **Supersedes**: `PLAN-W017-REV-1.0` (returned for temporal, identity, area, security, and migration scope corrections)
- **Date**: 2026-09-29
- **Operating Authority**: 
  - AI Agent Master Execution Job Book & `AGENT_EXECUTION_PROTOCOL.md`
  - Master Execution Framework Amendments v1.2, v1.3, v1.4, v1.5, v1.5-A, and v1.6
  - CTO Formal Acceptance of W011 (`DEC-068`)
  - CTO Formal Acceptance of W015 (`DEC-062`)
  - CTO Governance Directives for W016-C3-R10 (Gap B Deferred to W023)
  - CTO W017 Security Correction Directive (100% `SECURITY INVOKER` Bounded Privilege Model)
- **Target Repository**: `kshetra-app/Kshetra`
- **Canonical Branch**: `master`
- **Audited Baseline Commit**: `1540ba3a7717d2f6b81777a947ca1fc21f7e0ff1`
- **Preflight Reconciliation Reference**: `reports/w017_preflight_reconciliation.json` (Revision 1.1-SEC-CORRECTED)
- **Target Staging Database**: `panIN-staging` (`fkpigozcqnmcvofuksar.supabase.co`)
- **Production Database**: `panIN-production` (`ehfafcnimmjusyvplbah.supabase.co`) — **STRICTLY AIR-GAPPED**

---

## 2. Problem Statement & Executive Summary

### 2.1 The Core Architectural Challenge
Milestone W016 established the platform's initial spatial storage baseline by loading 589 statutory mandal polygons into PostGIS (`public.entity_geometries`), verified under cryptographic SHA-256 digest `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`, and exposing vector tiles (`/geo/tiles`) and point location (`/geo/locate`).

However, that spatial dataset represents a historical snapshot as of **2016-10-11** (the initial Telangana district/mandal reorganization). Telangana experienced subsequent administrative re-organizations and mandal splits (such as in 2020 and multiple notifications in 2022). Milestone W017 addresses the higher-order spatial computation and analytical query layer required to compare administrative, electoral, and redistricting boundaries across time and scenarios without:
1. Conflating historical snapshots with current operational legal geography;
2. Conflating mutable external codes (such as LGD codes) with immutable entity identities;
3. Incurring cartographic distortion via inappropriate coordinate reference systems;
4. Executing un-audited, elevated, or overly privileged database stored procedures (`SECURITY DEFINER`);
5. Distorting statutory boundaries through automated, non-adjudicated "healing".

### 2.2 Core Objective
To author a mathematically sound, enterprise-grade, append-only spatial gateway that provides boundary diffing, intersection calculations, and topological quality assurance over PostGIS while maintaining zero mutation of underlying geometry tables, preserving the strict air-gap to production, and implementing an unprivileged, 100% `SECURITY INVOKER` bounded security architecture.

---

## 3. Current State Analysis & Lineage Prerequisites

### 3.1 Preceding Milestones Lineage Ledger
All prerequisite milestones in the geographic and governance chain are closed and verified:

| Prerequisite | Status | Evidence Reference | Notes / Invariants |
| :--- | :---: | :--- | :--- |
| **W011** | **ACCEPTED / COMPLETE** | `DEC-068`, `ca062d1`, `1540ba3` | Mutation integrity, synthetic ID elimination, Gate 6 8/8 PASS |
| **W012** | **ACCEPTED / COMPLETE** | Migration 039, `DEC-058` | Data provenance, dataset versioning, evidence chains |
| **W013** | **ACCEPTED / COMPLETE** | Migration 040, `DEC-059` | Hierarchical administrative parentage & integrity |
| **W014** | **ACCEPTED / COMPLETE** | Migration 041/044, `DEC-065`, `DEC-066` | Temporal validity intervals (`valid_from`, `valid_to`), GiST exclusion |
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
- **Temporal Classification**: All 589 rows have `temporal_classification = 'historical_statutory_baseline'`, `snapshot_date = '2016-10-11'`, `is_current = false`.
- **Legal Validity Reality**: These 589 polygons reflect the statutory reorganization of 2016-10-11. They did **not** remain legally valid continuously through 2022 due to subsequent gazetted reorganizations and splits.
- **Immutability Enforcement**: Protected by trigger `trg_prevent_entity_geometry_mutation` against modifications to ID, spatial coordinates, entity type, mandal version, or dataset version.

---

## 4. Fact / Inference / Assumption / Unknown Register

| Category | ID | Statement | Architectural Consequence |
| :--- | :---: | :--- | :--- |
| **Fact** | `FACT-17-01` | The 589 rows in `entity_geometries` represent the 2016-10-11 reorganization baseline snapshot (`snapshot_date = '2016-10-11'`). | The 589 polygons must NOT be represented as current geography or assumed to remain static through 2022. |
| **Fact** | `FACT-17-02` | `entity_geometries.geometry` is stored in EPSG:4326 (angular degrees). | Computing area via raw `ST_Area(geom)` computes square degrees, varying with latitude and invalid for physical metric analysis. |
| **Fact** | `FACT-17-03` | R10 native MapLibre renderer verification is deferred to W023. | W017 is strictly backend and database-centric; zero mobile UI or client-side MapLibre changes are in scope. |
| **Fact** | `FACT-17-04` | Existing index `idx_entity_geometries_spatial` (GiST) on `entity_geometries.geometry` was created in Migration 048. | Migration 049 does not need to duplicate spatial indexing on `entity_geometries`. |
| **Fact** | `FACT-17-05` | Tables `public.entity_geometries` and `public.mandal_versions` grant SELECT to `service_role` and `authenticated` under RLS policies with `USING (true)`. | Spatial analytical procedures do NOT require `SECURITY DEFINER` to read geometries; `SECURITY INVOKER` functions execute with complete read access. |
| **Inference** | `INF-17-01` | Spheroidal geography (`ST_Area(geom::geography)`) is the only projection-independent cross-boundary area standard on WGS84. | Spheroidal geography must be the platform default for metric area; planar projections (such as UTM Zone 44N EPSG:32644) are permitted only when specifically justified per regional extent. |
| **Inference** | `INF-17-02` | Automated healing of boundary overlaps causes arbitrary border relocation. | Topological anomaly engine must be strictly read-only diagnostic detection; no auto-healing is permitted. |
| **Assumption**| `ASM-17-01` | Complex geometric analysis endpoints will be invoked via Fastify by authenticated users or backend tasks. | Functions should NOT be granted to `anon`; access must be restricted to `service_role` and `authenticated`. |
| **Unknown**   | `UNK-17-01` | Formal publication date of the upcoming Delimitation Commission draft notifications. | W017 must model `future` and `scenario` regimes as distinct analytical spaces without claiming them as official legal truth until gazetted and evidence-bound. |

---

## 5. Target Architecture & Technical Specifications

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                           FASTIFY SPATIAL GATEWAY                            │
│                                                                              │
│  POST /api/v1/spatial/analytics/overlap        (Auth: authenticated/service) │
│  POST /api/v1/spatial/analytics/boundary-diff  (Auth: authenticated/service) │
│  GET  /api/v1/spatial/quality/anomalies        (Auth: service_role only)     │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ (Parameterized RPC / Typed Client)
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    DATABASE SPATIAL ENGINE (MIGRATION 049)                   │
│                                                                              │
│  • fn_spatial_calculate_overlap(...)   [SECURITY INVOKER / auth, service]    │
│  • fn_spatial_boundary_diff(...)       [SECURITY INVOKER / auth, service]    │
│  • fn_spatial_detect_anomalies(...)    [SECURITY INVOKER / service_role only]│
│                                                                              │
│  Security: 100% SECURITY INVOKER; Zero elevated superuser/definer privileges │
│  Compute:  Spheroidal (ST_Area(::geography)) primary; extent planar fallback │
│  Limits:   5000ms statement_timeout, max 100 features, GiST && pre-filter    │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ (Read-Only Scan via GiST)
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│               CANONICAL POSTGIS STORAGE (public.entity_geometries)           │
│                                                                              │
│  589 Historical Baseline Geometries (Snapshot: 2016-10-11, SHA-256 verified) │
│  Status: READ-ONLY / FROZEN / ZERO MUTATIONS                                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Typed Spatial-Selection Model & Regime Semantics
Rather than forcing an ad-hoc four-regime model or a blanket `regime_id or as_of` requirement, W017 integrates directly with the accepted W014/W016 selection architecture:

```typescript
export interface SpatialSelectionCriteria {
  mode: 'current' | 'as_of' | 'version' | 'future' | 'scenario';
  asOfDate?: string;      // Required if mode === 'as_of' (YYYY-MM-DD)
  versionId?: string;     // Required if mode === 'version' (UUID)
  scenarioId?: string;    // Required if mode === 'scenario' (UUID)
  futureRegimeId?: string;// Required if mode === 'future' (e.g. 'delimitation_post2026_draft')
}
```

#### 5.1.1 Selection Semantics
1. **`current` (Active Operational Legal Regime)**:
   - Queries records where `is_current = true` and `valid_to IS NULL`.
   - **Fail-Closed Rule**: If a mandal has only a 2016 historical baseline geometry and no row with `is_current = true`, a `current` query returns `404 SPATIAL_CURRENT_GEOMETRY_UNAVAILABLE`. It **never** silently falls back to historical rows.
2. **`as_of` (Historical Point-in-Time Selection)**:
   - Evaluates:
     $$\text{valid\_from} \le \text{as\_of} \quad \land \quad (\text{valid\_to IS NULL} \lor \text{valid\_to} > \text{as\_of})$$
   - Allows selecting the exact statutory snapshot for dates such as `2016-10-11`, `2020-03-01`, `2022-07-23`, etc.
3. **`version` (Explicit Version Selection)**:
   - Queries directly by `mandal_versions.id = version_id`.
   - Bypasses temporal range filtering to resolve the exact statutory entity version requested.
4. **`future` (Anticipated Statutory Regime)**:
   - Queries future gazetted boundaries (`valid_from > current_date`) or formally designated post-2026 delimitation draft proposals.
   - Enforces isolation: Future data cannot be returned by `current` or `as_of` queries.
5. **`scenario` (Proposed / Simulation Regime)**:
   - Queries proposed boundary shifts from the scenario modeling store.
   - Strictly isolated from legal regimes; flagged with `is_scenario: true`.

#### 5.1.2 Cross-Regime Comparison Guard
When boundary diffing or calculating overlap between two entities from different regimes or temporal modes (e.g., `as_of: 2016-10-11` vs `current`, or `current` vs `future`):
- The API response **must** include an explicit `regimeContext` block:
  ```json
  {
    "isCrossRegime": true,
    "baseSelection": { "mode": "as_of", "asOfDate": "2016-10-11" },
    "comparisonSelection": { "mode": "current" },
    "warning": "CROSS_REGIME_COMPARISON: Base represents historical snapshot (2016-10-11) and does not reflect current legal boundaries."
  }
  ```
- Cross-regime comparisons are barred from being cached or returned as legal boundary definitions.

### 5.2 Identity Model Disambiguation
To prevent confusing primary keys with mutable administrative codes, W017 enforces strict identity separation:

| Identity Concept | Type / Schema | Table / Column | Immutability & Scope |
| :--- | :--- | :--- | :--- |
| **`entity_id`** | UUID | `public.mandals.id` | **Permanent, stable internal anchor**. Immutable primary key identifying the entity across all historical versions, boundary changes, and re-organizations. *(Note: NOT the external LGD code, which can change).* |
| **`version_id`** | UUID | `public.mandal_versions.id` | **Temporal version identifier**. Identifies a specific validity interval (`valid_from` to `valid_to`) of an entity's attributes. |
| **`geometry_id`** | UUID | `public.entity_geometries.id` | **Physical spatial record identifier**. Identifies the specific polygon row in PostGIS, tied to a cryptographic digest and snapshot metadata. |
| **`source_feature_id`** | TEXT | `entity_geometries.source_feature_id` | **Source artifact feature identifier**. Origin feature identifier in the raw cartographic source (e.g. `FID_286`, `OBJECTID_14`, GeoJSON feature id). |

> [!IMPORTANT]
> **Identity Rule**: External Local Government Directory (LGD) codes (e.g. `4676` for Kuravi) are mutable administrative attributes recorded in `mandal_versions.lgd_code` and `mandals.code`. They are **NOT** the stable `entity_id`. If MoPR renumbers an LGD code, `entity_id` (`mandals.id`) remains unchanged.

### 5.3 Area & Overlap Calculation Methodology

#### 5.3.1 The Area Standard
- **Primary Cross-Boundary Measurement Standard**:
  All area calculations default to PostGIS geography casting on the WGS 84 ellipsoid:
  $$\text{Area}_{\text{geog}} = \text{ST\_Area}(\text{geom}::\text{geography})$$
  - **Units**: Square meters ($m^2$).
  - **Spheroid**: WGS 84 ellipsoidal geometry (true geodesic surface area).
  - **Validity Precondition**: Must satisfy `ST_IsValid(geom)` before casting.
  - **Precision**: Double precision (IEEE 754 64-bit float).
  - **Rounding**: Double precision in database functions; formatted to 2 decimal places in human-facing API payloads (e.g. `145203940.52 m²`), and converted to $km^2$ via $\text{Area}_{m^2} / 1\,000\,000.0$.
- **Projected Planar Coordinate Reference System (CRS)**:
  - Planar CRS projection is **NOT** a universal standard.
  - Planar projection (e.g., `ST_Transform(geom, 32644)` for UTM Zone 44N) is authorized **strictly** when justified per regional extent for planar computational efficiency in local boundary diffing where scale distortion is verified to be $< 0.1\%$.
  - Queries operating across zones or spanning large extents must strictly use spheroidal geography (`::geography`).
- **Zero-Area & Degenerate Behavior**:
  - Point intersections (dimension 0), linestring intersections (dimension 1), disjoint geometries, or empty geometries yield strictly:
    $$\text{Area} = 0.0\text{ }m^2, \quad \text{Overlap} = 0.0000\%$$

#### 5.3.2 Quantitative Overlap Rules
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
   - Overlap percentages are formatted to **4 decimal places** (e.g. $98.4521\%$).

### 5.4 Granular, Per-Function Database Security Architecture (100% `SECURITY INVOKER`)

#### 5.4.1 Architectural Determination on `SECURITY DEFINER`
A critical architectural inquiry was conducted regarding whether `fn_spatial_detect_anomalies` requires `SECURITY DEFINER`:
1. **Catalog Privilege Audit**: Table `public.entity_geometries` (Migration 048) and `public.mandal_versions` (Migration 041) explicitly grant `SELECT` to `service_role` and `authenticated`.
2. **RLS Policy Audit**: `entity_geometries` has policy `"Public read entity_geometries"` (`FOR SELECT TO anon, authenticated USING (true)`) and `"Service role full access entity_geometries"` (`FOR ALL TO service_role USING (true)`).
3. **Execution Analysis**: Anomaly detection performs read-only spatial joins (`ST_Overlaps`, `ST_Area`, `ST_Perimeter`, `ST_IsValidDetail`). It requires **zero** table mutations, **zero** schema changes, **zero** access to privileged internal credentials, and **zero** bypass of RLS barriers.
4. **Conclusion**: `SECURITY DEFINER` is **completely unnecessary**. By specifying `fn_spatial_detect_anomalies` as **`SECURITY INVOKER`**, execution runs strictly under the caller's authorized privileges (`service_role`). This completely eliminates:
   - Superuser (`postgres`) privilege escalation risks;
   - Search path hijacking risks;
   - Table ownership leakage.

Therefore, **ALL THREE** spatial analytical functions in Milestone W017 are specified as **`SECURITY INVOKER`**.

#### 5.4.2 Function 1: `fn_spatial_calculate_overlap`
- **Signature**:
  ```sql
  public.fn_spatial_calculate_overlap(
    p_geom_a GEOMETRY,
    p_geom_b GEOMETRY,
    p_use_planar BOOLEAN DEFAULT false,
    p_planar_srid INTEGER DEFAULT 32644
  ) RETURNS TABLE(
    area_a_m2 DOUBLE PRECISION,
    area_b_m2 DOUBLE PRECISION,
    intersection_area_m2 DOUBLE PRECISION,
    overlap_pct_a DOUBLE PRECISION,
    overlap_pct_b DOUBLE PRECISION,
    intersection_dimension INTEGER,
    is_disjoint BOOLEAN
  )
  ```
- **Security Mode**: `SECURITY INVOKER`
- **Owner**: `postgres`
- **Caller Roles**: `authenticated`, `service_role` (NO `anon`)
- **ACL Statements**:
  ```sql
  REVOKE ALL ON FUNCTION public.fn_spatial_calculate_overlap FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.fn_spatial_calculate_overlap TO authenticated, service_role;
  ```
- **Search Path**: Default caller path (runs as invoker).
- **RLS Implications**: Calling queries inherit row level security on referenced tables.
- **Underlying Privileges**: `SELECT` on `public.entity_geometries`.
- **Resource Limits**: `SET LOCAL statement_timeout = '5000ms'`.
- **Justification**: Pure geometric intersection over input geometries; does not access privileged system tables. `SECURITY INVOKER` provides safe, unprivileged execution.

#### 5.4.3 Function 2: `fn_spatial_boundary_diff`
- **Signature**:
  ```sql
  public.fn_spatial_boundary_diff(
    p_source_geom GEOMETRY,
    p_target_geom GEOMETRY,
    p_tolerance_m DOUBLE PRECISION DEFAULT 1.0
  ) RETURNS TABLE(
    source_area_m2 DOUBLE PRECISION,
    target_area_m2 DOUBLE PRECISION,
    net_change_m2 DOUBLE PRECISION,
    added_area_m2 DOUBLE PRECISION,
    removed_area_m2 DOUBLE PRECISION,
    unmodified_area_m2 DOUBLE PRECISION,
    similarity_index DOUBLE PRECISION,
    added_geom GEOMETRY,
    removed_geom GEOMETRY
  )
  ```
- **Security Mode**: `SECURITY INVOKER`
- **Owner**: `postgres`
- **Caller Roles**: `authenticated`, `service_role` (NO `anon`)
- **ACL Statements**:
  ```sql
  REVOKE ALL ON FUNCTION public.fn_spatial_boundary_diff FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.fn_spatial_boundary_diff TO authenticated, service_role;
  ```
- **Search Path**: Default caller path.
- **RLS Implications**: Enforces invoker table RLS.
- **Underlying Privileges**: `SELECT` on `public.entity_geometries`.
- **Resource Limits**: `SET LOCAL statement_timeout = '5000ms'`. Maximum vertex count per geometry capped at 50,000 vertices; fails closed with error `SPATIAL_GEOMETRY_COMPLEXITY_EXCEEDED` if exceeded.
- **Justification**: Does not require elevated privileges; invoker rights ensure security boundary is maintained.

#### 5.4.4 Function 3: `fn_spatial_detect_anomalies`
- **Signature**:
  ```sql
  public.fn_spatial_detect_anomalies(
    p_layer TEXT,
    p_bbox GEOMETRY,
    p_profile_version TEXT DEFAULT 'v1.0-standard',
    p_max_sliver_area_m2 DOUBLE PRECISION DEFAULT 1000.0,
    p_thinness_threshold DOUBLE PRECISION DEFAULT 0.05
  ) RETURNS TABLE(
    anomaly_type TEXT,
    entity_a_id UUID,
    entity_b_id UUID,
    anomaly_area_m2 DOUBLE PRECISION,
    severity TEXT,
    centroid GEOMETRY,
    diagnostic_details JSONB
  )
  ```
- **Security Mode**: `SECURITY INVOKER`
- **Owner**: `postgres`
- **Caller Roles**: `service_role` ONLY (NO `authenticated`, NO `anon`)
- **ACL Statements**:
  ```sql
  REVOKE ALL ON FUNCTION public.fn_spatial_detect_anomalies FROM PUBLIC;
  REVOKE ALL ON FUNCTION public.fn_spatial_detect_anomalies FROM anon;
  REVOKE ALL ON FUNCTION public.fn_spatial_detect_anomalies FROM authenticated;
  GRANT EXECUTE ON FUNCTION public.fn_spatial_detect_anomalies TO service_role;
  ```
- **Search Path**: Standard invoker path (runs as caller).
- **RLS Implications**: Operates under caller's RLS. When called by `service_role`, it reads all rows under `Service role full access entity_geometries` (`USING (true)`).
- **Underlying Privileges**: `SELECT` on `public.entity_geometries` and `public.mandal_versions`.
- **Mutation Privileges**: **STRICTLY ZERO (0)**. Read-only.
- **Geometry Mutation Capability**: **STRICTLY ZERO (0)**. Cannot alter geometry coordinates.
- **Table Ownership**: None.
- **Resource Limits**: `SET LOCAL statement_timeout = '5000ms'`. Maximum bounding box size: $2.0^\circ \times 2.0^\circ$ ($\approx 220\text{ km} \times 220\text{ km}$). Maximum features scanned: **100 features**.
- **Privilege-Containment Verification**: Direct invocation by `anon` or `authenticated` roles fails with PostgreSQL error `42501 permission denied`.

### 5.5 Governed Topological Anomaly Detection Heuristics
The topological anomaly engine is classified strictly as **governed detection heuristics**, NOT a legal boundary determination.

#### 5.5.1 Heuristic Profiles & Configurability
Detection thresholds are parameterizable and version-governed via `AnomalyThresholdProfile`:
- **Profile `v1.0-standard` (Rural / Default)**:
  - Sliver Area Threshold: $< 1000\text{ }m^2$
  - Thinness Ratio ($4 \pi A / P^2$): $< 0.05$
  - Overlap Encroachment: $> 100\text{ }m^2$
- **Profile `v1.0-dense-urban` (Municipalities / GHMC)**:
  - Sliver Area Threshold: $< 100\text{ }m^2$
  - Thinness Ratio: $< 0.02$
  - Overlap Encroachment: $> 10\text{ }m^2$

#### 5.5.2 Legal Boundary Disclaimers & Zero Auto-Healing
> [!CAUTION]
> **Zero Automated Healing Policy:** Automated geometric healing (e.g., `ST_MakeValid`, `ST_Snap`, automatic vertex snapping) is strictly prohibited on canonical boundaries. Snapping vertices automatically shifts legal boundaries, creates artificial property shifts, and invalidates statutory cartography. All detected anomalies are logged as read-only diagnostic metadata for human cartographic review.
- Output metadata must include:
  ```json
  {
    "classification": "GOVERNED_HEURISTIC_DETECTION",
    "legalStatus": "NON_JUDICIAL_DIAGNOSTIC",
    "disclaimer": "Topological anomaly flags represent automated heuristic screening for cartographic quality assurance and do NOT constitute legal determinations of boundary validity."
  }
  ```

### 5.6 Reconciliation & Justification of Migration 049
Migration 049 is strictly additive and limited in persistent database artifacts:
- **Persistent Tables Created**: **ZERO (0)**. No new tables are introduced.
- **Table Columns Modified**: **ZERO (0)**. `public.entity_geometries` and `public.mandal_versions` schema remains untouched.
- **Indexes Created**: **ZERO (0)**. Migration 048 already created `idx_entity_geometries_spatial` (GiST on `geometry`), `idx_entity_geometries_dataset_version`, and `idx_entity_geometries_provenance`. Migration 049 reuses these existing indexes without redundant bloat.
- **Persistent Artifacts in Migration 049**:
  Exactly 3 stored functions:
  1. `public.fn_spatial_calculate_overlap`
  2. `public.fn_spatial_boundary_diff`
  3. `public.fn_spatial_detect_anomalies`
  And matching `verification_049_spatial_gateway.sql` and `rollback_049_spatial_gateway.sql`.

---

## 6. Fastify API Surface & ECC-001 Contract Specifications

The W017 spatial gateway endpoints will be registered under `apps/api/src/routes/spatialAnalytics.ts`.

### 6.1 POST `/api/v1/spatial/analytics/overlap`
Computes the spatial intersection and overlap metrics between two entity versions.
- **Authentication**: `Bearer` token (`authenticated` or `service_role`). Anonymous access returns `401 Unauthorized`.
- **Request Body**:
  ```json
  {
    "baseEntity": {
      "entityId": "018b4567-e89b-12d3-a456-426614174000",
      "selection": { "mode": "as_of", "asOfDate": "2016-10-11" }
    },
    "comparisonEntity": {
      "entityId": "029c5678-e89b-12d3-a456-426614174001",
      "selection": { "mode": "as_of", "asOfDate": "2016-10-11" }
    },
    "options": {
      "projection": "SPHEROIDAL_GEOGRAPHY",
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
        "isCrossRegime": false,
        "baseSelection": { "mode": "as_of", "asOfDate": "2016-10-11" },
        "comparisonSelection": { "mode": "as_of", "asOfDate": "2016-10-11" }
      }
    }
  }
  ```
- **Error Response (404 Not Found)** conforming to `ECC-001`:
  ```json
  {
    "error": "SPATIAL_GEOMETRY_NOT_FOUND",
    "message": "Referenced entity geometry for entityId 018b4567-e89b-12d3-a456-426614174000 not found for selection mode 'as_of' (2016-10-11).",
    "statusCode": 404,
    "requestId": "req-spatial-918237",
    "timestamp": "2026-09-29T10:15:00.000Z",
    "code": "ENTITY_GEOMETRY_MISSING"
  }
  ```

### 6.2 POST `/api/v1/spatial/analytics/boundary-diff`
Calculates the spatial difference between two versions of an entity or regime.
- **Authentication**: `Bearer` token (`authenticated` or `service_role`).
- **Request Body**:
  ```json
  {
    "entityId": "018b4567-e89b-12d3-a456-426614174000",
    "sourceSelection": { "mode": "as_of", "asOfDate": "2016-10-11" },
    "targetSelection": { "mode": "version", "versionId": "d39d6789-e89b-12d3-a456-426614174002" },
    "toleranceMeters": 5.0
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "entityId": "018b4567-e89b-12d3-a456-426614174000",
      "sourceAreaM2": 145203940.52,
      "targetAreaM2": 150100200.10,
      "netAreaChangeM2": 4896259.58,
      "addedAreaM2": 5200100.20,
      "removedAreaM2": 303840.62,
      "unmodifiedAreaM2": 144900099.90,
      "similarityIndex": 0.9634,
      "regimeContext": {
        "isCrossRegime": true,
        "warning": "CROSS_REGIME_COMPARISON: Source and target selections operate under distinct temporal contexts."
      }
    }
  }
  ```

### 6.3 GET `/api/v1/spatial/quality/anomalies`
Scans a geographic envelope for topological discrepancies using governed heuristics.
- **Authentication**: `service_role` ONLY. Requests with `authenticated` or anonymous tokens return `403 Forbidden` (`INSUFFICIENT_ROLE_PERMISSIONS`).
- **Query Parameters**:
  - `layer` (string, required): e.g. `mandal`
  - `bbox` (string, required): `minLng,minLat,maxLng,maxLat`
  - `profile` (string, optional): defaults to `v1.0-standard`
- **Success Response (200 OK)**:
  ```json
  {
    "data": {
      "layer": "mandal",
      "profile": "v1.0-standard",
      "scannedFeatureCount": 12,
      "anomalyCount": 1,
      "anomalies": [
        {
          "type": "SLIVER_OVERLAP",
          "entityAId": "018b4567-e89b-12d3-a456-426614174000",
          "entityBId": "018b4567-e89b-12d3-a456-426614174001",
          "intersectionAreaM2": 124.50,
          "severity": "LOW",
          "centroid": [79.912, 17.521],
          "actionRequired": "HUMAN_CARTOGRAPHIC_REVIEW"
        }
      ],
      "governanceNotice": "NON_JUDICIAL_DIAGNOSTIC: Heuristic screening only. Does not modify canonical boundaries."
    }
  }
  ```

---

## 7. Governing Rules & Constraints

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

## 8. Full Scope of Work (When Authorized)

When authorization is granted, W017 will execute the following bounded scope:

```text
================================================================================
AUTHORIZED IMPLEMENTATION SCOPE MANIFEST (PREFLIGHT PROJECTION)
================================================================================

1. Database Migrations (supabase/migrations/):
   - 049_spatial_gateway_and_boundary_diff.sql (NEW: Functions only, 0 tables)
   - verification_049_spatial_gateway.sql (NEW: Verification assertions)
   - rollback_049_spatial_gateway.sql (NEW: Clean DROP FUNCTION script)

2. Backend API Runtime (apps/api/src/):
   - routes/spatialAnalytics.ts (NEW: Typed Fastify analytics routes)
   - services/spatialAnalyticsService.ts (NEW: Spatial compute service)
   - __tests__/spatial-analytics.test.ts (NEW: Fastify integration tests)
   - server.ts (ROUTE REGISTRATION ONLY)

3. Shared Types & Contracts (packages/shared/src/):
   - types/spatialAnalytics.ts (NEW: Typed selection & response interfaces)

4. Governance & Verification Tests:
   - tests/spatial-invariants.test.mjs (NEW: Mathematical & identity invariant tests)
   - reports/w017_spatial_engine_verification.json (NEW)
   - reports/w017_implementation_report.md (NEW)

================================================================================
TOTAL PERSISTENT TABLES CREATED: ZERO (0)
TOTAL COLUMNS MODIFIED: ZERO (0)
TOUCHING PRODUCTION: STRICTLY ZERO (0)
TOUCHING ENTITY_GEOMETRIES ROWS: STRICTLY ZERO (0)
================================================================================
```

---

## 9. Explicit Out-of-Scope Boundaries (Non-Goals)

1. **Zero Cartographic Data Ingestion**: No new GeoJSON, Shapefiles, or external geometries will be loaded in W017.
2. **Zero Auto-Healing**: No algorithms that automatically shift, snap, or simplify geometry vertices to force compliance.
3. **Zero Mobile App Rendering Changes**: No modifications to `apps/mobile/lib/api/endpoints/spatial.ts` or MapLibre components.
4. **Zero Legacy Asset Deletion**: Static spatial assets (`assets/spatial/`) remain untouched (R11 boundary preserved).
5. **Zero Synthetic Delimitation Truth**: W017 will not fabricate imaginary parliamentary or assembly delimitation proposals. Queries benchmark strictly against verified repository truth.

---

## 10. Step-by-Step Implementation Plan (Future Phase 4)

Upon CTO ratification, execution will proceed through five structured gates:

### Gate 1: Append-Only Migration Packaging (Migration 049)
- Author `049_spatial_gateway_and_boundary_diff.sql` containing only functions `fn_spatial_calculate_overlap`, `fn_spatial_boundary_diff`, `fn_spatial_detect_anomalies`.
- Apply strict `SECURITY INVOKER` across all 3 functions with per-function ACL.
- Author matching `rollback_049_spatial_gateway.sql` and `verification_049_spatial_gateway.sql`.

### Gate 2: Staging Database Deployment & Verification
- Execute Migration 049 against Staging Supabase (`fkpigozcqnmcvofuksar`).
- Execute verification script proving function existence, permissions, and timeout controls.
- Verify 589 geometry row count and digest remain untouched.

### Gate 3: Fastify Spatial Analytics Service & Routes
- Implement `spatialAnalyticsService.ts` with PostGIS RPC bindings and bounding box pre-filtering.
- Register `/api/v1/spatial/analytics/overlap`, `/boundary-diff`, and `/quality/anomalies` in `spatialAnalytics.ts`.
- Enforce schema validation, role authentication, and canonical `sendApiError` envelopes.

### Gate 4: Mathematical Invariant, Temporal & Identity Test Battery
- Execute 100% automated test battery verifying:
  - Mathematical invariants (Symmetry, Identity, Disjoint, Qualified Partition).
  - Explicit temporal test cases (2016 snapshot, 2020 splits, 2022 splits).
  - Explicit identity test cases (stable ID vs LGD, geometry vs entity ID).
  - Cross-regime comparison tags.
- Run complete repo regression battery (API build, mobile typecheck, contract drift, commit freshness).

### Gate 5: Evidence Closure & Independent Verification
- Generate `reports/w017_spatial_engine_verification.json` and implementation reports.
- Dispatch Independent Verifier agent for multi-gate audit.
- Update `EXECUTION_STATE.md` and `ACCEPTANCE_REGISTER.md`.

---

## 11. Verification & Testing Strategy

### 11.1 Tripartite Verification Separation
To eliminate false assertions of external truth, W017 strictly separates verification evidence into three distinct categories:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. MATHEMATICAL INVARIANTS                                                  │
│    Pure geometric theorems (Symmetry, Identity, Disjointness, Partition)   │
│    Tested against arbitrary synthetic geometries and PostGIS primitives.   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. INTERNAL REGRESSION FIXTURES                                             │
│    Repository ground truth: 12 seed mandals, Kuravi FID 286,                │
│    mandal_constituency_map, 589 baseline geometries.                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. AUTHORITATIVE EXTERNAL VALIDATION EVIDENCE                               │
│    Statutory Government Gazettes (e.g. G.O.Ms No. 221 of 2016-10-11,        │
│    G.O.Ms No. 51 of 2022) with cryptographic evidence records in W012.     │
│    *NO claim of Delimitation Commission truth without evidence UUID.*       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Pure Mathematical Invariant Tests
1. **Symmetry Invariant**:
   For any two valid geometries $A$ and $B$:
   $$\text{Area}(A \cap B) \equiv \text{Area}(B \cap A) \quad (\pm 0.001\text{ }m^2)$$
2. **Identity Invariant**:
   For any valid geometry $A$:
   $$\text{Overlap}(A, A) \equiv 100.0000\% \quad (\pm 0.0001\%)$$
3. **Disjoint Invariant**:
   For any two geometries $A$ and $B$ where $\text{ST\_Disjoint}(A, B)$:
   $$\text{Area}(A \cap B) = 0.0\text{ }m^2, \quad \text{Overlap}(A, B) = 0.0000\%$$
4. **Qualified Partition Invariant**:
   > **Qualification**: This invariant applies **ONLY** when geometries $\{P_1, P_2, \dots, P_k\}$ form a verified complete, mutually non-overlapping partition of geometry $A$ under the same entity class and temporal/regime context:
   $$\text{Area}(A) \equiv \sum_{i=1}^k \text{Area}(P_i) \quad (\pm 0.01\text{ }m^2)$$
   *(If $\{P_i\}$ overlap each other, or if unassigned gaps exist, the partition invariant is mathematically inapplicable).*

### 11.3 Explicit Temporal Test Battery
- `TEST-TEMP-01` (2016 Baseline Snapshot Non-Currentness):
  Prove that querying the 2016-10-11 baseline with `mode: 'current'` returns `404 SPATIAL_CURRENT_GEOMETRY_UNAVAILABLE` unless an explicit row with `is_current = true` exists.
- `TEST-TEMP-02` (2020 Mandal Reorganizations):
  Prove that queries with `as_of: '2020-06-01'` resolve to mandal versions active on that date, incorporating 2020 reorganization notifications.
- `TEST-TEMP-03` (2022 Mandal Splits):
  Prove that queries with `as_of: '2022-08-01'` resolve to the new mandal versions created under the July 2022 notifications (e.g. Gundala split, Seetharampuram), and that parent mandals reflect updated post-split boundaries.
- `TEST-TEMP-04` (Future Date Non-Leakage):
  Prove that a mandal gazetted on `2022-07-23` returns empty / not found when queried with `as_of: '2020-01-01'`.
- `TEST-TEMP-05` (Scenario Isolation):
  Prove that scenario geometries cannot be returned or traversed under `mode: 'current'` or `mode: 'as_of'`.

### 11.4 Explicit Identity Test Battery
- `TEST-ID-01` (Stable Entity ID vs Mutable LGD Code):
  Prove that modifying `mandal_versions.lgd_code` does not alter the primary key `mandals.id`.
- `TEST-ID-02` (Geometry ID vs Entity ID):
  Prove that an entity with two historical version snapshots has two distinct `entity_geometries.id` UUIDs sharing the same `entity_id`.
- `TEST-ID-03` (Source Feature ID Decoupling):
  Prove that external feature ID (e.g. `FID_286`) is stored purely as metadata in `source_feature_id` and is never utilized as the internal relational primary key.
- `TEST-ID-04` (Version ID vs Geometry ID):
  Prove that `mandal_versions.id` (version record) and `entity_geometries.id` (geometry row) are distinct UUIDs maintaining 1:1 foreign key binding.

### 11.5 Cross-Regime Comparison Test Battery
- `TEST-REGIME-01` (Cross-Regime Tagging):
  Prove that diffing a `2016-10-11` snapshot against a `current` or `future` regime returns `isCrossRegime: true` and origin selection metadata.
- `TEST-REGIME-02` (Cross-Regime Boundary Rejection):
  Prove that cross-regime diffs cannot silently be stored or queried as unified legal boundaries.

---

## 12. Negative-Path Testing Specification

| Test Case ID | Input Condition | Expected System Behavior | Asserted Output |
| :--- | :--- | :--- | :--- |
| **NEG-17-01** | Malformed / Self-intersecting GeoJSON input | Rejection at schema validation layer | HTTP 400 `INVALID_GEOMETRY_FORMAT` |
| **NEG-17-02** | Invalid or unsupported SRID (e.g. EPSG:3857) | Fastify validator rejects unexpected coordinate system | HTTP 422 `UNSUPPORTED_SRID` |
| **NEG-17-03** | Query spanning $> 100$ features | Complexity ceiling triggered | HTTP 413 `SPATIAL_QUERY_LIMIT_EXCEEDED` |
| **NEG-17-04** | Artificially delayed geometric query (> 5000ms) | PostgreSQL statement timeout aborts query | HTTP 504 `SPATIAL_QUERY_TIMEOUT` |
| **NEG-17-05** | Entity ID not found in database | Service returns canonical 404 envelope | HTTP 404 `ENTITY_GEOMETRY_MISSING` |
| **NEG-17-06** | Anonymous invocation of `/spatial/quality/anomalies` | Forbidden access guard triggered | HTTP 403 `INSUFFICIENT_ROLE_PERMISSIONS` |

---

## 13. Evidence Generation Plan

Upon execution, the following machine-readable and human-readable evidence artifacts will be produced:
1. `reports/w017_preflight_reconciliation.json`: Preflight status and prerequisites verification (Revision 1.1-SEC-CORRECTED).
2. `reports/w017_spatial_engine_verification.json`: Execution log containing:
   - Verbatim SQL function creation logs.
   - Exact execution times for overlap and boundary diff queries.
   - Bounding box query plans proving GiST index scans (`idx_entity_geometries_spatial`).
   - Spheroidal vs planar benchmark deviation table.
3. `reports/w017_mathematical_invariants.json`: Results of the 4 mathematical invariant test suites.
4. `reports/w017_temporal_identity_verification.json`: Results of the 5 temporal and 4 identity tests.
5. `reports/w017_implementation_report.md`: Comprehensive engineering closure documentation.

---

## 14. Reconciliation Plan

The W017 spatial calculations will be reconciled against:
1. **Constituency Membership**: Cross-verify that mandals known to lie wholly within a single constituency (e.g. Kuravi in Dornakal AC) show $\approx 100.0\%$ spatial containment in `fn_spatial_calculate_overlap`.
2. **Historical vs Current Integrity**: Confirm that queries targeting `historical_2016_10_11_baseline` return results derived strictly from the 589 baseline rows, with zero contamination from unverified external datasets.
3. **Database Ledger Consistency**: Reconcile Migration 049 registration in `schema_migrations` / migration bundler script.

---

## 15. Independent Verification Specification

Under Master Execution Framework Amendment v1.4 / Rule IV-001, implementation cannot be accepted without independent verification. The Independent Verifier will execute a segregated audit protocol:
1. **Clean Working Tree**: Verify working directory is clean and HEAD matches remote origin.
2. **Database Catalog Audit**: Inspect `pg_proc` on staging to verify function ownership (`postgres`), and confirm `prosecdef = false` (`SECURITY INVOKER`) across all 3 functions.
3. **589 Baseline Immutability Audit**: Independently re-hash `public.entity_geometries` and verify SHA-256 matches `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`.
4. **Automated Suite Re-Execution**: Run all mathematical, temporal, identity, and regression test suites independently.
5. **Contract Drift Verification**: Ensure the 3 new endpoints are properly audited and do not introduce unhandled contract drift.

---

## 16. Risks, Failure Modes & Mitigations

| Risk ID | Risk Description | Severity | Mitigation Strategy |
| :--- | :--- | :---: | :--- |
| **RSK-17-01** | Complex geometric intersection triggers high CPU usage and thread blocking in Fastify. | High | Spatial computation is delegated entirely to PostGIS worker processes; Fastify handles only streaming serialization. Statement timeout capped at 5000ms. |
| **RSK-17-02** | Spheroidal vs planar discrepancy when users expect flat-map geometry. | Medium | Primary standard is spheroidal geography (`::geography`). Planar calculations require explicit opt-in with extent justification. |
| **RSK-17-03** | Temporal conflation: Users assume historical 2016-10-11 mandal boundaries reflect present-day ground reality. | High | API responses explicitly return `regimeContext` with clear warnings when historical snapshots are queried. |
| **RSK-17-04** | Accidental mutation or deletion of the 589 baseline geometries. | Critical | Existing immutability trigger `trg_prevent_entity_geometry_mutation` rejects all updates/deletes; Migration 049 contains ZERO DML on `entity_geometries`. |

---

## 17. Rollback & Recovery Strategy

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
   Because Migration 049 creates functions only, rolling back leaves `public.entity_geometries` and the 589 geometries completely unaffected.

---

## 18. Impact Assessment

- **Database Storage**: Zero additional table rows; minimal catalog metadata for 3 functions.
- **Database CPU / Memory**: Bounded by 5000ms statement timeout and 100-feature ceiling.
- **API Runtime**: Lightweight Fastify route wrappers with schema validation. Zero blocking synchronous CPU in Node.js event loop.
- **Mobile Client**: Zero impact. No mobile bundle changes; existing MapLibre tile paths (`/geo/tiles`) remain untouched.

---

## 19. Acceptance Criteria

Milestone W017 will be deemed complete if and only if all 15 criteria are satisfied:
1. [ ] Migration 049 is strictly additive, creating exactly 3 spatial analytical stored procedures, all verified as `SECURITY INVOKER` with per-function least-privilege ACL.
2. [ ] Zero new database tables, zero modified columns, and zero redundant indexes are introduced.
3. [ ] `public.entity_geometries` row count remains exactly 589, and SHA-256 digest matches `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`.
4. [ ] Area calculations utilize spheroidal geography (`::geography`) as the primary cross-boundary standard, with zero raw degree area calculations.
5. [ ] Quantitative overlap rules enforce bounding box pre-checks (`&&`) and return 0.0% for disjoint or dimension < 2 intersections.
6. [ ] Topological anomaly engine is strictly read-only diagnostics; zero automated geometry healing or vertex mutation occurs.
7. [ ] Function access is governed per-function; zero blanket `GRANT EXECUTE` to `anon`.
8. [ ] API endpoints `/api/v1/spatial/analytics/overlap`, `/boundary-diff`, and `/quality/anomalies` conform to `ECC-001` error envelopes.
9. [ ] Maximum query feature ceiling (100 features) and 5000ms statement timeout are enforced and proven via negative tests.
10. [ ] Mathematical invariants (Symmetry, Identity, Disjoint, Qualified Partition) pass 100% in automated testing.
11. [ ] Explicit temporal tests prove 2016 baseline is not current, 2020/2022 splits resolve correctly, and future data does not leak.
12. [ ] Explicit identity tests prove stable `mandals.id` is decoupled from mutable LGD codes and geometry UUIDs.
13. [ ] Cross-regime comparisons are explicitly tagged with `isCrossRegime: true`.
14. [ ] Production environment (`ehfafcnimmjusyvplbah`) remains completely untouched and air-gapped.
15. [ ] W016-C3-R10 Gap B remains deferred to W023; R11 remains strictly blocked; zero APK or device testing is attempted.

---

## 20. Artifact & Commit Lineage Map

| Phase / Item | Planned Artifact Path | Purpose |
| :--- | :--- | :--- |
| **Preflight** | `reports/w017_preflight_reconciliation.json` | Prerequisite & baseline reconciliation (Rev 1.1-SEC-CORRECTED) |
| **Master Plan** | `PLAN-W017-REV-1.1.md` | Formal architecture & execution specification |
| **Migration Package** | `supabase/migrations/049_spatial_gateway_and_boundary_diff.sql` | Spatial procedures & security grants |
| **Migration Verifier** | `supabase/verification_049_spatial_gateway.sql` | Post-migration catalog & permission assertions |
| **Migration Rollback** | `supabase/rollback_049_spatial_gateway.sql` | Clean down-migration script |
| **API Route** | `apps/api/src/routes/spatialAnalytics.ts` | Fastify analytics endpoints |
| **API Service** | `apps/api/src/services/spatialAnalyticsService.ts` | PostGIS query mediation & validation |
| **Verification Suite** | `tests/spatial-invariants.test.mjs` | Automated mathematical, temporal & identity tests |
| **Evidence Report** | `reports/w017_spatial_engine_verification.json` | Machine-readable execution logs & timings |
| **Implementation Report** | `reports/w017_implementation_report.md` | Comprehensive human-readable closure report |

---

## 21. Operational Declarations

### 21.1 Pre-Implementation Declaration (Amendment v1.5-A Section 27)
> **DECLARATION:**  
> I hereby declare that this revised implementation plan (`PLAN-W017-REV-1.1.md`) represents a complete, rigorous, and truthful pre-implementation specification for Milestone W017, fully reconciled against the CTO Security Correction Directive of 2026-09-29.  
> All 3 planned spatial functions are specified as 100% `SECURITY INVOKER`.  
> No application code, database migrations, or infrastructure changes have been executed for W017 prior to this submission.  
> The 589 geometry baseline in `public.entity_geometries` remains intact, verified, and untouched.  
> Production remains strictly air-gapped.  
> Execution is halted at Phase 3 pending explicit final CTO implementation authorization.

---

## 22. Plan Sign-Off & Review Request

### 22.1 Review Request
This document is formally submitted to the **Chief Technology Officer (CTO)** for final review and formal implementation authorization.

### 22.2 Ratification Action Required
Implementation of Milestone W017 will **NOT** begin until the CTO provides the canonical approval statement:
> `PLAN APPROVED — PROCEED WITH IMPLEMENTATION ACCORDING TO THE APPROVED PLAN.`

---
*End of Master Implementation Plan W017 Revision 1.1*
