# PANIN / KSHETRA
# IMPLEMENTATION PLAN: MILESTONE W022 (REVISION 4 — CTO RATIFIED)
## Outbound Webhooks & Event Dispatching Engine (Architecture, Security, State Transitions & Queue Specification)

**Document Identifier:** `PLAN-W022-REV-1.0.md`  
**Revision:** Rev 4.0 (CTO Ratification and Prospective Implementation Authorization, 2026-10-25)  
**Milestone:** W022 — Dedicated Outbound Event / Webhooks Engine  
**Governing Authority:** Master Execution Framework Amendment v1.5 (`AMENDMENT_v1.5.md`) & Amendment v1.5-A (`AMENDMENT_v1.5-A.md`)  
**Authorization Directive:** `CTO_DIRECTIVE_W022_IMPLEMENTATION_AUTHORIZATION_2026-10-25.md` (authorization commit `39d0b680b7d266e73385edbbb96caff61e23d184`), together with historical W022 planning directives  
**Status:** `CTO RATIFIED — IMPLEMENTATION PERMITTED PROSPECTIVELY WITHIN APPROVED SCOPE`  
**Parent Baseline Commit:** `d93954a857b6e2d36d882534abdf7efdc1e2757e`  
**Parent Architectural Baseline:** `PLAN-W021-MASTER-REV-1.0.md` (Commit `dcc9f22` / `b51fe20`)  
**Date of Revision:** 2026-10-24  
**Lifecycle State:** `IMPLEMENTATION AUTHORIZED — INDEPENDENT VERIFICATION AND ACCEPTANCE PENDING`  

---

## 1. Document Title & Metadata

* **Milestone ID:** `W022`
* **Milestone Title:** B2B SaaS Outbound Webhooks & Event Dispatching Engine
* **Parent Milestone:** W021 (B2B Political SaaS & Public/Partner Developer API Foundation)
* **Author / Submitter:** AI Autonomous Agent (Engineering & Architecture)
* **Designated Plan Reviewer:** CTO Executive Office / Architecture Review Board
* **Document Status:** `REVISION 4 — CTO RATIFIED FOR PROSPECTIVE IMPLEMENTATION`
* **Implementation Permission:** `PERMITTED PROSPECTIVELY WITHIN THIS PLAN AND CTO DIRECTIVE; STAGING DB EXECUTION AND PRODUCTION ACCESS REMAIN PROHIBITED WITHOUT SEPARATE AUTHORIZATION`
* **Air-Gap Boundary:** Production Supabase (`ehfafcnimmjusyvplbah`) **STRICTLY AIR-GAPPED** (0 queries, 0 mutations).
* **Target Staging Environment:** Staging Supabase (`fkpigozcqnmcvofuksar`) — deployment blocked pending separate execution token.
* **Governing Register Boundary:** Register reconciliation is governed by `CTO_DIRECTIVE_W022_IMPLEMENTATION_AUTHORIZATION_2026-10-25.md`. Changes must truthfully preserve historical coordinates, distinguish prospective authorization from historical implementation, and must not imply staging execution, production release, or acceptance without evidence.

---

## 2. Problem Statement (Task Understanding & Core Objectives)

### 2.1 Core Problem Statement
Milestone W021 established the inbound B2B Partner REST API foundation under `/api/vsaas/v1/...` (Migration 056: tenants, applications, API keys, quota ledger). However, modern institutional consumers (media newsrooms, think tanks, civic developers, and campaign analytics teams) require asynchronous notifications when political, spatial, or electoral data undergoes verified revisions. 

Relying solely on consumer polling introduces high API request volume, redundant query overhead, and increased staging/production latency. In `PLAN-W021-MASTER-REV-1.0.md` (Section 2, line 85 and Section 10, lines 408–415), outbound webhook infrastructure was explicitly deferred to **W022** due to its substantial operational footprint: durable queue persistence, exponential backoff retries, cryptographic HMAC request signing, replay attack protection, and anti-SSRF (Server-Side Request Forgery) IP filtering.

### 2.2 Core Objectives of W022
1. **Durable Asynchronous Event Pipeline:** Implement a guaranteed, at-least-once outbound webhook dispatch pipeline that strictly decouples event emission from Fastify HTTP request threads via an immutable database event log and transactional worker outbox.
2. **Multi-Tenant Subscription Management:** Provide authenticated CRUD endpoints under `/api/vsaas/v1/webhooks` enabling SaaS applications (`public.saas_applications`) to register, inspect, update, rotate secrets for, and disable webhook endpoints with mathematical composite-foreign-key tenant isolation.
3. **Cryptographic Authenticity & Integrity:** Sign all outbound payloads with `HMAC-SHA256` using a per-subscription encrypted secret, providing standardized signature, timestamp, and event headers (`X-PanIN-Signature`, `X-PanIN-Timestamp`, `X-PanIN-Event-ID`).
4. **Zero-Trust SSRF Protection:** Prevent attackers from exploiting webhook endpoints to scan internal infrastructure, access cloud metadata services (`169.254.169.254`), or target private VPC networks (RFC 1918 / loopback / link-local addresses), using pre-connect DNS resolution, comprehensive IP blocklists, and socket connection pinning to defeat DNS rebinding.
5. **Operational Resilience & Bounded Retries:** Enforce an exponential backoff schedule across bounded retry attempts (max 5), dead-letter queueing, circuit-breaking for failing subscriptions, worker crash recovery via leased locks, and payload size ceilings.
6. **At-Least-Once Delivery Contract (F-10, F-20):** Commit to an explicit at-least-once delivery contract. PanIN guarantees that every published domain event matching an active subscription will be delivered at least once, provided the subscriber endpoint is reachable within the 5-attempt retry window. Acknowledge that duplicate deliveries can occur under network timeouts, TCP disconnects, or worker failovers, and mandate receiver-side idempotency via `X-PanIN-Event-ID`.
7. **Stable Outbound Serialization & Hash Parity (F-17):** Guarantee byte-level payload reproducibility across retries by persisting the canonical UTF-8 JSON string (`payload_raw`) alongside binary `JSONB`, ensuring that persisted payload bytes, SHA-256 digests, HMAC input bytes, and transmitted HTTP bodies are byte-for-byte identical across all attempts.
8. **Allowlisted Event Schemas & Zero-PII Boundary (F-18):** Enforce strict allowlisted JSON schemas with `additionalProperties: false` across all event types, rejecting any unexpected or unvetted fields. Maintain zero-PII status as proposed/unverified pending empirical test verification.

---

## 3. Current State Analysis (Repository Inspection & Dependency Analysis)

### 3.1 Repository Inspection & Existing SaaS Foundation
Direct inspection of the repository reveals the existing W021 foundational components:
* **Database Persistence (Migration 056 & 057):**
  * `supabase/migrations/056_saas_partner_foundation.sql`: Establishes `public.saas_tenants`, `public.saas_applications`, `public.saas_api_keys`, and `public.saas_usage_ledger`.
  * `supabase/migrations/057_w021_saas_tenant_isolation_remediation.sql`: Hardens composite tenant/application isolation via `CONSTRAINT uq_saas_applications_tenant_app UNIQUE (tenant_id, id)`.
  * Privileged Database Roles & RLS: RLS is enabled and forced on all SaaS tables. Access is revoked from `anon`, `authenticated`, and `public`, and granted exclusively to `service_role`.
  * Role Boundary Reality: Because `service_role` possesses the PostgreSQL `BYPASSRLS` attribute, RLS alone does not constrain backend database queries. Application-level multi-tenant predicate enforcement (`WHERE tenant_id = ...`) is the primary security boundary.
  * **Unverified Runtime Schema Caveat (F-09, F-19):** While `057_w021_saas_tenant_isolation_remediation.sql` exists in the repository, the live existence of `uq_saas_applications_tenant_app` in the staging/production database runtime remains an **unverified assumption** due to Directive 153's database freeze. Consequently, Migration 070 includes an explicit idempotent preflight assertion block using standard SQLSTATE `'55000'` (`object_not_in_prerequisite_state`) to verify that `uq_saas_applications_tenant_app` is present before establishing composite foreign keys.
* **API Service Architecture:**
  * `apps/api/src/routes/saasV1.ts`: Registers the `/api/vsaas/v1/...` route namespace.
  * `apps/api/src/lib/saasAuthPlugin.ts`: Validates incoming `X-PanIN-Key` headers against hashed keys in `saas_api_keys` and attaches `tenantId`, `applicationId`, and `tier` to `request.saasContext`.
  * `apps/api/src/lib/saasRateLimiter.ts`: Sliding-window in-memory quota manager.
* **OpenAPI Documentation:**
  * `apps/api/openapi-saas-v1.yaml`: Authoritative OpenAPI 3.1 specification for the B2B SaaS surface.
  * `tests/saas-api-contract-drift.test.mjs`: Automated contract drift verification.

### 3.2 Root-Cause Interpretation of Deferral from W021
W021 explicitly excluded webhooks because coupling queue state machines, HTTP dispatch workers, and egress network filtering into the REST query layer would have jeopardized milestone delivery and introduced unvetted operational attack vectors. Deferring to W022 ensures that queue selection, SSRF protection, and retry semantics are architected with dedicated security controls.

### 3.3 Dependency Analysis & Separation from W021.5 Data Freeze
* **Hard Dependencies (Existing W021 Tables):** W022 strictly depends on `public.saas_applications` and `public.saas_tenants` for subscription ownership and authorization. These tables are already authored in Migration 056 and 057.
* **Clean Decoupling from W021.5 Data Hold:** W022 does **NOT** depend on unresolved W021.5 data workstreams:
  * Unaffected by candidacy subchunks 08B–10B (`W021.5-D-02`).
  * Unaffected by the 4,123 constituency demographics crosswalk (`W021.5-E-01`).
  * Unaffected by physical gazette custody or notary transcription audits (`EB-01`, `EB-02`).
  * Unaffected by India Post GIS delivery beat polygons (`EB-03`, `EB-04`).
  * Unaffected by candidate affidavit financial nullability defect `DQ-W021.5-B2.2E-001`.
* **Event Triggers during Staging Hold:** During the freeze, event emission in W022 test harnesses will utilize mock administrative trigger events (e.g. `test.ping`, `elections.simulated_update`) without requiring live production or staging data modifications.

---

## 4. Fact / Inference / Assumption / Unknown Register

| Entry ID | Category | Proposition | Evidence / Source Reference |
| :--- | :--- | :--- | :--- |
| **`FIA-01`** | **Fact** | W022 was formally established as a deferred milestone for outbound event dispatching. | [`PLAN-W021-MASTER-REV-1.0.md`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/PLAN-W021-MASTER-REV-1.0.md#L85), Section 2 & Section 10. |
| **`FIA-02`** | **Fact** | W021 SaaS schema (Migration 056/057) defines `saas_tenants` and `saas_applications` with composite unique constraint `uq_saas_applications_tenant_app UNIQUE (tenant_id, id)`. | [`supabase/migrations/057_w021_saas_tenant_isolation_remediation.sql`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/supabase/migrations/057_w021_saas_tenant_isolation_remediation.sql#L32). |
| **`FIA-03`** | **Fact** | `service_role` in Supabase has `BYPASSRLS` privileges; RLS policies do not constrain queries executed directly under this role. | PostgreSQL 15+ System Catalog & Supabase Security Architecture. |
| **`FIA-04`** | **Fact** | Directive 153 froze all development; `W022-CTO-PLAN-001` and Revision Directives 1, 2, & 3 amended it solely to permit revising `PLAN-W022-REV-1.0.md`. | Directives `W022-CTO-PLAN-001`, Rev 1, Rev 2, and Rev 3 Directives. |
| **`FIA-05`** | **Fact** | Production database (`ehfafcnimmjusyvplbah`) is 100% air-gapped and must receive zero connections or mutations. | Master Framework Amendments v1.2–v1.6. |
| **`FIA-06`** | **Fact** | Symmetric HMAC signatures provide message authenticity and integrity between parties possessing the shared secret, but do not provide non-repudiation. | Cryptographic Standards (NIST FIPS 198-1 / RFC 2104). |
| **`FIA-07`** | **Fact** | Remote HTTP delivery across distributed networks is at-least-once; transient network timeouts, worker failover, and slow receiver ACKs can produce duplicate deliveries. | Distributed Systems Engineering Contract (Section 5.7). |
| **`FIA-08`** | **Fact** | PostgreSQL `JSONB` decomposes JSON into internal binary format and does not preserve lexical key ordering or whitespace; stringification of `JSONB` can vary across runtimes. | PostgreSQL Documentation: Chapter 8.14 JSON Types. |
| **`FIA-09`** | **Inference** | To guarantee stable HMAC signatures across retries, the raw canonical UTF-8 JSON payload string (`payload_raw`) must be stored and dispatched directly. | Derived from byte-stability analysis (F-17). |
| **`FIA-10`** | **Inference** | To prevent mismatched tenant/app IDs, webhook subscriptions, events, and deliveries must use composite foreign keys referencing `(tenant_id, id)` and `(tenant_id, application_id)`. | Derived from findings F-01, F-09, and Migration 057 schema contract. |
| **`FIA-11`** | **Inference** | PostgreSQL system triggers fire regardless of `service_role` `BYPASSRLS` status, providing enforceable immutability for `webhook_events`. | PostgreSQL Trigger Execution Architecture (System Triggers). |
| **`FIA-12`** | **Assumption (Unverified)** | Target staging database runtime has Migration 057 applied and contains `uq_saas_applications_tenant_app`. Requires preflight assertion in Migration 070. | Migration Inventory vs Staging Execution Freeze. |
| **`FIA-13`** | **Assumption (Proposed)** | Egress anti-SSRF socket connection pinning prevents DNS rebinding without degrading TLS SNI hostname validation. Must be verified in `webhooks-ssrf-guard.test.mjs`. | Egress Security Architecture Specification (Section 5.6). |
| **`FIA-14`** | **Assumption (Proposed)** | Zero-PII compliance via allowlisted schemas is a design requirement that remains unverified until empirical test suite execution in Phase 5. | DPDP Compliance & Privacy Specification (Section 6, Section 18). |
| **`FIA-15`** | **Unknown** | Maximum sustained outbound dispatch rate required by institutional newsroom consumers during live election vote counting. | To be benchmarked during W022 performance test phase (target capacity: 50 events/sec). |

---

## 5. Target Architecture & Intended Outcome

### 5.1 Architecture Overview: Decoupled Event & Delivery Pipeline
To satisfy findings F-02, F-09, F-10, F-11, F-16, F-17, and F-20, W022 strictly separates the **durable, immutable event log** from the **per-subscription delivery attempt queue**:

```mermaid
flowchart TD
    subgraph S1["1. Atomic Event Emission & Fan-Out Layer"]
        DOMAIN["Domain Service / API Endpoint"] -->|Atomic Transaction| TX["PostgreSQL Transaction (ACID)"]
        TX -->|1. Insert Event with payload_raw| EVT["public.webhook_events (Append-Only Log)"]
        TX -->|2. Query Active Subscriptions| SUB["public.webhook_subscriptions"]
        TX -->|3. Fan-out Insert Deliveries| DELIV["public.webhook_deliveries (Status: queued)"]
        TRIGGER["Trigger: trg_webhook_events_immutable"] -.->|Blocks Direct UPDATE/DELETE (SQLSTATE 55000)| EVT
    end

    subgraph S2["2. Worker Lease Claim & State Machine Layer (F-10)"]
        WORKER["Background Worker Pool"] -->|Claim via FOR UPDATE SKIP LOCKED| CLAIM["Atomic Batch Claim"]
        CLAIM -->|Sets status: leased, lease_token: UUID, leased_until: now() + 30s| DELIV
        SWEEPER["Crash Recovery Sweeper"] -->|Reclaims expired leases: leased_until < now()| DELIV
    end

    subgraph S3["3. Security & Cryptographic Egress Layer (F-12, F-13, F-17)"]
        WORKER -->|Read Immutable payload_raw| PAYLOAD["Stable Outbound Bytes (payload_raw)"]
        WORKER -->|Resolve DNS & Blocklist Check| SSRF["Anti-SSRF Guard (IPv4/IPv6 CIDR Filtering)"]
        SSRF -->|Socket Pinned directly to Validated IP Literal| PIN["Pinned TCP Socket (No Ambient DNS Fallback)"]
        PIN -->|TLS Handshake with SNI & Host Header| TLS["TLS v1.2+ Handshake (rejectUnauthorized: true)"]
        PAYLOAD -->|HMAC-SHA256 Sign over ${timestamp}.${payload_raw}| CRYPTO["Cryptographic Signer"]
        CRYPTO -->|X-PanIN-Signature / Timestamp / Event-ID| TLS
        PAYLOAD -->|Exact UTF-8 Buffer Transmitted as Body| TLS
        TLS -->|No Redirects / 10s Bounded Timeout| PARTNER["External Partner HTTPS Endpoint"]
    end

    subgraph S4["4. Lease-Token-Fenced Completion & Retry Layer (F-10, F-20)"]
        PARTNER -->|Capture Status & Sample (1KB Max)| RESULT["Result Processor"]
        RESULT -->|Update WHERE id = $id AND lease_token = $token| DELIV
        RESULT -->|Success 2xx| DELIV_DONE["Status: delivered (Terminal)"]
        RESULT -->|Failure and attempt_count < 5| RETRY["Status: retrying (Exp Backoff: 30s, 5m, 30m, 2h)"]
        RESULT -->|Failure and attempt_count = 5| DLQ["Status: dead_letter (Terminal)"]
    end

    subgraph S5["5. Audited Retention Purge Layer (F-16)"]
        PROC["Security Definer Procedure: fn_purge_expired_webhook_data()"] -->|1. Delete Deliveries completed > 30d| DELIV
        PROC -->|2. Delete Orphan Events > 30d| EVT
    end
```

### 5.2 Subscription & Delivery Relational Schema (Proposed Migration 070)
To satisfy findings F-01, F-02, F-03, F-09, F-10, F-11, F-16, F-17, and F-19, the schema enforces composite tenant foreign keys across all entities, unique fan-out idempotency, append-only event immutability, stable payload string storage, leased worker locks, and strict check constraints:

```sql
-- Migration 070: public.webhook_subscriptions, public.webhook_events, public.webhook_deliveries

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- 0. PREFLIGHT RUNTIME ASSERTIONS (F-09, F-19)
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_saas_applications_tenant_app' 
          AND conrelid = 'public.saas_applications'::regclass
    ) THEN
        RAISE EXCEPTION 'PREREQUISITE CONSTRAINT MISSING: uq_saas_applications_tenant_app on public.saas_applications does not exist. Migration 057 must be verified and executed prior to Migration 070.'
            USING ERRCODE = '55000'; -- object_not_in_prerequisite_state
    END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. WEBHOOK SUBSCRIPTIONS (F-01, F-09, F-13)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    application_id UUID NOT NULL,
    endpoint_url TEXT NOT NULL,
    -- F-13: Authenticated encryption storage for signing secrets (AES-256-GCM)
    secret_ciphertext BYTEA NOT NULL,
    secret_iv BYTEA NOT NULL,
    secret_tag BYTEA NOT NULL,
    secret_key_version INTEGER NOT NULL DEFAULT 1,
    secret_hash VARCHAR(64) NOT NULL,
    secret_hint VARCHAR(8) NOT NULL,
    -- F-13: Dual-secret rotation support with 24-hour transition window
    previous_secret_ciphertext BYTEA,
    previous_secret_iv BYTEA,
    previous_secret_tag BYTEA,
    previous_secret_expires_at TIMESTAMPTZ,
    subscribed_events TEXT[] NOT NULL DEFAULT '{"*"}',
    status TEXT NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'paused', 'disabled', 'failed')),
    consecutive_failure_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- F-01 & F-09: Composite FK guarantees subscription belongs strictly to tenant's application
    CONSTRAINT fk_webhook_sub_tenant_app FOREIGN KEY (tenant_id, application_id)
        REFERENCES public.saas_applications(tenant_id, id) ON DELETE CASCADE,
    -- F-09: Composite unique constraint enables downstream composite FK referencing by deliveries
    CONSTRAINT uq_webhook_sub_tenant_id UNIQUE (tenant_id, id),
    CONSTRAINT ck_webhook_endpoint_https CHECK (endpoint_url ~* '^https://.+'),
    CONSTRAINT ck_webhook_endpoint_length CHECK (length(endpoint_url) <= 2048)
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. IMMUTABLE WEBHOOK EVENTS LOG (F-02, F-09, F-11, F-16, F-17, F-19)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    idempotency_key TEXT,
    -- F-17: Both parsed JSONB and raw canonical UTF-8 JSON string are stored
    payload JSONB NOT NULL,
    payload_raw TEXT NOT NULL,
    payload_sha256 VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- F-11 & F-16: Restrict tenant deletion while event audit log exists
    CONSTRAINT fk_webhook_events_tenant FOREIGN KEY (tenant_id)
        REFERENCES public.saas_tenants(id) ON DELETE RESTRICT,
    -- F-09: Composite unique key required for composite FK reference by webhook_deliveries
    CONSTRAINT uq_webhook_events_tenant_id UNIQUE (tenant_id, id),
    CONSTRAINT ck_event_type_format CHECK (event_type ~* '^[a-z0-9_.-]+$')
);

-- F-11: Scoped unique idempotency index per tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_webhook_events_tenant_idempotency 
    ON public.webhook_events (tenant_id, idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

-- F-11, F-16, F-19: Enforce payload immutability and audited retention deletion via trigger
CREATE OR REPLACE FUNCTION public.fn_webhook_events_prevent_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'MUTATION_FORBIDDEN: public.webhook_events is an append-only immutable audit log. UPDATE operations are prohibited.'
            USING ERRCODE = '55000'; -- object_not_in_prerequisite_state
    ELSIF TG_OP = 'DELETE' THEN
        -- Allow deletion ONLY when authorized maintenance session variable is set
        IF current_setting('app.retention_cleanup_authorized', true) IS DISTINCT FROM 'true' THEN
            RAISE EXCEPTION 'DELETE_UNAUTHORIZED: Direct deletion from webhook_events is prohibited. Retention purges must execute via public.fn_purge_expired_webhook_data().'
                USING ERRCODE = '55000'; -- object_not_in_prerequisite_state
        END IF;
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_webhook_events_immutable ON public.webhook_events;
CREATE TRIGGER trg_webhook_events_immutable
    BEFORE UPDATE OR DELETE ON public.webhook_events
    FOR EACH ROW EXECUTE FUNCTION public.fn_webhook_events_prevent_mutation();

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. PER-SUBSCRIPTION WEBHOOK DELIVERIES (F-01, F-02, F-09, F-10, F-11, F-16)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    subscription_id UUID NOT NULL,
    event_id UUID NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'queued' 
        CHECK (status IN ('queued', 'leased', 'delivered', 'retrying', 'dead_letter')),
    -- F-10: Worker leased-lock tokens for crash recovery and fenced updates
    lease_token UUID,
    leased_at TIMESTAMPTZ,
    leased_until TIMESTAMPTZ,
    http_status INTEGER,
    execution_duration_ms INTEGER,
    request_headers JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_headers JSONB,
    response_body_sample TEXT,
    error_message TEXT,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    -- F-01 & F-09: Composite FK to subscriptions preventing cross-tenant mismatch
    -- F-11: ON DELETE RESTRICT prevents deleting subscriptions while delivery records exist
    CONSTRAINT fk_webhook_deliv_tenant_sub FOREIGN KEY (tenant_id, subscription_id)
        REFERENCES public.webhook_subscriptions(tenant_id, id) ON DELETE RESTRICT,
    -- F-09 & F-16: Composite FK to events enforcing tenant parity across event and delivery
    CONSTRAINT fk_webhook_deliv_tenant_event FOREIGN KEY (tenant_id, event_id)
        REFERENCES public.webhook_events(tenant_id, id) ON DELETE RESTRICT,
    -- F-09: Unique fan-out idempotency preventing duplicate deliveries per subscription & event
    CONSTRAINT uq_webhook_deliv_sub_event UNIQUE (subscription_id, event_id),
    CONSTRAINT ck_response_sample_length CHECK (length(response_body_sample) <= 1024),
    -- F-10: Explicit attempt bounds: Attempt 1 is initial, Attempts 2-5 are retries
    CONSTRAINT ck_attempt_bounds CHECK (attempt_count >= 1 AND attempt_count <= 5)
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. PERFORMANCE & QUEUE POLLING INDEXES
-- ══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_webhook_sub_app 
    ON public.webhook_subscriptions(tenant_id, application_id, status);

CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant_created 
    ON public.webhook_events(tenant_id, created_at DESC);

-- Partial index for high-performance worker polling with zero row locks on inactive rows
CREATE INDEX IF NOT EXISTS idx_webhook_deliv_worker_poll 
    ON public.webhook_deliveries(status, next_retry_at, leased_until) 
    WHERE status IN ('queued', 'retrying', 'leased');

CREATE INDEX IF NOT EXISTS idx_webhook_deliv_tenant_event 
    ON public.webhook_deliveries(tenant_id, event_id);

CREATE INDEX IF NOT EXISTS idx_webhook_deliv_tenant_sub_created 
    ON public.webhook_deliveries(tenant_id, subscription_id, created_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. AUDITED RETENTION PURGE FUNCTION (F-16)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_purge_expired_webhook_data(
    p_retention_days INTEGER DEFAULT 30,
    p_batch_size INTEGER DEFAULT 1000
)
RETURNS TABLE (purged_deliveries_count INTEGER, purged_events_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deliv_count INTEGER := 0;
    v_event_count INTEGER := 0;
    v_cutoff TIMESTAMPTZ := now() - (p_retention_days || ' days')::INTERVAL;
BEGIN
    -- Set session authorization token recognized by trg_webhook_events_immutable
    PERFORM set_config('app.retention_cleanup_authorized', 'true', true);

    -- Step 1: Purge completed deliveries older than cutoff
    -- (Must delete deliveries first to satisfy fk_webhook_deliv_tenant_event RESTRICT)
    WITH deleted_deliv AS (
        DELETE FROM public.webhook_deliveries
        WHERE id IN (
            SELECT id FROM public.webhook_deliveries
            WHERE status IN ('delivered', 'dead_letter')
              AND completed_at < v_cutoff
            LIMIT p_batch_size
        )
        RETURNING id
    )
    SELECT count(*)::INTEGER INTO v_deliv_count FROM deleted_deliv;

    -- Step 2: Purge orphaned events older than cutoff that have zero remaining deliveries
    WITH deleted_events AS (
        DELETE FROM public.webhook_events
        WHERE id IN (
            SELECT id FROM public.webhook_events
            WHERE created_at < v_cutoff
              AND NOT EXISTS (
                  SELECT 1 FROM public.webhook_deliveries d 
                  WHERE d.tenant_id = public.webhook_events.tenant_id 
                    AND d.event_id = public.webhook_events.id
              )
            LIMIT p_batch_size
        )
        RETURNING id
    )
    SELECT count(*)::INTEGER INTO v_event_count FROM deleted_events;

    -- Reset session authorization variable
    PERFORM set_config('app.retention_cleanup_authorized', 'false', true);

    purged_deliveries_count := v_deliv_count;
    purged_events_count := v_event_count;
    RETURN NEXT;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. DATABASE ROLES, PRIVILEGES & RLS POLICIES (F-03, F-11, F-16)
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries FORCE ROW LEVEL SECURITY;

-- Explicitly revoke access from untrusted client roles
REVOKE ALL ON public.webhook_subscriptions FROM anon, authenticated, public;
REVOKE ALL ON public.webhook_events FROM anon, authenticated, public;
REVOKE ALL ON public.webhook_deliveries FROM anon, authenticated, public;

-- F-11 & F-16: Revoke UPDATE and direct DELETE on immutable events from service_role
REVOKE UPDATE, DELETE ON public.webhook_events FROM service_role;

-- Grant operational DML to service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_subscriptions TO service_role;
GRANT SELECT, INSERT ON public.webhook_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_deliveries TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_purge_expired_webhook_data TO service_role;

-- Fail-closed RLS policies for any potential non-BYPASSRLS session
CREATE POLICY "webhook_sub_tenant_isolation" ON public.webhook_subscriptions
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY "webhook_events_tenant_isolation" ON public.webhook_events
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY "webhook_deliv_tenant_isolation" ON public.webhook_deliveries
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

COMMIT;
```

### 5.3 Queue & Worker Technology Comparison & Evaluation
In accordance with finding F-02, queue architectures were evaluated across operational, financial, and consistency dimensions:

| Evaluation Criteria | Option A: External Redis + BullMQ | Option B: PostgreSQL Outbox (`SKIP LOCKED`) |
| :--- | :--- | :--- |
| **Operational Footprint** | **High.** Requires provisioning, clustering, and monitoring separate Redis instances. | **Zero.** Uses existing Supabase managed PostgreSQL infrastructure. |
| **Infrastructure Cost** | **Additional.** $15 to $50+/month per environment for managed Redis. | **$0.** Leverages current staging/production database allocations. |
| **Transactional Consistency** | **Dual-Write Vulnerability.** Updating Postgres and enqueueing to Redis creates distributed transaction failure modes. | **Strict ACID Guarantee.** Business event emission, event log insertion, and delivery queue rows are written in the *exact same transaction*. |
| **Throughput & Latency** | Extreme throughput (10,000+ jobs/sec), sub-millisecond dispatch. | High throughput (500–2,000 jobs/sec with `SKIP LOCKED`), 50–200 ms dispatch latency. |
| **Crash Recovery** | Depends on Redis AOF/RDB persistence; node failover risks in-flight jobs. | Native PostgreSQL WAL replay; lease timeout automatically recovers crashed workers. |
| **Operational Complexity** | Separate network security boundaries, TLS certificates, connection poolers. | Consolidated backup, point-in-time recovery, and unified schema migrations. |

* **Architectural Recommendation:** **Option B: PostgreSQL Transactional Outbox via `FOR UPDATE SKIP LOCKED`.**
* *Justification:* For Milestone W022, the projected event volume for Indian electoral updates (10–50 events/minute) is orders of magnitude below PostgreSQL concurrency limits. Option B completely eliminates dual-write race conditions and external infrastructure dependencies while ensuring 100% atomic delivery guarantees. The worker interface will be abstracted behind a `WebhookQueueProvider` interface to permit Redis cutover if high-frequency sensor or tick data is introduced in later phases.

### 5.4 Multi-Tenant Isolation & Application-Level Ownership Invariants
To resolve findings F-01, F-03, and F-09:
1. **Schema-Level Invariants:**
   * Composite foreign key `fk_webhook_sub_tenant_app` ensures that `application_id` must belong to the specified `tenant_id`.
   * Composite foreign key `fk_webhook_deliv_tenant_sub` ensures that delivery attempts cannot reference a subscription belonging to a different tenant.
   * Composite foreign key `fk_webhook_deliv_tenant_event` ensures that delivery attempts cannot reference an event belonging to a different tenant.
   * Unique constraint `uq_webhook_deliv_sub_event` prevents duplicate fan-out records for any subscription/event pair.
2. **Application-Level Security Perimeter (F-03):**
   * Because the Fastify backend operates under `service_role` (which possesses `BYPASSRLS`), application code enforces strict ownership verification:
   * Every SQL query executed by `webhookService.ts` explicitly binds: `WHERE tenant_id = request.saasContext.tenantId AND application_id = request.saasContext.applicationId`.
   * Any attempt by Tenant B to query, update, rotate secrets for, or delete a webhook belonging to Tenant A returns a generic `404 NOT_FOUND` to prevent identifier enumeration.
   * Future implementation test suite `tests/webhooks-api-endpoints.test.mjs` mandates cross-tenant negative tests verifying that tenant context is strictly honored.

### 5.5 Cryptographic Architecture, Signing & Stable Payload Bytes (F-13, F-17)
To resolve findings F-06, F-13, and F-17:
* **Authenticity & Integrity Boundary (F-06):**
  > [!IMPORTANT]
  > **CRYPTOGRAPHIC BOUNDARY NOTICE:** Symmetrical `HMAC-SHA256` provides message **authenticity** and **data integrity** between PanIN and the partner subscriber. Because both PanIN and the subscriber possess the shared secret `whsec_...`, HMAC **DOES NOT PROVIDE NON-REPUDIATION** (the subscriber could mathematically forge an HMAC signature using their own copy of the secret). True cryptographic non-repudiation would require asymmetric public-key cryptography (e.g. Ed25519 digital signatures with private key custody on PanIN and public keys distributed to partners). Asymmetric signing is recorded as a future architectural consideration for Milestone W025+, while Milestone W022 implements symmetric HMAC-SHA256 standard across webhook ecosystems (Stripe, GitHub, Shopify).
* **Stable Outbound Payload Bytes across Retries (F-17):**
  * To guarantee byte-level consistency between persisted data, hashes, HMAC inputs, and transmitted bodies across retries:
    1. **Canonical Serialization (RFC 8785):** When an event is emitted, its payload is formatted into a deterministic JSON string adhering to RFC 8785 (JSON Canonicalization Scheme / JCS): lexicographically sorted keys by UTF-16 code units, zero insignificant whitespace, and standardized number representations.
    2. **Persisted Canonical String:** This string is saved directly in `public.webhook_events.payload_raw` (type `TEXT`) alongside the binary `payload` (type `JSONB`).
    3. **Hash Invariant:** `payload_sha256 = crypto.createHash('sha256').update(payload_raw, 'utf8').digest('hex')`.
    4. **HMAC Input Invariant:** On every dispatch attempt (Attempt 1 through 5), the worker signs `${timestamp}.${payload_raw}` where `timestamp` is the integer Unix epoch of the dispatch attempt.
    5. **Transmitted Body Invariant:** The dispatcher transmits `Buffer.from(payload_raw, 'utf8')` as the raw HTTP POST request body.
    * *Reconciliation Guarantee:* Because `payload_raw` is immutable, the transmitted payload body and `X-PanIN-Payload-SHA256` remain 100% byte-identical across initial dispatches and all retry attempts.
* **Encryption Key Custody & Master Secret Versioning:**
  * Master encryption key `WEBHOOK_SECRETS_ENCRYPTION_KEY`: 32-byte hexadecimal string loaded exclusively from environment / AWS Secrets Manager / Vault.
  * Algorithm: `AES-256-GCM` authenticated encryption.
  * Associated Authenticated Data (AAD): The string `${tenantId}:${subscriptionId}` is passed as AAD to `crypto.createCipheriv` and `crypto.createDecipheriv`. This cryptographically binds the ciphertext to the exact subscription, preventing ciphertext transplantation attacks across subscriptions.
  * Storage: Ciphertext (`secret_ciphertext`), IV (`secret_iv`, 12 bytes), Tag (`secret_tag`, 16 bytes), and Key Version (`secret_key_version = 1`) stored in dedicated binary columns.
* **Secret Key Lifecycle & Storage:**
  * Generation: 32 cryptographically secure random bytes generated via `crypto.randomBytes(32).toString('hex')`, prefixed as `whsec_` (total 68 chars).
  * One-Time Plaintext Disclosure: Returned in plaintext **ONLY** in the initial `POST /api/vsaas/v1/webhooks` creation response or explicit secret-rotation response. Never returned in `GET` endpoints.
  * UI Identification: A 4-character hint is stored in `secret_hint` (e.g. `...a1f9`).
  * Fast Lookup & Integrity: A one-way `SHA-256` hash is stored in `secret_hash`.
  * Logging Redaction: Application logger automatically redacts any pattern matching `whsec_[a-zA-Z0-9]{64}`, replacing it with `whsec_***`.
* **Standard Outbound Headers & Grammar:**
  * `X-PanIN-Signature`: Formatted as `t=${timestamp},v1=${signature_hex}`.
  * `X-PanIN-Timestamp`: Integer Unix timestamp (seconds).
  * `X-PanIN-Event-ID`: Unique UUIDv4 event identifier (constant across retries).
  * `X-PanIN-Delivery-ID`: Unique delivery attempt UUIDv4 (distinct per retry).
  * `X-PanIN-Payload-SHA256`: SHA-256 digest of `payload_raw` (constant across retries).
  * `User-Agent`: `PanIN-Webhook-Dispatcher/1.0 (+https://kshetra.app)`.
* **Verification Procedure & Clock Skew:**
  * Consumer extracts `t` and `v1` values from `X-PanIN-Signature`.
  * Clock Skew Enforcement:
    * Reject if `currentTime - timestamp > 300` (older than 5 minutes, replay protection).
    * Reject if `timestamp - currentTime > 60` (more than 1 minute in the future, clock drift protection).
  * Constant-Time Comparison: Signatures compared strictly using `crypto.timingSafeEqual(Buffer.from(computedSig, 'hex'), Buffer.from(receivedSig, 'hex'))` to prevent side-channel timing attacks.
* **Dual-Secret Rotation (24-Hour Grace Period):**
  * When a partner initiates secret rotation (`POST /webhooks/:id/rotate-secret`):
    * Current secret moves to `previous_secret_*` with `previous_secret_expires_at = now() + INTERVAL '24 hours'`.
    * Newly generated secret becomes primary in `secret_*`.
    * During the 24-hour grace period, the dispatcher computes signatures using **both** secrets and transmits two `v1=` values in the header:
      `X-PanIN-Signature: t=${timestamp},v1=${primary_sig},v1=${previous_sig}`
    * This allows partner infrastructure to update secret credentials with zero downtime.
    * After 24 hours, the background cleanup job nullifies `previous_secret_*`.

### 5.6 Zero-Trust Anti-SSRF Egress Security Architecture (F-12)
To resolve findings F-04 and F-12, the outbound HTTP dispatcher enforces a multi-tier, fail-closed egress security pipeline:

```mermaid
flowchart TD
    REQ["1. Dispatcher Target URL"] --> PARSE["2. URL Parsing & Normalization (new URL)"]
    PARSE -->|Scheme != https or Port != 443| FAIL_PORT["Fail Closed: INVALID_URL_SCHEME_OR_PORT"]
    PARSE -->|Contains user:pass| FAIL_USER["Fail Closed: USERINFO_PROHIBITED"]
    PARSE -->|Valid FQDN Hostname| DNS["3. Pre-Connect DNS Lookup (all: true)"]
    DNS -->|DNS Resolution Error / NXDOMAIN| FAIL_DNS["Fail Closed: DNS_RESOLUTION_FAILED"]
    DNS -->|All Resolved IPv4 & IPv6 Addresses| CIDR["4. Comprehensive CIDR Blocklist Matching"]
    CIDR -->|Any IP matches Private / Loopback / Link-Local / Cloud Metadata| FAIL_SSRF["Fail Closed: BLOCKED_PRIVATE_IP_ADDRESS"]
    CIDR -->|All IPs are Public & Valid| PIN["5. Socket Connection Pinning (Custom https.Agent)"]
    PIN -->|Socket connected directly to pinned IP literal| TLS["6. TLS v1.2+ Handshake (Host & SNI = original hostname)"]
    TLS -->|Target Returns 3xx Redirect| FAIL_REDIR["Fail Closed: REDIRECTS_FORBIDDEN (No Follow)"]
    TLS -->|Connect Timeout > 3s or Total Timeout > 10s| FAIL_TIME["Fail Closed: DELIVERY_TIMEOUT"]
    TLS -->|Valid Response 2xx| SUCCESS["Capture Response (1KB Max) & Complete Delivery"]
```

1. **URL Parsing & Validation:**
   * Parsed strictly using Node.js `new URL(endpointUrl)`.
   * Scheme must be strictly `https:` (case-insensitive). Plain `http:` is forbidden.
   * URLs containing userinfo (`https://user:pass@host/`) are rejected (`USERINFO_PROHIBITED`).
   * Explicit destination port must be `443` (or omitted, defaulting to 443). Non-standard ports (<1024 or known internal service ports e.g. 5432, 6379, 8000, 8080) are rejected.
2. **Pre-Connect DNS Resolution:**
   * Dispatcher resolves hostname using `dns.promises.lookup(hostname, { all: true, verbatim: true })`.
   * If DNS returns multiple IP addresses (dual-stack IPv4/IPv6 or round-robin), **every single returned IP address** is validated. If *any* IP matches a private or reserved range, the entire request fails closed.
3. **Comprehensive IP Blocklist (IPv4 & IPv6):**
   * IPv4 Blocklist: `0.0.0.0/8`, `10.0.0.0/8` (RFC 1918), `100.64.0.0/10` (Carrier NAT), `127.0.0.0/8` (Loopback), `169.254.0.0/16` (Link-Local & Cloud Metadata), `172.16.0.0/12` (RFC 1918), `192.0.0.0/24`, `192.0.2.0/24` (TEST-NET-1), `192.88.99.0/24`, `192.168.0.0/16` (RFC 1918), `198.18.0.0/15` (Benchmarking), `198.51.100.0/24` (TEST-NET-2), `203.0.113.0/24` (TEST-NET-3), `224.0.0.0/4` (Multicast), `240.0.0.0/4` (Reserved), `255.255.255.255/32`.
   * IPv6 Blocklist: `::/128`, `::1/128` (Loopback), `::ffff:0:0/96` (IPv4-mapped IPv6 — must extract mapped IPv4 and re-validate against IPv4 blocklist), `64:ff9b::/96` (IPv4/IPv6 translation), `100::/64` (Discard-only), `2001:db8::/32` (Documentation), `2002::/16` (6to4), `fc00::/7` (Unique Local), `fe80::/10` (Link-Local), `ff00::/8` (Multicast).
   * Cloud Metadata Target: Explicitly rejects AWS/GCP/Azure link-local address `169.254.169.254` and `[fd00:ec2::254]`.
4. **Transport-Level Enforcement: Socket Connection Pinning (F-12):**
   * Standard HTTP clients re-resolve DNS when opening sockets. An attacker could exploit DNS rebinding by returning a public IP during DNS validation, and then returning `127.0.0.1` 10 milliseconds later during socket connection.
   * To defeat DNS rebinding, the dispatcher configures a custom `https.Agent` that overrides `createConnection`:
     ```javascript
     const agent = new https.Agent({
       createConnection: (options, callback) => {
         // Connect socket directly to the pre-validated public IP address
         const socketOptions = {
           ...options,
           host: pinnedIpLiteral, // Direct IP literal eliminates ambient DNS fallback
           servername: originalHostname, // SNI retained for TLS certificate validation
         };
         return tls.connect(socketOptions, callback);
       }
     });
     ```
   * Passing `pinnedIpLiteral` directly to `tls.connect` physically prevents ambient DNS re-resolution, while setting `servername` preserves standard TLS certificate hostname verification (`rejectUnauthorized: true`).
5. **Strict Redirect Prohibition (F-12):**
   * Automated 3xx redirects are disabled (`followRedirects: false` / `maxRedirects: 0`). If an endpoint responds with a 3xx status, the attempt is recorded as a delivery failure (`REDIRECTS_FORBIDDEN`). Redirects are never followed, preventing open-redirect SSRF escalations.
6. **Timeouts & Response Limits (F-12):**
   * Connect timeout: 3,000 ms.
   * Total response timeout: 10,000 ms.
   * Response body capture limit: First 1,024 bytes (1 KB) only. Excess bytes are discarded, preventing memory exhaustion from massive response payloads.
7. **Localhost Test Override Security Barrier (F-04, F-12):**
   * The localhost test override flag (`ALLOW_LOCALHOST_TEST_ONLY=true`) is hardcoded to be functional **ONLY** when `process.env.NODE_ENV === 'test'`.
   * In `staging` or `production` environments (`NODE_ENV === 'staging'` or `'production'`), the dispatcher unconditionally ignores this flag and immediately throws a fatal boot error (`FATAL_SSRF_CONFIGURATION_VIOLATION`), terminating the process.
8. **Control Status Declaration (F-12):**
   * All SSRF controls described in this section are **PROPOSED ARCHITECTURAL SPECIFICATIONS** that remain unverified until the execution of `tests/webhooks-ssrf-guard.test.mjs` during the implementation phase.

### 5.7 Worker Leases, State Transitions & At-Least-Once Delivery Contract (F-10, F-20)
To resolve findings F-02, F-10, and F-20:

#### 5.7.1 Permitted Delivery States & State Machine
The delivery queue state machine consists of five discrete states: `queued`, `leased`, `delivered`, `retrying`, and `dead_letter`. Every permitted state transition is strictly specified below:

```text
       ┌────────────────────────┐
       │         queued         │◄───────────────────────────┐
       └───────────┬────────────┘                            │
                   │ (1) Atomic Claim                        │
                   ▼                                         │
       ┌────────────────────────┐                            │
       │         leased         ├────────────────────────────┤
       └─────┬─────────┬────────┘ (5) Lease Expiry Sweeper   │
             │         │                                     │
   (2) 2xx   │         │ (3) 4xx/5xx/Timeout/Network Error   │
   Success   │         │     (attempt_count < 5)             │
             │         ▼                                     │
             │  ┌───────────────┐                            │
             │  │   retrying    ├────────────────────────────┘
             │  └──────┬────────┘ (6) Worker Claim (next_retry_at <= now())
             │         │
             │         │ (4) Error and attempt_count = 5
             │         ▼
             │  ┌───────────────┐
             │  │  dead_letter  │ (Terminal)
             │  └───────────────┘
             ▼
      ┌───────────────┐
      │   delivered   │ (Terminal)
      └───────────────┘
```

* **Permitted Transitions:**
  1. `queued -> leased`: Worker atomically claims pending delivery via `FOR UPDATE SKIP LOCKED`.
  2. `leased -> delivered`: Worker receives HTTP 2xx response from partner and commits completion using valid lease token.
  3. `leased -> retrying`: Worker receives HTTP non-2xx, timeout, or network error when `attempt_count < 5`. Schedules `next_retry_at`.
  4. `leased -> dead_letter`: Worker experiences delivery failure when `attempt_count = 5`. Terminal state.
  5. `leased -> queued`: Lease recovery sweeper detects `status = 'leased' AND leased_until < now()` (worker crashed) and resets status to `queued`.
  6. `retrying -> leased`: Worker atomically claims retrying delivery whose `next_retry_at <= now()`.
* Any transition not listed above is prohibited.

#### 5.7.2 Atomic Claim Query
Workers claim batches using PostgreSQL row-level skip locks:
```sql
WITH claimable AS (
    SELECT id
    FROM public.webhook_deliveries
    WHERE (status = 'queued')
       OR (status = 'retrying' AND next_retry_at <= now())
       OR (status = 'leased' AND leased_until < now())
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT $batch_size
)
UPDATE public.webhook_deliveries d
SET status = 'leased',
    leased_at = now(),
    leased_until = now() + INTERVAL '30 seconds',
    lease_token = gen_random_uuid(),
    attempt_count = d.attempt_count + 1
FROM claimable
WHERE d.id = claimable.id
RETURNING d.*;
```

#### 5.7.3 Lease-Token-Fenced Completion Query
To prevent race conditions where an expired worker overwrites newer results from a subsequent worker, all completion updates are fenced by `lease_token`:
```sql
UPDATE public.webhook_deliveries
SET status = $new_status,
    http_status = $http_status,
    execution_duration_ms = $duration_ms,
    response_headers = $response_headers,
    response_body_sample = $response_body_sample,
    error_message = $error_message,
    next_retry_at = $next_retry_at,
    completed_at = CASE WHEN $new_status IN ('delivered', 'dead_letter') THEN now() ELSE NULL END,
    lease_token = NULL,
    leased_until = NULL
WHERE id = $delivery_id
  AND lease_token = $expected_lease_token;
```
* **Fence Rule:** If the query returns 0 affected rows, the worker's lease expired and the delivery was already reclaimed by another worker. The current worker drops the update and logs a warning (`LEASE_FENCE_VIOLATION_UPDATE_DROPPED`).

#### 5.7.4 Attempt Counting & Exponential Backoff Schedule
* **Attempt Counting Semantics:** Initial delivery attempt is **Attempt 1**. Maximum total attempts is **5** (1 initial + 4 retries).
* **Exponential Backoff Schedule:**
  * Attempt 1 fails: `next_retry_at = now() + INTERVAL '30 seconds'` (Retry 1 / Attempt 2).
  * Attempt 2 fails: `next_retry_at = now() + INTERVAL '300 seconds'` (5 minutes, Retry 2 / Attempt 3).
  * Attempt 3 fails: `next_retry_at = now() + INTERVAL '1800 seconds'` (30 minutes, Retry 3 / Attempt 4).
  * Attempt 4 fails: `next_retry_at = now() + INTERVAL '7200 seconds'` (2 hours, Retry 4 / Attempt 5).
  * Attempt 5 fails: `next_retry_at = NULL`; transition to `dead_letter`.
* **Circuit Breaker:** If an endpoint accumulates 20 consecutive `dead_letter` deliveries, its subscription status is set to `failed` and dispatches are suspended until manual re-activation via API.

#### 5.7.5 The At-Least-Once Delivery Contract & Receiver Idempotency Protocol (F-20)
* **At-Least-Once Delivery Contract:**
  PanIN formally commits to an **at-least-once delivery contract** for all events matching an active webhook subscription:
  * If the partner endpoint is operational and returns HTTP 2xx within 10 seconds during any of the 5 scheduled attempts, PanIN guarantees the event will be delivered.
  * Because delivery occurs over asynchronous distributed HTTP boundaries, duplicate deliveries can occur under predictable operational conditions.
* **Enumeration of Duplicate Delivery Conditions:**
  1. *Receiver Acknowledgment Timeout:* Partner receiver processed the event successfully, but database commit or network latency caused the HTTP response to exceed 10 seconds. PanIN aborts the socket and schedules a retry.
  2. *Transient Network Partition / Connection Reset:* The partner sent HTTP 200, but a transient NAT gateway or TCP RST severed the connection before PanIN received the complete response.
  3. *Worker Node Failover / Crash:* Dispatcher received HTTP 200, but the worker process crashed or was terminated before committing the status update to PostgreSQL. The 30-second lease expired, and a subsequent worker re-transmitted the event.
  4. *Lease Expiration Under CPU Starvation:* Heavy worker CPU load delayed completion update beyond 30 seconds, allowing the lease sweeper to release the job to a second concurrent worker.
* **Characteristics of Duplicate Transmissions:**
  * Duplicates carry the **identical** `X-PanIN-Event-ID` and identical `payload_raw` bytes.
  * Duplicates carry a **distinct** `X-PanIN-Delivery-ID`, a **fresh** `X-PanIN-Timestamp`, and a **new** `X-PanIN-Signature` computed over the fresh timestamp.
* **Mandatory Receiver-Side Idempotency Protocol:**
  * Partner subscribers must maintain an idempotent deduplication table in an ACID data store:
    `CREATE TABLE processed_events (event_id UUID PRIMARY KEY, processed_at TIMESTAMPTZ);`
  * Upon receiving a webhook request:
    1. Verify signature using `X-PanIN-Signature` and shared secret.
    2. Check if `X-PanIN-Event-ID` exists in `processed_events`.
    3. If present: Immediately return HTTP `200 OK` and skip downstream business mutations.
    4. If absent: Record `event_id` in `processed_events`, process payload within local transaction, and return HTTP `200 OK`.

---

## 6. Governing Rules, DPDP Privacy & Allowlisted Schemas (F-14, F-18)

1. **Directive 153 Preservation (F-08):** No code, tests, migrations, or database changes may occur until an explicit written CTO implementation directive is issued.
2. **Production Air-Gap:** Under no circumstances will outbound webhooks connect to or be deployed on production Supabase (`ehfafcnimmjusyvplbah`) during W022.
3. **Data Privacy, DPDP Compliance & Allowlisted Event Schemas (F-14, F-18):**
   * Webhook payloads shall contain **ZERO personal data (PII)**.
   * Payloads are strictly classified as **Tier 1 (Public / Aggregate)** data.
   * **Rejection of Blacklist-Only Security:** Relying solely on field blacklists or regex filters is strictly rejected. Every event type is governed by a strict **allowlisted JSON Schema** with `additionalProperties: false` enforced at both root and nested levels.
   * **Catalog of Allowlisted Event Schemas:**
     * *Schema A: `election.results.published`:*
       ```json
       {
         "type": "object",
         "additionalProperties": false,
         "required": ["event_id", "timestamp", "election_id", "state_code", "constituency_code", "counting_round", "status", "summary"],
         "properties": {
           "event_id": { "type": "string", "format": "uuid" },
           "timestamp": { "type": "string", "format": "date-time" },
           "election_id": { "type": "string", "pattern": "^[a-z0-9_-]+$" },
           "state_code": { "type": "string", "pattern": "^[A-Z]{2}$" },
           "constituency_code": { "type": "string", "pattern": "^[A-Z0-9_-]+$" },
           "counting_round": { "type": "integer", "minimum": 1 },
           "status": { "type": "string", "enum": ["in_progress", "declared", "recount"] },
           "summary": {
             "type": "object",
             "additionalProperties": false,
             "required": ["total_votes_counted", "margin", "leading_candidate_id", "leading_party_code"],
             "properties": {
               "total_votes_counted": { "type": "integer", "minimum": 0 },
               "margin": { "type": "integer", "minimum": 0 },
               "leading_candidate_id": { "type": "string", "format": "uuid" },
               "leading_party_code": { "type": "string", "pattern": "^[A-Z0-9]+$" }
             }
           }
         }
       }
       ```
     * *Schema B: `candidate.nomination.updated`:*
       ```json
       {
         "type": "object",
         "additionalProperties": false,
         "required": ["event_id", "timestamp", "candidate_id", "election_id", "nomination_status", "affidavit_hash"],
         "properties": {
           "event_id": { "type": "string", "format": "uuid" },
           "timestamp": { "type": "string", "format": "date-time" },
           "candidate_id": { "type": "string", "format": "uuid" },
           "election_id": { "type": "string", "pattern": "^[a-z0-9_-]+$" },
           "nomination_status": { "type": "string", "enum": ["submitted", "scrutinized_valid", "rejected", "withdrawn"] },
           "affidavit_hash": { "type": "string", "pattern": "^[a-f0-9]{64}$" }
         }
       }
       ```
     * *Schema C: `boundary.delimitation.updated`:*
       ```json
       {
         "type": "object",
         "additionalProperties": false,
         "required": ["event_id", "timestamp", "state_code", "constituency_code", "gazette_notification_number", "boundary_geojson_sha256"],
         "properties": {
           "event_id": { "type": "string", "format": "uuid" },
           "timestamp": { "type": "string", "format": "date-time" },
           "state_code": { "type": "string", "pattern": "^[A-Z]{2}$" },
           "constituency_code": { "type": "string", "pattern": "^[A-Z0-9_-]+$" },
           "gazette_notification_number": { "type": "string" },
           "boundary_geojson_sha256": { "type": "string", "pattern": "^[a-f0-9]{64}$" }
         }
       }
       ```
   * **Explicit Status Declaration:** Zero-PII compliance via allowlisted schemas is a **PROPOSED DESIGN REQUIREMENT** that remains unverified until empirical verification via `tests/webhooks-pii-scrubber.test.mjs` in Phase 5.
4. **Secret Storage Integrity (F-06, F-13):** Signing secrets are never stored in plaintext. They are encrypted using `AES-256-GCM` before storage in `public.webhook_subscriptions`, with associated authenticated data (AAD) bound to `${tenantId}:${subscriptionId}`.
5. **Log Redaction & Hygiene:** Plaintext signing secrets and partner authorization tokens are redacted from all console and audit logs (`whsec_***`).
6. **Data Immutability & Audited Retention Policy (F-11, F-16):**
   * `public.webhook_events` is an immutable audit log protected by trigger `trg_webhook_events_immutable` preventing direct updates or deletions.
   * A rolling 30-day retention policy applies to terminal deliveries (`delivered`, `dead_letter`).
   * Retention purges are executed strictly through `public.fn_purge_expired_webhook_data()`, which deletes completed deliveries first and orphaned events second, satisfying `ON DELETE RESTRICT` constraints.
7. **Idempotency Scope & Response Behavior (F-11):**
   * Idempotency keys are scoped strictly per tenant: `(tenant_id, idempotency_key)`.
   * Duplicate event submissions return HTTP 200 OK with `{ event_id, deduplicated: true }` without generating duplicate delivery records.

---

## 7. Full Scope of Work (Exact Files & Components Expected to Change)

### 7.1 New Files to be Created (Upon Implementation Authorization)
```text
apps/api/src/modules/webhooks/
├── index.ts                          # Webhook module entrypoint & Fastify plugin
├── schemas.ts                        # Allowlisted TypeBox / JSON schemas (additionalProperties: false)
├── routes.ts                         # REST routes (/api/vsaas/v1/webhooks)
├── webhookService.ts                 # Subscription lifecycle & secret management
├── webhookDispatcher.ts              # Egress HTTP sender with socket pinning & timeout
├── antiSsrfGuard.ts                  # IP resolution, CIDR validation & connection pinning
├── hmacSigner.ts                     # HMAC-SHA256 signature generator & canonical formatter
├── queueProvider.ts                  # Abstract queue interface (WebhookQueueProvider)
└── pgQueueProvider.ts                # PostgreSQL SKIP LOCKED queue implementation

supabase/migrations/
├── 070_saas_webhook_engine.sql       # DDL for webhook_subscriptions, webhook_events, webhook_deliveries
└── verification_070_webhook_engine.sql# SQL verification script for tables, indexes, RLS

tests/
├── webhooks-ssrf-guard.test.mjs      # Comprehensive anti-SSRF validation battery
├── webhooks-hmac-signatures.test.mjs # Cryptographic signing & replay protection tests
├── webhooks-delivery-lifecycle.test.mjs # Queueing, retry backoff & dead-letter tests
├── webhooks-api-endpoints.test.mjs   # Fastify partner CRUD & tenant isolation tests
├── webhooks-pii-scrubber.test.mjs    # Automated allowlist & privacy assertion suite (F-14, F-18)
└── saas-api-contract-drift.test.mjs   # Existing OpenAPI contract drift verification
```

### 7.2 Existing Files Expected to be Modified
```text
apps/api/src/routes/saasV1.ts         # Mount /webhooks sub-routes under /api/vsaas/v1
apps/api/openapi-saas-v1.yaml         # Append Webhooks OpenAPI 3.1 endpoints & schemas
```

### 7.3 Exact Files Preserved / Unmodified
```text
apps/mobile/**                        # ZERO changes to mobile codebase
packages/shared/**                    # ZERO changes (unless common webhook types exported)
supabase/migrations/001_069*.sql      # Historical migrations strictly frozen
reports/**                            # Historical reports untouched
EXECUTION_STATE.md                    # Untouched during planning phase (F-08)
ACCEPTANCE_REGISTER.md                 # Untouched during planning phase (F-08)
DECISION_LOG.md                       # Untouched during planning phase (F-08)
RELEASE_REGISTER.md                   # Untouched during planning phase (F-08)
```

---

## 8. Explicit Out-of-Scope Boundaries

The following capabilities are explicitly **EXCLUDED** from Milestone W022:
1. **Inbound Webhooks:** W022 is strictly outbound (PanIN &rarr; Partner). Inbound third-party webhooks (e.g. Stripe/Razorpay payment webhooks) are deferred to Milestone W051 (Billing/SSO).
2. **WebSocket / Real-Time Streaming:** Long-lived WebSocket connections, Server-Sent Events (SSE), and MQTT streams are out of scope.
3. **Kafka / External Distributed Message Brokers:** No Kafka, RabbitMQ, or AWS SQS infrastructure will be introduced.
4. **W021.5 Remediation:** No modification or execution of W021.5 data chunks, demographics UUID crosswalks, or gazette audits.
5. **W023 / Mobile Native Renderer:** No APK builds, no mobile rendering tests, and no MapLibre modifications.
6. **Production Deployment:** Production remains air-gapped.
7. **Governance Register Edits during Planning (F-08):** No modification of execution registers or decision logs is permitted during the planning phase.

---

## 9. Step-by-Step Implementation Plan (Execution Phases)

Upon receiving an explicit CTO Implementation Directive, work will proceed across 5 sequential gates:

```mermaid
flowchart LR
    G1["Phase 1: Security & Anti-SSRF Core"] --> G2["Phase 2: Database Schema & Migration 070"]
    G2 --> G3["Phase 3: Dispatcher, HMAC & Queue Engine"]
    G3 --> G4["Phase 4: Fastify REST API & OpenAPI 3.1 Parity"]
    G4 --> G5["Phase 5: Master Battery & Evidence Dossier"]
```

* **Phase 1: Egress Security & Cryptographic Core (Pure Logic)**
  * Implement `antiSsrfGuard.ts` with IPv4/IPv6 CIDR validation, socket connection pinning, and strict test-environment guard.
  * Implement `hmacSigner.ts` with RFC 8785 canonical string formatting, AES-256-GCM secret encryption with AAD, and dual-signature generation.
  * Verify 100% negative path coverage on private IP ranges, cloud metadata, and malformed URLs.
* **Phase 2: Database Persistence & Migration 070**
  * Author `070_saas_webhook_engine.sql` with preflight runtime assertion (SQLSTATE 55000), composite tenant foreign keys, separate event log (`payload_raw`), delivery queue, immutability trigger, purge function, and RLS policies.
  * Verify idempotency, non-CASCADE teardown, and absence of public schema leaks.
* **Phase 3: Queue Provider & Dispatcher Worker**
  * Implement `pgQueueProvider.ts` with atomic `SELECT ... FOR UPDATE SKIP LOCKED` claim logic and lease-token-fenced updates.
  * Implement `webhookDispatcher.ts` with stable outbound byte transmission, bounded timeouts, and error logging.
  * Verify retry scheduling, exponential backoff computation, and dead-letter transitions.
* **Phase 4: Fastify API Routes & Tenant Isolation**
  * Wire CRUD endpoints into `/api/vsaas/v1/webhooks` protected by `saasAuthPlugin` and application-level tenant isolation.
  * Enforce allowlisted schemas with `additionalProperties: false` in `schemas.ts`.
  * Update `apps/api/openapi-saas-v1.yaml` and pass automated drift verification.
* **Phase 5: Comprehensive Master Verification & Evidence Dossier**
  * Run full unit, integration, negative-path, concurrency, PII allowlist scrubbing, and security test suites.
  * Generate `reports/w022_master_verification_manifest.json` and implementation dossier.

---

## 10. Verification & Testing Strategy

### 10.1 Predictive Test Battery Architecture

```
========================================================================================================
Test Suite ID    File Name                                Target Component        Assertion Count (Min)
--------------------------------------------------------------------------------------------------------
W022-TEST-01     tests/webhooks-ssrf-guard.test.mjs       antiSsrfGuard.ts        30 assertions
W022-TEST-02     tests/webhooks-hmac-signatures.test.mjs  hmacSigner.ts           25 assertions
W022-TEST-03     tests/webhooks-delivery-lifecycle.test.mjs queueProvider.ts      25 assertions
W022-TEST-04     tests/webhooks-api-endpoints.test.mjs    routes.ts               30 assertions
W022-TEST-05     tests/webhooks-pii-scrubber.test.mjs     schemas.ts              20 assertions
W022-TEST-06     tests/saas-api-contract-drift.test.mjs   openapi-saas-v1.yaml    10 assertions
========================================================================================================
Total Expected Verifications: >= 140 Assertions across 6 Dedicated Suites
```

### 10.2 Mock Local Egress Test Harness (F-04)
To test real HTTP delivery without transmitting data over the external internet, the test suite will launch an ephemeral local HTTP receiver on a designated mock port (`localhost:9876`), configured with an explicit test-only override flag (`ALLOW_LOCALHOST_TEST_ONLY=true`) which is hardcoded to be functional **strictly when `NODE_ENV === 'test'`**.

---

## 11. Negative-Path Testing Specification

The test battery must prove that the system deterministically fails closed under adversarial conditions:

1. **SSRF Attack Scenarios (Must Reject):**
   * Target URL: `http://169.254.169.254/latest/meta-data` &rarr; `400 BLOCKED_PRIVATE_IP_ADDRESS`.
   * Target URL: `http://127.0.0.1:8000/internal` &rarr; `400 BLOCKED_PRIVATE_IP_ADDRESS`.
   * Target URL: `http://10.0.0.15/status` &rarr; `400 BLOCKED_PRIVATE_IP_ADDRESS`.
   * Target URL: `http://[::1]/debug` &rarr; `400 BLOCKED_PRIVATE_IP_ADDRESS`.
   * Target URL: `http://[fd00:ec2::254]/latest/meta-data` &rarr; `400 BLOCKED_PRIVATE_IP_ADDRESS`.
   * Target URL: `http://[::ffff:127.0.0.1]/admin` (IPv4-mapped IPv6) &rarr; `400 BLOCKED_PRIVATE_IP_ADDRESS`.
   * DNS Rebinding Simulation: Hostname resolving to `127.0.0.1` after validation &rarr; Connection abort.
2. **Protocol & Redirection Attacks (Must Reject):**
   * Non-HTTPS protocol: `file:///etc/passwd`, `ftp://server/`, `gopher://evil` &rarr; `400 INVALID_PROTOCOL_HTTPS_REQUIRED`.
   * 3xx Redirect Response: Target returns `302 Found` to internal IP &rarr; Marked failed, redirect not followed.
3. **Payload & Tamper Scenarios (Must Reject):**
   * Unknown payload property (e.g. `voter_name` or `extra_field`) &rarr; Schema validation fails with `422 UNRECOGNIZED_PAYLOAD_FIELD`.
   * Payload size > 256 KB &rarr; Deterministic `413 PAYLOAD_TOO_LARGE`.
   * Forged signature: Payload altered by 1 bit &rarr; Verification fails on consumer test harness.
   * Expired timestamp: Timestamp older than 300 seconds &rarr; Consumer harness rejects with `SIGNATURE_TIMESTAMP_EXPIRED`.
4. **Tenant Isolation Scenarios (F-01, F-03, F-09):**
   * Tenant B requests `GET /api/vsaas/v1/webhooks/:id` for Tenant A's endpoint &rarr; `404 NOT_FOUND`.
   * Tenant B attempts to rotate secret for Tenant A's endpoint &rarr; `404 NOT_FOUND`.
   * Attempting to insert a subscription with Tenant A's ID and Tenant B's Application ID &rarr; Database composite FK rejection (`23503 foreign_key_violation`).
   * Attempting to link a delivery for Tenant A to an event for Tenant B &rarr; Database composite FK rejection (`23503 foreign_key_violation`).
5. **Worker Lease Race Simulation (F-10):**
   * Worker A claims delivery, simulates 35-second stall (lease expires).
   * Worker B claims delivery and processes it.
   * Worker A attempts completion update &rarr; Update affects 0 rows, Worker A drops update.
6. **Direct Mutation & Purge Security Simulation (F-11, F-16, F-19):**
   * Direct SQL `UPDATE public.webhook_events SET payload = '{}'` &rarr; Trigger raises SQLSTATE `55000` (`MUTATION_FORBIDDEN`).
   * Direct SQL `DELETE FROM public.webhook_events` &rarr; Trigger raises SQLSTATE `55000` (`DELETE_UNAUTHORIZED`).
   * Executing `public.fn_purge_expired_webhook_data()` &rarr; Successfully deletes deliveries first, then orphaned events.

---

## 12. Evidence Generation Plan

Upon implementation authorization, the following cryptographically verifiable artifacts will be generated:
1. `reports/w022_preflight_inspection_report.json`: Pre-execution validation of Migration 056/057 baseline and Fastify routes.
2. `reports/w022_schema_contract_specification.json`: Structural contract of `webhook_subscriptions`, `webhook_events`, and `webhook_deliveries`.
3. `reports/w022_anti_ssrf_verification_ledger.json`: Empirical test log verifying rejection across 30+ RFC 1918/link-local test vectors.
4. `reports/w022_hmac_interoperability_dossier.json`: Verifiable test vectors with known keys, payloads, timestamps, and signatures.
5. `reports/w022_privacy_pii_scrub_audit.json`: Automated report confirming zero PII across all registered allowlisted event schemas.
6. `reports/w022_master_verification_manifest.json`: Unified 20/20 style manifest recording test run exit codes, execution times, and payload SHA-256 digests.

---

## 13. Reconciliation Plan

* **Register Synchronizations (Deferred to Implementation Phase - F-08):**
  * `EXECUTION_STATE.md`: Will be updated only upon formal implementation authorization directive; record W022 test pass metrics upon completion.
  * `ACCEPTANCE_REGISTER.md`: Add Milestone W022 entry detailing Migration 070, test battery results, and security guarantees upon independent adjudication.
  * `DECISION_LOG.md`: Record `DEC-W022-01` (Plan Ratification) and `DEC-W022-02` (Implementation Acceptance) upon formal issuance.
  * `RELEASE_REGISTER.md`: Synchronize new migration packages and OpenAPI specifications upon release.

---

## 14. Independent Verification Specification

In strict compliance with **Rule IV-001 (Non-Self-Acceptance)**:
* The implementing agent shall not declare W022 accepted.
* A separate independent verifier subagent (`TypeName: "self"`, `Role: "W022 Independent Verifier"`) will be spawned to independently execute:
  1. `tests/webhooks-ssrf-guard.test.mjs`.
  2. `tests/webhooks-hmac-signatures.test.mjs`.
  3. `tests/webhooks-delivery-lifecycle.test.mjs`.
  4. `tests/webhooks-api-endpoints.test.mjs`.
  5. `tests/webhooks-pii-scrubber.test.mjs`.
  6. `tests/saas-api-contract-drift.test.mjs`.
* The independent verifier will generate an unassisted verification report submitted directly to the CTO.

---

## 15. Risks, Failure Modes & Mitigations

| Risk / Failure Mode | Severity | Impact | Mitigation Strategy |
| :--- | :---: | :--- | :--- |
| **SSRF via DNS Rebinding** | **CRITICAL** | Attacker accesses cloud metadata or VPC resources. | Enforce custom HTTP agent that validates all resolved IPs pre-connect and pins the socket directly to the validated IP literal. |
| **Consumer Outage Queue Flooding** | **HIGH** | Failing endpoint exhausts queue table storage and worker polling cycles. | Bounded retries (max 5) with exponential backoff; automatic endpoint disabling after 20 consecutive dead-letter failures. |
| **Plaintext Secret Leakage** | **HIGH** | Attacker intercepts webhook signing secret and forges notifications. | Secrets stored encrypted via `AES-256-GCM` with AAD; returned only once upon creation; redacted in logs (`whsec_***`). |
| **Worker Stalling on Slow Endpoints** | **MEDIUM** | Slow partner servers tie up Fastify event loop or worker connections. | Strict 3-second connect timeout and 10-second total response timeout; isolated worker thread pool. |
| **Cross-Tenant Event Spying** | **CRITICAL** | Application receives events for another tenant's political entities. | Schema-level composite foreign keys across all 3 tables (`tenant_id, application_id`, `tenant_id, event_id`, `tenant_id, subscription_id`) and application-level tenant predicates enforced on every query. |
| **Worker Crash Mid-Delivery (F-02, F-10, F-20)** | **HIGH** | In-flight event is permanently lost or stuck in processing. | Worker leases are time-bounded (`lease_expires_at = now() + 30s`). Sweeper re-queues expired leases. Duplicate delivery accepted under at-least-once SLA; receiver deduplication mandated. |
| **Serialization Drift across Retries (F-17)** | **HIGH** | Signature or payload hash changes between retry attempts. | Store canonical string in `payload_raw` (RFC 8785) at event creation; transmit exact same UTF-8 buffer across all retries. |
| **Retention Purge Blocked by Immutability (F-16)** | **MEDIUM** | Table bloat occurs because trigger blocks DELETE operations. | Audited security definer procedure `fn_purge_expired_webhook_data` manages deletion order (deliveries first, orphaned events second) via session authorization token. |
| **Staging Schema Precondition Gap (F-09, F-19)** | **HIGH** | Migration 070 fails due to missing constraint `uq_saas_applications_tenant_app`. | Explicit preflight runtime assertion in Migration 070 failing with standard SQLSTATE `55000`. |

---

## 16. Safe Rollback & Recovery Strategy (F-05, F-15, F-21)

In accordance with findings F-05, F-15, and F-21, rollback procedures adhere to strict pre-conditions, dependency order, ownership, and data protection:

### 16.1 Decision Matrix: Rollback vs Forward Recovery (F-15, F-21)
* **Forward-Recovery Preferred (Default Operational Policy):**
  * If an operational defect is discovered in dispatch logic, retry backoff calculation, HMAC header formatting, or consumer timeout handling, the mandatory response is to deploy a forward code patch or pause outbound dispatches via the API (`status = 'paused'`).
  * Table deletion destroys audit history and is strictly prohibited for application-level defects.
* **Rollback Trigger Conditions (Restricted Exception):**
  * Rollback of database objects is authorized **ONLY** if Migration 070 DDL fails mid-migration, causes severe PostgreSQL system catalog corruption, or introduces unresolvable table lock contention that blocks core inbound REST API traffic.

### 16.2 Complete Backup Scope, Dependencies & Ownership (F-21)
* **Backup Scope & Granular Inventory:**
  * The pre-rollback backup must capture both schema DDL and table data across all core SaaS and webhook entities:
    `public.saas_tenants`, `public.saas_applications`, `public.saas_api_keys`, `public.saas_usage_ledger`, `public.webhook_subscriptions`, `public.webhook_events`, `public.webhook_deliveries`.
  * Command:
    ```bash
    pg_dump --host=$DB_HOST --username=$DB_USER --dbname=$DB_NAME \
      --format=custom \
      --table=public.saas_tenants \
      --table=public.saas_applications \
      --table=public.saas_api_keys \
      --table=public.saas_usage_ledger \
      --table=public.webhook_subscriptions \
      --table=public.webhook_events \
      --table=public.webhook_deliveries \
      --file=backup_w022_pre_rollback_$(date +%Y%m%d_%H%M%S).dump
    ```
* **Foreign-Key Dependency Chain:**
  * Dependency Level 0: `saas_tenants`
  * Dependency Level 1: `saas_applications` (references `saas_tenants`), `webhook_events` (references `saas_tenants`)
  * Dependency Level 2: `saas_api_keys` (references `saas_applications`), `saas_usage_ledger` (references `saas_tenants`, `saas_api_keys`), `webhook_subscriptions` (references `saas_applications`)
  * Dependency Level 3: `webhook_deliveries` (references `webhook_subscriptions`, `webhook_events`)
* **Ownership & Custody:**
  * Operational custody of backup archives is assigned strictly to the designated Database Administrator / Infrastructure Custodian.
  * Backup artifacts are stored in encrypted object storage with Write-Once-Read-Many (WORM) retention for 90 days.

### 16.3 In-Flight Worker Draining Protocol (F-15)
* Before executing any schema drop, worker processes must be gracefully terminated (`SIGTERM`) allowing in-flight HTTP requests 10 seconds to finish.
* Dispatch is verified drained: `SELECT count(*) FROM public.webhook_deliveries WHERE status = 'leased';` must equal 0 (or all leases expired past `leased_until`).

### 16.4 Mandatory Restoration Verification Test (F-21)
* Before executing destructive drop commands on Staging or Production:
  1. Spin up an ephemeral PostgreSQL Docker container: `docker run --name pg-restore-test -e POSTGRES_PASSWORD=test -d postgres:15-alpine`.
  2. Execute restore: `pg_restore -d postgres -U postgres backup_w022_pre_rollback.dump`.
  3. Verify row counts and integrity: Execute verification queries checking that row counts match pre-rollback audit and all constraints/indexes are valid.
  4. Only upon 100% restoration success is the rollback script authorized to execute on target infrastructure.

### 16.5 Safe Teardown Protocol (Non-CASCADE Policy - F-05, F-15)
* Tables must be dropped in strict reverse dependency order **WITHOUT** using `CASCADE`:
  ```sql
  BEGIN;
  -- Drop deliveries first (references events and subscriptions)
  DROP TABLE IF EXISTS public.webhook_deliveries RESTRICT;
  -- Drop events second (references saas_tenants)
  DROP TABLE IF EXISTS public.webhook_events RESTRICT;
  -- Drop subscriptions third (references saas_applications)
  DROP TABLE IF EXISTS public.webhook_subscriptions RESTRICT;
  -- Drop maintenance function
  DROP FUNCTION IF EXISTS public.fn_purge_expired_webhook_data(INTEGER, INTEGER);
  COMMIT;
  ```
* *Justification:* Omitting `CASCADE` ensures that if an unexpected downstream object depends on these tables, PostgreSQL will abort the transaction rather than silently dropping dependent structures.

### 16.6 Retention Consequences of Rollback (F-21)
* Dropping `webhook_deliveries` and `webhook_events` permanently deletes in-flight and historical event audit records.
* Data disposition rule: If rollback is executed, the pre-rollback backup dump must be archived in long-term compliance storage.

### 16.7 No Execution During Planning (F-15)
* No backup, restore, SQL, or database operations are authorized or executed during this planning directive.

---

## 17. Impact Assessment

* **Internal Mobile Consumer (`/api/v1/...`):** **ZERO IMPACT.** Mobile application does not consume or interact with B2B SaaS webhooks.
* **Inbound Partner REST API (`/api/vsaas/v1/...`):** **POSITIVE / EXTENSIVE.** Extends partner functionality without breaking existing routes or token authentication.
* **Database Performance (F-07, F-14):** **NEGLIGIBLE.** Event creation occurs within domain transactions with minimal overhead (<10 ms). Webhook polling uses `SKIP LOCKED` over dedicated partial indexes (`WHERE status IN ('queued', 'retrying', 'leased')`), eliminating row locks on non-queue tables.
* **Production Environment:** **ZERO IMPACT.** Production remains 100% air-gapped.

---

## 18. Evidence-Based Acceptance Criteria (F-07, F-14, F-18, F-20)

In accordance with findings F-07, F-14, F-18, and F-20, all acceptance criteria are measurable, evidence-backed, and explicitly labeled as future verification requirements:

> [!NOTE]
> All criteria below are **FUTURE ACCEPTANCE REQUIREMENTS** to be verified by test suites upon separate implementation authorization. None are claimed as already passed.

| Criterion ID | Verifiable Assertion / Requirement | Measurement Method & Environment | Pass/Fail Threshold |
| :--- | :--- | :--- | :--- |
| **`AC-W022-01`** | Composite foreign keys enforce tenant/application integrity across `webhook_subscriptions`, `webhook_events`, and `webhook_deliveries`. | Database Schema DDL & Negative SQL Test (Local PostgreSQL) | Insertion of mismatched `(tenant_id, application_id)` or `(tenant_id, event_id)` fails with `23503 foreign_key_violation`. |
| **`AC-W022-02`** | Event creation and delivery queue insertion execute atomically within a single database transaction. | Integration Unit Test (`webhooks-delivery-lifecycle.test.mjs`) | Rollback of domain transaction rolls back event and delivery queue records atomically (0 orphan rows). |
| **`AC-W022-03`** | Outbound dispatcher rejects RFC 1918, loopback, link-local, multicast, IPv4-mapped IPv6, and cloud metadata IPs. | Automated Unit Test (`webhooks-ssrf-guard.test.mjs`, 30+ vectors) | 100% rejection rate with error code `BLOCKED_PRIVATE_IP_ADDRESS`. |
| **`AC-W022-04`** | Localhost test override strictly fails closed when `NODE_ENV !== 'test'`. | Security Boundary Test (`webhooks-ssrf-guard.test.mjs`) | Booting dispatcher with `ALLOW_LOCALHOST_TEST_ONLY=true` under `NODE_ENV=production` immediately exits process with code 1. |
| **`AC-W022-05`** | Outbound payloads signed with `HMAC-SHA256` matching canonical format `${timestamp}.${payload_raw}`. | Cryptographic Test (`webhooks-hmac-signatures.test.mjs`) | Signature computed over `payload_raw` matches verification harness byte-for-byte using constant-time comparison. |
| **`AC-W022-06`** | Outbound payload bytes and SHA-256 digest remain byte-identical across initial dispatch and all retry attempts. | Retry Parity Test (`webhooks-delivery-lifecycle.test.mjs`) | Transmitted HTTP body across attempts 1–5 has identical SHA-256 digest matching `payload_sha256`. |
| **`AC-W022-07`** | Bounded retries executed across 5 exponential intervals (30s, 5m, 30m, 2h). | Queue Lifecycle Test (`webhooks-delivery-lifecycle.test.mjs`) | Failed attempt increments counter and computes exact `next_retry_at`. |
| **`AC-W022-08`** | Fifth failed attempt transitions delivery status to `dead_letter`. | Queue Lifecycle Test (`webhooks-delivery-lifecycle.test.mjs`) | Status equals `dead_letter`; zero subsequent retries scheduled. |
| **`AC-W022-09`** | Worker crash recovery reclaims expired leases after 30 seconds via lease-fenced updates. | Queue State Machine Test (`webhooks-delivery-lifecycle.test.mjs`) | Expired lease reclaimed by next worker; stalled worker completion update rejected (0 rows updated). |
| **`AC-W022-10`** | Complete multi-tenant isolation enforced on all CRUD routes. | Fastify Route Tests (`webhooks-api-endpoints.test.mjs`) | Cross-application and cross-tenant access returns 404; zero data leakage across tenants. |
| **`AC-W022-11`** | Allowlisted event schemas strictly reject unknown or nested fields (`additionalProperties: false`). | Automated Allowlist Test (`webhooks-pii-scrubber.test.mjs`) | Payloads with unvetted fields rejected with 422 `UNRECOGNIZED_PAYLOAD_FIELD`. |
| **`AC-W022-12`** | Database enqueue latency within local domain transaction remains within performance threshold. | Benchmarked Test Suite (Sample size: 10,000 synthetic events) | Database enqueue latency P99 < 10 ms under 100 concurrent requests. |
| **`AC-W022-13`** | Immutability trigger blocks direct SQL UPDATE/DELETE with SQLSTATE `55000`, while purge procedure succeeds. | SQL Security Test (`verification_070_webhook_engine.sql`) | Direct update/delete raises SQLSTATE 55000; `fn_purge_expired_webhook_data()` executes cleanly. |

---

## 19. Artifact & Commit Lineage Map

* **Authorizing Directive:** `CTO_DIRECTIVE_W022_IMPLEMENTATION_AUTHORIZATION_2026-10-25.md` (commit `39d0b680b7d266e73385edbbb96caff61e23d184`)
* **Planning Baseline HEAD:** `d93954a857b6e2d36d882534abdf7efdc1e2757e`  
* **Existing Implementation Commit (historical; predates this directive):** `3ac3f1c0c14d51d60bab9f9d3e88a08716466124`  
* **Prospective Authorization Commit:** `39d0b680b7d266e73385edbbb96caff61e23d184`
* **Document Location:** `PLAN-W022-REV-1.0.md` (Repository Root)
* **Target Delivery Commit:** Existing implementation is not independently accepted. Subsequent implementation commits must descend from authorization commit `39d0b680b7d266e73385edbbb96caff61e23d184`.

---

## 20. Amendment Compliance Matrix

| Amendment Clause | Governance Requirement | Compliance Mechanism in this Plan |
| :--- | :--- | :--- |
| **v1.5 Section 3** | Mandatory Planning & Review Gate | Plan created before any implementation or code modification. |
| **v1.5 Section 6** | Pre-Implementation Plan Contents | Incorporates task understanding, root cause, exact files, test & evidence strategy. |
| **v1.5-A Section 3** | Mandatory Execution States | Revision 4 is CTO-ratified; implementation is permitted prospectively, while verification and acceptance remain separate. |
| **v1.5-A Section 7** | Distinguish Facts from Assumptions | Explicit Section 4 Fact/Inference/Assumption/Unknown register included. |
| **v1.5-A Section 9** | Alternative Solutions Considered | Detailed evaluation of Redis/BullMQ vs PostgreSQL Outbox in Section 5.3. |
| **v1.5-A Section 10**| Exact Change Boundary | Exact files to create and modify specified in Section 7. |
| **v1.5-A Section 13**| Predictive Test Design | 6 dedicated suites with >= 140 assertions specified in Section 10. |
| **v1.5-A Section 17**| Claim-Based Acceptance Criteria | 13 binary verifiable criteria defined in Section 18. |
| **v1.5-A Section 26**| Canonical 22-Section Template | Plan adheres strictly to all 22 required section titles without omission. |
| **Rule IV-001** | Non-Self-Acceptance | Plan sign-off requested from CTO; independent verification mandated. |

---

## 21. Operational Declarations

In accordance with Section 27 of `AMENDMENT_v1.5-A.md`:

```text
================================================================================
W022 IMPLEMENTATION AUTHORIZATION DECLARATION (REVISION 4)
================================================================================
PLAN STATUS:                     APPROVED — REVISION 4
APPROVED PLAN VERSION:           REVISION 4
PLAN APPROVAL EVIDENCE:          CTO directive commit 39d0b680b7d266e73385edbbb96caff61e23d184
IMPLEMENTATION MAY BEGIN:        YES — PROSPECTIVELY, WITHIN APPROVED SCOPE
DATABASE ACCESS AUTHORIZED:      LOCAL ISOLATED TESTS ONLY; STAGING EXECUTION REQUIRES SEPARATE TOKEN
STAGING EXECUTION AUTHORIZED:    NO — SEPARATE EXPLICIT EXECUTION TOKEN REQUIRED
PRODUCTION ACCESS AUTHORIZED:    NO (STRICTLY AIR-GAPPED)
WORKING-TREE WRITE BOUNDARY:     W022 PLAN-SCOPED SOURCE, TESTS, EVIDENCE, AND GOVERNANCE FILES ONLY
GIT COMMITS / PUSHES CREATED:    AUTHORIZATION COMMIT RECORDED; SUBSEQUENT WORK MUST PRESERVE LINEAGE
================================================================================
```

---

## 22. Plan Sign-Off & Review Request

### 22.1 Strategic Architecture Questions for CTO Ratification
1. **Audited Retention Purge Procedure (`fn_purge_expired_webhook_data`):** Does the CTO approve the two-step purge procedure (deleting deliveries first, then orphaned events second via a session authorization token) to reconcile event immutability with 30-day retention?
2. **Raw Canonical String Persistence (`payload_raw`):** Does the CTO approve persisting the RFC 8785 canonical string `payload_raw` alongside binary `JSONB` to ensure 100% byte-exact payload and HMAC parity across retries?
3. **Allowlisted Schema Enforcement:** Does the CTO approve the allowlisted JSON Schema specification with `additionalProperties: false` as the formal privacy control, with zero-PII status classified as proposed pending implementation test evidence?

### 22.2 Plan Submission & Stopping Rule
This revision records prospective CTO ratification under `CTO_DIRECTIVE_W022_IMPLEMENTATION_AUTHORIZATION_2026-10-25.md`. W022 implementation and remediation may proceed within the approved scope. The historical implementation commit remains distinct from the prospective authorization coordinate; independent verification, staging execution authorization, production access, and final acceptance remain separate gates.
