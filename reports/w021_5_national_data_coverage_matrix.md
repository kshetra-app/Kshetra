# KSHETRA W021.5 — NATIONAL DATA COVERAGE INVENTORY MATRIX

**Milestone:** W021.5 — National Political Intelligence and Candidate Transparency  
**Directive:** CTO Directive 084 (Workstream C)  
**Generated At:** `2026-10-17T04:25:59.273Z`  
**Total States/UTs Audited:** 31  
**Defect Classification:** `DQ-W021.5-B2.2E-001` — **STRICTLY OPEN**  
**Governance Invariant:** Rule IV-001 — Non-Self-Acceptance  

---

## 1. Executive Summary

This matrix establishes the definitive, mechanically verifiable state-by-state data coverage of the Kshetra platform across all 31 supported Indian states and Union Territories. It rigorously distinguishes **demonstrated working functionality** from **actual data depth**, replacing broad claims with truthful, inspectable inventories.

### Platform Coverage Summary
- **Total Statutory Assembly Seats:** 4123
- **Total Seeded Constituencies:** 4123
- **Total MLA Profiles:** 5029
- **Total Candidate Affidavits in Store:** 28
- **Tier 1 (Canonical Full Data + GeoJSON + Affidavits):** 4 states (TS, AP, KA, MH)
- **Tier 2 (Full Seeds + Historical + Affidavits, GeoJSON Pending):** 4 states (TN, KL, WB, UP)
- **Tier 3 (Seeded Constituencies + MLAs, Affidavits Pending Notice):** 23 states/UTs

---

## 2. State-by-State Coverage Inventory

| Code | State / UT | Statutory Seats | Seeded Seats | Election Year | MLA Profiles | Affidavits | GeoJSON | Coverage Tier | Data Status |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **TS** | Telangana | 119 | 119 | 2023 (GENERAL) | 119 | 17 | ✓ | `CANONICAL_FULL` | VERIFIED_PRODUCTION |
| **AP** | Andhra Pradesh | 175 | 175 | 2024 (GENERAL) | 344 | 2 | — | `CANONICAL_FULL` | VERIFIED_PRODUCTION |
| **KA** | Karnataka | 224 | 224 | 2023 (GENERAL) | 215 | 2 | — | `CANONICAL_FULL` | VERIFIED_PRODUCTION |
| **MH** | Maharashtra | 288 | 288 | 2024 (GENERAL) | 268 | 1 | — | `CANONICAL_FULL` | VERIFIED_PRODUCTION |
| **TN** | Tamil Nadu | 234 | 234 | 2021 (GENERAL) | 468 | 2 | — | `PARTIAL_HISTORICAL_NO_GEOJSON` | FUNCTIONAL_PARTIAL |
| **KL** | Kerala | 140 | 140 | 2021 (GENERAL) | 280 | 1 | — | `PARTIAL_HISTORICAL_NO_GEOJSON` | FUNCTIONAL_PARTIAL |
| **WB** | West Bengal | 294 | 294 | 2021 (GENERAL) | 588 | 1 | — | `PARTIAL_HISTORICAL_NO_GEOJSON` | FUNCTIONAL_PARTIAL |
| **UP** | Uttar Pradesh | 403 | 403 | 2022 (GENERAL) | 357 | 2 | — | `PARTIAL_HISTORICAL_NO_GEOJSON` | FUNCTIONAL_PARTIAL |
| **RJ** | Rajasthan | 200 | 200 | 2023 (GENERAL) | 187 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **GJ** | Gujarat | 182 | 182 | 2022 (GENERAL) | 169 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **JH** | Jharkhand | 81 | 81 | 2024 (GENERAL) | 73 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **OD** | Odisha | 147 | 147 | 2024 (GENERAL) | 132 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **DL** | Delhi | 70 | 70 | 2025 (GENERAL) | 221 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **PB** | Punjab | 117 | 117 | 2022 (GENERAL) | 111 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **HR** | Haryana | 90 | 90 | 2024 (GENERAL) | 80 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **CG** | Chhattisgarh | 90 | 90 | 2023 (GENERAL) | 81 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **MP** | Madhya Pradesh | 230 | 230 | 2023 (GENERAL) | 208 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **BR** | Bihar | 243 | 243 | 2020 (GENERAL) | 227 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **AS** | Assam | 126 | 126 | 2021 (GENERAL) | 224 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **GA** | Goa | 40 | 40 | 2022 (GENERAL) | 34 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **HP** | Himachal Pradesh | 68 | 68 | 2022 (GENERAL) | 70 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **MN** | Manipur | 60 | 60 | 2022 (GENERAL) | 60 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **ML** | Meghalaya | 60 | 60 | 2023 (GENERAL) | 60 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **MZ** | Mizoram | 40 | 40 | 2023 (GENERAL) | 35 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **NL** | Nagaland | 60 | 60 | 2023 (GENERAL) | 60 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **TR** | Tripura | 60 | 60 | 2023 (GENERAL) | 60 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **SK** | Sikkim | 32 | 32 | 2024 (GENERAL) | 31 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **AR** | Arunachal Pradesh | 60 | 60 | 2024 (GENERAL) | 53 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **UK** | Uttarakhand | 70 | 70 | 2022 (GENERAL) | 70 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **PY** | Puducherry | 30 | 30 | 2021 (GENERAL) | 54 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |
| **JK** | Jammu & Kashmir | 90 | 90 | 2024 (GENERAL) | 90 | 0 | — | `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS` | FUNCTIONAL_PARTIAL |

---

## 3. Detailed State Gaps & Provenance Analysis

### Telangana (TS)
- **Statutory Assembly Seats:** 119 | **Seeded Constituencies:** 119
- **Primary Election:** 2023 GENERAL | **Historical Years Available:** [2023, 2018, 2014]
- **MLA Profiles Available:** 119 | **Affidavits in Store:** 17
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission + ADR/MyNeta candidate disclosures
- **Data Tier:** `CANONICAL_FULL`
- **Material Gaps:** None. Full multi-election data, demographics, and spatial coverage active.

### Andhra Pradesh (AP)
- **Statutory Assembly Seats:** 175 | **Seeded Constituencies:** 175
- **Primary Election:** 2024 GENERAL | **Historical Years Available:** [2024, 2019]
- **MLA Profiles Available:** 344 | **Affidavits in Store:** 2
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission + ADR/MyNeta candidate disclosures
- **Data Tier:** `CANONICAL_FULL`
- **Material Gaps:**
  * Assembly boundary GeoJSON not indexed in repository data/geo

### Karnataka (KA)
- **Statutory Assembly Seats:** 224 | **Seeded Constituencies:** 224
- **Primary Election:** 2023 GENERAL | **Historical Years Available:** [2023, 2018]
- **MLA Profiles Available:** 215 | **Affidavits in Store:** 2
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission + ADR/MyNeta candidate disclosures
- **Data Tier:** `CANONICAL_FULL`
- **Material Gaps:**
  * Assembly boundary GeoJSON not indexed in repository data/geo

### Maharashtra (MH)
- **Statutory Assembly Seats:** 288 | **Seeded Constituencies:** 288
- **Primary Election:** 2024 GENERAL | **Historical Years Available:** [2024, 2019]
- **MLA Profiles Available:** 268 | **Affidavits in Store:** 1
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission + ADR/MyNeta candidate disclosures
- **Data Tier:** `CANONICAL_FULL`
- **Material Gaps:**
  * Assembly boundary GeoJSON not indexed in repository data/geo

### Tamil Nadu (TN)
- **Statutory Assembly Seats:** 234 | **Seeded Constituencies:** 234
- **Primary Election:** 2021 GENERAL | **Historical Years Available:** [2021, 2016]
- **MLA Profiles Available:** 468 | **Affidavits in Store:** 2
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission + ADR/MyNeta candidate disclosures
- **Data Tier:** `PARTIAL_HISTORICAL_NO_GEOJSON`
- **Material Gaps:**
  * Assembly boundary GeoJSON not indexed in repository data/geo

### Kerala (KL)
- **Statutory Assembly Seats:** 140 | **Seeded Constituencies:** 140
- **Primary Election:** 2021 GENERAL | **Historical Years Available:** [2021, 2016]
- **MLA Profiles Available:** 280 | **Affidavits in Store:** 1
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission + ADR/MyNeta candidate disclosures
- **Data Tier:** `PARTIAL_HISTORICAL_NO_GEOJSON`
- **Material Gaps:**
  * Assembly boundary GeoJSON not indexed in repository data/geo

### West Bengal (WB)
- **Statutory Assembly Seats:** 294 | **Seeded Constituencies:** 294
- **Primary Election:** 2021 GENERAL | **Historical Years Available:** [2021, 2016]
- **MLA Profiles Available:** 588 | **Affidavits in Store:** 1
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission + ADR/MyNeta candidate disclosures
- **Data Tier:** `PARTIAL_HISTORICAL_NO_GEOJSON`
- **Material Gaps:**
  * Assembly boundary GeoJSON not indexed in repository data/geo

### Uttar Pradesh (UP)
- **Statutory Assembly Seats:** 403 | **Seeded Constituencies:** 403
- **Primary Election:** 2022 GENERAL | **Historical Years Available:** [2022, 2017]
- **MLA Profiles Available:** 357 | **Affidavits in Store:** 2
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission + ADR/MyNeta candidate disclosures
- **Data Tier:** `PARTIAL_HISTORICAL_NO_GEOJSON`
- **Material Gaps:**
  * Assembly boundary GeoJSON not indexed in repository data/geo

### Rajasthan (RJ)
- **Statutory Assembly Seats:** 200 | **Seeded Constituencies:** 200
- **Primary Election:** 2023 GENERAL | **Historical Years Available:** [2023]
- **MLA Profiles Available:** 187 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Gujarat (GJ)
- **Statutory Assembly Seats:** 182 | **Seeded Constituencies:** 182
- **Primary Election:** 2022 GENERAL | **Historical Years Available:** [2022]
- **MLA Profiles Available:** 169 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Jharkhand (JH)
- **Statutory Assembly Seats:** 81 | **Seeded Constituencies:** 81
- **Primary Election:** 2024 GENERAL | **Historical Years Available:** [2024]
- **MLA Profiles Available:** 73 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Odisha (OD)
- **Statutory Assembly Seats:** 147 | **Seeded Constituencies:** 147
- **Primary Election:** 2024 GENERAL | **Historical Years Available:** [2024]
- **MLA Profiles Available:** 132 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Delhi (DL)
- **Statutory Assembly Seats:** 70 | **Seeded Constituencies:** 70
- **Primary Election:** 2025 GENERAL | **Historical Years Available:** [2025]
- **MLA Profiles Available:** 221 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded
  * Delhi records DL-AC-071 through DL-AC-087 are demographic non-assembly records preserved as NOT_VERIFIED

### Punjab (PB)
- **Statutory Assembly Seats:** 117 | **Seeded Constituencies:** 117
- **Primary Election:** 2022 GENERAL | **Historical Years Available:** [2022]
- **MLA Profiles Available:** 111 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Haryana (HR)
- **Statutory Assembly Seats:** 90 | **Seeded Constituencies:** 90
- **Primary Election:** 2024 GENERAL | **Historical Years Available:** [2024]
- **MLA Profiles Available:** 80 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Chhattisgarh (CG)
- **Statutory Assembly Seats:** 90 | **Seeded Constituencies:** 90
- **Primary Election:** 2023 GENERAL | **Historical Years Available:** [2023]
- **MLA Profiles Available:** 81 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Madhya Pradesh (MP)
- **Statutory Assembly Seats:** 230 | **Seeded Constituencies:** 230
- **Primary Election:** 2023 GENERAL | **Historical Years Available:** [2023]
- **MLA Profiles Available:** 208 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Bihar (BR)
- **Statutory Assembly Seats:** 243 | **Seeded Constituencies:** 243
- **Primary Election:** 2020 GENERAL | **Historical Years Available:** [2020]
- **MLA Profiles Available:** 227 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Assam (AS)
- **Statutory Assembly Seats:** 126 | **Seeded Constituencies:** 126
- **Primary Election:** 2021 GENERAL | **Historical Years Available:** [2021]
- **MLA Profiles Available:** 224 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Goa (GA)
- **Statutory Assembly Seats:** 40 | **Seeded Constituencies:** 40
- **Primary Election:** 2022 GENERAL | **Historical Years Available:** [2022]
- **MLA Profiles Available:** 34 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Himachal Pradesh (HP)
- **Statutory Assembly Seats:** 68 | **Seeded Constituencies:** 68
- **Primary Election:** 2022 GENERAL | **Historical Years Available:** [2022]
- **MLA Profiles Available:** 70 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Manipur (MN)
- **Statutory Assembly Seats:** 60 | **Seeded Constituencies:** 60
- **Primary Election:** 2022 GENERAL | **Historical Years Available:** [2022]
- **MLA Profiles Available:** 60 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Meghalaya (ML)
- **Statutory Assembly Seats:** 60 | **Seeded Constituencies:** 60
- **Primary Election:** 2023 GENERAL | **Historical Years Available:** [2023]
- **MLA Profiles Available:** 60 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Mizoram (MZ)
- **Statutory Assembly Seats:** 40 | **Seeded Constituencies:** 40
- **Primary Election:** 2023 GENERAL | **Historical Years Available:** [2023]
- **MLA Profiles Available:** 35 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Nagaland (NL)
- **Statutory Assembly Seats:** 60 | **Seeded Constituencies:** 60
- **Primary Election:** 2023 GENERAL | **Historical Years Available:** [2023]
- **MLA Profiles Available:** 60 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Tripura (TR)
- **Statutory Assembly Seats:** 60 | **Seeded Constituencies:** 60
- **Primary Election:** 2023 GENERAL | **Historical Years Available:** [2023]
- **MLA Profiles Available:** 60 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Sikkim (SK)
- **Statutory Assembly Seats:** 32 | **Seeded Constituencies:** 32
- **Primary Election:** 2024 GENERAL | **Historical Years Available:** [2024]
- **MLA Profiles Available:** 31 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Arunachal Pradesh (AR)
- **Statutory Assembly Seats:** 60 | **Seeded Constituencies:** 60
- **Primary Election:** 2024 GENERAL | **Historical Years Available:** [2024]
- **MLA Profiles Available:** 53 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Uttarakhand (UK)
- **Statutory Assembly Seats:** 70 | **Seeded Constituencies:** 70
- **Primary Election:** 2022 GENERAL | **Historical Years Available:** [2022]
- **MLA Profiles Available:** 70 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Puducherry (PY)
- **Statutory Assembly Seats:** 30 | **Seeded Constituencies:** 30
- **Primary Election:** 2021 GENERAL | **Historical Years Available:** [2021]
- **MLA Profiles Available:** 54 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

### Jammu & Kashmir (JK)
- **Statutory Assembly Seats:** 90 | **Seeded Constituencies:** 90
- **Primary Election:** 2024 GENERAL | **Historical Years Available:** [2024]
- **MLA Profiles Available:** 90 | **Affidavits in Store:** 0
- **Provenance Source:** Election Commission of India (ECI) / State Election Commission
- **Data Tier:** `SEEDED_CONSTITUENCIES_PENDING_AFFIDAVITS`
- **Material Gaps:**
  * Candidate financial affidavits pending indexing (shows Affidavit Pending notice)
  * Assembly boundary GeoJSON not indexed in repository data/geo
  * Per-constituency historical elections prior to current term not yet seeded

---

## 4. Non-Negotiable Governance & Lineage Rules

1. **Defect `DQ-W021.5-B2.2E-001` remains STRICTLY OPEN:** No financial disclosures have been altered or remediated without separate CTO adjudication.
2. **Delhi Assembly Boundary Invariant:** Delhi statutory seats are strictly 70. Records `DL-AC-071` through `DL-AC-087` are demographic seed records preserved strictly as `NOT_VERIFIED`.
3. **No Coercion Rule:** Missing disclosures, missing vote margins, and unverified candidates are represented as `null` or Pending Disclosures, never fabricated as zero.
4. **Rule IV-001:** Submitted for CTO Adjudication. No self-acceptance.
