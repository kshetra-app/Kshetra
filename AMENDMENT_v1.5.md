# KSHETRA / PANIN

# AGENT EXECUTION GOVERNANCE AMENDMENT v1.5

## Mandatory Pre-Implementation Planning & Direction-Review Gate

**Amendment:** v1.5  
**Applies to:** All future substantive AI-agent implementation jobs  
**Supersedes:** Any previous execution guidance that permits immediate implementation without a pre-implementation planning stage  
**Does not invalidate:** Previously accepted work unless independently demonstrated to be materially defective  

---

# 1. PURPOSE

This amendment introduces a mandatory **Pre-Implementation Planning & Direction-Review Gate** into the Kshetra/PANIN AI-agent execution lifecycle.

The purpose is to prevent a technically capable AI agent from implementing an incorrect interpretation of a task efficiently.

The project must validate not only:

> "Did the agent implement the requested task?"

but first:

> "Does the agent correctly understand the problem, the intended outcome, the architecture, the constraints, and the implementation direction?"

The planning phase therefore becomes a formal control point before substantive source-code modification.

---

# 2. GOVERNING PRINCIPLE

The project shall follow:

> **Understand → Plan → Review → Correct → Approve → Implement → Test → Challenge → Verify → Accept**

The agent must demonstrate its intended implementation direction before being authorized to execute that direction.

A green implementation report is not evidence that the original implementation direction was correct.

---

# 3. UPDATED EXECUTION LIFECYCLE

For every substantive implementation job, the lifecycle is now:

```text
1. TASK ISSUED
        ↓
2. PRE-FLIGHT
        ↓
3. REPOSITORY / SYSTEM INSPECTION
        ↓
4. PRE-IMPLEMENTATION PLAN
        ↓
5. PLAN REVIEW
        ↓
6. PLAN CORRECTION, IF REQUIRED
        ↓
7. PLAN APPROVAL
        ↓
8. IMPLEMENTATION
        ↓
9. TEST
        ↓
10. SEMANTIC SELF-AUDIT
        ↓
11. NEGATIVE-PATH TEST
        ↓
12. REPAIR
        ↓
13. RETEST
        ↓
14. EVIDENCE RECONCILIATION
        ↓
15. REMOTE VERIFICATION
        ↓
16. READY FOR INDEPENDENT VERIFICATION
        ↓
17. INDEPENDENT VERIFICATION
        ↓
18. ACCEPTANCE
        ↓
19. NEXT JOB
```

No substantive implementation may bypass steps 3–7.

---

# 4. WHAT CONSTITUTES A SUBSTANTIVE JOB

The planning gate is mandatory for jobs involving any of the following:

* source-code implementation;
* architectural changes;
* database/schema/migration changes;
* API changes;
* authentication/authorization;
* security;
* RLS;
* privacy/compliance;
* data governance;
* performance architecture;
* mobile architecture;
* deployment/infrastructure;
* production behavior;
* significant refactoring;
* feature implementation;
* defect remediation;
* changes to governance/evidence tooling;
* changes to acceptance criteria;
* changes that affect previously accepted behavior;
* changes involving external providers;
* changes affecting data flows or sensitive information.

Very small, mechanical, explicitly bounded administrative operations may be exempt when they have no meaningful architectural or behavioral interpretation.

When uncertain, treat the job as substantive and require the planning gate.

---

# 5. PLAN-ONLY PHASE

After receiving a substantive job, the implementing agent must initially operate in:

```text
PLAN ONLY
```

mode.

During this phase the agent may:

* inspect repository files;
* inspect source code;
* inspect configuration;
* inspect migrations;
* inspect tests;
* inspect deployment configuration;
* inspect relevant runtime evidence;
* inspect prior reports;
* inspect governance documents;
* inspect Git history;
* inspect remote repository state;
* run read-only diagnostic commands;
* reproduce existing defects where safe.

During this phase the agent must NOT:

* modify source code;
* modify tests;
* modify migrations;
* modify configuration;
* modify governance documents;
* modify generated evidence;
* commit changes;
* push changes;
* alter acceptance state.

The objective is to establish understanding before execution.

---

# 6. REQUIRED PRE-IMPLEMENTATION PLAN

The agent must produce a document titled:

# Pre-Implementation Plan & Technical Interpretation

The plan must contain the following sections.

---

## 6.1 Task Understanding

The agent must explain in its own words:

* what problem the task is intended to solve;
* why the problem exists;
* what the desired final state is;
* what must remain unchanged;
* what constitutes success.

The agent must not merely repeat the task prompt.

---

## 6.2 Current-State Findings

The agent must identify the actual current state based on repository inspection.

For each material finding provide:

* file/path;
* relevant component/function/module;
* current behavior;
* evidence;
* significance.

Previous reports may be used as historical clues but must not be treated as authoritative without source verification.

---

## 6.3 Root-Cause Interpretation

The agent must distinguish:

```text
symptom
vs.
root cause
vs.
secondary consequence
```

The plan must explicitly state what it believes the root cause is.

If uncertain, uncertainty must be stated.

The agent must not disguise assumptions as facts.

---

## 6.4 Proposed Technical Solution

The agent must describe the intended solution before coding.

This must include:

* architecture;
* control/data flow;
* important state transitions;
* security implications;
* API/database implications;
* mobile implications where relevant;
* evidence implications;
* compatibility implications.

For logic changes, pseudocode or decision tables may be included where useful.

---

## 6.5 Exact Files Expected to Change

The agent must provide a preliminary list of:

* files expected to be modified;
* files expected to be created;
* files expected to be deleted, if any;
* files that must explicitly NOT be changed.

The list may change after deeper inspection, but material changes to the plan must subsequently be reported.

---

## 6.6 Test Strategy

The agent must describe:

* existing tests it will run;
* tests it will add;
* tests it will modify;
* integration tests;
* regression tests;
* negative-path tests;
* semantic tests.

Most importantly, for every critical invariant the agent must explain:

> **How would this test fail if the implementation were wrong?**

This prevents tests from becoming merely confirmation of the implementation.

---

## 6.7 Negative-Path Strategy

For security-, reliability-, governance-, provenance-, and data-integrity-sensitive jobs, the plan must explicitly identify failure scenarios.

Examples include:

* unavailable dependency;
* malformed input;
* stale data;
* missing configuration;
* authentication failure;
* authorization failure;
* network failure;
* database failure;
* stale evidence;
* incorrect provenance;
* conflicting state;
* partial completion;
* provider failure.

The agent must explain what the system should do in each case.

---

## 6.8 Evidence Strategy

The plan must identify:

* what evidence will be generated;
* where it will be stored;
* which commands produce it;
* which commit it corresponds to;
* what environment/database/runtime it represents;
* how freshness will be established;
* how evidence will be reconciled with source.

---

## 6.9 Provenance Strategy

Where repository or deployment provenance matters, the agent must explain how it will establish:

* branch;
* local HEAD;
* remote HEAD;
* audited commit;
* evidence commit;
* verification commit;
* working-tree state;
* relevant runtime/deployment version.

No hard-coded provenance values may be proposed.

---

## 6.10 Risks and Assumptions

The agent must list:

### Risks

Potential ways the implementation could fail or introduce regressions.

### Assumptions

Things the agent currently believes but has not yet independently proven.

Assumptions must not silently become implementation facts.

---

## 6.11 Scope Boundaries

The plan must explicitly state:

### IN SCOPE

What will be changed.

### OUT OF SCOPE

What will not be changed.

This is particularly important for workstreams with dependencies.

For example:

```text
W007 implementation: OUT OF SCOPE
W000–W005 reopening: OUT OF SCOPE unless material invalidation is discovered
```

---

## 6.12 Dependency / Blocking Analysis

The agent must identify:

* prerequisites;
* downstream work affected;
* upstream assumptions;
* acceptance dependencies;
* whether the job can safely proceed independently.

If the proposed implementation would affect another workstream, that must be disclosed before implementation.

---

# 7. PLAN REVIEW GATE

The Pre-Implementation Plan is not automatically approved.

It must undergo architectural/directional review.

The reviewer should challenge at minimum:

### Understanding

Does the agent actually understand the problem?

### Root cause

Is it solving the cause rather than the symptom?

### Architecture

Is the proposed design consistent with the project's architecture?

### Security

Could the implementation create a security weakness?

### Evidence

Will the proposed evidence actually prove the claims?

### Testing

Will the proposed tests detect incorrect behavior?

### Negative paths

Has the agent considered how the system fails?

### Scope

Is the agent changing more than necessary?

### Regression

Could accepted functionality be damaged?

### Governance

Does the plan respect the execution protocol?

### Future work

Does it accidentally implement or pre-empt a later workstream?

---

# 8. PLAN CORRECTION

If the reviewer identifies a problem, the agent must NOT immediately implement its original plan.

Instead, the reviewer issues corrections.

The agent must then produce a revised plan.

The revised plan must explicitly identify:

* what changed;
* why it changed;
* which reviewer concern caused the change.

Implementation remains blocked until the corrected direction is approved.

---

# 9. PLAN APPROVAL

Only an explicit approval authorizes implementation.

The approval means:

> The proposed direction is acceptable for execution.

It does NOT mean:

> The implementation is correct.

It does NOT mean:

> The work is verified.

It does NOT mean:

> The work is accepted.

Therefore:

```text
PLAN APPROVED
        ≠
IMPLEMENTATION VERIFIED
        ≠
WORK ACCEPTED
```

---

# 10. IMPLEMENTATION MUST FOLLOW THE APPROVED DIRECTION

After approval, the agent may implement.

If implementation reveals a material fact that invalidates the approved plan, the agent must stop and report the discrepancy rather than silently improvising a materially different architecture.

Minor implementation details may be adjusted without reopening the plan when they do not change:

* architecture;
* security properties;
* acceptance criteria;
* scope;
* data behavior;
* API contract;
* governance requirements.

Material deviations require plan re-review.

---

# 11. MATERIAL PLAN DEVIATION

A deviation is material if it changes any of:

* root-cause interpretation;
* architecture;
* security model;
* database model;
* API contract;
* external provider behavior;
* data flow;
* acceptance criteria;
* evidence model;
* scope;
* previously accepted behavior.

For a material deviation:

```text
STOP
→ EXPLAIN
→ REVISE PLAN
→ REVIEW
→ APPROVE
→ CONTINUE
```

Do not silently continue.

---

# 12. PLAN-TO-IMPLEMENTATION RECONCILIATION

After implementation, the agent must compare:

```text
APPROVED PLAN
        vs.
ACTUAL IMPLEMENTATION
```

The final report must state:

* what was implemented as planned;
* what changed;
* why it changed;
* whether any material deviation occurred.

This prevents the final report from becoming a retrospective rewrite of the original intention.

---

# 13. ADVERSARIAL PLAN REVIEW

For high-risk jobs, the reviewer should ask:

> "If this plan were subtly wrong, how would we discover it before implementation?"

The plan should therefore be challenged from the perspective of:

* security;
* reliability;
* scalability;
* maintainability;
* evidence integrity;
* production behavior;
* user experience;
* governance.

The purpose is not to make the plan unnecessarily complicated.

The purpose is to catch expensive wrong turns before implementation.

---

# 14. AI AGENT MUST NOT OPTIMIZE FOR PLAN APPROVAL

The agent must not produce a plan merely designed to obtain approval.

The plan must reflect its genuine technical interpretation.

If the agent believes:

* the task itself is flawed;
* the requested architecture is unsafe;
* a prerequisite is missing;
* a proposed assumption is false;
* another dependency must be addressed first;

it must state this explicitly.

A technically correct objection is preferable to obedient implementation of an incorrect requirement.

---

# 15. HUMAN / ARCHITECTURAL OVERSIGHT PRINCIPLE

For major architectural/security/governance decisions:

> The agent proposes. The reviewer challenges. The agent revises. The implementation then proceeds.

The agent is responsible for technical execution.

The project governance process remains responsible for determining whether the proposed direction is acceptable.

---

# 16. RELATIONSHIP TO INDEPENDENT VERIFICATION

The planning gate does not replace independent verification.

The complete control structure is:

```text
PLAN REVIEW
    ↓
IMPLEMENTATION
    ↓
IMPLEMENTER TESTING
    ↓
INDEPENDENT VERIFICATION
    ↓
ACCEPTANCE
```

Each stage answers a different question:

### Plan Review

> Are we about to solve the right problem in the right way?

### Implementation

> Did the agent build what was approved?

### Testing

> Does the implementation behave as expected?

### Independent Verification

> Is the implementation and evidence actually true?

### Acceptance

> Is the work formally accepted into project state?

---

# 17. EMERGENCY EXCEPTION

An immediate implementation without plan review may occur only when delay itself creates a material production/security risk.

In such cases the agent must:

1. document why the planning gate was bypassed;
2. implement the minimum necessary mitigation;
3. preserve evidence;
4. perform retrospective plan reconstruction;
5. conduct independent verification;
6. restore normal planning-gate operation.

The exception must not become a routine shortcut.

---

# 18. GOVERNANCE DOCUMENTATION

The following governance artifacts must recognize the planning gate where applicable:

* `AGENT_EXECUTION_PROTOCOL.md`
* `AMENDMENT_v1.5.md`
* `EXECUTION_STATE.md`
* relevant acceptance records
* relevant job records
* future master execution documentation

The permanent lifecycle should therefore reflect:

```text
TASK
→ PLAN
→ REVIEW
→ APPROVE
→ IMPLEMENT
→ TEST
→ VERIFY
→ ACCEPT
```

with the full closed-loop controls remaining intact.

---

# 19. REQUIRED AGENT RESPONSE FOR EVERY FUTURE SUBSTANTIVE JOB

The first response after receiving a substantive job must be:

```text
PRE-IMPLEMENTATION PLAN — <JOB ID>

1. Task Understanding
2. Current-State Findings
3. Root Cause
4. Proposed Technical Solution
5. Files Expected to Change
6. Test Strategy
7. Negative-Path Strategy
8. Evidence Strategy
9. Provenance Strategy
10. Risks
11. Assumptions
12. Scope Boundaries
13. Dependencies / Blocking Analysis
14. Acceptance Criteria
15. Questions / Decisions Requiring Review
```

The agent must then stop and await authorization.

It must NOT begin implementation merely because the task prompt appears sufficiently detailed.

---

# 20. IMPLEMENTATION AUTHORIZATION

The standard authorization phrase should be:

> **PLAN APPROVED — PROCEED WITH IMPLEMENTATION ACCORDING TO THE APPROVED PLAN.**

This authorization is the transition from:

```text
PLAN ONLY
```

to:

```text
IMPLEMENTATION AUTHORIZED
```

---

# 21. FINAL GOVERNANCE RULE

The project shall prefer:

> **one hour spent preventing a wrong implementation over many hours spent repairing a correct implementation of the wrong idea.**

The purpose of this amendment is therefore not bureaucracy.

It is to introduce an early, low-cost opportunity to detect:

* misunderstanding;
* architectural drift;
* unsafe assumptions;
* incomplete test strategy;
* incorrect evidence strategy;
* scope creep;
* premature downstream implementation.

This planning gate is now a permanent part of the Kshetra/PANIN execution framework.

---

# 22. EFFECTIVE STATE

From Amendment v1.5 onward:

**Every substantive new AI-agent implementation job must pass the Pre-Implementation Planning & Direction-Review Gate before implementation begins.**

Existing work already in execution is not retroactively interrupted solely because this amendment is introduced.

Current W006-R1C may continue under its already-issued implementation instruction.

Future substantive jobs must use the v1.5 planning gate.
