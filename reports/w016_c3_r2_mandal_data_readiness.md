# W016-C3-R2: MANDAL STATUTORY IDENTITY & HISTORICAL-VERSION DATA READINESS REPORT

**Authority:** CTO Directive — `W016-C3-R2 — MANDAL STATUTORY IDENTITY & HISTORICAL-VERSION DATA READINESS (EXECUTE NOW)`  
**Execution Mode:** Pure Source-of-Truth Discovery & Forensic Data Readiness Reconciliation (Zero DDL, Zero DML, Zero Geometry Ingestion)  
**Database Target:** `panIN-staging` (`fkpigozcqnmcvofuksar`)  
**Production Status:** STRICTLY AIR-GAPPED & UNTOUCHED (0 queries, 0 connections)  
**Execution Timestamp:** `2026-09-26T07:55:00.000Z`  
**Hard Stop Condition Activated:** **`DATA SOURCE BLOCKER — CTO DECISION REQUIRED`**  
**Final Status:** **`DATA READINESS BLOCKED — AUTHORITATIVE SOURCE GAP`**

---

## 1. Executive Summary & Hard Stop Activation

Under CTO Directive `W016-C3-R2`, an exhaustive forensic investigation of repository artifacts, data files, W012 governance records, and live staging catalogs was conducted to establish the exact, non-fabricated data path required to populate:
1. Statutory `public.mandals` identities;
2. Corresponding W014 `public.mandal_versions` historical records for the `[2016-10-11, 2022-09-01)` snapshot; and
3. The W012 dataset and provenance linkages required by W014;

so that the accepted W016-C3 geometry architecture can eventually attach the 589 TGRAC candidate geometries to real W014 version IDs.

### Critical Determination & Hard Stop:
> [!CAUTION]
> **HARD STOP ACTIVATED: `DATA SOURCE BLOCKER — CTO DECISION REQUIRED`**  
> While the cartographic candidate geometries (589 features) exist in `data/geo/candidate_authoritative/tgrac_mandals_raw.json` and the conceptual 589-vs-612 divergence is fully reconciled, the repository **lacks an authoritative statewide statutory directory** for Telangana mandals.  
> 
> Specifically:
> 1. The repository's only MoPR Local Government Directory (LGD) artifact (`data/evidence/w015_b2/mopr_lgd_subdistrict_directory_ts.json`) contains only **12 subdistricts** (a pilot slice covering Kumuram Bheem Asifabad and Mancherial).
> 2. The W014 staging acceptance fixture `ts_lgd_mandals_staging_official_v1` in `dataset_versions` (with `record_count = 589`) is a testing fixture whose registered checksum points back to that same 12-mandal pilot JSON. It does **not** contain the 589 statutory entity master records.
> 3. The 589-feature TGRAC shapefile contains GIS feature IDs and English names, but **completely lacks statutory LGD subdistrict codes** (577 out of 589 mandals in `docs/w016_c2_mandal_identifier_mapping.csv` are marked `NOT_PRESENT_IN_SOURCE`).
> 
> In accordance with the CTO Directive ("Do not fill the gap with inference. Report: `DATA SOURCE BLOCKER — CTO DECISION REQUIRED`"), the implementing agent has **halted implementation** and presents the exact source acquisition requirements needed for CTO resolution.

---

## 2. Authoritative Source Inventory

A thorough audit of `data/`, `docs/`, `reports/`, and `supabase/` identified the following four mandal-related source artifacts:

| Source Artifact | Physical Location / Scope | Authority | Statutory Classification | Reality & Ingestion Usability |
| :--- | :--- | :--- | :--- | :--- |
| **1. TGRAC Candidate Geospatial Layer** | `data/geo/candidate_authoritative/tgrac_mandals_raw.json`<br>(26,843,665 bytes, SHA-256: `aca53eef...`) | Telangana State Remote Sensing Applications Centre (TGRAC / TRAC) | `UNVERIFIED_STATE_GIS_CANDIDATE` | **Cartographic Candidate Only.** Contains 589 polygon features with attributes `FID`, `s_no`, `mandal_nam`, `dist_name`, `rev_div_na`, and 2011 census demographic counts. **Lacks statutory integer LGD codes, Census 2011 subdistrict codes, and Telugu names.** Cannot establish statutory identity. |
| **2. MoPR LGD Pilot Directory** | `data/evidence/w015_b2/mopr_lgd_subdistrict_directory_ts.json`<br>(3,411 bytes, SHA-256: `7163cf29...`) | Ministry of Panchayati Raj (MoPR), Government of India | `OFFICIAL STATUTORY DIRECTORY (Pilot Slice)` | **Statutorily Authoritative but Geographically Incomplete.** Contains exactly 12 mandals across 2 districts (Kumuram Bheem Asifabad and Mancherial) with verified LGD codes and Census 2011 codes. Does not cover the remaining 577 mandals. |
| **3. W014 Staging Acceptance Fixture** | Registered in staging `dataset_versions` (`ts_lgd_mandals_staging_official_v1`) | Declared: MoPR | `STAGING ACCEPTANCE FIXTURE ONLY` | **Synthetic Test Fixture.** Created under W014 Step 2 to verify Option A trigger checks. Points to the 12-mandal pilot JSON checksum (`7163cf29...`). Does not contain physical rows for the 589 entities. |
| **4. Telangana State Gazettes** | Excerpts in `data/evidence/w015_b2/` (e.g. `telangana_gazette_2016_goms_222_mancherial.txt`) | Revenue (DA) Department, Government of Telangana | `STATUTORY ENACTMENT` | **Primary Legal Basis.** G.O.Ms. 220–250 (11.10.2016) established the 31-district reorganisation baseline. Full text for all 31 district gazettes is cited in documentation but not archived in repository. |

---

## 3. Statutory Authority Classification

To prevent data corruption, the project strictly distinguishes legal statutory authority from technical cartographic representation:

```
                            STATUTORY AUTHORITY PYRAMID
                            
              ▲  [CONSTITUTIONAL / STATUTORY LEGAL REGIME]
             / \  Government of Telangana, Revenue (DA) Dept (Gazettes)
            /   \ Ministry of Panchayati Raj, Gol (LGD Registry)
           /─────\ ──> Authoritative source for: statutory codes, names,
          /       \   parent districts, bifurcations, statutory validity.
         / CANDIDATE\
        /  GIS DATA  \ [STATE CARTOGRAPHIC AGENCY]
       /───────────────\ Telangana State Remote Sensing Applications Centre (TGRAC)
      /                 \ ──> Technical candidate source for: spatial boundaries,
     /───────────────────\   centroids, topological vertices, area estimates.
```

* **Statutory Authorities (Legal Baseline):**
  1. **Government of Telangana, Revenue Department:** Promulgates statutory district and mandal boundaries via Government Orders (G.O.Ms. 220–250 for 2016 reorganisation; subsequent G.O.Ms. for post-2016 creations).
  2. **Ministry of Panchayati Raj (MoPR), Government of India:** Maintains the Local Government Directory (LGD), assigning the statutory integer key (`lgd_code`) and canonical hierarchical relationships.
* **Cartographic Agencies (Spatial Representation):**
  * **TGRAC / TRAC:** Produces digital geospatial maps. Its layers represent technical cartographic approximations. **TGRAC has zero legal power to create, name, or code mandals.** Therefore, TGRAC attributes can NEVER be elevated into statutory master data without MoPR LGD verification.

---

## 4. 612 / 589 Reconciliation Matrix

The distinction between statutory reality and candidate geospatial coverage is documented below:

| Population | Meaning | Source | Statutory Status | Spatial Status in 589 Snapshot |
| :---: | :--- | :--- | :---: | :--- |
| **612** | Current Statutory Telangana Mandal Population (2023–present) | MoPR LGD & Telangana Revenue Gazettes | `STATUTORY_CURRENT` | Incomplete (23 mandals missing as distinct polygons) |
| **589** | Historical Mandal Geometry Snapshot (`[2016-10-11, 2022-09-01)`) | TGRAC MapServer Layer 13 | `UNVERIFIED_STATE_GIS_CANDIDATE` | Complete spatial coverage for 2016–2017 regime |
| **23** | Statutory Divergence (Post-2016 creations/bifurcations) | Statutory Gazettes (2018–2023) | `STATUTORY_POST_2016` | **Aggregated inside parent mandal polygons** |

### The Exact 23-Mandal Divergence Breakdown:

1. **2020 Bifurcation (1 Mandal):**
   * *Masaipet* (Medak) — G.O.Ms. 110 (2020), carved from *Yeldurthy* and *Chegunta*.
2. **September 26, 2022 Gazette Extraordinary (13 Mandals):**
   * *Endapalli* (Jagtial) — carved from *Velgatoor*
   * *Bheemaram* (Jagtial) — carved from *Medapalli*
   * *Nizampet* (Sangareddy) — carved from *Narayankhed* / *Shankarampet*
   * *Gattuppal* (Nalgonda) — carved from *Chandur* / *Munugode* / *Choutuppal*
   * *Seerole* (Mahabubabad) — carved from *Kuravi* / *Mahabubabad*
   * *Inugurthy* (Mahabubabad) — carved from *Kesamudram*
   * *Akbarpet-Bhoompally* (Siddipet) — carved from *Mirdoddi*
   * *Kukunoorpally* (Siddipet) — carved from *Kondapak*
   * *Dongli* (Kamareddy) — carved from *Madnoor*
   * *Koukuntla* (Mahabubnagar) — carved from *Devarakadra*
   * *Aloor* (Nizamabad) — carved from *Armoor*
   * *Donkeshwar* (Nizamabad) — carved from *Nandipet* / *Armoor*
   * *Saloora* (Nizamabad) — carved from *Bodhan*
3. **2018–2023 Additions / Rural Mandals (9 Mandals):**
   * *Gundumal* (Narayanpet) — carved from *Kosgi* / *Maddur*
   * *Kothapalle* (Narayanpet) — carved from *Maddur*
   * *Dudyal* (Vikarabad) — carved from *Bomraspet* / *Kodangal*
   * *Sonala* (Adilabad) — carved from *Boath*
   * *Kothapalligori* (Jayashankar Bhupalpally) — carved from *Regonda*
   * *Irwin* (Rangareddy) — carved from *Madgul*
   * *Bheemaram* (Mancherial) — carved from *Jaipur*
   * *Adilabad Rural* (Adilabad) — carved from *Adilabad Urban*
   * *Nirmal Rural* (Nirmal) — carved from *Nirmal Urban*

**Governance Rule:** Zero synthetic records will be fabricated for these 23 mandals during the 2016–2022 historical snapshot load. Their territory is physically represented inside the 589 parent polygons.

---

## 5. Historical Version Model Specification (W014 Target Schema)

To support the 589 historical mandals under W014, the following mapping specification is established for `public.mandal_versions`:

| Column | Type | Target Value / Rule | Source Availability |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` (Primary Key) | **AVAILABLE** (Database default) |
| `mandal_id` | `text` | Canonical Anchor FK (`TS-MDL-<lgd_code>`) | **BLOCKED** (LGD codes missing for 577 mandals) |
| `district_id` | `uuid` | FK to `public.districts(id)` matching 2016 district | **AVAILABLE** (Resolved via `tgrac_district` match) |
| `version_code` | `varchar(50)` | `TS-MDL-<lgd_code>-2016-V1` | **BLOCKED** (Requires `lgd_code`) |
| `name` | `text` | Statutory English Name | **AVAILABLE in TGRAC** (`mandal_nam`) |
| `name_te` | `text` | Statutory Telugu Name | **UNAVAILABLE** (Requires MoPR LGD extract) |
| `headquarters` | `text` | Mandal Headquarters town/village | **UNAVAILABLE** (Requires MoPR LGD extract) |
| `lgd_code` | `integer` | Statutory LGD subdistrict integer code | **BLOCKED** (Available for 12; missing for 577) |
| `census_code_2011` | `varchar(20)` | Census 2011 Subdistrict Code | **UNAVAILABLE** (Requires MoPR LGD / Census) |
| `valid_from` | `date` | `'2016-10-11'` (Statutory 31-district G.O.Ms. date) | **AVAILABLE** (Statutory constant) |
| `valid_to` | `date` | `'2022-09-01'` (Pre-2022 reorganization boundary) | **AVAILABLE** (Statutory constant) |
| `is_current` | `boolean` | `false` (Strictly historical interval) | **AVAILABLE** (Statutory constant) |
| `primary_dataset_version_id` | `text` | FK to W012 dataset (e.g. `ts_lgd_mandals_2016_v1`) | **BLOCKED** (Historical dataset version missing) |
| `metadata` | `jsonb` | Lineage, area, population, parentage | **PARTIAL** (TGRAC has demographics; lacks lineage) |

---

## 6. Split, Merge & Lineage Reconciliation

1. **Parent-Child Bifurcations:**
   * For the 2016–2022 period, the parent mandals (e.g. *Velgatoor*, *Medapalli*, *Chandur*, *Yeldurthy*) hold the historical version representing the larger territorial extent.
   * Child mandals created in 2020 or 2022 (e.g. *Endapalli*, *Masaipet*) **must NOT have any row in `mandal_versions` for `2016-10-11`**. Their version history strictly begins on their respective notification dates (`valid_from = '2020-01-01'` or `'2022-09-26'`).
2. **District Realignments (2019 Mulugu / Narayanpet & 2021 Warangal Renames):**
   * In the 2016 snapshot, mandals that later moved to Mulugu (from Jayashankar Bhupalpally) or Narayanpet (from Mahabubnagar) must point to their **2016 parent district** in `mandal_versions.district_id`.
   * Mandals in Warangal Rural and Warangal Urban point to those district IDs, which are preserved in `district_versions`.

---

## 7. W012 Governance Path & Required Artifacts

Under W012 data governance, any data loaded into `public.mandals` and `public.mandal_versions` must be backed by an immutable cryptographic evidence record.

### Current Governance Gap:
1. `ts_lgd_mandals_2023_v1` is `UNVERIFIED` and has `record_count = 12`.
2. `ts_lgd_mandals_staging_official_v1` is `OFFICIAL` with `record_count = 589`, but its underlying artifact is only the 12-mandal pilot JSON (`data/evidence/w015_b2/mopr_lgd_subdistrict_directory_ts.json`).
3. **No W012 dataset version exists for the 2016 historical baseline** (e.g. `ts_lgd_mandals_2016_v1`).

### Required Governance Pipeline:
```
1. ACQUIRE STATEWIDE LGD DATA
   lgdirectory.gov.in (State Code 36) -> data/evidence/w016/mopr_lgd_subdistrict_directory_ts_all.json
   
2. COMPUTE CRYPTOGRAPHIC CHECKSUM
   SHA-256 digest of mopr_lgd_subdistrict_directory_ts_all.json
   
3. REGISTER W012 EVIDENCE RECORD
   evidence_records (id, artifact_name, artifact_sha256, verification_authority = 'MoPR')
   
4. REGISTER W012 DATASET VERSION
   dataset_versions (id = 'ts_lgd_mandals_2016_v1', default_status = 'OFFICIAL' / 'UNVERIFIED', record_count = 589)
   
5. EXECUTE CONTROLLED POPULATION
   Insert into public.mandals and public.mandal_versions linking to ts_lgd_mandals_2016_v1
```

---

## 8. Live Staging Precheck (Read-Only)

Live database catalog inspection verified:
* `public.mandals`: Exactly 12 rows (Kumuram Bheem Asifabad & Mancherial).
* `public.mandal_versions`: Exactly 0 rows.
* W014 Triggers & Constraints: Active and enforced. Any insert with invalid FKs or unverified dataset versions will fail closed.
* Zero conflicting mandal records or duplicate codes detected.

---

## 9. Implementation Readiness Matrix

| # | Requirement | Result | Technical Evidence |
| :---: | :--- | :---: | :--- |
| **1** | Authoritative statutory mandal source identified | **FAIL** | Repository lacks statewide MoPR LGD subdistrict directory; only 12-mandal pilot slice exists. |
| **2** | Source authority established | **PASS** | MoPR (LGD) and Government of Telangana Revenue Dept established as legal authorities. |
| **3** | 589 historical population identified | **PASS** | Present in `data/geo/candidate_authoritative/tgrac_mandals_raw.json` (589 features, SHA-256 `aca53eef...`). |
| **4** | 589-vs-612 discrepancy reconciled | **PASS** | Reconciled in `docs/w016_c2_candidate_geometry_reconciliation.md`; all 23 missing mandals identified. |
| **5** | No fabricated 23 entities | **PASS** | Zero synthetic records created; 23 mandals documented as post-2016 bifurcations. |
| **6** | Historical identity mapping established | **FAIL** | 577 out of 589 mandals in `docs/w016_c2_mandal_identifier_mapping.csv` record `NOT_PRESENT_IN_SOURCE` for LGD code. |
| **7** | W014 version representation defined | **PASS** | `public.mandal_versions` table schema on staging verified with 16 columns and Option A temporal triggers. |
| **8** | 2016-10-11 $\to$ 2022-09-01 interval supported | **PASS** | Migration 044 partial GiST index (`uq_mandal_versions_historical_no_overlap`) accommodates closed-open historical intervals. |
| **9** | W012 dataset available | **FAIL** | No historical W012 dataset version exists in `dataset_versions` for the 2016 mandal baseline (e.g. `ts_lgd_mandals_2016_v1`). |
| **10** | W012 evidence available | **FAIL** | No statewide MoPR LGD subdistrict export or G.O.Ms. 220–250 statutory schedule is archived in `data/evidence/`. |
| **11** | W012 provenance path available | **PASS** | `dataset_versions`, `evidence_records`, and `provenance_records` infrastructure is live and verified on staging. |
| **12** | All required W014 fields source-supported | **FAIL** | TGRAC candidate layer lacks `lgd_code`, `name_te`, and `census_code_2011`; cannot populate `public.mandals` or `mandal_versions` without LGD. |
| **13** | Split/merge/lineage cases resolved | **PASS** | Conceptual model correctly attributes 2016 area to parent mandals; child bifurcations start on their post-2016 gazette dates. |
| **14** | Staging implementation can proceed safely | **FAIL** | Blockers `BLK-W016-DATA-01` and `BLK-W016-DATA-02` must be resolved before any DML data load can be authorized. |

---

## 10. Specific Technical Blockers & Remediation Roadmap

### Blocker Details:
1. **`BLK-W016-DATA-01` (Authoritative Source Gap):**  
   The repository contains only a 12-mandal pilot slice in `data/evidence/w015_b2/mopr_lgd_subdistrict_directory_ts.json`. The TGRAC candidate geospatial layer contains 589 features and English names, but completely lacks statutory integer LGD subdistrict codes. Without acquiring the complete statewide LGD directory from `lgdirectory.gov.in`, canonical mandal IDs (`TS-MDL-<lgd_code>`) cannot be generated without data fabrication or unverified inference.
2. **`BLK-W016-DATA-02` (W012 Governance Dataset Gap):**  
   There is currently no W012 dataset version in `public.dataset_versions` governing the 2016 post-reorganisation mandals (e.g. `ts_lgd_mandals_2016_v1`). The existing fixture `ts_lgd_mandals_staging_official_v1` has `effective_from = '2023-01-01'` and points to the 12-mandal pilot JSON. A dedicated W012 dataset version backed by an authoritative LGD/Gazette evidence artifact must be registered.

### Step-by-Step Remediation Roadmap for CTO Decision:
* **Step 1 (Acquisition):** Acquire the official MoPR LGD subdistrict directory export for all 612 mandals of Telangana from `lgdirectory.gov.in` (State Code 36).
* **Step 2 (Archival):** Archive the full export as `data/evidence/w016/mopr_lgd_subdistrict_directory_telangana_all.json` and compute its SHA-256 digest.
* **Step 3 (Reconciliation):** Run an automated deterministic join matching the 589 TGRAC features to the MoPR LGD records on `(district_name, normalized_mandal_name)` to assign statutory `lgd_code`, `name_te`, and `census_code_2011`.
* **Step 4 (Governance Registration):** Register the new W012 `evidence_record` and `dataset_version` (`ts_lgd_mandals_2016_v1`).
* **Step 5 (Controlled Ingestion):** Generate and apply a deterministic SQL migration populating the 589 mandals into `public.mandals` and their historical records into `public.mandal_versions` (`[2016-10-11, 2022-09-01)`).
* **Step 6 (Geometry Readiness):** Once Step 5 is complete, W016-C3 geometry ingestion can attach the 589 TGRAC polygons to live `mandal_versions.id` foreign keys with 100% relational integrity.

---

## 11. Mandatory Compliance Statements

1. **Zero Geometry Ingested:** Confirmed. No geometry records were created, modified, or ingested.
2. **Production Untouched & Air-Gapped:** Confirmed. Production environment `ehfafcnimmjusyvplbah` was not contacted, queried, or modified.
3. **Zero DDL/DML Executed:** Confirmed. No SQL mutations or migrations were executed.
4. **No Self-Acceptance:** Confirmed. This evidence report is submitted for CTO review and decision.

---

## 12. Final Status

$$\mathbf{DATA\ READINESS\ BLOCKED\ —\ AUTHORITATIVE\ SOURCE\ GAP}$$
