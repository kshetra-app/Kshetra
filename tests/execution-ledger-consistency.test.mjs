/**
 * KSHETRA W021.5 — CTO DIRECTIVE 117
 * Deterministic Execution Ledger Consistency & Non-Self-Acceptance Suite
 *
 * Verifies all 9 core ledger reconciliation invariants:
 * 1. reports/w021_5_execution_ledger.json exists and parses strictly.
 * 2. Directive metadata records continuity through CTO Directive 117.
 * 3. Governance authority specifies Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance.
 * 4. Sum of task allocated weights is exactly 100.0%.
 * 5. Arithmetic balance holds globally:
 *    repoVerifiedEarnedPercent (61.5) + databasePendingPercent (10.5) + blockedPercent (22.5) + unimplementedPercent (5.5) == 100.0%.
 * 6. For each of the 27 individual tasks:
 *    t.weight === (repoVerifiedWeight + databasePendingWeight + blockedWeight + unimplementedWeight).
 * 7. Stage B weight breakdown is internally consistent:
 *    Allocated: 12.0%, Earned: 10.5%, Blocked: 1.5%.
 *    Stage B earned (10.5%) is verified to be already included in the 61.5% baseline without double-counting.
 * 8. Rule IV-001 Non-Self-Acceptance: formalAcceptancePercent is strictly 0.0%, and every task has formalAcceptanceStatus 'UNACCEPTED' (or PENDING_INDEPENDENT_CONFIRMATION).
 * 9. Financial defect DQ-W021.5-B2.2E-001 remains STRICTLY_OPEN.
 * 10. Production air-gap is preserved (databaseExecutionPercent == 0).
 */

import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

test('W021.5 Execution Ledger Consistency & Non-Self-Acceptance', async (t) => {
  const ledgerPath = path.join(REPO_ROOT, 'reports', 'w021_5_execution_ledger.json');
  assert.ok(fs.existsSync(ledgerPath), 'w021_5_execution_ledger.json must exist');

  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  await t.test('1. Metadata continuity through Directive 117 and Governance v1.6', () => {
    assert.ok(ledger.directive.includes('CTO Directive 117'), 'Metadata must record through CTO Directive 117');
    assert.ok(ledger.governance.includes('Amendment v1.6'), 'Governance must specify Amendment v1.6');
    assert.ok(ledger.governance.includes('Rule IV-001'), 'Governance must cite Rule IV-001 Non-Self-Acceptance');
  });

  await t.test('2. Global weight summation equals exactly 100.0%', () => {
    assert.strictEqual(ledger.summary.totalWeight, 100, 'Summary totalWeight must be 100%');
    assert.strictEqual(ledger.summary.totalTasks, 27, 'Total task count must be 27');

    let sumAllocated = 0;
    let sumRepo = 0;
    let sumDb = 0;
    let sumBlocked = 0;
    let sumUnimpl = 0;

    for (const stage of ledger.stages) {
      for (const task of stage.tasks) {
        sumAllocated += task.weight;
        sumRepo += task.accounting.repoVerifiedWeight;
        sumDb += task.accounting.databasePendingWeight;
        sumBlocked += task.accounting.blockedWeight;
        sumUnimpl += task.accounting.unimplementedWeight;
      }
    }

    assert.strictEqual(sumAllocated, 100, 'Sum of task allocated weights must be exactly 100');
    assert.strictEqual(sumRepo, 61.5, 'Sum of repo-verified earned weight must be exactly 61.5');
    assert.strictEqual(sumDb, 10.5, 'Sum of database-pending weight must be exactly 10.5');
    assert.strictEqual(sumBlocked, 22.5, 'Sum of blocked weight must be exactly 22.5');
    assert.strictEqual(sumUnimpl, 5.5, 'Sum of unimplemented weight must be exactly 5.5');
    assert.strictEqual(sumRepo + sumDb + sumBlocked + sumUnimpl, 100, 'Sum of parts must be exactly 100.0%');
  });

  await t.test('3. Criterion-level accounting balance for every individual task', () => {
    for (const stage of ledger.stages) {
      for (const task of stage.tasks) {
        const acc = task.accounting;
        const taskSum = acc.repoVerifiedWeight + acc.databasePendingWeight + acc.blockedWeight + acc.unimplementedWeight;
        assert.strictEqual(taskSum, task.weight, `Task ${task.taskId} accounting parts (${taskSum}) must equal allocated weight (${task.weight})`);
      }
    }
  });

  await t.test('4. Stage B 10.5% accounting and zero double-counting', () => {
    const stageB = ledger.stages.find(s => s.stageId === 'STAGE_B');
    assert.ok(stageB, 'Stage B must exist in ledger');

    let stageBAllocated = 0;
    let stageBEarned = 0;
    let stageBBlocked = 0;
    for (const task of stageB.tasks) {
      stageBAllocated += task.weight;
      stageBEarned += task.accounting.repoVerifiedWeight;
      stageBBlocked += task.accounting.blockedWeight;
    }

    assert.strictEqual(stageBAllocated, 12, 'Stage B total allocated weight must be 12.0%');
    assert.strictEqual(stageBEarned, 10.5, 'Stage B repo-verified earned weight must be 10.5%');
    assert.strictEqual(stageBBlocked, 1.5, 'Stage B blocked weight must be 1.5%');

    // Confirm Stage B 10.5% is ALREADY included in summary 61.5%
    assert.strictEqual(ledger.summary.repoVerifiedEarnedPercent, 61.5, 'Summary repo-verified earned must remain 61.5% (Stage B already incorporated)');
  });

  await t.test('5. Non-Self-Acceptance: formal acceptance strictly 0.0%', () => {
    assert.strictEqual(ledger.summary.formalAcceptancePercent, 0, 'Formal CTO acceptance must be strictly 0.0%');
    for (const stage of ledger.stages) {
      for (const task of stage.tasks) {
        assert.notStrictEqual(task.accounting.formalAcceptanceStatus, 'ACCEPTED', `Task ${task.taskId} must not be self-accepted`);
      }
    }
  });

  await t.test('6. Production Air-Gap and Defect Invariants', () => {
    assert.strictEqual(ledger.summary.databaseExecutionPercent, 0, 'Database execution on production must be 0% (strictly air-gapped)');
    assert.strictEqual(ledger.financialDefectStatus.status, 'STRICTLY_OPEN', 'Defect DQ-W021.5-B2.2E-001 must remain strictly OPEN');
  });
});
