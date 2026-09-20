# W009-B5-R4 — SECRET PROVISIONING ARCHITECTURE & OPERATIONAL CLOSURE REPORT

**AUTHORITY:** CTO Security Review & Cryptographic Architecture Gate  
**STATUS:** `W009-B5-R4 — SECURITY IMPLEMENTATION VERIFIED / PROVISIONING MECHANISM VERIFIED / AWAITING CTO ACCEPTANCE`  
**COMMIT:** (Recorded upon commit of this closure package)  
**TREE:** (Recorded upon commit of this closure package)  
**WORKING TREE STATE:** Clean  
**STAGING MUTATION:** NOT AUTHORIZED (Zero live staging executions)  
**PRODUCTION MUTATION:** STRICTLY PROHIBITED  
**REAL RAZORPAY / TELECOM:** STRICTLY PROHIBITED  

---

## 1. INFRASTRUCTURE CAPABILITY MATRIX

An exhaustive discovery inspection of the repository, deployment manifests, Supabase configuration, and runbooks was conducted:

| Infrastructure Facility | Repository & Configuration Evidence | Operational Availability | Candidate Assessment |
| :--- | :--- | :--- | :--- |
| **Supabase Vault (`[db.vault]`)** | `supabase/config.toml` lines 56–58: `# [db.vault] secret_key = ...` is commented out. Extension `vault` is not loaded in migrations. | `UNAVAILABLE` | Excluded. Enabling requires major infrastructure overhaul outside batch scope. |
| **Railway Environment Variables** | `railway.json`, `apps/api/Dockerfile`, `RUNBOOK_DEPLOY.md`. Injects process env vars (`RAZORPAY_KEY_SECRET`). | `AVAILABLE` (App only) | Fastify runtime only; cannot write to database due to `REVOKE ALL` on `service_role`. |
| **Railway $\rightarrow$ DB Sync Pipeline** | No webhook, sidecar, or sync daemon exists between Railway and Supabase DB. | `UNAVAILABLE` | Excluded. No infrastructure-native secret sync exists. |
| **Application HTTP Admin Endpoint** | Expressly prohibited by CTO Rule 4 (`POST /admin/payment-secret` strictly banned). | `PROHIBITED` | Excluded. Prevents HTTP-level credential injection. |
| **Controlled DB Administrative Path** | `RUNBOOK_DEPLOY.md`, `RUNBOOK_BACKUP_RECOVERY.md`. Secure operator connection via Supabase SQL Editor or `psql` as `postgres` owner. | `AVAILABLE` | **SELECTED (Model B)**. Preserves trust boundary, zero code exposure, zero client exposure. |

---

## 2. SELECTED PROVISIONING MODEL & RATIONALE

### Selected Model: Model B — Controlled Database Administrative Provisioning
The authoritative Razorpay secret is provisioned into `internal_payment_secrets` via a parameterized, idempotent administrative operation executed exclusively by the database owner (`postgres`) through a secure administrative channel (e.g. Supabase Dashboard SQL Editor or authenticated `psql` connection with `sslmode=require`).

### Rationale for Selection:
1. **Preserves Trust Boundary:** The secret is stored directly in `internal_payment_secrets`, accessible only to `postgres` and `SECURITY DEFINER` routines.
2. **Zero HTTP / Network API Exposure:** Fastify has no endpoint or route capable of receiving or mutating payment secrets.
3. **Strict Privilege Quarantine:** The `service_role` (used by Fastify) has `REVOKE ALL` on `internal_payment_secrets`. Even a compromised backend application container cannot read or modify the secret.
4. **Git & Migration Cleanliness:** Migration `037_page_pro_orders.sql` creates the table completely empty. Zero credentials are committed to source.
5. **Atomic Rotation & Fail-Closed Safety:** Replacement is a single atomic SQL transaction. If absent, the system fails closed immediately (`KEY_SECRET_MISSING`).

---

## 3. SECURITY THREAT ANALYSIS

| Threat Vector | Mitigation & Enforcement Boundary | Verification Evidence |
| :--- | :--- | :--- |
| **T1: Client / Web / Mobile Secret Theft** | Client roles (`anon`, `authenticated`) have `REVOKE ALL` and RLS enabled. | Invariant O: `42501 permission denied for table internal_payment_secrets`. |
| **T2: Backend Service-Role Compromise** | `service_role` has `REVOKE ALL` on table. PostgREST denies table access. | Invariant P: Fastify Supabase client query returns `error` / `null`. |
| **T3: Caller Parameter Injection** | RPC parameter `p_key_secret` is purged. Function has strictly 7 parameters. | `pg_proc.identityArgs`: Zero secret arguments exist. |
| **T4: Session GUC Manipulation** | `SET app.settings.razorpay_key_secret` is ignored in favor of `internal_payment_secrets`. | Invariant M5: Injected session secret rejected with `INVALID_SIGNATURE`. |
| **T5: Source Code Leakage** | Table created empty in migration. Zero credentials in Git repository. | Repository audit confirms zero real secrets committed. |
| **T6: Log / Response Leakage** | Fastify redacts headers. RPC returns only status codes, never secrets or HMACs. | Invariant Q & Fastify error logging audit. |

---

## 4. OPERATIONAL PROVISIONING PROCEDURE (MODEL B)

### 4.1 Specification
* **Source of Secret:** Secure Operator Key Vault / Razorpay Live/Test Dashboard.
* **Operator Identity:** Authorized Database Administrator (Role: `postgres`).
* **Destination:** `public.internal_payment_secrets`.
* **Execution Boundary:** Supabase Dashboard SQL Editor or direct administrative `psql` session over TLS.
* **Database Role:** `postgres` (Superuser / Database Owner).
* **Permissions Required:** Superuser or Table Owner.

### 4.2 Structural Command (Secret Redacted)
```sql
-- Executed strictly by database owner 'postgres' in secure administrative session
BEGIN;

INSERT INTO internal_payment_secrets (provider, key_secret)
VALUES ('razorpay', :'RAZORPAY_KEY_SECRET')
ON CONFLICT (provider) DO UPDATE
  SET key_secret = EXCLUDED.key_secret,
      updated_at = now();

-- Verify table permissions remain strictly locked down
REVOKE ALL ON TABLE internal_payment_secrets FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
```

### 4.3 Redacted Verification Procedure
To verify that the secret is provisioned without exposing plaintext:
```sql
SELECT
  provider,
  (key_secret IS NOT NULL AND length(key_secret) > 0) AS is_provisioned,
  length(key_secret) AS secret_length_chars,
  created_at,
  updated_at
FROM internal_payment_secrets
WHERE provider = 'razorpay';
```
Expected Output:
```
 provider | is_provisioned | secret_length_chars |          updated_at           
----------+----------------+---------------------+-------------------------------
 razorpay | t              |                  32 | 2026-09-20 09:10:00.000000+00
```

---

## 5. RUNTIME SECURITY PROOFS (TESTS A THROUGH F)

Executed in isolated PostgreSQL 16.4 container and recorded in `reports/w009_b5_runtime_persistence_report.json`:

### Test A — Empty Store Fail-Closed (Invariant M6)
* Condition: `internal_payment_secrets` row for `razorpay` deleted.
* RPC Call: `verify_and_activate_page_pro('order_m6', ..., 'any_sig', ...)`
* Result: `{ "success": false, "code": "KEY_SECRET_MISSING" }`
* Mutation: Zero database mutations. Order remains `created`.
* Status: **PASS**

### Test B — Provisioned Test Secret Success (Invariant M2)
* Condition: Known disposable test secret provisioned via Model B.
* RPC Call: Valid HMAC computed with matching test secret.
* Result: `{ "success": true, "code": "ENTITLEMENT_ACTIVATED" }`
* Mutation: Order status updated to `completed`, `pages.is_pro = true`.
* Status: **PASS**

### Test C — Wrong Secret Rejection (Invariants M1, M4)
* Condition: RPC invoked with signature generated using attacker/wrong secret.
* Result: `{ "success": false, "code": "INVALID_SIGNATURE" }`
* Mutation: Zero database mutations. Order remains `created`.
* Status: **PASS**

### Test D — Client Isolation (Invariant O)
* Direct query by `anon`: `ERROR: permission denied for table internal_payment_secrets`
* Direct query by `authenticated`: `ERROR: permission denied for table internal_payment_secrets`
* Direct query by `service_role`: `ERROR: permission denied for table internal_payment_secrets`
* Direct query by `postgres`: Permitted (owner).
* Status: **PASS**

### Test E — Application Layer Isolation (Invariant P)
* Fastify's Supabase JS Client (`service_role` via PostgREST) attempts `supabase.from('internal_payment_secrets').select('*')`.
* Result: `data === null`, error returned from API layer.
* Status: **PASS**

### Test F — Operational Secret Rotation (Invariant Q)
1. Model B provisioning executes update: `NEW_ROTATED_TEST_SECRET`.
2. New order verified with signature from `NEW_ROTATED_TEST_SECRET`: **SUCCEEDS** (`ENTITLEMENT_ACTIVATED`).
3. New order verified with signature from retired secret: **FAILS** (`INVALID_SIGNATURE`).
4. Historically completed orders prior to rotation: **REMAIN COMPLETED** (`status = 'completed'`, `signature_verified = true`).
5. Output exposure check: Plaintext secret is never logged or returned.
* Status: **PASS**

---

## 6. ROTATION SEMANTICS

* **Active Secrets:** Exactly 1 active secret per provider (`provider TEXT PRIMARY KEY`).
* **Multi-Secret Overlap:** `ROTATION_SUPPORT = DEFERRED`. Multi-secret grace overlap is deliberately not supported in this batch.
* **Completed Entitlements:** Permanently durable. Completed orders and activated page subscriptions remain valid post-rotation.
* **Pending Unverified Orders:** In-flight checkout orders created before rotation must be completed before rotation or re-initiated.
* **Failure Mode:** Partial or aborted rotation fails closed with `KEY_SECRET_MISSING`.
* **Restart Requirement:** Database update is instant and atomic. Fastify instances require restart / redeployment to update `process.env.RAZORPAY_KEY_SECRET` for initial route pre-checks.

---

## 7. FULL REGRESSION & BUILD VERIFICATION

* **Durable Payment Suite (`tests/verify_w009_b5_durable_payment.mjs`):**
  **33 / 33 PASSED (100%)**. (Includes Invariants A through Q).
* **Provider Unit Suite (`apps/api/src/__tests__/providers.test.ts`):**
  **33 / 33 PASSED (100%)**. Zero regressions.
* **API TypeScript Build (`tsc --noEmit`):**
  **0 errors (Exit code 0)**.

---

## 8. STATUTORY & SAFETY AFFIRMATIONS

1. **Zero Real Credentials:** All tests and reports used disposable synthetic keys (`secret_w009_b5_test_hmac_key_12345`, `disposable_test_rotated_secret_99999`). Zero real Razorpay credentials exist in the codebase.
2. **Zero Live Provider Calls:** Zero network requests were made to Razorpay or telecom providers.
3. **Zero Staging / Production Mutations:** All testing was isolated to container `w009-b5-postgres`. Staging and production databases were not accessed or modified.

---

## 9. FINAL CTO GATE VERDICT

In accordance with CTO Instruction Section 14:
A secure operational provisioning mechanism (Model B — Controlled Database Administrative Provisioning) has been identified, analyzed, and 100% verified against real PostgreSQL runtime without compromising trust boundaries.

**FINAL STATUS:**  
`W009-B5-R4 — SECURITY IMPLEMENTATION VERIFIED / PROVISIONING MECHANISM VERIFIED / AWAITING CTO ACCEPTANCE`
