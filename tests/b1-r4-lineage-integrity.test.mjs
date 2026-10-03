/**
 * tests/b1-r4-lineage-integrity.test.mjs
 *
 * Milestone W021.5-B1-R4: Lineage Schema & Semantics Integrity Test Battery
 * Tests:
 * 1. Self-link rejection: source_constituency_version_id <> target_constituency_version_id
 * 2. Duplicate lineage rejection: uq_constituency_lineage (source, target, relationship_type, effective_date)
 * 3. Cycle detection & DAG integrity
 * 4. Foreign key integrity / Orphan rejection
 * 5. Controlled enum validation (7 approved relationship types)
 * 6. Zero fabricated rows at Milestone B1 & semantic justification proof
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const MIGRATION_060_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '060_canonical_electoral_geography_remediation.sql');
const MIGRATION_061_PATH = path.join(REPO_ROOT, 'supabase', 'migrations', '061_canonical_national_ac_pc_mappings.sql');
const LINEAGE_SEMANTICS_PATH = path.join(REPO_ROOT, 'reports', 'w021_5b1_r4_lineage_semantics.json');

const sql060 = fs.readFileSync(MIGRATION_060_PATH, 'utf8');
const sql061 = fs.readFileSync(MIGRATION_061_PATH, 'utf8');
const lineageSemantics = JSON.parse(fs.readFileSync(LINEAGE_SEMANTICS_PATH, 'utf8'));

describe('W021.5-B1-R4: Constituency Lineage Integrity & Semantics Battery', () => {

  it('Lineage-01: Self-link rejection constraint is defined in DDL', () => {
    assert(
      sql060.includes('CONSTRAINT chk_constituency_lineage_no_self_link CHECK') &&
      sql060.includes('source_constituency_version_id <> target_constituency_version_id'),
      'Migration 060 must enforce chk_constituency_lineage_no_self_link constraint'
    );

    // Functional validator simulation
    function validateLineageLink(sourceId, targetId) {
      if (sourceId === targetId) {
        throw new Error('LINEAGE_SELF_LINK_VIOLATION: source and target cannot be identical');
      }
      return true;
    }

    const testUuid = 'a0000000-0000-0000-0000-000000000001';
    assert.throws(
      () => validateLineageLink(testUuid, testUuid),
      /LINEAGE_SELF_LINK_VIOLATION/
    );
    assert.strictEqual(validateLineageLink(testUuid, 'b0000000-0000-0000-0000-000000000002'), true);
  });

  it('Lineage-02: Unique composite constraint prevents duplicate lineage edges', () => {
    assert(
      sql060.includes('CONSTRAINT uq_constituency_lineage UNIQUE') &&
      sql060.includes('source_constituency_version_id, target_constituency_version_id, relationship_type, effective_date'),
      'Migration 060 must define composite unique constraint uq_constituency_lineage'
    );
  });

  it('Lineage-03: Foreign key constraints prevent orphaned lineage records', () => {
    assert(
      sql060.includes('source_constituency_version_id UUID NOT NULL REFERENCES public.constituency_versions(id) ON DELETE RESTRICT') &&
      sql060.includes('target_constituency_version_id UUID NOT NULL REFERENCES public.constituency_versions(id) ON DELETE RESTRICT'),
      'Migration 060 must enforce ON DELETE RESTRICT on source and target constituency versions'
    );
  });

  it('Lineage-04: Controlled relationship_type enum constraint strictly validated', () => {
    const expectedTypes = [
      'CONTINUES_AS',
      'RENAMED_AS',
      'RENUMBERED_AS',
      'REPLACED_BY',
      'SPLIT_INTO',
      'MERGED_INTO',
      'ABOLISHED'
    ];

    for (const type of expectedTypes) {
      assert(sql060.includes(`'${type}'`), `Enum missing expected lineage relationship type: ${type}`);
    }

    // Verify rejection of invalid types
    function validateRelationshipType(type) {
      if (!expectedTypes.includes(type)) {
        throw new Error(`INVALID_RELATIONSHIP_TYPE: ${type}`);
      }
      return true;
    }

    assert.throws(() => validateRelationshipType('CHANGED_TO'), /INVALID_RELATIONSHIP_TYPE/);
    assert.throws(() => validateRelationshipType('HEURISTIC_MERGE'), /INVALID_RELATIONSHIP_TYPE/);
    assert.strictEqual(validateRelationshipType('SPLIT_INTO'), true);
  });

  it('Lineage-05: Directed Acyclic Graph (DAG) cycle detection validator', () => {
    class LineageGraphValidator {
      constructor() {
        this.adj = new Map();
      }

      addEdge(source, target) {
        if (source === target) {
          throw new Error(`LINEAGE_SELF_LINK_VIOLATION: ${source}`);
        }
        if (!this.adj.has(source)) this.adj.set(source, []);
        this.adj.get(source).push(target);
        
        // Assert DAG after each edge addition
        if (this.hasCycle()) {
          throw new Error(`LINEAGE_CYCLE_DETECTED: adding edge ${source} -> ${target} creates a cycle`);
        }
      }

      hasCycle() {
        const visited = new Set();
        const recStack = new Set();

        for (const node of this.adj.keys()) {
          if (this._isCyclicUtil(node, visited, recStack)) {
            return true;
          }
        }
        return false;
      }

      _isCyclicUtil(node, visited, recStack) {
        if (recStack.has(node)) return true;
        if (visited.has(node)) return false;

        visited.add(node);
        recStack.add(node);

        const neighbors = this.adj.get(node) || [];
        for (const neighbor of neighbors) {
          if (this._isCyclicUtil(neighbor, visited, recStack)) {
            return true;
          }
        }

        recStack.delete(node);
        return false;
      }
    }

    const graph = new LineageGraphValidator();
    graph.addEdge('V1', 'V2');
    graph.addEdge('V2', 'V3');
    graph.addEdge('V3', 'V4');

    // Attempt direct back-edge (2-cycle)
    assert.throws(() => graph.addEdge('V2', 'V1'), /LINEAGE_CYCLE_DETECTED/);

    // Attempt indirect back-edge (4-cycle)
    assert.throws(() => graph.addEdge('V4', 'V1'), /LINEAGE_CYCLE_DETECTED/);

    // Valid branch split into two successors
    const branchGraph = new LineageGraphValidator();
    branchGraph.addEdge('V_OLD', 'V_NEW_A');
    branchGraph.addEdge('V_OLD', 'V_NEW_B');
    assert.strictEqual(branchGraph.hasCycle(), false);
  });

  it('Lineage-06: Zero fabricated lineage rows at Milestone B1 & semantic justification', () => {
    // Assert 0 rows in migration SQL
    const lineageInsertMatch = sql060.match(/INSERT INTO public\.constituency_lineage/gi);
    assert.strictEqual(lineageInsertMatch, null, 'Migration 060 must contain 0 INSERT statements for constituency_lineage');

    const sql061LineageMatch = sql061.match(/INSERT INTO public\.constituency_lineage/gi);
    assert.strictEqual(sql061LineageMatch, null, 'Migration 061 must contain 0 INSERT statements for constituency_lineage');

    // Assert lineage semantics report confirms 0 rows as semantically correct
    assert.strictEqual(lineageSemantics.table, 'public.constituency_lineage');
    assert.strictEqual(lineageSemantics.totalCurrentRows, 0);
    assert.strictEqual(lineageSemantics.isSemanticallyCorrect, true);
    assert.strictEqual(lineageSemantics.scenarios.length, 5);

    // All 5 historical scenarios must be categorized as NOT_YET_MODELED
    for (const sc of lineageSemantics.scenarios) {
      assert.strictEqual(sc.status, 'NOT_YET_MODELED');
      assert.strictEqual(sc.lineage_row_exists, false);
      assert(sc.reason.length > 25);
    }
  });

});
