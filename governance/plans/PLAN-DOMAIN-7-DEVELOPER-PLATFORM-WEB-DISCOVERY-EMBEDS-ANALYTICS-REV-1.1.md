# Canonical Pre-Implementation Plan: Domain 7 — Developer Platform, Public Web Discovery, SEO & Embeds (JOB 062–066)

**Plan Identifier:** `PLAN-DOMAIN-7-DEVELOPER-PLATFORM-WEB-DISCOVERY-EMBEDS-ANALYTICS-REV-1.1`  
**Governing Authority:** Master Product Blueprint (Jobs 062–066), Amendment v1.2 (`AMENDMENT_v1.2.md`), Amendment v1.5-A Section 26 (`AMENDMENT_v1.5-A.md`), Amendment v1.6 (`AMENDMENT_v1.6.md`), DEC-188, DEC-189, Rule IV-001 Non-Self-Acceptance & `AGENT_EXECUTION_PROTOCOL.md`  
**Target Scope:** Domain 7 (JOB 062, JOB 063, JOB 064, JOB 065, JOB 066)  
**Creation Date:** 2026-10-30  
**Status:** `APPROVED` (Implementation Authorization: `YES`; DEC-189)  

---

## 1. Document Title & Metadata

- **Document Title:** Master Pre-Implementation Plan: Domain 7 — Developer Platform, Public Web Discovery, SEO & Embeds (JOB 062 through JOB 066)
- **Document Revision:** 1.1 (CTO / User Ratified Revision — DEC-189)
- **Target Repository:** `PANIN` (formerly `Kshetra`)
- **Governing Protocol:** Agent Execution Protocol Revision 1.6 & Amendment v1.5-A Section 26
- **Assigned Engineering Domain:** `ARCH`, `REVENUE`, `GROWTH`, `DATA`, `MEDIA`, `PO`, `BE`
- **Execution Authority:** CTO / User Sole Ratification Boundary (Ratified with DEC-189)
- **Base Git Commit:** `21c8791f4e61f324567bf325032b16acfbaf528e` (`origin/master`)

---

## 2. Problem Statement

POLIGRAM has established core sovereign geography, mobile performance optimization, civic issue resolution, leadership academy, media broadcasting, and political advertising/monetization across Domains 1 through 6. 

However, to transition from an internal application into a nationwide civic data infrastructure, PANIN requires a public distribution, developer ecosystem, and data intelligence layer:
1. **Developer Platform (JOB 062):** External civic tech developers, media houses, research institutes, and political consulting firms lack a self-serve developer portal with organization management, cryptographic API key issuance (`pk_live_...`, `pk_test_...`), tiered quota enforcement, usage telemetry, interactive OpenAPI 3.1 documentation, and subscription billing.
2. **Public Web Discovery & SEO (JOB 063):** Electoral geography, delimitation scenarios, representative profiles, and election history are locked inside the mobile client or authenticated API endpoints. The public web lacks server-rendered, crawlable, canonical landing pages for states, districts, assembly constituencies, representatives, elections, and delimitation changes equipped with OpenGraph, Twitter Cards, and Schema.org JSON-LD microdata.
3. **Media Embeds & Civic Widgets (JOB 064):** Newsrooms, digital journalists, and civic blogs cannot embed live, interactive widgets (Constituency Cards, Delimitation Diffs, Candidate Profiles, Election Tally, Civic Issue Trackers, Live Streams, and Shorts) into their stories without layout clipping, scrollbar friction, or missing statutory RPA 1951 disclaimers.
4. **Universal Analytics Platform (JOB 065):** Client and server events are currently fragmented across ad telemetry and session logs. The platform lacks a single, governed 10-field event schema (`event_name`, `user_id`, `anonymous_id`, `session_id`, `timestamp`, `screen`, `geography`, `entity`, `metadata`, `app_version`) supporting high-throughput ingestion and DPDP-compliant privacy preservation.
5. **Executive Product Dashboard (JOB 066):** Product management, leadership, and operators lack a centralized analytics aggregator capable of mathematically reconstructing key business metrics (Activation funnels, DAU/WAU/MAU retention cohorts, engagement frequency, constituency penetration density, and B2B/Ad revenue attribution) directly from primary database event tables with zero reconciliation discrepancy.

---

## 3. Current State Analysis

A comprehensive audit of the current repository reveals:
1. **SaaS & API Key Foundations (W021 / W051):**
   - Tables `saas_tenants`, `saas_applications`, `saas_api_keys`, and `saas_usage_ledger` were created in migrations 056–058.
   - Route `apps/api/src/routes/saasV1.ts` exposes early partner endpoints (`/api/vsaas/v1/...`).
   - `saasAuthPlugin.ts` provides API key header validation, and `saasRateLimiter.ts` provides tier-based rate limiting.
   - *Gaps for JOB 062:* Missing developer organization team management (RBAC roles `admin`, `developer`, `billing`, `viewer`), self-serve developer portal endpoints, OpenAPI 3.1 schema generation, interactive Swagger UI (`/api/docs`), and automated usage bucket queries.
2. **Public Web & SSR Rendering:**
   - Fastify currently hosts API routes and one public SSR route: `GET /share/delimitation/:shareId` (`apps/api/src/routes/delimitationShare.ts`).
   - *Gaps for JOB 063:* No canonical public SSR pages for states (`/public/states/:stateCode`), districts (`/public/districts/:districtId`), constituencies (`/public/constituency/:acId`), representatives (`/public/representatives/:repId`), elections (`/public/elections/:electionId`), or delimitation (`/public/delimitation/:acId`). No XML sitemap generators (`/sitemap.xml`).
3. **Media Embeds & Widgets:**
   - Delimitation share cards exist, but there are no sandboxed, responsive iframe endpoints or universal JavaScript loader script for external newsrooms (`/embed/poligram-widgets.js`).
   - *Gaps for JOB 064:* Missing all 7 required widget endpoints: constituency, delimitation diff, election, candidate, civic issue, live stream, and Short.
4. **Analytics & Metrics:**
   - `apps/api/src/routes/analytics.ts` has a legacy `client_sessions` endpoint.
   - `apps/api/src/services/mediaService.ts` tracks Shorts analytics in memory.
   - *Gaps for JOB 065 & JOB 066:* Missing the canonical 10-field universal analytics event ingestion endpoint and schema (`POST /api/v1/analytics/events`), missing `universal_analytics_events` table, and missing the multi-dimensional product dashboard aggregator (`activation`, `retention`, `engagement`, `geography density`, `revenue`).

---

## 4. Fact / Inference / Assumption / Unknown Register

| Identifier | Type | Content | Source / Basis |
| :--- | :--- | :--- | :--- |
| **FIAU-01** | **FACT** | Search engine crawlers (Googlebot, Bingbot) and social crawlers (WhatsApp, Twitterbot, LinkedInBot) require static or server-rendered HTML with `<meta>` tags and Schema.org JSON-LD to index public pages and generate preview cards. | W3C / OpenGraph Specification |
| **FIAU-02** | **FACT** | Newsrooms require third-party embeds to be resilient to iframe height clipping, meaning embeds must implement `window.postMessage` auto-resizing. | Media Publisher Standards |
| **FIAU-03** | **FACT** | Blueprint mandates an exact 10-field event schema for JOB 065: `event_name`, `user_id`, `anonymous_id`, `session_id`, `timestamp`, `screen`, `geography`, `entity`, `metadata`, `app_version`. | Master Blueprint JOB 065 Specification |
| **FIAU-04** | **FACT** | Section 127A of the Representation of the People Act 1951 mandates that any political material distributed or displayed publicly must bear the publisher's identity. | Statutory RPA 1951 Requirement |
| **FIAU-05** | **INFERENCE** | High-performance Fastify SSR HTML handlers can serve public geography pages and embed widgets with sub-50ms latency without requiring a heavy Next.js/Node frontend server, while twin JSON endpoints provide future-proofing. | Architectural design ratified in DEC-189 |
| **FIAU-06** | **INFERENCE** | Universal analytics events stored in a dedicated partitioned or indexed PostgreSQL table (`universal_analytics_events`) with an in-memory buffer provide sovereign data governance, while a pluggable sink interface allows external telemetry streaming if required. | Architectural design ratified in DEC-189 |
| **FIAU-07** | **ASSUMPTION** | Developers using the B2B SaaS platform expect industry-standard API key formats (`pk_live_...` and `pk_test_...`) and standard HTTP rate-limiting response headers (`X-RateLimit-*`). | Standard Developer Ergonomics |

---

## 5. Target Architecture & Intended Outcome (Ratified Decisions)

The architecture synthesizes the user's explicit ratifications in **DEC-189**:

```text
+--------------------------------------------------------------------------------------------------+
|                              RATIFIED DOMAIN 7 ARCHITECTURE (DEC-189)                            |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|  [External Developers]            [Public Web / SEO Crawlers]        [Newsrooms & Media Blogs]   |
|         |                                    |                                    |              |
|         v                                    v                                    v              |
|  +--------------------+             +--------------------+             +--------------------+    |
|  | Developer Portal   |             | Fastify SSR + API  |             | Sandboxed Embeds   |    |
|  | - Orgs & RBAC      |             | - /public/states/  |             | - /embed/constitu- |    |
|  | - API Key Lifecycle|             | - /public/constitu-|             |   ency/:acId       |    |
|  | - Quota Enforcement|             |   ency/:acId       |             | - /embed/delimit-  |    |
|  | - Interactive Docs |             | - Twin JSON API:   |             |   ation/:acId      |    |
|  | - Usage Telemetry  |             |   /api/v1/public/* |             | - /embed/issue/:id |    |
|  | - Stripe/Razorpay  |             | - OpenGraph/JSON-LD|             | - postMessage auto-|    |
|  |   Billing Checkout |             | - XML Sitemaps     |             |   resize script +  |    |
|  +--------------------+             | - Sub-50ms TTFB    |             |   <poligram-widget>   |    |
|         |                           +--------------------+             |   Web Component    |    |
|         |                                    |                         +--------------------+    |
|         +------------------------------------+------------------------------------+              |
|                                              |                                                   |
|                                              v                                                   |
|                         +------------------------------------------+                             |
|                         |  Universal Analytics Ingestion Engine    |                             |
|                         |  - Canonical 10-Field Event Schema       |                             |
|                         |  - High-Throughput Batch Ingestion       |                             |
|                         |  - DPDP Privacy-Preserving IP Salt Hash  |                             |
|                         |  - External Sink Exporter Interface      |                             |
|                         +------------------------------------------+                             |
|                                              |                                                   |
|                                              v                                                   |
|                         +------------------------------------------+                             |
|                         |  Executive Product Dashboard Aggregator  |                             |
|                         |  - Activation Funnel Reconstruction      |                             |
|                         |  - 7-Day & 30-Day Retention Cohorts      |                             |
|                         |  - DAU / WAU / MAU Stickiness Metric     |                             |
|                         |  - 4,123 AC Geographic Density Heatmap   |                             |
|                         |  - Revenue Attribution (B2B SaaS + Ads)  |                             |
|                         +------------------------------------------+                             |
|                                              |                                                   |
|                                              v                                                   |
|                         +------------------------------------------+                             |
|                         |  Supabase / PostgreSQL Canonical Storage  |                             |
|                         |  - developer_organizations               |                             |
|                         |  - developer_api_keys                    |                             |
|                         |  - universal_analytics_events            |                             |
|                         |  - developer_usage_ledger                |                             |
|                         +------------------------------------------+                             |
+--------------------------------------------------------------------------------------------------+
```

### Specific Ratified Provisions:
1. **Decision 1 (Public Web):** Primary Fastify SSR HTML generation for sub-50ms TTFB and crawler discoverability, PLUS twin JSON API endpoints (`/api/v1/public/...`) providing complete headless support for standalone Next.js/React frontends.
2. **Decision 2 (Media Embeds):** Universal sandboxed iframe endpoints with `window.postMessage` auto-resizing script (`/embed/poligram-widgets.js`), PLUS custom web component registration (`<panin-widget type="..." id="...">`) bundled directly into the script for zero-iframe host integration.
3. **Decision 3 (Universal Analytics):** Sovereign PostgreSQL storage in `universal_analytics_events` with DPDP 2023 IP salt-hashing, PLUS pluggable sink exporter interface (`AnalyticsSinkExporter`) enabling dual-streaming to external platforms (PostHog/Kafka) when configured.

---

## 6. Governing Rules & Constraints

1. **Zero Mock / Zero Stub Rule:** All 5 jobs must be implemented with real database tables, real services, real Fastify routes, and verified by comprehensive automated tests.
2. **Rule IV-001 Non-Self-Acceptance:** Work cannot be marked complete without automated tests passing and verified against origin master.
3. **Statutory RPA 1951 Compliance:** All public pages and third-party media embeds containing political information must render publisher and attribution disclaimers ("Powered by PANIN Civic Tech Platform").
4. **DPDP 2023 Compliance:** Universal analytics must not store plaintext IP addresses, phone numbers, or unhashed citizen identifiers.
5. **Sub-50ms Public Web TTFB:** Public geography and embed routes must serve pre-compiled/cached SSR HTML without blocking on extraneous network calls.

---

## 7. Full Scope of Work

The scope covers 5 sequential, interconnected jobs:

### JOB 062: API Developer Platform
- **Organization Management:** `developer_organizations` supporting multi-user teams, billing contacts, and roles (`admin`, `developer`, `billing`, `viewer`).
- **Cryptographic API Key Lifecycle:** Generation of prefixed keys (`pk_live_...`, `pk_test_...`), SHA-256 hash storage, display of hint/prefix only, key scopes (`read:geography`, `read:elections`, `read:civic`, `write:embeds`, `read:analytics`), rotation, and instant revocation.
- **Quota & Tier Enforcement:** Free (60 rpm / 10k monthly), Pro (600 rpm / 500k monthly), Enterprise (3,000 rpm / 10M monthly), with standard HTTP response headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`).
- **Usage Telemetry & Ledger:** Per-key request metering, hourly aggregation buckets, latency metrics, error rate breakdown.
- **Interactive Documentation:** OpenAPI 3.1 schema specification (`/api/docs/json`), interactive Swagger UI (`/api/docs`), quickstarts, and client SDK code snippets.
- **Developer Billing:** Subscription checkout intent, tier upgrade verification, and automated GST tax invoicing.
- **Evidence:** External test customer registers organization, creates API key, successfully calls geography API within quota, verifies rate limiting on ceiling breach, and records usage telemetry.

### JOB 063: Public Geography Web Pages
- **Canonical SSR Public Landing Pages:**
  1. `/public/states/:stateCode`: State overview, total ACs/PCs, ruling government, delimitation shift preview, districts list.
  2. `/public/districts/:districtId`: District summary, child ACs, voter population, aggregated civic grievance index.
  3. `/public/constituency/:acId`: Assembly Constituency profile, current representative MLA, 2026 delimitation scenario comparison, top civic issues.
  4. `/public/representatives/:repId`: Representative bio, political party, term tenure, legislative attendance, asset declarations, contact information.
  5. `/public/elections/:electionId`: Election cycle summary, candidate roster, margin of victory, historical turnout, vote share distributions.
  6. `/public/delimitation/:acId`: Delimitation scenario diff (2008 vs 2026), boundary shift comparison, population parity metrics.
- **Twin Headless JSON API Endpoints:**
  - Mirroring all 6 public views under `/api/v1/public/...` for standalone Next.js/React frontend consumption.
- **SEO & Social Crawlability:**
  - Dynamic OpenGraph tags (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`).
  - Twitter Card tags (`twitter:card`, `twitter:site`, `twitter:title`, `twitter:description`, `twitter:image`).
  - Schema.org JSON-LD microdata (`CivicStructure`, `AdministrativeArea`, `Person`, `Event`).
  - XML Sitemap generators: `/sitemap.xml` and `/sitemap-geography.xml`.
- **Evidence:** Automated tests verify page HTTP status 200, valid HTML5 markup, presence of canonical OpenGraph and JSON-LD tags, deep linkability, JSON mirror equivalence, and sitemap generation.

### JOB 064: Media Embeds & Civic Widgets
- **Lightweight Sandboxed Embed Endpoints:**
  1. `GET /embed/constituency/:acId`: Constituency overview card with MLA and key metrics.
  2. `GET /embed/delimitation/:acId`: Interactive before/after boundary diff visualizer.
  3. `GET /embed/election/:electionId`: Live election results tally with candidate vote share bars.
  4. `GET /embed/candidate/:candidateId`: Candidate profile with verified manifesto highlights.
  5. `GET /embed/issue/:issueId`: Civic issue grievance card with resolution timeline status and citizen support tally.
  6. `GET /embed/live/:channelId`: Video/HLS broadcast embed with live viewer counter.
  7. `GET /embed/short/:shortId`: Vertical video player embed with transcript preview.
- **Universal JavaScript Loader Script (`/embed/poligram-widgets.js`):**
  - Seamless responsive container fitting.
  - Bidirectional `window.postMessage` auto-resizing protocol (`kshetra:resize`) preventing scrollbars.
  - Permissive framing headers (`X-Frame-Options: ALLOWALL`, CSP `frame-ancestors *`).
  - Mandatory Section 127A attribution badge.
  - Custom Web Component definition (`<poligram-widget>`) for direct DOM mounting.
- **Evidence:** Automated tests verify all 7 embed endpoints render valid HTML, return correct CORS and frame headers, emit postMessage resize scripts, and third-party test container renders them seamlessly.

### JOB 065: Universal Analytics Platform
- **Governed 10-Field Event Schema:**
  `event_name`, `user_id`, `anonymous_id`, `session_id`, `timestamp`, `screen`, `geography`, `entity`, `metadata`, `app_version`.
- **High-Throughput Ingestion API:** `POST /api/v1/analytics/events` supporting single and batch ingestion up to 100 events.
- **Database Storage:** `universal_analytics_events` with compound B-tree and GIN indexes for fast geospatial and temporal slicing.
- **DPDP Privacy Preservation:** Client IP anonymization via cryptographic salt-hashing; zero unhashed citizen PII stored in event telemetry.
- **Pluggable External Exporter:** `AnalyticsSinkExporter` interface for dual-streaming events to external message queues or third-party sinks.
- **Evidence:** Controlled event tests verify batch ingestion, schema validation, negative payload rejection, and temporal/geographical filtering.

### JOB 066: Executive Product Dashboard
- **Metric Aggregation Engine:**
  1. *Activation Funnel:* Step-by-step conversion tracking (`signup_started` $\rightarrow$ `otp_verified` $\rightarrow$ `ac_selected` $\rightarrow$ `first_action_completed`).
  2. *Retention Cohorts:* Calculation of DAU, WAU, MAU, DAU/MAU stickiness ratio, 7-day and 30-day cohort retention matrices.
  3. *Engagement Metrics:* Sessions per user, average session duration, interaction density.
  4. *Geographic Penetration Density:* AC coverage index (% of 4,123 ACs active), top 10 most active ACs, civic dark zones.
  5. *Monetization & Revenue Attribution:* B2B SaaS ARR/MRR, ad spend revenue, prepaid credit balances, ARPU.
- **Independent Mathematical Reconstruction:** Every metric exposed by `GET /api/v1/dashboard/metrics` can be independently recomputed and proven against raw database event and transaction tables.
- **Evidence:** Verification suite validates mathematical identity between raw database records and aggregated dashboard metrics with zero error tolerance.

---

## 8. Explicit Out-of-Scope Boundaries

1. Native iOS / Android binary packaging for Developer Portal (Developer Portal is a web-based responsive SaaS application).
2. Physical hardware billing terminal integration (Billing uses Razorpay/Stripe web payment intents).
3. Third-party ad exchange programmatic RTB bidding (Domain 7 focuses on direct B2B API access, embeds, and platform analytics).
4. Modification of core electoral boundaries or gazette delimitation data (Domain 1 data is read-only).

---

## 9. Step-by-Step Implementation Plan

### Stage 1: Database Migration (`supabase/migrations/080_domain7_developer_platform_web_embeds_and_analytics.sql`)
1. Create `developer_organizations` table (id, name, slug, tier, billing_email, created_at, updated_at).
2. Create `developer_organization_members` table (org_id, user_id, role `admin`|`developer`|`billing`|`viewer`, joined_at).
3. Enhance `saas_api_keys` with organizational scoping and developer key prefixes (`pk_live_...`, `pk_test_...`).
4. Create `universal_analytics_events` table implementing the exact 10-field schema with JSONB metadata and geography fields.
5. Create `developer_usage_ledger` for real-time per-key telemetry and quota accounting.
6. Configure Row Level Security (RLS) policies and performance indexes.

### Stage 2: Shared TypeScript Contracts (`packages/shared/src/contracts/developerPlatform.ts` & `analytics.ts`)
1. Define interfaces for developer organizations, API key management, quota tiers, and billing checkout.
2. Define universal 10-field analytics event contracts (`UniversalAnalyticsEventDTO`, `BatchAnalyticsEventRequest`).
3. Define public web discovery DTOs and embed widget contracts.
4. Define executive product dashboard metrics response contracts (`ProductDashboardMetricsDTO`).
5. Re-export all contracts in `packages/shared/src/contracts/index.ts` and compile `@kshetra/shared`.

### Stage 3: Backend Services
1. `apps/api/src/services/developerPlatformService.ts`:
   - Organization CRUD and membership RBAC.
   - Cryptographic API key generation, hashing, rotation, and revocation.
   - Tier quota checking, rate limit tracking, and usage ledger recording.
   - OpenAPI 3.1 specification generation.
2. `apps/api/src/services/publicWebService.ts`:
   - Data aggregation for public SSR pages and twin JSON APIs (State, District, AC, Representative, Election, Delimitation).
   - Dynamic OpenGraph, Twitter Card, and Schema.org JSON-LD generation.
   - XML sitemap generation.
3. `apps/api/src/services/embedService.ts`:
   - HTML generation for the 7 sandboxed widgets.
   - PostMessage auto-resizing script generator, Web Component definition, and Section 127A disclaimers.
4. `apps/api/src/services/universalAnalyticsService.ts`:
   - High-throughput event ingestion (single & batch) with DPDP IP hashing.
   - Pluggable external exporter interface.
   - Multi-dimensional query engine.
5. `apps/api/src/services/productDashboardService.ts`:
   - Independent reconstruction of Activation, Retention, Engagement, Geography Density, and Revenue.

### Stage 4: API Routes & Fastify Wiring
1. `apps/api/src/routes/developerPlatform.ts`: Expose developer portal, API keys, usage, and OpenAPI docs.
2. `apps/api/src/routes/publicWeb.ts`: Expose SSR public landing pages, twin JSON APIs, and XML sitemaps.
3. `apps/api/src/routes/embeds.ts`: Expose the 7 widget embed endpoints and `/embed/poligram-widgets.js`.
4. `apps/api/src/routes/universalAnalytics.ts`: Expose event ingestion endpoints.
5. `apps/api/src/routes/productDashboard.ts`: Expose executive dashboard metrics.
6. Wire all new route handlers into `apps/api/src/server.ts` and verify build.

### Stage 5: Verification & Governance
1. Author comprehensive automated test suite `tests/domain7-developer-platform-and-analytics.test.ts`.
2. Execute test suite, verifying 100% PASS across all 5 jobs.
3. Generate formal evidence dossiers (`reports/domain7_developer_platform_and_analytics_report.json` and `.md`).
4. Reconcile governance registers (`ACCEPTANCE_REGISTER.md`, `EXECUTION_STATE.md`, `DECISION_LOG.md`).
5. Run full regression test suites and governance consistency checks (`tests/governance-consistency.test.mjs`, `tests/governance-v16.test.mjs`).

---

## 10. Verification & Testing Strategy

A dedicated automated test suite (`tests/domain7-developer-platform-and-analytics.test.ts`) will test all five constituent jobs:
- **JOB 062 Tests:** Organization creation, API key generation, key authentication, quota enforcement (burst rate limit 429), usage recording, OpenAPI 3.1 docs output.
- **JOB 063 Tests:** Public SSR routes and twin JSON API endpoints (State, District, AC, Representative, Election, Delimitation) returning HTTP 200, valid HTML, correct OpenGraph meta tags, valid Schema.org JSON-LD, and valid XML sitemaps.
- **JOB 064 Tests:** All 7 widget embed routes returning HTTP 200, valid HTML, permissive iframe headers (`X-Frame-Options: ALLOWALL`), postMessage resize script, Web Component registration, and Section 127A attribution pill.
- **JOB 065 Tests:** Universal analytics event batch ingestion, 10-field schema validation, DPDP IP hashing, and temporal/geographical filtering.
- **JOB 066 Tests:** Executive product dashboard metrics independently reconstructed from source tables (Activation, Retention cohorts, Engagement, AC density, Revenue) matching with 0 error discrepancy.

---

## 11. Negative-Path Testing Specification

1. **Invalid API Key Format:** Request with malformed or unregistered `x-api-key` header rejected with HTTP 401 Unauthorized (`INVALID_API_KEY`).
2. **Quota Exceeded:** Developer tenant exceeding monthly ceiling rejected with HTTP 429 Too Many Requests (`QUOTA_EXCEEDED`) and accurate `X-RateLimit-*` headers.
3. **Invalid Public Geography Route:** Non-existent AC ID or state code returns HTTP 404 with helpful canonical redirect suggestion.
4. **Embed Widget Tampering:** Embed route called with invalid parameters renders a graceful fallback card with statutory PANIN attribution.
5. **Analytics Schema Violation:** Event payload missing required canonical fields (e.g. missing `anonymous_id` or `session_id`) rejected with HTTP 400 Bad Request.
6. **DPDP PII Leaks in Telemetry:** Event metadata containing raw email/phone rejected or automatically sanitized.

---

## 12. Evidence Generation Plan

1. Formal JSON evidence dossier: `reports/domain7_developer_platform_and_analytics_report.json`.
2. Formal Markdown summary report: `reports/domain7_developer_platform_and_analytics_report.md`.
3. Test output logs recording 100% test execution and pass rates.
4. Clean monorepo typecheck reports across `@kshetra/shared` and `@kshetra/api`.

---

## 13. Reconciliation Plan

1. **Acceptance Register:** Update `ACCEPTANCE_REGISTER.md` recording JOB 062 through JOB 066 as `ACCEPTED / COMPLETE (TESTED & VERIFIED)` citing the decision number.
2. **Execution State:** Update `EXECUTION_STATE.md` recording Domain 7 completion and locking coordinates under Control M.
3. **Decision Log:** Append formal ratification and closure decisions to `DECISION_LOG.md`.
4. **Git Tree:** Ensure working tree is 100% clean and push all commits to `origin/master`.

---

## 14. Independent Verification Specification

Under Rule IV-001 Non-Self-Acceptance:
- Verification must be executed via automated test commands (`npm test` or `npx tsx`) producing deterministic exit code 0.
- Independent reconstruction test in JOB 066 must calculate dashboard numbers separately from source event tables and assert strict mathematical equality (`assert.strictEqual`) against the dashboard API response.

---

## 15. Risks, Failure Modes & Mitigations

| Risk / Failure Mode | Severity | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **RFM-01: High Ingestion Load on Analytics** | HIGH | Database connection saturation during traffic spikes | Implement an in-memory queue/batch buffer that flushes events in bulk transactions. |
| **RFM-02: Search Engine Crawler Timeout** | MEDIUM | SEO de-indexing if public SSR pages are slow | Pre-render and cache public SSR HTML responses; ensure sub-50ms TTFB. |
| **RFM-03: Iframe Height Clipping in Newsrooms** | HIGH | Degraded UX and broken widget layouts on third-party sites | Implement standard `window.postMessage` bidirectional resize protocol in `panin-widgets.js`. |
| **RFM-04: API Key Compromise** | HIGH | Unauthorized consumption of developer quotas | Provide instant key revocation and rotation endpoints with audit trails. |
| **RFM-05: PII Storage in Analytics Events** | HIGH | Non-compliance with DPDP 2023 regulations | Enforce strict schema validation and hash IP addresses with a cryptographic salt. |

---

## 16. Rollback & Recovery Strategy

1. Database migration `080_domain7_developer_platform_web_embeds_and_analytics.sql` includes clean down-migration statements (`DROP TABLE IF EXISTS ...`).
2. Route registrations in `apps/api/src/server.ts` are cleanly isolated in modular plugins.
3. If any component encounters regressions, routes can be disabled via environment flags without affecting core civic operations.

---

## 17. Impact Assessment

- **Database Performance:** Zero negative impact on primary transactional tables; new analytics and developer tables are isolated.
- **Mobile Client:** Zero bundle size increase; mobile app consumes existing lightweight endpoints.
- **Third-Party Ecosystem:** Newsrooms and developers gain first-class, reliable public access to canonical Indian civic data.

---

## 18. Acceptance Criteria

1. **JOB 062:** External test customer registers organization, creates API key, successfully calls geography API, obeys rate limits, views usage metrics, and accesses OpenAPI 3.1 documentation.
2. **JOB 063:** Public geography pages (State, District, AC, Representative, Election, Delimitation) return valid HTML, OpenGraph tags, Schema.org JSON-LD, and valid XML sitemaps, with corresponding twin JSON endpoints.
3. **JOB 064:** All 7 widget embed endpoints render responsive, sandboxed HTML with postMessage auto-resizing script, Web Component registration, and Section 127A attribution.
4. **JOB 065:** Universal analytics platform ingests single and batch events adhering to the canonical 10-field schema with DPDP IP hashing and export capability.
5. **JOB 066:** Executive product dashboard accurately reconstructs Activation, Retention, Engagement, Geography Density, and Revenue metrics directly from database records.
6. **Governance Integrity:** Monorepo typecheck 100% clean, all unit and regression tests pass, and governance consistency checks pass 100%.

---

## 19. Artifact & Commit Lineage Map

- **Parent Baseline Commit:** `21c8791f4e61f324567bf325032b16acfbaf528e` (DEC-188)
- **Pre-Implementation Plan:** `governance/plans/PLAN-DOMAIN-7-DEVELOPER-PLATFORM-WEB-DISCOVERY-EMBEDS-ANALYTICS-REV-1.1.md`
- **Database Migration:** `supabase/migrations/080_domain7_developer_platform_web_embeds_and_analytics.sql`
- **Shared Contracts:** `packages/shared/src/contracts/developerPlatform.ts` & `analytics.ts`
- **Backend Services:** `apps/api/src/services/developerPlatformService.ts`, `publicWebService.ts`, `embedService.ts`, `universalAnalyticsService.ts`, `productDashboardService.ts`
- **Backend Routes:** `apps/api/src/routes/developerPlatform.ts`, `publicWeb.ts`, `embeds.ts`, `universalAnalytics.ts`, `productDashboard.ts`
- **Test Suite:** `tests/domain7-developer-platform-and-analytics.test.ts`
- **Evidence Dossier:** `reports/domain7_developer_platform_and_analytics_report.json` and `.md`

---

## 20. Amendment Compliance Matrix

- **Amendment v1.2:** Adheres to multi-tier database migration and backward compatibility standards.
- **Amendment v1.5-A Section 26:** Fulfills all 22 required canonical planning sections and strict implementation gating.
- **Amendment v1.6:** Aligns with Domain 7 lifecycle stages and non-self-ratifying adjudication boundaries.
- **Rule IV-001:** Strictly adheres to independent empirical verification through automated test execution.

---

## 21. Operational Declarations

```text
IMPLEMENTATION_AUTHORIZATION: YES
PLAN_STATUS: APPROVED
AUTHORIZED_JOB: DOMAIN 7 (JOB 062, JOB 063, JOB 064, JOB 065, JOB 066)
AUTHORIZED_SCOPE_HASH: be414cf9f817264f904c4a19589f9b9a5a73229f808b9cf393f3bb32cc447354
```

---

## 22. Plan Sign-Off & Review Request

This canonical 22-section Pre-Implementation Plan Rev 1.1 has been ratified and approved under **DEC-189** by the CTO / User with:

```text
PLAN_STATUS: APPROVED
IMPLEMENTATION_AUTHORIZATION: YES
```
