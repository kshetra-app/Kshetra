# ADR-006: Maps via MapLibre + CARTO Tiles with a Mapbox-API Compat Shim

**Status**: Accepted (retroactively documented)
**Date**: 2026-05-xx

## Context

The core experience is an interactive constituency map. An earlier iteration
used `@rnmapbox/maps` (Mapbox GL). Mapbox's hosted tiles require an access
token and have usage-based billing, and `@rnmapbox/maps` v10.3.0 removed the
MapLibre backend, causing native build failures (see TROUBLESHOOTING.md).

## Decision

Render with **`@maplibre/maplibre-react-native`** and **free CARTO basemap
tiles**, behind a thin compatibility shim that preserves the existing
`@rnmapbox/maps` (`MapboxGL.*`) JSX API.

- Tile styles: `MAP_STYLE` / `MAP_STYLE_LIGHT` in `apps/mobile/lib/constants.ts`
  point to CARTO `dark-matter` / `positron` GL styles (no token required).
- The shim in `apps/mobile/app/(tabs)/index.tsx` maps MapLibre named exports to
  the `MapboxGL.{MapView,Camera,ShapeSource,FillLayer,LineLayer,...}` namespace
  so existing JSX is unchanged.
- The native module is unavailable in Expo Go → `MapFallback` renders instead.

## Rationale

- No token/billing dependency; open-source stack.
- The compat shim avoids rewriting all map JSX.
- CARTO styles render cleanly with our polygon fill/line layers.

## Consequences

- The `mapStyle: 'mapbox://…'` strings in `apps/mobile/lib/theme.ts` are
  **vestigial drift** — the live `styleURL` is the CARTO `MAP_STYLE`. These
  should be removed/aligned in a cleanup pass.
- Components are still named "Mapbox*"/"MapFallback" for continuity; naming may
  be normalized to MapLibre later.
- Map interaction handlers must accept both MapLibre and legacy `@rnmapbox`
  event shapes (already handled in `handleMapPress`).
