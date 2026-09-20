# W009-B5-R3A — Staging Migration Application Package & Railway Reconnection

**AUTHORITY:** CTO Gate Authorization W009-B5-R3A  
**DATE & TIMESTAMP:** 2026-09-20T17:00:30+05:30  
**BRANCH:** `master`  
**SYNCHRONIZED HEAD SHA:** `1d29b06`  
**CANONICAL TARGET DB:** `panIN-staging` (`https://fkpigozcqnmcvofuksar.supabase.co`)  
**CANONICAL API GATEWAY:** `kshetra-api-staging` (`https://kshetra-api-staging.up.railway.app`)  
**MIGRATION PACKAGE:** [`supabase/staging_migration_package_035_037.sql`](../supabase/staging_migration_package_035_037.sql)  
**VERIFICATION SUITE:** [`supabase/verify_staging_migration_package_035_037.sql`](../supabase/verify_staging_migration_package_035_037.sql)  
**PRODUCTION MUTATIONS:** STRICTLY ZERO  
**REAL FINANCIAL / TELECOM CALLS:** STRICTLY ZERO  

---

## 1. RAILWAY STAGING CONFIGURATION STATUS

Live HTTP probes against `https://kshetra-api-staging.up.railway.app`:

| Endpoint | HTTP Status | Response Payload | Variable Assessment |
| :--- | :---: | :--- | :--- |
| **`/health`** | `200 OK` | `{"status":"ok","service":"kshetra-api","version":"0.1.0"}` | Gateway online |
| **`/api/health`** | `200 OK` | `{"status":"ok","semanticType":"LIVENESS",...}` | Container healthy |
| **`/api/health/db`** | `503 DEGRADED` | `{"status":"degraded","connected":false,"error":"SUPABASE_URL or API keys are not configured"}` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are **ABSENT** |
| **`/api/health/ready`** | `503 DEGRADED` | `{"status":"degraded","connected":false,"error":"SUPABASE_URL or API keys are not configured"}` | Database readiness blocked |

*Expected target:* `SUPABASE_URL = https://fkpigozcqnmcvofuksar.supabase.co`

---

## 2. MIGRATION SOURCE INTEGRITY AUDIT

Audited against local and remote repository synchronized at commit `1d29b06`:

| Migration File | Git Blob SHA | Origin Commit | Credential-Free? | Destructive SQL? | Idempotent? | Schema Dependencies |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`035_campaign_recharge_orders.sql`** | `c4461bc98c1ce87ec4a52d4e74cf8c422914cc18` | `19761ba` | **YES** | **NO** | **YES** | `politician_portal_profiles` (016), `campaign_wallets` (026) [Confirmed Present] |
| **`036_foundation_and_grants_repair.sql`** | `0f99d3175a1a01ab69fdc71ac5a570476ca659ce` | `fb2fb43` | **YES** | **NO** | **YES** | `constituencies` (001), `civic_issues` (004), `headlines` (004), `legislator_profiles` (012) [Confirmed Present] |
| **`037_page_pro_orders.sql`** | `dcbb61fce95365b66f847b7cd065b1c05e2f2b73` | `126011a` | **YES** | **NO** | **YES** | `pages` (027), `auth.users`, `pgcrypto` [Confirmed Present] |

*Affirmation:* Zero migration files modified. No migration 038 created.

---

## 3. LIVE DATABASE PREFLIGHT AUDIT

Live probes executed against `panIN-staging` (`fkpigozcqnmcvofuksar`):

* **PostgreSQL Engine:** Supabase Managed PostgreSQL (PostgREST 14.5, HTTPS).
* **Existing Public Definitions:** 174 tables and views currently present.
* **Target Schema Object Status (Pre-Migration):**
  - `campaign_recharge_orders`: `404 Not Found` (**MISSING**)
  - `page_pro_orders`: `404 Not Found` (**MISSING**)
  - `internal_payment_secrets`: `404 Not Found` (**MISSING**)
  - `verify_and_activate_page_pro`: `404 Not Found` (**MISSING**)
  - `global_search`: `404 Not Found` (**MISSING**)
* **Parent Table Status (Dependencies):**
  - `pages`: `200 OK` (Present)
  - `campaign_wallets`: `200 OK` (Present)
  - `politician_portal_profiles`: `200 OK` (Present)
  - `political_ads`: `200 OK` (Present)

---

## 4. MIGRATION HISTORY INTEGRITY

* **Observed State:** The Supabase dashboard reports `LAST MIGRATION: No migrations`, and PostgREST endpoint `/rest/v1/schema_migrations` returns 404.
* **Determination:** Migrations `001` through `034` were applied directly as raw SQL schemas during earlier infrastructure setup, rather than tracked through the Supabase CLI `schema_migrations` table. Migrations 001–034 are **represented directly by existing schema objects** (all 174 tables/views are physically present in `public`).
* **Discipline:** No synthetic migration rows will be fabricated. The three pending migrations (035, 036, 037) are applied directly to align the database with repository commit `1d29b06`.

---

## 5. EXACT ORDERED APPLICATION PACKAGE

The deterministic SQL package is saved in [`supabase/staging_migration_package_035_037.sql`](../supabase/staging_migration_package_035_037.sql).  
It executes within an atomic transaction block:

```sql
BEGIN;

-- ==============================================================================
-- SECTION 1: MIGRATION 035 — Durable Campaign Recharge Orders & Atomic Verification
-- ==============================================================================
CREATE TABLE IF NOT EXISTS campaign_recharge_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_order_id TEXT NOT NULL UNIQUE,
  politician_id UUID NOT NULL REFERENCES politician_portal_profiles(id) ON DELETE CASCADE,
  amount_inr NUMERIC(12,2) NOT NULL CHECK (amount_inr >= 100),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  provider_payment_id TEXT,
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recharge_orders_politician ON campaign_recharge_orders(politician_id);
CREATE INDEX IF NOT EXISTS idx_recharge_orders_status ON campaign_recharge_orders(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_recharge_orders_payment_id
  ON campaign_recharge_orders(provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

ALTER TABLE campaign_recharge_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Politicians read own recharge orders" ON campaign_recharge_orders;
CREATE POLICY "Politicians read own recharge orders" ON campaign_recharge_orders
  FOR SELECT USING (politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Politicians create own recharge orders" ON campaign_recharge_orders;
CREATE POLICY "Politicians create own recharge orders" ON campaign_recharge_orders
  FOR INSERT WITH CHECK (politician_id IN (SELECT id FROM politician_portal_profiles WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION verify_and_credit_recharge(
  p_provider_order_id TEXT,
  p_politician_id UUID,
  p_amount_inr NUMERIC,
  p_payment_reference TEXT,
  p_provider_payment_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_order RECORD;
  v_wallet RECORD;
  v_new_balance NUMERIC;
  v_new_recharged NUMERIC;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_order
  FROM campaign_recharge_orders
  WHERE provider_order_id = p_provider_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'PAYMENT_ORDER_NOT_FOUND', 'message', 'Recharge order not found');
  END IF;

  IF v_order.politician_id <> p_politician_id THEN
    RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'message', 'Cross-wallet recharge verification rejected');
  END IF;

  IF v_order.amount_inr <> p_amount_inr THEN
    RETURN jsonb_build_object('success', false, 'code', 'AMOUNT_MISMATCH', 'message', 'Amount mismatch with registered order');
  END IF;

  IF v_order.status = 'completed' THEN
    SELECT * INTO v_wallet FROM campaign_wallets WHERE politician_id = p_politician_id;
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'code', 'ALREADY_COMPLETED',
      'message', 'Payment already verified and credited previously. Idempotent replay acknowledged.',
      'wallet', jsonb_build_object(
        'politicianId', p_politician_id,
        'balanceINR', v_wallet.balance_inr,
        'totalRechargedINR', v_wallet.total_recharged_inr
      )
    );
  END IF;

  SELECT * INTO v_wallet
  FROM campaign_wallets
  WHERE politician_id = p_politician_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO campaign_wallets (politician_id, balance_inr, total_recharged_inr, total_spent_inr, currency, created_at, updated_at)
    VALUES (p_politician_id, p_amount_inr, p_amount_inr, 0.00, 'INR', v_now, v_now)
    RETURNING * INTO v_wallet;
    v_new_balance := p_amount_inr;
    v_new_recharged := p_amount_inr;
  ELSE
    v_new_balance := v_wallet.balance_inr + p_amount_inr;
    v_new_recharged := v_wallet.total_recharged_inr + p_amount_inr;
    UPDATE campaign_wallets
    SET balance_inr = v_new_balance,
        total_recharged_inr = v_new_recharged,
        updated_at = v_now
    WHERE id = v_wallet.id;
  END IF;

  INSERT INTO wallet_transactions (
    wallet_id,
    politician_id,
    type,
    amount_inr,
    service_type,
    reference_id,
    description,
    balance_after_inr,
    created_at
  ) VALUES (
    v_wallet.id,
    p_politician_id,
    'credit',
    p_amount_inr,
    'recharge',
    p_payment_reference,
    'Recharge via Razorpay/UPI (₹' || p_amount_inr || ')',
    v_new_balance,
    v_now
  );

  UPDATE campaign_recharge_orders
  SET status = 'completed',
      provider_payment_id = COALESCE(p_provider_payment_id, provider_payment_id),
      payment_reference = p_payment_reference,
      completed_at = v_now,
      updated_at = v_now
  WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'success', true,
    'idempotent', false,
    'wallet', jsonb_build_object(
      'politicianId', p_politician_id,
      'balanceINR', v_new_balance,
      'totalRechargedINR', v_new_recharged
    )
  );
END;
$$;


-- ==============================================================================
-- SECTION 2: MIGRATION 036 — Foundation and Grants Repair (global_search RPC)
-- ==============================================================================
CREATE OR REPLACE FUNCTION global_search(
  p_query TEXT,
  p_state_code TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  entity_type TEXT,
  entity_id TEXT,
  title TEXT,
  subtitle TEXT,
  relevance REAL
) AS $$
DECLARE
  tsq tsquery;
BEGIN
  tsq := plainto_tsquery('english', p_query);

  RETURN QUERY
  SELECT
    search_results.entity_type,
    search_results.entity_id,
    search_results.title,
    search_results.subtitle,
    search_results.relevance
  FROM (
    SELECT
      'constituency'::TEXT AS entity_type,
      c.id AS entity_id,
      c.name AS title,
      (c.district || ' · AC#' || c.ac_no) AS subtitle,
      ts_rank(c.fts, tsq) AS relevance
    FROM constituencies c
    WHERE c.fts @@ tsq AND (p_state_code IS NULL OR c.state_code = p_state_code)

    UNION ALL

    SELECT
      'issue'::TEXT AS entity_type,
      ci.id::TEXT AS entity_id,
      ci.title AS title,
      (ci.category || ' · ' || ci.status) AS subtitle,
      ts_rank(ci.fts, tsq) AS relevance
    FROM civic_issues ci
    WHERE ci.fts @@ tsq AND (p_state_code IS NULL OR ci.state_code = p_state_code)

    UNION ALL

    SELECT
      'headline'::TEXT AS entity_type,
      h.id::TEXT AS entity_id,
      h.title AS title,
      h.source_name AS subtitle,
      ts_rank(h.fts, tsq) AS relevance
    FROM headlines h
    WHERE h.fts @@ tsq AND (p_state_code IS NULL OR h.state_code = p_state_code)

    UNION ALL

    SELECT
      'legislator'::TEXT AS entity_type,
      lp.id AS entity_id,
      lp.display_name AS title,
      (lp.current_party || ' · ' || lp.constituency_name) AS subtitle,
      CASE
        WHEN lp.display_name ILIKE '%' || p_query || '%' THEN 1.0
        WHEN lp.full_name ILIKE '%' || p_query || '%' THEN 0.9
        WHEN lp.constituency_name ILIKE '%' || p_query || '%' THEN 0.7
        ELSE 0.3
      END::REAL AS relevance
    FROM legislator_profiles lp
    WHERE (
      lp.display_name ILIKE '%' || p_query || '%'
      OR lp.full_name ILIKE '%' || p_query || '%'
      OR lp.constituency_name ILIKE '%' || p_query || '%'
      OR lp.current_party ILIKE '%' || p_query || '%'
    )
    AND (p_state_code IS NULL OR lp.state_code = p_state_code)
  ) search_results
  ORDER BY search_results.relevance DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION global_search(TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION global_search(TEXT, TEXT, INTEGER) TO anon, authenticated, service_role;


-- ==============================================================================
-- SECTION 3: MIGRATION 037 — Durable Pages Pro Payment Orders & Verification
-- ==============================================================================
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

ALTER TABLE page_pro_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users and page owners read own pro orders" ON page_pro_orders;
CREATE POLICY "Users and page owners read own pro orders" ON page_pro_orders
  FOR SELECT USING (
    user_id = auth.uid()
    OR page_id IN (SELECT id FROM pages WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS internal_payment_secrets (
  provider TEXT PRIMARY KEY,
  key_secret TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE internal_payment_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE internal_payment_secrets FROM PUBLIC, anon, authenticated, service_role;

DROP FUNCTION IF EXISTS verify_and_activate_page_pro(TEXT, UUID, UUID, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS verify_and_activate_page_pro(TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION verify_and_activate_page_pro(
  p_provider_order_id TEXT,
  p_page_id UUID,
  p_user_id UUID,
  p_provider_payment_id TEXT,
  p_signature TEXT,
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
  v_secret TEXT;
  v_expected_signature TEXT;
BEGIN
  SELECT key_secret INTO v_secret
  FROM internal_payment_secrets
  WHERE provider = 'razorpay';

  IF v_secret IS NULL OR v_secret = '' THEN
    v_secret := NULLIF(current_setting('app.settings.razorpay_key_secret', true), '');
  END IF;

  IF v_secret IS NULL OR v_secret = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'KEY_SECRET_MISSING',
      'message', 'Cryptographic verification key secret is missing or unconfigured'
    );
  END IF;

  IF p_signature IS NULL OR trim(p_signature) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'MISSING_SIGNATURE',
      'message', 'Cryptographic payment signature is required'
    );
  END IF;

  IF p_provider_order_id IS NULL OR trim(p_provider_order_id) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'MISSING_ORDER_ID',
      'message', 'Provider order ID is required'
    );
  END IF;

  IF p_provider_payment_id IS NULL OR trim(p_provider_payment_id) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'MISSING_PAYMENT_ID',
      'message', 'Provider payment ID is required'
    );
  END IF;

  v_expected_signature := encode(hmac((p_provider_order_id || '|' || p_provider_payment_id)::bytea, v_secret::bytea, 'sha256'), 'hex');

  IF lower(trim(p_signature)) <> lower(v_expected_signature) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVALID_SIGNATURE',
      'message', 'Cryptographic payment signature verification failed at transaction boundary'
    );
  END IF;

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

  IF v_order.page_id <> p_page_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'PAGE_ORDER_MISMATCH',
      'message', 'Payment order was not created for this page'
    );
  END IF;

  IF v_order.user_id <> p_user_id AND NOT p_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'ORDER_PRINCIPAL_MISMATCH',
      'message', 'Payment order was created by a different user'
    );
  END IF;

  IF p_billing_cycle IS NOT NULL AND v_order.billing_cycle <> p_billing_cycle THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'BILLING_CYCLE_MISMATCH',
      'message', 'Billing cycle does not match the created order'
    );
  END IF;

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

  IF v_order.billing_cycle = 'annual' THEN
    v_expiry := v_now + INTERVAL '365 days';
  ELSE
    v_expiry := v_now + INTERVAL '30 days';
  END IF;

  UPDATE page_pro_orders
  SET status = 'completed',
      provider_payment_id = p_provider_payment_id,
      signature_verified = true,
      completed_at = v_now,
      updated_at = v_now
  WHERE id = v_order.id;

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

REVOKE ALL ON FUNCTION verify_and_activate_page_pro(TEXT, UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_and_activate_page_pro(TEXT, UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN) TO service_role;

COMMIT;
```

---

## 6. POST-MIGRATION VERIFICATION SQL SUITE

Saved in [`supabase/verify_staging_migration_package_035_037.sql`](../supabase/verify_staging_migration_package_035_037.sql).  
Run in the Supabase SQL Editor immediately after executing the package:

```sql
-- 1. Verify existence of all target tables (Expected: 3 rows)
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('campaign_recharge_orders', 'page_pro_orders', 'internal_payment_secrets')
ORDER BY table_name;

-- 2. Verify RLS is enabled on target tables (Expected: rowsecurity = true for all 3)
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('campaign_recharge_orders', 'page_pro_orders', 'internal_payment_secrets')
ORDER BY tablename;

-- 3. Verify internal_payment_secrets privilege boundary (Expected: 0 rows for client roles)
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'internal_payment_secrets'
  AND grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role');

-- 4. Verify RPC functions exist with correct security definer properties
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('verify_and_credit_recharge', 'global_search', 'verify_and_activate_page_pro')
ORDER BY routine_name;

-- 5. Verify verify_and_activate_page_pro execution privileges (Expected: ONLY service_role)
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'verify_and_activate_page_pro';

-- 6. Verify global_search execution privileges (Expected: 0 rows for PUBLIC)
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'global_search'
  AND grantee = 'PUBLIC';
```

---

## 7. ROLLBACK & STOP BEHAVIOR

1. **Atomic Transaction Enclosure:** The package runs enclosed in `BEGIN; ... COMMIT;`. Any unexpected syntax or catalog constraint failure causes an immediate automatic `ROLLBACK`, leaving zero partial table state.
2. **Stop Condition:** If any statement in the transaction fails:
   - **DO NOT** retry with modified SQL.
   - **DO NOT** create a replacement migration or bypass statement.
   - Report the exact error string and database state to the CTO.

---

## 8. EXPLICIT OPERATOR ACTIONS

### Action 1: Execute Migration Package in Supabase Dashboard
1. Open the [Supabase Dashboard for panIN-staging](https://supabase.com/dashboard/project/fkpigozcqnmcvofuksar).
2. Click **SQL Editor** → **New query**.
3. Copy and paste the complete text of [`supabase/staging_migration_package_035_037.sql`](../supabase/staging_migration_package_035_037.sql).
4. Click **Run**. Confirm output: `Success. No rows returned`.
5. Run the verification query suite from [`supabase/verify_staging_migration_package_035_037.sql`](../supabase/verify_staging_migration_package_035_037.sql) to confirm all 6 checks match expected outputs.

### Action 2: Set Railway Staging Environment Variables
1. Open the [Railway Dashboard for kshetra-api-staging](https://railway.com/project/2a0fc52a-b365-4f1d-881a-081276738288).
2. Select service `kshetra-api-staging` → **Variables** tab.
3. Configure the three variables:
   - `SUPABASE_URL`: `https://fkpigozcqnmcvofuksar.supabase.co`
   - `SUPABASE_ANON_KEY`: `<staging-anon-key-from-supabase-dashboard>`
   - `SUPABASE_SERVICE_ROLE_KEY`: `<staging-service-role-key-from-supabase-dashboard>`
4. Click **Redeploy** / **Restart**.

---

## 9. HARD STOP & FINAL STATUS

Execution is halted per CTO instructions. Awaiting operator execution of Actions 1 & 2.

**FINAL STATUS:**  
`STAGING MIGRATION PACKAGE PREPARED / AWAITING OPERATOR EXECUTION & RAILWAY RECONNECTION`
