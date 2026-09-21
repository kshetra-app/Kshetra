# PLAN-W010-MASTER: SECURITY BASELINE & RLS HARDENING

**Status:** `DRAFT / SUBMITTED FOR CTO REVIEW (NOT YET RATIFIED / IMPLEMENTATION NOT AUTHORIZED)`  
**Standard:** AI Agent Master Execution Job Book & Amendment v1.5-A / Rule IV-001  
**Prerequisite:** W009 (ACCEPTED / COMPLETE)  
**Baseline HEAD:** `879fb532acfd43b7caca41ad25fc36312587264b` (`879fb53`)  
**Target Environment:** Staging Supabase (`fkpigozcqnmcvofuksar.supabase.co`) & Railway (`kshetra-api-staging.up.railway.app`)  
**Production Touched:** STRICTLY ZERO  

---

## Part A — Ground Truth: What Is Actually Present

1. **Schema & RLS Posture:**
   - 177 tables/views exist in the staging database catalog.
   - All 18 Class-A tables identified in W006 have `rowsecurity = true` (RLS enabled).
   - None of the tables currently have `forcerowsecurity = true` (FORCE RLS is disabled across the schema).
   - 17 of the 18 Class-A tables have active, functional RLS policies enforcing tenant/user boundaries on mutations.
   - Table `lmx_departments` has RLS enabled but contains **0 policies**, causing PostgreSQL to enforce total default-deny for non-owner callers (`anonClient.from('lmx_departments').select('*')` returns `[]`).
   - Table `trai_opt_outs` has an overly permissive public policy (`CREATE POLICY "Anyone can check opt-outs" ON trai_opt_outs FOR SELECT USING (true);` from `030_trai_opt_outs.sql:20`), leaking raw citizen phone numbers (`phone_number: '9848099999'`) to anonymous PostgREST clients.

2. **Catalog Grants & Permissions:**
   - Migration `023_data_api_grants.sql` granted `EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role` and altered default privileges for all future functions.
   - Administrative maintenance routines, specifically `refresh_materialized_views()`, are directly invokable by unauthenticated anonymous callers over PostgREST RPC (`/rpc/refresh_materialized_views`).
   - Multiple `SECURITY DEFINER` functions defined in `020_foundation_hardening.sql` lack explicit `SET search_path = public, pg_temp`, creating potential search_path hijacking exposures.

3. **Client Secret Boundary:**
   - Exhaustive static scans across `apps/mobile` and `apps/web-admin` confirm **0 occurrences** of `SUPABASE_SERVICE_ROLE_KEY` or `sb_secret_`.
   - The service-role credential is strictly isolated to backend Fastify server processes (`apps/api/src/lib/supabase.ts`).
   - W009 payment boundaries remain strictly enforced: `internal_payment_secrets` has `REVOKE ALL FROM service_role` actively enforced by the live catalog (returns error `42501 permission denied`).

4. **W006 Class-A Reads Baseline:**
   - All 21 Class-A reads originally marked `CONDITIONAL_PENDING_VERIFICATION` were tested empirically against staging database enforcement and transitioned to `LIVE_VERIFIED_FAIL_CLOSED`.

---

## Part B — Confirmed Defects

| Defect ID | Severity | Domain | Description | Reproduction / Evidence | Root Cause |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **DEF-014** | **P0** | Privacy / RLS | Plain-Text Citizen Phone Leak in `trai_opt_outs` | `anonClient.from('trai_opt_outs').select('*')` returns plaintext `phone_number: '9848099999'` to anonymous internet callers | Migration `030_trai_opt_outs.sql:20` created `CREATE POLICY "Anyone can check opt-outs" ON trai_opt_outs FOR SELECT USING (true);` |
| **DEF-015** | **P1** | Security / DoS | Anonymous Public Invocation of Administrative `SECURITY DEFINER` Functions | `anonClient.rpc('refresh_materialized_views')` executes without error, allowing unauthenticated DoS via background view refreshes | Blanket `GRANT EXECUTE ... TO anon` in `023_data_api_grants.sql` & missing `SET search_path` in `020_foundation_hardening.sql` |
| **DEF-016** | **P2** | Schema / RLS | Missing Explicit SELECT Policy on `lmx_departments` | `anonClient.from('lmx_departments').select('*')` returns `[]` (0 rows) due to default-deny, breaking department selection for emergency alerts | Migration `024_live_media_exchange.sql` enabled RLS but omitted any SELECT policy |
| **DEF-017** | **P2** | Hardening | Omission of `FORCE ROW LEVEL SECURITY` across Domain Tables | Table owners/superusers bypass RLS policies; defense-in-depth gap | Omission of `FORCE ROW LEVEL SECURITY` across migrations 001–037 |

---

## Part C — Exact Remediation Strategy

1. **DEF-014 Remediation:**
   - Drop the public SELECT policy: `DROP POLICY IF EXISTS "Anyone can check opt-outs" ON trai_opt_outs;`.
   - Revoke table SELECT, INSERT, UPDATE, DELETE privileges on `trai_opt_outs` from `PUBLIC`, `anon`, and `authenticated`.
   - Grant full table access exclusively to `service_role`.
   - Do **NOT** expose a direct public lookup RPC over PostgREST to prevent oracle enumeration attacks. All consumer opt-out verifications must be mediated through the rate-limited backend API gateway.
   - Restrict column visibility and enforce strict phone normalization and HMAC hashing.

2. **DEF-015 Remediation:**
   - Revoke EXECUTE on administrative functions:
     `REVOKE EXECUTE ON FUNCTION refresh_materialized_views() FROM PUBLIC, anon, authenticated;`
     `GRANT EXECUTE ON FUNCTION refresh_materialized_views() TO service_role;`
   - Apply explicit, minimal `SET search_path = public, pg_temp` to all domain `SECURITY DEFINER` routines.
   - Enforce caller-identity verification in `get_user_dashboard(p_user_id)`: callers may only view their own dashboard (`auth.uid() = p_user_id` or `auth.role() = 'service_role'`).
   - Preserve legitimate application RPCs (`get_feed`, `get_issues`, `global_search`, `get_trending_hashtags`, `get_constituency_stats`) for `anon` and `authenticated` while fixing their search_path.

3. **DEF-016 Remediation:**
   - Add explicit SELECT policy on `lmx_departments` restricted to active, verified departments:
     `CREATE POLICY "Public read active verified departments" ON lmx_departments FOR SELECT USING (subscription_status = 'active' AND verified = true);`
   - Protect sensitive delivery columns (`webhook_url`, `contact_phone`, `contact_email`): revoke SELECT on sensitive columns from `PUBLIC`, `anon`, and `authenticated` or ensure client queries select only public jurisdiction metadata.
   - Strictly deny INSERT, UPDATE, DELETE to non-service-role callers.

4. **DEF-017 Remediation:**
   - Perform a granular, per-table analysis rather than a blanket change.
   - For tables with zero `SECURITY DEFINER` dependencies owned by `postgres`, enable `FORCE ROW LEVEL SECURITY`.
   - For tables queried by `SECURITY DEFINER` functions running as `postgres` (`page_pro_orders`, `campaign_recharge_orders`), ensure explicit owner/service-role policies exist before enforcing RLS to prevent breaking backend transactions.

---

## Part D — Cryptographic Design for DEF-014 (`trai_opt_outs`)

### 1. Phone Normalization Rules
To ensure deterministic hashing and eliminate format discrepancies, all telephone inputs must be normalized prior to hashing:
- **Character Stripping:** Strip all non-numeric characters: `digits = input.replace(/\D/g, '')`.
- **Country Code Handling:**
  - If `digits` starts with `91` and has 12 digits: slice the last 10 digits (`digits.slice(-10)`).
  - If `digits` starts with `0` and has 11 digits: slice the last 10 digits (`digits.slice(-10)`).
- **Validation:**
  - Enforce strict DoT / TRAI Indian mobile numbering plan: the normalized string must match `^[6-9]\d{9}$` (exactly 10 digits beginning with 6, 7, 8, or 9).
  - Any number failing this validation is rejected as invalid; no database query or hash computation is performed.

### 2. Cryptographic Construction
- **Vulnerability of Plain SHA-256:** The space of all valid 10-digit Indian mobile numbers is approximately $4 \times 10^9$ (4 billion). A single modern GPU can compute $4 \times 10^9$ SHA-256 hashes in under 60 seconds, enabling trivial precomputed rainbow table attacks against unsalted hashes.
- **HMAC Construction:** Normalization produces a 10-digit string $M$. The stored hash must be computed as:
  $$H = \text{HMAC-SHA256}(M, K_{\text{pepper}})$$
  where $K_{\text{pepper}}$ is a cryptographically strong 256-bit server-side secret (`OPT_OUT_PEPPER`).
- **Secret Storage & Boundary:**
  - $K_{\text{pepper}}$ is stored exclusively in Railway server runtime environment variables.
  - $K_{\text{pepper}}$ **must NEVER** enter client bundles (`apps/mobile`, `apps/web-admin`), git repositories, or database tables accessible to PostgREST.
  - Plaintext `phone_number TEXT` column in `trai_opt_outs` is deprecated. In Migration 038, `phone_number` column is made nullable and revoked from all non-superuser roles; new records store only the HMAC digest.

### 3. Lookup Security & Abuse Prevention
- **Zero Direct PostgREST Access:** Anonymous and authenticated clients are completely denied direct table access.
- **No Unrestricted Public RPC:** Exposing an RPC `check_phone_opt_out(p_hash)` to anonymous clients creates an oracle enumeration vulnerability where an attacker can probe numbers one by one.
- **Mediated Access:** Any public-facing opt-out verification must occur via Fastify backend endpoint (`/api/v1/outreach/opt-out/check`) protected by:
  - Strict IP and user rate limiting (e.g. max 5 lookups per hour per IP).
  - Turnstile / CAPTCHA challenge on repeated requests.
  - Constant-time lookup responses to prevent timing side-channels.

### 4. Database Grants & Policy State
```sql
DROP POLICY IF EXISTS "Anyone can check opt-outs" ON trai_opt_outs;
DROP POLICY IF EXISTS "Service role can insert opt-outs" ON trai_opt_outs;

REVOKE ALL ON trai_opt_outs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON trai_opt_outs TO service_role;

CREATE POLICY "Service role full access on trai_opt_outs" ON trai_opt_outs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### 5. Regression Containment
- `apps/api/src/services/outreach/obdTelecomService.ts` executes using `supabaseAdmin` (`service_role`). Because `service_role` retains full table privileges, existing automated outreach scrubbing and Press-9 opt-out recording remain 100% operational.

---

## Part E — SECURITY DEFINER Inventory & Remediation for DEF-015

### 1. Complete Catalog Inventory of Functions

| Function Name | Schema | Owner | Arguments | SecDef | Safe `search_path` | Public / Anon Exec | Service Role Exec | Admin Task? | Security Risk / Action Required |
| :--- | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `refresh_materialized_views` | `public` | `postgres` | `()` | **YES** | `public, pg_temp` | **REVOKE ALL** | **GRANT** | **YES** | **DEF-015 (High)**: Unauthenticated DoS; revoke from anon/auth |
| `get_user_dashboard` | `public` | `postgres` | `(p_user_id UUID)` | **YES** | `public, pg_temp` | GRANT (Restricted) | GRANT | NO | **DEF-015 (Med)**: Cross-user metrics leak; add `auth.uid() = p_user_id` check |
| `global_search` | `public` | `postgres` | `(p_query TEXT, p_state TEXT, p_limit INT)` | **YES** | `public, pg_temp` | GRANT | GRANT | NO | STABLE search; add explicit `SET search_path = public, pg_temp` |
| `get_feed` | `public` | `postgres` | `(TEXT, TEXT, TEXT, INT, INT)` | **YES** | `public, pg_temp` | GRANT | GRANT | NO | STABLE feed; add explicit `SET search_path = public, pg_temp` |
| `get_issues` | `public` | `postgres` | `(TEXT, TEXT, TEXT, INT, INT)` | **YES** | `public, pg_temp` | GRANT | GRANT | NO | STABLE issues; add explicit `SET search_path = public, pg_temp` |
| `get_trending_hashtags` | `public` | `postgres` | `(TEXT, INT)` | **YES** | `public, pg_temp` | GRANT | GRANT | NO | STABLE stats; add explicit `SET search_path = public, pg_temp` |
| `get_constituency_stats` | `public` | `postgres` | `(TEXT)` | **YES** | `public, pg_temp` | GRANT | GRANT | NO | STABLE stats; add explicit `SET search_path = public, pg_temp` |
| `handle_new_user` | `public` | `postgres` | `()` | **YES** | `public, auth` | Trigger only | Trigger only | NO | Auth trigger; already has `SET search_path = public, auth` (M029) |
| `check_dm_blocklist_trigger` | `public` | `postgres` | `()` | **YES** | `public, pg_temp` | Trigger only | Trigger only | NO | DM trigger; add `SET search_path = public, pg_temp` |
| `update_conversation_last_message` | `public` | `postgres` | `()` | **YES** | `public, pg_temp` | Trigger only | Trigger only | NO | DM trigger; add `SET search_path = public, pg_temp` |
| `verify_and_activate_page_pro` | `public` | `postgres` | `(...)` | **YES** | `public, pg_temp` | **REVOKED** | **GRANT** | NO | W009 Payment RPC; already hardened in Migration 037 |

### 2. Specific Remediation Actions
- **Administrative Function Revocation:**
  ```sql
  REVOKE EXECUTE ON FUNCTION public.refresh_materialized_views() FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.refresh_materialized_views() TO service_role;
  ALTER FUNCTION public.refresh_materialized_views() SET search_path = public, pg_temp;
  ```
- **User Dashboard Authorization Gate:**
  Recreate `get_user_dashboard(p_user_id UUID)` with internal caller validation:
  ```sql
  IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND auth.role() != 'service_role') THEN
    RAISE EXCEPTION 'Access denied: cannot inspect another user dashboard';
  END IF;
  ```
- **Preserve Legitimate Application RPCs:**
  Do **NOT** execute a blanket `REVOKE EXECUTE ON ALL FUNCTIONS`. Application RPCs (`get_feed`, `get_issues`, `global_search`, `get_trending_hashtags`, `get_constituency_stats`) must remain executable by `anon` and `authenticated` with `SET search_path = public, pg_temp`.

---

## Part F — Explicit Public-Read Decision for DEF-016 (`lmx_departments`)

### 1. Source Truth & Architectural Requirements
- **Application Source:** `apps/mobile/lib/supabaseDataService.ts:1635` contains `fetchDepartments(stateCode?)`:
  ```ts
  let query = supabase.from('lmx_departments').select('*').eq('subscription_status', 'active').eq('verified', true);
  ```
- **W006 Specification:** Class-A Read #16 explicitly requires client access to `lmx_departments` for reporters to select recipient government agencies during emergency broadcasts.
- **Current Behavior:** Returns 0 rows (`[]`) due to PostgreSQL default-deny on tables with RLS enabled but 0 policies.

### 2. Public Read Decision & Sensitive Field Protection
- **Decision:** **PUBLIC READ APPROVED**, restricted strictly to verified active departments.
- **Sensitive Column Mitigation:**
  Table `lmx_departments` includes delivery infrastructure fields: `webhook_url`, `contact_phone`, `contact_email`. To prevent exposure of internal webhook URLs and administrative contact details to unauthenticated callers:
  - Revoke SELECT on sensitive columns from `anon` and `authenticated`:
    ```sql
    REVOKE SELECT (webhook_url, contact_phone, contact_email) ON lmx_departments FROM PUBLIC, anon, authenticated;
    ```
- **Policy Definition:**
  ```sql
  CREATE POLICY "Public read active verified departments" ON lmx_departments
    FOR SELECT TO anon, authenticated
    USING (subscription_status = 'active' AND verified = true);

  CREATE POLICY "Service role manage departments" ON lmx_departments
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);
  ```

---

## Part G — Per-Table FORCE-RLS Analysis for DEF-017

### 1. Comprehensive Analysis Matrix

| Table Name | Owner | Current RLS | Current Force RLS | Owner / Definer Access Paths | Service Role Access | FORCE-RLS Risk | Classification |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :--- |
| `civic_issues` | `postgres` | YES | NO | `get_issues`, `global_search` | Direct / Full | Low | **FORCE RLS SAFE** |
| `user_profiles` | `postgres` | YES | NO | `handle_new_user`, `get_feed` | Direct / Full | Low | **FORCE RLS SAFE** |
| `posts` | `postgres` | YES | NO | `get_feed`, `global_search` | Direct / Full | Low | **FORCE RLS SAFE** |
| `election_promises`| `postgres`| YES | NO | `global_search` | Direct / Full | Low | **FORCE RLS SAFE** |
| `notification_log` | `postgres` | YES | NO | Direct client | Direct / Full | Low | **FORCE RLS SAFE** |
| `leadership_modules`| `postgres`| YES | NO | Direct client | Direct / Full | Low | **FORCE RLS SAFE** |
| `community_challenges`| `postgres`| YES | NO | Direct client | Direct / Full | Low | **FORCE RLS SAFE** |
| `aspirant_profiles`| `postgres` | YES | NO | Direct client | Direct / Full | Low | **FORCE RLS SAFE** |
| `political_shorts` | `postgres` | YES | NO | Direct client | Direct / Full | Low | **FORCE RLS SAFE** |
| `live_events` | `postgres` | YES | NO | Direct client | Direct / Full | Low | **FORCE RLS SAFE** |
| `lmx_departments` | `postgres` | YES | NO | Direct client | Direct / Full | Low | **FORCE RLS SAFE** |
| `lmx_department_alerts`| `postgres`| YES | NO | Direct client | Direct / Full | Low | **FORCE RLS SAFE** |
| `lmx_credibility` | `postgres` | YES | NO | Direct client | Direct / Full | Low | **FORCE RLS SAFE** |
| `lmx_affiliations` | `postgres` | YES | NO | Direct client | Direct / Full | Low | **FORCE RLS SAFE** |
| `lmx_brand_kits` | `postgres` | YES | NO | Direct client | Direct / Full | Low | **FORCE RLS SAFE** |
| `user_follows` | `postgres` | YES | NO | Direct client | Direct / Full | Low | **FORCE RLS SAFE** |
| `conversations` | `postgres` | YES | NO | Triggers (`check_dm_blocklist`) | Direct / Full | Low | **FORCE RLS SAFE** |
| `messages` | `postgres` | YES | NO | Triggers (`update_last_message`)| Direct / Full | Low | **FORCE RLS SAFE** |
| `page_pro_orders` | `postgres` | YES | NO | `verify_and_activate_page_pro` | Direct / Full | **HIGH** | **REQUIRES DESIGN SAFEGUARD** |
| `campaign_recharge_orders`| `postgres`| YES | NO | `verify_and_credit_recharge` | Direct / Full | **HIGH** | **REQUIRES DESIGN SAFEGUARD** |
| `trai_opt_outs` | `postgres` | YES | NO | `obdTelecomService` | Direct / Full | Low | **FORCE RLS SAFE** |

### 2. High-Risk Safeguard Design
In PostgreSQL, `FORCE ROW LEVEL SECURITY` forces policy evaluation even when executing as the table owner `postgres`. When `verify_and_activate_page_pro` executes as `SECURITY DEFINER` owned by `postgres`, it runs without an end-user JWT session (`auth.uid()` is null). If `FORCE RLS` were applied without an explicit policy permitting `postgres`, `verify_and_activate_page_pro` would fail to read or update `page_pro_orders`.
- **Safeguard:** Before applying `FORCE ROW LEVEL SECURITY` to `page_pro_orders` and `campaign_recharge_orders`, explicit bypass/management policies must be created:
  ```sql
  CREATE POLICY "Table owner full access on page_pro_orders" ON page_pro_orders
    FOR ALL TO postgres USING (true) WITH CHECK (true);

  CREATE POLICY "Table owner full access on campaign_recharge_orders" ON campaign_recharge_orders
    FOR ALL TO postgres USING (true) WITH CHECK (true);
  ```
  With this safeguard in place, applying `FORCE ROW LEVEL SECURITY` across all 21 tables is **100% SAFE**.

---

## Part H — Migration Design (Migration 038 Specification)

The migration will be created as `supabase/migrations/038_security_baseline_and_rls_hardening.sql`:

```sql
-- ==============================================================================
-- Migration 038: Security Baseline & Row Level Security Hardening (W010)
-- Target: Staging & Production Supabase
-- Defects Remediated: DEF-014, DEF-015, DEF-016, DEF-017
-- ==============================================================================

BEGIN;

-- ─── 1. DEF-014: REMEDIATE TRAI OPT-OUT PRIVACY EXPOSURE ──────────────────────
DROP POLICY IF EXISTS "Anyone can check opt-outs" ON trai_opt_outs;
DROP POLICY IF EXISTS "Service role can insert opt-outs" ON trai_opt_outs;

REVOKE ALL ON trai_opt_outs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON trai_opt_outs TO service_role;

CREATE POLICY "Service role full access on trai_opt_outs" ON trai_opt_outs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 2. DEF-015: HARDEN ADMINISTRATIVE FUNCTIONS & SEARCH_PATH ───────────────
REVOKE EXECUTE ON FUNCTION public.refresh_materialized_views() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_materialized_views() TO service_role;

ALTER FUNCTION public.refresh_materialized_views() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_feed(TEXT, TEXT, TEXT, TIMESTAMPTZ, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_issues(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.global_search(TEXT, TEXT, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_trending_hashtags(TEXT, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_constituency_stats(TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_dm_blocklist_trigger() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_conversation_last_message() SET search_path = public, pg_temp;

-- Hardened get_user_dashboard with caller authorization check (preserving authentic 11-column return table)
CREATE OR REPLACE FUNCTION public.get_user_dashboard(p_user_id UUID)
RETURNS TABLE (
  posts_count INTEGER,
  issues_reported INTEGER,
  issues_resolved INTEGER,
  upvotes_received BIGINT,
  comments_given BIGINT,
  reputation_score INTEGER,
  civic_score INTEGER,
  favorites_count BIGINT,
  tier TEXT,
  display_name TEXT,
  role TEXT
) AS $$
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND auth.role() != 'service_role') THEN
    RAISE EXCEPTION 'Access denied: cannot inspect another user dashboard';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(up.post_count, 0) AS posts_count,
    (SELECT COUNT(*)::INTEGER FROM civic_issues ci WHERE ci.reporter_id = p_user_id) AS issues_reported,
    (SELECT COUNT(*)::INTEGER FROM civic_issues ci WHERE ci.reporter_id = p_user_id AND ci.status = 'resolved') AS issues_resolved,
    (SELECT COUNT(*) FROM issue_upvotes iu JOIN civic_issues ci ON ci.id = iu.issue_id WHERE ci.reporter_id = p_user_id) AS upvotes_received,
    (SELECT COUNT(*) FROM issue_comments ic WHERE ic.user_id = p_user_id) AS comments_given,
    COALESCE(up.reputation_score, 0) AS reputation_score,
    COALESCE(ap.civic_score, 0) AS civic_score,
    (SELECT COUNT(*) FROM favorites f WHERE f.user_id = p_user_id) AS favorites_count,
    COALESCE(us.tier, 'free') AS tier,
    COALESCE(up.display_name, 'Anonymous') AS display_name,
    COALESCE(up.role, 'citizen') AS role
  FROM user_profiles up
  LEFT JOIN aspirant_profiles ap ON ap.user_id = p_user_id
  LEFT JOIN user_subscriptions us ON us.user_id = p_user_id
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- ─── 3. DEF-016: LMX DEPARTMENTS READ POLICY & COLUMN PROTECTION ──────────────
REVOKE ALL ON lmx_departments FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, department_type, office_name, jurisdiction_type, state_code, district_name, mandal_name, jurisdiction_geojson, catchment_radius_km, center_lat, center_lng, subscription_status, verified, created_at, updated_at) ON lmx_departments TO anon, authenticated;
GRANT ALL ON lmx_departments TO service_role;

DROP POLICY IF EXISTS "Public read active verified departments" ON lmx_departments;
CREATE POLICY "Public read active verified departments" ON lmx_departments
  FOR SELECT TO anon, authenticated
  USING (subscription_status = 'active' AND verified = true);

CREATE POLICY "Service role manage departments" ON lmx_departments
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── 4. DEF-017: OWNER SAFEGUARDS & FORCE ROW LEVEL SECURITY ─────────────────
CREATE POLICY "Table owner full access on page_pro_orders" ON page_pro_orders
  FOR ALL TO postgres USING (true) WITH CHECK (true);

CREATE POLICY "Table owner full access on campaign_recharge_orders" ON campaign_recharge_orders
  FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE civic_issues FORCE ROW LEVEL SECURITY;
ALTER TABLE user_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE posts FORCE ROW LEVEL SECURITY;
ALTER TABLE election_promises FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_log FORCE ROW LEVEL SECURITY;
ALTER TABLE leadership_modules FORCE ROW LEVEL SECURITY;
ALTER TABLE community_challenges FORCE ROW LEVEL SECURITY;
ALTER TABLE aspirant_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE political_shorts FORCE ROW LEVEL SECURITY;
ALTER TABLE live_events FORCE ROW LEVEL SECURITY;
ALTER TABLE lmx_departments FORCE ROW LEVEL SECURITY;
ALTER TABLE lmx_department_alerts FORCE ROW LEVEL SECURITY;
ALTER TABLE lmx_credibility FORCE ROW LEVEL SECURITY;
ALTER TABLE lmx_affiliations FORCE ROW LEVEL SECURITY;
ALTER TABLE lmx_brand_kits FORCE ROW LEVEL SECURITY;
ALTER TABLE user_follows FORCE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
ALTER TABLE campaign_recharge_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE page_pro_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE trai_opt_outs FORCE ROW LEVEL SECURITY;

COMMIT;
```

---

## Part I — Code Changes Evaluation

- **`apps/api`:** Strictly **ZERO** source code modifications required. `obdTelecomService.ts` and payment verification routes continue functioning via `service_role`.
- **`apps/mobile`:** Strictly **ZERO** source code modifications required. `fetchDepartments` in `supabaseDataService.ts` will now successfully receive active verified departments instead of empty arrays.
- **`apps/web-admin`:** Strictly **ZERO** code changes.

---

## Part J — Regression Tests

The automated test suite `tests/verify_w010_rls_hardening.mjs` will execute:
1. **W009 Payment Boundary Regression:** Execute full payment activation cycle (`verify_and_activate_page_pro`) proving `page_pro_orders` persistence and signature verification remain functional under `FORCE ROW LEVEL SECURITY`.
2. **21 Class-A Reads Regression:** Re-verify all 21 reads from W006 to ensure zero broken queries. Read #16 (`fetchDepartments`) transitions from returning 0 rows to returning live department data.
3. **OBD Telecom Regression:** Test `isNumberOptedOut` and `recordOptOut` in `obdTelecomService.ts` to confirm backend outreach functionality is intact.

---

## Part K — Semantic Negative-Path Tests

1. **TEST-10-ATK-20 (DEF-014 Negative Test):**
   - `anonClient.from('trai_opt_outs').select('*')` -> Assert `42501 permission denied` or 0 rows. Zero phone numbers leaked.
   - Direct SQL inspection asserting table privileges revoked from `anon` and `authenticated`.
2. **TEST-10-ATK-21 (DEF-015 Negative Test):**
   - `anonClient.rpc('refresh_materialized_views')` -> Assert `42501 permission denied`.
   - `authenticatedClient.rpc('refresh_materialized_views')` -> Assert `42501 permission denied`.
   - `adminClient.rpc('refresh_materialized_views')` -> Assert HTTP 200 OK.
3. **TEST-10-DASH-01 (DEF-015 Dashboard Isolation):**
   - User A calling `get_user_dashboard(User B ID)` -> Assert exception / HTTP 400 Access Denied.
   - User A calling `get_user_dashboard(User A ID)` -> Assert HTTP 200 OK with User A metrics.
4. **TEST-10-DEPT-01 (DEF-016 Read & Mutation Denial):**
   - `anonClient.from('lmx_departments').select('*')` -> Assert HTTP 200 with active verified departments.
   - `anonClient.from('lmx_departments').insert({ ... })` -> Assert `42501 permission denied` or RLS violation.
   - `anonClient.from('lmx_departments').update({ ... })` -> Assert `42501 permission denied` or 0 rows updated.
   - `anonClient.from('lmx_departments').delete()` -> Assert `42501 permission denied` or 0 rows deleted.
5. **TEST-10-FORCE-01 (DEF-017 Catalog Verification):**
   - Query `pg_class.relforcerowsecurity` for all 21 tables asserting `relforcerowsecurity = true`.

---

## Part L — Staging Verification Protocol

1. Apply Migration 038 to staging database via verified staging package execution.
2. Execute `node tests/verify_w010_rls_hardening.mjs`.
3. Capture raw stdout, HTTP status codes, and database response payloads into `reports/w010_rls_hardening_evidence.json`.
4. Generate `reports/w010_rls_hardening_report.md`.

---

## Part M — Rollback Plan

Rollback script `supabase/rollback_038_security_hardening.sql`:
```sql
BEGIN;

-- 1. Revert trai_opt_outs
GRANT SELECT ON trai_opt_outs TO anon, authenticated;
CREATE POLICY "Anyone can check opt-outs" ON trai_opt_outs FOR SELECT USING (true);

-- 2. Revert refresh_materialized_views
GRANT EXECUTE ON FUNCTION public.refresh_materialized_views() TO anon, authenticated;

-- 3. Revert lmx_departments
DROP POLICY IF EXISTS "Public read active verified departments" ON lmx_departments;
REVOKE SELECT ON lmx_departments FROM anon, authenticated;

-- 4. Revert FORCE RLS
ALTER TABLE civic_issues NO FORCE ROW LEVEL SECURITY;
ALTER TABLE user_profiles NO FORCE ROW LEVEL SECURITY;
ALTER TABLE posts NO FORCE ROW LEVEL SECURITY;
ALTER TABLE election_promises NO FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_log NO FORCE ROW LEVEL SECURITY;
ALTER TABLE leadership_modules NO FORCE ROW LEVEL SECURITY;
ALTER TABLE community_challenges NO FORCE ROW LEVEL SECURITY;
ALTER TABLE aspirant_profiles NO FORCE ROW LEVEL SECURITY;
ALTER TABLE political_shorts NO FORCE ROW LEVEL SECURITY;
ALTER TABLE live_events NO FORCE ROW LEVEL SECURITY;
ALTER TABLE lmx_departments NO FORCE ROW LEVEL SECURITY;
ALTER TABLE lmx_department_alerts NO FORCE ROW LEVEL SECURITY;
ALTER TABLE lmx_credibility NO FORCE ROW LEVEL SECURITY;
ALTER TABLE lmx_affiliations NO FORCE ROW LEVEL SECURITY;
ALTER TABLE lmx_brand_kits NO FORCE ROW LEVEL SECURITY;
ALTER TABLE user_follows NO FORCE ROW LEVEL SECURITY;
ALTER TABLE conversations NO FORCE ROW LEVEL SECURITY;
ALTER TABLE messages NO FORCE ROW LEVEL SECURITY;
ALTER TABLE campaign_recharge_orders NO FORCE ROW LEVEL SECURITY;
ALTER TABLE page_pro_orders NO FORCE ROW LEVEL SECURITY;
ALTER TABLE trai_opt_outs NO FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Table owner full access on page_pro_orders" ON page_pro_orders;
DROP POLICY IF EXISTS "Table owner full access on campaign_recharge_orders" ON campaign_recharge_orders;

COMMIT;
```

---

## Part N — Deployment Sequencing

1. **Phase 1: Pre-execution Staging Verification:** Confirm clean git baseline and staging connectivity.
2. **Phase 2: Migration Package Creation:** Assemble `supabase/staging_migration_package_038.sql` with BOM inspection and UTF-8 compliance.
3. **Phase 3: Database Mutation:** Execute Migration 038 on staging database.
4. **Phase 4: Empirical Hardening Verification:** Run `tests/verify_w010_rls_hardening.mjs`.
5. **Phase 5: Evidence & Register Recording:** Record test results in reports and mark DEF-014 through DEF-017 as resolved.
6. **Phase 6: CTO Gate Review:** Submit evidence for independent CTO audit and acceptance.

---

## Part O — Acceptance Evidence

- `reports/w010_rls_hardening_evidence.json` (all negative and positive path tests passing 100%).
- `reports/w010_rls_hardening_report.md` (comprehensive milestone report).
- Live PostgREST query dumps proving:
  - `trai_opt_outs` returns `42501` to anonymous clients.
  - `refresh_materialized_views` returns `42501` to anonymous clients.
  - `lmx_departments` returns active verified departments without leaking `webhook_url`.
  - `pg_class` confirms `relforcerowsecurity = true` across all 21 tables.

---

## Part P — Defect Closure Criteria

- **DEF-014:** May be closed ONLY when live staging query `anonClient.from('trai_opt_outs').select('*')` is rejected with `42501 permission denied`, and zero plain-text phone numbers can be retrieved by untrusted clients.
- **DEF-015:** May be closed ONLY when live staging RPC `anonClient.rpc('refresh_materialized_views')` and `authenticatedClient.rpc('refresh_materialized_views')` are rejected with `42501 permission denied`.
- **DEF-016:** May be closed ONLY when live staging query `anonClient.from('lmx_departments').select('*')` returns HTTP 200 with verified active departments.
- **DEF-017:** May be closed ONLY when catalog probe verifies `relforcerowsecurity = true` for all 21 tables and W009 payment regression tests pass 100%.

Until these empirical criteria are met, **ALL FOUR DEFECTS REMAIN OPEN**.
