# KSHETRA WORLD-A → WORLD-B DEPENDENCY REGISTER

**Milestone:** W021.5 — Canonical National Data Plane Migration  
**Substage:** W021.5-B1-R1 — National Constituency Canonicalization Remediation  
**Authority:** CTO Implementation Specification W021.5-B1-R1 (Section 25)  
**Objective:** Maintain an exhaustive, auditable inventory of every remaining consumer of legacy static seed data ("World A"), mapping each consumer to its designated canonical replacement stage ("World B").

---

## 1. Domain Separation Principle

Under W021.5-B1-R1, the codebase strictly establishes five decoupled architectural domains:

1. **JURISDICTION DOMAIN:** Statutory boundaries, names, numbers, reservations, and delimitations (`states`, `constituencies`, `parliamentary_constituencies`, `constituency_versions`, `delimitation_regimes`).
2. **POLITICAL DOMAIN:** Persons, parties, candidacies, election results, and elected tenures (`canonical_persons`, `political_organizations`, `candidacies`, `elected_tenures`, `party_affiliations`).
3. **CURRENT-STATE DOMAIN:** Derived point-in-time incumbency (current MLA, current MP, ruling party, vacancies) computed dynamically from tenures rather than stored as static text attributes.
4. **GEOSPATIAL DOMAIN:** Boundaries, centroids, rings, and spatial relationships (`entity_geometries`, PostGIS layers).
5. **PROVENANCE DOMAIN:** Source documents, dataset versions, cryptographic hashes, and conflict logs (`dataset_versions`, `evidence_records`, `migration_conflicts`).

World A violates this architecture by collapsing all five domains into static TypeScript records. The table below catalogs all remaining World A consumers and their scheduled migration paths.

---

## 2. Exhaustive Consumer Dependency Matrix

| # | File / Component | Function / Module | Current Source (World A) | Domain | Canonical World-B Replacement | Target Stage | Priority | Migration Risk |
| :-: | :--- | :--- | :--- | :--- | :--- | :-: | :-: | :-: |
| **1** | `apps/api/src/routes/states.ts` | `GET /api/v1/states` | `getAllStatesInfo()` from `stateData.ts` | JURISDICTION + CURRENT-STATE | Query `public.states` joined with `public.state_versions` | **W021.5-B3** | **HIGH** | Medium (Contract parity must be preserved) |
| **2** | `apps/api/src/routes/constituencies.ts` | `GET /api/v1/constituencies/:id` | `getConstituency()` from `stateData.ts` | JURISDICTION + CURRENT-STATE | Query `public.constituencies` + dynamic tenure resolution | **W021.5-B3** | **HIGH** | High (Used by primary mobile explore screen) |
| **3** | `apps/api/src/routes/saasV1.ts` | `GET /api/v1/saas/v1/geography/*` | `stateData.ts` | JURISDICTION | Query `public.constituencies` & `parliamentary_constituencies` | **W021.5-B3** | **HIGH** | Medium (SaaS B2B consumers) |
| **4** | `apps/api/src/services/stateData.ts` | `genericToBrief()` | `winner2024 ?? winner2023...` | CURRENT-STATE (FLATTENED) | Deprecate & retire in favor of `public.elected_tenures` | **W021.5-B3** | **HIGH** | High (Root source of flattened static incumbency) |
| **5** | `apps/api/src/services/delimitationService.ts` | `simulateBoundaries()` | `getConstituencies()` from `stateData.ts` | JURISDICTION + GEOSPATIAL | Query `public.constituency_versions` & `entity_geometries` | **W021.5-B3** | **MEDIUM** | Low (Internal simulation engine) |
| **6** | `apps/mobile/lib/stateDataAdapter.ts` | `getUnifiedConstituenciesForState()` | `data/seed/*-constituencies.ts` | JURISDICTION | Fastify API `/api/v1/states/:code/constituencies` | **W021.5-B4** | **HIGH** | High (Core mobile state-adapter) |
| **7** | `apps/mobile/lib/stateDataDispatcher.ts` | `getHistoryForState()`, `getMLAProfileForState()` | `data/seed/*-election-history.ts`, `data/seed/*-mla-profiles.ts` | POLITICAL | Fastify API `/api/v1/legislators`, `/api/v1/elections` | **W021.5-B4** | **HIGH** | High (Political intelligence feeds) |
| **8** | `apps/mobile/lib/stateRegistry.ts` | `STATE_REGISTRY` | Static TypeScript dictionary | JURISDICTION | Fastify API `/api/v1/states` | **W021.5-B4** | **MEDIUM** | Low (Static state metadata) |
| **9** | `apps/mobile/app/(tabs)/explore.tsx` | Constituency list feed | `getUnifiedConstituenciesForState()` | JURISDICTION + CURRENT-STATE | Canonical Fastify endpoint / MMKV-backed offline sync | **W021.5-B4** | **HIGH** | High (Primary consumer UI) |
| **10** | `apps/mobile/app/constituency/[id].tsx` | Constituency detail page | `stateDataDispatcher.ts` | CURRENT-STATE | Canonical Fastify endpoint with tenure history | **W021.5-B4** | **HIGH** | High (Constituency drill-down screen) |
| **11** | `apps/mobile/app/legislator/[id].tsx` | MLA / MP Profile view | `getMLAProfileForState()` | POLITICAL | Canonical Fastify endpoint `/api/v1/legislators/:id` | **W021.5-B4** | **HIGH** | High (Legislator profile view) |
| **12** | `apps/mobile/lib/delimitation/pinCodeResolver.ts` | PIN-to-constituency resolver | `CENSUS_2011_STATES` | JURISDICTION + GEOSPATIAL | PostGIS spatial RPC `find_constituency_by_point()` | **W021.5-B4** | **MEDIUM** | Medium (Spatial resolution heuristic) |
| **13** | `apps/mobile/lib/aiService.ts` | `getConstituencyContext()` | Direct SELECT on `states.ruling_party` | CURRENT-STATE | Fastify Intelligence API `/api/v1/intelligence/context` | **W021.5-B3** | **LOW** | Low (AI assistant prompt assembly) |
| **14** | `apps/mobile/data/seed-data.db` | Embedded SQLite bundle | Bundled World-A SQLite snapshot | ALL | Canonical SQLite sync engine synced from PostgreSQL | **W021.5-B5** | **HIGH** | High (Offline-first local database) |
| **15** | `scripts/build-seed-db.mjs` | Seed DB compilation | `data/seed/*.ts` | ALL | Deprecate once SQLite sync worker is active | **W021.5-B5** | **LOW** | Low (Build-time utility) |
| **16** | `data/seed/mp-profiles.ts` | `LOK_SABHA_MPs` | Static JSON-in-TS array | POLITICAL | Canonical migration into `canonical_persons` & `elected_tenures` | **W021.5-B2** | **HIGH** | Medium (Contains 3 reconciled state anomalies) |
| **17** | `data/seed/*-constituencies.ts` (31 files) | Assembly seats | Static TS files with `winner2024/winner2023` | JURISDICTION + CURRENT-STATE | Retain as read-only legacy baseline; World B is now canonical | **W021.5-B1** | **DONE** | Zero (Migration 059 canonicalized geography) |

---

## 3. Migration Safe-Guards & Anti-Regression Rules

1. **Zero Seed Mutation in B1/B1-R1:** Under no circumstances should `data/seed/**` be edited, deleted, or mocked to make tests pass.
2. **Strangler Pattern Enforcement:** Existing client consumers continue reading World A via their existing adapters until their explicit replacement stage (e.g. W021.5-B4 for mobile screens).
3. **No Silent Fallback:** When a backend endpoint transitions to World B, if canonical data is unavailable, it must return explicit error/status flags (`MISSING`, `PROVISIONAL`), never silently query World A seed files.
4. **Deprecation Markers:** All legacy columns in the database schema (`states.ruling_party`, `constituencies.current_mla`) are formally commented as deprecated.
