# W021.5 — CTO DIRECTIVE 113 DISCREPANCY REGISTER
## CI Dependency Blocker Resolution, Adversarial Trust-Boundary Verification, and Architectural Isolation Review

**Register Identifier:** `W021.5-DIRECTIVE-113-DISCREPANCY-REGISTER-V1.0`  
**Milestone:** `W021.5`  
**Generated At:** `2026-10-19T16:00:00.000Z`  
**Repository:** `kshetra-app/Kshetra`  
**Branch:** `master`  
**Governance Framework:** Master Execution Framework Amendment v1.2 / Rule IV-001 (Non-Self-Acceptance)  
**Status:** `ALL_DISCREPANCIES_FORENSICALLY_ANALYZED_AND_RECONCILED` (3 Resolved, 0 Blocked)  

---

### Executive Summary

Under CTO Directive 113, three discrepancies were forensically investigated and reconciled:
1. **DISC-044 (Dependency Compatibility):** Clean-install failure (`npm ci` ERESOLVE peer conflict on `@config-plugins/react-native-webrtc@12.0.0` vs Expo 54) that blocked all four GitHub Actions CI jobs.
2. **DISC-045 (Test Authenticity):** Conflated adversarial bypass flag test pattern in D111 Test 2.6 that combined mode flags with `expectedHashOverride`, masking whether individual bypass flags could alter trust checks.
3. **DISC-046 (Architectural Honesty):** Imprecise characterization of internal engine isolation, replacing vague claims of "runtime privacy" with an explicit, technically verifiable guarantee: an architectural repository convention, an acyclic static DAG, and a build/deployment boundary verified by static AST reachability audits.

---

### Detailed Discrepancy Audits

#### DISC-044: `DEPENDENCY_CONFLICT:expo54WebrtcPeerMismatch`
- **Category:** `dependency_compatibility`
- **Discrepancy Type:** `NPM_CI_ERESOLVE_PEER_CONFLICT`
- **Affected Entity:** `package.json`, `package-lock.json`, `apps/mobile/package.json`
- **Prior State / Failure:**
  In published commit `7a38b4a`, GitHub Actions workflow run `39270699898` failed on Step 4 (`Install dependencies`) across all four workflow jobs (`governance`, `test`, `typecheck`, `lint`) with code `ERESOLVE`:
  ```
  npm error code ERESOLVE
  npm error ERESOLVE could not resolve
  npm error While resolving: @config-plugins/react-native-webrtc@12.0.0
  npm error Found: expo@54.0.25
  npm error Could not resolve dependency:
  npm error peer expo@"^53.0.0" from @config-plugins/react-native-webrtc@12.0.0
  ```
- **Remediation & Canonical Committed State:**
  - Audited `@config-plugins/react-native-webrtc` releases and determined version `^13.0.0` specifies `peerDependencies: { "expo": "^54" }`, which matches root workspace `expo: "^54.0.0"`.
  - Updated `apps/mobile/package.json` to `"@config-plugins/react-native-webrtc": "^13.0.0"`.
  - Regenerated `package-lock.json` cleanly using `npm install --package-lock-only`.
  - Validated clean install reproducibility via `npm ci --dry-run` (exit code 0, 0 ERESOLVE errors).
  - Preserved all React Native WebRTC mobile integration code (`apps/mobile/components/LiveBroadcaster.tsx`, `apps/mobile/lib/whipClient.ts`, `apps/mobile/__tests__/whip-client.test.ts`).
  - No use of `--force` or `--legacy-peer-deps`.
- **Resolution Status:** `RESOLVED_DEPENDENCY_PEER_CONFLICT_ELIMINATED`

---

#### DISC-045: `TEST_AUTHENTICITY:confoundedAdversarialModeFlagTests`
- **Category:** `test_authenticity`
- **Discrepancy Type:** `CONFLATED_TEST_ASSERTION_PATTERN`
- **Affected Entity:** `tests/political-intelligence-directive-111.test.mjs` (Test 2.6)
- **Prior State / Weakness:**
  In D111 Test 2.6, bypass mode flags (`testMode: true`, `allowOverrides: true`, `productionVerificationMode: false`, `bypassLedgerValidation: true`) were tested by passing them alongside `expectedHashOverride: 'TAMPERED'`. Because `expectedHashOverride` was itself rejected as a forbidden key, the test passed due to the expectedHashOverride rejection, failing to prove that each bypass flag in isolation was ineffective.
- **Remediation & Canonical Committed State:**
  - Disentangled all bypass flag tests. Each flag is tested strictly in isolation against all 4 public verifier entry points without `expectedHashOverride`.
  - Hardened `assertNoCallerTrustOverrides` in `scripts/internal/reconcile_engine.mjs`:
    - Rejects non-object inputs (`null`, primitives, arrays).
    - Scans prototype chain via `key in options` to detect inherited prototype pollution properties.
    - Scans expanded caller trust material overrides (`snapshotOverride`, `testExecutionManifest`, `trustedAuthorities`, `externalTrustPin`, `trustPolicy`, etc.).
    - Restricts public options strictly to `APPROVED_PUBLIC_OPTIONS = ['repoRoot']`; rejects any unknown or unapproved keys with `CALLER_TRUST_OVERRIDE_PROHIBITED`.
    - Validates `repoRoot` (non-empty string, must exist on disk, must be a directory).
  - Sanitized options forwarding in `scripts/reconcile_execution_ledger.mjs` (`reconcileExecutionLedger(options)` passes `{ repoRoot }` only).
  - Created dedicated Suite 33 (`tests/political-intelligence-directive-113.test.mjs`) with 24 comprehensive isolated tests across Workstreams A, B, C, and D.
- **Resolution Status:** `RESOLVED_ADVERSARIAL_TESTS_DISENTANGLED_AND_HARDENED`

---

#### DISC-046: `ARCHITECTURAL_HONESTY:internalEngineRuntimeIsolationClaim`
- **Category:** `architectural_honesty`
- **Discrepancy Type:** `IMPRECISE_SECURITY_GUARANTEE_CHARACTERIZATION`
- **Affected Entity:** `scripts/internal/reconcile_engine.mjs`, reports, and governance documentation
- **Prior State / Ambiguity:**
  D110/D111 reports ambiguously described `scripts/internal/reconcile_engine.mjs` as providing "runtime isolation" or "runtime privacy", which could imply an in-process VM sandbox or Node.js module encapsulation boundary preventing arbitrary imports.
- **Remediation & Canonical Committed State:**
  - Truthfully codified that Node.js ECMAScript Modules do not enforce process-level privacy or unforgeable isolation between workspace files.
  - Articulated the exact architectural guarantee actually provided:
    1. **Architectural Repository Convention:** Layer 0 (`scripts/internal/reconcile_engine.mjs`) is an internal implementation detail, not part of the public API.
    2. **Acyclic Static DAG:** Layer 0 imports zero repository modules (`0 relative repo imports`). Layer 1 (`scripts/reconcile_execution_ledger.mjs`) imports Layer 0. Layer 2 (consumers/tests) imports Layer 1. There are 0 circular dependencies.
    3. **Build & Deployment Boundary:** Verified by static AST reachability audits: all 444 application files across `apps/api/src`, `apps/mobile`, and `packages` contain exactly 0 imports of `reconcile_engine.mjs` or `ledger-test-adapter.mjs`.
    4. **Single-Implementation Canonical Verification:** Public verifier entry points wrap internal payloads safely, preserving single-implementation verification without duplicating core logic.
- **Resolution Status:** `RESOLVED_ARCHITECTURAL_GUARANTEE_HONESTLY_CODIFIED`

---

### Governance Statement
Under Rule IV-001 (Non-Self-Acceptance), formal CTO acceptance of W021.5 remains **0.0% (`UNACCEPTED`)**. Production database execution remains **0.0% (`AIR_GAPPED_UNEXECUTED`)**. Financial defect `DQ-W021.5-B2.2E-001` remains **STRICLY OPEN**. Telangana AC 119 boundary defect remains **STRICLY OPEN / BLOCKED**. The 68-migration baseline (`0ea572d`) and 31-seed baseline (`fb408ce`) remain byte-for-byte immutable.
