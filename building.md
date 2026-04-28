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
| Phase 4B: AI/LLM Integration | ✅ Complete | 2026-04-27 | 2026-04-27 |
| Phase 4C: Search + Filters Enhancement | ✅ Complete | 2026-04-27 | 2026-04-27 |
| Phase 4D: Candidate Profiles + MLA Cards | ✅ Complete | 2026-04-27 | 2026-04-27 |
| Phase 4E: Map Enhancements | ✅ Complete | 2026-04-27 | 2026-04-27 |
| Phase 4F: Performance + Polish | ✅ Complete | 2026-04-27 | 2026-04-27 |
| Phase 4G: Push Notifications + Alerts | ✅ Complete | 2026-04-27 | 2026-04-27 |
| Phase 4H: Dark/Light Theme System | ✅ Complete | 2026-04-27 | 2026-04-27 |
| Phase 5A: Political Ledger + Trivia Engine | ✅ Complete | 2026-04-28 | 2026-04-28 |
| Phase 5B: Historical Data + MLA Profiles (119) | ✅ Complete | 2026-04-28 | 2026-04-28 |
| Phase 5C: Map Modes + Per-Constituency History | ✅ Complete | 2026-04-28 | 2026-04-28 |

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
| 2026-04-27 | `feat: AI/LLM integration` | OpenAI service, chat/analyze API endpoints, AI chat screen, context-injected prompts, honesty guardrails, 6 new tests (102/102 pass) |
| 2026-04-27 | `feat: search + filters enhancement` | Multi-filter chips (party/district/type), sort (AC#/A-Z/margin), margin range API filter, filter toggle with badge count, 4 new API tests (106/106 pass) |
| 2026-04-27 | `feat: candidate profiles + MLA cards` | MLA profile seed data (20 key MLAs), MLACard component, detail screen integration, MLA API endpoints, 4 new tests (110/110 pass) |
| 2026-04-27 | `feat: map enhancements` | MapLegend overlay, favourites border layer (red highlight), share button on detail screen (110/110 pass) |
| 2026-04-27 | `feat: performance + polish` | React.memo ConstituencyCard, ErrorBoundary, SkeletonLoader, empty state, API cache headers (110/110 pass) |
| 2026-04-27 | `feat: push notifications + alerts` | expo-notifications service, notification store (persist), notification center screen, bell icon w/ badge on Profile, alert categories (110/110 pass) |
| 2026-04-27 | `feat: dark/light theme system` | Theme tokens (dark+light), useTheme hook, theme picker in Profile, dynamic StatusBar, system preference support (110/110 pass) |

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

---

## Milestone 13: AI/LLM Integration

**Date**: 2026-04-27
**Goal**: AI-powered political analysis and conversational Q&A

### Completed

- [x] `apps/api/src/services/ai.ts` — AI service layer
  - OpenAI client with gpt-4o-mini
  - Context injection: seed data + election history in system prompt
  - Honesty guardrails: AI instructed to not fabricate data
  - Graceful fallback when no API key
- [x] `apps/api/src/routes/ai.ts` — 4 API endpoints
  - `POST /ai/chat` — conversational chat
  - `GET /ai/analyze/constituency/:acNo` — constituency analysis
  - `GET /ai/analyze/trends` — election trends summary
  - `GET /ai/status` — configuration check
- [x] `apps/mobile/app/ai-chat.tsx` — full chat UI
  - Suggested questions, typing indicator, message bubbles
  - Session-based conversation history
- [x] Intelligence tab: AI button in header
- [x] Root layout: AI chat route registered as modal
- [x] ADR-012: AI Integration Architecture
- [x] `.env.example` files for both API and mobile

### Activation

1. Set `OPENAI_API_KEY` in `apps/api/.env`
2. Start the API server
3. Tap the ✨ AI button on Intelligence tab

### Tests — Milestone 13

| Test Suite | Status | Passed | Total | Notes |
|---|---|---|---|---|
| `@kshetra/shared` — all | ✅ Pass | 59 | 59 | Unchanged |
| `@kshetra/api` — all | ✅ Pass | 23 | 23 | +6: AI status, chat validation, graceful fallback, AC validation |
| `data/seed` — all | ✅ Pass | 20 | 20 | Unchanged |
| **Total** | **✅ All Pass** | **102** | **102** | +6 from previous |

---

## Milestone 14: Search + Filters Enhancement

**Date**: 2026-04-27
**Goal**: Multi-filter, sort, and margin range for Explore tab + API

### Completed

- [x] Explore tab: filter toggle button with active badge count
- [x] Filter panel with 4 sections:
  - **Sort**: AC #, A–Z, Closest margin, Biggest margin
  - **Party**: dynamic chips from data with party-color dots
  - **District**: dynamic chips from data
  - **Type**: GEN / SC / ST
- [x] "Clear all filters" button when filters active
- [x] API: `minMargin` / `maxMargin` query params on search endpoint
- [x] API: `sort` query param (name, margin_asc, margin_desc)
- [x] 4 new API tests: margin range (close/landslide), sort by name, sort by margin

### Tests — Milestone 14

| Test Suite | Status | Passed | Total | Notes |
|---|---|---|---|---|
| `@kshetra/shared` — all | ✅ Pass | 59 | 59 | Unchanged |
| `@kshetra/api` — all | ✅ Pass | 27 | 27 | +4: margin range, sort |
| `data/seed` — all | ✅ Pass | 20 | 20 | Unchanged |
| **Total** | **✅ All Pass** | **106** | **106** | +4 from previous |

---

## Milestone 15: Candidate Profiles + MLA Cards

**Date**: 2026-04-27
**Goal**: Rich MLA profile data with reusable card component

### Completed

- [x] `data/seed/telangana-mla-profiles.ts` — 20 key MLA profiles
  - Fields: age, gender, education, profession, terms, criminal cases, total assets
  - `getMLAProfile(acNo)` lookup function
- [x] `apps/mobile/components/MLACard.tsx` — rich MLA card UI
  - Avatar placeholder, party badge, age/gender
  - Stats grid: terms, education, assets (INR formatted), criminal cases
  - Profession row with briefcase icon
  - Red warning for criminal cases > 0, green checkmark for clean
- [x] Constituency detail screen: MLA card shown below election result
- [x] API endpoints:
  - `GET /states/TS/mla` — list all 20 profiles
  - `GET /states/TS/mla/:acNo` — individual profile
- [x] 4 new API tests: list, specific profile, missing, invalid

### Tests — Milestone 15

| Test Suite | Status | Passed | Total | Notes |
|---|---|---|---|---|
| `@kshetra/shared` — all | ✅ Pass | 59 | 59 | Unchanged |
| `@kshetra/api` — all | ✅ Pass | 31 | 31 | +4: MLA list, profile lookup, 404, 400 |
| `data/seed` — all | ✅ Pass | 20 | 20 | Unchanged |
| **Total** | **✅ All Pass** | **110** | **110** | +4 from previous |

---

## Milestone 16: Map Enhancements

**Date**: 2026-04-27
**Goal**: Map legend, favourites layer, share functionality

### Completed

- [x] `components/MapLegend.tsx` — collapsible party color legend
  - Shows all 6 major parties + selected/favourite indicators
  - Toggle expand/collapse with smooth UI
- [x] Favourites highlight layer on map
  - Red border around favourite constituencies via Mapbox LineLayer
  - Reactive: updates when favourites change
- [x] Share button on constituency detail screen
  - Uses React Native `Share` API
  - Shares name, AC #, district, winner, margin
  - Positioned next to favourite button in hero

### Tests — Milestone 16

| Test Suite | Status | Passed | Total | Notes |
|---|---|---|---|---|
| `@kshetra/shared` — all | ✅ Pass | 59 | 59 | Unchanged |
| `@kshetra/api` — all | ✅ Pass | 31 | 31 | Unchanged |
| `data/seed` — all | ✅ Pass | 20 | 20 | Unchanged |
| **Total** | **✅ All Pass** | **110** | **110** | UI-only phase, no new unit tests |

---

## Milestone 17: Performance + Polish

**Date**: 2026-04-27
**Goal**: Optimize rendering, error handling, loading states, API caching

### Completed

- [x] `components/ErrorBoundary.tsx` — class-based error boundary
  - Catches rendering crashes with retry button
  - Wraps entire app in root layout
- [x] `components/SkeletonLoader.tsx` — shimmer loading skeletons
  - `SkeletonItem` — animated opacity pulse
  - `ConstituencyCardSkeleton` / `ConstituencyListSkeleton`
  - `StatCardSkeleton` for dashboard loading
- [x] Explore tab optimizations:
  - `ConstituencyCard` extracted as `React.memo` component
  - `renderItem` wrapped in `useCallback`
  - Empty state UI when no results match
- [x] API: Cache-Control headers on static seed-data responses (5 min TTL)
  - Applied to all GET `/api/v1/states/*` routes (excluding AI)

### Tests — Milestone 17

| Test Suite | Status | Passed | Total | Notes |
|---|---|---|---|---|
| `@kshetra/shared` — all | ✅ Pass | 59 | 59 | Unchanged |
| `@kshetra/api` — all | ✅ Pass | 31 | 31 | Unchanged |
| `data/seed` — all | ✅ Pass | 20 | 20 | Unchanged |
| **Total** | **✅ All Pass** | **110** | **110** | Performance phase, no new unit tests |

---

## Milestone 18: Push Notifications + Alerts

**Date**: 2026-04-27
**Goal**: Notification infrastructure, in-app notification center, alert preferences

### Completed

- [x] `lib/notifications.ts` — expo-notifications service
  - Foreground handler, permission request, push token
  - Local notification scheduling + cancel
  - Alert categories: election_results, constituency_updates, new_state_added, app_updates
- [x] `stores/notifications.ts` — persisted Zustand store
  - In-app notification inbox (max 50 items)
  - Per-category toggles, global enable/disable
  - Unread count, mark read/all, clear all
- [x] `app/notifications.tsx` — notification center screen
  - Category icons, time-ago formatting
  - Unread indicator (blue left border + dot)
  - Mark all read / Clear all actions
  - Empty state
- [x] Profile tab integration:
  - Bell icon with unread badge count
  - Notification toggle switch
  - Notification Center link with unread count
- [x] Root layout: notifications route registered

### Tests — Milestone 18

| Test Suite | Status | Passed | Total | Notes |
|---|---|---|---|---|
| `@kshetra/shared` — all | ✅ Pass | 59 | 59 | Unchanged |
| `@kshetra/api` — all | ✅ Pass | 31 | 31 | Unchanged |
| `data/seed` — all | ✅ Pass | 20 | 20 | Unchanged |
| **Total** | **✅ All Pass** | **110** | **110** | UI + service phase |

---

## Milestone 19: Dark/Light Theme System

**Date**: 2026-04-27
**Goal**: Centralized theme system with dark, light, and system modes

### Completed

- [x] `lib/theme.ts` — theme color tokens
  - `DARK_THEME` and `LIGHT_THEME` palettes
  - ThemeColors interface: background, surface, text, primary, danger, etc.
  - Includes map style URLs per theme
- [x] `lib/useTheme.ts` — theme hook
  - Reads from preferences store (`dark`/`light`/`system`)
  - Falls back to `useColorScheme()` for system mode
  - Returns `{ colors, mode, isDark }`
- [x] Profile: interactive theme picker (moon/sun/phone icons)
  - 3 pressable options with active highlight
  - Persists preference via existing store
- [x] Root layout: dynamic `StatusBar` style from theme

### Tests — Milestone 19

| Test Suite | Status | Passed | Total | Notes |
|---|---|---|---|---|
| `@kshetra/shared` — all | ✅ Pass | 59 | 59 | Unchanged |
| `@kshetra/api` — all | ✅ Pass | 31 | 31 | Unchanged |
| `data/seed` — all | ✅ Pass | 20 | 20 | Unchanged |
| **Total** | **✅ All Pass** | **110** | **110** | Theme system — UI only |

---

## Milestone 20: Political Ledger + Trivia Engine

**Date**: 2026-04-28
**Goal**: Double-entry political ledger system and context-aware trivia engine

### Completed

- [x] `data/seed/telangana-political-timeline.ts` — double-entry bookkeeping ledger
  - Every defection, by-election, death, merger is a debit/credit transaction
  - Total ALWAYS = 119 seats (invariant enforced by audit)
  - 3 assemblies covered: 2014–2018, 2018–2023, 2023–present
  - Events: general elections, TDP→TRS merger (12 MLAs), INC→TRS merger (12 MLAs), Etela→BJP, TRS→BRS rename, 10 BRS→INC defections (2024)
  - Utility functions: `computePartyStrength`, `auditLedger`, `generateTimeline`, `getDefectionSummary`, `getConstituencyTimeline`, `getMLAPartyTrail`
- [x] `data/seed/telangana-trivia.ts` — 18 curated + 4 derived trivia items
  - Categories: DEFECTION, RECORD, COINCIDENCE, HISTORICAL, DYNASTY, GEOGRAPHY, LEGAL, ELECTION
  - Context-aware queries: by constituency, party, MLA, election year
  - Derived trivia auto-computed from political ledger at runtime
- [x] `apps/mobile/components/TriviaCard.tsx` — full + compact modes, auto-rotate, shuffle
- [x] `apps/mobile/components/DefectionBadge.tsx` — full (elected→current) + compact (inline)
- [x] Integrated trivia on map idle state, bottom sheet, and constituency detail page
- [x] `apps/mobile/lib/data.ts` — centralized re-exports for trivia + ledger utilities
- [x] 21 ledger tests + 18 trivia tests (all pass)

---

## Milestone 21: Historical Data + MLA Profiles (All 119)

**Date**: 2026-04-28
**Goal**: Per-constituency 2014/2018 election results and complete MLA profiles

### Completed

- [x] `data/seed/telangana-historical-results.ts` — per-constituency 2014 + 2018 results
  - Winner name + party for all 119 constituencies in both elections
  - Verified party tallies: 2014 (TRS 63 + INC 21 + TDP 15 + ... = 119), 2018 (TRS 88 + INC 19 + ... = 119)
  - Utility functions: `getConstituencyHistory`, `isPartyStronghold`, `getPartyTally`, `getSwingConstituencies`
  - TRS/BRS alias handling for cross-election comparison
- [x] `data/seed/telangana-mla-profiles.ts` — expanded from 20 → 119 MLAs
  - All names/parties cross-validated against `telangana-constituencies.ts`
  - 10 defectors tagged with `electedParty` field (BRS→INC)
  - Terms calculated from 2014/2018 historical data (Telangana assembly only)
  - 10 female MLAs identified, veteran MLAs tagged (3+ terms)
  - New interface: added `electedParty?` field, made `criminalCases`/`totalAssets` optional (no fabrication)
  - New utility functions: `getMLAsByParty`, `getDefectedMLAs`, `getFemaleMLAs`, `getVeteranMLAs`
- [x] `apps/mobile/components/MLACard.tsx` — updated to use canonical `MLAProfile` type, handles optional fields
- [x] 22 historical results tests + 18 MLA profile tests (all pass)

### Tests — Milestones 20–21

| Test Suite | Status | Passed | Total | Notes |
|---|---|---|---|---|
| `data/seed` — constituencies | ✅ Pass | 10 | 10 | Unchanged |
| `data/seed` — election history | ✅ Pass | 10 | 10 | Unchanged |
| `data/seed` — political timeline | ✅ Pass | 21 | 21 | **Phase 5A** |
| `data/seed` — trivia | ✅ Pass | 18 | 18 | **Phase 5A** |
| `data/seed` — historical results | ✅ Pass | 22 | 22 | **Phase 5B** |
| `data/seed` — MLA profiles | ✅ Pass | 18 | 18 | **Phase 5B** |
| **Seed data total** | **✅ All Pass** | **100** | **100** | +80 from previous |

---

## Milestone 22: Map Modes + Per-Constituency History

**Date**: 2026-04-28
**Goal**: Map color mode switching and per-constituency historical results on detail page

### Completed

- [x] `apps/mobile/components/MapColorToggle.tsx` — 3-mode toggle pill
  - **Party**: constituencies colored by winning party (INC blue, BRS pink, BJP orange, etc.)
  - **Margin**: heatmap from red (razor thin) → amber → green → blue → purple (landslide)
  - **Type**: reservation categories — GEN (indigo), SC (amber), ST (emerald)
- [x] Map screen: integrated `MapColorToggle`, Mapbox expressions switch dynamically via `useMemo`
- [x] Map bottom sheet: historical mini-cards showing 2014 / 2018 / 2023 winner parties
- [x] Constituency detail: per-constituency election history (replaces state-level)
  - 2014 / 2018 / 2023 winner cards with party dot + name
  - Stronghold badge (shield) when same party won all 3 elections
  - Swing Seat badge (arrow) when party flipped in latest election
  - Party flip indicator on individual election cards
  - State-level overview retained below per-constituency section
- [x] `apps/mobile/lib/data.ts` — added historical results exports
