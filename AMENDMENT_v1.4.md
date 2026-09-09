# PANIN / KSHETRA
# MASTER EXECUTION FRAMEWORK AMENDMENT v1.4
## EVIDENCE SEMANTICS, RUNTIME PROOF AND CARRY-FORWARD CONTROLS

### Status
MANDATORY PROJECT GOVERNANCE AMENDMENT

### Purpose
This amendment incorporates the engineering lessons discovered during W000–W002.
Its purpose is to:
* reduce false-positive verification;
* reduce repeated back-and-forth;
* improve evidence quality;
* force semantic correctness between tests and claims;
* distinguish source/configuration/runtime/production states;
* carry known exceptions forward intelligently;
* improve autonomous agent accuracy.

This amendment does not expand product scope.

---

# PART 1 — TEST SEMANTIC INTEGRITY
## Rule SI-001
A test must actually test what its name and description claim to test.
Bad example:
\\\	ext
testProductionApiConnectsToProductionDb()
→ GET /health
\\\
if \/health\ does not access the database.
This test proves:
\\\	ext
API process is reachable
\\\
not:
\\\	ext
API connects successfully to production database
\\\

## Rule SI-002
Before using an endpoint as acceptance evidence, inspect its implementation.
Determine:
* does it access the DB?
* does it access storage?
* does it access authentication?
* does it access an external provider?
* is it static?
* does it return seed data?
* does it perform business logic?
Do not infer behavior from endpoint naming alone.

## Rule SI-003
Evidence statements must describe exactly what the test proves.
Example:
### Correct
\GET /health returned 200 OK, proving API process health.\
### Incorrect
\GET /health returned 200 OK, proving API-to-database connectivity.\

---

# PART 2 — STATIC VS RUNTIME VS PRODUCTION EVIDENCE
Every evidence item must be classified as one of:
\\\	ext
SOURCE
CONFIGURATION
BUILD
LOCAL RUNTIME
STAGING RUNTIME
PRODUCTION RUNTIME
LIVE DATABASE
EXTERNAL PROVIDER
\\\
Never substitute one class for another.

---

# PART 3 — CONFIGURATION IS NOT INFRASTRUCTURE
A configuration file containing:
\\\	ext
STAGING_API_URL=...
\\\
does NOT prove that the staging API exists.
Evidence must distinguish:
\\\	ext
CONFIGURED
\\\
from:
\\\	ext
PROVISIONED
\\\
from:
\\\	ext
RUNNING
\\\
from:
\\\	ext
VERIFIED
\\\

---

# PART 4 — INFRASTRUCTURE IS NOT RUNTIME ISOLATION
The existence of two cloud projects does not by itself prove:
* application isolation;
* authentication isolation;
* database isolation;
* write isolation.
Where isolation is claimed, perform actual runtime tests.

---

# PART 5 — DATABASE CONNECTIVITY PROOF
A database-connectivity claim requires an operation that actually reaches the database.
Acceptable examples include:
* DB-backed API query;
* DB-backed API mutation;
* controlled query through application service layer.
Not sufficient:
* process health;
* static seed-data response;
* configuration comparison;
* URL comparison.

---

# PART 6 — APPLICATION-LAYER ISOLATION
Database-level isolation and application-level isolation are separate acceptance criteria.
When claiming:
# \"Staging cannot modify production\"
the preferred test is:
\\\	ext
STAGING CLIENT
→ STAGING API
→ APPLICATION WRITE
→ STAGING DB
→ VERIFY PRODUCTION DB UNCHANGED
\\\
Direct writes against the database may be used as supplementary evidence, but they do not replace application-layer testing.

---

# PART 7 — MIGRATION EVIDENCE
Always distinguish:
### Repository migration files
Files present in:
\supabase/migrations\
from:
### Applied migrations
Migrations actually recorded as applied to a live environment.
Never state:
> \"36 migrations applied\"
because:
> \"36 SQL files exist.\"
For each environment maintain:
\\\	ext
repository migration count
environment applied migration count
migration drift
\\\

---

# PART 8 — MIGRATION DRIFT
A future CI/CD system must detect:
\\\	ext
repository migrations
≠
staging applied migrations
\\\
and:
\\\	ext
repository migrations
≠
production applied migrations
\\\
where the deployment model requires parity.
Any difference must be:
* explained;
* documented;
* intentional;
* or remediated.
Unknown migration drift is a deployment blocker.

---

# PART 9 — DATABASE OBJECT COUNT SEMANTICS
Clearly distinguish:
\\\	ext
SOURCE-DEFINED TABLES
SOURCE-DEFINED VIEWS
SOURCE-DEFINED FUNCTIONS
SOURCE-DEFINED TRIGGERS
\\\
from:
\\\	ext
LIVE TABLES
LIVE VIEWS
LIVE FUNCTIONS
LIVE TRIGGERS
\\\
Source parsing is not a substitute for PostgreSQL catalog verification.

---

# PART 10 — API INVENTORY SEMANTICS
Distinguish:
\\\	ext
STATIC ROUTE REGISTRATIONS
\\\
from:
\\\	ext
ROUTES REGISTERED AT RUNTIME
\\\
and:
\\\	ext
ROUTES ACTUALLY DEPLOYED
\\\
A static source count must never be described as a live production endpoint count.

---

# PART 11 — MOBILE ROUTE INVENTORY SEMANTICS
Document exactly what is being counted:
* source files;
* Expo routes;
* registered routes;
* screens;
* layouts.
Do not use these terms interchangeably.

---

# PART 12 — SEED DATA VS DATABASE DATA
Whenever an API returns data, determine whether the data came from:
\\\	ext
DATABASE
SEED DATA
STATIC FILE
MEMORY
CACHE
EXTERNAL API
COMBINATION
\\\
Evidence must identify the real source.
This is particularly important for:
* states;
* constituencies;
* election results;
* political entities;
* geography.

---

# PART 13 — CLAIM-TO-EVIDENCE BINDING
Every material assertion in a completion report must reference an evidence source.
Preferred structure:
\\\	ext
CLAIM
→ TEST
→ IMPLEMENTATION
→ RESULT
→ EVIDENCE FILE
→ COMMIT
\\\
No unsupported narrative claims.

---

# PART 14 — EVIDENCE FRESHNESS
Evidence remains valid only for the code/configuration/data state against which it was produced.
If implementation changes:
\\\	ext
OLD EVIDENCE
=
INVALID FOR NEW STATE
\\\
unless the change is demonstrably irrelevant and documented.

---

# PART 15 — EVIDENCE COMMIT MODEL
Maintain:
\\\	ext
AUDITED_CODE_COMMIT
EVIDENCE_COMMIT
ACCEPTANCE_COMMIT
CURRENT_REMOTE_HEAD
\\\
Do not collapse them into one field when they represent different states.

---

# PART 16 — CARRY-FORWARD EXCEPTION REGISTER
At the start of every job, the agent must read unresolved defects and exceptions relevant to the job.
The agent must explicitly classify each as:
\\\	ext
BLOCKING
DIRECTLY RELEVANT
RELEVANT LATER
UNRELATED
HUMAN ACTION REQUIRED
\\\
Do not rediscover the same issue without consulting the defect register.

---

# PART 17 — DIRECTLY RELATED DEFECT POLICY
If the current job discovers a defect that is:
* directly related;
* bounded;
* technically safe to fix;
the agent should fix it within the same job.
Only create a separate job when:
* scope is materially larger;
* a prerequisite is involved;
* legal approval is required;
* destructive action requires approval;
* external infrastructure is required;
* implementation would compromise the current job's objective.

---

# PART 18 — HEALTH ENDPOINT RULE
Health endpoints must have defined semantics.
Each endpoint must be documented as one or more of:
\\\	ext
LIVENESS
READINESS
DATABASE CONNECTIVITY
EXTERNAL DEPENDENCY
FULL SYSTEM HEALTH
\\\
Do not use a liveness endpoint as evidence for database or external dependency health.

---

# PART 19 — RUNTIME PROOF RULE
For every major runtime claim:
\\\	ext
WHAT
WHERE
HOW
EXPECTED
ACTUAL
\\\
must be documented.
Example:
\\\	ext
WHAT:
Staging API DB connectivity
WHERE:
staging Railway service
HOW:
GET /api/v1/<known-db-backed-endpoint>
EXPECTED:
known staging record
ACTUAL:
known staging record returned
RESULT:
PASS
\\\

---

# PART 20 — NEGATIVE TEST REQUIREMENT
A major integration should normally include at least one negative-path test.
Examples:
* wrong environment credentials;
* wrong tenant;
* unauthorized role;
* unavailable dependency;
* incorrect origin;
* malformed input.

---

# PART 21 — SENTINEL TEST RULE
Sentinel tests must identify the exact layer they validate.
### Database sentinel
Proves database separation.
### Application sentinel
Proves application-layer separation.
The report must never describe a database sentinel as proof of application isolation.

---

# PART 22 — ENVIRONMENT ISOLATION MATRIX
Every environment-separated system must maintain:

| Property | Development | Staging | Production |
| :--- | :--- | :--- | :--- |
| API endpoint | defined | defined | defined |
| DB endpoint | defined | defined | defined |
| credentials | separate | separate | separate |
| data | local/test | synthetic/sanitized | real |
| writes to other env | forbidden | forbidden | forbidden |
| auth tenant | separate | separate | separate |
| CORS | env-specific | env-specific | env-specific |

The matrix must reflect actual runtime configuration.

---

# PART 23 — PRODUCTION DATA PROTECTION
Never copy production:
* personal data;
* private messages;
* KYC data;
* credentials;
* private media;
* sensitive analytics
into staging merely for convenience.
Use:
* synthetic data;
* sanitized data;
* public data;
* purpose-built fixtures.

---

# PART 24 — CI/CD FUTURE REQUIREMENT
The CI/CD system must progressively automate:
### State validation
* branch;
* commit;
* registers;
* evidence.
### Evidence validation
* report/JSON consistency;
* SHA validity;
* environment metadata.
### Migration validation
* migration drift.
### API validation
* contract drift.
### i18n validation
* 100% parity.
### Build validation
* app-size regression.
### Test validation
* required suites.

---

# PART 25 — TEST IMPLEMENTATION INSPECTION
Before accepting a test as evidence, independently inspect the test's implementation.
Ask:
> Does this test actually execute the production implementation?
If the test reimplements or mocks the relevant business logic in a way that bypasses the real implementation, it cannot serve as sole acceptance evidence.

---

# PART 26 — REPORT SEMANTICS
The completion report must contain separate fields:
\\\	ext
IMPLEMENTATION_STATUS
TEST_STATUS
EVIDENCE_STATUS
PRODUCTION_STATUS
ACCEPTANCE_STATUS
\\\
Do not compress them into:
\COMPLETE\.

---

# PART 27 — SELF-AUDIT QUESTION
Before reporting:
# READY FOR INDEPENDENT VERIFICATION
the implementing agent must answer:
1. What does each test actually prove?
2. Is every evidence claim supported?
3. Are any tests merely configuration tests?
4. Are any runtime claims based on static data?
5. Are migrations actually applied?
6. Are the environments genuinely isolated?
7. Is production state independently observable?
8. Are any open defects being incorrectly classified as non-blocking?
9. Is the repository clean?
10. Is the evidence bound to the correct commit?

---

# PART 28 — REPORT LANGUAGE PROHIBITIONS
The agent must not write:
> \"database connectivity verified\"
unless an actual DB operation was observed.
It must not write:
> \"production endpoint verified\"
unless the deployed endpoint was actually tested.
It must not write:
> \"migration applied\"
unless applied state was actually checked.
It must not write:
> \"runtime isolation verified\"
unless a runtime isolation test was executed.
It must not write:
> \"feature complete\"
unless all required completion criteria passed.

---

# PART 29 — EVIDENCE QUALITY LEVELS
Every evidence item receives:
### E0 — Claim only
Not acceptable.
### E1 — Static/code evidence
Useful but limited.
### E2 — Automated test evidence
Stronger.
### E3 — Runtime evidence
Actual execution.
### E4 — Independent runtime verification
Independently reproduced.
### E5 — Production independent verification
Highest normal application level.

The acceptance level required should be determined by job risk.

---

# PART 30 — RISK-BASED VERIFICATION
Not every tiny change requires maximum verification.
### Low risk
Code review + tests.
### Medium risk
Tests + evidence + self-audit.
### High risk
Independent verification.
### Critical
Independent verification + production validation.
Critical areas include:
* security;
* money;
* geography;
* political advertising;
* personal data;
* production infrastructure;
* migration;
* release;
* Launch Gates.

---

# PART 31 — W002 LESSON CARRY-FORWARD
The following W002 exceptions are intentionally carried forward:
### Database connectivity
Must be proven through real DB-backed API operations.
### Migration drift
Must be detected by CI/CD.
### Application isolation
Must be distinguished from database isolation.
### Environment configuration
Must be distinguished from actual infrastructure.

These become future implementation requirements and do not require reopening W002 unless a P0/P1 defect is discovered.

---

# PART 32 — NO-LOOP RULE
Do not create repetitive verification jobs merely because wording is imperfect.
Create a new remediation job only when:
* implementation is wrong;
* evidence is materially wrong;
* security is affected;
* production behavior is incorrect;
* acceptance criteria genuinely fail.
Documentation-only corrections should be folded into the next appropriate job when safe.

---

# PART 33 — W003 REQUIRED PRE-FLIGHT
Before executing W003, the agent must:
1. read Amendment v1.4;
2. inspect W002 acceptance exceptions;
3. determine which W002 exceptions W003 can automate;
4. implement those improvements where they fall within W003 scope;
5. create evidence;
6. carry unresolved exceptions forward.
W003 must not silently assume W002 was perfect.

---

# PART 34 — W003 SPECIFIC MANDATES
W003 CI/CD must eventually enforce:
## A. Repository state
Clean working tree.
## B. Evidence integrity
Referenced SHA exists.
## C. Register integrity
Current state is internally consistent.
## D. Migration drift
Detect repository vs environment drift.
## E. API contract drift
Detect relevant route/schema mismatch.
## F. Test semantic integrity
Ensure required test suites execute real implementations.
## G. Build integrity
API/mobile/shared builds pass.
## H. i18n
Strict 100% validation remains enforced.
## I. App size
Release build size checked where practical.

---

# PART 35 — SUCCESS CRITERION
The goal is:
# \"The agent catches the problem before the verifier has to.\"
Not:
# \"The verifier is very good at finding the agent's mistakes.\"
The second is a safety net.
The first is the desired operating model.

---

# PART 36 — FINAL OPERATING LOOP
The permanent workflow is now:
\\\	ext
READ
↓
PRE-FLIGHT
↓
INSPECT
↓
IMPLEMENT
↓
TEST
↓
SEMANTIC SELF-AUDIT
↓
NEGATIVE-PATH TEST
↓
REPAIR
↓
RETEST
↓
EVIDENCE RECONCILIATION
↓
REMOTE VERIFICATION
↓
READY FOR INDEPENDENT VERIFICATION
↓
INDEPENDENT VERIFICATION
↓
ACCEPT
↓
NEXT JOB
\\\

---

# FINAL PRINCIPLE
## Do not optimize the project for producing green reports.
## Optimize the project for producing true reports.

# END OF AMENDMENT v1.4
