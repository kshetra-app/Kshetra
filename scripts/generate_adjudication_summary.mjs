import fs from 'fs';
import path from 'path';
import { validateSummaryReconciliation } from './adjudication_validators.mjs';

const REPO_ROOT = process.cwd();
const manifestPath = path.join(REPO_ROOT, 'reports/w021_5_financial_remediation_adjudication_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Recompute row-level counts and sample IDs
const recomputedGroupCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
const recomputedAssetCounts = { ELIGIBLE: 0, INELIGIBLE: 0, REQUIRES_REVIEW: 0 };
const recomputedLiabilityCounts = { ELIGIBLE: 0, INELIGIBLE: 0, REQUIRES_REVIEW: 0 };

const assetRejectionMap = {};
const liabilityRejectionMap = {};

const assetRequiresReviewIdsByReason = {};
const liabilityRequiresReviewIdsByReason = {};

for (const aff of manifest.affidavits) {
  recomputedGroupCounts[aff.group]++;
  
  // Asset
  const assetElig = aff.dimensions.asset.eligibility;
  recomputedAssetCounts[assetElig]++;
  if (assetElig === 'REQUIRES_REVIEW') {
    const reasonKey = (aff.dimensions.asset.verifierRejectionReason || 'UNKNOWN').split(':')[0].trim();
    assetRejectionMap[reasonKey] = (assetRejectionMap[reasonKey] || 0) + 1;
    if (!assetRequiresReviewIdsByReason[reasonKey]) {
      assetRequiresReviewIdsByReason[reasonKey] = [];
    }
    assetRequiresReviewIdsByReason[reasonKey].push(aff.affidavitId);
  }
  
  // Liability
  const liabElig = aff.dimensions.liability.eligibility;
  recomputedLiabilityCounts[liabElig]++;
  if (liabElig === 'REQUIRES_REVIEW') {
    const reasonKey = (aff.dimensions.liability.verifierRejectionReason || 'UNKNOWN').split(':')[0].trim();
    liabilityRejectionMap[reasonKey] = (liabilityRejectionMap[reasonKey] || 0) + 1;
    if (!liabilityRequiresReviewIdsByReason[reasonKey]) {
      liabilityRequiresReviewIdsByReason[reasonKey] = [];
    }
    liabilityRequiresReviewIdsByReason[reasonKey].push(aff.affidavitId);
  }
}

const summary = {
  manifestVersion: manifest.manifestVersion,
  directive: 'W021.5-CTO-DIRECTIVE-073',
  milestone: manifest.milestone,
  defect: manifest.defect,
  defectStatus: manifest.defectStatus,
  governance: manifest.governance,
  generatedAt: new Date().toISOString(),
  gitBaseline: {
    directive072BaselineCommit: 'fc9992fa1aeb328bab7c414eb9d352aa406e23bb',
    canonicalBranch: 'master',
    remoteRepository: 'https://github.com/kshetra-app/Kshetra.git'
  },
  populationReconciliation: {
    totalRetainedAffidavits: manifest.populationSummary.totalAffidavits,
    fiveGroupCounts: {
      group1_positiveAssets_positiveLiabilities: recomputedGroupCounts[1],
      group2_positiveAssets_zeroLiabilities: recomputedGroupCounts[2],
      group3_positiveAssets_missingLiabilities: recomputedGroupCounts[3],
      group4_missingAssets_missingLiabilities: recomputedGroupCounts[4],
      group5_zeroAssets_zeroLiabilities: recomputedGroupCounts[5],
      total: recomputedGroupCounts[1] + recomputedGroupCounts[2] + recomputedGroupCounts[3] + recomputedGroupCounts[4] + recomputedGroupCounts[5]
    },
    dimensionalTotals: manifest.populationSummary.totalsByDimension,
    subsetIntegrity: manifest.populationSummary.subsetIntegrity
  },
  eligibilityBreakdown: {
    assetDimension: {
      totalEvaluations: manifest.affidavits.length,
      eligibleCount: recomputedAssetCounts.ELIGIBLE,
      ineligibleCount: recomputedAssetCounts.INELIGIBLE,
      requiresReviewCount: recomputedAssetCounts.REQUIRES_REVIEW,
      verifierRejectionBreakdown: assetRejectionMap
    },
    liabilityDimension: {
      totalEvaluations: manifest.affidavits.length,
      eligibleCount: recomputedLiabilityCounts.ELIGIBLE,
      ineligibleCount: recomputedLiabilityCounts.INELIGIBLE,
      requiresReviewCount: recomputedLiabilityCounts.REQUIRES_REVIEW,
      verifierRejectionBreakdown: liabilityRejectionMap
    }
  },
  requiresReviewClassification: {
    assetDimension: {
      missingLedgerEntryCount: (assetRequiresReviewIdsByReason['MISSING_LEDGER_ENTRY'] || []).length,
      sourceValueUnavailableCount: (assetRequiresReviewIdsByReason['SOURCE_VALUE_UNAVAILABLE'] || []).length,
      missingIdentityFieldCount: (assetRequiresReviewIdsByReason['MISSING_REQUIRED_IDENTITY_FIELD'] || []).length,
      unresolvedSourceConflictCount: (assetRequiresReviewIdsByReason['UNRESOLVED_SOURCE_CONFLICT'] || []).length,
      totalRequiresReview: recomputedAssetCounts.REQUIRES_REVIEW,
      sampleIdsByReason: {
        MISSING_LEDGER_ENTRY: (assetRequiresReviewIdsByReason['MISSING_LEDGER_ENTRY'] || []).slice(0, 5),
        SOURCE_VALUE_UNAVAILABLE: (assetRequiresReviewIdsByReason['SOURCE_VALUE_UNAVAILABLE'] || []).slice(0, 5),
        MISSING_REQUIRED_IDENTITY_FIELD: (assetRequiresReviewIdsByReason['MISSING_REQUIRED_IDENTITY_FIELD'] || []).slice(0, 5),
        UNRESOLVED_SOURCE_CONFLICT: assetRequiresReviewIdsByReason['UNRESOLVED_SOURCE_CONFLICT'] || []
      }
    },
    liabilityDimension: {
      missingLedgerEntryCount: (liabilityRequiresReviewIdsByReason['MISSING_LEDGER_ENTRY'] || []).length,
      missingIdentityFieldCount: (liabilityRequiresReviewIdsByReason['MISSING_REQUIRED_IDENTITY_FIELD'] || []).length,
      totalRequiresReview: recomputedLiabilityCounts.REQUIRES_REVIEW,
      sampleIdsByReason: {
        MISSING_LEDGER_ENTRY: (liabilityRequiresReviewIdsByReason['MISSING_LEDGER_ENTRY'] || []).slice(0, 5),
        MISSING_REQUIRED_IDENTITY_FIELD: (liabilityRequiresReviewIdsByReason['MISSING_REQUIRED_IDENTITY_FIELD'] || []).slice(0, 5)
      }
    }
  },
  unresolvedConflicts: {
    count: manifest.populationSummary.unresolvedConflictsCount,
    items: manifest.populationSummary.unresolvedConflicts
  },
  schemaFeasibilityAnalysis: {
    status: 'DESIGN_PROPOSAL_ONLY — NON_OPERATIONAL',
    currentTotalAssetsMechanic: 'PostgreSQL GENERATED ALWAYS AS (self_movable + self_immovable + spouse_movable + spouse_immovable) STORED',
    schemaDerivedExpectedAssetValue: 0,
    evidenceBasis: 'SCHEMA_DERIVED_EXPECTATION',
    evidenceBasisDetails: 'Chunks 02-05 omitted component columns during SQL ingestion, assigning DEFAULT 0 to each component (0+0+0+0=0). Offline expectation only; live database was not queried.',
    liveDatabaseObservationsObtained: false,
    limitationOfGeneratedColumn: 'Cannot represent source-backed positive totals when component breakdown is unavailable (evaluates to NULL or false 0)',
    proposedSchemaChange: 'ALTER TABLE candidate_affidavits ALTER COLUMN total_assets DROP EXPRESSION IF EXISTS (Method A DDL Normalization)',
    statesSupportedAfterConversion: [
      'Disclosed positive total with no authoritative component breakdown (total stored, components NULL)',
      'Undisclosed total (total NULL, components NULL)',
      'Genuine zero total (total 0, components 0)',
      'Positive total with partial breakdown (total stored, disclosed components stored, absent components NULL)',
      'Positive total with complete breakdown (total stored, all 4 components stored)'
    ],
    zeroVsMissingSegregationPreserved: true,
    unverifiedAssumptionsDueToAirGap: [
      'Exact production PostgreSQL version unverified due to air-gap (PostgreSQL 12+ required for DROP EXPRESSION)',
      'Locking behavior and transaction concurrency during DDL on production Supabase',
      'Presence of dependent views or triggers referencing total_assets in pg_catalog'
    ],
    migrationRisks: [
      'Risk of leaving DEFAULT 0 on components re-introducing false zeros',
      'Backfill consistency window between DROP EXPRESSION and batch UPDATE',
      'Rollback complexity if DDL alteration needs reversion'
    ]
  },
  governanceCompliance: {
    ruleIV001NonSelfAcceptance: true,
    defectRemainsStrictlyOpen: true,
    acceptanceAuthority: 'CTO only',
    delhi17DemographicsPreservedNotVerified: true,
    productionSupabaseUntouched: true,
    stagingSupabaseUntouched: true,
    zeroSqlOrMigrationsAuthoredOrExecuted: true,
    liveDatabaseObservationsObtained: false
  }
};

// Validate summary reconciliation against manifest using production validator
validateSummaryReconciliation(manifest, summary);

const summaryPath = path.join(REPO_ROOT, 'reports/w021_5_financial_remediation_adjudication_summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
console.log(`Wrote Directive 073 adjudication summary to ${summaryPath}`);
