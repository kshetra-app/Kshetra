# ADR-002: Monorepo with Turborepo + npm Workspaces

**Status**: Accepted (retroactively documented)
**Date**: 2026-04-26

## Context

KSHETRA spans a mobile app, a backend API, shared domain logic, and large
typed datasets (seed + census). These artifacts share TypeScript types and
must evolve together without version-skew between independently published
packages.

## Decision

Use a single Git monorepo managed by **Turborepo** over **npm workspaces**.

- Workspaces (`package.json`): `apps/*`, `packages/*`, `data/*`.
- Task graph (`turbo.json`): `build`, `dev`, `test`, `lint`, `clean` with
  `dependsOn: ["^build"]` so dependents build their dependencies first.
- Shared types live in `@kshetra/shared`, consumed by both `apps/api` and
  `apps/mobile` via the workspace protocol (`"@kshetra/shared": "*"`).

## Rationale

- One source of truth for cross-cutting types (parties, constituencies, analytics).
- Atomic commits across API + mobile + data.
- Turborepo caching keeps CI fast as the repo grows.

## Consequences

- npm hoists dependencies to the root `node_modules`, occasionally requiring
  explicit peer-dependency resolution (documented in TROUBLESHOOTING.md).
- The root `package.json` must be kept curated (see the Gold Standard
  dependency-hygiene backlog).
- New deployable units are added as new workspaces with minimal config.
