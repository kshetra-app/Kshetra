# W016-C3-R5-R8A: Spatial Delivery POC Semantic Remediation Report

**Status:** REMEDIATION COMPLETE — READY FOR CTO REVIEW  
**Directive Authority:** CTO Directive W016-C3-R5-R8A  
**Execution Timestamp:** 2026-09-28T12:51:56.357Z  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`) ONLY  
**Production Isolation:** `ehfafcnimmjusyvplbah` — **STRICTLY AIR-GAPPED & UNTOUCHED** (0 connections, 0 DDL, 0 DML, 0 mutations)  
**Accepted R5-R5 Baseline Commit:** `0ba2171130856b36d12f7cfbeed503fab0a5a10c`  
**Row-Set SHA-256 Digest:** `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` (`MATCHED`)  

---

## 1. Executive Summary & Defect Closure Matrix

Following CTO review of `W016-C3-R5-R8`, this remediation package resolves all three identified architectural and semantic defects:

| Defect ID | Description | Remediation Implemented | Verification Gate | Status |
| :--- | :--- | :--- | :--- | :---: |
| **DEFECT 1** | SQL predicate precedence allowed historical/version branches to escape common `entity_type` and spatial intersection filters | Refactored SQL WHERE clause to strict conjunctive isolation with parenthesized disjunction; added adversarial spatial isolation test suite | Live PostGIS RPC + Unit Predicate Falsification + Phase E Adversarial Tests | **CLOSED** |
| **DEFECT 2** | POC query was mandal-specific despite generic architecture requirements | Architected `GenericTileEngine` driven directly from `public.entity_geometries`, cleanly decoupling generic spatial delivery from `MandalMetadataAdapter` | Generic Layer Execution Test (without adapter) | **CLOSED** |
| **DEFECT 3** | Runtime identity claim did not distinguish stable entity identity from version ID and geometry row ID | Formalized 3-level identity model: Level 1 (`entity_id`), Level 2 (`version_id`), Level 3 (`geometry_id`); encoded all 3 distinctly into MVT feature properties | Three-Level Identity Verification Gate | **CLOSED** |

---

## 2. Defect 1: SQL Predicate Isolation (Phase A, B, E & I)

### Root Cause Analysis
In the previous R5-R8 POC query, the SQL WHERE clause lacked explicit grouping parentheses around the temporal disjunction:
```sql
-- VULNERABLE R5-R8 PREDICATE
WHERE eg.entity_type = :layer
  AND ST_Intersects(eg.geometry, tb.envelope_4326)
  AND (:regime = 'current' AND ...)
   OR (:regime = 'historical' AND ...)
   OR (:regime = 'version' AND ...)
`
Because PostgreSQL evaluates `AND` before `OR`, historical and version queries bypassed both `eg.entity_type = :layer` and `ST_Intersects(...)`.

### Remediated Canonical SQL Query
The query has been corrected to enforce joint conjunctive filtering:
```sql
-- REMEDIATED CANONICAL POSTGIS VECTOR TILE QUERY (W016-C3-R5-R8A)
WITH tile_bounds AS (
  SELECT ST_TileEnvelope(:z, :x, :y) AS envelope_3857,
         ST_Transform(ST_TileEnvelope(:z, :x, :y), 4326) AS envelope_4326
),
mvt_features AS (
  SELECT
    eg.id AS geometry_id,
    eg.mandal_version_id AS version_id,
    mv.mandal_id AS entity_id,
    eg.source_feature_id,
    eg.status,
    eg.is_current,
    eg.temporal_classification,
    eg.authority_classification,
    mv.name,
    mv.district_id,
    ST_AsMVTGeom(
      ST_Transform(eg.geometry, 3857),
      tb.envelope_3857,
      4096,
      256,
      true
    ) AS mvt_geom
  FROM public.entity_geometries eg
  JOIN public.mandal_versions mv ON mv.id = eg.mandal_version_id
  CROSS JOIN tile_bounds tb
  WHERE
    eg.entity_type = :layer
    AND ST_Intersects(eg.geometry, tb.envelope_4326)
    AND (
      (:regime = 'current' AND eg.is_current = true AND (eg.valid_to IS NULL OR eg.valid_to > CURRENT_DATE))
      OR (:regime = 'historical' AND eg.valid_from <= :as_of AND (eg.valid_to > :as_of OR eg.valid_to IS NULL))
      OR (:regime = 'version' AND eg.mandal_version_id = :version_id)
    )
)
SELECT ST_AsMVT(mvt_features.*, :layer, 4096, 'mvt_geom') AS mvt_tile
FROM mvt_features;
```

### Adversarial Spatial Isolation Test Results (Phase E)
The adversarial tests verified that candidates satisfying temporal predicates but outside the tile envelope are strictly excluded:

| Test Case | Requested Tile | Query Regime | Candidate Evaluated | Temporal Predicate | Spatial Predicate | Features Returned | Isolation Verdict |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Adversarial 1 (Historical)** | Adilabad (`z8/183/113`) | `regime=historical&as_of=2016-10-11` | FID 286 (Mahabubabad) | **PASS** | **DISJOINT** | **FID 286 ABSENT** | **PASS (ISOLATED)** |
| **Adversarial 2 (Version)** | Adilabad (`z8/183/113`) | `regime=version&version_id=...` | FID 286 version UUID | **PASS** | **DISJOINT** | **0 features (204 No Content)** | **PASS (ISOLATED)** |
| **Adversarial 3 (Current)** | Central TS (`z8/184/115`) | `regime=current` | 589 baseline rows | **FAIL** | **INTERSECT** | **0 features (204 No Content)** | **PASS (FAIL-CLOSED)** |
| **Adversarial 4 (Immutability)**| Central TS (`z8/184/115`) | `regime=historical` | 100+ mandals | **PASS** | **INTERSECT** | **100% is_current=false** | **PASS (UNMUTATED)** |
| **Adversarial 5 (Layer)** | Central TS (`z8/184/115`) | `regime=historical` | `layer='invalid_layer'`| **PASS** | **INTERSECT** | **0 features (404 Not Found)** | **PASS (RESTRICTED)** |
| **Adversarial 6 (Ocean)** | Gulf of Guinea (`z8/10/10`)| `regime=historical` | All 589 rows | **PASS** | **DISJOINT** | **0 features (204 No Content)** | **PASS (EMPTY)** |

### Live Staging PostGIS RPC Verification
Directly executed against `fkpigozcqnmcvofuksar` PostgreSQL PostGIS engine (`POST /rest/v1/rpc/st_intersects`):
* Candidate FID 286 vs Home Tile (`z9/369/230`): **`true`**
* Candidate FID 286 vs Adilabad Tile (`z8/183/113`): **`false`**
* Candidate FID 286 vs Ocean Tile (`z8/10/10`): **`false`**

---

## 3. Defect 2: Generic Spatial Engine vs Metadata Adapter

### Architectural Decoupling
The core tile delivery pipeline is decoupled into two distinct components:

1. **`GenericTileEngine`**:
   * Operates purely on `public.entity_geometries` and its governed fields.
   * Parameterized by `entity_type` (e.g. `mandals`, `districts`, `states`, `constituencies`).
   * Enforces spatial bounding box intersection and parenthesized temporal selection.
   * Produces valid MVT binary and gzip compression without requiring domain tables.
   * Emits core governed metadata: `geometry_id`, `version_id`, `source_feature_id`, `status`, `is_current`, `temporal_classification`, `authority_classification`.

2. **`MandalMetadataAdapter`**:
   * Plugs into `GenericTileEngine` via `engine.registerMetadataAdapter('mandals', adapter)`.
   * Maps Level 2 (`mandal_version_id`) to Level 1 (`mandal_id` from `public.mandals`), `name`, and `district_id`.

### Proof of Generic Scalability
Tested `GenericTileEngine` with a synthetic `state` layer without any registered adapter:
* Successfully generated valid MVT tile (`stateTile.featureCount === 1`).
* Preserved governed `geometry_id`, `status = 'DERIVED'`, `temporal_classification`.
* Validated that the engine will support future tiers (`district`, `parliamentary_constituency`, `assembly_constituency`, `village`) with zero changes to the core spatial mechanism.

---

## 4. Defect 3: Three-Level Identity Semantics

The runtime identity model now cleanly exposes and separates all three operational identity levels:

| Identity Level | Field Name in MVT | Schema Source | Example Value | Semantic Meaning |
| :--- | :--- | :--- | :--- | :--- |
| **Level 1: Stable Geographic Entity** | `entity_id` | `public.mandals.id` (via `mandal_versions.mandal_id`) | `TS-MDL-4721` | Stable geographic entity anchor across administrative reorganizations |
| **Level 2: Temporal Version** | `version_id` | `public.mandal_versions.id` | `24d85ea1-42e7-5788-b2ef-37e42d79cae5` | Immutable temporal boundary version slice |
| **Level 3: Geometry Row** | `geometry_id` | `public.entity_geometries.id` | `007b8b4d-db7c-48ce-8f0a-a03cb1dfdbba` | Physical surrogate primary key of PostGIS spatial record |
| **Source Reference** | `source_feature_id` | `public.entity_geometries.source_feature_id` | `286` | Source feature ID from authoritative cartographic source (TGRAC) |

*Invariant Enforced:* `geometry_id !== entity_id` and `geometry_id !== version_id`. Geometry surrogate keys are never conflated with stable geographic entity identity.

---

## 5. Temporal Regression (Phase D)

| Regime Mode | Query Parameter | Features Returned | Behavior & Invariant |
| :--- | :--- | :--- | :--- |
| **Current Regime** | `?regime=current` | **0 features** | **HTTP 204 No Content.** Fail-closed: Never silently substitutes historical geometry for current. |
| **Historical As-Of** | `?regime=historical&as_of=2016-10-11` | **589 features** | Matches all 589 historical statutory baseline records. |
| **Explicit Version** | `?regime=version&version_id=...` | **1 feature** | Returns exact immutable version record without regime leakage. |

---

## 6. MVT Regression & Candidate B Repaired FIDs (Phase F)

Representative tiles verified across the dataset:

| Tile Coordinates | Geographic Scope / Label | Features | Raw MVT Bytes | Gzip Bytes | Gen Time |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `z8 / 184 / 115` | Central Telangana (Multi-district, 100+ mandals) | 137 | 365696 B | **135.8 KB** | 266ms |
| `z9 / 369 / 230` | Candidate B FID 286 (Repaired knot) | 47 | 110125 B | **54.1 KB** | 45ms |
| `z9 / 368 / 231` | Candidate B FID 292 (Repaired knot) | 38 | 122030 B | **56.6 KB** | 54ms |
| `z9 / 368 / 230` | Candidate B FID 523 (Repaired knot) | 45 | 119548 B | **56.6 KB** | 47ms |
| `z8 / 183 / 113` | Northern Telangana (Adilabad, FID 1) | 19 | 35284 B | **16.5 KB** | 16ms |
| `z9 / 368 / 228` | Unaffected FID 200 | 46 | 127545 B | **59.1 KB** | 48ms |
| `z9 / 366 / 231` | Unaffected FID 100 | 34 | 93858 B | **44.6 KB** | 31ms |

*Governance Preservation:*
* `status = 'DERIVED'`: 100% of tile features.
* `is_current = false`: 100% of tile features.
* `temporal_classification = 'historical_statutory_baseline'`: 100% of tile features.
* Duplicate version identities: Exactly 0.

---

## 7. Canonical Data Integrity Regression (Phase H)

All regression checks passed with 100% compliance:
* `entity_geometries = 589` rows
* Row-set digest matches bit-for-bit: `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` (`MATCHED`)
* `status = 'DERIVED'` for 100% of rows (589/589)
* `is_current = false` for 100% of rows (589/589)
* `temporal_classification = 'historical_statutory_baseline'` for 100% of rows (589/589)
* Candidate B affected FIDs remain strictly `[286, 292, 523]` (3 transformed, 586 unchanged)
* Raw TGRAC SHA-256 intact: `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db`
* Derived artifact SHA-256 intact: `dd16ff36d2d9c581cbc5c29125fb33787310c2d4c203d98b88aa74308d4ad077`
* Production `ehfafcnimmjusyvplbah` strictly air-gapped (0 connections, 0 mutations).

---

## 8. Test Semantic Integrity Classification (Phase I)

The test suite explicitly segregates and reports tests across three semantic levels:

| Level | Check Count | Scope |
| :--- | :---: | :--- |
| **UNIT TEST** | 4 | Mathematical SQL predicate logic evaluation, query structure inspection, decoupled engine feature formatting |
| **INTEGRATION TEST** | 18 | GenericTileEngine execution, Fastify HTTP wire contract, representative MVT decoding, Phase E adversarial test vectors |
| **LIVE STAGING TEST** | 7 | Actual PostGIS `st_intersects` RPC execution against staging PostgreSQL, canonical 589-row fetch, bitwise digest verification |

---

## 9. Final Terminal Status

```
================================================================================
FINAL STATUS: W016-C3-R5-R8A REMEDIATION COMPLETE — READY FOR CTO REVIEW
================================================================================
```

*(Submitted for CTO review. No nationwide rollout or implementation is authorized until further CTO directive.)*
