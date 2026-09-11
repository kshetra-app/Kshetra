# JOB W006: API ARCHITECTURE AUDIT & SEPARATION REPORT
**Execution Authority:** Master Product Blueprint, AI Agent Master Execution Job Book, Amendment v1.2 (`AMENDMENT_v1.2.md`), Amendment v1.4 (`AMENDMENT_v1.4.md`), `AGENT_EXECUTION_PROTOCOL.md`, `DEC-002`, `DEC-028`  
**Status:** IMPLEMENTED & AUDITED — READY FOR INDEPENDENT VERIFICATION  
**Date:** 2026-09-11  

---

## 1. Executive Summary & Objective

In the baseline reconciliation (`reports/w000_data_paths.json` and `DEC-002`), an architectural finding was identified: the application exhibits a **dual-path data architecture** with both direct Supabase client callers and Railway Fastify API callers.

Direct client writes to PostgreSQL bypass server-side business logic, centralized validation, rate limiting, and structured audit logs. This architecture poses a critical risk to data integrity, compliance, and enterprise SaaS/API commercialization.

**Job W006 establishes the comprehensive empirical audit, boundary definition, and Strangler Migration Matrix** to govern the transition from client-side direct writes to canonical Fastify API endpoints while preserving RLS-governed PostGIS and high-performance read pathways.

---

## 2. Evidence Coordinates & Lineage

| Coordinate | Value | Description |
| :--- | :--- | :--- |
| **CANONICAL_BRANCH** | `master` | Primary production branch |
| **VERIFIED_REMOTE_HEAD** | `838e851` | Remote HEAD at audit execution |
| **AUDITED_CODE_COMMIT** | `838e851` | Commit containing inspected implementation |
| **EVIDENCE_COMMIT** | `pending` | Commit containing generated W006 audit reports |
| **ACCEPTANCE_COMMIT** | `pending` | Awaiting independent verification & acceptance |

---

## 3. Data Path Inventory & Caller Classification

### 3.1 Mobile Caller Breakdown (316 files scanned)

1. **Baseline Direct Supabase Callers (12 files)**:
   - `apps/mobile/app/user/[id].tsx`: Direct single user profile lookup (`supabase.from('user_profiles')`).
   - `apps/mobile/lib/aiService.ts`: Context retrieval for legislators and constituencies (`supabase.from('legislator_profiles')`, `constituencies`, `states`).
   - `apps/mobile/lib/favoritesSync.ts`: Cloud favorites backup (`supabase.from('favorites')`).
   - `apps/mobile/lib/realtimeService.ts`: Realtime subscription channels (`supabase.channel(...)`).
   - `apps/mobile/lib/representativeEdits.ts`: Crowdsourced representative edit submissions (`supabase.from('representative_edits')`).
   - `apps/mobile/lib/supabase.ts`: Supabase client initialization & SecureStore auth storage adapter.
   - `apps/mobile/lib/supabaseBootstrap.ts`: Application boot orchestrator (`supabase.from('user_profiles')`).
   - `apps/mobile/lib/supabaseDataService.ts`: Central hub containing 85 data access and mutation functions across 45 database tables.
   - `apps/mobile/lib/useSupabaseQuery.ts`: Generic React hook for stale-while-revalidate Supabase querying.
   - `apps/mobile/stores/auth.ts`: Supabase Auth session management (`supabase.auth.*`).
   - `apps/mobile/stores/liveExchange.ts`: Live Media Exchange (LMX) Zustand store with Supabase configuration checks.
   - `apps/mobile/stores/notifications.ts`: Notification log polling and user notification channels (`supabase.from('notification_log')`, `supabase.channel(...)`).

2. **Direct Supabase Table `.from()` Callers (7 files)**:
   - `app/user/[id].tsx` (1 table: `user_profiles`)
   - `lib/aiService.ts` (3 tables: `legislator_profiles`, `constituencies`, `states`)
   - `lib/favoritesSync.ts` (1 table: `favorites`)
   - `lib/representativeEdits.ts` (1 table: `representative_edits`)
   - `lib/supabaseBootstrap.ts` (1 table: `user_profiles`)
   - `lib/supabaseDataService.ts` (45 unique tables)
   - `stores/notifications.ts` (1 table: `notification_log`)

3. **Supabase Realtime Callers (2 files)**:
   - `lib/realtimeService.ts` (5 subscription channels)
   - `stores/notifications.ts` (1 user-specific notification channel)

4. **Supabase Auth Callers (1 file)**:
   - `stores/auth.ts` (`getSession`, `onAuthStateChange`, `signInWithPassword`, `signUp`, `signOut`)

5. **Railway Fastify API Callers (14 files)**:
   - `app/moderation/index.tsx` (`/api/v1/moderation/queue`, `/api/v1/moderation/action`)
   - `lib/candidatePhotos.ts` (Curated Wikipedia and photo asset streaming)
   - `lib/constants.ts` (Canonical `API_BASE_URL` & `REMOTE_API_URL` definition)
   - `lib/enrichedGeoCache.ts` (`/geo/geo-manifest.json` asset streaming)
   - `lib/environment.ts` (`DEFAULT_API_BASE_URL` from `@kshetra/shared`)
   - `lib/featureFlags.ts` (`/config/flags` remote configuration sync)
   - `lib/pageProEntitlement.ts` (`/api/v1/pages/:pageId/entitlement`)
   - `lib/pageService.ts` (`/api/v1/pages/:pageId/entitlement` with tracing headers)
   - `lib/remoteGeoLoader.ts` (`/geo/:file` on-demand boundary streaming)
   - `lib/supabaseDataService.ts` (Hybrid calls: content moderation check & direct messaging endpoints)
   - `lib/usePushNotifications.ts` (`/api/v1/notifications/register-token`)
   - `stores/campaign.ts` (`/api/v1/campaign/*` OBD, wallet, pricing, booths)
   - `stores/dmStore.ts` (`/api/v1/dm/*` conversations, messages, unread count)
   - `stores/news.ts` (`/api/v1/news/feed` multi-lingual aggregation)

---

## 4. Architectural Classification of Data Service Methods

All **85 exported functions** in `apps/mobile/lib/supabaseDataService.ts` were audited and classified into three primary architectural classes:

| Architectural Class | Method Count | Description & Strategy |
| :--- | :---: | :--- |
| **Class A: Read (RLS-Governed)** | **22** | Public or user-isolated queries (`SELECT`) with Postgres indexes and RLS. Safe to remain direct or be cached via CDN/Fastify read gateways in W008. |
| **Class B: Client Write (Strangler Target)** | **57** | Direct client mutations (`INSERT`, `UPDATE`, `DELETE`, RPC) bypassing Fastify. **Must be strangulated into Fastify endpoints in W007–W011.** |
| **Class C: Already Fastify Routed** | **6** | Already executing HTTP requests against Fastify `/api/v1/...` (`checkContentModeration`, `sendDirectMessageToConversation`, `acceptDMRequest`, `declineDMRequest`, `blockAndReportDMUser`, `fetchDMUnreadCount`). |

---

## 5. Strangler Migration Matrix & Target Endpoint Mapping

To eliminate client-side bypass without disrupting mobile application stability, the 57 Class B methods are scheduled across 4 phased strangler waves:

```mermaid
graph TD
    Client[Mobile / Web Client] --> Gateway[Fastify API Gateway (Railway)]
    Client -.->|Class A: Read Only| Supabase[(Supabase PostgreSQL + PostGIS)]
    
    Gateway --> Auth[JWT & Auth Verification]
    Gateway --> Val[Schema & Content Validation]
    Gateway --> Rate[Tiered Rate Limiting]
    Gateway --> Audit[Structured Audit Logging]
    Gateway --> Svc[Domain Services]
    
    Svc --> ServiceRole[(Supabase via Service-Role)]
    
    subgraph "Strangler Migration Waves"
        W1[Phase 1: High-Risk Civic & Moderation]
        W2[Phase 2: Social Feed, Reactions & Polls]
        W3[Phase 3: Creator KYC, LMX & Devices]
        W4[Phase 4: Shorts & Leadership Academy]
    end
```

### Phase 1: High-Risk Civic & Moderation Mutations (P0 / Immediate: W007–W008)
- **Target Methods**: `reportIssue`, `addIssueComment`, `disputeIssueResolution`, `tagMLAOnIssue`, `submitContentReport`
- **Target Fastify Endpoints**:
  - `POST /api/v1/civic/issues`
  - `POST /api/v1/civic/issues/:id/comments`
  - `POST /api/v1/civic/issues/:id/dispute`
  - `POST /api/v1/moderation/report`
- **Business Rationale**: Public-facing civic reports, allegations, and comments require mandatory pre-ingestion moderation, abuse scoring, and strict rate limiting to prevent platform weaponization.

### Phase 2: Social Feed, Reactions & Poll Voting (P1: W008–W009)
- **Target Methods**: `composePost`, `editPost`, `deletePost`, `votePoll`, `addPostComment`, `deletePostComment`, `reactToPost`, `reactToComment`
- **Target Fastify Endpoints**:
  - `POST /api/v1/feed/posts`
  - `PUT /api/v1/feed/posts/:id`
  - `DELETE /api/v1/feed/posts/:id`
  - `POST /api/v1/feed/polls/:id/vote`
  - `POST /api/v1/feed/posts/:id/comments`
  - `POST /api/v1/feed/reactions`
- **Business Rationale**: Prevents bot-driven vote manipulation on political polls, hashtag injection attacks, and unauthenticated comment spam.

### Phase 3: Creator KYC, LMX & Devices (P1: W009–W010)
- **Target Methods**: `submitKYC`, `insertActionFingerprint`, `upsertContributorDevice`, `createLiveEvent`, `updateLiveEvent`, `endLiveEvent`, `dispatchDepartmentAlert`, `acknowledgeDepartmentAlert`
- **Target Fastify Endpoints**:
  - `POST /api/v1/contributor/kyc`
  - `POST /api/v1/devices/fingerprint`
  - `POST /api/v1/lmx/live`
  - `POST /api/v1/lmx/alerts`
- **Business Rationale**: Highly sensitive user identity data (KYC documents, biometric selfies, hardware UUIDs) and emergency broadcast alerts must be cryptographically verified and handled under strict server-side DPDP compliance rules.

### Phase 4: Political Shorts & Leadership Academy (P2: W010–W011)
- **Target Methods**: `uploadShort`, `approveShort`, `flagShort`, `addShortComment`, `registerAspirant`, `startModule`, `completeModule`, `joinChallenge`, `endorseAspirant`
- **Target Fastify Endpoints**:
  - `POST /api/v1/shorts/upload`
  - `POST /api/v1/shorts/:id/comments`
  - `POST /api/v1/academy/register`
  - `POST /api/v1/academy/modules/:id/complete`
- **Business Rationale**: Video content certification, educational scoring, and political endorsements.

---

## 6. Fastify Route Inventory & Contract Coverage

- **Total Registered Fastify Routes**: 114 unique route registrations.
- **Total Route Modules**: 23 modules (`ai.ts`, `broadcast.ts`, `campaign.ts`, `civic.ts`, `config.ts`, `constituencies.ts`, `debug.ts`, `delimitation.ts`, `dm.ts`, `geo.ts`, `health.ts`, `journalist.ts`, `lmx.ts`, `manage.ts`, `metrics.ts`, `moderation.ts`, `news.ts`, `notifications.ts`, `pages.ts`, `policy.ts`, `politicalAds.ts`, `politician.ts`, `states.ts`).
- **Endpoint Gap Analysis**:
  - Routes in `civic.ts` currently exist as structural placeholders (`/api/v1/civic/budget`, `/api/v1/civic/attendance`, `/api/v1/civic/bills`, `/api/v1/civic/rti`). The Phase 1 endpoints (`POST /api/v1/civic/issues`, comments, dispute) will be formally added in W008.
  - Moderation routes (`/api/v1/moderation/check-content`, `/api/v1/moderation/queue`, `/api/v1/moderation/action`) are already live and fully utilized.
  - Direct Messaging (`/api/v1/dm/*`) and Political Ads (`/api/v1/political-ads/*`) are already fully migrated and canonicalized in Fastify.

---

## 7. Verification Results

| Test / Gate | Command | Result |
| :--- | :--- | :---: |
| **API Architecture Audit Script** | `node scripts/audit-api-architecture.mjs` | ✅ PASS |
| **W006 Regression Test** | `node tests/api-architecture-audit.test.mjs` | ✅ 5/5 PASS |
| **Commit Freshness & Lineage** | `node tests/commit-freshness.test.mjs` | ✅ 4/4 PASS |
| **Repo Evidence Integrity** | `node scripts/check-repo-evidence-integrity.mjs` | ✅ 19/19 PASS |
| **Governance Consistency** | `node tests/governance-consistency.test.mjs` | ✅ 5/5 PASS |
| **Declared Contract Drift** | `node scripts/check-api-contract-drift.mjs` | ✅ 9/9 PASS |
| **API TypeScript Check** | `npm run build --prefix apps/api` | ✅ 0 Errors |
| **Mobile TypeScript Check** | `npx tsc --noEmit -p apps/mobile/tsconfig.json` | ✅ 0 Errors |

---

## 8. Architectural Verdict & Next Steps

- **Job W006 Status**: **COMPLETE & AUDITED**
- **Action**: Ready for Independent Verification under Rule IV-001 / Amendment v1.4.
- **Next Job**: **W007 (Canonical API Client)** — Creation of `@kshetra/api-client` to provide a unified, typed client layer replacing raw direct table calls.
