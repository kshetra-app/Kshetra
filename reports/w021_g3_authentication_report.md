# W021-G3: FASTIFY API-KEY AUTHENTICATION & ATOMIC DURABLE MONTHLY QUOTA SECURITY GATE REPORT

## 1. Executive Summary & Verification Coordinates

Pursuant to **CTO FINAL REMEDIATION DIRECTIVE — W021-G3: ATOMIC MONTHLY QUOTA ENFORCEMENT**, this report documents the complete architectural remediation eliminating TOCTOU concurrency races in monthly SaaS quota tracking. Quota decision and durable usage increment are unified into **ONE ATOMIC DATABASE OPERATION** governed by a tenant-level serialization boundary (`FOR UPDATE` on `public.saas_tenants`).

| Coordinate Field | Value |
|---|---|
| **Milestone / Gate** | `W021-G3` (API Key Authentication & Security Gate — Atomic Quota Remediation) |
| **Authority** | CTO FINAL REMEDIATION DIRECTIVE — W021-G3 |
| **Ratified Plan Reference** | `PLAN-W021-MASTER-REV-1.0.md` |
| **Accepted G2 Baseline** | `e4923b69c620bf335d27083c29245a3697bbf299` |
| **Remediation Execution Timestamp** | `2026-10-02T03:57:00.000Z` |
| **Target Staging Environment** | `panIN-staging` (`fkpigozcqnmcvofuksar` / `https://fkpigozcqnmcvofuksar.supabase.co`) |
| **Production Air-Gap Status** | **100% AIR-GAPPED & UNTOUCHED** (`ehfafcnimmjusyvplbah`) |
| **PostgreSQL Atomic Quota Suite** | **10 / 10 PASS (100.0%)** (`tests/saas-atomic-quota-pg.test.mjs`) |
| **Empirical 10-Request Concurrency Proof**| **PASS (Exactly 1 allowed, 9 rejected 429, usage = 10,000)** (`tests/saas-atomic-concurrency-proof.mjs`) |
| **Jest Durable Quota Battery** | **11 / 11 PASS (100.0%)** (`apps/api/src/__tests__/saas-durable-quota.test.ts`) |
| **G3 Core Auth Test Suite** | **17 / 17 PASS (100.0%)** (`apps/api/src/__tests__/saas-auth-g3.test.ts`) |
| **Full Platform Regression** | **226 / 226 PASS (100.0%)** (W018: 53, W019: 93, W020: 48, W021-G2: 32) |
| **Observability Regression** | **19 / 19 PASS (100.0%)** (`apps/api/src/__tests__/observability.test.ts`) |
| **API TypeScript Build** | `tsc --noEmit` **0 errors (Clean)** |
| **API Contract Drift Check** | `9 / 9 matched (100% parity)` |
| **W021-G4 Onward Status** | **STRICTLY NOT AUTHORIZED / GATED** |

---

## 2. Exact Atomic Quota Mechanism & Serialization Boundary

### 2.1 The TOCTOU Defect & Solution
Prior to this remediation, reading monthly usage and writing the increment occurred as separate database operations. Under concurrent requests across multiple Fastify instances, two requests could observe `usage = ceiling - 1`, both obtain permission, and both write increments, causing durable committed usage to exceed the ceiling.

### 2.2 Migration 058 & Stored Procedure `fn_check_and_increment_saas_quota`
File: [`supabase/migrations/058_w021_saas_atomic_quota_enforcement.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/migrations/058_w021_saas_atomic_quota_enforcement.sql)

```sql
CREATE OR REPLACE FUNCTION public.fn_check_and_increment_saas_quota(
  p_tenant_id UUID,
  p_api_key_id UUID,
  p_hour_bucket TIMESTAMPTZ,
  p_month_start TIMESTAMPTZ,
  p_monthly_ceiling INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id UUID;
  v_current_monthly_usage BIGINT;
  v_new_monthly_usage BIGINT;
BEGIN
  -- 1. Tenant-level serialization boundary via exclusive row lock on saas_tenants
  SELECT id INTO v_tenant_id
  FROM public.saas_tenants
  WHERE id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'TENANT_NOT_FOUND',
      'current_monthly_usage', 0
    );
  END IF;

  -- 2. Aggregate current monthly usage for the tenant across all hour_buckets in current UTC month
  SELECT COALESCE(SUM(request_count), 0) INTO v_current_monthly_usage
  FROM public.saas_usage_ledger
  WHERE tenant_id = p_tenant_id
    AND hour_bucket >= p_month_start;

  -- 3. Invariant check: IF U + 1 > C -> REJECT without increment
  IF (v_current_monthly_usage + 1) > p_monthly_ceiling THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'MONTHLY_CEILING_EXCEEDED',
      'current_monthly_usage', v_current_monthly_usage,
      'monthly_ceiling', p_monthly_ceiling,
      'monthly_remaining', 0
    );
  END IF;

  -- 4. Within quota: Upsert durable increment into saas_usage_ledger
  INSERT INTO public.saas_usage_ledger (
    tenant_id,
    api_key_id,
    hour_bucket,
    request_count,
    error_count
  )
  VALUES (
    p_tenant_id,
    p_api_key_id,
    p_hour_bucket,
    1,
    0
  )
  ON CONFLICT (tenant_id, api_key_id, hour_bucket)
  DO UPDATE SET
    request_count = public.saas_usage_ledger.request_count + 1;

  v_new_monthly_usage := v_current_monthly_usage + 1;

  RETURN jsonb_build_object(
    'allowed', true,
    'current_monthly_usage', v_new_monthly_usage,
    'monthly_ceiling', p_monthly_ceiling,
    'monthly_remaining', GREATEST(0, p_monthly_ceiling - v_new_monthly_usage)
  );
END;
$$;
```

### 2.3 Tenant-Level Serialization Guarantees
* **Row-Level Serialization Lock**: `SELECT id FROM public.saas_tenants WHERE id = p_tenant_id FOR UPDATE` serializes all transactions for tenant `T` at the tenant root.
* **Scope**: Because the serialization boundary locks the tenant row, **any number of different API keys belonging to the same tenant, hitting different Fastify instances, are serialized at the database kernel**.
* **Committed Invariant**: For every tenant $T$, $\text{monthly\_usage}(T) \le \text{monthly\_quota}(T)$ holds true across all observable committed states.
* **Zero Leakage**: If $U + 1 > C$, the function immediately returns `allowed = false` with `reason = 'MONTHLY_CEILING_EXCEEDED'`, completely bypassing Step 4 (zero usage increment).

---

## 3. Empirical Concurrency & Invariant Proof Output

### 3.1 10 Concurrent Requests Racing for Final Quota Slot
Test Script: [`tests/saas-atomic-concurrency-proof.mjs`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/tests/saas-atomic-concurrency-proof.mjs)

```text
=== ATOMIC CONCURRENCY PROOF: 10 CONCURRENT REQUESTS FOR 1 FINAL QUOTA SLOT ===
Tenant: df784823-64c3-490e-9f87-91b78833e19d
Initial usage seeded at 9,999. Monthly ceiling = 10,000. Exactly 1 slot remaining.
Results:
  Allowed requests: 1
  Rejected requests (429 RATE_LIMIT_EXCEEDED): 9
  Final Committed Usage in PostgreSQL: 10000
PROOF VERIFIED: EXACTLY 1 ALLOWED, 9 REJECTED, COMMITTED USAGE = 10,000 (INVARIANT HELD).
```

### 3.2 10-Point Tenant-Level PostgreSql Test Battery (10 / 10 PASS)
Test Suite: [`tests/saas-atomic-quota-pg.test.mjs`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/tests/saas-atomic-quota-pg.test.mjs)

```text
================================================================
W021-G3: AUTHORITATIVE POSTGRESQL ATOMIC QUOTA BATTERY
Target: Isolated PostgreSQL 17.6 (w021_g3_durable_quota)
Production: ehfafcnimmjusyvplbah (STRICTLY AIR-GAPPED & UNTOUCHED)
================================================================

[PASS] TEST-1: Two independent instances racing for the final quota slot
       Details: res1=true, res2=false, finalUsage=10000
[PASS] TEST-2: N concurrent requests racing for the final N-K slots (10 requests for 3 slots)
       Details: allowed=3, rejected=7, finalUsage=10000
[PASS] TEST-3: Different API keys belonging to SAME tenant race against tenant quota
       Details: k1=true, k2=false, finalUsage=10000
[PASS] TEST-4: Different API keys + different instances across shared tenant quota
       Details: allowed=5, rejected=1, finalUsage=5
[PASS] TEST-5: Quota exhaustion after atomic increment
       Details: first=true, second=false, reason=MONTHLY_CEILING_EXCEEDED
[PASS] TEST-6: Rejected quota requests do NOT increment usage (zero leakage)
       Details: expected=10, observed=10
[PASS] TEST-7: Tenant A cannot consume Tenant B quota (strict isolation)
       Details: usageA=5, usageB=0
[PASS] TEST-8: Database failure / missing entity fails closed safely
       Details: allowed=false, error=TENANT_NOT_FOUND
[PASS] TEST-9: Existing API-key deletion semantics intact (ON DELETE SET NULL preserves usage)
       Details: preserved=1, totalUsage=1
[PASS] TEST-10: Monthly window boundary remains correct in UTC (past months excluded)
       Details: usage=1, remaining=9999

================================================================
TOTAL ATOMIC POSTGRESQL CHECKS: 10
PASSED: 10
FAILED: 0
================================================================
```

---

## 4. Jest Test Suite Outputs

### 4.1 Jest Durable Quota Battery (11 / 11 PASS)
```text
PASS src/__tests__/saas-durable-quota.test.ts
  W021-G3 Remediation: Durable Monthly Quota Verification
    √ Scenario 1: Durable usage increment creates and increments records in saas_usage_ledger (9 ms)
    √ Scenario 2: Monthly aggregation sums across multiple hourly buckets in current UTC month (2 ms)
    √ Scenario 3: Quota boundary accurately checks and computes remaining requests (2 ms)
    √ Scenario 4: Quota exhaustion returns allowed=false, 0 remaining, and resetSeconds (1 ms)
    √ Scenario 5: Concurrent quota race handles collisions safely via unique constraint retry (2 ms)
    √ Scenario 6: Independent process / instance consistency derives state identically (1 ms)
    √ Scenario 7: Restart persistence survives complete in-memory clearing (1 ms)
    √ Scenario 8: Tenant isolation strictly segregates usage counts (1 ms)
    √ Scenario 9: Database failure behavior fails closed with 500 AUTH_DEPENDENCY_FAILURE in Fastify (322 ms)
    √ Scenario 10: API-Key deletion continuity (ON DELETE SET NULL) retains usage ledger rows (1 ms)
    √ Scenario 11: End-to-end Fastify HTTP 429 and Retry-After header upon quota exhaustion (7 ms)
```

### 4.2 Jest Core Authentication Battery (17 / 17 PASS)
```text
PASS src/__tests__/saas-auth-g3.test.ts
  W021-G3: SaaS API Key Authentication & Security Gate
    1. API Key Construction & Cryptographic Invariants
      √ generates API keys matching the ratified regex format and exact 57 chars (4 ms)
      √ constant-time comparison verifies matching hashes and rejects non-matching
    2. Authentication Success & Context Binding
      √ authenticates valid live API key via x-api-key header and binds context (36 ms)
      √ authenticates valid test API key via Authorization Bearer header (2 ms)
    3. Fail-Closed Authentication & Error Semantics
      √ rejects request with missing API key with generic 401 (1 ms)
      √ rejects malformed API key syntax (invalid prefix, truncated length) with generic 401 (4 ms)
      √ rejects unknown / non-existent key with generic 401 (zero existence leak) (1 ms)
      √ rejects revoked API key with generic 401 (zero status leak) (1 ms)
      √ rejects compromised API key with generic 401 (2 ms)
      √ rejects expired API key with generic 401 (1 ms)
      √ rejects key belonging to suspended/inactive tenant with generic 401 (1 ms)
    4. Tenant Isolation & Anti-Spoofing Enforcements
      √ detects and rejects cross-tenant isolation breach in key record (1 ms)
      √ strictly ignores caller-supplied tenant_id query/body/header overrides (1 ms)
    5. Rate Limiting & Quota Enforcement
      √ enforces burst rate limit when per-minute tokens are exhausted (returns 429) (50 ms)
    6. Dependency Failure Fail-Closed Resilience
      √ fails closed with 500 AUTH_DEPENDENCY_FAILURE when database lookup encounters an exception (3 ms)
    7. Secret Redaction & Logging Safety Proof
      √ extractRawApiKey extracts without logging or mutating request (1 ms)
      √ auth context contains only safe keyHint and keyPrefix (zero raw secret) (2 ms)
```

---

## 5. Full Platform Regression Summary

1. `tests/saas-atomic-quota-pg.test.mjs`: **10 / 10 PASS** (PostgreSQL atomic quota battery)
2. `tests/saas-atomic-concurrency-proof.mjs`: **PASS** (10-request concurrency race)
3. `apps/api/src/__tests__/saas-durable-quota.test.ts`: **11 / 11 PASS** (Jest durable quota battery)
4. `apps/api/src/__tests__/saas-auth-g3.test.ts`: **17 / 17 PASS** (G3 core auth suite)
5. `tests/political-entities-invariants.test.mjs`: **53 / 53 PASS** (W018)
6. `tests/election-normalization-invariants.test.mjs`: **93 / 93 PASS** (W019)
7. `tests/delimitation-migration-055-preflight.test.mjs`: **23 / 23 PASS** (W020)
8. `tests/delimitation-g8-integration.test.mjs`: **25 / 25 PASS** (W020)
9. `tests/saas-migration-056-preflight.test.mjs`: **32 / 32 PASS** (W021-G2)
10. `apps/api/src/__tests__/observability.test.ts`: **19 / 19 PASS** (Observability)
11. `scripts/check-api-contract-drift.mjs`: **9 / 9 matched (100% parity)**
12. `apps/api` TypeScript compilation: **Clean (0 errors)**

---

## 6. Prohibited Actions Compliance Verification

* W021-G4 routes (`/api/vsaas/v1/geo/...`, `/api/vsaas/v1/elections/...`): **NOT IMPLEMENTED**.
* SaaS business endpoints: **NOT IMPLEMENTED**.
* SaaS OpenAPI spec (`openapi-saas-v1.yaml`): **NOT CREATED**.
* OAuth2 / Webhooks / Razorpay billing: **NOT IMPLEMENTED**.
* Mobile code (`apps/mobile/**`): **UNTOUCHED / FROZEN**.
* Production database `ehfafcnimmjusyvplbah`: **100% AIR-GAPPED & UNTOUCHED**.
