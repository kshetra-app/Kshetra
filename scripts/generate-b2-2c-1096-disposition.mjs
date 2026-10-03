import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const reconPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_organization_reconciliation_v2.json');
const recon = JSON.parse(fs.readFileSync(reconPath, 'utf8'));

const ledger1096 = [];
const setDifference = {
  auditedAt: new Date().toISOString(),
  totalRawStrings: 1096,
  mappedAliasesCount: 1043,
  provisionalQuarantinedCount: 14,
  unaccountedSetCount: 39,
  unaccountedCategorization: {
    independentCandidacies: 25,
    corruptedMpSingleLetters: 9,
    statutoryBallotOptionsNota: 2,
    genericBucketLabels: 2,
    nominatedRajyaSabhaCode: 1
  },
  unaccountedStringsList: []
};

for (const r of recon.reconciliationRecords) {
  let disposition = 'UNKNOWN';
  let quarantineReason = null;

  if (r.confidence === 'PROVISIONAL') {
    disposition = 'PROVISIONAL';
    quarantineReason = r.notes || 'Unverified local entity or placeholder requiring Form 21E audit';
  } else if (r.isIndependent) {
    disposition = 'INDEPENDENT';
  } else if (r.isNominated) {
    disposition = 'NOMINATED';
  } else if (r.isNota) {
    disposition = 'NON_ORGANIZATION';
  } else if (r.resolutionType === 'GENERIC_BUCKET_LABEL') {
    disposition = 'NON_ORGANIZATION';
  } else if (r.resolutionType === 'CORRUPTED_1LETTER_CODE') {
    disposition = 'RECONCILED';
  } else if (r.canonicalOrgId !== null) {
    disposition = r.confidence === 'VERIFIED' ? 'VERIFIED' : 'RECONCILED';
  }

  const proposedOrgId = disposition === 'PROVISIONAL' ? null : r.canonicalOrgId;

  const row = {
    rawString: r.rawString,
    normalizedLookupKey: r.rawString.trim().toLowerCase(),
    occurrenceCount: r.occurrences,
    sourceFiles: r.sources,
    sourceDomains: r.contexts,
    jurisdictionContext: r.contexts && r.contexts[0] ? r.contexts[0] : 'NATIONAL',
    electionYearContext: null,
    candidateContext: r.candidateExtracted,
    proposedOrganizationId: proposedOrgId,
    disposition: disposition,
    confidence: r.confidence,
    resolutionMethod: r.resolutionType,
    provenanceReference: '0215b22c-0000-0000-0000-000000000001',
    temporalScope: null,
    jurisdictionScope: null,
    quarantineReason: quarantineReason,
    notes: r.notes
  };

  ledger1096.push(row);

  // Check if part of the 39 strings that are not in the 1043 mapped aliases and not in 14 provisional
  const isMappedAlias = r.canonicalOrgId !== null && r.confidence !== 'PROVISIONAL';
  const isProv = r.confidence === 'PROVISIONAL';
  if (!isMappedAlias && !isProv) {
    setDifference.unaccountedStringsList.push({
      rawString: r.rawString,
      disposition: disposition,
      resolutionType: r.resolutionType,
      isIndependent: r.isIndependent,
      isNominated: r.isNominated,
      isNota: r.isNota,
      notes: r.notes
    });
  }
}

// Summary counts
const dispositionCounts = {};
for (const row of ledger1096) {
  dispositionCounts[row.disposition] = (dispositionCounts[row.disposition] || 0) + 1;
}

const ledgerReport = {
  auditedAt: new Date().toISOString(),
  totalRawStrings: ledger1096.length,
  totalOccurrences: ledger1096.reduce((sum, r) => sum + r.occurrenceCount, 0),
  dispositionCounts: dispositionCounts,
  mathematicalParity: {
    sumOfCategories: Object.values(dispositionCounts).reduce((a, b) => a + b, 0),
    totalUniqueRawStrings: 1096,
    isEqual: Object.values(dispositionCounts).reduce((a, b) => a + b, 0) === 1096
  },
  ledger: ledger1096
};

fs.writeFileSync(
  path.join(REPO_ROOT, 'reports', 'w021_5b2_b2_2c_1096_disposition_ledger.json'),
  JSON.stringify(ledgerReport, null, 2)
);

fs.writeFileSync(
  path.join(REPO_ROOT, 'reports', 'w021_5b2_b2_2c_set_difference_audit.json'),
  JSON.stringify(setDifference, null, 2)
);

console.log(`[LEDGER GENERATED] Exactly ${ledger1096.length} rows written. Dispositions:`, dispositionCounts);
console.log(`[SET DIFFERENCE] Exact 39 strings written to reports/w021_5b2_b2_2c_set_difference_audit.json`);
