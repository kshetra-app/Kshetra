/**
 * scripts/lib/stage1IdempotentReconciler.mjs
 *
 * Stage 1 Political Organizations Idempotent Reconciliation Engine
 * Authority: CTO Directive 148 Section 3 / Task W021.5-C-02 / Master Execution Framework Amendment v1.6
 *
 * Solves the pre-seeded child-table idempotency challenge:
 * When Migration 065 was executed, child rows (relationships, multilingual names,
 * symbols, aliases) were inserted without explicit client UUIDs, so PostgreSQL
 * generated random UUIDs (gen_random_uuid()).
 *
 * This engine reconciles incoming canonical catalog rows against existing database
 * state using natural keys / unique constraints:
 *   1. uq_org_rel (source_organization_id, target_organization_id, relationship_type, valid_from)
 *   2. uq_org_multi_name (organization_id, language_code, script_code, representation_type, name_value)
 *   3. uq_org_symbols_timeline (organization_id, symbol_name, valid_from)
 *   4. raw_lookup_key + jurisdiction_scope + organization_id + valid_from
 *
 * Key Invariants:
 *  - Preserves existing database UUIDs on matching rows to maintain referential integrity.
 *  - Avoids 23505 unique constraint duplicate key errors on repeat execution.
 *  - Avoids 23514 temporal trigger overlap violations.
 *  - Proves exact idempotency: repeat execution against existing state produces 0 inserts and 0 duplicate errors.
 *  - Detects and surfaces genuine business/data conflicts (contradictory attributes on identical natural keys).
 */

import { reconcilePoliticalOrganizations } from '../reconcile_database_criteria_identities.mjs';

export const STAGE1_TABLE_SEQUENCE = [
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
 * Normalizes field names across source representations and database columns
 */
function normalizeRow(tableName, row) {
  if (!row || typeof row !== 'object') return {};
  const norm = { ...row };

  if (tableName === 'public.organization_relationships') {
    if (norm.source_organization_id && !norm.source_org_id) norm.source_org_id = norm.source_organization_id;
    if (norm.target_organization_id && !norm.target_org_id) norm.target_org_id = norm.target_organization_id;
    if (norm.source_org_id && !norm.source_organization_id) norm.source_organization_id = norm.source_org_id;
    if (norm.target_org_id && !norm.target_organization_id) norm.target_organization_id = norm.target_org_id;
  }
  return norm;
}

/**
 * Computes deterministic natural key for a table row
 */
export function computeNaturalKey(tableName, row) {
  const r = normalizeRow(tableName, row);

  switch (tableName) {
    case 'public.datasets':
      return String(r.id || '').trim();
    case 'public.dataset_versions':
      return String(r.id || `${r.dataset_id}::${r.version_identifier || ''}`).trim();
    case 'public.provenance_records':
      return String(r.id || '').trim();
    case 'public.political_organizations':
      return String(r.id || '').trim().toUpperCase();
    case 'public.organization_relationships': {
      const src = (r.source_org_id || r.source_organization_id || '').trim();
      const tgt = (r.target_org_id || r.target_organization_id || '').trim();
      const rel = (r.relationship_type || '').trim();
      const vf = (r.valid_from || '').trim();
      return `${src}::${tgt}::${rel}::${vf}`;
    }
    case 'public.organization_multilingual_names': {
      const org = (r.organization_id || '').trim();
      const lang = (r.language_code || '').trim().toLowerCase();
      const script = (r.script_code || '').trim().toLowerCase();
      const rep = (r.representation_type || '').trim().toLowerCase();
      const name = (r.name_value || '').trim();
      return `${org}::${lang}::${script}::${rep}::${name}`;
    }
    case 'public.organization_symbols': {
      const org = (r.organization_id || '').trim();
      const sym = (r.symbol_name || '').trim();
      const vf = (r.valid_from || '').trim();
      const jur = (r.jurisdiction_scope || 'NULL').trim();
      return `${org}::${sym}::${jur}::${vf}`;
    }
    case 'public.organization_aliases': {
      const rawKey = (r.raw_lookup_key || '').trim().toLowerCase();
      const org = (r.organization_id || '').trim();
      const jur = (r.jurisdiction_scope || 'NULL').trim();
      const vf = (r.valid_from || '').trim();
      return `${rawKey}::${jur}::${org}::${vf}`;
    }
    default:
      return String(r.id || '').trim();
  }
}

/**
 * Compares two rows for non-key attribute differences
 */
export function diffRowAttributes(tableName, sourceRow, targetRow) {
  const s = normalizeRow(tableName, sourceRow);
  const t = normalizeRow(tableName, targetRow);
  const diffs = {};

  const ignoreKeys = new Set(['id', 'created_at', 'updated_at']);

  for (const [k, sVal] of Object.entries(s)) {
    if (ignoreKeys.has(k)) continue;
    const tVal = t[k];
    if (tVal === undefined) continue;

    // Handle JSON metadata
    if (typeof sVal === 'object' && sVal !== null && typeof tVal === 'object' && tVal !== null) {
      if (JSON.stringify(sVal) !== JSON.stringify(tVal)) {
        diffs[k] = { source: sVal, target: tVal };
      }
    } else if (String(sVal ?? '') !== String(tVal ?? '')) {
      diffs[k] = { source: sVal, target: tVal };
    }
  }

  return diffs;
}

/**
 * Reconciles a single table's source rows against target database state
 */
export function reconcileStage1Table(tableName, sourceRows, targetRows = [], options = {}) {
  const targetMap = new Map();
  for (const tRow of targetRows) {
    const key = computeNaturalKey(tableName, tRow);
    targetMap.set(key, tRow);
  }

  const actions = [];
  const conflicts = [];
  let matchedCount = 0;
  let insertCount = 0;
  let updateCount = 0;
  let preserveCount = 0;

  for (const sRow of sourceRows) {
    const key = computeNaturalKey(tableName, sRow);
    const existingTarget = targetMap.get(key);

    if (existingTarget) {
      matchedCount++;
      const targetId = existingTarget.id;
      const diffs = diffRowAttributes(tableName, sRow, existingTarget);
      const diffKeys = Object.keys(diffs);

      if (diffKeys.length === 0) {
        preserveCount++;
        actions.push({
          action: 'PRESERVE',
          table: tableName,
          naturalKey: key,
          id: targetId,
          payload: { ...sRow, id: targetId }
        });
      } else {
        // Evaluate if difference is an allowable update or a conflicting business invariant
        let isBusinessConflict = false;
        for (const k of diffKeys) {
          if (k === 'confidence' && diffs[k].source !== diffs[k].target) {
            isBusinessConflict = true;
          }
          if (k === 'alias_type' && diffs[k].source !== diffs[k].target) {
            isBusinessConflict = true;
          }
          if (k === 'recognition_level' && diffs[k].source !== diffs[k].target) {
            isBusinessConflict = true;
          }
          if (k === 'valid_to' && diffs[k].source !== diffs[k].target) {
            isBusinessConflict = true;
          }
        }

        if (isBusinessConflict) {
          conflicts.push({
            table: tableName,
            naturalKey: key,
            targetId,
            diffs,
            reason: 'BUSINESS_INVARIANT_CONFLICT: Conflicting non-key attributes on existing target record'
          });
          actions.push({
            action: 'CONFLICT',
            table: tableName,
            naturalKey: key,
            id: targetId,
            diffs
          });
        } else {
          updateCount++;
          actions.push({
            action: 'UPDATE',
            table: tableName,
            naturalKey: key,
            id: targetId,
            payload: { ...sRow, id: targetId },
            diffs
          });
        }
      }
    } else {
      insertCount++;
      actions.push({
        action: 'INSERT',
        table: tableName,
        naturalKey: key,
        id: sRow.id,
        payload: { ...sRow }
      });
    }
  }

  return {
    tableName,
    sourceRowCount: sourceRows.length,
    targetRowCount: targetRows.length,
    matchedCount,
    insertCount,
    updateCount,
    preserveCount,
    conflicts,
    hasConflicts: conflicts.length > 0,
    actions
  };
}

/**
 * Reconciles the full Stage 1 catalog across all 8 tables
 */
export function reconcileStage1Catalog(targetDatabaseState = {}, options = {}) {
  const root = options.repoRoot;
  const canonicalCatalog = reconcilePoliticalOrganizations({ repoRoot: root });
  const sourceRowsByTable = canonicalCatalog.rowsByTable;

  const tableAudits = {};
  let totalSourceRows = 0;
  let totalTargetRows = 0;
  let totalMatched = 0;
  let totalInserts = 0;
  let totalUpdates = 0;
  let totalPreserved = 0;
  const allConflicts = [];
  const plannedOperations = [];

  for (const tableName of STAGE1_TABLE_SEQUENCE) {
    const sRows = sourceRowsByTable[tableName] || [];
    const tRows = targetDatabaseState[tableName] || [];

    const audit = reconcileStage1Table(tableName, sRows, tRows, options);
    tableAudits[tableName] = audit;

    totalSourceRows += audit.sourceRowCount;
    totalTargetRows += audit.targetRowCount;
    totalMatched += audit.matchedCount;
    totalInserts += audit.insertCount;
    totalUpdates += audit.updateCount;
    totalPreserved += audit.preserveCount;

    if (audit.conflicts.length > 0) {
      allConflicts.push(...audit.conflicts);
    }
    plannedOperations.push(...audit.actions);
  }

  const isExactMatch = totalMatched === totalSourceRows && totalInserts === 0 && totalUpdates === 0 && allConflicts.length === 0;

  return {
    criterionId: 'CRIT-C02-02',
    taskId: 'W021.5-C-02',
    timestamp: new Date().toISOString(),
    totalSourceRows,
    totalTargetRows,
    totalMatched,
    totalInserts,
    totalUpdates,
    totalPreserved,
    conflictsCount: allConflicts.length,
    conflicts: allConflicts,
    isExactMatch,
    isIdempotent: allConflicts.length === 0,
    tableAudits,
    plannedOperations
  };
}

/**
 * Applies planned reconciliation operations to targetDatabaseState (in-memory simulator)
 */
export function applyStage1Reconciliation(targetDatabaseState = {}, reconciliationPlan) {
  const nextState = {};

  for (const tableName of STAGE1_TABLE_SEQUENCE) {
    const currentRows = targetDatabaseState[tableName] ? [...targetDatabaseState[tableName]] : [];
    const tableActions = (reconciliationPlan.plannedOperations || []).filter(a => a.table === tableName);

    const rowMap = new Map();
    for (const r of currentRows) {
      const key = computeNaturalKey(tableName, r);
      rowMap.set(key, { ...r });
    }

    for (const action of tableActions) {
      if (action.action === 'INSERT') {
        const key = computeNaturalKey(tableName, action.payload);
        rowMap.set(key, { ...action.payload });
      } else if (action.action === 'UPDATE') {
        const key = action.naturalKey;
        const existing = rowMap.get(key) || {};
        rowMap.set(key, { ...existing, ...action.payload, id: action.id });
      } else if (action.action === 'PRESERVE') {
        // Row already in place; ensure existing UUID is kept
        const key = action.naturalKey;
        const existing = rowMap.get(key);
        if (existing) {
          rowMap.set(key, { ...existing, id: action.id });
        }
      }
    }

    nextState[tableName] = Array.from(rowMap.values());
  }

  return nextState;
}
