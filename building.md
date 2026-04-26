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
| Phase 1E: Intelligence Dashboard + Profile | ✅ Complete | 2026-04-26 | 2026-04-26 |
| Phase 2A: API Endpoints + Navigation + District Analytics | ✅ Complete | 2026-04-26 | 2026-04-26 |
| Phase 2B: Shared Analytics + ADR + DRY Refactor | ✅ Complete | 2026-04-26 | 2026-04-26 |
| Phase 3A: Offline Persistence (MMKV + Zustand) | ✅ Complete | 2026-04-26 | 2026-04-26 |
| Phase 3B: Historical Election Data (2014–2023) | ✅ Complete | 2026-04-26 | 2026-04-26 |
| Phase 3C: Supabase + Auth | ✅ Complete | 2026-04-27 | 2026-04-27 |
| Phase 3D: EAS Build + CI/CD | ✅ Complete | 2026-04-27 | 2026-04-27 |
| Phase 4A: Multi-State Architecture | ✅ Complete | 2026-04-27 | 2026-04-27 |

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
| 2026-04-26 | `feat: intelligence dashboard + profile screen` | Party seat distribution bars, reservation breakdown, key insights (biggest/closest victory), profile screen with settings, fixed import paths (59/59 pass) |
| 2026-04-26 | `feat: search + analytics API, navigation, district breakdown` | Search endpoint (q/party/district/type), analytics endpoint, Explore→Detail navigation, district breakdown in Intelligence, tests (65/65 pass) |
| 2026-04-26 | `refactor: shared analytics + ADR-009 + DRY` | Extracted computeElectionAnalytics to @kshetra/shared, API uses shared util, 13 new analytics tests, name-based lookup test, ADR-009, tests (79/79 pass) |
| 2026-04-26 | `feat: offline persistence — MMKV + Zustand stores` | Preferences (theme/notifications/haptics/language), favorites with heart toggle, recently viewed (last 20), Explore favorites filter, Profile activity section, tests (79/79 pass) |
| 2026-04-26 | `feat: historical election data 2014–2023` | State-level aggregate results (2014/2018/2023), election history API, history UI on detail + Intelligence, 12 new tests (91/91 pass) |
| 2026-04-27 | `feat: Supabase + Auth integration` | Supabase client, SecureStore adapter, auth Zustand store, sign-in/sign-up screen, Profile auth UI, DB schema + migrations, RLS policies, ADR-010, build fix (91/91 pass) |
| 2026-04-27 | `feat: EAS Build + CI/CD pipeline` | eas.json (dev/preview/prod profiles), GitHub Actions (ci.yml, eas-build.yml, eas-update.yml), OTA updates, ADR-011 |
| 2026-04-27 | `feat: multi-state architecture` | State registry, active state store, StateSwitcher UI (Map/Explore/Intelligence), KA+MH state configs, SUPPORTED_STATES, 5 new tests (96/96 pass) |

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

---

## Milestone 5: Intelligence Dashboard + Profile Screen

**Date**: 2026-04-26
**Goal**: Replace placeholder tabs with real content — analytics dashboard and user profile

### Completed

- [x] Intelligence tab: party-wise seat distribution with animated bars
  - INC, BRS, BJP, AIMIM, TDP breakdown with percentage bars
  - 3 summary cards: 119 constituencies, district count, parties won
  - Reservation breakdown: GEN/SC/ST counts with colored cards
  - Key insights: biggest victory, closest contest, majority party
  - All data computed from seed in `useMemo` (offline, zero API calls)
- [x] Profile tab: guest user UI with sign-in button
  - App info section: version, state, constituency count, data source
  - Preferences: notifications (coming soon), theme (dark), language (English)
  - About: privacy policy, terms, source code links
  - KSHETRA branded footer
- [x] Fixed import paths in `(tabs)/` files (4 levels up to root, not 3)

### Tests — Milestone 5

| Test Suite | Status | Passed | Total | Notes |
|---|---|---|---|---|
| `@kshetra/shared` — parties | ✅ Pass | 7 | 7 | Unchanged |
| `@kshetra/shared` — states | ✅ Pass | 7 | 7 | Unchanged |
| `@kshetra/shared` — point-in-polygon | ✅ Pass | 18 | 18 | Unchanged |
| `@kshetra/shared` — geolocation integration | ✅ Pass | 10 | 10 | Unchanged |
| `@kshetra/api` — health | ✅ Pass | 1 | 1 | Unchanged |
| `@kshetra/api` — constituencies | ✅ Pass | 7 | 7 | Unchanged |
| `data/seed` — telangana constituencies | ✅ Pass | 10 | 10 | Unchanged |
| **Total** | **✅ All Pass** | **59** | **59** | No regressions |

---

## Milestone 6: Search + Analytics API, Navigation, District Breakdown

**Date**: 2026-04-26
**Goal**: Full search/filter API, analytics endpoint, complete navigation, district-level intelligence

### Completed

- [x] API: `GET /states/TS/constituencies/search` — multi-filter search
  - `?q=` — text search across name, district, candidate, AC number
  - `?party=` — filter by winning party (e.g. AIMIM → 7 results)
  - `?district=` — filter by district (e.g. Hyderabad → 15 results)
  - `?type=` — filter by reservation status (GEN, SC, ST)
  - All filters composable
- [x] API: `GET /states/TS/analytics` — full analytics endpoint
  - Party summary (seats, percentage per party)
  - District breakdown (seats per district, dominant party, party split)
  - Margin extremes (closest/biggest victory)
- [x] Explore tab: card tap now navigates to `/constituency/[acNo]`
- [x] Intelligence tab: district breakdown section (top 10 districts)
  - Each district shows total seats + party chip breakdown
  - Sorted by seat count, party chips color-coded
- [x] 6 new API tests for search filters and analytics

### Tests — Milestone 6

| Test Suite | Status | Passed | Total | Notes |
|---|---|---|---|---|
| `@kshetra/shared` — parties | ✅ Pass | 7 | 7 | Unchanged |
| `@kshetra/shared` — states | ✅ Pass | 7 | 7 | Unchanged |
| `@kshetra/shared` — point-in-polygon | ✅ Pass | 18 | 18 | Unchanged |
| `@kshetra/shared` — geolocation integration | ✅ Pass | 10 | 10 | Unchanged |
| `@kshetra/api` — health | ✅ Pass | 1 | 1 | Unchanged |
| `@kshetra/api` — constituencies | ✅ Pass | 13 | 13 | +6: search (q, party, district, type), analytics, analytics 404 |
| `data/seed` — telangana constituencies | ✅ Pass | 10 | 10 | Unchanged |
| **Total** | **✅ All Pass** | **65** | **65** | — |

---

## Milestone 7: Shared Analytics + DRY Refactor

**Date**: 2026-04-26
**Goal**: Deduplicate analytics logic, improve test coverage, document API design

### Completed

- [x] Created `@kshetra/shared` analytics module: `computeElectionAnalytics()`
  - Pure function: party summary, district breakdown, reservation counts, margin extremes
  - Generic `ConstituencyRecord` interface decoupled from seed format
  - Handles empty input gracefully
- [x] API analytics endpoint now delegates to `computeElectionAnalytics()` (60 lines → 4)
- [x] 13 new tests for `computeElectionAnalytics`:
  - 119 constituencies, INC >50 seats, AIMIM exactly 7, sorted descending
  - Reservation counts sum to 119, all positive
  - Margins valid, districts sorted, percentages sum to ~100
  - Empty input edge case
- [x] New API test: constituency detail by name (`/constituencies/charminar`)
- [x] ADR-009: API design — RESTful, seed-backed, versioned, offline-first

### Tests — Milestone 7

| Test Suite | Status | Passed | Total | Notes |
|---|---|---|---|---|
| `@kshetra/shared` — parties | ✅ Pass | 7 | 7 | Unchanged |
| `@kshetra/shared` — states | ✅ Pass | 7 | 7 | Unchanged |
| `@kshetra/shared` — point-in-polygon | ✅ Pass | 18 | 18 | Unchanged |
| `@kshetra/shared` — geolocation integration | ✅ Pass | 10 | 10 | Unchanged |
| `@kshetra/shared` — election analytics | ✅ Pass | 13 | 13 | **NEW**: full coverage of shared analytics |
| `@kshetra/api` — health | ✅ Pass | 1 | 1 | Unchanged |
| `@kshetra/api` — constituencies | ✅ Pass | 14 | 14 | +1: detail by name |
| `data/seed` — telangana constituencies | ✅ Pass | 10 | 10 | Unchanged |
| **Total** | **✅ All Pass** | **79** | **79** | +14 from previous |

---

## Milestone 8: Offline Persistence — MMKV + Zustand

**Date**: 2026-04-26
**Goal**: Local persistence layer for user preferences, favourites, and recently viewed constituencies

### Completed

- [x] `lib/storage.ts` — MMKV instance + Zustand-compatible StateStorage adapter
- [x] `stores/preferences.ts` — Zustand store (theme, language, notifications, haptic feedback)
  - Persisted to disk via MMKV, survives app restart
  - Type-safe: `ThemeMode`, `AppLanguage` enums
- [x] `stores/favorites.ts` — Zustand store (favorite constituency AC numbers)
  - `isFavorite()`, `toggleFavorite()`, `clearFavorites()`
  - Persisted to MMKV
- [x] `stores/recents.ts` — Zustand store (last 20 viewed constituencies)
  - Deduplicates, prepends most recent, caps at 20
  - Each entry: acNo, name, district, party, viewedAt timestamp
- [x] Constituency detail: heart toggle button in hero + auto-track recently viewed on mount
- [x] Explore tab: heart filter button (toggle favourites-only view) + heart icons on cards
- [x] Profile tab:
  - Activity section (favourites count, recently viewed count)
  - Recently Viewed list (top 5, tappable, with Clear button)
  - Live Switch toggles for Notifications and Haptic Feedback
  - Theme and Language display from preferences store

### Tests — Milestone 8

| Test Suite | Status | Passed | Total | Notes |
|---|---|---|---|---|
| `@kshetra/shared` — all | ✅ Pass | 54 | 54 | Unchanged |
| `@kshetra/api` — all | ✅ Pass | 15 | 15 | Unchanged |
| `data/seed` — telangana | ✅ Pass | 10 | 10 | Unchanged |
| **Total** | **✅ All Pass** | **79** | **79** | No regressions (stores are runtime-only, tested via app) |

---

## Milestone 9: Historical Election Data (2014–2023)

**Date**: 2026-04-26
**Goal**: State-level election history with aggregate results, API, and UI

### Completed

- [x] `data/seed/telangana-election-history.ts` — verified state-level aggregate data
  - 2023: INC 64, BRS 39, BJP 8, AIMIM 7 (64.23% turnout)
  - 2018: BRS 88, INC 19, AIMIM 7, TDP 2, BJP 1 (73.20% turnout)
  - 2014: BRS 63, INC 21, TDP 15, AIMIM 7, BJP 5 (69.16% turnout)
  - Includes vote share, seats contested, turnout, contextual notes
- [x] API: `GET /states/TS/elections` — returns all 3 election histories
- [x] Constituency detail: historical trends section with bar charts per election year
- [x] Intelligence tab: election timeline showing top 3 parties per year + turnout
- [x] 10 new seed tests + 2 new API tests

### Honesty Note

Only **state-level aggregate** results are included. Per-constituency historical results (who won which AC in 2014/2018) are NOT fabricated — they require verified ECI data and will be added when sourced.

### Tests — Milestone 9

| Test Suite | Status | Passed | Total | Notes |
|---|---|---|---|---|
| `@kshetra/shared` — all | ✅ Pass | 54 | 54 | Unchanged |
| `@kshetra/api` — all | ✅ Pass | 17 | 17 | +2: elections endpoint |
| `data/seed` — constituencies | ✅ Pass | 10 | 10 | Unchanged |
| `data/seed` — election history | ✅ Pass | 10 | 10 | **NEW** |
| **Total** | **✅ All Pass** | **91** | **91** | +12 from previous |

---

## Milestone 10: Supabase + Auth

**Date**: 2026-04-27
**Goal**: Database schema, authentication, and cloud-ready infrastructure

### Completed

- [x] `apps/mobile/lib/supabase.ts` — Supabase client with SecureStore adapter
  - Platform-aware: expo-secure-store on native, localStorage on web
  - Auto-refresh tokens, persistent sessions
- [x] `apps/mobile/stores/auth.ts` — Zustand store for auth state
  - `initialize()`, `signInWithEmail()`, `signUpWithEmail()`, `signOut()`
  - Session listener for auth state changes
- [x] `apps/mobile/app/auth/sign-in.tsx` — Sign In / Sign Up modal
  - Email + password form, toggle between sign in/up
  - Loading states, error alerts, keyboard avoiding
- [x] Profile tab: auth-aware header (guest vs signed-in), sign out button
- [x] Root layout: auth initialization on app start, auth route registered
- [x] `supabase/migrations/001_initial_schema.sql` — full DB schema
  - states, constituencies (PostGIS), elections, election_results, user_favourites
  - RLS policies: public read for data, user-scoped for favourites
  - Indexes on state, district, party, spatial (GIST)
- [x] `supabase/migrations/002_seed_telangana.sql` — state + elections seed
- [x] `docs/architecture/ADR-010-supabase-auth.md` — architecture decision record
- [x] `.env.example` for Supabase credentials
- [x] Fixed `@kshetra/shared` build: inlined test fixtures to avoid rootDir violation
- [x] Updated `.gitignore` for tsc build artifacts

### Activation

The app works fully offline without Supabase credentials. To activate:
1. Create a Supabase project at https://supabase.com
2. Copy URL + anon key to `apps/mobile/.env`
3. Run migrations against your Supabase DB
4. Auth features become live

### Tests — Milestone 10

| Test Suite | Status | Passed | Total | Notes |
|---|---|---|---|---|
| `@kshetra/shared` — all | ✅ Pass | 54 | 54 | Build fixed (inlined test fixtures) |
| `@kshetra/api` — all | ✅ Pass | 17 | 17 | Unchanged |
| `data/seed` — all | ✅ Pass | 20 | 20 | Unchanged |
| **Total** | **✅ All Pass** | **91** | **91** | No regressions |

---

## Milestone 11: EAS Build + CI/CD

**Date**: 2026-04-27
**Goal**: Automated build, test, and deployment pipeline

### Completed

- [x] `apps/mobile/eas.json` — three build profiles
  - `development`: dev client, internal distribution
  - `preview`: internal testing (TestFlight / Internal Track)
  - `production`: store-ready, auto-increment version
- [x] `app.json` — EAS project ID placeholder, OTA updates URL, runtime version policy
- [x] `.github/workflows/ci.yml` — CI on PR/push
  - Node 20, npm ci, build shared, test shared + API + seed, typecheck
  - Concurrency group prevents duplicate runs
- [x] `.github/workflows/eas-build.yml` — native builds
  - Auto on push to main (mobile/shared/seed changes)
  - Manual dispatch with platform + profile selection
  - Tests run before build
- [x] `.github/workflows/eas-update.yml` — OTA updates
  - JS-only changes publish instantly, no store review
  - Targets production branch
- [x] `docs/architecture/ADR-011-eas-build-cicd.md`

### Activation

1. Run `npx eas init` in `apps/mobile/` to get a project ID
2. Replace `EAS_PROJECT_ID_PLACEHOLDER` in `app.json`
3. Add `EXPO_TOKEN` secret to GitHub repo settings
4. Push to main — CI + builds trigger automatically

---

## Milestone 12: Multi-State Architecture

**Date**: 2026-04-27
**Goal**: State-switching infrastructure for expanding beyond Telangana

### Completed

- [x] `packages/shared/src/constants/states.ts` — added KA (224 seats), MH (288 seats)
  - `SUPPORTED_STATES` array tracks which states have data
- [x] `apps/mobile/stores/activeState.ts` — Zustand store for selected state (persisted)
- [x] `apps/mobile/lib/stateRegistry.ts` — central registry mapping state codes to data
  - `getStateData()`, `getSupportedStateCodes()`, `isStateSupported()`
- [x] `apps/mobile/components/StateSwitcher.tsx` — modal state picker
  - Shows all states, marks supported vs "Coming Soon"
  - Active state highlighted with checkmark
- [x] Wired StateSwitcher into Map header, Explore header, Intelligence header
- [x] Explore tab uses state registry for dynamic constituency list
- [x] 5 new tests: KA, MH, state count, SUPPORTED_STATES validation

### Adding a New State

1. Add state config to `STATES` in `packages/shared/src/constants/states.ts`
2. Create seed data file `data/seed/{state}-constituencies.ts`
3. Add GeoJSON boundaries to `apps/mobile/data/`
4. Register in `apps/mobile/lib/stateRegistry.ts`
5. Add state code to `SUPPORTED_STATES`

### Tests — Milestone 12

| Test Suite | Status | Passed | Total | Notes |
|---|---|---|---|---|
| `@kshetra/shared` — all | ✅ Pass | 59 | 59 | +5: KA, MH, state count, SUPPORTED_STATES |
| `@kshetra/api` — all | ✅ Pass | 17 | 17 | Unchanged |
| `data/seed` — all | ✅ Pass | 20 | 20 | Unchanged |
| **Total** | **✅ All Pass** | **96** | **96** | +5 from previous |
