# KSHETRA W021.5 — CTO DIRECTIVE 119
## Stage B Criterion-by-Criterion Independent Evidence Matrix

**Milestone:** W021.5 Stage B (Canonical Jurisdiction & Geography Modeling)  
**Governing Authority:** Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance  
**Stage Boundary:** Strict STOP at Stage B Gate; Stages C–I are strictly unexecuted and unauthorized.  
**Production Boundary:** Strictly air-gapped (`AIR_GAPPED_UNEXECUTED`); zero production access or mutations.  
**Staging Boundary:** Prohibited absent separate explicit authorization; zero database mutations.  
**Formal CTO Acceptance:** **0.0% — PENDING INDEPENDENT ADJUDICATION**  
**Allocated Weight:** 12.0%  
**Repo-Verified Earned Weight:** 10.5% (already incorporated in 61.5% headline baseline; zero double counting)  
**Blocked Weight:** 1.5%  

---

## 1. Five-Class Evidence Taxonomy

In strict compliance with Directive 117, Directive 118, and Directive 119 Section 4, each acceptance criterion distinguishes five independent classes of evidence:

- **Class A — Repository Implementation Verified:** Source files, migration DDL/DML, TypeScript data adapters, and AST definitions checked into the canonical repository.
- **Class B — Static Parsing or Deterministic Asset Validation Passed:** Executed deterministic validators (AST tuple extractors, RFC 7946 GeoJSON linters, Node test suites) running against repository assets. *Crucial Rule: Static tuple parsing does NOT constitute a successful database deployment; valid GeoJSON syntax does NOT constitute statutory boundary verification.*
- **Class C — Actual Database Execution Pending:** Execution against live PostgreSQL/PostGIS database catalogs (table creation, constraint validation, PostgREST exposure). Strictly pending under the production air-gap and staging moratorium.
- **Class D — Authoritative External Evidence Verified or Pending:** Direct citation and bitwise cross-reference against statutory orders (ECI Delimitation Order 2008, J&K Reorganisation Act 2019, ECI Order No. 282/AS/2023, state gazettes).
- **Class E — Independent CTO Acceptance Pending:** Formal CTO adjudication. Under Rule IV-001, implementing agents cannot self-adjudicate; status is strictly 0.0% pending independent review.

---

## 2. Criterion-Level Evidence Matrix

| Task ID | Criterion ID | Description | Weight | Status | Class A (Repository) | Class B (Static/Deterministic) | Class C (Database Execution) | Class D (Statutory Authority) | Class E (CTO Adjudication) |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- | :--- |
| **W021.5-B1-01** | CRIT-B101-01 | 4,123 Assembly Constituencies modeled nationally across 31 States/UTs | 2.0% | REPO_VERIFIED | Migration 059 DDL & DML (`059_national_constituency_schema.sql`) | `stage-b-national-geography-validation.test.mjs` (31/31 seed files passed, 4,123 ACs) | `PENDING_STAGING_EXECUTION` (Zero execution on `fkpigozcqnmcvofuksar` or prod) | Delimitation of Parliamentary and Assembly Constituencies Order, 2008 & J&K Reorganisation Act 2019 | UNACCEPTED (0.0% / Pending CTO) |
| **W021.5-B1-01** | CRIT-B101-02 | Canonical IDs adhere to `{STATE}-AC-{NUMBER}` format with zero duplicates | 2.0% | REPO_VERIFIED | Regex constraint `^[A-Z]{2}-AC-[0-9]+$` in Migration 059 | AST parser confirmed 4,123 distinct canonical IDs; exactly 0 duplicates across 31 states | `PENDING_STAGING_EXECUTION` (PK uniqueness unexecuted in live catalog) | ECI statutory seat numbering scheme | UNACCEPTED (0.0% / Pending CTO) |
| **W021.5-B1-02** | CRIT-B102-01 | AC-to-PC mapping tuples modeled nationally for 543 Lok Sabha seats | 1.5% | REPO_VERIFIED | Migration 061 DDL & DML (`061_national_ac_pc_mappings.sql`) | AST parser extracted 4,123 SQL VALUES tuples; 537 PCs mapped, 0 orphaned ACs | `PENDING_STAGING_EXECUTION` (Foreign key checks unexecuted in live catalog) | Delimitation Order 2008 Schedules I–XXXI | UNACCEPTED (0.0% / Pending CTO) |
| **W021.5-B1-02** | CRIT-B102-02 | Cross-state containment partition invariants strictly enforced | 1.5% | REPO_VERIFIED | Migration 061 CHECK constraints (`state_code = pc_state_code`) | Linter verified 0 cross-state AC-to-PC mappings across all 4,123 tuples | `PENDING_STAGING_EXECUTION` (CHECK constraint unverified in live engine) | Constitution of India First Schedule territorial boundaries | UNACCEPTED (0.0% / Pending CTO) |
| **W021.5-B1-03** | CRIT-B103-01 | Assam post-2023 Delimitation Order 282 modeled with reservation breakdown | 1.5% | REPO_VERIFIED | Migration 062 DDL & DML (`062_assam_2023_delimitation_order.sql`) | Parser verified 126 ACs, 14 PCs: 98 GEN, 9 SC, 19 ST seats | `PENDING_STAGING_EXECUTION` (Table `assam_delimitation_2023` unexecuted) | ECI Order No. 282/AS/2023 dated 11 Aug 2023 | UNACCEPTED (0.0% / Pending CTO) |
| **W021.5-B1-03** | CRIT-B103-02 | Assam 2023 temporal validity and statutory lineage cutoff | 1.5% | REPO_VERIFIED | Migration 062 temporal timestamps (`valid_from = '2023-08-16'`) | Verified 2023-08-16 boundary; pre-2023 vector crosswalk documented | `PENDING_STAGING_EXECUTION` (Temporal triggers unexecuted) | Representation of the People Act 1950 s.8A | `ASSAM_HISTORICAL_LINEAGE_PENDING` |
| **W021.5-B1-04** | CRIT-B104-01 | Telangana state GeoJSON boundary asset with RFC 7946 compliance | 0.5% | REPO_VERIFIED | `data/geo/telangana-assembly.geojson` | Direct RFC 7946 validation: 120 features, 120 closed rings, 589 mandals | `PENDING_STAGING_EXECUTION` (PostGIS spatial table unexecuted) | Telangana State Remote Sensing Applications Centre (TRAC) / SOI | UNACCEPTED (0.0% / Pending CTO) |
| **W021.5-B1-04** | CRIT-B104-02 | AC 119 duplicate polygon defect and missing 30-state boundary register | 1.5% | BLOCKED | `reports/w021_5_national_jurisdiction_geometry_inventory.json` | AC 119 duplicate confirmed (FID 4159 & 4160); fail-closed `hasGeoJSON = false` | N/A (Geometric & Statutory Gazette gap) | Requires AP/TS bifurcation revenue gazette; 30 states lack statutory GIS | `OPEN_AND_BLOCKED` (DEF-W021-01 & DEF-W021-03) |

---

## 3. Strict Boundary & Non-Conflation Declarations

1. **SQL Tuple Parsing vs Database Deployment:**  
   Class B deterministic AST parsing of SQL migration files confirms that SQL DDL and DML syntax is valid and referentially consistent in source text. It does **NOT** constitute a successful database deployment. Under the Master Execution Framework, database execution belongs strictly to Class C and requires authorized migration runs against live PostgreSQL instances.
2. **Syntactic Geometry vs Authoritative Legal Boundaries:**  
   Class B RFC 7946 structural validation confirms that GeoJSON coordinates parse as closed polygon rings. It does **NOT** prove that geometry represents statutory administrative or electoral boundaries. Under Directive 119, geometry capability (`hasGeoJSON`) evaluates to `false` for all 30 states lacking canonical files, and Telangana AC 119 remains blocked pending statutory gazette boundary consolidation.
3. **Weight Allocation and Progress Isolation:**  
   - Total Stage B Allocated Weight: **12.0%**
   - Repository-Verified Earned Weight: **10.5%** (already fully accounted in the canonical 61.5% headline; zero double-counting).
   - Blocked Weight: **1.5%** (Task B1-04 CRIT-B104-02).
   - Operational Database Readiness: **0.0%** (air-gapped and unexecuted).
   - Formal CTO Acceptance: Strictly **0.0% (`UNACCEPTED / PENDING INDEPENDENT ADJUDICATION`)**.
