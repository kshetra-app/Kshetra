# KSHETRA W021.5 — CTO DIRECTIVE 119
## Comprehensive CI Coverage Evidence, File-Level Audit & Ephemeral Database Container Architecture

**Directive:** CTO Directive 119  
**Predecessor:** CTO Directive 118  
**Repository:** `https://github.com/kshetra-app/Kshetra`  
**Governing Authority:** Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance  
**Production Boundary:** `AIR_GAPPED_UNEXECUTED`  
**Formal CTO Acceptance:** `0.0% — PENDING INDEPENDENT ADJUDICATION`  
**Stage Boundary:** Strict STOP at Stage B Gate; Stages C–I are strictly unauthorized.  

---

## 1. Executive Summary: Directive 118 CI Run Audit & Root Cause Analysis

In strict compliance with CTO Directive 119 Section 1, the full coverage artifact from GitHub Actions Run ID `39403851311` (Job ID `118564880013`) was downloaded, dissected, and parsed across all 63 tracked TypeScript source files in `@kshetra/api`.

### 1.1 Global Metric Comparison

| Coverage Metric | Required Floor Threshold | Directive 118 CI Actual (Run 39403851311) | Directive 119 Remediated Actual | Status |
|---|---:|---:|---:|:---:|
| **Statements** | **90.00%** | 53.42% | **57.72%** | Fails Gate (Deficit: 32.28%) |
| **Branches** | **82.00%** | 33.09% | **36.67%** | Fails Gate (Deficit: 45.33%) |
| **Lines** | **90.00%** | 53.69% | **57.69%** | Fails Gate (Deficit: 32.31%) |
| **Functions** | **90.00%** | 63.11% | **69.31%** | Fails Gate (Deficit: 20.69%) |

### 1.2 Mathematical Proof: Skipped PostGIS Suites Are NOT the Sole Cause

A detailed audit of the 63 tracked files disproves the premise that skipped PostGIS integration suites (`elections.test.ts`, `geo-runtime.test.ts`, `political-entities.test.ts`, `spatial-analytics.test.ts`) are the sole cause of the failed coverage gate.

While the 4 skipped PostGIS services contribute significantly to the statement deficit:
- `apps/api/src/services/electionService.ts`: **4.34%** stmts (856 uncovered lines)
- `apps/api/src/services/spatialRuntimeService.ts`: **7.45%** stmts (275 uncovered lines)
- `apps/api/src/services/politicalEntityService.ts`: **2.05%** stmts (322 uncovered lines)
- `apps/api/src/services/spatialAnalyticsService.ts`: **2.32%** stmts (310 uncovered lines)
Total PostGIS-dependent uncovered lines: **1,763 lines**.

**Crucially, non-database modules and routes also accounted for a massive uncovered surface:**
1. `apps/api/src/lib/mediaPipeline.ts`: **0.00%** coverage (106 uncovered lines) — *Remediated in Directive 119 to ~100%*.
2. `apps/api/src/services/news/rssParser.ts`: **6.12%** coverage (108 uncovered lines) — *Remediated in Directive 119 to ~100%*.
3. `apps/api/src/services/news/newsService.ts`: **16.45%** coverage (89 uncovered lines) — *Remediated in Directive 119 to ~90%*.
4. `apps/api/src/services/wallet/walletService.ts`: **13.11%** coverage (113 uncovered lines) — *Remediated in Directive 119 to ~90%*.
5. `apps/api/src/services/outreach/obdTelecomService.ts`: **28.00%** coverage (80 uncovered lines) — *Remediated in Directive 119 to ~67%*.
6. Route modules with significant unexercised error/fallback branches:
   - `routes/lmx.ts`: 29.13% stmts (277 uncovered lines)
   - `routes/geo.ts`: 33.33% stmts (124 uncovered lines)
   - `routes/campaign.ts`: 42.15% stmts (749 uncovered lines)
   - `routes/manage.ts`: 42.22% stmts (106 uncovered lines)
   - `routes/politicalAds.ts`: 50.29% stmts (87 uncovered lines)
   - `routes/dm.ts`: 53.15% stmts (202 uncovered lines)
   - `routes/civic.ts`: 56.37% stmts (157 uncovered lines)
   - `routes/ai.ts`: 50.64% stmts (116 uncovered lines)

Total non-database uncovered surface: **2,028 lines** (exceeding the PostGIS-dependent deficit!).

---

## 2. Remediation Implemented in Directive 119

To lift code coverage meaningfully without mocking fake databases or lowering regression thresholds:

### 2.1 New Unit Test Suites Added
1. `apps/api/src/__tests__/fixture-credentials-fail-closed.test.ts` (8/8 PASS):
   - Proves placeholder credentials format, environment isolation, and fail-closed database socket probing.
   - Proves 4-way contract separation: State 1 (503 unconfigured), State 2 (500 DB error), State 3 (200 count 0), State 4 (200 positive count).
2. `apps/api/src/__tests__/media-pipeline.test.ts` (17/17 PASS):
   - Tests `getMediaHosts`, `selectTier`, `buildIngestUrl`, `buildWhipPublishUrl`, and `selectPipeline` across demo and self-hosted modes.
3. `apps/api/src/__tests__/rss-parser.test.ts` (7/7 PASS):
   - Tests RSS 2.0 and Atom XML parsing, thumbnail extraction, CDATA entity decoding, and fail-soft handling of malformed feeds and invalid dates.
4. `apps/api/src/__tests__/news-service.test.ts` (4/4 PASS):
   - Tests feed scraping, deduplication, YouTube video parsing, multi-dimensional filtering (lang, category, scope, state), and scheduler management.
5. `apps/api/src/__tests__/wallet-service.test.ts` (7/7 PASS):
   - Tests balance queries, minimum recharge validation, balance credit, service deduction bounds, and transaction history mapping.
6. `apps/api/src/__tests__/obd-telecom-service.test.ts` (8/8 PASS):
   - Tests SHA-256 phone hashing, TRAI legal calling window (9 AM - 8 PM IST), opt-out recording, broadcast dispatch, and IVR webhook callbacks.
7. `apps/api/src/__tests__/state-data-unit.test.ts` (22/22 PASS):
   - Expanded to assert exact geographic capability truth across all 31 States/UTs (`hasGeoJSON: true` strictly for `TS`, `false` for all other 30).

### 2.2 Removal of Redundant `--forceExit`
In `apps/api/package.json`, line 11 was updated:
- Before: `"test:coverage": "node ../../node_modules/jest/bin/jest.js --coverage --forceExit"`
- After: `"test:coverage": "node ../../node_modules/jest/bin/jest.js --coverage"`
The workflow `.github/workflows/ci.yml` line 82 provides `-- --forceExit` where needed in CI.

---

## 3. Architectural Design: Ephemeral Database Container for CI

In compliance with Directive 119 Section 1, the following design is submitted to enable execution of the 4 PostGIS integration suites in GitHub Actions without compromising staging or production boundaries:

### 3.1 Container Specification
- **Image:** `postgis/postgis:15-3.3-alpine`
- **Host Binding:** `127.0.0.1:54321 -> 5432/tcp`
- **Container Environment:**
  - `POSTGRES_DB: kshetra_ci_ephemeral`
  - `POSTGRES_USER: kshetra_ci_runner`
  - `POSTGRES_PASSWORD: ephemeral_runner_disposable_password_never_reused`

### 3.2 Security & Credential Isolation Guarantees
1. **Network Boundary:** The service container runs entirely within the GitHub Actions runner virtual network bridge (`localhost`). Zero external ingress is opened; zero outbound database connections leave the runner.
2. **Zero Production/Staging Credential Policy:**
   - Production project (`ehfafcnimmjusyvplbah`) is strictly forbidden.
   - Staging project (`fkpigozcqnmcvofuksar`) is strictly forbidden.
   - Pre-flight assertion in CI asserts that `SUPABASE_URL` does NOT contain either project identifier and is strictly `http://127.0.0.1:54321`.
3. **Disposable Data Only:** The database is populated strictly with public statutory seed data (`telangana-constituencies.ts`, public delimitation coordinates) and synthetic test fixtures. Zero citizen PII, zero real user accounts, and zero commercial data exist in the container.

### 3.3 Lifecycle & Teardown
1. **Bootstrap Step:**
   ```bash
   psql -h 127.0.0.1 -p 54321 -U kshetra_ci_runner -d kshetra_ci_ephemeral -f supabase/all_migrations_combined.sql
   ```
2. **Execution Step:** Run `npm run test:coverage -w @kshetra/api` with `INTEGRATION_TESTS_ENABLED=true`.
3. **Automated Destruction:** At workflow completion, GitHub Actions automatically kills and unlinks the ephemeral container and discards the container filesystem layer.

---

## 4. Honest Conclusion and Status Accounting

- **Current Global Coverage Status:** Partially complete. Coverage increased from 53.42% to 57.72% statements, 33.09% to 36.67% branches, 53.69% to 57.69% lines, and 63.11% to 69.31% functions.
- **Coverage Gate Verdict:** **UNMET / FAILED**. The global 90/82/90/90 thresholds are not met. In accordance with Directive 119 Section 7, this run is **NOT** described as green.
- **Rule IV-001 Non-Self-Acceptance:** Formal CTO acceptance remains strictly **0.0% (`PENDING INDEPENDENT ADJUDICATION`)**.
