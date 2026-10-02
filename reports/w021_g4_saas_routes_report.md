# W021-G4: Public/Partner SaaS API Routes Dossier & Evidence Report

**Status**: COMPLETED / VERIFIED / SUBMITTED FOR CTO ACCEPTANCE  
**Date**: 2026-10-02  
**Target Environment**: `panIN-staging` (`fkpigozcqnmcvofuksar` / `https://fkpigozcqnmcvofuksar.supabase.co`)  
**Production Air-Gap**: STRICTLY PRESERVED & AIR-GAPPED (`ehfafcnimmjusyvplbah` untouched)  
**Authorization**: `CTO AUTHORIZATION — W021-G4: PUBLIC/PARTNER SAAS API ROUTES`  
**Prior Baseline Accepted**: `f3473dbe26b3a9df0a0e4cf96b4738610148b2f3` (W021-G3 formally accepted)

---

## 1. Executive Summary & Objective

In accordance with the ratified **PLAN-W021-MASTER-REV-1.0** and the **CTO Authorization for Gate W021-G4**, the bounded public/partner SaaS API route layer has been implemented and fully verified under the accepted G3 cryptographic authentication foundation.

All endpoints are exposed strictly beneath the canonical path:
```
/api/vsaas/v1/...
```

Every endpoint operates behind the accepted G3 authentication middleware (`saasAuthPlugin`), deriving tenant context exclusively from the verified API key (`request.saasAuth.tenantId`), rejecting caller-supplied tenant spoofing, enforcing strict JSON Schema validation, preserving authoritative institutional provenance (`STATUTORY_FACT` vs `PANIN_SCENARIO`), and completely preventing citizen PII or service-role credential leakage.

---

## 2. Endpoints Implemented

A total of 15 SaaS endpoints across 4 institutional domains have been implemented in `apps/api/src/routes/saasV1.ts`:

### Geography & Constituency Domain (`/api/vsaas/v1/geo/...`)
1. `GET /api/vsaas/v1/geo/states` — List all states and Union Territories with statutory seat totals, loaded constituency counts, and gazette citations.
2. `GET /api/vsaas/v1/geo/states/:stateCode` — Single state metadata, total seats, and spatial boundary availability.
3. `GET /api/vsaas/v1/geo/states/:stateCode/constituencies` — Complete constituency roster for a given state with reservation status and district names.
4. `GET /api/vsaas/v1/geo/states/:stateCode/constituencies/:acNo` — High-precision constituency metadata by state code and assembly constituency number.

### Normalized Elections Domain (`/api/vsaas/v1/elections/...`)
5. `GET /api/vsaas/v1/elections` — Macro election events query with state, year, and election type filters.
6. `GET /api/vsaas/v1/elections/:id` — Single election event details, turnout totals, voter counts, and gazette references.
7. `GET /api/vsaas/v1/elections/:id/contests` — List assembly contests within an election event with search, party filters, and pagination.
8. `GET /api/vsaas/v1/elections/:id/contests/:constituencyId` — Contest details, EVM/postal breakdowns, candidate rankings, victory margins, and ballot choices.

### Canonical Political Entities Domain (`/api/vsaas/v1/entities/...`)
9. `GET /api/vsaas/v1/entities/search` — Search canonical persons and recognized political organizations with state and role filters.
10. `GET /api/vsaas/v1/entities/persons/:id` — Canonical public profile of elected representatives and candidates.
11. `GET /api/vsaas/v1/entities/organizations/:id` — Political organization details, recognition tier, and election symbol metadata.
12. `GET /api/vsaas/v1/entities/legislators` — Roster of current gazetted legislators with tenure dates and legislative jurisdictions.

### Delimitation Regimes & Governed Scenarios Domain (`/api/vsaas/v1/delim/...`)
13. `GET /api/vsaas/v1/delim/regimes` — Statutory delimitation orders, historical legal regimes, and constitutional freeze timelines.
14. `GET /api/vsaas/v1/delim/projections` — National seat projection models under Article 170 / Census 2011 with academic simulation provenance.
15. `GET /api/vsaas/v1/delim/simulate/:stateCode` — Governed boundary redistribution simulation (Hare-Niemeyer / Hamilton method) with strict server-owned scenario provenance and statutory disclaimers.

---

### 3. Security, Authentication & Tenant Isolation Model

1. **Canonical API-Key Credential Contract**:
   - The authoritative runtime contract strictly accepts:
     - `panin_live_sk_<43-char Base64URL secret>` (production live key)
     - `panin_test_sk_<43-char Base64URL secret>` (testing/sandbox key)
   - Runtime Regex: `^panin_(live|test)_sk_[0-9a-zA-Z_-]{43}$` (enforced in `apps/api/src/lib/saasCrypto.ts`).
   - Credential transmission supported via `x-api-key: panin_...` header or `Authorization: Bearer panin_...` header.
   - **Disallowed Credential Aliases**: Unauthorized prefixes (including `kshetra_live_...`, `kshetra_test_...`, `panin_dev_sk_...`) are rejected fail-closed with HTTP `401 Unauthorized` (`UNAUTHORIZED`) prior to database lookup or hash computation. No credential alias is accepted.
2. **Authentication Boundary**: Every route executes behind `saasAuthPlugin`. API keys are validated using SHA-256 hash lookup and constant-time verification against active keys in `saas_api_keys`.
3. **Tenant Context Immutability**: All operations bind directly to `request.saasAuth.tenantId`. Query parameters (`?tenant_id=...`), headers (`x-tenant-id`), or request body overrides are completely ignored.
4. **Dual-Layer Rate Limiting**:
   - Local token-bucket burst protection (600 req/min for `pro` tier) returns `429 Too Many Requests` when exhausted.
   - Authoritative PostgreSQL monthly ledger (`saas_usage_ledger`) enforces durable tenant-level monthly ceilings (500,000 req/mo for `pro` tier).
5. **Scenario Override Protection**: A Fastify pre-validation hook blocks any client attempts to pass `isScenario`, `is_scenario`, or `simulation` query flags (`400 Bad Request` with code `SCENARIO_INPUT_FORBIDDEN`).
6. **Zero Citizen PII Leakage**: Explicitly tested and proven that no voter phone numbers, emails, voter IDs, Aadhaar numbers, EPIC numbers, password hashes, or service-role keys are returned in any response.

---

## 4. Verification Suite Results

### A. SaaS V1 Routes Test Battery (`apps/api/src/__tests__/saas-v1-routes.test.ts`)
- **Total Tests**: 34
- **Passed**: 34
- **Failed**: 0
- **Pass Rate**: 100.0%

### B. Comprehensive Regression Battery
1. `tests/political-entities-invariants.test.mjs` (W018): **53/53 PASS** (100%)
2. `tests/election-normalization-invariants.test.mjs` (W019): **93/93 PASS** (100%)
3. `tests/delimitation-migration-055-preflight.test.mjs` (W020 Preflight): **23/23 PASS** (100%)
4. `tests/delimitation-g8-integration.test.mjs` (W020 G8): **25/25 PASS** (100%)
5. `tests/saas-migration-056-preflight.test.mjs` (W021-G2): **32/32 PASS** (100%)
6. `tests/saas-atomic-quota-pg.test.mjs` (W021-G3 Atomic): **14/14 PASS** (100%)
7. `apps/api/src/__tests__/saas-durable-quota.test.ts` (W021-G3 Quota): **11/11 PASS** (100%)
8. `apps/api/src/__tests__/saas-auth-g3.test.ts` (W021-G3 Auth): **17/17 PASS** (100%)
9. `apps/api/src/__tests__/observability.test.ts` (W004 Observability): **19/19 PASS** (100%)

**Total Regression Checks**: **287 / 287 PASSED (100.0%)**

### C. TypeScript Build & Contract Drift
- `npm run build --prefix apps/api` (`tsc --noEmit`): **CLEAN (Exit Code 0)**
- `node scripts/check-api-contract-drift.mjs`: **9 / 9 Matched (100% Parity)**

---

## 5. Production Air-Gap Certification

- Production database `ehfafcnimmjusyvplbah` has zero active connections, zero modifications, and zero references in staging environment configuration.
- Staging environment `fkpigozcqnmcvofuksar` was exclusively targeted and verified.
- PostGIS 589 constituency geometries count and SHA-256 digest (`f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`) remain strictly frozen and unmutated.

---

## 6. Strict Gate Enforcement

- **W021-G4 Implementation is Complete and Frozen**.
- **W021-G5 (Canonical SaaS OpenAPI Specification & Drift Verification) and all subsequent gates remain BLOCKED pending formal CTO acceptance.**
