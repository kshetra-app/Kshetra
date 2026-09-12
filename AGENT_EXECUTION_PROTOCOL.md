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

## 6. Evidence, Lineage & Verification Standards

1. **Evidence Follows Implementation:** Never generate final evidence before code changes are finalized.
2. **Four-Point Commit Lineage (Amendment v1.4 / DEC-023):**
   - `VERIFIED_REMOTE_HEAD`: Exact remote HEAD against which verification evidence was executed.
   - `AUDITED_CODE_COMMIT`: Exact implementation commit audited.
   - `EVIDENCE_COMMIT`: Commit containing generated test/audit evidence artifacts.
   - `ACCEPTANCE_COMMIT`: Commit containing final acceptance state and register updates (`HEAD` on final acceptance commit).
   - *Freshness Invariance Rule:* The later acceptance commit advances Git HEAD and does not invalidate the historical verification coordinate (`VERIFIED_REMOTE_HEAD`), preventing self-referential commit loops.
3. **Clean Repository Mandate:** `git status` must show a 100% clean working tree prior to declaring any milestone ready for verification.
4. **Remote Synchronization:** Push commits to `origin/master` and verify remote HEAD before reporting completion.
5. **Independent Verification (Rule IV-001):** The implementing agent cannot self-certify. Critical milestones, security architecture, migrations, and Launch Gates require independent verification.

---

## 7. The Final Self-Question

Before declaring any job **"READY FOR INDEPENDENT VERIFICATION"**, the implementing agent must answer:

> *"If another engineer receives only the remote repository, evidence files and acceptance criteria, can they independently reproduce my conclusion?"*

If the answer is **NO**, the job is NOT ready.
