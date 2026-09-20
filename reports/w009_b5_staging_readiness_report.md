# W009-B5 — Staging Provider Readiness & Controlled Sandbox Verification Report

**STATUS:** `PRE-FLIGHT / REMEDIATION / BLOCKED — STAGING DB UNREACHABLE (ENOTFOUND) & DEPLOYMENT DRIFT`  
**DATE:** 2026-09-20  
**LOCAL HEAD COMMIT:** `e8283752248bcd92fcc7297f04f4dc355d311e28`  
**ORIGIN/MASTER COMMIT:** `5784956769b37c4e0a1e52d42a6f5577af3475c6` (Local is ahead by 8 commits)  
**DEPLOYED STAGING COMMIT:** Pre-W009-B5 (`5784956` or earlier)  
**LIVE RAILWAY STAGING:** `https://kshetra-api-staging.up.railway.app`  
**LIVE SUPABASE STAGING:** `https://fkpigozcqnmcvofuksar.supabase.co`  
**PRODUCTION MUTATIONS:** STRICTLY ZERO  
**REAL FINANCIAL / TELECOM CALLS:** STRICTLY ZERO  

---

## 1. EXECUTIVE SUMMARY & CTO GATE DETERMINATION

Per **Section 2 ("STAGING CONNECTIVITY FIRST")** and **Section 11 ("FAILURE / STOP CONDITIONS")** of the W009-B5 CTO Authorization:

> *"If staging remains unreachable or DB-unconfigured: STOP PROVIDER VERIFICATION. Do not fabricate staging success from local containers. Report the exact blocker and evidence."*

Live environment inspection of the staging infrastructure revealed two primary fatal blockers:
1. **Staging Database Offline / Non-Existent:** The canonical staging database project `fkpigozcqnmcvofuksar.supabase.co` fails DNS resolution (`ENOTFOUND fkpigozcqnmcvofuksar.supabase.co`).
2. **Staging Railway API Degraded & Drifted:**
   - Database connectivity `/api/health/db` returns **503 Service Unavailable** (`SUPABASE_URL or API keys are not configured`).
   - The deployed container is running code prior to W009-B5 (`5784956` or earlier). Unauthenticated requests to `POST /api/v1/pages/:pageId/pro/order` return `200 OK` with ephemeral in-memory order identifiers, proving that W009-B5 authentication, durable persistence, and cryptographic RPC boundaries are **completely absent** from the deployed container.

In strict compliance with CTO instructions, **live provider verification has been immediately HALTED**. No simulated success was fabricated from local Docker containers.

---

## 2. STAGING RUNTIME HEALTH & CONNECTIVITY EVIDENCE

All endpoints were probed live against `https://kshetra-api-staging.up.railway.app`:

| Probe / Check | Endpoint | HTTP Status | Response Payload Summary | Evaluation |
| :--- | :--- | :---: | :--- | :--- |
| **Root Health** | `GET /` | **`200 OK`** | `{"status":"ok","service":"kshetra-api","version":"0.1.0"}` | Gateway online |
| **Container Liveness** | `GET /health` | **`200 OK`** | `{"status":"ok","service":"kshetra-api","version":"0.1.0"}` | Process responsive |
| **API Liveness** | `GET /api/health` | **`200 OK`** | `{"status":"ok","semanticType":"LIVENESS","service":"kshetra-api","version":"0.1.0","uptimeSeconds":90725,...}` | Process running ~25.2h |
| **DB Connectivity** | `GET /api/health/db` | **`503 DEGRADED`** | `{"status":"degraded","semanticType":"DATABASE CONNECTIVITY","service":"kshetra-api","connected":false,"error":"SUPABASE_URL or API keys are not configured",...}` | **FATAL BLOCKER** |
| **Readiness Probe** | `GET /api/health/ready` | **`503 DEGRADED`** | `{"status":"degraded","semanticType":"DATABASE CONNECTIVITY","service":"kshetra-api","connected":false,"error":"SUPABASE_URL or API keys are not configured",...}` | **FATAL BLOCKER** |
| **Direct Staging Supabase** | `https://fkpigozcqnmcvofuksar.supabase.co/rest/v1/` | **`FETCH FAILED`** | `ENOTFOUND fkpigozcqnmcvofuksar.supabase.co` | **FATAL BLOCKER** |

### DNS Resolution Trace for Staging Database
```text
Command: nslookup fkpigozcqnmcvofuksar.supabase.co
Result:
*** reliance.reliance can't find fkpigozcqnmcvofuksar.supabase.co: Non-existent domain
Server: reliance.reliance
```

---

## 3. DEPLOYMENT DRIFT AUDIT

The deployed Railway container was audited against the repository commit chain:

```text
Repository Commit Chain:
e828375 (HEAD) - docs(reports): update secret provisioning evidence report and runtime persistence results (W009-B5-R4)
6cd888a - docs(reports): document secret provisioning evidence and lifecycle for W009-B5-R4
126011a - feat(pages): remediate secret trust-boundary and isolate internal payment secrets (W009-B5-R4)
9497ea8 - feat(pages): enforce cryptographic verification invariant at transaction boundary (W009-B5-R4)
5b244bb - docs(w009-b5): close durable payment persistence acceptance evidence gaps
0cad936 - feat(pages): implement durable payment persistence and atomic RPC verification (W009-B5-R4)
9f05e84 - fix(pages): isolate test auth below http boundary and enforce payment association (W009-B5-R2)
7119f30 - fix(pages): remediate pro payment signature bypass and add authentication (DEF-B5-PAY-01, DEF-B5-PAY-02)
5784956 (origin/master) - docs(w009-b4): reconcile bill opinion and rti upvote persistence targets in strangler reports
```

### Runtime Drift Evidence:
1. **Unauthenticated Order Creation:**
   - **Probed Request:** `POST https://kshetra-api-staging.up.railway.app/api/v1/pages/test/pro/order` with empty body `{}` and NO `Authorization` header.
   - **Observed Response:** `200 OK`
     ```json
     {
       "success": true,
       "orderId": "order_1789898210287_z42l7s",
       "amount": 49900,
       "currency": "INR",
       "billingCycle": "monthly",
       "key": "rzp_test_placeholderKey123",
       "isSandbox": true
     }
     ```
   - **Repository Implementation (Commits `7119f30` through `e828375`):**
     Requires GoTrue bearer token authentication. Unauthenticated requests strictly return `401 Unauthorized` (`AUTH_REQUIRED`).
   - **Conclusion:** Railway staging is running legacy code prior to `7119f30` (likely `5784956` or earlier).

2. **Durable Database Persistence & Verification RPC:**
   - Because staging has no database connection (`connected: false`), migration `037_page_pro_orders.sql`, table `page_pro_orders`, table `internal_payment_secrets`, and RPC `verify_and_activate_page_pro` cannot be present or verified on the deployed staging database.

---

## 4. INVENTORY OF BLOCKERS

| Blocker ID | Description | Root Cause | Impact |
| :--- | :--- | :--- | :--- |
| **BLK-STG-01** | Staging Supabase DB Non-Existent | Domain `fkpigozcqnmcvofuksar.supabase.co` returns `ENOTFOUND` | Zero live DB connectivity; migrations 001–037 cannot be audited on staging DB |
| **BLK-STG-02** | Staging Railway API DB Degraded | `SUPABASE_URL` / keys unconfigured or pointing to missing project | `/api/health/db` and `/api/health/ready` fail with 503 |
| **BLK-STG-03** | Staging Deployment Drift | Railway staging deployed commit is `5784956` or older | W009-B5-R1 through R4 code is not active on staging |
| **BLK-STG-04** | Remote Branch Synchronization | Local `master` is 8 commits ahead of `origin/master` | Railway auto-deploy triggers track remote git, preventing live deployment of W009-B5 until pushed |

---

## 5. STATUTORY & SAFETY AUDIT

1. **Production Mutations:** 0 (Zero staging or production database records altered).
2. **Real Financial Transactions:** 0 (No live calls to Razorpay API).
3. **Real Telecom Dispatch:** 0 (No live calls to Exotel or telecom carriers).
4. **Secret Handling:** Zero credentials or secrets logged or embedded.

---

## 6. FINAL CTO GATE SUBMISSION

In accordance with CTO Instruction Section 2, Section 11, and Section 12:
Live provider readiness verification cannot proceed until staging infrastructure is provisioned with a reachable database and reconciled with the accepted W009-B5-R4 codebase.

**FINAL STATUS:**  
`PRE-FLIGHT / REMEDIATION / BLOCKED — STAGING DB UNREACHABLE (ENOTFOUND) & DEPLOYMENT DRIFT`
