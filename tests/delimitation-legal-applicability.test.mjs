/**
 * tests/delimitation-legal-applicability.test.mjs
 *
 * Dedicated Machine-Verifiable Semantic Test Suite for Blocker G8-LEGAL-001
 * Authority: CTO REMEDIATION DIRECTIVE — W020-G8 LEGAL APPLICABILITY EVIDENCE
 *
 * Implements the 16-case semantic verification matrix (Cases A through P):
 * - Case A: Standard Indian State Assembly (Article 170(1) evaluated: 60 <= S <= 500)
 * - Case B: Sikkim Special Constitutional Regime (Article 371F(f) floor 30, notwithstanding clause)
 * - Case C: Mizoram Special Constitutional Regime (Article 371G(b) floor 40, notwithstanding clause)
 * - Case D: Goa Special Constitutional Regime & Statutory Framework (Art 371-I floor 30, Reorganisation Act 1987 Sec 12 exact 40, factual 40, planes distinct)
 * - Case E: Puducherry / UT Assembly (UT Act 1963 Section 3 = 30, NOT Article 170 State Assembly)
 * - Case F: Historical Regime (Evaluated under historical temporal validity)
 * - Case G: Future Anticipated Regime (Does NOT become current statutory fact)
 * - Case H: Scenario Proposed Regime (Strictly non-statutory scenario projection)
 * - Case I: Missing legal evidence / uncataloged combination -> fails closed with LEGAL_RULE_NOT_FOUND (404)
 * - Case J: Invalid entity type -> fails closed with INVALID_ENTITY_TYPE (400)
 * - Case K: asOf date inside temporal validity -> succeeds
 * - Case L: asOf date outside temporal validity -> fails closed with TEMPORAL_VALIDITY_MISMATCH (400)
 * - Case M: Evidence reference mismatch -> fails closed with EVIDENCE_PROVENANCE_MISMATCH (400)
 * - Case N: Scenario cannot masquerade as current statutory fact (isStatutoryFact === false, isScenario === true)
 * - Case O: UT Assembly cannot enter State Article 170 path
 * - Case P: Article 170 ceiling (500) remains separate from PANIN computational safety ceiling (MAX_SAFE_REQUESTED_SEATS = 10000)
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Self-spawn with tsx loader if not already present
if (!process.execArgv.some((arg) => arg.includes('tsx'))) {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: 'inherit',
      env: process.env,
    }
  );
  process.exit(result.status ?? 0);
}

const { delimitationService } = await import('../apps/api/src/services/delimitationService.ts');
const { delimitationQueryService } = await import('../apps/api/src/services/delimitationQueryService.ts');

let passed = 0;
let failed = 0;
const results = [];

function recordCheck(id, title, pass, observed = '', details = '') {
  const status = pass ? 'PASS' : 'FAIL';
  if (pass) passed++;
  else failed++;
  console.log(`[${status}] ${id}: ${title}`);
  if (observed) console.log(`       Observed: ${observed}`);
  if (details) console.log(`       Details:  ${details}`);
  results.push({ id, title, status, observed, details });
}

console.log('================================================================');
console.log('W020-G8: LEGAL APPLICABILITY MODEL SEMANTIC VERIFICATION SUITE');
console.log('Target: 16-Case Matrix (G8-LEGAL-001 Verification)');
console.log('================================================================\n');

// ─────────────────────────────────────────────────────────────────────────────
// CASE A: Standard Indian State Legislative Assembly
// ─────────────────────────────────────────────────────────────────────────────
try {
  const res = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
  });

  const pass =
    res.entityType === 'STATE_LEGISLATIVE_ASSEMBLY' &&
    res.regimeType === 'CURRENT_LEGAL_REGIME' &&
    res.constitutionalProvision === 'Article 170(1)' &&
    res.constitutionalFloor === 60 &&
    res.constitutionalCeiling === 500 &&
    res.isStatutoryFact === true &&
    res.isScenario === false &&
    res.provenance?.evidenceReference === 'CONST-IND-ART170';

  recordCheck(
    'CASE_A_STANDARD_STATE',
    'Standard State Assembly evaluates Article 170(1) (60 <= S <= 500) as current statutory fact',
    pass,
    `Provision: ${res.constitutionalProvision}, Bounds: [${res.constitutionalFloor}, ${res.constitutionalCeiling}], Evidence: ${res.provenance?.evidenceReference}`,
    'LEGAL_INVARIANT: Article 170(1) correctly evaluated in standard State Assembly context'
  );
} catch (err) {
  recordCheck('CASE_A_STANDARD_STATE', 'Standard State Assembly evaluation', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE B: Sikkim Special Constitutional Regime
// ─────────────────────────────────────────────────────────────────────────────
try {
  const res = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    jurisdictionCode: 'SK',
  });

  const pass =
    res.constitutionalProvision === 'Article 371F(f)' &&
    res.statutoryProvision === 'Constitution (Thirty-sixth Amendment) Act, 1975' &&
    res.constitutionalFloor === 30 &&
    res.constitutionalCeiling === undefined &&
    res.currentFactualSeats === 32 &&
    res.notwithstandingClause === true &&
    res.isStatutoryFact === true &&
    res.provenance?.evidenceReference === 'CONST-IND-ART371F';

  recordCheck(
    'CASE_B_SIKKIM',
    'Sikkim resolves Article 371F(f) (floor 30, notwithstanding clause, factual 32) without generic exception list',
    pass,
    `Provision: ${res.constitutionalProvision}, Floor: ${res.constitutionalFloor}, Factual: ${res.currentFactualSeats}, Notwithstanding: ${res.notwithstandingClause}`,
    'LEGAL_INVARIANT: Article 371F(f) typed constitutional provision resolved'
  );
} catch (err) {
  recordCheck('CASE_B_SIKKIM', 'Sikkim evaluation', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE C: Mizoram Special Constitutional Regime
// ─────────────────────────────────────────────────────────────────────────────
try {
  const res = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    jurisdictionCode: 'MZ',
  });

  const pass =
    res.constitutionalProvision === 'Article 371G(b)' &&
    res.statutoryProvision === 'State of Mizoram Act, 1986 (Act No. 34 of 1986)' &&
    res.constitutionalFloor === 40 &&
    res.currentFactualSeats === 40 &&
    res.notwithstandingClause === true &&
    res.isStatutoryFact === true &&
    res.provenance?.evidenceReference === 'CONST-IND-ART371G';

  recordCheck(
    'CASE_C_MIZORAM',
    'Mizoram resolves Article 371G(b) (floor 40, notwithstanding clause, factual 40) as typed constitutional rule',
    pass,
    `Provision: ${res.constitutionalProvision}, Floor: ${res.constitutionalFloor}, Factual: ${res.currentFactualSeats}`,
    'LEGAL_INVARIANT: Article 371G(b) typed constitutional provision resolved'
  );
} catch (err) {
  recordCheck('CASE_C_MIZORAM', 'Mizoram evaluation', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE D: Goa Special Constitutional Regime & Statutory Framework
// ─────────────────────────────────────────────────────────────────────────────
try {
  const res = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    jurisdictionCode: 'GA',
  });

  // Verify strict distinction:
  // - Constitutional floor is 30 under Article 371-I (NOT 40)
  // - Statutory exact seats is 40 under Reorganisation Act 1987 Section 12 (NOT Section 9)
  // - Current factual seats is 40
  // - These planes remain distinct
  const pass =
    res.constitutionalProvision === 'Article 371-I' &&
    res.constitutionalFloor === 30 &&
    res.statutoryProvision?.includes('Section 12') &&
    !res.statutoryProvision?.includes('Section 9') &&
    res.statutoryExactSeats === 40 &&
    res.currentFactualSeats === 40 &&
    res.provenance?.evidenceReference === 'MHA-ACT-1987-18';

  recordCheck(
    'CASE_D_GOA',
    'Goa preserves plane distinction: Art 371-I floor 30, Reorganisation Act 1987 Sec 12 exact 40, factual 40',
    pass,
    `ConstFloor: ${res.constitutionalFloor} (Art 371-I), StatExact: ${res.statutoryExactSeats} (Sec 12), Factual: ${res.currentFactualSeats}`,
    'LEGAL_INVARIANT: Distinct constitutional, statutory, and factual planes strictly preserved for Goa'
  );
} catch (err) {
  recordCheck('CASE_D_GOA', 'Goa evaluation', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE E: Puducherry / Union Territory Legislative Assembly
// ─────────────────────────────────────────────────────────────────────────────
try {
  const res = delimitationQueryService.resolveLegalApplicability({
    entityType: 'UNION_TERRITORY_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    jurisdictionCode: 'PY',
  });

  const pass =
    res.entityType === 'UNION_TERRITORY_ASSEMBLY' &&
    res.constitutionalProvision === 'Article 239A' &&
    res.statutoryProvision === 'Government of Union Territories Act, 1963 (Section 3)' &&
    res.constitutionalFloor === 30 &&
    res.statutoryExactSeats === 30 &&
    res.constitutionalCeiling === undefined && // Does NOT inherit Article 170 500 ceiling
    res.provenance?.evidenceReference === 'MHA-UT-ACT-1963';

  recordCheck(
    'CASE_E_PUDUCHERRY_UT',
    'Puducherry resolved under UT Act 1963 Sec 3 (30 seats) and NOT as Article 170 State Assembly',
    pass,
    `Entity: ${res.entityType}, Statutory: ${res.statutoryProvision}, Exact: ${res.statutoryExactSeats}, ConstCeiling: ${res.constitutionalCeiling}`,
    'LEGAL_INVARIANT: UT Assembly strictly decoupled from State Article 170 path'
  );
} catch (err) {
  recordCheck('CASE_E_PUDUCHERRY_UT', 'Puducherry evaluation', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE F: Historical Regime
// ─────────────────────────────────────────────────────────────────────────────
try {
  const res = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'HISTORICAL_LEGAL_REGIME',
    jurisdictionCode: 'AP_COMPOSITE',
  });

  const pass =
    res.regimeType === 'HISTORICAL_LEGAL_REGIME' &&
    res.temporalValidity.isCurrent === false &&
    res.historicalFactualSeats === 294 &&
    res.provenance?.evidenceReference === 'ECI-DELIM-2008-AP';

  recordCheck(
    'CASE_F_HISTORICAL_REGIME',
    'Historical regime evaluated under historical temporal validity (2008 AP composite: 294 seats, isCurrent: false)',
    pass,
    `Regime: ${res.regimeType}, HistoricalSeats: ${res.historicalFactualSeats}, isCurrent: ${res.temporalValidity.isCurrent}`,
    'LEGAL_INVARIANT: Historical regime evaluated under past statutory order'
  );
} catch (err) {
  recordCheck('CASE_F_HISTORICAL_REGIME', 'Historical regime evaluation', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE G: Future Anticipated Regime
// ─────────────────────────────────────────────────────────────────────────────
try {
  const res = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'FUTURE_ANTICIPATED_REGIME',
  });

  const pass =
    res.regimeType === 'FUTURE_ANTICIPATED_REGIME' &&
    res.isStatutoryFact === false &&
    res.temporalValidity.isCurrent === false &&
    res.constitutionalProvision?.includes('84th Amendment') &&
    res.provenance?.evidenceReference === 'ECI-POST-2026-TRACKING';

  recordCheck(
    'CASE_G_FUTURE_REGIME',
    'Future anticipated regime does NOT become current statutory fact (isStatutoryFact: false, isCurrent: false)',
    pass,
    `Regime: ${res.regimeType}, isStatutoryFact: ${res.isStatutoryFact}, isCurrent: ${res.temporalValidity.isCurrent}`,
    'LEGAL_INVARIANT: Future anticipated regime strictly non-statutory'
  );
} catch (err) {
  recordCheck('CASE_G_FUTURE_REGIME', 'Future regime evaluation', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE H: Scenario Proposed Regime
// ─────────────────────────────────────────────────────────────────────────────
try {
  const res = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'SCENARIO_PROPOSED_REGIME',
  });

  const pass =
    res.regimeType === 'SCENARIO_PROPOSED_REGIME' &&
    res.isScenario === true &&
    res.isStatutoryFact === false &&
    res.constitutionalProvision === undefined && // Zero statutory force
    res.provenance?.evidenceReference === 'PANIN-SIM-SCENARIO';

  recordCheck(
    'CASE_H_SCENARIO_REGIME',
    'Scenario proposed regime remains strictly non-statutory (isScenario: true, isStatutoryFact: false, 0 legal force)',
    pass,
    `Regime: ${res.regimeType}, isScenario: ${res.isScenario}, isStatutoryFact: ${res.isStatutoryFact}`,
    'SCENARIO_INVARIANT: Scenario output strictly isolated from statutory facts'
  );
} catch (err) {
  recordCheck('CASE_H_SCENARIO_REGIME', 'Scenario regime evaluation', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE I: Missing Legal Evidence / Uncataloged Combination
// ─────────────────────────────────────────────────────────────────────────────
try {
  let thrown = false;
  let errorCode = '';
  try {
    delimitationQueryService.resolveLegalApplicability({
      entityType: 'COUNCIL_OF_STATES',
      regimeType: 'CURRENT_LEGAL_REGIME',
      jurisdictionCode: 'NONEXISTENT_JURISDICTION',
    });
  } catch (err) {
    thrown = true;
    errorCode = err.code || err.message;
  }

  const pass = thrown && errorCode === 'LEGAL_RULE_NOT_FOUND';

  recordCheck(
    'CASE_I_MISSING_EVIDENCE',
    'Uncataloged entity/regime combination fails closed with 404 LEGAL_RULE_NOT_FOUND (0 fabrication)',
    pass,
    `Thrown: ${thrown}, ErrorCode: ${errorCode}`,
    'LEGAL_INVARIANT: Fail-closed on missing authoritative evidence'
  );
} catch (err) {
  recordCheck('CASE_I_MISSING_EVIDENCE', 'Missing evidence fail-closed', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE J: Invalid Entity / Regime Combination
// ─────────────────────────────────────────────────────────────────────────────
try {
  let thrown = false;
  let errorCode = '';
  try {
    delimitationQueryService.resolveLegalApplicability({
      entityType: 'INVALID_SYNTHETIC_ENTITY',
      regimeType: 'CURRENT_LEGAL_REGIME',
    });
  } catch (err) {
    thrown = true;
    errorCode = err.code || err.message;
  }

  const pass = thrown && errorCode === 'INVALID_ENTITY_TYPE';

  recordCheck(
    'CASE_J_INVALID_COMBINATION',
    'Invalid political entity type fails closed with 400 INVALID_ENTITY_TYPE',
    pass,
    `Thrown: ${thrown}, ErrorCode: ${errorCode}`,
    'COMPUTATIONAL_INVARIANT: Rejection of malformed entity types'
  );
} catch (err) {
  recordCheck('CASE_J_INVALID_COMBINATION', 'Invalid combination fail-closed', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE K: asOf Date Inside Temporal Validity
// ─────────────────────────────────────────────────────────────────────────────
try {
  const res = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    jurisdictionCode: 'GA',
    asOfDate: '2024-01-01',
  });

  const pass =
    res.constitutionalFloor === 30 &&
    res.statutoryExactSeats === 40 &&
    res.temporalValidity.validFrom === '1987-05-30';

  recordCheck(
    'CASE_K_AS_OF_VALID',
    'asOf date (2024-01-01) within temporal validity (validFrom: 1987-05-30) succeeds',
    pass,
    `asOf: 2024-01-01, validFrom: ${res.temporalValidity.validFrom}, Seats: ${res.statutoryExactSeats}`,
    'LEGAL_INVARIANT: Temporal validity verification passes inside interval'
  );
} catch (err) {
  recordCheck('CASE_K_AS_OF_VALID', 'asOf date valid verification', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE L: asOf Date Outside Temporal Validity
// ─────────────────────────────────────────────────────────────────────────────
try {
  let thrown = false;
  let errorCode = '';
  try {
    // Goa State Assembly did not exist before 1987-05-30
    delimitationQueryService.resolveLegalApplicability({
      entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
      regimeType: 'CURRENT_LEGAL_REGIME',
      jurisdictionCode: 'GA',
      asOfDate: '1980-01-01',
    });
  } catch (err) {
    thrown = true;
    errorCode = err.code || err.message;
  }

  const pass = thrown && errorCode === 'TEMPORAL_VALIDITY_MISMATCH';

  recordCheck(
    'CASE_L_AS_OF_OUTSIDE',
    'asOf date (1980-01-01) prior to enactment (1987-05-30) fails closed with TEMPORAL_VALIDITY_MISMATCH',
    pass,
    `Thrown: ${thrown}, ErrorCode: ${errorCode}`,
    'LEGAL_INVARIANT: Fail-closed on temporal validity violation'
  );
} catch (err) {
  recordCheck('CASE_L_AS_OF_OUTSIDE', 'asOf date invalid fail-closed', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE M: Evidence Reference Provenance Validation
// ─────────────────────────────────────────────────────────────────────────────
try {
  let thrown = false;
  let errorCode = '';
  try {
    delimitationQueryService.resolveLegalApplicability({
      entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
      regimeType: 'CURRENT_LEGAL_REGIME',
      jurisdictionCode: 'SK',
      evidenceReference: 'FORGED-PROVENANCE-REF-999',
    });
  } catch (err) {
    thrown = true;
    errorCode = err.code || err.message;
  }

  const pass = thrown && errorCode === 'EVIDENCE_PROVENANCE_MISMATCH';

  recordCheck(
    'CASE_M_PROVENANCE_MISMATCH',
    'Mismatch between requested evidence reference and governing rule provenance fails closed',
    pass,
    `Thrown: ${thrown}, ErrorCode: ${errorCode}`,
    'LEGAL_INVARIANT: Strict provenance verification against governing rule catalog'
  );
} catch (err) {
  recordCheck('CASE_M_PROVENANCE_MISMATCH', 'Provenance mismatch verification', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE N: Scenario Cannot Masquerade as Current Statutory Fact
// ─────────────────────────────────────────────────────────────────────────────
try {
  const res = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'SCENARIO_PROPOSED_REGIME',
    jurisdictionCode: 'TS',
  });

  const pass =
    res.isStatutoryFact === false &&
    res.isScenario === true &&
    res.constitutionalProvision === undefined &&
    res.statutoryProvision === undefined;

  recordCheck(
    'CASE_N_SCENARIO_ISOLATION',
    'Scenario regime is strictly derived (isScenario: true, isStatutoryFact: false, 0 statutory provision)',
    pass,
    `isScenario: ${res.isScenario}, isStatutoryFact: ${res.isStatutoryFact}, constProvision: ${res.constitutionalProvision}`,
    'SCENARIO_INVARIANT: Scenario outputs cannot masquerade as statutory facts'
  );
} catch (err) {
  recordCheck('CASE_N_SCENARIO_ISOLATION', 'Scenario isolation verification', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE O: UT Cannot Enter State Article 170 Path
// ─────────────────────────────────────────────────────────────────────────────
try {
  const pyRes = delimitationQueryService.resolveLegalApplicability({
    entityType: 'UNION_TERRITORY_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    jurisdictionCode: 'PY',
  });

  const tsRes = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    jurisdictionCode: 'TS',
  });

  const pass =
    pyRes.constitutionalProvision !== 'Article 170(1)' &&
    pyRes.statutoryProvision?.includes('Government of Union Territories Act') &&
    tsRes.constitutionalProvision === 'Article 170(1)' &&
    pyRes.constitutionalFloor === 30 &&
    tsRes.constitutionalFloor === 60;

  recordCheck(
    'CASE_O_UT_DECOUPLING',
    'UT Assembly (PY) resolves UT statutory framework and is strictly decoupled from State Article 170 path',
    pass,
    `PY provision: ${pyRes.constitutionalProvision} (${pyRes.statutoryProvision}), TS provision: ${tsRes.constitutionalProvision}`,
    'LEGAL_INVARIANT: Decoupled constitutional pathways for States vs Union Territories'
  );
} catch (err) {
  recordCheck('CASE_O_UT_DECOUPLING', 'UT decoupling verification', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE P: Article 170 Ceiling vs Computational Safety Ceiling
// ─────────────────────────────────────────────────────────────────────────────
try {
  const res = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    jurisdictionCode: 'TS',
  });

  const pass =
    res.constitutionalCeiling === 500 &&
    res.paninComputationalSafetyCeiling === 10000 &&
    res.constitutionalCeiling !== res.paninComputationalSafetyCeiling;

  recordCheck(
    'CASE_P_CEILING_SEPARATION',
    'Article 170 constitutional ceiling (500) strictly separated from MAX_SAFE_REQUESTED_SEATS (10000)',
    pass,
    `ConstCeiling: ${res.constitutionalCeiling}, ComputationalSafetyCeiling: ${res.paninComputationalSafetyCeiling}`,
    'COMPUTATIONAL_INVARIANT: Separation between constitutional bounds and resource-safety limits'
  );
} catch (err) {
  recordCheck('CASE_P_CEILING_SEPARATION', 'Ceiling separation verification', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE T1: asOfDate == validFrom (Inclusive Lower Bound)
// Authority: CTO FINAL REMEDIATION DIRECTIVE — W020-G8-LEGAL-002
// Expected: PASS / applicable
// ─────────────────────────────────────────────────────────────────────────────
try {
  // Goa enactment date: 1987-05-30
  const res = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    jurisdictionCode: 'GA',
    asOfDate: '1987-05-30',
  });

  const pass =
    res.entityType === 'STATE_LEGISLATIVE_ASSEMBLY' &&
    res.constitutionalFloor === 30 &&
    res.statutoryExactSeats === 40 &&
    res.temporalValidity.validFrom === '1987-05-30';

  recordCheck(
    'CASE_T1_LOWER_BOUND_INCLUSIVE',
    'asOfDate == validFrom (1987-05-30) is applicable under canonical [valid_from, valid_to) half-open semantics',
    pass,
    `asOfDate: 1987-05-30 == validFrom: ${res.temporalValidity.validFrom}, ExactSeats: ${res.statutoryExactSeats}`,
    'TEMPORAL_INVARIANT: Canonical inclusive lower bound [valid_from'
  );
} catch (err) {
  recordCheck('CASE_T1_LOWER_BOUND_INCLUSIVE', 'asOfDate == validFrom boundary test', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE T2: asOfDate immediately before validTo (Exclusive Upper Bound Interior)
// Authority: CTO FINAL REMEDIATION DIRECTIVE — W020-G8-LEGAL-002
// Expected: PASS / applicable
// ─────────────────────────────────────────────────────────────────────────────
try {
  // Historical AP composite rule: validFrom: 2008-02-19, validTo: 2014-06-02
  // Date immediately before validTo: 2014-06-01 (1 day prior to APRA 2014 appointed day)
  const res = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'HISTORICAL_LEGAL_REGIME',
    jurisdictionCode: 'AP_COMPOSITE',
    asOfDate: '2014-06-01',
  });

  const pass =
    res.regimeType === 'HISTORICAL_LEGAL_REGIME' &&
    res.historicalFactualSeats === 294 &&
    res.temporalValidity.validFrom === '2008-02-19' &&
    res.temporalValidity.validTo === '2014-06-02';

  recordCheck(
    'CASE_T2_UPPER_BOUND_INTERIOR',
    'asOfDate immediately before validTo (2014-06-01 < 2014-06-02) is applicable under canonical [valid_from, valid_to)',
    pass,
    `asOfDate: 2014-06-01 < validTo: ${res.temporalValidity.validTo}, HistoricalSeats: ${res.historicalFactualSeats}`,
    'TEMPORAL_INVARIANT: Canonical half-open interval permits any instant strictly prior to valid_to'
  );
} catch (err) {
  recordCheck('CASE_T2_UPPER_BOUND_INTERIOR', 'asOfDate immediately before validTo test', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE T3: asOfDate == validTo (Exclusive Upper Bound Exact Expiry)
// Authority: CTO FINAL REMEDIATION DIRECTIVE — W020-G8-LEGAL-002
// Expected: FAIL / not applicable / next valid rule if one exists
// ─────────────────────────────────────────────────────────────────────────────
try {
  let thrown = false;
  let errorCode = '';
  try {
    // Historical AP composite rule: validTo is 2014-06-02 (appointed day of AP Reorganisation Act 2014)
    // Under [valid_from, valid_to), at asOfDate == validTo, the historical composite rule is EXPIRED.
    delimitationQueryService.resolveLegalApplicability({
      entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
      regimeType: 'HISTORICAL_LEGAL_REGIME',
      jurisdictionCode: 'AP_COMPOSITE',
      asOfDate: '2014-06-02',
    });
  } catch (err) {
    thrown = true;
    errorCode = err.code || err.message;
  }

  const pass = thrown && errorCode === 'TEMPORAL_VALIDITY_MISMATCH';

  recordCheck(
    'CASE_T3_UPPER_BOUND_EXACT_EXPIRY',
    'asOfDate == validTo (2014-06-02) fails closed with TEMPORAL_VALIDITY_MISMATCH (valid_to is strictly exclusive)',
    pass,
    `Thrown: ${thrown}, ErrorCode: ${errorCode}`,
    'TEMPORAL_INVARIANT: Canonical valid_to is exclusive: valid_from <= asOfDate < valid_to'
  );
} catch (err) {
  recordCheck('CASE_T3_UPPER_BOUND_EXACT_EXPIRY', 'asOfDate == validTo boundary test', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE T4: asOfDate immediately after validTo
// Authority: CTO FINAL REMEDIATION DIRECTIVE — W020-G8-LEGAL-002
// Expected: FAIL / not applicable / next valid rule if one exists
// ─────────────────────────────────────────────────────────────────────────────
try {
  let thrown = false;
  let errorCode = '';
  try {
    // Date immediately after validTo (2014-06-03 > 2014-06-02)
    delimitationQueryService.resolveLegalApplicability({
      entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
      regimeType: 'HISTORICAL_LEGAL_REGIME',
      jurisdictionCode: 'AP_COMPOSITE',
      asOfDate: '2014-06-03',
    });
  } catch (err) {
    thrown = true;
    errorCode = err.code || err.message;
  }

  const pass = thrown && errorCode === 'TEMPORAL_VALIDITY_MISMATCH';

  recordCheck(
    'CASE_T4_UPPER_BOUND_POST_EXPIRY',
    'asOfDate immediately after validTo (2014-06-03 > 2014-06-02) fails closed with TEMPORAL_VALIDITY_MISMATCH',
    pass,
    `Thrown: ${thrown}, ErrorCode: ${errorCode}`,
    'TEMPORAL_INVARIANT: Post-expiry dates strictly reject expired historical rules'
  );
} catch (err) {
  recordCheck('CASE_T4_UPPER_BOUND_POST_EXPIRY', 'asOfDate post validTo test', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE T5: Open-Ended validTo = NULL / undefined
// Authority: CTO FINAL REMEDIATION DIRECTIVE — W020-G8-LEGAL-002 & W020-G8-LEGAL-002-R2
// Expected:
// 1. Any asOfDate >= validFrom remains applicable for an open-ended rule (validTo = NULL).
//    Uses legally valid entity: Standard State Assembly under Article 170(1) (validFrom: 1950-01-26).
// 2. State created later (e.g. Telangana on 2014-06-02) rejects dates preceding its existence.
// ─────────────────────────────────────────────────────────────────────────────
try {
  // 1. Standard State Assembly (Article 170(1)): validFrom: 1950-01-26, validTo: undefined (open-ended)
  const resValidFrom = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    asOfDate: '1950-01-26',
  });
  const resLaterValid = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    asOfDate: '2024-01-01',
  });
  const resFarFuture = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    asOfDate: '2050-01-01',
  });

  // 2. Telangana State Assembly: created on appointed day (2014-06-02) under APRA 2014.
  // Prior date (e.g. 1975-08-15) MUST fail closed because Telangana did not exist as a State.
  let tsPreExistenceRejected = false;
  try {
    delimitationQueryService.resolveLegalApplicability({
      entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
      regimeType: 'CURRENT_LEGAL_REGIME',
      jurisdictionCode: 'TS',
      asOfDate: '1975-08-15',
    });
  } catch (err) {
    if (err.code === 'TEMPORAL_VALIDITY_MISMATCH') {
      tsPreExistenceRejected = true;
    }
  }

  const pass =
    resValidFrom.constitutionalProvision === 'Article 170(1)' &&
    resValidFrom.temporalValidity.validFrom === '1950-01-26' &&
    resValidFrom.temporalValidity.validTo === undefined &&
    resLaterValid.constitutionalProvision === 'Article 170(1)' &&
    resFarFuture.constitutionalProvision === 'Article 170(1)' &&
    tsPreExistenceRejected;

  recordCheck(
    'CASE_T5_OPEN_ENDED_VALIDITY',
    'Open-ended rule (validTo = NULL) applicable for asOfDate >= validFrom across valid epochs; pre-existence dates fail closed',
    pass,
    `ValidFrom (1950-01-26) -> ${resValidFrom.constitutionalProvision}; Later (2024-01-01) -> ${resLaterValid.constitutionalProvision}; TS < 2014-06-02 rejected: ${tsPreExistenceRejected}`,
    'TEMPORAL_INVARIANT: Open-ended validity evaluates valid_from <= asOfDate with validTo = Infinity; territorial origin respected'
  );
} catch (err) {
  recordCheck('CASE_T5_OPEN_ENDED_VALIDITY', 'Open-ended validTo test', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE T6-A through T6-H: Successor-Boundary Resolution Semantics & Continuity
// Authority: CTO REMEDIATION DIRECTIVE — W020-G8-LEGAL-002-R2
// Requirements:
// - T6-A: Query at 2014-06-01 -> historical AP composite rule selected
// - T6-B: Query at 2014-06-02 -> successor rule active (2014-06-02 appointed day)
// - T6-C: Query at 2014-06-03 -> successor rule active
// - T6-D: Verify old.validTo === successor.validFrom
// - T6-E: Verify old.validTo is strictly exclusive
// - T6-F: Verify successor.validFrom is strictly inclusive
// - T6-G: Verify zero overlap (no concurrent valid state)
// - T6-H: Verify zero temporal gap where legal chain establishes continuity
// ─────────────────────────────────────────────────────────────────────────────

// T6-A: Query at 2014-06-01 (1 day prior to boundary)
try {
  const res = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'HISTORICAL_LEGAL_REGIME',
    jurisdictionCode: 'AP_COMPOSITE',
    asOfDate: '2014-06-01',
  });
  const pass =
    res.regimeType === 'HISTORICAL_LEGAL_REGIME' &&
    res.historicalFactualSeats === 294 &&
    res.temporalValidity.validFrom === '2008-02-19' &&
    res.temporalValidity.validTo === '2014-06-02';

  recordCheck(
    'CASE_T6_A_PRIOR_TO_BOUNDARY',
    'Query at 2014-06-01 (T_boundary - 1d) selects historical AP composite rule (294 seats)',
    pass,
    `Regime: ${res.regimeType}, Seats: ${res.historicalFactualSeats}, Range: [${res.temporalValidity.validFrom}, ${res.temporalValidity.validTo})`,
    'TEMPORAL_INVARIANT: Historical rule valid strictly prior to validTo'
  );
} catch (err) {
  recordCheck('CASE_T6_A_PRIOR_TO_BOUNDARY', 'T6-A evaluation', false, err.message);
}

// T6-B: Query at 2014-06-02 (exact boundary instant)
try {
  let histExpired = false;
  try {
    delimitationQueryService.resolveLegalApplicability({
      entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
      regimeType: 'HISTORICAL_LEGAL_REGIME',
      jurisdictionCode: 'AP_COMPOSITE',
      asOfDate: '2014-06-02',
    });
  } catch (err) {
    if (err.code === 'TEMPORAL_VALIDITY_MISMATCH') histExpired = true;
  }

  const succTs = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    jurisdictionCode: 'TS',
    asOfDate: '2014-06-02',
  });

  const succAp = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    jurisdictionCode: 'AP',
    asOfDate: '2014-06-02',
  });

  const pass =
    histExpired &&
    succTs.statutoryExactSeats === 119 &&
    succTs.temporalValidity.validFrom === '2014-06-02' &&
    succAp.statutoryExactSeats === 175 &&
    succAp.temporalValidity.validFrom === '2014-06-02';

  recordCheck(
    'CASE_T6_B_EXACT_BOUNDARY',
    'Query at 2014-06-02: historical rule expired, successor rules (TS: 119, AP: 175) active at appointed day',
    pass,
    `HistExpired: ${histExpired}, TS: ${succTs.statutoryExactSeats} seats, AP: ${succAp.statutoryExactSeats} seats`,
    'TEMPORAL_INVARIANT: Boundary handoff occurs at validTo === successor.validFrom'
  );
} catch (err) {
  recordCheck('CASE_T6_B_EXACT_BOUNDARY', 'T6-B evaluation', false, err.message);
}

// T6-C: Query at 2014-06-03 (1 day after boundary)
try {
  const succTs = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    jurisdictionCode: 'TS',
    asOfDate: '2014-06-03',
  });
  const succAp = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    jurisdictionCode: 'AP',
    asOfDate: '2014-06-03',
  });

  const pass =
    succTs.statutoryExactSeats === 119 &&
    succTs.isStatutoryFact === true &&
    succAp.statutoryExactSeats === 175 &&
    succAp.isStatutoryFact === true;

  recordCheck(
    'CASE_T6_C_POST_BOUNDARY',
    'Query at 2014-06-03 (T_boundary + 1d) confirms successor rules remain active (TS: 119, AP: 175)',
    pass,
    `TS: ${succTs.statutoryExactSeats} seats (statutory: ${succTs.isStatutoryFact}), AP: ${succAp.statutoryExactSeats} seats`,
    'TEMPORAL_INVARIANT: Successor regime continues in force post-boundary'
  );
} catch (err) {
  recordCheck('CASE_T6_C_POST_BOUNDARY', 'T6-C evaluation', false, err.message);
}

// T6-D: Coordinate Equality: old.validTo === successor.validFrom
try {
  const histRule = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'HISTORICAL_LEGAL_REGIME',
    jurisdictionCode: 'AP_COMPOSITE',
  });
  const succRuleTs = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    jurisdictionCode: 'TS',
  });
  const succRuleAp = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    jurisdictionCode: 'AP',
  });

  const pass =
    histRule.temporalValidity.validTo === succRuleTs.temporalValidity.validFrom &&
    histRule.temporalValidity.validTo === succRuleAp.temporalValidity.validFrom &&
    histRule.temporalValidity.validTo === '2014-06-02';

  recordCheck(
    'CASE_T6_D_COORDINATE_EQUALITY',
    'old.validTo === successor.validFrom (2014-06-02 === 2014-06-02)',
    pass,
    `old.validTo: ${histRule.temporalValidity.validTo} === succ.validFrom: ${succRuleTs.temporalValidity.validFrom}`,
    'TEMPORAL_INVARIANT: Exact coordinate parity at reorganization boundary'
  );
} catch (err) {
  recordCheck('CASE_T6_D_COORDINATE_EQUALITY', 'T6-D evaluation', false, err.message);
}

// T6-E: Verify old.validTo is strictly exclusive
try {
  let thrownAtValidTo = false;
  try {
    delimitationQueryService.resolveLegalApplicability({
      entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
      regimeType: 'HISTORICAL_LEGAL_REGIME',
      jurisdictionCode: 'AP_COMPOSITE',
      asOfDate: '2014-06-02',
    });
  } catch (err) {
    if (err.code === 'TEMPORAL_VALIDITY_MISMATCH') thrownAtValidTo = true;
  }

  recordCheck(
    'CASE_T6_E_VALID_TO_EXCLUSIVE',
    'old.validTo is strictly exclusive: asOfDate == validTo throws TEMPORAL_VALIDITY_MISMATCH',
    thrownAtValidTo,
    `Thrown: ${thrownAtValidTo}`,
    'TEMPORAL_INVARIANT: valid_to is exclusive upper bound'
  );
} catch (err) {
  recordCheck('CASE_T6_E_VALID_TO_EXCLUSIVE', 'T6-E evaluation', false, err.message);
}

// T6-F: Verify successor.validFrom is strictly inclusive
try {
  const succTsAtValidFrom = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    jurisdictionCode: 'TS',
    asOfDate: '2014-06-02',
  });
  const pass =
    succTsAtValidFrom.temporalValidity.validFrom === '2014-06-02' &&
    succTsAtValidFrom.statutoryExactSeats === 119;

  recordCheck(
    'CASE_T6_F_VALID_FROM_INCLUSIVE',
    'successor.validFrom is strictly inclusive: asOfDate == validFrom succeeds',
    pass,
    `asOfDate: 2014-06-02 == validFrom: ${succTsAtValidFrom.temporalValidity.validFrom}`,
    'TEMPORAL_INVARIANT: valid_from is inclusive lower bound'
  );
} catch (err) {
  recordCheck('CASE_T6_F_VALID_FROM_INCLUSIVE', 'T6-F evaluation', false, err.message);
}

// T6-G: Verify zero overlap (no instant where both rules are concurrently active)
try {
  // Test instant 1: 2014-06-01 23:59:59 (hist active, succ inactive)
  let histActivePrior = false;
  let succActivePrior = false;
  try {
    delimitationQueryService.resolveLegalApplicability({
      entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
      regimeType: 'HISTORICAL_LEGAL_REGIME',
      jurisdictionCode: 'AP_COMPOSITE',
      asOfDate: '2014-06-01',
    });
    histActivePrior = true;
  } catch (_) {}

  try {
    delimitationQueryService.resolveLegalApplicability({
      entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
      regimeType: 'CURRENT_LEGAL_REGIME',
      jurisdictionCode: 'TS',
      asOfDate: '2014-06-01',
    });
    succActivePrior = true;
  } catch (_) {}

  // Test instant 2: 2014-06-02 00:00:00 (hist inactive, succ active)
  let histActiveAtBoundary = false;
  let succActiveAtBoundary = false;
  try {
    delimitationQueryService.resolveLegalApplicability({
      entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
      regimeType: 'HISTORICAL_LEGAL_REGIME',
      jurisdictionCode: 'AP_COMPOSITE',
      asOfDate: '2014-06-02',
    });
    histActiveAtBoundary = true;
  } catch (_) {}

  try {
    delimitationQueryService.resolveLegalApplicability({
      entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
      regimeType: 'CURRENT_LEGAL_REGIME',
      jurisdictionCode: 'TS',
      asOfDate: '2014-06-02',
    });
    succActiveAtBoundary = true;
  } catch (_) {}

  const pass =
    histActivePrior === true &&
    succActivePrior === false &&
    histActiveAtBoundary === false &&
    succActiveAtBoundary === true;

  recordCheck(
    'CASE_T6_G_ZERO_OVERLAP',
    'Zero overlap verified: no instant where historical and successor rules are concurrently active',
    pass,
    `Prior (2014-06-01): Hist=${histActivePrior}, Succ=${succActivePrior}; Boundary (2014-06-02): Hist=${histActiveAtBoundary}, Succ=${succActiveAtBoundary}`,
    'TEMPORAL_INVARIANT: Mutual exclusivity across boundary instant'
  );
} catch (err) {
  recordCheck('CASE_T6_G_ZERO_OVERLAP', 'T6-G evaluation', false, err.message);
}

// T6-H: Verify zero temporal gap where legal chain establishes continuity
try {
  // At any query instant T, exactly one rule is active in the continuous legal chain
  // Prior instant T = 2014-06-01: Historical AP composite rule covers jurisdiction
  // Boundary instant T = 2014-06-02: Successor TS & AP rules cover jurisdiction
  // There is no instant between 2008-02-19 and infinity where the territory has no applicable rule
  const hist2008 = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'HISTORICAL_LEGAL_REGIME',
    jurisdictionCode: 'AP_COMPOSITE',
    asOfDate: '2008-02-19',
  });
  const hist2014Eve = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'HISTORICAL_LEGAL_REGIME',
    jurisdictionCode: 'AP_COMPOSITE',
    asOfDate: '2014-06-01',
  });
  const succ2014Appointed = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    jurisdictionCode: 'TS',
    asOfDate: '2014-06-02',
  });
  const succ2026Current = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    jurisdictionCode: 'TS',
    asOfDate: '2026-09-30',
  });

  const pass =
    hist2008.historicalFactualSeats === 294 &&
    hist2014Eve.historicalFactualSeats === 294 &&
    succ2014Appointed.statutoryExactSeats === 119 &&
    succ2026Current.statutoryExactSeats === 119;

  recordCheck(
    'CASE_T6_H_ZERO_GAP_CONTINUITY',
    'Zero temporal gap verified: continuous legal chain from 2008-02-19 through present day',
    pass,
    `2008: ${hist2008.historicalFactualSeats}s -> 2014-06-01: ${hist2014Eve.historicalFactualSeats}s -> 2014-06-02: ${succ2014Appointed.statutoryExactSeats}s -> 2026: ${succ2026Current.statutoryExactSeats}s`,
    'TEMPORAL_INVARIANT: Unbroken statutory continuity across reorganization'
  );
} catch (err) {
  recordCheck('CASE_T6_H_ZERO_GAP_CONTINUITY', 'T6-H evaluation', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE T7: Future Anticipated Rule
// Authority: CTO FINAL REMEDIATION DIRECTIVE — W020-G8-LEGAL-002
// Expected:
// Must not become current merely because the application date is within an
// anticipated future rule. The W014 legal regime semantics remain authoritative.
// ─────────────────────────────────────────────────────────────────────────────
try {
  // Querying FUTURE_ANTICIPATED_REGIME with asOfDate = 2028-01-01 (post-2026 window)
  const futureRes = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'FUTURE_ANTICIPATED_REGIME',
    jurisdictionCode: 'TS',
    asOfDate: '2028-01-01',
  });

  // Querying CURRENT_LEGAL_REGIME with asOfDate = 2028-01-01
  const currentRes = delimitationQueryService.resolveLegalApplicability({
    entityType: 'STATE_LEGISLATIVE_ASSEMBLY',
    regimeType: 'CURRENT_LEGAL_REGIME',
    jurisdictionCode: 'TS',
    asOfDate: '2028-01-01',
  });

  const pass =
    futureRes.regimeType === 'FUTURE_ANTICIPATED_REGIME' &&
    futureRes.isStatutoryFact === false &&
    futureRes.isScenario === false &&
    futureRes.temporalValidity.isCurrent === false &&
    futureRes.provenance.evidenceReference === 'ECI-POST-2026-TRACKING' &&
    currentRes.regimeType === 'CURRENT_LEGAL_REGIME' &&
    currentRes.isStatutoryFact === true;

  recordCheck(
    'CASE_T7_FUTURE_ANTICIPATED_ISOLATION',
    'Future anticipated rule within post-2026 window (2028-01-01) does NOT become current statutory fact (isStatutoryFact remains false)',
    pass,
    `Future: regimeType=${futureRes.regimeType}, isStatutoryFact=${futureRes.isStatutoryFact}, isCurrent=${futureRes.temporalValidity.isCurrent}`,
    'LEGAL_INVARIANT: Regime semantics remain authoritative regardless of evaluation date'
  );
} catch (err) {
  recordCheck('CASE_T7_FUTURE_ANTICIPATED_ISOLATION', 'Future anticipated isolation test', false, err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY & VERDICT
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`TOTAL SEMANTIC & BOUNDARY CHECKS: ${passed + failed}`);
console.log(`PASSED:                           ${passed}`);
console.log(`FAILED:                           ${failed}`);
console.log(`PASS RATE:                        ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('================================================================\n');

if (failed > 0) {
  console.error(`FATAL: ${failed} legal applicability semantic checks failed.`);
  process.exit(1);
} else {
  console.log(`SUCCESS: All ${passed} legal applicability semantic and temporal boundary checks passed.`);
  process.exit(0);
}
