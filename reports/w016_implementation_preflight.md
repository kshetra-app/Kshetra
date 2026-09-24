# W016 — Spatial Geography / Spatial Relationship Foundation
## Implementation Preflight & Design Authorization Package (Revision A1)

**Document ID:** `REPORT-W016-PREFLIGHT-DESIGN-v1.1`
**Generated:** 2026-09-24
**Authority:** CTO Directive — W016-A1 Preflight Correction
**Current Lifecycle State:**
- `W015` = ACCEPTED / COMPLETE (Commit `3748e46`, Governance Commit `4d99dd3`)
- `W016 PREFLIGHT` = RESUBMITTED_FOR_CTO_REVIEW (Revision A1)
- `W016 IMPLEMENTATION` = **NOT AUTHORIZED**
- `PRODUCTION` = **STRICTLY UNTOUCHED**

---

> [!IMPORTANT]
> **W016 IMPLEMENTATION IS STRICTLY UNAUTHORIZED.**
> This package is an architectural preflight, technical capability design, source-of-truth reconciliation, and authorization-preparation instrument.
> It does **NOT** authorize, execute, or implement database migrations, application changes, spatial API additions, geometry ingestion, or production mutations.

---

## 1. Executive Summary & Core Evidentiary Principle

Master Job **W016 (Spatial Geography & Topology Foundation)** addresses the physical geometric layer of Kshetra's territorial data architecture. Following W013 (Canonical Geography), W014 (Temporal Delimitation Graph), and W015 (Geography Relationship Engine), W016 inspects how polygon, multipolygon, and point geometries are acquired, validated, versioned, indexed, and evaluated in PostgreSQL/PostGIS.

### The Authoritative Evidence Invariant

Following independent CTO review of the initial W016 preflight, a fundamental evidentiary blocker was identified and is here formally established:

> [!CAUTION]
> **UNVERIFIED GEOMETRY CANNOT BECOME AUTHORITATIVE EVIDENCE.**
> Existing repository GeoJSON assets originate from `datta07/INDIAN-SHAPEFILES` (an open-source community repository) and are formally registered under W012 as `datta07_shapefiles` with status `UNVERIFIED`.
> An `UNVERIFIED` geometry source may be used for **development fixtures**, **test fixtures**, and **non-authoritative spatial pipeline rehearsal**, but **MUST NOT** be represented as **authoritative geography**, **official geography**, **source-backed validation**, **legal electoral boundaries**, or **authoritative containment evidence**.

### Separation of Three Distinct Claims

To maintain total integrity between software capability and legal truth, W016 strictly separates three distinct claims:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Claim A: GEOMETRY STORAGE                                                │
│ Question: Can Kshetra technically store, constrain, and index geometry?   │
│ Reality:  YES. Schema columns (MultiPolygon, Point) and GiST indexes     │
│           exist or can be defined.                                       │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ Enables
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Claim B: SPATIAL COMPUTATION                                             │
│ Question: Can PostGIS calculate containment, intersection, or area?      │
│ Reality:  YES. Technical capability exists via ST_Contains, ST_Intersects│
│           and ST_IsValid functions on loaded coordinates.                │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ DOES NOT AUTOMATICALLY PROVE
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Claim C: AUTHORITATIVE SPATIAL RECONCILIATION                            │
│ Question: Does the spatial result establish that the canonical W015      │
│           relational link is legally and cartographically correct?       │
│ Reality:  REQUIRES INDEPENDENTLY EVIDENCED AUTHORITATIVE GEOMETRY.       │
│           Claim A and Claim B do NOT establish Claim C.                  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Authoritative Geometry Evidence Gate

This section establishes the mandatory evidentiary prerequisites before spatial geometry may be used for canonical acceptance:

### 1. Classification of Existing Repository Geometry
- **Telangana Assembly Constituencies (`data/geo/telangana-assembly.geojson`):** `UNVERIFIED FIXTURE DATA`. Sourced from `datta07/INDIAN-SHAPEFILES` (MIT License). Valid for technical software testing and pipeline rehearsal only.
- **Telangana Districts (`data/geo/telangana-districts.geojson`):** `UNVERIFIED FIXTURE DATA`. Same community source. Unloaded in schema.
- **Telangana State Boundary (`data/geo/telangana-state.geojson`):** `UNVERIFIED FIXTURE DATA`. Same community source.
- **Other State AC Boundaries (`scripts/*.geojson`, `apps/mobile/data/*.json`):** `UNVERIFIED FIXTURE DATA`. 12/31 states contain verified structural corruptions (`scripts/audit-all-geojson.mjs`).
- **Seed State Centroids (`states.centroid_lat/lng`):** `DERIVED / ILLUSTRATIVE`. Approximated map focus coordinates for UI centering; no official geodetic survey provenance.

### 2. Geometry Usable Only for Technical Tests (Group A)
Any geometry currently present in the repository may **only** be used to execute technical geometry tests:
- Parsing GeoJSON into PostGIS `GEOMETRY` objects;
- Testing `ST_IsValid` quality gate logic;
- Verifying GiST index creation and spatial bounding-box scans;
- Exercising serialization and API response generation.

### 3. Authoritative Geometry Required for Canonical Reconciliation (Group C)
To prove that an administrative unit (Mandal) is contained within, or partially overlaps, an electoral unit (Assembly Constituency), the database requires:
- **Electoral Boundary Artifact:** Statutory 2008 Delimitation map vector files certified by the **Election Commission of India (ECI)** or State Chief Electoral Officer (**CEO Telangana**).
- **Administrative Boundary Artifact:** Statutory revenue mandal boundary vector files certified by the **Telangana Survey, Settlement & Land Records Dept** / **Telangana Remote Sensing Applications Centre (TRAC)** / **Ministry of Panchayati Raj (MoPR)**.

### 4. What Source Evidence is Missing?
- **Mandal Polygon Boundaries (`UNK-16-01`):** **COMPLETELY MISSING** from the repository. Zero mandal boundary shapefiles or GeoJSON polygons exist in `data/geo/` or elsewhere.
- **Certified ECI Vector Geometries:** **MISSING**. Only community shapefile exports exist.
- **Survey Coordinates for Polling Booths:** **MISSING**. The 4 pilot booths are explicitly classified as `synthetic_test_fixture` (Migration 043).

### 5. Can W016 Meaningfully Satisfy Master Acceptance Without This Evidence?
**NO.** While W016 can execute a technical pipeline rehearsal (Claim A & Claim B) using unverified fixture data, **W016 cannot achieve authoritative spatial reconciliation (Claim C) without certified boundary artifacts.** Attempting to declare W016 "accepted" on the basis of community shapefiles would violate the core anti-fabrication directives of the Master Framework.

---

## 3. Investigation of Seed Centroids

The initial preflight referenced "seed centroids" for mandals. An exhaustive code and seed inspection established the following concrete facts:

1. **Origin of Seed Centroids:**
   - **Mandals:** In `data/seed/telangana-hierarchy.ts`, `TELANGANA_MANDALS` contains **zero** centroid, latitude, or longitude coordinates. Columns `mandals.centroid` in schema are `NULL`.
   - **Polling Booths:** `location: { latitude, longitude }` in `telangana-hierarchy.ts` represents synthetic test fixtures, formally quarantined under `synthetic_test_fixture` dataset version in Migration 043.
   - **States:** `states.centroid_lat` (17.385) and `centroid_lng` (78.4867) in Migration 001/002 are hardcoded UI viewport coordinates, not surveyed geodetic monuments.
   - **GeoJSON Centroids:** In `scripts/audit-all-geojson.mjs`, centroids are dynamically computed via arithmetic mean of polygon vertices (`centroid(f)`).
2. **Authoritative Status:** **NONE** of the centroids in the repository are authoritative.
3. **Semantics & Limitations:**
   - A centroid is a single point representation of a polygon's center of mass or bounding box.
   - **Strict Invariant:** A centroid must **NEVER** be treated as evidence of polygon containment or boundary overlap. A point lying inside an AC does not prove that the mandal as a whole is contained in that AC.
   - Centroids may only be used for UI map camera positioning or nearest-neighbor distance estimates, never for legal electoral-administrative containment proofs.

---

## 4. Preserved Mandal Geometry Blocker (`UNK-16-01`)

The preflight preserves the critical blocker identified in the initial inspection:

```
====================================================================
BLOCKER: UNK-16-01 — NO MANDAL POLYGON BOUNDARIES EXIST IN REPOSITORY
====================================================================
Current Repository State:
- data/geo/ contains AC boundaries, District boundaries, State boundary.
- data/geo/ contains ZERO mandal boundary files.
- No mandal polygon vectors have ever been committed or ingested.
====================================================================
```

### Prohibited Workarounds (Anti-Fabrication Rules)
Under strict CTO directive, PANIN must **NOT**:
- Construct mandal polygons from town names or headquarters geocoding;
- Use post-2016 revenue mandal boundaries to retrospectively infer 2008 electoral boundaries;
- Derive mandal boundary polygons from point centroids or bounding boxes;
- Copy unrelated or non-statutory third-party GeoJSON;
- Infer mandal boundaries by carving up Assembly Constituency polygons;
- Use spatial Voronoi tessellation or spatial interpolation;
- Synthesize test polygons and label them as real geography.

**Authoritative Finding:** Until certified mandal vector files are acquired from Telangana TRAC or Land Records, **`MANDAL POLYGON GEOMETRY = UNKNOWN / BLOCKED`**.

---

## 5. Temporal Geometry Classification

W016 geometry must reconcile with W014 temporal architecture (`valid_from`, `valid_to`, `is_current`) and strictly distinguish between five different classes of spatial data:

```
                           Spatial Geometry Classes
                                     │
      ┌──────────────────────────────┼──────────────────────────────┐
      ▼                              ▼                              ▼
[CURRENT LEGAL]              [HISTORICAL LEGAL]             [FUTURE ANTICIPATED]
Statutory active             Superseded statutory           Legally enacted,
boundary (2008 Delim;        boundary (1976 Delim;          pending effective date
post-2016 Districts).        pre-2016 Districts).           (e.g. Delimitation Act).
is_current = true.           is_current = false.            valid_from in future.
      │                              │                              │
      └──────────────────────────────┼──────────────────────────────┘
                                     │
      ┌──────────────────────────────┴──────────────────────────────┐
      ▼                                                             ▼
[SCENARIO GEOMETRY]                                         [UNVERIFIED FIXTURE]
Unratified, hypothetical projections                        Community shapefiles,
(e.g. 2026 Delimitation models).                            test geometries (datta07).
status = 'SCENARIO'.                                        status = 'UNVERIFIED'.
Quarantined in proposed_constituencies.                      Non-authoritative rehearsal.
```

### Temporal Rules
1. **No Filename Inference:** Temporal validity must be determined by statutory orders (e.g. Gazette notifications, Delimitation Orders) recorded in `dataset_versions.effective_from/to`, **NEVER** inferred from a file name (e.g. `telangana-assembly.json`) or directory path.
2. **Fixture Isolation:** `UNVERIFIED FIXTURE GEOMETRY` cannot satisfy requirements for `CURRENT LEGAL` or `HISTORICAL LEGAL` geography.
3. **Lineage Primacy:** When a mandal or district splits (e.g. Mancherial $\to$ Hajipur on 2016-10-11 in W014/W015), the spatial boundary must reflect the exact statutory date. Geometry changes accompany lineage transitions; they do not dictate them.

---

## 6. W015 Relationship Validation & Spatial Reconciliation Semantics

W015 established authoritative relational linkages (`parent`, `child`, `contains`, `part-of`, `predecessor`, `successor`, `old-to-new`) based on statutory legal evidence (LGD directory codes, ECI Delimitation Order Schedule XXXI, and G.O.Ms. 222).

### Spatial Comparison Outcomes

Spatial computation (PostGIS `ST_Contains`, `ST_Intersects`) must **NEVER** overwrite accepted W015 relationships automatically. Any spatial evaluation against W015 relational data must produce one of four explicit outcomes:

| Outcome Code | Meaning | System Action |
|---|---|---|
| **`SPATIAL_CONFIRMS_RELATIONAL_EVIDENCE`** | Certified geometry intersection/containment matches W015 declared overlap (`full` or `partial`). | Relationship confirmed cartographically. Evidence recorded in audit trail. |
| **`SPATIAL_CONTRADICTS_RELATIONAL_EVIDENCE`** | Certified geometry indicates disjointness where W015 declares overlap, or full containment where partial is declared. | **DO NOT MUTATE RELATIONSHIP.** Flag as defect (`DEF-16-*`). Trigger cartographic review. Statutory gazette text remains primary over digital vectors. |
| **`SPATIAL_INCONCLUSIVE`** | Geometry resolution is too coarse, boundary slivers exist, or coordinate precision prevents clear determination. | Relationship remains based on W015 relational evidence. Marked inconclusive. |
| **`SPATIAL_NOT_AVAILABLE`** | Geometry for one or both entities is `NULL` (e.g. mandal polygon missing). | Default state. W015 relational evidence stands unchallenged. |

---

## 7. Mandatory Provenance Model for Geometry Ingestion

Before any spatial vector is ingested into Kshetra, its metadata record in `public.provenance_records` must be populated with all 12 mandatory attributes:

1. **Source Authority:** Legal entity publishing the spatial data (e.g. `survey_of_india`, `eci_gis`, `telangana_trac`, `datta07_shapefiles`).
2. **Exact Source Artifact:** File name, download URL, and cryptographic hash (`sha256:b32e4...`).
3. **Source Identifier:** Identifier within the source artifact (e.g. `AC_NO = 1`, `LGD_CODE = 4676`).
4. **Retrieval Date:** ISO 8601 timestamp of retrieval (`2026-09-24T...`).
5. **Effective Date:** Legal effective date (`2008-01-01`).
6. **Dataset:** Target dataset ID in `datasets` table (e.g. `geo_assembly_boundaries`).
7. **Dataset Version:** Specific version tag in `dataset_versions` (e.g. `geo_assembly_boundaries_v2008`).
8. **Transformation History:** Sequence of deterministic processing steps (e.g. `raw_shp -> qgis_clean -> geojson_export -> srid_4326`).
9. **Geometry Status:** Value from `data_status_enum` (strictly `UNVERIFIED` for community data; never `OFFICIAL` without certification).
10. **Coordinate Reference System (CRS/SRID):** Standard EPSG code (strictly `EPSG:4326`).
11. **Geometry Quality Result:** Output of `ST_IsValidReason` and ring closure checks.
12. **Evidence Completeness:** If any required field cannot be established, record **`UNKNOWN`**; do not synthesize values.

---

## 8. Corrected Acceptance Test Design

Acceptance tests are strictly segregated into three groups to ensure technical functionality does not masquerade as legal reconciliation:

```
                            W016 Acceptance Test Battery
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
  [GROUP A: TECHNICAL]          [GROUP B: INTEGRITY]            [GROUP C: RECONCILIATION]
  Geometry parsing,             Entity-geometry linkage,        Authoritative spatial
  SRID 4326, OGC validity,      W012 provenance links,          containment proofs vs
  GiST index execution.         temporal version binding.       W015 relational evidence.
  (Passes with Fixtures)        (Passes with Fixtures)          (REQUIRES AUTHORITATIVE DATA)
```

### Group A: Technical Geometry Tests (Software Capabilities)
*These tests verify that PostGIS is operating and schema constraints work. They can pass using fixture data.*
- **TEST-W016-A01 (SRID & Type Enforcement):** Verify `constituencies.boundary` enforces `MultiPolygon` and `SRID 4326`.
- **TEST-W016-A02 (OGC Validity Check):** Verify `ST_IsValid(boundary) = true` on loaded geometry.
- **TEST-W016-A03 (Spatial Index Verification):** Confirm `EXPLAIN` on bounding box query (`&&`) uses `idx_constituencies_boundary` GiST index.
- **TEST-W016-A04 (Spatial Operator Execution):** Confirm `ST_Contains`, `ST_Intersects`, and `ST_Centroid` execute without runtime error.

### Group B: Data Integrity & Provenance Tests (Governance)
*These tests verify governance linkages under W012/W014. They can pass using fixture data.*
- **TEST-W016-B01 (Entity Linkage):** Verify every geometry row references a valid canonical geography entity PK.
- **TEST-W016-B02 (Provenance Linkage):** Verify every geometry row has a corresponding `provenance_records` entry.
- **TEST-W016-B03 (Status Preservation):** Verify all unverified geometries have status strictly `UNVERIFIED` (0 `OFFICIAL`).
- **TEST-W016-B04 (Scenario Isolation):** Verify default spatial queries return 0 rows with `status = 'SCENARIO'` or from `proposed_constituencies`.

### Group C: Authoritative Spatial Reconciliation Tests (Ground Truth)
*These tests verify legal cartographic truth. They CANNOT be satisfied by Group A or Group B fixture tests.*
- **TEST-W016-C01 (Authoritative AC Boundary Grounding):** Certified AC boundaries match ECI Delimitation Order description. (*BLOCKED by missing certified ECI vector files*).
- **TEST-W016-C02 (Mandal Containment Verification):** Spatial intersection of mandal polygon inside AC confirms W015 MCM `full`/`partial` mapping. (*BLOCKED by UNK-16-01: missing mandal polygon vectors*).
- **TEST-W016-C03 (Polling Station Containment):** Surveyed polling station GPS coordinates lie inside parent AC boundary. (*BLOCKED by synthetic booth fixtures*).

---

## 9. Reclassified Implementation Scope Options

The implementation options are formally reclassified to reflect the evidence gate:

### OPTION 1A: Technical Spatial Rehearsal (Fixture Geometry Only)
- **Scope:**
  - Activate PostGIS columns on `constituencies` (AC 1 & 2) and `mandals` (Centroids) on `panIN-staging`.
  - Ingest `UNVERIFIED` GeoJSON from `datta07` for AC 1 and AC 2 as **explicit test fixtures**.
  - Execute **Group A** (Technical) and **Group B** (Integrity) tests.
  - **Zero schema changes**; zero customer-facing API modifications.
- **Evidentiary Value:** Confirms software and PostGIS configuration on Supabase staging. **Does NOT provide authoritative geographic acceptance.**
- **Recommendation:** Acceptable only as a technical proof-of-concept, not as full W016 closure.

### OPTION 1B: Authoritative Spatial Foundation (Certified Geometry)
- **Scope:**
  - Execute Option 1A technical steps, but ingest **certified statutory boundary vectors** from ECI / Survey of India / TRAC.
  - Execute **Group A**, **Group B**, and **Group C** reconciliation tests.
- **Evidentiary Value:** Full authoritative closure of W016.
- **Blocker:** Missing authoritative vector files for mandals (`UNK-16-01`) and certified ECI shapefiles.
- **Recommendation:** **PREFERRED GOAL**, but requires executing the Authoritative Source Acquisition Plan first.

### OPTION 2: Full State Technical Rehearsal (119 ACs)
- **Scope:** Ingest all 119 unverified AC boundaries from `telangana-assembly.geojson` as fixtures.
- **Recommendation:** Not recommended; higher risk of staging bloat without adding authoritative value.

### OPTION 3: Multi-Level Geography Implementation
- **Scope:** Add geometry to districts, acquire mandals, and ingest all 4 tiers.
- **Recommendation:** **BLOCKED** by missing mandal data and unnecessary schema expansion.

---

## 10. Authoritative Source Acquisition Plan

For each missing spatial layer, three distinct fallback paths are established:

| Geography Tier | Plan A: Preferred Authoritative Source | Plan B: Alternative Official Source | Plan C: User-Controlled Evidence Import |
|---|---|---|---|
| **Assembly Constituencies** | Election Commission of India (ECI) Spatial Data Portal (`eci.gov.in`) | CEO Telangana Electoral Atlas Shapefiles (`ceotelangana.nic.in`) | Manual upload of official ECI Delimitation Gazette boundary maps / CAD files |
| **Mandals / Tehsils** | Telangana Remote Sensing Applications Centre (TRAC / `trac.telangana.gov.in`) | Survey of India (SOI) Open Data / MoPR LGD GIS Layer | Chief Commissioner of Land Administration (CCLA) cadastral shapefile import |
| **Districts** | Survey of India (SOI) Administrative Boundary Database | State Gazette G.O.Ms. 222 GIS Boundary Layers (2016 Reorganization) | Manual boundary assembly from constituent surveyed mandal shapefiles |
| **Polling Booths** | CEO Telangana Polling Station GIS Geocoding Project | ECI National Electoral Roll GPS Dataset | Returning Officer (RO) certified physical polling station coordinate lists |

---

## 11. Final CTO Decision Input Matrix

| Requirement Area | Current Evidence in Repo | Authoritative Geometry Available? | Technical PostGIS Storage Possible? | Authoritative Acceptance Possible Today? | Blocker Identified? | Recommended Next Action |
|---|---|---|---|---|---|---|
| **AC Boundaries** | `data/geo/telangana-assembly.geojson` (119 ACs) | **NO** (Crowdsourced `datta07`, UNVERIFIED) | **YES** (`constituencies.boundary`) | **NO** (Unverified fixture only) | Missing certified ECI vectors | Authorize Option 1A for technical testing OR Defer to Source Acquisition |
| **Mandal Boundaries** | None in repository | **NO** (0 mandal polygons in repo) | **YES** (`mandals.boundary`) | **NO** (Missing data) | **YES: UNK-16-01** (Blocker) | Maintain BLOCKER; initiate Plan A acquisition from TRAC |
| **Mandal Centroids** | None in seed data | **NO** (Illustrative only) | **YES** (`mandals.centroid`) | **NO** (Not authoritative) | Non-authoritative points | Retain NULL in database; do not synthesize points |
| **Polling Booths** | 4 synthetic booth fixtures | **NO** (Synthetic test fixtures) | **YES** (Scalar float exists) | **NO** (Test fixtures) | Synthetic data only | Maintain `synthetic_test_fixture` status |
| **PostGIS Engine** | Migrations 001 & 040 declare extension | **YES** (Pre-enabled on Supabase) | **YES** (PostgreSQL 15+) | **N/A** (Infrastructure) | None | Verify extension runtime compilation on staging |
| **Spatial MCM Alignment** | W015 relational mappings (8 active, all `full`) | **NO** (Requires AC + Mandal polygons) | **YES** (`ST_Intersects`) | **NO** (Requires Group C data) | Missing mandal vectors | Retain W015 relational evidence as authoritative |

---

## Explicit Preflight Statements

```
W015                = ACCEPTED / COMPLETE
W015-B1             = ACCEPTED / COMPLETE
W015-B2             = ACCEPTED / COMPLETE
W016 PREFLIGHT      = RESUBMITTED_FOR_CTO_REVIEW (Revision A1)
W016 IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION          = STRICTLY UNTOUCHED
```
