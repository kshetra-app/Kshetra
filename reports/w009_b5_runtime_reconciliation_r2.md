# W009-B5-R3A-R2 — Final Runtime Environment Reconciliation Forensic Report

**AUTHORITY:** CTO Direction W009-B5-R3A-R2  
**DATE & TIMESTAMP:** 2026-09-20T17:52:00+05:30  
**CANONICAL REPOSITORY:** `kshetra-app/Kshetra`  
**BRANCH:** `master`  
**HEAD COMMIT:** `ffaf92bf447ba8971df072a67b072f51ce5a1548` (`ffaf92b`)  
**ORIGIN/MASTER:** `ffaf92bf447ba8971df072a67b072f51ce5a1548` (`ffaf92b`)  
**WORKING TREE:** Clean  
**RAILWAY PROJECT:** `cooperative-education`  
**RAILWAY ENVIRONMENT:** `Staging`  
**RAILWAY SERVICE:** `kshetra-api`  
**ACTIVE DEPLOYMENT ID:** `d3ebcadd`  
**DEPLOYMENT URL:** `https://kshetra-api-staging.up.railway.app`  
**FINAL CLASSIFICATION:** `A. RUNTIME_ENV_INJECTED_BUT_VALIDATION_FAILS` (with `RUNTIME_VARIABLE_PRESENCE = UNKNOWN` per Item 8)

---

## 1. SOURCE CODE AUDIT AT CURRENTLY DEPLOYED COMMIT

### A. Configuration & Supabase Initialization Module
* **File:** [`apps/api/src/lib/supabase.ts`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/apps/api/src/lib/supabase.ts#L1-L51)
* **Lines 1–29:**
  ```typescript
  import { createClient, type SupabaseClient } from '@supabase/supabase-js';

  const supabaseUrl = process.env.SUPABASE_URL ?? '';
  const rawServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  const rawAnonKey = (process.env.SUPABASE_ANON_KEY ?? '').trim();

  // A valid Supabase key is either:
  // 1. New Supabase API Key format: sb_secret_... (service role) or sb_publishable_... (anon)
  // 2. Legacy Supabase JWT format: header.payload.signature (3 dot-separated parts)
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

  // Prefer service_role key if valid (JWT or sb_secret_); fall back to anon key to prevent total DB outage
  const resolvedKey = hasValidServiceKey
    ? rawServiceKey
    : (hasValidAnonKey ? rawAnonKey : (rawServiceKey || 'placeholder-key'));

  export let isSupabaseConfigured = !!(supabaseUrl && (hasValidServiceKey || hasValidAnonKey));
  export const isUsingServiceRole = hasValidServiceKey;
  ```

### B. Health Probe Module
* **File:** [`apps/api/src/routes/health.ts`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/apps/api/src/routes/health.ts#L30-L40)
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

---

## 2. HOW ENVIRONMENT VARIABLES ARE READ AND VALIDATED

| Variable Name | Reading Mechanism | Normalization | Exact Validation Condition |
| :--- | :--- | :--- | :--- |
| `SUPABASE_URL` | `process.env.SUPABASE_URL ?? ''` | None | `!!supabaseUrl` (non-empty string check). No regex or protocol validation. |
| `SUPABASE_SERVICE_ROLE_KEY` | `process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''` | `.trim()` | `isValidSupabaseKey(rawServiceKey, 'service')`<br>• Must be non-empty string<br>• Must start with `sb_secret_` **OR** `trimmed.split('.').length === 3` |
| `SUPABASE_ANON_KEY` | `process.env.SUPABASE_ANON_KEY ?? ''` | `.trim()` | `isValidSupabaseKey(rawAnonKey, 'anon')`<br>• Must be non-empty string<br>• Must start with `sb_publishable_`, start with `sb_secret_`, **OR** `trimmed.split('.').length === 3` |

---

## 3. CONFIGURATION LOADER MECHANISM

* **Loader Type:** Standard Node.js `process.env` directly evaluated at module import time.
* **Dotenv / Configuration Loader:** None in production (`apps/api` does not invoke `dotenv.config()` in production).
* **Container Runtime:** The container is built via `Dockerfile` and launched via:
  `CMD ["npx", "tsx", "apps/api/src/server.ts"]`
  Node inherits the container runtime environment variables injected by Railway at container start.
* **Build-time Substitution:** None. Variables are strictly runtime `process.env` lookups.

---

## 4 & 5. COMMIT SHA IDENTIFICATION FOR ACTIVE DEPLOYMENT `d3ebcadd`

* **Operator Observation:**
  - Active deployment: `d3ebcadd`
  - Repository: `kshetra-app/Kshetra`
  - Branch: `master`
  - Commit message: `docs(reports): document Railway runtime environment reconciliation findings (W009-B5-R3A-R1)`
* **Git Repository Verification:**
  - `git log -1 ffaf92bf447ba8971df072a67b072f51ce5a1548 --oneline`:
    `ffaf92b docs(reports): document Railway runtime environment reconciliation findings (W009-B5-R3A-R1)`
* **Conclusion:**
  Active deployment `d3ebcadd` strictly corresponds to commit **`ffaf92bf447ba8971df072a67b072f51ce5a1548`** (`ffaf92b`).

---

## 6. ACTIVE DEPLOYMENT SOURCE DRIFT VERIFICATION

* **Git Comparison:**
  - `local HEAD`: `ffaf92bf447ba8971df072a67b072f51ce5a1548`
  - `origin/master`: `ffaf92bf447ba8971df072a67b072f51ce5a1548`
  - Diff between local and remote master: 0 commits (clean).
* **Live HTTP Telemetry Verification:**
  - `GET /api/health`: Returns HTTP 200, `service: "kshetra-api"`, `version: "0.1.0"`.
  - `POST /api/v1/pages/test/pro/order`: Returns HTTP 401 `AUTH_REQUIRED` (confirms new authenticated flow from W009-B5, unauthenticated legacy bypass eliminated).
  - `GET /api/v1/lmx/status`: Returns `{ status: "operational", mediaPlane: "self_hosted", aiService: "inactive", supabase: "offline" }`.
* **Conclusion:** The active deployment contains the exact current source expected from `origin/master`. No deployment drift.

---

## 7 & 8. RUNTIME VARIABLE PRESENCE REPORTING

Railway CLI is unauthenticated on the host (`Unauthorized. Please run 'railway login' again`).  
The API contains no debug endpoint exposing process environment variables.

In strict compliance with **Mandate Item 8** (*"If runtime inspection cannot safely establish variable presence, report: RUNTIME_VARIABLE_PRESENCE = UNKNOWN. Do not infer absence merely because /api/health/db returns 503"*):

* `RUNTIME_VARIABLE_PRESENCE` = **`UNKNOWN`**
* `SUPABASE_URL_PRESENT` = **`UNKNOWN`**
* `SUPABASE_ANON_KEY_PRESENT` = **`UNKNOWN`**
* `SUPABASE_SERVICE_ROLE_KEY_PRESENT` = **`UNKNOWN`**

---

## 9. FALSE NEGATIVE & VALIDATION LOGIC ANALYSIS

Detailed inspection of `isValidSupabaseKey` and initialization dynamics:

1. **URL Validation (`!!supabaseUrl`):**
   - Does not perform URL schema or regex parsing. Any non-empty string evaluates to `true`.
   - Cannot produce a false negative on valid URLs.
2. **Key Validation (`isValidSupabaseKey`):**
   - **Legacy Supabase API Keys (JWTs):** Evaluates `trimmed.split('.').length === 3`. Standard Supabase JWTs (`header.payload.signature`) return `true`.
   - **Modern Supabase API Keys:** Keys starting with `sb_secret_` return `true` for service role. Keys starting with `sb_publishable_` or `sb_secret_` return `true` for anon.
   - **Rejected Non-API-Key Strings (Intended Safeguards, but potential operator entry mismatch):**
     - Supabase Personal Access Tokens (`sbp_...` from Account Settings): Evaluates to `false` (0 dots, does not start with `sb_secret_` or `sb_publishable_`).
     - PostgreSQL Database Password: Evaluates to `false` (0 dots).
     - Supabase Project Reference ID (`fkpigozcqnmcvofuksar`): Evaluates to `false` (0 dots).
     - PostgreSQL Connection String (`postgresql://postgres:...`): Evaluates to `false` (contains fewer or more than 2 dots).
     - Truncated JWT (e.g. copied without full signature): Evaluates to `false` (`split('.').length !== 3`).
     - Key names entered as values (e.g. `SUPABASE_URL=https://...`): Evaluates to `false`.
3. **Module Initialization Order:**
   - In Node.js / Docker, container environment variables are injected into the process environment before PID 1 begins execution.
   - Module top-level variables evaluate synchronously on initial import. There is no race condition between environment injection and module loading.

---

## 10. SIMULTANEOUS VS. EITHER KEY REQUIREMENT

* **Code Verification ([`apps/api/src/lib/supabase.ts#L27`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/apps/api/src/lib/supabase.ts#L27)):**
  ```typescript
  export let isSupabaseConfigured = !!(supabaseUrl && (hasValidServiceKey || hasValidAnonKey));
  ```
* **Determination:**
  - `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are **NOT** required simultaneously.
  - Having `SUPABASE_URL` AND **either** a valid `SUPABASE_SERVICE_ROLE_KEY` **OR** a valid `SUPABASE_ANON_KEY` is sufficient for `isSupabaseConfigured` to evaluate to `true`.
  - If `SUPABASE_SERVICE_ROLE_KEY` is missing or invalid, but `SUPABASE_ANON_KEY` is valid, the server falls back to `SUPABASE_ANON_KEY` with a warning, and `isSupabaseConfigured` remains `true`.

---

## 11. REQUIRED FINAL CLASSIFICATION & EVIDENCE

**Selected Classification:**  
### `A. RUNTIME_ENV_INJECTED_BUT_VALIDATION_FAILS`
*(with `RUNTIME_VARIABLE_PRESENCE = UNKNOWN` empirically observed per Item 8)*

### Forensic Evidence:
1. **Deployment Metadata:** The operator has authoritatively confirmed that the active deployment `d3ebcadd` in the Railway dashboard explicitly displays the 5 variables:
   `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `NODE_ENV`, `PORT`.
2. **Variable Name Conformance:** The variable names in Railway match the exact names read by `apps/api/src/lib/supabase.ts`.
3. **Container Code Conformance:** The container is running commit `ffaf92b`, where `isSupabaseConfigured` requires `supabaseUrl` and at least one valid key passing `isValidSupabaseKey`.
4. **Validation Logic Rigidity:** `isValidSupabaseKey` rejects any string that is not either a 3-part dot-separated JWT or prefixed with `sb_secret_` / `sb_publishable_`. If what was copied into Railway from the Supabase dashboard was an account token (`sbp_...`), a database password, a project reference ID, or a truncated string, Railway injects it into `process.env`, but `isValidSupabaseKey` evaluates to `false`, causing `isSupabaseConfigured` to evaluate to `false`.

*(Note: If Railway's Docker runtime container somehow failed to expose the 5 dashboard variables to PID 1, the classification would be `B. RUNTIME_ENV_NOT_INJECTED`. However, because direct container `process.env` inspection is unobservable without credentials, empirical status remains `RUNTIME_VARIABLE_PRESENCE = UNKNOWN` per Item 8).*

---

## 12. EXACT OPERATOR ACTION (ONLY IF REQUIRED)

Per CTO instruction:  
*"DO NOT ask the operator to re-enter, delete, recreate, or modify these variables."*  
*"Do not execute migrations 035/036/037."*  
*"Stop for CTO review."*

No operator mutations are requested. The investigation is complete and awaiting CTO determination.

---

## 13. STATUTORY SAFETY AFFIRMATIONS

1. **Application Code:** 0 lines modified.
2. **Railway Variables:** 0 modifications made.
3. **Supabase Database:** 0 mutations made.
4. **Migrations 035–037:** Not executed (strictly blocked).
5. **Real Providers:** 0 calls to Razorpay, Exotel, or financial APIs.
6. **Secrets:** 0 secrets exposed.
7. **Acceptance:** No self-acceptance.
