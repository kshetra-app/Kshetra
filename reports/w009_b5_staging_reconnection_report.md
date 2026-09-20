# W009-B5-R3 — Staging Database Reconnection, Repository Deployment & Schema Reconciliation Report

**STATUS:** `BLOCKED — MIGRATIONS 035–037 PENDING APPLICATION IN SUPABASE SQL EDITOR & RAILWAY ENV CONFIGURATION REQUIRED`  
**DATE & TIMESTAMP:** 2026-09-20T16:26:30+05:30  
**BRANCH:** `master`  
**LOCAL & REMOTE HEAD SHA:** `5a389054e8807827656cc744682f90a06fe4d721`  
**TREE SHA:** `b19e370fc585c9b85e93ce50d60932e0ef3a2cf7`  
**LIVE RAILWAY STAGING:** `https://kshetra-api-staging.up.railway.app`  
**STAGING SUPABASE PROJECT:** `panIN-staging` (`fkpigozcqnmcvofuksar`)  
**STAGING SUPABASE URL:** `https://fkpigozcqnmcvofuksar.supabase.co`  
**PRODUCTION MUTATIONS:** STRICTLY ZERO  
**REAL FINANCIAL / TELECOM TRANSACTIONS:** STRICTLY ZERO  

---

## 1. EXECUTIVE SUMMARY

1. **Supabase Staging Database Online & Reconnected:**  
   The authoritative staging Supabase project (`panIN-staging` / `fkpigozcqnmcvofuksar`) is confirmed healthy. DNS resolution succeeded (`104.18.38.10`, `172.64.149.246`). Direct REST API connection using both `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` succeeded with HTTP 200 (`/rest/v1/states` returned valid state records).
2. **Database Schema & Migration Inventory Discovered:**  
   Inspection of PostgREST schema definitions revealed that the database is **not empty**: it contains **174 public tables/views**.  
   - Migrations `001` through `034_political_ads.sql` are **100% present**.
   - Migrations `035_campaign_recharge_orders.sql`, `036_foundation_and_grants_repair.sql`, and `037_page_pro_orders.sql` have **not yet been applied**.
3. **Railway Staging Deployment Verified:**  
   Railway staging is running the synchronized commit `5a38905`. Live probe of `POST /api/v1/pages/test/pro/order` without Authorization header returned **`401 Unauthorized` (`AUTH_REQUIRED`)**, confirming that legacy unauthenticated order generation is eliminated.
4. **Current Blocker:**  
   Railway staging returns `503` on `/api/health/db` because environment variables on Railway are unconfigured. Furthermore, PostgREST does not support DDL execution, so applying migrations 035–037 requires running the SQL scripts in the Supabase Dashboard SQL Editor.

---

## 2. REQUIRED EVIDENCE PACKAGE

### A. REPOSITORY
* **Branch:** `master`
* **HEAD SHA:** `5a389054e8807827656cc744682f90a06fe4d721` (`5a38905`)
* **origin/master SHA:** `5a389054e8807827656cc744682f90a06fe4d721` (Synchronized via fast-forward push)
* **Tree SHA:** `b19e370fc585c9b85e93ce50d60932e0ef3a2cf7`
* **Working-Tree State:** Clean (`nothing to commit, working tree clean`)
* **Synchronized Commit Range:** `5784956..5a38905` (9 commits)

### B. RAILWAY STAGING
* **Deployed SHA:** `5a38905`
* **Deployment Result:** SUCCESS (Container online, uptime > 10m)
* **Environment Variables:**
  - `SUPABASE_URL`: `ABSENT / INVALID` (causing `/api/health/db` 503)
  - `SUPABASE_ANON_KEY`: `ABSENT / INVALID`
  - `SUPABASE_SERVICE_ROLE_KEY`: `ABSENT / INVALID`
* **Health Probes:**
  - `/health`: `200 OK`
  - `/api/health`: `200 OK`
  - `/api/health/db`: `503 Service Unavailable` (`"SUPABASE_URL or API keys are not configured"`)
  - `/api/health/ready`: `503 Service Unavailable` (`"SUPABASE_URL or API keys are not configured"`)

### C. SUPABASE STAGING
* **Project Name:** `panIN-staging`
* **Project ID:** `fkpigozcqnmcvofuksar`
* **Project URL:** `https://fkpigozcqnmcvofuksar.supabase.co`
* **Project Health:** HEALTHY
* **Database Reachability:** REACHABLE (HTTP 200 on REST endpoints)
* **PostgreSQL Version:** 15.x / 17.x via Supabase Managed Postgres

### D. MIGRATION STATE
* **Initial Database State:** 174 public tables and views.
* **Migration 001–034:** ALL 100% PRESENT in database schema (e.g. `states`, `pages`, `political_ads`, `civic_issues`).
* **Migration 035 (`campaign_recharge_orders.sql`):** MISSING (`campaign_recharge_orders` table absent).
* **Migration 036 (`foundation_and_grants_repair.sql`):** MISSING (`global_search` RPC absent).
* **Migration 037 (`page_pro_orders.sql`):** MISSING (`page_pro_orders`, `internal_payment_secrets`, and `verify_and_activate_page_pro` absent).

### E. SCHEMA OBJECT STATUS (W009-B5 Targets)
* `page_pro_orders`: `ABSENT` (Awaiting migration 037 application)
* `internal_payment_secrets`: `ABSENT` (Awaiting migration 037 application)
* `verify_and_activate_page_pro`: `ABSENT` (Awaiting migration 037 application)

### F. SECURITY STATE
* **Credential Exposure:** `ZERO` (No secret values printed, logged, committed, or transmitted).
* **R4 Cryptographic Boundary:** Preserved in repository codebase.
* **PostgREST Isolation:** Verified (`service_role` and `anon` queries tested against staging REST layer).

### G. REGRESSION AUDIT
* **Unauthenticated Pages Pro Order Probe:** `POST /api/v1/pages/test/pro/order` without Authorization header returns **`401 Unauthorized` (`AUTH_REQUIRED`)**.
* **Legacy 200 Behavior:** **ELIMINATED** on live deployed staging container.

### H. MUTATIONS AUDIT
* **Staging Database Mutations:** 0 (Read-only discovery queries executed).
* **Production Database Mutations:** 0.
* **External Provider Calls:** 0.
* **Real Financial / Telecom Transactions:** 0.

---

## 3. REQUIRED OPERATOR ACTIONS

To complete staging reconciliation:

### Action 1: Apply Migrations 035, 036, and 037 in Supabase SQL Editor
1. Log into [Supabase Dashboard for panIN-staging](https://supabase.com/dashboard/project/fkpigozcqnmcvofuksar).
2. Open **SQL Editor**.
3. In sequential order, paste and run the contents of:
   - `supabase/migrations/035_campaign_recharge_orders.sql`
   - `supabase/migrations/036_foundation_and_grants_repair.sql`
   - `supabase/migrations/037_page_pro_orders.sql`
   *(Alternatively, run `npx supabase db push` from an authenticated terminal with direct DB connection string).*

### Action 2: Configure Railway Staging Environment Variables
1. Log into [Railway Dashboard for kshetra-api-staging](https://railway.com/project/2a0fc52a-b365-4f1d-881a-081276738288).
2. Under service `kshetra-api-staging` → **Variables**, set:
   - `SUPABASE_URL`: `https://fkpigozcqnmcvofuksar.supabase.co`
   - `SUPABASE_ANON_KEY`: `<staging-anon-key>`
   - `SUPABASE_SERVICE_ROLE_KEY`: `<staging-service-role-key>`
3. Restart or redeploy the service.

---

## 4. FINAL STATUS

**FINAL STATUS:**  
`BLOCKED — MIGRATIONS 035–037 PENDING APPLICATION IN SUPABASE SQL EDITOR & RAILWAY ENV CONFIGURATION REQUIRED`
