# PANIN / KSHETRA
# MASTER IMPLEMENTATION PLAN: MILESTONE W051 (REVISION 1.0)
## B2B Political SaaS: API Customer Acquisition, Self-Service Onboarding, Key Lifecycle, Commercial Billing & Developer Portal

**Document Identifier:** `PLAN-W051-MASTER-REV-1.0.md`  
**Revision:** Rev 1.0 (Master Execution Track)  
**Milestone:** W051 — API Customer Acquisition (BIZ+BE)  
**Governing Authority:** Master Execution Framework Amendments v1.2–v1.6 / Rule IV-001  
**Accountable Owners:** BIZ + ARCH + BE + SEC + QA  
**Target Environment:** Staging Supabase (`fkpigozcqnmcvofuksar`) & Production Supabase (`ehfafcnimmjusyvplbah`)  
**Parent Architectural Baseline:** `PLAN-W021-MASTER-REV-1.0.md` (Commit `dcc9f22`), `PLAN-W022-REV-1.0.md` (Commit `686fcab`), DEC-166  
**Date:** 2026-10-29  
**Status:** `READY FOR IMPLEMENTATION`  

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
Milestones W021, W022, and JOB 023 established the canonical data schemas, statutory geography baseline (63,045 verified production entities), cryptographic API key authentication (`panin_live_sk_...`, `panin_test_sk_...`), rate limiting, outbound webhooks, and the Delimitation Watch Engine.

However, prior to Milestone W051, tenant organizations (`public.saas_tenants`), applications (`public.saas_applications`), and API keys (`public.saas_api_keys`) could only be provisioned manually through internal migrations and seeds. There was zero self-service developer onboarding, zero commercial payment checkout, and no public interactive developer documentation portal.

### 1.2 Core Objectives of Job W051
1. **Self-Service Partner Onboarding:** Deliver automated, self-service registration enabling civic developers, media organizations, researchers, and political campaign teams to register an organization, establish a tenant, create an application, and immediately receive a provisioned test API key.
2. **Cryptographic Key Lifecycle Management:** Expose secure endpoints for listing, creating, and revoking API keys with strict tenant isolation, scope enforcement, and tier-based active key limits.
3. **Commercial Subscription & Billing Engine:** Implement subscription tiers (Free, Pro, Enterprise), order/checkout session generation with payment providers (Razorpay / Stripe abstraction), payment signature verification, and inbound billing webhook processing to dynamically adjust tenant tiers and monthly quota ceilings.
4. **Usage Ledger & Billing Analytics:** Expose authenticated endpoints for partners to inspect their monthly quota consumption, remaining requests, and hourly usage trends from `public.saas_usage_ledger`.
5. **Interactive Developer Documentation Portal:** Serve the canonical OpenAPI 3.1 contract (`apps/api/openapi-saas-v1.yaml`) via `/api/vsaas/v1/openapi.json` and a clean, responsive, interactive documentation explorer at `/api/vsaas/v1/docs` with cURL/TypeScript code generation and header specifications.
6. **Zero Citizen PII & Security Invariant:** Strict adherence to data minimization—zero citizen personal information is accessible through customer acquisition endpoints.

---

## 2. Scope & Capability Matrix

| Domain Area | Capability | Scope Classification | Description |
|---|---|---|---|
| **Onboarding** | Public Partner Signup (`POST /api/vsaas/v1/auth/signup`) | **REQUIRED** | Self-service registration; provisions tenant, default application, and initial test key. |
| **API Keys** | List Keys (`GET /api/vsaas/v1/auth/keys`) | **REQUIRED** | Authenticated tenant key inventory with prefixes, hints, scopes, and last used timestamps. |
| **API Keys** | Create Key (`POST /api/vsaas/v1/auth/keys`) | **REQUIRED** | Generate 256-bit CSPRNG key; stores SHA-256 hash; one-time raw secret reveal. |
| **API Keys** | Revoke Key (`DELETE /api/vsaas/v1/auth/keys/:id`) | **REQUIRED** | Immediate key invalidation (`status = 'revoked'`). |
| **Billing** | Plan Catalog (`GET /api/vsaas/v1/billing/plans`) | **REQUIRED** | Public/partner catalog of tiers (Free, Pro, Enterprise), pricing, and quotas. |
| **Billing** | Checkout Session (`POST /api/vsaas/v1/billing/checkout`) | **REQUIRED** | Generates order / checkout session for Pro or Enterprise subscriptions. |
| **Billing** | Payment Verification (`POST /api/vsaas/v1/billing/verify`) | **REQUIRED** | Validates provider payment signatures and upgrades tenant tier. |
| **Billing** | Inbound Webhooks (`POST /api/vsaas/v1/billing/webhook`) | **REQUIRED** | Secure HMAC webhook receiver for subscription state transitions (renewals, cancellations). |
| **Usage** | Usage Analytics (`GET /api/vsaas/v1/account/usage`) | **REQUIRED** | Queries `public.saas_usage_ledger`; returns monthly totals and 24-hour hourly history. |
| **Documentation** | Interactive Docs UI (`GET /api/vsaas/v1/docs`) | **REQUIRED** | Embedded, responsive Swagger/Scalar interactive UI with Try-It-Out console. |
| **Documentation** | OpenAPI 3.1 Spec (`GET /api/vsaas/v1/openapi.json`) | **REQUIRED** | Dynamic JSON/YAML export of `apps/api/openapi-saas-v1.yaml`. |
| **Security** | Zero Citizen PII Guarantee | **INVARIANT** | Strictly excludes voter, citizen, or direct message data. |
| **Tenancy** | Composite Foreign Key Isolation | **INVARIANT** | Tenants can only view and manage their own resources. |

---

## 3. Architecture & Subsystem Design

```
 Prospective Partner / Client
           │
           ├── [1] POST /api/vsaas/v1/auth/signup (Self-service registration)
           │         │
           │         ▼
           │     saasOnboardingService
           │         ├── Insert into public.saas_tenants (tier: 'free', status: 'active')
           │         ├── Insert into public.saas_applications (env: 'test')
           │         └── generateCryptographicApiKey('test') -> public.saas_api_keys
           │
           ├── [2] API Key Management (Authenticated with SaaS Key)
           │         ├── GET  /api/vsaas/v1/auth/keys (Inspect key prefixes, hints, scopes)
           │         ├── POST /api/vsaas/v1/auth/keys (Generate 'live' or 'test' key)
           │         └── DELETE /api/vsaas/v1/auth/keys/:id (Revoke key)
           │
           ├── [3] Commercial Subscriptions & Billing
           │         ├── GET  /api/vsaas/v1/billing/plans (Free, Pro, Enterprise tiers)
           │         ├── POST /api/vsaas/v1/billing/checkout (Razorpay/Stripe session)
           │         ├── POST /api/vsaas/v1/billing/verify (Verify signature & upgrade tier)
           │         └── POST /api/vsaas/v1/billing/webhook (Inbound HMAC subscription events)
           │
           ├── [4] Usage & Quota Telemetry
           │         └── GET /api/vsaas/v1/account/usage (Aggregates public.saas_usage_ledger)
           │
           └── [5] Developer Portal & Documentation
                     ├── GET /api/vsaas/v1/docs (Interactive Swagger/Scalar API explorer)
                     └── GET /api/vsaas/v1/openapi.json (OpenAPI 3.1 Specification)
```

---

## 4. API Endpoints Specification

### 4.1 Onboarding & Authentication
- **`POST /api/vsaas/v1/auth/signup`**
  - **Body:** `{ name: string, email: string, organizationName: string, slug?: string, useCase?: string }`
  - **Validation:** Email format, organization name 2–100 chars, valid slug regex (`^[a-z0-9-]+$`).
  - **Response:**
    ```json
    {
      "success": true,
      "data": {
        "tenant": { "id": "...", "name": "...", "slug": "...", "tier": "free", "status": "active" },
        "application": { "id": "...", "name": "Default Test App", "environment": "test" },
        "apiKey": {
          "id": "...",
          "name": "Initial Test Key",
          "keyPrefix": "panin_test_sk_",
          "keyHint": "a1b2c3d4",
          "environment": "test",
          "scopes": ["geo:read", "elections:read", "entities:read", "delim:read"],
          "rawKey": "panin_test_sk_...",
          "notice": "Save this secret key immediately. It will not be shown again."
        }
      }
    }
    ```

### 4.2 Key Lifecycle Management (Authenticated via `x-api-key` or Bearer)
- **`GET /api/vsaas/v1/auth/keys`**
  - Returns list of keys belonging to the authenticated tenant.
  - Omit raw key secret; returns `keyPrefix`, `keyHint`, `environment`, `scopes`, `status`, `lastUsedAt`.
- **`POST /api/vsaas/v1/auth/keys`**
  - **Body:** `{ name: string, environment: 'live' | 'test', scopes?: string[] }`
  - Enforces tier key limits: Free (max 2), Pro (max 5), Enterprise (max 20).
  - Returns new key record with one-time `rawKey`.
- **`DELETE /api/vsaas/v1/auth/keys/:id`**
  - Revokes specified key for the authenticated tenant.

### 4.3 Billing & Monetization
- **`GET /api/vsaas/v1/billing/plans`**
  - Returns tier specifications: Free (10k req/mo, ₹0), Pro (500k req/mo, ₹4,999/mo), Enterprise (10M req/mo, ₹49,999/mo).
- **`POST /api/vsaas/v1/billing/checkout`**
  - **Body:** `{ targetTier: 'pro' | 'enterprise', billingCycle: 'monthly' | 'annual' }`
  - Generates payment order / session ID and returns checkout parameters.
- **`POST /api/vsaas/v1/billing/verify`**
  - **Body:** `{ orderId: string, paymentId: string, signature: string }`
  - Verifies cryptographic signature using payment provider secret.
  - Updates `saas_tenants.tier` and logs event in `metadata.billing`.
- **`POST /api/vsaas/v1/billing/webhook`**
  - Inbound webhook handler validating HMAC signature.
  - Updates subscription status (`active`, `suspended`, `cancelled`).

### 4.4 Usage & Account Telemetry
- **`GET /api/vsaas/v1/account/usage`**
  - Queries `public.saas_usage_ledger` for `hour_bucket >= start of current month`.
  - Returns current consumption, ceiling, percent consumed, and last 24-hour hourly series.

### 4.5 Developer Portal & OpenAPI Spec
- **`GET /api/vsaas/v1/openapi.json`** & **`GET /api/vsaas/v1/openapi.yaml`**
  - Serves OpenAPI 3.1 specification.
- **`GET /api/vsaas/v1/docs`**
  - Interactive HTML developer documentation with responsive UI, sandbox testing, and code generation.

---

## 5. Security, Invariants & Fail-Closed Guardrails

1. **Zero Citizen PII:** Under no circumstances shall customer acquisition or developer endpoints return citizen voter IDs, personal phone numbers, or private user messages.
2. **Cryptographic Integrity:** All API keys generated use `crypto.randomBytes(32)` (256-bit CSPRNG) encoded in RFC 4648 Base64URL (43 chars). Key hashes use SHA-256 with constant-time verification.
3. **Tenant Isolation:** All key management and usage endpoints filter strictly by `request.saasAuth.tenantId`. Cross-tenant data access is blocked fail-closed (403 Forbidden).
4. **Idempotent Webhooks:** Inbound billing webhooks track processed transaction IDs to prevent replay attacks and duplicate tier adjustments.
5. **Contract Drift Zero-Tolerance:** All new endpoints are explicitly documented in `apps/api/openapi-saas-v1.yaml` with automated schema validation tests.

---

## 6. Test Battery & Verification Strategy

- **Unit Tests:**
  - `saas-onboarding-validation.test.ts`: Signup input validation, slug normalization, collision handling.
  - `saas-crypto-keys.test.ts`: Key generation entropy, prefix compliance, constant-time verification.
  - `saas-billing-checkout.test.ts`: Checkout session creation, signature validation, tier transition logic.
- **Integration Tests:**
  - Fastify route integration tests testing signup, key creation, key revocation, usage querying, billing verification, and documentation rendering.
  - Verification of 401 Unauthorized for unauthenticated key endpoints and 403 Forbidden for cross-tenant access.
- **Contract Verification:**
  - OpenAPI 3.1 schema syntax and path validation ensuring 100% route-to-spec parity.

---

## 7. Definition of Done (DoD)

- [ ] `packages/shared/src/contracts/saas.ts` updated with onboarding, billing, and usage contracts.
- [ ] `apps/api/src/modules/saasOnboarding` module fully implemented (schemas, services, routes, docsHtml).
- [ ] Routes registered in `apps/api/src/server.ts`.
- [ ] `apps/api/openapi-saas-v1.yaml` updated with all W051 paths and components.
- [ ] Comprehensive test suite passing 100% (`npm test -- saas-onboarding`).
- [ ] `tsc --noEmit` passing across API and shared packages with 0 errors.
- [ ] Acceptance verification report generated and published.
