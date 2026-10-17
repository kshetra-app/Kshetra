#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-089.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO DIRECTIVE 089 VERIFICATION BATTERY
 * Evidence-Truth Closure: AST Parsing, Statutory Coverage, and Independently Defensible Progress Accounting
 *
 * Covers all 6 workstreams:
 * 1. Workstream A: Fail-Closed TypeScript AST Parsing & Supported Literal Subset
 * 2. Workstream B: Mandatory Historical Election Event Reconciliation & Record-Level Precedence
 * 3. Workstream C: Evidence Taxonomy & URL Format Validation
 * 4. Workstream D: GeoJSON RFC 7946 Ring Closure, Traversal Guards & Statutory Completeness
 * 5. Workstream E: Evidence-Driven Progress Accounting & Master Ledger Reconciliation
 * 6. Workstream F: Non-Negotiable Governance Invariants & Output Determinism
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

import {
  parseTsSource,
  evaluateAstNode,
  findVariableDeclarations,
  isValidHttpUrl,
  inspectAffidavitsAst,
  inspectMlaProfilesAst,
  inspectHistoricalResultsAst,
} from '../scripts/lib/ast_data_parser.mjs';

import {
  validateGeoJsonObject,
  inspectGeoJSON,
  inspectAffidavits,
  inspectMlaProfiles,
  inspectHistoricalCoverage,
  generateCoverageInventory,
} from '../scripts/generate_national_data_coverage_matrix.mjs';

import {
  computeLedgerSummary,
  generateLedgerMarkdown,
} from '../scripts/reconcile_execution_ledger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    if (err.stack) {
      const lines = err.stack.split('\n').slice(1, 4).join('\n');
      console.error(`         ${lines}`);
    }
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    if (err.stack) {
      const lines = err.stack.split('\n').slice(1, 4).join('\n');
      console.error(`         ${lines}`);
    }
  }
}

console.log('================================================================');
console.log('KSHETRA W021.5 — CTO DIRECTIVE 089 VERIFICATION TEST BATTERY');
console.log('Evidence-Truth Closure: AST Parsing, Statutory Coverage & Ledger');
console.log('================================================================');

// ─────────────────────────────────────────────────────────────────────────────
// 1. Workstream A — Fail-Closed TypeScript AST Parsing & Supported Literal Subset
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 1. Workstream A: Fail-Closed TypeScript AST Parsing ---');

runTest('1.1 Syntax errors in TypeScript source fail closed with diagnostics and zero records', () => {
  const syntaxErrorSource = `
export const BROKEN_DATA = [
  { acNo: 1, name: 'Unclosed string
  { acNo: 2, name: 'Normal' }
];
`;
  const parsed = parseTsSource(syntaxErrorSource, 'broken.ts');
  assert.strictEqual(parsed.syntacticParseSuccess, false, 'Syntactic parse must fail on syntax errors');
  assert.ok(parsed.parseDiagnostics.length > 0, 'Must expose syntax error diagnostics');

  const affRes = inspectAffidavitsAst(syntaxErrorSource, 'TS', 119);
  assert.strictEqual(affRes.syntacticParseSuccess, false);
  assert.strictEqual(affRes.total, 0);

  const histRes = inspectHistoricalResultsAst(syntaxErrorSource, 119);
  assert.strictEqual(histRes.syntacticParseSuccess, false);
  assert.strictEqual(histRes.totalHistoricalYears, 0);
});

runTest('1.2 Computed property keys fail closed with explicit diagnostic without silent conversion', () => {
  const computedKeySource = `
const keyName = 'candidateName';
export const SEED_AFFIDAVITS = [
  {
    id: 'adv-comp-1',
    [keyName]: 'Computed Candidate',
    acNo: 1,
    constituencyName: 'Sirpur',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/comp-1'
  }
];
`;
  const affRes = inspectAffidavitsAst(computedKeySource, 'TS', 119);
  assert.strictEqual(affRes.total, 0, 'Record with computed property must not produce valid affidavit');
  assert.ok(
    affRes.parseErrors.some((e) => e.includes('Computed property key')),
    'Explicit diagnostic emitted for computed key'
  );
});

runTest('1.3 Shorthand properties fail closed with explicit diagnostic without silent conversion', () => {
  const shorthandSource = `
const acNo = 5;
export const SEED_AFFIDAVITS = [
  {
    id: 'adv-short-1',
    candidateName: 'Shorthand Candidate',
    acNo,
    constituencyName: 'Bellampalli',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/short-1'
  }
];
`;
  const affRes = inspectAffidavitsAst(shorthandSource, 'TS', 119);
  assert.strictEqual(affRes.total, 0, 'Record with shorthand property must not produce valid affidavit');
  assert.ok(
    affRes.parseErrors.some((e) => e.includes('Shorthand property')),
    'Explicit diagnostic emitted for shorthand property'
  );
});

runTest('1.4 Spread expressions fail closed with explicit diagnostic without silent conversion', () => {
  const spreadSource = `
const baseCandidate = { stateCode: 'TS', party: 'TRS' };
export const SEED_AFFIDAVITS = [
  {
    ...baseCandidate,
    id: 'adv-spread-1',
    candidateName: 'Spread Candidate',
    acNo: 3,
    constituencyName: 'Sirpur',
    sourceUrl: 'https://myneta.info/spread-1'
  }
];
`;
  const affRes = inspectAffidavitsAst(spreadSource, 'TS', 119);
  assert.strictEqual(affRes.total, 0, 'Record with spread assignment must not produce valid affidavit');
  assert.ok(
    affRes.parseErrors.some((e) => e.includes('spread assignment') || e.includes('Spread')),
    'Explicit diagnostic emitted for spread expression'
  );
});

runTest('1.5 Variable identifiers fail closed with explicit diagnostic without silent conversion', () => {
  const identifierSource = `
const candidateVal = 'Variable Ref Candidate';
export const SEED_AFFIDAVITS = [
  {
    id: 'adv-ident-1',
    candidateName: candidateVal,
    acNo: 4,
    constituencyName: 'Asifabad',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/ident-1'
  }
];
`;
  const affRes = inspectAffidavitsAst(identifierSource, 'TS', 119);
  assert.strictEqual(affRes.total, 0, 'Record with variable identifier must not produce valid affidavit');
  assert.ok(
    affRes.parseErrors.some((e) => e.includes('variable reference') || e.includes('Identifier')),
    'Explicit diagnostic emitted for identifier reference'
  );
});

runTest('1.6 Valid literal subset parses correctly (numeric separators, negative numbers, braces in strings, null, booleans)', () => {
  const literalSource = `
export const TEST_DATA = [
  {
    numericWithSeparators: 1_000_000,
    negativeNumber: -42.5,
    stringWithBraces: "Object { with: 'braces' } and \\"escaped quotes\\"",
    booleanVal: true,
    nullVal: null,
    nestedArray: [1, 2, [3, 4]],
    nestedObject: { childKey: 'childValue' }
  }
];
`;
  const { sourceFile, syntacticParseSuccess } = parseTsSource(literalSource, 'literal-test.ts');
  assert.strictEqual(syntacticParseSuccess, true);
  const vars = findVariableDeclarations(sourceFile);
  const testDataVar = vars.find((v) => v.name === 'TEST_DATA');
  assert.ok(testDataVar);
  const arr = evaluateAstNode(testDataVar.initializer, sourceFile);
  assert.ok(Array.isArray(arr));
  assert.strictEqual(arr.length, 1);
  const item = arr[0];
  assert.strictEqual(item.numericWithSeparators, 1000000);
  assert.strictEqual(item.negativeNumber, -42.5);
  assert.strictEqual(item.stringWithBraces, 'Object { with: \'braces\' } and "escaped quotes"');
  assert.strictEqual(item.booleanVal, true);
  assert.strictEqual(item.nullVal, null);
  assert.deepStrictEqual(item.nestedArray, [1, 2, [3, 4]]);
  assert.deepStrictEqual(item.nestedObject, { childKey: 'childValue' });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Workstream B — Mandatory Historical Election Event Reconciliation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Workstream B: Mandatory Historical Election Event Reconciliation ---');

runTest('2.1 Yearless records inside year-named collections remain yearless (collection identifier fallback removed)', () => {
  const collectionNameYearSource = `
export const TELANGANA_2014_RESULTS = [
  { acNo: 1, name: 'Sirpur', winner: 'Winner 2014', party: 'TRS' },
  { acNo: 2, name: 'Chennur', winner: 'Winner Explicit', party: 'INC', electionYear: 2018, electionType: 'BYPOLL' }
];
`;
  const res = inspectHistoricalResultsAst(collectionNameYearSource, 119);
  assert.deepStrictEqual(res.demonstrablePerAcYears, [2018], 'Only explicit record-level year is demonstrable');
  assert.strictEqual(res.eventsByYear[2014], undefined, 'Yearless record must NOT inherit 2014 from array variable name');
  assert.strictEqual(res.yearlessRecordCount, 1, 'Yearless record tracked as yearless');
  assert.strictEqual(res.eventsByYear[2018].length, 1);
});

runTest('2.2 Record-level year precedence: electionYear ?? year extracted correctly', () => {
  const precedenceSource = `
export const RESULTS = [
  { acNo: 1, name: 'Sirpur', winner: 'Winner A', party: 'TRS', electionYear: 2019 },
  { acNo: 2, name: 'Chennur', winner: 'Winner B', party: 'INC', year: 2014 }
];
`;
  const res = inspectHistoricalResultsAst(precedenceSource, 10);
  assert.deepStrictEqual(res.demonstrablePerAcYears, [2019, 2014]);
  assert.strictEqual(res.eventsByYear[2019][0].eventYear, 2019);
  assert.strictEqual(res.eventsByYear[2014][0].eventYear, 2014);
});

runTest('2.3 Conflicting record-level year fields (electionYear !== year) fail closed as malformed', () => {
  const conflictingSource = `
export const CONFLICTING_RESULTS = [
  { acNo: 1, name: 'Sirpur', winner: 'Winner A', party: 'TRS', electionYear: 2018, year: 2014 }
];
`;
  const res = inspectHistoricalResultsAst(conflictingSource, 10);
  assert.strictEqual(res.demonstrablePerAcYears.length, 0);
  assert.strictEqual(res.malformedRecordCount, 1);
  assert.ok(res.parseErrors.some((e) => e.includes('conflicting electionYear (2018) vs year (2014)')));
});

runTest('2.4 Out-of-constitutional-era years (< 1947 or > 2030) fail closed as yearless', () => {
  const invalidYearSource = `
export const ANCIENT_RESULTS = [
  { acNo: 1, name: 'Sirpur', winner: 'Ancient', party: 'None', year: 1857 },
  { acNo: 2, name: 'Chennur', winner: 'SciFi', party: 'None', year: 2099 }
];
`;
  const res = inspectHistoricalResultsAst(invalidYearSource, 10);
  assert.strictEqual(res.demonstrablePerAcYears.length, 0);
  assert.strictEqual(res.yearlessRecordCount, 2);
});

runTest('2.5 Numeric margin 0 is preserved as 0, while missing margin is strictly null', () => {
  const marginSource = `
export const MARGIN_RESULTS = [
  { year: 2018, acNo: 1, name: 'Sirpur', winner: 'Tie Winner', party: 'TRS', margin: 0, votes: 50000 },
  { year: 2018, acNo: 2, name: 'Chennur', winner: 'Missing Margin', party: 'INC' }
];
`;
  const res = inspectHistoricalResultsAst(marginSource, 10);
  const rec1 = res.eventsByYear[2018].find((r) => r.acNo === 1);
  const rec2 = res.eventsByYear[2018].find((r) => r.acNo === 2);
  assert.strictEqual(rec1.margin, 0, 'Real numeric 0 margin preserved as 0');
  assert.strictEqual(rec2.margin, null, 'Missing margin strictly null');
});

runTest('2.6 Negative metrics (votes < 0, margin < 0) fail closed as malformed records', () => {
  const negativeMetricsSource = `
export const BAD_METRICS = [
  { year: 2018, acNo: 1, name: 'Sirpur', winner: 'Bad Votes', party: 'TRS', votes: -100 },
  { year: 2018, acNo: 2, name: 'Chennur', winner: 'Bad Margin', party: 'INC', margin: -50 }
];
`;
  const res = inspectHistoricalResultsAst(negativeMetricsSource, 10);
  assert.strictEqual(res.demonstrablePerAcYears.length, 0);
  assert.strictEqual(res.malformedRecordCount, 2);
});

runTest('2.7 Reconciled records bind winner, runner-up, votes, margin, and election type to same event record', () => {
  const fullRecordSource = `
export const TELANGANA_HISTORICAL = [
  {
    year: 2018,
    acNo: 1,
    name: 'Sirpur',
    winner: 'Koneru Konappa',
    party: 'TRS',
    votes: 83088,
    runnerUp: 'Dr. Palvai Harish Babu',
    margin: 24036,
    electionType: 'GENERAL'
  }
];
`;
  const res = inspectHistoricalResultsAst(fullRecordSource, 119);
  const rec = res.eventsByYear[2018][0];
  assert.strictEqual(rec.acNo, 1);
  assert.strictEqual(rec.eventYear, 2018);
  assert.strictEqual(rec.electionType, 'GENERAL');
  assert.strictEqual(rec.winner, 'TRS');
  assert.strictEqual(rec.winnerName, 'Koneru Konappa');
  assert.strictEqual(rec.winnerVotes, 83088);
  assert.strictEqual(rec.runnerUp, 'Dr. Palvai Harish Babu');
  assert.strictEqual(rec.margin, 24036);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Workstream C — Evidence Taxonomy & URL Format Validation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Workstream C: Evidence Taxonomy & URL Format Validation ---');

runTest('3.1 Valid HTTP/HTTPS URLs increment urlFormatValidCount and sourceProvenanceRecordedCount', () => {
  assert.strictEqual(isValidHttpUrl('https://myneta.info/telangana2023/candidate.php?candidate_id=123'), true);
  assert.strictEqual(isValidHttpUrl('http://eci.gov.in/affidavits/ts-ac-1.pdf'), true);

  const validUrlSource = `
export const SEED_AFFIDAVITS = [
  {
    id: 'adv-url-1',
    candidateName: 'Valid Candidate',
    acNo: 1,
    constituencyName: 'Sirpur',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/candidate-valid'
  }
];
`;
  const res = inspectAffidavitsAst(validUrlSource, 'TS', 119);
  assert.strictEqual(res.presentInFileCount, 1);
  assert.strictEqual(res.urlFormatValidCount, 1);
  assert.strictEqual(res.sourceProvenanceRecordedCount, 1);
  assert.strictEqual(res.records[0].sourceProvenanceStatus, 'SOURCE_PROVENANCE_RECORDED_LOCAL_SEED');
});

runTest('3.2 Invalid URLs fail format check, receive status PROVENANCE_UNRECORDED_INVALID_URL, and do not increment provenance count', () => {
  assert.strictEqual(isValidHttpUrl('not-a-url'), false);
  assert.strictEqual(isValidHttpUrl('ftp://invalidscheme.com/file'), false);
  assert.strictEqual(isValidHttpUrl('file:///C:/local/path'), false);
  assert.strictEqual(isValidHttpUrl('javascript:alert(1)'), false);

  const invalidUrlSource = `
export const SEED_AFFIDAVITS = [
  {
    id: 'adv-badurl-1',
    candidateName: 'Bad URL Candidate',
    acNo: 1,
    constituencyName: 'Sirpur',
    stateCode: 'TS',
    sourceUrl: 'just-some-string-not-a-url'
  }
];
`;
  const res = inspectAffidavitsAst(invalidUrlSource, 'TS', 119);
  assert.strictEqual(res.presentInFileCount, 1);
  assert.strictEqual(res.structurallyValidCount, 1);
  assert.strictEqual(res.urlFormatValidCount, 0, 'Invalid URL string must fail URL format check');
  assert.strictEqual(res.sourceProvenanceRecordedCount, 0, 'Invalid URL must NOT increment recorded provenance count');
  assert.strictEqual(res.records[0].sourceProvenanceStatus, 'PROVENANCE_UNRECORDED_INVALID_URL');
});

runTest('3.3 Statutory identity separation: seatNumberInRangeCount vs identityValidatedCount vs identityUnresolvedCount', () => {
  const mixedIdentitySource = `
export const SEED_AFFIDAVITS = [
  {
    id: 'adv-valid-ac',
    candidateName: 'Valid AC Candidate',
    acNo: 5,
    constituencyName: 'Bellampalli',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/c5'
  },
  {
    id: 'adv-out-of-range',
    candidateName: 'Out of Range Candidate',
    acNo: 999, // out of range for TS (1-119)
    constituencyName: 'Fake AC',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/c999'
  },
  {
    id: 'adv-missing-ac',
    candidateName: 'Missing AC Candidate',
    constituencyName: 'No AC',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/c0'
  }
];
`;
  // Directive 090 B1: Without an explicit canonical registry, in-range seat is not identity proof
  const resNoRegistry = inspectAffidavitsAst(mixedIdentitySource, 'TS', 119);
  assert.strictEqual(resNoRegistry.presentInFileCount, 3);
  assert.strictEqual(resNoRegistry.seatNumberInRangeCount, 1, 'Only AC 5 is within 1-119');
  assert.strictEqual(resNoRegistry.identityValidatedCount, 0, 'Identity remains unresolved without canonical registry');
  assert.strictEqual(resNoRegistry.identityUnresolvedCount, 3, 'All 3 records unresolved without canonical registry');

  // When explicit canonical statutory registry is supplied, AC 5 matching Bellampalli is validated
  const canonicalReg = new Map([[5, { name: 'Bellampalli' }]]);
  const resWithReg = inspectAffidavitsAst(mixedIdentitySource, 'TS', 119, canonicalReg);
  assert.strictEqual(resWithReg.seatNumberInRangeCount, 1);
  assert.strictEqual(resWithReg.identityValidatedCount, 1, 'Only AC 5 has validated statutory identity');
  assert.strictEqual(resWithReg.identityUnresolvedCount, 2, '2 records have unresolved statutory identity');
});

runTest('3.4 Local seed records maintain officiallyVerifiedCount: 0, canonicalDatabaseBacked: false, formallyAccepted: false', () => {
  const tsAff = inspectAffidavits('TS', 119);
  assert.strictEqual(tsAff.total, 17);
  assert.strictEqual(tsAff.officiallyVerifiedCount, 0, 'Local seed fixture is never treated as official ECI verification');
  assert.strictEqual(tsAff.canonicalDatabaseBacked, false, 'Local seed is not canonical database backed');
  assert.strictEqual(tsAff.formallyAccepted, false, 'Local seed is not formally accepted');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Workstream D — GeoJSON RFC 7946 Validation, Traversal Guards & Completeness
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Workstream D: GeoJSON RFC 7946 Validation & Statutory Completeness ---');

runTest('4.1 Unclosed polygon ring (first position !== last position) strictly fails RFC 7946 validation', () => {
  const unclosedPolyGeo = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [78.0, 17.0],
              [79.0, 17.0],
              [79.0, 18.0],
              [78.0, 17.5], // Not closed (first is [78.0, 17.0])
            ],
          ],
        },
        properties: { AC_NO: 1 },
      },
    ],
  };
  const res = validateGeoJsonObject(unclosedPolyGeo, 'TS', 10, 'unclosed.geojson');
  assert.strictEqual(res.hasGeoJSON, false);
  assert.strictEqual(res.geometryValidFeatureCount, 0);
  assert.strictEqual(res.validFeatureCount, 0);
  assert.ok(res.validationErrors.some((e) => e.includes('ring is not closed')));
});

runTest('4.2 Polygon ring with fewer than 4 coordinate positions strictly fails RFC 7946 validation', () => {
  const shortRingGeo = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [78.0, 17.0],
              [79.0, 17.0],
              [78.0, 17.0], // Only 3 positions
            ],
          ],
        },
        properties: { AC_NO: 1 },
      },
    ],
  };
  const res = validateGeoJsonObject(shortRingGeo, 'TS', 10, 'short-ring.geojson');
  assert.strictEqual(res.hasGeoJSON, false);
  assert.strictEqual(res.geometryValidFeatureCount, 0);
  assert.strictEqual(res.validFeatureCount, 0);
  assert.ok(res.validationErrors.some((e) => e.includes('< 4 positions')));
});

runTest('4.3 Features rejected before coordinate traversal do NOT increment coordinateNumeric or coordinateRange counters', () => {
  const malformedDepthGeo = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [78.0, 17.0], // Depth 2 instead of depth 3 for Polygon
            [79.0, 17.0],
            [79.0, 18.0],
          ],
        },
        properties: { AC_NO: 1 },
      },
    ],
  };
  const res = validateGeoJsonObject(malformedDepthGeo, 'TS', 10, 'depth-error.geojson');
  assert.strictEqual(res.hasGeoJSON, false);
  assert.strictEqual(res.geometryValidFeatureCount, 0);
  assert.strictEqual(res.coordinateNumericValidFeatureCount, 0, 'Coordinate numeric counter must remain 0 when geometry traversal fails');
  assert.strictEqual(res.coordinateRangeValidFeatureCount, 0, 'Coordinate range counter must remain 0 when geometry traversal fails');
  assert.strictEqual(res.validFeatureCount, 0);
});

runTest('4.4 Incomplete statutory coverage is detected (statutoryComplete: false) while feature-level validity is preserved', () => {
  const partialCoverageGeo = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[78.0, 17.0], [79.0, 17.0], [79.0, 18.0], [78.0, 17.0]]],
        },
        properties: { AC_NO: 1 },
      },
    ],
  };
  // Statutory seats = 5, but file only has AC 1
  const res = validateGeoJsonObject(partialCoverageGeo, 'TS', 5, 'partial-5.geojson');
  assert.strictEqual(res.hasGeoJSON, true, 'Individual feature and file structure is valid');
  assert.strictEqual(res.validFeatureCount, 1);
  assert.strictEqual(res.expectedStatutoryAcCount, 5);
  assert.strictEqual(res.uniqueStatutoryAcsLinked, 1);
  assert.strictEqual(res.allExpectedStatutoryAcsRepresented, false);
  assert.strictEqual(res.statutoryComplete, false, 'Statutory completeness must be false');
  assert.deepStrictEqual(res.missingStatutoryAcNos, [2, 3, 4, 5]);
});

runTest('4.5 Legitimate MultiPolygon feature does NOT produce duplicate AC linkage', () => {
  const multiPolyGeo = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [[[78.0, 17.0], [79.0, 17.0], [79.0, 18.0], [78.0, 17.0]]],
            [[[78.2, 17.2], [78.8, 17.2], [78.8, 17.8], [78.2, 17.2]]],
          ],
        },
        properties: { AC_NO: 1 },
      },
    ],
  };
  const res = validateGeoJsonObject(multiPolyGeo, 'TS', 1, 'legit-multipoly.geojson');
  assert.strictEqual(res.hasGeoJSON, true);
  assert.strictEqual(res.featureCount, 1);
  assert.strictEqual(res.multipartFeatureCount, 1);
  assert.strictEqual(res.duplicateLinkedAcs.length, 0);
  assert.strictEqual(res.duplicateFeatureCount, 0);
  assert.strictEqual(res.statutoryComplete, true);
});

runTest('4.6 Duplicate feature objects claiming same AC are flagged in duplicateLinkedAcs and duplicateFeatureCount', () => {
  const dupeFeaturesGeo = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[78.0, 17.0], [79.0, 17.0], [79.0, 18.0], [78.0, 17.0]]],
        },
        properties: { AC_NO: 1 },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[78.1, 17.1], [79.1, 17.1], [79.1, 18.1], [78.1, 17.1]]],
        },
        properties: { AC_NO: 1 }, // Duplicate feature
      },
    ],
  };
  const res = validateGeoJsonObject(dupeFeaturesGeo, 'TS', 1, 'dupe-features.geojson');
  assert.strictEqual(res.featureCount, 2);
  assert.strictEqual(res.validFeatureCount, 2);
  assert.strictEqual(res.uniqueStatutoryAcsLinked, 1);
  assert.deepStrictEqual(res.duplicateLinkedAcs, [1]);
  assert.strictEqual(res.duplicateFeatureCount, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Workstream E — Evidence-Driven Progress Accounting & Master Ledger
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Workstream E: Evidence-Driven Progress Accounting ---');

const ledgerJsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
const ledgerMdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');
const ledger = JSON.parse(fs.readFileSync(ledgerJsonPath, 'utf8'));

runTest('5.1 All 27 tasks contain explicit accounting objects with required metadata fields', () => {
  assert.strictEqual(ledger.stages.length, 9);
  let taskCount = 0;

  for (const stage of ledger.stages) {
    for (const task of stage.tasks) {
      taskCount++;
      assert.ok(task.accounting, `Task ${task.taskId} must have accounting metadata`);
      assert.strictEqual(typeof task.accounting.repoCompletionRatio, 'number');
      assert.strictEqual(typeof task.accounting.ratioRationale, 'string');
      assert.strictEqual(typeof task.accounting.requiresDatabaseExecution, 'boolean');
      assert.strictEqual(typeof task.accounting.databaseExecutionEvidenced, 'boolean');
      assert.strictEqual(typeof task.accounting.unexecutedDatabaseWeight, 'number');
      assert.strictEqual(typeof task.accounting.blockedByExternalDependency, 'boolean');
      assert.strictEqual(typeof task.accounting.blockedByCtoDecision, 'boolean');
      assert.ok(['CONFIRMED_ACCEPTED', 'PENDING_INDEPENDENT_CONFIRMATION', 'UNACCEPTED'].includes(task.accounting.formalAcceptanceStatus));
    }
  }
  assert.strictEqual(taskCount, 27);
});

runTest('5.2 Programmatically computed progress dimensions: 64.0% repo readiness, 51.0% adjudicated completion, 0.0% live DB', () => {
  const summary = computeLedgerSummary(ledger);
  assert.strictEqual(summary.totalTasks, 27);
  assert.strictEqual(summary.totalWeight, 100.0);
  assert.strictEqual(summary.repositoryImplementationPercent, 64.0);
  assert.strictEqual(summary.adjudicatedEarnedCompletionPercent, 51.0);
  assert.strictEqual(summary.databaseExecutionPercent, 0.0);
  assert.strictEqual(summary.formalAcceptancePercent, 0.0, 'Formal acceptance is strictly 0.0% verified in repo');
  assert.strictEqual(summary.formalAcceptancePendingWeight, 5.0, 'Task W021.5-C-02 is 5.0% provisional pending confirmation');
  assert.strictEqual(summary.reconciledProgressBreakdown.unexecutedDatabasePendingPercent, 13.0);
  assert.strictEqual(summary.reconciledProgressBreakdown.blockedOnExternalCtcGatesPercent, 21.0);
  assert.strictEqual(summary.reconciledProgressBreakdown.notImplementedPercent, 3.0);
});

runTest('5.3 Mutually exclusive status partition totals exactly 27 (16 REPO_VERIFIED, 5 PARTIAL, 5 BLOCKED, 1 NOT_IMPLEMENTED)', () => {
  const counts = ledger.summary.mutuallyExclusiveStatusCounts;
  assert.strictEqual(counts.REPO_VERIFIED, 16);
  assert.strictEqual(counts.PARTIAL, 5);
  assert.strictEqual(counts.BLOCKED, 5);
  assert.strictEqual(counts.NOT_IMPLEMENTED, 1);
  assert.strictEqual(counts.REPO_VERIFIED + counts.PARTIAL + counts.BLOCKED + counts.NOT_IMPLEMENTED, 27);
});

runTest('5.4 Task W021.5-C-02 investigated under DEC-033: marked REPO_VERIFIED with formal acceptance PENDING_INDEPENDENT_CONFIRMATION', () => {
  const c02 = ledger.stages.find((s) => s.stageId === 'STAGE_C').tasks.find((t) => t.taskId === 'W021.5-C-02');
  assert.strictEqual(c02.status, 'REPO_VERIFIED');
  assert.strictEqual(c02.accounting.formalAcceptanceStatus, 'PENDING_INDEPENDENT_CONFIRMATION');
  assert.strictEqual(c02.accounting.requiresDatabaseExecution, true, 'Task C-02 requires staging database execution');
  assert.strictEqual(c02.accounting.unexecutedDatabaseWeight, 5, '5.0% unexecuted database weight');
});

runTest('5.5 Stage weights total exactly 100.0% and task weights reconcile to stages', () => {
  let stageWeightSum = 0;
  for (const stage of ledger.stages) {
    stageWeightSum += stage.stageWeight;
    const taskSum = stage.tasks.reduce((acc, t) => acc + t.weight, 0);
    assert.strictEqual(
      Math.round(stage.stageWeight * 10) / 10,
      Math.round(taskSum * 10) / 10,
      `Stage ${stage.stageId} weight mismatch`
    );
  }
  assert.strictEqual(Math.round(stageWeightSum * 10) / 10, 100.0);
});

runTest('5.6 Markdown ledger matches JSON ledger across all totals, dimensions, and governance invariants', () => {
  const mdContent = fs.readFileSync(ledgerMdPath, 'utf8');
  assert.ok(mdContent.includes('Total Tasks in Master Ledger:         27 Tasks across 9 Stages'));
  assert.ok(mdContent.includes('Repository Implementation Readiness: 64.0%'));
  assert.ok(mdContent.includes('Adjudicated Earned Completion:       51.0%'));
  assert.ok(mdContent.includes('Live Database Staging Execution:     0.0%'));
  assert.ok(mdContent.includes('Formal CTO Acceptance:              0.0%'));
  assert.ok(mdContent.includes('Unexecuted Database Pending:         13.0%'));
  assert.ok(mdContent.includes('Blocked on External / CTO Gates:     21.0%'));
  assert.ok(mdContent.includes('Not Implemented:                     3.0%'));
  assert.ok(mdContent.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Workstream F — Non-Negotiable Governance Invariants & Output Determinism
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 6. Workstream F: Governance Invariants & Output Determinism ---');

runTest('6.1 Zero database mutation invariant: 68 files in supabase/migrations/ unchanged', () => {
  const migrationsDir = path.join(REPO_ROOT, 'supabase/migrations');
  const files = fs.readdirSync(migrationsDir);
  assert.strictEqual(files.length, 68, 'Database migration count must remain strictly 68');
});

runTest('6.2 Financial defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN across all artifacts', () => {
  const matrixMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.md'), 'utf8');
  assert.ok(matrixMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));
  const ledgerMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md'), 'utf8');
  assert.ok(ledgerMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));
});

runTest('6.3 Rule IV-001 Non-Self-Acceptance invariant upheld across all artifacts', () => {
  const ledgerMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md'), 'utf8');
  assert.ok(ledgerMd.includes('Rule IV-001 (Non-Self-Acceptance)'));
  assert.ok(ledgerMd.includes('The author does NOT self-certify, self-ratify, or close Milestone W021.5'));
});

runAsyncTest('6.4 National coverage matrix generator produces deterministic substantive output across runs', async () => {
  const inv1 = await generateCoverageInventory();
  const inv2 = await generateCoverageInventory();
  assert.strictEqual(JSON.stringify(inv1), JSON.stringify(inv2), 'Successive runs must produce bitwise identical output');
});

// Summary reporting
setTimeout(() => {
  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}, 50);
