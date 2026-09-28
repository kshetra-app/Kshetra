# W016-C3-R5-R4: 589 Mandal Geometry Ingestion & Live Verification Report

**Directive:** W016-C3-R5-R4 — CTO AUTHORIZATION: 589 MANDAL GEOMETRY INGESTION INTO STAGING  
**Execution Timestamp:** 2026-09-28T05:43:29.357Z  
**Canonical Git HEAD:** `cc9362b075a13cddf70e7afb09a84db1b8626442`  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`) ONLY  
**Production Isolation:** `ehfafcnimmjusyvplbah` (**STRICTLY AIR-GAPPED & UNTOUCHED**)  
**Final Status:** **W016-C3-R5-R4 GEOMETRY INGESTION BLOCKED — CANONICAL ARTIFACT OGC SELF-INTERSECTION DEFECTS (FID 286 KURAVI, FID 292 NAKREKAL, FID 523 MOTAKONDUR)**  

---

## 1. Executive Summary & Terminal Determination

In accordance with CTO Directive `W016-C3-R5-R4`, an automated, bounded, fail-closed geometry ingestion was executed against `public.entity_geometries` on `panIN-staging` (`fkpigozcqnmcvofuksar`) using the canonical TGRAC raw artifact (`data/geo/candidate_authoritative/tgrac_mandals_raw.json`, SHA-256: `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db`).

### Terminal Determination:
```text
W016-C3-R5-R4 GEOMETRY INGESTION BLOCKED — CANONICAL ARTIFACT OGC SELF-INTERSECTION DEFECTS (FID 286 KURAVI, FID 292 NAKREKAL, FID 523 MOTAKONDUR)
```

### Key Findings & Fail-Closed Enforcement:
1. **Preflight Reconciliation Verified**:
   - Canonical raw artifact SHA-256 matches exactly (`aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db`).
   - All 589 source features (FIDs 0..588) map 1:1 to pre-existing spatial provenance nodes linking to dedicated spatial evidence `e0160000-0000-0000-0000-000000001013` and dataset `tgrac_mandals_2016_v1` with status `OFFICIAL`.
   - All 589 historical `mandal_versions` exist on staging with `is_current = false` and `valid_from = '2016-10-11'`.
2. **Topological Defect Discovery in Authoritative Government GIS Artifact**:
   - Comprehensive PostGIS topological validation revealed that **586 features are 100% valid OGC MultiPolygons**.
   - Exactly **3 features** in the raw government GIS dataset contain OGC ring self-intersections:
     * **FID 286** (`Kuravi`, Mahabubabad, `TS-MDL-4721-V1`, version UUID `9c1ebb72-2a15-5aae-ab7d-d3ef8806d28b`)
     * **FID 292** (`Nakrekal`, Nalgonda, `TS-MDL-4636-V1`, version UUID `40151d58-be3f-55c5-9424-0670c4e27093`)
     * **FID 523** (`Motakondur`, Yadadri Bhuvanagiri, `TS-MDL-6309-V1`, version UUID `bf88ae00-a796-5082-8bbb-51f20d2b9f11`)
3. **Database Engine Constraint Rejection**:
   - Attempted insertion is rejected fail-closed by PostgreSQL declarative check constraint:
     `chk_entity_geometries_is_valid CHECK (ST_IsValid(geometry))` with SQLSTATE `23514`.
4. **Strict Fail-Closed Rollback Executed**:
   - Per CTO mandate: *"If any of the 589 records fails validation or insertion: rollback the entire ingestion; do not leave a partial geometry population; report the exact failing source FID and target mandal_version UUID; do not attempt ad-hoc repair outside the bounded job."*
   - Atomic rollback was executed. Live staging `public.entity_geometries` row count is confirmed at **0**.
   - Zero partial rows were admitted. Zero ad-hoc polygon repairs or coordinate shifts were attempted.
5. **Air-Gap & Ledger Preservation**:
   - Production database `ehfafcnimmjusyvplbah` received 0 connections, 0 DDL, 0 DML.
   - Migrations 039–048 remain untouched. Migration 049 was NOT created.
   - All historical versions (589), mandals (621), districts (33), and ACs (119) remain unchanged.

---

## 2. Forensic Defect Catalog (3 Failing Features)

| Feature ID (FID) | Mandal Name | District Name | Target `mandal_version_id` | Version Code | OGC Violation Reason | Self-Intersection Point | Constraint Violated |
| :---: | :--- | :--- | :--- | :---: | :--- | :--- | :---: |
| **286** | Kuravi | Mahabubabad | `9c1ebb72-2a15-5aae-ab7d-d3ef8806d28b` | `TS-MDL-4721-V1` | Ring Self-intersection | `[79.94888665600001, 17.514169435999975]` | `chk_entity_geometries_is_valid` (23514) |
| **292** | Nakrekal | Nalgonda | `40151d58-be3f-55c5-9424-0670c4e27093` | `TS-MDL-4636-V1` | Ring Self-intersection | `[79.424871978, 17.222727554000016]` | `chk_entity_geometries_is_valid` (23514) |
| **523** | Motakondur | Yadadri Bhuvanagiri | `bf88ae00-a796-5082-8bbb-51f20d2b9f11` | `TS-MDL-6309-V1` | Ring Self-intersection | `[79.03225856799997, 17.594265163999978]` | `chk_entity_geometries_is_valid` (23514) |

### Technical Analysis:
The raw government GIS shapefile from TGRAC contains polygon boundary self-touching / figure-eight boundary loops where a boundary vertex touches a non-adjacent segment of the same ring. While ESRI ArcGIS tolerates self-intersecting boundaries, PostGIS strictly conforms to OGC SFS (Simple Feature Specification) Section 6.1.11, where `ST_IsValid` evaluates to `false` when a ring self-intersects.

Because the prompt strictly commands:
> *"do not attempt ad-hoc repair outside the bounded job"*

neither `ST_MakeValid` nor manual vertex adjustment was applied. The process failed closed, preserving dataset purity.

---

## 3. Spatial Governance Compliance Matrix

| Parameter | Governing Value | Verification Status |
| :--- | :--- | :---: |
| **Dedicated Spatial Evidence** | `e0160000-0000-0000-0000-000000001013` | **PASS** |
| **Spatial Dataset Version** | `tgrac_mandals_2016_v1` | **PASS** |
| **Data Status** | `OFFICIAL` | **PASS** |
| **Authority Classification** | `statutory_cartographic` | **PASS** |
| **Temporal Classification** | `historical_statutory_baseline` | **PASS** |
| **Snapshot Date** | `2016-10-11` | **PASS** |
| **Coordinate Reference System** | `EPSG:4326` (WGS84) | **PASS** |
| **Geometry Representation** | `MultiPolygon` | **PASS** |
| **Currentness Flag** | `false` (historical baseline) | **PASS** |
| **Artifact Checksum** | `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db` | **PASS** |

---

## 4. Live Verification & Invariant Proofs

| Check ID | Description | Status | Observed Value / Details |
| :--- | :--- | :---: | :--- |
| **PRE-01** | Git HEAD matches accepted R2B commit or descendant | **PASS** | cc9362b075a13cddf70e7afb09a84db1b8626442 |
| **PRE-02** | Target is strictly panIN-staging (fkpigozcqnmcvofuksar) | **PASS** | https://fkpigozcqnmcvofuksar.supabase.co |
| **PRE-03** | Production ehfafcnimmjusyvplbah is air-gapped and untouched | **PASS** | Zero connections, zero DDL, zero DML |
| **PRE-FC-01** | Verify source SHA-256 exactly matches canonical checksum | **PASS** | aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db |
| **PRE-FC-02** | Verify exactly 589 source features in artifact | **PASS** | Features: 589 |
| **PRE-FC-03** | Verify 589 unique source FIDs (0..588) | **PASS** | Unique FIDs: 589, Range: [0..588] |
| **PRE-FC-04** | Verify 589 spatial provenance nodes exist on staging for tgrac_mandals_2016_v1 | **PASS** | Count: 589 |
| **PRE-FC-05** | Verify all 589 provenance nodes link to spatial evidence e016...1013 | **PASS** | Evidence: e0160000-0000-0000-0000-000000001013 |
| **PRE-FC-06** | Verify all 589 provenance nodes have status OFFICIAL | **PASS** | 100% OFFICIAL |
| **PRE-FC-07** | Verify 589 unique target mandal_version UUIDs in provenance mapping | **PASS** | Unique versions: 589 |
| **PRE-FC-08** | Verify all 589 target mandal_versions exist on staging | **PASS** | Found: 589 |
| **PRE-FC-09** | Verify all 589 target mandal_versions are historical (is_current = false) | **PASS** | 100% is_current = false |
| **PRE-FC-10** | Verify all target versions have statutory valid_from = 2016-10-11 and valid_to | **PASS** | All valid_from = 2016-10-11 and closed valid_to |
| **PRE-FC-11** | Verify all 589 geometries are non-empty MultiPolygons with closed rings | **PASS** | Prepared 589 rows |
| **PRE-FC-12** | Verify all coordinates fall strictly within Telangana spatial bounds | **PASS** | Out of bounds coordinate points: 0 |
| **PRE-FC-13** | Check pre-ingestion entity_geometries row count | **PASS** | Pre-ingestion row count: 0 |
| **PRE-FC-14** | PostGIS OGC topological validity audit detects 3 canonical artifact defects | **PASS** | 586 valid features, exactly 3 defective features (FIDs 286, 292, 523) |
| **PRE-FC-15** | Fail-closed boundary check: Unauthorized ad-hoc repair strictly prohibited | **PASS** | ST_MakeValid and ad-hoc polygon alteration disallowed without CTO authorization |
| **INGEST-01** | Live PostGIS constraint chk_entity_geometries_is_valid rejects FID 286 fail-closed | **PASS** | 23514: new row for relation "entity_geometries" violates check constraint "chk_entity_geometries_is_valid" |
| **ROLLBACK-01** | Fail-closed atomic rollback executed: public.entity_geometries count = exactly 0 | **PASS** | Live row count: 0 (zero partial rows) |
| **POST-M** | Historical temporal records remain unchanged (589 historical mandal_versions intact) | **PASS** | Historical versions count: 589 |
| **POST-N** | W014/W012 canonical objects remain unchanged | **PASS** | Districts: 33, ACs: 119 |
| **POST-O** | Migrations 039–048 remain unchanged | **PASS** | Zero schema migrations modified, Migration 049 NOT created |
| **POST-P** | No unrelated tables mutated (public.mandals count remains exactly 621) | **PASS** | Mandals count: 621 |
| **POST-Q** | RLS/security behavior active (anon read permitted, anon insert rejected with 42501) | **PASS** | Anon read: 200, Anon write: 401 (42501) |
| **POST-R** | Production ehfafcnimmjusyvplbah receives zero connections, zero DDL, zero DML, zero mutations | **PASS** | Air-gap 100% maintained |

---

## 5. Next Steps for CTO Review & Architectural Remediation

To resolve the blocker without compromising topological integrity or governance:

1. **Option A (Governed PostGIS Ingestion Pre-Processing / `ST_MakeValid` Re-Orientation)**:
   - Provide an authorized remediation job (`W016-C3-R5-R4A`) with a deterministic, verifiable algorithm:
     `ST_Multi(ST_CollectionExtract(ST_MakeValid(geom), 3))`.
   - Validate that `ST_MakeValid` repairs exactly FIDs 286, 292, and 523 without shifting centroids or altering exterior boundaries by more than sub-millimeter precision.
2. **Option B (Governed Authoritative Cleaned Artifact)**:
   - Emit a versioned, audited derivative artifact `tgrac_mandals_cleaned_2016_v1.json` with its own SHA-256 and evidence lineage linking back to the raw source.
3. **Empty-Table Invariant Maintained**:
   - `public.entity_geometries` remains at **0 rows** on `panIN-staging` until the CTO reviews and authorizes the topological remediation procedure.
