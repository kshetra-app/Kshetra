# W009-B2 — Bounded Provider Abstraction Evidence Report

## 1. Executive Summary & Governance Coordinates

* **Job ID:** `W009-B2`
* **Job Title:** Bounded Provider Abstraction (Razorpay & Voice OBD)
* **Plan Version:** `PLAN-W009-MASTER-REV-2`
* **Authorized Baseline Commit:** `fb2fb4378b59f40050b803fb1388234cf7eb11a2`
* **Base Tree SHA:** `460459a9fa05f4c5e3170e43d9bf6c1ec588e3fa`
* **Status:** `IMPLEMENTED_TESTED_VERIFIED_SUBMITTED`
* **CTO Determination:** `CTO ACCEPTANCE PENDING`

---

## 2. Hard Scope & Immutability Verification

All modifications are strictly confined to the authorized boundary:
1. `apps/api/src/providers/types.ts` [NEW]: Core interfaces (`PaymentProvider`, `VoiceObdProvider`) and data models.
2. `apps/api/src/providers/razorpayProvider.ts` [NEW]: Concrete implementation of Razorpay order generation, HMAC verification, webhook verification, and fail-closed secret checks.
3. `apps/api/src/providers/telecomProvider.ts` [NEW]: Concrete implementation of Voice OBD dispatch, statutory TRAI calling window (08:00–21:00 IST), 10s carrier timeout, and delivery report parsing.
4. `apps/api/src/providers/mockProvider.ts` [NEW]: Test-only mock implementations equipped with anti-production security guards (`assertNotProduction`).
5. `apps/api/src/routes/campaign.ts` [MODIFIED]: Consumes `PaymentProvider` and `VoiceObdProvider` abstractions; zero contract drift.
6. `apps/api/src/routes/pages.ts` [MODIFIED]: Consumes `PaymentProvider` abstraction for Pro order generation and signature verification; zero contract drift.
7. `apps/api/src/__tests__/providers.test.ts` [NEW]: 17 test cases covering all B2 requirements.
8. `reports/w009_b2_provider_abstraction.json` [NEW] & `reports/w009_b2_provider_abstraction.md` [NEW]: Governance evidence artifacts.
9. `ACCEPTANCE_REGISTER.md` & `EXECUTION_STATE.md` [MODIFIED]: Synchronized governance state.

Zero modifications to:
- Mobile client code
- Database schemas or migrations
- Historical W000–W008 evidence
- Unrelated API route handlers

---

## 3. Test & Verification Evidence

### 3.1 TypeScript Typecheck & Compilation
- **Command:** `npm run build --prefix apps/api`
- **Result:** PASS (0 errors, exit code 0)

### 3.2 Provider Abstraction Test Suite
- **Command:** `npm test --prefix apps/api -- providers.test.ts`
- **Result:** 17/17 PASSED (100%)
  - `TEST-W009-B2-01a`: createOrder generates valid order structure and public key
  - `TEST-W009-B2-01b`: verifyPaymentSignature correctly verifies valid HMAC-SHA256 signature
  - `TEST-W009-B2-01c`: verifyWebhookSignature validates authentic webhook payloads
  - `TEST-W009-B2-02`: verifyPaymentSignature fails closed when `RAZORPAY_KEY_SECRET` is missing (500)
  - `TEST-W009-B2-03a`: verifyPaymentSignature rejects invalid signature (400)
  - `TEST-W009-B2-03b`: verifyPaymentSignature rejects empty or missing signature (400)
  - `TEST-W009-B2-04`: permits calling inside statutory TRAI window (08:00–21:00 IST)
  - `TEST-W009-B2-05`: rejects calling outside TRAI window (before 08:00 IST or at/after 21:00 IST)
  - `TEST-W009-B2-05b`: `POST /api/v1/campaign/obd/dispatch` rejects outside TRAI window with 400 `OUTSIDE_TRAI_WINDOW`
  - `TEST-W009-B2-06a`: parseDeliveryReport correctly parses answered, busy, unreachable, and IVR opt-outs
  - `TEST-W009-B2-06b`: validateWebhook validates structured request objects
  - `TEST-W009-B2-06c`: `POST /api/v1/webhooks/voice/exotel` validates webhook and parses delivery report
  - `TEST-W009-B2-07a`: `MockProvider` throws security violation if instantiated in production environment
  - `TEST-W009-B2-07b`: `MockVoiceObdProvider` simulated TRAI window and carrier timeout
  - `TEST-W009-B2-08a`: `POST /api/v1/pages/:pageId/pro/order` uses provider order structure
  - `TEST-W009-B2-08b`: `POST /api/v1/pages/:pageId/pro/verify` rejects invalid signature with 400
  - `TEST-W009-B2-08c`: `POST /api/v1/pages/:pageId/pro/verify` fails closed (500) if `RAZORPAY_KEY_SECRET` missing

### 3.3 Durable Recharge Security Regression Suite
- **Command:** `npx tsx scratch/test_durable_recharge_security.mjs`
- **Result:** 10/10 PASSED (100%)

### 3.4 API Route Contracts Test Suite
- **Command:** `npm test --prefix apps/api -- contracts.test.ts`
- **Result:** 34/34 PASSED (100%)

---

## 4. Operational Safety Declaration

* Staging database mutations: **0**
* Production database mutations: **0**
* Live external provider calls: **0**
* Downstream execution (W009-B3 through B5): **STOPPED**
* Current status: **CTO ACCEPTANCE PENDING**
