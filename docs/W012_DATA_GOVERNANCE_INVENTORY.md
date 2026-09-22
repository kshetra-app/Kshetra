# PANIN / KSHETRA — DATA GOVERNANCE & PROVENANCE INVENTORY
## Job W012 Preflight Discovery Artifact (Corrected per CTO Directive)

- **Date:** 2026-09-22
- **Repository:** `kshetra-app/Kshetra`
- **Branch:** `master`
- **Current HEAD Commit:** `ee87ec72cef81d724abf928ee250c19033ee9d41`
- **Accepted Baseline:** W011 (`5bee882f32bbd77875c1f2b2f558abfeaeee719d`)
- **Working Tree Status:** Clean (0 uncommitted changes)
- **Execution Mode:** READ-ONLY PREFLIGHT (Zero mutations, Zero migrations, Zero application code edits)

---

## 1. Executive Summary & Authorization Boundary

Pursuant to the CTO Preflight Directive and Pre-Implementation Correction Directive for **Job W012 (Data Governance Foundation)** under the Master Execution Document, this artifact provides an authoritative, corrected source-of-truth inspection of the existing data architecture across the PANIN / Kshetra repository.

### Authorization Boundary
- **W012 Preflight:** **ACCEPTED — SUBSTANTIALLY COMPLETE** (Subject to these pre-implementation corrections).
- **W012 Implementation:** **NOT AUTHORIZED** (Zero database migrations, zero schema edits, zero backend route changes, zero UI modifications, zero deployments).
- **W013–W017 & W052:** **NOT AUTHORIZED**.

---

## 2. Methodology & Files Inspected

Every finding in this inventory is grounded strictly in source-of-truth inspection of the repository at commit `ee87ec72cef81d724abf928ee250c19033ee9d41`.

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

## 4. Source Registry & Source Authority vs Data Status Separation

### A. Current State: `DOES NOT EXIST` (Canonical DB Registry)
The repository does not possess a centralized, unified data source registry table in PostgreSQL.

### B. Crucial Architectural Separation: Source Authority vs Data Status
A fundamental architectural correction required by the CTO is the strict decoupling of **Source Authority** from **Data Status**:
1. **Source Authority (`authority_level`):** Pertains to the institutional and legal standing of the publisher/origin.
   - Example values: `constitutional` (e.g. ECI), `statutory` (e.g. State Election Commissions, Census of India, Survey of India), `academic` (e.g. Trivedi Centre / Ashoka University), `media_ngo` (e.g. The Hindu, ADR / MyNeta), `crowdsourced` (e.g. citizen edits), `synthetic_model` (e.g. delimitation projection algorithms).
2. **Data Status (`data_status`):** Pertains to the factual and epistemic certainty of a specific dataset version or individual record.
   - Values: `OFFICIAL`, `DERIVED`, `VERIFIED`, `ESTIMATE`, `SCENARIO`, `INFERRED`, `UNVERIFIED`, `UNKNOWN`.
3. **Core Invariant:** A source may possess the highest institutional authority (e.g. Election Commission of India: `constitutional`), but a dataset extracted from it via a web scraper, an unverified summary, or a simulation based on its past data does **not** automatically inherit `OFFICIAL` data status. It may be `DERIVED`, `UNVERIFIED`, or `ESTIMATE` until independently corroborated or published as an official gazette record.
4. **Status Default Invariant:** Newly registered dataset versions or records MUST default to:
   ```text
   UNKNOWN
   ```
   or require an explicit, validated status at creation. Under no circumstances may any record become `OFFICIAL` simply by being inserted into the catalog.

---

## 5. Data Status Model & Scenario / Official Invariant Controls

### Current State: `DOES NOT EXIST` (Universal Model) / `EXISTS — DEFECTIVE` (Political Invariants)

The Master Execution Document mandates that PANIN distinguish:
`OFFICIAL`, `DERIVED`, `VERIFIED`, `ESTIMATE`, `SCENARIO`, `INFERRED`, `UNVERIFIED`, `UNKNOWN`.

### Critical Invariant Transition Protection:
The system must structurally prohibit unvalidated status elevation:
$$\text{SCENARIO} \not\to \text{OFFICIAL}$$
$$\text{ESTIMATE} \not\to \text{OFFICIAL}$$
$$\text{INFERRED} \not\to \text{OFFICIAL}$$
$$\text{UNVERIFIED} \not\to \text{OFFICIAL}$$
$$\text{UNKNOWN} \not\to \text{OFFICIAL}$$

#### Architectural Enforcement:
1. **No Relying Solely on Enums:** A PostgreSQL enum only defines acceptable values; it does not govern transitions.
2. **Database Transition Function & Trigger:** A database trigger (`check_status_transition_invariant`) must reject any update that transitions an existing record's `data_status` to `'OFFICIAL'` from `'SCENARIO'`, `'ESTIMATE'`, `'INFERRED'`, `'UNVERIFIED'`, or `'UNKNOWN'` unless:
   - An authorized administrative role executes the change.
   - A valid `verification_id` or signed cryptographic evidence reference is supplied.
   - If `data_status = 'SCENARIO'`, transition to `'OFFICIAL'` is **permanently blocked** (a scenario can never become official; an official record must be ingested as a new official record from an official source).

---

## 6. Provenance Model & Cardinality Architecture

### Current State: `DOES NOT EXIST` (Canonical Provenance Structure)

### Provenance Cardinality & Lineage Design:
To prevent forcing an artificial 1:1 model onto complex domain facts, the W012 provenance architecture implements an **append-only Directed Acyclic Graph (DAG)** model:

1. **Multiple Source Records per Domain Fact:**
   - A candidate profile (e.g., in `legislator_profiles`) draws data from multiple source records simultaneously:
     - Electoral victory & votes from ECI results;
     - Assets and criminal cases from ADR / MyNeta affidavits;
     - Assembly attendance and debates from PRS India or Sansad.
   - The architecture supports multiple provenance inputs per domain record via an M:N linkage table (`record_provenance_sources`) or an append-only provenance chain.
2. **Multiple Transformations in Lineage:**
   - A raw scraped HTML/CSV passes through ingestion, parsing, normalization, and entity-resolution before application consumption.
   - Each transformation creates an immutable transformation record linked via `parent_provenance_id`.
3. **Canonical Provenance Determination:**
   - If multiple provenance records attach to a domain record, the active canonical provenance is determined by an explicit `is_canonical: BOOLEAN` flag or by the latest verified node in the active lineage chain.
4. **Append-Only Immutability:**
   - Historical provenance records are **immutable**. Updates never mutate existing provenance rows in place; new provenance records are appended with references to the previous state (`parent_provenance_id`).
5. **Full Chain Preservation:**
   - A complete audit query can traverse from the live domain record backwards through each normalization step to the raw ingested artifact and canonical source URL.

---

## 7. Representative Dataset Reconciliation (Actual Source Truth)

Reconciling the representative datasets against actual verified evidence currently present in the repository, with no manufactured claims and no invented values:

| Requirement | Dataset 1: Geography (Assembly Boundaries) | Dataset 2: Political (MLA Profiles) | Dataset 3: Civic (Bills & Schemes) | Dataset 4: Projection (TN 2026 Simulation) |
| :--- | :--- | :--- | :--- | :--- |
| **Observed Entity** | `constituencies` / `data/geo/telangana-assembly.geojson` | `legislator_profiles` / `data/seed/*-mla-profiles.ts` | `bills`, `government_schemes` / `018_enhanced_civic.sql` | `scrapers/output/myneta/TamilNadu2026.json` |
| **Actual Source** | `datta07/INDIAN-SHAPEFILES` (in `data/geo/ATTRIBUTION.md`) | `myneta.info`, `prsindia.org`, `sansad.in` | Unspecified mock seed in migration 018 | `https://www.myneta.info/TamilNadu2026` |
| **Source Authority** | `crowdsourced` / `open_source_repo` (GitHub repo) | `media_ngo` (ADR/MyNeta), `academic` (PRS) | `UNKNOWN` | `synthetic_model` / `test_fixture` |
| **Retrieval Date** | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` |
| **Effective Date** | `UNKNOWN` (Note mentions pre-2008 delimitation) | `term_start_date` / `term_end_date` (Domain dates only) | `introduced_date` / `launched_date` | `UNKNOWN` (2026 future projection) |
| **Version** | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` | `UNKNOWN` |
| **Status** | `UNVERIFIED` | `UNVERIFIED` (or `partial` per verification_status) | `UNKNOWN` | `SCENARIO` (Explicitly categorized; was defective `isWinner`) |
| **Transformation History** | `UNKNOWN` (Local scripts exist, execution unrecorded) | `UNKNOWN` (Unrecorded scrapers/seed builders) | `UNKNOWN` (Seeded in SQL) | `UNKNOWN` |
| **Verification State** | `unverified` | `unverified` (Stored enum on record) | `unverified` | `unverified` |
| **Current Consumer** | Mobile Maps, API `/api/v1/geo/*` | Mobile Profile Screen, API `/api/v1/politicians` | Civic Dashboard, API `/api/v1/civic/*` | `scripts/validate-data.js` |

*Reconciliation Clarification:*
- The prior preflight claim referencing `Survey of India / 2008 Delimitation → OFFICIAL` has been **removed**.
- The actual observed source for geography in this repository is `datta07/INDIAN-SHAPEFILES` documented in `data/geo/ATTRIBUTION.md`, carrying an authority of open-source repository and status of `UNVERIFIED`.
- If official Survey of India or Delimitation Commission shapefiles are later ingested, they will be registered independently with full source authority and provenance.

---

## 8. Historical Backfill Boundary

To prevent W012 from expanding into an uncontrolled data migration project:
1. **W012 Mandatory Backfill:**
   - Limited strictly to the **four representative acceptance datasets** required to verify and accept the governance foundation.
   - Proves that the schema, foreign keys, enums, triggers, and query patterns function correctly in staging.
2. **Future Work (Out of Scope for W012):**
   - Bulk historical backfill across all 4,000+ national assembly constituencies, 543 Lok Sabha seats, 10,000+ candidate affidavits, and administrative local bodies is assigned to later specialized jobs:
     - Geography backfill $\to$ W013 / W014.
     - Election / candidate results backfill $\to$ W016 / W017.

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

The corrected W012 architecture in PostgreSQL models governance with strict status-default rules, decoupling of source authority from data status, and append-only multi-source lineage:

```
┌────────────────────────────────────────────────────────┐
│                      data_sources                      │
│ (id, name, publisher, authority_level, url, license)   │
│ authority_level: constitutional | statutory | academic │
│                  media_ngo | crowdsourced | synthetic  │
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
│ * default_status: DEFAULT 'UNKNOWN' (NOT 'OFFICIAL')   │
└───────────────────────────┬────────────────────────────┘
                            │ 1:N
┌───────────────────────────▼────────────────────────────┐
│                   provenance_records                   │
│ (id, dataset_version_id, source_record_id,             │
│  parent_provenance_id [Self-FK for Lineage DAG],       │
│  status [data_status_enum: DEFAULT 'UNKNOWN'],         │
│  transformation_type, transform_version, operator,     │
│  verified_by, verification_id, created_at)             │
└───────────────────────────┬────────────────────────────┘
                            │ M:N Linkage
┌───────────────────────────▼────────────────────────────┐
│               record_provenance_linkages               │
│ (domain_table, domain_record_id, provenance_id,        │
│  is_canonical BOOLEAN DEFAULT TRUE)                    │
└────────────────────────────────────────────────────────┘
```

### Key Architectural Corrective Decisions:
1. **Status Default Invariant:**
   `default_status` in `dataset_versions` and `status` in `provenance_records` default strictly to:
   ```sql
   DEFAULT 'UNKNOWN'
   ```
   No dataset version or record can default to `OFFICIAL`.
2. **Decoupled Source Authority vs Data Status:**
   - `authority_level` is a property of `data_sources`.
   - `data_status` is a property of `provenance_records` and `dataset_versions`.
   - An authoritative source never automatically grants `OFFICIAL` status to a record.
3. **Multi-Source & Append-Only Lineage:**
   - `parent_provenance_id UUID REFERENCES provenance_records(id)` enables full transformation chains.
   - `record_provenance_linkages` supports multiple source inputs per domain record (e.g. ECI + MyNeta + PRS for a single candidate).
   - Provenance records are append-only; updates create new provenance entries, preserving history.
4. **Transition Invariant Trigger:**
   - A PostgreSQL trigger prohibits transitioning any status to `'OFFICIAL'` unless an authorized verification ID is supplied.
   - Any attempt to update a `'SCENARIO'` record to `'OFFICIAL'` is rejected unconditionally.
5. **Zero Hot-Path Join Overhead:**
   - Normal consumer queries query base domain tables directly. They only join `record_provenance_linkages` when users open the "Fact Provenance" inspector.

---

## 14. Implementation Plan & Staging Requirements (Corrected)

When W012 implementation is authorized by the CTO:

### A. Detailed Migration Implementation Plan (`039_data_governance_foundation.sql`)
1. **Dependency Inspection:** Pre-check ensuring existing tables (`states`, `constituencies`, `legislator_profiles`, `representatives`) exist without conflicting types.
2. **Enum Creation:** Create `data_status_enum` (`'OFFICIAL'`, `'DERIVED'`, `'VERIFIED'`, `'ESTIMATE'`, `'SCENARIO'`, `'INFERRED'`, `'UNVERIFIED'`, `'UNKNOWN'`) and `source_authority_enum` (`'constitutional'`, `'statutory'`, `'academic'`, `'media_ngo'`, `'crowdsourced'`, `'synthetic_model'`).
3. **Table Creation:** Create `data_sources`, `datasets`, `dataset_versions`, `provenance_records`, `record_provenance_linkages`.
4. **Indexes:** B-tree indexes on `(dataset_id)`, `(dataset_version_id)`, `(parent_provenance_id)`, and composite index on `(domain_table, domain_record_id)`.
5. **Foreign Keys:** Cascading deletes from versions to linkages, self-referencing FK on `parent_provenance_id`.
6. **Row Level Security (RLS):** Enable RLS on all governance tables; grant `SELECT` to public/authenticated/anon; restrict `INSERT/UPDATE/DELETE` strictly to `service_role`.
7. **Transition Invariants:** Deploy `check_status_transition_invariant()` trigger enforcing that transitions to `'OFFICIAL'` require verification evidence and permanently blocking `'SCENARIO'` elevation.
8. **Seed Data:** Seed verified known sources:
   - `eci`: Election Commission of India (`constitutional`)
   - `prs_india`: PRS Legislative Research (`academic`)
   - `myneta`: Association for Democratic Reforms (`media_ngo`)
   - `datta07_shapefiles`: Indian Shapefiles GitHub Repository (`crowdsourced`)
   - `synthetic_projection_model`: Internal delimitation simulation (`synthetic_model`)
9. **Rollback Considerations:** Include an idempotent DOWN block capable of dropping tables, triggers, and types cleanly without affecting pre-existing data.
10. **Staging Execution & Verification:** Execute against staging Supabase instance; verify schema, constraints, RLS policies, and transition invariant trigger before proposing production execution.
11. **Production Impact Assessment:**
    - Expected impact: additive schema design with nullable references.
    - Production runtime impact: **UNKNOWN** until staging execution and verification.
    - Production execution: **NOT YET AUTHORIZED**.

---

## 15. Exact Acceptance Evidence Plan (Corrected)

To achieve unambiguous CTO acceptance, the verification suite must prove all 10 mandated criteria:

1. **A. Source:** The governed record points to a canonical source entity in `data_sources`.
2. **B. Retrieval:** The retrieval timestamp (`retrieved_at`) is preserved and immutable.
3. **C. Effective Period:** The effective date/period (`effective_from`, `effective_to`) is explicitly distinguishable from `retrieved_at`.
4. **D. Version:** The exact immutable `dataset_version_id` and `version_tag` are identifiable.
5. **E. Status:** The factual status (`data_status`) is explicit (e.g. `UNVERIFIED`, `SCENARIO`, `OFFICIAL`).
6. **F. Transformation:** The transformation chain is represented via `parent_provenance_id` and `transformation_type`.
7. **G. Scenario Protection:** Attempting to execute `UPDATE ... SET data_status = 'OFFICIAL' WHERE data_status = 'SCENARIO'` triggers an exception and fails closed.
8. **H. Historical Integrity:** An earlier dataset version remains identifiable, queryable, and immutable after a newer version is registered.
9. **I. Provenance Immutability:** Historical provenance records cannot silently be updated; attempts to overwrite raise an error or force an append.
10. **J. Performance:** Normal application queries for constituencies, legislators, and bills execute without joining provenance tables, incurring zero additional query latency.
