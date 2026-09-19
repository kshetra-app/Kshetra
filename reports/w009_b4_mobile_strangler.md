# W009-B4: MOBILE STRANGLER & MUTATION CONSOLIDATION REPORT

## 1. Executive Summary
- **Job ID:** W009-B4
- **Authority:** CTO Implementation Authorization W009-B4
- **Authoritative Baseline Commit:** 1a715c87f50a5006a7020a7047794daa3542d798
- **Authoritative Baseline Tree:** c111e3de8ecd41dc66aa66ee0d8bd25451065e49
- **Implementation Commit:** 0c628d7cf26fdfe4a82f9aa40b25317c25987549
- **Status:** **IMPLEMENTED / TESTED / VERIFIED / SUBMITTED FOR CTO ACCEPTANCE** (CTO ACCEPTANCE: PENDING)
- **Successor Status:** W009-B5 remains strictly **FROZEN / NOT AUTHORIZED**.
- **Scope Compliance:**
  - 11 Authorized mutations consolidated behind Fastify canonical API endpoints with verified schema persistence.
  - 2 Explicitly blocked operations fail closed with HTTP 501 PERSISTENCE_TARGET_UNAVAILABLE.
  - 0 Database migrations created (037_*.sql does not exist).
  - 6 Deceptive fallbacks eliminated in apps/mobile/lib/supabaseDataService.ts (no fake local-* IDs, no fake return true).
  - Optimistic store updates paired with automated rollbacks on API dispatch failure.

---

## 2. Canonical Architecture & Endpoint Registration Barrier

In accordance with architectural directives:
- **Canonical API Registration Authority:** apps/mobile/lib/api/client.ts registers this.civic = new CivicEndpoint(this.http) and this.politician = new PoliticianEndpoint(this.http).
- **Export & Singleton Barrier:** apps/mobile/lib/api/index.ts acts strictly as an export barrier and re-exports apiClient singleton, types, and endpoint interfaces.
- **Fail-Safe Authenticated Policy:** All 11 mutations default to auth: required using AuthManager.getAccessToken() which fails closed if unauthenticated.

---

## 3. Reconciled Manifest of 11 Authorized Mutations & 2 Blocked Operations

| # | Operation Name | Route | HTTP | Auth | Target Table / Mechanism | Mobile Client Binding | Store / DataService Caller | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | upvoteIssue | /api/v1/civic/issues/:id/upvote | POST | Yes | civic_issue_upvotes (upsert) | apiClient.civic.upvoteIssue(id) | supabaseDataService.upvoteIssue / civicStore.upvoteIssue | MIGRATED |
| 2 | removeUpvote | /api/v1/civic/issues/:id/upvote | DELETE | Yes | civic_issue_upvotes (delete) | apiClient.civic.removeUpvote(id) | supabaseDataService.removeUpvote / civicStore.removeUpvote | MIGRATED |
| 3 | followIssue | /api/v1/civic/issues/:id/follow | POST | Yes | civic_issue_followers (insert) | apiClient.civic.followIssue(id) | supabaseDataService.followIssue | MIGRATED |
| 4 | reportIssue | /api/v1/civic/issues | POST | Yes | civic_issues (insert) | apiClient.civic.reportIssue(payload) | supabaseDataService.reportIssue | MIGRATED |
| 5 | updateIssueStatus | /api/v1/civic/issues/:id/status | PATCH | Yes | civic_issues (update) | apiClient.civic.updateIssueStatus(id, s) | supabaseDataService.updateIssueStatus / civicStore.updateIssueStatus | MIGRATED |
| 6 | addIssueComment | /api/v1/civic/issues/:id/comments | POST | Yes | civic_issue_comments (insert) | apiClient.civic.addIssueComment(id, c) | supabaseDataService.addIssueComment / civicStore.addComment | MIGRATED |
| 7 | Event RSVP | /api/v1/politician/events/:id/rsvp | POST | Yes | event_rsvps (upsert) | apiClient.politician.rsvpEvent(id, s) | politicianPortalStore.rsvpEvent | MIGRATED |
| 8 | Survey Response | /api/v1/politician/surveys/:id/respond | POST | Yes | survey_responses (upsert) | apiClient.politician.respondSurvey(id, a) | politicianPortalStore.respondSurvey | MIGRATED |
| 9 | Bill Opinion | /api/v1/civic/bills/:id/opinion | POST | Yes | bill_opinions (upsert) | apiClient.civic.recordBillOpinion(id, s) | civicMetricsStore.supportBill / opposeBill | MIGRATED |
| 10 | RTI Filing | /api/v1/civic/rti | POST | Yes | rti_queries (insert) | apiClient.civic.fileRTI(payload) | civicMetricsStore.fileRTI | MIGRATED |
| 11 | RTI Upvote | /api/v1/civic/rti/:id/upvote | POST | Yes | rti_upvotes (upsert) | apiClient.civic.upvoteRTI(id) | civicMetricsStore.upvoteRTI | MIGRATED |
| - | Vote Manifesto Item | /api/v1/politician/manifestos/:id/items/:itemId/vote | POST | Yes | NONE | N/A | Fastify API fail-closed | BLOCKED (501) |
| - | Submit Grievance | /api/v1/politician/grievances | POST | Yes | NONE | N/A | Fastify API fail-closed | BLOCKED (501) |

---

## 4. Elimination of Deceptive Fallbacks

The following deceptive success mocks were eradicated from apps/mobile/lib/supabaseDataService.ts:
1. upvoteIssue: Removed if (!guard()) return true; bypass. Returns false and reports error via captureException.
2. removeUpvote: Removed unconfigured client silent true. Returns genuine boolean success.
3. followIssue: Removed unconfigured client silent true. Returns genuine boolean success.
4. reportIssue: Removed fabricated { success: true, id: local- + Date.now() }. Returns { success: false, id: null } on backend failure.
5. updateIssueStatus: Removed unconfigured client silent true. Now propagates real failure to callers.
6. addIssueComment: Removed fabricated { success: true, id: comment-local- + Date.now() }. Returns { success: false, id: null } on failure.

### Store Optimistic Update & Rollback Semantics:
- civicStore: On updateIssueStatus or addComment failure, previous state is immediately restored and honest error status is logged.
- civicMetricsStore: On supportBill, opposeBill, upvoteRTI, or fileRTI failure, optimistic count changes and prepended items are rolled back.
- politicianPortalStore: On rsvpEvent or respondSurvey failure, rsvpCount and user state are reverted.

---

## 5. Verification Results

### A. API Test Suite (apps/api/src/__tests__/civic-mutations.test.ts)
- 22/22 Tests Passing
- Authentication Enforcement (401): 11/11 routes reject unauthenticated requests.
- Fail-Closed on Unconfigured Database (503): Returns 503 DATABASE_UNAVAILABLE with zero simulated writes.
- Explicitly Blocked Operations (501): Manifesto vote and politician grievance return 501 PERSISTENCE_TARGET_UNAVAILABLE.
- Validation Guard Rejections (400): Schema violations strictly rejected before reaching handler.

### B. Mobile Integration Test Suite (apps/mobile/__tests__/api-strangler-b4.test.ts)
- 17/17 Tests Passing
- Canonical API Dispatching: Confirmed all 11 mutations route through apiClient.civic or apiClient.politician.
- Truthful Error Handling: Confirmed dataService returns false / { success: false, id: null } on backend error.
- Optimistic Rollback: Verified rollback mechanics in civicStore, civicMetricsStore, and politicianPortalStore.

### C. Regression Test Suites
- contracts.test.ts: 34/34 passing
- moderation.test.ts: 20/20 passing
- providers.test.ts: 17/17 passing
- apiClient.test.ts: 52/52 passing

### D. TypeScript Static Verification
- npm run build --prefix apps/api: 0 errors (clean compilation)
- npx tsc --noEmit -p apps/mobile/tsconfig.json: 0 errors (clean compilation)