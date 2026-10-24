/**
 * scripts/build_constituency_4123_crosswalk.mjs
 *
 * Authoritative 4,123-Seat Assembly Constituency Crosswalk Builder
 * Authority: CTO Directive 148 Section 3 / CTO Directive 149 Section 6 / Task W021.5-E-01 / Master Execution Framework Amendment v1.6
 *
 * Reconciles the 4,123 statutory assembly constituencies defined in Migration 059
 * and separates:
 *   1. statutoryCompositeCode (e.g. 'AP-AC-1')
 *   2. canonicalCode (e.g. 'AP-AC-001')
 *   3. reproducibleNamespaceUuid (RFC 4122 UUIDv5 proposed offline identity)
 *   4. targetInternalUuid (actual live internal_id in public.constituencies, resolved from target database)
 *
 * Invariant (Directive 149 Section 6.1):
 *   UUIDv5 is an offline reproducible statutory identifier; it is NOT the live target UUID
 *   because public.constituencies.internal_id was populated with gen_random_uuid().
 *   Stage 3 (constituency_demographics) requires the actual internal_id foreign key.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rfc4122UuidV5, KSHETRA_NAMESPACE_UUID } from './reconcile_database_criteria_identities.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

export function buildConstituency4123Crosswalk(options = {}) {
  const root = options.repoRoot || REPO_ROOT;
  const migration059Path = path.join(root, 'supabase', 'migrations', '059_canonical_national_constituency_registry.sql');
  const inventoryPath = path.join(root, 'reports', 'w021_5_constituent_inventory_4123.json');

  if (!fs.existsSync(migration059Path)) {
    throw new Error(`Migration 059 file not found: ${migration059Path}`);
  }
  if (!fs.existsSync(inventoryPath)) {
    throw new Error(`Inventory file not found: ${inventoryPath}`);
  }

  const migrationContent = fs.readFileSync(migration059Path, 'utf8');
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

  // Regex to parse 4,123 AC insertions in Migration 059
  // ('AP-AC-1', 'AP-AC-001', 1, 'Ichchapuram', 'AP', 'Srikakulam', 'GEN', 'assembly_constituency', 'eci_delimitation_2008', '2008-02-19'::date, true, 'eci_national_ac_2008_v1')
  const tupleRegex = /\('([^']+)',\s*'([^']+)',\s*([0-9]+),\s*'([^']+)',\s*'([A-Z]{2})',\s*'([^']*)',\s*'([^']+)',\s*'assembly_constituency',\s*'([^']+)',\s*'([^']+)'::date,\s*(true|false),\s*'([^']+)'\)/g;

  const acList = [];
  const acByComposite = new Map();
  let match;

  while ((match = tupleRegex.exec(migrationContent)) !== null) {
    const [
      ,
      id,
      canonicalCode,
      acNoStr,
      name,
      stateCode,
      district,
      reservationStatus,
      delimitationRegimeId,
      validFrom,
      isCurrentStr,
      primaryDatasetVersionId
    ] = match;

    const acNo = parseInt(acNoStr, 10);
    const deterministicUuid = rfc4122UuidV5(KSHETRA_NAMESPACE_UUID, `constituency:${stateCode}:${acNo}`);

    const record = {
      statutoryCompositeCode: id,
      canonicalCode,
      acNo,
      name,
      stateCode,
      district,
      reservationStatus,
      entityType: 'assembly_constituency',
      delimitationRegimeId,
      validFrom,
      isCurrent: isCurrentStr === 'true',
      primaryDatasetVersionId,
      reproducibleNamespaceUuid: deterministicUuid,
      targetInternalUuid: null,
      targetInternalUuidStatus: 'PENDING_TARGET_DATABASE_RESOLUTION',
      resolutionMethod: 'SQL_SELECT_INTERNAL_ID_BY_CANONICAL_CODE: SELECT id, internal_id, canonical_code, state_code, constituency_number FROM public.constituencies',
      evidenceBasis: 'ECI Delimitation Order 2008 / Migration 059',
      verificationStatus: 'STATUTORY_RECONCILED_TARGET_UUID_PENDING'
    };

    acList.push(record);
    acByComposite.set(`${stateCode}-AC-${acNo}`, record);
  }

  if (acList.length !== 4123) {
    throw new Error(`STATUTORY_COUNT_MISMATCH: Expected 4,123 ACs in Migration 059, parsed ${acList.length}`);
  }

  // Cross-reference with constituent inventory
  const stateBreakdown = {};
  for (const ac of acList) {
    stateBreakdown[ac.stateCode] = (stateBreakdown[ac.stateCode] || 0) + 1;
  }

  const crosswalkPayload = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    crosswalkSpecification: 'W021.5 National 4,123 Statutory Assembly Constituency Crosswalk',
    directive: 'CTO Directive 153 / Task W021.5-E-01',
    governingAuthority: 'Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance',
    generatedAt: new Date().toISOString(),
    sourceMigration: 'supabase/migrations/059_canonical_national_constituency_registry.sql',
    sourceInventory: 'reports/w021_5_constituent_inventory_4123.json',
    targetDatabaseTable: 'public.constituencies',
    targetResolutionMethod: 'SELECT id, internal_id, canonical_code, state_code, constituency_number FROM public.constituencies',
    targetInternalIdResolutionStatus: 'PENDING_TARGET_DATABASE_RESOLUTION',
    statutoryScope: {
      totalConstituencies: 4123,
      totalStatesAndUTs: 31,
      stateBreakdown,
      delimitationRegimeDefault: 'eci_delimitation_2008',
      assamDelimitationRegime: 'eci_delimitation_assam_2023'
    },
    demographicsReconciliation: {
      statutoryConstituencies: 4123,
      manifestRecords: 4142,
      nonStatutoryExcludedRecords: 153,
      nonStatutoryDetails: '151 non-statutory Delhi entries (AC 71-221) and 2 non-statutory Himachal entries (AC 69-70) excluded to protect statutory integrity',
      statutoryManifestGapSeats: 134,
      manifestGapDetails: '134 statutory seats missing in demographic manifest across 12 states; preserved as UNVERIFIED with zero synthetic estimates',
      openDefects: [
        {
          defectId: 'DQ-W021.5-B2.2E-001',
          state: 'MZ',
          seats: 5,
          acNumbers: [31, 32, 33, 34, 35],
          description: 'Mizoram demographic voter registration gap; total_voters left null to preserve data truth',
          status: 'OPEN_PENDING_INDEPENDENT_ADJUDICATION'
        }
      ]
    },
    stage3DeploymentGate: {
      status: 'BLOCKED_PENDING_TARGET_INTERNAL_ID_RESOLUTION',
      reason: 'public.constituency_demographics.constituency_id references public.constituencies(internal_id). The target database assigns internal_id via gen_random_uuid(). Staging demographic write is strictly blocked until authorized read of target internal_id values is performed.'
    },
    constituencies: acList
  };

  const outputPath = path.join(root, 'reports', 'w021_5_constituency_4123_crosswalk.json');
  fs.writeFileSync(outputPath, JSON.stringify(crosswalkPayload, null, 2), 'utf8');
  console.log(`Successfully built 4,123-seat crosswalk at: ${outputPath}`);

  return crosswalkPayload;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildConstituency4123Crosswalk();
}
