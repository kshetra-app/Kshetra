/**
 * scripts/lib/stagingExecutionPlan.mjs
 *
 * Canonical Execution Plan & Deterministic SHA-256 Digest Engine
 * Authority: CTO Directive 143 Section 4.1 / Master Execution Framework Amendment v1.6
 *
 * Requirements:
 * 1. Computes a deterministic execution plan representing the exact staging data operation.
 * 2. Binds directive, target project reference, permitted criteria, tables, operations,
 *    source file identities, source content hashes (SHA-256), transformation versions,
 *    canonical row counts, conflict targets, and stage sequencing/recovery policies.
 * 3. Canonicalizes the representation via recursive key sorting and compact JSON formatting.
 * 4. Produces a 64-character lowercase hexadecimal SHA-256 digest.
 * 5. Fails closed if any source artifact is missing, unreadable, or modified.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

export const CANONICAL_DIRECTIVE = 'CTO Directive 143 / W021.5';
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
 */
export function generateCanonicalExecutionPlan(options = {}) {
  const root = options.repoRoot || REPO_ROOT;

  // Source files for Stage 1
  const stage1MigrationPath = path.join(root, 'supabase', 'migrations', '065_canonical_political_organization_registry.sql');
  const stage1Hash = hashFileSha256(stage1MigrationPath);

  // Source files for Stage 2 (Manifest + 10 subchunk files + 36 duplicates file)
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

  // Source files for Stage 3 (Inventory + Manifest)
  const inventoryPath = path.join(root, 'reports', 'w021_5_constituent_inventory_4123.json');
  const demManifestPath = path.join(root, 'reports', 'w021_5b2_b2_2e_demographics_manifest.json');
  const inventoryHash = hashFileSha256(inventoryPath);
  const demManifestHash = hashFileSha256(demManifestPath);

  // Source files for Stage 4 (Coverage Matrix)
  const coverageMatrixPath = path.join(root, 'reports', 'w021_5_national_data_coverage_matrix.json');
  const coverageMatrixHash = hashFileSha256(coverageMatrixPath);

  const plan = {
    directive: CANONICAL_DIRECTIVE,
    targetProjectRef: options.targetProjectRef || CANONICAL_STAGING_PROJECT_REF,
    governingAuthority: 'Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance',
    permittedCriteria: ['CRIT-C02-02', 'CRIT-D02-02', 'CRIT-E01-02', 'CRIT-F02-03'],
    stages: {
      stage1_political_organizations: {
        criterionId: 'CRIT-C02-02',
        taskId: 'W021.5-C-02',
        transformationVersion: 'v1.0.0-canonical-political-orgs',
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
          'public.datasets': 1,
          'public.dataset_versions': 1,
          'public.provenance_records': 1,
          'public.political_organizations': 107,
          'public.organization_relationships': 10,
          'public.organization_multilingual_names': 27,
          'public.organization_symbols': 19,
          'public.organization_aliases': 1043,
          totalRows: 1209
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
        transformationVersion: 'v1.0.0-demographics-statutory-baseline',
        targetTables: ['public.constituency_demographics'],
        operations: ['UPSERT'],
        conflictTargets: {
          'public.constituency_demographics': 'constituency_id,election_year'
        },
        expectedRecordCounts: {
          statutoryAssemblySeats: 4123,
          manifestRecordsReconciled: 4142,
          openDataQualityGaps: 1 // DQ-W021.5-B2.2E-001 (5 Mizoram seats)
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
        transformationVersion: 'v1.0.0-historical-election-results-null-safe',
        targetTables: ['public.election_results'],
        operations: ['UPSERT'],
        conflictTargets: {
          'public.election_results': 'election_id,constituency_id'
        },
        expectedRecordCounts: {
          totalStatesCovered: 23,
          totalAssemblySeats: 2243,
          statutorySeatsJammuKashmir2014: 87
        },
        sourceArtifacts: [
          {
            path: 'reports/w021_5_national_data_coverage_matrix.json',
            sha256: coverageMatrixHash
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
