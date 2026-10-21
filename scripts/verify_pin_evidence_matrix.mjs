/**
 * KSHETRA W021.5 — CTO DIRECTIVE 127 INDEPENDENT PIN EVIDENCE VALIDATOR (ES MODULE WRAPPER)
 * Re-exports the canonical validation engine and negative test battery from verify_pin_evidence_matrix.cjs
 */

import * as validator from './verify_pin_evidence_matrix.cjs';
import { fileURLToPath } from 'url';

export const {
  REPORTED_AC_CORRECTIONS,
  KURNOOL_RECONCILIATION,
  MULTI_AC_PIN_SPECS,
  ALLOWED_CONFIDENCE_TAXONOMIES,
  REQUIRED_DOCUMENTARY_FIELDS,
  parseDelimitationServiceCuratedPins,
  parseSeedConstituencyNames,
  validateEvidenceMatrix,
  runNegativeValidationSuite,
  runValidation,
  generateReports,
} = validator;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const results = generateReports();
  if (!results.allPassed) {
    console.error('Validation failed with errors:', results.errors);
    process.exit(1);
  } else {
    console.log(`All validation checks PASSED (Positive: ${results.positivePassed}, Negative Battery: ${results.negativePassed}).`);
  }
}
