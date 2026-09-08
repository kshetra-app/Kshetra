# PANIN / KSHETRA
# MASTER EXECUTION FRAMEWORK AMENDMENT v1.2
## COMPLIANCE / DPDP + INDEPENDENT EVIDENCE VERIFICATION

### Status
MANDATORY PROJECT GOVERNANCE AMENDMENT

### Applies to
All current and future jobs, phases, features, releases and production deployments.

---

# PART 1 — PURPOSE

This amendment modifies the existing AI Agent Master Execution Document and Sequential Job Book.

It introduces two permanent project controls:

1. A dedicated Compliance / DPDP / Data Governance workstream.
2. Mandatory independent evidence verification at Launch Gates and designated critical milestones.

These controls are now part of the permanent PANIN/Kshetra execution constitution.

They are not optional enhancements.

---

# PART 2 — COMPLIANCE / DPDP MANDATE

## NEW JOB

# W051.5 — COMPLIANCE, DPDP & DATA GOVERNANCE READINESS

## Placement

W051.5 must execute between:

W051 — API Customer Acquisition

and

W052 — Professional Broadcast Architecture.

Do not renumber existing jobs.

---

# W051.5 — OBJECTIVE

Establish a technically enforceable privacy, personal-data governance and compliance-by-design foundation before PANIN substantially expands:

- professional accounts;
- media organizations;
- aspirants;
- campaign operations;
- advertising;
- analytics;
- broadcasting;
- API/SaaS;
- advanced personalization;
- external integrations.

The job must assess the application against the applicable requirements of:

- Digital Personal Data Protection Act, 2023;
- Digital Personal Data Protection Rules, 2025;
- applicable commencement dates;
- other applicable privacy/data/intermediary/electronic communication requirements identified during the audit.

The agent must use current authoritative Government/MeitY materials when performing the legal/compliance analysis.

The agent must NOT claim that PANIN is "fully legally compliant" merely because the job is complete.

The correct output is:

- compliance assessment;
- technical remediation;
- documented gaps;
- controls;
- implementation state;
- remaining legal/human-review items.

Legal interpretation requiring qualified legal counsel must be explicitly identified as:

# HUMAN / LEGAL REVIEW REQUIRED

---

# W051.5 OWNER

## Accountable Owner

COMPLIANCE

## Technical Owner

ARCH

## Delivery Owners

COMPLIANCE + ARCH + BE + MOB + SEC + DATA + DEVOPS

## Acceptance Authority

SEC + QA + COMPLIANCE

Where a legal conclusion requires professional legal interpretation, legal counsel must be the final authority.

---

# W051.5 REQUIRED WORK

## 1. PERSONAL DATA INVENTORY

Inspect the entire application and identify all personal-data fields and data classes.

Include at minimum:

- account data;
- authentication data;
- phone;
- email;
- name;
- profile;
- profile media;
- location;
- PIN;
- locality;
- precise location;
- device information;
- session information;
- analytics identifiers;
- community content;
- civic reports;
- uploaded media;
- journalist information;
- aspirant information;
- verification/KYC information;
- organization/member information;
- campaign user data;
- advertising interaction data;
- payment/customer information;
- support data;
- notification data;
- API customer information.

For each field/class record:

```text
entity
field
personal-data classification
purpose
collection point
storage location
processing location
access roles
sharing
retention
deletion mechanism
security controls
```

---

# 2. DATA FLOW MAP

Build the actual flow:

```text
USER
 ↓
MOBILE / WEB
 ↓
PANIN API
 ↓
SUPABASE
 ↓
STORAGE / MEDIA
 ↓
ANALYTICS
 ↓
EXTERNAL PROVIDERS
 ↓
AD / CAMPAIGN / MEDIA SYSTEMS
```

For every data boundary identify:

- data transferred;
- purpose;
- recipient;
- transport/security;
- retention;
- deletion implications.

Do not create a conceptual diagram only.

Derive it from actual code/configuration.

---

# 3. PURPOSE LIMITATION

For every personal-data category answer:

# Why do we need this?

If there is no defensible product purpose:

- remove it;
- stop collecting it;
- or mark it for explicit review.

Do not retain fields simply because they may be useful later.

---

# 4. NOTICE AND CONSENT / LAWFUL PROCESSING

Identify every collection point.

For each:

- identify the purpose;
- identify applicable legal basis/ground;
- determine whether consent is required;
- provide appropriate notice;
- define withdrawal behavior where applicable.

Do not invent legal conclusions.

Where legal interpretation is uncertain:

# HUMAN / LEGAL REVIEW REQUIRED

The application must nevertheless be technically structured so that the eventual legal decision can be implemented cleanly.

---

# 5. 13-LANGUAGE PRIVACY REQUIREMENT

All privacy-related user-facing experiences must respect the existing 13-language mandate.

Languages:

```text
en
te
hi
ta
kn
ml
mr
bn
gu
or
pa
as
ne
```

This applies to:

- privacy notices;
- consent interfaces;
- account-data controls;
- deletion;
- grievance;
- relevant error states;
- notification text;
- settings;
- user-facing explanations.

A privacy control that is available only in English does not count as fully implemented for PANIN's product requirements.

---

# 6. DATA PRINCIPAL RIGHTS WORKFLOWS

Where applicable, build/test workflows for:

- access;
- correction/update;
- deletion;
- grievance;
- consent withdrawal.

Each workflow must be:

```text
REQUEST
↓
AUTHENTICATE / VERIFY
↓
PROCESS
↓
AUDIT
↓
RESPOND
↓
CLOSE
```

Do not leave any workflow as a documentation-only promise.

---

# 7. RETENTION AND DELETION

Create a retention matrix.

For each data class:

```text
data class
retention period
reason
storage
deletion trigger
deletion mechanism
exceptions
audit requirements
```

Implement deletion where technically required.

Test that deletion actually propagates to relevant:

- primary records;
- derived records;
- caches;
- storage;
- searchable representations;
- analytics systems where applicable.

---

# 8. ACCOUNT DELETION

Verify:

```text
DELETE ACCOUNT
↓
IDENTITY
↓
PROFILE
↓
PERSONAL CONTENT
↓
PRIVATE DATA
↓
MEDIA
↓
TOKENS / SESSIONS
↓
PROVIDER DATA WHERE APPLICABLE
```

The system must distinguish between:

- data that must be deleted;
- data that may need retention for legal/security reasons;
- genuinely public information;
- aggregated/anonymized data.

Do not delete public political records merely because a person deletes a private account unless the applicable rules require it.

---

# 9. CHILD / AGE HANDLING

Determine whether PANIN may be accessed by children.

Identify:

- age handling;
- consent implications;
- restricted processing;
- advertising implications;
- content controls.

Do not assume the issue away.

---

# 10. POLITICAL PROFILING REVIEW

This is mandatory because PANIN is a political/geographic platform.

Audit whether the system creates or could create:

- inferred political opinions;
- political preference profiles;
- sensitive behavioral categories;
- individual-level political targeting.

The default architectural preference is:

# geography/contextual targeting

rather than:

# inferred individual political-belief targeting.

Any proposed sensitive inference must be separately reviewed.

---

# 11. LOCATION PRIVACY

Because geography is a core PANIN function, distinguish:

### Public geography

State, district, constituency, ward, etc.

from:

### Personal location

A specific user's location or movement.

Do not treat the fact that geography is the core product as permission to collect more precise personal location than necessary.

Review:

- GPS;
- background location;
- location history;
- IP-derived location;
- PIN;
- locality.

---

# 12. KYC / VERIFICATION DATA

Identify:

- what verification data is actually required;
- who can see it;
- how long it is retained;
- whether a third-party provider receives it;
- deletion process;
- access control.

Do not collect identity documentation merely because a future feature may someday need it.

---

# 13. THIRD-PARTY PROVIDERS

For every provider document:

```text
provider
service
data shared
purpose
country/region where relevant
retention
security
contractual dependency
exit strategy
```

Include:

- hosting;
- storage;
- payments;
- notifications;
- analytics;
- streaming;
- telecom;
- advertising;
- AI;
- authentication.

---

# 14. SECURITY SAFEGUARDS

Verify:

- encryption in transit;
- secure credential storage;
- access control;
- least privilege;
- secret management;
- logging;
- audit trails;
- backup;
- recovery.

---

# 15. BREACH RESPONSE

Implement or document an executable incident process:

```text
DETECT
↓
CONTAIN
↓
ASSESS
↓
LOG
↓
NOTIFY AS REQUIRED
↓
REMEDIATE
↓
VERIFY
↓
CLOSE
```

The process must identify:

- owner;
- escalation;
- evidence;
- communication;
- remediation;
- closure.

---

# 16. SIGNIFICANT DATA FIDUCIARY ASSESSMENT

Perform a documented assessment against the applicable statutory criteria.

Do not assume PANIN is either:

- a Significant Data Fiduciary;

or:

- not one.

Produce:

```text
CURRENT ASSESSMENT
REASONING
EVIDENCE
TRIGGERS FOR REASSESSMENT
```

If professional legal determination is required:

# HUMAN / LEGAL REVIEW REQUIRED

---

# 17. PRIVACY-BY-DESIGN ARCHITECTURE

Every future data-touching feature must document:

```text
DATA COLLECTED?
WHY?
LEGAL BASIS / PROCESSING GROUND?
NOTICE?
CONSENT WHERE APPLICABLE?
ACCESS?
RETENTION?
DELETION?
SHARING?
SECURITY?
AUDIT?
```

This becomes a permanent acceptance gate.

---

# 18. W051.5 EVIDENCE REQUIREMENTS

The job must produce:

```text
scratch/compliance_data_inventory.json
scratch/compliance_data_flow.json
scratch/compliance_retention_matrix.json
scratch/compliance_rights_test.json
scratch/compliance_security_assessment.json
scratch/compliance_provider_register.json
scratch/compliance_sdf_assessment.json
scratch/compliance_gap_register.json
```

Also produce a human-readable:

`COMPLIANCE_DPDPA_READINESS.md`

---

# 19. W051.5 ACCEPTANCE CRITERIA

W051.5 cannot be marked COMPLETE until:

[ ] personal-data inventory exists

[ ] data-flow map exists

[ ] purposes are documented

[ ] collection points are identified

[ ] rights workflows assessed/implemented

[ ] retention model exists

[ ] deletion tested

[ ] account deletion tested

[ ] security controls assessed

[ ] provider sharing assessed

[ ] political profiling reviewed

[ ] location handling reviewed

[ ] KYC reviewed

[ ] child/age handling reviewed

[ ] SDF assessment documented

[ ] breach process exists

[ ] compliance gaps documented

[ ] legal-review items explicitly identified

[ ] 13-language privacy surfaces identified

[ ] evidence committed to repository

[ ] independent verification completed when the job reaches the applicable verification gate

---

# PART 3 — PERMANENT INDEPENDENT VERIFICATION RULE

# NEW GOVERNANCE RULE — IV-001

## IMPLEMENTING AGENT ≠ FINAL ACCEPTANCE AUTHORITY

The agent that implements a task may:

- build;
- test;
- produce evidence;
- recommend acceptance.

The implementing agent may NOT be the sole authority that declares:

# ACCEPTED

for a Launch Gate or designated critical milestone.

---

# PART 4 — INDEPENDENT VERIFIER

## Role

# IV — INDEPENDENT VERIFICATION OWNER

The verifier may be:

- another AI agent;
- a clean independent AI session;
- a separate audit workflow;
- a human QA/security reviewer;
- another qualified engineering reviewer.

The verifier must be independent from the implementation conclusion.

---

# PART 5 — WHAT THE INDEPENDENT VERIFIER RECEIVES

The verifier receives:

- master execution specification;
- job ID;
- acceptance criteria;
- repository commit;
- build/version identifiers;
- evidence artifacts.

The verifier must NOT rely on the implementing agent's summary as proof.

---

# PART 6 — WHAT THE VERIFIER MUST DO

For every launch gate:

1. Inspect the committed repository state.
2. Verify the exact commit.
3. Verify the relevant evidence artifacts.
4. Reproduce critical tests.
5. Inspect production/staging where applicable.
6. Check the acceptance criteria independently.
7. Identify discrepancies.
8. Produce independent verdict.

Possible verdicts:

```text
PASS
PASS WITH NON-BLOCKING EXCEPTIONS
FAIL
REOPEN REQUIRED
```

---

# PART 7 — EVIDENCE FRESHNESS

Acceptance evidence is valid only for the code/data/build versions it was generated against.

Evidence must identify:

```text
repository
branch
commit SHA
database/migration version
API version
mobile build/version
timestamp
environment
```

If implementation changes after evidence was produced:

# PREVIOUS EVIDENCE IS INVALID

The affected evidence must be regenerated.

---

# PART 8 — REMOTE REPRODUCIBILITY

For important jobs, evidence must be present in the committed remote repository or otherwise independently retrievable from the controlled release artifact.

The implementing agent must not be able to say:

> "The evidence exists only in my local workspace."

That is not sufficient for acceptance.

---

# PART 9 — LAUNCH GATE A

At Launch Gate A, independent verification is mandatory.

The verifier must independently verify:

## Product

- Map;
- Explore;
- My Kshetra;
- Constituency;
- Delimitation;
- Community;
- Civic;
- News;
- Shorts;
- Notifications.

## Data

- core geography;
- provenance;
- delimitation status.

## Security

- auth;
- authorization;
- reporting;
- blocking;
- deletion.

## Performance

- consumer build size;
- startup;
- representative-device behavior.

## i18n

All 13 languages.

## Operations

- Railway;
- Supabase;
- monitoring;
- backup;
- rollback.

---

# PART 10 — LAUNCH GATE B

At final platform completion, independent verification must repeat the major acceptance checks for:

- Community;
- Civic;
- Aspirants;
- Groups;
- Live;
- Broadcasting;
- Academy;
- Campaign;
- Political Ads;
- Commercial Ads;
- SaaS/API;
- analytics;
- compliance;
- security;
- performance;
- i18n;
- recovery.

---

# PART 11 — CRITICAL-MILESTONE VERIFICATION

Independent verification is also mandatory for:

- authentication architecture;
- RLS/security changes;
- geography model changes;
- major database restructuring;
- payment/billing;
- advertising;
- political advertising;
- compliance;
- production deployment;
- app-size release gate;
- major performance gate;
- final go-live.

---

# PART 12 — ACCEPTANCE FORMULA

For ordinary features:

```text
IMPLEMENTATION
+
AUTOMATED TESTING
+
ACCEPTANCE EVIDENCE
+
PRODUCTION VERIFICATION
=
ACCEPTED
```

For Launch Gates and critical milestones:

```text
IMPLEMENTATION
+
AUTOMATED TESTING
+
ACCEPTANCE EVIDENCE
+
REMOTE REPRODUCIBILITY
+
INDEPENDENT VERIFICATION
+
PRODUCTION VERIFICATION
=
ACCEPTED
```

---

# PART 13 — INDEPENDENT VERIFICATION REPORT

Every Launch Gate must produce:

`INDEPENDENT_VERIFICATION_REPORT.md`

Required fields:

```text
gate
repository
branch
commit
build/version
database version
tests reproduced
evidence reviewed
production checks
failures
exceptions
security findings
data findings
i18n findings
performance findings
verdict
verifier
timestamp
```

---

# PART 14 — VERIFIER AUTHORITY

The verifier has explicit authority to:

- reject a feature;
- reopen a completed job;
- downgrade acceptance;
- require additional evidence;
- classify a defect;
- block a Launch Gate.

The implementing agent must not override this verdict.

---

# PART 15 — ACCEPTANCE STATUS REFINEMENT

Use these statuses:

### IMPLEMENTED

Code exists.

### TESTED

Automated/local tests pass.

### VERIFIED

Acceptance evidence independently reproduced.

### PRODUCTION

Deployed.

### ACCEPTED

Acceptance authority approves.

### COMPLETE

Production is monitored and the feature has no unresolved blocking defect.

A feature must not skip directly from:

IMPLEMENTED

to:

COMPLETE.

---

# PART 16 — 13-LANGUAGE PERMANENT GOVERNANCE RULE

Every feature containing user-visible content must remain compliant with all 13 languages:

```text
en
te
hi
ta
kn
ml
mr
bn
gu
or
pa
as
ne
```

Requirements:

- no missing translation keys;
- no accidental English fallback;
- no hardcoded user-facing English;
- no broken interpolation;
- no broken pluralization;
- no layout clipping;
- no unacceptable truncation;
- no unusable dialogs;
- no inaccessible error/loading/empty states.

Key parity alone is insufficient.

Functional and visual verification is required.

The validator must require:

# 100%

not 90%.

---

# PART 17 — AMENDMENT ACCEPTANCE

This framework amendment is complete only when:

[x] W051.5 exists in the roadmap

[x] W051.5 owner defined

[x] W051.5 acceptance evidence defined

[x] DPDP compliance-by-design rule added

[x] Independent verification role defined

[x] Launch Gate A independent verification rule added

[x] Launch Gate B independent verification rule added

[x] critical-milestone verification added

[x] evidence freshness rule added

[x] remote reproducibility rule added

[x] acceptance status definitions updated

[x] 13-language permanent rule retained

[x] continuity documents updated

[x] amendment committed to repository


---

# PART 18 — AGENT INSTRUCTION

After incorporating this amendment:

DO NOT execute W051.5 now.

Do NOT renumber existing jobs.

Do NOT begin W002.

First complete the currently pending W001-R5 reconciliation.

The execution sequence is:

```text
W001-R5
↓
W002
↓
...
W051
↓
W051.5
↓
W052
...
```

At every future Launch Gate, invoke independent verification before acceptance.

---

# FINAL RULE

The implementation agent can build the system.

The implementation agent can test the system.

The implementation agent can produce evidence.

But:

# THE IMPLEMENTATION AGENT CANNOT BE THE SOLE JUDGE THAT ITS OWN WORK IS ACCEPTED.

Acceptance must be earned through reproducible evidence and, at designated gates, independent verification.

---

# FINAL COMPLIANCE RULE

Privacy and data protection are not a document added at the end.

They are part of the architecture.

Every future feature that touches personal data must include compliance-by-design evidence.

# END OF AMENDMENT