# KSHETRA / PANIN

# AGENT EXECUTION GOVERNANCE AMENDMENT v1.5-A

## Strengthening the Mandatory Pre-Implementation Planning & Direction-Review Gate

**Amendment:** v1.5-A  
**Status:** RATIFIED AND IN FORCE / ACTIVE OPERATIONAL AUTHORITY  
**Applies to:** Kshetra / PANIN AI-Agent Execution Framework  
**Parent Amendment:** AMENDMENT v1.5 — Mandatory Pre-Implementation Planning & Direction-Review Gate (Immutable Historical Baseline)  
**Does not invalidate:** Previously accepted work unless independently demonstrated to be materially defective  

---

# 1. PURPOSE



AMENDMENT v1.5 introduced a mandatory planning and direction-review gate before substantive implementation work.



AMENDMENT v1.5-A strengthens that gate to prevent the planning phase itself from becoming a procedural formality.



The purpose is to ensure:



> **The agent must establish that it understands the problem, the current system state, the proposed solution, the affected boundaries, the verification method, and the risks BEFORE it is permitted to modify the system.**



This amendment does not replace AMENDMENT v1.5.



It supplements and strengthens it.



---



# 2. GOVERNING PRINCIPLE



The following principle becomes permanent:



> **No implementation may begin merely because the task description appears clear. The agent must first demonstrate that the proposed implementation direction is technically justified against the actual repository and system state.**



A plan is therefore not a checklist.



A plan is a technical argument for why the proposed implementation is the correct next action.



---



# 3. MANDATORY EXECUTION STATE



For every substantive implementation job, the following states are mandatory:



```text

TASK_DEFINED

    ↓

PRE-FLIGHT

    ↓

INSPECTION

    ↓

PLAN_DRAFTED

    ↓

PLAN_REVIEW

    ↓

PLAN_CORRECTED (if required)

    ↓

PLAN_APPROVED

    ↓

IMPLEMENTATION

    ↓

TEST

    ↓

SEMANTIC_SELF_AUDIT

    ↓

NEGATIVE_PATH_TEST

    ↓

REPAIR (if required)

    ↓

RETEST

    ↓

EVIDENCE_RECONCILIATION

    ↓

REMOTE_VERIFICATION

    ↓

READY_FOR_INDEPENDENT_VERIFICATION

    ↓

INDEPENDENT_VERIFICATION

    ↓

ACCEPTANCE

```



No state may be silently skipped.



---



# 4. DEFINITION OF "SUBSTANTIVE JOB"



The planning gate is mandatory for any job that changes, or could materially affect:



* application source code;

* API behavior;

* database schema;

* migrations;

* RLS or authorization;

* authentication;

* security controls;

* infrastructure configuration;

* deployment configuration;

* environment configuration;

* data flows;

* privacy/compliance behavior;

* business logic;

* tests that establish acceptance;

* governance documents;

* execution state;

* acceptance criteria;

* evidence-generation logic;

* CI/CD behavior;

* production behavior;

* dependencies;

* architecture;

* performance-critical behavior;

* public-facing functionality.



A job must be treated as substantive whenever there is reasonable doubt.



The default must be:



> **If uncertain whether the planning gate applies, apply the planning gate.**



---



# 5. GOVERNANCE-ONLY CHANGES ARE NOT EXEMPT



Governance changes must not be treated as automatically trivial.



Any amendment to:



* AGENT_EXECUTION_PROTOCOL.md;

* AMENDMENT files;

* acceptance rules;

* evidence rules;

* execution-state rules;

* defect/decision governance;

* verification methodology;



must itself undergo the planning discipline unless the change is purely administrative and has no effect on execution semantics.



This prevents governance changes from becoming an uncontrolled bypass around the governance system itself.



---



# 6. PLAN MUST BE BASED ON ACTUAL CURRENT STATE



A plan must not be based solely on:



* task descriptions;

* stale repository documentation;

* previous agent reports;

* previous acceptance;

* assumptions about architecture;

* expected file locations;

* historical implementation details.



Before planning, the agent must inspect the actual current state relevant to the task.



At minimum, where applicable:



* current branch;

* current HEAD;

* working-tree state;

* relevant source files;

* relevant tests;

* relevant configuration;

* relevant migrations;

* relevant database assumptions;

* relevant API routes;

* relevant runtime behavior;

* applicable defects;

* applicable decisions;

* applicable prior evidence.



Historical documents may be used as clues but must not override current technical evidence.



---



# 7. PLAN MUST DISTINGUISH FACTS FROM ASSUMPTIONS



Every material finding in the plan must be classified as one of:



```text

FACT — directly verified from current evidence

INFERENCE — reasoned from verified facts

ASSUMPTION — not yet verified

UNKNOWN — evidence unavailable

```



The agent must not present an assumption as a fact.



If an implementation depends materially on an UNKNOWN condition, the plan must explicitly identify it as a dependency or blocking question.



---



# 8. ROOT-CAUSE REQUIREMENT



The plan must identify the likely root cause.



The agent must not jump directly from:



```text

symptom → code change

```



without considering:



```text

symptom

→ evidence

→ affected system boundary

→ root cause

→ architectural implication

→ proposed solution

```



If root cause cannot yet be established, the plan must explicitly state:



> ROOT CAUSE NOT YET PROVEN



and identify what evidence is required.



---



# 9. ALTERNATIVE-SOLUTION REQUIREMENT



For material architectural, security, database, API, performance, or product decisions, the plan must consider at least one reasonable alternative.



The plan must state:



1. proposed solution;

2. reasonable alternative;

3. why the proposed solution is preferred;

4. what trade-off is being accepted.



This does not require artificial alternatives for trivial changes.



The purpose is to prevent the first technically possible solution from automatically becoming the chosen solution.



---



# 10. EXACT CHANGE BOUNDARY



The plan must explicitly identify:



### Expected modifications



Files/modules/configuration expected to change.



### Expected non-modifications



Important areas that must NOT change.



### Potential incidental changes



Changes that might become necessary only if implementation evidence proves them necessary.



This creates a formal scope boundary.



---



# 11. NO SILENT PLAN DRIFT



During implementation, the agent must continuously compare actual work against the approved plan.



If the agent discovers a material deviation involving:



* additional files;

* additional architecture;

* additional database changes;

* changed security behavior;

* changed API behavior;

* changed acceptance criteria;

* changed dependencies;

* materially different implementation direction;



the agent must STOP.



It must then report:



```text

PLAN DEVIATION DETECTED



Original plan:

...



Observed condition:

...



Reason deviation is required:

...



Proposed revised approach:

...



New files/components affected:

...



New risks:

...



New tests required:

...



New evidence required:

...

```



Implementation may continue only after the revised plan is reviewed and approved.



---



# 12. NO "JUST ONE SMALL CHANGE" BYPASS



An agent must not bypass the planning gate by describing a substantive change as:



* a quick fix;

* a tiny patch;

* a cleanup;

* a test adjustment;

* a documentation update;

* a compatibility fix;

* a harmless refactor;



when the change materially affects system behavior or verification.



Classification must be based on actual impact, not the size of the diff.



---



# 13. TEST DESIGN MUST BE PREDICTIVE



For every acceptance-critical test, the plan must answer:



> **What incorrect implementation would this test fail to detect?**



and:



> **How would this test fail if the intended behavior were broken?**



Tests must not merely prove that code executes.



Where applicable, tests should verify:



* positive path;

* negative path;

* boundary conditions;

* authorization;

* invalid input;

* failure behavior;

* unavailable dependency behavior;

* stale configuration behavior;

* regression behavior;

* semantic invariants.



---



# 14. TEST-INTEGRITY REQUIREMENT



A test cannot be considered strong evidence merely because it passes.



Before acceptance, the implementing agent must inspect whether the test genuinely exercises the intended behavior.



Particular scrutiny is required when tests:



* mock the implementation under test;

* duplicate production logic;

* assert only constants;

* inspect source text instead of behavior;

* use fixtures that cannot represent the real failure;

* bypass authentication/authorization;

* bypass the actual database;

* bypass the actual API path;

* depend on hard-coded expected values;

* can pass even if the implementation is incorrect.



The question is:



> **Could the implementation be wrong while this test still passes?**



If yes, the test is insufficient by itself.



---



# 15. EVIDENCE MUST BE PLANNED BEFORE IMPLEMENTATION



The plan must identify the evidence required to prove completion.



Evidence must be mapped to the claim it supports.



Example:



```text

CLAIM:

Production API uses the corrected authorization behavior.



REQUIRED EVIDENCE:

Production runtime evidence demonstrating the behavior.



INSUFFICIENT EVIDENCE:

Source code showing the authorization implementation.

```



Source code must not automatically be treated as runtime proof.



---



# 16. CAPABILITY ≠ PROOF



The planning and verification framework must continue to distinguish:



```text

Capability exists

≠

Configuration exists

≠

Code exists

≠

Runtime works

≠

Production works

≠

Production is correctly isolated

≠

Business behavior is correct

```



Plans must identify the required proof level for each acceptance criterion.



---



# 17. ACCEPTANCE CRITERIA MUST BE CLAIM-BASED



Acceptance criteria must be expressed as verifiable claims.



Weak:



```text

API updated.

```



Strong:



```text

Authenticated users without the required authorization cannot execute the protected mutation in the production API.

```



Each acceptance claim must have a corresponding verification method and evidence source.



---



# 18. PLAN REVIEW MUST CHALLENGE DIRECTION, NOT JUST COMPLETENESS



The reviewer must not merely ask:



> "Did the agent include all the requested sections?"



The reviewer must challenge:



### Understanding



Does the agent understand the actual problem?



### Root cause



Is the root-cause interpretation supported?



### Architecture



Is the proposed solution appropriate for the existing architecture?



### Security



Could the solution create a bypass?



### Data



Could the solution create data integrity or privacy problems?



### Testing



Would the proposed tests detect a wrong implementation?



### Evidence



Will the proposed evidence actually prove the claims?



### Scope



Is the proposed scope too broad or too narrow?



### Future work



Could the change create hidden work or technical debt for downstream jobs?



### Reversibility



If the implementation fails, can it be safely repaired or rolled back?



---



# 19. APPROVAL MUST BE EXPLICIT



A plan is not approved merely because:



* the reviewer did not respond;

* the task appears obvious;

* the agent says "proceeding";

* implementation has already started;

* the plan exists in a report.



The approval state must be explicit.



Canonical approval phrase:



> **PLAN APPROVED — PROCEED WITH IMPLEMENTATION ACCORDING TO THE APPROVED PLAN.**



Anything else must not be interpreted as approval unless the governance system explicitly defines it.



---



# 20. PLAN APPROVAL DOES NOT MEAN IMPLEMENTATION ACCEPTANCE



These are separate decisions:



```text

PLAN APPROVAL

    ≠

IMPLEMENTATION VERIFICATION

    ≠

INDEPENDENT VERIFICATION

    ≠

FINAL ACCEPTANCE

```



Approval means only:



> The proposed direction is authorized for implementation.



It does not mean:



> The implementation is correct.



---



# 21. IMPLEMENTING AGENT CANNOT SELF-APPROVE A MATERIAL PLAN DEVIATION



The implementing agent may identify and propose a deviation.



It may not unilaterally approve its own material deviation.



The same separation principle established by Rule IV-001 continues to apply.



---



# 22. DOWNSTREAM IMPACT MUST BE INCLUDED



Every substantive plan must identify whether the change affects:



* subsequent work packages;

* acceptance gates;

* known defects;

* API contracts;

* database migrations;

* mobile behavior;

* deployment;

* compliance;

* performance;

* evidence requirements.



If a downstream job becomes invalid or requires modification, this must be recorded before proceeding.



---



# 23. NO PREMATURE JOB EXECUTION



A future job must not be started merely because:



* the previous implementation appears complete;

* the next job is unblocked in a document;

* the agent has already generated a plan;

* a report says "ready."



The governing sequence remains:



```text

PLAN

→ REVIEW

→ APPROVAL

→ IMPLEMENT

→ VERIFY

→ ACCEPT

→ NEXT JOB

```



---



# 24. EMERGENCY EXCEPTION



The planning gate may be bypassed only where delay creates an immediate and material:



* production outage;

* security incident;

* active data-loss risk;

* active privacy/compliance risk;

* critical integrity failure.



The agent must then:



1. minimize scope;

2. document the emergency reason;

3. make the smallest safe intervention;

4. preserve evidence;

5. reconstruct the plan retrospectively;

6. submit the work to independent verification;

7. record the exception permanently.



Emergency mode must never become a convenience mechanism.



---



# 25. GOVERNANCE SELF-PROTECTION



No future amendment, job, agent instruction, or implementation may weaken or bypass this planning gate without explicitly amending the governing protocol.



In particular, an instruction cannot override this amendment merely by saying:



```text

skip planning

start implementation

do not ask questions

this is already understood

this is a continuation

this is only a small change

```



unless the change genuinely qualifies for an explicitly defined exception.



---



# 26. REQUIRED PLAN TEMPLATE



Every substantive implementation plan must contain at least:



```text

1. Task Understanding



2. Current-State Findings



3. Facts / Inferences / Assumptions / Unknowns



4. Root-Cause Interpretation



5. Proposed Technical Solution



6. Alternatives Considered



7. Exact Files / Components Expected to Change



8. Explicit Non-Change Boundary



9. Test Strategy



10. Negative-Path Strategy



11. Test Integrity Strategy



12. Evidence Strategy



13. Provenance Strategy



14. Security / Privacy / Data Considerations



15. Risks and Assumptions



16. Scope Boundaries



17. Dependency / Blocking Analysis



18. Downstream Impact



19. Rollback / Recovery Considerations



20. Acceptance Criteria



21. Questions / Decisions Requiring Review



22. Plan-Approval State

```



---



# 27. REQUIRED IMPLEMENTATION DECLARATION



Before implementation begins, the agent must record:



```text

PLAN STATUS: APPROVED



APPROVED PLAN VERSION: <identifier>



PLAN APPROVAL EVIDENCE: <reference>



IMPLEMENTATION MAY BEGIN: YES

```



If these fields are absent, implementation is not authorized.



---



# 28. REQUIRED POST-IMPLEMENTATION DECLARATION



After implementation, the agent must report:



```text

APPROVED PLAN FOLLOWED: YES / NO



MATERIAL PLAN DEVIATION: YES / NO



IF YES:

    DEVIATION APPROVED: YES / NO

    REVISED PLAN REFERENCE: <identifier>



IMPLEMENTATION COMPLETE: YES / NO

```



This creates explicit traceability between direction and implementation.



---



# 29. EVIDENCE CHAIN



For substantive jobs, the following relationship must remain reconstructable:



```text

TASK

 ↓

INSPECTION

 ↓

PLAN

 ↓

PLAN APPROVAL

 ↓

IMPLEMENTATION COMMIT

 ↓

TEST EVIDENCE

 ↓

SEMANTIC SELF-AUDIT

 ↓

NEGATIVE-PATH EVIDENCE

 ↓

EVIDENCE RECONCILIATION

 ↓

REMOTE VERIFICATION

 ↓

INDEPENDENT VERIFICATION

 ↓

ACCEPTANCE

```



If the chain cannot be reconstructed, the work must not be treated as fully governed.



---



# 30. PROHIBITION ON RETROACTIVE PLAN FABRICATION



An agent must not implement first and then create a plan afterward merely to satisfy the governance requirement.



A retrospective plan is valid only under the explicit emergency exception.



For ordinary work:



> **The plan must temporally precede implementation.**



---



# 31. EFFECT ON EXISTING WORK



AMENDMENT v1.5-A must not automatically invalidate already-completed work that legitimately followed the previously active governance rules.



It applies prospectively after adoption.



However, if an already-running job has not yet crossed its implementation boundary, the new planning gate should be applied where practical without unnecessarily restarting completed work.



No completed work package should be reopened solely because this amendment was introduced unless a material governance or technical defect is discovered.



---



# 32. EFFECTIVE DATE



Upon formal adoption and implementation, AMENDMENT v1.5-A becomes part of the permanent Kshetra / PANIN AI-Agent Execution Framework.



It must be incorporated consistently into:



* AGENT_EXECUTION_PROTOCOL.md;

* applicable amendment records;

* governance consistency tests;

* execution-state semantics;

* acceptance methodology;

* future agent job instructions.



---



# 33. FINAL GOVERNING PRINCIPLE



The framework must optimize for:



> **Correct direction before implementation.**



> **Correct implementation before acceptance.**



> **Evidence before confidence.**



> **Independent verification before trust.**



And ultimately:



> **Do not optimize the project for producing green reports. Optimize the project for producing true reports.**



---
