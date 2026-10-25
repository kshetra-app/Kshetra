# Pre-Implementation Plan & Technical Interpretation — GEO-02

**Plan ID:** PLAN-GEO-02-REV-1.0
**Status:** Approved by the user's explicit implementation directive; final acceptance remains pending.
**Date:** 2026-10-25
**Repository:** kshetra-app/Kshetra
**Implementation branch:** fix/geo-02-authorized-runtime-contract
**Scope:** Mobile map geography bundle removal, versioned state-scoped runtime data, bounded offline caches, Metro graph verification, Android release-size evidence and CI gates.
**Operational boundary:** No staging or production database access, database mutation, or deployment.

## 1. Document Title & Metadata

This plan defines a narrow, verifiable remediation for GEO-02 P0. Product implementation begins only after this plan and a separate authorization decision are committed to the implementation branch.

## 2. Problem Statement

The mobile map's dependency graph has been able to include national constituency, trivia, history, census, hierarchy and booth seed modules. Removing polygon imports alone does not guarantee a small base bundle. Android AAB/APK sizes must be measured from real release artifacts.

## 3. Current State Analysis

The target route has used synchronous all-state adapters and a national booth-data JSON transitively through map, comparison, enrichment, prefetch, registry and helper paths. The API already owns canonical state/constituency data, making selected-state delivery possible without moving seed assets into the mobile app.

## 4. Fact / Inference / Assumption / Unknown Register

- Fact: The app must preserve canonical state and constituency identifiers and must not fabricate geometry or booth coordinates.
- Fact: A source-level import scan alone is not proof; production Metro source maps and actual Android archives are required.
- Inference: A selected-state runtime contract can remove all-state metadata from the app's base dependency graph while retaining server-side canonical source data.
- Unknown pending CI: Exact module graph after export, actual AAB/APK bytes, component byte breakdown and whether all gates pass.

## 5. Target Architecture & Intended Outcome

The mobile app receives schema-versioned data only for the selected state through /api/v1/states/:stateCode/map-data. Detailed booth coordinates are requested only for a selected constituency at high zoom through /api/v1/states/:stateCode/constituencies/:acNo/booths. Boundary geometry is downloaded using the versioned remote geography manifest. The national outline is the only intended bundled polygon shell.

## 6. Governing Rules & Constraints

Canonical IDs must come from the canonical server registry; never re-key an identity from a display label. Revisions must be verified. Missing or unsupported source data is explicitly unavailable. No synthetic coordinates, invented polygons, or silent fabricated zeros. Keep server authentication/security controls unchanged. No schema migration or database execution is in scope.

## 7. Full Scope of Work

1. Remove transitive all-state seed imports from the mobile map entry graph.
2. Introduce a typed, schema-versioned state-scoped metadata API and mobile client.
3. Preserve and validate canonical state/constituency IDs and content revisions.
4. Define loading, loaded, cached, offline, unavailable and error states.
5. Bound memory and persistent metadata/geometry caches by state count and bytes.
6. Deliver booth details incrementally and plot only verified coordinates.
7. Produce Metro source-map graph inventory and actual native AAB/APK component report.
8. Enforce graph and archive budgets in CI; keep failures fail-closed.

## 8. Explicit Out-of-Scope Boundaries

No production or staging database access, migrations, DDL/DML, deployment, credential changes, unrelated features, relaxation of authentication/security rules, or merge to master before the required gates pass.

## 9. Step-by-Step Implementation Plan

1. Commit this plan.
2. Commit a narrow GEO-02 authorization decision.
3. Commit EXECUTION_STATE.md with the decision commit as IMPLEMENTATION_AUTHORIZATION_COMMIT.
4. Implement state-scoped API and mobile cache contract.
5. Remove all transitive national seed and census/booth modules from the map graph.
6. Add schema, ID, revision, offline/unavailable, cache-bounds and no-fabricated-geometry tests.
7. Run API tests, mobile tests, typecheck, formatting/lint and governance tests.
8. Run production Metro export and inspect the actual source-map graph.
9. Build release AAB/APK, calculate archive/component sizes and SHA-256 values.
10. Make the graph and actual archive-size gates pass before independent verification and acceptance.

## 10. Verification & Testing Strategy

Run repository CI including API coverage tests, mobile unit tests, typecheck, lint/format checks and governance checks. Run the dedicated Android release workflow from the implementation commit. Inspect the generated source-map module inventory and the report produced directly from the AAB/APK ZIP contents.

## 11. Negative-Path Testing Specification

Test invalid state/AC codes, unsupported state, 404/unavailable, malformed schema, revision mismatch, duplicate IDs, canonical identity mismatch, bad coordinates, corrupted disk cache, network failure with and without cached data, cache eviction and empty/unverified booth geometry. No failed path may synthesize data.

## 12. Evidence Generation Plan

Upload mobile-release-size.json, mobile-release-size.md, geo-02-budget-gate.json, Metro source-map inventory, AAB, APK and SHA-256 checksums as a GitHub Actions artifact. Report native archive bytes separately from JavaScript module source bytes.

## 13. Reconciliation Plan

Reconcile each constituency ID to the canonical API registry, the revision hash to the serialized response body, the geometry version to the remote manifest, and cache filenames/index entries to validated revisions. Fail closed on mismatch.

## 14. Independent Verification Specification

A reviewer must reproduce the Metro export and native build at the exact implementation commit, verify no forbidden seed/census/booth modules remain in the base graph, recompute AAB/APK SHA-256 and sizes, and execute the contract/cache tests.

## 15. Risks, Failure Modes & Mitigations

- Offline/no cache: display explicit offline or unavailable state.
- Schema or revision mismatch: reject payload and retain only a previously verified snapshot.
- Missing geometry/coordinates: do not render fabricated geometry.
- Bundle regression: CI fails when forbidden seed modules return.
- Native build or size failure: keep GEO-02 open; do not relax thresholds to manufacture a pass.

## 16. Rollback & Recovery Strategy

Revert the implementation commit as a unit if verified behavior or release checks regress. No database rollback is required because the job performs no database operations.

## 17. Impact Assessment

Intended effect: smaller base package, per-state network fetches, bounded offline data, stable identity and verifiable native-size regression controls. A state without cached data may show unavailable offline rather than presenting fabricated content.

## 18. Acceptance Criteria

- No forbidden national seed/adapters/census/booth modules in the production Metro graph.
- Canonical state and constituency IDs validated without deriving identities from labels.
- Version/revision integrity, explicit states and cache limits covered by tests.
- No fabricated geography or booth coordinates.
- API/mobile tests, typecheck, lint/format and governance gates pass.
- Real AAB and APK produced and SHA-256 verified.
- AAB <= 30 MiB, APK <= 35 MiB and geography/state-data module source-content budget <= 2 MiB, unless the repository owner formally approves a changed budget.
- GEO-02 stays unaccepted until an independent acceptance record follows all successful gates.

## 19. Artifact & Commit Lineage Map

PLAN-GEO-02-REV-1.0.md planning commit -> GEO-02 authorization decision commit -> EXECUTION_STATE.md authorization coordinate -> implementation commit -> CI/build artifacts -> independent verification -> acceptance record.

## 20. Amendment Compliance Matrix

- Amendment v1.2: security and agent-not-final-acceptance boundaries preserved.
- Amendments v1.3 and v1.4: evidence, lineage and execution integrity preserved.
- Amendment v1.5/A: planning and commit-bound authorization precede implementation.
- Amendment v1.6: no self-acceptance; independent verification remains a separate lifecycle state.

## 21. Operational Declarations

The job is limited to mobile runtime-data architecture and release evidence. Production remains air-gapped; no staging token or database access is requested. The user explicitly authorized the GEO-02 remediation in this conversation. Authorization does not itself imply acceptance.

## 22. Plan Sign-Off & Review Request

**Plan:** Approved for the narrowly defined GEO-02 work by the user's explicit directive on 2026-10-25.
**Implementation authorization:** Will be recorded in a separate commit before product implementation files are committed.
**Acceptance:** Not granted by this plan; requires passing test, graph, native archive and independent-verification gates.
