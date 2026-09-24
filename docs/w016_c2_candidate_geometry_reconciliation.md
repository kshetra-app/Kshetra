# W016-C2: Candidate Geometry Authority, Completeness & Identifier Reconciliation

**Job Identifier:** W016-C2  
**Authority:** Independent CTO / Co-founder Directive  
**Date:** 2026-09-24  
**Authoritative Baseline Commit:** `46d4bcba381df1972608b3b5e7005f1f5169f736` (`46d4bcb`)  
**Target Environment:** Evidence & Documentation Only  
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
- W016-C1 ACQUISITION: ACCEPTED / COMPLETE
- W016-C2 RECONCILIATION: **SUBMITTED FOR CTO REVIEW**
- W016 DATABASE INGESTION: **STRICTLY NOT AUTHORIZED**
- PRODUCTION: **STRICTLY UNTOUCHED**

---

## 1. Executive Summary & Authoritative State

Job **W016-C2** executes an exhaustive evidence and reconciliation audit of the raw geospatial candidate artifacts acquired from the **Telangana State Remote Sensing Applications Centre (TGRAC / TRAC)** under Job W016-C1.

### Core Discoveries & Reconciled Verdicts
1. **Critical 589 vs. 612 Mandal Resolution:**  
   The TGRAC mandal dataset contains **589 mandals**. Historical and statutory gazette research demonstrates that this represents the **2016–2017 initial post-reorganisation baseline** (formalized during the initial 31-district reorganisation under G.O.Ms. 220–250). The statutory count subsequently expanded to **594** (2019–2021) and **612** (September 2022 / 2023). The **23 missing mandals** were carved out by subsequent government orders. Their land area is physically present in the TGRAC layer, but **aggregated inside parent mandal boundaries**. Therefore, TGRAC mandals represent a **historical snapshot**, not current legal truth.
2. **Assembly Constituencies (119 Features) — 100% Bijective Mapping:**  
   Although TGRAC Layer 14 omitted the statutory integer key `AC_NO`, an exact **1-to-1 bijection** was established across all 119 features to canonical `public.constituencies`:
   - **74** Direct Exact Matches
   - **3** Normalized Matches
   - **42** Documented Authority Mappings (addressing reservation suffixes like `(Sc)` / `(St)` and official ECI transliterations).
3. **Districts (33 Features) — 100% Bijective Mapping:**  
   All 33 features map bijectively to `public.districts`:
   - **28** Direct Exact Matches
   - **5** Documented Authority Mappings (accounting for `Jangaon`, `Medchal-Malkajgiri`, `Kumuram Bheem Asifabad`, and the August 2021 statutory renaming under **G.O.Ms. 153** of `Warangal Rural` $\to$ `Warangal` and `Warangal Urban` $\to$ `Hanamkonda`).
4. **Classification & Ingestion Invariants:**  
   - All TGRAC layers remain classified as **`UNVERIFIED_STATE_GIS_CANDIDATE`**.
   - No geometry was promoted to `OFFICIAL` or `CURRENT_LEGAL_GEOMETRY`.
   - Migration 044 and database ingestion remain **strictly prohibited**.

---

## 2. Raw Artifact Integrity Verification

The four acquired artifacts in [`data/geo/candidate_authoritative/`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/data/geo/candidate_authoritative) were verified against their original SHA-256 digests:

| Artifact Filename | Source Endpoint | Byte Size | SHA-256 Digest | Status |
|---|---|---|---|---|
| [`tgrac_service_metadata.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/data/geo/candidate_authoritative/tgrac_service_metadata.json) | `/DistrictFormation/MapServer?f=json` | `3,474` | `47bd2f570c904d30f86aae2eabf757f09b115318f5d8a286ee24a4bc39486d52` | **VERIFIED UNCHANGED** |
| [`tgrac_districts_raw.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/data/geo/candidate_authoritative/tgrac_districts_raw.json) | `/DistrictFormation/MapServer/16/query` | `6,169,331` | `6a7a7bff40d088d725828462d20674948d63a7195c6d961d9232eec54ee20e33` | **VERIFIED UNCHANGED** |
| [`tgrac_assembly_constituencies_raw.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/data/geo/candidate_authoritative/tgrac_assembly_constituencies_raw.json) | `/DistrictFormation/MapServer/14/query` | `12,466,256` | `72451e54f0a09c6c2357aeea3b42cc4f47a9e071cbc4086f512dd27839fdbdea` | **VERIFIED UNCHANGED** |
| [`tgrac_mandals_raw.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/data/geo/candidate_authoritative/tgrac_mandals_raw.json) | `/DistrictFormation/MapServer/13/query` | `26,843,665` | `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db` | **VERIFIED UNCHANGED** |

---

## 3. Critical 589 vs. 612 Mandal Reconciliation

### 3.1 Statutory Timeline of Telangana Mandals

An exhaustive analysis of Telangana administrative history clarifies why the TGRAC layer contains 589 mandals:

```
STATUTORY MANDAL COUNT EVOLUTION (2014–2023):
├── 2014 (State Formation): 459 Mandals across 10 Undivided Districts.
├── Oct 11, 2016 (Reorganisation): 584 Mandals created under G.O.Ms. 220–250 (31 Districts).
├── Late 2016–2017: 5 Mandals added/realigned, reaching 589 Mandals (TGRAC Baseline & T-Fiber Snapshot).
├── 2019–2021: 5 Mandals added alongside Mulugu/Narayanpet creation, reaching 594 Mandals.
├── Sep 26, 2022: 13 New Revenue Mandals notified by Revenue Dept, reaching 607 Mandals.
└── 2023: 5 Additional Mandals notified, reaching the current statutory total of 612 Mandals.
```

### 3.2 The Exact Set Difference: 23 Missing Mandals

The difference between statutory current reality (612) and TGRAC candidate geometry (589) is **23 revenue mandals**. An audit confirmed that none of these 23 exist as distinct polygon features in the TGRAC candidate layer:

| # | Missing Mandal Name | District | Notification Date | Parent Mandal(s) (Carved From) | Spatial Status in TGRAC 589 |
|---|---|---|---|---|---|
| **1** | **Endapalli** | Jagtial | Sep 26, 2022 | Velgatoor | Aggregated in Velgatoor polygon |
| **2** | **Bheemaram** | Jagtial | Sep 26, 2022 | Medapalli | Aggregated in Medapalli polygon |
| **3** | **Nizampet** | Sangareddy | Sep 26, 2022 | Narayankhed / Shankarampet | Aggregated in parent polygon |
| **4** | **Gattuppal** | Nalgonda | Sep 26, 2022 | Chandur / Munugode / Choutuppal | Aggregated in Chandur polygon |
| **5** | **Seerole** | Mahabubabad | Sep 26, 2022 | Kuravi / Mahabubabad | Aggregated in Kuravi polygon |
| **6** | **Inugurthy** | Mahabubabad | Sep 26, 2022 | Kesamudram | Aggregated in Kesamudram polygon |
| **7** | **Akbarpet-Bhoompally**| Siddipet | Sep 26, 2022 | Mirdoddi | Aggregated in Mirdoddi polygon |
| **8** | **Kukunoorpally** | Siddipet | Sep 26, 2022 | Kondapak | Aggregated in Kondapak polygon |
| **9** | **Dongli** | Kamareddy | Sep 26, 2022 | Madnoor | Aggregated in Madnoor polygon |
| **10**| **Koukuntla** | Mahabubnagar | Sep 26, 2022 | Devarakadra | Aggregated in Devarakadra polygon |
| **11**| **Aloor** | Nizamabad | Sep 26, 2022 | Armoor | Aggregated in Armoor polygon |
| **12**| **Donkeshwar** | Nizamabad | Sep 26, 2022 | Nandipet / Armoor | Aggregated in Nandipet polygon |
| **13**| **Saloora** | Nizamabad | Sep 26, 2022 | Bodhan | Aggregated in Bodhan polygon |
| **14**| **Gundumal** | Narayanpet | 2022–2023 | Kosgi / Maddur | Aggregated in Kosgi polygon |
| **15**| **Kothapalle** | Narayanpet | 2022–2023 | Maddur | Aggregated in Maddur polygon |
| **16**| **Dudyal** | Vikarabad | 2022–2023 | Bomraspet / Kodangal | Aggregated in Bomraspet polygon |
| **17**| **Masaipet** | Medak | 2020 (G.O. 110) | Yeldurthy / Chegunta | Aggregated in Yeldurthy polygon |
| **18**| **Sonala** | Adilabad | 2020–2022 | Boath | Aggregated in Boath polygon |
| **19**| **Kothapalligori** | Jayashankar Bhupalpally | 2021–2022 | Regonda | Aggregated in Regonda polygon |
| **20**| **Irwin** | Rangareddy | 2021–2022 | Madgul | Aggregated in Madgul polygon |
| **21**| **Bheemaram** | Mancherial | 2018–2020 | Jaipur | Aggregated in Jaipur polygon |
| **22**| **Adilabad Rural** | Adilabad | Post-2016 | Adilabad Urban | Aggregated in Adilabad polygon |
| **23**| **Nirmal Rural** | Nirmal | Post-2016 | Nirmal Urban | Aggregated in Nirmal polygon |

### 3.3 Architectural Conclusion on 589 Mandals
- The TGRAC 589-mandal layer is **historically authentic for the 2016–2017 regime**.
- It is **statutorily incomplete for the current (2023–present) 612-mandal regime**.
- It **cannot** be ingested as `CURRENT_LEGAL_GEOMETRY`. It can only qualify as a **`HISTORICAL_LEGAL_GEOMETRY`** snapshot (2016–2017 regime).

---

## 4. Assembly Constituencies: 119-Feature Complete Bijection

The TGRAC AC candidate layer contains 119 features with properties `ASSEMBLY_N`, `DNAME1`, `Parlament`, `Ass_Name`. It lacks the primary statutory identifier `AC_NO`.

### 4.1 Proof of 1-to-1 Bijection
An automated reconciliation script verified:
- Total Source Features: **119**
- Total Canonical ACs in `public.constituencies`: **119**
- Uniquely Mapped Canonical ACs: **119**
- Duplicate Canonical Assignments: **0**
- Missing Canonical Assignments: **0**
- Bijection Result: **TRUE (100% Complete & Invertible)**

### 4.2 Breakdown of Mapping Methods
- **`DIRECT_NAME_MATCH` (74 features):** Exact case-insensitive match on name (e.g. *Sirpur*, *Adilabad*, *Karimnagar*, *Nalgonda*, *Secunderabad*).
- **`NORMALIZED_NAME_MATCH` (3 features):**
  1. `Nagarjunasagar` $\to$ `Nagarjuna Sagar` (AC 87)
  2. `Nizamabad (Urban)` $\to$ `Nizamabad Urban` (AC 17)
  3. `Nizamabad (Rural)` $\to$ `Nizamabad Rural` (AC 18)
- **`DOCUMENTED_AUTHORITY_MAPPING` (42 features):**
  - **Reservation Suffix Discrepancies (31 features):** Source appends `(Sc)` or `(St)`, exactly matching canonical `reservation_status` (e.g. `Bellampalle (Sc)` $\to$ `Bellampalli`, `Chennur (Sc)` $\to$ `Chennur`, `Boath (St)` $\to$ `Boath`, `Wyra (St)` $\to$ `Wyra`, `Madhira (Sc)` $\to$ `Madhira`).
  - **Official Transliteration Discrepancies (11 features):**
    - `Lal Bahadur Nagar` $\to$ `L. B. Nagar` (AC 49)
    - `Secunderabad Cont (Sc)` $\to$ `Secunderabad Cantonment` (AC 71)
    - `Ghanpur (Station) (Sc)` $\to$ `Ghanpur Station` (AC 99)
    - `Sirisilla` $\to$ `Sircilla` (AC 29)
    - `Huzarabad` $\to$ `Huzurabad` (AC 31)
    - `Jagatial` $\to$ `Jagtial` (AC 21)
    - `Armoor` $\to$ `Armur` (AC 12)
    - `Kukatpalle` $\to$ `Kukatpally` (AC 46)
    - `Vikarabad (Sc)` $\to$ `Vicarabad` (AC 55)
    - `Waradhanapet (Sc)` $\to$ `Wardhannapet` (AC 102)
    - `Devarakdra` $\to$ `Devarkadra` (AC 76)

The complete feature-by-feature mapping is preserved in [`docs/w016_c2_ac_identifier_mapping.csv`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/docs/w016_c2_ac_identifier_mapping.csv).

---

## 5. District Reconciliation (33 Features)

All 33 features in `tgrac_districts_raw.json` map bijectively to `public.districts`:
- **Direct Name Matches (28 districts):** e.g. *Adilabad*, *Bhadradri Kothagudem*, *Jagtial*, *Mulugu*, *Narayanpet*, *Mancherial*, *Khammam*, *Nalgonda*, *Rangareddy*, *Hyderabad*.
- **Documented Authority Mappings (5 districts):**
  1. `Jangoan` $\to$ `Jangaon` (`TS-DIST-JANGAON`) — Spelling variation.
  2. `Medchal Malkajgiri` $\to$ `Medchal-Malkajgiri` (`TS-DIST-MEDCHAL-MALKAJGIRI`) — Hyphenation variation.
  3. `Kumurambheem Asifabad` $\to$ `Kumuram Bheem Asifabad` (`TS-DIST-KUMURAM-BHEEM-ASIFABAD`) — Space variation.
  4. `Warangal Rural` $\to$ `Warangal` (`TS-DIST-WARANGAL`) — **Statutory renaming under G.O.Ms. 153 dated 12.08.2021**.
  5. `Warangal Urban` $\to$ `Hanamkonda` (`TS-DIST-HANAMKONDA`) — **Statutory renaming under G.O.Ms. 153 dated 12.08.2021**.

The complete mapping is preserved in [`docs/w016_c2_district_identifier_mapping.csv`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/docs/w016_c2_district_identifier_mapping.csv).

---

## 6. Mandal Identifier Reconciliation & Pilot Verification

- **Total Features in TGRAC Mandal Layer:** 589
- **Identifier Attributes Present:** `s_no` (serial number), `mandal_nam` (name string), `dist_name`, `rev_div_na`.
- **Primary Statutory Key:** MoPR LGD Sub-District Code is **ABSENT**.
- **W015 Pilot Mandals Cross-Verification:**  
  All 12 pilot mandals currently in `public.mandals` were matched and cross-verified against the TGRAC mandal polygons:
  - `Sirpur (T)` $\to$ `Sirpur_T` (Kumuram Bheem Asifabad, LGD 4676)
  - `Kagaznagar` $\to$ `Kagaznagar` (Kumuram Bheem Asifabad, LGD 4655)
  - `Dahegaon` $\to$ `Dahegaon` (Kumuram Bheem Asifabad, LGD 4649)
  - `Tiryani` $\to$ `Tiryani` (Kumuram Bheem Asifabad, LGD 4679)
  - `Asifabad` $\to$ `Asifabad` (Kumuram Bheem Asifabad, LGD 4646)
  - `Luxettipet` $\to$ `Luxettipet` (Mancherial, LGD 4663)
  - `Mancherial` $\to$ `Mancherial` (Mancherial, LGD 4664)
  - `Dandepally` $\to$ `Dandepalle` (Mancherial, LGD 4650)
  - `Chennur` $\to$ `Chennur` (Mancherial, LGD 4648)
  - `Bellampalli` $\to$ `Bellampalle` (Mancherial, LGD 4647)
  - `Kotapalli` $\to$ `Kotapalle` (Mancherial, LGD 4660)
  - `Hajipur` $\to$ `Hajipur` (Mancherial, LGD 5949)

The complete 589-mandal reconciliation table is preserved in [`docs/w016_c2_mandal_identifier_mapping.csv`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/docs/w016_c2_mandal_identifier_mapping.csv).

---

## 7. W012 Provenance & W014 Temporal Design Models

### 7.1 Proposed W012 Lineage Model (Non-Circular)
```
SOURCE:          tgrac_gis_server (Telangana State Remote Sensing Applications Centre)
DATASET:         ts_tgrac_admin_boundaries
DATASET_VERSION: ts_tgrac_admin_2016_v1
ARTIFACTS:       tgrac_districts_raw.json (SHA-256: 6a7a7bff...)
                 tgrac_assembly_constituencies_raw.json (SHA-256: 72451e54...)
                 tgrac_mandals_raw.json (SHA-256: aca53eef...)
FEATURE:         Feature FID -> Target Canonical Row via documented mapping
CANONICAL:       public.constituencies, public.districts, public.mandals
```

### 7.2 Proposed W014 Temporal Regimes
- **Assembly Constituencies:** Attaches to `eci_delimitation_2008` (active electoral regime).
- **Districts:** Attaches to intermediate 2019–2021 regime, mapped forward to post-2021 statutory names.
- **Mandals:** Attaches strictly to `ts_revenue_regime_2016` as a **historical dataset version**; cannot attach to `is_current = true` because 23 mandals are unrepresented.

---

## 8. Final Decision Matrix

| Layer | Features | Temporal Regime | Authority Status | Identifier Coverage | Completeness | Provenance Complete | W014 Reconciled | W015 Compatible | Ingestion Eligibility | Blocker |
|---|---|---|---|---|---|---|---|---|---|---|
| **Assembly Constituencies** | 119 | Delimitation Order 2008 | `UNVERIFIED_STATE_GIS_CANDIDATE` | 119/119 (100% via Bijective Name Map) | 100% (119/119) | **YES** | **YES** | **YES** | **`CANDIDATE_WITH_EVIDENCE_GAPS`** | Lacks statutory `AC_NO`; requires CTO review of name map. |
| **Administrative Districts** | 33 | 2019–2021 Intermediate Regime | `UNVERIFIED_STATE_GIS_CANDIDATE` | 33/33 (100% via Documented Mapping) | 100% (33/33) | **YES** | **YES** | **YES** | **`CANDIDATE_WITH_EVIDENCE_GAPS`** | Lacks LGD codes; schema lacks column in `public.districts`. |
| **Administrative Mandals** | 589 | 2016 Post-Reorganisation Regime | `UNVERIFIED_STATE_GIS_CANDIDATE` | Missing LGD codes; internal serial number | Incomplete for Current (589/612) | **YES** | **NO (Historical Only)** | Partial (Pilot confirmed) | **`BLOCKED / HISTORICAL_DATASET_CANDIDATE`** | **`UNK-16-01`**: Incomplete temporal coverage (589 vs 612) and absent LGD codes. |

---

## 9. Critical Invariants & Ingestion Prohibition Affirmation

1. > **"W016-C2 establishes candidate reconciliation evidence only; it does NOT establish authoritative geographic truth."**
2. > **"W016-C2 does NOT promote TGRAC geometry to OFFICIAL or CURRENT_LEGAL_GEOMETRY."**
3. > **"W016-C2 does NOT close UNK-16-01 (Mandal geometry remains BLOCKED for current legal regime; qualified only as a 2016 historical snapshot)."**
4. > **"W016-C2 does NOT authorize database ingestion, Migration 044, or production deployment."**

---

## 10. Deliverables & Git Coordinates

- **Artifacts Generated:**
  - [`docs/w016_c2_candidate_geometry_reconciliation.md`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/docs/w016_c2_candidate_geometry_reconciliation.md)
  - [`docs/w016_c2_candidate_geometry_reconciliation.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/docs/w016_c2_candidate_geometry_reconciliation.json)
  - [`docs/w016_c2_ac_identifier_mapping.csv`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/docs/w016_c2_ac_identifier_mapping.csv)
  - [`docs/w016_c2_district_identifier_mapping.csv`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/docs/w016_c2_district_identifier_mapping.csv)
  - [`docs/w016_c2_mandal_identifier_mapping.csv`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/docs/w016_c2_mandal_identifier_mapping.csv)
- **Status:** **SUBMITTED FOR CTO REVIEW**
