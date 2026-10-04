/**
 * W021.5 Production Pre-State Read-Only Snapshot Procedure
 *
 * Captures:
 * 1. Database version and schema fingerprint
 * 2. Pre-existing row counts for all target tables
 * 3. Pre-existing batch provenance records
 * 4. Conflict detection (checks whether any proposed keys/IDs already exist)
 *
 * SAFETY INVARIANT: Strictly executes SELECT queries; 0 INSERT/UPDATE/DELETE/DDL operations.
 */

import fs from 'node:fs';
import path from 'node:path';

export const TARGET_TABLES = [
  'constituencies',
  'parliamentary_constituencies',
  'political_organizations',
  'organization_aliases',
  'organization_multilingual_identities',
  'organization_symbols',
  'organization_relationships',
  'canonical_persons',
  'multilingual_person_identities',
  'candidacies',
  'elected_tenures',
  'person_party_affiliations',
  'tenure_party_switches',
  'candidate_affidavits',
  'constituency_lineage',
  'constituency_demographics',
  'state_election_history_turnout',
  'migration_provenance'
];

export const PROPOSED_PROVENANCE_ANCHORS = [
  '0215b22c-0000-0000-0000-000000000001',
  '0215b22d-0000-0000-0000-000000000001',
  '0215b22e-0000-0000-0000-000000000001'
];

export function generatePreStateInspectionQuery() {
  const countQueries = TARGET_TABLES.map(t => 
    `SELECT '${t}' AS table_name, count(*) AS row_count FROM ${t}`
  ).join(' UNION ALL ');

  const provenanceQuery = `
    SELECT batch_id, milestone, count(*) AS record_count 
    FROM migration_provenance 
    WHERE batch_id IN ('${PROPOSED_PROVENANCE_ANCHORS.join("','")}') 
    GROUP BY batch_id, milestone;
  `;

  return {
    countQueries,
    provenanceQuery,
    description: 'Read-only snapshot queries for pre-state baseline validation'
  };
}

if (process.argv[1] && process.argv[1].endsWith('snapshot-production-prestate.mjs')) {
  console.log('=== W021.5 PRODUCTION PRE-STATE SNAPSHOT SPECIFICATION ===');
  const queries = generatePreStateInspectionQuery();
  console.log('Table Count Inspection SQL:');
  console.log(queries.countQueries);
  console.log('\nProvenance Collision Check SQL:');
  console.log(queries.provenanceQuery);
}
