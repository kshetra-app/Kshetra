# ADR-010: Supabase for Database, Auth, and Backend Services

**Date**: 2026-04-26
**Status**: Accepted
**Deciders**: Founding team

## Context

KSHETRA needs a persistent database, user authentication, and row-level security for the transition from seed data to a production-ready backend.

## Decision

### Supabase (PostgreSQL + PostGIS + Auth)

- **Database**: PostgreSQL with PostGIS for geospatial queries (constituency boundaries, point-in-polygon at DB level).
- **Auth**: Supabase Auth with email/password. Google and phone OTP to be added later.
- **Storage**: Auth tokens stored in `expo-secure-store` on native, `localStorage` on web.
- **RLS**: Row-level security on all tables. Public read for constituencies/elections, user-scoped access for favourites.

### Schema

| Table | Purpose |
|---|---|
| `states` | State metadata (code, name, seats, centroid) |
| `constituencies` | 119 ACs with PostGIS boundaries |
| `elections` | State-level election metadata (2014/2018/2023) |
| `election_results` | Per-constituency per-election winner data |
| `user_favourites` | RLS-protected user bookmarks |

### Auth Flow

1. App starts → `useAuthStore.initialize()` checks for existing session in SecureStore.
2. Guest users get full read access (no auth required for constituency data).
3. Sign In/Up via email → modal screen (`/auth/sign-in`).
4. Signed-in users get synced favourites via `user_favourites` table.

### Migration Strategy

- Phase 1: App continues to use seed data offline (no Supabase dependency).
- Phase 2: Supabase added as optional layer. Auth works, but data still comes from seed.
- Phase 3: API switches from seed imports to Supabase queries. Seed becomes migration source only.

## Consequences

- App works fully offline even without Supabase credentials (graceful fallback).
- Auth tokens are encrypted on device via expo-secure-store.
- PostGIS enables server-side geospatial queries (future: nearest constituencies, regional search).
- RLS ensures data isolation without application-level auth checks.
