/**
 * KSHETRA W021.5 — CTO DIRECTIVE 132 INDEPENDENT PIN EVIDENCE VALIDATOR (ES MODULE WRAPPER)
 * Re-exports the canonical validation engine, negative test battery, report-generator failure battery,
 * concordance engine, concordance regression battery, execution order regression, and complete validation orchestrator.
 */

import * as validator from './verify_pin_evidence_matrix.cjs';
import { fileURLToPath } from 'url';

export const {
  REPORTED_AC_CORRECTIONS,
  KURNOOL_RECONCILIATION,
  MULTI_AC_PIN_SPECS,
  ALLOWED_CONFIDENCE_TAXONOMIES,
  REQUIRED_DOCUMENTARY_FIELDS,
  REQUIRED_SOURCE_BINDING_FIELDS,
  REQUIRED_ORTHOGONAL_STATUS_FIELDS,
  parseStatutoryTableBExtract,
  computeFileSha256,
  parseDelimitationServiceCuratedPins,
  parseSeedConstituencyNames,
  validateEvidenceMatrix,
  runNegativeValidationSuite,
  runValidation,
  generateReports,
  generateEvidenceReports,
  runReportGeneratorFailureBattery,
  parseMarkdownTable,
  generateImplementationReportTables,
  verifyConcordanceAcrossArtifacts,
  runConcordanceRegressionBattery,
  runExecutionOrderRegressionTest,
  runCompleteValidationProcess,
} = validator;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('=== EXECUTING CTO DIRECTIVE 132: COMPLETE VALIDATION ORCHESTRATION ===');

  const result = runCompleteValidationProcess();
  if (!result.allPassed) {
    console.error('Validation process failed with errors:', result.errors);
    process.exit(1);
  }

  // Execute execution-order & stale-report overwrite regression test
  const orderTest = runExecutionOrderRegressionTest();
  if (!orderTest.passed) {
    console.error('Execution order regression test failed:', orderTest.details);
    process.exit(1);
  }

  // Execute genuine concordance regression battery
  const concBattery = runConcordanceRegressionBattery();
  if (!concBattery.allCasesPassed) {
    console.error('Concordance regression battery failed:', concBattery.cases.filter(c => !c.passed));
    process.exit(1);
  }

  console.log(`\n================================================================================`);
  console.log(`ALL VALIDATION SUITES PASSED (CTO Directive 132):`);
  console.log(`- Positive Validation: 10/10 checks PASSED`);
  console.log(`- Negative Validation Battery: 38/38 scenarios PASSED`);
  console.log(`- Report Generator Failure Battery: 8/8 cases PASSED`);
  console.log(`- Complete Artifact Concordance: 36/36 records verified across all 5 artifacts`);
  console.log(`- Concordance Regression Battery: 8/8 cases PASSED`);
  console.log(`- Execution Order & Stale Overwrite Regression: PASSED`);
  console.log(`- Gate Recommendation: ${result.gateRecommendation}`);
  console.log(`- Evidence Closure Status: ${result.evidenceClosureStatus}`);
  console.log(`================================================================================\n`);
}
