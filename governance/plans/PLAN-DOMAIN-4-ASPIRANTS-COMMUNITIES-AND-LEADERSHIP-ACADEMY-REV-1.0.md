# MASTER PRE-IMPLEMENTATION PLAN: DOMAIN 4
## ASPIRANTS, COMMUNITIES & LEADERSHIP ACADEMY (JOB 046 – JOB 050)
**Document Identifier:** `PLAN-DOMAIN-4-ASPIRANTS-COMMUNITIES-AND-LEADERSHIP-ACADEMY-REV-1.0.md`  
**Revision:** Rev 1.0 (Master Execution Track)  
**Date:** 2026-10-30  
**Status:** `PLAN_SUBMITTED_FOR_REVIEW` (`IMPLEMENTATION_AUTHORIZATION = NO`)  
**Governing Authority:** Master Product Blueprint, AI Agent Master Execution Job Book, Amendment v1.2, Amendment v1.4, Amendment v1.5-A Section 26, Amendment v1.6 & Rule IV-001 Non-Self-Acceptance  

---

### Section 1: Executive Summary & Governing Authority
This authoritative Pre-Implementation Plan governs the engineering execution of **Domain 4: Aspirants, Communities & Leadership Academy**, encompassing **JOB 046, JOB 047, JOB 048, JOB 049, and JOB 050** of the PANIN / Kshetra Master Blueprint and AI Agent Master Execution Job Book.

Domain 4 transforms PANIN from a civic reporting tool into **India's political talent incubation and grassroots political leadership engine**. It creates the legal, technical, and community mechanisms for emerging political leaders (aspirants) to build a verified public identity, publish their civic vision and manifestos, engage local constituents, broadcast campaign events, organize local geographic action groups, and acquire mastery over Indian electoral laws, booth strategy, and public policy through the Leadership Academy.

Under **Rule IV-001** and **Amendment v1.5-A Section 26**, no code changes, database mutations, or deployment operations may commence until this plan is ratified by the user and `IMPLEMENTATION_AUTHORIZATION: YES` is formally recorded.

---

### Section 2: Architectural Scope & Work Breakdown Structure (JOB 046–050)
Domain 4 is divided into five strictly bounded jobs:

1. **JOB 046: Aspirant Registration & KYC Verification Flow:**
   - Multi-tier identity verification: Tier 1 (Self-declared profile with phone/email verification and target constituency binding; `pending_verification`) and Tier 2 (Statutory KYC verification with government ID/affidavit hash audited by compliance; `verified`).
   - Anti-impersonation guards: prevention of unauthorized political claims on existing sitting MLAs/MPs.
   - Comprehensive aspirant profile metadata: target constituency (AC/PC), target election year, party affiliation / independent status, vision manifesto, criminal antecedents statutory declaration.

2. **JOB 047: Aspirant Public Profile & Aggregated Timeline:**
   - Canonical public profile endpoint (`GET /api/v1/aspirant/:id` and `GET /api/v1/aspirant/handle/:handle`).
   - Unified chronological timeline aggregating:
     - Biography, educational background, professional history.
     - Target geography and delimitation impact for the aspirant's seat.
     - Civic track record (issues reported, evidence submitted, issues resolved in target AC).
     - Verified Leadership Academy badges and certifications earned.
     - Scheduled and past community events and townhalls.
     - Community endorsements and verified citizen testimonials.

3. **JOB 048: Aspirant Page, Followers & Event Dispatching Engine:**
   - Dedicated political entity Page creation (`POST /api/v1/pages`) for aspirants, politicians, and local parties.
   - Idempotent follower lifecycle (`POST /api/v1/pages/:id/follow`, `DELETE /api/v1/pages/:id/follow`).
   - Page event management: creation, scheduling, venue geo-tagging, RSVP pipeline (`POST /api/v1/pages/:id/events`, `GET /api/v1/pages/:id/events`, `POST /api/v1/events/:id/rsvp`).
   - Event notification dispatching engine: fan-out of upcoming townhalls/rallies to followers with anti-spam rate limiting.

4. **JOB 049: Community Groups — Geographic Membership & Role Permissions:**
   - Full hierarchy-aware community groups engine supporting associations across Assembly Constituency, Mandal/Tehsil, and Municipal Ward levels.
   - Role-Based Access Control (RBAC): `admin` (group creator/designated official), `moderator` (appointed community steward), `member` (verified local resident).
   - Membership approval workflows: public open groups vs approval-required moderated groups.
   - Geographic containment enforcement: citizens can discover and join groups bounded by their actual residential geography.

5. **JOB 050: Leadership Academy — Course/Quiz Persistence & Certification:**
   - Standardized course and module curriculum across 8 political science tracks (Electoral Process, Campaign Strategy, Legal Framework, Public Speaking, Community Organizing, Digital Campaigning, Policy Making, Ethics & Governance).
   - Rich quiz validation engine with question scoring, correct rationale explanations, and minimum passing threshold (80%).
   - Durable multi-tier persistence: Server PostgreSQL (`module_progress`), mobile SQLite/MMKV cache (`UnifiedCacheManager`), and offline-sync queue (`enqueue`).
   - Automatic awarding of digital civic badges and Civic Score points upon verified completion.

---

### Section 3: Existing Codebase Baseline & Defect Analysis
A comprehensive audit of the existing codebase identified the following foundational state and gaps:

1. **Database Baseline:**
   - Migration `010_aspiring_leaders.sql` created initial tables (`aspirant_profiles`, `civic_badges`, `leadership_modules`, `module_progress`, `community_challenges`, `challenge_participation`, `community_endorsements`).
   - Migration `027_extend_role_and_verification.sql` created the `pages` table with basic Pro monetization columns, but omitted follower and event tables.
   - Migration `075_civic_platform_hardening.sql` created `community_groups` and `community_group_memberships`.
2. **Defect & Gap Analysis:**
   - **DEF-046A (Unverified KYC):** `aspirant.ts` has a simple upsert `/api/v1/aspirant/register` that takes arbitrary unverified strings without KYC documentation, verification states, or statutory declarations.
   - **DEF-047A (Missing Public Timeline API):** No endpoint exists to fetch an aggregated public aspirant profile or timeline. The mobile client falls back to hardcoded `SEED_PUBLIC_ASPIRANTS` in `stores/aspirant.ts`.
   - **DEF-048A (Incomplete Pages API):** `apps/api/src/routes/pages.ts` only implements Pro checkout and entitlement checks! There are zero endpoints to create a page, follow a page, or dispatch page events.
   - **DEF-049A (Unverified Group Permissions):** Group membership lacks granular role enforcement (`moderator` vs `admin`) and geographic boundary checks.
   - **DEF-050A (Client-Only Academy Completion):** In `apps/mobile/stores/aspirant.ts`, `completeModule` only updates the local in-memory Zustand store and never calls the backend API or enqueues offline persistence.

---

### Section 4: Data Models & Database Migrations Specification
A new migration (`supabase/migrations/076_aspirants_and_academy_hardening.sql`) will be created to harden Domain 4:

```sql
-- 1. Aspirant KYC Verification Table
CREATE TABLE IF NOT EXISTS public.aspirant_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aspirant_id UUID NOT NULL REFERENCES public.aspirant_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('voter_id', 'aadhaar_masked', 'pan', 'election_affidavit', 'party_letter')),
    document_hash TEXT NOT NULL,
    document_url TEXT,
    verification_tier TEXT NOT NULL DEFAULT 'tier1' CHECK (verification_tier IN ('tier1', 'tier2')),
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    statutory_declaration_accepted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(aspirant_id, document_type)
);

-- 2. Page Followers Table
CREATE TABLE IF NOT EXISTS public.page_followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(page_id, user_id)
);

-- 3. Page Events Table
CREATE TABLE IF NOT EXISTS public.page_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 150),
    description TEXT CHECK (char_length(description) <= 2000),
    event_type TEXT NOT NULL CHECK (event_type IN ('townhall', 'rally', 'volunteer_meet', 'webinar', 'press_conference', 'door_to_door')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    venue_name TEXT,
    venue_address TEXT,
    constituency_id TEXT REFERENCES public.constituencies(id),
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    is_virtual BOOLEAN NOT NULL DEFAULT false,
    meeting_link TEXT,
    rsvp_count INTEGER NOT NULL DEFAULT 0,
    dispatched_to_followers BOOLEAN NOT NULL DEFAULT false,
    dispatched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Page Event RSVPs Table
CREATE TABLE IF NOT EXISTS public.page_event_rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.page_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'interested', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(event_id, user_id)
);

-- 5. Leadership Quiz Attempts Table
CREATE TABLE IF NOT EXISTS public.module_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.leadership_modules(id) ON DELETE CASCADE,
    score_percentage INTEGER NOT NULL CHECK (score_percentage BETWEEN 0 AND 100),
    passed BOOLEAN NOT NULL DEFAULT false,
    answers_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### Section 5: Shared Contracts & Type System Architecture
A dedicated shared contract will be authored at `packages/shared/src/contracts/aspirant.ts` and exported via `packages/shared/src/contracts/index.ts`:

- `AspirantRegistrationDTO`: Full submission schema including personal particulars, target constituency, party affiliation, manifesto, and statutory declaration.
- `AspirantKYCSubmissionDTO`: Encrypted document hashes, document type, and declaration confirmation.
- `AspirantPublicProfileDTO`: Aggregated entity including verification status, civic score breakdown, badges, upcoming events, and endorsements.
- `PageCreateDTO`, `PageFollowDTO`, `PageEventDTO`, `PageEventRsvpDTO`.
- `GroupRoleEnum`, `GroupPermissionDTO`, `GroupMembershipUpdateDTO`.
- `ModuleQuizSubmissionDTO`, `ModuleQuizResultDTO`, `ModuleProgressDTO`.

---

### Section 6: Backend Service & Route Implementations
We will author a dedicated backend service `apps/api/src/services/aspirantService.ts` and expand `apps/api/src/routes/aspirant.ts` and `apps/api/src/routes/pages.ts`:

1. **Aspirant Registration & KYC:**
   - `POST /api/v1/aspirant/register`: Validates constituency existence, ensures unique user profile registration, creates initial Tier-1 pending profile.
   - `POST /api/v1/aspirant/kyc/submit`: Validates document proof, updates status to `pending_verification`, logs audit entry.
   - `GET /api/v1/aspirant/kyc/status`: Retrieves current KYC verification tier and approval state.
2. **Public Profile & Timeline:**
   - `GET /api/v1/aspirant/:id`: Aggregates profile, civic contributions, earned badges, upcoming page events, and endorsements.
   - `GET /api/v1/aspirants`: Scoped directory search by state code and constituency ID.
3. **Pages & Event Engine:**
   - `POST /api/v1/pages`: Creates aspirant or politician page with handle conflict detection.
   - `GET /api/v1/pages/:id`: Fetches page details and follower count.
   - `POST /api/v1/pages/:id/follow` & `DELETE /api/v1/pages/:id/follow`: Manages follower state machine with transactional counter updates.
   - `POST /api/v1/pages/:id/events`: Schedules page events and stages notification outbox dispatch.
   - `GET /api/v1/pages/:id/events`: Lists page events with RSVP counters.
   - `POST /api/v1/pages/events/:eventId/rsvp`: Records user RSVP with anti-Sybil protection.
4. **Leadership Academy:**
   - `GET /api/v1/aspirant/modules`: Lists all modules with user's completion status.
   - `GET /api/v1/aspirant/modules/:id`: Retrieves module content, lessons, and quiz questions.
   - `POST /api/v1/aspirant/modules/:id/quiz`: Evaluates submitted quiz answers server-side, records attempt, calculates pass/fail (>= 80%), and awards badges/civic points on passing.

---

### Section 7: Mobile Client Integration & Offline Persistence
1. **API Client Endpoints:**
   - Update `apps/mobile/lib/api/endpoints/aspirant.ts` to call all canonical backend endpoints.
2. **Zustand Store Hardening:**
   - Update `apps/mobile/stores/aspirant.ts` so `completeModule` and `submitQuiz` persist synchronously to `UnifiedCacheManager` (Tier 1 MMKV / Tier 2 SQLite) and call the backend API, with automatic `enqueue` fallback for offline connectivity.
3. **UI Screen Reconciliation:**
   - Update `apps/mobile/app/pages/index.tsx` to display verified aspirants, link to public aspirant profiles, and support page follow/unfollow interactions.
   - Ensure `apps/mobile/app/leadership-academy.tsx` accurately reflects server-synchronized progress and earned badges.

---

### Section 8: Zero-Hallucination Ground-Truth Verification Strategy
In strict adherence to Part 0.3 of the Master Execution Document:
- No verification claim will be made without an automated, reproducible test executing against the code.
- We will construct five dedicated test batteries:
  1. `tests/job046-aspirant-registration-kyc.test.ts`
  2. `tests/job047-aspirant-public-profile.test.ts`
  3. `tests/job048-aspirant-page-events.test.ts`
  4. `tests/job049-community-groups-roles.test.ts`
  5. `tests/job050-leadership-academy-persistence.test.ts`

---

### Section 9: Backward Compatibility & Non-Breaking API Guarantees
- Existing Class B Strangler endpoints (`POST /api/v1/aspirant/modules/:id/complete`, `POST /api/v1/aspirant/challenges/:id/join`, `POST /api/v1/aspirant/:id/endorse`) will maintain 100% parameter and response compatibility.
- Existing Pages Pro checkout and entitlement routes will remain completely untouched and backward-compatible.

---

### Section 10: Fail-Closed Security & Access Control Model (RBAC / RLS)
- RLS enabled and forced on all new tables (`aspirant_verifications`, `page_followers`, `page_events`, `page_event_rsvps`, `module_quiz_attempts`).
- KYC documents are strictly private: only the submitting user and authorized compliance administrators (`role = 'admin'`) have read permissions.
- Only verified page owners and administrators may create and dispatch events.

---

### Section 11: Privacy, DPDP Act 2023 & Zero Citizen PII Exposure
- Citizen identity details (Aadhaar, Voter ID) are never stored in plaintext; only salted cryptographic SHA-256 hashes and masked identifiers (`XXXX-XXXX-1234`) are retained.
- Public profile APIs strip internal auth identifiers, phone numbers, and email addresses.
- Followers of pages and group members are displayed with privacy-preserving public handles and display names only.

---

### Section 12: Performance Budgets & Mobile Bundle Invariants
- Zero new native dependencies added to `apps/mobile/package.json`.
- Bundle size remains firmly within the certified `<35 MB` Universal APK ceiling established in Domain 2 (JOB 024).
- Offline-first cache architecture: Academy modules and user progress cached locally in MMKV/SQLite with instantaneous (<50ms) offline render.

---

### Section 13: Operational Risk Assessment & Mitigation Strategies
- **Risk:** Spam or malicious event broadcasts by unverified aspirants.
  - *Mitigation:* Event creation is restricted to verified or KYC-pending accounts with phone verification; maximum 3 notifications per week per page.
- **Risk:** Cheating or automated script completion of Leadership Academy quizzes.
  - *Mitigation:* Server-side randomized quiz evaluation with attempt throttling (max 3 attempts per 24 hours upon failure).

---

### Section 14: Step-by-Step Implementation Sequence
1. Author database migration `supabase/migrations/076_aspirants_and_academy_hardening.sql`.
2. Author typed shared contracts in `packages/shared/src/contracts/aspirant.ts` and compile `@kshetra/shared`.
3. Author `apps/api/src/services/aspirantService.ts` implementing KYC, profile aggregation, page event dispatching, and quiz evaluation.
4. Expand `apps/api/src/routes/aspirant.ts` and `apps/api/src/routes/pages.ts` with typed Fastify schemas.
5. Compile and verify `@kshetra/api`.
6. Author and execute all 5 automated test suites (`job046` through `job050`).
7. Update mobile stores and endpoints (`stores/aspirant.ts`, `api/endpoints/aspirant.ts`) and run mobile typecheck.
8. Generate evidence dossiers (`reports/domain4_aspirants_academy_report.json` and `.md`).
9. Update governance registers (`DECISION_LOG.md`, `ACCEPTANCE_REGISTER.md`, `EXECUTION_STATE.md`).
10. Commit and push to `origin/master`.

---

### Section 15: Automated Test Matrix & Acceptance Criteria
- **JOB 046 Acceptance:** Test validates complete aspirant registration lifecycle, duplicate prevention, and KYC state machine (`pending` -> `verified` / `rejected`).
- **JOB 047 Acceptance:** Test validates public profile aggregation across biography, target constituency, civic history, badges, and upcoming events.
- **JOB 048 Acceptance:** Test validates page creation, follow/unfollow lifecycle, follower counter increments, and event creation with RSVP tracking.
- **JOB 049 Acceptance:** Test validates community group geographic scoping and role-based permissions (`admin` vs `moderator` vs `member`).
- **JOB 050 Acceptance:** Test validates quiz submission with server scoring, pass/fail thresholds, badge awarding, and persistent progress across sessions.

---

### Section 16: Defect Remediation & Regression Safeguards
- All existing 1,473 lines of unit tests in `manage-pages-routes-unit.test.ts` must pass without regressions.
- All existing civic route tests (69/69) and mutation tests (22/22) must pass without regressions.
- Monorepo compilation must be 100% clean (`tsc --noEmit`).

---

### Section 17: Multi-State & Multilingual Scalability
- Target constituencies and states support all 36 States & UTs and 4,123 Assembly Constituencies.
- Academy module titles, descriptions, and quiz rationales support localization across all 13 official languages via i18n translation keys.

---

### Section 18: Deployment & Rollback Strategy
- Non-destructive database migrations: schema additive only (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).
- Fastify route registration safely isolated under `/api/v1/aspirant` and `/api/v1/pages`.

---

### Section 19: Observability, Metrics & Telemetry
- Structured logging on KYC status transitions, event creations, and quiz attempts with anonymous telemetry.
- Latency monitoring: target P95 < 50ms for cached academy modules and public profile retrieval.

---

### Section 20: Regulatory & Statutory Compliance (ECI Model Code / IT Rules)
- Compliance with Election Commission of India (ECI) guidelines regarding candidate disclosures and criminal antecedents reporting.
- Compliance with Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.

---

### Section 21: Formal Governance Decisions & Architectural Options for User Ratification
To align with founder intent and Master Blueprint specifications, the following architectural choices are submitted for user ratification:

1. **Decision 1 (JOB 046 KYC Flow):**
   - **Option A (Recommended):** Two-tier KYC verification model: Tier 1 (Self-declared profile with mobile OTP/Aadhaar last-4 hash - status `pending_verification`), Tier 2 (Documented verification with election affidavit / identity proof verification by admin/compliance officer - status `verified`).
   - **Option B:** Single-tier strict KYC requiring upfront government document verification before any aspirant profile is publicly listed.
2. **Decision 2 (JOB 048 Page Events & Follower Dispatch):**
   - **Option 1 (Recommended):** In-app notification event outbox + public RSS/JSON feed for page followers with rate-limiting (max 3 notification broadcasts per week per aspirant to prevent spam).
   - **Option 2:** Real-time WebSocket/SSE fan-out to active followers with persistent in-app notifications.
3. **Decision 3 (JOB 050 Academy Scoring & Certification):**
   - **Option A (Recommended):** 80% passing threshold on module quizzes with immediate feedback and explanation, unlocking verifiable digital badges on the aspirant public profile and contributing directly to the Civic Score.
   - **Option B:** Completion-based certification without minimum score requirement.

---

### Section 22: Execution Gate & Ratification Checkpoint
In accordance with Rule IV-001 Non-Self-Acceptance and Amendment v1.5-A Section 26:
- **Plan Status:** `SUBMITTED_FOR_REVIEW`
- **Implementation Authorization:** `NO`
- **Action Required:** User ratification of Decisions 1, 2, and 3, and formal granting of `PLAN_STATUS: APPROVED` and `IMPLEMENTATION_AUTHORIZATION: YES`.
