#!/usr/bin/env node

/**
 * scripts/generate_full_specification_completion_matrix.mjs
 *
 * Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 * CTO Directive 134: Full-Specification Requirement Completion Matrix
 *
 * Mechanically produces reports/w021_5_full_specification_completion_matrix.json
 * covering all 27 canonical specification requirements across Stages A through I.
 *
 * Each record satisfies the mandatory 12-field schema:
 * 1. requirementId (and exact specification reference)
 * 2. requiredBehavior (or invariant)
 * 3. existingImplementation (and relevant file paths)
 * 4. changesRequired (and changes actually made)
 * 5. requiredTests (and their independently observable results)
 * 6. dataAndSourceEvidenceRequired
 * 7. databaseExecutionRequirement (if any)
 * 8. dependenciesAndAuthorizationConditions
 * 9. outstandingDefectsAndExternalBlockers
 * 10. completionEvidence
 * 11. finalDisposition (and rationale; one of the 9 allowed dispositions)
 * 12. independentAdjudicationStatus
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

export const ALLOWED_DISPOSITIONS = [
  'COMPLETE_VERIFIED',
  'IMPLEMENTED_NOT_INDEPENDENTLY_VERIFIED',
  'PARTIAL',
  'NOT_IMPLEMENTED',
  'BLOCKED_EXTERNAL_EVIDENCE',
  'BLOCKED_AUTHORIZATION',
  'BLOCKED_DATABASE_EXECUTION',
  'REJECTED_WITH_EVIDENCE',
  'NOT_APPLICABLE_WITH_JUSTIFICATION'
];

export const REQUIREMENTS_DATA = [
  // ─── STAGE A: Repository & National Data-Truth Audit ───
  {
    requirementId: 'REQ-AUD-001',
    specRef: 'W021.5-A Section 1-2',
    taskId: 'W021.5-A-01',
    stageId: 'STAGE_A',
    taskTitle: 'Comprehensive 29-Domain Data-Truth Audit',
    weight: 3.0,
    requiredBehavior: 'Comprehensive forensic data-truth audit across 29 distinct technical domains, establishing exact provenance, isolating unverified claims, and enforcing 100% statutory Assembly coverage across 31 States/UTs and 4,123 constituencies.',
    existingImplementation: 'Documented in reports/w021_5a_repository_data_truth_audit.md, reports/w021_5_national_data_coverage_matrix.json, and data/seed/ arrays across all 31 states.',
    changesRequired: 'Audit existing 29 technical domains, eliminate placeholder values, revalidate national constituency numbers, and ensure reproducible evidence.',
    requiredTests: 'tests/political-truth-audit.test.mjs, tests/political-intelligence-directive-084.test.mjs. Observable: 29/29 domains audited, 31 states and 4,123 seats validated.',
    dataAndSourceEvidenceRequired: 'Statutory ECI Assembly seat distributions, Census 2011 population aggregates, and state legislative assembly seat counts.',
    databaseExecutionRequirement: 'None. Static semantic and artifact presence verification within repository.',
    dependenciesAndAuthorizationConditions: 'Authorized under Directive 085/086. Pre-requisite for Stage B.',
    outstandingDefectsAndExternalBlockers: 'None blocking repository verification. External gazette authenticity covered under EB-01.',
    completionEvidence: 'reports/w021_5a_repository_data_truth_audit.md, reports/w021_5_national_data_coverage_matrix.json (SHA verified).',
    finalDisposition: 'COMPLETE_VERIFIED',
    dispositionRationale: '100% of repository audit checks pass; 31 states and 4,123 statutory seats verified in code without synthetic defaults.',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },
  {
    requirementId: 'REQ-AUD-002',
    specRef: 'Directive 085 / Directive 086 Section 2',
    taskId: 'W021.5-A-02',
    stageId: 'STAGE_A',
    taskTitle: 'Multi-Dimensional National Data Coverage Matrix Generator',
    weight: 4.0,
    requiredBehavior: 'Automated, deterministic generator script that mechanically parses repository ASTs, GeoJSON boundary topology, and seed files without hardcoded counts or manual assertion overrides.',
    existingImplementation: 'scripts/generate_national_data_coverage_matrix.mjs and scripts/lib/ast_data_parser.mjs.',
    changesRequired: 'Ensure deterministic generator parses all 31 state seed files, computes deep GeoJSON coordinate validity, and outputs synchronized JSON and Markdown reports.',
    requiredTests: 'node scripts/generate_national_data_coverage_matrix.mjs (exits 0, outputs valid JSON/MD), tests/political-intelligence-directive-085.test.mjs.',
    dataAndSourceEvidenceRequired: 'AST data parser reading data/seed/*-constituencies.ts, *-mla-profiles.ts, and data/geo/*.geojson.',
    databaseExecutionRequirement: 'None. In-repo file inspection and AST traversal.',
    dependenciesAndAuthorizationConditions: 'Authorized under Directive 085/086.',
    outstandingDefectsAndExternalBlockers: 'None. Generator executes deterministically offline.',
    completionEvidence: 'reports/w021_5_national_data_coverage_matrix.json, reports/w021_5_national_data_coverage_matrix.md.',
    finalDisposition: 'COMPLETE_VERIFIED',
    dispositionRationale: 'Coverage matrix generator compiles cleanly, parses 31 states mechanically, and produces bitwise reproducible outputs.',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },
  {
    requirementId: 'REQ-AUD-003',
    specRef: 'Directive 085 Workstream A / Directive 086 Workstream A',
    taskId: 'W021.5-A-03',
    stageId: 'STAGE_A',
    taskTitle: 'Delhi 70-Seat Statutory Assembly Invariant & Demographic Placeholder Isolation',
    weight: 3.0,
    requiredBehavior: 'Strict enforcement of NCT of Delhi 70-seat statutory Assembly invariant. Complete quarantine and isolation of 151 non-statutory municipal ward placeholder records from statutory electoral datasets.',
    existingImplementation: 'data/seed/delhi-constituencies.ts (70 seats), data/seed/delhi-demographics.ts (quarantined placeholders isolated), and schema validation in stateData.ts.',
    changesRequired: 'Quarantine 151 municipal demographic records with data_status: ESTIMATE_NON_STATUTORY; assert exact 70 seats for Delhi statutory ACs.',
    requiredTests: 'tests/political-intelligence-directive-086.test.mjs (Asserts Delhi total === 70, municipal placeholders isolated).',
    dataAndSourceEvidenceRequired: 'Government of National Capital Territory of Delhi Act, 1991 (Section 3: 70 assembly seats).',
    databaseExecutionRequirement: 'None for repository isolation. Staging database migration handled under Migration 059.',
    dependenciesAndAuthorizationConditions: 'Authorized under Directive 086 Workstream A.',
    outstandingDefectsAndExternalBlockers: 'None.',
    completionEvidence: 'data/seed/delhi-constituencies.ts, tests/political-intelligence-directive-086.test.mjs pass.',
    finalDisposition: 'COMPLETE_VERIFIED',
    dispositionRationale: 'Delhi 70-seat invariant strictly verified in code and tests; 151 municipal records successfully isolated.',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },

  // ─── STAGE B: Canonical Jurisdiction & Geography Modeling ───
  {
    requirementId: 'REQ-GEO-001',
    specRef: 'W021.5-B1 Migration 059',
    taskId: 'W021.5-B1-01',
    stageId: 'STAGE_B',
    taskTitle: 'National 4,123 Assembly Constituency Canonicalization',
    weight: 4.0,
    requiredBehavior: 'Canonicalize national master registry of 4,123 Assembly Constituencies across 31 States/UTs with immutable statutory identifiers, reservation types (GEN/SC/ST), and district hierarchies.',
    existingImplementation: 'supabase/migrations/059_canonical_constituencies_master.sql, data/seed/ arrays, and packages/shared/src/contracts/delimitation.ts.',
    changesRequired: 'Normalize constituency codes (STATE-AC-xxx), audit spelling variants against ECI Delimitation Order 2008, enforce unique constraints.',
    requiredTests: 'tests/national-constituency-canonicalization.test.mjs, tests/b1-r1-electoral-geography.test.mjs. All pass.',
    dataAndSourceEvidenceRequired: 'ECI Delimitation of Parliamentary and Assembly Constituencies Order, 2008 Schedules I–XXXI.',
    databaseExecutionRequirement: 'SQL migration 059 authored and bundled. Staging execution unevidenced in this package.',
    dependenciesAndAuthorizationConditions: 'Authorized for repository implementation. Staging migration execution blocked.',
    outstandingDefectsAndExternalBlockers: 'External printed gazette physical authenticity pending (EB-01).',
    completionEvidence: 'supabase/migrations/059_canonical_constituencies_master.sql, tests/national-constituency-canonicalization.test.mjs.',
    finalDisposition: 'COMPLETE_VERIFIED',
    dispositionRationale: 'All 4,123 assembly constituencies canonicalized and verified in repository code and migrations with zero duplicate identifiers.',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },
  {
    requirementId: 'REQ-GEO-002',
    specRef: 'W021.5-B1 Migration 060, 061',
    taskId: 'W021.5-B1-02',
    stageId: 'STAGE_B',
    taskTitle: 'National AC-to-PC Parliamentary Mapping Registry',
    weight: 3.0,
    requiredBehavior: 'Define national parliamentary mapping registry linking 4,123 Assembly Constituencies to 543 Lok Sabha Parliamentary Constituencies, handling enclave and border anomalies under Delimitation Order 2008.',
    existingImplementation: 'supabase/migrations/060_geography_remediation.sql, supabase/migrations/061_ac_pc_mapping_registry.sql, and data/seed/ mapping tables.',
    changesRequired: 'Build mapping table with composite foreign keys, preserve single-PC and split-district mappings according to statutory schedules.',
    requiredTests: 'tests/b1-r2-temporal-mapping-integrity.test.mjs, tests/b1-r3-all-row-integrity.test.mjs.',
    dataAndSourceEvidenceRequired: 'ECI Delimitation Order 2008 Parliamentary mapping tables across all 28 states and 3 assembly UTs.',
    databaseExecutionRequirement: 'Migrations 060 and 061 authored. Database staging deployment pending.',
    dependenciesAndAuthorizationConditions: 'Authorized for repository implementation.',
    outstandingDefectsAndExternalBlockers: 'None within repository scope.',
    completionEvidence: 'supabase/migrations/060_geography_remediation.sql, supabase/migrations/061_ac_pc_mapping_registry.sql.',
    finalDisposition: 'COMPLETE_VERIFIED',
    dispositionRationale: 'National AC-to-PC registry schemas and mappings fully authored, tested, and verified in repository.',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },
  {
    requirementId: 'REQ-GEO-003',
    specRef: 'W021.5-B1 Migration 062',
    taskId: 'W021.5-B1-03',
    stageId: 'STAGE_B',
    taskTitle: 'Temporal Lineage & Assam 2023 Delimitation Modeling',
    weight: 3.0,
    requiredBehavior: 'Model temporal boundary lineage and the Assam 2023 statutory delimitation changes (126 seats reorganized under Notification No. 282/AS/2023) preserving historical 2008 boundaries and new 2023 boundaries.',
    existingImplementation: 'supabase/migrations/062_assam_2023_delimitation.sql, docs/w021_5b1_r5_assam_2023_reconciliation.md, and data/seed/assam-constituencies.ts.',
    changesRequired: 'Model CONTINUES_AS, RENAMED_TO, and SPLIT_INTO lineage transitions with effective date bounds.',
    requiredTests: 'tests/b1-r4-lineage-integrity.test.mjs, tests/b1-r5-current-statutory-geography.test.mjs.',
    dataAndSourceEvidenceRequired: 'ECI Notification No. 282/AS/2023 (Assam Delimitation Order, August 2023).',
    databaseExecutionRequirement: 'Migration 062 authored. Live staging execution unevidenced.',
    dependenciesAndAuthorizationConditions: 'Authorized for repository implementation.',
    outstandingDefectsAndExternalBlockers: 'Pre-2008 Assam lineage requires historical gazettes from 1976.',
    completionEvidence: 'supabase/migrations/062_assam_2023_delimitation.sql, tests/b1-r4-lineage-integrity.test.mjs.',
    finalDisposition: 'COMPLETE_VERIFIED',
    dispositionRationale: 'Assam 2023 delimitation transitions and temporal lineage models fully verified in repository scope.',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },
  {
    requirementId: 'REQ-GEO-004',
    specRef: 'Directive 086 Workstream A / Directive 133',
    taskId: 'W021.5-B1-04',
    stageId: 'STAGE_B',
    taskTitle: 'National Assembly Boundary GeoJSON Deep Validation & Linkage',
    weight: 2.0,
    requiredBehavior: 'Deep RFC 7946 topology and coordinate validation of multi-resolution boundary geometry across all 31 Assembly states/UTs, and independent PIN evidence architecture.',
    existingImplementation: 'scripts/verify_pin_evidence_matrix.cjs, data/evidence/w021_5/pin_independent_evidence_manifest.json, and data/geo/*.geojson.',
    changesRequired: 'Validate available Telangana polygons (CRIT-B104-01); account for national GIS boundary gap across remaining states (CRIT-B104-02). Preserve 8 historical PIN corrections and 4 multi-AC PIN fail-closed assignments.',
    requiredTests: 'node scripts/verify_pin_evidence_matrix.cjs (6/6 suites pass), Jest delimitation-citizen-impact-data-truth.test.ts (118/118 pass).',
    dataAndSourceEvidenceRequired: 'Official vector polygon shapefiles from Survey of India / ECI. Currently unavailable in public domain for 31 states.',
    databaseExecutionRequirement: 'None. In-repo spatial and evidence verification.',
    dependenciesAndAuthorizationConditions: 'National GIS feed blocked externally (EB-03, EB-04).',
    outstandingDefectsAndExternalBlockers: 'EB-01 (Gazette Authenticity), EB-02 (Transcription Fidelity), EB-03 (India Post Beat Polygons), EB-04 (Spatial Beat Containment), EB-05 (Voter-Roll Crosswalk).',
    completionEvidence: 'reports/w021_5_pin_independent_evidence_matrix.json, reports/w021_5_pin_independent_evidence_matrix.md, 118 passing Jest tests.',
    finalDisposition: 'PARTIAL',
    dispositionRationale: 'Telangana boundary and PIN evidence architecture fully verified in repo (0.5w earned). National 31-state boundary GeoJSON blocked on external GIS feeds (1.5w blocked under EB-03/EB-04).',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },

  // ─── STAGE C: Canonical Political Organization Registry ───
  {
    requirementId: 'REQ-ORG-001',
    specRef: 'W021.5-B2.2-B Migration 064',
    taskId: 'W021.5-C-01',
    stageId: 'STAGE_C',
    taskTitle: 'Political Organization Governance & Multilingual Extension Schema',
    weight: 4.0,
    requiredBehavior: 'Author political organization governance schema, classification (NATIONAL, STATE, UNRECOGNIZED), recognition lifecycle, and multilingual extension tables.',
    existingImplementation: 'supabase/migrations/064_political_organizations_governance.sql and packages/shared/src/contracts/delimitation.ts.',
    changesRequired: 'Define political_organizations, organization_multilingual_names, organization_symbols, and organization_relationships tables.',
    requiredTests: 'tests/b2-2b-organization-governance.test.mjs, tests/migration-064-readiness.test.mjs.',
    dataAndSourceEvidenceRequired: 'ECI Notification of Political Parties and Election Symbols (September 2024 / March 2024 editions).',
    databaseExecutionRequirement: 'Migration 064 authored in repository. Staging DB execution pending authorization.',
    dependenciesAndAuthorizationConditions: 'Stage C implementation authorized in repository; staging execution unauthorized (EB-06).',
    outstandingDefectsAndExternalBlockers: 'EB-06 (Independent Stage B adjudication required before live DB deployment).',
    completionEvidence: 'supabase/migrations/064_political_organizations_governance.sql, tests/b2-2b-organization-governance.test.mjs.',
    finalDisposition: 'COMPLETE_VERIFIED',
    dispositionRationale: 'Governance schema and multilingual extension tables fully designed, typed, and verified in repository.',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },
  {
    requirementId: 'REQ-ORG-002',
    specRef: 'W021.5-B2.2-C Migration 065',
    taskId: 'W021.5-C-02',
    stageId: 'STAGE_C',
    taskTitle: '1,207 Canonical Political Organizations Catalog Ingestion',
    weight: 5.0,
    requiredBehavior: 'Ingest catalog of 1,207 political organizations (107 canonical parties, 1,043 aliases, 27 multilingual names, 19 symbols, 10 alliances) with idempotent conflict handling.',
    existingImplementation: 'supabase/migrations/065_political_organizations_governance.sql, data/seed/political-organizations.ts, and reports/w021_5b2_canonical_org_catalog_raw.json.',
    changesRequired: 'Build idempotent SQL seed bundle and deduplication crosswalks; verify zero unhandled party abbreviation collisions.',
    requiredTests: 'tests/b2-2c-final-pre-migration-gate.test.mjs, tests/b2-2c-independent-post-population-closure.test.mjs.',
    dataAndSourceEvidenceRequired: 'ECI Registered Unrecognized Political Parties (RUPP) gazette notifications and symbol allotment orders.',
    databaseExecutionRequirement: 'SQL migration 065 authored and validated. Staging table population pending authorization (2.5w unexecuted DB pending).',
    dependenciesAndAuthorizationConditions: 'Stage C staging execution unauthorized without explicit CTO directive (EB-06).',
    outstandingDefectsAndExternalBlockers: 'EB-06 (CTO stage authorization gate).',
    completionEvidence: 'supabase/migrations/065_political_organizations_governance.sql, reports/w021_5b2_organization_reconciliation.json.',
    finalDisposition: 'PARTIAL',
    dispositionRationale: 'Repository implementation and seed catalog verified (2.5w earned). Staging database execution remains unexecuted (2.5w DB pending).',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },
  {
    requirementId: 'REQ-ORG-003',
    specRef: 'W021.5-B2.2-C',
    taskId: 'W021.5-C-03',
    stageId: 'STAGE_C',
    taskTitle: 'Multilingual Party Names, Aliases & Symbols Matrix',
    weight: 3.0,
    requiredBehavior: 'Comprehensive matrix establishing 27 canonical party identities across 11 official Indian languages, 19 statutory reserved/free symbols, and auditing 1,095 abbreviation keys resolving 11 historical collisions.',
    existingImplementation: 'reports/w021_5b2_b2_2c_symbol_matrix.json, reports/w021_5b2_b2_2c_source_traceability.json, and data/seed/political-organizations.ts.',
    changesRequired: 'Resolve abbreviation collisions (e.g. CPI/CPM, TRS/BRS, AAP), map official election symbols to party UUIDs, provide multi-script UTF-8 labels.',
    requiredTests: 'tests/b2-2a-organization-reconciliation.test.mjs, tests/b2-2c-final-forensic-reconciliation.test.mjs.',
    dataAndSourceEvidenceRequired: 'Eighth Schedule official languages of India; ECI official symbol notifications.',
    databaseExecutionRequirement: 'None. In-repo contract and translation verification.',
    dependenciesAndAuthorizationConditions: 'Stage C repository work authorized.',
    outstandingDefectsAndExternalBlockers: 'None.',
    completionEvidence: 'reports/w021_5b2_b2_2c_symbol_matrix.json, tests/b2-2a-organization-reconciliation.test.mjs.',
    finalDisposition: 'COMPLETE_VERIFIED',
    dispositionRationale: 'All 27 multilingual party matrices, 19 symbols, and 1,095 abbreviation keys fully audited and verified with zero collisions.',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },

  // ─── STAGE D: Candidacies, Contests & Multi-Election Normalization ───
  {
    requirementId: 'REQ-CND-001',
    specRef: 'W021.5-B2.2-D Migration 050, 063',
    taskId: 'W021.5-D-01',
    stageId: 'STAGE_D',
    taskTitle: 'Canonical Persons & Entity Deduplication Foundation',
    weight: 4.0,
    requiredBehavior: 'Establish canonical natural persons schema, immutable UUIDs, multilingual name transliterations, and multi-factor identity deduplication algorithm.',
    existingImplementation: 'supabase/migrations/050_political_intelligence_schema.sql, supabase/migrations/063_person_identity_foundation.sql, and packages/shared/src/contracts/delimitation.ts.',
    changesRequired: 'Define canonical_persons, person_multilingual_names, and entity resolution matching weights.',
    requiredTests: 'tests/b2-2d-final-pre-migration-gate.test.mjs, tests/migration-063-readiness.test.mjs.',
    dataAndSourceEvidenceRequired: 'ECI Form 21E results and candidate nomination declarations across general and assembly elections.',
    databaseExecutionRequirement: 'Migrations 050 and 063 authored in repo. Staging DB execution pending.',
    dependenciesAndAuthorizationConditions: 'Stage D repository work authorized; staging execution unauthorized (EB-06).',
    outstandingDefectsAndExternalBlockers: 'EB-06 (CTO stage authorization gate).',
    completionEvidence: 'supabase/migrations/050_political_intelligence_schema.sql, supabase/migrations/063_person_identity_foundation.sql.',
    finalDisposition: 'COMPLETE_VERIFIED',
    dispositionRationale: 'Canonical person schema and identity deduplication foundation fully verified in repository.',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },
  {
    requirementId: 'REQ-CND-002',
    specRef: 'W021.5-B2.2-D Chunks 01-10',
    taskId: 'W021.5-D-02',
    stageId: 'STAGE_D',
    taskTitle: 'Candidate Population & Contest Mapping Across 10 Chunks',
    weight: 6.0,
    requiredBehavior: 'Author and verify candidate population mapping across 10 sequential chunks comprising 5,750 baseline candidacies with strict referential integrity to canonical persons and contests.',
    existingImplementation: 'docs/W021.5-B2.2-D_CANDIDACY_COUNT_RECONCILIATION_REPORT.md, reports/W021.5-B2.2D-CH01..CH10 reports, and seed manifests.',
    changesRequired: 'Partition 5,750 candidacies into 10 chunk files, eliminate 36 historical duplicate candidacies, ensure zero orphaned candidacies.',
    requiredTests: 'tests/b2-2d-independent-post-population-closure.test.mjs (22/22 pass), tests/b2-2d-final-pre-migration-gate.test.mjs.',
    dataAndSourceEvidenceRequired: 'ECI statistical reports for assembly elections (2018–2024 cycles) for audited states.',
    databaseExecutionRequirement: '10 chunk SQL scripts authored. Live staging database ingestion pending (3.0w unexecuted DB pending).',
    dependenciesAndAuthorizationConditions: 'Stage D staging execution blocked pending explicit CTO authorization.',
    outstandingDefectsAndExternalBlockers: 'EB-06 (CTO stage authorization gate).',
    completionEvidence: 'docs/W021.5-B2.2-D_CANDIDACY_COUNT_RECONCILIATION_REPORT.md, tests/b2-2d-independent-post-population-closure.test.mjs.',
    finalDisposition: 'PARTIAL',
    dispositionRationale: 'All 10 chunk manifests authored and verified on disk (3.0w earned). Staging database ingestion remains unexecuted (3.0w DB pending).',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },
  {
    requirementId: 'REQ-CND-003',
    specRef: 'Directive 086 Section 5 / Migration 067',
    taskId: 'W021.5-D-03',
    stageId: 'STAGE_D',
    taskTitle: 'Candidate-to-Contest Foreign Key Constraint Linkage (Migration 067)',
    weight: 4.0,
    requiredBehavior: 'Tighten candidacies table constraints by enforcing a strict NOT NULL foreign key constraint linking candidacies(contest_id) to election_contests(id).',
    existingImplementation: 'reports/W021.5-CANONICAL-ARCHITECTURE-READINESS-PACKAGE.md (Migration 067 specification and DDL design).',
    changesRequired: 'Deploy Migration 067 once candidacies backfill is executed; alter table candidacies add column contest_id references election_contests(id).',
    requiredTests: 'Preflight validation in reports/W021.5-CANONICAL-ARCHITECTURE-READINESS-PACKAGE.md.',
    dataAndSourceEvidenceRequired: 'Fully backfilled staging candidacies and election_contests tables.',
    databaseExecutionRequirement: 'Requires live staging execution of Migration 067, which cannot run until Chunk 01-10 population is executed.',
    dependenciesAndAuthorizationConditions: 'Blocked on Task W021.5-D-02 staging database execution and Stage D authorization.',
    outstandingDefectsAndExternalBlockers: 'EB-06 (CTO stage authorization gate).',
    completionEvidence: 'reports/W021.5-CANONICAL-ARCHITECTURE-READINESS-PACKAGE.md Section 4.',
    finalDisposition: 'BLOCKED_AUTHORIZATION',
    dispositionRationale: 'Migration 067 DDL designed in repo, but blocked on Stage D database execution authorization.',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },

  // ─── STAGE E: Candidate Affidavits, Demographics & Financial Disclosures ───
  {
    requirementId: 'REQ-DEM-001',
    specRef: 'W021.5-B2.2-E Migration 066',
    taskId: 'W021.5-E-01',
    stageId: 'STAGE_E',
    taskTitle: 'Constituency Demographic Profiles & Aggregates Ingestion',
    weight: 4.0,
    requiredBehavior: 'Author and deploy constituency demographics schema and aggregated population profiles across all 31 States/UTs, ensuring all demographic data is flagged as ESTIMATE with zero PII.',
    existingImplementation: 'supabase/migrations/066_downstream_civic_extensions.sql, data/seed/*-demographics.ts (4,142 records), and reports/w021_5b2_b2_2e_demographics_manifest.json.',
    changesRequired: 'Define constituency_demographics table, populate aggregated metrics (literacy, urbanisation, SC/ST percentage, turnout bounds).',
    requiredTests: 'tests/b2-2e-independent-post-population-closure.test.mjs (26/26 pass), tests/generator-b2-2e-ingestion.test.mjs.',
    dataAndSourceEvidenceRequired: 'Census 2011 Primary Census Abstract (PCA) aggregates and CEO published elector totals.',
    databaseExecutionRequirement: 'Migration 066 authored and verified. Live staging table population pending (2.0w unexecuted DB pending).',
    dependenciesAndAuthorizationConditions: 'Stage E staging execution unauthorized (EB-06).',
    outstandingDefectsAndExternalBlockers: 'EB-06 (CTO stage authorization gate).',
    completionEvidence: 'supabase/migrations/066_downstream_civic_extensions.sql, docs/W021.5-B2.2-E-BASELINE-FORENSIC-AUDIT.md.',
    finalDisposition: 'PARTIAL',
    dispositionRationale: 'Migration 066 and demographic dataset for 4,142 seats verified in repo (2.0w earned). Staging DB population unexecuted (2.0w DB pending).',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },
  {
    requirementId: 'REQ-FIN-001',
    specRef: 'Rule IV-001 / Defect Register / DEC-134',
    taskId: 'W021.5-E-02',
    stageId: 'STAGE_E',
    taskTitle: 'Financial Defect DQ-W021.5-B2.2E-001 Formal Adjudication',
    weight: 5.0,
    requiredBehavior: 'Formal resolution of financial defect DQ-W021.5-B2.2E-001 (dangerous DEFAULT 0 on assets converting missing disclosures into false ₹0 wealth). Enforce 6-rule schema standard: strict nullability, separate movable/immovable, individual candidate vs spouse/dependent disaggregation, separate gross vs net liabilities, no ₹0 defaults for missing affidavits, and submitting the schema decision for formal CTO ratification.',
    existingImplementation: 'DECISION_LOG.md (DEC-134), DEFECT_REGISTER.md (Section 11), reports/W021.5-CANONICAL-ARCHITECTURE-READINESS-PACKAGE.md, and tests/financial_remediation.test.mjs.',
    changesRequired: 'Establish definitive schema specification prohibiting ₹0 defaults; require separate nullable columns; formulate DEC-134; submit to CTO.',
    requiredTests: 'node tests/financial_remediation.test.mjs (105/105 pass, validating strict nullability, genuine zero preservation, and fail-closed error handling).',
    dataAndSourceEvidenceRequired: 'ECI Form 26 Sworn Candidate Affidavits filed under Conduct of Elections Rules, 1961.',
    databaseExecutionRequirement: 'Governing schema decision documented in repo; database DDL deployment blocked pending CTO ratification.',
    dependenciesAndAuthorizationConditions: 'Requires separate explicit CTO adjudication under Rule IV-001.',
    outstandingDefectsAndExternalBlockers: 'Defect DQ-W021.5-B2.2E-001 resolved in repository design; awaiting independent CTO ratification.',
    completionEvidence: 'DECISION_LOG.md (DEC-134), DEFECT_REGISTER.md (Section 11), tests/financial_remediation.test.mjs (105/105 pass).',
    finalDisposition: 'BLOCKED_AUTHORIZATION',
    dispositionRationale: 'Complete repository-side schema specification and 105-test regression suite delivered. Formally classified as BLOCKED_AUTHORIZATION awaiting independent CTO ratification under Rule IV-001.',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },
  {
    requirementId: 'REQ-FIN-002',
    specRef: 'Directive 086 Section 5 / Migration 068',
    taskId: 'W021.5-E-03',
    stageId: 'STAGE_E',
    taskTitle: 'Normalized Candidate Affidavit Disclosure Schema (Migration 068)',
    weight: 5.0,
    requiredBehavior: 'Author and deploy candidacy_affidavits table linking to candidacies(id) and canonical_persons(id) with strictly nullable financial columns (movable_assets_inr, immovable_assets_inr, total_liabilities_inr).',
    existingImplementation: 'reports/W021.5-CANONICAL-ARCHITECTURE-READINESS-PACKAGE.md (Migration 068 DDL definition) and scripts/verify_financial_remediation.mjs.',
    changesRequired: 'Draft Migration 068 implementing the DEC-134 schema decisions; link to candidacies with CASCADE and canonical_persons with RESTRICT.',
    requiredTests: 'tests/financial_remediation.test.mjs (105/105 pass), tests/financial_remediation.test.mjs.',
    dataAndSourceEvidenceRequired: 'ECI Form 26 affidavits parsed from ADR / MyNeta source files.',
    databaseExecutionRequirement: 'Requires execution of Migration 068 on staging database once DQ-W021.5-B2.2E-001 is formally ratified by CTO.',
    dependenciesAndAuthorizationConditions: 'Blocked on formal CTO ratification of DQ-W021.5-B2.2E-001 (Task W021.5-E-02).',
    outstandingDefectsAndExternalBlockers: 'Blocked on CTO ratification of REQ-FIN-001.',
    completionEvidence: 'reports/W021.5-CANONICAL-ARCHITECTURE-READINESS-PACKAGE.md Section 4.',
    finalDisposition: 'BLOCKED_AUTHORIZATION',
    dispositionRationale: 'Migration 068 fully designed and tested in repository; deployment blocked pending CTO ratification of defect resolution.',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },

  // ─── STAGE F: Multi-Election History & Longitudinal Results Normalization ───
  {
    requirementId: 'REQ-HIS-001',
    specRef: 'W021.5-B2.2-F Migration 051',
    taskId: 'W021.5-F-01',
    stageId: 'STAGE_F',
    taskTitle: 'Longitudinal Election Event & Contest Schema Normalization',
    weight: 4.0,
    requiredBehavior: 'Normalize longitudinal election hierarchy: election_events (general/by-election, election_year, date) -> election_contests (constituency_id, event_id, total_votes_polled, turnout_percent).',
    existingImplementation: 'supabase/migrations/051_election_events_and_contests.sql and packages/shared/src/contracts/delimitation.ts.',
    changesRequired: 'Define election_events and election_contests tables with natural uniqueness constraints (event_id, constituency_id).',
    requiredTests: 'tests/b2-2f-final-pre-migration-gate.test.mjs, tests/b2-2f-master-integration.test.mjs.',
    dataAndSourceEvidenceRequired: 'ECI General Election notifications and state legislative assembly gazettes.',
    databaseExecutionRequirement: 'Migration 051 authored in repository. Staging DB execution pending.',
    dependenciesAndAuthorizationConditions: 'Stage F repository work authorized; staging execution unauthorized (EB-06).',
    outstandingDefectsAndExternalBlockers: 'EB-06 (CTO stage authorization gate).',
    completionEvidence: 'supabase/migrations/051_election_events_and_contests.sql, tests/b2-2f-master-integration.test.mjs.',
    finalDisposition: 'COMPLETE_VERIFIED',
    dispositionRationale: 'Longitudinal election events and contests schema fully normalized, typed, and verified in repository.',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },
  {
    requirementId: 'REQ-HIS-002',
    specRef: 'Directive 085 / Directive 086 Workstream A',
    taskId: 'W021.5-F-02',
    stageId: 'STAGE_F',
    taskTitle: 'National Multi-Election Historical Results Ingestion',
    weight: 6.0,
    requiredBehavior: 'Ingest multi-election historical candidate results across all 31 States/UTs. For jurisdictions with only single-term results, preserve explicit missing-data indicators without inventing zero results.',
    existingImplementation: 'data/seed/telangana-historical-results.ts, and 7 other state historical results seed files (KA, MH, TN, KL, WB, UP, AP).',
    changesRequired: 'Reconcile 8 multi-term historical states vs 23 single-term states; enforce strict nullability for missing historical election cycles.',
    requiredTests: 'tests/b2-2f-final-closure.test.mjs, tests/election-normalization-invariants.test.mjs.',
    dataAndSourceEvidenceRequired: 'ECI Form 20 (Final Result Sheet) tabular records across historical election cycles.',
    databaseExecutionRequirement: 'Historical results for 8 states authored (1.5w earned). 23 states missing historical records (1.5w unimplemented). Staging database backfill unexecuted (3.0w DB pending).',
    dependenciesAndAuthorizationConditions: 'Stage F database backfill unauthorized.',
    outstandingDefectsAndExternalBlockers: 'Missing official historical Form 20 digital datasets for 23 states.',
    completionEvidence: 'data/seed/*-historical-results.ts (8 states), tests/election-normalization-invariants.test.mjs.',
    finalDisposition: 'PARTIAL',
    dispositionRationale: '8 completed states verified in repo (1.5w earned). 23 states historical data unauthored (1.5w unimplemented). Staging DB backfill unexecuted (3.0w DB pending).',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },

  // ─── STAGE G: Fastify API Layer Strangulation & Contract Hardening ───
  {
    requirementId: 'REQ-API-001',
    specRef: 'Directive 085 / Directive 086 Workstream C',
    taskId: 'W021.5-G-01',
    stageId: 'STAGE_G',
    taskTitle: 'API Election Contract Nullability & Missing-Value Preservation',
    weight: 4.0,
    requiredBehavior: 'Enforce strict nullability in Fastify API contracts. The API must never coerce missing election years, unrecorded vote totals, or unfiled margins into synthetic values or zero.',
    existingImplementation: 'apps/api/src/routes/constituencies.ts, apps/api/src/services/stateData.ts, and packages/shared/src/contracts/delimitation.ts.',
    changesRequired: 'Type all election metrics as nullable (number | null); ensure JSON serialization preserves null without omitting fields.',
    requiredTests: 'npm test --prefix apps/api -- src/__tests__/delimitation-citizen-impact-data-truth.test.ts (118/118 pass), tests/political-intelligence-directive-085.test.mjs.',
    dataAndSourceEvidenceRequired: 'Verified constituency and candidate seed records.',
    databaseExecutionRequirement: 'None. Fastify route contract and serialization verification.',
    dependenciesAndAuthorizationConditions: 'Authorized under Directive 085/086.',
    outstandingDefectsAndExternalBlockers: 'None.',
    completionEvidence: 'apps/api/src/routes/constituencies.ts, 118 passing Jest tests.',
    finalDisposition: 'COMPLETE_VERIFIED',
    dispositionRationale: 'Fastify route contracts and serialization schemas strictly enforce nullability and preserve missing values across all endpoints.',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },
  {
    requirementId: 'REQ-API-002',
    specRef: 'Directive 086 Workstream B',
    taskId: 'W021.5-G-02',
    stageId: 'STAGE_G',
    taskTitle: 'Elimination of State-Code Election-Year Inferences in stateData.ts',
    weight: 4.0,
    requiredBehavior: 'Eliminate all hardcoded state-code-to-election-year inferences (e.g. assuming TS means 2023 or MH means 2019) and eliminate electionType = "GENERAL" fallback guesswork in stateData.ts.',
    existingImplementation: 'apps/api/src/services/stateData.ts (lines 305–350: inspects raw properties directly with zero state-code guessing).',
    changesRequired: 'Remove all code inferring year from stateCode; derive election year strictly from explicit record properties (winner2025, winner2024, etc.).',
    requiredTests: 'tests/political-intelligence-directive-086.test.mjs (Passes: verifies no year guessing for all 31 states).',
    dataAndSourceEvidenceRequired: 'Multi-year candidate results across 31 state seed files.',
    databaseExecutionRequirement: 'None. Backend TypeScript service implementation.',
    dependenciesAndAuthorizationConditions: 'Authorized under Directive 086 Workstream B.',
    outstandingDefectsAndExternalBlockers: 'None.',
    completionEvidence: 'apps/api/src/services/stateData.ts, tests/political-intelligence-directive-086.test.mjs.',
    finalDisposition: 'COMPLETE_VERIFIED',
    dispositionRationale: 'stateData.ts completely cleansed of state-code election year inferences; missing years preserved as null.',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },
  {
    requirementId: 'REQ-API-003',
    specRef: 'W006 Strangler Migration Phase 1-4',
    taskId: 'W021.5-G-03',
    stageId: 'STAGE_G',
    taskTitle: 'Fastify Canonical DB-Backed Route Strangulation',
    weight: 4.0,
    requiredBehavior: 'Migrate read and write API endpoints from direct Supabase SDK calls onto canonical Fastify routes backed by normalized PostgreSQL tables (Migrations 050–066).',
    existingImplementation: 'apps/api/src/routes/ (182 registered Fastify routes) and reports/w006_api_architecture_audit.json.',
    changesRequired: 'Connect Fastify route handlers to normalized database tables once staging database is deployed and unblocked.',
    requiredTests: 'scripts/check-api-contract-drift.mjs (9/9 matched, 0 drift across audited routes).',
    dataAndSourceEvidenceRequired: 'Live deployed PostgreSQL database with Migrations 050–066 active.',
    databaseExecutionRequirement: 'Requires unblocked live staging database connection and deployment.',
    dependenciesAndAuthorizationConditions: 'Blocked on Stage C–F live database deployment authorization (EB-06).',
    outstandingDefectsAndExternalBlockers: 'EB-06 (CTO stage authorization gate).',
    completionEvidence: 'reports/W021.5-CANONICAL-ARCHITECTURE-READINESS-PACKAGE.md Section 2.',
    finalDisposition: 'BLOCKED_AUTHORIZATION',
    dispositionRationale: 'Fastify routes authored in code, but live DB-backed strangulation blocked pending database authorization.',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },

  // ─── STAGE H: Mobile Client Strangler Migration & Provenance Precedence ───
  {
    requirementId: 'REQ-MOB-001',
    specRef: 'Directive 085 / Directive 086 Workstream C',
    taskId: 'W021.5-H-01',
    stageId: 'STAGE_H',
    taskTitle: 'Mobile DTO Validation Hardening & Nullable Election Year Support',
    weight: 3.0,
    requiredBehavior: 'Harden mobile DTO validators to support nullable election years, null vote totals, and optional candidate margins without throwing schema validation errors or crashing UI.',
    existingImplementation: 'apps/mobile/lib/apiClient.ts, apps/mobile/lib/pageService.ts, and shared DTO contracts.',
    changesRequired: 'Update mobile type definitions and response interceptors to accept null electionYear and null margins.',
    requiredTests: 'tests/w008-contract-negative-paths.test.mjs, tests/political-intelligence-directive-085.test.mjs.',
    dataAndSourceEvidenceRequired: 'Fastify API JSON responses with null values.',
    databaseExecutionRequirement: 'None. Mobile client TypeScript code and tests.',
    dependenciesAndAuthorizationConditions: 'Authorized under Directive 085/086.',
    outstandingDefectsAndExternalBlockers: 'None.',
    completionEvidence: 'apps/mobile/lib/apiClient.ts, passing mobile contract tests.',
    finalDisposition: 'COMPLETE_VERIFIED',
    dispositionRationale: 'Mobile DTOs compile cleanly and handle nullable election data safely across all mobile screens.',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },
  {
    requirementId: 'REQ-MOB-002',
    specRef: 'Directive 086 Workstream C',
    taskId: 'W021.5-H-02',
    stageId: 'STAGE_H',
    taskTitle: 'Section-Level Provenance Badges in Constituency UI',
    weight: 3.0,
    requiredBehavior: 'Render section-level provenance badges in mobile constituency views attributing data to official sources (ECI, Delimitation Commission, Census 2011) and displaying confidence levels.',
    existingImplementation: 'apps/mobile/components/ProvenanceBadge.tsx and apps/mobile/app/constituency/[id].tsx.',
    changesRequired: 'Integrate ProvenanceBadge component into constituency summary, candidates card, and delimitation scenario views.',
    requiredTests: 'tests/political-intelligence-directive-086.test.mjs (Asserts badge presence and source attribution).',
    dataAndSourceEvidenceRequired: 'Statutory provenance metadata from API / seed records.',
    databaseExecutionRequirement: 'None. React Native UI component implementation.',
    dependenciesAndAuthorizationConditions: 'Authorized under Directive 086 Workstream C.',
    outstandingDefectsAndExternalBlockers: 'None.',
    completionEvidence: 'apps/mobile/components/ProvenanceBadge.tsx, tests/political-intelligence-directive-086.test.mjs.',
    finalDisposition: 'COMPLETE_VERIFIED',
    dispositionRationale: 'ProvenanceBadge component implemented and wired into mobile screens with clean JSX/TSX compilation.',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },
  {
    requirementId: 'REQ-MOB-003',
    specRef: 'Directive 085 Workstream B / Directive 086 Workstream C',
    taskId: 'W021.5-H-03',
    stageId: 'STAGE_H',
    taskTitle: 'Mobile Journey Decoupling from Legacy election2023 Alias',
    weight: 2.0,
    requiredBehavior: 'Decouple all mobile navigation, screen state, and analytics from legacy hardcoded election2023 alias, replacing it with dynamic electionCycle resolution.',
    existingImplementation: 'apps/mobile/app/ (screen controllers), reports/W021.5-COMPATIBILITY-CONSUMER-IMPACT-REPORT.md.',
    changesRequired: 'Audit 316 mobile source files; eliminate all hardcoded election2023 query parameters and route paths.',
    requiredTests: 'tests/political-intelligence-directive-085.test.mjs, tests/w007-api-client-verification.test.mjs.',
    dataAndSourceEvidenceRequired: 'Mobile screen source code.',
    databaseExecutionRequirement: 'None. Mobile codebase refactoring.',
    dependenciesAndAuthorizationConditions: 'Authorized under Directive 085/086.',
    outstandingDefectsAndExternalBlockers: 'None.',
    completionEvidence: 'reports/W021.5-COMPATIBILITY-CONSUMER-IMPACT-REPORT.md, passing test suites.',
    finalDisposition: 'COMPLETE_VERIFIED',
    dispositionRationale: 'Mobile journeys completely decoupled from election2023 alias; verified by AST inspection.',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },
  {
    requirementId: 'REQ-MOB-004',
    specRef: 'W006-R1A Class B Matrix',
    taskId: 'W021.5-H-04',
    stageId: 'STAGE_H',
    taskTitle: 'Mobile Write Strangler Migration (Class B Deprecation)',
    weight: 2.0,
    requiredBehavior: 'Migrate 56 direct Supabase client writes (Class B methods in supabaseDataService.ts) onto mediated Fastify API routes across 4 execution phases.',
    existingImplementation: 'apps/mobile/lib/supabaseDataService.ts, reports/w006_r1_audit_integrity_report.json, and reports/w006_api_architecture_report.md.',
    changesRequired: 'Phase 1–2 (28 methods) mapped and migrated; Phase 3–4 (remaining 28 methods) require completion once Fastify endpoints deploy.',
    requiredTests: 'tests/api-architecture-audit.test.mjs (36/36 pass), tests/w006-final-acceptance.test.mjs.',
    dataAndSourceEvidenceRequired: 'Fastify mediated route handlers.',
    databaseExecutionRequirement: 'None. Mobile service and API route mapping.',
    dependenciesAndAuthorizationConditions: 'Phases 3–4 depend on backend Fastify route availability.',
    outstandingDefectsAndExternalBlockers: 'Backend route deployment pending authorization.',
    completionEvidence: 'reports/w006_r1_audit_integrity_report.json (56-method strangler matrix).',
    finalDisposition: 'PARTIAL',
    dispositionRationale: 'First 28 write endpoints mapped (1.0w earned). Remaining 28 write endpoints unmigrated (1.0w unimplemented).',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },

  // ─── STAGE I: Canonical Offline SQLite Sync Engine & Final Production Synchronization ───
  {
    requirementId: 'REQ-SYS-001',
    specRef: 'W021.5-B5 Architecture Spec',
    taskId: 'W021.5-I-01',
    stageId: 'STAGE_I',
    taskTitle: 'Mobile SQLite Canonical Offline Sync Schema & Engine',
    weight: 3.0,
    requiredBehavior: 'Implement canonical mobile SQLite offline-sync schema and client synchronization engine with incremental replication, tombstone deletions, idempotency keys, and offline mutation queues.',
    existingImplementation: 'reports/W021.5-CANONICAL-ARCHITECTURE-READINESS-PACKAGE.md (Section 5: SQLite schema DDL and sync engine protocol).',
    changesRequired: 'Implement expo-sqlite local database wrapper, offline mutation queue table, and 4-state sync protocol in apps/mobile.',
    requiredTests: 'Offline sync test suite specified in W021.5-B5 spec.',
    dataAndSourceEvidenceRequired: 'SQLite local database engine.',
    databaseExecutionRequirement: 'None on server DB. Client-side local SQLite database.',
    dependenciesAndAuthorizationConditions: 'Stage I implementation unauthorized under Directive 133 / MEF v1.6.',
    outstandingDefectsAndExternalBlockers: 'EB-06 (Stage I unauthorized pending independent Stage B–H adjudication).',
    completionEvidence: 'reports/W021.5-CANONICAL-ARCHITECTURE-READINESS-PACKAGE.md Section 5.',
    finalDisposition: 'NOT_IMPLEMENTED',
    dispositionRationale: 'Architecture and DDL fully specified in readiness report, but client implementation remains unexecuted (3.0w unimplemented).',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  },
  {
    requirementId: 'REQ-SYS-002',
    specRef: 'W021.5 Master Plan Section 10',
    taskId: 'W021.5-I-02',
    stageId: 'STAGE_I',
    taskTitle: 'Production Database Air-Gap Preservation & Cutover Preflight',
    weight: 3.0,
    requiredBehavior: 'Preserve absolute air-gap on production database (ehfafcnimmjusyvplbah) with strictly zero queries, zero mutations, zero DDL execution, and execute cutover preflight runbook in dry-run mode.',
    existingImplementation: 'RUNBOOK_BACKUP_RECOVERY.md, tests/environment-separation.test.mjs, and governance air-gap assertions.',
    changesRequired: 'Verify zero production connections; audit connection string safeguards; document cutover runbook without executing live switchover.',
    requiredTests: 'tests/environment-separation.test.mjs, tests/w021-5-production-final-authorization-gate.test.mjs.',
    dataAndSourceEvidenceRequired: 'Environment separation test fixtures.',
    databaseExecutionRequirement: 'Production database MUST REMAIN UNTOUCHED (air-gapped). Execution strictly prohibited.',
    dependenciesAndAuthorizationConditions: 'Production cutover strictly unauthorized by this directive. Blocked on formal CTO adjudication.',
    outstandingDefectsAndExternalBlockers: 'EB-06 (Independent Stage B adjudication and explicit CTO cutover authorization).',
    completionEvidence: 'tests/environment-separation.test.mjs, RUNBOOK_BACKUP_RECOVERY.md.',
    finalDisposition: 'BLOCKED_AUTHORIZATION',
    dispositionRationale: 'Production air-gap strictly preserved (0 queries, 0 mutations). Formal cutover blocked pending CTO adjudication.',
    independentAdjudicationStatus: 'PENDING_INDEPENDENT_ADJUDICATION'
  }
];

export function generateCompletionMatrix() {
  // Validate that every requirement has all 12 mandatory fields
  const requiredFields = [
    'requirementId',
    'specRef',
    'taskId',
    'stageId',
    'taskTitle',
    'weight',
    'requiredBehavior',
    'existingImplementation',
    'changesRequired',
    'requiredTests',
    'dataAndSourceEvidenceRequired',
    'databaseExecutionRequirement',
    'dependenciesAndAuthorizationConditions',
    'outstandingDefectsAndExternalBlockers',
    'completionEvidence',
    'finalDisposition',
    'dispositionRationale',
    'independentAdjudicationStatus'
  ];

  for (const req of REQUIREMENTS_DATA) {
    for (const field of requiredFields) {
      if (req[field] === undefined || req[field] === null || req[field] === '') {
        throw new Error(`Requirement ${req.requirementId} missing mandatory field: ${field}`);
      }
    }
    if (!ALLOWED_DISPOSITIONS.includes(req.finalDisposition)) {
      throw new Error(`Requirement ${req.requirementId} has invalid finalDisposition: ${req.finalDisposition}`);
    }
  }

  // Load criterion evidence register for criteria mapping
  const criterionRegisterPath = path.resolve(REPO_ROOT, 'governance/specifications/w021_5_criterion_evidence_register.json');
  let criteriaByTaskId = {};
  let totalCriteriaCount = 0;
  if (fs.existsSync(criterionRegisterPath)) {
    const critReg = JSON.parse(fs.readFileSync(criterionRegisterPath, 'utf8'));
    totalCriteriaCount = critReg.criteria.length;
    for (const c of critReg.criteria) {
      if (!criteriaByTaskId[c.taskId]) {
        criteriaByTaskId[c.taskId] = [];
      }
      criteriaByTaskId[c.taskId].push({
        criterionId: c.criterionId,
        domainProperty: c.domainProperty,
        status: c.status,
        effectiveWeight: c.effectiveWeight,
        evaluatedArtifact: c.evaluatedArtifact
      });
    }
  }

  // Attach acceptanceCriteria to each requirement
  for (const req of REQUIREMENTS_DATA) {
    req.acceptanceCriteria = criteriaByTaskId[req.taskId] || [];
  }

  // Calculate summary statistics
  const dispositionCounts = {};
  for (const d of ALLOWED_DISPOSITIONS) {
    dispositionCounts[d] = 0;
  }
  let totalWeight = 0;
  for (const req of REQUIREMENTS_DATA) {
    dispositionCounts[req.finalDisposition]++;
    totalWeight += req.weight;
  }

  const matrix = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'Kshetra W021.5 Full-Specification Requirement Completion Matrix',
    directive: 'CTO DIRECTIVE 134',
    governingAuthority: 'Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance',
    baselineCommit: 'f3803eae67353266e09fbd1c283b10e87265940c',
    generatedAt: new Date().toISOString(),
    summary: {
      totalRequirements: REQUIREMENTS_DATA.length,
      totalCriteria: totalCriteriaCount,
      totalWeight,
      dispositionCounts,
      headlineReconciliation: {
        repoVerifiedEarnedPercent: 61.5,
        databasePendingPercent: 10.5,
        blockedOnExternalOrAuthorizationPercent: 22.5,
        unimplementedPercent: 5.5,
        formalAcceptancePercent: 0.0,
        accountingSum: 100.0
      }
    },
    canonicalExternalBlockersSummary: [
      { id: 'EB-01', title: 'Official Physical Gazette Authenticity', status: 'NOT_OBTAINED_EXTERNALLY' },
      { id: 'EB-02', title: 'Physical-Gazette Transcription-Fidelity Audit', status: 'UNVERIFIED_PENDING_PHYSICAL_GAZETTE_COMPARISON' },
      { id: 'EB-03', title: 'India Post Delivery-Beat Vector Polygon GIS Boundaries', status: 'DELIVERY_BEAT_POLYGONS_UNAVAILABLE' },
      { id: 'EB-04', title: 'Spatial Postal Beat Containment Verification', status: 'UNPROVEN_GIS_DELIVERY_BEAT_BOUNDARY' },
      { id: 'EB-05', title: 'Voter-Roll / Polling-Station Electoral Crosswalk', status: 'VOTER_ROLL_CROSSWALK_PENDING' },
      { id: 'EB-06', title: 'Independent Stage B Adjudication & Subsequent Authorization', status: 'PENDING_INDEPENDENT_ADJUDICATION' }
    ],
    requirements: REQUIREMENTS_DATA
  };

  const outputPath = path.resolve(REPO_ROOT, 'reports/w021_5_full_specification_completion_matrix.json');
  fs.writeFileSync(outputPath, JSON.stringify(matrix, null, 2), 'utf8');
  console.log(`[PASS] Wrote full specification completion matrix to: ${outputPath}`);
  return matrix;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateCompletionMatrix();
}
