# DECISION LOG: PANIN / KSHETRA
**Last Updated:** 2026-09-08
**Standard:** AI Agent Master Execution Job Book (Section 0.9, 0.10, Part 12)

---

### DEC-001: Adoption of Master Blueprint and Sequential Job Book as Sole Source of Truth
- **Date:** 2026-09-08
- **Context:** Project requires unified direction transitioning from Kshetra exploratory phase to finished PANIN production platform.
- **Decision:** Officially adopt `Kshetra - PANIN — Master Product, Technology, Data, Growth and 100% Execution Blueprint.md` as product constitution and `PANIN - Kshetra — AI Agent Master Execution Document and Sequential Job Book.md` as operational execution manual.
- **Rationale:** Prevents build sprawl, eliminates "90% complete forever" trap, and anchors all platform layers to the Political Geography Graph moat.
- **Consequences:** All work must proceed through sequential jobs (W000–W100) with evidence-backed acceptance criteria.

---

### DEC-002: Modular Monolith API Architecture (Railway Fastify + Supabase Persistence)
- **Date:** 2026-09-08
- **Context:** Mobile app currently exhibits dual-path architecture (direct Supabase JS vs Fastify API).
- **Decision:** Fastify on Railway serves as the canonical application/API layer (business logic, validation, rate limiting, external orchestration). Supabase serves as canonical persistence (PostgreSQL, PostGIS, Auth, Storage, RLS).
- **Rationale:** Direct client writes to database bypass server-side auditing, rate limiting, and business validation. Modular monolith in Fastify keeps deployment simple and fast without microservice overhead.
- **Consequences:** All sensitive client writes must transition to `/api/v1/...` Fastify endpoints via a phased strangler pattern.

---

### DEC-003: Separation of Creator Broadcasting from Consumer Mobile Client
- **Date:** 2026-09-08
- **Context:** `react-native-webrtc` is bundled in `apps/mobile`, threatening the ≤ 25–30 MB consumer binary target.
- **Decision:** Decouple native broadcaster infrastructure from the consumer mobile app. Heavy stream ingestion/broadcasting tools belong on web (`apps/web-receiver` / Studio) or dedicated companion builds. Consumer app consumes HLS/video feeds.
- **Rationale:** Indian mobile users on budget Android devices cannot tolerate 50MB+ download packages for creator features 99% of them will never use.

---

### DEC-004: Brand Transition Governance (Internal Stability until Legal Brand Lock)
- **Date:** 2026-09-08
- **Context:** Blueprint specifies brand evolution towards "PANIN" while repository uses `Kshetra`.
- **Decision:** Retain existing internal technical identifiers (`kshetra-api`, `in.kshetra.app`, internal DB namespaces) until legal trademark and app-store clearances are complete. Introduce PANIN as a user-facing brand presentation without breaking git/database lineage.
- **Rationale:** Avoids destructive churn and breaking database migrations during active stabilization.

---

### DEC-005: Binding 100% i18n Localization Mandate (All 13 Languages)
- **Date:** 2026-09-08
- **Context:** User mandate requires every single screen, component, dialog, error state, and data label to be 100% i18n compliant across all 13 supported languages.
- **Decision:** All 13 languages (`en`, `te`, `hi`, `ta`, `kn`, `ml`, `mr`, `bn`, `gu`, `or`, `pa`, `as`, `ne`) must achieve 100% string parity with zero missing keys. Hardcoded user-facing strings are strictly prohibited.
- **Rationale:** PANIN is a Pan-Indian platform. Linguistic completeness is a core trust and retention pillar, not an afterthought. Non-English users must never encounter raw English fallback strings or layout clipping.
- **Consequences:** All future feature implementations and bug fixes must include translation keys for all 13 locales before marking a job `ACCEPTED`. Automated AST lint checks will reject unlocalized JSX text.

---

### DEC-006: Adoption of Master Execution Framework Amendment v1.2 (Compliance/DPDP & Independent Verification)
- **Date:** 2026-09-08
- **Authority:** Master Execution Framework Amendment v1.2 (`AMENDMENT_v1.2.md`)
- **Context:** Transitioning to high-stakes political/geographic platform requires technically enforceable DPDP/privacy-by-design compliance and an independent verification regime to eliminate self-certification bias.
- **Decision:** Formally adopt Amendment v1.2 as part of the permanent PANIN/Kshetra execution constitution. All future jobs, phases, features, releases, and production deployments are strictly bound by its requirements.
- **Rationale:** Compliance and verification cannot be afterthought patches added at launch; they must be embedded in architectural governance.
- **Consequences:** Launch Gates (A and B) and critical milestones require independent verification reports; all personal data touching features require compliance-by-design evidence.

---

### DEC-007: Permanent Independent Verification Rule IV-001 (Implementing Agent ≠ Final Acceptance Authority)
- **Date:** 2026-09-08
- **Authority:** Amendment v1.2, Part 3 & 4
- **Context:** An AI agent or engineer implementing a feature has structural bias when judging whether the implementation is accepted.
- **Decision:** The agent or engineer that implements a task may build, test, produce evidence, and recommend acceptance, but may NOT be the sole authority that declares `ACCEPTED` for any Launch Gate or designated critical milestone.
- **Rationale:** Prevents hallucinated or superficial self-acceptance; guarantees rigorous verification by an independent verifier (clean independent AI session, separate audit workflow, or human reviewer).
- **Consequences:** Launch Gate A, Launch Gate B, and critical milestones require formal `INDEPENDENT_VERIFICATION_REPORT.md` before transitioning to `ACCEPTED`.

---

### DEC-008: Insertion of Job W051.5 — Compliance, DPDP & Data Governance Readiness
- **Date:** 2026-09-08
- **Authority:** Amendment v1.2, Part 2
- **Context:** Platform expansion into professional accounts, aspirants, media, campaigns, ads, and SaaS requires a hardened data governance foundation.
- **Decision:** Insert Job W051.5 between W051 (API Customer Acquisition) and W052 (Professional Broadcast Architecture). Existing job numbers are preserved.
- **Rationale:** Prevents expanding external and commercial surfaces without an audited personal data inventory, purpose limitation, retention/deletion matrix, and DPDP/MeitY compliance baseline.
- **Consequences:** Accountable owner is COMPLIANCE; delivery owners COMPLIANCE+ARCH+BE+MOB+SEC+DATA+DEVOPS; acceptance authority SEC+QA+COMPLIANCE (with Human/Legal Review Required for legal interpretation).

---

### DEC-009: 6-Stage Acceptance Status Lifecycle
- **Date:** 2026-09-08
- **Authority:** Amendment v1.2, Part 15
- **Context:** Binary "COMPLETE" status obscures intermediate verification and production deployment states.
- **Decision:** Adopt standard 6-stage lifecycle: `IMPLEMENTED` (code exists) -> `TESTED` (automated/local tests pass) -> `VERIFIED` (evidence independently reproduced) -> `PRODUCTION` (deployed) -> `ACCEPTED` (acceptance authority approves) -> `COMPLETE` (production monitored with zero blocking defects). Skipping directly from `IMPLEMENTED` to `COMPLETE` is strictly prohibited.
- **Rationale:** Enforces transparency and ensures unverified or undeployed code is never marked complete.

---

### DEC-010: Evidence Freshness & Remote Reproducibility Governance
- **Date:** 2026-09-08
- **Authority:** Amendment v1.2, Part 7 & 8
- **Context:** Evidence retained only in ephemeral or local scratch directories cannot be independently reproduced or verified by third parties.
- **Decision:** All verification evidence must be stored in the repository (`reports/`), committed to git, and pushed to remote. Every evidence artifact must carry metadata: repository, branch, commit SHA, database version, API version, mobile version, timestamp, and environment. Any subsequent code change immediately invalidates existing evidence, requiring fresh regeneration.
- **Rationale:** Ensures remote auditability and eliminates "works on my machine / exists only in local workspace" acceptance claims.

---

### DEC-011: Defect Classification Protocol & Truth-in-Engineering Governance (W001-R6)
- **Date:** 2026-09-08
- **Authority:** Master Execution Framework Amendment v1.2 & W001-R6 Mandate
- **Context:** Defects DEF-009, DEF-010, DEF-011, and DEF-012 required unambiguous, uncompromised classification separating defensive code behavior from actual production capability.
- **Decision:**
  1. **DEF-009 (Service-Role Auth):** Retain status as `OPEN (HUMAN ACTION REQUIRED)`. The defensive JWT validation and anon-key fallback prevent process crashes, but do NOT constitute restoration of privileged admin access. Full resolution requires live extraction and configuration of the production secret.
  2. **DEF-010 (CORS):** Classify as `RESOLVED IN CODE / PENDING DEPLOYMENT`. The committed code in `apps/api/src/server.ts` with `DEFAULT_ALLOWED_ORIGINS` passes 100% of inject tests for `kshetra.in`, `www.kshetra.in`, `panin.in`, and `www.panin.in`, but live Railway container remains on earlier deployment pending container refresh.
  3. **DEF-011 (Civic Schema):** Classify as `CLOSED (INVALID DEFECT)`. PostgREST returns 200 OK for `public.civic_issues`. Schema inspection confirms `004_civic_dashboard.sql` deliberately models categories as a CHECK constraint enum. No table `issue_categories` exists by design in DB or client code.
  4. **DEF-012 (13-Language Parity):** Retain status as `OPEN`. Canonical validator (`scripts/verify-13-locales.mjs --strict`) requires 100% key parity with zero missing keys and exits non-zero. No artificial 90% leniency threshold is permitted.
- **Rationale:** Prevents deceptive defect closure and guarantees absolute truth in engineering status.

---

### DEC-012: Audit Method, Parser Rigor & Semantic State Governance (W000-REC2)
- **Date:** 2026-09-08
- **Authority:** Master Execution Framework Amendment v1.2 (Rule IV-001, Parts 7 & 8)
- **Context:** Automated audit regex parsers must be algorithmically robust against SQL syntax variations (e.g. `IF NOT EXISTS` clauses on views). Furthermore, static source code counts must never be conflated with live production catalog objects.
- **Decision:**
  1. **Parser Robustness:** DDL parsers must handle all valid syntax clauses (e.g. `CREATE [OR REPLACE] [MATERIALIZED] VIEW [IF NOT EXISTS]`) and must include automated regression tests preventing false-positive object creation (e.g. object `"IF"`).
  2. **Semantic Boundary:** Distinctly separate repository-defined source inventories from live production database catalog objects. Unverified live catalog states must be explicitly designated as `HUMAN ACTION REQUIRED` or `PENDING_PRIVILEGED_CATALOG_ACCESS`.
  3. **Static Route Registration Semantics:** The 109 API endpoint count represents `STATIC HTTP ROUTE REGISTRATIONS` in Fastify source code, not live production endpoint availability.
  4. **Commit Lineage Transparency:** Registers must explicitly record `AUDITED_CODE_COMMIT`, `EVIDENCE_COMMIT`, and `ACCEPTANCE_COMMIT` to prevent ambiguous commit tracking.
- **Rationale:** Enforces absolute mathematical precision and eliminates semantic ambiguity across platform audit ledgers.

---

### DEC-013: Governance Coordinate Normalization & Lineage Differentiation (W002-P0)
- **Date:** 2026-09-09
- **Authority:** Master Execution Framework Amendment v1.2 (Rule IV-001, Parts 7 & 8)
- **Context:** Transitioning to W002 requires exact alignment of current remote Git HEAD with continuity registers without corrupting historical audit commit references.
- **Decision:**
  1. **Four-Point Commit Lineage:** Explicitly maintain `CURRENT_REMOTE_HEAD` (actual Git HEAD), `AUDITED_CODE_COMMIT` (commit containing verified code changes), `EVIDENCE_COMMIT` (commit containing generated test/audit evidence), and `ACCEPTANCE_COMMIT` (commit containing the independent verification verdict and register updates).
  2. **Historical Integrity:** Do not overwrite or alter historical commit references for past completed jobs (`fad6025`, `77fb553`, `7e39635`, `5f7c8a5`).
  3. **Source vs Live Catalog Clarity:** Reaffirm across all registers that 36 = migration files in repo, 148 = source-defined tables, 23 = source-defined views, 46 = source-defined functions, 61 = source-defined triggers, and 109 = static HTTP registrations, none of which represent unverified live production catalog counts.
- **Rationale:** Ensures complete continuity hygiene, eliminates ambiguous HEAD tracking, and preserves immutable audit trails.

---

### DEC-014: Adoption of Master Execution Framework Amendment v1.3 & Agent Execution Protocol
- **Date:** 2026-09-09
- **Authority:** Master Execution Framework Amendment v1.3 (`AMENDMENT_v1.3.md`)
- **Context:** Minimizing execution/verification roundtrips and eliminating recurring failure classes requires moving verification left into an autonomous closed-loop self-audit process.
- **Decision:**
  1. **Mandatory Operating Constitution:** Formally adopt `AMENDMENT_v1.3.md` and establish `AGENT_EXECUTION_PROTOCOL.md` as mandatory pre-flight reading for all agent operations across the platform.
  2. **Pre-Flight Inspection & Reading Order:** Enforce strict 9-step document reading order and pre-flight metadata extraction prior to any code edits.
  3. **15-Stage Closed Loop:** Implementing agents must execute full Read -> Understand -> Inspect -> Plan -> Implement -> Test -> Adversarial Self-Audit -> Repair -> Retest -> Evidence Reconciliation -> Commit -> Remote Verification -> Acceptance Preparation -> Independent Verification lifecycle. Premature reporting of COMPLETE or ACCEPTED without self-audit is strictly prohibited.
  4. **Self-Healing & Defect Tiers:** Directly related discovered defects must be self-healed within the same job (Tier 1 & Tier 2) rather than spawning fragmented follow-up micro-jobs. Unrelated issues are logged as Tier 3 in `DEFECT_REGISTER.md`.
  5. **Independent Verification Preservation:** Rule IV-001 independent verification remains mandatory at critical gates and milestones, but verifiers operate on remote Git commits using risk-based inspection rather than blindly re-running entire implementation jobs.
- **Rationale:** Dramatically increases implementation precision, eliminates premature success reports, hardens negative-path testing, and eliminates recurring failure classes.

---

### DEC-015: Staging Cloud Provisioning & Empirical Runtime Isolation (W002-R2)
- **Date:** 2026-09-09
- **Authority:** Master Execution Framework Amendment v1.2 (Rule IV-001) & Amendment v1.3
- **Context:** Environment separation cannot be certified via configuration files alone; real staging infrastructure and live cross-environment isolation must be empirically verified.
- **Decision:**
  1. **Dedicated Staging Infrastructure Coordinates:** Bind Staging to Railway Fastify service `kshetra-api-staging` (`https://kshetra-api-staging.up.railway.app`) and dedicated Supabase project `fkpigozcqnmcvofuksar` (`https://fkpigozcqnmcvofuksar.supabase.co`).
  2. **EAS Build Profiles & Env Precedence:** Map EAS `preview` profile strictly to `staging` in `packages/shared/src/config/environments.ts`. Harmonize mobile resolution precedence in `apps/mobile/lib/environment.ts` and `apps/mobile/eas.json` as `EXPO_PUBLIC_APP_ENV ?? APP_ENV ?? NODE_ENV ?? 'development'`.
  3. **CORS Hardening:** Completely eliminate `localhost:8081` from production allowed origins in `apps/api/src/server.ts`.
  4. **Empirical Runtime Isolation (Tests A-I):** Require live cross-environment isolation verification including sentinel write (`STAGING_SENTINEL_W002`), cross-project credential rejection (HTTP 401), and auth JWT signature invalidation (HTTP 401/403).
  5. **Unblocking W003:** With live staging confirmed operational and independently certified by Independent Verifier in `reports/w002_r2_independent_verification.md`, formally accept JOB W002 and unblock JOB W003 (CI/CD Quality Pipeline).
- **Rationale:** Prevents accidental cross-environment data contamination, protects production integrity, and establishes true multi-stage cloud readiness.

---

### DEC-016: Adoption of Master Execution Framework Amendment v1.4 (Evidence Semantics, Runtime Proof and Carry-Forward Controls)
- **Date:** 2026-09-09
- **Authority:** Master Execution Framework Amendment v1.4 (`AMENDMENT_v1.4.md`)
- **Context:** Incorporating engineering lessons from W000–W002 to eliminate false-positive verifications, align test names strictly with test executions (Rule SI-001/002/003), distinguish static/runtime/production evidence classes, mandate application-level isolation proofs, and establish intelligent carry-forward exception controls.
- **Decision:**
  **AMENDMENT_v1.4 = OPERATIONAL GOVERNANCE AUTHORITY** for all current and future jobs across PANIN / Kshetra.
  1. **Test Semantic Integrity (SI-001 - SI-003):** Prohibit using liveness/process health endpoints (e.g. `/health`) as proof of database or downstream connectivity. Inspect implementation before asserting behavior.
  2. **Evidence Taxonomy & Freshness:** Explicitly categorize all evidence into `SOURCE`, `CONFIGURATION`, `BUILD`, `LOCAL RUNTIME`, `STAGING RUNTIME`, `PRODUCTION RUNTIME`, `LIVE DATABASE`, or `EXTERNAL PROVIDER`. Invalidate evidence if implementation changes.
  3. **Object & Inventory Precision:** Distinguish repository migration files from applied environment migrations; distinguish source-defined tables/views/functions/triggers from PostgreSQL live catalog entities; distinguish static route registrations from deployed runtime endpoints; distinguish Expo route source files from registered screens.
  4. **Carry-Forward Controls (Parts 16 & 31):** Maintain known W002 exceptions (real DB-backed API operations, CI/CD migration drift detection, application vs database isolation) as forward implementation mandates for W003 without reopening closed jobs.
  5. **Permanent Operating Loop (Part 36):** Adopt the permanent closed-loop lifecycle: Read -> Pre-Flight -> Inspect -> Implement -> Test -> Semantic Self-Audit -> Negative-Path Test -> Repair -> Retest -> Evidence Reconciliation -> Remote Verification -> Ready for Independent Verification -> Independent Verification -> Accept -> Next Job.
  6. **Governing Principle:** Do not optimize for green reports; optimize for true reports.
- **Rationale:** Eliminates recurring failure classes, ensures evidence cannot be faked or misinterpreted, and guides autonomous agent execution toward ground-truth engineering rigor.

---

### DEC-017: Implementation and Hardening of W003 CI/CD Quality Pipeline
- **Date:** 2026-09-09
- **Authority:** Master Execution Framework Amendment v1.4 (Parts 33 & 34) & `AGENT_EXECUTION_PROTOCOL.md`
- **Context:** Delivering W003 requires continuous automated verification across all branches (specifically including `master`), detecting migration and API contract drift, verifying evidence and commit register integrity, and decoupling health liveness from database readiness.
- **Decision:**
  1. **Branch Modernization in GitHub Actions:** Update `.github/workflows/ci.yml` triggers to explicitly include `[master, main, develop]` so that PRs and merges to canonical branch `master` are continuously guarded.
  2. **Migration Drift Automation (Part 8):** Implement `scripts/check-migration-drift.mjs` to compare repository migration files (36 files) against applied database catalogs (Staging: 35 applied) and emit structured drift reports (`reports/w003_migration_drift_report.json`).
  3. **Repository & Evidence Integrity Automation (Part 34):** Implement `scripts/check-repo-evidence-integrity.mjs` to verify working tree status and validate that all referenced commit SHAs across `ACCEPTANCE_REGISTER.md` and `EXECUTION_STATE.md` exist in local Git history. Emits `reports/w003_evidence_integrity_report.json`.
  4. **API Contract Drift Automation (Part 34E):** Implement `scripts/check-api-contract-drift.mjs` to scan route definitions directly and audit client-facing contracts (100% parity achieved across 9/9 client expectations). Emits `reports/w003_api_contract_drift_report.json`.
  5. **Defined Health Endpoint Semantics (Part 18):** Upgrade `apps/api/src/routes/health.ts` to distinguish `GET /api/health` (process liveness) from `GET /api/health/db` (real Supabase PostgreSQL readiness roundtrip). Update `apps/api/src/__tests__/health.test.ts` to enforce semantic assertions.
  6. **Carry-Forward Non-Blocking Exception Controls:** Retain DEF-012 (13-language parity gap) as a monitored, non-blocking check in CI via `scripts/verify-13-locales.mjs`, while preserving strict requirements for release gates.
- **Rationale:** Fulfills all Part 34 mandates, prevents unnoticed drift, and provides continuous quality enforcement for the platform.

---

### DEC-018: W003-R1–R4 REMEDIATION, SHA INTEGRITY HARDENING, STATIC MIGRATION SNAPSHOT & SUPABASE AUTH
- **Date:** 2026-09-09
- **Status:** APPROVED & APPLIED
- **Context:** Following external audit of JOB W003 evidence, two false claims in the independent verification report (phantom commit `fad6025` and fabricated i18n numbers/languages) and two semantic integrity gaps (migration drift presented as automated without live DB access, and Supabase key format rejection) were identified.
- **Decisions:**
  1. **Phantom Commit Resolution (W003-R1):** Replaced dangling unpushed reflog commit `fad6025` with real ancestor commit `e0b67b9` in `ACCEPTANCE_REGISTER.md`. Hardened `scripts/check-repo-evidence-integrity.mjs` to check `git cat-file -e "${sha}^{commit}"` and `git merge-base --is-ancestor "${sha}" HEAD`.
  2. **i18n Literal Output & Language Disambiguation (W003-R2):** Verified that canonical languages are strictly `[en, te, hi, ta, kn, ml, mr, bn, gu, or, pa, as, ne]`. Eliminated any reference to non-canonical languages (e.g. Urdu). Bound report to literal raw output of `scripts/verify-13-locales.mjs` (2,041 keys, 8 languages at ~56% coverage, up to 904 missing keys).
  3. **Migration Drift Relabeling (W003-R3 Option B):** Decoupled static snapshot inspection from CI. Renamed to `scripts/audit-migration-snapshot.mjs` and generated `reports/w003_migration_snapshot_report.json` explicitly identifying it as a static snapshot verified during W002-R2 on 2026-09-09. Removed step from `.github/workflows/ci.yml`.
  4. **Supabase Key Validation Fix (DEF-009):** Updated `apps/api/src/lib/supabase.ts` to accept both legacy 3-part JWTs and modern `sb_secret_...` / `sb_publishable_...` format. Removed `NODE_ENV !== 'production'` gate so fallback warnings emit in all environments. Added unit tests in `apps/api/src/__tests__/supabase-auth.test.ts` (7/7 pass).
- **Rationale:** Eliminates all false claims, enforces literal command output evidence, protects production credentials, and ensures strict adherence to Amendment v1.4 Rules SI-001–003.

---

### DEC-019: W003-R5 EVIDENCE INTEGRITY ENFORCEMENT, FRESHNESS REBINDING & DECLARED CONTRACT SCOPE
- **Date:** 2026-09-09
- **Status:** APPROVED & APPLIED
- **Context:** External review of W003 remediation identified: (1) `scripts/check-repo-evidence-integrity.mjs` printed DIRTY but did not fail with exit code 1; (2) `reports/w003_independent_verification.md` cited raw output bound to an older commit HEAD (`efd1b87`); (3) API contract check required accurate scope labelling as declared contract check.
- **Decisions:**
  1. **Strict Dirty-Tree Rejection:** Modified `scripts/check-repo-evidence-integrity.mjs` to fail (`exit 1`) with `[FAIL] Working tree is dirty; evidence integrity verification cannot pass.` unless both working tree is clean and 0 missing commits. Added regression suite `tests/repo-evidence-integrity.test.mjs`.
  2. **Deterministic Freshness & Lineage Validator:** Created `tests/commit-freshness.test.mjs` validating the 4-coordinate commit model (`CURRENT_REMOTE_HEAD`, `AUDITED_CODE_COMMIT`, `EVIDENCE_COMMIT`, `ACCEPTANCE_COMMIT`) against live git ancestry.
  3. **Declared API Contract Drift Check Scope:** Updated `scripts/check-api-contract-drift.mjs` to explicitly state its scope is 9 declared client contract expectations, formally deferring full dynamic AST-based caller discovery to W006/W007/W008.
  4. **Strict Regeneration Sequence:** Committed all code changes, pushed to canonical remote, verified clean working tree, and executed all verification suites against the exact final commit HEAD.
- **Rationale:** Ensures total mathematical truth between committed code, git ancestry, and reported evidence, preventing stale or phantom claims.

---

### DEC-020: OBSERVABILITY, STRUCTURED LOGGING, CORRELATION IDS & CONTROLLED ERROR GENERATION ARCHITECTURE (JOB W004)
- **Date:** 2026-09-10
- **Status:** APPROVED & APPLIED
- **Context:** Transitioning to production requires unified telemetry, request tracing across distributed boundaries, latency monitoring, database failure diagnostics, and zero-leak error handling.
- **Decisions:**
  1. **Structured JSON Logging:** Fastify uses Pino logger in JSON mode in production/staging with standard fields (`level`, `time`, `reqId`, `url`, `method`, `statusCode`, `responseTime`, `service`).
  2. **Request ID Propagation:** Auto-generate UUID-based or `req-<counter>` identifiers, accept caller-provided `x-request-id` header for distributed tracing, and echo `x-request-id` in every HTTP response.
  3. **High-Resolution Latency Tracking:** Compute millisecond execution times with sub-millisecond precision via `process.hrtime.bigint()`, inject `x-response-time` header, and record percentiles in an in-memory metrics collector.
  4. **Metrics Summary Endpoint (`GET /api/metrics`):** Expose process uptime, memory metrics, request counts, HTTP status code distribution (2xx, 4xx, 5xx), and average latency for monitoring.
  5. **Centralized Error Envelope & Sanitization:** Global Fastify error handler structures 5xx and 4xx responses as `{ error, message, statusCode, requestId, timestamp }`, never leaking raw stack traces in production.
  6. **Controlled Error Generation Route (`GET /api/debug/error`):** Provide a deterministic test seam for synthetic errors to prove alerting, log capture, and status code propagation without crashing the process.
  7. **Mobile Telemetry Seam (`apps/mobile/lib/telemetry.ts`):** Lightweight client logger attaching `x-request-id` to outgoing API calls and capturing breadcrumbs with zero additional native dependencies.
---

### DEC-021: PRODUCTION OBSERVABILITY HARDENING, ACCESS CONTROL & ERROR ROUTING (JOB W004-R1)
- **Date:** 2026-09-10
- **Status:** APPROVED & APPLIED
- **Context:** External audit of initial W004 implementation identified production hardening gaps: public exposure of synthetic error triggers, unauthenticated metrics exposure, lack of error categorization, unhardened incoming request-ID handling, and un-wired mobile client telemetry.
- **Decisions:**
  1. **Production Debug-Route Protection:** In production, `GET /api/debug/error` is disabled (returns 404 Not Found) unless authenticated via privileged bypass secret header `x-debug-bypass-secret` matching `DEBUG_BYPASS_SECRET` (length ≥ 16). Enabled in dev, test, and staging.
  2. **Production Metrics Authentication:** In production, `GET /api/metrics` is protected by bearer token (`Authorization: Bearer <token>`) or `x-metrics-token` matching `METRICS_AUTH_TOKEN` or `SUPABASE_SERVICE_ROLE_KEY`. Returns 401 Unauthorized for public/unauthenticated requests. Remains open in dev/test for local verification.
  3. **Canonical Error Classification & External Sink Seam:** Created `apps/api/src/lib/errorTracker.ts` defining 8 canonical error categories (`CLIENT_VALIDATION`, `AUTHENTICATION`, `AUTHORIZATION`, `RATE_LIMIT`, `NOT_FOUND`, `DATABASE_FAILURE`, `UPSTREAM_PROVIDER`, `UNHANDLED_SERVER_ERROR`). Maps errors to structured `APPLICATION_ERROR_EVENT` logs and optional `@sentry/node` capture. Enforces that monitoring failures never disrupt API request handling.
  4. **Request-ID Validation Hardening:** Enforced length ceiling (≤ 128 characters) and safe identifier regex (`^[a-zA-Z0-9_\-]+$`) on incoming `x-request-id` / `x-correlation-id` headers. Whitespace is trimmed, and invalid/oversized values fall back safely to `randomUUID()`. Set `requestIdHeader: false` in Fastify options so all ID extraction is strictly governed by `genReqId`.
  5. **Mobile Telemetry Integration:** Classified `apps/mobile/lib/telemetry.ts` as a bounded client seam with zero native overhead. Wired `telemetry.getTracingHeaders()` into mobile HTTP client calls (`pageService.ts`, `featureFlags.ts`, `supabaseDataService.ts`).
  6. **Database Failure Telemetry:** Integrated `errorTracker.captureError` into `/api/health/db` failure and catch branches, explicitly tagging database timeouts/errors as `DATABASE_FAILURE` with 503 HTTP status.
- **Rationale:** Hardens API against information disclosure and synthetic denial-of-service, provides zero-cost cloud error tracking, and ensures reliable end-to-end request correlation.

---

### DEC-022: METRICS CREDENTIAL SEPARATION & EVIDENCE COORDINATE REBINDING (JOB W004-R1A)
- **Date:** 2026-09-10
- **Status:** APPROVED & APPLIED
- **Context:** Independent review of W004-R1 identified (a) unnecessary coupling between metrics access and Supabase service-role credential, and (b) evidence-lineage inconsistency where the independent verification report recorded `b052106` as CURRENT_REMOTE_HEAD while the report itself was committed at `66993cd`.
- **Decisions:**
  1. **Metrics Credential Separation:** Production `/api/metrics` now exclusively uses `METRICS_AUTH_TOKEN` as the dedicated monitoring credential. `SUPABASE_SERVICE_ROLE_KEY` is no longer accepted as a fallback. If `METRICS_AUTH_TOKEN` is absent, production metrics access fails closed (401). This prevents a single leaked credential from compromising both database and monitoring surfaces.
  2. **Four-Coordinate Commit Model:** Governance metadata maintains four separate, non-collapsible fields: `CURRENT_REMOTE_HEAD` (actual remote master HEAD), `AUDITED_CODE_COMMIT` (exact commit independently audited), `EVIDENCE_COMMIT` (commit containing evidence package), `ACCEPTANCE_COMMIT` (final acceptance-state commit).
  3. **Commit-Freshness Validator Hardening:** `tests/commit-freshness.test.mjs` now enforces strict equality `CURRENT_REMOTE_HEAD == actual origin/master HEAD` (fails on mismatch), verifies `AUDITED_CODE_COMMIT` is an ancestor of `CURRENT_REMOTE_HEAD`, and validates `EVIDENCE_COMMIT` and `ACCEPTANCE_COMMIT` resolve in git history when not "pending".
  4. **Evidence Freshness Rule:** Evidence generation is deferred until after code changes are complete, tests pass, and the final commit is pushed. Evidence must reference the actual final state. No code modification permitted after evidence generation without re-generation.
- **Rationale:** Enforces principle of least privilege for monitoring credentials, ensures governance metadata truthfully represents the repository timeline, and prevents stale evidence from passing validation.

---

### DEC-023: W004 FINAL ACCEPTANCE, PERMANENT EVIDENCE COORDINATE MODEL & W005 UNBLOCKING
- **Date:** 2026-09-11
- **Status:** APPROVED & ACCEPTED BY USER
- **Context:** JOB W004-R1A completed independent verification with a PASS verdict across all 13 verification gates at commit `811b5dd`. The user formally accepted W004-R1A and authorized finalizing W004 with no further remediation cycles.
- **Decisions:**
  1. **Final W004 Acceptance:** W004 (Observability & Error Tracking) is declared fully ACCEPTED. All observability capabilities (structured Pino logging, request ID propagation, error classification, production access control, mobile telemetry wiring, DB failure telemetry) are operational and independently audited.
  2. **Permanent Four-Coordinate Lineage Model:** To eliminate self-referential git commit loops, the coordinate terminology is permanently established as:
     - `VERIFIED_REMOTE_HEAD`: Exact remote HEAD against which verification evidence was executed (`1260f98`).
     - `AUDITED_CODE_COMMIT`: Exact implementation commit audited (`ef4622a`).
     - `EVIDENCE_COMMIT`: Commit containing evidence artifacts (`19a5932`).
     - `ACCEPTANCE_COMMIT`: Commit containing final acceptance state (`HEAD` on final acceptance commit).
     - *Freshness Invariance Rule:* A subsequent acceptance commit advances Git HEAD and does not invalidate the historical verification coordinate (`VERIFIED_REMOTE_HEAD`).
  3. **Preserved Exceptions:**
     - `DEF-009`: OPEN / HUMAN ACTION REQUIRED (Supabase service-role JWT configuration in .env; safe code fallback active).
     - `DEF-012`: OPEN / Launch Gate A blocker (13-language translation key parity gap).
  4. **Next Permitted Job:** JOB W005 (Backup & Recovery Verification) is UNBLOCKED and designated as the immediate next permitted job.
- **Rationale:** Establishes rigorous mathematical and operational finality for W004, prevents infinite self-referential commit loops in CI/CD validation, and safely unlocks the milestone progression to W005.

---

### DEC-024: BACKUP & RECOVERY ARCHITECTURE, DISASTER RUNBOOK & COLD-START RECONSTRUCTION (JOB W005)
- **Date:** 2026-09-11
- **Status:** APPROVED & APPLIED
- **Context:** Master Execution Framework Amendment v1.2 (Part 11 & 15) and Amendment v1.4 mandate comprehensive verification of backup, recovery, and business continuity architecture prior to architectural refactoring (W006).
- **Decisions:**
  1. **Recovery Target Baselines (RTO & RPO):** Adopted formal business continuity thresholds:
     - RPO ≤ 5 minutes via Supabase continuous Write-Ahead Log (WAL) archiving & Point-in-Time Recovery (PITR).
     - Provider cloud instance failover RTO ≤ 30 minutes.
     - Cold-start database reconstruction RTO ≤ 15 minutes.
     - Mobile client offline degradation RTO = 0 seconds (local-first MMKV / SQLite caching).
  2. **100% Migration Bundle Synchronization:** Updated `scripts/bundle_migrations.mjs` to incorporate all 36 SQL migrations (001–034, 0035, and dual-023), regenerating `supabase/all_migrations_combined.sql` (360.6 KB) as the single cold-start database bootstrap artifact.
  3. **Automated Verification & Regression Testing:** Created `scripts/verify-backup-recovery.mjs` (evaluating migration completeness, bundle freshness, staging master schema, seed provenance, DB failure degradation, and env config) and `tests/backup-recovery.test.mjs` as permanent CI/CD quality gates.
  4. **Disaster Recovery Runbook (`RUNBOOK_BACKUP_RECOVERY.md`):** Formally established step-by-step restoration procedures for 5 critical failure scenarios: total cloud database loss, accidental table corruption/deletion, API container host failure, storage/media CDN disruption, and mobile client network partitioning.
  5. **Governance Lineage Maintenance:** Maintained strict four-coordinate lineage model during W005 progression with zero self-referential failure loops.
- **Rationale:** Ensures complete resilience against data loss or infrastructure outages, provides a deterministic cold-start database recovery mechanism, and satisfies Launch Gate A operational readiness requirements.

---

### DEC-025: W005-R1A ACTUAL RECOVERY EVIDENCE, EMPIRICAL DRILLS & DR TAXONOMY
- **Date:** 2026-09-11
- **Status:** APPROVED & APPLIED
- **Context:** Reopening of W005 as W005-R1A required moving beyond simulated or in-memory fixtures to empirical recovery evidence across live staging infrastructure, honest classification of unsupported capabilities, and strict demarcation between schema recovery and user data recovery.
- **Decisions:**
  1. **Standardized DR Evidence Hierarchy:**
     - `RUNBOOK VERIFIED`: Procedures, steps, and commands documented and reviewed.
     - `RECOVERY ARTIFACT VERIFIED`: Migration bundles, seed scripts, and snapshot artifacts syntactically valid and integrity verified.
     - `RECOVERY TESTED`: A recovery workflow or instance failover executed in staging or isolated environment.
     - `RECOVERY PROVEN`: Actual recovery drill executed with an actual recoverable source artifact, loss simulated, recovery executed using that source, data independently verified with matching SHA-256, and duration measured.
     - `RECOVERY SIMULATED`: In-memory or client-side mockup not exercising actual remote infrastructure.
  2. **Empirical Recovery Verification (DR-002 & DR-004):**
     - DR-002: Real data backup generated to disk artifact file (`reports/w005_r1a_dr002_live_backup_artifact.json`), deletion simulated on live Staging Supabase, restored from disk artifact in 0.33s (total 3.38s), and confirmed with 100% SHA-256 match.
     - DR-004: Real synthetic binary object uploaded to Staging Supabase Storage bucket (`staging-dr-test`), disk backup artifact saved, object deleted and confirmed absent via authenticated API, restored from disk artifact in 0.64s (total 5.47s), and verified with 100% SHA-256 match.
  3. **Truth in Engineering & Honest Classifications:**
     - DR-001: Classified as `SCHEMA RECOVERY & API BOOTSTRAP` (`RECOVERY TESTED`). Verified 36 migrations, 148 tables in combined bundle, 174 live staging catalog definitions, and live DB-backed API retrieval in 7.59s.
     - DR-003: Honestly classified as `LOCAL PROCESS RECOVERY TESTED` with `MULTI_CLOUD_STANDBY = NOT IMPLEMENTED / HUMAN INFRASTRUCTURE REQUIRED`. Standby Fastify container recovery verified in 4.53s.
     - DR-005: Formally designated as `CLIENT OFFLINE RESILIENCE` (0.01s local execution) and explicitly distinguished from cloud disaster-recovery RTO.
     - DR-006: Codified strict separation between schema recovery (migrations/bundles) and user data recovery (PITR/logical dumps).
     - RPO: Target ≤ 5 min retained; actual status classified honestly as `NOT EMPIRICALLY VERIFIED` to prevent destructive point-in-time rewind against active instances.
---

### DEC-026: W005-R1B DYNAMIC EVIDENCE COORDINATE BINDING & CONSISTENCY VALIDATION
- **Date:** 2026-09-11
- **Status:** APPROVED & APPLIED
- **Context:** Following W005-R1A, hardcoded Git commit coordinates (e.g. `943a803`) lingered in executable drill generator `scripts/run-w005-r1a-drills.mjs`, causing coordinate drift when new verification reports advanced repository HEAD.
- **Decisions:**
  1. **Dynamic Git Metadata Derivation:** Replaced all hardcoded coordinate constants in `scripts/run-w005-r1a-drills.mjs` with runtime Git derivation via `git rev-parse HEAD`, `git rev-parse origin/master`, and branch assertion (`master`).
  2. **Automated Dynamic Coordinate Regression Gate:** Created `tests/drill-coordinate-dynamism.test.mjs` to permanently prevent stale SHA constants from entering executable evidence generators.
  3. **Preservation of Empirical DR Findings:** Preserved all empirical evidence categories established in DEC-025: DR-001 (Schema Recovery & API Bootstrap - RECOVERY TESTED, target ≤ 15 min), DR-002 (Logical Backup & Restore - RECOVERY PROVEN), DR-003 (Local Process Standby Failover - RECOVERY TESTED, multi-cloud standby not implemented), DR-004 (Supabase Storage Object Restore - RECOVERY PROVEN), DR-005 (Client Offline Resilience), and RPO honestly reported as `NOT EMPIRICALLY VERIFIED`.
- **Rationale:** Ensures that all generated evidence artifacts automatically reflect exact repository coordinates at execution time with zero manual editing and zero stale constants.

---

### DEC-027: W005-R1C STRICT REMOTE-COORDINATE VERIFICATION & FAIL-CLOSED DRILL INTEGRITY
- **Date:** 2026-09-11
- **Status:** APPROVED & APPLIED
- **Context:** While W005-R1B removed hardcoded coordinates, the drill runner still contained a fallback (`originMasterFull = localHeadFull`) if remote resolution failed, and tests did not assert strict equality between local HEAD and origin/master or enforce a clean working tree unconditionally.
- **Decisions:**
  1. **Eradication of Local Fallback:** Eliminated the remote-to-local fallback in `scripts/run-w005-r1a-drills.mjs`. If `git rev-parse origin/master` fails, the drill script exits immediately with `[FAIL CLOSED] REMOTE_VERIFICATION_FAILED` (exit code 1).
  2. **Mandatory Exact Local/Remote Alignment:** Enforced `localHeadFull === originMasterFull`. If local and remote commits diverge, the script fails closed with `COORDINATE_MISMATCH` (exit code 1).
  3. **Mandatory Clean Working Tree:** Eliminated dependency on optional environment variables. Any uncommitted/unstaged changes immediately abort execution with `WORKING_TREE_DIRTY` (exit code 1).
  4. **Comprehensive Regression Suite (Tests A–H):** Expanded `tests/drill-coordinate-dynamism.test.mjs` to explicitly test: Test A (branch=master), Test B (local HEAD resolves), Test C (origin/master resolves), Test D (local HEAD == origin/master), Test E (report verifiedRemoteHead format and integrity), Test F (remote lookup failure exits non-zero with `REMOTE_VERIFICATION_FAILED`), Test G (mismatch exits non-zero with `COORDINATE_MISMATCH`), and Test H (dirty working tree exits non-zero with `WORKING_TREE_DIRTY`).
  5. **Governance State Alignment:** Maintained strict four-coordinate terminology (`VERIFIED_REMOTE_HEAD`, `AUDITED_CODE_COMMIT`, `EVIDENCE_COMMIT`, `ACCEPTANCE_COMMIT`). Set W005 to `NOT ACCEPTED / IN VERIFICATION` and kept W006 strictly `BLOCKED` until independent verification passes.
- **Rationale:** Guarantees that recovery evidence can only ever be generated against an unblemished, fully pushed, verified canonical remote repository state with zero ambiguous fallbacks.

---

### DEC-028: FINAL ACCEPTANCE OF JOB W005 (BACKUP & RECOVERY VERIFICATION) WITH DOCUMENTED LIMITATIONS
- **Date:** 2026-09-11
- **Status:** APPROVED & ACCEPTED
- **Authority:** Master Execution Framework Amendment v1.2 (Rule IV-001), Amendment v1.4, `AGENT_EXECUTION_PROTOCOL.md`
- **Context:** Following completion of W005, W005-R1, W005-R1A, W005-R1B, and W005-R1C, all backup and disaster-recovery requirements, empirical drills, dynamic coordinate bindings, and strict remote fail-closed verifications have passed independent verification (`reports/w005_r1c_independent_verification.md`, commit `acc32fe`).
- **Decisions:**
  1. **Final Acceptance Status:** Set `JOB W005: BACKUP & RECOVERY VERIFICATION` = `ACCEPTED WITH DOCUMENTED LIMITATIONS`.
  2. **Unblocking W006:** Formally transition `JOB W006: API ARCHITECTURE AUDIT & SEPARATION` from `BLOCKED` to `UNBLOCKED` and authorized for execution.
  3. **Preserved Documented Limitations:**
     - **PITR / RPO ≤ 5 min:** Retained as target objective; actual state classified as `NOT EMPIRICALLY VERIFIED` to prevent destructive point-in-time rewind drills against active cloud databases without dedicated sandboxes.
     - **Multi-Cloud Standby:** Standby API container deployment on secondary cloud provider (Fly.io/Render) is `NOT IMPLEMENTED / HUMAN INFRASTRUCTURE REQUIRED`. Local Fastify process failover was empirically tested (4.57s).
     - **DR-001 Scope:** Classified as `SCHEMA RECOVERY & API BOOTSTRAP` (`RECOVERY TESTED`, 7.29s); does not encompass zero-to-new-cloud provider provisioning from scratch.
     - **DR-002 Scope:** Empirically proven logical backup artifact recovery for tested synthetic staging dataset (`civic_issues`, 0.32s restore, 100% SHA-256 match).
     - **DR-004 Scope:** Empirically proven Supabase Storage bucket restore from disk artifact (`staging-dr-test`, 0.39s restore, 100% SHA-256 match).
     - **DR-005 Scope:** Client offline resilience via local MMKV mutation queueing and idempotent sync (0.00s execution, 0 duplicate writes); not traditional cloud DR RTO.
  4. **Four-Coordinate Lineage Lock:**
     - `VERIFIED_REMOTE_HEAD`: `f6ee696`
     - `AUDITED_CODE_COMMIT`: `943b026`
     - `EVIDENCE_COMMIT`: `b4f3133`
     - `ACCEPTANCE_COMMIT`: `ea4c1fd` (final acceptance-state commit)
- **Rationale:** Satisfies Launch Gate A disaster recovery and resilience criteria with complete truth in engineering, empirical proof, and strict governance transparency.

---

### DEC-029: API ARCHITECTURE AUDIT & STRANGLER SEPARATION MATRIX (JOB W006)
- **Date:** 2026-09-11
- **Status:** SUPERSEDED BY DEC-030 (W006-R1 REBOUND)
- **Authority:** Master Product Blueprint, AI Agent Master Execution Job Book, Amendment v1.2, Amendment v1.4, `DEC-002`, `DEC-028`
- **Context:** Mobile application exhibited a dual-path architecture where 12 direct Supabase callers and 11–14 Railway callers coexisted. Initial audit classified 85 data service methods into 22 Class A, 57 Class B, and 6 Class C.
- **Outcome:** Reopened per governance review for W006-R1 to correct globalSearch RPC classification, dynamically rebind audit test, audit PostgreSQL RPC semantics, qualify Class A RLS policies, and map all 56 Class B strangler methods to exact endpoints.

---

### DEC-030: W006-R1 AUDIT TRUTHFULNESS, CLASSIFICATION & EVIDENCE REBINDING
- **Date:** 2026-09-11
- **Status:** APPROVED & IMPLEMENTED
- **Authority:** Master Product Blueprint, AI Agent Master Execution Job Book, Amendment v1.2, Amendment v1.4, `DEC-002`, `DEC-028`, `DEC-029`
- **Context:** Governance review of W006 required an authoritative, reproducible audit engine that evaluates live source code rather than asserting against checked-in JSON. Additionally, `globalSearch` required semantic resolution, RPC functions in SQL migrations required audit, Class-A direct-read queries required explicit RLS security qualifications, Fastify route extraction needed type parameter support (137 unique routes), and all 56 Class-B mutations required exact endpoint mappings without vague placeholders.
- **Decisions:**
  1. **Dynamic Engine Rebinding:** Exported `runApiArchitectureAudit()` from `scripts/audit-api-architecture.mjs`. Refactored `tests/api-architecture-audit.test.mjs` to execute the audit directly against current repository source code, asserting against live generated structures.
  2. **globalSearch Classification Resolution:** Evaluated `global_search` SQL migration definition in `020_foundation_hardening.sql`. Identified as `STABLE SECURITY DEFINER (plpgsql)` full-text search aggregation across 4 public entities with `GRANT EXECUTE TO anon, authenticated`. Classified as `RPC_READ` / `CLASS_A_READ_RLS_GOVERNED` (0 writes performed).
  3. **Method Classification Totals (85 Methods):**
     - **Class A (Read, RLS-Governed): 23 methods (27.1%)** (22 table SELECT queries + 1 read-only RPC `globalSearch`).
     - **Class B (Client Write, Strangler Target): 56 methods (65.9%)** (direct client mutations writing to PostgreSQL tables or mutating RPCs).
     - **Class C (Already Fastify Routed): 6 methods (7.1%)** (already routing through Railway Fastify endpoints).
  4. **PostgreSQL RPC Semantics Audit:** Audited all 4 client RPCs:
     - `global_search`: Read-only STABLE function (Class A).
     - `increment_aspirant_modules`: Mutation (Counter increment), missing in SQL migrations (Class B).
     - `increment_short_views`: Mutation (View counter increment), missing in SQL migrations (Class B).
     - `increment`: Column increment expression (Class B).
  5. **Class A Security & RLS Qualification:** Evaluated RLS status and sensitivity for all 23 direct read methods:
     - 20 methods verified safe for direct client reads under active PostgreSQL RLS.
     - 2 methods (`fetchUserConversations`, `fetchConversationMessages`) flagged for API mediation due to high privacy sensitivity.
     - 1 method (`fetchDepartments`) flagged for public directory verification.
  6. **Fastify Route Inventory:** Enhanced route scanner with TypeScript generic type parameter support `(?:<[\s\S]*?>)?`. Audited **137 unique Fastify routes** across 23 modules. Clarified difference between static source route registrations and runtime route count.
  7. **Exact Endpoint Strangler Matrix:** Mapped all 56 Class B methods to exact existing endpoints or exact new routes to be created in W007–W011 with 0 vague placeholders.
- **Rationale:** Establishes an authoritative, empirically verified, and reproducible foundation for W007 (Canonical API Client) and subsequent strangler migration jobs.


