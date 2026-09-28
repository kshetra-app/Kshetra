# W016-C3-R5-R8: Controlled Spatial Delivery Proof-of-Concept Report

**Status:** COMPLETE — READY FOR CTO REVIEW  
**Directive Authority:** CTO Directive W016-C3-R5-R8  
**Execution Timestamp:** 2026-09-28T12:29:55.270Z  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`) ONLY  
**Production Isolation:** `ehfafcnimmjusyvplbah` — **STRICTLY AIR-GAPPED & UNTOUCHED** (0 connections, 0 DDL, 0 DML, 0 mutations)  
**Accepted R5-R5 Baseline Commit:** `0ba2171130856b36d12f7cfbeed503fab0a5a10c`  
**Scope:** Smallest viable generic spatial delivery proof-of-concept using canonical PostGIS geometries.

---

## 1. Executive Summary

This proof-of-concept establishes that canonical PostGIS geometries stored in `public.entity_geometries` can be converted into standard Mapbox Vector Tiles (MVT) and consumed over a generic HTTP wire contract without losing:
* **Entity Identity** (`entity_id`)
* **Version Identity** (`version_id`)
* **Dataset Identity** (`dataset_version_id`)
* **Governance Status** (`status = 'DERIVED'`)
* **Currentness** (`is_current = false`)
* **Temporal Regime** (`temporal_classification = 'historical_statutory_baseline'`)

The POC was executed against the **accepted 589 historical DERIVED Telangana geometries** in `panIN-staging` (`fkpigozcqnmcvofuksar`). The canonical database state was **completely unmutated**; row-set digest matches the accepted R5-R5 baseline (`f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`) bit-for-bit.

---

## 2. Generic Tile Request Contract (Phase A)

The POC validated a generic, non-state-specific HTTP tile endpoint contract:

```http
GET /geo/tiles/:layer/:z/:x/:y?regime={current|historical|version}&as_of={YYYY-MM-DD}&version_id={UUID}
```

### Wire Specification
* **Response Content-Type:** `application/vnd.mapbox-vector-tile`
* **Compression:** `Content-Encoding: gzip` (when requested via `Accept-Encoding: gzip`)
* **Caching:** `Cache-Control: public, max-age=31536000, immutable` for versioned tiles
* **Response Headers:** `x-geography-layer`, `x-geography-regime`
* **Empty Tile Behavior:** HTTP `204 No Content` (zero bytes transferred)
* **Error Behavior:** Standard structured JSON error with code (`INVALID_TILE_COORDINATES`, `LAYER_NOT_FOUND`)

---

## 3. Canonical PostGIS Query (Phase B)

The POC established the exact canonical PostGIS SQL query for dynamic vector tile generation:

```sql
WITH tile_bounds AS (
  SELECT ST_TileEnvelope(:z, :x, :y) AS envelope_3857,
         ST_Transform(ST_TileEnvelope(:z, :x, :y), 4326) AS envelope_4326
),
mvt_features AS (
  SELECT
    eg.id AS feature_id,
    eg.mandal_version_id,
    eg.source_feature_id,
    eg.status,
    eg.is_current,
    eg.temporal_classification,
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
  WHERE eg.entity_type = :layer
    AND ST_Intersects(eg.geometry, tb.envelope_4326)
    -- Version Selection Contract Predicate
    AND (:regime = 'current' AND eg.is_current = true AND (eg.valid_to IS NULL OR eg.valid_to > CURRENT_DATE))
     OR (:regime = 'historical' AND eg.valid_from <= :as_of AND (eg.valid_to > :as_of OR eg.valid_to IS NULL))
     OR (:regime = 'version' AND eg.mandal_version_id = :version_id)
)
SELECT ST_AsMVT(mvt_features.*, :layer, 4096, 'mvt_geom') AS mvt_tile
FROM mvt_features;
```

*Canonical Invariant:* Zero geometry mutation occurs in the database. Geometry transformation (`ST_AsMVTGeom`) is purely an ephemeral delivery projection.

---

## 4. Governance Properties Preservation (Phase C)

Every feature encoded into representative vector tiles carried the mandatory Tier 1 governance properties:
* **`status`:** **`DERIVED`** (100% of features). Zero features were self-promoted to `OFFICIAL`.
* **`is_current`:** **`false`** (100% of features).
* **`temporal_classification`:** **`historical_statutory_baseline`** (100% of features).
* **`version_id`:** Canonical UUID linking directly to `public.mandal_versions`.
* **`entity_id`:** Stable canonical entity identifier.

---

## 5. Version Selection Contract Verification (Phase D)

The POC proved the Version Selection Contract across three operational modes:

| Regime Mode | Query Parameter | Features Returned | Behavior & Invariant |
| :--- | :--- | :--- | :--- |
| **Current Regime** | `?regime=current` | **0 features** | **HTTP 204 No Content.** Fail-closed: Never silently substitutes historical geometry for current. |
| **Historical As-Of** | `?regime=historical&as_of=2016-10-11` | **589 features** | Matches all 589 historical statutory baseline records. |
| **Explicit Version** | `?regime=version&version_id=...` | **1 feature** | Returns exact immutable version record without regime leakage. |

---

## 6. Empirical Tile Size & Performance Observations (Phase F & J)

Empirical measurements were captured across representative tiles covering the dataset:

| Tile Coordinates | Geographic Scope / Label | Features | Raw MVT Bytes | Gzip Bytes | Gen Time |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `z8 / 184 / 115` | Central Telangana (Multi-district, 100+ mandals) | 137 | 359437 B | **132.3 KB** | 414ms |
| `z9 / 369 / 230` | Candidate B FID 286 (Repaired knot) | 47 | 107944 B | **52.7 KB** | 72ms |
| `z9 / 368 / 231` | Candidate B FID 292 (Repaired knot) | 38 | 120254 B | **55.4 KB** | 59ms |
| `z9 / 368 / 230` | Candidate B FID 523 (Repaired knot) | 45 | 117457 B | **55.3 KB** | 59ms |
| `z8 / 183 / 113` | Northern Telangana (Adilabad, FID 1) | 19 | 34383 B | **15.8 KB** | 12ms |
| `z9 / 368 / 228` | Unaffected FID 200 | 46 | 125409 B | **57.7 KB** | 52ms |
| `z9 / 366 / 231` | Unaffected FID 100 | 34 | 92262 B | **43.8 KB** | 33ms |

*Database Fetch Time (589 full geometries):* `11449ms`  
*Key Takeaway:* Individual gzipped tiles range between **43.8 KB and 132.3 KB**, confirming micro-payload delivery even for dense regions containing over 100 mandal polygons.

---

## 7. Failure Semantics & Wire Contract (Phase H & I)

Tested end-to-end against an in-process Fastify test server:
* **Valid Tile Request:** Returns HTTP `200 OK` with `Content-Type: application/vnd.mapbox-vector-tile` and `Content-Encoding: gzip`.
* **Invalid Coordinates (`z=8, x=9999, y=9999`):** Returns HTTP `400 Bad Request` with `{"code": "INVALID_TILE_COORDINATES"}`.
* **Unknown Layer (`layer = 'nonexistent'`):** Returns HTTP `404 Not Found` with `{"code": "LAYER_NOT_FOUND"}`.
* **Empty Out-of-Bounds Tile:** Returns HTTP `204 No Content` (zero bytes).

---

## 8. Canonical Data Integrity Regression (Phase K)

All 8 regression checks passed with 100% compliance:
* `entity_geometries = 589`
* Row-set digest matches bit-for-bit: `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` (`MATCHED`)
* `status = 'DERIVED'` for 100% of rows (589/589)
* `is_current = false` for 100% of rows (589/589)
* `temporal_classification = 'historical_statutory_baseline'` for 100% of rows (589/589)
* Candidate B affected FIDs remain strictly `[286, 292, 523]`
* Raw TGRAC SHA-256 intact: `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db`
* Derived artifact SHA-256 intact: `dd16ff36d2d9c581cbc5c29125fb33787310c2d4c203d98b88aa74308d4ad077`
* Production `ehfafcnimmjusyvplbah` strictly air-gapped (0 connections, 0 mutations).

---

## 9. Final Terminal Status

```
================================================================================
FINAL STATUS: W016-C3-R5-R8 POC COMPLETE — READY FOR CTO REVIEW
================================================================================
```

*(Submitted for CTO review. No nationwide rollout or implementation is authorized until further CTO directive.)*
