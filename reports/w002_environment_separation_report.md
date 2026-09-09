# W002: STAGING / PRODUCTION ENVIRONMENT SEPARATION REPORT

**Governance Authority:** Master Execution Framework Amendment v1.2 (Rule IV-001, Parts 7 & 8)  
**Job ID:** `W002`  
**Job Title:** Staging / Production Environment Separation  
**Repository:** `https://github.com/kshetra-app/Kshetra.git`  
**Canonical Branch:** `master`  
**Timestamp:** `2026-09-09T09:22:00+05:30`  
**Owner:** DEVOPS + ARCH  

---

## 1. Executive Summary

Job **W002** establishes formal architectural and configuration separation between **Development**, **Staging**, and **Production** environments across both the backend Fastify API and the Expo mobile application.

### Objectives Accomplished:
1. **Canonical Environment Definitions:** Created [`packages/shared/src/config/environments.ts`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/packages/shared/src/config/environments.ts) defining strict configuration boundaries, URL targets, and CORS partitions for `development`, `staging`, `production`, and `test`.
2. **Mobile Environment Adapter:** Created [`apps/mobile/lib/environment.ts`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/apps/mobile/lib/environment.ts) providing strongly-typed environment flags (`IS_PRODUCTION`, `IS_STAGING`, `IS_DEVELOPMENT`) and isolated endpoints.
3. **Dedicated Configuration Templates:**
   - [`apps/api/.env.staging.example`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/apps/api/.env.staging.example)
   - [`apps/api/.env.production.example`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/apps/api/.env.production.example)
   - [`apps/mobile/.env.staging.example`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/apps/mobile/.env.staging.example)
   - [`apps/mobile/.env.production.example`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/apps/mobile/.env.production.example)
4. **Partitioned CORS & URL Routing:** Prohibited cross-talk between staging and production domains. Production API does not authorize staging origins; local development cannot perform unauthenticated writes to production Supabase.
5. **Automated Verification:** Authored and verified [`tests/environment-separation.test.mjs`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/tests/environment-separation.test.mjs), and confirmed zero-error TypeScript builds across `@kshetra/shared`, `@kshetra/api`, and `@kshetra/mobile`.

---

## 2. Environment Configuration Matrix

| Attribute | Development | Staging | Production | Test |
| :--- | :--- | :--- | :--- | :--- |
| **API Base URL** | `http://localhost:3001` | `https://staging-api.kshetra.in` | `https://kshetra-api-production-9f06.up.railway.app` | `http://127.0.0.1:3001` |
| **Supabase URL** | `http://localhost:54321` | `https://staging-db.kshetra.in` | `https://cxhyqjfelcwkavbqwqap.supabase.co` | `http://127.0.0.1:54321` |
| **Allowed Origins** | `localhost:3000, 8081, 19006, 5173` | `staging.kshetra.in, staging.panin.in` | `kshetra.in, www.kshetra.in, panin.in, www.panin.in, kshetra.app, www.kshetra.app` | `*` |
| **isProduction** | `false` | `false` | `true` | `false` |
| **isStaging** | `false` | `true` | `false` | `false` |
| **isDevelopment**| `true` | `false` | `false` | `false` |

---

## 3. Automated Test Reproduction

| Test Suite | Command | Exit Code | Result |
| :--- | :--- | :---: | :--- |
| **Environment Separation Suite** | `npx tsx tests/environment-separation.test.mjs` | `0` | **PASS** (4/4 assertions passed) |
| **Shared Package Compilation** | `npm run build --prefix packages/shared` | `0` | **PASS** (0 errors) |
| **Fastify API TypeScript Build** | `npm run build --prefix apps/api` | `0` | **PASS** (0 errors) |
| **Expo Mobile App Typecheck** | `npm run typecheck --prefix apps/mobile` | `0` | **PASS** (0 errors) |

---

## 4. Defect State Posture

* **DEF-009 (Service-Role Auth):** Remains `OPEN / HUMAN ACTION REQUIRED`. Defensive anon-key fallback remains active.
* **DEF-010 (CORS Configuration):** Remains `RESOLVED IN CODE / PENDING DEPLOYMENT`. The committed code in `apps/api/src/server.ts` handles all production domains cleanly. Live container redeployment requires refreshing the Railway authentication token.
* **DEF-011 (Civic Schema):** `CLOSED (INVALID DEFECT)`.
* **DEF-012 (13-Language Parity):** Remains `OPEN`. Blocks consumer mobile release (Launch Gate A).

---

## 5. Summary & Next Steps

Job W002 is fully implemented and tested. Following git commit and push, independent verification can review the environment separation artifacts.
