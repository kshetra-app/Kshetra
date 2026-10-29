# PLAN-DOMAIN-1-FOUNDATIONAL-GEOGRAPHY-AND-DELIMITATION-REV-1.0
## Master Pre-Implementation Plan: Domain 1 — Foundational Geographic & Delimitation Gaps (Jobs 012, 013, 016, 021, 022)

**Author:** Antigravity AI Engineering & Architecture Agent  
**Governing Authority:** Master Product Blueprint, AI Agent Master Execution Job Book, Amendment v1.2 (`AMENDMENT_v1.2.md`), Amendment v1.3 (`AMENDMENT_v1.3.md`), Amendment v1.4 (`AMENDMENT_v1.4.md`), Amendment v1.5 (`AMENDMENT_v1.5.md`), Amendment v1.5-A (`AMENDMENT_v1.5-A.md`), Amendment v1.6 (`AMENDMENT_v1.6.md`), & `AGENT_EXECUTION_PROTOCOL.md`  
**Base Commit SHA:** `09ebac686462ce94a8c6b1d13d1a856c32fa05fb`  
**Execution Date:** 2026-10-29  
**Specification Standard:** Amendment v1.5-A Section 26 Canonical 22-Section Plan Template  
**Operational Status:** APPROVED BY USER / CTO FOR SEQUENTIAL EXECUTION  

---

## 1. Document Title & Metadata
- **Document Identifier:** `PLAN-DOMAIN-1-FOUNDATIONAL-GEOGRAPHY-AND-DELIMITATION-REV-1.0`
- **Domain:** Domain 1 — Foundational Geography, Delimitation Intelligence & Governance Primitives
- **Scope of Jobs:**
  1. **JOB 012:** Data Governance Foundation — Source Registry, Status Model & Immutability Closure
  2. **JOB 013:** Canonical Geography Model — Local Body, Ward, and Polling Booth Referential Graph
  3. **JOB 016:** Real Geographic Mapping — PostGIS Point-in-Polygon (`[lat, lng] -> AC`) & Deterministic Postal Crosswalk (`PIN -> AC`)
  4. **JOB 021:** Delimitation "What Changes For Me?" — Backend Route Hardening & End-to-End Device Simulation Test
  5. **JOB 022:** Delimitation Share Cards — Mobile Card Canvas Generation & Verified Public Web Links (SSR OG Metadata)
- **Accountable Roles:**
  - Technical Owner: ARCH + DATA
  - Delivery Owners: BE + GIS + MOB + QA + SEC
  - Verification & Acceptance Authority: CTO / Technical Authority / Independent Verifier

---

## 2. Problem Statement (Task Understanding & Core Objectives)

Pursuant to the CTO Reviewer observation and the Master Product Blueprint, Domain 1 encompasses 5 critical foundational gaps that require complete, production-grade realization with zero placeholders, zero heuristic fallbacks, and zero synthetic defaults:

1. **JOB 012 (Data Governance Foundation Closure):**
   - *Problem:* Migrations `039_data_governance_foundation.sql` and `040_canonical_geography_model.sql` established the structural tables (`data_sources`, `datasets`, `dataset_versions`, `evidence_records`, `provenance_records`, `record_provenance_linkages`) and 8-state `data_status_enum`, yet W012 was never formally audited, evidenced, or closed in `ACCEPTANCE_REGISTER.md`.
   - *Objective:* Author an independent verification harness, execute an empirical adversarial security battery (proving append-only immutability, evidence linkage for `OFFICIAL`, and status enum constraints), generate an authoritative evidence dossier, and register formal acceptance.

2. **JOB 013 (Canonical Geography Model Extension):**
   - *Problem:* Migration 040 established States, Districts, PCs, and ACs; Migration 042 established Mandals and `mandal_constituency_map`. However, the sub-constituency tiers—specifically Local Bodies (`urban_local_bodies`, `gram_panchayats`), Wards (`ulb_wards`, `gp_wards`), and Polling Booths (`polling_booths`)—remain unintegrated with canonical immutable UUIDs, temporal validity, and W012 provenance linkages. Only 4 synthetic fixture booths exist.
   - *Objective:* Extend the canonical geography schema to fully bind Local Bodies, Wards, and Polling Booths into the canonical referential hierarchy with `ON DELETE RESTRICT` foreign keys, RLS policies, and bidirectional traversal methods in `canonicalGeographyService.ts`.

3. **JOB 016 (Real Geographic Mapping):**
   - *Problem:* Explicitly marked `NOT_STARTED` in `ACCEPTANCE_REGISTER.md` (line 50). Existing `/constituencies/locate` in `apps/api/src/routes/constituencies.ts` relies on reading a local Telangana GeoJSON file (`telangana-assembly.geojson`) with a hardcoded `'TS'` fallback. Deterministic PIN-to-AC mapping is incomplete.
   - *Objective:* Replace heuristic file-based fallbacks with authentic PostGIS spatial point-in-polygon queries (`ST_Contains`, `ST_Intersects`) across national candidate boundaries (`public.constituencies`), and provide a deterministic, high-precision PIN-to-AC directory resolver supporting single-AC and multi-AC intersection semantics with fail-closed validation.

4. **JOB 021 (Delimitation "What Changes For Me?" E2E Testing):**
   - *Problem:* While route `GET /api/v1/delimitation/impact/:pinCode` exists in `apps/api/src/routes/delimitation.ts` and core math exists in `delimitationService.ts`, there is no end-to-end device/client simulation test exercising the full voter transition journey across delimitation regimes (e.g., 2008 Order vs 2023/2026 projections, reservation changes, and territorial redistricting).
   - *Objective:* Build a comprehensive end-to-end integration and device simulation test suite (`tests/delimitation-citizen-impact-e2e.test.ts`) that asserts API contracts, boundary change classifications, severity rankings, and provenance envelopes.

5. **JOB 022 (Delimitation Share Cards):**
   - *Problem:* The mobile client (`apps/mobile/app/delimitation/my-impact.tsx`) lacks mobile share card generation. Citizens cannot generate or export a visual impact summary, and the backend lacks public share verification links and SSR Open Graph metadata endpoints for social preview rendering.
   - *Objective:* Build the end-to-end Delimitation Share Card system:
     - Backend: Share snapshot signing, storage, `/share/delimitation/:shareId` public HTML renderer with dynamic Open Graph (`og:title`, `og:image`, `og:description`) meta tags supporting `https://poligram.in` and `https://panin.in`.
     - Mobile: React Native `DelimitationShareCard` component, PNG/canvas export, and native OS share sheet integration (`Share.share`) dispatching verifiable deep links.

---

## 3. Current State Analysis (Repository Inspection, Root-Cause Interpretation & Dependency/Blocking Analysis)

### 3.1 Empirical Repository Inspection
- **Git HEAD:** `09ebac686462ce94a8c6b1d13d1a856c32fa05fb` (matches `origin/master`, clean working tree).
- **Governance Checks:** `tests/governance-consistency.test.mjs` and `tests/governance-v16.test.mjs` execute and return 100% PASS under Real-State Control M.
- **Migration Inventory:**
  - `supabase/migrations/039_data_governance_foundation.sql`: Defines `data_sources`, `datasets`, `dataset_versions`, `evidence_records`, `provenance_records`, `record_provenance_linkages`, `data_status_enum`, and immutability triggers.
  - `supabase/migrations/040_canonical_geography_model.sql`: Enhances `states`, creates `districts` and `parliamentary_constituencies`, enhances `constituencies`.
  - `supabase/migrations/042_geography_relationship_engine.sql`: Adds `district_id` to `mandals`, adds `constituency_internal_id` to `mandal_constituency_map` and `polling_booths`.
  - `supabase/migrations/070_saas_webhook_engine.sql`: Recorded in `ACCEPTANCE_REGISTER.md` under W022, but represents B2B SaaS webhooks rather than Delimitation Share Cards.
- **API Routes & Services:**
  - `apps/api/src/routes/constituencies.ts` (lines 45–54, 877–926): `/constituencies/locate` reads `data/geo/telangana-assembly.geojson` and hardcodes `'TS'`.
  - `apps/api/src/services/spatialRuntimeService.ts`: Contains `locatePoint` with partial feature query.
  - `apps/api/src/routes/delimitation.ts` (lines 406–425): Contains `GET /api/v1/delimitation/impact/:pinCode`.
  - `apps/api/src/services/delimitationService.ts` (lines 2338–2460): Contains `getCitizenImpact` with `CURATED_PROVISIONAL_PIN_DIRECTORY`.
- **Mobile Client:**
  - `apps/mobile/app/delimitation/my-impact.tsx`: Implements impact lookup UI but has zero share card export or social sharing capabilities.

### 3.2 Root-Cause Interpretation
- Historical development prioritized horizontal milestone completion (such as W021.5 national candidate boundaries and W022 B2B SaaS webhooks) while leaving lower-tier sub-constituency linkages (W013), PostGIS runtime point-in-polygon (W016), and consumer delimitation share loops (W022) partially realized or unverified.
- Reconciling Domain 1 bridges the foundational geography gap to make Kshetra/PanIN a gold-standard, nationwide platform from polling booth to parliament.

### 3.3 Dependency & Blocking Analysis
- **JOB 012** is foundational and unblocks formal data governance auditability for all subsequent entities.
- **JOB 013** builds on W012 provenance and completes the sub-constituency referential graph.
- **JOB 016** builds on canonical constituency geometries and unblocks spatial location resolution.
- **JOB 021** depends on deterministic PIN and coordinate mapping to validate citizen voter journeys.
- **JOB 022** depends on JOB 021 citizen impact DTOs to generate verifiable shareable artifacts.

---

## 4. Fact / Inference / Assumption / Unknown Register

| Identifier | Category | Proposition | Evidence Base |
| :--- | :--- | :--- | :--- |
| **FIA-01** | **FACT** | Schema for W012 exists in `supabase/migrations/039_data_governance_foundation.sql`. | Migration 039 defines all 6 data governance tables, enums, triggers, and RLS. |
| **FIA-02** | **FACT** | W012 has no entry in `ACCEPTANCE_REGISTER.md`. | Text search across `ACCEPTANCE_REGISTER.md` for `W012` yields 0 matches. |
| **FIA-03** | **FACT** | `ACCEPTANCE_REGISTER.md` marks `W016` as `NOT_STARTED`. | Line 50 of `ACCEPTANCE_REGISTER.md` explicitly lists `NOT_STARTED`. |
| **FIA-04** | **FACT** | `/constituencies/locate` in `constituencies.ts` uses local file `telangana-assembly.geojson`. | Lines 49–50 of `apps/api/src/routes/constituencies.ts`. |
| **FIA-05** | **FACT** | Mobile `my-impact.tsx` lacks share card generation components and native share handlers. | Code inspection of `apps/mobile/app/delimitation/my-impact.tsx` (507 lines). |
| **FIA-06** | **INFERENCE** | W022 was re-purposed for SaaS webhooks in git history, leaving the original Job Book deliverable (Delimitation Share Cards) unfulfilled. | `ACCEPTANCE_REGISTER.md` line 9 records SaaS webhooks for W022, while `DELIMITATION_MASTERPLAN.md` defines Share Cards as Phase D3/D4 core deliverables. |
| **FIA-07** | **INFERENCE** | PostGIS spatial queries can resolve any coordinate `[lat, lng]` to canonical ACs without reading local geojson files. | PostGIS extension is loaded (`CREATE EXTENSION IF NOT EXISTS postgis`) and candidate AC boundaries exist. |
| **FIA-08** | **ASSUMPTION** | Both Staging (`fkpigozcqnmcvofuksar`) and Production (`ehfafcnimmjusyvplbah`) remain air-gapped during local development and testing; all verification runs in local PostgreSQL / PGlite / in-memory harnesses. | Mandatory security rule per Amendment v1.5-A and Real-State Control M. |
| **FIA-09** | **UNKNOWN** | Exact nationwide postal PIN-to-booth mapping dataset is not fully published in open data by India Post. | India Post publishes PIN-to-District/Taluk, while ECI publishes Booth-to-AC; postal PIN to booth requires deterministic multi-candidate intersection handling. |

---

## 5. Target Architecture & Intended Outcome (Proposed Technical Solution & Alternatives Considered)

### 5.1 Proposed Technical Solution by Job
- **Stage 1 (JOB 012):**
  - Verify and prove `prevent_evidence_mutation`, `prevent_provenance_mutation`, and `prevent_dataset_version_mutation` triggers.
  - Implement test suite `tests/w012-data-governance-closure.test.mjs` verifying 8-state status taxonomy, mandatory evidence for `OFFICIAL`, and append-only DAG linkages.
  - Generate `reports/w012_data_governance_closure_report.json` and register in `ACCEPTANCE_REGISTER.md`.
- **Stage 2 (JOB 013):**
  - Author migration `072_canonical_sub_constituency_hierarchy.sql`:
    - Add canonical `internal_id` UUID, `primary_dataset_version_id`, `data_status`, and foreign keys to `urban_local_bodies`, `gram_panchayats`, `ulb_wards`, `gp_wards`, and `polling_booths`.
    - Ensure `polling_booths` strictly enforces 1:1 binding to `constituency_internal_id` with `ON DELETE RESTRICT`.
    - Enhance `apps/api/src/services/canonicalGeographyService.ts` with hierarchical drill-down (`getHierarchyDrilldown`) and upward aggregation (`getRollupMetrics`).
- **Stage 3 (JOB 016):**
  - Refactor `/constituencies/locate` in `apps/api/src/routes/constituencies.ts`:
    - Eliminate `getGeoJSON()` and `telangana-assembly.geojson` reads.
    - Implement database spatial query via `canonicalGeographyService.locatePoint({ lat, lng })` using PostGIS `ST_Contains(boundary, ST_SetSRID(ST_Point(lng, lat), 4326))`.
    - Implement `locateByPinCode({ pinCode })` supporting single-AC resolution and multi-AC intersection detection with candidate weights.
    - Strict input validation: lat $\in [-90, 90]$, lng $\in [-180, 180]$, PIN 6 digits (`^\d{6}$`). Unmatched returns 404 with structured payload.
- **Stage 4 (JOB 021):**
  - Author `tests/delimitation-citizen-impact-e2e.test.ts`:
    - Simulates complete client/device voter journeys across 10+ diverse PIN codes and coordinates.
    - Validates boundary shift classifications, reservation shifts (e.g. Gen -> SC/ST), severity indicators, and ECC-001 provenance envelopes.
- **Stage 5 (JOB 022):**
  - Contracts in `packages/shared/src/contracts/delimitationShare.ts`:
    - `ShareImpactRequest`, `ShareImpactResponse`, `PublicShareCardDTO`.
  - Backend Module in `apps/api/src/modules/delimitationShare/`:
    - `POST /api/v1/delimitation/share`: Generates HMAC-signed or UUID-anchored share record.
    - `GET /api/v1/delimitation/share/:shareId`: Returns structured share card data.
    - `GET /share/delimitation/:shareId`: Fastify HTML route rendering rich SSR HTML with standard Open Graph (`og:title`, `og:description`, `og:image`, `og:url`, `twitter:card`) tags for social card embedding. Supported domains: `https://poligram.in`, `https://panin.in`.
  - Mobile Component in `apps/mobile/components/DelimitationShareCard.tsx` and integration into `apps/mobile/app/delimitation/my-impact.tsx`:
    - High-contrast visual card with before/after constituency names, badges, reservation tag, and PanIN watermark.
    - One-tap "Share Impact" button invoking React Native `Share.share` with deep link `https://poligram.in/share/delimitation/{shareId}` or `https://panin.in/share/delimitation/{shareId}`.

---

## 6. Governing Rules & Constraints (Security, Privacy, Compliance & Data Considerations)

1. **DPDP Act 2023 & Privacy Boundary:** Zero storage or logging of precise citizen coordinates or voter identities in share records. Share cards contain only aggregate geographical transitions.
2. **Fail-Closed Principle:** Any invalid coordinate, malformed PIN code, or tampered share token must fail closed with an explicit error code rather than falling back to defaults.
3. **Immutability of Historical Evidence:** Existing accepted migrations (001–071) and PostGIS 589 geometries baseline are strictly preserved without perturbation.
4. **Non-Self-Acceptance (Rule IV-001):** Verified through automated suites and presented for formal user/CTO review.

---

## 7. Plan Sign-Off & Approvals
- **Decision on Question 1:** Returned all candidate ACs with weights and locality hints to avoid heuristic misrepresentation.
- **Decision on Question 2:** Supported relative path `/share/delimitation/:shareId` and canonical domains `https://poligram.in` and `https://panin.in`.
- **Decision on Question 3:** `PLAN_STATUS: APPROVED` and `IMPLEMENTATION_AUTHORIZATION: YES` for sequential execution.
