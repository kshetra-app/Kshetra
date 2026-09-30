# Milestone W020-G5 Acceptance Remediation R2 Report

**Target Milestone:** W020-G5 (Delimitation Engine Foundation)  
**Directive:** CTO DIRECTIVE — W020-G5 ACCEPTANCE REMEDIATION R2  
**Timestamp:** 2026-09-30T09:00:00Z  
**Canonical Branch:** `master`  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`)  
**Production Status:** `ehfafcnimmjusyvplbah` (STRICTLY AIR-GAPPED & UNTOUCHED)  
**Mobile Status:** `apps/mobile/**` (STRICTLY FROZEN, 0 CHANGES)  
**PostGIS Baseline:** 589 rows, exact SHA-256 match `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`  

---

## 1. Executive Summary

In accordance with **CTO DIRECTIVE — W020-G5 ACCEPTANCE REMEDIATION R2**, this remediation completely and strictly resolves the remaining semantic blocker regarding **Scenario Source of Truth & Canonical Legal Regime Vocabulary**:

1. **Derived-Only `isScenario` Canonical Rule:**
   - Enforced canonical rule: `isScenario = (legalStatus === 'SCENARIO_PROPOSED_REGIME')`.
   - Prohibited and eliminated any user-supplied `isScenario` boolean, persistent database columns, API overrides, and "true in user simulation" exceptions.
   - Added Fastify `preValidation` hook across all delimitation routes that immediately rejects client requests providing `isScenario`, `is_scenario`, or `simulation` query or body parameters with HTTP 400 `SCENARIO_INPUT_FORBIDDEN`.
2. **Canonical Legal Regime Vocabulary:**
   - Bounded all legal regime references strictly to the 4 canonical W014 regimes from Migration 041: `HISTORICAL_LEGAL_REGIME`, `CURRENT_LEGAL_REGIME`, `FUTURE_ANTICIPATED_REGIME`, and `SCENARIO_PROPOSED_REGIME`.
   - Completely eliminated ad-hoc regimes (`SIMULATION_PROPOSED`, `SIMULATION_PROPOSED_REGIME`, `STATUTORY_ENACTED_REGIME`) from application and contract code.
   - The Census-2011 mathematical derivation (119 total / 18 SC / 10 ST / 91 General) is NOT artificially converted into a scenario; it remains `DETERMINISTIC_DERIVED` + `DERIVED` under `CURRENT_LEGAL_REGIME` with `isScenario = false`.
3. **Article 332 Constitutional Proportionality Terminology:**
   - Corrected wording across contracts, services, and tests: Article 332 supplies the constitutional proportionality principle; Hamilton / Largest Remainder is PANIN's deterministic computational allocation method applied to that principle.
   - Prohibited any phrasing implying Article 332 itself mandates the Hamilton algorithm.
   - Standardized description: *"PANIN deterministic Hamilton/Largest Remainder allocation applied to the Article 332 proportionality principle."*

All 34 master invariants, 33 Fastify route integration tests, 53 W018 tests, 93 W019 tests, 23 W020-G4 preflight tests, 9/9 API contract drift checks, and all TypeScript builds pass with 100% parity.

---

## 2. Scenario Source of Truth Audit

The canonical single source of truth for delimitation scenarios is established as:
```typescript
isScenario = (legalStatus === 'SCENARIO_PROPOSED_REGIME');
```

| Check | Specification Requirement | Implementation Enforcement | Status |
|---|---|---|---|
| **No User-Supplied Boolean** | Client cannot send `isScenario` in query or body | Fastify `preValidation` hook checks query and body; returns 400 `SCENARIO_INPUT_FORBIDDEN` | **PASS** |
| **No API Override** | No route allows overriding `isScenario` | Zero route handlers accept `isScenario` parameter | **PASS** |
| **No DB Column** | Zero persistent `is_scenario` DB columns | Verified against database catalog; Migration 041/055 schema confirmed | **PASS** |
| **No Second Source of Truth** | `isScenario` must be computed purely from `legalStatus` | `buildScenarioEnclosure` evaluates `provenance.legalStatus === 'SCENARIO_PROPOSED_REGIME'` | **PASS** |
| **Derived True for Scenario** | Governed scenario execution yields `true` | `simulateBoundaries` sets `SCENARIO_PROPOSED_REGIME`, resulting in `isScenario: true` | **PASS** |
| **Derived False for Non-Scenario** | All 3 canonical non-scenario regimes yield `false` | Verified across `CURRENT_LEGAL_REGIME`, `HISTORICAL_LEGAL_REGIME`, `FUTURE_ANTICIPATED_REGIME` | **PASS** |

---

## 3. Canonical Legal Regime Vocabulary Audit

W014 (Migration 041 line 371) defines the canonical legal regime check constraint:
```sql
CHECK (legal_status IN ('HISTORICAL_LEGAL_REGIME', 'CURRENT_LEGAL_REGIME', 'FUTURE_ANTICIPATED_REGIME', 'SCENARIO_PROPOSED_REGIME'))
```

In R2, all delimitation code and contracts strictly conform to this 4-member enum:

```typescript
export type DelimitationLegalRegime =
  | 'HISTORICAL_LEGAL_REGIME'
  | 'CURRENT_LEGAL_REGIME'
  | 'FUTURE_ANTICIPATED_REGIME'
  | 'SCENARIO_PROPOSED_REGIME';
```

- **Statutory Baseline:** `CURRENT_LEGAL_REGIME` (`STATUTORY_FACT`, `OFFICIAL`, 19 SC / 12 ST / 88 General / 119 Total)
- **Census 2011 Mathematical Derivation:** `CURRENT_LEGAL_REGIME` (`DETERMINISTIC_DERIVED`, `DERIVED`, 18 SC / 10 ST / 91 General / 119 Total, `isScenario = false`)
- **Hypothetical Simulation (`simulateBoundaries`):** `SCENARIO_PROPOSED_REGIME` (`SIMULATED_REPRESENTATION`, `ESTIMATE`, `isScenario = true`)

---

## 4. Repository-Wide Semantic Scan

A thorough repository search was executed for all four sensitive tokens:

| Token | Occurrences | Audit Finding & Purpose |
|---|---|---|
| `SIMULATION_PROPOSED` | 0 in active code/data | Present only in historical R1 reports (`w020_g5_acceptance_remediation_r1.*`), historical DEC-089, negative assertions in tests (`delimitation.test.ts:602`, `delimitation-g5-invariants.test.mjs:795`), and contract comment prohibition. Zero active instances. |
| `SIMULATION_PROPOSED_REGIME` | 0 in active code/data | Present only in negative test assertions (`delimitation.test.ts:603`, `delimitation-g5-invariants.test.mjs:795`) and contract comment prohibition. Zero active instances. |
| `isScenario` | Active derived property | Read-only application DTO property derived at runtime from `legalStatus === 'SCENARIO_PROPOSED_REGIME'`. Prohibited as client input across all routes. Zero persistent database columns. |
| `SCENARIO_PROPOSED_REGIME` | Canonical W014 enum value | Migration 041 canonical check constraint value. Assigned strictly to analytical simulations in `simulateBoundaries()`. |

---

## 5. Before vs After Comparisons

### 5.1 Contracts & DTOs (`packages/shared/src/contracts/delimitation.ts`)

#### Before (R1):
```typescript
// Ad-hoc regimes used in service and contracts:
// legalStatus was string allowing 'STATUTORY_ENACTED_REGIME' or 'SIMULATION_PROPOSED'
export interface MathematicalProvenance {
  ...
  legalStatus: string; // or unconstrained union
}
```

#### After (R2):
```typescript
export type DelimitationLegalRegime =
  | 'HISTORICAL_LEGAL_REGIME'
  | 'CURRENT_LEGAL_REGIME'
  | 'FUTURE_ANTICIPATED_REGIME'
  | 'SCENARIO_PROPOSED_REGIME';

export interface MathematicalProvenance {
  ...
  legalStatus: DelimitationLegalRegime;
}
```

### 5.2 Delimitation Route Ingress (`apps/api/src/routes/delimitation.ts`)

#### Before (R1):
No check for client-supplied `isScenario` or `simulation` parameters on ingress.

#### After (R2):
```typescript
app.addHook('preValidation', async (request, reply) => {
  const q = request.query as Record<string, unknown> | undefined;
  if (q && ('isScenario' in q || 'is_scenario' in q || 'simulation' in q)) {
    return sendApiError(
      reply,
      request,
      400,
      'Bad Request',
      'Direct provision or override of isScenario or simulation boolean is strictly forbidden. isScenario is derived exclusively from canonical legalStatus.',
      { code: 'SCENARIO_INPUT_FORBIDDEN' }
    );
  }
  const b = request.body as Record<string, unknown> | undefined;
  if (b && typeof b === 'object' && ('isScenario' in b || 'is_scenario' in b || 'simulation' in b)) {
    return sendApiError(
      reply,
      request,
      400,
      'Bad Request',
      'Direct provision or override of isScenario or simulation boolean is strictly forbidden. isScenario is derived exclusively from canonical legalStatus.',
      { code: 'SCENARIO_INPUT_FORBIDDEN' }
    );
  }
});
```

### 5.3 Article 332 Wording (`apps/api/src/services/delimitationService.ts`)

#### Before (R1):
Stated or implied that Article 332 mandates the Hamilton algorithm.

#### After (R2):
Explicitly states: *"PANIN deterministic Hamilton/Largest Remainder allocation applied to the Article 332 proportionality principle, ensuring exact seat conservation."*

---

## 6. Required Semantic Tests Results (14 Checks)

| # | Semantic Requirement | Test Suite & Assertion | Result |
|---|---|---|---|
| 1 | Request cannot provide `isScenario` | `delimitation.test.ts:512` / `delimitation-g5-invariants.test.mjs:730` | **PASS (400 SCENARIO_INPUT_FORBIDDEN)** |
| 2 | Request cannot override `isScenario` | `delimitation.test.ts:524` / `delimitation-g5-invariants.test.mjs:730` | **PASS (400 SCENARIO_INPUT_FORBIDDEN)** |
| 3 | Response `isScenario` derived exclusively from `legalStatus` | `delimitation.test.ts:546` / `delimitation-g5-invariants.test.mjs:237` | **PASS (Derived-only)** |
| 4 | `SCENARIO_PROPOSED_REGIME` => `isScenario: true` | `delimitation.test.ts:556` / `delimitation-g5-invariants.test.mjs:255` | **PASS (`isScenario === true`)** |
| 5 | Non-scenario regimes => `isScenario: false` | `delimitation.test.ts:575` / `delimitation-g5-invariants.test.mjs:249` | **PASS (All false)** |
| 6 | No persisted `is_scenario` DB column | `delimitation-g4-preflight:W020-G4-SCH-03` | **PASS (0 columns)** |
| 7 | No `SIMULATION_PROPOSED` legal regime exists | `delimitation.test.ts:602` / `delimitation-g5-invariants.test.mjs:795` | **PASS (0 occurrences)** |
| 8 | No API accepts simulation boolean as 2nd source | `delimitation.test.ts:535` / `delimitation-g5-invariants.test.mjs:745` | **PASS (400 SCENARIO_INPUT_FORBIDDEN)** |
| 9 | Census-2011 18/10/91 is `DETERMINISTIC_DERIVED` + `DERIVED` | `delimitation.test.ts:365` / `delimitation-g5-invariants.test.mjs:718` | **PASS** |
| 10 | Current 19/12/88 is `STATUTORY_FACT` + `OFFICIAL` | `delimitation.test.ts:358` / `delimitation-g5-invariants.test.mjs:710` | **PASS** |
| 11 | Article 332 wording: Hamilton applied to principle | `delimitation.test.ts:581` / `delimitation-g5-invariants.test.mjs:277` | **PASS** |
| 12 | Mathematical provenance remains complete | `delimitation-g5-invariants:W020-G5-TAX-03` | **PASS (10 mandatory fields)** |
| 13 | Deterministic tie-breaking remains stable | `delimitation-g5-invariants:W020-G5-MTH-08` | **PASS (Lexicographical SC > ST)** |
| 14 | Repeated execution remains byte/datum deterministic | `delimitation-g5-invariants:W020-G5-MTH-09` | **PASS (100 runs identical)** |

---

## 7. Full Regression Rechecks

| Suite / Gate | Command | Scope | Result |
|---|---|---|---|
| Delimitation Invariants | `node tests/delimitation-g5-invariants.test.mjs` | 34 checks across 4 planes | **34/34 PASS (100%)** |
| Delimitation Route Jest | `npm test --prefix apps/api -- src/__tests__/delimitation.test.ts` | 33 route & semantic tests | **33/33 PASS (100%)** |
| W018 Political Entities | `node tests/political-entities-invariants.test.mjs` | 53 invariant checks | **53/53 PASS (100%)** |
| W019 Election Normalization | `node tests/election-normalization-invariants.test.mjs` | 93 invariant checks | **93/93 PASS (100%)** |
| W020-G4 Migration Preflight | `node tests/delimitation-migration-055-preflight.test.mjs` | 23 preflight checks | **23/23 PASS (100%)** |
| API Contract Drift | `node scripts/check-api-contract-drift.mjs` | 9 declared contract endpoints | **9/9 MATCH (100%)** |
| API Build | `npm run build --prefix apps/api` | Fastify TypeScript compilation | **EXIT 0 (Clean)** |
| Mobile TypeScript | `npx tsc --noEmit -p apps/mobile/tsconfig.json` | React Native TypeScript compilation | **EXIT 0 (Clean)** |
| Shared Build | `npm run build --prefix packages/shared` | Core library contracts | **EXIT 0 (Clean)** |
| 589 Geometry Baseline | PostGIS verification against staging | 589 rows, exact SHA-256 digest | **FROZEN MATCH** |
| Production Air-Gap | Host verification | `ehfafcnimmjusyvplbah` | **AIR-GAPPED & UNTOUCHED** |

---

## 8. Exact Files Changed

1. `packages/shared/src/contracts/delimitation.ts` — Defined canonical `DelimitationLegalRegime` enum; updated `MathematicalProvenance.legalStatus`.
2. `apps/api/src/services/delimitationService.ts` — Replaced ad-hoc regimes with `CURRENT_LEGAL_REGIME`; refined Article 332 wording to state Hamilton is applied to the Article 332 proportionality principle; ensured `isScenario` is derived strictly from `legalStatus === 'SCENARIO_PROPOSED_REGIME'`.
3. `apps/api/src/routes/delimitation.ts` — Added `preValidation` hook rejecting `isScenario`, `is_scenario`, and `simulation` client parameters with 400 `SCENARIO_INPUT_FORBIDDEN`.
4. `apps/api/src/__tests__/delimitation.test.ts` — Added 6 R2 semantic tests verifying fail-closed parameter rejection, canonical regime vocabulary, and Article 332 wording.
5. `tests/delimitation-g5-invariants.test.mjs` — Hardened `W020-G5-TAX-04` (testing all canonical regimes); updated `W020-G5-MTH-01` (Article 332 wording); added `W020-G5-API-12` (rejection hook); added `W020-G5-API-13` (canonical regime vocabulary).
6. `reports/w020_g5_acceptance_remediation_r2.json` — Machine-readable R2 evidence artifact.
7. `reports/w020_g5_acceptance_remediation_r2.md` — Human-readable R2 evidence report.

---

## 9. Gate Status

**MILESTONE W020-G5 REMEDIATION R2 IS MATERIAL AND COMPLETE.**  
Status updated strictly to:
`IMPLEMENTED / TESTED / VERIFIED / SUBMITTED FOR CTO ACCEPTANCE`

- W020-G5 remains **NOT ACCEPTED** (awaiting independent CTO review).
- W020-G6 remains **STRICTLY BLOCKED**.
- No further milestones implemented.
