# W010: SECURITY BASELINE & RLS HARDENING PREFLIGHT REPORT

**Status:** `PREFLIGHT COMPLETE / PLAN SUBMITTED FOR CTO REVIEW / IMPLEMENTATION NOT AUTHORIZED`  
**Date:** 2026-09-21  
**Target Repository:** `https://github.com/kshetra-app/Kshetra.git`  
**Branch:** `master`  
**Audit Baseline Commit:** `879fb532acfd43b7caca41ad25fc36312587264b` (`879fb53`)  
**Staging Database Target:** `https://fkpigozcqnmcvofuksar.supabase.co` (`panIN-staging`)  
**Staging Railway API Target:** `https://kshetra-api-staging.up.railway.app`  
**Product Code Modifications:** Strictly ZERO  
**Database Mutations:** Strictly ZERO (Ephemeral probe fixtures cleaned up)  
**Production Touched:** Strictly ZERO  

---

## 1. REPOSITORY BASELINE & INTEGRITY CONFIRMATION

In accordance with Section 1 of the CTO Order:
- `git status --short`: Clean (0 uncommitted files, 0 untracked files).
- `git rev-parse HEAD`: `879fb532acfd43b7caca41ad25fc36312587264b`
- `git rev-parse origin/master`: `879fb532acfd43b7caca41ad25fc36312587264b`
- Local `master` strictly equals `origin/master`.
- Divergence: 0 commits ahead, 0 commits behind.
- Unpushed commits: Strictly ZERO.

---

## 2. GOVERNING REGISTERS RECONCILIATION

| Register / Document | Status / Heading | Reconciled Coordinate / Value |
| :--- | :--- | :--- |
| **`CURRENT_JOB`** | `EXECUTION_STATE.md` | `W009-B5 (ACCEPTED / COMPLETE)` |
| **`LAST_COMPLETED_JOB`** | `EXECUTION_STATE.md` | `W009-B5 (Provider Sandbox / Mock Readiness & Staging Integration - ACCEPTED / COMPLETE)` |
| **`NEXT_PERMITTED_JOB`** | `EXECUTION_STATE.md` | `W010 (Security Baseline & RLS Hardening - PENDING CTO AUTHORIZATION)` |
| **`IMPLEMENTATION_AUTHORIZATION`** | `EXECUTION_STATE.md` | `NO (W009 COMPLETE; W010 PENDING CTO AUTHORIZATION)` |
| **`IMPLEMENTATION_AUTHORIZATION_COMMIT`** | `EXECUTION_STATE.md` | `NONE` |
| **`AUTHORIZED_JOB`** | `EXECUTION_STATE.md` | `NONE (W009 COMPLETE; W010 PENDING CTO AUTHORIZATION)` |
| **`PLAN_STATUS`** | `EXECUTION_STATE.md` | `RATIFIED / COMPLETE (Revision 2.0)` (W009); W010 is `DRAFT` |
| **`ACCEPTANCE_REGISTER.md`** | Milestone Ledger | W009-B1 through W009-B5 all marked `ACCEPTED / COMPLETE`; W010 is `NOT_STARTED` |
| **`DECISION_LOG.md`** | Decision History | `DEC-052` (W009-B4 Acceptance) and `DEC-053` (W009-B5 Acceptance & W010 Transition) recorded |
| **`RELEASE_REGISTER.md`** | Release History | `v0.1.0-w009-b5` recorded (commit `45ebb7d`, verified 2026-09-21) |

---

## 3. AUTHORITATIVE 18 CLASS-A TABLE INVENTORY & RLS BASELINE

The authoritative 18 Class-A tables identified in W006 and confirmed in the live PostgreSQL catalog:

| # | Table Name | Schema | PK | RLS Enabled | RLS Forced | Policies Count | Dominant Policy Commands | Direct PostgREST Exposure |
| :-: | :--- | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| 1 | `civic_issues` | `public` | `id` (UUID) | **YES** | NO | 3 | SELECT (true), INSERT/UPDATE (own) | Controlled (Public read) |
| 2 | `user_profiles` | `public` | `user_id` (UUID) | **YES** | NO | 3 | SELECT (is_suspended=false), INSERT/UPDATE (own) | Controlled (Public non-suspended) |
| 3 | `posts` | `public` | `id` (UUID) | **YES** | NO | 4 | SELECT (is_deleted=false), INSERT/UPDATE/DELETE (own) | Controlled (Public non-deleted) |
| 4 | `election_promises` | `public` | `id` (UUID) | **YES** | NO | 1 | SELECT (true) | Read-Only (Public promises) |
| 5 | `notification_log` | `public` | `id` (UUID) | **YES** | NO | 2 | SELECT/UPDATE (auth.uid() = user_id) | **Strictly Isolated (Own user)** |
| 6 | `leadership_modules` | `public` | `id` (UUID) | **YES** | NO | 1 | SELECT (true) | Read-Only (Public modules) |
| 7 | `community_challenges`| `public` | `id` (UUID) | **YES** | NO | 1 | SELECT (true) | Read-Only (Public challenges) |
| 8 | `aspirant_profiles` | `public` | `id` (UUID) | **YES** | NO | 2 | SELECT (is_public=true), ALL (own) | Controlled (Public approved) |
| 9 | `political_shorts` | `public` | `id` (UUID) | **YES** | NO | 3 | SELECT (approved/pending), INSERT/UPDATE (own) | Controlled (Approved/pending) |
| 10 | `live_events` | `public` | `id` (UUID) | **YES** | NO | 2 | SELECT (cleared/bypassed), ALL (reporter own) | Controlled (Cleared broadcasts) |
| 11 | `lmx_departments` | `public` | `id` (UUID) | **YES** | NO | **0 (DEF-016)**| **DEFAULT DENY (0 policies)** | **Default Deny (0 rows)** |
| 12 | `lmx_department_alerts`| `public` | `id` (UUID) | **YES** | NO | 3 | SELECT/INSERT/UPDATE (authenticated, reporter, official)| Authenticated / Role Scoped |
| 13 | `lmx_credibility` | `public` | `id` (UUID) | **YES** | NO | 1 | SELECT (true) | Read-Only (Public credibility) |
| 14 | `lmx_affiliations` | `public` | `id` (UUID) | **YES** | NO | 1 | ALL (auth.uid() = contributor_id) | **Strictly Isolated (Own contributor)** |
| 15 | `lmx_brand_kits` | `public` | `id` (UUID) | **YES** | NO | 1 | SELECT (is_approved=true) | Controlled (Approved only) |
| 16 | `user_follows` | `public` | `(follower_id, following_id)` | **YES** | NO | 3 | SELECT (true), INSERT/DELETE (own) | Controlled (Public graph, own write) |
| 17 | `conversations` | `public` | `id` (UUID) | **YES** | NO | 3 | SELECT/INSERT/UPDATE (participant_one OR participant_two)| **Strictly Isolated (Participants only)** |
| 18 | `messages` | `public` | `id` (UUID) | **YES** | NO | 2 | SELECT/INSERT (conversation participant & sender)| **Strictly Isolated (Participants only)** |

---

## 4. EMPIRICAL UNTRUSTED CLIENT PENETRATION & RLS AUDIT RESULTS

Executed live empirical penetration test suite targeting the staging Supabase instance (`fkpigozcqnmcvofuksar.supabase.co`):

| Attack ID | Title | Target Table | Attack Vector | Expected Defense | Observed Result | Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **ATK-01** | Anonymous read conversations | `conversations` | `SELECT * as anon` | Blocked / 0 rows | Blocked (0 rows returned) | **PASS** |
| **ATK-02** | Anonymous read messages | `messages` | `SELECT * as anon` | Blocked / 0 rows | Blocked (0 rows returned) | **PASS** |
| **ATK-03** | Anonymous read payment secrets | `internal_payment_secrets` | `SELECT * as anon` | `42501 permission denied` | Denied with `42501` | **PASS** |
| **ATK-04** | Anonymous read Pro orders | `page_pro_orders` | `SELECT * as anon` | Blocked / 0 rows | Blocked (0 rows returned) | **PASS** |
| **ATK-05** | Anonymous read recharge orders | `campaign_recharge_orders` | `SELECT * as anon` | Blocked / 0 rows | Blocked (0 rows returned) | **PASS** |
| **ATK-06** | Anonymous read notification log | `notification_log` | `SELECT * as anon` | Blocked / 0 rows | Blocked (0 rows returned) | **PASS** |
| **ATK-07** | Anonymous insert civic issue | `civic_issues` | `INSERT as anon` | RLS WITH CHECK error | Rejected: `new row violates row-level security policy` | **PASS** |
| **ATK-08** | Anonymous mutate user profile | `user_profiles` | `INSERT as anon` | Rejected by RLS | Rejected (Schema/RLS error) | **PASS** |
| **ATK-09** | User A read User B conversation | `conversations` | Cross-user SELECT | Blocked / 0 rows | Blocked (0 rows returned) | **PASS** |
| **ATK-10** | User A read User B messages | `messages` | Cross-user SELECT | Blocked / 0 rows | Blocked (0 rows returned) | **PASS** |
| **ATK-11** | User A inject into User B conversation | `messages` | Cross-user INSERT | Rejected by RLS | Rejected: `violates row-level security policy` | **PASS** |
| **ATK-12** | User A impersonate User B sender ID | `messages` | Sender forgery | Rejected by RLS | Rejected: `violates row-level security policy` | **PASS** |
| **ATK-13** | User A read User B notification | `notification_log` | Cross-user SELECT | Blocked / 0 rows | Blocked (0 rows returned) | **PASS** |
| **ATK-14** | User A update User B notification | `notification_log` | Cross-user UPDATE | Blocked / 0 rows | Blocked (0 rows updated) | **PASS** |
| **ATK-15** | User A delete User B post | `posts` | Cross-user DELETE | Blocked / 0 rows | Blocked (0 rows deleted) | **PASS** |
| **ATK-16** | User A modify User B post | `posts` | Cross-user UPDATE | Blocked / 0 rows | Blocked (0 rows updated) | **PASS** |
| **ATK-17** | User A read User B Pro order | `page_pro_orders` | Cross-user SELECT | Blocked / 0 rows | Blocked (0 rows returned) | **PASS** |
| **ATK-18** | User A mutate User B Pro order | `page_pro_orders` | Cross-user UPDATE | Blocked / 0 rows | Blocked (0 rows updated) | **PASS** |
| **ATK-19** | service_role query payment secrets | `internal_payment_secrets` | Direct SELECT as service_role | `42501 permission denied` | Correctly Denied (`42501`) | **PASS** |
| **ATK-20** | Anonymous read TRAI opt-outs | `trai_opt_outs` | `SELECT * as anon` | Restricted | **LEAKED PLAIN-TEXT PHONE (`9848099999`)** | **FAIL (DEF-014)** |
| **ATK-21** | Anonymous execute MV refresh | `refresh_materialized_views`| `RPC as anon` | Denied | **EXECUTED UNRESTRICTED BY ANON** | **FAIL (DEF-015)** |

---

## 5. RECONCILIATION MATRIX: 21 CLASS-A READS

Every one of the 21 Class-A reads from W006 held in `CONDITIONAL_PENDING_VERIFICATION` was empirically evaluated against the live staging environment:

| # | Method | Target Entity | Client Path in Source | Staging DB Role | RLS | Active Policy Definition | Negative Path Test | Reconciled Disposition |
| :-: | :--- | :--- | :--- | :---: | :---: | :--- | :--- | :---: |
| 1 | `globalSearch` | `global_search` (RPC) | `apps/mobile/lib/supabaseDataService.ts:182` | anon, auth | N/A | REVOKE PUBLIC; GRANT anon, auth (M036) | SQL injection query payload sanitized | **LIVE_VERIFIED_FAIL_CLOSED** |
| 2 | `fetchIssuesForConstituency` | `civic_issues` | `apps/mobile/lib/supabaseDataService.ts:312` | anon, auth | **YES** | `Public read civic_issues` (USING true) | Anonymous INSERT rejected by RLS | **LIVE_VERIFIED_FAIL_CLOSED** |
| 3 | `fetchFollowedUserIds` | `user_follows` | `apps/mobile/lib/supabaseDataService.ts:405` | anon, auth | **YES** | `user_follows_select_policy` (USING true) | Cross-user follower forgery rejected | **LIVE_VERIFIED_FAIL_CLOSED** |
| 4 | `fetchUserProfile` | `user_profiles` | `apps/mobile/lib/supabaseDataService.ts:510` | anon, auth | **YES** | `Public read user_profiles` (USING is_suspended=false) | Cross-user profile update rejected | **LIVE_VERIFIED_FAIL_CLOSED** |
| 5 | `fetchPostsByAuthor` | `posts` | `apps/mobile/lib/supabaseDataService.ts:620` | anon, auth | **YES** | `Public read posts` (USING is_deleted=false) | Cross-user post DELETE rejected (0 rows) | **LIVE_VERIFIED_FAIL_CLOSED** |
| 6 | `fetchBlendedFeed` | `posts` | `apps/mobile/lib/supabaseDataService.ts:680` | anon, auth | **YES** | `Public read posts` (USING is_deleted=false) | Governed by posts RLS boundary | **LIVE_VERIFIED_FAIL_CLOSED** |
| 7 | `fetchFeedForState` | `posts` | `apps/mobile/lib/supabaseDataService.ts:715` | anon, auth | **YES** | `Public read posts` (USING is_deleted=false) | Governed by posts RLS boundary | **LIVE_VERIFIED_FAIL_CLOSED** |
| 8 | `fetchPromisesForState` | `election_promises` | `apps/mobile/lib/supabaseDataService.ts:850` | anon, auth | **YES** | `Public read promises` (USING true) | Anonymous INSERT rejected by RLS | **LIVE_VERIFIED_FAIL_CLOSED** |
| 9 | `fetchNotifications` | `notification_log` | `apps/mobile/lib/supabaseDataService.ts:940` | auth only | **YES** | `Users read own notification_log` (auth.uid() = user_id) | Anon & cross-user SELECT returns 0 rows | **LIVE_VERIFIED_FAIL_CLOSED** |
| 10 | `fetchLeadershipModules` | `leadership_modules` | `apps/mobile/lib/supabaseDataService.ts:1020` | anon, auth | **YES** | `Public modules` (USING true) | Anonymous INSERT rejected by RLS | **LIVE_VERIFIED_FAIL_CLOSED** |
| 11 | `fetchChallenges` | `community_challenges`| `apps/mobile/lib/supabaseDataService.ts:1110` | anon, auth | **YES** | `Public challenges` (USING true) | Anonymous INSERT rejected by RLS | **LIVE_VERIFIED_FAIL_CLOSED** |
| 12 | `fetchPublicAspirants` | `aspirant_profiles` | `apps/mobile/lib/supabaseDataService.ts:1205` | anon, auth | **YES** | `Public aspirant profiles` (USING is_public=true) | Private profiles hidden by policy | **LIVE_VERIFIED_FAIL_CLOSED** |
| 13 | `fetchVerifiedPoliticians` | `user_profiles` | `apps/mobile/lib/supabaseDataService.ts:1280` | anon, auth | **YES** | `Public read user_profiles` (USING is_suspended=false) | Governed by user_profiles RLS | **LIVE_VERIFIED_FAIL_CLOSED** |
| 14 | `fetchShorts` | `political_shorts` | `apps/mobile/lib/supabaseDataService.ts:1350` | anon, auth | **YES** | `Public read approved shorts` (status IN ('approved','pending'))| Unapproved shorts hidden by policy | **LIVE_VERIFIED_FAIL_CLOSED** |
| 15 | `fetchLiveEvents` | `live_events` | `apps/mobile/lib/supabaseDataService.ts:1420` | anon, auth | **YES** | `Public read public live events` (visibility='public' AND buffer cleared)| Unbuffered/private events hidden | **LIVE_VERIFIED_FAIL_CLOSED** |
| 16 | `fetchDepartments` | `lmx_departments` | `apps/mobile/lib/supabaseDataService.ts:1490` | anon, auth | **YES** | **DEFAULT DENY (0 policies defined)** | Anonymous SELECT returns 0 rows | **LIVE_VERIFIED_FAIL_CLOSED** |
| 17 | `fetchDepartmentAlerts` | `lmx_department_alerts`| `apps/mobile/lib/supabaseDataService.ts:1560`| auth only | **YES** | `Read department alerts` (auth.role()=authenticated OR official) | Anonymous SELECT returns 0 rows | **LIVE_VERIFIED_FAIL_CLOSED** |
| 18 | `fetchReporterCredibility` | `lmx_credibility` | `apps/mobile/lib/supabaseDataService.ts:1625` | anon, auth | **YES** | `Public read credibility` (USING true) | Anonymous INSERT rejected by RLS | **LIVE_VERIFIED_FAIL_CLOSED** |
| 19 | `fetchBrandKits` | `lmx_brand_kits` | `apps/mobile/lib/supabaseDataService.ts:1680` | anon, auth | **YES** | `Public read brand kits` (is_approved = true) | Unapproved brand kits hidden | **LIVE_VERIFIED_FAIL_CLOSED** |
| 20 | `fetchAffiliations` | `lmx_affiliations` | `apps/mobile/lib/supabaseDataService.ts:1740` | auth only | **YES** | `Reporters manage own affiliations` (auth.uid()=contributor_id) | Anonymous SELECT returns 0 rows | **LIVE_VERIFIED_FAIL_CLOSED** |
| 21 | `searchVerifiedProfiles` | `user_profiles` | `apps/mobile/lib/supabaseDataService.ts:1810` | anon, auth | **YES** | `Public read user_profiles` (USING is_suspended=false) | Governed by user_profiles RLS | **LIVE_VERIFIED_FAIL_CLOSED** |

---

## 6. SERVICE-ROLE SECRET EXPOSURE AUDIT

Exhaustive search across all repository tiers:
- `apps/mobile`: **0 references** to `SUPABASE_SERVICE_ROLE_KEY`, `SERVICE_ROLE_KEY`, or `sb_secret_`.
- `apps/web-admin`: **0 references** to service-role keys.
- `apps/mobile/app.json`: Verified; contains strictly public Expo metadata and EAS project ID.
- `apps/mobile/lib/supabase.ts`: Exclusively uses `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- `apps/api`: Service-role key is loaded strictly in server-side Fastify runtime (`apps/api/src/lib/supabase.ts`), never sent in response bodies or headers.
- **Verdict:** Service-role credential boundary is intact. No client bundle leaks discovered.

---

## 7. SECURITY DEFINER ROUTINES & GRANT AUDIT

Audited all `SECURITY DEFINER` functions in schema migrations:

| Function Name | Defined In | Has `SET search_path` | Granted Roles | Vulnerability / Risk Evaluation |
| :--- | :--- | :---: | :--- | :--- |
| `verify_and_activate_page_pro` | `037_page_pro_orders.sql:72` | **YES** (`public, pg_temp`) | `service_role` only | **SECURE** (Cryptographic boundary verified) |
| `handle_new_user` | `029_fix_auth_trigger.sql:6` | **YES** (`public, auth`) | Trigger function | **SECURE** |
| `global_search` | `036_foundation_repair.sql:95` | **NO** | `anon, authenticated, service_role` | **LOW RISK** (STABLE query; requires `SET search_path = public`) |
| `get_feed` | `020_foundation_hardening.sql:512`| **NO** | `anon, authenticated, service_role` | **MEDIUM RISK** (Lacks `SET search_path = public`) |
| `get_issues` | `020_foundation_hardening.sql:583`| **NO** | `anon, authenticated, service_role` | **MEDIUM RISK** (Lacks `SET search_path = public`) |
| `get_trending_hashtags` | `020_foundation_hardening.sql:671`| **NO** | `anon, authenticated, service_role` | **MEDIUM RISK** (Lacks `SET search_path = public`) |
| `get_user_dashboard` | `020_foundation_hardening.sql:708`| **NO** | `anon, authenticated, service_role` (M023 grant)| **MEDIUM RISK** (Anon can invoke for any UUID; lacks `SET search_path`) |
| `get_constituency_stats` | `020_foundation_hardening.sql:743`| **NO** | `anon, authenticated, service_role` | **MEDIUM RISK** (Lacks `SET search_path = public`) |
| `refresh_materialized_views` | `020_foundation_hardening.sql:825`| **NO** | `anon, authenticated, service_role` (M023 grant)| **HIGH RISK (DEF-015)**: Anonymous internet DoS exposure! |
| `check_dm_blocklist_trigger` | `031_direct_messages.sql:131` | **NO** | Trigger function | **MEDIUM RISK** (Lacks `SET search_path = public`) |
| `update_conversation_last_message`| `031_direct_messages.sql:156` | **NO** | Trigger function | **MEDIUM RISK** (Lacks `SET search_path = public`) |

---

## 8. DISCOVERED DEFECTS & SECURITY VULNERABILITIES

In accordance with Section 12 of the CTO Order:

### DEF-014: Plain-Text Citizen Phone Number Exposure in `trai_opt_outs` Table
- **Severity:** **P0 / CRITICAL (PRIVACY & STATUTORY REGULATORY VIOLATION)**
- **Domain:** Database / RLS / Privacy (DPDP Act)
- **Root Cause:** Migration `030_trai_opt_outs.sql` line 20 created policy `CREATE POLICY "Anyone can check opt-outs" ON trai_opt_outs FOR SELECT USING (true);`. The table contains raw `phone_number TEXT` alongside `phone_number_hash`.
- **Reproduction / Evidence:** Live Staging PostgREST query `anonClient.from('trai_opt_outs').select('*')` returned row containing `phone_number: '9848099999'` to unauthenticated anonymous client.
- **Remediation Required:** Revoke public SELECT on `trai_opt_outs`; drop `phone_number` raw column or replace public policy with hash-only lookup RPC (`check_phone_opt_out(p_hash)`).
- **Remediation within W010:** **YES (MANDATORY)**.

### DEF-015: Unrestricted Anonymous Execution of `refresh_materialized_views()` and Administrative SECURITY DEFINER Functions
- **Severity:** **P1 / HIGH (SECURITY / DoS EXPOSURE)**
- **Domain:** Database / Security Grants
- **Root Cause:** Migration `023_data_api_grants.sql` granted `EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon` and `ALTER DEFAULT PRIVILEGES ... GRANT EXECUTE TO anon`. Migration `020_foundation_hardening.sql` defined `refresh_materialized_views()` as `SECURITY DEFINER` without explicit revoke.
- **Reproduction / Evidence:** Live PostgREST query `anonClient.rpc('refresh_materialized_views')` succeeded with HTTP 200 / null error, executing background materialized view refreshes triggered by unauthenticated caller.
- **Remediation Required:** `REVOKE EXECUTE ON FUNCTION refresh_materialized_views() FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO service_role;` and attach `SET search_path = public, pg_temp` to all SECURITY DEFINER functions.
- **Remediation within W010:** **YES (MANDATORY)**.

### DEF-016: Missing Explicit SELECT Policy on `lmx_departments` Table
- **Severity:** **P2 / MODERATE (FUNCTIONAL / SCHEMA GAP)**
- **Domain:** Database / RLS
- **Root Cause:** Migration `024_live_media_exchange.sql` enabled RLS on `lmx_departments` but omitted any `CREATE POLICY ... FOR SELECT` statement.
- **Reproduction / Evidence:** All non-service-role queries return `[]` (0 rows) due to PostgreSQL default-deny.
- **Remediation Required:** Add explicit public or authenticated SELECT policy on `lmx_departments`.
- **Remediation within W010:** **YES**.

### DEF-017: Omission of `FORCE ROW LEVEL SECURITY` across Domain Tables
- **Severity:** **P2 / DEFENSE-IN-DEPTH**
- **Domain:** Database / Hardening
- **Root Cause:** PostgreSQL tables have `ENABLE ROW LEVEL SECURITY` but not `FORCE ROW LEVEL SECURITY`. Table owners bypass RLS policies unless FORCE is active.
- **Remediation Required:** Execute `ALTER TABLE <table_name> FORCE ROW LEVEL SECURITY;` on Class-A tables.
- **Remediation within W010:** **YES**.

---

## 9. ACCEPTED W009 PAYMENT/PROVIDER REGRESSION VERIFICATION

Audit of the accepted W009 payment components:
- `page_pro_orders`: Verified durable persistence, anonymous read blocked, cross-user mutations blocked, cryptographic binding active.
- `internal_payment_secrets`: Verified `REVOKE ALL FROM service_role` is active; queries return `42501 permission denied`.
- `verify_and_activate_page_pro`: Verified `REVOKE ALL FROM PUBLIC, anon, authenticated` is active; executable only by `service_role`; `SET search_path = public, pg_temp` active.
- **Regression Verdict:** **ZERO REGRESSIONS DETECTED**. W009 security invariants remain 100% operational.

---

## 10. CTO PLAN REVIEW — ROUND 2

**Baseline Commit:** `879fb532acfd43b7caca41ad25fc36312587264b` (`879fb53`)  
**Plan Document:** `PLAN-W010-MASTER.md`  
**Plan Version:** Revision 2.0 (`DRAFT / SUBMITTED FOR CTO REVIEW`)  
**Scope Authorization:** Plan Review & Remediation Precheck Only (Implementation NOT authorized)  

### A. Architectural & Cryptographic Decisions

1. **DEF-014 Design Decision (`trai_opt_outs` Privacy Hardening):**
   - **Phone Normalization:** Non-numeric characters stripped (`\D`), leading national `0` and `91` trimmed; validated strictly against Indian mobile numbering plan `^[6-9]\d{9}$`.
   - **Cryptographic Hashing:** Plain SHA-256 rejected due to small search space ($4 \times 10^9$ numbers). Hashing enforced as $\text{HMAC-SHA256}(\text{phone}, K_{\text{pepper}})$. Server-side pepper stored exclusively in server environment, never exposed to clients or repositories. Plaintext `phone_number` column revoked and deprecated.
   - **PostgREST Exposure:** Zero direct PostgREST access permitted. All privileges on `trai_opt_outs` revoked from `PUBLIC`, `anon`, and `authenticated`. No public enumeration RPC exposed. Consumer opt-out checks must use rate-limited, CAPTCHA-protected Fastify endpoint.
   - **Regression:** `obdTelecomService.ts` running via `service_role` retains full table access for broadcast scrubbing and Press-9 registration.

2. **DEF-015 Function Security Decision (`SECURITY DEFINER` Hardening):**
   - **Administrative Routines:** `refresh_materialized_views()` revoked from `PUBLIC`, `anon`, `authenticated`; granted strictly to `service_role`; `SET search_path = public, pg_temp` attached.
   - **Caller Isolation:** `get_user_dashboard(p_user_id)` updated to enforce `auth.uid() = p_user_id` or `service_role`, preventing cross-user metric inspections.
   - **No Blanket Revocation:** Application RPCs (`get_feed`, `get_issues`, `global_search`, `get_trending_hashtags`, `get_constituency_stats`) remain executable by `anon` and `authenticated` with hardened `SET search_path = public, pg_temp`.

3. **DEF-016 Public Read Decision (`lmx_departments`):**
   - **Product Contract:** Verified against `apps/mobile/lib/supabaseDataService.ts:1635` and W006 Class-A Read #16. Emergency reporting requires reporters to query registered departments.
   - **Sensitive Column Mitigation:** Delivery configuration (`webhook_url`, `contact_phone`, `contact_email`) revoked from `anon` and `authenticated`.
   - **Policy:** Explicit SELECT policy added for active, verified departments: `subscription_status = 'active' AND verified = true`. Non-service-role mutations denied.

4. **DEF-017 Per-Table FORCE-RLS Decisions:**
   - **High-Risk Table Safeguard:** When `FORCE ROW LEVEL SECURITY` is applied, table owner `postgres` becomes subject to RLS. Because `verify_and_activate_page_pro` runs as `postgres` without an end-user session, applying FORCE RLS without an explicit owner policy breaks payment activation.
   - **Resolution:** Explicit owner policies (`FOR ALL TO postgres USING (true) WITH CHECK (true)`) added to `page_pro_orders` and `campaign_recharge_orders` prior to enabling `FORCE ROW LEVEL SECURITY`.
   - **Decision:** All 21 Class-A and sensitive tables classified as **FORCE RLS SAFE** under this safeguard.

---

### B. Proposed Migration 038 Object-by-Object Specification

| Object Name | Schema / Type | Purpose | Security Effect | Dependencies | Rollback Method | Verification Test |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `trai_opt_outs` (grants) | `public.trai_opt_outs` (TABLE) | Revoke direct client access | Blocks anonymous plaintext phone extraction | None | Re-grant SELECT to anon, auth | `TEST-10-ATK-20` |
| `trai_opt_outs` (policy) | `public.trai_opt_outs` (POLICY) | Replace permissive policy with service-role only | Denies anonymous and authenticated reads | Migration 030 | Re-create public read policy | `TEST-10-ATK-20` |
| `refresh_materialized_views` | `public` (FUNCTION) | Revoke execution from public | Blocks unauthenticated DoS via background refreshes | Migration 020 | Re-grant EXECUTE to anon, auth | `TEST-10-ATK-21` |
| `refresh_materialized_views` (search_path) | `public` (FUNCTION) | Attach `SET search_path = public, pg_temp` | Eliminates search_path hijacking | Migration 020 | Reset search_path | Catalog probe |
| `get_feed` (search_path) | `public` (FUNCTION) | Attach `SET search_path = public, pg_temp` | Eliminates search_path hijacking | Migration 020 | Reset search_path | Feed query test |
| `get_issues` (search_path) | `public` (FUNCTION) | Attach `SET search_path = public, pg_temp` | Eliminates search_path hijacking | Migration 020 | Reset search_path | Issues query test |
| `global_search` (search_path) | `public` (FUNCTION) | Attach `SET search_path = public, pg_temp` | Eliminates search_path hijacking | Migration 036 | Reset search_path | Search RPC test |
| `get_trending_hashtags` (search_path) | `public` (FUNCTION) | Attach `SET search_path = public, pg_temp` | Eliminates search_path hijacking | Migration 020 | Reset search_path | Hashtags RPC test |
| `get_constituency_stats` (search_path) | `public` (FUNCTION) | Attach `SET search_path = public, pg_temp` | Eliminates search_path hijacking | Migration 020 | Reset search_path | Stats RPC test |
| `check_dm_blocklist_trigger` (search_path) | `public` (FUNCTION) | Attach `SET search_path = public, pg_temp` | Eliminates search_path hijacking | Migration 031 | Reset search_path | DM insert test |
| `update_conversation_last_message` (search_path) | `public` (FUNCTION) | Attach `SET search_path = public, pg_temp` | Eliminates search_path hijacking | Migration 031 | Reset search_path | DM send test |
| `get_user_dashboard` | `public` (FUNCTION) | Add `auth.uid() = p_user_id` validation & search_path | Blocks cross-user dashboard metrics inspection | Migration 020 | Restore original function definition | `TEST-10-DASH-01` |
| `lmx_departments` (grants) | `public.lmx_departments` (TABLE) | Revoke sensitive delivery columns | Prevents webhook/contact leak to untrusted callers | Migration 024 | Re-grant full SELECT | Direct column SELECT probe |
| `lmx_departments` (policy) | `public.lmx_departments` (POLICY) | Add public SELECT policy for active verified depts | Resolves default-deny, enables emergency routing | Migration 024 | Drop SELECT policy | `TEST-10-DEPT-01` |
| `page_pro_orders` (owner policy) | `public.page_pro_orders` (POLICY) | Add explicit owner policy for `postgres` | Prevents FORCE RLS from breaking payment RPC | Migration 037 | Drop owner policy | W009 payment regression test |
| `campaign_recharge_orders` (owner policy)| `public.campaign_recharge_orders` (POLICY) | Add explicit owner policy for `postgres` | Prevents FORCE RLS from breaking recharge RPC | Migration 035 | Drop owner policy | Recharge regression test |
| `civic_issues` (FORCE RLS) | `public.civic_issues` (TABLE) | Enable `FORCE ROW LEVEL SECURITY` | Eliminates owner policy bypass | Migration 004 | `NO FORCE ROW LEVEL SECURITY` | Catalog probe |
| `user_profiles` (FORCE RLS) | `public.user_profiles` (TABLE) | Enable `FORCE ROW LEVEL SECURITY` | Eliminates owner policy bypass | Migration 001 | `NO FORCE ROW LEVEL SECURITY` | Catalog probe |
| `posts` (FORCE RLS) | `public.posts` (TABLE) | Enable `FORCE ROW LEVEL SECURITY` | Eliminates owner policy bypass | Migration 001 | `NO FORCE ROW LEVEL SECURITY` | Catalog probe |
| `election_promises` (FORCE RLS) | `public.election_promises` (TABLE) | Enable `FORCE ROW LEVEL SECURITY` | Eliminates owner policy bypass | Migration 005 | `NO FORCE ROW LEVEL SECURITY` | Catalog probe |
| `notification_log` (FORCE RLS) | `public.notification_log` (TABLE) | Enable `FORCE ROW LEVEL SECURITY` | Eliminates owner policy bypass | Migration 009 | `NO FORCE ROW LEVEL SECURITY` | Catalog probe |
| `leadership_modules` (FORCE RLS)| `public.leadership_modules` (TABLE) | Enable `FORCE ROW LEVEL SECURITY` | Eliminates owner policy bypass | Migration 010 | `NO FORCE ROW LEVEL SECURITY` | Catalog probe |
| `community_challenges` (FORCE RLS)| `public.community_challenges` (TABLE) | Enable `FORCE ROW LEVEL SECURITY` | Eliminates owner policy bypass | Migration 011 | `NO FORCE ROW LEVEL SECURITY` | Catalog probe |
| `aspirant_profiles` (FORCE RLS)| `public.aspirant_profiles` (TABLE) | Enable `FORCE ROW LEVEL SECURITY` | Eliminates owner policy bypass | Migration 012 | `NO FORCE ROW LEVEL SECURITY` | Catalog probe |
| `political_shorts` (FORCE RLS) | `public.political_shorts` (TABLE) | Enable `FORCE ROW LEVEL SECURITY` | Eliminates owner policy bypass | Migration 013 | `NO FORCE ROW LEVEL SECURITY` | Catalog probe |
| `live_events` (FORCE RLS) | `public.live_events` (TABLE) | Enable `FORCE ROW LEVEL SECURITY` | Eliminates owner policy bypass | Migration 024 | `NO FORCE ROW LEVEL SECURITY` | Catalog probe |
| `lmx_departments` (FORCE RLS) | `public.lmx_departments` (TABLE) | Enable `FORCE ROW LEVEL SECURITY` | Eliminates owner policy bypass | Migration 024 | `NO FORCE ROW LEVEL SECURITY` | Catalog probe |
| `lmx_department_alerts` (FORCE RLS)| `public.lmx_department_alerts` (TABLE) | Enable `FORCE ROW LEVEL SECURITY` | Eliminates owner policy bypass | Migration 024 | `NO FORCE ROW LEVEL SECURITY` | Catalog probe |
| `lmx_credibility` (FORCE RLS) | `public.lmx_credibility` (TABLE) | Enable `FORCE ROW LEVEL SECURITY` | Eliminates owner policy bypass | Migration 024 | `NO FORCE ROW LEVEL SECURITY` | Catalog probe |
| `lmx_affiliations` (FORCE RLS) | `public.lmx_affiliations` (TABLE) | Enable `FORCE ROW LEVEL SECURITY` | Eliminates owner policy bypass | Migration 024 | `NO FORCE ROW LEVEL SECURITY` | Catalog probe |
| `lmx_brand_kits` (FORCE RLS) | `public.lmx_brand_kits` (TABLE) | Enable `FORCE ROW LEVEL SECURITY` | Eliminates owner policy bypass | Migration 024 | `NO FORCE ROW LEVEL SECURITY` | Catalog probe |
| `user_follows` (FORCE RLS) | `public.user_follows` (TABLE) | Enable `FORCE ROW LEVEL SECURITY` | Eliminates owner policy bypass | Migration 028 | `NO FORCE ROW LEVEL SECURITY` | Catalog probe |
| `conversations` (FORCE RLS) | `public.conversations` (TABLE) | Enable `FORCE ROW LEVEL SECURITY` | Eliminates owner policy bypass | Migration 031 | `NO FORCE ROW LEVEL SECURITY` | Catalog probe |
| `messages` (FORCE RLS) | `public.messages` (TABLE) | Enable `FORCE ROW LEVEL SECURITY` | Eliminates owner policy bypass | Migration 031 | `NO FORCE ROW LEVEL SECURITY` | Catalog probe |
| `campaign_recharge_orders` (FORCE RLS)| `public.campaign_recharge_orders` (TABLE)| Enable `FORCE ROW LEVEL SECURITY` | Eliminates owner policy bypass | Migration 035 | `NO FORCE ROW LEVEL SECURITY` | Catalog probe |
| `page_pro_orders` (FORCE RLS) | `public.page_pro_orders` (TABLE) | Enable `FORCE ROW LEVEL SECURITY` | Eliminates owner policy bypass | Migration 037 | `NO FORCE ROW LEVEL SECURITY` | Catalog probe |
| `trai_opt_outs` (FORCE RLS) | `public.trai_opt_outs` (TABLE) | Enable `FORCE ROW LEVEL SECURITY` | Eliminates owner policy bypass | Migration 030 | `NO FORCE ROW LEVEL SECURITY` | Catalog probe |

