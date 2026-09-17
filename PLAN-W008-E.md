# SUB-JOB W008-E DISCOVERY & IMPLEMENTATION PLAN — REVISION 1.1
## REMAINING API CONTRACT STANDARDIZATION & ADOPTION SURFACE

---

### OPERATIONAL STATUS & AUTHORIZATION DECLARATION

```text
================================================================================
W008-E DISCOVERY & IMPLEMENTATION PLAN REVISION 1.1
GOVERNANCE & IMPLEMENTATION AUTHORIZATION STATUS
================================================================================

PLAN STATUS:                         SUBMITTED FOR CTO REVIEW
IMPLEMENTATION AUTHORIZATION:        NO
AUTHORIZED JOB:                       NONE
APPROVED PLAN VERSION:                NONE
IMPLEMENTATION AUTHORIZATION COMMIT:  NONE
AUTHORIZED SCOPE_HASH:               NONE
AUTHORIZED BASE HEAD:                 19f2a7a9954b2f4ddd873646aaa31c2581c86fdc
EXECUTION MODE:                       STRICTLY PLANNING & DISCOVERY ONLY
PRODUCT CODE MODIFICATION:           NO (apps/, packages/, supabase/ FROZEN)
W008-E IMPLEMENTATION:               NOT STARTED / FROZEN
W009:                                 NOT AUTHORIZED / FROZEN
STOP:                                 YES (AWAITING CTO REVIEW & AUTHORIZATION)

================================================================================
```

---

## 1. Executive Summary

Sub-Job W008-E governs the comprehensive contract standardization, Ajv schema hardening, canonical error-envelope unification, and mobile client adoption across the remaining Fastify HTTP route surface following the CTO acceptance and closure of W008-C (Server States hardening) and W008-D (Mobile StatesEndpoint adoption) at baseline commit `19f2a7a9954b2f4ddd873646aaa31c2581c86fdc`.

Through empirical auditing of all Fastify route registrations, this plan disproves the historical unverified assumption of "105 unstandardized routes" and establishes a one-to-one mechanical reconciliation:
- **Total Static Route Registrations**: **138 registrations** across 24 source files (23 route modules + `server.ts`).
- **Already Contract-Standardized**: **36 registrations** (Phase 1 Moderation/Notifications/Civic/States, Pioneer Config/News/Pages, and System Health Probes).
- **Legitimate Architectural Exceptions**: **3 registrations** (`GET /` root container probe, `GET /api/debug/error` diagnostic seam, `GET /api/metrics` telemetry).
- **Duplicate / Redundant Registrations**: **1 registration** (`GET /health` in `health.ts` duplicates `server.ts:211`).
- **W008-E Candidate Surface**: **98 registrations** genuinely requiring W008-E standardization.
- **Exact Reconciliation Formula**: 36 (Standardized) + 3 (Exceptions) + 1 (Duplicate) + 98 (Candidates) = 138 (Total Registrations).

To guarantee zero regression, preserve the LIGHTNING FAST performance mandate, and maintain strict control over blast radius, W008-E decomposes the 98 candidate routes into 5 bounded, independently verifiable implementation batches:
- **Batch 1 (Core Political Geography Reads)**: `constituencies.ts` (8 routes) + `geo.ts` (2 routes) = **10 routes**.
- **Batch 2 (Civic Information Feeds & Statutory Policies)**: `politician.ts` (9 routes) + `policy.ts` (3 routes) + `news.ts:refresh` (1 route) = **13 routes**.
- **Batch 3 (Delimitation Simulation Algorithms & AI Pipelines)**: `delimitation.ts` (14 routes) + `ai.ts` (7 routes) = **21 routes**.
- **Batch 4 (Journalist Portal, Media Outreach & LMX)**: `journalist.ts` (8 routes) + `broadcast.ts` (3 routes) + `lmx.ts` (11 routes) = **22 routes**.
- **Batch 5 (High-Risk Mutations, Transactions & Management)**: `campaign.ts` (16 routes) + `politicalAds.ts` (6 routes) + `pages.ts` Pro routes (3 routes) + `dm.ts` (6 routes) + `manage.ts` (1 route) = **32 routes**.
- **Exact Batch Sum**: 10 + 13 + 21 + 22 + 32 = **98 Candidates**.

---

## 2. Ground-Truth Baseline

### 2.1 Repository & Commit Coordinates
- **Repository URL**: `https://github.com/kshetra-app/Kshetra.git`
- **Canonical Branch**: `master`
- **Baseline HEAD Commit**: `19f2a7a9954b2f4ddd873646aaa31c2581c86fdc`
- **Remote Tracking `origin/master`**: `19f2a7a9954b2f4ddd873646aaa31c2581c86fdc`
- **Base Tree SHA**: `4141dd6a48ae8ceff5b7228335270cb56f926ea0`
- **Accepted Predecessor (W008-D Completion)**: `19f2a7a9954b2f4ddd873646aaa31c2581c86fdc`
- **Accepted Predecessor (W008-D Authorization Parent)**: `e236e78ffc57f212699f76f7d3dcfae41d0389b8`
- **Working-Tree Status**: Clean (untracked planning deliverables only)

---

## 3. Route Counting Definitions & Reconciliation

### 3.1 Strict Mechanical Definitions
1. **Static Route Registrations (138)**: The exact mechanical count of Fastify route registration calls (`app.get`, `app.post`, etc.) declared in source files.
2. **Prefix-Expanded Effective Route Identities (138)**: The effective routing paths resulting from prefix mounting in `server.ts` (e.g. `constituencies.ts` mounted at `/api/v1`, `health.ts` mounted at `/api`, `metrics.ts` mounted at `/api`, `debug.ts` mounted at `/api`).
3. **Unique Route/Method Operations (137)**: Unique HTTP method and effective path combinations after removing the single duplicate (`GET /health`).
4. **Standardized Routes (36)**: Routes with full Ajv request/response schemas, canonical envelope error handling, or verified system probes.
5. **Legitimate Exceptions (3)**: Routes intentionally exempt from normal standard contracts (`GET /` container probe, `GET /api/debug/error` test seam, `GET /api/metrics` Prometheus endpoint).
6. **Duplicate Registrations (1)**: `GET /health` in `health.ts:13`, which duplicates `server.ts:211`.
7. **W008-E Candidates (98)**: Routes genuinely requiring Ajv schema definition, canonical error envelopes, and client adoption.

---

## 4. Reconciled 24-Source-File Distribution Table

| # | Source File | Total Registrations | Standardized | Exceptions | Duplicates | Candidates |
|---|---|---|---|---|---|---|
| 1 | `apps/api/src/routes/ai.ts` | 7 | 0 | 0 | 0 | 7 |
| 2 | `apps/api/src/routes/broadcast.ts` | 3 | 0 | 0 | 0 | 3 |
| 3 | `apps/api/src/routes/campaign.ts` | 16 | 0 | 0 | 0 | 16 |
| 4 | `apps/api/src/routes/civic.ts` | 11 | 11 | 0 | 0 | 0 |
| 5 | `apps/api/src/routes/config.ts` | 1 | 1 | 0 | 0 | 0 |
| 6 | `apps/api/src/routes/constituencies.ts` | 8 | 0 | 0 | 0 | 8 |
| 7 | `apps/api/src/routes/debug.ts` | 1 | 0 | 1 | 0 | 0 |
| 8 | `apps/api/src/routes/delimitation.ts` | 14 | 0 | 0 | 0 | 14 |
| 9 | `apps/api/src/routes/dm.ts` | 6 | 0 | 0 | 0 | 6 |
| 10 | `apps/api/src/routes/geo.ts` | 2 | 0 | 0 | 0 | 2 |
| 11 | `apps/api/src/routes/health.ts` | 6 | 5 | 0 | 1 | 0 |
| 12 | `apps/api/src/routes/journalist.ts` | 8 | 0 | 0 | 0 | 8 |
| 13 | `apps/api/src/routes/lmx.ts` | 11 | 0 | 0 | 0 | 11 |
| 14 | `apps/api/src/routes/manage.ts` | 1 | 0 | 0 | 0 | 1 |
| 15 | `apps/api/src/routes/metrics.ts` | 1 | 0 | 1 | 0 | 0 |
| 16 | `apps/api/src/routes/moderation.ts` | 9 | 9 | 0 | 0 | 0 |
| 17 | `apps/api/src/routes/news.ts` | 2 | 1 | 0 | 0 | 1 |
| 18 | `apps/api/src/routes/notifications.ts` | 5 | 5 | 0 | 0 | 0 |
| 19 | `apps/api/src/routes/pages.ts` | 4 | 1 | 0 | 0 | 3 |
| 20 | `apps/api/src/routes/policy.ts` | 3 | 0 | 0 | 0 | 3 |
| 21 | `apps/api/src/routes/politicalAds.ts` | 6 | 0 | 0 | 0 | 6 |
| 22 | `apps/api/src/routes/politician.ts` | 9 | 0 | 0 | 0 | 9 |
| 23 | `apps/api/src/routes/states.ts` | 2 | 2 | 0 | 0 | 0 |
| 24 | `apps/api/src/server.ts` | 2 | 1 | 1 | 0 | 0 |
| **TOTAL** | **24 Files** | **138** | **36** | **3** | **1** | **98** |

---

## 5. Standardization Definition

Conforming strictly to canonical patterns established in W008-C and W008-D, a route is defined as Standardized if and only if it satisfies all four dimensions:
- **Request Contract**: Strict type, regex pattern constraints for parameters, explicit whitelist of permitted query keys, pagination bounds (minimum: 1, maximum: 100), and JSON Schema for bodies.
- **Response Contract**: Explicit 200/201 response schema with required properties, explicit nullability, and structured collection objects.
- **Error Contract**: Non-2xx status codes formatted via `sendApiError` (`apps/api/src/lib/replyHelper.ts`) with zero raw database exception leakage.
- **Security Contract**: Explicit authentication hooks (`requireAuth`) where applicable and verified server-side role resolution.

---

## 6. Exact Route Classifications

Full per-route classification records (138 entries) are stored in `reports/w008_e_route_inventory.json`.
Summary counts by disposition:
- `ALREADY_STANDARDIZED`: **36**
- `LEGITIMATE_EXCEPTION`: **3**
- `DUPLICATE_OR_REDUNDANT`: **1**
- `REQUIRES_STANDARDIZATION`: **98**
- **TOTAL**: **138**

---

## 7. Safe Five-Batch Decomposition & Complete Candidate Mapping

The 98 candidate routes are partitioned into 5 sequential, independently verifiable batches:

### Batch 1: Core Political Geography Reads (10 Candidates)
- `GET /api/v1/states/:stateCode/constituencies` (`apps/api/src/routes/constituencies.ts`)
- `GET /api/v1/states/:stateCode/constituencies/:constituencyId` (`apps/api/src/routes/constituencies.ts`)
- `GET /api/v1/states/:stateCode/constituencies/search` (`apps/api/src/routes/constituencies.ts`)
- `GET /api/v1/states/:stateCode/analytics` (`apps/api/src/routes/constituencies.ts`)
- `GET /api/v1/states/:stateCode/mla/:acNo` (`apps/api/src/routes/constituencies.ts`)
- `GET /api/v1/states/:stateCode/mla` (`apps/api/src/routes/constituencies.ts`)
- `GET /api/v1/states/:stateCode/elections` (`apps/api/src/routes/constituencies.ts`)
- `GET /api/v1/constituencies/locate` (`apps/api/src/routes/constituencies.ts`)
- `GET /geo/manifest.json` (`apps/api/src/routes/geo.ts`)
- `GET /geo/:file` (`apps/api/src/routes/geo.ts`)

### Batch 2: Civic Information Feeds & Statutory Policies (13 Candidates)
- 9 routes in `apps/api/src/routes/politician.ts` (`/profiles`, `/profiles/:id`, `/events`, `/events/:id/rsvp`, `/manifestos`, `/manifestos/.../vote`, `/surveys`, `/surveys/:id/respond`, `/grievances`)
- 3 routes in `apps/api/src/routes/policy.ts` (`/policy/grievance`, `/policy/community-guidelines`, `/api/v1/grievances/intake`)
- 1 route in `apps/api/src/routes/news.ts` (`POST /api/v1/news/refresh`)

### Batch 3: Delimitation Simulation & AI Pipelines (21 Candidates)
- 14 routes in `apps/api/src/routes/delimitation.ts` (`/simulation`, `/projections`, `/commission`, `/maps`, `/impact`, etc.)
- 7 routes in `apps/api/src/routes/ai.ts` (`/chat`, `/analyze/constituency/:acNo`, `/analyze/trends`, etc.)

### Batch 4: Journalist Portal, Media Outreach & LMX (22 Candidates)
- 8 routes in `apps/api/src/routes/journalist.ts` (`/articles`, `/articles/:id`, `/fact-checks`, `/breaking`, `/profiles`, `/vouch`, `/flag`, `/tip`)
- 3 routes in `apps/api/src/routes/broadcast.ts` (`/streams`, `/live`, `/recordings`)
- 11 routes in `apps/api/src/routes/lmx.ts` (`/status`, `/live`, `/departments`, `/alerts`, `/distribution`, etc.)

### Batch 5: High-Risk Mutations, Transactions & Management (32 Candidates)
- 16 routes in `apps/api/src/routes/campaign.ts` (voter outreach, volunteer ops, wallet/payments, OBD voice calls)
- 6 routes in `apps/api/src/routes/politicalAds.ts` (ad submission, ECI/MCMC review queue, certification, library)
- 3 routes in `apps/api/src/routes/pages.ts` (`/details/:pageId`, `/pro/order`, `/pro/verify`)
- 6 routes in `apps/api/src/routes/dm.ts` (conversations, messages, accept, decline, block-report, unread-count)
- 1 route in `apps/api/src/routes/manage.ts` (`GET /manage` web manager shell)

### Exact Batch Sum Reconciliation:
10 (Batch 1) + 13 (Batch 2) + 21 (Batch 3) + 22 (Batch 4) + 32 (Batch 5) = **98 Candidates**.

---

## 8. Batch 1 — Implementation Scope & Evidence-Based Justification

Following rigorous inspection of client networking code and verification tooling, the implementation scope for Batch 1 is strictly confined to the exact files requiring modification:

### 8.1 Included Implementation Files (2 Files):
1. `apps/api/src/routes/constituencies.ts`:
   - **Why it must change**: Currently lacks Ajv schemas for path params (`:stateCode`, `:constituencyId`, `:acNo`), query strings (search filters, locate coordinates), and 200 responses. Returns unformatted 400/404 errors instead of canonical `replyHelper` envelope.
   - **Expected change**: Attach formal Ajv schemas and wire `sendApiError`.
   - **Layer**: Server API route module.
2. `apps/api/src/routes/geo.ts`:
   - **Why it must change**: Currently lacks Ajv validation on `/geo/:file` params and `/geo/manifest.json` responses. Negative 400/404 responses are unformatted.
   - **Expected change**: Attach formal Ajv schemas and wire `sendApiError`.
   - **Layer**: Server API route module.

### 8.2 Excluded Files (Evidence-Based Elimination):
- `apps/mobile/lib/enrichedGeoCache.ts`: **EXCLUDED**. Audit proves this client loader fetches `/geo/geo-manifest.json` directly. Standardizing the server response schema and error envelope does NOT alter the JSON payload structure consumed by `enrichedGeoCache.ts`. Zero client code modification is required.
- `apps/mobile/lib/remoteGeoLoader.ts`: **EXCLUDED**. Audit proves this client loader downloads `/geo/:file` as raw gzipped binary/JSON files to local disk via `FileSystem.downloadAsync`. Fastify schema attachments on the server do not alter the streamed GeoJSON asset bytes. Zero client code modification is required.
- `scripts/check-api-contract-drift.mjs`: **EXCLUDED**. This CI verification tool is an audit instrument, not a product implementation file. Contract-drift validation will be executed independently without mutating the committed baseline tool.

---

## 9. Batch 1 Canonical Scope Hash

### 9.1 Deterministic Derivation Algorithm
1. Read exact file bytes from working tree at baseline `19f2a7a9954b2f4ddd873646aaa31c2581c86fdc`.
2. Compute SHA-256 digest of each file.
3. Normalize file paths with repository-relative forward slashes (`/`).
4. Sort file records lexicographically by path.
5. Serialize each record as `<path>:<sha256>\n`.
6. Terminate manifest with a final newline (`\n`).
7. Compute SHA-256 of the complete serialized manifest bytes.

### 9.2 Literal Canonical Serialized Manifest (Batch 1 — 2 Files)

```text
apps/api/src/routes/constituencies.ts:6ad72e946584d7ce42a43b725dcb295077dc76b1cb063e95f92f8914fab984f5
apps/api/src/routes/geo.ts:42a77420bef05d6f8a5555acc1485bcd71643b4c9de27d929cae83bd3a8c106d
```

### 9.3 Derived Canonical Scope Hash (Batch 1)
```text
CANONICAL_SCOPE_HASH: 26f5521824b92ee7cb10f008708292d9dd18e36db8bafab0e67d300527d39a0a
```

---

## 10. Acceptance Criteria for Batch 1

1. 100% of the 10 Batch 1 routes have complete Ajv JSON schemas for parameters, querystrings, and 200 responses.
2. Zero raw exceptions leaked; all negative error paths routed via `sendApiError`.
3. Fastify TypeScript build passes with zero errors (`npm run build --prefix apps/api`).
4. Mobile TypeScript build passes with zero errors (`npx tsc --noEmit -p apps/mobile/tsconfig.json`).
5. Contract drift gate passes.
6. Automated negative test suite passes for malformed parameters and missing resources.

---

## 11. Governance / Authorization State

- Current Governance Baseline: Master Execution Framework Amendment v1.6, DEC-048, DEC-049, DEC-050.
- Implementation Authorization: **NO**
- Authorized Job: **NONE**
- Product Implementation: **FROZEN**
- W008-E Implementation: **NOT STARTED**
- W009: **NOT AUTHORIZED / FROZEN**

---

## 12. STOP Condition

Upon generation and persistence of this plan (`PLAN-W008-E.md`) and the machine-readable route inventory (`reports/w008_e_route_inventory.json`), the agent must immediately **STOP**.
Zero product modifications are permitted. Zero implementation commits may be created. The agent must await formal CTO review and explicit implementation authorization.
