/**
 * scripts/lib/stagingExecutionPlan.mjs
 *
 * Canonical Execution Plan & Deterministic SHA-256 Digest Engine
 * Authority: CTO Directive 143 Section 4.1 / CTO Directive 144 Workstream A Item 3 / Master Execution Framework Amendment v1.6
 *
 * Requirements:
 * 1. Computes a deterministic execution plan representing the exact staging data operation.
 * 2. Binds directive, target project reference, permitted criteria, tables, operations,
 *    all source data artifacts, manifests, chunk files, transformation code files,
 *    historical seed sources, schema migrations, verified conflict-key definitions,
 *    canonical row counts, and stage sequencing/recovery policies.
 * 3. Proves that changing any source artifact, transformation code, or schema migration changes the digest.
 * 4. Canonicalizes the representation via recursive key sorting and compact JSON formatting.
 * 5. Produces a 64-character lowercase hexadecimal SHA-256 digest.
 * 6. Fails closed if any source artifact or transformation code file is missing, unreadable, or modified.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

export const CANONICAL_DIRECTIVE = 'CTO Directive 145 / W021.5';
export const CANONICAL_STAGING_PROJECT_REF = 'fkpigozcqnmcvofuksar';

/**
 * Deterministically sorts an object's keys recursively
 */
export function canonicalizeObject(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(canonicalizeObject);
  }
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const k of keys) {
    sorted[k] = canonicalizeObject(obj[k]);
  }
  return sorted;
}

/**
 * Computes SHA-256 hash of a file on disk
 */
export function hashFileSha256(filePath) {
  if (!fs.existsSync(filePath)) {
    const err = new Error(`SOURCE_FILE_MISSING: Cannot compute plan digest; source file does not exist: ${filePath}`);
    err.code = 'SOURCE_FILE_MISSING';
    throw err;
  }
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Generates the full canonical execution plan object for W021.5 Staging Execution
 * Under Directive 145 requirement 4: covers execution boundary artifacts, transformation code,
 * schema migrations, source artifacts, conflict targets, and recovery policy.
 */
export function generateCanonicalExecutionPlan(options = {}) {
  const root = options.repoRoot || REPO_ROOT;

  // 1. Operational Execution Boundary Artifacts (Directive 145 Item 4)
  const executionBoundaryFiles = [
    'scripts/execute_staging_directive_139.mjs',
    'scripts/lib/stagingAuthorization.mjs',
    'scripts/lib/stagingAdminContainment.mjs',
    'scripts/lib/stagingReplayStore.mjs',
    'scripts/lib/stagingExecutionPlan.mjs',
    'scripts/lib/stagingSchemaPreflight.mjs'
  ];
  const executionBoundaryHashes = {};
  for (const relPath of executionBoundaryFiles) {
    const fullPath = path.join(root, relPath);
    executionBoundaryHashes[relPath] = hashFileSha256(fullPath);
  }

  // 2. Transformation Code Artifacts (Directive 145 Item 4)
  const transformationCodeFiles = [
    'scripts/reconcile_database_criteria_identities.mjs',
    'scripts/generate_national_data_coverage_matrix.mjs',
    'scripts/build_all_23_historical_results.mjs'
  ];
  const transformationHashes = {};
  for (const relPath of transformationCodeFiles) {
    const fullPath = path.join(root, relPath);
    transformationHashes[relPath] = hashFileSha256(fullPath);
  }

  // 3. Schema Migration Artifacts & Constraint Definitions (Directive 145 Item 4)
  const schemaMigrationFiles = [
    'supabase/migrations/001_initial_schema.sql',
    'supabase/migrations/040_canonical_geography_model.sql',
    'supabase/migrations/050_political_entity_model.sql',
    'supabase/migrations/051_election_data_normalization.sql',
    'supabase/migrations/059_canonical_national_constituency_registry.sql',
    'supabase/migrations/064_political_organization_governance_remediation.sql',
    'supabase/migrations/065_canonical_political_organization_registry.sql',
    'supabase/migrations/066_downstream_civic_extensions.sql'
  ];
  const schemaMigrationHashes = {};
  for (const relPath of schemaMigrationFiles) {
    const fullPath = path.join(root, relPath);
    schemaMigrationHashes[relPath] = hashFileSha256(fullPath);
  }

  // 4. Source files for Stage 1 (Migration 065)
  const stage1MigrationPath = path.join(root, 'supabase', 'migrations', '065_canonical_political_organization_registry.sql');
  const stage1Hash = hashFileSha256(stage1MigrationPath);

  // 5. Source files for Stage 2 (Manifest + 10 subchunk files + 36 duplicates file)
  const subchunksManifestPath = path.join(root, 'reports', 'w021_5_b2_2d_candidacy_subchunks_manifest.json');
  const duplicatesReportPath = path.join(root, 'reports', 'w021_5_b2_2d_36_candidacy_duplicates.json');
  const subchunksManifestHash = hashFileSha256(subchunksManifestPath);
  const duplicatesReportHash = hashFileSha256(duplicatesReportPath);

  const subchunksManifest = JSON.parse(fs.readFileSync(subchunksManifestPath, 'utf8'));
  const chunksDir = path.join(root, 'supabase', 'staging_packages', '065_b2_2d_chunked');
  const subchunkHashes = {};
  for (const chunk of subchunksManifest) {
    const chunkPath = path.join(chunksDir, chunk.subchunkFile);
    subchunkHashes[chunk.subId] = {
      file: chunk.subchunkFile,
      sha256: hashFileSha256(chunkPath),
      expectedTuples: chunk.tuples
    };
  }

  // 6. Source files for Stage 3 (Inventory + Manifest)
  const inventoryPath = path.join(root, 'reports', 'w021_5_constituent_inventory_4123.json');
  const demManifestPath = path.join(root, 'reports', 'w021_5b2_b2_2e_demographics_manifest.json');
  const inventoryHash = hashFileSha256(inventoryPath);
  const demManifestHash = hashFileSha256(demManifestPath);

  // 7. Source files for Stage 4 (Coverage Matrix + 31 Historical Seed Files)
  const coverageMatrixPath = path.join(root, 'reports', 'w021_5_national_data_coverage_matrix.json');
  const coverageMatrixHash = hashFileSha256(coverageMatrixPath);

  const historicalSeedFiles = [
    'data/seed/andhra-pradesh-historical-results.ts',
    'data/seed/arunachal-pradesh-historical-results.ts',
    'data/seed/assam-historical-results.ts',
    'data/seed/bihar-historical-results.ts',
    'data/seed/chhattisgarh-historical-results.ts',
    'data/seed/delhi-historical-results.ts',
    'data/seed/goa-historical-results.ts',
    'data/seed/gujarat-historical-results.ts',
    'data/seed/haryana-historical-results.ts',
    'data/seed/himachal-pradesh-historical-results.ts',
    'data/seed/jammu-kashmir-historical-results.ts',
    'data/seed/jharkhand-historical-results.ts',
    'data/seed/karnataka-historical-results.ts',
    'data/seed/kerala-historical-results.ts',
    'data/seed/madhya-pradesh-historical-results.ts',
    'data/seed/maharashtra-historical-results.ts',
    'data/seed/manipur-historical-results.ts',
    'data/seed/meghalaya-historical-results.ts',
    'data/seed/mizoram-historical-results.ts',
    'data/seed/nagaland-historical-results.ts',
    'data/seed/odisha-historical-results.ts',
    'data/seed/puducherry-historical-results.ts',
    'data/seed/punjab-historical-results.ts',
    'data/seed/rajasthan-historical-results.ts',
    'data/seed/sikkim-historical-results.ts',
    'data/seed/tamil-nadu-historical-results.ts',
    'data/seed/telangana-historical-results.ts',
    'data/seed/tripura-historical-results.ts',
    'data/seed/uttar-pradesh-historical-results.ts',
    'data/seed/uttarakhand-historical-results.ts',
    'data/seed/west-bengal-historical-results.ts'
  ];
  const historicalSeedHashes = {};
  for (const relPath of historicalSeedFiles) {
    const fullPath = path.join(root, relPath);
    historicalSeedHashes[relPath] = hashFileSha256(fullPath);
  }

  const plan = {
    directive: CANONICAL_DIRECTIVE,
    targetProjectRef: options.targetProjectRef || CANONICAL_STAGING_PROJECT_REF,
    governingAuthority: 'Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance',
    permittedCriteria: ['CRIT-C02-02', 'CRIT-D02-02', 'CRIT-E01-02', 'CRIT-F02-03'],
    executionBoundaryIntegrity: {
      files: executionBoundaryHashes
    },
    transformationIntegrity: {
      engine: 'scripts/reconcile_database_criteria_identities.mjs',
      fileHashes: transformationHashes
    },
    schemaIntegrity: {
      migrationHashes: schemaMigrationHashes,
      verifiedConflictKeys: {
        'public.datasets': 'id',
        'public.dataset_versions': 'id',
        'public.provenance_records': 'id',
        'public.political_organizations': 'id',
        'public.organization_relationships': 'id',
        'public.organization_multilingual_names': 'id',
        'public.organization_symbols': 'id',
        'public.organization_aliases': 'id',
        'public.candidacies': 'person_id,election_year,election_type,constituency_id',
        'public.constituency_demographics': 'constituency_id,election_year',
        'public.election_results': 'election_id,constituency_id'
      }
    },
    stages: {
      stage1_political_organizations: {
        criterionId: 'CRIT-C02-02',
        taskId: 'W021.5-C-02',
        deploymentStatus: 'PREPARED_AND_RECONCILED_IN_REPOSITORY',
        transformationVersion: 'v1.2.0-rfc4122-uuidv5',
        targetTables: [
          'public.datasets',
          'public.dataset_versions',
          'public.provenance_records',
          'public.political_organizations',
          'public.organization_relationships',
          'public.organization_multilingual_names',
          'public.organization_symbols',
          'public.organization_aliases'
        ],
        operations: ['UPSERT'],
        conflictTargets: {
          'public.datasets': 'id',
          'public.dataset_versions': 'id',
          'public.provenance_records': 'id',
          'public.political_organizations': 'id',
          'public.organization_relationships': 'id',
          'public.organization_multilingual_names': 'id',
          'public.organization_symbols': 'id',
          'public.organization_aliases': 'id'
        },
        expectedRecordCounts: {
          catalogProvenanceSupportRows: 1207,
          datasetMetadataAnchorRows: 2,
          totalRowsAcrossTables: 1209,
          byTable: {
            'public.datasets': 1,
            'public.dataset_versions': 1,
            'public.provenance_records': 1,
            'public.political_organizations': 107,
            'public.organization_relationships': 10,
            'public.organization_multilingual_names': 27,
            'public.organization_symbols': 19,
            'public.organization_aliases': 1043
          }
        },
        sourceArtifacts: [
          {
            path: 'supabase/migrations/065_canonical_political_organization_registry.sql',
            sha256: stage1Hash
          }
        ]
      },
      stage2_candidacies: {
        criterionId: 'CRIT-D02-02',
        taskId: 'W021.5-D-02',
        deploymentStatus: 'PREPARED_AND_RECONCILED_IN_REPOSITORY',
        transformationVersion: 'v1.0.0-candidacy-dedup',
        targetTables: ['public.candidacies'],
        operations: ['UPSERT'],
        conflictTargets: {
          'public.candidacies': 'person_id,election_year,election_type,constituency_id'
        },
        expectedRecordCounts: {
          totalSourceTuples: 11334,
          accountedDuplicates: 36,
          uniqueRowsToUpsert: 11298
        },
        sourceArtifacts: [
          {
            path: 'reports/w021_5_b2_2d_candidacy_subchunks_manifest.json',
            sha256: subchunksManifestHash
          },
          {
            path: 'reports/w021_5_b2_2d_36_candidacy_duplicates.json',
            sha256: duplicatesReportHash
          },
          {
            subchunks: subchunkHashes
          }
        ]
      },
      stage3_constituency_demographics: {
        criterionId: 'CRIT-E01-02',
        taskId: 'W021.5-E-01',
        deploymentStatus: 'BLOCKED_NOT_DEPLOYABLE',
        blockedReason: 'MISSING_CANONICAL_CONSTITUENCY_UUID_CROSSWALK: public.constituency_demographics.constituency_id is a UUID foreign key to public.constituencies(internal_id). Repository contains composite seat strings (e.g. TS-AC-1) but no authoritative repository crosswalk to static internal_id UUIDs.',
        missingCanonicalMappingsCount: 4123,
        missingPrerequisite: 'Authoritative repository crosswalk from statutory constituency identities to public.constituencies(internal_id) UUIDs or migration establishing deterministic UUIDv5 internal_ids for public.constituencies.',
        transformationVersion: 'v1.2.0-demographics-blocked-not-deployable',
        targetTables: ['public.constituency_demographics'],
        operations: ['UPSERT'],
        conflictTargets: {
          'public.constituency_demographics': 'constituency_id,election_year'
        },
        expectedRecordCounts: {
          statutoryAssemblySeats: 4123,
          manifestRecordsReconciled: 4142,
          manifestGapStatutorySeats: 134,
          extraNonStatutoryRecords: 153,
          outboundRowsToStaging: 0, // Blocked from deployment until canonical constituency UUID crosswalk exists
          openDataQualityGaps: 1 // DQ-W021.5-B2.2E-001 (5 Mizoram seats with unrecorded voter counts)
        },
        sourceArtifacts: [
          {
            path: 'reports/w021_5_constituent_inventory_4123.json',
            sha256: inventoryHash
          },
          {
            path: 'reports/w021_5b2_b2_2e_demographics_manifest.json',
            sha256: demManifestHash
          }
        ]
      },
      stage4_historical_election_results: {
        criterionId: 'CRIT-F02-03',
        taskId: 'W021.5-F-02',
        transformationVersion: 'v1.2.0-historical-blocked-not-deployable',
        targetTables: ['public.election_results'],
        operations: ['UPSERT'],
        deploymentStatus: 'BLOCKED_NOT_DEPLOYABLE',
        blockedReason: 'MISSING_CANONICAL_ELECTION_ENTITIES: Canonical election entities are not provisioned in repository for these 23 states. Zero synthetic IDs permitted.',
        missingPrerequisite: 'Provision canonical election UUID entities in repository/database schema.',
        conflictTargets: {
          'public.election_results': 'election_id,constituency_id'
        },
        expectedRecordCounts: {
          totalStatesCovered: 23,
          totalAssemblySeats: 2243,
          statutorySeatsJammuKashmir2014: 87,
          outboundRowsToStaging: 0 // Blocked from deployment until canonical election entities exist
        },
        sourceArtifacts: [
          {
            path: 'reports/w021_5_national_data_coverage_matrix.json',
            sha256: coverageMatrixHash
          },
          {
            historicalSeedSources: historicalSeedHashes
          }
        ]
      }
    },
    recoveryPolicy: {
      executionSequence: 'STRICT_SEQUENTIAL_1_TO_4',
      onStageFailure: 'ABORT_REMAINING_RECORD_PARTIAL_EXECUTION',
      tokenConsumption: 'ATOMIC_ON_EXECUTION_START',
      replayProtection: 'REPLAY_STORE_DURABLE_NONCE_RESERVATION',
      retryPolicy: 'REQUIRES_NEW_AUTHORIZATION_TOKEN_FOR_UNEXECUTED_STAGES'
    }
  };

  return canonicalizeObject(plan);
}

/**
 * Computes the deterministic SHA-256 execution plan digest
 */
export function computeExecutionPlanDigest(options = {}) {
  const plan = generateCanonicalExecutionPlan(options);
  const canonicalString = JSON.stringify(plan);
  return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
}
