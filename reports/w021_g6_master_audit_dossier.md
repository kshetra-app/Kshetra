# W021-G6 MASTER AUDIT EVIDENCE DOSSIER: SECURITY PROBES, REGRESSION BATTERY & VERIFICATION SUMMARY

**Milestone:** W021-G6 (Authorized Security Probes, Master Regression Battery & Final Verification Dossier)  
**Authority:** CTO RATIFICATION — W021-G6 (`PLAN-W021-G6-REV-1.0`, Commit `975fb2ddb2ff934ee469170eb1ef3abbb844b25b`)  
**Execution Timestamp:** 2026-10-02T13:50:00.000Z  
**Verdict:** **SUBMITTED FOR CTO ACCEPTANCE REVIEW**  
**Non-Self-Acceptance Clause:** *Rule IV-001 enforced: Self-acceptance is strictly forbidden. This dossier is submitted for independent CTO review and determination.*

---

## 1. System Coordinates & Boundary Verification

| Coordinate | Canonical Target | Observed Runtime Value | Invariant Status |
| :--- | :--- | :--- | :--- |
| **Accepted Implementation Baseline** | `b51fe20a422657afb17c34cd87a7b6bcc0c5013e` | `b51fe20a422657afb17c34cd87a7b6bcc0c5013e` | **MATCH** |
| **Plan Ratification Baseline** | `975fb2ddb2ff934ee469170eb1ef3abbb844b25b` | `975fb2ddb2ff934ee469170eb1ef3abbb844b25b` | **MATCH** |
| **Canonical API Key Format** | `^panin_(live\|test)_sk_[0-9a-zA-Z_-]{43}$` | 57 characters exact Base64URL | **ENFORCED** |
| **Legacy Aliases (`kshetra_*`)** | Strictly Rejected (0 tolerated) | 0 accepted, all fail closed (401) | **VERIFIED** |
| **Target Staging Database** | `fkpigozcqnmcvofuksar` | `https://fkpigozcqnmcvofuksar.supabase.co` | **VERIFIED** |
| **Production Database** | `ehfafcnimmjusyvplbah` | Strictly Air-Gapped (0 connections, 0 mutations) | **100% AIR-GAPPED** |
| **SaaS Gateway Boundary** | Fastify (`/api/vsaas/v1/...`) | Zero Supabase URLs in SaaS OpenAPI servers | **ENFORCED** |
| **Consumer Mobile App** | `apps/mobile/**` | 100% Frozen (0 modifications) | **FROZEN** |
| **Database Migrations** | 0 new migrations | No Migration 058 or DDL created | **UNCHANGED** |

---

## 2. Authorized G6 Security Probes Execution Matrix

Implemented in `tests/saas-g6-security-probes.test.mjs`:

| Probe ID | Security Invariant Checked | Method & Verification Assertion | Verdict |
| :--- | :--- | :--- | :---: |
| **G6-SEC-01** | Canonical API Key Format Regex | Exact 57-char regex `^panin_(live\|test)_sk_[0-9a-zA-Z_-]{43}$` | **PASS** |
| **G6-SEC-02** | Rejection of Unauthorized `kshetra_*` Aliases | 7 unauthorized credential aliases tested against regex and validator | **PASS** |
| **G6-SEC-03** | Timing Attack Mitigation via `timingSafeEqual` | `crypto.timingSafeEqual` over SHA-256 digests verified in constant time | **PASS** |
| **G6-SEC-04** | Multi-Tenant Anti-Spoofing | Caller-supplied `tenant_id` query/header discarded in favor of key context | **PASS** |
| **G6-SEC-05** | Delimitation Scenario Immutability | `officialDelimitationOrder: false`, `SCENARIO_PROPOSED_REGIME`, statutory disclaimer | **PASS** |
| **G6-SEC-06** | Client Parameter Override Prohibition | Client injection of simulation flags fails closed with 400 `SCENARIO_INPUT_FORBIDDEN` | **PASS** |
| **G6-SEC-07** | Zero Citizen Personal Data (PII) | 0 phone numbers, emails, voter IDs, passwords across OpenAPI schemas | **PASS** |
| **G6-SEC-08** | Usage-Ledger Retention and Orphan Preservation | `saas_usage_ledger.api_key_id` uses `ON DELETE SET NULL` on key physical deletion to preserve tenant usage records | **PASS** |
| **G6-SEC-09** | Correlation & Rate-Limiting Headers | All 15 endpoints declare `x-request-id`, `x-response-time`, and rate limit headers | **PASS** |
| **G6-SEC-10** | Property-Level Provenance Semantic Integrity | Explicit property-level tagging of derived metrics, temporal state, statutory facts | **PASS** |
| **G6-SEC-11** | Production Air-Gap Invariant | `ehfafcnimmjusyvplbah` strictly absent from all configurations and servers | **PASS** |

**Summary: 11 / 11 Security Probes Passed (100.0%)**

---

## 3. Unified Master Regression Battery Results

Orchestrated by `scripts/run-w021-master-battery.mjs`:

| Suite # | Suite Identifier | Target Domain | Command / Test Runner | Checks | Passed | Status | Duration |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| 1 | `W021-G4-ROUTES` | Public/Partner SaaS Routes (15 endpoints) | `npm test -- apps/api -- src/__tests__/saas-v1-routes.test.ts` | 34 | 34 | **PASS** | 111.0s |
| 2 | `W021-G3-AUTH` | SaaS Authentication & Key Crypto | `npm test -- apps/api -- src/__tests__/saas-auth-g3.test.ts` | 17 | 17 | **PASS** | 39.7s |
| 3 | `W021-G3-DURABLE-QUOTA` | Durable Monthly Quota Tracking | `npm test -- apps/api -- src/__tests__/saas-durable-quota.test.ts` | 11 | 11 | **PASS** | 24.0s |
| 4 | `W021-G3-ATOMIC-PG` | Atomic PostgreSQL Quota RPC | `node tests/saas-atomic-quota-pg.test.mjs` | 14 | 14 | **PASS** | 47.2s |
| 5 | `W021-G2-M056` | Migration 056 Preflight & Schema | `node tests/saas-migration-056-preflight.test.mjs` | 32 | 32 | **PASS** | 51.3s |
| 6 | `W021-G5-OPENAPI` | SaaS OpenAPI 3.1 Contract Drift | `node tests/saas-openapi-contract-drift.test.mjs` | 24 | 24 | **PASS** | 1.5s |
| 7 | `W021-G6-SECURITY` | Security Probes & Multi-Tenant Isolation | `node tests/saas-g6-security-probes.test.mjs` | 11 | 11 | **PASS** | 1.0s |
| 8 | `W018-POLITICAL-ENTITIES` | Canonical Political Entities Invariants | `node tests/political-entities-invariants.test.mjs` | 53 | 53 | **PASS** | 62.5s |
| 9 | `W019-ELECTIONS` | Normalized Elections Battery | `node tests/election-normalization-invariants.test.mjs` | 93 | 93 | **PASS** | 57.6s |
| 10 | `W020-DELIMITATION` | Delimitation Canonical Integration | `node tests/delimitation-g8-integration.test.mjs` | 25 | 25 | **PASS** | 27.3s |
| 11 | `W020-M055` | Migration 055 Bridge Preflight | `node tests/delimitation-migration-055-preflight.test.mjs` | 23 | 23 | **PASS** | 41.4s |
| 12 | `W004-OBSERVABILITY` | Observability & Fastify Tracing | `npm test -- apps/api -- src/__tests__/observability.test.ts` | 19 | 19 | **PASS** | 28.7s |
| 13 | `LEGACY-API-DRIFT` | Legacy API Contract Drift | `node scripts/check-api-contract-drift.mjs` | 9 | 9 | **PASS** | 0.5s |
| **TOTAL** | **13 SUITES** | **ALL PLATFORM DOMAINS** | **UNIFIED MASTER BATTERY** | **365** | **365** | **PASS** | **493.6s** |

**Unified Master Pass Rate: 100.0% (365 / 365 Passing Checks, 0 Failures)**

---

## 4. Empirical Performance Benchmarking & WAN Latency Disposition

### 4.1 Measured Runtime Performance Gates

| Metric Description | Target Threshold | Measured Runtime Value | Verdict | Architectural Notes |
| :--- | :---: | :---: | :---: | :--- |
| **In-Memory Apportionment (Hare-Niemeyer)** | P95 < 5.0 ms | **0.065 ms** | **PASS** | Sub-millisecond deterministic calculation |
| **Factual Read Gateway Response Time** | P95 < 10.0 ms | **1.93 ms** | **PASS** | Fastify in-memory routing and validation |
| **Concurrency 50 Concurrent Requests** | P95 < 200.0 ms | **21.85 ms** | **PASS** | Excellent asynchronous event loop throughput |
| **Process RSS Memory Delta** | Delta < 15.0 MB | **4.26 MB** | **PASS** | Zero memory leak detected |

### 4.2 Authoritative WAN Performance Reconciliation (DEC-107)

- **Target Origin:** The `P95 < 50.0 ms` target was established during W020-G9 as a benchmark target for direct database/PostgREST lookups.
- **DEC-107 Determination:** On 2026-10-01, CTO formally issued **DEC-107** (*W020-G9 FINAL CLOSURE WITH CTO FORMAL ENVIRONMENTAL PERFORMANCE EXCEPTION*), adjudicating:
  1. The direct WAN HTTP PostgREST target remains `P95 < 50.0 ms` and is strictly not relabeled as PASS.
  2. Measured Supabase server-side upstream service processing time was **34.00 ms P95** (within the 50.0 ms budget).
  3. External network transit across public WAN from India to remote cloud-hosted Supabase Staging accounted for 98.42% of observed round-trip latency.
  4. The milestone closure was formally authorized under **Case 1: VERIFIED ENVIRONMENTAL LIMITATION**.
- **Ratified Plan Incorporation:** In ratified `PLAN-W021-G6-REV-1.0` Section 15 (*Risks, Failure Modes & Mitigations*), this exact circumstance was documented as a known operational condition:
  > *"Upstream WAN latency causing PostgREST probe failure $\rightarrow$ Mitigation: Acknowledge remote staging network latency under CTO Environmental Exception (DEC-107)."*
- **Final Disposition:** Classified as **NOT MEASURABLE IN CURRENT AUTHORIZED ENVIRONMENT / ENVIRONMENTAL EXCEPTION** (bounded residual environmental limitation). No synthetic latency measurement is fabricated; local Fastify gateway lookups and in-memory compute engines are independently evidenced as sub-millisecond to sub-2ms.

---

## 5. Build & Compilation Verification

1. **API TypeScript Build (`npm run build --prefix apps/api`):**
   - Command: `tsc --noEmit`
   - Output: 0 type errors, exit code 0.
2. **OpenAPI 3.1 Contract Drift (`node tests/saas-openapi-contract-drift.test.mjs`):**
   - Verified 15/15 endpoints, 50+ property provenance tags, zero Supabase URLs, canonical credentials only.
   - Output: 24/24 assertions passed, 0 drift.

---

## 6. Prohibitions & Out-of-Scope Compliance

- **Production Database:** `ehfafcnimmjusyvplbah` was **NEVER** connected to or modified during this milestone.
- **Database Migrations:** Zero schema migrations or DDL applied.
- **Consumer Mobile:** `apps/mobile/**` remained strictly untouched.
- **Commercial Checkout / Payments:** Deferred to W051 (zero billing/checkout code implemented).
- **Webhooks Engine:** Deferred to W022 (zero webhook event dispatcher implemented).
- **OAuth2 / OIDC Server:** Deferred (Fastify API key gateway model preserved).
- **Self-Acceptance:** Strictly forbidden; milestone remains submitted for CTO review.

---

## 7. Residual Defect & Unknown Register

| Identifier | Classification | Disposition / Status | Context & Scope |
| :--- | :--- | :--- | :--- |
| **LIMITATION-W021-01** | Bounded Environmental Limitation | **NOT MEASURABLE IN CURRENT AUTHORIZED ENVIRONMENT / ENVIRONMENTAL EXCEPTION** | Public internet transit latency between remote runner (India) and cloud-hosted Supabase staging exceeds 50ms due to WAN routing hops; formally adjudicated under DEC-107. Local Fastify gateway processing is verified < 2.0 ms. |

**Defects:** 0 defects.  
**Unknowns:** 0 unknowns.  
**Residual Environmental Limitations:** 1 bounded limitation (LIMITATION-W021-01, governed under DEC-107).

---

## 8. Submission State

Milestone W021-G6 execution and evidence reconciliation are complete across all technical gates.  
Status: **SUBMITTED FOR CTO ACCEPTANCE REVIEW**.
