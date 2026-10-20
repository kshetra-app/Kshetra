# KSHETRA W021.5 — CTO DIRECTIVE 117
## Open Defects & External Dependencies Register

**Directive:** CTO Directive 117 (Workstream D5, D6, and Governance Rule 8)  
**Governing Authority:** Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance  
**Date:** 2026-10-20  

---

## 1. Open Defects Register

In strict compliance with Directive 117 Section 8 (Prohibited Actions), the following defects remain **strictly open** and cannot be self-closed or merged without explicit CTO adjudication:

| Defect ID | Title | Scope | Status | Resolution Authority / Prerequisite |
| :--- | :--- | :---: | :---: | :--- |
| **`DQ-W021.5-B2.2E-001`** | Financial Disclosures & Affidavits Data Quality | Stage E | **`STRICTLY_OPEN`** | Requires separate explicit CTO adjudication. Self-closure prohibited. |
| **`DQ-W021.5-B1-001`** | Telangana AC 119 (Bhadrachalam) Duplicate Polygons | Stage B | **`OPEN_AND_BLOCKED`** | Requires official AP/TS revenue gazette. Deleting or merging features prohibited. |

---

## 2. External Dependencies Register

| Dependency ID | Title | Scope | Impacted Weight | Status | Resolution Requirement |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`DEP-GEO-001`** | National Geometry for 30 Missing Jurisdictions | Stage B | 1.5% | **`BLOCKED_EXTERNAL`** | Authoritative Survey of India / ECI GIS boundaries. Synthetic polygon generation prohibited. |
| **`DEP-DB-001`** | Staging Database Migration & Query Execution | Stages C–F | 10.5% | **`AIR_GAPPED_UNEXECUTED`** | Explicit CTO directive and staging database authorization. Production access zero. |
| **`DEP-LIN-001`** | Assam 2023 Cross-Regime Territorial Concordance | Stage B | 1.5% | **`ASSAM_HISTORICAL_LINEAGE_PENDING`** | Official CEO Assam gazette concordance tables between 2008 and 2023 boundaries. |

---

## 3. Compliance Affirmation

- **Zero Synthetic Geometries:** No polygons fabricated for the 30 missing jurisdictions.
- **Zero Tampering with AC 119:** Both FID 4159 and FID 4160 retained in `data/geo/telangana-assembly.geojson`.
- **Zero Production Database Mutation:** `ehfafcnimmjusyvplbah` remains 100% air-gapped.
