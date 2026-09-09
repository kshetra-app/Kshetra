# PANIN / KSHETRA

# MASTER EXECUTION FRAMEWORK AMENDMENT v1.3

## AUTONOMOUS CLOSED-LOOP EXECUTION, SELF-AUDIT AND EFFICIENCY PROTOCOL

### Status

MANDATORY PROJECT GOVERNANCE AMENDMENT

### Purpose

Reduce unnecessary execution/verification cycles while increasing implementation accuracy, evidence quality and autonomous completion capability.

This amendment does NOT remove independent verification.

It changes the implementing agent's responsibilities so that the agent performs a comprehensive internal audit and corrective loop before declaring any job ready for independent verification.

---

# PART 1 — NEW AGENT OPERATING CONSTITUTION

Create and maintain:

# `AGENT_EXECUTION_PROTOCOL.md`

This document becomes mandatory reading before every job.

The agent must read, in this order:

1. `MASTER EXECUTION DOCUMENT`
2. `AMENDMENT_v1.2.md`
3. `AGENT_EXECUTION_PROTOCOL.md`
4. `EXECUTION_STATE.md`
5. `ACCEPTANCE_REGISTER.md`
6. `DEFECT_REGISTER.md`
7. `DECISION_LOG.md`
8. `RELEASE_REGISTER.md`
9. the specific job instruction.

The agent must not begin implementation before completing the pre-flight process.

---

# PART 2 — AUTONOMOUS CLOSED-LOOP EXECUTION

Every job must follow:

```text
READ
↓
UNDERSTAND
↓
INSPECT
↓
PLAN
↓
IMPLEMENT
↓
TEST
↓
ADVERSARIAL SELF-AUDIT
↓
REPAIR
↓
RETEST
↓
EVIDENCE RECONCILIATION
↓
COMMIT
↓
REMOTE VERIFICATION
↓
ACCEPTANCE PREPARATION
↓
INDEPENDENT VERIFICATION WHERE REQUIRED
```

The agent must not stop after the first successful implementation/test cycle.

---

# PART 3 — PRE-FLIGHT REQUIREMENT

Before implementing a job, the agent must produce internally:

```text
JOB
PURPOSE
DEPENDENCIES
CURRENT IMPLEMENTATION
RELATED DEFECTS
RELATED DECISIONS
RELATED PREVIOUS EVIDENCE
LIKELY FAILURE MODES
FILES LIKELY TO CHANGE
ACCEPTANCE CRITERIA
ACCEPTANCE EVIDENCE REQUIRED
HUMAN ACTIONS REQUIRED
```

The pre-flight must be derived from the repository.

Do not assume the feature is missing.

Do not assume existing code is correct.

Do not assume existing documentation is current.

---

# PART 4 — CHANGE-MINIMIZATION PRINCIPLE

Before adding new code:

1. Search for an existing implementation.
2. Search for duplicated logic.
3. Search for existing types.
4. Search for existing API endpoints.
5. Search for existing database structures.
6. Search for existing tests.
7. Reuse or repair where appropriate.

Do not create a second implementation when a correct existing implementation can be repaired.

---

# PART 5 — DEPENDENCY-FIRST RULE

Before implementation, identify:

```text
DIRECT DEPENDENCIES
TRANSITIVE DEPENDENCIES
BLOCKERS
DOWNSTREAM FEATURES
DATABASE DEPENDENCIES
API DEPENDENCIES
EXTERNAL PROVIDERS
SECURITY DEPENDENCIES
COMPLIANCE DEPENDENCIES
```

If an unfinished prerequisite blocks the job:

* resolve it;
* or explicitly classify the job as blocked.

Do not implement around an unresolved dependency with a fake workaround merely to make a test pass.

---

# PART 6 — NO PREMATURE SUCCESS

The implementing agent MUST NOT report:

* COMPLETE;
* ACCEPTED;
* PRODUCTION READY;

after merely achieving:

* compile;
* one successful test;
* one successful API request;
* one successful UI flow;
* local success.

The agent must complete the full closed-loop process first.

---

# PART 7 — AUTONOMOUS SELF-AUDIT

Immediately after implementation, the agent must act as an adversarial reviewer of its own work.

Ask:

### Architecture

* Did I create duplicate logic?
* Did I violate the API boundary?
* Did I introduce unnecessary dependencies?
* Did I create environment coupling?
* Did I create future migration problems?

### Data

* Is persistence real?
* Is the schema correct?
* Is the data source correct?
* Is provenance preserved?
* Did I accidentally fabricate/default data?

### Security

* Can an unauthorized user perform the action?
* Can another tenant/user access the data?
* Can the client bypass authorization?
* Are secrets exposed?
* Are storage permissions correct?

### Performance

* Did I increase startup cost?
* Did I increase bundle size?
* Did I create an N+1 query?
* Did I introduce unnecessary network requests?
* Did I load large assets unnecessarily?

### Reliability

* What happens if the API fails?
* What happens if the DB fails?
* What happens offline?
* What happens when provider credentials expire?
* What happens on retry?
* Is an operation idempotent?

### UX

* Loading state?
* Empty state?
* Error state?
* Retry?
* Offline state?
* Permission denial?
* Long text?
* Accessibility?

### Analytics

* Is the correct event generated?
* Is it duplicated?
* Is the event tied to the correct entity/geography?

### i18n

* Are all user-facing strings localized?
* Do all 13 languages have keys?
* Are interpolation/plural forms valid?
* Could text clip?

### Compliance

* Does this collect personal data?
* Does it expose personal data?
* Does it change retention?
* Does it create profiling?
* Does it require privacy/consent changes?

The agent must fix any issue it discovers before preparing completion evidence.

---

# PART 8 — NEGATIVE-PATH TESTING

Every meaningful feature must test not only:

# "Does it work?"

but also:

# "Does it correctly fail?"

Where applicable test:

* unauthorized user;
* invalid input;
* missing resource;
* duplicate request;
* network failure;
* DB failure;
* stale session;
* expired token;
* wrong tenant;
* wrong geography;
* empty state;
* malformed media;
* provider outage.

A feature that succeeds only on the happy path is not considered tested.

---

# PART 9 — IMPLEMENTATION / EVIDENCE BINDING

Evidence must be generated AFTER implementation is stable.

Preferred sequence:

```text
IMPLEMENT
↓
TEST
↓
SELF-AUDIT
↓
REPAIR
↓
RETEST
↓
FINAL COMMIT
↓
GENERATE FINAL EVIDENCE
```

Do not generate final evidence first and modify code afterward.

---

# PART 10 — EVIDENCE CONSISTENCY AUDIT

Before declaring a job READY FOR VERIFICATION, the agent must automatically compare:

* report vs JSON;
* report vs summary;
* evidence vs commit;
* execution state vs acceptance register;
* defect register vs actual open defects;
* decision log vs actual architecture;
* release register vs actual release state.

Any contradiction must be fixed before reporting.

---

# PART 11 — COMMIT COORDINATE VALIDATION

Every final evidence package must distinguish:

```text
CURRENT_REMOTE_HEAD
AUDITED_CODE_COMMIT
EVIDENCE_COMMIT
ACCEPTANCE_COMMIT
```

Never use one SHA to represent all four unless they are genuinely identical.

The agent must verify every referenced SHA using Git.

Unknown/stale SHA:

# ACCEPTANCE BLOCKER

---

# PART 12 — REPOSITORY CLEANLINESS

Before a job is declared READY:

```text
git status
```

must show a clean working tree unless explicitly documented otherwise.

If uncommitted files exist:

* inspect them;
* determine whether they belong to the job;
* commit them;
* discard them deliberately;
* or document why they must remain.

"Clean enough" is not an acceptance state.

---

# PART 13 — REMOTE REPOSITORY VERIFICATION

After committing:

1. Push to canonical remote.
2. Retrieve remote HEAD.
3. Verify commit exists remotely.
4. Verify changed files exist remotely.
5. Verify evidence exists remotely.
6. Confirm repository is synchronized.

The agent must not report completion from local-only state.

---

# PART 14 — EVIDENCE REPRODUCIBILITY

Where practical, every audit must be reproducible from:

```text
fresh repository checkout
+
defined command
+
defined configuration
=
same result
```

If reproducibility depends on unavailable human credentials:

record:

# HUMAN ACTION REQUIRED

Do not simulate success.

---

# PART 15 — TEST-TO-IMPLEMENTATION BINDING

Tests must exercise the real implementation.

Avoid duplicated production logic inside tests.

Bad:

```text
production parser
test parser copy
test parser copy passes
```

Good:

```text
production parser
↓
actual test invocation
↓
observed result
```

The same rule applies to:

* calculators;
* validators;
* ranking;
* mappers;
* serializers;
* state machines;
* API logic.

---

# PART 16 — SOURCE-TRUTH TESTING

When validating an inventory:

Prefer:

```text
actual parser
+
actual source
```

over:

```text
manually typed expectation
```

When possible, derive expected output from authoritative source structure.

---

# PART 17 — STATIC VS RUNTIME DISTINCTION

The agent must explicitly distinguish:

### Static/source evidence

What source code says should exist.

### Runtime evidence

What actually exists after deployment.

### Live production evidence

What the deployed system actually does.

Never substitute one for another.

---

# PART 18 — CONFIGURATION VS INFRASTRUCTURE VS RUNTIME

Infrastructure work must separately establish:

```text
CONFIGURATION
↓
PROVISIONING
↓
RUNTIME
↓
ISOLATION
↓
MONITORING
```

Configuration files are not proof of infrastructure existence.

Infrastructure existence is not proof of runtime functionality.

Runtime functionality is not proof of isolation.

---

# PART 19 — HUMAN ACTION BOUNDARY

The agent should autonomously perform everything technically possible.

The agent should stop only when a genuine human-controlled dependency exists, such as:

* secret entry;
* cloud account authorization;
* billing authorization;
* legal approval;
* app-store submission;
* domain ownership;
* provider account creation;
* government credential.

When blocked:

```text
HUMAN ACTION REQUIRED
WHAT
WHY
EXACT LOCATION
EXACT VALUE/SETTING REQUIRED
SECURITY WARNING
WHAT TO TEST AFTER COMPLETION
```

Do not ask the human to manually perform work that the repository/terminal can safely perform.

---

# PART 20 — SELF-HEALING RULE

When a job discovers a defect directly related to its objective:

The agent must fix it within the same job where reasonably possible.

Do not create unnecessary follow-up jobs for trivial implementation defects.

Example:

A W002 task discovers environment variable precedence is wrong.

Preferred:

```text
discover
→ repair
→ test
→ include in W002 evidence
```

not:

```text
discover
→ stop
→ report
→ create W002-R7
```

unless the defect has meaningful independent scope.

---

# PART 21 — SCOPE-CONTROL RULE

If a discovered problem is unrelated to the current objective:

1. record it in DEFECT_REGISTER.md;
2. classify severity;
3. identify dependency impact;
4. continue current job if safe.

Do not allow unrelated technical debt to hijack the job.

---

# PART 22 — THREE-TIER DEFECT HANDLING

### Tier 1 — Direct blocker

Fix now.

### Tier 2 — Directly related defect

Fix now if reasonably bounded.

### Tier 3 — Unrelated issue

Log and defer.

This reduces unnecessary job fragmentation.

---

# PART 23 — JOB COMPLETION PACKAGE

Before reporting a job complete, the agent must generate internally:

```text
1. implementation summary
2. files changed
3. DB changes
4. API changes
5. tests
6. negative-path tests
7. self-audit result
8. security result
9. performance result
10. i18n result
11. compliance result
12. evidence files
13. commit
14. remote verification
15. open defects
16. human actions
17. acceptance recommendation
```

---

# PART 24 — REPORTING LANGUAGE

The agent must use precise states.

### NOT STARTED

No meaningful work begun.

### IN PROGRESS

Work actively underway.

### IMPLEMENTED

Code exists.

### TESTED

Automated tests pass.

### VERIFIED

Acceptance evidence independently reproduced.

### PRODUCTION

Deployed.

### ACCEPTED

Acceptance authority approved.

### COMPLETE

All required completion criteria satisfied.

The agent must never collapse these states.

---

# PART 25 — "READY FOR VERIFICATION" STANDARD

The implementing agent may report:

# READY FOR INDEPENDENT VERIFICATION

only after:

[ ] implementation complete

[ ] self-audit complete

[ ] all directly related defects addressed

[ ] tests pass

[ ] negative-path testing complete

[ ] evidence generated

[ ] evidence reconciled

[ ] commit verified

[ ] remote state verified

[ ] working tree clean

[ ] continuity registers updated

[ ] known limitations documented

[ ] human actions explicitly listed

---

# PART 26 — INDEPENDENT VERIFICATION EFFICIENCY

Independent verification should NOT redo every line of implementation.

It should target:

### High-risk claims

### Evidence correctness

### Critical functionality

### Security boundaries

### Data truth

### Production behavior

### Regression risk

### Acceptance criteria

The verifier should use the builder's evidence as a starting index, NOT as proof.

---

# PART 27 — VERIFIER SHOULD START FROM THE REMOTE COMMIT

The verifier must:

1. identify exact remote commit;
2. inspect actual repository;
3. inspect evidence;
4. independently reproduce material tests;
5. inspect production where applicable.

The verifier should not use:

* the builder's local workspace;
* uncommitted files;
* undocumented state;
* screenshots alone.

---

# PART 28 — VERIFIER DISCREPANCY PROTOCOL

If the verifier finds a discrepancy:

```text
MINOR
→ record
→ continue

MATERIAL
→ reject acceptance
→ return for repair

CRITICAL
→ block milestone
→ reopen relevant job
```

Do not automatically create another large audit.

---

# PART 29 — LAUNCH GATE EFFICIENCY

At Launch Gates A and B:

The independent verifier should perform a **risk-based verification**, not blindly repeat every implementation step.

Priority:

1. security;
2. data truth;
3. production behavior;
4. critical user journeys;
5. performance;
6. app size;
7. i18n;
8. monitoring/recovery;
9. revenue/compliance where applicable.

---

# PART 30 — CRITICAL-MILESTONE EFFICIENCY

Independent verification is mandatory for:

* security architecture;
* geography;
* major DB migrations;
* billing;
* advertising;
* political advertising;
* compliance;
* production infrastructure;
* release;
* Launch Gates.

Ordinary low-risk internal changes may rely on the implementing agent's closed-loop self-audit and automated tests.

---

# PART 31 — ANTI-LOOP RULE

The project must avoid recursive verification loops.

If the same class of discrepancy occurs twice:

Example:

```text
incorrect SHA
incorrect SHA again
```

do not merely fix the individual instance.

Modify the process/script to prevent recurrence.

The objective is:

# REMOVE THE CLASS OF FAILURE.

---

# PART 32 — AUTOMATION-FIRST GOVERNANCE

Whenever a repeated human inspection occurs more than once, evaluate whether it can become an automated check.

Examples:

### Commit consistency

Create a script.

### Evidence SHA validation

Create a validator.

### i18n parity

Automate.

### Registry consistency

Automate.

### API contract drift

Automate.

### Route inventory

Automate.

### Environment configuration

Automate.

The project should progressively convert repeated verification into tooling.

---

# PART 33 — ACCEPTANCE LINTER

Create eventually:

`scripts/validate-project-state.mjs`

It should detect:

* stale commit references;
* contradictory register states;
* missing evidence;
* dirty repository;
* missing required reports;
* inconsistent job IDs;
* impossible status combinations;
* invalid next-job pointers.

A job should fail its internal completion process if this validator fails.

---

# PART 34 — EVIDENCE LINTER

Create eventually:

`scripts/validate-evidence.mjs`

It should check:

* referenced commit exists;
* referenced files exist;
* evidence timestamps;
* environment;
* version;
* branch;
* JSON/report consistency;
* SHA consistency.

---

# PART 35 — DEFECT REGRESSION RULE

When a defect is fixed:

The agent must create a regression test wherever technically reasonable.

Example:

```text
DEFECT
↓
FIX
↓
REGRESSION TEST
↓
FUTURE FAILURE DETECTED AUTOMATICALLY
```

---

# PART 36 — BUILD-SIZE REGRESSION RULE

If a change increases consumer bundle size materially:

* identify cause;
* quantify increase;
* determine necessity;
* optimize;
* document exception if accepted.

---

# PART 37 — PERFORMANCE REGRESSION RULE

If a change materially increases:

* startup;
* API latency;
* database query time;
* memory;
* rendering cost;

the agent must investigate before declaring the job complete.

---

# PART 38 — SECURITY REGRESSION RULE

A new security-sensitive capability must include negative tests.

Examples:

* unauthorized role;
* wrong tenant;
* invalid token;
* expired token;
* direct API manipulation.

---

# PART 39 — DATA REGRESSION RULE

A change to canonical data models requires:

* before/after schema;
* migration;
* compatibility check;
* data validation;
* rollback consideration.

---

# PART 40 — COMPLIANCE REGRESSION RULE

Any feature touching personal data must run:

```text
DATA
↓
PURPOSE
↓
NOTICE / PROCESSING GROUND
↓
ACCESS
↓
RETENTION
↓
DELETION
↓
SHARING
↓
SECURITY
↓
AUDIT
```

---

# PART 41 — AI REGRESSION RULE

Any AI feature must continue to function safely when AI is:

* unavailable;
* rate-limited;
* too expensive;
* inaccurate;
* disabled.

---

# PART 42 — "NO SURPRISES" RULE

Before reporting a job:

The agent must inspect:

```text
git diff
git status
git log
changed files
generated artifacts
environment references
migration files
```

and verify there are no unintended changes.

---

# PART 43 — FINAL SELF-QUESTION

Before reporting:

# "READY FOR VERIFICATION"

the agent must answer:

> If another engineer receives only the remote repository, evidence files and acceptance criteria, can they independently reproduce my conclusion?

If the answer is:

# NO

the job is not ready.

---

# PART 44 — FIVE-PILLAR INTEGRATION

The five permanent registers remain authoritative state records.

## EXECUTION_STATE.md

Current execution truth.

## ACCEPTANCE_REGISTER.md

Acceptance truth.

## DEFECT_REGISTER.md

Known-problem truth.

## DECISION_LOG.md

Decision truth.

## RELEASE_REGISTER.md

Release truth.

`AGENT_EXECUTION_PROTOCOL.md` governs HOW the agent works.

The five registers govern WHAT STATE THE PROJECT IS IN.

Do not mix those purposes.

---

# PART 45 — MASTER OPERATING LOOP

The project should operate as:

```text
MASTER SPECIFICATION
        ↓
CURRENT STATE
        ↓
JOB
        ↓
PRE-FLIGHT
        ↓
IMPLEMENT
        ↓
SELF-AUDIT
        ↓
REPAIR
        ↓
TEST
        ↓
EVIDENCE
        ↓
REMOTE REPOSITORY
        ↓
INDEPENDENT VERIFICATION
        ↓
ACCEPT
        ↓
NEXT JOB
```

---

# PART 46 — OBJECTIVE OF THIS AMENDMENT

The purpose is NOT to eliminate verification.

The purpose is:

# **MOVE MORE VERIFICATION LEFT.**

The implementing agent should catch ordinary problems before presenting the job to the independent verifier.

Independent verification remains the final external safety net.

---

# FINAL PROJECT RULE

## Build once.

## Audit yourself twice.

## Submit evidence once.

## Verify independently at critical gates.

## Fix the class of failure, not only the instance.

## Never make the human discover a problem the agent could have detected itself.
