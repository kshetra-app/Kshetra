# KSHETRA W021.5 — Historical Jurisdiction Lineage & Delimitation Modeling Report
**Directive:** CTO Directive 116  
**Governing Authority:** Master Execution Framework Amendment v1.6 / Rule IV-001  
**Generated At:** 2026-10-20T06:17:47.536Z  

## 1. Statutory Delimitation Regimes
The platform explicitly models statutory jurisdictions under temporal delimitations rather than flattening historical boundaries into an unversioned list:
| Regime ID | Title | Statutory Authority | Effective Date | Jurisdiction Scope |
|:---|:---|:---|:---:|:---|
| `ECI_2008` | Delimitation of Parliamentary and Assembly Constituencies Order, 2008 | Delimitation Commission of India / ECI | `2008-02-19` | 29 States and Union Territories (National Baseline) |
| `AP_2014` | Andhra Pradesh Reorganisation Act, 2014 (Act No. 6 of 2014) | Parliament of India | `2014-06-02` | Andhra Pradesh (175 ACs, 25 PCs) and Telangana (119 ACs, 17 PCs) |
| `JK_2022` | Delimitation Commission Final Order No. 2022/2 (Jammu & Kashmir) | Delimitation Commission of India (Justice Ranjana Prakash Desai) | `2022-05-20` | UT of Jammu & Kashmir (90 ACs, 5 PCs) and UT of Ladakh (1 PC) |
| `AS_2023` | Election Commission of India Delimitation Order No. 282/AS/2023 | Election Commission of India (under Section 8A of Representation of the People Act, 1950) | `2023-08-16` | State of Assam (126 ACs, 14 PCs) |

## 2. Assam 2023 Delimitation Modeling (Migration 062)
- **Gazette Date:** 2023-08-11 | **Effective Date:** 2023-08-16
- **Assembly Seats:** 126 (98 GEN, 9 SC, 19 ST)
- **Parliamentary Seats:** 14 (Table B allocations verified)
- **Temporal Invariant:** Assam entities evaluated at `2023-08-15` resolve strictly to the 2008 regime; entities evaluated at `2023-08-16` or later resolve strictly to `eci_delimitation_2023_as`.
- **Lineage Integrity:** Lineage relationships between 2008 and 2023 seats are maintained as `ASSAM_HISTORICAL_LINEAGE_PENDING` rather than fabricating 1:1 edges across reshaped boundaries.

## 3. Preservation of Constitutional Distinctions
The repository strictly preserves distinctions between:
1. Constitutional States & UTs (36)
2. Parliamentary Constituencies (543)
3. Legislative Assembly Constituencies (4,123)
4. Legislative Councils (6 States: AP, BR, KA, MH, TS, UP)
5. Council of States (Rajya Sabha: 245 seats)
6. Sub-district Local Governments (e.g. 589 Mandals in Telangana)

## 4. Verification Verdict
Task `W021.5-B1-03` is **REPO_VERIFIED (3.0% earned)**.
