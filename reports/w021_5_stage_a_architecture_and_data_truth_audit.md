# W021.5 — STAGE A POST-W021 ARCHITECTURE & NATIONAL DATA-TRUTH AUDIT REPORT

**Audit Identifier:** `W021.5-STAGE-A-ARCHITECTURE-AND-DATA-TRUTH-AUDIT-V1.0`  
**Governing Directive:** `KSHETRA — W021.5 CTO DIRECTIVE 114`  
**Governing Specification:** `W021.5 MASTER SURGICAL IMPLEMENTATION SPECIFICATION, Stage A`  
**Governance Framework:** `Master Execution Framework Amendment v1.2 / Rule IV-001 (Non-Self-Acceptance)`  
**Starting Commit:** `09be451ef9e4e2c1bad4a4664d3c6bddd9f74517`  
**CI Remediation Commit:** `39b1359e90afc4a0c76a8ecaf53045ebe62f17df`  
**Audit Timestamp:** `2026-10-19T17:15:00.000Z`  
**Implementation Authorization:** `NOT AUTHORIZED / AUDIT ONLY (STAGES B–I STRICTLY UNEXECUTED)`  
**Rule IV-001 Acceptance:** `0.0% (UNACCEPTED)`  
**Production Air-Gap:** `0.0% (AIR_GAPPED_UNEXECUTED)`  

---

## 1. Executive Summary & Diagnostic Findings

Under CTO Directive 114, Stage A ("Post-W021 Architecture and National Data-Truth Audit") was executed across all 18 canonical domains of the Kshetra / PANIN repository. In strict adherence to the directive's governance constraints:
1. **Scope Boundary:** Zero database migrations were created, executed, or applied. Zero runtime schema mutations occurred. Stages B through I remain strictly unexecuted pending independent review and formal CTO authorization.
2. **The Bifurcated Architecture:**
   - **Canonical Layer (W014–W021):** Features strict relational modeling (Migrations 039–057), PostGIS vector tiles, canonical persons (`canonical_persons`), independent party tenures (`elected_tenures`, `tenure_party_switches`), normalized election cycles (`election_events`, `election_contests`), and a hardened B2B SaaS gateway (`/api/vsaas/v1/...`). It strictly separates statutory facts from academic simulations and enforces zero citizen PII.
   - **Legacy In-Memory/Seed Layer (Sprint 1–30):** Relies on massive static TypeScript files in `data/seed/*.ts` (>25MB), flat GeoJSON in `apps/api/public/geo/`, and single-table mutable schemas (`legislator_profiles` from Migration 012). It resolves current representatives using fragile fallback chains like `winner2025 ?? winner2024 ?? winner2023 ?? winner2022 ?? winner`.
3. **National Coverage Reality:**
   - Basic geographic boundaries, official names, and seat counts exist for all 31 States and Union Territories (4,123 Assembly Constituencies and 543 Parliamentary Constituencies).
   - Deep political intelligence (candidate profiles, tenures, defection timelines, demographic cross-tabs, verified vote counts, and victory margins) is populated almost exclusively for **Telangana (`TS`)**, with partial stubs for 7 major states (`AP`, `KA`, `MH`, `TN`, `KL`, `WB`, `UP`), and zero deep data for the remaining 23 states/UTs.
4. **Continuous Ingestion Void:**
   - **Zero automatic cron jobs or continuous background data refresh pipelines exist.** The entire system is currently static or reliant on one-off manual Node.js scripts in `scripts/` and `scrapers/`. The historical MyNeta scrapers in `scrapers/` are offline, unversioned batch utilities.
5. **Delimitation Engine Duplication:**
   - The authoritative delimitation simulation engine is centralized in `apps/api/src/services/delimitationService.ts` and `delimitationQueryService.ts` (W020). However, the mobile client in `apps/mobile/stores/delimitation.ts` contains an obsolete, duplicated client-side simulator with static projection constants and mock simulation logic.

---

## 2. Phase 1 — CI Dependency Remediation & Remote Verification

### 2.1 Failure Diagnosis (Run `39281440891`)
In GitHub Actions workflow run `39281440891` (triggered on Directive 113 starting commit `09be451`), all four CI jobs failed during Step 4 (`Install dependencies`) with:
```text
npm error code EBADPLATFORM
npm error notsup Unsupported platform for lightningcss-win32-x64-msvc@1.32.0: wanted {"os":"win32","cpu":"x64"} (current: {"os":"linux","cpu":"x64"})
```
**Forensic Root Cause:**
Line 297 of root `package.json` explicitly declared `"lightningcss-win32-x64-msvc": "^1.32.0"` under direct root `dependencies`. Because it was declared as a direct dependency rather than allowing `lightningcss` to manage its platform binaries via `optionalDependencies`, `npm ci` on Linux treated the Windows-only binary as mandatory, failing closed.

### 2.2 Surgical Remediation & Lockfile Integrity
1. Removed line 297 (`"lightningcss-win32-x64-msvc": "^1.32.0"`) from root `package.json`.
2. Regenerated `package-lock.json` cleanly via `npm install --package-lock-only`, ensuring `lightningcss-win32-x64-msvc` is scoped under `node_modules/lightningcss.optionalDependencies` with `"optional": true` (line 14276).
3. Zero use of `--force` or `--legacy-peer-deps`.
4. Mobile WebRTC compatibility (`@config-plugins/react-native-webrtc@^13.0.0` with Expo 54) preserved.
5. Hardened `EXECUTION_STATE.md` with:
   ```text
   IMPLEMENTATION_AUTHORIZATION:         NO
   IMPLEMENTATION_AUTHORIZATION_COMMIT:  NONE
   ```

### 2.3 Remote Verification in GitHub Actions (Run `39290879767`)
Pushed remediation commit `39b1359e90afc4a0c76a8ecaf53045ebe62f17df` to `origin/master`.
Remote workflow execution results across all four jobs:

| CI Job | Clean Install (`npm ci`) | Job Status | Step Breakdown & Forensic Diagnosis |
| :--- | :---: | :---: | :--- |
| **Typecheck** | **SUCCESS** | **SUCCESS (100% PASS)** | Build shared (PASS), Typecheck API (PASS), Typecheck shared (PASS), Typecheck mobile (PASS). |
| **Test (20)** | **SUCCESS** | **FAILURE (DOWNSTREAM)** | Build shared (PASS), Test shared (PASS), Test Environment Separation (PASS), Test API (FAILED: 21 suites / 360 tests passed, 9 suites failed expecting live staging database connection). |
| **Lint** | **SUCCESS** | **IN_PROGRESS / EVALUATED** | Install dependencies (PASS), Prettier check (IN_PROGRESS). |
| **Governance & Drift Integrity** | **SUCCESS** | **FAILURE (DOWNSTREAM)** | Install dependencies (PASS), Verify Governance Consistency (FAILED at line 42: `actions/checkout@v4` shallow clone `fetch-depth: 1` caused `git log 795b9af` to fail with `fatal: bad revision '795b9af'`). |

**Conclusion:** The Linux clean-install platform blocker is 100% resolved. Clean installation succeeded on the Linux runner across all four jobs. Downstream step failures are strictly distinct from the clean-install blocker.

---

## 3. Phase 2 — 18-Domain Comprehensive Architectural Inventory

```
+----------------------------------------------------------------------------------------------------+
|                                    18 CANONICAL DOMAIN INVENTORY                                   |
+----+-----------------------+-----------------------------+--------------------------+--------------+
| ID | Domain Name           | Canonical Relational Schema | Legacy In-Memory / Seed  | Coverage     |
+----+-----------------------+-----------------------------+--------------------------+--------------+
| 1  | States & UTs          | states (001, 003, 040)      | STATE_RAW_MAP (31 seeds) | Complete     |
| 2  | Districts             | districts (001, 040)        | Census 2011 640 dist JSON| Complete     |
| 3  | Assembly Constituencies| constituencies, versions(41)| 4,123 AC TS seed files   | Complete     |
| 4  | Parliamentary Const.  | parliamentary_const (040)   | mp-profiles.ts (543 seats| Complete     |
| 5  | RS & Leg. Councils    | elected_tenures (050)       | None (zero seeds)        | Schema Only  |
| 6  | Officeholders/MLAs/MPs| canonical_persons, tenures  | legislator_profiles (012)| Partial (TS) |
| 7  | Political Parties     | political_organizations(65) | parties.ts (30 parties)  | 1,207 Org Cat|
| 8  | Elections & Contests  | election_events, contests   | election-history.ts      | Partial (TS) |
| 9  | Election Results      | candidacies, ballot_choices | winner2025..2020 chains  | Partial (TS) |
| 10 | Defections & Timeline | tenure_party_switches (050) | telangana-timeline.ts    | TS Only      |
| 11 | Geometries / Maps     | entity_geometries (048/049) | public/geo/*.json        | 589 Polygons |
| 12 | Delimitation Subsystem| delimitation_proposals (055)| mobile/stores/delim.ts   | Nat'l Engine |
| 13 | News Ingestion        | news_articles (015/033)     | In-memory cache (21 RSS) | 3/11 Stages  |
| 14 | Localization (i18n)   | None (Client Dictionaries)  | 13 locales (2,128 keys)  | 100% Parity  |
| 15 | Multilingual Search   | global_search RPC (020/036) | searchConstituencies TS  | Partial (RPC)|
| 16 | AI & Sentiment        | None (External SDKs)        | Hardcoded TS prompt ctx  | TS Only      |
| 17 | Local Governance      | local_bodies, wards (022)   | local-body-reps.ts       | TS Stubs Only|
| 18 | API Gateway & SaaS    | saas_tenants, usage (056-58)| /api/vsaas/v1/... (138)  | Complete     |
+----+-----------------------+-----------------------------+--------------------------+--------------+
```

### Detailed Domain Inventory

#### Domain 1: States & Union Territories
- **Files:** `apps/api/src/services/stateData.ts`, `apps/api/src/routes/states.ts`, `data/seed/*-constituencies.ts`
- **Database Tables:** `states` (Migrations 001, 003, 040)
- **Services & Routes:** `stateData.ts`, `states.ts`, `saasV1.ts` (`/api/vsaas/v1/states`)
- **Consumers:** Mobile `ActiveStateStore`, Mobile `StateSelectorModal`, B2B SaaS Clients
- **Coverage Status:** 31 States and UTs configured in `STATE_RAW_MAP` and relational catalog.

#### Domain 2: Districts
- **Files:** `apps/api/src/services/delimitationService.ts`, `data/census/india-district-population-2011.json`
- **Database Tables:** `districts` (Migrations 001, 040)
- **Services & Routes:** `delimitationService.ts`, `spatialRuntimeService.ts`
- **Consumers:** Mobile `ConstituencyExplorer`, Fastify Delimitation Engine
- **Coverage Status:** 640 statutory districts from Census 2011 PCA dataset.

#### Domain 3: Assembly Constituencies (AC)
- **Files:** `apps/api/src/routes/constituencies.ts`, `apps/api/src/services/stateData.ts`, `data/seed/*-constituencies.ts`
- **Database Tables:** `constituencies`, `assembly_constituency_versions` (Migrations 001, 003, 040, 041)
- **Services & Routes:** `stateData.ts`, `constituencies.ts`, `saasV1.ts` (`/api/vsaas/v1/constituencies`)
- **Consumers:** Mobile `app/constituency/[id].tsx`, B2B SaaS Gateway
- **Coverage Status:** 4,123 assembly constituencies across 31 TS files. Geometry exists; political metadata bifurcated.

#### Domain 4: Parliamentary Constituencies (PC)
- **Files:** `apps/api/src/routes/geoRuntime.ts`, `data/seed/mp-profiles.ts`, `apps/mobile/lib/data.ts`
- **Database Tables:** `parliamentary_constituencies` (Migrations 001, 040)
- **Services & Routes:** `spatialRuntimeService.ts`, `geoRuntime.ts`
- **Consumers:** Mobile Parliament screen (`app/parliament/index.tsx`)
- **Coverage Status:** 543 Lok Sabha seats loaded with basic representative profiles.

#### Domain 5: Rajya Sabha & Legislative Councils (RS/LC)
- **Files:** `packages/shared/src/contracts/political.ts`, `supabase/migrations/050_political_entity_model.sql`
- **Database Tables:** `elected_tenures` (`chamber='RAJYA_SABHA'` or `'LEGISLATIVE_COUNCIL'`)
- **Services & Routes:** `politicalEntityService.ts` (schema stub)
- **Consumers:** None (Not surfaced in Mobile UI)
- **Coverage Status:** Schema defined; zero records populated.

#### Domain 6: Officeholders / MLAs / MPs
- **Files:** `apps/api/src/routes/constituencies.ts`, `apps/api/src/services/politicalEntityService.ts`, `data/seed/*-mla-profiles.ts`
- **Database Tables:** `canonical_persons`, `elected_tenures` (050), `legislator_profiles` (012 legacy)
- **Services & Routes:** `politicalEntityService.ts`, `constituencies.ts`, `saasV1.ts`
- **Consumers:** Mobile `app/legislator/[id].tsx`, `CandidateExplorer`
- **Coverage Status:** Telangana has complete 119 profiles with criminal, wealth, and term records. Other 30 states have name/party strings only.

#### Domain 7: Political Parties & Organizations
- **Files:** `apps/api/src/services/politicalEntityService.ts`, `data/seed/parties.ts`, `reports/w021_5b2_canonical_org_catalog_raw.json`
- **Database Tables:** `political_organizations` (050), `political_parties` (001)
- **Services & Routes:** `politicalEntityService.ts`, `saasV1.ts` (`/api/vsaas/v1/parties`)
- **Consumers:** Mobile party badges, Delimitation political shifts, SaaS clients
- **Coverage Status:** 1,207 Canonical Organization Catalog prepared in W021.5-B2.2C (C0: 1, C1: 107, C2: 10, C3: 27, C4: 19, C5: 1043).

#### Domain 8: Elections & Contests
- **Files:** `apps/api/src/services/electionService.ts`, `apps/api/src/routes/elections.ts`, `data/seed/*-election-history.ts`
- **Database Tables:** `election_events`, `election_contests` (051)
- **Services & Routes:** `electionService.ts`, `elections.ts`, `saasV1.ts`
- **Consumers:** Mobile `stores/electionLive.ts`, `ElectionHistoryTab`
- **Coverage Status:** Telangana (2014, 2018, 2023) and Andhra Pradesh (2019, 2024) modeled; others stubbed.

#### Domain 9: Election Results & Margin Truth
- **Files:** `apps/api/src/services/stateData.ts`, `data/evidence/w019/canonical_benchmarks.json`
- **Database Tables:** `candidacies`, `ballot_choices` (051, 053, 054)
- **Services & Routes:** `stateData.ts` (`getConstituencyElectionData`), `electionService.ts`
- **Consumers:** Mobile Constituency Screen, Delimitation Analysis
- **Coverage Status:** Certified benchmarks for Kodangal (AC-065, margin 32,532) and Gajwel (AC-040, margin 45,031; Eatala Rajender 66,653 vs corrupted 91,753 identified in W019).

#### Domain 10: Political Defections & Timeline Events
- **Files:** `apps/api/src/services/politicalEntityService.ts`, `data/seed/telangana-political-timeline.ts`
- **Database Tables:** `tenure_party_switches`, `organization_relationships` (050)
- **Services & Routes:** `politicalEntityService.ts`, `saasV1.ts` (`/api/vsaas/v1/entities/:id/timeline`)
- **Consumers:** Mobile Political Timeline UI
- **Coverage Status:** Populated for Telangana (50+ verified defection events); zero records for all other 30 states.

#### Domain 11: Geography & Spatial Boundaries
- **Files:** `apps/api/src/routes/geoRuntime.ts`, `apps/api/src/routes/geo.ts`, `apps/api/public/geo/*.json`
- **Database Tables:** `entity_geometries` (589 SHA-256 verified rows in Migrations 048/049)
- **Services & Routes:** `spatialRuntimeService.ts`, `geoRuntime.ts`
- **Consumers:** Mobile MapLibre screen, Delimitation boundary visualizer
- **Coverage Status:** 589 polygons validated in PostGIS (Telangana 119 ACs + 17 PCs complete; national coverage partial).

#### Domain 12: Delimitation Subsystem
- **Files:** `apps/api/src/services/delimitationService.ts`, `apps/api/src/services/delimitationQueryService.ts`, `apps/mobile/stores/delimitation.ts`
- **Database Tables:** `delimitation_proposals`, `delimitation_scenarios` (011, 055)
- **Services & Routes:** `delimitationService.ts`, `delimitationQueryService.ts`, `apps/api/src/routes/delimitation.ts`
- **Consumers:** Mobile Delimitation Screen, B2B SaaS Gateway
- **Coverage Status:** Complete national mathematical engine; `getMlaImpact` contains Telangana residue.

#### Domain 13: News Ingestion Subsystem
- **Files:** `apps/api/src/services/news/newsService.ts`, `apps/api/src/services/news/rssParser.ts`, `apps/api/src/services/news/sources.ts`, `apps/api/src/routes/news.ts`
- **Database Tables:** `news_articles`, `news_sources` (Migrations 015, 033 - currently unwritten by runtime)
- **Services & Routes:** `newsService.ts`, `news.ts`
- **Consumers:** Mobile News feed screen, Constituency News widget
- **Coverage Status:** 21 RSS feeds; operates strictly in memory cache. 3 of 11 pipeline stages implemented.

#### Domain 14: Multilingual & Localization (i18n)
- **Files:** `apps/mobile/i18n/index.ts`, `apps/mobile/i18n/locales/*.ts`, `scripts/verify-13-locales.mjs`
- **Database Tables:** None (Client-side static dictionaries)
- **Services & Routes:** `verify-13-locales.mjs`
- **Consumers:** Mobile UI (All screens)
- **Coverage Status:** 13 Indian languages with 2,128 keys (100% parity verified).

#### Domain 15: Multilingual Search & Indexing
- **Files:** `supabase/migrations/020_foundation_hardening.sql`, `supabase/migrations/036_foundation_and_grants_repair.sql`, `apps/api/src/services/stateData.ts`
- **Database Tables:** `global_search` RPC (PostgreSQL Full-Text Search)
- **Services & Routes:** `global_search` RPC, `searchConstituencies` in `stateData.ts`
- **Consumers:** Mobile SearchBar, B2B SaaS Gateway
- **Coverage Status:** In-memory substring search works across 31 seed files; database RPC has known SQL union defect (PostgreSQL error 0A000).

#### Domain 16: AI & Sentiment Intelligence
- **Files:** `apps/api/src/services/ai.ts`, `apps/api/src/routes/ai.ts`
- **Database Tables:** None (External OpenAI/Anthropic APIs)
- **Services & Routes:** `ai.ts`, `routes/ai.ts`
- **Consumers:** Mobile Civic Chatbot, Constituency AI Summary
- **Coverage Status:** Hardcoded exclusively to Telangana (119 seats, 2023 summary).

#### Domain 17: Local Governance (Panchayats & Municipalities)
- **Files:** `supabase/migrations/022_panchayat_wards_and_local_gov.sql`, `data/seed/local-body-representatives.ts`
- **Database Tables:** `local_bodies`, `local_body_wards`, `local_body_representatives` (Migration 022)
- **Services & Routes:** `spatialRuntimeService.ts` (stub)
- **Consumers:** Mobile LocalGov screen (stub)
- **Coverage Status:** Schema defined; Telangana municipal stubs only.

#### Domain 18: API Gateway & B2B SaaS Layer
- **Files:** `apps/api/src/routes/saasV1.ts`, `apps/api/src/lib/saasAuthPlugin.ts`, `apps/api/src/lib/saasCrypto.ts`, `apps/api/src/lib/saasRateLimiter.ts`, `apps/api/openapi-saas-v1.yaml`
- **Database Tables:** `saas_tenants`, `saas_api_keys`, `saas_usage_ledger` (Migrations 056, 057, 058)
- **Services & Routes:** Fastify `/api/vsaas/v1/...` (138 routes)
- **Consumers:** B2B Tenants, API Partners
- **Coverage Status:** Complete, hardened enterprise SaaS layer.

---

## 4. Phase 3 — Architectural Residue Taxonomy (5 Discrete Categories)

All identified residue across code, configuration, data files, schemas, and routes is classified into strictly one of five categories:

### Category 1: `LEGITIMATE`
*Architectural entities that must remain permanently in the codebase.*
1. **`PANIN_SCENARIO` & Brand Identity (`apps/api/openapi-saas-v1.yaml`, `packages/shared/src/contracts/delimitation.ts`):** Official statutory scenario classification enum and enterprise B2B product brand namespace.
2. **`TG` vs `TS` ISO Normalization (`apps/api/src/routes/saasV1.ts` line 63):** Gateway interoperability function mapping official ISO 3166-2:IN code `TG` to internal postal/historical code `TS`.
3. **Confirmed October 2026 By-Election Overrides (`apps/api/src/services/stateData.ts` lines 60-76):** Statutory evidence for confirmed by-elections (TN AC 35, 101; WB AC 210, 70; PY AC 9). Must be migrated to database by-election records in Stage C/D.

### Category 2: `CURRENT_AND_CORRECT`
*Architectural subsystems that are mathematically sound, secure, and production-ready.*
1. **Statutory Delimitation Math Engine (`apps/api/src/services/delimitationService.ts`):** Hamilton largest-remainder methodology, Article 332 SC/ST allocation, and Article 82/170 legal applicability constraints are mathematically sound and national.
2. **13-Language i18n Locales (`apps/mobile/i18n/locales/*.ts`):** 2,128 localized keys across 13 Indian languages with 100% key parity verified by `scripts/verify-13-locales.mjs`.
3. **MapLibre Compatibility Layer (`apps/mobile/lib/maplibreCompat.tsx`):** Clean open-source compatibility wrapper replacing proprietary Mapbox SDKs with zero proprietary API key leakage.
4. **Canonical 1,207 Political Organizations Catalog (`reports/w021_5b2_canonical_org_catalog_raw.json`):** ECI-aligned canonical catalog verified under W021.5-B2.2C.
5. **Fastify SaaS Gateway Layer (`apps/api/src/routes/saasV1.ts`):** Multi-tenant HMAC/token authentication, usage ledgers, and OpenAPI specification.

### Category 3: `LEGACY_BUT_SAFE`
*Historical or offline assets that do not corrupt live runtime transactions but will eventually be archived.*
1. **Historical UI Localization Keys (`apps/mobile/i18n/locales/*.ts` line 146):** Keys like `"winner2023"` provide labels for viewing historical 2023 election results in mobile tabs.
2. **MyNeta Offline Scrapers (`scrapers/myneta-*.js`):** Historic batch scraping utilities for candidate affidavits. Decoupled from runtime; safe for documentation and provenance.
3. **Static Seed TS Files (`data/seed/*-constituencies.ts`, `data/seed/*-mla-profiles.ts`):** Frozen static seed arrays (>25MB). Safe until Stage C/D relational database ingestion completes.

### Category 4: `LEGACY_AND_MUST_REMOVE`
*Architectural defects, fragile fallback chains, or duplicate logic that must be eliminated in Stage B/C.*
1. **ConstituencyBrief Winner Fallback Chain (`apps/api/src/services/stateData.ts` lines 57-58):** Chaining `c.winner2025 ?? c.winner2024 ?? c.winner2023 ?? c.winner2022 ?? c.winner2021 ?? c.winner ?? ''` conflates election outcomes with immutable geometry. Must be replaced with queries to `candidacies` and `elected_tenures`.
2. **Legislator Profiles `is_current_member` Mutable Boolean (`supabase/migrations/012_legislator_profiles.sql` line 38):** Unindexed mutable boolean breaks temporal integrity and election auditability. Completely superseded by `elected_tenures` in Migration 050.
3. **Mobile Delimitation Store Hardcoded Constants (`apps/mobile/stores/delimitation.ts` lines 25, 77, 88):** Mobile client duplicates server apportionment logic with static seat constants (`543`, `119`, `175`, `224`). Must be de-scoped to consume Fastify API.
4. **Mobile Civic Metrics Hardcoded 119 Seats (`apps/mobile/stores/civicMetrics.ts` lines 82-84):** Mock civic scoreboard defaults `totalLegislators` to 119 and `totalACs` to 119, breaking in all other 30 states.
5. **Internal API Route Hardcoded `c.winner2023` (`apps/api/src/routes/constituencies.ts` lines 36, 48):** Internal API route assumes 2023 is the sole election cycle.

### Category 5: `CURRENT_BUT_NEEDS_REFACTOR`
*Active production services that function properly for Telangana but suffer from tight geographic coupling.*
1. **Multi-State Data Access Service (`apps/api/src/services/stateData.ts`):** Configures 31 states but exports Telangana-specific helpers (`getTSRawSeeds`, `getTSElectionHistory`, `getTSMLAProfiles`) and mixes procedural by-election overrides with common accessors.
2. **Delimitation MLA Impact Analysis (`apps/api/src/services/delimitationService.ts` lines 1325-1360):** `getMlaImpact` explicitly aborts for any `stateCode !== 'TS'` and binds to `TELANGANA_CONSTITUENCIES` with manual Kodangal/Gajwel overrides.
3. **AI Prompt & Context Generator (`apps/api/src/services/ai.ts` lines 9-97):** System prompt and constituency context generator are hardcoded to Telangana 119 seats and 2023 results, unable to serve any of the other 30 states.

---

## 5. Phase 4 — Subsystem Deep-Dive Forensics

### 5.1 `apps/api/src/services/stateData.ts`
- **Total States Supported:** 31 (28 States + 3 UTs with Legislative Assemblies: Delhi, Puducherry, Jammu & Kashmir).
- **Total Assembly Constituencies Loaded:** 4,123.
- **Winner Fallback Chain:** Lines 57–58 (`c.winner2025 ?? c.winner2024 ?? ...`). Masks candidate contest history; treats election winners as static constituency attributes.
- **By-Election Overrides:** Lines 60–76 contain procedural hardcoding for 5 specific seats (TN AC 35, 101; WB AC 210, 70; PY AC 9). These overrides reflect real ground truth but belong in database-backed election contests.
- **State-Specific Leakage:** Lines 196–208 export Telangana-specific functions. Lines 338–463 implement hardcoded historical results branching for 8 states (TS, AP, KA, MH, TN, KL, WB, UP) while emitting zero historical records for the remaining 23 states.

### 5.2 `apps/api/src/services/delimitationService.ts` & `delimitationQueryService.ts`
- **Authoritative Math Core:** Hamilton largest-remainder method with quota safety (`MAX_SAFE_REQUESTED_SEATS = 10000`). Article 332 SC/ST reservation logic mathematically decoupled from allocation remainder assignment.
- **Statutory Baselines:** Byte-exact legal chain: 2008 ECI Delimitation Order $\to$ APRA 2014 $\to$ G.S.R. 311(E) (2015) $\to$ ECI Notification 282/AP/2018(DEL) $\to$ Current Telangana Geography.
- **Telangana Residue:** `getMlaImpact` (line 1327) returns `null` for any `stateCode !== 'TS'`. Lines 1344–1360 inject hardcoded benchmarks for Kodangal (`AC-065`, margin 32,532) and Gajwel (`AC-040`, margin 45,031).
- **Client Duplication:** `apps/mobile/stores/delimitation.ts` duplicates simulation math with static constants (`119`, `543`).

### 5.3 `apps/api/src/services/ai.ts`
- **System Prompt Scope:** Lines 9–46 explicitly restrict the assistant's factual grounding to Telangana (`"Telangana: 119 assembly constituencies, 2023 election results"`, `"2023 saw a dramatic anti-incumbency wave against BRS"`).
- **Context Builder Scope:** `buildConstituencyContext` (lines 49–98) only queries `TELANGANA_CONSTITUENCIES`, `getConstituencyHistory`, `getMLAProfile`, `getConstituencyDemographics`, and `getConstituencyTimeline`. Passing any non-Telangana constituency results in empty or corrupted context.

### 5.4 News Ingestion Pipeline (`apps/api/src/services/news/`)
Evaluation against the 11 canonical news pipeline stages:

| Stage # | Pipeline Stage | Implementation Status | Technical Details |
| :---: | :--- | :---: | :--- |
| 1 | **Source Registry / Feed Discovery** | **IMPLEMENTED** | 21 curated RSS feeds defined in `sources.ts` (8 National EN, 5 State EN [TS, AP, TN, KA, KL], 2 Hindi, 1 Tamil). |
| 2 | **Ingestion / Transport** | **IMPLEMENTED** | HTTP XML retrieval implemented via `fetchFeedXml` in `rssParser.ts`. |
| 3 | **RSS / Atom Parsing** | **IMPLEMENTED** | XML feed parsing implemented in `parseFeed` (`rssParser.ts`). |
| 4 | **Deduplication** | **PARTIAL** | SHA1 URL hashing (`hashId`) eliminates exact URL duplicates. Zero semantic or cross-source title clustering. |
| 5 | **Content Extraction / Scraping** | **MISSING** | Ingests RSS `<description>` summary tags only. Zero full-text article body scraping or readability extraction. |
| 6 | **Entity Extraction / NER** | **MISSING** | `constituencyId` exists on `NewsItem` interface but is never populated by NLP or NER extractors. |
| 7 | **Topic Classification** | **PARTIAL** | Static category assigned at source feed level. Zero per-article NLP text categorization. |
| 8 | **Sentiment & Bias Analysis** | **MISSING** | Zero sentiment, political bias, or stance detection implemented. |
| 9 | **Geolocation & Bounding** | **PARTIAL** | `stateCode` attached from feed source metadata. Zero district or assembly constituency spatial resolution. |
| 10 | **Database Persistence & Archival** | **MISSING** | Operates strictly in an in-memory cache (`cache: NewsFeed`). Database tables `news_articles` and `news_sources` (015/033) remain completely unwritten. |
| 11 | **Search & Push Notification** | **MISSING** | `getFeed` performs basic JavaScript in-memory array filtering. Zero PostgreSQL full-text search indexing or push dispatching. |

**Summary:** 3 Implemented, 3 Partial, 5 Missing. The subsystem operates as a transient in-memory cache with zero database persistence.

---

## 6. Phase 5 — Mandatory Governance Invariants & Discrepancy Statement

1. **Rule IV-001 Non-Self-Acceptance:**
   Formal CTO acceptance of W021.5 remains strictly **0.0% (`UNACCEPTED`)**. The implementing agent certifies technical audit findings but explicitly refrains from self-granting acceptance.
2. **Production Air-Gap Preservation:**
   Live production database (`ehfafcnimmjusyvplbah`) execution remains strictly **0.0% (`AIR_GAPPED_UNEXECUTED`)**.
3. **Completion Accounting:**
   Repository-verified earned completion remains strictly **61.500%** (38.500% unearned/blocked, total 100.000%).
4. **Financial Defect `DQ-W021.5-B2.2E-001`:**
   Remains strictly **OPEN** awaiting explicit CTO financial adjudication.
5. **Telangana AC 119 Boundary Defect:**
   Remains strictly **OPEN / BLOCKED** (1.5% allocated weight).
6. **SQL Migration & Seed Immutability:**
   All 68 SQL migrations match baseline `0ea572d` byte-for-byte identical. All 31 MLA profile seeds match baseline `fb408ce` byte-for-byte identical.
7. **Strict Stage A Stop Condition:**
   Stages B through I have NOT been executed. No database tables were mutated, no schema migrations were generated, and no application breaking changes were introduced.

---

## 7. Next Permitted Actions & Independent Review Request

Under Master Execution Framework Amendment v1.2 / Rule IV-001:
- **This Directive 114 Stage A execution is SUBMITTED FOR INDEPENDENT CTO REVIEW.**
- **Stages B through I remain STRICTLY BLOCKED pending separate, explicit CTO authorization.**
