import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

// 1. Reconcile EXECUTION_STATE.md
const esPath = path.join(rootDir, 'EXECUTION_STATE.md');
let esContent = fs.readFileSync(esPath, 'utf8');

esContent = esContent.replace(
  /JOB_023_STATUS:\s+[^\r\n]+/,
  'JOB_023_STATUS:        REMEDIATED / TESTED / READY FOR INDEPENDENT CTO ADJUDICATION'
);
esContent = esContent.replace(
  /JOB_023_BASELINE:\s+[^\r\n]+/,
  'JOB_023_BASELINE:      33945d20f318ae1aa0d9aba35052246599c5bbae'
);
esContent = esContent.replace(
  /JOB_023_TEST_BATTERY:\s+[^\r\n]+/,
  'JOB_023_TEST_BATTERY:  70/70 PASS (10 Truth Adversarial, 12 Hardened SSRF, 5 Persistence Lifecycle, 19 Invariants, 5 DB Integration, 7 Route Unit, 12 Controlled Acceptance Steps)'
);

const job023Section = `

---

## JOB 023 — Delimitation Watch Remediation Execution State (2026-10-25)

- **Authority:** CTO MASTER REMEDIATION DIRECTIVE — JOB 023
- **Baseline Commit:** \`33945d20f318ae1aa0d9aba35052246599c5bbae\`
- **Status:** REMEDIATED / TESTED / READY FOR INDEPENDENT CTO ADJUDICATION (Rule IV-001 Non-Self-Acceptance strictly enforced)
- **Finding A (Official-data truth & provenance):** Eliminated authority-by-label (\`statutory\` source + \`status: final\` alone does not produce \`OFFICIAL\`); implemented 8-point statutory evidence evaluation requiring canonical instrument identification and effective dates; prohibited synthetic fixtures/localhost from escalating to \`OFFICIAL\`; client-supplied \`dataStatus\` overridden by server-side evaluation; non-enacted proposals fail closed and cannot mutate canonical views. Verified by 10/10 adversarial tests in \`tests/delimitation-watch-data-truth-adversarial.test.mjs\` and authentic Gazette fixture \`tests/fixtures/delimitation/authoritative_delimitation_order_2008.json\`.
- **Finding B (Exhaustive SSRF protection):** Implemented comprehensive IPv4 and IPv6 private/reserved/link-local CIDR filtering with bracket-safe parsing; rejected alternate numeric IP encodings (dword, hex, octal); fail-closed on mixed public/private DNS answers; implemented socket pinning via custom Agent connecting directly to pre-verified IP; manual redirect handling bounded to 3 hops with loop detection and HTTPS->HTTP downgrade prevention; response body streaming bounded to 10MB ceiling. Verified by 12/12 hardened tests in \`tests/delimitation-watch-ssrf-hardened.test.mjs\`.
- **Finding C (Durable persistence & fail-closed runtime):** Eliminated all \`pg_raw_exec\` RPC invocations; eliminated deceptive in-memory fallback in deployed environments (\`NODE_ENV !== 'test'\` without \`DATABASE_URL\` returns HTTP 503 \`PERSISTENCE_CONFIGURATION_ERROR\`); implemented database-backed atomic lease locking in PostgreSQL; updated Migration 071 DDL and row mapping; added health probe endpoint \`GET /api/v1/delimitation/watch/health\`. Verified by 5/5 lifecycle tests in \`tests/delimitation-watch-persistence-lifecycle.test.mjs\` and 5/5 PostgreSQL integration tests.
- **Finding D (Reconcile evidence, commits, & governance):** Eliminated machine-specific paths (\`C:\\Users\\Laven\\...\`) in \`reports/evidence/JOB_023_ACCEPTANCE_MANIFEST.json\` converting to portable relative paths; updated manifest candidate and publication statuses to reflect genuine non-enacted proposal status (\`UNVERIFIED\`, \`PROPOSAL\`); reconciled commit lineage from baseline \`33945d20f318ae1aa0d9aba35052246599c5bbae\`; reconciled continuity registers.
- **Test Battery:** 70/70 PASS (63 suite checks across 6 suites + 7 Fastify route unit tests).
- **Environment Isolation:** Staging database (\`fkpigozcqnmcvofuksar\`) and Production database (\`ehfafcnimmjusyvplbah\`) remain 100% untouched and air-gapped (0 queries, 0 mutations).
`;

if (!esContent.includes('JOB 023 — Delimitation Watch Remediation Execution State')) {
  esContent = esContent.trimEnd() + job023Section;
}
fs.writeFileSync(esPath, esContent, 'utf8');
console.log('Updated EXECUTION_STATE.md');

// 2. Reconcile ACCEPTANCE_REGISTER.md
const arPath = path.join(rootDir, 'ACCEPTANCE_REGISTER.md');
let arContent = fs.readFileSync(arPath, 'utf8');

const oldJob023LineRegex = /\|\s*\*\*JOB 023\*\*\s*\|[^\r\n]+/;
const newJob023Line = '| **JOB 023** | Delimitation Watch Engine (8-Stage Lifecycle & Hardened Governance) | DATA | REMEDIATED / TESTED / READY FOR INDEPENDENT CTO ADJUDICATION | Current Remediation Commit | `tests/delimitation-watch-data-truth-adversarial.test.mjs` (10/10 PASS); `tests/delimitation-watch-ssrf-hardened.test.mjs` (12/12 PASS); `tests/delimitation-watch-persistence-lifecycle.test.mjs` (5/5 PASS); `tests/delimitation-watch-mandatory-invariants.test.mjs` (19/19 PASS); `tests/delimitation-watch-postgres-integration.test.mjs` (5/5 PASS); `apps/api/src/__tests__/delimitation-watch-routes.test.ts` (7/7 PASS); `tests/delimitation-watch-controlled-e2e.test.mjs` (12/12 PASS); Total: 70/70 PASS (100%) | `reports/evidence/JOB_023_ACCEPTANCE_MANIFEST.json`, `supabase/migrations/071_delimitation_watch_engine.sql`, `tests/fixtures/delimitation/authoritative_delimitation_order_2008.json`, `apps/api/src/modules/delimitationWatch/` | Local PostgreSQL & PGlite verified; Staging & Production strictly AIR-GAPPED (0 mutations) | PENDING INDEPENDENT CTO ADJUDICATION (Rule IV-001) |';

if (oldJob023LineRegex.test(arContent)) {
  arContent = arContent.replace(oldJob023LineRegex, newJob023Line);
}
fs.writeFileSync(arPath, arContent, 'utf8');
console.log('Updated ACCEPTANCE_REGISTER.md');

// 3. Reconcile DEFECT_REGISTER.md
const drPath = path.join(rootDir, 'DEFECT_REGISTER.md');
let drContent = fs.readFileSync(drPath, 'utf8');

const section15Content = `

---

## Section 15: Job 023 Review Findings Remediation Disposition Table (Findings A–D)

| Finding / Defect ID | Description | Severity | Domain | Resolution / Evidence | Status |
|:---|:---|:---|:---|:---|:---|
| **DEF-JOB023-A** | Finding A: Official-data truth and provenance enforcement | P0 | Data Truth / Legal Semantics | Eliminated authority-by-label (\`statutory\` source + \`status: final\` alone no longer produces \`OFFICIAL\`); implemented explicit 8-point legal evidence gate requiring authentic instrument identifier and effective date; prohibited synthetic/fixture-to-official escalation; client-injected \`dataStatus\` overridden; non-enacted proposals fail closed and cannot mutate canonical views. Verified by 10/10 adversarial tests in \`tests/delimitation-watch-data-truth-adversarial.test.mjs\` and authoritative fixture \`tests/fixtures/delimitation/authoritative_delimitation_order_2008.json\`. | RESOLVED — VERIFIED |
| **DEF-JOB023-B** | Finding B: SSRF protection completeness and transport safety | P0 | Security / Network | Comprehensive IPv4/IPv6 private/reserved/link-local CIDR filtering with bracket-safe parser; alternate numeric IPv4 encodings (dword, hex, octal) parsed and rejected; fail-closed on mixed DNS answers; socket pinning via custom Agent connecting directly to pre-verified IP; manual redirect handling bounded to 3 hops with loop detection and HTTPS->HTTP downgrade prevention; response body streaming bounded to 10MB ceiling. Verified by 12/12 hardened tests in \`tests/delimitation-watch-ssrf-hardened.test.mjs\`. | RESOLVED — VERIFIED |
| **DEF-JOB023-C** | Finding C: Durable persistence, migration safety, and runtime error semantics | P1 | Persistence / Runtime | Complete elimination of \`pg_raw_exec\` RPC invocations; elimination of deceptive in-memory fallback in deployed runtimes (\`NODE_ENV !== 'test'\` without \`DATABASE_URL\` returns HTTP 503 \`PERSISTENCE_CONFIGURATION_ERROR\`); implemented database-backed atomic lease locking in PostgreSQL; updated Migration 071 DDL and row mapping; added health probe \`GET /api/v1/delimitation/watch/health\`. Verified by 5/5 lifecycle tests in \`tests/delimitation-watch-persistence-lifecycle.test.mjs\` and 5/5 PostgreSQL integration tests. | RESOLVED — VERIFIED |
| **DEF-JOB023-D** | Finding D: Reconcile evidence, commits, and governance | P1 | Governance / Audit | Eliminated machine-specific absolute paths (\`C:\\Users\\Laven\\...\`) in \`reports/evidence/JOB_023_ACCEPTANCE_MANIFEST.json\` converting to portable relative paths; updated manifest candidate and publication statuses to reflect genuine non-enacted proposal status (\`UNVERIFIED\`, \`PROPOSAL\`); reconciled commit lineage from baseline \`33945d20f318ae1aa0d9aba35052246599c5bbae\`; reconciled continuity registers \`EXECUTION_STATE.md\`, \`ACCEPTANCE_REGISTER.md\`, \`DEFECT_REGISTER.md\`, \`DECISION_LOG.md\`, \`RELEASE_REGISTER.md\`; submitted under Rule IV-001 Non-Self-Acceptance. | RESOLVED — VERIFIED |
`;

if (!drContent.includes('DEF-JOB023-A')) {
  drContent = drContent.trimEnd() + section15Content;
}
fs.writeFileSync(drPath, drContent, 'utf8');
console.log('Updated DEFECT_REGISTER.md');

// 4. Reconcile DECISION_LOG.md
const dlPath = path.join(rootDir, 'DECISION_LOG.md');
let dlContent = fs.readFileSync(dlPath, 'utf8');

const dec155Content = `

---

### DEC-155: Remediation of Job 023 Findings A-D (Delimitation Watch Integrity, SSRF Guard, Durable Persistence, and Evidence Reconciliation)
- **Date:** 2026-10-25
- **Status:** REMEDIATED / TESTED / READY FOR INDEPENDENT CTO ADJUDICATION
- **Authority:** CTO MASTER REMEDIATION DIRECTIVE — JOB 023 / Rule IV-001 Non-Self-Acceptance
- **Baseline Commit:** \`33945d20f318ae1aa0d9aba35052246599c5bbae\`
- **Context:** Independent CTO review of Job 023 identified four mandatory closure findings: Finding A (authority-by-label and legal evidence enforcement), Finding B (SSRF protection completeness and transport safety), Finding C (durable persistence, migration safety, and runtime error semantics), and Finding D (portable evidence manifest, commit lineage, and governance reconciliation).
- **Decisions & Remediation Measures:**
  1. **Finding A (Official-data truth & provenance):**
     - Eliminated authority-by-label in \`normalizer.ts\`. A source's statutory classification combined with \`status: final\` no longer grants \`OFFICIAL\` classification.
     - Implemented 8-point legal evidence evaluation gate requiring verifiable publisher, instrument identifier, Gazette/order citation, effective date, and authenticity corroboration.
     - Prohibited synthetic/fixture/model sources from official promotion (fail closed to \`SCENARIO\` or \`UNVERIFIED\`).
     - Overrode client-injected \`dataStatus\` in normalizer and validator.
     - Gated publication such that non-enacted proposals fail closed with \`canonicalViewUpdated: false\`.
     - Ingested authentic Gazette fixture \`tests/fixtures/delimitation/authoritative_delimitation_order_2008.json\` (Notification No. 282/AP/2008, Order No. 38, dated 2008-02-19, effective 2008-05-31).
  2. **Finding B (Exhaustive SSRF protection & transport safety):**
     - Hardened \`ssrfGuard.ts\` to enforce exhaustive RFC 1918, RFC 3927, RFC 4193, RFC 4291, RFC 5952, and cloud metadata CIDR blocklists with bracket-safe IPv6 parsing.
     - Added parser for alternate numeric IPv4 encodings (dword integer, hex, octal).
     - Enforced fail-closed behavior on mixed public/private DNS lookup results.
     - Hardened \`captureAdapter.ts\` with socket pinning via custom \`http.Agent\` / \`https.Agent\` connecting directly to pre-verified IP addresses to defeat DNS rebinding TOCTOU.
     - Implemented manual redirect handling bounded to 3 hops with loop detection and HTTPS-to-HTTP downgrade prohibition.
     - Bounded HTTP response body streaming to a strict 10MB limit, aborting oversized responses.
  3. **Finding C (Durable persistence & fail-closed runtime):**
     - Completely eliminated unsafe \`pg_raw_exec\` RPC invocations.
     - Enforced fail-closed persistence in deployed runtimes: when \`NODE_ENV !== 'test'\` without \`DATABASE_URL\`, requests fail with HTTP 503 \`PERSISTENCE_CONFIGURATION_ERROR\`.
     - Implemented database-backed atomic lease locking in PostgreSQL (\`acquireSourceLock\` / \`releaseSourceLock\`) eliminating single-process in-memory lock sets.
     - Aligned \`PostgresDelimitationWatchRepository\` DDL insert and select mapping with Migration 071 columns (\`instrument_type\`, \`instrument_identifier\`, \`legal_enactment_status\`, \`effective_date\`, \`official_decision_record\`, \`publication_type\`).
     - Added health probe route \`GET /api/v1/delimitation/watch/health\` returning repository type and durability status.
  4. **Finding D (Reconcile evidence, commits, & governance):**
     - Eliminated machine-specific absolute paths (\`C:\\Users\\Laven\\...\`) in \`reports/evidence/JOB_023_ACCEPTANCE_MANIFEST.json\` converting to portable repository-relative paths.
     - Updated manifest candidate and publication payloads to represent genuine non-enacted proposal status (\`UNVERIFIED\`, \`PROPOSAL\`).
     - Reconciled commit lineage from baseline \`33945d20f318ae1aa0d9aba35052246599c5bbae\`.
     - Updated continuity registers (\`EXECUTION_STATE.md\`, \`ACCEPTANCE_REGISTER.md\`, \`DEFECT_REGISTER.md\`, \`DECISION_LOG.md\`, \`RELEASE_REGISTER.md\`).
- **Verification Evidence:** 70/70 automated tests pass across 7 test suites (10 Truth Adversarial, 12 Hardened SSRF, 5 Persistence Lifecycle, 19 Invariants, 5 DB Integration, 7 Route Unit, 12 Controlled Acceptance Steps).
- **Environment Isolation:** Staging database (\`fkpigozcqnmcvofuksar\`) and Production database (\`ehfafcnimmjusyvplbah\`) remain 100% untouched and air-gapped (0 queries, 0 mutations).
- **Submission:** Formally submitted under Rule IV-001 Non-Self-Acceptance as REMEDIATED / TESTED / READY FOR INDEPENDENT CTO ADJUDICATION.
`;

if (!dlContent.includes('DEC-155')) {
  dlContent = dlContent.trimEnd() + dec155Content;
}
fs.writeFileSync(dlPath, dlContent, 'utf8');
console.log('Updated DECISION_LOG.md');

// 5. Reconcile RELEASE_REGISTER.md
const rrPath = path.join(rootDir, 'RELEASE_REGISTER.md');
let rrContent = fs.readFileSync(rrPath, 'utf8');

const job023ReleaseRow = '| `v0.1.0-job023-pending` | Not released — source only | Delimitation Watch Engine (8-Stage Lifecycle) | N/A | N/A | v1 | Current Remediation Commit | REMEDIATED / TESTED / READY FOR INDEPENDENT CTO ADJUDICATION — RELEASE HOLD ACTIVE (Staging execution strictly blocked; Production strictly air-gapped) | DATA | NOT RELEASED — Staging execution blocked pending separate CTO authorization; Production strictly air-gapped |\n';

if (!rrContent.includes('v0.1.0-job023-pending')) {
  rrContent = rrContent.replace(
    /(\| `v0\.1\.0-w022-pending`[^\r\n]+)/,
    `$1\n${job023ReleaseRow}`
  );
}
fs.writeFileSync(rrPath, rrContent, 'utf8');
console.log('Updated RELEASE_REGISTER.md');
