# W014 — GEOGRAPHY VERSIONING / TEMPORAL VALIDITY
## PRE-IMPLEMENTATION PREFLIGHT CORRECTION & DESIGN RECONCILIATION REPORT

- **Job**: W014 — Geography Versioning / Temporal Validity
- **Phase**: PREFLIGHT CORRECTION
- **Status**: `W014_PREFLIGHT_CORRECTION_COMPLETE — AWAITING CTO REVIEW`
- **Implementation Authorization**: NOT GRANTED
- **Database Modification**: PROHIBITED
- **Application Code Modification**: PROHIBITED
- **Staging Mutation**: PROHIBITED
- **Production Access / Mutation**: STRICTLY PROHIBITED
- **Canonical Branch**: `master`
- **Current HEAD Commit**: `af1d754b2d56a2373059ef3901b0f5ea55866164`
- **W013 Accepted Baseline**: `d0f3fcd5188eb70d0f5b9d157888a7b247bd572f` (13/13 PASS)
- **Target Staging Database**: `panIN-staging` (`fkpigozcqnmcvofuksar`)

---

## 1. Physical Versioning Model Reconciliation

### 1.1 Architectural Defect in Initial Proposal
In the initial W014 preflight proposal, temporal validity columns (`valid_from`, `valid_to`, `is_current`) were proposed as additive columns directly on the existing canonical entity tables (`districts`, `parliamentary_constituencies`, `constituencies`).

**The CTO Correctly Identified the Physical Contradiction:**  
- `districts` enforces `id UUID PRIMARY KEY`, `code VARCHAR(50) UNIQUE NOT NULL`, and `uq_districts_state_name UNIQUE (state_code, name)`.
- `parliamentary_constituencies` enforces `id UUID PRIMARY KEY`, `code VARCHAR(50) UNIQUE NOT NULL`, and `uq_pc_state_number UNIQUE (state_code, pc_number)`.
- `constituencies` enforces `id TEXT PRIMARY KEY`, `internal_id UUID UNIQUE NOT NULL`, and `canonical_code VARCHAR(50) UNIQUE`.

If a historical or future version of an existing entity is inserted directly into these tables, the write **fails immediately** due to primary key and unique constraint violations (e.g. attempting to insert a 2014 version of *Warangal* district when *Warangal* already exists, or attempting to insert a 1976 version of AC 1 *Sirpur* with code `TS-AC-001` or `internal_id`).

### 1.2 Redesigned Physical Versioning Model: The Dual-Table Anchor Architecture
To allow an entity to have **one stable identity** and **multiple temporal versions** without breaking existing foreign keys or violating primary key constraints, the physical model is redesigned as a **Dual-Table Anchor Architecture**:

1. **Stable Entity Anchor Table (The Timeless Dimension)**:
   - Stores the immutable identity of the entity (`internal_id` UUID, legacy `id` PK where required).
   - All domain application foreign keys (`posts.constituency_id`, `civic_issues.constituency_id`, `user_profiles.constituency_id`) reference this stable anchor table.
   - Contains a pointer `current_version_id` to the currently active temporal version row.
2. **Temporal Entity Version Table (The Temporal Continuum)**:
   - Stores historical, current, and future statutory/electoral manifestations of the entity.
   - Contains `id UUID PRIMARY KEY` (version UUID), a foreign key to the stable entity anchor, the validity interval `[valid_from, valid_to)`, the delimitation/statutory regime reference, and versioned attributes (display names, headquarters, boundaries, reservations).
   - Enforces zero-overlap via a GiST exclusion constraint on `(entity_anchor_id, daterange(valid_from, valid_to, '[)'))`.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                 STABLE ENTITY ANCHOR (public.constituencies)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id: TEXT PRIMARY KEY (e.g. 'TS-AC-1')  <-- Preserves all domain FKs       │
│ • internal_id: UUID UNIQUE NOT NULL      <-- Canonical immutable UUID       │
│ • state_code: TEXT NOT NULL                                                 │
│ • current_version_id: UUID REFERENCES constituency_versions(id)             │
│ • current_district_id: UUID REFERENCES districts(id)                        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 1:N
┌──────────────────────────────────────▼──────────────────────────────────────┐
│             TEMPORAL VERSION TABLE (public.constituency_versions)           │
├─────────────────────────────────────────────────────────────────────────────┤
│ • id: UUID PRIMARY KEY                                                      │
│ • constituency_internal_id: UUID NOT NULL REFERENCES constituencies(...)    │
│ • delimitation_regime_id: VARCHAR(50) NOT NULL REFERENCES regimes(...)      │
│ • canonical_code: VARCHAR(50) NOT NULL (e.g. 'TS-AC-001')                   │
│ • name: TEXT NOT NULL                                                       │
│ • reservation: VARCHAR(20) NOT NULL ('general', 'sc', 'st')                 │
│ • valid_from: DATE NOT NULL                                                 │
│ • valid_to: DATE (NULL for open-ended active)                               │
│ • is_current: BOOLEAN NOT NULL DEFAULT true                                 │
│ • primary_dataset_version_id: TEXT NOT NULL REFERENCES dataset_versions(id) │
│                                                                             │
│ CONSTRAINT: EXCLUDE USING gist (                                            │
│   constituency_internal_id WITH =,                                          │
│   daterange(valid_from, valid_to, '[)') WITH &&                             │
│ )                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Entity-by-Entity Physical Specifications

#### A. States
- **Stable Anchor**: `public.states`
  - Stable Identity: `states.code TEXT PRIMARY KEY` (`'TS'`) & `states.internal_id UUID UNIQUE`.
  - Application FKs: `users`, `posts`, `districts`, `constituencies` point to `states.code`.
- **Temporal Version Storage**: `public.state_versions` (Candidate Design)
  - Version Identity: `id UUID PRIMARY KEY`.
  - Foreign Key: `state_internal_id UUID NOT NULL REFERENCES public.states(internal_id)`.
  - Attributes: `name`, `capital`, `statutory_act`, `valid_from DATE NOT NULL`, `valid_to DATE`, `is_current BOOLEAN NOT NULL`.
  - Unique Constraint: `EXCLUDE USING gist (state_internal_id WITH =, daterange(valid_from, valid_to, '[)') WITH &&)`.
  - Current-Version Resolution: `states.current_version_id REFERENCES state_versions(id)` OR query `WHERE state_internal_id = X AND is_current = true`.

#### B. Districts
- **Stable Anchor**: `public.districts`
  - Stable Identity: `districts.id UUID PRIMARY KEY` & `districts.code VARCHAR(50) UNIQUE`.
  - Application FKs: `constituencies.district_id`, `mandals.district_id` point to `districts.id`.
- **Temporal Version Storage**: `public.district_versions` (Candidate Design)
  - Version Identity: `id UUID PRIMARY KEY`.
  - Foreign Key: `district_id UUID NOT NULL REFERENCES public.districts(id)`.
  - Attributes: `name`, `name_te`, `headquarters`, `lgd_code`, `valid_from DATE NOT NULL`, `valid_to DATE`, `is_current BOOLEAN NOT NULL`.
  - Unique Constraint: `EXCLUDE USING gist (district_id WITH =, daterange(valid_from, valid_to, '[)') WITH &&)`.
  - Current-Version Resolution: `districts.current_version_id REFERENCES district_versions(id)`.

#### C. Parliamentary Constituencies (PCs)
- **Stable Anchor**: `public.parliamentary_constituencies`
  - Stable Identity: `parliamentary_constituencies.id UUID PRIMARY KEY` & `parliamentary_constituencies.code VARCHAR(50) UNIQUE`.
  - Application FKs: `constituencies.parliamentary_constituency_id` points to `parliamentary_constituencies.id`.
- **Temporal Version Storage**: `public.parliamentary_constituency_versions` (Candidate Design)
  - Version Identity: `id UUID PRIMARY KEY`.
  - Foreign Key: `pc_id UUID NOT NULL REFERENCES public.parliamentary_constituencies(id)`.
  - Attributes: `pc_number`, `name`, `reservation`, `delimitation_regime_id`, `valid_from DATE NOT NULL`, `valid_to DATE`.
  - Unique Constraint: `EXCLUDE USING gist (pc_id WITH =, daterange(valid_from, valid_to, '[)') WITH &&)`.
  - Current-Version Resolution: `parliamentary_constituencies.current_version_id REFERENCES parliamentary_constituency_versions(id)`.

#### D. Assembly Constituencies (ACs)
- **Stable Anchor**: `public.constituencies`
  - Stable Identity: `constituencies.id TEXT PRIMARY KEY` (e.g. `'TS-AC-1'`) & `constituencies.internal_id UUID UNIQUE`.
  - Application FKs: 12+ domain tables (`civic_issues`, `posts`, `user_profiles`, `candidates`, `elections`) point to `constituencies.id`.
- **Temporal Version Storage**: `public.constituency_versions` (Candidate Design)
  - Version Identity: `id UUID PRIMARY KEY`.
  - Foreign Key: `constituency_internal_id UUID NOT NULL REFERENCES public.constituencies(internal_id)`.
  - Attributes: `canonical_code VARCHAR(50)`, `ac_no INTEGER`, `name TEXT`, `reservation VARCHAR(20)`, `delimitation_regime_id VARCHAR(50)`, `valid_from DATE NOT NULL`, `valid_to DATE`, `is_current BOOLEAN NOT NULL`.
  - Unique Constraint: `EXCLUDE USING gist (constituency_internal_id WITH =, daterange(valid_from, valid_to, '[)') WITH &&)`.
  - Current-Version Resolution: `constituencies.current_version_id REFERENCES constituency_versions(id)` AND/OR `constituencies` table continues to store the denormalized active attributes for instant zero-overhead PostgREST reads.

---

## 2. Reconcile Identity Semantics

### 2.1 Resolving the Contradiction: Stable Entity vs. Split Child
The previous draft contained an apparent contradiction: claiming `internal_id` is constant across splits while stating child entities receive a new `internal_id`.

**Formal Identity Disambiguation:**
- **Stable Identity (`internal_id`)**: Belongs to a continuous legal entity lineage. An entity that continues to exist retains its `internal_id`.
- When a district **splits** (e.g. *Jayashankar Bhupalpally* split to form *Mulugu*):
  - *Jayashankar Bhupalpally* is the **continuing parent entity**. Its `internal_id` does NOT change. Its existing version is closed (`valid_to = '2019-02-17'`), and a new version is created representing its post-split territory.
  - *Mulugu* is a **brand-new legal entity**. It receives a **NEW, globally unique `internal_id`** and its initial version row.
  - The lineage relationship between *Jayashankar Bhupalpally* and *Mulugu* is NOT modeled by sharing an `internal_id`; it is modeled explicitly in a **Lineage Identity Table** (`geography_entity_lineage`).

### 2.2 Formal Invariants by Transition Type

| Transition Type | Stable Entity ID (`internal_id`) Action | Version ID (`version_id`) Action | Lineage Record Action | Invariant Rule |
| :--- | :--- | :--- | :--- | :--- |
| **RENAME** | **UNCHANGED** | Old version closed (`valid_to = D`); New version opened (`valid_from = D`). | Recorded: `transition_type = 'renamed'`. | The entity remains the same legal entity. Historical queries prior to $D$ return the previous name; queries on or after $D$ return the new name. |
| **SPLIT** | **Parent retains ID**;<br>**Child receives NEW ID**. | Parent receives new version with reduced boundaries;<br>Child receives first version. | Recorded: `predecessor = Parent.internal_id`, `successor = Child.internal_id`, `transition_type = 'split'`. | Territorial provenance is explicit. Parent entity history remains unbroken; child entity establishes its own distinct temporal lineage. |
| **MERGE** | Predecessors close active versions;<br>Successor receives either **New ID** or absorbing entity ID. | Predecessors closed (`valid_to = D`);<br>Successor receives first version (`valid_from = D`). | Recorded: Multiple lineage rows linking all predecessor IDs to successor ID with `transition_type = 'merged'`. | Predecessor stable identities are never deleted; their active versions are simply marked `is_current = false`. |
| **ABOLITION** | **UNCHANGED & PRESERVED** | Active version closed (`valid_to = D`, `is_current = false`). Zero new versions created. | Recorded: `transition_type = 'abolished'`. | The stable entity remains in the catalog forever so domain FKs (`elections`, `historical_votes`) remain referentially valid. |
| **CREATION** | **NEW ID GENERATED** | First version opened (`valid_from = D`, `valid_to = NULL`). | Recorded if carved from existing territory. | Completely new entity enters the catalog. |

### 2.3 Identity Triad
W014 formally establishes three distinct identity layers:
1. **Stable Identity (`internal_id` UUID)**: The timeless anchor across legal manifestations.
2. **Version Identity (`version_id` UUID)**: The immutable snapshot of attributes and boundary for a specific interval $[t_1, t_2)$.
3. **Lineage Identity (`lineage_id` UUID)**: The directed edge $(E_{\text{pred}}, E_{\text{succ}}, \text{type}, \text{effective\_date})$ connecting entities across evolutionary transitions.

---

## 3. Reconcile Canonical Code Semantics

Canonical codes cannot be assumed to be immutable across all historical delimitation regimes. External authorities renumber and re-code entities across delimitation cycles.

W014 formally distinguishes four identifier categories:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. INTERNAL STABLE IDENTITY (internal_id UUID)                              │
│    • Synthetic, immutable, globally unique system primary key.              │
│    • Never exposed as a routing slug; never changes across any regime.      │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. CANONICAL APPLICATION CODE (canonical_code VARCHAR(50))                  │
│    • Human-readable system slug (e.g. 'TS-AC-001', 'TS-DIST-HYDERABAD').    │
│    • Stable within a delimitation/statutory regime.                         │
│    • If an entity is renumbered in a future delimitation order (e.g. AC 1   │
│      becomes AC 4), the canonical code belongs to the Version layer, with   │
│      an alias table for backwards-compatible routing.                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. EXTERNAL AUTHORITY IDENTIFIER (e.g. LGD Code, Census Code, ECI Code)     │
│    • Sourced directly from government gazettes or directories.              │
│    • Versioned according to external directory updates (e.g. LGD version). │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. DISPLAY NAME & LOCALIZED STRINGS (e.g. name, name_te)                    │
│    • Human-readable representation in official gazetted languages.          │
│    • Versioned per statutory renaming G.O.                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Formal Temporal Invariants

### 4.1 Half-Open Interval Semantics
- Every version defines its validity through a **half-open interval**:
  $$\text{Validity} = [valid\_from, valid\_to)$$
- `valid_from` is **inclusive** (`[`): The entity version is legally in effect at 00:00:00 on `valid_from`.
- `valid_to` is **exclusive** (`)`): The entity version ceases to be in effect at 00:00:00 on `valid_to`.

### 4.2 Calendar Date Semantics
- Temporal boundaries are represented using PostgreSQL `DATE` types (Gregorian calendar date, e.g. `'2016-10-11'`), reflecting statutory gazette notification dates.

### 4.3 NULL `valid_to` Semantics
- `valid_to IS NULL` represents an **open-ended interval** extending indefinitely into the future:
  $$[valid\_from, \infty)$$
- Indicates the version is currently active and has not been statutorily superseded.

### 4.4 Adjacent Interval (Zero-Gap / Zero-Overlap) Rules
- When version $V_1$ is superseded by version $V_2$ on date $D$:
  $$V_1.valid\_to = D \quad \text{and} \quad V_2.valid\_from = D$$
- There is exactly zero temporal gap and zero temporal overlap between successive statutory versions.

### 4.5 Exclusion Constraint Specification
To prevent corrupting the temporal graph with overlapping validity intervals, version tables enforce a PostgreSQL GiST exclusion constraint using `btree_gist`:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Example on district_versions
ALTER TABLE public.district_versions
  ADD CONSTRAINT uq_district_versions_no_overlap
  EXCLUDE USING gist (
    district_id WITH =,
    daterange(valid_from, valid_to, '[)') WITH &&
  );
```
- **Partition Key**: `district_id WITH =` ensures versions are partitioned by their stable entity anchor. Overlap checks only apply to versions of the *same* district.
- **Range Operator**: `daterange(valid_from, valid_to, '[)') WITH &&` asserts that no two intervals for the same entity may intersect (`&&`).

### 4.6 Current-Version Invariant
For any stable entity anchor, exactly zero or one version can be active at any time:
```sql
CREATE UNIQUE INDEX uq_district_single_current
  ON public.district_versions (district_id)
  WHERE is_current = true;
```

---

## 5. Authoritative Historical Source Reconciliation

The W014 pilot design must not rely on unverified assumptions. All historical transitions for the Telangana pilot are cited from authoritative statutory instruments:

| Historical Event | Statutory Date | Primary Authoritative Source Citation | Statutory Facts Established |
| :--- | :---: | :--- | :--- |
| **Telangana State Formation** | `2014-06-02` | **Parliament of India**, *The Andhra Pradesh Reorganisation Act, 2014 (Act No. 6 of 2014)*, Section 3 & First Schedule. | Formed Telangana with **10 specified districts**: *Adilabad, Nizamabad, Karimnagar, Medak, Ranga Reddy, Hyderabad, Mahbubnagar, Nalgonda, Warangal, Khammam*. Electoral seats allocated: **17 PCs**, **119 ACs**. |
| **First District Reorganization** | `2016-10-11` | **Government of Telangana**, Revenue (DA-CMRF) Dept, *G.O.Ms.Nos 219 to 249*, dated 11.10.2016; published in *Telangana Gazette Part-I Extraordinary No. 364*, dated 11.10.2016. | Reorganized 10 districts into **31 revenue districts**. Electoral constituencies remained completely unchanged under the frozen 2008 Delimitation Order. |
| **Mulugu District Creation** | `2019-02-17` | **Government of Telangana**, Revenue (DA-CMRF) Dept, *G.O.Ms.No. 18*, dated 16.02.2019, effective 17.02.2019; published in *Telangana Gazette Extraordinary*. | Carved *Mulugu* district out of *Jayashankar Bhupalpally* district, comprising 9 mandals. Predecessor: *Jayashankar Bhupalpally*. |
| **Narayanpet District Creation** | `2019-02-17` | **Government of Telangana**, Revenue (DA-CMRF) Dept, *G.O.Ms.No. 19*, dated 16.02.2019, effective 17.02.2019; published in *Telangana Gazette Extraordinary*. | Carved *Narayanpet* district out of *Mahbubnagar* district, comprising 11 mandals. Predecessor: *Mahbubnagar*. |
| **Warangal Urban/Rural Renaming** | `2021-08-12` | **Government of Telangana**, Revenue (DA) Dept, *G.O.Ms.No. 74*, dated 12.08.2021. | Renamed *Warangal Urban* to *Hanamkonda* and *Warangal Rural* to *Warangal*. Realigned mandals between the two districts. |
| **AC 109 (Mulug) Re-anchoring Chronology** | `2008–Present` | **Delimitation Commission of India**, *Delimitation Order 2008*; reconciled with G.O.Ms. 233 (2016) and G.O.Ms. 18 (2019). | AC 109 boundary remained 100% stable since 2008. District parentage shifted:<br>• `[2008-02-19, 2016-10-11)`: *Warangal*<br>• `[2016-10-11, 2019-02-17)`: *Jayashankar Bhupalpally*<br>• `[2019-02-17, NULL)`: *Mulugu*. |

---

## 6. Delimitation Regime Model

Electoral entities must be bound to distinct, legally classified Delimitation Regimes:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DELIMITATION REGIME MODEL                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. HISTORICAL_LEGAL_REGIME                                                  │
│    • ECI Delimitation Orders of 1951, 1961, 1976.                           │
│    • Legal Status: SUPERSEDED (Legally in force in the past).                │
│    • W012 Governance: OFFICIAL (historical statutory truth).                │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. CURRENT_LEGAL_REGIME                                                     │
│    • Delimitation of Parliamentary and Assembly Constituencies Order, 2008.  │
│    • Legal Status: ACTIVE (Currently governing all general elections).       │
│    • W012 Governance: OFFICIAL / UNVERIFIED (per ingestion audit).          │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. FUTURE_ANTICIPATED_REGIME                                                │
│    • Post-2026 Delimitation mandated under Constitution Articles 82 & 170.  │
│    • Legal Status: PROSPECTIVE_UNENACTED (Statutorily mandated, not drawn). │
│    • Invariant: Must NEVER be marked OFFICIAL. Cannot govern active feeds.  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. SCENARIO_PROPOSED_REGIME                                                 │
│    • Simulation models, academic projections, draft commission proposals.    │
│    • Legal Status: NON_STATUTORY_SIMULATION.                                 │
│    • Invariant: Strictly UNVERIFIED. Completely isolated from public reads.  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Scenario Isolation Architecture

To ensure hypothetical scenarios can NEVER pollute canonical data:

1. **Foreign Key Directionality**:
   - Scenario $\to$ Canonical: **PERMITTED**. A proposed constituency may point to a canonical constituency (`predecessor_internal_id REFERENCES constituencies(internal_id)`) to show which real seat it alters.
   - Canonical $\to$ Scenario: **STRICTLY PROHIBITED**. Canonical tables (`constituencies`, `districts`, `parliamentary_constituencies`) must NEVER contain foreign keys referencing scenario tables.
2. **Status Invariant**:
   - Scenario data is permanently constrained to `data_status IN ('UNVERIFIED', 'SCENARIO')`. It is architecturally barred from `data_status = 'OFFICIAL'`.
3. **Identity Space Partitioning**:
   - Scenario entities must NEVER reuse canonical `internal_id` or `canonical_code`. Scenario IDs use dedicated UUIDs or prefixes (e.g. `SCENARIO-AC-001`).
4. **Promotion Prohibition**:
   - No automated trigger, function, or API route may promote a scenario record to an official record. Promotion requires external publication of a formal Gazette notification, ingestion via a distinct statutory `dataset_version`, and formal governance sign-off.

---

## 8. Explicit W014 / W015 / W016 Architectural Boundaries

```
┌───────────────────────────────┐
│     JOB W014: TEMPORAL        │
├───────────────────────────────┤
│ • Temporal validity intervals │
│ • Predecessor/successor graph │
│ • Regime modeling             │
│ • AC-to-District timeline     │
│ • Identity & code semantics   │
└──────────────┬────────────────┘
               │ (Provides temporal graph)
               ▼
┌───────────────────────────────┐
│     JOB W015: SPATIAL         │
├───────────────────────────────┤
│ • Point-in-polygon containment│
│ • Spatial intersection graph  │
│ • H3 hexagonal indexing       │
│ • Multi-cycle traversal       │
└──────────────┬────────────────┘
               │ (Provides topological graph)
               ▼
┌───────────────────────────────┐
│     JOB W016: GEOMETRY        │
├───────────────────────────────┤
│ • PostGIS polygon geometry    │
│ • TopoJSON construction       │
│ • Sliver ring repair          │
│ • Simplification pipelines    │
└───────────────────────────────┘
```
**Strict Boundary Rule**: W014 models **temporal and lineage relationships only**. W014 does NOT calculate spatial containment (`ST_Contains`), polygon intersections, boundary overlaps, topological meshes, or H3 indexing. Those are quarantined to W015 and W016.

---

## 9. Performance Precheck (Corrected)

All absolute "zero impact" claims are rescinded. Performance expectations are re-classified:

| Query Hot-Path | Consumer | Architectural Impact | Expected Impact | Runtime Performance |
| :--- | :--- | :--- | :--- | :--- |
| **Active Constituency Read** (`id = 'TS-AC-1'`) | Mobile, API | Retains single-row PK index lookup on `constituencies.id`. | **LOW** | **UNKNOWN UNTIL IMPLEMENTED AND BENCHMARKED** |
| **Current State Geography** (`state_code = 'TS'`) | Map, Selector | Index scan on `state_code` filtered by `is_current = true`. | **LOW** | **UNKNOWN UNTIL IMPLEMENTED AND BENCHMARKED** |
| **Point-in-Time Query** (`date = '2016-10-12'`) | Analytics | Range scan on `daterange(valid_from, valid_to, '[)')`. Requires GiST index. | **MEDIUM** | **UNKNOWN UNTIL IMPLEMENTED AND BENCHMARKED** |
| **Predecessor Traversal** (Trace Split Lineage) | Lineage UI | Recursive CTE on `geography_entity_lineage`. | **MEDIUM** | **UNKNOWN UNTIL IMPLEMENTED AND BENCHMARKED** |

---

## 10. Requirement vs. Candidate Design Classification

| Component | Architectural Classification | Description |
| :--- | :--- | :--- |
| **Dual-Horizon Identity** | **REQUIREMENT** | The platform must support stable entity identity alongside temporal version manifestations to protect existing foreign keys. |
| **Separate Version Tables** | **CANDIDATE DESIGN** | Storing temporal versions in `_versions` tables vs. single-table partitioning with views. |
| **Half-Open Intervals `[valid_from, valid_to)`** | **INVARIANT** | Universal standard for all temporal geography in PANIN. |
| **GiST Exclusion Constraint** | **CANDIDATE DESIGN** | Using `btree_gist` exclusion constraint vs. trigger-based procedural validation. |
| **Scenario Isolation Boundary** | **INVARIANT** | Scenario entities must never collide with canonical IDs, receive `OFFICIAL` status, or enter canonical queries. |
| **Denormalized Active District Pointer** | **IMPLEMENTATION DECISION** | Retaining `constituencies.district_id` as the current active district pointer while storing full history in `constituency_district_timeline`. |

---

## 11. Data Model Impact Matrix

| Entity | Current Schema | Stable Identity | Version Identity | Version Storage | Temporal Relationship | W012 Lineage | RLS Status | API Impact | Mobile Impact | Migration Risk |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`states`** | `code TEXT PK`, `internal_id UUID UNIQUE` | `internal_id` & `code` | `version_id UUID` | `state_versions` (Candidate) | `[valid_from, valid_to)` | References `dataset_versions(id)` | Public Read | Additive only | Additive only | **LOW** |
| **`districts`** | `id UUID PK`, `code VARCHAR(50) UNIQUE` | `id UUID` & `code` | `version_id UUID` | `district_versions` (Candidate) | `predecessor_district_id`, `[valid_from, valid_to)` | References `dataset_versions(id)` | Public Read | Additive only | Additive only | **MEDIUM** |
| **`parliamentary_constituencies`** | `id UUID PK`, `code VARCHAR(50) UNIQUE` | `id UUID` & `code` | `version_id UUID` | `pc_versions` (Candidate) | Bound to `delimitation_regimes(id)` | References `dataset_versions(id)` | Public Read | Additive only | Additive only | **LOW** |
| **`constituencies`** | `id TEXT PK`, `internal_id UUID UNIQUE` | `internal_id` & `id` | `version_id UUID` | `constituency_versions` (Candidate) | `constituency_district_timeline` | References `dataset_versions(id)` | Public Read | Fully backwards compatible | Fully backwards compatible | **HIGH** (Preserve existing PK) |

---

## 12. Corrected Acceptance Test Matrix (Rigorous Specification)

Every proposed test gate is bound to an exact source of truth, database assertion, expected result, and explicit failure condition:

| Test ID | Test Title & Scope | Exact Source of Truth | Exact Database Assertion | Expected Result | Failure Condition |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TEST-14-A** | **Delimitation Regime Catalog Integrity** | *Constitution of India*, Arts 82/170; *ECI Delimitation Order 2008*. | Query `delimitation_regimes` where `id = 'eci_delimitation_2008'`. | Returns 1 row with `authority = 'Delimitation Commission of India'`, `legal_status = 'CURRENT_LEGAL_REGIME'`, valid `dataset_version_id`. | Row missing, status not CURRENT_LEGAL_REGIME, or unresolvable version FK. |
| **TEST-14-B** | **Dual-Table Version Storage & Foreign Key Integrity** | Proposed W014 Dual-Horizon DDL specification. | Query `district_versions` joined to `districts` on `district_id`. | 100% of version rows resolve to existing stable `districts.id` rows; 0 orphan version records. | Any version row with unresolvable `district_id`. |
| **TEST-14-C** | **Temporal Non-Overlap Invariant Enforcement** | PostgreSQL `btree_gist` Exclusion Constraint specification. | Attempt insertion of two version rows for same `district_id` with overlapping `daterange(valid_from, valid_to, '[)')`. | PostgreSQL raises error `23P01 (exclusion_violation)`. | Insertion succeeds without error (constraint missing or unenforced). |
| **TEST-14-D** | **Point-in-Time District Reconstruction** | AP Reorganisation Act 2014; G.O.Ms. 219-249 (2016); G.O.Ms. 18-19 (2019). | Execute point-in-time queries on `district_versions`: (A) `2014-06-02`, (B) `2016-10-12`, (C) `2019-02-18`. | (A) returns exactly 10 districts;<br>(B) returns exactly 31 districts;<br>(C) returns exactly 33 districts. | Any query returns count diverging from statutory truth for that date. |
| **TEST-14-E** | **Temporal AC-to-District Mapping Resolution** | ECI 2008 Order; G.O.Ms. 233 (2016); G.O.Ms. 18 (2019). | Query `constituency_district_timeline` for AC 109 (*Mulug*) at: (A) `2015-01-01`, (B) `2017-01-01`, (C) `2020-01-01`. | (A) resolves to *Warangal* (`TS-DIST-WARANGAL`);<br>(B) resolves to *Jayashankar* (`TS-DIST-JAYASHANKAR-BHUPALPALLY`);<br>(C) resolves to *Mulugu* (`TS-DIST-MULUGU`). | Any date resolves to incorrect district, or multiple primary districts returned. |
| **TEST-14-F** | **Predecessor/Successor Split Lineage Verification** | G.O.Ms.No. 18 (Mulugu) & G.O.Ms.No. 19 (Narayanpet). | Query `geography_entity_lineage` where `successor_internal_id` = *Mulugu*. | Returns 1 row with `predecessor_internal_id` = *Jayashankar Bhupalpally*, `transition_type = 'split'`, `effective_date = '2019-02-17'`. | Missing lineage row, incorrect predecessor, or incorrect transition type. |
| **TEST-14-G** | **Scenario Isolation & Non-Contamination Proof** | Master Blueprint Section 4 & W012 Governance Rules. | Execute canonical public queries against `districts`, `parliamentary_constituencies`, `constituencies`. | Exactly 0 rows returned with `is_scenario = true` or matching scenario proposal IDs. | Any scenario entity returned by public canonical queries. |
| **TEST-14-H** | **W012 Lineage Chain & Governance Status** | W012 Master Governance Schema (`039_data_governance_foundation.sql`). | Inspect `dataset_versions` and `provenance_records` for all W014 pilot records. | 100% resolve to valid W012 dataset versions; 100% of pilot lineage has `data_status = 'UNVERIFIED'`; exactly 0 elevated to `OFFICIAL`. | Any unresolvable FK or unauthorized elevation to OFFICIAL. |
| **TEST-14-I** | **Existing Domain Read Compatibility Smoke Test** | Fastify & Mobile Contract Compatibility Specification. | Issue unauthenticated HTTP GET requests against `/api/v1/states/TS/constituencies` and Supabase PostgREST `.from('constituencies').select('id, name')`. | All requests return HTTP 200 with exactly 119 records; zero duplicate keys; zero payload schema breakage. | HTTP non-200, count != 119, duplicate IDs, or broken client contracts. |

---

## 13. Governance Reconciliation & Invariants

- **Master Job W013**: REMAINS `ACCEPTED / COMPLETE` (Baseline: commit `d0f3fcd`, 13/13 PASS).
- **Master Job W014**: `PREFLIGHT CORRECTION COMPLETE — AWAITING CTO REVIEW`.
- **Implementation Authorization**: STRICTLY NOT GRANTED.
- **Database Status**:
  - No migrations created (`041` does NOT exist).
  - Staging database remains completely unmutated.
  - Production database remains completely untouched.
- **Evidence Files Committed**:
  - Machine-readable evidence: [`reports/w014_preflight_inspection_evidence.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w014_preflight_inspection_evidence.json)
  - Preflight correction report: [`reports/w014_preflight_inspection_report.md`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/w014_preflight_inspection_report.md)

---

**FINAL STATUS:**  
`W014_PREFLIGHT_CORRECTION_COMPLETE — AWAITING CTO REVIEW`

**STOP. Implementation is NOT authorized.**
