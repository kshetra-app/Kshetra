# PANIN / KSHETRA — DATA GOVERNANCE & PROVENANCE INVENTORY
## Job W012 Preflight Discovery Artifact (Final Corrections per CTO Directive)

- **Date:** 2026-09-22
- **Repository:** `kshetra-app/Kshetra`
- **Branch:** `master`
- **Current Artifact Commit:** `4e139eb3b4eede1163561f2780a454ccdb57ff60`
- **Preceding Correction Baseline:** `caef871516b252f4121a10ee84d4b4e4e2d2857a` (Pre-implementation correction baseline)
- **Historical Discovery Baseline:** `ee87ec72cef81d724abf928ee250c19033ee9d41` (Initial preflight discovery commit)
- **Accepted W011 Baseline:** `5bee882f32bbd77875c1f2b2f558abfeaeee719d`
- **Working Tree Status:** Clean (0 uncommitted changes)
- **Execution Mode:** READ-ONLY PREFLIGHT (Zero mutations, Zero migrations, Zero application code edits)

---

## 1. Executive Summary & Authorization Boundary

Pursuant to the CTO Preflight Directive, Pre-Implementation Correction Directives, and final pre-implementation review under the Master Execution Document, this artifact provides an authoritative, source-of-truth inspection of the existing data architecture across the PANIN / Kshetra repository.

### Authorization Boundary
- **W012 Preflight:** **ACCEPTED — SUBSTANTIALLY COMPLETE** (Subject to these final pre-implementation corrections).
- **W012 Implementation Authorization:** **NOT YET GRANTED — AWAITING FINAL CTO REVIEW** (Zero database migrations, zero schema edits, zero backend route changes, zero UI modifications, zero deployments).
- **Migration 039:** **NOT AUTHORIZED / NOT CREATED**.
- **W013–W017 & W052:** **NOT AUTHORIZED**.

---

## 2. Methodology & Files Inspected

Every finding in this inventory is grounded strictly in source-of-truth inspection of the repository at the authoritative baseline commit `4e139eb3b4eede1163561f2780a454ccdb57ff60`.

### Primary Subsystems & Files Inspected
1. **Database Migrations (`supabase/migrations/**` — 40 files / 151 tables):**
   - `001_initial_schema.sql` (states, constituencies, elections, election_results)
   - `004_civic_dashboard.sql` (civic_issues, headlines)
   - `006_trust_safety.sql` (audit_log, moderation_actions, user_profiles)
   - `008_election_affidavits.sql` (candidate_affidavits, affidavit_criminal_cases)
   - `009_promise_tracker.sql` (election_promises, promise_updates)
   - `011_delimitation.sql` (delimitation_proposals, proposed_constituencies, constituency_mapping)
   - `012_legislator_profiles.sql` (legislator_profiles, legislator_events, scraper_runs)
   - `013_content_accountability.sql` (creator_kyc_records, action_fingerprints)
   - `015_journalist_platform.sql` (articles, fact_checks, breaking_news)
   - `018_enhanced_civic.sql` (bills, government_schemes, development_projects, rti_requests)
   - `019_live_election.sql` (live_elections, live_candidate_results, data_pipeline_status)
   - `022_administrative_hierarchy.sql` (mandals, gram_panchayats, polling_booths, local_body_candidates)
   - `023_local_body_representatives.sql` (urban_local_bodies, representatives, representative_edits)
   - `024_live_media_exchange.sql` (live_events, live_event_ai, lmx_credibility)
   - `030_trai_opt_outs.sql` & `038_security_baseline_and_rls_hardening.sql` (PII protection & RLS)
2. **Backend API & Services (`apps/api/src/**`):**
   - `apps/api/src/services/news/sources.ts` (Hardcoded RSS news source registry)
   - `apps/api/src/services/news/newsService.ts` (RSS aggregator, in-memory deduplication & caching)
   - `apps/api/src/services/ai.ts` (Grounded chat service, in-memory prompt injection defense)
   - `apps/api/src/routes/news.ts`, `geo.ts`, `constituencies.ts`, `delimitation.ts`, `civic.ts`, `ai.ts`
3. **Scrapers, Seeds & Ingestion Pipelines:**
   - 30 scraper scripts in `scrapers/` (AP SEC, TS SEC, LGD, MyNeta, PRS, Sansad, Wikipedia, data.gov.in)
   - 3 monitor scripts in `scripts/monitors/` (`eci-monitor.ts`, `gazette-monitor.ts`, `parliament-monitor.ts`)
   - Scraper output catalogs: `scrapers/output/myneta/*.json`, `scrapers/output/local-body/*.json`
   - Static seeds: `data/seed/*.ts`, `data/geo/*.geojson`, `data/geo/ATTRIBUTION.md`
4. **Validation & Quality Scripts:**
   - `scripts/audit-data-quality.js` (Duplicate acNo, gender heuristics, winner mismatches)
   - `scripts/validate-data.js` (Duplicate constituencies, age limits [21,90], photo URL HEAD checks)
   - `scripts/validate-news-feeds.mjs` (RSS feed live validation)
5. **Mobile Types & Client Models (`apps/mobile/lib/**`):**
   - `apps/mobile/lib/delimitationTypes.ts` (Boundary redrawing, simulations, seat models)
   - `apps/mobile/lib/supabaseDataService.ts`, `pageService.ts`

---

## 3. Discovered Capabilities Classification Matrix

Each data governance capability is strictly classified into one of the 6 authoritative states:

| Capability Domain | Sub-Capability | Current Implementation | Repository Evidence | Classification |
| :--- | :--- | :--- | :--- | :--- |
| **Source Registry** | Canonical Data Source Catalog | None | `supabase/migrations/**` (No table exists) | `DOES NOT EXIST` |
| **Source Registry** | News RSS Feed Registry | Hardcoded TypeScript array | `apps/api/src/services/news/sources.ts` | `EXISTS — PARTIAL` |
| **Source Registry** | Pipeline Source Operational Status | Seeded monitoring table (9 sources) | `supabase/migrations/019_live_election.sql:86` (`data_pipeline_status`) | `EXISTS — PARTIAL` |
| **Source Registry** | Geographic Shapefile Attribution | Static markdown document | `data/geo/ATTRIBUTION.md` | `EXISTS — PARTIAL` |
| **Data Status Model** | Universal Factual Status Enum (`OFFICIAL`, `DERIVED`, `VERIFIED`, `ESTIMATE`, `SCENARIO`, `INFERRED`, `UNVERIFIED`, `UNKNOWN`) | None | No system-wide enum or check constraint | `DOES NOT EXIST` |
| **Data Status Model** | Local Body Representative Status | Check constraint (`verified`, `data_pending`, `crowdsourced_unverified`) | `supabase/migrations/023_local_body_representatives.sql:374` | `EXISTS — PARTIAL` |
| **Data Status Model** | Legislator Profile Verification Status | Check constraint (`verified`, `partial`, `unverified`) | `supabase/migrations/012_legislator_profiles.sql:124` | `EXISTS — PARTIAL` |
| **Data Status Model** | Delimitation Proposal Status | Workflow enum (`draft`, `final`, `superseded`, `rejected`) | `supabase/migrations/011_delimitation.sql:15` | `EXISTS — NOT SUITABLE` |
| **Data Status Model** | Scraper Output Election Winner Status | Raw boolean `isWinner: true` on unheld 2026 elections | `scrapers/output/myneta/TamilNadu2026.json:11` | `EXISTS — DEFECTIVE` |
| **Provenance Model** | Canonical Record Provenance Structure | None | No universal linkage to dataset/version/source/transform | `DOES NOT EXIST` |
| **Provenance Model** | Local Body Representative Edit Audit | Edit diff & fingerprint table | `supabase/migrations/023_local_body_representatives.sql:404` (`representative_edits`) | `EXISTS — PARTIAL` |
| **Provenance Model** | Trust & Safety Action Audit Log | Actor-based moderation log | `supabase/migrations/006_trust_safety.sql:82` (`audit_log`) | `EXISTS — NOT SUITABLE` |
| **Dataset & Versioning** | Dataset Entity Registry | None | No `datasets` table | `DOES NOT EXIST` |
| **Dataset & Versioning** | Immutable Version Snapshots | None | No `dataset_versions` or checksum storage | `DOES NOT EXIST` |
| **Transformation Lineage** | Pipeline Transformation Tracking | None | Transformations run via unrecorded imperative scripts | `DOES NOT EXIST` |
| **Transformation Lineage** | Scraper Execution Logging | Run metrics table (counts, errors) | `supabase/migrations/012_legislator_profiles.sql:254` (`scraper_runs`) | `EXISTS — PARTIAL` |
| **Freshness & Effective Dates** | Ingestion Freshness Monitoring | Freshness enum on pipelines | `supabase/migrations/019_live_election.sql:90` | `EXISTS — PARTIAL` |
| **Freshness & Effective Dates** | Domain Event Dates | Isolated domain dates (`sanctioned_date`, `filed_date`) | `008_election_affidavits.sql`, `018_enhanced_civic.sql` | `EXISTS — PARTIAL` |
| **Freshness & Effective Dates** | Geographic/Entity Validity Intervals (`effective_from`, `effective_to`) | None | Constituencies & administrative units have no temporal validity | `DOES NOT EXIST` |
| **Source Attribution** | Consumer-facing Source Transparency | URLs exposed in News & Legislator APIs | `apps/api/src/routes/news.ts`, `012_legislator_profiles.sql` | `EXISTS — PARTIAL` |
| **Data Quality** | Ad-hoc Validation Scripts | Name, gender, age, photo checks | `scripts/audit-data-quality.js`, `scripts/validate-data.js` | `EXISTS — PARTIAL` |
| **Data Quality** | Continuous Automated Integrity Pipeline | None | No automated CI/CD gate or runtime validation contracts | `DOES NOT EXIST` |
| **Privacy Boundary** | Public Civic vs PII Separation | Table segregation & RLS hardening | `013_content_accountability.sql`, `038_security_baseline_and_rls_hardening.sql` | `EXISTS — PARTIAL` |
| **AI Data Boundary** | AI Content Segregation | Isolated `live_event_ai` table & in-memory chat grounding | `024_live_media_exchange.sql:198`, `apps/api/src/services/ai.ts` | `EXISTS — PARTIAL` |

---

## 4. Source Registry & Separation of Authority, Status, Transformation, and Verification

### A. Current State: `DOES NOT EXIST` (Canonical DB Registry)
The repository does not possess a centralized, unified data source registry table in PostgreSQL.

### B. Normalized Source Authority Taxonomy
To eliminate taxonomy drift and prevent unclassified vocabulary, the source authority taxonomy is strictly defined using the following 6 canonical categories:

```sql
CREATE TYPE source_authority_enum AS ENUM (
  'constitutional',   -- e.g. Election Commission of India (ECI)
  'statutory',        -- e.g. State Election Commissions, Census of India, Survey of India
  'academic',         -- e.g. Trivedi Centre (TCPD) / Ashoka University
  'media_ngo',        -- e.g. Association for Democratic Reforms (ADR/MyNeta), Press Outlets
  'crowdsourced',     -- e.g. Community repositories, citizen contributors, GitHub repos
  'synthetic_model'   -- e.g. Internal algorithmic simulation, test fixture generation
);
```

### C. Explicit Separation: Four Orthogonal Governance Dimensions
A fundamental architectural principle of PANIN data governance is the strict separation of four orthogonal dimensions:
$$\mathbf{Source\ Authority} \ne \mathbf{Data\ Status} \ne \mathbf{Transformation\ /\ Dataset\ Type} \ne \mathbf{Verification\ State}$$

1. **Source Authority (`source_authority_enum`):** Pertains strictly to the institutional standing and legal basis of the publisher/origin entity.
   - For example, Association for Democratic Reforms (ADR / MyNeta) is an NGO publisher, classified as `media_ngo`.
   - The publisher is **never** classified as `synthetic_model` merely because an analytical projection or simulation dataset was built from or hosted on its platform.
2. **Data Status (`data_status_enum`):** Pertains to the factual certainty of a specific record or version (`OFFICIAL`, `DERIVED`, `VERIFIED`, `ESTIMATE`, `SCENARIO`, `INFERRED`, `UNVERIFIED`, `UNKNOWN`).
   - For unheld future election models (e.g. Tamil Nadu 2026), the factual status is strictly:
     ```text
     data_status = SCENARIO
     ```
3. **Transformation / Dataset Type (`transformation_type`, `domain`):** Pertains to the mathematical or computational operation performed on the data (e.g. `raw_ingest`, `normalization`, `entity_resolution`, `projection_simulation`).
   - The simulation nature of Tamil Nadu 2026 is properly tracked here: `transformation_type = 'synthetic_projection_simulation'`.
4. **Verification State (`verification_state`):** Pertains to whether an independent audit/corroboration has taken place (`unverified`, `partially_verified`, `fully_verified`, `revoked`).
5. **Normalized Geography Source Authority:** The repository source `datta07/INDIAN-SHAPEFILES` (documented in `data/geo/ATTRIBUTION.md`) is classified strictly as:
   ```text
   crowdsourced
   ```
   It carries source authority `crowdsourced` and data status `UNVERIFIED`.
6. **Status Default Invariant:** Newly registered dataset versions and records MUST default strictly to:
   ```text
   UNKNOWN
   ```
   No dataset or record can become `OFFICIAL` merely by virtue of catalog registration.

---

## 5. Data Status Model & Security-Enforced Official Status Transitions

### Current State: `DOES NOT EXIST` (Universal Model) / `EXISTS — DEFECTIVE` (Political Invariants)

The Master Execution Document mandates that PANIN distinguish:
`OFFICIAL`, `DERIVED`, `VERIFIED`, `ESTIMATE`, `SCENARIO`, `INFERRED`, `UNVERIFIED`, `UNKNOWN`.

### Critical Invariant Transitions Blocked:
The system must structurally prohibit unvalidated status elevation:
$$\text{SCENARIO} \not\to \text{OFFICIAL}$$
$$\text{ESTIMATE} \not\to \text{OFFICIAL}$$
$$\text{INFERRED} \not\to \text{OFFICIAL}$$
$$\text{UNVERIFIED} \not\to \text{OFFICIAL}$$
$$\text{UNKNOWN} \not\to \text{OFFICIAL}$$

### Security-Enforced Transition Model:
An ordinary status update cannot elevate records to `OFFICIAL`. A caller-supplied string or unverified `verification_id` alone MUST NOT authorize an `OFFICIAL` transition.

The authoritative transition path is defined as:
$$\mathbf{Actor} \longrightarrow \mathbf{Authorization} \longrightarrow \mathbf{Verification\ Evidence} \longrightarrow \mathbf{Permitted\ Status\ Transition}$$

```
┌────────────────────────────────────────────────────────┐
│               1. ACTOR & AUTHORIZATION                 │
│  - Caller must be authenticated service_role or        │
│    authorized governance admin (session / JWT claim)   │
│  - Ordinary authenticated/anon clients DENIED by RLS   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│               2. VERIFICATION EVIDENCE                 │
│  - Authoritative evidence record in DB                 │
│    (evidence_records table or signed audit entry)      │
│  - Linked directly to target record & dataset version  │
│  - Cryptographic hash of primary source artifact       │
│  - Verifier identity + timestamp logged                │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│             3. DATABASE INVARIANT TRIGGER              │
│  check_status_transition_invariant() executes:         │
│  a. If old_status = 'SCENARIO':                        │
│     PERMANENTLY BLOCK transition to 'OFFICIAL'         │
│  b. If new_status = 'OFFICIAL':                        │
│     Verify evidence record exists in DB                │
│     Verify caller role is authorized service_role      │
│     Verify evidence record hash matches target         │
│     Else: FAIL CLOSED (RAISE EXCEPTION)                │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│             4. STATUS LIFECYCLE STAGES                 │
│  - Record Creation: Defaults strictly to 'UNKNOWN'     │
│  - Ordinary Update: Permitted within non-official      │
│    statuses (e.g. UNKNOWN -> UNVERIFIED -> DERIVED)    │
│  - Verified Elevation: Requires evidence record        │
│  - OFFICIAL Designation: Requires dual proof           │
│    (authorized actor + verified evidence in DB)        │
│  - Correction / Revocation / Supersession:             │
│    Permitted transition from OFFICIAL -> SUPERSEDED   │
│    or OFFICIAL -> REVOKED with audit reason logged     │
└────────────────────────────────────────────────────────┘
```

---

## 6. Provenance Model & Lineage Cardinality Architecture

### Current State: `DOES NOT EXIST` (Canonical Provenance Structure)

### Multi-Source & Multi-Transformation Lineage (Append-Only DAG):
To reflect real-world civic and political data pipelines, the W012 provenance architecture avoids forcing an artificial 1:1 constraint and implements an **append-only Directed Acyclic Graph (DAG)**:

1. **One Governed Record with Multiple Source Records:**
   - A single legislator profile derives facts from multiple sources simultaneously:
     - Electoral victory & vote counts from ECI (`constitutional`);
     - Financial assets and criminal affidavits from ADR / MyNeta (`media_ngo`);
     - Legislative attendance and debates from PRS Legislative Research (`academic`).
   - Modeled via an explicit M:N linkage table: `record_provenance_linkages(domain_table, domain_record_id, provenance_id, is_canonical)`.
2. **One Dataset Version Derived from Multiple Source Datasets:**
   - A merged demographic constituency dataset merges boundary shapes from GIS with census demographics from Census 2011.
   - Modeled via `dataset_version_dependencies(parent_version_id, dependent_version_id)`.
3. **Multi-Input & Sequential Transformations:**
   - Ingestion, parsing, normalization, and enrichment form sequential stages.
   - Each transformation creates an immutable provenance node linked via `parent_provenance_id UUID REFERENCES provenance_records(id)`.
4. **Canonical Provenance Designation:**
   - When multiple provenance records attach to a domain fact, `is_canonical = TRUE` designates the active primary source.
5. **Immutable Append-Only Evidence:**
   - Historical provenance records are **never mutated or overwritten in place**.
   - Corrections append a new provenance record referencing the superseded record, ensuring full historical reconstructability.

---

## 7. Representative Dataset Reconciliation (Actual Repository Evidence)

Reconciling the four representative datasets against actual verified evidence currently present in the repository, with zero manufactured claims and zero invented metadata:

| Requirement | Dataset 1: Geography (Assembly Boundaries) | Dataset 2: Political (MLA Profiles) | Dataset 3: Civic (Bills & Schemes) | Dataset 4: Projection (TN 2026 Simulation) |
| :--- | :--- | :--- | :--- | :--- |
| **Observed Entity** | `constituencies` / `data/geo/telangana-assembly.geojson` | `legislator_profiles` / `data/seed/*-mla-profiles.ts` | `bills`, `government_schemes` / `018_enhanced_civic.sql` | `scrapers/output/myneta/TamilNadu2026.json` |
| **Actual Source** | `datta07/INDIAN-SHAPEFILES` (in `data/geo/ATTRIBUTION.md`) | `myneta.info`, `prsindia.org`, `sansad.in` | Unspecified mock seed in migration 018 | `https://www.myneta.info/TamilNadu2026` (ADR / MyNeta) |
| **Source Authority** | `crowdsourced` (GitHub repository) | `media_ngo` (ADR/MyNeta), `academic` (PRS) | `UNKNOWN` / `NOT ESTABLISHED` | `media_ngo` (ADR / MyNeta publisher) |
| **Dataset Domain / Type** | `geography` | `political_profiles` | `civic_governance` | `election_projection` |
| **Transformation / Treatment** | `raw_shapefile_import` | `web_scrape_profile_build` | `mock_seed_insert` | `synthetic_projection_simulation` |
| **Retrieval Date** | `UNKNOWN` / `NOT ESTABLISHED` | `UNKNOWN` / `NOT ESTABLISHED` | `UNKNOWN` / `NOT ESTABLISHED` | `UNKNOWN` / `NOT ESTABLISHED` |
| **Effective Date** | `UNKNOWN` (Note mentions pre-2008 delimitation) | `term_start_date` / `term_end_date` (Domain dates only) | `introduced_date` / `launched_date` (Domain dates only) | `UNKNOWN` (2026 future projection) |
| **Version** | `UNKNOWN` / `NOT ESTABLISHED` | `UNKNOWN` / `NOT ESTABLISHED` | `UNKNOWN` / `NOT ESTABLISHED` | `UNKNOWN` / `NOT ESTABLISHED` |
| **Status** | `UNVERIFIED` | `UNVERIFIED` (Field enum contains partial values) | `UNKNOWN` | `SCENARIO` (Strictly classified as simulation) |
| **Transformation History** | `UNKNOWN` / `NOT ESTABLISHED` | `UNKNOWN` / `NOT ESTABLISHED` | `UNKNOWN` / `NOT ESTABLISHED` | `UNKNOWN` / `NOT ESTABLISHED` |
| **Verification State** | `unverified` | `unverified` | `unverified` | `unverified` |
| **Current Consumer** | Mobile Maps, API `/api/v1/geo/*` | Mobile Profile Screen, API `/api/v1/politicians` | Civic Dashboard, API `/api/v1/civic/*` | `scripts/validate-data.js` |

*Reconciliation Rules Strictly Applied:*
- **Source Authority vs Data Type Decoupled:** Tamil Nadu 2026 publisher (ADR / MyNeta) is classified as `media_ngo` (its true institutional standing). Its projection/simulation nature is properly captured in its dataset type (`election_projection`) and transformation (`synthetic_projection_simulation`), with factual status strictly set to `SCENARIO`.
- **Zero Manufactured Claims:** Missing values are explicitly recorded as `UNKNOWN` or `NOT ESTABLISHED`. No timestamps, versions, or transformation histories have been fabricated.
- **Scenario Protection Test Fixture:** `TamilNadu2026.json` is strictly classified as `SCENARIO` and will serve as the test fixture proving that ordinary updates cannot elevate scenarios to `OFFICIAL`.

---

## 8. Historical Backfill Boundary

To prevent W012 from expanding into an unconstrained bulk data migration project:
1. **W012 Mandatory Acceptance Backfill:**
   - Strictly limited to the **four representative acceptance datasets** defined in Section 7.
   - Purpose: Prove that the schema, foreign keys, enums, RLS policies, append-only lineage, and transition invariant triggers execute correctly and pass acceptance tests in staging.
2. **Future Work (Explicitly Deferred):**
   - Bulk historical backfill across all 4,000+ assembly constituencies, 543 Lok Sabha seats, 10,000+ candidate affidavits, and local-body administrative units is assigned to later specialized jobs:
     - Geography backfill $\to$ W013 / W014.
     - Election results & affidavits backfill $\to$ W016 / W017.

---

## 9. Ingestion / ETL Inventory

| Ingestion Path | Fetcher Mechanism | Raw Storage | Parser / Transformer | Database Target | Consumer | Lineage Retained? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **News Aggregator** | `fetchFeedXml` (`https.get`) | Memory cache | `rssParser.ts` (XML to JSON) | None (In-memory cache) | Mobile News Feed API | **NO** (Ephemeral only) |
| **MyNeta Scrapers** | `scrapers/myneta-scraper.js`, `myneta-deep-scraper.js` | `scrapers/output/myneta/*.json` | Custom DOM parsers | `data/seed/*.ts` -> DB seeds | Politician Profiles | **NO** (Unlinked snapshots) |
| **State Election Commissions (AP SEC, TS SEC)** | `scrapers/apsec-*.js`, `scrapers/tsec-kyr-scraper.js` | `scrapers/output/local-body/*.json` | Custom table extractors | `representatives`, `representative_edits` | Local Body Ward View | **PARTIAL** (source_url retained in 023) |
| **Local Government Directory (LGD)** | `scrapers/lgd-scraper.js` | Local JSON files | Hierarchy parser | `urban_local_bodies`, `mandals` | Administrative Hierarchy | **NO** |
| **Legislative / Parliament (Sansad, PRS)** | `scrapers/sansad-scraper.js`, `scrapers/prs-scraper.js` | Scratch JSON files | Custom scrapers | `legislator_profiles` | Candidate Transparency | **NO** |
| **ECI & Gazette Monitors** | `scripts/monitors/eci-monitor.ts`, `gazette-monitor.ts` | `data/monitors/gazette-state.json` | State checkpoint comparator | `data_pipeline_status` | Operational Dashboard | **PARTIAL** (Timestamp/checkpoint only) |
| **NewsAPI** | `DOES NOT EXIST` | N/A | N/A | N/A | N/A | N/A |
| **Reddit** | `DOES NOT EXIST` | N/A | N/A | N/A | N/A | N/A |
| **SEC EDGAR** | `DOES NOT EXIST` | N/A | N/A | N/A | N/A | N/A |
| **Binance / Crypto** | `DOES NOT EXIST` | N/A | N/A | N/A | N/A | N/A |

---

## 10. Data Quality Mechanisms Inventory

| Mechanism | Current Implementation | Repository Location | Assessment |
| :--- | :--- | :--- | :--- |
| **Schema Validation** | PostgreSQL CHECK constraints & NOT NULL constraints | `supabase/migrations/**` | `EXISTS — PARTIAL` (Guards types/enums, but no provenance/status constraints) |
| **Candidate Quality Audit** | Heuristic checks for duplicate acNo, gender mismatch, name alignment | `scripts/audit-data-quality.js` | `EXISTS — PARTIAL` (Manual batch script, not automated in CI) |
| **5-State Data Validator** | Duplicate constituencies, candidate age [21, 90], photo URL HTTP 200 checks | `scripts/validate-data.js` | `EXISTS — PARTIAL` (Ad-hoc CLI script, runs on local JSON) |
| **RSS Feed Validator** | HTTP availability check of 18 news feed endpoints | `scripts/validate-news-feeds.mjs` | `EXISTS — PARTIAL` (Manual test script) |
| **Pipeline Health Tracker** | DB table logging freshness and error messages per pipeline | `supabase/migrations/019_live_election.sql` | `EXISTS — PARTIAL` (Database table exists, requires worker cron to update) |
| **Automated Contract Drift Checks** | Pre-commit API schema drift verification | `scripts/check-api-contract-drift.mjs` | `EXISTS — PRODUCTION-READY` (Wired into test pipeline) |
| **Git & Evidence Integrity Checks** | Cryptographic commit parentage & evidence audit | `scripts/check-repo-evidence-integrity.mjs` | `EXISTS — PRODUCTION-READY` (Wired into CI/governance) |
| **Continuous Data Quality Gate** | Automated reconciliation of counts, missing sources, or transformation errors | None | `DOES NOT EXIST` |

---

## 11. Privacy / Personal Data & AI Boundaries

### Privacy / Personal Data Boundary (`EXISTS — PARTIAL`)
- **Segregation of Personal Data:** PII fields (`creator_kyc_records` with ID hashes and selfie URLs; `action_fingerprints` with device/IP data; `trai_opt_outs` with phone hashes) are stored in dedicated tables and protected by strict Row Level Security (RLS) hardened in migration `038_security_baseline_and_rls_hardening.sql`.
- **Public Figures vs Users:** Public political figures (`legislator_profiles`, `representatives`) are strictly separated from authenticated app users (`auth.users`, `user_profiles`).
- **Gap:** There is no universal data catalog classification tagging tables as `PUBLIC_CIVIC`, `POLITICAL_FIGURE_PUBLIC`, `UGC`, `PII`, or `DERIVED_PROFILING`.

### AI Data Boundary (`EXISTS — PARTIAL`)
- **Live Media AI:** In `supabase/migrations/024_live_media_exchange.sql`, AI-derived media features (`auto_headline`, `summary`, `emergency_score`, `deepfake_flag`, `model_provider`) are quarantined in a dedicated `live_event_ai` table linked 1:1 to `live_events`.
- **AI Chat Service:** `apps/api/src/services/ai.ts` utilizes OpenAI with explicit anti-hallucination prompts requiring strict grounding in verified context.
- **Gap:** Across the rest of the application (articles, civic issues, posts, summaries), there is **no generic AI provenance flag** (e.g. `is_ai_generated`, `model_name`, `generation_timestamp`).

---

## 12. Defect & Gap Register

| ID | Area | Current State | Evidence | Gap | Impact | Remediation Job |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **W012-GAP-01** | Source Registry | Absent in PostgreSQL | `supabase/migrations/**` (No `data_sources` table) | No canonical catalog of sources, authority levels, licenses, canonical URLs | Cannot link facts uniformly to verified publishers | W012 |
| **W012-GAP-02** | Data Status Model | Fragmented & Defective | `TamilNadu2026.json:11` (`isWinner: true` on unheld election) | Lack of universal 8-tier status model (`OFFICIAL`, `DERIVED`, `VERIFIED`, `ESTIMATE`, `SCENARIO`, `INFERRED`, `UNVERIFIED`, `UNKNOWN`) | Risk of presenting `SCENARIO` or `ESTIMATE` as `OFFICIAL` fact | W012 |
| **W012-GAP-03** | Provenance Structure | Absent across Core Datasets | `001_initial_schema.sql`, `018_enhanced_civic.sql` | No universal provenance linking record to source, dataset version, and retrieval date | Cannot answer "Where did this fact come from?" | W012 |
| **W012-GAP-04** | Dataset & Versioning | No dataset entities or snapshots | `data/geo/*.geojson`, `data/seed/*.ts` | Datasets are unversioned; changes overwrite historical state | Inability to track changes over time or maintain auditability | W012 |
| **W012-GAP-05** | Transformation Lineage | Unrecorded imperative scripts | `scripts/build-*.mjs`, `scripts/rebuild-*.mjs` | Transformation parameters, input hashes, and output hashes are not recorded | Unreproducible and unverified data generation | W012 / W017 |
| **W012-GAP-06** | Geography Temporal Validity | Flat geography without dates | `001_initial_schema.sql:constituencies` | No `effective_from` / `effective_to` dates or delimitation version linkage | Overwriting boundaries destroys historical electoral context | W013 / W014 |
| **W012-GAP-07** | Automated Quality Gates | Ad-hoc CLI scripts | `scripts/audit-data-quality.js`, `scripts/validate-data.js` | Quality checks run manually on developer machines, not continuous | Silent corruption or ingestion errors can enter production | W017 |
| **W012-GAP-08** | External Provider Assumptions | Inapplicable external sources cited | `rg` search confirms zero matches for NewsAPI, Reddit, EDGAR, Binance | Directive inquires about providers that do not exist in repo architecture | Potential confusion or architectural bloat | W012 (Scope Clarification) |
| **W012-GAP-09** | AI Provenance Quarantine | Quarantined in LMX, absent in civic/news | `024_live_media_exchange.sql:198` vs `015_journalist_platform.sql:articles` | No `is_ai_generated` or model attribution on articles or summaries | Inability to prove content origin or human authorship | W012 / W015 |
| **W012-GAP-10** | Universal Verification Trail | Implemented only in local-body (023) | `023_local_body_representatives.sql:404` (`representative_edits`) | State/national legislators, elections, and civic issues lack verification logs | Asymmetric verification auditing across tiers | W012 |

---

## 13. Proposed Minimal W012 Architecture (Corrected)

The corrected W012 architecture in PostgreSQL models governance with strict status-default rules, decoupling of source authority from data status, security-enforced transition controls, and append-only multi-source lineage:

```
┌────────────────────────────────────────────────────────┐
│                      data_sources                      │
│ (id, name, publisher, authority_level, url, license)   │
│ authority_level [source_authority_enum]:               │
│ constitutional | statutory | academic | media_ngo |     │
│ crowdsourced | synthetic_model                         │
└───────────────────────────┬────────────────────────────┘
                            │ 1:N
┌───────────────────────────▼────────────────────────────┐
│                        datasets                        │
│ (id, name, domain, description, source_id, license)    │
└───────────────────────────┬────────────────────────────┘
                            │ 1:N
┌───────────────────────────▼────────────────────────────┐
│                    dataset_versions                    │
│ (id, dataset_id, version_tag, effective_from/to,       │
│  retrieved_at, record_count, checksum, default_status) │
│ * default_status: DEFAULT 'UNKNOWN'                    │
└───────────────────────────┬────────────────────────────┘
                            │ 1:N
┌───────────────────────────▼────────────────────────────┐
│                   provenance_records                   │
│ (id, dataset_version_id, source_record_id,             │
│  parent_provenance_id [Self-FK for Lineage DAG],       │
│  status [data_status_enum: DEFAULT 'UNKNOWN'],         │
│  transformation_type, transform_version, operator,     │
│  verified_by, verification_evidence_id, created_at)    │
└───────────────────────────┬────────────────────────────┘
                            │ M:N Linkage
┌───────────────────────────▼────────────────────────────┐
│               record_provenance_linkages               │
│ (domain_table, domain_record_id, provenance_id,        │
│  is_canonical BOOLEAN DEFAULT TRUE)                    │
└────────────────────────────────────────────────────────┘
```

### Staging Performance Requirement (Strict Dual P95 Acceptance Gate):
The acceptance requirement is defined as a measurable staging performance benchmark contract:
1. **Hot-Path Isolation:** Governed domain tables query base records directly. The `record_provenance_linkages` table is never joined on hot consumer query paths (e.g. `GET /api/v1/geo/constituencies`, `GET /api/v1/news/feed`, `GET /api/v1/politician/:id`).
2. **Measurable Staging Baseline Benchmark:**
   - Representative hot-path queries will be benchmarked in staging **BEFORE** and **AFTER** migration execution across 1,000 warm iterations.
   - The test records: query identity, pre-migration baseline execution (p50, p95, p99 ms), post-migration execution (p50, p95, p99 ms), test environment conditions, index utilization, observed latency delta, and pass/fail evaluation.
3. **Primary P95 Acceptance Condition (Dual Gate):**
   - Both conditions MUST pass:
     $$\mathbf{relative\ p95\ regression} \le 5\% \quad \mathbf{AND} \quad \mathbf{absolute\ p95\ regression} \le 2.0\text{ ms}$$
   - **PRE-IMPLEMENTATION DECISION REQUIRED:** Staging benchmark threshold contract requires:
     - `relative p95 regression <= 5%` **AND** `absolute p95 regression <= 2.0 ms`
     - p95 is the primary acceptance gate; p50 and p99 remain supporting evidence.
     - Subject to formal CTO confirmation prior to staging execution.

---

## 14. Detailed Migration 039 Implementation Plan

When W012 implementation is authorized by the CTO, Migration `039_data_governance_foundation.sql` will execute the following strictly structured 20-point plan:

1. **Dependency Inspection:** Pre-flight assertion verifying that core domain tables (`states`, `constituencies`, `legislator_profiles`, `representatives`) exist and have no name clashes.
2. **Enum Creation:**
   - `source_authority_enum`: `'constitutional'`, `'statutory'`, `'academic'`, `'media_ngo'`, `'crowdsourced'`, `'synthetic_model'`.
   - `data_status_enum`: `'OFFICIAL'`, `'DERIVED'`, `'VERIFIED'`, `'ESTIMATE'`, `'SCENARIO'`, `'INFERRED'`, `'UNVERIFIED'`, `'UNKNOWN'`.
3. **Source Registry Table:** Create `data_sources` with full publisher and authority metadata.
4. **Dataset Registry Table:** Create `datasets` categorizing governed datasets across domains.
5. **Dataset Versions Table:** Create `dataset_versions` capturing immutable version tags, checksums, validity dates, and `default_status DEFAULT 'UNKNOWN'`.
6. **Provenance Records Table:** Create `provenance_records` with append-only DAG lineage (`parent_provenance_id`), `status DEFAULT 'UNKNOWN'`, and foreign key to verified evidence records.
7. **Record Linkages Table:** Create `record_provenance_linkages` supporting M:N relationships between domain records and provenance nodes.
8. **Required Indexes:** B-tree indexes on foreign keys and compound lookup index on `record_provenance_linkages(domain_table, domain_record_id, is_canonical)`.
9. **Foreign Keys:** Clean foreign key relationships with appropriate cascading on version removal and `ON DELETE RESTRICT` on active sources.
10. **Row Level Security (RLS):**
    - Enable RLS on all governance tables.
    - Public read policies (`FOR SELECT USING (true)`).
    - Insert/update/delete restricted exclusively to `service_role` and verified governance administrators.
11. **Controlled Seed Data:** Seed canonical sources:
    - `eci`: Election Commission of India (`constitutional`)
    - `prs_india`: PRS Legislative Research (`academic`)
    - `myneta`: Association for Democratic Reforms (`media_ngo`)
    - `datta07_shapefiles`: Indian Shapefiles GitHub Repository (`crowdsourced`)
    - `synthetic_projection_model`: Internal simulation test harness (`synthetic_model`)
12. **Status-Transition Invariants Trigger:** Create `check_status_transition_invariant()` trigger:
    - Blocks transitions from `SCENARIO`, `ESTIMATE`, `INFERRED`, `UNVERIFIED`, `UNKNOWN` to `OFFICIAL` unless backed by valid evidence.
    - Permanently prohibits `SCENARIO → OFFICIAL`.
13. **OFFICIAL Transition Authorization Model:** Trigger verifies that elevating status to `OFFICIAL` requires active `service_role` and an existing, valid `evidence_records` reference matching the record.
14. **Provenance Immutability Model:** Append-only trigger on `provenance_records` prohibiting in-place `UPDATE` of historical lineage fields.
15. **Representative-Data Backfill Boundaries:** Backfill strictly the 4 representative acceptance datasets (Geography, Election, Civic, Projection). Zero bulk backfill of legacy records.
16. **Rollback Strategy:** Fully reversible idempotent DOWN block dropping tables, triggers, and enums cleanly in reverse dependency order without touching existing domain data.
17. **Staging Execution:** Automated execution on staging Supabase instance.
18. **Staging Verification:** Run `verify-w012-governance.mjs` against staging DB asserting all schema constraints, triggers, and queries.
19. **Production Impact Assessment:**
    - Expected impact: Additive schema design with nullable references.
    - Production runtime impact: **UNKNOWN** until staging execution and benchmark verification.
    - Production execution: **NOT YET AUTHORIZED**.
20. **Production Rollout & Recovery Prerequisites:** Staging acceptance gate signed off by CTO before production migration scheduling.

---

## 15. Exact Acceptance Evidence Plan (A through P)

To achieve unambiguous CTO acceptance, the verification suite must prove all 16 mandated criteria:

- **A. Source Identity & Authority:** The governed record points to a canonical entry in `data_sources` with a valid `source_authority_enum`.
- **B. Retrieval Metadata:** The retrieval timestamp (`retrieved_at`) is captured and preserved immutably.
- **C. Effective Period:** The effective validity window (`effective_from`, `effective_to`) is explicitly distinguishable from retrieval time.
- **D. Dataset/Version Identity:** The immutable `dataset_version_id`, version tag, and SHA-256 checksum are identifiable.
- **E. Correct Data Status:** Factual status (`data_status_enum`) is explicit and defaults strictly to `UNKNOWN`.
- **F. Transformation Lineage:** The transformation sequence is reconstructed via `parent_provenance_id` and `transformation_type`.
- **G. SCENARIO → OFFICIAL Protection:** Executing an update attempting to change a `SCENARIO` record to `OFFICIAL` is rejected and fails closed.
- **H. Historical Integrity:** An earlier dataset version remains queryable and unaltered after a newer version is registered.
- **I. Provenance Immutability:** Historical provenance records cannot be overwritten; mutation attempts fail or force an append.
- **J. Hot-Path Performance:** Pre- and post-migration benchmarks prove consumer queries satisfy the primary p95 dual gate: `relative p95 regression <= 5%` **AND** `absolute p95 regression <= 2.0 ms` across 1,000 iterations in staging.
- **K. Unauthorized OFFICIAL Transition Denied:** Direct `UPDATE` to `OFFICIAL` by unprivileged callers is rejected by trigger and RLS.
- **L. Authorized/Evidenced OFFICIAL Transition Succeeds:** Elevation with valid DB evidence record and authorized role succeeds cleanly.
- **M. Verification ID Alone Insufficient:** Supplying an unverified or arbitrary `verification_id` without an authoritative DB evidence record fails closed.
- **N. RLS Invariant Protection:** Anonymous and standard authenticated roles cannot bypass governance invariants.
- **O. Preservation of Application Behavior:** Existing mobile and API functionality behaves identically before and after governance tables are added.
- **P. Zero Fabricated Metadata:** Representative datasets contain only verified evidence from the repository, with unverified fields explicitly recorded as `UNKNOWN / NOT ESTABLISHED`.
