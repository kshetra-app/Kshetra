# AGENT EXECUTION PROTOCOL
## Autonomous Closed-Loop Execution, Self-Audit and Efficiency Protocol

**Authority:** Master Execution Framework Amendment v1.5 (`AMENDMENT_v1.5.md`) & Amendment v1.5-A (`AMENDMENT_v1.5-A.md`) (incorporating governing principles of `AMENDMENT_v1.4.md`, `AMENDMENT_v1.3.md`, and `AMENDMENT_v1.2.md`)  
**Status:** MANDATORY OPERATING CONSTITUTION FOR ALL AGENTS UNDER AMENDMENT v1.5 & v1.5-A  
**Scope:** All current and future jobs, remediations, verifications, and releases across PANIN / Kshetra.

---

## 1. Pre-Flight Reading Order

Before starting ANY job, the agent must read the following documents in this exact sequence:

1. `MASTER EXECUTION DOCUMENT` (`PANIN - Kshetra - AI Agent Master Execution Document and Sequential Job Book.md`)
2. `AMENDMENT_v1.2.md` (Compliance, DPDP, Independent Verification & Launch Gates)
3. `AMENDMENT_v1.3.md` (Autonomous Closed-Loop Execution, Self-Audit and Efficiency Protocol)
4. `AMENDMENT_v1.4.md` (Evidence Semantics, Runtime Proof and Carry-Forward Controls)
5. `AMENDMENT_v1.5.md` (Mandatory Pre-Implementation Planning & Direction-Review Gate — Immutable Parent Baseline)
6. `AMENDMENT_v1.5-A.md` (Strengthening Pre-Implementation Planning — ACTIVE OPERATIONAL AUTHORITY)
7. `AGENT_EXECUTION_PROTOCOL.md` (This Operating Constitution)
8. `EXECUTION_STATE.md` (Current Project & Execution Coordinates)
9. `ACCEPTANCE_REGISTER.md` (Authoritative Milestone Acceptance Truth)
10. `DEFECT_REGISTER.md` (Known-Problem Ledger & Carry-Forward Classification)
11. `DECISION_LOG.md` (Architectural & Operational Decision Truth)
12. `RELEASE_REGISTER.md` (Release & Artifact Ledger)
13. The specific user prompt / job instruction.

---

## 2. Permanent Operating Lifecycle & State Machine (Amendment v1.5 & v1.5-A)

For every substantive implementation job, the execution model distinguishes between **intra-job operational states** and the **project-wide sequential workflow**:

### 2.1 Intra-Job Operational Execution Cycle (18 States)
An operational state represents an active or holding condition of the agent and repository during the lifecycle of a specific task:

```text
1. TASK_DEFINED
        ↓
2. PRE-FLIGHT
        ↓
3. INSPECTION
        ↓
4. PLAN_DRAFTED
        ↓
5. PLAN_REVIEW
        ↓
6. PLAN_CORRECTED (if required)
        ↓
7. PLAN_APPROVED
        ↓
8. IMPLEMENTATION
        ↓
9. TEST
        ↓
10. SEMANTIC_SELF_AUDIT (SI-001, SI-002, SI-003)
        ↓
11. NEGATIVE_PATH_TEST
        ↓
12. REPAIR (if required)
        ↓
13. RETEST (if required)
        ↓
14. EVIDENCE_RECONCILIATION
        ↓
15. REMOTE_VERIFICATION
        ↓
16. READY_FOR_INDEPENDENT_VERIFICATION
        ↓
17. INDEPENDENT_VERIFICATION
        ↓
18. ACCEPTANCE
```

No substantive implementation may bypass states 3–7. The implementing agent must never halt after the first successful compile or test. Evidence must distinguish SOURCE, CONFIGURATION, BUILD, LOCAL RUNTIME, STAGING RUNTIME, PRODUCTION RUNTIME, LIVE DATABASE, and EXTERNAL PROVIDER evidence (Amendment v1.4 Part 2).

### 2.2 Sequential Project Workflow & Gating (19 Steps)
In the master project job book, the lifecycle defines 19 sequential steps:
- **Steps 1–18:** The 18 intra-job operational states above (from `TASK_DEFINED` to `ACCEPTANCE`).
- **Step 19:** `NEXT_JOB_TRANSITION` (workflow transition and prerequisite gating point; commencing the next job book milestone is strictly blocked until Step 18 `ACCEPTANCE` is verified and ratified).

---

## 2.3 Pre-Implementation Planning Specification (Amendment v1.5-A)

For all substantive implementation jobs, the implementing agent operates strictly in `PLAN ONLY` mode upon receiving a task.
The agent must formulate and submit a comprehensive Pre-Implementation Plan containing the mandatory 22 sections specified by `AMENDMENT_v1.5-A.md` Section 26:

```text
PRE-IMPLEMENTATION PLAN — <JOB ID>

1. Document Title & Metadata
2. Problem Statement (Task Understanding & Core Objectives)
3. Current State Analysis (Repository Inspection, Root-Cause Interpretation & Dependency/Blocking Analysis)
4. Fact / Inference / Assumption / Unknown Register
5. Target Architecture & Intended Outcome (Proposed Technical Solution & Alternatives Considered)
6. Governing Rules & Constraints (Security, Privacy, Compliance & Data Considerations)
7. Full Scope of Work (Exact Files & Components Expected to Change)
8. Explicit Out-of-Scope Boundaries (Explicit Non-Change Boundaries)
9. Step-by-Step Implementation Plan (Detailed Execution Phases & Sequencing)
10. Verification & Testing Strategy (Test Strategy, Test Integrity Strategy & Assertions)
11. Negative-Path Testing Specification (Fail-Closed Validations & Invariant Proofs)
12. Evidence Generation Plan (Evidence & Provenance Strategy)
13. Reconciliation Plan (Coordinate, Register & Document Reconciliation)
14. Independent Verification Specification (Third-Party Audit Standards & Replicability)
15. Risks, Failure Modes & Mitigations (Risk, Assumption & Failure Mode Analysis)
16. Rollback & Recovery Strategy (File-Scoped Rollback & Recovery Considerations)
17. Impact Assessment (Downstream Impact & System Boundary Evaluation)
18. Acceptance Criteria (Claim-Based Binary Verifiable Criteria)
19. Artifact & Commit Lineage Map (Commit Lineage, Hashes & Evidence Provenance)
20. Amendment Compliance Matrix (Clause-by-Clause Governance Verification)
21. Operational Declarations (Pre-Implementation Declarations per Section 27)
22. Plan Sign-Off & Review Request (Questions/Decisions Requiring Review & Plan-Approval State)
```

The agent must STOP and await explicit authorization:
> **PLAN APPROVED — PROCEED WITH IMPLEMENTATION ACCORDING TO THE APPROVED PLAN.**

Implementation begins ONLY after this canonical authorization is granted.

---

## 2.4 Mandatory Implementation Declarations (Amendment v1.5-A Sections 27 & 28)

### Required Pre-Implementation Declaration (Section 27)
Before any implementation begins, the agent must formally declare:
```text
PLAN STATUS: APPROVED
APPROVED PLAN VERSION: <identifier>
PLAN APPROVAL EVIDENCE: <reference>
IMPLEMENTATION MAY BEGIN: YES
```
If these fields are absent, implementation is not authorized.

### Required Post-Implementation Declaration (Section 28)
After implementation completes and before independent verification, the agent must report:
```text
APPROVED PLAN FOLLOWED: YES / NO
MATERIAL PLAN DEVIATION: YES / NO
IF YES:
    DEVIATION APPROVED: YES / NO
    REVISED PLAN REFERENCE: <identifier>
IMPLEMENTATION COMPLETE: YES / NO
```
This creates explicit traceability between architectural direction and actual implementation.

---

## 3. Pre-Flight Template

Before making code edits, the agent must internally establish:

```text
JOB:                           [Job ID and Title]
PURPOSE:                       [Primary objective and architectural outcome]
DEPENDENCIES:                  [Direct and transitive prerequisites]
CURRENT IMPLEMENTATION:        [Existing files, endpoints, or DB structures]
RELATED DEFECTS:               [DEF IDs touched or influenced]
RELATED DECISIONS:             [DEC IDs governing this area]
RELATED PREVIOUS EVIDENCE:     [Past reports or benchmark metrics]
LIKELY FAILURE MODES:          [Edge cases, security bypasses, offline failures]
FILES LIKELY TO CHANGE:        [Anticipated code and register touchpoints]
ACCEPTANCE CRITERIA:           [Binary verifiable criteria]
ACCEPTANCE EVIDENCE REQUIRED:  [Reports, JSON artifacts, test outputs]
HUMAN ACTIONS REQUIRED:        [Any external cloud/secret prerequisites]
```

---

## 4. Change-Minimization & Dependency-First Rules

1. **Search Before Implementing:** Search for existing implementations, duplicate logic, existing types, API endpoints, database structures, and tests. Reuse or repair existing code rather than creating parallel implementations.
2. **Dependency-First:** Resolve blockers before proceeding. Never build around an unresolved dependency with a deceptive or mock fallback.
3. **Self-Healing:** If a defect directly related to the current job is discovered, fix it within the same job. Do not spawn micro-jobs for trivial defects.
4. **Three-Tier Defect Handling:**
   - **Tier 1 (Direct Blocker):** Fix immediately.
   - **Tier 2 (Directly Related):** Fix immediately if bounded.
   - **Tier 3 (Unrelated):** Log in `DEFECT_REGISTER.md` and continue.

---

## 5. Adversarial Self-Audit Checklist

Immediately following implementation and initial testing, the agent must rigorously challenge its own changes across 10 dimensions:

1. **Architecture:** Zero duplicated logic, zero API boundary violations, zero unnecessary dependencies, zero environment coupling.
2. **Data:** Real persistence only, zero fabricated or default data, correct schema and provenance.
3. **Security:** Zero privilege escalations, strict tenant isolation, zero leaked secrets, least-privilege storage and RLS.
4. **Performance:** No N+1 queries, no bundle bloat (consumer AAB ≤ 30MB), no unnecessary network calls.
5. **Reliability:** Graceful error handling, explicit loading/empty/error states, idempotent retries, offline awareness.
6. **UX:** Complete error states, retry mechanisms, permission handling, no layout clipping on long text.
7. **Analytics:** Correct event generation tied to accurate geographic/entity IDs with zero duplicates.
8. **i18n:** 100% key parity across all 13 supported languages (`en`, `te`, `hi`, `ta`, `kn`, `ml`, `mr`, `bn`, `gu`, `or`, `pa`, `as`, `ne`), zero hardcoded user-facing strings.
9. **Compliance (DPDP):** Purpose limitation, notice/consent verification, data retention and deletion workflows.
10. **Negative-Path Testing:** Verify system behavior on unauthorized access, malformed payloads, network drops, and expired tokens.

---

## 6. Evidence, Lineage & Provenance Standards

1. **Evidence Follows Implementation:** Never generate final evidence before code changes are finalized.
2. **Current vs. Historical Provenance Coordinates Semantics:**
   - `CURRENT_REMOTE_HEAD`: Current `origin/master` HEAD. In a synchronized repository state, matches local `HEAD`.
   - `VERIFIED_REMOTE_HEAD`: Exact current repository commit against which the current governance state was verified. Must equal `CURRENT_REMOTE_HEAD` for a declared synchronized governance state.
   - `ACCEPTED_W007_IMPLEMENTATION_COMMIT`: The exact W007 implementation commit technically accepted by the CTO (`1d253cd454effb441e7f01e846a568eeddc7f57e`).
   - `GOVERNANCE_COMMIT`: The commit containing the current authoritative governance state.
   - `EVIDENCE_COMMIT`: The exact commit containing the evidence artifacts used for the relevant acceptance claim.
   - `HISTORICAL_*` Coordinates: Prior job-specific provenance (e.g. `HISTORICAL_W006_VERIFIED_REMOTE_HEAD: c1fe56a`, `HISTORICAL_W006_AUDITED_CODE_COMMIT: 35ba912`, `HISTORICAL_W006_EVIDENCE_COMMIT: db30619`, `HISTORICAL_W006_ACCEPTANCE_COMMIT: f5b8a09`). Historical coordinates represent past milestone truths and MUST NOT be interpreted as or substituted for current project coordinates.
3. **Freshness Invariance Rule:** The later acceptance or governance commit advances Git HEAD and does not invalidate historical verification coordinates of prior jobs, preventing self-referential commit loops while maintaining mathematical freshness of current coordinates.
4. **Clean Repository Mandate:** `git status` must show a 100% clean working tree prior to declaring any milestone ready for verification.
5. **Remote Synchronization:** Push commits to `origin/master` and verify remote HEAD matches local HEAD before reporting completion.
6. **Independent Verification (Rule IV-001):** The implementing agent cannot self-certify. Critical milestones, security architecture, migrations, and Launch Gates require independent verification. Final acceptance remains solely with the CTO / human authority.

---

## 7. The Final Self-Question

Before declaring any job **"READY FOR INDEPENDENT VERIFICATION"**, the implementing agent must answer:

> *"If another engineer receives only the remote repository, evidence files and acceptance criteria, can they independently reproduce my conclusion?"*

If the answer is **NO**, the job is NOT ready.

---

## 8. Permanent Execution Hardening Controls (Controls A through L)

To eliminate claim-vs-source discrepancies, prevent premature implementation, ensure test integrity, and reduce back-and-forth review cycles, all agents must strictly adhere to Controls A through L:

### CONTROL A — PRE-SUBMISSION SELF-AUDIT
Before an implementing agent submits any job for CTO review or independent verification, it MUST perform a formal self-audit comparing:
1. Approved plan
2. Acceptance criteria
3. Actual source code
4. Actual automated tests
5. Actual runtime evidence
6. Evidence report
7. Governance state
8. Git provenance

The agent must explicitly establish:
`CLAIM → SOURCE PROOF → TEST PROOF → EVIDENCE REFERENCE`
for every material acceptance criterion. If any criterion lacks proof: **SUBMISSION BLOCKED**.

### CONTROL B — CLAIM/SOURCE CONSISTENCY GATE
**NO ACCEPTANCE CLAIM MAY BE MADE FROM A REPORT ALONE.**
For every material claim:
`REPORT CLAIM` must correspond to `ACTUAL SOURCE` AND `ACTUAL EXECUTED TEST` AND `CORRECT COMMIT`.
A report cannot be used as substitute proof of source behavior.

### CONTROL C — PROVENANCE FREEZE
At submission time, the coordinates (`AUDITED_CODE_COMMIT`, `EVIDENCE_COMMIT`, `VERIFIED_REMOTE_HEAD`) must be immutable coordinates for that submission. If source code changes after verification, the previous verification becomes **INVALID** and a new verification run is mandatory.

### CONTROL D — MACHINE-READABLE ACCEPTANCE MATRIX
Every future job must maintain an acceptance matrix containing:
`AC-ID | Requirement | Implementation Location | Test Location | Evidence Location | Status | Commit`
This is the mandatory mechanism preventing unverified or omitted acceptance criteria.

### CONTROL E — NEGATIVE-PATH-FIRST REQUIREMENT
For security, API, data integrity, auth, validation, and governance-sensitive work, negative-path tests must be designed and passing BEFORE implementation is declared complete.
Required negative-path categories where applicable:
- Malformed input
- Missing field
- Wrong type
- Unauthorized access
- Unauthenticated access
- Timeout
- Cancellation
- Dependency failure
- Stale data
- Mismatched correlation
- Invalid state
- Duplicate operation
- Mutation retry behavior (strictly 0 retries on mutations)

A green happy-path test suite alone cannot qualify as sufficient evidence.

### CONTROL F — TEST THE IMPLEMENTATION, NOT THE MOCK
Tests must exercise the actual implementation under test. A test that replaces the function or method being tested with a mock cannot be used as primary proof of that function's behavior. Mocks may be used for external dependencies only; they must never replace the subject under test.

### CONTROL G — RUNTIME CONTRACT REQUIREMENT
For network and API boundaries: TypeScript types are NOT runtime validation.
Where acceptance requires runtime contract validation:
`UNTRUSTED RESPONSE → RUNTIME VALIDATION → TRUSTED DTO → EXPLICIT MAPPING → APPLICATION TYPE`
No unsafe type cast (e.g. `as unknown as Type`) may substitute for runtime validation.

### CONTROL H — SCOPE & BOUNDARY IMMUTABILITY
Before implementation starts, the approved plan establishes:
- IN-SCOPE FILES
- OUT-OF-SCOPE FILES
- BOUNDARY FILES
At submission, changed files are automatically compared against those declarations. Unexpected boundary modifications cause **SUBMISSION BLOCKED** unless an explicit approved plan amendment exists.

### CONTROL I — IMPLEMENTATION STOP CONDITIONS
The implementing agent must immediately STOP and report rather than improvising upon encountering any of:
- Ambiguous requirement
- Conflicting source contracts
- Missing evidence
- Failed test
- Unexpected dependency change
- Unexpected boundary file modification
- Provenance mismatch
- Dirty working tree
- Remote HEAD mismatch
- Evidence generated from a different commit

### CONTROL J — NO PREMATURE JOB ADVANCEMENT (STRICT STATE MACHINE)
The project workflow enforces a strict linear state machine:
`NOT_STARTED → PLANNING → PLAN_SUBMITTED → PLAN_APPROVED → IMPLEMENTATION_AUTHORIZED → IMPLEMENTED → INDEPENDENTLY_VERIFIED → CTO_ACCEPTANCE_PENDING → ACCEPTED/CLOSED`
No agent may skip `PLAN_APPROVED` or `CTO_ACCEPTANCE_PENDING`. No implementation may begin from `PLAN_SUBMITTED` alone.

### CONTROL K — PLAN PREDICTIVE-INTEGRITY CHECK
Before submitting or approving any future plan, verify:
*"If this plan were implemented exactly as written, would the resulting evidence actually prove every acceptance criterion?"*
The plan must identify exact source locations, exact tests, exact negative paths, exact evidence files, exact runtime requirements, and exact non-change boundaries. If a plan says "validate", it must specify how validation will be tested. If it says "single-flight", it must specify the underlying operation and invocation count. If it says "runtime validation", it must specify malformed payload tests.

### CONTROL L — FINAL PRE-CTO SUBMISSION CHECKLIST
Before any future CTO submission, the implementing agent must verify this checklist:
- [ ] Approved plan followed
- [ ] No unapproved scope expansion
- [ ] All acceptance criteria mapped
- [ ] All claims have source proof
- [ ] All claims have test proof
- [ ] Negative paths tested
- [ ] Runtime requirements tested
- [ ] Full regression run passed
- [ ] Boundary files unchanged
- [ ] Working tree clean
- [ ] Remote HEAD verified
- [ ] Evidence commit verified
- [ ] Report matches source
- [ ] Report matches test output
- [ ] Governance state matches reality
- [ ] No future job started prematurely

Only when all 15 items are verified may the agent submit for CTO review.

---

## 9. Eight-Tier Evidence Hierarchy

Governance documents and reports must strictly distinguish among the 8 evidence tiers:
1. **SOURCE EVIDENCE:** AST, regex, or static inspection of repository source files.
2. **CONFIGURATION EVIDENCE:** Inspection of config files, environment templates, or flags.
3. **BUILD EVIDENCE:** Compiler output (`tsc --noEmit`), packaging, or bundle metrics.
4. **LOCAL RUNTIME EVIDENCE:** Node.js/Jest local execution, unit tests, in-memory fixtures.
5. **STAGING RUNTIME EVIDENCE:** Real HTTP probes against deployed staging infrastructure.
6. **PRODUCTION RUNTIME EVIDENCE:** Probes against production endpoints.
7. **LIVE DATABASE EVIDENCE:** Direct SQL catalog probes against live PostgreSQL (`pg_catalog`).
8. **EXTERNAL PROVIDER EVIDENCE:** Real integration proofs with external cloud APIs.

**Hierarchy Invariant Rule:** A lower evidence class can NEVER be silently represented as a higher evidence class.
- Source route ≠ Deployed route
- Migration file ≠ Applied migration
- Backup file ≠ Successful restore
- Unit test ≠ Staging verification
- Staging verification ≠ Production verification
- Configuration template ≠ Operational capability

---

## 10. Evidence Freshness Coordinate Rule

Every acceptance-critical test or evidence artifact must record an exact provenance coordinate tuple:
`[COMMIT, COMMAND, TIMESTAMP, RESULT]`

**Freshness Invariant Rule:** If source code changes after a test is executed, that evidence is **STALE** and **INVALID**. The test must be re-run against the new commit, and evidence must be regenerated.
