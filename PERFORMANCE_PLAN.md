# KSHETRA — Lightweight & Lightning-Fast Plan

**Status:** Locked architecture; execution in progress.
**North star:** After install, the app feels *instant and fluid* — no spinners on
the hot path, no "is it broken?" moments — while keeping the Play Store download
small.

> Principle: **small size and speed reinforce each other.** Less bundled data =
> less to parse at startup = less RAM on low-end Android. The job is being
> deliberate about **what is instant (local) vs. what streams in invisibly
> (remote, cached)**.

## 1. Baseline (measured 2026-06-22)

- **63.2 MB** boundary GeoJSON in `apps/mobile/data/*.json`, pulled via
  `() => require('@/data/xx-assembly.json')` in the map layer. Metro **bundles all
  of it** (the function only defers parsing, not inclusion).
- **7.5 MB** seed `.ts` in `data/seed/*` (MLA profiles, demographics, results,
  timelines, trivia) **statically imported for all 28+ states** in
  `lib/stateDataDispatcher.ts`, `lib/data.ts`, `lib/stateDataAdapter.ts` — eagerly
  bundled and loaded into the JS heap at startup.
- Native libs (`@maplibre/maplibre-react-native`, `react-native-webview`, …) add
  to binary size.

**Measured via `expo export --platform android` (2026-06-23):**
- **JS bundle: 136.4 MB** — a single Hermes `.hbc` file (the GeoJSON + seed data
  are compiled *into the bundle*, confirming they are not lazy assets).
- Static assets: 3.9 MB · **Total export: 140.3 MB.**

**Net:** ~70 MB of source data balloons to a 136 MB JS bundle → very large download,
slow TTI, high memory at load.
**Already good:** Hermes + New Arch, FlashList, MMKV, `expo-image`, react-query.

**Target after refactor:** JS bundle → low single-digit MB (code only); data served
from a small SQLite asset + remote/cached map tiles.

## 2. Targets

- Download ≤ **25–30 MB** (from ~80–120 MB).
- Cold start to first interactive screen ≤ **2 s** on mid/low-end Android.
- 60 fps lists/maps; no visible spinner on core navigation.

## 3. Locked architecture — 3 tiers

- **Tier A — bundled, instant, offline: prebuilt SQLite.** Generate a `.db` at
  build time from `data/seed/*`, ship as asset, query via `expo-sqlite`. Replaces
  7.5 MB of JS arrays; removes them from the JS heap. Adapter APIs
  (`stateDataDispatcher`/`stateDataAdapter`) keep their signatures so screens
  don't change.
- **Tier B — streamed once, cached forever: map boundaries.** Move 63 MB GeoJSON
  to Supabase Storage/CDN as vector tiles (PMTiles) or simplified geometry;
  download per-state on first map open; cache to disk.
- **Tier C — live, cached: social / civic / feed / AI** from the API with
  stale-while-revalidate.

## 4. Perceived-speed UX patterns

Skeleton placeholders (not spinners), prefetch ahead of taps, stale-while-
revalidate (react-query), optimistic UI for votes/follows/comments, cache-once
boundaries, off-thread JSON parsing, blur-up images, FlashList tuning.

## 5. Execution phases

1. **Phase 1** — this doc + measure bundle baseline.
2. **Phase 2** — seed data → prebuilt SQLite + lazy per-state loading (−7.5 MB,
   faster start).
3. **Phase 3** — boundaries off-device (vector tiles/simplified + cache) (−63 MB).
4. **Phase 4** — UX polish (skeletons, prefetch, SWR, optimistic UI).
5. **Phase 5** — release hygiene: AAB + R8/`shrinkResources`, icon-font subset,
   drop `xlsx`/`expo-dev-client` from production.

## 6. Risks

- MapLibre RN PMTiles/offline support must be verified (else simplified-GeoJSON
  fallback).
- SQLite queries are async → a few screens may need a brief loading state or
  active-state preload; needs data-parity tests vs current seeds.
- Cross-platform asset DB build pipeline + versioning for future data updates.
