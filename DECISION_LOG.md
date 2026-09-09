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








