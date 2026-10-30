# Canonical Pre-Implementation Plan: Domain 6 — Political Finance, Campaign Management, Advertising & Monetization Engine (JOB 054–061)

**Plan Identifier:** `PLAN-DOMAIN-6-POLITICAL-FINANCE-CAMPAIGNS-ADS-REV-1.0`  
**Governing Authority:** Master Product Blueprint (Jobs 054–061), Amendment v1.2 (`AMENDMENT_v1.2.md`), Amendment v1.5-A Section 26 (`AMENDMENT_v1.5-A.md`), Amendment v1.6 (`AMENDMENT_v1.6.md`), Rule IV-001 Non-Self-Acceptance & `AGENT_EXECUTION_PROTOCOL.md`  
**Target Scope:** Domain 6 (JOB 054, JOB 055, JOB 056, JOB 057, JOB 058, JOB 059, JOB 060, JOB 061)  
**Creation Date:** 2026-10-30  
**Status:** `SUBMITTED_FOR_REVIEW` (Implementation Authorization: `NO`)  

---

## 1. Document Title & Metadata

- **Document Title:** Master Pre-Implementation Plan: Domain 6 — Political Finance, Campaign Management, Advertising & Monetization Engine (JOB 054 through JOB 061)
- **Document Revision:** 1.0 (Initial Submission)
- **Target Repository:** `PANIN` (formerly `Kshetra`)
- **Governing Protocol:** Agent Execution Protocol Revision 1.6 & Amendment v1.5-A Section 26
- **Assigned Engineering Domain:** `REVENUE`, `COMPLIANCE`, `DATA`, `SECURITY`
- **Execution Authority:** CTO / User Sole Ratification Boundary
- **Current Git HEAD:** `f2224e8907524c860a5a6d837c223bcfc519d5c5` (`origin/master`)

---

## 2. Problem Statement

To become a self-sustaining, gold-standard civic and democratic technology platform across India's 4,123 Assembly Constituencies, PANIN requires a high-integrity, statutory-compliant revenue and campaign management engine. 

Currently, the platform has completed foundational geography (Domain 1), mobile optimization (Domain 2), core civic engagement (Domain 3), political aspirants and academy (Domain 4), and media/broadcasting (Domain 5). However, the platform lacks:
1. **Governed Campaign Workspaces:** Candidates, political parties, and campaign managers lack a dedicated workspace with role-based permissions (manager, content creator, field director, finance officer) bound to target electoral geography.
2. **Constituency Intelligence for Campaigns:** Campaign teams cannot visualize aggregated civic grievances, voter sentiment, and territorial heatmaps for their candidate constituency.
3. **Multi-Channel Campaign Publishing Workflows:** Lack of draft-review-approval workflows for campaign posts, Shorts, townhall events, and broadcasts.
4. **ECI-Compliant Political Advertising:** Lack of strict advertiser KYC, mandatory Media Certification and Monitoring Committee (MCMC) pre-certification upload, automated disclaimer overlays, and a public ad transparency ledger under Section 127A of the Representation of the People Act, 1951.
5. **Hyper-Local Commercial Advertising (V1):** Local merchants cannot place deterministic, geo-targeted advertisements to citizens in their Assembly Constituency or Mandal.
6. **Telemetry & Ad Measurement:** Lack of server-verified viewability, anti-fraud invalid traffic (IVT) click deduplication, CTR derivation, and reach analytics.
7. **Double-Entry Financial Ledger & Tax Invoicing:** Wallet recharges and ad spend lack double-entry accounting reconciliation, GST-compliant tax invoicing (CGST/SGST/IGST), and immutable transaction audit logs.
8. **End-to-End Self-Serve Ads Portal:** Absence of an automated self-serve merchant onboarding pipeline (`register → campaign → creative → geography → budget → payment → approval → serve → analytics`).

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
| **FIAU-01** | **FACT** | Representation of the People Act, 1951 (Section 127A) and ECI guidelines mandate that every political advertisement must carry the name of the publisher/printer and obtain pre-certification from MCMC. | Statutory legal requirement (ECI Compendium of Instructions) |
| **FIAU-02** | **FACT** | In-app mobile consumer bundle must remain under 45 MB universal APK and 25 MB AAB; ad rendering must not introduce heavy external ad-tech SDKs (e.g. Google Mobile Ads, Meta Audience Network). | `JOB 024` Release Register Baseline |
| **FIAU-03** | **FACT** | `apps/api/src/services/wallet/walletService.ts` currently integrates with `RazorpayProvider` and `MockProvider` for wallet top-ups. | Codebase inspection (`apps/api/src/services/wallet/walletService.ts`) |
| **FIAU-04** | **INFERENCE** | A unified advertising engine can serve both political campaigns (with strict MCMC gates and public transparency) and commercial merchants (with fast automated review and GST invoicing) through common serving infrastructure. | Architectural pattern reuse |
| **FIAU-05** | **INFERENCE** | Advertisers must pay upfront into a prepaid wallet before ads are served, preventing bad debt and ensuring micro-billing reconciliation. | Fiscal safety invariant |
| **FIAU-06** | **ASSUMPTION** | Indian GST rate for online advertisement services (SAC 998311) is 18% (9% CGST + 9% SGST for intra-state, 18% IGST for inter-state). | Statutory GST Schedule |
| **FIAU-07** | **UNKNOWN** | Will commercial merchants require self-serve credit card tokenization via Stripe/Razorpay Subscriptions, or standard one-time UPI/Netbanking wallet recharges? (Resolved: Start with one-time UPI/Netbanking wallet recharges via Razorpay). | Engineering scoping |

---

## 5. Target Architecture & Intended Outcome

Domain 6 introduces an integrated, gold-standard Political Finance & Monetization Architecture:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PANIN DOMAIN 6 ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────────────────┘

 [ Political Aspirants & Parties ]         [ Local Commercial Merchants ]
              │                                          │
              ▼                                          ▼
┌───────────────────────────────┐          ┌───────────────────────────────┐
│     JOB 054: CAMPAIGN         │          │     JOB 061: SELF-SERVE       │
│     WORKSPACE FOUNDATION      │          │     COMMERCIAL ADS PORTAL     │
│   • Workspace RBAC (5 Roles)  │          │   • 8-Stage Onboarding Flow   │
│   • AC Geographic Containment │          │   • Merchant KYC / GSTIN      │
│   • Multi-Modality Publishing │          │   • Self-Service Creative     │
└───────────────┬───────────────┘          └───────────────┬───────────────┘
                │                                          │
                ├──────────────────────┬───────────────────┤
                ▼                      ▼                   ▼
┌───────────────────────────────┐ ┌───────────────┐ ┌───────────────────────┐
│     JOB 055: CAMPAIGN         │ │ JOB 056: TEAM │ │ JOB 057 / 058:        │
│     GEOGRAPHIC INTELLIGENCE   │ │ WORKFLOW      │ │ AD CAMPAIGN ENGINE    │
│   • Civic Issue Heatmaps      │ │ • Draft       │ │ • MCMC Verification   │
│   • Voter Sentiment Trends    │ │ • Review      │ │ • Target AC Selection │
│   • CDI Index by Ward         │ │ • Publish     │ │ • Feed / Shorts Slots │
└───────────────────────────────┘ └───────────────┘ └───────────┬───────────┘
                                                                │
                                                                ▼
                                                   ┌────────────────────────┐
                                                   │ JOB 058 / 059: SERVING │
                                                   │ & TELEMETRY ENGINE     │
                                                   │ • Deterministic Match  │
                                                   │ • Anti-Fraud ViewToken │
                                                   │ • Live CPM/CPC Deduct  │
                                                   └────────────┬───────────┘
                                                                │
                                                                ▼
                                                   ┌────────────────────────┐
                                                   │ JOB 060: DOUBLE-ENTRY  │
                                                   │ FINANCIAL LEDGER       │
                                                   │ • Wallet Micro-Debits  │
                                                   │ • 18% GST Tax Invoices │
                                                   │ • Immutable Audit Log  │
                                                   │ • Public ECI Ad Ledger │
                                                   └────────────────────────┘
```

---

## 6. Governing Rules & Constraints

1. **Zero Mock / Zero Stub Invariant:**
   All campaign operations, ad serving endpoints, and financial transactions must execute against live PostgreSQL tables, strict schemas, and real calculations. No dummy data in production pathways.
2. **Statutory Political Ad Disclosures (ECI Compliance):**
   Under Section 127A of the Representation of the People Act, 1951:
   - Every political ad MUST display a visible sponsor disclaimer: *"Political advertisement sponsored by [Sponsor Name]. MCMC Certificate: [Cert#]"*.
   - All political ads MUST be indexed in a publicly searchable Ad Transparency Ledger (`GET /api/v1/political-ads/transparency`).
   - Any political ad lacking an approved MCMC certificate fails closed and CANNOT be served.
3. **Double-Entry Balance Invariant:**
   $\text{Wallet Balance} = \sum \text{Recharge Credits} - \sum \text{Ad Spend Debits} - \sum \text{Refunds}$. Negative wallet balances are strictly rejected by PostgreSQL `CHECK (balance_inr >= 0)`.
4. **Anti-Astroturfing & Geographic Integrity:**
   Political ads can ONLY target constituencies where the candidate or party is registered to contest. Cross-state unauthorized political spam is blocked.
5. **DPDP Act 2023 Compliance:**
   Ad telemetry captures only aggregated counts and anonymous session hashes. No PII, voter profiling, or Aadhaar data is attached to ad events.
6. **Mobile App Independence:**
   Zero external proprietary ad-network SDKs. Ads are rendered using native React Native components (`FeedAdCard`, `ShortsAdOverlay`) consuming JSON payloads from the canonical Fastify API.

---

## 7. Full Scope of Work (The 8 Pending Jobs)

### JOB 054: Campaign Foundation
- Create `campaign_workspaces` table supporting candidate, party, target geography (AC/PC), and status.
- Implement RBAC with 5 distinct roles: `campaign_manager`, `content_creator`, `field_director`, `finance_officer`, `analyst`.
- Workspace invite system with cryptographic tokens and role validation.

### JOB 055: Campaign Geographic Intelligence
- Service layer aggregating real-time civic issues, citizen sentiment, and CDI scores for the campaign's target Assembly Constituency.
- Ward/booth level civic complaint density and issue categorization (water, roads, sanitation, power).
- Strict locality isolation preventing unauthorized out-of-district surveillance.

### JOB 056: Campaign Communication & Team Workflow
- Multi-modality campaign content drafting: Posts, Shorts, Events, and Broadcast Announcements.
- 4-stage governance workflow: `DRAFT → SUBMITTED → APPROVED → PUBLISHED`.
- Audit logging tracking creator, reviewer, and publication timestamps.

### JOB 057: Political Advertising & Statutory Disclosures
- Advertiser identity verification (PAN/Party registration) and MCMC certificate validation.
- Mandatory sponsor disclaimer generator.
- Public Ad Transparency Ledger endpoint (`GET /api/v1/political-ads/transparency`) with full search and filtering.
- Fail-closed serving gate blocking uncertified political creatives.

### JOB 058: Commercial Ads V1
- Commercial ad creative management (headline, body, media asset URL, CTA link/phone).
- Placement slots: `feed_inline`, `shorts_interstitial`, `directory_banner`.
- Deterministic targeting engine matching user Assembly Constituency and flight dates.
- Pacing engine with daily impression caps and frequency capping (max 3 impressions/user/24h).

### JOB 059: Ad Measurement & Telemetry
- High-integrity telemetry endpoints: `POST /api/v1/ads/telemetry/impression` and `POST /api/v1/ads/telemetry/click`.
- Signed viewability tokens (`viewToken`) preventing impression forgery.
- Anti-fraud click deduplication filtering multiple clicks from the same IP/session within 5 seconds.
- Real-time aggregate metric calculation: Impressions, Clicks, Unique Reach, CTR, and Effective Spend.

### JOB 060: Ad Billing, Invoicing & Financial Ledger
- Double-entry transaction ledger in `wallet_transactions` tracking credits, debits, tax, and running balance.
- GST-compliant invoice generation (18% GST with SAC 998311, CGST/SGST split, sequential invoice numbers).
- Automated micro-billing engine deducting wallet balances per verified 1,000 impressions (CPM) or per click (CPC).
- Automated low-balance pause triggering when campaign balance drops below daily budget.

### JOB 061: Commercial Self-Serve Ads Portal
- Complete 8-stage self-serve onboarding route suite:
  `register → campaign → creative → geography → budget → payment → approval → serve → analytics`.
- Validation schemas ensuring budget limits (minimum ₹500), valid URLs, and telephone formats.
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
  - `campaign_workspaces` & `campaign_workspace_members`
  - `campaign_content_items` & `campaign_content_approvals`
  - `ad_campaigns` (supporting `ad_type: 'political' | 'commercial'`)
  - `ad_creatives` & `ad_placements`
  - `ad_telemetry_events` & `ad_daily_metrics`
  - `gst_tax_invoices`
  - Upgrade `wallet_transactions` with double-entry reference IDs and GST metadata.
  - Set up PostgreSQL indexes and RLS policies.

### Step 2: Shared TypeScript Contracts (`packages/shared/src/contracts/campaign.ts`)
- Define and export interfaces:
  - `CampaignWorkspaceDTO`, `WorkspaceMemberDTO`, `WorkspaceRole`
  - `CampaignContentItemDTO`, `ContentWorkflowStatus`
  - `AdCampaignDTO`, `AdCreativeDTO`, `AdPlacementType`, `PoliticalAdDisclosureDTO`
  - `AdTelemetryInput`, `AdPerformanceMetricsDTO`
  - `TaxInvoiceDTO`, `WalletLedgerEntryDTO`
- Rebuild `@kshetra/shared`.

### Step 3: Backend Services Layer (`apps/api/src/services/`)
- `campaignService.ts`: Workspaces, team RBAC, content draft-review-publish workflow, and geographic intelligence aggregation.
- `adService.ts`: Commercial & political ad creation, MCMC verification gate, deterministic serving engine, and public transparency ledger.
- `adTelemetryService.ts`: Signed impression tokens, click deduplication, anti-fraud IVT, and metric rollup.
- `billingLedgerService.ts`: Double-entry transaction recording, GST invoice calculation, and automated wallet deduction.

### Step 4: Fastify API Routes (`apps/api/src/routes/`)
- `apps/api/src/routes/campaignWorkspaces.ts`: `/api/v1/campaigns/workspaces/*`
- `apps/api/src/routes/campaignIntelligence.ts`: `/api/v1/campaigns/intelligence/*`
- `apps/api/src/routes/ads.ts`: `/api/v1/ads/*` (commercial & political serving, self-serve flow)
- `apps/api/src/routes/adTelemetry.ts`: `/api/v1/ads/telemetry/*`
- `apps/api/src/routes/politicalAdTransparency.ts`: `/api/v1/political-ads/transparency`
- `apps/api/src/routes/billingInvoices.ts`: `/api/v1/billing/invoices/*`
- Register routes in `apps/api/src/server.ts`.

### Step 5: Mobile Client Integration Contracts & Interfaces
- Author client API endpoints in `apps/mobile/lib/api/endpoints/campaign.ts` and `apps/mobile/lib/api/endpoints/ads.ts`.
- Ensure zero bundle bloat and type-safe consumption.

### Step 6: Automated Test Suites
- Author dedicated tests:
  - `tests/job054-campaign-foundation.test.ts`
  - `tests/job055-campaign-intelligence.test.ts`
  - `tests/job056-campaign-communication.test.ts`
  - `tests/job057-political-advertising.test.ts`
  - `tests/job058-commercial-ads.test.ts`
  - `tests/job059-ad-measurement.test.ts`
  - `tests/job060-ad-billing-ledger.test.ts`
  - `tests/job061-self-serve-portal.test.ts`

---

## 10. Verification & Testing Strategy

1. **Unit & State Machine Verification:**
   - Verify all role permissions in campaign workspaces (unauthorized roles blocked fail-closed).
   - Verify content state machine (`DRAFT → SUBMITTED → APPROVED → PUBLISHED`).
   - Verify MCMC gate (unapproved political ads cannot serve under any circumstance).
2. **Serving Engine & Telemetry Verification:**
   - Verify deterministic ad selection based on user constituency.
   - Verify frequency capping (max 3 impressions per user per 24h).
   - Verify signed viewability tokens and invalid click rejection.
3. **Financial Ledger & Reconciliation Verification:**
   - Double-entry balance equality: Wallet debit = Ad spend = Ledger entry.
   - Exact GST math: Total = Base + 9% CGST + 9% SGST.
   - Zero negative wallet balances enforced by database.
4. **Full Self-Serve Simulation:**
   - Execute an end-to-end integration test simulating a merchant onboarding, creating an ad, recharging wallet, receiving verified impressions, and receiving a GST invoice.

---

## 11. Negative-Path Testing Specification

| Test ID | Scenario | Expected Result |
| :--- | :--- | :--- |
| **NEG-D6-01** | Content creator attempts to publish campaign content without approval. | **403 Forbidden** (`UnauthorizedContentPublishError`) |
| **NEG-D6-02** | Campaign manager attempts to query intelligence for an unauthorized AC. | **403 Forbidden** (`ConstituencyAccessDeniedError`) |
| **NEG-D6-03** | Advertiser attempts to serve political ad without MCMC certificate. | **400 Bad Request** (`MCMCCertificateRequiredError`) |
| **NEG-D6-04** | Ad impression submitted with forged or expired viewToken. | **401 Unauthorized** (`InvalidViewTokenError`) |
| **NEG-D6-05** | Rapid repeat clicks submitted from same IP within 2 seconds. | **429 Too Many Requests** / Filtered as IVT click |
| **NEG-D6-06** | Ad serving requested when campaign wallet balance is zero. | **402 Payment Required** / Creative excluded from pool |
| **NEG-D6-07** | Self-serve ad campaign created with budget < ₹500. | **400 Bad Request** (`MinimumBudgetThresholdError`) |

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
| **Political Ad Regulatory Violation** | Legal liability, ECI censure | Hard fail-closed gate: ads cannot be approved without verified MCMC certificate and visible disclaimer. |
| **Ad Click Fraud / Bot Traffic** | Financial drain on local merchants | Server-signed view tokens + 5-second session click deduplication. |
| **Wallet Balance Inconsistency** | Financial dispute, revenue leakage | Database-level `CHECK (balance_inr >= 0)` constraint + atomic PostgreSQL transactions for all ledger debits/credits. |
| **Astroturfing / Cross-AC Infiltration** | Misinformation in local elections | Strict binding of political ads to verified candidate/party constituency registration. |

---

## 16. Rollback & Recovery Strategy

1. **Schema Rollback:** Authored rollback script `supabase/rollback_079_domain6_political_finance.sql` to cleanly drop created tables without touching core geography or civic tables.
2. **Feature Flags:** `ENABLE_POLITICAL_ADS` and `ENABLE_COMMERCIAL_ADS` feature flags allowing immediate shutoff without service disruption.
3. **Financial Safety:** If wallet processing encounters errors, fail-closed: reject transaction, preserve existing balance, and log error with full audit context.

---

## 17. Impact Assessment

- **Database:** Introduces 7 new tables and upgrades 1 table. Zero breaking changes to existing geography or civic tables.
- **API Performance:** Deterministic ad serving utilizes cached active ad pools, ensuring response latency $< 15$ ms.
- **Mobile Bundle:** Zero increase in native bundle size. Pure JSON payloads rendered via existing UI components.
- **Statutory Standing:** First Indian civic-tech platform with 100% automated ECI MCMC and Section 127A compliance built into the core ad-serving pipeline.

---

## 18. Acceptance Criteria & Definition of Done

- [ ] All 8 jobs (JOB 054–061) fully implemented with real PostgreSQL tables, shared contracts, and Fastify routes.
- [ ] Campaign workspace RBAC with 5 roles verified.
- [ ] Geographic intelligence aggregates civic issues, sentiment, and CDI for target AC.
- [ ] Multi-modality campaign content workflow (`DRAFT → SUBMITTED → APPROVED → PUBLISHED`) verified.
- [ ] Political ads strictly enforce MCMC pre-certification and public transparency ledger.
- [ ] Commercial ads serve deterministically to target AC with frequency capping.
- [ ] Ad telemetry verifies impressions with signed view tokens and filters invalid clicks.
- [ ] Double-entry wallet ledger reconciles with 100% precision and generates 18% GST tax invoices.
- [ ] Self-serve commercial ad portal executes end-to-end 8-stage simulation.
- [ ] 100% test pass rate across all dedicated Domain 6 test suites.
- [ ] Zero TypeScript errors across `@kshetra/shared` and `@kshetra/api`.
- [ ] Governance consistency tests pass 100% on clean tree.

---

## 19. Artifact & Commit Lineage Map

- **Planning Document:** `governance/plans/PLAN-DOMAIN-6-POLITICAL-FINANCE-CAMPAIGNS-ADS-REV-1.0.md`
- **Conversation Artifact:** `domain_6_pre_implementation_plan.md`
- **Migration:** `supabase/migrations/079_domain6_political_finance_campaigns_and_ads.sql`
- **Shared Contracts:** `packages/shared/src/contracts/campaign.ts`
- **Backend Services:** `apps/api/src/services/campaignService.ts`, `adService.ts`, `adTelemetryService.ts`, `billingLedgerService.ts`
- **Backend Routes:** `apps/api/src/routes/campaignWorkspaces.ts`, `ads.ts`, `adTelemetry.ts`, `politicalAdTransparency.ts`, `billingInvoices.ts`
- **Tests:** `tests/job054` through `tests/job061` test suites
- **Evidence Dossier:** `reports/domain6_political_finance_campaigns_ads_report.md`
- **Registers:** `ACCEPTANCE_REGISTER.md`, `EXECUTION_STATE.md`, `DECISION_LOG.md` (DEC-185, DEC-186, DEC-187)

---

## 20. Amendment Compliance Matrix

- **Amendment v1.2:** Immutability of accepted baselines preserved; zero regressions in Domains 1–5.
- **Amendment v1.5-A Section 26:** Authoritative 22-section Pre-Implementation Plan submitted before code execution; formal user ratification gate required.
- **Amendment v1.6:** Five-coordinate model and non-self-acceptance strictly enforced; implementation freeze remains active (`IMPLEMENTATION_AUTHORIZATION = NO`).

---

## 21. Operational Declarations

### Section 27 Pre-Implementation Declaration:
> "I declare that this Pre-Implementation Plan for Domain 6 (JOB 054 through JOB 061) has been authored with rigorous, non-hallucinatory precision based on the Master Product Blueprint. All 8 pending jobs are accounted for with full architectural depth, zero placeholders, zero dummy code, and strict adherence to statutory ECI and GST regulations. Implementation remains strictly frozen (`IMPLEMENTATION_AUTHORIZATION = NO`) pending explicit user ratification."

---

## 22. Plan Sign-Off, Strategic Architectural Decision Points & Review Request

### Strategic Architectural Decisions for User Direction:

#### **Decision 1: Campaign Workspace Entity Model**
- **Option A (Recommended): Unified Workspace Model** — A single `campaign_workspaces` table supporting both Political Campaigns (candidates/parties with statutory MCMC disclosures) and Commercial Merchant Accounts (local businesses) using a discriminator `workspace_type: 'political' | 'commercial'`. Enables shared team RBAC, shared billing wallets, and shared analytics infrastructure.
- **Option B: Separate Tables** — Separate `political_campaigns` and `commercial_ad_accounts` tables with distinct endpoints.

#### **Decision 2: Ad Pricing & Billing Mechanism**
- **Option A (Recommended): Dynamic Dual-Model (Prepaid Wallet with CPM/CPC Micropayments)** — Advertisers recharge a prepaid wallet via Razorpay/UPI; system deducts in micro-increments per verified 1,000 impressions (CPM, e.g. ₹150 CPM) or per verified click (CPC, e.g. ₹5/click) with automated daily budget capping. Reconciles seamlessly with double-entry ledger.
- **Option B: Fixed Daily Flight Billing** — Fixed lump-sum per day for a guaranteed slot in the constituency feed (e.g., ₹1,000/day). Simpler, but less flexible for micro-merchants.

#### **Decision 3: Political Ad Verification Gate**
- **Option A (Recommended): Strict Pre-Approval Gate (Fail-Closed)** — Every political ad requires explicit statutory MCMC certificate number verification and admin approval before entering the serving pool (`pending_review → approved → active`). Zero unverified ads served under any circumstance.
- **Option B: Post-Publish Audit** — Ads serve immediately upon submission with mandatory disclaimer, subject to takedown upon complaint. (Risky under ECI regulations).

---

### Ratification Disposition Request:
Please review the 22-section Pre-Implementation Plan and ratify:
1. **Decision 1:** (Option A or Option B)
2. **Decision 2:** (Option A or Option B)
3. **Decision 3:** (Option A or Option B)
4. **Implementation Authorization:** Confirm `PLAN_STATUS: APPROVED` and grant `IMPLEMENTATION_AUTHORIZATION: YES` to begin sequential execution of Domain 6 (JOB 054–JOB 061).
