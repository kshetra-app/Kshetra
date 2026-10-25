# PANIN / KSHETRA
# REMEDIATION EXECUTION PLAN: MILESTONE W022 (REVISION 4.0)
## Outbound Webhooks & Event Dispatching Engine — Remediation & Production Hardening

**Document Identifier:** `PLAN-W022-REV-4.0.md`  
**Revision:** Rev 4.0 (Post-Audit Forensic Remediation — Addressing Findings W022-F01 through W022-F08)  
**Milestone:** W022 — Dedicated Outbound Event / Webhooks Engine  
**Governing Authority:** Master Execution Framework Amendment v1.5 (`AMENDMENT_v1.5.md`) & Amendment v1.5-A (`AMENDMENT_v1.5-A.md`)  
**Authorization Directive:** CTO Directive `W022-CTO-REMEDIATION-006`  
**Controlling Disposition:** `NOT ACCEPTED — REMEDIATION REQUIRED` (No self-acceptance; final package submitted for CTO adjudication)  
**Parent Feature Commit:** `3ac3f1c0c14d51d60bab9f9d3e88a08716466124`  
**Parent Evidence Commit:** `9f00fbfa34d3d67b07fd5633501269715ee03c40`  
**Date of Ratification:** 2026-10-25  
**Lifecycle State:** `REMEDIATION IMPLEMENTATION IN PROGRESS` (Approved for bounded local development, disposable PostgreSQL verification, and test execution only)  

---

## 1. Document Title & Governance Metadata

* **Milestone ID:** `W022`
* **Milestone Title:** B2B SaaS Outbound Webhooks & Event Dispatching Engine
* **Parent Milestone:** W021 (B2B Political SaaS & Public/Partner Developer API Foundation)
* **Author / Submitter:** AI Autonomous Agent (Engineering & Architecture)
* **Designated Adjudicator:** CTO Executive Office / Architecture Review Board
* **Document Status:** `RATIFIED REMEDIATION PLAN — LOCAL IMPLEMENTATION AUTHORIZED`
* **Implementation Permission:** Authorized for local development, disposable PostgreSQL verification, tests, and evidence generation only per `W022-CTO-REMEDIATION-006`.
* **Air-Gap Boundary:** Production Supabase (`ehfafcnimmjusyvplbah`) **STRICTLY AIR-GAPPED** (0 queries, 0 mutations).
* **Target Staging Environment:** Staging Supabase (`fkpigozcqnmcvofuksar`) **STRICTLY UNTOUCHED** (0 queries, 0 migrations).
* **Disposable Database Runtime:** Isolated Docker container `w022-verify-postgres` (`postgres:16-alpine` on `127.0.0.1:54333`).

---

## 2. Historical Lineage & Forensic Context

In previous verification cycles (`W022-CTO-CLOSE-001` through `W022-CTO-FINAL-EVIDENCE-CLOSURE-005`), Milestone W022 achieved provisional technical gates for SQL trigger regex anchoring, search_path isolation, and lease token fencing. However, CTO Directive `W022-CTO-REMEDIATION-006` withheld final milestone acceptance due to eight distinct structural and operational findings requiring remediation.

Revision 3 (`PLAN-W022-REV-1.0.md`) is preserved intact as historical evidence. Revision 4.0 establishes the authoritative blueprint to rectify findings W022-F01 through W022-F08.

---

## 3. Finding-by-Finding Remediation Blueprint

### W022-F01: Persistent Queue Worker Entrypoint
* **Defect:** Webhook dispatch lacked a dedicated, standalone background worker process capable of continuously draining queued deliveries outside synchronous request or test execution.
* **Remediation:**
  1. Create `apps/api/src/workers/webhookWorker.ts` with continuous polling loop, configurable backoff on idle, and graceful shutdown handlers (`SIGINT`, `SIGTERM`).
  2. Implement batch claiming using `fn_claim_webhook_batch`.
  3. Parse database rows into strongly-typed domain delivery, subscription, and event models.
  4. Decrypt subscription secrets using AES-256-GCM with tenant/subscription AAD (`${tenant_id}:${subscription_id}`).
  5. Support previous-secret grace period expiry (`previous_secret_expires_at`).
  6. Dispatch via SSRF-guarded HTTP dispatcher with timeout and single-settle guarantees.
  7. Persist delivery outcomes using lease-token-fenced updates.
  8. Add package script `"worker:webhooks": "tsx src/workers/webhookWorker.ts"` in `apps/api/package.json`.

### W022-F02: PostgreSQL Queue Contract Parity
* **Defect:** `PostgresQueueProvider.claimBatch()` assumed a nested structure rather than parsing the exact flat table return shape of `fn_claim_webhook_batch`, risking data fabrication or silent masking of RPC failures.
* **Remediation:**
  1. Update `PostgresQueueProvider.claimBatch()` to strictly parse and validate the exact flat columns returned by `fn_claim_webhook_batch`:
     `(delivery_id, tenant_id, subscription_id, event_id, attempt_count, lease_token, leased_until, endpoint_url, secret_ciphertext, secret_iv, secret_tag, secret_key_version, previous_secret_ciphertext, previous_secret_iv, previous_secret_tag, previous_secret_expires_at, event_type, payload_raw, payload_sha256)`.
  2. Validate missing or malformed fields explicitly; throw on invalid schemas; never silently return empty batches on RPC errors.
  3. Add a dedicated integration test that executes `claimBatch()` against real PostgreSQL to prove raw-to-typed mapping fidelity.

### W022-F03: Atomic Event Publication & Fan-out
* **Defect:** Event insertion and delivery fan-out were split across separate operations, allowing race conditions or process crashes to leave published events with missing or partial deliveries.
* **Remediation:**
  1. Implement stored procedure `public.fn_publish_webhook_event(p_tenant_id UUID, p_application_id UUID, p_event_type TEXT, p_idempotency_key TEXT, p_payload JSONB, p_payload_raw TEXT, p_payload_sha256 VARCHAR(64))` in `supabase/migrations/070_saas_webhook_engine.sql`.
  2. Perform event insertion, idempotency conflict detection, subscription matching, and delivery record creation in a single atomic transaction.
  3. On repeated idempotency keys, return the existing event record without mutating or duplicating deliveries, guaranteeing that duplicate calls never conceal missing fan-out.
  4. Add fault-injection tests verifying transaction rollback when errors occur during event insertion, subscription matching, or delivery insertion.

### W022-F04: Safe Production Configuration
* **Defect:** Webhook services fell back to `InMemoryQueueProvider` implicitly when `DATABASE_URL` was absent, risking silent data loss in deployed environments. Test secret keys were statically defaulted when environment variables were omitted.
* **Remediation:**
  1. In `apps/api/src/modules/webhooks/webhookService.ts`, strictly prohibit `InMemoryQueueProvider` in non-test environments. In deployed mode, missing or invalid `DATABASE_URL` must immediately throw a configuration error and halt process startup.
  2. Enforce that `WEBHOOK_SECRETS_ENCRYPTION_KEY` is mandatory outside `NODE_ENV=test`. Validate that the key is exactly 64 hexadecimal characters (32 bytes).
  3. Ensure an unset `NODE_ENV` defaults to secure production behavior and does NOT activate fixed test keys.
  4. Add negative configuration tests proving startup failure when keys are missing or malformed.

### W022-F05: Application Boundary Enforcement
* **Defect:** Webhook events did not enforce application boundaries, permitting subscriptions of one SaaS application to receive events emitted by another application under the same tenant.
* **Remediation:**
  1. Add `application_id UUID NOT NULL` to `public.webhook_events` in `supabase/migrations/070_saas_webhook_engine.sql`.
  2. Establish composite foreign key:
     `CONSTRAINT fk_webhook_events_tenant_app FOREIGN KEY (tenant_id, application_id) REFERENCES public.saas_applications(tenant_id, id) ON DELETE RESTRICT`.
  3. Scope the idempotency unique index to `(tenant_id, application_id, idempotency_key)`.
  4. Ensure fan-out subscription matching requires:
     `WHERE s.tenant_id = e.tenant_id AND s.application_id = e.application_id AND s.status = 'active'`.
  5. Add same-tenant, cross-application negative-path tests verifying complete isolation.

### W022-F06: Dispatcher Single-Settle & Timeout Bounds
* **Defect:** Response stream overflows (>64 KiB), socket aborts, and network timeouts could trigger multiple resolution attempts or unhandled rejections if an error occurred after initial settlement.
* **Remediation:**
  1. In `apps/api/src/modules/webhooks/webhookDispatcher.ts`, implement an atomic `isSettled` guard flag ensuring that every dispatch call resolves exactly once.
  2. Implement an overarching hard end-to-end timeout using `AbortController` alongside socket-level timeouts.
  3. Explicitly test responses exceeding 64 KiB, connection resets, missing responses, and delayed socket events after settlement.

### W022-F07: API Contract Parity & Tracked Verification
* **Defect:** OpenAPI specification `apps/api/openapi-saas-v1.yaml` omitted the five `/api/vsaas/v1/webhooks` endpoint operations, causing contract drift.
* **Remediation:**
  1. Document all 5 webhook routes (`GET /`, `POST /`, `GET /{id}`, `PATCH /{id}`, `POST /{id}/rotate-secret`) in `apps/api/openapi-saas-v1.yaml` with request/response schemas.
  2. Update `tests/saas-openapi-contract-drift.test.mjs` to validate route parity across all registered Fastify routes and OpenAPI paths.
  3. Maintain tracked verification SQL harness `reports/evidence/070_migration_verification.sql` for reproducible migration assertions.

### W022-F08: Authoritative Verification Battery & Manifest
* **Defect:** Evidence logs required rigorous deduplication, full TypeScript type-checking, and zero uncommitted working tree discrepancies.
* **Remediation:**
  1. Execute unified verification battery spanning TypeScript compilation, unit tests, PGlite tests, real PostgreSQL probes, worker E2E, and OpenAPI drift.
  2. Generate authoritative `reports/evidence/W022_LOCAL_VERIFICATION_MANIFEST.json` with file hashes, command exit codes, and reconciled test counts.

---

## 4. Exact File Scope & Change Inventory

| File Path | Action | Description |
|:---|:---|:---|
| `PLAN-W022-REV-4.0.md` | CREATE | Ratified remediation execution plan |
| `supabase/migrations/070_saas_webhook_engine.sql` | MODIFY | Add `application_id`, composite FK, atomic `fn_publish_webhook_event`, updated grants |
| `apps/api/src/modules/webhooks/types.ts` | MODIFY | Add `application_id` to event types and flat claim batch row interface |
| `apps/api/src/modules/webhooks/crypto.ts` | MODIFY | Enforce strict 64-hex key validation; require key outside `NODE_ENV=test` |
| `apps/api/src/modules/webhooks/queueProvider.ts` | MODIFY | Flat row parsing in `PostgresQueueProvider.claimBatch()`, atomic publication call, disable implicit in-memory fallback |
| `apps/api/src/modules/webhooks/webhookService.ts` | MODIFY | Require `application_id` on event publish; enforce fail-fast production config |
| `apps/api/src/modules/webhooks/webhookDispatcher.ts` | MODIFY | Single-settle guard, hard end-to-end timeout, 64 KiB ceiling enforcement |
| `apps/api/src/workers/webhookWorker.ts` | CREATE | Standalone persistent queue worker |
| `apps/api/package.json` | MODIFY | Add `"worker:webhooks"` script |
| `apps/api/openapi-saas-v1.yaml` | MODIFY | Add webhook endpoints and schema components |
| `tests/saas-openapi-contract-drift.test.mjs` | MODIFY | Include webhook route parity assertions |
| `tests/webhooks-queue-contract.test.ts` | CREATE | Real PostgreSQL test for flat claim batch shape and provider parsing |
| `tests/webhooks-atomic-fanout.test.ts` | CREATE | Fault-injection & idempotency test for atomic fan-out |
| `tests/webhooks-config-safety.test.ts` | CREATE | Production config failure test (missing key, missing DB) |
| `tests/webhooks-app-isolation.test.ts` | CREATE | Cross-application negative-path test |
| `tests/webhooks-dispatcher-failure.test.ts` | CREATE | Single-settle, >64 KiB, timeout, connection abort tests |
| `tests/webhooks-worker-e2e.test.ts` | CREATE | End-to-end worker claim, decrypt, dispatch, and fenced completion test |
| `reports/evidence/070_migration_verification.sql` | CREATE | Tracked SQL verification script |
| `reports/evidence/W022_LOCAL_VERIFICATION_MANIFEST.json` | MODIFY | Final authoritative verification manifest |

---

## 5. Negative-Path Test Catalog

1. **NEG-APP-01 (Cross-App Event Routing):** Tenant A publishes event with Application 1 credentials. Ensure Application 2's subscription under Tenant A receives 0 deliveries.
2. **NEG-APP-02 (Cross-App Idempotency):** Publishing event with identical idempotency key under Application 2 does not conflict with or return Application 1's event.
3. **NEG-CFG-01 (Production Missing DB):** In `NODE_ENV=production`, instantiating WebhookService without `DATABASE_URL` throws `CONFIG_ERROR`.
4. **NEG-CFG-02 (Production Missing Key):** In `NODE_ENV=production`, missing `WEBHOOK_SECRETS_ENCRYPTION_KEY` throws `CONFIG_ERROR`.
5. **NEG-CFG-03 (Production Invalid Key):** In `NODE_ENV=production`, non-64-hex encryption key throws `CONFIG_ERROR`.
6. **NEG-DISP-01 (Response Overflow):** Endpoint returning 65 KiB body is aborted immediately, flagged as overflow error, and settled exactly once.
7. **NEG-DISP-02 (Hard Timeout):** Endpoint stalling past hard timeout is aborted and settled exactly once with timeout error.
8. **NEG-DISP-03 (Late Socket Event):** Socket emitting error or close event after response settlement does not trigger unhandled exception.
9. **NEG-ATOM-01 (Idempotent Delivery Integrity):** Republishing with same idempotency key returns original event with matching deliveries intact.
10. **NEG-CLAIM-01 (Lease Fencing):** Attempting to complete a delivery with an expired or mismatched lease token fails with zero rows updated.

---

## 6. Rollback & Contingency Provisions

If unresolvable blocking defects arise during remediation:
1. Revert working tree to parent commit `9f00fbfa34d3d67b07fd5633501269715ee03c40`.
2. Drop disposable verification database `w022_remediation_db` in Docker container `w022-verify-postgres`.
3. Remote staging and production remain completely untouched throughout the lifecycle.

---

## 7. Compliance Declarations

* **Amendment v1.5 / v1.5-A Compliance:** Fully preserved.
* **Air-Gap Verification:** Production (`ehfafcnimmjusyvplbah`) queries = 0; Staging (`fkpigozcqnmcvofuksar`) queries = 0.
* **Self-Acceptance:** None. Final package submitted to CTO for authoritative review.
