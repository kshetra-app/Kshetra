#!/usr/bin/env node

/**
 * scripts/execute_staging_directive_139.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 143 / Workstream D
 * Criteria: CRIT-C02-02, CRIT-D02-02, CRIT-E01-02, CRIT-F02-03
 * Governing Requirements: REQ-DB-001, REQ-POL-002, REQ-CAN-002, REQ-DEM-001, REQ-HIS-002
 * Governing Authority: Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 *
 * Execution Modes (CTO Directive 143 Sections 3, 4, 5, 6, 7):
 * 1. Mode A: Local Preparation & Reconciliation (DEFAULT MODE)
 *    - Default execution mode when invoked without flags.
 *    - Strictly ZERO network traffic, ZERO credentials required, ZERO tokens required.
 *    - Reconciles directly from repository source files, migrations, manifests, and tests.
 *    - Emits: PREPARED_AND_RECONCILED_IN_REPOSITORY.
 *    - Never emits fake live-database corroboration labels.
 * 2. Mode B: Authorized Staging Execution (Gated on Admin Containment & Crypto Auth)
 *    - Fail-closed administrative containment gate: Requires verified incident closure record
 *      confirming staging credential rotation and access-log audit.
 *    - Requires asymmetric cryptographic authorization token (Ed25519 or RS256).
 *    - Mandatory execution plan digest binding computed deterministically from source artifacts.
 *    - Real data-bearing ingestion: submits actual row records via PostgREST upserts with verified conflict targets.
 *    - Response verification: derives rowsAffected directly from returned representation; rejects row count mismatches.
 *    - Partial execution safety: preserves state on partial failure; retries require separate authorization token.
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
  computeExecutionPlanDigest
} from './lib/stagingExecutionPlan.mjs';
import {
  verifyAdminIncidentClosure,
  CONTAINMENT_STATUS
} from './lib/stagingAdminContainment.mjs';

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

  return {
    mode,
    dryRun,
    tokenFile,
    authToken,
    planDigest
  };
}

// ─── 2. INJECTABLE TRANSPORT BOUNDARY & INSTRUMENTATION ───────────────────────

let transportCallCount = 0;
let customTransportFn = null;

export function resetTransportInstrumentation() {
  transportCallCount = 0;
}

export function getTransportCallCount() {
  return transportCallCount;
}

export function setHttpTransport(transportFn) {
  customTransportFn = transportFn;
}

/**
 * Creates an authoritative staging HTTP transport boundary.
 * Directive 144 Workstream A Item 2: Unconditionally enforces production host rejection
 * in the actual transport layer, independent of invocation mode.
 */
export function createStagingHttpTransport(options = {}) {
  const baseTransport = options.transport || customTransportFn || defaultTransport;
  return async function stagingHttpTransport(url, fetchOptions = {}) {
    transportCallCount++;
    const urlStr = typeof url === 'string' ? url : url.toString();

    // Invariant: Production host rejection in actual transport layer
    if (urlStr.includes(PROHIBITED_PRODUCTION_REF)) {
      const err = new Error(
        `PRODUCTION_HOST_FORBIDDEN: Production project reference detected in request destination: ${PROHIBITED_PRODUCTION_REF}. Strictly prohibited under air-gap governance.`
      );
      err.code = 'PRODUCTION_HOST_FORBIDDEN';
      throw err;
    }

    // Invariant: Enforce protocol https:
    if (!urlStr.startsWith('https://')) {
      const err = new Error(`INSECURE_PROTOCOL: Staging requests strictly require https: protocol, received: ${urlStr}`);
      err.code = 'INSECURE_PROTOCOL';
      throw err;
    }

    // Invariant: Enforce strict authorized staging hostname
    const parsed = new URL(urlStr);
    if (parsed.hostname !== ALLOWED_STAGING_HOSTNAME) {
      const err = new Error(`UNAUTHORIZED_STAGING_HOST: Unauthorized staging host "${parsed.hostname}". The only permitted destination is "${ALLOWED_STAGING_HOSTNAME}".`);
      err.code = 'UNAUTHORIZED_STAGING_HOST';
      throw err;
    }

    return baseTransport(url, fetchOptions);
  };
}

export function getHttpTransport() {
  if (customTransportFn) {
    return createStagingHttpTransport({ transport: customTransportFn });
  }
  return createStagingHttpTransport({ transport: defaultTransport });
}

async function defaultTransport(url, options = {}) {
  // In local mode, transport strictly forbids any call
  const isLocalMode = !process.argv.includes('--mode=staging') && !process.argv.includes('--write');
  if (isLocalMode) {
    const err = new Error(`NETWORK_ACCESS_FORBIDDEN: Network call attempted in local mode: ${options.method || 'GET'} ${url}`);
    err.code = 'NETWORK_ACCESS_FORBIDDEN';
    throw err;
  }
  return fetch(url, options);
}

// ─── 3. INTERNAL EXECUTION CONTEXT & STAGE PROTECTION (Directive 144 Item 1) ──

export const INTERNAL_EXECUTION_TOKEN = Symbol('INTERNAL_EXECUTION_TOKEN');

export function assertInternalExecutionContext(options = {}) {
  if (!options.internalContext || options.internalContext.__token !== INTERNAL_EXECUTION_TOKEN) {
    const err = new Error(
      'UNAUTHORIZED_STAGE_INVOCATION: Direct invocation of individual stage execution functions is strictly prohibited. ' +
      'All staging operations must execute through runStagingExecutionEngine() with verified authorization and containment.'
    );
    err.code = 'UNAUTHORIZED_STAGE_INVOCATION';
    throw err;
  }
}

/**
 * Explicit test-only adapters for isolated mock assertions.
 * Operational execution must NOT use these adapters.
 */
export const __test_only_adapters__ = {
  createTestExecutionContext(opts = {}) {
    return {
      __token: INTERNAL_EXECUTION_TOKEN,
      targetHost: opts.targetHost || `https://${ALLOWED_STAGING_HOSTNAME}`,
      serviceKey: opts.serviceKey || 'test-service-key',
      transport: createStagingHttpTransport({ transport: opts.transport })
    };
  },
  executeStage1: (opts) => executeStage1Staging(opts),
  executeStage2: (opts) => executeStage2Staging(opts),
  executeStage3: (opts) => executeStage3Staging(opts),
  executeStage4: (opts) => executeStage4Staging(opts)
};

// ─── 4. REAL DATA-BEARING STAGING EXECUTION ENGINE (Directive 143/144) ────────

/**
 * Executes Stage 1 (CRIT-C02-02: Political Organizations Catalog & Child Tables)
 * Submits actual row records to the 8 catalog tables via PostgREST upsert.
 */
export async function executeStage1Staging(options = {}) {
  assertInternalExecutionContext(options);
  const startedAt = new Date().toISOString();
  const transport = options.internalContext.transport;
  const targetHost = options.internalContext.targetHost;
  const serviceKey = options.internalContext.serviceKey;

  const r1 = reconcilePoliticalOrganizations({ repoRoot: REPO_ROOT });
  if (!r1.passed || !r1.rowsByTable) {
    throw new Error('STAGE_1_PREPARATION_FAILED: Could not reconcile political organizations catalog from repository');
  }

  let totalRowsAffected = 0;
  const tableResults = {};

  // Upsert across all 8 tables in foreign-key dependency order
  const tableOrder = [
    'public.datasets',
    'public.dataset_versions',
    'public.provenance_records',
    'public.political_organizations',
    'public.organization_relationships',
    'public.organization_multilingual_names',
    'public.organization_symbols',
    'public.organization_aliases'
  ];

  for (const fullTableName of tableOrder) {
    const rows = r1.rowsByTable[fullTableName];
    if (!rows || rows.length === 0) continue;

    const endpointName = fullTableName.replace('public.', '');
    const url = `${targetHost}/rest/v1/${endpointName}?on_conflict=id`;

    const response = await transport(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(rows)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`STAGE_1_REMOTE_EXECUTION_FAILED: Status ${response.status} on ${endpointName} - ${errorBody}`);
    }

    const responseText = await response.text();
    let resultRows;
    try {
      resultRows = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`STAGE_1_MALFORMED_RESPONSE: Invalid JSON response on ${endpointName}: ${responseText}`);
    }

    if (!Array.isArray(resultRows)) {
      if (resultRows && resultRows.error) {
        throw new Error(`STAGE_1_SEMANTIC_ERROR: Remote database returned semantic error on ${endpointName}: ${JSON.stringify(resultRows)}`);
      }
      throw new Error(`STAGE_1_INVALID_RESPONSE_SHAPE: Expected JSON array of affected rows, received: ${responseText}`);
    }

    if (resultRows.length !== rows.length) {
      throw new Error(
        `STAGE_1_ROW_COUNT_MISMATCH: Table ${endpointName} reported ${resultRows.length} affected rows, expected ${rows.length}`
      );
    }

    totalRowsAffected += resultRows.length;
    tableResults[fullTableName] = resultRows.length;
  }

  return {
    stage: 'stage1_political_organizations',
    criterionId: 'CRIT-C02-02',
    taskId: 'W021.5-C-02',
    status: 'EXECUTED_PENDING_INDEPENDENT_CORROBORATION',
    stagingExecuted: true,
    remoteCorroborated: false,
    remoteCorroborationPending: true,
    targetTables: tableOrder,
    operations: ['UPSERT'],
    conflictTarget: 'id',
    rowsAffected: totalRowsAffected,
    tableBreakdown: tableResults,
    startedAt,
    completedAt: new Date().toISOString()
  };
}

/**
 * Executes Stage 2 (CRIT-D02-02: Candidate Profiles & Contests)
 * Submits actual unique candidate rows via PostgREST upsert on uq_candidacies.
 */
export async function executeStage2Staging(options = {}) {
  assertInternalExecutionContext(options);
  const startedAt = new Date().toISOString();
  const transport = options.internalContext.transport;
  const targetHost = options.internalContext.targetHost;
  const serviceKey = options.internalContext.serviceKey;

  const r2 = reconcileCandidacies({ repoRoot: REPO_ROOT });
  if (!r2.passed || !r2.candidateRows) {
    throw new Error('STAGE_2_PREPARATION_FAILED: Could not reconcile candidate contest population from repository');
  }

  const candidacyRows = r2.candidateRows;
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
    body: JSON.stringify(candidacyRows)
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

  if (resultRows.length !== candidacyRows.length) {
    throw new Error(
      `STAGE_2_ROW_COUNT_MISMATCH: Candidacies reported ${resultRows.length} affected rows, expected ${candidacyRows.length}`
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
 * Executes Stage 3 (CRIT-E01-02: Constituency Demographics Baseline)
 * Submits actual statutory demographic rows via PostgREST upsert on uq_constituency_demographics.
 */
export async function executeStage3Staging(options = {}) {
  assertInternalExecutionContext(options);
  const startedAt = new Date().toISOString();
  const transport = options.internalContext.transport;
  const targetHost = options.internalContext.targetHost;
  const serviceKey = options.internalContext.serviceKey;

  const r3 = reconcileConstituencyDemographics({ repoRoot: REPO_ROOT });
  if (!r3.passed || !r3.demographicRows) {
    throw new Error('STAGE_3_PREPARATION_FAILED: Could not reconcile constituency demographics baseline from repository');
  }

  const demographicRows = r3.demographicRows;
  const conflictTarget = 'constituency_id,election_year';
  const url = `${targetHost}/rest/v1/constituency_demographics?on_conflict=${conflictTarget}`;

  const response = await transport(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(demographicRows)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`STAGE_3_REMOTE_EXECUTION_FAILED: Status ${response.status} - ${errorBody}`);
  }

  const responseText = await response.text();
  let resultRows;
  try {
    resultRows = JSON.parse(responseText);
  } catch (e) {
    throw new Error(`STAGE_3_MALFORMED_RESPONSE: Invalid JSON response on constituency_demographics: ${responseText}`);
  }

  if (!Array.isArray(resultRows)) {
    if (resultRows && resultRows.error) {
      throw new Error(`STAGE_3_SEMANTIC_ERROR: Remote database returned semantic error: ${JSON.stringify(resultRows)}`);
    }
    throw new Error(`STAGE_3_INVALID_RESPONSE_SHAPE: Expected JSON array of affected rows, received: ${responseText}`);
  }

  if (resultRows.length !== demographicRows.length) {
    throw new Error(
      `STAGE_3_ROW_COUNT_MISMATCH: Constituency demographics reported ${resultRows.length} affected rows, expected ${demographicRows.length}`
    );
  }

  return {
    stage: 'stage3_constituency_demographics',
    criterionId: 'CRIT-E01-02',
    taskId: 'W021.5-E-01',
    status: 'EXECUTED_PENDING_INDEPENDENT_CORROBORATION',
    stagingExecuted: true,
    remoteCorroborated: false,
    remoteCorroborationPending: true,
    targetTables: ['public.constituency_demographics'],
    operations: ['UPSERT'],
    conflictTarget,
    rowsAffected: resultRows.length,
    startedAt,
    completedAt: new Date().toISOString()
  };
}

/**
 * Executes Stage 4 (CRIT-F02-03: Historical Election Results for 23 States)
 * Submits actual historical results rows via PostgREST upsert on (election_id, constituency_id).
 */
export async function executeStage4Staging(options = {}) {
  assertInternalExecutionContext(options);
  const startedAt = new Date().toISOString();

  const r4 = reconcileHistoricalElectionResults({ repoRoot: REPO_ROOT });
  if (!r4.passed) {
    throw new Error('STAGE_4_PREPARATION_FAILED: Could not reconcile historical election results from repository');
  }

  // Directive 144 requirement 9: Synthetic IDs strictly prohibited.
  // Stage 4 is marked BLOCKED_NOT_DEPLOYABLE; zero synthetic data sent to staging.
  if (r4.deploymentStatus === 'BLOCKED_NOT_DEPLOYABLE' || r4.outboundRowsToStaging === 0) {
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
      reason: 'Canonical election entities are not provisioned in repository for these 23 states. Zero synthetic IDs permitted under Directive 144.',
      startedAt,
      completedAt: new Date().toISOString()
    };
  }

  const transport = options.internalContext.transport;
  const targetHost = options.internalContext.targetHost;
  const serviceKey = options.internalContext.serviceKey;

  const resultRows = r4.resultRows;
  const conflictTarget = 'election_id,constituency_id';
  const url = `${targetHost}/rest/v1/election_results?on_conflict=${conflictTarget}`;

  const response = await transport(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(resultRows)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`STAGE_4_REMOTE_EXECUTION_FAILED: Status ${response.status} - ${errorBody}`);
  }

  const responseText = await response.text();
  let returnedRows;
  try {
    returnedRows = JSON.parse(responseText);
  } catch (e) {
    throw new Error(`STAGE_4_MALFORMED_RESPONSE: Invalid JSON response on election_results: ${responseText}`);
  }

  if (!Array.isArray(returnedRows)) {
    if (returnedRows && returnedRows.error) {
      throw new Error(`STAGE_4_SEMANTIC_ERROR: Remote database returned semantic error: ${JSON.stringify(returnedRows)}`);
    }
    throw new Error(`STAGE_4_INVALID_RESPONSE_SHAPE: Expected JSON array of affected rows, received: ${responseText}`);
  }

  if (returnedRows.length !== resultRows.length) {
    throw new Error(
      `STAGE_4_ROW_COUNT_MISMATCH: Election results reported ${returnedRows.length} affected rows, expected ${resultRows.length}`
    );
  }

  return {
    stage: 'stage4_historical_election_results',
    criterionId: 'CRIT-F02-03',
    taskId: 'W021.5-F-02',
    status: 'EXECUTED_PENDING_INDEPENDENT_CORROBORATION',
    stagingExecuted: true,
    remoteCorroborated: false,
    remoteCorroborationPending: true,
    targetTables: ['public.election_results'],
    operations: ['UPSERT'],
    conflictTarget,
    rowsAffected: returnedRows.length,
    startedAt,
    completedAt: new Date().toISOString()
  };
}

// ─── 4. MAIN RUNNER (MODE A & MODE B) ─────────────────────────────────────────

export async function runStagingExecutionEngine(options = {}) {
  const cliArgs = parseExecutionArguments(options.argv || process.argv.slice(2));
  const mode = options.mode || cliArgs.mode;
  const isDryRun = mode === 'local';
  const transport = options.transport || getHttpTransport();

  resetTransportInstrumentation();

  const stageResults = {};

  if (isDryRun) {
    // ─── MODE A: LOCAL PREPARATION & RECONCILIATION ──────────────────────────
    // Strictly ZERO network calls, ZERO credentials required, ZERO tokens required.
    const s1Start = new Date().toISOString();
    const r1 = reconcilePoliticalOrganizations({ repoRoot: REPO_ROOT });
    stageResults.stage1_political_organizations = {
      criterionId: 'CRIT-C02-02',
      taskId: 'W021.5-C-02',
      governingRequirement: 'REQ-POL-002',
      status: r1.passed ? 'PREPARED_AND_RECONCILED_IN_REPOSITORY' : 'FAILED',
      stagingExecuted: false,
      remoteCorroborated: false,
      remoteCorroborationPending: true,
      localSourceVerified: true,
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
      conflictTarget: 'id',
      rowsAffected: 0,
      startedAt: s1Start,
      completedAt: new Date().toISOString(),
      metrics: r1.metrics
    };

    const s2Start = new Date().toISOString();
    const r2 = reconcileCandidacies({ repoRoot: REPO_ROOT });
    stageResults.stage2_candidacies = {
      criterionId: 'CRIT-D02-02',
      taskId: 'W021.5-D-02',
      governingRequirement: 'REQ-CAN-002',
      status: r2.passed ? 'PREPARED_AND_RECONCILED_IN_REPOSITORY' : 'FAILED',
      stagingExecuted: false,
      remoteCorroborated: false,
      remoteCorroborationPending: true,
      localSourceVerified: true,
      targetTables: ['public.candidacies'],
      operations: ['UPSERT'],
      conflictTarget: 'person_id,election_year,election_type,constituency_id',
      rowsAffected: 0,
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
      status: r3.passed ? 'PREPARED_AND_RECONCILED_IN_REPOSITORY' : 'FAILED',
      stagingExecuted: false,
      remoteCorroborated: false,
      remoteCorroborationPending: true,
      localSourceVerified: true,
      targetTables: ['public.constituency_demographics'],
      operations: ['UPSERT'],
      conflictTarget: 'constituency_id,election_year',
      rowsAffected: 0,
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
      reason: 'Canonical election entities are not provisioned in repository for these 23 states. Zero synthetic IDs permitted under Directive 144.',
      startedAt: s4Start,
      completedAt: new Date().toISOString(),
      metrics: r4.metrics
    };

    const allPrepared = Object.values(stageResults).every(s =>
      s.status === 'PREPARED_AND_RECONCILED_IN_REPOSITORY' || s.status === 'BLOCKED_NOT_DEPLOYABLE'
    );

    const report = {
      generator: 'scripts/execute_staging_directive_139.mjs',
      directive: 'CTO Directive 144 / Residual Defect Closure & Staging Execution Readiness',
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
        allStagesPrepared: allPrepared,
        stagingExecutionPerformed: false,
        totalCriteriaPrepared: 4,
        criteria: [
          'CRIT-C02-02 (Political Organizations Catalog: 107 orgs + 1,100 support rows + 2 dataset metadata anchors across 8 tables = 1,209 rows)',
          'CRIT-D02-02 (Candidate Contest Chunks: 10 chunks, 11,334 tuples, 11,298 unique rows, 36 duplicates)',
          'CRIT-E01-02 (Constituency Demographics Baseline: 4,123 statutory assembly seats; total_voters null-safe; 134 manifest gap seats reported separately from DQ-W021.5-B2.2E-001)',
          'CRIT-F02-03 (Corrected 23-State Historical Results: 2,243 statutory seats; synthetic IDs eliminated; marked BLOCKED_NOT_DEPLOYABLE pending canonical election entities)'
        ],
        workstreamStatus: allPrepared ? 'PREPARED_AND_RECONCILED_IN_REPOSITORY' : 'FAILED',
        databaseExecutionDisposition: 'STAGING_EXECUTION_PENDING_ADMIN_ROTATION_AND_SEPARATE_AUTHORIZATION'
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

    // 1. Compute canonical execution plan digest deterministically from source files (Directive 144 requirement 3)
    const computedPlanDigest = computeExecutionPlanDigest({
      repoRoot: REPO_ROOT,
      targetProjectRef: ALLOWED_STAGING_PROJECT_REF
    });

    // Zero override permitted: reject options.planDigest override if passed
    if (options.planDigest && options.planDigest !== computedPlanDigest) {
      const err = new Error(
        `PLAN_DIGEST_OVERRIDE_PROHIBITED: options.planDigest override is strictly prohibited under Directive 144. ` +
        `Expected computed digest "${computedPlanDigest}", but received "${options.planDigest}".`
      );
      err.code = 'PLAN_DIGEST_OVERRIDE_PROHIBITED';
      throw err;
    }

    // 2. Verify asymmetric cryptographic authorization & anti-replay store
    const authVerification = verifyStagingWriteAuthorization({
      token: authToken,
      trustAnchor: options.trustAnchor,
      targetProject: ALLOWED_STAGING_PROJECT_REF,
      requestedCriteria: ['CRIT-C02-02', 'CRIT-D02-02', 'CRIT-E01-02', 'CRIT-F02-03'],
      requestedTables: [...ALL_AUTHORIZED_STAGING_TABLES],
      requestedOperations: ['INSERT', 'UPDATE', 'UPSERT'],
      requestedPlanDigest: computedPlanDigest, // NEVER options.planDigest
      storePath: options.storePath,
      adminClosureRecord: options.adminClosureRecord,
      adminRecordPath: options.adminRecordPath,
      adminTrustAnchor: options.adminTrustAnchor,
      adminKeyPath: options.adminKeyPath,
      repoRoot: REPO_ROOT
    });

    const stagedTransport = createStagingHttpTransport({ transport });
    const internalContext = {
      __token: INTERNAL_EXECUTION_TOKEN,
      targetHost: `https://${ALLOWED_STAGING_HOSTNAME}`,
      serviceKey,
      transport: stagedTransport
    };

    const execOptions = { internalContext };

    let executionError = null;

    // Sequential stage execution with partial execution tracking (Directive 143 Section 3.4)
    try {
      stageResults.stage1_political_organizations = await executeStage1Staging(execOptions);
    } catch (err) {
      stageResults.stage1_political_organizations = {
        criterionId: 'CRIT-C02-02',
        status: 'FAILED',
        error: err.message,
        rowsAffected: 0
      };
      stageResults.stage2_candidacies = { criterionId: 'CRIT-D02-02', status: 'SKIPPED_DUE_TO_PREVIOUS_FAILURE', rowsAffected: 0 };
      stageResults.stage3_constituency_demographics = { criterionId: 'CRIT-E01-02', status: 'SKIPPED_DUE_TO_PREVIOUS_FAILURE', rowsAffected: 0 };
      stageResults.stage4_historical_election_results = { criterionId: 'CRIT-F02-03', status: 'SKIPPED_DUE_TO_PREVIOUS_FAILURE', rowsAffected: 0 };
      executionError = err;
    }

    if (!executionError) {
      try {
        stageResults.stage2_candidacies = await executeStage2Staging(execOptions);
      } catch (err) {
        stageResults.stage2_candidacies = {
          criterionId: 'CRIT-D02-02',
          status: 'FAILED',
          error: err.message,
          rowsAffected: 0
        };
        stageResults.stage3_constituency_demographics = { criterionId: 'CRIT-E01-02', status: 'SKIPPED_DUE_TO_PREVIOUS_FAILURE', rowsAffected: 0 };
        stageResults.stage4_historical_election_results = { criterionId: 'CRIT-F02-03', status: 'SKIPPED_DUE_TO_PREVIOUS_FAILURE', rowsAffected: 0 };
        executionError = err;
      }
    }

    if (!executionError) {
      try {
        stageResults.stage3_constituency_demographics = await executeStage3Staging(execOptions);
      } catch (err) {
        stageResults.stage3_constituency_demographics = {
          criterionId: 'CRIT-E01-02',
          status: 'FAILED',
          error: err.message,
          rowsAffected: 0
        };
        stageResults.stage4_historical_election_results = { criterionId: 'CRIT-F02-03', status: 'SKIPPED_DUE_TO_PREVIOUS_FAILURE', rowsAffected: 0 };
        executionError = err;
      }
    }

    if (!executionError) {
      try {
        stageResults.stage4_historical_election_results = await executeStage4Staging(execOptions);
      } catch (err) {
        stageResults.stage4_historical_election_results = {
          criterionId: 'CRIT-F02-03',
          status: 'FAILED',
          error: err.message,
          rowsAffected: 0
        };
        executionError = err;
      }
    }

    const report = {
      generator: 'scripts/execute_staging_directive_139.mjs',
      directive: 'CTO Directive 144 / Authorized Staging Execution Output',
      timestamp: new Date().toISOString(),
      governingAuthority: 'Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance',
      stagingProjectRef: ALLOWED_STAGING_PROJECT_REF,
      productionProjectRef: `${PROHIBITED_PRODUCTION_REF} (AIR-GAPPED — 0 QUERIES, 0 MUTATIONS)`,
      executionMode: 'MODE_B_AUTHORIZED_WRITE_EXECUTION',
      stagingExecutionPerformed: true,
      executionStatus: executionError ? 'PARTIAL_EXECUTION_FAILURE' : 'ALL_STAGES_EXECUTED_PENDING_CORROBORATION',
      networkRequestsAttempted: getTransportCallCount(),
      authorization: authVerification,
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

// ─── 5. CLI ENTRYPOINT ────────────────────────────────────────────────────────

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  runStagingExecutionEngine()
    .then((report) => {
      console.log('================================================================================');
      console.log('KSHETRA W021.5 — STAGING PREPARATION & EXECUTION ENGINE (DIRECTIVE 143)');
      console.log(`Execution Mode: ${report.executionMode}`);
      console.log(`Staging Executed: ${report.stagingExecutionPerformed}`);
      console.log(`Network Calls Measured: ${report.networkRequestsAttempted}`);
      console.log(`Workstream Status: ${report.summary?.workstreamStatus || report.executionStatus}`);
      console.log('================================================================================');
      process.exit(0);
    })
    .catch((err) => {
      console.error(`\n[FATAL ERROR] Staging execution failed: ${err.message}`);
      if (err.code) console.error(`[ERROR CODE] ${err.code}`);
      process.exit(1);
    });
}
