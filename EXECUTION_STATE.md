# EXECUTION STATE: PANIN / KSHETRA
**Last Updated:** 2026-09-21
**Authority:** Master Product Blueprint, AI Agent Master Execution Job Book, Amendment v1.2 (`AMENDMENT_v1.2.md`), Amendment v1.3 (`AMENDMENT_v1.3.md`), Amendment v1.4 (`AMENDMENT_v1.4.md`), Amendment v1.5 (`AMENDMENT_v1.5.md`), Amendment v1.5-A (`AMENDMENT_v1.5-A.md`) & `AGENT_EXECUTION_PROTOCOL.md`

---

## 1. Project & Execution Coordinates
```text
PROJECT:               PANIN (formerly Kshetra)
CURRENT_JOB:           W010 (BOUNDED REMEDIATION COMPLETE / SUBMITTED FOR CTO REVIEW)
LAST_COMPLETED_JOB:    W009-B5 (Provider Sandbox / Mock Readiness & Staging Integration - ACCEPTED / COMPLETE)
NEXT_PERMITTED_JOB:    W010 (PENDING CTO REVIEW & STAGING EXECUTION AUTHORIZATION)

PLAN_STATUS:           RATIFIED / COMPLETE (Revision 2.0)
APPROVED_PLAN_VERSION: PLAN-W010-MASTER-REV-2
IMPLEMENTATION_AUTHORIZATION: GRANTED (CTO DIRECTIVE W010 IMPLEMENTATION AUTHORIZATION)
IMPLEMENTATION_AUTHORIZATION_COMMIT: 879fb532acfd43b7caca41ad25fc36312587264b
AUTHORIZED_JOB:        W010 (Security Baseline & RLS Hardening)
W010_STATUS:           BOUNDED_REMEDIATION_COMPLETE_SUBMITTED_FOR_CTO_REVIEW
W009_B1_STATUS:        ACCEPTED_COMPLETE
W009_B2_STATUS:        ACCEPTED_COMPLETE
W009_B3_STATUS:        ACCEPTED_COMPLETE
W009_B4_STATUS:        ACCEPTED_COMPLETE
W009_B5_STATUS:        ACCEPTED_COMPLETE

# W009-B5 ACCEPTED COORDINATES (ACCEPTED / COMPLETE BY CTO)
ACCEPTED_W009_B5_HEAD_COMMIT:           45ebb7dfd2f78c807b57b1348ba9e1be4caaa504
ACCEPTED_W009_B5_RAILWAY_COMMIT:        ffaf92bf447ba8971df072a67b072f51ce5a1548
ACCEPTED_W009_B5_RAILWAY_DEPLOYMENT:    d3ebcadd
ACCEPTED_W009_B5_PROVIDER_SOURCE:       126011a8c3d9b4bfa293c66f9166f289d0c3ebc9
W009_B5_STAGING_CHECKS:                 27/27 PASSED (100%)
W009_B5_STATUS:                         ACCEPTED_COMPLETE
W009_B5_CTO_ACCEPTANCE:                 ACCEPTED_COMPLETE (2026-09-21)

# W009-B4 ACCEPTED COORDINATES (ACCEPTED / COMPLETE BY CTO)
W009_B4_BASELINE_COMMIT:                1a715c87f50a5006a7020a7047794daa3542d798
W009_B4_BASELINE_TREE:                  c111e3de8ecd41dc66aa66ee0d8bd25451065e49
W009_B4_STATUS:                         ACCEPTED_COMPLETE
W009_B4_CTO_ACCEPTANCE:                 ACCEPTED_COMPLETE (2026-09-20)

# W009-B3 ACCEPTED COORDINATES (ACCEPTED / COMPLETE BY CTO)
ACCEPTED_W009_B3_IMPLEMENTATION_COMMIT: 2ff4f40130df3b1fb516c29902742653d7749427
W009_B3_RECONCILIATION_COMMIT:          079134a8234326f8cb9fa79d58ca9cb3c0ddf7c1
W009_B3_BASE_TREE:                      6730a78bcf861ff78c263095e875fe774cb68b58
W009_B3_STATUS:                         ACCEPTED_COMPLETE

# W009-B2 ACCEPTED COORDINATES (ACCEPTED / COMPLETE BY CTO)
ACCEPTED_W009_B2_IMPLEMENTATION_COMMIT: 09cbf4bf27eb677d3bdda93032c4491924ec417a
W009_B2_BASE_TREE:                      4a649d4035825b92df8e191d8976bb68290c7dbe
W009_B2_STATUS:                         ACCEPTED_COMPLETE

# W009-B1 ACCEPTED COORDINATES (ACCEPTED / COMPLETE BY CTO)
ACCEPTED_W009_B1_IMPLEMENTATION_COMMIT: fb2fb4378b59f40050b803fb1388234cf7eb11a2
W009_B1_BASE_TREE:                      460459a9fa05f4c5e3170e43d9bf6c1ec588e3fa
W009_B1_STATUS:                         ACCEPTED_COMPLETE

# W008-E ACCEPTED COORDINATES (ACCEPTED / COMPLETE BY CTO)
ACCEPTED_W008_E_IMPLEMENTATION_COMMIT: e39767183c38917e706395ead09c8ab45aa41f1c
W008_E_BASE_TREE:                      47d46dd94690e66dae0b1859e3186556e1100b5a
W008_E_STATUS:                         ACCEPTED_COMPLETE

# W008-D EXECUTION COORDINATES (SUBMITTED FOR CTO RATIFICATION)
W008_D_AUTHORIZED_BASE_HEAD:           9a6fef6a9c156932b680ff7e16df20a4dc5a9d59
W008_D_IMPLEMENTATION_AUTHORIZATION_COMMIT: e236e78ffc57f212699f76f7d3dcfae41d0389b8
W008_D_AUTHORIZED_SCOPE_HASH:          7ea8addf41526144db192959360c5ada9ecfc06a5e1770d430b2d1bdf6992805
W008_D_STATUS:                         IMPLEMENTED_TESTED_VERIFIED_SUBMITTED

# W008-C ACCEPTED COORDINATES (ACCEPTED / CLOSED BY CTO - DEC-049)
ACCEPTED_W008_C_IMPLEMENTATION_COMMIT: 89847041d0d9d93d348ed7bc2a5556dcc2c74f8b
W008_C_AUTHORIZED_BASE_HEAD:           70b18f55dc9864070688a0949aaf60c79a9c0657
W008_C_IMPLEMENTATION_AUTHORIZATION_COMMIT: e6d4c6449175ee250eb93855ff99008bc0a2ea99
W008_C_GOVERNANCE_BINDING_COMMIT:      cbe21df03dfaa42c242835ddb7cd6d2ba5925d74
W008_C_AUTHORIZED_SCOPE_HASH:          36de3d19127019ae00d7900e7d515e74e5892e18adcd991b606338fe5be04b49
W008_C_IMPLEMENTATION_COMMIT:          89847041d0d9d93d348ed7bc2a5556dcc2c74f8b

# W008-B ACCEPTED COORDINATES (ACCEPTED / CLOSED BY CTO)
ACCEPTED_W008_B_IMPLEMENTATION_COMMIT: f4d4095b9447c4d82b132808313ec0d7309ca135
W008_B_IMPLEMENTATION_AUTHORIZATION_COMMIT: 86a0fa5762494036b15831feee888e4466e67d2d
W008_B_AUTHORIZED_SCOPE_HASH:          98c1253721bd0b6302a88acef6b2c18701beee635074b4c94586192443d66d0a
W008_B_IMPLEMENTATION_COMMIT:          f4d4095b9447c4d82b132808313ec0d7309ca135

# W008-A ACCEPTED COORDINATES (ACCEPTED / CLOSED BY CTO)
ACCEPTED_W008_A_IMPLEMENTATION_COMMIT: be9cb85fafce85c56b1ccac3ee7b6137bbbba7e7
RATIFIED_W008_R7_GOVERNANCE_BASELINE:  bffd242ed11ead715e77b4a6bf8dc2900ff4ae04
W008_A_IMPLEMENTATION_AUTHORIZATION_COMMIT: 7790b58192948b8d5760fc800d26436624cf2b71
W008_A_IMPLEMENTATION_COMMIT:          be9cb85fafce85c56b1ccac3ee7b6137bbbba7e7
EVIDENCE_COMMIT:                       89847041d0d9d93d348ed7bc2a5556dcc2c74f8b

# HISTORICAL PROVENANCE COORDINATES
HISTORICAL_W007_ACCEPTED_IMPLEMENTATION: 1d253cd454effb441e7f01e846a568eeddc7f57e
HISTORICAL_W007_EVIDENCE_COMMIT:         1d253cd454effb441e7f01e846a568eeddc7f57e
ACCEPTED_W007_IMPLEMENTATION_COMMIT:     1d253cd454effb441e7f01e846a568eeddc7f57e
UNAUTHORIZED_IMPLEMENTATION_COMMIT:      0d75d29c02512d5bc17839a5ef4730bdc5d389d5

# REPOSITORY & REMOTE COORDINATES
CURRENT_BRANCH:        master
CURRENT_REMOTE_HEAD:   origin/master
VERIFIED_REMOTE_HEAD:  origin/master
GOVERNANCE_COMMIT:     origin/master

# HISTORICAL W006 PROVENANCE (Preserved Prior Milestone Lineage - DEC-035 / DEC-037)
HISTORICAL_W006_VERIFIED_REMOTE_HEAD: c1fe56a
HISTORICAL_W006_AUDITED_CODE_COMMIT:  35ba912
HISTORICAL_W006_EVIDENCE_COMMIT:      db30619
HISTORICAL_W006_ACCEPTANCE_COMMIT:    f5b8a09

API_VERSION:           v1 (Fastify 5.2 on Railway)
MOBILE_VERSION:        0.1.0 (Expo 54, React Native 0.81.5)
DATABASE_MIGRATIONS:   36 migration files present in repository (35 live applied to staging fkpigozcqnmcvofuksar)
DATABASE_TABLES:       165 live tables in staging catalog (148 unique source tables)
DATABASE_VIEWS:        9 live views in staging catalog (23 unique source-defined)
API_ENDPOINTS:         138 unique Fastify route registrations (135 direct registrations + 3 derived /api health-prefix routes across 24 source files/modules)
MOBILE_ROUTES:         53 application route files (all .tsx; 2 layouts, 51 route screens)
MOBILE_STORES:         29 Zustand stores
GOVERNANCE_FRAMEWORK:  Amendment v1.2 (Active History) | Amendment v1.3 (Active History) | Amendment v1.4 (Active History) | Amendment v1.5 (Parent Baseline) | Amendment v1.5-A (ACTIVE OPERATIONAL AUTHORITY)
REMOTE_SYNC:           Up to date with origin/master
```

> **Evidence Lineage & Coordinate Reconciliation (DEC-035 / DEC-036 / DEC-037 / DEC-041 / DEC-044 / DEC-045 / DEC-046 / DEC-047 / DEC-048 / DEC-049):**
> - `ACCEPTED_W008_C_IMPLEMENTATION_COMMIT: 8984704` = Formally accepted W008-C implementation commit (Accepted by CTO per DEC-049).
> - `W008_C_AUTHORIZED_BASE_HEAD: 70b18f55dc9864070688a0949aaf60c79a9c0657` = Authorized base HEAD for W008-C implementation.
> - `W008_C_IMPLEMENTATION_AUTHORIZATION_COMMIT: e6d4c6449175ee250eb93855ff99008bc0a2ea99` = Implementation authorization commit for W008-C (DEC-048).
> - `W008_C_GOVERNANCE_BINDING_COMMIT: cbe21df03dfaa42c242835ddb7cd6d2ba5925d74` = Governance binding commit for W008-C implementation authorization.
> - `W008_C_AUTHORIZED_SCOPE_HASH: 36de3d19127019ae00d7900e7d515e74e5892e18adcd991b606338fe5be04b49` = Authorized W008-C scope hash under REV-7.0 (DEC-048).
> - `ACCEPTED_W008_B_IMPLEMENTATION_COMMIT: f4d4095` = Formally accepted W008-B implementation commit (Accepted by CTO per DEC-047).
> - `W008_B_IMPLEMENTATION_AUTHORIZATION_COMMIT: 86a0fa5762494036b15831feee888e4466e67d2d` = Implementation authorization commit for W008-B (DEC-046).
> - `W008_B_AUTHORIZED_SCOPE_HASH: 98c1253721bd0b6302a88acef6b2c18701beee635074b4c94586192443d66d0a` = Authorized W008-B scope hash under REV-7.0.
> - `ACCEPTED_W008_A_IMPLEMENTATION_COMMIT: be9cb85` = Formally accepted W008-A implementation commit (Accepted by CTO per DEC-045).
> - `RATIFIED_W008_R7_GOVERNANCE_BASELINE: bffd242` = Ratified W008-R7 governance reconciliation and commit-bound Control M verifier.
> - `W008_A_IMPLEMENTATION_AUTHORIZATION_COMMIT: 7790b58` = Formal CTO plan approval and W008-A implementation authorization.
> - `W008_A_IMPLEMENTATION_COMMIT: be9cb85` = W008-A canonical contract foundation implementation & adoption.
> - `EVIDENCE_COMMIT: 8984704` = W008-C implementation and evidence coordinate.
> - `HISTORICAL_W007_ACCEPTED_IMPLEMENTATION: 1d253cd` = Accepted W007 implementation commit (Technically Accepted by CTO).
> - `HISTORICAL_W007_EVIDENCE_COMMIT: 1d253cd` = Preserved historical W007 runtime and contract evidence commit.
> - `UNAUTHORIZED_IMPLEMENTATION_COMMIT: 0d75d29` = Preserved REJECTED historical provenance commit from premature unapproved implementation.
> - `HISTORICAL_W006_VERIFIED_REMOTE_HEAD: c1fe56a` = Historical W006 baseline remote HEAD at start of qualification.
> - `HISTORICAL_W006_AUDITED_CODE_COMMIT: 35ba912` = Audited code commit implementing 85-method data service architecture.
> - `HISTORICAL_W006_EVIDENCE_COMMIT: db30619` = Historical W006-R1C qualification evidence coordinate.
> - `HISTORICAL_W006_ACCEPTANCE_COMMIT: f5b8a09` = Formal CTO / Technical Authority acceptance of W006.
> - `GOVERNANCE_COMMIT: origin/master` = Active governance closure & provenance commit.


---

## 2. Job Execution Progress

| Job ID | Job Title | Status | Acceptance Date | Evidence / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **W000** | Project Discovery & Ground-Truth Audit | **ACCEPTED (RECONCILED)** | 2026-09-08 | Audited 53 routes, 29 stores, 109 static registrations, 36 migrations, 148 tables, 47 deps; reconciled in-repo |
| **W000-REC** | W000 Evidence Reconciliation | **COMPLETE** | 2026-09-08 | Reconciled via `scripts/reconcile-w000.mjs`; `reports/w000_*.json` & `reports/w000_acceptance_report.md` |
| **W000-REC2**| Audit Method & State Reconciliation | **REOPENED** | - | Reopened per independent verification; superseded by W000-REC2A |
| **W000-REC2A**| Parser Implementation & Evidence Rebinding | **ACCEPTED** | 2026-09-09 | Independent Verifier PASS per Amendment v1.2 Rule IV-001; 23 views (0 "IF"); `reports/w000_rec2a_independent_verification.md` |
| **W001** | Production Environment Verification | **ACCEPTED (W/ EXCEPTIONS)** | 2026-09-08 | Verified live Railway & Supabase; W001-R6A IV Pass w/ non-blocking exceptions |
| **W001-R5** | W001 Reconciliation & Remote Reproducibility | **COMPLETE** | 2026-09-08 | Reconciled evidence into in-repo `reports/` with Part 7 metadata per Amendment v1.2 |
| **W001-R6** | Independent Verification & Final W001 Acceptance | **REOPENED** | - | Reopened per governance review; superseded by W001-R6A |
| **W001-R6A** | Independent Verification Re-execution | **COMPLETE** | 2026-09-08 | Independent Verifier Pass with Non-Blocking Exceptions per Amendment v1.2 Rule IV-001 |
| **W002** | Staging / Prod Separation | **ACCEPTED** | 2026-09-09 | W002-R2 IV PASS; Real cloud staging operational (`kshetra-api-staging` & `fkpigozcqnmcvofuksar`); tests A-I pass; `reports/w002_r2_independent_verification.md` |
| **W003-P0**| Amendment v1.4 Activation & Governance Sync | **ACCEPTED** | 2026-09-09 | Independent Verifier PASS; Amendment v1.4 operational governance authority active across all registers; `reports/w003_p0_independent_verification.md` |
| **W003** | CI/CD Quality Pipeline | **ACCEPTED** | 2026-09-10 | Independent Verifier PASS with Monitored Exceptions per Amendment v1.4 Parts 33 & 34; accepted by user (`reports/w003_r5_independent_verification.md`) |
| **W004** | Observability & Error Tracking | **ACCEPTED** | 2026-09-11 | W004-R1A Independent Verifier PASS (13/13 gates at commit `811b5dd`); verified remote head `1260f98`; audited code `ef4622a`; evidence `19a5932`; user accepted; `reports/w004_r1a_independent_verification.md` |
| **W005** | Backup & Recovery Verification | **ACCEPTED (W/ LIMITATIONS)** | 2026-09-11 | W005-R1C Independent Verifier PASS (commit `acc32fe`); verified remote head `f6ee696`; audited code `943b026`; evidence `b4f3133`; documented limitations: PITR/RPO ≤5m unverified, multi-cloud standby not implemented, DR-001 schema/API bootstrap, DR-002 synthetic staging, DR-004 staging storage, DR-005 client offline; user accepted |
| **W006** | API Architecture Audit & Separation | **ACCEPTED** | 2026-09-12 | Audited 316 mobile files, 12 direct Supabase callers, 14 Railway callers, 137 Fastify routes across 23 modules, 85 data service methods classified (23 Class A reads, 56 Class B mutation strangler targets, 6 Class C Fastify routed). Fail-closed RLS decision engine: 21 source verified, 2 source pending, 0 live verified, 23 live pending; 0 directClientAllowed=true, 21 conditional pending, 2 forbidden (conversations/messages). Anti-override guard active. Tests NP-01 to NP-10 pass. global_search defect documented as DEF-013; auditedCodeCommit=35ba912, evidenceCommit=04be40b; formally accepted by CTO / Technical Authority per DEC-037; reports/w006_final_acceptance_report.* & reports/w006_final_independent_verification.md |
| **W007** | Canonical API Client | **ACCEPTED / CLOSED** | 2026-09-12 | Canonical API client implemented in apps/mobile/lib/api/ (apiClient, AuthManager, ConfigEndpoint, PagesEndpoint, NewsEndpoint). Technically accepted by CTO at implementation commit `1d253cd454effb441e7f01e846a568eeddc7f57e`. Real single-flight token deduplication verified; fail-safe auth policy; Fastify UUID correlation with strict response validation on all statuses (2xx, 4xx, 5xx); total request deadline budget (18s GET, attempt ceiling 8s); caller cancellation semantics (0 retries); zero mutation retries (NP-08); strict runtime response validation (NewsSource object, NewsFeed schema, boolean flags, page entitlement); 48/48 unit tests pass (including 16 negative-path tests NP-1 through NP-16); 9 master integration checks pass; 3 pioneer callers migrated (pageService, featureFlags, news) with 100% fallback preservation; DM callers, DB migrations, Fastify routes, and npm dependencies untouched; IV-01 through IV-23 verified |
| **W008** | API Contract Standardization | **ACCEPTED / COMPLETE** | 2026-09-18 | W008-A, B, C, D, E all complete. W008-E mobile mutation strangler and migration 035 recharge orders complete; accepted by CTO |
| **W009-B1** | Migration Normalization, Safety & Foundation Repair | **ACCEPTED / COMPLETE** | 2026-09-18 | 38 migrations normalized; DEF-013 syntax error repaired in migration 036; accepted by CTO |
| **W009-B2** | Bounded Provider Abstraction (Razorpay & Voice OBD) | **ACCEPTED / COMPLETE** | 2026-09-18 | Provider interfaces implemented; fail-closed signature verification; TRAI window checks; accepted by CTO |
| **W009-B3** | Moderation Fail-Closed & Unavailable Semantics | **ACCEPTED / COMPLETE** | 2026-09-19 | DEF-004 resolved; fail-closed moderation semantics; accepted by CTO |
| **W009-B4** | Mobile Strangler / Mutation Consolidation | **ACCEPTED / COMPLETE** | 2026-09-20 | 11 real DB mutations verified; mobile strangler complete; accepted by CTO |
| **W009-B5** | Provider Sandbox/Mock Readiness & Staging Closure | **ACCEPTED / COMPLETE** | 2026-09-21 | Staging DB migrations 035-037 applied; Railway staging connected; 27/27 staging runtime & sandbox checks PASS; deployment lineage closed; accepted by CTO |
| **W009** | External Provider Abstraction & Strangler Migration | **ACCEPTED / COMPLETE** | 2026-09-21 | W009-B1 through W009-B5 all complete and accepted by CTO |
| **W010** | Security Baseline & RLS Hardening | **NOT_STARTED (PENDING CTO AUTHORIZATION)** | - | Next Job in Master Roadmap (Prerequisite W009 COMPLETE) |
| **W011** | Deceptive Fallback Remediation | NOT_STARTED | - | Prerequisite: W010 |
| ... | ... | ... | ... | ... |
| **W051** | API Customer Acquisition | NOT_STARTED | - | Commercial API/SaaS customer onboarding |
| **W051.5** | Compliance, DPDP & Data Governance Readiness | NOT_STARTED | - | **NEW JOB (Amendment v1.2 Part 2)**: DPDP Act 2023, personal data inventory, retention, deletion, consent, 13-lang privacy UI. Owners: COMPLIANCE+ARCH+SEC |
| **W052** | Professional Broadcast Architecture | NOT_STARTED | - | Studio broadcast ingestion and distribution |

---

## 3. Defect & Blocker Summary
- **Open P0 (Production Blockers):** 0
- **Open P1 (Major Architectural Flaws):** 5
  - DEF-001: Duplicate routes (`user/[id]` vs `user/[userId]`, `edit-profile`, `onboarding`)
  - DEF-002: Deceptive local fallback returns in `supabaseDataService.ts` (`if (!guard()) return true;`)
  - DEF-003: Bloated native dependency (`react-native-webrtc` in consumer bundle)
  - DEF-004: Silent bypass in moderation check on network error
  - DEF-009: Invalid `SUPABASE_SERVICE_ROLE_KEY` in `apps/api/.env` (**OPEN - HUMAN ACTION REQUIRED**: Code fallback active; real secret extraction required)
- **Open P2 (Moderate Technical Debt):** 6
  - DEF-005: Unstandardized dual-backend data paths (12 Supabase direct vs 8 Railway API callers)
  - DEF-006: Unformalized versioned geography tables (`geography_entity`, `geography_version`)
  - DEF-007: Short ID UUID check causing diverging identifier semantics
  - DEF-008: Residual unlocalized strings across screens bypassing 13-language translations
  - DEF-010: Missing `CORS_ORIGINS` on Railway container (**RESOLVED IN CODE / PENDING DEPLOYMENT**: Committed code passes inject tests; live container awaits deployment refresh)
  - DEF-012: 13-language translation key parity gap (**OPEN**: 8 languages at 56% coverage; 904 keys missing in `ta`, `ml`, `bn`, `gu`, `or`, `pa`, `as`, `ne`)
  - *(DEF-011: **CLOSED - INVALID DEFECT**: Schema confirms intentional category enum on `civic_issues` table)*


---

## 4. Hardware, App-Size & Performance Metrics
- **Consumer App Target:** ≤ 25–30 MB
- **Current Android Dev Dependencies:** 47 (includes MapLibre, SQLite, MMKV, WebRTC)
- **Startup Time Target:** < 2.0s
- **AI Operating Mode:** Optional (deterministic fallback enforced)

---

## 5. 100% i18n Localization Compliance (All 13 Languages)
- **Mandate:** 100% UI string localization. Zero hardcoded English strings across all 53 routes and reusable components.
- **Active Locales (13):**
  1. English (`en`) - Canonical key dictionary
  2. Telugu (`te`) - `te.ts` (172 KB)
  3. Hindi (`hi`) - `hi.ts` (150 KB)
  4. Tamil (`ta`) - `ta.ts` (132 KB)
  5. Kannada (`kn`) - `kn.ts` (135 KB)
  6. Malayalam (`ml`) - `ml.ts` (126 KB)
  7. Marathi (`mr`) - `mr.ts` (129 KB)
  8. Bengali (`bn`) - `bn.ts` (117 KB)
  9. Gujarati (`gu`) - `gu.ts` (108 KB)
  10. Odia (`or`) - `or.ts` (118 KB)
  11. Punjabi (`pa`) - `pa.ts` (109 KB)
  12. Assamese (`as`) - `as.ts` (114 KB)
  13. Nepali (`ne`) - `ne.ts` (117 KB)
- **Quality Rule:** Every user-facing string must pass through `t()` with fallback handling. Complex pluralization and dynamic interpolations must render without layout clipping or font corruption on Indic scripts.

---

## 6. Independent Verification & Acceptance Lifecycle (Amendment v1.2)
- **Rule IV-001 (Implementing Agent ≠ Final Acceptance Authority):** The agent or engineer implementing a feature may build, test, and recommend acceptance, but CANNOT self-certify `ACCEPTED` status for Launch Gates or designated critical milestones.
- **Independent Verifier Role:** Clean independent AI session, separate audit workflow, or human reviewer producing `INDEPENDENT_VERIFICATION_REPORT.md`.
- **6-Stage Acceptance Status Lifecycle:**
  1. `IMPLEMENTED` — Code written and compilation verified (`tsc --noEmit`).
  2. `TESTED` — Automated local unit/integration tests passing.
  3. `VERIFIED` — Acceptance evidence independently reproduced and verified.
  4. `PRODUCTION` — Deployed to target staging/production environment.
  5. `ACCEPTED` — Acceptance authority (or independent verifier at gates) signs off.
  6. `COMPLETE` — Running in production under active observability with 0 blocking defects.
  *(Skipping directly from `IMPLEMENTED` to `COMPLETE` is strictly prohibited).*

---

## 7. DPDP Compliance-by-Design & Privacy Governance (Job W051.5)
- **Framework:** Digital Personal Data Protection Act, 2023 & Rules 2025.
- **Mandatory Requirements:**
  - Personal data inventory and data-flow mapping derived from actual code.
  - Purpose limitation: Every collected field must have a defensible product purpose or be removed.
  - Retention & Deletion matrix with automated propagation across primary DB, caches, media, and analytics.
  - 13-Language Privacy Surfaces: All notices, consent modals, grievance, and deletion flows must be 100% localized in all 13 languages.
  - Political profiling prohibition: Contextual/geographic targeting preferred over inferred individual political belief targeting.
  - Significant Data Fiduciary (SDF) statutory assessment documented.
  - Notice & Consent with verifiable withdrawal mechanisms.

---

## 8. In-Repo Committed Evidence & Freshness Registry
- **Remote Reproducibility Rule (Part 8):** Evidence stored solely in local/ephemeral scratch directories is invalid for acceptance. All critical reports must be committed to git under `reports/`.
- **Evidence Freshness Rule (Part 7):** Evidence is valid only for the exact repository, branch, commit SHA, DB migration, API version, mobile version, and environment recorded. Any code change immediately invalidates existing evidence and requires regeneration.
- **Committed Evidence Registry:**
  - [`reports/w000_baseline_audit.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w000_baseline_audit.json) — Commit `0f7e104`
  - [`reports/w001_production_verification_report.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w001_production_verification_report.json) — Commit `77fb553`
  - [`reports/w001_i18n_verification_report.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w001_i18n_verification_report.json) — Commit `77fb553`
  - [`reports/w010_legacy_remediation_l1.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w010_legacy_remediation_l1.json) — Batch L1 Remediation Evidence
  - [`reports/w010_legacy_remediation_l2.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w010_legacy_remediation_l2.json) — Batch L2 Remediation Evidence
  - [`reports/w010_legacy_remediation_l3.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w010_legacy_remediation_l3.json) — Batch L3 Remediation Evidence
  - [`reports/w010_def003_decoupling.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w010_def003_decoupling.json) — DEF-003 Decoupling Audit
  - [`reports/w010_geography_contamination_guard.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w010_geography_contamination_guard.json) — DEF-006 Contamination Guard


