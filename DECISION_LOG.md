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


