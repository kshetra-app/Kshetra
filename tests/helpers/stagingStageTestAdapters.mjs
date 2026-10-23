/**
 * tests/helpers/stagingStageTestAdapters.mjs
 *
 * Test-Only Dependency-Injection Adapters for Isolated Stage Testing
 * Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 * CTO Directive 145 Item 1: Dependency-injection adapters in a separate test-only module
 * with no use in the operational execution path.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  reconcilePoliticalOrganizations,
  reconcileCandidacies,
  reconcileConstituencyDemographics,
  reconcileHistoricalElectionResults
} from '../../scripts/reconcile_database_criteria_identities.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Isolated Stage 1 test executor
 */
export async function executeStage1TestIsolated(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const transport = options.transport || (async () => ({ ok: true, status: 200, text: async () => '[]' }));
  const targetHost = options.targetHost || 'https://fkpigozcqnmcvofuksar.supabase.co';
  const serviceKey = options.serviceKey || 'test-service-key';

  const r1 = reconcilePoliticalOrganizations({ repoRoot });
  if (!r1.passed || !r1.rowsByTable) {
    throw new Error('STAGE_1_PREPARATION_FAILED');
  }

  const tableOrder = [
    'public.datasets', 'public.dataset_versions', 'public.provenance_records',
    'public.political_organizations', 'public.organization_relationships',
    'public.organization_multilingual_names', 'public.organization_symbols',
    'public.organization_aliases'
  ];

  let totalRowsAffected = 0;
  const tableResults = {};

  for (const tableName of tableOrder) {
    const rows = r1.rowsByTable[tableName] || [];
    const url = `${targetHost}/rest/v1/${tableName.replace('public.', '')}?on_conflict=id`;
    const resp = await transport(url, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(rows)
    });

    if (!resp.ok) {
      throw new Error(`STAGE_1_HTTP_ERROR: HTTP ${resp.status} upserting ${tableName}`);
    }

    const rawText = await resp.text();
    let body;
    try {
      body = JSON.parse(rawText);
    } catch (e) {
      const err = new Error(`MALFORMED_RESPONSE: Could not parse response for ${tableName}: ${rawText.slice(0, 100)}`);
      err.code = 'MALFORMED_RESPONSE';
      throw err;
    }

    if (!Array.isArray(body)) {
      const err = new Error(`SEMANTIC_ERROR: Expected array response from PostgREST for ${tableName}, received: ${typeof body}`);
      err.code = 'SEMANTIC_ERROR';
      throw err;
    }

    if (body.length !== rows.length) {
      const err = new Error(`ROW_COUNT_MISMATCH: ${tableName} expected ${rows.length} rows, received ${body.length}`);
      err.code = 'ROW_COUNT_MISMATCH';
      throw err;
    }

    totalRowsAffected += body.length;
    tableResults[tableName] = { rowsExpected: rows.length, rowsInserted: body.length };
  }

  return {
    criterionId: 'CRIT-C02-02',
    status: 'EXECUTED_PENDING_CORROBORATION',
    stagingExecuted: true,
    rowsAffected: totalRowsAffected,
    tableResults
  };
}

/**
 * Isolated Stage 2 test executor
 */
export async function executeStage2TestIsolated(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const transport = options.transport || (async () => ({ ok: true, status: 200, text: async () => '[]' }));
  const targetHost = options.targetHost || 'https://fkpigozcqnmcvofuksar.supabase.co';
  const serviceKey = options.serviceKey || 'test-service-key';

  const r2 = reconcileCandidacies({ repoRoot });
  if (!r2.passed || !r2.uniqueCandidates) {
    throw new Error('STAGE_2_PREPARATION_FAILED');
  }

  const url = `${targetHost}/rest/v1/candidacies?on_conflict=person_id,election_year,election_type,constituency_id`;
  const resp = await transport(url, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(r2.uniqueCandidates)
  });

  if (!resp.ok) {
    throw new Error(`STAGE_2_HTTP_ERROR: HTTP ${resp.status}`);
  }

  const rawText = await resp.text();
  let body;
  try {
    body = JSON.parse(rawText);
  } catch (e) {
    const err = new Error(`MALFORMED_RESPONSE: ${rawText.slice(0, 100)}`);
    err.code = 'MALFORMED_RESPONSE';
    throw err;
  }

  return {
    criterionId: 'CRIT-D02-02',
    status: 'EXECUTED_PENDING_CORROBORATION',
    stagingExecuted: true,
    rowsAffected: Array.isArray(body) ? body.length : 0
  };
}
