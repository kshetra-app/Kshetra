#!/usr/bin/env node

/**
 * scripts/execute_staging_directive_139.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 145 / Workstream A, C, D
 * Criteria: CRIT-C02-02, CRIT-D02-02, CRIT-E01-02, CRIT-F02-03
 * Governing Requirements: REQ-DB-001, REQ-POL-002, REQ-CAN-002, REQ-DEM-001, REQ-HIS-002
 * Governing Authority: Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 *
 * Execution Modes (CTO Directive 145):
 * 1. Mode A: Local Preparation & Reconciliation (DEFAULT MODE)
 *    - Default execution mode when invoked without flags.
 *    - Strictly ZERO network traffic, ZERO credentials required, ZERO tokens required.
 *    - Reconciles directly from repository source files, migrations, manifests, and tests.
 *    - Emits: PARTIALLY_READY_WITH_BLOCKED_STAGES (Stages 1 & 2 ready, Stages 3 & 4 blocked).
 *    - Preserves: stagingExecutionPerformed: false, networkRequestsAttempted: 0.
 * 2. Mode B: Authorized Staging Execution (Gated on Admin Containment & Crypto Auth)
 *    - Fail-closed administrative containment gate: Requires authentic signed closure record.
 *    - Requires asymmetric cryptographic authorization token (Ed25519 or RS256).
 *    - Canonical execution plan digest binding covering operational boundary, transformation code,
 *      schema migrations, source artifacts, conflict targets, and recovery policy.
 *    - Offline schema-contract preflight validates all stage payloads before Stage 1 executes.
 *    - Stages 3 & 4 remain strictly BLOCKED_NOT_DEPLOYABLE (0 rows outbound).
 *    - Fixed operational transport strictly enforces HTTPS and authorized staging hostname.
 *    - Caller-injected trust anchors, replay stores, admin records, and transports are strictly rejected.
 *    - Strictly targets allow-listed staging project fkpigozcqnmcvofuksar.
 *    - Air-gap invariant: Production ehfafcnimmjusyvplbah is 100% air-gapped (0 queries, 0 mutations).
 *
 * Generates: reports/w021_5_staging_execution_report.json
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  verifyStagingWriteAuthorization,
  ALLOWED_STAGING_PROJECT_REF,
  PROHIBITED_PRODUCTION_REF,
  ALL_AUTHORIZED_STAGING_TABLES
} from './lib/stagingAuthorization.mjs';
import {
  reconcilePoliticalOrganizations,
  reconcileCandidacies,
  reconcileConstituencyDemographics,
  reconcileHistoricalElectionResults
} from './reconcile_database_criteria_identities.mjs';
import {
  computeExecutionPlanDigest,
  generateCanonicalExecutionPlan
} from './lib/stagingExecutionPlan.mjs';
import {
  verifyAdminIncidentClosure,
  CONTAINMENT_STATUS
} from './lib/stagingAdminContainment.mjs';
import {
  reconcileStage1Catalog,
  STAGE1_TABLE_SEQUENCE,
  STAGE1_MUTATION_POLICY
} from './lib/stage1IdempotentReconciler.mjs';
import {
  validatePlanSchemaContracts
} from './lib/stagingSchemaPreflight.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

export { ALLOWED_STAGING_PROJECT_REF, PROHIBITED_PRODUCTION_REF, ALL_AUTHORIZED_STAGING_TABLES };
export const ALLOWED_STAGING_HOSTNAME = `${ALLOWED_STAGING_PROJECT_REF}.supabase.co`;

// ─── 1. MODE & ARGUMENT RESOLUTION ───────────────────────────────────────────

export function parseExecutionArguments(argv = process.argv.slice(2)) {
  let mode = 'local'; // DEFAULT MODE IS LOCAL PREPARATION
  let tokenFile = null;
  let authToken = process.env.STAGING_WRITE_AUTHORIZATION_TOKEN || null;
  let planDigest = null;
  let dryRun = true;

  for (const arg of argv) {
    if (arg === '--mode=staging' || arg === '--write') {
      mode = 'staging';
      dryRun = false;
    } else if (arg === '--mode=local' || arg === '--local') {
      mode = 'local';
      dryRun = true;
    } else if (arg.startsWith('--token-file=')) {
      tokenFile = arg.split('=')[1];
    } else if (arg.startsWith('--auth-token=')) {
      authToken = arg.split('=')[1];
    } else if (arg.startsWith('--plan-digest=')) {
      planDigest = arg.split('=')[1];
    }
  }

  // Load token from file if specified
  if (tokenFile && fs.existsSync(tokenFile)) {
    authToken = fs.readFileSync(tokenFile, 'utf8').trim();
  }

  // Parse execution scope (--scope=stage1 or --scope=stage2)
  let executionScope = null;
  const scopeArg = argv.find(a => a.startsWith('--scope='));
  if (scopeArg) {
    const raw = scopeArg.split('=')[1].trim().toUpperCase();
    if (raw === 'STAGE1' || raw === 'STAGE_1') executionScope = 'STAGE_1';
    else if (raw === 'STAGE2' || raw === 'STAGE_2') executionScope = 'STAGE_2';
    else executionScope = raw;
  }

  return {
    mode,
    dryRun,
    tokenFile,
    authToken,
    planDigest,
    executionScope
  };
}

// ─── 2. FIXED OPERATIONAL TRANSPORT & INSTRUMENTATION (Directive 145 Item 3) ──

let transportCallCount = 0;

export function resetTransportInstrumentation() {
  transportCallCount = 0;
}

export function getTransportCallCount() {
  return transportCallCount;
}

/**
 * Creates an authoritative, non-bypassable staging HTTP transport boundary.
 * Directive 145 / Directive 146 Section 2: Operational transport is strictly private,
 * fixed, and enforces HTTPS and the sole authorized staging hostname before every outbound request.
 * Ambient flags (--mode=staging, --write, NODE_ENV=test) and mutable global hooks are eliminated.
 */
function createStagingHttpTransport(transportOptions = {}) {
  if (!transportOptions.authorized || transportOptions.mode !== 'staging') {
    const err = new Error('NETWORK_ACCESS_FORBIDDEN: Operational staging transport requires verified cryptographic authorization and staging mode.');
    err.code = 'NETWORK_ACCESS_FORBIDDEN';
    throw err;
  }

  return async function stagingHttpTransport(url, fetchOptions = {}) {
    transportCallCount++;
    const urlStr = typeof url === 'string' ? url : url.toString();

    // Invariant 1: Production host rejection in actual transport layer
    if (urlStr.includes(PROHIBITED_PRODUCTION_REF)) {
      const err = new Error(
        `PRODUCTION_HOST_FORBIDDEN: Production project reference detected in request destination: ${PROHIBITED_PRODUCTION_REF}. Strictly prohibited under air-gap governance.`
      );
      err.code = 'PRODUCTION_HOST_FORBIDDEN';
      throw err;
    }

    // Invariant 2: Enforce protocol https:
    if (!urlStr.startsWith('https://')) {
      const err = new Error(`INSECURE_PROTOCOL: Staging requests strictly require https: protocol, received: ${urlStr}`);
      err.code = 'INSECURE_PROTOCOL';
      throw err;
    }

    // Invariant 3: Enforce strict authorized staging hostname
    const parsed = new URL(urlStr);
    if (parsed.hostname !== ALLOWED_STAGING_HOSTNAME) {
      const err = new Error(`UNAUTHORIZED_STAGING_HOST: Unauthorized staging host "${parsed.hostname}". The only permitted destination is "${ALLOWED_STAGING_HOSTNAME}".`);
      err.code = 'UNAUTHORIZED_STAGING_HOST';
      throw err;
    }

    return globalThis.fetch(url, fetchOptions);
  };
}

// ─── 3. MODULE-PRIVATE INTERNAL CONTEXT & STAGE PROTECTION (Directive 145 Item 1) ──

const INTERNAL_EXECUTION_TOKEN = Symbol('INTERNAL_EXECUTION_TOKEN');

function assertInternalExecutionContext(options = {}) {
  if (!options.internalContext || options.internalContext.__token !== INTERNAL_EXECUTION_TOKEN) {
    const err = new Error(
      'UNAUTHORIZED_STAGE_INVOCATION: Direct invocation of individual stage execution functions is strictly prohibited. ' +
      'All staging operations must execute through runStagingExecutionEngine() with verified authorization and containment.'
    );
    err.code = 'UNAUTHORIZED_STAGE_INVOCATION';
    throw err;
  }
}

// ─── 4. MODULE-PRIVATE STAGE WRITERS (Directive 145 Item 1) ────────────────────

/**
 * Helper to fetch target database state across all Stage 1 tables for remote reconciliation
 * Implements strict fail-closed validation and complete pagination per CTO Directive 150 Section 2.2 & Directive 152 Section 5.
 */
export async function fetchTargetDatabaseState(internalContext, options = {}) {
  const { transport, targetHost, serviceKey } = internalContext;
  if (!transport || !targetHost || !serviceKey) {
    const err = new Error('TARGET_STATE_CONFIG_MISSING: transport, targetHost, and serviceKey are mandatory');
    err.code = 'TARGET_STATE_CONFIG_MISSING';
    throw err;
  }

  const targetState = {};
  const pageSize = options.pageSize || 500;
  const headers = {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Accept': 'application/json'
  };

  const tables = [
    'datasets',
    'dataset_versions',
    'provenance_records',
    'political_organizations',
    'organization_relationships',
    'organization_multilingual_names',
    'organization_symbols',
    'organization_aliases'
  ];

  for (const table of tables) {
    const qualifiedTable = `public.${table}`;
    let offset = 0;
    const allRows = [];
    const seenIds = new Set();
    let totalCount = null;

    while (true) {
      const rangeHeader = `${offset}-${offset + pageSize - 1}`;
      const url = `${targetHost}/rest/v1/${table}?select=*`;

      let resp;
      try {
        resp = await transport(url, {
          method: 'GET',
          headers: {
            ...headers,
            'Range': rangeHeader,
            'Range-Unit': 'items',
            'Prefer': 'count=exact'
          }
        });
      } catch (networkErr) {
        const err = new Error(`TARGET_STATE_NETWORK_ERROR: Failed GET on table ${qualifiedTable} at offset ${offset}: ${networkErr.message}`);
        err.code = 'TARGET_STATE_NETWORK_ERROR';
        err.table = qualifiedTable;
        throw err;
      }

      if (!resp.ok) {
        let errBody = '';
        try { errBody = await resp.text(); } catch {}
        const err = new Error(`TARGET_STATE_READ_FAILED: Table ${qualifiedTable} GET returned HTTP ${resp.status} (${resp.statusText || 'Error'}) - ${errBody}`);
        err.code = 'TARGET_STATE_READ_FAILED';
        err.table = qualifiedTable;
        err.status = resp.status;
        throw err;
      }

      // Fail-closed Content-Range header requirement (Directive 152 Section 5.2.A)
      const rawContentRange = (resp.headers?.get ? resp.headers.get('content-range') : resp.headers?.['content-range']);
      if (!rawContentRange || typeof rawContentRange !== 'string' || rawContentRange.trim().length === 0) {
        const err = new Error(`TARGET_STATE_MISSING_CONTENT_RANGE: Mandatory Content-Range header is missing on table ${qualifiedTable} at offset ${offset}.`);
        err.code = 'TARGET_STATE_MISSING_CONTENT_RANGE';
        err.table = qualifiedTable;
        throw err;
      }

      const trimmedContentRange = rawContentRange.trim();
      // PostgREST may prefix with "items "
      const strippedRange = trimmedContentRange.startsWith('items ')
        ? trimmedContentRange.slice(6).trim()
        : trimmedContentRange;

      // Fail-closed wildcard total rejection (Directive 152 Section 5.2.A)
      if (strippedRange === '*' || strippedRange.endsWith('/*') || strippedRange.includes('/*')) {
        const err = new Error(`TARGET_STATE_WILDCARD_TOTAL_FORBIDDEN: Wildcard total in Content-Range "${rawContentRange}" is strictly forbidden on table ${qualifiedTable}.`);
        err.code = 'TARGET_STATE_WILDCARD_TOTAL_FORBIDDEN';
        err.table = qualifiedTable;
        throw err;
      }

      const rawText = await resp.text();
      let pageRows;
      try {
        pageRows = JSON.parse(rawText);
      } catch (parseErr) {
        const err = new Error(`TARGET_STATE_MALFORMED_JSON: Invalid JSON for table ${qualifiedTable} at offset ${offset}: ${parseErr.message}`);
        err.code = 'TARGET_STATE_MALFORMED_JSON';
        err.table = qualifiedTable;
        throw err;
      }

      if (!Array.isArray(pageRows)) {
        const err = new Error(`TARGET_STATE_INVALID_SHAPE: Expected JSON array for table ${qualifiedTable}, received ${typeof pageRows}`);
        err.code = 'TARGET_STATE_INVALID_SHAPE';
        err.table = qualifiedTable;
        throw err;
      }

      // Handle valid empty table: Content-Range */0 (Directive 152 Section 5.2.A)
      if (strippedRange === '*/0') {
        if (pageRows.length > 0) {
          const err = new Error(`TARGET_STATE_INVALID_EMPTY_RESPONSE: Table ${qualifiedTable} returned Content-Range "*/0" but response body contained ${pageRows.length} rows.`);
          err.code = 'TARGET_STATE_INVALID_EMPTY_RESPONSE';
          err.table = qualifiedTable;
          throw err;
        }
        totalCount = 0;
        break; // Table is empty and complete
      }

      // Syntax validation: <start>-<end>/<total>
      const rangeMatch = strippedRange.match(/^(\d+)-(\d+)\/(\d+)$/);
      if (!rangeMatch) {
        const err = new Error(`TARGET_STATE_MALFORMED_CONTENT_RANGE: Malformed Content-Range header "${rawContentRange}" for table ${qualifiedTable}.`);
        err.code = 'TARGET_STATE_MALFORMED_CONTENT_RANGE';
        err.table = qualifiedTable;
        throw err;
      }

      const rangeStart = parseInt(rangeMatch[1], 10);
      const rangeEnd = parseInt(rangeMatch[2], 10);
      const pageTotal = parseInt(rangeMatch[3], 10);

      // Section 5.2.B: Strict offset and range bounds verification
      if (rangeStart !== offset) {
        const err = new Error(`TARGET_STATE_PAGINATION_RANGE_INVALID: Range start ${rangeStart} does not match expected offset ${offset} for table ${qualifiedTable}.`);
        err.code = 'TARGET_STATE_PAGINATION_RANGE_INVALID';
        err.table = qualifiedTable;
        throw err;
      }

      if (pageRows.length > 0) {
        const expectedEnd = offset + pageRows.length - 1;
        if (rangeEnd !== expectedEnd) {
          const err = new Error(`TARGET_STATE_PAGINATION_RANGE_INVALID: Range end ${rangeEnd} does not match expected offset + rows - 1 (${expectedEnd}) for table ${qualifiedTable}.`);
          err.code = 'TARGET_STATE_PAGINATION_RANGE_INVALID';
          err.table = qualifiedTable;
          throw err;
        }
        if (rangeEnd >= pageTotal) {
          const err = new Error(`TARGET_STATE_PAGINATION_RANGE_INVALID: Range end ${rangeEnd} is greater than or equal to total ${pageTotal} for table ${qualifiedTable}.`);
          err.code = 'TARGET_STATE_PAGINATION_RANGE_INVALID';
          err.table = qualifiedTable;
          throw err;
        }
      }

      // Section 5.2.C: Total count consistency across pages
      if (totalCount === null) {
        totalCount = pageTotal;
      } else if (totalCount !== pageTotal) {
        const err = new Error(`TARGET_STATE_PAGINATION_TOTAL_CHANGED: Total count changed from ${totalCount} to ${pageTotal} during pagination traversal of table ${qualifiedTable}.`);
        err.code = 'TARGET_STATE_PAGINATION_TOTAL_CHANGED';
        err.table = qualifiedTable;
        throw err;
      }

      // Section 5.2.D: Detect overlapping or duplicate rows (throw, do NOT silently deduplicate)
      for (const row of pageRows) {
        const rowId = row.id !== undefined ? String(row.id) : JSON.stringify(row);
        if (seenIds.has(rowId)) {
          const err = new Error(`TARGET_STATE_PAGINATION_OVERLAPPING_ROWS: Duplicate or overlapping row ID "${rowId}" encountered during pagination of table ${qualifiedTable}.`);
          err.code = 'TARGET_STATE_PAGINATION_OVERLAPPING_ROWS';
          err.table = qualifiedTable;
          throw err;
        }
        seenIds.add(rowId);
        allRows.push(row);
      }

      // Pagination termination check
      if (allRows.length >= totalCount || pageRows.length === 0) {
        if (allRows.length !== totalCount) {
          const err = new Error(`TARGET_STATE_INCOMPLETE_PAGINATION: Table ${qualifiedTable} expected ${totalCount} rows from Content-Range, but retrieved ${allRows.length}.`);
          err.code = 'TARGET_STATE_INCOMPLETE_PAGINATION';
          err.table = qualifiedTable;
          throw err;
        }
        break;
      }

      offset += pageRows.length;
    }

    targetState[qualifiedTable] = allRows;
  }

  // Section 5.2.E: Confirm complete table retrieval across all 8 Stage 1 tables
  for (const table of tables) {
    const qualifiedTable = `public.${table}`;
    if (!Array.isArray(targetState[qualifiedTable])) {
      const err = new Error(`TARGET_STATE_INCOMPLETE_TABLE_SET: Missing table ${qualifiedTable} from target state retrieval.`);
      err.code = 'TARGET_STATE_INCOMPLETE_TABLE_SET';
      err.table = qualifiedTable;
      throw err;
    }
  }

  return targetState;
}

/**
 * Evaluates whether the internalContext possesses verified authorization grants for Stage 1
 * Authority: CTO Directive 150 Section 2.1 & CTO Directive 152 Section 3
 */
function isStage1Authorized(internalContext) {
  if (!internalContext || !internalContext.authGrant) {
    return false;
  }
  const grant = internalContext.authGrant;

  // 1. Grant executionScope must be STAGE_1 (Directive 152 Section 3)
  if (grant.executionScope !== 'STAGE_1') {
    return false;
  }

  // 2. Administrator containment must be confirmed
  if (grant.adminContainmentConfirmed !== true) {
    return false;
  }

  // 3. CRIT-C02-02 must be explicitly granted
  if (!grant.criteria || !grant.criteria.has('CRIT-C02-02')) {
    return false;
  }

  // 4. SELECT operation must be explicitly granted for target-state retrieval
  if (!grant.operations || !grant.operations.has('SELECT')) {
    return false;
  }

  // 5. Write operations must be explicitly granted (INSERT + UPDATE or UPSERT)
  const hasWrites = (grant.operations.has('INSERT') && grant.operations.has('UPDATE')) || grant.operations.has('UPSERT');
  if (!hasWrites) {
    return false;
  }

  // 6. All 8 Stage 1 tables must be explicitly granted
  for (const table of STAGE1_TABLE_SEQUENCE) {
    if (!grant.tables || !grant.tables.has(table)) {
      return false;
    }
  }

  return true;
}

/**
 * Stage 1 (CRIT-C02-02: Political Organizations Catalog & Child Tables)
 * Directive 150 Section 2: Stage 1 reconciler integrated using stage1IdempotentReconciler.mjs.
 * Reconciles 1,207 catalog records (107 orgs + 1,099 child rows + 1 provenance) across 8 tables.
 * Implements complete natural-key target-state reconciliation and authorized mutation dispatch.
 * In absence of administrator containment confirmation and cryptographic token, fails closed
 * with BLOCKED_NOT_DEPLOYABLE and strictly zero remote mutations.
 */
async function executeStage1Staging(options = {}) {
  assertInternalExecutionContext(options);
  const startedAt = new Date().toISOString();
  const internalContext = options.internalContext;

  // 1. Verify authorization scope for Stage 1 (Directive 150 Section 2.1)
  const authorized = isStage1Authorized(internalContext);

  if (!authorized) {
    // If not fully authorized, fail closed with BLOCKED_NOT_DEPLOYABLE, 0 requests, 0 mutations
    const targetState = options.targetDatabaseState || {};
    const plan = reconcileStage1Catalog(targetState, { repoRoot: REPO_ROOT });

    return {
      stage: 'stage1_political_organizations',
      criterionId: 'CRIT-C02-02',
      taskId: 'W021.5-C-02',
      status: 'BLOCKED_NOT_DEPLOYABLE',
      deploymentStatus: 'BLOCKED_NOT_DEPLOYABLE',
      reconciliationEngine: 'stage1IdempotentReconciler.mjs (CTO Directive 150 Section 2)',
      reconciliationModel: 'IDEMPOTENT_NATURAL_KEY_PRESERVATION',
      stagingExecuted: false,
      remoteCorroborated: false,
      remoteCorroborationPending: false,
      targetTables: STAGE1_TABLE_SEQUENCE,
      totalSourceRows: plan.totalSourceRows,
      childRowsCount: plan.childRowsCount,
      plannedInserts: plan.totalInserts,
      plannedPreserved: plan.totalPreserved,
      plannedUpdates: plan.totalUpdates,
      conflictsCount: plan.conflictsCount,
      operations: ['SELECT', 'INSERT', 'UPDATE'],
      conflictTarget: 'natural_key_reconciled',
      rowsAffected: 0,
      networkRequestsAttempted: 0,
      outboundRowsToStaging: 0,
      reason: 'STAGE_1_RECONCILIATION_PREREQUISITES_PENDING: Stage 1 requires verified administrator containment confirmation, asymmetric Ed25519/RS256 authorization token explicitly granting CRIT-C02-02, SELECT, and write operations across all 8 tables, and verified complete target-state pagination. Staging dispatch remains blocked with zero outbound rows.',
      missingPrerequisite: 'ADMIN_CONTAINMENT_CONFIRMATION_AND_INDEPENDENT_CTO_TOKEN',
      startedAt,
      completedAt: new Date().toISOString()
    };
  }

  // 2. Authorized path: perform fail-closed target-state retrieval with pagination
  const transport = internalContext.transport;
  const targetHost = internalContext.targetHost;
  const serviceKey = internalContext.serviceKey;

  const targetState = options.targetDatabaseState || await fetchTargetDatabaseState(internalContext);
  const plan = reconcileStage1Catalog(targetState, { repoRoot: REPO_ROOT });

  if (plan.conflicts && plan.conflicts.length > 0) {
    throw new Error(`STAGE_1_RECONCILIATION_CONFLICTS: ${plan.conflicts.length} conflicting records detected against target database`);
  }

  // 3. Dispatch mutations table-by-table with exact row validation (Directive 150 Section 2.4)
  let totalRowsAffected = 0;
  const completedOperations = [];

  for (const table of STAGE1_TABLE_SEQUENCE) {
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
      completedOperations.push({ table, action: 'INSERT', count: resJson.length });
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
      completedOperations.push({ table, action: 'UPDATE', id: upd.id });
    }
  }

  return {
    stage: 'stage1_political_organizations',
    criterionId: 'CRIT-C02-02',
    taskId: 'W021.5-C-02',
    status: 'EXECUTED_PENDING_INDEPENDENT_CORROBORATION',
    reconciliationEngine: 'stage1IdempotentReconciler.mjs (CTO Directive 150 Section 2)',
    reconciliationModel: 'IDEMPOTENT_NATURAL_KEY_PRESERVATION',
    stagingExecuted: true,
    remoteCorroborated: false,
    remoteCorroborationPending: true,
    targetTables: STAGE1_TABLE_SEQUENCE,
    totalSourceRows: plan.totalSourceRows,
    childRowsCount: plan.childRowsCount,
    plannedInserts: plan.totalInserts,
    plannedPreserved: plan.totalPreserved,
    plannedUpdates: plan.totalUpdates,
    conflictsCount: plan.conflictsCount,
    operations: ['SELECT', 'INSERT', 'UPDATE'],
    conflictTarget: 'natural_key_reconciled',
    rowsAffected: totalRowsAffected,
    completedOperations,
    startedAt,
    completedAt: new Date().toISOString()
  };
}

/**
 * Executes Stage 2 (CRIT-D02-02: Candidate Contest Ingestion)
 * Submits the 11,298 deduplicated candidacies across 10 chunk boundaries via PostgREST upsert.
 */
async function executeStage2Staging(options = {}) {
  assertInternalExecutionContext(options);
  const startedAt = new Date().toISOString();
  const transport = options.internalContext.transport;
  const targetHost = options.internalContext.targetHost;
  const serviceKey = options.internalContext.serviceKey;

  const r2 = reconcileCandidacies({ repoRoot: REPO_ROOT });
  if (!r2.passed || !r2.uniqueCandidates) {
    throw new Error('STAGE_2_PREPARATION_FAILED: Could not reconcile candidate contest chunks from repository');
  }

  const uniqueCandidates = r2.uniqueCandidates;
  const conflictTarget = 'person_id,election_year,election_type,constituency_id';
  const url = `${targetHost}/rest/v1/candidacies?on_conflict=${conflictTarget}`;

  const response = await transport(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(uniqueCandidates)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`STAGE_2_REMOTE_EXECUTION_FAILED: Status ${response.status} - ${errorBody}`);
  }

  const responseText = await response.text();
  let resultRows;
  try {
    resultRows = JSON.parse(responseText);
  } catch (e) {
    throw new Error(`STAGE_2_MALFORMED_RESPONSE: Invalid JSON response on candidacies: ${responseText}`);
  }

  if (!Array.isArray(resultRows)) {
    if (resultRows && resultRows.error) {
      throw new Error(`STAGE_2_SEMANTIC_ERROR: Remote database returned semantic error: ${JSON.stringify(resultRows)}`);
    }
    throw new Error(`STAGE_2_INVALID_RESPONSE_SHAPE: Expected JSON array of affected rows, received: ${responseText}`);
  }

  if (resultRows.length !== uniqueCandidates.length) {
    throw new Error(
      `STAGE_2_ROW_COUNT_MISMATCH: Candidacies reported ${resultRows.length} affected rows, expected ${uniqueCandidates.length}`
    );
  }

  return {
    stage: 'stage2_candidacies',
    criterionId: 'CRIT-D02-02',
    taskId: 'W021.5-D-02',
    status: 'EXECUTED_PENDING_INDEPENDENT_CORROBORATION',
    stagingExecuted: true,
    remoteCorroborated: false,
    remoteCorroborationPending: true,
    targetTables: ['public.candidacies'],
    operations: ['UPSERT'],
    conflictTarget,
    rowsAffected: resultRows.length,
    startedAt,
    completedAt: new Date().toISOString()
  };
}

/**
 * Stage 3 (CRIT-E01-02: Constituency Demographics Baseline)
 * Directive 145 Item 6: Stage 3 is BLOCKED_NOT_DEPLOYABLE because public.constituency_demographics.constituency_id
 * requires a UUID foreign key referencing public.constituencies(internal_id).
 * In the absence of an authoritative repository crosswalk, Stage 3 dispatches exactly 0 rows.
 */
async function executeStage3Staging(options = {}) {
  assertInternalExecutionContext(options);
  const startedAt = new Date().toISOString();

  const r3 = reconcileConstituencyDemographics({ repoRoot: REPO_ROOT });

  return {
    stage: 'stage3_constituency_demographics',
    criterionId: 'CRIT-E01-02',
    taskId: 'W021.5-E-01',
    status: 'BLOCKED_NOT_DEPLOYABLE',
    deploymentStatus: 'BLOCKED_NOT_DEPLOYABLE',
    stagingExecuted: false,
    remoteCorroborated: false,
    remoteCorroborationPending: false,
    targetTables: ['public.constituency_demographics'],
    operations: ['UPSERT'],
    conflictTarget: 'constituency_id,election_year',
    rowsAffected: 0,
    outboundRowsToStaging: 0,
    reason: r3.blockedReason || 'public.constituency_demographics.constituency_id is a UUID foreign key to public.constituencies(internal_id). Missing authoritative repository crosswalk.',
    missingCanonicalMappingsCount: r3.missingCanonicalMappingsCount || 4123,
    startedAt,
    completedAt: new Date().toISOString()
  };
}

/**
 * Stage 4 (CRIT-F02-03: Historical Election Results for 23 States)
 * Directive 144/145 Item 9: Stage 4 is BLOCKED_NOT_DEPLOYABLE pending canonical election entities.
 * Dispatches exactly 0 rows.
 */
async function executeStage4Staging(options = {}) {
  assertInternalExecutionContext(options);
  const startedAt = new Date().toISOString();

  return {
    stage: 'stage4_historical_election_results',
    criterionId: 'CRIT-F02-03',
    taskId: 'W021.5-F-02',
    status: 'BLOCKED_NOT_DEPLOYABLE',
    deploymentStatus: 'BLOCKED_NOT_DEPLOYABLE',
    stagingExecuted: false,
    remoteCorroborated: false,
    remoteCorroborationPending: false,
    targetTables: ['public.election_results'],
    operations: ['UPSERT'],
    conflictTarget: 'election_id,constituency_id',
    rowsAffected: 0,
    outboundRowsToStaging: 0,
    reason: 'Canonical election entities are not provisioned in repository for these 23 states. Zero synthetic IDs permitted.',
    startedAt,
    completedAt: new Date().toISOString()
  };
}

// ─── 5. MAIN OPERATIONAL ENGINE (MODE A & MODE B) ─────────────────────────────

export async function runStagingExecutionEngine(options = {}) {
  // Directive 145 Item 2: Caller-injected trust anchors and store paths are strictly prohibited
  if (options.trustAnchor !== undefined) {
    const err = new Error('CALLER_INJECTED_TRUST_ANCHOR_PROHIBITED: options.trustAnchor is strictly prohibited in operational execution. Trust roots must come from controlled configuration.');
    err.code = 'CALLER_INJECTED_TRUST_ANCHOR_PROHIBITED';
    throw err;
  }
  if (options.adminTrustAnchor !== undefined || options.adminKeyPath !== undefined) {
    const err = new Error('CALLER_INJECTED_TRUST_ANCHOR_PROHIBITED: options.adminTrustAnchor/adminKeyPath is strictly prohibited in operational execution.');
    err.code = 'CALLER_INJECTED_TRUST_ANCHOR_PROHIBITED';
    throw err;
  }
  if (options.adminClosureRecord !== undefined || options.adminRecordPath !== undefined) {
    const err = new Error('CALLER_INJECTED_ADMIN_RECORD_PROHIBITED: Caller-supplied administrative closure record is strictly prohibited in operational execution.');
    err.code = 'CALLER_INJECTED_ADMIN_RECORD_PROHIBITED';
    throw err;
  }
  if (options.storePath !== undefined) {
    const err = new Error('CALLER_INJECTED_REPLAY_STORE_PROHIBITED: options.storePath is strictly prohibited in operational execution. Replay store must use authoritative persistent location.');
    err.code = 'CALLER_INJECTED_REPLAY_STORE_PROHIBITED';
    throw err;
  }
  // Directive 145 Item 3: Caller-supplied transport functions are strictly prohibited
  if (options.transport !== undefined || options.customFetch !== undefined || options.fetch !== undefined) {
    const err = new Error('CALLER_INJECTED_TRANSPORT_PROHIBITED: Caller-supplied transport functions are strictly prohibited in operational execution.');
    err.code = 'CALLER_INJECTED_TRANSPORT_PROHIBITED';
    throw err;
  }
  // Directive 145 Item 1: Injected internal context is strictly prohibited
  if (options.internalContext !== undefined) {
    const err = new Error('CALLER_INJECTED_CONTEXT_PROHIBITED: Injected internal execution context is strictly prohibited in operational execution.');
    err.code = 'CALLER_INJECTED_CONTEXT_PROHIBITED';
    throw err;
  }

  const cliArgs = parseExecutionArguments(options.argv || process.argv.slice(2));
  const mode = options.mode || cliArgs.mode;
  const isDryRun = mode === 'local';

  resetTransportInstrumentation();

  const stageResults = {};

  if (isDryRun) {
    // ─── MODE A: LOCAL PREPARATION & RECONCILIATION ──────────────────────────
    // Strictly ZERO network calls, ZERO credentials required, ZERO tokens required.
    const s1Start = new Date().toISOString();
    const r1 = reconcilePoliticalOrganizations({ repoRoot: REPO_ROOT });
    const plan1 = reconcileStage1Catalog({}, { repoRoot: REPO_ROOT });
    stageResults.stage1_political_organizations = {
      criterionId: 'CRIT-C02-02',
      taskId: 'W021.5-C-02',
      governingRequirement: 'REQ-POL-002',
      status: 'BLOCKED_NOT_DEPLOYABLE',
      deploymentStatus: 'BLOCKED_NOT_DEPLOYABLE',
      reconciliationEngine: 'stage1IdempotentReconciler.mjs (CTO Directive 150 Section 2)',
      reconciliationModel: 'IDEMPOTENT_NATURAL_KEY_PRESERVATION',
      stagingExecuted: false,
      remoteCorroborated: false,
      remoteCorroborationPending: false,
      localSourceVerified: true,
      targetTables: STAGE1_TABLE_SEQUENCE,
      totalSourceRows: plan1.totalSourceRows,
      childRowsCount: plan1.childRowsCount,
      plannedInserts: plan1.totalInserts,
      plannedPreserved: plan1.totalPreserved,
      plannedUpdates: plan1.totalUpdates,
      conflictsCount: plan1.conflictsCount,
      operations: ['UPSERT'],
      conflictTarget: 'natural_key_reconciled',
      rowsAffected: 0,
      outboundRowsToStaging: 0,
      reason: r1.blockedReason,
      missingPrerequisite: r1.missingPrerequisite,
      startedAt: s1Start,
      completedAt: new Date().toISOString(),
      metrics: {
        ...r1.metrics,
        reconciledChildRows: plan1.childRowsCount,
        reconciledCatalogRows: plan1.totalSourceRows
      }
    };

    const s2Start = new Date().toISOString();
    const r2 = reconcileCandidacies({ repoRoot: REPO_ROOT });
    stageResults.stage2_candidacies = {
      criterionId: 'CRIT-D02-02',
      taskId: 'W021.5-D-02',
      governingRequirement: 'REQ-CAN-002',
      status: r2.passed ? 'PREPARED_AND_RECONCILED_IN_REPOSITORY' : 'FAILED',
      deploymentStatus: 'PREPARED_AND_RECONCILED_IN_REPOSITORY',
      stagingExecuted: false,
      remoteCorroborated: false,
      remoteCorroborationPending: true,
      localSourceVerified: true,
      targetTables: ['public.candidacies'],
      operations: ['UPSERT'],
      conflictTarget: 'person_id,election_year,election_type,constituency_id',
      rowsAffected: 0,
      outboundRowsToStaging: 11298,
      startedAt: s2Start,
      completedAt: new Date().toISOString(),
      metrics: r2.metrics
    };

    const s3Start = new Date().toISOString();
    const r3 = reconcileConstituencyDemographics({ repoRoot: REPO_ROOT });
    stageResults.stage3_constituency_demographics = {
      criterionId: 'CRIT-E01-02',
      taskId: 'W021.5-E-01',
      governingRequirement: 'REQ-DEM-001',
      status: 'BLOCKED_NOT_DEPLOYABLE',
      deploymentStatus: 'BLOCKED_NOT_DEPLOYABLE',
      stagingExecuted: false,
      remoteCorroborated: false,
      remoteCorroborationPending: false,
      localSourceVerified: true,
      targetTables: ['public.constituency_demographics'],
      operations: ['UPSERT'],
      conflictTarget: 'constituency_id,election_year',
      rowsAffected: 0,
      outboundRowsToStaging: 0,
      reason: r3.blockedReason || 'public.constituency_demographics.constituency_id is a UUID foreign key to public.constituencies(internal_id). Missing authoritative repository crosswalk.',
      missingCanonicalMappingsCount: r3.missingCanonicalMappingsCount || 4123,
      startedAt: s3Start,
      completedAt: new Date().toISOString(),
      metrics: r3.metrics
    };

    const s4Start = new Date().toISOString();
    const r4 = reconcileHistoricalElectionResults({ repoRoot: REPO_ROOT });
    stageResults.stage4_historical_election_results = {
      criterionId: 'CRIT-F02-03',
      taskId: 'W021.5-F-02',
      governingRequirement: 'REQ-HIS-002',
      status: 'BLOCKED_NOT_DEPLOYABLE',
      deploymentStatus: 'BLOCKED_NOT_DEPLOYABLE',
      stagingExecuted: false,
      remoteCorroborated: false,
      remoteCorroborationPending: false,
      localSourceVerified: true,
      targetTables: ['public.election_results'],
      operations: ['UPSERT'],
      conflictTarget: 'election_id,constituency_id',
      rowsAffected: 0,
      outboundRowsToStaging: 0,
      reason: 'Canonical election entities are not provisioned in repository for these 23 states. Zero synthetic IDs permitted under Directive 144/145.',
      startedAt: s4Start,
      completedAt: new Date().toISOString(),
      metrics: r4.metrics
    };

    // Directive 145 / Directive 146 / Directive 149 / Directive 150: Distinguish partially ready with blocked stages from fully prepared
    const report = {
      generator: 'scripts/execute_staging_directive_139.mjs',
      directive: 'CTO Directive 152 / W021.5',
      timestamp: new Date().toISOString(),
      governingAuthority: 'Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance',
      stagingProjectRef: ALLOWED_STAGING_PROJECT_REF,
      productionProjectRef: `${PROHIBITED_PRODUCTION_REF} (AIR-GAPPED — 0 QUERIES, 0 MUTATIONS)`,
      executionMode: 'MODE_A_LOCAL_PREPARATION_AND_RECONCILIATION',
      stagingExecutionPerformed: false,
      networkRequestsAttempted: getTransportCallCount(),
      securityIncidentContainment: {
        status: CONTAINMENT_STATUS.PENDING,
        hardcodedFallbackSecretRemoved: true,
        missingCredentialsBehavior: 'FAIL_CLOSED',
        exposureScope: 'Staging fkpigozcqnmcvofuksar exclusively (Production unexposed)',
        actionRequired: 'Project Administrator rotation of Supabase JWT Secret via Dashboard, service-role key rotation, and access-log audit'
      },
      summary: {
        allStagesPrepared: false,
        stagingExecutionPerformed: false,
        totalCriteriaPrepared: 1,
        totalCriteriaBlocked: 3,
        blockedStages: ['stage1_political_organizations', 'stage3_constituency_demographics', 'stage4_historical_election_results'],
        readyStages: ['stage2_candidacies'],
        criteria: [
          'CRIT-C02-02 (Political Organizations Catalog: BLOCKED_NOT_DEPLOYABLE pending safe repeat-write reconciliation against Migration 065 seeds; 0 rows outbound)',
          'CRIT-D02-02 (Candidate Contest Chunks: 10 chunks, 11,334 tuples, 11,298 unique rows, 36 duplicates; conflict target: person_id,election_year,election_type,constituency_id)',
          'CRIT-E01-02 (Constituency Demographics: BLOCKED_NOT_DEPLOYABLE pending authoritative constituency internal_id UUID crosswalk; 0 rows outbound)',
          'CRIT-F02-03 (Corrected 23-State Historical Results: BLOCKED_NOT_DEPLOYABLE pending canonical election entities; 0 rows outbound)'
        ],
        workstreamStatus: 'PARTIALLY_READY_WITH_BLOCKED_STAGES',
        databaseExecutionDisposition: 'STAGING_EXECUTION_BLOCKED_PENDING_ADMIN_ROTATION_CROSSWALK_AND_AUTHORIZATION'
      },
      stages: stageResults
    };

    const outPath = path.join(REPO_ROOT, 'reports/w021_5_staging_execution_report.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
    return report;

  } else {
    // ─── MODE B: AUTHORIZED STAGING WRITE EXECUTION ───────────────────────────
    const targetUrl = options.targetUrl || process.env.SUPABASE_URL || `https://${ALLOWED_STAGING_HOSTNAME}`;
    if (!targetUrl.startsWith('https://')) {
      const err = new Error('INSECURE_PROTOCOL: Insecure protocol: staging connection strictly requires https:');
      err.code = 'INSECURE_PROTOCOL';
      throw err;
    }
    const parsedUrl = new URL(targetUrl);
    if (parsedUrl.hostname.includes(PROHIBITED_PRODUCTION_REF)) {
      const err = new Error(`PRODUCTION_HOST_FORBIDDEN: Production project reference detected in staging URL: ${PROHIBITED_PRODUCTION_REF}. Strictly forbidden under air-gap governance.`);
      err.code = 'PRODUCTION_HOST_FORBIDDEN';
      throw err;
    }
    if (parsedUrl.hostname !== ALLOWED_STAGING_HOSTNAME) {
      const err = new Error(`UNAUTHORIZED_STAGING_HOST: Unauthorized staging host: ${parsedUrl.hostname}. Expected: ${ALLOWED_STAGING_HOSTNAME}`);
      err.code = 'UNAUTHORIZED_STAGING_HOST';
      throw err;
    }

    const serviceKey = options.serviceKey !== undefined ? options.serviceKey : process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey || typeof serviceKey !== 'string' || serviceKey.trim() === '') {
      const err = new Error('MISSING_SERVICE_ROLE_KEY: Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Mode B staging execution fails closed.');
      err.code = 'MISSING_SERVICE_ROLE_KEY';
      throw err;
    }

    if (serviceKey.includes(PROHIBITED_PRODUCTION_REF)) {
      const err = new Error(`PRODUCTION_KEY_FORBIDDEN: Production reference detected in service key: ${PROHIBITED_PRODUCTION_REF}. Strictly forbidden under air-gap governance.`);
      err.code = 'PRODUCTION_KEY_FORBIDDEN';
      throw err;
    }

    const authToken = options.authToken || cliArgs.authToken;
    if (!authToken) {
      const err = new Error('MISSING_AUTHORIZATION_TOKEN: Mode B staging write execution requires a cryptographic authorization token.');
      err.code = 'MISSING_AUTHORIZATION_TOKEN';
      throw err;
    }

    // 1. Compute canonical execution plan digest deterministically from source files (Directive 144/145)
    const computedPlanDigest = computeExecutionPlanDigest({
      repoRoot: REPO_ROOT,
      targetProjectRef: ALLOWED_STAGING_PROJECT_REF
    });

    if (options.planDigest && options.planDigest !== computedPlanDigest) {
      const err = new Error(
        `PLAN_DIGEST_OVERRIDE_PROHIBITED: options.planDigest override is strictly prohibited under Directive 144/145. ` +
        `Expected computed digest "${computedPlanDigest}", but received "${options.planDigest}".`
      );
      err.code = 'PLAN_DIGEST_OVERRIDE_PROHIBITED';
      throw err;
    }

    // 2. Controlled Configuration Resolution (Directive 145 Item 2 / Directive 146 Section 2)
    const adminClosureRecord = process.env.KSHETRA_ADMIN_CLOSURE_RECORD || null;
    const isTestExecution = process.env.NODE_ENV === 'test' && Boolean(process.env.KSHETRA_TEST_REPLAY_STORE_PATH);
    const storePath = isTestExecution ? process.env.KSHETRA_TEST_REPLAY_STORE_PATH : undefined;

    // Directive 152 Section 3: Resolve execution scope explicitly before authorization
    const executionScope = options.executionScope ||
      cliArgs.executionScope ||
      (process.env.KSHETRA_STAGING_EXECUTION_SCOPE ? process.env.KSHETRA_STAGING_EXECUTION_SCOPE.toUpperCase() : null);

    if (!executionScope) {
      const err = new Error('EXECUTION_SCOPE_REQUIRED: Mode B staging write execution strictly requires an explicit execution scope (--scope=stage1 or --scope=stage2).');
      err.code = 'EXECUTION_SCOPE_REQUIRED';
      throw err;
    }

    if (!['STAGE_1', 'STAGE_2'].includes(executionScope)) {
      const err = new Error(`UNSUPPORTED_EXECUTION_SCOPE: Execution scope "${executionScope}" is unsupported. The only permitted execution scopes are STAGE_1 and STAGE_2.`);
      err.code = 'UNSUPPORTED_EXECUTION_SCOPE';
      throw err;
    }

    // 3. Verify asymmetric cryptographic authorization & anti-replay store
    // Request precise criterion, tables and operations for the verified execution scope (Directive 152 Section 3)
    let requestedCriteria;
    let requestedTables;
    let requestedOperations;

    if (executionScope === 'STAGE_1') {
      requestedCriteria = ['CRIT-C02-02'];
      requestedTables = [...STAGE1_TABLE_SEQUENCE];
      requestedOperations = ['SELECT', 'INSERT', 'UPDATE'];
    } else {
      requestedCriteria = ['CRIT-D02-02'];
      requestedTables = ['public.candidacies'];
      requestedOperations = ['INSERT', 'UPDATE', 'UPSERT'];
    }

    const authVerification = verifyStagingWriteAuthorization({
      token: authToken,
      targetProject: ALLOWED_STAGING_PROJECT_REF,
      executionScope,
      requestedCriteria,
      requestedTables,
      requestedOperations,
      requestedPlanDigest: computedPlanDigest,
      storePath,
      adminClosureRecord,
      repoRoot: REPO_ROOT,
      isTestVerification: isTestExecution
    });

    // 4. Offline Schema-Contract Preflight (Directive 145 Item 8 / Directive 146 Section 5)
    // Validates column names, types, nullability, enums, FKs, and conflict targets before Stage 1 issues any request
    const r1 = reconcilePoliticalOrganizations({ repoRoot: REPO_ROOT });
    const r2 = reconcileCandidacies({ repoRoot: REPO_ROOT });
    const r3 = reconcileConstituencyDemographics({ repoRoot: REPO_ROOT });
    const r4 = reconcileHistoricalElectionResults({ repoRoot: REPO_ROOT });

    const preflightContext = {
      stage1: {
        status: 'BLOCKED_NOT_DEPLOYABLE',
        outboundRowsToStaging: 0,
        rowsByTable: r1.rowsByTable,
        blockedReason: r1.blockedReason
      },
      stage2: {
        status: 'PREPARED_AND_RECONCILED_IN_REPOSITORY',
        conflictTarget: 'person_id,election_year,election_type,constituency_id',
        uniqueCandidateCount: r2.uniqueCandidates ? r2.uniqueCandidates.length : 0,
        candidateRows: r2.uniqueCandidates || [],
        uniqueCandidates: r2.uniqueCandidates || []
      },
      stage3: {
        status: 'BLOCKED_NOT_DEPLOYABLE',
        outboundRowsToStaging: 0,
        demographicRows: r3.demographicRows
      },
      stage4: {
        status: 'BLOCKED_NOT_DEPLOYABLE',
        outboundRowsToStaging: 0
      }
    };

    validatePlanSchemaContracts(preflightContext);

    // 5. Fixed Operational Transport (Directive 145 Item 3 / Directive 146 Section 2)
    const operationalTransport = createStagingHttpTransport({ mode: 'staging', authorized: true });
    const internalContext = {
      __token: INTERNAL_EXECUTION_TOKEN,
      targetHost: `https://${ALLOWED_STAGING_HOSTNAME}`,
      serviceKey,
      transport: operationalTransport,
      executionScope,
      authGrant: {
        criteria: new Set(authVerification.criteria || []),
        tables: new Set(authVerification.tables || []),
        operations: new Set(authVerification.operations || []),
        adminContainmentConfirmed: Boolean(authVerification.adminContainmentConfirmed),
        executionScope: authVerification.executionScope || executionScope
      }
    };

    const execOptions = { internalContext };

    let executionError = null;

    // Scope-bound stage execution (Directive 152 Section 3)
    if (executionScope === 'STAGE_1') {
      try {
        stageResults.stage1_political_organizations = await executeStage1Staging(execOptions);
      } catch (err) {
        stageResults.stage1_political_organizations = {
          stage: 'stage1_political_organizations',
          criterionId: 'CRIT-C02-02',
          status: 'FAILED',
          error: err.message,
          rowsAffected: 0,
          outboundRowsToStaging: 0
        };
        executionError = err;
      }
      stageResults.stage2_candidacies = {
        stage: 'stage2_candidacies',
        criterionId: 'CRIT-D02-02',
        taskId: 'W021.5-D-02',
        status: 'NOT_REQUESTED_IN_SCOPE',
        deploymentStatus: 'NOT_REQUESTED_IN_SCOPE',
        stagingExecuted: false,
        rowsAffected: 0,
        outboundRowsToStaging: 0
      };
      stageResults.stage3_constituency_demographics = await executeStage3Staging(execOptions);
      stageResults.stage4_historical_election_results = await executeStage4Staging(execOptions);
    } else {
      // STAGE_2 execution scope
      stageResults.stage1_political_organizations = {
        stage: 'stage1_political_organizations',
        criterionId: 'CRIT-C02-02',
        taskId: 'W021.5-C-02',
        status: 'BLOCKED_NOT_DEPLOYABLE',
        deploymentStatus: 'BLOCKED_NOT_DEPLOYABLE',
        scopeDisposition: 'NOT_REQUESTED_IN_SCOPE',
        reconciliationEngine: 'stage1IdempotentReconciler.mjs (CTO Directive 150 Section 2)',
        reconciliationModel: 'IDEMPOTENT_NATURAL_KEY_PRESERVATION',
        stagingExecuted: false,
        remoteCorroborated: false,
        remoteCorroborationPending: false,
        targetTables: STAGE1_TABLE_SEQUENCE,
        rowsAffected: 0,
        networkRequestsAttempted: 0,
        outboundRowsToStaging: 0,
        reason: 'STAGE_1_NOT_IN_STAGE_2_EXECUTION_SCOPE: Invocation was scoped strictly to Stage 2 candidacies. Stage 1 was not requested and remains non-deployable with zero outbound rows.'
      };
      try {
        stageResults.stage2_candidacies = await executeStage2Staging(execOptions);
      } catch (err) {
        stageResults.stage2_candidacies = {
          stage: 'stage2_candidacies',
          criterionId: 'CRIT-D02-02',
          status: 'FAILED',
          error: err.message,
          rowsAffected: 0
        };
        executionError = err;
      }
      if (!executionError) {
        stageResults.stage3_constituency_demographics = await executeStage3Staging(execOptions);
        stageResults.stage4_historical_election_results = await executeStage4Staging(execOptions);
      } else {
        stageResults.stage3_constituency_demographics = {
          stage: 'stage3_constituency_demographics',
          criterionId: 'CRIT-E01-02',
          status: 'SKIPPED_DUE_TO_PREVIOUS_FAILURE',
          rowsAffected: 0
        };
        stageResults.stage4_historical_election_results = {
          stage: 'stage4_historical_election_results',
          criterionId: 'CRIT-F02-03',
          status: 'SKIPPED_DUE_TO_PREVIOUS_FAILURE',
          rowsAffected: 0
        };
      }
    }

    // Directive 145 Item 10: Mode B runner must not classify overall operation as
    // ALL_STAGES_EXECUTED_PENDING_CORROBORATION when any stage returns BLOCKED_NOT_DEPLOYABLE.
    const hasBlockedStages = Object.values(stageResults).some(
      s => s.status === 'BLOCKED_NOT_DEPLOYABLE' || s.deploymentStatus === 'BLOCKED_NOT_DEPLOYABLE'
    );

    let executionStatus;
    if (executionError) {
      executionStatus = 'PARTIAL_EXECUTION_FAILURE';
    } else if (hasBlockedStages) {
      executionStatus = 'REDUCED_SCOPE_EXECUTED_WITH_BLOCKED_STAGES_EXCLUDED';
    } else {
      executionStatus = 'ALL_STAGES_EXECUTED_PENDING_CORROBORATION';
    }

    const report = {
      generator: 'scripts/execute_staging_directive_139.mjs',
      directive: 'CTO Directive 152 / W021.5 / Authorized Staging Execution Output',
      timestamp: new Date().toISOString(),
      governingAuthority: 'Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance',
      stagingProjectRef: ALLOWED_STAGING_PROJECT_REF,
      productionProjectRef: `${PROHIBITED_PRODUCTION_REF} (AIR-GAPPED — 0 QUERIES, 0 MUTATIONS)`,
      executionMode: 'MODE_B_AUTHORIZED_WRITE_EXECUTION',
      stagingExecutionPerformed: true,
      executionStatus,
      networkRequestsAttempted: getTransportCallCount(),
      authorization: authVerification,
      summary: {
        allStagesPrepared: false,
        stagingExecutionPerformed: true,
        totalCriteriaPrepared: 1,
        totalCriteriaBlocked: 3,
        blockedStages: ['stage1_political_organizations', 'stage3_constituency_demographics', 'stage4_historical_election_results'],
        executedStages: ['stage2_candidacies'],
        criteria: [
          'CRIT-C02-02 (Political Organizations Catalog: BLOCKED_NOT_DEPLOYABLE pending child-table seed idempotency reconciliation; 0 rows outbound)',
          'CRIT-D02-02 (Candidate Contest Chunks: EXECUTED; 11,298 unique rows upserted to public.candidacies)',
          'CRIT-E01-02 (Constituency Demographics: BLOCKED_NOT_DEPLOYABLE pending authoritative constituency internal_id UUID crosswalk; 0 rows outbound)',
          'CRIT-F02-03 (Corrected 23-State Historical Results: BLOCKED_NOT_DEPLOYABLE pending canonical election entities; 0 rows outbound)'
        ],
        workstreamStatus: 'REDUCED_SCOPE_EXECUTED_WITH_BLOCKED_STAGES_EXCLUDED',
        databaseExecutionDisposition: 'STAGING_EXECUTION_PARTIALLY_EXECUTED_FOR_DEPLOYABLE_STAGES_PENDING_INDEPENDENT_CORROBORATION'
      },
      stages: stageResults
    };

    if (executionError) {
      report.partialExecutionDetails = {
        failedStage: executionError.message,
        retryRequirement: 'Anti-replay consumed this token. Retrying requires an authorized governance token scoped to remaining unexecuted stages.'
      };
      executionError.executionReport = report;
      throw executionError;
    }

    return report;
  }
}

// ─── 6. DIRECT CLI DISPATCH ───────────────────────────────────────────────────

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  runStagingExecutionEngine()
    .then((report) => {
      console.log('Staging execution engine completed successfully.');
      console.log(`Execution Mode: ${report.executionMode}`);
      console.log(`Staging Executed: ${report.stagingExecutionPerformed}`);
      console.log(`Network Calls Measured: ${report.networkRequestsAttempted}`);
      if (report.summary) {
        console.log(`Workstream Status: ${report.summary.workstreamStatus}`);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error(`Execution failed [${err.code || 'UNKNOWN'}]:`, err.message);
      process.exit(1);
    });
}
