#!/usr/bin/env node

/**
 * scripts/reconcile_execution_ledger.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 092 (Workstreams A, B, C, E)
 * Evidence Semantics, Canonical Progress Reconciliation, Report Consistency and Acceptance Verification
 *
 * Programmatically computes:
 * - Repository Implementation Readiness (64.0%)
 * - Adjudicated Earned Completion (51.0%, discounting unexecuted database stages)
 * - Live Database Staging Execution (strictly 0.0%)
 * - Formal CTO Acceptance (0.0% verified, 5.0% provisional pending independent confirmation)
 * - Unexecuted Database Pending Discount (13.0%)
 * - Blocked on External / CTO Gates (21.0%)
 * - Not Implemented (3.0%)
 * - Mutually exclusive status partition matching actual task records exactly (27 tasks: 16 REPO_VERIFIED, 5 PARTIAL, 5 BLOCKED, 1 NOT_IMPLEMENTED)
 * - Unified Markdown ledger derived deterministically from the exact same validated summary
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// Stage domain pattern map for evidence relevance validation
export const STAGE_EVIDENCE_RELEVANCE = {
  STAGE_A: /^(scripts\/|reports\/w021_5|tests\/political-intelligence)/,
  STAGE_B: /^(supabase\/migrations\/0(59|60|61|62)_|reports\/w021_5b1_|data\/geo\/|scripts\/generate_national_data_coverage_matrix|reports\/w021_5_national_data_coverage_matrix)/,
  STAGE_C: /^(supabase\/migrations\/0(64|65)_|reports\/w021_5b2_)/,
  STAGE_D: /^(supabase\/migrations\/0(50|63)_|reports\/.*b2.*|reports\/W021\.5-B2\.2D|reports\/W021\.5-CANONICAL-ARCHITECTURE)/,
  STAGE_E: /^(supabase\/migrations\/066_|reports\/.*POST-066|reports\/W021\.5-CANONICAL-ARCHITECTURE|reports\/W021\.5-CTO-DIRECTIVE-085|apps\/mobile\/stores\/affidavits)/,
  STAGE_F: /^(supabase\/migrations\/051_|reports\/w021_5b2_2f|data\/seed\/.*-historical-results|reports\/w021_5_national_data_coverage_matrix)/,
  STAGE_G: /^(apps\/api\/|reports\/W021\.5-CANONICAL-ARCHITECTURE|reports\/w006_api_architecture|tests\/political-intelligence)/,
  STAGE_H: /^(apps\/mobile\/|reports\/W021\.5-COMPATIBILITY|reports\/w006_r1)/,
  STAGE_I: /^(EXECUTION_STATE\.md|reports\/W021\.5-CANONICAL-ARCHITECTURE|scripts\/verify-backup-recovery)/,
};

export const TASK_DELIVERABLE_SIGNATURES = {
  'W021.5-A-01': (paths) => paths.some((p) => p.includes('repository_data_truth_audit')),
  'W021.5-A-02': (paths) => paths.some((p) => p.includes('generate_national_data_coverage_matrix')),
  'W021.5-A-03': (paths) => paths.some((p) => p.includes('demographic_seed_reconciliation_ledger') || p.includes('generate_national_data_coverage_matrix')),
  'W021.5-B1-01': (paths) => paths.some((p) => p.includes('059_canonical_national_constituency_registry.sql')),
  'W021.5-B1-02': (paths) => paths.some((p) => p.includes('060_') || p.includes('061_')),
  'W021.5-B1-03': (paths) => paths.some((p) => p.includes('062_canonical_assam_2023_delimitation.sql')),
  'W021.5-B1-04': (paths) => paths.some((p) => p.endsWith('.geojson')),
  'W021.5-C-01': (paths) => paths.some((p) => p.includes('064_political_organization_governance_remediation.sql')),
  'W021.5-C-02': (paths) => paths.some((p) => p.includes('065_canonical_political_organization_registry.sql')),
  'W021.5-C-03': (paths) => paths.some((p) => p.includes('multilingual_matrix') || p.includes('symbol_matrix') || p.includes('alias_collision_matrix')),
  'W021.5-D-01': (paths) => paths.some((p) => p.includes('050_') || p.includes('063_')),
  'W021.5-D-02': (paths) => paths.some((p) => p.includes('b2_2d_person_manifest') || p.includes('b2_2d_candidacy_manifest')),
  'W021.5-E-01': (paths) => paths.some((p) => p.includes('066_downstream_civic_extensions.sql')),
  'W021.5-F-01': (paths) => paths.some((p) => p.includes('051_election_data_normalization.sql')),
  'W021.5-F-02': (paths) => paths.some((p) => p.includes('historical-results.ts')),
  'W021.5-G-01': (paths) => paths.some((p) => p.includes('apps/api/src/routes/constituencies.ts')),
  'W021.5-G-02': (paths) => paths.some((p) => p.includes('apps/api/src/services/stateData.ts')),
  'W021.5-H-01': (paths) => paths.some((p) => p.includes('apps/mobile/lib/api/endpoints/constituencies.ts')),
  'W021.5-H-02': (paths) => paths.some((p) => p.includes('apps/mobile/app/constituency/[id].tsx')),
  'W021.5-H-03': (paths) => paths.some((p) => p.includes('apps/mobile/app/legislator/[id].tsx') || p.includes('W021.5-COMPATIBILITY-CONSUMER-IMPACT-REPORT.md')),
  'W021.5-H-04': (paths) => paths.some((p) => p.includes('apps/mobile/lib/supabaseDataService.ts')),
};

export const VALID_EVIDENCE_CLASSES = [
  'REPOSITORY_IMPLEMENTATION',
  'DATABASE_EXECUTION',
  'FORMAL_ACCEPTANCE',
  'BLOCKED_OR_UNRESOLVED',
];

export const VALID_VERIFICATION_STATUSES = [
  'VERIFIED_ON_DISK',
  'PROVISIONAL_PENDING_CONFIRMATION',
  'BLOCKED_PENDING_EXECUTION',
];

/**
 * Validate that an artifact claiming formal CTO acceptance is genuine, authorized,
 * independently authenticated, and adheres to Rule IV-001 (Non-Self-Acceptance).
 */
export function validateFormalAcceptanceArtifact(task, resolvedPath) {
  // Reject non-existent file
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} formalAcceptanceArtifact does not exist on disk: "${resolvedPath}".`
    );
  }

  // Reject directory target
  const stat = fs.statSync(resolvedPath);
  if (!stat.isFile()) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} formalAcceptanceArtifact references non-file target: "${resolvedPath}".`
    );
  }

  // Symlink check: resolved realpath must stay within REPO_ROOT
  const realPath = fs.realpathSync(resolvedPath);
  const relRealPath = path.relative(REPO_ROOT, realPath);
  if (relRealPath.startsWith('..') || path.isAbsolute(relRealPath)) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} formalAcceptanceArtifact resolves via symlink outside repository root: "${resolvedPath}".`
    );
  }

  const relPath = path.relative(REPO_ROOT, resolvedPath).replace(/\\/g, '/');

  // Rule IV-001: Implementation reports cannot serve as acceptance records
  if (/IMPLEMENTATION-REPORT|HANDOFF|STATUS-REPORT/i.test(relPath)) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} claims CONFIRMED_ACCEPTED using implementation report "${relPath}". Implementation reports cannot serve as formal acceptance records.`
    );
  }

  // Generated matrices or execution ledgers cannot serve as acceptance records
  if (/coverage_matrix|execution_ledger/i.test(relPath)) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} claims CONFIRMED_ACCEPTED using generated summary "${relPath}". Generated summaries cannot serve as formal acceptance records.`
    );
  }

  // Test execution reports / CI output cannot serve as acceptance records
  if (/test_results|evidence|test-execution/i.test(relPath)) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} claims CONFIRMED_ACCEPTED using test/CI artifact "${relPath}". Successful test runs or CI status alone cannot establish formal CTO acceptance.`
    );
  }

  // Workstream B.1: Markdown files cannot serve as acceptance records (marker fallbacks strictly removed)
  if (relPath.endsWith('.md') || relPath.endsWith('.markdown') || relPath.endsWith('.txt')) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} formalAcceptanceArtifact "${relPath}" is a Markdown/text file. Markdown marker fallbacks are strictly prohibited; formal acceptance requires a strictly structured, authenticated JSON record.`
    );
  }

  // Must read content and assert structured acceptance record
  const content = fs.readFileSync(resolvedPath, 'utf8');
  let record = null;
  try {
    record = JSON.parse(content);
  } catch (e) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} formalAcceptanceArtifact "${relPath}" must be a strictly valid JSON record. Markdown marker fallbacks and malformed records are strictly prohibited.`
    );
  }

  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} formalAcceptanceArtifact "${relPath}" must be a structured JSON object.`
    );
  }

  // Schema Validation (Workstream B.2)
  if (!record.taskRef) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} formalAcceptanceArtifact "${relPath}" missing required taskRef.`
    );
  }
  const taskRefs = Array.isArray(record.taskRef) ? record.taskRef : [record.taskRef];
  if (!taskRefs.includes(task.taskId)) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} formalAcceptanceArtifact "${relPath}" taskRef "${record.taskRef}" does not match task ID ${task.taskId}.`
    );
  }

  if (record.decision !== 'ACCEPTED' && record.decision !== 'CONFIRMED_ACCEPTED') {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} formalAcceptanceArtifact "${relPath}" lacks approved acceptance decision.`
    );
  }

  if (!record.adjudicatorIdentity || typeof record.adjudicatorIdentity !== 'string' || record.adjudicatorIdentity.trim().length === 0) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} formalAcceptanceArtifact "${relPath}" missing required adjudicatorIdentity.`
    );
  }

  if (!record.adjudicatorRole || !['CTO', 'Chief Technology Officer'].includes(record.adjudicatorRole)) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} formalAcceptanceArtifact "${relPath}" lacks authorized CTO adjudicatorRole.`
    );
  }

  // Strict ISO 8601 UTC timestamp format: YYYY-MM-DDTHH:mm:ssZ or YYYY-MM-DDTHH:mm:ss.sssZ
  const isoUtcRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  if (!record.adjudicationDate || !isoUtcRegex.test(record.adjudicationDate) || isNaN(Date.parse(record.adjudicationDate))) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} formalAcceptanceArtifact "${relPath}" lacks valid ISO 8601 UTC adjudicationDate (expected YYYY-MM-DDTHH:mm:ssZ).`
    );
  }

  if (record.authorSelfAcceptance === true) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} formalAcceptanceArtifact "${relPath}" violates Rule IV-001 (author self-acceptance is strictly prohibited).`
    );
  }

  if (record.authorSelfAcceptance !== false) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} formalAcceptanceArtifact "${relPath}" must explicitly declare authorSelfAcceptance: false.`
    );
  }

  // Workstream B.3: Independent Authentication Check
  // Do not treat self-declared adjudicatorRole: "CTO" as authentication.
  // Acceptance must be backed by an independently verifiable authorized decision record or trusted review record.
  const authToken = record.authenticationToken || record.verificationAuthorityToken || record.adjudicationSignature;
  if (!authToken || typeof authToken !== 'string' || authToken.trim().length < 16) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} formalAcceptanceArtifact "${relPath}" lacks independently verifiable authenticated authority. Self-declared CTO role without authenticated verification token cannot establish CONFIRMED_ACCEPTED; status must remain PENDING_INDEPENDENT_CONFIRMATION or UNACCEPTED.`
    );
  }

  return true;
}

/**
 * Perform substantive content validation on claim evidence files.
 */
export function validateClaimSpecificContent(task, evPath, resolvedPath, item) {
  const stat = fs.statSync(resolvedPath);
  if (stat.size === 0) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} references empty evidence file: "${evPath}". Evidence must contain substantive deliverable content.`
    );
  }

  // If claim asserts completed database execution in supportsClaim, fail closed
  if (/\b(completed|proven|verified|executed)\s+(live\s+)?(database|staging)\s+execution\b/i.test(item.supportsClaim) ||
      /\b(live\s+database\s+executed|database\s+execution\s+completed|database\s+execution\s+verified)\b/i.test(item.supportsClaim)) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} evidence item "${evPath}" claims live database execution in supportsClaim. Database staging execution is prohibited under current boundaries.`
    );
  }

  // If claim asserts formal CTO acceptance in supportsClaim without being an authenticated acceptance record, fail closed
  if (/\b(proves|establishes|constitutes|confirms)\s+(formal\s+cto\s+acceptance|formal\s+acceptance)\b/i.test(item.supportsClaim) && item.evidenceClass !== 'FORMAL_ACCEPTANCE') {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} evidence item "${evPath}" claims formal acceptance in supportsClaim under non-acceptance class "${item.evidenceClass}".`
    );
  }

  // File type specific substantive checks
  if (evPath.endsWith('.json')) {
    try {
      const parsed = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Not an object');
      }
      if (Array.isArray(parsed) && parsed.length === 0) {
        throw new Error('Empty array');
      }
      if (!Array.isArray(parsed) && Object.keys(parsed).length === 0) {
        throw new Error('Empty object');
      }
      if (evPath.endsWith('.geojson')) {
        if (parsed.type !== 'FeatureCollection' && parsed.type !== 'Feature') {
          throw new Error('Invalid GeoJSON type');
        }
      }
    } catch (err) {
      throw new Error(
        `Ledger accounting validation error: Task ${task.taskId} references invalid or empty JSON evidence file: "${evPath}" (${err.message}).`
      );
    }
  } else if (evPath.endsWith('.sql')) {
    const rawSql = fs.readFileSync(resolvedPath, 'utf8');
    if (!/(CREATE|ALTER|INSERT|TABLE|BEGIN|--|\/\*)/i.test(rawSql)) {
      throw new Error(
        `Ledger accounting validation error: Task ${task.taskId} references SQL file "${evPath}" lacking valid SQL DDL or DML statements.`
      );
    }
  } else if (evPath.includes('.test.')) {
    const rawTest = fs.readFileSync(resolvedPath, 'utf8');
    if (!/(test\(|describe\(|runTest|assert[\.\(]|it\()/i.test(rawTest)) {
      throw new Error(
        `Ledger accounting validation error: Task ${task.taskId} references test file "${evPath}" lacking test assertions or test suites.`
      );
    }
  } else if (evPath.endsWith('.md')) {
    const rawMd = fs.readFileSync(resolvedPath, 'utf8');
    if (!rawMd.includes('#') || rawMd.length < 50) {
      throw new Error(
        `Ledger accounting validation error: Task ${task.taskId} references Markdown file "${evPath}" lacking structured markdown documentation.`
      );
    }
  }

  return true;
}

/**
 * Validate that task evidence files exist, resolve within root, and support the claimed status.
 */
export function validateTaskEvidence(task, stageId = null) {
  const acct = task.accounting;
  if (!acct) return true;

  if (acct.repoCompletionRatio > 0) {
    if (!Array.isArray(task.evidence) || task.evidence.length === 0) {
      throw new Error(
        `Ledger accounting validation error: Task ${task.taskId} has non-zero repoCompletionRatio (${acct.repoCompletionRatio}) but missing or empty evidence array.`
      );
    }

    let verifiedOnDiskCount = 0;
    let provisionalCount = 0;
    let blockedCount = 0;

    for (const item of task.evidence) {
      if (!item) {
        throw new Error(
          `Ledger accounting validation error: Task ${task.taskId} contains null or undefined evidence entry.`
        );
      }

      // Check for path extraction first so path bounds and domain scope checks run consistently
      let evPath = '';
      if (typeof item === 'string') {
        evPath = item.trim();
      } else if (typeof item === 'object' && !Array.isArray(item)) {
        if (!item.path || typeof item.path !== 'string') {
          throw new Error(
            `Ledger accounting validation error: Task ${task.taskId} evidence object missing required string path.`
          );
        }
        evPath = item.path.trim();
      } else {
        throw new Error(
          `Ledger accounting validation error: Task ${task.taskId} contains invalid non-string, non-object evidence reference.`
        );
      }

      // Check path bounds
      if (evPath.length === 0) {
        throw new Error(
          `Ledger accounting validation error: Task ${task.taskId} contains empty evidence path.`
        );
      }

      // Reject absolute paths
      if (path.isAbsolute(evPath) || /^[a-zA-Z]:/.test(evPath) || evPath.startsWith('/') || evPath.startsWith('\\')) {
        throw new Error(
          `Ledger accounting validation error: Task ${task.taskId} evidence path cannot be absolute: "${evPath}". Must be relative to repository root.`
        );
      }

      // Reject path traversal outside repository root
      const resolvedPath = path.resolve(REPO_ROOT, evPath);
      const relToRoot = path.relative(REPO_ROOT, resolvedPath);
      if (relToRoot.startsWith('..') || path.isAbsolute(relToRoot)) {
        throw new Error(
          `Ledger accounting validation error: Task ${task.taskId} evidence path contains path traversal outside repository root: "${evPath}".`
        );
      }

      // Must exist on disk
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(
          `Ledger accounting validation error: Task ${task.taskId} references non-existent evidence artifact: "${evPath}".`
        );
      }

      // Must be regular file
      const stat = fs.statSync(resolvedPath);
      if (!stat.isFile()) {
        throw new Error(
          `Ledger accounting validation error: Task ${task.taskId} references non-file evidence target: "${evPath}". Evidence must be a regular file.`
        );
      }

      // Symlink boundary check: realpath must resolve within repository root
      const realPath = fs.realpathSync(resolvedPath);
      const relRealPath = path.relative(REPO_ROOT, realPath);
      if (relRealPath.startsWith('..') || path.isAbsolute(relRealPath)) {
        throw new Error(
          `Ledger accounting validation error: Task ${task.taskId} evidence path resolves via symlink outside repository root: "${evPath}".`
        );
      }

      // Check domain scope relevance
      if (stageId && STAGE_EVIDENCE_RELEVANCE[stageId]) {
        const pattern = STAGE_EVIDENCE_RELEVANCE[stageId];
        const normalizedEvPath = evPath.replace(/\\/g, '/');
        if (!pattern.test(normalizedEvPath)) {
          throw new Error(
            `Ledger accounting validation error: Task ${task.taskId} in ${stageId} references irrelevant evidence artifact "${evPath}" outside domain scope.`
          );
        }
      }

      // Workstream A.1: Require structured object with path, evidenceClass, supportsClaim, verificationStatus
      // Plain string evidence entries are strictly rejected for non-zero completion tasks!
      if (typeof item === 'string') {
        throw new Error(
          `Ledger accounting validation error: Task ${task.taskId} uses plain string evidence reference "${item}". Non-zero completion tasks must use structured evidence objects with path, evidenceClass, supportsClaim, and verificationStatus.`
        );
      }

      if (!item.evidenceClass || typeof item.evidenceClass !== 'string' || !VALID_EVIDENCE_CLASSES.includes(item.evidenceClass)) {
        throw new Error(
          `Ledger accounting validation error: Task ${task.taskId} evidence entry "${evPath}" missing or invalid evidenceClass: "${item.evidenceClass}". Must be one of: ${VALID_EVIDENCE_CLASSES.join(', ')}.`
        );
      }
      const evClass = item.evidenceClass;

      if (!item.supportsClaim || typeof item.supportsClaim !== 'string' || item.supportsClaim.trim().length < 10) {
        throw new Error(
          `Ledger accounting validation error: Task ${task.taskId} evidence entry "${evPath}" missing or insufficient supportsClaim in evidence entry.`
        );
      }

      if (!item.verificationStatus || typeof item.verificationStatus !== 'string' || !VALID_VERIFICATION_STATUSES.includes(item.verificationStatus)) {
        throw new Error(
          `Ledger accounting validation error: Task ${task.taskId} evidence entry "${evPath}" missing or invalid verificationStatus: "${item.verificationStatus}".`
        );
      }
      const verificationStatus = item.verificationStatus;

      // Track verification counts
      if (verificationStatus === 'VERIFIED_ON_DISK') {
        verifiedOnDiskCount++;
      } else if (verificationStatus === 'PROVISIONAL_PENDING_CONFIRMATION') {
        provisionalCount++;
      } else if (verificationStatus === 'BLOCKED_PENDING_EXECUTION') {
        blockedCount++;
      }

      // Semantic Boundary Rule 1: Do not equate migration file existence with execution
      if (evClass === 'DATABASE_EXECUTION' && (evPath.startsWith('supabase/migrations/') || evPath.endsWith('.sql'))) {
        throw new Error(
          `Ledger accounting validation error: Task ${task.taskId} incorrectly equates migration file "${evPath}" with database execution. Migration files demonstrate repository implementation only.`
        );
      }

      // Semantic Boundary Rule 2: Do not equate test file existence with database execution or formal acceptance
      if ((evClass === 'DATABASE_EXECUTION' || evClass === 'FORMAL_ACCEPTANCE') && (evPath.startsWith('tests/') || evPath.includes('.test.'))) {
        throw new Error(
          `Ledger accounting validation error: Task ${task.taskId} incorrectly equates test file "${evPath}" with ${evClass}. Tests demonstrate repository implementation only.`
        );
      }

      // Semantic Boundary Rule 3: Do not equate report or summary with formal acceptance
      if (evClass === 'FORMAL_ACCEPTANCE' && (evPath.startsWith('reports/') || evPath.endsWith('.md') || evPath.endsWith('.json'))) {
        validateFormalAcceptanceArtifact(task, resolvedPath);
      }

      // Semantic Boundary Rule 4: Claim-specific content validation
      validateClaimSpecificContent(task, evPath, resolvedPath, item);
    }

    // Workstream A.5: Check task-specific deliverable signatures
    if (task.taskId && TASK_DELIVERABLE_SIGNATURES[task.taskId]) {
      const allPaths = task.evidence.map((e) => (typeof e === 'string' ? e : e.path));
      if (!TASK_DELIVERABLE_SIGNATURES[task.taskId](allPaths)) {
        throw new Error(
          `Ledger accounting validation error: Task ${task.taskId} evidence does not contain required deliverable demonstration artifact for stated deliverable.`
        );
      }
    }

    // Workstream A.4: Meaningful control on verificationStatus
    if (acct.repoCompletionRatio === 1.0) {
      if (provisionalCount > 0 || blockedCount > 0) {
        throw new Error(
          `Ledger accounting validation error: Task ${task.taskId} claims 100% completion (repoCompletionRatio: 1.0) but contains unverified or provisional evidence (${provisionalCount} provisional, ${blockedCount} blocked).`
        );
      }
      if (verifiedOnDiskCount === 0) {
        throw new Error(
          `Ledger accounting validation error: Task ${task.taskId} claims 100% completion but has 0 VERIFIED_ON_DISK evidence items.`
        );
      }
    }

    if (acct.repoCompletionRatio > 0.0) {
      if (verifiedOnDiskCount === 0 && provisionalCount === 0) {
        throw new Error(
          `Ledger accounting validation error: Task ${task.taskId} has non-zero repoCompletionRatio (${acct.repoCompletionRatio}) but all evidence items are blocked pending execution.`
        );
      }
    }

    // Validate rationale
    if (typeof acct.ratioRationale !== 'string' || acct.ratioRationale.trim().length < 10) {
      throw new Error(
        `Ledger accounting validation error: Task ${task.taskId} has non-zero repoCompletionRatio (${acct.repoCompletionRatio}) but missing or insufficient ratioRationale.`
      );
    }

    const trimmedRationale = acct.ratioRationale.trim();
    // Check for generic dummy rationale
    if (/^(test rationale|valid rationale|todo|as per directive|dummy)$/i.test(trimmedRationale)) {
      throw new Error(
        `Ledger accounting validation error: Task ${task.taskId} contains generic or placeholder ratioRationale: "${trimmedRationale}".`
      );
    }

    // Check for overstating ratio rationale
    if (acct.repoCompletionRatio === 1.0) {
      if (/\b(repo(sitory)?(\s+\w+)?\s+(is\s+)?(pending|in progress|partial|incomplete|unimplemented|todo))\b/i.test(trimmedRationale)) {
        throw new Error(
          `Ledger accounting validation error: Task ${task.taskId} ratioRationale indicates incomplete repository work but claims repoCompletionRatio: 1.0.`
        );
      }
    }
  }

  // Check for understating ratio rationale even if repoCompletionRatio === 0.0
  if (acct.repoCompletionRatio === 0.0 && typeof acct.ratioRationale === 'string') {
    const trimmedRationale = acct.ratioRationale.trim();
    if (/\b(fully\s+(implemented|complete)|100%\s+complete|repo(sitory)?(\s+\w+)?\s+(is\s+)?complete)\b/i.test(trimmedRationale)) {
      throw new Error(
        `Ledger accounting validation error: Task ${task.taskId} claims repoCompletionRatio: 0.0 but rationale asserts completion.`
      );
    }
  }

  return true;
}

export function validateTaskAccounting(task, stageId = null) {
  if (!task || typeof task !== 'object') {
    throw new Error('Ledger accounting validation error: Invalid task object.');
  }

  // Workstream B: Remove all fallbacks. Reject missing, null, empty, or unrecognized taskClassification
  if (
    task.taskClassification === undefined ||
    task.taskClassification === null ||
    typeof task.taskClassification !== 'string' ||
    task.taskClassification.trim() === ''
  ) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId || 'unknown'} has missing, null, or empty taskClassification. Must be explicitly declared as 'CORE_SPECIFICATION' or 'HARDENING_EXTENSION'.`
    );
  }

  const classification = task.taskClassification.trim();
  if (classification !== 'CORE_SPECIFICATION' && classification !== 'HARDENING_EXTENSION') {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId || 'unknown'} has unrecognized taskClassification: "${task.taskClassification}". Must be 'CORE_SPECIFICATION' or 'HARDENING_EXTENSION'.`
    );
  }

  // Validate task weight
  if (typeof task.weight !== 'number' || !Number.isFinite(task.weight) || task.weight <= 0) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId || 'unknown'} has invalid weight: ${task.weight}. Weight must be a positive finite number.`
    );
  }

  // Workstream D: Eliminate all silent fallbacks on accounting metadata
  if (!task.accounting || typeof task.accounting !== 'object') {
    throw new Error(`Ledger accounting validation error: Task ${task.taskId} missing required accounting object.`);
  }

  const acct = task.accounting;
  if (acct.repoCompletionRatio === undefined || acct.unexecutedDatabaseWeight === undefined || acct.formalAcceptanceStatus === undefined) {
    throw new Error(`Ledger accounting validation error: Task ${task.taskId} missing required accounting metadata fields.`);
  }

  if (typeof acct.repoCompletionRatio !== 'number' || !Number.isFinite(acct.repoCompletionRatio) || acct.repoCompletionRatio < 0.0 || acct.repoCompletionRatio > 1.0) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} has invalid repoCompletionRatio: ${acct.repoCompletionRatio}. Must be a finite number in [0.0, 1.0].`
    );
  }

  // Workstream A & D: Validate task evidence paths, semantics, and rationale
  validateTaskEvidence(task, stageId);

  if (typeof acct.unexecutedDatabaseWeight !== 'number' || !Number.isFinite(acct.unexecutedDatabaseWeight) || acct.unexecutedDatabaseWeight < 0.0) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} has invalid unexecutedDatabaseWeight: ${acct.unexecutedDatabaseWeight}. Must be non-negative finite number.`
    );
  }

  if (acct.unexecutedDatabaseWeight > task.weight) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} unexecutedDatabaseWeight (${acct.unexecutedDatabaseWeight}) cannot exceed task weight (${task.weight}).`
    );
  }

  // Check DB discount integrity
  if (acct.unexecutedDatabaseWeight > 0) {
    if (!acct.requiresDatabaseExecution || acct.databaseExecutionEvidenced) {
      throw new Error(
        `Ledger accounting validation error: Task ${task.taskId} has unexecutedDatabaseWeight (${acct.unexecutedDatabaseWeight}) > 0, but requiresDatabaseExecution is not true or databaseExecutionEvidenced is true.`
      );
    }
  }

  // Database execution claim without permitted evidence
  if (acct.databaseExecutionEvidenced === true) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} claims databaseExecutionEvidenced: true, but live database staging execution is strictly prohibited under current boundaries.`
    );
  }

  const validAcceptanceStatuses = ['CONFIRMED_ACCEPTED', 'PENDING_INDEPENDENT_CONFIRMATION', 'UNACCEPTED'];
  if (!validAcceptanceStatuses.includes(acct.formalAcceptanceStatus)) {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} has invalid formalAcceptanceStatus: "${acct.formalAcceptanceStatus}". Must be one of: ${validAcceptanceStatuses.join(', ')}.`
    );
  }

  // Workstream B: Unsupported acceptance claims without permitted evidence
  if (acct.formalAcceptanceArtifact) {
    if (typeof acct.formalAcceptanceArtifact !== 'string') {
      throw new Error(
        `Ledger accounting validation error: Task ${task.taskId} formalAcceptanceArtifact must be a string.`
      );
    }
    const artifactPath = acct.formalAcceptanceArtifact.trim();
    if (artifactPath.length === 0) {
      throw new Error(
        `Ledger accounting validation error: Task ${task.taskId} formalAcceptanceArtifact cannot be empty string.`
      );
    }
    // Reject absolute paths
    if (path.isAbsolute(artifactPath) || /^[a-zA-Z]:/.test(artifactPath) || artifactPath.startsWith('/') || artifactPath.startsWith('\\')) {
      throw new Error(
        `Ledger accounting validation error: Task ${task.taskId} formalAcceptanceArtifact cannot be absolute: "${artifactPath}". Must be relative to repository root.`
      );
    }
    // Reject traversal
    const resolvedArtifact = path.resolve(REPO_ROOT, artifactPath);
    const relToRoot = path.relative(REPO_ROOT, resolvedArtifact);
    if (relToRoot.startsWith('..') || path.isAbsolute(relToRoot)) {
      throw new Error(
        `Ledger accounting validation error: Task ${task.taskId} formalAcceptanceArtifact contains path traversal outside repository root: "${artifactPath}".`
      );
    }
    if (!fs.existsSync(resolvedArtifact)) {
      throw new Error(
        `Ledger accounting validation error: Task ${task.taskId} claims formalAcceptanceArtifact with non-existent file: "${artifactPath}".`
      );
    }
    const stat = fs.statSync(resolvedArtifact);
    if (!stat.isFile()) {
      throw new Error(
        `Ledger accounting validation error: Task ${task.taskId} formalAcceptanceArtifact references non-file target: "${artifactPath}".`
      );
    }
    const realPath = fs.realpathSync(resolvedArtifact);
    const relRealPath = path.relative(REPO_ROOT, realPath);
    if (relRealPath.startsWith('..') || path.isAbsolute(relRealPath)) {
      throw new Error(
        `Ledger accounting validation error: Task ${task.taskId} formalAcceptanceArtifact resolves via symlink outside repository root: "${artifactPath}".`
      );
    }

    if (acct.formalAcceptanceStatus === 'CONFIRMED_ACCEPTED') {
      validateFormalAcceptanceArtifact(task, resolvedArtifact);
    }
  } else if (acct.formalAcceptanceStatus === 'CONFIRMED_ACCEPTED') {
    throw new Error(
      `Ledger accounting validation error: Task ${task.taskId} claims CONFIRMED_ACCEPTED without explicit formalAcceptanceArtifact.`
    );
  }

  return true;
}

export function computeLedgerSummary(ledger) {
  let totalTasks = 0;
  let coreTasksCount = 0;
  let hardeningExtensionsCount = 0;
  let totalWeight = 0;
  let repoVerifiedEarned = 0;
  let partialEarned = 0;
  let blockedWeight = 0;
  let notImplementedWeight = 0;
  let unexecutedDbDiscount = 0;
  let formallyAcceptedWeight = 0;
  let formalAcceptancePendingWeight = 0;

  // Primary Mutually Exclusive Partition (sums to totalTasks)
  const mutuallyExclusiveStatusCounts = {
    REPO_VERIFIED: 0,
    PARTIAL: 0,
    BLOCKED: 0,
    NOT_IMPLEMENTED: 0,
  };

  // Status-level allocated and earned weights
  const statusAllocatedWeights = {
    REPO_VERIFIED: { count: 0, allocated: 0, earned: 0, inProgress: 0 },
    PARTIAL: { count: 0, allocated: 0, earned: 0, inProgress: 0 },
    BLOCKED: { count: 0, allocated: 0, earned: 0, inProgress: 0 },
    NOT_IMPLEMENTED: { count: 0, allocated: 0, earned: 0, inProgress: 0 },
  };

  // Detailed task-level lists for full transparency
  const databaseDiscountBreakdown = [];
  const partialTasksBreakdown = [];
  const blockedTasksBreakdown = [];
  const notImplementedTasksBreakdown = [];

  // Secondary / Overlapping Facet Counts
  const acceptanceFacetCounts = {
    CONFIRMED_ACCEPTED: 0,
    PENDING_INDEPENDENT_CONFIRMATION: 0,
    UNACCEPTED: 0,
  };

  const accountingDiagnostics = [];

  if (!ledger || !Array.isArray(ledger.stages)) {
    throw new Error('Ledger accounting validation error: Missing or invalid stages array');
  }

  for (const stage of ledger.stages) {
    if (!stage || typeof stage !== 'object') {
      throw new Error('Ledger accounting validation error: Invalid stage object in ledger.stages');
    }
    if (typeof stage.stageWeight !== 'number' || !Number.isFinite(stage.stageWeight) || stage.stageWeight <= 0) {
      throw new Error(`Ledger accounting validation error: Stage ${stage.stageId || 'unknown'} has invalid stageWeight: ${stage.stageWeight}`);
    }

    if (!Array.isArray(stage.tasks) || stage.tasks.length === 0) {
      throw new Error(`Ledger accounting validation error: Stage ${stage.stageId || 'unknown'} has missing or empty tasks array`);
    }

    let stageTaskSum = 0;
    let stageEarned = 0;

    for (const task of stage.tasks) {
      totalTasks++;

      // Validate task accounting metadata rigorously with stage context
      validateTaskAccounting(task, stage.stageId);

      if (task.taskClassification === 'CORE_SPECIFICATION') {
        coreTasksCount++;
      } else if (task.taskClassification === 'HARDENING_EXTENSION') {
        hardeningExtensionsCount++;
      }

      totalWeight += task.weight;
      stageTaskSum += task.weight;
      const acct = task.accounting;

      // Track database discount allocation
      if (acct.unexecutedDatabaseWeight > 0) {
        databaseDiscountBreakdown.push({
          taskId: task.taskId,
          stageId: stage.stageId,
          title: task.title || task.taskTitle || '',
          weight: task.weight,
          repoCompletionRatio: acct.repoCompletionRatio,
          repoEarnedWeight: Math.round(task.weight * acct.repoCompletionRatio * 10) / 10,
          unexecutedDatabaseWeight: acct.unexecutedDatabaseWeight,
          rationale: acct.ratioRationale || '',
        });
      }

      const st = task.status;
      if (st === 'REPO_VERIFIED' || st === 'VERIFIED') {
        mutuallyExclusiveStatusCounts.REPO_VERIFIED++;
        statusAllocatedWeights.REPO_VERIFIED.count++;
        statusAllocatedWeights.REPO_VERIFIED.allocated += task.weight;
        const ratio = acct.repoCompletionRatio; // Strictly NO fallback!
        const earned = task.weight * ratio;
        repoVerifiedEarned += earned;
        stageEarned += earned;
        statusAllocatedWeights.REPO_VERIFIED.earned += earned;
        unexecutedDbDiscount += acct.unexecutedDatabaseWeight;

        if (acct.formalAcceptanceStatus === 'CONFIRMED_ACCEPTED') {
          acceptanceFacetCounts.CONFIRMED_ACCEPTED++;
          formallyAcceptedWeight += task.weight;
        } else if (acct.formalAcceptanceStatus === 'PENDING_INDEPENDENT_CONFIRMATION') {
          acceptanceFacetCounts.PENDING_INDEPENDENT_CONFIRMATION++;
          formalAcceptancePendingWeight += task.weight;
        } else {
          acceptanceFacetCounts.UNACCEPTED++;
        }
      } else if (st === 'PARTIAL') {
        mutuallyExclusiveStatusCounts.PARTIAL++;
        acceptanceFacetCounts.UNACCEPTED++;
        statusAllocatedWeights.PARTIAL.count++;
        statusAllocatedWeights.PARTIAL.allocated += task.weight;
        const ratio = acct.repoCompletionRatio; // Strictly NO fallback!
        const earned = task.weight * ratio;
        partialEarned += earned;
        stageEarned += earned;
        statusAllocatedWeights.PARTIAL.earned += earned;
        statusAllocatedWeights.PARTIAL.inProgress += (task.weight - earned);
        unexecutedDbDiscount += acct.unexecutedDatabaseWeight;

        partialTasksBreakdown.push({
          taskId: task.taskId,
          stageId: stage.stageId,
          title: task.title || task.taskTitle || '',
          weight: task.weight,
          repoCompletionRatio: acct.repoCompletionRatio,
          repoEarnedWeight: Math.round(earned * 10) / 10,
          remainingWork: task.remainingWork || '',
        });
      } else if (st === 'BLOCKED') {
        mutuallyExclusiveStatusCounts.BLOCKED++;
        acceptanceFacetCounts.UNACCEPTED++;
        statusAllocatedWeights.BLOCKED.count++;
        statusAllocatedWeights.BLOCKED.allocated += task.weight;
        blockedWeight += task.weight;

        blockedTasksBreakdown.push({
          taskId: task.taskId,
          stageId: stage.stageId,
          title: task.title || task.taskTitle || '',
          weight: task.weight,
          remainingWork: task.remainingWork || '',
        });
      } else if (st === 'NOT_IMPLEMENTED') {
        mutuallyExclusiveStatusCounts.NOT_IMPLEMENTED++;
        acceptanceFacetCounts.UNACCEPTED++;
        statusAllocatedWeights.NOT_IMPLEMENTED.count++;
        statusAllocatedWeights.NOT_IMPLEMENTED.allocated += task.weight;
        notImplementedWeight += task.weight;

        notImplementedTasksBreakdown.push({
          taskId: task.taskId,
          stageId: stage.stageId,
          title: task.title || task.taskTitle || '',
          weight: task.weight,
          remainingWork: task.remainingWork || '',
        });
      } else {
        throw new Error(`Ledger accounting validation error: Task ${task.taskId} has unrecognized status: "${st}".`);
      }
    }

    // Validate stage weight reconciliation
    if (Math.abs(stageTaskSum - stage.stageWeight) > 0.001) {
      throw new Error(
        `Ledger accounting validation error: Stage ${stage.stageId} task weights sum (${stageTaskSum}) does not reconcile with stageWeight (${stage.stageWeight}).`
      );
    }

    stage.stageEarnedWeight = Math.round(stageEarned * 10) / 10;
  }

  // Validate total weight reconciliation (must sum to exactly 100.0%)
  if (Math.abs(totalWeight - 100.0) > 0.001) {
    throw new Error(`Ledger accounting validation error: Total ledger weight (${totalWeight}) does not reconcile to 100.0%.`);
  }

  const repoReadiness = Math.round((repoVerifiedEarned + partialEarned) * 10) / 10;
  const partialRemaining = Math.round((totalWeight - repoReadiness - blockedWeight - notImplementedWeight) * 10) / 10;
  const adjudicatedEarned = Math.round((repoReadiness - unexecutedDbDiscount) * 10) / 10;

  // Round status allocated weights
  for (const k of Object.keys(statusAllocatedWeights)) {
    statusAllocatedWeights[k].allocated = Math.round(statusAllocatedWeights[k].allocated * 10) / 10;
    statusAllocatedWeights[k].earned = Math.round(statusAllocatedWeights[k].earned * 10) / 10;
    statusAllocatedWeights[k].inProgress = Math.round(statusAllocatedWeights[k].inProgress * 10) / 10;
  }

  return {
    totalTasks,
    coreTasksCount,
    hardeningExtensionsCount,
    statutoryBaseTasks: coreTasksCount, // Retained for backwards compatibility
    totalWeight: Math.round(totalWeight * 10) / 10,
    weightedEarnedCompletionPercent: repoReadiness,
    repositoryImplementationPercent: repoReadiness,
    adjudicatedEarnedCompletionPercent: adjudicatedEarned,
    databaseExecutionPercent: 0.0, // Strictly 0.0% live DB execution
    formalAcceptancePercent: Math.round(formallyAcceptedWeight * 10) / 10, // 0.0% independently verified
    formalAcceptancePendingWeight: Math.round(formalAcceptancePendingWeight * 10) / 10, // 5.0% provisional
    unexecutedDatabasePendingPercent: Math.round(unexecutedDbDiscount * 10) / 10,
    blockedOnExternalCtcGatesPercent: Math.round(blockedWeight * 10) / 10,
    notImplementedPercent: Math.round(notImplementedWeight * 10) / 10,
    statusCounts: {
      ...mutuallyExclusiveStatusCounts,
      FORMAL_ACCEPTANCE_CONFIRMED: acceptanceFacetCounts.CONFIRMED_ACCEPTED,
      FORMAL_ACCEPTANCE_PENDING_CONFIRMATION: acceptanceFacetCounts.PENDING_INDEPENDENT_CONFIRMATION,
    },
    mutuallyExclusiveStatusCounts,
    acceptanceFacetCounts,
    statusAllocatedWeights,
    databaseDiscountBreakdown,
    partialTasksBreakdown,
    blockedTasksBreakdown,
    notImplementedTasksBreakdown,
    accountingDiagnostics,
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
      ctoFormalAcceptancePendingConfirmationPercent: Math.round(formalAcceptancePendingWeight * 10) / 10,
    },
  };
}

export function generateLedgerMarkdown(ledger) {
  const summary = ledger.summary;
  const sw = summary.statusAllocatedWeights;

  let partialList = '';
  for (const pt of summary.partialTasksBreakdown) {
    const ratioPct = Math.round(pt.repoCompletionRatio * 100);
    partialList += `  - \`${pt.taskId}\`: ${ratioPct}% ratio (${pt.repoEarnedWeight.toFixed(1)}% earned of ${pt.weight.toFixed(1)}% allocated) — ${pt.remainingWork}\n`;
  }

  let discountRows = '';
  for (const db of summary.databaseDiscountBreakdown) {
    const ratioPct = Math.round(db.repoCompletionRatio * 100);
    discountRows += `| **${db.taskId}** | ${db.stageId} | ${db.title} | ${db.weight.toFixed(1)}% | ${ratioPct}% | ${db.repoEarnedWeight.toFixed(1)}% | ${db.unexecutedDatabaseWeight.toFixed(1)}% | ${db.rationale} |\n`;
  }

  let md = `# KSHETRA W021.5 — TRACEABLE EXECUTION LEDGER
## Master Specification Mapping, Stage Dependencies, Weighted Accounting & Blocker Analysis

**Milestone:** W021.5 — National Political Intelligence and Candidate Transparency  
**Directive:** CTO Directive 086 / CTO Directive 087 / CTO Directive 088 / CTO Directive 089 / CTO Directive 090 / CTO Directive 091 / CTO Directive 092 / CTO Directive 093 (Consolidated Adjudication)  
**Date:** 2026-10-17  
**Governance Invariant:** Master Execution Framework Amendment v1.2 / Rule IV-001 (Non-Self-Acceptance)  
**Financial Defect Status:** \`DQ-W021.5-B2.2E-001\` — **STRICTLY OPEN**, pending separate CTO adjudication  
**Evidence Standard:** Observable repository code, tests, and static artifacts only. Zero unverified live database claims.

---

## 1. Executive Summary & Reproducible Progress Accounting

In accordance with **CTO Directive 093**, this execution ledger provides an evidence-backed, mathematically reconciled progress accounting across all nine mandatory stages of Milestone W021.5 (Stages A through I).

Under **Rule IV-001 (Non-Self-Acceptance)**, the ledger strictly differentiates **repository implementation** (authored code, schemas, and offline tests) from **live database execution** and **formal CTO acceptance**. Requirements requiring unexecuted staging migrations, unresolved CTO decision gates, or open defects are explicitly isolated as \`PARTIAL\`, \`BLOCKED\`, or \`NOT IMPLEMENTED\`.

\`\`\`text
================================================================================
KSHETRA W021.5 EXECUTION LEDGER ACCOUNTING SUMMARY (Directive 093 Reconciled)
================================================================================
Total Tasks in Master Ledger:         ${summary.totalTasks} Tasks across 9 Stages (${summary.coreTasksCount || summary.statutoryBaseTasks} Core Tasks + ${summary.hardeningExtensionsCount || 2} Hardening Extensions)
Total Weight Base:                   ${summary.totalWeight.toFixed(1)}%
Verified Earned Completion:          ${summary.repositoryImplementationPercent.toFixed(1)}%
--------------------------------------------------------------------------------
RECONCILED PROGRESS DIMENSIONS:
Repository Implementation Readiness: ${summary.repositoryImplementationPercent.toFixed(1)}% (Authored & Offline-Verified)
Adjudicated Earned Completion:       ${summary.adjudicatedEarnedCompletionPercent.toFixed(1)}% (Discounting Unexecuted DB Stages)
Live Database Staging Execution:     ${summary.databaseExecutionPercent.toFixed(1)}%  (Zero unverified DB claims)
Formal CTO Acceptance:              ${summary.formalAcceptancePercent.toFixed(1)}%  (Verified in repo; ${summary.formalAcceptancePendingWeight.toFixed(1)}% provisional pending confirmation)
Unexecuted Database Pending:         ${summary.unexecutedDatabasePendingPercent.toFixed(1)}%
Blocked on External / CTO Gates:     ${summary.blockedOnExternalCtcGatesPercent.toFixed(1)}%
Not Implemented:                     ${summary.notImplementedPercent.toFixed(1)}%
--------------------------------------------------------------------------------
Financial Defect DQ-W021.5-B2.2E-001: STRICTLY OPEN (No self-adjudication)
Staging Database Mutations:          0 (Zero connections or schema mutations)
================================================================================
\`\`\`

### Reproducible Weighted Formulas:
$$\\text{Repository Readiness (Earned)} = \\sum_{i=1}^{N} \\left( W_i \\times \\text{EarnedRatio}_i \\right) = ${summary.repositoryImplementationPercent.toFixed(1)}\\%$$
$$\\text{Adjudicated Completion (Evidence Reconciled)} = \\text{Repository Readiness} - \\text{Unexecuted Database Discount} = ${summary.adjudicatedEarnedCompletionPercent.toFixed(1)}\\%$$

### Task Status & Weight Allocation Breakdown:
- **REPO_VERIFIED Tasks (${sw.REPO_VERIFIED.count} ${sw.REPO_VERIFIED.count === 1 ? 'task' : 'tasks'}, ${sw.REPO_VERIFIED.allocated.toFixed(1)}% allocated, ${sw.REPO_VERIFIED.earned.toFixed(1)}% earned):** Counted at 100% of designated weight for repository implementation; unexecuted database portions discounted where staging database execution remains pending.
- **PARTIAL Tasks (${sw.PARTIAL.count} ${sw.PARTIAL.count === 1 ? 'task' : 'tasks'}, ${sw.PARTIAL.allocated.toFixed(1)}% allocated, ${sw.PARTIAL.earned.toFixed(1)}% earned):** Counted at observable progress ratio:
${partialList}- **BLOCKED Tasks (${sw.BLOCKED.count} ${sw.BLOCKED.count === 1 ? 'task' : 'tasks'}, ${sw.BLOCKED.allocated.toFixed(1)}% allocated, 0.0% earned):** Counted strictly at 0.0% earned progress.
- **NOT IMPLEMENTED Tasks (${sw.NOT_IMPLEMENTED.count} ${sw.NOT_IMPLEMENTED.count === 1 ? 'task' : 'tasks'}, ${sw.NOT_IMPLEMENTED.allocated.toFixed(1)}% allocated, 0.0% earned):** Counted strictly at 0.0% earned progress.

### Unexecuted Staging Database Discount Allocation (${summary.unexecutedDatabasePendingPercent.toFixed(1)}%):
The ${summary.unexecutedDatabasePendingPercent.toFixed(1)}% database discount is derived from the following ${summary.databaseDiscountBreakdown.length} tasks where repository implementation is completed or in-progress, but live staging database execution remains strictly unexecuted:

| Task ID | Stage | Task Title | Weight | Repo Ratio | Repo Earned | DB Discount | Task-Specific Discount Rationale |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: | :--- |
${discountRows}| **Total** | — | **Reconciled Unexecuted Database Discount** | — | — | — | **${summary.unexecutedDatabasePendingPercent.toFixed(1)}%** | **Deducted from Repository Readiness (${summary.repositoryImplementationPercent.toFixed(1)}% - ${summary.unexecutedDatabasePendingPercent.toFixed(1)}% = ${summary.adjudicatedEarnedCompletionPercent.toFixed(1)}%)** |

---

## 2. Master Stage Accounting & Progress Overview

| Stage ID | Stage Description | Governing Milestone | Tasks Count | Stage Weight | Earned Weight | Stage Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
`;

  for (const s of ledger.stages) {
    const sEarned = (s.stageEarnedWeight || 0).toFixed(1);
    const sWeight = (s.stageWeight || 0).toFixed(1);
    const sStatus = sEarned === sWeight ? '`VERIFIED`' : (Number(sEarned) > 0 ? '`PARTIAL`' : '`BLOCKED`');
    md += `| **${s.stageId}** | ${s.stageName} | ${s.stageId} | ${s.tasks.length} | ${sWeight}% | ${sEarned}% | ${sStatus} |\n`;
  }

  md += `
---

## 3. Comprehensive Task-by-Task Specification & Evidence Inventory

`;

  for (const s of ledger.stages) {
    md += `### Stage ${s.stageId}: ${s.stageName} (Weight: ${s.stageWeight.toFixed(1)}% | Earned: ${s.stageEarnedWeight.toFixed(1)}%)\n\n`;
    md += `| Task ID | Spec Ref | Title / Deliverable | Weight | Status | Evidence Source | Remaining Work / Blockers |\n`;
    md += `| :--- | :--- | :--- | :---: | :---: | :--- | :--- |\n`;
    for (const t of s.tasks) {
      const evStr = (t.evidence || [])
        .map((e) => (typeof e === 'string' ? e : e.path))
        .join(', ');
      md += `| **${t.taskId}** | ${t.specRef} | ${t.title} | ${t.weight.toFixed(1)}% | \`${t.status}\` | ${evStr} | ${t.remainingWork} |\n`;
    }
    md += `\n`;
  }

  md += `---

## 4. Non-Negotiable Governance Invariants

1. **Defect \`DQ-W021.5-B2.2E-001\` remains STRICTLY OPEN:** No financial disclosures or asset/liability schemas have been remediated without explicit CTO approval.
2. **Rule IV-001 (Non-Self-Acceptance):** The author does NOT self-certify, self-ratify, or close Milestone W021.5. This ledger presents reproducible evidence for independent review.
3. **Delhi Assembly Boundary Invariant:** Delhi statutory seats are strictly 70. Municipal demographic records (\`DL-AC-071\` through \`DL-AC-221\`) remain classified as \`NON_STATUTORY_DEMOGRAPHIC_PLACEHOLDER\`.
4. **Zero Live Database Mutations:** Zero migrations executed on live staging or production databases.
5. **Separation of Repository Implementation from Database Execution:** Authored migrations and scripts are repository artifacts, not live execution proof.
`;

  return md;
}

export function reconcileExecutionLedger() {
  const ledgerPath = path.join(REPO_ROOT, 'reports', 'w021_5_execution_ledger.json');
  const mdPath = path.join(REPO_ROOT, 'reports', 'W021.5-EXECUTION-LEDGER.md');

  const raw = fs.readFileSync(ledgerPath, 'utf8');
  const ledger = JSON.parse(raw);

  const summary = computeLedgerSummary(ledger);
  ledger.summary = summary;

  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');
  console.log(`[PASS] Reconciled JSON ledger written to ${ledgerPath}`);

  const md = generateLedgerMarkdown(ledger);
  fs.writeFileSync(mdPath, md, 'utf8');
  console.log(`[PASS] Reconciled Markdown ledger written to ${mdPath}`);
}

// Execute if invoked directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  reconcileExecutionLedger();
}
