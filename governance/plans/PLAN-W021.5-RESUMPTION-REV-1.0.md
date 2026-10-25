# PLAN-W021.5-RESUMPTION-REV-1.0
## W021.5 National Political Intelligence — Controlled Resumption and Closure

- **Date:** 2026-10-25
- **Baseline:** `33945d20f318ae1aa0d9aba35052246599c5bbae`
- **Branch:** `w0215-resumption-2026-10-25`
- **Authorization:** `governance/authorizations/W021.5_RESUMPTION_AUTHORIZATION_2026-10-25.md`
- **Status:** APPROVED FOR SCOPED IMPLEMENTATION; EVIDENCE AND OWNER-EXECUTED STAGING GATES PENDING
- **Scope:** Remaining W021.5 requirements in the canonical 27-requirement / 50-criterion matrix; no new product scope.

## 1. CTO disposition and constraints

The explicit project-owner instruction dated 2026-10-25 supersedes the DEC-153 development freeze for this scoped resumption. The acting CTO adjudicator may issue technical decisions for repository architecture and schema design. This does not convert unavailable external facts into verified facts or substitute for physical inspection/notarization, nor does it constitute third-party independence.

- Production remains strictly air-gapped: no credentials, queries, DDL, DML, or deployment.
- The agent prepares SQL for the owner to execute in the Supabase staging SQL Editor. The agent does not connect to staging.
- All changes are isolated on this branch and submitted through a pull request; no direct master writes.
- Source claims must be classified OFFICIAL / DERIVED / VERIFIED / ESTIMATE / SCENARIO / INFERRED / UNVERIFIED / UNKNOWN as appropriate, with source, retrieval date, effective date, version, status and transformation history.
- No synthetic electoral facts, boundaries, postal beat polygons, polling-station crosswalks, election results, affidavits, or execution receipts.
- Existing migration history is append-only. Do not rewrite applied migrations to make tests pass.

## 2. Stage gates

### R0 — Baseline and governance reconciliation
- Verify current remote HEAD and branch ancestry.
- Reconcile the master specification, 15-document corpus, traceability matrix, execution ledger, completion matrix, database execution register, external-gate register, defect register and current migrations.
- Correct contradictions only with evidence and preserve historical values in a change log.
- Gate: no task may be called complete based solely on an authored file or a unit test.

### R1 — Source acquisition and data coverage
- Maintain `reports/w021_5_source_acquisition_register.json` with publisher, exact URL, retrieval timestamp, source publication/effective date, format, checksum, licence/terms, version, geographic/time coverage, transformation and validation evidence.
- Prioritize ECI delimitation orders/statistical reports/Form 20, ECI candidate affidavit portal, Census of India PCA, Survey of India administrative boundary database, State CEO polling-station registers, and India Post PIN metadata.
- Use secondary/open GIS repositories only as candidate data; never label them OFFICIAL. Reconcile feature identities and geometry against primary sources before acceptance.
- Downloadable public source files must be acquired into a reproducible local workflow and hash-verified. A search-result snippet is not source-file evidence.
- Gate: publish exact coverage by state/UT and year, with all missing source coordinates listed.

### R2 — Canonical geography
- Reconcile all 4,123 canonical AC identities with Migration 059 and the current statutory regime.
- Validate geometry type, coordinate ranges, geometry validity, duplicates, feature-to-canonical identity uniqueness, expected statutory seat counts, CRS and topological consistency.
- Keep 2008 delimitation, Assam 2023 and J&K post-reorganisation temporal regimes distinct.
- Do not use 2026 election portal geometries as a universal national current boundary dataset; coverage is election/state-specific and must be temporally classified.
- Postal beat polygon containment remains blocked unless authoritative polygons are obtained; centroids are not polygons.

### R3 — Political organization registry and candidate/contest population
- Prepare exact, idempotent staging SQL for the accepted 1,207-row organization catalog and the candidate/contest population.
- Reconcile current source counts against migrations, chunk packages and database execution register before SQL is delivered.
- Use natural identity and explicit provenance; fail closed on duplicate keys, source conflicts, unknown canonical entities and missing mandatory fields.
- Migration 067 must be evaluated only after exact candidate/contest row reconciliation; use ON DELETE RESTRICT and verify no orphan records.
- Gate: project owner runs SQL in staging and returns success output plus postflight result; agent verifies those artifacts and checks expected counts.

### R4 — Demographics and historical results
- Prefer ECI Form 20 / full statistical reports for election results and Census 2011 PCA for census aggregates.
- Keep election-year, election type, constituency regime, source publication/effective date and actual data vintage explicit.
- Do not represent district/subdistrict population as constituency-level data without a documented and defensible crosswalk/allocation method. Any estimate remains ESTIMATE and is not a substitute for official constituency-level population.
- Populate only source-backed rows. Preserve NULL/UNKNOWN for missing values.
- Gate: national coverage is quantified by state/UT, election year, constituency and source quality.

### R5 — Financial disclosure adjudication and migration 068
- CTO technical adjudication: accept the repository schema design only if its required tests and schema invariants pass; this does not certify the factual correctness of individual affidavit records.
- Enforce NULL for undisclosed amounts, nonnegative integer values where present, disaggregated self/spouse/dependent and movable/immovable classes, separate gross assets and liabilities, and no zero defaults.
- Prepare migration 068 and verification SQL for owner execution in staging only.
- Gate: catalog-level corroboration of nullable columns, absence of zero defaults, check constraints, foreign keys and RLS; tests must prove NULL renders “Not Disclosed”, never ₹0.

### R6 — API/mobile canonical data contracts
- Verify API route reads use canonical database-backed contracts and preserve source/effective date/version/status/transform history.
- Ensure mobile adapters cannot silently convert absent facts to fabricated defaults or fall back to state-specific static data where canonical data is required.
- Preserve explicit loading, unavailable, stale, cached and offline states.
- Gate: contract, regression and security tests pass; no unauthorized data source fallback remains.

### R7 — Independent evidence and closure
- Run deterministic verification locally and record exact command, exit code, stdout/stderr, timestamp, branch SHA and artifact hashes.
- Reconcile all requirement and criterion dispositions, task weights and blockers.
- CTO acceptance is criterion-specific and evidence-bound. External physical/notarial gates remain open until their real artifacts are supplied.
- Gate: no completion claims beyond evidence; PR must include SQL files, source register, tests, evidence and remaining external gates.

## 3. Execution order

1. R0 and source-register initialization.
2. R1 acquisition and coverage triage in parallel with local schema review.
3. R2 geometry candidate acquisition and validation.
4. R3 organization/candidate staging package preparation.
5. R4 official data extraction, normalization and coverage report.
6. R5 financial disclosure adjudication and owner-executed staging package.
7. R6 API/mobile contract verification.
8. R7 evidence reconciliation and pull request.

Dependencies: R3 candidate FK work follows candidate/contest identity reconciliation; R4 backfill follows schema/source validation; R6 canonical route cutover follows staging schema proof. Production cutover is outside this plan and remains unauthorized.

## 4. Acceptance accounting

Keep these states separate:
- repository implementation;
- local automated verification;
- source-data acquisition and validation;
- owner-executed staging SQL;
- independent staging catalog corroboration;
- formal CTO acceptance;
- external physical/legal evidence.

Do not infer one state from another. Any unavailable source or unmet criterion remains BLOCKED/UNKNOWN with a named custodian and exact evidence needed.
