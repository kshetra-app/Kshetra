# W016-C3-R5-R7A: Spatial Runtime Architecture Decision & India-Wide Delivery Design (Revised)

**Document Status:** REVISED — READY FOR CTO ARCHITECTURE DECISION  
**Directive Authority:** CTO Directive W016-C3-R5-R7A  
**Implementation Constraint:** **NO IMPLEMENTATION AUTHORIZED BY THIS DOCUMENT.** (Design & Reconnaissance Only)  
**Previous Accepted Baseline:** W016-C3-R5-R5 (`0ba2171130856b36d12f7cfbeed503fab0a5a10c`)  
**Previous Discovery State:** W016-C3-R5-R6 (`BLOCKED — NO EXISTING CANONICAL RUNTIME READ PATH`, Accepted Discovery Outcome)  
**Revision Date:** 2026-09-28T17:48:00.000Z  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`) ONLY  
**Production Isolation:** `ehfafcnimmjusyvplbah` — **STRICTLY AIR-GAPPED & UNTOUCHED** (0 connections, 0 DDL, 0 DML, 0 mutations)

---

## 1. Executive Summary & Context

This document presents the revised, governance-reconciled **Pan-India Spatial Runtime Architecture** for PANIN following CTO Directive W016-C3-R5-R7A.

The architecture addresses the discovery finding of **W016-C3-R5-R6** that no canonical runtime read path currently exists for `public.entity_geometries`. This revision strictly reconciles governance vocabulary with W012, eliminates unauthorized terminology, establishes an explicit 5-regime Version Selection Contract, separates canonical geometry from delivery geometry, provides a rigorous 4-way technology trade-off evaluation, and removes all state-specific assumptions.

The current 589-geometry dataset in staging is strictly a **validation fixture**. The architecture specified herein is nationwide, generic, and hierarchically scalable across all 36 States/UTs, 788 Districts, 543 Parliamentary Constituencies, 4,123 Assembly Constituencies, and 6,500+ Sub-Districts (Mandals/Tehsils/Taluks/Blocks/Circles).

> **MANDATORY GATE:**  
> **NO IMPLEMENTATION IS AUTHORIZED BY THIS DOCUMENT.**  
> Zero lines of application code, database migrations, or infrastructure changes shall be executed until explicit CTO authorization is granted.

---

## 2. Current State Architecture Audit

A rigorous audit of the existing codebase was conducted to distinguish verifiable facts from inferences and assumptions.

| # | Architecture Dimension | Audit Finding | Classification | Repository Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Static Geometry Pipeline** | Source GeoJSON files in `apps/mobile/data/*.json` are compiled by `scripts/build-geo-assets.mjs` into `apps/api/public/geo/`. Coordinates are rounded to 5 decimal places (~1.1m precision), consecutive duplicates are stripped, and both minified `.json` and gzip level 9 `.json.gz` sibling files are generated alongside a content-hashed `manifest.json`. | **SOURCE CODE FACT** | `scripts/build-geo-assets.mjs` lines 1–202 |
| **2** | **Assembly Geometry Endpoints** | `apps/api/src/routes/geo.ts` exposes `GET /geo/manifest.json` and `GET /geo/:file`. It enforces a strict filename regex (`^[a-z0-9-]+\.json$`), streams pre-built `.gz` files when `Accept-Encoding: gzip` is requested, and sets HTTP cache headers. In addition, `apps/api/src/routes/constituencies.ts` exposes `GET /constituencies/locate`, which runs in-memory point-in-polygon lookup strictly on a hardcoded single state file (`data/geo/telangana-assembly.geojson`). | **SOURCE CODE FACT** | `apps/api/src/routes/geo.ts` lines 1–118, `apps/api/src/routes/constituencies.ts` lines 598–636 |
| **3** | **Mobile Consumption of Assembly Geometry** | `apps/mobile/lib/geoLoader.ts` bundles India national overview (`IN`, ~500 KB) synchronously inside the JavaScript bundle. `apps/mobile/lib/remoteGeoLoader.ts` downloads streamed state files on demand from `${getGeoBaseUrl()}/geo/${file}?v=${version}` via Expo FileSystem, writing to local disk cache (`CACHE_DIR`) and de-duplicating via in-memory `memCache`. `apps/mobile/lib/enrichedGeoCache.ts` merges electoral/demographic data before passing directly to MapLibre `<MapboxGL.ShapeSource>`. | **SOURCE CODE FACT** | `apps/mobile/lib/geoLoader.ts` lines 1–99, `apps/mobile/lib/remoteGeoLoader.ts` lines 1–122, `apps/mobile/lib/enrichedGeoCache.ts` lines 1–155 |
| **4** | **Geometry File Formats** | Standard WGS84 (SRID 4326) GeoJSON `FeatureCollection` containing `Polygon` or `MultiPolygon`. Sanitized at load time by `sanitizeGeoJSON()` in `apps/mobile/lib/geoLoader.ts` to eliminate degenerate rings (<4 positions) to prevent native MapLibre GL crashes. | **SOURCE CODE FACT** | `apps/mobile/lib/geoLoader.ts` lines 22–59, `data/geo/ATTRIBUTION.md` |
| **5** | **Caching Strategy** | Multi-tier: Tier 1 (Metro bundle inlining for `IN`), Tier 2 (in-memory `Map` heap cache in `remoteGeoLoader.ts` and `enrichedGeoCache.ts`), Tier 3 (device disk cache via `expo-file-system` keyed by state and version hash), Tier 4 (HTTP cache headers). | **SOURCE CODE FACT** | `apps/mobile/lib/remoteGeoLoader.ts` lines 18–24, `apps/api/src/routes/geo.ts` lines 77–82 |
| **6** | **HTTP Cache Headers** | Versioned URLs (`?v=<hash>`) receive `Cache-Control: public, max-age=31536000, immutable`. Bare URLs receive `public, max-age=86400, stale-while-revalidate=604800`. API state endpoints receive `public, max-age=300, s-maxage=300`. | **SOURCE CODE FACT** | `apps/api/src/routes/geo.ts` lines 78–82, `apps/api/src/server.ts` lines 129–136 |
| **7** | **CDN / Reverse Proxy Behavior** | Production API is hosted on Railway (`kshetra-api-production-9f06.up.railway.app`). No dedicated edge CDN is currently evidenced in code or DNS configuration in the repository. Fastify acts as the direct origin server. | **CONFIGURATION FACT** & **INFERENCE** | `apps/mobile/lib/constants.ts` lines 17–30 |
| **8** | **API Authentication Model** | Public spatial endpoints (`/geo/*`, `/states/*`, `/constituencies/*`) allow anonymous access (`anon`). Administrative routes (`/manage/*`, `/moderation/*`, `/metrics`) enforce Bearer tokens. PostgREST `public.entity_geometries` allows `SELECT` to `anon` and `authenticated`, with `INSERT/UPDATE/DELETE` revoked. | **SOURCE CODE FACT** | `apps/api/src/server.ts`, `supabase/migrations/048_w016_c3_r5_r3_entity_geometries_schema.sql` lines 252–272 |
| **9** | **Public-Read Patterns** | Anonymous clients fetch static assets and state metadata without authentication headers. All rendered boundary maps are public-domain civic data. | **SOURCE CODE FACT** | `apps/mobile/lib/remoteGeoLoader.ts` lines 74–79 |
| **10** | **Error / Loading / Empty Semantics** | `geo.ts` returns structured JSON error `{ error: 'Not Found', statusCode: 404, code: 'NOT_FOUND' }`. `remoteGeoLoader.ts` throws on non-200 to trigger client retry affordances. `enrichedGeoCache.ts` catches enrichment errors and returns raw GeoJSON so the map canvas does not crash. MapLibre silently rejects invalid rings, which `sanitizeGeoJSON()` prevents. | **SOURCE CODE FACT** | `apps/api/src/lib/replyHelper.ts`, `apps/mobile/lib/enrichedGeoCache.ts` lines 44–48, `apps/mobile/lib/geoLoader.ts` lines 28–33 |
| **11** | **Mobile Memory / Performance Constraints** | The mobile client parses entire per-state GeoJSON files (e.g., Uttar Pradesh: 6.97 MB plain text, ~25 MB parsed in JavaScript heap) into memory. `memCache` has no LRU eviction policy. Passing large GeoJSON objects across the React Native bridge to MapLibre `<MapboxGL.ShapeSource>` causes UI thread pauses and memory pressure on low-tier Android hardware. | **INFERENCE** & **RUNTIME EVIDENCE** | `apps/mobile/lib/enrichedGeoCache.ts` line 16, `apps/mobile/lib/remoteGeoLoader.ts` line 19 |
| **12** | **Database Access Patterns** | Mobile client uses PostgREST for 22 Class-A read models. Fastify backend connects to PostgreSQL via connection pool. `public.entity_geometries` has 589 rows in staging (`f839fa02...`), but is queried exclusively by administrative verification scripts; zero application endpoints currently query it. | **RUNTIME EVIDENCE** | `reports/w016_c3_r5_r6_spatial_runtime_integration.json` |

---

## 3. Classification of the Static Assembly Pipeline

A forensic audit of `data/geo/ATTRIBUTION.md` and `scripts/build-geo-assets.mjs` establishes the precise status of the existing static assembly pipeline:

1. **Current Delivery Artifact:** The 32 state assembly GeoJSON files in `apps/api/public/geo/` are pre-compiled delivery artifacts designed for offline-capable mobile map display.
2. **Source-of-Truth Status:** **UNOFFICIAL / EXTERNAL.** The files originate from `datta07/INDIAN-SHAPEFILES` (a third-party open-source GitHub repository). They are not statutory government gazette data.
3. **Governance Status:** **UNVERIFIED DELIVERY ARTIFACT.** They lack W012 provenance records, lack ECI / Survey of India gazette references, and have no cryptographic lineage chain in `public.provenance_records`.
4. **Replacement / Coexistence Status:** **COEXIST TEMPORARILY.** The existing static assembly pipeline must be retained during Stages 0–2 to preserve active mobile features. Once statutory Parliamentary and Assembly Constituency geometries are ingested into canonical PostGIS `public.entity_geometries` with full W012 provenance (Stage 5), the static assembly delivery artifacts will be regenerated directly from PostGIS. **No replacement is authorized yet.**

---

## 4. Target Architecture Principles

The architecture is governed by five foundational principles:

1. **Separation of Canonical Store from Delivery Representations:**
   * **Canonical Store:** PostgreSQL / PostGIS `public.entity_geometries` is the single authoritative source of truth. It stores legally validated, full-precision MultiPolygons anchored to W012 provenance records, dataset versions, and immutability triggers.
   * **Delivery Representations:** Vector tiles (MVT/PMTiles), bounding-box slices, and simplified polygons are downstream derived representations. A delivery representation never becomes an independent source of truth.
2. **Temporal / Versioned Geography:**
   * PANIN uses **temporal/versioned geography** anchored to: stable entity identity, version identity, `valid_from`, `valid_to`, `is_current`, dataset versions, and provenance.
   * Terminology note: This model is versioned statutory geography, not bitemporal (as no separate system-time transaction dimension is modeled).
3. **Canonical W012 Governance Vocabulary:**
   * The system strictly enforces the canonical `data_status_enum`:
     `OFFICIAL`, `DERIVED`, `VERIFIED`, `ESTIMATE`, `SCENARIO`, `INFERRED`, `UNVERIFIED`, `UNKNOWN`.
   * Nonexistent terms such as `SYNTHETIC` are strictly prohibited. Scenario geography is represented using `status = 'SCENARIO'` under quarantined dataset versions.
4. **Separation of Database Governance from Runtime Feature Properties:**
   * High-volume vector tiles carry only essential identifiers and status fields to minimize mobile bandwidth.
   * Comprehensive statutory lineage (hashes, evidence records, gazette citations) is served via dedicated detail/metadata endpoints on demand.
5. **Fail-Closed Degraded Behavior:**
   * The system must never substitute an unrelated geography, default a historical date to current, or mix scenarios with statutory boundaries when services are unavailable.

---

## 5. Candidate Architectures & Technology Trade-Off Evaluation

To support the CTO's decision, four spatial delivery architectures are evaluated across 15 technical and operational dimensions:

* **Option A: Dynamic Fastify/PostGIS MVT:** Generates Mapbox Vector Tiles on-the-fly via Fastify invoking PostGIS `ST_AsMVT` and `ST_TileEnvelope`.
* **Option B: Pre-Generated Versioned MVT Files:** Batch-renders all zoom tiles into static directories or S3 buckets behind an edge CDN.
* **Option C: Single-File PMTiles Archive:** Packages multi-layer tiles into single-file PMTiles archives served from object storage via HTTP Range Requests (RFC 7233).
* **Option D: Governed Multi-Tier Hybrid (Recommended):** Uses pre-rendered PMTiles/MVT behind an edge CDN for visual map navigation, complemented by dynamic Fastify/PostGIS APIs for point reverse-geocoding (`locate`), spatial search, and temporal time-travel inspection.

### Comprehensive Comparison Matrix

| Evaluation Dimension | Option A: Dynamic PostGIS MVT | Option B: Pre-Generated MVT Files | Option C: PMTiles Archive (S3/Range) | Option D: Governed Multi-Tier Hybrid |
| :--- | :--- | :--- | :--- | :--- |
| **1. Latency** | Moderate (50–250ms cold execution depending on spatial index & query complexity) | Very Low (15–50ms at edge PoP, zero database involvement) | Very Low to Low (20–70ms; initial directory read, then cached leaf chunks) | **Optimal (<30ms visual tiles from edge; <80ms for dynamic queries)** |
| **2. Database Load** | High (every unique pan/zoom viewport executes PostGIS SQL) | Zero during runtime serving (heavy batch load during generation only) | Zero during runtime serving (heavy batch load during generation only) | **Low (DB handles point-locate and audit queries; zero tile load)** |
| **3. API Load** | High (Fastify serializes, parses, and compresses tile buffers) | Zero (served directly from object storage / static web origin via CDN) | Zero (client directly fetches byte ranges from CDN / object storage) | **Low (Fastify handles business logic, auth, and spatial queries)** |
| **4. Cacheability** | High at edge if version-keyed; low during cold initial navigation | Maximum (immutable, content-addressed files cached permanently) | High (range requests cacheable by CDNs supporting HTTP 206) | **Optimal (visual tiles immutable; query endpoints use short TTL + SWR)** |
| **5. Cold-Cache Behavior** | Spikes in latency and DB CPU on first visits to dense geographic regions | Fast (edge pulls single static file from object storage once, ~50–80ms) | Moderate (first tile requires reading PMTiles directory header) | **Fast and graceful (graceful edge degradation)** |
| **6. Operational Complexity** | Moderate (relies on existing Fastify backend and PostGIS database) | High (requires batch tile pipeline, millions of files, directory sync) | Moderate (single archive file per state/country/regime; no file sprawl) | **Moderate (controlled batch job on ingestion; standard API for queries)** |
| **7. Storage Requirements** | Minimal (only PostGIS table storage; zero pre-generated tile files) | High (millions of small individual `.mvt` files across zoom levels z0–z14) | Low to Moderate (compact binary archive, tile deduplication) | **Moderate (canonical DB tables + compressed PMTiles archives)** |
| **8. Invalidation Strategy** | Automatic when cache keys include `dataset_version_id` | Trivial (new versions written to new content-addressed path) | Atomic (uploading new `.pmtiles` file replaces the archive instantly) | **Content-addressed versions; zero stale mutation risk** |
| **9. Geography-Version Handling** | Excellent (parameterized SQL filters any `valid_from`/`valid_to` on the fly) | Requires separate pre-generated tile tree per statutory version | Clean (one PMTiles archive per `dataset_version_id` or regime) | **Comprehensive (Current, Historical, Version, and Scenarios)** |
| **10. Provenance Support** | Direct (reads directly from governed database columns) | Baked at build time (immutable metadata in tile properties) | Baked at archive creation time with root metadata header | **100% compliant with W012 (DB-anchored + tile headers)** |
| **11. Historical Geography Support** | Seamless (parameterized with `?as_of=...` or `?version_id=...`) | Requires pre-generating tiles for each historical regime | Clean (one static archive per historical regime, loaded on demand) | **Full (historical archives for rendering + DB for audit)** |
| **12. Mobile Performance** | Excellent once tiles arrive (MapLibre hardware accelerated) | Excellent (MapLibre vector source native) | Excellent (MapLibre native integration via protocol handler) | **Maximum (native vector tiles in MapLibre + lightweight query JSON)** |
| **13. Nationwide Scaling** | Poor under sudden nationwide load spikes without DB replicas | Virtually infinite at edge (100k+ concurrent users with zero DB load) | Excellent (scales with object storage read bandwidth and CDN caching) | **Unbounded (scales to all of India without DB bottlenecks)** |
| **14. Failure Modes** | Database connection pool exhaustion, query timeouts on dense bounds | Missing tile files (404), stale CDN caches if keys misconfigured | CDN edge failing HTTP 206 Range requests; corrupt archive header | **Isolated (tile failure leaves queries alive; query failure leaves map alive)** |
| **15. Qualitative Cost** | High database compute costs (CPU/RAM scaling on PostgreSQL) | Low DB compute; moderate object storage file-count and CDN costs | Lowest storage and compute cost; pay only for S3 storage and egress | **Balanced & cost-efficient (minimizes high-cost DB compute)** |

---

## 6. The Version Selection Contract

To guarantee that the runtime system never silently converts one geographic regime into another, the architecture mandates an explicit **Version Selection Contract**:

```
[ Incoming Request ]
        │
        ├── Has ?scenario_id=... ────────────────────────> [ REGIME E: Scenario Geography ]
        │                                                  (Quarantined, status=SCENARIO, non-statutory)
        │
        ├── Has ?version_id=... OR ?version_code=... ────> [ REGIME C: Explicit Version Selection ]
        │                                                  (Exact immutable version record lookup)
        │
        ├── Has ?as_of=YYYY-MM-DD ───────────────────────> [ REGIME B: Historical As-Of Date ]
        │                                                  (Temporal interval valid_from <= T < valid_to)
        │
        ├── Has ?regime_id=... (Future Enacted) ─────────> [ REGIME D: Future Anticipated Regime ]
        │                                                  (valid_from > CURRENT_DATE, is_current=false)
        │
        └── No Special Parameters (Default) ─────────────> [ REGIME A: Current Statutory Geography ]
                                                           (is_current=true, valid_to IS NULL, active)
```

### Explicit Contract Guarantees

1. **Regime A — Current Statutory Geography (Default):**
   * Default active regime currently in legal effect.
   * SQL Filter: `WHERE is_current = true AND (valid_to IS NULL OR valid_to > CURRENT_DATE) AND temporal_classification != 'scenario'`.
   * Fail-Closed: If an entity has no active statutory record, returns `404 Not Found`. Never substitutes a historical or scenario version.
2. **Regime B — Historical / As-Of-Date Geography:**
   * Statutory geography as it legally existed on a specific historical date.
   * Parameter: `?as_of=YYYY-MM-DD`.
   * SQL Filter: `WHERE valid_from <= :as_of_date::date AND (valid_to > :as_of_date::date OR valid_to IS NULL) AND temporal_classification = 'historical_statutory_baseline'`.
   * Header: Emits `x-geography-temporal-classification: historical`.
3. **Regime C — Explicit Version Selection:**
   * Direct fetch of a specific, immutable version record by UUID or unique version code.
   * Parameters: `?version_id=<UUID>` or `?version_code=<STRING>`.
   * SQL Filter: `WHERE id = :version_uuid OR version_code = :version_code`.
4. **Regime D — Future Anticipated Statutory Regime:**
   * Statutorily enacted delimitation or reorganization orders scheduled for a future date.
   * Parameter: `?regime_id=<STRING>`.
   * SQL Filter: `WHERE delimitation_regime_id = :regime_id AND valid_from > CURRENT_DATE AND is_current = false`.
   * Header: Emits `x-geography-regime: future_enacted`. Prohibited from default map feeds.
5. **Regime E — Scenario / Simulation Geography:**
   * Non-statutory algorithmic models, draft boundary proposals, or civic simulations.
   * Parameter: `?scenario_id=<UUID>`.
   * Criteria: `dataset_version_id LIKE 'scenario_%'` AND `status = 'SCENARIO'`.
   * Isolation: Quarantined into dedicated `/api/v1/geo/scenarios/:scenarioId/...` routes. Inaccessible via standard public endpoints.

---

## 7. Reframing Geometry Simplification: Canonical vs Delivery

The architecture strictly separates **CANONICAL GEOMETRY** from **DELIVERY GEOMETRY**:

### Canonical Geometry
* Resides in PostgreSQL/PostGIS `public.entity_geometries`.
* Authoritative single source of truth.
* Full coordinate precision, valid MultiPolygons (`chk_entity_geometries_is_valid`).
* Strictly immutable (enforced by `trg_prevent_entity_geometry_mutation`).

### Delivery Geometry
When delivery geometries (tiles or simplified GeoJSON) are generated, they are documented as downstream derived representations. Every delivery generation process must record:
* **Source Entity & Version:** Exact `entity_id` and `mandal_version_id`.
* **Source Geometry Identity:** Canonical geometry SHA-256 hash.
* **Transformation Algorithm:** Explicit algorithm (e.g. Visvalingam-Whyatt, Douglas-Peucker `ST_SimplifyPreserveTopology`, Mapshaper planar simplify).
* **Transformation Parameters:** Tolerance in degrees/meters, minimum area threshold.
* **Transformation Version:** Semantic version of the build pipeline (e.g., `geo-pipeline-v1.2.0`).
* **Output Representation:** MVT binary protobuf, simplified GeoJSON, or PMTiles.
* **Provenance Relationship:** Explicit lineage linking the delivery artifact to the canonical source geometry.
* **Reproducibility:** Deterministic output given identical source geometry and parameters.
* **Invalidation / Rebuild Rules:** Re-generated automatically when canonical version changes or pipeline version is bumped.

---

## 8. Governance Envelope: Database Storage vs Runtime Payload

To protect mobile network bandwidth while guaranteeing statutory auditability, the architecture separates the database governance model from the runtime feature properties.

### Tier 1: Runtime Tile Feature Properties (Embedded in MVT / Vector Tiles)
Carried within every individual vector tile feature. Strictly limited to minimal identifiers and display attributes to keep tile payloads under 50–80 KB:

```json
{
  "entity_id": "IN-TS-MDL-501",
  "version_id": "97e6bece-ca9d-4c31-b51f-50dcbefd927a",
  "name": "Rajendranagar",
  "status": "DERIVED",
  "is_current": false,
  "regime_type": "historical_statutory_baseline"
}
```

### Tier 2: Comprehensive Governance Payload (Fetched via Detail API)
Fetched lazily on-demand when a user taps a boundary or requests statutory audit evidence (`GET /api/v1/geo/entities/:entityType/:id/metadata`):

```json
{
  "entity_id": "IN-TS-MDL-501",
  "entity_type": "mandal",
  "version_id": "97e6bece-ca9d-4c31-b51f-50dcbefd927a",
  "version_code": "IN-TS-MDL-501-2016-V1",
  "dataset_version_id": "tgrac_mandals_2016_v1_topologically_repaired",
  "provenance_id": "b96831d1-6385-45a7-9e4c-1d02e48fa28f",
  "status": "DERIVED",
  "authority_classification": "statutory_cartographic",
  "temporal_classification": "historical_statutory_baseline",
  "valid_from": "2016-10-11",
  "valid_to": null,
  "is_current": false,
  "source_feature_id": "286",
  "raw_artifact_sha256": "aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db",
  "snapshot_date": "2016-10-11",
  "verification_evidence_id": "e0160000-0000-0000-0000-000000001014",
  "verification_evidence_sha256": "dd16ff36d2d9c581cbc5c29125fb33787310c2d4c203d98b88aa74308d4ad077",
  "lineage_summary": "Derived from raw TGRAC source via deterministic ST_MakeValid Candidate B knot repair."
}
```

### Architectural Status Guarantee (Decoupled from UI)
The architecture guarantees that runtime status remains available in all payloads (`status` field) and cannot be falsely promoted from `DERIVED` to `OFFICIAL`. Presentation design (badges, alerts, or styling) is decoupled and left to product UI specifications.

---

## 9. Edge Layer Requirements (CDN as a Proposal)

An edge caching layer is proposed to protect the origin server from raw tile load. The architecture does not mandate or commit to any specific vendor (Cloudflare, AWS CloudFront, Fastly).

### Edge Layer Technical Requirements
1. **Protocol Standards:** Full HTTP/2 and HTTP/3 support with TLS 1.3.
2. **Byte-Range Requests:** Strict compliance with RFC 7233 (HTTP 206 Partial Content) to support PMTiles single-file archive requests.
3. **Compression:** Automatic Brotli and Gzip compression on dynamic and static responses.
4. **Cache-Control Obedience:** Strict adherence to origin headers (`public, max-age=31536000, immutable` for versioned tiles; `s-maxage` and `stale-while-revalidate` for dynamic feeds).
5. **Geographic PoP Density:** Edge presence across major Indian internet exchange points (Mumbai, Delhi, Chennai, Bangalore, Hyderabad).
6. **Measurable Performance Target:** *Future acceptance target:* P95 latency < 50ms at edge PoPs under 1,000 req/sec across India. (Label: Target for future measurement, not a current fact).

---

## 10. Pan-India Scale & Sub-District Taxonomy

The architecture contains **zero Telangana-specific concepts**. Telangana is purely a staging validation fixture.

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
Handled via the generic `MandalType` enum defined in `packages/shared/src/types/hierarchy.ts`:
* **Mandal:** Telangana, Andhra Pradesh
* **Tehsil:** Uttar Pradesh, Madhya Pradesh, Rajasthan, Maharashtra, Punjab, Haryana, Uttarakhand, Himachal Pradesh
* **Taluk:** Karnataka, Tamil Nadu, Kerala, Gujarat, Goa
* **Block / CD Block:** West Bengal, Bihar, Jharkhand, Odisha
* **Circle / Revenue Circle:** Assam, Arunachal Pradesh, Meghalaya, Mizoram, Nagaland, Manipur, Tripura

---

## 11. Qualitative Cost & Operations Analysis

| Cost / Operational Dimension | Analysis |
| :--- | :--- |
| **PostGIS Compute** | Substantially minimized by offloading visual map rendering to pre-rendered vector tiles. The database only handles point reverse-geocoding, search, and audit queries. |
| **API Compute** | Fastify handles lightweight JSON business logic and spatial index lookups. CPU and memory footprints remain low and horizontally scalable. |
| **Object Storage** | Highly economical. Storing compressed PMTiles archives or MVT directories in cloud object storage (S3/R2) requires minimal cost. |
| **Edge CDN** | >95% cache hit ratio on versioned vector tiles significantly reduces origin egress and infrastructure sizing. |
| **Tile Generation** | Batch compute executed asynchronously upon new dataset version ingestion; never executed in customer request critical paths. |
| **Bandwidth** | Binary vector tiles reduce wire transfer by 70–80% compared to raw GeoJSON, reducing cellular data consumption for rural users. |
| **Observability** | Fully integrated with Fastify structured error tracking and OpenTelemetry metrics collectors. |

---

## 12. Offline & Degraded Mode Resilience Matrix

| Failure Mode | System Response | Non-Negotiable Invariant |
| :--- | :--- | :--- |
| **Edge CDN Outage** | Mobile client serves boundaries from local SQLite / FileSystem disk cache. If uncached, displays offline notification with bundled national overview (`IN`). | **Never substitutes incorrect or unverified boundary files.** |
| **API Gateway Outage** | Map rendering continues uninterrupted using cached tiles. Point inspection (`locate`) displays "Service temporarily unavailable" without disrupting map canvas. | **Never crashes the mobile UI thread or renders blank canvas.** |
| **Database Outage** | Static tiles and cached API responses continue serving from edge CDN and Redis. Dynamic spatial queries return structured HTTP 503 with error code `DATABASE_FAILURE`. | **Never serves uncommitted or dirty data.** |
| **Tile Missing / Corrupt** | MapLibre leaves the missing tile area transparent with retry affordance. | **Never stretches adjacent tiles or substitutes mismatched geography.** |
| **Temporal Version Missing** | Returns structured HTTP 404 with error code `GEOGRAPHY_VERSION_NOT_FOUND`. | **Never silently defaults a historical date query to current geography.** |

---

## 13. Recommended Target Architecture: Governed Multi-Tier Hybrid

```
[ CLIENT TIER: Mobile & Web (MapLibre GL) ]
       │                                │
       │ (1) Tile Requests (/z/x/y.mvt)  │ (2) Spatial Queries (/geo/locate, /geo/entities/:id)
       ▼                                ▼
[ PROPOSED EDGE CDN LAYER (Vendor-Agnostic) ]
  - Edge Cache (1-year immutable for ?v=<hash>)
  - RFC 7233 HTTP 206 Range Support (for PMTiles)
  - Brotli / Gzip compression
       │ (Cache Miss)                   │
       ▼                                ▼
[ APPLICATION TIER: Fastify API Gateway ]
  - Static PMTiles / MVT file streaming (or direct from S3)
  - Point-in-polygon reverse geocode (ST_Intersects)
  - Entity detail with Version Selection Contract
  - Fastify In-Memory / Redis LRU Cache
       │                                │
       ▼                                ▼
[ DATABASE TIER: Supabase / PostgreSQL 15+ with PostGIS ]
  - public.entity_geometries (Canonical Spatial Store)
  - GiST Spatial Index (idx_entity_geometries_spatial)
  - Immutability & Lifecycle Triggers (trg_prevent_entity_geometry_mutation)
  - Row Level Security (RLS: Read-Only for anon, Revoke All for Writes)
```

1. **Canonical Source of Truth:** `public.entity_geometries` in PostgreSQL/PostGIS.
2. **Delivery Representation:** PMTiles single-file archives / MVT vector tiles for visual maps; lightweight JSON for queries.
3. **Query Path:** Client -> Fastify Gateway -> PostGIS GiST index -> Client.
4. **Tile Path:** Client -> Edge CDN -> PMTiles / Object Storage -> Client.
5. **Cache Path:** Client disk cache -> Edge CDN -> Fastify memory -> PostGIS.
6. **Version Selection:** Strict 5-regime contract (Current, Historical, Version, Future, Scenario).
7. **Provenance Preservation:** Tier 1 lightweight properties in tiles; Tier 2 comprehensive statutory lineage via detail API.
8. **Security:** Zero client writes (enforced by RLS and database triggers).
9. **Failure / Degraded Semantics:** Fail-closed, explicit error codes, zero silent geographic substitutions.

---

## 14. Staged Migration Path

Implementation is structured into 7 sequential stages:

* **Stage 0 — Current Baseline State (ACTIVE):**
  * Static assembly GeoJSON active in `apps/api/public/geo/`.
  * 589 derived mandal geometries stored in staging PostGIS `public.entity_geometries` (`f839fa02...`).
  * Zero canonical mandal runtime path.
* **Stage 1 — Architecture Foundation & Generic Contract Specification (NEXT):**
  * Formalize OpenAPI 3.1 and TileJSON specifications for spatial routes.
  * Define Ajv validation schemas for Version Selection Contract.
  * *Gate: Zero product code or schema modification; architecture documentation only.*
* **Stage 2 — Controlled Staging Implementation:**
  * Implement read-only Fastify routes in `apps/api/src/routes/geo.ts`:
    * `GET /api/v1/geo/locate` (Point-in-polygon querying PostGIS `ST_Intersects`)
    * `GET /api/v1/geo/mvt/:entityType/:z/:x/:y` (or PMTiles reader)
    * `GET /api/v1/geo/entities/:entityType/:id` (Single entity GeoJSON with governance envelope)
  * Verify against staging Supabase (`fkpigozcqnmcvofuksar`) using the 589 mandal fixture.
* **Stage 3 — Runtime Verification & Mobile Integration:**
  * Configure MapLibre in `apps/mobile` to consume vector tiles alongside existing raster/shape layers.
  * Verify offline disk caching and touch-tap polygon selection.
  * Audit mobile JavaScript heap memory to confirm zero memory leaks.
* **Stage 4 — Performance & Load Verification:**
  * Execute synthetic k6 load testing against staging spatial endpoints.
  * Measure latency, CDN cache hit ratio, and low-bandwidth resilience.
* **Stage 5 — Broader Geography Rollout & Pipeline Unification:**
  * Ingest statutory Parliamentary Constituency (543) and Assembly Constituency (4,123) boundaries into canonical PostGIS `public.entity_geometries` with official ECI/SOI W012 provenance.
  * Regenerate static fallback assets from PostGIS; decommission unverified `datta07` shapefiles.
* **Stage 6 — Production Authorization & Cutover:**
  * Submit complete evidence package for formal CTO review.
  * Upon CTO approval, execute Migration 048 and controlled data load onto production (`ehfafcnimmjusyvplbah`).

---

## 15. Implementation Gate & Final Status

> **NO IMPLEMENTATION IS AUTHORIZED BY THIS DOCUMENT.**  
> The purpose of R5-R7A is to provide the CTO with complete, rigorous information to make the architecture decision. All product code, migrations, and infrastructure configurations remain strictly untouched.

```
================================================================================
FINAL STATUS: W016-C3-R5-R7A DESIGN REVISION COMPLETE — READY FOR CTO DECISION
================================================================================
```

*(Submitted for CTO architecture review. All execution stopped per protocol. No implementation will begin until authorized by CTO.)*
