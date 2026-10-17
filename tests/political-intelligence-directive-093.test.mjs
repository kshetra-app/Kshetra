#!/usr/bin/env node

/**
 * tests/political-intelligence-directive-093.test.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 093 Verification Suite
 * Evidence Claim Integrity, Authenticated Acceptance, and Independent Ledger Verification
 *
 * Covers:
 * 1. Workstream A: Fail-Closed Evidence Validation & Content Substantiation (14 tests)
 * 2. Workstream B: Formal CTO Acceptance Authority & Boundary Hardening (7 tests)
 * 3. Workstream C: Reconciled Ledger Integrity & Multi-Dimensional Accounting (5 tests)
 * 4. Workstream D: Baseline Immutability, Minimal Diffs & Governance (6 tests)
 * Total: 32 rigorous adversarial tests
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

import {
  validateTaskAccounting,
  validateTaskEvidence,
  validateClaimSpecificContent,
  validateFormalAcceptanceArtifact,
  computeLedgerSummary,
  reconcileExecutionLedger,
  generateLedgerMarkdown,
  getCanonicalAcceptancePayload,
  TASK_DELIVERABLE_SIGNATURES,
  STAGE_EVIDENCE_RELEVANCE,
} from '../scripts/reconcile_execution_ledger.mjs';

import { verifyMigrationImmutability } from '../scripts/verify-migration-immutability.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const BASELINE_COMMIT_089 = '0ea572d860aa064766042f6b418b157fd8e2098f';
const BASELINE_COMMIT_090 = 'fb408cec80a21bf4a6b7c82fe665203b64c39af1';

console.log('================================================================');
console.log('KSHETRA W021.5 — CTO DIRECTIVE 093 VERIFICATION SUITE');
console.log('Evidence Claim Integrity, Authenticated Acceptance & Ledger Verification');
console.log('================================================================\n');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failedTests++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Workstream A: Fail-Closed Evidence Validation & Content Substantiation
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Workstream A: Fail-Closed Evidence Validation & Content Substantiation ---');

runTest('1.1 Plain string evidence entries fail closed for non-zero completion tasks', () => {
  const plainStrTask = {
    taskId: 'W021.5-TEST-STR-01',
    taskTitle: 'Plain String Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: ['scripts/reconcile_execution_ledger.mjs'],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid ratio rationale text here for plain string check',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(plainStrTask),
    /uses plain string evidence reference .* Non-zero completion tasks must use structured evidence objects/
  );
});

runTest('1.2 Structured evidence missing required fields fails closed', () => {
  // Missing evidenceClass
  const missingClassTask = {
    taskId: 'W021.5-TEST-MISSCLASS-01',
    taskTitle: 'Missing Class Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'scripts/reconcile_execution_ledger.mjs',
        supportsClaim: 'Reconciler script authored and maintained in repository',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid ratio rationale text here for missing class check',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(missingClassTask),
    /missing or invalid evidenceClass/
  );

  // Missing supportsClaim
  const missingClaimTask = {
    ...missingClassTask,
    taskId: 'W021.5-TEST-MISSCLAIM-01',
    evidence: [
      {
        path: 'scripts/reconcile_execution_ledger.mjs',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
  };
  assert.throws(
    () => validateTaskAccounting(missingClaimTask),
    /missing or insufficient supportsClaim/
  );

  // Missing verificationStatus
  const missingStatusTask = {
    ...missingClassTask,
    taskId: 'W021.5-TEST-MISSSTAT-01',
    evidence: [
      {
        path: 'scripts/reconcile_execution_ledger.mjs',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Reconciler script authored and maintained in repository',
      },
    ],
  };
  assert.throws(
    () => validateTaskAccounting(missingStatusTask),
    /missing or invalid verificationStatus/
  );
});

runTest('1.3 Empty evidence files (0 bytes) fail closed', () => {
  const tmpEmptyFile = path.join(REPO_ROOT, 'reports/.tmp_empty_evidence.txt');
  fs.writeFileSync(tmpEmptyFile, '', 'utf8');

  try {
    const emptyFileTask = {
      taskId: 'W021.5-TEST-EMPTYFILE-01',
      taskTitle: 'Empty File Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'reports/.tmp_empty_evidence.txt',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Demonstrates empty file deliverable check',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid ratio rationale text here for empty file check',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'UNACCEPTED',
      },
    };
    assert.throws(
      () => validateTaskAccounting(emptyFileTask),
      /references empty evidence file/
    );
  } finally {
    if (fs.existsSync(tmpEmptyFile)) fs.unlinkSync(tmpEmptyFile);
  }
});

runTest('1.4 Empty JSON payload (array or object) fails substantive deliverable check', () => {
  const tmpEmptyJson = path.join(REPO_ROOT, 'reports/.tmp_empty_array.json');
  fs.writeFileSync(tmpEmptyJson, '[]', 'utf8');

  try {
    const emptyJsonTask = {
      taskId: 'W021.5-TEST-EMPTYJSON-01',
      taskTitle: 'Empty JSON Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'reports/.tmp_empty_array.json',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Demonstrates empty json deliverable check',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid ratio rationale text here for empty json check',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'UNACCEPTED',
      },
    };
    assert.throws(
      () => validateTaskAccounting(emptyJsonTask),
      /references invalid or empty JSON evidence file/
    );
  } finally {
    if (fs.existsSync(tmpEmptyJson)) fs.unlinkSync(tmpEmptyJson);
  }
});

runTest('1.5 SQL evidence files lacking valid DDL/DML statements fail closed', () => {
  const tmpNonSql = path.join(REPO_ROOT, 'reports/.tmp_not_real_sql.sql');
  fs.writeFileSync(tmpNonSql, 'just some plain text without any sql', 'utf8');

  try {
    const nonSqlTask = {
      taskId: 'W021.5-TEST-NONSQL-01',
      taskTitle: 'Non-SQL Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'reports/.tmp_not_real_sql.sql',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Demonstrates non-sql deliverable check',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid ratio rationale text here for non-sql check',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'UNACCEPTED',
      },
    };
    assert.throws(
      () => validateTaskAccounting(nonSqlTask),
      /references SQL file .* lacking valid SQL DDL or DML statements/
    );
  } finally {
    if (fs.existsSync(tmpNonSql)) fs.unlinkSync(tmpNonSql);
  }
});

runTest('1.6 Test files lacking assertions or test suites fail closed', () => {
  const tmpNonTest = path.join(REPO_ROOT, 'reports/.tmp_empty_suite.test.mjs');
  fs.writeFileSync(tmpNonTest, '// Just a comment without any describe/test/assert\nconsole.log(1);\n', 'utf8');

  try {
    const nonTestTask = {
      taskId: 'W021.5-TEST-NONTEST-01',
      taskTitle: 'Non-Test Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'reports/.tmp_empty_suite.test.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Demonstrates test file verification check',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid ratio rationale text here for test file check',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'UNACCEPTED',
      },
    };
    assert.throws(
      () => validateTaskAccounting(nonTestTask),
      /references test file .* lacking test assertions or test suites/
    );
  } finally {
    if (fs.existsSync(tmpNonTest)) fs.unlinkSync(tmpNonTest);
  }
});

runTest('1.7 Markdown files lacking structured markdown headings fail closed', () => {
  const tmpNonMd = path.join(REPO_ROOT, 'reports/.tmp_unstructured.md');
  fs.writeFileSync(tmpNonMd, 'plain sentence without any headings or markdown structure', 'utf8');

  try {
    const nonMdTask = {
      taskId: 'W021.5-TEST-NONMD-01',
      taskTitle: 'Non-MD Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'reports/.tmp_unstructured.md',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Demonstrates unstructured md verification check',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid ratio rationale text here for unstructured md check',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'UNACCEPTED',
      },
    };
    assert.throws(
      () => validateTaskAccounting(nonMdTask),
      /references Markdown file .* lacking structured markdown documentation/
    );
  } finally {
    if (fs.existsSync(tmpNonMd)) fs.unlinkSync(tmpNonMd);
  }
});

runTest('1.8 Prohibited claim: claiming completed live database execution in supportsClaim fails closed', () => {
  const fakeDbClaimTask = {
    taskId: 'W021.5-TEST-DBCLAIM-01',
    taskTitle: 'Fake DB Claim Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'scripts/reconcile_execution_ledger.mjs',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Proves completed live database execution in production', // FORBIDDEN!
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid ratio rationale text here for db claim check',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(fakeDbClaimTask),
    /claims live database execution in supportsClaim/
  );
});

runTest('1.9 Prohibited claim: claiming formal CTO acceptance under non-acceptance class fails closed', () => {
  const fakeAcceptClaimTask = {
    taskId: 'W021.5-TEST-ACCPOBJ-01',
    taskTitle: 'Fake Acceptance Claim Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'scripts/reconcile_execution_ledger.mjs',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION', // NOT FORMAL_ACCEPTANCE!
        supportsClaim: 'Confirms formal CTO acceptance of this deliverable', // FORBIDDEN under REPO_IMPL!
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid ratio rationale text here for acceptance claim check',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(fakeAcceptClaimTask),
    /claims formal acceptance in supportsClaim under non-acceptance class/
  );
});

runTest('1.10 Stage-matching file that does not demonstrate task deliverable signature fails closed', () => {
  // W021.5-B1-04 requires a .geojson file demonstrating boundary polygon geometries
  const wrongDeliverableTask = {
    taskId: 'W021.5-B1-04',
    taskTitle: 'Boundary Validation Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'data/seed/telangana-constituencies.ts', // Stage B file, exists on disk, but not .geojson deliverable!
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Attempting to satisfy boundary deliverable with constituency seed file',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 0.25,
      ratioRationale: 'Telangana boundary fixture complete with closed rings; national coverage pending',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(wrongDeliverableTask, 'Stage B1'),
    /does not contain required deliverable demonstration artifact/
  );
});

runTest('1.11 100% completion claim with PROVISIONAL evidence items fails closed', () => {
  const provisional100Task = {
    taskId: 'W021.5-TEST-PROV100-01',
    taskTitle: 'Provisional 100 Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'scripts/reconcile_execution_ledger.mjs',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Reconciler script authored and maintained in repository',
        verificationStatus: 'PROVISIONAL_PENDING_CONFIRMATION', // Provisional!
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0, // Cannot claim 100% with provisional evidence!
      ratioRationale: 'Attempting 100% completion claim with provisional evidence status',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(provisional100Task),
    /claims 100% completion .* contains unverified or provisional evidence/
  );
});

runTest('1.12 100% completion claim with BLOCKED evidence items fails closed', () => {
  const blocked100Task = {
    taskId: 'W021.5-TEST-BLK100-01',
    taskTitle: 'Blocked 100 Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'scripts/reconcile_execution_ledger.mjs',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Reconciler script authored and maintained in repository',
        verificationStatus: 'BLOCKED_PENDING_EXECUTION', // Blocked!
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0, // Cannot claim 100% with blocked evidence!
      ratioRationale: 'Attempting 100% completion claim with blocked evidence status',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(blocked100Task),
    /claims 100% completion .* contains unverified or provisional evidence/
  );
});

runTest('1.13 Non-zero completion claim where ALL evidence items are BLOCKED fails closed', () => {
  const allBlockedTask = {
    taskId: 'W021.5-TEST-ALLBLK-01',
    taskTitle: 'All Blocked Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'PARTIAL',
    evidence: [
      {
        path: 'scripts/reconcile_execution_ledger.mjs',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Reconciler script authored and maintained in repository',
        verificationStatus: 'BLOCKED_PENDING_EXECUTION',
      },
    ],
    accounting: {
      repoCompletionRatio: 0.5, // Has non-zero ratio but 0 verified/provisional items
      ratioRationale: 'Attempting partial completion claim with solely blocked evidence',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.throws(
    () => validateTaskAccounting(allBlockedTask),
    /has non-zero repoCompletionRatio .* all evidence items are blocked/
  );
});

runTest('1.14 Valid deliverable evidence with VERIFIED_ON_DISK passes validation cleanly', () => {
  const validTask = {
    taskId: 'W021.5-TEST-VALID-01',
    taskTitle: 'Valid Structured Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'scripts/reconcile_execution_ledger.mjs',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Reconciler script authored and maintained in repository',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid ratio rationale text here that passes all substantive checks',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'UNACCEPTED',
    },
  };
  assert.strictEqual(validateTaskAccounting(validTask), true);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Workstream B: Formal CTO Acceptance Authority & Boundary Hardening
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Workstream B: Formal CTO Acceptance Authority & Boundary Hardening ---');

runTest('2.1 Markdown files cannot serve as formal acceptance records (marker strings fail closed)', () => {
  const tmpMarkerMd = path.join(REPO_ROOT, 'reports/.tmp_marker_acceptance.md');
  fs.writeFileSync(
    tmpMarkerMd,
    '# FORMAL_CTO_ACCEPTANCE_RECORD\nADJUDICATION_DECISION: ACCEPTED\nAdjudicator: CTO\n',
    'utf8'
  );

  try {
    const mdAcceptTask = {
      taskId: 'W021.5-TEST-MDACC-01',
      taskTitle: 'Markdown Acceptance Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid ratio rationale text here for acceptance check',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_marker_acceptance.md', // FORBIDDEN!
      },
    };
    assert.throws(
      () => validateTaskAccounting(mdAcceptTask),
      /Markdown marker fallbacks are strictly prohibited; formal acceptance requires a strictly structured, authenticated JSON record/
    );
  } finally {
    if (fs.existsSync(tmpMarkerMd)) fs.unlinkSync(tmpMarkerMd);
  }
});

runTest('2.2 Self-declared CTO role without authenticated verification token fails closed', () => {
  const tmpUnauthToken = path.join(REPO_ROOT, 'reports/.tmp_unauth_acceptance.json');
  fs.writeFileSync(
    tmpUnauthToken,
    JSON.stringify({
      milestone: 'W021.5',
      taskRef: 'W021.5-TEST-UNAUTH-01',
      decision: 'ACCEPTED',
      adjudicatorIdentity: 'Chief Technology Officer',
      adjudicatorRole: 'CTO',
      adjudicationDate: '2026-10-17T00:00:00Z',
      authorSelfAcceptance: false,
      // authenticationToken is MISSING!
    }),
    'utf8'
  );

  try {
    const unauthTask = {
      taskId: 'W021.5-TEST-UNAUTH-01',
      taskTitle: 'Unauthenticated CTO Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid ratio rationale text here for token check',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_unauth_acceptance.json',
      },
    };
    assert.throws(
      () => validateTaskAccounting(unauthTask),
      /lacks independently verifiable authenticated authority\. Self-declared CTO role without authenticated verification token cannot establish CONFIRMED_ACCEPTED/
    );
  } finally {
    if (fs.existsSync(tmpUnauthToken)) fs.unlinkSync(tmpUnauthToken);
  }
});

runTest('2.3 Acceptance record schema validation (invalid ISO 8601 UTC date and mismatched taskRef fail closed)', () => {
  const tmpBadDate = path.join(REPO_ROOT, 'reports/.tmp_baddate_acceptance.json');
  fs.writeFileSync(
    tmpBadDate,
    JSON.stringify({
      milestone: 'W021.5',
      taskRef: 'W021.5-TEST-BADDATE-01',
      decision: 'ACCEPTED',
      adjudicatorIdentity: 'CTO',
      adjudicatorRole: 'CTO',
      authenticationToken: 'VALID_CTO_TOKEN_12345678',
      adjudicationDate: 'October 17, 2026', // NOT strict ISO 8601 UTC!
      authorSelfAcceptance: false,
    }),
    'utf8'
  );

  try {
    const badDateTask = {
      taskId: 'W021.5-TEST-BADDATE-01',
      taskTitle: 'Bad Date Acceptance Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid ratio rationale text here for date check',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_baddate_acceptance.json',
      },
    };
    assert.throws(
      () => validateTaskAccounting(badDateTask),
      /lacks valid ISO 8601 UTC adjudicationDate \(expected YYYY-MM-DDTHH:mm:ssZ\)/
    );
  } finally {
    if (fs.existsSync(tmpBadDate)) fs.unlinkSync(tmpBadDate);
  }
});

runTest('2.4 Acceptance record missing authorSelfAcceptance: false strictly fails closed under Rule IV-001', () => {
  const tmpMissingSelfRule = path.join(REPO_ROOT, 'reports/.tmp_missing_self_rule.json');
  fs.writeFileSync(
    tmpMissingSelfRule,
    JSON.stringify({
      milestone: 'W021.5',
      taskRef: 'W021.5-TEST-NOSELFRULE-01',
      decision: 'ACCEPTED',
      adjudicatorIdentity: 'CTO',
      adjudicatorRole: 'CTO',
      authenticationToken: 'VALID_CTO_TOKEN_12345678',
      adjudicationDate: '2026-10-17T00:00:00Z',
      // authorSelfAcceptance missing
    }),
    'utf8'
  );

  try {
    const noSelfRuleTask = {
      taskId: 'W021.5-TEST-NOSELFRULE-01',
      taskTitle: 'No Self Rule Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid ratio rationale text here for self rule check',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_missing_self_rule.json',
      },
    };
    assert.throws(
      () => validateTaskAccounting(noSelfRuleTask),
      /must explicitly declare authorSelfAcceptance: false/
    );
  } finally {
    if (fs.existsSync(tmpMissingSelfRule)) fs.unlinkSync(tmpMissingSelfRule);
  }
});

runTest('2.5 Acceptance artifact path bounds: absolute paths fail closed', () => {
  const absAcceptTask = {
    taskId: 'W021.5-TEST-ABSACC-01',
    taskTitle: 'Abs Accept Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'scripts/reconcile_execution_ledger.mjs',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Reconciler script authored and maintained in repository',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid ratio rationale text here for abs accept check',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
      formalAcceptanceArtifact: 'C:/Users/Laven/acceptance.json',
    },
  };
  assert.throws(
    () => validateTaskAccounting(absAcceptTask),
    /formalAcceptanceArtifact cannot be absolute/
  );
});

runTest('2.6 Acceptance artifact path bounds: path traversal outside repository root fails closed', () => {
  const travAcceptTask = {
    taskId: 'W021.5-TEST-TRAVACC-01',
    taskTitle: 'Traversal Accept Task',
    taskClassification: 'CORE_SPECIFICATION',
    weight: 2.0,
    status: 'REPO_VERIFIED',
    evidence: [
      {
        path: 'scripts/reconcile_execution_ledger.mjs',
        evidenceClass: 'REPOSITORY_IMPLEMENTATION',
        supportsClaim: 'Reconciler script authored and maintained in repository',
        verificationStatus: 'VERIFIED_ON_DISK',
      },
    ],
    accounting: {
      repoCompletionRatio: 1.0,
      ratioRationale: 'Valid ratio rationale text here for traversal accept check',
      unexecutedDatabaseWeight: 0.0,
      formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
      formalAcceptanceArtifact: '../../outside_acceptance.json',
    },
  };
  assert.throws(
    () => validateTaskAccounting(travAcceptTask),
    /path traversal outside repository root/
  );
});

runTest('2.7 Valid authenticated acceptance record passes validation cleanly', () => {
  const tmpValidAccept = path.join(REPO_ROOT, 'reports/.tmp_valid_acceptance.json');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' });

  const record = {
    milestone: 'W021.5',
    taskRef: 'W021.5-TEST-VALIDACC-01',
    decision: 'ACCEPTED',
    adjudicatorIdentity: 'Chief Technology Officer',
    adjudicatorRole: 'CTO',
    adjudicationDate: '2026-10-17T00:00:00Z',
    authorSelfAcceptance: false,
    keyId: 'cto-test-authority-093',
  };
  const canonicalPayload = getCanonicalAcceptancePayload(record);
  const signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), privateKey).toString('base64');
  record.signature = signature;

  fs.writeFileSync(tmpValidAccept, JSON.stringify(record, null, 2), 'utf8');

  try {
    const validAcceptTask = {
      taskId: 'W021.5-TEST-VALIDACC-01',
      taskTitle: 'Valid Acceptance Task',
      taskClassification: 'CORE_SPECIFICATION',
      weight: 2.0,
      status: 'REPO_VERIFIED',
      evidence: [
        {
          path: 'scripts/reconcile_execution_ledger.mjs',
          evidenceClass: 'REPOSITORY_IMPLEMENTATION',
          supportsClaim: 'Reconciler script authored and maintained in repository',
          verificationStatus: 'VERIFIED_ON_DISK',
        },
      ],
      accounting: {
        repoCompletionRatio: 1.0,
        ratioRationale: 'Valid ratio rationale text here that passes all acceptance checks',
        unexecutedDatabaseWeight: 0.0,
        formalAcceptanceStatus: 'CONFIRMED_ACCEPTED',
        formalAcceptanceArtifact: 'reports/.tmp_valid_acceptance.json',
      },
    };
    const options = {
      trustedAuthorities: [
        {
          keyId: 'cto-test-authority-093',
          identity: 'Chief Technology Officer',
          role: 'CTO',
          algorithm: 'Ed25519',
          publicKeyPem: pubPem,
          status: 'ACTIVE',
        },
      ],
      externalTrustPin: crypto.createHash('sha256').update(pubPem.replace(/\r?\n/g, '\n').trim()).digest('hex'),
    };
    assert.strictEqual(validateTaskAccounting(validAcceptTask, null, options), true);
  } finally {
    if (fs.existsSync(tmpValidAccept)) fs.unlinkSync(tmpValidAccept);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Workstream C: Reconciled Ledger Integrity & Multi-Dimensional Accounting
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Workstream C: Reconciled Ledger Integrity & Multi-Dimensional Accounting ---');

runTest('3.1 All 27 tasks pass claim-specific deliverable validation in production ledger', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  let verifiedTasks = 0;
  for (const stage of ledger.stages) {
    for (const task of stage.tasks) {
      assert.strictEqual(validateTaskAccounting(task, stage.stageId), true);
      verifiedTasks++;
    }
  }
  assert.strictEqual(verifiedTasks, 27, 'Exactly 27 tasks audited and verified');
});

runTest('3.2 Unexecuted database discount derived strictly from the 4 validated tasks', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = computeLedgerSummary(ledger);

  assert.strictEqual(summary.unexecutedDatabasePendingPercent, 10.5);
  assert.strictEqual(summary.databaseDiscountBreakdown.length, 4);

  const discountTasks = summary.databaseDiscountBreakdown.map((d) => d.taskId);
  assert.deepStrictEqual(discountTasks, [
    'W021.5-C-02',
    'W021.5-D-02',
    'W021.5-E-01',
    'W021.5-F-02',
  ]);

  const discountWeights = summary.databaseDiscountBreakdown.map((d) => d.unexecutedDatabaseWeight);
  assert.deepStrictEqual(discountWeights, [2.5, 3.0, 2.0, 3.0]);
});

runTest('3.3 Database discount does not exceed task weight or double-count blocked tasks', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  for (const stage of ledger.stages) {
    for (const task of stage.tasks) {
      const acct = task.accounting;
      assert.ok(
        acct.unexecutedDatabaseWeight <= task.weight,
        `Task ${task.taskId} discount (${acct.unexecutedDatabaseWeight}) cannot exceed weight (${task.weight})`
      );
      if (task.status === 'BLOCKED') {
        assert.strictEqual(
          acct.unexecutedDatabaseWeight,
          0.0,
          `Blocked task ${task.taskId} cannot deduct unexecutedDatabaseWeight (already 0% earned)`
        );
      }
    }
  }
});

runTest('3.4 Progress dimensions strictly partitioned with zero live DB or formal acceptance claims', () => {
  const ledgerPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const summary = computeLedgerSummary(ledger);

  assert.strictEqual(summary.repositoryImplementationPercent, 61.5);
  assert.strictEqual(summary.adjudicatedEarnedCompletionPercent, 61.5);
  assert.strictEqual(summary.databaseExecutionPercent, 0.0);
  assert.strictEqual(summary.formalAcceptancePercent, 0.0);
  assert.strictEqual(summary.unexecutedDatabasePendingPercent, 10.5);
  assert.strictEqual(summary.blockedOnExternalCtcGatesPercent, 22.5);
  assert.strictEqual(summary.notImplementedPercent, 5.5);

  // Math closure: 61.5% + 10.5% + 22.5% + 5.5% = 100.0%
  assert.strictEqual(
    summary.repoVerifiedEarnedPercent + summary.unexecutedDatabasePendingPercent + summary.blockedPercent + summary.notImplementedPercent,
    100.0
  );

  // Status weight allocation sum: 51.0 + 25.0 + 21.0 + 3.0 = 100.0%
  const allocatedSum =
    summary.statusAllocatedWeights.REPO_VERIFIED.allocated +
    summary.statusAllocatedWeights.PARTIAL.allocated +
    summary.statusAllocatedWeights.BLOCKED.allocated +
    summary.statusAllocatedWeights.NOT_IMPLEMENTED.allocated;
  assert.strictEqual(allocatedSum, 100.0);
});

runTest('3.5 Complete identity between JSON and Markdown ledger metrics', () => {
  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const mdPath = path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md');

  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const md = fs.readFileSync(mdPath, 'utf8');

  // Verify all summary metrics appear verbatim in Markdown text
  assert.ok(md.includes(`Repository Implementation Readiness: ${json.summary.repositoryImplementationPercent.toFixed(1)}%`));
  assert.ok(md.includes(`Adjudicated Earned Completion:       ${json.summary.adjudicatedEarnedCompletionPercent.toFixed(1)}%`));
  assert.ok(md.includes(`Live Database Staging Execution:     ${json.summary.databaseExecutionPercent.toFixed(1)}%`));
  assert.ok(md.includes(`Formal CTO Acceptance:              ${json.summary.formalAcceptancePercent.toFixed(1)}%`));
  assert.ok(md.includes(`Unexecuted Database Pending:         ${json.summary.unexecutedDatabasePendingPercent.toFixed(1)}%`));
  assert.ok(md.includes(`Blocked on External / CTO Gates:     ${json.summary.blockedOnExternalCtcGatesPercent.toFixed(1)}%`));
  assert.ok(md.includes(`Not Implemented:                     ${json.summary.notImplementedPercent.toFixed(1)}%`));

  // Verify all 4 discount tasks are in Markdown table
  for (const dt of json.summary.databaseDiscountBreakdown) {
    assert.ok(md.includes(dt.taskId), `Markdown must contain discount task ${dt.taskId}`);
    assert.ok(md.includes(`${dt.unexecutedDatabaseWeight.toFixed(1)}%`), `Markdown must contain discount weight for ${dt.taskId}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Workstream D: Baseline Immutability, Minimal Diffs & Governance
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Workstream D: Baseline Immutability, Minimal Diffs & Governance ---');

runTest('4.1 Financial defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN across all artifacts', () => {
  const matrixMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.md'), 'utf8');
  assert.ok(matrixMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));

  const ledgerMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md'), 'utf8');
  assert.ok(ledgerMd.includes('DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**'));

  const ledgerJson = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json'), 'utf8'));
  assert.strictEqual(ledgerJson.financialDefectStatus.defectId, 'DQ-W021.5-B2.2E-001');
  assert.strictEqual(ledgerJson.financialDefectStatus.status, 'STRICTLY_OPEN');

  const stageE = ledgerJson.stages.find((s) => s.stageId === 'STAGE_E');
  const defectTask = stageE.tasks.find((t) => t.taskId === 'W021.5-E-02');
  assert.strictEqual(defectTask.status, 'BLOCKED');
  assert.strictEqual(defectTask.accounting.repoCompletionRatio, 0.0);
  assert.strictEqual(defectTask.accounting.formalAcceptanceStatus, 'UNACCEPTED');
});

runTest('4.2 Rule IV-001 Non-Self-Acceptance strictly preserved: zero self-acceptance or self-ratification', () => {
  const ledgerMd = fs.readFileSync(path.join(REPO_ROOT, 'reports/W021.5-EXECUTION-LEDGER.md'), 'utf8');
  assert.ok(ledgerMd.includes('Rule IV-001 (Non-Self-Acceptance)'));
  assert.ok(ledgerMd.includes('The author does NOT self-certify, self-ratify, or close Milestone W021.5'));

  const jsonPath = path.join(REPO_ROOT, 'reports/w021_5_execution_ledger.json');
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.strictEqual(json.summary.formalAcceptancePercent, 0.0);
  assert.strictEqual(json.summary.statusCounts.FORMAL_ACCEPTANCE_CONFIRMED, 0);
  assert.strictEqual(json.summary.acceptanceFacetCounts.CONFIRMED_ACCEPTED, 0);

  // Verify no task claims CONFIRMED_ACCEPTED
  for (const s of json.stages) {
    for (const t of s.tasks) {
      assert.notStrictEqual(
        t.accounting.formalAcceptanceStatus,
        'CONFIRMED_ACCEPTED',
        `Task ${t.taskId} cannot claim CONFIRMED_ACCEPTED without authorized CTO record`
      );
    }
  }
});

runTest('4.3 68 SQL migration files match baseline commit 0ea572d byte-for-byte identical', () => {
  const report = verifyMigrationImmutability(BASELINE_COMMIT_089);
  assert.strictEqual(report.isImmutabilityPreserved, true);
  assert.strictEqual(report.totalFilesAudited, 68);
  assert.strictEqual(report.identicalCount, 68);
  assert.strictEqual(report.missingPaths.length, 0);
  assert.strictEqual(report.addedPaths.length, 0);
  assert.strictEqual(report.contentModifiedFiles.length, 0);
  assert.strictEqual(report.isGitDiffClean, true);
});

runTest('4.4 All 31 MLA profile seed files have LF line endings matching baseline fb408ce (0 CRLF)', () => {
  const seedFiles = fs.readdirSync(path.join(REPO_ROOT, 'data/seed')).filter((f) => f.endsWith('-mla-profiles.ts'));
  assert.strictEqual(seedFiles.length, 31, 'Exactly 31 MLA profile seed files present');

  let crlfFiles = 0;
  for (const f of seedFiles) {
    const raw = fs.readFileSync(path.join(REPO_ROOT, 'data/seed', f));
    if (raw.includes(Buffer.from('\r\n'))) {
      crlfFiles++;
      console.error(`  CRLF detected in ${f}`);
    }
  }
  assert.strictEqual(crlfFiles, 0, 'Zero CRLF line endings across all 31 MLA profile seed files (100% pure LF)');
});

runTest('4.5 Zero undefined identifiers across all 31 seed files (minimal diff preserved vs fb408ce)', () => {
  const seedFiles = fs.readdirSync(path.join(REPO_ROOT, 'data/seed')).filter((f) => f.endsWith('-mla-profiles.ts'));

  let undefinedCount = 0;
  for (const f of seedFiles) {
    const content = fs.readFileSync(path.join(REPO_ROOT, 'data/seed', f), 'utf8');
    const matches = content.match(/:\s*undefined\b/g);
    if (matches) {
      undefinedCount += matches.length;
    }
  }
  assert.strictEqual(undefinedCount, 0, 'Zero `: undefined` properties across all 31 seed files');
});

runTest('4.6 Telangana AC 119 duplicate claim blocker preserved without mutating geometry fixture', () => {
  const matrixPath = path.join(REPO_ROOT, 'reports/w021_5_national_data_coverage_matrix.json');
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

  const ts = matrix.states.find((s) => s.stateCode === 'TS');
  assert.strictEqual(ts.geospatialCoverage.hasCleanConstituencyMapping, false);
  assert.strictEqual(ts.hasGeoJSON, false);
  assert.ok(ts.materialGaps.some((g) => g.includes('duplicate feature claim')));

  // Assert git diff on telangana-assembly.geojson is clean vs baseline commit
  const geoDiff = execSync(`git diff ${BASELINE_COMMIT_089} -- data/geo/telangana-assembly.geojson`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();
  assert.strictEqual(geoDiff, '', 'Telangana GeoJSON asset strictly untouched from baseline commit 0ea572d');
});

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
