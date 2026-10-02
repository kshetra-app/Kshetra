# W021-G5: OpenAPI 3.1 Contract Dossier & Drift Invariance Report

**Status**: COMPLETED / VERIFIED / SUBMITTED FOR CTO ACCEPTANCE  
**Date**: 2026-10-02  
**Target Document**: `apps/api/openapi-saas-v1.yaml`  
**OpenAPI Specification**: `3.1.0`  
**Prior Baseline Accepted**: `2bc515cb2e2623dd824bfb6901a2228b392b7b0f` (W021-G4 formally accepted)  
**Target Environment**: `panIN-staging` (`fkpigozcqnmcvofuksar`)  
**Production Air-Gap**: STRICTLY PRESERVED & AIR-GAPPED (`ehfafcnimmjusyvplbah` untouched)  

---

## 1. Executive Summary & Objective

Under **CTO AUTHORIZATION — W021-G5 OPENAPI 3.1 CONTRACT** and **PLAN-W021-MASTER-REV-1.0 (Section 11 & Section 14)**, the canonical, machine-readable OpenAPI 3.1 specification for the accepted W021 public/partner developer SaaS API surface has been authored, verified, and reconciled against runtime implementation.

### Key Milestones Achieved:
1. **Authoritative Specification Created**: `apps/api/openapi-saas-v1.yaml` specifying OpenAPI `3.1.0`.
2. **100% Route Coverage**: Exactly 15 / 15 accepted W021-G4 routes are represented with zero missing routes and zero phantom/orphaned routes.
3. **Canonical Credential Contract Enforced**:
   - `panin_live_sk_<43-char Base64URL secret>`
   - `panin_test_sk_<43-char Base64URL secret>`
   - Exact regex: `^panin_(live|test)_sk_[0-9a-zA-Z_-]{43}$`
   - Explicit documentation that `kshetra_*` prefixes and unauthorized aliases are strictly rejected fail-closed with HTTP 401 (`UNAUTHORIZED`).
4. **Server-Owned Provenance Preserved**:
   - Public factual records strictly document `STATUTORY_FACT` (`OFFICIAL`).
   - Boundary simulations and seat projections strictly document `PANIN_SCENARIO` (`ACADEMIC_SIMULATION`, `SCENARIO_PROPOSED_REGIME`).
   - Scenario override attempts (`isScenario`, `is_scenario`, `simulation`) documented as failing closed with HTTP 400 (`SCENARIO_INPUT_FORBIDDEN`).
5. **Zero Citizen PII Leakage**: Schemas strictly prevent exposure of voter contact details, mobile numbers, emails, voter IDs, Aadhaar numbers, EPIC numbers, or password hashes.
6. **Reconciled Competing OpenAPI Sources**: Legacy `apps/api/openapi.yaml` (Phase-1 seed prototype) updated with an authoritative header explicitly marking it deprecated for external/SaaS use and pointing to `apps/api/openapi-saas-v1.yaml`.
7. **Automated Drift Invariance Suite**: `tests/saas-openapi-contract-drift.test.mjs` implemented and passing 15/15 tests (100%).

---

## 2. Complete Inventory of the 15 SaaS Routes

| # | HTTP Method | Fastify Route | OpenAPI Path | Operation ID | Domain | Authority Layer | Data Status |
|---|---|---|---|---|---|---|---|
| 1 | `GET` | `/api/vsaas/v1/geo/states` | `/api/vsaas/v1/geo/states` | `listStates` | Geography | `STATUTORY_FACT` | `OFFICIAL` |
| 2 | `GET` | `/api/vsaas/v1/geo/states/:stateCode` | `/api/vsaas/v1/geo/states/{stateCode}` | `getStateByCode` | Geography | `STATUTORY_FACT` | `OFFICIAL` |
| 3 | `GET` | `/api/vsaas/v1/geo/states/:stateCode/constituencies` | `/api/vsaas/v1/geo/states/{stateCode}/constituencies` | `listStateConstituencies` | Geography | `STATUTORY_FACT` | `OFFICIAL` |
| 4 | `GET` | `/api/vsaas/v1/geo/states/:stateCode/constituencies/:acNo` | `/api/vsaas/v1/geo/states/{stateCode}/constituencies/{acNo}` | `getConstituencyByAcNo` | Geography | `STATUTORY_FACT` | `OFFICIAL` |
| 5 | `GET` | `/api/vsaas/v1/elections` | `/api/vsaas/v1/elections` | `listElectionEvents` | Elections | `STATUTORY_FACT` | `OFFICIAL` |
| 6 | `GET` | `/api/vsaas/v1/elections/:id` | `/api/vsaas/v1/elections/{id}` | `getElectionEventById` | Elections | `STATUTORY_FACT` | `OFFICIAL` |
| 7 | `GET` | `/api/vsaas/v1/elections/:id/contests` | `/api/vsaas/v1/elections/{id}/contests` | `listElectionContests` | Elections | `STATUTORY_FACT` | `OFFICIAL` |
| 8 | `GET` | `/api/vsaas/v1/elections/:id/contests/:constituencyId` | `/api/vsaas/v1/elections/{id}/contests/{constituencyId}` | `getContestDetail` | Elections | `STATUTORY_FACT` | `OFFICIAL` |
| 9 | `GET` | `/api/vsaas/v1/entities/search` | `/api/vsaas/v1/entities/search` | `searchPoliticalEntities` | Entities | `STATUTORY_FACT` | `OFFICIAL` |
| 10 | `GET` | `/api/vsaas/v1/entities/persons/:id` | `/api/vsaas/v1/entities/persons/{id}` | `getPersonById` | Entities | `STATUTORY_FACT` | `OFFICIAL` |
| 11 | `GET` | `/api/vsaas/v1/entities/organizations/:id` | `/api/vsaas/v1/entities/organizations/{id}` | `getOrganizationById` | Entities | `STATUTORY_FACT` | `OFFICIAL` |
| 12 | `GET` | `/api/vsaas/v1/entities/legislators` | `/api/vsaas/v1/entities/legislators` | `listCurrentLegislators` | Entities | `STATUTORY_FACT` | `OFFICIAL` |
| 13 | `GET` | `/api/vsaas/v1/delim/regimes` | `/api/vsaas/v1/delim/regimes` | `getDelimitationRegimes` | Delimitation | `STATUTORY_FACT` | `OFFICIAL` |
| 14 | `GET` | `/api/vsaas/v1/delim/projections` | `/api/vsaas/v1/delim/projections` | `getDelimitationProjections` | Delimitation | `PANIN_SCENARIO` | `SCENARIO` |
| 15 | `GET` | `/api/vsaas/v1/delim/simulate/:stateCode` | `/api/vsaas/v1/delim/simulate/{stateCode}` | `simulateStateBoundaries` | Delimitation | `PANIN_SCENARIO` | `SCENARIO` |

---

## 3. Security Schemes & Credential Contract

Defined in `components.securitySchemes`:
```yaml
securitySchemes:
  ApiKeyAuth:
    type: apiKey
    in: header
    name: x-api-key
    description: >
      Primary cryptographic API key header.
      Accepted formats:
        - panin_live_sk_<43-char Base64URL secret> (Production live key)
        - panin_test_sk_<43-char Base64URL secret> (Testing / sandbox key)
      Regex: ^panin_(live|test)_sk_[0-9a-zA-Z_-]{43}$
      CRITICAL: Prefixes starting with 'kshetra_live_', 'kshetra_test_', or unauthorized aliases are strictly REJECTED with 401 UNAUTHORIZED.

  BearerAuth:
    type: http
    scheme: bearer
    bearerFormat: panin_api_key
    description: >
      Standard Authorization Bearer token header.
      Value: Authorization: Bearer panin_live_sk_<43 chars> / panin_test_sk_<43 chars>
      Regex: ^panin_(live|test)_sk_[0-9a-zA-Z_-]{43}$
      CRITICAL: Prefixes starting with 'kshetra_live_', 'kshetra_test_', or unauthorized aliases are strictly REJECTED with 401 UNAUTHORIZED.
```

---

## 4. Standard Response & Error Envelopes

Every route conforms strictly to the canonical envelopes defined in `@kshetra/shared`:
- **Success (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": { ... },
    "requestId": "6a66a1a1-9a77-4b71-bdfc-8c1cb27f0001",
    "timestamp": "2026-10-02T12:00:00.000Z"
  }
  ```
- **Error (`400`, `401`, `404`, `429`, `500`)**:
  ```json
  {
    "error": "Bad Request",
    "message": "...",
    "statusCode": 400,
    "code": "VALIDATION_ERROR",
    "requestId": "8b88b2b2-0b88-5c82-cefd-9d2dc38f0002",
    "timestamp": "2026-10-02T12:00:00.000Z"
  }
  ```

---

## 5. Automated Verification & Regression Results

### A. G5-Specific Contract Drift Battery (`tests/saas-openapi-contract-drift.test.mjs`)
- **Total Invariant Checks**: 15
- **Passed**: 15
- **Failed**: 0
- **Pass Rate**: 100.0%

### B. Complete Regression Battery (302 / 302 PASSED — 100%)
| Suite | Command | Result | Pass Rate |
|---|---|:---:|:---:|
| **W021-G5 OpenAPI Drift Suite** | `node tests/saas-openapi-contract-drift.test.mjs` | **15 / 15** | 100% |
| **W021-G4 SaaS Routes Battery** | `npm test --prefix apps/api -- src/__tests__/saas-v1-routes.test.ts` | **34 / 34** | 100% |
| **W021-G3 Auth & Security** | `npm test --prefix apps/api -- src/__tests__/saas-auth-g3.test.ts` | **17 / 17** | 100% |
| **W021-G3 Durable Quota** | `npm test --prefix apps/api -- src/__tests__/saas-durable-quota.test.ts` | **11 / 11** | 100% |
| **W021-G3 Atomic PG Quota** | `node tests/saas-atomic-quota-pg.test.mjs` | **14 / 14** | 100% |
| **W021-G2 Migration 056 Preflight** | `node tests/saas-migration-056-preflight.test.mjs` | **32 / 32** | 100% |
| **W018 Political Entities Invariants** | `node tests/political-entities-invariants.test.mjs` | **53 / 53** | 100% |
| **W019 Election Normalization** | `node tests/election-normalization-invariants.test.mjs` | **93 / 93** | 100% |
| **W020 Migration 055 Preflight** | `node tests/delimitation-migration-055-preflight.test.mjs` | **23 / 23** | 100% |
| **W020 G8 Integration** | `node tests/delimitation-g8-integration.test.mjs` | **25 / 25** | 100% |
| **W004 Observability & Hardening** | `npm test --prefix apps/api -- src/__tests__/observability.test.ts` | **19 / 19** | 100% |
| **Total Test Checks** | — | **302 / 302** | **100.0%** |

### C. TypeScript Build & Declared API Contract Drift
- `npm run build --prefix apps/api` (`tsc --noEmit`): **CLEAN (Exit Code 0)**
- `node scripts/check-api-contract-drift.mjs`: **9 / 9 Matched (100% Parity)**

---

## 6. Production Air-Gap Certification

- Production database `ehfafcnimmjusyvplbah`: 100% air-gapped, zero connections, zero modifications.
- Staging environment `fkpigozcqnmcvofuksar`: Exclusively used for validation.
- PostGIS 589 constituency geometries: row count `589` and SHA-256 digest `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` verified byte-exact and frozen.

---

## 7. Strict Gate Enforcement

- **W021-G5 Implementation is Complete and Frozen**.
- **W021-G6 (Security Probes, Master Battery & CTO Acceptance Dossier) and all subsequent work remain BLOCKED pending formal CTO review and acceptance.**
