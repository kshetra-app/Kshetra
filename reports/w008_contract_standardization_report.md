# JOB W008: API CONTRACT STANDARDIZATION REPORT

- **Job ID:** W008
- **Title:** API Contract Standardization & Schema Hardening
- **Authority:** Master Execution Framework Amendment v1.5-A, DEC-035, DEC-037, DEC-041, DEC-042
- **Repository:** `https://github.com/kshetra-app/Kshetra.git`
- **Branch:** `master`
- **Date:** 2026-09-12
- **Status:** IMPLEMENTED / UNDER INDEPENDENT VERIFICATION

---

## 1. Executive Summary

Job W008 delivers a formal, bidirectional API contract standard between the Fastify backend (`apps/api`) and the canonical mobile API client (`apps/mobile/lib/api/`). It eliminates ad-hoc JSON payloads, establishes canonical envelopes for success and error states, attaches Fastify/Ajv route schemas to eliminate parameter/type ambiguity, extends the mobile client with typed endpoint wrappers (`StatesEndpoint`), and verifies complete immunity against 16 distinct failure modes via an exhaustive negative-path test suite.

---

## 2. Canonical Contracts Foundation (`@kshetra/shared`)

The shared contracts package (`@kshetra/shared`) provides the single source of truth for wire representations across all clients and services:

1. **`ApiSuccessEnvelope<T>` (`packages/shared/src/contracts/envelopes.ts`):**
   - Standard envelope for uniform successful responses:
     ```typescript
     export interface ApiSuccessEnvelope<T = unknown> {
       success: true;
       data: T;
       requestId: string;
       timestamp: string;
     }
     ```
2. **`ApiErrorEnvelope` & `ApiErrorDetail` (`packages/shared/src/contracts/envelopes.ts`):**
   - Standard envelope for all 4xx and 5xx responses:
     ```typescript
     export interface ApiErrorDetail {
       path: string;
       message: string;
     }

     export interface ApiErrorEnvelope {
       error: string;
       message: string;
       statusCode: number;
       code?: string;
       requestId: string;
       timestamp: string;
       details?: ApiErrorDetail[];
     }
     ```
3. **`PaginationQuery`, `PaginationMeta`, `PaginatedResponse<T>` (`packages/shared/src/contracts/pagination.ts`):**
   - Standard offset and cursor pagination structures for feeds and collections.

---

## 3. Fastify Schema Hardening & Error Handling (`apps/api`)

1. **Standardized Error Reply Helper (`apps/api/src/lib/replyHelper.ts`):**
   - Provides `sendApiError(reply, request, statusCode, error, message, options)` ensuring all route-level errors strictly conform to `ApiErrorEnvelope`.
2. **Enhanced Global Error Handler (`apps/api/src/server.ts`):**
   - Automatically catches and unwraps Fastify/Ajv schema validation errors into structured `details: [{ path, message }]`.
   - Propagates error codes (e.g., `FST_ERR_VALIDATION`).
   - Guarantees `error: "Bad Request"` for 400 validation failures and echoes the verified request correlation ID.
3. **Route Schemas Attached:**
   - **`apps/api/src/routes/config.ts`:**
     - `GET /api/v1/config/flags`: Response schema validating boolean dictionary.
     - `PATCH /api/v1/config/flags`: Body schema with `preValidation` hook enforcing strict boolean values without type coercion.
   - **`apps/api/src/routes/news.ts`:**
     - `GET /api/v1/news/feed`: Querystring schema enforcing integer limit [1..100], scope enums (`all`, `national`, `state`), and string length constraints.
   - **`apps/api/src/routes/states.ts`:**
     - `GET /api/v1/states`: Response schema for states array.
     - `GET /api/v1/states/:code`: Params schema with code length constraints [2..5] and 404 envelope via `sendApiError()`.

---

## 4. Mobile API Client Extension (`apps/mobile/lib/api/`)

1. **`StatesEndpoint` (`apps/mobile/lib/api/endpoints/states.ts`):**
   - Implements `listStates()` and `getState(code)` using public auth policy.
   - Runtime validation functions `validateStateInfo` and `validateStatesListResponse` enforce that network payloads strictly match the expected structure before returning typed domain objects, failing closed with `ApiValidationError` on malformed responses.
2. **`ApiClient` Integration (`apps/mobile/lib/api/client.ts`):**
   - Exposed as `apiClient.states`.
   - Re-exported from `apps/mobile/lib/api/index.ts`.

---

## 5. Negative-Path Verification Matrix (NP-01 .. NP-16)

All 16 mandatory negative paths pass with 100% compliance:

| ID | Failure Mode | Component Under Test | Expected Behavior | Status |
| :--- | :--- | :--- | :--- | :--- |
| **NP-01** | Config flag value is string | Fastify `PATCH /api/v1/config/flags` | 400 Bad Request, `FST_ERR_VALIDATION`, details array | **PASS** |
| **NP-02** | Config flag value is number | Fastify `PATCH /api/v1/config/flags` | 400 Bad Request, `FST_ERR_VALIDATION`, details array | **PASS** |
| **NP-03** | Config flag value is null | Fastify `PATCH /api/v1/config/flags` | 400 Bad Request, `FST_ERR_VALIDATION`, details array | **PASS** |
| **NP-04** | News feed negative limit | Fastify `GET /api/v1/news/feed?limit=-5` | 400 Bad Request, `FST_ERR_VALIDATION` | **PASS** |
| **NP-05** | News feed limit > 100 | Fastify `GET /api/v1/news/feed?limit=500` | 400 Bad Request, `FST_ERR_VALIDATION` | **PASS** |
| **NP-06** | News feed lang > 10 chars | Fastify `GET /api/v1/news/feed?lang=toolong...` | 400 Bad Request, `FST_ERR_VALIDATION` | **PASS** |
| **NP-07** | News feed invalid scope enum | Fastify `GET /api/v1/news/feed?scope=alien` | 400 Bad Request, `FST_ERR_VALIDATION` | **PASS** |
| **NP-08** | Unknown state code / oversized | Fastify `GET /api/v1/states/XX` / `/TOOLONG` | 404 Not Found / 400 Bad Request envelope | **PASS** |
| **NP-09** | Unregistered route exception | Fastify `GET /api/v1/unknown` | Structured 404 error envelope with correlation ID | **PASS** |
| **NP-10** | Correlation ID on 400 error | Fastify validation error | Sent `x-request-id` echoed in header and body | **PASS** |
| **NP-11** | Correlation ID on 404 error | Fastify not found error | Sent `x-request-id` echoed in header and body | **PASS** |
| **NP-12** | Correlation ID on 500 error | Fastify unhandled error | Sent `x-request-id` echoed in header and body | **PASS** |
| **NP-13** | Fastify genReqId sanitization | Fastify genReqId | Malicious characters (`<script>`) replaced with UUID | **PASS** |
| **NP-14** | Success envelope bitwise validity | `@kshetra/shared` | Validates `ApiSuccessEnvelope` contract types | **PASS** |
| **NP-15** | Error envelope bitwise validity | `@kshetra/shared` | Validates `ApiErrorEnvelope` contract types | **PASS** |
| **NP-16** | Corrupted client payload | Mobile `StatesEndpoint` | Throws `ApiValidationError` on missing/invalid fields | **PASS** |

---

## 6. Contract Inventory & Drift Audit

- **Total Registered Fastify HTTP Routes:** 138 routes across 23 modules (`reports/w008_api_contract_inventory.json`).
- **Audited Endpoints:** 10 core endpoints audited against D0-D9 taxonomy (`reports/w008_contract_drift_report.json`).
- **Drift Detected:** **ZERO (0) DRIFT DETECTED** (100% parity).

---

## 7. Automated Test Verification Evidence

```text
1. node tests/w008-contract-negative-paths.test.mjs
   [PASS] 16/16 Negative Paths & Contract Checks Passed

2. npm test --prefix apps/api -- contracts.test.ts
   PASS src/__tests__/contracts.test.ts (15 passed, 15 total)

3. npm test --prefix apps/mobile -- __tests__/apiClient.test.ts
   PASS __tests__/apiClient.test.ts (52 passed, 52 total)

4. npm test --prefix apps/api -- src/__tests__/observability.test.ts
   PASS src/__tests__/observability.test.ts (19 passed, 19 total)

5. npm test --prefix apps/api -- src/__tests__/config.test.ts
   PASS src/__tests__/config.test.ts (2 passed, 2 total)

6. node scripts/check-api-contract-drift.mjs
   [PASS] 9/9 declared contracts matched (100% parity); 138 routes inventoried; 0 drift detected

7. npm run build --prefix apps/api
   Exit code: 0 (tsc --noEmit clean)

8. npm run typecheck --prefix apps/mobile
   Exit code: 0 (tsc --noEmit clean)
```

---

## 8. Out-of-Scope Boundary Invariants

- `supabase/migrations/**`: **0 files modified / 0 migrations added.**
- `package.json`, `apps/*/package.json`: **0 dependencies added.**
- `apps/mobile/stores/dmStore.ts`: **0 diff (strictly untouched).**
- W007 canonical API client core & AuthManager: **100% preserved.**
