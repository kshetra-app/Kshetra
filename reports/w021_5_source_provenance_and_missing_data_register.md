# KSHETRA W021.5 — Source Provenance & Missing Data Register
**Directive:** CTO Directive 116  
**Governing Authority:** Master Execution Framework Amendment v1.6 / Rule IV-001  
**Generated At:** 2026-10-20T06:17:47.536Z  

## 1. Authoritative Statutory Sources
| Authoritative Source | Statutory Document | Evidentiary Scope |
|:---|:---|:---|
| Election Commission of India (ECI) | Delimitation of Parliamentary and Assembly Constituencies Order, 2008 | National Baseline (4,123 ACs, 543 PCs) |
| Parliament of India | Andhra Pradesh Reorganisation Act, 2014 (Act No. 6 of 2014) | Andhra Pradesh (175 ACs) and Telangana (119 ACs) |
| Delimitation Commission of India | Final Order No. 2022/2 (Jammu & Kashmir) | UT of Jammu & Kashmir (90 ACs, 5 PCs) |
| Election Commission of India | Delimitation Order No. 282/AS/2023 | Assam 2023 Delimitation (126 ACs, 14 PCs) |
| Government of Telangana (Revenue Dept) | G.O.Ms. Nos. 214-245 Rev (2016-10-11) | Telangana 589 Baseline Mandals |
| CEO Telangana GIS Portal / Survey of India | Telangana Assembly Constituencies Boundary Shapefile | Telangana 120 Polygon Features (AC 119 defect detected) |

## 2. Missing Data & Blocked Items Register
| Item ID | Description | Impact | Status | Required Source / Authority |
|:---|:---|:---|:---:|:---|
| `MISS-GEO-001` | Authoritative GeoJSON Assembly Boundaries for 30 States/UTs | 4004 seats across 30 states | **BLOCKED_EXTERNAL** | Survey of India / ECI National GIS Portal |
| `MISS-GEO-002` | Telangana AC 119 Shapefile Bifurcation Resolution | 1 seats across undefined states | **BLOCKED_EXTERNAL / OPEN_DEFECT** | CEO Telangana Gazette Reorganisation Order |
| `MISS-FIN-001` | Financial Disclosures Defect DQ-W021.5-B2.2E-001 | Candidate Affidavits & Asset Disclosures | **STRICTLY_OPEN** | Explicit Separate CTO Adjudication |

## 3. Strict Non-Fabrication Invariants
Under Master Execution Framework Amendment v1.6 and Directive 116:
1. Synthetic extrapolation or copying of Telangana polygons to manufacture national coverage is **STRICTLY PROHIBITED**.
2. Arbitrary polygon deletion or consolidation of the Telangana AC 119 defect without CEO Telangana provenance is **STRICTLY PROHIBITED**.
3. Financial defect `DQ-W021.5-B2.2E-001` remains **STRICTLY OPEN** pending separate CTO adjudication.
