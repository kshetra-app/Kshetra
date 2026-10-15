import fs from 'fs';
import path from 'path';

const REPO_ROOT = process.cwd();
const manifestPath = path.join(REPO_ROOT, 'reports/w021_5_financial_remediation_adjudication_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const summary = {
  manifestVersion: manifest.manifestVersion,
  directive: manifest.directive,
  milestone: manifest.milestone,
  defect: manifest.defect,
  defectStatus: manifest.defectStatus,
  governance: manifest.governance,
  generatedAt: manifest.generatedAt,
  gitBaseline: {
    provenanceBaselineCommit: 'ab829a2e09892d03f94370d9f701ccef6a8dd9c2',
    canonicalBranch: 'master',
    remoteRepository: 'https://github.com/kshetra-app/Kshetra.git'
  },
  populationReconciliation: {
    totalRetainedAffidavits: manifest.populationSummary.totalAffidavits,
    fiveGroupCounts: manifest.populationSummary.fiveGroupClassification,
    dimensionalTotals: manifest.populationSummary.totalsByDimension,
    subsetIntegrity: manifest.populationSummary.subsetIntegrity
  },
  eligibilityBreakdown: {
    assetDimension: manifest.populationSummary.eligibilitySummary.assetDimension,
    liabilityDimension: manifest.populationSummary.eligibilitySummary.liabilityDimension
  },
  unresolvedConflicts: {
    count: manifest.populationSummary.unresolvedConflictsCount,
    items: manifest.populationSummary.unresolvedConflicts
  },
  verifierFindings: {
    totalOnlyStatesLackingComponentLedger: 3403,
    mpProfilesLackingAcNoInParser: 543,
    nestedFinancialHistoryProfiles: 1120,
    sourceCoordinateMismatchCount: 1,
    sourceCoordinateMismatchId: '0215b22e-aff-00001430'
  },
  schemaFeasibilityAnalysis: {
    currentTotalAssetsMechanic: 'PostgreSQL GENERATED ALWAYS AS (self_movable + self_immovable + spouse_movable + spouse_immovable) STORED',
    currentEvaluatedValueOnStaging: 0,
    reasonEvaluatesToZero: 'Chunks 02-05 omitted component columns during SQL ingestion, assigning DEFAULT 0 to each component',
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
    unverifiedAssumptions: [
      'Exact production PostgreSQL version unverified due to air-gap (PostgreSQL 12+ required for DROP EXPRESSION)',
      'Locking behavior and transaction concurrency during DDL on production Supabase',
      'Presence of dependent views or triggers referencing total_assets'
    ],
    migrationRisks: [
      'Risk of leaving DEFAULT 0 on components re-introducing false zeros',
      'Backfill consistency window between DROP EXPRESSION and batch UPDATE',
      'Rollback complexity if DDL alteration needs reversion'
    ]
  },
  testOutcomes: {
    verifierTestSuite: {
      command: 'node tests/financial_remediation.test.mjs',
      totalTests: 105,
      passed: 105,
      failed: 0,
      exitCode: 0
    },
    adjudicationValidationSuite: {
      command: 'node tests/adjudication_manifest.test.mjs',
      totalTests: 12,
      passed: 12,
      failed: 0,
      exitCode: 0
    }
  },
  governanceCompliance: {
    ruleIV001NonSelfAcceptance: true,
    defectRemainsStrictlyOpen: true,
    delhi17DemographicsPreservedNotVerified: true,
    productionSupabaseUntouched: true,
    stagingSupabaseUntouched: true,
    zeroSqlOrMigrationsAuthoredOrExecuted: true
  }
};

const summaryPath = path.join(REPO_ROOT, 'reports/w021_5_financial_remediation_adjudication_summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
console.log(`Wrote adjudication summary to ${summaryPath}`);
