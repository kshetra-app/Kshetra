# Master Pre-Implementation Plan: Domain 3 — Core Civic & Engagement Platform (JOB 030 – JOB 035)

**Document Version:** Rev 1.0  
**Date:** 2026-10-30  
**Status:** PLAN_SUBMITTED_FOR_REVIEW (IMPLEMENTATION_AUTHORIZATION = NO)  
**Governing Authority:** Master Product Blueprint, AI Agent Master Execution Job Book, Amendment v1.2 (`AMENDMENT_v1.2.md`), Amendment v1.3 (`AMENDMENT_v1.3.md`), Amendment v1.4 (`AMENDMENT_v1.4.md`), Amendment v1.5 (`AMENDMENT_v1.5.md`), Amendment v1.5-A (`AMENDMENT_v1.5-A.md`), Amendment v1.6 (`AMENDMENT_v1.6.md`), & `AGENT_EXECUTION_PROTOCOL.md`  
**Execution Standard:** Rule IV-001 Non-Self-Acceptance with empirical automated proofs  
**Base Commit SHA:** `f198ff0a0b67aaf777df897309b35a71bf17e1d0`  

---

## 1. Executive Summary & Objective

Following the certified completion and acceptance of **Domain 1 (JOB 012, 013, 016, 021, 022 under DEC-169)** and **Domain 2 (JOB 024, 025, 026, 027, 028, 029 under DEC-173)**, PANIN's geographic foundation, boundary delimitation engines, and mobile performance/caching layers are fully operational.

The user has explicitly commissioned **Domain 3: Core Civic & Engagement Platform**, demanding the fullest depth and functionality possible, with gold standard implementation, zero flaws, zero stubs, zero placeholders, and zero dummy code, strictly aligned with the Master Product Blueprint.

Domain 3 covers 6 critical jobs:
1. **JOB 030: Civic Issue Lifecycle Engine & State Machine** — Transforming civic reporting into a formal, auditable 5-state state machine (`OPEN -> ACKNOWLEDGED -> IN_PROGRESS -> RESOLVED -> CLOSED`, with `REOPENED` on dispute), complete with immutable audit status logs and eliminating all non-production mock bypasses.
2. **JOB 031: Geo-Fenced Issue Reporting & Evidence Pipeline** — Strict point-in-polygon constituency binding, multi-media evidence handling, DPDP-safe metadata stripping, and corroborating community evidence ("I saw this too").
3. **JOB 032: Anti-Sybil Community Upvoting, Follows & Milestone Triggers** — Idempotent transactional upvoting, follower notifications, and automatic progression thresholds (10 upvotes = citizen alert, 50 upvotes = MLA notification, 500 upvotes = auto-promotion to public headlines).
4. **JOB 033: Constituency Civic Discourse & Threaded Comments** — Official verified badge hierarchy (MLA, official, moderator, citizen), real-time threaded discussion, fail-closed content moderation, and zero-PII dispute filing.
5. **JOB 034: Local Discourse & Constituency Community Working Groups** — Citizen civic action groups, locality-scoped discussion boards (Ward, Mandal, Assembly level), and offline-first community caching via `UnifiedCacheManager`.
6. **JOB 035: Civic Metrics, Sentiment Derivation & Real Data Connectors** — Eliminating fake stubs across budget, attendance, bills, schemes, projects, and RTI in `apps/api/src/routes/civic.ts`, backed by real database models and multi-factor constituency sentiment derivation.

---

## 2. Governing Authority & Pre-Implementation Invariants

### 2.1 Governance Standard
- **Amendment v1.5-A Section 26:** Mandatory Pre-Implementation Planning and Direction-Review Gate. No product code changes may be staged or committed prior to explicit user ratification.
- **Amendment v1.6 (REV-8):** Nine-Stage Job Lifecycle State Machine, Chain-of-Custody scope enforcement, and Real-State Control M.
- **Rule IV-001 Non-Self-Acceptance:** Implementation agent cannot accept its own work; acceptance requires committed evidence packages under `reports/`.

### 2.2 Pre-Implementation Invariants
1. **Zero Mock / Zero Stub Invariant:** Every endpoint in `civic.ts` returning `{ attendance: [], total: 0 }` or `{ message: '...connect to Supabase...' }` or `if (process.env.NODE_ENV !== 'production') return { success: true }` must be replaced with real, schema-backed PostgreSQL queries or strict fail-closed contract errors.
2. **Deterministic State Machine Invariant:** Status transitions must be strictly enforced: invalid state transitions (e.g. `closed -> open` without going through `reopened`) must fail closed with HTTP 400.
3. **Strict Geo-Fencing Invariant:** Civic reports must be geographically bound to real canonical assembly constituencies (`public.constituencies`), preventing orphaned or coordinates-mismatched submissions.
4. **DPDP Act 2023 Compliance:** Citizen photo uploads must strip EXIF/location metadata before storage, and upvotes/follows must enforce anti-sybil protections without exposing citizen phone numbers or personal emails.
5. **13-Language i18n Invariant:** All new civic UI states, categories, severity badges, and error messages must maintain 100% string parity across all 13 supported Indian languages (`en`, `te`, `hi`, `ta`, `kn`, `ml`, `mr`, `bn`, `gu`, `or`, `pa`, `as`, `ne`).

---

## 3. Historical Context & Defect Traceability

### 3.1 Defect Register Links
- **DEF-004:** Moderation fail-closed semantics (enforced in W009-B3) must be integrated across all civic comments and issue reporting.
- **DEF-011:** Civic schema drift investigation (W001-R2) verified `civic_issues` exists; Domain 3 hardens and deepens all related child tables.
- **W011-DEF-03:** `toggleFollowPromise` and `toggleFollowIssue` mutating local state without server synchronization must be permanently replaced with canonical API transactions.

---

## 4. Architectural Scope & Boundary Enforcement

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ARCHITECTURAL BOUNDARIES                        │
├───────────────────────────────────┬────────────────────────────────────┤
│           IN-SCOPE (DOMAIN 3)     │      OUT-OF-SCOPE (PROTECTED)      │
├───────────────────────────────────┼────────────────────────────────────┤
│ • apps/api/src/routes/civic.ts    │ • packages/shared/src/contracts/   │
│ • apps/api/src/services/civic*    │   (auth, delimitation, saas)       │
│ • supabase/migrations/075_civic*  │ • Historical migrations 001-074    │
│ • apps/mobile/stores/civic.ts     │ • Fastify SaaS/Webhook engine      │
│ • apps/mobile/components/civic/*  │ • Railway environment variables    │
│ • tests/job030-job035 test suites │ • Delimitation spatial tables      │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 5. Concrete File Modification Matrix

| File Path | Operation | Responsibility | Description |
| :--- | :---: | :--- | :--- |
| `supabase/migrations/075_civic_platform_hardening.sql` | CREATE | DB | Adds `community_groups`, `community_group_memberships`, extends `civic_issues` indexes, and audit triggers |
| `packages/shared/src/contracts/civic.ts` | CREATE/EXTEND | CONTRACT | Canonical TypeScript DTOs, schemas, and enums for all civic operations |
| `apps/api/src/services/civicService.ts` | CREATE | BE | Core business logic, status transitions, sentiment calculation, milestone tracking |
| `apps/api/src/routes/civic.ts` | MODIFY | BE | Full rewrite of civic routes removing all mock stubs and connecting to PostgreSQL |
| `apps/mobile/stores/civic.ts` | MODIFY | MOB | Replaces seed-only arrays with dynamic API client + MMKV/SQLite tiered caching |
| `apps/mobile/lib/api/endpoints/civic.ts` | CREATE | MOB | Canonical API client endpoints for civic issues, comments, upvotes, disputes |
| `apps/mobile/components/IssueCard.tsx` | MODIFY | MOB | Rich status badges, MLA response drawer, evidence viewer, upvote trigger |
| `apps/mobile/components/ReportIssueSheet.tsx` | MODIFY | MOB | Point-in-polygon geo-picker, photo picker with compression, offline queueing |
| `apps/mobile/components/DisputeModal.tsx` | CREATE | MOB | Community dispute filing modal with reason and proof upload |
| `tests/job030-issue-lifecycle.test.ts` | CREATE | QA | Verifies 5-state transitions, dispute reopen, and audit history |
| `tests/job031-geofence-evidence.test.ts` | CREATE | QA | Verifies PostGIS point-in-polygon containment and multi-media evidence |
| `tests/job032-upvotes-milestones.test.ts` | CREATE | QA | Verifies anti-sybil upvotes, milestone thresholds, and headline promotion |
| `tests/job033-civic-discourse.test.ts` | CREATE | QA | Verifies threaded comments, official badges, and fail-closed moderation |
| `tests/job034-community-groups.test.ts` | CREATE | QA | Verifies civic working groups, memberships, and locality scoping |
| `tests/job035-sentiment-data.test.ts` | CREATE | QA | Verifies multi-factor sentiment derivation and real database connectors |

---

## 6. Job-by-Job Technical Specifications

### 6.1 JOB 030: Civic Issue Lifecycle Engine & State Machine
- **Objective:** Establish an immutable, auditable state machine for civic issues.
- **Allowed Transitions:**
  - `OPEN -> ACKNOWLEDGED` (by Verified Official, MLA, or Admin)
  - `ACKNOWLEDGED -> IN_PROGRESS` (by Official with note)
  - `IN_PROGRESS -> RESOLVED` (requires `resolution_note` and `resolved_by`)
  - `RESOLVED -> CLOSED` (auto after 7 days if dispute_count = 0)
  - `RESOLVED -> REOPENED` (automatic when $\ge 5$ distinct community members dispute)
  - `REOPENED -> IN_PROGRESS` (when official resumes work)
- **Database Enforcement:**
  - Every transition writes a durable record to `public.issue_status_history (id, issue_id, from_status, to_status, changed_by, note, created_at)`.
  - Prohibit arbitrary status updates; unauthorized transitions return HTTP 400 `INVALID_STATUS_TRANSITION`.
- **Elimination of Mock Bypasses:** Remove `if (process.env.NODE_ENV !== 'production') return { success: true }`. All updates must execute real database transactions.

### 6.2 JOB 031: Geo-Fenced Issue Reporting & Evidence Pipeline
- **Objective:** Eliminate heuristic geo-location; bind issues to exact canonical constituencies using PostGIS point-in-polygon queries.
- **Specifications:**
  - Validate latitude/longitude coordinates against `public.constituencies` geometry boundary (`ST_Contains`). If coordinates fall outside the selected constituency, reject with HTTP 400 `COORDINATES_OUTSIDE_CONSTITUENCY`.
  - Multi-media evidence pipeline: allow up to 5 photos per issue report.
  - Corroborating evidence: "I saw this too" action stores records in `public.issue_evidence (id, issue_id, user_id, media_url, caption, created_at)` and increments `evidence_count`.

### 6.3 JOB 032: Anti-Sybil Community Upvoting, Follows & Milestone Triggers
- **Objective:** Provide tamper-proof community engagement with milestone notifications.
- **Specifications:**
  - Table `public.issue_upvotes (issue_id, user_id, created_at)` with `PRIMARY KEY (issue_id, user_id)`.
  - Transactional trigger updates `civic_issues.upvote_count = COUNT(*)`.
  - Milestone Alert Engine:
    - At 10 upvotes: emit event `CIVIC_MILESTONE_10` notifying reporter.
    - At 50 upvotes: emit event `CIVIC_MILESTONE_50` notifying constituency MLA account.
    - At 100 upvotes: mark issue as `trending_score > 0.8`.
    - At 500 upvotes: trigger automatic creation of public headline in `public.headlines`.

### 6.4 JOB 033: Constituency Civic Discourse & Threaded Comments
- **Objective:** Provide moderated, high-trust local community discourse.
- **Specifications:**
  - Table `public.issue_comments (id, issue_id, user_id, user_name, body, image_url, is_official, official_role, created_at)`.
  - Official badges: automatically flagged `is_official = true` when `auth.role IN ('official', 'politician', 'admin')`.
  - Content moderation: Every comment passes through `checkContentModeration()`. Flagged toxic/hate content is blocked fail-closed (HTTP 422 `CONTENT_MODERATION_FAILED`).
  - Dispute filing: `public.issue_disputes (issue_id, user_id, reason, created_at)`.

### 6.5 JOB 034: Local Discourse & Constituency Community Working Groups
- **Objective:** Allow citizens to organize around locality issues (Ward, Mandal, Assembly).
- **Specifications:**
  - Table `public.community_groups (id, name, slug, constituency_id, description, category, created_by, member_count, is_active, created_at)`.
  - Table `public.community_group_memberships (group_id, user_id, role, joined_at)`.
  - Tiered caching: Group feeds and membership cached locally via `UnifiedCacheManager` (`CIVIC_FEED` domain).

### 6.6 JOB 035: Civic Metrics, Sentiment Derivation & Real Data Connectors
- **Objective:** Replace all fake stubs in `apps/api/src/routes/civic.ts` with real database connectors and multi-factor sentiment analytics.
- **Specifications:**
  - Remove empty array stubs for `/budget`, `/attendance`, `/bills`, `/schemes`, `/projects`, `/rti`, `/hearings`.
  - Multi-factor sentiment derivation:
    $$\text{Score} = \frac{\text{Positive Posts} - \sum (\text{Severity Weight} \times \text{Open Issues})}{\text{Total Activity} + 1}$$
    where weights are: Critical = 4.0, High = 3.0, Medium = 2.0, Low = 1.0.

---

## 7. System Architecture & Component Interaction Diagrams

```
+-------------------------------------------------------------------------+
│                          POLIGRAM MOBILE CLIENT                            │
│  (ReportIssueSheet / IssueCard / DisputeModal / CommunityGroupsScreen)  │
+-------------------------------------------------------------------------+
                                     │
                 [HTTPS REST / JWT + Canonical API Client]
                                     ▼
+-------------------------------------------------------------------------+
│                         FASTIFY CIVIC GATEWAY                           │
│                      (apps/api/src/routes/civic.ts)                     │
+-------------------------------------------------------------------------+
          │                          │                         │
          ▼                          ▼                         ▼
+-------------------+      +-------------------+     +--------------------+
│ PostGIS Spatial   │      │ Content Moderation│     │ State Machine &    │
│ Point-in-Polygon  │      │ OpenAI Fail-Closed│     │ Milestone Engine   │
│ Boundary Guard    │      │ Policy Gate       │     │ (Status History)   │
+-------------------+      +-------------------+     +--------------------+
          │                          │                         │
          └──────────────────────────┼─────────────────────────┘
                                     │
                                     ▼
+-------------------------------------------------------------------------+
│                    CANONICAL POSTGRESQL PERSISTENCE                     │
│  (civic_issues, issue_upvotes, issue_comments, issue_disputes, groups) │
+-------------------------------------------------------------------------+
```

---

## 8. Database & Local Storage Schemas (DDL & Migrations)

### 8.1 Migration 075: Civic Platform Hardening (`075_civic_platform_hardening.sql`)
```sql
-- 1. Community Groups Table
CREATE TABLE IF NOT EXISTS public.community_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (char_length(name) >= 3 AND char_length(name) <= 100),
    slug TEXT NOT NULL UNIQUE,
    constituency_id TEXT NOT NULL REFERENCES public.constituencies(id) ON DELETE RESTRICT,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('sanitation', 'roads', 'water', 'electricity', 'education', 'environment', 'general')),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    member_count INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Community Group Memberships Table
CREATE TABLE IF NOT EXISTS public.community_group_memberships (
    group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (group_id, user_id)
);

-- 3. Issue Evidence Table (Corroborating Reports)
CREATE TABLE IF NOT EXISTS public.issue_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES public.civic_issues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    user_name TEXT NOT NULL,
    media_url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Enable RLS across all new tables
ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read community groups" ON public.community_groups FOR SELECT USING (true);
CREATE POLICY "Auth users create community groups" ON public.community_groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Public read community memberships" ON public.community_group_memberships FOR SELECT USING (true);
CREATE POLICY "Auth users manage own membership" ON public.community_group_memberships FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public read issue evidence" ON public.issue_evidence FOR SELECT USING (true);
CREATE POLICY "Auth users post evidence" ON public.issue_evidence FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## 9. API Contracts & Mobile Interfaces

```typescript
export type CivicIssueStatus = 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed' | 'reopened';
export type CivicIssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface CreateCivicIssueDTO {
  title: string;
  description: string;
  category: string;
  severity: CivicIssueSeverity;
  constituencyId: string;
  stateCode: string;
  latitude?: number;
  longitude?: number;
  mediaUrls?: string[];
}

export interface UpdateCivicIssueStatusDTO {
  status: CivicIssueStatus;
  note?: string;
}

export interface DisputeIssueDTO {
  reason: string;
}

export interface CivicCommentDTO {
  body: string;
  imageUrl?: string;
}
```

---

## 10. Performance Targets & Budget Enforcements

| Operation | Budget Ceiling | Target (Domain 3) | Verification Suite |
| :--- | :--- | :--- | :--- |
| **Issue Creation API** | $< 350\text{ ms}$ | $< 150\text{ ms}$ | `tests/job031-geofence-evidence.test.ts` |
| **Upvote Toggle** | $< 100\text{ ms}$ | $< 40\text{ ms}$ | `tests/job032-upvotes-milestones.test.ts` |
| **Constituency Feed Query** | $< 250\text{ ms}$ | $< 80\text{ ms}$ | `tests/job030-issue-lifecycle.test.ts` |
| **Sentiment Derivation** | $< 200\text{ ms}$ | $< 50\text{ ms}$ | `tests/job035-sentiment-data.test.ts` |

---

## 11. Security, Privacy & DPDP Act 2023 Compliance

1. **Zero Citizen PII Leakage:** Public feeds and comments never expose voter telephone numbers or email addresses; users are referenced by chosen `display_name` or anonymous handle.
2. **Media Sanitization:** Photo uploads must strip embedded GPS EXIF metadata before public persistence to protect citizen domestic privacy.
3. **Identity Spoofing Protection:** All mutating endpoints enforce `auth.userId === request.user.id`, rejecting identity tampering fail-closed (HTTP 403 `FORBIDDEN`).

---

## 12. Offline-First Resilience & Error Handling

1. **Tiered Caching:** Civic issues and community feeds are stored in SQLite and MMKV via `UnifiedCacheManager` (`CIVIC_FEED` domain, 15m TTL).
2. **Offline Mutation Queue:** Upvotes and offline issue reports are enqueued into `sync_mutation_queue` with exponential backoff retry.

---

## 13. i18n & 13-Language Parity Strategy

All civic categories (`roads`, `water`, `electricity`, `sanitation`, `healthcare`, `education`, `environment`, `public_safety`, `corruption`, `transport`, `housing`), severity badges, status labels, and dispute dialogues must be verified with 100% string parity across all 13 supported languages.

---

## 14. Automated Verification & Testing Strategy

1. `tests/job030-issue-lifecycle.test.ts` — Tests 5-state transitions, dispute reopen, and audit history.
2. `tests/job031-geofence-evidence.test.ts` — Tests PostGIS point-in-polygon containment and multi-media evidence.
3. `tests/job032-upvotes-milestones.test.ts` — Tests anti-sybil upvotes, milestone thresholds, and headline promotion.
4. `tests/job033-civic-discourse.test.ts` — Tests threaded comments, official badges, and fail-closed moderation.
5. `tests/job034-community-groups.test.ts` — Tests civic working groups, memberships, and locality scoping.
6. `tests/job035-sentiment-data.test.ts` — Tests multi-factor sentiment derivation and real database connectors.

---

## 15. Negative-Path Testing Specification

- Probe 1: Submitting an issue with invalid status transition (e.g. `closed -> open` directly) $\rightarrow$ **HTTP 400 Rejected**.
- Probe 2: Submitting an issue with coordinates outside the specified constituency $\rightarrow$ **HTTP 400 Rejected**.
- Probe 3: Comment containing prohibited abusive/toxic text $\rightarrow$ **HTTP 422 Blocked Fail-Closed**.
- Probe 4: Attempting to upvote an issue as another citizen $\rightarrow$ **HTTP 403 Forbidden**.
- Probe 5: Attempting to update issue status as an unauthorized citizen $\rightarrow$ **HTTP 403 Forbidden**.

---

## 16. Evidence Generation Plan

1. Generate `reports/domain3_civic_platform_report.json` with execution metrics and test results.
2. Generate `reports/domain3_civic_platform_report.md` documenting evidence and verification.
3. Update `DECISION_LOG.md` (DEC-174 for plan, DEC-175 for completion).
4. Update `ACCEPTANCE_REGISTER.md` with rows for JOB 030 through JOB 035.

---

## 17. Reconciliation Plan

- Reconcile `EXECUTION_STATE.md` to reflect Domain 3 progression.
- Reconcile `RELEASE_REGISTER.md` if any binary or asset impact occurs.
- Reconcile `DEFECT_REGISTER.md` for closed civic defects.

---

## 18. Independent Verification Specification

- Verification will run in an isolated test runner using real database fixtures.
- Strict assertions on response codes, database persistence, and zero mock returns.

---

## 19. Risks, Failure Modes & Mitigations

- **Risk:** High volume of duplicate issues.  
  *Mitigation:* Title and category similarity matching before insertion.
- **Risk:** Spammed upvotes / Sybil manipulation.  
  *Mitigation:* Database unique primary key constraint on `(issue_id, user_id)` and rate limiting.
- **Risk:** Toxic comments in heated civic disputes.  
  *Mitigation:* Fail-closed moderation screening before comment persistence.

---

## 20. Rollback & Recovery Strategy

- Migration 075 is purely additive; rollback script `supabase/rollback_075_civic_platform.sql` drops created tables cleanly.
- API routes maintain clean backward compatibility with existing mobile clients.

---

## 21. Operational Declarations

```text
PLAN STATUS: SUBMITTED_FOR_REVIEW
PROPOSED DOMAIN: DOMAIN 3 (CORE CIVIC & ENGAGEMENT PLATFORM: JOB 030 - JOB 035)
ESTIMATED TIME TO EXECUTE: SEQUENTIAL MULTI-STAGE
IMPLEMENTATION MAY BEGIN: NO (Awaiting User/CTO Ratification)
```

---

## 22. Plan Sign-Off & Review Request

To proceed with implementation, the following key design choices are submitted for your decision:

### Design Decision 1: Auto-Promotion Threshold for Civic Headlines
- **Option A (Recommended):** Issues reaching **500 verified community upvotes** auto-promote to the public news headline feed as a citizen-demanded issue, notifying local journalists.
- **Option B:** Require human moderator editorial approval before promoting an issue reaching 500 upvotes to public headlines.

### Design Decision 2: Geographic Dispute Auto-Reopening Threshold
- **Option 1 (Recommended):** Set the threshold to **5 distinct citizen disputes** within 7 days of resolution to automatically reopen a resolved issue.
- **Option 2:** Set the threshold to **10 distinct citizen disputes**.

### Design Decision 3: Plan Ratification & Implementation Authorization
- Grant `PLAN_STATUS: APPROVED` and `IMPLEMENTATION_AUTHORIZATION: YES` for sequential execution of Domain 3 (JOB 030 through JOB 035).
