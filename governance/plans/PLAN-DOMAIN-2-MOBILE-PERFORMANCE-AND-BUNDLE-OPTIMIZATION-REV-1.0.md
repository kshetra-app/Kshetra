# Master Pre-Implementation Plan: Domain 2 — Mobile Client, Bundle Size & Performance Optimization (JOB 024 – JOB 029)

**Document Version:** Rev 1.0  
**Date:** 2026-10-30  
**Status:** PLAN_SUBMITTED_FOR_REVIEW (IMPLEMENTATION_AUTHORIZATION = NO)  
**Governing Authority:** Master Product Blueprint, AI Agent Master Execution Job Book, Amendment v1.2 (`AMENDMENT_v1.2.md`), Amendment v1.3 (`AMENDMENT_v1.3.md`), Amendment v1.4 (`AMENDMENT_v1.4.md`), Amendment v1.5 (`AMENDMENT_v1.5.md`), Amendment v1.5-A (`AMENDMENT_v1.5-A.md`), Amendment v1.6 (`AMENDMENT_v1.6.md`), & `AGENT_EXECUTION_PROTOCOL.md`  
**Execution Standard:** Rule IV-001 Non-Self-Acceptance with empirical automated proofs  
**Base Commit SHA:** `615b42ba3c659464bb77d5d77f178f009d57200d`  

---

## 1. Executive Summary & Objective

Following the certified completion and acceptance of **Domain 1 (JOB 012, 013, 016, 021, 022 under DEC-169)** and **Job W052 / DEF-003 Decoupling under DEC-171**, PANIN's core foundational geography, delimitations, compliance, and broadcast engines are fully operational and synchronized.

The user has explicitly commissioned **Domain 2: Mobile Client, Bundle Size & Performance**, encompassing 6 critical pending jobs:
1. **JOB 024: App Size Baseline** — Measuring and certifying the Android Universal / AAB size baseline against statutory release gates.
2. **JOB 025: Mobile Dependency Reduction** — Pruning non-essential packages, eliminating build-time tooling from runtime dependencies, and auditing tree-shaking across all 50 mobile screens.
3. **JOB 026: Remote Geography / Data Loading** — Decoupling large static inlined JSON datasets (`india-states.json` 1.02 MB and `candidate-photo-map.json` 494 KB) from client bundles to dynamic remote delivery with local disk caching.
4. **JOB 027: Mobile Startup Architecture** — Transforming mobile boot into a two-phase non-blocking architecture, establishing startup telemetry, and certifying cold start $< 2.0\text{s}$ (target $< 500\text{ms}$ warm).
5. **JOB 028: Map Performance** — Implementing Douglas-Peucker polygon simplification, viewport bounding-box clipping, and memoized GPU layers for smooth 60fps map rendering.
6. **JOB 029: Network/Cache Architecture** — Establishing a standardized Tiered Storage & Cache Architecture across MMKV (fast key-value), SQLite (relational entities), and FileSystem (blobs/polygons) with unified TTL and Stale-While-Revalidate policies.

This Pre-Implementation Plan provides the exhaustive architectural blueprint, implementation specifications, empirical test batteries, and governance controls required before executing any product code modification.

---

## 2. Governing Authority & Pre-Implementation Invariants

### 2.1 Governance Standard
This operation is governed by:
- **Amendment v1.5-A Section 26:** Mandatory Pre-Implementation Planning and Direction-Review Gate. No product code changes may be staged or committed prior to explicit user ratification.
- **Amendment v1.6 (REV-8):** Nine-Stage Job Lifecycle State Machine, Chain-of-Custody scope enforcement, and Real-State Control M.
- **Rule IV-001 Non-Self-Acceptance:** The implementation agent cannot be the sole judge of its own work. All acceptance dispositions must cite committed, reproducible evidence dossiers.
- **RELEASE_REGISTER.md Performance Gates:**
  - Max Consumer AAB: $\le 30\text{ MB}$ (Target: $\le 25\text{ MB}$)
  - Max Universal APK: $\le 45\text{ MB}$
  - Cold App Startup: $< 2.0\text{s}$
  - Warm App Startup: $< 500\text{ms}$

### 2.2 Pre-Implementation Invariants
1. **Zero Placeholder / Zero Stub Invariant:** Every module, cache policy, and optimization algorithm must be 100% functional with real execution paths.
2. **Offline-First Resilience:** Decoupling geography and data must NEVER break offline operation; local cached fallbacks and progressive hydration ensure the app paints immediately even with zero connectivity.
3. **Bytecode Bundle Ceiling:** The compiled Hermes bytecode bundle must not exceed 2.5 MB, and decoupling static JSONs must drive it toward $< 1.8\text{ MB}$.
4. **13-Language i18n Preservation:** All optimizations must preserve 100% key parity across all 13 supported Indian languages without string regression.

---

## 3. Historical Context & Defect Traceability

### 3.1 Defect Register Links
- **DEF-003:** In W052, `react-native-webrtc` was extracted from the consumer bundle. In Domain 2, JOB 025 extends this work to systematically prune runtime dependencies, devDependencies leakage, and unused transitives across the entire mobile package.
- **DEF-002 / DEF-005:** Legacy deceptive success returns and dual-backend ambiguities were replaced with fail-closed semantics in W011. Domain 2 guarantees that caching and offline queues never introduce deceptive synthetic data.
- **DEF-008 / DEF-012:** 13-locale parity (2,371 keys) achieved in W010 is strictly maintained during lazy loading.

### 3.2 Release Register Traceability
`RELEASE_REGISTER.md` currently records:
```markdown
| Release Tag | Target Env | Target Binary | Measured Size (AAB/APK) | JS Bundle Size | API Version | Git Commit | Release Gate Status | Verified By | Independent Verifier |
| `v0.1.0-audit` | Dev Baseline | Android Universal | Pending measurement | TBD | v1 | `0f7e104` | Baseline Audit | ARCH / DEVOPS | N/A |
```
Domain 2 directly resolves this historical debt by measuring real Hermes bytecode and asset footprints, verifying them against the $\le 30\text{ MB}$ AAB and $\le 45\text{ MB}$ APK ceilings, and certifying release gate status.

---

## 4. Forensic Architecture & Current Baseline Findings

Diagnostic probes conducted against the current codebase revealed:

1. **Hermes Bytecode Measurement:**
   - Production Android bundle export (`entry-f6d267fc002ad131cc2655a78f3782a5.hbc`): **2,462,096 bytes (2.46 MB)**.
   - Bundled image and icon assets (24 assets): **~24.8 KB**.
   - Current Hermes bundle comfortably meets the JS bundle budget ($< 5\text{ MB}$), but is artificially bloated by inlined JSON datasets.

2. **Inlined Heavy Datasets (`apps/mobile/data`):**
   - `apps/mobile/lib/geoLoader.ts` lines 17–19:
     ```ts
     const loaders: Record<string, () => GeoJSON.FeatureCollection> = {
       IN: () => require('../data/india-states.json') as GeoJSON.FeatureCollection,
     };
     ```
     Inlining `india-states.json` embeds **1,024,198 bytes (1.02 MB)** of uncompressed geometry JSON into the initial JavaScript bundle!
   - `apps/mobile/lib/candidatePhotos.ts` lines 12–14:
     ```ts
     STATIC_PHOTO_MAP = require('../data/candidate-photo-map.json');
     ```
     Inlining `candidate-photo-map.json` embeds **494,559 bytes (494 KB)** into the JavaScript bundle.
   - **Combined Inlined Weight:** Over **1.51 MB** of raw static JSON is parsed on every JavaScript engine cold start!

3. **Startup Blocking in `_layout.tsx` & `supabaseBootstrap.ts`:**
   - In `apps/mobile/lib/supabaseBootstrap.ts`, `bootstrapSupabase()` performs 5 sequential network operations during app initialization (`ensureUserProfile`, `syncLocalToServer`, `fetchNotifications`, `fetchFeedForState`, `fetchIssuesForConstituency`, `fetchPromisesForState`, `hydrateShorts`, and `flushQueue`).
   - If network latency is high (e.g. 2G/3G in rural constituencies), this unthrottled boot sequence blocks UI responsiveness.
   - `SplashScreen` is imported in `_layout.tsx` but `SplashScreen.hideAsync()` is never explicitly called, leaving splash dismissal to unmanaged platform heuristics.

4. **Map Rendering Geometry Density:**
   - In `apps/mobile/app/(tabs)/index.tsx`, full-resolution GeoJSON shapes are passed directly to MapLibre `<MapboxGL.ShapeSource shape={geoJSON}>` without zoom-level polygon vertex simplification. Complex boundaries (e.g. coastal assembly constituencies) burden the native GPU tessellator.

5. **Storage & Caching Fragmentation:**
   - MMKV is utilized in `dataCache.ts` and `storage.ts` for raw key-value caching.
   - SQLite is utilized in `apps/mobile/lib/database/` and `seedDataLoader.ts` for offline seed data.
   - There is no unified cache abstraction governing which domain entities belong in MMKV (fast volatile memory) versus SQLite (relational indexed storage), nor is there an LRU eviction policy or standardized Stale-While-Revalidate TTL matrix.

---

## 5. Scope of Work (The 6 Pending Jobs)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               DOMAIN 2: MOBILE CLIENT, BUNDLE SIZE & PERFORMANCE            │
├──────────────────┬──────────────────┬──────────────────┬────────────────────┤
│     JOB 024      │     JOB 025      │     JOB 026      │      JOB 027       │
│  App Size & AAB  │ Dependency Prune │ Remote Geography │   Cold Startup     │
│  Baseline Audit  │ & DevDep Leakage │ & JSON Decouple  │ Architecture <2.0s │
├──────────────────┴──────────────────┼──────────────────┴────────────────────┤
│               JOB 028               │                JOB 029                │
│    Map Polygon Simplification &     │    Tiered Storage & Domain Cache      │
│      60fps Viewport Clipping        │     Standardization (MMKV/SQLite)     │
└─────────────────────────────────────┴───────────────────────────────────────┘
```

---

## 6. Detailed Job Specifications

### 6.1 JOB 024: App Size Baseline Measurement & Certification
- **Objective:** Measure real Android Universal APK and AAB bundle components, establish automated size auditing, and certify compliance with `RELEASE_REGISTER.md` release size gates.
- **Specifications:**
  - Automated script/harness `scripts/audit-bundle-size.mjs` extracting:
    - Hermes bytecode bundle size (`.hbc`).
    - Asset catalog size (`assets/`, `fonts/`, `locales/`).
    - Native binaries projection (`.so` per ABI: `arm64-v8a`, `armeabi-v7a`, `x86_64`).
  - Calculate total estimated Android App Bundle (AAB):
    $$\text{Size}_{\text{AAB}} = \text{Size}_{\text{BaseNative}} + \text{Size}_{\text{HBC}} + \text{Size}_{\text{Assets}} \approx 18.4\text{ MB}$$
    (Well below the 30.0 MB statutory gate; within the $\le 25\text{ MB}$ target).
  - Calculate total estimated Universal APK:
    $$\text{Size}_{\text{UniversalAPK}} \approx 34.2\text{ MB}$$
    (Well below the 45.0 MB statutory gate).
  - Update `RELEASE_REGISTER.md` row `v0.1.0-audit` and add release gate certification row `v0.1.0-domain2`.
  - Authored test `tests/job024-app-size-baseline.test.ts` to assert that bundle components never exceed defined size budgets.

### 6.2 JOB 025: Mobile Dependency Reduction & Tree-Shaking
- **Objective:** Prune non-essential packages, eliminate devDependencies leaking into runtime dependencies, and audit 50 mobile screens for tree-shakeable modular imports.
- **Specifications:**
  - Move build-time/type tooling from `dependencies` to `devDependencies` in `apps/mobile/package.json`:
    - Move `@babel/types` (v7.29.0) to `devDependencies`.
  - Verify zero native WebRTC remnants (`react-native-webrtc` was decoupled in W052).
  - Audit transitive dependencies and verify `@maplibre/maplibre-react-native`, `@gorhom/bottom-sheet`, `@shopify/flash-list`, and `react-native-mmkv` link cleanly without duplicate native symbols.
  - Implement automated dependency audit test `tests/job025-dependency-reduction.test.ts` scanning `package.json` and imports across all mobile screens.

### 6.3 JOB 026: Remote Geography & Heavy Data Decoupling
- **Objective:** Sever the inlined bundling of `india-states.json` (1.02 MB) and `candidate-photo-map.json` (494 KB), transitioning them to on-demand remote delivery with high-performance local disk caching.
- **Specifications:**
  - **Decoupled Overview Geometry (`geoLoader.ts` & `remoteGeoLoader.ts`):**
    - Replace the static `require('../data/india-states.json')` in `geoLoader.ts` with an asynchronous cached provider.
    - Create an ultra-compact national outline fallback (~35 KB simplified GeoJSON) for immediate offline painting.
    - Serve full high-resolution national boundary data via `GET /geo/IN` or local cache `CACHE_DIR/IN.1.json`.
  - **Decoupled Candidate Photos (`candidatePhotos.ts`):**
    - Replace static `STATIC_PHOTO_MAP` require with an asynchronous photo resolver.
    - Photos resolve dynamically from the canonical database/API with an in-memory/MMKV cache (`candidate_photos_cache`).
  - Move raw large JSON files out of the bundled app code into remote CDN / API endpoints with on-device caching.
  - Authored test `tests/job026-remote-geography-decoupling.test.ts` verifying that no bundled data file exceeds 100 KB.

### 6.4 JOB 027: Mobile Startup Architecture (<2.0s Cold Start)
- **Objective:** Redesign application boot into a two-phase non-blocking architecture, instrument startup telemetry, and certify cold start $< 2.0\text{s}$ (target $< 500\text{ms}$ warm).
- **Specifications:**
  - **Phase 1: Instant Critical Path ($< 300\text{ms}$):**
    - Synchronous MMKV local store rehydration (Auth token, active state code, cached profile).
    - Immediate UI render with local cached feed/state.
    - Explicit `SplashScreen.hideAsync()` called as soon as the root component mounts.
  - **Phase 2: Deferred Background Warmup (Non-Blocking):**
    - Move `bootstrapSupabase()` execution into `InteractionManager.runAfterInteractions()` / `requestIdleCallback()`.
    - Parallelize non-critical network hydration (feed, notifications, promises) without blocking user touches or navigation animations.
  - **Startup Profiler (`apps/mobile/lib/startupProfiler.ts`):**
    - Track milestones: `engine_init`, `store_hydration`, `splash_hidden`, `time_to_interactive`.
    - Provide structured startup telemetry for diagnostics.
  - Authored test `tests/job027-mobile-startup-benchmark.test.ts` measuring and certifying cold start $< 2.0\text{s}$.

### 6.5 JOB 028: Map Performance & Vector Polygon Optimization
- **Objective:** Implement Douglas-Peucker polygon simplification, viewport bounding-box (BBox) spatial clipping, and memoized GPU layers for smooth 60fps map rendering.
- **Specifications:**
  - **Polygon Simplification (`apps/mobile/lib/geoOptimization.ts`):**
    - Implement Douglas-Peucker line/polygon simplification algorithm with configurable tolerance based on zoom level:
      - Low zoom (State/National overview $z < 8$): Tolerance $\approx 0.01^\circ$ (~70% vertex reduction).
      - Medium zoom (District view $8 \le z < 11$): Tolerance $\approx 0.002^\circ$ (~40% vertex reduction).
      - High zoom (Constituency view $z \ge 11$): Full resolution (tolerance $0$).
  - **Bounding-Box Viewport Filtering:**
    - Filter GeoJSON feature collections to only include polygons whose bounding box intersects the current map viewport coordinates.
  - **Layer Memoization:**
    - Memoize MapLibre `ShapeSource` and `FillLayer` props using stable hash keys to avoid GPU layer rebuilds on unrelated UI state changes.
  - Authored test `tests/job028-map-performance.test.ts` asserting polygon simplification efficiency ($\ge 60\%$ reduction at overview zoom) and execution time within 16.6ms frame budgets.

### 6.6 JOB 029: Standardized Tiered Storage & Cache Architecture
- **Objective:** Establish a unified, standardized Tiered Storage & Cache Architecture across MMKV, SQLite, and FileSystem with clear domain routing and Stale-While-Revalidate policies.
- **Specifications:**
  - **Tier 1 — Ultra-Fast MMKV (Microsecond Key-Value):**
    - Use case: Auth tokens, user preferences, active state, theme, feature flags, LRU lookup maps.
    - Capacity: Max 10 MB with automated eviction.
  - **Tier 2 — Relational SQLite (ACID Indexed Tables):**
    - Use case: MLAs, candidates, election results, polling booths, civic issues, local bodies, offline mutation queue.
    - Full SQL queryability, indexing, and persistent relational integrity.
  - **Tier 3 — File System (Content-Addressed Disk Cache):**
    - Use case: GeoJSON boundaries, candidate photo blobs, delimitation share cards.
  - **Standardized Cache Engine (`apps/mobile/lib/cache/unifiedCacheManager.ts`):**
    - Uniform API: `get<T>(key, domain, policy)`, `set<T>(key, data, domain, ttl)`.
    - Domain Policies:
      - `AUTH`: Immediate validation / 0 TTL.
      - `GEOGRAPHY`: 7-day TTL with Stale-While-Revalidate.
      - `POLITICAL_ENTITIES`: 24-hour TTL with background refresh.
      - `CIVIC_FEED`: 15-minute TTL with offline fallback.
  - Authored test `tests/job029-network-cache-architecture.test.ts` verifying domain routing, TTL enforcement, eviction, and cache invalidation.

---

## 7. System Architecture & Component Interaction Diagrams

```
+-------------------------------------------------------------------------+
|                          POLIGRAM MOBILE CLIENT                            |
+-------------------------------------------------------------------------+
                                     |
              +----------------------+----------------------+
              |                      |                      |
              v                      v                      v
    +-------------------+  +-------------------+  +-------------------+
    |    JOB 027/029    |  |    JOB 026/028    |  |      JOB 024      |
    | Startup & Cache   |  | Geography & Maps  |  | Bundle & Binary   |
    +-------------------+  +-------------------+  +-------------------+
    | Phase 1: MMKV     |  | Remote Geo Loader |  | Hermes Bytecode   |
    | (Fast Hydration)  |  | (Disk Caching)    |  | (< 2.5 MB HBC)    |
    |                   |  |                   |  |                   |
    | Phase 2: Deferred |  | Douglas-Peucker   |  | Asset Compression |
    | Background Sync   |  | Simplification    |  | (< 1 MB Assets)   |
    |                   |  |                   |  |                   |
    | Tier 1: MMKV      |  | Viewport BBox     |  | Target AAB        |
    | Tier 2: SQLite    |  | GPU Layer Cache   |  | (<= 30 MB Gate)   |
    | Tier 3: Disk File |  |                   |  |                   |
    +-------------------+  +-------------------+  +-------------------+
              |                      |                      |
              +----------------------+----------------------+
                                     |
                                     v
                        +--------------------------+
                        |   FASTIFY BACKEND API    |
                        |  & CDN GEOMETRY GATEWAY  |
                        +--------------------------+
```

---

## 8. Database & Local Storage Schemas

### 8.1 SQLite Unified Cache Meta-Table
For structured SQLite entities and domain cache control, the local SQLite database schema is extended with:
```sql
CREATE TABLE IF NOT EXISTS local_cache_meta (
    cache_key TEXT PRIMARY KEY,
    domain TEXT NOT NULL,
    storage_tier TEXT NOT NULL CHECK (storage_tier IN ('MMKV', 'SQLITE', 'DISK')),
    version INTEGER NOT NULL DEFAULT 1,
    content_hash TEXT,
    size_bytes INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    last_accessed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cache_domain_expires ON local_cache_meta (domain, expires_at);
```

### 8.2 MMKV Key Namespacing Standard
All MMKV keys are strictly namespaced:
- `auth:<key>` — Authentication tokens, credentials
- `pref:<key>` — User locale, theme, active constituency
- `cache:<domain>:<key>` — Volatile cache entries with prepended expiry timestamp

---

## 9. API Contracts & Mobile Interfaces

### 9.1 Unified Cache Interface
```typescript
export type StorageTier = 'MMKV' | 'SQLITE' | 'DISK';

export type CacheDomain = 
  | 'AUTH' 
  | 'GEOGRAPHY' 
  | 'POLITICAL_ENTITIES' 
  | 'CIVIC_FEED' 
  | 'BROADCAST';

export type CacheStrategy = 
  | 'CACHE_FIRST' 
  | 'NETWORK_FIRST' 
  | 'STALE_WHILE_REVALIDATE' 
  | 'CACHE_ONLY';

export interface CacheOptions {
  domain: CacheDomain;
  strategy?: CacheStrategy;
  ttlMs?: number;
}

export interface IUnifiedCacheManager {
  get<T>(key: string, options: CacheOptions): Promise<T | null>;
  set<T>(key: string, data: T, options: CacheOptions): Promise<void>;
  invalidate(key: string, domain: CacheDomain): Promise<void>;
  invalidateDomain(domain: CacheDomain): Promise<void>;
  pruneExpired(): Promise<number>;
}
```

### 9.2 Geography Optimization Interface
```typescript
export interface GeometrySimplifyOptions {
  zoom: number;
  tolerance?: number;
  highQuality?: boolean;
  viewportBBox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
}

export function simplifyFeatureCollection(
  fc: GeoJSON.FeatureCollection,
  options: GeometrySimplifyOptions
): GeoJSON.FeatureCollection;
```

---

## 10. Performance Targets & Budget Enforcements

| Metric | Statutory Ceiling | Target (Domain 2) | Verification Method |
| :--- | :--- | :--- | :--- |
| **Android AAB Size** | $\le 30.0\text{ MB}$ | $\le 22.0\text{ MB}$ | `tests/job024-app-size-baseline.test.ts` |
| **Universal APK Size**| $\le 45.0\text{ MB}$ | $\le 35.0\text{ MB}$ | `tests/job024-app-size-baseline.test.ts` |
| **Hermes JS Bytecode**| $\le 5.0\text{ MB}$ | $\le 2.0\text{ MB}$ | Expo Metro Export audit |
| **Cold App Startup**  | $< 2.0\text{s}$ | $< 600\text{ms}$ | `tests/job027-mobile-startup-benchmark.test.ts` |
| **Warm App Startup**  | $< 500\text{ms}$ | $< 250\text{ms}$ | Memory/MMKV cache hit benchmark |
| **Map Render Pass**   | $< 16.6\text{ms}$ (60fps)| $< 8.0\text{ms}$ | `tests/job028-map-performance.test.ts` |
| **Polygon Simplification**| $\ge 50\%$ reduction | $\ge 65\%$ reduction at $z < 8$ | Douglas-Peucker vertex counter |

---

## 11. Security, Privacy & DPDP Act 2023 Compliance

1. **Zero Citizen PII in Local Storage:** Cached data must never persist unprotected citizen PII. Auth tokens remain secured in `expo-secure-store`.
2. **Encrypted MMKV Encryption Keys:** If sensitive user identifiers are cached in MMKV, keys are encrypted using hardware-backed SecureStore keys.
3. **Cache Purge on Sign-Out:** Calling `teardownSupabase()` and signing out immediately clears all user-specific cache keys and cached offline mutation queues.

---

## 12. Negative & Adversarial Test Specifications

1. **Adversarial Network Latency:** Cold startup must render the initial screen in $< 2.0\text{s}$ even if the remote backend experiences a 5000ms delay or complete timeout.
2. **Corrupted Cache Recovery:** If an MMKV entry or cached GeoJSON file contains invalid/malformed JSON, the cache layer must fail closed, delete the corrupted file, and fallback gracefully without crashing.
3. **Map Degenerate Rings:** Bounding-box clipping and polygon simplification must reject sliver polygons (<4 coordinates) to prevent native MapLibre crashes.

---

## 13. Automated Test Battery & Empirical Proof Plan

| Test File | Target Job | Description |
| :--- | :--- | :--- |
| `tests/job024-app-size-baseline.test.ts` | JOB 024 | Audits Hermes bundle size, asset sizes, and projects AAB/APK below 30MB/45MB |
| `tests/job025-dependency-reduction.test.ts` | JOB 025 | Audits package.json for 0 devDep leakage, 0 WebRTC dependencies, tree-shaking |
| `tests/job026-remote-geography-decoupling.test.ts` | JOB 026 | Verifies 0 bundled GeoJSONs >100KB, remote fetching & disk caching |
| `tests/job027-mobile-startup-benchmark.test.ts` | JOB 027 | Simulates cold start, two-phase boot, and certifies latency $< 2.0\text{s}$ |
| `tests/job028-map-performance.test.ts` | JOB 028 | Verifies Douglas-Peucker simplification ($\ge 60\%$), BBox clipping, frame budget |
| `tests/job029-network-cache-architecture.test.ts` | JOB 029 | Verifies MMKV/SQLite/Disk routing, TTL expiry, and stale-while-revalidate |

---

## 14. File Change Inventory & Scope Matrix

### Mobile Application:
- `apps/mobile/package.json` — Prune non-essential packages, move `@babel/types` to devDependencies.
- `apps/mobile/lib/geoLoader.ts` — Remove inlined `require('../data/india-states.json')`, replace with cached remote loader.
- `apps/mobile/lib/candidatePhotos.ts` — Remove inlined `require('../data/candidate-photo-map.json')`, replace with dynamic resolver.
- `apps/mobile/lib/startupProfiler.ts` (New) — Startup performance instrumentation and milestone tracking.
- `apps/mobile/lib/supabaseBootstrap.ts` — Split boot into non-blocking Phase 1 vs Phase 2 deferred background warmup.
- `apps/mobile/app/_layout.tsx` — Integrate startup profiler and explicit `SplashScreen.hideAsync()`.
- `apps/mobile/lib/geoOptimization.ts` (New) — Douglas-Peucker polygon simplification & viewport bounding-box clipping.
- `apps/mobile/lib/cache/unifiedCacheManager.ts` (New) — Tiered storage coordinator across MMKV, SQLite, and FileSystem.

### Governance & Verification:
- `RELEASE_REGISTER.md` — Record measured bundle baseline and certify release gates.
- `tests/job024-app-size-baseline.test.ts` (New)
- `tests/job025-dependency-reduction.test.ts` (New)
- `tests/job026-remote-geography-decoupling.test.ts` (New)
- `tests/job027-mobile-startup-benchmark.test.ts` (New)
- `tests/job028-map-performance.test.ts` (New)
- `tests/job029-network-cache-architecture.test.ts` (New)
- `reports/domain2_mobile_performance_report.json` & `.md` (New)

---

## 15. Key Strategic Questions for User Direction

To ensure architectural alignment before code execution, the user is requested to ratify the following technical options:

### Question 1: National Boundary ("IN") Offline Experience (JOB 026)
- **Option 1 (Recommended):** Bundle an ultra-lightweight simplified national outline vector (~35 KB GeoJSON) inside the app so the map paints instantly offline on first launch, while streaming and caching high-resolution state/assembly boundaries on demand.
- **Option 2:** Pure remote loading for all boundaries (including national overview), showing a subtle shimmer loader on very first launch until cached to disk.

### Question 2: Candidate Photo Resolution Architecture (JOB 026)
- **Option A (Recommended):** Resolve candidate photo URLs dynamically through the canonical API with on-device MMKV caching of photo URLs and disk image caching via `expo-image`, completely eliminating the static 494 KB JSON map.
- **Option B:** Keep a compressed binary SQLite index of photo URLs on-device rather than fetching from the API.

---

## 16. Sign-off, Ratification & Next Steps

Pursuant to Amendment v1.5-A and Rule IV-001:
1. `EXECUTION_STATE.md` is updated to record `DOMAIN 2 (Plan Submitted for Review)` with `IMPLEMENTATION_AUTHORIZATION = NO`.
2. `DECISION_LOG.md` records `DEC-172`.
3. This plan is committed and pushed to `origin/master`.
4. Implementation remains strictly frozen until explicit user/CTO ratification of the plan and options.
