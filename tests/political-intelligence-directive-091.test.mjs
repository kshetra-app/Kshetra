import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import ts from 'typescript';

import {
  parseTsSource,
  findVariableDeclarations,
  evaluateAstNode,
  inspectAffidavitsAst,
  inspectHistoricalResultsAst,
  inspectMlaProfilesAst,
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
  compareMigrationBytes,
  STARTING_COMMIT,
  EXPECTED_MIGRATION_COUNT,
} from '../scripts/verify-migration-immutability.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('KSHETRA W021.5 — CTO DIRECTIVE 091 VERIFICATION SUITE');
console.log('Strict Undefined-Rejection, Explicit Classification, Raw Bytes & Evidence Grounding');
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
// 1. Workstream A — Complete Atomic AST Rejection of Undefined Identifiers
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 1. Workstream A: Complete Atomic AST Rejection of Undefined Identifiers ---');

runTest('1.1 Undefined in optional property atomically invalidates the record and records diagnostic', () => {
  const sourceWithUndefinedProp = `
export const SEED_AFFIDAVITS = [
  {
    id: 'rec-undefined-prop',
    candidateName: 'Candidate One',
    acNo: 1,
    constituencyName: 'Sirpur',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/c1',
    optionalField: undefined // Unsupported identifier in strict literal evaluator
  },
  {
    id: 'rec-valid-control',
    candidateName: 'Valid Candidate Control',
    acNo: 2,
    constituencyName: 'Chennur',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/c2'
  }
];
`;
  const res = inspectAffidavitsAst(sourceWithUndefinedProp, 'TS', 119);
  assert.strictEqual(res.presentInFileCount, 2);
  assert.strictEqual(res.total, 1, 'Only control record accepted; record with optionalField: undefined atomically rejected');
  assert.strictEqual(res.records[0].id, 'rec-valid-control');
  assert.ok(
    res.parseErrors.some((e) => e.includes('Identifier "undefined" is unsupported in strict literal subset') || e.includes('UNSUPPORTED_UNDEFINED_IDENTIFIER')),
    'Diagnostic emitted for undefined identifier'
  );
});

runTest('1.2 Undefined nested inside a sub-object atomically invalidates the entire top-level record', () => {
  const sourceWithNestedUndefined = `
export const SEED_AFFIDAVITS = [
  {
    id: 'rec-nested-undefined',
    candidateName: 'Candidate Nested',
    acNo: 3,
    constituencyName: 'Bellampalli',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/c3',
    nested: {
      optionalField: undefined // Deeply nested undefined
    }
  }
];
`;
  const res = inspectAffidavitsAst(sourceWithNestedUndefined, 'TS', 119);
  assert.strictEqual(res.total, 0, 'Record with deeply nested undefined must be rejected');
  assert.strictEqual(res.structurallyValidCount, 0);
  assert.ok(res.parseErrors.some((e) => e.includes('undefined')));
});

runTest('1.3 Undefined inside an array [1, undefined] atomically invalidates the record', () => {
  const sourceWithArrayUndefined = `
export const SEED_AFFIDAVITS = [
  {
    id: 'rec-array-undefined',
    candidateName: 'Candidate Array',
    acNo: 4,
    constituencyName: 'Mancherial',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/c4',
    scores: [1, undefined] // Array element undefined
  }
];
`;
  const res = inspectAffidavitsAst(sourceWithArrayUndefined, 'TS', 119);
  assert.strictEqual(res.total, 0, 'Record with array element undefined must be rejected');
  assert.ok(res.parseErrors.some((e) => e.includes('undefined')));
});

runTest('1.4 Undefined inside an unrequired/non-standard field invalidates the entire record', () => {
  const sourceWithUnrequiredUndefined = `
export const SEED_AFFIDAVITS = [
  {
    id: 'rec-unrequired-undefined',
    candidateName: 'Candidate Extra',
    acNo: 5,
    constituencyName: 'Asifabad',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/c5',
    arbitraryNonRequiredField: undefined
  }
];
`;
  const res = inspectAffidavitsAst(sourceWithUnrequiredUndefined, 'TS', 119);
  assert.strictEqual(res.total, 0);
  assert.ok(res.parseErrors.some((e) => e.includes('undefined')));
});

runTest('1.5 Mixtures of valid fields and unsupported expressions are completely rejected (no partial extraction)', () => {
  const sourceWithMixed = `
export const SEED_AFFIDAVITS = [
  {
    id: 'rec-mixed',
    candidateName: 'Candidate Mixed',
    acNo: 6,
    constituencyName: 'Khanapur',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/c6',
    validNumber: 42,
    validString: 'hello',
    validNull: null,
    badExpression: 10 * 20 // Unsupported BinaryExpression
  }
];
`;
  const res = inspectAffidavitsAst(sourceWithMixed, 'TS', 119);
  assert.strictEqual(res.total, 0, 'Partially valid record must not produce trusted extracted record');
  assert.ok(res.parseErrors.some((e) => e.includes('BinaryExpression') || e.includes('unsupported in strict literal subset')));
});

runTest('1.6 Explicit null and numeric 0 remain valid, trusted, and strictly distinct from undefined/unsupported', () => {
  const sourceWithNullAndZero = `
export const SEED_AFFIDAVITS = [
  {
    id: 'rec-valid-null-zero',
    candidateName: 'Candidate Null Zero',
    acNo: 7,
    constituencyName: 'Adilabad',
    stateCode: 'TS',
    sourceUrl: 'https://myneta.info/c7',
    explicitNull: null,
    zeroMargin: 0,
    negativeVal: -500,
    numericUnderscore: 100_000
  }
];
`;
  const { sourceFile, syntacticParseSuccess } = parseTsSource(sourceWithNullAndZero, 'null-zero.ts');
  assert.strictEqual(syntacticParseSuccess, true);
  const vars = findVariableDeclarations(sourceFile);
  const dataVar = vars.find((v) => v.name === 'SEED_AFFIDAVITS');
  const diagnostics = [];
  const evaluated = evaluateAstNode(dataVar.initializer, sourceFile, diagnostics);
  assert.strictEqual(diagnostics.length, 0, 'Explicit null, zero, negative numbers produce zero diagnostics');
  assert.strictEqual(evaluated[0].explicitNull, null);
  assert.strictEqual(evaluated[0].zeroMargin, 0);
  assert.strictEqual(evaluated[0].negativeVal, -500);
  assert.strictEqual(evaluated[0].numericUnderscore, 100000);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Workstream B — Mandatory Explicit Task Classification
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Workstream B: Mandatory Explicit Task Classification ---');

runTest('2.1 Valid explicitly classified task passes validation', () => {
  const validCoreTask = {
    taskId: 'W021.5-TEST-VALID-CORE',
    taskTitle: 'Valid Core Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: ['reports/w021_5_national_data_coverage_matrix.json'],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid rationale exceeding minimum length requirement.',
      requiresDatabaseExecution: false,
      databaseExecutionEvidenced: false,
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.strictEqual(validateTaskAccounting(validCoreTask), true);

  const validHardeningTask = {
    ...validCoreTask,
    taskId: 'W021.5-TEST-VALID-HARDENING',
    taskClassification: 'HARDENING_EXTENSION',
  };
  assert.strictEqual(validateTaskAccounting(validHardeningTask), true);
});

runTest('2.2 Missing taskClassification fails closed (no fallback to CORE_SPECIFICATION)', () => {
  const missingClassTask = {
    taskId: 'W021.5-TEST-MISSING',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: ['reports/w021_5_national_data_coverage_matrix.json'],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid rationale exceeding minimum length requirement.',
      requiresDatabaseExecution: false,
      databaseExecutionEvidenced: false,
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(missingClassTask),
    /missing, null, or empty taskClassification/
  );
});

runTest('2.3 Null taskClassification fails closed', () => {
  const nullClassTask = {
    taskId: 'W021.5-TEST-NULL',
    taskClassification: null,
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: ['reports/w021_5_national_data_coverage_matrix.json'],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid rationale exceeding minimum length requirement.',
      requiresDatabaseExecution: false,
      databaseExecutionEvidenced: false,
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(nullClassTask),
    /missing, null, or empty taskClassification/
  );
});

runTest('2.4 Empty-string taskClassification fails closed', () => {
  const emptyClassTask = {
    taskId: 'W021.5-TEST-EMPTY',
    taskClassification: '   ',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: ['reports/w021_5_national_data_coverage_matrix.json'],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid rationale exceeding minimum length requirement.',
      requiresDatabaseExecution: false,
      databaseExecutionEvidenced: false,
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(emptyClassTask),
    /missing, null, or empty taskClassification/
  );
});

runTest('2.5 Unrecognized taskClassification fails closed', () => {
  const unknownClassTask = {
    taskId: 'W021.5-TEST-UNKNOWN',
    taskClassification: 'OPTIONAL_ENHANCEMENT', // Not CORE_SPECIFICATION or HARDENING_EXTENSION
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: ['reports/w021_5_national_data_coverage_matrix.json'],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid rationale exceeding minimum length requirement.',
      requiresDatabaseExecution: false,
      databaseExecutionEvidenced: false,
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(unknownClassTask),
    /unrecognized taskClassification/
  );
});

runTest('2.6 Missing classification cannot alter totals or generate a valid-looking summary', () => {
  const brokenLedger = {
    stages: [
      {
        stageId: 'STAGE_A',
        stageWeight: 10,
        tasks: [
          {
            taskId: 'TASK-1',
            // taskClassification missing!
            weight: 10,
            status: 'REPO_VERIFIED',
            evidence: ['reports/w021_5_national_data_coverage_matrix.json'],
            accounting: {
              repoCompletionRatio: 1.0,
              ratioRationale: 'Valid rationale exceeding minimum length requirement.',
              requiresDatabaseExecution: false,
              databaseExecutionEvidenced: false,
              unexecutedDatabaseWeight: 0.0,
              formalAcceptanceStatus: 'UNACCEPTED',
            },
          },
        ],
      },
    ],
  };
  assert.throws(
    () => computeLedgerSummary(brokenLedger),
    /missing, null, or empty taskClassification/
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Workstream C — True Raw-Byte Migration Immutability Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Workstream C: True Raw-Byte Migration Immutability ---');

runTest('3.1 Live repository: all 68 migrations raw-byte identical to starting commit (no CRLF/LF normalization)', () => {
  const report = verifyMigrationImmutability(STARTING_COMMIT);
  assert.strictEqual(report.isImmutabilityPreserved, true);
  assert.strictEqual(report.totalFilesAudited, 68);
  assert.strictEqual(report.identicalCount, 68);
  assert.strictEqual(report.missingPaths.length, 0);
  assert.strictEqual(report.addedPaths.length, 0);
  assert.strictEqual(report.contentModifiedFiles.length, 0);
  assert.strictEqual(report.pathSetsIdentical, true);
  assert.strictEqual(report.isGitDiffClean, true);
});

runTest('3.2 Pure comparator logic handles all 7 adversarial immutability cases', () => {
  // Case A: Identical bytes
  const bufA = Buffer.from('SELECT 1;\n', 'utf8');
  const resA = compareMigrationBytes(new Map([['a.sql', bufA]]), new Map([['a.sql', bufA]]));
  assert.strictEqual(resA.isImmutabilityPreserved, true);

  // Case B: CRLF vs LF strictly fails (no newline normalization)
  const bufLF = Buffer.from('SELECT 1;\n', 'utf8');
  const bufCRLF = Buffer.from('SELECT 1;\r\n', 'utf8');
  const resB = compareMigrationBytes(new Map([['a.sql', bufLF]]), new Map([['a.sql', bufCRLF]]));
  assert.strictEqual(resB.isImmutabilityPreserved, false);
  assert.deepStrictEqual(resB.contentModifiedFiles, ['a.sql']);

  // Case C: Single byte change
  const bufC1 = Buffer.from('SELECT 1;', 'utf8');
  const bufC2 = Buffer.from('SELECT 2;', 'utf8');
  const resC = compareMigrationBytes(new Map([['a.sql', bufC1]]), new Map([['a.sql', bufC2]]));
  assert.strictEqual(resC.isImmutabilityPreserved, false);

  // Case D: Missing baseline path
  const resD = compareMigrationBytes(new Map([['a.sql', bufA], ['b.sql', bufA]]), new Map([['a.sql', bufA]]));
  assert.strictEqual(resD.isImmutabilityPreserved, false);
  assert.deepStrictEqual(resD.missingPaths, ['b.sql']);

  // Case E: Additional current path
  const resE = compareMigrationBytes(new Map([['a.sql', bufA]]), new Map([['a.sql', bufA], ['c.sql', bufA]]));
  assert.strictEqual(resE.isImmutabilityPreserved, false);
  assert.deepStrictEqual(resE.addedPaths, ['c.sql']);

  // Case F: Same-count rename
  const resF = compareMigrationBytes(new Map([['a.sql', bufA]]), new Map([['b.sql', bufA]]));
  assert.strictEqual(resF.isImmutabilityPreserved, false);
  assert.strictEqual(resF.pathSetsIdentical, false);

  // Case G: Unresolved baseline blob
  const resG = compareMigrationBytes(new Map([['a.sql', null]]), new Map([['a.sql', bufA]]));
  assert.strictEqual(resG.isImmutabilityPreserved, false);
  assert.deepStrictEqual(resG.unresolvedBlobs, ['a.sql']);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Workstream D — Evidence-Grounded Ledger Accounting
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Workstream D: Evidence-Grounded Ledger Accounting ---');

runTest('4.1 Task with non-zero repoCompletionRatio requires valid evidence array of existing files', () => {
  // Missing evidence array
  const taskNoEvidence = {
    taskId: 'TASK-NO-EV',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid rationale exceeding minimum length requirement.',
      requiresDatabaseExecution: false,
      databaseExecutionEvidenced: false,
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(taskNoEvidence),
    /missing or empty evidence array/
  );

  // Non-existent evidence file
  const taskBadEvidence = {
    ...taskNoEvidence,
    taskId: 'TASK-BAD-EV',
    evidence: ['non_existent_directory/fake_evidence_file.json'],
  };
  assert.throws(
    () => validateTaskAccounting(taskBadEvidence),
    /references non-existent evidence artifact/
  );
});

runTest('4.2 Task with non-zero repoCompletionRatio requires meaningful ratioRationale', () => {
  const taskShortRationale = {
    taskId: 'TASK-SHORT-RAT',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: ['reports/w021_5_national_data_coverage_matrix.json'],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Done', // too short (< 10 chars)
      requiresDatabaseExecution: false,
      databaseExecutionEvidenced: false,
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(taskShortRationale),
    /missing or insufficient ratioRationale/
  );
});

runTest('4.3 Offline reports or tests CANNOT claim live database staging execution', () => {
  const taskFakeDb = {
    taskId: 'TASK-FAKE-DB',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: ['reports/w021_5_national_data_coverage_matrix.json'],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid rationale exceeding minimum length requirement.',
      requiresDatabaseExecution: true,
      databaseExecutionEvidenced: true, // Prohibited without live execution approval!
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(taskFakeDb),
    /live database staging execution is strictly prohibited/
  );
});

runTest('4.4 CONFIRMED_ACCEPTED status requires verified formalAcceptanceArtifact on disk', () => {
  const taskUnsupportedAcceptance = {
    taskId: 'TASK-UNSUPPORTED-ACC',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: ['reports/w021_5_national_data_coverage_matrix.json'],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid rationale exceeding minimum length requirement.',
      requiresDatabaseExecution: false,
      databaseExecutionEvidenced: false,
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
      formalAcceptanceArtifact: null, // missing artifact!
    },
  };
  assert.throws(
    () => validateTaskAccounting(taskUnsupportedAcceptance),
    /without explicit formalAcceptanceArtifact/
  );
});

runTest('4.5 Reconciled ledger matches exact validated figures: 64.0% readiness, 51.0% adjudicated, 0.0% live DB', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = computeLedgerSummary(ledger);

  assert.strictEqual(summary.totalTasks, 27);
  assert.strictEqual(summary.coreTasksCount, 25);
  assert.strictEqual(summary.hardeningExtensionsCount, 2);
  assert.strictEqual(summary.totalWeight, 100.0);
  assert.strictEqual(summary.repositoryImplementationPercent, 64.0);
  assert.strictEqual(summary.adjudicatedEarnedCompletionPercent, 51.0);
  assert.strictEqual(summary.databaseExecutionPercent, 0.0);
  assert.strictEqual(summary.formalAcceptancePercent, 0.0);
  assert.strictEqual(summary.formalAcceptancePendingWeight, 5.0);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Workstream E — Governance & Invariant Preservation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Workstream E: Governance & Invariant Preservation ---');

runTest('5.1 Financial defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN in all artifacts', () => {
  const matrixMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.md'), 'utf8');
  assert.ok(matrixMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));

  const ledgerMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md'), 'utf8');
  assert.ok(ledgerMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));
});

runTest('5.2 Rule IV-001 Non-Self-Acceptance: zero author self-certification across all artifacts', () => {
  const ledgerMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md'), 'utf8');
  assert.ok(ledgerMd.includes('Rule IV-001 (Non-Self-Acceptance)'));
  assert.ok(ledgerMd.includes('The author does NOT self-certify, self-ratify, or close Milestone W021.5'));
});

runTest('5.3 Telangana AC 119 duplicate claim blocker preserved without mutating geometry fixture', () => {
  const tsGeo = inspectGeoJSON('TS', 119);
  assert.strictEqual(tsGeo.hasGeoJSON, false);
  assert.strictEqual(tsGeo.hasCleanConstituencyMapping, false);
  assert.strictEqual(tsGeo.duplicateFeatureCount, 1);
  assert.deepStrictEqual(tsGeo.duplicateLinkedAcs, [119]);
  assert.strictEqual(tsGeo.validFeatureCount, 120);
});

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
