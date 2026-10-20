# KSHETRA W021.5 — CTO DIRECTIVE 117
## Test Isolation, Fixture Environment & Assertion Hardening Audit

**Directive:** CTO Directive 117 (Workstreams B & C)  
**Governing Authority:** Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance  
**Audited Scope:**  
- `apps/api/jest.config.js`
- `.github/workflows/ci.yml`
- `apps/api/src/__tests__/moderation.test.ts`
- `apps/api/src/__tests__/routes-stubs.test.ts`
- `apps/api/src/__tests__/dm-rate-limits.test.ts`
- `apps/api/src/__tests__/civic-mutations.test.ts`
- `apps/api/src/__tests__/w011-fail-closed.test.ts`
- `apps/api/src/__tests__/dm-unread-count.test.ts`
- `apps/api/src/routes/dm.ts`

---

## 1. Executive Summary

This audit independently validates the fixture environment, test isolation, and assertion hardness across all unit and contract tests in the API layer. 

Crucially, it addresses the vulnerability identified in Directive 117 Workstream B regarding `apps/api/src/routes/dm.ts`: a non-production fallback that returned `{ success: true, count: 0 }` when database queries failed. That fallback has been **completely eliminated** from the route handler, restoring fail-closed `500 DATABASE_ERROR` semantics in all environments. A dedicated 5-case regression suite (`apps/api/src/__tests__/dm-unread-count.test.ts`) and deterministic database mocking in `dm-rate-limits.test.ts` have been verified.

---

## 2. Fixture Environment & Test Isolation Audit

1. **Non-Production Fixture Credentials:**
   - URL: `https://test-fixture.supabase.co`
   - Key: Non-routable dummy JWT (`...dummy_signature_for_test_environment_only`)
   - Audit Result: Confirmed strictly isolated. These credentials cannot resolve or authenticate against production (`ehfafcnimmjusyvplbah`) or staging (`fkpigozcqnmcvofuksar`).
2. **State Leakage Elimination:**
   - In `civic-mutations.test.ts`, `moderation.test.ts`, and `dm-unread-count.test.ts`, `isSupabaseConfigured` is recorded before test execution and restored unconditionally in `afterAll` / `afterEach`.
   - Worker pollution across parallel Jest suites is prevented.
3. **Execution Order Independence:**
   - All suites pass independently and in arbitrary execution order.

---

## 3. DM Unread-Count Contract & Error Behavior Remediation

### The Vulnerability
During Directive 116, non-production fallbacks were introduced in `apps/api/src/routes/dm.ts`:
```typescript
if (process.env.NODE_ENV !== 'production') {
  return reply.send({ success: true, count: 0 });
}
```
This masked database query timeouts and errors during testing, falsely returning a successful zero unread badge instead of surfacing the error.

### The Remediation
1. Removed all `process.env.NODE_ENV !== 'production'` bypasses in `apps/api/src/routes/dm.ts`.
2. Any query failure on `conversations` or `messages` now strictly triggers `throw convError / countError` and logs a Fastify error before returning:
   ```json
   {
     "error": "Internal Server Error",
     "message": "Failed to retrieve unread count",
     "statusCode": 500,
     "code": "DATABASE_ERROR"
   }
   ```
3. Built `apps/api/src/__tests__/dm-unread-count.test.ts` to deterministically verify all 5 contract cases:
   - **Case 1 (Zero Unread):** `200 OK`, `{ success: true, count: 0 }` (PASS)
   - **Case 2 (Positive Unread):** `200 OK`, `{ success: true, count: 5 }` (PASS)
   - **Case 3 (Conversation Lookup Failure):** `500 DATABASE_ERROR`, count undefined (PASS)
   - **Case 4 (Message Count Query Failure):** `500 DATABASE_ERROR`, count undefined (PASS)
   - **Case 5 (Unconfigured Database):** `503 DATABASE_UNAVAILABLE`, count undefined (PASS)

---

## 4. Assertion Hardening Audit Table

| File | Location | Prior State | Hardened State | Behavioral Contract | Result |
| :--- | :---: | :--- | :--- | :--- | :---: |
| `moderation.test.ts` | Line 379 | `[200, 503].toContain` | `expect(200)` | Blocking another user succeeds | PASS |
| `moderation.test.ts` | Line 389 | `[200, 503].toContain` | `expect(200)` | Unblocking user succeeds | PASS |
| `moderation.test.ts` | Line 399 | `[200, 503].toContain` | `expect(200)` | Submitting verify-request succeeds | PASS |
| `routes-stubs.test.ts` | Multiple | `[200, 503].toContain` | `expect(200/404/501)` | Strict deterministic API contracts | PASS |
| `dm-rate-limits.test.ts`| Line 128 | Route fallback | Mocked query builder & `expect(200)` | GET /api/v1/dm/unread-count | PASS |
| `dm-unread-count.test.ts`| Cases 1-5| New suite | Strict 200, 500, 503 assertions | 5 distinct error & success paths | PASS |

**Total Permissive `[200, 503]` Assertions Remaining in Scope:** **0**
