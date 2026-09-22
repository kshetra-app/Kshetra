# W015 — GEOGRAPHY RELATIONSHIP ENGINE
## PREFLIGHT REVISION 5 — FINAL MICRO-CORRECTION & DESIGN RECONCILIATION REPORT

- **Job**: W015 — Geography Relationship Engine
- **Sole Scope Authority**: `PANIN - Kshetra — AI Agent Master Execution Document and Sequential Job Book.md` (Job 015, line 915)
- **Phase**: PREFLIGHT INSPECTION (REVISION 5 — STRICT MASTER RECONCILIATION)
- **Status**: `W015_PREFLIGHT_REVISION_5_AWAITING_CTO_REVIEW`
- **Owner**: `DATA + BE` (Strictly per Master Document; zero mobile scope)
- **Authorized Baseline Commit**: [`bb7c6ec`](https://github.com/kshetra-app/Kshetra/commit/bb7c6ec6abebe478a2b5d2c1839b68521dfa855a) (W014 CTO Accepted)
- **Target Staging Database**: `panIN-staging` (`fkpigozcqnmcvofuksar.supabase.co`)
- **Production Database Status**: STRICTLY PROHIBITED / UNTOUCHED (0 requests, 0 mutations)
- **Implementation Authorization**: NOT GRANTED
- **Database Modification**: PROHIBITED
- **Application Modification**: PROHIBITED
- **Staging Mutation**: PROHIBITED
- **Production Mutation**: PROHIBITED

---

## 1. Absolute Master Scope & Core Mandate

Job 015 in the authoritative Master Execution Document defines the complete and exclusive scope of W015:

```text
# JOB 015
# GEOGRAPHY RELATIONSHIP ENGINE

## Owner
DATA + BE

## Tasks
Implement relationships:
- parent;
- child;
- contains;
- part-of;
- predecessor;
- successor;
- old-to-new mapping.

## Evidence
Known geography relationships reconcile correctly.
```

W015 is solely concerned with establishing, maintaining, and reconciling these **seven relationship semantics** and producing the empirical proof that known relationships reconcile correctly. It does not introduce new product capabilities, mobile screens, or spatial mapping engines.

### Master Scope Principles:
1. **Exclusive Semantic Authority**: Only the seven relationship types (`parent`, `child`, `contains`, `part-of`, `predecessor`, `successor`, `old-to-new mapping`) constitute Category A requirements.
2. **Geography Pairs Are Not Independent Scope Items**: Neither Mandal-AC, PC-District, nor any other geography pair is an independent W015 scope item. Specific administrative/electoral relationship pairs are in scope ONLY when they are required to implement and reconcile one of the seven master relationship semantics.
3. **Traceability Rule**: Every proposed element must answer: *"What exact master relationship cannot be correctly implemented or reconciled without this element?"* If no exact answer exists, the item is strictly classified as **Category D / Deferred**.

---

## 2. Explicit List of Items Removed from W015 Scope

In accordance with CTO directives, the following items from earlier revisions are **completely removed from W015 scope**:

1. **Standalone "Relational Adjacency"**: Removed. Adjacency is not one of the seven master relationship types.
2. **Quantitative `overlap_percentage`**: Reclassified to Category D / Deferred. The master requires `contains` and `part-of`. Discrete containment (`full` vs `partial`) is sufficient where necessary to distinguish membership without introducing unverified quantitative weighting.
3. **Standalone `PC ↔ District` Cross-Tree Catalogue**: Reclassified to Category D / Deferred. PCs are statutorily defined in terms of ACs; Districts in terms of Mandals. PC-to-District is not a direct statutory relationship required to prove the seven master types.
4. **Product Hierarchy Traversal Capabilities (`AC → Mandal → GP → Booth`)**: Reclassified to Category D / Deferred. Traversal is an internal verification technique, not a mandatory W015 customer-facing product capability.
5. **Mandatory "Telangana Pilot" Scope Mandate**: Removed as a scope mandate. A bounded sample is a verification technique derived from currently verified source-of-truth availability, not a master requirement.
6. **Mandatory New Backend API Routes / Service Filenames (`geographyRelationshipService.ts`)**: Removed as blueprint requirements. Any backend code is labeled strictly as a candidate implementation mechanism — conditional, subject to repository inspection.
7. **Redundant `delimitation_constituency_mapping` Table**: Removed. The existing W014 `geography_entity_lineage` table satisfies predecessor, successor, and old-to-new transition mappings without creating duplicate lineage schemas.
8. **Invented Performance Thresholds (P95 <30ms, <50ms, etc.)**: Removed. Performance will be measured empirically as observed evidence under the general project performance rule; arbitrary numeric gates are eliminated.
9. **Mobile Client Modifications / Screen Rewrites**: Removed. W015 owner is strictly `DATA + BE`. Zero mobile modifications.
10. **Spatial Inference / PostGIS Geometry**: Strictly prohibited. Quarantined to W016.
11. **Automated Data-Quality Anomaly Engine**: Quarantined to W017.

---

## 3. Scope Classification Taxonomy (A / B / C / D)

Every proposed capability, schema change, and requirement is classified into exactly one of four categories:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SCOPE CLASSIFICATION TAXONOMY                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Category A: DIRECTLY MANDATED BY W015                                       │
│   The seven core relationship types and empirical reconciliation proof.     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Category B: NECESSARY IMPLEMENTATION MECHANISM FOR W015                     │
│   Relational schema mechanisms, temporal intervals (where proven necessary),│
│   inherited security constraints, and W012/W014 lineage.                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Category C: EXISTING DEFECT THAT MUST BE FIXED TO COMPLETE W015             │
│   Pre-existing schema defects directly blocking master relationship proof.  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Category D: OUT OF W015 / DEFERRED                                          │
│   Non-mandated features, mobile changes, spatial inference, W016/W017 scope.│
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Classification:

| Item / Proposed Element | Scope Class | Justification & Master Lineage |
| :--- | :---: | :--- |
| **`parent` relationship modeling** | **A** | Directly mandated by Master Job 015. |
| **`child` relationship modeling** | **A** | Directly mandated by Master Job 015 (inverse of parent). |
| **`contains` relationship modeling** | **A** | Directly mandated by Master Job 015. |
| **`part-of` relationship modeling** | **A** | Directly mandated by Master Job 015 (inverse of contains). |
| **`predecessor` relationship modeling** | **A** | Directly mandated by Master Job 015. |
| **`successor` relationship modeling** | **A** | Directly mandated by Master Job 015 (inverse of predecessor). |
| **`old-to-new mapping`** | **A** | Directly mandated by Master Job 015. |
| **Empirical reconciliation proof** | **A** | Directly mandated by Master Job 015 evidence criterion. |
| **Dual-table anchor reference model** | **B** | Necessary implementation mechanism inherited from W013/W014 (relationships link stable anchor UUIDs/codes, not ephemeral version rows). |
| **Temporal validity intervals `[valid_from, valid_to)` & GiST exclusion** | **B** | Necessary implementation mechanism ONLY where demonstrated that a relationship changes over time with coexisting historical records (e.g. `constituency_district_timeline`). Not automatically required for static relationships. |
| **Canonical use of `geography_entity_lineage`** | **B** | Necessary implementation mechanism: W014 table already natively satisfies `predecessor`, `successor`, and `old-to-new mapping` transitions without duplicating lineage schemas. |
| **W012 dataset version registration (`UNVERIFIED`)** | **B** | Inherited governance constraint from W012. |
| **Scenario isolation (`WHERE NOT is_scenario`)** | **B** | Inherited governance constraint from W014. |
| **Row Level Security (RLS) security policies** | **B** | Inherited project-wide mandatory constraint. Any new W015 RLS change is Category B only where required to safely implement newly authorized W015 relationship storage (zero security redesign). |
| **Candidate backend relationship traversal queries** | **B (Conditional)** | Candidate implementation mechanism — conditional. Category B ONLY if repository inspection demonstrates application/backend code is required to implement or verify a master relationship. A direct SQL/database query is sufficient where no backend behavior is required. Do not create backend APIs merely to satisfy acceptance. |
| **Fix `mandals.district` column lacking FK to `districts.id`** | **C** | Existing schema defect from Migration 022 breaking relational integrity of District-Mandal parentage. |
| **Align `mandal_constituency_map` to modern UUID anchors** | **C** | Existing schema defect from Migration 022 (references legacy text ID; lacks internal_id UUID linkage). |
| **Standalone "Relational Adjacency"** | **D** | **DEFERRED / OUT OF W015**: Not one of the seven master relationship types. |
| **Quantitative `overlap_percentage` calculation** | **D** | **DEFERRED / OUT OF W015**: Not required to establish contains/part-of membership. |
| **Standalone `PC ↔ District` catalogue** | **D** | **DEFERRED / OUT OF W015**: Not required to prove the seven master types. |
| **Dedicated hierarchy traversal API / endpoint** | **D** | **DEFERRED / OUT OF W015**: Not a master-mandated product capability. |
| **Invented performance thresholds (P95 <30ms, etc.)** | **D** | **DEFERRED / OUT OF W015**: General performance applies; specific thresholds are not master gates. |
| **Mobile client changes / screen rewrites** | **D** | **DEFERRED / OUT OF W015**: W015 owner is strictly `DATA + BE`. Mobile migration belongs to future consumer-facing jobs. |
| **Spatial inference / PostGIS geometry (`ST_Contains`, `ST_Intersects`)** | **D** | **STRICTLY PROHIBITED IN W015**: Quarantined strictly to **W016 (Real Geographic Mapping)**. |
| **GPS reverse geocoding / PIN code lookup / address matching** | **D** | **STRICTLY PROHIBITED IN W015**: Quarantined strictly to **W016**. |
| **Broad automated data-quality anomaly detection engine** | **D** | **OUT OF W015**: Belongs strictly to **W017 (Geography Quality Engine)**. |

---

## 4. Current Source-of-Truth State for the Seven Master Relationship Types

Direct verification against `panIN-staging` (`fkpigozcqnmcvofuksar.supabase.co`) at baseline commit `bb7c6ec`:

### 4.1 `parent` & `child`
- **Existing Source of Truth**:
  - `districts.state_code REFERENCES states(code)`: 33 districts verified. State is parent; District is child.
  - `parliamentary_constituencies.state_code REFERENCES states(code)`: 17 PCs verified. State is parent; PC is child.
  - `constituencies.state_code REFERENCES states(code)`: 119 ACs verified. State is parent; AC is child.
- **Data Availability Gap**:
  - `mandals` (Migration 022) has 0 rows on staging. Column `district TEXT` lacks foreign key to `districts.id`.
  - `gram_panchayats` (Migration 022) has 0 rows on staging.

### 4.2 `contains` & `part-of`
- **Existing Source of Truth**:
  - `constituencies.parliamentary_constituency_id REFERENCES parliamentary_constituencies(id)`: 119 ACs verified. PC contains AC; AC is part-of PC.
  - `constituencies.district_id REFERENCES districts(id)`: 119 ACs verified. District contains AC (current administrative assignment); AC is part-of District.
- **Data Availability Gap**:
  - `mandal_constituency_map` (Migration 022) has 0 rows on staging. Uses legacy text `constituency_id`.
  - `polling_booths` (Migration 022) has 0 rows on staging. ECI invariant (every booth is part-of exactly one AC) cannot be verified until sample booths are seeded.

### 4.3 `predecessor` & `successor`
- **Existing Source of Truth**:
  - `geography_entity_lineage` (Migration 041, W014): 2 rows verified in staging (Mulugu split from Jayashankar Bhupalpally; Narayanpet split from Mahabubnagar).
  - Predecessor entity and successor entity are explicitly linked via `predecessor_internal_id` and `successor_internal_id` with statutory order citations.

### 4.4 `old-to-new mapping`
- **Existing Source of Truth**:
  - `constituency_district_timeline` (Migration 041, W014): 121 rows verified in staging. Models AC 109 (*Mulug*) re-parenting across three statutory eras (Warangal 2008–2016 -> Jayashankar Bhupalpally 2016–2019 -> Mulugu 2019–present).
  - Delimitation Regimes: `delimitation_regimes` catalog contains 4 verified regimes (`eci_delimitation_1976`, `eci_delimitation_2008`, `eci_delimitation_post2026`, `scenario_delimitation_draft_prop_1`).
  - Delimitation constituency transitions: `geography_entity_lineage` accommodates cross-regime transitions (`split`, `merge`, `rename`, `abolition`, `creation`).

---

## 5. Temporal Validity and PostgreSQL GiST Classification

### 5.1 Temporal & GiST Policy
Temporal validity (`valid_from`, `valid_to`) and GiST exclusion constraints are **NOT** automatically applied to every relationship. They are classified as **Category B ONLY** where all four of the following criteria are demonstrated:
1. **Exact Relationship**: The specific relationship pair subject to temporal modeling.
2. **Source Evidence of Change Over Time**: Documented statutory or administrative proof that the relationship alters across historical eras.
3. **Coexisting Historical Records**: The architectural requirement that multiple historical iterations of the relationship must coexist in the active database.
4. **Insufficiency of Current-State Storage**: Proof that a static foreign key or current-state pointer cannot correctly represent the relationship history.

### 5.2 Specific Demonstration:
- **AC-to-District Assignment**: Satisfied via `constituency_district_timeline` (Migration 041).
  - *Relationship*: `constituency` to `district` re-parenting.
  - *Source Evidence*: Telangana Gazette notifications (2016 reorganisation, 2019 formation of Mulugu/Narayanpet).
  - *Coexisting Records*: AC 109 exists in 3 historical intervals simultaneously.
  - *Insufficiency of Current-State*: A single `constituencies.district_id` column only reflects 2019–present, erasing 2008–2019 historical truth.
- **Constituency Transitions across Delimitations**: Satisfied via `geography_entity_lineage` (Migration 041).
  - *Relationship*: Historical constituency to modern constituency (`old-to-new mapping`, `predecessor`, `successor`).
  - *Source Evidence*: Delimitation Orders of 1976 and 2008.
  - *Coexisting Records*: Predecessors and successors coexist across statutory dates.
  - *Insufficiency of Current-State*: Overwritten rows destroy delimitation continuity.
- **Static Relationships (e.g. State-District Parentage within Current Era)**:
  - Temporal intervals and GiST exclusion are **not required** on static foreign keys where stable anchor identity and foreign key integrity already guarantee correctness.

---

## 6. Old-to-New Mapping & Lineage Governance

### 6.1 Canonical Use of `geography_entity_lineage`
In Migration 041, `public.geography_entity_lineage` was defined as:
```sql
CREATE TABLE IF NOT EXISTS public.geography_entity_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('state', 'district', 'parliamentary_constituency', 'constituency')),
  predecessor_internal_id UUID NOT NULL,
  successor_internal_id UUID NOT NULL,
  transition_type VARCHAR(50) NOT NULL CHECK (transition_type IN ('rename', 'split', 'merge', 'abolition', 'creation')),
  effective_date DATE NOT NULL,
  statutory_order TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  primary_dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_geography_lineage UNIQUE (entity_type, predecessor_internal_id, successor_internal_id, transition_type, effective_date)
);
```

### 6.2 Mandatory Source Evidence for Old-to-New Lineage Records
Before any record is inserted into `geography_entity_lineage`, the authoritative source for the specific old-to-new relationship must be fully documented. **Zero synthetic lineage is permitted.**

Every lineage entry requires all seven mandatory evidence fields:
1. **Old Entity** (`predecessor_internal_id`): Stable identity of predecessor.
2. **New Entity** (`successor_internal_id`): Stable identity of successor.
3. **Transition Type** (`transition_type`): Explicit transition (`split`, `merge`, `rename`, `abolition`, `creation`).
4. **Effective Date** (`effective_date`): Exact legal/statutory effective date.
5. **Statutory/Electoral Source** (`statutory_order`): Official gazette notification or ECI Delimitation Order citation.
6. **Dataset Version** (`primary_dataset_version_id`): Registered W012 dataset version ID.
7. **Provenance**: Complete lineage in `provenance_records` and `record_provenance_linkages`.

---

## 7. Overlap Percentage & Quantitative Membership Analysis

### Inspection & Classification:
In `022_administrative_hierarchy.sql`, `mandal_constituency_map` defines `overlap_percentage NUMERIC(5, 2)`.
However, evaluated strictly against Master Job 015:
1. **Master Mandate**: Mandates `contains` and `part-of`. It does **not** mandate quantitative area/population split weighting engines.
2. **Relational Truth**: A Mandal is either entirely inside an AC (`overlap_type = 'full'`) or intersects an AC (`overlap_type = 'partial'`).
3. **Authoritative Source Availability**: Quantitative demographic and geographic split percentages across all mandals require GIS boundary intersection calculations (quarantined to W016) or detailed Census tract allocations. Authoritative relational tables from LGD or ECI do not provide uniform percentage weights.
4. **Conclusion**:
   - The discrete relationship `contains` / `part-of` (`overlap_type: 'full' | 'partial'`) is an implementation mechanism ONLY where repository/source inspection proves it is necessary.
   - Calculating and validating quantitative `overlap_percentage` is **reclassified as Category D (Deferred)**. It is not an essential prerequisite to prove relational containment.

---

## 8. PC ↔ District Analysis

### Inspection & Classification:
1. **Master Mandate**: Evaluated strictly against the seven master types:
   - PCs contain ACs (`contains / part-of`).
   - Districts contain ACs (`contains / part-of`).
2. **Statutory Definition**: Parliamentary Constituencies are formally delimited by the Delimitation Commission in terms of Assembly Constituencies. They are not delimited in terms of districts.
3. **Absence of Direct Relational Source**: There is no official statutory gazette defining a standalone `PC ↔ District` table. Any PC-to-District intersection is derived indirectly from the ACs that comprise the PC.
4. **Conclusion**:
   - Standalone `PC ↔ District` relationship catalogue is **reclassified as Category D (Deferred)**.
   - Neither Mandal-AC, PC-District, nor any other geography pair is an independent W015 scope item.

---

## 9. Backend API & Implementation Mechanism Classification

1. **No Blueprint API Mandate**: Master Job 015 does not prescribe specific Fastify routes, endpoint URLs, or service filenames.
2. **Classification**:
   - Backend relationship traversal queries are classified as **Candidate implementation mechanism — conditional**.
   - It becomes **Category B ONLY if repository inspection demonstrates application/backend code is required to implement or verify a master relationship**.
   - A direct SQL/database query is sufficient where no backend behavior is required.
   - Do not create backend APIs merely to satisfy acceptance.
3. **Consumer Endpoints Deferred**:
   - Dedicated product hierarchy traversal endpoints (`AC → Mandal → GP → Booth`) are **classified as Category D (Deferred)**.

---

## 10. Acceptance Evidence Chain & Data Seeding Policy

### 10.1 Four-Link Acceptance Evidence Chain
Acceptance verification cannot rely merely on "row inserted", "FK resolves", or "sample exists". Verification must prove the complete four-link chain:

$$\text{AUTHORITATIVE SOURCE RELATIONSHIP} \longrightarrow \text{CANONICAL STORED RELATIONSHIP} \longrightarrow \text{RELATIONAL INTEGRITY} \longrightarrow \text{RECONCILIATION RESULT}$$

1. **Authoritative Source Relationship**: Provenance from statutory gazette, ECI Delimitation Order, or LGD portal.
2. **Canonical Stored Relationship**: Clean insertion into canonical table with stable anchor identities and registered W012 metadata.
3. **Relational Integrity**: Foreign key validation, absence of orphans, exclusion of conflicting active intervals, and scenario isolation.
4. **Reconciliation Result**: Empirical query execution confirming that known real-world relationships match stored relational output 100%.

### 10.2 Mandatory Documentation for Seed Records
Every seeded verification record must document:
- **Authoritative Source**: Statutory/administrative body (e.g. Delimitation Commission of India, Ministry of Panchayati Raj, CEO Telangana).
- **Source Identifier / Document**: Gazette notification number, order date, or official bulletin.
- **Retrieval Date & Effective Date**: Exact chronological validity markers.
- **Dataset Version**: Registered W012 dataset version ID.
- **Provenance Linkage**: Registered in `provenance_records` and `record_provenance_linkages`.
- **Specific Relationship Demonstrated**: Exact mapping to one of the seven master relationship types.

### 10.3 Data Availability Gaps vs System Defects
Empty tables (`mandals`, `gram_panchayats`, `polling_booths`, `mandal_constituency_map`) represent a **data-availability gap**, not an automatic system defect. Seed records will be introduced only to the minimum extent required to prove the seven master relationship semantics.

---

## 11. Absolute W015 vs W016 Boundary (Prohibition of Spatial Inference)

The boundary between Job 015 and Job 016 is absolute:

| Capability / Responsibility | JOB 015 (Geography Relationship Engine) | JOB 016 (Real Geographic Mapping) |
| :--- | :---: | :---: |
| **Parent/Child and authorized relationship traversal** | **IN SCOPE (Category A)** | Out of Scope |
| **Administrative / Electoral Relationship Pairs** | Specific administrative/electoral relationship pairs are **IN SCOPE ONLY** when they are required to implement and reconcile one of the seven W015 master relationship semantics. The pair itself is not a separate master requirement. | Out of Scope |
| **Discrete Containment Attributes (`full` / `partial`)** | Any relationship attributes used to distinguish authoritative contains/part-of records are implementation mechanisms **ONLY where repository/source inspection proves they are necessary**. | Out of Scope |
| **Temporal Relationship Intervals & Lineage** | **IN SCOPE (Category B - Conditional)** | Out of Scope |
| **Spatial Inference for Relationships** | **STRICTLY PROHIBITED** | Out of Scope |
| **PostGIS Geometry Operations (`ST_Contains`, `ST_Intersects`)** | **STRICTLY PROHIBITED** | **IN SCOPE** |
| **GPS Coordinate → Constituency Reverse Geocoding** | **STRICTLY PROHIBITED** | **IN SCOPE** |
| **PIN Code / Postal Locality Lookups** | **STRICTLY PROHIBITED** | **IN SCOPE** |
| **Ward / Village Spatial Polygon Matching** | **STRICTLY PROHIBITED** | **IN SCOPE** |
| **Map Vector Tiles / Mapbox / Deck.gl Boundary Rendering** | **STRICTLY PROHIBITED** | **IN SCOPE** |

> [!CAUTION]
> **Prohibition of Spatial Inference**:
> All W015 relationships must be established exclusively from **authoritative statutory and electoral relational datasets**. Inferring relationships via geometric polygon intersection (`ST_Intersects` or `ST_Contains`) is strictly prohibited in W015.

---

## 12. Master-to-Preflight Traceability Matrix

Every proposed element directly answers: *"What exact master relationship cannot be correctly implemented or reconciled without this element?"*

| Master W015 Requirement | Existing Source of Truth | Exact Gap | Minimum Required Change | Verification | Scope Class |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **`parent` / `child`** | `State -> District`, `State -> PC`, `State -> AC` verified on staging. `mandals` exists in 022 DDL with 0 rows. | `mandals.district` lacks FK to `districts.id`. Sub-district parentage unseeded. | Add FK `mandals.district_id REFERENCES districts(id)`. Seed minimum sample mandals to prove District-Mandal parent/child. | `TEST-A`: 100% of sample mandals resolve valid `district_id` FK. | **A / C** |
| **`contains` / `part-of`** | `PC -> AC` verified (119 ACs to 17 PCs). `District -> AC` verified (119 ACs). `mandal_constituency_map` exists in 022 DDL with 0 rows. | `mandal_constituency_map` unseeded, lacks stable UUID FK. `polling_booths` unseeded. | Update `mandal_constituency_map` with stable UUID FK. Seed minimum sample overlaps and booths. | `TEST-B`: Sample mandal-AC overlaps resolve valid FKs. 100% of sample booths belong to exactly one AC. | **A / B / C** |
| **`predecessor` / `successor`** | `geography_entity_lineage` created in W014 with 2 split records (Mulugu, Narayanpet). | Multi-step graph traversal query not verified across lineage entities. | Traversal query resolving predecessor/successor transitions from `geography_entity_lineage`. | `TEST-C`: Traversal query resolves complete transition lineage for split entities. | **A / B** |
| **`old-to-new mapping`** | `constituency_district_timeline` tracks AC-to-District re-parenting (121 rows; AC 109 verified). `geography_entity_lineage` supports entity transitions. | Cross-regime AC boundary shifts across Delimitation Orders need explicit sample entries in `geography_entity_lineage`. | Populate sample cross-regime constituency transition records in `geography_entity_lineage` with full statutory evidence. | `TEST-D`: Cross-regime AC transition mapping verified in `geography_entity_lineage`. | **A / B** |
| **Evidence: *"Known geography relationships reconcile correctly."*** | W013 (13/13 PASS) and W014 (9/9 PASS) batteries verify baseline tables. | No comprehensive test battery verifies the complete set of seven relationship types across the hierarchy. | Author `tests/verify_w015_relationship_engine.mjs` verifying all relationship invariants. | `TEST-E`: Complete runtime execution output showing 100% PASS across all relationship gates. | **A** |

---

## 13. Acceptance & Evidence Test Battery Plan (`tests/verify_w015_relationship_engine.mjs`)

The acceptance suite strictly separates the five core master relationship tests from supporting implementation checks:

### 13.1 Core Master Acceptance Tests:
- **`TEST-A` (`parent` / `child`)**:
  - *Invariant*: Administrative & Electoral Direct Parentage.
  - *Exact DB Assertion*: 100% of sample mandals resolve valid `district_id` FKs; 100% of ACs resolve valid `state_code` FKs; 100% of PCs resolve valid `state_code` FKs.
- **`TEST-B` (`contains` / `part-of`)**:
  - *Invariant*: Cross-Tree Containment & Polling Booth Invariant.
  - *Exact DB Assertion*: 100% of ACs resolve to valid PCs; sample mandal-AC overlaps resolve valid FKs; 100% of sample polling booths belong to exactly one AC.
- **`TEST-C` (`predecessor` / `successor`)**:
  - *Invariant*: Entity Transition Lineage.
  - *Exact DB Assertion*: `geography_entity_lineage` correctly resolves predecessor and successor entities for split transitions (Mulugu & Narayanpet) with statutory orders.
- **`TEST-D` (`old-to-new mapping`)**:
  - *Invariant*: Reorganisation Timeline & Delimitation Shifts.
  - *Exact DB Assertion*: `constituency_district_timeline` resolves AC 109 across 3 eras; `geography_entity_lineage` resolves cross-regime delimitation transitions.
- **`TEST-E` (Empirical Reconciliation Gate)**:
  - *Invariant*: Known Geography Relationships Reconcile Correctly.
  - *Exact DB Assertion*: Complete reconciliation of all known relationship pairs without orphan references, broken foreign keys, or unverified linkages.

### 13.2 Supporting Implementation Verification (Non-Semantic):
- **`TEST-SUPP-1` (Temporal GiST Non-Overlap Invariant)**:
  - GiST exclusion constraint rejects overlapping validity intervals (`23P01`) on tables where temporal validity is demonstrated; abutting adjacent intervals admitted.
- **`TEST-SUPP-2` (Scenario Isolation & Inherited RLS Security)**:
  - Scenario relationships quarantined from canonical reads (`WHERE NOT is_scenario`); anonymous client mutations denied by RLS (`WITH CHECK (false)`).
- **`TEST-SUPP-3` (W012 Lineage & Governance Integrity)**:
  - 100% of relationship records reference valid W012 dataset versions; 0 records elevated to `OFFICIAL` (100% `UNVERIFIED`).
- **`TEST-SUPP-4` (Regression Suite & General Performance Observation)**:
  - W013 suite (13/13 PASS); W014 suite (9/9 PASS); API build clean (`tsc --noEmit` exit 0); empirical latencies measured.

---

## 14. Performance Measurement Policy

- **No Invented Latency Thresholds**: Pre-declared latency gates (e.g. P95 <30ms, <50ms) are eliminated.
- **Empirical Observation**: Relationship query latencies will be measured and recorded on `panIN-staging` as observed runtime evidence.
- **Index Optimization**: B-tree indexes on foreign keys (`district_id`, `mandal_id`, `constituency_internal_id`) will be implemented to prevent sequential scans.

---

## 15. Migration & Rollback Architecture

1. **Transactional Atomicity**: Single migration package executed within a single transaction block: `BEGIN; ... COMMIT;`.
2. **Purely Additive DDL**:
   - Add foreign key `district_id UUID REFERENCES public.districts(id)` on `mandals`.
   - Update `mandal_constituency_map` to reference `constituency_internal_id UUID`.
   - Zero destructive changes to W013/W014 tables.
3. **Deterministic Rollback**: Rollback script restoring schema to exact W014 baseline.

---

## 16. Final Status & Authorization Coordinates

```text
W015 PREFLIGHT STATUS:
AWAITING CTO REVIEW

IMPLEMENTATION AUTHORIZATION:
NOT GRANTED

DATABASE MODIFICATION:
PROHIBITED

APPLICATION MODIFICATION:
PROHIBITED

STAGING MUTATION:
PROHIBITED

PRODUCTION MUTATION:
PROHIBITED

NEXT ACTION:
CTO REVIEW OF W015 REVISION 5
```
