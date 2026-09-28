# W016-C3-R10: Mobile Canonical Spatial Consumer Migration Report

**Directive**: `W016-C3-R10`  
**Target Environment**: `panIN-staging` (`fkpigozcqnmcvofuksar`)  
**Production Air-Gap**: `ehfafcnimmjusyvplbah` (STRICTLY AIR-GAPPED & UNTOUCHED)  
**Verification Date**: 2026-09-28T15:24:10.365Z  
**Overall Status**: **PASS — SUBMITTED FOR CTO ACCEPTANCE**

---

## 1. Executive Summary

In accordance with CTO Directive **W016-C3-R10**, the mobile application's spatial consumption has been migrated to the canonical Fastify/PostGIS runtime path:
```
Mobile App  ──►  Canonical Fastify Spatial API  ──►  PostGIS entity_geometries  ──►  Governed Spatial Response
```

Key architectural accomplishments:
1. **Zero Client-Side Point-in-Polygon Math**: Canonical spatial queries no longer download multi-megabyte GeoJSON polygons to run in-memory loops. Point-in-polygon queries are delegated to `GET /api/v1/geo/locate` on the Fastify/PostGIS runtime.
2. **Three-Level Identity Model Preserved**: Full separation of Level 1 (`entity_id`), Level 2 (`version_id`), Level 3 (`geometry_id`), and source reference (`source_feature_id`). `source_feature_id` is never equated to `entity_id`.
3. **MapLibre Vector-Tile Compatibility**: `MapboxGL.VectorSource` shimmed in `maplibreCompat.tsx`. Tile template URL generated deterministically.
4. **Fail-Safe Offline Mode**: 204 empty tiles, 404 out-of-bounds, 404 regime fail-closed, and network errors are handled gracefully without application crashes.
5. **Legacy Path Non-Deletion**: Legacy static delivery (`remoteGeoLoader.ts`, `geoLoader.ts`, `geoManifest.ts`, `/geo/manifest.json`, `/geo/:file`, `/api/v1/constituencies/locate`) remains intact for backward compatibility during transition.

---

## 2. Verification Results Table

| Check ID | Classification | Description | Status |
|:---|:---|:---|:---:|
| `R10-AIRGAP-01` | SECURITY | Production database ehfafcnimmjusyvplbah is strictly air-gapped; staging fkpigozcqnmcvofuksar targeted | ✅ PASS |
| `R10-DATA-01` | DATA_INTEGRITY | public.entity_geometries contains exactly 589 canonical mandal rows | ✅ PASS |
| `R10-DATA-02` | GOVERNANCE | All 589 rows maintain status=DERIVED, is_current=false, temporal_classification=historical_statutory_baseline | ✅ PASS |
| `R10-DATA-03` | LINEAGE_DIGEST | Canonical 589-row set bitwise digest matches accepted baseline | ✅ PASS |
| `R10-MOBILE-01` | CODE_AUDIT | apps/mobile/lib/api/endpoints/spatial.ts exists and implements SpatialEndpoint | ✅ PASS |
| `R10-MOBILE-02` | CODE_AUDIT | SpatialEndpoint exposes getTileUrl, getTileTemplateUrl, fetchTile, locate, and getFeatureDetail | ✅ PASS |
| `R10-MOBILE-03` | CODE_AUDIT | apps/mobile/lib/api/client.ts wires readonly spatial: SpatialEndpoint | ✅ PASS |
| `R10-MOBILE-04` | CODE_AUDIT | apps/mobile/lib/api/index.ts re-exports ./endpoints/spatial | ✅ PASS |
| `R10-MOBILE-05` | CODE_AUDIT | apps/mobile/lib/maplibreCompat.tsx exposes MapboxGL.VectorSource | ✅ PASS |
| `R10-MOBILE-06` | CODE_AUDIT | apps/mobile/app/(tabs)/index.tsx delegates locate to apiClient.spatial.locate | ✅ PASS |
| `R10-MOBILE-07` | ARCH_INVARIANT | SpatialEndpoint contains zero client-side point-in-polygon math or coordinate loops | ✅ PASS |
| `R10-LEGACY-01` | BACKWARD_COMPAT | Legacy static delivery files remain intact and non-deleted | ✅ PASS |
| `R10-API-01` | API_RUNTIME | GET /api/v1/geo/tiles/mandals/8/184/115 returns 200 with vector-tile Content-Type | ✅ PASS |
| `R10-API-02` | API_RUNTIME | GET /api/v1/geo/tiles/mandals/8/10/10 returns 204 No Content for empty tile | ✅ PASS |
| `R10-API-03` | API_RUNTIME | GET /api/v1/geo/locate returns 200 with Kuravi (FID 286) and 3-level identity | ✅ PASS |
| `R10-API-04` | API_RUNTIME | GET /api/v1/geo/locate for out-of-bounds (0,0) returns 404 SPATIAL_LOCATION_NOT_FOUND | ✅ PASS |
| `R10-API-05` | API_RUNTIME | GET /api/v1/geo/locate?regime=current returns 404 (historical statutory fail-closed) | ✅ PASS |
| `R10-API-06` | API_RUNTIME | GET /api/v1/geo/features/mandals/286 returns 200 with Kuravi detail | ✅ PASS |
| `R10-API-07` | API_RUNTIME | GET /api/v1/geo/features/mandals/:uuid returns 200 by geometry_id UUID | ✅ PASS |
| `R10-API-08` | API_RUNTIME | GET /api/v1/geo/features/mandals/999999 returns 404 FEATURE_NOT_FOUND | ✅ PASS |
| `R10-IDENTITY-01` | IDENTITY_INVARIANT | Governed response enforces 3-level identity: entity_id (TS-MDL-KURAVI) != source_feature_id (286) | ✅ PASS |

---

## 3. Detailed Runtime Findings

### 3.1 Known Geometry Locate Verification (Kuravi Test)
- **Coordinates Tested**: `lng: 79.95, lat: 17.55`
- **Endpoint**: `GET /api/v1/geo/locate?lat=17.55&lng=79.95&layer=mandals&regime=historical&as_of=2016-10-11`
- **Matched Entity**: `Kuravi` (`TS-MDL-KURAVI`)
- **District**: `TS-DST-MAHABUBABAD`
- **Source Feature ID**: `286`
- **Geometry ID**: `c3691ae8-1473-483c-96b0-c4b6fc46714c`
- **Version ID**: `9c1ebb72-2a15-5aae-ab7d-d3ef8806d28b`
- **Status**: `DERIVED`
- **Temporal Classification**: `historical_statutory_baseline`
- **Latency**: `1431ms`

### 3.2 Temporal Fail-Closed Verification
- **Request**: `GET /api/v1/geo/locate?lat=17.55&lng=79.95&layer=mandals&regime=current`
- **Result**: `404 Not Found` (`matched: false`)
- **Isolation Status**: PASS — historical statutory baseline is not falsely presented as current.

### 3.3 Production Air-Gap
- **Production Host**: `ehfafcnimmjusyvplbah.supabase.co`
- **Mutations / Queries**: 0
- **Air-Gap Integrity**: PASS

---

## 4. Certification & Submission

All **21/21** verification gates have passed.

**Terminal Status**:
`W016-C3-R10 IMPLEMENTED / TESTED / VERIFIED — SUBMITTED FOR CTO ACCEPTANCE`
