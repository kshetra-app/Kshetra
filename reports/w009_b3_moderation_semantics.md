# W009-B3: Moderation Fail-Closed & Unavailable Semantics Report

**Job ID:** W009-B3
**Status:** IMPLEMENTED_TESTED_VERIFIED_SUBMITTED
**Defect Remediated:** DEF-004 (Moderation Fail-Closed & Semantic Distinction)
**Timestamp:** 2026-09-18T16:55:24.300Z
**Base Commit:** 09cbf4bf27eb677d3bdda93032c4491924ec417a
**Base Tree:** 4a649d4035825b92df8e191d8976bb68290c7dbe

---

## 1. Executive Summary

Under defect DEF-004, when external moderation encountered a network exception, timeout, or provider outage, the moderation service silently caught the error and fell back to returning flagged: false. Consequently, any content not flagged by minimal local regex was treated as compliant, introducing a silent moderation bypass whenever the external provider was unreachable.

Furthermore, network or infrastructure failure must never be represented to the user as a content violation, nor may it silently approve unverified content.

In W009-B3, the three distinct semantic outcomes are enforced:
1. **COMPLIANT:** HTTP 200, flagged: false
2. **PROHIBITED / FLAGGED:** HTTP 200, flagged: true
3. **MODERATION UNAVAILABLE:** HTTP 503, standard ApiErrorEnvelope with code MODERATION_UNAVAILABLE and message Content moderation service is temporarily unavailable

---

## 2. Changes Implemented

1. apps/api/src/services/contentModeration.ts: Defined ModerationUnavailableError, added timeout controller, mock hooks, and strict fail-closed exception throwing.
2. apps/api/src/routes/moderation.ts: Wrapped check-content route with try-catch returning HTTP 503 MODERATION_UNAVAILABLE on provider failure.
3. apps/api/src/__tests__/moderation.test.ts: Added TEST-W009-B3-01 through TEST-W009-B3-07.

---

## 3. Verification & Regressions

- **API Build:** tsc --noEmit completed with 0 errors.
- **Moderation Tests:** 19/19 passing (src/__tests__/moderation.test.ts).
- **Contract Tests:** 34/34 passing (src/__tests__/contracts.test.ts).
- **Provider Tests:** 17/17 passing (src/__tests__/providers.test.ts).
- **Scope Integrity:** 0 unauthorized product files modified. W009-B2 accepted files untouched. DB migrations untouched. Mobile untouched.
