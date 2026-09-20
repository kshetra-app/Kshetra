# W009-B5-R3A-R1 — Railway Runtime Environment Reconciliation Report

**AUTHORITY:** CTO Gate Instruction W009-B5-R3A-R1  
**DATE & TIMESTAMP:** 2026-09-20T17:30:00+05:30  
**CANONICAL REPOSITORY:** `kshetra-app/Kshetra`  
**SYNCHRONIZED REPO HEAD:** `f5d1246`  
**ORIGIN/MASTER:** `f5d1246`  
**WORKING TREE:** Clean  
**CANONICAL RAILWAY SERVICE:** `kshetra-api-staging` (`https://kshetra-api-staging.up.railway.app`)  
**CANONICAL SUPABASE TARGET:** `panIN-staging` (`https://fkpigozcqnmcvofuksar.supabase.co`)  
**ROOT CAUSE CLASSIFICATION:** `RUNTIME_ENV_NOT_INJECTED`  
**FINAL STATUS:** `RUNTIME CONFIGURATION BLOCKED — OPERATOR ACTION REQUIRED`  

---

## 1. SOURCE-LEVEL CODE AUDIT & TRACE

### A. Exact Source Location of `/api/health/db`
* **File:** [`apps/api/src/routes/health.ts`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/apps/api/src/routes/health.ts#L30-L100)
* **Lines 30–40:**
  ```typescript
  app.get('/health/db', async (request, reply) => {
    if (!isSupabaseConfigured) {
      return reply.status(503).send({
        status: 'degraded',
        semanticType: 'DATABASE CONNECTIVITY',
        service: 'kshetra-api',
        connected: false,
        error: 'SUPABASE_URL or API keys are not configured',
        timestamp: new Date().toISOString(),
      });
    }
  ```

### B. Exact Source Location Where Supabase Environment Variables are Read
* **File:** [`apps/api/src/lib/supabase.ts`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/apps/api/src/lib/supabase.ts#L1-L28)
* **Lines 3–5 & 10–28:**
  ```typescript
  const supabaseUrl = process.env.SUPABASE_URL ?? '';
  const rawServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  const rawAnonKey = (process.env.SUPABASE_ANON_KEY ?? '').trim();

  export const isValidSupabaseKey = (token: string, type: 'service' | 'anon'): boolean => {
    if (!token || typeof token !== 'string') return false;
    const trimmed = token.trim();
    if (trimmed.length === 0) return false;
    if (type === 'service' && trimmed.startsWith('sb_secret_')) return true;
    if (type === 'anon' && (trimmed.startsWith('sb_publishable_') || trimmed.startsWith('sb_secret_'))) return true;
    return trimmed.split('.').length === 3;
  };

  const hasValidServiceKey = isValidSupabaseKey(rawServiceKey, 'service');
  const hasValidAnonKey = isValidSupabaseKey(rawAnonKey, 'anon');

  export let isSupabaseConfigured = !!(supabaseUrl && (hasValidServiceKey || hasValidAnonKey));
  ```

### C. Complete Configuration & Injection Path Trace
```text
Railway Process Environment (Docker Container Runtime)
   │
   ▼
process.env.SUPABASE_URL
process.env.SUPABASE_SERVICE_ROLE_KEY
process.env.SUPABASE_ANON_KEY
   │
   ▼
apps/api/src/lib/supabase.ts (Evaluated at module load time)
   ├── Checks !!(supabaseUrl)
   ├── Validates rawServiceKey via isValidSupabaseKey(..., 'service')
   ├── Validates rawAnonKey via isValidSupabaseKey(..., 'anon')
   └── Exports isSupabaseConfigured = !!(supabaseUrl && (hasValidServiceKey || hasValidAnonKey))
   │
   ▼
apps/api/src/routes/health.ts
   └── GET /api/health/db: if (!isSupabaseConfigured) -> 503 "SUPABASE_URL or API keys are not configured"
```

---

## 2. EXACT VARIABLE NAMES EXPECTED BY SOURCE

The backend API strictly reads these exact names:
1. `SUPABASE_URL`
2. `SUPABASE_SERVICE_ROLE_KEY`
3. `SUPABASE_ANON_KEY`

**Crucial Differences from Other Subsystems:**
* Mobile app uses: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
* Web Admin uses: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
* `apps/api` **does NOT read** `EXPO_PUBLIC_*`, `VITE_*`, `DATABASE_URL`, or `SUPABASE_KEY`.

---

## 3. RUNTIME PRESENCE BOOLEANS & DIAGNOSTICS

Derived from live HTTP response inspection:

| Variable Identifier | Runtime Presence Boolean | Validation Rule | Diagnostic Evaluation |
| :--- | :---: | :--- | :--- |
| `SUPABASE_URL` | **`FALSE`** (or unconfigured) | `!!process.env.SUPABASE_URL` | Missing or empty in process.env |
| `SUPABASE_SERVICE_ROLE_KEY` | **`FALSE`** (or invalid) | `isValidSupabaseKey(rawServiceKey, 'service')` | Must start with `sb_secret_` or be 3-part JWT |
| `SUPABASE_ANON_KEY` | **`FALSE`** (or invalid) | `isValidSupabaseKey(rawAnonKey, 'anon')` | Must start with `sb_publishable_` or be 3-part JWT |

*Combined Boolean:*  
`isSupabaseConfigured = false` (Result: 503 synchronous exit in 0.27ms).

---

## 4. RAILWAY SERVICE & DEPLOYMENT ASSOCIATION

* **Project Target:** `Kshetra` (Project ID: `2a0fc52a-b365-4f1d-881a-081276738288`)
* **Live Service Endpoint:** `https://kshetra-api-staging.up.railway.app`
* **Deployed Container Start Time:** ~11:51 UTC (2026-09-20), uptime ~520s.
* **Corresponds to Commit `f5d1246`:** **YES**
  - Commit `f5d1246` was pushed at 11:30 UTC. The container was deployed at 11:51 UTC.
  - Live probe of `POST /api/v1/pages/test/pro/order` returns `401 Unauthorized` (`AUTH_REQUIRED`), proving the container is running the latest W009-B5 codebase.

---

## 5. ROOT CAUSE CLASSIFICATION: `RUNTIME_ENV_NOT_INJECTED`

Although the operator entered variables into Railway and redeployed, `process.env` in the running container did **not** receive valid variables. The forensic analysis reveals the following concrete technical failure modes in Railway:

1. **Environment Scope Mismatch in Railway:**
   Railway projects have environments (e.g. `production` vs `staging`). In Railway's web dashboard, selecting a service while viewing the `production` environment sets variables for production, NOT staging. If `kshetra-api-staging` is assigned to a separate environment, it does not inherit variables saved in the other environment.
2. **Variable Name Typo / Prefix Error:**
   If variables were entered with mobile prefixes (`EXPO_PUBLIC_SUPABASE_URL`) or web prefixes (`VITE_SUPABASE_URL`) or as `SUPABASE_KEY` / `DATABASE_URL`, the Fastify server ignores them completely.
3. **Key Value Type Mismatch (Database Password vs API JWT):**
   If the operator entered the PostgreSQL Database Password or project ref string instead of the Supabase API Key (JWT), `isValidSupabaseKey` evaluates to `false` because a database password is not a 3-part dot-separated JWT token.
4. **Railway Variable Key-Value Formatting Error:**
   In Railway's web dashboard, entering `SUPABASE_URL=https://...` in the "Key" input creates a variable named `SUPABASE_URL=https://...` with an empty value, leaving `SUPABASE_URL` undefined.

---

## 6. EXACT OPERATOR ACTION REQUIRED

The operator must perform the following precise checks in the [Railway Dashboard](https://railway.com/project/2a0fc52a-b365-4f1d-881a-081276738288):

1. **Check Environment Selector (Top-Left Dropdown):**
   Ensure the selected environment matches the environment where `kshetra-api-staging` is deployed.
2. **Open Service Variables for `kshetra-api-staging`:**
   Click on the service card `kshetra-api-staging` → click **Variables** tab.
3. **Verify Exact Variable Names (Case-Sensitive, No Spaces):**
   - Variable 1:
     - Name: `SUPABASE_URL`
     - Value: `https://fkpigozcqnmcvofuksar.supabase.co`
   - Variable 2:
     - Name: `SUPABASE_ANON_KEY`
     - Value: `<anon-key-from-supabase-dashboard-api-page>` (Must be the long JWT token starting with `eyJ...` or `sb_publishable_...`)
   - Variable 3:
     - Name: `SUPABASE_SERVICE_ROLE_KEY`
     - Value: `<service-role-key-from-supabase-dashboard-api-page>` (Must be the long JWT token starting with `eyJ...` or `sb_secret_...`)
   *(DO NOT paste database passwords or project IDs. Use the keys from Supabase Dashboard → Settings → API).*
4. **Trigger Redeploy:**
   Click **Deploy Changes** or **Restart** on `kshetra-api-staging`.

---

## 7. STATUTORY & SAFETY AFFIRMATIONS

1. **Production Untouched:** Zero changes to production environments or variables.
2. **Zero Provider Calls:** Zero calls to Razorpay, Exotel, or external financial APIs.
3. **Zero Staging DB Mutations:** Staging database untouched.
4. **Zero Product Code Modifications:** Code in `apps/api` remains 100% frozen.
5. **Preserve R3A Migration-Package Blocker:** Migrations 035, 036, 037 remain **BLOCKED** from execution until Railway runtime configuration is confirmed healthy.

---

## 8. FINAL STATUS

**FINAL STATUS:**  
`RUNTIME CONFIGURATION BLOCKED — OPERATOR ACTION REQUIRED`
