# Canonical Pre-Implementation Plan: Domain 6 — Political Finance, Campaign Management, Advertising & Monetization Engine (JOB 054–061) — REV 1.1

**Plan Identifier:** `PLAN-DOMAIN-6-POLITICAL-FINANCE-CAMPAIGNS-ADS-REV-1.1`  
**Governing Authority:** Master Product Blueprint (Jobs 054–061), Representation of the People Act 1951 (Section 127A), ECI Compendium of Instructions on Election Expenditure & MCMC, Amendment v1.2 (`AMENDMENT_v1.2.md`), Amendment v1.5-A Section 26 (`AMENDMENT_v1.5-A.md`), Amendment v1.6 (`AMENDMENT_v1.6.md`), Rule IV-001 Non-Self-Acceptance & `AGENT_EXECUTION_PROTOCOL.md`  
**Target Scope:** Domain 6 (JOB 054, JOB 055, JOB 056, JOB 057, JOB 058, JOB 059, JOB 060, JOB 061)  
**Creation Date:** 2026-10-30  
**Revision:** 1.1 (Incorporating User Architectural Direction on Separate Schemas, Hybrid Configurable Billing & 6-Category Adaptive Political Ad Governance)  
**Status:** `SUBMITTED_FOR_REVIEW` (Implementation Authorization: `PENDING_RATIFICATION_COMMIT`)  

---

## 1. Document Title & Metadata

- **Document Title:** Master Pre-Implementation Plan: Domain 6 — Political Finance, Campaign Management, Advertising & Monetization Engine (JOB 054 through JOB 061)
- **Document Revision:** 1.1 (Post-Consultation Ratified Architecture)
- **Target Repository:** `PANIN` (formerly `Kshetra`)
- **Governing Protocol:** Agent Execution Protocol Revision 1.6 & Amendment v1.5-A Section 26
- **Assigned Engineering Domain:** `REVENUE`, `COMPLIANCE`, `DATA`, `SECURITY`
- **Execution Authority:** CTO / User Sole Ratification Boundary
- **Current Git HEAD:** `7176d2deb5669e5eaba13d05d81075c2b389d526` (`origin/master`)

---

## 2. Problem Statement

To become a self-sustaining, gold-standard civic and democratic technology platform across India's 4,123 Assembly Constituencies, PANIN requires a high-integrity, statutory-compliant revenue, campaign management, and advertising engine.

Following deep stakeholder alignment, Domain 6 must resolve three fundamental real-world architectural realities:
1. **Separation of Political and Commercial Spheres:** Political campaigns (candidates, parties, volunteers, statutory expenditure limits) operate under fundamentally different legal, constitutional, and social constraints than local commercial merchants (retail shops, restaurants, clinics, local services). Unifying them into a single table introduces schema bloat, permission leaks, and data pollution. They must be cleanly segregated into dedicated tables and endpoints.
2. **Hybrid Monetization Flexibility:** Advertisers have divergent commercial needs:
   - Performance advertisers demand **Dynamic CPM/CPC Micropayments** (pay only for verified impressions or clicks with daily budget caps).
   - Local merchants, political leaders, and community organizers demand **Fixed Daily/Period Flight Sponsorships** (prominent guaranteed takeover of the constituency top banner or feed slot for festival wishes, birthdays, inaugurations, or rallies).
   - All rates and parameters must be dynamically configurable from the backend/admin console by the tech and operations teams without requiring code redeployments.
3. **Multi-Category Political Ad Reality & Adaptive Governance:** Political advertisements are not monolithic. They span six distinct real-world categories:
   - Category 1: Festival Wishes Ads (Diwali, Sankranti, Eid, Christmas greetings).
   - Category 2: Birthday Wishes Ads (celebrating party elders, leaders, or local champions).
   - Category 3: Congratulatory Message Ads (wishing newly elected corporators, toppers, sports achievers).
   - Category 4: Milestone Achievement Ads (celebrating party foundation days, infrastructure inaugurations).
   - Category 5: Political Meeting or Rally Ads (rallies, dharnas, townhalls, padyatras).
   - Category 6: Election Campaign Ads (vote solicitation, manifesto promises, candidate appeals).
   Each category demands a nuanced, context-aware governance gate: Fast-Track automated safety review during routine civic periods, transitioning into strict, fail-closed ECI Media Certification and Monitoring Committee (MCMC) pre-certification during active Model Code of Conduct (MCC) election windows.

---

## 3. Current State Analysis

A comprehensive audit of the existing codebase reveals:
1. **Existing Prototype Schemas:**
   - `supabase/migrations/017_campaign_manager.sql`: Defined early prototype tables (`campaigns`, `ad_campaigns`, `campaign_volunteers`, `canvassing_records`). Lacks foreign key binding to canonical geography (`constituency_versions`), lacks strict MCMC compliance fields, and lacks multi-tier workspace permissions.
   - `supabase/migrations/026_campaign_wallet_and_obd.sql`: Created `campaign_wallets` and `wallet_transactions` for bulk voice OBD dispatching.
   - `supabase/migrations/035_campaign_recharge_orders.sql`: Created `campaign_recharge_orders` for Razorpay payment intent tracking.
2. **Existing Backend Routes & Services:**
   - `apps/api/src/routes/politicalAds.ts`: Provides a basic stub with in-memory fallback (`MEMORY_ADS`).
   - `apps/api/src/routes/campaign.ts`: Handles wallet recharges, pricing patches, and voice OBD broadcast dispatches, but lacks workspace team workflows and geographic intelligence endpoints.
   - `apps/api/src/services/wallet/walletService.ts`: Provides `creditWallet`, `deductWalletForService`, and transaction queries, but lacks double-entry ledger enforcement and GST tax invoice generation.
3. **Shared Contracts Gap:**
   - `packages/shared/src/contracts/` has no dedicated `campaign.ts`, `ads.ts`, or `monetization.ts` contract files, causing API and client drift.

---

## 4. Fact / Inference / Assumption / Unknown Register

| Identifier | Type | Content | Source / Basis |
| :--- | :--- | :--- | :--- |
| **FIAU-01** | **FACT** | Representation of the People Act, 1951 (Section 127A) and Supreme Court order in SLP(C) No. 6679/2004 mandate that electronic/digital political advertisements during elections must have pre-certification from the MCMC and display the printer/publisher sponsor identity. | Statutory legal requirement (ECI Compendium of Instructions) |
| **FIAU-02** | **FACT** | Outside active election periods (routine civics), social greetings, festival wishes, and milestone celebrations do NOT require district election officer MCMC pre-certification, but must comply with advertising standards (ASCI) and non-defamation/hate speech laws. | Statutory legal precedent |
| **FIAU-03** | **FACT** | In-app mobile consumer bundle must remain under 45 MB universal APK and 25 MB AAB; ad rendering must not introduce heavy external ad-tech SDKs (e.g. Google Mobile Ads, Meta Audience Network). | `JOB 024` Release Register Baseline |
| **FIAU-04** | **FACT** | Indian GST rate for online advertisement services (SAC 998311) is 18% (9% CGST + 9% SGST for intra-state, 18% IGST for inter-state). | Statutory GST Schedule |
| **FIAU-05** | **INFERENCE** | Decoupling political campaigns from commercial merchant ad accounts into separate database tables prevents statutory leakage, simplifies access control, and allows independent scaling. | Architectural isolation principle |
| **FIAU-06** | **INFERENCE** | Offering both CPM/CPC micropayments and fixed daily flight sponsorships provides the highest market reach for both local micro-retailers and political leaders. | Commercial market dynamics |
| **FIAU-07** | **ASSUMPTION** | A dynamic admin pricing table (`ad_pricing_configurations`) cached in memory with a 60-second TTL allows real-time rate adjustments without database read bottlenecks during high-traffic ad serving. | High-throughput systems design |

---

## 5. Target Architecture & Intended Outcome

Domain 6 introduces an integrated, segregated Political Finance & Monetization Architecture:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   POLIGRAM DOMAIN 6 ISOLATED DUAL ARCHITECTURE                 │
└─────────────────────────────────────────────────────────────────────────────┘

       [ POLITICAL DOMAIN ]                              [ COMMERCIAL DOMAIN ]
  (Aspirants, MLAs, MPs, Parties)                    (Local Merchants, Retailers, SMEs)
                │                                                 │
                ▼                                                 ▼
┌───────────────────────────────┐                 ┌───────────────────────────────┐
│ TABLE: political_campaigns    │                 │ TABLE: commercial_ad_accounts │
│ • Workspace RBAC (5 Roles)    │                 │ • Merchant Profile / GSTIN    │
│ • AC/PC Geographic Binding    │                 │ • Physical Store Coordinates  │
│ • Candidate/Party Entity ID   │                 │ • Business Category           │
└───────────────┬───────────────┘                 └───────────────┬───────────────┘
                │                                                 │
                ├──────────────────────┐                          │
                ▼                      ▼                          ▼
┌───────────────────────────────┐ ┌───────────────┐ ┌───────────────────────────────┐
│ JOB 055: CAMPAIGN             │ │ JOB 056: TEAM │ │ TABLE: commercial_ads         │
│ GEOGRAPHIC INTELLIGENCE       │ │ WORKFLOW      │ │ • Headline, Media URL, CTA    │
│ • Civic Grievances by Ward    │ │ • Posts       │ │ • Target AC / Radius          │
│ • Sentiment & CDI Heatmaps    │ │ • Shorts      │ │ • Feed Inline / Shorts Slot   │
│ • Strict Locality Isolation   │ │ • Rallies     │ └───────────────┬───────────────┘
└───────────────────────────────┘ └───────┬───────┘                 │
                                          │                         │
                                          ▼                         │
                          ┌───────────────────────────────┐         │
                          │ TABLE: political_ads          │         │
                          │ • 6 Categories (Festivals,    │         │
                          │   Birthdays, Rallies, etc.)   │         │
                          │ • Adaptive Governance Gate    │         │
                          │ • ECI MCMC Cert & PDF Link    │         │
                          │ • Candidate Expenditure Sync  │         │
                          └───────────────┬───────────────┘         │
                                          │                         │
                                          ▼                         ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │          UNIFIED SERVING & HYBRID BILLING CORE          │
                  │                                                         │
                  │  [TABLE: ad_pricing_configurations]                     │
                  │  • CPM Rates (per 1k imp) • CPC Rates (per click)       │
                  │  • Fixed Daily Flight Rates (Banner/Feed Takeover)      │
                  │  • Admin Dynamic Configuration & Multipliers            │
                  │                                                         │
                  │  [JOB 058/059: SERVING & TELEMETRY ENGINE]              │
                  │  • Deterministic AC Matching • Signed View Tokens       │
                  │  • Anti-Fraud IVT Click Filters • Frequency Capping     │
                  │                                                         │
                  │  [JOB 060: DOUBLE-ENTRY FINANCIAL LEDGER]               │
                  │  • Prepaid Wallets (Political / Commercial)             │
                  │  • 18% GST Tax Invoices (SAC 998311)                    │
                  │  • Public ECI Ad Transparency Ledger                    │
                  └─────────────────────────────────────────────────────────┘
```

---

## 6. Governing Rules & Constraints

1. **Zero Mock / Zero Stub Invariant:**
   All campaign operations, ad serving endpoints, and financial transactions must execute against live PostgreSQL tables, strict schemas, and real calculations. No dummy data in production pathways.
2. **Schema & Endpoint Separation:**
   Political campaigns (`political_campaigns`, `political_ads`) and commercial merchants (`commercial_ad_accounts`, `commercial_ads`) must reside in separate tables and separate API route modules (`/api/v1/campaigns/political/*` vs `/api/v1/commercial-ads/*`).
3. **Adaptive Political Ad Governance & Statutory Compliance:**
   - **Category 1 (Festival Wishes):** Cultural greetings. Fast-Track review ($\le 15$ min) during normal times; MCMC pre-certification required during active MCC.
   - **Category 2 (Birthday Wishes):** Leader/elder birthday wishes. Fast-Track review during normal times; MCMC required during active MCC.
   - **Category 3 (Congratulatory Messages):** Achievements/toppers/elected corporators. Fast-Track review during normal times; MCMC required during active MCC.
   - **Category 4 (Milestone Achievements):** Infrastructure inaugurations, party founding days. Fast-Track review during normal times; MCMC required during active MCC.
   - **Category 5 (Political Meetings & Rallies):** Rallies, townhalls, public meetings. Standard political KYC review (plus ground permission declaration if $> 500$ capacity); MCMC required during active MCC.
   - **Category 6 (Election Campaign Ads):** Explicit vote solicitation, party manifestos. Hard fail-closed MCMC gate in all electoral contexts.
   - **Common Invariant:** Under Section 127A of the Representation of the People Act, 1951, ALL political ads regardless of category must display the statutory sponsor disclaimer and be publicly searchable in the **Public Ad Transparency Ledger** (`GET /api/v1/political-ads/transparency`).
4. **Hybrid Configurable Pricing & Double-Entry Invariant:**
   - Both CPM/CPC micropayments and fixed daily flight sponsorships are supported.
   - All pricing parameters originate from `ad_pricing_configurations` editable via admin controls.
   - $\text{Wallet Balance} = \sum \text{Recharge Credits} - \sum \text{Ad Spend Debits} - \sum \text{Refunds}$. Negative balances are rejected by PostgreSQL `CHECK (balance_inr >= 0)`.
5. **Anti-Astroturfing & Geographic Integrity:**
   Political ads can ONLY target constituencies where the candidate or party is registered to contest. Cross-state unauthorized political spam is blocked.
6. **DPDP Act 2023 Compliance:**
   Ad telemetry captures only aggregated counts and anonymous session hashes. No PII, voter profiling, or Aadhaar data is attached to ad events.
7. **Mobile App Independence:**
   Zero external proprietary ad-network SDKs. Ads are rendered using native React Native components (`FeedAdCard`, `ShortsAdOverlay`, `ConstituencyBanner`) consuming JSON payloads from Fastify.

---

## 7. Full Scope of Work (The 8 Pending Jobs)

### JOB 054: Political Campaign Foundation
- Create `political_campaigns` and `political_campaign_members` tables.
- Implement RBAC with 5 distinct roles: `campaign_manager`, `content_creator`, `field_director`, `finance_officer`, `analyst`.
- Workspace invite system with cryptographic tokens, role validation, and target AC binding.

### JOB 055: Campaign Geographic Intelligence
- Service layer aggregating real-time civic issues, citizen sentiment, and CDI scores for the campaign's target Assembly Constituency.
- Ward/booth level civic complaint density and issue categorization (water, roads, sanitation, power).
- Strict locality isolation preventing unauthorized out-of-district surveillance.

### JOB 056: Campaign Communication & Team Workflow
- Multi-modality campaign content drafting: Posts, Shorts, Events, and Rallies.
- 4-stage governance workflow: `DRAFT → SUBMITTED → APPROVED → PUBLISHED`.
- Audit logging tracking creator, reviewer, and publication timestamps.

### JOB 057: Political Advertising & Adaptive Governance Matrix
- Implement 6-category political ad taxonomy (`festival_wishes`, `birthday_congratulatory`, `milestone_achievement`, `rally_meeting`, `election_campaign`, `issue_advocacy`).
- Context-aware governance engine (`ROUTINE_CIVIC` fast-track vs `MCC_ACTIVE` strict MCMC gate).
- Mandatory sponsor disclaimer generator.
- Public Ad Transparency Ledger endpoint (`GET /api/v1/political-ads/transparency`) with full search and filtering.
- Attribution to candidate statutory election expenditure limits.

### JOB 058: Commercial Ads V1 & Separate Account Management
- Create `commercial_ad_accounts` and `commercial_ads` tables.
- Commercial creative management (headline, body, media asset URL, CTA link/phone).
- Placement slots: `feed_inline`, `shorts_interstitial`, `constituency_banner`.
- Deterministic targeting engine matching user Assembly Constituency and flight dates.
- Pacing engine with daily impression caps and frequency capping (max 3 impressions/user/24h).

### JOB 059: Ad Measurement & Telemetry
- High-integrity telemetry endpoints: `POST /api/v1/ads/telemetry/impression` and `POST /api/v1/ads/telemetry/click`.
- Signed viewability tokens (`viewToken`) preventing impression forgery.
- Anti-fraud click deduplication filtering multiple clicks from the same IP/session within 5 seconds.
- Real-time aggregate metric calculation: Impressions, Clicks, Unique Reach, CTR, and Effective Spend.

### JOB 060: Hybrid Ad Billing, Invoicing & Financial Ledger
- Create `ad_pricing_configurations` table with admin adjustment endpoints (`PATCH /api/v1/admin/pricing-configurations`).
- Support both **CPM/CPC Micropayments** and **Fixed Daily Flight Sponsorships**.
- Double-entry transaction ledger in `wallet_transactions` tracking credits, debits, tax, and running balance.
- GST-compliant invoice generation (18% GST with SAC 998311, CGST/SGST split, sequential invoice numbers).
- Automated micro-billing engine deducting wallet balances per verified 1,000 impressions (CPM) or per click (CPC), or charging lump-sum daily flight fees upfront.

### JOB 061: Commercial Self-Serve Ads Portal
- Complete 8-stage self-serve onboarding route suite for local merchants:
  `register → campaign → creative → geography → pricing_model (CPM/CPC or Daily Flight) → payment → approval → serve → analytics`.
- Validation schemas ensuring budget limits (minimum ₹500 for CPM/CPC, minimum ₹1,000 for Daily Flight), valid URLs, and telephone formats.
- End-to-end integration test simulating an external merchant running a campaign.

---

## 8. Explicit Out-of-Scope Boundaries

1. **Third-Party External Ad Exchange Integration:** No RTB (Real-Time Bidding), OpenRTB, Prebid, or Google Ad Manager integrations. PANIN serves 100% direct-sold first-party and local merchant inventory.
2. **Micro-Targeting by Behavioral Surveillance:** Targeting is strictly limited to geographic units (State, District, Assembly Constituency, Mandal) and explicit civic categories. Surveillance-based behavioral/demographic profiling is strictly prohibited.
3. **Cryptocurrency or Foreign Currency Payments:** All financial transactions are strictly denominated in Indian Rupees (INR) via RBI-authorized payment aggregators (Razorpay / UPI).
4. **Automated AI Ad Creative Generation:** Generative AI copywriting or video generation for political ads is out of scope for Domain 6 (deferred to Domain 8 AI governance).

---

## 9. Step-by-Step Implementation Plan

### Step 1: Canonical Database Migration (`079_domain6_political_finance_campaigns_and_ads.sql`)
- Author comprehensive migration creating:
  - `political_campaigns` & `political_campaign_members`
  - `political_campaign_content` & `political_campaign_approvals`
  - `political_ads` (with 6 categories, MCMC metadata, statutory disclaimer, and expenditure attribution)
  - `commercial_ad_accounts` & `commercial_ads`
  - `ad_pricing_configurations` (admin-configurable rates for CPM, CPC, Daily Flight across AC tiers)
  - `ad_telemetry_events` & `ad_daily_metrics`
  - `gst_tax_invoices`
  - Upgrade `wallet_transactions` with double-entry reference IDs and GST metadata.
  - Set up PostgreSQL indexes and RLS policies.

### Step 2: Shared TypeScript Contracts (`packages/shared/src/contracts/campaign.ts`)
- Define and export interfaces:
  - `PoliticalCampaignDTO`, `CampaignMemberDTO`, `CampaignRole`
  - `PoliticalContentItemDTO`, `ContentWorkflowStatus`
  - `PoliticalAdCategory`, `PoliticalAdDTO`, `PoliticalAdDisclosureDTO`, `ElectoralWindowState`
  - `CommercialAdAccountDTO`, `CommercialAdDTO`, `AdPlacementType`
  - `AdPricingConfigDTO`, `PricingModelType`
  - `AdTelemetryInput`, `AdPerformanceMetricsDTO`
  - `TaxInvoiceDTO`, `WalletLedgerEntryDTO`
- Rebuild `@kshetra/shared`.

### Step 3: Backend Services Layer (`apps/api/src/services/`)
- `politicalCampaignService.ts`: Workspaces, team RBAC, content draft-review-publish workflow, and geographic intelligence aggregation.
- `politicalAdService.ts`: 6-category adaptive governance gate, MCMC verification, public transparency ledger, and election expenditure tracking.
- `commercialAdService.ts`: Merchant profile onboarding, commercial ad lifecycle, and placement validation.
- `adServingEngine.ts`: Deterministic AC matching, placement selection (Feed, Shorts, Banner), frequency capping, and flight schedule checks.
- `adTelemetryService.ts`: Signed impression tokens, click deduplication, anti-fraud IVT, and metric rollup.
- `pricingConfigService.ts`: In-memory cached dynamic pricing engine with admin override controls.
- `billingLedgerService.ts`: Double-entry transaction recording, GST invoice calculation, and automated wallet deduction (micropayments vs daily flight).

### Step 4: Fastify API Routes (`apps/api/src/routes/`)
- `apps/api/src/routes/politicalCampaigns.ts`: `/api/v1/campaigns/political/*`
- `apps/api/src/routes/campaignIntelligence.ts`: `/api/v1/campaigns/intelligence/*`
- `apps/api/src/routes/politicalAds.ts`: `/api/v1/political-ads/*`
- `apps/api/src/routes/politicalAdTransparency.ts`: `/api/v1/political-ads/transparency`
- `apps/api/src/routes/commercialAds.ts`: `/api/v1/commercial-ads/*`
- `apps/api/src/routes/adServing.ts`: `/api/v1/ads/serve`
- `apps/api/src/routes/adTelemetry.ts`: `/api/v1/ads/telemetry/*`
- `apps/api/src/routes/adminPricing.ts`: `/api/v1/admin/pricing-configurations`
- `apps/api/src/routes/billingInvoices.ts`: `/api/v1/billing/invoices/*`
- Register routes in `apps/api/src/server.ts`.

### Step 5: Mobile Client Integration Contracts & Interfaces
- Author client API endpoints in `apps/mobile/lib/api/endpoints/campaign.ts` and `apps/mobile/lib/api/endpoints/ads.ts`.
- Ensure zero bundle bloat and type-safe consumption.

### Step 6: Automated Test Suites
- Author dedicated tests:
  - `tests/job054-political-campaign-foundation.test.ts`
  - `tests/job055-campaign-intelligence.test.ts`
  - `tests/job056-campaign-communication.test.ts`
  - `tests/job057-political-ads-adaptive-governance.test.ts`
  - `tests/job058-commercial-ads-isolated.test.ts`
  - `tests/job059-ad-measurement-telemetry.test.ts`
  - `tests/job060-hybrid-ad-billing-ledger.test.ts`
  - `tests/job061-commercial-self-serve-portal.test.ts`

---

## 10. Verification & Testing Strategy

1. **Unit & State Machine Verification:**
   - Verify all role permissions in political campaigns (unauthorized roles blocked fail-closed).
   - Verify content state machine (`DRAFT → SUBMITTED → APPROVED → PUBLISHED`).
   - Verify adaptive governance across all 6 political ad categories (Fast-Track in normal times, strict MCMC fail-closed in MCC).
2. **Hybrid Serving Engine & Telemetry Verification:**
   - Verify deterministic ad selection based on user constituency.
   - Verify daily flight banner takeovers vs dynamic CPM/CPC inline cards.
   - Verify frequency capping (max 3 impressions per user per 24h).
   - Verify signed viewability tokens and invalid click rejection.
3. **Financial Ledger & Reconciliation Verification:**
   - Double-entry balance equality: Wallet debit = Ad spend = Ledger entry.
   - Exact GST math: Total = Base + 9% CGST + 9% SGST.
   - Zero negative wallet balances enforced by database.
   - Dynamic admin pricing update reflected immediately in serving calculations.
4. **Full Self-Serve Simulation:**
   - Execute an end-to-end integration test simulating a merchant onboarding, creating an ad with choice of CPM/CPC or Daily Flight, recharging wallet, receiving verified impressions, and receiving a GST invoice.

---

## 11. Negative-Path Testing Specification

| Test ID | Scenario | Expected Result |
| :--- | :--- | :--- |
| **NEG-D6-01** | Content creator attempts to publish political campaign content without manager approval. | **403 Forbidden** (`UnauthorizedContentPublishError`) |
| **NEG-D6-02** | Campaign team attempts to query intelligence for an unauthorized Assembly Constituency. | **403 Forbidden** (`ConstituencyAccessDeniedError`) |
| **NEG-D6-03** | Political ad submitted during MCC window without MCMC certificate number and PDF. | **400 Bad Request** (`MCMCCertificateRequiredDuringMCCError`) |
| **NEG-D6-04** | Ad impression submitted with forged, tampered, or expired viewToken. | **401 Unauthorized** (`InvalidViewTokenError`) |
| **NEG-D6-05** | Rapid repeat clicks submitted from same IP within 2 seconds. | **429 Too Many Requests** / Filtered as IVT click |
| **NEG-D6-06** | Ad serving requested when campaign wallet balance is zero. | **402 Payment Required** / Creative excluded from pool |
| **NEG-D6-07** | Self-serve ad campaign created with budget < minimum threshold. | **400 Bad Request** (`MinimumBudgetThresholdError`) |
| **NEG-D6-08** | Commercial merchant attempts to publish political advertisement without political registration. | **403 Forbidden** (`CommercialAccountCannotPublishPoliticalAdError`) |

---

## 12. Evidence Generation Plan

1. **Automated Test Results:** Persisted test runs with exit code 0.
2. **Formal Dossiers:**
   - `reports/domain6_political_finance_campaigns_ads_report.json`
   - `reports/domain6_political_finance_campaigns_ads_report.md`
3. **Ledger Audit Log:** Evidence verifying 100% reconciliation between Razorpay top-ups, campaign spend, and tax invoices.

---

## 13. Reconciliation Plan

1. Reconcile existing tables from `017_campaign_manager.sql` and `026_campaign_wallet_and_obd.sql` with new canonical schema in `079_domain6_political_finance_campaigns_and_ads.sql`.
2. Ensure backward compatibility with existing `apps/api/src/services/wallet/walletService.ts` and `apps/api/src/routes/campaign.ts`.
3. Update `ACCEPTANCE_REGISTER.md` with individual entries for JOB 054, 055, 056, 057, 058, 059, 060, 061.

---

## 14. Independent Verification Specification

- Verification script runnable independently via standard Node.js/tsx test runners.
- Direct PostgreSQL assertions verifying schema constraints, RLS policies, and balance invariants.
- Strict remote origin equality and clean working tree verification via `node tests/governance-consistency.test.mjs`.

---

## 15. Risks, Failure Modes & Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Political Ad Regulatory Violation** | Legal liability, ECI censure | Hard fail-closed gate during MCC: ads cannot be approved without verified MCMC certificate and visible disclaimer. |
| **Ad Click Fraud / Bot Traffic** | Financial drain on local merchants | Server-signed view tokens + 5-second session click deduplication. |
| **Wallet Balance Inconsistency** | Financial dispute, revenue leakage | Database-level `CHECK (balance_inr >= 0)` constraint + atomic PostgreSQL transactions for all ledger debits/credits. |
| **Cross-Contamination of Accounts** | Commercial merchants posting political ads | Strict table and endpoint isolation (`political_campaigns` vs `commercial_ad_accounts`). |

---

## 16. Rollback & Recovery Strategy

1. **Schema Rollback:** Authored rollback script `supabase/rollback_079_domain6_political_finance.sql` to cleanly drop created tables without touching core geography or civic tables.
2. **Feature Flags:** `ENABLE_POLITICAL_ADS` and `ENABLE_COMMERCIAL_ADS` feature flags allowing immediate shutoff without service disruption.
3. **Financial Safety:** If wallet processing encounters errors, fail-closed: reject transaction, preserve existing balance, and log error with full audit context.

---

## 17. Impact Assessment

- **Database:** Introduces 8 new tables and upgrades 1 table. Zero breaking changes to existing geography or civic tables.
- **API Performance:** Deterministic ad serving utilizes cached active ad pools, ensuring response latency $< 15$ ms.
- **Mobile Bundle:** Zero increase in native bundle size. Pure JSON payloads rendered via existing UI components.
- **Statutory Standing:** First Indian civic-tech platform with 100% automated ECI MCMC, Section 127A RPA 1951, and 6-category adaptive political governance.

---

## 18. Acceptance Criteria & Definition of Done

- [ ] All 8 jobs (JOB 054–061) fully implemented with real PostgreSQL tables, shared contracts, and Fastify routes.
- [ ] Political campaigns and commercial merchant accounts completely separated in database and routes.
- [ ] Campaign workspace RBAC with 5 roles verified.
- [ ] Geographic intelligence aggregates civic issues, sentiment, and CDI for target AC.
- [ ] Multi-modality campaign content workflow (`DRAFT → SUBMITTED → APPROVED → PUBLISHED`) verified.
- [ ] 6-category political ad taxonomy with adaptive governance (Fast-Track vs MCC MCMC) verified.
- [ ] Public Ad Transparency Ledger endpoint (`GET /api/v1/political-ads/transparency`) fully operational.
- [ ] Commercial ads serve deterministically with frequency capping.
- [ ] Hybrid pricing engine supports both CPM/CPC micropayments and fixed daily flight sponsorships with admin configuration controls.
- [ ] Ad telemetry verifies impressions with signed view tokens and filters invalid clicks.
- [ ] Double-entry wallet ledger reconciles with 100% precision and generates 18% GST tax invoices.
- [ ] Self-serve commercial ad portal executes end-to-end 8-stage simulation.
- [ ] 100% test pass rate across all dedicated Domain 6 test suites.
- [ ] Zero TypeScript errors across `@kshetra/shared` and `@kshetra/api`.
- [ ] Governance consistency tests pass 100% on clean tree.

---

## 19. Artifact & Commit Lineage Map

- **Planning Document:** `governance/plans/PLAN-DOMAIN-6-POLITICAL-FINANCE-CAMPAIGNS-ADS-REV-1.1.md`
- **Conversation Artifact:** `domain_6_pre_implementation_plan.md`
- **Migration:** `supabase/migrations/079_domain6_political_finance_campaigns_and_ads.sql`
- **Shared Contracts:** `packages/shared/src/contracts/campaign.ts`
- **Backend Services:** `politicalCampaignService.ts`, `politicalAdService.ts`, `commercialAdService.ts`, `adServingEngine.ts`, `adTelemetryService.ts`, `pricingConfigService.ts`, `billingLedgerService.ts`
- **Backend Routes:** `apps/api/src/routes/politicalCampaigns.ts`, `politicalAds.ts`, `politicalAdTransparency.ts`, `commercialAds.ts`, `adServing.ts`, `adTelemetry.ts`, `adminPricing.ts`, `billingInvoices.ts`
- **Tests:** `tests/job054` through `tests/job061` test suites
- **Evidence Dossier:** `reports/domain6_political_finance_campaigns_ads_report.md`
- **Registers:** `ACCEPTANCE_REGISTER.md`, `EXECUTION_STATE.md`, `DECISION_LOG.md` (DEC-185, DEC-186, DEC-187)

---

## 20. Amendment Compliance Matrix

- **Amendment v1.2:** Immutability of accepted baselines preserved; zero regressions in Domains 1–5.
- **Amendment v1.5-A Section 26:** Authoritative 22-section Pre-Implementation Plan submitted before code execution; formal user ratification gate required.
- **Amendment v1.6:** Five-coordinate model and non-self-acceptance strictly enforced; implementation freeze remains active (`IMPLEMENTATION_AUTHORIZATION = NO`) until formal commit.

---

## 21. Operational Declarations

### Section 27 Pre-Implementation Declaration:
> "I declare that this Pre-Implementation Plan Revision 1.1 for Domain 6 (JOB 054 through JOB 061) has been authored with rigorous, non-hallucinatory precision based on the Master Product Blueprint and explicit user architectural direction. All 8 pending jobs are accounted for with full architectural depth, separated political/commercial schemas, hybrid configurable pricing, and an adaptive 6-category political ad governance matrix. Implementation remains strictly frozen (`IMPLEMENTATION_AUTHORIZATION = NO`) pending explicit user ratification."

---

## 22. Plan Sign-Off & Execution Authorization Disposition

With the architectural decisions fully synthesized:
- **Decision 1:** Ratified as **Option B: Separate Tables Architecture** (`political_campaigns` vs `commercial_ad_accounts`).
- **Decision 2:** Ratified as **Hybrid Configurable Model** (Dynamic CPM/CPC + Fixed Daily Flight Sponsorships via backend `ad_pricing_configurations` table).
- **Decision 3:** Ratified as **Adaptive 6-Category Political Ad Governance Matrix** (Fast-Track for routine greetings/milestones vs Fail-Closed ECI MCMC Pre-Certification during MCC, with public transparency ledger under RPA 1951 Section 127A).
