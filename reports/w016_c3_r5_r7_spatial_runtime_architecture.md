# W016-C3-R5-R7: Spatial Runtime Architecture Decision & India-Wide Delivery Design

**Document Status:** COMPLETE — READY FOR CTO ARCHITECTURE DECISION  
**Directive Authority:** CTO Directive W016-C3-R5-R7  
**Previous Accepted Baseline:** W016-C3-R5-R5 (`0ba2171130856b36d12f7cfbeed503fab0a5a10c`)  
**Previous Discovery State:** W016-C3-R5-R6 (`BLOCKED — NO EXISTING CANONICAL RUNTIME READ PATH`, Accepted Discovery Outcome)  
**Execution Timestamp:** 2026-09-28T17:35:00.000Z  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`) ONLY  
**Production Isolation:** `ehfafcnimmjusyvplbah` — **STRICTLY AIR-GAPPED & UNTOUCHED** (0 connections, 0 DDL, 0 DML, 0 mutations)  
**Scope:** Architecture Design, Reconnaissance & Delivery Specification ONLY (Zero Product Code Modification, Zero Database Mutation)

---

## Executive Summary

Following the accepted discovery finding in **W016-C3-R5-R6** that no canonical application read path currently exists in `apps/api` or `apps/mobile` for `public.entity_geometries`, this architecture decision record establishes the **Pan-India Spatial Runtime Delivery Architecture** for PANIN.

The design establishes a fundamental architectural separation between:
1. **The Canonical Spatial Data Store:** The bitemporal PostGIS database (`public.entity_geometries`), strictly governed by W012 provenance, cryptographic hashes, dataset versions, and database immutability triggers; and
2. **The Delivery Representations:** Optimized, multi-tier delivery artifacts (Mapbox Vector Tiles, pre-simplified geometry caches, and spatial REST endpoints) designed for sub-30ms mobile delivery across India's diverse cellular networks.

The current 589-geometry dataset in Telangana is strictly a **staging validation fixture**. The architecture specified herein is nationwide, generic, and hierarchically scalable across all 36 States/UTs, 788 Districts, 543 Parliamentary Constituencies, 4,123 Assembly Constituencies, and 6,500+ Sub-Districts (Mandals/Tehsils/Taluks/Blocks/Circles).

---

## Phase A: Current Architecture Audit

A thorough audit of the existing codebase was conducted to distinguish verifiable facts from inferences and assumptions.

| # | Architecture Dimension | Audit Finding | Classification | Repository Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Static Geometry Pipeline** | Source GeoJSON files in `apps/mobile/data/*.json` are compiled by `scripts/build-geo-assets.mjs` into `apps/api/public/geo/`. Coordinates are rounded to 5 decimal places (~1.1m precision), consecutive duplicates are stripped, and both minified `.json` and gzip level 9 `.json.gz` sibling files are generated alongside a content-hashed `manifest.json`. | **SOURCE CODE FACT** | `scripts/build-geo-assets.mjs` lines 1–202 |
| **2** | **Assembly Geometry Endpoints** | `apps/api/src/routes/geo.ts` exposes `GET /geo/manifest.json` and `GET /geo/:file`. It enforces a strict filename regex (`^[a-z0-9-]+\.json$`), streams pre-built `.gz` files when `Accept-Encoding: gzip` is requested, and sets HTTP cache headers. In addition, `apps/api/src/routes/constituencies.ts` exposes `GET /constituencies/locate`, which runs in-memory point-in-polygon lookup strictly on a hardcoded Telangana file (`data/geo/telangana-assembly.geojson`). | **SOURCE CODE FACT** | `apps/api/src/routes/geo.ts` lines 1–118, `apps/api/src/routes/constituencies.ts` lines 598–636 |
| **3** | **Mobile Consumption of Assembly Geometry** | `apps/mobile/lib/geoLoader.ts` bundles India national overview (`IN`, ~500 KB) synchronously inside the JavaScript bundle. `apps/mobile/lib/remoteGeoLoader.ts` downloads streamed state files on demand from `${getGeoBaseUrl()}/geo/${file}?v=${version}` via Expo FileSystem, writing to local disk cache (`CACHE_DIR`) and de-duplicating via in-memory `memCache`. `apps/mobile/lib/enrichedGeoCache.ts` merges electoral/demographic data before passing directly to MapLibre `<MapboxGL.ShapeSource>`. | **SOURCE CODE FACT** | `apps/mobile/lib/geoLoader.ts` lines 1–99, `apps/mobile/lib/remoteGeoLoader.ts` lines 1–122, `apps/mobile/lib/enrichedGeoCache.ts` lines 1–155 |
| **4** | **Geometry File Formats** | Standard WGS84 (SRID 4326) GeoJSON `FeatureCollection` containing `Polygon` or `MultiPolygon`. Sanitized at load time by `sanitizeGeoJSON()` in `apps/mobile/lib/geoLoader.ts` to eliminate degenerate rings (<4 positions) to prevent native MapLibre GL crashes. | **SOURCE CODE FACT** | `apps/mobile/lib/geoLoader.ts` lines 22–59, `data/geo/ATTRIBUTION.md` |
| **5** | **Caching Strategy** | Multi-tier: Tier 1 (Metro bundle inlining for `IN`), Tier 2 (in-memory `Map` heap cache in `remoteGeoLoader.ts` and `enrichedGeoCache.ts`), Tier 3 (device disk cache via `expo-file-system` keyed by state and version hash), Tier 4 (HTTP cache headers). | **SOURCE CODE FACT** | `apps/mobile/lib/remoteGeoLoader.ts` lines 18–24, `apps/api/src/routes/geo.ts` lines 77–82 |
| **6** | **HTTP Cache Headers** | Versioned URLs (`?v=<hash>`) receive `Cache-Control: public, max-age=31536000, immutable`. Bare URLs receive `public, max-age=86400, stale-while-revalidate=604800`. API state endpoints receive `public, max-age=300, s-maxage=300`. | **SOURCE CODE FACT** | `apps/api/src/routes/geo.ts` lines 78–82, `apps/api/src/server.ts` lines 129–136 |
| **7** | **CDN / Railway Behavior** | Production API is hosted on Railway (`kshetra-api-production-9f06.up.railway.app`). No dedicated edge CDN (e.g. Cloudflare / CloudFront) is currently evidenced in code or DNS configuration in the repository. Fastify acts as the direct origin server. | **CONFIGURATION FACT** & **INFERENCE** | `apps/mobile/lib/constants.ts` lines 17–30 |
| **8** | **API Authentication Model** | Public spatial endpoints (`/geo/*`, `/states/*`, `/constituencies/*`) allow anonymous access (`anon`). Administrative routes (`/manage/*`, `/moderation/*`, `/metrics`) enforce Bearer tokens. PostgREST `public.entity_geometries` allows `SELECT` to `anon` and `authenticated`, with `INSERT/UPDATE/DELETE` revoked. | **SOURCE CODE FACT** | `apps/api/src/server.ts`, `supabase/migrations/048_w016_c3_r5_r3_entity_geometries_schema.sql` lines 252–272 |
| **9** | **Public-Read Patterns** | Anonymous clients fetch static assets and state metadata without authentication headers. All rendered boundary maps are public-domain civic data. | **SOURCE CODE FACT** | `apps/mobile/lib/remoteGeoLoader.ts` lines 74–79 |
| **10** | **Error / Loading / Empty Semantics** | `geo.ts` returns structured JSON error `{ error: 'Not Found', statusCode: 404, code: 'NOT_FOUND' }`. `remoteGeoLoader.ts` throws on non-200 to trigger client retry affordances. `enrichedGeoCache.ts` catches enrichment errors and returns raw GeoJSON so the map canvas does not crash. MapLibre silently rejects invalid rings, which `sanitizeGeoJSON()` prevents. | **SOURCE CODE FACT** | `apps/api/src/lib/replyHelper.ts`, `apps/mobile/lib/enrichedGeoCache.ts` lines 44–48, `apps/mobile/lib/geoLoader.ts` lines 28–33 |
| **11** | **Mobile Memory / Performance Constraints** | The mobile client parses entire per-state GeoJSON files (e.g., Uttar Pradesh: 6.97 MB plain text, ~25 MB parsed in JavaScript heap) into memory. `memCache` has no LRU eviction policy. Passing large GeoJSON objects across the React Native bridge to MapLibre `<MapboxGL.ShapeSource>` causes UI thread pauses and memory pressure on low-tier Android hardware. | **INFERENCE** & **RUNTIME EVIDENCE** | `apps/mobile/lib/enrichedGeoCache.ts` line 16, `apps/mobile/lib/remoteGeoLoader.ts` line 19 |
| **12** | **Database Access Patterns** | Mobile client uses PostgREST for 22 Class-A read models. Fastify backend connects to PostgreSQL via connection pool. `public.entity_geometries` has 589 rows in staging (`f839fa02...`), but is queried exclusively by administrative verification scripts; zero application endpoints currently query it. | **RUNTIME EVIDENCE** | `reports/w016_c3_r5_r6_spatial_runtime_integration.json` |

---

## Phase B: The Spatial Delivery Problem & Requirements Matrix

Delivering geographic boundaries across India requires balancing high visual rendering performance on resource-constrained mobile devices against rigorous statutory governance and temporal accuracy.

| Req ID | Requirement | Primary Challenge | Target Delivery Mechanism | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | **Small map viewport request** | Downloading entire state GeoJSON to view 3 local mandals wastes 95%+ bandwidth. | Vector Tiles (MVT) or Bounding-Box API query | Slippy map tiles or BBOX queries slice geometry to the visible viewport. |
| **REQ-02** | **Large district/state map** | Complex high-resolution polygons cause memory exhaustion when zoomed out. | Pre-simplified Vector Tiles or Multi-resolution GeoJSON | Simplification (tolerance 0.005–0.05°) removes redundant vertices at macro zoom. |
| **REQ-03** | **Assembly constituency map** | 4,123 ACs nationwide must load reliably with crisp boundaries. | Pre-generated Vector Tiles / Static Cache from PostGIS | AC boundaries change only during delimitation; pre-generated tiles yield <30ms delivery. |
| **REQ-04** | **Mandal / Sub-district map** | 6,500+ mandals nationwide exceed 250 MB in uncompressed GeoJSON. | Vector Tiles (MVT) backed by PostGIS `ST_AsMVT` | Tiled binary Protocol Buffers partition sub-districts into sub-100KB chunks. |
| **REQ-05** | **Historical map** | Viewing 2016 statutory baseline vs 2024 current boundaries. | Parameterized Fastify API (`?as_of=...` / `?version_id=...`) | Historical queries must evaluate bitemporal intervals in PostGIS. |
| **REQ-06** | **Current map** | Displaying strictly active, legally valid boundaries. | Filtered Vector Tiles / Edge Cache with `is_current=true` | Fail-closed default: omit historical and retired geometries from default feeds. |
| **REQ-07** | **Multiple geography layers** | Overlaying Mandals on Assembly Constituencies and Districts. | Multi-layer Vector Tiles (MVT) | MVT packs multiple named layers into a single binary tile payload. |
| **REQ-08** | **Feature identification / click** | Tapping a polygon to inspect its identity, representative, and metrics. | MVT Feature Attributes + Lazy Fastify Entity Detail API | MVT provides instant client highlight; detailed profile is fetched on demand. |
| **REQ-09** | **Bounding-box queries** | Viewport spatial intersection queries. | PostGIS GiST Spatial Index (`idx_entity_geometries_spatial`) | PostGIS `ST_Intersects` evaluates bounding box in sub-millisecond database time. |
| **REQ-10** | **Search by geography identity** | Lookup by LGD code, ECI code, name, or UUID. | Fastify REST API mediated relational queries | Bypasses spatial geometry; returns entity record with bounding box for camera fit. |
| **REQ-11** | **Offline / degraded behavior** | Rural mobile network loss. | Local Device Disk Cache (SQLite / FileSystem) + Bundled National Overview | Previously viewed tiles/geometries remain cached on disk; `IN` stays bundled. |
| **REQ-12** | **Low-bandwidth mobile** | Spotty 2G/3G/4G cellular connections (50–100 kbps). | Gzip/Brotli Protocol Buffers (MVT) | Binary MVT is 70–80% smaller than raw GeoJSON and requires zero JSON parsing. |
| **REQ-13** | **Large geometry payloads** | Complex multipolygons with 10,000+ vertices. | Server-side `ST_SimplifyPreserveTopology` in PostGIS | Database generalizes geometry before transmission; mobile never simplifies in JS. |
| **REQ-14** | **Geometry simplification** | Adapting level-of-detail to map zoom level. | Zoom-tiered resolution bands (Macro z0–z5, Meso z6–z9, Micro z10+) | Eliminates visual clutter and vertex bloat across different scales. |
| **REQ-15** | **Caching** | Minimizing database and origin server compute. | Content-addressed URLs + HTTP `Cache-Control: immutable` | Versioned assets cache at Edge CDN for 1 year; zero origin hits on repeat traffic. |
| **REQ-16** | **CDN delivery** | Fast edge termination across India. | Edge CDN (Cloudflare / CloudFront) fronting `/geo/*` | PoPs in Mumbai, Delhi, Chennai, Hyderabad, Bangalore ensure <30ms latency. |
| **REQ-17** | **Temporal version selection** | Bitemporal queries (`valid_from`, `valid_to`, `snapshot_date`). | PostGIS temporal interval query engine | Ensures strict temporal fidelity without temporal leakage. |
| **REQ-18** | **Provenance / status visibility** | Preserving OFFICIAL vs DERIVED classification. | Mandatory Governance Envelope in feature properties | Every delivered feature retains `status`, `provenance_id`, and `authority_classification`. |
| **REQ-19** | **Security / RLS** | Zero unauthorized writes; scenario isolation. | PostgreSQL RLS + Fastify API Mediation + Client REVOKE | Anonymous writes are impossible at database level; scenarios are quarantined. |
| **REQ-20** | **Future nationwide scale** | Expanding to 650,000 villages and 1.2M polling stations. | Decoupled PostGIS Canonical Store + Tiled Pyramid | Scales horizontally without redesigning data models. |

---

## Phase C: Architecture Options Evaluation

Three candidate architectures were evaluated, alongside a synthesized Multi-Tier Hybrid Architecture.

```
                    ┌────────────────────────────────────────────────────────┐
                    │       PostGIS Canonical Store (entity_geometries)       │
                    │   (Bitemporal, W012 Provenance, Immutability Triggers) │
                    └──────────────────────────┬─────────────────────────────┘
                                               │
               ┌───────────────────────────────┴───────────────────────────────┐
               ▼                                                               ▼
┌─────────────────────────────┐                                 ┌─────────────────────────────┐
│  Vector Tile Pipeline (MVT) │                                 │  Fastify Spatial Query API  │
│  - ST_AsMVT / ST_TileEnvelope│                                 │  - /api/v1/geo/locate       │
│  - Pre-simplified pyramids  │                                 │  - /api/v1/geo/entities/:id │
│  - Edge CDN Distribution    │                                 │  - Bitemporal time-travel   │
└──────────────┬──────────────┘                                 └──────────────┬──────────────┘
               │                                                               │
               │ (Visual Map Pan/Zoom: <30ms)                                  │ (Point Click / Reverse Geocode)
               ▼                                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             PANIN Mobile Application (MapLibre)                              │
│         - Native MVT VectorSource + Hardware Accelerated Fill/Line Layers                   │
│         - Offline Disk Caching (SQLite / FileSystem) + Bundled National Landing              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Option A: Static / Generated GeoJSON Asset Pipeline
* **Concept:** Pre-generate static GeoJSON files per state, district, or constituency from PostGIS, compress with gzip, and serve as static assets via CDN/Fastify.
* **Pros:** Zero runtime database compute; trivial edge caching; offline-friendly; drop-in compatible with existing `remoteGeoLoader.ts`.
* **Cons:** Cannot support viewport bounding-box or point-in-polygon queries without downloading entire files; severe memory consumption on mobile when loading large states or mandals (589 mandals in TS alone is ~16 MB); combinatorial explosion of static files for historical dates and scenarios; unscalable to village level (>600,000 files).
* **Verdict:** **INSUFFICIENT AS A SOLE SOLUTION.** Excellent for macro state/national overviews, but breaks down for mandals and dynamic queries.

### Option B: Canonical Fastify / PostGIS Dynamic Geometry API
* **Concept:** Dynamic REST endpoints in Fastify (`/api/v1/geo/...`) querying `public.entity_geometries` on every request via PostGIS functions (`ST_AsGeoJSON`, `ST_Simplify`, `ST_Intersects`).
* **Pros:** Single source of truth; dynamic flexibility (arbitrary BBOX, point locate, temporal `as_of` parameters); fine-grained governance filtering; zero pre-generation build steps.
* **Cons:** High database CPU and memory load under concurrent mobile map pan/zoom traffic; GeoJSON text serialization in PostgreSQL is computationally expensive; higher latency (100–300ms) compared to CDN edge delivery (<30ms).
* **Verdict:** **ESSENTIAL FOR SPATIAL QUERIES, BUT UNSUITABLE FOR BULK MAP RENDERING UNDER SCALE.**

### Option C: Vector Tile / Tile-Based Spatial Delivery (MVT / PMTiles)
* **Concept:** Serve Mapbox Vector Tiles (MVT) generated from PostGIS via `ST_AsMVT` / `ST_TileEnvelope` or pre-rendered PMTiles pyramids, sliced by standard slippy map coordinates (`/z/x/y.mvt`).
* **Pros:** Industry standard for mobile GIS (MapLibre native hardware-accelerated rendering); micro-payloads (10–80 KB gzipped per tile); only visible viewport data is transferred; multi-layer support (Districts + ACs + Mandals in one tile); edge CDN cacheable; native attribute filtering in MapLibre without JavaScript bridge overhead.
* **Cons:** Requires tile generation pipeline; does not perform point reverse-geocoding (`locate` still needs an API); requires updating mobile rendering from `ShapeSource` to `VectorSource`.
* **Verdict:** **HIGHLY SUPERIOR FOR MAP RENDERING AND PAN-INDIA SCALE.**

### Comparative Synthesis Matrix

| Evaluation Dimension | Option A (Static GeoJSON) | Option B (Dynamic REST API) | Option C (Vector Tiles MVT) | Recommended Hybrid |
| :--- | :--- | :--- | :--- | :--- |
| **Request Flow** | CDN -> Static File | Client -> Fastify -> PostGIS | Client -> CDN -> MVT Tile | CDN for Tiles; Fastify for Queries |
| **Database Load** | Zero runtime load | High (per-request PostGIS) | Zero (cached) / Low (dynamic) | Zero for 95% of map pans; low for queries |
| **Mobile Payload Size** | Large (1–16 MB per state) | Medium (100–500 KB per BBOX) | Tiny (10–80 KB per tile) | **Optimal (10–80 KB per tile)** |
| **P95 Latency** | < 30ms (CDN hit) | 120–300ms (PostGIS execution) | < 30ms (CDN hit) | **< 30ms (Tiles), < 80ms (Queries)** |
| **Mobile Memory Impact** | Severe (full state in JS heap)| Moderate | Negligible (native C++ GPU cache)| **Minimal (zero JS heap bloat)** |
| **Point-in-Polygon (Locate)** | Client-side CPU burn | Native PostGIS ST_Intersects | Inefficient in tiles | **Native PostGIS API (<15ms)** |
| **Temporal Time-Travel** | Combinatorial file explosion | Native `WHERE valid_from...` | Parameterized tile query | **Native PostGIS temporal filtering** |
| **Governance Preservation** | Weak (static JSON detached) | Strong (query-enforced) | Strong (encoded in MVT props) | **Guaranteed (DB-backed envelope)** |
| **Pan-India Scalability** | Fails at mandal/village scale| Scales with DB hardware cost | Scales to millions of features| **Scales indefinitely** |

---

## Phase D: Governance Compatibility & Non-Negotiable Invariants

The spatial runtime architecture must strictly preserve the existing geography governance model established in Migrations 040–048 and W012/W016.

### 1. Prevention of Status Escalation: DERIVED Must NEVER Become OFFICIAL
* **Database Invariant:** Trigger `trg_prevent_entity_geometry_mutation` enforces absolute immutability on `entity_geometries.status`.
* **Delivery Invariant:** Every tile generator, GeoJSON builder, and API serializer must project `status` directly from `entity_geometries.status`. No middleware or transformation step is permitted to omit, override, or default this value.
* **Client Invariant:** The mobile UI inspects `feature.properties.status`. When `status == 'DERIVED'`, the UI must render an explicit `[DERIVED]` provenance badge in the entity detail panel and prohibit claiming the boundary is an official statutory cartographic gazette.

### 2. Prevention of Temporal Escalation: HISTORICAL Must NEVER Become CURRENT
* **Database Invariant:** Check constraint `chk_entity_geometries_historical_currentness` enforces `is_current = false` whenever `temporal_classification = 'historical_statutory_baseline'`.
* **Delivery Invariant:** Default map endpoints (`/api/v1/geo/current/...`) unconditionally apply the SQL predicate:
  ```sql
  WHERE is_current = true AND valid_to IS NULL
  ```
* **Time-Travel Invariant:** Historical boundaries can only be retrieved by explicitly specifying a temporal parameter (`?as_of=YYYY-MM-DD` or `?version_id=<uuid>`). The response must include the HTTP header `x-geography-temporal-classification: historical` and mark `properties.is_current = false`.

### 3. Prevention of Scenario Pollution: SCENARIO Must NEVER Pollute Legal Geography
* **Namespace Isolation:** Proposed delimitation boundaries or hypothetical scenarios are quarantined under dedicated `dataset_version_id` namespaces (e.g., `scenario_delimitation_2026_v1`), assigned `temporal_classification = 'scenario'`, and flagged `status = 'SYNTHETIC'`.
* **Route Separation:** Default public geometry routes strictly exclude scenario datasets. Scenario visualization requires dedicated routes (`/api/v1/geo/scenarios/:scenarioId/...`), and the mobile client renders a prominent watermarked overlay to prevent confusing civic users.

### 4. Mandatory Governance Envelope
Every feature delivered by the spatial runtime (whether inside an MVT Protocol Buffer or a GeoJSON payload) must embed the standard 10-field governance envelope in its properties:

```json
{
  "entity_id": "TS-MDL-501",
  "version_id": "97e6bece-ca9d-4c31-b51f-50dcbefd927a",
  "dataset_version_id": "tgrac_mandals_2016_v1_topologically_repaired",
  "provenance_id": "b96831d1-6385-45a7-9e4c-1d02e48fa28f",
  "status": "DERIVED",
  "authority_classification": "statutory_cartographic",
  "temporal_classification": "historical_statutory_baseline",
  "valid_from": "2016-10-11",
  "valid_to": null,
  "is_current": false
}
```

---

## Phase E: Pan-India Scale Model

The runtime architecture is designed from first principles to be nationwide and generic. It does not contain any hardcoded assumptions regarding 33 districts, 589 mandals, TGRAC, or Telangana naming conventions.

### 1. Nationwide Hierarchical Structure
```
India (National Republic)
 ├── Administrative Hierarchy:
 │    └── 36 States & Union Territories
 │         └── ~788 Administrative Districts
 │              └── ~6,500+ Sub-Districts (Mandals / Tehsils / Taluks / Blocks / Circles)
 │                   └── ~255,000 Gram Panchayats & Municipal Wards
 │                        └── ~650,000 Census Villages
 └── Electoral Hierarchy:
      └── 543 Parliamentary Constituencies (Lok Sabha)
           └── 4,123 Assembly Constituencies (Vidhan Sabha)
                └── ~1,200,000 Polling Stations (Booths)
```

### 2. Sub-District Administrative Taxonomy
The architecture handles the diverse statutory designations of sub-districts across Indian states without schema alteration, leveraging the `MandalType` enum defined in `packages/shared/src/types/hierarchy.ts`:
* **Mandal:** Telangana, Andhra Pradesh
* **Tehsil:** Uttar Pradesh, Madhya Pradesh, Rajasthan, Maharashtra, Punjab, Haryana, Uttarakhand, Himachal Pradesh
* **Taluk:** Karnataka, Tamil Nadu, Kerala, Gujarat, Goa
* **Block / Community Development (CD) Block:** West Bengal, Bihar, Jharkhand, Odisha
* **Circle / Revenue Circle:** Assam, Arunachal Pradesh, Meghalaya, Mizoram, Nagaland, Manipur, Tripura

### 3. Cross-Boundary Relationships: Administrative vs Electoral
As documented in `@kshetra/shared`, Assembly Constituency boundaries are drawn by the Delimitation Commission of India, whereas District and Sub-District boundaries are drawn by State Revenue Departments. **They do not align 1:1.** A single mandal/tehsil frequently spans across multiple assembly constituencies. The spatial architecture represents these relationships through PostGIS spatial intersections (`ST_Intersection`) and explicit relational mapping tables (`mandal_constituency_map`), preserving the many-to-many reality across India.

### 4. Nationwide Payload Scaling
* **Nationwide Mandals as Raw GeoJSON:** ~250 MB to 350 MB (Fatal to mobile memory and network budgets).
* **Nationwide Mandals as Gzipped GeoJSON:** ~45 MB to 65 MB (Still causes severe garbage collection stutter on 2GB RAM phones).
* **Nationwide Mandals via Vector Tiles (MVT):** **10 KB to 80 KB per tile.** Only the visible viewport is downloaded. Zoom levels z0–z7 show simplified district/state outlines; zoom levels z8–z14 stream local mandal tiles on demand.

---

## Phase F: Current Static Assembly Pipeline Evaluation

A forensic audit of `data/geo/ATTRIBUTION.md` and `scripts/build-geo-assets.mjs` revealed:
* **Source:** The 32 assembly GeoJSON files in `apps/api/public/geo/` originate from `datta07/INDIAN-SHAPEFILES` (a third-party open-source GitHub repository).
* **Governance Status:** They are **unverified delivery artifacts**, not statutory government data. They lack W012 provenance records, lack ECI / Survey of India gazette references, and have no cryptographic lineage chain.
* **Operational Reality:** They currently power the mobile assembly constituency map effectively, with pre-gzipped streaming and device disk caching.

### Architecture Verdict
1. **Short Term (Stages 0–2): COEXIST.** Do not remove or disrupt the existing static assembly pipeline. It maintains working mobile functionality while the canonical PostGIS spatial runtime is engineered.
2. **Mid Term (Stage 3–5): REGENERATE FROM CANONICAL POSTGIS.** Once statutory Assembly and Parliamentary Constituency geometries are ingested into `public.entity_geometries` with full W012 provenance, `scripts/build-geo-assets.mjs` should be updated to query PostGIS directly, replacing the unofficial GitHub shapefiles with governed data.
3. **Target State (Stage 6): UNIFY UNDER VECTOR TILES.** Assembly constituencies and mandals will be delivered as co-registered layers within the unified MVT vector tile pyramid.

---

## Phase G: Recommended Target Architecture

The recommended target architecture is a **Governed Multi-Tier Hybrid Architecture (PostGIS Master + Dual-Path Runtime)**.

### Architectural Breakdown

```
[ CLIENT TIER: Mobile & Web (MapLibre GL) ]
       │                                │
       │ (1) Tile Requests (/z/x/y.mvt)  │ (2) Spatial Queries (/geo/locate, /geo/entities/:id)
       ▼                                ▼
[ EDGE CDN TIER: Cloudflare / CloudFront ]
  - Edge Cache (1-year immutable for ?v=<hash>)
  - Brotli / Gzip compression
  - Geographic PoPs (Mumbai, Delhi, Chennai, etc.)
       │ (Cache Miss)                   │
       ▼                                ▼
[ APPLICATION TIER: Fastify API Gateway ]
  - Route /geo/mvt/:layer/:z/:x/:y (Dynamic MVT tile generator with ST_AsMVT)
  - Route /geo/locate?lat=...&lng=... (Reverse geocoding point-in-polygon)
  - Route /geo/entities/:id/geometry (High-res single entity geometry)
  - Fastify In-Memory / Redis LRU Cache
  - Rate Limiting & Request ID Tracking
       │                                │
       ▼                                ▼
[ DATABASE TIER: Supabase / PostgreSQL 15+ with PostGIS ]
  - public.entity_geometries (Canonical Spatial Store)
  - GiST Spatial Index (idx_entity_geometries_spatial)
  - Immutability & Lifecycle Triggers (trg_prevent_entity_geometry_mutation)
  - Row Level Security (RLS: Read-Only for anon, Revoke All for Writes)
```

### 1. Canonical Spatial Source of Truth
`public.entity_geometries` in PostgreSQL/PostGIS is the sole canonical source of truth. All delivery artifacts (tiles, GeoJSON caches, API responses) are strictly downstream derived representations. A delivery artifact never becomes an independent source of truth.

### 2. Geometry Simplification Ownership
Simplification is owned strictly by the database and asset-compilation tier using PostGIS `ST_SimplifyPreserveTopology()`. The client device never performs expensive Douglas-Peucker simplification in JavaScript.
* **Macro Scale (Zoom z0–z5):** Tolerance `0.05°` (~5.5 km) for national state outlines.
* **Meso Scale (Zoom z6–z9):** Tolerance `0.005°` (~550 m) for district and assembly constituency overviews.
* **Micro Scale (Zoom z10–z14+):** Tolerance `0.0001°` (~11 m) or unsimplified for local mandal and street-level boundaries.

### 3. Caching & Edge Distribution
* **Edge CDN:** Fronts `/geo/*`. Versioned tiles and static files with `?v=<hash>` are cached with `Cache-Control: public, max-age=31536000, immutable`.
* **API Cache:** Fastify caches generated MVT buffers in memory or Redis for frequently visited tiles (e.g. state capitals, high-density districts).
* **Mobile Cache:** MapLibre native cache + Expo FileSystem disk cache ensures previously visited regions display instantly offline.

### 4. Write Security & RLS
* Anonymous and authenticated roles have `REVOKE INSERT, UPDATE, DELETE ON public.entity_geometries`.
* Writes are technically impossible from client applications. Ingestion is restricted to service-role migrations or CTO-authorized scripts executing under explicit transaction boundaries.

---

## Phase H: Staged Migration Path

To ensure zero downtime, zero regression of existing mobile features, and strict governance adherence, implementation is structured into 7 sequential stages:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Stage 0   │ ──> │   Stage 1   │ ──> │   Stage 2   │ ──> │   Stage 3   │
│   Current   │     │  Contract   │     │  Staging    │     │   Runtime   │
│   Baseline  │     │  Foundation │     │ Fastify API │     │ Integration │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                   │
┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │
│   Stage 6   │ <── │   Stage 5   │ <── │   Stage 4   │ <──────────┘
│ Production  │     │ Broader Geo │     │ Performance │
│  Cutover    │     │   Rollout   │     │ Verification│
└─────────────┘     └─────────────┘     └─────────────┘
```

* **Stage 0 — Current Baseline State (ACTIVE):**
  * Static assembly GeoJSON active in `apps/api/public/geo/`.
  * 589 derived mandal geometries stored in staging PostGIS `public.entity_geometries` (`f839fa02...`).
  * Zero canonical mandal runtime path.
* **Stage 1 — Architecture Foundation & Generic Contract Specification (NEXT):**
  * Formalize OpenAPI 3.1 and TileJSON specifications for spatial routes.
  * Define Ajv validation schemas for spatial bounding box and point locate queries.
  * Define mandatory governance envelope properties schema.
  * *Gate: Zero product code or schema modification; architecture documentation only.*
* **Stage 2 — Controlled Staging Implementation:**
  * Implement read-only Fastify routes in `apps/api/src/routes/geo.ts`:
    * `GET /api/v1/geo/locate` (Point-in-polygon querying PostGIS `ST_Intersects`)
    * `GET /api/v1/geo/mvt/:entityType/:z/:x/:y` (Vector tiles via `ST_AsMVT` and `ST_TileEnvelope`)
    * `GET /api/v1/geo/entities/:entityType/:id` (Single entity GeoJSON with full governance envelope)
  * Verify against staging Supabase (`fkpigozcqnmcvofuksar`) using the 589 mandals.
* **Stage 3 — Runtime Verification & Mobile Integration:**
  * Configure MapLibre in `apps/mobile` to consume vector tiles alongside existing raster/shape layers.
  * Verify offline disk caching and touch-tap polygon selection.
  * Audit mobile JavaScript heap memory to confirm zero memory leaks.
* **Stage 4 — Performance & Load Verification:**
  * Execute synthetic k6 load testing against staging spatial endpoints.
  * Verify P95 latency: <30ms for cached tiles, <80ms for dynamic PostGIS queries.
  * Verify bandwidth efficiency under simulated rural 3G network conditions (150 kbps).
* **Stage 5 — Broader Geography Rollout & Pipeline Unification:**
  * Ingest statutory Parliamentary Constituency (543) and Assembly Constituency (4,123) boundaries into canonical PostGIS `public.entity_geometries` with official ECI/SOI W012 provenance.
  * Regenerate static fallback assets from PostGIS; decommission unverified `datta07` shapefiles.
* **Stage 6 — Production Authorization & Cutover:**
  * Submit complete evidence package for formal CTO review.
  * Upon CTO approval, execute Migration 048 and controlled data load onto production (`ehfafcnimmjusyvplbah`).
  * Configure edge CDN routing.

---

## Phase I: Architectural Decision Record & Explicit CTO Decision Points

### Explicit Decision Points for CTO Determination

#### Decision Point 1: Delivery Format for Mandals / Sub-Districts
* **Question:** Should PANIN deliver sub-district (mandal/tehsil/taluk) boundaries via Vector Tiles (MVT / PMTiles) or via monolithic state-sliced GeoJSON files?
* **Recommendation:** **Vector Tiles (MVT).** Delivering 6,500+ mandals as state GeoJSON files will exceed mobile memory limits (upwards of 25–40 MB heap per state in UP/MP) and waste mobile data. Vector tiles slice data by zoom and viewport, transferring only visible polygons.
* **CTO Action Required:** Approve Vector Tile (MVT) delivery for sub-district geography.

#### Decision Point 2: Existing Static Assembly Pipeline Fate
* **Question:** Should the existing static assembly GeoJSON files (sourced from `datta07/INDIAN-SHAPEFILES`) be immediately replaced or temporarily retained?
* **Recommendation:** **Retain temporarily (Coexist) through Stages 0–2.** Replacing them now would destabilize the existing mobile app. In Stage 5, once official ECI/Survey of India constituency boundaries are ingested into PostGIS with W012 provenance, regenerate the static files directly from PostGIS and retire the third-party shapefiles.
* **CTO Action Required:** Approve temporary coexistence with scheduled Stage 5 unification.

#### Decision Point 3: Edge CDN Provisioning
* **Question:** Should a dedicated Edge CDN distribution (Cloudflare / AWS CloudFront) be provisioned in front of Railway to cache spatial assets across India?
* **Recommendation:** **Yes.** Railway origin containers should not absorb raw tile traffic from hundreds of thousands of concurrent mobile clients. Edge PoPs in Mumbai, Delhi, Chennai, Bangalore, and Hyderabad are critical for achieving <30ms tile delivery and 95%+ offload.
* **CTO Action Required:** Approve Edge CDN deployment plan for Stage 4–6.

---

## Phase J: Verification of Zero Code Changes & Clean Tree

Under the strict constraints of directive **W016-C3-R5-R7**:
* Zero lines of product code (`apps/api`, `apps/mobile`, `packages/shared`) were modified.
* Zero database tables, indexes, or migrations were created or executed.
* Zero staging database mutations occurred.
* Production (`ehfafcnimmjusyvplbah`) remained strictly air-gapped and untouched (0 connections).
* The repository working tree remains clean, containing only the authorized architecture decision artifacts.

---

## Final Terminal Status

```
================================================================================
FINAL STATUS: W016-C3-R5-R7 DESIGN COMPLETE — READY FOR CTO ARCHITECTURE DECISION
================================================================================
```

*(Submitted for CTO architecture review. No implementation is authorized until formal CTO determination.)*
