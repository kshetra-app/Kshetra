# KSHETRA W021.5 — NATIONAL DATA COVERAGE INVENTORY MATRIX

**Milestone:** W021.5 — National Political Intelligence and Candidate Transparency  
**Directive:** CTO Directive 085 / CTO Directive 086 / CTO Directive 087 / CTO Directive 088 / CTO Directive 089 / CTO Directive 090  
**Generated At:** `2026-10-17T13:45:59.276Z`  
**Total States/UTs Audited:** 31  
**Defect Classification:** `DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**  
**Governance Invariant:** Rule IV-001 — Non-Self-Acceptance  

---

## 1. Executive Summary

This matrix establishes the definitive, evidence-based national political data coverage inventory of the Kshetra platform across all 31 supported Indian states and Union Territories.

Under **CTO Directive 085 / 086 / 087 / 088** and **Rule IV-001 (Non-Self-Acceptance)**, this report repudiates unsupported completeness claims:
1. **Zero Canonical Full States:** No state is promoted to `CANONICAL_FULL` or `VERIFIED_PRODUCTION` merely because of allowlisted state codes or file existence. All records are classified truthfully as offline local seed fixtures pending live database verification.
2. **Multi-Dimensional Evidence:** Every state is audited across 7 distinct dimensions: Registry Identity, Electoral Results, Historical Coverage, Representative Profiles, Affidavits, Geospatial Boundaries, and Provenance.
3. **Delhi Statutory Invariant:** Strictly 70 statutory Assembly seats. 151 extra municipal/demographic records (`DL-AC-071` to `DL-AC-221`) are explicitly isolated as `NON_STATUTORY_DEMOGRAPHIC_PLACEHOLDER`.
4. **Historical Availability by Record Evidence:** Election years are derived solely from demonstrable per-constituency data records, not inferred from state codes or constants.
5. **Deduplicated Statutory Seat Accounting:** Duplicate constituency entries cannot inflate seeded seat counts or national totals. Numerator reflects unique, valid statutory AC identities.
6. **Strict GeoJSON Gate:** Coordinate range failures and geometry errors strictly invalidate `hasGeoJSON`. No boundary is deemed authoritative without live statutory database verification.
7. **Explicit Evidence Statuses:** Affidavits and profiles clearly distinguish presence in file, structural validity, identity validation, source provenance recording, and official verification.

### Platform Coverage Summary
- **Total Statutory Assembly Seats:** 4123
- **Total Unique Seeded Constituencies:** 4123 (100.0% seat identity coverage)
- **Total MLA Profiles Resolved to Statutory Seats:** 3812
- **Total Candidate Affidavits in Store:** 28
- **Total Duplicate Constituency Records:** 0
- **Total Malformed Constituency Records:** 0
- **Tier 0 (Canonical Full Production):** 0 states (Strictly 0; live DB and complete affidavits pending)
- **Tier 1 (Seeded Rich Local + GeoJSON + Historical + Sample Affidavits):** 0 states (TS GeoJSON clean mapping blocked by duplicate AC 119 features)
- **Tier 2 (Seeded Historical + Profiles, GeoJSON & Complete Affidavits Pending):** 8 states (TS, AP, KA, MH, TN, KL, WB, UP)
- **Tier 3 (Seeded Single-Term Constituencies + Profiles, Affidavits & Geo Pending):** 23 states/UTs

---

## 2. State-by-State Multi-Dimensional Coverage Inventory

| Code | State / UT | Statutory Seats | Seeded Seats (Ratio) | Primary Election | Historical Years | MLA Profiles (Ratio) | Affidavits (Ratio) | GeoJSON | Evidence Tier | Data Status |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **TS** | Telangana | 119 | 119/119 (100.0%) | 2023 | 2018, 2014 | 119/119 (100.0%) | 17/119 (14.3%) | — (0) | `SEEDED_HISTORICAL_NO_GEO` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **AP** | Andhra Pradesh | 175 | 175/175 (100.0%) | 2024 | 2019 | 172/175 (98.3%) | 2/175 (1.1%) | — (0) | `SEEDED_HISTORICAL_NO_GEO` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **KA** | Karnataka | 224 | 224/224 (100.0%) | 2023 | 2018 | 171/224 (76.3%) | 2/224 (0.9%) | — (0) | `SEEDED_HISTORICAL_NO_GEO` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **MH** | Maharashtra | 288 | 288/288 (100.0%) | 2024 | 2019 | 240/288 (83.3%) | 1/288 (0.3%) | — (0) | `SEEDED_HISTORICAL_NO_GEO` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **TN** | Tamil Nadu | 234 | 234/234 (100.0%) | 2021 | 2016 | 234/234 (100.0%) | 2/234 (0.9%) | — (0) | `SEEDED_HISTORICAL_NO_GEO` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **KL** | Kerala | 140 | 140/140 (100.0%) | 2021 | 2016 | 140/140 (100.0%) | 1/140 (0.7%) | — (0) | `SEEDED_HISTORICAL_NO_GEO` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **WB** | West Bengal | 294 | 294/294 (100.0%) | 2021 | 2016 | 294/294 (100.0%) | 1/294 (0.3%) | — (0) | `SEEDED_HISTORICAL_NO_GEO` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **UP** | Uttar Pradesh | 403 | 403/403 (100.0%) | 2022 | 2017 | 344/403 (85.4%) | 2/403 (0.5%) | — (0) | `SEEDED_HISTORICAL_NO_GEO` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **RJ** | Rajasthan | 200 | 200/200 (100.0%) | 2023 | None | 187/200 (93.5%) | 0/200 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **GJ** | Gujarat | 182 | 182/182 (100.0%) | 2022 | None | 169/182 (92.9%) | 0/182 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **JH** | Jharkhand | 81 | 81/81 (100.0%) | 2024 | None | 73/81 (90.1%) | 0/81 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **OD** | Odisha | 147 | 147/147 (100.0%) | 2024 | None | 132/147 (89.8%) | 0/147 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **DL** | Delhi | 70 | 70/70 (100.0%) | 2025 | None | 70/70 (100.0%) | 0/70 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **PB** | Punjab | 117 | 117/117 (100.0%) | 2022 | None | 111/117 (94.9%) | 0/117 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **HR** | Haryana | 90 | 90/90 (100.0%) | 2024 | None | 80/90 (88.9%) | 0/90 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **CG** | Chhattisgarh | 90 | 90/90 (100.0%) | 2023 | None | 81/90 (90.0%) | 0/90 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **MP** | Madhya Pradesh | 230 | 230/230 (100.0%) | 2023 | None | 208/230 (90.4%) | 0/230 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **BR** | Bihar | 243 | 243/243 (100.0%) | 2020 | None | 227/243 (93.4%) | 0/243 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **AS** | Assam | 126 | 126/126 (100.0%) | None | None | 112/126 (88.9%) | 0/126 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **GA** | Goa | 40 | 40/40 (100.0%) | 2022 | None | 34/40 (85.0%) | 0/40 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **HP** | Himachal Pradesh | 68 | 68/68 (100.0%) | 2022 | None | 68/68 (100.0%) | 0/68 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **MN** | Manipur | 60 | 60/60 (100.0%) | 2022 | None | 60/60 (100.0%) | 0/60 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **ML** | Meghalaya | 60 | 60/60 (100.0%) | 2023 | None | 60/60 (100.0%) | 0/60 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **MZ** | Mizoram | 40 | 40/40 (100.0%) | 2023 | None | 35/40 (87.5%) | 0/40 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **NL** | Nagaland | 60 | 60/60 (100.0%) | 2023 | None | 60/60 (100.0%) | 0/60 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **TR** | Tripura | 60 | 60/60 (100.0%) | 2023 | None | 60/60 (100.0%) | 0/60 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **SK** | Sikkim | 32 | 32/32 (100.0%) | 2024 | None | 31/32 (96.9%) | 0/32 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **AR** | Arunachal Pradesh | 60 | 60/60 (100.0%) | 2024 | None | 53/60 (88.3%) | 0/60 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **UK** | Uttarakhand | 70 | 70/70 (100.0%) | 2022 | None | 70/70 (100.0%) | 0/70 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **PY** | Puducherry | 30 | 30/30 (100.0%) | 2021 | None | 27/30 (90.0%) | 0/30 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |
| **JK** | Jammu & Kashmir | 90 | 90/90 (100.0%) | 2024 | None | 90/90 (100.0%) | 0/90 (0.0%) | — (0) | `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | `FUNCTIONAL_PARTIAL_OFFLINE` |

---

## 3. Detailed Dimensional Audit & State Gap Analysis

### Telangana (TS)
- **1. Registry / Identity:** 119/119 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 119/119 (100.0%) records present for 2023. Winner votes present: 119, missing: 0. Margin present: 119, missing: 0.
- **3. Historical Elections:** Primary 2023 + Demonstrable historical years: [2018, 2014]. (Total terms: 3). State historical file: Present.
- **4. Representatives / Profiles:** 119/119 (100.0%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 17/119 (14.3%) candidates in store. Present in file: 17, Structurally valid: 17, Identity validated: 0, Identity unresolved: 17, Source recorded: 17, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: telangana-assembly.geojson | Features: 120 | Clean Mapping: No | Coordinates Valid: Yes | Range Valid: Yes | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission + ADR / MyNeta candidate disclosures | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_HISTORICAL_NO_GEO` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Known Exceptions:**
  * Telangana GeoJSON has 120 features for 119 statutory seats due to raw shapefile bifurcation of AC 119 into multiple Polygon features instead of a single MultiPolygon. Clean constituency-to-feature mapping is blocked pending geometry consolidation.
- **Material Gaps:**
  * Candidate affidavits only partially available: 17/119 seats (14.3% coverage; 102 seats display Affidavit Pending notice)
  * Assembly boundary GeoJSON has 1 duplicate feature claim(s) for statutory AC(s): 119; clean constituency mapping blocked
  * Financial defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN pending CTO adjudication

### Andhra Pradesh (AP)
- **1. Registry / Identity:** 175/175 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 175/175 (100.0%) records present for 2024. Winner votes present: 175, missing: 0. Margin present: 175, missing: 0.
- **3. Historical Elections:** Primary 2024 + Demonstrable historical years: [2019]. (Total terms: 2). State historical file: Present.
- **4. Representatives / Profiles:** 172/175 (98.3%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 2/175 (1.1%) candidates in store. Present in file: 2, Structurally valid: 2, Identity validated: 0, Identity unresolved: 2, Source recorded: 2, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission + ADR / MyNeta candidate disclosures | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_HISTORICAL_NO_GEO` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate affidavits only partially available: 2/175 seats (1.1% coverage; 173 seats display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo

### Karnataka (KA)
- **1. Registry / Identity:** 224/224 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 224/224 (100.0%) records present for 2023. Winner votes present: 224, missing: 0. Margin present: 224, missing: 0.
- **3. Historical Elections:** Primary 2023 + Demonstrable historical years: [2018]. (Total terms: 2). State historical file: Present.
- **4. Representatives / Profiles:** 171/224 (76.3%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 44.
- **5. Affidavits:** 2/224 (0.9%) candidates in store. Present in file: 2, Structurally valid: 2, Identity validated: 0, Identity unresolved: 2, Source recorded: 2, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission + ADR / MyNeta candidate disclosures | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_HISTORICAL_NO_GEO` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate affidavits only partially available: 2/224 seats (0.9% coverage; 222 seats display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo

### Maharashtra (MH)
- **1. Registry / Identity:** 288/288 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 288/288 (100.0%) records present for 2024. Winner votes present: 288, missing: 0. Margin present: 288, missing: 0.
- **3. Historical Elections:** Primary 2024 + Demonstrable historical years: [2019]. (Total terms: 2). State historical file: Present.
- **4. Representatives / Profiles:** 240/288 (83.3%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 28.
- **5. Affidavits:** 1/288 (0.3%) candidates in store. Present in file: 1, Structurally valid: 1, Identity validated: 0, Identity unresolved: 1, Source recorded: 1, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission + ADR / MyNeta candidate disclosures | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_HISTORICAL_NO_GEO` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate affidavits only partially available: 1/288 seats (0.3% coverage; 287 seats display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo

### Tamil Nadu (TN)
- **1. Registry / Identity:** 234/234 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 234/234 (100.0%) records present for 2021. Winner votes present: 234, missing: 0. Margin present: 234, missing: 0.
- **3. Historical Elections:** Primary 2021 + Demonstrable historical years: [2016]. (Total terms: 2). State historical file: Present.
- **4. Representatives / Profiles:** 234/234 (100.0%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 2/234 (0.9%) candidates in store. Present in file: 2, Structurally valid: 2, Identity validated: 0, Identity unresolved: 2, Source recorded: 2, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission + ADR / MyNeta candidate disclosures | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_HISTORICAL_NO_GEO` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate affidavits only partially available: 2/234 seats (0.9% coverage; 232 seats display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo

### Kerala (KL)
- **1. Registry / Identity:** 140/140 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 140/140 (100.0%) records present for 2021. Winner votes present: 140, missing: 0. Margin present: 140, missing: 0.
- **3. Historical Elections:** Primary 2021 + Demonstrable historical years: [2016]. (Total terms: 2). State historical file: Present.
- **4. Representatives / Profiles:** 140/140 (100.0%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 1/140 (0.7%) candidates in store. Present in file: 1, Structurally valid: 1, Identity validated: 0, Identity unresolved: 1, Source recorded: 1, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission + ADR / MyNeta candidate disclosures | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_HISTORICAL_NO_GEO` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate affidavits only partially available: 1/140 seats (0.7% coverage; 139 seats display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo

### West Bengal (WB)
- **1. Registry / Identity:** 294/294 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 294/294 (100.0%) records present for 2021. Winner votes present: 294, missing: 0. Margin present: 294, missing: 0.
- **3. Historical Elections:** Primary 2021 + Demonstrable historical years: [2016]. (Total terms: 2). State historical file: Present.
- **4. Representatives / Profiles:** 294/294 (100.0%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 1/294 (0.3%) candidates in store. Present in file: 1, Structurally valid: 1, Identity validated: 0, Identity unresolved: 1, Source recorded: 1, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission + ADR / MyNeta candidate disclosures | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_HISTORICAL_NO_GEO` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate affidavits only partially available: 1/294 seats (0.3% coverage; 293 seats display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo

### Uttar Pradesh (UP)
- **1. Registry / Identity:** 403/403 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 403/403 (100.0%) records present for 2022. Winner votes present: 403, missing: 0. Margin present: 403, missing: 0.
- **3. Historical Elections:** Primary 2022 + Demonstrable historical years: [2017]. (Total terms: 2). State historical file: Present.
- **4. Representatives / Profiles:** 344/403 (85.4%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 13.
- **5. Affidavits:** 2/403 (0.5%) candidates in store. Present in file: 2, Structurally valid: 2, Identity validated: 0, Identity unresolved: 2, Source recorded: 2, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission + ADR / MyNeta candidate disclosures | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_HISTORICAL_NO_GEO` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate affidavits only partially available: 2/403 seats (0.5% coverage; 401 seats display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo

### Rajasthan (RJ)
- **1. Registry / Identity:** 200/200 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 200/200 (100.0%) records present for 2023. Winner votes present: 200, missing: 0. Margin present: 200, missing: 0.
- **3. Historical Elections:** Primary 2023 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 187/200 (93.5%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 0/200 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Gujarat (GJ)
- **1. Registry / Identity:** 182/182 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 182/182 (100.0%) records present for 2022. Winner votes present: 182, missing: 0. Margin present: 182, missing: 0.
- **3. Historical Elections:** Primary 2022 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 169/182 (92.9%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 0/182 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Jharkhand (JH)
- **1. Registry / Identity:** 81/81 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 81/81 (100.0%) records present for 2024. Winner votes present: 81, missing: 0. Margin present: 81, missing: 0.
- **3. Historical Elections:** Primary 2024 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 73/81 (90.1%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 0/81 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Odisha (OD)
- **1. Registry / Identity:** 147/147 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 147/147 (100.0%) records present for 2024. Winner votes present: 147, missing: 0. Margin present: 147, missing: 0.
- **3. Historical Elections:** Primary 2024 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 132/147 (89.8%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 0/147 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Delhi (DL)
- **1. Registry / Identity:** 70/70 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 70/70 (100.0%) records present for 2025. Winner votes present: 70, missing: 0. Margin present: 70, missing: 0.
- **3. Historical Elections:** Primary 2025 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 70/70 (100.0%) resolved to statutory assembly seats. Extra non-statutory: 151. Duplicates: 0.
- **5. Affidavits:** 0/70 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Known Exceptions:**
  * Delhi statutory Assembly is strictly 70 seats. Demographics file contains 151 extra non-assembly records (DL-AC-071 through DL-AC-221) classified as NON_STATUTORY_DEMOGRAPHIC_PLACEHOLDER
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Punjab (PB)
- **1. Registry / Identity:** 117/117 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 117/117 (100.0%) records present for 2022. Winner votes present: 117, missing: 0. Margin present: 117, missing: 0.
- **3. Historical Elections:** Primary 2022 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 111/117 (94.9%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 0/117 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Haryana (HR)
- **1. Registry / Identity:** 90/90 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 90/90 (100.0%) records present for 2024. Winner votes present: 90, missing: 0. Margin present: 90, missing: 0.
- **3. Historical Elections:** Primary 2024 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 80/90 (88.9%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 0/90 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Chhattisgarh (CG)
- **1. Registry / Identity:** 90/90 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 90/90 (100.0%) records present for 2023. Winner votes present: 90, missing: 0. Margin present: 90, missing: 0.
- **3. Historical Elections:** Primary 2023 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 81/90 (90.0%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 0/90 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Madhya Pradesh (MP)
- **1. Registry / Identity:** 230/230 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 230/230 (100.0%) records present for 2023. Winner votes present: 230, missing: 0. Margin present: 230, missing: 0.
- **3. Historical Elections:** Primary 2023 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 208/230 (90.4%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 0/230 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Bihar (BR)
- **1. Registry / Identity:** 243/243 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 243/243 (100.0%) records present for 2020. Winner votes present: 243, missing: 0. Margin present: 243, missing: 0.
- **3. Historical Elections:** Primary 2020 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 227/243 (93.4%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 0/243 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Assam (AS)
- **1. Registry / Identity:** 126/126 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 0/126 (0.0%) records present for None. Winner votes present: 0, missing: 126. Margin present: 0, missing: 126.
- **3. Historical Elections:** Primary None + Demonstrable historical years: [None]. (Total terms: 0). State historical file: Absent.
- **4. Representatives / Profiles:** 112/126 (88.9%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 0/126 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Goa (GA)
- **1. Registry / Identity:** 40/40 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 40/40 (100.0%) records present for 2022. Winner votes present: 40, missing: 0. Margin present: 40, missing: 0.
- **3. Historical Elections:** Primary 2022 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 34/40 (85.0%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 0/40 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Himachal Pradesh (HP)
- **1. Registry / Identity:** 68/68 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 68/68 (100.0%) records present for 2022. Winner votes present: 68, missing: 0. Margin present: 68, missing: 0.
- **3. Historical Elections:** Primary 2022 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 68/68 (100.0%) resolved to statutory assembly seats. Extra non-statutory: 2. Duplicates: 0.
- **5. Affidavits:** 0/68 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Manipur (MN)
- **1. Registry / Identity:** 60/60 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 60/60 (100.0%) records present for 2022. Winner votes present: 60, missing: 0. Margin present: 60, missing: 0.
- **3. Historical Elections:** Primary 2022 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 60/60 (100.0%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 0/60 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Meghalaya (ML)
- **1. Registry / Identity:** 60/60 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 60/60 (100.0%) records present for 2023. Winner votes present: 60, missing: 0. Margin present: 60, missing: 0.
- **3. Historical Elections:** Primary 2023 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 60/60 (100.0%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 0/60 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Mizoram (MZ)
- **1. Registry / Identity:** 40/40 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 40/40 (100.0%) records present for 2023. Winner votes present: 0, missing: 40. Margin present: 0, missing: 40.
- **3. Historical Elections:** Primary 2023 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 35/40 (87.5%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 0/40 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Nagaland (NL)
- **1. Registry / Identity:** 60/60 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 60/60 (100.0%) records present for 2023. Winner votes present: 60, missing: 0. Margin present: 60, missing: 0.
- **3. Historical Elections:** Primary 2023 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 60/60 (100.0%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 0/60 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Tripura (TR)
- **1. Registry / Identity:** 60/60 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 60/60 (100.0%) records present for 2023. Winner votes present: 60, missing: 0. Margin present: 60, missing: 0.
- **3. Historical Elections:** Primary 2023 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 60/60 (100.0%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 0/60 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Sikkim (SK)
- **1. Registry / Identity:** 32/32 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 32/32 (100.0%) records present for 2024. Winner votes present: 0, missing: 32. Margin present: 0, missing: 32.
- **3. Historical Elections:** Primary 2024 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 31/32 (96.9%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 0/32 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Arunachal Pradesh (AR)
- **1. Registry / Identity:** 60/60 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 60/60 (100.0%) records present for 2024. Winner votes present: 0, missing: 60. Margin present: 0, missing: 60.
- **3. Historical Elections:** Primary 2024 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 53/60 (88.3%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 0/60 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Uttarakhand (UK)
- **1. Registry / Identity:** 70/70 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 70/70 (100.0%) records present for 2022. Winner votes present: 70, missing: 0. Margin present: 70, missing: 0.
- **3. Historical Elections:** Primary 2022 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 70/70 (100.0%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 0/70 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Puducherry (PY)
- **1. Registry / Identity:** 30/30 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 30/30 (100.0%) records present for 2021. Winner votes present: 30, missing: 0. Margin present: 30, missing: 0.
- **3. Historical Elections:** Primary 2021 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 27/30 (90.0%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 0/30 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Jammu & Kashmir (JK)
- **1. Registry / Identity:** 90/90 (100.0%) statutory seats mapped. Status: `VERIFIED_STATUTORY_MATCH`. Missing ACs: None. Duplicate ACs: 0. Malformed: 0.
- **2. Electoral Results:** 90/90 (100.0%) records present for 2024. Winner votes present: 90, missing: 0. Margin present: 90, missing: 0.
- **3. Historical Elections:** Primary 2024 + Demonstrable historical years: [None]. (Total terms: 1). State historical file: Absent.
- **4. Representatives / Profiles:** 90/90 (100.0%) resolved to statutory assembly seats. Extra non-statutory: 0. Duplicates: 0.
- **5. Affidavits:** 0/90 (0.0%) candidates in store. Present in file: 0, Structurally valid: 0, Identity validated: 0, Identity unresolved: 0, Source recorded: 0, Officially verified: 0. Pending notice: Active.
- **6. Geospatial:** File: None | Features: 0 | Clean Mapping: No | Coordinates Valid: No | Range Valid: No | Linkage Valid: No.
- **7. Provenance & Verification:** Source: Election Commission of India (ECI) / State Election Commission | Status: `OFFLINE_LOCAL_FIXTURE` | Live DB Verified: `false`.
- **Evidence Tier:** `SEEDED_SINGLE_TERM_PENDING_GEO_HIST` | **Data Completeness Status:** `FUNCTIONAL_PARTIAL_OFFLINE`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

---

## 4. Non-Negotiable Governance & Lineage Rules

1. **Defect `DQ-W021.5-B2.2E-001` remains STRICTLY OPEN:** No financial disclosures have been altered or remediated without separate CTO adjudication.
2. **Rule IV-001 (Non-Self-Acceptance):** Submitted for independent review. A passing verification script does not constitute CTO acceptance.
3. **Delhi Assembly Boundary Invariant:** Delhi statutory seats are strictly 70. Extra records `DL-AC-071` through `DL-AC-221` are demographic/municipal non-assembly records preserved strictly as `NON_STATUTORY_DEMOGRAPHIC_PLACEHOLDER`.
4. **Zero Live Database Mutations:** This inventory was generated entirely through offline repository analysis without querying or mutating live production or staging databases.
5. **No Null Coercion:** Missing disclosures, missing vote margins, and unverified candidates are represented as `null` or Pending Disclosures, never fabricated as zero.
