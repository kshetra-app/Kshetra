# W016-C3-R5-R4A: Governed Topological Repair Forensic Preflight Report

**Directive:** W016-C3-R5-R4A — CTO AUTHORIZATION: GOVERNED TOPOLOGICAL REPAIR FORENSIC PREFLIGHT  
**Execution Timestamp:** 2026-09-28T06:07:37.920Z  
**Canonical Git HEAD:** `97111aeddac9e0c0947a314a102e3e1e9560f1dc`  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`) ONLY (Read-Only Forensic Audit)  
**Production Isolation:** `ehfafcnimmjusyvplbah` (**STRICTLY AIR-GAPPED & UNTOUCHED — 0 CONNECTIONS, 0 DDL, 0 DML**)  
**Staging `public.entity_geometries` Count:** **0 rows** (Empty-table invariant strictly preserved)  
**Final Status:** **W016-C3-R5-R4A REPAIR FORENSIC PREFLIGHT COMPLETE — READY FOR CTO REVIEW**  

---

## 1. Executive Summary & Forensic Findings

In accordance with CTO Directive `W016-C3-R5-R4A`, a forensic and derivative-preflight analysis was conducted on the canonical TGRAC government GIS dataset (`data/geo/candidate_authoritative/tgrac_mandals_raw.json`).

### Critical Discoveries:
1. **Raw Source Preservation**:
   - The canonical raw artifact remains byte-for-byte unmodified: SHA-256 `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db`.
   - Git working tree tracking confirms zero modifications.
2. **Defect Root Cause**:
   - The 3 topological defects (FIDs 286, 292, 523) are sub-centimeter digitizing snapping loops (3 vertices) created during historical boundary digitization where the boundary snapped back upon its starting node.
   - Neighboring mandals share the defect vertex as their ring closure node, but their boundary loops are clean and valid.
3. **Deterministic Repair Candidate Performance**:
   - PostGIS `ST_MakeValid` (PostGIS 3.3.7, GEOS 3.14.1) resolves the figure-eight knot deterministically.
   - **Area Delta**: `0.0 deg²` for Kuravi and Motakondur; `-2.27e-13 deg²` (0.0000000017%) for Nakrekal.
   - **Bounding Box Delta**: Bit-exact `[0, 0, 0, 0]` across all 3 features.
   - **Centroid Displacement**: `0.14 micrometers` (Kuravi), `59 micrometers` (Nakrekal), `0.06 micrometers` (Motakondur).
   - **Hausdorff Distance**: `0.0 degrees` across all 3 features (boundary is coincident with source).
4. **Topological Nuance**:
   - `ST_MakeValid` creates 1 MultiPolygon containing 1 Polygon with 2 rings: Ring 0 (the cleaned exterior shell) and Ring 1 (a 4-vertex microscopic degenerate ring of area `10^-10` to `10^-13 deg²`).
   - A governance decision is required on whether Ring 1 is retained or dropped.
5. **589-Feature Rehearsal**:
   - 586 valid features preserved verbatim.
   - 3 features repaired.
   - 100% of the 589 rehearsal outputs are valid MultiPolygons within Telangana administrative bounds.
6. **Zero Database Mutation**:
   - `public.entity_geometries` remains strictly at **0 rows**.
   - No geometries were inserted. Production was untouched. Migration 049 was NOT created.

---

## 2. Reproduction of the Three Failures

| Source FID | Mandal Name | District Name | Target `mandal_version_id` | Version Code | `ST_IsValid` | `ST_IsValidReason` | Defect Coordinate `[Lon, Lat]` |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| **286** | Kuravi | Mahabubabad | `9c1ebb72-2a15-5aae-ab7d-d3ef8806d28b` | `TS-MDL-4721-V1` | `false` | Ring Self-intersection | `[79.94888665600001, 17.514169435999975]` |
| **292** | Nakrekal | Nalgonda | `40151d58-be3f-55c5-9424-0670c4e27093` | `TS-MDL-4636-V1` | `false` | Ring Self-intersection | `[79.424871978, 17.222727554000016]` |
| **523** | Motakondur | Yadadri Bhuvanagiri | `bf88ae00-a796-5082-8bbb-51f20d2b9f11` | `TS-MDL-6309-V1` | `false` | Ring Self-intersection | `[79.03225856799997, 17.594265163999978]` |

*The remaining 586 features in the raw artifact are 100% valid PostGIS MultiPolygons.*

---

## 3. PostGIS Environment & Candidate Transformation

- **PostGIS Engine**: `POSTGIS="3.3.7 a0c7967" [EXTENSION] PGSQL="170" GEOS="3.14.1-CAPI-1.20.5" PROJ="9.7.1" LIBXML="2.15.1" LIBJSON="0.18" LIBPROTOBUF="1.5.2" WAGYU="0.5.0 (Internal)"`
- **Candidate Transformation**: `ST_Multi(ST_CollectionExtract(ST_MakeValid(geometry), 3))`
- **GEOS Method**: `method=linework (PostGIS GEOS 3.14.1 default)`

---

## 4. Comprehensive Before / After Forensic Metric Matrix

| Metric | FID 286 (Kuravi) | FID 292 (Nakrekal) | FID 523 (Motakondur) |
| :--- | :--- | :--- | :--- |
| **Source Geometry SHA-256** | `b759a82827f9012d...` | `4a87cadd02a81122...` | `32f2da3071f00743...` |
| **Repaired Geometry SHA-256** | `a7704433084f67ca...` | `8f6cdecb18eb37d1...` | `bb4f86e86d301eef...` |
| **ST_IsValid (Before / After)** | `false` ➔ **`true`** | `false` ➔ **`true`** | `false` ➔ **`true`** |
| **ST_IsValidReason (Before / After)** | Ring Self-intersection ➔ Valid | Ring Self-intersection ➔ Valid | Ring Self-intersection ➔ Valid |
| **Geometry Type** | `MultiPolygon` ➔ `MultiPolygon` | `MultiPolygon` ➔ `MultiPolygon` | `MultiPolygon` ➔ `MultiPolygon` |
| **Polygon Count** | 1 ➔ 1 | 1 ➔ 1 | 1 ➔ 1 |
| **Ring Count** | 1 ➔ 2 | 1 ➔ 2 | 1 ➔ 2 |
| **Vertex Count** | 975 ➔ 976 (972 shell + 4 ring) | 2167 ➔ 2168 (2164 shell + 4 ring) | 1229 ➔ 1230 (1226 shell + 4 ring) |
| **Planar Area Before ((deg^2))** | `0.020506269686279666` | `0.012958336488736677` | `0.013284034543971757` |
| **Planar Area After ((deg^2))** | `0.020506269686279666` | `0.012958336488509303` | `0.013284034543971757` |
| **Area Delta ((deg^2))** | **`0.0`** | `-2.2737e-13` | **`0.0`** |
| **Relative Area Delta** | **`0.0`** | `1.7547e-11` | **`0.0`** |
| **Centroid Displacement ((deg))** | `1.3049e-12°` | `5.3302e-10°` | `5.6308e-13°` |
| **Centroid Displacement (Meters)** | **`0.14 µm`** (0.00000014 m) | **`59.3 µm`** (0.0000593 m) | **`0.06 µm`** (0.00000006 m) |
| **Bounding Box Delta** | `[0, 0, 0, 0]` (Bit-exact) | `[0, 0, 0, 0]` (Bit-exact) | `[0, 0, 0, 0]` (Bit-exact) |
| **Hausdorff Distance** | **`0.0 degrees`** | **`0.0 degrees`** | **`0.0 degrees`** |
| **Max Boundary Displacement** | **`0.0 degrees`** (Coincident) | **`0.0 degrees`** (Coincident) | **`0.0 degrees`** (Coincident) |

---

## 5. Topological & Administrative Semantics Analysis

1. **Polygon Adjacency & Shared Boundaries**:
   - **Kuravi (FID 286)**: The self-intersection occurs at `[79.948886656, 17.514169436]`, which is shared with **Mahabubabad (FID 304)**. Mahabubabad's boundary ring begins and ends at this node (`indices: [0, 870]`), but contains no self-intersection.
   - **Nakrekal (FID 292)**: The self-intersection occurs at `[79.424871978, 17.222727554]`, shared with **Shaligouraram (FID 494)**. Shaligouraram's ring begins and ends at this node (`indices: [0, 1297]`) cleanly.
   - **Motakondur (FID 523)**: The self-intersection occurs at `[79.032258568, 17.594265164]`, shared with **Yadagirigutta (FID 270)**. Yadagirigutta's ring begins and ends at this node (`indices: [0, 891]`) cleanly.
2. **Knot Structure**:
   - In all 3 cases, the defect is a **sub-centimeter digitizing knot** (a 3-segment loop of length ~1 cm at the boundary closure).
3. **The Microscopic Ring Artifact**:
   - When PostGIS `ST_MakeValid` processes the knot, it detaches the 1-cm loop and incorporates it as an interior ring (Ring 1) of area (10^{-10}) to (10^{-13}) (deg^2).
   - This ring does NOT represent a real administrative enclave or hole; it is purely a topological artifact of resolving a boundary self-touch.

---

## 6. 589-Feature Derivative Rehearsal Summary

- **Total Features Rehearsed**: 589
- **Unchanged Features Preserved**: 586
- **Transformed Features**: 3 (FIDs 286, 292, 523)
- **MultiPolygon Conformity**: 100% (589/589)
- **Spatial Extent Conformity**: 100% within Telangana administrative bounds ([77.0..81.5°E, 15.8..19.95°N])
- **Candidate Derivative Checksum**: `291426fcad91e74948d7fdc34d3e218d5681f366974a63dc5a3c2208a58c19d1`

---

## 7. Derivative Artifact & Governance Lineage Design

### Proposed Derivative Specification:
- **File Path**: `data/geo/authoritative/tgrac_mandals_2016_v1_topologically_repaired.json`
- **Independent Checksum**: `291426fcad91e74948d7fdc34d3e218d5681f366974a63dc5a3c2208a58c19d1`
- **Data Status Semantics**:
  - Raw TGRAC: **`OFFICIAL`**
  - Repaired Derivative: **`DERIVED`**
  - *Must NOT be silently promoted to OFFICIAL.*

### Lineage Hierarchy:
```text
DERIVED spatial artifact (tgrac_mandals_2016_v1_topologically_repaired.json)
    ↓
derived provenance records (status = DERIVED)
    ↓
source spatial provenance records (tgrac_mandals_2016_v1, status = OFFICIAL)
    ↓
TGRAC raw artifact (tgrac_mandals_raw.json, SHA aca53...12db)
    ↓
evidence e0160000-0000-0000-0000-000000001013
```

*Existing OFFICIAL provenance nodes and evidence records remain 100% immutable and unmutated.*

---

## 8. Verification Check Results

| Check ID | Description | Status | Observed Value / Details |
| :--- | :--- | :---: | :--- |
| **RSP-01** | Canonical raw artifact exists on disk | **PASS** | data/geo/candidate_authoritative/tgrac_mandals_raw.json |
| **RSP-02** | Raw artifact SHA-256 matches expected checksum exactly | **PASS** | aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db |
| **RSP-03** | Raw artifact has zero git diff against HEAD (unmodified) | **PASS** | Byte-for-byte unmodified |
| **RSP-04** | Raw artifact contains exactly 589 features (FIDs 0..588) | **PASS** | Features count: 589 |
| **DEF-286** | Independently reproduced failure for FID 286 (Kuravi) | **PASS** | Reason: Ring Self-intersection at [79.94888665600001, 17.514169435999975] |
| **DEF-292** | Independently reproduced failure for FID 292 (Nakrekal) | **PASS** | Reason: Ring Self-intersection at [79.424871978, 17.222727554000016] |
| **DEF-523** | Independently reproduced failure for FID 523 (Motakondur) | **PASS** | Reason: Ring Self-intersection at [79.03225856799997, 17.594265163999978] |
| **POSTGIS-VER** | PostGIS build configuration & version identified | **PASS** | POSTGIS="3.3.7 a0c7967" [EXTENSION] PGSQL="170" GEOS="3.14.1-CAPI-1.20.5" PROJ="9.7.1" LIBXML="2.15.1" LIBJSON="0.18" LIBPROTOBUF="1.5.2" WAGYU="0.5.0 (Internal)" |
| **COMP-286** | Forensic before/after comparison computed for FID 286 (Kuravi) | **PASS** | Repaired ST_IsValid: true, HausdorffDist: 0, RelAreaDelta: 0.0000e+0 |
| **COMP-292** | Forensic before/after comparison computed for FID 292 (Nakrekal) | **PASS** | Repaired ST_IsValid: true, HausdorffDist: 0, RelAreaDelta: 1.7547e-11 |
| **COMP-523** | Forensic before/after comparison computed for FID 523 (Motakondur) | **PASS** | Repaired ST_IsValid: true, HausdorffDist: 0, RelAreaDelta: 0.0000e+0 |
| **TOPO-01** | Topological semantics evaluated: 1 equivalent polygon produced per feature | **PASS** | Zero extraneous detached polygons created |
| **REHEARSAL-01** | 589-feature derivative rehearsal: exactly 586 unchanged, 3 transformed | **PASS** | Unchanged: 586, Transformed: 3 |
| **REHEARSAL-02** | All 589 rehearsal outputs are valid MultiPolygons within Telangana bounds | **PASS** | MultiPolygon: true, Bounds: true |
| **DESIGN-01** | Derivative artifact specification designed with independent SHA-256 | **PASS** | Candidate SHA-256: 291426fcad91e74948d7fdc34d3e218d5681f366974a63dc5a3c2208a58c19d1 |
| **DESIGN-02** | Explicit DERIVED -> OFFICIAL provenance lineage model established | **PASS** | Preserves immutable OFFICIAL provenance nodes intact |
| **DB-01** | Staging public.entity_geometries row count remains strictly 0 | **PASS** | Live row count: 0 |
| **DB-02** | Historical mandal_versions remain untouched (589 versions intact) | **PASS** | Historical versions count: 589 |
| **DB-03** | Production ehfafcnimmjusyvplbah receives zero connections, zero DDL, zero DML | **PASS** | Air-gap 100% maintained |
| **DB-04** | Zero database modifications executed (Migration 049 NOT created, Migrations 039–048 unmodified) | **PASS** | Read-only preflight strictly respected |

---

## 9. Terminal Status

```text
W016-C3-R5-R4A REPAIR FORENSIC PREFLIGHT COMPLETE — READY FOR CTO REVIEW
```
