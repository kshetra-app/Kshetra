# W000 ACCEPTANCE REPORT: RECONCILIATION & REPRODUCIBILITY
**Job ID:** `W000-EVIDENCE-RECONCILIATION`  
**Milestone:** Project Discovery & Ground-Truth Codebase Audit  
**Governance Authority:** Master Execution Framework Amendment v1.2 (Part 7 & 8: Evidence Freshness & Remote Reproducibility)  
**Verification Date:** 2026-09-08T23:30:00+05:30  
**Status:** FULLY RECONCILED & REPRODUCIBLE  

---

## 1. Executive Summary

This report provides the auditable, evidence-backed reconciliation for **Job W000 (Project Discovery & Ground-Truth Audit)**. 

While W000 execution quality was provisionally accepted, the initial audit outputs resided in local session directories rather than committed in-repo locations. Furthermore, apparent discrepancies—such as 35 vs 36 migration files and 106 vs 109 API endpoints—required definitive mathematical and algorithmic definitions.

All numerical claims have now been measured using deterministic, repository-hosted audit scripts (`scripts/reconcile-w000.mjs`), with machine-readable inventories committed directly into `reports/` and `scratch/`.

---

## 2. Inventory Claims vs Actual Measured Results

| Item / Domain | Original W000 Claim | Measurement Method | Actual Measured Result | In-Repo Evidence File | Reconciled Status |
| :--- | :---: | :--- | :---: | :--- | :---: |
| **Mobile Routes (Total Files)** | 53 files | Recursive scan of `apps/mobile/app/` for `.tsx`/`.ts` files (excluding test files) | **53 files** | [`reports/w000_route_inventory.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w000_route_inventory.json) | **MATCH (100%)** |
| **Mobile Route Screens** | 51 screens | Total route files excluding `_layout.tsx` files | **51 screens** | [`reports/w000_route_inventory.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w000_route_inventory.json) | **MATCH (100%)** |
| **Mobile Layout Files** | 2 layouts | Filter `_layout.tsx` files in `apps/mobile/app/` | **2 layouts** (`_layout.tsx`, `(tabs)/_layout.tsx`) | [`reports/w000_route_inventory.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w000_route_inventory.json) | **MATCH (100%)** |
| **Mobile Stores** | 29 stores | Non-recursive scan of `apps/mobile/stores/*.ts` | **29 stores** | [`reports/w000_summary.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w000_summary.json) | **MATCH (100%)** |
| **API Route Modules** | 21 modules | Directory listing of `apps/api/src/routes/*.ts` | **21 modules** | [`reports/w000_api_inventory.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w000_api_inventory.json) | **MATCH (100%)** |
| **API Endpoints (Fastify)** | 106 endpoints | AST/regex parsing of `app.<method>` and `fastify.<method>` declarations across routes and `server.ts` | **109 endpoints** (106 in modules + 2 root health in `server.ts` + 1 `/config/flags` alias) | [`reports/w000_api_inventory.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w000_api_inventory.json) | **RECONCILED** |
| **SQL Migration Files** | 36 files | Directory listing of `supabase/migrations/*.sql` | **36 files** | [`reports/w000_database_inventory.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w000_database_inventory.json) | **MATCH (100%)** |
| **Database Tables (Public)** | 148 tables | Distinct table names extracted via `CREATE TABLE` regex across all 36 migrations | **148 unique tables** | [`reports/w000_database_inventory.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w000_database_inventory.json) | **MATCH (100%)** |
| **Database Views** | 21 views | Distinct view names extracted via `CREATE VIEW` regex across all 36 migrations | **21 unique views** | [`reports/w000_database_inventory.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w000_database_inventory.json) | **CONFIRMED** |
| **Database Functions** | 46 functions | Distinct function names extracted via `CREATE FUNCTION` regex across all 36 migrations | **46 functions** | [`reports/w000_database_inventory.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w000_database_inventory.json) | **CONFIRMED** |
| **Database Triggers** | 61 triggers | Distinct trigger names extracted via `CREATE TRIGGER` regex across all 36 migrations | **61 triggers** | [`reports/w000_database_inventory.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w000_database_inventory.json) | **CONFIRMED** |
| **Mobile Runtime Dependencies** | 47 deps | Keys in `apps/mobile/package.json` -> `dependencies` | **47 dependencies** (9 devDependencies) | [`reports/w000_dependency_inventory.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w000_dependency_inventory.json) | **MATCH (100%)** |
| **Direct Supabase Callers** | 12 files | Static scan of `apps/mobile` files calling Supabase client directly | **12 files** | [`reports/w000_data_paths.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w000_data_paths.json) | **MATCH (100%)** |
| **Railway API Callers** | 8-11 files | Static scan of `apps/mobile` files calling Fastify API client / URLs | **11 files** | [`reports/w000_data_paths.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w000_data_paths.json) | **CONFIRMED** |
| **Local Fallback Files** | 15 files | Static scan of `apps/mobile` for synthetic mocks (`local-cmt-`, `isSupabaseConfigured`, etc.) | **15 files** | [`reports/w000_data_paths.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w000_data_paths.json) | **MATCH (100%)** |

---

## 3. Discrepancy Analysis & Explanations

### 3.1 Migration File Count (35 vs 36)
- **Question:** The migration files have sequential prefixes up to `034_political_ads.sql`. Why are there 36 files instead of 34 or 35?
- **Finding:**
  1. An out-of-order migration exists: `0035_posts_polls_social.sql` (located between `002_seed_telangana.sql` and `003_multi_state.sql`).
  2. Prefix `023` is assigned to two separate files:
     - `023_data_api_grants.sql`
     - `023_local_body_representatives.sql`
  3. Formula: $34 \text{ sequential files (001-034)} + 1 \text{ (file 0035)} + 1 \text{ (duplicate 023)} = 36 \text{ total files}$.
  4. The directory contains exactly **36** `.sql` files.

### 3.2 API Endpoint Count (106 vs 109)
- **Question:** Why did W000 report 106 endpoints, while current AST extraction finds 109?
- **Finding:**
  1. The 21 route modules in `apps/api/src/routes/` contain exactly **106 endpoints**.
  2. `apps/api/src/server.ts` directly declares two root container health endpoints: `GET /` and `GET /health` (+2).
  3. During remediation W001-R6A, `apps/api/src/routes/config.ts` registered an alias `GET /config/flags` (+1).
  4. Total registered endpoints across the Fastify server: $106 + 2 + 1 = 109$.

### 3.3 Commit 0f7e104 Governance Files Presence
- **Question:** Why did commit `0f7e104` lack governance files (`EXECUTION_STATE.md`, etc.)?
- **Finding:** Commit `0f7e104` was the initial snapshot commit at the start of Job W000. The governance registers and audit reports were authored during the execution of W000 and W001 and committed in subsequent commits. All five governance files are now tracked and synchronized on `origin/master`.

---

## 4. Automated Typecheck Verification

Both workspaces were re-verified with clean zero-error typechecks:
1. **Fastify Backend API**:
   - Command: `npm run build --prefix apps/api` (`tsc --noEmit`)
   - Exit Code: `0`
   - Errors: `0`
2. **Expo Mobile App**:
   - Command: `npm run typecheck --prefix apps/mobile` (`tsc --noEmit`)
   - Exit Code: `0`
   - Errors: `0`

---

## 5. Repository Governance State

The five canonical continuity registers are tracked and verified:
1. `EXECUTION_STATE.md`: Tracks phases, jobs, branch, commit, and open defects.
2. `ACCEPTANCE_REGISTER.md`: Auditable ledger of jobs, evidence, and acceptance status.
3. `DEFECT_REGISTER.md`: DEF-001 through DEF-012 with severities and root causes.
4. `DECISION_LOG.md`: DEC-001 through DEC-011 recording platform architecture decisions.
5. `RELEASE_REGISTER.md`: Deployment targets, binary size gates, and release status.

---

## 6. Final W000 Acceptance Declaration

With all numerical inventories verified via deterministic scripts, machine-readable JSON artifacts committed to `reports/` and `scratch/`, and TypeScript builds passing with zero errors:

```text
========================================================================================
W000 STATUS: ACCEPTED AS A FULLY REPRODUCIBLE REPOSITORY STATE
NEXT PERMITTED JOB: JOB W002 (Staging / Prod Environment Separation)
========================================================================================
```
