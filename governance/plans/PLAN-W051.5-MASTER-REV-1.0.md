# PLAN-W051.5-MASTER-REV-1.0: Compliance, DPDP & Data Governance Readiness

**Milestone:** W051.5  
**Title:** Compliance, DPDP & Data Governance Readiness  
**Authority:** Master Product Blueprint, AI Agent Master Execution Job Book, Amendment v1.2 (`AMENDMENT_v1.2.md`) Part 2, Part 17, Part 18  
**Accountable Owner:** COMPLIANCE  
**Technical Owner:** ARCH  
**Delivery Owners:** COMPLIANCE + ARCH + BE + MOB + SEC + DATA + DEVOPS  
**Acceptance Authority:** SEC + QA + COMPLIANCE (with Legal Review Items Flagged)  
**Date:** 2026-10-29  
**Status:** APPROVED FOR EXECUTION  

---

## 1. Executive Context & Objective

Following the empirical completion, testing, and acceptance of **Job W051 (API Customer Acquisition)** under DEC-167, PanIN is preparing to enter commercial operation and expand into professional broadcast architectures, campaign tooling, aspirant portals, media distribution, and advertising.

Pursuant to **Amendment v1.2**, Job **W051.5** must execute before any expansion into Job W052 (Professional Broadcast Architecture). Its objective is to establish an end-to-end, technically enforceable privacy, personal data governance, and compliance-by-design foundation anchored in:
1. **Digital Personal Data Protection Act, 2023 (DPDP Act 2023)** (Act No. 22 of 2023).
2. **Digital Personal Data Protection Rules, 2025 (DPDPR 2025)**.
3. **Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021**.
4. **TRAI Telecom Commercial Communications Customer Preference Regulations, 2018 (TCCCPR 2018)**.

---

## 2. Statutory Scope & Architectural Boundaries

### 2.1 Private Citizen Data vs. Statutory Public Political Records
A foundational architectural invariant of Poligram is the strict segregation between:
- **Private Citizen Personal Data:** Protected under DPDP Act 2023. Governed by purpose limitation, explicit consent, right to correction, right to erasure, and strict data minimization. Includes citizen voter IDs, mobile numbers, passwords, precise GPS locations, session tokens, and KYC documents.
- **Statutory Public Electoral Facts:** Sourced from official gazettes, Election Commission of India (ECI) Form 20/Form 26 statutory affidavits, delimitation orders, and constitutional gazette notifications. These constitute non-derogable public records under the Representation of the People Act, 1950 & 1951. They are immutable, publicly audited, and strictly segregated from citizen account deletion workflows.

### 2.2 Ban on Inferred Political Profiling
Poligram enforces a strict architectural ban on individual-level political belief inference. Advertising and civic recommendations are restricted to coarse **geographical and contextual targeting** (Constituency, District, State) rather than psychographic political preference profiling.

---

## 3. Detailed Work Breakdown & Implementation Pillars

### Pillar 1: Comprehensive Personal Data Inventory & Data Flow Map
- Audit all database tables and API endpoints across the codebase:
  - `auth.users`, `user_profiles`, `user_verification`, `aspirant_profiles`, `journalist_profiles`, `politician_portal_profiles`, `campaign_wallets`, `wallet_transactions`, `voice_obd_broadcasts`, `saas_tenants`, `saas_applications`, `saas_api_keys`, `saas_usage_ledger`.
- Classify every field: entity, personal data category, sensitivity, purpose, storage location, processing region, access roles, sharing boundary, retention period, and deletion mechanism.
- Map the end-to-end data flow: `User -> Mobile/Web -> Fastify API -> Supabase DB/Storage -> External Providers (Razorpay, Exotel/OBD) -> Analytics/Logs`.

### Pillar 2: 13-Language Statutory Privacy Surface Matrix
- Fulfill the binding Pan-Indian mandate: 100% linguistic parity across all 13 supported languages:
  `en` (English), `hi` (Hindi), `te` (Telugu), `ta` (Tamil), `kn` (Kannada), `ml` (Malayalam), `mr` (Marathi), `bn` (Bengali), `gu` (Gujarati), `or` (Odia), `pa` (Punjabi), `as` (Assamese), `ne` (Nepali).
- Implement localized privacy notices, purpose explanations, consent collection dialogs, data export headers, and grievance redressal contacts for each locale.

### Pillar 3: Data Principal Rights Execution Engine
- Implement a state-machine driven backend service for Data Principal rights:
  `REQUEST -> AUTHENTICATE -> PROCESS -> AUDIT -> RESPOND -> CLOSE`.
- Workflows supported:
  1. **Right to Access (Section 11):** Summary of personal data processed, identities of data fiduciaries/processors shared with, and downloadable JSON archive.
  2. **Right to Correction & Updating (Section 12):** Rectification of inaccurate or incomplete personal data.
  3. **Right to Erasure / Account Deletion (Section 12):** Automated cascading deletion of private profiles, avatars, verification docs, sessions, and preferences, while retaining statutory legal compliance logs.
  4. **Right of Grievance Redressal (Section 13):** Formal ticketing mechanism with contact details of Data Protection Officer (DPO) and 30-day escalation SLA before Data Protection Board of India (DPBI).
  5. **Consent Withdrawal (Section 6(4)):** Graceful cessation of voluntary data processing.

### Pillar 4: Retention, Deletion & Account Erasure Lifecycle
- Construct an authoritative Retention Matrix defining granular expiration windows:
  - Auth sessions: 30 days of inactivity.
  - Verification KYC documents: 90 days post-review or immediate upon verification completion.
  - Voice OBD audio files: 180 days post-broadcast for regulatory audit.
  - Financial ledger transactions: 7 years per Companies Act & statutory accounting rules.
  - Immutable SaaS usage counts: 36 months for billing audits.
  - Soft-deleted accounts: 30-day grace recovery window before permanent physical purge.

### Pillar 5: Security Safeguards, Child Privacy & Provider Controls
- **Security:** In-transit TLS 1.3, AES-256 rest encryption, row level security (RLS), SHA-256 key hashing, HMAC webhook verification, audit logging.
- **Children's Data:** Default age gate verifying users are $\ge 18$; zero targeted tracking or behavioral profiling of minors.
- **Third-Party Providers:** Complete audit of Supabase (DB/Auth/Storage), Railway (Compute), Razorpay (Payments), Exotel (Voice OBD), and SMS gateways.
- **Breach Response Protocol:** 6-hour incident containment, forensic logging, and 72-hour statutory notification to DPBI and affected Data Principals per DPDPR 2025.

---

## 4. Deliverables & Acceptance Evidence

### Required Evidence Files (per AMENDMENT_v1.2 Part 18):
1. `scratch/compliance_data_inventory.json`
2. `scratch/compliance_data_flow.json`
3. `scratch/compliance_retention_matrix.json`
4. `scratch/compliance_rights_test.json`
5. `scratch/compliance_security_assessment.json`
6. `scratch/compliance_provider_register.json`
7. `scratch/compliance_sdf_assessment.json`
8. `scratch/compliance_gap_register.json`
9. `COMPLIANCE_DPDPA_READINESS.md`

### Code Deliverables:
- Shared Contracts: `packages/shared/src/contracts/compliance.ts`
- Backend Compliance Module: `apps/api/src/modules/compliance/`
  - `schemas.ts`
  - `inventory.ts`
  - `dataFlow.ts`
  - `rightsService.ts`
  - `retentionService.ts`
  - `privacyLocales.ts` (All 13 languages)
  - `breachService.ts`
  - `sdfService.ts`
  - `routes.ts`
  - `index.ts`
- Automated Test Suite: `apps/api/src/__tests__/compliance-w051-5.test.ts`

---

## 5. Acceptance Verification Gate

The milestone will be ratified upon:
1. All automated tests in `compliance-w051-5.test.ts` passing with 100% success.
2. Clean TypeScript build (`tsc --noEmit` exit 0).
3. 100% string completeness across all 13 official privacy language packs.
4. All 9 compliance evidence artifacts generated and committed to the repository.
5. Ratification of **DEC-168** in `DECISION_LOG.md`.
