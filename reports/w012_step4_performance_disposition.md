# W012 — Step 4 Performance Benchmark Evidence Disposition

- **Job**: W012 — Data Governance Foundation
- **Sub-Job**: Step 4 — Performance Benchmark Evidence Closure
- **Disposition Status**: `STEP_4_PERFORMANCE_EVIDENCE_DISPOSITION_COMPLETE — AWAITING CTO REVIEW`
- **Target Project**: `panIN-staging` (`fkpigozcqnmcvofuksar`)
- **Target URL**: `https://fkpigozcqnmcvofuksar.supabase.co`
- **Timestamp**: 2026-09-22T06:53:00.000Z

---

## 1. Authoritative CTO Decision & Context

The CTO has reviewed:
- The original W012 Step 4 benchmark;
- The subsequent performance diagnostic;
- The corrected benchmark methodology;
- The corrected HP-02 query;
- The HTTP semantic validation;
- The server-side timing instrumentation;
- The corrected benchmark results.

### Authoritative Finding
1. **Invalidation**: The original WAN-based performance comparison is **INVALIDATED** as a database regression acceptance measurement.
2. **Methodology Acceptance**: The corrected benchmark methodology is accepted.
3. **Current Server-Side Execution**: Current post-migration server-side execution latency is approximately 2.00 ms p95 for both measured hot paths.
4. **Baseline Limitation**: A comparable pre-migration server-side baseline is unavailable.

---

## 2. Core Evidence Classification

| Classification Key | Authoritative Value | Description |
| :--- | :--- | :--- |
| **`PRE_MIGRATION_SERVER_SIDE_BASELINE`** | **`UNAVAILABLE`** | Original baseline captured client-observed WAN wall-clock latency; did not capture `x-envoy-upstream-service-time`. |
| **`SERVER_SIDE_POST_MIGRATION_P95`** | **`2.00 ms`** | Measured Envoy -> PostgREST -> Postgres round-trip latency across 1,000 warm iterations per query. |
| **`W012_SERVER_SIDE_REGRESSION_DEMONSTRATED`** | **`NO`** | No W012-induced server-side performance regression is demonstrated by the available evidence. |
| **`WAN_COMPARISON_ACCEPTABLE_FOR_DB_REGRESSION`**| **`NO`** | Public WAN measurements are subject to external network variance; historical HP-02 was an HTTP 400 error. |

> **Official Evidence Statement**:  
> *"Current post-migration server-side execution latency is 2 ms p95 for both measured hot paths. No W012-induced server-side performance regression is demonstrated by the available evidence; a comparable pre-migration server-side baseline is unavailable. This is not proof of zero historical regression."*

---

## 3. Artifact Integrity & Hashes

### Historical Baseline Artifact (Immutable)
- **File**: `reports/w012_hot_path_baseline.json`
- **Timestamp**: `2026-09-22T04:07:13.651Z`
- **SHA-256**: `8F44169136FA745081DE87F390271BDF3F5A8610500B796780B8301B83FD0A0D`
- **Status**: **VERIFIED UNCHANGED** (preserved byte-for-byte as historical evidence).

### Corrected Benchmark Artifact
- **File**: `reports/w012_performance_benchmark.json`
- **Timestamp**: `2026-09-22T06:27:18.386Z`
- **SHA-256**: `0D9E2ABDDA3A516BE723D88A0F08EA66FD870373B7887D0E4CB23ADFEEF97AE6`
- **Script**: `scripts/benchmark_w012_hot_paths.mjs`
- **Test Suite**: `tests/benchmark_harness_semantics.test.mjs` (10/10 PASS)

---

## 4. Methodology Corrections & Harness Semantics

1. **HP-02 Query Correction**:
   - *Legacy defective query*: `/rest/v1/constituencies?select=id,name,state_id&limit=20` (returned HTTP 400 Bad Request due to non-existent column `state_id`).
   - *Corrected query*: `/rest/v1/constituencies?select=id,name,state_code&limit=20` (returns HTTP 200 OK with valid schema-compliant entity records).
2. **HTTP Semantic Status Validation**:
   - `validateHttpResponse` actively asserts HTTP status 200–299.
   - Any 4xx/5xx status immediately fails the run and is rejected from latency sample recording.
3. **Server-Side Latency Capture**:
   - Extracts `x-envoy-upstream-service-time` header from each response to accurately isolate Envoy -> PostgREST -> PostgreSQL processing duration from public internet transit.

---

## 5. Corrected Hot-Path Performance Measurements (1,000 Warm Iterations)

### A. Server-Side Upstream Latency (`x-envoy-upstream-service-time`)

| Query ID | Endpoint | Validated HTTP 200s | Server p50 | Server p95 | Server p99 | Server Mean |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **HP-01_STATES** | `/rest/v1/states?select=code,name,total_seats&limit=20` | **1,000 / 1,000** | **1.00 ms** | **2.00 ms** | **3.00 ms** | **1.13 ms** |
| **HP-02_CONSTITUENCIES** | `/rest/v1/constituencies?select=id,name,state_code&limit=20` | **1,000 / 1,000** | **1.00 ms** | **2.00 ms** | **2.00 ms** | **1.07 ms** |

### B. Client-Observed Public WAN Latency (Retained for Transparency)

| Query ID | Baseline Client p50 | Measured Client p50 | Baseline Client p95 | Measured Client p95 | Client p95 Delta | Baseline Client p99 | Measured Client p99 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **HP-01_STATES** | `266.34 ms` | `282.33 ms` | `289.95 ms` | `309.70 ms` | `+19.75 ms` (`+6.81%`) | `701.74 ms` | `334.45 ms` (`-52.3%`) |
| **HP-02_CONSTITUENCIES** | `266.63 ms` *(HTTP 400)* | `280.63 ms` *(HTTP 200)* | `289.25 ms` *(HTTP 400)* | `309.63 ms` *(HTTP 200)* | `+20.38 ms` (`+7.05%`) | `336.38 ms` *(HTTP 400)* | `381.10 ms` *(HTTP 200)* |

---

## 6. Performance Gate Evaluation

- **Threshold Requirements**: Relative p95 regression $\le 5.0\%$ AND Absolute p95 regression $\le 2.0\text{ ms}$.
- **Gate Evaluation**:
  ```
  PERFORMANCE GATE: NOT EVALUABLE FOR SERVER-SIDE PRE/POST REGRESSION — PRE-MIGRATION SERVER-SIDE BASELINE UNAVAILABLE.
  ```
- **Rationale**:
  - The threshold requirements cannot legitimately be applied to establish a historical server-side pre/post regression result because a pre-migration server-side baseline does not exist.
  - The client WAN measurements cannot be used for database regression acceptance due to public internet transit variance and the historical defect in HP-02.
  - Current post-migration server execution is verified at 2.00 ms p95.

---

## 7. Compliance & Boundary Guarantees

- **Production**: Strictly untouched.
- **Migration 039**: Strictly untouched.
- **Staging Database Schema / RLS**: Strictly untouched during this remediation.
- **No Rollback Performed**.
- **Historical Baseline**: Maintained byte-for-byte unchanged.
- **W013+**: Strictly unauthorized / not started.
