# KSHETRA W021.5 — Stage B National Jurisdiction & Geometry Inventory
**Directive:** CTO Directive 116  
**Governance:** Master Execution Framework Amendment v1.6 / Rule IV-001  
**Generated At:** 2026-10-28T17:01:43.367Z  

## 1. Executive Summary
- **Total Constitutional Jurisdictions:** 36 (28 States, 8 Union Territories)
- **Assembly Jurisdictions:** 31 (28 States + Delhi, Puducherry, Jammu & Kashmir)
- **Non-Assembly Union Territories:** 5 (A&N Islands, Chandigarh, DNH & DD, Ladakh, Lakshadweep)
- **Total Statutory Assembly Seats:** 4,123
- **Total Statutory Parliamentary Seats:** 543
- **Total PostGIS Verified Geometry Rows:** 589 (Telangana 2016 baseline mandals, strictly frozen)
- **Total PostGIS Assembly Geometry Rows:** 0 (Air-gapped; unexecuted in staging/production)
- **Authoritative Flat GeoJSON Assets:** 1 (Telangana, 120 features for 119 seats, AC 119 defect detected)
- **Missing State Assembly Boundaries:** 30 States/UTs (Blocked on external authoritative GIS feeds)

## 2. PostGIS 589 Geometry Baseline Reconciliation
The prior audit reports 4,123 Assembly Constituencies, 543 Parliamentary Constituencies, and 589 PostGIS geometry rows.
- **Root Cause of 589 Row Count:** The 589 rows in `entity_geometries` belong to **Mandal baseline boundaries** established under Telangana statutory reorganisation orders G.O.Ms. Nos. 214-245 Rev (2016-10-11) in Migration 045.
- **Assembly & Parliamentary Geometries:** Exactly 0 rows exist in PostGIS for national ACs and PCs.
- **Integrity Digest:** SHA-256 digest `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` remains strictly frozen and unmutated under Migration 055.

## 3. Statutory Jurisdiction Register
| Code | Jurisdiction Name | Type | Statutory ACs | Statutory PCs | Active Regime | Seed Present | GeoJSON Present |
|:---|:---|:---|:---:|:---:|:---|:---:|:---:|
| `AP` | Andhra Pradesh | STATE | 175 | 25 | `AP_2014` | YES (100%) | NO (Blocked) |
| `AR` | Arunachal Pradesh | STATE | 60 | 2 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `AS` | Assam | STATE | 126 | 14 | `AS_2023` | YES (100%) | NO (Blocked) |
| `BR` | Bihar | STATE | 243 | 40 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `CG` | Chhattisgarh | STATE | 90 | 11 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `GA` | Goa | STATE | 40 | 2 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `GJ` | Gujarat | STATE | 182 | 26 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `HR` | Haryana | STATE | 90 | 10 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `HP` | Himachal Pradesh | STATE | 68 | 4 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `JH` | Jharkhand | STATE | 81 | 14 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `KA` | Karnataka | STATE | 224 | 28 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `KL` | Kerala | STATE | 140 | 20 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `MP` | Madhya Pradesh | STATE | 230 | 29 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `MH` | Maharashtra | STATE | 288 | 48 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `MN` | Manipur | STATE | 60 | 2 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `ML` | Meghalaya | STATE | 60 | 2 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `MZ` | Mizoram | STATE | 40 | 1 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `NL` | Nagaland | STATE | 60 | 1 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `OD` | Odisha | STATE | 147 | 21 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `PB` | Punjab | STATE | 117 | 13 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `RJ` | Rajasthan | STATE | 200 | 25 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `SK` | Sikkim | STATE | 32 | 1 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `TN` | Tamil Nadu | STATE | 234 | 39 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `TS` | Telangana | STATE | 119 | 17 | `AP_2014` | YES (100%) | YES (Defect OPEN) |
| `TR` | Tripura | STATE | 60 | 2 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `UP` | Uttar Pradesh | STATE | 403 | 80 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `UK` | Uttarakhand | STATE | 70 | 5 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `WB` | West Bengal | STATE | 294 | 42 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `DL` | Delhi | UT_WITH_ASSEMBLY | 70 | 7 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `JK` | Jammu & Kashmir | UT_WITH_ASSEMBLY | 90 | 5 | `JK_2022` | YES (100%) | NO (Blocked) |
| `PY` | Puducherry | UT_WITH_ASSEMBLY | 30 | 1 | `ECI_2008` | YES (100%) | NO (Blocked) |
| `AN` | Andaman & Nicobar Islands | UT_NON_ASSEMBLY | 0 | 1 | `ECI_2008` | N/A | NO (Blocked) |
| `CH` | Chandigarh | UT_NON_ASSEMBLY | 0 | 1 | `ECI_2008` | N/A | NO (Blocked) |
| `DH` | Dadra & Nagar Haveli and Daman & Diu | UT_NON_ASSEMBLY | 0 | 2 | `ECI_2008` | N/A | NO (Blocked) |
| `LA` | Ladakh | UT_NON_ASSEMBLY | 0 | 1 | `JK_2022` | N/A | NO (Blocked) |
| `LD` | Lakshadweep | UT_NON_ASSEMBLY | 0 | 1 | `ECI_2008` | N/A | NO (Blocked) |

## 4. Stage B Deliverable Package
All ten mandated Stage B deliverables have been compiled and verified in accordance with CTO Directive 116.
