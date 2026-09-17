# SUB-JOB W008-D VERIFICATION PLAN — REVISION 2.3
## CANONICAL MOBILE CLIENT STATES ENDPOINT RECONCILIATION & ADOPTION (STRICTLY VERIFICATION-ONLY)

---

### OPERATIONAL STATUS & AUTHORIZATION DECLARATION

```text
================================================================================
W008-D VERIFICATION PLAN REVISION 2.3
IMPLEMENTATION AUTHORIZATION STATUS
================================================================================

PLAN STATUS:                         SUBMITTED FOR CTO REVIEW / NOT YET AUTHORIZED
IMPLEMENTATION AUTHORIZATION:        NO
AUTHORIZED JOB:                       NONE
APPROVED PLAN VERSION:                NONE
IMPLEMENTATION AUTHORIZATION COMMIT:  NONE
AUTHORIZED SCOPE_HASH:               NONE
AUTHORIZED BASE HEAD:                 NONE
EXECUTION MODE:                       STRICTLY VERIFICATION-ONLY (modificationScope: [])
PRODUCT CODE:                         STRICTLY FROZEN (apps/, packages/, supabase/)
W008-E:                               STRICTLY NOT AUTHORIZED / FROZEN
W009:                                 STRICTLY NOT AUTHORIZED / FROZEN
STOP:                                 YES (AWAITING CTO REVIEW & AUTHORIZATION)

================================================================================
```

---

## 1. Document Title & Metadata

- **Document Identifier**: `PLAN-W008-D-REV-2.3`
- **Revision**: 2.3 (Deterministic Canonical Scope Hash Specification, Reproducibility Algorithm & Negative Test Suite conforming to CTO Final Scope-Hash Correction Directive)
- **Supersedes**: `PLAN-W008-D-REV-2.2` (returned for canonical scope hash derivation algorithm specification)
- **Date**: 2026-09-17
- **Operating Authority**: Master Execution Framework Amendment v1.5-A, Amendment v1.6, DEC-048, DEC-049, Rule IV-001, and `AGENT_EXECUTION_PROTOCOL.md`
- **Target Repository**: `kshetra-app/Kshetra`
- **Canonical Branch**: `master`
- **Derived Local HEAD**: `9a6fef6a9c156932b680ff7e16df20a4dc5a9d59`
- **Derived Remote `origin/master`**: `9a6fef6a9c156932b680ff7e16df20a4dc5a9d59`
- **Derived Remote GitHub `refs/heads/master`**: `9a6fef6a9c156932b680ff7e16df20a4dc5a9d59`
- **Base Commit Tree SHA (`HEAD^{tree}`)**: `0bdc85a8135d259b4bbad7f69a871f8d22f84186`
- **Accepted W008-C Implementation Commit**: `89847041d0d9d93d348ed7bc2a5556dcc2c74f8b`
- **Ratified REV-8 Governance Baseline**: `9a6fef6a9c156932b680ff7e16df20a4dc5a9d59`
- **Execution Mode**: **Strictly Verification-Only** (`modificationScope: []`)

---

## 2. Problem Statement (Task Understanding & Core Objectives)

### Task Understanding
Sub-Job W008-C standardized and hardened the Fastify server-side States domain contracts (`GET /api/v1/states`, `GET /api/v1/states/:code`), which were formally accepted and closed by the CTO in DEC-049 at commit `89847041d0d9d93d348ed7bc2a5556dcc2c74f8b`.

In historical commit `0d75d29c02512d5bc17839a5ef4730bdc5d389d5` (preserved in Git provenance as `UNAUTHORIZED HISTORICAL IMPLEMENTATION`), a corresponding client-side `StatesEndpoint` was authored inside `apps/mobile/lib/api/endpoints/states.ts` and wired into `apps/mobile/lib/api/client.ts`. Under Rule IV-001 and Amendment v1.5-A, that client implementation has **never been independently verified, governed, or formally adopted**.

### Core Objectives
1. Perform an independent, empirical verification of the existing mobile client `StatesEndpoint` against the accepted server-side contracts from W008-C.
2. Formally evaluate whether `StatesEndpoint` satisfies all semantic, structural, and runtime validation criteria required for adoption into the canonical mobile API client.
3. Enforce a mechanical mutation guard proving zero product code modifications occur against the authorized base commit.
4. Establish an exact, mathematically reproducible canonical scope hash algorithm with deterministic file hashing, path normalization, lexicographical sorting, and record serialization terminating with `\n`.
5. Eliminate all self-referential or circular scope definitions between plan files and canonical execution hashes.
6. Provide verifiable negative test proofs asserting fail-closed behavior on corrupted responses, network failures, governance tampering, scope circularity, and canonical serialization mutations.
7. Submit the verification package for CTO review and final adoption ratification without self-certification.

---

## 3. Current State Analysis & Ground-Truth Reconciliation

### 3.1 Exact Derived Git Repository State
- **Local HEAD**: `9a6fef6a9c156932b680ff7e16df20a4dc5a9d59`
- **Tracking `origin/master`**: `9a6fef6a9c156932b680ff7e16df20a4dc5a9d59`
- **Live Remote GitHub `master`**: `9a6fef6a9c156932b680ff7e16df20a4dc5a9d59`
- **Base Commit Tree SHA**: `0bdc85a8135d259b4bbad7f69a871f8d22f84186`

### 3.2 Exact Route Registrations & Master Manifest
The repository contains **exactly 138 unique Fastify route registrations** across 24 source files (23 route modules under `apps/api/src/routes/` plus `apps/api/src/server.ts`).

#### Route Distribution by File:
1. `apps/api/src/server.ts`: 2 registrations (`/`, `/health`)
2. `apps/api/src/routes/ai.ts`: 7 registrations
3. `apps/api/src/routes/broadcast.ts`: 3 registrations
4. `apps/api/src/routes/campaign.ts`: 16 registrations
5. `apps/api/src/routes/civic.ts`: 11 registrations (Phase 1 Standardized)
6. `apps/api/src/routes/config.ts`: 1 registration (Pioneer Standardized)
7. `apps/api/src/routes/constituencies.ts`: 8 registrations
8. `apps/api/src/routes/debug.ts`: 1 registration
9. `apps/api/src/routes/delimitation.ts`: 14 registrations
10. `apps/api/src/routes/dm.ts`: 6 registrations
11. `apps/api/src/routes/geo.ts`: 2 registrations
12. `apps/api/src/routes/health.ts`: 6 registrations (3 root registrations + 3 derived `/api` aliases)
13. `apps/api/src/routes/journalist.ts`: 8 registrations
14. `apps/api/src/routes/lmx.ts`: 11 registrations
15. `apps/api/src/routes/manage.ts`: 1 registration
16. `apps/api/src/routes/metrics.ts`: 1 registration
17. `apps/api/src/routes/moderation.ts`: 9 registrations (Phase 1 Standardized)
18. `apps/api/src/routes/news.ts`: 2 registrations (1 Pioneer Standardized, 1 refresh)
19. `apps/api/src/routes/notifications.ts`: 5 registrations (Phase 1 Standardized)
20. `apps/api/src/routes/pages.ts`: 4 registrations (1 Pioneer Standardized, 3 unmigrated)
21. `apps/api/src/routes/policy.ts`: 3 registrations
22. `apps/api/src/routes/politicalAds.ts`: 6 registrations
23. `apps/api/src/routes/politician.ts`: 9 registrations
24. `apps/api/src/routes/states.ts`: 2 registrations (Phase 1 Standardized)
**Total Route Registrations**: $2 + 7 + 3 + 16 + 11 + 1 + 8 + 1 + 14 + 6 + 2 + 6 + 8 + 11 + 1 + 1 + 9 + 2 + 5 + 4 + 3 + 6 + 9 + 2 = 138$.

### 3.3 Exact Number of Currently Schema-Covered Routes
There are **exactly 33 schema-covered routes** in the active repository:
- `civic.ts`: 11 routes
- `config.ts`: 1 route
- `moderation.ts`: 9 routes
- `news.ts`: 1 route (`GET /api/v1/news/feed`)
- `notifications.ts`: 5 routes
- `pages.ts`: 1 route (`GET /api/v1/pages/:pageId/entitlement`)
- `states.ts`: 2 routes (`GET /api/v1/states`, `GET /api/v1/states/:code`)
- `health.ts`: 3 routes (`/api/health`, `/api/health/db`, `/api/health/ready`)
**Total Schema-Covered Routes**: $11 + 1 + 9 + 1 + 5 + 1 + 2 + 3 = 33$.  
*(The remaining 105 route registrations do not possess Ajv validation schemas and are assigned to future sub-job W008-E).*

### 3.4 Exact Meaning & Denominator of `34/34 D0_IN_SYNC`
In `scripts/check-api-contract-drift.mjs`, the output reports:
```text
Zero drift detected strictly across the 34 audited endpoints (does not prove zero drift across 138 routes).
```
**Ground-Truth Deconstruction**:
- **Denominator (34)**: Represents the fixed audit array `auditedContracts` defined in `scripts/check-api-contract-drift.mjs` lines 174–218. This array explicitly samples:
  - 7 System & Pioneer endpoints (`/health`, `/api/health`, `/api/health/db`, `/config/flags`, `PATCH /config/flags`, `/pages/:id/entitlement`, `/news/feed`).
  - 2 States domain endpoints (`GET /api/v1/states`, `GET /api/v1/states/:code`).
  - 9 Moderation domain endpoints.
  - 5 Notifications domain endpoints.
  - 11 Civic domain endpoints.
  Total sampled = $7 + 2 + 9 + 5 + 11 = 34$.
- **Meaning of `D0_IN_SYNC`**: For each of these 34 explicitly defined contract expectations, the drift checker verifies that the Fastify server has a matching route with the expected HTTP verb and path.
- **Critical Limitation**: It audits **only 34 endpoints**. It does **NOT** prove zero drift across the entire 138-route catalog. The remaining 104 endpoints are unverified by this check.

### 3.5 Exact Tracked State of Mobile Files
1. `apps/mobile/lib/api/endpoints/states.ts`: Tracked in Git since commit `0d75d29`. Contains `StateInfoDTO`, `StatesListResponseDTO`, runtime validator functions `validateStateInfo()` and `validateStatesListResponse()`, and `StatesEndpoint` class with methods `listStates()` and `getState()`.
2. `apps/mobile/lib/api/client.ts`: Exposes `readonly states: StatesEndpoint` instantiated in constructor (`this.states = new StatesEndpoint(this);`).
3. `apps/mobile/lib/api/index.ts`: Re-exports `export * from './endpoints/states';`.
4. `apps/mobile/lib/api/types.ts`: Contains Pioneer DTO types. Does not redefine states DTOs (which reside cleanly in `endpoints/states.ts`).
5. `apps/mobile/__tests__/apiClient.test.ts`: Contains Section 11 tests: `apiClient.states.listStates`, `apiClient.states.getState`, `STATES NP-1` (malformed payload rejection), `STATES NP-2` (missing code rejection).

### 3.6 Exact Historical Provenance of StatesEndpoint
- Authored in commit `0d75d29c02512d5bc17839a5ef4730bdc5d389d5` on 2026-09-12.
- Commit `0d75d29` was rejected by the CTO under DEC-042/DEC-043 for violating pre-implementation authorization controls.
- The server-side states contracts were subsequently authorized, re-implemented, verified, and accepted in Sub-Job W008-C at commit `89847041d0d9d93d348ed7bc2a5556dcc2c74f8b`.
- The client-side code remained physically present in the working tree and commit history, but its formal governance status has remained `PROPOSED / NOT AUTHORIZED / UNVERIFIED` awaiting W008-D.

### 3.7 Exact Accepted Server-Side States Contract (from W008-C)
From `apps/api/src/routes/states.ts` (accepted in DEC-049):
1. **`GET /api/v1/states`**:
   - Schema: `{ "response": { "200": { "type": "object", "properties": { "states": { "type": "array" } }, "required": ["states"] } } }`.
   - Handler returns `{ states: getAllStatesInfo() }`. Each item in the array contains `{ code, name, totalSeats, loadedCount, dataStatus, hasGeoJSON }`.
2. **`GET /api/v1/states/:code`**:
   - Params Schema: `{ "code": { "type": "string", "pattern": "^[A-Z]{2}$" } }`, `required: ["code"]`.
   - Response Schema:
     ```json
     {
       "response": {
         "200": {
           "type": "object",
           "properties": {
             "code": { "type": "string" },
             "name": { "type": "string" },
             "totalSeats": { "type": "number" },
             "dataStatus": { "type": "string" },
             "hasAnalytics": { "type": "boolean" },
             "hasDelimitationSimulation": { "type": "boolean" },
             "hasCandidates": { "type": "boolean" }
           },
           "required": ["code", "name", "totalSeats", "dataStatus"]
         }
       }
     }
     ```
   - 404 Response: `sendApiError(reply, request, 404, 'Not Found', 'State ${code} not found')`.

---

## 4. Fact / Inference / Assumption / Unknown Register

| Category | Item | Evidence / Ground Truth |
| :--- | :--- | :--- |
| **FACT** | Local HEAD and `origin/master` match `9a6fef6a9c156932b680ff7e16df20a4dc5a9d59`. | `git rev-parse HEAD` and GitHub API query. |
| **FACT** | W008-C is accepted and closed. | `DECISION_LOG.md` DEC-049, `EXECUTION_STATE.md`. |
| **FACT** | Fastify routes total exactly 138 registrations across 24 files. | `scripts/check-api-contract-drift.mjs` AST scan. |
| **FACT** | Schema-covered Fastify routes total exactly 33. | `reports/w008_api_contract_inventory.json`. |
| **FACT** | Drift check audits exactly 34 sampled endpoints. | `scripts/check-api-contract-drift.mjs` line 174. |
| **FACT** | `StatesEndpoint` is already written in `apps/mobile/lib/api/endpoints/states.ts`. | Tracked since `0d75d29`. |
| **FACT** | `StatesEndpoint` tests already exist in `apps/mobile/__tests__/apiClient.test.ts`. | Section 11 lines 958–1011. |
| **INFERENCE** | `StatesEndpoint` is technically compatible with server-side `states.ts` routes, but must be formally evaluated rather than assumed valid. | Server accepts `^[A-Z]{2}$` and returns `{ states: [] }`; client sends `encodeURIComponent(code)` and expects `{ states: [] }`. |
| **INFERENCE** | W008-D can be executed with 0 lines of product modification because all candidate code already exists in the tree. | Verification-only execution model applies. |
| **ASSUMPTION** | The existing unit tests in `apiClient.test.ts` pass cleanly when executed in isolation. | Verified during earlier test sweeps, but requires fresh empirical proof under W008-D. |
| **UNKNOWN** | Whether any mobile UI screens currently consume `apiClient.states` or still call legacy Supabase queries directly. | AST scan of UI screens deferred to strangler migration. |

---

## 5. Target Architecture & Deterministic Scope Specification

### 5.1 Mandatory Canonical Scope Hash Derivation Algorithm
In accordance with the CTO Final Scope-Hash Correction Directive, `CANONICAL_SCOPE_HASH` is calculated via a mathematically deterministic 5-step procedure:

1. **Step 1 — Exact File Hashing**:
   - For every file in the 8-file Canonical Verification Manifest, read the exact repository file bytes (`fs.readFileSync(path)`).
   - Compute SHA-256 over those exact bytes: `crypto.createHash('sha256').update(fileBytes).digest('hex').toLowerCase()`.
   - Do **not** normalize file contents, do not convert line endings (`CRLF`/`LF`), and do not parse or re-serialize.
2. **Step 2 — Path Normalization**:
   - Convert all directory separators to forward slashes `/`.
   - Use repository-relative paths only with exact case as stored in Git (no leading `./`, no absolute paths).
3. **Step 3 — Deterministic Manifest Ordering**:
   - Sort the 8 normalized repository-relative paths lexicographically by code point (`.sort()`).
4. **Step 4 — Canonical Serialization (Terminating with `\n`)**:
   - Format each record as: `<normalized-path>:<file-sha256>\n`.
   - The final record **MUST** also terminate with `\n`.
   - No JSON formatting is used for scope serialization.
5. **Step 5 — Scope Hash Digest**:
   - Compute `SHA-256` of the exact canonical serialized manifest bytes (`utf8` encoding):
     ```javascript
     const scopeHash = crypto.createHash('sha256').update(Buffer.from(serialized, 'utf8')).digest('hex').toLowerCase();
     ```

### 5.2 Independent Verifier Implementation Function
The independent verifier executes the following exact function:

```javascript
import fs from 'fs';
import crypto from 'crypto';

export function deriveCanonicalScopeHash(manifestPaths, repoDir = process.cwd()) {
  // Step 2: Path normalization
  const normalized = manifestPaths.map(p => p.replace(/\\/g, '/')).sort();

  // Step 1 & 4: File hashing and canonical record serialization
  const records = normalized.map(relPath => {
    const fullPath = path.resolve(repoDir, relPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`SCOPE_REJECTED: Manifest target file '${relPath}' does not exist.`);
    }
    const fileBytes = fs.readFileSync(fullPath);
    const fileSha256 = crypto.createHash('sha256').update(fileBytes).digest('hex').toLowerCase();
    return `${relPath}:${fileSha256}`;
  });

  // Step 4: Terminate every record including the last with '\n'
  const serialized = records.join('\n') + '\n';

  // Step 5: Scope hash calculation
  const scopeHash = crypto.createHash('sha256').update(Buffer.from(serialized, 'utf8')).digest('hex').toLowerCase();

  return {
    normalized,
    records,
    serialized,
    scopeHash
  };
}
```

### 5.3 Authoritative Scope Manifest & Exact Computed Coordinates
The Canonical Verification Manifest consists of **exactly 8 target files**:
```text
1. apps/api/src/routes/states.ts
2. apps/mobile/__tests__/apiClient.test.ts
3. apps/mobile/lib/api/client.ts
4. apps/mobile/lib/api/endpoints/states.ts
5. apps/mobile/lib/api/index.ts
6. apps/mobile/lib/api/types.ts
7. scripts/check-api-contract-drift.mjs
8. tests/w008-contract-negative-paths.test.mjs
```

#### Exact Canonical Serialized Manifest (Raw UTF-8 Bytes):
```
apps/api/src/routes/states.ts:2534d0bb4e5d66db4ad1f8770a85d63c97d1962b6dc7c57f138b6561adae50ba
apps/mobile/__tests__/apiClient.test.ts:64e98c17dd51c1337936b624b62fcc871c22c81ed6573afa2e16ddf274bd40bb
apps/mobile/lib/api/client.ts:2515efdee7a89d13c75ed0ac2b02bb18e7e5911a58d51e1487116618bd480da6
apps/mobile/lib/api/endpoints/states.ts:d48b3e8feebec4666b2ac525cf86fa71f59b30b4a0b6d4e93766000684ff1541
apps/mobile/lib/api/index.ts:24656d353c1d52098197b876df891000ee991863f51dbfa57de274d8c44cdce6
apps/mobile/lib/api/types.ts:8ed3cbd3e1a11d7369ed8e066030bdd90c1bb9d65a1f4ea53a30d91fb25c5d6d
scripts/check-api-contract-drift.mjs:2f28af4b05c13623d18d964084c86aa9e35f48a709161fc86535903bf61d8ae9
tests/w008-contract-negative-paths.test.mjs:f1f5b769c4e5895eafc5f369c9d2bde05d6d8bfeea223f387c35fb1219133db4
```

#### Exact Derived Scope Hash:
$$\mathbf{CANONICAL\_SCOPE\_HASH} = \mathbf{7ea8addf41526144db192959360c5ada9ecfc06a5e1770d430b2d1bdf6992805}$$

### 5.4 Plan Integrity Separation (`PLAN_SHA256`)
- `PLAN_SHA256` is defined as `crypto.createHash('sha256').update(fs.readFileSync('PLAN-W008-D.md')).digest('hex').toLowerCase()`.
- It remains completely decoupled from `CANONICAL_SCOPE_HASH`.
- `PLAN-W008-D.md` is strictly excluded from the canonical verification manifest, guaranteeing a strictly one-way, acyclic relationship.

---

## 6. Client/Server Semantic Contract Mapping & Representation Differences

In accordance with the CTO directive, client/server compatibility does **NOT** require literal bit-for-bit JSON schema equality, but requires strict semantic compatibility:

### 6.1 `GET /api/v1/states` (List States)
| Dimension | Server (Fastify / Ajv) | Client (Mobile / TypeScript) | Compatibility Assessment |
| :--- | :--- | :--- | :--- |
| **HTTP Path** | `/api/v1/states` | `/api/v1/states` | **Identical** |
| **HTTP Method** | `GET` | `GET` via `client.get()` | **Identical** |
| **Auth Policy** | Public (no hook) | `authPolicy: 'public'` | **Identical** |
| **Response Container** | Object with `states: array` | `StatesListResponseDTO` (`{ states: StateInfoDTO[] }`) | **Compatible** |
| **Item Identifier** | `code: string` (e.g. `'TS'`) | `code: string` | **Compatible (Required)** |
| **Item Name** | `name: string` (e.g. `'Telangana'`) | `name: string` | **Compatible (Required)** |
| **Additional Fields** | `loadedCount`, `totalSeats`, `dataStatus`, `hasGeoJSON` | `party?`, `rulingParty?`, `capital?`, `population?`, `totalACs?`, `totalPCs?` | **Intentional Representation Difference**: Client DTO permits optional political/demographic extensions. Client validator maps extra fields safely without throwing. |
| **Runtime Validation** | Fastify Ajv serializes output | `validateStatesListResponse()` checks `typeof data === 'object'` and `Array.isArray(obj.states)` fail-closed | **Compatible** |

### 6.2 `GET /api/v1/states/:code` (Get State Detail)
| Dimension | Server (Fastify / Ajv) | Client (Mobile / TypeScript) | Compatibility Assessment |
| :--- | :--- | :--- | :--- |
| **HTTP Path** | `/api/v1/states/:code` | `/api/v1/states/${encodeURIComponent(code)}` | **Identical** |
| **HTTP Method** | `GET` | `GET` via `client.get()` | **Identical** |
| **Path Constraint** | `^[A-Z]{2}$` (2 uppercase letters) | String passed to URL (Server enforces regex; 400 on invalid) | **Compatible** |
| **Auth Policy** | Public (no hook) | `authPolicy: 'public'` | **Identical** |
| **Success Response** | Object with `code`, `name`, `totalSeats`, `dataStatus` | `StateInfoDTO` (`code`, `name`, `totalACs?`, etc.) | **Compatible**: Core fields `code` and `name` are mandatory in both. |
| **Error Handling** | 404 with `sendApiError(reply, request, 404, 'Not Found', ...)` | Client deserializes into `ApiNotFoundError` with request correlation ID | **Compatible (Canonical Envelope)** |
| **Runtime Validation** | Ajv checks response schema | `validateStateInfo()` verifies `code` and `name` strings exist and are non-empty | **Compatible** |

---

## 7. Deterministic Scope Tuple & Full Scope of Work

W008-D is governed by the following deterministic, internally consistent, acyclic tuple:

```text
================================================================================
                 DETERMINISTIC ACYCLIC W008-D SCOPE TUPLE
================================================================================

JOB_ID:
  W008-D

BASE_COMMIT_SHA:
  <AUTH-COMMIT-W008-D> (Supplied by CTO in authorization commit; not invented)

BASE_COMMIT_TREE_SHA:
  <AUTH-COMMIT-TREE-W008-D>

PLAN_INTEGRITY:
  File: PLAN-W008-D.md (Revision 2.3)
  Digest: Independently derived PLAN_SHA256 at authorization commit

CANONICAL_VERIFICATION_MANIFEST (8 Target Files):
  [
    "apps/api/src/routes/states.ts",
    "apps/mobile/__tests__/apiClient.test.ts",
    "apps/mobile/lib/api/client.ts",
    "apps/mobile/lib/api/endpoints/states.ts",
    "apps/mobile/lib/api/index.ts",
    "apps/mobile/lib/api/types.ts",
    "scripts/check-api-contract-drift.mjs",
    "tests/w008-contract-negative-paths.test.mjs"
  ]

CANONICAL_SCOPE_HASH:
  7ea8addf41526144db192959360c5ada9ecfc06a5e1770d430b2d1bdf6992805
  (Derived via deriveCanonicalScopeHash terminating records with '\n')

PERMITTED_MUTATION_MANIFEST (Execution-Time Writable Paths):
  [
    "reports/w008_d_states_verification.json",
    "reports/w008_d_states_verification.md",
    "EXECUTION_STATE.md",
    "ACCEPTANCE_REGISTER.md",
    "DECISION_LOG.md"
  ]

PRODUCT_CODE_PROTECTED_PATHS (Strictly Read-Only / Zero Mutation):
  [
    "apps/**",
    "packages/**",
    "supabase/**"
  ]

PLAN_PROTECTED_PATHS (Strictly Read-Only During Execution):
  [
    "PLAN-W008-D.md"
  ]

EVIDENCE_PATHS:
  [
    "reports/w008_d_states_verification.json",
    "reports/w008_d_states_verification.md"
  ]

GOVERNANCE_PATHS:
  [
    "EXECUTION_STATE.md",
    "ACCEPTANCE_REGISTER.md",
    "DECISION_LOG.md"
  ]

EXECUTION_COMMANDS:
  [
    "git status --porcelain",
    "npm run build --prefix apps/api",
    "npx tsc --noEmit -p apps/mobile/tsconfig.json",
    "npm test --prefix apps/mobile -- __tests__/apiClient.test.ts",
    "node tests/w008-contract-negative-paths.test.mjs",
    "node scripts/check-api-contract-drift.mjs",
    "git diff <AUTH-COMMIT-W008-D> -- apps/ packages/ supabase/ PLAN-W008-D.md"
  ]
================================================================================
```

### Modification Scope: `[]` (EMPTY ARRAY)
Zero product files in `apps/`, `packages/`, or `supabase/` may be edited. Under Option A, `PLAN-W008-D.md` is strictly read-only during execution.

---

## 8. Explicit Out-of-Scope Boundaries

The following activities are strictly **FORBIDDEN** under W008-D:
1. Modifying any code in `apps/mobile/` (including `states.ts`, `client.ts`, or any screen).
2. Modifying any code in `apps/api/` (including Fastify routes, schemas, or server).
3. Modifying any code in `packages/` or `supabase/`.
4. Modifying `PLAN-W008-D.md` during execution.
5. Attempting to "fix" or alter `StatesEndpoint` logic. (If an error is discovered, the job must fail closed and report REJECTION).
6. Migrating legacy Supabase callers to `apiClient.states`.
7. Addressing defects DEF-001 through DEF-013.
8. Implementing or standardizing the remaining 105 Fastify routes (strictly assigned to W008-E).
9. Starting or referencing W009 (strictly prohibited).

---

## 9. Step-by-Step Verification Execution Plan

### Phase 1: Pre-Flight & Mechanical Tree Assertion
1. Execute `git rev-parse HEAD` and assert it equals `<AUTH-COMMIT-W008-D>`.
2. Execute `git rev-parse origin/master` and assert equality with local HEAD.
3. Compute `PLAN_SHA256` from `PLAN-W008-D.md` and assert equality with authorized plan hash.
4. Execute `deriveCanonicalScopeHash()` over the 8 manifest files and assert equality with `7ea8addf41526144db192959360c5ada9ecfc06a5e1770d430b2d1bdf6992805`.
5. Execute `git status --porcelain` and assert tree is 100% clean.

### Phase 2: Compilation & Typecheck Verification
6. Run `npm run build --prefix apps/api` (assert exit code `0`).
7. Run `npx tsc --noEmit -p apps/mobile/tsconfig.json` (assert exit code `0`).

### Phase 3: Client Unit & Runtime Validation Execution
8. Run `npm test --prefix apps/mobile -- __tests__/apiClient.test.ts` (assert exit code `0`, specifically verifying Section 11 tests for `StatesEndpoint`).
9. Run `node tests/w008-contract-negative-paths.test.mjs` (assert exit code `0`, specifically verifying Check 4 and NP-08, NP-16).

### Phase 4: Semantic Contract & Drift Verification
10. Run `node scripts/check-api-contract-drift.mjs` (assert exit code `0`, verifying `GET /api/v1/states` and `GET /api/v1/states/:code` are `D0_IN_SYNC`).
11. Verify semantic compatibility matrix between server `states.ts` and client `states.ts`.

### Phase 5: Adversarial Negative Suite Execution
12. Execute the W008-D Negative Test Suite (Section 11 below), asserting hard exceptions for all 15 failure modes (including N-14 Scope Circularity and N-15 Serialization Mutation).

### Phase 6: Mechanical Mutation Guard Check
13. Run `git diff <AUTH-COMMIT-W008-D> -- apps/ packages/ supabase/ PLAN-W008-D.md` and assert output is strictly empty.

### Phase 7: Evidence Generation & Governance Closure
14. Generate `reports/w008_d_states_verification.json` and `reports/w008_d_states_verification.md` under the REV-8 non-self-referential model.
15. Update governance registers (`EXECUTION_STATE.md`, `ACCEPTANCE_REGISTER.md`, `DECISION_LOG.md`).
16. Submit verification report to CTO under Rule IV-001.

---

## 10. Mechanical Mutation Guard Specification (Bound to Authorized Base Commit)

The verification runner must execute mechanical assertions comparing the live state directly against the authorized base commit rather than relying solely on `git diff HEAD`:

```javascript
import { execSync } from 'child_process';
import assert from 'assert';

export function assertMechanicalMutationGuard(baseCommitSha) {
  // 1. Assert zero diff against authorized base commit in protected product code
  const productDiff = execSync(`git diff ${baseCommitSha} -- apps/ packages/ supabase/`, { encoding: 'utf8' }).trim();
  assert.strictEqual(productDiff, '', `MUTATION_GUARD_FAILURE: Product code under apps/, packages/, or supabase/ was modified relative to ${baseCommitSha}!`);

  // 2. Assert zero diff against authorized base commit in planning artifact (Option A)
  const planDiff = execSync(`git diff ${baseCommitSha} -- PLAN-W008-D.md`, { encoding: 'utf8' }).trim();
  assert.strictEqual(planDiff, '', `MUTATION_GUARD_FAILURE: Planning artifact PLAN-W008-D.md was modified relative to ${baseCommitSha}!`);

  // 3. Assert only explicitly permitted mutation paths are modified in working tree
  const statusOutput = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  if (statusOutput.length > 0) {
    const changedFiles = statusOutput
      .split('\n')
      .map(line => line.trim().substring(3).trim())
      .filter(f => f.length > 0);

    const allowedPatterns = [
      /^reports\/w008_d_states_verification\.json$/,
      /^reports\/w008_d_states_verification\.md$/,
      /^EXECUTION_STATE\.md$/,
      /^ACCEPTANCE_REGISTER\.md$/,
      /^DECISION_LOG\.md$/
    ];

    for (const file of changedFiles) {
      const isAllowed = allowedPatterns.some(pattern => pattern.test(file));
      assert.ok(isAllowed, `MUTATION_GUARD_FAILURE: Unauthorized file '${file}' was modified in working tree!`);
    }
  }
}
```

---

## 11. Required Negative-Path Test Assertions (15 Hard Programmatic Assertions)

In accordance with the CTO directive, negative tests must contain **real programmatic assertions that catch and verify expected rejections**:

```javascript
// Test N-01: Reject Stale Execution Commit
assert.throws(() => {
  verifyExecutionCommit('387b790f0237ee4c05b85f88a2eb23d994833e51', currentHead);
}, /STALE_EXECUTION_COMMIT/);

// Test N-02: Reject Stale Evidence Artifact
assert.throws(() => {
  verifyEvidenceFreshness(staleEvidenceTimestamp, currentExecutionTime);
}, /STALE_EVIDENCE_ARTIFACT/);

// Test N-03: Reject Execution / Persistence Identity Mismatch
assert.throws(() => {
  verifyExecutionIdentity(rawStdoutExecutionCommit, claimedExecutionCommit);
}, /EXECUTION_IDENTITY_MISMATCH/);

// Test N-04: Reject Origin/Master Mismatch
assert.throws(() => {
  verifyOriginMaster('0000000000000000000000000000000000000000', currentHead);
}, /ORIGIN_MASTER_MISMATCH/);

// Test N-05: Reject Dirty Working Tree
assert.throws(() => {
  verifyWorkingTreeClean(' M apps/mobile/lib/api/endpoints/states.ts');
}, /DIRTY_WORKING_TREE/);

// Test N-06: Reject Product Code Mutation
assert.throws(() => {
  assertMechanicalMutationGuardWithMockDiff('diff --git a/apps/mobile/lib/api/endpoints/states.ts');
}, /MUTATION_GUARD_FAILURE/);

// Test N-07: Reject Unauthorized File Mutation (Option A Violation)
assert.throws(() => {
  assertMechanicalMutationGuardWithMockDiff('diff --git a/PLAN-W008-D.md');
}, /MUTATION_GUARD_FAILURE/);

// Test N-08: Reject Route Count Mismatch
assert.throws(() => {
  verifyRouteCount(137, 138);
}, /ROUTE_COUNT_MISMATCH/);

// Test N-09: Reject Route Manifest Drift
assert.throws(() => {
  verifyRouteManifest(['/health'], expectedManifest);
}, /ROUTE_MANIFEST_MISMATCH/);

// Test N-10: Reject Contract Count Mismatch (Sampled Drift Denominator)
assert.throws(() => {
  verifySampledContractCount(33, 34);
}, /CONTRACT_COUNT_MISMATCH/);

// Test N-11: Reject StatesEndpoint Contract Mismatch (Missing Code or Malformed Payload)
assert.throws(() => {
  validateStatesListResponse("invalid-string");
}, (err) => err instanceof ApiValidationError && err.message.includes('expected object payload'));

assert.throws(() => {
  validateStateInfo({ name: 'Telangana' }, 'test');
}, (err) => err instanceof ApiValidationError && err.message.includes('missing code'));

// Test N-12: Reject Corrupted Evidence Artifact Digest
assert.throws(() => {
  verifyEvidenceDigest(tamperedArtifactBytes, recordedSha256);
}, /EVIDENCE_DIGEST_MISMATCH/);

// Test N-13: Reject Self-Referential Evidence Field
assert.throws(() => {
  verifyNonSelfReferential({ evidenceCommitSha: '9a6fef6...' });
}, /PROHIBITED_SELF_REFERENTIAL_FIELD/);

// Test N-14: Reject Scope/Plan Circularity (Proving One-Way Acyclic Scope Model)
assert.throws(() => {
  verifyScopeManifestNonCircularity([
    'PLAN-W008-D.md', // Prohibited in canonical verification manifest!
    'apps/api/src/routes/states.ts'
  ]);
}, /CIRCULAR_SCOPE_MANIFEST_REJECTED/);

// Test N-15: Reject Canonical Scope Serialization Mutation (5 Distinct Assertions)
// 1. Remove final newline
assert.throws(() => {
  const tampered = canonicalSerializedManifest.slice(0, -1);
  const hash = crypto.createHash('sha256').update(tampered).digest('hex');
  verifyScopeHash(hash, expectedAuthorizedScopeHash);
}, /SCOPE_HASH_MISMATCH/);

// 2. Reverse entry order
assert.throws(() => {
  const tampered = canonicalSerializedManifest.split('\n').filter(Boolean).reverse().join('\n') + '\n';
  const hash = crypto.createHash('sha256').update(tampered).digest('hex');
  verifyScopeHash(hash, expectedAuthorizedScopeHash);
}, /SCOPE_HASH_MISMATCH/);

// 3. Alter path representation (e.g. add leading ./)
assert.throws(() => {
  const tampered = canonicalSerializedManifest.replace('apps/api/src/routes/states.ts', './apps/api/src/routes/states.ts');
  const hash = crypto.createHash('sha256').update(tampered).digest('hex');
  verifyScopeHash(hash, expectedAuthorizedScopeHash);
}, /SCOPE_HASH_MISMATCH/);

// 4. Alter one file digest
assert.throws(() => {
  const tampered = canonicalSerializedManifest.replace('2534d0bb4e5d66db4ad1f8770a85d63c97d1962b6dc7c57f138b6561adae50ba', '0000000000000000000000000000000000000000000000000000000000000000');
  const hash = crypto.createHash('sha256').update(tampered).digest('hex');
  verifyScopeHash(hash, expectedAuthorizedScopeHash);
}, /SCOPE_HASH_MISMATCH/);

// 5. Alter delimiter/serialization (e.g. replace colon with equal sign)
assert.throws(() => {
  const tampered = canonicalSerializedManifest.replace(':', '=');
  const hash = crypto.createHash('sha256').update(tampered).digest('hex');
  verifyScopeHash(hash, expectedAuthorizedScopeHash);
}, /SCOPE_HASH_MISMATCH/);
```

---

## 12. Required Evidence Specification (REV-8 Non-Self-Referential Two-Chain Model)

Under the accepted REV-8 model:
- `reports/w008_d_states_verification.json` records Chain A execution coordinates:
  - `executionCommitSha`: The exact commit at which tests executed.
  - `executionCommitTreeSha`: The exact source tree SHA.
  - `canonicalScopeHash`: `7ea8addf41526144db192959360c5ada9ecfc06a5e1770d430b2d1bdf6992805`.
  - `canonicalManifest`: The exact 8 sorted repository-relative paths.
  - `canonicalFileHashes`: Key-value map of relative paths to SHA-256 digests.
  - `canonicalSerializedManifest`: Verbatim serialized text terminating with `\n`.
  - `planSha256`: Independently derived digest of `PLAN-W008-D.md`.
  - `rawStdoutSha256` & `rawStderrSha256`.
  - `evidenceArtifactSha256`.
- **Prohibited Fields**:
  - `evidenceCommitSha` is strictly **NOT** embedded in the artifact.
  - `evidenceOriginMasterHead` is strictly **NOT** embedded in the artifact.
- **Chain B (Persistence)**:
  - Derived independently from Git (`git rev-parse HEAD`).
  - Bit-for-bit committed blob verification confirms artifact integrity.

---

## 13. Reconciliation Plan

Following successful verification:
1. `EXECUTION_STATE.md`:
   - Set `CURRENT_JOB: W008-D (Mobile StatesEndpoint Adoption - VERIFIED / SUBMITTED)`
   - Record `W008_D_VERIFICATION_COMMIT`
   - Reiterate `NEXT_PERMITTED_JOB: NONE (W008-E and W009 strictly NOT AUTHORIZED / FROZEN)`
2. `ACCEPTANCE_REGISTER.md`:
   - Add W008-D entry with status `VERIFIED / SUBMITTED FOR CTO RATIFICATION`
3. `DECISION_LOG.md`:
   - Record DEC-051 documenting W008-D independent verification findings.

---

## 14. Independent Verification Specification (Rule IV-001)

- **Verification Standard**: Verification must be reproducible by an independent AI session or external reviewer reading Git history.
- **Verification Commands**:
  ```powershell
  git status --porcelain
  npm run build --prefix apps/api
  npx tsc --noEmit -p apps/mobile/tsconfig.json
  npm test --prefix apps/mobile -- __tests__/apiClient.test.ts
  node tests/w008-contract-negative-paths.test.mjs
  node scripts/check-api-contract-drift.mjs
  git diff <AUTH-COMMIT-W008-D> -- apps/ packages/ supabase/ PLAN-W008-D.md
  ```
- **Prohibition on Self-Ratification**: The report will state strictly `IMPLEMENTED / TESTED / VERIFIED / RESUBMITTED FOR CTO RATIFICATION`.

---

## 15. Risks, Failure Modes & Mitigations

| Risk / Failure Mode | Severity | Mitigation Strategy |
| :--- | :--- | :--- |
| **Product Mutation Leakage** | Critical | Mechanical mutation guard (`git diff ${baseCommitSha} -- apps/ packages/ supabase/`) fails closed if even 1 byte is modified. |
| **Planning Artifact Drift** | High | Option A enforced: `PLAN-W008-D.md` is asserted immutable via `git diff ${baseCommitSha} -- PLAN-W008-D.md`. |
| **Scope Circularity** | High | Acyclic separation: Plan integrity (`PLAN_SHA256`) and verification scope (`CANONICAL_SCOPE_HASH`) are decoupled. Negative Test N-14 enforces this. |
| **Serialization Drift** | High | Exact 5-step canonical serialization algorithm specified. Negative Test N-15 catches format alterations. |
| **Silent Test Passing** | High | Every negative test requires an explicit `assert.throws` matching the specific `ApiValidationError` or failure code. |
| **Premature Execution** | Critical | Strict STOP invariant enforced until explicit CTO implementation authorization is committed. |

---

## 16. Rollback & Recovery Strategy

Because W008-D is strictly **verification-only** (`modificationScope: []`):
- Rollback risk to product code is **zero**.
- If verification fails, the job reports `FAIL` in governance registers, does not adopt `StatesEndpoint`, and leaves product code 100% untouched.
- Recovery from a failed verification is clean: discard generated test reports and log the defect in `DEFECT_REGISTER.md`.

---

## 17. Downstream Impact Assessment

- **W008-E**: Establishes the proven client/server verification pattern. When W008-E later standardizes the remaining 105 Fastify routes, it can follow this exact contract mapping model.
- **W009**: Remains strictly blocked and unaffected.
- **Defects DEF-001..DEF-013**: Remain open and documented; untouched by this job.

---

## 18. Acceptance Criteria (Claim-Based & Verifiable)

1. **CLAIM-01**: `apps/mobile/lib/api/endpoints/states.ts` compiles cleanly with zero TypeScript errors. *(Verified by `npx tsc --noEmit -p apps/mobile/tsconfig.json` exit code 0)*.
2. **CLAIM-02**: Fastify states route registrations (`GET /api/v1/states`, `GET /api/v1/states/:code`) remain `D0_IN_SYNC` in `scripts/check-api-contract-drift.mjs`.
3. **CLAIM-03**: `apiClient.states.listStates()` and `apiClient.states.getState()` execute successfully against valid mock responses, unwrapping data into typed DTOs. *(Verified by `apiClient.test.ts` Section 11 passing)*.
4. **CLAIM-04**: `StatesEndpoint` throws `ApiValidationError` fail-closed when server response is malformed, not an object, missing `states` array, or missing required fields. *(Verified by unit tests and negative test suite)*.
5. **CLAIM-05**: Zero product code modifications occurred across `apps/`, `packages/`, or `supabase/`, and zero modifications occurred to `PLAN-W008-D.md` relative to the authorized base commit. *(Verified by `git diff` exit code 0 and empty output)*.
6. **CLAIM-06**: Canonical scope hash reproduces exactly as `7ea8addf41526144db192959360c5ada9ecfc06a5e1770d430b2d1bdf6992805` via `deriveCanonicalScopeHash()`.
7. **CLAIM-07**: All 15 negative test assertions in Section 11 pass fail-closed.
8. **CLAIM-08**: Control M and Rule IV-001 are respected without self-certification.

---

## 19. Artifact & Commit Lineage Map

```text
W007 Accepted Implementation:     1d253cd454effb441e7f01e846a568eeddc7f57e (ACCEPTED)
W008-A Accepted Foundation:       be9cb85fafce85c56b1ccac3ee7b6137bbbba7e7 (ACCEPTED)
W008-B Accepted Pioneer Routes:   f4d4095b9447c4d82b132808313ec0d7309ca135 (ACCEPTED)
W008-C Accepted Domain Routes:    89847041d0d9d93d348ed7bc2a5556dcc2c74f8b (ACCEPTED)
REV-8 Ratified Governance:        9a6fef6a9c156932b680ff7e16df20a4dc5a9d59 (ACTIVE HEAD)
                                      │
                                      ▼ (Awaiting Explicit CTO Ratification of Plan)
[W008-D] Plan Ratification Commit:   <PLAN-RATIFICATION-COMMIT> (Option A: PLAN-W008-D.md becomes immutable)
                                      │
                                      ▼ (Awaiting Explicit CTO Authorization)
[W008-D] Implementation Authorization Commit: <AUTH-COMMIT-W008-D>
  ├── Verification Evidence Commit:          <VERIF-COMMIT-W008-D> (Verification-Only)
  └── CTO Formal Acceptance Commit:          <ACCEPT-COMMIT-W008-D>
                                      │
                                      ▼ (Strictly Blocked / Frozen)
[W008-E] Full 105-Route Standardization:     <STRICTLY FROZEN>
[W009]   External Provider Abstraction:      <STRICTLY FROZEN>
```

---

## 20. Amendment Compliance Matrix

| Amendment Clause | Requirement | Compliance in W008-D Revision 2.3 Plan |
| :--- | :--- | :--- |
| **Amendment v1.4 Part 33** | Evidence Rebinding Rule | Evidence will bind to exact executed commit coordinates without self-referential fields. |
| **Amendment v1.4 Part 34** | Strict Repository Integrity | Clean working tree verified; 24 referenced commits verified in ancestry. |
| **Amendment v1.5-A Section 7** | Fact/Inference/Assumption Register | Fact/Inference/Assumption/Unknown register established in Section 4. |
| **Amendment v1.5-A Section 13** | Negative Testing Invariant | 15 real programmatic assertions specified with `assert.throws` in Section 11. |
| **Amendment v1.5-A Section 14** | Test Integrity Requirement | Evaluated whether tests exercise genuine behavior vs mock constants in Section 6 & 11. |
| **Amendment v1.5-A Section 26** | 22-Section Planning Template | Complete 22 canonical sections included without omission. |
| **Amendment v1.6 Domain 3** | Non-Self-Referential Provenance | Provenance model verified; acyclic scope and non-self-referential evidence model enforced. |
| **Rule IV-001** | Technical Authority Separation | Agent reports strictly `RESUBMITTED FOR CTO RATIFICATION`; no self-acceptance. |

---

## 21. Operational Declarations

- **Pre-Implementation Declaration (Amendment v1.5-A Section 27):**
  > "I confirm that I have inspected the repository, derived the live Git coordinates (`9a6fef6`), audited the 138-route catalog, reconciled the 33 schema-covered routes and the 34 audited drift endpoints, verified the tracked state of all mobile states files, established the semantic contract mapping between Fastify and mobile client, resolved the artifact-scope contradiction via Option A (pre-existing immutable planning artifact), specified the exact 5-step canonical scope hash derivation algorithm terminating each record with `\n` yielding `7ea8addf41526144db192959360c5ada9ecfc06a5e1770d430b2d1bdf6992805`, decoupled PLAN_SHA256 from CANONICAL_SCOPE_HASH to prevent circularity, specified a mechanical mutation guard bound to the authorized base commit, defined 15 programmatic negative test assertions (including N-14 Scope Circularity and N-15 Serialization Mutation), and prepared this comprehensive 22-section W008-D Verification Plan Revision 2.3 without modifying any product files. I declare that implementation authorization is currently NO and verification will NOT begin until explicit CTO authorization is granted."
- **Verification-Only Declaration:**
  > "W008-D is strictly verification-only (`modificationScope: []`). Zero product files in `apps/mobile/**`, `apps/api/**`, `packages/**`, or `supabase/**` will be modified, and `PLAN-W008-D.md` will remain immutable during execution."
- **W008-E & W009 Prohibition Declaration:**
  > "W008-E and W009 are STRICTLY NOT AUTHORIZED / FROZEN. Zero planning or implementation activity for W008-E or W009 has occurred."

---

## 22. Plan Sign-Off & Review Request

### Questions / Decisions for CTO Review:
1. Does the 5-step canonical scope hash derivation algorithm and resulting digest (`7ea8addf41526144db192959360c5ada9ecfc06a5e1770d430b2d1bdf6992805`) satisfy the CTO's requirement for deterministic mathematical reproducibility?
2. Are the 15 programmatic negative test assertions accepted as the authoritative verification harness?

### Plan-Approval State:
```text
PLAN STATUS: SUBMITTED FOR CTO REVIEW / NOT YET AUTHORIZED
IMPLEMENTATION AUTHORIZATION: NO
STOP: YES
```

*(Awaiting explicit CTO plan approval and formal authorization commit before any execution begins).*
