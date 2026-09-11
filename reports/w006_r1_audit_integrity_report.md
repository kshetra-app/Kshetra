# JOB W006-R1: API ARCHITECTURE AUDIT & STRANGLER SEPARATION REPORT
**Execution Authority:** Master Product Blueprint, AI Agent Master Execution Job Book, Amendment v1.2, Amendment v1.4, AGENT_EXECUTION_PROTOCOL.md, DEC-002, DEC-028, DEC-029
**Status:** IMPLEMENTED & REBOUND — READY FOR INDEPENDENT VERIFICATION (W006-R1)
**Date:** 2026-09-11

---

## 1. Executive Summary & Objective

In accordance with **W006-R1 (Audit Truthfulness, Classification & Evidence Rebinding)**, this report establishes the authoritative, dynamically generated audit of the application data paths, PostgreSQL RPC semantics, Class-A security qualifications, and the 56-method Class-B Strangler Migration Matrix.

Key Architectural Directives:
- **Dual-Path Architecture Confirmed:** 12 baseline direct Supabase callers and 14 Railway Fastify callers.
- **Strangler Targets:** 56 client-side write mutations are the primary target for migration to Fastify in W007–W011.
- **Direct Reads Qualification:** 23 Class-A direct-read methods (including globalSearch) evaluated for RLS policy enforcement and sensitivity.
- **Fastify Canonicalization:** Fastify is the canonical gateway for all mutations, sensitive business workflows, rate limiting, and compliance auditing.

---

## 2. Evidence Coordinates & Provenance Model

| Coordinate | Value | Description |
| :--- | :--- | :--- |
| **CANONICAL_BRANCH** | `master` | Primary production branch |
| **VERIFIED_REMOTE_HEAD** | `5754fa2` | Remote HEAD against which W006 verification occurred |
| **AUDITED_CODE_COMMIT** | `5754fa2` | Exact implementation commit audited |
| **EVIDENCE_COMMIT** | `pending` | Commit containing regenerated W006-R1 audit reports |
| **ACCEPTANCE_COMMIT** | `pending` | Commit containing final user acceptance state |

### Historical Lineage
- `838e851`: Baseline state at start of W006 (W005 accepted with documented limitations).
- `3f88de3`: Initial W006 audit implementation and evidence.
- `980b49a`: Governance synchronization and coordinate rebinding.
- `5754fa2`: W006 independent verification pass commit.
- Current W006-R1: Dynamic rebinding, corrected globalSearch classification, 137 Fastify route registrations, and 56 exact endpoint strangler mappings.

---

## 3. Data Path Inventory & Caller Classification

### 3.1 Mobile Caller Breakdown (316 files scanned)

1. **Baseline Direct Supabase Callers (12 files)** — 100% precision match with `w000_data_paths.json`:
   - `apps/mobile/app/user/[id].tsx`
   - `apps/mobile/lib/aiService.ts`
   - `apps/mobile/lib/favoritesSync.ts`
   - `apps/mobile/lib/realtimeService.ts`
   - `apps/mobile/lib/representativeEdits.ts`
   - `apps/mobile/lib/supabase.ts`
   - `apps/mobile/lib/supabaseBootstrap.ts`
   - `apps/mobile/lib/supabaseDataService.ts`
   - `apps/mobile/lib/useSupabaseQuery.ts`
   - `apps/mobile/stores/auth.ts`
   - `apps/mobile/stores/liveExchange.ts`
   - `apps/mobile/stores/notifications.ts`

2. **Direct Supabase Table `.from()` Callers (7 files)** touching 45 database tables:
   - `apps/mobile/app/user/[id].tsx`
   - `apps/mobile/lib/aiService.ts`
   - `apps/mobile/lib/favoritesSync.ts`
   - `apps/mobile/lib/representativeEdits.ts`
   - `apps/mobile/lib/supabaseBootstrap.ts`
   - `apps/mobile/lib/supabaseDataService.ts`
   - `apps/mobile/stores/notifications.ts`

3. **Railway Fastify API Callers (14 files)**:
   - `apps/mobile/app/moderation/index.tsx`
   - `apps/mobile/lib/candidatePhotos.ts`
   - `apps/mobile/lib/constants.ts`
   - `apps/mobile/lib/enrichedGeoCache.ts`
   - `apps/mobile/lib/environment.ts`
   - `apps/mobile/lib/featureFlags.ts`
   - `apps/mobile/lib/pageProEntitlement.ts`
   - `apps/mobile/lib/pageService.ts`
   - `apps/mobile/lib/remoteGeoLoader.ts`
   - `apps/mobile/lib/supabaseDataService.ts`
   - `apps/mobile/lib/usePushNotifications.ts`
   - `apps/mobile/stores/campaign.ts`
   - `apps/mobile/stores/dmStore.ts`
   - `apps/mobile/stores/news.ts`

4. **Supabase Realtime Websocket Callers (2 files)**:
   - `apps/mobile/lib/realtimeService.ts`
   - `apps/mobile/stores/notifications.ts`

5. **Supabase Auth Session Callers (1 file)**:
   - `apps/mobile/stores/auth.ts`

6. **Local Fallback / Mock Files (15 files)**:
   - `apps/mobile/__tests__/mapEnhancements.test.ts`
   - `apps/mobile/app/user/[id].tsx`
   - `apps/mobile/components/NewsCard.tsx`
   - `apps/mobile/lib/aiService.ts`
   - `apps/mobile/lib/favoritesSync.ts`
   - `apps/mobile/lib/realtimeService.ts`
   - `apps/mobile/lib/representativeEdits.ts`
   - `apps/mobile/lib/supabase.ts`
   - `apps/mobile/lib/supabaseBootstrap.ts`
   - `apps/mobile/lib/supabaseDataService.ts`
   - `apps/mobile/lib/useSupabaseQuery.ts`
   - `apps/mobile/stores/auth.ts`
   - `apps/mobile/stores/liveExchange.ts`
   - `apps/mobile/stores/news.ts`
   - `apps/mobile/stores/notifications.ts`

---

## 4. Architectural Classification of Data Service Methods (85 Methods)

| Architectural Class | Count | % | Description |
| :--- | :---: | :---: | :--- |
| **Class A: Read (RLS-Governed)** | **23** | 27.1% | Read-only queries (SELECT) and read-only RPCs (global_search) governed by PostgreSQL RLS. |
| **Class B: Client Write (Strangler Target)** | **56** | 65.9% | Direct client mutations (INSERT, UPDATE, DELETE, RPC) bypassing server validation and audit logs. |
| **Class C: Already Fastify Routed** | **6** | 7.1% | Already communicating with Railway Fastify HTTP endpoints. |

### Semantic Operations Breakdown
- **READ_SELECT**: 22 methods
- **RPC_READ**: 1 methods
- **WRITE_INSERT**: 30 methods
- **WRITE_UPDATE**: 14 methods
- **WRITE_DELETE**: 4 methods
- **WRITE_MUTATION**: 6 methods
- **RPC_MUTATION**: 2 methods
- **ALREADY_FASTIFY**: 6 methods

---

## 5. globalSearch Classification Resolution (Requirement 3)

- **Method:** `globalSearch(query: string, stateCode?: string, limit?: number)`
- **Operation Semantic:** `RPC_READ`
- **Architectural Classification:** `CLASS_A_READ_RLS_GOVERNED`
- **SQL Definition:** `global_search(p_query TEXT, p_state_code TEXT, p_limit INTEGER)` in `020_foundation_hardening.sql`
- **Function Security & Volatility:** `STABLE SECURITY DEFINER (plpgsql)` with `GRANT EXECUTE TO anon, authenticated`
- **Tables Queried:** `constituencies`, `civic_issues`, `headlines`, `legislator_profiles` via PostgreSQL full-text search (`tsquery`, `ts_rank`)
- **Resolution Rationale:** `globalSearch` executes purely read-only full-text search across public data entities. It performs 0 writes or updates. Reclassified from Class B to Class A (RPC Read), with an architectural recommendation to optionally wrap it in Fastify `GET /api/v1/search` in W008 for rate limiting.

---

## 6. PostgreSQL RPC Semantics Audit (Requirement 4)

| RPC Name | Client Caller | Signature | Security / Mode | Behavior | Tables | Migration Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `global_search` | `globalSearch` | `global_search(p_query TEXT, p_state_code TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 20)` | `STABLE SECURITY DEFINER (plpgsql)` | **READ_ONLY** | constituencies, civic_issues, headlines, legislator_profiles | Full-text search aggregation function across 4 public entities. Classified as Class A RPC Read. |
| `increment_aspirant_modules` | `completeModule` | `increment_aspirant_modules(p_user_id UUID)` | `UNKNOWN — MIGRATION DEFINITION MISSING` | **MUTATION (Counter Increment)** | aspirant_profiles | Best-effort RPC incrementing aspirant modules_completed. Missing in SQL migration files; wrapped in try/catch on client. Must be migrated into POST /api/v1/aspirant/modules/:id/complete. |
| `increment_short_views` | `incrementShortView` | `increment_short_views(p_short_id UUID)` | `UNKNOWN — MIGRATION DEFINITION MISSING` | **MUTATION (View Counter Increment)** | political_shorts | RPC incrementing short views. Falls back to direct table update on failure. Must be strangulated into Fastify POST /api/v1/shorts/:id/view. |
| `increment` | `incrementShortView (fallback)` | `increment() / column expression` | `PostgREST / Supabase JS RPC helper` | **MUTATION (Counter Increment)** | political_shorts | Used inside .update({ view_count: supabase.rpc("increment") }) as fallback expression. |

---

## 7. Class A Security & RLS Qualification Matrix (Requirement 5)

| Method Name | Table / RPC | Sensitivity | RLS Status | Direct Client Allowed | API Mediation | Security Rationale |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| `globalSearch` | `global_search` | PUBLIC_SEARCH | SECURITY DEFINER / STABLE RPC | YES | OPTIONAL | Global search searches public constituencies, issues, headlines, and legislators. STABLE SECURITY DEFINER function with execute grant to anon and authenticated. |
| `fetchIssuesForConstituency` | `civic_issues` | PUBLIC_CIVIC | RLS ENABLED (Public read policy) | YES | OPTIONAL | Public read civic_issues policy permits SELECT USING (true). Safe for direct read. |
| `fetchFollowedUserIds` | `user_follows` | PUBLIC_OR_SCOPED | RLS ENABLED in migrations | YES | OPTIONAL | Verified RLS enabled on table. Direct client read safe under row-level policy. |
| `fetchUserProfile` | `user_profiles` | PUBLIC_AND_PRIVATE | RLS ENABLED (Public read user_profiles) | YES | OPTIONAL | Public read user_profiles policy permits SELECT. Sensitive columns (phone, KYC) protected by column security or separate tables. |
| `fetchPostsByAuthor` | `posts` | PUBLIC_SOCIAL | RLS ENABLED (Public read policy) | YES | OPTIONAL | Public read posts policy permits SELECT. Safe for direct client reading. |
| `fetchBlendedFeed` | `posts` | PUBLIC_SOCIAL | RLS ENABLED (Public read policy) | YES | OPTIONAL | Public read posts policy permits SELECT. Safe for direct client reading. |
| `fetchFeedForState` | `posts` | PUBLIC_SOCIAL | RLS ENABLED (Public read policy) | YES | OPTIONAL | Public read posts policy permits SELECT. Safe for direct client reading. |
| `fetchPromisesForState` | `election_promises` | PUBLIC_OR_SCOPED | RLS ENABLED in migrations | YES | OPTIONAL | Verified RLS enabled on table. Direct client read safe under row-level policy. |
| `fetchNotifications` | `notification_log` | USER_CONFIDENTIAL | RLS ENABLED (Users read own notification_log) | YES | OPTIONAL | Scoped strictly to auth.uid() == user_id. Direct read allowed under active RLS. |
| `fetchLeadershipModules` | `leadership_modules` | PUBLIC_OR_SCOPED | RLS ENABLED in migrations | YES | OPTIONAL | Verified RLS enabled on table. Direct client read safe under row-level policy. |
| `fetchChallenges` | `community_challenges` | PUBLIC_OR_SCOPED | RLS ENABLED in migrations | YES | OPTIONAL | Verified RLS enabled on table. Direct client read safe under row-level policy. |
| `fetchPublicAspirants` | `aspirant_profiles` | PUBLIC_OR_SCOPED | RLS ENABLED in migrations | YES | OPTIONAL | Verified RLS enabled on table. Direct client read safe under row-level policy. |
| `fetchVerifiedPoliticians` | `user_profiles` | PUBLIC_AND_PRIVATE | RLS ENABLED (Public read user_profiles) | YES | OPTIONAL | Public read user_profiles policy permits SELECT. Sensitive columns (phone, KYC) protected by column security or separate tables. |
| `fetchShorts` | `political_shorts` | PUBLIC_OR_SCOPED | RLS ENABLED in migrations | YES | OPTIONAL | Verified RLS enabled on table. Direct client read safe under row-level policy. |
| `fetchLiveEvents` | `live_events` | PUBLIC_OR_SCOPED | RLS ENABLED in migrations | YES | OPTIONAL | Verified RLS enabled on table. Direct client read safe under row-level policy. |
| `fetchDepartments` | `lmx_departments` | PUBLIC_REGISTRY | RLS ENABLED (Service-role default, policy pending) | YES | OPTIONAL | Directory of public emergency departments. Public read policy should be verified or mediated. |
| `fetchDepartmentAlerts` | `lmx_department_alerts` | PUBLIC_OR_SCOPED | RLS ENABLED in migrations | YES | OPTIONAL | Verified RLS enabled on table. Direct client read safe under row-level policy. |
| `fetchReporterCredibility` | `lmx_credibility` | PUBLIC_OR_SCOPED | RLS ENABLED in migrations | YES | OPTIONAL | Verified RLS enabled on table. Direct client read safe under row-level policy. |
| `fetchBrandKits` | `lmx_brand_kits` | PUBLIC_OR_SCOPED | RLS ENABLED in migrations | YES | OPTIONAL | Verified RLS enabled on table. Direct client read safe under row-level policy. |
| `fetchAffiliations` | `lmx_affiliations` | PUBLIC_OR_SCOPED | RLS ENABLED in migrations | YES | OPTIONAL | Verified RLS enabled on table. Direct client read safe under row-level policy. |
| `fetchUserConversations` | `conversations` | HIGHLY_CONFIDENTIAL | RLS ENABLED (Participants view conversations/messages) | NO | REQUIRED | Direct message conversations and messages are end-user private. While RLS enforces participant check, Fastify API mediation is recommended for complete audit trails. |
| `fetchConversationMessages` | `messages` | HIGHLY_CONFIDENTIAL | RLS ENABLED (Participants view conversations/messages) | NO | REQUIRED | Direct message conversations and messages are end-user private. While RLS enforces participant check, Fastify API mediation is recommended for complete audit trails. |
| `searchVerifiedProfiles` | `user_profiles` | PUBLIC_AND_PRIVATE | RLS ENABLED (Public read user_profiles) | YES | OPTIONAL | Public read user_profiles policy permits SELECT. Sensitive columns (phone, KYC) protected by column security or separate tables. |

---

## 8. Fastify Route Inventory: Static Source vs Runtime (Requirement 6)

- **Static Source Route Registrations:** **137 unique HTTP routes**
- **Fastify Route Modules:** **23 modules** in `apps/api/src/routes/*.ts` plus `server.ts`
- **Runtime Route Status:** Runtime Fastify route count equals static route registrations (137 unique routes across 23 modules) when all plugins are mounted with server.

---

## 9. Class B Strangler Migration Matrix (56 Methods, Requirement 7)

| # | Method Name | Current Data Operation | Tables / RPC | Exact Target Endpoint | HTTP | Auth | Idempotency | Phase | Legacy Removal Condition |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `upvoteIssue` | WRITE_INSERT | issue_upvotes | `NEW ROUTE REQUIRED: POST /api/v1/civic/issues/:id/upvote` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 1 (High-Risk Civic & Moderation Mutations) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 2 | `removeUpvote` | WRITE_DELETE | issue_upvotes | `NEW ROUTE REQUIRED: DELETE /api/v1/civic/issues/:id/upvote` | DELETE | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 1 (High-Risk Civic & Moderation Mutations) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 3 | `followIssue` | WRITE_MUTATION | issue_follows | `NEW ROUTE REQUIRED: POST /api/v1/civic/issues/:id/follow` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 1 (High-Risk Civic & Moderation Mutations) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 4 | `reportIssue` | WRITE_INSERT | civic_issues | `NEW ROUTE REQUIRED: POST /api/v1/civic/issues` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 1 (High-Risk Civic & Moderation Mutations) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 5 | `addIssueComment` | WRITE_INSERT | issue_comments | `NEW ROUTE REQUIRED: POST /api/v1/civic/issues/:id/comments` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 1 (High-Risk Civic & Moderation Mutations) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 6 | `tagMLAOnIssue` | WRITE_UPDATE | civic_issues | `NEW ROUTE REQUIRED: POST /api/v1/civic/issues/:id/tag-mla` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 1 (High-Risk Civic & Moderation Mutations) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 7 | `disputeIssueResolution` | WRITE_INSERT | issue_disputes | `NEW ROUTE REQUIRED: POST /api/v1/civic/issues/:id/dispute` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 1 (High-Risk Civic & Moderation Mutations) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 8 | `updateIssueStatus` | WRITE_MUTATION | civic_issues, notification_log | `NEW ROUTE REQUIRED: PATCH /api/v1/civic/issues/:id/status` | PATCH | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 1 (High-Risk Civic & Moderation Mutations) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 9 | `reactToPost` | WRITE_INSERT | reactions, posts, notification_log | `NEW ROUTE REQUIRED: POST /api/v1/feed/posts/:id/react` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 2 (Social Feed, Reactions & Poll Voting) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 10 | `removeReaction` | WRITE_DELETE | reactions | `NEW ROUTE REQUIRED: DELETE /api/v1/feed/posts/:id/react` | DELETE | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 2 (Social Feed, Reactions & Poll Voting) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 11 | `composePost` | WRITE_INSERT | posts | `NEW ROUTE REQUIRED: POST /api/v1/feed/posts` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 2 (Social Feed, Reactions & Poll Voting) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 12 | `editPost` | WRITE_UPDATE | posts | `NEW ROUTE REQUIRED: PATCH /api/v1/feed/posts/:id` | PATCH | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 2 (Social Feed, Reactions & Poll Voting) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 13 | `deletePost` | WRITE_UPDATE | posts | `NEW ROUTE REQUIRED: DELETE /api/v1/feed/posts/:id` | DELETE | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 2 (Social Feed, Reactions & Poll Voting) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 14 | `votePoll` | WRITE_INSERT | poll_votes | `NEW ROUTE REQUIRED: POST /api/v1/feed/polls/:id/vote` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 2 (Social Feed, Reactions & Poll Voting) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 15 | `addPostComment` | WRITE_INSERT | comments, posts, notification_log | `NEW ROUTE REQUIRED: POST /api/v1/feed/posts/:id/comments` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 2 (Social Feed, Reactions & Poll Voting) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 16 | `reactToComment` | WRITE_INSERT | reactions | `NEW ROUTE REQUIRED: POST /api/v1/feed/comments/:id/react` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 2 (Social Feed, Reactions & Poll Voting) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 17 | `removeCommentReaction` | WRITE_DELETE | reactions | `NEW ROUTE REQUIRED: DELETE /api/v1/feed/comments/:id/react` | DELETE | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 2 (Social Feed, Reactions & Poll Voting) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 18 | `deletePostComment` | WRITE_MUTATION | comments, hashtags, post_hashtags | `NEW ROUTE REQUIRED: DELETE /api/v1/feed/comments/:id` | DELETE | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 2 (Social Feed, Reactions & Poll Voting) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 19 | `followPromise` | WRITE_MUTATION | promise_follows | `NEW ROUTE REQUIRED: POST /api/v1/promises/:id/follow` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 2 (Social Feed, Reactions & Poll Voting) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 20 | `submitEvidence` | WRITE_INSERT | promise_evidence | `NEW ROUTE REQUIRED: POST /api/v1/promises/:id/evidence` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 2 (Social Feed, Reactions & Poll Voting) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 21 | `toggleFavorite` | WRITE_MUTATION | favorites | `NEW ROUTE REQUIRED: POST /api/v1/user/favorites/toggle` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 2 (Social Feed, Reactions & Poll Voting) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 22 | `uploadShort` | WRITE_INSERT | political_shorts | `NEW ROUTE REQUIRED: POST /api/v1/shorts` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 4 (Political Shorts & Aspirant Academy) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 23 | `approveShort` | WRITE_INSERT | short_approvals | `NEW ROUTE REQUIRED: POST /api/v1/shorts/:id/approve` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 4 (Political Shorts & Aspirant Academy) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 24 | `flagShort` | WRITE_INSERT | short_flags | `NEW ROUTE REQUIRED: POST /api/v1/shorts/:id/flag` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 4 (Political Shorts & Aspirant Academy) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 25 | `updateUserProfile` | WRITE_UPDATE | user_profiles | `NEW ROUTE REQUIRED: PATCH /api/v1/user/profile` | PATCH | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 2 (Social Feed, Reactions & Poll Voting) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 26 | `updateMyProfile` | WRITE_UPDATE | user_profiles | `NEW ROUTE REQUIRED: PATCH /api/v1/user/profile` | PATCH | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 2 (Social Feed, Reactions & Poll Voting) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 27 | `registerAspirant` | WRITE_INSERT | aspirant_profiles | `NEW ROUTE REQUIRED: POST /api/v1/aspirant/register` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 4 (Political Shorts & Aspirant Academy) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 28 | `startModule` | WRITE_INSERT | module_progress | `NEW ROUTE REQUIRED: POST /api/v1/aspirant/modules/:id/start` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 4 (Political Shorts & Aspirant Academy) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 29 | `completeModule` | RPC_MUTATION | module_progress, increment_aspirant_modules | `NEW ROUTE REQUIRED: POST /api/v1/aspirant/modules/:id/complete` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 4 (Political Shorts & Aspirant Academy) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 30 | `joinChallenge` | WRITE_INSERT | challenge_participation | `NEW ROUTE REQUIRED: POST /api/v1/aspirant/challenges/:id/join` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 4 (Political Shorts & Aspirant Academy) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 31 | `endorseAspirant` | WRITE_INSERT | community_endorsements, aspirant_profiles, notification_log | `NEW ROUTE REQUIRED: POST /api/v1/aspirant/:id/endorse` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 4 (Political Shorts & Aspirant Academy) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 32 | `submitKYC` | WRITE_INSERT | creator_kyc_records | `NEW ROUTE REQUIRED: POST /api/v1/contributor/kyc` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 3 (Creator KYC, LMX & Devices) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 33 | `insertActionFingerprint` | WRITE_INSERT | action_fingerprints | `NEW ROUTE REQUIRED: POST /api/v1/contributor/fingerprint` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 3 (Creator KYC, LMX & Devices) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 34 | `upsertContributorDevice` | WRITE_INSERT | contributor_devices | `NEW ROUTE REQUIRED: POST /api/v1/contributor/devices` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 3 (Creator KYC, LMX & Devices) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 35 | `markNotificationRead` | WRITE_UPDATE | notification_log | `NEW ROUTE REQUIRED: PATCH /api/v1/notifications/read` | PATCH | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 2 (Social Feed, Reactions & Poll Voting) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 36 | `markAllNotificationsRead` | WRITE_UPDATE | notification_log | `NEW ROUTE REQUIRED: PATCH /api/v1/notifications/read` | PATCH | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 2 (Social Feed, Reactions & Poll Voting) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 37 | `registerPushToken` | WRITE_INSERT | push_tokens | `EXACT EXISTING: POST /api/v1/notifications/register-token` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 1 (High-Risk Civic & Moderation Mutations) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 38 | `followUser` | WRITE_INSERT | user_follows | `NEW ROUTE REQUIRED: POST /api/v1/users/:id/follow` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 2 (Social Feed, Reactions & Poll Voting) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 39 | `unfollowUser` | WRITE_DELETE | user_follows | `NEW ROUTE REQUIRED: DELETE /api/v1/users/:id/follow` | DELETE | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 2 (Social Feed, Reactions & Poll Voting) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 40 | `submitContentReport` | WRITE_INSERT | reports | `EXACT EXISTING: POST /api/v1/moderation/action (or NEW: POST /api/v1/moderation/report)` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 1 (High-Risk Civic & Moderation Mutations) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 41 | `recordSession` | WRITE_INSERT | user_sessions | `NEW ROUTE REQUIRED: POST /api/v1/analytics/sessions` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 3 (Creator KYC, LMX & Devices) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 42 | `endSession` | WRITE_UPDATE | user_sessions | `NEW ROUTE REQUIRED: POST /api/v1/analytics/sessions` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 3 (Creator KYC, LMX & Devices) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 43 | `incrementShortView` | RPC_MUTATION | political_shorts, increment_short_views, increment | `NEW ROUTE REQUIRED: POST /api/v1/shorts/:id/view` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 4 (Political Shorts & Aspirant Academy) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 44 | `addShortComment` | WRITE_MUTATION | short_comments, political_shorts | `NEW ROUTE REQUIRED: POST /api/v1/shorts/:id/comments` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 4 (Political Shorts & Aspirant Academy) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 45 | `createLiveEvent` | WRITE_INSERT | live_events | `EXACT EXISTING: POST /api/v1/lmx/live` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 3 (Creator KYC, LMX & Devices) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 46 | `updateLiveEvent` | WRITE_UPDATE | live_events | `EXACT EXISTING: POST /api/v1/lmx/live/:streamId/moderate` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 3 (Creator KYC, LMX & Devices) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 47 | `endLiveEvent` | WRITE_UPDATE | live_events | `EXACT EXISTING: POST /api/v1/lmx/live/:streamId/end` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 3 (Creator KYC, LMX & Devices) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 48 | `dispatchDepartmentAlert` | WRITE_INSERT | lmx_department_alerts | `EXACT EXISTING: POST /api/v1/lmx/alerts` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 3 (Creator KYC, LMX & Devices) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 49 | `acknowledgeDepartmentAlert` | WRITE_UPDATE | lmx_department_alerts | `EXACT EXISTING: POST /api/v1/lmx/alerts/:id/acknowledge` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 3 (Creator KYC, LMX & Devices) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 50 | `createContentAlert` | WRITE_INSERT | content_alerts | `EXACT EXISTING: POST /api/v1/lmx/alerts (or NEW: POST /api/v1/alerts/content)` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 3 (Creator KYC, LMX & Devices) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 51 | `acknowledgeContentAlert` | WRITE_UPDATE | content_alerts | `EXACT EXISTING: POST /api/v1/lmx/alerts/:id/acknowledge` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 3 (Creator KYC, LMX & Devices) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 52 | `updateReporterCredibility` | WRITE_INSERT | lmx_credibility | `NEW ROUTE REQUIRED: POST /api/v1/lmx/credibility` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 3 (Creator KYC, LMX & Devices) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 53 | `addDistributionDestination` | WRITE_INSERT | lmx_distribution_destinations | `EXACT EXISTING: POST /api/v1/lmx/distribution` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 3 (Creator KYC, LMX & Devices) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 54 | `logModerationEvent` | WRITE_INSERT | lmx_moderation_events | `EXACT EXISTING: POST /api/v1/moderation/action` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 3 (Creator KYC, LMX & Devices) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 55 | `incrementViewerCount` | WRITE_UPDATE | live_events | `NEW ROUTE REQUIRED: POST /api/v1/lmx/live/:id/viewers` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 3 (Creator KYC, LMX & Devices) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |
| 56 | `markConversationMessagesRead` | WRITE_UPDATE | messages | `NEW ROUTE REQUIRED: POST /api/v1/dm/messages/read` | POST | Supabase JWT (Bearer) | NON_IDEMPOTENT | Phase 1 (High-Risk Civic & Moderation Mutations) | Fastify endpoint implemented and mobile data service updated to route through canonical client. |

---

## 10. Strangulation Migration Roadmap (4 Phases)

### Phase 1: High-Risk Civic & Moderation Mutations (P0 (Immediate / W007-W008))
**Rationale:** Public-facing civic issues, comments, disputes, content reports, and push registrations must be moderated and rate-limited at the API gateway.

**Methods (11):** `upvoteIssue`, `removeUpvote`, `followIssue`, `reportIssue`, `addIssueComment`, `tagMLAOnIssue`, `disputeIssueResolution`, `updateIssueStatus`, `registerPushToken`, `submitContentReport`, `markConversationMessagesRead`

**Target Endpoints:**
- `POST /api/v1/civic/issues (NEW)`
- `POST /api/v1/civic/issues/:id/comments (NEW)`
- `POST /api/v1/civic/issues/:id/upvote (NEW)`
- `DELETE /api/v1/civic/issues/:id/upvote (NEW)`
- `POST /api/v1/civic/issues/:id/follow (NEW)`
- `POST /api/v1/civic/issues/:id/tag-mla (NEW)`
- `POST /api/v1/civic/issues/:id/dispute (NEW)`
- `PATCH /api/v1/civic/issues/:id/status (NEW)`
- `POST /api/v1/moderation/action (EXACT EXISTING)`
- `POST /api/v1/notifications/register-token (EXACT EXISTING)`

### Phase 2: Social Feed, Reactions & Poll Voting (P1 (W008-W009))
**Rationale:** Feed engagement, reactions, poll voting, user follows, and user profile management require server-side spam prevention and idempotent handling.

**Methods (42):** `reactToPost`, `removeReaction`, `composePost`, `editPost`, `deletePost`, `votePoll`, `addPostComment`, `reactToComment`, `removeCommentReaction`, `deletePostComment`, `followPromise`, `submitEvidence`, `toggleFavorite`, `updateUserProfile`, `updateMyProfile`, `markNotificationRead`, `markAllNotificationsRead`, `globalSearch`, `fetchIssuesForConstituency`, `followUser`, `unfollowUser`, `fetchFollowedUserIds`, `fetchUserProfile`, `fetchPostsByAuthor`, `fetchBlendedFeed`, `fetchFeedForState`, `fetchPromisesForState`, `fetchNotifications`, `fetchLeadershipModules`, `fetchChallenges`, `fetchPublicAspirants`, `fetchVerifiedPoliticians`, `fetchShorts`, `fetchLiveEvents`, `fetchDepartments`, `fetchDepartmentAlerts`, `fetchReporterCredibility`, `fetchBrandKits`, `fetchAffiliations`, `fetchUserConversations`, `fetchConversationMessages`, `searchVerifiedProfiles`

**Target Endpoints:**
- `POST /api/v1/feed/posts (NEW)`
- `PATCH /api/v1/feed/posts/:id (NEW)`
- `DELETE /api/v1/feed/posts/:id (NEW)`
- `POST /api/v1/feed/posts/:id/react (NEW)`
- `DELETE /api/v1/feed/posts/:id/react (NEW)`
- `POST /api/v1/feed/polls/:id/vote (NEW)`
- `POST /api/v1/feed/posts/:id/comments (NEW)`
- `POST /api/v1/feed/comments/:id/react (NEW)`
- `DELETE /api/v1/feed/comments/:id/react (NEW)`
- `DELETE /api/v1/feed/comments/:id (NEW)`
- `POST /api/v1/promises/:id/follow (NEW)`
- `POST /api/v1/promises/:id/evidence (NEW)`
- `POST /api/v1/user/favorites/toggle (NEW)`
- `POST /api/v1/users/:id/follow (NEW)`
- `DELETE /api/v1/users/:id/follow (NEW)`
- `PATCH /api/v1/user/profile (NEW)`
- `PATCH /api/v1/notifications/read (NEW)`

### Phase 3: Creator KYC, LMX & Devices (P1 (W009-W010))
**Rationale:** Sensitive contributor verification, hardware device fingerprinting, live stream broadcasts, and department emergency alerting.

**Methods (16):** `submitKYC`, `insertActionFingerprint`, `upsertContributorDevice`, `recordSession`, `endSession`, `createLiveEvent`, `updateLiveEvent`, `endLiveEvent`, `dispatchDepartmentAlert`, `acknowledgeDepartmentAlert`, `createContentAlert`, `acknowledgeContentAlert`, `updateReporterCredibility`, `addDistributionDestination`, `logModerationEvent`, `incrementViewerCount`

**Target Endpoints:**
- `POST /api/v1/contributor/kyc (NEW)`
- `POST /api/v1/contributor/fingerprint (NEW)`
- `POST /api/v1/contributor/devices (NEW)`
- `POST /api/v1/lmx/live (EXACT EXISTING)`
- `POST /api/v1/lmx/live/:streamId/moderate (EXACT EXISTING)`
- `POST /api/v1/lmx/live/:streamId/end (EXACT EXISTING)`
- `POST /api/v1/lmx/alerts (EXACT EXISTING)`
- `POST /api/v1/lmx/alerts/:id/acknowledge (EXACT EXISTING)`
- `POST /api/v1/lmx/distribution (EXACT EXISTING)`
- `POST /api/v1/lmx/credibility (NEW)`
- `POST /api/v1/lmx/live/:id/viewers (NEW)`
- `POST /api/v1/analytics/sessions (NEW)`

### Phase 4: Political Shorts & Aspirant Academy (P2 (W010-W011))
**Rationale:** Short-form video publishing, moderation flagging, aspirant politician registration, learning modules, and community endorsements.

**Methods (10):** `uploadShort`, `approveShort`, `flagShort`, `registerAspirant`, `startModule`, `completeModule`, `joinChallenge`, `endorseAspirant`, `incrementShortView`, `addShortComment`

**Target Endpoints:**
- `POST /api/v1/shorts (NEW)`
- `POST /api/v1/shorts/:id/approve (NEW)`
- `POST /api/v1/shorts/:id/flag (NEW)`
- `POST /api/v1/shorts/:id/comments (NEW)`
- `POST /api/v1/shorts/:id/view (NEW)`
- `POST /api/v1/aspirant/register (NEW)`
- `POST /api/v1/aspirant/modules/:id/start (NEW)`
- `POST /api/v1/aspirant/modules/:id/complete (NEW)`
- `POST /api/v1/aspirant/challenges/:id/join (NEW)`
- `POST /api/v1/aspirant/:id/endorse (NEW)`


---

## 11. Declared API Contract Drift Note (Requirement 8)

The current `scripts/check-api-contract-drift.mjs` performs the **Declared API Contract Drift Check** verifying 9 explicit client contract expectations against registered server routes. It is not a substitute for AST-based mobile caller discovery. Full automated mobile-to-Fastify dynamic call graph tracking is established as an operational requirement for W007 and W008.