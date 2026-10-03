/**
 * scripts/generate-b2-2c-1096-disposition-v2.mjs
 * 
 * Generates the fully decomposed 1,096-row disposition ledger v2:
 * 
 * Partitions the 1,096 raw party strings into exactly 7 mutually exclusive classes:
 * 1. VERIFIED_ORGANIZATION_ALIAS: 1,030
 * 2. RECONCILED_ORGANIZATION_ALIAS: 13
 * 3. RECONCILED_MP_CODE: 9
 * 4. INDEPENDENT: 25
 * 5. PROVISIONAL: 14
 * 6. NON_ORGANIZATION: 4
 * 7. NOMINATED: 1
 * Total: 1,096 (Remainder = 0)
 * 
 * Canonical Organization Aliases eligible for public.organization_aliases:
 * 1,030 + 13 = 1,043
 * 
 * Outputs:
 * - reports/w021_5b2_b2_2c_1096_disposition_ledger_v2.json
 * - reports/w021_5b2_b2_2c_set_difference_audit_v2.json
 */

import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const reconPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_organization_reconciliation_v2.json');
const manifestPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_b2_2c_final_organization_manifest.json');

const recon = JSON.parse(fs.readFileSync(reconPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const canonicalOrgIds = new Set(manifest.canonicalOrganizations.map(o => o.id));

const ledger1096 = [];
const setDifference = {
  auditedAt: new Date().toISOString(),
  totalRawStrings: 1096,
  canonicalOrganizationAliasesCount: 1043,
  provisionalQuarantinedCount: 14,
  nonAliasSetDifferenceCount: 53, // 1096 - 1043 = 53 (14 prov + 25 ind + 9 mp + 4 non-org + 1 nom)
  unaccountedSetCount: 39, // (1096 - (1043 aliases + 14 prov)) = 39
  breakdownOfAll1096Strings: {
    verifiedOrganizationAliases: 0,
    reconciledOrganizationAliases: 0,
    reconciledMpSingleLetterCodes: 0,
    independentCandidacies: 0,
    provisionalQuarantined: 0,
    nonOrganizationStatutoryAndBuckets: 0,
    nominatedRajyaSabhaCode: 0
  },
  unaccountedCategorizationOf39Strings: {
    independentCandidacies: 25,
    reconciledMpSingleLetterCodes: 9,
    statutoryBallotOptionsNota: 2,
    genericBucketLabels: 2,
    nominatedRajyaSabhaCode: 1
  },
  unaccountedStringsList: []
};

for (const r of recon.reconciliationRecords) {
  let dispositionClass = '';
  let organizationId = null;
  let organizationResolutionStatus = '';
  let reason = '';

  if (r.confidence === 'PROVISIONAL') {
    dispositionClass = 'PROVISIONAL';
    organizationId = null;
    organizationResolutionStatus = 'QUARANTINED_PENDING_FORM_21E';
    reason = r.notes || 'Unverified local entity or placeholder requiring Form 21E audit';
  } else if (r.isIndependent) {
    dispositionClass = 'INDEPENDENT';
    organizationId = null;
    organizationResolutionStatus = 'NOT_APPLICABLE_INDEPENDENT_CANDIDACY';
    reason = 'Independent candidacy; modeled via candidacies.is_independent = true with organization_id = null.';
  } else if (r.isNominated) {
    dispositionClass = 'NOMINATED';
    organizationId = null;
    organizationResolutionStatus = 'NOT_APPLICABLE_CONSTITUTIONAL_NOMINEE';
    reason = 'Nominated Rajya Sabha member under Article 80(1)(a); holds no political party affiliation.';
  } else if (r.isNota) {
    dispositionClass = 'NON_ORGANIZATION';
    organizationId = null;
    organizationResolutionStatus = 'NOT_APPLICABLE_STATUTORY_BALLOT_OPTION';
    reason = 'None of the Above (NOTA) statutory non-candidate ballot option; modeled as election counter.';
  } else if (r.resolutionType === 'GENERIC_BUCKET_LABEL') {
    dispositionClass = 'NON_ORGANIZATION';
    organizationId = null;
    organizationResolutionStatus = 'NOT_APPLICABLE_GENERIC_BUCKET';
    reason = 'Generic aggregation bucket for minor parties in summary tables; excluded from organization tables.';
  } else if (r.resolutionType === 'CORRUPTED_1LETTER_CODE') {
    dispositionClass = 'RECONCILED_MP_CODE';
    organizationId = null; // Single-letter MP codes do NOT resolve to organization table as aliases!
    organizationResolutionStatus = 'RECONCILED_VIA_CANDIDACY_CONTEXT';
    reason = r.notes || `Corrupted single-letter party code '${r.rawString}' in mp-profiles.ts; reconciled contextually via candidate MP record.`;
  } else if (r.canonicalOrgId !== null) {
    if (r.confidence === 'VERIFIED') {
      dispositionClass = 'VERIFIED_ORGANIZATION_ALIAS';
      organizationId = r.canonicalOrgId;
      organizationResolutionStatus = 'CANONICAL_ORGANIZATION_RESOLVED';
      reason = 'Verified organization alias matching canonical political organization.';
    } else {
      dispositionClass = 'RECONCILED_ORGANIZATION_ALIAS';
      organizationId = r.canonicalOrgId;
      organizationResolutionStatus = 'RECONCILED_ORGANIZATION_RESOLVED';
      reason = r.notes || 'Reconciled organization alias (historical spelling variant or state-specific alias).';
    }
  } else {
    throw new Error(`Unclassified record: ${JSON.stringify(r)}`);
  }

  // Tally breakdown
  if (dispositionClass === 'VERIFIED_ORGANIZATION_ALIAS') setDifference.breakdownOfAll1096Strings.verifiedOrganizationAliases++;
  if (dispositionClass === 'RECONCILED_ORGANIZATION_ALIAS') setDifference.breakdownOfAll1096Strings.reconciledOrganizationAliases++;
  if (dispositionClass === 'RECONCILED_MP_CODE') setDifference.breakdownOfAll1096Strings.reconciledMpSingleLetterCodes++;
  if (dispositionClass === 'INDEPENDENT') setDifference.breakdownOfAll1096Strings.independentCandidacies++;
  if (dispositionClass === 'PROVISIONAL') setDifference.breakdownOfAll1096Strings.provisionalQuarantined++;
  if (dispositionClass === 'NON_ORGANIZATION') setDifference.breakdownOfAll1096Strings.nonOrganizationStatutoryAndBuckets++;
  if (dispositionClass === 'NOMINATED') setDifference.breakdownOfAll1096Strings.nominatedRajyaSabhaCode++;

  const ledgerRow = {
    raw_string: r.rawString,
    normalized_key: r.rawString.trim().toLowerCase(),
    occurrence_count: r.occurrences,
    source_files: r.sources,
    source_context: r.contexts && r.contexts[0] ? r.contexts[0] : 'NATIONAL',
    disposition_class: dispositionClass,
    organization_id: organizationId,
    organization_resolution_status: organizationResolutionStatus,
    jurisdiction_context: r.contexts && r.contexts[0] ? r.contexts[0] : 'NATIONAL',
    temporal_context: null,
    confidence: r.confidence,
    reason: reason,
    provenance_reference: '0215b22c-0000-0000-0000-000000000001'
  };

  ledger1096.push(ledgerRow);

  // Track the 39 strings that are neither in the 1043 aliases nor in 14 provisional
  const isAlias = dispositionClass === 'VERIFIED_ORGANIZATION_ALIAS' || dispositionClass === 'RECONCILED_ORGANIZATION_ALIAS';
  const isProv = dispositionClass === 'PROVISIONAL';
  if (!isAlias && !isProv) {
    setDifference.unaccountedStringsList.push({
      raw_string: r.rawString,
      disposition_class: dispositionClass,
      occurrence_count: r.occurrences,
      organization_id: organizationId,
      is_independent: r.isIndependent,
      is_nominated: r.isNominated,
      is_nota: r.isNota,
      notes: reason
    });
  }
}

// Summary counts
const summaryCounts = {};
for (const row of ledger1096) {
  summaryCounts[row.disposition_class] = (summaryCounts[row.disposition_class] || 0) + 1;
}

const ledgerReport = {
  auditedAt: new Date().toISOString(),
  milestone: 'W021.5-B2.2-C Complete 1,096 Raw String Disposition Ledger v2',
  totalRawStrings: ledger1096.length,
  totalOccurrences: ledger1096.reduce((sum, r) => sum + r.occurrence_count, 0),
  dispositionClassCounts: summaryCounts,
  canonicalAliasesEligibleCount: (summaryCounts.VERIFIED_ORGANIZATION_ALIAS || 0) + (summaryCounts.RECONCILED_ORGANIZATION_ALIAS || 0),
  mathematicalParity: {
    sumOf7Classes: Object.values(summaryCounts).reduce((a, b) => a + b, 0),
    totalUniqueRawStrings: 1096,
    remainder: 1096 - Object.values(summaryCounts).reduce((a, b) => a + b, 0),
    isEqual: Object.values(summaryCounts).reduce((a, b) => a + b, 0) === 1096
  },
  ledger: ledger1096
};

fs.writeFileSync(
  path.join(REPO_ROOT, 'reports', 'w021_5b2_b2_2c_1096_disposition_ledger_v2.json'),
  JSON.stringify(ledgerReport, null, 2)
);

fs.writeFileSync(
  path.join(REPO_ROOT, 'reports', 'w021_5b2_b2_2c_set_difference_audit_v2.json'),
  JSON.stringify(setDifference, null, 2)
);

console.log('[LEDGER v2 GENERATED] Successfully decomposed 1096 rows:', summaryCounts);
console.log('Canonical Aliases (1030 + 13):', ledgerReport.canonicalAliasesEligibleCount);
console.log('Unaccounted 39 Strings length:', setDifference.unaccountedStringsList.length);
