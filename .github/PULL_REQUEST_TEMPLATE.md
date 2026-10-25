## Purpose and scope
Describe the user-visible behavior or production defect this change addresses. Reference the job/defect IDs and exact acceptance criteria.

## Source and data truth
- [ ] Every new/changed factual datum has a traceable source, retrieval date, effective date, version/hash, status, and transformation history as applicable.
- [ ] OFFICIAL / DERIVED / VERIFIED / ESTIMATE / SCENARIO / INFERRED / UNVERIFIED / UNKNOWN semantics are explicit.
- [ ] No synthetic result, demo fallback, or successful empty response hides a database/provider failure.

## Verification evidence
- [ ] Tests are committed and were run against the exact head commit.
- [ ] Typecheck, strict locale parity, formatting, lint, dependency security scan, SAST, and SBOM gates pass.
- [ ] Relevant persistence/error/offline/loading/empty states and security boundaries are tested.
- [ ] Runtime/deployment/build evidence identifies commit SHA, environment, configuration version and artifact hashes.

## Database and environment
- [ ] Migration is uniquely versioned, additive/reversible where required, and safe for existing data.
- [ ] Staging execution is separately authorized and has preflight + postflight evidence.
- [ ] Production was not touched unless a specific production authorization is recorded.
- [ ] Secrets are not committed or exposed in build artifacts.

## Governance
- [ ] EXECUTION_STATE / ACCEPTANCE_REGISTER / DEFECT_REGISTER / RELEASE_REGISTER are reconciled after independent verification.
- [ ] Explicitly list unimplemented work and blockers; do not call implemented work ACCEPTED or COMPLETE.
- [ ] Release is blocked if any P0 or required acceptance gate is open.

## Evidence summary
**Head commit SHA:**
**CI run links:**
**Staging evidence (if authorized):**
**Known limitations / blockers:**
