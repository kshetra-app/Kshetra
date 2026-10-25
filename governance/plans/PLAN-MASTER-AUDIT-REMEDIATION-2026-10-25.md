# PANIN / KSHETRA — MASTER AUDIT REMEDIATION PLAN

**Plan ID:** PLAN-MASTER-AUDIT-REMEDIATION-2026-10-25  
**Baseline repository:** kshetra-app/Kshetra  
**Baseline branch / commit:** master / b51301f5557d8e2f7902d532a8996d6f7ab834ff  
**Source audit:** PANIN_Kshetra_Master_Blueprint_Repository_Audit_2026-10-25.md  
**Plan status:** APPROVED FOR ISOLATED-BRANCH SOURCE REMEDIATION; NOT A PRODUCTION OR DATABASE AUTHORIZATION  
**Implementation boundary:** Branch `cto/full-master-audit-remediation-2026-10-25` only; no direct master writes, no database access, no staging/production deployment or mutation.  
**Acceptance:** Independent review and CI required; this plan does not self-accept any code, data, database, or release state.

## 1. Document Title & Metadata
This plan governs the end-to-end remediation of all 36 findings in the 25 October 2026 Master Blueprint vs Repository Audit: 17 P0 / launch blockers and 19 P1 findings. It replaces the “first seven P0s only” scoping error. The audit's historical observed HEAD was 9f00fbfa34d3d67b07fd5633501269715ee03c40; live connector inspection confirmed the actual planning baseline for this execution is b51301f5557d8e2f7902d532a8996d6f7ab834ff. Never treat a historical baseline as the current one.

## 2. Problem Statement (Task Understanding & Core Objectives)
The repository cannot be claimed production-ready because truth, persistent state, governance, CI, geography data, security and key user workflows have incomplete or misleading evidence. The goal is to eliminate false success, preserve truthful unavailable states, repair verifiable source/configuration defects, and build reproducible evidence for every remaining blocker. “All audited findings considered” is the acceptance scope; scope must not shrink to a subset.

## 3. Current State Analysis (Repository Inspection, Root-Cause Interpretation & Dependency/Blocking Analysis)
Current master inspection confirmed fail-open Prettier/ESLint and SCA/SAST/SBOM steps; non-strict locale parity; no-op mobile build and API/shared lint scripts; EAS main-only trigger and no Git LFS hydration; one-way seed loading guard; demo/in-memory campaign and political-ad paths; placeholder geometry and static seed imports; old W021.5 execution data and migration version collision risks. Existing remediation PRs #23/#24/#14/#16 are open/non-mergeable and based on older base commits, so their patches are evidence only, not merge candidates. The latest execution state authorizes W021.5 Stage B only and explicitly prohibits staging/production access/mutation. Root cause for some findings (especially external-provider E2E, live database state, and real geometry provenance) remains unproven until evidence is available.

## 4. Fact / Inference / Assumption / Unknown Register
- FACT: Live GitHub connector reads master at b51301f5557d8e2f7902d532a8996d6f7ab834ff.
- FACT: All listed audit findings are in the user-provided / saved audit document; 36 unique IDs are in scope.
- FACT: Existing remediation PRs are open, based on old refs and not mergeable.
- FACT: Current project execution control says Stage B only and staging/production air-gapped; no DB activity is authorized here.
- INFERENCE: Source-level defects can be fixed in an isolated branch and tested locally/CI without DB access.
- UNKNOWN: Actual hosted master branch-protection settings at this precise moment, live deployment health, current applied migration versions, full PostGIS/RLS state, artifact sizes from a release AAB/APK, and all external provider account states.
- UNKNOWN: Canonical legal/state geometry datasets for every jurisdiction are not all presently accepted; no substitute data may be promoted to official status merely because an endpoint or mirror serves it.

## 5. Target Architecture & Intended Outcome (Proposed Technical Solution & Alternatives Considered)
Use one isolated remediation branch with a claim-to-evidence matrix; enforce blocking CI; remove deceptive fixtures/fallbacks; make missing/error/offline truth explicit; remove static national geometry from the mobile dependency graph and load only versioned state-scoped data with bounded cache/offline semantics; preserve canonical IDs; require real PostgreSQL integration and external sandbox evidence before workflow acceptance. Alternative—merge existing broad PRs—was rejected because their bases diverged, they are not mergeable, and some include conflicting migration IDs or unsafe workflow permissions. Trade-off: some launch gates remain blocked until authorized external evidence is available; they will not be “fixed” by falsifying status.

## 6. Governing Rules & Constraints (Security, Privacy, Compliance & Data Considerations)
- Follow AGENT_EXECUTION_PROTOCOL.md and Amendment v1.5-A; no self-acceptance.
- No staging/production credentials, connection, query, mutation, deployment, or release under this plan.
- No bypassing WAF, access controls, provider terms, or security boundaries; use alternate official public sources/contact routes, not circumvention.
- Do not mark facts OFFICIAL without source identity, instrument/version, effective date, retrieval date, digest and transformation trail where applicable.
- Preserve UNKNOWN/UNVERIFIED/ESTIMATE/SCENARIO; never convert missing values to canonical zero or empty string where that destroys meaning.
- Do not rename/reorder migrations until applied-history impact is known; avoid adding a second migration with an existing numeric version.
- Protect app secrets: no privileged key may be bundled in mobile/web public variables.
- AI remains optional and nonessential to core workflows; mobile size target must be measured on the built artifact.

## 7. Full Scope of Work (Exact Files & Components Expected to Change)
Scope includes: `.github/workflows/{ci,security,eas-build}.yml`; package scripts and lockfile only if necessary; mobile seed loader/build scripts/manifests, geo manifest/loaders, app config/map caller and adapters; campaign/political-ad/broadcast/constituency/politician route behavior and tests; webhook worker/queue/RPC/dispatcher/OpenAPI and tests; migration validation and migration conflict evidence; env templates and Supabase configuration guards; API/client contract inventory; governance registers/decision/acceptance evidence; launch-checklist/performance reports. New scripts and tests must be committed whenever CI references them. Any additional file requires an explicit plan update recorded before touching it.

## 8. Explicit Out-of-Scope Boundaries (Explicit Non-Change Boundaries)
No edits to production data, staging data, production or staging secrets, live hosted schema, Railway runtime variables, GitHub branch-protection settings, app store settings, public branding/legal ownership, payments/advertising/live media provider accounts, or external user data. No unverified geometry will be repaired by fabricating coordinates or counts. Do not merge to master, release an APK/AAB, or call the product accepted. These require explicit operator authority and separate evidence/approval.

## 9. Step-by-Step Implementation Plan (Detailed Execution Phases & Sequencing)
A. Inventory all 36 IDs and compare them to live source; establish per-finding status and evidence links.  
B. Close source-level CI false-green gates, meaningful build/lint scripts, strict locale validation and branch event coverage.  
C. Correct seed loading/build reproducibility and Git LFS hydration; ensure manifest is derived from the actual database, not asserted from stale values.  
D. Remove deceptive API demo fallbacks and return typed, traceable unavailable/error states.  
E. Refactor geography to state-scoped versioned runtime loading and bounded cache, preserve canonical IDs, fail closed for unsupported/invalid source data.  
F. Inspect and repair webhook worker/queue/RPC transactionality, encryption config, app-scope tenancy, dispatcher settlement and OpenAPI drift against migration 070/current types.  
G. Add whole-repo migration uniqueness gate but do not silently rename an ambiguous version collision; produce an explicit history-aware repair proposal.  
H. Repair governance truth and produce machine-readable full finding closure matrix without inflating completion.  
I. Run unit/negative tests, real disposable PostgreSQL tests where supported, builds and CI; inspect the exact current branch commit and run statuses.  
J. Document blockers requiring independent authority or external evidence; provide separate ready-to-execute admin/staging/operator procedures but do not execute them.  
K. Submit a pull request for independent review; no merge/acceptance claim before required checks and reviewers.

## 10. Verification & Testing Strategy (Test Strategy, Test Integrity Strategy & Assertions)
Run clean install, package typechecks/builds, real formatter/linter, strict 13-locale parity, route unit tests, negative DB/provider configurations, migration filename checks, source-truth manifest checks, mobile Metro export/dependency graph, and seed-manifest integrity. Add tests that fail on synthetic production data, missing config, database error vs valid empty set, state-switch and retry lifecycle, unsupported geometry, and security scan failures. Run disposable PostgreSQL integration for actual migrations/queue semantics without using any Supabase environment. Wait for new branch CI and record run IDs, exact SHA, commands, exit codes, artifacts and hashes.

## 11. Negative-Path Testing Specification (Fail-Closed Validations & Invariant Proofs)
Prove: DB absent/error never returns a synthetic successful business result; empty is distinct from failure; missing critical fact stays UNKNOWN; unsupported region is explicitly unavailable; seed load failure is retryable and state change invalidates prior in-flight response; missing/invalid service-role or webhook encryption keys fail startup/readiness; unauthorized cross-tenant/application webhook operations reject; event and fan-out remain atomic under injected failures; CI fails on lint/locale/security/manifest/migration/evidence errors. Any test using canned fixtures is labeled unit/fixture evidence, not runtime proof.

## 12. Evidence Generation Plan (Evidence & Provenance Strategy)
Each test/build artifact records repository, branch, exact commit SHA, command, tool/version, environment, start/end timestamp, status/exit code, test totals and skips, stdout/stderr path, and SHA-256. Data artifacts carry source URL/publisher, retrieval timestamp, effective date, dataset version, raw-byte digest, parse/transform history, topology results, and acceptance decision. Missing raw upstream bytes are recorded as missing, not hashed from an error page.

## 13. Reconciliation Plan (Coordinate, Register & Document Reconciliation)
Produce a machine-readable audit register and report with all 36 source finding IDs and statuses. Update EXECUTION_STATE.md, ACCEPTANCE_REGISTER.md, DEFECT_REGISTER.md, DECISION_LOG.md and RELEASE_REGISTER.md only with factual source/CI evidence and without rewriting historical authorization. Keep W021.5 external gate weights and formal acceptance separate from the audit remediation status. A CI validation checks every P0 has a closure criterion and no finding is labelled closed without evidence.

## 14. Independent Verification Specification (Third-Party Audit Standards & Replicability)
A verifier not responsible for the patch reruns tests from a clean clone, checks resulting artifacts and hashes, compares claims to repository state, checks all PR checks, validates migration-history assumptions, and reviews source/provenance for official classifications. The implementing agent cannot mark final acceptance; status is READY_FOR_INDEPENDENT_VERIFICATION at most.

## 15. Risks, Failure Modes & Mitigations (Risk, Assumption & Failure Mode Analysis)
Main risks: (1) porting stale PR changes introduces regressions; mitigate by applying hunks to live-baseline files and testing; (2) CI gets green via fixtures/no-op scripts; mitigate by negative tests and artifact assertions; (3) changing migration names may replay or omit DB changes; do not modify IDs without applied-history evidence; (4) geography providers disagree or serve malformed geometry; do not select a winner without legal/source adjudication; (5) removing fallbacks exposes broken UI; represent honest empty/unavailable UI instead of fabricated success; (6) secret or runtime environment may be missing; fail readiness closed; (7) test environment differs from staging/prod; retain external verification as NOT VERIFIED; (8) security scans may fail due actual findings; triage, do not suppress.

## 16. Rollback & Recovery Strategy (File-Scoped Rollback & Recovery Considerations)
All changes occur on a new branch. Rollback uses revert commits on that branch or closes the PR; never force-push master. Source changes are isolated and schema/environment are untouched. Migration-related changes are lint/report-only until migration history can be verified under authorization. If any clean-build/test artifact proves regression, revert the smallest file-scoped patch, rerun tests and update the finding ledger.

## 17. Impact Assessment (Downstream Impact & System Boundary Evaluation)
Expected impact spans citizen map and civic features, campaign and political ads, API/data clients, SaaS webhook dispatch, CI/release, privacy and future production acceptance. Changes must preserve canonical IDs, route/API envelope contracts except explicit unavailable semantics, schema compatibility, audit/event semantics, mobile accessibility/loading states and performance targets. Breaking or unverified transitions remain behind explicit unavailable gates.

## 18. Acceptance Criteria (Claim-Based Binary Verifiable Criteria)
- All 36 finding IDs exist in one audit matrix; no silent scope reduction.
- All P0s are either closed with direct reproducible evidence or explicitly OPEN/BLOCKED/NOT VERIFIED with owner and evidence needed; none is mislabeled resolved.
- Required CI and security gates are blocking and execute on master.
- All scripts referenced by CI exist and produce deterministic nonzero failure on invalid conditions.
- No deceptive demo/in-memory fallback is returned by production routes modified under this plan.
- Mobile map no longer statically imports all national AC geometry; versioned state-scoped runtime contract and bounded offline/cache states are tested.
- Seed data/manifest validation is based on a real built DB and clean checkout.
- Webhook lifecycle has real queue row mapping/atomic enqueue/worker dispatch tests if the relevant code confirms the defects.
- Migration duplicate is resolved only when compatible with actual applied history; otherwise blocking documented as unresolved.
- Branch protection, live DB state, live health, real AAB/APK size/performance, privacy/account deletion and provider sandbox workflows remain NOT VERIFIED unless authoritative external evidence is available.
- No staging/production calls or mutations occur.
- Independent verification and merge/acceptance remain pending.

## 19. Artifact & Commit Lineage Map (Commit Lineage, Hashes & Evidence Provenance)
Base: b51301f5557d8e2f7902d532a8996d6f7ab834ff (live master read at task start). Plan lives at `governance/plans/PLAN-MASTER-AUDIT-REMEDIATION-2026-10-25.md`. The complete audit source is the saved 25 October 2026 report. Subsequent implementation commits must be descendants of this plan commit on the isolated branch; each evidence manifest must name its exact source commit. No claim relies on the historical audit HEAD alone.

## 20. Amendment Compliance Matrix (Clause-by-Clause Governance Verification)
- v1.5-A Sections 1–14: current-source inspection, root cause, alternative, bounded file scope, plan drift/review, predictive negative testing and evidence-integrity obligations are applied in sections 3–18.
- v1.5-A Section 26: all 22 canonical sections are present in this document.
- v1.5-A Section 27: this is the plan for branch-scoped remediation. Approval is limited to source changes requested by the user; it does not grant external environment or branch-protection write access.
- Rule IV-001: independent acceptance is not self-granted. Status will not be upgraded based on code presence alone.
- Current Directive 154: W021.5 Stage B only; database and production remain air-gapped.

## 21. Operational Declarations (Pre-Implementation Declarations per Section 27)
PLAN STATUS: APPROVED FOR ISOLATED-BRANCH SOURCE REMEDIATION ONLY  
APPROVED PLAN VERSION: PLAN-MASTER-AUDIT-REMEDIATION-2026-10-25 rev 1  
PLAN APPROVAL EVIDENCE: explicit user request in this conversation to resolve all issues in the full 2026-10-25 audit; current CTO remit recorded in project continuity context; branch-scoped execution constraint recorded in section 6/8.  
IMPLEMENTATION MAY BEGIN: YES — only within the explicit source-code boundary in sections 6–8. Staging/production/database mutations and administrative branch protection changes remain NOT AUTHORIZED here.

## 22. Plan Sign-Off & Review Request (Questions/Decisions Requiring Review & Plan-Approval State)
Plan review performed against the live repository baseline and full audit. Decision: proceed with isolated source remediation in priority/dependency order; do not merge or self-accept. Independent reviewer must verify all changed files and tests. Items requiring separate authority are enumerated as open external gates in the closure register, not hidden as “done.”
