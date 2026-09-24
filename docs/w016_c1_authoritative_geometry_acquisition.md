# W016-C1: Authoritative Geometry Acquisition & Reconciliation Execution

**Job Identifier:** W016-C1  
**Authority:** Independent CTO / Co-founder Directive  
**Date:** 2026-09-24  
**Authoritative Baseline Commit:** `4beb9a7cd4b6dbb0f1532085a5928fa9ec22378a` (`4beb9a7`)  
**Target Environment:** Acquisition & Static Evidence Only  
**Database Ingestion:** **STRICTLY NOT AUTHORIZED**  
**Migration 044:** **STRICTLY NOT AUTHORIZED**  
**Production Environment:** **STRICTLY UNTOUCHED**  
**Current Authoritative Lifecycle State:**
- W015: ACCEPTED / COMPLETE
- W015-B1: ACCEPTED / COMPLETE
- W015-B2: ACCEPTED / COMPLETE
- W016-A1 PREFLIGHT: ACCEPTED
- W016-B1 PREFLIGHT: ACCEPTED
- W016-B2 REHEARSAL: ACCEPTED / COMPLETE
- W016-C1 ACQUISITION: **SUBMITTED FOR CTO REVIEW**
- W016 DATABASE INGESTION: **STRICTLY NOT AUTHORIZED**
- PRODUCTION: **STRICTLY UNTOUCHED**

---

## 1. Executive Summary & Objective

Job **W016-C1** was authorized as an **Authoritative Geometry Source Acquisition & Evidence Execution Job**. In accordance with the Master Framework anti-fabrication rules, its mandate was to attempt to acquire actual candidate vector geometry artifacts across three administrative/electoral tiers:

1. **Priority A: Assembly Constituencies (119 ACs)**
2. **Priority B: Administrative Districts (33 Districts)**
3. **Priority C: Administrative Mandals (Sub-districts — Blocker UNK-16-01)**

### Core Finding
Through direct interaction with official portals, candidate vector geometry datasets were successfully acquired and preserved from the **Telangana State Remote Sensing Applications Centre (TGRAC / TRAC)** ArcGIS REST GIS Server.

However, in rigorous adherence to Section 3 (*Source Authority Rule*) and Section 15 (*Acceptance Gate*):
- **None of the candidate artifacts can be automatically promoted to `OFFICIAL` or `CURRENT_LEGAL_GEOMETRY`.**
- The candidate artifacts exhibit **identifier authority defects** (omission of statutory ECI `AC_NO` keys for Assembly Constituencies and omission of statutory MoPR `LGD` codes for Mandals and Districts).
- The candidate mandal layer contains **589 mandals**, leaving **23 recently notified statutory mandals missing**.
- Therefore, the candidate artifacts are classified strictly as **`UNVERIFIED_STATE_GIS_CANDIDATE`**.
- Database ingestion, Migration 044, and production deployment remain **STRICTLY PROHIBITED** pending CTO review.

---

## 2. Four-Authority Analysis Framework

In accordance with Section 3 of the directive, every candidate source was evaluated across four distinct institutional dimensions:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. LEGAL / STATUTORY AUTHORITY                                         │
│ - Electoral ACs: Delimitation Commission of India / ECI (Statutory).    │
│ - Mandals & Districts: Telangana Revenue Department (Statutory).       │
│ - TGRAC Status: Autonomous scientific body under Planning Department;  │
│                 lacks legislative authority to establish legal borders.│
├────────────────────────────────────────────────────────────────────────┤
│ 2. VECTOR / GEOMETRY AUTHORITY                                         │
│ - TGRAC Status: Official State Nodal Agency for remote sensing and GIS │
│                 mapping. Legitimate digitizing and compiling entity.   │
├────────────────────────────────────────────────────────────────────────┤
│ 3. IDENTIFIER AUTHORITY                                                │
│ - Electoral ACs: Statutory ECI AC numbers (1..119).                    │
│   --> TGRAC OMITTED AC_NO; uses non-standard English string names.     │
│ - Mandals & Districts: Ministry of Panchayati Raj LGD Codes.          │
│   --> TGRAC OMITTED LGD codes; uses internal serial numbers (s_no).    │
├────────────────────────────────────────────────────────────────────────┤
│ 4. PUBLICATION / DISTRIBUTION AUTHORITY                                │
│ - TGRAC Status: Publicly readable ArcGIS REST endpoints, but lacks     │
│                 formal Open Data license, gazette certification, or    │
│                 cryptographic SHA-256 release signatures.              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Sources Attempted & Acquisition Outcomes

| Source Organization | Portal URL | Target Tier | Plan | Acquisition Outcome | Technical Findings |
|---|---|---|---|---|---|
| **Election Commission of India (ECI)** | `https://eci.gov.in` | Assembly Constituencies | Plan A | `RESTRICTED / NO_DIRECT_DOWNLOAD` | Publishes static Web Atlas and interactive dashboards; direct vector shapefile/GeoJSON downloads are not offered publicly. |
| **CEO Telangana** | `https://ceotelangana.nic.in` | Assembly Constituencies | Plan B | `NO_VECTOR_DOWNLOADS` | Publishes PDF constituency maps and polling booth lists; raw GIS vector boundaries are absent from the web portal. |
| **Survey of India (SOI)** | `https://onlinemaps.surveyofindia.gov.in` | Districts & Mandals | Plan B | `ACCESS_RESTRICTED` | Provides Open Series Maps (OSM) as PDFs (1:50k); vector shapefiles require registered enterprise clearance or paid license. |
| **MoPR / Local Government Directory (LGD)** | `https://lgdirectory.gov.in` | Mandals | Plan B | `TABULAR_ONLY` | Authoritative tabular directory codes; sub-district vector polygon boundaries require authenticated government login. |
| **Telangana State Remote Sensing (TGRAC)** | `https://tgrac.telangana.gov.in/arcgis/rest/services` | All Tiers (AC, Dist, Mandal) | Plan A/B | **`CANDIDATE_ACQUIRED`** | Exposed queryable ArcGIS REST endpoints (`DistrictFormation` service) with complete polygon geometries in EPSG:4326. |

---

## 4. Artifacts Obtained & Cryptographic Evidence

All acquired candidate artifacts were downloaded directly from the official TGRAC GIS Server and preserved as untouched raw bytes in [`data/geo/candidate_authoritative/`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/data/geo/candidate_authoritative):

| Artifact Filename | Source Endpoint | Byte Size | SHA-256 Digest | Format & CRS | Features |
|---|---|---|---|---|---|
| [`tgrac_service_metadata.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/data/geo/candidate_authoritative/tgrac_service_metadata.json) | `/DistrictFormation/MapServer?f=json` | `3,474` | `47bd2f570c904d30f86aae2eabf757f09b115318f5d8a286ee24a4bc39486d52` | JSON / EPSG:4326 | Service Def |
| [`tgrac_districts_raw.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/data/geo/candidate_authoritative/tgrac_districts_raw.json) | `/DistrictFormation/MapServer/16/query` | `6,169,331` | `6a7a7bff40d088d725828462d20674948d63a7195c6d961d9232eec54ee20e33` | Esri JSON / EPSG:4326 | 33 Districts |
| [`tgrac_assembly_constituencies_raw.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/data/geo/candidate_authoritative/tgrac_assembly_constituencies_raw.json) | `/DistrictFormation/MapServer/14/query` | `12,466,256` | `72451e54f0a09c6c2357aeea3b42cc4f47a9e071cbc4086f512dd27839fdbdea` | Esri JSON / EPSG:4326 | 119 ACs |
| [`tgrac_mandals_raw.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/data/geo/candidate_authoritative/tgrac_mandals_raw.json) | `/DistrictFormation/MapServer/13/query` | `26,843,665` | `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db` | Esri JSON / EPSG:4326 | 589 Mandals |

---

## 5. Geometry Quality & Topological Audit

A static topological audit was executed on all three acquired vector candidate layers:

```
TGRAC Layer 16: District Boundaries
├── Feature Count: 33
├── Null Geometries: 0
├── Total Rings: 33 (1 exterior ring per district, 0 multipart fragments)
├── Total Coordinates: 155,237 vertices
└── Topology: Clean, non-self-intersecting polygons in EPSG:4326 geodetic degrees.

TGRAC Layer 14: Assembly Constituency Boundaries
├── Feature Count: 119
├── Null Geometries: 0
├── Total Rings: 123 (115 simple polygons, 4 multipart features e.g. Bhadrachalam ST)
├── Total Coordinates: 312,088 vertices
└── Topology: Clean rings, valid polygon structures in EPSG:4326 geodetic degrees.

TGRAC Layer 13: Mandal Boundaries
├── Feature Count: 589
├── Null Geometries: 0
├── Total Rings: 605 (573 simple polygons, 16 multipart enclaves/exclaves)
├── Total Coordinates: 669,821 vertices
└── Topology: Clean rings, valid polygon structures in EPSG:4326 geodetic degrees.
```

---

## 6. Identifier Reconciliation Audit

### 6.1 Assembly Constituencies (Priority A)
- **External Identifier Fields:** `ASSEMBLY_N`, `DNAME1`, `Parlament`, `Ass_Name`.
- **Material Defect:** The statutory Delimitation key **`AC_NO` is completely missing** from the TGRAC attribute table.
- **Match Results against Canonical `public.constituencies` (119 seats):**
  - **Direct Exact Matches (74 seats):** e.g. *Sirpur*, *Adilabad*, *Karimnagar*, *Nalgonda*, *Secunderabad*.
  - **Normalized Matches (3 seats):** *Nagarjunasagar* $\to$ *Nagarjuna Sagar*, *Nizamabad (Urban)* $\to$ *Nizamabad Urban*, *Nizamabad (Rural)* $\to$ *Nizamabad Rural*.
  - **Discrepant Names Requiring Mapping (42 seats):**
    - Suffixes appended in source: e.g. `Bellampalle (Sc)`, `Chennur (Sc)`, `Boath (St)`, `Khanapur (St)`, `Asifabad (St)`.
    - Transliteration differences: `Lal Bahadur Nagar` vs `LB Nagar`, `Secunderabad Cont (Sc)` vs `Secunderabad Cantt`, `Sirisilla` vs `Sircilla`, `Huzarabad` vs `Huzurabad`.
- **Classification:** **`MATCH_REQUIRES_DOCUMENTED_MAPPING`**.

### 6.2 Administrative Districts (Priority B)
- **External Identifier Fields:** `dist_name`, `state`, `Area`, demographic columns.
- **Material Defect:** Local Government Directory (LGD) district codes are absent.
- **Match Results against Canonical `public.districts` (33 districts):**
  - **Direct Exact Matches (28 districts):** e.g. *Adilabad*, *Bhadradri Kothagudem*, *Jagtial*, *Mulugu*, *Narayanpet*, *Mancherial*, *Khammam*, *Nalgonda*.
  - **Documented Mapping Matches (5 districts):**
    1. `Jangoan` $\to$ `Jangaon` (`TS-DIST-JANGAON`)
    2. `Warangal Rural` $\to$ `Warangal` (`TS-DIST-WARANGAL`) *(Statutory renaming under G.O.Ms. 153, Aug 2021)*
    3. `Warangal Urban` $\to$ `Hanamkonda` (`TS-DIST-HANAMKONDA`) *(Statutory renaming under G.O.Ms. 153, Aug 2021)*
    4. `Medchal Malkajgiri` $\to$ `Medchal-Malkajgiri` (`TS-DIST-MEDCHAL-MALKAJGIRI`)
    5. `Kumurambheem Asifabad` $\to$ `Kumuram Bheem Asifabad` (`TS-DIST-KUMURAM-BHEEM-ASIFABAD`)
- **Classification:** **`MATCH_BY_DOCUMENTED_MAPPING`**.

### 6.3 Administrative Mandals (Priority C — UNK-16-01)
- **External Identifier Fields:** `mandal_nam`, `s_no`, `dist_name`, `rev_div_na`.
- **Material Defects:**
  1. MoPR LGD Sub-District codes are **absent**; only an internal non-standard serial number `s_no` is present.
  2. Feature count is **589 mandals**. The statutory post-2016 baseline contains **594 mandals**, and the current statutory reality contains **612 mandals**.
  3. **23 statutory mandals are missing** from the TGRAC layer (notified between 2019 and 2023).
- **Classification:** **`DEFECTIVE_MISSING_LGD_KEYS_AND_TEMPORAL_COVERAGE`**.

---

## 7. Temporal Reconciliation & Statutory Regimes

The three candidate datasets represent distinct statutory temporal windows:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Assembly Constituencies (Layer 14):                                 │
│    Regime: 2008 ECI Delimitation Order (Active Electoral).             │
│    Temporal Divergence: Embeds pre-2016 10-district affiliations       │
│    (DNAME1: 'ADILABAD'), reflecting the 2008 gazette baseline.         │
├────────────────────────────────────────────────────────────────────────┤
│ 2. District Boundaries (Layer 16):                                     │
│    Regime: 2019–2021 Intermediate Statutory Regime.                    │
│    Temporal Divergence: Contains 33 districts (Mulugu & Narayanpet     │
│    created in 2019), but retains pre-August 2021 names 'Warangal Rural'│
│    and 'Warangal Urban' prior to G.O.Ms. 153.                          │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Mandal Boundaries (Layer 13):                                       │
│    Regime: 2016 Initial Post-Reorganisation Regime.                    │
│    Temporal Divergence: Captures the 589 mandals from G.O.Ms. 220–250  │
│    (October 2016); omits 23 subsequent bifurcations (2019–2023).       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 8. W012 Provenance & W013/W014/W015 Linkage

- **W012 Provenance Proposal:** If accepted by the CTO, these datasets would be registered under:
  - Source ID: `tgrac_gis_server`
  - Dataset ID: `ts_tgrac_admin_boundaries_v2016`
  - Classification: `UNVERIFIED_STATE_GIS_CANDIDATE`
- **W013 / W014 Entity Reconciliation:**
  - Districts: Reconciles cleanly to 33 rows in `public.districts` and `public.district_versions` using the 2021 renaming record.
  - Assembly Constituencies: Reconciles to 119 rows in `public.constituencies` using the 42-name disambiguation dictionary.
  - Mandals: Reconciles 589/612 mandals; leaves 23 mandals unrepresented in spatial vectors.
- **W015 Relational Primacy Invariant:**
  - All 12 pilot mandals in `public.mandals` (Sirpur T, Kagaznagar, Dahegaon, Asifabad, Chennur, Kotapalli, etc.) were cross-verified as present in the TGRAC candidate layer.
  - Spatial containment evaluation remains deferred until formal CTO authorization.

---

## 9. Status of UNK-16-01 (Mandal Geometry Blocker)

- **Prior Status (W016-B1 / W016-B2):** `OPEN / BLOCKED` (Zero mandal vector files in repository).
- **Current Status (W016-C1):** **`OPEN / BLOCKED`** *(Progressed from "No Artifact Found" to "Candidate Artifact Acquired, Blocked on Missing LGD Codes & 23 Statutory Mandals")*.
- **Technical Finding:** While a 589-mandal vector layer has been acquired from TGRAC, it cannot be deemed authoritative because it lacks LGD primary keys and fails to cover the full 612-mandal statutory territory.
- **Mandatory Statement:**
  > **`MANDAL_AUTHORITATIVE_GEOMETRY = UNKNOWN / BLOCKED`**

---

## 10. Plan A / Plan B / Plan C Final Results

```
PLAN A OUTCOME:
├── Assembly Constituencies: RESTRICTED (ECI GIS portal provides no public shapefile download API).
├── Districts: CANDIDATE ACQUIRED (TGRAC 33-district layer downloaded and preserved).
└── Mandals: CANDIDATE ACQUIRED / INCOMPLETE (TGRAC 589-mandal layer downloaded, missing 23 mandals).

PLAN B OUTCOME:
├── Assembly Constituencies: CANDIDATE ACQUIRED (TGRAC 119-AC layer downloaded, missing AC_NO).
├── Districts: RESTRICTED (Survey of India / Bhuvan require enterprise clearance/login).
└── Mandals: RESTRICTED (MoPR LGD vector downloads require authenticated state login).

PLAN C REQUIREMENT (User-Controlled Evidence Import Specification):
If the CTO requires cryptographically verified, legally authoritative vectors rather than
state GIS candidate layers, the following exact specification must be procured by the stakeholder:
```

### Plan C Import Specification for Stakeholder Requisition

1. **Assembly Constituencies:**
   - **Issuing Authority:** Election Commission of India (ECI) / Chief Electoral Officer, Telangana.
   - **Artifact Required:** Official Delimitation 2008 Telangana Assembly Shapefile / GeoJSON.
   - **Required Fields:** `AC_NO` (Integer 1..119 mandatory), `AC_NAME` (String), `STATE_CODE` (`'36'`).
   - **Projection:** EPSG:4326 (WGS 84).
   - **Documentation:** Accompanying Delimitation Gazette notification or CEO certification letter.
2. **Administrative Mandals:**
   - **Issuing Authority:** Chief Commissioner of Land Administration (CCLA) / Survey Settlement and Land Records (SSLR) / TRAC.
   - **Artifact Required:** Cadastral Revenue Mandal Boundary Shapefile covering all **612 statutory mandals**.
   - **Required Fields:** `LGD_CODE` (Integer mandatory), `MANDAL_NAME` (String), `DIST_LGD_CODE` (Integer).
   - **Projection:** EPSG:4326 (WGS 84).
   - **Documentation:** Cross-referencing Revenue Gazette notifications G.O.Ms. 220–250 (2016) and subsequent bifurcation orders up to 2023.

---

## 11. Acceptance Gate Verdict & Invariant Affirmation

In accordance with Section 15 of the directive:

| Gate Criterion | TGRAC AC Layer | TGRAC District Layer | TGRAC Mandal Layer | Acceptance Gate Verdict |
|---|---|---|---|---|
| A. Source Authority Evidenced | Partial (State GIS) | Yes (State GIS) | Yes (State GIS) | **CANDIDATE ONLY** |
| B. Artifact Provenance Logged | Yes (HTTP fetch log) | Yes (HTTP fetch log) | Yes (HTTP fetch log) | **VERIFIED** |
| C. Publication / Effective Semantics | Partial (2008 Delim.) | Yes (2019-2021) | Partial (2016 only) | **PARTIAL** |
| D. Identifier Authority Verified | **NO (Missing AC_NO)** | **NO (Missing LGD)** | **NO (Missing LGD)** | **FAIL / DEFECTIVE** |
| E. Geometry Integrity Verified | Yes (100% Valid) | Yes (100% Valid) | Yes (100% Valid) | **PASS** |
| F. Temporal Applicability Clear | Yes (Pre-2016 Dist) | Yes (Pre-2021 Name) | Partial (589 of 612) | **PARTIAL** |
| G. Canonical Reconciliation Feasible | Yes (Via Name Map) | Yes (Via Name Map) | Incomplete (Missing 23) | **CONDITIONAL** |
| H. Dataset Version Registered | Proposed | Proposed | Proposed | **PENDING CTO** |

**Final Classification:**
- `tgrac_assembly_constituencies_raw.json` $\to$ **`UNVERIFIED_STATE_GIS_CANDIDATE`**
- `tgrac_districts_raw.json` $\to$ **`UNVERIFIED_STATE_GIS_CANDIDATE`**
- `tgrac_mandals_raw.json` $\to$ **`UNVERIFIED_STATE_GIS_CANDIDATE`**

**None of these files are promoted to `OFFICIAL` or `CURRENT_LEGAL_GEOMETRY`.**

---

## 12. Four Mandatory Acceptance Invariants

1. > **"W016-C1 establishes candidate vector acquisition only; it does NOT establish authoritative geographic truth."**
2. > **"W016-C1 does NOT promote any geometry to OFFICIAL or CURRENT_LEGAL_GEOMETRY."**
3. > **"W016-C1 does NOT close UNK-16-01 (Mandal geometry remains UNKNOWN / BLOCKED pending LGD keys and 23 missing mandals)."**
4. > **"W016-C1 does NOT authorize database ingestion, Migration 044, or production deployment."**

---

## 13. Exact Coordinates & Sign-Off

- **Baseline Commit:** `4beb9a7cd4b6dbb0f1532085a5928fa9ec22378a`
- **Candidate Artifacts Directory:** [`data/geo/candidate_authoritative/`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/data/geo/candidate_authoritative)
- **Delivered Reports:**
  - [`docs/w016_c1_authoritative_geometry_acquisition.md`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/docs/w016_c1_authoritative_geometry_acquisition.md)
  - [`docs/w016_c1_authoritative_geometry_acquisition.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/docs/w016_c1_authoritative_geometry_acquisition.json)
- **Status:** **SUBMITTED FOR CTO REVIEW**
