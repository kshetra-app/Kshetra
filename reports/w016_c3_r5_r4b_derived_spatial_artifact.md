# W016-C3-R5-R4B: Governed Derived Spatial Artifact & Staging Lineage Report

**Directive:** W016-C3-R5-R4B — CTO AUTHORIZATION: CREATE GOVERNED DERIVED SPATIAL ARTIFACT  
**Execution Timestamp:** 2026-09-28T08:18:02.387Z  
**Canonical Git HEAD:** `4aecc726608fab74670f91cb8600f25d2ed4c99f`  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`) ONLY  
**Production Isolation:** `ehfafcnimmjusyvplbah` (**STRICTLY AIR-GAPPED & UNTOUCHED — 0 CONNECTIONS, 0 DDL, 0 DML**)  
**Staging `public.entity_geometries` Count:** **0 rows** (Hard invariant preserved)  
**Final Status:** **W016-C3-R5-R4B DERIVED SPATIAL ARTIFACT COMPLETE — READY FOR CTO REVIEW**  

---

## 1. Executive Summary & Deliverables Overview

In accordance with CTO Directive `W016-C3-R5-R4B`, the canonical **Governed Derived Spatial Artifact** has been generated, validated, persisted, and registered in staging governance ledgers.

### Deliverables Created:
1. **Derived Spatial Artifact**:
   - `data/geo/authoritative/tgrac_mandals_2016_v1_topologically_repaired.json`
   - **SHA-256**: `dd16ff36d2d9c581cbc5c29125fb33787310c2d4c203d98b88aa74308d4ad077` (Byte Size: 62830689 bytes)
   - Features: Exactly 589 features in identical source order (FIDs 0..588).
   - Status: **`DERIVED`**
2. **Machine-Readable Transformation Manifest**:
   - `data/geo/authoritative/tgrac_mandals_2016_v1_repaired_manifest.json`
   - Full 589-feature record mapping source hash ➔ derived hash.
3. **Staging W012 Governance Records**:
   - **Dataset Version**: `tgrac_mandals_2016_v1_topologically_repaired` (`default_status = 'DERIVED'`)
   - **Provenance Records**: Exactly **589 DERIVED provenance records** persisted in `public.provenance_records`, each referencing its corresponding OFFICIAL source record via `parent_provenance_id`.
4. **Hard Invariants Preserved**:
   - Canonical raw artifact (`data/geo/candidate_authoritative/tgrac_mandals_raw.json`) remains byte-for-byte unmodified: SHA-256 `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db`.
   - `public.entity_geometries` row count remains strictly **0**.
   - Production remains 100% air-gapped and untouched.
   - Migration 049 was **NOT** created; Migration 048 was **NOT** modified.

---

## 2. Canonical Repair Transformation (Candidate B Specification)

- **Transformation Identifier**: `W016-C3-R5-R4B-TOPO-REPAIR-V1`
- **PostGIS Engine**: `POSTGIS="3.3.7 a0c7967" [EXTENSION] PGSQL="170" GEOS="3.14.1-CAPI-1.20.5" PROJ="9.7.1" LIBXML="2.15.1" LIBJSON="0.18" LIBPROTOBUF="1.5.2" WAGYU="0.5.0 (Internal)"`
- **Algorithm**:
  ```text
  RAW GEOMETRY (MultiPolygon)
      ↓
  ST_MakeValid(geometry, 'method=linework')
      ↓
  Extract Polygonal Components [Poly1, Poly2, ...]
      ↓
  For each component:
      - Retain exterior ring Poly[0]
      - Filter interior rings: Remove ONLY 4-vertex microscopic knot rings (area < 1e-6 deg²)
      - Reconstruct Polygon component
      ↓
  ST_Multi(...)
      ↓
  Validate via PostGIS ST_IsValidDetail
  ```
- **586 Features**: Bit-exact geometry preservation from the raw source (zero coordinate alterations).
- **3 Features (FIDs 286, 292, 523)**: Candidate B applied.

---

## 3. Repaired Features Forensic Summary

| Feature ID (FID) | Mandal Name | District Name | Version Code | Source Geom SHA | Derived Geom SHA | Area Delta ((deg^2)) | Ext. Boundary Displacement |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **286** | Kuravi | Mahabubabad | `TS-MDL-4721-V1` | `b759a828...` | `6a7892a8...` | `+4.88e-10` (~6 m²) | 0.433 m (knot perimeter ~56 m) |
| **292** | Nakrekal | Nalgonda | `TS-MDL-4636-V1` | `4a87cadd...` | `1531c960...` | `-1.14e-13` (~14 cm²) | 0.035 m (knot perimeter ~7 cm) |
| **523** | Motakondur | Yadadri Bhuvanagiri | `TS-MDL-6309-V1` | `32f2da30...` | `65d9bf35...` | `+1.73e-11` (~0.2 m²) | 2.634 m (knot perimeter ~5.3 m) |

*All 3 repaired features evaluate to `ST_IsValid = true` with `reason = null` under PostGIS `ST_IsValidDetail`.*

---

## 4. Complete Staging Governance Lineage

```text
DERIVED DATASET VERSION
  id: tgrac_mandals_2016_v1_topologically_repaired
  status: DERIVED
  checksum: dd16ff36d2d9c581cbc5c29125fb33787310c2d4c203d98b88aa74308d4ad077
        ↓
DERIVED PROVENANCE RECORDS (589 records)
  dataset_version_id: tgrac_mandals_2016_v1_topologically_repaired
  status: DERIVED
  transformation_type: topological_snapping_knot_repair (3) / identity_preservation (586)
  parent_provenance_id ───────┐
                              ▼
OFFICIAL SOURCE PROVENANCE RECORDS (589 records)
  dataset_version_id: tgrac_mandals_2016_v1
  status: OFFICIAL
        ↓
OFFICIAL TGRAC DATASET VERSION
  id: tgrac_mandals_2016_v1
  status: OFFICIAL
  checksum: aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db
        ↓
evidence: e0160000-0000-0000-0000-000000001013
```

*Zero existing OFFICIAL records were modified or deleted. Lineage is strictly additive and immutable.*

---

## 5. Comprehensive Check Matrix

| Check ID | Description | Status | Observed Value / Details |
| :--- | :--- | :---: | :--- |
| **RSP-01** | Canonical raw artifact exists at exact path | **PASS** | data/geo/candidate_authoritative/tgrac_mandals_raw.json |
| **RSP-02** | Raw artifact SHA-256 matches expected checksum exactly | **PASS** | aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db |
| **RSP-03** | Raw artifact byte-for-byte unmodified in working tree | **PASS** | Zero git diff against HEAD |
| **RSP-04** | Raw artifact contains exactly 589 features (FIDs 0..588) | **PASS** | Features: 589 |
| **POSTGIS-VER** | PostGIS build configuration & version identified | **PASS** | POSTGIS="3.3.7 a0c7967" [EXTENSION] PGSQL="170" GEOS="3.14.1-CAPI-1.20.5" PROJ="9.7.1" LIBXML="2.15.1" LIBJSON="0.18" LIBPROTOBUF="1.5.2" WAGYU="0.5.0 (Internal)" |
| **REPAIR-COUNTS** | Transformation applied: exactly 586 unchanged, exactly 3 repaired | **PASS** | Unchanged: 586, Repaired: 3 |
| **ARTIFACT-WRITE** | Derived spatial artifact written to disk | **PASS** | data/geo/authoritative/tgrac_mandals_2016_v1_topologically_repaired.json |
| **ARTIFACT-SHA** | Derived spatial artifact SHA-256 computed | **PASS** | SHA-256: dd16ff36d2d9c581cbc5c29125fb33787310c2d4c203d98b88aa74308d4ad077 (Size: 62830689 bytes) |
| **ARTIFACT-RELOAD** | Derived artifact reload produces bit-exact identical SHA | **PASS** | dd16ff36d2d9c581cbc5c29125fb33787310c2d4c203d98b88aa74308d4ad077 |
| **MANIFEST-WRITE** | Machine-readable transformation manifest written to disk | **PASS** | data/geo/authoritative/tgrac_mandals_2016_v1_repaired_manifest.json |
| **QUAL-01** | Source FIDs match derivative FIDs exactly in identical order | **PASS** | 589/589 FIDs matched |
| **QUAL-02** | All 589 derivative features are non-empty MultiPolygons | **PASS** | 100% MultiPolygon, non-empty |
| **QUAL-03** | All 589 derivative geometries strictly within Telangana spatial extent | **PASS** | [77.0..81.5°E, 15.8..19.95°N] |
| **QUAL-VAL-286** | Repaired geometry for FID 286 verified valid by PostGIS ST_IsValidDetail | **PASS** | Valid: true, Reason: Valid Geometry |
| **QUAL-VAL-292** | Repaired geometry for FID 292 verified valid by PostGIS ST_IsValidDetail | **PASS** | Valid: true, Reason: Valid Geometry |
| **QUAL-VAL-523** | Repaired geometry for FID 523 verified valid by PostGIS ST_IsValidDetail | **PASS** | Valid: true, Reason: Valid Geometry |
| **GOV-DSV** | DERIVED dataset_version record created on panIN-staging | **PASS** | Existing dataset_version: tgrac_mandals_2016_v1_topologically_repaired, default_status: DERIVED |
| **GOV-SRC-PROV** | Fetched 589 OFFICIAL source provenance records from staging | **PASS** | Count: 589 |
| **GOV-DERIVED-PROV** | 589 DERIVED provenance records persisted on staging linking to OFFICIAL parent | **PASS** | Persisted 589 records with parent_provenance_id |
| **GOV-OFFICIAL-INTACT** | Official source provenance records remain 100% immutable (589 OFFICIAL intact) | **PASS** | OFFICIAL provenance records: 589 |
| **DB-EG-INVARIANT** | Staging public.entity_geometries row count remains strictly 0 | **PASS** | Live row count: 0 (hard invariant preserved) |
| **DB-MV-INVARIANT** | Historical mandal_versions remain untouched (589 intact) | **PASS** | Historical versions: 589 |
| **DB-PROD-AIRGAP** | Production ehfafcnimmjusyvplbah receives zero connections, zero DDL, zero DML | **PASS** | Air-gap 100% maintained |
| **DB-MIGRATIONS-INTACT** | Zero schema migrations executed or modified (Migration 049 NOT created) | **PASS** | Schema immutability preserved |

---

## 6. Terminal Status

```text
W016-C3-R5-R4B DERIVED SPATIAL ARTIFACT COMPLETE — READY FOR CTO REVIEW
```
