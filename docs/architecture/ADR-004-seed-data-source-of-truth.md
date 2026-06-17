# ADR-004: Typed Seed Data as the Phase-1 Source of Truth

**Status**: Accepted (retroactively documented)
**Date**: 2026-04-26

## Context

Phase 1 ships before a live database is connected. Election results, MLA
profiles, demographics, historical results, and the political timeline must be
available to both the API and the mobile app, bundled for offline use.

## Decision

Author all Phase-1 data as **typed TypeScript modules** under `data/seed/`
(and `data/census/`), validated by **Jest** test suites in `__tests__/`.

- Each state has constituency, MLA, demographic, historical, and timeline files.
- Cross-validation tests assert invariants (e.g. seat counts, unique `acNo`,
  party tallies summing to the assembly size).
- The API imports these seeds directly; the mobile app bundles them.

## Rationale

- Type-safety catches structural errors at compile time.
- Tests enforce real-world invariants (a state has exactly N seats).
- No infrastructure needed to ship a fully functional Phase-1 product.

## Consequences

- Data correctness depends on test coverage. **Known defect:**
  `andhra-pradesh-constituencies.ts` is corrupted (180 rows, `acNo` 1–182,
  missing 155 & 173, 8 malformed rows) and must be re-imported from the
  authoritative ECI/MyNeta 2024 dataset rather than hand-edited.
- When Supabase is connected (Phase 2B), seeds become the migration source and
  the API switches from in-memory reads to DB queries (see ADR-009).
- Every production data bug must add a regression test before the fix is closed.
