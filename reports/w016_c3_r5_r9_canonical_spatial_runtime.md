# W016-C3-R9: CANONICAL SPATIAL RUNTIME READ PATH
## FINAL EXECUTION & VERIFICATION REPORT

- **Job Identifier:** W016-C3-R9
- **Title:** Canonical Spatial Runtime Read Path
- **Target Environment:** panIN-staging (`fkpigozcqnmcvofuksar`) ONLY
- **Production Status:** STRICTLY AIR-GAPPED & UNTOUCHED (`ehfafcnimmjusyvplbah`)
- **Accepted Baseline:** W016-C3-R5-R8A (`dc4fa68d4926b9a6b6c1c29edffabea8c305382f`)
- **Execution Timestamp:** 2026-09-28T14:49:25.455Z
- **Overall Verdict:** **PASS**
- **Terminal Status:** **W016-C3-R9 IMPLEMENTED / TESTED / VERIFIED — SUBMITTED FOR CTO ACCEPTANCE**

---

### 1. Executive Summary

This report delivers the execution, testing, and formal verification of **Job W016-C3-R9** under CTO authorization. It establishes the first **canonical application runtime read path** in Fastify:

```
PostGIS public.entity_geometries
         ↓
Generic Spatial Selection Layer (Layer-agnostic, zero domain joins)
         ↓
Optional Post-Selection Metadata Adapter (MandalMetadataAdapter)
         ↓
Fastify HTTP API (/api/v1/geo/*)
         ↓
Governed Spatial Response (MVT / JSON)
```

All three required runtime operations have been fully implemented, rigorously tested against live staging database `fkpigozcqnmcvofuksar`, and verified across all test checks.

---

### 2. Canonical Spatial Baseline Verification

| Metric | Target Value | Observed Value | Verification Gate |
|---|---|---|---|
| Target Database | panIN-staging (`fkpigozcqnmcvofuksar`) | `https://fkpigozcqnmcvofuksar.supabase.co` | **PASS** |
| Production Air-Gap | `ehfafcnimmjusyvplbah` (0 access) | ZERO connections / untouched | **PASS** |
| Canonical Row Count | 589 | 589 | **PASS** |
| Status Classification | 100% `DERIVED` | 100% `DERIVED` | **PASS** |
| Current Flag | 100% `is_current = false` | 100% `is_current = false` | **PASS** |
| Temporal Classification | `historical_statutory_baseline` | 100% `historical_statutory_baseline` | **PASS** |
| Canonical Row-Set Digest | `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` | `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` | **PASS** |

---

### 3. Runtime Operations Delivery Matrix

#### Operation A: Vector-Tile Delivery (`GET /api/v1/geo/tiles/:layer/:z/:x/:y`)
- **Wire Format:** Mapbox Vector Tile (`application/vnd.mapbox-vector-tile`)
- **Encoding:** Pure native Protocol Buffer / MVT v2.1 encoder without external dependencies
- **Test Tile:** `mandals/8/184/115` (Telangana bbox) -> **200 OK**, Content-Type: `application/vnd.mapbox-vector-tile`, gzip-encoded, 140160 bytes
- **Empty Tile:** `mandals/8/10/10` (ocean bbox) -> **204 No Content**
- **Fail-Closed Isolation:** `mandals/8/184/115?regime=current` -> **204 No Content** (proves historical geometries never leak into current regime)
- **Validation:** Out-of-bounds coordinates (`8/9999/9999`) -> **400 Bad Request**; Unknown layer -> **404 Not Found**
- **Measured Latency:** 5759 ms

#### Operation B: Point-in-Polygon Locate (`GET /api/v1/geo/locate`)
- **Containment Engine:** 100% Database-side PostGIS query on `public.entity_geometries` using GiST spatial index operator `ov` (`&&`) and PostGIS `st_intersects` RPC. Zero application-side polygon loops or static GeoJSON file reading.
- **7-Case Test Matrix:**
  1. **Case 1 (Known Coordinate):** Centroid of FID 286 (Kuravi: lat 17.487869, lng 79.997883) -> **200 OK**, `matched: true`
  2. **Case 2 (Fail-Closed Current):** Known point with `regime=current` on historical dataset -> **404 SPATIAL_LOCATION_NOT_FOUND**
  3. **Case 3 (Ocean Point):** Point in Indian Ocean (lat 5.0, lng 80.0) -> **404 SPATIAL_LOCATION_NOT_FOUND**
  4. **Case 4 (Invalid Latitude):** `lat=95.0` -> **400 Bad Request**
  5. **Case 5 (Invalid Longitude):** `lng=200.0` -> **400 Bad Request**
  6. **Case 6 (Historical as-of):** `as_of=2016-10-11` -> **200 OK**, matches historical FID 286
  7. **Case 7 (Explicit Version):** `version_id=9c1ebb72-2a15-5aae-ab7d-d3ef8806d28b` -> **200 OK**, matches targeted version
- **Three-Level Identity Resolution:**
  - **Level 1 (Stable Geographic Entity Identity):** `TS-MDL-4721`
  - **Level 2 (Temporal Version Identity UUID):** `9c1ebb72-2a15-5aae-ab7d-d3ef8806d28b`
  - **Level 3 (Physical Geometry Row Identity UUID):** `c3691ae8-1473-483c-96b0-c4b6fc46714c`
  - **Source Reference:** `286`
  - **Non-Equation Invariant:** `geometry_id !== version_id !== entity_id !== source_feature_id` (**PROVEN**)
- **Generic Decoupling Proof:** `bypass_adapter=true` returns `entity_id: null` (proves spatial engine operates independently of domain tables)
- **Measured Latency:** 1011 ms

#### Operation C: Feature Identify & Detail (`GET /api/v1/geo/features/:layer/:id`)
- **Semantic Classification:** `source_feature_id` is classified strictly as a **SOURCE-ARTIFACT LOOKUP REFERENCE** (e.g. `"286"`), never claimed to be authoritative geographic identity.
- **Three-Level Identity Model & Complete Mapping:**
  - **Source Reference:** `source_feature_id = "286"`
  - **Level 3 (Physical Geometry):** `c3691ae8-1473-483c-96b0-c4b6fc46714c` (`entity_geometries.id`)
  - **Level 2 (Temporal Version):** `9c1ebb72-2a15-5aae-ab7d-d3ef8806d28b` (`entity_geometries.mandal_version_id`)
  - **Level 1 (Stable Geographic Entity):** `TS-MDL-4721` (`mandal_versions.mandal_id`)
  - **Exposed Identity Mapping:** Proven in response under `identity_mapping`
  - **Non-Equation Invariants:** Proven bitwise across all pairs
- **Direct Multi-Identifier Queries:**
  - Query by source reference (`286`): **200 OK**
  - Query by physical `geometry_id` UUID (`c3691ae8-1473-483c-96b0-c4b6fc46714c`): **200 OK**
  - Query by temporal `version_id` UUID (`9c1ebb72-2a15-5aae-ab7d-d3ef8806d28b`): **200 OK**
- **Generic Decoupling Proof:** `bypass_adapter=true` returns `entity_id: null`
- **Nonexistent Feature:** `nonexistent_99999` -> **404 FEATURE_NOT_FOUND**
- **Unknown Layer:** `unknown_layer` -> **404 LAYER_NOT_FOUND**
- **Measured Latency:** 421 ms

---

### 4. Legacy Static Architecture Reconciliation

The legacy static geometry files were audited and reconciled as follows:
- `apps/api/src/routes/geo.ts` (`/geo/manifest.json`, `/geo/:file`): Remains operational for legacy client compatibility. Status: **NON-CANONICAL / LEGACY COMPATIBILITY**.
- `apps/api/src/routes/constituencies.ts` (`GET /api/v1/constituencies/locate`): Continues to serve assembly locate requests using static `telangana-assembly.geojson`. Status: **NON-CANONICAL / LEGACY COMPATIBILITY**.
- `apps/mobile/lib/remoteGeoLoader.ts`: Untouched in R9. Zero mobile consumer switches are authorized or performed in R9.
- **Governed Direction:** Existing static paths will be deprecated and migrated to canonical vector tiles in future nationwide delivery milestones.

---

### 5. Detailed Test Results (26/26 Passed)

| Check ID | Classification | Description | Status |
|---|---|---|---|
| R9-AIRGAP-01 | SECURITY | Production database ehfafcnimmjusyvplbah is strictly air-gapped; staging fkpigozcqnmcvofuksar targeted | **PASS** |
| R9-DATA-01 | DATA_INTEGRITY | public.entity_geometries contains exactly 589 canonical mandal rows | **PASS** |
| R9-DATA-02 | GOVERNANCE | All 589 rows maintain status=DERIVED, is_current=false, temporal_classification=historical_statutory_baseline | **PASS** |
| R9-DATA-03 | LINEAGE_DIGEST | Canonical 589-row set bitwise digest matches accepted R5-R5 baseline | **PASS** |
| R9-TILE-01 | RUNTIME_OPERATION_A | GET /geo/tiles/mandals/8/184/115 returns 200 with vector-tile content-type, headers, and payload | **PASS** |
| R9-TILE-02 | RUNTIME_OPERATION_A | GET /geo/tiles/mandals/8/10/10 (empty ocean tile) returns 204 No Content | **PASS** |
| R9-TILE-03 | RUNTIME_OPERATION_A | GET /geo/tiles/mandals/8/184/115?regime=current returns 204 No Content (fail-closed isolation) | **PASS** |
| R9-TILE-04 | RUNTIME_OPERATION_A | GET /geo/tiles/mandals/8/9999/9999 returns 400 Bad Request with INVALID_TILE_COORDINATES | **PASS** |
| R9-TILE-05 | RUNTIME_OPERATION_A | GET /geo/tiles/unknown_layer/8/184/115 returns 404 Not Found with LAYER_NOT_FOUND | **PASS** |
| R9-LOCATE-01 | RUNTIME_OPERATION_B | Case 1: GET /geo/locate resolves known coordinate to PostGIS geometry FID 286 (Kuravi) with 3-level identity | **PASS** |
| R9-LOCATE-02 | RUNTIME_OPERATION_B | Case 2: GET /geo/locate with regime=current returns 404 SPATIAL_LOCATION_NOT_FOUND (fail-closed) | **PASS** |
| R9-LOCATE-03 | RUNTIME_OPERATION_B | Case 3: GET /geo/locate for ocean point returns 404 SPATIAL_LOCATION_NOT_FOUND | **PASS** |
| R9-LOCATE-04 | RUNTIME_OPERATION_B | Case 4: GET /geo/locate with invalid latitude returns 400 Bad Request | **PASS** |
| R9-LOCATE-05 | RUNTIME_OPERATION_B | Case 5: GET /geo/locate with invalid longitude returns 400 Bad Request | **PASS** |
| R9-LOCATE-06 | RUNTIME_OPERATION_B | Case 6: GET /geo/locate with as_of=2016-10-11 returns expected historical match FID 286 | **PASS** |
| R9-LOCATE-07 | RUNTIME_OPERATION_B | Case 7: GET /geo/locate with explicit version_id returns expected version match | **PASS** |
| R9-LOCATE-08 | RUNTIME_OPERATION_B | GET /geo/locate with bypass_adapter=true returns entity_id=null (proving generic engine decoupling) | **PASS** |
| R9-LOCATE-09 | RUNTIME_OPERATION_B | Locate executes directly via PostGIS GiST index operator ov (&&) in PostgreSQL kernel (zero application loops) | **PASS** |
| R9-DETAIL-01 | RUNTIME_OPERATION_C | GET /geo/features/mandals/286 resolves detail with source-artifact reference semantics and 3-level identity | **PASS** |
| R9-DETAIL-02 | RUNTIME_OPERATION_C | GET /geo/features/mandals/:id resolves feature detail directly by physical geometry_id UUID | **PASS** |
| R9-DETAIL-03 | RUNTIME_OPERATION_C | GET /geo/features/mandals/:id resolves feature detail directly by temporal version_id UUID | **PASS** |
| R9-DETAIL-04 | RUNTIME_OPERATION_C | GET /geo/features/mandals/286 with bypass_adapter=true returns entity_id=null (pure generic identity) | **PASS** |
| R9-DETAIL-05 | RUNTIME_OPERATION_C | GET /geo/features/mandals/nonexistent returns 404 FEATURE_NOT_FOUND | **PASS** |
| R9-DETAIL-06 | RUNTIME_OPERATION_C | GET /geo/features/unknown_layer/286 returns 404 LAYER_NOT_FOUND | **PASS** |
| R9-LEGACY-01 | BACKWARD_COMPATIBILITY | GET /geo/manifest.json remains operational for legacy compatibility | **PASS** |
| R9-LEGACY-02 | BACKWARD_COMPATIBILITY | GET /api/v1/constituencies/locate remains operational for legacy compatibility | **PASS** |

---

### 6. Terminal Status & Next Steps

**VERDICT:** **PASS**
**GATE:** **W016-C3-R9 IMPLEMENTED / TESTED / VERIFIED — SUBMITTED FOR CTO ACCEPTANCE**

No production mutations or client cutovers were performed. Work is ready for formal CTO acceptance review.
