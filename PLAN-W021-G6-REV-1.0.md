# PLAN-W021-G6: SECURITY PROBES, MASTER REGRESSION HARNESS & CTO ACCEPTANCE DOSSIER

**Document Identifier:** `PLAN-W021-G6-REV-1.0`  
**Milestone:** W021-G6 (Security Probes, Master Regression Battery & Final Milestone Audit Dossier)  
**Parent Milestone:** W021 (B2B Political SaaS & Public/Partner Developer API Foundation)  
**Authority Directive:** `CTO AUTHORIZATION — W021-G6 OPEN` (2026-10-02)  
**Status:** `DRAFT / SUBMITTED FOR CTO RATIFICATION`  
**Implementation Authorization:** `STRICTLY NOT AUTHORIZED (PLANNING & PREFLIGHT SPECIFICATION ONLY)`  
**Accepted Prerequisite Milestones & Gates:**
- W021-G1: Master Architecture Plan & Preflight Specification — `ACCEPTED / RATIFIED`
- W021-G2: Migration 056 Preflight & Tenant/Key Persistence — `ACCEPTED / COMPLETE`
- W021-G3: API Key Cryptographic Security Flow & Durable Quota Engine — `ACCEPTED / COMPLETE`
- W021-G4: Public/Partner SaaS API Routes (`/api/vsaas/v1/...`) — `ACCEPTED / COMPLETE` (Commit `2bc515c`)
- W021-G5: OpenAPI 3.1 Canonical Contract & Drift Invariance Battery — `ACCEPTED / COMPLETE` (Commit `b51fe20`)

---

```text
================================================================================
GOVERNANCE & ENVIRONMENT ENCLOSURE — MILESTONE W021-G6 REV-1.0
================================================================================
PLAN STATUS:                          DRAFT / SUBMITTED FOR CTO RATIFICATION
IMPLEMENTATION AUTHORIZATION:         STRICTLY NOT AUTHORIZED (NO)
CURRENT ACTIVE PHASE:                 PRE-IMPLEMENTATION PLANNING & SPECIFICATION
TARGET DATABASE:                      STAGING SUPABASE (fkpigozcqnmcvofuksar) ONLY
PRODUCTION DATABASE:                  STRICTLY AIR-GAPPED & UNTOUCHED (ehfafcnimmjusyvplbah)
MOBILE CODEBASE:                      STRICTLY FROZEN (apps/mobile/**, ZERO MODIFICATIONS)
POSTGIS GEOMETRY BASELINE:            READ-ONLY & FROZEN (589 rows, exact SHA-256 match)
MIGRATIONS / DDL PLANNED:             ZERO (0 new tables, 0 new columns, 0 DDL)
DATABASE DML PLANNED:                 ZERO (0 insert/update/delete mutations on prod)
CODE MUTATIONS AUTHORIZED:            ZERO (0)
MANDATORY STOP STATE:                 HALT AFTER PLAN SUBMISSION AWAITING CTO REVIEW
================================================================================
```

---

## 1. Document Title & Metadata
- **Title:** Pre-Implementation Plan & Security Verification Specification for Milestone W021-G6
- **Version:** `REV-1.0`
- **Date:** 2026-10-02
- **Author:** Antigravity / PanIN Engineering
- **Governing Protocol:** `AGENT_EXECUTION_PROTOCOL.md` (Amendment v1.5-A, Sections 26 & 27)

---

## 2. Problem Statement (Task Understanding & Core Objectives)
The objective of Gate **W021-G6** is to synthesize, execute, and document the final comprehensive security, compliance, performance, and regression validation battery for Milestone W021, and to produce the authoritative CTO Acceptance Dossier for the complete B2B Political SaaS & Public/Partner Developer API Foundation.

Specifically, W021-G6 must:
1. **Unify Cross-Domain Regression Execution:** Construct a unified master verification runner (`scripts/run-w021-master-battery.mjs`) executing all accepted W021 gates and critical ancestor regression suites non-destructively in sequence.
2. **Execute Multi-Plane Security Probes:** Implement an authoritative security and tenant isolation verification suite (`tests/saas-g6-security-probes.test.mjs`) validating:
   - Cryptographic API-key format adherence and strict rejection of unauthorized prefixes (e.g. `kshetra_live_...`, `kshetra_test_...`).
   - Constant-time secret comparison and absence of timing or existence leakage.
   - Cross-tenant isolation boundaries and strict ignoring of caller-supplied tenant IDs.
   - Fail-closed behavior on database dependency failure, key revocation, and key expiry.
   - Zero citizen PII exposure across all public/partner SaaS routes.
   - Server-owned scenario provenance enforcement (`officialDelimitationOrder: false`, `SCENARIO_PROPOSED_REGIME`, 400 rejection of client overrides).
3. **Validate Performance & Concurrency Budgets:** Empirically benchmark in-memory apportionment (< 5ms), public factual reads (< 10ms cache / < 30ms DB seek), concurrency (50 concurrent connections, P95 < 200ms), and heap memory stability (RSS delta < 15MB).
4. **Enforce Zero Contract Drift:** Re-verify that runtime routes, database schemas, and the canonical OpenAPI 3.1 specification (`apps/api/openapi-saas-v1.yaml`) maintain 100% parity with zero drift.
5. **Produce Final CTO Acceptance Dossier:** Compile `reports/w021_g6_master_audit_dossier.json` and `reports/w021_g6_master_audit_dossier.md` documenting all evidence, logs, commit coordinates, remaining unknowns, and boundary guarantees.

---

## 3. Current State Analysis
- **Accepted W021 Baseline:** Commit `b51fe20a422657afb17c34cd87a7b6bcc0c5013e` (W021-G5 complete and accepted).
- **Runtime API Gateway:** Fastify SaaS gateway implemented in `apps/api/src/routes/saasV1.ts` exposing 15 accepted endpoints beneath `/api/vsaas/v1/...`.
- **Authentication & Crypto Layer:** `apps/api/src/lib/saasAuthPlugin.ts` and `apps/api/src/lib/saasCrypto.ts` enforce the ratified `panin_live_sk_` and `panin_test_sk_` format with SHA-256 storage.
- **Quota & Ledger Persistence:** Migration 056 / 057 schema operational with durable PostgreSQL monthly quota enforcement.
- **Contract Specification:** `apps/api/openapi-saas-v1.yaml` provides OpenAPI 3.1 contract with property-level provenance tags, matching 100% of runtime routes.
- **Working Tree:** Clean, `HEAD == origin/master` (`b51fe20`).

---

## 4. Fact / Inference / Assumption / Unknown (FIAU) Register
| Type | ID | Description |
|---|---|---|
| **FACT** | F-01 | W021-G1 through W021-G5 are formally accepted by the CTO; baseline is `b51fe20`. |
| **FACT** | F-02 | The accepted API-key credential format is strictly `panin_live_sk_` and `panin_test_sk_` with 43 Base64URL characters. Any `kshetra_*` alias is strictly forbidden. |
| **FACT** | F-03 | Production database `ehfafcnimmjusyvplbah` is 100% air-gapped and must not be connected to or mutated during W021-G6. |
| **FACT** | F-04 | Staging database is Supabase `fkpigozcqnmcvofuksar`. |
| **FACT** | F-05 | 589 PostGIS geometry baseline digest is `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`. |
| **INFERENCE**| I-01 | W021-G6 requires no new production or staging schema migrations; it is a verification, integration hardening, and audit synthesis gate. |
| **ASSUMPTION**| A-01 | Isolated test database harness (`w021_g3_durable_quota` on local PostgreSQL 17.6) is available for destructive or high-concurrency race condition testing without polluting staging. |
| **UNKNOWN** | U-01 | Cloud WAN latency between local benchmark runner and remote staging Supabase host may exceed local 50ms thresholds (subject to existing environmental exception DEC-107). |

---

## 5. Target Architecture & Intended Outcome
- **Master Verification Harness:** A standalone, non-destructive script `scripts/run-w021-master-battery.mjs` that runs all suites, collects timings and pass/fail counts, and computes total verification statistics.
- **Security Probes Suite:** `tests/saas-g6-security-probes.test.mjs` executing 20+ targeted security assertions across authentication, tenant isolation, rate limiting, PII leakage, and provenance immutability.
- **Audit Dossier:** Comprehensive JSON and Markdown reports in `reports/w021_g6_master_audit_dossier.*`.
- **Clean Gateway State:** Fastify TypeScript compilation exit code 0, 100% test pass rate across all suites.

---

## 6. Governing Rules & Constraints
1. **Rule IV-001 (Non-Self-Acceptance):** The implementing agent must not mark W021-G6 accepted; submission must halt awaiting independent CTO review.
2. **Production Air-Gap:** Zero connections to `ehfafcnimmjusyvplbah`.
3. **Consumer Mobile Freeze:** Zero edits in `apps/mobile/**`.
4. **Canonical Credential Invariant:** `panin_live_sk_...` and `panin_test_sk_...` only. Rejection of `kshetra_*`.
5. **OpenAPI 3.1 Parity:** Zero drift against `apps/api/openapi-saas-v1.yaml`.
6. **Provenance Integrity:** Server-owned `STATUTORY_FACT` and `PANIN_SCENARIO` metadata preserved; property-level semantic classifications intact.
7. **DPDP / Zero PII:** Zero citizen mobile, email, voter ID, or Aadhaar exported.

---

## 7. Full Scope of Work (Exact Files Expected to Change)
1. `scripts/run-w021-master-battery.mjs` (New unified verification runner)
2. `tests/saas-g6-security-probes.test.mjs` (New security probe battery)
3. `reports/w021_g6_master_audit_dossier.json` (Machine-readable audit evidence)
4. `reports/w021_g6_master_audit_dossier.md` (Human-readable audit dossier)
5. `EXECUTION_STATE.md` (Updated coordinates for G6)
6. `ACCEPTANCE_REGISTER.md` (Updated row for W021-G6 submission)
7. `DECISION_LOG.md` (DEC entry for W021-G6 closure submission)

---

## 8. Explicit Out-of-Scope Boundaries
- **NO Database Migrations:** Migration 058 or schema changes are strictly prohibited.
- **NO Production Deployments:** Production infrastructure remains untouched.
- **NO Commercial Billing / Payment Checkout:** ₹0 real money; Stripe/Razorpay partner billing deferred to W051.
- **NO Mobile Codebase Edits:** `apps/mobile/**` remains 100% untouched.
- **NO Webhooks Engine:** Outbound event dispatching deferred to W022.
- **NO OAuth2 / OIDC Server:** Deferred to enterprise SSO milestone (W051).

---

## 9. Step-by-Step Implementation Plan
1. **Phase 1 — Plan Submission & Preflight Review:** Submit this plan and halt for CTO ratification.
2. **Phase 2 — Author Security Probes Suite (`tests/saas-g6-security-probes.test.mjs`):**
   - Probe 1: Full credential pattern validation (live, test, invalid prefixes, truncated lengths).
   - Probe 2: Unauthorized alias rejection (`kshetra_live_...`, `kshetra_test_...` $\rightarrow$ 401).
   - Probe 3: Constant-time hash verification and zero timing leak.
   - Probe 4: Tenant isolation enforcement (cross-tenant key mismatch $\rightarrow$ fail closed).
   - Probe 5: Caller spoofing defense (client `tenant_id` query/header strictly ignored).
   - Probe 6: Dependency failure fail-closed behavior (DB error $\rightarrow$ 500 AUTH_DEPENDENCY_FAILURE).
   - Probe 7: Rate limiting burst exhaustion (returns 429 with Retry-After).
   - Probe 8: Monthly quota exhaustion (durable ledger returns 429).
   - Probe 9: Secret redaction in logs and context (raw secret never exposed).
   - Probe 10: Zero citizen PII exposure across all 15 endpoints.
   - Probe 11: Delimitation scenario provenance immutability (`officialDelimitationOrder: false`, `SCENARIO_PROPOSED_REGIME`).
   - Probe 12: Client scenario override rejection (400 SCENARIO_INPUT_FORBIDDEN).
   - Probe 13: Property-level provenance semantic preservation.
   - Probe 14: Fastify UUID request correlation headers (`x-request-id`, `x-response-time`).
3. **Phase 3 — Author Master Verification Runner (`scripts/run-w021-master-battery.mjs`):**
   - Sequentially invokes:
     - G4 SaaS Routes Suite (`apps/api/src/__tests__/saas-v1-routes.test.ts` — 34 checks)
     - G3 Auth Suite (`apps/api/src/__tests__/saas-auth-g3.test.ts` — 17 checks)
     - G3 Durable Quota Suite (`apps/api/src/__tests__/saas-durable-quota.test.ts` — 11 checks)
     - G3 Atomic Quota Suite (`tests/saas-atomic-quota-pg.test.mjs` — 14 checks)
     - G2 Migration Preflight (`tests/saas-migration-056-preflight.test.mjs` — 32 checks)
     - G5 OpenAPI Drift Suite (`tests/saas-openapi-contract-drift.test.mjs` — 24 checks)
     - G6 Security Probes Suite (`tests/saas-g6-security-probes.test.mjs` — ~15 checks)
     - Ancestor W018 Invariants (`tests/political-entities-invariants.test.mjs` — 53 checks)
     - Ancestor W019 Invariants (`tests/election-normalization-invariants.test.mjs` — 93 checks)
     - Ancestor W020 Delimitation Integration (`tests/delimitation-g8-integration.test.mjs` — 25 checks)
     - Ancestor W004 Observability (`apps/api/src/__tests__/observability.test.ts` — 19 checks)
     - Declared API Contract Drift (`scripts/check-api-contract-drift.mjs` — 9 checks)
   - Asserts total checks $\ge 340$ with 100% pass rate.
4. **Phase 4 — Execution & Empirical Performance Benchmarking:**
   - Execute the master battery runner and capture full stdout.
   - Measure in-memory apportionment latency, factual route lookups, concurrency 50, and heap delta.
5. **Phase 5 — Build Verification:**
   - Run `npm run build --prefix apps/api` (`tsc --noEmit`).
6. **Phase 6 — Evidence Compilation:**
   - Write `reports/w021_g6_master_audit_dossier.json` and `.md`.
7. **Phase 7 — Governance Reconciliation:**
   - Update `EXECUTION_STATE.md`, `ACCEPTANCE_REGISTER.md`, and record DEC entry in `DECISION_LOG.md`.
8. **Phase 8 — Submission & Halt:**
   - Commit and push changes, output final evidence dossier, and halt execution.

---

## 10. Verification & Testing Strategy
- **Master Battery Scope:** 12 test suites covering 340+ individual assertions.
- **Assertion Standards:** Every test asserts strict binary equivalence; zero relaxed thresholds; zero mock-only assertions masquerading as live DB proofs.
- **Target Pass Rate:** Strictly 100.0%.

---

## 11. Negative-Path Testing Specification
- **NP-01:** Request with missing API key $\rightarrow$ 401 UNAUTHORIZED.
- **NP-02:** Request with `kshetra_live_...` or `kshetra_test_...` $\rightarrow$ 401 UNAUTHORIZED.
- **NP-03:** Request with truncated key secret (< 43 Base64URL chars) $\rightarrow$ 401 UNAUTHORIZED.
- **NP-04:** Request with revoked API key $\rightarrow$ 401 UNAUTHORIZED.
- **NP-05:** Request with expired API key $\rightarrow$ 401 UNAUTHORIZED.
- **NP-06:** Client attempt to inject `tenant_id` in headers or query $\rightarrow$ ignored, resolved tenant enforced.
- **NP-07:** Client attempt to inject `isScenario=true` on factual route $\rightarrow$ 400 SCENARIO_INPUT_FORBIDDEN.
- **NP-08:** Client attempt to inject `officialDelimitationOrder=true` on scenario route $\rightarrow$ 400 SCENARIO_INPUT_FORBIDDEN.
- **NP-09:** Burst rate limit exhaustion $\rightarrow$ 429 with `Retry-After`.
- **NP-10:** Monthly quota exhaustion $\rightarrow$ 429 with `x-monthly-quota-remaining: 0`.

---

## 12. Evidence Generation Plan
- Machine-readable evidence: `reports/w021_g6_master_audit_dossier.json`
- Human-readable dossier: `reports/w021_g6_master_audit_dossier.md`
- Verbatim raw execution outputs captured and committed to repository.

---

## 13. Reconciliation Plan
- `EXECUTION_STATE.md`: Update `CURRENT_JOB: W021-G6`, set coordinates to current remote HEAD.
- `ACCEPTANCE_REGISTER.md`: Add row for W021-G6 marked `SUBMITTED / IMPLEMENTED (PENDING CTO ACCEPTANCE)`.
- `DECISION_LOG.md`: Record DEC-108 for W021-G6 verification and audit synthesis.

---

## 14. Independent Verification Specification
- Verifier may execute `node scripts/run-w021-master-battery.mjs` directly.
- Verifier inspects `apps/api/openapi-saas-v1.yaml` under standard OpenAPI 3.1 validator.
- Verifier audits zero connections to production `ehfafcnimmjusyvplbah`.

---

## 15. Risks, Failure Modes & Mitigations
| Risk | Severity | Mitigation |
|---|---|---|
| Upstream WAN latency causing PostgREST probe failure | Medium | Acknowledge remote staging network latency under CTO Environmental Exception (DEC-107). |
| Race condition during concurrent quota testing | Medium | Leverage atomic PostgreSQL increment RPC (`saas_increment_usage_atomic`) with retry. |
| Memory leak under 50 concurrent connections | High | Assert process RSS heap delta < 15MB before and after test batch. |

---

## 16. Rollback & Recovery Strategy
- All tests are strictly non-destructive.
- No DDL or persistent data mutations occur on production or staging tables.
- If any test script fails, changes are isolated to test files and can be cleanly reverted with `git checkout`.

---

## 17. Impact Assessment
- Downstream impact on mobile app: Zero (`apps/mobile` remains frozen).
- Impact on internal Fastify `/api/v1` routes: Zero (all SaaS routes reside strictly under `/api/vsaas/v1`).
- Database schema impact: Zero (no migrations applied).

---

## 18. Acceptance Criteria
1. `node scripts/run-w021-master-battery.mjs` passes 100% of checks ($\ge 340$ assertions).
2. `tests/saas-g6-security-probes.test.mjs` passes 100% of checks.
3. `tests/saas-openapi-contract-drift.test.mjs` passes 24/24 checks.
4. `npm run build --prefix apps/api` exits with code 0 (clean TypeScript build).
5. OpenAPI 3.1 specification parses cleanly with zero schema errors.
6. Zero citizen PII fields exposed across all schemas and responses.
7. Credential contract remains strictly `panin_live_sk_` and `panin_test_sk_`.
8. Production database `ehfafcnimmjusyvplbah` remains 100% air-gapped and untouched.
9. Working tree is clean and `HEAD == origin/master`.

---

## 19. Artifact & Commit Lineage Map
- Parent Accepted Baseline: `b51fe20a422657afb17c34cd87a7b6bcc0c5013e` (W021-G5 accepted).
- Implementation Target: Commit to be created upon authorized execution.
- Final Commit to be bound in `reports/w021_g6_master_audit_dossier.json`.

---

## 20. Amendment Compliance Matrix
- **Amendment v1.2:** Independent verification and DPDP compliance-by-design preserved.
- **Amendment v1.3:** Closed-loop execution and self-audit enforced.
- **Amendment v1.4:** Runtime proof and evidence semantics strictly distinguished.
- **Amendment v1.5-A:** Pre-implementation planning specification followed (all 22 mandatory sections present).

---

## 21. Operational Declarations (Amendment v1.5-A Section 27)
```text
PLAN STATUS: DRAFT / SUBMITTED FOR CTO RATIFICATION
APPROVED PLAN VERSION: PLAN-W021-G6-REV-1.0
PLAN APPROVAL EVIDENCE: PENDING WRITTEN CTO AUTHORIZATION
IMPLEMENTATION MAY BEGIN: NO (STRICTLY HALTED AT PLANNING GATE)
```

---

## 22. Plan Sign-Off & Review Request
The Pre-Implementation Plan for **Milestone W021-G6** is hereby submitted for independent CTO review and ratification.

**Mandatory Stop State Enforced:** Execution is halted. No code mutations, test implementations, or database queries will be executed until the explicit canonical authorization is granted:
> `PLAN APPROVED — PROCEED WITH IMPLEMENTATION ACCORDING TO THE APPROVED PLAN.`
