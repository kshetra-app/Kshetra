# W021-G3: FASTIFY API-KEY AUTHENTICATION, ATOMIC DURABLE MONTHLY QUOTA & SECURITY DEFINER PRIVILEGE BOUNDARY REPORT

## 1. Executive Summary & Verification Coordinates

Pursuant to **CTO FINAL SECURITY REMEDIATION — W021-G3: SECURITY DEFINER RPC PRIVILEGE BOUNDARY**, this report documents the complete architectural and security remediation of `public.fn_check_and_increment_saas_quota` under Migration 058:
1. **Privilege Boundary**: `EXECUTE` revoked from `PUBLIC`, `anon`, and `authenticated`. Granted strictly to `service_role`. Direct RPC invocation by unauthorized roles verified rejected fail-closed with PostgreSQL error `42501` (`insufficient_privilege`).
2. **Authoritative Tier Ceiling Derivation**: Derivation of the monthly quota ceiling (`free: 10,000`, `pro: 500,000`, `enterprise: 10,000,000`) is internal to the database function via `saas_tenants.tier`. Zero reliance on caller-supplied parameters.
3. **Parameter Defense-in-Depth**: If `p_api_key_id` is supplied, SQL asserts `saas_api_keys.tenant_id = p_tenant_id`. Any cross-tenant key mismatch fails closed with `KEY_TENANT_MISMATCH`.
4. **Search Path Hardening**: Function fixed to `search_path = public, pg_temp` with explicit schema qualification on all relations (`public.saas_tenants`, `public.saas_usage_ledger`, `public.saas_api_keys`). Zero dynamic SQL.
5. **Serialization Boundary**: Tenant-level exclusive row lock via `SELECT id, tier FROM public.saas_tenants WHERE id = p_tenant_id FOR UPDATE` guarantees `monthly_usage(T) <= monthly_quota(T)` at all observable committed states.

| Coordinate Field | Value |
|---|---|
| **Milestone / Gate** | `W021-G3` (API Key Authentication & Security Gate — Security Definer Remediation) |
| **Authority** | CTO FINAL SECURITY REMEDIATION — W021-G3 |
| **Ratified Plan Reference** | `PLAN-W021-MASTER-REV-1.0.md` |
| **Accepted G2 Baseline** | `e4923b69c620bf335d27083c29245a3697bbf299` |
| **Remediation Execution Timestamp** | `2026-10-02T04:20:00.000Z` |
| **Target Staging Environment** | `panIN-staging` (`fkpigozcqnmcvofuksar` / `https://fkpigozcqnmcvofuksar.supabase.co`) |
| **Production Air-Gap Status** | **100% AIR-GAPPED & UNTOUCHED** (`ehfafcnimmjusyvplbah`) |
| **PostgreSQL Atomic Quota Suite** | **14 / 14 PASS (100.0%)** (`tests/saas-atomic-quota-pg.test.mjs`) |
| **Empirical 10-Request Concurrency Proof**| **PASS (Exactly 1 allowed, 9 rejected 429, usage = 10,000)** (`tests/saas-atomic-concurrency-proof.mjs`) |
| **Jest Durable Quota Battery** | **11 / 11 PASS (100.0%)** (`apps/api/src/__tests__/saas-durable-quota.test.ts`) |
| **G3 Core Auth Test Suite** | **17 / 17 PASS (100.0%)** (`apps/api/src/__tests__/saas-auth-g3.test.ts`) |
| **Full Platform Regression** | **226 / 226 PASS (100.0%)** (W018: 53, W019: 93, W020: 48, W021-G2: 32) |
| **Observability Regression** | **19 / 19 PASS (100.0%)** (`apps/api/src/__tests__/observability.test.ts`) |
| **API TypeScript Build** | `tsc --noEmit` **0 errors (Clean)** |
| **API Contract Drift Check** | `9 / 9 matched (100% parity)` |
| **W021-G4 Onward Status** | **STRICTLY NOT AUTHORIZED / GATED** |

---

## 2. PostgreSQL Security Definer & Privilege State Evidence

### 2.1 Function Catalog ACL (`pg_proc`)
```sql
SELECT proname, proowner::regrole, prosecdef, proacl 
FROM pg_proc 
WHERE proname = 'fn_check_and_increment_saas_quota';
```
**Catalog Output:**
```
              proname              | proowner | prosecdef |                    proacl                     
-----------------------------------+----------+-----------+-----------------------------------------------
 fn_check_and_increment_saas_quota | postgres | t         | {postgres=X/postgres,service_role=X/postgres}
```

### 2.2 Routine Privileges (`information_schema.routine_privileges`)
```sql
SELECT routine_name, grantee, privilege_type, is_grantable 
FROM information_schema.routine_privileges 
WHERE routine_schema = 'public' AND routine_name = 'fn_check_and_increment_saas_quota';
```
**Information Schema Output:**
```
           routine_name            |   grantee    | privilege_type | is_grantable 
-----------------------------------+--------------+----------------+--------------
 fn_check_and_increment_saas_quota | postgres     | EXECUTE        | YES
 fn_check_and_increment_saas_quota | service_role | EXECUTE        | NO
```
*Note: Neither `PUBLIC`, `anon`, nor `authenticated` possess `EXECUTE` privileges.*

### 2.3 Direct RPC Security Probes (`anon` & `authenticated` Denials)
- **Role `anon` Execution**:
  ```sql
  DO $$ BEGIN
    SET ROLE anon;
    PERFORM public.fn_check_and_increment_saas_quota('00000000-0000-0000-0000-000000000000'::uuid, NULL, now(), now());
  END $$;
  ```
  Result: **Blocked fail-closed** with SQLSTATE `42501` (`insufficient_privilege`). Test 11 `PASS`.
- **Role `authenticated` Execution**:
  ```sql
  DO $$ BEGIN
    SET ROLE authenticated;
    PERFORM public.fn_check_and_increment_saas_quota('00000000-0000-0000-0000-000000000000'::uuid, NULL, now(), now());
  END $$;
  ```
  Result: **Blocked fail-closed** with SQLSTATE `42501` (`insufficient_privilege`). Test 12 `PASS`.

---

## 3. Migration 058 Hardened Definition

File: [`supabase/migrations/058_w021_saas_atomic_quota_enforcement.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/migrations/058_w021_saas_atomic_quota_enforcement.sql)

```sql
BEGIN;

DROP FUNCTION IF EXISTS public.fn_check_and_increment_saas_quota(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER);

CREATE OR REPLACE FUNCTION public.fn_check_and_increment_saas_quota(
  p_tenant_id UUID,
  p_api_key_id UUID,
  p_hour_bucket TIMESTAMPTZ,
  p_month_start TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id UUID;
  v_tenant_tier TEXT;
  v_monthly_ceiling INTEGER;
  v_current_monthly_usage BIGINT;
  v_new_monthly_usage BIGINT;
BEGIN
  -- 1. Tenant-level serialization boundary via exclusive row lock on saas_tenants
  SELECT id, tier INTO v_tenant_id, v_tenant_tier
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

  -- 2. Validate p_api_key_id ownership if provided (defense-in-depth against key/tenant mismatch)
  IF p_api_key_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.saas_api_keys
      WHERE id = p_api_key_id AND tenant_id = p_tenant_id
    ) THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'error', 'KEY_TENANT_MISMATCH',
        'current_monthly_usage', 0
      );
    END IF;
  END IF;

  -- 3. Derive authoritative monthly ceiling internally from persisted tenant tier
  v_monthly_ceiling := CASE v_tenant_tier
    WHEN 'free' THEN 10000
    WHEN 'pro' THEN 500000
    WHEN 'enterprise' THEN 10000000
    ELSE 10000
  END;

  -- 4. Aggregate current monthly usage for the tenant across all hour_buckets in current UTC month
  SELECT COALESCE(SUM(request_count), 0) INTO v_current_monthly_usage
  FROM public.saas_usage_ledger
  WHERE tenant_id = p_tenant_id
    AND hour_bucket >= p_month_start;

  -- 5. Invariant check: IF U + 1 > C -> REJECT without increment
  IF (v_current_monthly_usage + 1) > v_monthly_ceiling THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'MONTHLY_CEILING_EXCEEDED',
      'current_monthly_usage', v_current_monthly_usage,
      'monthly_ceiling', v_monthly_ceiling,
      'monthly_remaining', 0
    );
  END IF;

  -- 6. Within quota: Upsert durable increment into saas_usage_ledger
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
    'monthly_ceiling', v_monthly_ceiling,
    'monthly_remaining', GREATEST(0, v_monthly_ceiling - v_new_monthly_usage)
  );
END;
$$;

-- Restrict execution to service_role (defense-in-depth privilege boundary)
REVOKE ALL ON FUNCTION public.fn_check_and_increment_saas_quota(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_check_and_increment_saas_quota(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

COMMIT;
```

---

## 4. Empirical 14-Point Atomic & Security Test Matrix

Test Script: [`tests/saas-atomic-quota-pg.test.mjs`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/tests/saas-atomic-quota-pg.test.mjs)

| Check ID | Verification Description | Observed Behavior | Verdict |
|---|---|---|---|
| `TEST-1` | Two independent instances racing for final slot | `res1=true`, `res2=false`, committed usage = `10000` | **PASS** |
| `TEST-2` | 10 concurrent requests racing for final 3 slots | Exactly 3 allowed, 7 rejected, committed usage = `10000` | **PASS** |
| `TEST-3` | Different API keys for same tenant race on shared quota | `k1=true`, `k2=false`, committed usage = `10000` | **PASS** |
| `TEST-4` | Different API keys + multiple instances across tenant quota | Exactly 5 allowed, 1 rejected, committed usage = `10000` | **PASS** |
| `TEST-5` | Quota exhaustion rejection | First allowed, second rejected with `MONTHLY_CEILING_EXCEEDED` | **PASS** |
| `TEST-6` | Zero usage leakage on rejected requests | 5 rejected calls leave usage unchanged at `10000` | **PASS** |
| `TEST-7` | Strict tenant isolation | Tenant A (5 reqs) does not affect Tenant B (0 reqs) | **PASS** |
| `TEST-8` | Missing tenant fails closed safely | Returns `allowed: false`, error: `TENANT_NOT_FOUND` | **PASS** |
| `TEST-9` | API key deletion continuity (`ON DELETE SET NULL`) | Key deleted; usage row preserved with `api_key_id = NULL` | **PASS** |
| `TEST-10` | UTC monthly window isolation | Usage from 40 days prior excluded from current month | **PASS** |
| `TEST-11` | Direct RPC security probe: role `anon` execution | Denied with SQLSTATE `42501` `insufficient_privilege` | **PASS** |
| `TEST-12` | Direct RPC security probe: role `authenticated` execution | Denied with SQLSTATE `42501` `insufficient_privilege` | **PASS** |
| `TEST-13` | Defense-in-depth: cross-tenant key mismatch | Rejected with error: `KEY_TENANT_MISMATCH` | **PASS** |
| `TEST-14` | Internal tier ceiling derivation from `saas_tenants.tier` | Pro tenant derived ceiling `500000` with 0 caller input | **PASS** |

---

## 5. Fastify Layer Integration & Durable Quota Tests

1. **Fastify Rate Limiter (`apps/api/src/lib/saasRateLimiter.ts`)**:
   - Invokes `fn_check_and_increment_saas_quota` passing only `p_tenant_id`, `p_api_key_id`, `p_hour_bucket`, `p_month_start`.
   - Relies on internal tier ceiling and returned `current_monthly_usage` / `monthly_ceiling`.
2. **Jest Test Battery (`apps/api/src/__tests__/saas-durable-quota.test.ts`)**:
   - 11/11 tests pass with 100% assertions green.
3. **Jest Core Auth Battery (`apps/api/src/__tests__/saas-auth-g3.test.ts`)**:
   - 17/17 tests pass with 100% assertions green.

---

## 6. Prohibited Scope Compliance Confirmation

| Prohibited Action | Status | Confirmation |
|---|---|---|
| W021-G4 Routes | **ZERO ADDED** | No SaaS routes implemented |
| OpenAPI Specification | **ZERO ADDED** | No OpenAPI docs created |
| Live Billing / Razorpay | **ZERO ADDED** | No billing modifications |
| OAuth2 / Webhooks | **ZERO ADDED** | No external auth or webhooks |
| Mobile Changes | **ZERO MODIFIED** | `apps/mobile` remains clean and frozen |
| Production Access | **100% AIR-GAPPED** | `ehfafcnimmjusyvplbah` untouched |

---

## 7. Submission & Gate Status

**W021-G3 IS COMPLETE AND SUBMITTED FOR CTO ACCEPTANCE.**
**W021-G4 REMAINS STRICTLY NOT AUTHORIZED / GATED.**
