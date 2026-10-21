# KSHETRA W021.5 — National Electoral Geography & Boundary Reproduction Report
**Directive:** CTO Directive 121 (Workstreams B, C, D, E, F)  
**Baseline Git Commit:** `0bc0a7ac651a06d8917c76a9c251710cd48bd2ae`  
**Baseline CI Run:** `39492301705`  
**Generated At:** 2026-10-21T00:04:31.741Z  
**Governing Authority:** Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance  
**Production Air-Gap:** `AIR_GAPPED_UNEXECUTED`  
**Formal CTO Acceptance:** Strictly `0.0% — PENDING INDEPENDENT ADJUDICATION`

---

## 1. Executive Summary & Verification Metrics

| Metric | Target | Actual Verified | Verification Evidence Tier | Status |
|:---|:---:|:---:|:---|:---:|
| Total Constitutional Jurisdictions | 36 | 36 | `STATUTORY_ELECTORAL_EVALUATED` | **VERIFIED** |
| Assembly Jurisdictions | 31 | 31 | `STATUTORY_ELECTORAL_EVALUATED` | **VERIFIED** |
| Non-Assembly UTs | 5 | 5 | `STATUTORY_ELECTORAL_EVALUATED` | **VERIFIED** |
| Statutory Assembly Constituencies | 4,123 | 4,123 | `STATIC_FILE_PARSING` & `DETERMINISTIC_TEST_VERIFIED` | **100% MATCH** |
| Migration 061 AC-to-PC Mappings | 4,123 | 4,123 | `LOGICAL_REFERENTIAL_VALIDATED` | **100% MATCH** |
| Parliamentary Constituencies (Assembly) | 537 | 537 | `LOGICAL_REFERENTIAL_VALIDATED` | **100% MATCH** |
| Parliamentary Constituencies (Non-Assembly UT) | 6 | 6 | `STATUTORY_ELECTORAL_EVALUATED` | **100% MATCH** |
| Total Statutory Parliamentary Constituencies | 543 | 543 | `STATUTORY_ELECTORAL_EVALUATED` | **100% MATCH** |
| Interstate Misallocations in Mappings | 0 | 0 | `LOGICAL_REFERENTIAL_VALIDATED` | **CLEAN (0)** |
| Seed Sequencing / Integrity Errors | 0 | 0 | `DETERMINISTIC_TEST_VERIFIED` | **CLEAN (0)** |
| Database Execution Status | Air-Gapped | 0 queries executed | `DATABASE_VERIFICATION_PENDING` | **AIR_GAPPED** |

---

## 2. Evidence Taxonomy & Verification Distinctions

To prevent conflating static repository artifacts with live database truth, all assertions are catalogued into 6 distinct evidence tiers:

1. **`STATIC_FILE_PARSING`**: Parsed from repository source code and seed files (`data/seed/*-constituencies.ts`). Proves that static definitions exist and contain the required tuples.
2. **`DETERMINISTIC_TEST_VERIFIED`**: Asserted by deterministic integration and unit test batteries (`tests/national-electoral-geography-invariants.test.mjs`, Jest suites) without external network dependencies.
3. **`LOGICAL_REFERENTIAL_VALIDATED`**: Referential, foreign-key, partition, and temporal interval consistency verified analytically across migrations (059, 060, 061, 062).
4. **`DATABASE_VERIFICATION_PENDING`**: State of actual database tables. Strictly `AIR_GAPPED_UNEXECUTED` under Directive 121. Migration 061 contains 4,123 tuples, but is not yet applied to staging or production databases.
5. **`STATUTORY_ELECTORAL_EVALUATED`**: Cross-referenced against gazetted constitutional schedules:
   - ECI Delimitation Order 2008 (Schedule XXXI)
   - Andhra Pradesh Reorganisation Act, 2014
   - Jammu and Kashmir Reorganisation (Delimitation) Order, 2022
   - ECI Assam Delimitation Order No. 282/AS/2023(DEL)/Vol.V
6. **`INDEPENDENT_ACCEPTANCE_PENDING`**: Under Rule IV-001, implementing agents cannot self-accept deliverables. Formal acceptance remains strictly **0.0%**.

---

## 3. Workstream B — Forensic Investigation of Telangana AC 119 Defect (DEF-W021-01)

### 3.1 Forensic Evidence Breakdown
- **Asset Inspected:** `data/geo/telangana-assembly.geojson`
- **Feature Index 118:** `FID: 4159`, `OBJECTID: 4184`, `AC_NO: 119`, `AC_NAME: 'Bhadrachalam (ST)'`, Coordinates: 2,139 points, BBox: [80.37–81.10 E, 17.73–18.63 N], Area: 0.1719 sq deg (Northern main body).
- **Feature Index 119:** `FID: 4160`, `OBJECTID: 4188`, `AC_NO: 119`, `AC_NAME: 'Bhadrachalam (ST)'`, Coordinates: 152 points, BBox: [80.88–80.91 E, 17.638–17.681 N], Area: 0.00071 sq deg (Southern detached revenue pocket).
- **Authoritative State GIS Comparison:** Inspected official Telangana Remote Sensing Applications Centre (TGRAC) dataset (`data/geo/candidate_authoritative/tgrac_assembly_constituencies_raw.json`). Feature Index 114 (`ASSEMBLY_N: 'Bhadrachalam (St)'`) contains **2 rings** in a single feature, with Ring 0 matching FID 4160 and Ring 1 matching FID 4159.

### 3.2 Root Cause Determination
The duplicate records are **NOT** conflicting versions or duplicate rows. They represent two disjoint geographic parts of a legitimate multi-part assembly constituency created by the Andhra Pradesh Reorganisation (Amendment) Act, 2014 (transfer of 7 Polavaram submergence mandals to AP, leaving Bhadrachalam town and non-contiguous revenue villages in Telangana).
The upstream community open-source Datameet shapefile export improperly dumped this multi-part polygon as two separate `Polygon` Features instead of a single `MultiPolygon` Feature, resulting in 120 features for 119 statutory seats.

### 3.3 Rule IV-001 Safe Handling & Governance Disposition
Under Rule IV-001 Non-Self-Acceptance:
- Arbitrary manual deletion of FID 4160 is **STRICTLY PROHIBITED** (it would discard statutory territory of Telangana).
- Arbitrary ad-hoc merging into a single feature in the canonical file is **STRICTLY PROHIBITED** without official CEO Telangana gazette confirmation.
- **Defect Status:** `DEF-W021-01` remains **`OPEN_AND_BLOCKED`**.
- **Safeguard Implemented:** Geographic capability fails closed: `hasCleanConstituencyMapping = false`, `hasGeoJSON = false`, `boundaryStatus = 'CONFLICT_PENDING'`, `activeDefects = ['DEF-W021-01']`.

---

## 4. Workstream C — Reusable 7-Tier National Geography Pipeline & 30-State Gap

### 4.1 7-Tier Validation Status Matrix Across 36 Jurisdictions
| Tier Level | Tier Name | Criteria | Qualifying Jurisdictions | Count |
|:---:|:---|:---|:---|:---:|
| **Tier 1** | `FILE_ABSENT` | No boundary file in `data/geo/` | AP, AR, AS, BR, CG, GA, GJ, HR, HP, JH, KA, KL, MP, MH, MN, ML, MZ, NL, OD, PB, RJ, SK, TN, TR, UP, UK, WB, DL, JK, PY | **30** |
| **Tier 2** | `FILE_PRESENT_MALFORMED` | Malformed JSON / unclosed rings | (None) | 0 |
| **Tier 3** | `GEOMETRY_STRUCTURALLY_VALID` | RFC 7946 valid, closed rings, India bbox | TS (Telangana) | **1** |
| **Tier 4** | `GEOMETRY_INCOMPLETE_OR_CONFLICTING` | Feature count != seats or duplicate AC | TS (AC 119 duplicate polygon) | **1** |
| **Tier 5** | `CONSTITUENCY_LINKED_PROVISIONAL` | 1:1 clean constituency mapping | (None) | 0 |
| **Tier 6** | `PROVENANCE_VERIFIED` | Official statutory digital signature | (None) | 0 |
| **Tier 7** | `AUTHORITATIVE_BOUNDARY_ACCEPTED` | Formally accepted for production | (None) | **0** |
| **N/A** | `STATUTORY_ZERO_ASSEMBLY_SEATS` | Non-assembly UTs | AN, CH, DH, LA, LD | **5** |

### 4.2 Candidate Boundary Assets Audit in `scripts/`
All 11 candidate files in `scripts/` were inspected and **REJECTED** from promotion to canonical `data/geo/`:
- `ARUNACHAL_PRADESH_ASSEMBLY.geojson`: 61 features vs 60 statutory seats (+1 discrepancy, unverified scrape).
- `jk-source.geojson`: 91 features vs 90 statutory seats (+1 discrepancy, pre-2022 delimitations).
- `SIKKIM_ASSEMBLY.geojson`: 38 features vs 32 statutory seats (+6 discrepancy).
- `sk-source.geojson`: 31 features vs 32 statutory seats (-1 discrepancy).
- All files fail Tier 6 (lack Survey of India / ECI digital signatures). Ingestion remains blocked under `DEF-W021-03`.

---

## 5. Workstream D — National AC & AC-to-PC Invariants Summary

- **National Assembly Registry:** 4,123 constituencies seeded across 31 state files in `data/seed/`.
- **Constituency Sequential Indexing:** Every state starts at AC 1 and proceeds sequentially to statutory seats count with zero gaps.
- **Migration 061 Mapping Tuples:** Exactly 4,123 tuples mapping every AC to its parent PC.
- **Parliamentary Totals:** Exactly 537 PCs in assembly states + 6 PCs in non-assembly UTs = 543 statutory PCs.
- **Interstate Allocations:** 0 interstate mismatches (100% of ACs map to PCs with matching state code).

---

## 6. Workstream E — Assam Delimitation Order 2023 & Pre-2023 Lineage (DEF-W021-02)

- **Governing Law:** Representation of the People Act 1950, Section 8A.
- **Gazette Order:** ECI Delimitation Order No. 282/AS/2023(DEL)/Vol.V dated 2023-08-11.
- **Effective Cutoff Date:** 2023-08-16.
- **Migration 062 Modeling:**
  - 126 new 2023 AC versions with `valid_from = '2023-08-16'`, `valid_to = NULL`, `is_current = true`.
  - 14 new 2023 PC versions with `valid_from = '2023-08-16'`, `valid_to = NULL`, `is_current = true`.
  - Pre-2023 2008 versions archived with `valid_to = '2023-08-16'`, `is_current = false`.
  - Statutory Reservations: 98 GEN, 9 SC, 19 ST.
- **Historical Predecessor-Successor Lineage:** Retained as open under `DEF-W021-02` (`ASSAM_HISTORICAL_LINEAGE_PENDING`) because statutory 1976 boundary vector data has not been digitized by ECI/CEO Assam.

---

## 7. Workstream F — National Architecture Integrity Remediation

- **PIN Code Directory Expansion:** Expanded `PIN_PREFIX_MAPPING` in `apps/api/src/services/delimitationService.ts` from 2 states (TS, AP) to all 8 national postal zones covering major urban centers and postal circles across all Indian States and UTs.
- **Elimination of Telangana Default Fallback:** Removed the hardcoded fallback `{ stateCode: 'TS', ... }` for unmapped PIN codes. Unmapped PIN codes now fail closed with HTTP 404 `PIN_NOT_FOUND`.
- **Error Propagation in Delimitation Route:** Hardened `apps/api/src/routes/delimitation.ts` to forward service error status codes and codes cleanly.
