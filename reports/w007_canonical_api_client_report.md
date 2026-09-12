# JOB W007: CANONICAL API CLIENT IMPLEMENTATION & EVIDENCE REPORT

**Authority:** Master Execution Framework Amendment v1.5-A / `DEC-037` / `DEC-038`  
**Job Identifier:** `W007`  
**Job Title:** Canonical API Client (Unified Mobile-to-Backend HTTP Architecture Foundation)  
**Date:** 2026-09-12  
**Starting Baseline Remote HEAD:** `2f5ec43251fb7a8d323a029640576cc777fc79cf` (`2f5ec43`)  
**Status:** `IMPLEMENTATION COMPLETED / SUBMITTED FOR INDEPENDENT VERIFICATION`

---

## 1. Executive Summary

Job W007 established the canonical, strongly-typed, observable, and resilient API client foundation (`apps/mobile/lib/api/`) for the PANIN mobile application. All direct ad-hoc HTTP interactions with Fastify are now routed through this centralized architecture, resolving the dual-path network fragmentation identified in W006.

Three low-risk, independent pioneer callers were successfully migrated from ad-hoc `fetch()` calls to namespaced endpoint wrappers, strictly preserving their offline and error fallback semantics:
1. `apps/mobile/lib/pageService.ts` -> `apiClient.pages.getEntitlement(pageId)` (`GET /api/v1/pages/:pageId/entitlement`, PUBLIC)
2. `apps/mobile/lib/featureFlags.ts` -> `apiClient.config.getFlags()` (`GET /api/v1/config/flags`, PUBLIC)
3. `apps/mobile/stores/news.ts` -> `apiClient.news.getFeed(filters)` (`GET /api/v1/news/feed`, PUBLIC)

Direct messaging (`dmStore.ts` and DM methods in `supabaseDataService.ts`), database migrations, Fastify server route implementations, and external dependencies remained completely untouched.

---

## 2. Target Architecture Delivery

### 2.1 Module Inventory (`apps/mobile/lib/api/`)

| File | Purpose | Key Exports |
| :--- | :--- | :--- |
| `types.ts` | Type definitions, options, DTOs, response contracts | `HttpMethod`, `AuthPolicy`, `RequestOptions`, `ApiResponse`, DTOs |
| `errors.ts` | Normalized `ApiError` hierarchy & factory | `ApiError`, `ApiAuthError`, `ApiValidationError`, `ApiCorrelationError`, `ApiTimeoutError` |
| `authManager.ts` | Single-flight promise coordinator around Supabase Auth | `AuthManager`, `authManager` |
| `interceptors/auth.ts` | Fail-safe authentication injector | `applyAuthHeaders` |
| `interceptors/correlation.ts` | Tracing headers, response validation, privacy breadcrumbs | `resolveRequestId`, `validateResponseCorrelation`, `recordNetworkBreadcrumb` |
| `client.ts` | Core HTTP client with deadline budget & safe retries | `ApiClient` |
| `endpoints/config.ts` | Config flags API wrapper | `ConfigEndpoint` |
| `endpoints/pages.ts` | Page entitlement API wrapper | `PagesEndpoint` |
| `endpoints/news.ts` | News feed API wrapper with query filters | `NewsEndpoint` |
| `index.ts` | Singleton instance & module exports | `apiClient`, `CANONICAL_API_URL` |

### 2.2 Core Invariants Enforced

1. **Fail-Safe Authentication Policy:**
   - Default policy: `authenticated`.
   - Rejects unauthenticated calls before network dispatch if no session exists (`ApiAuthError`).
   - `public` policy allowed only when explicitly declared on endpoint wrappers.
   - All 3 pioneer endpoints are explicitly declared `public`.
2. **End-to-End Correlation Tracking:**
   - Client generates RFC4122 v4 UUID satisfying Fastify regex `^[a-zA-Z0-9_\-]+$` and length ≤ 128.
   - Client captures response `x-request-id` header and validates exact match against sent ID.
   - If missing (NP-11) or mismatched (NP-12), client raises typed `ApiCorrelationError`.
3. **Overall Request Deadline Budget Model:**
   - `TOTAL_GET_BUDGET = 18,000ms` for GET requests with 2 retries.
   - Each attempt uses `Math.min(attemptTimeoutCeiling, remainingBudget)`.
   - `AbortController` cleanly terminates socket connections on timeout.
4. **Deterministic Mutation Safety:**
   - Idempotent GET/HEAD requests retry on transient 502/503/504 errors (max 2 retries).
   - POST, PUT, PATCH, and DELETE mutations have strictly 0 automatic retries (NP-08).
5. **Telemetry Privacy Invariant (NP-10):**
   - Telemetry breadcrumbs log: method, sanitized path, status code, request ID, duration.
   - Zero `Authorization` headers, tokens, request bodies, or response bodies recorded.

---

## 3. Pioneer Caller Adoption & Fallback Verification

| Pioneer Caller | Target Endpoint | Migration Action | Fallback State Preserved |
| :--- | :--- | :--- | :--- |
| `apps/mobile/lib/pageService.ts` | `GET /api/v1/pages/:pageId/entitlement` | Migrated to `apiClient.pages.getEntitlement(pageId)` | Returns `{ pageId, isPro: false, plan: 'free', expiresAt: null }` on error |
| `apps/mobile/lib/featureFlags.ts` | `GET /api/v1/config/flags` | Migrated to `apiClient.config.getFlags()` | Retains MMKV persisted/default flags on error |
| `apps/mobile/stores/news.ts` | `GET /api/v1/news/feed` | Migrated to `apiClient.news.getFeed(filters)` | Returns `null` on error, falling back to on-device scrape / cache |

---

## 4. Test Verification Suite Results

| Test Suite | Command | Result | Detail |
| :--- | :--- | :---: | :--- |
| **Mobile API Client Unit Tests** | `npm test --prefix apps/mobile -- __tests__/apiClient.test.ts` | **PASS** | 20/20 passed across all transport, auth, correlation, error, and fallback tests |
| **W007 Master Verification Test** | `node tests/w007-api-client-verification.test.mjs` | **PASS** | 8/8 checks passed (module structure, pioneer migration, boundary immutability) |
| **W006 Final Acceptance Suite** | `node tests/w006-final-acceptance.test.mjs` | **PASS** | 10/10 negative-path tests passed; 12 baseline Supabase callers preserved |
| **API Architecture Audit Suite** | `node tests/api-architecture-audit.test.mjs` | **PASS** | 36/36 checks passed (all RLS and caller checks intact) |
| **Fastify Observability Suite** | `npm test --prefix apps/api -- src/__tests__/observability.test.ts` | **PASS** | 19/19 passed (correlation, error envelopes, metrics security) |
| **API Contract Drift Check** | `node scripts/check-api-contract-drift.mjs` | **PASS** | 9/9 declared contracts matched (100% parity) |
| **API TypeScript Build** | `npm run build --prefix apps/api` | **PASS** | `tsc --noEmit` exited with code 0 |

---

## 5. Architectural Boundary Verification

- **Direct Messaging Callers:** `apps/mobile/stores/dmStore.ts` has 0 diff against baseline `2f5ec43`.
- **Fastify Server Routes:** `apps/api/src/routes/` has 0 diff against baseline `2f5ec43`.
- **Database Migrations:** `supabase/migrations/` has 0 diff against baseline `2f5ec43`.
- **Package Dependencies:** `package.json`, `apps/mobile/package.json`, `apps/api/package.json` have 0 diff against baseline `2f5ec43`.
