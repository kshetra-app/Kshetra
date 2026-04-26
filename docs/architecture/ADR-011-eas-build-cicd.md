# ADR-011: EAS Build + CI/CD Pipeline

**Date**: 2026-04-27
**Status**: Accepted
**Deciders**: Founding team

## Context

KSHETRA needs a reliable build and deployment pipeline for both development and production. Manual builds are slow and error-prone.

## Decision

### EAS Build (Expo Application Services)

Three build profiles:
- **development**: Dev client with debugging, internal distribution
- **preview**: Internal testing builds (TestFlight / Internal Track)
- **production**: Store-ready builds with auto-incrementing version

### CI/CD via GitHub Actions

Three workflows:

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci.yml` | PR / push to main | Lint, typecheck, run all 91+ tests |
| `eas-build.yml` | Push to main (mobile changes) + manual dispatch | Full native build via EAS |
| `eas-update.yml` | Push to main (JS-only changes) | OTA update via EAS Update |

### OTA Updates

JS-only changes (app/, lib/, stores/, assets/) trigger instant OTA updates via `eas update` — no app store review needed. Native changes trigger full rebuild.

### Required Secrets

| Secret | Purpose |
|---|---|
| `EXPO_TOKEN` | EAS authentication |
| `MAPBOX_TOKEN` | Mapbox SDK download |
| Supabase env vars | In EAS build secrets, not in repo |

## Consequences

- Every PR is automatically tested before merge
- Native builds are triggered only when needed
- JS changes deploy instantly via OTA
- Manual dispatch available for ad-hoc builds
- Build concurrency prevents duplicate CI runs
