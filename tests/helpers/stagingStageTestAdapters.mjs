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
import { reconcileStage1Catalog } from '../../scripts/lib/stage1IdempotentReconciler.mjs';
import { fetchTargetDatabaseState } from '../../scripts/execute_staging_directive_139.mjs';

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

/**
 * Test-only transport adapter factory (Directive 146 Section 2).
 * Enforces mock-only dispatch in test environments without exposing operational transport.
 */
export function createTestTransportAdapter(mockHandler) {
  if (typeof mockHandler !== 'function') {
    throw new Error('TEST_TRANSPORT_MOCK_REQUIRED: createTestTransportAdapter requires a mock handler function');
  }
  return async function testTransportAdapter(url, options = {}) {
    return mockHandler(url, options);
  };
}

export const STAGE1_TABLES = [
  'public.datasets',
  'public.dataset_versions',
  'public.provenance_records',
  'public.political_organizations',
  'public.organization_relationships',
  'public.organization_multilingual_names',
  'public.organization_symbols',
  'public.organization_aliases'
];

/**
 * Isolated target state fetcher for testing retrieval security, pagination, and fail-closed errors
 * Authority: CTO Directive 150 Section 2.2 & 2.3 / CTO Directive 152 Section 5
 */
export async function fetchTargetDatabaseStateIsolated(internalContext, options = {}) {
  return fetchTargetDatabaseState(internalContext, options);
}

/**
 * Isolated Stage 1 test executor using Stage 1 Idempotent Reconciler & PostgREST dispatch
 * Authority: CTO Directive 150 Section 2.1 & 2.4 / CTO Directive 152 Section 3
 */
export async function executeStage1WithReconcilerIsolated(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const transport = options.transport || (async () => ({ ok: true, status: 200, text: async () => '[]', json: async () => [] }));
  const targetHost = options.targetHost || 'https://fkpigozcqnmcvofuksar.supabase.co';
  const serviceKey = options.serviceKey || 'test-service-key';
  const authGrant = options.authGrant;

  // Authorization check (Directive 152 Section 3: require executionScope === 'STAGE_1' if specified)
  const isAuthorized = authGrant &&
    (!authGrant.executionScope || authGrant.executionScope === 'STAGE_1') &&
    authGrant.adminContainmentConfirmed === true &&
    authGrant.criteria?.has('CRIT-C02-02') &&
    authGrant.operations?.has('SELECT') &&
    ((authGrant.operations?.has('INSERT') && authGrant.operations?.has('UPDATE')) || authGrant.operations?.has('UPSERT')) &&
    STAGE1_TABLES.every(t => authGrant.tables?.has(t));

  if (!isAuthorized) {
    const targetState = options.targetDatabaseState || {};
    const plan = reconcileStage1Catalog(targetState, { repoRoot });
    return {
      stage: 'stage1_political_organizations',
      criterionId: 'CRIT-C02-02',
      status: 'BLOCKED_NOT_DEPLOYABLE',
      deploymentStatus: 'BLOCKED_NOT_DEPLOYABLE',
      reconciliationEngine: 'stage1IdempotentReconciler.mjs (CTO Directive 150 Section 2)',
      reconciliationModel: 'IDEMPOTENT_NATURAL_KEY_PRESERVATION',
      stagingExecuted: false,
      outboundRowsToStaging: 0,
      rowsAffected: 0,
      networkRequestsAttempted: 0
    };
  }

  const internalContext = { transport, targetHost, serviceKey };
  const targetState = options.targetDatabaseState || await fetchTargetDatabaseStateIsolated(internalContext);
  const plan = reconcileStage1Catalog(targetState, { repoRoot });

  if (plan.conflicts && plan.conflicts.length > 0) {
    throw new Error(`STAGE_1_RECONCILIATION_CONFLICTS: ${plan.conflicts.length} conflicting records detected against target database`);
  }

  let totalRowsAffected = 0;
  for (const table of STAGE1_TABLES) {
    const tableAudit = plan.tableAudits[table];
    if (!tableAudit) continue;

    const endpoint = table.replace(/^public\./, '');
    const inserts = plan.plannedOperations.filter(op => op.table === table && op.action === 'INSERT').map(op => op.payload);
    const updates = plan.plannedOperations.filter(op => op.table === table && op.action === 'UPDATE');

    if (inserts.length > 0) {
      let resp;
      try {
        resp = await transport(`${targetHost}/rest/v1/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(inserts)
        });
      } catch (err) {
        throw new Error(`STAGE_1_REMOTE_EXECUTION_NETWORK_ERROR on ${table}: ${err.message}`);
      }

      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        throw new Error(`STAGE_1_REMOTE_EXECUTION_FAILED on ${table}: HTTP ${resp.status} - ${errBody}`);
      }

      const resJson = await resp.json().catch(() => null);
      if (!Array.isArray(resJson)) {
        throw new Error(`STAGE_1_INVALID_RESPONSE_SHAPE on ${table}: Expected JSON array of inserted rows`);
      }
      if (resJson.length !== inserts.length) {
        throw new Error(`STAGE_1_ROW_COUNT_MISMATCH on ${table}: Expected ${inserts.length} inserted rows, received ${resJson.length}`);
      }

      totalRowsAffected += resJson.length;
    }

    for (const upd of updates) {
      let resp;
      try {
        resp = await transport(`${targetHost}/rest/v1/${endpoint}?id=eq.${upd.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(upd.payload)
        });
      } catch (err) {
        throw new Error(`STAGE_1_REMOTE_UPDATE_NETWORK_ERROR on ${table} id ${upd.id}: ${err.message}`);
      }

      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        throw new Error(`STAGE_1_REMOTE_UPDATE_FAILED on ${table} id ${upd.id}: HTTP ${resp.status} - ${errBody}`);
      }

      const resJson = await resp.json().catch(() => null);
      if (!Array.isArray(resJson) || resJson.length === 0) {
        throw new Error(`STAGE_1_UPDATE_TARGET_NOT_FOUND: Update on ${table} id ${upd.id} matched 0 target rows`);
      }

      totalRowsAffected += 1;
    }
  }

  return {
    stage: 'stage1_political_organizations',
    criterionId: 'CRIT-C02-02',
    status: 'EXECUTED_PENDING_INDEPENDENT_CORROBORATION',
    reconciliationEngine: 'stage1IdempotentReconciler.mjs (CTO Directive 150 Section 2)',
    reconciliationModel: 'IDEMPOTENT_NATURAL_KEY_PRESERVATION',
    stagingExecuted: true,
    rowsAffected: totalRowsAffected
  };
}
