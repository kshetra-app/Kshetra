# KSHETRA — Build Log

> Living document tracking every milestone, decision, and test result.

---

## Build Status

| Phase | Status | Started | Completed |
|---|---|---|---|
| Phase 1A: Project Scaffold | ✅ Complete | 2026-04-26 | 2026-04-26 |
| Phase 1B: Interactive Map | ⬜ Not Started | — | — |
| Phase 1C: Find My Constituency | ⬜ Not Started | — | — |
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

---

## Change Log

| Date | Commit | Description |
|---|---|---|
| 2026-04-26 | `chore: initial project scaffold` | Monorepo, shared types, API server, mobile app shell, tests (18/18 pass) |
