# ADR-009: API Design — RESTful, Seed-Backed, Offline-First

**Date**: 2026-04-26
**Status**: Accepted
**Deciders**: Founding team

## Context

KSHETRA needs an API layer to serve constituency data, election analytics, and geolocation results. During Phase 1, we don't have a database — all data comes from the TypeScript seed file (`data/seed/telangana-constituencies.ts`).

## Decision

### Architecture

- **Framework**: Fastify v5 (TypeScript) — chosen for its speed, schema validation, and plugin ecosystem.
- **Data source**: In-memory from the seed file. No database dependency in Phase 1.
- **Versioned prefix**: All routes under `/api/v1/` to allow non-breaking evolution.
- **Analytics**: Computation via `@kshetra/shared` (`computeElectionAnalytics`) — same function used by both the API and mobile Intelligence tab, ensuring consistency.

### Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/v1/states/:stateCode/constituencies` | List all constituencies |
| GET | `/api/v1/states/:stateCode/constituencies/:id` | Detail by AC# or name |
| GET | `/api/v1/states/:stateCode/constituencies/search` | Multi-filter search (q, party, district, type) |
| GET | `/api/v1/states/:stateCode/analytics` | Party summary, district breakdown, margin stats |
| GET | `/api/v1/constituencies/locate?lat=&lng=` | Reverse geocode via point-in-polygon |

### Key Principles

1. **Offline-first mobile**: The mobile app bundles all seed data and GeoJSON locally. The API is an optional layer for web clients and future features.
2. **Shared analytics**: `computeElectionAnalytics()` lives in `@kshetra/shared` so mobile and API produce identical results.
3. **State-scoped**: All routes are scoped by `stateCode`. Only Telangana (TS) is supported in Phase 1; others return empty/404 gracefully.
4. **No auth required**: Phase 1 is fully public. Auth (Supabase) will be added in Phase 2B.

## Consequences

- API is stateless and fast — no DB queries, no connection pools.
- Adding a new state requires only a new seed file and GeoJSON.
- When Supabase is introduced (Phase 2B), the API layer will switch from in-memory seeds to database queries with minimal route changes.
- The shared analytics module prevents drift between mobile and API computations.
