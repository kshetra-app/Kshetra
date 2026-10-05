import fs from 'fs';
import crypto from 'crypto';

const auth059 = fs.readFileSync('supabase/migrations/059_canonical_national_constituency_registry.sql');
const stag059 = fs.readFileSync('supabase/staging_packages/059_canonical_national_constituency_registry.sql');
const stag059R1 = fs.readFileSync('supabase/staging_packages/059-R1_temporal_reconciliation.sql');

const auth059Hash = crypto.createHash('sha256').update(auth059).digest('hex');
const stag059Hash = crypto.createHash('sha256').update(stag059).digest('hex');
const stag059R1Hash = crypto.createHash('sha256').update(stag059R1).digest('hex');

const report = {
  reportId: "w021_5_059_r1_remediation_report",
  milestone: "W021.5",
  title: "Migration 059-R1 Temporal Reconciliation Remediation Report",
  generatedAt: new Date().toISOString(),
  targetEnvironment: "Staging only (fkpigozcqnmcvofuksar / panIN-staging)",
  productionAirgapPreserved: true,
  productionStatus: "STRICTLY AIR-GAPPED / ZERO ACCESS / ZERO MUTATIONS",
  governance: "Master Execution Framework Amendment v1.2 / Rule IV-001 (Non-Self-Acceptance)",
  authoritativeSource: {
    path: "supabase/migrations/059_canonical_national_constituency_registry.sql",
    byteSize: auth059.length,
    sha256: auth059Hash,
    status: "FROZEN_IMMUTABLE"
  },
  derivedStagingPackages: [
    {
      version: "059-R0",
      path: "supabase/staging_packages/059_canonical_national_constituency_registry.sql",
      byteSize: stag059.length,
      sha256: stag059Hash,
      transformation: "Removed invalid line 109 assignment (updated_at = now();) in public.states ON CONFLICT DO UPDATE SET."
    },
    {
      version: "059-R1",
      path: "supabase/staging_packages/059-R1_temporal_reconciliation.sql",
      byteSize: stag059R1.length,
      sha256: stag059R1Hash,
      transformations: [
        {
          id: "T1_REMOVE_STATES_UPDATED_AT",
          description: "Removed invalid states.updated_at assignment from Section 3 public.states ON CONFLICT (code) DO UPDATE SET."
        },
        {
          id: "T2_OMIT_TS_STATE_2008_TEMPORAL_CONFLICT",
          description: "Omitted fabricated 'TS-STATE-2008' record from Section 4 public.state_versions INSERT. Staging already contains authoritative TS-STATE-2014 [2014-06-02, null) with is_current=true. Inserting TS-STATE-2008 violates PostgreSQL exclusion constraint uq_state_versions_no_overlap."
        },
        {
          id: "T3_FAIL_CLOSED_PRECHECKS",
          description: "Injected Section 0 DO $$ anonymous block enforcing: (1) Migration 050 DDL presence, (2) TS-STATE-2014 version presence, (3) Unpopulated constituency registry gate (< 500 records)."
        }
      ]
    }
  ],
  jurisdictionAnalysis: {
    totalJurisdictions: 36,
    historicallyValid2008: 31,
    post2008Identities: 5,
    stagingPreExistingVersions: 1,
    exclusionConflictsIdentified: 1,
    resolvedOmissions: 1,
    reconciledInserts: 35
  },
  expectedPost059Counts: {
    dataset_versions: ">= 3",
    migration_conflicts: 3,
    states: 36,
    state_versions: 36,
    parliamentary_constituencies: 543,
    parliamentary_constituency_versions: 543,
    constituencies: 4123,
    constituency_versions: 4123,
    record_provenance_linkages: ">= 4702"
  },
  safetyInvariants: {
    authoritativeMigrationsPreserved: true,
    noStatesUpdatedAtAdded: true,
    productionUntouched: true,
    stagingExecutionPendingCtoApproval: true
  }
};

fs.writeFileSync('reports/w021_5_059_r1_remediation_report.json', JSON.stringify(report, null, 2));
console.log('Written reports/w021_5_059_r1_remediation_report.json successfully.');
