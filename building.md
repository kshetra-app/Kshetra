# KSHETRA — Build Log

> Living document tracking every milestone, decision, and test result.

---

## Build Status

| Phase | Status | Started | Completed |
|---|---|---|---|
| Phase 1A: Project Scaffold | ✅ Complete | 2026-04-26 | 2026-04-26 |
| Phase 1B: Interactive Map | ✅ Complete | 2026-04-26 | 2026-04-26 |
| Phase 1C: Find My Constituency | ✅ Complete | 2026-04-26 | 2026-04-26 |
| Phase 1D: Real Data + Party Map + Bottom Sheet | ✅ Complete | 2026-04-26 | 2026-04-26 |
| Phase 2: Intelligence Layer | ⬜ Not Started | — | — |

---

## Milestone 1: Project Scaffold & Foundation

**Date**: 2026-04-26
**Goal**: Monorepo setup, shared types, testing infra, CI config

### Completed

- [x] Initialized Git repository
- [x] Created Turborepo monorepo structure (`apps/mobile`, `apps/api`, `packages/shared`)
- [x] Root `package.json` with workspaces
- [x] `turbo.json` pipeline configuration
- [x] `.gitignore` for all environments
- [x] `@kshetra/shared` package with:
  - Core types: `ConstituencyType`, `ConstituencyBrief`, `ConstituencyDetail`, `ElectionResult`, `StateInfo`
  - Party config: All major Indian parties with colors and metadata
  - State config: Telangana and AP with centroids and seat counts
- [x] `README.md` with project overview, structure, dev workflow
- [x] `building.md` (this file)

- [x] Expo mobile app scaffold with 4-tab navigation (Map, Explore, Intelligence, Profile)
- [x] Fastify backend API scaffold with health + constituency routes
- [x] Testing infrastructure (Jest configs for shared + API)
- [x] Prettier configuration
- [x] API route tests: health, constituencies list, constituency by ID, geolocation
- [x] Dependencies installed (Expo SDK 53, RN 0.79, Mapbox GL)
- [x] First git commit

### Tests — Milestone 1

| Test Suite | Status | Passed | Total | Notes |
|---|---|---|---|---|
| `@kshetra/shared` — parties | ✅ Pass | 6 | 6 | Party config, colors, names, hex validation |
| `@kshetra/shared` — states | ✅ Pass | 7 | 7 | State config, centroids, zoom levels, India center |
| `@kshetra/api` — health | ✅ Pass | 1 | 1 | GET /api/health returns ok |
| `@kshetra/api` — constituencies | ✅ Pass | 4 | 4 | List, detail 404, locate validation, locate with coords |
| **Total** | **✅ All Pass** | **18** | **18** | — |

### Decisions Made

| # | Decision | Rationale |
|---|---|---|
| ADR-001 | Mobile-first (React Native + Expo) | Founder vision; GPS, camera, offline needed; web comes as Phase 2 |
| ADR-002 | Mapbox GL for maps | Best vector tile performance; free tier sufficient; can migrate to MapLibre |
| ADR-003 | Offline-first with SQLite | <100ms constituency lookups; works in low-connectivity rural areas |
| ADR-004 | MMKV over AsyncStorage | 30x faster reads/writes for cached state |
| ADR-005 | Turborepo monorepo | Shared types between mobile/API/web; single repo, unified CI |
| ADR-006 | PostgreSQL + PostGIS + pgvector | One database for geo, relational, and vector (AI) data |
| ADR-007 | FlashList over FlatList | Recycler-view based; handles 1000+ constituency lists without jank |
| ADR-008 | GeoJSON from datta07/INDIAN-SHAPEFILES | MIT license, ready-made GeoJSON, 119 ACs verified, pre-delimitation data |

---

## Change Log

| Date | Commit | Description |
|---|---|---|
| 2026-04-26 | `chore: initial project scaffold` | Monorepo, shared types, API server, mobile app shell, tests (18/18 pass) |
| 2026-04-26 | `feat: interactive Telangana map + constituency data` | GeoJSON boundaries, seed data (119 ACs), Mapbox map screen, Explore list, detail screen, tests (28/28 pass) |
| 2026-04-26 | `feat: find my constituency — GPS + point-in-polygon` | Offline geolocation, ray-casting algorithm, expo-location, user marker, integration tests (56/56 pass) |
| 2026-04-26 | `feat: party-colored map + real API data + bottom sheet` | Party-colored polygons, API serves 119 ACs with election data, locate endpoint with PIP, @gorhom/bottom-sheet, AIMIM support, tests (59/59 pass) |

---

## Milestone 2: Interactive Telangana Map

**Date**: 2026-04-26
**Goal**: Render all 119 Telangana constituencies on an interactive map with tappable boundaries

### Completed

- [x] Downloaded Telangana assembly constituency GeoJSON from datta07/INDIAN-SHAPEFILES (MIT)
- [x] Downloaded Telangana district + state boundary GeoJSON
- [x] Created constituency seed data with all 119 AC records + 2023 election results
- [x] Built interactive Mapbox map screen with:
  - Dark theme map (mapbox://styles/mapbox/dark-v11)
  - Constituency polygon fill + border layers
  - Tap-to-select with zoom animation
  - Floating header overlay (KSHETRA branding)
  - Bottom card showing selected constituency info
  - Reset/locate button to return to full state view
- [x] Built Explore tab with FlashList-powered constituency search
  - Search by name, district, candidate, party, AC number
  - Party-colored badges, winner info, margin display
- [x] Built constituency detail screen (`/constituency/[id]`)
  - Hero with AC number, name, district, reservation type
  - 2023 election result card with votes, margin, margin %
  - Placeholder sections for demographics and historical trends
- [x] Created data attribution file (ATTRIBUTION.md)
- [x] Created ADR-008 for GeoJSON data source decision
- [x] Validation tests for seed data (10 tests)

### Tests — Milestone 2

| Test Suite | Status | Passed | Total | Notes |
|---|---|---|---|---|
| `@kshetra/shared` — parties | ✅ Pass | 6 | 6 | Unchanged |
| `@kshetra/shared` — states | ✅ Pass | 7 | 7 | Unchanged |
| `@kshetra/api` — health | ✅ Pass | 1 | 1 | Unchanged |
| `@kshetra/api` — constituencies | ✅ Pass | 4 | 4 | Unchanged |
| `data/seed` — telangana constituencies | ✅ Pass | 10 | 10 | 119 ACs, unique names/numbers, valid parties |
| **Total** | **✅ All Pass** | **28** | **28** | — |

---

## Milestone 3: Find My Constituency (GPS Geolocation)

**Date**: 2026-04-26
**Goal**: GPS-based offline constituency detection using point-in-polygon

### Completed

- [x] Ray-casting point-in-polygon algorithm in `@kshetra/shared/geo/`
  - `pointInRing()` — core ray-casting for a single ring
  - `pointInPolygon()` — handles exterior ring + holes
  - `pointInMultiPolygon()` — handles split constituencies (e.g. Bhadrachalam)
  - `findConstituencyAtPoint()` — scans FeatureCollection, returns matching feature
- [x] Unit tests: 18 tests covering squares, triangles, holes, multi-polygons, mock GeoJSON
- [x] Integration tests against real Telangana GeoJSON:
  - Goshamahal (near Charminar monument)
  - Charminar (at polygon centroid)
  - Secunderabad (railway station area)
  - Sircilla (KTR constituency)
  - Gajwel (KCR constituency)
  - Kodangal (Revanth Reddy constituency)
  - Karnataka + Maharashtra (outside Telangana → null)
  - Performance: <50ms per lookup
- [x] `useUserLocation` hook using `expo-location`
  - Permission request flow with settings redirect
  - High-accuracy GPS one-shot (no continuous tracking)
  - Loading/error states
- [x] Map screen GPS button (blue navigate icon)
  - Shows user location marker (blue pulsing dot)
  - Auto-selects constituency via point-in-polygon
  - Zooms to constituency with animation
  - Reset button clears marker + selection

### Tests — Milestone 3

| Test Suite | Status | Passed | Total | Notes |
|---|---|---|---|---|
| `@kshetra/shared` — parties | ✅ Pass | 6 | 6 | Unchanged |
| `@kshetra/shared` — states | ✅ Pass | 7 | 7 | Unchanged |
| `@kshetra/shared` — point-in-polygon | ✅ Pass | 18 | 18 | Ray-casting, holes, multi-polygon, mock GeoJSON |
| `@kshetra/shared` — geolocation integration | ✅ Pass | 10 | 10 | Real Telangana data, known constituencies, performance |
| `@kshetra/api` — health | ✅ Pass | 1 | 1 | Unchanged |
| `@kshetra/api` — constituencies | ✅ Pass | 4 | 4 | Unchanged |
| `data/seed` — telangana constituencies | ✅ Pass | 10 | 10 | Unchanged |
| **Total** | **✅ All Pass** | **56** | **56** | — |

---

## Milestone 4: Real Data + Party-Colored Map + Bottom Sheet

**Date**: 2026-04-26
**Goal**: Wire real data end-to-end, color-code map by party, and add bottom sheet constituency detail

### Completed

- [x] API wired to seed data — `GET /states/TS/constituencies` returns 119 ACs with full metadata
- [x] API detail endpoint — `GET /states/TS/constituencies/:id` returns constituency + election2023 results
- [x] API locate endpoint — `GET /constituencies/locate?lat=&lng=` uses point-in-polygon against real GeoJSON
- [x] Unsupported states gracefully return empty with informative message
- [x] Updated `ConstituencyBrief` type to match Phase 1 reality (acNo, district, reservationStatus, currentMLA)
- [x] Added AIMIM to PartyCode and PARTY_CONFIG (Hyderabad Old City constituencies)
- [x] Party-colored map polygons — Mapbox `match` expression colors by WINNER_PARTY (INC blue, BRS pink, BJP orange, AIMIM green, TDP yellow)
- [x] GeoJSON enrichment module — merges seed election data into GeoJSON properties at import time
- [x] Replaced floating card with `@gorhom/bottom-sheet` — 2-snap-point sheet with:
  - Party badge, constituency name, AC#, district, type
  - Winner name, votes, margin, runner-up
  - "View Full Profile" button navigating to detail screen
- [x] Added `GestureHandlerRootView` wrapper in root layout
- [x] Selected constituency highlights in gold (#FFD700) with 0.8 opacity

### Tests — Milestone 4

| Test Suite | Status | Passed | Total | Notes |
|---|---|---|---|---|
| `@kshetra/shared` — parties | ✅ Pass | 7 | 7 | +1: AIMIM added |
| `@kshetra/shared` — states | ✅ Pass | 7 | 7 | Unchanged |
| `@kshetra/shared` — point-in-polygon | ✅ Pass | 18 | 18 | Unchanged |
| `@kshetra/shared` — geolocation integration | ✅ Pass | 10 | 10 | Unchanged |
| `@kshetra/api` — health | ✅ Pass | 1 | 1 | Unchanged |
| `@kshetra/api` — constituencies | ✅ Pass | 7 | 7 | +3: 119 ACs list, detail with election data, locate with PIP |
| `data/seed` — telangana constituencies | ✅ Pass | 10 | 10 | Unchanged |
| **Total** | **✅ All Pass** | **59** | **59** | — |
