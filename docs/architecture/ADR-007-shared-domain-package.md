# ADR-007: Shared Domain Package (`@kshetra/shared`)

**Status**: Accepted (retroactively documented)
**Date**: 2026-04-26

## Context

Both the API and the mobile app need identical domain logic: party metadata,
constituency types, election analytics, and point-in-polygon geolocation.
Duplicating this logic would cause drift between what the API computes and what
the app displays.

## Decision

Centralize domain types and pure functions in a workspace package
**`@kshetra/shared`** (`packages/shared/`), built to `dist/` and consumed by
both apps.

- Exposes constants (`PARTY_CONFIG`, `STATES`), types (`ConstituencyBrief`,
  `ConstituencyRecord`), and functions (`computeElectionAnalytics`,
  `findConstituencyAtPoint`).
- Has its own Jest suite (`packages/shared/src/__tests__/`) covering parties,
  states, election analytics, and geolocation.

## Rationale

- Single implementation → API and mobile produce identical results.
- Pure, dependency-light functions are trivially unit-testable.
- Type sharing prevents contract mismatches across the stack.

## Consequences

- `@kshetra/shared` must be built before dependents (`dependsOn: ["^build"]`).
- CI builds the shared package first in every job.
- Breaking changes to shared types ripple to both apps — covered by typecheck
  and tests in CI.
