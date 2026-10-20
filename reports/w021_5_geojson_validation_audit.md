# KSHETRA W021.5 — CTO DIRECTIVE 117
## Independent GeoJSON Validation Audit: Telangana Assembly

**Target Asset:** `data/geo/telangana-assembly.geojson`  
**Target Jurisdiction:** Telangana (State Code: `TS`)  
**Directive:** CTO Directive 117 (Workstream D4 & D5)  
**Governing Authority:** Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance  
**Date:** 2026-10-20  

---

## 1. Executive Summary

In adherence to Directive 117 Section 5 (D4 & D5), the geometry validator was executed directly against the underlying asset `data/geo/telangana-assembly.geojson` rather than inspecting intermediate report summaries.

- **Structural Validity:** PASS (120 features, 120 closed rings, 0 coordinate errors, RFC 7946 compliant).
- **Spatial Plausibility:** PASS (All coordinates lie within Telangana geographic bounding box `[77.23, 15.83] – [81.32, 19.92]`).
- **Statutory Linkage:** **DISCREPANCY PRESERVED** (120 features for 119 statutory seats).
- **AC 119 Defect:** **OPEN_AND_BLOCKED** (Bhadrachalam AC 119 has two separate polygon features).
- **Authoritative Certification:** **NOT AUTHORITATIVE** without official revenue gazette reconciliation.

---

## 2. Geometric & Structural Analysis

| Check | Specification | Observed Actual | Status |
| :--- | :--- | :--- | :---: |
| **GeoJSON Type** | `FeatureCollection` | `FeatureCollection` | PASS |
| **Feature Count** | 120 features | 120 features | PASS |
| **Geometry Types** | Polygon / MultiPolygon | 120 Polygons, 0 MultiPolygons | PASS |
| **Coordinate Numeric Validity** | Valid numbers, non-NaN | 0 NaN or non-number coordinates | PASS |
| **Ring Closure** | First coordinate === Last coordinate | 120/120 rings closed | PASS |
| **Minimum Ring Size** | ≥ 4 coordinates | All rings ≥ 4 coordinates | PASS |
| **RFC 7946 Coordinate Order** | `[longitude, latitude]` | Compliant (e.g. `[80.68, 17.51]`) | PASS |
| **CRS Specification** | WGS 84 / OGC:CRS84 | Compliant | PASS |

---

## 3. AC 119 Statutory Discrepancy & Defect Preservation

Telangana possesses exactly 119 statutory Assembly seats per the Andhra Pradesh Reorganisation Act, 2014. The GeoJSON file contains 120 features due to a duplicate feature for seat 119:

| Attribute | Feature 1 (`OBJECTID: 4184`) | Feature 2 (`OBJECTID: 4188`) |
| :--- | :--- | :--- |
| **FID** | 4159 | 4160 |
| **AC Number** | 119 | 119 |
| **AC Name** | Bhadrachalam (ST) | Bhadrachalam (ST) |
| **District** | Khammam | Khammam |
| **Shape Area** | 0.171915 | 0.000710 (Fragment) |
| **dtname11** | Sukma | Sukma |

### Non-Tampering Compliance
In strict compliance with Directive 117 Rule 8, **neither feature has been deleted, merged, or overwritten**. 

The defect remains **`OPEN_AND_BLOCKED`**. To prevent erroneous UI rendering or false containment calculations, the mobile constituency registry sets `hasGeoJSON: false` for AC 119 (`TS-AC-119`).

---

## 4. 30-State National Geometry Absence

The repository contains **zero** boundary polygons for the other 30 legislative jurisdictions (4,004 statutory seats). Per Directive 117 Rule 8, **no synthetic or community-sourced polygons have been fabricated**. This statutory gap remains formally recorded as **`BLOCKED_EXTERNAL`** pending authoritative Survey of India / ECI boundary deliverables.
