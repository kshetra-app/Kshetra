/**
 * KSHETRA W021.5 — CTO DIRECTIVE 131 INDEPENDENT PIN EVIDENCE VALIDATOR (ES MODULE WRAPPER)
 * Re-exports the canonical validation engine, negative test battery, and report-generator failure battery
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
} = validator;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { results } = generateEvidenceReports();
  if (!results.allPassed) {
    console.error('Validation failed with errors:', results.errors);
    process.exit(1);
  }

  const battery = runReportGeneratorFailureBattery();
  if (!battery.allCasesPassed) {
    console.error('Report generator failure battery failed:', battery.cases.filter(c => !c.passed));
    process.exit(1);
  }

  console.log(`All validation checks PASSED (Positive: ${results.positivePassed}, Negative Battery: ${results.negativePassed}, Report Generator Failure Battery: 8/8 passed).`);
}
