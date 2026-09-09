# W002-P0: GOVERNANCE COORDINATE NORMALIZATION REPORT

**Governance Authority:** Master Execution Framework Amendment v1.2 (Rule IV-001, Parts 7 & 8)  
**Job ID:** `W002-P0`  
**Job Title:** Governance Coordinate Normalization  
**Repository:** `https://github.com/kshetra-app/Kshetra.git`  
**Canonical Branch:** `master`  
**Timestamp:** `2026-09-09T09:12:00+05:30`  
**Auditor Role:** Architecture & DevOps Governance  

---

## 1. Executive Summary

Prior to commencing the technical execution of **JOB W002: Staging / Production Environment Separation**, Job `W002-P0` was executed to normalize repository coordinates and align continuity ledgers with the actual Git remote state without altering valid historical evidence or modifying the accepted `W000-REC2A` implementation.

### Key Governance Determinations
1. **Current Remote HEAD:** Independently determined from Git as `8168676` (`docs(W000-REC2A): record independent verification pass and final W000-REC2A acceptance`), cleanly synchronized with `origin/master`.
2. **Four-Point Commit Lineage Separated:**
   - `CURRENT_REMOTE_HEAD`: `8168676` (Actual Git HEAD)
   - `AUDITED_CODE_COMMIT`: `5f7c8a5` (Implementation of modular view parser & regression tests)
   - `EVIDENCE_COMMIT`: `5f7c8a5` (Regenerated 6 raw inventory JSONs in `reports/` and `scratch/`)
   - `ACCEPTANCE_COMMIT`: `8168676` (Independent verification PASS report and accepted registers)
3. **Historical Commit Integrity:** Historical commit references (`0f7e104`, `fad6025`, `77fb553`, `7e39635`, `ba4f0c1`, `7d89b3e`) were preserved in their respective historical contexts.
4. **Source-Defined vs Live Catalog Clarification:** Confirmed that inventory metrics represent repository source definitions rather than live production catalog objects.
5. **Registers Synchronized:** `EXECUTION_STATE.md`, `ACCEPTANCE_REGISTER.md`, `RELEASE_REGISTER.md`, and `DECISION_LOG.md` were updated to reflect normalized coordinates and register `DEC-013`.

---

## 2. Commit Lineage & Coordinate Table

| Coordinate Field | Commit SHA | Git Message / Role |
| :--- | :---: | :--- |
| **CURRENT_REMOTE_HEAD** | `8168676` | `docs(W000-REC2A): record independent verification pass and final W000-REC2A acceptance` |
| **AUDITED_CODE_COMMIT** | `5f7c8a5` | `feat(W000-REC2A): fix database view parser, bind regression test to production implementation, and regenerate evidence` |
| **EVIDENCE_COMMIT** | `5f7c8a5` | Regenerated 6 raw inventory JSONs in `reports/` and `scratch/` (23 views, 0 false positives) |
| **ACCEPTANCE_COMMIT** | `8168676` | Contains `reports/w000_rec2a_independent_verification.md` and accepted continuity ledgers |

---

## 3. Ground-Truth Source Metric Clarifications

All inventory figures established in `W000-REC2A` represent repository source definitions:

| Metric | Source Count | Technical Definition | Live Production Status |
| :--- | :---: | :--- | :--- |
| **Migration Files Present** | **36** | Files present in `supabase/migrations/` (001–034 + 0035 + duplicate 023). | *Repository file count, not live applied migration count.* |
| **Database Tables Defined** | **148** | Unique tables defined via `CREATE TABLE` across repository migration files. | *Source-defined, not live database catalog count.* |
| **Database Views Defined** | **23** | Unique views defined via `CREATE VIEW` across migrations (20 standard + 3 materialized; 0 false positives). | *Source-defined, not live database catalog count.* |
| **Stored Functions Defined**| **46** | Unique stored functions defined via `CREATE FUNCTION` across migrations. | *Source-defined, not live database catalog count.* |
| **Database Triggers Defined**| **61** | Unique triggers defined via `CREATE TRIGGER` across migrations. | *Source-defined, not live database catalog count.* |
| **Static HTTP Registrations**| **109** | Static AST/regex HTTP method registrations in Fastify routes/server (`app.<method>('...')`). | *Static source inventory, not live production endpoint count.* |
| **Mobile Route Files** | **53** | Route files in `apps/mobile/app/` (all `.tsx`; 2 layouts, 51 route screens). | Verified in repository source. |
| **Mobile Stores** | **29** | Zustand store files in `apps/mobile/stores/*.ts`. | Verified in repository source. |

### Live Catalog Governance Protocol
* **Catalog Status:** `LIVE DATABASE CATALOG VERIFICATION = HUMAN ACTION REQUIRED`
* **Root Cause:** PostgREST anon key cannot access internal PostgreSQL catalogs (`pg_catalog`, `information_schema`, `supabase_migrations`). Access requires privileged service-role credentials.
* **Defect Linkage:** Tracked under `DEF-009` (`OPEN / HUMAN ACTION REQUIRED`).
* **Enforcement:** No live catalog counts are fabricated.

---

## 4. Defect State Posture Going into W002

| Defect ID | Severity | Domain | Posture for W002 Execution |
| :--- | :---: | :--- | :--- |
| **DEF-009** | **P1** | Backend / Security | Remains **OPEN / HUMAN ACTION REQUIRED**. Defensive anon-key fallback remains active. Does not block W002 environment separation. |
| **DEF-010** | **P2** | DevOps / CORS | **RESOLVED IN CODE / PENDING DEPLOYMENT**. Target for live verification when W002 deploys current CORS allowlist to Railway edge. |
| **DEF-011** | **P2** | Database / Civic | **CLOSED (INVALID DEFECT)**. Table `civic_issues` verified 200 OK. |
| **DEF-012** | **P2** | Mobile / i18n | Remains **OPEN**. Canonical validator enforces 100% key parity with 0 threshold leniency. Remains a Launch Gate A blocker. |

---

## 5. Continuity Ledgers & Artifacts

1. [`reports/w002_p0_governance_normalization.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w002_p0_governance_normalization.json)
2. [`reports/w002_p0_governance_normalization.md`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w002_p0_governance_normalization.md)
3. [`EXECUTION_STATE.md`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/EXECUTION_STATE.md) (Normalized HEAD, AUDITED, EVIDENCE, ACCEPTANCE commits)
4. [`ACCEPTANCE_REGISTER.md`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/ACCEPTANCE_REGISTER.md) (W002 marked READY_TO_START)
5. [`RELEASE_REGISTER.md`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/RELEASE_REGISTER.md) (Release registers aligned)
6. [`DECISION_LOG.md`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/DECISION_LOG.md) (Recorded DEC-013)

---

## 6. Verification & Readiness for Main W002

* Repository working tree: Clean (once normalization artifacts committed).
* Remote synchronization: Ready to push.
* Historical and current commit roles: Unambiguous.
* **JOB W002 — STAGING / PRODUCTION ENVIRONMENT SEPARATION IS UNBLOCKED AND PROCEEDING DIRECTLY.**
