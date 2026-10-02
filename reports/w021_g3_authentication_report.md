# W021-G3: FASTIFY API-KEY AUTHENTICATION & DURABLE MONTHLY QUOTA SECURITY GATE REPORT

## 1. Executive Summary & Verification Coordinates

Pursuant to **CTO AUTHORIZATION — W021-G3: API KEY AUTHENTICATION & SECURITY GATE** and **CTO REMEDIATION DIRECTIVE — W021-G3: MONTHLY QUOTA DURABILITY & MULTI-INSTANCE CORRECTNESS**, this report records the implementation, cryptographic enforcements, authoritative PostgreSQL durable monthly quota architecture, multi-instance correctness, tenant isolation, and test verification for the bounded Fastify SaaS API Key Authentication layer.

| Coordinate Field | Value |
|---|---|
| **Milestone / Gate** | `W021-G3` (API Key Authentication & Security Gate — Remediated) |
| **Authority** | CTO REMEDIATION DIRECTIVE — W021-G3 |
| **Ratified Plan Reference** | `PLAN-W021-MASTER-REV-1.0.md` |
| **Accepted G2 Baseline** | `e4923b69c620bf335d27083c29245a3697bbf299` |
| **Execution Timestamp** | `2026-10-02T03:36:00.000Z` |
| **Target Staging Environment** | `panIN-staging` (`fkpigozcqnmcvofuksar` / `https://fkpigozcqnmcvofuksar.supabase.co`) |
| **Production Air-Gap Status** | **100% AIR-GAPPED & UNTOUCHED** (`ehfafcnimmjusyvplbah`) |
| **G3 Core Auth Test Suite** | **17 / 17 PASS (100.0%)** (`apps/api/src/__tests__/saas-auth-g3.test.ts`) |
| **G3 Durable Quota Test Suite** | **11 / 11 PASS (100.0%)** (`apps/api/src/__tests__/saas-durable-quota.test.ts`) |
| **Full Platform Regression** | **226 / 226 PASS (100.0%)** (W018: 53, W019: 93, W020: 48, W021-G2: 32) |
| **Observability Regression** | **19 / 19 PASS (100.0%)** (`apps/api/src/__tests__/observability.test.ts`) |
| **API TypeScript Build** | `tsc --noEmit` **0 errors (Clean)** |
| **API Contract Drift Check** | `9 / 9 matched (100% parity)` |
| **W021-G4 Onward Status** | **STRICTLY NOT AUTHORIZED / GATED** |

---

## 2. Architecture & Implementation Modules

### 2.1 Cryptographic Key Module (`apps/api/src/lib/saasCrypto.ts`)
* **Entropy Guarantee**: 256 bits of cryptographic entropy generated via `crypto.randomBytes(32)`.
* **Encoding**: RFC 4648 Base64URL Unpadded (43 characters).
* **Displayed Secret Anatomy**:
  - Live Key: `panin_live_sk_{secret43}` (57 characters total).
  - Test Key: `panin_test_sk_{secret43}` (57 characters total).
  - Key Hint: First 8 characters of the secret (e.g., `secret43.substring(0, 8)`).
* **Storage Hashing**: Raw key is passed through SHA-256 (`crypto.createHash('sha256').update(rawKey).digest('hex')`) producing a 64-character hexadecimal digest.
* **Timing-Safe Comparison**: `crypto.timingSafeEqual` verifies stored hash against incoming hash in constant time, eliminating timing analysis attack vectors.

### 2.2 Dual-Mechanism Rate & Quota Controller (`apps/api/src/lib/saasRateLimiter.ts`)
Per the CTO remediation directive, the rate limiting system is divided into two decoupled layers:
1. **Synchronous Local Burst Layer (In-Memory Token Bucket)**:
   - Clamps microbursts with sub-millisecond local overhead:
     - `free`: 60 requests/minute.
     - `pro`: 600 requests/minute.
     - `enterprise`: 3,000 requests/minute.
   - Emits standard burst rate limit headers (`x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`).
   - Returns HTTP 429 `RATE_LIMIT_EXCEEDED` if local minute burst is breached.
2. **Authoritative Durable Monthly Quota Layer (PostgreSQL `public.saas_usage_ledger`)**:
   - Monthly quotas are **never stored as ephemeral in-memory state**.
   - Derived directly from `public.saas_usage_ledger` across all instances and process restarts:
     - `free`: 10,000 / month.
     - `pro`: 500,000 / month.
     - `enterprise`: 10,000,000 / month.
   - Usage queries aggregate `sum(request_count)` where `tenant_id = :tenant_id` and `hour_bucket >= start of current UTC month`.
   - Increments are recorded into `(tenant_id, api_key_id, hour_bucket)`. Unique constraint collision (`23505`) is gracefully caught and re-evaluated, guaranteeing concurrency safety.
   - Quota exhaustion triggers HTTP 429 `RATE_LIMIT_EXCEEDED`, `x-monthly-quota-limit`, `x-monthly-quota-remaining: 0`, and `Retry-After: <seconds_until_month_reset>`.

### 2.3 Fastify Authentication Plugin (`apps/api/src/lib/saasAuthPlugin.ts`)
* Fastify `preHandler` hook scoping exclusively to the `/api/vsaas/` route namespace.
* Authenticates requests via `x-api-key` header or `Authorization: Bearer <key>`.
* Injects request context `request.saasAuth`:
  - `tenantId`
  - `tenantSlug`
  - `tenantTier`
  - `applicationId`
  - `apiKeyId`
  - `keyPrefix`
  - `keyHint`
  - `environment`
  - `scopes`
  - `rateLimits`
* Enforces fail-closed lifecycle:
  - Rejects missing keys (401 generic).
  - Rejects malformed keys (401 generic).
  - Rejects unknown hashes (401 generic).
  - Rejects revoked keys (401 generic).
  - Rejects compromised keys (401 generic).
  - Rejects expired keys (401 generic).
  - Rejects suspended tenants (401 generic).
  - Rejects cross-tenant mismatches in key records (401 generic).
  - Fails closed on database exceptions (500 `AUTH_DEPENDENCY_FAILURE`).
* Anti-spoofing: Caller-provided `tenant_id` parameters in headers or query strings are ignored; authorized context is derived solely from the validated API key record.
* Secret redaction: Raw secret is never logged, never persisted, and never bound to the request object.

---

## 3. Dedicated Durable Monthly Quota Test Battery (11 / 11 PASS)

```text
PASS src/__tests__/saas-durable-quota.test.ts
  W021-G3 Remediation: Durable Monthly Quota Verification
    √ Scenario 1: Durable usage increment creates and increments records in saas_usage_ledger
    √ Scenario 2: Monthly aggregation sums across multiple hourly buckets in current UTC month
    √ Scenario 3: Quota boundary accurately checks and computes remaining requests
    √ Scenario 4: Quota exhaustion returns allowed=false, 0 remaining, and resetSeconds
    √ Scenario 5: Concurrent quota race handles collisions safely via unique constraint retry
    √ Scenario 6: Independent process / instance consistency derives state identically
    √ Scenario 7: Restart persistence survives complete in-memory clearing
    √ Scenario 8: Tenant isolation strictly segregates usage counts
    √ Scenario 9: Database failure behavior fails closed with 500 AUTH_DEPENDENCY_FAILURE in Fastify
    √ Scenario 10: API-Key deletion continuity (ON DELETE SET NULL) retains usage ledger rows
    √ Scenario 11: End-to-end Fastify HTTP 429 and Retry-After header upon quota exhaustion
```

---

## 4. G3 Core Authentication Test Battery (17 / 17 PASS)

```text
PASS src/__tests__/saas-auth-g3.test.ts
  W021-G3: SaaS API Key Authentication & Security Gate
    1. API Key Construction & Cryptographic Invariants
      √ generates API keys matching the ratified regex format and exact 57 chars
      √ constant-time comparison verifies matching hashes and rejects non-matching
    2. Authentication Success & Context Binding
      √ authenticates valid live API key via x-api-key header and binds context
      √ authenticates valid test API key via Authorization Bearer header
    3. Fail-Closed Authentication & Error Semantics
      √ rejects request with missing API key with generic 401
      √ rejects malformed API key syntax (invalid prefix, truncated length) with generic 401
      √ rejects unknown / non-existent key with generic 401 (zero existence leak)
      √ rejects revoked API key with generic 401 (zero status leak)
      √ rejects compromised API key with generic 401
      √ rejects expired API key with generic 401
      √ rejects key belonging to suspended/inactive tenant with generic 401
    4. Tenant Isolation & Anti-Spoofing Enforcements
      √ detects and rejects cross-tenant isolation breach in key record
      √ strictly ignores caller-supplied tenant_id query/body/header overrides
    5. Rate Limiting & Quota Enforcement
      √ enforces burst rate limit when per-minute tokens are exhausted (returns 429)
    6. Dependency Failure Fail-Closed Resilience
      √ fails closed with 500 AUTH_DEPENDENCY_FAILURE when database lookup encounters an exception
    7. Secret Redaction & Logging Safety Proof
      √ extractRawApiKey extracts without logging or mutating request
      √ auth context contains only safe keyHint and keyPrefix (zero raw secret)
```

---

## 5. Full Platform Regression Summary

1. `apps/api/src/__tests__/saas-durable-quota.test.ts`: **11 / 11 PASS** (Durable quota battery)
2. `apps/api/src/__tests__/saas-auth-g3.test.ts`: **17 / 17 PASS** (G3 core auth suite)
3. `tests/political-entities-invariants.test.mjs`: **53 / 53 PASS** (W018)
4. `tests/election-normalization-invariants.test.mjs`: **93 / 93 PASS** (W019)
5. `tests/delimitation-migration-055-preflight.test.mjs`: **23 / 23 PASS** (W020)
6. `tests/delimitation-g8-integration.test.mjs`: **25 / 25 PASS** (W020)
7. `tests/saas-migration-056-preflight.test.mjs`: **32 / 32 PASS** (W021-G2)
8. `apps/api/src/__tests__/observability.test.ts`: **19 / 19 PASS** (Observability)
9. `scripts/check-api-contract-drift.mjs`: **9 / 9 matched (100% parity)**
10. `apps/api` TypeScript compilation: **Clean (0 errors)**

---

## 6. Prohibited Actions Compliance Verification

* W021-G4 routes (`/api/vsaas/v1/geo/...`, `/api/vsaas/v1/elections/...`, etc.): **NOT IMPLEMENTED**.
* SaaS business endpoints: **NOT IMPLEMENTED**.
* SaaS OpenAPI spec (`openapi-saas-v1.yaml`): **NOT CREATED**.
* OAuth2 / Webhooks / Razorpay billing: **NOT IMPLEMENTED**.
* Mobile code (`apps/mobile/**`): **UNTOUCHED / FROZEN**.
* Production database `ehfafcnimmjusyvplbah`: **100% AIR-GAPPED & UNTOUCHED**.
