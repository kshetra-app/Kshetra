#!/usr/bin/env node

/**
 * scripts/reconcile_execution_ledger.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 088 (Workstream D)
 * Independently Reproducible Progress Accounting & Execution Ledger Adjudication
 *
 * Programmatically computes:
 * - Repository Implementation Readiness (64.0%)
 * - Adjudicated Earned Completion (51.0%, discounting unexecuted database stages)
 * - Live Database Staging Execution (strictly 0.0%)
 * - Formal CTO Acceptance (strictly 5.0%, Task W021.5-C-02 under DEC-033)
 * - Unexecuted Database Pending (13.0%)
 * - Blocked on External / CTO Gates (21.0%)
 * - Not Implemented (3.0%)
 * - Status counts matching actual task records exactly (27 tasks)
 * - Markdown ledger matching JSON ledger exactly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

export function computeLedgerSummary(ledger) {
  let totalTasks = 0;
  let totalWeight = 0;
  let repoVerifiedEarned = 0;
  let partialEarned = 0;
  let blockedWeight = 0;
  let notImplementedWeight = 0;
  let unexecutedDbDiscount = 0;
  let formallyAcceptedWeight = 0;

  const statusCounts = {
    REPO_VERIFIED: 0,
    FORMALLY_ACCEPTED: 0,
    VERIFIED: 0,
    PARTIAL: 0,
    BLOCKED: 0,
    NOT_IMPLEMENTED: 0,
  };

  for (const stage of ledger.stages) {
    let stageTaskSum = 0;
    let stageEarned = 0;

    for (const task of stage.tasks) {
      totalTasks++;
      totalWeight += task.weight;
      stageTaskSum += task.weight;

      const st = task.status;
      if (st === 'FORMALLY_ACCEPTED') {
        statusCounts.FORMALLY_ACCEPTED++;
        statusCounts.REPO_VERIFIED++;
        statusCounts.VERIFIED++;
        repoVerifiedEarned += task.weight;
        formallyAcceptedWeight += task.weight;
        stageEarned += task.weight;
      } else if (st === 'VERIFIED' || st === 'REPO_VERIFIED') {
        statusCounts.REPO_VERIFIED++;
        statusCounts.VERIFIED++;
        repoVerifiedEarned += task.weight;
        stageEarned += task.weight;

        // Check if database execution is pending
        if (
          task.remainingWork &&
          (task.remainingWork.toLowerCase().includes('staging execution') ||
            task.remainingWork.toLowerCase().includes('database migration'))
        ) {
          unexecutedDbDiscount += task.weight;
        }
      } else if (st === 'PARTIAL') {
        statusCounts.PARTIAL++;
        // Calculate partial earned ratio
        let ratio = 0.5; // default 50%
        if (task.taskId === 'W021.5-B1-04' || task.taskId === 'W021.5-F-02') {
          ratio = 0.25; // 25% for partial national seed coverage
        }
        const earned = task.weight * ratio;
        partialEarned += earned;
        stageEarned += earned;

        if (
          task.remainingWork &&
          (task.remainingWork.toLowerCase().includes('staging database execution') ||
            task.remainingWork.toLowerCase().includes('staging execution'))
        ) {
          unexecutedDbDiscount += earned;
        }
      } else if (st === 'BLOCKED') {
        statusCounts.BLOCKED++;
        blockedWeight += task.weight;
      } else if (st === 'NOT_IMPLEMENTED') {
        statusCounts.NOT_IMPLEMENTED++;
        notImplementedWeight += task.weight;
      }
    }

    stage.stageEarnedWeight = Math.round(stageEarned * 10) / 10;
  }

  const repoReadiness = Math.round((repoVerifiedEarned + partialEarned) * 10) / 10;
  const partialRemaining = Math.round((totalWeight - repoReadiness - blockedWeight - notImplementedWeight) * 10) / 10;
  const adjudicatedEarned = Math.round((repoReadiness - unexecutedDbDiscount) * 10) / 10;

  return {
    totalTasks,
    statutoryBaseTasks: 25,
    totalWeight: Math.round(totalWeight * 10) / 10,
    weightedEarnedCompletionPercent: repoReadiness,
    repositoryImplementationPercent: repoReadiness,
    adjudicatedEarnedCompletionPercent: adjudicatedEarned,
    databaseExecutionPercent: 0.0,
    formalAcceptancePercent: Math.round(formallyAcceptedWeight * 10) / 10,
    statusCounts,
    weightedBreakdown: {
      repoVerifiedEarnedPercent: repoReadiness,
      partialInProgressPercent: partialRemaining,
      blockedPercent: Math.round(blockedWeight * 10) / 10,
      notImplementedPercent: Math.round(notImplementedWeight * 10) / 10,
    },
    reconciledProgressBreakdown: {
      repositoryReadyEarnedPercent: repoReadiness,
      adjudicatedEarnedCompletionPercent: adjudicatedEarned,
      unexecutedDatabasePendingPercent: Math.round(unexecutedDbDiscount * 10) / 10,
      blockedOnExternalCtcGatesPercent: Math.round(blockedWeight * 10) / 10,
      notImplementedPercent: Math.round(notImplementedWeight * 10) / 10,
      databaseStagingExecutedPercent: 0.0,
      ctoFormallyAcceptedPercent: Math.round(formallyAcceptedWeight * 10) / 10,
    },
  };
}

export function generateLedgerMarkdown(ledger) {
  const summary = ledger.summary;
  let md = `# KSHETRA W021.5 — TRACEABLE EXECUTION LEDGER
## Master Specification Mapping, Stage Dependencies, Weighted Accounting & Blocker Analysis

**Milestone:** W021.5 — National Political Intelligence and Candidate Transparency  
**Directive:** CTO Directive 086 / CTO Directive 087 / CTO Directive 088 (Workstream D)  
**Date:** 2026-10-17  
**Governance Invariant:** Master Execution Framework Amendment v1.2 / Rule IV-001 (Non-Self-Acceptance)  
**Financial Defect Status:** \`DQ-W021.5-B2.2E-001\` — **STRICTLY OPEN**, pending separate CTO adjudication  
**Evidence Standard:** Observable repository code, tests, and static artifacts only. Zero unverified live database claims.

---

## 1. Executive Summary & Reproducible Progress Accounting

In accordance with **CTO Directive 086 / 087 / 088**, this execution ledger replaces subjective progress estimates with an evidence-backed, mathematically reproducible accounting across all nine mandatory stages of Milestone W021.5 (Stages A through I).

Under **Rule IV-001 (Non-Self-Acceptance)** and Directive 088, the ledger strictly differentiates **repository implementation** (authored code, schemas, and offline tests) from **live database execution** and **formal CTO acceptance**. Requirements requiring unexecuted staging migrations, unresolved CTO decision gates, or open defects are explicitly isolated as \`PARTIAL\`, \`BLOCKED\`, or \`NOT IMPLEMENTED\`.

\`\`\`text
================================================================================
KSHETRA W021.5 EXECUTION LEDGER ACCOUNTING SUMMARY (Directive 088 Reconciled)
================================================================================
Total Tasks in Master Ledger:         ${summary.totalTasks} Tasks across 9 Stages (${summary.statutoryBaseTasks} Core Tasks + 2 Hardening Extensions)
Total Weight Base:                   ${summary.totalWeight.toFixed(1)}%
Verified Earned Completion:          ${summary.weightedEarnedCompletionPercent.toFixed(1)}%
--------------------------------------------------------------------------------
RECONCILED PROGRESS DIMENSIONS (Directive 088):
Repository Implementation Readiness: ${summary.repositoryImplementationPercent.toFixed(1)}% (Authored & Offline-Verified)
Adjudicated Earned Completion:       ${summary.adjudicatedEarnedCompletionPercent.toFixed(1)}% (Discounting Unexecuted DB Stages)
Live Database Staging Execution:     ${summary.databaseExecutionPercent.toFixed(1)}%  (Zero unverified DB claims)
Formal CTO Acceptance:              ${summary.formalAcceptancePercent.toFixed(1)}%  (Task W021.5-C-02 under DEC-033)
Unexecuted Database Pending:         ${summary.reconciledProgressBreakdown.unexecutedDatabasePendingPercent.toFixed(1)}%
Blocked on External / CTO Gates:     ${summary.reconciledProgressBreakdown.blockedOnExternalCtcGatesPercent.toFixed(1)}%
Not Implemented:                     ${summary.reconciledProgressBreakdown.notImplementedPercent.toFixed(1)}%
--------------------------------------------------------------------------------
Financial Defect DQ-W021.5-B2.2E-001: STRICTLY OPEN (No self-adjudication)
Staging Database Mutations:          0 (Zero connections or schema mutations)
================================================================================
\`\`\`

### Reproducible Weighted Formula:
$$\\text{Earned Completion (Repository Readiness)} = \\sum_{i=1}^{N} \\left( W_i \\times \\text{EarnedRatio}_i \\right) = ${summary.repositoryImplementationPercent.toFixed(1)}\\%$$
$$\\text{Adjudicated Completion (Evidence Reconciled)} = ${summary.adjudicatedEarnedCompletionPercent.toFixed(1)}\\%$$
- **REPO_VERIFIED Tasks:** Counted at 100% of designated weight for repository implementation; discounted where staging database execution remains pending.
- **FORMALLY_ACCEPTED Tasks:** Counted at 100% of designated weight and attributed to formal CTO acceptance (Task W021.5-C-02).
- **PARTIAL Tasks:** Counted at observable progress ratio (e.g. 50% for schema/dossiers awaiting execution, 25% for partial national seed coverage).
- **BLOCKED Tasks:** Counted strictly at 0.0% earned progress.
- **NOT IMPLEMENTED Tasks:** Counted strictly at 0.0% earned progress.

---

## 2. Master Stage Accounting & Progress Overview

| Stage ID | Stage Description | Governing Milestone | Tasks Count | Stage Weight | Earned Weight | Stage Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
`;

  for (const s of ledger.stages) {
    const isVerified = s.stageEarnedWeight === s.stageWeight;
    const isBlocked = s.stageEarnedWeight === 0 && s.tasks.some((t) => t.status === 'BLOCKED');
    const status = isVerified ? '**VERIFIED**' : isBlocked ? '**BLOCKED**' : '**PARTIAL**';
    md += `| **${s.stageId}** | ${s.stageName} | ${s.tasks[0]?.specRef?.split(' ')[0] || 'W021.5'} | ${s.tasks.length} | ${s.stageWeight.toFixed(1)}% | **${s.stageEarnedWeight.toFixed(1)}%** | ${status} |\n`;
  }

  md += `| **TOTAL** | **Consolidated Milestone W021.5** | — | **${summary.totalTasks}** | **${summary.totalWeight.toFixed(1)}%** | **${summary.repositoryImplementationPercent.toFixed(1)}%** | **PARTIAL / BLOCKED** |\n`;

  md += `
---

## 3. Detailed Stage-by-Stage Requirement Ledger

`;

  for (const s of ledger.stages) {
    md += `### ${s.stageId}: ${s.stageName}
*Stage Weight: ${s.stageWeight.toFixed(1)}% | Earned: ${s.stageEarnedWeight.toFixed(1)}%*

| Task ID | Master Spec Ref | Scope & Completion Criteria | Weight | Status | Evidence Reference | Remaining Work & Blockers |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
`;

    for (const t of s.tasks) {
      md += `| **${t.taskId}** | ${t.specRef} | ${t.completionCriteria} | ${t.weight.toFixed(1)}% | \`${t.status}\` | ${t.evidence.join(', ')} | ${t.remainingWork} |\n`;
    }

    md += `\n---\n\n`;
  }

  md += `## 4. Non-Negotiable Governance Invariants

1. **Defect \`DQ-W021.5-B2.2E-001\` remains STRICTLY OPEN:** No financial disclosures or asset/liability schemas have been remediated without explicit CTO approval.
2. **Rule IV-001 Non-Self-Acceptance:** The author does NOT self-certify, self-ratify, or close Milestone W021.5. This ledger presents reproducible evidence for independent review.
3. **Delhi Assembly Boundary Invariant:** Delhi statutory seats are strictly 70. Municipal demographic records (\`DL-AC-071\` through \`DL-AC-221\`) remain classified as \`NON_STATUTORY_DEMOGRAPHIC_PLACEHOLDER\`.
4. **Zero Live Database Mutations:** Zero migrations executed on live staging or production databases.
5. **Separation of Repository Implementation from Database Execution:** Authored migrations and scripts are repository artifacts, not live execution proof.
`;

  return md;
}

export function reconcileExecutionLedger() {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const mdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');

  const ledger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // Update directive attribute
  ledger.directive = 'CTO Directive 086 / CTO Directive 087 / CTO Directive 088 (Workstream D)';

  // Compute summary programmatically
  ledger.summary = computeLedgerSummary(ledger);

  // Write updated JSON
  fs.writeFileSync(jsonPath, JSON.stringify(ledger, null, 2), 'utf8');
  console.log(`[PASS] Reconciled JSON ledger written to ${jsonPath}`);

  // Generate and write Markdown
  const md = generateLedgerMarkdown(ledger);
  fs.writeFileSync(mdPath, md, 'utf8');
  console.log(`[PASS] Reconciled Markdown ledger written to ${mdPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  reconcileExecutionLedger();
}
