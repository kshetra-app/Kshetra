# W009-B5-R4: Durable Pages Pro Payment Persistence Evidence Report

**AUTHORITY:** CTO Security Remediation & Architecture Gate  
**JOB:** W009-B5 — Verification / Provider Readiness / Staging  
**STATUS:** `W009-B5: PRE-FLIGHT / REMEDIATION (NOT ACCEPTED)`  
**DATABASE MIGRATION:** `037_page_pro_orders.sql` (Authorized & Verified Idempotent)  
**STAGING MUTATION:** NOT AUTHORIZED (Zero live staging mutations)  
**PRODUCTION MUTATION:** STRICTLY PROHIBITED  
**REAL RAZORPAY CALLS:** ZERO (Sandbox/HMAC validation only; non-settling)  
**REAL TELECOM DISPATCH:** ZERO (Statutory TRAI mock provider only)  

---

## 1. EXECUTIVE SUMMARY

Under the directive of **W009-B5-R4 (Durable Pages Pro Payment Persistence)**, the previous memory-only payment registration mechanism (`PRO_ORDER_REGISTRY`) has been replaced with durable, transactionally authoritative PostgreSQL persistence.

Prior to this remediation, an application restart, rolling deployment, or cross-instance routing between order creation and payment verification resulted in the loss of in-memory bindings (`orderId` $\leftrightarrow$ `pageId` $\leftrightarrow$ `userId`), forcing verification to fall back to HMAC-only signature validation.

This gap has been completely remediated:
1. **Durable Schema:** Migration `037_page_pro_orders.sql` creates the authoritative `page_pro_orders` table with full relational foreign keys to `pages(id)` and `auth.users(id)`, billing cycle constraints, amount validation, and partial unique indexing on `provider_payment_id`.
2. **Atomic Entitlement Activation:** The `SECURITY DEFINER` function `verify_and_activate_page_pro` executes under row-level lock (`FOR UPDATE`), verifying page association, principal authorization, billing cycle alignment, and replay protection within a single ACID transaction.
3. **Application Wire-Up:** Fastify route handlers `/order` and `/verify` in `apps/api/src/routes/pages.ts` enforce server-authoritative pricing, fail closed on unconfigured database infrastructure (503), fail closed on database mutation errors (500), and query durable order records.
4. **Isolated Runtime Verification:** A dedicated, isolated PostgreSQL 16 container (`w009-b5-postgres` with PostGIS) and PostgREST instance (`w009-b5-postgrest`) were provisioned. All 39 migrations were executed, Migration 037 was tested for idempotency (executed twice without error), and all 11 persistence and negative security test scenarios achieved **100% PASS** (11/11).

---

## 2. AUTHORITATIVE BASELINE & PROVENANCE

* **Working Directory:** `c:\Users\Laven\OneDrive\Desktop\Kshetra`
* **Active Branch:** `master`
* **Baseline Commit SHA:** `9f05e84f585a76496f5e47a7b65afefd4c7bcbeb`
* **Previous Security Commits:**
  * `9f05e84`: `fix(pages): isolate test auth below http boundary and enforce payment association (W009-B5-R2)`
  * `7119f30`: `fix(pages): remediate pro payment signature bypass and add authentication (DEF-B5-PAY-01, DEF-B5-PAY-02)`
  * `5784956`: `docs(w009-b4): reconcile bill opinion and rti upvote persistence targets in strangler reports`
* **New Migration File:** `supabase/migrations/037_page_pro_orders.sql`
* **Modified Route Target:** `apps/api/src/routes/pages.ts`
* **Verification Suites:**
  * Isolated Database Runner: `tests/verify_w009_b5_durable_payment.mjs`
  * Providers Test Suite: `apps/api/src/__tests__/providers.test.ts` (33/33 passing)
  * Tickets 0.4–0.5 Suite: `apps/api/src/__tests__/tickets-04-05.test.ts` (7/7 passing)
  * Civic Mutations Suite: `apps/api/src/__tests__/civic-mutations.test.ts` (22/22 passing)
* **TypeScript Compilation:** 0 errors (`npx tsc --noEmit`)

---

## 3. ROOT CAUSE ANALYSIS: IN-MEMORY ORDER REGISTRY GAP

In W009-B5 Round 2, payment orders were tracked in an in-memory `Map<string, ProOrderRecord>` (`PRO_ORDER_REGISTRY`). 

### Vulnerabilities of In-Memory State:
1. **Cold Process Restarts:** Any container restart, crash, or rolling deployment destroyed the in-memory map.
2. **Horizontal Scaling:** When order creation and subsequent payment verification hit different container replicas or serverless workers, the verification instance lacked the memory record.
3. **Fallback Vulnerability:** If `PRO_ORDER_REGISTRY.get(orderId)` returned undefined, the handler could only verify cryptographic HMAC, allowing a valid payment on Page A to potentially be submitted for Page B if association guards were missing.

### Remediated Architecture:
* In-memory `PRO_ORDER_REGISTRY` is demoted to a non-authoritative fallback for headless unit tests where database infrastructure is not running.
* When authoritative database infrastructure is active (`isSupabaseConfigured === true`), the PostgreSQL database is the single, durable source of truth.

---

## 4. ARCHITECTURAL DESIGN & DATABASE PERSISTENCE SCHEMA

### Entity Relationship Model
```text
                      +-------------------+
                      |    auth.users     |
                      +-------------------+
                                ^
                                | (user_id)
                                |
                      +-------------------+
                      |  page_pro_orders  |
                      +-------------------+
                                |
                                | (page_id)
                                v
                      +-------------------+
                      |       pages       |
                      +-------------------+
```

### Table: `page_pro_orders`
* `id` (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`): Unique internal identifier.
* `provider_order_id` (`TEXT NOT NULL UNIQUE`): Razorpay order ID (e.g. `order_1789819027453_18kv8`).
* `page_id` (`UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE`): Target page receiving Pro entitlement.
* `user_id` (`UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`): Authenticated user who created the order.
* `product` (`TEXT NOT NULL DEFAULT 'pages_pro' CHECK (product = 'pages_pro')`): Product identifier constraint.
* `billing_cycle` (`TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual'))`): Plan frequency.
* `amount_paise` (`INTEGER NOT NULL CHECK (amount_paise IN (49900, 499900))`): Strict server-authoritative amount check (₹499 or ₹4,999 in paise).
* `currency` (`TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR')`): Currency constraint.
* `status` (`TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'completed', 'failed', 'cancelled'))`): Order lifecycle status.
* `provider_payment_id` (`TEXT`): Payment identifier recorded upon verified completion.
* `signature_verified` (`BOOLEAN NOT NULL DEFAULT false`): Cryptographic proof flag.
* `created_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`): Creation timestamp.
* `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`): Last modified timestamp.
* `completed_at` (`TIMESTAMPTZ`): Timestamp when payment verified and entitlement activated.

### Indexes
* `idx_page_pro_orders_provider_order` ON `(provider_order_id)`
* `idx_page_pro_orders_page` ON `(page_id)`
* `idx_page_pro_orders_user` ON `(user_id)`
* Partial unique index `idx_page_pro_orders_payment_id` ON `(provider_payment_id) WHERE provider_payment_id IS NOT NULL`: Prevents the same payment ID from ever being used across multiple orders.

---

## 5. MIGRATION SPECIFICATION: `037_page_pro_orders.sql`

Full migration DDL located at `supabase/migrations/037_page_pro_orders.sql`:

```sql
-- ============================================================
-- Migration 037: Durable Pages Pro Payment Orders & Verification
-- Replaces in-memory order registry with durable PostgreSQL table
-- and provides atomic verify_and_activate_page_pro RPC.
-- ============================================================

CREATE TABLE IF NOT EXISTS page_pro_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_order_id TEXT NOT NULL UNIQUE,
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product TEXT NOT NULL DEFAULT 'pages_pro' CHECK (product = 'pages_pro'),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  amount_paise INTEGER NOT NULL CHECK (amount_paise IN (49900, 499900)),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'completed', 'failed', 'cancelled')),
  provider_payment_id TEXT,
  signature_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_page_pro_orders_provider_order ON page_pro_orders(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_page_pro_orders_page ON page_pro_orders(page_id);
CREATE INDEX IF NOT EXISTS idx_page_pro_orders_user ON page_pro_orders(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_page_pro_orders_payment_id
  ON page_pro_orders(provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE page_pro_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users and page owners read own pro orders" ON page_pro_orders;
CREATE POLICY "Users and page owners read own pro orders" ON page_pro_orders
  FOR SELECT USING (
    user_id = auth.uid()
    OR page_id IN (SELECT id FROM pages WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Atomic verification and entitlement activation RPC
CREATE OR REPLACE FUNCTION verify_and_activate_page_pro(
  p_provider_order_id TEXT,
  p_page_id UUID,
  p_user_id UUID,
  p_provider_payment_id TEXT,
  p_billing_cycle TEXT DEFAULT NULL,
  p_is_admin BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_expiry TIMESTAMPTZ;
BEGIN
  -- 1. Lock and retrieve the order row
  SELECT * INTO v_order
  FROM page_pro_orders
  WHERE provider_order_id = p_provider_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'ORDER_NOT_FOUND',
      'message', 'Page Pro order not found'
    );
  END IF;

  -- 2. Verify page association
  IF v_order.page_id <> p_page_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'PAGE_ORDER_MISMATCH',
      'message', 'Payment order was not created for this page'
    );
  END IF;

  -- 3. Verify user association (unless admin)
  IF v_order.user_id <> p_user_id AND NOT p_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'ORDER_PRINCIPAL_MISMATCH',
      'message', 'Payment order was created by a different user'
    );
  END IF;

  -- 4. Verify billing cycle consistency
  IF p_billing_cycle IS NOT NULL AND v_order.billing_cycle <> p_billing_cycle THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'BILLING_CYCLE_MISMATCH',
      'message', 'Billing cycle does not match the created order'
    );
  END IF;

  -- 5. Idempotency / replay check
  IF v_order.status = 'completed' THEN
    IF v_order.provider_payment_id = p_provider_payment_id THEN
      SELECT pro_expires_at INTO v_expiry FROM pages WHERE id = v_order.page_id;
      RETURN jsonb_build_object(
        'success', true,
        'idempotent', true,
        'code', 'ENTITLEMENT_ALREADY_ACTIVE',
        'message', 'Payment already verified and Pro entitlement activated previously. Idempotent replay acknowledged.',
        'pageId', v_order.page_id,
        'expiresAt', v_expiry
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'code', 'ORDER_ALREADY_CONSUMED',
        'message', 'Payment order has already been verified with a different payment'
      );
    END IF;
  END IF;

  -- 6. Calculate expiry
  IF v_order.billing_cycle = 'annual' THEN
    v_expiry := v_now + INTERVAL '365 days';
  ELSE
    v_expiry := v_now + INTERVAL '30 days';
  END IF;

  -- 7. Atomically mark order as completed
  UPDATE page_pro_orders
  SET status = 'completed',
      provider_payment_id = p_provider_payment_id,
      signature_verified = true,
      completed_at = v_now,
      updated_at = v_now
  WHERE id = v_order.id;

  -- 8. Atomically update pages table
  UPDATE pages
  SET is_pro = true,
      pro_subscription_id = p_provider_payment_id,
      pro_expires_at = v_expiry,
      updated_at = v_now
  WHERE id = v_order.page_id;

  RETURN jsonb_build_object(
    'success', true,
    'idempotent', false,
    'code', 'ENTITLEMENT_ACTIVATED',
    'message', 'Page Pro subscription successfully activated',
    'pageId', v_order.page_id,
    'expiresAt', v_expiry
  );
END;
$$;

-- Revoke execution from public/anon/authenticated; restrict to service role
REVOKE ALL ON FUNCTION verify_and_activate_page_pro FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_and_activate_page_pro TO service_role;
```

---

## 6. ROW LEVEL SECURITY (RLS) MODEL

1. **Table RLS:** `ALTER TABLE page_pro_orders ENABLE ROW LEVEL SECURITY;` is strictly enabled.
2. **SELECT Policy:** `"Users and page owners read own pro orders"` permits queries only if:
   * `user_id = auth.uid()`
   * `page_id IN (SELECT id FROM pages WHERE owner_id = auth.uid())`
   * User is system admin (`EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')`).
3. **INSERT/UPDATE/DELETE Restrictions:** No insert/update/delete policies are granted to `anon` or `authenticated`. Direct client mutations fail closed with `permission denied for table page_pro_orders`. All authoritative writes occur through backend `service_role` (which possesses `BYPASSRLS`) or through the security-definer RPC function.

---

## 7. SECURITY DEFINER RPC SPECIFICATION

The function `verify_and_activate_page_pro` guarantees atomicity across the order record and page entitlement:
1. **Row Locking:** Acquires exclusive row lock `SELECT * FROM page_pro_orders WHERE provider_order_id = p_provider_order_id FOR UPDATE;` preventing race conditions from concurrent verification requests.
2. **Page Guard:** Confirms `v_order.page_id = p_page_id`; rejects mismatch with `PAGE_ORDER_MISMATCH`.
3. **Principal Guard:** Confirms `v_order.user_id = p_user_id` (or `p_is_admin = true`); rejects mismatch with `ORDER_PRINCIPAL_MISMATCH`.
4. **Billing Cycle Guard:** Confirms `v_order.billing_cycle = p_billing_cycle`; rejects mismatch with `BILLING_CYCLE_MISMATCH`.
5. **Replay / Idempotency Handling:**
   * If already `completed` with identical `p_provider_payment_id`: Returns `ENTITLEMENT_ALREADY_ACTIVE` with HTTP 200 equivalent without error.
   * If already `completed` with different payment ID: Returns `ORDER_ALREADY_CONSUMED` with failure code.
6. **Entitlement Activation:**
   * Marks `page_pro_orders.status = 'completed'`, sets `signature_verified = true`, stamps `completed_at`.
   * Mutates `pages.is_pro = true`, sets `pro_subscription_id = p_provider_payment_id`, sets `pro_expires_at = now() + 30/365 days`.

---

## 8. APPLICATION WIRING (`apps/api/src/routes/pages.ts`)

### `POST /api/v1/pages/:pageId/pro/order`
1. Resolves caller via Supabase JWT (`Bearer <token>`).
2. Validates caller is page owner or admin.
3. Calculates authoritative amount: `billingCycle === 'annual' ? 499900 : 49900`.
4. Generates provider order via `paymentProvider.createOrder(...)`.
5. Durably inserts record into `page_pro_orders`. If database write fails, handler returns 500 `DATABASE_ERROR` (fail-closed; zero fake order success).
6. Registers in `PRO_ORDER_REGISTRY` for in-memory cache / non-DB test scenarios.

### `POST /api/v1/pages/:pageId/pro/verify`
1. Resolves caller via Supabase JWT; authorizes owner or admin.
2. Validates presence of `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`. Missing signature rejected with 400 `MISSING_SIGNATURE`.
3. If `isSupabaseConfigured`:
   * Queries `page_pro_orders` for `provider_order_id`. Returns 400 `ORDER_NOT_FOUND` if order does not exist.
   * Enforces `page_id` association (400 `PAGE_ORDER_MISMATCH`).
   * Enforces principal ownership (403 `ORDER_PRINCIPAL_MISMATCH`).
   * Enforces billing cycle consistency (400 `BILLING_CYCLE_MISMATCH`).
   * Enforces replay protection (400 `ORDER_ALREADY_CONSUMED`).
4. Verifies cryptographic HMAC-SHA256 signature using `paymentProvider.verifyPaymentSignature(...)`. Invalid signature rejected with 400 `INVALID_SIGNATURE`.
5. Executes `verify_and_activate_page_pro` RPC in PostgreSQL to atomically activate entitlement and mark order completed.
6. Updates `ENTITLEMENT_CACHE` and returns 200 OK with `entitlement: { isPro: true, plan: 'pro', expiresAt: ... }`.

---

## 9. ISOLATED DATABASE ENVIRONMENT

* **Container Engine:** Docker Desktop (Windows container host)
* **PostgreSQL Runtime Container:** `w009-b5-postgres` (`postgis/postgis:16-3.4-alpine`) on `127.0.0.1:55432`
* **PostgREST Runtime Container:** `w009-b5-postgrest` (`public.ecr.aws/supabase/postgrest:v14.13`) on `127.0.0.1:55431`
* **Network Topology:** Dedicated Docker bridge network `w009-b5-net`
* **Reverse Proxy:** Local HTTP reverse proxy on `http://127.0.0.1:55430` routing `/rest/v1/*` to PostgREST `/*`
* **PostgreSQL Engine Version:** `PostgreSQL 16.4 on x86_64-pc-linux-musl, compiled by gcc (Alpine 13.2.1_git20240309) 13.2.1 20240309, 64-bit`

---

## 10. MIGRATION EXECUTION & IDEMPOTENCY EVIDENCE

```text
Applying all combined migrations (001 through 037)...
psql:/tmp/all_migrations_combined.sql:20: NOTICE:  extension "postgis" already exists, skipping
...
psql:/tmp/all_migrations_combined.sql:8418: NOTICE:  policy "Users and page owners read own pro orders" for relation "page_pro_orders" does not exist, skipping
Migrations applied successfully.

Testing Migration 037 Idempotency (re-applying 037_page_pro_orders.sql)...
psql:/tmp/037_page_pro_orders.sql:22: NOTICE:  relation "page_pro_orders" already exists, skipping
psql:/tmp/037_page_pro_orders.sql:24: NOTICE:  relation "idx_page_pro_orders_provider_order" already exists, skipping
psql:/tmp/037_page_pro_orders.sql:25: NOTICE:  relation "idx_page_pro_orders_page" already exists, skipping
psql:/tmp/037_page_pro_orders.sql:26: NOTICE:  relation "idx_page_pro_orders_user" already exists, skipping
psql:/tmp/037_page_pro_orders.sql:29: NOTICE:  relation "idx_page_pro_orders_payment_id" already exists, skipping
Migration 037 re-applied cleanly with zero errors. IDEMPOTENCY CONFIRMED.
```

---

## 11. SCHEMA & OBJECT INTROSPECTION EVIDENCE

### Table Columns: `page_pro_orders`
| Column Name | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `NO` | `gen_random_uuid()` |
| `provider_order_id` | `text` | `NO` | `NULL` |
| `page_id` | `uuid` | `NO` | `NULL` |
| `user_id` | `uuid` | `NO` | `NULL` |
| `product` | `text` | `NO` | `'pages_pro'::text` |
| `billing_cycle` | `text` | `NO` | `NULL` |
| `amount_paise` | `integer` | `NO` | `NULL` |
| `currency` | `text` | `NO` | `'INR'::text` |
| `status` | `text` | `NO` | `'created'::text` |
| `provider_payment_id` | `text` | `YES` | `NULL` |
| `signature_verified` | `boolean` | `NO` | `false` |
| `created_at` | `timestamptz` | `NO` | `now()` |
| `updated_at` | `timestamptz` | `NO` | `now()` |
| `completed_at` | `timestamptz` | `YES` | `NULL` |

### Indexes
* `page_pro_orders_pkey` ON `(id)`
* `page_pro_orders_provider_order_id_key` UNIQUE ON `(provider_order_id)`
* `idx_page_pro_orders_provider_order` ON `(provider_order_id)`
* `idx_page_pro_orders_page` ON `(page_id)`
* `idx_page_pro_orders_user` ON `(user_id)`
* `idx_page_pro_orders_payment_id` UNIQUE ON `(provider_payment_id) WHERE (provider_payment_id IS NOT NULL)`

### RLS Status
* `relrowsecurity: true` (Row Level Security active)
* `SECURITY DEFINER` RPC `verify_and_activate_page_pro`: Present and restricted to `service_role`.

---

## 12. END-TO-END PERSISTENCE EVIDENCE

### 1. `TEST-B5-PERSIST-01`: Order Creation with Durable Persistence
* **Request:** `POST /api/v1/pages/11111111-1111-1111-1111-111111111111/pro/order` (`billingCycle: 'monthly'`)
* **Response Status:** `HTTP 200 OK`
* **Response Body:**
```json
{
  "success": true,
  "orderId": "order_1789819027453_18kv8",
  "amount": 49900,
  "currency": "INR",
  "billingCycle": "monthly",
  "key": "rzp_test_w009_b5",
  "isSandbox": false
}
```
* **Direct Database Row in `page_pro_orders`:**
```json
{
  "id": "4d6af3ce-93bd-46f0-8a6e-3f8b152b962f",
  "provider_order_id": "order_1789819027453_18kv8",
  "page_id": "11111111-1111-1111-1111-111111111111",
  "user_id": "00000000-0000-0000-0000-000000000001",
  "product": "pages_pro",
  "billing_cycle": "monthly",
  "amount_paise": 49900,
  "currency": "INR",
  "status": "created",
  "provider_payment_id": null,
  "signature_verified": false,
  "created_at": "2026-09-19T11:57:07.678979+00:00",
  "updated_at": "2026-09-19T11:57:07.678979+00:00",
  "completed_at": null
}
```

### 2. `TEST-B5-PERSIST-02`: Memory Registry Loss Simulation
* **Action:** `PRO_ORDER_REGISTRY.clear()` (simulates cold container start, replica hop, or rolling deployment).
* **Pre-Purge Size:** `1`
* **Post-Purge Size:** `0` (Memory completely wiped).

### 3. `TEST-B5-PERSIST-03`: Payment Verification Survives Memory Loss
* **Request:** `POST /api/v1/pages/11111111-1111-1111-1111-111111111111/pro/verify` with authentic cryptographic signature `HMAC-SHA256(order_id|payment_id)`.
* **Response Status:** `HTTP 200 OK`
* **Response Body:**
```json
{
  "success": true,
  "message": "Page Pro subscription successfully activated",
  "entitlement": {
    "pageId": "11111111-1111-1111-1111-111111111111",
    "isPro": true,
    "plan": "pro",
    "expiresAt": "2026-10-19T11:57:08.73839+00:00"
  }
}
```
* **Database State After Verification:**
  * **`page_pro_orders` Record:**
    * `status`: `'completed'`
    * `provider_payment_id`: `'pay_w009_b5_durable_001'`
    * `signature_verified`: `true`
    * `completed_at`: `'2026-09-19T11:57:08.73839+00:00'`
  * **`pages` Record:**
    * `is_pro`: `true`
    * `pro_subscription_id`: `'pay_w009_b5_durable_001'`
    * `pro_expires_at`: `'2026-10-19T11:57:08.73839+00:00'`

---

## 13. IDEMPOTENCY & REPLAY PROTECTION EVIDENCE

### `TEST-B5-PERSIST-04`: Idempotent Replay Verification
* **Action:** Re-send exact same `orderId` + `paymentId` tuple with valid HMAC.
* **Response Status:** `HTTP 200 OK`
* **Response Body:** `{"success":true,"message":"Page Pro subscription successfully activated","entitlement":{"pageId":"11111111-1111-1111-1111-111111111111","isPro":true,"plan":"pro","expiresAt":"2026-10-19T11:57:08.73839+00:00"}}`
* **Result:** Idempotent replay acknowledged; database state unaffected; zero error.

### `TEST-B5-PERSIST-05`: Replay with Different Payment Rejected
* **Action:** Attempt to verify already-completed `order_1789819027453_18kv8` using a different payment ID `pay_w009_b5_fraudulent_replay`.
* **Response Status:** `HTTP 400 Bad Request`
* **Response Code:** `ORDER_ALREADY_CONSUMED`
* **Message:** `"Payment order has already been verified with a different payment"`
* **Result:** Replay strictly blocked by database check and atomic RPC guard.

---

## 14. SECURITY NEGATIVE TESTS EVIDENCE

| Test ID | Condition | Target | Expected Status / Code | Actual Status / Code | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TEST-B5-PERSIST-06` | Cross-Page Order Theft | Order created for Page A verified against Page B | `400 PAGE_ORDER_MISMATCH` | `400 PAGE_ORDER_MISMATCH` | **PASS** |
| `TEST-B5-PERSIST-07` | Principal Mismatch | User 2 attempts to claim order created by User 1 | `403 FORBIDDEN` / `ORDER_PRINCIPAL_MISMATCH` | `403 FORBIDDEN` | **PASS** |
| `TEST-B5-PERSIST-08` | Non-Existent Order | Verification of phantom order not in database | `400 ORDER_NOT_FOUND` | `400 ORDER_NOT_FOUND` | **PASS** |
| `TEST-B5-PERSIST-09` | Billing Cycle Mismatch | Order created as 'monthly', verify payload claims 'annual' | `400 BILLING_CYCLE_MISMATCH` | `400 BILLING_CYCLE_MISMATCH` | **PASS** |
| `TEST-B5-PERSIST-10` | Invalid Signature | Verification attempted with corrupt/forged HMAC signature | `400 INVALID_SIGNATURE` | `400 INVALID_SIGNATURE` | **PASS** (Zero DB mutation) |
| `TEST-B5-PERSIST-11` | Direct Table Injection | Unauthenticated client attempts direct INSERT into `page_pro_orders` | PostgreSQL RLS Permission Denied | `ERROR: permission denied for table page_pro_orders` | **PASS** |

---

## 15. REGRESSION TEST SUITE RESULTS

All standard application test suites executed cleanly:
1. **`providers.test.ts`:**
   ```text
   PASS src/__tests__/providers.test.ts (13.761 s)
   Tests: 33 passed, 33 total
   ```
2. **`tickets-04-05.test.ts`:**
   ```text
   PASS src/__tests__/tickets-04-05.test.ts (22.946 s)
   Tests: 7 passed, 7 total
   ```
3. **`civic-mutations.test.ts`:**
   ```text
   PASS src/__tests__/civic-mutations.test.ts (18.925 s)
   Tests: 22 passed, 22 total
   ```

---

## 16. PROVIDER SAFETY & ISOLATION CERTIFICATION

* **Razorpay Provider:** All operations conducted against test environment and mock HMAC signatures. Zero outbound financial settlement requests dispatched.
* **Voice OBD Provider:** TRAI statutory calling window (08:00–21:00 IST) enforced; test suite verified out-of-window rejection (400 `OUTSIDE_TRAI_WINDOW`). Zero carrier network requests dispatched.
* **Production Isolation:** No production database, staging endpoints, or third-party gateways were reached. All testing occurred in disposable Docker containers.

---

## 17. BOUNDARY HARDENING VERIFICATION

* All external HTTP requests pass through canonical Bearer token resolution via Supabase JWTs.
* Injected HTTP headers (`x-user-id`, `x-user-role`, `x-page-owner-id`) are completely ignored by production route handlers.
* Test resolvers operate strictly below the HTTP trust boundary and are active only when `process.env.NODE_ENV === 'test'`.

---

## 18. NEXT STEPS & GOVERNANCE RECOMMENDATION

* **Current Status:** `W009-B5: PRE-FLIGHT / REMEDIATION (NOT ACCEPTED)`.
* **Remediation Outcome:** DEF-B5-PAY-01, DEF-B5-PAY-02, and the durable persistence architecture requirement (W009-B5-R4) are **100% remediated and verified**.
* **Recommendation:** Submit evidence report and test artifacts to CTO for W009-B5 review.
