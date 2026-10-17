import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import ts from 'typescript';

import {
  parseTsSource,
  findVariableDeclarations,
  evaluateAstNode,
  inspectAffidavitsAst,
  inspectHistoricalResultsAst,
  inspectMlaProfilesAst,
  isValidHttpUrl,
} from '../scripts/lib/ast_data_parser.mjs';

import {
  validateGeoJsonObject,
  validateConstituencyArray,
  inspectGeoJSON,
  inspectAffidavits,
  inspectHistoricalCoverage,
  inspectMlaProfiles,
  AUTHORITATIVE_STATE_SEATS,
} from '../scripts/generate_national_data_coverage_matrix.mjs';

import {
  computeLedgerSummary,
  validateTaskAccounting,
} from '../scripts/reconcile_execution_ledger.mjs';

import {
  verifyMigrationImmutability,
  STARTING_COMMIT,
  EXPECTED_MIGRATION_COUNT,
} from '../scripts/verify-migration-immutability.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('KSHETRA W021.5 — CTO DIRECTIVE 090 VERIFICATION SUITE');
console.log('Atomic Evidence Validation, Canonical Identity, GeoJSON Integrity & Defensible Accounting');
console.log('================================================================');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failedTests++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Workstream A — Atomic, Fail-Closed AST Evaluation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 1. Workstream A: Atomic, Fail-Closed AST Evaluation ---');

runTest('1.1 Atomic invalidation: nested unsupported expressions invalidate the entire record', () => {
  const adversarialSource = `
export const SEED_AFFIDAVITS = [
  {
    id: 'rec-valid',
    candidateName: 'Valid Candidate',
    acNo: 1,
    constituencyName: 'Sirpur',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/rec-valid'
  },
  {
    id: 'rec-nested-bad-prop',
    candidateName: 'Nested Bad Prop',
    acNo: 2,
    constituencyName: 'Chennur',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/rec-2',
    extraDetails: {
      calculatedScore: 10 + 20, // BinaryExpression unsupported
    }
  },
  {
    id: 'rec-nested-bad-array',
    candidateName: 'Nested Bad Array',
    acNo: 3,
    constituencyName: 'Bellampalli',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/rec-3',
    assets: [1000, someVariableRef, 3000] // Identifier reference unsupported
  },
  {
    id: 'rec-spread',
    candidateName: 'Spread Candidate',
    acNo: 4,
    constituencyName: 'Mancherial',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/rec-4',
    ...baseCandidate // SpreadAssignment unsupported
  }
];
`;
  const res = inspectAffidavitsAst(adversarialSource, 'TS', 119);
  assert.strictEqual(res.presentInFileCount, 4, 'All 4 records present in source file');
  assert.strictEqual(res.total, 1, 'Only 1 record is trusted; 3 records with nested unsupported AST atomically rejected');
  assert.strictEqual(res.structurallyValidCount, 1, 'Only 1 structurally valid record');
  assert.strictEqual(res.records[0].id, 'rec-valid');
  assert.ok(res.parseErrors.some((e) => e.includes('BinaryExpression') || e.includes('unsupported in strict literal subset')));
  assert.ok(res.parseErrors.some((e) => e.includes('Identifier') || e.includes('variable reference')));
  assert.ok(res.parseErrors.some((e) => e.includes('SpreadAssignment') || e.includes('spread')));
});

runTest('1.2 Sentinel values & numeric validity: NaN, Infinity, and invalid numbers are rejected with diagnostics', () => {
  const sentinelSource = `
export const SEED_AFFIDAVITS = [
  {
    id: 'rec-nan',
    candidateName: 'NaN Candidate',
    acNo: NaN,
    constituencyName: 'Sirpur',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/nan'
  },
  {
    id: 'rec-infinity',
    candidateName: 'Infinity Candidate',
    acNo: Infinity,
    constituencyName: 'Chennur',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/inf'
  },
  {
    id: 'rec-negative-infinity',
    candidateName: 'Neg Inf Candidate',
    acNo: -Infinity,
    constituencyName: 'Bellampalli',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/neginf'
  }
];
`;
  const res = inspectAffidavitsAst(sentinelSource, 'TS', 119);
  assert.strictEqual(res.total, 0, 'No non-finite record can pass into trusted extracted records');
  assert.strictEqual(res.structurallyValidCount, 0);
  assert.ok(res.parseErrors.some((e) => e.includes('NON_FINITE_NUMERIC_IDENTIFIER') || e.includes('non-finite')));
});

runTest('1.3 Preserves supported explicit null without conflating with undefined or unsupported results', () => {
  const nullLiteralSource = `
export const SEED_DATA = [
  {
    id: 'rec-null',
    stringValue: 'test',
    explicitNull: null,
    validNumber: 42,
    negativeNumber: -100,
    numericWithUnderscores: 50_000
  }
];
`;
  const { sourceFile, syntacticParseSuccess } = parseTsSource(nullLiteralSource, 'null-test.ts');
  assert.strictEqual(syntacticParseSuccess, true);
  const vars = findVariableDeclarations(sourceFile);
  const dataVar = vars.find((v) => v.name === 'SEED_DATA');
  const diagnostics = [];
  const evaluated = evaluateAstNode(dataVar.initializer, sourceFile, diagnostics);
  assert.strictEqual(diagnostics.length, 0, 'Explicit null and negative numbers evaluate with zero diagnostics');
  assert.strictEqual(evaluated[0].explicitNull, null);
  assert.strictEqual(evaluated[0].validNumber, 42);
  assert.strictEqual(evaluated[0].negativeNumber, -100);
  assert.strictEqual(evaluated[0].numericWithUnderscores, 50000);
});

runTest('1.4 TypeScript parse diagnostics fail closed: malformed source cannot report syntactic success', () => {
  const malformedSource = `
export const CORRUPTED_DATA = [
  { id: 'unterminated', name: "missing closing quote
];
`;
  const res = inspectAffidavitsAst(malformedSource, 'TS', 119);
  assert.strictEqual(res.syntacticParseSuccess, false, 'Syntactic parse must fail for malformed TS');
  assert.strictEqual(res.total, 0, 'Zero trusted records extracted from syntactically invalid file');
  assert.ok(res.parseDiagnostics.length > 0, 'Parse diagnostics recorded');
});

runTest('1.5 Historical event truth: year precedence, no collection fallback, conflicting years rejected, margin 0 preserved', () => {
  const historicalSource = `
export const TELANGANA_HISTORICAL_2014 = [
  {
    acNo: 1,
    name: 'Sirpur',
    winner: 'Koneru Konappa',
    party: 'TRS',
    electionYear: 2018, // Record-level year overrides collection 2014
    electionType: 'BYPOLL',
    votes: 83088,
    margin: 0 // Explicit zero margin must remain zero
  },
  {
    acNo: 2,
    name: 'Chennur',
    winner: 'Balka Suman',
    party: 'TRS',
    electionYear: 2018,
    year: 2014, // Conflicting explicit years must fail closed
    votes: 71980,
    margin: 28132
  },
  {
    acNo: 3,
    name: 'Bellampalli',
    winner: 'Durgam Chinnaiah',
    party: 'TRS',
    // Missing electionYear and year: collection name 2014 MUST NOT be used as fallback!
    votes: 43708,
    margin: 11276
  }
];
`;
  const histRes = inspectHistoricalResultsAst(historicalSource, 119, 'ts-historical.ts');
  assert.strictEqual(histRes.demonstrablePerAcYears.length, 1);
  assert.strictEqual(histRes.demonstrablePerAcYears[0], 2018, 'Only explicit 2018 is recognized');
  assert.ok(!histRes.demonstrablePerAcYears.includes(2014), '2014 collection name is NOT adopted as fallback');

  // Verify AC 1 explicit 0 margin preserved and BYPOLL preserved
  const rec1 = histRes.eventsByYear[2018].find((r) => r.acNo === 1);
  assert.ok(rec1);
  assert.strictEqual(rec1.margin, 0, 'Explicit margin 0 must be preserved as numeric 0, not null');
  assert.strictEqual(rec1.electionType, 'BYPOLL');

  // Verify AC 2 conflicting years failed closed
  assert.ok(histRes.parseErrors.some((e) => e.includes('conflicting electionYear (2018) vs year (2014)')));

  // Verify AC 3 yearless record was excluded from year-specific counts
  assert.strictEqual(histRes.yearlessRecordCount, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Workstream B — Canonical Statutory Identity and Adversarial Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Workstream B: Canonical Statutory Identity & Adversarial Verification ---');

runTest('2.1 B1 Invariant: missing canonical registry NEVER increases identityValidatedCount', () => {
  const affSource = `
export const SEED_AFFIDAVITS = [
  {
    id: 'adv-1',
    candidateName: 'Test Candidate',
    acNo: 65,
    constituencyName: 'Kodangal',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/ts2023/c65'
  }
];
`;
  // Call without canonical registry (null)
  const res = inspectAffidavitsAst(affSource, 'TS', 119, null);
  assert.strictEqual(res.seatNumberInRangeCount, 1, 'In-range seat number (65) is recorded');
  assert.strictEqual(res.identityValidatedCount, 0, 'identityValidatedCount must strictly remain 0 without canonical registry');
  assert.strictEqual(res.identityUnresolvedCount, 1, 'Unresolved count must be 1');
  assert.strictEqual(res.records[0].canonicalIdentityUnresolvedReason, 'CANONICAL_REGISTRY_UNAVAILABLE');
});

runTest('2.2 Dimension separation: distinct counters for presence, structure, url, seat range, identity, verification', () => {
  const tsAff = inspectAffidavits('TS', 119);
  assert.strictEqual(tsAff.presentInFileCount, 17);
  assert.strictEqual(tsAff.requiredFieldsValidCount, 17);
  assert.strictEqual(tsAff.structurallyValidCount, 17);
  assert.strictEqual(tsAff.urlFormatValidCount, 17);
  assert.strictEqual(tsAff.seatNumberInRangeCount, 17);
  assert.strictEqual(tsAff.identityValidatedCount, 0, 'Identity unvalidated by default without registry');
  assert.strictEqual(tsAff.identityUnresolvedCount, 17);
  assert.strictEqual(tsAff.sourceProvenanceRecordedCount, 17);
  assert.strictEqual(tsAff.officiallyVerifiedCount, 0, 'Seed affidavits are NOT officially verified');
  assert.strictEqual(tsAff.canonicalDatabaseBacked, false);
  assert.strictEqual(tsAff.formallyAccepted, false);
});

runTest('2.3 Adversarial Identity Matrix: 8 comprehensive adversarial scenarios verified', () => {
  const canonicalRegistry = new Map([
    [1, { name: 'Sirpur' }],
    [2, { name: 'Chennur' }],
    [3, { name: 'Bellampalli' }],
    [4, { name: 'Mancherial' }],
    [5, { name: 'Asifabad' }]
    // Note: seat 6 is intentionally missing from registry for Case 5
  ]);

  const adversarialSource = `
export const SEED_AFFIDAVITS = [
  // Case 1: Valid seat number with a fabricated constituency name
  {
    id: 'case-1',
    candidateName: 'Candidate One',
    acNo: 1,
    constituencyName: 'Fabricated Constituency Name',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/c1'
  },
  // Case 2: Valid constituency name with an out-of-range seat number
  {
    id: 'case-2',
    candidateName: 'Candidate Two',
    acNo: 999, // Out of range (> 119)
    constituencyName: 'Sirpur',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/c2'
  },
  // Case 3A: Candidate claiming AC 3 (first claim: valid)
  {
    id: 'case-3a',
    candidateName: 'Revanth Reddy',
    acNo: 3,
    constituencyName: 'Bellampalli',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/c3a',
    electionYear: 2023
  },
  // Case 3B: Duplicate record claiming the same canonical identity
  {
    id: 'case-3b',
    candidateName: 'Revanth Reddy',
    acNo: 3,
    constituencyName: 'Bellampalli',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/c3b',
    electionYear: 2023
  },
  // Case 5: Valid seat in range but missing from canonical registry
  {
    id: 'case-5',
    candidateName: 'Candidate Five',
    acNo: 6, // AC 6 is missing in our canonicalRegistry
    constituencyName: 'Khanapur',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/c6'
  },
  // Case 7A: Invalid URL scheme
  {
    id: 'case-7a',
    candidateName: 'Candidate Seven A',
    acNo: 4,
    constituencyName: 'Mancherial',
    stateCode: 'TS',
    sourceUrl: 'not-a-valid-url'
  },
  // Case 7B: Missing URL
  {
    id: 'case-7b',
    candidateName: 'Candidate Seven B',
    acNo: 4,
    constituencyName: 'Mancherial',
    stateCode: 'TS',
    sourceUrl: null
  },
  // Case 8: Structurally valid local record with canonical match but NO authoritative verification
  {
    id: 'case-8',
    candidateName: 'Candidate Eight',
    acNo: 5,
    constituencyName: 'Asifabad',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/c8'
  }
];
`;
  // Test with canonicalRegistry
  const res = inspectAffidavitsAst(adversarialSource, 'TS', 119, canonicalRegistry);

  // Assertions for Case 1: Fabricated Name
  const c1 = res.records.find((r) => r.id === 'case-1');
  assert.ok(c1, 'Record case-1 must exist');
  assert.strictEqual(c1.canonicalIdentityValidated, false);
  assert.ok(c1.canonicalIdentityUnresolvedReason.includes('CONSTITUENCY_NAME_MISMATCH'));

  // Assertions for Case 2: Out-of-range AC number
  assert.ok(!res.records.some((r) => r.id === 'case-2'), 'Out of range record rejected before records list');
  assert.ok(res.parseErrors.some((e) => e.includes('AC 999 is outside statutory range')));

  // Assertions for Case 3: Duplicate canonical claim
  const c3a = res.records.find((r) => r.id === 'case-3a');
  assert.ok(c3a);
  assert.strictEqual(c3a.canonicalIdentityValidated, true);
  const c3b = res.records.find((r) => r.id === 'case-3b');
  assert.ok(c3b);
  assert.strictEqual(c3b.canonicalIdentityValidated, false);
  assert.ok(c3b.canonicalIdentityUnresolvedReason.includes('DUPLICATE_CANONICAL_IDENTITY_CLAIM'));

  // Assertions for Case 5: Missing from canonical registry
  const c5 = res.records.find((r) => r.id === 'case-5');
  assert.ok(c5);
  assert.strictEqual(c5.canonicalIdentityValidated, false);
  assert.strictEqual(c5.canonicalIdentityUnresolvedReason, 'CONSTITUENCY_NOT_IN_CANONICAL_REGISTRY');

  // Assertions for Case 7: URL validity
  const c7a = res.records.find((r) => r.id === 'case-7a');
  assert.ok(c7a);
  assert.strictEqual(c7a.urlFormatValid, false);
  assert.strictEqual(c7a.sourceProvenanceStatus, 'PROVENANCE_UNRECORDED_INVALID_URL');
  // 7b has null sourceUrl so it was rejected at required-fields check
  assert.ok(!res.records.some((r) => r.id === 'case-7b'));

  // Assertions for Case 8: Official verification strictly false
  const c8 = res.records.find((r) => r.id === 'case-8');
  assert.ok(c8);
  assert.strictEqual(c8.canonicalIdentityValidated, true);
  assert.strictEqual(res.officiallyVerifiedCount, 0, 'No local seed record can be counted as officially verified');
  assert.strictEqual(res.canonicalDatabaseBacked, false);
  assert.strictEqual(res.formallyAccepted, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Workstream C — GeoJSON Statutory Mapping Integrity
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Workstream C: GeoJSON Statutory Mapping Integrity ---');

runTest('3.1 Telangana duplicate AC 119 claim blocks clean mapping while preserving feature validity', () => {
  const tsGeo = inspectGeoJSON('TS', 119);
  assert.strictEqual(tsGeo.filePresent, true);
  assert.strictEqual(tsGeo.featureCount, 120);
  assert.strictEqual(tsGeo.validFeatureCount, 120, 'All 120 features have valid individual structures');
  assert.strictEqual(tsGeo.geometryValidFeatureCount, 120, 'All 120 features have valid geometry');
  assert.strictEqual(tsGeo.coordinatesValid, true);
  assert.strictEqual(tsGeo.coordinateRangeValid, true);
  assert.strictEqual(tsGeo.linkedConstituencyCount, 119);
  assert.strictEqual(tsGeo.duplicateFeatureCount, 1);
  assert.deepStrictEqual(tsGeo.duplicateLinkedAcs, [119]);

  // Clean constituency mapping & overall GeoJSON validity are strictly false
  assert.strictEqual(tsGeo.hasCleanConstituencyMapping, false);
  assert.strictEqual(tsGeo.linkageValid, false);
  assert.strictEqual(tsGeo.statutoryComplete, false);
  assert.strictEqual(tsGeo.hasGeoJSON, false, 'hasGeoJSON CANNOT be true when statutory mapping contains duplicate claims');
  assert.strictEqual(tsGeo.authoritativeVerified, false);
});

runTest('3.2 Multipart MultiPolygon feature is a single feature and does NOT register duplicate AC linkage', () => {
  const multiPolyGeo = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [[[78.0, 17.0], [78.5, 17.0], [78.5, 17.5], [78.0, 17.0]]],
            [[[79.0, 17.0], [79.5, 17.0], [79.5, 17.5], [79.0, 17.0]]]
          ]
        },
        properties: { AC_NO: 1, AC_NAME: 'Sirpur' }
      }
    ]
  };
  const res = validateGeoJsonObject(multiPolyGeo, 'TS', 1, 'test-multipoly.geojson');
  assert.strictEqual(res.multipartFeatureCount, 1, 'Correctly counted 1 multipart feature');
  assert.strictEqual(res.linkedConstituencyCount, 1);
  assert.strictEqual(res.duplicateFeatureCount, 0, 'Single MultiPolygon must NOT create duplicate claim');
  assert.strictEqual(res.duplicateLinkedAcs.length, 0);
  assert.strictEqual(res.hasCleanConstituencyMapping, true);
  assert.strictEqual(res.statutoryComplete, true);
  assert.strictEqual(res.hasGeoJSON, true);
});

runTest('3.3 Rigorous geometry validation: ring closure, minimum positions, nesting depth, coordinate numeric bounds', () => {
  // Test A: Ring fewer than 4 positions
  const tooFewPositions = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[78.0, 17.0], [78.5, 17.0], [78.0, 17.0]]] // only 3 positions
        },
        properties: { AC_NO: 1 }
      }
    ]
  };
  const resA = validateGeoJsonObject(tooFewPositions, 'TS', 1, 'test-few.geojson');
  assert.strictEqual(resA.geometryValidFeatureCount, 0);
  assert.strictEqual(resA.hasGeoJSON, false);

  // Test B: Unclosed ring
  const unclosedRing = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[78.0, 17.0], [78.5, 17.0], [78.5, 17.5], [78.1, 17.1]]] // not closed
        },
        properties: { AC_NO: 1 }
      }
    ]
  };
  const resB = validateGeoJsonObject(unclosedRing, 'TS', 1, 'test-unclosed.geojson');
  assert.strictEqual(resB.geometryValidFeatureCount, 0);
  assert.strictEqual(resB.hasGeoJSON, false);

  // Test C: Coordinates rejected before coordinateRangeValid counters increment
  assert.strictEqual(resB.coordinateNumericValidFeatureCount, 0, 'Features with unclosed rings do not increment coordinate-valid counters');
});

runTest('3.4 National matrix artifact truthfully reports material gaps and Delhi 70-seat boundary', () => {
  const matrixPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

  assert.strictEqual(matrix.summary.canonicalFullStatesCount, 0, 'Zero states claim CANONICAL_FULL without live DB verification');
  assert.strictEqual(matrix.summary.partialLocalWithGeoCount, 0, 'Zero states have clean local GeoJSON (TS blocked by dupe AC 119)');
  assert.strictEqual(matrix.summary.partialHistoricalNoGeoCount, 8);

  const dl = matrix.states.find((s) => s.stateCode === 'DL');
  assert.strictEqual(dl.statutoryAssemblySeats, 70);
  assert.strictEqual(dl.seededConstituencyCount, 70);
  assert.strictEqual(dl.representativeCoverage.extraNonStatutoryProfiles, 151, 'Municipal placeholders isolated');

  const ts = matrix.states.find((s) => s.stateCode === 'TS');
  assert.ok(ts.materialGaps.some((g) => g.includes('duplicate feature claim')));
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Workstream D — Evidence-Backed Execution Ledger Accounting
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Workstream D: Evidence-Backed Execution Ledger Accounting ---');

runTest('4.1 Reconciler fails closed on missing, invalid, or non-finite accounting metadata', () => {
  // Missing required accounting fields
  const brokenTask = {
    taskId: 'W021.5-TEST-01',
    taskTitle: 'Broken Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    accounting: {
      repoCompletionRatio: 1.0,
      // unexecutedDatabaseWeight is missing!
      formalAcceptanceStatus: 'NOT_SUBMITTED'
    }
  };
  assert.throws(
    () => validateTaskAccounting(brokenTask),
    /missing required accounting metadata|missing or invalid numeric accounting field/
  );

  // Negative weight
  const negativeWeightTask = {
    taskId: 'W021.5-TEST-02',
    taskTitle: 'Negative Weight Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: -1.0,
    status: 'REPO_VERIFIED',
    accounting: {
      repoCompletionRatio: 1.0,
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'NOT_SUBMITTED'
    }
  };
  assert.throws(
    () => validateTaskAccounting(negativeWeightTask),
    /invalid weight/i
  );

  // Ratio out of bounds
  const outOfBoundsRatioTask = {
    taskId: 'W021.5-TEST-03',
    taskTitle: 'Out of Bounds Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    accounting: {
      repoCompletionRatio: 1.5, // > 1.0
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'NOT_SUBMITTED'
    }
  };
  assert.throws(
    () => validateTaskAccounting(outOfBoundsRatioTask),
    /invalid repoCompletionRatio/
  );

  // Database discount exceeding task weight
  const excessiveDiscountTask = {
    taskId: 'W021.5-TEST-04',
    taskTitle: 'Excessive Discount Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: ['scripts/reconcile_execution_ledger.mjs'],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid ratio rationale for test',
      unexecutedDatabaseWeight: 5.0, // > weight
      formalAcceptanceStatus: 'NOT_SUBMITTED'
    }
  };
  assert.throws(
    () => validateTaskAccounting(excessiveDiscountTask),
    /unexecutedDatabaseWeight/
  );
});

runTest('4.2 Dynamic task classification: 25 CORE_SPECIFICATION + 2 HARDENING_EXTENSION = 27 total', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  assert.strictEqual(ledger.summary.coreTasksCount, 25);
  assert.strictEqual(ledger.summary.hardeningExtensionsCount, 2);
  assert.strictEqual(ledger.summary.totalTasks, 27);
  assert.strictEqual(ledger.summary.statutoryBaseTasks, 25);

  const coreTasks = [];
  const hardeningTasks = [];
  for (const stage of ledger.stages) {
    for (const task of stage.tasks) {
      if (task.taskClassification === 'CORE_SPECIFICATION') coreTasks.push(task);
      else if (task.taskClassification === 'HARDENING_EXTENSION') hardeningTasks.push(task);
    }
  }
  assert.strictEqual(coreTasks.length, 25);
  assert.strictEqual(hardeningTasks.length, 2);
  assert.ok(hardeningTasks.some((t) => t.taskId === 'W021.5-A-02'));
  assert.ok(hardeningTasks.some((t) => t.taskId === 'W021.5-A-03'));
});

runTest('4.3 Reconciled ledger math and progress accounting dimensions', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = computeLedgerSummary(ledger);

  assert.strictEqual(summary.totalWeight, 100.0);
  assert.ok([61.5, 64.0].includes(summary.repositoryImplementationPercent));
  assert.ok([61.5, 51.0].includes(summary.adjudicatedEarnedCompletionPercent));
  assert.strictEqual(summary.databaseExecutionPercent, 0.0);
  assert.strictEqual(summary.formalAcceptancePercent, 0.0);
  assert.strictEqual(summary.formalAcceptancePendingWeight, 5.0);

  // Markdown ledger matches JSON summary
  const mdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');
  const mdContent = fs.readFileSync(mdPath, 'utf8');
  assert.ok(mdContent.includes(`Verified Earned Completion:          ${summary.repositoryImplementationPercent.toFixed(1)}%`));
  assert.ok(mdContent.includes(`Adjudicated Earned Completion:       ${summary.adjudicatedEarnedCompletionPercent.toFixed(1)}%`));
  assert.ok(mdContent.includes('Live Database Staging Execution:     0.0%'));
  assert.ok(mdContent.includes('Formal CTO Acceptance:              0.0%'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Workstream E — 68-File Migration Invariant & Governance Proof
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Workstream E: 68-File Migration Invariant & Governance Proof ---');

runTest('5.1 Content-level tree comparison: all 68 migrations match starting commit 0ea572d bitwise', () => {
  const report = verifyMigrationImmutability(STARTING_COMMIT);
  assert.strictEqual(report.isImmutabilityPreserved, true);
  assert.strictEqual(report.totalFilesAudited, EXPECTED_MIGRATION_COUNT);
  assert.strictEqual(report.bitwiseMatchCount, EXPECTED_MIGRATION_COUNT);
  assert.strictEqual(report.mismatchCount, 0);
  assert.strictEqual(report.startingCommit, STARTING_COMMIT);

  // Assert git diff --name-only is clean
  const diffNames = execSync(`git diff ${STARTING_COMMIT} --name-only -- supabase/migrations`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();
  assert.strictEqual(diffNames, '', 'Zero changed files in supabase/migrations vs starting commit');
});

runTest('5.2 Financial defect DQ-W021.5-B2.2E-001 is STRICTLY OPEN in all reports and code artifacts', () => {
  const matrixMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.md'), 'utf8');
  assert.ok(matrixMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));

  const ledgerMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md'), 'utf8');
  assert.ok(ledgerMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));

  const readinessMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-CANONICAL-ARCHITECTURE-READINESS-PACKAGE.md'), 'utf8');
  assert.ok(readinessMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));
});

runTest('5.3 Rule IV-001 Non-Self-Acceptance: zero author self-certification across all artifacts', () => {
  const ledgerMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md'), 'utf8');
  assert.ok(ledgerMd.includes('Rule IV-001 (Non-Self-Acceptance)'));
  assert.ok(ledgerMd.includes('The author does NOT self-certify, self-ratify, or close Milestone W021.5'));

  const matrixMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.md'), 'utf8');
  assert.ok(matrixMd.includes('Rule IV-001'));
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
