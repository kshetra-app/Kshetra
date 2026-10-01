# PLAN-W021-MASTER-REV-1.0: B2B POLITICAL SAAS & PUBLIC/PARTNER DEVELOPER API FOUNDATION
## Comprehensive Architectural Specification, Cryptographic Security Flow, Multi-Tenant Model, Data Contracts & Execution Gates
**Milestone:** W021  
**Revision:** 1.0 (Master Architectural Plan & Preflight Specification — Remediated per Final CTO Directive)  
**Date:** 2026-10-01  
**Authority:** Master Product Blueprint, AI Agent Master Execution Job Book, Amendments v1.2–v1.6, CTO Final Remediation Directive (PLAN-W021-MASTER-REV-1.0)  
**Status:** DRAFT / SUBMITTED FOR CTO RE-RATIFICATION  
**Implementation Authorization:** **STRICTLY NOT AUTHORIZED (PLANNING & PREFLIGHT SPECIFICATION ONLY)**  
**Target Environment:** Staging Supabase (`fkpigozcqnmcvofuksar`) & Local API Workspace  
**Production Boundary:** STRICTLY AIR-GAPPED & UNTOUCHED (`ehfafcnimmjusyvplbah`)  
**Frozen Geometry Baseline:** 589 rows, canonical digest `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`  

---

## 1. Executive Summary & Authorization Declaration

In accordance with the **W021-G1 CTO REMEDIATION DIRECTIVE (FINAL ROUND)**, this document establishes the authoritative, mathematically rigorous, implementation-ready architectural blueprint for Milestone **W021: B2B Political SaaS & Public/Partner Developer API Foundation**.

Milestone W020 is formally **CLOSED / COMPLETE** at canonical baseline `51dc383353f09db518c770ae1b4e2cf3b17f4177`.

```text
================================================================================
MILESTONE W021 MASTER IMPLEMENTATION PLAN — REVISION 1.0 (FINAL REMEDIATION)
AUTHORIZATION STATUS: PLANNING ONLY / SUBMITTED FOR CTO RE-RATIFICATION
================================================================================
PLAN STATUS:                         DRAFT / SUBMITTED FOR CTO RE-RATIFICATION
IMPLEMENTATION AUTHORIZATION:        STRICTLY NOT AUTHORIZED (NO)
CURRENT ACTIVE PHASE:                W021-G1 PLANNING ONLY
SUBSEQUENT GATES (W021-G2+):         STRICTLY NOT AUTHORIZED (GATED)
TARGET DATABASE:                     STAGING SUPABASE (fkpigozcqnmcvofuksar) ONLY
PRODUCTION DATABASE:                 STRICTLY AIR-GAPPED & UNTOUCHED (ehfafcnimmjusyvplbah)
W020 STATUS:                         ACCEPTED & CLOSED (Commit: 51dc383)
589 GEOMETRY BASELINE:               READ-ONLY & FROZEN (Digest: f839fa02...)
MIGRATION 056 STATUS:                SPECIFIED ONLY (ZERO MIGRATIONS CREATED/APPLIED)
CODE MUTATIONS AUTHORIZED:           ZERO (0)
DATABASE MIGRATIONS AUTHORIZED:      ZERO (0)
STOP STATE:                          YES — AWAITING FORMAL CTO RATIFICATION
================================================================================
```

---

## 2. Requirement Classification Taxonomy & Scope Inventory

Every architectural capability and boundary in W021 is classified under the mandatory 5-state governance taxonomy:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          REQUIREMENT CLASSIFICATION                         │
├──────────────────────────┬──────────────────────────────────────────────────┤
│ 1. REQUIRED              │ Essential to W021 core objective; must be        │
│                          │ implemented and verified within W021 gates.      │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ 2. PROPOSED              │ Architecturally defined design; pending explicit │
│                          │ review and ratification before implementation.   │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ 3. DEFERRED              │ Formally excluded from W021; scheduled for a     │
│                          │ specific named future milestone (e.g., W051).    │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ 4. EXCLUDED              │ Prohibited from W021 on security, safety, or     │
│                          │ boundary grounds; will not be built.             │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ 5. UNKNOWN / DECISION    │ Requires explicit CTO technical/product choice   │
│                          │ before implementation can proceed.               │
└──────────────────────────┴──────────────────────────────────────────────────┘
```

### 2.1 Scope Item Classification Matrix

| Domain Area | Capability / Feature | Classification | Rationale & Governing Boundary |
| :--- | :--- | :--- | :--- |
| **API Perimeter** | Dedicated Partner Namespace `/api/vsaas/v1/...` | **REQUIRED** | Strict physical routing separation from internal mobile API. |
| **API Perimeter** | Legacy Root Swagger Replacement | **EXCLUDED** | Internal mobile contracts in `openapi.yaml` must not be mingled with partner surface. |
| **Authentication** | Cryptographic API Key Model (`panin_live_sk_...`) | **REQUIRED** | 256-bit CSPRNG entropy encoded as 43 Base64URL chars with SHA-256 indexed seek. |
| **Authentication** | OAuth2 / OIDC Authorization Code Flow | **DEFERRED** | Deferred to enterprise SSO milestone (W051). API Key satisfies machine-to-machine integrations. |
| **Tenancy** | Organization & Application Isolation Model | **REQUIRED** | Foundation for multi-tenant billing, quotas, key management, and security boundaries. |
| **Tenancy** | Complex RBAC / SCIM Provisioning | **DEFERRED** | Two-Tier Membership (`admin`, `developer`) sufficient for W021. |
| **Metering** | Request Quota Counter (In-Memory Sliding Window) | **REQUIRED** | Real-time minute rate limit and quota enforcement returning standard 429 envelopes. |
| **Metering** | Hourly Usage Aggregation Ledger (`saas_usage_ledger`) | **REQUIRED** | Relational ledger for persistent historical usage accounting, auditability, and reconciliation. |
| **Metering** | Live Financial Ledger Billing Integration | **DEFERRED** | Deferred to commercial onboarding (W051). Staging handles test-tier limits only. ₹0 real money. |
| **External Surface**| Public Factual Electoral & Spatial Data | **REQUIRED** | Read-only delivery of normalized ECI contests, ACs, mandals, sitting tenures. |
| **External Surface**| Governed Delimitation Simulation Endpoint | **REQUIRED** | Export of Hare-Niemeyer simulations strictly bound to server-owned `PANIN_SCENARIO` metadata. |
| **External Surface**| Direct Citizen Personal Data / PII Export | **EXCLUDED** | PANIN architectural privacy boundary. W021 SHALL expose zero citizen personal-data fields. |
| **External Surface**| Partner Write/Mutation Endpoints | **EXCLUDED** | W021 Partner API is strictly READ-ONLY. Zero external mutation capability. |
| **Webhooks** | Outbound Event Dispatching & Signatures | **DEFERRED** | High operational footprint (retry queues, SSRF risk). Deferred to dedicated event milestone (W022). |
| **Contracts** | Authoritative OpenAPI 3.1 Document for SaaS | **REQUIRED** | Standalone `apps/api/openapi-saas-v1.yaml` with automated drift verification. |
| **Database** | Migration 056 (Tenants, Apps, Keys, Quota Ledger) | **REQUIRED** | Clean relational persistence model deployed strictly to Staging Supabase. |
| **Production** | Production DB (`ehfafcnimmjusyvplbah`) Deployment | **EXCLUDED** | 100% Air-gapped. Zero production mutations during W021. |

---

## 3. Product & API Boundary Architecture

### 3.1 Supported Consumers & Personas
W021 serves four distinct external institutional consumer personas:
1. **Media & Editorial Organizations:** Real-time lookup of official election results, candidate margins, demographic profiles, and past winners.
2. **Political Research & Think Tanks:** Computational query of historical delimitation orders, boundary transitions, and seat allocation quotas under Article 170.
3. **Civic Tech & Educational Developers:** Integration of non-partisan constituency metadata, representative contact offices, and geographic hierarchy.
4. **Institutional Campaign Analytics (B2B SaaS):** Programmatic ingestion of normalized constituency demographic aggregates (Census 2011).

### 3.2 Canonical Namespace Separation
* **Internal Mobile / Consumer Surface:** `/api/v1/...` (Unchanged, served for Expo React Native client).
* **Internal Admin & Diagnostic Surface:** `/api/health`, `/api/metrics`, `/api/debug` (Privileged tokens).
* **Authoritative Partner & B2B SaaS Namespace:** **`/api/vsaas/v1/...`**
  * *Architectural Justification:* Evaluated against `/api/developer/v1/...`. Selected `/api/vsaas/v1/` because it explicitly mirrors the dual commercial identity of Kshetra/PanIN as both a political SaaS intelligence provider and programmatic data partner. It guarantees absolute isolation in Fastify route registration and reverse proxy rules (e.g. Envoy/Cloudflare routing policies).

### 3.3 Endpoint Families & Information Classification

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL API SURFACE FAMILIES                      │
├───────────────────────────────┬──────────────────────┬──────────────────────┤
│ Endpoint Family               │ Classification       │ Provenance & Notice  │
├───────────────────────────────┼──────────────────────┼──────────────────────┤
│ 1. Geography & Hierarchy      │ Public Factual       │ STATUTORY_FACT       │
│    `/api/vsaas/v1/geo/...`    │ (Census / LGD)       │ ECI Schedule XXXI    │
├───────────────────────────────┼──────────────────────┼──────────────────────┤
│ 2. Normalized Elections       │ Public Factual       │ STATUTORY_FACT       │
│    `/api/vsaas/v1/elections/..│ (ECI Form 20/21E)    │ ECI Official Gazette │
├───────────────────────────────┼──────────────────────┼──────────────────────┤
│ 3. Canonical Political Entity │ Public Factual       │ STATUTORY_FACT       │
│    `/api/vsaas/v1/entities/.. │ (Gazetted Tenures)   │ Assembly Secretariats│
├───────────────────────────────┼──────────────────────┼──────────────────────┤
│ 4. Delimitation Regimes       │ Public Factual       │ STATUTORY_FACT       │
│    `/api/vsaas/v1/delim/reg.. │ (1976 / 2008 Orders) │ Delimitation Orders  │
├───────────────────────────────┼──────────────────────┼──────────────────────┤
│ 5. Delimitation Scenarios     │ Governed Simulation  │ PANIN_SCENARIO       │
│    `/api/vsaas/v1/delim/sim.. │ (Hamilton Algorithm) │ Server-Owned Notice  │
└───────────────────────────────┴──────────────────────┴──────────────────────┘
```

---

## 4. API Key Architecture & Cryptographic Construction

### 4.1 Canonical 256-Bit Entropy Construction & Base64URL Encoding
In response to Final CTO Directive Item 1, to eliminate ad-hoc, ambiguous, or non-injective Base62 formulations, the API key secret encoding is authoritatively specified using **RFC 4648 Base64URL (URL and Filename Safe Alphabet, Unpadded)**:

1. **Target Entropy:** **Exactly 256 bits of cryptographic entropy**.
2. **CSPRNG Source:** Node.js `crypto.randomBytes(32)` generating 32 raw bytes (256 bits) from the operating system's cryptographic entropy pool.
3. **Encoding Definition (RFC 4648 §5 Base64URL Unpadded):**
   * Standard alphabet: `A-Z`, `a-z`, `0-9`, `-`, `_` (64 symbols).
   * Exact bit calculation: $32 \text{ bytes} \times 8 \text{ bits/byte} = 256 \text{ bits}$.
   * Under Base64 encoding: $\lceil 256 / 6 \rceil = 43 \text{ characters}$ (with 2 trailing padding bits: $43 \times 6 = 258 \text{ bits}$).
   * In unpadded Base64URL, the trailing `=` padding is stripped, yielding an **exact, immutable fixed width of 43 characters**.
   * **Injective & Bijective Guarantee:** The mapping between the 32 raw bytes and the 43 unpadded Base64URL characters is completely deterministic, canonical, bijective, preserves leading zeroes losslessly, and guarantees zero truncation across all $2^{256}$ states.
4. **Resulting Displayed Secret Format:**
   ```text
   panin_{environment}_{keyType}_{secret43}
   ```
   * **Production Live Key:** `panin_live_sk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` (14-char prefix + 43 Base64URL chars = 57 chars total).
   * **Staging / Test Key:** `panin_test_sk_YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY` (14-char prefix + 43 Base64URL chars = 57 chars total).
5. **Key Anatomy Breakdown:**
   * Prefix: `panin_live_sk_` or `panin_test_sk_` (14 characters). Enables automated regex secret scanning, environment matching, and credential classification.
   * Key Hint: First 8 characters of the 43-character Base64URL string (e.g. `XXXXXXXX`). Stored in plaintext in the database solely to allow developer identification in management consoles (e.g. `panin_live_sk_XXXXXXXX...`).
   * Secret Entropy: The complete 32 raw bytes (256 bits) preserved in the 43 Base64URL characters.

### 4.2 Complete SHA-256 API-Key Security Flow

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       API KEY GENERATION & STORAGE FLOW                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. GENERATE:  raw_bytes = crypto.randomBytes(32)  // exactly 256 bits       │
│               secret_payload = raw_bytes.toString('base64url')  // 43 chars │
│               raw_api_key = "panin_" + env + "_sk_" + secret_payload        │
│                                                                             │
│ 2. DERIVE:    key_hint = secret_payload.substring(0, 8)  // 8 chars         │
│               key_hash = crypto.createHash('sha256')                        │
│                                .update(raw_api_key, 'utf8')                 │
│                                .digest('hex')  // 64-char hex string        │
│                                                                             │
│ 3. STORE:     INSERT INTO saas_api_keys                                     │
│                 (tenant_id, app_id, key_prefix, key_hint, key_hash, status) │
│               VALUES (..., 'panin_live_sk_', key_hint, key_hash, 'active'); │
│                                                                             │
│ 4. DISPLAY:   raw_api_key displayed to developer EXACTLY ONCE.             │
│               raw_api_key is NEVER written to DB, disk, or logs.            │
└─────────────────────────────────────────────────────────────────────────────┘
```

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    API KEY INBOUND AUTHENTICATION FLOW                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. EXTRACT:   incoming_key = req.headers['x-api-key'] ||                    │
│                              req.headers.authorization?.replace('Bearer ','')│
│                                                                             │
│ 2. VALIDATE:  Check format: /^panin_(live|test)_sk_[0-9a-zA-Z_-]{43}$/      │
│               If invalid -> Fail closed: 401 Unauthorized (ECC-001)         │
│                                                                             │
│ 3. HASH:      incoming_hash = crypto.createHash('sha256')                   │
│                                     .update(incoming_key, 'utf8')           │
│                                     .digest('hex')                          │
│                                                                             │
│ 4. LOOKUP:    Indexed B-Tree Seek in PostgreSQL:                            │
│               SELECT * FROM saas_api_keys                                   │
│               WHERE key_hash = incoming_hash AND status = 'active';         │
│               * B-Tree index traversal depends on key tree location and is  │
│                 NOT constant-time; leaks 0 info because hash is random.     │
│                                                                             │
│ 5. VERIFY:    If candidate row found:                                       │
│               stored_hash_buf = Buffer.from(row.key_hash, 'utf8');          │
│               computed_hash_buf = Buffer.from(incoming_hash, 'utf8');       │
│               is_valid = crypto.timingSafeEqual(stored_hash_buf,            │
│                                                 computed_hash_buf);         │
│               If !is_valid -> Fail closed: 401 Unauthorized                 │
│                                                                             │
│ 6. CONTEXT:   Check expiration (expires_at > NOW()).                        │
│               Check environment matches server deployment mode.             │
│               Inject request.tenant = { tenantId, appId, keyId, scopes }.   │
│               Asynchronously update last_used_at timestamp.                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Key Revocation, Expiration & Failure Handling
* **Revocation:** Update `status = 'revoked', revoked_at = NOW()`. Subsequent lookups filter on `status = 'active'`, failing immediately.
* **Compromise Mitigation:** Update `status = 'compromised'`. Any cached memory tokens are flushed.
* **Expiration:** If `expires_at IS NOT NULL AND expires_at < NOW()`, authentication returns `401 Unauthorized` with code `API_KEY_EXPIRED`.
* **Authentication Failure Behavior:**
  * Returns `401 Unauthorized` with `ECC-001` envelope.
  * Message: `"Invalid or inactive API key provided."` (Generic, zero leakage of whether key exists, has expired, or is revoked).
  * Fast exit: Zero tenant query or upstream processing executed.

---

## 5. Multi-Tenant Architecture & RLS / Service-Role Security Model

### 5.1 Clear Separation of Gateway Mediation vs PostgreSQL RLS
In response to Final CTO Directive Item 3, the security model explicitly distinguishes between gateway authentication, service-role capabilities, and PostgreSQL Row Level Security:

1. **Fastify Privileged Database Access (`service_role` Principal):**
   * The Fastify API gateway connects to PostgreSQL using the dedicated `service_role` credentials.
   * *BYPASSRLS Behavior:* In Supabase/PostgreSQL, the `service_role` user possesses the `BYPASSRLS` attribute. Therefore, **PostgreSQL RLS policies are NOT the mechanism that isolates tenants during Fastify API request handling**. It is architecturally false to claim that RLS policies isolate tenants when queried via `service_role`.
2. **Gateway-Level Tenant Context Derivation:**
   * Tenant isolation in the API gateway is enforced by **strict programmatic parameter binding**:
     * Inbound requests present only an API key.
     * The gateway resolves the API key to exactly one `(tenant_id, application_id)` tuple.
     * **Caller-Controlled `tenant_id` Prohibition:** External clients are strictly prohibited from providing or overriding a `tenant_id` parameter in headers, query strings, or request bodies. Any client-supplied tenant identifier is rejected or discarded.
     * All subsequent database queries executed on behalf of that tenant explicitly parameterize `WHERE tenant_id = resolved_tenant_id`.
3. **Role of PostgreSQL RLS Policies:**
   * RLS policies on `saas_tenants`, `saas_applications`, `saas_api_keys`, and `saas_usage_ledger` exist strictly to:
     * Prevent unauthorized access if a future developer console connects via standard authenticated JWT (`authenticated` role).
     * Enforce defense-in-depth across direct PostgREST or Supabase Studio connections.
     * Ensure that the `anon` and `authenticated` roles have `REVOKE ALL` permissions by default, preventing any public enumeration of tenant accounts or API keys.
4. **Gateway Compromise Boundary:**
   * The gateway operates within a hardened perimeter. Because it holds `service_role` credentials, gateway processes must be strictly partitioned:
     * Partner SaaS routes are purely read-only queries against public tables.
     * Internal management/admin routes are physically separated and protected by privileged bypass secrets.

```mermaid
erDiagram
    SAAS_TENANTS ||--o{ SAAS_APPLICATIONS : owns
    SAAS_APPLICATIONS ||--o{ SAAS_API_KEYS : issues
    SAAS_TENANTS ||--o{ SAAS_USAGE_LEDGER : records

    SAAS_TENANTS {
        uuid id PK
        text name
        text slug UK
        text tier "free | pro | enterprise"
        text status "active | suspended | revoked"
        text contact_email
        jsonb metadata
        timestamptz created_at
        timestamptz updated_at
    }

    SAAS_APPLICATIONS {
        uuid id PK
        uuid tenant_id FK
        text name
        text environment "live | test"
        timestamptz created_at
    }

    SAAS_API_KEYS {
        uuid id PK
        uuid tenant_id FK
        uuid application_id FK
        text name
        text key_prefix
        text key_hint
        text key_hash UK
        text_array scopes
        text status "active | revoked | compromised"
        timestamptz expires_at
        timestamptz last_used_at
        timestamptz created_at
    }

    SAAS_USAGE_LEDGER {
        uuid id PK
        uuid tenant_id FK
        uuid api_key_id FK_NULLABLE
        timestamptz hour_bucket
        int request_count
        int error_count
    }
```

---

## 6. Usage Ledger Architecture & Retention Semantics

### 6.1 Dual-Mechanism Usage & Rate Control
* **Synchronous Layer (Real-Time Enforcement):** Fastify in-memory token-bucket / sliding-window rate limiter clamps burst rates per minute and enforces monthly ceiling limits with sub-millisecond response. Exceeded thresholds return `429 Too Many Requests`.
* **Asynchronous Layer (`saas_usage_ledger`):** **Classified as REQUIRED in W021.** Records hourly aggregated consumption per tenant and API key.

### 6.2 Immutable Usage Ledger Retention Semantics
In response to Final CTO Directive Item 4, the relationship between API key lifecycle and usage accounting is formally decoupled to prevent silent destruction of historical evidence:

1. **Normal API Key Revocation (Soft-State):**
   * Revoking an API key updates `status = 'revoked', revoked_at = NOW()`.
   * **Zero physical deletion:** The API key row remains permanently in `saas_api_keys`.
   * All historical usage records in `saas_usage_ledger` referencing that `api_key_id` remain intact and linked.
2. **Physical Deletion Handling (`ON DELETE SET NULL`):**
   * If an API key row is ever physically purged (e.g. regulatory scrub), `saas_usage_ledger.api_key_id` is defined with **`ON DELETE SET NULL`** (replacing the previous flawed `CASCADE`).
   * *Audit Continuity:* The usage ledger record is **NEVER deleted**. It retains `tenant_id`, `hour_bucket`, `request_count`, and `error_count`, ensuring tenant consumption totals, invoicing records, and audit logs remain mathematically complete and immutable.
3. **Tenant & Application Deletion Boundaries:**
   * A tenant row cannot be deleted if active billing records exist. If an application is deleted, its historical usage ledger entries retain `tenant_id` and have `api_key_id` set to `NULL`.
   * **Retention Policy:** `saas_usage_ledger` records are retained for a minimum of **7 years** to comply with statutory accounting and audit trail requirements.

---

## 7. Canonical Provenance Enum Reconciliation & Server-Owned Model

### 7.1 Provenance Enum Reconciliation Against Source-of-Truth
In response to Final CTO Directive Item 2, the delimitation provenance metadata is reconciled against the existing canonical shared contracts in `packages/shared/src/contracts/delimitation.ts`:

* **`DelimitationAuthorityLayer` (Canonical):**
  * `CURRENT_OPERATIVE_LAW` | `HISTORICAL_FACT` | `STATUTORY_CONDITIONAL` | `PROPOSED_LEGISLATIVE` | **`PANIN_SCENARIO`**
  * For all non-official simulations: **`authorityLayer: "PANIN_SCENARIO"`**.
* **`DelimitationComputationalType` (Canonical):**
  * The canonical enum exports:
    * `PRIMARY_GAZETTED_ORDER`
    * `DETERMINISTIC_BENCHMARK`
    * **`ACADEMIC_SIMULATION`** (Canonical algorithmic redistribution: Hare-Niemeyer / Expansion-Safe)
    * `HEURISTIC_ESTIMATE`
  * *Correction:* The previous draft token `DETERMINISTIC_DERIVED` was an unratified deviation. W021 formally reconciles with the existing canonical enum: **`computationalType: "ACADEMIC_SIMULATION"`**.
* **`DelimitationLegalRegime` (Canonical):**
  * `HISTORICAL_LEGAL_REGIME` | `CURRENT_LEGAL_REGIME` | `FUTURE_ANTICIPATED_REGIME` | **`SCENARIO_PROPOSED_REGIME`**
  * For simulations: **`legalStatus: "SCENARIO_PROPOSED_REGIME"`**.

### 7.2 Server-Owned Provenance Architecture
In response to Final CTO Directive Item 5, the architecture guarantees that **provenance is derived and owned strictly by PANIN server-side**:

1. **Client Parameter Prohibition:**
   * External callers calling `/api/vsaas/v1/delimitation/simulate/:stateCode` CANNOT submit:
     * `authorityLayer`
     * `computationalType`
     * `officialDelimitationOrder`
     * `scenarioStatus`
     * `statutoryDisclaimer`
   * Fastify input validation schemas enforce strict parameter whitelisting. Any client attempt to inject or override provenance attributes is rejected with `400 Bad Request (SCENARIO_INPUT_FORBIDDEN)`.
2. **Server-Side Construction:**
   * The internal delimitation domain service constructs the immutable provenance block:
     ```json
     {
       "provenance": {
         "authorityLayer": "PANIN_SCENARIO",
         "computationalType": "ACADEMIC_SIMULATION",
         "officialDelimitationOrder": false,
         "governingInstrument": "PANIN Algorithmic Simulation (Article 170 Framework)",
         "constitutionalBasis": "Article 170(1)",
         "legalStatus": "SCENARIO_PROPOSED_REGIME",
         "sourceReference": "Census 2011 Primary Census Abstract (RGI)",
         "effectiveVersion": "2026-PANIN-SIM-V1",
         "generatedAt": "2026-10-01T22:05:00.000Z",
         "statutoryDisclaimer": "This projection is a research simulation based on Census 2011 data and mathematical modeling. It does NOT represent an official order, draft proposal, or gazette notification of the Delimitation Commission of India or the Election Commission of India."
       }
     }
     ```
3. **Response Serializer Verification (Fail-Closed):**
   * The Fastify response serialization hook asserts the server-constructed provenance block before emitting bytes to the network:
     * If `officialDelimitationOrder !== false` on a scenario route $\rightarrow$ throws `500 INTERNAL_PROVENANCE_ERROR`.
     * If `authorityLayer !== 'PANIN_SCENARIO'` $\rightarrow$ throws `500 INTERNAL_PROVENANCE_ERROR`.

---

## 8. Privacy & DPDP Compliance Boundary

* **Architectural Privacy Mandate:**
  * **W021 SHALL expose zero citizen personal-data fields through the external SaaS API.**
  * *Boundary Statement:* This is a PANIN architectural and privacy boundary established to enforce data minimization, eliminate personal data leakage, and ensure clean tenant isolation. This technical constraint is not, by itself, a complete legal determination of DPDP applicability, which remains subject to formal human legal counsel review under Job W051.5.
* **Prohibited Data Surfaces:**
  * Zero citizen mobile numbers, emails, names, photos, or passwords.
  * Zero direct messages (`dm_conversations`, `dm_messages`).
  * Zero citizen grievance reports or personal issue submissions.
  * Only aggregated, non-personal public election data, statutory gazettes, and demographic totals are exported.

---

## 9. Billing & Provider Integration Architecture

* **Staging Billing Entities:**
  * `user_subscriptions` (Migration 020)
  * `campaign_recharge_orders` (Migration 035)
  * `page_pro_orders` (Migration 037)
* **Provider Abstraction:** `apps/api/src/providers/razorpayProvider.ts` implementing `PaymentProvider`.
* **W021 Boundary:**
  * **Zero Real Money:** All billing integration in W021 is decoupled from live settlements.
  * Staging tenants are assigned static tiers (`free`, `pro`, `enterprise`) via admin seeds for verification.
  * Automated payment gateway checkout flows for external SaaS clients are **DEFERRED to W051**.

---

## 10. Webhooks Architectural Evaluation

* **Architectural Determination:** **DEFERRED TO W022 / DEDICATED EVENT MILESTONE.**
* **Justification:**
  * Outbound webhook infrastructure requires robust queue persistence (Redis / BullMQ / pg-boss), exponential backoff workers, HMAC-SHA256 request signing, replay defense, and anti-SSRF IP filtering (blocking internal VPC 10.x/192.168.x address ranges).
  * Coupling outbound webhooks into W021 would expand scope uncontrollably and compromise the stability of the core REST API surface.
  * W021 focuses exclusively on the inbound Partner REST API Foundation.

---

## 11. Authoritative OpenAPI 3.1 Strategy

* **Current Reality:** `apps/api/openapi.yaml` is a legacy Phase-1 file (474 lines) describing prototype seed endpoints.
* **W021 Strategy:**
  1. Do NOT mutate or corrupt the internal `apps/api/openapi.yaml`.
  2. Create a dedicated, standalone OpenAPI 3.1 specification: **`apps/api/openapi-saas-v1.yaml`**.
  3. Formulate an automated contract-drift test (`tests/saas-api-contract-drift.test.mjs`) verifying 100% parity between Fastify route definitions under `/api/vsaas/v1/...` and the SaaS OpenAPI document.

---

## 12. Performance & Abuse Budget

| Metric | Target / Ceiling | Measurement Method |
| :--- | :--- | :--- |
| **API Key Lookup & Auth** | **P95 < 3.0 ms** | Fastify `preHandler` timer on PostgreSQL indexed query. |
| **Public Factual Read (Cache Hit)** | **P95 < 10.0 ms** | Fastify in-memory state/candidate dictionary lookup. |
| **Public Factual Read (DB Seek)** | **P95 < 30.0 ms** | Upstream database execution time. |
| **Delimitation Scenario Simulation** | **P95 < 50.0 ms** | In-memory Hare-Niemeyer allocation engine. |
| **Concurrency Ceiling** | **50 Concurrent Connections** | Zero memory leaks, zero event-loop blocking (> 50 ms). |
| **Heap Memory Stability** | **RSS Delta < 15.0 MB** | Verified under 500 consecutive partner queries. |

---

## 13. Detailed Database Entity Architecture (Migration 056 Candidate)

*Note: This section defines the architectural blueprint for Migration 056. No migration file is created or executed during G1.*

### 13.1 Entity Model & Integrity Specifications

```sql
-- DDL ARCHITECTURAL SPECIFICATION (CANDIDATE FOR W021-G2)

-- 1. SaaS Partner Tenants
CREATE TABLE IF NOT EXISTS public.saas_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  contact_email TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_saas_tenants_slug UNIQUE (slug),
  CONSTRAINT chk_saas_tenants_tier CHECK (tier IN ('free', 'pro', 'enterprise')),
  CONSTRAINT chk_saas_tenants_status CHECK (status IN ('active', 'suspended', 'revoked'))
);

CREATE INDEX idx_saas_tenants_status ON public.saas_tenants(status);

-- 2. Developer Applications
CREATE TABLE IF NOT EXISTS public.saas_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'test',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_saas_applications_env CHECK (environment IN ('live', 'test'))
);

CREATE INDEX idx_saas_applications_tenant ON public.saas_applications(tenant_id);

-- 3. API Keys
CREATE TABLE IF NOT EXISTS public.saas_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.saas_applications(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hint TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['geo:read', 'elections:read']::TEXT[],
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_saas_api_keys_hash UNIQUE (key_hash),
  CONSTRAINT chk_saas_api_keys_status CHECK (status IN ('active', 'revoked', 'compromised'))
);

CREATE INDEX idx_saas_api_keys_lookup ON public.saas_api_keys(key_hash) WHERE status = 'active';
CREATE INDEX idx_saas_api_keys_tenant ON public.saas_api_keys(tenant_id);

-- 4. Hourly Usage Aggregation Ledger (Audited Retention: ON DELETE SET NULL)
CREATE TABLE IF NOT EXISTS public.saas_usage_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.saas_tenants(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES public.saas_api_keys(id) ON DELETE SET NULL,
  hour_bucket TIMESTAMPTZ NOT NULL,
  request_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_saas_usage_bucket UNIQUE (tenant_id, api_key_id, hour_bucket)
);

CREATE INDEX idx_saas_usage_ledger_tenant ON public.saas_usage_ledger(tenant_id, hour_bucket DESC);
```

### 13.2 Row Level Security Architecture
```sql
-- RLS Activation on All New Entities
ALTER TABLE public.saas_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_usage_ledger ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.saas_tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.saas_applications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.saas_api_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE public.saas_usage_ledger FORCE ROW LEVEL SECURITY;

-- Service role retains full administrative access
CREATE POLICY "service_role_all_saas_tenants" ON public.saas_tenants
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_saas_applications" ON public.saas_applications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_saas_api_keys" ON public.saas_api_keys
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_saas_usage_ledger" ON public.saas_usage_ledger
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Revoke all direct public/anon access
REVOKE ALL ON public.saas_tenants FROM anon, authenticated, public;
REVOKE ALL ON public.saas_applications FROM anon, authenticated, public;
REVOKE ALL ON public.saas_api_keys FROM anon, authenticated, public;
REVOKE ALL ON public.saas_usage_ledger FROM anon, authenticated, public;
```

---

## 14. Bounded Gate Decomposition (W021-G1 to W021-G6)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          W021 GATE DECOMPOSITION                            │
├─────────┬───────────────────────────────────┬───────────────────────────────┤
│ Gate    │ Scope & Objective                 │ Acceptance Criteria           │
├─────────┼───────────────────────────────────┼───────────────────────────────┤
│ W021-G1 │ Master Architecture Plan (This)   │ Ratified PLAN-W021-MASTER     │
├─────────┼───────────────────────────────────┼───────────────────────────────┤
│ W021-G2 │ Staging Migration 056 & Preflight │ DDL verified on staging;      │
│         │ Schema & Relational Integrity     │ RLS active; zero prod touch   │
├─────────┼───────────────────────────────────┼───────────────────────────────┤
│ W021-G3 │ Authentication & Middleware Engine│ Fastify plugin; SHA-256 hash  │
│         │ API Keys & Rate Limiter           │ lookup; 401/429 envelopes     │
├─────────┼───────────────────────────────────┼───────────────────────────────┤
│ W021-G4 │ Core Public SaaS Surface          │ `/api/vsaas/v1/...` routes;   │
│         │ Elections, Geo & Delimitation     │ Provenance metadata verified  │
├─────────┼───────────────────────────────────┼───────────────────────────────┤
│ W021-G5 │ Authoritative OpenAPI 3.1 & Drift │ `openapi-saas-v1.yaml` parity │
│         │ Contract Invariance Battery       │ Zero drift against Fastify    │
├─────────┼───────────────────────────────────┼───────────────────────────────┤
│ W021-G6 │ Security Probes, Master Battery   │ Full regression battery;      │
│         │ & CTO Acceptance Dossier          │ Audit dossier generated       │
└─────────┴───────────────────────────────────┴───────────────────────────────┘
```

*Governance Rule:* **No gate authorizes the next gate. Each gate requires explicit CTO review and ratification before subsequent execution.**

---

## 15. UNKNOWN / UNAVAILABLE Evidence

1. **Enterprise SSO / IdP Federation:** Not evidenced; deferred to W051.
2. **Real Money Commercial Billing API:** ₹0 real money transacted; commercial payment checkout deferred to W051.
3. **WAN PostgREST Environment Constraint:** Staging PostgREST P95 WAN latency remains subject to CTO Environmental Exception (DEC-107).

---

## 16. Implementation Authorization Declaration

* **Current Status:** `W021-G1 — PLAN COMPLETE / SUBMITTED FOR CTO RE-RATIFICATION`
* **Implementation State:** **STRICTLY NOT AUTHORIZED.**
* Zero lines of application code altered.
* Zero migrations created.
* Zero database queries or modifications executed.
* Staging and production databases remain 100% clean and untouched.
