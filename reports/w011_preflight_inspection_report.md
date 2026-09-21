# W011 Preflight Inspection Report — Production Fallback Repair

**Document Type:** Preflight & Source-Truth Inspection Report  
**Job Identifier:** JOB 011 / W011 — Production Fallback Repair  
**Date:** September 21, 2026  
**Status:** `PREFLIGHT_COMPLETE_AWAITING_CTO_AUTHORIZATION`  
**Implementation Authorization:** `NOT YET GRANTED`  
**Base Commit:** `f80b585a8c1dcb2458f1964255b0d8e9bc200285` (`f80b585`)  
**Target Branch:** `master`  
**Owners:** BE, MOB  

---

## 1. Executive Summary & Governance Preflight Boundary

Pursuant to the **PanIN-Kshetra Master Execution Document and Sequential Job Book**, **Job 011 (Production Fallback Repair)** is the next permitted sequential engineering job following the CTO acceptance and closure of W010.

Under strict governance directives:
1. **Implementation authorization for W011 is NOT YET GRANTED.**
2. **Zero code modifications** have been made to application source code (`apps/mobile/**` and `apps/api/**`).
3. **Zero database mutations, schema migrations, or deployments** have been executed.
4. This preflight inspection establishes the verified baseline of truth across both mobile and API codebases, reconciling historical defects against current reality and defining exact remediation boundaries.

### 1.1 Specification Mandate (Master Execution Document Job 011)
* **Objective:** "Eliminate misleading local-success semantics."
* **Mandate:** "Replace false success with explicit: `FAILED`, `QUEUED`, `SYNCING`, `SYNCED`."
* **Evidence Standard:** "Backend-disabled tests. No successful persistence claim when server persistence failed."

---

## 2. Scope of Static & Semantic Audit

The static and semantic audit covered the entirety of the Kshetra monorepo across mobile client layers, network services, state stores, and backend API routes:

| Layer | Files Audited | Key Symbols & Modules Inspected |
| :--- | :--- | :--- |
| **Mobile API Client & Services** | 331 files | `supabaseDataService.ts`, `apiClient.ts`, `offlineSync.ts`, `notificationTriggers.ts`, `aiService.ts` |
| **Mobile State Stores** | 29 stores | `feed.ts`, `civic.ts`, `promises.ts`, `politicalShorts.ts`, `aspirant.ts`, `user.ts`, `auth.ts`, `dm.ts`, etc. |
| **Mobile UI Mutation Sinks** | Key views | `ComposeSheet.tsx`, `PostDetailModal.tsx`, `IssueReportModal.tsx`, `CandidateDetailView.tsx` |
| **Backend Fastify API Routes** | 64 files | `campaign.ts`, `politicalAds.ts`, `moderation.ts`, `politician.ts`, `civic.ts`, `pages.ts`, `dm.ts`, `debug.ts` |
| **Backend Providers & Middleware** | 12 files | `mockProvider.ts`, `razorpayProvider.ts`, `auth.ts`, `circuitBreaker.ts` |

---

## 3. Reconciliation with Historical Defect Registers

### 3.1 DEF-002: Deceptive Local-Success in `supabaseDataService.ts`
* **Historical Finding:** 42 deceptive mock-success occurrences reported in initial inventory (29 guard-bypasses, 6 synthetic IDs, 7 unverified).
* **Current Truth:** In `apps/mobile/lib/supabaseDataService.ts`, all 29 `if (!guard()) return true` and 6 synthetic ID cases were remediated in W010 Batch L3. An exhaustive AST analysis of all 68 `try / catch` blocks in `supabaseDataService.ts` confirms **0 deceptive success returns in catch blocks**.
* **Emergent Finding:** While `supabaseDataService.ts` fails closed honestly, **deceptive mock-success patterns migrated into calling stores and UI components** (`ComposeSheet.tsx`, `PostDetailModal.tsx`, `promises.ts`, `politicalShorts.ts`, `aspirant.ts`).

### 3.2 DEF-004: Content Moderation Enforcement
* **Historical Finding:** Moderation bypass allowing unmoderated content during API downtime.
* **Current Truth:** The backend Fastify service enforces fail-closed moderation (W009-B3, HTTP 503 `MODERATION_UNAVAILABLE`).
* **Client Leak:** Mobile client pre-check in `supabaseDataService.ts:49` catches errors and returns `{ flagged: false }`. If direct Supabase writes bypass Fastify, unmoderated posts can be inserted if Supabase is reachable while Fastify moderation endpoint is down.

### 3.3 DEF-005: Dual-Calling Strangler Progression
* **Historical Finding:** Incomplete strangler migration from direct Supabase SDK calls to backend Fastify API endpoints.
* **Current Truth:** Out of 56 Class B mutations identified in W006, only 6 are currently migrated to Fastify via `apiClient` in `supabaseDataService.ts` (`upvoteIssue`, `removeUpvote`, `followIssue`, `reportIssue`, `addIssueComment`, `updateIssueStatus`).
* **50 mutations** in `supabaseDataService.ts` still execute direct `supabase.from(...)` or `supabase.rpc(...)`.
* **5 direct message methods** (`sendDirectMessageToConversation`, `acceptDMRequest`, etc.) in `supabaseDataService.ts` execute raw ad-hoc `fetch()` calls to a hardcoded URL (`https://kshetra-api-production-9f06.up.railway.app`) with raw `x-user-id` headers, completely bypassing `apiClient`.

---

## 4. Comprehensive Findings Inventory by Classification Bin

A total of **26 findings** were identified and categorized into the five authoritative classification bins:

```
┌─────────────────────────────────────────────────────────────┐
│               W011 PREFLIGHT FINDINGS BREAKDOWN             │
├──────────────────────────────────────────────┬──────────────┤
│ 1. VERIFIED CURRENT DEFECT                   │ 15 findings  │
│ 2. ALREADY RESOLVED                          │  6 findings  │
│ 3. INTENTIONAL / SAFE FALLBACK               │  4 findings  │
│ 4. OUT OF W011 SCOPE                         │  3 findings  │
│ 5. UNKNOWN / REQUIRES RUNTIME EVIDENCE       │  2 findings  │
├──────────────────────────────────────────────┼──────────────┤
│ TOTAL AUDITED FINDINGS                       │ 26 findings  │
└──────────────────────────────────────────────┴──────────────┘
```

---

### Bin 1: VERIFIED CURRENT DEFECT (15 Findings)

| Defect ID | Domain | File & Line(s) | Symbol | Description & Technical Impact |
| :--- | :--- | :--- | :--- | :--- |
| **W011-DEF-01** | Mobile UI | `apps/mobile/components/ComposeSheet.tsx:180, 202, 205` | `ComposeSheet.handleSubmit` | Generates synthetic IDs (`local-${Date.now()}`, `poll-local-...`, `opt-local-...`) added to `feed.ts` store and never reconciled when server returns real UUIDs. Causes permanent zombie posts in `localOnly` filters. |
| **W011-DEF-02** | Mobile UI | `apps/mobile/components/PostDetailModal.tsx:83` | `PostDetailModal.handleSendComment` | Generates synthetic ID `local-c-${Date.now()}` that is never reconciled with server-returned comment UUID. Subsequent mutations (deletions, reactions) fail on non-existent IDs. |
| **W011-DEF-03** | Mobile Store | `apps/mobile/stores/promises.ts:555-579` | `usePromiseStore.submitEvidence / toggleFollowPromise` | `submitEvidence` generates synthetic ID `pe-${Date.now()}` in local state; `toggleFollowPromise` mutates local state only. Neither calls DataService or backend. Zero server persistence. |
| **W011-DEF-04** | Mobile Store | `apps/mobile/stores/politicalShorts.ts:46-60` | `usePoliticalShortsStore.addShort / approveShort / flagShort` | `addShort` generates `short-user-${Date.now()}` in MMKV; `approveShort`/`flagShort` mutate local MMKV only without invoking DataService. Citizen shorts and moderation actions isolated to single device. |
| **W011-DEF-05** | Mobile Store | `apps/mobile/stores/aspirant.ts:438-480` | `useAspirantStore.completeModule / startModule / joinChallenge` | Module progress and challenges are mutated exclusively in local Zustand/MMKV state; corresponding dataService methods are never invoked. |
| **W011-DEF-06** | Mobile Queue | `apps/mobile/lib/offlineSync.ts:129-168` | `executeOp` | `SyncOpType` defines `add_comment`, but `executeOp` switch omits case `'add_comment'` and falls through to `default: return true;`. Queued comments are silently discarded while reporting false success. |
| **W011-DEF-07** | Mobile Store | `apps/mobile/stores/feed.ts:1353, 1362` | `useFeedStore.addPost` | Calls `enqueue('compose_post')` (which executes `composePost` when online) and immediately calls `dataService.composePost` a second time, duplicating online post submissions. |
| **W011-DEF-08** | Architecture | `apps/mobile/stores/*.ts & lib/offlineSync.ts` | Monorepo-wide `SyncStatus` | Monorepo-wide absence of the mandatory Job 011 4-state synchronization lifecycle (`FAILED`, `QUEUED`, `SYNCING`, `SYNCED`) across all 29 Zustand stores. |
| **W011-DEF-09** | Backend API | `apps/api/src/routes/campaign.ts:838-844` | `PATCH /api/v1/campaign/booths/:id` | Catches database update failure, modifies `inMemoryBooths` array, and falsely returns HTTP 200 `{ success: true, booth: inMemoryBooths[memIdx] }`. Falsely claims server persistence. |
| **W011-DEF-10** | Backend API | `apps/api/src/routes/campaign.ts:944-966` | `POST /api/v1/campaign/volunteers` | Generates synthetic ID `v-${Date.now().toString(36)}`, unshifts to `inMemoryVolunteers`, catches DB insert error with empty catch, and returns HTTP 201 `{ success: true, volunteer }`. |
| **W011-DEF-11** | Backend API | `apps/api/src/routes/politicalAds.ts:225-240` | `POST /api/v1/admin/political-ads` | When `!isSupabaseConfigured`, generates synthetic ID `pad-${Date.now()}`, pushes to `MEMORY_ADS`, and returns HTTP 201 `{ success: true, ad }`. Falsely certifies ad creation on disconnected DB. |
| **W011-DEF-12** | Backend API | `apps/api/src/routes/moderation.ts:675-684` | `POST /api/v1/moderation/verify-request` | Returns synthetic ID `mock-verif-${Date.now()}` and HTTP 200 `{ success: true }` when Supabase is unconfigured. Falsely acknowledges identity verification. |
| **W011-DEF-13** | Backend API | `apps/api/src/routes/moderation.ts:725-731, 768-770` | `POST /api/v1/moderation/block` & `DELETE /block/:userId` | Skips database mutation when `!isSupabaseConfigured` and returns HTTP 200 `{ success: true }`. Falsely confirms user blocking/unblocking without database update. |
| **W011-DEF-14** | Backend API | `apps/api/src/routes/politician.ts:21-23` | `resolveAuthUser` | Injects mock user `'auth-token-user'` for any Bearer token when `!isSupabaseConfigured`. Permits unauthenticated bypass during database disconnection. |
| **W011-DEF-15** | Mobile Network | `apps/mobile/lib/supabaseDataService.ts:1986, 2010, 2028` | Direct Message methods | Hardcodes fallback URL `'https://kshetra-api-production-9f06.up.railway.app'`, using ad-hoc `fetch()` with raw `x-user-id` header, bypassing canonical `apiClient` and environment isolation. |

---

### Bin 2: ALREADY RESOLVED (6 Items)

| Resolution ID | Domain | File & Line(s) | Symbol | Verification Evidence & Prior Job Reference |
| :--- | :--- | :--- | :--- | :--- |
| **W011-RES-01** | Mobile DataService | `apps/mobile/lib/supabaseDataService.ts` | 29 `if (!guard()) return true` cases | All 29 deceptive `return true` cases were eliminated in **W010 Batch L3**; all 29 now fail closed and return `false` or throw. |
| **W011-RES-02** | Mobile DataService | `apps/mobile/lib/supabaseDataService.ts` | 6 synthetic ID cases | All 6 synthetic ID generation cases in DataService were eliminated in **W010 Batch L3**, returning `{ id: null, success: false }`. |
| **W011-RES-03** | Mobile DataService | `apps/mobile/lib/supabaseDataService.ts:792` | `completeModule` | Verified legitimate non-defect: `return true` occurs strictly after confirmed PostgreSQL update; best-effort non-fatal RPC is safely isolated. |
| **W011-RES-04** | Backend API | `apps/api/src/routes/civic.ts:465-960` | Civic mutations | All civic routes enforce fail-closed HTTP 503 when `!isSupabaseConfigured` and HTTP 501 for unpersisted operations (Operations 8 & 10). Verified in **W009-B4**. |
| **W011-RES-05** | Backend API | `apps/api/src/routes/pages.ts:707` | Page Pro activation | Enforces fail-closed HTTP 503 when `!isSupabaseConfigured`; orders persist atomically via Migration 035. Verified in **W008-E** and **W009-B5**. |
| **W011-RES-06** | Backend API | `apps/api/src/routes/campaign.ts:1040-1350` | Wallet & Recharge Orders | Prepaid wallet and campaign recharge orders use durable PostgreSQL tables with fail-closed cryptographic signature verification. Verified in **W008-E** and **W009-B2**. |

---

### Bin 3: INTENTIONAL / SAFE FALLBACK (4 Items)

| Safe ID | Domain | File & Line(s) | Symbol | Architecture Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **W011-SAFE-01** | Mobile Notifications | `apps/mobile/lib/notificationTriggers.ts:37-46` | `dispatchIfEnabled` | `scheduleLocalNotification` wrapped in catch; returns true because in-app inbox notification was persisted. Safe degraded UX when OS notification permission is denied. |
| **W011-SAFE-02** | Mobile AI | `apps/mobile/lib/aiService.ts:11, 96` | `FALLBACK_MODELS` | Iterates through candidate LLM models on API rate limit or error. Standard resilient model failover. |
| **W011-SAFE-03** | Backend Providers | `apps/api/src/providers/mockProvider.ts:35-185` | `MockProvider` | Dedicated test sandbox provider with strict anti-production guard throwing if `process.env.NODE_ENV === 'production'`. Accepted in **W009-B2** and **W009-B5** for staging/CI testing. |
| **W011-SAFE-04** | Backend Routes | `apps/api/src/routes/debug.ts:64` | `PGRST_MOCK_TIMEOUT` | Controlled diagnostic error generator locked behind `x-debug-bypass-secret` and returning HTTP 404 in production. Accepted in **W004-R1**. |

---

### Bin 4: OUT OF W011 SCOPE (3 Items)

| Scope ID | Domain | File / Item | Scheduled Job | Scope Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **W011-OOS-01** | Mobile Outreach | `apps/mobile/lib/outreachProvider.ts & stores/outreach.ts` | **W025–W029** (Campaign / Broadcast) | Simulated telecom delivery percentages on client side belong to the dedicated campaign broadcast engine overhaul. |
| **W011-OOS-02** | Database / Geography | `DEF-006` (Versioned Geography Tables) | **W013–W017** (Territorial Integrity) | Boundary contamination guards and spatial reconciliation are governed under W013–W017. |
| **W011-OOS-03** | Mobile Architecture | `DEF-003` (WebRTC Decoupling) | **W052** | Native WebRTC binary footprint decoupling and optional loading boundary. |

---

### Bin 5: UNKNOWN / REQUIRES RUNTIME EVIDENCE (2 Items)

| Unknown ID | Domain | File & Line(s) | Symbol | Investigation Requirement |
| :--- | :--- | :--- | :--- | :--- |
| **W011-UNK-01** | Backend API | `apps/api/src/routes/dm.ts:224` | `GET /api/v1/dm/unread-count` | Returns `{ success: true, count: 0 }` on database exception. Requires runtime probe to verify whether mobile badge handler requires HTTP 503 or degrades cleanly with `{ count: 0, status: 'unavailable' }`. |
| **W011-UNK-02** | Backend API | `apps/api/src/routes/moderation.ts:571-578` | `GET /api/v1/moderation/queue` | Returns `MOCK_REPORTS_QUEUE` when database query returns empty or unconfigured. Requires runtime probe to determine whether admin panel relies on mock queue for empty state demonstration. |

---

## 5. Proposed Remediation Plan (Four Bounded Batches)

Upon receiving explicit CTO authorization for W011 implementation, remediation should proceed in four sequential, bounded batches with individual verification gates:

### Batch W011-B1: Backend Fastify Fail-Closed Fallback Elimination
* **Scope:**
  * `apps/api/src/routes/campaign.ts`: Eliminate `inMemoryBooths` and `inMemoryVolunteers` fallbacks; return HTTP 503 / 500 fail-closed on DB failure.
  * `apps/api/src/routes/politicalAds.ts`: Eliminate `MEMORY_ADS` fallback for `POST /api/v1/admin/political-ads`; enforce fail-closed HTTP 503 when Supabase is disconnected.
  * `apps/api/src/routes/moderation.ts`: Eliminate `mock-verif-*` synthetic ID generation on `verify-request`; eliminate bypass in `block` / `unblock`.
  * `apps/api/src/routes/politician.ts`: Eliminate `'auth-token-user'` mock auth bypass; enforce strict JWT validation.
  * `apps/api/src/routes/dm.ts`: Convert `unread-count` database catch to fail-closed HTTP 503 or structured degraded response.
* **Verification Standard:** Fastify test suite with Supabase mock in disconnected state. Every mutation must return HTTP 503 or 401; zero HTTP 200/201 with mock data.

### Batch W011-B2: Mobile UI Synthetic ID Elimination & Reconciliation
* **Scope:**
  * `apps/mobile/components/ComposeSheet.tsx`: Use standard client temporary ID / token, await server response, and reconcile post ID in `feed.ts` with authoritative UUID returned by backend.
  * `apps/mobile/components/PostDetailModal.tsx`: Reconcile newly created comment ID with authoritative server UUID.
  * `apps/mobile/stores/promises.ts`: Wire `submitEvidence` and `toggleFollowPromise` to `supabaseDataService.ts`; eliminate synthetic `pe-*` IDs.
  * `apps/mobile/stores/politicalShorts.ts`: Wire `addShort`, `approveShort`, and `flagShort` to `supabaseDataService.ts`; eliminate synthetic `short-user-*` IDs.
  * `apps/mobile/stores/aspirant.ts`: Wire `completeModule`, `startModule`, and `joinChallenge` to backend persistence.
* **Verification Standard:** Component unit tests verifying that all post/comment creations either reconcile with server UUID or transition to explicit `FAILED` state.

### Batch W011-B3: Canonical 4-State Synchronization Lifecycle (`FAILED`, `QUEUED`, `SYNCING`, `SYNCED`)
* **Scope:**
  * `apps/mobile/lib/offlineSync.ts`:
    * Implement canonical `SyncStatus` type: `'SYNCED' | 'QUEUED' | 'SYNCING' | 'FAILED'`.
    * Fix `executeOp` switch statement to handle `'add_comment'` explicitly.
    * Eliminate duplicate execution in `feed.ts:1353, 1362`.
  * `apps/mobile/stores/feed.ts`: Add `syncStatus` attribute to posts and comments; render clear UI indicators when queued or failed.
  * `apps/mobile/stores/civic.ts`: Add explicit `syncStatus` to civic issue submissions and status updates.
* **Verification Standard:** Offline/airplane-mode simulation tests verifying mutations enter `QUEUED` state, transition to `SYNCING` upon reconnect, and reach `SYNCED` only upon HTTP 200/201 from backend.

### Batch W011-B4: Canonical API Client Routing & Direct-Calling Strangler (DEF-005)
* **Scope:**
  * `apps/mobile/lib/supabaseDataService.ts`: Migrate the 5 raw `fetch()` direct message functions (`sendDirectMessageToConversation`, `acceptDMRequest`, `declineDMRequest`, `getDirectMessages`, `getOrCreateConversation`) to use canonical `apiClient` with proper auth headers, base URL configuration, and deadline budgets.
  * `apps/mobile/lib/supabaseDataService.ts:49`: Align client-side `checkContentModeration` catch block with fail-closed policy.
* **Verification Standard:** Network interception tests ensuring 0 raw ad-hoc `fetch()` calls to hardcoded URLs.

---

## 6. Preflight Conclusion & Next Steps

* **Inspection Outcome:** The preflight audit for Job 011 is complete. 15 verified current defects have been precisely cataloged with line-level accuracy across mobile and API repositories.
* **Current Status:** `PREFLIGHT_COMPLETE_AWAITING_CTO_AUTHORIZATION`.
* **Action:** In accordance with the sequential execution protocol, engineering work is **HALTED**. We await CTO direction and explicit authorization before initiating Batch W011-B1.
