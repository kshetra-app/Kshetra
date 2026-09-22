# PANIN / KSHETRA — DATA GOVERNANCE & PROVENANCE INVENTORY
## Job W012 Preflight Discovery Artifact

- **Date:** 2026-09-22
- **Repository:** `kshetra-app/Kshetra`
- **Branch:** `master`
- **Current HEAD Commit:** `5bee882f32bbd77875c1f2b2f558abfeaeee719d`
- **Accepted Baseline:** W011 (`5bee882f32bbd77875c1f2b2f558abfeaeee719d`)
- **Working Tree Status:** Clean (0 uncommitted changes)
- **Execution Mode:** READ-ONLY PREFLIGHT (Zero mutations, Zero migrations, Zero application code edits)

---

## 1. Executive Summary & Authorization Boundary

Pursuant to the CTO Preflight Directive for **Job W012 (Data Governance Foundation)** under the Master Execution Document, this artifact provides an authoritative, source-of-truth inspection of the existing data architecture across the PANIN / Kshetra repository.

### Authorization Boundary
- **W012 Preflight:** **AUTHORIZED** (Read-only architectural discovery).
- **W012 Implementation:** **NOT AUTHORIZED** (Zero database migrations, zero schema edits, zero backend route changes, zero UI modifications).
- **W013–W017 & W052:** **NOT AUTHORIZED**.

---

## 2. Methodology & Files Inspected

Every finding in this inventory is grounded strictly in source-of-truth inspection of the repository at commit `5bee882f32bbd77875c1f2b2f558abfeaeee719d`.

### Primary Subsystems & Files Inspected
1. **Database Migrations (`supabase/migrations/**`):**
   - 40 SQL migration files (`001_initial_schema.sql` through `038_security_baseline_and_rls_hardening.sql`), comprising 151 tables.
   - Specific audit of governance, audit, and provenance structures in:
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

## 4. Source Registry Discovery

### Current State: `DOES NOT EXIST` (Canonical DB Registry) / `EXISTS — PARTIAL` (Isolated Feeds & Pipelines)
The repository does **not** possess a centralized, unified data source registry table in PostgreSQL.

#### Isolated Mechanisms Discovered:
1. **News RSS Feed Registry (`apps/api/src/services/news/sources.ts`):**
   - Implemented as an in-memory TypeScript array (`FEED_SOURCES`).
   - Fields: `sourceId`, `sourceName`, `domain`, `accent`, `verified`, `language`, `category`, `scope`, `stateCode`, `rssUrl`.
   - Scope: Strictly limited to external news publishers (e.g., The Hindu, Indian Express, NDTV, Aaj Tak).
   - Limitation: Hardcoded, ephemeral, not accessible via SQL joins to associate with persisted articles or civic records.
2. **Pipeline Status Source Table (`supabase/migrations/019_live_election.sql`):**
   - Table `data_pipeline_status` tracks high-level operational sources:
     - Columns: `id UUID`, `source TEXT UNIQUE`, `last_fetched TIMESTAMPTZ`, `freshness TEXT CHECK ('real_time','minutes_ago','hours_ago','daily','weekly','stale')`, `record_count INT`, `is_healthy BOOLEAN`, `error_message TEXT`, `next_scheduled_fetch TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.
     - Seeded with 9 static source strings: `eci_results`, `myneta_affidavits`, `census_2011`, `geojson_boundaries`, `gazette_monitor`, `eci_monitor`, `parliament_monitor`, `prs_attendance`, `wikipedia_enricher`.
     - Limitation: Purely operational health monitoring. Does not record publisher, authority level, canonical URL, license, contact, or legal attribution.
3. **Local Body Source Type Enum (`supabase/migrations/023_local_body_representatives.sql`):**
   - Enum check constraint on `representatives.source_type`:
     `'lgd', 'sec', 'lok_dhaba', 'opencity', 'wikipedia', 'eci', 'myneta', 'news', 'curated', 'crowdsourced'`.
   - Limitation: Free-floating string enum; not foreign-keyed to a formal source entity.

---

## 5. Data Status Model Discovery & Critical Political Data Invariants

### Current State: `DOES NOT EXIST` (Universal Model) / `EXISTS — DEFECTIVE` (Political Invariants)

The Master Execution Document mandates that PANIN distinguish:
`OFFICIAL`, `DERIVED`, `VERIFIED`, `ESTIMATE`, `SCENARIO`, `INFERRED`, `UNVERIFIED`, `UNKNOWN`.

### Critical Invariant Failure Discovered:
The existing architecture currently permits dangerous ambiguity between projections and official facts:
1. **Unheld 2026 Election Data Recorded as Real Fact:**
   - In `scrapers/output/myneta/TamilNadu2026.json`, `Kerala2026.json`, `WestBengal2026.json`, `Assam2026.json`, `Puducherry2026.json`:
     Records contain:
     ```json
     {
       "candidateId": 256,
       "name": "A.Kallanai",
       "constituency": "MADURAI NORTH",
       "party": "Tamilaga Vettri",
       "electionKey": "TamilNadu2026",
       "electionYear": 2026,
       "isWinner": true
     }
     ```
   - **Defect:** An unheld future 2026 election is populated with `isWinner: true` and identical schema structure to real historical results (e.g. `Telangana2023.json`). There is zero data status column designating this as `SCENARIO`, `ESTIMATE`, or `PROJECTION`.
2. **Delimitation Proposals Table Ambiguity (`011_delimitation.sql`):**
   - Table `delimitation_proposals` defines `status CHECK (status IN ('draft', 'final', 'superseded', 'rejected'))`.
   - In `apps/mobile/lib/delimitationTypes.ts`, mathematical simulations (e.g., `model: 'PROPORTIONAL' | 'EXPANSION_SAFE'`, `projectedSeats`, `estimatedNewMargin`) use this identical status field.
   - A mathematical projection scenario stored as `'draft'` can be confused with an official Draft Gazette published by the Delimitation Commission of India.

**Conclusion:** The repository currently has **NO guards** preventing `SCENARIO → OFFICIAL` or `ESTIMATE → EXACT`.

---

## 6. Provenance Model Discovery

### Current State: `DOES NOT EXIST` (Canonical Provenance Structure)

Can the current system answer: *"Where did this fact come from?"* for a critical data item?

### Discovered Fragments:
1. **Scattered URL Columns:**
   - `candidate_affidavits.source_url` (`008_election_affidavits.sql`)
   - `legislator_profiles.myneta_url`, `prs_url`, `sansad_url` (`012_legislator_profiles.sql`)
   - `bills.full_text_url`, `committee_report_url` (`018_enhanced_civic.sql`)
   - `development_projects.source` (Free text string)
   - *Limitation:* Bare URLs or strings provide no version, no retrieval timestamp, no transformation history, and no verification link.
2. **Local Body Edit History (`023_local_body_representatives.sql:404`):**
   - Table `representative_edits` captures crowdsourced modifications:
     `representative_id`, `editor_user_id`, `editor_kyc_verified`, `source_type`, `source_url`, `citation`, `diff JSONB`, `digital_fingerprint JSONB`, `moderation_status`.
   - *Limitation:* Isolated entirely to local-body representatives. Does not apply to constituencies, assembly legislators, election tallies, census figures, or civic projects.
3. **Trust & Safety Audit Log (`006_trust_safety.sql:82`):**
   - Table `audit_log` records user moderation actions (`actor_id`, `action`, `entity_type`, `old_value`, `new_value`, `ip_address`).
   - *Limitation:* User moderation log, not data ingestion or dataset provenance.

---

## 7. Transformation History & Lineage

### Current State: `DOES NOT EXIST` (Recorded Lineage)

The repository relies on a multi-stage data flow:
$$\text{Source} \longrightarrow \text{Ingestion} \longrightarrow \text{Raw JSON/CSV} \longrightarrow \text{Transformation Scripts} \longrightarrow \text{Static TS / SQL Seeds} \longrightarrow \text{Application}$$

However, **NONE** of the intermediate transformation stages are persisted as lineage records:
- Scripts like `scripts/build-current-seed.mjs`, `scripts/build-tcpd-seed.mjs`, and `scripts/rebuild-5-states.mjs` read raw files and emit `.ts` seed files without logging source hashes, operator identity, transformation version, or diff snapshots.
- Table `scraper_runs` (`012_legislator_profiles.sql`) logs high-level run execution metrics (`records_scraped`, `records_updated`, `records_new`, `errors`), but does **not** link individual records back to the run ID.

---

## 8. Representative Dataset Audit

Auditing 5 representative datasets across the repository:

| Requirement | Dataset 1: Geography (Constituencies) | Dataset 2: Political (Legislator Profiles) | Dataset 3: Civic (State Budgets & Bills) | Dataset 4: External Feed (News RSS) | Dataset 5: Projections (TN 2026 Assembly) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Entity / Path** | `constituencies` table / `data/geo/telangana-assembly.geojson` | `legislator_profiles` table / `data/seed/*-mla-profiles.ts` | `bills`, `budget_allocations` / `018_enhanced_civic.sql` | `FEED_SOURCES` in `apps/api/src/services/news/sources.ts` | `scrapers/output/myneta/TamilNadu2026.json` |
| **Source** | `datta07/INDIAN-SHAPEFILES` (in `ATTRIBUTION.md`) | `myneta.info`, `prsindia.org`, `sansad.in` | `source TEXT` (free text string in DB) | The Hindu, NDTV, Indian Express RSS | `https://www.myneta.info/TamilNadu2026` |
| **Retrieval Date** | `MISSING` | `MISSING` | `MISSING` | Generated at runtime (hourly scrape) | `MISSING` |
| **Effective Date** | `MISSING` (Note says "pre-delimitation 2008") | `term_start_date` / `term_end_date` (Domain dates only) | `introduced_date` (Bills) / `fiscal_year` (Budget) | `publishedAt` (RSS item pubDate) | `MISSING` (Assumed 2026) |
| **Version** | `MISSING` | `MISSING` | `MISSING` | `version: 1` (In-memory feed version) | `MISSING` |
| **Status** | `MISSING` (Implicitly treated as fact) | `verification_status` (`unverified`/`partial`/`verified`) | Legislative status (`introduced`, `enacted`, etc.) | `verified: boolean` on source domain | `MISSING` (`isWinner: true` unflagged) |
| **Transformation History** | `MISSING` | `MISSING` | `MISSING` | `MISSING` (Link SHA1 hash only) | `MISSING` |
| **Verification State** | `MISSING` | Unverified / Partial / Verified | `MISSING` | Domain level verification flag | `MISSING` |
| **Current Consumer** | Mobile Maps, API `/api/v1/geo/*` | Mobile Profile Screen, API `/api/v1/politicians` | Civic Dashboard, API `/api/v1/civic/*` | Mobile Feed, API `/api/v1/news/feed` | Internal test scripts (`validate-data.js`) |

---

## 9. Ingestion / ETL Inventory

Inspection of ingestion paths across the repository:

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

*Note on Directive-Mentioned Providers:*
- **NewsAPI:** DOES NOT EXIST. The repository uses native RSS XML fetching directly from news publishers.
- **Reddit:** DOES NOT EXIST. No Reddit scraping or API clients exist.
- **SEC EDGAR:** DOES NOT EXIST. In this codebase, "SEC" refers exclusively to State Election Commissions of India (e.g. AP SEC, TS SEC), never the US Securities and Exchange Commission.
- **Binance:** DOES NOT EXIST. No cryptocurrency feeds or integrations exist.

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

## 13. Proposed Minimal W012 Architecture

To fulfill the Master Execution Document without introducing heavy microservices, external metadata catalogs, or hot-path query degradation, the recommended W012 foundation consists of a **lightweight, relational provenance model** in PostgreSQL:

```
┌────────────────────────────────────────────────────────┐
│                      data_sources                      │
│ (id, name, publisher, authority_level, url, license)   │
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
└───────────────────────────┬────────────────────────────┘
                            │ 1:N
┌───────────────────────────▼────────────────────────────┐
│                   provenance_records                   │
│ (id, dataset_version_id, source_record_id,             │
│  status [data_status_enum], transformation_notes,      │
│  verified_by, verification_timestamp)                 │
└────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions:
1. **Canonical `data_status_enum`:**
   ```sql
   CREATE TYPE data_status_enum AS ENUM (
     'OFFICIAL',
     'DERIVED',
     'VERIFIED',
     'ESTIMATE',
     'SCENARIO',
     'INFERRED',
     'UNVERIFIED',
     'UNKNOWN'
   );
   ```
   - Invariant Enforcement: CHECK constraint or domain logic ensures that unheld elections or simulations cannot hold status `OFFICIAL`.
2. **Non-Invasive Linkage on Governed Tables:**
   - Governed domain tables (e.g. `constituencies`, `legislator_profiles`, `election_results`, `bills`) can optionally carry:
     - `data_status data_status_enum NOT NULL DEFAULT 'UNKNOWN'`
     - `provenance_id UUID REFERENCES provenance_records(id) ON DELETE SET NULL`
   - **Zero Hot-Path Join Overhead:** Consumer queries read the table directly. They only join `provenance_records` / `data_sources` when the user clicks "View Source / Provenance".
3. **Reuse of Existing 023 Structure:**
   - The existing `source_type` and `data_status` in `representatives` (`023`) will be mapped cleanly into this canonical registry, preventing parallel or duplicate governance systems.

---

## 14. Implementation Prerequisites & Staging Requirements

When W012 implementation is authorized by the CTO:
1. **Migrations Required:**
   - Single clean migration (`039_data_governance_foundation.sql`) defining:
     - `data_status_enum`
     - `data_sources`
     - `datasets`
     - `dataset_versions`
     - `provenance_records`
     - Initial seed of known canonical sources (ECI, PRS, Lok Dhaba, Census of India, Survey of India, MyNeta, State Gazettes).
2. **Production Impact:**
   - **Zero downtime, zero locking:** All new tables are purely additive.
   - Any added provenance foreign keys on existing tables will be nullable with zero backfill required on critical path.
3. **Staging Verification Requirements:**
   - Deploy `039_data_governance_foundation.sql` to staging database.
   - Run verification test confirming 4 representative datasets have valid provenance records linking to source, date, version, status, and transformation history.

---

## 15. Exact Acceptance Evidence Plan

The Master Execution Document requires:
> **Required evidence:** A representative dataset has: source, date, version, status, transformation history.

To achieve unambiguous CTO acceptance:
1. **Four Representative Datasets Registered:**
   - Geography: Telangana Assembly Constituencies (Source: Survey of India / 2008 Delimitation).
   - Election: Telangana 2023 Assembly Election Results (Source: ECI).
   - Civic: Government Schemes (Source: Official State Portals).
   - Projections: Tamil Nadu 2026 Simulation (Status strictly forced to `SCENARIO`, proving the invariant prevents `SCENARIO → OFFICIAL`).
2. **Verification Script:**
   - `scripts/verify-w012-governance.mjs` asserting:
     - All 4 datasets resolve to valid `data_sources` entries.
     - Dates (`retrieved_at`, `effective_from`) and `version_tag` are populated.
     - Status enum strictly matches authorized values.
     - Invariant test: attempting to mark an unheld election as `OFFICIAL` throws constraint violation.
3. **Independent Verifier Audit:**
   - Automated report `reports/w012_acceptance_evidence.json` capturing exact database query outputs.
