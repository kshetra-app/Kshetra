# W016-B1 — Authoritative Geometry Source Acquisition & Evidence Reconciliation Preflight

**Document ID:** `REPORT-W016-B1-SOURCE-PREFLIGHT-v1.0`
**Generated:** 2026-09-24
**Job:** W016-B1 (Authoritative Geometry Source Acquisition & Evidence Reconciliation Preflight)
**Authority:** CTO / Cofounder Directive — W016-B1 Authorization
**Current Authoritative Lifecycle State:**
- `W015` = ACCEPTED / COMPLETE (Commit `3748e46`, Governance Commit `4d99dd3`)
- `W016-A1 PREFLIGHT` = **ACCEPTED** (Commit `1f8bde8`)
- `W016-B1` = **AUTHORIZED AS A DOCUMENTATION / EVIDENCE-RECONCILIATION PREFLIGHT ONLY**
- `W016 IMPLEMENTATION` = **NOT YET AUTHORIZED**
- `PRODUCTION` = **STRICTLY UNTOUCHED**

---

> [!IMPORTANT]
> **W016-B1 IS A DOCUMENTATION / EVIDENCE-RECONCILIATION PREFLIGHT ONLY.**
> This document does **NOT** authorize, execute, or implement database migrations, application changes, spatial API additions, geometry ingestion, or production mutations.
> No claim of authoritative geometry may be made without independent, verifiable source evidence.

---

## 1. Objective & Purpose

The purpose of Job **W016-B1** is **NOT** to implement geometry, execute PostGIS migrations, or ingest vector data into Supabase.

The objective is to establish, with independently verifiable evidence, whether authoritative geographic vector geometry required by W016 is actually available for canonical PANIN geography entities and temporal regimes. Specifically, W016-B1 determines:

1. **Which geometry is actually required** across the administrative and electoral hierarchy;
2. **Which authoritative source(s) can provide it**, separating legal authority from geometry publishing authority;
3. **Whether those sources are accessible**, verifiable, and machine-readable;
4. **Whether external identifiers reconcile to W014/W015 canonical entities**;
5. **What temporal coverage exists** across historical, current, and projected regimes;
6. **What remains UNKNOWN or BLOCKED**;
7. **Whether W016 implementation can subsequently be authorized by the CTO**.

---

## 2. Absolute Prohibitions & Anti-Fabrication Invariants

Under strict CTO directive, the following actions are **PROHIBITED** during W016-B1:

- **NO** database mutations: Do not create Migration 044, alter schema, or add geometry columns;
- **NO** geometry ingestion: Do not import GeoJSON or vector data into Supabase staging or production;
- **NO** production execution: Do not run `ST_Contains`, `ST_Intersects`, or spatial functions against production;
- **NO** scope expansion: Do not add H3 indexing, spatial APIs, map rendering UI, or mobile modifications;
- **NO** synthetic geography: Do not create synthetic polygons, derive mandal polygons from centroids, or derive mandal boundaries from Assembly Constituency boundaries;
- **NO** visual inference: Do not infer legal boundaries from OpenStreetMap, web maps, or visual similarity;
- **NO** silent repair: Do not alter corrupt geometry and claim it as authoritative;
- **NO** status inflation: Do not convert `UNVERIFIED` geometry into `OFFICIAL`; do not mark `datta07` geometry as authoritative;
- **NO** invented identifiers: Do not manufacture composite `source_record_id` values or fabricate ECI/LGD/TRAC codes;
- **NO** false authority claims: Do not claim an artifact is authoritative merely because a website has a `.gov.in` domain;
- **NO** runtime presumption: Do not claim runtime PostGIS verification from migration declarations alone;
- **NO** relational tampering: Do not modify accepted W015 relationships based on spatial assumptions.

---

## 3. Repository Baseline Inspection

In accordance with Section 17 of the directive, the repository was audited prior to analysis against the accepted W016-A1 baseline:

- **Baseline Commit:** `1f8bde891c7edfa94c49543a9c2b6f40c540ed20` (`1f8bde8` — *docs: clarify W016 authoritative geometry evidence gate*)
- **Working Tree State:** Completely clean (`git status --short` returns exit code 0, 0 uncommitted changes).
- **Upstream Synchronization:** `master` is fully synchronized with `origin/master`.
- **Implementation Drift Audit:** Verified that zero migrations, zero application code files, and zero schema tables have been modified or introduced since commit `1f8bde8`.

---

## 4. Separation of Authorities: Legal vs. Geometry vs. Identifier

To eliminate false authority conflation, every candidate source must be evaluated against three distinct institutional questions:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. SOURCE OF LEGAL / ADMINISTRATIVE AUTHORITY                           │
│ Question: Who has statutory authority to establish the boundary?       │
│ Examples: Delimitation Commission of India (Electoral ACs/PCs);       │
│           Telangana Revenue Dept (Administrative Mandals/Districts);   │
│           Parliament of India (State boundaries under AP Reorg Act).   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Promulgates Statutory Text & Maps
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. SOURCE OF VECTOR GEOMETRY                                           │
│ Question: Who digitized, surveyed, and supplied the actual digital     │
│           coordinate polygon file?                                     │
│ Examples: Survey of India (SOI); Telangana Remote Sensing (TRAC);      │
│           ECI GIS Division; Community volunteers (datta07).            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Assigns Feature Identifiers
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. SOURCE OF IDENTIFIER MAPPING                                        │
│ Question: Who maintains the primary reference key used in the vector?  │
│ Examples: ECI (statutory AC numbers 1–119);                            │
│           Ministry of Panchayati Raj (Local Government Directory LGD); │
│           Registrar General of India (Census 2011 MDDS Codes).         │
└────────────────────────────────────────────────────────────────────────┘
```

A government agency hosting a shapefile on a portal does **not** prove that the digital coordinates are legally authoritative, nor does an authentic identifier prove that the accompanying geometry polygon is accurate.

---

## 5. Comprehensive Geometry Evidence Matrix

The 30-field geometry evidence matrix covers all canonical geography levels required by Kshetra:

| # | Attribute | Assembly Constituency (AC) | Administrative Mandal | Administrative District | State Boundary |
|---|---|---|---|---|---|
| **1** | **Geometry Requirement** | 119 Electoral Boundary MultiPolygons | Sub-district Administrative MultiPolygons | 33 Administrative MultiPolygons | 1 State Administrative MultiPolygon |
| **2** | **Entity Type** | `public.constituencies` | `public.mandals` | `public.districts` | `public.states` |
| **3** | **Geography Level** | Assembly Constituency (Electoral) | Mandal / Tehsil (Administrative) | District (Administrative) | State (Federal Administrative) |
| **4** | **Temporal Regime** | Delimitation Order 2008 (Active) | Post-2016 Reorganization (G.O.Ms. 222) | Post-2016 Reorganization (33 Districts) | AP Reorganisation Act 2014 |
| **5** | **Required Geometry Type** | `GEOMETRY(MultiPolygon, 4326)` | `GEOMETRY(MultiPolygon, 4326)` | `GEOMETRY(MultiPolygon, 4326)` | `GEOMETRY(MultiPolygon, 4326)` |
| **6** | **Candidate Source (Repo)** | `data/geo/telangana-assembly.geojson` | **NONE** (0 files in repository) | `data/geo/telangana-districts.geojson` | `data/geo/telangana-state.geojson` |
| **7** | **Source Authority** | Open Source GIS Community (`datta07`) | **UNKNOWN** (Missing from repo) | Open Source GIS Community (`datta07`) | Open Source GIS Community (`datta07`) |
| **8** | **Geometry Authority** | Unverified Community Volunteer | **UNKNOWN** | Unverified Community Volunteer | Unverified Community Volunteer |
| **9** | **Identifier Authority** | ECI (Delimitation 2008 AC Numbers) | MoPR LGD Directory Codes | MoPR LGD / Census 2011 | Census 2011 / ISO 3166-2:IN |
| **10** | **Source URL / Location** | `github.com/datta07/INDIAN-SHAPEFILES` | `UNKNOWN` (No URL in repo) | `github.com/datta07/INDIAN-SHAPEFILES` | `github.com/datta07/INDIAN-SHAPEFILES` |
| **11** | **Publication Date** | ~2020 (Git commit history) | `UNKNOWN` | ~2020 (Git commit history) | ~2020 (Git commit history) |
| **12** | **Effective Date** | `2008-01-01` (ECI Delimitation) | `2016-10-11` (Statutory G.O.) | `2016-10-11` (Statutory G.O.) | `2014-06-02` (Telangana Formation) |
| **13** | **Retrieval Date** | Pre-W010 (Recorded in Migration 039) | `UNKNOWN` | Pre-W010 | Pre-W010 |
| **14** | **Artifact Format** | GeoJSON FeatureCollection | `UNKNOWN` | GeoJSON FeatureCollection | GeoJSON FeatureCollection |
| **15** | **CRS / SRID** | EPSG:4326 (WGS84 Lat/Lng) | `UNKNOWN` | EPSG:4326 (WGS84 Lat/Lng) | EPSG:4326 (WGS84 Lat/Lng) |
| **16** | **Source Identifier** | `AC_NO` (1 to 119) | `UNKNOWN` | `dtname`, `Dist_LGD: 501` | `STNAME: 'TELANGANA'`, `State_LGD: 36` |
| **17** | **Dataset / Version ID** | `geo_assembly_boundaries_v2008` | `UNKNOWN` | `UNKNOWN` (Not registered in 039) | `UNKNOWN` (Not registered in 039) |
| **18** | **SHA-256 Hash** | `fc440af93a9d970e16fcc312adf8e6f53610446ce71230fffb34dfea238c17b6` | `NOT_AVAILABLE` | `4b1a4afcae48dcee69a50c2617df07d54c4a3edef1d5f43ce5aa4f4474fd5350` | `9eac58ea2e532763de21ae6fe19bd05fd853886f3d0a9907c249501e5f425446` |
| **19** | **Artifact Obtainable?** | YES (Local repository file) | **NO** (0 mandal files in repo) | YES (Local repository file) | YES (Local repository file) |
| **20** | **Independently Verifiable?** | **NO** (No ECI cryptographic signature) | **NO** | **NO** (No TRAC/SOI cryptographic signature) | **NO** (No SOI cryptographic signature) |
| **21** | **ID Reconciliation Status** | `MATCH_BY_AUTHORITY_IDENTIFIER` (`AC_NO`) | `NOT_AVAILABLE` (Geometry missing) | `MATCH_REQUIRES_DOCUMENTED_MAPPING` | `DIRECT_MATCH` (`STCODE11 = '36'`) |
| **22** | **W014 Version Mapping** | Reconciles to 2008 Delimitation Regime | Reconciles to 2016 Reorganisation Lineage | Reconciles to `district_versions` 2016 | Reconciles to `state_versions` 2014 |
| **23** | **W012 Provenance Compatibility** | Registered as `datta07_shapefiles` | Incompatible until artifact obtained | Requires dataset registration | Requires dataset registration |
| **24** | **Transformation Required** | Coerce Polygon $\to$ MultiPolygon | Full ingestion pipeline required | Coerce Polygon $\to$ MultiPolygon | Coerce Polygon $\to$ MultiPolygon |
| **25** | **Transformation History** | Raw Shapefile $\to$ GeoJSON (Unlogged) | `UNKNOWN` | Raw Shapefile $\to$ GeoJSON (Unlogged) | Raw Shapefile $\to$ GeoJSON (Unlogged) |
| **26** | **Quality Observations** | 120 features, 119 unique ACs (Bhadrachalam split into 2 parts). Clean rings. | `UNKNOWN` | 33 features. Clean rings. | 1 feature. Clean rings. |
| **27** | **Known Limitations** | Pre-2016 district references (`DIST_NAME = 'ADILABAD'`); community source. | Complete absence of vector geometry. | Lacks gazette boundary monument cross-verification. | Lacks Survey of India certified frontier coordinates. |
| **28** | **Acceptance Feasibility** | **FEASIBLE FOR FIXTURE ONLY** | **BLOCKED** | **FEASIBLE FOR FIXTURE ONLY** | **FEASIBLE FOR FIXTURE ONLY** |
| **29** | **Blocker** | Missing certified ECI vector release | **UNK-16-01: MANDAL POLYGON MISSING** | Schema lacks geometry column in `districts` | None for fixture; missing SOI certification |
| **30** | **Plan A / Plan B / Plan C** | A: ECI GIS / B: CEO TS / C: Gazette CAD | A: TRAC / B: MoPR LGD / C: CCLA Shapefile | A: TRAC / B: SOI / C: State Gazette Vector | A: SOI Open Data / B: NIC / C: Gazette Map |

---

## 6. Assembly Constituency Geometry Investigation

### 1. The Legal Reality vs. The Digital Asset
Under Section 9 of the Delimitation Act, 2002, the **Delimitation Commission of India** determined the boundaries of the 119 Assembly Constituencies in Telangana (promulgated in Delimitation Order 2008, Schedule XXXI).
- **Statutory Authority:** Delimitation Commission / Election Commission of India (ECI).
- **Form of Statutory Promulgation:** Published as **textual territorial descriptions** in the Gazette of India Extraordinary (e.g. specifying that Sirpur AC 1 comprises Kouthala, Bejjur, Dahegaon, and Sirpur mandals).
- **Vector Geometry Availability:** The ECI publishes static maps and an Electoral Atlas. The ECI Spatial Division maintains an internal GIS layer, but does not provide an open, cryptographically certified vector download API for public automated ingestion.

### 2. Status of `data/geo/telangana-assembly.geojson`
- **File SHA-256:** `fc440af93a9d970e16fcc312adf8e6f53610446ce71230fffb34dfea238c17b6`
- **Source:** `datta07/INDIAN-SHAPEFILES` (GitHub community project).
- **W012 Classification:** Registered in Migration 039 under source `datta07_shapefiles` with status strictly **`UNVERIFIED`**.
- **Internal Discrepancies:**
  - Feature 294 has `DIST_NAME: 'ADILABAD'`, `dtcode11: '532'`, and `DT_CODE: '01'`. This reflects the pre-2016 10-district setup of undivided Andhra Pradesh / early Telangana.
  - In October 2016, Adilabad was trifurcated/quadrifurcated into Adilabad, Kumuram Bheem Asifabad, Mancherial, and Nirmal.
  - The GeoJSON preserves the 2008 Delimitation boundaries, but carries obsolete 2011 district properties.
- **Finding:** This asset is structurally sound for **non-authoritative software pipeline rehearsal and UI rendering**, but **CANNOT** be presented as legally authoritative electoral geometry.

---

## 7. Mandal Geometry Investigation & Blocker (`UNK-16-01`)

### 1. Mandatory Finding
An exhaustive search of all repository directories (`data/`, `scripts/`, `supabase/`, `apps/`) confirmed:
```
====================================================================
MANDAL_POLYGON_GEOMETRY = UNKNOWN / BLOCKED
Number of Mandal Boundary Files in Repository: 0
====================================================================
```
No mandal boundary vectors exist in the Kshetra codebase.

### 2. Sources Investigated
1. **Repository Seed Data (`data/seed/telangana-hierarchy.ts`):** Contains names, LGD codes, and populations for 12 pilot mandals, but **zero coordinate polygons and zero centroid coordinates**.
2. **Local Government Directory (LGD / `lgdirectory.gov.in`):** Maintains tabular hierarchy data (state $\to$ district $\to$ sub-district/mandal $\to$ village) and LGD numeric codes. LGD web portals do not provide public, direct vector boundary downloads for sub-districts without authenticated GIS enterprise access.
3. **Survey of India (SOI) Open Data Portal:** Provides international, state, and district boundary shapefiles. Sub-district (mandal/tehsil) polygon boundary layers are restricted or unavailable for open public download.
4. **Telangana Remote Sensing Applications Centre (TRAC / TGRAC):** TRAC has digitized administrative mandal boundaries for the state of Telangana. However, these datasets are maintained on internal state enterprise GIS servers and are not distributed as open-source files in this repository.

### 3. Why Centroids and Inferred Polygons Are Prohibited
- A point coordinate (centroid) has no surface area and cannot prove polygon containment or calculate overlap percentages.
- Inferring mandal boundaries by taking convex hulls or Voronoi diagrams around village points creates synthetic geometries that have no statutory legal standing.
- Retaining `MANDAL_POLYGON_GEOMETRY = UNKNOWN / BLOCKED` is mandatory to uphold the Master Framework's anti-fabrication rules.

---

## 8. Temporal Coverage Architecture

W016 geometry must attach to the temporal entity model established in W014 (`041_temporal_geography_model.sql`). Five distinct temporal classes are recognized:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. CURRENT LEGAL GEOMETRY                                               │
│ Definition: Boundaries currently in statutory force.                   │
│ Application: ECI Delimitation Order 2008 (for ACs/PCs);                 │
│              Telangana Gazette 2016 Reorganisation (for Mandals/Dist).  │
│ W014 Linkage: is_current = true, valid_to IS NULL.                     │
└─────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. HISTORICAL LEGAL GEOMETRY                                            │
│ Definition: Boundaries that were legally in force during a prior era.   │
│ Application: 1976 Delimitation Order boundaries;                        │
│              Pre-2016 10-district administrative boundaries.            │
│ W014 Linkage: is_current = false, valid_to <= '2016-10-11'.             │
└─────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. FUTURE ANTICIPATED GEOMETRY                                          │
│ Definition: Boundaries enacted by statute but pending effective date.   │
│ Application: Newly notified mandal bifurcations during transition period│
│ W014 Linkage: valid_from > CURRENT_DATE.                                │
└─────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. SCENARIO / PROPOSED GEOMETRY                                         │
│ Definition: Unratified, hypothetical boundaries for delimitation study. │
│ Application: 2026 Delimitation seat projections.                        │
│ W014 Linkage: Quarantined in public.proposed_constituencies;            │
│              status = 'SCENARIO'.                                       │
└─────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. UNVERIFIED FIXTURE GEOMETRY                                          │
│ Definition: Community or test geometries used for technical rehearsal.  │
│ Application: datta07 GeoJSON files in data/geo/.                        │
│ W014 Linkage: status = 'UNVERIFIED'; dataset_version = *_v2008.         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Anti-Contamination Rule:** An `UNVERIFIED FIXTURE GEOMETRY` cannot be treated as `CURRENT LEGAL` or `HISTORICAL LEGAL` geography simply because its file name contains "telangana".

---

## 9. Canonical Identifier Reconciliation to W014 / W015

To connect external vector geometries with PANIN's database, external attributes must reconcile with existing canonical keys:

| Geography Tier | External Source Identifier | Target Canonical Field | Reconciliation Classification | Evidence & Mapping Rule |
|---|---|---|---|---|
| **Assembly Constituencies** | `AC_NO` (Integer 1..119) | `constituencies.internal_id` | **`MATCH_BY_AUTHORITY_IDENTIFIER`** | Formatted deterministically as `'TS-AC-' \|\| AC_NO`. Directly matches 119 canonical rows. |
| **Assembly Constituencies** | `AC_NAME` (String) | `constituencies.name` | **`MATCH_REQUIRES_DOCUMENTED_MAPPING`** | Minor spelling variations (e.g. `'Boath (ST)'` vs `'Boath'`) resolved via canonical name dictionary. |
| **Districts (Post-2016)** | `Dist_LGD` (Integer e.g. 501) | `districts.code` | **`MATCH_REQUIRES_DOCUMENTED_MAPPING`** | Maps LGD district code to canonical `TS-DST-{LGD}` code established in Migration 040. |
| **Districts (Pre-2016)** | `dtcode11` (Census Code e.g. 532) | `district_versions.id` | **`MATCH_REQUIRES_DOCUMENTED_MAPPING`** | Historical Census 2011 code maps to pre-2016 district temporal version in W014. |
| **Mandals** | LGD Sub-District Code | `mandals.id` | **`NOT_AVAILABLE`** | Vector geometry is missing (`UNK-16-01`). If acquired, maps via `'TS-MDL-' \|\| lgd_code`. |
| **Polling Booths** | Booth Serial Number | `polling_booths.id` | **`NOT_AVAILABLE`** | 4 pilot booths are synthetic test fixtures; geocoded vector mapping is deferred. |

---

## 10. Geometry Quality Inspection of Existing Assets

Static inspection of the existing repository GeoJSON files (`scripts/audit-all-geojson.mjs` and Node.js inspection) revealed:

1. **Telangana Assembly (`data/geo/telangana-assembly.geojson`):**
   - **Feature Count:** 120 features representing 119 unique ACs.
   - **Multipart Features:** Bhadrachalam (AC 119) has 2 distinct polygon parts (due to the 2014 Andhra Pradesh Reorganisation Act transfer of 7 mandals/sub-mandals to AP, leaving non-contiguous sections).
   - **Ring Topology:** 100% of rings have $\ge 4$ coordinates, are properly closed (first coord = last coord), and contain finite, non-NaN coordinates.
   - **OGC Validity:** All 120 features parse cleanly as valid simple polygons.
2. **Multi-State National Assets (`apps/mobile/data/*.json`):**
   - **Audit Result:** **19 clean states / 12 corrupted states**.
   - **Severe Errors in 12 States:**
     - *Gujarat:* 165 features for 182 official seats (17 seats missing).
     - *Assam:* 133 features for 126 official seats (duplicate and missing `acNo` values).
     - *Bihar:* 28 duplicate `acNo` entries, 28 missing `acNo` entries.
     - *Jharkhand:* 95 features for 81 official seats.
   - **Conclusion:** Community GIS data has high error rates across India. Only Telangana is locally clean in the repository, reinforcing the need for strict quality gates.

---

## 11. Polling Station / Booth Geometry Scope Classification

- **Master Requirement Trace:** Polling booth polygon boundaries are **not** mandated by W016. Polling stations represent physical structures (schools, community halls) and are modeled as points, not boundary polygons.
- **Current Repository State:** 4 polling booths exist in `public.polling_booths` with scalar `latitude` and `longitude` coordinates, explicitly isolated under `synthetic_test_fixture` in Migration 043.
- **Classification:** **`DEFERRED / OUT OF W016 SCOPE`**.
  - W016 will not ingest polling station GIS boundary vectors.
  - The 4 synthetic test fixtures will remain untouched.

---

## 12. PostGIS Verification Distinction

The technical readiness of PostGIS is categorized into four distinct evidence layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Layer A: REPOSITORY SCHEMA DECLARATIONS                                │
│ Status:  VERIFIED (STATIC_REPOSITORY)                                  │
│ Evidence: Migration 001 L8 and Migration 040 L22 specify:              │
│           CREATE EXTENSION IF NOT EXISTS postgis;                      │
│           idx_constituencies_boundary USING GIST defined.             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Does not prove staging runtime
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Layer B: STAGING DATABASE EXTENSION ACTIVATION                         │
│ Status:  INFERRED / UNKNOWN                                            │
│ Evidence: Migrations 001–043 were applied to panIN-staging by CTO.     │
│           Direct catalog query (SELECT * FROM pg_extension) not        │
│           executed during preflight.                                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Does not prove function execution
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Layer C: STAGING RUNTIME SPATIAL FUNCTION EXECUTION                    │
│ Status:  UNKNOWN                                                       │
│ Evidence: Zero ST_* queries executed by backend or test suite.         │
│           Must be verified via explicit test during implementation.    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Production is isolated
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Layer D: PRODUCTION SPATIAL WORKLOAD VERIFICATION                      │
│ Status:  NOT PERFORMED / PROHIBITED                                    │
│ Evidence: Production database is STRICTLY UNTOUCHED.                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 13. W016 / W017 Capability Boundary Demarcation

To prevent architectural creep during spatial preflight, capabilities are formally partitioned:

| Capability / Feature | W016 (Spatial Foundation) | W017 (Spatial Gateway & Maps) | Deferred / Excluded |
|---|---|---|---|
| **PostGIS Geometry Columns (AC & Mandal)** | **PRIMARY SCOPE** | Consumer | - |
| **GiST Spatial Index Activation** | **PRIMARY SCOPE** | Consumer | - |
| **OGC Geometry Ingestion & Quality Gates** | **PRIMARY SCOPE** | Consumer | - |
| **Point-in-Polygon Database Locating** | **PRIMARY SCOPE** | Fastify Route Exposure | - |
| **Physical Containment Check vs W015** | **PRIMARY SCOPE** | Bulk National Execution | - |
| **Spatial Query RPCs & Boundary Diff** | Excluded | **PRIMARY SCOPE** | - |
| **Quantitative Overlap Percentages (`ST_Area`)** | Excluded | **PRIMARY SCOPE** | - |
| **Frontend Mapbox/MapLibre Integration** | Excluded | **PRIMARY SCOPE** | - |
| **Vector Tile Pipeline (MVT / Tippecanoe)** | Excluded | **PRIMARY SCOPE** | - |
| **H3 Hexagonal Hierarchical Indexing** | Excluded | Excluded | **DEFERRED** |
| **Automated Mesh & Sliver Healing** | Excluded | Excluded | **DEFERRED** |
| **PostGIS Topology Extension** | Excluded | Excluded | **DEFERRED** |

---

## 14. Plan A / Plan B / Plan C Source Acquisition Pathways

For every material geometry requirement, three distinct acquisition paths are established:

### 1. Assembly Constituencies (119 ACs)
- **PLAN A (Preferred Authoritative Source):** Request/download official 2008 Delimitation GIS shapefiles from the **Election Commission of India (ECI) Spatial Data Infrastructure** or open data releases.
- **PLAN B (Alternative Official Source):** Acquire certified electoral boundary shapefiles published by the **Office of the Chief Electoral Officer (CEO), Telangana** (`ceotelangana.nic.in`).
- **PLAN C (User-Controlled Artifact Path):** Project stakeholder imports a certified ESRI Shapefile or GeoJSON package accompanied by statutory gazette documentation, certified EPSG:4326 projection metadata, and verifiable SHA-256 hash.

### 2. Administrative Mandals (594 Mandals)
- **PLAN A (Preferred Authoritative Source):** Acquire official mandal administrative vector boundaries from the **Telangana Remote Sensing Applications Centre (TRAC / TGRAC)**, Planning Dept, Govt of Telangana.
- **PLAN B (Alternative Official Source):** Extract sub-district boundaries from the **Ministry of Panchayati Raj (MoPR) / Local Government Directory (LGD) GIS Portal** or **Survey of India (SOI) Open Data Portal**.
- **PLAN C (User-Controlled Artifact Path):** Project stakeholder supplies official cadastral revenue mandal shapefiles certified by the **Chief Commissioner of Land Administration (CCLA), Telangana**, complete with LGD sub-district code mappings.

### 3. Administrative Districts (33 Districts)
- **PLAN A (Preferred Authoritative Source):** Acquire post-2016 33-district boundaries from **Telangana TRAC / TGRAC**.
- **PLAN B (Alternative Official Source):** Download verified district shapefiles from **Survey of India (SOI) Administrative Atlas** or **Bhuvan (ISRO)**.
- **PLAN C (User-Controlled Artifact Path):** Stakeholder provides official district vector boundaries matching the 2016 gazette notifications (`G.O.Ms.No. 220–250`).

---

## 15. Acceptance Feasibility Matrix

| Requirement | Entity | Geometry Needed | Authoritative Source Found? | Evidence Complete? | Identifier Reconciled? | Temporal Coverage | Implementation Feasible? | Acceptance Feasible? | Blocker | Plan A | Plan B | Plan C |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **AC Boundaries** | `constituencies` | MultiPolygon (119 ACs) | **NO** (Only community GeoJSON in repo) | **PARTIAL** (Local file exists, lacks ECI signature) | **YES** (`AC_NO` $\to$ `TS-AC-*`) | 2008 Delimitation Regime | **YES (for Fixture)** | **NO (Authoritative)** | Missing certified ECI vector release | ECI GIS Portal | CEO Telangana Atlas | Stakeholder Gazette CAD Import |
| **Mandal Boundaries** | `mandals` | MultiPolygon (594 Mandals) | **NO** (0 files in repo) | **NO** (No artifact) | **NOT_AVAILABLE** | Post-2016 Reorganisation | **NO** | **NO** | **UNK-16-01: MANDAL POLYGON MISSING** | TRAC Telangana | MoPR LGD GIS | CCLA Land Records Import |
| **District Boundaries** | `districts` | MultiPolygon (33 Districts) | **NO** (Only community GeoJSON in repo) | **PARTIAL** (Local file exists, lacks TRAC signature) | **YES** (LGD code maps to `TS-DST-*`) | Post-2016 Reorganisation | **PARTIAL** (Requires DDL column) | **NO (Authoritative)** | Schema lacks column; missing TRAC signature | TRAC Telangana | Survey of India | State Gazette Vector Import |
| **Polling Booths** | `polling_booths` | Point (4 pilot booths) | **NO** (Synthetic test fixtures) | **PARTIAL** (Test fixtures only) | **YES** (`synthetic_test_fixture`) | Current Test Fixture | **DEFERRED** | **DEFERRED** | Classified as DEFERRED / OUT OF SCOPE | CEO Polling GIS | ECI Roll GPS | RO Certified Coordinates |
| **State Boundary** | `states` | MultiPolygon (1 State) | **NO** (Only community GeoJSON in repo) | **PARTIAL** (Local file exists, lacks SOI signature) | **YES** (`STCODE11 = '36'`) | AP Reorg Act 2014 | **YES (for Fixture)** | **NO (Authoritative)** | Missing SOI certified boundary | Survey of India | NIC / Bharat Maps | Official Gazette Boundary Map |

---

## 16. Unknown & Blocker Register

| Blocker / Unknown ID | Category | Exact Question | Evidence Searched | Evidence Obtained | Evidence Missing | Why Current Evidence Insufficient | Resolution Path | Blocks Impl.? | Blocks Acceptance? |
|---|---|---|---|---|---|---|---|---|---|
| **`UNK-16-01`** | **BLOCKER** | Are authoritative mandal boundary polygons available in the repository or public open APIs? | Full repo search across `data/`, `scripts/`, `supabase/`; LGD portals. | Tabular seed data with LGD codes and names in `telangana-hierarchy.ts`. | Digital coordinate polygon vector shapefiles for mandals. | Centroids and names cannot establish polygon containment or compute spatial overlap. | Acquire official mandal shapefiles from Telangana TRAC or CCLA (Plan A/C). | **YES (for Mandals)** | **YES (for W016 Closure)** |
| **`UNK-16-02`** | **BLOCKER** | Is existing AC GeoJSON cryptographically verified against official ECI delimitation vector releases? | `data/geo/ATTRIBUTION.md`, commit logs, ECI portal releases. | GeoJSON from `datta07/INDIAN-SHAPEFILES` (MIT license, community source). | Certified vector release directly signed by ECI or CEO Telangana. | Community data is classified as `UNVERIFIED` under W012; cannot represent statutory legal truth. | Formal source acquisition via Plan A (ECI GIS portal) or Plan B (CEO Telangana). | **NO (Allows Fixture Rehearsal)** | **YES (for Authoritative Closure)** |
| **`UNK-16-03`** | **TECHNICAL UNKNOWN** | Is PostGIS extension compiled and active on staging runtime? | Migrations 001 and 040 SQL statements. | `CREATE EXTENSION IF NOT EXISTS postgis;` in migration files. | Live staging query output confirming `postgis` extension version and ST_* execution. | Static code declarations do not confirm staging database engine status. | Execute read-only PostGIS verification query against staging upon authorization. | **NO** | **NO** |
| **`UNK-16-04`** | **DEFERRED** | Are authoritative geodetic survey coordinates available for polling booths? | `polling_booths` seed data and Migration 043. | 4 synthetic test fixtures with approximate lat/lng. | Certified GPS coordinate survey from CEO Telangana Returning Officers. | Synthetic test fixtures are explicitly quarantined from authoritative data. | Classify as DEFERRED / OUT OF W016 SCOPE. | **NO** | **NO** |
| **`UNK-16-05`** | **DEFERRED** | How will the 12 corrupted non-Telangana state GeoJSON files be remediated? | `scripts/audit-all-geojson.mjs` scan results. | 19 clean states, 12 corrupted states (Assam, Gujarat, Bihar, etc.). | Validated national constituency GeoJSON collections. | Corrupt client assets will fail MapLibre rendering on multi-state expansion. | Remediate during national multi-state rollout; out of scope for Telangana W016. | **NO** | **NO** |

---

## 17. Conclusion & Next Decision Required from CTO

### Summary of Authoritative Findings

1. **Software & PostGIS Storage is Feasible (Claims A & B):** PANIN has schema columns and GiST index definitions capable of storing and indexing geometries. A technical software rehearsal (Option 1A) using unverified fixture data can be executed safely on staging with zero schema changes.
2. **Authoritative Geographic Reconciliation is BLOCKED (Claim C):**
   - Mandal polygon geometry is completely absent (`UNK-16-01` = **BLOCKED**).
   - Existing AC geometry is community-sourced (`datta07`) and strictly **`UNVERIFIED`** under W012 data governance.
   - Sourcing geometry from a government portal or using community shapefiles does not make it `OFFICIAL`.
3. **W015 Relational Truth Stands Unchallenged:**
   - The 8 active mandal-AC relational mappings established in W015-B2 remain authoritative.
   - No spatial computation can overwrite W015 relationships without certified, independently evidenced geometries.

### Exact Decision Required from the Independent CTO

The CTO is requested to select one of the following paths:

- **DECISION PATH 1 (RECOMMENDED): Authorize Option 1A (Technical Spatial Rehearsal Only)**
  - Authorize a strictly bounded technical rehearsal on staging using AC 1 and AC 2 fixture geometries.
  - Test PostGIS parsing, GiST indexing, and Group A/B verification tests.
  - Explicitly declare that Option 1A does **NOT** constitute authoritative spatial reconciliation or close W016.
  - Commission Source Acquisition Plan A/C for mandal boundaries in parallel.
- **DECISION PATH 2: Hold W016 Implementation Until Source Acquisition Plan A is Executed**
  - Keep W016 implementation **UNAUTHORIZED**.
  - Direct the team to execute external data acquisition (TRAC / ECI) before touching staging.
- **DECISION PATH 3: Scope Redefinition**
  - Formally de-scope mandal polygon containment from W016; confine W016 strictly to Assembly Constituency boundary ingestion.

---

## Final Preflight Statements

```
W015                = ACCEPTED / COMPLETE
W015-B1             = ACCEPTED / COMPLETE
W015-B2             = ACCEPTED / COMPLETE
W016-A1 PREFLIGHT   = ACCEPTED
W016-B1 PREFLIGHT   = SUBMITTED_FOR_CTO_REVIEW
W016 IMPLEMENTATION = NOT YET AUTHORIZED
PRODUCTION          = STRICTLY UNTOUCHED
```
