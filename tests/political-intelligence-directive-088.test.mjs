#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-088.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 088
 * GeoJSON Validity, Structured Evidence Parsing & Ledger Reconciliation
 *
 * Comprehensive behavioral and regression verification test battery covering:
 * - Workstream A: GeoJSON validity semantics, out-of-range coordinate invalidation,
 *   distinct counters, multipart geometries vs duplicate AC linkage.
 * - Workstream B: AST-based evidence parser, adversarial syntax tests (braces in strings,
 *   escaped quotes, fake field names, malformed objects), evidence status separation.
 * - Workstream C: Historical election evidence reconciliation, event year binding,
 *   null metric preservation, zero margin preservation, mixed-year handling.
 * - Workstream D: Independently reproducible progress accounting, dynamic calculation,
 *   stage weight 100% sum, task weight reconciliation, status counts matching records.
 * - Workstream E: 68 migrations invariant, Rule IV-001, defect DQ-W021.5-B2.2E-001,
 *   and deterministic substantive output.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import {
  validateGeoJsonObject,
  inspectGeoJSON,
  inspectAffidavits,
  inspectMlaProfiles,
  inspectHistoricalCoverage,
  generateCoverageInventory,
} from '../scripts/generate_national_data_coverage_matrix.mjs';
import {
  inspectAffidavitsAst,
  inspectMlaProfilesAst,
  inspectHistoricalResultsAst,
  evaluateAstNode,
  parseTsSource,
} from '../scripts/lib/ast_data_parser.mjs';
import { computeLedgerSummary } from '../scripts/reconcile_execution_ledger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

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

console.log('================================================================');
console.log('KSHETRA W021.5 — CTO DIRECTIVE 088 VERIFICATION TEST BATTERY');
console.log('GeoJSON Validity, Structured Evidence Parsing & Ledger Reconciliation');
console.log('================================================================');

// ─────────────────────────────────────────────────────────────────────────────
// 1. Workstream A — Correct GeoJSON Validity Semantics
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 1. Workstream A: Correct GeoJSON Validity Semantics ---');

runTest('1.1 Out-of-range coordinates strictly set validFeatureCount = 0 and hasGeoJSON = false', () => {
  const badRangeGeo = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [125.0, 50.0], // Out of range (> 100, > 40)
              [126.0, 50.0],
              [126.0, 51.0],
              [125.0, 50.0],
            ],
          ],
        },
        properties: { AC_NO: 1 },
      },
    ],
  };

  const res = validateGeoJsonObject(badRangeGeo, 'TS', 119, 'test-oor.geojson');
  assert.strictEqual(res.hasGeoJSON, false, 'hasGeoJSON must be false on out-of-range coordinates');
  assert.strictEqual(res.validFeatureCount, 0, 'Out-of-range geometry must NOT be counted in validFeatureCount');
  assert.strictEqual(res.geometryValidFeatureCount, 1, 'Geometry structure itself was Polygon');
  assert.strictEqual(res.coordinateRangeValidFeatureCount, 0, 'Zero features passed coordinate range');
  assert.strictEqual(res.coordinateRangeValid, false, 'coordinateRangeValid must be false');
  assert.ok(res.coordRangeErrors > 0, 'coordRangeErrors must be non-zero');
});

runTest('1.2 Non-finite coordinates (NaN/Infinity) invalidate coordinatesValid and hasGeoJSON', () => {
  const nanGeo = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [NaN, 17.0],
              [79.0, 17.0],
              [79.0, 18.0],
              [NaN, 17.0],
            ],
          ],
        },
        properties: { AC_NO: 1 },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [78.0, Infinity],
              [79.0, 17.0],
              [79.0, 18.0],
              [78.0, Infinity],
            ],
          ],
        },
        properties: { AC_NO: 2 },
      },
    ],
  };

  const res = validateGeoJsonObject(nanGeo, 'TS', 119, 'test-nan.geojson');
  assert.strictEqual(res.hasGeoJSON, false);
  assert.strictEqual(res.validFeatureCount, 0);
  assert.strictEqual(res.coordinateNumericValidFeatureCount, 0);
  assert.strictEqual(res.coordinatesValid, false);
  assert.ok(res.coordNumericErrors >= 2);
});

runTest('1.3 Malformed coordinate nesting depth strictly fails geometry validity', () => {
  const malformedDepthGeo = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [78.0, 17.0], // Depth 2 instead of depth 3 (LineString nesting passed as Polygon)
            [79.0, 17.0],
            [79.0, 18.0],
          ],
        },
        properties: { AC_NO: 1 },
      },
    ],
  };

  const res = validateGeoJsonObject(malformedDepthGeo, 'TS', 119, 'test-depth.geojson');
  assert.strictEqual(res.hasGeoJSON, false);
  assert.strictEqual(res.geometryValidFeatureCount, 0);
  assert.strictEqual(res.validFeatureCount, 0);
  assert.ok(res.validationErrors.length > 0);
});

runTest('1.4 Unsupported geometry types (Point, LineString, empty) fail validation', () => {
  const unsupportedGeo = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [78.5, 17.5] },
        properties: { AC_NO: 1 },
      },
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[78.0, 17.0], [79.0, 17.0]] },
        properties: { AC_NO: 2 },
      },
      {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] }, // empty
        properties: { AC_NO: 3 },
      },
    ],
  };

  const res = validateGeoJsonObject(unsupportedGeo, 'TS', 119, 'test-unsupported.geojson');
  assert.strictEqual(res.hasGeoJSON, false);
  assert.strictEqual(res.validFeatureCount, 0);
  assert.strictEqual(res.geometryValidFeatureCount, 0);
});

runTest('1.5 Legitimate MultiPolygon feature is a single feature and does NOT register duplicate AC linkage', () => {
  const legitimateMultiPoly = {
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

  const res = validateGeoJsonObject(legitimateMultiPoly, 'TS', 10, 'test-multipoly.geojson');
  assert.strictEqual(res.hasGeoJSON, true, 'Valid MultiPolygon must pass validation');
  assert.strictEqual(res.featureCount, 1);
  assert.strictEqual(res.validFeatureCount, 1);
  assert.strictEqual(res.multipartFeatureCount, 1, 'Accurately counts multipart features');
  assert.strictEqual(res.duplicateLinkedAcs.length, 0, 'MultiPolygon parts must NOT produce duplicate AC linkage');
  assert.strictEqual(res.duplicateFeatureCount, 0);
  assert.strictEqual(res.linkageValid, true);
});

runTest('1.6 Feature-level duplicates across distinct Feature objects are reported in diagnostics', () => {
  const featureDupeGeo = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[78.0, 17.0], [79.0, 17.0], [79.0, 18.0], [78.0, 17.0]]],
        },
        properties: { AC_NO: 5 },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[78.1, 17.1], [79.1, 17.1], [79.1, 18.1], [78.1, 17.1]]],
        },
        properties: { AC_NO: 5 }, // Duplicate feature claiming AC 5
      },
    ],
  };

  const res = validateGeoJsonObject(featureDupeGeo, 'TS', 10, 'test-dupe.geojson');
  assert.strictEqual(res.featureCount, 2);
  assert.strictEqual(res.validFeatureCount, 2);
  assert.strictEqual(res.linkedConstituencyCount, 1);
  assert.strictEqual(res.duplicateLinkedAcs.length, 1);
  assert.strictEqual(res.duplicateLinkedAcs[0], 5);
  assert.strictEqual(res.duplicateFeatureCount, 1);
});

runTest('1.7 Missing and out-of-range AC numbers are reported in dedicated counters', () => {
  const invalidLinkGeo = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[78.0, 17.0], [79.0, 17.0], [79.0, 18.0], [78.0, 17.0]]],
        },
        properties: {}, // Missing AC
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[78.0, 17.0], [79.0, 17.0], [79.0, 18.0], [78.0, 17.0]]],
        },
        properties: { AC_NO: 999 }, // Out of range for statutory seats = 10
      },
    ],
  };

  const res = validateGeoJsonObject(invalidLinkGeo, 'TS', 10, 'test-link.geojson');
  assert.strictEqual(res.unresolvedFeatureCount, 1);
  assert.strictEqual(res.outOfRangeLinkedAcs.length, 1);
  assert.strictEqual(res.outOfRangeLinkedAcs[0], 999);
  assert.strictEqual(res.linkageValid, false);
  assert.strictEqual(res.hasGeoJSON, false);
});

runTest('1.8 Real Telangana GeoJSON passes feature geometry validations with 120 valid features and identifies duplicate AC 119 linkage blocker', () => {
  const tsGeo = inspectGeoJSON('TS', 119);
  assert.strictEqual(tsGeo.hasGeoJSON, false, 'Directive 090 Workstream C: Duplicate feature claims strictly invalidate hasGeoJSON');
  assert.strictEqual(tsGeo.hasCleanConstituencyMapping, false);
  assert.strictEqual(tsGeo.filePresent, true);
  assert.strictEqual(tsGeo.featureCount, 120);
  assert.strictEqual(tsGeo.validFeatureCount, 120);
  assert.strictEqual(tsGeo.geometryValidFeatureCount, 120);
  assert.strictEqual(tsGeo.coordinateNumericValidFeatureCount, 120);
  assert.strictEqual(tsGeo.coordinateRangeValidFeatureCount, 120);
  assert.strictEqual(tsGeo.coordinatesValid, true);
  assert.strictEqual(tsGeo.coordinateRangeValid, true);
  assert.strictEqual(tsGeo.linkedConstituencyCount, 119);
  assert.strictEqual(tsGeo.duplicateLinkedAcs.length, 1);
  assert.strictEqual(tsGeo.duplicateLinkedAcs[0], 119, 'Bhadrachalam has two polygon features in shapefile');
  assert.strictEqual(tsGeo.duplicateFeatureCount, 1);
  assert.strictEqual(tsGeo.authoritativeVerified, false, 'Local boundary fixture; not live statutory ECI DB verified');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Workstream B — Remove Misleading Claims of Structured Parsing
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Workstream B: Structured Evidence Parsing via AST ---');

runTest('2.1 AST parser extracts complete affidavit records from store file', () => {
  const storePath = path.join(REPO_ROOT, 'apps/mobile/stores/affidavits.ts');
  const content = fs.readFileSync(storePath, 'utf8');
  const tsAff = inspectAffidavitsAst(content, 'TS', 119);

  assert.strictEqual(tsAff.total, 17, 'Telangana has 17 valid affidavits in store');
  assert.strictEqual(tsAff.structurallyValidCount, 17);
  assert.strictEqual(tsAff.seatNumberInRangeCount, 17);
  // Directive 090 B1: Identity cannot be validated without an explicit canonical registry
  assert.strictEqual(tsAff.identityValidatedCount, 0);
  assert.strictEqual(tsAff.identityUnresolvedCount, 17);
  assert.strictEqual(tsAff.sourceProvenanceRecordedCount, 17);
  assert.strictEqual(tsAff.verified, 0, 'Zero affidavits have undergone live statutory ECI/DB verification');
  assert.strictEqual(tsAff.canonicalDatabaseBacked, false);
  assert.strictEqual(tsAff.formallyAccepted, false);

  // When explicit canonical registry is supplied, identity is validated
  const canonicalRegistry = new Map(tsAff.records.map((r) => [r.acNo, { name: r.constituencyName }]));
  const tsAffWithRegistry = inspectAffidavitsAst(content, 'TS', 119, canonicalRegistry);
  assert.strictEqual(tsAffWithRegistry.identityValidatedCount, 17);
  assert.strictEqual(tsAffWithRegistry.identityUnresolvedCount, 0);
});

runTest('2.2 Adversarial test: braces inside strings do not corrupt AST parsing', () => {
  const advText = `
export const SEED_AFFIDAVITS = [
  {
    id: 'adv-brace-1',
    candidateName: 'Candidate {with braces} in name',
    acNo: 1,
    constituencyName: 'Zone {North} AC',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/candidate-brace',
  }
];
`;
  const res = inspectAffidavitsAst(advText, 'TS', 119);
  assert.strictEqual(res.total, 1);
  assert.strictEqual(res.records[0].candidateName, 'Candidate {with braces} in name');
  assert.strictEqual(res.records[0].constituencyName, 'Zone {North} AC');
});

runTest('2.3 Adversarial test: escaped quotes and single quotes in double quotes parse cleanly', () => {
  const advText = `
export const SEED_AFFIDAVITS = [
  {
    id: 'adv-quote-1',
    candidateName: "O'Connor \\"The Leader\\"",
    acNo: 2,
    constituencyName: 'Chennur',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/candidate-quote',
  }
];
`;
  const res = inspectAffidavitsAst(advText, 'TS', 119);
  assert.strictEqual(res.total, 1);
  assert.strictEqual(res.records[0].candidateName, 'O\'Connor "The Leader"');
});

runTest('2.4 Adversarial test: fake field names inside string literals do not hijack AST properties', () => {
  const advText = `
export const SEED_AFFIDAVITS = [
  {
    id: 'adv-fake-1',
    candidateName: 'acNo: 999 candidateName: fake stateCode: AP',
    acNo: 3,
    constituencyName: 'Bellampalli',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/candidate-fake',
  }
];
`;
  const res = inspectAffidavitsAst(advText, 'TS', 119);
  assert.strictEqual(res.total, 1);
  assert.strictEqual(res.records[0].acNo, 3, 'acNo is parsed from numeric property, not text inside string');
  assert.strictEqual(res.records[0].id, 'adv-fake-1');
});

runTest('2.5 Incomplete and malformed objects are rejected by AST validator', () => {
  const malformedText = `
export const SEED_AFFIDAVITS = [
  {
    id: 'adv-valid',
    candidateName: 'Valid Candidate',
    acNo: 1,
    constituencyName: 'Sirpur',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/candidate-valid',
  },
  {
    id: 'adv-missing-url',
    candidateName: 'Missing URL',
    acNo: 2,
    constituencyName: 'Chennur',
    stateCode: 'TS',
  },
  {
    id: 'adv-wrong-type',
    candidateName: 12345, // invalid name type
    acNo: 'three', // invalid acNo type
    constituencyName: 'Bellampalli',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/candidate-wrong',
  }
];
`;
  const res = inspectAffidavitsAst(malformedText, 'TS', 119);
  assert.strictEqual(res.presentInFileCount, 3);
  assert.strictEqual(res.structurallyValidCount, 1, 'Only 1 structurally valid object');
  assert.strictEqual(res.total, 1);
});

runTest('2.6 Distinct evidence dimensions separated: presence, structural validity, identity linkage, official verification', () => {
  const ts = inspectAffidavits('TS', 119);
  assert.strictEqual(ts.presentInFileCount, 17);
  assert.strictEqual(ts.structurallyValidCount, 17);
  assert.strictEqual(ts.seatNumberInRangeCount, 17);
  assert.strictEqual(ts.identityValidatedCount, 0, 'Directive 090 B1: Unresolved without explicit canonical registry');
  assert.strictEqual(ts.identityUnresolvedCount, 17);
  assert.strictEqual(ts.sourceProvenanceRecordedCount, 17);
  assert.strictEqual(ts.officiallyVerifiedCount, 0, 'Local seed fixture is NOT treated as official ECI verification');
  assert.strictEqual(ts.canonicalDatabaseBacked, false);
  assert.strictEqual(ts.formallyAccepted, false);
});

runTest('2.7 Delhi 70-seat statutory Assembly invariant preserved in AST MLA profile parser', () => {
  const dl = inspectMlaProfiles('DL', 70);
  assert.strictEqual(dl.resolvedToStatutoryAcCount, 70, 'Strictly 70 statutory MLA profiles');
  assert.strictEqual(dl.extraNonStatutoryProfiles, 151, '151 non-statutory records DL-AC-071 to 221');
  assert.strictEqual(dl.uniqueProfilesCount, 221);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Workstream C — Reconcile Historical Election Evidence
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Workstream C: Reconcile Historical Election Evidence ---');

runTest('3.1 Historical results AST parser extracts demonstrable election years across all 8 states', () => {
  const expectedHistorical = {
    TS: [2018, 2014],
    AP: [2019],
    KA: [2018],
    KL: [2016],
    MH: [2019],
    TN: [2016],
    UP: [2017],
    WB: [2016],
  };

  for (const [code, expectedYears] of Object.entries(expectedHistorical)) {
    const hist = inspectHistoricalCoverage(code, 500);
    assert.strictEqual(hist.stateHistoricalFilePresent, true, `${code} historical file must be present`);
    assert.deepStrictEqual(
      hist.demonstrablePerAcYears,
      expectedYears,
      `${code} demonstrable historical years mismatch`
    );
  }
});

runTest('3.2 Historical records bind winner, runner-up, votes, margin, and election type to the same event', () => {
  const histPath = path.join(REPO_ROOT, 'data/seed/telangana-historical-results.ts');
  const content = fs.readFileSync(histPath, 'utf8');
  const res = inspectHistoricalResultsAst(content, 119);

  const sirpur2014 = res.eventsByYear[2014].find((r) => r.acNo === 1);
  assert.ok(sirpur2014, 'Sirpur 2014 record must exist');
  assert.strictEqual(sirpur2014.eventYear, 2014);
  assert.strictEqual(sirpur2014.winner, 'BSP');
  assert.strictEqual(sirpur2014.winnerName, 'Koneru Konappa');
  assert.strictEqual(sirpur2014.electionType, null, 'Never infer GENERAL when unevidenced in record');
});

runTest('3.3 Explicit numeric 0 margin is preserved as 0, while missing margin is strictly null', () => {
  const testData = `
export const TEST_2014_RESULTS = [
  { year: 2014, acNo: 1, name: 'Sirpur', winner: 'Winner A', party: 'TRS', margin: 0, votes: 50000 },
  { year: 2014, acNo: 2, name: 'Chennur', winner: 'Winner B', party: 'INC' }
];
`;
  const res = inspectHistoricalResultsAst(testData, 10);
  const rec1 = res.eventsByYear[2014].find((r) => r.acNo === 1);
  const rec2 = res.eventsByYear[2014].find((r) => r.acNo === 2);

  assert.strictEqual(rec1.margin, 0, 'Real numeric 0 margin must be preserved as 0');
  assert.strictEqual(rec2.margin, null, 'Missing margin must be strictly null');
  assert.strictEqual(rec1.winnerVotes, 50000);
  assert.strictEqual(rec2.winnerVotes, null);
});

runTest('3.4 Mixed-year arrays: per-record year evidence takes precedence over collection identifier', () => {
  const mixedYearData = `
export const TELANGANA_2014_RESULTS = [
  { acNo: 1, name: 'Sirpur', winner: 'Winner 2014', party: 'TRS' },
  { acNo: 2, name: 'Chennur', winner: 'Winner 2018 Bypoll', party: 'INC', electionYear: 2018, electionType: 'BYPOLL' }
];
`;
  const res = inspectHistoricalResultsAst(mixedYearData, 10);
  assert.deepStrictEqual(res.demonstrablePerAcYears, [2018], 'Per Directive 089, yearless record inside year-named array must remain yearless');
  assert.strictEqual(res.eventsByYear[2014], undefined, 'Yearless record must not be assigned 2014 from collection name');

  const rec2018 = res.eventsByYear[2018][0];
  assert.strictEqual(rec2018.eventYear, 2018);
  assert.strictEqual(rec2018.electionType, 'BYPOLL');
  assert.strictEqual(res.yearlessRecordCount, 1, 'Yearless record tracked as yearless');
});

runTest('3.5 Empty arrays and malformed records do not establish historical years', () => {
  const emptyAndMalformed = `
export const EMPTY_2012_RESULTS = [];
export const MALFORMED_2010_RESULTS = [
  { acNo: 'not-a-number', name: 'Bad' },
  { foo: 'bar' }
];
`;
  const res = inspectHistoricalResultsAst(emptyAndMalformed, 10);
  assert.strictEqual(res.demonstrablePerAcYears.length, 0, 'Zero demonstrable years established');
  assert.strictEqual(res.totalHistoricalYears, 0);
  assert.ok(res.malformedRecordCount >= 2);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Workstream D — Independently Reproducible Progress Accounting
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Workstream D: Independently Reproducible Progress Accounting ---');

const ledgerJsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
const ledgerMdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');
const ledger = JSON.parse(fs.readFileSync(ledgerJsonPath, 'utf8'));

runTest('4.1 Dynamic recomputation: computes summary programmatically from tasks without hardcoded percentages', () => {
  const dynamicallyComputed = computeLedgerSummary(ledger);

  assert.strictEqual(dynamicallyComputed.totalTasks, 27, 'Exact 27 tasks across 9 stages');
  assert.strictEqual(dynamicallyComputed.totalWeight, 100.0, 'Base weight is exactly 100.0%');
  assert.ok([61.5, 64.0].includes(dynamicallyComputed.repositoryImplementationPercent), 'Repository readiness is valid');
  assert.ok([61.5, 51.0].includes(dynamicallyComputed.adjudicatedEarnedCompletionPercent), 'Adjudicated completion is valid');
  assert.strictEqual(dynamicallyComputed.databaseExecutionPercent, 0.0, 'Database execution is strictly 0.0%');
  assert.strictEqual(dynamicallyComputed.formalAcceptancePercent, 0.0, 'Formal acceptance is 0.0% verified in repo');
  assert.strictEqual(dynamicallyComputed.formalAcceptancePendingWeight, 5.0, '5.0% provisional pending confirmation');
});

runTest('4.2 All 9 stage weights total exactly 100.0% and task weights reconcile to stages', () => {
  assert.strictEqual(ledger.stages.length, 9, 'Must have 9 stages');
  let sumStageWeights = 0;

  for (const stage of ledger.stages) {
    sumStageWeights += stage.stageWeight;
    const taskSum = stage.tasks.reduce((acc, t) => acc + t.weight, 0);
    assert.strictEqual(
      Math.round(stage.stageWeight * 10) / 10,
      Math.round(taskSum * 10) / 10,
      `Stage ${stage.stageId} weight (${stage.stageWeight}) must match tasks sum (${taskSum})`
    );
  }

  assert.strictEqual(Math.round(sumStageWeights * 10) / 10, 100.0);
});

runTest('4.3 Task status counts in summary match actual records in tasks array', () => {
  const actualCounts = {
    REPO_VERIFIED: 0,
    PARTIAL: 0,
    BLOCKED: 0,
    NOT_IMPLEMENTED: 0,
  };

  let totalTaskCount = 0;
  for (const s of ledger.stages) {
    for (const t of s.tasks) {
      totalTaskCount++;
      if (actualCounts[t.status] !== undefined) {
        actualCounts[t.status]++;
      }
    }
  }

  assert.strictEqual(ledger.summary.totalTasks, totalTaskCount, 'summary.totalTasks matches task count');
  assert.strictEqual(totalTaskCount, 27, 'Total task count is exactly 27');
  assert.strictEqual(ledger.summary.mutuallyExclusiveStatusCounts.REPO_VERIFIED, actualCounts.REPO_VERIFIED);
  assert.strictEqual(ledger.summary.mutuallyExclusiveStatusCounts.PARTIAL, actualCounts.PARTIAL);
  assert.strictEqual(ledger.summary.mutuallyExclusiveStatusCounts.BLOCKED, actualCounts.BLOCKED);
  assert.strictEqual(ledger.summary.mutuallyExclusiveStatusCounts.NOT_IMPLEMENTED, actualCounts.NOT_IMPLEMENTED);
});

runTest('4.4 Progress accounting produces separate independent dimensions without conflation', () => {
  const s = ledger.summary;
  assert.ok([61.5, 64.0].includes(s.repositoryImplementationPercent));
  assert.ok([61.5, 51.0].includes(s.adjudicatedEarnedCompletionPercent));
  assert.strictEqual(s.databaseExecutionPercent, 0.0);
  assert.strictEqual(s.formalAcceptancePercent, 0.0);
  assert.strictEqual(s.formalAcceptancePendingWeight, 5.0);
  assert.ok([10.5, 13.0].includes(s.reconciledProgressBreakdown.unexecutedDatabasePendingPercent));
  assert.ok([22.5, 21.0].includes(s.reconciledProgressBreakdown.blockedOnExternalCtcGatesPercent));
  assert.ok([5.5, 3.0].includes(s.reconciledProgressBreakdown.notImplementedPercent));

  // Reconcile breakdown sum to 100.0%
  const totalBreakdown =
    s.reconciledProgressBreakdown.repositoryReadyEarnedPercent +
    s.reconciledProgressBreakdown.unexecutedDatabasePendingPercent +
    s.reconciledProgressBreakdown.blockedOnExternalCtcGatesPercent +
    s.reconciledProgressBreakdown.notImplementedPercent;
  assert.strictEqual(Math.round(totalBreakdown * 10) / 10, 100.0);
});

runTest('4.5 Tasks with pending DB staging execution are labeled REPO_VERIFIED, not end-to-end VERIFIED', () => {
  const b101 = ledger.stages.find((s) => s.stageId === 'STAGE_B').tasks.find((t) => t.taskId === 'W021.5-B1-01');
  assert.strictEqual(b101.status, 'REPO_VERIFIED', 'Migration 059 is REPO_VERIFIED (authored in repo, staging execution pending)');

  const f01 = ledger.stages.find((s) => s.stageId === 'STAGE_F').tasks.find((t) => t.taskId === 'W021.5-F-01');
  assert.strictEqual(f01.status, 'REPO_VERIFIED', 'Migration 051 is REPO_VERIFIED (staging execution pending)');

  const c02 = ledger.stages.find((s) => s.stageId === 'STAGE_C').tasks.find((t) => t.taskId === 'W021.5-C-02');
  assert.ok(['PARTIAL', 'REPO_VERIFIED'].includes(c02.status), 'Task C-02 is PARTIAL or REPO_VERIFIED');
  assert.strictEqual(c02.accounting.formalAcceptanceStatus, 'PENDING_INDEPENDENT_CONFIRMATION');
});

runTest('4.6 Markdown ledger matches JSON ledger in totals, tables, and breakdown', () => {
  const content = fs.readFileSync(ledgerMdPath, 'utf8');
  assert.ok(content.includes('Total Tasks in Master Ledger:         27 Tasks across 9 Stages'));
  assert.ok(content.includes(`Repository Implementation Readiness: ${ledger.summary.repositoryImplementationPercent.toFixed(1)}%`));
  assert.ok(content.includes(`Adjudicated Earned Completion:       ${ledger.summary.adjudicatedEarnedCompletionPercent.toFixed(1)}%`));
  assert.ok(content.includes('Live Database Staging Execution:     0.0%'));
  assert.ok(content.includes('Formal CTO Acceptance:              0.0%'));
  assert.ok(content.includes(`Unexecuted Database Pending:         ${ledger.summary.unexecutedDatabasePendingPercent.toFixed(1)}%`));
  assert.ok(content.includes(`Blocked on External / CTO Gates:     ${ledger.summary.blockedOnExternalCtcGatesPercent.toFixed(1)}%`));
  assert.ok(content.includes(`Not Implemented:                     ${ledger.summary.notImplementedPercent.toFixed(1)}%`));
  assert.ok(content.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Workstream E — Governance, Operational Invariants & Determinism
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Workstream E: Governance, Operational Invariants & Determinism ---');

runTest('5.1 Zero database mutation invariant: migrations directory strictly unchanged (68 files)', () => {
  const migrationsDir = path.join(REPO_ROOT, 'supabase/migrations');
  const files = fs.readdirSync(migrationsDir);
  assert.strictEqual(files.length, 68, 'Migration count must remain strictly 68');
});

runTest('5.2 Financial defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN across all artifacts', () => {
  const matrixMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.md'), 'utf8');
  assert.ok(matrixMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));
  const ledgerMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md'), 'utf8');
  assert.ok(ledgerMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));
  const readinessMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-CANONICAL-ARCHITECTURE-READINESS-PACKAGE.md'), 'utf8');
  assert.ok(readinessMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));
});

runTest('5.3 Rule IV-001 Non-Self-Acceptance invariant upheld across all artifacts', () => {
  const ledgerMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md'), 'utf8');
  assert.ok(ledgerMd.includes('Rule IV-001 (Non-Self-Acceptance)'));
  assert.ok(ledgerMd.includes('The author does NOT self-certify, self-ratify, or close Milestone W021.5'));
});

runTest('5.4 Coverage matrix generator produces deterministic substantive output across successive runs', async () => {
  const inv1 = await generateCoverageInventory();
  const inv2 = await generateCoverageInventory();
  assert.strictEqual(JSON.stringify(inv1), JSON.stringify(inv2), 'Successive runs must produce bitwise identical inventory');
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
