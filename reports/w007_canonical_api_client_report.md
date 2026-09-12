# JOB W007: CANONICAL API CLIENT IMPLEMENTATION & EVIDENCE REPORT

**Authority:** Master Execution Framework Amendment v1.5-A / `DEC-037` / `DEC-038`  
**Job Identifier:** `W007`  
**Job Title:** Canonical API Client (Unified Mobile-to-Backend HTTP Architecture Foundation)  
**Date:** 2026-09-12  
**Starting Baseline Remote HEAD:** `2f5ec43251fb7a8d323a029640576cc777fc79cf` (`2f5ec43`)  
**Previous Implementation Commit:** `aa33d2e380e18f9316edacb150695c3d706c8904` (`aa33d2e`)  
**Corrected Implementation Commit:** `169f8fd44c15a5bbdd48f7a660003f7d3db078ad` (`169f8fd`)  
**Status:** `IN VERIFICATION / CORRECTIONS REQUIRED`

---

## 1. Executive Summary

Job W007 established the canonical, strongly-typed, observable, and resilient API client foundation (`apps/mobile/lib/api/`) for the PANIN mobile application. All direct ad-hoc HTTP interactions with Fastify are now routed through this centralized architecture, resolving the dual-path network fragmentation identified in W006.

Following CTO verification review, 9 core hardening corrections were applied:
1. **Real AuthManager Single-Flight Verification:** Tested real `AuthManager.getAccessToken()` deduplication against underlying Supabase session resolution (10 concurrent calls -> 1 getSession() call -> 10 identical tokens).
2. **Authoritative News Contract:** Redefined `NewsItemDTO` and `NewsFeedResponseDTO` to match Fastify `newsRoutes` and `newsService.ts` exactly (`version`, `generatedAt`, `refreshIntervalMin`, `sources`, `items`). Removed unauthorized fields (`total`, `filters`, `url`).
3. **Elimination of Unsafe Casts:** Implemented explicit, validated runtime mapping `mapNewsFeedDTOToNewsFeed()` in `endpoints/news.ts`. Completely removed `as unknown as NewsFeed` escape hatch in `stores/news.ts`.
4. **Runtime Response Contract Validation:** Added schema validation guards (`validateFeatureFlagsResponse`, `validatePageEntitlementResponse`, `validateNewsFeedResponse`) that raise typed `ApiValidationError` if server payloads are malformed.
5. **Strict Caller Cancellation Semantics:** Implemented `ApiCancellationError`. Explicitly excluded caller-aborted requests from retry loops and ensured 0 retries.
6. **Error-Response Correlation Validation:** Enforced mandatory `x-request-id` header validation across all Fastify response paths (2xx, 4xx, 5xx), raising `ApiCorrelationError` on missing or mismatched headers.
7. **Mobile TypeScript Compiler Gate:** Successfully executed `npx tsc --noEmit -p apps/mobile/tsconfig.json` with exit code 0.
8. **API TypeScript Build:** Successfully executed `npm run build --prefix apps/api` with exit code 0.
9. **Zero Out-of-Scope Drift:** Preserved strict immutability of `dmStore.ts`, `supabaseDataService.ts`, `apps/api/src/routes/*`, `supabase/migrations/*`, and `package.json`.

---

## 2. Target Architecture Delivery

### 2.1 Module Inventory (`apps/mobile/lib/api/`)

| File | Purpose | Key Exports |
| :--- | :--- | :--- |
| `types.ts` | Type definitions, options, DTOs, response contracts | `HttpMethod`, `AuthPolicy`, `RequestOptions`, `ApiResponse`, DTOs |
| `errors.ts` | Normalized `ApiError` hierarchy & factory | `ApiError`, `ApiAuthError`, `ApiValidationError`, `ApiCorrelationError`, `ApiTimeoutError`, `ApiCancellationError` |
| `authManager.ts` | Single-flight promise coordinator around Supabase Auth | `AuthManager`, `authManager` |
| `interceptors/auth.ts` | Fail-safe authentication injector | `applyAuthHeaders` |
| `interceptors/correlation.ts` | Tracing headers, response validation, privacy breadcrumbs | `resolveRequestId`, `validateResponseCorrelation`, `recordNetworkBreadcrumb` |
| `client.ts` | Core HTTP client with deadline budget, cancellation, & safe retries | `ApiClient` |
| `endpoints/config.ts` | Config flags API wrapper & schema validation | `ConfigEndpoint`, `validateFeatureFlagsResponse` |
| `endpoints/pages.ts` | Page entitlement API wrapper & schema validation | `PagesEndpoint`, `validatePageEntitlementResponse` |
| `endpoints/news.ts` | News feed API wrapper, validation, & safe DTO mapper | `NewsEndpoint`, `validateNewsFeedResponse`, `mapNewsFeedDTOToNewsFeed` |
| `index.ts` | Singleton instance & module exports | `apiClient`, `CANONICAL_API_URL` |

### 2.2 Core Invariants Enforced

1. **Fail-Safe Authentication Policy:** Default policy `authenticated`. Rejects unauthenticated calls before network dispatch if no session exists (`ApiAuthError`).
2. **End-to-End Correlation Tracking:** Enforced for 2xx, 4xx, and 5xx responses. Missing or mismatched `x-request-id` raises typed `ApiCorrelationError`.
3. **Caller Cancellation Semantics:** External `AbortController` cancellation aborts in-flight request, triggers 0 retries, and raises typed `ApiCancellationError`.
4. **Runtime Schema Validation:** All pioneer endpoints validate payloads at runtime before delivering data to mobile state stores.
5. **Deterministic Mutation Safety:** Idempotent GET/HEAD requests retry on transient 502/503/504 errors up to budget. Mutations (POST/PUT/PATCH/DELETE) have strictly 0 retries (NP-08).
6. **Telemetry Privacy Invariant (NP-10):** Telemetry breadcrumbs record method, sanitized path, status code, request ID, duration. Zero Authorization headers, tokens, or bodies recorded.

---

## 3. Pioneer Caller Adoption & Fallback Verification

| Pioneer Caller | Target Endpoint | Migration Action | Fallback State Preserved |
| :--- | :--- | :--- | :--- |
| `apps/mobile/lib/pageService.ts` | `GET /api/v1/pages/:pageId/entitlement` | Migrated to `apiClient.pages.getEntitlement(pageId)` | Returns `{ pageId, isPro: false, plan: 'free', expiresAt: null }` on error |
| `apps/mobile/lib/featureFlags.ts` | `GET /api/v1/config/flags` | Migrated to `apiClient.config.getFlags()` | Retains MMKV persisted/default flags on error |
| `apps/mobile/stores/news.ts` | `GET /api/v1/news/feed` | Migrated to `apiClient.news.getFeed(filters)` | Returns `null` on error, falling back to on-device scrape / cache / seed |

---

## 4. Test Verification Suite Results

| Test Suite | Command | Result | Detail |
| :--- | :--- | :---: | :--- |
| **Mobile API Client Unit Tests** | `npm test --prefix apps/mobile -- __tests__/apiClient.test.ts` | **PASS** | 29/29 passed (real AuthManager single flight, cancellation, error correlation, runtime validation) |
| **W007 Master Verification Test** | `node tests/w007-api-client-verification.test.mjs` | **PASS** | 9/9 checks passed (module structure, pioneer migration, boundary immutability, validation) |
| **W006 Final Acceptance Suite** | `node tests/w006-final-acceptance.test.mjs` | **PASS** | 10/10 negative-path tests passed; 12 baseline Supabase callers preserved |
| **API Architecture Audit Suite** | `node tests/api-architecture-audit.test.mjs` | **PASS** | 36/36 checks passed (all RLS and caller checks intact) |
| **Fastify Observability Suite** | `npm test --prefix apps/api -- src/__tests__/observability.test.ts` | **PASS** | 19/19 passed (correlation, error envelopes, metrics security) |
| **API Contract Drift Check** | `node scripts/check-api-contract-drift.mjs` | **PASS** | 9/9 declared contracts matched (100% parity) |
| **Mobile TypeScript Compilation** | `npx tsc --noEmit -p apps/mobile/tsconfig.json` | **PASS** | Clean exit 0; zero compiler diagnostics |
| **API TypeScript Build** | `npm run build --prefix apps/api` | **PASS** | Clean exit 0; `tsc --noEmit` passed |

---

## 5. Architectural Boundary Verification

- **Direct Messaging Callers:** `apps/mobile/stores/dmStore.ts` has 0 diff against baseline `2f5ec43`.
- **Fastify Server Routes:** `apps/api/src/routes/` has 0 diff against baseline `2f5ec43`.
- **Database Migrations:** `supabase/migrations/` has 0 diff against baseline `2f5ec43`.
- **Package Dependencies:** `package.json`, `apps/mobile/package.json`, `apps/api/package.json` have 0 diff against baseline `2f5ec43`.

