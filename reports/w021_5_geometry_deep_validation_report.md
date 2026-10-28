# KSHETRA W021.5 — Geometry Deep Validation & Boundary Inventory Report
**Directive:** CTO Directive 116  
**Specification:** W021.5-B1-04  
**Date:** 2026-10-28T17:01:43.426Z  

## 1. Telangana Assembly GeoJSON Deep Validation
- **Asset Path:** `data/geo/telangana-assembly.geojson` (3.66 MB)
- **Feature Count:** 120 features for 119 statutory seats
- **RFC 7946 Validity:** All 120 features are closed LinearRings (`first == last`, >= 4 positions)
- **Coordinate System:** WGS 84 (EPSG:4326)
- **Bounding Box:** `[77.2435°E, 15.8344°N, 81.3197°E, 19.9172°N]` (Strictly within Indian bounds)
- **Statutory Linkage:** 119/119 statutory AC numbers linked
- **Defect Detection:** Statutory seat **AC 119** has 2 distinct polygon features.
- **Fail-Closed Determination:** Clean 1-to-1 constituency mapping is **REJECTED** (`hasCleanConstituencyMapping = false`, `hasGeoJSON = false`). The defect remains **OPEN and BLOCKED** pending official CEO Telangana gazette consolidation.

## 2. Missing 30-State Boundary Register
Authoritative boundary files are missing for 30 States/UTs (representing 4,004 statutory seats).
Fabricating, synthesizing, or duplicating polygons to manufacture national coverage is strictly prohibited.
All 30 states are classified as **BLOCKED_EXTERNAL** under Criterion `CRIT-B104-02`.

## 3. Candidate File Forensic Inspection (scripts/)
| File Name | Jurisdiction | Statutory | Features | Discrepancy | Property Schema | Rejection Rationale |
|:---|:---:|:---:|:---:|:---:|:---|:---|
| `ARUNACHAL_PRADESH_ASSEMBLY.geojson` | `AR` | 60 | 61 | +1 | `FID, OBJECTID, ST_CODE, ST_NAME, DT_CODE, DIST_NAME, AC_NO, AC_NAME` | Fails Rule IV-001 authoritative source requirements. Unofficial community scrapes without Survey of India / ECI digital signatures cannot be silently promoted to official data/geo assets. |
| `jk-source.geojson` | `JK` | 90 | 91 | +1 | `seat_id, state_id, seat_name_en, seat_district_en, sc_st_gen, seat_name_hi, seat_district_hi, seat_name_ur` | Fails Rule IV-001 authoritative source requirements. Unofficial community scrapes without Survey of India / ECI digital signatures cannot be silently promoted to official data/geo assets. |
| `MANIPUR_ASSEMBLY.geojson` | `MN` | 60 | 68 | +8 | `FID, OBJECTID, ST_CODE, ST_NAME, DT_CODE, DIST_NAME, AC_NO, AC_NAME` | Fails Rule IV-001 authoritative source requirements. Unofficial community scrapes without Survey of India / ECI digital signatures cannot be silently promoted to official data/geo assets. |
| `MEGHALAYA_ASSEMBLY.geojson` | `ML` | 60 | 60 | 0 | `FID, OBJECTID, ST_CODE, ST_NAME, DT_CODE, DIST_NAME, AC_NO, AC_NAME` | Fails Rule IV-001 authoritative source requirements. Unofficial community scrapes without Survey of India / ECI digital signatures cannot be silently promoted to official data/geo assets. |
| `MIZORAM_ASSEMBLY.geojson` | `MZ` | 40 | 40 | 0 | `FID, OBJECTID, ST_CODE, ST_NAME, DT_CODE, DIST_NAME, AC_NO, AC_NAME` | Fails Rule IV-001 authoritative source requirements. Unofficial community scrapes without Survey of India / ECI digital signatures cannot be silently promoted to official data/geo assets. |
| `NAGALAND_ASSEMBLY.geojson` | `NL` | 60 | 60 | 0 | `FID, OBJECTID, ST_CODE, ST_NAME, DT_CODE, DIST_NAME, AC_NO, AC_NAME` | Fails Rule IV-001 authoritative source requirements. Unofficial community scrapes without Survey of India / ECI digital signatures cannot be silently promoted to official data/geo assets. |
| `PUDUCHERRY_ASSEMBLY.geojson` | `PY` | 30 | 30 | 0 | `FID, OBJECTID, ST_CODE, ST_NAME, DT_CODE, DIST_NAME, AC_NO, AC_NAME` | Fails Rule IV-001 authoritative source requirements. Unofficial community scrapes without Survey of India / ECI digital signatures cannot be silently promoted to official data/geo assets. |
| `SIKKIM_ASSEMBLY.geojson` | `SK` | 32 | 38 | +6 | `FID, OBJECTID, ST_CODE, ST_NAME, DT_CODE, DIST_NAME, AC_NO, AC_NAME` | Fails Rule IV-001 authoritative source requirements. Unofficial community scrapes without Survey of India / ECI digital signatures cannot be silently promoted to official data/geo assets. |
| `sk-source.geojson` | `SK` | 32 | 31 | -1 | `ac_num, ac_name, ac_type` | Fails Rule IV-001 authoritative source requirements. Unofficial community scrapes without Survey of India / ECI digital signatures cannot be silently promoted to official data/geo assets. |
| `TRIPURA_ASSEMBLY.geojson` | `TR` | 60 | 60 | 0 | `FID, OBJECTID, ST_CODE, ST_NAME, DT_CODE, DIST_NAME, AC_NO, AC_NAME` | Fails Rule IV-001 authoritative source requirements. Unofficial community scrapes without Survey of India / ECI digital signatures cannot be silently promoted to official data/geo assets. |
| `UTTARAKHAND_ASSEMBLY.geojson` | `UK` | 70 | 70 | 0 | `FID, OBJECTID, ST_CODE, ST_NAME, DT_CODE, DIST_NAME, AC_NO, AC_NAME` | Fails Rule IV-001 authoritative source requirements. Unofficial community scrapes without Survey of India / ECI digital signatures cannot be silently promoted to official data/geo assets. |
