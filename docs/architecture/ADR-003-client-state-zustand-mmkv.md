# ADR-003: Client State with Zustand + MMKV Persistence

**Status**: Accepted (retroactively documented)
**Date**: 2026-04-29

## Context

The mobile app holds substantial client-side state — favourites, active state
selection, feed, civic issues, promises, delimitation, auth, and more
(~25 stores under `apps/mobile/stores/`). It must be offline-first, instant to
load, and survive app restarts.

## Decision

Use **Zustand** for in-memory state and **react-native-mmkv** for synchronous,
high-performance persistence (with AsyncStorage where a JS-bridge store is
required, e.g. Supabase auth).

- Each domain owns a store module under `apps/mobile/stores/`.
- Persistable stores wrap state with MMKV-backed storage for instant rehydrate.
- Selectors keep re-renders minimal.

## Rationale

- Zustand is minimal, hook-based, and avoids Redux boilerplate.
- MMKV is the fastest RN key-value store (synchronous, native) — critical for
  the "instant page load" performance requirement.
- Offline-first: state rehydrates locally with no network dependency.

## Consequences

- MMKV requires a native module → not available in Expo Go (needs a dev build).
- Tests for persistent stores must mock MMKV (see Gold Standard mobile test
  harness work).
- Store-level discipline is needed to avoid oversized stores (some exceed the
  size budget and are refactoring candidates).
