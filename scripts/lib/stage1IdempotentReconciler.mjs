/**
 * scripts/lib/stage1IdempotentReconciler.mjs
 *
 * Stage 1 Political Organizations Idempotent Reconciliation Engine
 * Authority: CTO Directive 148 / CTO Directive 149 Section 5 / Task W021.5-C-02 / Master Execution Framework Amendment v1.6
 *
 * Solves the pre-seeded child-table idempotency challenge:
 * When Migration 065 was executed, child rows (relationships, multilingual names,
 * symbols, aliases) were inserted without explicit client UUIDs, so PostgreSQL
 * generated random UUIDs (gen_random_uuid()).
 *
 * This engine reconciles incoming canonical catalog rows against existing database
 * state using exact database natural keys / unique constraints:
 *   1. uq_org_rel (source_org_id, target_org_id, relationship_type, valid_from)
 *   2. uq_org_multi_name (organization_id, language_code, script_code, representation_type, name_value)
 *   3. uq_org_symbols_timeline (organization_id, symbol_name, valid_from) [OMITS jurisdiction_scope per DB constraint]
 *   4. organization_aliases: (raw_lookup_key, jurisdiction_scope, organization_id, valid_from)
 *      AND enforces trigger fn_validate_org_alias_temporal_invariants:
 *      no overlapping validity intervals for the same (raw_lookup_key, jurisdiction_scope) across ANY organization.
 *
 * Key Invariants:
 *  - Preserves existing database UUIDs on matching rows to maintain referential integrity.
 *  - Avoids 23505 unique constraint duplicate key errors on repeat execution.
 *  - Avoids 23514 temporal trigger overlap violations.
 *  - Proves exact idempotency: repeat execution against existing state produces 0 inserts and 0 duplicate errors.
 *  - Explicit Non-Key Mutation Policy (Directive 149 Section 5.2):
 *    No speculative overwrites of official recognition, alias meaning, statutory symbol allocation,
 *    temporal validity, provenance or canonical identity. All discrepancies become reviewable CONFLICTs.
 *  - Exact Catalog Breakdown:
 *    107 political_organizations + 10 organization_relationships + 27 multilingual_names +
 *    19 organization_symbols + 1,043 organization_aliases + 1 provenance_record = 1,207 catalog records
 *    (+ 2 dataset anchors = 1,209 total records across all 8 tables).
 *    Exact child row count: 10 + 27 + 19 + 1,043 = 1,099 child rows.
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
 * Non-Key Field Mutation Policy (Directive 149 Section 5.2)
 * Disallows silent/speculative overwrites of statutory, temporal, or provenance attributes.
 */
export const STAGE1_MUTATION_POLICY = {
  PROTECTED_BUSINESS_ATTRIBUTES: new Set([
    'official_recognition',
    'party_type',
    'registration_status',
    'founded_year',
    'legal_status',
    'recognition_level',
    'symbol_name',
    'symbol_type',
    'jurisdiction_scope',
    'alias_type',
    'confidence',
    'meaning_gloss',
    'relationship_type',
    'source_org_id',
    'target_org_id',
    'organization_id',
    'valid_from',
    'valid_to',
    'data_status',
    'provenance_id',
    'dataset_version_id',
    'language_code',
    'script_code',
    'representation_type',
    'name_value'
  ]),
  PERMITTED_UPDATE_ATTRIBUTES: new Set([
    'description',
    'notes',
    'metadata'
  ])
};

/**
 * Normalizes field names across source representations and database columns
 */
export function normalizeRow(tableName, row) {
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
 * Computes deterministic natural key for a table row matching exact PostgreSQL constraint semantics
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
      // DDL constraint: uq_org_rel (source_org_id, target_org_id, relationship_type, valid_from)
      const src = (r.source_org_id || r.source_organization_id || '').trim();
      const tgt = (r.target_org_id || r.target_organization_id || '').trim();
      const rel = (r.relationship_type || '').trim();
      const vf = (r.valid_from || '').trim();
      return `${src}::${tgt}::${rel}::${vf}`;
    }
    case 'public.organization_multilingual_names': {
      // DDL constraint: uq_org_multi_name (organization_id, language_code, script_code, representation_type, name_value)
      const org = (r.organization_id || '').trim();
      const lang = (r.language_code || '').trim().toLowerCase();
      const script = (r.script_code || '').trim().toLowerCase();
      const rep = (r.representation_type || '').trim().toLowerCase();
      const name = (r.name_value || '').trim();
      return `${org}::${lang}::${script}::${rep}::${name}`;
    }
    case 'public.organization_symbols': {
      // DDL constraint: uq_org_symbols_timeline (organization_id, symbol_name, valid_from)
      // Directive 149 Section 5.1: jurisdiction_scope is NOT part of the database unique constraint!
      const org = (r.organization_id || '').trim();
      const sym = (r.symbol_name || '').trim();
      const vf = (r.valid_from || '').trim();
      return `${org}::${sym}::${vf}`;
    }
    case 'public.organization_aliases': {
      // Deterministic natural key: organization_id, raw_lookup_key, jurisdiction_scope, valid_from
      const org = (r.organization_id || '').trim();
      const rawKey = (r.raw_lookup_key || '').trim().toLowerCase();
      const jur = (r.jurisdiction_scope || 'NULL').trim();
      const vf = (r.valid_from || '').trim();
      return `${org}::${rawKey}::${jur}::${vf}`;
    }
    default:
      return String(r.id || '').trim();
  }
}

/**
 * Checks whether two temporal intervals [from1, to1] and [from2, to2] overlap.
 * Uses PostgreSQL convention: valid_to defaults to 9999-12-31 if null.
 */
function intervalsOverlap(from1, to1, from2, to2) {
  const f1 = from1 || '1947-01-01';
  const t1 = to1 || '9999-12-31';
  const f2 = from2 || '1947-01-01';
  const t2 = to2 || '9999-12-31';
  return f1 <= t2 && t1 >= f2;
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
  const seenSourceKeys = new Set();
  const seenAliasScopes = [];
  let matchedCount = 0;
  let insertCount = 0;
  let updateCount = 0;
  let preserveCount = 0;

  for (const sRow of sourceRows) {
    const key = computeNaturalKey(tableName, sRow);

    // Duplicate incoming key detection within sourceRows
    if (seenSourceKeys.has(key)) {
      conflicts.push({
        table: tableName,
        naturalKey: key,
        reason: `DUPLICATE_INCOMING_KEY: Multiple source rows contain identical natural key "${key}"`
      });
      actions.push({
        action: 'CONFLICT',
        table: tableName,
        naturalKey: key,
        reason: 'DUPLICATE_INCOMING_KEY'
      });
      continue;
    }
    seenSourceKeys.add(key);

    // Internal temporal overlap detection across incoming alias rows
    if (tableName === 'public.organization_aliases') {
      const sRawKey = (sRow.raw_lookup_key || '').trim().toLowerCase();
      const sJur = (sRow.jurisdiction_scope || '').trim();
      let internalCollision = false;
      for (const prev of seenAliasScopes) {
        if (prev.rawKey === sRawKey && prev.jur === sJur) {
          if (intervalsOverlap(sRow.valid_from, sRow.valid_to, prev.validFrom, prev.validTo)) {
            internalCollision = true;
            conflicts.push({
              table: tableName,
              naturalKey: key,
              reason: `INTERNAL_SOURCE_TEMPORAL_COLLISION: Incoming alias "${sRawKey}" in jurisdiction "${sJur || 'NATIONAL'}" overlaps with another incoming alias validity window`
            });
            actions.push({
              action: 'CONFLICT',
              table: tableName,
              naturalKey: key,
              reason: 'INTERNAL_SOURCE_TEMPORAL_COLLISION'
            });
            break;
          }
        }
      }
      if (internalCollision) continue;
      seenAliasScopes.push({ rawKey: sRawKey, jur: sJur, validFrom: sRow.valid_from, validTo: sRow.valid_to });
    }

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
        // Evaluate if difference is an allowable update or a conflicting business invariant (Directive 149 Section 5.2)
        let isBusinessConflict = false;
        let conflictReason = 'BUSINESS_INVARIANT_CONFLICT: Conflicting non-key attributes on existing target record';

        for (const k of diffKeys) {
          if (STAGE1_MUTATION_POLICY.PROTECTED_BUSINESS_ATTRIBUTES.has(k)) {
            isBusinessConflict = true;
            conflictReason = `PROTECTED_ATTRIBUTE_CONFLICT: Difference on protected attribute "${k}" (source: ${JSON.stringify(diffs[k].source)} vs target: ${JSON.stringify(diffs[k].target)})`;
            break;
          }
          if (!STAGE1_MUTATION_POLICY.PERMITTED_UPDATE_ATTRIBUTES.has(k)) {
            isBusinessConflict = true;
            conflictReason = `UNAPPROVED_MUTATION_CONFLICT: Field "${k}" has differences but is not an approved mutable field`;
            break;
          }
        }

        if (isBusinessConflict) {
          conflicts.push({
            table: tableName,
            naturalKey: key,
            targetId,
            diffs,
            reason: conflictReason
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
      // Row is not present by exact natural key.
      // If table is organization_aliases, check for cross-organization temporal trigger collision!
      // (Trigger fn_validate_org_alias_temporal_invariants prevents overlapping intervals for same raw_lookup_key + scope across ANY org)
      let isTemporalCollision = false;
      if (tableName === 'public.organization_aliases') {
        const rawKey = (sRow.raw_lookup_key || '').trim().toLowerCase();
        const jur = (sRow.jurisdiction_scope || '').trim();

        for (const tRow of targetRows) {
          const tRawKey = (tRow.raw_lookup_key || '').trim().toLowerCase();
          const tJur = (tRow.jurisdiction_scope || '').trim();

          if (rawKey === tRawKey && jur === tJur) {
            if (intervalsOverlap(sRow.valid_from, sRow.valid_to, tRow.valid_from, tRow.valid_to)) {
              isTemporalCollision = true;
              conflicts.push({
                table: tableName,
                naturalKey: key,
                targetId: tRow.id,
                reason: `TEMPORAL_TRIGGER_COLLISION: Alias "${rawKey}" in scope "${jur || 'NULL'}" has overlapping validity [${sRow.valid_from}..${sRow.valid_to || 'inf'}] with existing target row ${tRow.id} (org: ${tRow.organization_id}, [${tRow.valid_from}..${tRow.valid_to || 'inf'}])`
              });
              actions.push({
                action: 'CONFLICT',
                table: tableName,
                naturalKey: key,
                targetId: tRow.id,
                reason: 'TEMPORAL_TRIGGER_COLLISION'
              });
              break;
            }
          }
        }
      }

      if (!isTemporalCollision) {
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

  // Breakdown verification:
  // Child tables: 10 rels + 27 multilingual + 19 symbols + 1043 aliases = 1,099 child rows.
  // 107 canonical organizations + 1 provenance record = 1,207 catalog records (+ 2 datasets = 1,209 total).
  const childRowsCount =
    (tableAudits['public.organization_relationships']?.sourceRowCount || 0) +
    (tableAudits['public.organization_multilingual_names']?.sourceRowCount || 0) +
    (tableAudits['public.organization_symbols']?.sourceRowCount || 0) +
    (tableAudits['public.organization_aliases']?.sourceRowCount || 0);

  return {
    criterionId: 'CRIT-C02-02',
    taskId: 'W021.5-C-02',
    directive: 'CTO Directive 149 Section 5',
    timestamp: new Date().toISOString(),
    totalSourceRows,
    totalTargetRows,
    totalMatched,
    totalInserts,
    totalUpdates,
    totalPreserved,
    childRowsCount,
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
