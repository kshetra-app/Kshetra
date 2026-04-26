# ADR-008: GeoJSON Data Source for Constituency Boundaries

## Status
Accepted

## Context
We need polygon boundary data for all 119 Telangana assembly constituencies to render the interactive map. Options:
1. Telangana Open Data Portal (official, but SPA with no direct download links)
2. DataMeet India_AC.shp (needs GDAL conversion, Telangana labeled as AP)
3. datta07/INDIAN-SHAPEFILES (ready-made GeoJSON per state, MIT license)

## Decision
Use `datta07/INDIAN-SHAPEFILES` GeoJSON files:
- `TELANGANA_ASSEMBLY.geojson` — 120 features (119 unique ACs)
- `TELANGANA_DISTRICTS.geojson` — district boundaries
- `TELANGANA_STATE.geojson` — state outline

## Rationale
- **Immediately usable**: No conversion needed, already GeoJSON
- **MIT licensed**: Free for commercial use
- **Well-structured properties**: AC_NO, AC_NAME, DIST_NAME, PC_NAME
- **Active repo**: 150+ stars, maintained

## Consequences
- Data is pre-delimitation (2008 boundaries) — will need replacement when new delimitation is published
- Some constituency name spellings may differ from ECI official names — normalized in seed data
- Bundled directly into mobile app (~3MB) for offline-first access
